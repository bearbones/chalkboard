// advection-modified: the modified equation u_t + a u_x = D u_xx + E u_xxx
// put to the test. Diffusion: a Gaussian run with upwind or Lax–Friedrichs
// spreads with variance growing at 2D, as a heat equation with the scheme's D
// would. Dispersion: a wave packet run with a second-order scheme moves at
// the discrete group velocity, not at a. Every step is advection.js step();
// D, E and group velocities come from advection.js modifiedEquation() and
// ch-advection-analysis.js; moments from momentsPeriodic(). The predicted
// Gaussian is closed form (with its periodic images).

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, segmented, readout, playButton, button, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { SCHEMES, createState, reset, step, diagnostics, modifiedEquation, amplification } from '../../sims/advection.js';
import { momentsPeriodic, groupVelocity, modifiedSpeeds } from '../../sims/ch-advection-analysis.js';
import { fmtNu, ppw } from './common.js';

const HCAP = 600;
const SIGMA0 = 0.05; // the Gaussian profile's σ (advection.js default)

export function mountModified(fig, { signal }) {
  const f = frame(fig, { title: 'What the scheme really solves', wide: true });
  const cfg = {
    mode: fig.dataset.preset === 'dispersion' ? 'dispersion' : 'diffusion',
    dScheme: 'upwind', pScheme: 'leapfrog', nu: 0.5, n: 100,
  };
  const solPlot = new Plot(f.stage, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u', min: -0.3, max: 1.15 }, aspect: 2.4, label: 'The numerical solution, the exact solution and the modified-equation prediction' });
  const hPlot = new Plot(f.stage, { x: { label: 'time t', min: 0, max: 1 }, y: { label: 'variance growth' }, aspect: 3.4, minHeight: 130, label: 'Measured against predicted, over one trip round the domain' });

  let st = createState(cfg.n, 'gaussian');
  const Dg = {}, MO = {};
  const pred = new Float64Array(400), px = new Float64Array(400);
  for (let k = 0; k < 400; k++) px[k] = (k + 0.5) / 400;
  const hT = new Float64Array(HCAP).fill(NaN), hM = new Float64Array(HCAP).fill(NaN);
  const hP = new Float64Array(HCAP).fill(NaN), hQ = new Float64Array(HCAP).fill(NaN);
  let hN = 0, v0 = 0, D = 0, E = 0, cg = 1, cgMe = 1, cPh = 1, theta = 0;

  const modeSeg = segmented(f.controls, { label: 'Show', options: [['diffusion', 'Diffusion (pulse)'], ['dispersion', 'Dispersion (packet)']], value: cfg.mode, onChange: (v) => ((cfg.mode = v), configure()) });
  const dSeg = segmented(f.controls, { label: 'Scheme', options: [['upwind', 'Upwind'], ['lxf', 'Lax–Friedrichs']], value: cfg.dScheme, onChange: (v) => ((cfg.dScheme = v), configure()) });
  const pSeg = segmented(f.controls, { label: 'Scheme', options: [['leapfrog', 'Leapfrog'], ['lw', 'Lax–Wendroff'], ['bw', 'Beam–Warming'], ['fromm', 'Fromm']], value: cfg.pScheme, onChange: (v) => ((cfg.pScheme = v), configure()) });
  slider(f.controls, { label: 'Courant number ν', min: 0.1, max: 1, step: 0.01, value: cfg.nu, fmt: fmtNu, onInput: (v) => ((cfg.nu = v), configure()) });
  const nSeg = segmented(f.controls, { label: 'Cells n', options: [['50', '50'], ['100', '100'], ['200', '200']], value: String(cfg.n), onChange: (v) => ((cfg.n = Number(v)), configure()) });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Reset', onClick: () => configure() });
  loop.onChange((playing) => {
    if (playing && st.t >= 1 - 1e-9) configure(true);
  });

  const r1 = readout(f.readouts, { label: 'time t' });
  const r2 = readout(f.readouts, { label: '' });
  const r3 = readout(f.readouts, { label: '' });
  const r4 = readout(f.readouts, { label: '' });
  const r5 = readout(f.readouts, { label: '' });
  const r6 = readout(f.readouts, { label: '' });
  const label = (r, text, title) => {
    const dt = r.el.previousElementSibling;
    dt.textContent = text;
    dt.title = title || '';
  };

  const scheme = () => (cfg.mode === 'diffusion' ? cfg.dScheme : cfg.pScheme);
  const opts = () => (scheme() === 'leapfrog' ? { start: 'lw' } : undefined);
  let OPTS = opts();

  function configure(keepPlaying = false) {
    if (!keepPlaying) loop.pause();
    const diff = cfg.mode === 'diffusion';
    dSeg.el.hidden = !diff;
    pSeg.el.hidden = diff;
    if (!diff && cfg.n === 50) {
      cfg.n = 100;
      nSeg.set('100', { silent: true });
    }
    nSeg.el.querySelector('[data-v="50"]').hidden = !diff;
    const prof = diff ? 'gaussian' : 'packet';
    if (st.n !== cfg.n) st = createState(cfg.n, prof);
    else reset(st, prof);
    OPTS = opts();
    const id = scheme(), dx = 1 / cfg.n;
    const me = modifiedEquation(id, 1, dx, cfg.nu);
    D = me.D;
    E = me.E;
    theta = (2 * Math.PI * st.profile.params.k) / cfg.n;
    if (!diff) {
      cg = groupVelocity(id, cfg.nu, theta, OPTS);
      cgMe = modifiedSpeeds(id, cfg.nu, theta).group;
      cPh = amplification(id, cfg.nu, theta, OPTS).relSpeed;
    }
    v0 = momentsPeriodic(st.x, st.u, 0.5, 1).variance;
    hT.fill(NaN);
    hM.fill(NaN);
    hP.fill(NaN);
    hQ.fill(NaN);
    hN = 0;
    if (diff) {
      label(r2, 'numerical D', 'From the modified equation: upwind aΔx(1 − ν)/2; Lax–Friedrichs Δx²(1 − ν²)/(2Δt)');
      label(r3, 'measured / predicted spread', 'Variance growth over 2Dt');
      label(r4, 'peak: scheme', 'Largest u');
      label(r5, 'peak: modified eq.', 'Height of the predicted Gaussian');
      label(r6, 'pulse width σ', 'Square root of the measured variance');
      solPlot.setAxes({ y: { min: -0.1, max: 1.1 } });
      hPlot.setAxes({ y: { label: 'variance growth', min: 0, max: null } });
    } else {
      label(r2, 'θ = kΔx', 'Wavenumber of the carrier wave in radians per cell');
      label(r3, 'phase speed c/a', 'Discrete, from the amplification factor');
      label(r4, 'group speed / a', 'Discrete: (1/ν) d(phase per step)/dθ');
      label(r5, 'group speed / a, modified eq.', 'Leading order: 1 + 3Eθ²/(aΔx²)');
      label(r6, 'envelope lag: measured / predicted', 'Distance behind the exact packet');
      solPlot.setAxes({ y: { min: -1.15, max: 1.15 } });
      hPlot.setAxes({ y: { label: 'envelope lag', min: null, max: null } });
    }
    record();
    drawSeries();
    show();
  }

  function drawSeries() {
    const name = SCHEMES[scheme()].name;
    if (cfg.mode === 'diffusion') {
      solPlot.draw([
        { x: st.x, y: st.exact, color: 'ink', dash: [5, 4], width: 1.5, label: 'exact' },
        { x: px, y: pred, color: 's2', dash: [2, 3], width: 2.5, label: 'heat equation with D' },
        { x: st.x, y: st.u, color: 's1', width: 2, points: cfg.n <= 100 ? 2 : 0, label: name },
      ]);
      // y axis: at least up to the prediction at the end of the trip.
      hPlot.draw([
        { x: hT, y: hQ, color: 's2', dash: [6, 4], width: 2, label: 'predicted 2Dt' },
        { x: hT, y: hM, color: 's1', width: 2, label: 'measured' },
      ], { yExtent: [0, Math.max(2 * D, 1e-6)] });
    } else {
      solPlot.draw([
        { x: st.x, y: st.exact, color: 'ink', dash: [4, 4], width: 1, label: 'exact', alpha: 0.6 },
        { x: st.x, y: st.u, color: 's1', width: 1.8, label: name },
      ], { extra: markers });
      // y axis: at least the two predicted lags at the end of the trip.
      const l1 = cg - 1, l2 = cgMe - 1;
      hPlot.draw([
        { x: hT, y: hP, color: 's2', dash: [6, 4], width: 2, label: 'discrete group velocity' },
        { x: hT, y: hQ, color: 's3', dash: [2, 3], width: 2, label: 'modified equation' },
        { x: hT, y: hM, color: 's1', width: 2, label: 'measured' },
      ], { yExtent: [Math.min(0, l1, l2, -0.02), Math.max(0, l1, l2, 0.02)] });
    }
  }

  // Vertical markers: exact packet centre, predicted centre, measured centroid.
  function markers(ctx, tx, ty, area, pal) {
    const t = st.t;
    const xe = (0.5 + t) % 1, xp = (0.5 + cg * t) % 1;
    const m = momentsPeriodic(st.x, st.u, xp, 2, MO);
    const xm = ((xp + m.offset) % 1 + 1) % 1;
    vline(ctx, tx(xe), area, pal.css('ink', 0.7), [5, 4]);
    vline(ctx, tx(xp), area, pal.css('s2'), [6, 4]);
    ctx.fillStyle = pal.css('s1');
    ctx.beginPath();
    ctx.moveTo(tx(xm) - 7, area.y0 + 2);
    ctx.lineTo(tx(xm) + 7, area.y0 + 2);
    ctx.lineTo(tx(xm), area.y0 + 13);
    ctx.closePath();
    ctx.fill();
  }

  function vline(ctx, x, area, color, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x, area.y0);
    ctx.lineTo(x, area.y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Gaussian of variance σ0² + 2Dt and the same mass, with periodic images.
  // Sets predS2 and predPeak.
  let predS2 = 0, predPeak = 1;
  function predicted() {
    const s2 = SIGMA0 * SIGMA0 + 2 * D * st.t;
    const c = 0.5 + st.t - Math.floor(0.5 + st.t);
    predS2 = s2;
    predPeak = SIGMA0 / Math.sqrt(s2);
    for (let k = 0; k < 400; k++) {
      let v = 0;
      for (let m = -2; m <= 2; m++) {
        const d = px[k] - c + m;
        v += Math.exp((-d * d) / (2 * s2));
      }
      pred[k] = predPeak * v;
    }
  }

  function record() {
    if (hN >= HCAP) return;
    const t = st.t;
    hT[hN] = t;
    if (cfg.mode === 'diffusion') {
      const m = momentsPeriodic(st.x, st.u, (0.5 + t) % 1, 1, MO);
      hM[hN] = m.variance - v0;
      hQ[hN] = 2 * D * t;
    } else {
      const xp = (0.5 + cg * t) % 1;
      const m = momentsPeriodic(st.x, st.u, xp, 2, MO);
      hM[hN] = (cg - 1) * t + m.offset;
      hP[hN] = (cg - 1) * t;
      hQ[hN] = (cgMe - 1) * t;
    }
    hN++;
  }

  function tick() {
    // About 1/360 of a revolution per frame; whole leapfrog pairs.
    let k = Math.ceil(cfg.n / (360 * cfg.nu));
    if (scheme() === 'leapfrog' && k % 2) k++;
    const id = scheme();
    for (let i = 0; i < k; i++) {
      if (st.t >= 1 - 1e-9) break;
      step(st, id, cfg.nu, OPTS);
    }
    record();
    show();
    if (st.t >= 1 - 1e-9) loop.pause();
  }

  function show() {
    diagnostics(st, Dg);
    r1.set(st.t);
    if (cfg.mode === 'diffusion') {
      predicted();
      const m = momentsPeriodic(st.x, st.u, (0.5 + st.t) % 1, 1, MO);
      const grow = m.variance - v0, want = 2 * D * st.t;
      r2.set(sci(D, 2));
      r3.set(st.t > 0 ? fmt(grow / want, 4) : '–');
      r4.set(fmt(Dg.max, 3));
      r5.set(fmt(predPeak, 3));
      r6.set(fmt(Math.sqrt(Math.max(0, m.variance)), 3));
      const wide = Math.sqrt(predS2) > 0.15;
      const name = SCHEMES[cfg.dScheme].name;
      const s = wide
        ? `${name} has spread the pulse so wide (σ ≈ ${fmt(Math.sqrt(predS2), 2)}) that it overlaps its periodic copies; the variance is no longer a clean measure. Raise ν or n.`
        : st.t === 0
          ? `Press Run. ${name} at ν = ${fmtNu(cfg.nu)} should spread the pulse like the heat equation with D = ${sci(D, 2)}.`
          : `${name}: the variance has grown by ${sci(grow, 3)}; the modified equation predicts 2Dt = ${sci(want, 3)}.`;
      if (f.status.textContent !== s) f.status.textContent = s;
    } else {
      const xp = (0.5 + cg * st.t) % 1;
      const m = momentsPeriodic(st.x, st.u, xp, 2, MO);
      r2.set(fmt(theta, 3) + ` (${fmt(ppw(theta), 3)} pts/wave)`);
      r3.set(fmt(cPh, 4));
      r4.set(fmt(cg, 4));
      r5.set(fmt(cgMe, 4));
      const lagM = (cg - 1) * st.t + m.offset, lagP = (cg - 1) * st.t;
      r6.set(st.t > 0 ? `${fmt(lagM, 3)} / ${fmt(lagP, 3)}` : '–');
      const name = SCHEMES[cfg.pScheme].name;
      const dir = cg < 1 ? 'lags behind' : 'runs ahead of';
      const s = st.t === 0
        ? `Press Run. Each wave crest moves at c = ${fmt(cPh, 3)}a, but the packet as a whole should move at the group speed, ${fmt(cg, 3)}a.`
        : `${name}: the packet ${dir} the exact one by ${fmt(Math.abs(lagM), 3)}; the discrete group velocity predicts ${fmt(Math.abs(lagP), 3)}. Peak |u| = ${fmt(Math.max(Dg.max, -Dg.min), 3)}.`;
      if (f.status.textContent !== s) f.status.textContent = s;
    }
    solPlot.render();
    hPlot.render();
  }

  modeSeg.set(cfg.mode, { silent: true });
  configure();
}
