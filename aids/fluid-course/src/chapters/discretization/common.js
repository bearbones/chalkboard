// Small helpers shared by the chapter 6 widgets (no numerics here: the
// numbers come from src/sims/verification.js, advection.js and the
// ch-discretization-* kernels).

import { h, sci } from '../../kit/dom.js';

// Log axes drop values <= 0; exact answers (error 0) are clamped to a floor
// and drawn on it.
export const clampLog = (v, floor = 1e-17) => (Number.isFinite(v) ? Math.max(Math.abs(v), floor) : NaN);

// Correct significant digits from a relative error.
export const digits = (rel) => (rel > 0 ? Math.max(0, -Math.log10(rel)) : 16);

export const sci2 = (v) => (Number.isFinite(v) ? sci(v, 2) : '–');

// A small table for a figure: head is a list of header strings (or [text,
// 'num']), rows is a list of row keys. Returns { el, cell(rowKey, col),
// row(rowKey) } so updates only change text.
export function figTable(head, rows, { caption, label } = {}) {
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
  const table = h('table', { 'aria-label': label || null }, caption ? h('caption', caption) : null, thead, tbody);
  const el = h('div.table-wrap', table);
  return {
    el,
    cell: (key, col) => cells.get(key)[col],
    row: (key) => trs.get(key),
    set(key, col, text) {
      const td = cells.get(key)[col];
      const s = String(text);
      if (td.textContent !== s) td.textContent = s;
    },
  };
}

// A colour swatch plus a label, for the first column of a legend-like table.
// Styled inline so it also works where the chapter's css is absent (the
// gallery mounts demos outside the chapter).
export function swatchLabel(token, text, dash = false) {
  const sw = h('span', {
    'aria-hidden': 'true',
    style: { display: 'inline-block', width: '20px', marginRight: '7px', verticalAlign: 'middle', borderTop: `3px ${dash ? 'dashed' : 'solid'} var(--${token})` },
  });
  return h('span', { style: { whiteSpace: 'nowrap' } }, sw, text);
}

// Draw circle markers at data points (x[k], y[k]) in a Plot `extra` hook.
export function markers(ctx, tx, ty, pts, pal, { r = 5, fill = 'board' } = {}) {
  for (const p of pts) {
    if (!(p.x > 0) || !(p.y > 0) || !Number.isFinite(p.y)) continue;
    ctx.beginPath();
    ctx.arc(tx(p.x), ty(p.y), r, 0, 2 * Math.PI);
    ctx.fillStyle = pal.css(fill);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pal.css(p.color);
    ctx.stroke();
  }
}

// A vertical rule at x = v with a short label at the top.
export function vrule(ctx, tx, area, pal, v, label, { token = 'accent', dash = [4, 4] } = {}) {
  const px = Math.round(tx(v)) + 0.5;
  if (!(px >= area.x0 && px <= area.x1)) return;
  ctx.save();
  ctx.strokeStyle = pal.css(token, 0.9);
  ctx.lineWidth = 1.5;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(px, area.y0);
  ctx.lineTo(px, area.y1);
  ctx.stroke();
  ctx.setLineDash([]);
  if (label) {
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillStyle = pal.css(token);
    ctx.textBaseline = 'top';
    const right = px + 4 + ctx.measureText(label).width < area.x1;
    ctx.textAlign = right ? 'left' : 'right';
    ctx.fillText(label, right ? px + 4 : px - 4, area.y0 + 3);
  }
  ctx.restore();
}

// A horizontal rule at y = v with a label at the right.
export function hrule(ctx, ty, area, pal, v, label, { token = 'muted', dash = [2, 4] } = {}) {
  const py = Math.round(ty(v)) + 0.5;
  if (!(py >= area.y0 && py <= area.y1)) return;
  ctx.save();
  ctx.strokeStyle = pal.css(token, 0.9);
  ctx.lineWidth = 1.2;
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
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, area.x1 - 4, py - 2);
  }
  ctx.restore();
}

// Preset lookup with a default.
export const preset = (fig, table, fallback = 'default') => table[fig.dataset.preset] ?? table[fallback];
