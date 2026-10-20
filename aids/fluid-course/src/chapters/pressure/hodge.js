// pressure-hodge: paint a velocity field on a periodic square and watch it
// split into a divergence-free part and a gradient part (projection.js
// helmholtzHodge: one pressure solve for φ, one stream-function solve for ψ).
// Top: the painted field, coloured by its divergence. Below: the
// divergence-free part (coloured by vorticity) and the gradient part ∇φ
// (coloured by φ). Readouts check the three facts the section states: the
// first part has no divergence, the second has no curl, and their energies
// add up (they are orthogonal).

import { h } from '../../kit/dom.js';
import { frame, segmented, button, readout } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { palette } from '../../kit/palette.js';
import { macGrid, divergence, vorticityCentres, vorticityCorners, faceDot, enforceBoundary } from '../../sims/grid2d.js';
import { helmholtzHodge, PROJECTION_PRESETS } from '../../sims/projection.js';
import { presetFor, num, legend, maxAbs, macArrows, maxCentreSpeed, allowScroll } from './common.js';

const N = 40;
const R = 0.075; // brush radius in box widths
const PRESETS = {
  default: { start: 'vortex-source', brush: 'push' },
  blank: { start: 'blank', brush: 'source' },
};

export function mountHodge(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Helmholtz–Hodge: one field, two parts', wide: true });
  const g = macGrid(N, N, 1 / N, { bc: 'periodic' });
  const work = macGrid(N, N, 1 / N, { bc: 'periodic' });
  const hh = g.h;
  const su = N + 1;
  const div = new Float64Array(N * N);
  const vort = new Float64Array(N * N);
  const corners = new Float64Array((N + 1) * (N + 1));
  let parts = null;
  let dirty = true;
  let raf = 0;
  let lastSolve = 0;
  let dragging = false;
  let lastStatus = '';
  const PAINT = new Float64Array(2);

  const top = h('div.pr-panel');
  const row = h('div.fig-stage.cols');
  const left = h('div.pr-panel');
  const right = h('div.pr-panel');
  row.append(left, right);
  f.stage.append(top, row);
  top.append(h('div.pr-panel-label', 'Your field w: colour = divergence (drag to paint)'));
  left.append(h('div.pr-panel-label', 'Divergence-free part: colour = vorticity'));
  right.append(h('div.pr-panel-label', 'Gradient part ∇φ: colour = φ'));
  const vAll = new FieldView(top, { nx: N, ny: N, maxHeight: 380, label: 'The painted velocity field on a periodic square, coloured by its divergence. Drag to paint.' });
  const legAll = legend(top, 'div', ['converging', '0', 'spreading']);
  const vDf = new FieldView(left, { nx: N, ny: N, maxHeight: 300, label: 'The divergence-free part of the field, coloured by vorticity' });
  const legDf = legend(left, 'div', ['clockwise', '0', 'anticlockwise']);
  const vGr = new FieldView(right, { nx: N, ny: N, maxHeight: 300, label: 'The gradient part of the field, coloured by the potential phi' });
  const legGr = legend(right, 'div', ['low φ', '0', 'high φ']);
  allowScroll(vDf);
  allowScroll(vGr);

  const brush = segmented(f.controls, {
    label: 'Brush',
    options: [
      ['push', 'push'],
      ['swirl', 'swirl'],
      ['source', 'source'],
      ['sink', 'sink'],
    ],
    value: p.brush,
  });
  button(f.controls, { label: 'Clear', onClick: () => load('blank') });
  button(f.controls, { label: 'Swirl + source + sink', onClick: () => load('vortex-source') });

  const rdDiv = readout(f.readouts, { label: 'max |∇·| of w, div-free part, gradient part' });
  const rdCurl = readout(f.readouts, { label: 'max |curl| of the gradient part' });
  const rdE = readout(f.readouts, { label: 'energy |w|² = div-free + gradient' });
  const rdX = readout(f.readouts, { label: 'cross term (orthogonality)' });
  const rdMean = readout(f.readouts, { label: 'mean flow (ū, v̄)' });

  function load(id) {
    if (id === 'blank') {
      g.u.fill(0);
      g.v.fill(0);
    } else {
      const src = PROJECTION_PRESETS['vortex-source'].make(N);
      g.u.set(src.u);
      g.v.set(src.v);
    }
    dirty = true;
    schedule();
  }

  // Add a brush stroke of strength s at (x0, y0) (box units), wrapping round
  // the periodic square. (dx, dy) is the stroke direction for 'push'.
  function paint(x0, y0, dx, dy, s) {
    const kind = brush.value;
    const r2 = R * R;
    const wrapD = (d) => d - Math.round(d);
    const vel = (x, y, out) => {
      const ex = wrapD(x - x0);
      const ey = wrapD(y - y0);
      const w = s * Math.exp(-(ex * ex + ey * ey) / r2);
      if (kind === 'push') (out[0] = w * dx), (out[1] = w * dy);
      else if (kind === 'swirl') (out[0] = (-w * ey) / R), (out[1] = (w * ex) / R);
      else {
        const sg = kind === 'source' ? 1 : -1;
        out[0] = (sg * w * ex) / R;
        out[1] = (sg * w * ey) / R;
      }
    };
    const o = PAINT;
    const span = Math.ceil((3 * R) / hh);
    const ic = Math.round(x0 / hh);
    const jc = Math.round(y0 / hh);
    for (let dj = -span; dj <= span; dj++) {
      for (let di = -span; di <= span; di++) {
        const i = (((ic + di) % N) + N) % N;
        const j = (((jc + dj) % N) + N) % N;
        vel(i * hh, (j + 0.5) * hh, o);
        g.u[i + j * su] += o[0];
        vel((i + 0.5) * hh, j * hh, o);
        g.v[i + j * N] += o[1];
      }
    }
    enforceBoundary(g);
    dirty = true;
  }
  function solve() {
    parts = helmholtzHodge(g.u, g.v, N, N, hh, { grid: work, tol: 1e-9 });
    dirty = false;
    lastSolve = performance.now();
  }

  function draw() {
    if (dirty) solve();
    const pal = palette();
    divergence(g, div);
    const mDiv = maxAbs(div) || 1;
    vAll.draw(div, { map: 'div', lo: -mDiv, hi: mDiv });
    const sMax = maxCentreSpeed(g, g.u, g.v) || 1;
    const sc = 2.4 / sMax;
    vAll.overlay((ctx, X, Y) => macArrows(ctx, X, Y, g, g.u, g.v, { stride: 2, scale: sc, pal }));
    // divergence-free part, coloured by vorticity
    vorticityCentres(work, vort, parts.divFreeU, parts.divFreeV);
    const mV = maxAbs(vort) || 1;
    vDf.draw(vort, { map: 'div', lo: -mV, hi: mV });
    vDf.overlay((ctx, X, Y) => macArrows(ctx, X, Y, g, parts.divFreeU, parts.divFreeV, { stride: 2, scale: sc, pal }));
    const mP = maxAbs(parts.phi) || 1;
    vGr.draw(parts.phi, { map: 'div', lo: -mP, hi: mP });
    vGr.overlay((ctx, X, Y) => macArrows(ctx, X, Y, g, parts.curlFreeU, parts.curlFreeV, { stride: 2, scale: sc, pal }));

    // diagnostics
    divergence(work, div, parts.divFreeU, parts.divFreeV);
    const dDf = maxAbs(div);
    divergence(work, div, parts.curlFreeU, parts.curlFreeV);
    const dGr = maxAbs(div);
    vorticityCorners(work, corners, parts.curlFreeU, parts.curlFreeV);
    const cGr = maxAbs(corners);
    vorticityCorners(work, corners, g.u, g.v);
    const cAll = maxAbs(corners);
    const e = faceDot(g, g.u, g.v, g.u, g.v);
    const eDf = faceDot(g, parts.divFreeU, parts.divFreeV, parts.divFreeU, parts.divFreeV);
    const eGr = faceDot(g, parts.curlFreeU, parts.curlFreeV, parts.curlFreeU, parts.curlFreeV);
    const x = faceDot(g, parts.divFreeU, parts.divFreeV, parts.curlFreeU, parts.curlFreeV);
    const empty = e === 0;
    rdDiv.set(empty ? '–' : `${num(mDiv)}, ${num(dDf, 2)}, ${num(dGr)}`, empty ? '' : 'good');
    rdCurl.set(empty ? '–' : `${num(cGr, 2)} (w has ${num(cAll)})`, empty ? '' : 'good');
    rdE.set(empty ? '–' : `${num(e)} = ${num(eDf)} + ${num(eGr)}`);
    rdX.set(empty ? '–' : `${num(e ? x / e : 0, 2)} of |w|²`, empty ? '' : 'good');
    rdMean.set(`(${num(parts.meanU, 2)}, ${num(parts.meanV, 2)})`);
    legAll.set(`${num(-mDiv, 2)} (sink)`, '0', `${num(mDiv, 2)} (source)`);
    legDf.set(`${num(-mV, 2)} (clockwise)`, '0', `${num(mV, 2)} (anticlockwise)`);
    legGr.set(num(-mP, 2), '0', num(mP, 2));
    const msg = empty
      ? 'The square is still. Drag on the top panel to paint a flow.'
      : `Split: ${num((100 * eDf) / e, 3)}% of the energy is in the divergence-free part and ${num((100 * eGr) / e, 3)}% in the gradient part. The two parts are orthogonal, so the energies add up.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      // While dragging, re-split at most every 90 ms (two Poisson solves).
      if (dragging && dirty && performance.now() - lastSolve < 90) {
        schedule();
        return;
      }
      draw();
    });
  }

  let last = null;
  vAll.onDrag(({ gx, gy, first }) => {
    if (first) {
      dragging = true;
      last = { x: gx, y: gy };
      if (brush.value !== 'push') paint(gx * hh, gy * hh, 0, 0, 0.35);
      schedule();
      return;
    }
    if (!last) return;
    const L = Math.hypot(gx - last.x, gy - last.y);
    if (L < 0.6) return;
    paint(((gx + last.x) / 2) * hh, ((gy + last.y) / 2) * hh, (gx - last.x) / L, (gy - last.y) / L, brush.value === 'push' ? 0.35 : 0.12);
    last = { x: gx, y: gy };
    schedule();
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    last = null;
    schedule();
  };
  vAll.box.canvas.addEventListener('pointerup', endDrag);
  vAll.box.canvas.addEventListener('pointercancel', endDrag);

  const redraw = () => {
    legAll.refresh();
    legDf.refresh();
    legGr.refresh();
    if (parts) draw();
  };
  vAll.redraw = redraw;
  vDf.redraw = redraw;
  vGr.redraw = redraw;
  signal?.addEventListener('abort', () => raf && cancelAnimationFrame(raf));

  load(p.start);
  draw();
  return () => {
    vAll.destroy();
    vDf.destroy();
    vGr.destroy();
  };
}
