// pressure-checkerboard: add an odd–even pattern to a smooth pressure field
// and compare the force each grid feels. Top: the pressure p = smooth hill +
// a·pattern on a periodic 16 × 16 grid, with the four parity sub-grids
// optionally marked. Below: the x-component of the pressure force −∂p/∂x as
// the collocated grid computes it (central differences at the centres,
// grid2d.centralGradient) and as the staggered grid computes it (compact
// differences at the u-faces, grid2d.gradient). The collocated force does not
// change at all, whatever a is; the staggered force changes by 2a/h.

import { h } from '../../kit/dom.js';
import { frame, segmented, slider, toggle, readout } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { macGrid, gradient, centralGradient, parityFractions } from '../../sims/grid2d.js';
import { presetFor, num, legend, allowScroll } from './common.js';

const N = 16;
const HH = 1 / N;
const PRESETS = {
  default: { pattern: 'checker', a: 0.3, subgrids: true },
  stripes: { pattern: 'stripe', a: 0.3, subgrids: true },
  subgrid: { pattern: 'subgrid', a: 0.6, subgrids: true },
  smooth: { pattern: 'checker', a: 0, subgrids: false },
};

export function mountCheckerboard(fig, { signal }) {
  const pr = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'The pressure the collocated grid cannot feel', wide: true });
  const g = macGrid(N, N, HH, { bc: 'periodic' });
  const n = N * N;
  const su = N + 1;
  const p = new Float64Array(n);
  const ps = new Float64Array(n); // smooth part
  const pat = new Float64Array(n); // pattern, amplitude 1
  const gx = new Float64Array(n);
  const gy = new Float64Array(n);
  const gx0 = new Float64Array(n);
  const gu = new Float64Array(g.u.length);
  const gv = new Float64Array(g.v.length);
  const gu0 = new Float64Array(g.u.length);
  const fCol = new Float64Array(n);
  const fMac = new Float64Array(n);
  const par = { checker: 0, oddI: 0, oddJ: 0, total: 0 };
  let lastStatus = '';

  const top = h('div.pr-panel');
  const row = h('div.fig-stage.cols');
  const left = h('div.pr-panel');
  const right = h('div.pr-panel');
  row.append(left, right);
  f.stage.append(top, row);
  top.append(h('div.pr-panel-label', 'Pressure p = smooth hill + a × pattern'));
  left.append(h('div.pr-panel-label', 'Collocated: force −∂p/∂x at centres'));
  right.append(h('div.pr-panel-label', 'Staggered: force −∂p/∂x at u-faces'));
  const vP = new FieldView(top, { nx: N, ny: N, maxHeight: 300, label: 'The pressure field: a smooth hill plus the chosen odd-even pattern' });
  const legP = legend(top, 'div', ['low', '0', 'high']);
  const vC = new FieldView(left, { nx: N, ny: N, maxHeight: 260, label: 'The x-component of the pressure force as the collocated grid computes it with central differences' });
  const legC = legend(left, 'div', ['', '0', '']);
  const vM = new FieldView(right, { nx: N, ny: N, maxHeight: 260, label: 'The x-component of the pressure force as the staggered grid computes it at the u-faces' });
  const legM = legend(right, 'div', ['', '0', '']);
  for (const v of [vP, vC, vM]) allowScroll(v);

  const pattern = segmented(f.controls, {
    label: 'Pattern',
    options: [
      ['checker', 'checkerboard (−1)^(i+j)'],
      ['stripe', 'stripes (−1)^i'],
      ['subgrid', 'one sub-grid'],
    ],
    value: pr.pattern,
    onChange: () => update(),
  });
  const amp = slider(f.controls, { label: 'amplitude a', min: 0, max: 1, step: 0.02, value: pr.a, fmt: (v) => v.toFixed(2), onInput: () => update() });
  const subs = toggle(f.controls, { label: 'Mark the four sub-grids', checked: pr.subgrids, onChange: () => draw() });

  const rdC = readout(f.readouts, { label: 'collocated: largest change in force' });
  const rdM = readout(f.readouts, { label: 'staggered: largest change in force' });
  const rdPar = readout(f.readouts, { label: 'odd–even share of p (checker, i-stripes, j-stripes)' });

  // Smooth part: a hill, periodic on the unit square.
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = (i + 0.5) * HH;
      const y = (j + 0.5) * HH;
      ps[i + j * N] = 0.5 * Math.sin(2 * Math.PI * x) * Math.cos(2 * Math.PI * y);
    }
  }
  centralGradient(ps, N, N, HH, gx0, gy, true);
  gradient(g, ps, gu0, gv);
  let fScale = 0;
  for (let c = 0; c < n; c++) fScale = Math.max(fScale, Math.abs(gx0[c]));
  fScale *= 1.6;

  function update() {
    const kind = pattern.value;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        let q;
        if (kind === 'checker') q = (i + j) & 1 ? -1 : 1;
        else if (kind === 'stripe') q = i & 1 ? -1 : 1;
        else q = !(i & 1) && !(j & 1) ? 1 : 0;
        pat[i + j * N] = q;
      }
    }
    const a = amp.value;
    for (let c = 0; c < n; c++) p[c] = ps[c] + a * pat[c];
    centralGradient(p, N, N, HH, gx, gy, true);
    gradient(g, p, gu, gv);
    let dC = 0;
    let dM = 0;
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const c = i + j * N;
        const fa = i + j * su;
        fCol[c] = -gx[c];
        fMac[c] = -gu[fa];
        dC = Math.max(dC, Math.abs(gx[c] - gx0[c]));
        dM = Math.max(dM, Math.abs(gu[fa] - gu0[fa]));
      }
    }
    parityFractions(p, N, N, par);
    rdC.set(a ? num(dC, 2) : '0', a ? (dC < 1e-9 ? 'bad' : '') : '');
    const jump = kind === 'subgrid' ? 1 : 2;
    rdM.set(a ? `${num(dM)} (${jump === 2 ? '2a/h' : 'a/h'} = ${num((jump * a) / HH)})` : '0', a ? 'good' : '');
    rdPar.set(`${num(par.checker, 2)}, ${num(par.oddI, 2)}, ${num(par.oddJ, 2)}`);
    let msg;
    if (a === 0) msg = 'Smooth pressure only: both grids feel the same force, up to the small difference between their stencils.';
    else {
      const what = kind === 'checker' ? 'a checkerboard' : kind === 'stripe' ? 'stripes' : 'a bump on one sub-grid in four';
      msg = `You added ${what} of amplitude ${a.toFixed(2)}. The collocated force changed by ${num(dC, 2)}: it cannot feel it, so neither can the velocity. The staggered force changed by ${num(dM)}, which is ${kind === 'subgrid' ? 'a/h' : '2a/h'}: neighbouring cells differ, and it feels that.`;
    }
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
    draw();
  }

  // Four marker shapes for the parity sub-grids (i even/odd, j even/odd).
  function marks(ctx, X, Y, pal) {
    const cell = Math.abs(X(1) - X(0));
    const r = Math.max(1.6, cell * 0.16);
    ctx.fillStyle = pal.css('ink', 0.8);
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = X(i + 0.5);
        const y = Y(j + 0.5);
        const k = (i & 1) + 2 * (j & 1);
        ctx.beginPath();
        if (k === 0) ctx.arc(x, y, r, 0, 2 * Math.PI);
        else if (k === 1) ctx.rect(x - r * 0.85, y - r * 0.85, 1.7 * r, 1.7 * r);
        else if (k === 2) {
          ctx.moveTo(x, y - r * 1.1);
          ctx.lineTo(x + r, y + r * 0.8);
          ctx.lineTo(x - r, y + r * 0.8);
          ctx.closePath();
        } else {
          ctx.moveTo(x, y - r * 1.15);
          ctx.lineTo(x + r * 1.15, y);
          ctx.lineTo(x, y + r * 1.15);
          ctx.lineTo(x - r * 1.15, y);
          ctx.closePath();
        }
        ctx.fill();
      }
    }
  }

  function draw() {
    let mP = 0;
    for (let c = 0; c < n; c++) mP = Math.max(mP, Math.abs(p[c]));
    mP = mP || 1;
    vP.draw(p, { map: 'div', lo: -mP, hi: mP });
    if (subs.value) vP.overlay(marks);
    legP.set(num(-mP, 2), '0', num(mP, 2));
    vC.draw(fCol, { map: 'div', lo: -fScale, hi: fScale });
    vM.draw(fMac, { map: 'div', lo: -fScale, hi: fScale });
    legC.set(`${num(-fScale, 2)} (pushes left)`, '0', `${num(fScale, 2)} (right)`);
    legM.set(`${num(-fScale, 2)} (pushes left)`, '0', `${num(fScale, 2)} (right)`);
  }

  const redraw = () => {
    legP.refresh();
    legC.refresh();
    legM.refresh();
    draw();
  };
  vP.redraw = redraw;
  vC.redraw = redraw;
  vM.redraw = redraw;
  void signal;
  update();
  return () => {
    vP.destroy();
    vC.destroy();
    vM.destroy();
  };
}
