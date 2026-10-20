// Chapter 3 (conservation) kernels: src/sims/ch-conservation.js. Each test
// checks a claim the chapter makes: the divergence theorem for a box in the
// analytic flows (net outflow zero for divergence-free fields, the enclosed
// source strength for the cored source), the exact circle–rectangle area,
// mass conservation of the flux-form update to round-off, the first-order
// mass leak of the product-rule update and its halving under refinement,
// the exact characteristic solution, the momentum budgets of exact
// Navier–Stokes solutions, and zero drag with Kutta–Joukowski lift on the
// cylinder.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFlow } from '../../aids/fluid-course/src/sims/flows.js';
import {
  boxFlux,
  circleRectArea,
  enclosedSource,
  SPEED_PROFILES,
  START_PROFILES,
  FV_MODES,
  createFV,
  resetFV,
  stepFV,
  massFV,
  faceLeak,
  exactFV,
  BUDGET_FLOWS,
  makeBudgetFlow,
  createBudget,
  momentumBudget,
  cylinderForce,
} from '../../aids/fluid-course/src/sims/ch-conservation.js';

// A small deterministic generator so the random boxes are the same every run.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function onePass(n, speed, mode, start = 'block') {
  const s = createFV(n, { speed, start });
  const steps = Math.round(s.period / s.dt);
  for (let k = 0; k < steps; k++) stepFV(s, mode);
  return s;
}

test('box flux: zero net outflow for every divergence-free flow, any box', () => {
  const r = lcg(7);
  for (const id of ['uniform', 'rotation', 'rankine', 'lamb-oseen', 'stagnation', 'couette', 'poiseuille', 'cylinder', 'taylor-green', 'double-gyre']) {
    const flow = makeFlow(id);
    const d = flow.domain;
    for (let k = 0; k < 40; k++) {
      const cx = d.xmin + (d.xmax - d.xmin) * r();
      const cy = d.ymin + (d.ymax - d.ymin) * r();
      const w = 0.1 + 0.8 * r();
      const f = boxFlux(flow, { x0: cx - w / 2, x1: cx + w / 2, y0: cy - w / 2, y1: cy + w / 2 }, 0.3);
      const gross = Math.abs(f.left) + Math.abs(f.right) + Math.abs(f.bottom) + Math.abs(f.top);
      assert.ok(Math.abs(f.net) <= 1e-11 * Math.max(gross, 1e-12), `${id}: net ${f.net} gross ${gross}`);
      assert.equal(enclosedSource(flow, {}), 0);
    }
  }
});

test('box flux: uniform stream gives U × face length in and out', () => {
  const flow = makeFlow('uniform', { U: 1.5, V: -0.5 });
  const f = boxFlux(flow, { x0: -0.3, x1: 0.5, y0: -0.2, y1: 0.4 });
  assert.ok(Math.abs(f.left - -1.5 * 0.6) < 1e-13, `left ${f.left}`);
  assert.ok(Math.abs(f.right - 1.5 * 0.6) < 1e-13, `right ${f.right}`);
  assert.ok(Math.abs(f.bottom - 0.5 * 0.8) < 1e-13, `bottom ${f.bottom}`);
  assert.ok(Math.abs(f.top - -0.5 * 0.8) < 1e-13, `top ${f.top}`);
  assert.ok(Math.abs(f.net) < 1e-13);
});

test('box flux: the source puts out m through any box around its core, m/2 through a box whose edge halves it', () => {
  const flow = makeFlow('source');
  const m = flow.params.m;
  const around = boxFlux(flow, { x0: -0.5, x1: 0.5, y0: -0.4, y1: 0.6 });
  assert.ok(Math.abs(around.net - m) < 1e-12, `${around.net}`);
  const half = boxFlux(flow, { x0: 0, x1: 0.6, y0: -0.4, y1: 0.4 });
  assert.ok(Math.abs(half.net - m / 2) < 1e-12, `${half.net}`);
  const quarter = boxFlux(flow, { x0: 0, x1: 0.6, y0: 0, y1: 0.4 });
  assert.ok(Math.abs(quarter.net - m / 4) < 1e-12, `${quarter.net}`);
  const away = boxFlux(flow, { x0: 0.5, x1: 1, y0: 0.2, y1: 0.9 });
  assert.ok(Math.abs(away.net) < 1e-12, `${away.net}`);
  // With a free stream (the Rankine half-body) the faces change, the net does not.
  const hb = makeFlow('source', { Uinf: 1 });
  const f = boxFlux(hb, { x0: -0.3, x1: 0.4, y0: -0.4, y1: 0.5 });
  assert.ok(Math.abs(f.net - m) < 1e-11, `${f.net}`);
});

test('divergence theorem: box outflow equals the enclosed source for random boxes cutting the core', () => {
  const r = lcg(11);
  const flow = makeFlow('source', { Uinf: 0.7 });
  let worst = 0;
  for (let k = 0; k < 300; k++) {
    const cx = -0.3 + 0.6 * r();
    const cy = -0.3 + 0.6 * r();
    const w = 0.05 + 0.5 * r();
    const h = 0.05 + 0.5 * r();
    const box = { x0: cx - w / 2, x1: cx + w / 2, y0: cy - h / 2, y1: cy + h / 2 };
    const f = boxFlux(flow, box, 0, {}, 16);
    worst = Math.max(worst, Math.abs(f.net - enclosedSource(flow, box)));
  }
  assert.ok(worst < 1e-9, `worst ${worst}`);
});

test('circleRectArea: whole disc, half, quarter, none, and a Monte Carlo check', () => {
  const r = 0.3;
  assert.ok(Math.abs(circleRectArea(0, 0, r, -1, 1, -1, 1) - Math.PI * r * r) < 1e-15);
  assert.ok(Math.abs(circleRectArea(0, 0, r, 0, 1, -1, 1) - (Math.PI * r * r) / 2) < 1e-15);
  assert.ok(Math.abs(circleRectArea(0, 0, r, 0, 1, 0, 1) - (Math.PI * r * r) / 4) < 1e-15);
  assert.equal(circleRectArea(0, 0, r, 0.4, 1, 0, 1), 0);
  const rnd = lcg(3);
  for (let k = 0; k < 20; k++) {
    const x0 = -0.4 + 0.5 * rnd();
    const y0 = -0.4 + 0.5 * rnd();
    const x1 = x0 + 0.05 + 0.5 * rnd();
    const y1 = y0 + 0.05 + 0.5 * rnd();
    const exact = circleRectArea(0.02, -0.01, r, x0, x1, y0, y1);
    // Midpoint grid count, 600 × 600.
    const N = 600;
    let c = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const x = x0 + ((i + 0.5) * (x1 - x0)) / N - 0.02;
        const y = y0 + ((j + 0.5) * (y1 - y0)) / N + 0.01;
        if (x * x + y * y < r * r) c++;
      }
    }
    const est = (c * (x1 - x0) * (y1 - y0)) / (N * N);
    assert.ok(Math.abs(est - exact) < 2e-4, `${exact} vs ${est}`);
  }
});

test('finite volumes: the flux form conserves the total to round-off for every profile', () => {
  for (const speed of Object.keys(SPEED_PROFILES)) {
    for (const start of Object.keys(START_PROFILES)) {
      for (const n of [25, 50, 100, 200]) {
        const s = createFV(n, { speed, start });
        const m0 = s.mass0;
        for (let k = 0; k < 3 * Math.round(s.period / s.dt); k++) stepFV(s, 'conservative');
        assert.ok(Math.abs(massFV(s) / m0 - 1) < 1e-13, `${speed} ${start} ${n}: ${massFV(s) / m0 - 1}`);
      }
    }
  }
});

test('finite volumes: in the flux form what one cell sends its neighbour receives', () => {
  const s = createFV(50, { speed: 'zone' });
  for (let k = 0; k < 20; k++) stepFV(s, 'conservative');
  let sum = 0;
  for (let j = 0; j < s.n; j++) {
    assert.equal(faceLeak(s, j), 0);
    sum += s.send[j];
  }
  assert.ok(sum > 0);
});

test('finite volumes: the product-rule update leaks mass at first order (the numbers the chapter quotes)', () => {
  const quoted = { zone: { 50: 0.266, 100: 0.122 }, wave: { 50: 0.094, 100: 0.048 } };
  for (const speed of ['zone', 'wave']) {
    const drift = [25, 50, 100, 200, 400].map((n) => {
      const s = onePass(n, speed, 'product');
      return massFV(s) / s.mass0 - 1;
    });
    for (const d of drift) assert.ok(d > 0.01, `${speed}: ${drift}`);
    // Each halving of Δx roughly halves the leak: first order.
    for (let k = 1; k < drift.length; k++) {
      const ratio = drift[k - 1] / drift[k];
      assert.ok(ratio > 1.8 && ratio < 2.6, `${speed} ratio ${ratio}`);
    }
    assert.ok(Math.abs(drift[1] - quoted[speed][50]) < 0.003, `${speed} n=50 ${drift[1]}`);
    assert.ok(Math.abs(drift[2] - quoted[speed][100]) < 0.003, `${speed} n=100 ${drift[2]}`);
  }
});

test('finite volumes: the face mismatch accounts exactly for the product-rule drift', () => {
  const s = createFV(50, { speed: 'zone' });
  for (let k = 0; k < 40; k++) {
    const before = massFV(s);
    stepFV(s, 'product');
    let made = 0;
    for (let j = 0; j < s.n; j++) made += faceLeak(s, j);
    assert.ok(Math.abs(massFV(s) - before - made) < 1e-14, `step ${k}`);
  }
});

test('finite volumes: with constant speed every update is the same scheme', () => {
  const a = createFV(64, { speed: 'uniform' });
  const b = createFV(64, { speed: 'uniform' });
  const c = createFV(64, { speed: 'uniform' });
  for (let k = 0; k < 50; k++) {
    stepFV(a, 'conservative');
    stepFV(b, 'product');
    stepFV(c, 'advective');
  }
  for (let j = 0; j < 64; j++) {
    assert.ok(Math.abs(a.q[j] - b.q[j]) < 1e-14);
    assert.ok(Math.abs(a.q[j] - c.q[j]) < 1e-14);
  }
  assert.ok(Object.keys(FV_MODES).length === 3);
});

test('finite volumes: the exact solution conserves the total and the flux form converges to it at first order', () => {
  const N = 20000;
  const xs = new Float64Array(N);
  const out = new Float64Array(N);
  for (let k = 0; k < N; k++) xs[k] = (k + 0.5) / N;
  for (const speed of ['zone', 'wave']) {
    const s = createFV(100, { speed, start: 'bump' });
    for (const t of [0, 0.3, 0.77, s.period]) {
      exactFV(s, xs, out, t);
      let m = 0;
      for (let k = 0; k < N; k++) m += out[k] / N;
      assert.ok(Math.abs(m / s.mass0 - 1) < 2e-4, `${speed} t=${t}: ${m} vs ${s.mass0}`);
    }
    // Upwinding smears the profile (numerical diffusion; see the advection chapter), and the
    // narrow bump is squeezed further in the slow parts, so the error falls
    // slowly at first; it falls steadily, and the observed order climbs
    // towards 1 as the grid resolves the bump.
    const errs = [100, 200, 400, 800, 1600, 3200].map((n) => {
      const st = onePass(n, speed, 'conservative', 'bump');
      const ex = exactFV(st, st.x, new Float64Array(n));
      let e = 0;
      for (let j = 0; j < n; j++) e += Math.abs(st.q[j] - ex[j]) / n;
      return e;
    });
    for (let k = 1; k < errs.length; k++) assert.ok(errs[k] < errs[k - 1], `${speed} errors ${errs}`);
    const p = Math.log2(errs[4] / errs[5]);
    assert.ok(p > 0.7 && p < 1.2, `${speed} observed order ${p} (${errs})`);
  }
});

test('finite volumes: reset restores the start', () => {
  const s = createFV(40, { speed: 'wave' });
  const q0 = Float64Array.from(s.q);
  for (let k = 0; k < 30; k++) stepFV(s, 'product');
  resetFV(s);
  assert.deepEqual(Array.from(s.q), Array.from(q0));
  assert.equal(s.t, 0);
});

test('momentum budget: every exact solution balances to truncation level', () => {
  const r = lcg(5);
  const b = createBudget();
  for (const id of Object.keys(BUDGET_FLOWS)) {
    for (const nu of [0.001, 0.01, 0.1]) {
      const flow = makeBudgetFlow(id, nu);
      const d = flow.domain;
      for (let k = 0; k < 60; k++) {
        const x = d.xmin + (d.xmax - d.xmin) * (0.05 + 0.9 * r());
        const y = d.ymin + (d.ymax - d.ymin) * (0.05 + 0.9 * r());
        if (id === 'cylinder') {
          const rr = Math.hypot(x - flow.params.x0, y - flow.params.y0);
          if (rr < 1.05 * flow.params.R) continue;
        }
        momentumBudget(id, flow, x, y, 0.7, nu, b);
        const res = Math.hypot(b.residual[0], b.residual[1]);
        assert.ok(res <= 1e-6 * b.scale + 1e-9, `${id} ν=${nu} at (${x}, ${y}): residual ${res}, scale ${b.scale}`);
      }
    }
  }
});

test('momentum budget: dropping the viscous term breaks the viscous flows but not the potential flow or rigid rotation', () => {
  const b = createBudget();
  const nu = 0.02;
  const at = { 'taylor-green': [0.3, 0.6], channel: [1, 0.3], 'channel-gravity': [1, 0.3], 'lamb-oseen': [0.4, 0.2], cylinder: [0.2, 0.7], rotation: [0.5, -0.3] };
  for (const id of Object.keys(BUDGET_FLOWS)) {
    const flow = makeBudgetFlow(id, nu);
    const [x, y] = at[id];
    momentumBudget(id, flow, x, y, 0.5, nu, b, { viscous: false });
    const res = Math.hypot(b.residual[0], b.residual[1]);
    if (id === 'cylinder' || id === 'rotation') assert.ok(res < 1e-6 * b.scale, `${id} Euler residual ${res}`);
    else assert.ok(res > 1e-3 * b.scale, `${id} Euler residual ${res}`);
  }
});

test('momentum budget: the term balances the chapter names', () => {
  const b = createBudget();
  const nu = 0.01;
  // Taylor–Green: ∂u/∂t = ν∇²u and (u·∇)u = −∇p/ρ, componentwise.
  const tg = makeBudgetFlow('taylor-green', nu);
  momentumBudget('taylor-green', tg, 0.3, 0.7, 1.1, nu, b);
  for (let c = 0; c < 2; c++) {
    assert.ok(Math.abs(b.local[c] - b.viscous[c]) < 1e-7);
    assert.ok(Math.abs(b.convective[c] - b.pressure[c]) < 1e-7);
  }
  // Channel: no acceleration at all; pressure push = −viscous term.
  const ch = makeBudgetFlow('channel', nu);
  momentumBudget('channel', ch, 1, 0.2, 0, nu, b);
  assert.ok(Math.abs(b.convective[0]) < 1e-9 && Math.abs(b.local[0]) === 0);
  assert.ok(Math.abs(b.pressure[0] + b.viscous[0]) < 1e-8 && b.pressure[0] > 0);
  // Rotation: the pressure gradient is the whole centripetal acceleration.
  const ro = makeBudgetFlow('rotation', nu);
  momentumBudget('rotation', ro, 0.6, 0, 0, nu, b);
  assert.ok(Math.abs(b.convective[0] + 0.6) < 1e-9 && Math.abs(b.pressure[0] + 0.6) < 1e-12);
  // Cylinder: ν∇²u = 0 whatever ν is.
  const cy = makeBudgetFlow('cylinder', 0.5);
  momentumBudget('cylinder', cy, 0.4, 0.6, 0, 0.5, b);
  assert.ok(Math.hypot(b.viscous[0], b.viscous[1]) < 1e-6 * b.scale);
});

test('cylinder: zero drag for any circulation, lift −ρUΓ (Kutta–Joukowski)', () => {
  const flow = makeFlow('cylinder');
  for (const G of [0, -1, -2, -4, -2 * Math.PI, -4 * Math.PI, -8, 3, 9]) {
    flow.params.Gamma = G;
    const f = cylinderForce(flow, 256, 1.2);
    assert.ok(Math.abs(f.drag) < 1e-12, `Γ=${G}: drag ${f.drag}`);
    assert.ok(Math.abs(f.lift - -1.2 * flow.params.U * G) < 1e-12 * Math.max(1, Math.abs(G)), `Γ=${G}: lift ${f.lift}`);
  }
});
