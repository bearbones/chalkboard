// Line/scatter plots on canvas: linear or log axes, an HTML legend, a hover
// crosshair with values, and an `extra` hook for custom marks (circles,
// regions, arrows) drawn in data coordinates.
//
//   const plot = new Plot(stage, { x: { label: 'x' }, y: { label: 'u', min: -0.2, max: 1.2 } });
//   plot.draw([
//     { x: xs, y: exact, color: 'ink', dash: [5, 4], label: 'exact' },
//     { x: xs, y: u, color: 's1', label: 'upwind' },
//   ]);
//
// Series: { x, y } arrays (or data: [[x, y], …]); color: a token name ('s1'…
// 's5', 'ink', 'muted', 'accent', …); width (2); dash; points (marker radius);
// step (draw as cell-wise steps); label (legend + hover); hover: false to skip.
// With ≥ 3 series give some of them a dash as a second cue beside colour.

import { h, fmt, superscript } from './dom.js';
import { palette } from './palette.js';
import { canvasBox } from './widgets.js';

const PAD = { l: 52, r: 14, t: 12, b: 38 };

export class Plot {
  constructor(parent, opts = {}) {
    this.opts = { legend: true, hover: true, grid: true, ...opts };
    this.x = { ...(opts.x || {}) };
    this.y = { ...(opts.y || {}) };
    this.box = canvasBox(parent, { aspect: opts.aspect ?? 2, height: opts.height, minHeight: opts.minHeight ?? 160, maxHeight: opts.maxHeight ?? 420, label: opts.label || 'plot', cls: 'plot' });
    this.tip = h('div.plot-tip', { hidden: true });
    this.box.wrap.append(this.tip);
    this.legendEl = this.opts.legend ? h('ul.plot-legend') : null;
    if (this.legendEl) parent.append(this.legendEl);
    this.series = [];
    this.drawOpts = {};
    this.hoverX = null;
    this.box.onResize(() => this.render());
    const cv = this.box.canvas;
    if (this.opts.hover) {
      cv.addEventListener('pointermove', (e) => {
        this.hoverX = this.box.pointer(e).x;
        this.render();
      });
      cv.addEventListener('pointerleave', () => {
        this.hoverX = null;
        this.tip.hidden = true;
        this.render();
      });
    }
  }
  setAxes({ x, y } = {}) {
    if (x) Object.assign(this.x, x);
    if (y) Object.assign(this.y, y);
  }
  draw(series, drawOpts = {}) {
    this.series = series.filter(Boolean).map(normalise);
    this.drawOpts = drawOpts;
    this.render();
    if (this.legendEl) this.renderLegend();
  }
  // Data → pixel transforms for the current frame (valid after render()).
  get sx() {
    return this._sx;
  }
  get sy() {
    return this._sy;
  }
  render() {
    const { ctx, width: W, height: H } = this.box;
    const pal = palette();
    this.box.clear();
    const pad = { ...PAD, ...(this.opts.pad || {}) };
    if (!this.x.label) pad.b -= 12;
    const area = { x0: pad.l, y0: pad.t, x1: W - pad.r, y1: H - pad.b };
    const xr = range(this.x, this.series, 'x', this.drawOpts.xExtent);
    let yr = range(this.y, this.series, 'y', this.drawOpts.yExtent);
    if (this.opts.equal) {
      // Same data units per pixel on both axes (for complex-plane plots).
      const sxu = (area.x1 - area.x0) / (xr[1] - xr[0]);
      const syu = (area.y1 - area.y0) / (yr[1] - yr[0]);
      if (sxu < syu) {
        const span = (area.y1 - area.y0) / sxu,
          mid = (yr[0] + yr[1]) / 2;
        yr = [mid - span / 2, mid + span / 2];
      } else {
        const span = (area.x1 - area.x0) / syu,
          mid = (xr[0] + xr[1]) / 2;
        xr[0] = mid - span / 2;
        xr[1] = mid + span / 2;
      }
    }
    const tx = transform(this.x.log, xr, area.x0, area.x1);
    const ty = transform(this.y.log, yr, area.y1, area.y0);
    this._sx = tx;
    this._sy = ty;
    this.area = area;

    // grid + ticks
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.lineWidth = 1;
    const xt = ticks(xr, this.x.log, Math.max(2, Math.floor((area.x1 - area.x0) / 70)));
    const yt = ticks(yr, this.y.log, Math.max(2, Math.floor((area.y1 - area.y0) / 40)));
    ctx.strokeStyle = pal.css('grid');
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const t of xt) {
      const px = Math.round(tx(t.v)) + 0.5;
      if (this.opts.grid) line(ctx, px, area.y0, px, area.y1);
      ctx.fillText(t.label, px, area.y1 + 5);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const t of yt) {
      const py = Math.round(ty(t.v)) + 0.5;
      if (this.opts.grid) line(ctx, area.x0, py, area.x1, py);
      ctx.fillText(t.label, area.x0 - 6, py);
    }
    // zero lines a touch stronger
    ctx.strokeStyle = pal.css('line');
    if (!this.y.log && yr[0] < 0 && yr[1] > 0) line(ctx, area.x0, Math.round(ty(0)) + 0.5, area.x1, Math.round(ty(0)) + 0.5);
    if (!this.x.log && xr[0] < 0 && xr[1] > 0) line(ctx, Math.round(tx(0)) + 0.5, area.y0, Math.round(tx(0)) + 0.5, area.y1);
    ctx.strokeStyle = pal.css('muted', 0.6);
    ctx.strokeRect(area.x0 + 0.5, area.y0 + 0.5, area.x1 - area.x0 - 1, area.y1 - area.y0 - 1);
    // axis labels
    ctx.fillStyle = pal.css('muted');
    if (this.x.label) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.x.label, (area.x0 + area.x1) / 2, H - 2);
    }
    if (this.y.label) {
      ctx.save();
      ctx.translate(12, (area.y0 + area.y1) / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.y.label, 0, 0);
      ctx.restore();
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0);
    ctx.clip();
    this.drawOpts.under?.(ctx, tx, ty, area, pal);
    for (const s of this.series) drawSeries(ctx, s, tx, ty, pal, this.x.log, this.y.log);
    this.drawOpts.extra?.(ctx, tx, ty, area, pal);
    ctx.restore();

    if (this.hoverX != null) this.renderHover(ctx, tx, ty, area, pal);
  }
  renderHover(ctx, tx, ty, area, pal) {
    const px = this.hoverX;
    if (px < area.x0 || px > area.x1) {
      this.tip.hidden = true;
      return;
    }
    const xv = tx.inv(px);
    const rows = [];
    let snapX = null;
    for (const s of this.series) {
      if (s.hover === false || !s.label || !s.n) continue;
      const k = nearest(s, xv);
      if (k < 0) continue;
      const X = s.x[k],
        Y = s.y[k];
      if (!Number.isFinite(Y)) continue;
      snapX ??= X;
      rows.push([s, X, Y]);
      ctx.fillStyle = pal.css(s.color);
      ctx.strokeStyle = pal.css('board');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx(X), ty(Y), 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    if (!rows.length) {
      this.tip.hidden = true;
      return;
    }
    ctx.strokeStyle = pal.css('muted', 0.7);
    ctx.setLineDash([3, 3]);
    line(ctx, Math.round(tx(snapX)) + 0.5, area.y0, Math.round(tx(snapX)) + 0.5, area.y1);
    ctx.setLineDash([]);
    const fx = this.x.fmt || ((v) => fmt(v));
    const fy = this.y.fmt || ((v) => fmt(v));
    this.tip.replaceChildren(
      h('div.tip-x', `${this.x.label || 'x'} = ${fx(snapX)}`),
      ...rows.map(([s, , Y]) => h('div', h('i.tip-sw', { style: { background: pal.css(s.color) } }), `${s.label}: ${fy(Y)}`)),
    );
    this.tip.hidden = false;
    const left = tx(snapX) + 12;
    const tw = this.tip.offsetWidth;
    this.tip.style.left = `${left + tw > this.box.width ? Math.max(0, tx(snapX) - tw - 12) : left}px`;
    this.tip.style.top = `${area.y0 + 4}px`;
  }
  renderLegend() {
    const pal = palette();
    const items = this.series.filter((s) => s.label && s.legend !== false);
    this.legendEl.hidden = items.length < 2 && !this.opts.legendAlways;
    this.legendEl.replaceChildren(
      ...items.map((s) => {
        const sw = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        sw.setAttribute('width', '26');
        sw.setAttribute('height', '10');
        sw.setAttribute('aria-hidden', 'true');
        const l = document.createElementNS('http://www.w3.org/2000/svg', s.points && !s.width ? 'circle' : 'line');
        if (s.points && !s.width) {
          l.setAttribute('cx', '13');
          l.setAttribute('cy', '5');
          l.setAttribute('r', '4');
          l.setAttribute('fill', pal.css(s.color));
        } else {
          l.setAttribute('x1', '1');
          l.setAttribute('x2', '25');
          l.setAttribute('y1', '5');
          l.setAttribute('y2', '5');
          l.setAttribute('stroke', pal.css(s.color));
          l.setAttribute('stroke-width', String(Math.max(2, s.width || 2)));
          if (s.dash) l.setAttribute('stroke-dasharray', s.dash.join(' '));
        }
        sw.append(l);
        return h('li', sw, s.label);
      }),
    );
  }
  destroy() {
    this.box.destroy();
  }
}

function normalise(s) {
  let x = s.x,
    y = s.y;
  if (s.data) {
    x = s.data.map((p) => p[0]);
    y = s.data.map((p) => p[1]);
  }
  return { color: 's1', width: 2, ...s, x, y, n: x ? x.length : 0 };
}

function range(axis, series, key, extent) {
  if (axis.min != null && axis.max != null) return [axis.min, axis.max];
  let lo = Infinity,
    hi = -Infinity;
  for (const s of series) {
    if (s.fit === false) continue;
    const a = s[key];
    if (!a) continue;
    for (let i = 0; i < a.length; i++) {
      const v = a[i];
      if (!Number.isFinite(v) || (axis.log && v <= 0)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (extent) {
    lo = Math.min(lo, extent[0]);
    hi = Math.max(hi, extent[1]);
  }
  if (!Number.isFinite(lo)) [lo, hi] = axis.log ? [1e-3, 1] : [0, 1];
  if (axis.min != null) lo = axis.min;
  if (axis.max != null) hi = axis.max;
  if (axis.log) {
    if (lo === hi) [lo, hi] = [lo / 10, hi * 10];
    return [10 ** Math.floor(Math.log10(lo) + 1e-9), 10 ** Math.ceil(Math.log10(hi) - 1e-9)];
  }
  if (lo === hi) [lo, hi] = [lo - 1, hi + 1];
  const padf = axis.pad ?? 0.06;
  const span = hi - lo;
  return [axis.min != null ? lo : lo - span * padf, axis.max != null ? hi : hi + span * padf];
}

function transform(log, [a, b], p0, p1) {
  const f = log ? Math.log10 : (v) => v;
  const fa = f(a),
    fb = f(b);
  const t = (v) => p0 + ((f(v) - fa) / (fb - fa)) * (p1 - p0);
  t.inv = (p) => {
    const u = fa + ((p - p0) / (p1 - p0)) * (fb - fa);
    return log ? 10 ** u : u;
  };
  return t;
}

export function ticks([a, b], log, target = 5) {
  if (log) {
    const out = [];
    const e0 = Math.ceil(Math.log10(a) - 1e-9),
      e1 = Math.floor(Math.log10(b) + 1e-9);
    const stride = Math.max(1, Math.ceil((e1 - e0 + 1) / Math.max(2, target)));
    for (let e = e0; e <= e1; e += stride) out.push({ v: 10 ** e, label: e === 0 ? '1' : e === 1 ? '10' : `10${superscript(e)}` });
    return out;
  }
  const span = b - a;
  const raw = span / Math.max(1, target);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= target) || 10 * mag;
  const out = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) {
    const vv = Math.abs(v) < step * 1e-9 ? 0 : v;
    out.push({ v: vv, label: fmtTick(vv, step) });
  }
  return out;
}

function fmtTick(v, step) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e5 || a < 1e-3) return fmt(v, 2);
  const dec = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return (v < 0 ? '−' : '') + a.toFixed(Math.min(dec + (step / 10 ** Math.floor(Math.log10(step)) === 2.5 ? 1 : 0), 6));
}

function line(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawSeries(ctx, s, tx, ty, pal, xlog, ylog) {
  const { x, y, n } = s;
  if (!n) return;
  ctx.strokeStyle = pal.css(s.color, s.alpha ?? 1);
  ctx.fillStyle = pal.css(s.color, s.alpha ?? 1);
  ctx.lineWidth = s.width || 0;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(s.dash || []);
  const ok = (k) => Number.isFinite(y[k]) && Number.isFinite(x[k]) && (!ylog || y[k] > 0) && (!xlog || x[k] > 0);
  if (s.width) {
    ctx.beginPath();
    let pen = false;
    for (let k = 0; k < n; k++) {
      if (!ok(k)) {
        pen = false;
        continue;
      }
      const px = tx(x[k]),
        py = clampPx(ty(y[k]));
      if (s.step) {
        // Cell-average data: a flat segment across each cell (x = centres).
        const half = k + 1 < n ? (tx(x[k + 1]) - px) / 2 : k > 0 ? (px - tx(x[k - 1])) / 2 : 2;
        const halfL = k > 0 ? (px - tx(x[k - 1])) / 2 : half;
        if (!pen) ctx.moveTo(px - halfL, py);
        else ctx.lineTo(px - halfL, py);
        ctx.lineTo(px + half, py);
      } else if (!pen) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
      pen = true;
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (s.points) {
    const r = typeof s.points === 'number' ? s.points : 3.5;
    for (let k = 0; k < n; k++) {
      if (!ok(k)) continue;
      ctx.beginPath();
      ctx.arc(tx(x[k]), clampPx(ty(y[k])), r, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

// Keep runaway values (a blown-up scheme) drawable without overflowing canvas.
const clampPx = (p) => (p > 1e5 ? 1e5 : p < -1e5 ? -1e5 : p);

function nearest(s, xv) {
  const { x, n } = s;
  let best = -1,
    bd = Infinity;
  for (let k = 0; k < n; k++) {
    const d = Math.abs(x[k] - xv);
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best;
}
