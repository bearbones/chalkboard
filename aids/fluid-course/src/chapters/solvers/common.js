// Small helpers shared by the solvers chapter's widgets: presets, number
// formatting, a colour-scale legend, canvas labels, a log–log slope fit and
// a cancellable sliced computation. No allocation in the per-frame helpers.

import { h } from '../../kit/dom.js';
import { gradientCss } from '../../kit/palette.js';

export const FONT = '11px "Atkinson Hyperlegible", system-ui, sans-serif';

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
    let e = Math.floor(Math.log10(a));
    let m = Number((a / 10 ** e).toFixed(digits - 1));
    if (m >= 10) {
      m /= 10;
      e += 1;
    }
    s = `${m} × 10${sup(e)}`;
  } else s = String(Number(a.toPrecision(digits)));
  return (v < 0 ? '−' : '') + s;
}

// Whole numbers with a thin space every three digits (12 345).
export const count = (v) => (Number.isFinite(v) ? String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '–');

// A colour-scale legend row under a field: { el, set(...labels), refresh() }.
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

// Let the page scroll over a field that is not draggable.
export function allowScroll(view) {
  view.box.canvas.style.touchAction = 'pan-y';
  view.box.canvas.style.cursor = 'default';
}

// Least-squares slope of log y against log x over the finite, positive pairs.
export function logSlope(xs, ys, len = xs.length) {
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let k = 0; k < len; k++) {
    const x = xs[k];
    const y = ys[k];
    if (!(x > 0 && y > 0 && Number.isFinite(y))) continue;
    const lx = Math.log(x);
    const ly = Math.log(y);
    n++;
    sx += lx;
    sy += ly;
    sxx += lx * lx;
    sxy += lx * ly;
  }
  if (n < 2) return NaN;
  return (n * sxy - sx * sy) / (n * sxx - sx * sx);
}

// Text label on a canvas, in a token colour.
export function label(ctx, pal, text, x, y, { color = 'muted', align = 'left', base = 'alphabetic', alpha = 1 } = {}) {
  ctx.font = FONT;
  ctx.fillStyle = pal.css(color, alpha);
  ctx.textAlign = align;
  ctx.textBaseline = base;
  ctx.fillText(text, x, y);
}

// A horizontal reference line across a plot area at data value v.
export function hline(ctx, ty, area, pal, v, { color = 'muted', alpha = 0.8, dash = [3, 3], text = '', side = 'right' } = {}) {
  const y = ty(v);
  if (!(y >= area.y0 && y <= area.y1)) return;
  ctx.strokeStyle = pal.css(color, alpha);
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(area.x0, y);
  ctx.lineTo(area.x1, y);
  ctx.stroke();
  ctx.setLineDash([]);
  if (text) label(ctx, pal, text, side === 'right' ? area.x1 - 4 : area.x0 + 4, y - 3, { color, align: side === 'right' ? 'right' : 'left' });
}

// A vertical reference line at data value v.
export function vline(ctx, tx, area, pal, v, { color = 'muted', alpha = 0.8, dash = [3, 3], text = '' } = {}) {
  const x = tx(v);
  if (!(x >= area.x0 && x <= area.x1)) return;
  ctx.strokeStyle = pal.css(color, alpha);
  ctx.lineWidth = 1;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x, area.y0);
  ctx.lineTo(x, area.y1);
  ctx.stroke();
  ctx.setLineDash([]);
  if (text) {
    const right = x < (area.x0 + area.x1) / 2;
    label(ctx, pal, text, right ? x + 4 : x - 4, area.y0 + 12, { color, align: right ? 'left' : 'right' });
  }
}

// A long computation drained across frames that a newer request cancels.
// run(gen, onDone) starts gen (a generator) and cancels the previous one;
// cancel() stops it. Each job's generator is closed with return(), so solver
// workspaces go back to their operator's pool.
export function jobRunner(signal, budgetMs = 6) {
  let job = 0;
  let live = null;
  const stop = () => {
    job++;
    if (live) {
      try {
        live.return();
      } catch {
        /* already finished */
      }
      live = null;
    }
  };
  signal?.addEventListener('abort', stop);
  return {
    run(gen, onDone) {
      stop();
      const me = job;
      live = gen;
      const step = () => {
        if (me !== job || signal?.aborted) return;
        const t0 = performance.now();
        for (;;) {
          const r = gen.next();
          if (r.done) {
            live = null;
            onDone?.(r.value);
            return;
          }
          if (performance.now() - t0 > budgetMs) break;
        }
        requestAnimationFrame(step);
      };
      step();
    },
    cancel: stop,
    get busy() {
      return live !== null;
    },
  };
}
