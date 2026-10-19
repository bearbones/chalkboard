// Chapter 2 (viewpoints): the claims its prose, figures and gallery entry
// make, measured on the same kernels the figures run (src/sims/flows.js and
// src/sims/ch-viewpoints-kinematics.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  makeFlow,
  rkStep,
  tracePathline,
  createStreakline,
  streaklineReset,
  streaklineStep,
  streakIndex,
  divergence,
  curl,
  materialDerivative,
  velocityGradient,
  rotationAmplification,
  createMaterialLoop,
  advectLoop,
  loopArea,
  IMPLICIT_STATUS,
} from '../../aids/fluid-course/src/sims/flows.js';
import {
  makeSwingingFlow,
  swingExactPath,
  makePatch,
  gradientParts,
  polylineGap,
  createStreamlineBuffer,
  streamlineThrough,
  growthPerTurn,
} from '../../aids/fluid-course/src/sims/ch-viewpoints-kinematics.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);

// The figure's procedure: release dye from (sx, sy) every step from t = 0,
// trace the particle released at t = 0, and the streamline through the
// source at the final time. Returns the gaps (streak → streamline,
// path → streamline) counted over points inside the flow's domain.
function lineGaps(flow, sx, sy, dt, T) {
  const steps = Math.round(T / dt);
  const streak = createStreakline({ x0: sx, y0: sy, capacity: steps + 2 });
  streaklineReset(streak, 0);
  for (let k = 0; k < steps; k++) streaklineStep(streak, flow, k * dt, dt, 'rk4');
  const px = new Float64Array(steps + 1);
  const py = new Float64Array(steps + 1);
  tracePathline(flow, sx, sy, 0, dt, steps, 'rk4', px, py);
  const buf = createStreamlineBuffer(800);
  const n = streamlineThrough(flow, sx, sy, steps * dt, 0.01, buf);
  const b = flow.domain;
  const inside = (x, y) => x >= b.xmin && x <= b.xmax && y >= b.ymin && y <= b.ymax;
  const ax = [];
  const ay = [];
  for (let k = 0; k < streak.count; k++) {
    const i = streakIndex(streak, k);
    if (inside(streak.x[i], streak.y[i])) ax.push(streak.x[i]), ay.push(streak.y[i]);
  }
  const qx = [];
  const qy = [];
  for (let k = 0; k <= steps; k++) if (inside(px[k], py[k])) qx.push(px[k]), qy.push(py[k]);
  return {
    streak: polylineGap(ax, ay, ax.length, buf.x, buf.y, n),
    path: polylineGap(qx, qy, qx.length, buf.x, buf.y, n),
  };
}

test('swinging stream: divergence-free, irrotational, straight streamlines', () => {
  const f = makeSwingingFlow();
  for (const t of [0, 0.3, 1.1, 2.7]) {
    for (const [x, y] of [[0.5, 0], [2, 0.7], [3.5, -1]]) {
      close(divergence(f, x, y, t), 0, 1e-9, 'div');
      close(curl(f, x, y, t), 0, 1e-9, 'curl');
    }
    const buf = createStreamlineBuffer(300);
    const n = streamlineThrough(f, 1, 0, t, 0.01, buf);
    const slope = (f.params.V * Math.sin(f.params.omega * t)) / f.params.U;
    for (let k = 0; k < n; k++) close(buf.y[k], slope * (buf.x[k] - 1), 1e-12, `straight streamline at t = ${t}`);
  }
});

test('swinging stream: traced pathlines and streaklines match the closed forms', () => {
  const f = makeSwingingFlow();
  const o = new Float64Array(2);
  // RK4 pathline within 10⁻⁷ at the figure's step.
  const steps = 200;
  const dt = 0.02;
  const px = new Float64Array(steps + 1);
  const py = new Float64Array(steps + 1);
  tracePathline(f, 0.3, 0, 0, dt, steps, 'rk4', px, py);
  for (let k = 0; k <= steps; k++) {
    swingExactPath(f.params, 0.3, 0, 0, k * dt, o);
    close(Math.hypot(px[k] - o[0], py[k] - o[1]), 0, 1e-7, `pathline point ${k}`);
  }
  // Streakline: particle k from the newest was released at t = (steps − k) dt.
  const s = createStreakline({ x0: 0.3, y0: 0, capacity: steps + 2 });
  streaklineReset(s, 0);
  for (let k = 0; k < steps; k++) streaklineStep(s, f, k * dt, dt, 'rk4');
  const T = steps * dt;
  for (let k = 0; k < s.count; k++) {
    const i = streakIndex(s, k);
    swingExactPath(f.params, 0.3, 0, T - k * dt, T, o);
    close(Math.hypot(s.x[i] - o[0], s.y[i] - o[1]), 0, 1e-7, `streak particle ${k}`);
  }
  // Explicit Euler pathline is first order, RK4 fourth (over 1.5 time units:
  // a whole period would let Euler's end-point errors cancel).
  const err = (method, h) => {
    const n = Math.round(1.5 / h);
    const ex = new Float64Array(n + 1);
    const ey = new Float64Array(n + 1);
    tracePathline(f, 0, 0, 0.1, h, n, method, ex, ey);
    swingExactPath(f.params, 0, 0, 0.1, 0.1 + n * h, o);
    return Math.hypot(ex[n] - o[0], ey[n] - o[1]);
  };
  close(Math.log2(err('euler', 0.02) / err('euler', 0.01)), 1, 0.1, 'Euler order');
  close(Math.log2(err('rk4', 0.1) / err('rk4', 0.05)), 4, 0.25, 'RK4 order');
});

test('the three lines coincide in steady flow (and in the spreading vortex), and part in the swinging stream and the double gyre', () => {
  const same = [
    ['steady vortex', makeFlow('rankine'), 0.8, 0, 0.02, 4],
    ['steady cells', makeFlow('taylor-green'), 0.5, 0.25, 0.02, 4],
    ['spreading vortex (unsteady)', makeFlow('lamb-oseen', { nu: 0.02, t0: 1 }), 0.6, 0, 0.02, 4],
  ];
  for (const [name, f, sx, sy, dt, T] of same) {
    const g = lineGaps(f, sx, sy, dt, T);
    assert.ok(g.streak < 1e-4 && g.path < 1e-4, `${name}: gaps ${g.streak}, ${g.path}`);
  }
  assert.equal(makeFlow('lamb-oseen', { nu: 0.02 }).steady, false);
  const apart = [
    ['swinging stream', makeSwingingFlow(), 0.3, 0, 0.02, 2.5, 0.3],
    ['double gyre', makeFlow('double-gyre'), 0.6, 0.4, 0.05, 10, 0.3],
  ];
  for (const [name, f, sx, sy, dt, T, min] of apart) {
    const g = lineGaps(f, sx, sy, dt, T);
    assert.ok(g.streak > min && g.path > min, `${name}: gaps ${g.streak}, ${g.path}`);
  }
});

test('material derivative: local + convective is what a drifting probe records', () => {
  const flows = { river: makeFlow('uniform', { U: 1, V: 0 }), whirlpool: makeFlow('rotation', { Omega: 1 }) };
  const md = {};
  const o = new Float64Array(2);
  for (const kind of ['river', 'whirlpool']) {
    const flow = flows[kind];
    for (const k of [0, 0.5, 1, 1.5]) {
      for (const beta of [0, 0.3]) {
        const T = makePatch(kind, { k, beta });
        let x = kind === 'river' ? -1.2 : 0.9 * Math.cos(-0.6);
        let y = kind === 'river' ? 0.1 : 0.9 * Math.sin(-0.6);
        let t = 0;
        const dt = 0.01;
        let prev = T(x, y, t);
        for (let n = 0; n < 300; n++) {
          materialDerivative(flow, T, x, y, t, 1e-5, md);
          const before = md.total;
          // A patch carried by the flow (k = 1) changes only by the warming.
          if (k === 1) close(md.total, beta, 1e-8, `${kind} carried patch`);
          // A patch that stays put (k = 0) has only the warming as local change.
          if (k === 0) close(md.local, beta, 1e-8, `${kind} fixed patch`);
          close(md.total, md.local + md.convective, 1e-12, 'sum');
          rkStep(flow, x, y, t, dt, 'rk4', o);
          x = o[0];
          y = o[1];
          t += dt;
          const now = T(x, y, t);
          materialDerivative(flow, T, x, y, t, 1e-5, md);
          // The probe's own record, differenced, equals D/Dt (to O(dt²)).
          close((now - prev) / dt, 0.5 * (before + md.total), 5e-4, `${kind} k=${k} record slope`);
          prev = now;
        }
      }
    }
  }
});

test('velocity gradient split: expansion, spin and strain', () => {
  const at = (id, params, x, y) => gradientParts(velocityGradient(makeFlow(id, params), x, y, 0), {});
  let g = at('rotation', { Omega: 1 }, 0.3, 0.2);
  close(g.div, 0, 1e-9, 'rotation div');
  close(g.vort, 2, 1e-9, 'rotation ω = 2Ω');
  close(g.sigma, 0, 1e-9, 'rotation strain');
  g = at('couette', { U: 1, H: 1 }, 1.5, 0.5);
  close(g.vort, -1, 1e-9, 'shear ω');
  close(g.sigma, 0.5, 1e-9, 'shear strain');
  close(g.theta, Math.PI / 4, 1e-9, 'shear stretching axis at 45°');
  g = at('stagnation', { a: 1 }, 0.3, 0.2);
  close(g.vort, 0, 1e-9, 'strain ω');
  close(g.sigma, 1, 1e-9, 'strain σ');
  close(g.theta, 0, 1e-9, 'strain axis');
  g = at('source', { m: Math.PI, a: 1 }, 0.3, 0.2);
  close(g.div, 1, 1e-9, 'source core div');
  close(g.sigma, 0, 1e-9, 'source core strain');
  g = at('rankine', {}, 1, 0.3);
  close(g.div, 0, 1e-9, 'vortex div');
  close(g.vort, 0, 1e-9, 'irrotational outside the core');
  assert.ok(g.sigma > 0.5, 'but strained');
  // Vorticity is twice the mean spin rate of any two perpendicular material lines.
  const spin = (G, a) => {
    const ex = Math.cos(a);
    const ey = Math.sin(a);
    const gx = G[0] * ex + G[1] * ey;
    const gy = G[2] * ex + G[3] * ey;
    return ex * gy - ey * gx;
  };
  for (const G of [[0.3, -1.2, 0.7, -0.3], [1, 0, 0, -1], [0, 1, 0, 0]]) {
    const p = gradientParts(G, {});
    for (const a of [0, 0.4, 1.3, 2.9]) close(spin(G, a) + spin(G, a + Math.PI / 2), p.vort, 1e-12, 'mean spin');
  }
});

test('a small parcel keeps its area where ∇·u = 0 and grows where ∇·u > 0 (RK4)', () => {
  const cases = [
    ['rotation', { Omega: 1 }, 0.6, 0.3],
    ['couette', { U: 1, H: 1 }, 0.5, 0.5],
    ['stagnation', { a: 1 }, -0.8, 0.9],
    ['rankine', {}, 1, 0],
  ];
  for (const [id, params, cx, cy] of cases) {
    const f = makeFlow(id, params);
    const loop = createMaterialLoop({ cx, cy, r: 0.15, n: 96, capacity: 96 });
    for (let k = 0; k < 150; k++) advectLoop(loop, f, k * 0.01, 0.01, 'rk4');
    close(loopArea(loop, true) / loop.area0, 1, 1e-4, `${id} area`);
  }
  // Inside the source's core ∇·u = m/(πa²) = 1, so the area grows like e^t.
  const f = makeFlow('source', { m: Math.PI, a: 1 });
  const loop = createMaterialLoop({ cx: 0.1, cy: 0.1, r: 0.15, n: 96, capacity: 96 });
  for (let k = 0; k < 100; k++) advectLoop(loop, f, k * 0.01, 0.01, 'rk4');
  close(loopArea(loop, true) / loop.area0, Math.E, 1e-4, 'source core area e^t');
});

test('tracking: Euler spirals out, RK4 holds below ΩΔt = 2√2, implicit midpoint keeps the radius', () => {
  const f = makeFlow('rotation', { Omega: 1 });
  const o = new Float64Array(2);
  const run = (method, w, steps) => {
    let x = 1;
    let y = 0;
    for (let k = 0; k < steps; k++) {
      rkStep(f, x, y, k * w, w, method, o);
      x = o[0];
      y = o[1];
    }
    return { r: Math.hypot(x, y), a: Math.atan2(y, x) };
  };
  // Euler at ΩΔt = 0.2: radius × √1.04 per step, × 7.107 after 100 steps.
  close(rotationAmplification('euler', 0.2), Math.sqrt(1.04), 1e-12, 'Euler |G|');
  close(run('euler', 0.2, 100).r, 7.1067, 1e-3, 'Euler radius after 100 steps');
  // Per turn: × 1.85 at ΩΔt = 0.2; halving Δt halves the logarithm (first order).
  const g = (w) => growthPerTurn(rotationAmplification('euler', w), w);
  close(g(0.2), 1.8517, 1e-3, 'Euler growth per turn');
  close(Math.log(g(0.2)) / Math.log(g(0.1)), 2, 0.05, 'first-order growth per turn');
  // Midpoint: × 1.0202 after 100 steps.
  close(run('midpoint', 0.2, 100).r, 1.0202, 1e-4, 'midpoint radius');
  // RK4: shrinks slightly below 2√2, grows above.
  close(run('rk4', 0.2, 100).r, 0.99996, 1e-5, 'RK4 radius');
  assert.ok(rotationAmplification('rk4', 2.82) < 1 && rotationAmplification('rk4', 2.84) > 1, 'RK4 threshold at 2√2');
  close(rotationAmplification('rk4', 2 * Math.SQRT2), 1, 1e-12, 'RK4 |G| = 1 at 2√2');
  // Implicit midpoint: radius 1 to round-off at any step; it turns by 2 arctan(ΩΔt/2).
  IMPLICIT_STATUS.failures = 0;
  for (const w of [0.2, 1, 2]) {
    const s = run('implicit-midpoint', w, 1);
    close(s.r, 1, 1e-12, `implicit midpoint radius at ${w}`);
    close(s.a, 2 * Math.atan(w / 2), 1e-12, `implicit midpoint turn at ${w}`);
  }
  assert.equal(IMPLICIT_STATUS.failures, 0);
  // The material loop: Euler × 50.5 in area after 100 steps; RK4 within 10⁻⁴.
  for (const [method, want, tol] of [['euler', 50.5, 0.1], ['rk4', 1, 1e-4], ['implicit-midpoint', 1, 1e-5]]) {
    const loop = createMaterialLoop({ cx: 0.6, cy: 0.2, r: 0.3, n: 64 });
    for (let k = 0; k < 100; k++) advectLoop(loop, f, k * 0.2, 0.2, method);
    close(loopArea(loop, true) / loop.area0, want, tol, `${method} loop area`);
  }
});
