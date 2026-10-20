// Chapter 6 (discretization, "From calculus to arithmetic") kernels and the
// numbers the chapter quotes. Kernels: src/sims/ch-discretization-stencil.js
// (exact stencil weights from Taylor moments), ch-discretization-precision.js
// (the derivative "V" in single precision) and ch-discretization-represent.js
// (points, cell averages, hat functions and Fourier modes). The chapter also
// quotes results of the shared kernels verification.js (double-precision V,
// Richardson extrapolation) and advection.js (convergence studies); those
// claims are checked here too, against analytic values where there are any.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stencilWeights, applyStencil, ratTex } from '../../aids/fluid-course/src/sims/ch-discretization-stencil.js';
import { fdDerivative32, derivativeSweep32, F32_FUNCTIONS, EPS32 } from '../../aids/fluid-course/src/sims/ch-discretization-precision.js';
import { represent, measure, representationStudy, quadrature, REP_PROFILES, SMOOTH_MEAN } from '../../aids/fluid-course/src/sims/ch-discretization-represent.js';
import { derivativeSweep, fdDerivative, TEST_FUNCTIONS, richardsonExtrapolate, fitOrder } from '../../aids/fluid-course/src/sims/verification.js';
import { convergenceStudy } from '../../aids/fluid-course/src/sims/advection.js';
import { drain } from '../../aids/fluid-course/src/sims/util.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} got ${a}, want ${b} ± ${tol}`);
const frac = (w) => `${w.n}/${w.d}`;
const ST1 = 4.053427893898620657714188; // Squire–Trapp f'(1.5), 40-digit value
const u32 = 2 ** -24;

// ---------------------------------------------------------------------------
// Stencils (section taylor)

test('stencil weights: the textbook formulas, exactly, with their leading error terms', () => {
  const cases = [
    // offsets, m, weights, order, error coefficient (μ_k/k!)
    [[0, 1], 1, ['-1/1', '1/1'], 1, '1/2'],
    [[-1, 0], 1, ['-1/1', '1/1'], 1, '-1/2'],
    [[-1, 0, 1], 1, ['-1/2', '0/1', '1/2'], 2, '1/6'],
    [[0, 1, 2], 1, ['-3/2', '2/1', '-1/2'], 2, '-1/3'],
    [[-1, 0, 1], 2, ['1/1', '-2/1', '1/1'], 2, '1/12'],
    [[-2, -1, 0, 1, 2], 1, ['1/12', '-2/3', '0/1', '2/3', '-1/12'], 4, '-1/30'],
    [[-2, -1, 0, 1, 2], 2, ['-1/12', '4/3', '-5/2', '4/3', '-1/12'], 4, '-1/90'],
    [[-3, -2, -1, 0, 1, 2, 3], 1, ['-1/60', '3/20', '-3/4', '0/1', '3/4', '-3/20', '1/60'], 6, '1/140'],
  ];
  for (const [offs, m, w, p, c] of cases) {
    const st = stencilWeights(offs, m);
    assert.deepEqual(st.weights.map(frac), w, `weights for ${offs} m=${m}`);
    assert.equal(st.order, p, `order for ${offs} m=${m}`);
    assert.equal(frac(st.errorCoef), c, `error coefficient for ${offs} m=${m}`);
  }
  assert.equal(stencilWeights([0], 1), null, 'one point cannot give a slope');
  assert.equal(stencilWeights([-1, 1], 2), null, 'two points cannot give a curvature');
  assert.equal(ratTex(stencilWeights([-2, -1, 0, 1, 2], 1).weights[0]), '\\tfrac{1}{12}');
  assert.equal(ratTex(stencilWeights([-2, -1, 0, 1, 2], 1).weights[1]), '-\\tfrac{2}{3}');
});

test('stencil error terms match measured errors on sin x and the observed order', () => {
  const x = 0.7;
  const dsin = [Math.sin, Math.cos, (t) => -Math.sin(t), (t) => -Math.cos(t)];
  const deriv = (k) => dsin[k % 4](x);
  for (const [offs, m] of [[[0, 1], 1], [[-1, 0, 1], 1], [[-1, 0, 1], 2], [[-2, -1, 0, 1, 2], 1], [[0, 1, 2, 3], 1], [[-3, -2, -1, 0, 1, 2, 3], 1]]) {
    const st = stencilWeights(offs, m);
    const h = 0.02;
    const err = applyStencil(st, Math.sin, x, h) - deriv(m);
    const lead = st.errorCoef.value * h ** st.order * deriv(st.errorPower);
    assert.ok(Math.abs(err / lead - 1) < 0.05, `${offs} m=${m}: measured ${err}, leading term ${lead}`);
    const e1 = Math.abs(applyStencil(st, Math.sin, x, 0.08) - deriv(m));
    const e2 = Math.abs(applyStencil(st, Math.sin, x, 0.04) - deriv(m));
    near(Math.log2(e1 / e2), st.order, 0.1, `${offs} m=${m} observed order`);
  }
});

test('forward difference at a point where f″ = 0 looks second order (sin at x = 0)', () => {
  const st = stencilWeights([0, 1], 1);
  const e = (h) => Math.abs(applyStencil(st, Math.sin, 0, h) - 1);
  near(Math.log2(e(0.1) / e(0.05)), 2, 0.02);
  const e1 = (h) => Math.abs(applyStencil(st, Math.sin, 1, h) - Math.cos(1));
  near(Math.log2(e1(0.1) / e1(0.05)), 1, 0.1);
});

// ---------------------------------------------------------------------------
// Round-off: double precision (shared kernel, numbers the chapter quotes)

test('double-precision V: best relative errors per formula (digits the chapter quotes)', () => {
  for (const fn of ['squire-trapp', 'exp', 'sin']) {
    const sw = derivativeSweep({ fn });
    const rel = (id) => sw.schemes[id].errMin / Math.abs(sw.exact);
    // forward about 8 digits, central about 10-11, fourth order about 12-13
    assert.ok(rel('forward') > 3e-9 && rel('forward') < 3e-8, `${fn} forward ${rel('forward')}`);
    assert.ok(rel('central') > 3e-12 && rel('central') < 1e-10, `${fn} central ${rel('central')}`);
    assert.ok(rel('central4') > 1e-14 && rel('central4') < 1e-12, `${fn} central4 ${rel('central4')}`);
    let worst = 0;
    for (let k = 0; k < sw.complex.h.length; k++) if (sw.complex.h[k] <= 1e-8) worst = Math.max(worst, sw.complex.err[k] / Math.abs(sw.exact));
    assert.ok(worst < 5e-16, `${fn} complex step ${worst}`);
  }
  const sw = derivativeSweep({ fn: 'squire-trapp' });
  // squire-trapp forward optimum ~6e-9, i.e. near sqrt(eps) = 1.5e-8 but to its left
  assert.ok(sw.schemes.forward.hMin > 0.2 * Math.sqrt(2 ** -52) && sw.schemes.forward.hMin < Math.sqrt(2 ** -52));
  near(Math.abs(fdDerivative('complex', 1.5, 1e-200) - ST1), 0, 1e-15, 'complex step at h = 1e-200');
});

test('double-precision cancellation: forward difference loses about half the digits at h = 1e-8', () => {
  const F = TEST_FUNCTIONS['squire-trapp'];
  const h = 1e-8;
  const est = fdDerivative('forward', 1.5, h);
  const rel = Math.abs(est - ST1) / ST1;
  assert.ok(rel > 1e-9 && rel < 1e-7, `relative error ${rel}`);
  // the two function values agree in about 8 leading digits
  const d = Math.abs(F.f(1.5 + h) - F.f(1.5)) / F.f(1.5);
  assert.ok(d > 1e-9 && d < 1e-7);
});

// ---------------------------------------------------------------------------
// Round-off: single precision (chapter kernel)

test('float32 emulation: every result is a float32 and the functions are accurate to a few ulps', () => {
  for (const [fn, F] of Object.entries(F32_FUNCTIONS)) {
    for (const x of [0.3, 1, 1.5]) {
      const v = F.f(x);
      assert.equal(Math.fround(v), v, `${fn}(${x}) is a float32`);
      const ref = TEST_FUNCTIONS[fn].f(Math.fround(x));
      assert.ok(Math.abs(v - ref) / Math.abs(ref) < 8 * u32, `${fn}(${x}): ${v} vs ${ref}`);
      const z = F.fc({ re: x, im: 1e-20 });
      assert.equal(Math.fround(z.im), z.im);
      assert.ok(Math.abs(z.im / 1e-20 - TEST_FUNCTIONS[fn].df(Math.fround(x))) / Math.abs(TEST_FUNCTIONS[fn].df(x)) < 8 * u32, `${fn} complex at ${x}`);
    }
    for (const s of ['forward', 'backward', 'central', 'central4', 'complex']) {
      const v = fdDerivative32(s, 1, 1e-3, fn);
      assert.equal(Math.fround(v), v);
    }
  }
});

test('float32 V: forward best near sqrt(eps32), about 3-4 digits; central about 5; complex step about 7 at any small h', () => {
  for (const fn of ['squire-trapp', 'exp', 'sin']) {
    const sw = derivativeSweep32({ fn });
    const ex = Math.abs(sw.exact);
    const fw = sw.schemes.forward;
    assert.ok(fw.fitOk);
    assert.ok(fw.hMin > 0.3 * Math.sqrt(EPS32) && fw.hMin < 1.2 * Math.sqrt(EPS32), `${fn} forward hMin ${fw.hMin}`);
    const relF = fw.errMin / ex;
    assert.ok(relF > 1e-4 && relF < 1e-3, `${fn} forward best ${relF}`);
    const ce = sw.schemes.central;
    assert.ok(ce.hMin > 0.3 * Math.cbrt(EPS32) && ce.hMin < Math.cbrt(EPS32), `${fn} central hMin ${ce.hMin}`);
    const relC = ce.errMin / ex;
    assert.ok(relC > 1e-6 && relC < 5e-5, `${fn} central best ${relC}`);
    const c4 = sw.schemes.central4;
    assert.ok(c4.errMinRaw / ex < 3e-6, `${fn} central4 best ${c4.errMinRaw / ex}`);
    let worst = 0;
    for (let k = 0; k < sw.complex.h.length; k++) if (sw.complex.h[k] <= 1e-4) worst = Math.max(worst, sw.complex.err[k] / ex);
    assert.ok(worst < 4 * u32, `${fn} complex step worst ${worst} (u32 = ${u32})`);
    // the step rounds away below ~ulp(x)/2: subtractive formulas return 0
    const k9 = sw.h.findIndex((v) => v <= 1e-9);
    assert.equal(sw.schemes.forward.err[k9], ex, `${fn} forward at h = 1e-9 returns 0`);
  }
  // At h = 1e-6 the double forward difference is still truncation-limited
  // (5e-6) while single precision has already lost every digit but one.
  const e32 = Math.abs(fdDerivative32('forward', 1.5, 1e-6) - ST1);
  const e64 = Math.abs(fdDerivative('forward', 1.5, 1e-6) - ST1);
  assert.ok(e32 / e64 > 1e4, `${e32} vs ${e64}`);
});

// ---------------------------------------------------------------------------
// Representations (section grids)

test('quadrature integrates the smooth profile to its Bessel-function mean', () => {
  const Q = quadrature('smooth', 24);
  let I = 0;
  for (let q = 0; q < Q.x.length; q++) I += Q.w[q] * Q.f[q];
  near(I, SMOOTH_MEAN, 1e-14);
});

test('cell averages, hats and Fourier modes conserve the integral; point values do not', () => {
  for (const prof of Object.keys(REP_PROFILES)) {
    for (const n of [8, 13, 32, 100]) {
      for (const kind of ['averages', 'hats', 'fourier']) {
        const m = measure(prof, n, kind);
        assert.ok(Math.abs(m.massErr) < 5e-14, `${prof} n=${n} ${kind}: mass error ${m.massErr}`);
      }
    }
  }
  // Trapezoid sum of point values: O(h) error at jumps, O(h^2) at kinks, tiny for smooth periodic data.
  const sq = measure('square', 16, 'points');
  assert.ok(Math.abs(sq.massErr) > 1e-3, `square points ${sq.massErr}`);
  const tri = measure('triangle', 16, 'points');
  assert.ok(Math.abs(tri.massErr) > 1e-3, `triangle points ${tri.massErr}`);
  near(measure('triangle', 32, 'points').massErr / tri.massErr, 1 / 4, 0.12, 'triangle points mass error ~ h^2');
  assert.ok(Math.abs(measure('smooth', 16, 'points').massErr) < 1e-13);
});

test('representation orders on smooth data: points 2, averages 1, hats 2, Fourier exponential', () => {
  const ord = (kind) => representationStudy('smooth', kind, [32, 64, 128]).orders[2];
  near(ord('points'), 2, 0.05, 'points');
  near(ord('averages'), 1, 0.05, 'averages');
  near(ord('hats'), 2, 0.05, 'hats');
  const f = representationStudy('smooth', 'fourier', [8, 16, 32]);
  assert.ok(f.l2[0] > 1e-4 && f.l2[1] < 1e-6 && f.l2[2] < 1e-13, `fourier ${Array.from(f.l2)}`);
  // the Gaussian needs resolving first: at n = 16 it is pre-asymptotic for points and hats
  const g = representationStudy('gaussian', 'points', [8, 16, 32, 64, 128]);
  assert.ok(g.orders[1] < 1, `pre-asymptotic order ${g.orders[1]}`);
  near(g.orders[4], 2, 0.05);
});

test('a jump drags every representation to L2 order 1/2', () => {
  const ns = [16, 32, 64, 128, 256];
  for (const kind of ['points', 'averages', 'hats', 'fourier']) {
    const s = representationStudy('square', kind, ns);
    const { p } = fitOrder(ns.map((n) => 1 / n), Array.from(s.l2));
    near(p, 0.5, 0.15, `${kind} fitted order`);
  }
});

test('overshoot at a jump: about 9% for Fourier (Gibbs), more for hats, none for averages and points', () => {
  for (const n of [256, 512]) {
    const f = measure('square', n, 'fourier');
    near(f.overshoot, 0.0895, 0.003, `fourier overshoot n=${n}`);
    near(f.undershoot, 0.0895, 0.003, `fourier undershoot n=${n}`);
  }
  for (const n of [32, 64, 128]) {
    const hm = measure('square', n, 'hats');
    assert.ok(Math.max(hm.overshoot, hm.undershoot) > 0.13, `hats n=${n}: ${hm.overshoot}, ${hm.undershoot}`);
    const a = measure('square', n, 'averages');
    const p = measure('square', n, 'points');
    assert.ok(a.overshoot + a.undershoot + p.overshoot + p.undershoot < 1e-12);
  }
  // hats with the jump on a node: c_1 = 1 + (2 - sqrt 3)/2 exactly on an
  // infinite grid (the [1 4 1] recurrence decays by r = -(2 - sqrt 3) per node)
  for (const n of [64, 128]) {
    const node = measure({ id: 'square', lo: 0.25, hi: 0.75 }, n, 'hats');
    near(node.overshoot, (2 - Math.sqrt(3)) / 2, 1e-12, `n = ${n}`);
  }
});

test('represent returns a reconstruction that matches its stored numbers', () => {
  const p = represent('smooth', 10, 'points');
  near(p.evaluate(0.3), REP_PROFILES.smooth.f(0.3), 1e-15);
  const a = represent('square', 10, 'averages');
  near(a.evaluate(0.35), a.coef[3], 0);
  const hts = represent('triangle', 20, 'hats');
  near(hts.evaluate(0.5), hts.coef[10], 1e-15);
  const f = represent('smooth', 33, 'fourier');
  assert.equal(f.K, 16);
  near(f.evaluate(0.123), REP_PROFILES.smooth.f(0.123), 1e-13);
});

// ---------------------------------------------------------------------------
// Convergence (section convergence): the claims the chapter makes about
// advection.js convergence studies.

const study = (scheme, nu, profile = 'sine', opts = {}) => drain(convergenceStudy(scheme, nu, [16, 32, 64, 128, 256, 512], profile, 1, opts));

test('Lax–Wendroff converges at order 2 and upwind at order 1 on smooth data', () => {
  const lw = study('lw', 0.5);
  near(lw.orders.at(-1), 2, 0.02);
  const up = study('upwind', 0.5);
  near(up.orders.at(-1), 1, 0.03);
});

test('FTCS at fixed ν is consistent but unstable: errors fall, then explode', () => {
  const r = study('ftcs', 0.5);
  assert.ok(r.errors[1] < r.errors[0] && r.errors[2] < r.errors[1] && r.errors[3] < r.errors[2], `early errors ${r.errors}`);
  assert.ok(r.errors[4] > 1e3, `n = 256: ${r.errors[4]}`);
  assert.ok(r.errors[5] > 1e20, `n = 512: ${r.errors[5]}`);
});

test('FTCS with Δt ∝ Δx² is stable in the Lax–Richtmyer sense and converges at order 2', () => {
  const r = study('ftcs', 0.5, 'sine', { dtExponent: 2 });
  for (let k = 1; k < r.errors.length; k++) assert.ok(r.errors[k] < r.errors[k - 1]);
  near(r.orders.at(-1), 2, 0.02);
});

test('downwind is consistent but unstable, so it diverges from the coarsest grid', () => {
  const r = study('downwind', 0.5);
  assert.ok(r.errors[1] > r.errors[0] && r.errors[5] > 1e100);
});

test('a jump caps the observed order: upwind 1/2 and Lax–Wendroff about 0.6 in L1 on the square wave', () => {
  near(study('upwind', 0.5, 'square').orders.at(-1), 0.5, 0.02);
  const lw = study('lw', 0.5, 'square').orders.at(-1);
  assert.ok(lw > 0.5 && lw < 0.7, `LW square ${lw}`);
});

// ---------------------------------------------------------------------------
// Richardson extrapolation (section richardson)

test('one Richardson step on the central difference is exactly the five-point formula', () => {
  const f = Math.sin;
  const x = 1;
  const D = (h) => (f(x + h) - f(x - h)) / (2 * h);
  const five = stencilWeights([-2, -1, 0, 1, 2], 1);
  for (const h of [0.4, 0.1, 0.025]) {
    const R = richardsonExtrapolate(D(h / 2), D(h), 2, 2);
    near(R, applyStencil(five, f, x, h / 2), 1e-15 / h, `h = ${h}`);
  }
});

test('repeated Richardson extrapolation raises the slope 2, 4, 6 and polygons give pi', () => {
  // central difference of sin at 1: errors at successive levels and halvings
  const x = 1;
  const D = (h) => (Math.sin(x + h) - Math.sin(x - h)) / (2 * h);
  const hs = [0.8, 0.4, 0.2, 0.1, 0.05];
  let row = hs.map(D);
  const slopes = [];
  for (let lev = 0; lev < 3; lev++) {
    const e = row.map((v) => Math.abs(v - Math.cos(x)));
    slopes.push(Math.log2(e.at(-2) / e.at(-1)));
    row = row.slice(1).map((v, i) => richardsonExtrapolate(v, row[i], 2, 2 * (lev + 1)));
  }
  near(slopes[0], 2, 0.01);
  near(slopes[1], 4, 0.02);
  near(slopes[2], 6, 0.05);
  // Lynch: the 2-, 3-, 4-, 5- and 6-gons, extrapolated in 1/n^2, give 3.14159264
  const ns = [2, 3, 4, 5, 6];
  const xs = ns.map((n) => 1 / (n * n));
  let T = ns.map((n) => n * Math.sin(Math.PI / n));
  for (let k = 1; k < ns.length; k++) T = T.slice(0, -1).map((v, i) => (xs[i + k] * v - xs[i] * T[i + 1]) / (xs[i + k] - xs[i]));
  assert.equal(T[0].toFixed(8), '3.14159264');
  // the 96-gon alone is good to 3 digits; four extrapolations from 6-, 12-, 24-, 48- and 96-gons to 15
  const P = (n) => n * Math.sin(Math.PI / n);
  near(P(96), Math.PI, 6e-4);
  let pr = [6, 12, 24, 48, 96].map(P);
  for (let k = 1; k <= 4; k++) pr = pr.slice(1).map((v, i) => richardsonExtrapolate(v, pr[i], 2, 2 * k));
  near(pr[0], Math.PI, 2e-15);
});
