// pressure-projection: one projection step, taken apart. Pick a predicted
// velocity u* (a channel past a disc, a jet in a sealed box, random flow in
// a box), a pressure solver and an iteration budget. The widget solves
// A p = −∇·u* with that many iterations of the chosen poisson.js solver
// (projection.js projectSteps, cold start) and subtracts ∇p. The plot shows
// the solver's whole convergence history (the relative residual, which is
// ‖∇·u‖₂/‖∇·u*‖₂) with the budget marked; the field shows divergence,
// pressure or speed, with tracer particles carried by the result. Too small
// a budget leaves divergence: tracers pile up where it is negative and thin
// out where it is positive.

import { h } from '../../kit/dom.js';
import { frame, slider, select, segmented, toggle, button, readout, playButton, animate } from '../../kit/widgets.js';
import { FieldView, drawParticles, drawGridLines } from '../../kit/field.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { enforceBoundary, divergence, sampleVelocity } from '../../sims/grid2d.js';
import { projectSteps, PROJECTION_PRESETS } from '../../sims/projection.js';
import { advectParticles } from '../../sims/flows.js';
import { rng } from '../../sims/util.js';
import { presetFor, num, legend, maxAbs, macArrows, maxCentreSpeed } from './common.js';

const SCENES = {
  channel: { preset: 'obstacle-channel', n: 64, name: 'Channel past a disc', inflow: 0.5 },
  jet: { preset: 'jet', n: 48, name: 'Jet in a sealed box', inflow: 0 },
  box: { preset: 'random-box', n: 32, name: 'Random flow in a box', inflow: 0 },
};
const SOLVERS = [
  ['jacobi', 'Jacobi (ω = 0.8)'],
  ['gauss-seidel', 'Gauss–Seidel'],
  ['cg', 'Conjugate gradients'],
  ['multigrid', 'Multigrid V(2,2)'],
];
const SOLVER_OPTS = { jacobi: { omega: 0.8 } };
const KMAX = 1000;
const NP = 1400;
const PRESETS = {
  default: { scene: 'channel', solver: 'jacobi', k: 10, colour: 'divergence', tracers: true },
  incomplete: { scene: 'channel', solver: 'jacobi', k: 10, colour: 'divergence', tracers: true },
  complete: { scene: 'channel', solver: 'multigrid', k: 12, colour: 'pressure', tracers: true },
  jet: { scene: 'jet', solver: 'cg', k: 300, colour: 'pressure', tracers: false },
};

export function mountProjection(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'One projection, step by step', wide: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);

  let sc = SCENES[p.scene];
  let g = null; // the projected grid
  let ustar = null;
  let vstar = null;
  const divStar = { a: null };
  let ref = null; // reference history to KMAX: residuals[]
  let result = null;
  let job = null; // running sliced solve
  let showStar = false;
  let lastStatus = '';
  let view = null;
  let leg = null;
  const fieldHolder = h('div');
  left.append(fieldHolder);

  const plot = new Plot(right, {
    x: { label: 'pressure iterations', min: 1, max: KMAX, log: true },
    y: { label: '‖∇·u‖ / ‖∇·u*‖', min: 1e-12, max: 3, log: true },
    aspect: 1.25,
    label: 'Relative divergence left after each iteration of the pressure solver, with the chosen budget marked',
  });

  const scene = select(f.controls, {
    label: 'Predicted flow u*',
    options: Object.entries(SCENES).map(([k, s]) => [k, s.name]),
    value: p.scene,
    onChange: () => build(),
  });
  const solver = select(f.controls, { label: 'Pressure solver', options: SOLVERS, value: p.solver, onChange: () => reference() });
  const kS = slider(f.controls, {
    label: 'iterations',
    min: 1,
    max: KMAX,
    log: true,
    value: p.k,
    fmt: (v) => String(Math.round(v)),
    onInput: () => rerun(),
  });
  const stage = segmented(f.controls, {
    label: 'Show',
    options: [
      ['star', 'u* (before)'],
      ['after', 'u (after)'],
    ],
    value: 'after',
    onChange: (v) => {
      showStar = v === 'star';
      resetTracers();
      draw();
    },
  });
  const colour = segmented(f.controls, {
    label: 'Colour',
    options: [
      ['divergence', 'divergence'],
      ['pressure', 'pressure'],
      ['speed', 'speed'],
    ],
    value: p.colour,
    onChange: () => draw(),
  });
  const tracers = toggle(f.controls, { label: 'Tracers (else arrows)', checked: p.tracers, onChange: () => draw() });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Move tracers' });
  button(f.controls, { label: 'Reset tracers', onClick: () => (resetTracers(), draw()) });

  const rdIt = readout(f.readouts, { label: 'iterations used' });
  const rdRes = readout(f.readouts, { label: '‖∇·u‖₂ / ‖∇·u*‖₂' });
  const rdMax = readout(f.readouts, { label: 'max |∇·u*| → max |∇·u|' });
  const rdVol = readout(f.readouts, { label: 'volume made or destroyed per unit time' });
  const rdWork = readout(f.readouts, { label: 'work (fine-grid sweeps)' });

  // tracers
  const xs = new Float64Array(NP);
  const ys = new Float64Array(NP);
  const rand = rng(11);
  const flow = {
    velocity(x, y, t, out) {
      return sampleVelocity(g, x, y, out, showStar ? ustar : g.u, showStar ? vstar : g.v);
    },
    project: null,
  };
  let W = 1;
  let H = 1;
  function resetTracers() {
    let k = 0;
    while (k < NP) {
      const x = rand() * W;
      const y = rand() * H;
      const i = Math.floor(x / g.h);
      const j = Math.floor(y / g.h);
      if (g.solid[i + j * g.nx]) continue;
      xs[k] = x;
      ys[k] = y;
      k++;
    }
  }

  function tick(dt) {
    const step = Math.min(dt, 0.05) * 0.35;
    advectParticles(flow, xs, ys, NP, 0, step, 'midpoint');
    for (let k = 0; k < NP; k++) {
      if (xs[k] > W) {
        // channel outlet: re-enter at the inlet
        xs[k] = rand() * 0.02;
        ys[k] = rand() * H;
      }
      if (xs[k] < 0) xs[k] = 0;
      if (ys[k] < 0) ys[k] = 0;
      if (ys[k] > H) ys[k] = H;
    }
    draw();
  }

  function build() {
    sc = SCENES[scene.value];
    const make = () => PROJECTION_PRESETS[sc.preset].make(sc.n);
    g = make();
    enforceBoundary(g);
    ustar = Float64Array.from(g.u);
    vstar = Float64Array.from(g.v);
    divStar.a = new Float64Array(g.nx * g.ny);
    divergence(g, divStar.a, ustar, vstar);
    W = g.nx * g.h;
    H = g.ny * g.h;
    view?.destroy();
    fieldHolder.replaceChildren();
    view = new FieldView(fieldHolder, { nx: g.nx, ny: g.ny, maxHeight: 420, label: `${sc.name}: the velocity before or after projection, coloured by divergence, pressure or speed, with tracer particles` });
    view.box.canvas.style.touchAction = 'pan-y';
    view.box.canvas.style.cursor = 'default';
    leg = legend(fieldHolder, 'div', ['', '0', '']);
    view.redraw = () => {
      leg.refresh();
      draw();
    };
    resetTracers();
    result = null;
    draw();
    reference();
  }

  // Drive a generator a few milliseconds per frame; cancel any earlier job.
  function runSliced(gen, done) {
    cancelJob();
    const me = { cancelled: false, gen };
    job = me;
    const stepJob = () => {
      if (me.cancelled || signal?.aborted) return;
      const t0 = performance.now();
      for (;;) {
        const r = gen.next();
        if (r.done) {
          if (job === me) job = null;
          done(r.value);
          return;
        }
        if (performance.now() - t0 > 6) break;
      }
      requestAnimationFrame(stepJob);
    };
    stepJob();
  }

  function cancelJob() {
    if (!job) return;
    job.cancelled = true;
    job.gen.return(); // releases the solver's workspace
    job = null;
  }

  // The solver's history to KMAX iterations (or convergence) on a scratch copy.
  function reference() {
    const scratch = PROJECTION_PRESETS[sc.preset].make(sc.n);
    ref = null;
    f.status.textContent = lastStatus = 'Running the solver…';
    const gen = projectSteps(scratch, { method: solver.value, maxIter: KMAX, tol: 1e-12, warm: false, solver: SOLVER_OPTS[solver.value] });
    runSliced(gen, (r) => {
      ref = r.residuals;
      rerun();
    });
  }

  function rerun() {
    if (!ref) return;
    g.u.set(ustar);
    g.v.set(vstar);
    const K = Math.round(kS.value);
    const gen = projectSteps(g, { method: solver.value, maxIter: K, tol: 1e-12, warm: false, solver: SOLVER_OPTS[solver.value] });
    runSliced(gen, (r) => {
      result = r;
      if (stage.value === 'star') stage.set('after');
      else draw();
    });
  }

  function volumeRate(d) {
    let s = 0;
    for (let c = 0; c < d.length; c++) if (!g.solid[c]) s += Math.abs(d[c]);
    return 0.5 * s * g.h * g.h;
  }

  function draw() {
    if (!view) return;
    const pal = palette();
    const star = showStar || !result;
    const d = star ? divStar.a : g.div;
    const mStar = maxAbs(divStar.a, divStar.a.length, g.solid) || 1;
    const u = star ? ustar : g.u;
    const v = star ? vstar : g.v;
    if (colour.value === 'divergence') {
      view.draw(d, { map: 'div', lo: -mStar, hi: mStar, solid: g.solid });
      leg.set(`${num(-mStar, 2)} (piles up)`, '0', `${num(mStar, 2)} (empties)`);
    } else if (colour.value === 'pressure') {
      const P = star ? ZERO(g.nx * g.ny) : g.p;
      const m = maxAbs(P, P.length, g.solid) || 1;
      view.draw(P, { map: 'div', lo: -m, hi: m, solid: g.solid });
      leg.set(star ? 'no pressure yet' : num(-m, 2), '0', star ? '' : num(m, 2));
    } else {
      const S = speedField(u, v);
      const m = maxAbs(S, S.length, g.solid) || 1;
      view.draw(S, { map: 'seq', lo: 0, hi: m, solid: g.solid });
      leg.set('0', 'speed', num(m, 2));
    }
    if (tracers.value) {
      view.overlay((ctx, X, Y) => {
        // tracer positions are in box units; the overlay maps grid units
        curX = X;
        curY = Y;
        drawParticles(ctx, toX, toY, xs, ys, { r: 1.4, color: 'ink', alpha: 0.75, pal });
      });
    }
    else {
      const sMax = maxCentreSpeed(g, u, v) || 1;
      view.overlay((ctx, X, Y) => macArrows(ctx, X, Y, g, u, v, { stride: g.nx > 40 ? 4 : 2, scale: (g.nx > 40 ? 3.2 : 1.8) / sMax, pal }));
    }
    if (g.nx <= 32 && !tracers.value) view.overlay((ctx, X, Y) => drawGridLines(ctx, X, Y, g.nx, g.ny, { pal, alpha: 0.35 }));
    if (!result || !ref) return;

    // plot: reference history and the budget
    const K = Math.round(kS.value);
    const n = ref.length;
    const xr = PX.length >= n ? PX : (PX = new Float64Array(n));
    const yr = PY.length >= n ? PY : (PY = new Float64Array(n));
    for (let k = 1; k < n; k++) {
      xr[k - 1] = k;
      yr[k - 1] = Math.max(ref[k], 1e-12);
    }
    const name = SOLVERS.find((s) => s[0] === solver.value)[1];
    plot.draw([{ x: xr.subarray(0, n - 1), y: yr.subarray(0, n - 1), color: 's1', width: 2, label: name }], {
      extra(ctx, tx, ty, area, pl) {
        const x = tx(Math.min(Math.max(K, 1), KMAX));
        ctx.strokeStyle = pl.css('accent', 0.9);
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x, area.y0);
        ctx.lineTo(x, area.y1);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = pl.css('accent');
        ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
        ctx.textAlign = x > (area.x0 + area.x1) / 2 ? 'right' : 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`budget ${K}`, x + (ctx.textAlign === 'left' ? 4 : -4), area.y0 + 4);
      },
    });

    const res = result.residuals.length ? result.residuals[result.residuals.length - 1] : 1;
    const vol0 = volumeRate(divStar.a);
    const vol = showStar ? vol0 : volumeRate(g.div);
    rdIt.set(String(result.iters));
    rdRes.set(num(res, 2), res > 1e-3 ? 'bad' : 'good');
    rdMax.set(`${num(result.divBefore.max)} → ${num(result.divAfter.max)}`);
    rdVol.set(sc.inflow ? `${num(vol, 2)} (inflow ${sc.inflow})` : num(vol, 2), vol > 0.01 * (vol0 || 1) ? 'bad' : '');
    rdWork.set(num(result.work, 3));
    let msg;
    if (showStar) msg = `The predicted flow u* before any pressure: fluid is destroyed or created at a rate of ${num(vol0, 2)} per unit time.`;
    else if (res > 1e-2) msg = `Incomplete projection: after ${result.iters} iterations ${num(100 * res, 2)}% of the divergence (2-norm) is left. Fluid still vanishes in some cells and appears in others; watch the tracers pile up.`;
    else if (res > 1e-6) msg = `Nearly projected: ${num(res, 2)} of the divergence is left after ${result.iters} iterations.`;
    else msg = `Projected: the divergence is down by a factor of ${num(1 / Math.max(res, 1e-16), 2)} after ${result.iters} iterations. Tracers keep their spacing: no fluid is lost.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  let PX = new Float64Array(KMAX + 1);
  let PY = new Float64Array(KMAX + 1);
  let zero = null;
  const ZERO = (n) => (zero && zero.length === n ? zero : (zero = new Float64Array(n)));
  let speed = null;
  function speedField(u, v) {
    const { nx, ny } = g;
    if (!speed || speed.length !== nx * ny) speed = new Float64Array(nx * ny);
    const su = nx + 1;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        speed[c] = Math.hypot(0.5 * (u[i + j * su] + u[i + 1 + j * su]), 0.5 * (v[c] + v[c + nx]));
      }
    }
    return speed;
  }
  let curX = null;
  let curY = null;
  const toX = (x) => curX(x / g.h);
  const toY = (y) => curY(y / g.h);

  build();
  return () => {
    cancelJob();
    view?.destroy();
    plot.destroy();
  };
}
