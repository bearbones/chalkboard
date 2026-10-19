// Chapter 9 (stiffness): the claims its prose, figures and gallery entries
// make, measured on the kernels the figures run (src/sims/diffusion.js,
// src/sims/stiff.js and the chapter's own src/sims/ch-stiffness-richardson.js).
// Claims already covered by sims-stiffness.test.js (FTCS r = 0.52 blow-up,
// CN ringing at r = 10, Du Fort–Frankel demos, stiff demos, Péclet demos) are
// not repeated; these are the extra numbers the chapter quotes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { totalVariation, observedOrders } from '../../aids/fluid-course/src/sims/util.js';
import { createHeat, step as heatStep, dtForR, fillExact, HEAT_DEMOS, heatDemoDt, thomas, assembleHeat, amplification, createAdvDiff, solveAdvDiff } from '../../aids/fluid-course/src/sims/diffusion.js';
import { stiffnessRatio, heatExplicitLimit, createProblem, createIntegrator, step as odeStep, fillExact as odeExact, maxStableStep, stabilityValue } from '../../aids/fluid-course/src/sims/stiff.js';
import { richardsonRoots, richardsonAmplification, richardsonStep, chapterHeatStep, heatRefinementStudy, dufortFrankelModulus, RICHARDSON } from '../../aids/fluid-course/src/sims/ch-stiffness-richardson.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const maxErr = (s) => {
  fillExact(s);
  let e = 0;
  for (let j = 0; j < s.len; j++) e = Math.max(e, Math.abs(s.u[j] - s.exact[j]));
  return e;
};
const tvDirichlet = (s) => totalVariation(s.u, false);
const runHeat = (preset, scheme, n, r, steps, extra = {}) => {
  const s = createHeat({ n, preset });
  const dt = dtForR(s, r);
  for (let k = 0; k < steps; k++) heatStep(s, { scheme, dt, ...extra });
  return s;
};

// ---------------------------------------------------------------- Richardson's leapfrog

test('Richardson roots: product -1, sum -8 r sin^2(xi/2); the larger modulus exceeds 1 for every r > 0', () => {
  for (const r of [1e-3, 0.01, 0.1, 0.25, 0.5, 1, 10]) {
    for (const xi of [0.1, 1, 2, Math.PI]) {
      const { g1, g2 } = richardsonRoots(xi, r);
      close(g1 * g2, -1, 1e-12, `product at r=${r}, xi=${xi}`);
      close(g1 + g2, -8 * r * Math.sin(xi / 2) ** 2, 1e-12, `sum at r=${r}, xi=${xi}`);
      const big = richardsonAmplification(xi, r);
      close(big, Math.max(Math.abs(g1), Math.abs(g2)), 1e-12, 'amplification is the larger modulus');
      assert.ok(big > 1, `|G| > 1 at r=${r}, xi=${xi}`);
    }
  }
  close(richardsonAmplification(Math.PI, 1), 4 + Math.sqrt(17), 1e-12, 'r = 1 shortest wave: 4 + sqrt 17 ≈ 8.12');
  close(richardsonAmplification(Math.PI, 0.1), 0.4 + Math.sqrt(1.16), 1e-12, 'r = 0.1: 1.477');
  for (const k of ['tex', 'texG', 'stability']) assert.doesNotThrow(() => tex(RICHARDSON[k]), k);
});

test('one Richardson step maps a periodic Fourier mode pair (u^{n-1}, u^n) by the scheme', () => {
  // On a periodic grid, put u^{n-1} = sin(k x) and u^n = g sin(k x) with g a
  // root: the next level must be g^2 sin(k x).
  const n = 32;
  const r = 0.3;
  for (const m of [1, 5, 15]) {
    const xi = (2 * Math.PI * m) / n;
    const { g1, g2 } = richardsonRoots(xi, r);
    for (const g of [g1, g2]) {
      const s = createHeat({ n, preset: 'periodic-sine' });
      const dt = dtForR(s, r);
      for (let j = 0; j < n; j++) {
        s.uPrev[j] = Math.sin(xi * j);
        s.u[j] = g * Math.sin(xi * j);
      }
      s.steps = 1;
      s.lastDt = dt;
      richardsonStep(s, dt);
      for (let j = 0; j < n; j++) close(s.u[j], g * g * Math.sin(xi * j), 1e-12, `mode ${m}, root ${g}`);
    }
  }
});

test('Richardson blows up at every r tried, at the rate of its largest root', () => {
  const n = 20;
  for (const r of [1, 0.25, 0.1]) {
    const s = createHeat({ n, preset: 'sine' });
    const dt = dtForR(s, r);
    let k = 0;
    while (k < 3000 && Math.abs(s.u[n >> 1]) < 1e10) {
      richardsonStep(s, dt);
      k++;
    }
    assert.ok(Math.abs(s.u[n >> 1]) >= 1e10, `r = ${r} blows up (after ${k} steps)`);
  }
  // growth per step late in the run: the largest root on this grid, xi = 19 pi / 20
  const s = createHeat({ n, preset: 'sine' });
  const dt = dtForR(s, 0.25);
  let prev = 0;
  let ratio = 0;
  for (let k = 0; k < 80; k++) {
    richardsonStep(s, dt);
    let m = 0;
    for (const v of s.u) m = Math.max(m, Math.abs(v));
    if (k === 79) ratio = m / prev;
    prev = m;
  }
  close(ratio, richardsonAmplification((19 * Math.PI) / 20, 0.25), 0.02, 'late growth per step at r = 1/4');
});

test('chapterHeatStep dispatches to the shared kernel for the other schemes', () => {
  const a = createHeat({ n: 20, preset: 'step' });
  const b = createHeat({ n: 20, preset: 'step' });
  const dt = dtForR(a, 2);
  for (let k = 0; k < 5; k++) {
    chapterHeatStep(a, 'dufort-frankel', dt);
    heatStep(b, { scheme: 'dufort-frankel', dt });
  }
  assert.deepEqual(Array.from(a.u), Array.from(b.u));
});

test('refinement study: Du Fort–Frankel with dt = dx/2 gets worse as n grows; with r = 1 it converges at order 2', () => {
  const ns = [10, 20, 40, 80, 160];
  const fixedC = [...heatRefinementStudy({ scheme: 'dufort-frankel', path: 'dt/dx', c: 0.5, ns })];
  const errs = fixedC.map((x) => x.error);
  for (let k = 1; k < errs.length; k++) assert.ok(errs[k] > errs[k - 1], `error grows with n: ${errs}`);
  assert.ok(errs[0] > 0.49 && errs.at(-1) < 0.71, `errors between 0.49 and 0.71: ${errs}`);
  // the n = 40 entry is the gallery demo (HEAT_DEMOS broken side)
  close(fixedC[2].error, 0.6522, 5e-4, 'n = 40, dt = dx/2 error');
  const rec = HEAT_DEMOS['dufort-frankel-inconsistency'].broken;
  const s = createHeat({ n: rec.n, preset: rec.preset });
  const dt = heatDemoDt(s, rec);
  for (let k = 0; k < rec.steps; k++) heatStep(s, { scheme: rec.scheme, dt });
  close(maxErr(s), fixedC[2].error, 1e-12, 'study and demo recipe agree');
  // amplitude swings negative, towards the telegraph value -0.574
  assert.ok(fixedC.at(-1).amplitude < -0.55, `amplitude at n = 160: ${fixedC.at(-1).amplitude}`);
  close(fixedC[0].exactAmplitude, Math.exp(-(Math.PI ** 2) * 0.2), 1e-12, 'heat amplitude 0.139');
  const fixedR = [...heatRefinementStudy({ scheme: 'dufort-frankel', path: 'r', r: 1, ns })];
  const orders = observedOrders(fixedR.map((x) => x.error));
  for (const p of orders) close(p, 2, 0.05, `order on the r = 1 path (${orders})`);
  close(fixedR[2].error, 1.551e-3, 5e-6, 'n = 40, r = 1 error');
});

test('refinement study: Richardson blows up on both paths once the grid is fine enough', () => {
  const ns = [10, 20, 40, 80, 160];
  const a = [...heatRefinementStudy({ scheme: 'richardson', path: 'r', r: 1, ns })];
  assert.deepEqual(a.map((x) => x.blewUp), [false, true, true, true, true]);
  const b = [...heatRefinementStudy({ scheme: 'richardson', path: 'dt/dx', c: 0.5, ns })];
  assert.ok(b.slice(2).every((x) => x.blewUp), 'n >= 40 blows up with dt = dx/2');
  for (const x of [...a, ...b]) if (x.blewUp) assert.equal(x.error, Infinity);
});

test('Du Fort–Frankel never amplifies; its modulus helper matches the shared amplification', () => {
  for (const r of [0.1, 0.5, 1, 10, 100])
    for (let k = 0; k <= 50; k++) {
      const xi = (k * Math.PI) / 50;
      const g = dufortFrankelModulus(xi, r);
      assert.ok(g <= 1 + 1e-12, `|G| <= 1 at r=${r}`);
      close(g, amplification('dufort-frankel', xi, r), 1e-12, 'matches diffusion.js');
    }
});

// ---------------------------------------------------------------- heat equation numbers in the prose

test('Crank–Nicolson on the n = 50 step: no new total variation up to r = 4, new wiggles from r = 4.05', () => {
  for (const r of [0.5, 1, 2, 3, 4]) {
    const s = runHeat('step', 'cn', 50, r, 1);
    close(tvDirichlet(s), 1, 1e-9, `TV after one step at r = ${r}`);
  }
  for (const [r, tv] of [
    [4.5, 1.078],
    [10, 1.567],
  ]) {
    const s = runHeat('step', 'cn', 50, r, 1);
    close(tvDirichlet(s), tv, 1e-3, `TV after one step at r = ${r}`);
  }
  assert.ok(tvDirichlet(runHeat('step', 'cn', 50, 4.05, 1)) > 1.005, 'r = 4.05 already overshoots');
  close(amplification('cn', Math.PI, 10), -19 / 21, 1e-15, 'G(pi) at r = 10');
});

test('cures for CN ringing at r = 10 on the step: Rannacher start-up, theta = 0.95, backward Euler', () => {
  const n = 50;
  const steps = 12;
  // CN alone
  const cn = runHeat('step', 'cn', n, 10, steps);
  close(maxErr(cn), 1.995e-2, 2e-4, 'CN error after 12 steps');
  // backward Euler
  const be = runHeat('step', 'btcs', n, 10, steps);
  close(maxErr(be), 7.02e-3, 1e-4, 'BE error after 12 steps');
  close(tvDirichlet(be), 1, 1e-9, 'BE monotone');
  // Rannacher: two BE half steps, then CN
  const s = createHeat({ n, preset: 'step' });
  const dt = dtForR(s, 10);
  heatStep(s, { scheme: 'btcs', dt: dt / 2 });
  heatStep(s, { scheme: 'btcs', dt: dt / 2 });
  let tvMax = tvDirichlet(s);
  for (let k = 0; k < steps - 1; k++) {
    heatStep(s, { scheme: 'cn', dt });
    tvMax = Math.max(tvMax, tvDirichlet(s));
  }
  close(s.t, 12 * dt, 1e-12, 'same end time as 12 full steps');
  close(tvMax, 1, 1e-9, 'Rannacher keeps TV = 1');
  assert.ok(maxErr(s) < 2e-4, `Rannacher error ${maxErr(s)} is 40 times below BE's`);
  // theta method: 0.6 still rings, 0.95 does not (maximum principle needs theta >= 1 - 1/(2r))
  close(tvDirichlet(runHeat('step', 'theta', n, 10, 1, { theta: 0.6 })), 1.2222, 1e-3, 'theta = 0.6 overshoots');
  close(tvDirichlet(runHeat('step', 'theta', n, 10, 1, { theta: 0.95 })), 1, 1e-9, 'theta = 0.95 monotone');
});

test('accuracy: backward Euler with dt = 0.01 lands at 0.390 for sin(pi x) at t = 0.1; Crank–Nicolson at 0.3725; exact 0.3727', () => {
  const be = runHeat('sine', 'btcs', 50, 0.01 * 2500, 10);
  const cn = runHeat('sine', 'cn', 50, 0.01 * 2500, 10);
  close(be.t, 0.1, 1e-12, 'time');
  close(be.u[25], 0.3903, 1e-4, 'BE');
  close(cn.u[25], 0.3725, 1e-4, 'CN');
  close(Math.exp(-(Math.PI ** 2) * 0.1), 0.3727, 1e-4, 'exact');
});

test('cost table: FTCS at r = 1/2 needs 0.2 n^2 steps to reach t = 0.1; CN with dt = 0.005 needs 20, at comparable error', () => {
  const want = {
    50: { steps: 500, ftcs: 2.42e-4, cn: 4.64e-5 },
    100: { steps: 2000, ftcs: 6.05e-5, cn: 4.44e-5 },
    200: { steps: 8000, ftcs: 1.51e-5, cn: 6.71e-5 },
  };
  for (const n of [50, 100, 200]) {
    const s = createHeat({ n, preset: 'sine' });
    const dt = dtForR(s, 0.5);
    const N = Math.round(0.1 / dt);
    assert.equal(N, want[n].steps);
    for (let k = 0; k < N; k++) heatStep(s, { scheme: 'ftcs', dt });
    close(maxErr(s), want[n].ftcs, 0.01 * want[n].ftcs, `FTCS n = ${n}`);
    const c = createHeat({ n, preset: 'sine' });
    for (let k = 0; k < 20; k++) heatStep(c, { scheme: 'cn', dt: 0.005 });
    close(maxErr(c), want[n].cn, 0.01 * want[n].cn, `CN n = ${n}`);
  }
});

test('Thomas: 8m - 7 flops, counted per traced operation (2, 6 ... 6, 5 forward; 0, 2 ... 2 back)', () => {
  for (const n of [3, 10, 50]) {
    const s = createHeat({ n, preset: 'step' });
    assembleHeat(s, { scheme: 'btcs', dt: dtForR(s, 2) });
    const m = s.m;
    let flops = 0;
    let ops = 0;
    for (const e of thomas(s.lower, s.diag, s.upper, s.rhs, { x: s.sol, cp: s.cp, dp: s.dp })) {
      if (e.t !== 'op') continue;
      ops++;
      if (e.op === 'eliminate') flops += e.row === 0 ? 2 : e.row < m - 1 ? 6 : 5;
      else flops += e.row === m - 1 ? 0 : 2;
    }
    assert.equal(ops, 2 * m);
    assert.equal(flops, 8 * m - 7, `m = ${m}`);
  }
});

// ---------------------------------------------------------------- stiffness numbers

test('method of lines: stiffness ratio about 1012 at n = 50; explicit limits match r <= 1/2', () => {
  close(stiffnessRatio(50), 1012.5, 0.1, 'n = 50');
  close(stiffnessRatio(16), 103.1, 0.1, 'n = 16');
  close(heatExplicitLimit(16), 1.9721e-3, 1e-7, 'n = 16 explicit Euler limit');
  close(heatExplicitLimit(50), 2.002e-4, 1e-7, 'n = 50 explicit Euler limit');
  close(maxStableStep('rk4', -1000), 2.7853e-3, 1e-7, 'RK4 at lambda = -1000');
  close(maxStableStep('euler', -1000), 2e-3, 1e-12, 'Euler at lambda = -1000');
});

test('Prothero–Robinson: RK4 is stable at h = 0.0027 and blows up at 0.0028; trapezoid keeps a y0 = 2 transient', () => {
  const run = (params, method, h, tEnd) => {
    const st = createIntegrator(createProblem('prothero-robinson', params), { method });
    let e = 0;
    for (let k = 0; k < Math.round(tEnd / h); k++) {
      odeStep(st, { h });
      odeExact(st);
      e = Math.max(e, Math.abs(st.y[0] - st.exact[0]));
    }
    return { e, st };
  };
  assert.ok(run({}, 'rk4', 0.0027, 2).e < 1e-4, 'RK4 at 0.0027');
  assert.ok(run({}, 'rk4', 0.0028, 2).e > 100, 'RK4 at 0.0028');
  const tr = run({ y0: 2 }, 'trapezoid', 0.1, 1).st;
  odeExact(tr);
  close(tr.y[0] - tr.exact[0], (-49 / 51) ** 10, 1e-5, 'trapezoid transient after 10 steps is (-49/51)^10 = 0.670');
  close(stabilityValue('trapezoid', -100, 0).re, -49 / 51, 1e-15, 'R(-100)');
  close(stabilityValue('implicit-euler', -100, 0).re, 1 / 101, 1e-15, 'implicit Euler R(-100)');
});

// ---------------------------------------------------------------- Péclet numbers

test('central differencing at P = 4: the nodes next to the outflow are exactly (-1/3)^k; refining to P = 1.6 cuts the error 3.9 times', () => {
  const s = createAdvDiff(20);
  solveAdvDiff(s, { a: 80, kappa: 1, scheme: 'central' });
  for (let k = 1; k <= 6; k++) close(s.u[20 - k], (-1 / 3) ** k, 2e-6, `node ${20 - k}`);
  const fine = createAdvDiff(50);
  solveAdvDiff(fine, { a: 80, kappa: 1, scheme: 'central' });
  const err = (st) => Math.max(...Array.from(st.u, (v, j) => Math.abs(v - st.exact[j])));
  close(err(s) / err(fine), 3.87, 0.01, 'error ratio');
  close(err(s), 0.3516, 1e-4, 'coarse error');
  const up = createAdvDiff(20);
  solveAdvDiff(up, { a: 40, kappa: 1, scheme: 'upwind' });
  close(err(up), 0.198, 1e-3, 'upwind at P = 2');
});
