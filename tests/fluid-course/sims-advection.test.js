// Tests for src/sims/advection.js: the claims the advection chapter makes,
// measured against analytic solutions, conservation, symmetry and refinement.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMES, LIMITERS, PROFILES, PRESETS, WENO_NU_MAX, makeProfile, exact, exactAverages, exactPoints,
  createState, reset, step, diagnostics, amplification, relativePhaseSpeed, maxAmplification,
  modifiedEquation, convergenceStudy,
} from '../../aids/fluid-course/src/sims/advection.js';
import { drain, totalVariation } from '../../aids/fluid-course/src/sims/util.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

const LINEAR = ['upwind', 'downwind', 'ftcs', 'lxf', 'lw', 'bw', 'fromm', 'leapfrog'];
const TVD = Object.keys(LIMITERS).filter((k) => LIMITERS[k].tvd);
const study = (id, nu, ns, prof, T, opts) => drain(convergenceStudy(id, nu, ns, prof, T, opts));
const maxDiff = (a, b) => {
  let m = 0;
  for (let k = 0; k < a.length; k++) m = Math.max(m, Math.abs(a[k] - b[k]));
  return m;
};
const roll = (u, s) => {
  const n = u.length, out = new Float64Array(n);
  for (let j = 0; j < n; j++) out[(((j + s) % n) + n) % n] = u[j];
  return out;
};
const run = (st, id, nu, N, opts) => {
  for (let k = 0; k < N; k++) step(st, id, nu, opts);
  return st;
};

// ------------------------------------------------------------ metadata

test('metadata: every scheme and limiter is complete and its TeX parses', () => {
  for (const [id, s] of Object.entries(SCHEMES)) {
    assert.equal(s.id, id);
    for (const k of ['name', 'kind', 'description', 'tex', 'flux', 'stability', 'cite']) assert.equal(typeof s[k], 'string', `${id}.${k}`);
    assert.ok(['linear', 'limited', 'nonlinear'].includes(s.kind), id);
    assert.ok(Number.isFinite(s.order) && Number.isFinite(s.nuMax), id);
    for (const k of ['tex', 'flux', 'stability', 'modified', 'rk']) if (s[k]) assert.doesNotThrow(() => tex(s[k]), `${id}.${k}: ${s[k]}`);
  }
  for (const [id, l] of Object.entries(LIMITERS)) {
    assert.equal(l.id, id);
    assert.equal(typeof l.phi, 'function');
    assert.doesNotThrow(() => tex(l.tex), `${id}: ${l.tex}`);
  }
  assert.equal(SCHEMES.weno5.nuMax, WENO_NU_MAX[3]);
  for (const id of Object.keys(PROFILES)) {
    const p = makeProfile(id);
    for (let k = 0; k < 50; k++) assert.ok(Number.isFinite(p.f(k / 50)), id);
  }
});

test('limiters: φ(1) = 1, and the TVD ones stay in Sweby’s region (0 ≤ φ ≤ min(2θ, 2), φ = 0 for θ ≤ 0)', () => {
  for (const id of TVD) {
    const phi = LIMITERS[id].phi;
    if (id !== 'upwind') assert.equal(phi(1), 1, id);
    for (let k = -400; k <= 1000; k++) {
      const t = k / 100;
      const v = phi(t);
      assert.ok(v >= 0, `${id} φ(${t}) = ${v}`);
      assert.ok(v <= Math.min(2 * Math.max(t, 0), 2) + 1e-15, `${id} φ(${t}) = ${v}`);
    }
    // Finite at the extremes: a subnormal jump makes θ overflow (see the next test).
    for (const t of [Infinity, -Infinity, 1e200, 1e155, -1e200, 5e-324, -5e-324]) {
      const v = phi(t);
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 2, `${id} φ(${t}) = ${v}`);
    }
  }
  assert.equal(LIMITERS.vanleer.phi(Infinity), 2);
  assert.equal(LIMITERS.vanalbada.phi(Infinity), 1);
});

test('limited scheme stays finite and TVD when a jump decays to subnormal values (long runs near |ν| = 1)', () => {
  // A jump's upstream tail decays below 1e-308 within a few periods at ν ≈ 0.95, so
  // W_{j-1/2} can be 5e-324 beside W_up ≈ 1e-12 and θ = W_up/W overflows. Before the
  // fix van Leer gave φ(±∞) = NaN here (NaN after 260 steps) and the NaN filled the grid.
  for (const l of ['vanleer', 'vanalbada']) {
    const st = createState(200, 'square');
    let tv = totalVariation(st.u);
    for (let k = 0; k < 1000; k++) {
      step(st, 'limited', 0.95, { limiter: l });
      const tv1 = totalVariation(st.u);
      assert.ok(tv1 <= tv + 1e-12, `${l} step ${k}: ${tv} → ${tv1}`);
      tv = tv1;
    }
    assert.ok(st.u.every(Number.isFinite), l);
  }
  // The same thing from hand-made data, one step.
  for (const l of TVD) {
    const st = createState(8, 'square');
    st.u.set([0, 0, 0, 1e-15, 0, 5e-324, 5e-324, 0]);
    step(st, 'limited', 0.5, { limiter: l });
    assert.ok(st.u.every(Number.isFinite), `${l}: ${Array.from(st.u)}`);
  }
});

// ------------------------------------------------------------ profiles and exact solution

test('exact cell averages integrate each profile exactly (jumps and kinks split out)', () => {
  const n = 37; // cell edges do not line up with the profile's jumps
  const dx = 1 / n;
  const mass = (spec) => exactAverages(spec, n).reduce((s, v) => s + v, 0) * dx;
  assert.ok(Math.abs(mass('square') - 0.25) < 1e-15);
  assert.ok(Math.abs(mass('triangle') - 0.15) < 1e-14);
  assert.ok(Math.abs(mass('gaussian') - 0.05 * Math.sqrt(2 * Math.PI)) < 1e-12);
  assert.ok(Math.abs(mass({ id: 'sine', k: 3 })) < 1e-15);
  // ∫ exp(−d²/2σ²) cos(2πkd) dd = σ√(2π) exp(−2π²σ²k²)
  assert.ok(Math.abs(mass({ id: 'packet', k: 2 }) - 0.08 * Math.sqrt(2 * Math.PI) * Math.exp(-2 * Math.PI ** 2 * 0.0064 * 4)) < 1e-8);
  // A narrow Gaussian (σ = 0.02 is under one cell at n = 37) still integrates to σ√(2π).
  assert.ok(Math.abs(mass({ id: 'gaussian', sigma: 0.02 }) - 0.02 * Math.sqrt(2 * Math.PI)) < 1e-14);
});

test('combined (Jiang–Shu) cell averages agree with an independent reference to 1e-12, half ellipse included', () => {
  // Reference: the half ellipse from its antiderivative, (s√(1 − s²) + asin s)/20 with
  // s = 10(X − c), and everything else by 80-panel Gauss–Legendre between the published
  // breakpoints. (5-point Gauss–Legendre alone is off by ~1e-4 next to the ellipse's
  // square-root edges.)
  const GX = [-0.906179845938664, -0.5384693101056831, 0, 0.5384693101056831, 0.906179845938664];
  const GW = [0.2369268850561891, 0.4786286704993665, 0.5688888888888889, 0.4786286704993665, 0.2369268850561891];
  const gl = (g, lo, hi, m = 80) => {
    let s = 0;
    const h = (hi - lo) / m;
    for (let p = 0; p < m; p++) for (let k = 0; k < 5; k++) s += GW[k] * g(lo + (p + 0.5) * h + 0.5 * h * GX[k]);
    return 0.5 * h * s;
  };
  const f = makeProfile('combined').f;
  const rest = (x) => {
    const X = 2 * (x - Math.floor(x)) - 1;
    return X >= 0.4 && X <= 0.6 ? 0 : f(x);
  };
  const H = (X, c) => {
    const s = Math.max(-1, Math.min(1, 10 * (X - c)));
    return (s * Math.sqrt(1 - s * s) + Math.asin(s)) / 20;
  };
  const ellipse = (Xa, Xb) => {
    const ca = Math.max(0.4, Math.min(0.6, Xa)), cb = Math.max(0.4, Math.min(0.6, Xb));
    return ((H(cb, 0.495) - H(ca, 0.495)) + (H(cb, 0.505) - H(ca, 0.505)) + 4 * (H(cb, 0.5) - H(ca, 0.5))) / 6;
  };
  const brk = [-0.8, -0.6, -0.4, -0.2, 0, 0.1, 0.2, 0.4, 0.6].map((X) => (X + 1) / 2);
  for (const [n, t] of [[50, 0], [400, 0], [64, 0.3137]]) {
    const av = exactAverages('combined', n, t);
    for (let j = 0; j < n; j++) {
      let lo = j / n - t;
      lo -= Math.floor(lo);
      const hi = lo + 1 / n;
      const cuts = [lo, ...[...brk, ...brk.map((b) => b + 1)].filter((b) => b > lo && b < hi), hi];
      let s = 0;
      for (let q = 0; q + 1 < cuts.length; q++) s += gl(rest, cuts[q], cuts[q + 1]);
      s += hi <= 1 ? ellipse(2 * lo - 1, 2 * hi - 1) / 2 : (ellipse(2 * lo - 1, 1) + ellipse(-1, 2 * hi - 3)) / 2;
      assert.ok(Math.abs(av[j] - s * n) < 1e-12, `n=${n} t=${t} cell ${j}: ${av[j]} vs ${s * n}`);
    }
  }
});

test('Jiang–Shu combined profile has the published shape', () => {
  const at = (X) => exact('combined', (X + 1) / 2);
  const beta = Math.log(2) / (36 * 0.005 ** 2);
  assert.ok(Math.abs(at(-0.7) - (2 * Math.exp(-beta * 0.005 ** 2) + 4) / 6) < 1e-12);
  assert.equal(at(-0.3), 1);
  assert.ok(Math.abs(at(0.1) - 1) < 1e-12);
  assert.ok(Math.abs(at(0.5) - (2 * Math.sqrt(1 - 100 * 0.005 ** 2) + 4) / 6) < 1e-12);
  for (const X of [-0.9, -0.5, -0.1, 0.3, 0.7, 0.95]) assert.equal(at(X), 0, `X = ${X}`);
});

test('exact solution translates at speed a and is periodic', () => {
  for (const id of Object.keys(PROFILES)) {
    const p = makeProfile(id);
    for (const x of [0.03, 0.31, 0.77]) {
      assert.ok(Math.abs(exact(p, x, 1) - exact(p, x, 0)) < 1e-12, id);
      assert.ok(Math.abs(exact(p, x, 0.2, -1.5) - p.f(x + 0.3)) < 1e-12, id);
    }
    // After Δx/a the cell averages are the initial ones moved one cell on.
    const n = 64;
    assert.ok(maxDiff(exactAverages(p, n, 1 / n), roll(exactAverages(p, n, 0), 1)) < 1e-13, id);
    // a = −1, t = −2Δx: a t = +2Δx, so the profile has moved two cells to the right.
    assert.ok(maxDiff(exactPoints(p, n, -2 / n, -1), roll(exactPoints(p, n, 0), 2)) < 1e-13, id);
    assert.ok(maxDiff(exactPoints(p, n, 3 / n, -1), roll(exactPoints(p, n, 0), -3)) < 1e-13, id);
  }
});

test('createState and reset: errors are zero at t = 0, mass and bounds recorded', () => {
  const st = createState(80, 'combined');
  const d = diagnostics(st);
  assert.equal(d.l1, 0);
  assert.equal(d.linf, 0);
  assert.equal(d.massError, 0);
  assert.equal(d.overshoot, 0);
  run(st, 'lw', 0.5, 10);
  reset(st, { id: 'sine', k: 2 });
  assert.equal(st.t, 0);
  assert.equal(st.steps, 0);
  assert.ok(Math.abs(diagnostics(st).mass) < 1e-15);
  assert.throws(() => step(st, 'upwind', -0.5), /sign/);
  assert.throws(() => step(st, 'nosuch', 0.5));
  // a = 0: nothing moves, so ν = aΔt/Δx must be 0.
  const still = createState(50, 'square', { a: 0 });
  assert.throws(() => step(still, 'upwind', 0.5), /a = 0/);
  step(still, 'upwind', 0);
  assert.equal(diagnostics(still).l1, 0);
});

test('time does not drift: after 100 revolutions at ν = 1 the exact shift still reads as zero error', () => {
  // t is summed with compensation; plain summation left t off by 1.8e-11, which showed
  // up as an L1 "error" of 1.5e-10 although u was exactly u0.
  const st = createState(200, 'combined');
  run(st, 'upwind', 1, 20000);
  assert.ok(Math.abs(st.t - 100) < 1e-12, `t − 100 = ${st.t - 100}`);
  assert.ok(maxDiff(st.u, st.u0) < 1e-15);
  assert.ok(diagnostics(st).l1 < 1e-12, `l1 = ${diagnostics(st).l1}`);
});

// ------------------------------------------------------------ unit CFL and symmetry

test('upwind at ν = 1 is an exact one-cell shift (and so are LxF, LW, Fromm, the limited family; BW at 1 and 2)', () => {
  const n = 120;
  const cases = [
    ['upwind', 1, 1], ['upwind', -1, -1], ['lxf', 1, 1], ['lw', 1, 1], ['lw', -1, -1], ['fromm', 1, 1],
    ['bw', 1, 1], ['bw', 2, 2], ['bw', -2, -2], ['leapfrog', 1, 1],
    ...Object.keys(LIMITERS).map((l) => ['limited', 1, 1, { limiter: l }]),
  ];
  for (const [id, nu, shift, opts] of cases) {
    const st = createState(n, 'combined', { a: Math.sign(nu) });
    const u0 = st.u.slice();
    step(st, id, nu, opts);
    assert.ok(maxDiff(st.u, roll(u0, shift)) <= 1e-15, `${id} ν=${nu} one step`);
    run(st, id, nu, n / Math.abs(shift) - 1, opts);
    assert.ok(maxDiff(st.u, u0) < 1e-13, `${id} ν=${nu} full revolution`);
    assert.ok(Math.abs(st.t - 1) < 1e-12);
  }
});

test('a < 0 is the mirror image of a > 0 for every scheme', () => {
  const n = 90;
  const variants = [
    ...LINEAR.map((id) => [id, 0.6]), ['bw', 1.4],
    ...TVD.map((l) => ['limited', 0.7, { limiter: l }]),
    ['weno5', 0.8], ['weno5', 0.8, { weights: 'linear' }],
  ];
  for (const [id, nu, opts] of variants) {
    const A = createState(n, 'combined');
    const B = createState(n, 'combined', { a: -1 });
    for (let j = 0; j < n; j++) B.u[j] = A.u[n - 1 - j];
    const N = id === 'ftcs' || id === 'downwind' ? 10 : 60;
    run(A, id, nu, N, opts);
    run(B, id, -nu, N, opts);
    let m = 0;
    for (let j = 0; j < n; j++) m = Math.max(m, Math.abs(A.u[j] - B.u[n - 1 - j]));
    assert.ok(m < 1e-12, `${id} ${JSON.stringify(opts ?? {})}: ${m}`);
  }
});

// ------------------------------------------------------------ conservation

test('every scheme conserves mass to round-off (conservation form)', () => {
  const variants = [
    ['upwind', 0.5], ['lxf', 0.5], ['lw', 0.5], ['bw', 1.5], ['fromm', 0.5], ['leapfrog', 0.5],
    ['leapfrog', 0.5, { start: 'copy', asselin: 0.1 }],
    ...Object.keys(LIMITERS).map((l) => ['limited', 0.8, { limiter: l }]),
    ['weno5', 0.8], ['weno5', 0.8, { weights: 'linear' }], ['upwind', -0.7], ['weno5', -1.2],
  ];
  for (const [id, nu, opts] of variants) {
    const st = createState(200, 'combined', { a: Math.sign(nu) });
    run(st, id, nu, 400, opts);
    const d = diagnostics(st);
    assert.ok(Math.abs(d.massError) < 1e-13, `${id} ${JSON.stringify(opts ?? {})}: ${d.massError}`);
  }
  // Even the unstable schemes conserve, relative to the size of the solution.
  for (const id of ['ftcs', 'downwind']) {
    const st = run(createState(200, 'square'), id, 0.5, 40);
    const d = diagnostics(st);
    assert.ok(Math.abs(d.massError) < 1e-13 * Math.max(1, Math.abs(d.max), Math.abs(d.min)), id);
  }
});

// ------------------------------------------------------------ order of accuracy

test('observed L1 order on a smooth sine: ~1 for upwind and LxF, ~2 for LW, BW, Fromm, leapfrog', () => {
  const ns = [32, 64, 128, 256, 512];
  const expect = { upwind: 1, lxf: 1, lw: 2, bw: 2, fromm: 2, leapfrog: 2 };
  for (const [id, p] of Object.entries(expect)) {
    for (const nu of [0.4, 0.8]) {
      const r = study(id, nu, ns, 'sine', 1);
      const last = r.orders[r.orders.length - 1];
      assert.ok(Math.abs(last - p) < 0.1, `${id} ν=${nu}: orders ${r.orders.map((o) => o.toFixed(3))}`);
      assert.equal(SCHEMES[id].order, p);
    }
  }
  // Negative speed: the same order.
  const neg = study('upwind', 0.4, ns, 'sine', 1, { a: -1 });
  assert.ok(Math.abs(neg.orders[3] - 1) < 0.1);
});

test('Fromm is third order at |ν| = 1/2, where its u_xxx coefficient vanishes', () => {
  assert.equal(modifiedEquation('fromm', 1, 0.01, 0.5).E, 0);
  const r = study('fromm', 0.5, [32, 64, 128, 256], 'sine', 1);
  assert.ok(Math.abs(r.orders[2] - 3) < 0.1, r.orders.join(' '));
});

test('WENO5: fifth order once Δt ∝ Δx^{5/3}; with fixed ν the RK3 time error caps it near 3', () => {
  const ns = [20, 40, 80, 160, 320];
  // Progress events break the 4064-step finest grid into slices for sliced().
  const events = [];
  const scaled = drain(convergenceStudy('weno5', 0.5, ns, 'sine', 1, { dtExponent: 5 / 3 }), (e) => events.push(e));
  for (const o of scaled.orders.slice(1)) assert.ok(o > 4.5, `scaled orders ${scaled.orders}`);
  assert.ok(scaled.errors[4] < 1e-8);
  let last = 0, prevN = 0, worst = 0;
  for (const e of events) {
    if (e.t !== 'op') { last = 0; continue; }
    if (e.n !== prevN) last = 0;
    worst = Math.max(worst, (e.s - last) * e.n);
    last = e.s;
    prevN = e.n;
  }
  assert.ok(worst > 0 && worst <= 4096, `largest slice ${worst} cell updates`);
  assert.ok(events.filter((e) => e.t === 'op').length > 300);
  const linear = study('weno5', 0.5, ns, 'sine', 1, { dtExponent: 5 / 3, weights: 'linear' });
  assert.ok(linear.orders[3] > 4.8);
  const fixed = study('weno5', 0.5, ns, 'sine', 1);
  assert.ok(fixed.orders[3] < 3.5 && fixed.orders[3] > 2.5, `fixed-ν orders ${fixed.orders}`);
});

test('WENO5 + SSP-RK2 is linearly unstable, but the JS weights hide it (they add dissipation)', () => {
  const runMax = (weights) => {
    const st = run(createState(100, 'sine'), 'weno5', 0.9, Math.round((20 * 100) / 0.9), { rk: 2, weights });
    return st.u.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  };
  assert.ok(runMax('linear') > 1e3, 'linear weights blow up');
  const js = runMax('js');
  assert.ok(js < 1, `JS weights: decays to ${js}, no blow-up`);
  // The linear analysis agrees with the linear-weight run: |G| > 1 at ν = 0.9.
  assert.ok(maxAmplification('weno5', 0.9, 721, { rk: 2 }) > 1 + 1e-4);
});

test('every broken/fixed preset shows its pathology: broken[metric] > threshold > fixed[metric]', () => {
  assert.ok(Object.keys(PRESETS).length >= 8);
  for (const [id, p] of Object.entries(PRESETS)) {
    assert.equal(p.id, id);
    for (const k of ['name', 'family', 'description', 'metric']) assert.equal(typeof p[k], 'string', `${id}.${k}`);
    assert.ok(['stability', 'accuracy', 'conservation', 'constraint', 'solver', 'resolution', 'boundary'].includes(p.family), id);
    const val = {};
    for (const which of ['broken', 'fixed']) {
      const c = p[which];
      assert.ok(SCHEMES[c.scheme], `${id}.${which}.scheme`);
      if (c.opts.limiter) assert.ok(LIMITERS[c.opts.limiter], `${id}.${which}.limiter`);
      const st = run(createState(c.n, c.profile, { a: Math.sign(c.nu) }), c.scheme, c.nu, c.steps, c.opts);
      const d = diagnostics(st);
      assert.ok(p.metric in d, `${id}: diagnostics has no ${p.metric}`);
      val[which] = d[p.metric];
    }
    assert.ok(val.broken > p.threshold && val.fixed < p.threshold, `${id}: broken ${val.broken}, fixed ${val.fixed}, threshold ${p.threshold}`);
  }
});

test('limited schemes on a smooth sine: better than first order in L1, clipped at extrema in max norm', () => {
  const ns = [32, 64, 128, 256, 512];
  for (const l of ['minmod', 'superbee', 'vanleer', 'mc', 'vanalbada']) {
    const r1 = study('limited', 0.5, ns, 'sine', 1, { limiter: l });
    const ri = study('limited', 0.5, ns, 'sine', 1, { limiter: l, norm: 'linf' });
    assert.ok(r1.orders[3] > 1.8, `${l} L1 ${r1.orders}`);
    assert.ok(ri.orders[3] < 1.7 && ri.orders[3] > 1.1, `${l} Linf ${ri.orders}`);
  }
});

test('convergenceStudy yields one iter event per grid inside an enter/leave span, with progress in between', () => {
  const events = [];
  const r = drain(convergenceStudy('lw', 0.5, [16, 32, 64], 'sine', 1, { chunk: 512 }), (e) => events.push(e));
  assert.deepEqual(events.filter((e) => e.t !== 'op').map((e) => e.t), ['enter', 'iter', 'iter', 'iter', 'leave']);
  assert.deepEqual(events.filter((e) => e.t === 'iter').map((e) => e.n), [16, 32, 64]);
  assert.deepEqual(events.filter((e) => e.t === 'iter').map((e) => e.err), r.errors);
  assert.equal(r.orders.length, 2);
  for (const [k, nu] of r.nus.entries()) assert.ok(Math.abs(r.steps[k] * nu / r.ns[k] - 1) < 1e-12);
  // Progress: every 512/n steps, never at the last step (the iter event follows it).
  const ops = events.filter((e) => e.t === 'op');
  assert.deepEqual(ops.filter((e) => e.n === 64).map((e) => e.s), [8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120]);
  for (const e of ops) assert.ok(e.op === 'step' && e.s < e.steps && e.steps === r.steps[e.k]);
  // Degenerate inputs throw instead of looping forever.
  assert.throws(() => drain(convergenceStudy('upwind', 0, [16, 32])), /ν/);
  assert.throws(() => drain(convergenceStudy('upwind', 0.5, [16, 32], 'sine', 1, { a: 0 })), /a/);
  assert.throws(() => drain(convergenceStudy('upwind', 0.5, [16, 32], 'sine', 0)), /T/);
});

// ------------------------------------------------------------ jumps: oscillations, TVD

test('Lax–Wendroff overshoots the square wave by more than 5%; its ripples trail the jumps, Beam–Warming’s lead', () => {
  for (const nu of [0.25, 0.5, 0.8]) {
    const lw = run(createState(200, 'square'), 'lw', nu, Math.round(200 / nu));
    const d = diagnostics(lw);
    assert.ok(d.overshoot > 0.05 && d.undershoot > 0.05, `LW ν=${nu}: ${d.overshoot}`);
    assert.ok(d.tv > 1.5 * d.tv0);
    const bw = run(createState(200, 'square'), 'bw', nu, Math.round(200 / nu));
    const where = (st, sgn) => {
      let jm = 0;
      for (let j = 1; j < st.n; j++) if (sgn * st.u[j] > sgn * st.u[jm]) jm = j;
      return st.x[jm];
    };
    // Square on [0.25, 0.5] moving right: LW's peak sits just inside the front, its trough
    // just behind the back; BW's peak sits just inside the back, its trough just ahead of the front.
    assert.ok(where(lw, 1) > 0.375 && where(lw, 1) < 0.5 && where(lw, -1) < 0.25, `LW ν=${nu}`);
    assert.ok(where(bw, 1) < 0.375 && where(bw, 1) > 0.25 && where(bw, -1) > 0.5, `BW ν=${nu}`);
  }
});

test('TVD limiters never increase total variation or create new extrema (square and combined, |ν| ≤ 1)', () => {
  for (const l of TVD) {
    for (const nu of [0.1, 0.5, 0.9, 1, -0.5]) {
      for (const prof of ['square', 'combined']) {
        const st = createState(100, prof, { a: Math.sign(nu) });
        let tv = totalVariation(st.u);
        for (let k = 0; k < 300; k++) {
          step(st, 'limited', nu, { limiter: l });
          const tv1 = totalVariation(st.u);
          assert.ok(tv1 <= tv + 1e-12, `${l} ν=${nu} ${prof} step ${k}: ${tv} → ${tv1}`);
          tv = tv1;
        }
        const d = diagnostics(st);
        assert.ok(d.overshoot <= 1e-12 && d.undershoot <= 1e-12, `${l} ν=${nu} ${prof}`);
      }
    }
  }
  // The linear second-order members of the family are not TVD.
  for (const l of ['lw', 'bw', 'fromm']) {
    const st = run(createState(100, 'square'), 'limited', 0.5, 50, { limiter: l });
    assert.ok(totalVariation(st.u) > 2.1, l);
  }
});

test('WENO5 keeps the square wave almost free of overshoot (well under 1%, vs ~20% for LW)', () => {
  for (const nu of [0.25, 0.5, 0.8]) {
    const d = diagnostics(run(createState(200, 'square'), 'weno5', nu, Math.round(200 / nu)));
    assert.ok(d.overshoot < 0.005 && d.undershoot < 0.005, `ν=${nu}: ${d.overshoot}`);
  }
  // With the nonlinear weights switched off it rings like any linear high-order scheme.
  const lin = diagnostics(run(createState(200, 'square'), 'weno5', 0.5, 400, { weights: 'linear' }));
  assert.ok(lin.overshoot > 0.05, `linear weights: ${lin.overshoot}`);
});

test('limited scheme equals Lax–Wendroff where φ = 1 (θ = 1 on linear data), and the linear limiters equal their schemes', () => {
  // Tent with kinks at cell edges: each side is exactly linear, so θ = 1.
  const n = 100;
  const lw = run(createState(n, { id: 'triangle', halfWidth: 0.4 }), 'lw', 0.6, 1);
  for (const l of TVD.filter((k) => k !== 'upwind')) {
    const st = run(createState(n, { id: 'triangle', halfWidth: 0.4 }), 'limited', 0.6, 1, { limiter: l });
    for (let j = 0; j < n; j++) {
      const x = st.x[j];
      const nearKink = [0.1, 0.5, 0.9].some((k) => Math.abs(x - k) < 3.5 / n);
      if (!nearKink) assert.ok(Math.abs(st.u[j] - lw.u[j]) < 1e-14, `${l} cell ${j}`);
    }
  }
  // φ = 0, 1, θ, (1+θ)/2 reproduce upwind, LW, BW and Fromm (independent code paths).
  for (const [l, id] of [['upwind', 'upwind'], ['lw', 'lw'], ['bw', 'bw'], ['fromm', 'fromm']]) {
    for (const nu of [0.35, -0.8]) {
      const A = run(createState(120, 'combined', { a: Math.sign(nu) }), 'limited', nu, 50, { limiter: l });
      const B = run(createState(120, 'combined', { a: Math.sign(nu) }), id, nu, 50);
      assert.ok(maxDiff(A.u, B.u) < 1e-13, `${l} vs ${id} ν=${nu}`);
    }
  }
});

test('FTCS and downwind grow; FTCS growth per step matches |G| = (1 + ν² sin²θ)^{1/2}', () => {
  for (const id of ['ftcs', 'downwind']) {
    const st = run(createState(100, 'square'), id, 0.5, 200);
    assert.ok(diagnostics(st).max > 1e3, id);
  }
  // CFL violation: just past the limit, the stable schemes blow up too; just inside, they stay bounded.
  for (const [id, top] of [['upwind', 1], ['lxf', 1], ['lw', 1], ['fromm', 1], ['bw', 2]]) {
    const bad = run(createState(100, 'square'), id, top + 0.1, 300);
    assert.ok(diagnostics(bad).max > 1e3, `${id} at ν = ${top + 0.1}`);
    const ok = run(createState(100, 'square'), id, top - 0.1, 300);
    assert.ok(diagnostics(ok).max < 1.5, `${id} at ν = ${top - 0.1}`);
  }
  const n = 64, m = 8, th = (2 * Math.PI * m) / n, nu = 0.5;
  const st = createState(n, 'sine');
  for (let j = 0; j < n; j++) st.u[j] = Math.cos(j * th);
  const l2 = (u) => Math.sqrt(u.reduce((s, v) => s + v * v, 0));
  const e0 = l2(st.u);
  run(st, 'ftcs', nu, 20);
  const rate = Math.pow(l2(st.u) / e0, 1 / 20);
  assert.ok(Math.abs(rate - Math.sqrt(1 + nu * nu * Math.sin(th) ** 2)) < 1e-12);
});

// ------------------------------------------------------------ von Neumann analysis

test('one step of each linear scheme multiplies a grid Fourier mode by amplification(ν, θ)', () => {
  const n = 64;
  const cases = [
    ...['upwind', 'downwind', 'ftcs', 'lxf', 'lw', 'bw', 'fromm'].flatMap((id) => [[id, 0.3], [id, 0.8], [id, -0.6]]),
    ['bw', 1.5], ['bw', -1.7],
    ...[1, 2, 3].flatMap((rk) => [['weno5', 0.7, { weights: 'linear', rk }], ['weno5', -1.2, { weights: 'linear', rk }]]),
  ];
  for (const [id, nu, opts] of cases) {
    for (const m of [1, 5, 16, 31]) {
      const th = (2 * Math.PI * m) / n;
      const st = createState(n, 'sine', { a: Math.sign(nu) });
      for (let j = 0; j < n; j++) st.u[j] = Math.cos(j * th);
      step(st, id, nu, opts);
      const G = amplification(id, nu, th, opts);
      let err = 0;
      for (let j = 0; j < n; j++) err = Math.max(err, Math.abs(st.u[j] - (G.re * Math.cos(j * th) - G.im * Math.sin(j * th))));
      assert.ok(err < 1e-13, `${id} ν=${nu} m=${m} ${JSON.stringify(opts ?? {})}: ${err}`);
    }
  }
  // Leapfrog: a pure physical mode u^{n-1} = e^{ijθ}, u^n = G e^{ijθ} goes to G² e^{ijθ}.
  for (const nu of [0.4, -0.9]) {
    for (const m of [1, 7, 20]) {
      const th = (2 * Math.PI * m) / n;
      const G = amplification('leapfrog', nu, th);
      const st = createState(n, 'sine', { a: Math.sign(nu) });
      for (let j = 0; j < n; j++) {
        st.uPrev[j] = Math.cos(j * th);
        st.u[j] = G.re * Math.cos(j * th) - G.im * Math.sin(j * th);
      }
      st.lfReady = true;
      st.lfNu = nu;
      step(st, 'leapfrog', nu);
      const g2r = G.re * G.re - G.im * G.im, g2i = 2 * G.re * G.im;
      let err = 0;
      for (let j = 0; j < n; j++) err = Math.max(err, Math.abs(st.u[j] - (g2r * Math.cos(j * th) - g2i * Math.sin(j * th))));
      assert.ok(err < 1e-13, `leapfrog ν=${nu} m=${m}`);
    }
  }
});

test('|G| ≤ 1 for all θ exactly in the documented stable range, and > 1 just outside it', () => {
  for (const id of [...LINEAR, 'weno5']) {
    const top = SCHEMES[id].nuMax;
    for (let k = 0; k <= 40; k++) {
      const nu = (top * k) / 40;
      for (const s of [1, -1]) assert.ok(maxAmplification(id, s * nu) <= 1 + 1e-12, `${id} ν=${s * nu}`);
    }
    for (const s of [1, -1]) assert.ok(maxAmplification(id, s * (top + 0.01)) > 1 + 1e-6, `${id} just outside`);
  }
  // WENO5 with forward Euler: unstable at every ν > 0 (Wang & Spiteri 2007).
  assert.equal(WENO_NU_MAX[1], 0);
  for (const nu of [0.05, 0.5, 1]) assert.ok(maxAmplification('weno5', nu, 721, { rk: 1 }) > 1 + 1e-9, `rk1 ν=${nu}`);
  assert.ok(maxAmplification('weno5', 0.5, 721, { rk: 2 }) > 1 + 1e-4);
  // Leapfrog: neutral (both roots on the unit circle) inside the range; the second root ≈ −1.
  const g = amplification('leapfrog', 0.5, 0.3);
  assert.ok(Math.abs(g.mag - 1) < 1e-14 && Math.abs(g.comp.mag - 1) < 1e-14);
  assert.ok(g.comp.re < -0.9);
  // `out` is filled in place (no allocation per call), with the same values.
  const out = {};
  assert.equal(amplification('leapfrog', 0.5, 0.3, {}, out), out);
  const comp = out.comp;
  amplification('leapfrog', 0.7, 1.2, {}, out);
  assert.equal(out.comp, comp);
  assert.deepEqual({ ...out, comp: { ...out.comp } }, { ...amplification('leapfrog', 0.7, 1.2), comp: { ...amplification('leapfrog', 0.7, 1.2).comp } });
  amplification('lw', 0.7, 1.2, {}, out);
  assert.equal(out.comp, null);
  assert.equal(out.relSpeed, relativePhaseSpeed('lw', 0.7, 1.2));
  // Closed forms: FTCS |G|² = 1 + ν² sin²θ; LxF |G|² = cos²θ + ν² sin²θ.
  for (const th of [0.2, 1.1, 2.5]) {
    assert.ok(Math.abs(amplification('ftcs', 0.7, th).mag ** 2 - (1 + 0.49 * Math.sin(th) ** 2)) < 1e-14);
    assert.ok(Math.abs(amplification('lxf', 0.7, th).mag ** 2 - (Math.cos(th) ** 2 + 0.49 * Math.sin(th) ** 2)) < 1e-14);
  }
});

test('phase: LW and leapfrog lag, BW and LxF lead, for resolved modes (0 < θ ≤ π/2, 0 < ν < 1); upwind at ν = 1/2 has no phase error', () => {
  for (const nu of [0.25, 0.5, 0.75]) {
    for (let k = 1; k <= 20; k++) {
      const th = (k / 20) * (Math.PI / 2);
      assert.ok(relativePhaseSpeed('lw', nu, th) < 1, `lw ${nu} ${th}`);
      assert.ok(relativePhaseSpeed('leapfrog', nu, th) < 1, `leapfrog ${nu} ${th}`);
      assert.ok(relativePhaseSpeed('bw', nu, th) > 1, `bw ${nu} ${th}`);
      assert.ok(relativePhaseSpeed('lxf', nu, th) > 1, `lxf ${nu} ${th}`);
      assert.ok(Math.abs(relativePhaseSpeed('upwind', 0.5, th) - 1) < 1e-14);
      assert.ok(Math.abs(relativePhaseSpeed('lw', -nu, th) - relativePhaseSpeed('lw', nu, th)) < 1e-14);
    }
  }
  // Consistent with the sign of E in the modified equation.
  assert.ok(modifiedEquation('lw', 1, 0.01, 0.5).E < 0 && modifiedEquation('bw', 1, 0.01, 0.5).E > 0);
});

// ------------------------------------------------------------ modified equation

test('modified-equation D and E equal the Taylor coefficients of log G (all linear schemes, a = ±1)', () => {
  const dx = 0.01;
  for (const id of LINEAR) {
    for (const [a, nu] of [[1, 0.3], [1, 0.7], [-1, -0.45]]) {
      const dt = (nu * dx) / a;
      // log G = Σ c_m (iθ)^m:  Re log G = −c2 θ² + …,  arg G = c1 θ − c3 θ³ + …,  c1 = −ν.
      const c2 = (th) => -Math.log(amplification(id, nu, th).mag) / (th * th);
      const c3 = (th) => (amplification(id, nu, th).phase + nu * th) / -(th ** 3);
      const h = 0.02;
      const D = (((4 * c2(h / 2) - c2(h)) / 3) * dx * dx) / dt;
      const E = (((4 * c3(h / 2) - c3(h)) / 3) * dx ** 3) / dt;
      const me = modifiedEquation(id, a, dx, nu);
      assert.ok(Math.abs(D - me.D) < 1e-7 * Math.abs(a) * dx, `${id} a=${a} ν=${nu} D ${D} vs ${me.D}`);
      assert.ok(Math.abs(E - me.E) < 1e-6 * Math.abs(a) * dx * dx, `${id} a=${a} ν=${nu} E ${E} vs ${me.E}`);
    }
  }
});

test('upwind and LxF spread a Gaussian exactly as the modified equation says: variance grows by 2Dt', () => {
  const moments = (st, c) => {
    let m = 0, s1 = 0, s2 = 0;
    for (let j = 0; j < st.n; j++) {
      let d = st.x[j] - c;
      d -= Math.floor(d + 0.5);
      m += st.u[j];
      s1 += d * st.u[j];
      s2 += d * d * st.u[j];
    }
    return s2 / m - (s1 / m) ** 2;
  };
  for (const [id, nu] of [['upwind', 0.5], ['upwind', 0.25], ['upwind', 0.8], ['lxf', 0.5], ['lxf', 0.8]]) {
    const n = 400;
    const st = createState(n, { id: 'gaussian', sigma: 0.05 });
    const v0 = moments(st, 0.5);
    run(st, id, nu, Math.round(n / nu));
    const growth = moments(st, 0.5 + st.t) - v0;
    const predicted = 2 * modifiedEquation(id, 1, st.dx, nu).D * st.t;
    assert.ok(Math.abs(growth / predicted - 1) < 0.05, `${id} ν=${nu}: ${growth} vs ${predicted}`);
    assert.ok(Math.abs(growth / predicted - 1) < 1e-6, `${id} ν=${nu} (exact random walk): ${growth / predicted - 1}`);
  }
  // Upwind diffusion is a Δx (1 − ν)/2.
  assert.equal(modifiedEquation('upwind', 1, 0.01, 0.5).D, 0.01 * 0.5 / 2);
});

// ------------------------------------------------------------ leapfrog

test('leapfrog: a careless start excites the computational mode; LW start keeps it small; Robert–Asselin damps it', () => {
  const comp = (opts) => {
    const st = createState(100, 'gaussian');
    const um1 = new Float64Array(100), u0 = new Float64Array(100);
    let amp = 0;
    for (let k = 0; k < 400; k++) {
      um1.set(u0);
      u0.set(st.u);
      step(st, 'leapfrog', 0.5, opts);
      if (k >= 300) for (let j = 0; j < 100; j++) amp = Math.max(amp, Math.abs(st.u[j] - 2 * u0[j] + um1[j]) / 4);
    }
    return amp;
  };
  const good = comp({}), bad = comp({ start: 'copy' }), filtered = comp({ start: 'copy', asselin: 0.1 });
  assert.ok(bad > 10 * good, `${bad} vs ${good}`);
  assert.ok(filtered < bad / 10, `${filtered} vs ${bad}`);
  // diagnostics().flip reports the same second difference for the last step.
  const st = createState(100, 'gaussian');
  const um1 = new Float64Array(100), u0 = new Float64Array(100);
  for (let k = 0; k < 50; k++) {
    um1.set(u0);
    u0.set(st.u);
    step(st, 'leapfrog', 0.5, { start: 'copy' });
  }
  let f2 = 0;
  for (let j = 0; j < 100; j++) f2 = Math.max(f2, Math.abs(st.u[j] - 2 * u0[j] + um1[j]) / 4);
  assert.ok(Math.abs(diagnostics(st).flip - f2) < 1e-15);
  assert.equal(diagnostics(run(createState(100, 'gaussian'), 'lw', 0.5, 5)).flip, 0);
  // The computational mode is neutral: |G| = 1, so nothing in the scheme removes it.
  for (const th of [0.1, 1, 2]) assert.ok(Math.abs(amplification('leapfrog', 0.5, th).comp.mag - 1) < 1e-14);
});
