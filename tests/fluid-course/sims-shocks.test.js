// Claims of the shocks chapter, measured on the kernels burgers.js,
// riemann.js and euler1d.js. Numbers quoted in comments are what these
// tests measured when they were written.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TORO_TESTS, GUESSES, solveRiemann, exactRiemann, riemannInto, makeRiemannSolution, sampleRiemann, vacuumCase,
  starFunction,
} from '../../aids/fluid-course/src/sims/riemann.js';
import {
  BURGERS_SCHEMES, BURGERS_PRESETS, LIMITERS, burgersFlux, burgersRiemann, rhSpeed, createBurgers, resetBurgers, stepBurgers,
  burgersDt, burgersCfl, advanceBurgers, burgersExact, burgersMass, burgersEnergy, shockPosition, sineExact, breakingTime,
  nwaveExact,
} from '../../aids/fluid-course/src/sims/burgers.js';
import {
  EULER_FLUXES, EULER_PRESETS, WAVE_SPEEDS, ACOUSTIC_EPS, createEuler, resetEuler, stepEuler, eulerDt, advanceEuler, eulerTotals,
  eulerExact, eulerReference, shockStates, simpleWaveExact, simpleWaveBreakingTime,
} from '../../aids/fluid-course/src/sims/euler1d.js';
import { norm1, observedOrders, totalVariation, drain } from '../../aids/fluid-course/src/sims/util.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

const G = 1.4;
const maxAbs = (a) => a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
// largest increase u[i+1] - u[i] (0 for a non-increasing profile)
const maxRise = (u) => {
  let m = 0;
  for (let i = 0; i + 1 < u.length; i++) m = Math.max(m, u[i + 1] - u[i]);
  return m;
};
const maxJump = (u, keep = () => true, x = null) => {
  let m = 0;
  for (let i = 0; i + 1 < u.length; i++) if (keep(x ? x[i] : i)) m = Math.max(m, Math.abs(u[i + 1] - u[i]));
  return m;
};

// ---------------------------------------------------------------------------
// Exact Riemann solver (riemann.js)

// Toro (2009) Table 4.3, as printed: p*, u*, rho*_L, rho*_R.
const TABLE_4_3 = {
  test1: ['0.30313', '0.92745', '0.42632', '0.26557'],
  test2: ['0.00189', '0.00000', '0.02185', '0.02185'],
  test3: ['460.894', '19.5975', '0.57506', '5.99924'],
  test4: ['46.0950', '-6.19633', '5.99242', '0.57511'],
  test5: ['1691.64', '8.68975', '14.2823', '31.0426'],
};
// Agreement to the printed digits: within one unit of the last printed place.
const agreesPrinted = (value, printed) => {
  const dec = (printed.split('.')[1] || '').length;
  return Math.abs(value - Number(printed)) <= Math.pow(10, -dec) * (1 + 1e-9);
};

test('Sod star state: p* = 0.30313, u* = 0.92745 (Toro Table 4.3) to 4 significant digits', () => {
  const s = exactRiemann({ rho: 1, u: 0, p: 1 }, { rho: 0.125, u: 0, p: 0.1 });
  assert.ok(Math.abs(s.pStar - 0.30313) / 0.30313 < 1e-4, `p* = ${s.pStar}`);
  assert.ok(Math.abs(s.uStar - 0.92745) / 0.92745 < 1e-4, `u* = ${s.uStar}`);
  assert.equal(s.left.type, 'rarefaction');
  assert.equal(s.right.type, 'shock');
});

test('Toro tests 1-5: star pressure, velocity and densities match Table 4.3 to the printed digits', () => {
  for (const T of TORO_TESTS) {
    let { L, R } = T;
    if (T.id === 'test5') {
      // Table 4.3's test-5 row is the collision of the unrounded star states
      // of tests 3 and 4; with the rounded inputs printed in Table 4.1, u*
      // moves by 2e-5 (8.68977 instead of 8.68975).
      const t3 = exactRiemann(TORO_TESTS[2].L, TORO_TESTS[2].R), t4 = exactRiemann(TORO_TESTS[3].L, TORO_TESTS[3].R);
      L = { rho: t3.rhoStarR, u: t3.uStar, p: t3.pStar };
      R = { rho: t4.rhoStarL, u: t4.uStar, p: t4.pStar };
      const rounded = exactRiemann(T.L, T.R);
      assert.ok(Math.abs(rounded.uStar - 8.68975) / 8.68975 < 5e-6 && Math.abs(rounded.pStar - 1691.64) / 1691.64 < 5e-6);
    }
    const s = exactRiemann(L, R);
    const got = [s.pStar, s.uStar, s.rhoStarL, s.rhoStarR];
    TABLE_4_3[T.id].forEach((printed, k) => {
      assert.ok(agreesPrinted(got[k], printed), `${T.id} quantity ${k}: ${got[k]} vs ${printed}`);
    });
    assert.deepEqual([s.left.type, s.right.type], T.waves, T.id);
  }
});

test('Newton iteration: a generator of iterates that converges quadratically from every starting guess', () => {
  for (const T of TORO_TESTS) {
    const ref = exactRiemann(T.L, T.R, { tol: 1e-14 });
    for (const g of GUESSES) {
      const ev = [];
      const s = drain(solveRiemann(T.L, T.R, { guess: g.id, tol: 1e-12 }), (e) => ev.push(e));
      assert.ok(s.converged, `${T.id}/${g.id} converged`);
      assert.equal(ev[0].k, 0);
      assert.ok(ev.every((e) => e.t === 'iter'));
      assert.ok(Math.abs(s.pStar - ref.pStar) / ref.pStar < 1e-11, `${T.id}/${g.id}`);
      // the residual at the answer is tiny on the scale of the velocities
      const scale = Math.abs(T.L.u) + Math.abs(T.R.u) + s.aL + s.aR;
      assert.ok(Math.abs(ev[ev.length - 1].residual) < 1e-10 * scale);
      // quadratic convergence: once the relative error is below 1e-2 it
      // (at least) squares at every step, e_{k+1} <= C e_k^2 with C ~ 0.4
      const err = ev.map((e) => Math.abs(e.p - ref.pStar) / ref.pStar);
      for (let k = 0; k + 1 < err.length; k++) {
        if (err[k] < 1e-2 && err[k] > 1e-7) assert.ok(err[k + 1] <= 2 * err[k] * err[k], `${T.id}/${g.id} k=${k}`);
      }
    }
    // Toro's adaptive guess needs at most 5 Newton steps on all five tests
    assert.ok(exactRiemann(T.L, T.R).iterations <= 5, T.id);
  }
});

test('the allocation-free twin riemannInto gives exactly the generator answer', () => {
  const sol = makeRiemannSolution();
  for (const T of TORO_TESTS) {
    const a = exactRiemann(T.L, T.R);
    riemannInto(sol, T.L.rho, T.L.u, T.L.p, T.R.rho, T.R.u, T.R.p, G);
    assert.equal(sol.pStar, a.pStar);
    assert.equal(sol.uStar, a.uStar);
    assert.equal(sol.iterations, a.iterations);
  }
});

test('exact solution: Rankine-Hugoniot across shocks, isentropic and Riemann-invariant across fans, continuous fans', () => {
  for (const T of TORO_TESTS) {
    const s = exactRiemann(T.L, T.R);
    const sides = [
      ['left', T.L, s.rhoStarL, s.aL, -1],
      ['right', T.R, s.rhoStarR, s.aR, +1],
    ];
    for (const [side, W, rs, a, sign] of sides) {
      const w = s[side];
      if (w.type === 'shock') {
        const S = w.speed;
        const m0 = W.rho * (W.u - S), m1 = rs * (s.uStar - S);
        const e0 = W.p / (G - 1) + 0.5 * W.rho * W.u * W.u, e1 = s.pStar / (G - 1) + 0.5 * rs * s.uStar * s.uStar;
        const rel = (x, y) => Math.abs(x - y) / Math.max(1, Math.abs(x));
        assert.ok(rel(m0, m1) < 1e-9, `${T.id} ${side} mass flux`);
        // momentum and energy fluxes in the shock frame: [rho u (u - S) + p] = 0, [(E + p) u - S E] = 0
        const fm0 = W.rho * W.u * (W.u - S) + W.p, fm1 = rs * s.uStar * (s.uStar - S) + s.pStar;
        const fe0 = (e0 + W.p) * W.u - S * e0, fe1 = (e1 + s.pStar) * s.uStar - S * e1;
        assert.ok(rel(fm0, fm1) < 1e-9, `${T.id} ${side} momentum`);
        assert.ok(rel(fe0, fe1) < 1e-9, `${T.id} ${side} energy`);
      } else {
        assert.ok(Math.abs(W.p / W.rho ** G - s.pStar / rs ** G) / (W.p / W.rho ** G) < 1e-10, `${T.id} ${side} isentropic`);
        const aStar = Math.sqrt((G * s.pStar) / rs);
        const J0 = W.u - (sign * 2 * a) / (G - 1), J1 = s.uStar - (sign * 2 * aStar) / (G - 1);
        assert.ok(Math.abs(J0 - J1) < 1e-10 * (1 + Math.abs(J0)), `${T.id} ${side} Riemann invariant`);
      }
    }
    checkFans(s, T.id);
  }
});

// Inside a centred rarefaction fan the solution at s = x/t satisfies
// u - a = s (left fan) or u + a = s (right fan), keeps the entropy p/rho^gamma
// of the outer state and the Riemann invariant u +/- 2a/(gamma-1) of the
// other family (Toro §4.4, eqs 4.56 and 4.63), and joins its neighbours
// continuously in rho, u and p.
function checkFans(s, label) {
  for (const [side, sign] of [['left', -1], ['right', 1]]) {
    const w = s[side];
    if (w.type !== 'rarefaction' || !(Math.abs(w.tail - w.head) > 1e-12)) continue;
    const K = side === 'left'
      ? { rho: s.rhoL, u: s.uL, p: s.pL, a: s.aL, region: 'L-fan' }
      : { rho: s.rhoR, u: s.uR, p: s.pR, a: s.aR, region: 'R-fan' };
    const entropy = K.p / K.rho ** G, J = K.u - (sign * 2 * K.a) / (G - 1);
    const scale = Math.abs(K.u) + K.a;
    for (let m = 1; m < 8; m++) {
      const sm = w.head + ((w.tail - w.head) * m) / 8;
      const q = sampleRiemann(s, sm, {});
      assert.equal(q.region, K.region, `${label} ${side} fan region`);
      const a = Math.sqrt((G * q.p) / q.rho);
      assert.ok(Math.abs(q.u + sign * a - sm) < 1e-12 * (1 + scale), `${label} ${side} fan: u ${sign < 0 ? '-' : '+'} a = s`);
      assert.ok(Math.abs(q.p / q.rho ** G - entropy) < 1e-10 * entropy, `${label} ${side} fan isentrope`);
      assert.ok(Math.abs(q.u - (sign * 2 * a) / (G - 1) - J) < 1e-12 * (1 + scale), `${label} ${side} fan invariant`);
    }
    for (const edge of [w.head, w.tail]) {
      const a1 = sampleRiemann(s, edge - 1e-9, {}), a2 = sampleRiemann(s, edge + 1e-9, {});
      for (const k of ['rho', 'u', 'p']) {
        assert.ok(Math.abs(a1[k] - a2[k]) < 1e-6 * (1 + Math.abs(a1[k])), `${label} ${side} fan edge ${k}`);
      }
    }
  }
}

test('exact rarefaction fans in vacuum and sonic cases: characteristics, isentropes, invariants, continuity', () => {
  const a = Math.sqrt(G);
  const cases = {
    generated: exactRiemann({ rho: 1, u: -7, p: 1 }, { rho: 1, u: 7, p: 1 }),
    rightVacuum: exactRiemann({ rho: 1, u: 0, p: 1 }, { rho: 0, u: 0, p: 0 }),
    leftVacuum: exactRiemann({ rho: 0, u: 0, p: 0 }, { rho: 1, u: 0, p: 1 }),
    sonicSod: exactRiemann({ rho: 1, u: 0.75, p: 1 }, { rho: 0.125, u: 0, p: 0.1 }),
    sonicMirror: exactRiemann({ rho: 0.125, u: 0, p: 0.1 }, { rho: 1, u: -0.75, p: 1 }),
  };
  for (const [label, s] of Object.entries(cases)) checkFans(s, label);
  // the one-sided vacuum fans end at the escape speed u_K +/- 2 a_K/(gamma - 1)
  assert.ok(Math.abs(cases.rightVacuum.left.tail - (2 * a) / (G - 1)) < 1e-12);
  assert.ok(Math.abs(cases.leftVacuum.right.tail + (2 * a) / (G - 1)) < 1e-12);
  // the sonic fan straddles s = 0, and the mirror image is the mirror solution
  assert.ok(cases.sonicSod.left.head < 0 && cases.sonicSod.left.tail > 0);
  for (const sm of [-0.4, -0.05, 0, 0.1, 0.7]) {
    const p = sampleRiemann(cases.sonicSod, sm, {}), q = sampleRiemann(cases.sonicMirror, -sm, {});
    assert.ok(Math.abs(p.rho - q.rho) < 1e-12 && Math.abs(p.u + q.u) < 1e-12 && Math.abs(p.p - q.p) < 1e-12, `mirror at ${sm}`);
  }
});

test('vacuum: detected from the pressure positivity condition, and sampled as rho = p = 0', () => {
  const a = Math.sqrt(G);
  const crit = (4 * a) / (G - 1); // 2(a_L + a_R)/(gamma - 1) = 11.83
  const gen = exactRiemann({ rho: 1, u: -7, p: 1 }, { rho: 1, u: 7, p: 1 });
  assert.equal(gen.vacuum, 'generated');
  assert.ok(Math.abs(gen.left.tail - (-7 + (2 * a) / (G - 1))) < 1e-12);
  const mid = sampleRiemann(gen, 0, {});
  assert.equal(mid.region, 'vacuum');
  assert.equal(mid.rho, 0);
  assert.equal(mid.p, 0);
  assert.equal(sampleRiemann(gen, -6, {}).region, 'L-fan');
  // just inside the threshold there is no vacuum, p* is tiny but resolved
  const near = exactRiemann({ rho: 1, u: -0.4995 * crit, p: 1 }, { rho: 1, u: 0.4995 * crit, p: 1 });
  assert.equal(near.vacuum, null);
  assert.ok(near.pStar > 0 && near.pStar < 1e-15, `p* = ${near.pStar}`);
  assert.ok(Math.abs(starFunction(near, near.pStar)) < 1e-9);
  assert.equal(vacuumCase(1, -0.5005 * crit, 1, 1, 0.5005 * crit, 1), 'generated');
  // initial vacuum on one side: a single rarefaction to vacuum
  const rv = exactRiemann({ rho: 1, u: 0, p: 1 }, { rho: 0, u: 0, p: 0 });
  assert.equal(rv.vacuum, 'right');
  assert.equal(sampleRiemann(rv, (2 * a) / (G - 1) + 0.01, {}).region, 'vacuum');
  assert.equal(sampleRiemann(rv, 0, {}).region, 'L-fan');
  const lv = exactRiemann({ rho: 0, u: 0, p: 0 }, { rho: 1, u: 0, p: 1 });
  assert.equal(lv.vacuum, 'left');
  assert.equal(sampleRiemann(lv, -(2 * a) / (G - 1) - 0.01, {}).region, 'vacuum');
});

// ---------------------------------------------------------------------------
// Burgers (burgers.js)

test('Burgers Godunov flux equals the closed form max(f(max(u_L,0)), f(min(u_R,0)))', () => {
  const f = (u) => 0.5 * u * u;
  const vals = [-2, -1, -0.3, 0, 0.4, 1, 1.5];
  for (const uL of vals) for (const uR of vals) {
    const closed = Math.max(f(Math.max(uL, 0)), f(Math.min(uR, 0)));
    assert.ok(Math.abs(burgersFlux('godunov', uL, uR, 0.5) - closed) < 1e-15, `${uL},${uR}`);
    // Roe agrees with Godunov at every shock; it differs only at transonic expansions
    if (uL > uR) assert.ok(Math.abs(burgersFlux('roe', uL, uR, 0.5) - closed) < 1e-15);
  }
  assert.equal(burgersFlux('roe', -1, 1, 0.5), 0.5); // no flux deficit: the jump cannot open
  assert.equal(burgersFlux('roe-fix', -1, 1, 0.5), 0); // = Godunov's sonic flux f(0)
  assert.equal(rhSpeed(1, 0), 0.5);
});

test('Burgers: conservative schemes conserve mass to round-off through shock formation; the quasi-linear scheme does not', () => {
  for (const sc of BURGERS_SCHEMES) {
    const s = createBurgers({ preset: 'sine', params: { mean: 0.5 }, n: 200, scheme: sc.id, limiter: 'mc' });
    const m0 = burgersMass(s);
    advanceBurgers(s, 0.3, 0.5);
    const drift = Math.abs(burgersMass(s) - m0);
    if (sc.conservative && sc.id !== 'lw') assert.ok(drift < 1e-13, `${sc.id} drift ${drift}`);
    if (sc.id === 'lw') assert.ok(drift < 1e-11, `lw drift ${drift}`);
    if (!sc.conservative) assert.ok(drift > 1e-3, `upwind-nc drift ${drift}`); // measured 0.013
  }
});

test('Burgers shock speed: conservative schemes put the shock within one cell of x0 + (u_L + u_R) t / 2; upwind on u u_x does not', () => {
  for (const [uL, uR] of [[1, 0], [1.2, 0.4], [1, -0.5]]) {
    const tEnd = 0.4;
    const exact = 0.25 + rhSpeed(uL, uR) * tEnd;
    for (const sc of BURGERS_SCHEMES) {
      const s = createBurgers({ preset: 'shock', params: { uL, uR, x0: 0.25 }, n: 200, scheme: sc.id });
      advanceBurgers(s, tEnd, 0.9);
      const err = (shockPosition(s.u, s.x, 0.5 * (uL + uR)) - exact) / s.dx;
      if (sc.conservative) assert.ok(Math.abs(err) < 1, `${sc.id} (${uL},${uR}) off by ${err.toFixed(2)} cells`);
      else assert.ok(Math.abs(err) > 5, `upwind-nc (${uL},${uR}) off by only ${err.toFixed(2)} cells`);
    }
  }
  // u_R = 0: the quasi-linear scheme never moves the shock at all
  const nc = createBurgers({ preset: 'shock', n: 200, scheme: 'upwind-nc' });
  const u0 = nc.u.slice();
  advanceBurgers(nc, 0.5, 0.9);
  assert.deepEqual(Array.from(nc.u), Array.from(u0));
  // with u_L = 1.2, u_R = 0.4 it moves at ~0.66 instead of 0.8, and refining does not help:
  // the position error in x stays ~0.07 from n = 100 to n = 800 (it converges to a wrong solution)
  for (const n of [100, 200, 400, 800]) {
    const s = createBurgers({ preset: 'shock', params: { uL: 1.2, uR: 0.4, x0: 0.25 }, n, scheme: 'upwind-nc' });
    advanceBurgers(s, 0.5, 0.9);
    const err = shockPosition(s.u, s.x, 0.8) - 0.65;
    assert.ok(err < -0.06 && err > -0.08, `n=${n}: ${err}`);
  }
});

test('Burgers transonic rarefaction: Roe keeps a stationary expansion shock; the Harten entropy fix opens the fan', () => {
  const run = (scheme, riemann = 'godunov') => {
    const s = createBurgers({ preset: 'transonic', n: 200, scheme, riemann });
    const u0 = s.u.slice();
    advanceBurgers(s, 0.5, 0.9);
    return { s, u0, L1: norm1(s.u, burgersExact(s), s.dx) };
  };
  const roe = run('roe');
  assert.deepEqual(Array.from(roe.s.u), Array.from(roe.u0)); // not a single bit changes
  assert.equal(maxJump(roe.s.u), 2);
  // MUSCL inherits the defect from its Roe face flux (the limiter zeros the slopes at the jump)
  assert.equal(maxJump(run('muscl', 'roe').s.u), 2);
  const fix = run('roe-fix'), god = run('godunov');
  assert.ok(maxJump(fix.s.u) < 0.1, `max jump ${maxJump(fix.s.u)}`); // measured 0.072
  assert.ok(Math.abs(fix.L1 - god.L1) / god.L1 < 0.01);
  assert.ok(roe.L1 > 20 * god.L1); // 0.5 vs 0.02
});

test('Burgers transonic rarefaction: the Roe defect needs the jump on a cell face, and keeps the part from -m to m', () => {
  const run = (n, scheme, params = {}) => {
    const s = createBurgers({ preset: 'transonic', n, scheme, params });
    advanceBurgers(s, 0.4, 0.9);
    return { s, L1: norm1(s.u, burgersExact(s), s.dx) };
  };
  // odd n: the middle cell holds the sonic value u = 0 and plain Roe opens the fan like Godunov
  for (const n of [101, 201]) {
    const roe = run(n, 'roe'), god = run(n, 'godunov');
    assert.ok(maxJump(roe.s.u) < 0.1, `n=${n}: ${maxJump(roe.s.u)}`); // measured 0.036-0.067
    assert.ok(Math.abs(roe.L1 - god.L1) < 0.1 * god.L1, `n=${n}`);
  }
  // asymmetric data on a face: a stationary expansion shock from -m to m, m = min(-u_L, u_R), then a fan
  for (const [uL, uR] of [[-1, 2], [-0.5, 1.5], [-2, 1]]) {
    const m = Math.min(-uL, uR);
    for (const n of [200, 400]) {
      const { s } = run(n, 'roe', { uL, uR });
      let k = 0;
      for (let i = 0; i + 1 < n; i++) if (s.u[i + 1] - s.u[i] > s.u[k + 1] - s.u[k]) k = i;
      assert.ok(Math.abs(s.u[k] + m) < 1e-12 && Math.abs(s.u[k + 1] - m) < 1e-6, `(${uL},${uR}) n=${n}: ${s.u[k]} -> ${s.u[k + 1]}`);
      assert.ok(Math.abs(s.x[k] + 0.5 * s.dx) < 1e-12, 'the jump stays on the face at x = 0');
      assert.ok(maxJump(run(n, 'roe-fix', { uL, uR }).s.u) < 0.1);
    }
  }
});

test('Burgers order of accuracy on the smooth sine before it breaks (L1, t = 0.1)', () => {
  const rate = (scheme, limiter = 'minmod') => {
    const errs = [100, 200, 400, 800].map((n) => {
      const s = createBurgers({ preset: 'sine', n, scheme, limiter });
      advanceBurgers(s, 0.1, 0.5);
      return norm1(s.u, burgersExact(s), s.dx);
    });
    return observedOrders(errs).at(-1);
  };
  for (const sc of ['godunov', 'rusanov', 'lf', 'roe', 'upwind-nc']) {
    const p = rate(sc);
    assert.ok(p > 0.9 && p < 1.1, `${sc}: ${p}`); // measured 0.97-0.99
  }
  for (const sc of ['lw', 'lw1']) {
    const p = rate(sc);
    assert.ok(p > 1.9 && p < 2.1, `${sc}: ${p}`); // measured 2.00
  }
  for (const lim of ['vanleer', 'mc', 'minmod']) {
    const p = rate('muscl', lim);
    assert.ok(p > 1.8 && p < 2.2, `muscl/${lim}: ${p}`); // measured 1.90-2.06
  }
});

test('TVD: monotone schemes and limited MUSCL never raise total variation; unlimited MUSCL and Lax-Wendroff do', () => {
  const worstRise = (scheme, limiter, cfl, params = {}) => {
    const s = createBurgers({ preset: 'sine', n: 200, scheme, limiter, params });
    let tv = totalVariation(s.u), worst = -Infinity;
    while (s.t < 0.3) {
      stepBurgers(s, burgersDt(s, cfl));
      const t2 = totalVariation(s.u);
      worst = Math.max(worst, t2 - tv);
      tv = t2;
    }
    return worst;
  };
  for (const sc of ['godunov', 'rusanov', 'lf', 'roe-fix']) assert.ok(worstRise(sc, 'minmod', 0.9) < 1e-12, sc);
  for (const lim of ['minmod', 'vanleer', 'mc', 'superbee']) {
    assert.ok(worstRise('muscl', lim, 0.5) < 1e-12, lim);
    assert.ok(worstRise('muscl', lim, 0.5, { mean: 0.5 }) < 1e-12, `${lim} moving shock`);
  }
  // MUSCL's CFL limit is 1/2 (cflMax): above it the compressive limiters raise TV;
  // minmod tolerates up to 2/3
  assert.equal(BURGERS_SCHEMES.find((s) => s.id === 'muscl').cflMax, 0.5);
  assert.ok(Math.abs(burgersCfl('muscl') - 0.45) < 1e-15 && burgersCfl('godunov') === 0.9);
  assert.ok(worstRise('muscl', 'superbee', 0.9, { mean: 0.5 }) > 1e-3); // measured 4.5e-3
  assert.ok(worstRise('muscl', 'mc', 0.9, { mean: 0.5 }) > 1e-4); // measured 8.0e-4
  assert.ok(worstRise('muscl', 'minmod', 0.66, { mean: 0.5 }) < 1e-12);
  // the default time step of a MUSCL state respects the limit
  const d = createBurgers({ preset: 'sine', n: 200, scheme: 'muscl' });
  assert.ok(Math.abs(burgersDt(d) - (0.45 * d.dx) / maxAbs(d.u)) < 1e-15);
  assert.ok(worstRise('muscl', 'none', 0.5) > 0.1); // measured 0.32
  // a moving shock (mean 0.5): both Lax-Wendroff forms ring and raise TV
  assert.ok(worstRise('lw1', 'minmod', 0.9, { mean: 0.5 }) > 0.1); // measured 0.39
  assert.ok(worstRise('lw', 'minmod', 0.9, { mean: 0.5 }) > 0.1); // measured 0.75
});

test('sine wave: exact solution breaks at t = 1/(2 pi), then the shock dissipates energy at the rate [u]^3/12', () => {
  const tb = breakingTime(1);
  assert.ok(Math.abs(tb - 1 / (2 * Math.PI)) < 1e-15);
  // the slope at x = 1/2 is -2 pi/(1 - 2 pi t): it blows up at t_b
  for (const t of [0, 0.05, 0.1, 0.15]) {
    const h = 1e-6;
    const slope = (sineExact(0.5 + h, t) - sineExact(0.5 - h, t)) / (2 * h);
    const want = (-2 * Math.PI) / (1 - 2 * Math.PI * t);
    assert.ok(Math.abs(slope - want) / Math.abs(want) < 1e-4, `t=${t}: ${slope} vs ${want}`);
  }
  // energy integral of the exact solution: conserved before t_b, lost at the shock afterwards
  const energy = (t) => {
    let s = 0;
    const M = 4000;
    for (let i = 0; i < M; i++) s += 0.5 * sineExact((i + 0.5) / M, t) ** 2;
    return s / M;
  };
  assert.ok(Math.abs(energy(0.15) - 0.25) < 1e-9);
  const jump = (t) => 2 * sineExact(0.5 - 1e-13, t);
  const t1 = 0.2, t2 = 0.3, N = 100;
  let I = 0;
  for (let k = 0; k <= N; k++) I += (k === 0 || k === N ? 1 : k % 2 ? 4 : 2) * jump(t1 + ((t2 - t1) * k) / N) ** 3 / 12;
  I *= (t2 - t1) / (3 * N);
  assert.ok(Math.abs(energy(t2) - energy(t1) + I) / I < 1e-5, 'equal-area solution loses energy at [u]^3/12');
  // numerical schemes reproduce the dissipation rate (an entropy property, not a choice of viscosity)
  for (const [scheme, tol] of [['muscl', 0.005], ['godunov', 0.03]]) {
    const s = createBurgers({ preset: 'sine', n: 400, scheme, limiter: 'mc' });
    advanceBurgers(s, t1, 0.5);
    const e1 = burgersEnergy(s);
    advanceBurgers(s, t2, 0.5);
    const lost = e1 - burgersEnergy(s);
    assert.ok(Math.abs(lost - I) / I < tol, `${scheme}: ${lost} vs ${I}`); // measured 0.9998 and 0.981
  }
});

test('Richtmyer Lax-Wendroff blows up at a stationary shock through u = 0; the one-step 1960 form does not', () => {
  const run = (scheme) => {
    const s = createBurgers({ preset: 'stationary', n: 200, scheme });
    advanceBurgers(s, 0.4, 0.9);
    return maxAbs(s.u);
  };
  assert.ok(run('lw') > 10, 'Richtmyer: predictor gives u = 0 at the shock face, flux f(0) = 0'); // measured 59
  assert.ok(run('lw1') <= 1 + 1e-12); // the exact steady state
  assert.ok(run('godunov') <= 1 + 1e-12);
  assert.ok(run('roe') <= 1 + 1e-12);
});

test('Burgers failure guard: a blow-up is reported with cell and time, never as silent NaN', () => {
  // Richtmyer at the stationary shock: linear growth, then an explosion near t = 1.265
  const s = createBurgers({ preset: 'stationary', n: 200, scheme: 'lw' });
  const steps = advanceBurgers(s, 3, 0.9);
  assert.ok(s.failure, 'the guard trips');
  assert.equal(s.failure.reason, 'blow-up');
  assert.ok(Number.isFinite(s.failure.u) && Math.abs(s.failure.u) > 1e3, `u = ${s.failure.u}`);
  assert.ok(Math.abs(s.failure.x - 0.5) < 0.05, `x = ${s.failure.x}`); // beside the shock
  assert.ok(s.failure.t > 1.2 && s.failure.t < 1.3, `t = ${s.failure.t}`); // measured 1.2647
  assert.ok(steps < 30000, `${steps} steps`); // measured 26737; NaN would come only after ~48000
  assert.ok(s.u.every(Number.isFinite));
  const t = s.t;
  assert.equal(stepBurgers(s, 1e-3), false); // refuses to go on
  assert.equal(s.t, t);
  assert.equal(advanceBurgers(s, 4), 0);
  // with the bound switched off the guard still catches the first non-finite value
  const q = createBurgers({ preset: 'stationary', n: 200, scheme: 'lw', blowup: 0 });
  let k = 0;
  while (stepBurgers(q, 0.9 * q.dx)) k++;
  assert.equal(q.failure.reason, 'non-finite');
  assert.ok(k < 100, `${k} fixed steps`); // measured ~50
  assert.ok(!(burgersDt(q) > 0)); // NaN or 0: advanceBurgers cannot take a step either
  // reset clears the failure and the run is repeatable
  resetBurgers(q);
  assert.equal(q.failure, null);
  assert.ok(stepBurgers(q, 0.9 * q.dx));
  // no other preset and scheme trips it with the default time step
  for (const p of BURGERS_PRESETS) for (const sc of BURGERS_SCHEMES) {
    const r = createBurgers({ preset: p.id, n: 100, scheme: sc.id });
    advanceBurgers(r, p.tEnd);
    if (!(p.id === 'stationary' && sc.id === 'lw')) assert.equal(r.failure, null, `${p.id}/${sc.id}`);
  }
});

test('N-wave: shocks at x = +/- L sqrt(1 + k t) and the exact ramp between', () => {
  const s = createBurgers({ preset: 'nwave', n: 200, scheme: 'godunov' });
  const m0 = burgersMass(s);
  advanceBurgers(s, 1.5, 0.9);
  const xs = Math.sqrt(2.5);
  const level = (0.5 * xs) / 2.5; // midpoint of the jump from k xs/(1 + k t) to 0
  assert.ok(Math.abs(shockPosition(s.u, s.x, level, 0, Infinity) - xs) < s.dx);
  assert.ok(Math.abs(shockPosition(s.u, s.x, -level, -Infinity, 0) + xs) < s.dx);
  assert.ok(Math.abs(burgersMass(s) - m0) < 1e-13);
  const err = norm1(s.u, burgersExact(s), s.dx);
  assert.ok(err < 0.02, `L1 ${err}`);
  assert.equal(nwaveExact(1, 3, 1, 1), 0.25);
});

// ---------------------------------------------------------------------------
// Euler (euler1d.js)

const FIRST_ORDER = ['godunov', 'lf', 'rusanov', 'hll', 'hllc', 'roe'];

test('Euler: mass, momentum and energy are conserved to round-off in a periodic run, for every flux and order', () => {
  for (const f of EULER_FLUXES) for (const order of [1, 2]) {
    const s = createEuler({ preset: 'sod', n: 200, flux: f.id, order, bc: 'periodic', entropyFix: true });
    const a = eulerTotals(s, {});
    for (let k = 0; k < 200; k++) stepEuler(s, eulerDt(s, 0.8));
    assert.equal(s.failure, null, f.id);
    const b = eulerTotals(s, {});
    for (const q of ['mass', 'momentum', 'energy']) {
      assert.ok(Math.abs(b[q] - a[q]) < 1e-13, `${f.id}/${order} ${q}: ${b[q] - a[q]}`);
    }
  }
  // a closed box (reflective walls): mass and energy exact, momentum is not
  // conserved because the walls push on the gas
  for (const f of ['hllc', 'roe', 'godunov']) for (const order of [1, 2]) {
    const s = createEuler({ preset: 'sod', n: 200, flux: f, order, bc: 'reflective' });
    const a = eulerTotals(s, {});
    advanceEuler(s, 1.0, 0.8);
    const b = eulerTotals(s, {});
    assert.ok(Math.abs(b.mass - a.mass) < 1e-13 && Math.abs(b.energy - a.energy) < 1e-13, `${f}/${order} closed box`);
    assert.ok(Math.abs(b.momentum - a.momentum) > 1e-3);
  }
});

test('stationary contact: HLLC (and Roe, Godunov) hold it exactly; HLL, Rusanov and LF smear it', () => {
  for (const f of EULER_FLUXES.filter((f) => f.id !== 'lw')) {
    const s = createEuler({ preset: 'contact', n: 100, flux: f.id });
    advanceEuler(s, 2, 0.9);
    const ex = eulerExact(s);
    const err = Math.max(...s.rho.map((r, i) => Math.abs(r - ex.rho[i])));
    const smeared = s.rho.filter((r) => r > 1.001 && r < 1.399).length;
    if (f.holdsContact) assert.ok(err < 1e-12 && smeared === 0, `${f.id}: ${err}`);
    else assert.ok(smeared >= 20, `${f.id}: ${smeared} cells`); // measured 83-94 cells at t = 2
  }
});

test('Sod, first order: L1 density error falls under refinement at an observed rate between 0.5 and 1', () => {
  // L1 norm of rho - rho_exact (exact sampled at cell centres) at t = 0.25,
  // n = 100, 200, 400, 800. The rate is below 1 because a first-order scheme
  // smears the contact over O(sqrt(n)) cells (error ~ dx^(1/2)) while the
  // shock is held in O(1) cells (error ~ dx); measured rates 0.55-0.67.
  for (const f of FIRST_ORDER) {
    const errs = [100, 200, 400, 800].map((n) => {
      const s = createEuler({ preset: 'sod', n, flux: f, entropyFix: true });
      advanceEuler(s, 0.25, 0.9);
      return norm1(s.rho, eulerExact(s).rho, s.dx);
    });
    const p = observedOrders(errs);
    for (let k = 0; k < p.length; k++) assert.ok(p[k] > 0.5 && p[k] < 1, `${f}: rates ${p.map((v) => v.toFixed(2))}`);
  }
});

test('Sod: Richtmyer Lax-Wendroff overshoots at the shock; Godunov-type first-order schemes stay monotone there', () => {
  const ex = exactRiemann({ rho: 1, u: 0, p: 1 }, { rho: 0.125, u: 0, p: 0.1 });
  const xs = 0.5 + ex.right.speed * 0.25, jump = ex.rhoStarR - 0.125;
  const riseNearShock = (s) => {
    let r = 0;
    for (let i = 0; i + 1 < s.n; i++) if (s.x[i] > xs - 0.1 && s.x[i] < xs + 0.05) r = Math.max(r, s.rho[i + 1] - s.rho[i]);
    return r;
  };
  const lw = createEuler({ preset: 'sod', n: 200, flux: 'lw' });
  advanceEuler(lw, 0.25, 0.9);
  const over = Math.max(...lw.rho.filter((_, i) => Math.abs(lw.x[i] - xs) < 0.05)) - ex.rhoStarR;
  assert.ok(over > 0.1 * jump, `LW overshoot ${over / jump}`); // measured 0.16 of the jump
  assert.ok(riseNearShock(lw) > 0.1 * jump);
  for (const f of FIRST_ORDER) {
    const s = createEuler({ preset: 'sod', n: 200, flux: f, entropyFix: true });
    advanceEuler(s, 0.25, 0.9);
    assert.ok(riseNearShock(s) < 1e-3 * jump, `${f}: ${riseNearShock(s) / jump}`); // measured <= 5e-5
    // no new extrema anywhere, and any rise in the whole profile is a start-up
    // glitch at x0 below 0.1% of the density range (first-order schemes are
    // monotone for scalar laws, not exactly for systems)
    assert.ok(Math.max(...s.rho) <= 1 + 1e-12 && Math.min(...s.rho) >= 0.125 - 1e-12, f);
    assert.ok(maxRise(s.rho) < 1e-3 * 0.875, `${f}: ${maxRise(s.rho)}`); // measured <= 2.8e-4 (Godunov)
  }
});

test('123 problem: Roe fails positivity (with or without the entropy fix) and says where; HLL stays positive', () => {
  for (const entropyFix of [false, true]) {
    const s = createEuler({ preset: '123', n: 100, flux: 'roe', entropyFix });
    advanceEuler(s, 0.15, 0.9);
    assert.ok(s.failure, 'Roe should fail');
    // what the preset and flux descriptions say: negative pressure (not density) on step 3
    assert.equal(s.failure.reason, 'pressure <= 0');
    assert.equal(s.failure.step, 3);
    assert.ok(s.failure.rho > 0.5 && s.failure.p < -0.05, JSON.stringify(s.failure)); // rho 0.599, p -0.111
    assert.ok(Math.abs(s.failure.x - 0.5) < 0.05, `at x = ${s.failure.x}`); // cell 49
    assert.ok(Number.isFinite(s.failure.rho) && Number.isFinite(s.failure.p)); // reported, not NaN
    const t = s.t;
    assert.equal(stepEuler(s, 1e-3), false); // refuses to go on
    assert.equal(s.t, t);
  }
  for (const f of ['hll', 'hllc', 'rusanov', 'godunov', 'lf']) for (const order of [1, 2]) {
    const s = createEuler({ preset: '123', n: 100, flux: f, order });
    advanceEuler(s, 0.15, 0.9);
    assert.equal(s.failure, null, `${f}/${order}`);
    assert.ok(Math.min(...s.rho) > 0 && Math.min(...s.p) > 0);
  }
});

test('sonic rarefaction (modified Sod): Roe without a fix leaves an O(1) jump at the sonic point; Harten-Hyman removes it', () => {
  const jumpAtSonic = (n, entropyFix) => {
    const s = createEuler({ preset: 'sod-sonic', n, flux: 'roe', entropyFix });
    advanceEuler(s, 0.2, 0.9);
    return maxJump(s.rho, (x) => Math.abs(x - 0.3) < 0.05, s.x);
  };
  const a = jumpAtSonic(100, false), b = jumpAtSonic(200, false);
  assert.ok(a > 0.15 && b > 0.15, `${a} ${b}`); // 0.190, 0.187: does not shrink with dx
  const c = jumpAtSonic(100, true), d = jumpAtSonic(200, true);
  assert.ok(c < 0.06 && d < 0.6 * c, `${c} ${d}`); // 0.047, 0.025: shrinks like dx
});

test('slowly moving shock: first-order Godunov-type schemes leave momentum oscillations behind it', () => {
  // Mach 3 shock; behind it rho u should be constant. Measured over the 0.2
  // just behind the shock, as a fraction of the momentum jump across it.
  const wiggle = (S, flux) => {
    const st = shockStates(3, S);
    const s = createEuler({ preset: 'slow-shock', n: 200, flux, L: st.L, R: st.R, x0: 0.1 });
    advanceEuler(s, 0.4 / S, 0.9);
    const xs = 0.1 + S * s.t, mL = st.L.rho * st.L.u, dm = Math.abs(st.R.rho * st.R.u - mL);
    let dev = 0;
    for (let i = 0; i < s.n; i++) if (s.x[i] < xs - 0.05 && s.x[i] > xs - 0.25) dev = Math.max(dev, Math.abs(s.mom[i] - mL));
    return dev / dm;
  };
  const S = EULER_PRESETS.find((p) => p.id === 'slow-shock');
  assert.ok(Math.abs(S.L.rho - 3.857142857) < 1e-8 && Math.abs(S.R.u + 3.44) < 1e-12);
  for (const f of ['roe', 'hllc']) {
    assert.ok(wiggle(0.1096478, f) > 0.05, f); // measured 0.13
    assert.ok(wiggle(1, f) < 0.01, f); // same shock at S = 1: 3e-4
  }
});

test('smooth entropy wave: first-order fluxes converge at rate 1, Lax-Wendroff and MUSCL-Hancock at rate 2', () => {
  const rate = (flux, order, limiter = 'vanleer') => {
    const errs = [50, 100, 200].map((n) => {
      const s = createEuler({ preset: 'entropy-wave', n, flux, order, limiter });
      advanceEuler(s, 1, 0.8);
      return norm1(s.rho, eulerExact(s).rho, s.dx);
    });
    return observedOrders(errs).at(-1);
  };
  const p1 = rate('hllc', 1), pl = rate('lw', 1), p2 = rate('hllc', 2), pm = rate('roe', 2, 'mc');
  assert.ok(p1 > 0.85 && p1 < 1.1, `first order ${p1}`); // 0.95
  assert.ok(pl > 1.9 && pl < 2.1, `LW ${pl}`); // 2.00
  assert.ok(p2 > 1.9 && p2 < 2.3, `MUSCL-Hancock ${p2}`); // 2.10
  assert.ok(pm > 1.9 && pm < 2.3, `MUSCL-Hancock MC ${pm}`);
});

test('smooth sound wave: exact simple-wave solution, and second order for the coupled (rho, u, p) update', () => {
  // the exact solution: a right-going simple wave, so the left Riemann
  // invariant u - 2a/(gamma-1) and the entropy p/rho^gamma stay constant,
  // and it reproduces the initial data at t = 0
  const tb = simpleWaveBreakingTime();
  assert.ok(tb > 1.1 && tb < 1.13, `breaking time ${tb}`); // 1.117
  const w = { rho: 0, u: 0, p: 0 }, a0 = Math.sqrt(G);
  for (const t of [0, 0.4, 1]) for (let k = 0; k < 20; k++) {
    const x = k / 20;
    simpleWaveExact(x, t, w);
    const a = Math.sqrt((G * w.p) / w.rho);
    assert.ok(Math.abs(w.u - (2 * a) / (G - 1) + (2 * a0) / (G - 1)) < 1e-13 && Math.abs(w.p / w.rho ** G - 1) < 1e-13);
    if (t === 0) assert.ok(Math.abs(w.rho - 1 - ACOUSTIC_EPS * Math.sin(2 * Math.PI * x)) < 1e-13);
    // the state at x came from the foot xi = x - (u + a) t, which carries the same density
    const xi = x - (w.u + a) * t;
    assert.ok(Math.abs(w.rho - 1 - ACOUSTIC_EPS * Math.sin(2 * Math.PI * xi)) < 1e-12, `characteristic at t=${t}`);
  }
  // L1 errors of rho, u and p against it at t = 0.4, n = 50..400. Measured:
  // first order 1.01; Richtmyer 2.01; MUSCL-Hancock 2.03-2.11 (unlimited,
  // van Leer) for every flux. Dropping any coupling term of the predictor
  // (r du, dp/r or gamma p du) gives rates of 1.0-1.2 or a blow-up.
  const rates = (flux, order, limiter) => {
    const e = { rho: [], u: [], p: [] };
    for (const n of [50, 100, 200, 400]) {
      const s = createEuler({ preset: 'acoustic-wave', n, flux, order, limiter });
      advanceEuler(s, 0.4, 0.8);
      assert.equal(s.failure, null);
      const ex = eulerExact(s);
      for (const k of ['rho', 'u', 'p']) e[k].push(norm1(s[k], ex[k], s.dx));
    }
    return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, observedOrders(v).slice(1)]));
  };
  const within = (r, lo, hi, label) => {
    for (const k of ['rho', 'u', 'p']) for (const p of r[k]) assert.ok(p > lo && p < hi, `${label} ${k}: ${r[k].map((v) => v.toFixed(2))}`);
  };
  within(rates('hllc', 1, 'minmod'), 0.9, 1.1, 'first order');
  within(rates('lw', 1, 'minmod'), 1.9, 2.1, 'Richtmyer');
  for (const flux of ['hllc', 'roe', 'rusanov']) for (const lim of ['none', 'vanleer']) {
    within(rates(flux, 2, lim), 1.9, 2.3, `MUSCL-Hancock ${flux}/${lim}`);
  }
});

test('Euler CFL limit: every flux, first and second order, is stable at C = 0.95 and breaks down by C = 1.3', () => {
  // acoustic wave to t = 1 (it breaks at 1.12), n = 200; error is max|u - u_exact|.
  // Measured: C = 0.95 gives 3e-3 to 3.1e-2; C = 1.3 fails positivity within
  // 30-370 steps, except Lax-Friedrichs, which grows to an O(1) error (1.2).
  for (const f of EULER_FLUXES) {
    assert.equal(f.cflMax, 1, f.id);
    for (const order of [1, 2]) {
      const run = (cfl) => {
        const s = createEuler({ preset: 'acoustic-wave', n: 200, flux: f.id, order, limiter: 'vanleer' });
        advanceEuler(s, 1, cfl);
        if (s.failure) return Infinity;
        const ex = eulerExact(s).u;
        return Math.max(...s.u.map((v, i) => Math.abs(v - ex[i])));
      };
      const ok = run(0.95), bad = run(1.3);
      assert.ok(ok < 0.05, `${f.id}/${order} at 0.95: ${ok}`);
      assert.ok(bad > 0.5, `${f.id}/${order} at 1.3: ${bad}`);
    }
  }
});

test('resetEuler recomputes the exact solution after the states are edited', () => {
  const L = { rho: 1, u: 0, p: 10 };
  const edited = createEuler({ preset: 'sod', n: 200, flux: 'hllc' });
  edited.L = L;
  resetEuler(edited);
  const fresh = createEuler({ preset: 'sod', n: 200, flux: 'hllc', L });
  for (const s of [edited, fresh]) advanceEuler(s, 0.1, 0.9);
  assert.equal(edited.exact.pStar, exactRiemann(L, fresh.R).pStar);
  const err = (s) => norm1(s.p, eulerExact(s).p, s.dx);
  assert.equal(err(edited), err(fresh));
  assert.ok(err(edited) < 0.2, `${err(edited)}`); // measured 0.087 (a stale Sod exact gave 3.9)
  // gamma and x0 too
  const g = createEuler({ preset: 'sod', n: 100 });
  g.gamma = 5 / 3; g.x0 = 0.4;
  resetEuler(g);
  const ref = exactRiemann(g.L, g.R, { gamma: 5 / 3 });
  assert.equal(g.exact.pStar, ref.pStar);
  assert.equal(g.exact.gamma, 5 / 3);
  // switching to a preset without a Riemann solution drops it
  g.preset = 'acoustic-wave';
  resetEuler(g);
  assert.equal(g.exact, null);
  assert.ok(eulerExact(g));
});

test('Shu-Osher: second order resolves the entropy waves that first order smears away (fine-grid reference)', () => {
  const ref = drain(eulerReference('shu-osher', 1600));
  assert.equal(ref.failure, null);
  const coarse = (n) => {
    const r = 1600 / n, out = new Float64Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < r; k++) s += ref.rho[i * r + k]; out[i] = s / r; }
    return out;
  };
  const tvBehind = (rho, x) => {
    let s = 0;
    for (let i = 0; i + 1 < rho.length; i++) if (x[i] > 0.5 && x[i] < 2.2) s += Math.abs(rho[i + 1] - rho[i]);
    return s;
  };
  const n = 400;
  const runs = {};
  let x = null;
  for (const [key, order, limiter] of [['first', 1, 'minmod'], ['mc', 2, 'mc']]) {
    const s = createEuler({ preset: 'shu-osher', n, flux: 'hllc', order, limiter });
    advanceEuler(s, 1.8, 0.8);
    assert.equal(s.failure, null);
    runs[key] = { L1: norm1(s.rho, coarse(n), s.dx), tv: tvBehind(s.rho, s.x) };
    x = s.x;
  }
  const tvRef = tvBehind(coarse(n), x);
  assert.ok(runs.first.tv < 0.2 * tvRef, `first order keeps ${runs.first.tv / tvRef}`); // 0.12
  assert.ok(runs.mc.tv > 0.4 * tvRef, `MUSCL keeps ${runs.mc.tv / tvRef}`); // 0.49
  assert.ok(runs.mc.L1 < 0.6 * runs.first.L1);
});

test('metadata: every TeX string parses and every preset initialises with positive density and pressure', () => {
  for (const m of [...BURGERS_SCHEMES, ...LIMITERS, ...EULER_FLUXES, ...GUESSES, ...WAVE_SPEEDS]) if (m.tex) tex(m.tex);
  // every scheme states its stability condition and order; every formula the lessons show is there
  for (const m of [...BURGERS_SCHEMES, ...EULER_FLUXES]) {
    assert.ok(typeof m.stability === 'string' && m.cflMax > 0 && m.order >= 1, m.id);
  }
  for (const m of [...BURGERS_SCHEMES, ...LIMITERS, ...EULER_FLUXES, ...GUESSES, ...WAVE_SPEEDS]) assert.ok(m.tex, `${m.id} tex`);
  for (const p of EULER_PRESETS) {
    const s = createEuler({ preset: p.id });
    assert.equal(s.failure, null, p.id);
    if (p.exact) assert.ok(eulerExact(s), p.id);
  }
  for (const p of BURGERS_PRESETS) {
    const s = createBurgers({ preset: p.id });
    const ex = burgersExact(s);
    assert.ok(ex.every(Number.isFinite) && s.u.every(Number.isFinite), p.id);
  }
  assert.equal(burgersRiemann(1, 0, 0.49), 1);
  assert.equal(burgersRiemann(-1, 1, 0.3), 0.3);
});
