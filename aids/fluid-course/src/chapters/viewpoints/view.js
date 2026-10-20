// Drawing helpers shared by the chapter 2 (viewpoints) figures: a canvas
// that shows a rectangle of the (x, y) plane at equal scale, with
// pointer-to-plane mapping and draggable handles; a heat-map layer; and
// velocity arrows. Drawing only: every particle step, line trace and
// derivative comes from src/sims/flows.js and ch-viewpoints-kinematics.js.

import { canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';

const VEL = new Float64Array(2);

// A canvas showing domain = { xmin, xmax, ymin, ymax } letterboxed at equal
// scale. view.X(x), view.Y(y) map plane to CSS pixels (y up); view.fit() runs
// on every resize; view.setDomain(d) changes the window.
export function planeView(parent, { domain, label, aspect, minHeight = 220, maxHeight = 460, pad = 6 } = {}) {
  const d = { xmin: domain.xmin, xmax: domain.xmax, ymin: domain.ymin, ymax: domain.ymax };
  const box = canvasBox(parent, {
    aspect: aspect ?? (d.xmax - d.xmin) / (d.ymax - d.ymin),
    minHeight,
    maxHeight,
    label,
  });
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
    // Pointer event → plane coordinates, written into out.
    toPlane(e, out) {
      const p = box.pointer(e);
      out[0] = (p.x - view.ox) / view.s;
      out[1] = (view.oy - p.y) / view.s;
      return out;
    },
    // Clear to the page surface and paint the domain as the board.
    clear(pal) {
      box.clear(pal.css('surface'));
      const ctx = box.ctx;
      ctx.fillStyle = pal.css('board');
      ctx.fillRect(view.X(d.xmin), view.Y(d.ymax), view.s * (d.xmax - d.xmin), view.s * (d.ymax - d.ymin));
    },
    border(pal) {
      const ctx = box.ctx;
      ctx.strokeStyle = pal.css('line');
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(view.X(d.xmin) + 0.5, view.Y(d.ymax) + 0.5, view.s * (d.xmax - d.xmin) - 1, view.s * (d.ymax - d.ymin) - 1);
    },
    clip() {
      const ctx = box.ctx;
      ctx.beginPath();
      ctx.rect(view.X(d.xmin), view.Y(d.ymax), view.s * (d.xmax - d.xmin), view.s * (d.ymax - d.ymin));
      ctx.clip();
    },
    // Add the polyline through points i0 … i1 − 1 to the current path.
    path(xs, ys, i0, i1) {
      const ctx = box.ctx;
      for (let i = i0; i < i1; i++) {
        const px = view.X(xs[i]);
        const py = view.Y(ys[i]);
        if (i === i0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
    },
    dot(x, y, r) {
      const ctx = box.ctx;
      const px = view.X(x);
      const py = view.Y(y);
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, 2 * Math.PI);
    },
  };
  box.onResize(() => view.fit());
  view.fit();
  return view;
}

// Pointer dragging on a planeView. pick(x, y, slop) returns a key (or null)
// for a press at plane point (x, y), slop being 20 px in plane units;
// move(key, x, y) follows the pointer; end(key) runs on release.
export function dragHandles(view, { pick, move, end }) {
  const cv = view.box.canvas;
  const P = new Float64Array(2);
  let key = null;
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', (e) => {
    view.toPlane(e, P);
    key = pick(P[0], P[1], 20 / view.s);
    if (key == null) return;
    cv.setPointerCapture(e.pointerId);
    move(key, P[0], P[1]);
  });
  cv.addEventListener('pointermove', (e) => {
    if (key == null) return;
    view.toPlane(e, P);
    move(key, P[0], P[1]);
  });
  const stop = () => {
    if (key == null) return;
    const k = key;
    key = null;
    end?.(k);
  };
  cv.addEventListener('pointerup', stop);
  cv.addEventListener('pointercancel', stop);
}

// Clamp a value into [lo, hi].
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

// A heat map of nx × ny cell values over a domain (values[i + j·nx], row
// j = 0 at the bottom), drawn through an offscreen canvas. paint() colours
// the values with the palette's 'seq' or 'div' ramp from lo to hi.
export function heatLayer(nx, ny) {
  const off = document.createElement('canvas');
  off.width = nx;
  off.height = ny;
  const octx = off.getContext('2d');
  const img = octx.createImageData(nx, ny);
  const layer = {
    nx,
    ny,
    values: new Float64Array(nx * ny),
    paint(lo, hi, kind = 'seq') {
      const lut = palette().lut[kind];
      const data = img.data;
      const inv = 1 / (hi - lo || 1);
      const v = layer.values;
      for (let j = 0; j < ny; j++) {
        const row = ny - 1 - j;
        for (let i = 0; i < nx; i++) {
          const t = (v[i + j * nx] - lo) * inv;
          const q = (t > 0 ? (t < 1 ? (t * 255) | 0 : 255) : 0) * 4;
          const o = (i + row * nx) * 4;
          data[o] = lut[q];
          data[o + 1] = lut[q + 1];
          data[o + 2] = lut[q + 2];
          data[o + 3] = 255;
        }
      }
      octx.putImageData(img, 0, 0);
    },
    draw(view, domain) {
      const ctx = view.box.ctx;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(off, view.X(domain.xmin), view.Y(domain.ymax), view.s * (domain.xmax - domain.xmin), view.s * (domain.ymax - domain.ymin));
    },
  };
  return layer;
}

// Velocity arrows of flow at time t on an nx × ny lattice of cell centres
// over domain. scale: arrow length in plane units per unit speed, capped at
// 0.9 of a lattice cell. No allocation.
export function drawFlowArrows(view, flow, t, domain, { nx = 12, ny = 8, scale = 0.25, color = 'muted', alpha = 0.7, pal } = {}) {
  pal ??= palette();
  const ctx = view.box.ctx;
  ctx.strokeStyle = pal.css(color, alpha);
  ctx.fillStyle = pal.css(color, alpha);
  ctx.lineWidth = 1.25;
  ctx.setLineDash([]);
  const dx = (domain.xmax - domain.xmin) / nx;
  const dy = (domain.ymax - domain.ymin) / ny;
  const cap = 0.9 * Math.min(dx, dy);
  for (let j = 0; j < ny; j++) {
    const y = domain.ymin + (j + 0.5) * dy;
    for (let i = 0; i < nx; i++) {
      const x = domain.xmin + (i + 0.5) * dx;
      if (flow.solid && flow.solid(x, y)) continue;
      flow.velocity(x, y, t, VEL);
      let ax = VEL[0] * scale;
      let ay = VEL[1] * scale;
      const L = Math.hypot(ax, ay);
      if (L > cap) {
        ax *= cap / L;
        ay *= cap / L;
      }
      if (L * view.s < 2) continue;
      const x0 = x - 0.5 * ax;
      const y0 = y - 0.5 * ay;
      arrow(ctx, view.X(x0), view.Y(y0), view.X(x0 + ax), view.Y(y0 + ay), 4.5);
    }
  }
}

// A filled disc for a solid body (the cylinder) in the flow, if any.
export function drawBody(view, flow, pal) {
  if (!flow.solid || !flow.params || !flow.params.R) return;
  const ctx = view.box.ctx;
  ctx.fillStyle = pal.css('solid');
  ctx.beginPath();
  view.dot(flow.params.x0 ?? 0, flow.params.y0 ?? 0, view.s * flow.params.R);
  ctx.fill();
}
