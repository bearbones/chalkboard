// Tests for the "stiffness" kernels: diffusion.js (heat equation, Thomas,
// steady advection–diffusion) and stiff.js (stability functions, stiff test
// problems, integrators). Each test checks a claim the course makes against
// analytic results: orders measured by refinement, stability thresholds,
// conservation, exact solutions and symmetry.
//
// Refinement paths for the heat equation (they isolate different errors):
//   time order:  fixed grid (n = 20), dt halved, error measured against the
//                semi-discrete exact solution e^{lambda_h t} sin(pi x) of the
//                same grid, so only the time error is seen.
//   r fixed:     dt = r dx^2, so an O(dt^p + dx^2) error is O(dx^2) for any
//                p >= 1: every scheme looks second order in dx on this path.
//   dt ∝ dx:     dt = dx/4, the path that tells CN (order 2) from BE (order 1)
//                on smooth data; on step data CN does not converge in the max
//                norm on this path (r = n/4 grows, G -> -1), which is tested too.
//
// The broken / fixed demo tables (HEAT_DEMOS, ADVDIFF_DEMOS, STIFF_DEMOS) are
// run as recipes here, so the numbers a chapter quotes from them are tested.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng, drain, countEvents, observedOrders, normInf, totalVariation } from '../../aids/fluid-course/src/sims/util.js';
import {
  thomas,
  solveCyclic,
  cyclicWork,
  createHeat,
  step as heatStep,
  resetHeat,
  setHeatPreset,
  assembleHeat,
  finishHeatStep,
  dtForR,
  heatDemoDt,
  HEAT_DEMOS,
  ADVDIFF_DEMOS,
  fillExact as fillHeatExact,
  heatExact,
  amplification,
  exactAmplification,
  amplificationCurve,
  dufortFrankelRoots,
  telegraphAmplitude,
  heatStabilityLimit,
  maxPrincipleLimit,
  HEAT_SCHEMES,
  HEAT_PRESETS,
  ADVDIFF_SCHEMES,
  createAdvDiff,
  solveAdvDiff,
  advDiffExact,
  advDiffCoefficients,
  fittingFactor,
  bernoulli,
} from '../../aids/fluid-course/src/sims/diffusion.js';
import {
  STABILITY_METHODS,
  STIFF_PROBLEMS,
  STIFF_DEMOS,
  ODE_METHODS,
  stabilityAbs,
  stabilityValue,
  stabilityGrid,
  boundaryLocus,
  realStabilityLimit,
  imagStabilityLimit,
  maxStableStep,
  heatEigenvalues,
  stiffnessRatio,
  heatExplicitLimit,
  createProblem,
  createIntegrator,
  resetIntegrator,
  fillExact as fillOdeExact,
  solveDense,
  step as odeStep,
} from '../../aids/fluid-course/src/sims/stiff.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

// ---------------------------------------------------------------- helpers

// Independent dense reference: Gaussian elimination with partial pivoting on a
// copy of an array-of-rows matrix.
function denseSolve(rows, d) {
  const n = d.length;
  const A = rows.map((r) => r.slice());
  const b = Array.from(d);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let r = k + 1; r < n; r++) if (Math.abs(A[r][k]) > Math.abs(A[p][k])) p = r;
    [A[k], A[p]] = [A[p], A[k]];
    [b[k], b[p]] = [b[p], b[k]];
    for (let r = k + 1; r < n; r++) {
      const f = A[r][k] / A[k][k];
      for (let c = k; c < n; c++) A[r][c] -= f * A[k][c];
      b[r] -= f * b[k];
    }
  }
  const x = new Array(n).fill(0);
  for (let k = n - 1; k >= 0; k--) {
    let s = b[k];
    for (let c = k + 1; c < n; c++) s -= A[k][c] * x[c];
    x[k] = s / A[k][k];
  }
  return x;
}

function randomTridiagonal(rand, n, cyclic = false) {
  const a = new Float64Array(n);
  const b = new Float64Array(n);
  const c = new Float64Array(n);
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    a[i] = cyclic || i > 0 ? 2 * rand() - 1 : 0;
    c[i] = cyclic || i < n - 1 ? 2 * rand() - 1 : 0;
    const sign = rand() < 0.5 ? -1 : 1;
    b[i] = sign * (Math.abs(a[i]) + Math.abs(c[i]) + 0.05 + rand());
    d[i] = 4 * rand() - 2;
  }
  const rows = [];
  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = b[i];
    if (i > 0) row[i - 1] = a[i];
    else if (cyclic) row[n - 1] += a[0];
    if (i < n - 1) row[i + 1] = c[i];
    else if (cyclic) row[0] += c[n - 1];
    rows.push(row);
  }
  return { a, b, c, d, rows };
}

const relErr = (x, ref) => {
  let e = 0;
  let s = 0;
  for (let i = 0; i < ref.length; i++) {
    e = Math.max(e, Math.abs(x[i] - ref[i]));
    s = Math.max(s, Math.abs(ref[i]));
  }
  return e / s;
};

function runHeat(opts, scheme, dt, T, theta) {
  const s = createHeat(opts);
  const M = Math.round(T / dt);
  for (let k = 0; k < M; k++) heatStep(s, { scheme, dt: T / M, theta });
  return s;
}

const signFlips = (u) => {
  let flips = 0;
  let prev = 0;
  for (let j = 0; j + 1 < u.length; j++) {
    const d = Math.sign(u[j + 1] - u[j]);
    if (d && prev && d !== prev) flips++;
    if (d) prev = d;
  }
  return flips;
};

// ---------------------------------------------------------------- Thomas

test('Thomas matches a dense solve on random diagonally dominant systems', () => {
  const rand = rng(7);
  let worst = 0;
  for (const n of [1, 2, 3, 5, 17, 64]) {
    for (let trial = 0; trial < 20; trial++) {
      const { a, b, c, d, rows } = randomTridiagonal(rand, n);
      const copy = [a, b, c, d].map((v) => Float64Array.from(v));
      const x = drain(thomas(a, b, c, d));
      worst = Math.max(worst, relErr(x, denseSolve(rows, d)));
      // inputs untouched
      for (const [k, v] of [a, b, c, d].entries()) assert.deepEqual(v, copy[k]);
    }
  }
  assert.ok(worst < 1e-12, `worst relative difference ${worst}`);
});

test('Thomas trace: forward elimination rows 0..n-1, then back substitution rows n-1..0', () => {
  const n = 9;
  const { a, b, c, d } = randomTridiagonal(rng(3), n);
  const events = [];
  const x = drain(thomas(a, b, c, d), (e) => events.push(e));
  assert.deepEqual(events[0], { t: 'enter', kind: 'forward', label: 'Forward elimination', n });
  const elim = events.filter((e) => e.op === 'eliminate').map((e) => e.row);
  const back = events.filter((e) => e.op === 'substitute').map((e) => e.row);
  assert.deepEqual(elim, [...Array(n).keys()]);
  assert.deepEqual(back, [...Array(n).keys()].reverse());
  // spans close in order: forward closes before back opens
  const kinds = events.filter((e) => e.t !== 'op').map((e) => `${e.t}:${e.kind}`);
  assert.deepEqual(kinds, ['enter:forward', 'leave:forward', 'enter:back', 'leave:back']);
  // back substitution reports the solution value it wrote
  for (const e of events.filter((e) => e.op === 'substitute')) assert.equal(e.x, x[e.row]);
  const { counts } = countEvents(thomas(a, b, c, d));
  assert.equal(counts['op:eliminate'], n);
  assert.equal(counts['op:substitute'], n);
  // the silent run used by the time steppers is the same arithmetic, bit for bit
  const silent = countEvents(thomas(a, b, c, d, { trace: false }));
  assert.deepEqual(silent.counts, {});
  assert.deepEqual(silent.value, x);
});

test('cyclic (periodic) tridiagonal solve matches a dense solve', () => {
  const rand = rng(11);
  let worst = 0;
  for (const n of [3, 4, 10, 33]) {
    for (let trial = 0; trial < 10; trial++) {
      const { a, b, c, d, rows } = randomTridiagonal(rand, n, true);
      const x = solveCyclic(a, b, c, d, new Float64Array(n), cyclicWork(n));
      worst = Math.max(worst, relErr(x, denseSolve(rows, d)));
    }
  }
  assert.ok(worst < 1e-12, `worst relative difference ${worst}`);
});

// ---------------------------------------------------------------- heat: stability

test('FTCS (demo ftcs-blowup): stable at r = 0.5, blows up at r = 0.52 from a 1e-3 grid-scale perturbation, at the von Neumann rate', () => {
  // The scheme is linear, so the perturbation is (noisy run) - (clean run).
  const { broken, fixed } = HEAT_DEMOS['ftcs-blowup'];
  assert.equal(broken.r, 0.52);
  assert.equal(fixed.r, 0.5);
  assert.equal(HEAT_PRESETS[fixed.preset].noise, 1e-3);
  const n = broken.n;
  const perturbation = (recipe) => {
    const noisy = createHeat({ n: recipe.n, preset: recipe.preset });
    const clean = createHeat({ n: recipe.n, preset: 'sine' });
    const dt = heatDemoDt(noisy, recipe);
    const amp = [normInf(noisy.u, clean.u)];
    for (let k = 0; k < recipe.steps; k++) {
      heatStep(noisy, { scheme: recipe.scheme, dt });
      heatStep(clean, { scheme: recipe.scheme, dt });
      amp.push(normInf(noisy.u, clean.u));
    }
    return amp;
  };
  const stable = perturbation(fixed);
  assert.ok(Math.abs(stable[0] - 1e-3) < 1e-15);
  assert.ok(Math.max(...stable) <= 1e-3 + 1e-15, `r = 0.5: the perturbation never grows (max ${Math.max(...stable)})`);
  const unstable = perturbation(broken);
  assert.equal(broken.steps, 300);
  assert.ok(unstable[300] > 1e5, `r = 0.52: perturbation ${unstable[300]} after 300 steps`);
  // growth per step (geometric mean over the last 100 steps) tends to |G| of the
  // highest Dirichlet mode, xi = (n - 1) pi / n; the next mode (|G| = 1.062) is
  // still present at the per-cent level, hence the 2e-4 tolerance
  const growth = (unstable[300] / unstable[200]) ** (1 / 100);
  const G = Math.abs(amplification('ftcs', ((n - 1) * Math.PI) / n, 0.52));
  assert.ok(Math.abs(growth - G) < 2e-4, `growth ${growth} vs |G| ${G}`);
  assert.ok(Math.abs(G - 1.0779) < 1e-3);
  // and the noisy run stays within 2e-3 of the exact (smooth) solution at r = 0.5
  const s = runHeat({ n, preset: 'noisy-sine' }, 'ftcs', 0.5 / (n * n), 0.1);
  fillHeatExact(s);
  assert.ok(normInf(s.u, s.exact) < 2e-3);
});

test('one step multiplies a periodic Fourier mode by exactly G(xi, r)', () => {
  const n = 32;
  for (const m of [1, 3, 7, 16]) {
    const xi = (2 * Math.PI * m) / n;
    for (const r of [0.3, 2]) {
      for (const [scheme, theta] of [['ftcs'], ['btcs'], ['cn'], ['theta', 0.3], ['theta', 0.8]]) {
        const s = createHeat({ n, preset: 'periodic-sine' });
        for (let j = 0; j < n; j++) s.u[j] = Math.cos(2 * Math.PI * m * s.x[j]);
        const u0 = Float64Array.from(s.u);
        heatStep(s, { scheme, dt: dtForR(s, r), theta });
        const G = amplification(scheme, xi, r, theta);
        let e = 0;
        for (let j = 0; j < n; j++) e = Math.max(e, Math.abs(s.u[j] - G * u0[j]));
        assert.ok(e < 1e-12, `${scheme} m=${m} r=${r}: ${e}`);
      }
      // Du Fort–Frankel (three levels): seed u^{n-1} = u^n / G1 with a real root G1
      const g = dufortFrankelRoots(xi, r);
      if (g.im1 === 0) {
        const s = createHeat({ n, preset: 'periodic-sine' });
        const dt = dtForR(s, r);
        for (let j = 0; j < n; j++) {
          s.u[j] = Math.cos(2 * Math.PI * m * s.x[j]);
          s.uPrev[j] = s.u[j] / g.re1;
        }
        const u0 = Float64Array.from(s.u);
        s.steps = 1;
        s.lastDt = dt;
        heatStep(s, { scheme: 'dufort-frankel', dt });
        let e = 0;
        for (let j = 0; j < n; j++) e = Math.max(e, Math.abs(s.u[j] - g.re1 * u0[j]));
        assert.ok(e < 1e-12, `DF m=${m} r=${r}: ${e}`);
      }
    }
  }
});

test('amplification factors: stability limits, CN -> -1 and BE -> 0 as r -> infinity, DF never amplifies', () => {
  const xs = amplificationCurve('ftcs', 0.5, { samples: 721 }).xi;
  const maxAbs = (scheme, r, theta) => Math.max(...Array.from(xs, (xi) => Math.abs(amplification(scheme, xi, r, theta))));
  assert.equal(amplification('ftcs', Math.PI, 0.5), -1);
  assert.ok(Math.abs(amplification('ftcs', Math.PI, 0.52) + 1.08) < 1e-12);
  assert.ok(maxAbs('ftcs', 0.5) <= 1 + 1e-15);
  assert.ok(maxAbs('ftcs', 0.51) > 1);
  // theta method: r_max = 1 / (2 (1 - 2 theta)) for theta < 1/2
  for (const theta of [0, 0.25, 0.4]) {
    const rmax = heatStabilityLimit('theta', theta);
    assert.ok(Math.abs(rmax - 1 / (2 * (1 - 2 * theta))) < 1e-15);
    assert.ok(maxAbs('theta', rmax * 0.999, theta) <= 1);
    assert.ok(maxAbs('theta', rmax * 1.001, theta) > 1);
  }
  for (const theta of [0.5, 0.6, 1]) {
    assert.equal(heatStabilityLimit('theta', theta), Infinity);
    for (const r of [0.1, 1, 10, 1e4]) assert.ok(maxAbs('theta', r, theta) <= 1 + 1e-15);
  }
  // CN: A-stable but not L-stable; BE: L-stable
  assert.ok(Math.abs(amplification('cn', Math.PI, 1e6) + 1) < 1e-6);
  assert.ok(Math.abs(amplification('cn', Math.PI, 10) + 19 / 21) < 1e-15); // (1 - 2r) / (1 + 2r)
  assert.ok(amplification('btcs', Math.PI, 1e6) < 1e-6);
  for (const r of [0.1, 1, 10, 1e4]) {
    assert.ok(maxAbs('cn', r) <= 1 + 1e-15);
    assert.ok(maxAbs('btcs', r) <= 1 + 1e-15);
  }
  // DF: |G| <= 1 for every r; the sawtooth xi = pi has a root exactly -1 (never damped)
  for (const r of [0.1, 0.5, 1, 10, 100]) {
    assert.ok(maxAbs('dufort-frankel', r) <= 1 + 1e-12, `DF r=${r}`);
    assert.ok(Math.abs(amplification('dufort-frankel', Math.PI, r) - 1) < 1e-12);
  }
  // small xi: every consistent scheme matches the exact decay e^{-r xi^2} to O(xi^4)
  for (const scheme of ['ftcs', 'btcs', 'cn']) {
    const xi = 1e-2;
    assert.ok(Math.abs(amplification(scheme, xi, 0.4) - exactAmplification(xi, 0.4)) < 1e-7);
  }
  // the maximum-principle limits quoted in the metadata
  assert.equal(maxPrincipleLimit('ftcs'), 0.5);
  assert.equal(maxPrincipleLimit('cn'), 1);
  assert.equal(maxPrincipleLimit('btcs'), Infinity);
});

// ---------------------------------------------------------------- heat: accuracy

test('time order on a fixed grid: Crank–Nicolson 2, backward Euler 1, theta = 0.75 1, FTCS 1', () => {
  const n = 20;
  const T = 0.1;
  const lam = -4 * n * n * Math.sin(Math.PI / (2 * n)) ** 2; // semi-discrete eigenvalue of sin(pi x)
  const err = (scheme, M, theta) => {
    const s = runHeat({ n, preset: 'sine' }, scheme, T / M, T, theta);
    let e = 0;
    for (let j = 0; j <= n; j++) e = Math.max(e, Math.abs(s.u[j] - Math.exp(lam * T) * Math.sin(Math.PI * s.x[j])));
    return e;
  };
  const Ms = [10, 20, 40, 80];
  const cn = observedOrders(Ms.map((M) => err('cn', M)));
  const be = observedOrders(Ms.map((M) => err('btcs', M)));
  const th = observedOrders(Ms.map((M) => err('theta', M, 0.75)));
  const ft = observedOrders(Ms.map((M) => err('ftcs', 20 * M))); // r = 0.4 / 20 ... 0.05: stable
  for (const p of cn) assert.ok(Math.abs(p - 2) < 0.01, `CN ${cn}`);
  assert.ok(Math.abs(be.at(-1) - 1) < 0.02, `BE ${be}`);
  assert.ok(Math.abs(th.at(-1) - 1) < 0.02, `theta 0.75 ${th}`);
  assert.ok(Math.abs(ft.at(-1) - 1) < 0.02, `FTCS ${ft}`);
});

test('with r fixed (dt ∝ dx²) CN, BE and FTCS all converge at order 2 in dx; FTCS at r = 1/6 at order 4', () => {
  const T = 0.1;
  const orders = (scheme, r) => observedOrders([10, 20, 40, 80].map((n) => {
    const s = runHeat({ n, preset: 'sine' }, scheme, r / (n * n), T);
    fillHeatExact(s);
    return normInf(s.u, s.exact);
  }));
  const cn = orders('cn', 1);
  const be = orders('btcs', 1);
  const ft = orders('ftcs', 0.4);
  const ft6 = orders('ftcs', 1 / 6);
  assert.ok(Math.abs(cn.at(-1) - 2) < 0.02, `CN ${cn}`);
  assert.ok(Math.abs(be.at(-1) - 2) < 0.02, `BE ${be} (its O(dt) error is O(dx^2) on this path)`);
  assert.ok(Math.abs(ft.at(-1) - 2) < 0.02, `FTCS ${ft}`);
  assert.ok(Math.abs(ft6.at(-1) - 4) < 0.05, `FTCS r=1/6 ${ft6}`);
});

test('with dt ∝ dx (dt = dx/4) CN converges at order 2 and BE at order 1', () => {
  const T = 0.1;
  const orders = (scheme) => observedOrders([20, 40, 80, 160].map((n) => {
    const s = runHeat({ n, preset: 'sine' }, scheme, 0.25 / n, T);
    fillHeatExact(s);
    return normInf(s.u, s.exact);
  }));
  const cn = orders('cn');
  const be = orders('btcs');
  assert.ok(Math.abs(cn.at(-1) - 2) < 0.02, `CN ${cn}`);
  assert.ok(Math.abs(be.at(-1) - 1) < 0.02, `BE ${be}`);
});

test('CN at r = 10 on a step (demo cn-ringing) rings (TV grows, error next to the jump flips sign every step); BE stays monotone', () => {
  const { broken, fixed } = HEAT_DEMOS['cn-ringing'];
  assert.deepEqual([broken.scheme, broken.r, fixed.scheme, fixed.r], ['cn', 10, 'btcs', 10]);
  const n = broken.n;
  const cn = createHeat({ n, preset: broken.preset });
  const be = createHeat({ n: fixed.n, preset: fixed.preset });
  const j = 24; // the node just left of the jump at x = 1/2
  const cnErr = [];
  const beErr = [];
  for (let k = 0; k < broken.steps; k++) {
    heatStep(cn, { scheme: broken.scheme, dt: heatDemoDt(cn, broken) });
    heatStep(be, { scheme: fixed.scheme, dt: heatDemoDt(be, fixed) });
    fillHeatExact(cn);
    fillHeatExact(be);
    cnErr.push(cn.u[j] - cn.exact[j]);
    beErr.push(be.u[j] - be.exact[j]);
    if (k === 0) {
      assert.ok(totalVariation(cn.u, false) > 1.5, `CN TV after one step ${totalVariation(cn.u, false)}`);
      assert.ok(signFlips(cn.u) >= 2, 'CN profile is not monotone');
    }
    assert.ok(Math.abs(totalVariation(be.u, false) - 1) < 1e-12, 'BE is total-variation diminishing');
    assert.equal(signFlips(be.u), 0, 'BE profile stays monotone');
  }
  for (let k = 1; k < cnErr.length; k++) assert.ok(cnErr[k] * cnErr[k - 1] < 0, `CN error flips sign: ${cnErr.map((e) => e.toFixed(3))}`);
  assert.ok(Math.abs(cnErr[0]) > 0.2);
  for (let k = 1; k < beErr.length; k++) assert.ok(beErr[k] * beErr[0] > 0, `BE error keeps its sign: ${beErr.map((e) => e.toFixed(3))}`);
  // CN at r = 1 (its maximum-principle limit) does not ring
  const ok = createHeat({ n, preset: 'step' });
  assert.equal(maxPrincipleLimit('cn'), 1);
  for (let k = 0; k < 20; k++) {
    heatStep(ok, { scheme: 'cn', dt: dtForR(ok, maxPrincipleLimit('cn')) });
    assert.equal(signFlips(ok.u), 0);
  }
});

test('on the dt ∝ dx path, CN does not converge in the max norm for step data, while BE converges at order 1', () => {
  // dt = dx/4 means r = n/4 -> infinity: the jump's grid-scale modes see G -> -1 and never decay
  const errs = (scheme) => [40, 80, 160].map((n) => {
    const s = runHeat({ n, preset: 'step' }, scheme, 0.25 / n, 0.1);
    return normInf(s.u, fillHeatExact(s));
  });
  const cn = errs('cn');
  const be = errs('btcs');
  for (const e of cn) assert.ok(e > 0.01, `CN ${cn}`);
  assert.ok(cn.at(-1) > 0.95 * cn[0], `CN does not improve: ${cn}`);
  for (const p of observedOrders(be)) assert.ok(Math.abs(p - 1) < 0.1, `BE ${be}`);
});

test('periodic schemes conserve total heat exactly', () => {
  for (const [scheme, r] of [['ftcs', 0.4], ['btcs', 5], ['cn', 5], ['theta', 3], ['dufort-frankel', 5]]) {
    const s = createHeat({ n: 40, preset: 'periodic-top-hat' });
    const m0 = s.u.reduce((p, v) => p + v, 0);
    for (let k = 0; k < 60; k++) heatStep(s, { scheme, dt: dtForR(s, r), theta: 0.7 });
    const m1 = s.u.reduce((p, v) => p + v, 0);
    assert.ok(Math.abs(m1 - m0) < 1e-12, `${scheme}: ${m0} -> ${m1}`);
  }
});

test('Dirichlet values are live: every scheme applies a changed state.left/right from the next step and relaxes to the same line', () => {
  const schemes = [['ftcs', 0.4], ['btcs', 5], ['cn', 1], ['theta', 2, 0.7], ['dufort-frankel', 0.4]];
  for (const [scheme, r, theta] of schemes) {
    const s = createHeat({ n: 10, preset: 'sine' });
    const dt = dtForR(s, r);
    heatStep(s, { scheme, dt, theta });
    s.left = 1;
    s.right = 0.5;
    const before = Float64Array.from(s.u);
    heatStep(s, { scheme, dt, theta });
    assert.equal(s.u[0], 1, `${scheme}: left end`);
    assert.equal(s.u[10], 0.5, `${scheme}: right end`);
    // both time levels of that step saw the new value: FTCS node 1 reads it explicitly
    if (scheme === 'ftcs') assert.ok(Math.abs(s.u[1] - (before[1] + r * (before[2] - 2 * before[1] + 1))) < 1e-15);
    while (s.t < 3) heatStep(s, { scheme, dt, theta });
    let e = 0;
    for (let j = 0; j <= 10; j++) e = Math.max(e, Math.abs(s.u[j] - (1 - 0.5 * s.x[j])));
    assert.ok(e < 1e-8, `${scheme}: steady state error ${e}`);
    assert.equal(fillHeatExact(s), null, 'exact solution no longer applies');
  }
  // setHeatPreset switches preset, boundary values and data together
  const s = createHeat({ n: 20, preset: 'sine' });
  heatStep(s, { scheme: 'cn', dt: 1e-3 });
  setHeatPreset(s, 'step');
  const ref = createHeat({ n: 20, preset: 'step' });
  assert.deepEqual(s.u, ref.u);
  assert.deepEqual([s.left, s.right, s.t, s.steps], [1, 0, 0, 0]);
  heatStep(s, { scheme: 'cn', dt: 1e-3 });
  heatStep(ref, { scheme: 'cn', dt: 1e-3 });
  assert.deepEqual(s.u, ref.u);
  assert.notEqual(fillHeatExact(s), null);
  assert.throws(() => setHeatPreset(s, 'periodic-sine'), /bc/);
});

test('assembleHeat + a traced Thomas run + finishHeatStep is exactly step()', () => {
  for (const [scheme, theta] of [['btcs'], ['cn'], ['theta', 0.7]]) {
    const a = createHeat({ n: 12, preset: 'top-hat' });
    const b = createHeat({ n: 12, preset: 'top-hat' });
    const dt = dtForR(a, 3);
    for (let k = 0; k < 3; k++) {
      heatStep(a, { scheme, dt, theta });
      assembleHeat(b, { scheme, dt, theta });
      const { counts } = countEvents(thomas(b.lower, b.diag, b.upper, b.rhs, { x: b.sol }));
      assert.equal(counts['op:eliminate'], 11, 'one row per interior node');
      finishHeatStep(b);
      assert.deepEqual(b.u, a.u, `${scheme} step ${k}`);
      assert.deepEqual(b.uPrev, a.uPrev);
      assert.equal(b.t, a.t);
      assert.equal(b.steps, a.steps);
    }
  }
  // periodic: the figure solves with solveCyclic into state.sol
  const a = createHeat({ n: 16, preset: 'periodic-top-hat' });
  const b = createHeat({ n: 16, preset: 'periodic-top-hat' });
  const dt = dtForR(a, 2);
  heatStep(a, { scheme: 'cn', dt });
  assembleHeat(b, { scheme: 'cn', dt });
  solveCyclic(b.lower, b.diag, b.upper, b.rhs, b.sol, b.cw);
  finishHeatStep(b);
  assert.deepEqual(b.u, a.u);
  assert.throws(() => assembleHeat(b, { scheme: 'ftcs', dt }), /implicit/);
  assert.throws(() => finishHeatStep(b), /assembleHeat/);
});

test('amplificationCurve refills a caller-owned buffer; the Du Fort–Frankel modulus is the larger root', () => {
  const out = { xi: new Float64Array(91), G: new Float64Array(91), exact: new Float64Array(91) };
  for (const [scheme, r] of [['cn', 3], ['ftcs', 0.4], ['dufort-frankel', 0.3], ['dufort-frankel', 4]]) {
    const ret = amplificationCurve(scheme, r, { out });
    assert.equal(ret, out);
    const fresh = amplificationCurve(scheme, r, { samples: 91 });
    assert.deepEqual(out.G, fresh.G);
    assert.deepEqual(out.exact, fresh.exact);
    assert.equal(out.xi[90], Math.PI);
  }
  for (const r of [0.1, 0.3, 0.5, 0.7, 2, 50]) {
    for (let k = 0; k <= 40; k++) {
      const xi = (Math.PI * k) / 40;
      const g = dufortFrankelRoots(xi, r);
      const ref = Math.max(Math.hypot(g.re1, g.im1), Math.hypot(g.re2, g.im2));
      assert.ok(Math.abs(amplification('dufort-frankel', xi, r) - ref) < 1e-14, `r=${r} xi=${xi}`);
    }
  }
});

test('Du Fort–Frankel with dt/dx fixed (demo dufort-frankel-inconsistency) converges to the damped wave equation, not the heat equation', () => {
  const { broken, fixed } = HEAT_DEMOS['dufort-frankel-inconsistency'];
  const T = (broken.steps * broken.dtOverDx) / broken.n; // 0.2
  assert.ok(Math.abs(T - 0.2) < 1e-15);
  // refine with c = dt/dx fixed: the demo's c = 0.5 (oscillatory limit, 4 tau kappa pi^2 = 9.9 > 1)
  // and c = 0.1 (overdamped limit, 4 tau kappa pi^2 = 0.39 < 1)
  const refine = (c) => {
    const toHeat = [];
    const toWave = [];
    for (const n of [20, 40, 80, 160, 320]) {
      const s = runHeat({ n, preset: broken.preset }, 'dufort-frankel', c / n, T);
      const H = Math.exp(-(Math.PI ** 2) * s.t);
      const A = telegraphAmplitude(Math.PI, s.t, 1, c);
      let eh = 0;
      let ew = 0;
      for (let j = 0; j <= n; j++) {
        const sn = Math.sin(Math.PI * s.x[j]);
        eh = Math.max(eh, Math.abs(s.u[j] - H * sn));
        ew = Math.max(ew, Math.abs(s.u[j] - A * sn));
      }
      toHeat.push(eh);
      toWave.push(ew);
    }
    return { toHeat, toWave, orders: observedOrders(toWave) };
  };
  const osc = refine(broken.dtOverDx);
  // the heat equation says +0.139 sin(pi x); the limit is -0.574 sin(pi x)
  assert.ok(Math.abs(telegraphAmplitude(Math.PI, T, 1, broken.dtOverDx) + 0.5743) < 1e-3);
  for (const e of osc.toHeat) assert.ok(e > 0.59, `error against the heat equation stays O(1): ${osc.toHeat}`);
  assert.ok(osc.toHeat.at(-1) >= osc.toHeat[0], 'refining does not help');
  for (const q of osc.orders) assert.ok(q > 0.9, `converges to the telegraph solution: ${osc.toWave} (orders ${osc.orders})`);
  const over = refine(0.1);
  assert.ok(4 * 0.01 * Math.PI ** 2 < 1, 'c = 0.1 is the overdamped branch');
  for (const q of over.orders) assert.ok(q > 0.9, `c = 0.1: converges to the telegraph solution: ${over.toWave} (orders ${over.orders})`);
  // the c = 0.1 limit is visibly not the heat equation either: amplitude 0.110 vs 0.139
  const gap = Math.exp(-(Math.PI ** 2) * T) - telegraphAmplitude(Math.PI, T, 1, 0.1);
  assert.ok(gap > 0.01 && over.toWave.at(-1) < gap / 100, `gap ${gap}, error ${over.toWave.at(-1)}`);
  assert.ok(over.toHeat.at(-1) > 0.9 * gap, 'and it does not converge to the heat equation');
  // the demo pair itself: broken is O(1) wrong at t = 0.2, fixed (r = 1) is right to 2e-3
  for (const [recipe, bad] of [[broken, true], [fixed, false]]) {
    const s = createHeat({ n: recipe.n, preset: recipe.preset });
    const dt = heatDemoDt(s, recipe);
    for (let k = 0; k < recipe.steps; k++) heatStep(s, { scheme: recipe.scheme, dt });
    assert.ok(Math.abs(s.t - T) < 1e-12);
    const err = normInf(s.u, fillHeatExact(s));
    assert.equal(err > 0.5, bad, `demo error ${err}`);
    if (!bad) assert.ok(err < 2e-3, `fixed demo error ${err}`);
  }
  // and with r fixed (dt/dx -> 0) it does converge to the heat equation, at order 2
  const heatOrders = observedOrders([10, 20, 40, 80].map((n) => {
    const s = runHeat({ n, preset: 'sine' }, 'dufort-frankel', fixed.r / (n * n), 0.1);
    fillHeatExact(s);
    return normInf(s.u, s.exact);
  }));
  assert.ok(Math.abs(heatOrders.at(-1) - 2) < 0.02, `DF at r = 1: ${heatOrders}`);
});

test('telegraphAmplitude solves tau A\'\' + A\' + kappa k^2 A = 0 in all three regimes, and tends to the heat decay as c -> 0', () => {
  // independent check: RK4 on the first-order system A' = B, B' = -(B + lam A) / tau,
  // A(0) = 1, A'(0) = -lam, with h small enough to be exact to ~1e-12
  const integrate = (k, c, T, kappa = 1) => {
    const lam = kappa * k * k;
    const tau = kappa * c * c;
    const f = (a, b) => [b, -(b + lam * a) / tau];
    let a = 1;
    let b = -lam;
    const M = 4000;
    const h = T / M;
    for (let i = 0; i < M; i++) {
      const [k1a, k1b] = f(a, b);
      const [k2a, k2b] = f(a + (h / 2) * k1a, b + (h / 2) * k1b);
      const [k3a, k3b] = f(a + (h / 2) * k2a, b + (h / 2) * k2b);
      const [k4a, k4b] = f(a + h * k3a, b + h * k3b);
      a += (h / 6) * (k1a + 2 * k2a + 2 * k3a + k4a);
      b += (h / 6) * (k1b + 2 * k2b + 2 * k3b + k4b);
    }
    return a;
  };
  const cases = [
    [Math.PI, 0.1, 'overdamped'], // 4 tau lam = 0.39
    [1, 0.5, 'critical'], // 4 tau lam = 1 exactly in floating point
    [Math.PI, 0.5, 'oscillatory'], // 4 tau lam = 9.9
    [Math.PI, 0.02, 'overdamped, stiff'],
  ];
  for (const [k, c, label] of cases) {
    for (const T of [0.05, 0.2, 1]) {
      const A = telegraphAmplitude(k, T, 1, c);
      const ref = integrate(k, c, T);
      assert.ok(Math.abs(A - ref) < 1e-9, `${label} k=${k} c=${c} T=${T}: ${A} vs ${ref}`);
    }
  }
  assert.equal(1 - 4 * 0.25 * 1, 0, 'the critical case hits D = 0 exactly');
  // continuity across the critical point
  for (const T of [0.3, 2]) {
    const mid = telegraphAmplitude(1, T, 1, 0.5);
    for (const f of [1 - 1e-6, 1 + 1e-6]) {
      const v = telegraphAmplitude(1, T, 1, 0.5 * f);
      assert.ok(Math.abs(v - mid) < 1e-5, `T=${T} c=0.5*${f}: ${v} vs ${mid}`);
    }
  }
  // c -> 0: A = e^{-lam t} (1 - tau lam^2 t + O(tau^2)), with no cancellation even at c = 1e-8
  const lam = Math.PI ** 2;
  const t = 0.1;
  const heat = Math.exp(-lam * t);
  for (const c of [1e-3, 1e-4, 1e-6, 1e-7, 1e-8, 1e-10]) {
    const tau = c * c;
    const rel = telegraphAmplitude(Math.PI, t, 1, c) / heat - 1;
    assert.ok(Math.abs(rel + tau * lam * lam * t) < 2 * (tau * lam * lam * t) ** 2 + 1e-14, `c = ${c}: relative gap ${rel}`);
  }
  assert.equal(telegraphAmplitude(Math.PI, t, 1, 0), heat);
});

test('exact heat solutions: series satisfy the initial data, boundaries and a fine CN run', () => {
  const xs = Float64Array.from([0, 0.1, 0.25, 0.45, 0.5, 0.55, 0.7, 0.9, 1]);
  // step: u(0) = 1, u(1) = 0, and at tiny t the series reproduces the step away from the jump
  const early = heatExact('step', xs, 1e-7);
  assert.ok(Math.abs(early[0] - 1) < 1e-12 && Math.abs(early[8]) < 1e-12);
  assert.ok(Math.abs(early[2] - 1) < 1e-6 && Math.abs(early[6]) < 1e-6);
  assert.ok(Math.abs(early[4] - 0.5) < 1e-6);
  // top hat: the integral of the Dirichlet solution at t = 0+ is 0.2
  const fine = new Float64Array(2001).map((_, k) => k / 2000);
  const th = heatExact('top-hat', fine, 1e-6);
  let integral = 0;
  for (let k = 0; k < 2000; k++) integral += 0.5 * (th[k] + th[k + 1]) / 2000;
  assert.ok(Math.abs(integral - 0.2) < 1e-4, `top-hat integral ${integral}`);
  // both against a fine CN solution at t = 0.01
  for (const preset of ['step', 'top-hat', 'periodic-top-hat']) {
    const s = runHeat({ n: 400, preset }, 'cn', 2.5e-5, 0.01);
    fillHeatExact(s);
    assert.ok(normInf(s.u, s.exact) < 2e-5, `${preset}: ${normInf(s.u, s.exact)}`);
  }
  // the long series (20,000 to 50,000 terms at tiny t) use a rotation recurrence for
  // sin(m pi x); it agrees with term-by-term sin() to 1e-11
  const pts = Float64Array.from([0.013, 0.25, 0.4999, 0.5, 0.61, 0.987, 1]);
  for (const t of [1e-8, 1e-10]) {
    for (const id of ['step', 'top-hat']) {
      const p = HEAT_PRESETS[id];
      const got = heatExact(id, pts, t);
      const M = Math.min(50000, Math.ceil(Math.sqrt(40 / (Math.PI * Math.PI * t))) + 2);
      for (let k = 0; k < pts.length; k++) {
        let ref = p.left + (p.right - p.left) * pts[k];
        for (let m = 1; m <= M; m++) ref += p.coeff(m) * Math.exp(-((m * Math.PI) ** 2) * t) * Math.sin(m * Math.PI * pts[k]);
        assert.ok(Math.abs(got[k] - ref) < 1e-11, `${id} t=${t} x=${pts[k]}: ${got[k]} vs ${ref}`);
      }
    }
  }
  // resetHeat restores the initial data
  const s = createHeat({ n: 20, preset: 'modes' });
  const u0 = Float64Array.from(s.u);
  heatStep(s, { scheme: 'cn', dt: 0.01 });
  resetHeat(s);
  assert.deepEqual(s.u, u0);
  assert.equal(s.t, 0);
});

// ---------------------------------------------------------------- steady advection–diffusion

const monotoneUp = (u) => {
  for (let j = 0; j + 1 < u.length; j++) if (u[j + 1] < u[j]) return false;
  return true;
};

test('central differencing is non-monotone exactly when |P| > 2, in either flow direction', () => {
  const n = 20;
  const st = createAdvDiff(n);
  for (const P of [0.5, 1, 1.5, 1.9, 2, 2.05, 2.5, 4, 10, 40, -0.5, -1.9, -2, -2.05, -2.5, -4, -40]) {
    const u = solveAdvDiff(st, { a: P * n, kappa: 1, scheme: 'central' });
    // the exact profile rises from 0 to 1 for either sign of a
    assert.equal(monotoneUp(u), Math.abs(P) <= 2, `P = ${P}`);
    const { alpha, beta } = advDiffCoefficients('central', P);
    assert.equal(alpha < 0, P > 2);
    assert.equal(beta < 0, P < -2);
    // closed form u_j = (rho^j - 1) / (rho^n - 1), rho = (1 + P/2) / (1 - P/2)
    if (P !== 2) {
      for (let j = 0; j <= n; j++) {
        let exact;
        if (P > 0) {
          const sigma = (1 - P / 2) / (1 + P / 2); // 1 / rho, avoids overflow
          exact = (sigma ** (n - j) - sigma ** n) / (1 - sigma ** n);
        } else {
          const rho = (1 + P / 2) / (1 - P / 2);
          exact = (rho ** j - 1) / (rho ** n - 1);
        }
        assert.ok(Math.abs(u[j] - exact) < 1e-10, `P = ${P}, j = ${j}`);
      }
    }
    if (Math.abs(P) > 2) {
      // the wiggle is node-to-node: successive differences alternate in sign
      // (wherever they are above roundoff; for P = -2.05 they shrink like 0.012^j)
      let seen = 0;
      for (let j = 1; j < n; j++) {
        const d0 = u[j] - u[j - 1];
        const d1 = u[j + 1] - u[j];
        if (Math.abs(d0) < 1e-13 || Math.abs(d1) < 1e-13) continue;
        assert.ok(d1 * d0 < 0, `P = ${P}, j = ${j}`);
        seen++;
      }
      assert.ok(seen >= 3, `P = ${P}: ${seen} alternations checked`);
    }
  }
});

test('advection–diffusion demos: each broken recipe wiggles or smears, each fixed one is monotone and better', () => {
  const run = (r) => {
    const st = createAdvDiff(r.n);
    const u = solveAdvDiff(st, r);
    return { st, u, err: normInf(u, st.exact) };
  };
  const checks = {
    'central-wiggles': (b, f) => {
      assert.equal(b.st.P, 4);
      assert.ok(!monotoneUp(b.u) && Math.min(...b.u) < -0.3, `leaves [0, 1]: min ${Math.min(...b.u)}`);
      assert.ok(Math.abs(b.u[b.st.n - 1] + 1 / 3) < 0.01, 'u = -1/3 next to the outflow');
      assert.ok(f.err < 1e-12, 'fitted is exact at the nodes');
    },
    'central-refined': (b, f) => {
      assert.ok(!monotoneUp(b.u));
      assert.ok(Math.abs(f.st.P) < 2 && monotoneUp(f.u), `P = ${f.st.P}`);
      assert.ok(f.err < b.err / 3);
    },
    'upwind-smearing': (b, f, d) => {
      assert.ok(monotoneUp(b.u), 'upwind never wiggles');
      assert.ok(b.err > 0.15, `but is O(1) wrong in the layer: ${b.err}`);
      // its numerical diffusion a dx / 2 equals kappa here: the same as central with kappa doubled
      const r = d.broken;
      assert.equal((r.a / r.n) / 2, r.kappa);
      const c2 = run({ ...r, kappa: 2 * r.kappa, scheme: 'central' });
      assert.ok(normInf(b.u, c2.u) < 1e-12);
      assert.ok(monotoneUp(f.u) && f.err < 1e-12);
    },
  };
  assert.deepEqual(Object.keys(checks).sort(), Object.keys(ADVDIFF_DEMOS).sort(), 'every demo has a check');
  for (const [id, d] of Object.entries(ADVDIFF_DEMOS)) {
    assert.equal(d.id, id);
    checks[id](run(d.broken), run(d.fixed), d);
  }
});

test('upwind is always monotone and equals central differencing with kappa + |a| dx / 2', () => {
  const n = 20;
  const up = createAdvDiff(n);
  const ce = createAdvDiff(n);
  for (const P of [0.5, 3, 40, -0.5, -3, -40]) {
    const a = P * n;
    const u = solveAdvDiff(up, { a, kappa: 1, scheme: 'upwind' });
    const v = solveAdvDiff(ce, { a, kappa: 1 + Math.abs(a) / (2 * n), scheme: 'central' });
    assert.ok(normInf(u, v) < 1e-12, `P = ${P}: ${normInf(u, v)}`);
    assert.ok(monotoneUp(u));
  }
});

test('exponential fitting is exact at the nodes, for every Péclet number', () => {
  const n = 20;
  const st = createAdvDiff(n);
  let worst = 0;
  for (const P of [1e-9, 0.01, 0.5, 2, 5, 20, 100, 700, -0.5, -5, -100]) {
    const u = solveAdvDiff(st, { a: P * n, kappa: 1, scheme: 'fitted' });
    worst = Math.max(worst, normInf(u, st.exact));
    assert.ok(monotoneUp(u));
  }
  assert.ok(worst < 1e-12, `worst nodal error ${worst}`);
  // Scharfetter–Gummel form == central differencing with kappa (P/2) coth(P/2) (Il'in, Allen–Southwell)
  const ce = createAdvDiff(n);
  for (const P of [0.3, 3, 12]) {
    const u = solveAdvDiff(st, { a: P * n, kappa: 1, scheme: 'fitted' });
    const v = solveAdvDiff(ce, { a: P * n, kappa: fittingFactor(P), scheme: 'central' });
    assert.ok(normInf(u, v) < 1e-12);
  }
  assert.ok(Math.abs(bernoulli(-3) - bernoulli(3) - 3) < 1e-14); // B(-x) = B(x) + x
  // for large P the fitted coefficients approach upwind's (alpha -> 0, beta -> P)
  const f = advDiffCoefficients('fitted', 50);
  assert.ok(f.alpha < 1e-19 && Math.abs(f.beta - 50) < 1e-12);
});

test('at fixed global Péclet number 10, central converges at order 2 and upwind at order 1', () => {
  const ord = (scheme) => observedOrders([20, 40, 80, 160].map((n) => {
    const st = createAdvDiff(n);
    const u = solveAdvDiff(st, { a: 10, kappa: 1, scheme });
    return normInf(u, st.exact);
  }));
  const c = ord('central');
  const u = ord('upwind');
  assert.ok(Math.abs(c.at(-1) - 2) < 0.02, `central ${c}`);
  assert.ok(Math.abs(u.at(-1) - 1) < 0.05, `upwind ${u}`);
});

test('reversing the flow mirrors the solution: u_{-a}(x) = 1 - u_a(1 - x)', () => {
  const n = 16;
  const f = createAdvDiff(n);
  const g = createAdvDiff(n);
  for (const scheme of ['central', 'upwind', 'fitted']) {
    for (const a of [5, 40, 200]) {
      const u = solveAdvDiff(f, { a, kappa: 1, scheme });
      const v = solveAdvDiff(g, { a: -a, kappa: 1, scheme });
      for (let j = 0; j <= n; j++) assert.ok(Math.abs(v[j] - (1 - u[n - j])) < 1e-12, `${scheme} a=${a}`);
    }
  }
  for (const x of [0.1, 0.5, 0.9]) assert.ok(Math.abs(advDiffExact(x, -30) - (1 - advDiffExact(1 - x, 30))) < 1e-15);
});

// ---------------------------------------------------------------- stability functions

test('R(z) at known points', () => {
  const R = (m, x, y = 0) => stabilityValue(m, x, y);
  const close = (a, b, tol = 1e-14) => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);
  close(R('euler', -1).re, 0);
  close(R('euler', -2).re, -1);
  close(R('implicit-euler', -1).re, 0.5);
  close(stabilityAbs('implicit-euler', 0, 1), Math.SQRT1_2);
  close(R('trapezoid', -2).re, 0);
  close(stabilityAbs('trapezoid', 0, 7.3), 1);
  close(R('trapezoid', -1e8).re, -1, 1e-7);
  close(R('heun', -1).re, 0.5);
  close(R('heun', -2).re, 1);
  close(stabilityAbs('heun', 0, 1), Math.sqrt(1.25));
  close(R('rk4', -1).re, 0.375);
  close(R('rk4', -2).re, 1 / 3);
  close(stabilityAbs('rk4', 0, 2 * Math.SQRT2), 1, 1e-13);
  // BDF2: roots of (3/2 - z) zeta^2 - 2 zeta + 1/2 = 0
  close(stabilityAbs('bdf2', 0, 0), 1); // zeta = 1 and 1/3
  close(stabilityAbs('bdf2', 4, 0), 1); // zeta = -1 on the locus
  assert.ok(stabilityAbs('bdf2', 2, 0) > 1); // inside the bounded unstable region
  assert.ok(stabilityAbs('bdf2', 4.5, 0) < 1);
  assert.ok(stabilityAbs('bdf2', -1e8, 0) < 1e-4); // L-stable
  // complex value agrees with the modulus everywhere
  const rand = rng(5);
  for (const m of Object.keys(STABILITY_METHODS)) {
    for (let k = 0; k < 50; k++) {
      const x = 8 * rand() - 6;
      const y = 8 * rand() - 4;
      const v = stabilityValue(m, x, y);
      close(Math.hypot(v.re, v.im), stabilityAbs(m, x, y), 1e-12);
    }
  }
});

test('stability intervals: RK4 reaches -2.7853 on the real axis and 2√2 on the imaginary axis', () => {
  assert.ok(Math.abs(realStabilityLimit('rk4') + 2.785293563405) < 1e-9);
  assert.ok(Math.abs(imagStabilityLimit('rk4') - 2 * Math.SQRT2) < 1e-9);
  assert.ok(Math.abs(realStabilityLimit('euler') + 2) < 1e-9);
  assert.ok(Math.abs(realStabilityLimit('heun') + 2) < 1e-9);
  assert.equal(imagStabilityLimit('euler'), 0);
  assert.equal(imagStabilityLimit('heun'), 0);
  for (const m of ['implicit-euler', 'trapezoid', 'bdf2']) {
    assert.equal(realStabilityLimit(m), -Infinity);
    assert.equal(imagStabilityLimit(m), Infinity);
  }
  // limits are measured once per method and cached: repeat calls are free and identical
  for (const m of Object.keys(STABILITY_METHODS)) assert.equal(realStabilityLimit(m), realStabilityLimit(m));
  assert.ok(Math.abs(maxStableStep('euler', -1000) - 0.002) < 1e-15);
  assert.ok(Math.abs(maxStableStep('rk4', -1000) - 0.002785293563405) < 1e-12);
  assert.equal(maxStableStep('bdf2', -1000), Infinity);
  // the metadata quotes the measured values
  for (const m of Object.keys(STABILITY_METHODS)) {
    const meta = STABILITY_METHODS[m].realInterval[0];
    assert.ok(meta === realStabilityLimit(m) || Math.abs(meta - realStabilityLimit(m)) < 1e-9, m);
  }
});

test('A-stability and L-stability over the left half-plane', () => {
  const grid = (m) => stabilityGrid(m, [-60, 0], [-60, 60], 120, 240);
  for (const m of ['implicit-euler', 'trapezoid', 'bdf2']) {
    const g = grid(m);
    let mx = 0;
    for (const v of g) mx = Math.max(mx, v);
    assert.ok(mx <= 1 + 1e-6, `${m} max |R| = ${mx}`);
    assert.ok(STABILITY_METHODS[m].aStable);
  }
  for (const m of ['euler', 'heun', 'rk4']) {
    const g = grid(m);
    assert.ok(g.some((v) => v > 1), m);
    assert.ok(!STABILITY_METHODS[m].aStable);
  }
  // |R(-inf)|: 0 for the L-stable methods, 1 for the trapezoid rule
  assert.ok(stabilityAbs('implicit-euler', -1e10, 0) < 1e-9);
  assert.ok(stabilityAbs('bdf2', -1e10, 0) < 1e-4);
  assert.ok(Math.abs(stabilityAbs('trapezoid', -1e10, 0) - 1) < 1e-9);
});

test('boundary loci lie on |R| = 1 and close up', () => {
  for (const m of Object.keys(STABILITY_METHODS)) {
    const { re, im } = boundaryLocus(m, 400);
    let dev = 0;
    let seg = 0;
    for (let k = 0; k < re.length; k++) {
      dev = Math.max(dev, Math.abs(stabilityAbs(m, re[k], im[k]) - 1));
      if (k) seg = Math.max(seg, Math.hypot(re[k] - re[k - 1], im[k] - im[k - 1]));
    }
    assert.ok(dev < 1e-9, `${m}: max ||R| - 1| = ${dev}`);
    assert.ok(seg < 0.1, `${m}: largest gap ${seg}`);
    if (m !== 'trapezoid') {
      assert.ok(Math.hypot(re[0] - re.at(-1), im[0] - im.at(-1)) < 1e-9, `${m} closes`);
    }
  }
  const rk = boundaryLocus('rk4', 2000);
  assert.ok(Math.abs(Math.min(...rk.re) + 2.7853) < 1e-3);
  const b = boundaryLocus('bdf2', 401);
  assert.ok(Math.abs(b.re[200] - 4) < 1e-12 && Math.abs(b.im[200]) < 1e-12);
});

test('stabilityGrid is indexed i + j * nx with j = 0 at the bottom, at cell centres', () => {
  const nx = 7;
  const ny = 5;
  const g = stabilityGrid('rk4', [-4, 1], [-3, 3], nx, ny);
  assert.equal(g.length, nx * ny);
  assert.ok(g instanceof Float32Array);
  for (const [i, j] of [[0, 0], [6, 0], [3, 4], [2, 1]]) {
    const x = -4 + ((i + 0.5) * 5) / nx;
    const y = -3 + ((j + 0.5) * 6) / ny;
    assert.ok(Math.abs(g[i + j * nx] - Math.fround(stabilityAbs('rk4', x, y))) === 0);
  }
});

// ---------------------------------------------------------------- integrators

test('one integrator step on the Dahlquist equation multiplies y by R(h lambda)', () => {
  const zs = [[-1, 0], [-0.3, 0.8], [-2.5, 1.5], [0.4, -2], [-30, 5]];
  for (const m of ODE_METHODS) {
    for (const [re, im] of zs) {
      const s = createIntegrator(createProblem('dahlquist', { re, im }), { method: m });
      const R = stabilityValue(m, re, im);
      if (m === 'bdf2') {
        // seed y_{n-1} = y_n / zeta so the step is the dominant mode's step
        const d = R.re * R.re + R.im * R.im;
        s.yPrev[0] = R.re / d;
        s.yPrev[1] = -R.im / d;
        s.steps = 1;
        s.hPrev = 1;
      }
      odeStep(s, { h: 1 });
      const tol = 1e-12 * Math.max(1, Math.hypot(R.re, R.im));
      assert.ok(Math.abs(s.y[0] - R.re) < tol && Math.abs(s.y[1] - R.im) < tol, `${m} z=${re}+${im}i`);
    }
  }
});

function runOde(id, params, method, h, T) {
  const s = createIntegrator(createProblem(id, params), { method });
  const M = Math.round(T / h);
  let worst = 0;
  for (let k = 0; k < M; k++) {
    odeStep(s, { h: T / M });
    fillOdeExact(s);
    for (let i = 0; i < s.n; i++) worst = Math.max(worst, Math.abs(s.y[i] - s.exact[i]));
  }
  fillOdeExact(s);
  return { worst, end: normInf(s.y, s.exact), s };
}

test('Prothero–Robinson (lambda = -1000): explicit Euler blows up for h > 2/1000 and is stable below', () => {
  assert.ok(runOde('prothero-robinson', {}, 'euler', 0.0019, 2).worst < 1e-5);
  assert.ok(runOde('prothero-robinson', {}, 'euler', 0.0005, 2).worst < 1e-6);
  const bad = runOde('prothero-robinson', {}, 'euler', 0.0021, 2).end;
  assert.ok(!(bad < 1e10), `h = 0.0021: error ${bad}`);
  // RK4's limit is 2.785 / 1000
  assert.ok(runOde('prothero-robinson', {}, 'rk4', 0.00275, 2).worst < 1e-4);
  assert.ok(!(runOde('prothero-robinson', {}, 'rk4', 0.0028, 2).end < 100));
});

test('implicit Euler, trapezoid and BDF2 are stable for every h tested; only the L-stable ones kill a stiff transient', () => {
  for (const m of ['implicit-euler', 'trapezoid', 'bdf2']) {
    for (const h of [1e-3, 0.01, 0.1, 0.5, 1]) {
      const { worst } = runOde('prothero-robinson', {}, m, h, 2);
      assert.ok(worst < 1e-3, `${m} h=${h}: ${worst}`);
    }
  }
  // start off the slow solution (y0 = 2): the transient (y0 - 1) e^{lambda t} is gone by t = 0.01
  const tr = createIntegrator(createProblem('prothero-robinson', { y0: 2 }), { method: 'trapezoid' });
  const be = createIntegrator(createProblem('prothero-robinson', { y0: 2 }), { method: 'implicit-euler' });
  const trErr = [];
  for (let k = 0; k < 10; k++) {
    odeStep(tr, { h: 0.1 });
    odeStep(be, { h: 0.1 });
    trErr.push(tr.y[0] - fillOdeExact(tr)[0]);
    if (k === 0) assert.ok(Math.abs(be.y[0] - fillOdeExact(be)[0]) < 0.011); // R(-100) = 1/101
  }
  // trapezoid: R(-100) = -49/51, so the transient survives and flips sign every step
  for (let k = 1; k < 10; k++) assert.ok(trErr[k] * trErr[k - 1] < 0);
  assert.ok(Math.abs(trErr[9]) > 0.6, `after 10 steps ${trErr[9]}`);
  assert.ok(Math.abs(be.y[0] - fillOdeExact(be)[0]) < 1e-4);
});

test('two time scales: the decayed fast mode still limits explicit Euler to h < 2/1000', () => {
  const good = runOde('two-by-two', {}, 'euler', 0.0019, 5);
  assert.ok(good.end < 1e-4, `h = 0.0019: ${good.end}`);
  const bad = runOde('two-by-two', {}, 'euler', 0.0021, 5);
  assert.ok(!(bad.end < 1e10), `h = 0.0021: ${bad.end}`);
  // start on the slow solution plus a roundoff-sized fast component: still unstable
  const p = createProblem('two-by-two', {});
  p.y0[0] = 1 + 1e-12;
  p.y0[1] = 1 - 1e-12;
  const s = createIntegrator(p, { method: 'euler' });
  for (let k = 0; k < 2000; k++) odeStep(s, { h: 0.0021 });
  assert.ok(Math.abs(s.y[0] - s.y[1]) > 1, 'the 1e-12 seed grows by 1.1 per step');
  // implicit Euler takes h = 0.5 happily
  assert.ok(runOde('two-by-two', {}, 'implicit-euler', 0.5, 5).end < 0.02);
});

test('orders of accuracy on non-stiff problems: Euler 1, Heun 2, RK4 4, implicit Euler 1, trapezoid 2, BDF2 2', () => {
  const expect = { euler: 1, heun: 2, rk4: 4, 'implicit-euler': 1, trapezoid: 2, bdf2: 2 };
  for (const m of ODE_METHODS) {
    // unforced: y' = A y
    const errs = [20, 40, 80, 160].map((k) => runOde('two-by-two', { fast: -10 }, m, 1 / k, 1).end);
    const p = observedOrders(errs).at(-1);
    assert.ok(Math.abs(p - expect[m]) < 0.1, `${m}: ${observedOrders(errs)}`);
    assert.equal(STABILITY_METHODS[m].order, expect[m]);
    // forced: Prothero–Robinson with lambda = -1 and y0 = 2, so f(t) matters at
    // every stage (a stage evaluated at the wrong time drops the order)
    const ferrs = [20, 40, 80, 160].map((k) => runOde('prothero-robinson', { lambda: -1, y0: 2 }, m, 2 / k, 2).end);
    const fp = observedOrders(ferrs).at(-1);
    assert.ok(Math.abs(fp - expect[m]) < 0.07, `${m} forced: ${observedOrders(ferrs)}`);
  }
});

test('stiff demos: each broken recipe explodes or keeps the transient, each fixed one tracks the solution', () => {
  const run = (r) => {
    const s = createIntegrator(createProblem(r.problem, r.params), { method: r.method });
    const M = Math.round(r.tEnd / r.h);
    const err = [];
    for (let k = 0; k < M; k++) {
      odeStep(s, { h: r.h });
      err.push(s.y[0] - fillOdeExact(s)[0]);
    }
    return { s, err, end: normInf(s.y, fillOdeExact(s)), worst: Math.max(...err.map(Math.abs)) };
  };
  const explodes = (x) => !(x.end < 1e10);
  const checks = {
    'explicit-euler-limit': (b, f, d) => {
      const lam = createProblem(d.broken.problem, d.broken.params).params.lambda;
      assert.ok(d.broken.h > 2 / -lam && d.fixed.h < 2 / -lam, 'the pair straddles h = 2/|lambda|');
      assert.equal(d.broken.method, d.fixed.method);
      assert.ok(explodes(b), `h = ${d.broken.h}: ${b.end}`);
      assert.ok(f.worst < 1e-5, `h = ${d.fixed.h}: ${f.worst}`);
    },
    'implicit-big-steps': (b, f, d) => {
      assert.equal(d.broken.h, d.fixed.h);
      assert.ok(explodes(b));
      assert.ok(f.worst < 1e-3, `implicit Euler at h = ${d.fixed.h}: ${f.worst}`);
    },
    'trapezoid-ringing': (b, f) => {
      // R(-100) = -49/51 for the trapezoid rule, 1/101 for implicit Euler
      for (let k = 1; k < b.err.length; k++) assert.ok(b.err[k] * b.err[k - 1] < 0, 'transient flips sign each step');
      assert.ok(Math.abs(b.err.at(-1)) > 0.6, `after ${b.err.length} steps ${b.err.at(-1)}`);
      assert.ok(Math.abs(f.err[0]) < 0.011 && Math.abs(f.err.at(-1)) < 1e-4);
    },
    'two-scales': (b, f) => {
      assert.ok(explodes(b), `explicit Euler: ${b.end}`);
      assert.ok(f.end < 0.02, `implicit Euler: ${f.end}`);
    },
  };
  assert.deepEqual(Object.keys(checks).sort(), Object.keys(STIFF_DEMOS).sort(), 'every demo has a check');
  for (const [id, d] of Object.entries(STIFF_DEMOS)) {
    assert.equal(d.id, id);
    checks[id](run(d.broken), run(d.fixed), d);
  }
});

test('BDF2 restarts with an implicit Euler step when h changes', () => {
  const s = createIntegrator(createProblem('prothero-robinson', {}), { method: 'bdf2' });
  odeStep(s, { h: 0.01 });
  assert.equal(s.startup, true);
  odeStep(s, { h: 0.01 });
  assert.equal(s.startup, false);
  odeStep(s, { h: 0.02 });
  assert.equal(s.startup, true);
  resetIntegrator(s);
  assert.equal(s.t, 0);
  assert.equal(s.y[0], 1);
});

test('method of lines: heat eigenpairs, stiffness ratio ∝ dx^-2, explicit limit = FTCS r <= 1/2', () => {
  // eigenpairs of the assembled matrix
  const n = 8;
  const p = createProblem('heat-mol', { n });
  const lam = heatEigenvalues(n);
  const m = n - 1;
  for (let k = 1; k < n; k++) {
    let e = 0;
    for (let i = 0; i < m; i++) {
      let Av = 0;
      for (let c = 0; c < m; c++) Av += p.A[i * m + c] * Math.sin((k * Math.PI * (c + 1)) / n);
      e = Math.max(e, Math.abs(Av - lam[k - 1] * Math.sin((k * Math.PI * (i + 1)) / n)));
    }
    assert.ok(e < 1e-9, `mode ${k}`);
  }
  // stiffness ratio grows like dx^-2 and approaches 4 / (pi^2 dx^2)
  const ns = [16, 32, 64, 128];
  const ratios = ns.map(stiffnessRatio);
  for (const q of observedOrders(ratios)) assert.ok(Math.abs(q + 2) < 0.01, `${observedOrders(ratios)}`);
  assert.ok(Math.abs((ratios.at(-1) * Math.PI ** 2) / (4 * 128 * 128) - 1) < 1e-3);
  const l16 = heatEigenvalues(16);
  assert.ok(Math.abs(Math.abs(l16.at(-1) / l16[0]) - ratios[0]) < 1e-9);
  assert.ok(Math.abs(p.stiffness - Math.abs(lam.at(-1) / lam[0])) < 1e-12);
  // explicit Euler on the semi-discrete system: stable just below 2/|lambda_max|, unstable just above
  const hmax = heatExplicitLimit(n);
  assert.ok(Math.abs(hmax - 2 / Math.abs(lam.at(-1))) < 1e-15);
  assert.ok(hmax > 1 / (2 * n * n) && hmax < 1.05 / (2 * n * n)); // ≈ dx^2 / 2
  const rand = rng(2);
  for (const [f, grows] of [[0.99, false], [1.01, true]]) {
    const q = createProblem('heat-mol', { n });
    for (let i = 0; i < m; i++) q.y0[i] += 1e-3 * (rand() - 0.5);
    const s = createIntegrator(q, { method: 'euler' });
    for (let k = 0; k < 3000; k++) odeStep(s, { h: f * hmax });
    assert.equal(normInf(s.y) > 1, grows, `h = ${f} h_max`);
  }
  // the semi-discrete exact solution e^{lambda_1 t} sin(pi x_j) is reproduced, at second order
  const e1 = runOde('heat-mol', { n: 6 }, 'trapezoid', 1e-3, 0.2).end;
  const e2 = runOde('heat-mol', { n: 6 }, 'trapezoid', 5e-4, 0.2).end;
  assert.ok(e1 < 1e-5 && Math.abs(Math.log2(e1 / e2) - 2) < 0.01, `${e1} ${e2}`);
});

test('solveDense solves small systems with pivoting', () => {
  const rand = rng(9);
  for (const n of [1, 2, 3, 6]) {
    for (let t = 0; t < 10; t++) {
      const rows = Array.from({ length: n }, () => Array.from({ length: n }, () => 2 * rand() - 1));
      if (n > 1) rows[0][0] = 0; // forces a row swap
      const b = Array.from({ length: n }, () => rand());
      const M = Float64Array.from(rows.flat());
      const x = solveDense(M, Float64Array.from(b), n);
      assert.ok(relErr(x, denseSolve(rows, b)) < 1e-9);
    }
  }
});

test('every TeX string in the metadata parses', () => {
  const all = [HEAT_SCHEMES, ADVDIFF_SCHEMES, STABILITY_METHODS, STIFF_PROBLEMS];
  let count = 0;
  for (const table of all) {
    for (const entry of Object.values(table)) {
      for (const [k, v] of Object.entries(entry)) {
        if (k.startsWith('tex') || k === 'stability' || k === 'monotone') {
          assert.doesNotThrow(() => tex(v), `${entry.id}.${k}: ${v}`);
          count++;
        }
      }
    }
  }
  assert.ok(count > 20);
  for (const p of Object.values(HEAT_PRESETS)) assert.ok(typeof p.initial === 'function' && p.description);
});
