// solvers-vcycle: multigrid V-cycles on a 32 × 32 pressure problem, run by
// poisson.js multigrid() with trace 'cells'. The figure follows the
// generator's events: {t:'enter'|'leave', kind:'level'} as the cycle goes
// down and up the hierarchy 32² → 16² → 8² → 4² → 2², {op:'smooth' |
// 'restrict' | 'prolong' | 'coarse-solve'}, and every relaxed cell
// {op:'relax', level, cell, value}. Each small panel copies the relax values
// of its level, so it shows the correction being built there (on every level
// the correction starts from zero; the coarsest grid is solved by CG and has
// no relax events). The big panel is the error of the fine-grid answer,
// x − x*, after each complete cycle; the plot is the residual per cycle,
// with the default V(2,2) cycle as a dashed reference.
// The start is a smooth source–sink right-hand side with a noisy first
// guess, so the error has both rough and smooth parts.

import { h } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, readout, playButton, animate, canvasBox } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { rng } from '../../sims/util.js';
import { POISSON_PRESETS, multigrid, mgpcg } from '../../sims/poisson.js';
import { presetFor, num, count, legend, allowScroll, label, FONT } from './common.js';

const N = 32;
const CYCLES = 25;
const CYC = Float64Array.from({ length: CYCLES + 1 }, (_, i) => i);
const PRESETS = {
  default: { problem: 'box', smoother: 'rbgs', nu: 2, prolong: 'bilinear' },
  'no-smoothing': { problem: 'box', smoother: 'rbgs', nu: 0, prolong: 'bilinear' },
  'jacobi-1': { problem: 'box', smoother: 'jacobi1', nu: 1, prolong: 'bilinear' },
  'constant-prolong': { problem: 'dirichlet', smoother: 'jacobi', nu: 1, prolong: 'constant' },
  'bilinear-fixed': { problem: 'dirichlet', smoother: 'jacobi', nu: 1, prolong: 'bilinear' },
};
const SMOOTHERS = {
  rbgs: { smoother: 'rbgs', omega: 1, name: 'red–black Gauss–Seidel' },
  jacobi: { smoother: 'jacobi', omega: 0.8, name: 'Jacobi, ω = 0.8' },
  jacobi1: { smoother: 'jacobi', omega: 1, name: 'Jacobi, ω = 1' },
};

function drain(gen) {
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

// The problem: operator, right-hand side and noisy first guess.
function makeProblem(kind) {
  if (kind === 'dirichlet') {
    const { op, b } = POISSON_PRESETS.manufactured.make(N, N);
    return { op, b };
  }
  const { op, b } = POISSON_PRESETS.dipole.make(N, N);
  return { op, b };
}

export function mountVcycle(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'A V-cycle, level by level', wide: true, tall: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);
  const view = new FieldView(left, { nx: N, ny: N, maxHeight: 340, label: 'Error of the fine-grid pressure after each complete V-cycle' });
  allowScroll(view);
  const leg = legend(left, 'div', ['', '0', '']);
  const resPlot = new Plot(left, {
    x: { label: 'V-cycles', min: 0, max: 12 },
    y: { label: 'relative residual', min: 1e-12, max: 10, log: true },
    aspect: 1.9,
    label: 'Residual after each V-cycle, with the default cycle as a reference',
  });
  const vbox = canvasBox(right, { aspect: 2.2, minHeight: 130, maxHeight: 200, label: 'Diagram of the V-cycle: down through the grid levels and back up, with the current step highlighted' });
  const strip = h('div.sv-levels');
  right.append(strip);

  const prob = segmented(f.controls, {
    label: 'Problem',
    options: [
      ['box', 'closed box'],
      ['dirichlet', 'p = 0 on walls'],
    ],
    value: p.problem,
    onChange: () => rebuild(),
  });
  const smoo = select(f.controls, {
    label: 'Smoother',
    options: Object.entries(SMOOTHERS).map(([k, s]) => [k, s.name]),
    value: p.smoother,
    onChange: () => rebuild(),
  });
  const nu = slider(f.controls, { label: 'smoothing sweeps ν (before and after)', min: 0, max: 3, step: 1, value: p.nu, fmt: (v) => String(v), onInput: () => rebuild() });
  const prol = segmented(f.controls, {
    label: 'Prolongation',
    options: [
      ['bilinear', 'bilinear'],
      ['constant', 'constant'],
    ],
    value: p.prolong,
    onChange: () => rebuild(),
  });
  const speed = segmented(f.controls, {
    label: 'Speed',
    options: [
      ['watch', 'watch'],
      ['fast', 'fast'],
    ],
    value: 'watch',
  });
  const loop = animate(fig, tick, { autoplay: true, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'One cycle', onClick: () => (loop.pause(), advance(Infinity, true), draw()) });
  button(f.controls, { label: 'Restart', onClick: () => (rebuild(), loop.play()) });

  const rdK = readout(f.readouts, { label: 'V-cycles' });
  const rdR = readout(f.readouts, { label: 'residual' });
  const rdF = readout(f.readouts, { label: 'factor, last cycle' });
  const rdA = readout(f.readouts, { label: 'average factor per cycle' });
  const rdW = readout(f.readouts, { label: 'work units per cycle' });
  const rdNow = readout(f.readouts, { label: 'now' });

  let op = null;
  let b = null;
  let ex = null;
  let x = null;
  let gen = null;
  let levels = [];
  let panels = [];
  let mirrors = [];
  let coarseIts = 0;
  const err = new Float64Array(N * N);
  let eMax = 1;
  const hk = new Float64Array(CYCLES + 1);
  const hr = new Float64Array(CYCLES + 1);
  const refR = new Float64Array(CYCLES + 1);
  let refLen = 0;
  let len = 0;
  let k = 0;
  let work = 0;
  let workCycle = 0;
  let finished = false;
  let node = -1;
  let level = 0;
  let what = 'start';
  let budget = 0;
  let lastStatus = '';
  let blewUp = false;

  function buildPanels() {
    for (const pnl of panels) pnl.view.destroy();
    strip.replaceChildren();
    panels = levels.map(([nx, ny], l) => {
      const cell = h('div.sv-level');
      strip.append(cell);
      const v = new FieldView(cell, { nx, ny, maxHeight: 96, minHeight: 40, label: `Correction on level ${l}, a ${nx} by ${ny} grid` });
      allowScroll(v);
      const cap = h('div.sv-level-label', `${nx}×${ny}`);
      cell.append(cap);
      v.redraw = () => drawPanel(l);
      return { view: v, cap, max: 1e-30 };
    });
    mirrors = levels.map(([nx, ny]) => new Float64Array(nx * ny));
  }

  function rebuild() {
    gen?.return();
    ({ op, b } = makeProblem(prob.value));
    const r = drain(mgpcg(op, b, { tol: 1e-13, history: false }));
    ex = Float64Array.from(r.x);
    const S = SMOOTHERS[smoo.value];
    const opts = { nu1: nu.value, nu2: nu.value, smoother: S.smoother, omega: S.omega, prolong: prol.value };
    const probe = drain(multigrid(op, b, { ...opts, maxIter: 1, history: false }));
    const sizes = probe.levels.map(([a, c]) => `${a}×${c}`).join(',');
    if (sizes !== levels.map(([a, c]) => `${a}×${c}`).join(',')) {
      levels = probe.levels;
      buildPanels();
    }
    for (const m of mirrors) m.fill(0);
    for (const pnl of panels) pnl.max = 1e-30;
    // Reference: the default V(2,2) cycle from the same start.
    const x0 = noisyStart();
    const ref = drain(multigrid(op, b, { x: Float64Array.from(x0), tol: 1e-12, maxIter: CYCLES }));
    refLen = Math.min(ref.residuals.length, CYCLES + 1);
    for (let i = 0; i < refLen; i++) refR[i] = ref.residuals[i];
    x = x0;
    gen = multigrid(op, b, { ...opts, x, tol: 1e-12, maxIter: CYCLES, trace: 'cells', history: false });
    k = 0;
    work = 0;
    workCycle = 0;
    finished = false;
    blewUp = false;
    node = -1;
    level = 0;
    what = 'start';
    coarseIts = 0;
    budget = 0;
    len = 1;
    hk[0] = 0;
    hr[0] = refR[0];
    errorNow();
    eMax = 0;
    for (let c = 0; c < op.n; c++) eMax = Math.max(eMax, Math.abs(err[c]));
    draw();
  }

  function noisyStart() {
    const rand = rng(5);
    let m = 0;
    for (let c = 0; c < op.n; c++) m = Math.max(m, Math.abs(ex[c]));
    const x0 = new Float64Array(op.n);
    for (let c = 0; c < op.n; c++) x0[c] = 0.5 * m * (2 * rand() - 1);
    return x0;
  }

  function errorNow() {
    let mx = 0;
    if (op.singular) {
      for (let c = 0; c < op.n; c++) mx += x[c] - ex[c];
      mx /= op.n;
    }
    for (let c = 0; c < op.n; c++) err[c] = x[c] - ex[c] - mx;
  }

  const L = () => levels.length;
  // V-diagram node index: going down, node = level; coming up, 2(L−1) − level.
  function advance(units, untilCycle = false) {
    let left2 = units;
    while (!finished && left2 > 0) {
      const r = gen.next();
      if (r.done) {
        finished = true;
        break;
      }
      const e = r.value;
      if (e.t === 'op' && e.op === 'relax') {
        mirrors[e.level][e.cell] = e.value;
        const pnl = panels[e.level];
        const a = Math.abs(e.value);
        if (a > pnl.max) pnl.max = a;
        left2 -= 1;
        continue;
      }
      left2 -= 24;
      if (e.t === 'enter') {
        level = e.level;
        node = e.level;
        mirrors[e.level].fill(0);
        panels[e.level].max = 1e-30;
        what = e.level === L() - 1 ? 'coarsest grid' : e.level === 0 ? 'pre-smoothing on the fine grid' : `pre-smoothing on ${e.nx}×${e.ny}`;
      } else if (e.t === 'op' && e.op === 'restrict') what = `restricting the residual to level ${e.level + 1}`;
      else if (e.t === 'op' && e.op === 'coarse-solve') {
        coarseIts = e.iters;
        what = `exact solve on the coarsest grid (CG, ${e.iters} iterations)`;
      } else if (e.t === 'op' && e.op === 'prolong') {
        level = e.level;
        node = 2 * (L() - 1) - e.level;
        what = `interpolating the correction up to level ${e.level}, then post-smoothing`;
      } else if (e.t === 'op' && e.op === 'smooth') {
        what = `${e.pre ? 'pre' : 'post'}-smoothing sweep ${e.sweep} on level ${e.level}`;
      } else if (e.t === 'iter') {
        k = e.k;
        workCycle = e.work - work;
        work = e.work;
        if (len <= CYCLES) {
          hk[len] = k;
          hr[len] = e.residual;
          len++;
        }
        errorNow();
        // Rescale to the error that is left, so its shape stays visible.
        let m = 0;
        for (let c = 0; c < op.n; c++) m = Math.max(m, Math.abs(err[c]));
        if (m > 0 && Number.isFinite(m)) eMax = m;
        node = -1;
        what = `cycle ${k} done`;
        if (!(e.residual < 1e4)) {
          blewUp = true;
          finished = true;
        }
        if (untilCycle) break;
      }
    }
  }

  function tick() {
    if (speed.value === 'fast') advance(Infinity, true);
    else {
      budget += 48;
      const n = Math.floor(budget);
      budget -= n;
      advance(n);
    }
    draw();
    if (finished) loop.pause();
  }

  function drawPanel(l) {
    const pnl = panels[l];
    if (!pnl) return;
    const m = pnl.max > 1e-30 ? pnl.max : 1;
    pnl.view.draw(mirrors[l], { map: 'div', lo: -m, hi: m });
    const active = node >= 0 && level === l;
    if (active) {
      pnl.view.overlay((ctx, X, Y, pl, rect) => {
        ctx.strokeStyle = pl.css('write');
        ctx.lineWidth = 3;
        ctx.strokeRect(rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3);
      });
    }
    if (l === L() - 1) {
      pnl.view.overlay((ctx, X, Y, pl, rect) => {
        ctx.font = FONT;
        ctx.fillStyle = pl.css('ink');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(coarseIts ? `CG ×${coarseIts}` : 'CG', rect.x + rect.w / 2, rect.y + rect.h / 2);
      });
    }
  }

  function drawV() {
    const { ctx, width: W, height: H } = vbox;
    const pal = palette();
    vbox.clear();
    const nL = L();
    if (!nL) return;
    const nodes = 2 * nL - 1;
    const x0 = 52;
    const x1 = W - 14;
    const y0 = 16;
    const y1 = H - 22;
    const NX = (i) => x0 + ((x1 - x0) * i) / (nodes - 1);
    const NY = (l) => y0 + ((y1 - y0) * l) / Math.max(1, nL - 1);
    const lev = (i) => (i < nL ? i : 2 * (nL - 1) - i);
    ctx.strokeStyle = pal.css('muted');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < nodes; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, NX(i), NY(lev(i)));
    ctx.stroke();
    for (let l = 0; l < nL; l++) label(ctx, pal, `${levels[l][0]}×${levels[l][1]}`, 6, NY(l) + 4);
    for (let i = 0; i < nodes; i++) {
      const l = lev(i);
      const cur = i === node;
      ctx.fillStyle = pal.css(cur ? 'write' : 'board');
      ctx.strokeStyle = pal.css(cur ? 'ink' : 'muted');
      ctx.lineWidth = cur ? 2.5 : 1.5;
      ctx.beginPath();
      if (l === nL - 1) ctx.rect(NX(i) - 7, NY(l) - 7, 14, 14);
      else ctx.arc(NX(i), NY(l), 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    label(ctx, pal, `smooth ${nu.value}×, restrict ↓`, NX(0) + 10, NY(0) - 4, { align: 'left' });
    label(ctx, pal, `↑ prolong, smooth ${nu.value}×`, NX(nodes - 1) - 10, NY(0) - 4, { align: 'right' });
    label(ctx, pal, 'solve', NX(nL - 1), Math.min(H - 4, NY(nL - 1) + 18), { align: 'center' });
  }

  function draw() {
    const m = eMax * 1.05;
    view.draw(err, { map: 'div', lo: -m, hi: m });
    leg.set(num(-m, 2), '0', num(m, 2));
    for (let l = 0; l < panels.length; l++) drawPanel(l);
    drawV();
    const K = hk.subarray(0, len);
    resPlot.setAxes({ x: { label: 'V-cycles', min: 0, max: Math.max(12, Math.min(CYCLES, k + 2)) }, y: { label: 'relative residual', min: 1e-12, max: Math.max(10, hr[len - 1] * 3) } });
    resPlot.draw([
      { x: CYC.subarray(0, refLen), y: refR.subarray(0, refLen), color: 'muted', width: 1.5, dash: [5, 4], label: 'default V(2,2), red–black' },
      { x: K, y: hr.subarray(0, len), color: 's1', width: 2, points: 3, label: 'this cycle' },
    ]);
    const r = hr[len - 1];
    const fac = len > 1 ? hr[len - 1] / hr[len - 2] : NaN;
    const avg = len > 1 ? (hr[len - 1] / hr[0]) ** (1 / (len - 1)) : NaN;
    rdK.set(String(k));
    rdR.set(num(r, 3));
    rdF.set(num(fac, 3), fac > 1 ? 'bad' : fac < 0.2 ? 'good' : '');
    rdA.set(num(avg, 3), avg > 1 ? 'bad' : avg < 0.2 ? 'good' : '');
    rdW.set(workCycle ? num(workCycle, 3) : '–');
    rdNow.set(what);
    let msg;
    const S = SMOOTHERS[smoo.value];
    if (blewUp || (len > 3 && avg > 1.02)) msg = `Diverging: each cycle multiplies the residual by about ${num(avg, 3)}. ${prol.value === 'constant' ? 'Piecewise-constant prolongation leaves jumps at every coarse-cell edge, and one light Jacobi sweep cannot smooth them away.' : 'The smoother cannot keep up.'}`;
    else if (nu.value === 0) msg = `No smoothing: the coarse grids can only represent smooth error, and nothing removes the rest. Factor per cycle ${num(fac, 3)}.`;
    else if (len > 2 && avg > 0.5) msg = `${S.name}, ν = ${nu.value}: the cycle crawls (about ${num(avg, 2)} per cycle). ${smoo.value === 'jacobi1' ? 'Plain Jacobi does not damp the checkerboard mode, so the roughest error survives smoothing and the coarse grids cannot see it.' : ''}`;
    else if (len > 1) msg = `${S.name}, V(${nu.value},${nu.value}), ${prol.value} prolongation: each cycle cuts the residual by about ${num(1 / avg, 2)}× for ${num(workCycle, 2)} work units. Cycle ${k}${finished ? ', converged.' : '.'}`;
    else msg = 'The error starts rough (the noisy guess) and smooth (the shape of the answer). Press Run to watch one cycle.';
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  view.redraw = () => {
    leg.refresh();
    draw();
  };
  vbox.onResize(() => drawV());
  rebuild();
  return () => {
    gen?.return();
    view.destroy();
    resPlot.destroy();
    vbox.destroy();
    for (const pnl of panels) pnl.view.destroy();
  };
}

