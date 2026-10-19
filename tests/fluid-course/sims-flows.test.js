// Kinematics and continuum-hypothesis kernels (src/sims/flows.js and
// src/sims/molecules.js). Each test checks a claim the course makes: exact
// growth factors of explicit integrators in rotation, observed orders of
// accuracy, incompressibility and stream-function consistency of the analytic
// fields, potential-flow surface pressure and Kutta–Joukowski lift, area
// preservation of material loops, 1/√N density fluctuations, energy
// conservation of velocity Verlet, and the textbook gas numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng, observedOrders, drain, countEvents } from '../../aids/fluid-course/src/sims/util.js';
import {
  FLOWS,
  FLOW_IDS,
  makeFlow,
  makeScalar,
  SCALARS,
  INTEGRATORS,
  INTEGRATOR_IDS,
  rotationAmplification,
  rkStep,
  pathline,
  tracePathline,
  streamline,
  traceStreamline,
  createStreakline,
  streaklineReset,
  streaklineStep,
  streakIndex,
  divergence,
  curl,
  velocityGradient,
  okuboWeiss,
  materialDerivative,
  createMaterialLoop,
  resetMaterialLoop,
  advectLoop,
  advectParticles,
  loopArea,
  refineLoop,
  polygonArea,
  sampleScalarField,
  sampleVelocityField,
  ein,
  IMPLICIT_STATUS,
  PARTICLE_PRESETS,
} from '../../aids/fluid-course/src/sims/flows.js';
import {
  KB,
  LOSCHMIDT,
  AIR,
  meanFreePath,
  meanSpeed,
  knudsen,
  knudsenRegime,
  KNUDSEN_REGIMES,
  moleculesInCube,
  boxForFluctuation,
  numberDensity,
  poissonSample,
  createPoissonGas,
  countInBox,
  sampleDensity,
  densitySamples,
  densitySweep,
  GAS_FORMULAS,
  fitPowerLaw,
  createMD,
  mdStep,
  mdEnergy,
  mdMeanFlow,
  MD_PRESETS,
  cellAverages,
  createCellAverages,
  createAccumulator,
  accumulate,
  accumulatorAverages,
} from '../../aids/fluid-course/src/sims/molecules.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

const TAU = 2 * Math.PI;
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''}: ${a} vs ${b} (tol ${tol})`);

// Points in a flow's domain away from its singular points, kinks and branch
// cuts (where finite differences of a non-smooth field are meaningless).
function regularPoints(flow, count, seed = 3, h = 1e-5) {
  const rand = rng(seed);
  const d = flow.domain;
  const p = flow.params;
  const pts = [];
  while (pts.length < count) {
    const x = d.xmin + rand() * (d.xmax - d.xmin);
    const y = d.ymin + rand() * (d.ymax - d.ymin);
    const t = rand() * 10;
    const dx = x - (p.x0 ?? 0);
    const dy = y - (p.y0 ?? 0);
    const r = Math.hypot(dx, dy);
    if (flow.id === 'rankine' && (r < 0.05 || Math.abs(r - p.a) < 1e3 * h)) continue;
    if (flow.id === 'source' && (r < 0.05 || Math.abs(r - p.a) < 1e3 * h)) continue;
    if (flow.id === 'cylinder' && r < p.R + 1e3 * h) continue;
    pts.push([x, y, t]);
  }
  return pts;
}

// ---- integrators in solid-body rotation -----------------------------------------

test('explicit Euler in solid-body rotation multiplies the radius by exactly √(1 + (ΩΔt)²) per step', () => {
  for (const [Omega, dt, x0, y0, cx, cy] of [
    [1, 0.1, 1, 0, 0, 0],
    [2.5, 0.03, 0.3, -0.7, 0.2, 0.1],
    [-1, 0.5, 0, 2, 0, 0],
  ]) {
    const flow = makeFlow('rotation', { Omega, x0: cx, y0: cy });
    const factor = Math.sqrt(1 + (Omega * dt) ** 2);
    let x = x0;
    let y = y0;
    const out = new Float64Array(2);
    for (let n = 0; n < 50; n++) {
      const r = Math.hypot(x - cx, y - cy);
      rkStep(flow, x, y, n * dt, dt, 'euler', out);
      [x, y] = out;
      close(Math.hypot(x - cx, y - cy) / r, factor, 1e-13, `Euler step ${n}, ΩΔt = ${Omega * dt}`);
    }
    close(rotationAmplification('euler', Omega * dt), factor, 1e-15, 'stability function');
  }
});

test('every integrator scales the radius per step by its stability function |R(iΩΔt)|; RK4 drift is tiny', () => {
  const flow = makeFlow('rotation', { Omega: 1 });
  const out = new Float64Array(2);
  for (const id of INTEGRATOR_IDS) {
    for (const w of [0.05, 0.2, 0.7, 1.9, 3]) {
      rkStep(flow, 1, 0, 0, w, id, out);
      close(Math.hypot(out[0], out[1]), rotationAmplification(id, w), 1e-13, `${id} at ΩΔt = ${w}`);
    }
  }
  // Closed forms quoted in the metadata.
  const w = 0.3;
  close(rotationAmplification('midpoint', w), Math.sqrt(1 + w ** 4 / 4), 1e-15, 'midpoint');
  close(rotationAmplification('heun', w), Math.sqrt(1 + w ** 4 / 4), 1e-15, 'heun');
  close(rotationAmplification('rk4', w), Math.sqrt(1 - w ** 6 / 72 + w ** 8 / 576), 1e-15, 'rk4');
  // RK4 over 1000 steps at ΩΔt = 0.1 (about 16 turns): radius loses < 1e-5.
  let x = 1;
  let y = 0;
  for (let n = 0; n < 1000; n++) {
    rkStep(flow, x, y, n * 0.1, 0.1, 'rk4', out);
    [x, y] = out;
  }
  const drift = Math.hypot(x, y) - 1;
  assert.ok(drift < 0 && Math.abs(drift) < 1e-5, `RK4 radius drift ${drift}`);
  close(drift, Math.pow(rotationAmplification('rk4', 0.1), 1000) - 1, 1e-12, 'RK4 drift equals |R|^n − 1');
  // Implicit midpoint keeps the radius to round-off.
  x = 1;
  y = 0;
  for (let n = 0; n < 1000; n++) {
    rkStep(flow, x, y, n * 0.1, 0.1, 'implicit-midpoint', out);
    [x, y] = out;
  }
  close(Math.hypot(x, y), 1, 1e-12, 'implicit midpoint radius');
});

test('observed orders of accuracy: Euler 1, midpoint 2, Heun 2, RK4 4, implicit midpoint 2', () => {
  const rot = makeFlow('rotation', { Omega: 1 });
  const gyre = makeFlow('double-gyre');
  const out = new Float64Array(2);
  const endPoint = (flow, x0, y0, T, n, method) => {
    let x = x0;
    let y = y0;
    const dt = T / n;
    for (let k = 0; k < n; k++) {
      rkStep(flow, x, y, k * dt, dt, method, out);
      [x, y] = out;
    }
    return [x, y];
  };
  // Double gyre: reference by RK4 with a much smaller step.
  const ref = endPoint(gyre, 0.6, 0.3, 10, 20000, 'rk4');
  for (const id of INTEGRATOR_IDS) {
    const expected = INTEGRATORS[id].order;
    const errRot = [];
    const errGyre = [];
    for (const n of [40, 80, 160, 320]) {
      const [x, y] = endPoint(rot, 1, 0, 2, n, id);
      errRot.push(Math.hypot(x - Math.cos(2), y - Math.sin(2)));
      const [gx, gy] = endPoint(gyre, 0.6, 0.3, 10, n * 2, id);
      errGyre.push(Math.hypot(gx - ref[0], gy - ref[1]));
    }
    const pr = observedOrders(errRot).at(-1);
    const pg = observedOrders(errGyre).at(-1);
    close(pr, expected, 0.1, `${id} order in rotation`);
    close(pg, expected, 0.15, `${id} order in the double gyre`);
  }
});

test('implicit midpoint is exact in linear flows at any step: |R(iΩΔt)| = 1, a quarter turn per step at ΩΔt = 2, R(z) = (1 + z/2)/(1 − z/2) in strain', () => {
  const rot = makeFlow('rotation', { Omega: 1 });
  const out = new Float64Array(2);
  IMPLICIT_STATUS.failures = 0;
  for (const w of [0.7, 1.9, 2, 3, 6]) {
    let x = 1;
    let y = 0;
    let angle = 0;
    for (let n = 0; n < 1000; n++) {
      rkStep(rot, x, y, n * w, w, 'implicit-midpoint', out);
      angle += Math.atan2(x * out[1] - y * out[0], x * out[0] + y * out[1]);
      [x, y] = out;
      assert.ok(IMPLICIT_STATUS.converged, `converged at ΩΔt = ${w}`);
    }
    close(Math.hypot(x, y), 1, 1e-12, `radius after 1000 steps at ΩΔt = ${w}`);
    // The Cayley transform turns by 2 arctan(ΩΔt/2) per step (phase error only).
    close(angle / 1000, 2 * Math.atan(w / 2), 1e-12, `turn per step at ΩΔt = ${w}`);
  }
  assert.equal(IMPLICIT_STATUS.failures, 0);
  // Material-loop area at a step where explicit Euler multiplies it by 7.25.
  const loop = createMaterialLoop({ cx: 0.6, cy: 0.2, r: 0.3, n: 64 });
  const A0 = loopArea(loop);
  for (let n = 0; n < 50; n++) advectLoop(loop, rot, n * 2.5, 2.5, 'implicit-midpoint');
  close(loopArea(loop) / A0, 1, 1e-12, 'loop area at ΩΔt = 2.5');
  // Pure strain u = (ax, −ay): x → x (1 + aΔt/2)/(1 − aΔt/2), y → y (1 − aΔt/2)/(1 + aΔt/2).
  const strain = makeFlow('stagnation', { a: 1 });
  for (const z of [0.5, 1.9, 2.5, 4]) {
    rkStep(strain, 0.5, 0.5, 0, z, 'implicit-midpoint', out);
    close(out[0], (0.5 * (1 + z / 2)) / (1 - z / 2), 1e-12 * Math.abs(out[0]) + 1e-15, `x at aΔt = ${z}`);
    close(out[1], (0.5 * (1 - z / 2)) / (1 + z / 2), 1e-15, `y at aΔt = ${z}`);
    assert.ok(IMPLICIT_STATUS.converged);
  }
  // At the pole aΔt = 2 there is no solution: reported, not hidden.
  rkStep(strain, 0.5, 0.5, 0, 2, 'implicit-midpoint', out);
  assert.equal(IMPLICIT_STATUS.converged, false, 'aΔt = 2 has no solution');
  assert.equal(IMPLICIT_STATUS.failures, 1);
  IMPLICIT_STATUS.failures = 0;
  // A nonlinear vortex core at ΩΔt ≈ 1.9: the Rankine core is solid-body
  // rotation at Ω = Γ/(2πa²) = 16 (a step where fixed-point iteration fails).
  const rank = makeFlow('rankine');
  let x = 0.1;
  let y = 0;
  for (let n = 0; n < 50; n++) {
    rkStep(rank, x, y, 0, 0.12, 'implicit-midpoint', out);
    [x, y] = out;
  }
  close(Math.hypot(x, y), 0.1, 1e-13, 'Rankine core radius at ΩΔt = 1.92');
});

// ---- the analytic fields ---------------------------------------------------------

// |∇·u| relative to the size of the velocity gradient: central differences
// are accurate to ~h²/r² near a singularity at distance r.
const relDiv = (flow, x, y, t) => {
  const g = velocityGradient(flow, x, y, t, 1e-5, new Float64Array(4));
  return Math.abs(g[0] + g[3]) / (1 + Math.abs(g[0]) + Math.abs(g[1]) + Math.abs(g[2]) + Math.abs(g[3]));
};

test('every documented divergence-free field has zero numerical divergence', () => {
  for (const id of FLOW_IDS) {
    const flow = makeFlow(id);
    if (!flow.divergenceFree) continue;
    for (const [x, y, t] of regularPoints(flow, 300)) {
      const d = divergence(flow, x, y, t, 1e-5);
      assert.ok(Math.abs(d) < 1e-6, `${id}: ∇·u = ${d} at (${x}, ${y}, ${t})`);
    }
  }
  // Also with non-default parameters, including a point vortex (a = 0) and
  // a lifting cylinder.
  for (const [id, params] of [
    ['rankine', { a: 0, Gamma: -3 }],
    ['cylinder', { Gamma: 5, U: 2 }],
    ['taylor-green', { nu: 0.05, L: 0.7 }],
    ['double-gyre', { epsilon: 0.1, A: 0.3 }],
  ]) {
    const flow = makeFlow(id, params);
    for (const [x, y, t] of regularPoints(flow, 200, 9)) {
      assert.ok(relDiv(flow, x, y, t) < 1e-7, `${id} ${JSON.stringify(params)}`);
    }
  }
});

test('source: divergence is zero off the source, m/(πa²) in its core, and the net outflow through any loop around it is m', () => {
  for (const a of [0.15, 0]) {
    const flow = makeFlow('source', { m: 3, a, Uinf: 0.4 });
    for (const [x, y, t] of regularPoints(flow, 200)) {
      const r = Math.hypot(x, y);
      if (r < a) continue;
      assert.ok(Math.abs(divergence(flow, x, y, t)) < 1e-6, 'zero off the source');
    }
    // Outflow ∮ u·n ds through circles by the trapezoid rule (spectrally
    // accurate for periodic integrands).
    const flux = (cx, cy, R, n = 400) => {
      const v = new Float64Array(2);
      let s = 0;
      for (let k = 0; k < n; k++) {
        const th = (TAU * k) / n;
        flow.velocity(cx + R * Math.cos(th), cy + R * Math.sin(th), 0, v);
        s += v[0] * Math.cos(th) + v[1] * Math.sin(th);
      }
      return (s * TAU * R) / n;
    };
    close(flux(0, 0, 1), 3, 1e-10, `outflow around the source (a = ${a})`);
    close(flux(0.3, -0.2, 0.9), 3, 1e-6, 'off-centre loop around the source');
    close(flux(1.5, 0.5, 0.4), 0, 1e-10, 'loop that misses the source');
  }
  const cored = makeFlow('source', { m: 3, a: 0.2 });
  for (const [x, y] of [[0, 0], [0.05, -0.1], [-0.12, 0.08]]) {
    close(divergence(cored, x, y, 0), 3 / (Math.PI * 0.04), 1e-6, 'divergence inside the core');
    close(cored.divergence(x, y), 3 / (Math.PI * 0.04), 1e-12, 'exact core divergence');
  }
});

test('stream functions: u = ∂ψ/∂y and v = −∂ψ/∂x wherever ψ is given', () => {
  const h = 1e-5;
  const v = new Float64Array(2);
  for (const id of FLOW_IDS) {
    const flow = makeFlow(id, id === 'cylinder' ? { Gamma: 2 } : {});
    assert.ok(flow.streamfunction, `${id} has a stream function`);
    const scale = id === 'source' ? 10 : 1;
    for (const [x, y, t] of regularPoints(flow, 200, 5)) {
      if (id === 'source' && (Math.hypot(x, y) < flow.params.a || (x < 0 && Math.abs(y) < 0.05))) continue;
      flow.velocity(x, y, t, v);
      const psiY = (flow.streamfunction(x, y + h, t) - flow.streamfunction(x, y - h, t)) / (2 * h);
      const psiX = (flow.streamfunction(x + h, y, t) - flow.streamfunction(x - h, y, t)) / (2 * h);
      close(psiY, v[0], 1e-6 * scale, `${id} u = ψ_y at (${x}, ${y})`);
      close(-psiX, v[1], 1e-6 * scale, `${id} v = −ψ_x at (${x}, ${y})`);
    }
  }
});

test('velocity potentials: u = ∇φ where φ is given', () => {
  const h = 1e-5;
  const v = new Float64Array(2);
  for (const id of FLOW_IDS) {
    const flow = makeFlow(id, id === 'cylinder' ? { Gamma: -1.5 } : {});
    if (!flow.potential) continue;
    for (const [x, y, t] of regularPoints(flow, 200, 6)) {
      if (x < 0 && Math.abs(y) < 0.05) continue; // branch cut of θ
      flow.velocity(x, y, t, v);
      close((flow.potential(x + h, y, t) - flow.potential(x - h, y, t)) / (2 * h), v[0], 1e-6, `${id} φ_x`);
      close((flow.potential(x, y + h, t) - flow.potential(x, y - h, t)) / (2 * h), v[1], 1e-6, `${id} φ_y`);
    }
  }
});

test('vorticity matches the numerical curl ∂v/∂x − ∂u/∂y', () => {
  for (const id of FLOW_IDS) {
    const flow = makeFlow(id);
    for (const [x, y, t] of regularPoints(flow, 200, 7)) {
      const w = flow.vorticity(x, y, t);
      close(curl(flow, x, y, t), w, 1e-6 * Math.max(1, Math.abs(w)), `${id} at (${x}, ${y}, ${t})`);
    }
  }
  // ω = 2Ω for rotation, ω = 2k²ψ for the cellular flow.
  close(makeFlow('rotation', { Omega: 1.7 }).vorticity(0.3, 0.1, 0), 3.4, 1e-15, 'rotation');
  const tg = makeFlow('taylor-green', { L: 0.8 });
  const k = Math.PI / 0.8;
  close(tg.vorticity(0.3, 0.5, 0), 2 * k * k * tg.streamfunction(0.3, 0.5, 0), 1e-12, 'Taylor–Green ω = 2k²ψ');
});

test('Lamb–Oseen and decaying Taylor–Green are exact Navier–Stokes solutions: ∂ω/∂t + u·∇ω = ν∇²ω', () => {
  const v = new Float64Array(2);
  for (const flow of [makeFlow('lamb-oseen', { nu: 0.02, t0: 3 }), makeFlow('taylor-green', { nu: 0.05 })]) {
    const nu = flow.params.nu;
    const w = flow.vorticity;
    const h = 1e-3;
    for (const [x, y, t] of regularPoints(flow, 50, 11)) {
      flow.velocity(x, y, t, v);
      const wt = (w(x, y, t + h) - w(x, y, t - h)) / (2 * h);
      const wx = (w(x + h, y, t) - w(x - h, y, t)) / (2 * h);
      const wy = (w(x, y + h, t) - w(x, y - h, t)) / (2 * h);
      const lap = (w(x + h, y, t) + w(x - h, y, t) + w(x, y + h, t) + w(x, y - h, t) - 4 * w(x, y, t)) / (h * h);
      const scale = Math.abs(wt) + Math.abs(nu * lap) + 1e-3;
      assert.ok(Math.abs(wt + v[0] * wx + v[1] * wy - nu * lap) < 1e-4 * scale + 1e-6, `${flow.id} vorticity equation`);
    }
  }
  // The Lamb–Oseen vorticity carries total circulation Γ at every time.
  const lo = makeFlow('lamb-oseen', { Gamma: 2, nu: 0.01, t0: 1 });
  for (const t of [0, 5, 20]) {
    const c = 4 * 0.01 * (t + 1);
    let s = 0;
    const n = 4000;
    const rmax = 8 * Math.sqrt(c);
    for (let k = 0; k < n; k++) {
      const r = ((k + 0.5) * rmax) / n;
      s += lo.vorticity(r, 0, t) * TAU * r * (rmax / n);
    }
    close(s, 2, 1e-6, `Lamb–Oseen circulation at t = ${t}`);
  }
  // Ein(s) = ∫₀ˢ (1 − e^{−u})/u du, cross-checked by quadrature on both branches.
  const f = (u) => (u === 0 ? 1 : -Math.expm1(-u) / u);
  for (const s of [0.3, 1, 1.0001, 4, 25]) {
    const n = 4000; // composite Simpson
    let q = f(0) + f(s);
    for (let k = 1; k < n; k++) q += (k % 2 ? 4 : 2) * f((k * s) / n);
    close(ein(s), (q * s) / (3 * n), 1e-11, `Ein(${s})`);
  }
  close(ein(25), Math.log(25) + 0.5772156649015329, 1e-11, 'Ein(s) → ln s + γ');
});

test('slider extremes stay finite: point-vortex limits (ν = 0, a = 0), cylinder with U = 0, steady flags', () => {
  const v = new Float64Array(2);
  for (const [id, params] of [
    ['lamb-oseen', { nu: 0 }],
    ['lamb-oseen', { t0: 0 }],
    ['rankine', { a: 0 }],
    ['source', { a: 0 }],
    ['cylinder', { U: 0, Gamma: 3 }],
    ['cylinder', { U: 0, Gamma: 0 }],
    ['taylor-green', { nu: 0 }],
    ['double-gyre', { epsilon: 0 }],
  ]) {
    const flow = makeFlow(id, params);
    const p = flow.params;
    // The singular centre itself (velocity only), then generic points.
    flow.velocity(p.x0 ?? 0, p.y0 ?? 0, 0, v);
    assert.ok(Number.isFinite(v[0]) && Number.isFinite(v[1]), `${id} ${JSON.stringify(params)} velocity at the centre`);
    for (const [x, y] of regularPoints(flow, 50, 29)) {
      for (const t of [0, 1.5]) {
        flow.velocity(x, y, t, v);
        assert.ok(Number.isFinite(v[0]) && Number.isFinite(v[1]), `${id} velocity`);
        assert.ok(Number.isFinite(flow.streamfunction(x, y, t)), `${id} ${JSON.stringify(params)} ψ at (${x}, ${y}, ${t})`);
        assert.ok(Number.isFinite(flow.vorticity(x, y, t)), `${id} ${JSON.stringify(params)} ω`);
      }
    }
  }
  // ν = 0 Lamb–Oseen is the point vortex: u_θ = Γ/2πr, ω = 0, steady, and ψ
  // differs from the Rankine a = 0 one by nothing at all.
  const lo = makeFlow('lamb-oseen', { nu: 0, Gamma: 2 });
  const pv = makeFlow('rankine', { a: 0, Gamma: 2 });
  assert.equal(lo.steady, true);
  assert.equal(makeFlow('lamb-oseen').steady, false);
  const w = new Float64Array(2);
  for (const [x, y] of [[0.3, 0.4], [-1, 0.2], [0.05, -0.02]]) {
    lo.velocity(x, y, 3, v);
    pv.velocity(x, y, 0, w);
    close(v[0], w[0], 1e-14, 'u');
    close(v[1], w[1], 1e-14, 'v');
    close(lo.streamfunction(x, y, 3), pv.streamfunction(x, y), 1e-14, 'ψ');
    assert.equal(lo.vorticity(x, y, 3), 0);
  }
  // At small ν the core is tiny but the far field is the same point vortex.
  const thin = makeFlow('lamb-oseen', { nu: 1e-9, Gamma: 2 });
  thin.velocity(0.3, 0.4, 0, v);
  pv.velocity(0.3, 0.4, 0, w);
  close(v[0], w[0], 1e-14, 'thin-core far field');
  assert.equal(ein(Infinity), Infinity);
  // Cylinder at U = 0: no stagnation points, no pressure coefficient.
  const still = makeFlow('cylinder', { U: 0, Gamma: 3 });
  assert.deepEqual(still.stagnationPoints(), []);
  assert.deepEqual(makeFlow('cylinder', { U: 0 }).stagnationPoints(), []);
  assert.ok(Number.isNaN(still.surfaceCp(0.3)));
  assert.ok(Number.isNaN(still.pressureCoefficient(1, 1)));
});

test('potential flow past a cylinder: Cp = 1 − 4 sin²θ on the surface, no drag, Kutta–Joukowski lift', () => {
  const U = 1.3;
  const R = 0.5;
  const rho = 1.2;
  const flow = makeFlow('cylinder', { U, R, Gamma: 0 });
  const v = new Float64Array(2);
  for (let k = 0; k < 72; k++) {
    const th = (TAU * k) / 72;
    const x = R * Math.cos(th);
    const y = R * Math.sin(th);
    flow.velocity(x, y, 0, v);
    // Surface is a streamline: no normal velocity.
    close(v[0] * Math.cos(th) + v[1] * Math.sin(th), 0, 1e-12, 'u·n = 0 on the surface');
    const cp = 1 - (v[0] * v[0] + v[1] * v[1]) / (U * U);
    close(cp, 1 - 4 * Math.sin(th) ** 2, 1e-12, `Cp from the field at θ = ${th}`);
    close(flow.surfaceCp(th), cp, 1e-12, 'closed form');
    close(flow.pressureCoefficient(x, y), cp, 1e-12, 'pressureCoefficient');
  }
  // Force per unit span from integrating p = p∞ + ½ρU²Cp around the surface.
  for (const Gamma of [0, 1, -2.5, 4 * Math.PI * R * U * 0.8, -9]) {
    flow.params.Gamma = Gamma;
    let fx = 0;
    let fy = 0;
    const n = 720;
    for (let k = 0; k < n; k++) {
      const th = (TAU * k) / n;
      flow.velocity(R * Math.cos(th), R * Math.sin(th), 0, v);
      const cp = 1 - (v[0] * v[0] + v[1] * v[1]) / (U * U);
      close(flow.surfaceCp(th), cp, 1e-12, 'surface Cp with circulation');
      const p = 0.5 * rho * U * U * cp;
      fx -= p * Math.cos(th) * ((TAU * R) / n);
      fy -= p * Math.sin(th) * ((TAU * R) / n);
    }
    // The displayed formula: Cp = 1 − (2 sin θ − Γ/(2πRU))².
    for (const th of [0.3, 1.2, 2.5, 4]) close(flow.surfaceCp(th), 1 - (2 * Math.sin(th) - Gamma / (TAU * R * U)) ** 2, 1e-12, 'Cp formula with Γ');
    close(fx, 0, 1e-10, `d'Alembert: no drag at Γ = ${Gamma}`);
    close(fy, flow.liftPerSpan(rho), 1e-10, `lift −ρUΓ at Γ = ${Gamma}`);
    close(fy, -rho * U * Gamma, 1e-10, 'Kutta–Joukowski');
    for (const [sx, sy] of flow.stagnationPoints()) {
      flow.velocity(sx, sy, 0, v);
      close(Math.hypot(v[0], v[1]), 0, 1e-12, `stagnation point at Γ = ${Gamma}`);
    }
  }
});

test('the double gyre is periodic in time with period 2π/ω, and genuinely unsteady', () => {
  const flow = makeFlow('double-gyre', { omega: 0.9 });
  const T = TAU / 0.9;
  const a = new Float64Array(2);
  const b = new Float64Array(2);
  let maxHalf = 0;
  for (const [x, y, t] of regularPoints(flow, 200, 13)) {
    flow.velocity(x, y, t, a);
    flow.velocity(x, y, t + T, b);
    close(b[0], a[0], 1e-12, 'u(t + T)');
    close(b[1], a[1], 1e-12, 'v(t + T)');
    flow.velocity(x, y, t + 3 * T, b);
    close(b[0], a[0], 1e-12, 'u(t + 3T)');
    flow.velocity(x, y, t + T / 2, b);
    maxHalf = Math.max(maxHalf, Math.hypot(b[0] - a[0], b[1] - a[1]));
    close(flow.streamfunction(x, y, t + T), flow.streamfunction(x, y, t), 1e-12, 'ψ(t + T)');
  }
  assert.ok(maxHalf > 0.01, 'not periodic with half the period');
  assert.equal(flow.steady, false);
  flow.params.epsilon = 0;
  assert.equal(flow.steady, true, 'ε = 0 freezes the gyres');
  // Walls are streamlines: no flow through the boundary of [0, 2] × [0, 1].
  flow.params.epsilon = 0.25;
  for (let k = 0; k <= 20; k++) {
    const s = k / 20;
    flow.velocity(0, s, 1.3, a);
    close(a[0], 0, 1e-12, 'x = 0');
    flow.velocity(2, s, 1.3, a);
    close(a[0], 0, 1e-12, 'x = 2');
    flow.velocity(2 * s, 0, 1.3, a);
    close(a[1], 0, 1e-12, 'y = 0');
    flow.velocity(2 * s, 1, 1.3, a);
    close(a[1], 0, 1e-12, 'y = 1');
  }
});

// ---- material loops -------------------------------------------------------------------

test('material loop in rotation: Euler grows its area by (1 + (ΩΔt)²) per step, RK4 by |R|², implicit midpoint not at all', () => {
  const flow = makeFlow('rotation', { Omega: 1 });
  const dt = 0.1;
  for (const id of ['euler', 'midpoint', 'rk4', 'implicit-midpoint']) {
    const loop = createMaterialLoop({ cx: 0.6, cy: 0.2, r: 0.3, n: 64 });
    const A0 = loopArea(loop);
    for (let n = 0; n < 100; n++) advectLoop(loop, flow, n * dt, dt, id);
    const ratio = loopArea(loop) / A0;
    close(ratio, Math.pow(rotationAmplification(id, dt), 200), 1e-10, `${id} area ratio`);
    if (id === 'euler') close(ratio, Math.pow(1 + dt * dt, 100), 1e-10, 'Euler (1 + (ΩΔt)²)^n');
    if (id === 'rk4') assert.ok(Math.abs(ratio - 1) < 2e-6, `RK4 area drift ${ratio - 1}`);
  }
});

test('explicit Euler’s area error has the sign of det ∇u: it shrinks loops in pure strain', () => {
  // Linear flows map polygons to polygons exactly, so the shoelace area is
  // the true area: Euler multiplies it by det(I + Δt∇u) = 1 + Δt² det ∇u.
  const a = 1.5;
  const dt = 0.05;
  const flow = makeFlow('stagnation', { a });
  const loop = createMaterialLoop({ cx: 0.1, cy: 0.1, r: 0.2, n: 32 });
  const A0 = loopArea(loop);
  for (let n = 0; n < 20; n++) advectLoop(loop, flow, 0, dt, 'euler');
  close(loopArea(loop) / A0, Math.pow(1 - a * a * dt * dt, 20), 1e-12, 'Euler in strain');
  assert.ok(okuboWeiss(flow, 0.1, 0.1, 0) > 0, 'strain-dominated: Okubo–Weiss Q > 0');
  assert.ok(okuboWeiss(makeFlow('rotation'), 0.1, 0.1, 0) < 0, 'rotation-dominated: Q < 0');
});

test('material loops in nonlinear incompressible flows: RK4 keeps the area, Euler does not', () => {
  // Loops are refined (no segment longer than 0.02) and measured with the
  // curved-chord area, so what remains is integration error, plus the
  // resolution limit of thin filaments in the vortex and the gyre.
  const cases = [
    ['taylor-green', { cx: 0.5, cy: 0.5, r: 0.25 }, 0.02, 200, 1e-6],
    ['lamb-oseen', { cx: 0.4, cy: 0, r: 0.2 }, 0.02, 200, 1e-4],
    ['double-gyre', { cx: 0.5, cy: 0.5, r: 0.2 }, 0.05, 100, 1e-6], // half a period
    ['double-gyre', { cx: 0.5, cy: 0.5, r: 0.2 }, 0.05, 200, 1e-4], // a full period
  ];
  for (const [id, geom, dt, steps, tol] of cases) {
    const flow = makeFlow(id);
    const drift = {};
    for (const m of ['euler', 'rk4', 'implicit-midpoint']) {
      const loop = createMaterialLoop({ ...geom, n: 400, capacity: 20000 });
      for (let n = 0; n < steps; n++) {
        advectLoop(loop, flow, n * dt, dt, m);
        refineLoop(loop, 0.02);
      }
      assert.ok(!loop.saturated);
      drift[m] = loopArea(loop, true) / loop.area0 - 1;
    }
    const where = `${id} for ${steps * dt} time units`;
    assert.ok(Math.abs(drift.rk4) < tol, `${where}: RK4 area drift ${drift.rk4}`);
    assert.ok(Math.abs(drift['implicit-midpoint']) < tol, `${where}: implicit midpoint drift ${drift['implicit-midpoint']}`);
    assert.ok(Math.abs(drift.euler) > 0.02, `${where}: Euler drift ${drift.euler}`);
    assert.ok(Math.abs(drift.euler) > 100 * Math.abs(drift.rk4), `${where}: Euler ${drift.euler} vs RK4 ${drift.rk4}`);
  }
});

test('one Euler step changes a material area by exactly Δt² ∫ det∇u dA: growth where rotation dominates, loss where strain does', () => {
  // The Euler map x → x + Δt u(x) has Jacobian det(I + Δt∇u) = 1 + Δt² det∇u
  // when ∇·u = 0, and det∇u = −Q/4 (Okubo–Weiss).
  const flow = makeFlow('taylor-green');
  const dt = 0.1;
  for (const [cx, cy, sign] of [[0.5, 0.5, 1], [1, 1, -1], [0.75, 0.3, 0]]) {
    const r = 0.15;
    const loop = createMaterialLoop({ cx, cy, r, n: 2000 });
    const A0 = loopArea(loop, true);
    advectLoop(loop, flow, 0, dt, 'euler');
    const dA = loopArea(loop, true) - A0;
    // ∫ det∇u over the disc, by the midpoint rule in polar coordinates.
    let integral = 0;
    const g = new Float64Array(4);
    const nr = 200;
    const nt = 256;
    for (let i = 0; i < nr; i++) {
      const rr = ((i + 0.5) * r) / nr;
      for (let k = 0; k < nt; k++) {
        const th = (TAU * k) / nt;
        velocityGradient(flow, cx + rr * Math.cos(th), cy + rr * Math.sin(th), 0, 1e-5, g);
        integral += (g[0] * g[3] - g[1] * g[2]) * rr * (r / nr) * (TAU / nt);
      }
    }
    close(dA, dt * dt * integral, 1e-4 * Math.abs(dt * dt * integral) + 1e-10, `ΔA at (${cx}, ${cy})`);
    if (sign) assert.equal(Math.sign(dA), sign, `sign at (${cx}, ${cy})`);
    if (sign) assert.equal(Math.sign(okuboWeiss(flow, cx, cy, 0)), -sign, 'Okubo–Weiss Q has the opposite sign');
  }
});

test('shoelace area is signed and exact for polygons', () => {
  close(polygonArea([0, 1, 1, 0], [0, 0, 1, 1]), 1, 0, 'unit square anticlockwise');
  close(polygonArea([0, 0, 1, 1], [0, 1, 1, 0]), -1, 0, 'clockwise');
  const loop = createMaterialLoop({ r: 1, n: 1000 });
  close(loopArea(loop), 0.5 * 1000 * Math.sin(TAU / 1000), 1e-12, 'regular 1000-gon');
  // The curved-chord area converges like s⁴ to the disc it samples.
  const coarse = createMaterialLoop({ r: 1, n: 50 });
  assert.ok(Math.abs(loopArea(coarse) / Math.PI - 1) > 2e-3, 'plain polygon misses the slivers');
  assert.ok(Math.abs(loopArea(coarse, true) / Math.PI - 1) < 1e-5, 'curved area');
  const e1 = Math.abs(loopArea(createMaterialLoop({ r: 1, n: 40 }), true) - Math.PI);
  const e2 = Math.abs(loopArea(createMaterialLoop({ r: 1, n: 80 }), true) - Math.PI);
  close(Math.log2(e1 / e2), 4, 0.3, 'fourth order');
  // Refinement inserts points on the curve, not on the chord.
  const sq = createMaterialLoop({ r: 1, n: 12, capacity: 100 });
  const added = refineLoop(sq, 0.3);
  assert.equal(added, 12);
  assert.equal(sq.n, 24);
  for (let k = 0; k < sq.n; k++) close(Math.hypot(sq.x[k], sq.y[k]), 1, 3e-3, 'new points near the circle');
});

test('curved-chord area stays fourth order after partial refinement (uneven label spacing)', () => {
  // A circle mapped to an ellipse (x·2, y/2: area unchanged), then refined
  // only where segments are long, so neighbouring segments have label gaps
  // in a 2:1 ratio. Labels make the midpoints exact for cubics anyway.
  const errs = [];
  const errsNoLabels = [];
  for (const n of [24, 48, 96, 192]) {
    const make = () => {
      const loop = createMaterialLoop({ r: 0.5, n, capacity: 4 * n });
      for (let k = 0; k < n; k++) {
        loop.x[k] *= 2;
        loop.y[k] *= 0.5;
      }
      const ds = (TAU * 0.5) / n; // segment lengths run from ≈ 0.5 ds to 2 ds
      const added = refineLoop(loop, 1.4 * ds);
      assert.ok(added > n / 4 && added < (3 * n) / 4, `partial refinement (${added} of ${n})`);
      return loop;
    };
    const loop = make();
    errs.push(Math.abs(loopArea(loop, true) - loop.area0));
    const bare = make();
    bare.s = null; // fall back to the evenly spaced four-point rule
    errsNoLabels.push(Math.abs(loopArea(bare, true) - bare.area0));
  }
  const p = observedOrders(errs);
  for (const q of p.slice(1)) close(q, 4, 0.25, `order with labels (${errs.map((e) => e.toExponential(2))})`);
  // Without labels the junctions cost an order.
  assert.ok(observedOrders(errsNoLabels).at(-1) < 3.4, `order without labels ${observedOrders(errsNoLabels)}`);
});

test('reset, domain and scalar helpers do not allocate per frame and say what they are', () => {
  const loop = createMaterialLoop({ r: 0.3, n: 50, capacity: 500 });
  for (let k = 0; k < 5; k++) {
    advectLoop(loop, makeFlow('taylor-green'), 0, 0.1, 'rk4');
    refineLoop(loop, 0.01);
  }
  loop.saturated = true;
  const bufs = [loop.x, loop.y, loop.s, loop.sx, loop.sy, loop.ss];
  resetMaterialLoop(loop, { cx: 0.2, cy: -0.1, r: 0.4, n: 80 });
  assert.equal(loop.n, 80);
  assert.equal(loop.saturated, false);
  close(loop.area0, Math.PI * 0.16, 1e-15, 'area0');
  close(loopArea(loop, true), loop.area0, 1e-6, 'a fresh circle');
  for (const b of [loop.x, loop.y, loop.s, loop.sx, loop.sy, loop.ss]) assert.ok(bufs.includes(b), 'same buffers');
  // One cached domain object per flow, refreshed from the params.
  const flow = makeFlow('rotation');
  const d = flow.domain;
  assert.equal(flow.domain, d);
  flow.params.x0 = 1;
  assert.equal(flow.domain.xmin, -1);
  assert.equal(d.xmax, 3);
  // Scalars are plain functions with a label and a name.
  const blob = makeScalar('blob');
  assert.equal(blob.name, SCALARS.blob.name);
  assert.equal(blob.label, SCALARS.blob.name);
  // materialDerivative also takes an object with value(x, y, t).
  const r = materialDerivative(makeFlow('uniform', { U: 2 }), { value: (x) => 3 * x }, 0.1, 0.2, 0);
  close(r.total, 6, 1e-9, 'object scalar');
});

test('particle presets: every broken preset visibly changes the loop area, every fixed one keeps it', () => {
  const tex0 = Object.values(PARTICLE_PRESETS);
  assert.ok(tex0.length >= 6);
  const drift = {};
  for (const [id, p] of Object.entries(PARTICLE_PRESETS)) {
    assert.ok(p.name && p.description && FLOWS[p.flow] && INTEGRATORS[p.method], id);
    const flow = makeFlow(p.flow, p.flowParams);
    const loop = createMaterialLoop(p.loop);
    for (let n = 0; n < p.steps; n++) {
      advectLoop(loop, flow, n * p.dt, p.dt, p.method);
      if (p.refine) refineLoop(loop, p.refine);
    }
    assert.ok(!loop.saturated, `${id} fits its capacity`);
    drift[id] = loopArea(loop, true) / loop.area0 - 1;
    if (p.kind === 'broken') assert.ok(Math.abs(drift[id]) > 0.02, `${id}: drift ${drift[id]}`);
    else assert.ok(Math.abs(drift[id]) < 2e-4, `${id}: drift ${drift[id]}`);
  }
  // The numbers quoted in the descriptions.
  close(drift['euler-spiral'] + 1, 1.04 ** 100, 1e-3 * 1.04 ** 100, 'Euler: (1 + (ΩΔt)²)^100 ≈ 50');
  close(drift['euler-strain'] + 1, 0.9775 ** 10, 1e-4, 'Euler in strain: 0.9775^10');
  // The big-step preset goes round a square: 4 steps per turn.
  const big = PARTICLE_PRESETS['implicit-midpoint-big-step'];
  const xs = new Float64Array(big.steps + 1);
  const ys = new Float64Array(big.steps + 1);
  tracePathline(makeFlow(big.flow, big.flowParams), big.particle[0], big.particle[1], 0, big.dt, big.steps, big.method, xs, ys);
  for (let k = 0; k <= big.steps; k += 4) close(Math.hypot(xs[k] - 1, ys[k]), 0, 1e-12, `back at the start after ${k} steps`);
  close(Math.hypot(xs[1], ys[1] - 1), 0, 1e-12, 'a quarter turn per step');
});

// ---- the material derivative ------------------------------------------------------

test('material derivative: steady scalar → Dc/Dt = u·∇c; a carried scalar → Dc/Dt = 0', () => {
  const flow = makeFlow('taylor-green');
  const blob = makeScalar('blob', { x0: 0.6, y0: 0.4, s: 0.3 });
  const v = new Float64Array(2);
  for (const [x, y] of regularPoints(flow, 50, 17)) {
    const r = materialDerivative(flow, blob, x, y, 0.7);
    flow.velocity(x, y, 0.7, v);
    const c = blob(x, y);
    const gx = (-(x - 0.6) / 0.09) * c;
    const gy = (-(y - 0.4) / 0.09) * c;
    close(r.local, 0, 1e-9, 'steady scalar: no local rate');
    close(r.total, v[0] * gx + v[1] * gy, 1e-8, 'Dc/Dt = u·∇c');
    close(r.convective, r.total, 1e-9, 'all convective');
  }
  // A blob drifting with the uniform stream is materially conserved.
  const uni = makeFlow('uniform', { U: 0.8, V: -0.3 });
  const drift = makeScalar('moving-blob', { U: 0.8, V: -0.3, x0: -1, y0: 0.2 });
  let maxLocal = 0;
  for (const [x, y, t] of regularPoints(uni, 50, 19)) {
    const r = materialDerivative(uni, drift, x, y, t * 0.2);
    maxLocal = Math.max(maxLocal, Math.abs(r.local));
    close(r.total, 0, 1e-9, 'materially conserved');
    close(r.local, -r.convective, 1e-9, 'local and convective cancel');
  }
  assert.ok(maxLocal > 0.1, 'the local rate alone is not zero');
  // The stream function of a steady flow is constant along streamlines.
  for (const id of ['cylinder', 'taylor-green', 'stagnation', 'rankine']) {
    const f = makeFlow(id, id === 'cylinder' ? { Gamma: 1.5 } : {});
    for (const [x, y] of regularPoints(f, 50, 23)) {
      close(materialDerivative(f, f.streamfunction, x, y, 0).total, 0, 1e-8, `${id}: u·∇ψ = 0`);
    }
  }
  // Uniform warming: only the local rate.
  const warm = makeScalar('warming', { beta: 2 });
  const r = materialDerivative(makeFlow('rotation'), warm, 0.3, 0.4, 1);
  close(r.local, 2, 1e-9, 'local');
  close(r.convective, 0, 1e-9, 'convective');
});

// ---- pathlines, streamlines, streaklines ------------------------------------------

test('pathline generator yields every point (and every RK stage on request) and matches the plain tracer', () => {
  const flow = makeFlow('double-gyre');
  const { value, counts } = countEvents(pathline(flow, 0.3, 0.4, 0, 0.1, 50, 'rk4', { stages: true }));
  assert.equal(counts['op:point'], 51);
  assert.equal(counts['op:stage'], 200);
  const xs = new Float64Array(51);
  const ys = new Float64Array(51);
  tracePathline(flow, 0.3, 0.4, 0, 0.1, 50, 'rk4', xs, ys);
  assert.deepEqual(Array.from(value.x), Array.from(xs));
  assert.deepEqual(Array.from(value.y), Array.from(ys));
  // RK4 stage times are t, t + Δt/2, t + Δt/2, t + Δt.
  const stages = [];
  drain(pathline(flow, 0.3, 0.4, 2, 0.1, 1, 'rk4', { stages: true }), (e) => e.op === 'stage' && stages.push(e.time));
  stages.forEach((t, k) => close(t, 2 + [0, 0.05, 0.05, 0.1][k], 1e-15, `stage ${k}`));
});

test('in steady flow, streaklines, pathlines and streamlines coincide; in the double gyre they do not', () => {
  const dt = 0.02;
  const steps = 300;
  for (const [id, x0, y0] of [['cylinder', -1.5, 0.12], ['taylor-green', 0.2, 0.35]]) {
    const flow = makeFlow(id, id === 'cylinder' ? { Gamma: 1 } : {});
    const px = new Float64Array(steps + 1);
    const py = new Float64Array(steps + 1);
    tracePathline(flow, x0, y0, 0, dt, steps, 'rk4', px, py);
    const sx = new Float64Array(steps + 1);
    const sy = new Float64Array(steps + 1);
    const n = traceStreamline(flow, x0, y0, 5, dt, steps, 'rk4', sx, sy);
    assert.equal(n, steps + 1);
    for (let k = 0; k <= steps; k++) close(Math.hypot(sx[k] - px[k], sy[k] - py[k]), 0, 1e-12, `${id} streamline = pathline`);
    const streak = createStreakline({ x0, y0, capacity: 500 });
    streaklineReset(streak, 0);
    for (let k = 0; k < steps; k++) streaklineStep(streak, flow, k * dt, dt, 'rk4');
    // The particle released j steps ago sits at the pathline's j-th point.
    for (let j = 0; j < streak.count; j++) {
      const i = streakIndex(streak, j);
      close(Math.hypot(streak.x[i] - px[j], streak.y[i] - py[j]), 0, 1e-12, `${id} streak particle ${j}`);
    }
  }
  const gyre = makeFlow('double-gyre');
  const x0 = 1.1;
  const y0 = 0.5;
  const px = new Float64Array(steps + 1);
  const py = new Float64Array(steps + 1);
  const T = 3 * steps * dt;
  tracePathline(gyre, x0, y0, 0, 3 * dt, steps, 'rk4', px, py);
  const streak = createStreakline({ x0, y0, capacity: 400 });
  streaklineReset(streak, 0);
  for (let k = 0; k < steps; k++) streaklineStep(streak, gyre, k * 3 * dt, 3 * dt, 'rk4');
  let maxGap = 0;
  for (let j = 0; j < streak.count; j++) {
    const i = streakIndex(streak, j);
    maxGap = Math.max(maxGap, Math.hypot(streak.x[i] - px[j], streak.y[i] - py[j]));
  }
  assert.ok(maxGap > 0.05, `double gyre (T = ${T}): streak and pathline differ by ${maxGap}`);
  const sx = new Float64Array(steps + 1);
  const sy = new Float64Array(steps + 1);
  traceStreamline(gyre, x0, y0, 0, 3 * dt, steps, 'rk4', sx, sy);
  let gap = 0;
  for (let k = 0; k <= steps; k++) gap = Math.max(gap, Math.hypot(sx[k] - px[k], sy[k] - py[k]));
  assert.ok(gap > 0.05, `double gyre: streamline at t = 0 and pathline differ by ${gap}`);
});

test('streamlines: arc-length mode, bounds, solids, and the ring buffer wraps', () => {
  const flow = makeFlow('cylinder');
  const xs = new Float64Array(2001);
  const ys = new Float64Array(2001);
  const n = traceStreamline(flow, -1.9, 0.3, 0, 0.01, 2000, 'rk4', xs, ys, { unit: true, bounds: flow.domain });
  assert.ok(n > 100 && n < 2001, 'stops at the edge of the domain');
  for (let k = 1; k < n; k++) close(Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]), 0.01, 1e-6, 'unit steps');
  // Stays on its ψ contour.
  const psi0 = flow.streamfunction(xs[0], ys[0]);
  for (let k = 0; k < n; k++) close(flow.streamfunction(xs[k], ys[k]), psi0, 1e-8, 'ψ constant');
  // Generator form gives the same points.
  const r = drain(streamline(flow, -1.9, 0.3, 0, 0.01, 2000, 'rk4', { unit: true, bounds: flow.domain }));
  assert.equal(r.count, n);
  // Ring buffer: capacity 10, 25 releases, newest at the source.
  const streak = createStreakline({ x0: -1.9, y0: 0.3, capacity: 10 });
  streaklineReset(streak, 0);
  for (let k = 0; k < 24; k++) streaklineStep(streak, flow, k * 0.05, 0.05, 'euler');
  assert.equal(streak.count, 10);
  const i0 = streakIndex(streak, 0);
  assert.deepEqual([streak.x[i0], streak.y[i0]], [-1.9, 0.3]);
  for (let k = 0; k < 10; k++) close(streak.born[streakIndex(streak, k)], (24 - k) * 0.05, 1e-12, 'release times');
});

test('particles never end inside the cylinder: the impermeability constraint stops Heun stranding them', () => {
  const run = (method, project) => {
    const flow = makeFlow('cylinder');
    if (!project) flow.project = null;
    const n = 400;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      xs[k] = -1.9;
      ys[k] = -0.3 + (0.6 * k) / (n - 1);
    }
    const dt = 0.08;
    for (let s = 0; s < 100; s++) advectParticles(flow, xs, ys, n, s * dt, dt, method);
    let inside = 0;
    for (let k = 0; k < n; k++) if (Math.hypot(xs[k], ys[k]) < flow.params.R) inside++;
    return inside;
  };
  // Heun's predictor can land inside, where u = 0; the corrector then halves
  // the step and the particle ends inside, frozen for good.
  assert.ok(run('heun', false) > 0, 'without the constraint Heun strands particles');
  for (const m of INTEGRATOR_IDS) assert.equal(run(m, true), 0, `${m} leaves no particle inside the body`);
  // The constraint moves a point radially out to the surface.
  const c = makeFlow('cylinder', { R: 0.5, x0: 1, y0: -1 });
  const p = Float64Array.of(1.1, -1.2);
  assert.equal(c.project(p), true);
  close(Math.hypot(p[0] - 1, p[1] + 1), 0.5, 1e-8, 'on the surface');
  close(Math.atan2(p[1] + 1, p[0] - 1), Math.atan2(-0.2, 0.1), 1e-12, 'radially');
  assert.equal(c.project(Float64Array.of(2, 0)), false, 'outside points are left alone');
});

test('grid sampling follows the i + j·nx, j = 0 at the bottom convention', () => {
  const flow = makeFlow('couette', { U: 2, H: 1 });
  const d = { xmin: 0, xmax: 2, ymin: 0, ymax: 1 };
  const U = new Float64Array(8 * 4);
  const V = new Float64Array(8 * 4);
  sampleVelocityField(flow, 8, 4, d, 0, U, V);
  close(U[3 + 0 * 8], 2 * 0.125, 1e-15, 'bottom row');
  close(U[3 + 3 * 8], 2 * 0.875, 1e-15, 'top row');
  const W = sampleScalarField(flow.vorticity, 8, 4, d, 0);
  for (const w of W) close(w, -2, 1e-15, 'uniform vorticity −U/H');
});

test('metadata: every TeX string parses; every flow and integrator is described', () => {
  for (const [id, def] of Object.entries(FLOWS)) {
    assert.ok(def.name && def.description && def.tex, id);
    tex(def.tex);
    tex(def.tex, { display: true });
  }
  for (const [id, m] of Object.entries(INTEGRATORS)) {
    assert.ok(m.name && m.description && m.order && m.stability, id);
    tex(m.tex);
  }
  for (const [id, s] of Object.entries(SCALARS)) assert.ok(s.name && s.description, id);
  tex(FLOWS.cylinder.cpTex, { display: true });
  tex(FLOWS.cylinder.liftTex);
  for (const [id, f] of Object.entries(GAS_FORMULAS)) {
    assert.ok(f.name && f.description && f.tex, id);
    tex(f.tex, { display: true });
  }
  for (const [id, p] of Object.entries(MD_PRESETS)) assert.ok(p.name && p.description && p.stepsPerFrame > 0, id);
});

// ---- (a) density fluctuations ---------------------------------------------------------

test('Poisson sampler: mean and variance both equal λ', () => {
  const rand = rng(5);
  for (const lam of [0.7, 12, 800]) {
    let s = 0;
    let ss = 0;
    const n = 4000;
    for (let k = 0; k < n; k++) {
      const c = poissonSample(lam, rand);
      s += c;
      ss += c * c;
    }
    const mean = s / n;
    const variance = ss / n - mean * mean;
    close(mean / lam, 1, 4 / Math.sqrt(n * lam), `mean at λ = ${lam}`);
    close(variance / lam, 1, 0.1, `variance at λ = ${lam}`);
  }
});

test('box counts over the cell-bucketed gas match a brute-force count, with periodic wrap', () => {
  for (const dim of [2, 3]) {
    const gas = createPoissonGas({ n: 1.5, L: dim === 2 ? 40 : 15, dim, seed: 21 });
    close(gas.count / (1.5 * gas.L ** dim), 1, 0.05, 'count ≈ n L^d');
    const rand = rng(8);
    for (let trial = 0; trial < 300; trial++) {
      const [x0, y0, z0, ell] = [rand() * gas.L, rand() * gas.L, rand() * gas.L, rand() * gas.L];
      let c = 0;
      for (let k = 0; k < gas.count; k++) {
        const inside = (p, o) => ((p - o + gas.L) % gas.L) < ell;
        if (inside(gas.x[k], x0) && inside(gas.y[k], y0) && (!gas.z || inside(gas.z[k], z0))) c++;
      }
      assert.equal(countInBox(gas, x0, y0, z0, ell), c);
    }
    // Edge cases: the whole box, a box hanging over every edge, corners given
    // outside [0, L).
    assert.equal(countInBox(gas, 0.37, 1.1, 2.2, gas.L), gas.count, 'ℓ = L holds everything once');
    const brute = (x0, y0, z0, ell) => {
      let c = 0;
      const inside = (p, o) => ((((p - o) % gas.L) + gas.L) % gas.L) < ell;
      for (let k = 0; k < gas.count; k++) if (inside(gas.x[k], x0) && inside(gas.y[k], y0) && (!gas.z || inside(gas.z[k], z0))) c++;
      return c;
    };
    const L = gas.L;
    assert.equal(countInBox(gas, L - 0.5, L - 0.25, L - 0.75, 0.6 * L), brute(L - 0.5, L - 0.25, L - 0.75, 0.6 * L));
    assert.equal(countInBox(gas, -3.3, L + 1.7, 2 * L + 0.4, 5), brute(-3.3, L + 1.7, 2 * L + 0.4, 5));
    assert.equal(countInBox(gas, 1, 2, 3, 0.999 * L), brute(1, 2, 3, 0.999 * L));
  }
});

test('density fluctuations scale as N^{−1/2} (2-D and 3-D)', () => {
  for (const [dim, L, ells] of [
    [2, 160, [1.5, 3, 6, 12, 24]],
    [3, 30, [1.2, 2, 3.2, 5]],
  ]) {
    const gas = createPoissonGas({ n: 1, L, dim, seed: 11 });
    const { value: rs, counts } = countEvents(densitySweep(gas, ells, 300, 3));
    assert.equal(counts['op:box'], 300 * ells.length, 'one event per sample box');
    assert.equal(counts.iter, ells.length, 'one event per box size');
    const fit = fitPowerLaw(
      rs.map((r) => r.expected),
      rs.map((r) => r.relative),
    );
    close(fit.exponent, -0.5, 0.1, `${dim}-D exponent`);
    close(fit.prefactor, 1, 0.2, `${dim}-D prefactor`);
    for (const r of rs) close(r.density, 1, 4 * r.predicted, `${dim}-D mean density at ℓ = ${r.ell}`);
    // The generator and the plain call are the same measurement.
    const g = drain(densitySamples(gas, ells[1], 300, 4));
    assert.deepEqual(g, sampleDensity(gas, ells[1], 300, 4));
  }
});

// ---- (b) molecular dynamics -------------------------------------------------------

test('velocity Verlet: energy error small over 1000 steps, scaling as Δt²; momentum conserved', () => {
  const run = (dt, T) => {
    const md = createMD({ N: 400, dt: 0.002, seed: 4 });
    mdStep(md, 1000); // melt the starting lattice
    md.dt = dt;
    const e0 = mdEnergy(md).total;
    let dev = 0;
    let s = 0;
    let ss = 0;
    const steps = Math.round(T / dt);
    for (let k = 0; k < steps; k++) {
      mdStep(md);
      const e = mdEnergy(md).total;
      dev = Math.max(dev, Math.abs(e - e0));
      s += e;
      ss += e * e;
    }
    const mean = s / steps;
    const e = mdEnergy(md);
    return { max: dev / Math.abs(e0), rms: Math.sqrt(Math.max(ss / steps - mean * mean, 0)) / Math.abs(e0), p: Math.hypot(e.px, e.py) };
  };
  const a = run(0.005, 5); // 1000 steps
  assert.ok(a.max < 1e-3, `max |ΔE|/E over 1000 steps at Δt = 0.005: ${a.max}`);
  assert.ok(a.p < 1e-10, `total momentum ${a.p}`);
  const dts = [0.008, 0.004, 0.002];
  const rms = dts.map((dt) => run(dt, 4).rms);
  const fit = fitPowerLaw(dts, rms);
  close(fit.exponent, 2, 0.3, `energy fluctuation ∝ Δt^p (rms ${rms.map((r) => r.toExponential(2)).join(', ')})`);
});

test('coarse-graining: a cell mean velocity has thermal noise √(T/n_c), so it fades like (cell area)^{−1/2}', () => {
  const md = createMD({ N: 400, seed: 6 });
  mdStep(md, 400);
  const sizes = [
    [24, 16],
    [12, 8],
    [6, 4],
    [3, 2],
  ];
  const outs = sizes.map(([nx, ny]) => createCellAverages(nx, ny));
  const sumZ2 = sizes.map(() => 0);
  const nz = sizes.map(() => 0);
  const sumU2 = sizes.map(() => 0);
  for (let snap = 0; snap < 40; snap++) {
    mdStep(md, 100);
    const T = mdEnergy(md).temperature;
    sizes.forEach(([nx, ny], k) => {
      const o = cellAverages(md, nx, ny, outs[k]);
      for (let c = 0; c < nx * ny; c++) {
        if (o.count[c] < 1) continue;
        for (const comp of [o.u[c], o.v[c]]) {
          sumZ2[k] += (comp * comp * o.count[c]) / T;
          sumU2[k] += comp * comp;
          nz[k]++;
        }
      }
    });
  }
  const perCell = sizes.map(([nx, ny]) => 400 / (nx * ny));
  const std = sumU2.map((s, k) => Math.sqrt(s / nz[k]));
  // Var(ū_cell) = (T/n_c)(1 − n_c/N): the zero total momentum of the box
  // removes a fraction n_c/N, as in sampling without replacement.
  sizes.forEach((_, k) => close(sumZ2[k] / nz[k] / (1 - perCell[k] / 400), 1, 0.12, `normalised variance at ${perCell[k]} molecules per cell`));
  const fit = fitPowerLaw(perCell, std);
  close(fit.exponent, -0.5, 0.1, 'noise exponent');
});

test('coarse-graining recovers the continuum Couette profile between moving thermal walls', () => {
  const md = createMD({ ...MD_PRESETS.couette.params, seed: 2 });
  assert.deepEqual(md.wallU, [-1, 1]);
  const ny = 8;
  const acc = createAccumulator(1, ny);
  mdStep(md, 2000);
  for (let s = 0; s < 6000; s++) {
    mdStep(md);
    if (s % 5 === 0) accumulate(acc, md);
  }
  const a = accumulatorAverages(acc, md);
  const ys = Array.from({ length: ny }, (_, j) => ((j + 0.5) * md.Ly) / ny);
  const us = Array.from(a.u);
  const my = ys.reduce((s, v) => s + v) / ny;
  const mu = us.reduce((s, v) => s + v) / ny;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let j = 0; j < ny; j++) {
    sxy += (ys[j] - my) * (us[j] - mu);
    sxx += (ys[j] - my) ** 2;
    syy += (us[j] - mu) ** 2;
  }
  const slope = sxy / sxx;
  assert.ok((sxy * sxy) / (sxx * syy) > 0.95, 'profile is a straight line');
  close(slope, 2 / md.Ly, 0.25 * (2 / md.Ly), 'shear rate (U_top − U_bottom)/L_y, within wall slip');
  close(mu, 0, 0.15, 'centreline velocity');
  for (let j = 0; j < ny; j++) close(a.rho[j], 400 / (md.Lx * md.Ly), 0.15 * (400 / (md.Lx * md.Ly)), 'uniform density');
});

test('Poiseuille preset: the parabola grows on the viscous time L_y²/(π²ν) ≈ 6000 steps and settles near 1.2', () => {
  const md = createMD({ ...MD_PRESETS.poiseuille.params, seed: 3 });
  const ny = 8;
  const slab = (steps) => {
    const acc = createAccumulator(1, ny);
    for (let s = 0; s < steps; s++) {
      mdStep(md);
      if (s % 5 === 0) accumulate(acc, md);
    }
    return Array.from(accumulatorAverages(acc, md).u);
  };
  const centre = (u) => 0.5 * (u[3] + u[4]);
  const early = centre(slab(2000)); // steps 0–2000
  mdStep(md, 3000);
  const mid = centre(slab(2000)); // steps 5000–7000: about one e-folding time
  mdStep(md, 9000);
  const late = slab(8000); // steps 16000–24000: settled
  const top = centre(late);
  assert.ok(early < 0.3 * top, `a few thousand steps are not enough: ${early} vs ${top}`);
  assert.ok(mid > 0.35 * top && mid < 0.9 * top, `≈ 1 − e^{−1} of the way at 6000 steps: ${mid} vs ${top}`);
  assert.ok(top > 0.9 && top < 1.6, `centreline speed ${top} ≈ gL_y²/(8ν) ≈ 1.2`);
  // Parabolic: least-squares fit u = c0 + c2 (y − L_y/2)².
  let A = 0;
  let B = 0;
  let C = 0;
  let D = 0;
  let E = 0;
  for (let j = 0; j < ny; j++) {
    const q = ((j + 0.5) * md.Ly / ny - md.Ly / 2) ** 2;
    A += 1;
    B += q;
    C += q * q;
    D += late[j];
    E += late[j] * q;
  }
  const c2 = (A * E - B * D) / (A * C - B * B);
  const c0 = (D - c2 * B) / A;
  let ssr = 0;
  let sst = 0;
  for (let j = 0; j < ny; j++) {
    const q = ((j + 0.5) * md.Ly / ny - md.Ly / 2) ** 2;
    ssr += (late[j] - c0 - c2 * q) ** 2;
    sst += (late[j] - D / ny) ** 2;
  }
  assert.ok(c2 < 0 && 1 - ssr / sst > 0.9, `parabolic profile: R² = ${1 - ssr / sst}`);
  const T = mdEnergy(md).temperature;
  assert.ok(T > 1.3 && T < 2, `viscous heating to T ≈ 1.6: ${T}`);
});

test('hidden vortices appear only in large averaging cells', () => {
  const md = createMD({ ...MD_PRESETS.vortex.params, seed: 2 });
  const ref = new Float64Array(2);
  const corr = (nx, ny) => {
    const o = cellAverages(md, nx, ny);
    let sab = 0;
    let saa = 0;
    let sbb = 0;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        if (!o.count[c]) continue;
        mdMeanFlow(md, ((i + 0.5) * md.Lx) / nx, ((j + 0.5) * md.Ly) / ny, ref);
        sab += o.u[c] * ref[0] + o.v[c] * ref[1];
        saa += o.u[c] ** 2 + o.v[c] ** 2;
        sbb += ref[0] ** 2 + ref[1] ** 2;
      }
    }
    return sab / Math.sqrt(saa * sbb);
  };
  const c = [corr(30, 20), corr(12, 8), corr(9, 6), corr(6, 4)];
  assert.ok(c[0] < 0.5, `cells of < 1 molecule barely see the flow: correlation ${c[0]}`);
  for (let k = 1; k < c.length; k++) assert.ok(c[k] > c[k - 1], `correlation grows with the cell: ${c}`);
  assert.ok(c[3] > 0.75, `cells of ~17 molecules see the vortices: correlation ${c[3]}`);
});

// ---- (c) gas facts ---------------------------------------------------------------

test('mean free path of air at 20 °C and 1 atm is ≈ 66 nm (within 10% of the quoted 68 nm)', () => {
  const lam = meanFreePath({ T: 293.15, p: 101325, d: 3.7e-10 });
  close(lam, 6.567e-8, 0.001e-8, 'hard-sphere formula with d = 3.7 Å');
  assert.ok(Math.abs(lam / 68e-9 - 1) < 0.1, `λ = ${lam}`);
  close(meanFreePath({ T: 293.15, p: 50662.5 }) / lam, 2, 1e-12, 'λ ∝ 1/p');
  close(1 / (Math.SQRT2 * Math.PI * AIR.d ** 2 * numberDensity(101325, 293.15)), lam, 1e-20, 'λ = 1/(√2 π d² n)');
  close(meanSpeed(293.15), 463, 1, 'mean molecular speed of air, m/s');
});

test('Loschmidt constant and molecules in a 1 µm cube', () => {
  close(LOSCHMIDT, 2.686780111e25, 1e16, 'CODATA 2018');
  close(KB, 1.380649e-23, 0, 'k_B');
  close(moleculesInCube(1e-6) / 2.687e7, 1, 1e-3, 'at 0 °C (Loschmidt)');
  close(moleculesInCube(1e-6, { T: 293.15 }) / 2.503e7, 1, 1e-3, 'at 20 °C');
  // A 1 % density fluctuation needs N = 10⁴ molecules: a cube of ≈ 72 nm at 0 °C.
  const L = boxForFluctuation(0.01);
  close(moleculesInCube(L), 1e4, 1e-6, 'N = 10⁴');
  close(L, 7.19e-8, 0.01e-8, 'side');
});

test('Knudsen regimes', () => {
  assert.equal(knudsenRegime(0.001).id, 'continuum');
  assert.equal(knudsenRegime(0.01).id, 'slip');
  assert.equal(knudsenRegime(0.05).id, 'slip');
  assert.equal(knudsenRegime(0.1).id, 'transition');
  assert.equal(knudsenRegime(9.9).id, 'transition');
  assert.equal(knudsenRegime(10).id, 'free-molecular');
  assert.equal(KNUDSEN_REGIMES.length, 4);
  const lam = meanFreePath();
  assert.equal(knudsenRegime(knudsen(lam, 1e-3)).id, 'continuum', '1 mm channel');
  assert.equal(knudsenRegime(knudsen(lam, 1e-6)).id, 'slip', '1 µm channel');
  assert.equal(knudsenRegime(knudsen(lam, 1e-7)).id, 'transition', '100 nm channel');
  assert.equal(knudsenRegime(knudsen(lam, 1e-9)).id, 'free-molecular', '1 nm gap');
});
