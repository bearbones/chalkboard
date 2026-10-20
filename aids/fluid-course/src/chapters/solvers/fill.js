// solvers-fill: why direct solvers struggle with the pressure matrix. The
// chapter kernel ch-solvers-direct.js builds the 5-point matrix of an n × n
// grid (N = n² unknowns) in one of two numberings and factorises it,
// A = L Lᵀ (Cholesky). Left: where A has nonzeros (lower half). Right: where
// L has them, with the entries that were zero in A (the fill) in a lighter
// shade. Plot: nonzeros against n for both numberings, measured for every n
// from 4 to 32 in the background, with the current n marked.

import { h } from '../../kit/dom.js';
import { frame, slider, segmented, readout } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { Plot } from '../../kit/plot.js';
import { fillStats, ORDERS } from '../../sims/ch-solvers-direct.js';
import { presetFor, num, count, allowScroll, logSlope, jobRunner, label } from './common.js';

const NMIN = 4;
const NMAX = 32;
const PRESETS = {
  default: { n: 12, order: 'lex' },
  nested: { n: 12, order: 'nested' },
  big: { n: 32, order: 'lex' },
};

export function mountFill(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'What elimination does to a sparse matrix', wide: true });
  f.stage.classList.add('cols');
  const mats = h('div.sv-mats');
  const right = h('div');
  f.stage.append(mats, right);
  const colA = h('div.sv-mat');
  const colL = h('div.sv-mat');
  mats.append(colA, colL);
  const capA = h('div.sv-level-label', 'A (lower half)');
  const capL = h('div.sv-level-label', 'L, its Cholesky factor');
  const viewA = new FieldView(colA, { nx: 16, ny: 16, flipY: false, maxHeight: 300, minHeight: 120, label: 'Pattern of nonzero entries in the lower half of the pressure matrix A' });
  const viewL = new FieldView(colL, { nx: 16, ny: 16, flipY: false, maxHeight: 300, minHeight: 120, label: 'Pattern of nonzero entries in the Cholesky factor L; entries that were zero in A are lighter' });
  colA.append(capA);
  colL.append(capL);
  allowScroll(viewA);
  allowScroll(viewL);
  const plot = new Plot(right, {
    x: { label: 'cells per side n', min: 3.5, max: 36, log: true },
    y: { label: 'nonzeros stored', min: 10, max: 1e5, log: true },
    aspect: 1.3,
    label: 'Nonzeros of A and of its Cholesky factor against grid size, for both numberings, on log scales',
  });

  const nS = slider(f.controls, { label: 'cells per side n', min: NMIN, max: NMAX, step: 1, value: p.n, fmt: (v) => `${v} (${v * v} unknowns)`, onInput: () => show() });
  const ord = segmented(f.controls, {
    label: 'Numbering',
    options: Object.values(ORDERS).map((o) => [o.id, o.name]),
    value: p.order,
    onChange: () => show(),
  });

  const rdN = readout(f.readouts, { label: 'unknowns N = n²' });
  const rdA = readout(f.readouts, { label: 'nonzeros in A (lower half)' });
  const rdL = readout(f.readouts, { label: 'nonzeros in L' });
  const rdR = readout(f.readouts, { label: 'L ÷ A' });
  const rdF = readout(f.readouts, { label: 'multiply–adds to factorise' });
  const rdP = readout(f.readouts, { label: 'fitted growth of L' });

  const ns = new Float64Array(NMAX - NMIN + 1);
  for (let i = 0; i < ns.length; i++) ns[i] = NMIN + i;
  const curve = { lex: new Float64Array(ns.length).fill(NaN), nested: new Float64Array(ns.length).fill(NaN), A: new Float64Array(ns.length).fill(NaN) };
  const jobs = jobRunner(signal, 6);
  let cur = null;
  let patA = null;
  let patL = null;
  let lastStatus = '';

  function* measure() {
    for (let i = 0; i < ns.length; i++) {
      for (const o of ['lex', 'nested']) {
        const s = fillStats(ns[i], o);
        curve[o][i] = s.nnzL;
        curve.A[i] = s.nnzA;
        yield;
      }
      if (i % 4 === 3) drawPlot();
    }
  }

  function show() {
    const n = Math.round(nS.value);
    cur = fillStats(n, ord.value);
    const { N, A, L } = cur;
    if (!patA || patA.length !== N * N) {
      patA = new Float32Array(N * N);
      patL = new Float32Array(N * N);
      viewA.resize(N, N);
      viewL.resize(N, N);
    }
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const k = i * N + j;
        const a = j <= i && A[k] !== 0;
        patA[k] = a ? 1 : 0;
        patL[k] = j <= i && L[k] !== 0 ? (a ? 1 : 0.5) : 0;
      }
    }
    draw();
  }

  function drawPlot() {
    const n = Math.round(nS.value);
    plot.draw([
      { x: ns, y: curve.A, color: 'muted', width: 1.5, dash: [3, 3], label: 'A itself' },
      { x: ns, y: curve.lex, color: 's1', width: 2, points: 2, label: 'L, row by row' },
      { x: ns, y: curve.nested, color: 's2', width: 2, dash: [7, 4], points: 2, label: 'L, nested dissection' },
    ], {
      extra(ctx, tx, ty, area, pal) {
        if (!cur) return;
        ctx.fillStyle = pal.css('write');
        ctx.strokeStyle = pal.css('ink');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(tx(n), ty(cur.nnzL), 5.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        if (jobs.busy) label(ctx, pal, 'measuring…', area.x0 + 6, area.y0 + 14);
      },
    });
  }

  function draw() {
    if (!cur) return;
    const map = 'seq';
    viewA.draw(patA, { map, lo: 0, hi: 1 });
    viewL.draw(patL, { map, lo: 0, hi: 1 });
    drawPlot();
    const { N, nnzA, nnzL, flops } = cur;
    const n = Math.round(nS.value);
    rdN.set(count(N));
    rdA.set(count(nnzA));
    rdL.set(count(nnzL), nnzL / nnzA > 4 ? 'bad' : '');
    rdR.set(num(nnzL / nnzA, 3));
    rdF.set(count(flops));
    const slope = logSlope(ns, curve[ord.value]);
    rdP.set(Number.isFinite(slope) ? `∝ n^${slope.toFixed(2)}` : '…');
    const msg = ord.value === 'lex'
      ? `Row by row, A is a band n = ${n} wide, and elimination fills the whole band: ${count(nnzL)} nonzeros in L against ${count(nnzA)} in A. That is about N·n, which grows like n³.`
      : `Nested dissection numbers each half of the grid before the line of cells that separates them, so the fill stays inside smaller blocks: ${count(nnzL)} nonzeros in L, against ${count(fillLex(n))} row by row.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  function fillLex(n) {
    const i = n - NMIN;
    return Number.isFinite(curve.lex[i]) ? curve.lex[i] : NaN;
  }

  viewA.redraw = () => draw();
  viewL.redraw = () => draw();
  show();
  jobs.run(measure(), () => draw());
  return () => {
    jobs.cancel();
    viewA.destroy();
    viewL.destroy();
    plot.destroy();
  };
}
