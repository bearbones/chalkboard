// Small helpers shared by the stiffness chapter's widgets. No allocation in
// the per-frame helpers.

// Total variation sum |u_{j+1} - u_j| over the first len entries.
export function totalVariationOf(u, len = u.length) {
  let s = 0;
  for (let j = 1; j < len; j++) s += Math.abs(u[j] - u[j - 1]);
  return s;
}

// Largest |a_j - b_j| over the first len entries (NaN-safe: a NaN gives Infinity).
export function maxDiff(a, b, len = a.length) {
  let e = 0;
  for (let j = 0; j < len; j++) {
    const d = Math.abs(a[j] - b[j]);
    if (!(d <= e)) e = Number.isNaN(d) ? Infinity : d;
  }
  return e;
}

// Largest |a_j| over the first len entries.
export function maxAbsOf(a, len = a.length) {
  let m = 0;
  for (let j = 0; j < len; j++) {
    const v = Math.abs(a[j]);
    if (!(v <= m)) m = Number.isNaN(v) ? Infinity : v;
  }
  return m;
}

// The author's preset for a figure, merged over the widget's defaults.
export function presetFor(fig, presets) {
  const key = fig.dataset.preset;
  return { ...presets.default, ...(key && presets[key] ? presets[key] : {}) };
}

// Readable numbers for readouts and narration: 3 significant figures, with
// the course's minus sign.
export function num(v, digits = 3) {
  if (v == null || Number.isNaN(v)) return '–';
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞';
  if (v === 0) return '0';
  const a = Math.abs(v);
  let s;
  if (a >= 1e5 || a < 1e-3) {
    const e = Math.floor(Math.log10(a));
    const m = Number((a / 10 ** e).toFixed(digits - 1));
    s = `${m} × 10${sup(e)}`;
  } else s = String(Number(a.toPrecision(digits)));
  return (v < 0 ? '−' : '') + s;
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/[-0-9]/g, (c) => SUP[c]);
