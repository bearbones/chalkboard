// advection-schemes: the chapter's main lab. Pick a scheme, a profile, a
// grid and a Courant number; run it round the periodic domain beside the
// exact solution; watch max|u| on a log axis against the growth rate the von
// Neumann analysis predicts. Every step is advection.js step(); every number
// is advection.js diagnostics() or maxAmplification().
//
// data-preset: an id of advection.js PRESETS or ch-advection-analysis.js
// EXTRA_PRESETS, optionally with ':fixed' (start on the fixed case). The lab
// then offers the broken/fixed pair and pauses at the preset's step count,
// where the gallery compares them.

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { SCHEMES, PRESETS, createState, reset, step, diagnostics, maxAmplification } from '../../sims/advection.js';
import { EXTRA_PRESETS, cflLimit } from '../../sims/ch-advection-analysis.js';
import { LINEAR_OPTIONS, PROFILE_OPTIONS, fmtNu, fmtG } from './common.js';

const SCHEME_OPTIONS = [...LINEAR_OPTIONS, ['limited', 'MC-limited (chapter 8)']];
const NS = [['50', '50'], ['100', '100'], ['200', '200'], ['400', '400']];
const START_OPTIONS = [['lw', 'Lax–Wendroff step'], ['ftcs', 'FTCS step'], ['copy', 'copy: u¹ = u⁰']];
const HCAP = 512; // history points kept (halved when full)
const BLOWUP = 1e50;

function findPreset(spec) {
  if (!spec) return null;
  const [id, side] = spec.split(':');
  const p = PRESETS[id] || EXTRA_PRESETS[id];
  return p ? { p, side: side === 'fixed' ? 'fixed' : 'broken' } : null;
}

export function mountSchemes(fig, { signal }) {
  const found = findPreset(fig.dataset.preset);
  const f = frame(fig, { title: found ? `Advection lab: ${found.p.name.toLowerCase()}` : 'Advection lab', wide: true });

  const cfg = { scheme: 'upwind', nu: 0.5, profile: 'square', n: 100, start: 'lw', asselin: 0 };
  let stopAt = 0;

  // ---- plots
  const solPlot = new Plot(f.stage, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u' }, aspect: 2.3, label: 'Solution u against x: the scheme beside the exact solution' });
  const histPlot = new Plot(f.stage, { x: { label: 'time step', min: 0 }, y: { label: 'max |u|', log: true }, aspect: 3.4, minHeight: 130, label: 'Largest |u| against time step on a log axis, with the von Neumann growth rate' });

  // ---- state (reallocated only when n changes)
  let st = createState(cfg.n, cfg.profile);
  const D = {};
  const hS = new Float64Array(HCAP).fill(NaN); // step of each history point
  const hM = new Float64Array(HCAP).fill(NaN); // max |u|
  const hP = new Float64Array(HCAP).fill(NaN); // von Neumann ruler through the latest point
  let hN = 0, hStride = 1, hTick = 0, gMax = 1, blown = false;

  // ---- controls
  const schemeSel = select(f.controls, { label: 'Scheme', options: SCHEME_OPTIONS, value: cfg.scheme, onChange: (v) => set({ scheme: v }) });
  const profSel = select(f.controls, { label: 'Initial profile', options: PROFILE_OPTIONS, value: cfg.profile, onChange: (v) => set({ profile: v }) });
  const nSeg = segmented(f.controls, { label: 'Cells n', options: NS, value: String(cfg.n), onChange: (v) => set({ n: Number(v) }) });
  const nuSl = slider(f.controls, { label: 'Courant number ν', min: 0.05, max: 2.2, step: 0.01, value: cfg.nu, fmt: fmtNu, onInput: (v) => set({ nu: v }) });
  const startSel = select(f.controls, { label: 'Leapfrog first step', options: START_OPTIONS, value: cfg.start, onChange: (v) => set({ start: v }) });
  const gamSl = slider(f.controls, { label: 'Asselin filter γ', min: 0, max: 0.3, step: 0.01, value: cfg.asselin, fmt: (v) => v.toFixed(2), onInput: (v) => set({ asselin: v }) });
  let presetSeg = null;
  if (found) {
    presetSeg = segmented(f.controls, {
      label: 'Compare',
      options: [['broken', found.p.broken.label], ['fixed', found.p.fixed.label]],
      value: found.side,
      onChange: (v) => applyCase(v),
    });
  }

  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Step', onClick: () => advance(cfg.scheme === 'leapfrog' ? 2 : 1) });
  button(f.controls, { label: 'Reset', onClick: () => restart() });

  // ---- readouts
  const rT = readout(f.readouts, { label: 'time t', title: 'Time; one trip round the domain takes t = 1' });
  const rSteps = readout(f.readouts, { label: 'steps' });
  const rMax = readout(f.readouts, { label: 'max |u|' });
  const rG = readout(f.readouts, { label: 'max |G| (von Neumann)', title: 'Largest amplification factor over all wavenumbers' });
  const rGrow = readout(f.readouts, { label: 'measured growth / step', title: 'max|u| ratio per step over the last stretch of the run' });
  const rCfl = readout(f.readouts, { label: 'CFL bound on ν', title: 'Largest ν for which the stencil still contains the characteristic foot' });
  const rMass = readout(f.readouts, { label: 'mass drift', title: 'Σu·Δx minus its initial value' });
  const rTv = readout(f.readouts, { label: 'TV / TV₀', title: 'Total variation relative to the start: above 1 means new wiggles' });
  const rOU = readout(f.readouts, { label: 'overshoot / undershoot', title: 'How far u goes above the initial maximum and below the initial minimum' });
  const rL1 = readout(f.readouts, { label: 'L1 error', title: 'Δx Σ|u − exact|' });
  const rFlip = readout(f.readouts, { label: 'leapfrog flip', title: 'Size of the step-to-step odd–even oscillation in time (leapfrog only)' });

  function opts() {
    if (cfg.scheme === 'limited') return { limiter: 'mc' };
    if (cfg.scheme === 'leapfrog') return { start: cfg.start, asselin: cfg.asselin };
    return {};
  }
  let OPTS = opts();

  function applyCase(side) {
    const c = found.p[side];
    stopAt = c.steps;
    const o = c.opts || {};
    set({ scheme: c.scheme, nu: c.nu, profile: c.profile, n: c.n, start: o.start ?? 'lw', asselin: o.asselin ?? 0 }, true);
  }

  // Change the configuration and start again from t = 0.
  function set(patch, keepStop = false) {
    const nOld = cfg.n, pOld = cfg.profile;
    Object.assign(cfg, patch);
    if (!keepStop) stopAt = 0;
    schemeSel.set(cfg.scheme, { silent: true });
    profSel.set(cfg.profile, { silent: true });
    nSeg.set(String(cfg.n), { silent: true });
    nuSl.set(cfg.nu, { silent: true });
    startSel.set(cfg.start, { silent: true });
    gamSl.set(cfg.asselin, { silent: true });
    const lf = cfg.scheme === 'leapfrog';
    startSel.el.hidden = !lf;
    gamSl.el.hidden = !lf;
    OPTS = opts();
    if (cfg.n !== nOld) st = createState(cfg.n, cfg.profile);
    else if (cfg.profile !== pOld) reset(st, cfg.profile);
    restart();
  }

  function restart() {
    reset(st);
    blown = false;
    gMax = cfg.scheme === 'limited' ? NaN : maxAmplification(cfg.scheme, cfg.nu, 721, OPTS);
    hS.fill(NaN);
    hM.fill(NaN);
    hP.fill(NaN);
    hN = 0;
    hStride = 1;
    hTick = 0;
    record(true);
    const r = makeRange();
    solPlot.setAxes({ y: { min: r[0], max: r[1] } });
    drawSeries();
    show();
  }

  function makeRange() {
    const rg = st.profile.range;
    const span = rg[1] - rg[0];
    return [rg[0] - 0.35 * span, rg[1] + 0.35 * span];
  }

  function drawSeries() {
    diagnostics(st, D);
    const name = SCHEMES[cfg.scheme].name;
    solPlot.draw([
      { x: st.x, y: st.exact, color: 'ink', dash: [5, 4], width: 1.5, label: 'exact' },
      { x: st.x, y: st.u, color: 's1', width: 2, points: cfg.n <= 100 ? 2 : 0, label: name },
    ]);
    histPlot.draw([
      { x: hS, y: hM, color: 's1', width: 2, label: 'measured max |u|' },
      Number.isFinite(gMax) ? { x: hS, y: hP, color: 's2', width: 1.5, dash: [6, 4], label: 'slope max |G| per step', hover: false } : null,
    ]);
  }

  // History: one point per `hStride` calls; halve the arrays when full.
  function record(force) {
    if (!force && ++hTick % hStride !== 0) return;
    if (hN === HCAP) {
      for (let k = 0; k < HCAP / 2; k++) {
        hS[k] = hS[2 * k];
        hM[k] = hM[2 * k];
      }
      for (let k = HCAP / 2; k < HCAP; k++) {
        hS[k] = NaN;
        hM[k] = NaN;
      }
      hN = HCAP / 2;
      hStride *= 2;
    }
    let m = 0;
    for (let j = 0; j < st.n; j++) {
      const a = Math.abs(st.u[j]);
      if (a > m || a !== a) m = a;
    }
    hS[hN] = st.steps;
    hM[hN] = m;
    hN++;
    // The von Neumann ruler: slope log(max|G|) per step, through the latest point.
    if (Number.isFinite(gMax)) {
      const s1 = st.steps, lg = Math.log(gMax);
      for (let k = 0; k < hN; k++) hP[k] = m * Math.exp(lg * (hS[k] - s1));
    }
  }

  function advance(k) {
    if (blown) return;
    for (let i = 0; i < k; i++) {
      step(st, cfg.scheme, cfg.nu, OPTS);
      if (stopAt && st.steps >= stopAt) break;
    }
    record(true);
    show();
  }

  function stepsPerFrame() {
    // About 1/300 of a revolution per frame: one trip round in ~5 s.
    let k = Math.ceil(cfg.n / (300 * cfg.nu));
    if (k > 48) k = 48;
    if (cfg.scheme === 'leapfrog' && k % 2) k++; // show whole leapfrog pairs: no flicker
    return k;
  }

  function tick() {
    if (blown) return loop.pause();
    let k = stepsPerFrame();
    if (stopAt && st.steps < stopAt) k = Math.min(k, stopAt - st.steps);
    for (let i = 0; i < k; i++) step(st, cfg.scheme, cfg.nu, OPTS);
    record(false);
    show();
    if (stopAt && st.steps === stopAt) loop.pause();
    if (blown) loop.pause();
  }

  function growthPerStep() {
    if (hN < 3) return NaN;
    const a = hN - 1;
    let b = a - 1;
    while (b > 0 && hS[a] - hS[b] < 20) b--;
    const ds = hS[a] - hS[b];
    if (ds <= 0 || !(hM[b] > 0) || !Number.isFinite(hM[a])) return NaN;
    return Math.pow(hM[a] / hM[b], 1 / ds);
  }

  function show() {
    diagnostics(st, D);
    const big = Math.max(Math.abs(D.max), Math.abs(D.min));
    if (!(big < BLOWUP)) blown = true;
    solPlot.render();
    histPlot.render();
    rT.set(D.t);
    rSteps.set(String(D.steps));
    rMax.set(big < 1e5 ? fmt(big, 4) : sci(big, 3), big > Math.max(1.5, 1.5 * st.max0) ? 'bad' : '');
    if (Number.isFinite(gMax)) rG.set(fmtG(gMax), gMax > 1 + 1e-9 ? 'bad' : 'good');
    else rG.set('n/a (nonlinear)');
    const gr = growthPerStep();
    rGrow.set(Number.isFinite(gr) ? fmtG(gr) : '–', gr > 1.001 ? 'bad' : '');
    const lim = cfg.scheme === 'limited' ? 1 : cflLimit(cfg.scheme);
    rCfl.set(lim > 0 ? `ν ≤ ${lim}` : 'none (wrong side)', cfg.nu > lim ? 'bad' : '');
    rMass.set(Number.isFinite(D.massError) ? sci(D.massError, 2) : '–');
    rTv.set(D.tv0 > 0 && D.tv < 1e12 ? fmt(D.tv / D.tv0, 3) : '–', D.tv > 1.01 * D.tv0 ? 'bad' : '');
    rOU.set(big < 1e5 ? `${fmt(D.overshoot, 2)} / ${fmt(D.undershoot, 2)}` : '–');
    rL1.set(big < 1e5 ? fmt(D.l1, 3) : '–');
    rFlip.set(cfg.scheme === 'leapfrog' ? fmt(D.flip, 3) : '–');
    narrate(big);
  }

  function narrate(big) {
    const lim = cfg.scheme === 'limited' ? 1 : cflLimit(cfg.scheme);
    let s;
    if (blown) s = `Blown up after ${D.steps} steps: max |u| passed 10⁵⁰. Reset, or change the scheme or ν.`;
    else if (cfg.nu > lim && lim === 0) s = `Downwind takes its difference on the wrong side: the exact value at each point comes from upstream, where this stencil never looks.`;
    else if (cfg.nu > lim) s = `ν = ${fmtNu(cfg.nu)} > ${lim}: the exact solution comes from further upstream than the stencil reaches (CFL fails), so max |G| = ${fmtG(gMax)} > 1.`;
    else if (gMax > 1 + 1e-9) s = `The CFL condition holds, yet max |G| = ${fmtG(gMax)} > 1: some wave grows every step. CFL is necessary, not sufficient.`;
    else if (stopAt && D.steps === stopAt) s = `Paused at step ${stopAt}, where the gallery compares the pair. Press Run to carry on.`;
    else if (big > 1.5 * Math.max(1, st.max0)) s = `Growing: max |u| = ${sci(big, 2)}.`;
    else if (cfg.scheme === 'leapfrog' && cfg.nu >= 1) s = `Leapfrog at ν = 1 sits on the edge: |G| = 1 exactly with a double root, and errors grow slowly.`;
    else s = `Stable: max |G| ${Number.isFinite(gMax) ? `= ${fmtG(gMax)}` : '≤ 1 (TVD)'}. Compare the shape with the dashed exact solution.`;
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  if (found) applyCase(found.side);
  else set({});
}
