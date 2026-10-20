// Small helpers shared by the pressure chapter's widgets: presets, number
// formatting, a colour-scale legend, MAC-field drawing (heat map plus face
// arrows) and norms. No allocation in the per-frame helpers.

import { h } from '../../kit/dom.js';
import { gradientCss } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';

// The author's preset for a figure, merged over the widget's defaults.
export function presetFor(fig, presets) {
  const key = fig.dataset.preset;
  return { ...presets.default, ...(key && presets[key] ? presets[key] : {}) };
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/[-0-9]/g, (c) => SUP[c]);

// Readable numbers: `digits` significant figures, the course's minus sign,
// and a × 10ⁿ form for very small or large values.
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

// A colour-scale legend row under a field. Returns { el, set(lo, mid, hi) }
// and repaints its bar on theme changes via refresh().
export function legend(parent, kind, labels = ['', '', '']) {
  const bar = h('div.legend-bar');
  const spans = labels.map((t) => h('span', t));
  const el = h('div.legend-row', { 'aria-hidden': 'true' }, bar, h('div.legend-labels', ...spans));
  parent.append(el);
  const api = {
    el,
    set(...t) {
      for (let k = 0; k < spans.length; k++) if (t[k] != null && spans[k].textContent !== t[k]) spans[k].textContent = t[k];
    },
    refresh() {
      bar.style.background = gradientCss(kind);
    },
  };
  api.refresh();
  return api;
}

// Largest |a_k| over the first len entries, skipping masked cells.
export function maxAbs(a, len = a.length, mask = null) {
  let m = 0;
  for (let k = 0; k < len; k++) {
    if (mask && mask[k]) continue;
    const v = Math.abs(a[k]);
    if (!(v <= m)) m = Number.isNaN(v) ? Infinity : v;
  }
  return m;
}

// Mean of a over the cells where mask is 0 (or all cells).
export function meanOf(a, mask = null) {
  let s = 0;
  let n = 0;
  for (let k = 0; k < a.length; k++) {
    if (mask && mask[k]) continue;
    s += a[k];
    n++;
  }
  return n ? s / n : 0;
}

// Arrows for a MAC velocity at cell centres, every `stride` cells. The face
// values are averaged to the centre (as grid2d.facesToCentres does) inline so
// nothing is allocated. scale: grid cells of arrow per unit velocity.
export function macArrows(ctx, X, Y, g, u, v, { stride = 3, scale = 1, color = 'ink', alpha = 0.8, pal, maxLen = 1.3, minPx = 1.5 } = {}) {
  const { nx, ny, solid } = g;
  const su = nx + 1;
  ctx.strokeStyle = pal.css(color, alpha);
  ctx.fillStyle = pal.css(color, alpha);
  ctx.lineWidth = 1.2;
  const cell = Math.abs(X(1) - X(0));
  const off = stride >> 1;
  for (let j = off; j < ny; j += stride) {
    for (let i = off; i < nx; i += stride) {
      const c = i + j * nx;
      if (solid && solid[c]) continue;
      let ax = 0.5 * (u[i + j * su] + u[i + 1 + j * su]) * scale;
      let ay = 0.5 * (v[c] + v[c + nx]) * scale;
      const len = Math.hypot(ax, ay);
      const cap = maxLen * stride;
      if (len > cap) {
        ax *= cap / len;
        ay *= cap / len;
      }
      if (Math.min(len, cap) * cell < minPx) continue;
      arrow(ctx, X(i + 0.5), Y(j + 0.5), X(i + 0.5 + ax), Y(j + 0.5 + ay), Math.min(5, 0.45 * cell * stride));
    }
  }
}

// Largest centre speed of a MAC field (face averages), for arrow scaling.
export function maxCentreSpeed(g, u, v) {
  const { nx, ny, solid } = g;
  const su = nx + 1;
  let m = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (solid && solid[c]) continue;
      const a = 0.5 * (u[i + j * su] + u[i + 1 + j * su]);
      const b = 0.5 * (v[c] + v[c + nx]);
      const s = a * a + b * b;
      if (s > m) m = s;
    }
  }
  return Math.sqrt(m);
}

// Let the page scroll over a field that is not draggable (vertical pans
// only; FieldView.onDrag is what turns scrolling off on a canvas).
export function allowScroll(view) {
  view.box.canvas.style.touchAction = 'pan-y';
  view.box.canvas.style.cursor = 'default';
}

// Format a pair "before → after".
export const arrowPair = (a, b) => `${a} → ${b}`;
