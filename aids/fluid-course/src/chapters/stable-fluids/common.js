// Helpers shared by the stable-fluids chapter's widgets: presets, number
// formatting, a colour-scale legend, and a dye painter that mixes up to
// three dye channels into one picture. Nothing here allocates per frame.

import { h } from '../../kit/dom.js';
import { gradientCss, palette } from '../../kit/palette.js';

// The author's preset for a figure, merged over the widget's defaults.
export function presetFor(fig, presets) {
  const key = fig.dataset.preset;
  return { ...presets.default, ...(key && presets[key] ? presets[key] : {}) };
}

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).replace(/[-0-9]/g, (c) => SUP[c]);

// `digits` significant figures, a true minus sign, × 10ⁿ for extremes.
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

// Signed percentage with two decimals: +0.27 %, −4.68 %.
export function pct(v) {
  if (!Number.isFinite(v)) return '–';
  const s = Math.abs(v * 100).toFixed(2);
  return (v < 0 ? '−' : '+') + s + ' %';
}

// A colour-scale legend row. set(lo, mid, hi) changes the labels.
export function legend(parent, kind, labels = ['', '', '']) {
  const bar = h('div.legend-bar');
  const spans = labels.map((t) => h('span', t));
  const el = h('div.legend-row', { 'aria-hidden': 'true' }, bar, h('div.legend-labels', ...spans));
  parent.append(el);
  const api = {
    el,
    kind,
    set(...t) {
      for (let k = 0; k < spans.length; k++) if (t[k] != null && spans[k].textContent !== t[k]) spans[k].textContent = t[k];
    },
    setKind(k) {
      api.kind = k;
      bar.style.background = gradientCss(k);
    },
    refresh() {
      bar.style.background = gradientCss(api.kind);
    },
  };
  api.refresh();
  return api;
}

const DYE_TOKENS = ['s1', 's2', 's3'];

// Paint dye channels into a FieldView: each channel tints the board colour
// towards its own series colour (one channel: the 'dye' token). Solid cells
// take the 'solid' token. Values are clamped to [0, 1] for display only.
export function paintDye(view, dyes, solid) {
  const pal = palette();
  const { nx, ny } = view;
  const data = view.img.data;
  const bg = pal.rgb.board;
  const sc = pal.rgb.solid;
  const nch = dyes.length;
  const c0 = nch === 1 ? pal.rgb.dye : pal.rgb[DYE_TOKENS[0]];
  const c1 = nch > 1 ? pal.rgb[DYE_TOKENS[1]] : bg;
  const c2 = nch > 2 ? pal.rgb[DYE_TOKENS[2]] : bg;
  const q0 = dyes[0];
  const q1 = nch > 1 ? dyes[1] : null;
  const q2 = nch > 2 ? dyes[2] : null;
  for (let j = 0; j < ny; j++) {
    const row = ny - 1 - j;
    for (let i = 0; i < nx; i++) {
      const k = i + j * nx;
      const o = (i + row * nx) * 4;
      if (solid && solid[k]) {
        data[o] = sc[0];
        data[o + 1] = sc[1];
        data[o + 2] = sc[2];
        data[o + 3] = 255;
        continue;
      }
      let a = q0[k];
      a = a > 0 ? (a < 1 ? a : 1) : 0;
      let r = bg[0] + a * (c0[0] - bg[0]);
      let g = bg[1] + a * (c0[1] - bg[1]);
      let b = bg[2] + a * (c0[2] - bg[2]);
      if (q1) {
        let w = q1[k];
        w = w > 0 ? (w < 1 ? w : 1) : 0;
        r += w * (c1[0] - bg[0]);
        g += w * (c1[1] - bg[1]);
        b += w * (c1[2] - bg[2]);
      }
      if (q2) {
        let w = q2[k];
        w = w > 0 ? (w < 1 ? w : 1) : 0;
        r += w * (c2[0] - bg[0]);
        g += w * (c2[1] - bg[1]);
        b += w * (c2[2] - bg[2]);
      }
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
    }
  }
  view.octx.putImageData(view.img, 0, 0);
  view.blit();
}

// Largest |a_k| (skipping masked cells).
export function maxAbs(a, mask = null) {
  let m = 0;
  for (let k = 0; k < a.length; k++) {
    if (mask && mask[k]) continue;
    const v = Math.abs(a[k]);
    if (!(v <= m)) m = Number.isNaN(v) ? Infinity : v;
  }
  return m;
}

// Mean over unmasked cells.
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

// Prefers-reduced-motion, for widgets that should not start on their own.
export const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
