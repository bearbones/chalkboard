// Chapter 6, section taylor: two figures.
//   discretization-stencil  four difference formulas as slopes through one
//                           point, with their errors at h and h/2;
//   discretization-weights  build any stencil from Taylor moments and check
//                           its order on sin x.
// Numbers: verification.js (TEST_FUNCTIONS, fdDerivative) and
// ch-discretization-stencil.js (stencilWeights, applyStencil).

import { h, fmt } from '../../kit/dom.js';
import { frame, slider, select, segmented, toggle, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { tex } from '../../kit/math.js';
import { TEST_FUNCTIONS, fdDerivative } from '../../sims/verification.js';
import { stencilWeights, applyStencil, ratTex } from '../../sims/ch-discretization-stencil.js';
import { clampLog, sci2, figTable, swatchLabel, preset } from './common.js';

// ---------------------------------------------------------------------------
// discretization-stencil

const FNS = {
  'squire-trapp': { label: 'eˣ / √(sin³x + cos³x)', x0: [0.2, 1.5], window: 0.75 },
  exp: { label: 'eˣ', x0: [-1.5, 1.5], window: 1 },
  sin: { label: 'sin x', x0: [-2, 2], window: 1.1 },
};
const FORMULAS = [
  { id: 'forward', name: 'Forward', color: 's1', dash: null },
  { id: 'backward', name: 'Backward', color: 's2', dash: [7, 4] },
  { id: 'central', name: 'Central', color: 's3', dash: [2, 4] },
  { id: 'central4', name: 'Fourth order', color: 's4', dash: [11, 4, 2, 4] },
];
const STENCIL_PRESETS = {
  default: { fn: 'squire-trapp', x0: 1.5, h: 0.1 },
  sin0: { fn: 'sin', x0: 0, h: 0.2 },
  exp: { fn: 'exp', x0: 1, h: 0.1 },
};

export function mountStencil(fig) {
  const P = preset(fig, STENCIL_PRESETS);
  const f = frame(fig, { title: 'Four ways to estimate a slope' });
  const plot = new Plot(f.stage, { x: { label: 'x' }, y: { label: 'f(x)' }, aspect: 1.7, label: 'The function near x₀, its tangent, and the slope each difference formula estimates' });
  const tbl = figTable(['Formula', ['error at h', 'num'], ['error at h/2', 'num'], ['ratio', 'num'], ['order', 'num']], FORMULAS.map((F) => F.id), { label: 'Errors of each formula at h and h/2' });
  for (const F of FORMULAS) tbl.cell(F.id, 0).append(swatchLabel(F.color, F.name, !!F.dash));
  f.stage.append(tbl.el);

  const NC = 241;
  const cx = new Float64Array(NC);
  const cy = new Float64Array(NC);
  const lines = FORMULAS.map(() => ({ x: new Float64Array(2), y: new Float64Array(2) }));
  const tan = { x: new Float64Array(2), y: new Float64Array(2) };
  const sx = new Float64Array(5);
  const sy = new Float64Array(5);

  const fnSel = select(f.controls, {
    label: 'Function',
    options: Object.entries(FNS).map(([k, v]) => [k, v.label]),
    value: P.fn,
    onChange: () => {
      const [a, b] = FNS[fnSel.value].x0;
      x0s.input.min = a;
      x0s.input.max = b;
      x0s.set(Math.min(b, Math.max(a, x0s.value)), { silent: true });
      draw();
    },
  });
  const x0s = slider(f.controls, { label: 'point x₀', min: FNS[P.fn].x0[0], max: FNS[P.fn].x0[1], step: 0.01, value: P.x0, fmt: (v) => v.toFixed(2), onInput: () => draw() });
  const hs = slider(f.controls, { label: 'step h', min: 1e-3, max: 0.4, log: true, value: P.h, fmt: (v) => fmt(v, 2), onInput: () => draw() });
  const exactR = readout(f.readouts, { label: 'exact f′(x₀)' });
  const tanR = readout(f.readouts, { label: 'best at this h' });

  function draw() {
    const fn = fnSel.value;
    const T = TEST_FUNCTIONS[fn];
    const x0 = x0s.value;
    const hh = hs.value;
    const W = FNS[fn].window;
    let a = x0 - W;
    let b = x0 + W;
    if (T.domain) {
      a = Math.max(a, T.domain[0] + 0.12);
      b = Math.min(b, T.domain[1] - 0.12);
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < NC; k++) {
      cx[k] = a + ((b - a) * k) / (NC - 1);
      cy[k] = T.f(cx[k]);
      lo = Math.min(lo, cy[k]);
      hi = Math.max(hi, cy[k]);
    }
    const pad = 0.12 * (hi - lo || 1);
    plot.setAxes({ x: { min: a, max: b }, y: { min: lo - pad, max: hi + pad } });
    const f0 = T.f(x0);
    const exact = T.df(x0);
    tan.x[0] = a;
    tan.x[1] = b;
    tan.y[0] = f0 + exact * (a - x0);
    tan.y[1] = f0 + exact * (b - x0);
    const orders = [];
    let best = null;
    FORMULAS.forEach((F, i) => {
      const d1 = fdDerivative(F.id, x0, hh, { fn });
      const d2 = fdDerivative(F.id, x0, hh / 2, { fn });
      const e1 = d1 - exact;
      const e2 = d2 - exact;
      lines[i].x[0] = a;
      lines[i].x[1] = b;
      lines[i].y[0] = f0 + d1 * (a - x0);
      lines[i].y[1] = f0 + d1 * (b - x0);
      const ratio = Math.abs(e1 / e2);
      const p = Math.log2(ratio);
      orders.push(p);
      tbl.set(F.id, 1, sci2(e1));
      tbl.set(F.id, 2, sci2(e2));
      tbl.set(F.id, 3, Number.isFinite(ratio) ? ratio.toFixed(1) : '–');
      tbl.set(F.id, 4, Number.isFinite(p) ? p.toFixed(2) : '–');
      if (!best || Math.abs(e1) < best.e) best = { e: Math.abs(e1), name: F.name };
    });
    // stencil sample points of the fourth-order formula (it uses all four neighbours)
    [-2, -1, 0, 1, 2].forEach((s, k) => {
      sx[k] = x0 + s * hh;
      sy[k] = T.f(sx[k]);
    });
    plot.draw([
      { x: cx, y: cy, color: 'ink', width: 2.5, label: 'f(x)' },
      { x: tan.x, y: tan.y, color: 'muted', width: 1.5, dash: [3, 3], label: 'exact tangent', hover: false },
      ...FORMULAS.map((F, i) => ({ x: lines[i].x, y: lines[i].y, color: F.color, width: 2, dash: F.dash, label: F.name, hover: false })),
      { x: sx, y: sy, color: 'accent', width: 0, points: 4.5, label: 'samples x₀ + kh', hover: false },
    ]);
    exactR.set(fmt(exact, 6));
    tanR.set(best.name);
    const [pf, , pc, p4] = orders;
    let msg = `Halve h: forward error ÷ ${(2 ** pf).toFixed(1)}, central ÷ ${(2 ** pc).toFixed(1)}, fourth order ÷ ${(2 ** p4).toFixed(1)}.`;
    if (Math.abs(p4 - 4) > 0.4 && hh < 0.01) msg = `The fourth-order error is now so small that round-off spoils its ratio (measured order ${p4.toFixed(1)}): see the next section. ${msg}`;
    else if (pf > 1.6) msg = `The forward difference looks second order here: f″(x₀) = 0, so its h/2 · f″ term vanishes. ${msg}`;
    else if (hh > 0.25) msg = `h is large: the higher-order formulas are not yet in their asymptotic range. ${msg}`;
    f.status.textContent = msg;
  }
  draw();
}

// ---------------------------------------------------------------------------
// discretization-weights

const OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
const WEIGHT_PRESETS = {
  default: { offs: [-1, 0, 1], m: 1 },
  'one-sided': { offs: [0, 1, 2], m: 1 },
  five: { offs: [-2, -1, 0, 1, 2], m: 1 },
  second: { offs: [-1, 0, 1], m: 2 },
};
const XCHK = 0.7;
const dsin = (k, x) => [Math.sin, Math.cos, (t) => -Math.sin(t), (t) => -Math.cos(t)][k % 4](x);
const primes = (m) => (m <= 3 ? `f${"'".repeat(m)}` : `f^{(${m})}`);
const offTex = (s) => (s === 0 ? 'f_{j}' : s > 0 ? `f_{j+${s}}` : `f_{j-${-s}}`);

export function mountWeights(fig) {
  const P = preset(fig, WEIGHT_PRESETS);
  const f = frame(fig, { title: 'Build a stencil from Taylor series' });
  const formula = h('div', { style: { overflowX: 'auto', minHeight: '3.2em' }, 'aria-live': 'polite' });
  f.stage.append(formula);
  const plot = new Plot(f.stage, { x: { label: 'step h', log: true, min: 1e-6, max: 1 }, y: { label: '|error| on sin x at x = 0.7', log: true }, aspect: 2, label: 'Measured error of the stencil against h, beside its predicted leading term' });

  const NH = 73;
  const hx = new Float64Array(NH);
  const ey = new Float64Array(NH);
  const py = new Float64Array(NH);
  for (let k = 0; k < NH; k++) hx[k] = 10 ** (-6 + (6 * k) / (NH - 1));

  const chipRow = h('div.ctl', { role: 'group', 'aria-label': 'Stencil points' }, h('span.ctl-label', 'points x_j + kh, k ='));
  const chips = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px 10px' } });
  chipRow.append(chips);
  f.controls.append(chipRow);
  const tg = OFFSETS.map((s) => toggle(chips, { label: s > 0 ? `+${s}` : s < 0 ? `−${-s}` : '0', checked: P.offs.includes(s), onChange: () => draw() }));
  const mSeg = segmented(f.controls, { label: 'Derivative', options: [[1, 'f′'], [2, 'f″'], [3, 'f‴']], value: P.m, onChange: () => draw() });
  const nR = readout(f.readouts, { label: 'points used' });
  const pR = readout(f.readouts, { label: 'order of accuracy' });
  const cR = readout(f.readouts, { label: 'leading error' });
  const sR = readout(f.readouts, { label: 'measured slope' });

  function draw() {
    const offs = OFFSETS.filter((s, i) => tg[i].value);
    const m = Number(mSeg.value);
    const st = stencilWeights(offs, m);
    nR.set(String(offs.length));
    if (!st) {
      formula.innerHTML = '';
      pR.set('–');
      cR.set('–');
      sR.set('–');
      plot.draw([]);
      f.status.textContent = `A derivative of order ${m} needs at least ${m + 1} points. Switch on more of them.`;
      return;
    }
    const terms = [];
    st.offsets.forEach((s, j) => {
      const w = st.weights[j];
      if (w.n === 0) return;
      const coef = ratTex({ n: Math.abs(w.n), d: w.d });
      const sign = w.n < 0 ? '-' : terms.length ? '+' : '';
      terms.push(`${sign} ${coef === '1' ? '' : coef + '\\,'}${offTex(s)}`);
    });
    const hpow = m === 1 ? 'h' : `h^{${m}}`;
    const C = st.errorCoef;
    const csign = C.n < 0 ? '-' : '+';
    const cabs = ratTex({ n: Math.abs(C.n), d: C.d });
    const src = `${primes(m)}(x_j) = \\frac{1}{${hpow}}\\left(${terms.join(' ')}\\right) ${csign} ${cabs === '1' ? '' : cabs + '\\,'}h^{${st.order}}\\,${primes(st.errorPower)}(x_j) + \\dots`;
    try {
      formula.innerHTML = tex(src, { display: true });
    } catch (err) {
      formula.textContent = src;
    }
    const fk = dsin(st.errorPower, XCHK);
    const exact = dsin(m, XCHK);
    for (let k = 0; k < NH; k++) {
      ey[k] = clampLog(applyStencil(st, Math.sin, XCHK, hx[k]) - exact);
      py[k] = clampLog(C.value * hx[k] ** st.order * fk);
    }
    const e1 = Math.abs(applyStencil(st, Math.sin, XCHK, 0.1) - exact);
    const e2 = Math.abs(applyStencil(st, Math.sin, XCHK, 0.05) - exact);
    const slope = Math.log2(e1 / e2);
    pR.set(`${st.order}`);
    cR.set(`${C.n < 0 ? '−' : ''}${Math.abs(C.n)}${C.d === 1 ? '' : '/' + C.d} · h${st.order === 1 ? '' : superscriptDigits(st.order)}`);
    sR.set(Number.isFinite(slope) ? slope.toFixed(2) : '–', Math.abs(slope - st.order) < 0.15 ? 'good' : '');
    plot.draw([
      { x: hx, y: ey, color: 's1', width: 2.5, label: 'measured error' },
      { x: hx, y: py, color: 'ink', width: 1.5, dash: [5, 4], label: `predicted ${fmt(Math.abs(C.value), 3)} h${superscriptDigits(st.order)} |f⁽${superscriptDigits(st.errorPower)}⁾|` },
    ]);
    const sym = st.offsets.every((s) => st.offsets.includes(-s));
    const free = st.order > st.offsets.length - m;
    let msg = `${st.offsets.length} points for derivative ${m}: order ${st.order}. On the plot the measured error follows the slope-${st.order} prediction until round-off takes over at small h.`;
    if (sym && free) msg = `Symmetric stencil: the first error moment cancels by symmetry, so you get order ${st.order}, one more than ${st.offsets.length} points usually buy for derivative ${m}.`;
    else if (!st.offsets.includes(-1) || !st.offsets.includes(1)) msg = `One-sided stencil (useful at a boundary): order ${st.order}, with a larger error constant than a centred one.`;
    f.status.textContent = msg;
  }
  draw();
}

const SUPD = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const superscriptDigits = (n) => String(n).replace(/\d/g, (c) => SUPD[c]);
