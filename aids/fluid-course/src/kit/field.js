// 2-D fields on canvas: a scalar grid as a heatmap, with helpers to overlay
// arrows, particles and solid cells, and to map pointer events to grid
// coordinates (for painting and stirring).
//
//   const view = new FieldView(stage, { nx: 128, ny: 64 });
//   view.draw(dye, { map: 'seq', lo: 0, hi: 1, solid });
//   view.overlay((ctx, X, Y) => { ... X(gx), Y(gy) map grid units to pixels });
//
// Grid convention: cell (i, j) is data[i + j·nx]; x grows right; with
// flipY (default true) row j = 0 is at the BOTTOM, as in the maths. Grid
// coordinates are continuous, in cell widths: cell (i, j) spans [i, i+1] × [j, j+1].

import { palette } from './palette.js';
import { canvasBox } from './widgets.js';

export class FieldView {
  constructor(parent, { nx, ny, flipY = true, smooth = false, maxHeight = 520, minHeight = 120, label } = {}) {
    this.nx = nx;
    this.ny = ny;
    this.flipY = flipY;
    this.smooth = smooth;
    this.box = canvasBox(parent, { aspect: nx / ny, maxHeight, minHeight, label: label || 'simulation field', cls: 'field' });
    this.off = document.createElement('canvas');
    this.resize(nx, ny);
    this.box.onResize(() => this.redraw?.());
  }
  resize(nx, ny) {
    this.nx = nx;
    this.ny = ny;
    this.off.width = nx;
    this.off.height = ny;
    this.octx = this.off.getContext('2d');
    this.img = this.octx.createImageData(nx, ny);
  }
  // Pixel rectangle the field occupies (letterboxed to keep cells square).
  get rect() {
    const { width: W, height: H } = this.box;
    const s = Math.min(W / this.nx, H / this.ny);
    const w = s * this.nx,
      hh = s * this.ny;
    return { x: (W - w) / 2, y: (H - hh) / 2, w, h: hh, s };
  }
  X(gx) {
    const r = this.rect;
    return r.x + gx * r.s;
  }
  Y(gy) {
    const r = this.rect;
    return this.flipY ? r.y + r.h - gy * r.s : r.y + gy * r.s;
  }
  // values: Float32Array/Float64Array of nx·ny. map: 'seq' | 'div' | a
  // function (v) → [r, g, b]. solid: optional Uint8Array mask drawn as walls.
  draw(values, { map = 'seq', lo = 0, hi = 1, solid = null, solidColor = 'solid', alpha = null } = {}) {
    const pal = palette();
    const { nx, ny } = this;
    const data = this.img.data;
    const lut = typeof map === 'string' ? pal.lut[map] : null;
    const sc = pal.rgb[solidColor] || pal.rgb.solid;
    const inv = 1 / (hi - lo || 1);
    for (let j = 0; j < ny; j++) {
      const row = this.flipY ? ny - 1 - j : j;
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
        const v = values[k];
        if (lut) {
          // lo..hi spans the whole ramp; for 'div' pass a symmetric range (−m, m).
          const t = (v - lo) * inv;
          const idx = t > 0 ? (t < 1 ? (t * 255) | 0 : 255) : 0; // NaN → 0
          const q = idx * 4;
          data[o] = lut[q];
          data[o + 1] = lut[q + 1];
          data[o + 2] = lut[q + 2];
        } else {
          const c = map(v);
          data[o] = c[0];
          data[o + 1] = c[1];
          data[o + 2] = c[2];
        }
        data[o + 3] = alpha ? Math.round(255 * alpha[k]) : 255;
      }
    }
    this.octx.putImageData(this.img, 0, 0);
    this.blit();
  }
  blit() {
    const { ctx } = this.box;
    const pal = palette();
    const r = this.rect;
    this.box.clear(pal.css('board'));
    ctx.imageSmoothingEnabled = this.smooth;
    ctx.drawImage(this.off, r.x, r.y, r.w, r.h);
  }
  // Draw extra marks in grid coordinates: fn(ctx, X, Y, pal, rect).
  overlay(fn) {
    const pal = palette();
    fn(this.box.ctx, (gx) => this.X(gx), (gy) => this.Y(gy), pal, this.rect);
  }
  // Pointer event → continuous grid coordinates (may fall outside the grid).
  toGrid(e) {
    const p = this.box.pointer(e);
    const r = this.rect;
    const gx = (p.x - r.x) / r.s;
    const gy = this.flipY ? (r.y + r.h - p.y) / r.s : (p.y - r.y) / r.s;
    return { gx, gy, inside: gx >= 0 && gy >= 0 && gx < this.nx && gy < this.ny };
  }
  // Drag handling: fn({gx, gy, dgx, dgy, first}) on every move while pressed.
  onDrag(fn) {
    const cv = this.box.canvas;
    let last = null;
    cv.style.touchAction = 'none';
    cv.style.cursor = 'crosshair';
    cv.addEventListener('pointerdown', (e) => {
      cv.setPointerCapture(e.pointerId);
      last = this.toGrid(e);
      fn({ ...last, dgx: 0, dgy: 0, first: true });
    });
    cv.addEventListener('pointermove', (e) => {
      if (!last) return;
      const g = this.toGrid(e);
      fn({ ...g, dgx: g.gx - last.gx, dgy: g.gy - last.gy, first: false });
      last = g;
    });
    const end = () => (last = null);
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
  }
  destroy() {
    this.box.destroy();
  }
}

// Arrows for a vector field sampled at cell centres every `stride` cells.
// u, v in grid cells per unit; scale converts to cells of arrow length.
export function drawArrows(ctx, X, Y, u, v, nx, ny, { stride = 4, scale = 1, color = 'ink', alpha = 0.75, pal, maxLen = 1.4, solid = null } = {}) {
  pal ??= palette();
  ctx.strokeStyle = pal.css(color, alpha);
  ctx.fillStyle = pal.css(color, alpha);
  ctx.lineWidth = 1.25;
  const cell = Math.abs(X(1) - X(0));
  for (let j = stride >> 1; j < ny; j += stride) {
    for (let i = stride >> 1; i < nx; i += stride) {
      const k = i + j * nx;
      if (solid && solid[k]) continue;
      let ax = u[k] * scale,
        ay = v[k] * scale;
      const len = Math.hypot(ax, ay);
      const cap = maxLen * stride;
      if (len > cap) {
        ax *= cap / len;
        ay *= cap / len;
      }
      if (len * cell < 1.5) continue;
      const x0 = X(i + 0.5),
        y0 = Y(j + 0.5);
      const x1 = X(i + 0.5 + ax),
        y1 = Y(j + 0.5 + ay);
      arrow(ctx, x0, y0, x1, y1);
    }
  }
}

export function arrow(ctx, x0, y0, x1, y1, head = 5) {
  const dx = x1 - x0,
    dy = y1 - y0;
  const L = Math.hypot(dx, dy);
  if (L < 1e-6) return;
  const hl = Math.min(head, L * 0.45);
  const ux = dx / L,
    uy = dy / L;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - ux * hl - uy * hl * 0.55, y1 - uy * hl + ux * hl * 0.55);
  ctx.lineTo(x1 - ux * hl + uy * hl * 0.55, y1 - uy * hl - ux * hl * 0.55);
  ctx.closePath();
  ctx.fill();
}

// Dots at grid coordinates (xs, ys arrays), e.g. tracer particles.
export function drawParticles(ctx, X, Y, xs, ys, { r = 1.6, color = 'particle', alpha = 0.9, pal, n = xs.length } = {}) {
  pal ??= palette();
  ctx.fillStyle = pal.css(color, alpha);
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    const px = X(xs[k]),
      py = Y(ys[k]);
    ctx.moveTo(px + r, py);
    ctx.arc(px, py, r, 0, 2 * Math.PI);
  }
  ctx.fill();
}

// Cell grid lines (for small step-through grids).
export function drawGridLines(ctx, X, Y, nx, ny, { color = 'grid', alpha = 1, pal } = {}) {
  pal ??= palette();
  ctx.strokeStyle = pal.css(color, alpha);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= nx; i++) {
    const x = Math.round(X(i)) + 0.5;
    ctx.moveTo(x, Y(0));
    ctx.lineTo(x, Y(ny));
  }
  for (let j = 0; j <= ny; j++) {
    const y = Math.round(Y(j)) + 0.5;
    ctx.moveTo(X(0), y);
    ctx.lineTo(X(nx), y);
  }
  ctx.stroke();
}
