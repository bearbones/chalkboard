// The nonlinear pressure transaction, and the adaptive interval loop around it:
// a small-scale copy of a production solver's structure.
//
// One unknown per fluid cell: pressure. For a trial pressure field p, every cell
// computes its phase split and gas volume from its own p (the "source"), every
// open face gets one backward-Euler velocity kick from the pressure difference
// across it, and the residual asks whether the cell is exactly full after this
// interval's outflow:
//
//     R_i = m_liq/ρ + V_gas − 1 − dt · div_i            (cell volumes)
//
// Newton drives max|R| below 1e-9.

import * as P from './physics.js';
import { Stencil5, buildHierarchy, bicgstab, micpcg, jacobiOnly, vcycleOnly, LinearFailure, UP, LEFT, CENTER, RIGHT, DOWN } from './linear.js';

// Trace-span ranks: the "Stop at" granularity steps to the next span whose rank
// is at or above (≤) the chosen one.
export const RANK = {
  interval: 0,
  newton: 1,
  seed: 1,
  stage: 2,
  hierarchy: 3,
  krylov: 3,
  candidate: 3,
  vcycle: 4,
  level: 5,
  sweep: 6,
  pass: 6,
  op: 7,
};

export class SolverFailure extends Error {}

export const DEFAULTS = {
  tol: 1e-9, // max|R| in cell volumes (the reference runtime tolerance)
  maxNewton: 30,
  eta: 0.01, // linear forcing: ‖J·δ + R‖∞ ≤ η‖R‖∞
  linear: 'bicgstab', // 'bicgstab' (the default) | 'vcycle' | 'jacobi'
  lineSearch: true,
  warmStart: true,
  dtMax: 0.03, // 500 µs in 1/60-s units
  cfl: 0.125, // max outflow per interval, in cells
  maxAttempts: 32,
};

// The persistent simulation state between intervals.
export class Chamber {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.n = w * h;
    const n = this.n;
    this.fluid = new Uint8Array(n).fill(1);
    this.heldT = new Float64Array(n).fill(NaN); // solid held at a fixed temperature
    this.water = new Float64Array(n); // liquid + vapour mass (mg)
    this.mv = new Float64Array(n); // vapour part of `water`, from the last split
    this.ma = new Float64Array(n); // air mass
    this.H = new Float64Array(n); // enthalpy (µJ)
    this.u = new Float64Array(n); // right-face velocity of cell i (cells per time-unit)
    this.v = new Float64Array(n); // down-face velocity of cell i (positive = downward)
    this.top = new Float64Array(w); // row-0 top-face velocity (positive = inflow)
    this.heater = new Float64Array(n); // power, µJ per time-unit
    this.pulse = new Float64Array(n); // one-shot energy for the next accepted interval
    this.closedTop = false;
    this.conductance = 0; // µJ per time-unit per K, per fluid–held-solid face
    this.drag = 0; // per time-unit; a stand-in for a viscosity prepass
    this.gravity = P.GRAVITY;
    this.pAccepted = null; // the warm seed
    this.time = 0;
    this.dt = DEFAULTS.dtMax;
    this.interval = 0;
    this.externalMass = 0;
  }
  xy(i) {
    return [i % this.w, (i / this.w) | 0];
  }
  inertia(i) {
    return this.water[i] + this.ma[i];
  }
  openRight(i) {
    const x = i % this.w;
    return x + 1 < this.w && this.fluid[i] && this.fluid[i + 1];
  }
  openDown(i) {
    return i + this.w < this.n && this.fluid[i] && this.fluid[i + this.w];
  }
  openTop(i) {
    return i < this.w && !this.closedTop && this.fluid[i];
  }
  temperature(i) {
    return P.temperatureOf(this.H[i], this.water[i], this.mv[i], this.ma[i]);
  }
  // Fill a cell with a parcel at temperature T.
  setCell(i, { liquid = 0, vapour = 0, air = 0, T = P.T_ATM }) {
    this.fluid[i] = 1;
    this.water[i] = liquid + vapour;
    this.mv[i] = vapour;
    this.ma[i] = air;
    this.H[i] = P.enthalpy(liquid, vapour, air, T);
  }
  setSolid(i, heldT = NaN) {
    this.fluid[i] = 0;
    this.heldT[i] = heldT;
    this.water[i] = this.mv[i] = this.ma[i] = this.H[i] = 0;
  }
}

// Per-evaluation buffers: everything that is a function of a trial p.
function evalBuffer(ch) {
  const n = ch.n;
  return {
    p: new Float64Array(n),
    mv: new Float64Array(n),
    T: new Float64Array(n),
    Vg: new Float64Array(n),
    O: new Float64Array(n), // occupancy m_liq/ρ + V_gas
    slope: new Float64Array(n), // analytic dO/dp from phaseSplit
    u: new Float64Array(n),
    v: new Float64Array(n),
    top: new Float64Array(ch.w),
    R: new Float64Array(n),
    maxR: Infinity,
    merit: Infinity,
  };
}

export class PressureSolver {
  constructor(chamber, options = {}) {
    this.ch = chamber;
    this.opt = { ...DEFAULTS, ...options };
    const n = chamber.n;
    // The transaction context the renderer reads. Live arrays, updated in place.
    this.x = {
      dt: 0,
      H: new Float64Array(n), // enthalpy after this interval's heat
      u0: new Float64Array(n),
      v0: new Float64Array(n),
      top0: new Float64Array(chamber.w),
      cur: evalBuffer(chamber),
      cand: evalBuffer(chamber),
      J: new Stencil5(chamber.w, chamber.h),
      slope: new Float64Array(n), // dO/dp from the source probe
      rhs: new Float64Array(n),
      delta: new Float64Array(n),
      levels: null,
      alpha: 1,
      newton: 0,
      newtonHistory: [],
      linearHistory: [],
      linearRuns: [],
      seedResults: [],
      outflow: new Float64Array(n),
      status: '',
    };
  }

  // ---- one residual evaluation -------------------------------------------
  *evaluate(buf) {
    const { ch, x } = this;
    const { w, n } = ch;
    const dt = x.dt;

    yield { t: 'enter', kind: 'pass', label: 'Source: each cell finds its phase split at its own p', pass: 'source' };
    for (let i = 0; i < n; i++) {
      if (!ch.fluid[i]) continue;
      const s = P.phaseSplit(ch.water[i], ch.ma[i], x.H[i], buf.p[i]);
      buf.mv[i] = s.mv;
      buf.T[i] = s.T;
      buf.Vg[i] = s.Vg;
      buf.O[i] = s.occupancy;
      buf.slope[i] = s.slope;
      yield { t: 'op', op: 'source', cell: i, reads: [] };
    }
    yield { t: 'leave', kind: 'pass' };

    yield { t: 'enter', kind: 'pass', label: 'Face kicks: each open face accelerates by the pressure difference', pass: 'faces' };
    buf.u.fill(0);
    buf.v.fill(0);
    buf.top.fill(0);
    for (let i = 0; i < n; i++) {
      if (ch.openTop(i)) {
        const c = (dt * 2) / ch.inertia(i);
        buf.top[i] = x.top0[i] + dt * ch.gravity - c * (buf.p[i] - P.P_ATM);
        yield { t: 'op', op: 'face', cell: i, face: { a: i, b: -1, dir: 'top' }, reads: [i] };
      }
      if (ch.openRight(i)) {
        const j = i + 1,
          c = (dt * 2) / (ch.inertia(i) + ch.inertia(j));
        buf.u[i] = x.u0[i] - c * (buf.p[j] - buf.p[i]);
        yield { t: 'op', op: 'face', cell: i, face: { a: i, b: j, dir: 'x' }, reads: [i, j] };
      }
      if (ch.openDown(i)) {
        const j = i + w,
          c = (dt * 2) / (ch.inertia(i) + ch.inertia(j));
        buf.v[i] = x.v0[i] + dt * ch.gravity - c * (buf.p[j] - buf.p[i]);
        yield { t: 'op', op: 'face', cell: i, face: { a: i, b: j, dir: 'y' }, reads: [i, j] };
      }
    }
    yield { t: 'leave', kind: 'pass' };

    yield { t: 'enter', kind: 'pass', label: 'Residual: is each cell exactly full after the outflow?', pass: 'residual' };
    let maxR = 0,
      sum = 0;
    for (let i = 0; i < n; i++) {
      if (!ch.fluid[i]) {
        buf.R[i] = 0;
        continue;
      }
      const xx = i % w,
        y = (i / w) | 0;
      const div = buf.u[i] - (xx > 0 ? buf.u[i - 1] : 0) + buf.v[i] - (y > 0 ? buf.v[i - w] : buf.top[xx]);
      buf.R[i] = buf.O[i] - 1 - dt * div;
      maxR = Math.max(maxR, Math.abs(buf.R[i]));
      sum += buf.R[i] * buf.R[i];
      yield { t: 'op', op: 'residual', cell: i, reads: [], faces: faceList(ch, i) };
    }
    buf.maxR = maxR;
    buf.merit = Math.sqrt(sum); // the merit is a 2-norm
    yield { t: 'leave', kind: 'pass' };
  }

  // ---- Jacobian: 5-point rows, analytic face terms + source slope ---------
  *assemble() {
    const { ch, x } = this;
    const { J } = x;
    const cur = x.cur;
    const dt = x.dt;
    J.rows.fill(0);
    yield { t: 'enter', kind: 'stage', label: 'Jacobian: build each 5-point row', stage: 'jacobian' };
    for (let i = 0; i < ch.n; i++) {
      if (!ch.fluid[i]) {
        J.set(i, CENTER, -1); // algebraic elimination of an unused coordinate
        x.slope[i] = 0;
        continue;
      }
      // Analytic source slope dO/dp (with a one-sided probe toward vapour birth
      // when a pure-liquid cell has a negative residual).
      const gasFree = cur.mv[i] + ch.ma[i] === 0;
      let slope = cur.slope[i];
      if (gasFree && cur.R[i] < 0) {
        const eps = -1e-9 * Math.max(1, Math.abs(cur.p[i]));
        const probe = P.phaseSplit(ch.water[i], ch.ma[i], x.H[i], cur.p[i] + eps);
        slope = (probe.occupancy - cur.O[i]) / eps;
      }
      x.slope[i] = slope;
      let d = slope;
      const reads = [];
      const face = (j, k) => {
        const c = (dt * 2) / (ch.inertia(i) + ch.inertia(j));
        d -= dt * c;
        J.set(i, k, dt * c);
        reads.push(j);
      };
      const xx = i % ch.w;
      if (i >= ch.w && ch.openDown(i - ch.w)) face(i - ch.w, UP);
      if (xx > 0 && ch.openRight(i - 1)) face(i - 1, LEFT);
      if (ch.openRight(i)) face(i + 1, RIGHT);
      if (ch.openDown(i)) face(i + ch.w, DOWN);
      if (ch.openTop(i)) d -= (dt * dt * 2) / ch.inertia(i);
      J.set(i, CENTER, d);
      yield { t: 'op', op: 'jrow', cell: i, reads };
    }
    yield { t: 'leave', kind: 'stage' };
  }

  // ---- linear solve J·δ = −R ----------------------------------------------
  *linearSolve() {
    const { ch, x, opt } = this;
    const b = x.rhs;
    for (let i = 0; i < ch.n; i++) {
      const r = x.cur.R[i];
      b[i] = !ch.fluid[i] || Math.abs(r) <= 0.5 * opt.tol ? 0 : -r; // rows already at tolerance are zeroed
    }
    x.linearHistory = [];
    x.linearRuns.push({ newton: x.newton, method: opt.linear, history: x.linearHistory });
    yield { t: 'enter', kind: 'stage', label: `Linear solve J·δ = −R  (${linearName(opt.linear)})`, stage: 'linear' };
    let result;
    if (opt.linear === 'jacobi') result = yield* jacobiOnly(x.J, b, x, { eta: opt.eta });
    else if (opt.linear === 'micpcg') result = yield* micpcg(x.J, b, x, { eta: opt.eta });
    else {
      x.levels = yield* buildHierarchy(x.J);
      if (opt.linear === 'vcycle') result = yield* vcycleOnly(x.J, x.levels, b, x, { eta: opt.eta });
      else result = yield* bicgstab(x.J, x.levels, b, x, { eta: opt.eta });
    }
    yield { t: 'leave', kind: 'stage' };
    return result;
  }

  // ---- backtracking line search ---------------------------------------------
  *lineSearch() {
    const { ch, x, opt } = this;
    const { cur } = x;
    yield { t: 'enter', kind: 'stage', label: 'Line search: halve α until the residual shrinks', stage: 'linesearch' };
    const tries = opt.lineSearch ? 64 : 1;
    for (let k = 0; k < tries; k++) {
      const alpha = Math.pow(0.5, k);
      x.alpha = alpha;
      const cand = x.cand;
      let changed = false,
        admissible = true;
      for (let i = 0; i < ch.n; i++) {
        cand.p[i] = ch.fluid[i] ? cur.p[i] + alpha * x.delta[i] : 0;
        if (ch.fluid[i]) {
          if (cand.p[i] !== cur.p[i]) changed = true;
          if (!(cand.p[i] > P.P_FLOOR) || !isFinite(cand.p[i])) admissible = false;
        }
      }
      if (!changed) break;
      yield { t: 'enter', kind: 'candidate', label: `Candidate α = ${fmtAlpha(alpha)}`, alpha };
      if (!admissible) {
        yield { t: 'op', op: 'floor', cell: -1, reads: [], label: `α = ${fmtAlpha(alpha)} puts a cell below the pressure floor; halve` };
        yield { t: 'leave', kind: 'candidate' };
        continue;
      }
      yield* this.evaluate(cand);
      const accept = !opt.lineSearch || cand.merit < cur.merit;
      yield {
        t: 'op',
        op: 'merit',
        cell: -1,
        reads: [],
        label: `‖R‖₂: ${cand.merit.toExponential(2)} vs ${cur.merit.toExponential(2)} → ${accept ? 'accept' : 'reject, halve α'}`,
        accept,
      };
      yield { t: 'leave', kind: 'candidate' };
      if (accept) {
        x.cand = cur;
        x.cur = cand;
        yield { t: 'leave', kind: 'stage' };
        return alpha;
      }
    }
    yield { t: 'leave', kind: 'stage' };
    throw new SolverFailure('line search stalled');
  }

  // ---- seeds ------------------------------------------------------------------
  *seed() {
    const { ch, x, opt } = this;
    x.seedResults = [];
    if (opt.warmStart && ch.pAccepted) {
      yield { t: 'enter', kind: 'seed', label: 'Seed: warm start from the last accepted pressure' };
      x.cur.p.set(ch.pAccepted);
      yield* this.evaluate(x.cur);
      x.seedResults.push({ name: 'warm', maxR: x.cur.maxR });
      yield { t: 'leave', kind: 'seed' };
      return;
    }
    yield { t: 'enter', kind: 'seed', label: 'Seed: try cold guesses, keep the smallest max|R|' };
    x.cur.maxR = Infinity;
    const candidates = [
      ['EOS (gas cells at their own gas-law pressure)', 'eos'],
      ['Atmosphere (uniform 1 atm)', 'atm'],
    ];
    if (ch.gravity > 0 && !ch.closedTop) candidates.push(['Hydrostatic (column weight)', 'hydro']);
    for (const [label, kind] of candidates) {
      if (kind === 'atm' && x.cur.maxR <= opt.tol) continue; // tried only if EOS missed
      yield { t: 'enter', kind: 'candidate', label: `Seed candidate: ${label}` };
      this.fillSeed(kind, x.cand.p);
      yield* this.evaluate(x.cand);
      x.seedResults.push({ name: kind, maxR: x.cand.maxR });
      const better = x.cand.maxR < x.cur.maxR;
      yield { t: 'op', op: 'seed', cell: -1, reads: [], label: `${label}: max|R| = ${x.cand.maxR.toExponential(2)}${better ? ' — best so far' : ''}` };
      if (better) {
        const t = x.cur;
        x.cur = x.cand;
        x.cand = t;
      }
      yield { t: 'leave', kind: 'candidate' };
    }
    yield { t: 'leave', kind: 'seed' };
  }

  fillSeed(kind, p) {
    const { ch, x } = this;
    const { w, h } = ch;
    if (kind === 'atm') p.fill(P.P_ATM);
    else if (kind === 'eos') {
      for (let i = 0; i < ch.n; i++) {
        p[i] = P.P_ATM;
        const gasR = ch.mv[i] * P.R_VAP + ch.ma[i] * P.R_AIR;
        const avail = 1 - (ch.water[i] - ch.mv[i]) / P.RHO;
        if (ch.fluid[i] && gasR > 0 && avail > 0.01) {
          const T = P.temperatureOf(x.H[i], ch.water[i], ch.mv[i], ch.ma[i]);
          p[i] = (gasR * T * 1000) / (P.PA_PER_UNIT * avail);
        }
      }
    } else {
      for (let xx = 0; xx < w; xx++) {
        let prev = P.P_ATM,
          prevRho = 0;
        for (let y = 0; y < h; y++) {
          const i = y * w + xx;
          const rho = ch.fluid[i] ? ch.inertia(i) : prevRho;
          prev = y === 0 ? P.P_ATM + 0.5 * ch.gravity * rho : prev + 0.5 * ch.gravity * (prevRho + rho);
          prevRho = rho;
          p[i] = prev;
        }
      }
    }
    for (let i = 0; i < ch.n; i++) if (!ch.fluid[i]) p[i] = 0;
  }

  // ---- prepass: heater, pulse, conduction to held solids, drag ----------------
  *prepass() {
    const { ch, x } = this;
    const { w, n } = ch;
    const dt = x.dt;
    yield { t: 'enter', kind: 'stage', label: 'Prepass: heat sources and conduction (frozen during Newton)', stage: 'prepass' };
    x.H.set(ch.H);
    const damp = 1 / (1 + ch.drag * dt);
    for (let i = 0; i < n; i++) {
      x.u0[i] = ch.u[i] * damp;
      x.v0[i] = ch.v[i] * damp;
    }
    for (let i = 0; i < w; i++) x.top0[i] = ch.top[i] * damp;
    for (let i = 0; i < n; i++) {
      if (!ch.fluid[i]) continue;
      let q = ch.heater[i] * dt + ch.pulse[i];
      const reads = [];
      if (ch.conductance > 0) {
        const T = ch.temperature(i);
        const xx = i % w;
        const nb = [i >= w ? i - w : -1, xx > 0 ? i - 1 : -1, xx + 1 < w ? i + 1 : -1, i + w < n ? i + w : -1];
        let cond = 0,
          cap = 0;
        for (const j of nb) {
          if (j >= 0 && !ch.fluid[j] && isFinite(ch.heldT[j])) {
            cond += ch.conductance * dt * (ch.heldT[j] - T);
            cap = Math.max(cap, Math.abs(ch.heldT[j] - T));
            reads.push(j);
          }
        }
        if (reads.length) {
          // Never conduct a cell past the wall temperature (sensible capacity bound).
          const C = (ch.water[i] - ch.mv[i]) * P.CP_LIQ + ch.mv[i] * P.CP_VAP + ch.ma[i] * P.CP_AIR;
          const lim = C * cap;
          q += Math.max(-lim, Math.min(lim, cond));
        }
      }
      if (q !== 0) {
        x.H[i] += q;
        yield { t: 'op', op: 'heat', cell: i, reads, value: q };
      }
    }
    yield { t: 'leave', kind: 'stage' };
  }

  // ---- after convergence: CFL acceptance and donor-cell transport -------------
  maxOutflow() {
    const { ch, x } = this;
    const { w, n } = ch;
    const { cur } = x;
    let worst = 0;
    for (let i = 0; i < n; i++) {
      if (!ch.fluid[i]) {
        x.outflow[i] = 0;
        continue;
      }
      const xx = i % w,
        y = (i / w) | 0;
      let out = Math.max(0, cur.u[i]) + Math.max(0, cur.v[i]);
      if (xx > 0) out += Math.max(0, -cur.u[i - 1]);
      out += y > 0 ? Math.max(0, -cur.v[i - w]) : Math.max(0, -cur.top[xx]);
      x.outflow[i] = out * x.dt;
      worst = Math.max(worst, x.outflow[i]);
    }
    return worst;
  }

  *transport() {
    const { ch, x } = this;
    const { w, n } = ch;
    const { cur } = x;
    const dt = x.dt;
    yield { t: 'enter', kind: 'stage', label: 'Transport: move mass and heat with the converged face velocities', stage: 'transport' };
    const dW = new Float64Array(n),
      dV = new Float64Array(n),
      dA = new Float64Array(n),
      dH = new Float64Array(n);
    // Move fraction f of donor cell d's contents into r.
    const move = (d, r, F) => {
      const f = F / cur.O[d];
      const W = f * ch.water[d],
        V = f * cur.mv[d],
        A = f * ch.ma[d],
        E = f * x.H[d];
      dW[d] -= W;
      dV[d] -= V;
      dA[d] -= A;
      dH[d] -= E;
      if (r >= 0) {
        dW[r] += W;
        dV[r] += V;
        dA[r] += A;
        dH[r] += E;
      } else ch.externalMass -= W + A;
    };
    for (let i = 0; i < n; i++) {
      if (ch.openRight(i) && cur.u[i] !== 0) {
        const F = dt * cur.u[i];
        F > 0 ? move(i, i + 1, F) : move(i + 1, i, -F);
        yield { t: 'op', op: 'transport', cell: i, face: { a: i, b: i + 1, dir: 'x' }, reads: [F > 0 ? i : i + 1] };
      }
      if (ch.openDown(i) && cur.v[i] !== 0) {
        const F = dt * cur.v[i];
        F > 0 ? move(i, i + w, F) : move(i + w, i, -F);
        yield { t: 'op', op: 'transport', cell: i, face: { a: i, b: i + w, dir: 'y' }, reads: [F > 0 ? i : i + w] };
      }
      if (ch.openTop(i) && cur.top[i] !== 0) {
        const F = dt * cur.top[i];
        if (F < 0) move(i, -1, -F);
        else {
          const A = F * P.RHO_AIR_ATM;
          dA[i] += A;
          dH[i] += A * P.CP_AIR * P.T_ATM;
          ch.externalMass += A;
        }
        yield { t: 'op', op: 'transport', cell: i, face: { a: i, b: -1, dir: 'top' }, reads: [i] };
      }
    }
    for (let i = 0; i < n; i++) {
      if (!ch.fluid[i]) continue;
      ch.water[i] = Math.max(0, ch.water[i] + dW[i]);
      ch.mv[i] = Math.min(ch.water[i], Math.max(0, cur.mv[i] + dV[i]));
      ch.ma[i] = Math.max(0, ch.ma[i] + dA[i]);
      ch.H[i] = x.H[i] + dH[i];
    }
    ch.u.set(cur.u);
    ch.v.set(cur.v);
    ch.top.set(cur.top);
    yield { t: 'leave', kind: 'stage' };
  }

  // ---- one pressure transaction at a fixed dt -----------------------------
  *transaction() {
    const { x, opt } = this;
    x.newton = 0;
    x.newtonHistory = [];
    x.linearRuns = [];
    yield* this.prepass();
    yield* this.seed();
    x.newtonHistory.push({ iter: 0, maxR: x.cur.maxR, merit: x.cur.merit, alpha: null });
    while (x.cur.maxR > opt.tol) {
      if (x.newton >= opt.maxNewton) throw new SolverFailure(`no convergence in ${opt.maxNewton} Newton iterations`);
      x.newton++;
      yield { t: 'enter', kind: 'newton', label: `Newton iteration ${x.newton}`, iteration: x.newton };
      yield* this.assemble();
      yield* this.linearSolve();
      const alpha = yield* this.lineSearch();
      x.newtonHistory.push({ iter: x.newton, maxR: x.cur.maxR, merit: x.cur.merit, alpha });
      yield { t: 'leave', kind: 'newton' };
    }
  }

  // Solve for the pressure of the current state without advancing time, so a
  // freshly built scene has a warm seed, as it would mid-simulation.
  *settle() {
    this.x.dt = this.ch.dt;
    yield* this.transaction();
    this.ch.pAccepted = Float64Array.from(this.x.cur.p);
  }

  // ---- one adaptive interval, with dt-halving retries ------------------------
  *interval() {
    const { ch, x, opt } = this;
    ch.interval++;
    let dt = ch.dt;
    yield { t: 'enter', kind: 'interval', label: `Interval ${ch.interval}`, interval: ch.interval };
    for (let attempt = 1; ; attempt++) {
      x.dt = dt;
      x.status = '';
      let reason = null;
      try {
        yield* this.transaction();
        const out = this.maxOutflow();
        if (out > opt.cfl) reason = `a cell would lose ${out.toFixed(3)} of its volume (CFL limit ${opt.cfl})`;
        else {
          yield* this.transport();
          ch.pAccepted = Float64Array.from(x.cur.p);
          ch.mvLast = x.cur.mv;
          ch.pulse.fill(0);
          ch.time += dt;
          const grow = out > 0 ? Math.min(2, (0.9 * opt.cfl) / out) : 2;
          ch.dt = Math.min(opt.dtMax, grow * dt);
          x.status = `Accepted: dt = ${fmtDt(dt)}, ${x.newton} Newton iteration${x.newton === 1 ? '' : 's'}`;
          yield { t: 'op', op: 'accept', cell: -1, reads: [], label: x.status };
          yield { t: 'leave', kind: 'interval' };
          return { dt, newton: x.newton, attempt };
        }
      } catch (e) {
        if (!(e instanceof SolverFailure || e instanceof LinearFailure)) throw e;
        reason = e.message;
        // A throw skips the `leave` events of the spans it unwinds; tell the
        // trace consumer to pop back to the interval.
        yield { t: 'unwind', kind: 'interval' };
      }
      if (attempt >= opt.maxAttempts) throw new SolverFailure(`interval rejected ${attempt} times`);
      x.status = `Rejected (${reason}); retrying with dt = ${fmtDt(dt / 2)}`;
      yield { t: 'op', op: 'reject', cell: -1, reads: [], label: x.status };
      dt *= 0.5;
    }
  }
}

function faceList(ch, i) {
  const { w } = ch;
  const xx = i % w,
    out = [];
  if (i < w) {
    if (ch.openTop(i)) out.push({ a: i, b: -1, dir: 'top' });
  } else if (ch.openDown(i - w)) out.push({ a: i - w, b: i, dir: 'y' });
  if (xx > 0 && ch.openRight(i - 1)) out.push({ a: i - 1, b: i, dir: 'x' });
  if (ch.openRight(i)) out.push({ a: i, b: i + 1, dir: 'x' });
  if (ch.openDown(i)) out.push({ a: i, b: i + w, dir: 'y' });
  return out;
}

export function linearName(k) {
  return k === 'jacobi' ? 'weighted Jacobi only' : k === 'vcycle' ? 'V-cycles only' : k === 'micpcg' ? 'MIC(0)-PCG' : 'BiCGStab + V-cycle';
}
function fmtAlpha(a) {
  return a >= 1 / 64 ? (a === 1 ? '1' : `1/${Math.round(1 / a)}`) : a.toExponential(1);
}
export function fmtDt(dt) {
  const us = (dt / 60) * 1e6;
  return us >= 1 ? `${us.toFixed(us < 10 ? 2 : 1)} µs` : `${(us * 1000).toFixed(1)} ns`;
}
