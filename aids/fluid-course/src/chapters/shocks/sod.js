// shocks-sod: the shock-tube lab. Pick a Riemann problem, a numerical flux,
// first order or MUSCL–Hancock second order with a limiter, Roe's entropy
// fix and the grid; run euler1d.js stepEuler beside the exact solution
// (riemann.js, sampled on a fine grid). Panels: density, velocity, pressure.
// Readouts: exact p* and its Newton iterations, L1 density error, total
// variation of density against the exact one (new wiggles), minimum density
// and pressure (positivity), and for the slow shock the momentum wiggle
// behind it as a fraction of the momentum jump.
//
// data-preset: a key of CASES, optionally ':fixed'. A case with a broken and
// a fixed set-up shows a Compare switch.

import { fmt } from '../../kit/dom.js';
import { frame, select, segmented, toggle, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createEuler, resetEuler, stepEuler, eulerDt, eulerExact, eulerPreset } from '../../sims/euler1d.js';
import { riemannProfile } from '../../sims/riemann.js';
import { l1, totalVar, minOf } from './common.js';

const NF = 800; // exact-solution samples
const FRAMES = 200; // frames for a whole run at full speed
const BUDGET_MS = 5; // compute per frame; beyond it the run goes slow-motion
const CFL = 0.9;

const PROBLEMS = [
  ['sod', 'Sod shock tube'],
  ['sod-sonic', 'Sod with a sonic rarefaction'],
  ['123', '123 problem (near vacuum)'],
  ['contact', 'Stationary contact'],
  ['slow-shock', 'Slowly moving shock'],
  ['blast-left', 'Blast wave, left half'],
  ['collision', 'Two colliding shocks'],
];
const FLUXES = [
  ['godunov', 'Godunov (exact Riemann)'],
  ['lf', 'Lax–Friedrichs'],
  ['rusanov', 'Rusanov'],
  ['hll', 'HLL'],
  ['hllc', 'HLLC'],
  ['roe', 'Roe'],
  ['lw', 'Lax–Wendroff (Richtmyer)'],
];
const LIMS = [
  ['minmod', 'minmod'],
  ['vanleer', 'van Leer'],
  ['mc', 'MC'],
  ['superbee', 'superbee'],
  ['none', 'none (unlimited)'],
];
const NS = [['50', '50'], ['100', '100'], ['200', '200'], ['400', '400']];

// Named set-ups. A case is { problem, flux, order, limiter, fix, n }.
const C = (problem, flux, order = 1, limiter = 'mc', fix = false, n = 0) => ({ problem, flux, order, limiter, fix, n });
const CASES = {
  sod: { one: C('sod', 'hllc') },
  'lw-ringing': { broken: { label: 'Lax–Wendroff', ...C('sod', 'lw') }, fixed: { label: 'MUSCL–Hancock, MC', ...C('sod', 'hllc', 2, 'mc') } },
  contact: { broken: { label: 'Rusanov', ...C('contact', 'rusanov') }, fixed: { label: 'HLLC', ...C('contact', 'hllc') } },
  sonic: { broken: { label: 'Roe, no fix', ...C('sod-sonic', 'roe') }, fixed: { label: 'Roe + entropy fix', ...C('sod-sonic', 'roe', 1, 'mc', true) } },
  positivity: { broken: { label: 'Roe', ...C('123', 'roe') }, fixed: { label: 'HLLC', ...C('123', 'hllc') } },
  'slow-shock': { broken: { label: 'Roe', ...C('slow-shock', 'roe') }, fixed: { label: 'Rusanov', ...C('slow-shock', 'rusanov') } },
};

export function mountSod(fig, { signal }) {
  const [key, side0] = (fig.dataset.preset || 'sod').split(':');
  const found = CASES[key] || CASES.sod;
  const paired = !!found.broken;
  const f = frame(fig, { title: 'The shock-tube lab', wide: true });
  const cfg = { problem: 'sod', flux: 'hllc', order: 1, limiter: 'mc', fix: false, n: 200 };

  const opts = (label, y) => ({ x: { label: 'x', min: 0, max: 1 }, y: { label: y }, aspect: 3.6, minHeight: 112, label });
  const pR = new Plot(f.stage, opts('Density against x: exact and numerical', 'density ρ'));
  const pU = new Plot(f.stage, opts('Velocity against x: exact and numerical', 'velocity u'));
  const pP = new Plot(f.stage, opts('Pressure against x: exact and numerical', 'pressure p'));

  // ---- buffers
  const xf = new Float64Array(NF), rf = new Float64Array(NF), uf = new Float64Array(NF), pf = new Float64Array(NF);
  let st = null, ex = null, tEnd = 0.25, target = 0, rhoTv = 1, fanFlag = false;

  // ---- controls
  const probSel = select(f.controls, { label: 'Problem', options: PROBLEMS, value: cfg.problem, onChange: (v) => set({ problem: v, n: eulerPreset(v).n }) });
  const fluxSel = select(f.controls, { label: 'Numerical flux', options: FLUXES, value: cfg.flux, onChange: (v) => set({ flux: v }) });
  const orderSeg = segmented(f.controls, { label: 'Order', options: [['1', 'first'], ['2', 'second (MUSCL–Hancock)']], value: String(cfg.order), onChange: (v) => set({ order: Number(v) }) });
  const limSel = select(f.controls, { label: 'Limiter', options: LIMS, value: cfg.limiter, onChange: (v) => set({ limiter: v }) });
  const fixTg = toggle(f.controls, { label: 'Roe entropy fix (Harten–Hyman)', checked: cfg.fix, onChange: (v) => set({ fix: v }) });
  const nSeg = segmented(f.controls, { label: 'Cells n', options: NS, value: String(cfg.n), onChange: (v) => set({ n: Number(v) }) });
  if (paired) {
    segmented(f.controls, { label: 'Compare', options: [['broken', found.broken.label], ['fixed', found.fixed.label]], value: side0 === 'fixed' ? 'fixed' : 'broken', onChange: (v) => applyCase(found[v]) });
  }
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Step', onClick: () => (loop.pause(), stepOnce()) });
  button(f.controls, { label: 'Reset', onClick: () => (loop.pause(), restart()) });

  // ---- readouts
  const rT = readout(f.readouts, { label: 'time t' });
  const rSteps = readout(f.readouts, { label: 'steps' });
  const rPs = readout(f.readouts, { label: 'exact p* (Newton steps)', title: 'Star pressure of the exact solution and how many Newton steps riemann.js needed' });
  const rL1 = readout(f.readouts, { label: 'L1 error in ρ', title: 'Δx Σ|ρ − ρ_exact| at the cell centres' });
  const rTv = readout(f.readouts, { label: 'TV(ρ) / TV(exact)', title: 'Total variation of the density over that of the exact solution; above 1 means new wiggles' });
  const rMin = readout(f.readouts, { label: 'min ρ, min p', title: 'Both must stay positive' });
  const rFan = readout(f.readouts, { label: 'largest ρ jump inside the left fan', title: 'Largest density jump between neighbouring cells inside the exact left rarefaction; it should shrink as n grows' });
  const rWig = readout(f.readouts, { label: 'momentum wiggle behind the shock', title: 'Slow shock only: largest deviation of ρu from its exact value in a window behind the shock, as a fraction of the momentum jump' });

  function applyCase(c) {
    set({ problem: c.problem, flux: c.flux, order: c.order, limiter: c.limiter, fix: c.fix, n: c.n || eulerPreset(c.problem).n });
  }

  function set(patch) {
    Object.assign(cfg, patch);
    probSel.set(cfg.problem, { silent: true });
    fluxSel.set(cfg.flux, { silent: true });
    orderSeg.set(String(cfg.order), { silent: true });
    limSel.set(cfg.limiter, { silent: true });
    fixTg.set(cfg.fix, { silent: true });
    nSeg.set(String(cfg.n), { silent: true });
    const centred = cfg.flux === 'lf' || cfg.flux === 'lw';
    orderSeg.el.hidden = centred;
    limSel.el.hidden = centred || cfg.order === 1;
    fixTg.el.hidden = cfg.flux !== 'roe';
    loop.pause();
    st = createEuler({ preset: cfg.problem, n: cfg.n, flux: cfg.flux, order: centred ? 1 : cfg.order, limiter: cfg.limiter, entropyFix: cfg.fix });
    ex = { rho: new Float64Array(st.n), u: new Float64Array(st.n), p: new Float64Array(st.n) };
    const pr = eulerPreset(cfg.problem);
    tEnd = pr.tEnd;
    const [a, b] = pr.domain;
    for (let k = 0; k < NF; k++) xf[k] = a + ((b - a) * (k + 0.5)) / NF;
    for (const P of [pR, pU, pP]) P.setAxes({ x: { min: a, max: b } });
    // Fixed y-ranges from the exact solution at the end time (plus the
    // initial states), so oscillations show against a steady frame.
    riemannProfile(st.exact, xf, st.x0, tEnd, rf, uf, pf);
    rhoTv = 1;
    setRange(pR, rf, st.L.rho, st.R.rho);
    setRange(pU, uf, st.L.u, st.R.u);
    setRange(pP, pf, st.L.p, st.R.p);
    const name = FLUXES.find((x) => x[0] === cfg.flux)[1] + (cfg.order === 2 && !centred ? `, MUSCL–Hancock (${cfg.limiter})` : '');
    const pts = cfg.n <= 100 ? 2.2 : 0;
    pR.draw([
      { x: xf, y: rf, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact' },
      { x: st.x, y: st.rho, color: 's1', width: 2, points: pts, label: name },
    ]);
    pU.draw([
      { x: xf, y: uf, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact' },
      { x: st.x, y: st.u, color: 's2', width: 2, points: pts, label: name },
    ]);
    pP.draw([
      { x: xf, y: pf, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact' },
      { x: st.x, y: st.p, color: 's3', width: 2, points: pts, label: name },
    ]);
    restart();
  }

  function setRange(P, arr, a, b) {
    let lo = Math.min(a, b), hi = Math.max(a, b);
    for (let k = 0; k < NF; k++) {
      if (arr[k] < lo) lo = arr[k];
      if (arr[k] > hi) hi = arr[k];
    }
    const pad = 0.18 * (hi - lo || 1);
    P.setAxes({ y: { min: lo - pad, max: hi + pad } });
  }

  function restart() {
    resetEuler(st);
    target = 0;
    show();
  }

  function stepOnce() {
    if (st.failure || st.t >= tEnd - 1e-14) return;
    const dt = Math.min(eulerDt(st, CFL), tEnd - st.t);
    stepEuler(st, dt);
    target = st.t;
    show();
  }

  function tick() {
    if (st.failure || st.t >= tEnd - 1e-14) return loop.pause();
    target = Math.min(tEnd, target + tEnd / FRAMES);
    const t0 = performance.now();
    while (st.t < target - 1e-14 && !st.failure) {
      const dt = Math.min(eulerDt(st, CFL), tEnd - st.t);
      if (!(dt > 0)) break;
      stepEuler(st, dt);
      if (performance.now() - t0 > BUDGET_MS) {
        target = st.t; // slow motion rather than a dropped frame
        break;
      }
    }
    show();
    if (st.failure || st.t >= tEnd - 1e-14) loop.pause();
  }

  function slowShockWiggle() {
    const L = st.L, R = st.R;
    const S = (R.rho * R.u - L.rho * L.u) / (R.rho - L.rho);
    const xs = st.x0 + S * st.t, mL = L.rho * L.u, dm = Math.abs(R.rho * R.u - mL);
    const xa = Math.max(xs - 0.25, st.x[0] + 0.02), xb = xs - 0.05;
    if (xb <= xa) return NaN;
    let dev = 0;
    for (let i = 0; i < st.n; i++) if (st.x[i] > xa && st.x[i] < xb) dev = Math.max(dev, Math.abs(st.mom[i] - mL));
    return dev / dm;
  }

  // Largest density jump between neighbours whose centres lie inside the
  // exact left rarefaction fan (NaN when the left wave is a shock).
  function fanJump() {
    const W = st.exact.left;
    fanFlag = false;
    if (W.type !== 'rarefaction' || st.t <= 0) return NaN;
    const a = st.x0 + W.head * st.t, b = st.x0 + W.tail * st.t;
    let m = 0, any = false;
    for (let i = 1; i < st.n; i++) {
      if (st.x[i - 1] < a || st.x[i] > b) continue;
      any = true;
      const d = Math.abs(st.rho[i] - st.rho[i - 1]);
      if (d > m) m = d;
    }
    // Flag it only when it is well above the step a smooth fan would have
    // on this grid (a first-order 'dog-leg' at a sonic point is smaller).
    const smooth = (Math.abs(st.exact.rhoL - st.exact.rhoStarL) * st.dx) / (b - a);
    fanFlag = any && m > 0.1 && m > 3 * smooth;
    return any ? m : NaN;
  }

  function show() {
    riemannProfile(st.exact, xf, st.x0, st.t, rf, uf, pf);
    pR.render();
    pU.render();
    pP.render();
    eulerExact(st, ex);
    const tvEx = totalVar(ex.rho, st.n);
    rhoTv = tvEx > 0 ? totalVar(st.rho, st.n) / tvEx : NaN;
    const err = l1(st.rho, ex.rho, st.dx, st.n);
    const rmin = minOf(st.rho, st.n), pmin = minOf(st.p, st.n);
    rT.set(st.t.toFixed(4));
    rSteps.set(String(st.steps));
    rPs.set(`${fmt(st.exact.pStar, 5)} (${st.exact.iterations})`);
    rL1.set(st.failure ? '–' : fmt(err, 3));
    rTv.set(Number.isFinite(rhoTv) && !st.failure ? rhoTv.toFixed(3) : '–', rhoTv > 1.05 ? 'bad' : '');
    rMin.set(`${fmt(rmin, 3)}, ${fmt(pmin, 3)}`, st.failure || pmin <= 0 || rmin <= 0 ? 'bad' : '');
    const fj = fanJump();
    rFan.set(Number.isFinite(fj) && !st.failure ? fj.toFixed(3) : '–', fanFlag ? 'bad' : '');
    const w = cfg.problem === 'slow-shock' && st.t > 0.5 ? slowShockWiggle() : NaN;
    rWig.set(Number.isFinite(w) ? `${(100 * w).toFixed(1)}%` : '–', w > 0.05 ? 'bad' : '');
    narrate(err, w, fj);
  }

  function narrate(err, w, fj) {
    let s;
    const F = st.failure;
    if (F) s = `Failed at step ${F.step}: ${F.reason} in cell ${F.cell} (x = ${F.x.toFixed(3)}, ρ = ${fmt(F.rho, 3)}, p = ${fmt(F.p, 3)}). The run stops here.`;
    else if (st.t === 0) s = `t = 0: two constant states meet at x = ${st.x0}. Press Run (to t = ${tEnd}) or Step.`;
    else if (Number.isFinite(w) && w > 0.05) s = `Momentum behind the slow shock wobbles by ${(100 * w).toFixed(0)}% of the jump, although the exact value is constant there.`;
    else if (fanFlag && st.t > 0.05) s = `A jump of ${fj.toFixed(2)} in density sits inside the rarefaction fan, at its sonic point: an expansion shock. Refining the grid does not remove it.`;
    else if (rhoTv > 1.05) s = `New wiggles: the density has ${rhoTv.toFixed(2)} times the total variation of the exact solution.`;
    else if (st.t >= tEnd - 1e-14) s = `Done at t = ${tEnd}: L1 density error ${fmt(err, 3)}, no new wiggles (TV ratio ${rhoTv.toFixed(3)}).`;
    else s = `Running: t = ${st.t.toFixed(3)} of ${tEnd}.`;
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  if (paired) applyCase(found[side0 === 'fixed' ? 'fixed' : 'broken']);
  else applyCase(found.one);
}
