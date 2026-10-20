// solvers-modes: why relaxation stalls. The 1-D model problem (n interior
// points, zero at both ends) relaxed on A e = 0, so the iterate is the
// error. poisson.js smooth1d() runs the sweeps when a control changes and
// returns the sine-mode amplitudes after every sweep; the figure plays them
// back, rebuilding the error curve with sineSynthesis (an exact inverse
// transform). Bottom plot: the factor by which one sweep multiplies each
// mode, measured by modeFactors1d() (one sweep from a pure mode) beside the
// analytic weighted-Jacobi factor λ_k = 1 − 2ω sin²(kπ/(2n+2)).

import { h } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { smooth1d, sineSynthesis, modeFactors1d, jacobiModeFactor, SMOOTHING_PRESETS } from '../../sims/poisson.js';
import { presetFor, num, count, hline, label } from './common.js';

const MAXS = 400;
const PRESETS = {
  default: { start: 'mixed', method: 'jacobi', omega: 2 / 3, n: 31 },
  stall: { start: 'smooth', method: 'jacobi', omega: 2 / 3, n: 31 },
  'highest-broken': { start: 'highest', method: 'jacobi', omega: 1, n: 31 },
  'highest-fixed': { start: 'highest', method: 'jacobi', omega: 2 / 3, n: 31 },
  over: { start: 'mixed', method: 'jacobi', omega: 1.1, n: 31 },
  gs: { start: 'mixed', method: 'gs', omega: 1, n: 31 },
};

export function mountModes(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Each mode dies at its own rate', wide: true, tall: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);
  const errPlot = new Plot(left, {
    x: { label: 'position x', min: 0, max: 1 },
    y: { label: 'error e', min: -2, max: 2 },
    aspect: 1.6,
    label: 'The error along the line now, and at the start',
  });
  const specPlot = new Plot(left, {
    x: { label: 'mode number k (1 = smoothest)', min: 0.5, max: 31.5 },
    y: { label: '|amplitude|', min: 1e-6, max: 2, log: true },
    aspect: 1.6,
    legend: false,
    label: 'Size of each sine mode of the error now (bars) and at the start (ticks), on a log scale',
  });
  const facPlot = new Plot(right, {
    x: { label: 'mode number k (1 = smoothest)', min: 0.5, max: 31.5 },
    y: { label: 'factor per sweep', min: -1.25, max: 1.25 },
    aspect: 1.05,
    label: 'Factor by which one sweep multiplies each mode: measured points and the analytic weighted-Jacobi curve',
  });

  const method = segmented(f.controls, {
    label: 'Smoother',
    options: [
      ['jacobi', 'weighted Jacobi'],
      ['gs', 'Gauss–Seidel'],
      ['rbgs', 'red–black'],
    ],
    value: p.method,
    onChange: () => rebuild(),
  });
  const om = slider(f.controls, { label: 'ω (Jacobi weight)', min: 0.1, max: 1.3, step: 'any', value: p.omega, fmt: (v) => v.toFixed(2), onInput: () => rebuild() });
  const size = segmented(f.controls, {
    label: 'Points n',
    options: [
      [15, '15'],
      [31, '31'],
      [63, '63'],
    ],
    value: p.n,
    onChange: () => rebuild(),
  });
  const start = select(f.controls, {
    label: 'Starting error',
    options: Object.values(SMOOTHING_PRESETS).map((s) => [s.id, s.name]),
    value: p.start,
    onChange: () => rebuild(),
  });
  const loop = animate(fig, tick, { autoplay: true, signal });
  playButton(f.controls, loop, { label: 'Relax' });
  button(f.controls, { label: 'One sweep', onClick: () => (loop.pause(), (s = Math.min(MAXS, Math.floor(s) + 1)), draw()) });
  button(f.controls, { label: 'Restart', onClick: () => ((s = 0), draw(), loop.play()) });

  const rdS = readout(f.readouts, { label: 'sweeps' });
  const rd1 = readout(f.readouts, { label: 'smoothest mode left (k = 1)' });
  const rdN = readout(f.readouts, { label: 'roughest mode left (k = n)' });
  const rdL = readout(f.readouts, { label: 'factor of mode 1 per sweep' });
  const rdT = readout(f.readouts, { label: 'sweeps to cut mode 1 by 10×' });
  const rdM = readout(f.readouts, { label: 'worst factor, upper half of modes' });

  let n = 31;
  let hist = null;
  let fac = null;
  const xs = new Float64Array(63);
  const ks = new Float64Array(63);
  const e0 = new Float64Array(63);
  const eNow = new Float64Array(63);
  const lam = new Float64Array(63);
  const abs = new Float64Array(63);
  let a0max = 1;
  let s = 0;
  let lastStatus = '';

  function rebuild() {
    n = Number(size.value);
    const m = method.value;
    om.input.disabled = m !== 'jacobi';
    const omega = m === 'jacobi' ? om.value : 1;
    const init = SMOOTHING_PRESETS[start.value].init(n);
    const gen = smooth1d(init, { method: m, omega, sweeps: MAXS });
    let r;
    do r = gen.next();
    while (!r.done);
    hist = r.value.history;
    fac = modeFactors1d(n, { method: m, omega });
    for (let j = 0; j < n; j++) {
      xs[j] = (j + 1) / (n + 1);
      ks[j] = j + 1;
      e0[j] = init[j];
      lam[j] = jacobiModeFactor(j + 1, n, omega);
    }
    a0max = 0;
    for (let j = 0; j < n; j++) a0max = Math.max(a0max, Math.abs(init[j]));
    errPlot.setAxes({ y: { label: 'error e', min: -1.15 * a0max, max: 1.15 * a0max } });
    specPlot.setAxes({ x: { label: 'mode number k (1 = smoothest)', min: 0.5, max: n + 0.5 } });
    let fLo = -1.25;
    for (let j = 0; j < n; j++) fLo = Math.min(fLo, fac[j] - 0.1, isFinite(lam[j]) && m === 'jacobi' ? lam[j] - 0.1 : fLo);
    facPlot.setAxes({ x: { label: 'mode number k (1 = smoothest)', min: 0.5, max: n + 0.5 }, y: { label: 'factor per sweep', min: fLo, max: 1.25 } });
    s = 0;
    draw();
  }

  function tick(dt) {
    if (s >= MAXS) {
      loop.pause();
      return;
    }
    // Slow for the first sweeps, then faster: the smooth modes need hundreds.
    const rate = s < 12 ? 3 : s < 60 ? 12 : 40;
    s = Math.min(MAXS, s + rate * dt);
    draw();
    if (s >= MAXS) loop.pause();
  }

  function draw() {
    const si = Math.floor(s);
    const a = hist[si];
    const aStart = hist[0];
    sineSynthesis(a.subarray(0, n), eNow.subarray(0, n));
    for (let j = 0; j < n; j++) abs[j] = Math.abs(a[j]);
    const X = xs.subarray(0, n);
    errPlot.draw([
      { x: X, y: e0.subarray(0, n), color: 'muted', width: 1.5, dash: [4, 4], label: 'start' },
      { x: X, y: eNow.subarray(0, n), color: 's1', width: 2, points: n <= 31 ? 2 : 0, label: `after ${si} sweeps` },
    ]);
    specPlot.draw([], {
      extra(ctx, tx, ty, area, pal) {
        const w = Math.max(1, (tx(2) - tx(1)) * 0.7);
        for (let k = 0; k < n; k++) {
          const x = tx(k + 1);
          const v = abs[k];
          if (v > 1e-6) {
            const y = Math.max(area.y0, ty(v));
            ctx.fillStyle = pal.css('s1', 0.85);
            ctx.fillRect(x - w / 2, y, w, area.y1 - y);
          }
          const v0 = Math.abs(aStart[k]);
          if (v0 > 1e-6) {
            ctx.strokeStyle = pal.css('ink');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - w / 2 - 1, ty(v0));
            ctx.lineTo(x + w / 2 + 1, ty(v0));
            ctx.stroke();
          }
        }
        label(ctx, pal, 'smooth', area.x0 + 4, area.y0 + 12);
        label(ctx, pal, 'rough', area.x1 - 4, area.y0 + 12, { align: 'right' });
      },
    });
    const isJ = method.value === 'jacobi';
    const K = ks.subarray(0, n);
    facPlot.draw([
      isJ ? { x: K, y: lam.subarray(0, n), color: 'ink', width: 1.5, dash: [5, 4], label: 'analytic 1 − 2ω sin²(kπ/(2n+2))' } : null,
      { x: K, y: fac.subarray(0, n), color: 's2', width: 0, points: 3, label: 'measured: one sweep from a pure mode' },
    ], {
      under(ctx, tx, ty, area, pal) {
        // The upper half of the modes: what a smoother must kill.
        const x0 = tx(n / 2 + 0.5);
        ctx.fillStyle = pal.css('accent', 0.08);
        ctx.fillRect(x0, area.y0, area.x1 - x0, area.y1 - area.y0);
        label(ctx, pal, 'rough half', area.x1 - 4, area.y1 - 6, { align: 'right' });
        hline(ctx, ty, area, pal, 1, { color: 'bad', dash: [2, 3], text: '+1: never damped', side: 'left' });
        hline(ctx, ty, area, pal, -1, { color: 'bad', dash: [2, 3], text: '−1: flips, never damped', side: 'left' });
      },
    });

    let mu = 0;
    for (let k = Math.floor(n / 2); k < n; k++) mu = Math.max(mu, Math.abs(fac[k]));
    const l1 = fac[0];
    const r1 = aStart[0] !== 0 ? a[0] / aStart[0] : NaN;
    const rN = aStart[n - 1] !== 0 ? a[n - 1] / aStart[n - 1] : NaN;
    const toTen = Math.abs(l1) < 1 ? Math.log(0.1) / Math.log(Math.abs(l1)) : Infinity;
    rdS.set(String(si));
    rd1.set(Number.isNaN(r1) ? 'absent' : num(r1, 3), Math.abs(r1) > 0.5 && si > 20 ? 'bad' : '');
    rdN.set(Number.isNaN(rN) ? 'absent' : num(rN, 3), Math.abs(rN) > 1 ? 'bad' : Math.abs(rN) < 1e-3 ? 'good' : '');
    rdL.set(num(l1, 5));
    rdT.set(Number.isFinite(toTen) ? count(toTen) : 'never');
    rdM.set(num(mu, 3), mu >= 1 ? 'bad' : mu <= 0.5 ? 'good' : '');

    let msg;
    const w = om.value;
    if (isJ && w > 1 + 1e-9) msg = `ω = ${w.toFixed(2)} over-relaxes: the roughest modes now have factors below −1 (worst ${num(-mu, 3)}), so they grow with every sweep. Jacobi needs ω ≤ 1.`;
    else if (isJ && Math.abs(w - 1) < 0.005) msg = `ω = 1, plain Jacobi: the roughest mode has factor ${num(fac[n - 1], 4)}. It flips sign every sweep and barely shrinks. The smoothest mode is no better (${num(l1, 4)}).`;
    else if (mu > 0.6) msg = `ω = ${w.toFixed(2)}: even the rough half of the modes is damped weakly (worst factor ${num(mu, 3)}). Under-relaxing slows everything.`;
    else msg = `${isJ ? `Weighted Jacobi, ω = ${w.toFixed(2)}` : method.value === 'gs' ? 'Gauss–Seidel' : 'Red–black Gauss–Seidel'}: the rough half of the modes shrinks by at least ${num(1 / mu, 2)}× per sweep; the smoothest keeps ${num(Math.abs(l1), 4)} of itself each sweep and needs ${Number.isFinite(toTen) ? count(toTen) : 'endless'} sweeps for a tenfold cut.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  rebuild();
  return () => {
    errPlot.destroy();
    specPlot.destroy();
    facPlot.destroy();
  };
}
