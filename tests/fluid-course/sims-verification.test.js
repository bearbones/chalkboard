import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as V from '../../aids/fluid-course/src/sims/verification.js';
import * as S from '../../aids/fluid-course/src/sims/similarity.js';
import { drain, rng, countEvents } from '../../aids/fluid-course/src/sims/util.js';

const EPS = Number.EPSILON;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} got ${a}, want ${b} ± ${tol}`);
const rel = (a, b) => Math.abs(a - b) / Math.abs(b);
// Values of the Squire–Trapp function's derivatives at x = 1.5, from 40-digit
// arithmetic (independent of this code).
const ST = { f: 4.49778005394616195, d1: 4.053427893898620657714188, d2: 9.463073681596603352, d3: 32.16790451368894089, d5: 627.7689946559323998 };

// ---------------------------------------------------------------------------
// (a) Finite-difference derivatives

test('test function, its exact derivative and Cauchy-integral derivatives agree with 40-digit values', () => {
  const F = V.TEST_FUNCTIONS['squire-trapp'];
  assert.ok(rel(F.f(1.5), ST.f) < 4 * EPS);
  assert.ok(rel(F.df(1.5), ST.d1) < 4 * EPS);
  const d = V.taylorDerivatives(F.fc, 1.5, { kmax: 5, radius: F.radius });
  assert.ok(rel(d[1], ST.d1) < 1e-12);
  assert.ok(rel(d[2], ST.d2) < 1e-12);
  assert.ok(rel(d[3], ST.d3) < 1e-12);
  assert.ok(rel(d[5], ST.d5) < 1e-11);
  const e = V.taylorDerivatives(V.TEST_FUNCTIONS.exp.fc, 1, { kmax: 5, radius: 1 });
  for (let k = 0; k <= 5; k++) assert.ok(rel(e[k], Math.E) < 1e-12, `exp derivative ${k}`);
});

test('complex step reaches machine precision and stays there down to h = 1e-200', () => {
  const at200 = V.fdDerivative('complex', 1.5, 1e-200);
  assert.ok(Math.abs(at200 - ST.d1) < 1e-15, `error ${Math.abs(at200 - ST.d1)}`);
  assert.ok(rel(at200, ST.d1) < 1e-15);
  const sw = V.derivativeSweep();
  for (let k = 0; k < sw.complex.h.length; k++) {
    if (sw.complex.h[k] <= 1e-8) assert.ok(sw.complex.err[k] <= 4 * EPS * ST.d1, `h = ${sw.complex.h[k]}: ${sw.complex.err[k]}`);
  }
});

test('the V: forward minimum near sqrt(eps), central near eps^(1/3), fourth-order near eps^(1/5)', () => {
  const sw = V.derivativeSweep();
  const decade = (h, target) => Math.abs(Math.log10(h / target));
  const want = { forward: Math.sqrt(EPS), backward: Math.sqrt(EPS), central: Math.cbrt(EPS), central4: Math.pow(EPS, 0.2) };
  for (const [id, target] of Object.entries(want)) {
    const s = sw.schemes[id];
    assert.ok(decade(s.hMin, target) <= 1, `${id} measured minimum at ${s.hMin}, rule of thumb ${target}`);
    assert.ok(decade(s.hOpt, target) <= 1, `${id} predicted optimum ${s.hOpt}`);
    assert.ok(decade(s.hMin, s.hOpt) <= 0.75, `${id} measured ${s.hMin} vs predicted ${s.hOpt}`);
  }
  // Best achievable errors improve with order; the complex step beats them all.
  const best = (id) => sw.schemes[id].errMin;
  assert.ok(best('forward') > 1e-9 && best('forward') < 1e-6);
  assert.ok(best('central') < best('forward') / 100);
  assert.ok(best('central4') < best('central') / 10);
  assert.ok(Math.max(...sw.complex.err.filter((_, k) => sw.complex.h[k] < 1e-8)) < best('central4'));
});

test('truncation slopes are 1, 2, 4 and the round-off branch has slope -1', () => {
  const sw = V.derivativeSweep();
  const fit = (id, lo, hi) => {
    const hs = [];
    const es = [];
    sw.h.forEach((h, k) => {
      if (h >= lo && h <= hi) {
        hs.push(h);
        es.push(sw.schemes[id].err[k]);
      }
    });
    return V.fitOrder(hs, es).p;
  };
  near(fit('forward', 1e-3, 1e-1), 1, 0.1, 'forward');
  near(fit('central', 1e-3, 1e-1), 2, 0.1, 'central');
  near(fit('central4', 1e-2, 1e-1), 4, 0.1, 'central4');
  for (const id of ['forward', 'central', 'central4']) near(fit(id, 1e-15, 1e-11), -1, 0.25, `${id} round-off`);
  // The leading error constants: |f''|/2 h and |f'''|/6 h^2.
  const k3 = sw.h.findIndex((h) => Math.abs(h - 1e-3) < 1e-12);
  near(sw.schemes.forward.err[k3] / (1e-3 * ST.d2 / 2), 1, 0.01, 'forward constant');
  near(sw.schemes.central.err[k3] / (1e-6 * ST.d3 / 6), 1, 0.01, 'central constant');
});

test('the round-off model is a worst-case estimate: the measured V sits below it and its optimum to the left', () => {
  for (const fn of ['squire-trapp', 'exp', 'sin']) {
    const sw = V.derivativeSweep({ fn });
    for (const id of ['forward', 'backward', 'central', 'central4']) {
      const s = sw.schemes[id];
      let lg = 0;
      let c = 0;
      sw.h.forEach((h, k) => {
        if (h >= 1e-15 && h <= 1e-11 && s.err[k] > 0) {
          lg += Math.log10(s.err[k] / s.model[k]);
          c++;
        }
      });
      const gm = 10 ** (lg / c);
      assert.ok(gm > 0.05 && gm < 0.3, `${fn} ${id}: geometric mean measured/model ${gm}`);
      assert.ok(s.fitOk, `${fn} ${id} branch fits`);
      assert.ok(s.hMin / s.hOpt > 0.15 && s.hMin / s.hOpt < 1, `${fn} ${id}: hMin/hOpt ${s.hMin / s.hOpt}`);
      assert.ok(s.errOpt / s.errMin > 1.5 && s.errOpt / s.errMin < 15, `${fn} ${id}: errOpt/errMin ${s.errOpt / s.errMin}`);
    }
  }
});

test('the measured optimum is steady: within 0.75 decade of h* for any grid density, either step mode', () => {
  for (const fn of ['squire-trapp', 'exp', 'sin']) {
    for (const perDecade of [3, 4, 5, 8, 10]) {
      for (const representableStep of [false, true]) {
        const sw = V.derivativeSweep({ fn, perDecade, representableStep });
        for (const id of ['forward', 'backward', 'central', 'central4']) {
          const s = sw.schemes[id];
          const dec = Math.abs(Math.log10(s.hMin / s.hOpt));
          assert.ok(dec <= 0.75, `${fn} perDecade ${perDecade} representable ${representableStep} ${id}: ${dec} decades`);
        }
      }
    }
  }
  // The raw argmin of the default sweep is also near the rules of thumb.
  const sw = V.derivativeSweep();
  assert.ok(Math.abs(Math.log10(sw.schemes.forward.hMinRaw / Math.sqrt(EPS))) <= 1);
  assert.ok(Math.abs(Math.log10(sw.schemes.central.hMinRaw / Math.cbrt(EPS))) <= 1);
});

test('representable step: every error finite, the sweep stops where the step rounds to 0, the V barely moves', () => {
  const plain = V.derivativeSweep({ perDecade: 10 });
  const rep = V.derivativeSweep({ perDecade: 10, representableStep: true });
  const x = rep.x0;
  assert.ok(rep.h.length < plain.h.length);
  assert.ok(x + rep.h[rep.h.length - 1] - x > 0);
  assert.equal(x + plain.h[rep.h.length] - x, 0);
  assert.ok(Number.isNaN(V.fdDerivative('forward', x, 1e-16, { representableStep: true })));
  for (const id of ['forward', 'central', 'central4']) {
    assert.ok(rep.schemes[id].err.every(Number.isFinite), id);
    let lg = 0;
    let c = 0;
    rep.h.forEach((h, k) => {
      const a = plain.schemes[id].err[k];
      const b = rep.schemes[id].err[k];
      if (h >= 1e-15 && h <= 1e-11 && a > 0 && b > 0) {
        lg += Math.log10(b / a);
        c++;
      }
    });
    const ratio = 10 ** (lg / c);
    assert.ok(ratio > 0.3 && ratio < 1, `${id}: round-off branch ratio ${ratio}`);
  }
});

test('derivative sweep away from x = 1.5: the Cauchy radius shrinks near a singularity', () => {
  const F = V.TEST_FUNCTIONS['squire-trapp'];
  for (const x0 of [-0.6, 0.5, 2.1, 2.3]) {
    const sw = V.derivativeSweep({ x0 });
    assert.ok(sw.derivsOk, `x0 = ${x0}`);
    assert.ok(rel(sw.derivs[0], F.f(x0)) < 1e-13, `f at ${x0}`);
    assert.ok(rel(sw.derivs[1], F.df(x0)) < 1e-13, `f' at ${x0}`);
    const h = 1e-6;
    const d2 = (F.df(x0 + h) - F.df(x0 - h)) / (2 * h);
    assert.ok(rel(sw.derivs[2], d2) < 1e-8, `f'' at ${x0}: ${sw.derivs[2]} vs ${d2}`);
    assert.ok(sw.radius <= 0.3 * Math.min(x0 + Math.PI / 4, (3 * Math.PI) / 4 - x0) + 1e-15);
  }
  assert.throws(() => V.derivativeSweep({ x0: 2.5 }), RangeError);
  assert.throws(() => V.fdDerivative('central', 1, 1e-3, { fn: 'nope' }), /unknown/);
});

// ---------------------------------------------------------------------------
// (b) Floating point

test('catastrophic cancellation: 1 - cos x loses digits as eps/(x^2/2), then everything', () => {
  const c = V.cancellationSweep('one-minus-cos');
  for (let k = 0; k < c.x.length; k++) {
    const x = c.x[k];
    if (x < 1.05e-8) assert.equal(c.naive[k], 0, `x = ${x}`);
    if (x >= 1e-7) assert.ok(c.relErrNaive[k] <= (2 * EPS) / ((x * x) / 2), `x = ${x}: ${c.relErrNaive[k]}`);
  }
  near(V.CANCELLATION['one-minus-cos'].stable(1e-10), 5e-21, 1e-35);
  // The threshold the note quotes: x = 2^-26.5 ≈ 1.0537e-8.
  const N = V.CANCELLATION['one-minus-cos'].naive;
  assert.equal(N(1.0536e-8), 0);
  assert.ok(N(1.0538e-8) > 0);
  assert.ok(N(1.5e-8) > 0);
  assert.match(V.CANCELLATION['one-minus-cos'].note, /1\.05e-8/);
});

test('cancellation: every stable form agrees with an independent reference to a few ulps', () => {
  for (const id of ['one-minus-cos', 'quadratic', 'sqrt-diff', 'expm1']) {
    const c = V.cancellationSweep(id, { n: 501 });
    let worstStable = 0;
    let worstNaive = 0;
    for (let k = 0; k < c.x.length; k++) {
      worstStable = Math.max(worstStable, c.relErrStable[k]);
      worstNaive = Math.max(worstNaive, c.relErrNaive[k]);
    }
    assert.ok(worstStable <= 4 * EPS, `${id} stable ${worstStable}`);
    assert.ok(worstStable > 0, `${id}: the reference is independent, not the stable form`);
    assert.ok(worstNaive > 0.5, `${id} naive ${worstNaive}`);
  }
  assert.throws(() => V.cancellationSweep('nope'), /unknown/);
});

test('cancellation: quadratic root, sqrt difference and Float32 gauge pressure', () => {
  const Q = V.CANCELLATION.quadratic;
  const b = 1e8;
  const exact = -1 / b - 1 / b ** 3;
  assert.ok(rel(Q.naive(b), exact) > 0.1, 'naive formula off by more than 10% at b = 1e8');
  assert.ok(rel(Q.stable(b), exact) < 4 * EPS);
  assert.equal(V.CANCELLATION['sqrt-diff'].naive(1e16), 0);
  near(V.CANCELLATION['sqrt-diff'].stable(1e16), 5e-9, 1e-23);
  // Float32 spacing near 101 325 Pa is 2^-7 Pa, so adding and subtracting
  // atmospheric pressure costs at most 2^-8 Pa (checked on a dense sweep, and
  // the bound is reached); against the double-precision value the Float32
  // rounding of rho g dz (< 9810 Pa, half-spacing 2^-11) adds at most 2^-11...
  const g = V.cancellationSweep('gauge-pressure', { n: 4001 });
  let worst = 0;
  for (let k = 0; k < g.x.length; k++) {
    const d = Math.abs(g.naive[k] - g.stable[k]);
    worst = Math.max(worst, d);
    assert.ok(d <= 2 ** -8, `dz = ${g.x[k]}: ${d}`);
    assert.ok(Math.abs(g.naive[k] - g.reference[k]) <= 2 ** -8 + 2 ** -11, `dz = ${g.x[k]}`);
  }
  assert.equal(worst, 2 ** -8);
  // ...which is tens of per cent of a 1 micrometre water column (9.81 mPa).
  const G = V.CANCELLATION['gauge-pressure'];
  assert.ok(rel(G.naive(1e-6), G.reference(1e-6)) > 0.1, `relative error ${rel(G.naive(1e-6), G.reference(1e-6))}`);
  assert.ok(rel(G.stable(1e-6), G.reference(1e-6)) < 1e-7);
});

test('Float32 mass accumulation: naive summation stalls, Kahan keeps the inflow', () => {
  const r = V.summationDrift(V.PRESETS['sum-f32-stall']);
  assert.equal(r.final.naive, 1, 'each 1e-8 is below half an ulp of 1 in single precision');
  assert.equal(r.final.naiveAddedRel, 1);
  assert.ok(r.final.kahanAddedRel < 1e-5, `Kahan lost ${r.final.kahanAddedRel}`);
  assert.ok(r.final.kahanErr <= r.final.boundKahan);
  const j = V.summationDrift(V.PRESETS['sum-f32-drift']);
  assert.ok(j.final.naiveErr > 1e3 * j.final.kahanErr);
  assert.ok(j.final.naiveErr <= j.final.boundNaive && j.final.kahanErr <= j.final.boundKahan);
});

test('Float64 summation: systematic drift grows linearly; Kahan error stays at the 2u bound', () => {
  const r = V.summationDrift({ ...V.PRESETS['sum-f64-drift'], samples: 2 });
  assert.ok(r.final.naiveErr > 1e4 * Math.max(r.final.kahanErr, 1e-300));
  assert.ok(r.final.naiveErr <= r.final.boundNaive);
  assert.ok(r.final.kahanErr <= r.final.boundKahan);
  near(r.naiveErr[2] / r.naiveErr[1], 2, 0.2, 'error at N vs N/2');
});

test('diagnostics can fill a reusable object (no per-frame allocation)', () => {
  const s = V.createSummation({ precision: 'f32', increment: 1e-6 });
  V.stepSummation(s, 1000);
  const out = {};
  assert.equal(V.summationErrors(s, out), out);
  assert.deepEqual(out, V.summationErrors(s));
  const o = V.createOscillator();
  V.stepOscillator(o, 1000);
  const oo = {};
  assert.equal(V.oscillatorErrors(o, oo), oo);
  assert.deepEqual(oo, V.oscillatorErrors(o));
  const d = V.oscillatorDrift({ steps: 100, samples: 4 });
  near(d.t[4], 1, 1e-12, 'oscillatorDrift records t');
  for (const id of ['sum-f32-stall', 'sum-f32-drift', 'sum-f64-drift', 'oscillator-long', 'oscillator-same-params']) {
    assert.ok(V.PRESETS[id].stepsPerFrame > 0 && V.PRESETS[id].steps % V.PRESETS[id].stepsPerFrame === 0, id);
  }
});

test('long oscillator run: Float32 errors and where they come from', () => {
  const s = V.createOscillator({ dt: 0.01 });
  V.stepOscillator(s, 1e6);
  const e = V.oscillatorErrors(s);
  // The discrete invariant is exact: in Float64 it holds to round-off.
  assert.ok(e.invErr64 < 1e-12, `f64 invariant drift ${e.invErr64}`);
  // In Float32 it is perturbed at the single-precision level, a million times more.
  assert.ok(e.invErr32 > 1e6 * e.invErr64 && e.invErr32 < 1e-3, `f32 invariant drift ${e.invErr32}`);
  // The growing phase error is the rounded dt (a systematic frequency shift)...
  assert.ok(Math.abs(e.phaseFromParams) > 1e-4);
  near(e.phaseDiff / e.phaseFromParams, 1, 0.1, 'phase drift explained by rounded constants');
  // ...not the per-operation round-off, which is far smaller.
  const t = V.createOscillator({ dt: 0.01, sameParams: true });
  V.stepOscillator(t, 1e6);
  const et = V.oscillatorErrors(t);
  assert.equal(et.phaseFromParams, 0);
  assert.ok(Math.abs(et.phaseDiff) < 0.2 * Math.abs(e.phaseFromParams));
  // The Float32 clock t += 0.01 is off by more than 1% after 1e6 steps.
  assert.ok(Math.abs(e.clockErr32) > 0.01 * e.t, `f32 clock error ${e.clockErr32}`);
  assert.ok(Math.abs(e.clockErr64) < 1e-6);
  // And it stops dead at 2^18 s.
  const T = V.float32ClockStall(0.01);
  assert.equal(T, 2 ** 18);
  const dt32 = Math.fround(0.01);
  assert.equal(Math.fround(T + dt32), T);
  assert.ok(Math.fround(T / 2 + dt32) > T / 2);
});

// ---------------------------------------------------------------------------
// (c) Convergence helpers

test('Richardson extrapolation of f0 + C h^2 + D h^3: p -> 2, extrapolation error O(h^3)', () => {
  const f0 = 1.25;
  const C = 0.7;
  const D = 0.3;
  const fn = (h) => f0 + C * h * h + D * h * h * h;
  const hs = [0.1, 0.05, 0.025, 0.0125, 0.00625];
  const errs = [];
  let last = null;
  for (const h of hs) {
    const r = V.richardson3(fn(h), fn(2 * h), fn(4 * h), 2);
    assert.equal(r.convergence, 'monotone');
    near(r.p, 2, 3 * h, `p at h = ${h}`);
    errs.push(Math.abs(r.fExt - f0));
    last = { r, h };
  }
  // p - 2 = O(h): to first order p = 2 + 28 D h / (12 C ln 2).
  near((last.r.p - 2) / last.h, (28 * D) / (12 * C * Math.LN2), 0.05 * ((28 * D) / (12 * C * Math.LN2)), 'p - 2 is linear in h');
  const orders = V.observedOrdersH(hs, errs);
  near(orders[orders.length - 1], 3, 0.1, 'order of the extrapolated value');
  near(V.richardsonExtrapolate(fn(0.01), fn(0.02), 2, 2), f0, 1e-5);
});

test('three-grid helpers refuse to extrapolate divergent or degenerate data', () => {
  // Divergent: the error grows on refinement.
  const rd = V.richardson3(1.0, 1.1, 1.15, 2);
  assert.equal(rd.convergence, 'divergent');
  assert.ok(rd.p < 0);
  assert.ok(Number.isNaN(rd.fExt));
  const gd = V.gci3({ f: [1.0, 1.1, 1.15], h: [1, 2, 4] });
  assert.equal(gd.convergence, 'divergent');
  assert.equal(gd.valid, false);
  for (const k of ['fExt21', 'eext21', 'gciFine21', 'gci32', 'asymptoticRatio']) assert.ok(Number.isNaN(gd[k]), k);
  // Oscillatory: no real Richardson order; gci3 uses Celik's |.| and stays valid.
  const ro = V.richardson3(1, 1.1, 0.95);
  assert.equal(ro.convergence, 'oscillatory');
  assert.ok(Number.isNaN(ro.p) && Number.isNaN(ro.fExt));
  const go = V.gci3(V.GCI_EXAMPLES[2]);
  assert.equal(go.valid, true);
  assert.ok(Number.isFinite(go.gciFine21));
  // The two finest grids agree: indeterminate, not divergent.
  assert.equal(V.richardson3(1, 1, 1.1).convergence, 'indeterminate');
  assert.equal(V.gci3({ f: [1, 1, 1.1], h: [1, 2, 4] }).valid, false);
  // f3 = f2 != f1: divergent.
  assert.equal(V.gci3({ f: [1, 1.1, 1.1], h: [1, 2, 4] }).convergence, 'divergent');
  for (const ex of V.GCI_EXAMPLES) assert.equal(V.gci3(ex).valid, true, ex.id);
});

test('observed order helpers', () => {
  const hs = [0.1, 0.05, 0.02, 0.01];
  const errs = hs.map((h) => 3 * h * h);
  for (const p of V.observedOrdersH(hs, errs)) near(p, 2, 1e-12);
  const fit = V.fitOrder(hs, errs);
  near(fit.p, 2, 1e-12);
  near(fit.C, 3, 1e-10);
});

test('GCI procedure reproduces Celik et al. (2008) Table 1', () => {
  const pct = (x) => 100 * x;
  for (const ex of V.GCI_EXAMPLES) {
    const r = V.gci3(ex);
    const P = ex.printed;
    assert.ok(r.converged);
    near(r.r21, P.r21, 0.0005, `${ex.id} r21`);
    near(r.r32, P.r32, 0.0005, `${ex.id} r32`);
    near(r.p, P.p, 0.005, `${ex.id} p`);
    near(r.fExt21, P.fExt21, 0.00005, `${ex.id} phi_ext`);
    near(pct(r.ea21), P.ea21, 0.05, `${ex.id} e_a`);
    near(pct(r.gciFine21), P.gciFine21, 0.05, `${ex.id} GCI`);
    // Column 2 prints e_ext = 0.9%, but its own phi_ext = 10.8801 gives 0.846%;
    // 0.9 is the half-up rounding of 0.850%, what p rounded to 0.75 gives.
    near(pct(r.eext21), P.eext21, ex.id === 'celik-velocity-p-lt-1' ? 0.06 : 0.05, `${ex.id} e_ext`);
  }
  assert.equal(V.gci3(V.GCI_EXAMPLES[2]).convergence, 'oscillatory');
  // Constant ratio: q(p) = 0 and p is the Richardson order.
  const r = V.gci3({ f: [1.001, 1.004, 1.016], h: [0.1, 0.2, 0.4] });
  near(r.p, 2, 1e-12);
  near(r.fExt21, 1, 1e-12);
  near(r.asymptoticRatio, 1, 0.01, 'asymptotic range');
});

// ---------------------------------------------------------------------------
// (d) Manufactured solutions

test('manufactured derivatives and source are consistent', () => {
  for (const sol of Object.values(V.MMS_SOLUTIONS)) {
    for (const x of [0, 0.3, 0.77, 1]) {
      const h = 1e-4;
      near(sol.du(x), (sol.u(x + h) - sol.u(x - h)) / (2 * h), 1e-7, `${sol.id} u'(${x})`);
      near(sol.d2u(x), (sol.u(x + h) - 2 * sol.u(x) + sol.u(x - h)) / (h * h), 1e-5, `${sol.id} u''(${x})`);
    }
  }
  const sol = V.MMS_SOLUTIONS['sine-exp'];
  near(V.mmsSource(0.4, sol, 0.1, 1, 1), -0.1 * sol.d2u(0.4) + sol.du(0.4) + sol.u(0.4), 1e-14);
});

test('Thomas solve matches a dense solve', () => {
  const n = 12;
  const r = rng(7);
  const lo = new Float64Array(n);
  const di = new Float64Array(n);
  const up = new Float64Array(n);
  const rhs = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    lo[i] = i ? r() - 0.5 : 0;
    up[i] = i < n - 1 ? r() - 0.5 : 0;
    di[i] = 2 + r();
    rhs[i] = r();
  }
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (j === i ? di[i] : j === i - 1 ? lo[i] : j === i + 1 ? up[i] : 0)));
  const b = Array.from(rhs);
  const u = V.thomasSolve(lo, di.slice(), up, rhs.slice(), new Float64Array(n));
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i][j] * u[j];
    near(s, b[i], 1e-13, `row ${i}`);
  }
});

test('MMS: the correct solver converges at order 2.0', () => {
  const { counts, value } = countEvents(V.mmsStudy({}));
  assert.equal(counts.iter, V.MMS_DEFAULTS.levels);
  near(value.finalOrder, 2, 0.1, 'max norm');
  near(value.rows[value.rows.length - 1].orderL2, 2, 0.1, 'L2 norm');
  for (const p of value.orders) near(p, 2, 0.1);
});

test('MMS: each bug toggle produces its documented degraded behaviour', () => {
  const good = V.mmsConvergence({});
  const fine = good.errMax[good.errMax.length - 1];
  for (const id of ['bc-first-order', 'source-shift']) {
    const r = V.mmsConvergence({ bugs: [id] });
    assert.equal(V.MMS_BUGS[id].expectedOrder, 1);
    near(r.finalOrder, 1, 0.1, id);
    assert.ok(r.errMax[r.errMax.length - 1] > 10 * fine, id);
  }
  for (const id of ['advection-half', 'diffusion-half']) {
    const r = V.mmsConvergence({ bugs: [id] });
    assert.equal(V.MMS_BUGS[id].expectedOrder, 0);
    assert.ok(Math.abs(r.finalOrder) < 0.1, `${id} order ${r.finalOrder}`);
    assert.ok(r.errMax[r.errMax.length - 1] > 0.1, `${id} error stalls at O(1)`);
  }
  // First-order upwind advection is a scheme choice, and MMS measures it too.
  near(V.mmsConvergence({ advection: 'upwind' }).finalOrder, 1, 0.1, 'upwind');
});

test('MMS: a non-integer refinement ratio (1.5) still measures order 2', () => {
  const r = V.mmsConvergence({ ratio: 1.5, levels: 8 });
  assert.deepEqual(r.rows.map((row) => row.n), [10, 15, 23, 34, 51, 76, 114, 171]);
  for (const p of r.orders) near(p, 2, 0.1);
  near(V.mmsConvergence(V.PRESETS['mms-ratio-1.5']).finalOrder, 2, 0.05);
  assert.throws(() => V.mmsSolve({ n: 22.5 }), RangeError);
  assert.throws(() => V.mmsSolve({ n: 1 }), RangeError);
  assert.throws(() => V.mmsConvergence({ ratio: 1 }), RangeError);
});

test('MMS: the first-order boundary closure wanders before settling at order 1, as documented', () => {
  const good = V.mmsConvergence({});
  const bc = V.mmsConvergence({ bugs: ['bc-first-order'] });
  // Opposite-sign O(h) and O(h^2) errors: the coarsest grid even beats the correct code...
  assert.ok(bc.errMax[0] < good.errMax[0]);
  // ...and the observed order dips well below 1 before climbing back.
  assert.ok(bc.orders[1] < 0.8, `dip ${bc.orders[1]}`);
  assert.ok(bc.orders.slice(1).every((p, i, a) => i === 0 || p > a[i - 1]), 'then rises monotonically');
  near(bc.finalOrder, 1, 0.1);
});

test('MMS: unknown ids throw instead of silently running the correct solver', () => {
  assert.throws(() => V.mmsSolve({ bugs: ['bc-firstorder'] }), /unknown MMS bug/);
  assert.throws(() => V.mmsSolve({ advection: 'Upwind' }), /unknown advection/);
  assert.throws(() => V.mmsSolve({ solution: 'nope' }), /unknown manufactured solution/);
  assert.doesNotThrow(() => V.mmsSolve({ bugs: 'none' }));
});

test('MMS source TeX has no stray signs', () => {
  assert.equal(V.mmsSourceTex(0.1, 1, 1), "s(x) = -0.1\\,u_m'' + u_m' + u_m");
  assert.equal(V.mmsSourceTex(0, 1, 1), "s(x) = u_m' + u_m");
  assert.equal(V.mmsSourceTex(0, -1, 2), "s(x) = -u_m' + 2\\,u_m");
  assert.equal(V.mmsSourceTex(0, 0, 0), 's(x) = 0');
  assert.equal(V.mmsSourceTex(0.1 + 0.2, 0, 0), "s(x) = -0.3\\,u_m''");
});

test('MMS: refining far past the asymptotic range hits a round-off floor', () => {
  const e = (n) => V.mmsSolve({ n }).errMax;
  assert.ok(e(81920) < 1e-9, 'second order all the way down to ~5e-10');
  assert.ok(e(327680) > 3 * e(81920), 'then the error grows again');
});

test('MMS: a linear manufactured solution cannot see diffusion or boundary-closure bugs', () => {
  for (const id of ['none', 'diffusion-half', 'bc-first-order']) {
    const r = V.mmsConvergence({ solution: 'linear', bugs: [id] });
    for (const e of r.errMax) assert.ok(e < 1e-12, `${id}: ${e}`);
  }
  assert.ok(V.mmsConvergence({ solution: 'linear', bugs: ['advection-half'] }).errMax[5] > 0.1);
  near(V.mmsConvergence({ solution: 'linear', bugs: ['source-shift'] }).finalOrder, 1, 0.1);
});

// ---------------------------------------------------------------------------
// Similarity: dimensional analysis

const isDimensionless = (ids, exps) => [0, 1, 2, 3].every((r) => Math.abs(ids.reduce((s, id, i) => s + S.VARIABLES[id].dims[r] * exps[i], 0)) < 1e-12);

test('pi groups for sphere drag: Newton number and Reynolds number', () => {
  const dm = S.dimensionMatrix(['F', 'rho', 'U', 'D', 'mu']);
  assert.deepEqual(dm.dims, ['M', 'L', 'T']);
  assert.deepEqual(dm.rows, [
    [1, 1, 0, 0, 1],
    [1, -3, 1, 1, -1],
    [-2, 0, -1, 0, -1],
  ]);
  const r = S.piGroups(['F', 'rho', 'U', 'D', 'mu']);
  assert.equal(r.rank, 3);
  assert.equal(r.count, 2);
  assert.deepEqual(r.repeating, ['rho', 'U', 'D']);
  assert.deepEqual(r.groups.map((g) => g.named), [{ id: 'Ne', power: 1 }, { id: 'Re', power: -1 }]);
  assert.deepEqual(r.groups[0].integer, [1, -1, -2, -2, 0]);
  assert.equal(r.groups[0].tex, '\\frac{F}{\\rho U^{2} D^{2}}');
});

test('pi groups for pipe pressure drop: four groups', () => {
  const r = S.piGroups(['dp', 'rho', 'U', 'D', 'mu', 'L', 'eps']);
  assert.equal(r.rank, 3);
  assert.equal(r.groups.length, 4);
  assert.deepEqual(r.groups.map((g) => g.named?.id ?? g.label), ['Eu', 'Re', 'L', 'eps']);
  assert.equal(r.groups[2].tex, '\\frac{L}{D}');
  assert.equal(r.groups[3].tex, '\\frac{\\epsilon}{D}');
});

// An independent rank: floating-point elimination with partial pivoting.
function floatRank(rows) {
  const A = rows.map((r) => r.slice());
  let rank = 0;
  const m = A.length;
  const n = A[0].length;
  for (let c = 0; c < n && rank < m; c++) {
    let p = rank;
    for (let i = rank + 1; i < m; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    if (Math.abs(A[p][c]) < 1e-9) continue;
    [A[rank], A[p]] = [A[p], A[rank]];
    for (let i = rank + 1; i < m; i++) {
      const f = A[i][c] / A[rank][c];
      for (let j = c; j < n; j++) A[i][j] -= f * A[rank][j];
    }
    rank++;
  }
  return rank;
}

test('n - rank groups, all dimensionless and independent, over random library subsets', () => {
  const ids = Object.keys(S.VARIABLES);
  const r = rng(2024);
  let tested = 0;
  for (let trial = 0; trial < 300; trial++) {
    const k = 3 + Math.floor(r() * 7);
    const pool = ids.slice();
    const pick = [];
    while (pick.length < k) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    const res = S.piGroups(pick);
    const rows = [0, 1, 2, 3].map((d) => pick.map((id) => S.VARIABLES[id].dims[d]));
    assert.equal(res.rank, floatRank(rows), pick.join(','));
    assert.equal(res.groups.length, pick.length - res.rank);
    for (const g of res.groups) {
      assert.ok(isDimensionless(pick, g.exponents), `${pick}: ${g.tex}`);
      assert.ok(isDimensionless(pick, g.integer));
      assert.ok(g.integer.every(Number.isInteger));
    }
    if (res.groups.length) assert.equal(floatRank(res.groups.map((g) => g.exponents)), res.groups.length, 'groups independent');
    tested++;
  }
  assert.equal(tested, 300);
  for (const p of Object.values(S.PI_PRESETS)) {
    const res = S.piGroups(p.vars, { repeating: p.repeating });
    assert.equal(res.count, p.vars.length - res.rank);
    for (const g of res.groups) assert.ok(isDimensionless(p.vars, g.exponents));
  }
});

test('repeating variables must be independent and exactly rank of them', () => {
  assert.throws(() => S.piGroups(['F', 'rho', 'U', 'D', 'mu', 'c'], { repeating: ['U', 'c', 'D'] }), /independent/);
  assert.throws(() => S.piGroups(['F', 'rho', 'U', 'D', 'mu'], { repeating: ['rho', 'U'] }), /exactly 3/);
  const r = S.piGroups(['F', 'rho', 'U', 'L', 'mu', 'g'], { repeating: ['rho', 'U', 'L'] });
  assert.deepEqual(r.groups.map((g) => g.named), [{ id: 'Ne', power: 1 }, { id: 'Re', power: -1 }, { id: 'Fr', power: -2 }]);
});

test('every named number is dimensionless, in every form', () => {
  for (const N of Object.values(S.NUMBERS)) {
    for (const form of [N.exps, ...(N.alt ?? [])]) {
      const ids = Object.keys(form);
      assert.ok(isDimensionless(ids, ids.map((id) => form[id])), N.id);
    }
    assert.ok(N.tex.length && N.meaning.length && N.ratio.length);
  }
  for (const id of ['Re', 'Ma', 'Fr', 'St', 'We', 'Pr', 'Pe', 'Kn', 'Ca', 'Ri', 'Ra', 'Eu', 'Sc', 'Gr']) assert.ok(S.NUMBERS[id], id);
});

test('groups written with nu, mu c_p / k or a mass diffusivity are named too', () => {
  const named = (vars) => S.piGroups(vars).groups.map((g) => g.named);
  assert.deepEqual(named(['f', 'U', 'D', 'nu']), [{ id: 'St', power: 1 }, { id: 'Re', power: -1 }]);
  assert.deepEqual(named(['U', 'D', 'nu']), [{ id: 'Re', power: 1 }]);
  assert.deepEqual(named(['mu', 'cp', 'k']), [{ id: 'Pr', power: 1 }]);
  assert.deepEqual(named(['U', 'L', 'Dm']), [{ id: 'Pe', power: 1 }]);
  assert.deepEqual(S.identifyGroup(['g', 'beta', 'dT', 'L', 'rho', 'mu'], [1, 1, 1, 3, 2, -2]), { id: 'Gr', power: 1 });
  assert.deepEqual(S.identifyGroup(['g', 'beta', 'dT', 'H', 'rho', 'cp', 'mu', 'k'], [1, 1, 1, 3, 2, 1, -1, -1]), { id: 'Ra', power: 1 });
});

test('pi groups accept custom variables', () => {
  const chord = { id: 'chord', dims: [0, 1, 0, 0], tex: 'c' };
  const r = S.piGroups(['F', 'rho', 'U', chord, 'mu']);
  assert.equal(r.count, 2);
  assert.deepEqual(r.repeating, ['rho', 'U', 'chord']);
  assert.equal(r.groups[0].tex, '\\frac{F}{\\rho U^{2} c^{2}}');
  assert.deepEqual(r.groups.map((g) => g.named), [{ id: 'Ne', power: 1 }, { id: 'Re', power: -1 }]);
  const odd = { id: 'q', dims: [0, 0, 0, 1] };
  assert.equal(S.piGroups(['T', odd]).groups[0].tex, '\\frac{T}{q}');
});

// ---------------------------------------------------------------------------
// Similarity: correlations

test('Colebrook converges (residual < 1e-12) and Haaland is within 2% for Re 1e4-1e8, eps/D 0-0.05', () => {
  let worst = 0;
  let maxNewton = 0;
  let maxFixed = 0;
  for (let e = 4; e <= 8.0001; e += 0.25) {
    for (const rr of [0, 1e-6, 1e-5, 1e-4, 1e-3, 5e-3, 0.01, 0.02, 0.03, 0.04, 0.05]) {
      const Re = 10 ** e;
      const n = drain(S.colebrook(Re, rr, { method: 'newton' }));
      const fp = drain(S.colebrook(Re, rr, { method: 'fixed-point' }));
      assert.ok(n.converged && n.residual < 1e-12, `newton ${Re} ${rr}`);
      assert.ok(fp.converged && fp.residual < 1e-12, `fixed point ${Re} ${rr}`);
      near(n.f, fp.f, 1e-14);
      maxNewton = Math.max(maxNewton, n.iterations);
      maxFixed = Math.max(maxFixed, fp.iterations);
      worst = Math.max(worst, rel(S.frictionHaaland(Re, rr), n.f));
    }
  }
  assert.ok(worst < 0.02, `Haaland worst deviation ${worst}`);
  assert.ok(maxNewton <= 6, `Newton ${maxNewton}`);
  assert.ok(maxFixed <= 25 && maxFixed > 2 * maxNewton, `fixed point ${maxFixed}`);
  // The generator yields one 'iter' event per iteration plus the start.
  const { counts, value } = countEvents(S.colebrook(1e6, 1e-4));
  assert.equal(counts.iter, value.iterations + 1);
});

test('Colebrook from a bad starting guess: safeguarded steps keep x > 0 and still converge', () => {
  for (const Re of [4000, 1e4, 1e6]) {
    for (const rr of [0, 0.01]) {
      const ref = S.frictionColebrook(Re, rr);
      for (const method of ['newton', 'fixed-point']) {
        for (const f0 of [1e-12, 1e-8, 1e-4, 10]) {
          const xs = [];
          const r = drain(S.colebrook(Re, rr, { method, f0 }), (e) => xs.push(e.x));
          assert.ok(r.converged && r.residual < 1e-12, `${method} Re ${Re} rr ${rr} f0 ${f0}: ${JSON.stringify(r)}`);
          assert.ok(rel(r.f, ref) < 1e-12);
          assert.ok(xs.every((x) => x > 0));
        }
      }
    }
  }
  // The cases where the unguarded first step leaves the domain.
  for (const [Re, f0, method] of [[1e4, 1e-10, 'newton'], [4000, 1e-8, 'newton'], [4000, 1e-8, 'fixed-point']]) {
    const r = drain(S.colebrook(Re, 0, { f0, method }));
    assert.ok(r.safeguards >= 1 && r.converged, `${method} Re ${Re} f0 ${f0}`);
  }
  assert.throws(() => drain(S.colebrook(1e4, 0, { f0: 0 })), RangeError);
  // No positive root when rr/3.7 >= 1: reported as not converged, never a bogus f.
  const bad = drain(S.colebrook(1e4, 4, { maxIter: 50 }));
  assert.equal(bad.converged, false);
});

test('laminar and Blasius friction factors', () => {
  assert.equal(S.frictionLaminar(1000), 0.064);
  near(S.frictionBlasius(1e5), 0.316 / 10 ** 1.25, 1e-15);
  near(S.frictionBlasius(1e5), 0.01777, 5e-6);
  assert.ok(rel(S.frictionBlasius(1e5), S.frictionColebrook(1e5, 0)) < 0.02);
  assert.equal(S.frictionFactor(1000).regime, 'laminar');
  assert.equal(S.frictionFactor(3000).regime, 'transitional');
  near(S.pressureDrop({ f: 0.02, L: 10, D: 0.1, rho: 1000, U: 2 }), 4000, 1e-9);
});

test('every sphere-drag correlation has the Stokes limit; Morrison shows the drag crisis', () => {
  for (const m of Object.values(S.SPHERE_DRAG)) assert.ok(rel(m.fn(0.01), 2400) < 0.02, m.id);
  const cd = S.cdMorrison;
  assert.ok(cd(1e5) / cd(4e5) > 3, `crisis ${cd(1e5)} -> ${cd(4e5)}`);
  assert.ok(cd(1e5) > 0.35 && cd(1e5) < 0.5);
});

test('Strouhal number: Roshko (1954) fits, onset and plateau', () => {
  near(S.strouhalCylinder(100).st, 0.212 * (1 - 0.212), 1e-12);
  // Roshko's F = St Re form of the same lines.
  for (const Re of [60, 100, 140]) near(S.strouhalCylinder(Re).st * Re, 0.212 * Re - 4.5, 0.01);
  for (const Re of [400, 1000, 1900]) near(S.strouhalCylinder(Re).st * Re, 0.212 * Re - 2.7, 0.01);
  assert.equal(S.strouhalCylinder(30).st, 0);
  assert.ok(Number.isNaN(S.strouhalCylinder(200).st));
  assert.equal(S.strouhalCylinder(1e4).st, 0.2);
  assert.ok(Number.isNaN(S.strouhalCylinder(5e5).st));
});

test('ship model: Froude and Reynolds similarity need speeds a factor scale^(-3/2) apart', () => {
  const r = S.shipScaling({ lengthShip: 100, speedShip: 8, scale: 1 / 25 });
  near(r.froude.speed, 1.6, 1e-12);
  near(r.reynolds.speed, 200, 1e-9);
  near(r.speedRatio, 125, 1e-9);
  near(r.froude.Fr, r.ship.Fr, 1e-15);
  near(r.froude.reRatio, 1 / 125, 1e-15);
  near(r.nuNeeded, 8e-9, 1e-20);
  assert.ok(r.froude.Cf > 2 * r.ship.Cf, 'friction coefficient differs at model scale');
});
