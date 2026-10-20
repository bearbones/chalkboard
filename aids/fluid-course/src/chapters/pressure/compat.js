// pressure-compat: the compatibility condition of a closed box. Water flows
// in through the left wall at speed 1; on the right a wall lets it out at a
// speed you choose, or the side is open (p = 0 outside). With walls all
// round, the pressure equation A p = b has a solution only if Σ b = 0, that
// is if as much leaves as enters. Two Jacobi solvers (ω = 0.8) run side by
// side on the same problem: the chapter's raw iteration (ch-pressure-compat.js
// naiveJacobi, no fix) and the course solver (poisson.js jacobi), which first
// removes the mean of b. The raw one stalls at a residual floor and its
// pressure level drifts for ever; the fixed one converges, but to a field
// that still has a uniform divergence equal to the net inflow per unit area.

import { h } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { divergence, gradient } from '../../sims/grid2d.js';
import { pressureOperator, project } from '../../sims/projection.js';
import { jacobi } from '../../sims/poisson.js';
import { naiveJacobi, compatBox, boundaryInflow } from '../../sims/ch-pressure-compat.js';
import { presetFor, num, legend, maxAbs, meanOf, macArrows, maxCentreSpeed, allowScroll } from './common.js';

const N = 24;
const OMEGA = 0.8;
const SWEEPS = 3000;
const PER_FRAME = 30;
const PRESETS = {
  default: { right: 'wall', outflow: 0, show: 'naive' },
  incompatible: { right: 'wall', outflow: 0, show: 'naive' },
  balanced: { right: 'wall', outflow: 1, show: 'naive' },
  open: { right: 'open', outflow: 0, show: 'naive' },
};

export function mountCompat(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'A closed box must balance its books', wide: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);

  const view = new FieldView(left, { nx: N, ny: N, maxHeight: 400, label: 'Shape of the pressure in the box (its mean level subtracted) after the current number of Jacobi sweeps, with the velocity it produces' });
  allowScroll(view);
  const leg = legend(left, 'div', ['', '0', '']);
  const resPlot = new Plot(right, {
    x: { label: 'Jacobi sweeps', min: 0, max: SWEEPS },
    y: { label: 'relative residual', min: 1e-7, max: 2, log: true },
    aspect: 1.9,
    label: 'Residual of the pressure solve against sweeps, for the raw Jacobi iteration and for Jacobi with the mean of b removed',
  });
  const meanPlot = new Plot(right, {
    x: { label: 'Jacobi sweeps', min: 0, max: SWEEPS },
    y: { label: 'mean pressure', min: -0.05, max: 1.2 },
    aspect: 1.9,
    legend: false,
    label: 'Mean pressure level against sweeps for both solvers',
  });

  const side = select(f.controls, {
    label: 'Right side',
    options: [
      ['wall', 'wall with an outflow'],
      ['open', 'open (p = 0 outside)'],
    ],
    value: p.right,
    onChange: () => restart(),
  });
  const outS = slider(f.controls, { label: 'outflow speed (inflow is 1)', min: 0, max: 1.5, step: 0.05, value: p.outflow, fmt: (v) => v.toFixed(2), onInput: () => restart() });
  const show = segmented(f.controls, {
    label: 'Pressure from',
    options: [
      ['naive', 'raw Jacobi'],
      ['fixed', 'mean removed'],
    ],
    value: p.show,
    onChange: () => draw(),
  });
  const loop = animate(fig, tick, { autoplay: true, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Restart', onClick: () => (restart(), loop.play()) });

  const rdQ = readout(f.readouts, { label: 'net inflow Q = h²Σb (must be 0)' });
  const rdN = readout(f.readouts, { label: 'raw Jacobi: residual (floor)' });
  const rdM = readout(f.readouts, { label: 'raw Jacobi: mean pressure' });
  const rdF = readout(f.readouts, { label: 'mean removed: residual' });
  const rdD = readout(f.readouts, { label: 'divergence left in every cell' });

  let g = null;
  let op = null;
  let b = null;
  let xN = null;
  let xF = null;
  let genN = null;
  let genF = null;
  let k = 0;
  let floor = 0;
  let Q = 0;
  let leftover = 0;
  let pScale = 1;
  let lastStatus = '';
  const hist = { k: new Float64Array(SWEEPS + 1), rN: new Float64Array(SWEEPS + 1), rF: new Float64Array(SWEEPS + 1), mN: new Float64Array(SWEEPS + 1), mF: new Float64Array(SWEEPS + 1) };
  let len = 0;
  const shape = new Float64Array(N * N);
  const gu = { u: null, v: null, gu: null, gv: null };

  function restart() {
    outS.input.disabled = side.value === 'open';
    genN?.return();
    genF?.return();
    g = compatBox(N, { inflow: 1, outflow: outS.value, right: side.value });
    op = pressureOperator(g);
    divergence(g, g.div);
    b = new Float64Array(N * N);
    for (let c = 0; c < N * N; c++) b[c] = -g.div[c];
    Q = boundaryInflow(g);
    let bn = 0;
    let sb = 0;
    for (let c = 0; c < N * N; c++) (bn += b[c] * b[c]), (sb += b[c]);
    floor = op.singular ? (Math.abs(sb / (N * N)) * N) / Math.sqrt(bn) : 0;
    // What a converged, mean-fixed projection leaves behind (and the pressure scale).
    const ref = compatBox(N, { inflow: 1, outflow: outS.value, right: side.value });
    project(ref, { method: 'mgpcg', tol: 1e-10, warm: false });
    leftover = meanOf(ref.div);
    pScale = Math.max(maxAbs(ref.p), 1e-6);
    xN = new Float64Array(N * N);
    xF = new Float64Array(N * N);
    genN = naiveJacobi(op, b, { omega: OMEGA, maxIter: SWEEPS, x: xN, history: false });
    genF = jacobi(op, b, { omega: OMEGA, maxIter: SWEEPS, tol: 1e-14, x: xF, history: false });
    k = 0;
    len = 1;
    hist.k[0] = 0;
    hist.rN[0] = 1;
    hist.rF[0] = 1;
    hist.mN[0] = 0;
    hist.mF[0] = 0;
    gu.u = new Float64Array(g.u.length);
    gu.v = new Float64Array(g.v.length);
    gu.gu = new Float64Array(g.u.length);
    gu.gv = new Float64Array(g.v.length);
    draw();
  }

  function tick() {
    if (k >= SWEEPS) {
      loop.pause();
      return;
    }
    for (let s = 0; s < PER_FRAME && k < SWEEPS; s++) {
      const a = genN.next();
      const c = genF.next();
      k++;
      hist.k[len] = k;
      hist.rN[len] = a.done ? hist.rN[len - 1] : Math.max(a.value.residual, 1e-12);
      hist.mN[len] = a.done ? hist.mN[len - 1] : a.value.mean;
      hist.rF[len] = c.done ? hist.rF[len - 1] : Math.max(c.value.residual, 1e-12);
      hist.mF[len] = meanOf(xF);
      len++;
    }
    draw();
    if (k >= SWEEPS) loop.pause();
  }

  // Velocity after subtracting the gradient of pressure x (for the arrows).
  function corrected(x) {
    gradient(g, x, gu.gu, gu.gv);
    for (let f2 = 0; f2 < gu.u.length; f2++) gu.u[f2] = g.u[f2] - gu.gu[f2];
    for (let f2 = 0; f2 < gu.v.length; f2++) gu.v[f2] = g.v[f2] - gu.gv[f2];
    return gu;
  }

  function draw() {
    const pal = palette();
    const x = show.value === 'naive' ? xN : xF;
    // Colour the shape of the pressure (its mean subtracted): the level is
    // in the lower plot, and only the shape matters for the velocity.
    const mx = meanOf(x);
    for (let c = 0; c < N * N; c++) shape[c] = x[c] - mx;
    const m = pScale * 1.2;
    view.draw(shape, { map: 'div', lo: -m, hi: m });
    leg.set(num(-m, 2), '0', num(m, 2));
    const vel = corrected(x);
    const sMax = maxCentreSpeed(g, vel.u, vel.v) || 1;
    view.overlay((ctx, X, Y) => macArrows(ctx, X, Y, g, vel.u, vel.v, { stride: 2, scale: 1.8 / sMax, pal, alpha: 0.7 }));

    const K = hist.k.subarray(0, len);
    resPlot.draw([
      { x: K, y: hist.rN.subarray(0, len), color: 's1', width: 2, label: 'raw Jacobi' },
      { x: K, y: hist.rF.subarray(0, len), color: 's2', width: 2, dash: [6, 4], label: 'mean removed' },
    ], {
      extra(ctx, tx, ty, area, pl) {
        if (!(floor > 0)) return;
        const y = ty(floor);
        ctx.strokeStyle = pl.css('bad', 0.7);
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(area.x0, y);
        ctx.lineTo(area.x1, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = pl.css('bad');
        ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('floor |b̄|√N / ‖b‖', area.x1 - 4, y - 2);
      },
    });
    const hi = Math.max(1.2, hist.mN[len - 1] * 1.1);
    const lo = Math.min(-0.05, hist.mN[len - 1] * 1.1);
    meanPlot.setAxes({ y: { label: 'mean pressure', min: lo, max: hi } });
    meanPlot.draw([
      { x: K, y: hist.mN.subarray(0, len), color: 's1', width: 2, label: 'raw Jacobi' },
      { x: K, y: hist.mF.subarray(0, len), color: 's2', width: 2, dash: [6, 4], label: 'mean removed' },
    ]);

    const rN = hist.rN[len - 1];
    const rF = hist.rF[len - 1];
    const mN = hist.mN[len - 1];
    const compatible = !op.singular || Math.abs(Q) < 1e-9;
    rdQ.set(op.singular ? num(Q, 3) : `${num(Q, 3)} (open side: no condition)`, compatible ? 'good' : 'bad');
    rdN.set(`${num(rN, 2)}${floor > 0 ? ` (${num(floor, 2)})` : ''}`, floor > 0 ? 'bad' : '');
    rdM.set(num(mN, 3), op.singular && Math.abs(mN) > 0.05 ? 'bad' : '');
    rdF.set(num(rF, 2));
    rdD.set(num(leftover, 3), Math.abs(leftover) > 1e-6 ? 'bad' : 'good');
    let msg;
    if (!op.singular) msg = `Open side: the outside pressure fixes the level, every inflow has somewhere to go, and both solvers converge (slowly: Jacobi). Sweep ${k}.`;
    else if (compatible) msg = `Balanced: inflow equals outflow, Σb = 0, and both solvers converge to the same pressure. Sweep ${k}.`;
    else msg = `Incompatible: net inflow ${num(Q, 3)} with nowhere to go. Raw Jacobi stalls at its floor and its pressure level climbs by about ${num(k ? mN / k : 0, 2)} per sweep, for ever. The fixed solver converges, but leaves divergence ${num(leftover, 3)} in every cell. Sweep ${k}.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  view.redraw = () => {
    leg.refresh();
    draw();
  };
  restart();
  return () => {
    genN?.return();
    genF?.return();
    view.destroy();
    resPlot.destroy();
    meanPlot.destroy();
  };
}
