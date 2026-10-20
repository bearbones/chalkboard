// solvers-race: five pressure solvers on the same problem. Left: relative
// residual against work units (one work unit = one pass of the 5-point
// stencil over the fine grid, as poisson.js counts it) for a 32² or 64²
// grid, the solvers advanced together so that none gets ahead in work: a
// race you can watch. Right: iterations needed to cut the residual by 10⁶
// on grids of 16², 32², 64² and 128², with the fitted growth exponent p in
// iterations ∝ n^p. Every number is a full solve by the course's poisson.js
// generators, computed a slice at a time while the page stays responsive.
// The 128² runs of the stationary method take seconds, so they are opt-in.

import { h } from '../../kit/dom.js';
import { frame, select, segmented, toggle, button, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { POISSON_PRESETS, jacobi, gaussSeidel, redBlackGS, sor, cg, pcg, multigrid, mgpcg } from '../../sims/poisson.js';
import { presetFor, num, count, label, logSlope, jobRunner } from './common.js';

const SIZES = [16, 32, 64, 128];
const RACE_TOL = 1e-8;
const SCALE_TOL = 1e-6;
const STAT_CAP = 12000;
const PRESETS = {
  default: { problem: 'closed-box', n: 32, stat: 'gs', pre: 'mic0', multi: 'multigrid', big: false },
  obstacle: { problem: 'obstacle', n: 32, stat: 'gs', pre: 'mic0', multi: 'mgpcg', big: false },
  dirichlet: { problem: 'model-dirichlet', n: 32, stat: 'jacobi', pre: 'ic0', multi: 'multigrid', big: false },
};
const STAT = {
  jacobi: { name: 'Jacobi (ω = 0.8)', make: (op, b, o) => jacobi(op, b, { ...o, omega: 0.8 }) },
  gs: { name: 'Gauss–Seidel', make: (op, b, o) => gaussSeidel(op, b, o) },
  rb: { name: 'red–black GS', make: (op, b, o) => redBlackGS(op, b, o) },
};
const PRE = {
  jacobi: { name: 'CG + Jacobi', make: (op, b, o) => pcg(op, b, { ...o, precond: 'jacobi' }) },
  ic0: { name: 'CG + IC(0)', make: (op, b, o) => pcg(op, b, { ...o, precond: 'ic0' }) },
  mic0: { name: 'CG + MIC(0)', make: (op, b, o) => pcg(op, b, { ...o, precond: 'mic0' }) },
};
const MULTI = {
  multigrid: { name: 'multigrid V(2,2)', make: (op, b, o) => multigrid(op, b, o) },
  mgpcg: { name: 'CG + multigrid', make: (op, b, o) => mgpcg(op, b, o) },
};
const SOR = { name: 'SOR (best ω)', make: (op, b, o) => sor(op, b, o) };
const CG = { name: 'CG', make: (op, b, o) => cg(op, b, o) };
const STYLE = [
  { color: 's1', dash: null },
  { color: 's2', dash: [7, 4] },
  { color: 's3', dash: [2, 3] },
  { color: 's4', dash: [10, 3, 2, 3] },
  { color: 's5', dash: null },
];

export function mountRace(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'The race', wide: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);
  const racePlot = new Plot(left, {
    x: { label: 'work units (fine-grid sweeps)', min: 1, max: 2e4, log: true },
    y: { label: 'relative residual', min: 1e-8, max: 2, log: true },
    aspect: 1.25,
    label: 'Relative residual against work for five solvers on the same pressure problem',
  });
  const scalePlot = new Plot(right, {
    x: { label: 'cells per side n', min: 12, max: 170, log: true },
    y: { label: 'iterations to cut residual 10⁶×', min: 1, max: 1e5, log: true },
    aspect: 1.25,
    legend: false,
    label: 'Iterations needed against grid size for the same five solvers, on log scales, with reference slopes',
  });

  const prob = segmented(f.controls, {
    label: 'Problem',
    options: [
      ['closed-box', 'closed box'],
      ['obstacle', 'box with a disc'],
      ['model-dirichlet', 'p = 0 on walls'],
    ],
    value: p.problem,
    onChange: () => run(),
  });
  const size = segmented(f.controls, {
    label: 'Race grid',
    options: [
      [32, '32²'],
      [64, '64²'],
    ],
    value: p.n,
    onChange: () => run(),
  });
  const stat = select(f.controls, { label: 'Relaxation', options: Object.entries(STAT).map(([k, s]) => [k, s.name]), value: p.stat, onChange: () => run() });
  const pre = select(f.controls, { label: 'Preconditioned', options: Object.entries(PRE).map(([k, s]) => [k, s.name]), value: p.pre, onChange: () => run() });
  const multi = select(f.controls, { label: 'Multilevel', options: Object.entries(MULTI).map(([k, s]) => [k, s.name]), value: p.multi, onChange: () => run() });
  const big = toggle(f.controls, { label: 'include 128² for the relaxation method (slow)', checked: p.big, onChange: () => run() });
  button(f.controls, { label: 'Run again', onClick: () => run() });

  const rd = [0, 1, 2, 3, 4].map(() => readout(f.readouts, { label: '–' }));
  const jobs = jobRunner(signal, 7);
  const ops = new Map();
  const getOp = (preset, n) => {
    const key = `${preset}:${n}`;
    let o = ops.get(key);
    if (!o) {
      o = POISSON_PRESETS[preset].make(n, n, 1);
      ops.set(key, o);
    }
    return o;
  };

  // Race data: up to STAT_CAP + 1 points per method.
  const W = [0, 1, 2, 3, 4].map(() => new Float64Array(STAT_CAP + 1));
  const Rr = [0, 1, 2, 3, 4].map(() => new Float64Array(STAT_CAP + 1));
  const len = new Int32Array(5);
  const workTo = new Float64Array(5);
  // Scaling data: iterations at each size (NaN until known).
  const its = [0, 1, 2, 3, 4].map(() => new Float64Array(SIZES.length).fill(NaN));
  const ms = [0, 1, 2, 3, 4].map(() => new Float64Array(SIZES.length).fill(NaN));
  const nArr = Float64Array.from(SIZES);
  let methods = [];
  let phase = 'race';
  let lastStatus = '';

  function run() {
    methods = [STAT[stat.value], SOR, CG, PRE[pre.value], MULTI[multi.value]];
    rd.forEach((r, i) => {
      r.el.previousSibling.textContent = methods[i].name;
    });
    len.fill(0);
    workTo.fill(NaN);
    for (const a of its) a.fill(NaN);
    for (const a of ms) a.fill(NaN);
    phase = 'race';
    draw();
    jobs.run(work(), () => {
      phase = 'done';
      draw();
    });
  }

  function* work() {
    // 1. The race at the chosen size: advance every method to the same work.
    const n = Number(size.value);
    const { op, b } = getOp(prob.value, n);
    const gens = methods.map((m, i) => m.make(op, b, { tol: RACE_TOL, maxIter: i === 0 ? STAT_CAP : 5000, history: false }));
    const alive = [true, true, true, true, true];
    for (let i = 0; i < 5; i++) {
      W[i][0] = 0;
      Rr[i][0] = 1;
      len[i] = 1;
    }
    let target = 1;
    let frameT = performance.now();
    try {
      while (alive.some(Boolean)) {
        target = Math.max(target + 1, target * 1.04);
        for (let i = 0; i < 5; i++) {
          while (alive[i] && W[i][len[i] - 1] < target) {
            const r = gens[i].next();
            if (r.done) {
              alive[i] = false;
              if (r.value.converged) workTo[i] = r.value.work;
              break;
            }
            const e = r.value;
            if (e.t !== 'iter') continue;
            if (len[i] <= STAT_CAP) {
              W[i][len[i]] = e.work;
              Rr[i][len[i]] = Math.max(e.residual, 1e-16);
              len[i]++;
            }
          }
        }
        if (performance.now() - frameT > 30) {
          draw();
          frameT = performance.now();
        }
        yield;
      }
    } finally {
      for (const g of gens) g.return();
    }
    draw();
    // 2. Iterations against grid size.
    phase = 'scale';
    for (let si = 0; si < SIZES.length; si++) {
      const nn = SIZES[si];
      const { op: o2, b: b2 } = getOp(prob.value, nn);
      for (let i = 0; i < 5; i++) {
        if (i === 0 && nn === 128 && !big.value) continue;
        const g = methods[i].make(o2, b2, { tol: SCALE_TOL, maxIter: 100000, history: false });
        let t = 0;
        try {
          for (;;) {
            const t0 = performance.now();
            const r = g.next();
            t += performance.now() - t0;
            if (r.done) {
              its[i][si] = r.value.converged ? r.value.iters : NaN;
              ms[i][si] = t;
              break;
            }
            if ((r.value.k & 63) === 0) yield;
          }
        } finally {
          g.return();
        }
        draw();
        yield;
      }
    }
  }

  function draw() {
    const series = [];
    for (let i = 0; i < methods.length; i++) {
      const L = len[i];
      if (L < 2) continue;
      // Work 0 cannot go on a log axis: start the curves at the first iteration.
      series.push({ x: W[i].subarray(1, L), y: Rr[i].subarray(1, L), color: STYLE[i].color, dash: STYLE[i].dash, width: 2, label: methods[i].name });
    }
    racePlot.draw(series, {
      extra(ctx, tx, ty, area, pal) {
        if (phase === 'race') label(ctx, pal, 'racing…', area.x1 - 6, area.y0 + 14, { align: 'right' });
      },
    });
    const sc = [];
    for (let i = 0; i < methods.length; i++) sc.push({ x: nArr, y: its[i], color: STYLE[i].color, dash: STYLE[i].dash, width: 2, points: 3.5, label: methods[i].name });
    scalePlot.draw(sc, {
      under(ctx, tx, ty, area, pal) {
        // Reference slopes through (16, 300) for n² and (16, 30) for n.
        const ref = (y16, pw, text) => {
          ctx.strokeStyle = pal.css('muted', 0.7);
          ctx.setLineDash([3, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(tx(12), ty(y16 * (12 / 16) ** pw));
          ctx.lineTo(tx(170), ty(y16 * (170 / 16) ** pw));
          ctx.stroke();
          ctx.setLineDash([]);
          label(ctx, pal, text, tx(150), ty(y16 * (150 / 16) ** pw) + 14, { align: 'right' });
        };
        ref(3000, 2, '∝ n²');
        ref(300, 1, '∝ n');
        ref(6, 0, 'constant');
      },
      extra(ctx, tx, ty, area, pal) {
        if (phase === 'scale') label(ctx, pal, 'measuring…', area.x0 + 6, area.y0 + 14);
      },
    });
    const n = Number(size.value);
    const si = SIZES.indexOf(n);
    for (let i = 0; i < methods.length; i++) {
      const slope = logSlope(nArr, its[i]);
      const parts = [];
      parts.push(Number.isFinite(workTo[i]) ? `${count(workTo[i])} work to 10⁻⁸` : len[i] > 1 && phase !== 'race' ? 'not within the cap' : '…');
      if (Number.isFinite(its[i][si])) parts.push(`${count(its[i][si])} its, ${num(ms[i][si], 2)} ms`);
      if (Number.isFinite(slope)) parts.push(`∝ n^${slope.toFixed(2)}`);
      rd[i].set(parts.join(' · '));
    }
    let msg;
    if (phase === 'race') msg = `Racing on a ${n} × ${n} grid: each solver gets the same work before the next step.`;
    else if (phase === 'scale') msg = 'Measuring iterations on grids of 16² to 128²…';
    else {
      const pS = logSlope(nArr, its[0]);
      const pM = logSlope(nArr, its[4]);
      msg = `Done. Refining the grid, the relaxation method's iteration count grows like n^${num(pS, 2)}, the multilevel method's like n^${num(pM, 2)}. Times are for this device and include warm-up; ${big.value ? '' : 'tick the box to add 128² for the relaxation method.'}`;
    }
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  run();
  return () => {
    jobs.cancel();
    racePlot.destroy();
    scalePlot.destroy();
  };
}
