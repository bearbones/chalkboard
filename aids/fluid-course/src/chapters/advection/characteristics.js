// advection-characteristics: the exact solution of u_t + a u_x = 0 in the
// x–t plane. The colour is u(x, t) = u0(x − a t) (closed form, from the
// profile in advection.js makeProfile); thin lines are characteristics
// x − a t = const. Drag in the plane (or use the sliders) to put a probe at
// (x, t): its characteristic runs back to the foot x − a t on the t = 0 axis,
// and the lower plot shows that u at the probe equals u0 at the foot.

import { h, fmt } from '../../kit/dom.js';
import { frame, slider, select, readout, canvasBox } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette, gradientCss } from '../../kit/palette.js';
import { makeProfile } from '../../sims/advection.js';
import { onPointerDrag } from './common.js';

const NX = 160, NT = 64; // heat-map resolution (x, t)
const NP = 241; // points on the profile plot

const wrap01 = (x) => x - Math.floor(x);

export function mountCharacteristics(fig, { signal }) {
  const f = frame(fig, { title: 'Characteristics: the solution slides along lines', wide: true });
  const box = canvasBox(f.stage, { aspect: 2.2, minHeight: 170, maxHeight: 380, label: 'The x–t plane coloured by u, with characteristic lines and a draggable probe' });
  const legend = h('div.legend-row', h('div.legend-bar', { style: { background: gradientCss('seq') } }), h('div.legend-labels', h('span', 'u = 0'), h('span', 'u = 1')));
  f.stage.append(legend);
  const plot = new Plot(f.stage, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u', min: -0.1, max: 1.15 }, aspect: 3, minHeight: 130, label: 'Initial profile and the profile at the probe time' });

  const cfg = { a: 0.6, profile: 'square', px: 0.62, pt: 0.55 };
  let prof = makeProfile({ id: 'square', lo: 0.2, hi: 0.4 });

  const aSl = slider(f.controls, { label: 'Speed a', min: -1, max: 1, step: 0.05, value: cfg.a, fmt: (v) => v.toFixed(2), onInput: (v) => ((cfg.a = v), draw()) });
  select(f.controls, {
    label: 'Initial profile',
    options: [['square', 'Square wave'], ['gaussian', 'Gaussian'], ['triangle', 'Triangle']],
    value: cfg.profile,
    onChange: (v) => {
      cfg.profile = v;
      prof = makeProfile(v === 'square' ? { id: 'square', lo: 0.2, hi: 0.4 } : v === 'gaussian' ? { id: 'gaussian', x0: 0.3, sigma: 0.06 } : { id: 'triangle', x0: 0.3, halfWidth: 0.12 });
      draw();
    },
  });
  const xSl = slider(f.controls, { label: 'Probe x', min: 0, max: 1, step: 0.01, value: cfg.px, fmt: (v) => v.toFixed(2), onInput: (v) => ((cfg.px = v), draw()) });
  const tSl = slider(f.controls, { label: 'Probe t', min: 0, max: 1, step: 0.01, value: cfg.pt, fmt: (v) => v.toFixed(2), onInput: (v) => ((cfg.pt = v), draw()) });

  const rFoot = readout(f.readouts, { label: 'foot x − a t', title: 'Where the probe’s characteristic meets t = 0 (periodic)' });
  const rU = readout(f.readouts, { label: 'u at probe' });
  const rU0 = readout(f.readouts, { label: 'u₀ at foot' });
  const rUp = readout(f.readouts, { label: 'upwind side', title: 'The side information comes from' });

  // Buffers, allocated once.
  const off = document.createElement('canvas');
  off.width = NX;
  off.height = NT;
  const octx = off.getContext('2d');
  const img = octx.createImageData(NX, NT);
  const xs = new Float64Array(NP), u0 = new Float64Array(NP), ut = new Float64Array(NP);
  for (let k = 0; k < NP; k++) xs[k] = k / (NP - 1);

  // Plane rectangle inside the canvas (room for axis labels).
  const R = { x0: 0, y0: 0, w: 1, h: 1 };
  const layout = () => {
    R.x0 = 30;
    R.y0 = 8;
    R.w = Math.max(10, box.width - R.x0 - 10);
    R.h = Math.max(10, box.height - R.y0 - 26);
  };
  const X = (x) => R.x0 + x * R.w;
  const Y = (t) => R.y0 + (1 - t) * R.h;

  function paintField() {
    const pal = palette();
    const lut = pal.lut.seq;
    const d = img.data;
    for (let r = 0; r < NT; r++) {
      const t = 1 - (r + 0.5) / NT;
      for (let i = 0; i < NX; i++) {
        const v = prof.f((i + 0.5) / NX - cfg.a * t);
        const q = (v <= 0 ? 0 : v >= 1 ? 255 : (v * 255) | 0) * 4;
        const o = (i + r * NX) * 4;
        d[o] = lut[q];
        d[o + 1] = lut[q + 1];
        d[o + 2] = lut[q + 2];
        d[o + 3] = 255;
      }
    }
    octx.putImageData(img, 0, 0);
  }

  // A characteristic x = x0 + a t, drawn on the periodic strip in pieces.
  function charLine(ctx, x0) {
    const a = cfg.a;
    ctx.beginPath();
    if (Math.abs(a) < 1e-9) {
      const x = wrap01(x0);
      ctx.moveTo(X(x), Y(0));
      ctx.lineTo(X(x), Y(1));
      ctx.stroke();
      return;
    }
    let t = 0, x = wrap01(x0);
    for (let guard = 0; guard < 8 && t < 1; guard++) {
      const tEdge = a > 0 ? (1 - x) / a : -x / a; // time to reach the right/left edge
      const t1 = Math.min(1, t + tEdge);
      const x1 = x + a * (t1 - t);
      ctx.moveTo(X(x), Y(t));
      ctx.lineTo(X(x1), Y(t1));
      t = t1;
      x = a > 0 ? 0 : 1;
    }
    ctx.stroke();
  }

  function draw() {
    layout();
    paintField();
    const pal = palette();
    const ctx = box.ctx;
    box.clear();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, R.x0, R.y0, R.w, R.h);
    // characteristics
    ctx.lineWidth = 1;
    ctx.strokeStyle = pal.css('ink', 0.35);
    for (let k = 0; k < 10; k++) charLine(ctx, k / 10 + 0.05);
    // the probe's characteristic, back to its foot
    const foot = wrap01(cfg.px - cfg.a * cfg.pt);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = pal.css('accent');
    ctx.setLineDash([]);
    probePath(ctx);
    ctx.fillStyle = pal.css('accent');
    dot(ctx, X(cfg.px), Y(cfg.pt), 5.5, pal);
    dot(ctx, X(foot), Y(0), 5.5, pal);
    // axes
    ctx.strokeStyle = pal.css('muted', 0.7);
    ctx.lineWidth = 1;
    ctx.strokeRect(R.x0 + 0.5, R.y0 + 0.5, R.w - 1, R.h - 1);
    ctx.fillStyle = pal.css('muted');
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0', X(0), Y(0) + 4);
    ctx.fillText('1', X(1) - 4, Y(0) + 4);
    ctx.fillText('x →', X(0.5), Y(0) + 4);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('t', R.x0 - 8, Y(0.5));
    ctx.fillText('0', R.x0 - 6, Y(0) - 6);
    ctx.fillText('1', R.x0 - 6, Y(1) + 6);
    ctx.textAlign = 'left';
    ctx.fillStyle = pal.css('ink');
    ctx.fillText('foot', Math.min(X(foot) + 8, X(1) - 30), Y(0) - 10);

    // lower plot: u0 and u(·, t) with the probe and foot marked
    for (let k = 0; k < NP; k++) {
      u0[k] = prof.f(xs[k]);
      ut[k] = prof.f(xs[k] - cfg.a * cfg.pt);
    }
    plot.draw(
      [
        { x: xs, y: u0, color: 'ink', dash: [5, 4], width: 1.5, label: 'u at t = 0' },
        { x: xs, y: ut, color: 's1', width: 2, label: `u at t = ${cfg.pt.toFixed(2)}` },
      ],
      {
        extra: (c, tx, ty, area, p) => {
          c.strokeStyle = p.css('accent', 0.8);
          c.lineWidth = 1.5;
          c.setLineDash([3, 3]);
          for (const xv of [foot, cfg.px]) {
            c.beginPath();
            c.moveTo(tx(xv), area.y0);
            c.lineTo(tx(xv), area.y1);
            c.stroke();
          }
          c.setLineDash([]);
          c.fillStyle = p.css('accent');
          c.beginPath();
          c.arc(tx(cfg.px), ty(prof.f(cfg.px - cfg.a * cfg.pt)), 5, 0, 2 * Math.PI);
          c.fill();
          c.beginPath();
          c.arc(tx(foot), ty(prof.f(foot)), 5, 0, 2 * Math.PI);
          c.fill();
        },
      },
    );

    const uP = prof.f(cfg.px - cfg.a * cfg.pt), uF = prof.f(foot);
    rFoot.set(fmt(foot, 3));
    rU.set(fmt(uP, 3));
    rU0.set(fmt(uF, 3));
    rUp.set(cfg.a > 0 ? 'left (x smaller)' : cfg.a < 0 ? 'right (x larger)' : 'none: nothing moves');
    const s = cfg.a > 0
      ? `a > 0: information travels right, so the value at x = ${cfg.px.toFixed(2)} came from x = ${foot.toFixed(2)} on its left.`
      : cfg.a < 0
        ? `a < 0: the characteristics lean the other way; the value at x = ${cfg.px.toFixed(2)} came from x = ${foot.toFixed(2)} on its right.`
        : 'a = 0: the characteristics are vertical and the profile stands still.';
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  // The probe characteristic from (px, pt) back to t = 0, wrapping at the edges.
  function probePath(ctx) {
    const a = cfg.a;
    let t = cfg.pt, x = cfg.px;
    ctx.beginPath();
    for (let guard = 0; guard < 8 && t > 1e-12; guard++) {
      // going back in time, x decreases when a > 0
      const tEdge = a > 0 ? x / a : a < 0 ? (x - 1) / a : Infinity;
      const t1 = Math.max(0, t - tEdge);
      const x1 = x - a * (t - t1);
      ctx.moveTo(X(x), Y(t));
      ctx.lineTo(X(x1), Y(t1));
      t = t1;
      x = a > 0 ? 1 : 0;
    }
    ctx.stroke();
  }

  function dot(ctx, x, y, r, pal) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = pal.css('board');
    ctx.stroke();
  }

  onPointerDrag(box.canvas, (e) => {
    const p = box.pointer(e);
    const x = Math.min(1, Math.max(0, (p.x - R.x0) / R.w));
    const t = Math.min(1, Math.max(0, 1 - (p.y - R.y0) / R.h));
    cfg.px = Math.round(x * 100) / 100;
    cfg.pt = Math.round(t * 100) / 100;
    xSl.set(cfg.px, { silent: true });
    tSl.set(cfg.pt, { silent: true });
    draw();
  }, signal);
  box.onResize(draw);
  aSl.set(cfg.a, { silent: true });
  draw();
}
