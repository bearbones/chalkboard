// pressure-rhie-chow: three ways to project a velocity stored at cell centres
// (projection.js collocatedProject on a periodic grid).
//   exact        solve with the wide central-difference operator D_c G_c: the
//                central divergence vanishes, but the grid splits into four
//                sub-grids and the pressure comes out speckled;
//   approximate  solve with the compact 5-point Laplacian: smooth pressure,
//                but D_c u is left O(h²) small, not zero;
//   rhie-chow    interpolate face velocities from the centres, project the
//                faces with the compact operator: divergence-free fluxes and
//                a smooth pressure (Rhie & Chow 1983's momentum
//                interpolation in its simplest, steady form).
// Left: the pressure with the projected velocity; right: the central
// divergence that remains. Readouts: odd–even share of the pressure, the
// divergence left (relative), and the face divergence for Rhie–Chow.

import { h } from '../../kit/dom.js';
import { frame, segmented, select, readout } from '../../kit/widgets.js';
import { FieldView, arrow } from '../../kit/field.js';
import { palette } from '../../kit/palette.js';
import { collocatedGrid, collocatedProject, COLLOCATED_PRESETS } from '../../sims/projection.js';
import { presetFor, num, legend, maxAbs, allowScroll } from './common.js';

const PRESETS = {
  default: { kind: 'exact', start: 'impulse', n: 16 },
  approximate: { kind: 'approximate', start: 'impulse', n: 16 },
  'rhie-chow': { kind: 'rhie-chow', start: 'noise', n: 16 },
};
const KIND_TEXT = {
  exact: 'Exact (wide stencil): the central divergence is gone, but look at the pressure. It lives on four separate sub-grids that never talk to each other, so it comes out speckled.',
  approximate: 'Approximate (compact stencil): the pressure is smooth, because the compact Laplacian couples neighbours. The price is that the central divergence is only reduced, not removed.',
  'rhie-chow': 'Rhie–Chow: velocities on the faces are interpolated from the centres and projected exactly. The face fluxes are divergence-free and the pressure is smooth; the centre values carry an O(h²) error.',
};

export function mountRhieChow(fig, { signal }) {
  const pr = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Collocated grids: three ways out', wide: true });
  let n = pr.n;
  let cg = collocatedGrid(n, n);
  let res = null;
  let lastStatus = '';

  const row = h('div.fig-stage.cols');
  const left = h('div.pr-panel');
  const right = h('div.pr-panel');
  row.append(left, right);
  f.stage.append(row);
  left.append(h('div.pr-panel-label', 'Pressure φ, with the projected velocity'));
  right.append(h('div.pr-panel-label', 'Central divergence left behind'));
  let vP = null;
  let vD = null;
  const legP = { api: null };
  const legD = { api: null };
  function views() {
    vP?.destroy();
    vD?.destroy();
    left.querySelector('.canvas-wrap')?.remove();
    right.querySelector('.canvas-wrap')?.remove();
    legP.api?.el.remove();
    legD.api?.el.remove();
    vP = new FieldView(left, { nx: n, ny: n, maxHeight: 320, label: 'Pressure from the collocated projection, with arrows for the projected velocity' });
    legP.api = legend(left, 'div', ['low', '0', 'high']);
    vD = new FieldView(right, { nx: n, ny: n, maxHeight: 320, label: 'Central-difference divergence of the projected velocity' });
    legD.api = legend(right, 'div', ['', '0', '']);
    allowScroll(vP);
    allowScroll(vD);
    const redraw = () => {
      legP.api.refresh();
      legD.api.refresh();
      if (res) draw();
    };
    vP.redraw = redraw;
    vD.redraw = redraw;
  }

  const kind = segmented(f.controls, {
    label: 'Projection',
    options: [
      ['exact', 'exact'],
      ['approximate', 'approximate'],
      ['rhie-chow', 'Rhie–Chow'],
    ],
    value: pr.kind,
    onChange: () => run(),
  });
  const start = select(f.controls, {
    label: 'Starting velocity',
    options: [
      ['impulse', 'one-cell kick'],
      ['noise', 'random noise'],
      ['smooth', 'smooth vortex + gradient'],
    ],
    value: pr.start,
    onChange: () => run(),
  });
  const size = segmented(f.controls, {
    label: 'Grid',
    options: [
      ['16', '16 × 16'],
      ['32', '32 × 32'],
    ],
    value: String(pr.n),
    onChange: (v) => {
      n = Number(v);
      cg = collocatedGrid(n, n);
      views();
      run();
    },
  });
  void size;

  const rdPar = readout(f.readouts, { label: 'odd–even share of the pressure' });
  const rdDiv = readout(f.readouts, { label: 'central divergence left (max, relative)' });
  const rdFace = readout(f.readouts, { label: 'face divergence (Rhie–Chow fluxes)' });

  function run() {
    COLLOCATED_PRESETS[start.value].init(cg, 3);
    res = collocatedProject(cg, { kind: kind.value, tol: 1e-10 });
    draw();
  }

  function draw() {
    const pal = palette();
    const mP = maxAbs(cg.p) || 1;
    vP.draw(cg.p, { map: 'div', lo: -mP, hi: mP });
    // velocity arrows at centres
    let sMax = 0;
    for (let c = 0; c < n * n; c++) sMax = Math.max(sMax, Math.hypot(cg.u[c], cg.v[c]));
    const stride = n > 16 ? 2 : 1;
    const sc = (0.9 * stride) / (sMax || 1);
    vP.overlay((ctx, X, Y) => {
      ctx.strokeStyle = ctx.fillStyle = pal.css('ink', 0.75);
      ctx.lineWidth = 1.1;
      const cell = Math.abs(X(1) - X(0));
      for (let j = 0; j < n; j += stride) {
        for (let i = 0; i < n; i += stride) {
          const c = i + j * n;
          const ax = cg.u[c] * sc;
          const ay = cg.v[c] * sc;
          if (Math.hypot(ax, ay) * cell < 1.5) continue;
          arrow(ctx, X(i + 0.5), Y(j + 0.5), X(i + 0.5 + ax), Y(j + 0.5 + ay), Math.min(4, 0.4 * cell * stride));
        }
      }
    });
    const mD = Math.max(res.divBefore.max, 1e-12);
    vD.draw(cg.div, { map: 'div', lo: -mD, hi: mD });
    legP.api.set(num(-mP, 2), '0', num(mP, 2));
    legD.api.set(`${num(-mD, 2)}`, '0', `${num(mD, 2)} (scale: divergence before)`);
    const parity = res.parity.total;
    rdPar.set(`${num(100 * parity, 2)}%`, parity > 0.5 ? 'bad' : '');
    rdDiv.set(num(res.relDiv, 2), res.relDiv > 1e-6 ? 'bad' : 'good');
    rdFace.set(res.faceDivAfter ? `${num(res.faceDivAfter.max / Math.max(res.divBefore.max, 1e-300), 2)} (relative)` : '– (no face velocities)', res.faceDivAfter ? 'good' : '');
    const msg = `${KIND_TEXT[kind.value]} Odd–even share ${num(100 * parity, 2)}%; central divergence left ${num(res.relDiv, 2)} of the start.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  void signal;
  views();
  run();
  return () => {
    vP?.destroy();
    vD?.destroy();
  };
}
