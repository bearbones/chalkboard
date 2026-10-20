// Small helpers shared by the chapter 15 (trust) widgets. No numerics here:
// the numbers come from src/sims/verification.js, lbm.js and the
// ch-trust-* kernels.

import { h, sci } from '../../kit/dom.js';
import { sliced } from '../../kit/widgets.js';

// Preset lookup with a default.
export const preset = (fig, table, fallback = 'default') => table[fig.dataset.preset] ?? table[fallback];

// Log axes drop values <= 0; exact answers (error 0) are clamped to a floor.
export const clampLog = (v, floor = 1e-17) => (Number.isFinite(v) ? Math.max(Math.abs(v), floor) : NaN);

// Three significant figures (the kit's sci(v, 2) shows 1.04e-5 as 10⁻⁵).
export const sci2 = (v) => (Number.isFinite(v) ? sci(v, 3) : '–');

// A percentage with sensible digits for values from 1e-9 % to 100 %.
export function pct(frac) {
  if (!Number.isFinite(frac)) return '–';
  const p = frac * 100;
  const a = Math.abs(p);
  if (a === 0) return '0 %';
  if (a >= 10) return `${p.toFixed(1)} %`;
  if (a >= 0.01) return `${p.toPrecision(3)} %`;
  return `${sci(p, 3)} %`;
}

// A small table for a figure. head: header strings or [text, 'num']; rows:
// row keys. Returns { el, set(rowKey, col, text), row(rowKey) }; updates
// only touch text that changed.
export function figTable(head, rows, { label } = {}) {
  const thead = h('thead', h('tr', ...head.map((c) => (Array.isArray(c) ? h('th', { class: c[1], scope: 'col' }, c[0]) : h('th', { scope: 'col' }, c)))));
  const cells = new Map();
  const trs = new Map();
  const tbody = h('tbody');
  for (const key of rows) {
    const tds = head.map((c) => h(Array.isArray(c) && c[1] === 'num' ? 'td.num' : 'td'));
    cells.set(key, tds);
    const tr = h('tr', ...tds);
    trs.set(key, tr);
    tbody.append(tr);
  }
  const el = h('div.table-wrap', h('table', { 'aria-label': label || null }, thead, tbody));
  return {
    el,
    row: (key) => trs.get(key),
    set(key, col, text) {
      const td = cells.get(key)[col];
      const s = String(text);
      if (td.textContent !== s) td.textContent = s;
    },
  };
}

// A labelled number box in the controls row (the kit has no number input).
export function numberInput(parent, { label, value, step = 'any', onChange, width = '8.5em' }) {
  const input = h('input', { type: 'number', step, value: String(value), inputmode: 'decimal', style: { width } });
  const el = h('label.ctl', h('span.ctl-label', label), input);
  const api = {
    el,
    input,
    get value() {
      return Number(input.value);
    },
    set(v, { silent = false } = {}) {
      input.value = String(v);
      if (!silent) onChange?.(api.value);
    },
  };
  input.addEventListener('input', () => {
    if (input.value !== '' && Number.isFinite(Number(input.value))) onChange?.(api.value);
  });
  parent?.append(el);
  return api;
}

// Circle markers at data points in a Plot `extra` hook. pts: [{x, y, color,
// hollow}]; points outside a log axis's domain are skipped.
export function markers(ctx, tx, ty, pts, pal, { r = 5 } = {}) {
  for (const p of pts) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
    ctx.beginPath();
    ctx.arc(tx(p.x), ty(p.y), p.r ?? r, 0, 2 * Math.PI);
    ctx.fillStyle = pal.css(p.hollow ? 'board' : p.color);
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = pal.css(p.color);
    ctx.stroke();
  }
}

// A horizontal rule at y = v with a label at the right.
export function hrule(ctx, ty, area, pal, v, label, { token = 'muted', dash = [2, 4], below = false } = {}) {
  const py = Math.round(ty(v)) + 0.5;
  if (!(py >= area.y0 - 0.5 && py <= area.y1 + 0.5)) return;
  ctx.save();
  ctx.strokeStyle = pal.css(token, 0.95);
  ctx.lineWidth = 1.4;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(area.x0, py);
  ctx.lineTo(area.x1, py);
  ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillStyle = pal.css(token);
    ctx.textAlign = 'right';
    ctx.textBaseline = below ? 'top' : 'bottom';
    ctx.fillText(label, area.x1 - 4, below ? py + 3 : py - 3);
  }
  ctx.restore();
}

// Runs one sliced computation at a time: starting a new one aborts the old,
// and leaving the chapter aborts whatever is running. The promise rejects on
// abort; callers attach .catch(() => {}).
export function sliceRunner(signal) {
  let ctl = null;
  signal?.addEventListener('abort', () => ctl?.abort(), { once: true });
  return {
    run(gen, budgetMs = 6) {
      ctl?.abort();
      ctl = new AbortController();
      return sliced(gen, { budgetMs, signal: ctl.signal });
    },
    stop: () => ctl?.abort(),
  };
}
