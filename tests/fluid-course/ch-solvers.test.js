// Chapter 11 (solvers): the claims its prose, figures, quizzes and gallery
// entries make, measured on the kernels the figures run (src/sims/poisson.js,
// stablefluids.js and the chapter's own ch-solvers-direct.js and
// ch-solvers-krylov.js), at the figures' own settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { POISSON_PRESETS, jacobi, gaussSeidel, redBlackGS, sor, cg, pcg, mgpcg, multigrid, residual, sorOptimalOmega, jacobiSpectralRadius, jacobiModeFactor, modeFactors1d, smooth1d, SMOOTHING_PRESETS } from '../../aids/fluid-course/src/sims/poisson.js';
import { createFluid, createPreset, addCircle, setScalar, step, maxFaceSpeed } from '../../aids/fluid-course/src/sims/stablefluids.js';
import { rng } from '../../aids/fluid-course/src/sims/util.js';
import { fillStats, orderCells, poissonDense, cholesky } from '../../aids/fluid-course/src/sims/ch-solvers-direct.js';
import { quadratic2, spdMatrix, solveDense, steepestDescent, conjugateGradient, sdRate, cgBound, worstStart2 } from '../../aids/fluid-course/src/sims/ch-solvers-krylov.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const rel = (a, b, r, msg) => assert.ok(Math.abs(a - b) <= r * Math.abs(b), `${msg}: ${a} vs ${b} (rel ${r})`);
const drain = (gen) => {
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
};
const box = (n) => POISSON_PRESETS['closed-box'].make(n, n, 1);
const iters = (gen) => {
  const r = drain(gen);
  assert.ok(r.converged, 'solver converged');
  return r.iters;
};
const slope = (ns, ys) => {
  const X = ns.map(Math.log);
  const Y = ys.map(Math.log);
  const mx = X.reduce((a, b) => a + b) / X.length;
  const my = Y.reduce((a, b) => a + b) / Y.length;
  let s = 0;
  let t = 0;
  X.forEach((x, i) => {
    s += (x - mx) * (Y[i] - my);
    t += (x - mx) ** 2;
  });
  return s / t;
};

// ------------------------------------------------------------ direct kernel

test('direct kernel: L Lᵀ reproduces A in both numberings, and nested dissection is a permutation', () => {
  for (const order of ['lex', 'nested']) {
    const n = 7;
    const s = fillStats(n, order);
    const { N, A, L } = s;
    let err = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j <= i; j++) {
        let v = 0;
        for (let k = 0; k <= j; k++) v += L[i * N + k] * L[j * N + k];
        err = Math.max(err, Math.abs(v - A[i * N + j]));
      }
    }
    assert.ok(err < 1e-13, `${order}: max |LLᵀ − A| = ${err}`);
    const perm = orderCells(n, order);
    assert.deepEqual([...perm].sort((a, b) => a - b), [...Array(n * n).keys()], `${order}: perm is a permutation`);
  }
  const { A, N } = poissonDense(3);
  assert.throws(() => {
    A[0] = -1;
    cholesky(A, N);
  }, /positive definite/);
});

test('the-system: banded Cholesky fills the band (N·n), nested dissection fills less (solvers-fill, q1)', () => {
  const lex = { 4: [67, 119], 8: [519, 1967], 12: [1739, 10087], 16: [4111, 32095], 20: [8019, 78679], 24: [13847, 163599] };
  const nes = { 4: [60, 93], 8: [422, 1372], 12: [1258, 5938], 16: [2702, 16723], 20: [4867, 36991], 24: [7690, 68360] };
  for (const n of [4, 8, 12, 16, 20, 24]) {
    const l = fillStats(n, 'lex');
    const d = fillStats(n, 'nested');
    assert.equal(l.nnzL, lex[n][0], `lex nnzL n=${n}`);
    assert.equal(l.flops, lex[n][1], `lex flops n=${n}`);
    assert.equal(d.nnzL, nes[n][0], `nested nnzL n=${n}`);
    assert.equal(d.flops, nes[n][1], `nested flops n=${n}`);
    // Fill sits inside the band: close to N·n (exact band fill plus the diagonal).
    if (n >= 8) rel(l.nnzL, n ** 3, 0.015, `lex nnzL ≈ N·n at n=${n}`);
    assert.ok(d.nnzL < l.nnzL, 'nested fills less');
  }
  assert.equal(fillStats(24, 'lex').nnzA, 1680, 'lower half of A at n = 24');
  // Multiply–adds grow like n⁴/2 row by row.
  rel(fillStats(24, 'lex').flops, 24 ** 4 / 2, 0.02, 'lex flops ≈ n⁴/2');
  const ns = [8, 12, 16, 20, 24];
  const sl = slope(ns, ns.map((n) => fillStats(n, 'lex').nnzL));
  const sn = slope(ns, ns.map((n) => fillStats(n, 'nested').nnzL));
  close(sl, 3, 0.05, 'lex fill grows like n³');
  assert.ok(sn < sl - 0.3, `nested grows more slowly: ${sn} vs ${sl}`);
});

// ------------------------------------------------------------ relaxation

test('relaxation: sweeps to 1e-6 on the 16² Dirichlet problem (Jacobi 564, GS 265, red–black 264)', () => {
  const { op, b } = POISSON_PRESETS['model-dirichlet'].make(16, 16, 1);
  assert.equal(iters(jacobi(op, b, { omega: 1, tol: 1e-6, maxIter: 5000 })), 564);
  assert.equal(iters(gaussSeidel(op, b, { tol: 1e-6, maxIter: 5000 })), 265);
  assert.equal(iters(redBlackGS(op, b, { tol: 1e-6, maxIter: 5000 })), 264);
  close(jacobiSpectralRadius(op), 0.9808, 1e-4, 'ρ_J Dirichlet 16');
  close(sorOptimalOmega(op), 1.6735, 1e-4, 'ω_opt Dirichlet 16');
});

test('relaxation: after 10 GS sweeps on the 16² box the residual is 0.13 but the error 0.79 (solvers-sweep, q2)', () => {
  const { op, b } = box(16);
  const ex = drain(mgpcg(op, b, { tol: 1e-14 })).x;
  const x = new Float64Array(op.n);
  const r = drain(gaussSeidel(op, b, { x, tol: 0, maxIter: 10 }));
  const res = r.residuals.at(-1);
  let mx = 0;
  let me = 0;
  for (let c = 0; c < op.n; c++) {
    mx += x[c] / op.n;
    me += ex[c] / op.n;
  }
  let s = 0;
  let s0 = 0;
  for (let c = 0; c < op.n; c++) {
    s += (x[c] - mx - (ex[c] - me)) ** 2;
    s0 += (ex[c] - me) ** 2;
  }
  close(res, 0.134, 0.005, 'relative residual after 10 GS sweeps');
  close(Math.sqrt(s / s0), 0.794, 0.01, 'relative error after 10 GS sweeps');
});

test('relaxation: plain Jacobi leaves the closed-box checkerboard alone; ω = 0.8 does not', () => {
  const { op, b } = box(16);
  const r1 = drain(jacobi(op, b, { omega: 1, tol: 0, maxIter: 200 })).residuals.at(-1);
  const r8 = drain(jacobi(op, b, { omega: 0.8, tol: 0, maxIter: 200 })).residuals.at(-1);
  close(r1, 0.0735, 0.002, 'ω = 1 after 200 sweeps');
  close(r8, 0.0258, 0.002, 'ω = 0.8 after 200 sweeps');
  // The checkerboard: interior cells see four neighbours of the opposite sign.
  const n = 16;
  const x = new Float64Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) x[i + j * n] = (i + j) % 2 ? 1 : -1;
  const c = 5 + 5 * n;
  const avg = (x[c - 1] + x[c + 1] + x[c - n] + x[c + n]) / 4;
  assert.equal(avg, -x[c]);
});

test('relaxation: SOR at Young\'s ω on the closed box (solvers-sor), its optimum, overshoot and divergence', () => {
  const run = (op, b, omega, maxIter = 3000) => {
    const g = sor(op, b, { omega, tol: 1e-6, maxIter, history: false });
    let k = 0;
    let last;
    for (;;) {
      const r = g.next();
      if (r.done) return { ...r.value, k, last };
      last = r.value.residual;
      k++;
      if (last > 1e6) return { converged: false, k, last };
    }
  };
  const { op, b } = box(16);
  close(jacobiSpectralRadius(op), 0.9904, 1e-4, 'ρ_J box 16');
  close(sorOptimalOmega(op), 1.757, 5e-4, 'ω_opt box 16');
  assert.equal(run(op, b, sorOptimalOmega(op)).iters, 59);
  assert.equal(iters(gaussSeidel(op, b, { tol: 1e-6, maxIter: 5000 })), 561);
  assert.equal(run(op, b, 1.95).iters, 274);
  let best = [0, Infinity];
  for (let w = 0.5; w <= 1.981; w += 0.02) {
    const r = run(op, b, w);
    if (r.converged && r.iters < best[1]) best = [w, r.iters];
  }
  close(best[0], 1.76, 0.011, 'measured best ω');
  assert.equal(best[1], 59);
  const d = run(op, b, 2.05);
  assert.ok(!d.converged && d.last > 1e6, 'ω = 2.05 diverges');
  const s2 = run(op, b, 2.0);
  assert.ok(!s2.converged, 'ω = 2 does not converge');
  const big = box(32);
  close(sorOptimalOmega(big.op), 1.8703, 1e-4, 'ω_opt box 32');
});

test('relaxation: κ of the closed-box matrix is about 207 at 16² and 13,280 at 128² (11.4)', () => {
  // Neumann eigenvalues of the h²-scaled matrix: 4 sin²(jπ/2n) + 4 sin²(kπ/2n).
  for (const [n, want] of [[16, 206.2], [128, 13279]]) {
    const lmin = 4 * Math.sin(Math.PI / (2 * n)) ** 2;
    const lmax = 8 * Math.sin(((n - 1) * Math.PI) / (2 * n)) ** 2;
    rel(lmax / lmin, want, 0.001, `κ at n = ${n}`);
    // The Jacobi estimate (1 + ρ_J)/(1 − ρ_J) agrees to within 1%.
    const rho = jacobiSpectralRadius(box(n).op);
    rel((1 + rho) / (1 - rho), want, 0.01, `κ from ρ_J at n = ${n}`);
  }
});

// ------------------------------------------------------------ smoothing

test('smoothing: the 1-D mode factors (11.6) and the sweeps they imply (solvers-modes, q3)', () => {
  const n = 31;
  close(jacobiModeFactor(1, n, 2 / 3), 0.99679, 1e-5, 'λ1 at ω = 2/3');
  const tenfold = (lam) => Math.round(Math.log(10) / -Math.log(lam));
  assert.equal(tenfold(jacobiModeFactor(1, 15, 2 / 3)), 179);
  assert.equal(tenfold(jacobiModeFactor(1, 31, 2 / 3)), 716);
  assert.equal(tenfold(jacobiModeFactor(1, 63, 2 / 3)), 2866);
  close(jacobiModeFactor(n, n, 1), -0.9952, 1e-4, 'sawtooth at ω = 1');
  close(jacobiModeFactor(n, n, 1) ** 10, 0.953, 0.002, 'sawtooth left after 10 plain Jacobi sweeps (q3)');
  for (let k = 16; k <= n; k++) assert.ok(Math.abs(jacobiModeFactor(k, n, 2 / 3)) <= 1 / 3 + 1e-12, `rough mode ${k} within 1/3`);
  assert.ok(jacobiModeFactor(n, n, 1.1) < -1, 'ω = 1.1 amplifies the sawtooth');
  // Measured factors equal the analytic ones for Jacobi.
  const meas = modeFactors1d(n, { method: 'jacobi', omega: 2 / 3 });
  for (let k = 1; k <= n; k++) close(meas[k - 1], jacobiModeFactor(k, n, 2 / 3), 1e-12, `mode ${k}`);
  const gs = modeFactors1d(n, { method: 'gs' });
  close(gs[0], 0.990, 0.001, 'GS mode 1');
  close(gs[15], 0.190, 0.001, 'GS middle mode');
  close(gs[30], -0.331, 0.001, 'GS roughest mode');
  // The mixed start after 10 sweeps at ω = 2/3: hump keeps 97%, sawtooth 1.5e-5 of itself.
  const e0 = SMOOTHING_PRESETS.mixed.init(n);
  const h = drain(smooth1d(e0, { method: 'jacobi', omega: 2 / 3, sweeps: 10 })).history;
  close(h[10][0] / h[0][0], 0.968, 0.001, 'mode 1 kept');
  close(h[10][n - 1] / h[0][n - 1], 1.53e-5, 0.05e-5, 'sawtooth left');
  const h11 = drain(smooth1d(e0, { method: 'jacobi', omega: 1.1, sweeps: 10 })).history;
  assert.ok(Math.abs(h11[10][n - 1]) > Math.abs(h11[0][n - 1]), 'ω = 1.1 grows the sawtooth');
});

test('smoothing: relaxation sweeps grow like n² (fitted 1.9 for Jacobi and GS)', () => {
  const ns = [16, 32, 64];
  const want = { gs: [561, 2052, 7633], rb: [574, 2114, 7864], j: [1396, 5112, 18959] };
  const got = { gs: [], rb: [], j: [] };
  for (const n of ns) {
    const { op, b } = box(n);
    got.gs.push(iters(gaussSeidel(op, b, { tol: 1e-6, maxIter: 40000, history: false })));
    got.rb.push(iters(redBlackGS(op, b, { tol: 1e-6, maxIter: 40000, history: false })));
    got.j.push(iters(jacobi(op, b, { omega: 0.8, tol: 1e-6, maxIter: 40000, history: false })));
  }
  assert.deepEqual(got, want);
  const { op, b } = box(128);
  const g128 = iters(gaussSeidel(op, b, { tol: 1e-6, maxIter: 40000, history: false }));
  assert.equal(g128, 29407);
  close(slope([16, 32, 64, 128], [...got.gs, g128]), 1.90, 0.01, 'GS exponent');
  close(slope([16, 32, 64, 128], [...got.j, 73541]), 1.90, 0.01, 'Jacobi exponent (128² count from the table)');
});

// ------------------------------------------------------------ multigrid

const vcycleProblem = (kind) => {
  const N = 32;
  const { op, b } = kind === 'dirichlet' ? POISSON_PRESETS.manufactured.make(N, N) : POISSON_PRESETS.dipole.make(N, N);
  const ex = drain(mgpcg(op, b, { tol: 1e-13 })).x;
  let m = 0;
  for (const v of ex) m = Math.max(m, Math.abs(v));
  const rand = rng(5);
  const x = new Float64Array(op.n);
  for (let c = 0; c < op.n; c++) x[c] = 0.5 * m * (2 * rand() - 1);
  return { op, b, x };
};
const cycleFactors = (kind, o) => {
  const { op, b, x } = vcycleProblem(kind);
  const g = multigrid(op, b, { x, tol: 1e-12, maxIter: 25, ...o });
  const res = [];
  let work = 0;
  for (;;) {
    const r = g.next();
    if (r.done) break;
    if (r.value.t === 'iter') {
      res.push(r.value.residual);
      work = r.value.work;
      if (r.value.residual > 1e4) break;
    }
  }
  return { f: res.slice(1).map((v, i) => v / res[i]), work: work / res.length };
};

test('multigrid: the solvers-vcycle presets (factor per cycle at 32²)', () => {
  const def = cycleFactors('box', { nu1: 2, nu2: 2, smoother: 'rbgs' });
  {
    // The first cycle from the noisy start removes the rough noise: about 280-fold.
    const { op, b, x } = vcycleProblem('box');
    const r = drain(multigrid(op, b, { x, tol: 1e-12, maxIter: 2 }));
    close(r.residuals[0] / r.residuals[1], 283, 5, 'first-cycle reduction');
  }
  assert.ok(Math.max(...def.f) < 0.08 && Math.min(...def.f) > 0.035, `default 1/25 to 1/13: ${def.f}`);
  close(def.work, 7.65, 0.02, 'V(2,2) work units per cycle');
  const none = cycleFactors('box', { nu1: 0, nu2: 0, smoother: 'rbgs' });
  for (const v of none.f) close(v, 1, 1e-3, 'ν = 0 makes no progress');
  const j1 = cycleFactors('box', { nu1: 1, nu2: 1, smoother: 'jacobi', omega: 1 });
  close(j1.f[0], 0.77, 0.01, 'plain Jacobi ν = 1 first cycle');
  close(j1.f.at(-1), 0.99, 0.01, 'plain Jacobi ν = 1 late cycles');
  const bil = cycleFactors('dirichlet', { nu1: 1, nu2: 1, smoother: 'jacobi', omega: 0.8, prolong: 'bilinear' });
  assert.ok(Math.max(...bil.f) < 0.36, `bilinear-fixed ≈ 0.35: ${Math.max(...bil.f)}`);
  const con = cycleFactors('dirichlet', { nu1: 1, nu2: 1, smoother: 'jacobi', omega: 0.8, prolong: 'constant' });
  assert.ok(con.f.at(-1) > 1.25 && con.f.at(-1) < 1.35, `constant prolongation diverges at ≈ 1.31: ${con.f.at(-1)}`);
  const conRb = cycleFactors('dirichlet', { nu1: 2, nu2: 2, smoother: 'rbgs', prolong: 'constant' });
  assert.ok(Math.max(...conRb.f) < 0.07, 'two red–black sweeps repair constant prolongation');
});

test('multigrid: V(2,2) converges at a grid-independent rate, 4–5 cycles to 1e-6 (q4)', () => {
  const ns = [16, 32, 64, 128];
  const f = [];
  const it = [];
  for (const n of ns) {
    const { op, b } = box(n);
    const r = drain(multigrid(op, b, { tol: 1e-6 }));
    assert.ok(r.converged);
    it.push(r.iters);
    const r2 = drain(multigrid(op, b, { tol: 1e-12, maxIter: 6 }));
    f.push((r2.residuals.at(-1) / r2.residuals[2]) ** (1 / (r2.residuals.length - 3)));
    if (n === 32) assert.equal(r.levels.length, 5, 'levels 32, 16, 8, 4, 2');
  }
  assert.deepEqual(it, [4, 5, 5, 5]);
  close(f[0], 0.058, 0.01, 'factor at 16²');
  close(f[1], 0.070, 0.01, 'factor at 32²');
  close(f[3], 0.081, 0.01, 'factor at 128²');
  const mgp = ns.map((n) => {
    const { op, b } = box(n);
    return iters(mgpcg(op, b, { tol: 1e-6 }));
  });
  assert.deepEqual(mgp, [5, 5, 5, 5]);
  const obst = ns.map((n) => {
    const { op, b } = POISSON_PRESETS.obstacle.make(n, n, 1);
    return [iters(multigrid(op, b, { tol: 1e-6 })), iters(mgpcg(op, b, { tol: 1e-6 }))];
  });
  assert.deepEqual(obst, [[7, 6], [7, 6], [6, 6], [5, 5]], 'obstacle: MG and MGPCG');
});

// ------------------------------------------------------------ krylov

test('krylov kernel: SD worst-case factor (κ−1)/(κ+1), CG in n steps (solvers-cg)', () => {
  const b = new Float64Array(2);
  const want = { 4: 28, 10: 69, 100: 691 };
  for (const kap of [4, 10, 100]) {
    const q = quadratic2(kap, 0.5);
    const x0 = worstStart2(q);
    const sd = drain(steepestDescent(q.A, b, { x0, tol: 1e-6 }));
    const c = drain(conjugateGradient(q.A, b, { x0, tol: 1e-6 }));
    // energies are A-norms of the error relative to the start.
    for (let k = 1; k < 5; k++) close(sd.energies[k] / sd.energies[k - 1], sdRate(kap), 1e-9, `A-norm factor κ = ${kap}`);
    assert.equal(sd.iters, want[kap], `SD steps κ = ${kap}`);
    assert.equal(c.iters, 2, `CG steps κ = ${kap}`);
  }
  close(sdRate(10), 9 / 11, 1e-12, '9/11');
  assert.equal(drain(conjugateGradient(quadratic2(1, 0).A, b, { x0: [0.7, 0.2], tol: 1e-6 })).iters, 1, 'round bowl: one step');
  const A = spdMatrix([1, 2, 3, 5, 8, 13, 21], 3);
  const rhs = Float64Array.from({ length: 7 }, (_, i) => i - 3);
  const c7 = drain(conjugateGradient(A, rhs, { tol: 1e-12 }));
  assert.equal(c7.iters, 7);
  const xs = solveDense(A, rhs);
  for (let i = 0; i < 7; i++) close(c7.x[i], xs[i], 1e-10, 'CG matches the dense solve');
  // Jacobi preconditioning rounds the axis-aligned bowl, not the tilted one.
  const q0 = quadratic2(10, 0);
  assert.equal(drain(conjugateGradient(q0.A, new Float64Array([1, 1]), { precond: 'jacobi' })).iters, 1);
  assert.equal(drain(steepestDescent(q0.A, new Float64Array([1, 1]), { precond: 'jacobi' })).iters, 1);
  const q45 = quadratic2(100, Math.PI / 4);
  const x0 = worstStart2(q45);
  const p45 = drain(steepestDescent(q45.A, b, { x0, tol: 1e-6, precond: 'jacobi' }));
  assert.equal(p45.iters, 691, 'tilted 45°: diagonal is constant, Jacobi changes nothing');
  assert.ok(cgBound(100, 10) < cgBound(100, 5), 'CG bound decreases');
});

test('krylov: CG and preconditioned CG iteration counts on the closed box (table, q5)', () => {
  const ns = [16, 32, 64, 128];
  const run = (f) => ns.map((n) => {
    const { op, b } = box(n);
    return iters(f(op, b));
  });
  const c = run((op, b) => cg(op, b, { tol: 1e-6, history: false }));
  const ic = run((op, b) => pcg(op, b, { tol: 1e-6, precond: 'ic0', history: false }));
  const mic = run((op, b) => pcg(op, b, { tol: 1e-6, precond: 'mic0', history: false }));
  const s = run((op, b) => sor(op, b, { tol: 1e-6, maxIter: 5000, history: false }));
  assert.deepEqual(c, [56, 113, 225, 424]);
  assert.deepEqual(ic, [21, 39, 67, 129]);
  assert.deepEqual(mic, [17, 24, 38, 70]);
  assert.deepEqual(s, [59, 113, 234, 447]);
  const { op, b } = box(64);
  assert.equal(iters(pcg(op, b, { tol: 1e-6, precond: 'jacobi' })), 222);
  close(slope(ns, c), 0.98, 0.01, 'CG exponent');
  close(slope(ns, s), 0.98, 0.01, 'SOR exponent');
  close(slope(ns, ic), 0.86, 0.01, 'IC(0) exponent');
  close(slope(ns, mic), 0.68, 0.01, 'MIC(0) exponent');
  close(slope(ns, [4, 5, 5, 5]), 0.1, 0.01, 'MG exponent');
  // Work per iteration: 2 for IC/MIC, 7.65 for MG-preconditioned CG.
  const r = drain(pcg(op, b, { tol: 1e-6, precond: 'mic0' }));
  close(r.work / r.iters, 2, 1e-9, 'MIC(0) work per iteration');
  const m = drain(mgpcg(op, b, { tol: 1e-6 }));
  close(m.work / m.iters, 7.7, 0.05, 'MGPCG work per iteration');
});

test('cost: race grid 32², multigrid reaches 1e-8 in about 46 work units', () => {
  const { op, b } = box(32);
  const r = drain(multigrid(op, b, { tol: 1e-8 }));
  close(r.work, 46, 1, 'MG work to 1e-8');
  const x = new Float64Array(op.n);
  const rr = new Float64Array(op.n);
  residual(op, r.x, b, rr);
  assert.ok(r.converged);
  assert.ok(x.length === op.n);
});

// ------------------------------------------------------------ tolerance

const NX = 48;
const DT = 1 / 60;
const leakRun = (scene, extra, steps = 600) => {
  let F;
  let params;
  if (scene === 'still') {
    F = createFluid({ nx: NX, ny: NX });
    addCircle(F, 0.4, 0.5, 0.15);
    setScalar(F, (x, y) => 1 + 0.5 * y * y, F.temp);
    setScalar(F, (x, y) => 0.3 + y, F.dye);
    params = { buoyancyAlpha: 1, buoyancyBeta: 4 };
  } else {
    F = createPreset('hero', { nx: NX });
    params = { ...F.params };
  }
  const pp = { ...params, pressureMaxIter: 100, ...extra };
  let leak = 0;
  let its = 0;
  let sp = 0;
  for (let k = 0; k < steps; k++) {
    step(F, DT, pp);
    const g = F.g;
    let s = 0;
    for (let c = 0; c < g.nx * g.ny; c++) if (!g.solid[c]) s += Math.abs(g.div[c]);
    leak += 0.5 * s * g.h * g.h * DT;
    its += F.diag.pressureIters;
    sp = Math.max(sp, maxFaceSpeed(F));
  }
  return { leak, its: its / steps, sp };
};

test('cost: the leak scales with the tolerance (solvers-tolerance, q6, loose-tolerance)', () => {
  const t4 = leakRun('swirl', { pressure: 'multigrid', pressureTol: 1e-4 });
  const t2 = leakRun('swirl', { pressure: 'multigrid', pressureTol: 1e-2 });
  const t1 = leakRun('swirl', { pressure: 'multigrid', pressureTol: 1e-1 });
  rel(t4.leak, 1.77e-3, 0.05, 'leak at 1e-4');
  rel(t2.leak, 0.196, 0.05, 'leak at 1e-2');
  rel(t1.leak, 2.23, 0.05, 'leak at 1e-1');
  const ratio = t2.leak / t4.leak;
  assert.ok(ratio > 90 && ratio < 130, `about a hundredfold: ${ratio}`);
  close(t4.its, 1.63, 0.05, 'cycles per step at 1e-4');
  const j30 = leakRun('swirl', { pressure: 'jacobi', pressureIters: 30 });
  rel(j30.leak, 0.0638, 0.05, 'leak with 30 Jacobi sweeps');
  assert.ok(30 > 2 * t4.its * 7.6, '30 sweeps is more than twice the multigrid work');
  const j200 = leakRun('swirl', { pressure: 'jacobi', pressureIters: 200 });
  rel(j200.leak, 5.03e-3, 0.05, 'leak with 200 Jacobi sweeps');
  const sl = leakRun('still', { pressure: 'multigrid', pressureTol: 1e-1 });
  close(sl.sp, 0.49, 0.05, 'still fluid, loose: currents of about 0.5');
  const st = leakRun('still', { pressure: 'multigrid', pressureTol: 1e-6 });
  assert.ok(st.sp < 2.5e-6, `still fluid, tight: ${st.sp}`);
});
