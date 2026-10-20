// Drawing helpers shared by the chapter 3 (conservation) figures: a canvas
// that shows a rectangle of the (x, y) plane at equal scale with pointer
// mapping, a heat-map layer painted from a colour map, velocity arrows on a
// coarse lattice, and contour lines of a sampled scalar (marching squares on
// a grid of closed-form values). Drawing only: the physics comes from
// src/sims/flows.js and src/sims/ch-conservation.js.

import { canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';

const VEL = new Float64Array(2);

// A canvas showing domain = { xmin, xmax, ymin, ymax } letterboxed at equal
// scale. view.X(x), view.Y(y) map the plane to CSS pixels (y up).
export function planeView(parent, { domain, label, aspect, minHeight = 200, maxHeight = 460, pad = 4 } = {}) {
  const d = { xmin: domain.xmin, xmax: domain.xmax, ymin: domain.ymin, ymax: domain.ymax };
  const box = canvasBox(parent, { aspect: aspect ?? (d.xmax - d.xmin) / (d.ymax - d.ymin), minHeight, maxHeight, label });
  box.canvas.style.touchAction = 'none';
  const view = {
    box,
    domain: d,
    s: 1,
    ox: 0,
    oy: 0,
    X: (x) => view.ox + view.s * x,
    Y: (y) => view.oy - view.s * y,
    fit() {
      const W = box.width;
      const H = box.height;
      const dx = d.xmax - d.xmin;
      const dy = d.ymax - d.ymin;
      view.s = Math.max(1e-6, Math.min((W - 2 * pad) / dx, (H - 2 * pad) / dy));
      view.ox = W / 2 - view.s * 0.5 * (d.xmin + d.xmax);
      view.oy = H / 2 + view.s * 0.5 * (d.ymin + d.ymax);
    },
    setDomain(nd) {
      d.xmin = nd.xmin;
      d.xmax = nd.xmax;
      d.ymin = nd.ymin;
      d.ymax = nd.ymax;
      view.fit();
    },
    toPlane(e, out) {
      const p = box.pointer(e);
      out[0] = (p.x - view.ox) / view.s;
      out[1] = (view.oy - p.y) / view.s;
      return out;
    },
    clear(pal) {
      box.clear(pal.css('surface'));
      box.ctx.fillStyle = pal.css('board');
      box.ctx.fillRect(view.X(d.xmin), view.Y(d.ymax), view.s * (d.xmax - d.xmin), view.s * (d.ymax - d.ymin));
    },
    clip() {
      const ctx = box.ctx;
      ctx.beginPath();
      ctx.rect(view.X(d.xmin), view.Y(d.ymax), view.s * (d.xmax - d.xmin), view.s * (d.ymax - d.ymin));
      ctx.clip();
    },
    border(pal) {
      const ctx = box.ctx;
      ctx.strokeStyle = pal.css('line');
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(view.X(d.xmin) + 0.5, view.Y(d.ymax) + 0.5, view.s * (d.xmax - d.xmin) - 1, view.s * (d.ymax - d.ymin) - 1);
    },
  };
  view.fit();
  box.onResize(() => view.fit());
  return view;
}

// A heat-map layer: nx × ny cell-centred values over the view's domain,
// indexed i + j·nx with j = 0 at the bottom. paint() fills the image from a
// palette lookup table; draw() blits it (smoothed) into the domain rectangle.
export function heatLayer(nx, ny) {
  const off = document.createElement('canvas');
  off.width = nx;
  off.height = ny;
  const octx = off.getContext('2d');
  const img = octx.createImageData(nx, ny);
  const values = new Float64Array(nx * ny);
  return {
    nx,
    ny,
    values,
    // Cell-centre coordinates.
    x: (i, d) => d.xmin + ((i + 0.5) * (d.xmax - d.xmin)) / nx,
    y: (j, d) => d.ymin + ((j + 0.5) * (d.ymax - d.ymin)) / ny,
    paint(map, lo, hi, { mask = null, alpha = 1 } = {}) {
      const pal = palette();
      const lut = pal.lut[map];
      const bg = pal.rgb.board;
      const data = img.data;
      const inv = 1 / (hi - lo || 1);
      for (let j = 0; j < ny; j++) {
        const row = ny - 1 - j;
        for (let i = 0; i < nx; i++) {
          const k = i + j * nx;
          const o = (i + row * nx) * 4;
          const v = values[k];
          if ((mask && mask[k]) || !Number.isFinite(v)) {
            data[o] = bg[0];
            data[o + 1] = bg[1];
            data[o + 2] = bg[2];
            data[o + 3] = 255;
            continue;
          }
          const t = (v - lo) * inv;
          const q = (t > 0 ? (t < 1 ? (t * 255) | 0 : 255) : 0) * 4;
          data[o] = bg[0] + (lut[q] - bg[0]) * alpha;
          data[o + 1] = bg[1] + (lut[q + 1] - bg[1]) * alpha;
          data[o + 2] = bg[2] + (lut[q + 2] - bg[2]) * alpha;
          data[o + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
    },
    draw(view) {
      const ctx = view.box.ctx;
      const d = view.domain;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, view.X(d.xmin), view.Y(d.ymax), view.s * (d.xmax - d.xmin), view.s * (d.ymax - d.ymin));
    },
  };
}

// Velocity arrows on an m × k lattice over the domain, length ∝ speed,
// capped at 0.9 of the lattice spacing. Skips points where skip(x, y) is true.
export function velocityArrows(view, flow, t, { cols = 16, scale = 0.35, color = 'muted', alpha = 0.7, skip = null, pal } = {}) {
  pal ??= palette();
  const ctx = view.box.ctx;
  const d = view.domain;
  const h = (d.xmax - d.xmin) / cols;
  const rows = Math.max(2, Math.round((d.ymax - d.ymin) / h));
  const hy = (d.ymax - d.ymin) / rows;
  ctx.strokeStyle = pal.css(color, alpha);
  ctx.fillStyle = pal.css(color, alpha);
  ctx.lineWidth = 1.1;
  const cap = 0.9 * Math.min(h, hy);
  for (let j = 0; j < rows; j++) {
    const y = d.ymin + (j + 0.5) * hy;
    for (let i = 0; i < cols; i++) {
      const x = d.xmin + (i + 0.5) * h;
      if (skip && skip(x, y)) continue;
      flow.velocity(x, y, t, VEL);
      let ax = VEL[0] * scale;
      let ay = VEL[1] * scale;
      const L = Math.hypot(ax, ay);
      if (L > cap) {
        ax *= cap / L;
        ay *= cap / L;
      }
      if (L * view.s < 2) continue;
      const x0 = view.X(x - 0.5 * ax);
      const y0 = view.Y(y - 0.5 * ay);
      arrow(ctx, x0, y0, view.X(x + 0.5 * ax), view.Y(y + 0.5 * ay), 4);
    }
  }
}

// Contour segments of a sampled field at the given levels (marching squares
// on the cell-centred grid of a heat layer). Writes x0, y0, x1, y1 quadruples
// in plane coordinates into seg (a Float32Array); returns the count of
// segments. Cells where mask is set, or a corner is not finite, are skipped.
export function contourSegments(layer, d, levels, seg, mask = null) {
  const { nx, ny, values } = layer;
  const dx = (d.xmax - d.xmin) / nx;
  const dy = (d.ymax - d.ymin) / ny;
  const cap = seg.length >> 2;
  let n = 0;
  for (let j = 0; j + 1 < ny; j++) {
    for (let i = 0; i + 1 < nx; i++) {
      const k = i + j * nx;
      if (mask && (mask[k] || mask[k + 1] || mask[k + nx] || mask[k + nx + 1])) continue;
      const a = values[k];
      const b = values[k + 1];
      const c = values[k + nx + 1];
      const e = values[k + nx];
      if (!Number.isFinite(a + b + c + e)) continue;
      const lo = Math.min(a, b, c, e);
      const hi = Math.max(a, b, c, e);
      const x0 = d.xmin + (i + 0.5) * dx;
      const y0 = d.ymin + (j + 0.5) * dy;
      for (let L = 0; L < levels.length; L++) {
        const v = levels[L];
        if (v < lo || v >= hi) continue;
        // Edges: bottom (a→b), right (b→c), top (e→c), left (a→e).
        let pts = 0;
        let px0 = 0;
        let py0 = 0;
        let px1 = 0;
        let py1 = 0;
        const add = (xx, yy) => {
          if (pts === 0) {
            px0 = xx;
            py0 = yy;
          } else if (pts === 1) {
            px1 = xx;
            py1 = yy;
          }
          pts++;
        };
        if ((a < v) !== (b < v)) add(x0 + ((v - a) / (b - a)) * dx, y0);
        if ((b < v) !== (c < v)) add(x0 + dx, y0 + ((v - b) / (c - b)) * dy);
        if ((e < v) !== (c < v)) add(x0 + ((v - e) / (c - e)) * dx, y0 + dy);
        if ((a < v) !== (e < v)) add(x0, y0 + ((v - a) / (e - a)) * dy);
        if (pts >= 2 && n < cap) {
          seg[4 * n] = px0;
          seg[4 * n + 1] = py0;
          seg[4 * n + 2] = px1;
          seg[4 * n + 3] = py1;
          n++;
        }
      }
    }
  }
  return n;
}

// Stroke the first n segments of seg.
export function strokeSegments(view, seg, n) {
  const ctx = view.box.ctx;
  ctx.beginPath();
  for (let k = 0; k < n; k++) {
    ctx.moveTo(view.X(seg[4 * k]), view.Y(seg[4 * k + 1]));
    ctx.lineTo(view.X(seg[4 * k + 2]), view.Y(seg[4 * k + 3]));
  }
  ctx.stroke();
}
