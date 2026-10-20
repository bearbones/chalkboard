// Chapter 6, section grids: discretization-representations. One function,
// four ways to keep it in n numbers (point values, cell averages, hat-function
// coefficients, Fourier modes), with the error, the "mass" ∫R − ∫f and the
// overshoot of each. Numbers: ch-discretization-represent.js.

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, segmented, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { REPRESENTATIONS, REP_PROFILES, quadrature, measure } from '../../sims/ch-discretization-represent.js';
import { sci2, figTable, swatchLabel, preset } from './common.js';

const KINDS = [
  { id: 'points', label: 'Points', color: 's1', stores: 'point values', conserved: 'nothing exactly' },
  { id: 'averages', label: 'Averages', color: 's2', stores: 'cell means', conserved: '∫u, by definition' },
  { id: 'hats', label: 'Hats', color: 's3', stores: 'hat coefficients', conserved: '∫u, by projection' },
  { id: 'fourier', label: 'Fourier', color: 's4', stores: 'mode amplitudes', conserved: '∫u (mode 0)' },
];
const PROFILE_LABELS = [
  ['smooth', 'smooth bump'],
  ['gaussian', 'narrow Gaussian'],
  ['triangle', 'triangle (kinks)'],
  ['square', 'square wave (jumps)'],
];
const R_PRESETS = {
  default: { prof: 'smooth', kind: 'points', n: 12 },
  fourier: { prof: 'smooth', kind: 'fourier', n: 12 },
  gibbs: { prof: 'square', kind: 'fourier', n: 32 },
  averages: { prof: 'square', kind: 'averages', n: 16 },
  hats: { prof: 'gaussian', kind: 'hats', n: 12 },
};

export function mountRepresentations(fig) {
  const P = preset(fig, R_PRESETS);
  const f = frame(fig, { title: 'Four ways to store a function in n numbers', wide: true });
  const plot = new Plot(f.stage, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u' }, aspect: 2.1, label: 'A function and its reconstruction from n stored numbers' });
  const tbl = figTable(['Representation', 'stores', ['L² error', 'num'], ['∫R − ∫f', 'num'], ['overshoot', 'num'], 'conserves'], KINDS.map((K) => K.id), { label: 'All four representations at this n' });
  for (const K of KINDS) {
    tbl.cell(K.id, 0).append(swatchLabel(K.color, REPRESENTATIONS[K.id].family));
    tbl.set(K.id, 1, K.stores);
    tbl.set(K.id, 5, K.conserved);
  }
  f.stage.append(tbl.el);

  const NX = 601;
  const xs = new Float64Array(NX);
  const fy = new Float64Array(NX);
  const ry = new Float64Array(NX);
  for (let k = 0; k < NX; k++) xs[k] = k / (NX - 1);
  const nodeX = new Float64Array(128);
  const nodeY = new Float64Array(128);
  const cellX = new Float64Array(129);
  const cellY = new Float64Array(129);

  const kindSeg = segmented(f.controls, { label: 'Representation', options: KINDS.map((K) => [K.id, K.label]), value: P.kind, onChange: () => draw() });
  const profSel = select(f.controls, { label: 'Function', options: PROFILE_LABELS, value: P.prof, onChange: () => draw() });
  const nS = slider(f.controls, { label: 'numbers stored n', min: 4, max: 64, step: 1, value: P.n, fmt: (v) => String(Math.round(v)), onInput: () => draw() });
  const l2R = readout(f.readouts, { label: 'L² error' });
  const ordR = readout(f.readouts, { label: 'order, n → 2n' });
  const massR = readout(f.readouts, { label: 'mass error ∫R − ∫f' });
  const overR = readout(f.readouts, { label: 'overshoot' });

  function draw() {
    const kind = kindSeg.value;
    const prof = profSel.value;
    const n = Math.round(nS.value);
    const p = REP_PROFILES[prof];
    const Q = quadrature(p, n);
    const res = {};
    for (const K of KINDS) {
      res[K.id] = measure(p, n, K.id, Q);
      const m = res[K.id];
      tbl.set(K.id, 2, sci2(m.l2));
      tbl.set(K.id, 3, Math.abs(m.massErr) < 1e-13 ? '0 (round-off)' : sci2(m.massErr));
      tbl.set(K.id, 4, `${(100 * Math.max(m.overshoot, m.undershoot)).toFixed(1)}%`);
      tbl.row(K.id).style.fontWeight = K.id === kind ? '700' : '';
    }
    const cur = res[kind];
    const R = cur.rep;
    for (let k = 0; k < NX; k++) {
      fy[k] = p.f(xs[k] === 1 ? 0 : xs[k]);
      ry[k] = R.evaluate(xs[k] === 1 ? 1 - 1e-12 : xs[k]);
    }
    const K = KINDS.find((x) => x.id === kind);
    const series = [{ x: xs, y: fy, color: 'ink', width: 1.6, dash: [5, 4], label: 'f(x)' }];
    if (kind === 'averages') {
      for (let j = 0; j < n; j++) {
        cellX[j] = (j + 0.5) / n;
        cellY[j] = R.coef[j];
      }
      series.push({ x: cellX.subarray(0, n), y: cellY.subarray(0, n), color: K.color, width: 2.5, step: true, label: 'cell averages' });
    } else {
      series.push({ x: xs, y: ry, color: K.color, width: 2.5, label: kind === 'fourier' ? `Fourier, K = ${R.K} modes` : 'reconstruction' });
      if (kind !== 'fourier') {
        for (let j = 0; j < n; j++) {
          nodeX[j] = j / n;
          nodeY[j] = R.coef[j];
        }
        series.push({ x: nodeX.subarray(0, n), y: nodeY.subarray(0, n), color: K.color, width: 0, points: 4, label: kind === 'points' ? 'stored values' : 'stored coefficients', hover: false });
      }
    }
    const [lo, hi] = p.range;
    plot.setAxes({ y: { min: lo - 0.25 * (hi - lo), max: hi + 0.25 * (hi - lo) } });
    plot.draw(series);
    const m2 = measure(p, Math.min(256, 2 * n), kind);
    const order = Math.log2(cur.l2 / m2.l2);
    l2R.set(sci2(cur.l2));
    ordR.set(cur.l2 < 1e-13 ? 'at round-off' : Number.isFinite(order) ? order.toFixed(2) : '–');
    massR.set(Math.abs(cur.massErr) < 1e-13 ? '0 (round-off)' : sci2(cur.massErr), Math.abs(cur.massErr) < 1e-13 ? 'good' : Math.abs(cur.massErr) > 1e-10 ? 'bad' : '');
    const os = Math.max(cur.overshoot, cur.undershoot);
    overR.set(`${(100 * os).toFixed(1)}%`, os > 0.05 ? 'bad' : '');
    let msg;
    if (kind === 'fourier' && prof === 'square') msg = `Gibbs: the truncated Fourier series overshoots each jump by about 9% of the jump, and more modes only squeeze the wiggles closer to it.`;
    else if (kind === 'fourier' && cur.l2 < 1e-12) msg = `Spectral accuracy: with ${2 * R.K + 1} smooth modes the error is already at round-off.`;
    else if (kind === 'hats' && os > 0.05) msg = `The best fit in the mean-square sense overshoots near a steep change: L² projection does not respect bounds.`;
    else if (kind === 'points' && Math.abs(cur.massErr) > 1e-10) msg = `Point values come with no conservation guarantee: their trapezoid sum misses ∫f by ${sci2(Math.abs(cur.massErr))}.`;
    else if (kind === 'points' && Math.abs(cur.massErr) > 1e-13) msg = `The trapezoid sum of point values is extraordinarily accurate on smooth periodic data (it misses ∫f by only ${sci2(Math.abs(cur.massErr))}), but nothing guarantees it. Try the square wave.`;
    else if (kind === 'averages') msg = `Cell averages keep ∫f exactly at any n, but a constant per cell is only first-order accurate as a picture of f.`;
    else msg = `${REPRESENTATIONS[kind].name}: L² error ${sci2(cur.l2)}, falling at order ${Number.isFinite(order) ? order.toFixed(1) : '–'} when n doubles.`;
    f.status.textContent = msg;
  }
  draw();
}
