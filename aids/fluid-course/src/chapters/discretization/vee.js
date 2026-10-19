// Chapter 6, section round-off: two figures.
//   discretization-v       relative error of five derivative formulas against
//                          the step h, in double or single precision: the V
//                          of truncation against round-off, and the complex
//                          step that has no V;
//   discretization-cancel  catastrophic cancellation in five formulas, naive
//                          against rearranged.
// Numbers: verification.js (derivativeSweep, fdDerivative, CANCELLATION,
// cancellationSweep) and ch-discretization-precision.js (the float32 sweep).

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, segmented, toggle, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { tex } from '../../kit/math.js';
import { derivativeSweep, fdDerivative, TEST_FUNCTIONS, CANCELLATION, cancellationSweep } from '../../sims/verification.js';
import { derivativeSweep32, fdDerivative32, EPS32 } from '../../sims/ch-discretization-precision.js';
import { clampLog, digits, sci2, markers, vrule, hrule, preset } from './common.js';

const EPS64 = Number.EPSILON;
const FLOOR = 1e-17;
const SCHEMES = [
  { id: 'forward', name: 'forward', color: 's1', dash: null },
  { id: 'central', name: 'central', color: 's2', dash: [8, 4] },
  { id: 'central4', name: 'fourth order', color: 's3', dash: [2, 4] },
  { id: 'complex', name: 'complex step', color: 's4', dash: [12, 4, 3, 4] },
];
const V_PRESETS = {
  default: { prec: 'f64', fn: 'squire-trapp', h: 1e-3, model: false },
  single: { prec: 'f32', fn: 'squire-trapp', h: 1e-3, model: false },
  floor: { prec: 'f64', fn: 'squire-trapp', h: 1e-12, model: false },
  model: { prec: 'f64', fn: 'squire-trapp', h: 1e-6, model: true },
};
const FN_LABELS = [
  ['squire-trapp', 'eˣ / √(sin³x + cos³x) at 1.5'],
  ['exp', 'eˣ at 1'],
  ['sin', 'sin x at 1'],
];

// Build the plotted arrays for one (precision, function) pair: relative
// errors on the sweep grid, clipped to h >= 1e-16 for the complex step.
function compute(prec, fn) {
  const sw = prec === 'f32' ? derivativeSweep32({ fn }) : derivativeSweep({ fn });
  const ex = Math.abs(sw.exact);
  const out = { sw, ex, rel: {}, model: {}, best: {} };
  for (const S of SCHEMES) {
    if (S.id === 'complex') {
      let n = 0;
      while (n < sw.complex.h.length && sw.complex.h[n] >= 1e-16 * 0.999) n++;
      out.rel.complex = { x: sw.complex.h.subarray(0, n), y: Float64Array.from(sw.complex.err.subarray(0, n), (e) => clampLog(e / ex, FLOOR)) };
      out.model.complex = { x: sw.complex.h.subarray(0, n), y: Float64Array.from(sw.complex.model.subarray(0, n), (e) => clampLog(e / ex, FLOOR)) };
      let worst = 0;
      for (let k = 0; k < sw.complex.h.length; k++) if (sw.complex.h[k] <= 1e-8) worst = Math.max(worst, sw.complex.err[k] / ex);
      out.complexWorst = worst;
      out.complexTiny = sw.complex.err.at(-1) / ex;
      out.complexTinyH = sw.complex.h.at(-1);
      continue;
    }
    const s = sw.schemes[S.id];
    out.rel[S.id] = { x: sw.h, y: Float64Array.from(s.err, (e) => clampLog(e / ex, FLOOR)) };
    out.model[S.id] = { x: sw.h, y: Float64Array.from(s.model, (e) => clampLog(e / ex, FLOOR)) };
    out.best[S.id] = { h: s.hMin, rel: s.errMin / ex, fit: s.fitOk };
  }
  return out;
}

export function mountV(fig) {
  const P = preset(fig, V_PRESETS);
  const f = frame(fig, { title: 'The V: truncation against round-off', wide: true });
  const plot = new Plot(f.stage, {
    x: { label: 'step h', log: true, min: 1e-16, max: 0.1, fmt: (v) => sci(v, 2) },
    y: { label: 'relative error', log: true, min: FLOOR, max: 10, fmt: (v) => sci(v, 2) },
    aspect: 1.8,
    label: 'Relative error of four derivative formulas against the step h on log–log axes',
  });
  const precSeg = segmented(f.controls, { label: 'Arithmetic', options: [['f64', 'double (64-bit)'], ['f32', 'single (32-bit)']], value: P.prec, onChange: () => recompute() });
  const fnSel = select(f.controls, { label: 'Function', options: FN_LABELS, value: P.fn, onChange: () => recompute() });
  const hS = slider(f.controls, { label: 'step h', min: 1e-16, max: 0.1, log: true, value: P.h, fmt: (v) => sci(v, 2), onInput: () => draw() });
  const modelT = toggle(f.controls, { label: 'worst-case model', checked: P.model, onChange: () => draw() });
  const atR = SCHEMES.map((S) => readout(f.readouts, { label: `${S.name} at h` }));
  const bestR = SCHEMES.slice(0, 3).map((S) => readout(f.readouts, { label: `best ${S.name}` }));
  const csR = readout(f.readouts, { label: 'complex step, tiny h' });

  let D = null;
  function recompute() {
    D = compute(precSeg.value, fnSel.value);
    draw();
  }

  function draw() {
    const prec = precSeg.value;
    const fn = fnSel.value;
    const eps = prec === 'f32' ? EPS32 : EPS64;
    const hh = hS.value;
    const series = [];
    if (modelT.value) for (const S of SCHEMES) series.push({ ...D.model[S.id], color: S.color, width: 1.2, alpha: 0.55, dash: [1, 3], label: `${S.name} model`, legend: false, hover: false });
    for (const S of SCHEMES) series.push({ ...D.rel[S.id], color: S.color, width: 2.2, dash: S.dash, label: S.name });
    const marks = SCHEMES.slice(0, 3).map((S) => ({ x: D.best[S.id].h, y: D.best[S.id].rel, color: S.color }));
    plot.draw(series, {
      extra(ctx, tx, ty, area, pal) {
        hrule(ctx, ty, area, pal, eps, prec === 'f32' ? 'ε (single) = 1.2 × 10⁻⁷' : 'ε (double) = 2.2 × 10⁻¹⁶');
        markers(ctx, tx, ty, marks, pal);
        vrule(ctx, tx, area, pal, hh, `h = ${sci(hh, 2)}`);
      },
    });
    const T = TEST_FUNCTIONS[fn];
    const x0 = T.x0;
    const ex = D.ex;
    const rels = SCHEMES.map((S) => {
      const v = prec === 'f32' ? fdDerivative32(S.id, x0, hh, fn) : fdDerivative(S.id, x0, hh, { fn });
      return Math.abs(v - D.sw.exact) / ex;
    });
    SCHEMES.forEach((S, i) => atR[i].set(rels[i] === 0 ? '0 (exact)' : `${sci2(rels[i])} · ${digits(rels[i]).toFixed(1)} digits`));
    SCHEMES.slice(0, 3).forEach((S, i) => {
      const b = D.best[S.id];
      bestR[i].set(`${digits(b.rel).toFixed(1)} digits at h ≈ ${sci(b.h, 1)}`);
    });
    csR.set(`${D.complexTiny === 0 ? '0' : sci2(D.complexTiny)} at h = ${sci(D.complexTinyH, 1)}`, 'good');
    // narration for the central difference
    const hb = D.best.central.h;
    const prc = prec === 'f32' ? 'single' : 'double';
    let msg;
    if (prec === 'f32' && Math.fround(Math.fround(x0) + Math.fround(hh)) === Math.fround(x0)) msg = `In single precision x₀ + h rounds back to x₀ below about 6 × 10⁻⁸: the step has vanished, every difference formula returns 0, and only the complex step still works.`;
    else if (prec === 'f64' && x0 + hh === x0) msg = `x₀ + h == x₀ in double precision: the step has vanished and every difference formula returns 0. Only the complex step still works.`;
    else if (hh > 3 * hb) msg = `Truncation dominates the central difference here (error ∝ h²): shrinking h helps. Its best is near h ≈ ${sci(hb, 1)} in ${prc} precision.`;
    else if (hh < hb / 3) msg = `Round-off dominates the central difference here (error ∝ 1/h): shrinking h makes it worse. The complex step has no subtraction, so it does not care.`;
    else msg = `Near the bottom of the central difference's V: truncation and round-off are about equal, and you get about ${digits(D.best.central.rel).toFixed(0)} digits.`;
    f.status.textContent = msg;
  }
  recompute();
}

// ---------------------------------------------------------------------------
// discretization-cancel

const C_PRESETS = {
  default: { id: 'one-minus-cos', x: 1e-6 },
  quadratic: { id: 'quadratic', x: 1e6 },
  gauge: { id: 'gauge-pressure', x: 1e-4 },
  expm1: { id: 'expm1', x: 1e-10 },
};

export function mountCancel(fig) {
  const P = preset(fig, C_PRESETS);
  const f = frame(fig, { title: 'Catastrophic cancellation' });
  const forms = h('div', { style: { display: 'grid', gap: '4px', overflowX: 'auto' } });
  f.stage.append(forms);
  const plot = new Plot(f.stage, {
    x: { label: 'x', log: true, fmt: (v) => sci(v, 2) },
    y: { label: 'relative error', log: true, min: FLOOR, max: 10, fmt: (v) => sci(v, 2) },
    aspect: 2,
    label: 'Relative error of the naive and the rearranged formula against x',
  });
  const note = h('p', { style: { margin: 0, fontSize: '0.88rem', color: 'var(--muted)' } });
  f.stage.append(note);
  const sel = select(f.controls, { label: 'Example', options: Object.values(CANCELLATION).map((E) => [E.id, E.name]), value: P.id, onChange: () => recompute(true) });
  const xS = slider(f.controls, { label: 'x', min: 1e-10, max: 0.1, log: true, value: P.x, fmt: (v) => sci(v, 2), onInput: () => draw() });
  const nvR = readout(f.readouts, { label: 'naive value' });
  const svR = readout(f.readouts, { label: 'rearranged value' });
  const ndR = readout(f.readouts, { label: 'naive: correct digits' });
  const sdR = readout(f.readouts, { label: 'rearranged: correct digits' });

  let S = null;
  let yN = null;
  let yS = null;
  function recompute(resetX) {
    const E = CANCELLATION[sel.value];
    S = cancellationSweep(E.id, { n: 181 });
    yN = Float64Array.from(S.relErrNaive, (v) => clampLog(v, FLOOR));
    yS = Float64Array.from(S.relErrStable, (v) => clampLog(v, FLOOR));
    xS.input.min = Math.log10(E.xMin);
    xS.input.max = Math.log10(E.xMax);
    if (resetX) xS.set(Math.sqrt(E.xMin * E.xMax), { silent: true });
    else xS.set(Math.min(E.xMax, Math.max(E.xMin, xS.value)), { silent: true });
    plot.setAxes({ x: { min: E.xMin, max: E.xMax } });
    let html = '';
    try {
      html = `<div>naive: ${tex(E.tex)}</div><div>rearranged: ${tex(E.texStable)}</div>`;
    } catch (err) {
      html = `<div>naive: ${E.tex}</div><div>rearranged: ${E.texStable}</div>`;
    }
    forms.innerHTML = html;
    note.textContent = E.note;
    draw();
  }

  function draw() {
    const E = CANCELLATION[sel.value];
    const x = xS.value;
    const nv = E.naive(x);
    const sv = E.stable(x);
    const ref = E.reference ? E.reference(x) : sv;
    const rn = Math.abs(nv - ref) / Math.abs(ref);
    const rs = Math.abs(sv - ref) / Math.abs(ref);
    const total = E.id === 'gauge-pressure' ? 7.2 : 15.9;
    plot.draw(
      [
        { x: S.x, y: yN, color: 's2', width: 2.2, label: 'naive' },
        { x: S.x, y: yS, color: 's1', width: 2.2, dash: [7, 4], label: 'rearranged' },
      ],
      {
        extra(ctx, tx, ty, area, pal) {
          hrule(ctx, ty, area, pal, E.id === 'gauge-pressure' ? 2 ** -24 : 2 ** -53, E.id === 'gauge-pressure' ? 'unit round-off (single)' : 'unit round-off (double)');
          vrule(ctx, tx, area, pal, x, `x = ${sci(x, 2)}`);
        },
      },
    );
    nvR.set(fmt(nv, 8));
    svR.set(fmt(sv, 8));
    const dn = Math.min(total, digits(rn));
    const ds = Math.min(total, digits(rs));
    ndR.set(`${dn.toFixed(1)} of ${total.toFixed(0)}`, dn < 3 ? 'bad' : '');
    sdR.set(`${ds.toFixed(1)} of ${total.toFixed(0)}`, ds > total - 1.5 ? 'good' : '');
    f.status.textContent = nv === 0 && ref !== 0 ? `The naive formula returns exactly 0 here: every significant digit cancelled.` : `The naive formula keeps ${dn.toFixed(0)} correct digits here; the rearranged one keeps ${ds.toFixed(0)}.`;
  }
  recompute(false);
}
