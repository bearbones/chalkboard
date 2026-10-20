// solvers-sweep: the order in which Jacobi, Gauss–Seidel, red–black
// Gauss–Seidel and SOR visit the cells of a 16 × 16 closed box (the pressure
// problem of a sealed container, random right-hand side). The solvers are
// poisson.js's own generators run with trace 'cells': after each sweep they
// replay {op:'relax', cell, value} for every cell in the order it was
// updated, and this figure copies those values into its picture one by one.
// The cell being written is marked in the write colour, the neighbours it
// reads in the read colour. The map shows either the error (the iterate
// minus the exact answer, both with their mean removed: on a closed box the
// pressure level is arbitrary) or the residual b − A x, each on a fixed
// colour scale set by the starting state, so you can watch the residual fade
// long before the error does.

import { h } from '../../kit/dom.js';
import { frame, slider, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { POISSON_PRESETS, jacobi, gaussSeidel, redBlackGS, sor, mgpcg, residual, makeCompatible, sorOptimalOmega } from '../../sims/poisson.js';
import { presetFor, num, count, legend, allowScroll, label } from './common.js';

const N = 16;
const MAXS = 2000;
const JACOBI_OMEGA = 0.8;
const PRESETS = {
  default: { method: 'gs', map: 'error', speed: 4 },
  jacobi: { method: 'jacobi', map: 'error', speed: 4 },
  'red-black': { method: 'rb', map: 'error', speed: 4 },
  sor: { method: 'sor', map: 'error', speed: 4 },
  residual: { method: 'gs', map: 'residual', speed: 16 },
};
const NAMES = { jacobi: `Jacobi (ω = ${JACOBI_OMEGA})`, gs: 'Gauss–Seidel', rb: 'red–black Gauss–Seidel', sor: 'SOR' };

export function mountSweep(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Watching a sweep', wide: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);

  const view = new FieldView(left, { nx: N, ny: N, maxHeight: 380, label: 'A 16 by 16 closed box. Colour shows the error or the residual of the current pressure guess; the cell being updated and the neighbours it reads are outlined.' });
  allowScroll(view);
  const leg = legend(left, 'div', ['', '0', '']);
  const plot = new Plot(right, {
    x: { label: 'sweeps', min: 0, max: 20 },
    y: { label: 'size relative to the start', min: 1e-4, max: 1.5, log: true },
    aspect: 1.35,
    label: 'Residual and error of the current guess, relative to their starting sizes, against the number of sweeps',
  });

  const method = segmented(f.controls, {
    label: 'Method',
    options: [
      ['jacobi', 'Jacobi'],
      ['gs', 'Gauss–Seidel'],
      ['rb', 'red–black'],
      ['sor', 'SOR'],
    ],
    value: p.method,
    onChange: () => restart(),
  });
  const map = segmented(f.controls, {
    label: 'Colour shows',
    options: [
      ['error', 'error'],
      ['residual', 'residual'],
    ],
    value: p.map,
    onChange: () => draw(),
  });
  const speed = slider(f.controls, { label: 'cells per frame', min: 1, max: 1024, log: true, value: p.speed, fmt: (v) => count(v) });
  const loop = animate(fig, tick, { autoplay: true, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'One cell', onClick: () => (loop.pause(), advance(1), draw()) });
  button(f.controls, { label: 'One sweep', onClick: () => (loop.pause(), finishSweep(), draw()) });
  button(f.controls, { label: 'Restart', onClick: () => (restart(), loop.play()) });

  const rdK = readout(f.readouts, { label: 'sweeps' });
  const rdR = readout(f.readouts, { label: 'residual ‖b − Ax‖ / ‖b‖' });
  const rdE = readout(f.readouts, { label: 'error ‖x − x*‖ / ‖x*‖' });
  const rdQ = readout(f.readouts, { label: 'error ÷ residual' });
  const rdW = readout(f.readouts, { label: 'cell being written' });

  // The problem, its exact answer, and the colour scales.
  const { op, b: b0 } = POISSON_PRESETS['closed-box'].make(N, N, 1);
  const b = Float64Array.from(b0);
  makeCompatible(op, b);
  const exact = mgpcg(op, b, { tol: 1e-13, history: false });
  let ex;
  for (;;) {
    const r = exact.next();
    if (r.done) {
      ex = r.value.x;
      break;
    }
  }
  let exNorm = 0;
  let eMax = 0;
  for (let c = 0; c < op.n; c++) {
    exNorm += ex[c] * ex[c];
    eMax = Math.max(eMax, Math.abs(ex[c]));
  }
  exNorm = Math.sqrt(exNorm);
  const omegaOpt = sorOptimalOmega(op);

  const x = new Float64Array(op.n);
  const shown = new Float64Array(op.n);
  const done = new Uint8Array(op.n);
  const rv = new Float64Array(op.n);
  const ev = new Float64Array(op.n);
  const hk = new Float64Array(MAXS + 1);
  const hr = new Float64Array(MAXS + 1);
  const he = new Float64Array(MAXS + 1);
  let len = 0;
  let gen = null;
  let k = 0;
  let cell = -1;
  let colour = -1;
  let inSweep = 0;
  let finished = false;
  let budget = 0;
  let rMax = 1;
  let lastStatus = '';

  function errorNow() {
    let m = 0;
    for (let c = 0; c < op.n; c++) m += shown[c];
    m /= op.n;
    let s = 0;
    for (let c = 0; c < op.n; c++) {
      const e = shown[c] - m - ex[c];
      ev[c] = e;
      s += e * e;
    }
    return Math.sqrt(s) / exNorm;
  }

  function restart() {
    gen?.return();
    x.fill(0);
    shown.fill(0);
    done.fill(0);
    const m = method.value;
    const opts = { x, tol: 1e-12, maxIter: MAXS, trace: 'cells', history: false };
    if (m === 'jacobi') gen = jacobi(op, b, { ...opts, omega: JACOBI_OMEGA });
    else if (m === 'gs') gen = gaussSeidel(op, b, opts);
    else if (m === 'rb') gen = redBlackGS(op, b, opts);
    else gen = sor(op, b, { ...opts, omega: omegaOpt });
    k = 0;
    cell = -1;
    colour = -1;
    inSweep = 0;
    finished = false;
    budget = 0;
    len = 1;
    hk[0] = 0;
    hr[0] = 1;
    he[0] = errorNow();
    residual(op, shown, b, rv);
    rMax = 0;
    for (let c = 0; c < op.n; c++) rMax = Math.max(rMax, Math.abs(rv[c]));
    draw();
  }

  // Process events until `cells` relax events have been shown (or a sweep
  // ends, when untilSweep is set).
  function advance(cells, untilSweep = false) {
    let left2 = cells;
    while (!finished && left2 > 0) {
      const r = gen.next();
      if (r.done) {
        finished = true;
        break;
      }
      const e = r.value;
      if (e.t === 'op' && e.op === 'relax') {
        shown[e.cell] = e.value;
        done[e.cell] = 1;
        cell = e.cell;
        colour = e.colour ?? -1;
        inSweep++;
        left2--;
      } else if (e.t === 'iter') {
        k = e.k;
        done.fill(0);
        inSweep = 0;
        if (len <= MAXS) {
          hk[len] = k;
          hr[len] = Math.max(e.residual, 1e-16);
          he[len] = Math.max(errorNow(), 1e-16);
          len++;
        }
        if (untilSweep) break;
      }
    }
  }

  function finishSweep() {
    advance(Infinity, true);
  }

  function tick() {
    budget += speed.value;
    const n = Math.floor(budget);
    budget -= n;
    if (n > 0) advance(n);
    draw();
    if (finished) loop.pause();
  }

  function draw() {
    const pal = palette();
    const showErr = map.value === 'error';
    let relE = errorNow();
    if (showErr) {
      const m = eMax * 1.05;
      view.draw(ev, { map: 'div', lo: -m, hi: m });
      leg.set(num(-m, 2), '0', num(m, 2));
    } else {
      residual(op, shown, b, rv);
      const m = rMax * 1.05;
      view.draw(rv, { map: 'div', lo: -m, hi: m });
      leg.set(num(-m, 2), '0', num(m, 2));
    }
    const isJacobi = method.value === 'jacobi';
    view.overlay((ctx, X, Y) => {
      const s = Math.abs(X(1) - X(0));
      // Cells already updated in this sweep: a small dot.
      ctx.fillStyle = pal.css('ink', 0.55);
      for (let c = 0; c < op.n; c++) {
        if (!done[c]) continue;
        const i = c % N;
        const j = (c / N) | 0;
        ctx.beginPath();
        ctx.arc(X(i + 0.5), Y(j + 0.5), Math.max(1.2, s * 0.09), 0, 2 * Math.PI);
        ctx.fill();
      }
      if (cell < 0) return;
      const i = cell % N;
      const j = (cell / N) | 0;
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = pal.css('read');
      if (i > 0) ctx.strokeRect(X(i - 1) + 2, Y(j + 1) + 2, s - 4, s - 4);
      if (i < N - 1) ctx.strokeRect(X(i + 1) + 2, Y(j + 1) + 2, s - 4, s - 4);
      if (j > 0) ctx.strokeRect(X(i) + 2, Y(j) + 2, s - 4, s - 4);
      if (j < N - 1) ctx.strokeRect(X(i) + 2, Y(j + 2) + 2, s - 4, s - 4);
      ctx.lineWidth = 3;
      ctx.strokeStyle = pal.css('write');
      ctx.strokeRect(X(i) + 1.5, Y(j + 1) + 1.5, s - 3, s - 3);
    });

    const K = hk.subarray(0, len);
    const kMax = Math.max(20, Math.ceil((hk[len - 1] + 1) / 20) * 20);
    plot.setAxes({ x: { label: 'sweeps', min: 0, max: kMax }, y: { label: 'size relative to the start', min: Math.min(1e-4, hr[len - 1] * 0.5), max: 1.5, log: true } });
    plot.draw([
      { x: K, y: hr.subarray(0, len), color: 's1', width: 2, label: 'residual' },
      { x: K, y: he.subarray(0, len), color: 's2', width: 2, dash: [6, 4], label: 'error' },
    ], {
      extra(ctx, tx, ty, area, pl) {
        if (len < 2) label(ctx, pl, 'press Run', area.x0 + 6, area.y1 - 6, { color: 'muted' });
      },
    });

    const rNow = hr[len - 1];
    rdK.set(`${count(k)}${inSweep ? ` (+${inSweep}/${op.n} cells)` : ''}`);
    rdR.set(num(rNow, 3));
    rdE.set(num(relE, 3), relE > 0.1 && rNow < 0.05 ? 'bad' : '');
    rdQ.set(num(relE / Math.max(rNow, 1e-16), 3));
    rdW.set(cell < 0 ? '–' : `(${cell % N}, ${(cell / N) | 0})${colour >= 0 ? (colour === 0 ? ' red' : ' black') : ''}`);

    const name = NAMES[method.value] + (method.value === 'sor' ? ` (ω = ${num(omegaOpt, 4)})` : '');
    let msg;
    if (finished) msg = `${name} reached a residual of 10⁻¹² after ${count(k)} sweeps.`;
    else if (k > 0 && rNow < 0.05 && relE > 0.1) msg = `${name}, sweep ${k}: the residual is down to ${num(rNow, 2)}, but the error is still ${num(relE, 2)} of the answer. What is left is smooth, and smooth error makes almost no residual.`;
    else if (method.value === 'jacobi') msg = `${name}: every cell reads its neighbours' old values, so the order does not matter and all cells could be updated at once.`;
    else if (method.value === 'rb') msg = `${name}: all red cells first (none of them touches another red cell), then all black. Each half could be done in parallel.`;
    else if (method.value === 'sor') msg = `${name}: Gauss–Seidel order, but each cell overshoots its own solution by the factor ω = ${num(omegaOpt, 4)}.`;
    else msg = `${name}: row by row from the bottom left. Each cell uses the new values to its left and below as soon as they exist.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
    f.fig.dataset.sweeps = String(k);
  }

  view.redraw = () => {
    leg.refresh();
    draw();
  };
  restart();
  return () => {
    gen?.return();
    view.destroy();
    plot.destroy();
  };
}
