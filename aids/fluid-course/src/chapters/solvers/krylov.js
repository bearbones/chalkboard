// solvers-cg: steepest descent against conjugate gradients on a problem
// with two unknowns, where the energy f(x) = ½ xᵀA x (minimum at the origin)
// can be drawn as nested ellipses. The paths come from the chapter kernel
// ch-solvers-krylov.js (steepestDescent, conjugateGradient). κ stretches the
// bowl; the angle turns it; the Jacobi option rescales by the diagonal
// (preconditioned steepest descent and PCG). Drag on the picture to move the
// starting point.

import { frame, slider, toggle, button, readout, playButton, animate, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { quadratic2, steepestDescent, conjugateGradient, sdRate, worstStart2 } from '../../sims/ch-solvers-krylov.js';
import { presetFor, num, count, label } from './common.js';

const TOL = 1e-6;
const MAXP = 600;
const R = 1.25;
const PRESETS = {
  default: { kappa: 10, angle: 30, precond: false, start: [-0.6, 0.9] },
  worst: { kappa: 10, angle: 30, precond: false, start: 'worst' },
  ill: { kappa: 100, angle: 30, precond: false, start: 'worst' },
  round: { kappa: 1, angle: 30, precond: false, start: [0.95, 0.55] },
  precond: { kappa: 100, angle: 0, precond: true, start: [0.9, 0.6] },
  'precond-useless': { kappa: 100, angle: 45, precond: true, start: [0.9, 0.2] },
};

// Eigenvalues of the 2 × 2 symmetric matrix [a b; b d].
function eig2(a, b, d) {
  const m = 0.5 * (a + d);
  const r = Math.hypot(0.5 * (a - d), b);
  return [m - r, m + r];
}

export function mountKrylov(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Two unknowns, two methods', wide: false });
  const box = canvasBox(f.stage, { aspect: 1.15, minHeight: 260, maxHeight: 480, label: 'Contours of the energy of a two-unknown system, with the path of steepest descent and of conjugate gradients from the same start. Drag to move the start.' });
  box.canvas.style.touchAction = 'none';
  box.canvas.style.cursor = 'crosshair';

  const kap = slider(f.controls, { label: 'condition number κ', min: 1, max: 1000, log: true, value: p.kappa, fmt: (v) => num(v, 3), onInput: () => rebuild() });
  const ang = slider(f.controls, { label: 'tilt of the bowl', min: 0, max: 180, step: 1, value: p.angle, fmt: (v) => `${Math.round(v)}°`, onInput: () => rebuild() });
  const pc = toggle(f.controls, { label: 'Jacobi preconditioner (scale by the diagonal)', checked: p.precond, onChange: () => rebuild() });
  const loop = animate(fig, tick, { autoplay: true, signal });
  playButton(f.controls, loop, { label: 'Step through' });
  button(f.controls, { label: 'Worst start', onClick: () => (setWorst(), rebuild(), restartReveal()) });

  const rdSD = readout(f.readouts, { label: 'steepest descent: steps to 10⁻⁶' });
  const rdCG = readout(f.readouts, { label: 'conjugate gradients: steps' });
  const rdF = readout(f.readouts, { label: 'steepest descent, error factor per step' });
  const rdP = readout(f.readouts, { label: 'worst case (κ − 1)/(κ + 1)' });
  const rdK = readout(f.readouts, { label: 'κ the method sees' });

  const sdX = new Float64Array(MAXP + 1);
  const sdY = new Float64Array(MAXP + 1);
  const cgX = new Float64Array(4);
  const cgY = new Float64Array(4);
  let sdLen = 0;
  let cgLen = 0;
  let sdIters = 0;
  let cgIters = 0;
  let sdFactor = NaN;
  let kEff = 1;
  let q = null;
  const x0 = new Float64Array(2);
  const b = new Float64Array(2);
  let shown = 0;
  let lastStatus = '';

  function setWorst() {
    const qq = quadratic2(kap.value, (ang.value * Math.PI) / 180);
    const w = worstStart2(qq);
    x0[0] = w[0] * 0.95;
    x0[1] = w[1] * 0.95;
  }

  function rebuild() {
    q = quadratic2(kap.value, (ang.value * Math.PI) / 180);
    const precond = pc.value ? 'jacobi' : 'none';
    // Steepest descent: keep up to MAXP points of the path, count all steps.
    const g1 = steepestDescent(q.A, b, { x0, tol: TOL, maxIter: 200000, precond });
    sdX[0] = x0[0];
    sdY[0] = x0[1];
    sdLen = 1;
    let r;
    let en = 1;
    let steps = 0;
    for (;;) {
      r = g1.next();
      if (r.done) break;
      const e = r.value;
      if (sdLen <= MAXP) {
        sdX[sdLen] = e.x[0];
        sdY[sdLen] = e.x[1];
        sdLen++;
      }
      en = e.energy;
      steps = e.k;
    }
    sdIters = r.value.iters;
    sdFactor = steps > 0 && en > 0 ? en ** (1 / steps) : 0;
    const g2 = conjugateGradient(q.A, b, { x0, tol: TOL, precond });
    cgX[0] = x0[0];
    cgY[0] = x0[1];
    cgLen = 1;
    for (;;) {
      r = g2.next();
      if (r.done) break;
      if (cgLen < 4) {
        cgX[cgLen] = r.value.x[0];
        cgY[cgLen] = r.value.x[1];
        cgLen++;
      }
    }
    cgIters = r.value.iters;
    // Condition number of the (scaled) matrix the method actually works on.
    const A = q.A;
    if (pc.value) {
      const s0 = 1 / Math.sqrt(A[0]);
      const s1 = 1 / Math.sqrt(A[3]);
      const [l0, l1] = eig2(1, A[1] * s0 * s1, 1);
      kEff = l1 / l0;
    } else kEff = q.lmax / q.lmin;
    if (!loop.playing) shown = Infinity;
    draw();
  }

  function restartReveal() {
    shown = 0;
    loop.play();
  }

  let acc = 0;
  function tick(dt) {
    acc += dt * (shown < 12 ? 2.5 : 25);
    if (acc >= 1) {
      shown += Math.floor(acc);
      acc -= Math.floor(acc);
    }
    draw();
    if (shown >= Math.max(sdLen, cgLen)) loop.pause();
  }

  function draw() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    const s = Math.min(W, H) / (2 * R);
    const cx = W / 2;
    const cy = H / 2;
    const X = (x) => cx + x * s;
    const Y = (y) => cy - y * s;
    // Contours of xᵀA x = c: semi-axes √c along v1 and √(c/κ) along v2.
    ctx.lineWidth = 1;
    const k = q.lmax;
    for (let i = 0; i < 9; i++) {
      const a1 = 1.6 * 0.72 ** i;
      const a2 = a1 / Math.sqrt(k);
      ctx.strokeStyle = pal.css('grid', 1);
      ctx.beginPath();
      for (let t = 0; t <= 96; t++) {
        const th = (t / 96) * 2 * Math.PI;
        const u = a1 * Math.cos(th);
        const v = a2 * Math.sin(th);
        const px = u * q.v1[0] + v * q.v2[0];
        const py = u * q.v1[1] + v * q.v2[1];
        if (t) ctx.lineTo(X(px), Y(py));
        else ctx.moveTo(X(px), Y(py));
      }
      ctx.stroke();
    }
    ctx.strokeStyle = pal.css('line');
    ctx.beginPath();
    ctx.moveTo(X(-R), Y(0));
    ctx.lineTo(X(R), Y(0));
    ctx.moveTo(X(0), Y(-R));
    ctx.lineTo(X(0), Y(R));
    ctx.stroke();
    // Minimum.
    ctx.fillStyle = pal.css('ink');
    ctx.beginPath();
    ctx.arc(X(0), Y(0), 3.5, 0, 2 * Math.PI);
    ctx.fill();
    // Paths, revealed up to `shown` steps.
    const path = (xs, ys, n, color, dash, width) => {
      const m = Math.min(n, shown + 1);
      ctx.strokeStyle = pal.css(color);
      ctx.fillStyle = pal.css(color);
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      for (let i = 0; i < m; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(xs[i]), Y(ys[i]));
      ctx.stroke();
      ctx.setLineDash([]);
      for (let i = 1; i < Math.min(m, 60); i++) {
        ctx.beginPath();
        ctx.arc(X(xs[i]), Y(ys[i]), 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
    };
    path(sdX, sdY, sdLen, 's1', [], 2);
    path(cgX, cgY, cgLen, 's2', [7, 4], 2.5);
    // Start.
    ctx.fillStyle = pal.css('write');
    ctx.strokeStyle = pal.css('ink');
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(X(x0[0]), Y(x0[1]), 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    // Key.
    ctx.lineWidth = 2;
    ctx.strokeStyle = pal.css('s1');
    ctx.beginPath();
    ctx.moveTo(10, 14);
    ctx.lineTo(30, 14);
    ctx.stroke();
    label(ctx, pal, 'steepest descent', 36, 18, { color: 'ink' });
    ctx.strokeStyle = pal.css('s2');
    ctx.setLineDash([7, 4]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(10, 32);
    ctx.lineTo(30, 32);
    ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, pal, 'conjugate gradients', 36, 36, { color: 'ink' });
    label(ctx, pal, 'drag to move the start', W - 8, H - 8, { align: 'right' });

    rdSD.set(count(sdIters), sdIters > 50 ? 'bad' : '');
    rdCG.set(String(cgIters), 'good');
    rdF.set(num(sdFactor, 4));
    rdP.set(num(sdRate(kEff), 4));
    rdK.set(num(kEff, 4));
    let msg;
    if (kEff < 1.0001) msg = 'A round bowl: the steepest direction points straight at the minimum, and both methods arrive in one step.';
    else if (pc.value && kEff > 0.95 * q.lmax / q.lmin) msg = `Jacobi scaling changed nothing: the diagonal entries are equal (tilt 45°), so dividing by them only rescales. The same is true of the pressure matrix, whose diagonal is 4/h² almost everywhere.`;
    else if (sdIters <= 3) msg = `The start lies on an axis of the ellipse, so the steepest direction points at the minimum and steepest descent needs only ${count(sdIters)} steps. Drag the start off the axis to see the zigzag.`;
    else msg = `κ = ${num(kEff, 3)}: steepest descent zigzags across the valley and needs ${count(sdIters)} steps; conjugate gradients reaches the minimum in ${cgIters}, because its second direction is chosen so as not to spoil the first.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  const fromEvent = (e) => {
    const pt = box.pointer(e);
    const s = Math.min(box.width, box.height) / (2 * R);
    x0[0] = Math.max(-R, Math.min(R, (pt.x - box.width / 2) / s));
    x0[1] = Math.max(-R, Math.min(R, (box.height / 2 - pt.y) / s));
    if (Math.hypot(x0[0], x0[1]) < 0.02) x0[0] = 0.02;
  };
  let dragging = false;
  box.canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    box.canvas.setPointerCapture(e.pointerId);
    loop.pause();
    fromEvent(e);
    shown = Infinity;
    rebuild();
  });
  box.canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    fromEvent(e);
    rebuild();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false;
    restartReveal();
  };
  box.canvas.addEventListener('pointerup', end);
  box.canvas.addEventListener('pointercancel', end);

  if (p.start === 'worst') setWorst();
  else {
    x0[0] = p.start[0];
    x0[1] = p.start[1];
  }
  box.onResize(() => draw());
  rebuild();
  shown = loop.playing ? 0 : Infinity;
  draw();
  return () => {
    box.destroy();
  };
}
