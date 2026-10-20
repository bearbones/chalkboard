// Chapter 15 (trust, "Can you trust the numbers?") kernels and the numbers
// the chapter quotes. Kernels: src/sims/ch-trust-reduce.js (parallel-sum
// reproducibility) and ch-trust-bench.js (sampling lattice-Boltzmann
// benchmarks). The chapter also quotes the shared kernels verification.js
// (MMS, GCI, summation, oscillator) and lbm.js (Poiseuille, cavity); those
// claims are checked here against exact answers where there are any.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeData, exactSum, chunkedSum, sweepThreads, ulp, conditionNumber, summationBounds } from '../../aids/fluid-course/src/sims/ch-trust-reduce.js';
import { poiseuilleError, poiseuilleSlip, ghiaDeviation, cavityProfiles } from '../../aids/fluid-course/src/sims/ch-trust-bench.js';
import { mmsConvergence, mmsSolve, MMS_SOLUTIONS, gci3, createSummation, stepSummation, summationErrors, createOscillator, stepOscillator, oscillatorErrors } from '../../aids/fluid-course/src/sims/verification.js';
import { createPreset, step, magicOf, GHIA_RE100 } from '../../aids/fluid-course/src/sims/lbm.js';
import { drain } from '../../aids/fluid-course/src/sims/util.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} got ${a}, want ${b} ± ${tol}`);
const PS = Array.from({ length: 64 }, (_, i) => i + 1);

// ---------------------------------------------------------------------------
// ch-trust-reduce.js

test('reduce: exactSum is exact on data whose sum a double can hold', () => {
  // Multiples of 2^-30 below 2^20: every partial sum is exact in double, so a
  // plain loop gives the true sum; mix in cancelling large terms that break
  // a plain loop but not Sum2.
  const r = makeData(5000, 'positive', { seed: 9 });
  const x = new Float64Array(5002);
  let plain = 0;
  for (let i = 0; i < 5000; i++) {
    x[i] = Math.round(r[i] * 2 ** 30) / 2 ** 30;
    plain += x[i];
  }
  x[5000] = 2 ** 60;
  x[5001] = -(2 ** 60);
  assert.equal(exactSum(x), plain);
  let naive = 0;
  for (const v of x) naive += v;
  assert.notEqual(naive, plain, 'the cancelling pair defeats a plain loop');
});

test('reduce: one thread is the plain left-to-right loop; results are deterministic', () => {
  for (const precision of ['f32', 'f64']) {
    const x = makeData(3000, 'mixed', { precision });
    const fr = precision === 'f32' ? Math.fround : (v) => v;
    let s = 0;
    for (const v of x) s = fr(s + v);
    assert.equal(chunkedSum(x, 1, { precision }), s);
    assert.equal(chunkedSum(x, 7, { precision }), chunkedSum(x, 7, { precision }));
  }
  assert.throws(() => chunkedSum(new Float64Array(4), 5), RangeError);
  assert.throws(() => makeData(10, 'nope'));
});

test('reduce: every thread count stays inside Higham’s bounds', () => {
  for (const kind of ['positive', 'mixed'])
    for (const precision of ['f32', 'f64'])
      for (const method of ['naive', 'kahan']) {
        const x = makeData(16384, kind, { precision });
        const ex = exactSum(x);
        const b = summationBounds(x, precision);
        // The Kahan bound is per chunk plus the combination; allow a factor 4.
        const bound = method === 'naive' ? b.naive : 4 * b.kahan;
        for (const s of drain(sweepThreads(x, PS, { precision, method }))) assert.ok(Math.abs(s - ex) <= bound, `${kind} ${precision} ${method}`);
      }
});

test('reduce: the numbers the chapter quotes (n = 16384, seed 1, P = 1..64)', () => {
  const stats = (kind, precision, method) => {
    const x = makeData(16384, kind, { precision });
    const ex = exactSum(x);
    const s = drain(sweepThreads(x, PS, { precision, method }));
    const u = ulp(ex, precision);
    return { distinct: new Set(s).size, spread: (Math.max(...s) - Math.min(...s)) / u, cond: conditionNumber(x) };
  };
  const a = stats('positive', 'f32', 'naive');
  assert.equal(a.distinct, 8);
  assert.equal(a.spread, 11);
  near(a.cond, 1, 1e-12);
  assert.equal(stats('positive', 'f32', 'kahan').distinct, 1);
  const m = stats('mixed', 'f64', 'naive');
  assert.equal(m.distinct, 22);
  assert.equal(m.spread, 55);
  near(m.cond, 67.9, 0.1);
  const mk = stats('mixed', 'f64', 'kahan');
  assert.equal(mk.distinct, 3);
  assert.equal(mk.spread, 2);
});

test('reduce: ulp is the gap to the next float', () => {
  assert.equal(ulp(1), Number.EPSILON);
  assert.equal(ulp(1, 'f32'), 2 ** -23);
  assert.equal(ulp(1.5), Number.EPSILON);
  assert.equal(ulp(2), 2 * Number.EPSILON);
  assert.equal(ulp(-8199.48, 'f32'), 2 ** -10);
});

// ---------------------------------------------------------------------------
// ch-trust-bench.js and lbm.js benchmarks

function runPoiseuille(opts) {
  const L = createPreset('poiseuille', { nx: 4, ...opts });
  let prev = 1;
  for (let k = 0; k < 300000; k += 100) {
    step(L, 100);
    const e = poiseuilleError(L);
    if (Math.abs(e - prev) < 1e-12) return e;
    prev = e;
  }
  return prev;
}

test('bench: Poiseuille wall error, BGK against TRT', () => {
  near(runPoiseuille({ collision: 'bgk', tau: 2, ny: 24 }), 0.0191, 0.0002, 'BGK tau 2 H 24');
  near(runPoiseuille({ collision: 'bgk', tau: 3, ny: 24 }), 0.0561, 0.0003, 'BGK tau 3 H 24');
  near(runPoiseuille({ collision: 'bgk', tau: 2, ny: 8 }), 0.172, 0.001, 'BGK tau 2 H 8');
  near(runPoiseuille({ collision: 'bgk', tau: 2, ny: 16 }), 0.043, 0.0005, 'BGK tau 2 H 16');
  assert.ok(runPoiseuille({ collision: 'bgk', tau: 0.5 + Math.sqrt(3 / 16), ny: 24 }) < 1e-6, 'BGK exact at tau = 1/2 + sqrt(3/16)');
  for (const tau of [0.6, 2, 3]) assert.ok(runPoiseuille({ collision: 'trt', tau, ny: 24 }) < 1e-10, `TRT exact at tau ${tau}`);
  // Second order in H at fixed tau: the error ratio from H = 16 to 24 is (24/16)^2.
  near(runPoiseuille({ collision: 'bgk', tau: 2, ny: 16 }) / runPoiseuille({ collision: 'bgk', tau: 2, ny: 24 }), 2.25, 0.01);
});

test('bench: the channel error is a uniform slip (16 Lambda - 3) / (3 H^2) of u_max', () => {
  for (const [collision, tau, ny, magic] of [['bgk', 0.55, 24], ['bgk', 1, 24], ['bgk', 2, 8], ['bgk', 3, 24], ['trt', 2, 24, 0.25], ['trt', 0.7, 16, 1 / 12]]) {
    const L = createPreset('poiseuille', { nx: 4, ny, tau, collision, magic });
    const err = new Float64Array(ny);
    let prev = 1;
    for (let k = 0; k < 300000; k += 100) {
      step(L, 100);
      const e = poiseuilleError(L, null, err);
      if (Math.abs(e - prev) < 1e-13) break;
      prev = e;
    }
    const want = poiseuilleSlip(magicOf(L), ny);
    for (const d of err) near(d, want, 1e-9 + 1e-6 * Math.abs(want), `${collision} tau ${tau} H ${ny}`);
  }
  assert.equal(poiseuilleSlip(3 / 16, 24), 0);
  assert.ok(poiseuilleSlip((0.55 - 0.5) ** 2, 24) < 0, 'below Lambda = 3/16 the fluid lags (negative slip)');
});

function runCavity(n, U = 0.1) {
  const L = createPreset('cavity', { n, U });
  let prev = null;
  let k = 0;
  const out = {};
  for (; k < 100000; k += 200) {
    step(L, 200);
    const p = cavityProfiles(L, out);
    const um = p.u[Math.floor(p.u.length / 2)];
    if (prev !== null && Math.abs(um - prev) < 2e-7) break;
    prev = um;
  }
  return { ...ghiaDeviation(L), steps: k + 200, profiles: out };
}

test('bench: lid-driven cavity at Re 100 against Ghia, Ghia & Shin (1982)', () => {
  const r24 = runCavity(24);
  const r32 = runCavity(32);
  const r48 = runCavity(48);
  near(r24.du, 0.0201, 0.0005, 'n 24');
  near(r32.du, 0.0123, 0.0005, 'n 32');
  near(r48.du, 0.0066, 0.0003, 'n 48');
  near(r32.uMin, -0.1986, 0.0005);
  near(r48.uMin, -0.2044, 0.0005);
  assert.ok(r24.du > r32.du && r32.du > r48.du, 'deviation falls with refinement');
  assert.ok(r24.steps < 8000 && r48.steps < 12000, 'steady within the quoted step counts');
  // The profiles include the walls: u = 0 at the floor and u = U at the lid.
  near(r32.profiles.u[0], 0, 1e-15);
  near(r32.profiles.u.at(-1), 1, 1e-15);
  assert.equal(GHIA_RE100.y.length, 17);
});

test('bench: the cavity deviation levels off near half a percent of U', { timeout: 60000 }, () => {
  const r64 = runCavity(64);
  near(r64.du, 0.0049, 0.0003, 'n 64');
  near(r64.uMin, -0.2072, 0.0005);
  const slow = runCavity(64, 0.05);
  near(slow.du, 0.0045, 0.0003, 'n 64 at half the lid speed');
});

// ---------------------------------------------------------------------------
// verification.js numbers quoted in the chapter

test('MMS: the orders the chapter quotes', () => {
  const ord = (o) => mmsConvergence(o).orders;
  const ok = ord({});
  for (const p of ok) near(p, 2, 0.03);
  const bc = ord({ bugs: ['bc-first-order'] });
  [1.6, 0.58, 0.83, 0.92, 0.96].forEach((v, k) => near(bc[k], v, 0.01, `bc order ${k}`));
  near(ord({ bugs: ['source-shift'] }).at(-1), 1, 0.02);
  near(ord({ bugs: ['advection-half'] }).at(-1), 0, 0.02);
  near(ord({ bugs: ['diffusion-half'] }).at(-1), 0, 0.02);
  near(ord({ advection: 'upwind' }).at(-1), 1, 0.02);
  const plateau = mmsConvergence({ bugs: ['advection-half'] }).errMax;
  near(plateau.at(-1), 0.233, 0.001);
  assert.ok(Math.max(...mmsConvergence({ solution: 'linear', bugs: ['diffusion-half'] }).errMax) < 1e-13);
  // The coarsest buggy grid beats the correct code.
  assert.ok(mmsSolve({ n: 10, bugs: ['bc-first-order'] }).errMax < mmsSolve({ n: 10 }).errMax);
});

// GCI on u(1), the value at the Neumann end, from grids N, 2N, 4N.
function gciU1(N, bugs) {
  const f = [4 * N, 2 * N, N].map((n) => mmsSolve({ n, bugs }).u[n]);
  return { ...gci3({ f, h: [1 / (4 * N), 1 / (2 * N), 1 / N] }), f };
}
const EXACT_U1 = MMS_SOLUTIONS['sine-exp'].u(1);

test('GCI from the MMS solver: correct code, false convergence, pre-asymptotic grids', () => {
  const ok = gciU1(10, []);
  near(ok.p, 1.977, 0.001);
  near(ok.gciFine21, 8.08e-4, 0.02e-4);
  const trueErr = Math.abs(ok.f[0] - EXACT_U1) / EXACT_U1;
  near(trueErr, 6.35e-4, 0.02e-4);
  assert.ok(trueErr < ok.gciFine21, 'the band contains the truth');
  near(Math.abs(ok.fExt21 - EXACT_U1) / EXACT_U1, 1.1e-5, 0.1e-5);

  const fc = gciU1(6, ['bc-first-order']);
  assert.equal(fc.convergence, 'monotone');
  near(fc.p, 6.61, 0.01);
  near(Math.abs(fc.f[0] - fc.f[1]) / fc.f[0], 7.9e-5, 0.1e-5);
  near((fc.f[0] - EXACT_U1) / EXACT_U1, 2.15e-3, 0.01e-3);
  assert.ok(fc.gciFine21 < 1.1e-6 && fc.gciFine21 > 0.9e-6);
  const next = gciU1(12, ['bc-first-order']);
  assert.equal(next.convergence, 'oscillatory');
  near(next.p, 3.34, 0.01);

  const pre = gciU1(20, ['bc-first-order']);
  assert.equal(pre.convergence, 'monotone');
  near(pre.p, 0.184, 0.002);
  near(pre.gciFine21, 6.25e-3, 0.03e-3);
  near((pre.f[0] - EXACT_U1) / EXACT_U1, 8.7e-4, 0.1e-4);
  near((pre.fExt21 - EXACT_U1) / EXACT_U1, -4.1e-3, 0.1e-3);
  for (const N of [13, 15, 18]) assert.equal(gciU1(N, ['bc-first-order']).convergence, 'divergent');
});

test('GCI: the asymptotic-range ratio is ~1 by construction for a constant ratio', () => {
  for (const N of [6, 10, 20]) near(gciU1(N, ['bc-first-order']).asymptoticRatio, 1, 0.002);
});

test('summation: Float32 stall, jittered drift, Float64 drift', () => {
  const run = (o, n = 1e6) => {
    const s = createSummation(o);
    stepSummation(s, n);
    return summationErrors(s);
  };
  const stall = run({ precision: 'f32', increment: 1e-8 });
  assert.equal(stall.naive, 1);
  near(stall.kahanAddedRel, 9.5e-7, 0.1e-7);
  const drift = run({ precision: 'f32', increment: 1e-6, jitter: 0.5 });
  near(drift.naiveAddedRel, 1.03e-3, 0.01e-3);
  near(drift.naiveErr / drift.kahanErr, 2.1e4, 0.05e4);
  const steady = run({ precision: 'f32', increment: 1e-6 });
  near(steady.naiveAddedRel, 0.0463, 0.0005);
  const over = run({ precision: 'f32', increment: 6e-8 });
  near(over.naiveAddedRel, 0.987, 0.002);
  const d64 = run({ precision: 'f64', increment: 1e-10 });
  near(d64.naiveErr, 8.27e-12, 0.01e-12);
  near(d64.kahanErr, 1.1e-17, 0.05e-17);
  const half = run({ precision: 'f64', increment: 1e-10 }, 5e5);
  near(d64.naiveErr / half.naiveErr, 2, 0.005);
  assert.ok(2 ** -24 < 6e-8 && 2 ** -24 > 5.9e-8, 'the f32 threshold lies between the two increments');
});

test('oscillator: Float32 against Float64 over 1e6 steps', () => {
  const run = (o) => {
    const s = createOscillator({ omega: 1, dt: 0.01, ...o });
    stepOscillator(s, 1e6);
    return oscillatorErrors(s);
  };
  const e = run({});
  near(e.invErr64, 4.6e-14, 0.1e-14);
  near(e.invErr32, 6.8e-6, 0.1e-6);
  near(Math.abs(e.phaseDiff), 2.17e-4, 0.02e-4);
  near(e.phaseFromParams / e.phaseDiff, 1.03, 0.01);
  near(e.clockErr32, -134.8, 0.1);
  near(e.truncErr64, 1.53e-2, 0.01e-2);
  const same = run({ sameParams: true });
  near(Math.abs(same.phaseDiff), 7.0e-6, 0.1e-6);
});
