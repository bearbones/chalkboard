// pressure-push: push water in a sealed box and see the pressure respond
// everywhere at once. Dragging paints an impulse u* (a smooth blob of
// velocity along the drag, ch-pressure-push.js addBlob); the projection (projection.js, MGPCG to 1e-8)
// finds the pressure that removes its divergence. With the projection off you
// see the raw push and the divergence it would cause: fluid piling up ahead
// of the push and a hole behind it. Readouts: divergence before and after,
// the share of the box that moves, and the kinetic energy kept.

import { frame, toggle, segmented, button, readout } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { palette } from '../../kit/palette.js';
import { macGrid, enforceBoundary, divergence, faceDot } from '../../sims/grid2d.js';
import { project } from '../../sims/projection.js';
import { addBlob, movingShare } from '../../sims/ch-pressure-push.js';
import { presetFor, num, legend, maxAbs, macArrows, maxCentreSpeed } from './common.js';

const N = 48;
const R = 0.07; // blob radius, box widths
const PRESETS = {
  default: { project: true, view: 'pressure', push: [0.38, 0.5, 1, 0] },
  raw: { project: false, view: 'divergence', push: [0.38, 0.5, 1, 0] },
  corner: { project: true, view: 'pressure', push: [0.2, 0.2, 0.7, 0.7] },
};

export function mountPush(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Push the water: pressure answers everywhere' });
  const g = macGrid(N, N, 1 / N, { bc: 'wall' });
  const h = g.h;
  const su = N + 1;
  const us = new Float64Array(g.u.length);
  const vs = new Float64Array(g.v.length);
  const divStar = new Float64Array(N * N);
  const pShow = new Float64Array(N * N);
  let res = null;
  let ke0 = 0;
  let ke1 = 0;
  let share0 = 0;
  let share1 = 0;
  let dirty = true;
  let raf = 0;
  let lastStatus = '';
  let stroke = null;

  const view = new FieldView(f.stage, { nx: N, ny: N, maxHeight: 440, label: 'A sealed square box of water. Drag to push it; colours show pressure or divergence, arrows the velocity.' });
  const leg = legend(f.stage, 'div', ['low', '0', 'high']);

  const proj = toggle(f.controls, { label: 'Enforce incompressibility (project)', checked: p.project, onChange: () => ((dirty = true), schedule()) });
  const show = segmented(f.controls, {
    label: 'Colour',
    options: [
      ['pressure', 'pressure'],
      ['divergence', 'divergence'],
    ],
    value: p.view,
    onChange: () => schedule(),
  });
  button(f.controls, { label: 'Reset', onClick: () => (seed(p.push), schedule()) });

  const rdDiv = readout(f.readouts, { label: 'max |∇·u| before → after' });
  const rdShare = readout(f.readouts, { label: 'share of box moving (> 1% of peak)' });
  const rdKE = readout(f.readouts, { label: 'kinetic energy kept' });
  const rdP = readout(f.readouts, { label: 'pressure range' });

  // Add a Gaussian blob of velocity (dx, dy) centred at (x0, y0) to u*, v*.
  const blob = (x0, y0, dx, dy) => addBlob(g, us, vs, x0, y0, dx, dy, R);

  function seed([x0, y0, dx, dy]) {
    us.fill(0);
    vs.fill(0);
    blob(x0, y0, dx, dy);
    dirty = true;
  }

  function solve() {
    g.u.set(us);
    g.v.set(vs);
    enforceBoundary(g);
    us.set(g.u);
    vs.set(g.v);
    divergence(g, divStar, us, vs);
    ke0 = faceDot(g, us, vs, us, vs);
    share0 = movingShare(g, us, vs);
    if (proj.value) {
      res = project(g, { method: 'mgpcg', tol: 1e-8, warm: false });
      ke1 = faceDot(g, g.u, g.v, g.u, g.v);
      share1 = movingShare(g, g.u, g.v);
    } else {
      res = null;
      g.p.fill(0);
      divergence(g, g.div);
    }
    dirty = false;
  }

  function draw() {
    if (dirty) solve();
    const pal = palette();
    const projected = proj.value;
    const showP = show.value === 'pressure';
    let m;
    if (showP && projected) {
      m = maxAbs(g.p) || 1;
      pShow.set(g.p);
      view.draw(pShow, { map: 'div', lo: -m, hi: m });
      leg.set(`${num(-m, 2)}`, '0', `${num(m, 2)}`);
    } else {
      const d = projected ? g.div : divStar;
      m = showP ? 1 : Math.max(maxAbs(divStar), 1e-12);
      if (showP) {
        pShow.fill(0);
        view.draw(pShow, { map: 'div', lo: -1, hi: 1 });
        leg.set('low', '0 (no pressure)', 'high');
      } else {
        view.draw(d, { map: 'div', lo: -m, hi: m });
        leg.set(`${num(-m, 2)} (piles up)`, '0', `${num(m, 2)} (empties)`);
      }
    }
    const u = projected ? g.u : us;
    const v = projected ? g.v : vs;
    const sMax = maxCentreSpeed(g, u, v) || 1;
    view.overlay((ctx, X, Y) => macArrows(ctx, X, Y, g, u, v, { stride: 3, scale: 2.6 / sMax, color: 'ink', alpha: 0.8, pal }));
    const dBefore = maxAbs(divStar);
    const dAfter = projected ? maxAbs(g.div) : dBefore;
    rdDiv.set(`${num(dBefore)} → ${num(dAfter)}`, projected ? 'good' : 'bad');
    rdShare.set(projected ? `${num(100 * share0, 2)}% → ${num(100 * share1, 2)}%` : `${num(100 * share0, 2)}%`);
    rdKE.set(projected ? `${num((100 * ke1) / (ke0 || 1), 3)}%` : '100% (nothing removed)');
    if (projected) {
      const [lo, hi] = minmax(g.p);
      rdP.set(`${num(lo)} to ${num(hi)}`);
    } else rdP.set('none');
    let msg;
    if (!projected) msg = `No pressure: the push alone has divergence up to ${num(dBefore)}. The colours mark fluid piling up ahead of the push and a hole opening behind it. Only ${num(100 * share0, 2)}% of the box moves.`;
    else msg = `Projected: the divergence fell from ${num(dBefore)} to ${num(dAfter)}. Pressure is high ahead of the push and low behind, and ${num(100 * share1, 2)}% of the box now moves: the whole box answers at once.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  const MM = [0, 0];
  function minmax(a) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < a.length; k++) {
      if (a[k] < lo) lo = a[k];
      if (a[k] > hi) hi = a[k];
    }
    MM[0] = lo;
    MM[1] = hi;
    return MM;
  }

  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      draw();
    });
  }

  view.onDrag(({ gx, gy, dgx, dgy, first }) => {
    if (first) {
      stroke = { x: gx, y: gy };
      us.fill(0);
      vs.fill(0);
      return;
    }
    if (!stroke) return;
    const L = Math.hypot(gx - stroke.x, gy - stroke.y);
    if (L < 0.8) return;
    // One blob per cell of travel, pointing along the stroke.
    const dx = (gx - stroke.x) / L;
    const dy = (gy - stroke.y) / L;
    blob(((stroke.x + gx) / 2) * h, ((stroke.y + gy) / 2) * h, 0.5 * dx, 0.5 * dy);
    stroke.x = gx;
    stroke.y = gy;
    dirty = true;
    schedule();
  });
  view.redraw = () => {
    leg.refresh();
    draw();
  };
  signal?.addEventListener('abort', () => raf && cancelAnimationFrame(raf));

  seed(p.push);
  draw();
  return () => view.destroy();
}
