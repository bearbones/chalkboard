// solvers-sor: how the over-relaxation factor ω changes SOR. Left: sweeps
// needed to cut the residual by 10⁶ on a closed box, for ω from 0.5 to 1.98,
// each point a full poisson.js sor() solve (lexicographic order), computed a
// few at a time in the background. The dashed line is Young's optimum
// ω_opt = 2/(1 + √(1 − ρ_J²)) from sorOptimalOmega(). Right: the residual
// history for the ω on the slider, with Gauss–Seidel (ω = 1) for reference.
// Past ω = 2 the iteration diverges.

import { h } from '../../kit/dom.js';
import { frame, slider, segmented, button, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { POISSON_PRESETS, sor, sorOptimalOmega, jacobiSpectralRadius } from '../../sims/poisson.js';
import { presetFor, num, count, vline, label, jobRunner } from './common.js';

const TOL = 1e-6;
const CAP = 3000;
const W0 = 0.5;
const W1 = 1.98;
const DW = 0.02;
const NW = Math.round((W1 - W0) / DW) + 1;
const PRESETS = {
  default: { omega: 1, n: 16 },
  optimal: { omega: 'opt', n: 16 },
  high: { omega: 1.95, n: 16 },
  diverge: { omega: 2.05, n: 16 },
  under: { omega: 0.6, n: 16 },
  fine: { omega: 'opt', n: 32 },
};

// Run one SOR solve, stopping early once it is clearly diverging. Fills
// hist (relative residual after each sweep) and returns the sweep count, or
// −1 if it diverged, or CAP + 1 if it hit the cap.
function runSor(op, b, omega, hist) {
  const gen = sor(op, b, { omega, tol: TOL, maxIter: CAP, history: false });
  let len = 1;
  if (hist) hist[0] = 1;
  for (;;) {
    const r = gen.next();
    if (r.done) return { iters: r.value.converged ? r.value.iters : CAP + 1, len };
    const e = r.value;
    if (hist && len < hist.length) hist[len++] = e.residual;
    if (!(e.residual < 1e6)) {
      gen.return();
      return { iters: -1, len };
    }
  }
}

export function mountSor(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Choosing ω for SOR', wide: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);
  const curve = new Plot(left, {
    x: { label: 'ω', min: 0.4, max: 2.2 },
    y: { label: 'sweeps to cut the residual 10⁶×', min: 10, max: CAP * 1.2, log: true },
    aspect: 1.3,
    label: 'Sweeps needed by SOR against the relaxation factor omega, with the predicted best omega marked',
  });
  const hist = new Plot(right, {
    x: { label: 'sweeps', min: 0, max: 600 },
    y: { label: 'relative residual', min: 1e-7, max: 10, log: true },
    aspect: 1.3,
    label: 'Residual against sweeps for the chosen omega and for Gauss–Seidel',
  });

  const size = segmented(f.controls, {
    label: 'Grid',
    options: [
      [16, '16 × 16'],
      [32, '32 × 32'],
    ],
    value: p.n,
    onChange: () => rebuild(),
  });
  const om = slider(f.controls, { label: 'ω', min: 0.2, max: 2.2, step: 0.01, value: 1, fmt: (v) => v.toFixed(2), onInput: () => single() });
  button(f.controls, { label: 'Set ω to the predicted optimum', onClick: () => om.set(Math.round(omegaOpt * 100) / 100) });

  const rdW = readout(f.readouts, { label: 'sweeps at this ω' });
  const rdG = readout(f.readouts, { label: 'Gauss–Seidel (ω = 1)' });
  const rdO = readout(f.readouts, { label: 'predicted ω_opt' });
  const rdB = readout(f.readouts, { label: 'best ω measured' });
  const rdJ = readout(f.readouts, { label: 'Jacobi spectral radius ρ_J' });

  const jobs = jobRunner(signal);
  const ws = new Float64Array(NW);
  const its = new Float64Array(NW);
  for (let k = 0; k < NW; k++) ws[k] = W0 + k * DW;
  let nDone = 0;
  let op = null;
  let b = null;
  let omegaOpt = 1.7;
  let rhoJ = 0.99;
  const hOne = new Float64Array(CAP + 1);
  const hGS = new Float64Array(CAP + 1);
  const kx = new Float64Array(CAP + 1);
  for (let k = 0; k <= CAP; k++) kx[k] = k;
  let lenOne = 1;
  let lenGS = 1;
  let itOne = 0;
  let itGS = 0;
  let lastStatus = '';

  function rebuild() {
    const n = Number(size.value);
    ({ op, b } = POISSON_PRESETS['closed-box'].make(n, n, 1));
    omegaOpt = sorOptimalOmega(op);
    rhoJ = jacobiSpectralRadius(op);
    const gs = runSor(op, b, 1, hGS);
    itGS = gs.iters;
    lenGS = gs.len;
    nDone = 0;
    its.fill(NaN);
    single(false);
    jobs.run(sweepOmega(), () => draw());
  }

  function* sweepOmega() {
    for (let k = 0; k < NW; k++) {
      const r = runSor(op, b, ws[k], null);
      its[k] = r.iters < 0 ? NaN : r.iters;
      nDone = k + 1;
      if (k % 4 === 3) draw();
      yield;
    }
  }

  function single(redraw = true) {
    const r = runSor(op, b, om.value, hOne);
    itOne = r.iters;
    lenOne = r.len;
    if (redraw) draw();
  }

  function draw() {
    let best = NaN;
    let bestIt = Infinity;
    for (let k = 0; k < nDone; k++) {
      if (its[k] < bestIt) {
        bestIt = its[k];
        best = ws[k];
      }
    }
    const w = om.value;
    curve.draw([
      { x: ws.subarray(0, nDone), y: its.subarray(0, nDone), color: 's1', width: 2, points: 2, label: 'SOR, measured' },
    ], {
      extra(ctx, tx, ty, area, pal) {
        vline(ctx, tx, area, pal, omegaOpt, { color: 'ink', text: 'predicted ω_opt' });
        vline(ctx, tx, area, pal, 2, { color: 'bad', dash: [2, 3], text: 'ω = 2' });
        const y = itOne < 0 || itOne > CAP ? CAP * 1.1 : itOne;
        const xx = tx(Math.min(w, 2.19));
        ctx.fillStyle = pal.css('write');
        ctx.strokeStyle = pal.css('ink');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(xx, ty(y), 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        if (nDone < NW) label(ctx, pal, `computing… ${nDone}/${NW}`, area.x0 + 6, area.y1 - 6);
      },
    });
    const kMax = Math.max(50, Math.min(CAP, Math.ceil(Math.max(itGS, itOne > 0 ? itOne : 0) / 50) * 50 + 50));
    hist.setAxes({ x: { label: 'sweeps', min: 0, max: kMax } });
    hist.draw([
      { x: kx.subarray(0, lenGS), y: hGS.subarray(0, lenGS), color: 's1', width: 2, label: 'Gauss–Seidel (ω = 1)' },
      { x: kx.subarray(0, lenOne), y: hOne.subarray(0, lenOne), color: 's2', width: 2, dash: [6, 4], label: `ω = ${w.toFixed(2)}` },
    ]);
    const fmtIt = (it) => (it < 0 ? 'diverges' : it > CAP ? `over ${count(CAP)}` : count(it));
    rdW.set(fmtIt(itOne), itOne < 0 || itOne > CAP ? 'bad' : itOne <= 1.15 * bestIt ? 'good' : '');
    rdG.set(fmtIt(itGS));
    rdO.set(num(omegaOpt, 4));
    rdB.set(nDone < NW ? '…' : `${best.toFixed(2)} (${count(bestIt)} sweeps)`);
    rdJ.set(num(rhoJ, 4));
    let msg;
    if (w >= 2) msg = `ω = ${w.toFixed(2)}: past 2 every update overshoots by more than it corrects, and SOR diverges whatever the grid.`;
    else if (itOne < 0 || itOne > CAP) msg = `ω = ${w.toFixed(2)}: no convergence within ${count(CAP)} sweeps.`;
    else if (Math.abs(w - 1) < 0.005) msg = `ω = 1 is Gauss–Seidel itself: ${fmtIt(itOne)} sweeps. Raise ω towards the predicted optimum, ${num(omegaOpt, 3)}.`;
    else if (w < 1) msg = `ω = ${w.toFixed(2)} under-relaxes: each cell moves only part of the way, and SOR is slower than Gauss–Seidel (${fmtIt(itOne)} sweeps against ${fmtIt(itGS)}).`;
    else if (Math.abs(w - omegaOpt) < 0.03) msg = `ω close to the optimum: ${fmtIt(itOne)} sweeps instead of Gauss–Seidel's ${fmtIt(itGS)}.`;
    else if (w > omegaOpt) msg = `ω = ${w.toFixed(2)} is past the optimum: the error now oscillates, and the cost climbs steeply towards ω = 2 (${fmtIt(itOne)} sweeps).`;
    else msg = `ω = ${w.toFixed(2)}: better than Gauss–Seidel (${fmtIt(itOne)} sweeps against ${fmtIt(itGS)}), short of the optimum ${num(omegaOpt, 3)}.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  rebuild();
  if (p.omega === 'opt') om.set(Math.round(omegaOpt * 100) / 100);
  else om.set(p.omega);
  return () => {
    jobs.cancel();
    curve.destroy();
    hist.destroy();
  };
}
