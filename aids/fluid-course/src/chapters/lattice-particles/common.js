// Shared helpers for chapter 13's widgets: a cropped field view for long thin
// lattices (the cylinder wake), a step-rate governor that keeps each frame
// inside its compute budget, and number formats.

import { canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';

// A scalar field on an nx x ny lattice drawn to fill its box: the scale is
// chosen so the field covers the whole canvas, and whatever does not fit is
// cropped (horizontally from focusX, vertically about the centre). On a
// phone the box is taller than the lattice's aspect ratio, so you see the
// part of the wake nearest the cylinder; on a wide screen you see it all.
// Values go in already squashed to [-1, 1] (div map) or [0, 1] (seq map).
export class CropView {
  constructor(parent, { nx, ny, aspect = 2.6, minHeight = 170, maxHeight = 380, focusX = 0, label, smooth = true } = {}) {
    this.nx = nx;
    this.ny = ny;
    this.focusX = focusX;
    this.smooth = smooth;
    this.box = canvasBox(parent, { aspect, minHeight, maxHeight, label: label || 'simulation field' });
    this.off = document.createElement('canvas');
    this.off.width = nx;
    this.off.height = ny;
    this.octx = this.off.getContext('2d');
    this.img = this.octx.createImageData(nx, ny);
    this.view = { s: 1, x0: 0, y0: 0, w: nx, h: ny };
    this.redraw = null;
    this.box.onResize(() => this.redraw?.());
  }
  // Visible window in lattice units and the pixel scale.
  layout() {
    const { width: W, height: H } = this.box;
    const s = Math.max(H / this.ny, W / this.nx);
    const w = W / s, hgt = H / s;
    const x0 = Math.max(0, Math.min(this.focusX, this.nx - w));
    const y0 = (this.ny - hgt) / 2;
    const v = this.view;
    v.s = s;
    v.x0 = x0;
    v.y0 = y0;
    v.w = w;
    v.h = hgt;
    return v;
  }
  X(gx) {
    return (gx - this.view.x0) * this.view.s;
  }
  Y(gy) {
    return this.box.height - (gy - this.view.y0) * this.view.s;
  }
  // values[i + j nx] in [-1, 1] (div) or [0, 1] (seq); solid cells drawn in
  // the 'solid' token. No allocation.
  draw(values, { map = 'div', solid = null } = {}) {
    const pal = palette();
    const lut = pal.lut[map];
    const sc = pal.rgb.solid;
    const { nx, ny } = this;
    const data = this.img.data;
    const div = map === 'div';
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
        const t = div ? (values[k] + 1) * 0.5 : values[k];
        const q = (t > 0 ? (t < 1 ? (t * 255) | 0 : 255) : 0) * 4; // NaN -> 0
        data[o] = lut[q];
        data[o + 1] = lut[q + 1];
        data[o + 2] = lut[q + 2];
        data[o + 3] = 255;
      }
    }
    this.octx.putImageData(this.img, 0, 0);
    this.blit();
  }
  blit() {
    const { ctx, width: W, height: H } = this.box;
    const v = this.layout();
    this.box.clear(palette().css('board'));
    ctx.imageSmoothingEnabled = this.smooth;
    // source rows are flipped: lattice row j sits at canvas row ny - 1 - j
    ctx.drawImage(this.off, v.x0, this.ny - v.y0 - v.h, v.w, v.h, 0, 0, W, H);
  }
  overlay(fn) {
    fn(this.box.ctx, (gx) => this.X(gx), (gy) => this.Y(gy), palette(), this.view);
  }
  destroy() {
    this.box.destroy();
  }
}

// Keeps a running estimate of milliseconds per step and turns a wanted step
// count into one that fits the frame budget.
export function governor({ budgetMs = 6, guess = 0.5 } = {}) {
  const g = {
    ms: guess,
    budgetMs,
    fit(want) {
      const cap = Math.max(1, Math.floor(g.budgetMs / Math.max(g.ms, 1e-3)));
      return Math.max(0, Math.min(want, cap));
    },
    record(steps, elapsed) {
      if (steps > 0) g.ms = 0.85 * g.ms + 0.15 * (elapsed / steps);
    },
  };
  return g;
}

export const fmtTau = (t) => (t - 0.5 < 0.01 ? t.toFixed(4) : t.toFixed(3));
export const fmtPct = (v, d = 1) => `${(100 * v).toFixed(d)}%`;
