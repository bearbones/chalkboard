// Chapter 3 (conservation) kernels: the bookkeeping behind the conservation
// laws, in three pieces that the chapter's figures run and the tests check.
//
// 1. Control-volume fluxes (boxFlux, circleRectArea, enclosedSource).
//    The outward flux of an analytic 2-D velocity field (flows.js) through
//    the four faces of an axis-aligned box, by composite 4-point
//    Gauss–Legendre quadrature. Faces are split where they cross a core or
//    body circle (Rankine core, cored source, cylinder), where the field has
//    a kink or a jump, so the quadrature stays accurate to round-off level.
//    enclosedSource() is the other side of the divergence theorem: the
//    integral of ∇·u over the box, exact for the registry's flows (a cored
//    source spreads m uniformly over its core disc, so it is m times the
//    fraction of the disc inside the box). Divergence theorem: Batchelor
//    (1967) An Introduction to Fluid Dynamics, §2.2 and appendix 2.
//
// 2. One-dimensional finite-volume bookkeeping (createFV, stepFV, massFV,
//    exactFV). The conservation law q_t + (a(x) q)_x = 0 on the periodic
//    interval [0, 1), with a(x) > 0 a fixed speed and q an amount per unit
//    length (cars per km on a road whose speed limit varies). Three
//    first-order upwind updates, all with Δt = cfl·Δx / max a:
//      'conservative'  q_j ← q_j − (Δt/Δx)(F_{j+½} − F_{j−½}),
//                      F_{j+½} = a(x_{j+½}) q_j   (donor cell; LeVeque 2002,
//                      Finite Volume Methods for Hyperbolic Problems, ch. 9)
//      'product'       the product rule (a q)_x = a q_x + a′ q, discretised
//                      as q_j ← q_j − Δt [a_j (q_j − q_{j−1})/Δx + a′_j q_j]
//                      with a and a′ exact at the cell centre. Consistent and
//                      first order, but not a flux difference: neighbours
//                      disagree about what crosses their shared face, and
//                      the total drifts at a rate O(Δx).
//      'advective'     q_j ← q_j − Δt a_j (q_j − q_{j−1})/Δx: the colour
//                      equation q_t + a q_x = 0, a different law (it carries
//                      values, not amounts), included to show the difference.
//    For every mode the step records, per face j+½ (array index j), what the
//    upwind cell j sends (send[j]) and what the downwind cell j+1 receives
//    (recv[j]), as amounts per step (already multiplied by Δt). In the
//    conservative update they are the same number; their difference is mass
//    made (positive) or destroyed at that face. The exact solution follows
//    from characteristics: q a is constant along dx/dt = a(x), so
//    q(x, t) = q0(ξ) a(ξ)/a(x) with ξ the foot of the characteristic, found
//    from a table of the travel time τ(x) = ∫₀ˣ ds/a(s).
//
// 3. The momentum budget of an exact solution (BUDGET_FLOWS, momentumBudget).
//    At a point (x, y) and time t it evaluates each term of the
//    incompressible Navier–Stokes equations per unit mass,
//       ∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u + f,
//    for a velocity field from flows.js and its known pressure and body
//    force, and returns the residual (left minus right). Derivatives are
//    central differences of the analytic field (∂/∂t and ∇u with step 1e-5,
//    the 5-point Laplacian with step 2e-4: truncation ~1e-8 of the terms).
//    Pressure gradients are closed forms: Taylor–Green p = (ρU²F²/4)(cos 2kx
//    + cos 2ky) (Taylor & Green 1937); plane Poiseuille −dp/dx = 8μU_max/H²;
//    circular vortices dp/dr = ρu_θ²/r; solid-body rotation p = ρΩ²r²/2;
//    potential flow from Bernoulli p = p∞ + ½ρ(U² − |u|²) (its gradient by
//    central differences of |u|²). Every flow here is an exact solution, so
//    the residual is round-off and truncation; drop the viscous term
//    (opts.viscous = false) and the residual shows which flows also solve
//    Euler's equations (the potential flow and solid-body rotation do).
//
// Units: nondimensional throughout, ρ = 1 unless stated.

import { makeFlow, velocityGradient } from './flows.js';

const TAU = 2 * Math.PI;

// ---- 1. control-volume fluxes ------------------------------------------------------

// 4-point Gauss–Legendre on [−1, 1].
const GL_X = [-0.8611363115940526, -0.3399810435848563, 0.3399810435848563, 0.8611363115940526];
const GL_W = [0.3478548451374538, 0.6521451548625461, 0.6521451548625461, 0.3478548451374538];

// Radius of the circle across which a registry flow has a kink or a jump
// (core of a Rankine vortex or cored source, surface of the cylinder); 0 if
// none.
function kinkRadius(flow) {
  const p = flow.params;
  if (flow.id === 'cylinder') return p.R;
  if ((flow.id === 'source' || flow.id === 'rankine') && p.a > 0) return p.a;
  return 0;
}

const VEL = new Float64Array(2);
const BREAKS = new Float64Array(4);

// Outward flux ∫ u·n ds along the segment from (xa, ya) to (xb, yb), with
// outward normal (nx, ny). Composite Gauss–Legendre on `panels` panels per
// smooth piece; pieces end where the segment crosses the kink circle.
function segmentFlux(flow, t, xa, ya, xb, yb, nx, ny, panels) {
  const L = Math.hypot(xb - xa, yb - ya);
  if (!(L > 0)) return 0;
  const ex = (xb - xa) / L;
  const ey = (yb - ya) / L;
  // Breakpoints (in arc length s ∈ [0, L]) where the segment crosses the circle.
  let nb = 0;
  BREAKS[nb++] = 0;
  const rc = kinkRadius(flow);
  if (rc > 0) {
    const cx = flow.params.x0 ?? 0;
    const cy = flow.params.y0 ?? 0;
    // |a + s e − c|² = rc² → s² + 2 s (a − c)·e + |a − c|² − rc² = 0
    const dx = xa - cx;
    const dy = ya - cy;
    const b = dx * ex + dy * ey;
    const c = dx * dx + dy * dy - rc * rc;
    const disc = b * b - c;
    if (disc > 0) {
      const r = Math.sqrt(disc);
      const s1 = -b - r;
      const s2 = -b + r;
      if (s1 > 0 && s1 < L) BREAKS[nb++] = s1;
      if (s2 > 0 && s2 < L) BREAKS[nb++] = s2;
    }
  }
  BREAKS[nb++] = L;
  let sum = 0;
  for (let k = 0; k + 1 < nb; k++) {
    const s0 = BREAKS[k];
    const h = (BREAKS[k + 1] - s0) / panels;
    for (let p = 0; p < panels; p++) {
      const mid = s0 + (p + 0.5) * h;
      for (let g = 0; g < 4; g++) {
        const s = mid + 0.5 * h * GL_X[g];
        flow.velocity(xa + s * ex, ya + s * ey, t, VEL);
        sum += 0.5 * h * GL_W[g] * (VEL[0] * nx + VEL[1] * ny);
      }
    }
  }
  return sum;
}

// Outward flux (per unit depth) of flow through each face of the box
// { x0, x1, y0, y1 } at time t: out.left, out.right, out.bottom, out.top and
// their sum out.net (= ∮ u·n ds). A positive face value means fluid leaves
// the box through that face.
export function boxFlux(flow, box, t = 0, out = {}, panels = 12) {
  const { x0, x1, y0, y1 } = box;
  out.left = segmentFlux(flow, t, x0, y0, x0, y1, -1, 0, panels);
  out.right = segmentFlux(flow, t, x1, y0, x1, y1, 1, 0, panels);
  out.bottom = segmentFlux(flow, t, x0, y0, x1, y0, 0, -1, panels);
  out.top = segmentFlux(flow, t, x0, y1, x1, y1, 0, 1, panels);
  out.net = out.left + out.right + out.bottom + out.top;
  return out;
}

// ∫ √(r² − x²) dx (antiderivative), valid for |x| ≤ r.
function semiPrim(x, r) {
  const c = x < -r ? -r : x > r ? r : x;
  return 0.5 * (c * Math.sqrt(Math.max(0, r * r - c * c)) + r * r * Math.asin(c / r));
}

// Exact area of the intersection of the disc |p − c| < r with the rectangle
// [x0, x1] × [y0, y1]. Splits the x-range where the chord length changes
// form, so each piece integrates a constant or ±√(r² − x²) in closed form.
export function circleRectArea(cx, cy, r, x0, x1, y0, y1) {
  if (!(r > 0)) return 0;
  const a = Math.max(x0 - cx, -r);
  const b = Math.min(x1 - cx, r);
  if (!(b > a)) return 0;
  const lo = y0 - cy;
  const hi = y1 - cy;
  if (!(hi > lo)) return 0;
  // Breakpoints: where √(r² − x²) equals |lo| or |hi|.
  const pts = [a, b];
  for (const yv of [lo, hi]) {
    if (Math.abs(yv) < r) {
      const xv = Math.sqrt(r * r - yv * yv);
      for (const s of [-xv, xv]) if (s > a && s < b) pts.push(s);
    }
  }
  pts.sort((p, q) => p - q);
  let area = 0;
  for (let k = 0; k + 1 < pts.length; k++) {
    const p = pts[k];
    const q = pts[k + 1];
    if (!(q > p)) continue;
    const m = 0.5 * (p + q);
    const sm = Math.sqrt(Math.max(0, r * r - m * m));
    // top = min(hi, s), bottom = max(lo, −s): constant or ±s on this piece.
    const topIsS = sm < hi;
    const botIsS = -sm > lo;
    if ((topIsS ? sm : hi) <= (botIsS ? -sm : lo)) continue; // empty chord here
    const S = semiPrim(q, r) - semiPrim(p, r); // ∫ s dx
    const topInt = topIsS ? S : hi * (q - p);
    const botInt = botIsS ? -S : lo * (q - p);
    area += topInt - botInt;
  }
  return area;
}

// ∫∫_box ∇·u dA for a registry flow: 0 for the divergence-free flows; for the
// source, m times the fraction of its core disc inside the box (a point
// source, a = 0, counts m if strictly inside).
export function enclosedSource(flow, box) {
  if (flow.divergenceFree) return 0;
  if (flow.id === 'source') {
    const p = flow.params;
    if (p.a > 0) return (p.m * circleRectArea(p.x0, p.y0, p.a, box.x0, box.x1, box.y0, box.y1)) / (Math.PI * p.a * p.a);
    return p.x0 > box.x0 && p.x0 < box.x1 && p.y0 > box.y0 && p.y0 < box.y1 ? p.m : 0;
  }
  return NaN; // unknown: not one of the registry flows
}

// ---- 2. one-dimensional finite-volume bookkeeping -------------------------------------

const wrap01 = (x) => x - Math.floor(x);

// Speed profiles a(x) > 0 on the periodic interval [0, 1), with a′(x).
export const SPEED_PROFILES = {
  zone: {
    name: 'Slow zone',
    description: 'Speed 1 everywhere except a slow zone on [0.35, 0.65] where it drops to 0.3, with smooth (tanh) ends of width 0.04: road works on a ring road.',
    params: { lo: 0.35, hi: 0.65, w: 0.04, drop: 0.7 },
    make: (p) => {
      const a = (x) => {
        x = wrap01(x);
        return 1 - 0.5 * p.drop * (Math.tanh((x - p.lo) / p.w) - Math.tanh((x - p.hi) / p.w));
      };
      const da = (x) => {
        x = wrap01(x);
        const c1 = 1 / Math.cosh((x - p.lo) / p.w);
        const c2 = 1 / Math.cosh((x - p.hi) / p.w);
        return (-0.5 * p.drop * (c1 * c1 - c2 * c2)) / p.w;
      };
      return { a, da };
    },
  },
  wave: {
    name: 'Smooth wave',
    description: 'a(x) = 1 + 0.6 sin 2πx: the speed varies smoothly between 0.4 and 1.6.',
    params: { amp: 0.6 },
    make: (p) => ({
      a: (x) => 1 + p.amp * Math.sin(TAU * x),
      da: (x) => p.amp * TAU * Math.cos(TAU * x),
    }),
  },
  uniform: {
    name: 'Constant speed',
    description: 'a = 1 everywhere: then every update is the same scheme, and all of them conserve.',
    params: {},
    make: () => ({ a: () => 1, da: () => 0 }),
  },
};

// Initial amounts q0(x) on [0, 1).
export const START_PROFILES = {
  block: { name: 'Block of cars', description: 'q = 1 on [0.05, 0.25], 0 elsewhere.', f: (x) => (wrap01(x) >= 0.05 && wrap01(x) < 0.25 ? 1 : 0), lo: 0.05, hi: 0.25 },
  bump: { name: 'Smooth bump', description: 'A Gaussian of width 0.05 centred at 0.15.', f: (x) => Math.exp(-((wrap01(x) - 0.15) ** 2) / (2 * 0.05 * 0.05)), lo: 0, hi: 1 },
};

export const FV_MODES = {
  conservative: { name: 'Conservative (flux form)', tex: 'q_j^{n+1} = q_j^n - \\frac{\\Delta t}{\\Delta x}\\left(F_{j+1/2} - F_{j-1/2}\\right),\\quad F_{j+1/2} = a_{j+1/2}\\,q_j^n' },
  product: { name: 'Non-conservative (product rule)', tex: "q_j^{n+1} = q_j^n - \\Delta t\\left(a_j\\,\\frac{q_j^n - q_{j-1}^n}{\\Delta x} + a'_j\\,q_j^n\\right)" },
  advective: { name: 'Advective form (a different law)', tex: 'q_j^{n+1} = q_j^n - \\Delta t\\, a_j\\,\\frac{q_j^n - q_{j-1}^n}{\\Delta x}' },
};

const TAU_TABLE = 4096;

// A finite-volume state: n cells on [0, 1), all arrays allocated once.
export function createFV(n, { speed = 'zone', start = 'block', cfl = 0.8 } = {}) {
  const sp = SPEED_PROFILES[speed];
  const st = START_PROFILES[start];
  if (!sp) throw new Error(`unknown speed profile ${speed}`);
  if (!st) throw new Error(`unknown start profile ${start}`);
  if (!(n >= 4)) throw new Error('n >= 4');
  const { a, da } = sp.make(sp.params);
  const dx = 1 / n;
  const state = {
    n,
    dx,
    cfl,
    speed,
    start,
    a,
    da,
    q0f: st.f,
    x: new Float64Array(n), // cell centres
    aCell: new Float64Array(n),
    daCell: new Float64Array(n),
    aFace: new Float64Array(n), // a at face j+½
    q: new Float64Array(n),
    qNew: new Float64Array(n),
    send: new Float64Array(n), // amount cell j sends through face j+½ this step
    recv: new Float64Array(n), // amount cell j+1 receives through face j+½ this step
    tau: new Float64Array(TAU_TABLE + 1), // travel time from 0 to k/TAU_TABLE
    period: 0,
    amax: 0,
    dt: 0,
    t: 0,
    steps: 0,
    mass0: 0,
  };
  let amax = 0;
  for (let j = 0; j < n; j++) {
    const xc = (j + 0.5) * dx;
    state.x[j] = xc;
    state.aCell[j] = a(xc);
    state.daCell[j] = da(xc);
    state.aFace[j] = a((j + 1) * dx);
  }
  for (let k = 0; k <= 2000; k++) amax = Math.max(amax, a(k / 2000));
  state.amax = amax;
  state.dt = (cfl * dx) / amax;
  // Travel-time table by 4-point Gauss–Legendre on each table interval.
  const H = 1 / TAU_TABLE;
  state.tau[0] = 0;
  for (let k = 0; k < TAU_TABLE; k++) {
    let s = 0;
    for (let g = 0; g < 4; g++) s += GL_W[g] / a((k + 0.5 + 0.5 * GL_X[g]) * H);
    state.tau[k + 1] = state.tau[k] + 0.5 * H * s;
  }
  state.period = state.tau[TAU_TABLE];
  resetFV(state);
  return state;
}

// Back to t = 0: cell averages of q0 (8-point midpoint sampling per cell,
// exact for the block whose edges fall on cell faces at the grid sizes the
// figure offers).
export function resetFV(state) {
  const { n, dx, q, send, recv } = state;
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let m = 0; m < 8; m++) s += state.q0f((j + (m + 0.5) / 8) * dx);
    q[j] = s / 8;
    send[j] = 0;
    recv[j] = 0;
  }
  state.t = 0;
  state.steps = 0;
  state.mass0 = massFV(state);
  return state;
}

// Total amount Σ q_j Δx.
export function massFV(state) {
  const { q, n } = state;
  let s = 0;
  for (let j = 0; j < n; j++) s += q[j];
  return s * state.dx;
}

// One step of the chosen update, in place, with no allocation.
export function stepFV(state, mode = 'conservative') {
  const { n, dx, dt, q, qNew, aCell, daCell, aFace, send, recv } = state;
  const r = dt / dx;
  if (mode === 'conservative') {
    for (let j = 0; j < n; j++) {
      const F = r * aFace[j] * q[j]; // amount (per Δx) through face j+½
      send[j] = F;
      recv[j] = F;
    }
    for (let j = 0; j < n; j++) {
      const jm = j === 0 ? n - 1 : j - 1;
      qNew[j] = q[j] - (send[j] - recv[jm]);
    }
  } else if (mode === 'product' || mode === 'advective') {
    const src = mode === 'product' ? 1 : 0;
    for (let j = 0; j < n; j++) {
      // How cell j's own update reads: it takes in r a_j q_{j−1} through its
      // left face and sends out r a_j q_j (+ Δt a′_j q_j) through its right.
      const jm = j === 0 ? n - 1 : j - 1;
      recv[jm] = r * aCell[j] * q[jm];
      send[j] = r * aCell[j] * q[j] + src * dt * daCell[j] * q[j];
    }
    for (let j = 0; j < n; j++) {
      const jm = j === 0 ? n - 1 : j - 1;
      qNew[j] = q[j] - (send[j] - recv[jm]);
    }
  } else throw new Error(`unknown mode ${mode}`);
  q.set(qNew);
  state.t += dt;
  state.steps++;
  return state;
}

// Amount made (positive) or destroyed at face j+½ in the last step, as an
// amount (Δx · difference of per-Δx transfers).
export function faceLeak(state, j) {
  return (state.recv[j] - state.send[j]) * state.dx;
}

// Inverse of the travel-time table: the x in [0, 1) with τ(x) = s,
// s ∈ [0, period).
function invTau(state, s) {
  const tau = state.tau;
  let lo = 0;
  let hi = TAU_TABLE;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (tau[mid] <= s) lo = mid;
    else hi = mid;
  }
  const f = (s - tau[lo]) / (tau[lo + 1] - tau[lo]);
  return (lo + f) / TAU_TABLE;
}

function tauAt(state, x) {
  const y = wrap01(x) * TAU_TABLE;
  const k = Math.min(TAU_TABLE - 1, Math.floor(y));
  return state.tau[k] + (y - k) * (state.tau[k + 1] - state.tau[k]);
}

// Exact point values of the conservation law at time t (default state.t) at
// the points xs, written into out: q(x, t) = q0(ξ) a(ξ)/a(x).
export function exactFV(state, xs, out, t = state.t) {
  const T = state.period;
  for (let k = 0; k < xs.length; k++) {
    const x = xs[k];
    let s = (tauAt(state, x) - t) % T;
    if (s < 0) s += T;
    const xi = invTau(state, s);
    out[k] = (state.q0f(xi) * state.a(xi)) / state.a(x);
  }
  return out;
}

// ---- 3. momentum budget of exact solutions --------------------------------------------

// Each entry: a flows.js flow with its parameters, and the closed-form
// pressure gradient (as −∇p/ρ) and body force f per unit mass at (x, y, t)
// for kinematic viscosity ν, written into out[0..1].
export const BUDGET_FLOWS = {
  'taylor-green': {
    name: 'Decaying cells (Taylor–Green)',
    description: 'Counter-rotating cells fading as e^{−2νk²t}. The unsteady term balances the viscous term; the convective term balances the pressure gradient.',
    flow: 'taylor-green',
    params: { U: 1, L: 1 },
    usesNu: true,
    unsteady: true,
    pressure(flow, x, y, t, nu, out) {
      const p = flow.params;
      const k = Math.PI / p.L;
      const F = Math.exp(-2 * nu * k * k * t);
      const c = 0.5 * p.U * p.U * F * F * k;
      out[0] = c * Math.sin(2 * k * x);
      out[1] = c * Math.sin(2 * k * y);
      return out;
    },
    body: zero2,
  },
  channel: {
    name: 'Channel flow (pressure-driven)',
    description: 'Steady parabolic flow between plates. The push of the pressure gradient balances the viscous drag at every height.',
    flow: 'poiseuille',
    params: { Umax: 1, H: 1 },
    usesNu: true,
    unsteady: false,
    pressure(flow, x, y, t, nu, out) {
      const p = flow.params;
      out[0] = (8 * nu * p.Umax) / (p.H * p.H);
      out[1] = 0;
      return out;
    },
    body: zero2,
  },
  'channel-gravity': {
    name: 'Channel flow (gravity-driven)',
    description: 'The same profile in a channel stood on end, so gravity points along the flow and there is no pressure gradient: weight balances viscous drag.',
    flow: 'poiseuille',
    params: { Umax: 1, H: 1 },
    usesNu: true,
    unsteady: false,
    pressure: zero2,
    body(flow, x, y, t, nu, out) {
      const p = flow.params;
      out[0] = (8 * nu * p.Umax) / (p.H * p.H);
      out[1] = 0;
      return out;
    },
  },
  'lamb-oseen': {
    name: 'Spreading vortex (Lamb–Oseen)',
    description: 'A vortex whose core spreads by diffusion. Along the flow, the slowing balances viscosity; across it, the pressure gradient supplies the centripetal acceleration.',
    flow: 'lamb-oseen',
    params: { Gamma: TAU, t0: 5 },
    usesNu: true,
    unsteady: true,
    pressure(flow, x, y, t, nu, out) {
      const p = flow.params;
      const dx = x - p.x0;
      const dy = y - p.y0;
      const r2 = dx * dx + dy * dy;
      if (!(r2 > 0)) {
        out[0] = 0;
        out[1] = 0;
        return out;
      }
      flow.velocity(x, y, t, VEL);
      const k = -(VEL[0] * VEL[0] + VEL[1] * VEL[1]) / r2; // −u_θ²/r per unit r
      out[0] = k * dx;
      out[1] = k * dy;
      return out;
    },
    body: zero2,
  },
  cylinder: {
    name: 'Potential flow past a cylinder',
    description: 'Irrotational flow round a cylinder. The viscous term is zero everywhere, whatever ν is: this flow solves Euler’s equations and Navier–Stokes alike, yet slips at the wall.',
    flow: 'cylinder',
    params: { U: 1, R: 0.5, Gamma: 0 },
    usesNu: false,
    unsteady: false,
    pressure(flow, x, y, t, nu, out) {
      // Bernoulli: −∇p/ρ = ∇(|u|²/2), by central differences of |u|².
      const h = 1e-5;
      out[0] = (speed2(flow, x + h, y, t) - speed2(flow, x - h, y, t)) / (4 * h);
      out[1] = (speed2(flow, x, y + h, t) - speed2(flow, x, y - h, t)) / (4 * h);
      return out;
    },
    body: zero2,
  },
  rotation: {
    name: 'Solid-body rotation',
    description: 'The fluid turns like a rigid disc. The pressure rises outward and supplies exactly the centripetal acceleration; nothing deforms, so viscosity has nothing to do.',
    flow: 'rotation',
    params: { Omega: 1 },
    usesNu: false,
    unsteady: false,
    pressure(flow, x, y, t, nu, out) {
      const p = flow.params;
      const w2 = p.Omega * p.Omega;
      out[0] = -w2 * (x - p.x0);
      out[1] = -w2 * (y - p.y0);
      return out;
    },
    body: zero2,
  },
};

function zero2(flow, x, y, t, nu, out) {
  out[0] = 0;
  out[1] = 0;
  return out;
}

function speed2(flow, x, y, t) {
  flow.velocity(x, y, t, VEL);
  return VEL[0] * VEL[0] + VEL[1] * VEL[1];
}

// A live flow object for a budget entry, with ν applied where the flow uses it.
export function makeBudgetFlow(id, nu = 0.01) {
  const spec = BUDGET_FLOWS[id];
  if (!spec) throw new Error(`unknown budget flow ${id}`);
  const flow = makeFlow(spec.flow, { ...spec.params });
  if ('nu' in flow.params) flow.params.nu = nu;
  return flow;
}

// Preallocated result for momentumBudget.
export function createBudget() {
  return {
    u: new Float64Array(2),
    local: new Float64Array(2), // ∂u/∂t           (t1)
    convective: new Float64Array(2), // (u·∇)u      (t2)
    pressure: new Float64Array(2), // −∇p/ρ         (t3)
    viscous: new Float64Array(2), // ν∇²u           (t4)
    body: new Float64Array(2), // f                 (t5)
    residual: new Float64Array(2), // t1 + t2 − t3 − t4 − t5
    scale: 0, // largest |term| (for relative residuals)
  };
}

const VA = new Float64Array(2);
const VB = new Float64Array(2);
const GR = new Float64Array(4);
const PG = new Float64Array(2);
const BF = new Float64Array(2);

// Every term of ∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u + f at (x, y, t), per unit mass.
// opts.viscous = false drops ν∇²u from the right-hand side (Euler's
// equations); the viscous entry is still reported.
export function momentumBudget(id, flow, x, y, t, nu, out = createBudget(), opts = {}) {
  const spec = BUDGET_FLOWS[id];
  const keepViscous = opts.viscous !== false;
  flow.velocity(x, y, t, out.u);
  // ∂u/∂t
  if (spec.unsteady) {
    const ht = 1e-5;
    flow.velocity(x, y, t + ht, VA);
    flow.velocity(x, y, t - ht, VB);
    out.local[0] = (VA[0] - VB[0]) / (2 * ht);
    out.local[1] = (VA[1] - VB[1]) / (2 * ht);
  } else {
    out.local[0] = 0;
    out.local[1] = 0;
  }
  // (u·∇)u from ∇u = [u_x, u_y, v_x, v_y]
  velocityGradient(flow, x, y, t, 1e-5, GR);
  out.convective[0] = out.u[0] * GR[0] + out.u[1] * GR[1];
  out.convective[1] = out.u[0] * GR[2] + out.u[1] * GR[3];
  // −∇p/ρ and f
  spec.pressure(flow, x, y, t, nu, PG);
  out.pressure[0] = PG[0];
  out.pressure[1] = PG[1];
  spec.body(flow, x, y, t, nu, BF);
  out.body[0] = BF[0];
  out.body[1] = BF[1];
  // ν∇²u by the 5-point Laplacian.
  const h = 2e-4;
  let lu = -4 * out.u[0];
  let lv = -4 * out.u[1];
  flow.velocity(x + h, y, t, VA);
  lu += VA[0];
  lv += VA[1];
  flow.velocity(x - h, y, t, VA);
  lu += VA[0];
  lv += VA[1];
  flow.velocity(x, y + h, t, VA);
  lu += VA[0];
  lv += VA[1];
  flow.velocity(x, y - h, t, VA);
  lu += VA[0];
  lv += VA[1];
  out.viscous[0] = (nu * lu) / (h * h);
  out.viscous[1] = (nu * lv) / (h * h);
  const kv = keepViscous ? 1 : 0;
  let scale = 0;
  for (let c = 0; c < 2; c++) {
    out.residual[c] = out.local[c] + out.convective[c] - out.pressure[c] - kv * out.viscous[c] - out.body[c];
    scale = Math.max(scale, Math.abs(out.local[c]), Math.abs(out.convective[c]), Math.abs(out.pressure[c]), Math.abs(out.viscous[c]), Math.abs(out.body[c]));
  }
  out.scale = scale;
  return out;
}

// Pressure force per unit span on the cylinder, from its surface pressure
// coefficient: F = −∮ (p − p∞) n ds with p − p∞ = ½ρU²Cp(θ), by the
// trapezoidal rule on m points (spectrally accurate: the integrand is smooth
// and periodic). Returns { drag, lift } in units of ρ = 1.
export function cylinderForce(flow, m = 256, rho = 1, out = {}) {
  const p = flow.params;
  let fx = 0;
  let fy = 0;
  for (let k = 0; k < m; k++) {
    const th = (TAU * k) / m;
    const cp = flow.surfaceCp(th);
    fx += cp * Math.cos(th);
    fy += cp * Math.sin(th);
  }
  const q = 0.5 * rho * p.U * p.U * p.R * (TAU / m);
  out.drag = -q * fx;
  out.lift = -q * fy;
  return out;
}
