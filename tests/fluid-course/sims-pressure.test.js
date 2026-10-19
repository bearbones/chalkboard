// Tests for the pressure kernels: grid2d.js (MAC and collocated grids),
// poisson.js (operator and solvers) and projection.js (projection, Hodge,
// checkerboard). Each test checks a claim the course makes, against analytic
// values, identities or measured orders, not against stored output.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drain, rng, observedOrders, normInf } from '../../aids/fluid-course/src/sims/util.js';
import * as G from '../../aids/fluid-course/src/sims/grid2d.js';
import * as P from '../../aids/fluid-course/src/sims/poisson.js';
import * as J from '../../aids/fluid-course/src/sims/projection.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

const TAU = 2 * Math.PI;

// Least-squares slope of log(y) against log(x).
function logSlope(xs, ys) {
  const lx = xs.map(Math.log);
  const ly = ys.map(Math.log);
  const mx = lx.reduce((a, b) => a + b) / lx.length;
  const my = ly.reduce((a, b) => a + b) / ly.length;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < lx.length; i++) {
    sxy += (lx[i] - mx) * (ly[i] - my);
    sxx += (lx[i] - mx) ** 2;
  }
  return sxy / sxx;
}

// Asymptotic per-cycle factor: geometric mean of the last four ratios.
function asymptoticFactor(res) {
  const k = res.length - 1;
  const k0 = Math.max(1, k - 4);
  return Math.pow(res[k] / res[k0], 1 / (k - k0));
}

// Rank of a dense matrix (array of rows) by Gaussian elimination with partial
// pivoting; pivots below tol·max|a| count as zero.
function rank(rows, tol = 1e-9) {
  const a = rows.map((r) => Float64Array.from(r));
  const m = a.length;
  const n = a[0].length;
  let scale = 0;
  for (const r of a) for (const v of r) scale = Math.max(scale, Math.abs(v));
  let rk = 0;
  for (let col = 0; col < n && rk < m; col++) {
    let piv = rk;
    for (let i = rk + 1; i < m; i++) if (Math.abs(a[i][col]) > Math.abs(a[piv][col])) piv = i;
    if (Math.abs(a[piv][col]) <= tol * scale) continue;
    [a[rk], a[piv]] = [a[piv], a[rk]];
    for (let i = rk + 1; i < m; i++) {
      const f = a[i][col] / a[rk][col];
      if (f !== 0) for (let j = col; j < n; j++) a[i][j] -= f * a[rk][j];
    }
    rk++;
  }
  return rk;
}

// Dense matrix of a linear map on R^n given as apply(x, out).
function denseOf(n, apply) {
  const cols = [];
  const e = new Float64Array(n);
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    e.fill(0);
    e[k] = 1;
    apply(e, out);
    cols.push(Float64Array.from(out));
  }
  return Array.from({ length: n }, (_, i) => cols.map((c) => c[i]));
}

function maxAbsDiff(a, b) {
  let m = 0;
  for (let k = 0; k < a.length; k++) m = Math.max(m, Math.abs(a[k] - b[k]));
  return m;
}

// Step several generators in turn, one event each, until all have returned
// (how a widget runs two solver panels side by side); onEvent(index, event).
function interleave(gens, onEvent = () => {}) {
  const out = new Array(gens.length);
  const done = gens.map(() => false);
  while (done.includes(false)) {
    for (let k = 0; k < gens.length; k++) {
      if (done[k]) continue;
      const r = gens[k].next();
      if (r.done) (done[k] = true), (out[k] = r.value);
      else onEvent(k, r.value);
    }
  }
  return out;
}

// True relative residual ‖b − A x‖₂ / ‖b‖₂ (b made compatible first).
function trueRel(op, x, b) {
  const bc = Float64Array.from(b);
  P.makeCompatible(op, bc);
  return P.residual(op, x, bc, new Float64Array(op.n)) / Math.hypot(...bc);
}

// ---------------------------------------------------------------------------
// grid2d.js

test('MAC identities: D(curl ψ) = 0 and curl(G p) = 0 to round-off', () => {
  for (const bc of ['wall', 'periodic']) {
    const nx = 24;
    const ny = 16;
    const g = G.macGrid(nx, ny, 1 / nx, { bc });
    const rand = rng(11);
    const su = nx + 1;
    const psi = new Float64Array((nx + 1) * (ny + 1));
    for (let k = 0; k < psi.length; k++) psi[k] = rand();
    if (bc === 'periodic') for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) psi[i + j * su] = psi[(i % nx) + (j % ny) * su];
    G.velocityFromStreamfunction(g, psi);
    const div = G.divergence(g);
    assert.ok(normInf(div) < 1e-12 * nx, `${bc}: max |D curl ψ| = ${normInf(div)}`);

    const p = Float64Array.from({ length: nx * ny }, () => rand());
    const gu = new Float64Array(g.u.length);
    const gv = new Float64Array(g.v.length);
    G.gradient(g, p, gu, gv);
    const w = new Float64Array((nx + 1) * (ny + 1));
    G.vorticityCorners(g, w, gu, gv);
    let m = 0;
    // On walled grids the boundary corners use mirrored ghosts (display only).
    const lo = bc === 'periodic' ? 0 : 1;
    for (let j = lo; j <= ny - lo; j++) for (let i = lo; i <= nx - lo; i++) m = Math.max(m, Math.abs(w[i + j * su]));
    assert.ok(m < 1e-10 * nx * nx, `${bc}: max |curl G p| = ${m}`);
  }
});

test('MAC divergence of the gradient is exactly minus the pressure operator (walls, solids, outlet, periodic)', () => {
  const cases = [
    { bc: 'wall', solid: true },
    { bc: { left: 'wall', right: 'open', bottom: 'wall', top: 'open' }, solid: true },
    { bc: 'periodic', solid: true },
    { bc: { left: 'periodic', right: 'periodic', bottom: 'open', top: 'wall' }, solid: false },
  ];
  for (const { bc, solid } of cases) {
    const nx = 20;
    const ny = 14;
    const g = G.macGrid(nx, ny, 1 / nx, { bc });
    if (solid) G.setSolid(g, (x, y) => (x - 0.5) ** 2 + (y - 0.35) ** 2 < 0.03);
    const op = J.pressureOperator(g);
    const rand = rng(5);
    const p = Float64Array.from({ length: nx * ny }, (_, c) => (op.active[c] ? rand() - 0.5 : 0));
    const gu = new Float64Array(g.u.length);
    const gv = new Float64Array(g.v.length);
    G.gradient(g, p, gu, gv);
    const dg = G.divergence(g, new Float64Array(nx * ny), gu, gv);
    const ap = P.applyA(op, p, new Float64Array(nx * ny));
    let m = 0;
    let s = 0;
    for (let c = 0; c < nx * ny; c++) {
      if (g.solid[c]) continue;
      m = Math.max(m, Math.abs(dg[c] + ap[c]));
      s = Math.max(s, Math.abs(ap[c]));
    }
    assert.ok(m <= 1e-12 * s, `${JSON.stringify(bc)}: max |DG p + A p| = ${m} (scale ${s})`);
  }
});

test('vorticity of solid-body rotation is 2Ω; bilinear sampling and face/centre averaging are exact on linear fields', () => {
  const nx = 16;
  const ny = 12;
  const h = 1 / nx;
  const g = G.macGrid(nx, ny, h, { bc: 'wall' });
  const su = nx + 1;
  const Om = 1.7;
  const xc = 0.4;
  const yc = 0.3;
  for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) g.u[i + j * su] = -Om * ((j + 0.5) * h - yc);
  for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) g.v[i + j * nx] = Om * ((i + 0.5) * h - xc);
  const w = G.vorticityCorners(g, new Float64Array((nx + 1) * (ny + 1)));
  const wc = G.vorticityCentres(g, new Float64Array(nx * ny));
  for (let j = 1; j < ny; j++) for (let i = 1; i < nx; i++) assert.ok(Math.abs(w[i + j * su] - 2 * Om) < 1e-12);
  for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) assert.ok(Math.abs(wc[i + j * nx] - 2 * Om) < 1e-12);

  const rand = rng(2);
  const out = [0, 0];
  const f = Float64Array.from({ length: nx * ny }, (_, c) => 0.3 + 2 * ((c % nx) + 0.5) * h - 0.7 * (Math.floor(c / nx) + 0.5) * h);
  for (let k = 0; k < 200; k++) {
    const x = h + rand() * (nx - 2) * h;
    const y = h + rand() * (ny - 2) * h;
    G.sampleVelocity(g, x, y, out);
    assert.ok(Math.abs(out[0] + Om * (y - yc)) < 1e-12);
    assert.ok(Math.abs(out[1] - Om * (x - xc)) < 1e-12);
    assert.ok(Math.abs(G.sampleScalar(g, f, x, y) - (0.3 + 2 * x - 0.7 * y)) < 1e-12);
  }
  // Clamped beyond the edge: constant extrapolation of the last sample.
  assert.equal(G.sampleScalar(g, f, -5, 0.5 * h), f[0]);
  assert.equal(G.sampleScalar(g, f, 99, 99), f[nx * ny - 1]);
  // Periodic: wraps.
  const gp = G.macGrid(nx, ny, h, { bc: 'periodic' });
  const fp = Float64Array.from({ length: nx * ny }, () => rand());
  assert.ok(Math.abs(G.sampleScalar(gp, fp, 0.23, 0.31) - G.sampleScalar(gp, fp, 0.23 + nx * h, 0.31 - 2 * ny * h)) < 1e-12);
  // The seam: a point a hair left of the first sample wraps to index nx − ε,
  // which rounds to exactly nx and must read sample 0, not clamp to nx − 1.
  const ramp = Float64Array.from({ length: nx * ny }, (_, c) => (c % nx) + 100 * Math.floor(c / nx));
  for (const dx of [0, 1e-17, 5e-18]) {
    for (const j of [0, ny - 1]) {
      const s = G.sampleScalar(gp, ramp, 0.5 * h - dx, (j + 0.5) * h);
      assert.ok(Math.abs(s - 100 * j) < 1e-9, `scalar seam at −${dx}, row ${j}: ${s}`);
    }
  }
  for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) gp.u[i + j * su] = i % nx;
  for (const x of [0, -1e-17, -1e-18]) assert.ok(Math.abs(G.sampleU(gp, x, 0.5 * h)) < 1e-9, `u seam at ${x}`);

  // Centres -> faces -> centres reproduces a linear field away from the walls.
  const uc = Float64Array.from({ length: nx * ny }, (_, c) => 1 + 3 * (c % nx) * h);
  const vc = Float64Array.from({ length: nx * ny }, (_, c) => 2 - 5 * Math.floor(c / nx) * h);
  const g2 = G.macGrid(nx, ny, h);
  G.centresToFaces(g2, uc, vc);
  const uc2 = new Float64Array(nx * ny);
  const vc2 = new Float64Array(nx * ny);
  G.facesToCentres(g2, uc2, vc2);
  for (let j = 1; j < ny - 1; j++) {
    for (let i = 1; i < nx - 1; i++) {
      assert.ok(Math.abs(uc2[i + j * nx] - uc[i + j * nx]) < 1e-12);
      assert.ok(Math.abs(vc2[i + j * nx] - vc[i + j * nx]) < 1e-12);
    }
  }
});

test('MAC divergence is second-order accurate', () => {
  const errs = [];
  for (const n of [16, 32, 64]) {
    const h = 1 / n;
    const g = G.macGrid(n, n, h, { bc: 'periodic' });
    const su = n + 1;
    for (let j = 0; j < n; j++) for (let i = 0; i <= n; i++) g.u[i + j * su] = Math.sin(TAU * i * h) * Math.cos(TAU * (j + 0.5) * h);
    for (let j = 0; j <= n; j++) for (let i = 0; i < n; i++) g.v[i + j * n] = Math.sin(TAU * (i + 0.5) * h + 0.3) * Math.sin(TAU * j * h);
    const d = G.divergence(g);
    let e = 0;
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * h;
        const y = (j + 0.5) * h;
        const exact = TAU * Math.cos(TAU * x) * Math.cos(TAU * y) + TAU * Math.sin(TAU * x + 0.3) * Math.cos(TAU * y);
        e = Math.max(e, Math.abs(d[i + j * n] - exact));
      }
    }
    errs.push(e);
  }
  for (const p of observedOrders(errs)) assert.ok(p > 1.95 && p < 2.05, `order ${p}`);
});

test('the central gradient of the checkerboard (−1)^(i+j) is exactly zero; the MAC gradient is ±2/h', () => {
  const nx = 12;
  const ny = 8;
  const h = 0.1;
  const p = Float64Array.from({ length: nx * ny }, (_, c) => ((c % nx) + Math.floor(c / nx)) % 2 ? -1 : 1);
  const gx = new Float64Array(nx * ny);
  const gy = new Float64Array(nx * ny);
  G.centralGradient(p, nx, ny, h, gx, gy);
  for (let c = 0; c < nx * ny; c++) {
    assert.equal(gx[c], 0);
    assert.equal(gy[c], 0);
  }
  const g = G.macGrid(nx, ny, h, { bc: 'periodic' });
  const gu = new Float64Array(g.u.length);
  const gv = new Float64Array(g.v.length);
  G.gradient(g, p, gu, gv);
  for (const v of gu) assert.ok(Math.abs(Math.abs(v) - 2 / h) < 1e-12);
  for (const v of gv) assert.ok(Math.abs(Math.abs(v) - 2 / h) < 1e-12);
  assert.ok(Math.abs(G.checkerboardFraction(p, nx, ny) - 1) < 1e-15);
});

test('parity fractions: each of (−1)^i, (−1)^j, (−1)^(i+j) is caught; one sub-grid is 3/4 parity; smooth fields are not', () => {
  const nx = 16;
  const ny = 12;
  const field = (f) => Float64Array.from({ length: nx * ny }, (_, c) => f(c % nx, Math.floor(c / nx)));
  const close = (a, b) => Math.abs(a - b) < 1e-12;
  const out = { checker: 0, oddI: 0, oddJ: 0, total: 0 };
  const stripeI = G.parityFractions(field((i) => (i % 2 ? -3 : 3)), nx, ny, out);
  assert.ok(stripeI === out, 'writes into out');
  assert.ok(close(out.oddI, 1) && close(out.oddJ, 0) && close(out.checker, 0) && close(out.total, 1), JSON.stringify(out));
  const stripeJ = G.parityFractions(field((i, j) => (j % 2 ? -1 : 1)), nx, ny);
  assert.ok(close(stripeJ.oddJ, 1) && close(stripeJ.total, 1), JSON.stringify(stripeJ));
  const checker = G.parityFractions(field((i, j) => ((i + j) % 2 ? -1 : 1)), nx, ny);
  assert.ok(close(checker.checker, 1) && close(checker.total, 1));
  // checkerboardFraction is the diagonal share only: blind to the stripes.
  assert.equal(G.checkerboardFraction(field((i) => (i % 2 ? -1 : 1)), nx, ny), 0);
  // A field on one parity sub-grid (here i, j both odd): 1/4 in each mode.
  const rand = rng(3);
  const one = G.parityFractions(field((i, j) => (i % 2 && j % 2 ? rand() + 0.5 : 0)), nx, ny);
  for (const k of ['oddI', 'oddJ', 'checker']) assert.ok(close(one[k], 0.25), JSON.stringify(one));
  assert.ok(close(one.total, 0.75));
  // Smooth: O(h²) energy share.
  const sm = [32, 64].map((n) => G.parityFractions(Float64Array.from({ length: n * n }, (_, c) => Math.sin((TAU * ((c % n) + 0.5)) / n) + Math.cos((TAU * (Math.floor(c / n) + 0.5)) / n)), n, n).total);
  // (9.6e-3 at 32², 2.4e-3 at 64²: the stripe parts carry the O(h²) share.)
  assert.ok(sm[0] < 0.02 && Math.abs(sm[0] / sm[1] - 4) < 0.1, `smooth totals ${sm}`);
});

// ---------------------------------------------------------------------------
// poisson.js: the operator

test('5-point Laplacian is second order on manufactured solutions (Dirichlet, Neumann, periodic)', () => {
  const problems = [
    {
      bc: 'dirichlet',
      // p = e^x cos 2y + x², −∇²p = 3 e^x cos 2y − 2, boundary values from p.
      p: (x, y) => Math.exp(x) * Math.cos(2 * y) + x * x,
      f: (x, y) => 3 * Math.exp(x) * Math.cos(2 * y) - 2,
    },
    {
      bc: 'neumann',
      p: (x, y) => Math.cos(Math.PI * x) * Math.cos(TAU * y),
      f: (x, y) => 5 * Math.PI * Math.PI * Math.cos(Math.PI * x) * Math.cos(TAU * y),
    },
    {
      bc: 'periodic',
      p: (x, y) => Math.sin(TAU * x) * Math.cos(2 * TAU * y) + 0.5 * Math.cos(TAU * (x + y)),
      f: (x, y) => 5 * TAU * TAU * Math.sin(TAU * x) * Math.cos(2 * TAU * y) + TAU * TAU * Math.cos(TAU * (x + y)),
    },
  ];
  for (const pr of problems) {
    const errs = [];
    const errs2 = [];
    for (const n of [16, 32, 64, 128]) {
      const h = 1 / n;
      const op = P.laplacian(n, n, h, { bc: pr.bc });
      const b = new Float64Array(n * n);
      const ex = new Float64Array(n * n);
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          b[i + j * n] = pr.f((i + 0.5) * h, (j + 0.5) * h);
          ex[i + j * n] = pr.p((i + 0.5) * h, (j + 0.5) * h);
        }
      }
      if (pr.bc === 'dirichlet') P.addDirichletValues(op, b, pr.p);
      const res = P.solve(op, b, 'mgpcg', { tol: 1e-12 });
      assert.ok(res.converged);
      if (op.singular) P.removeNullspace(op, ex);
      errs.push(maxAbsDiff(res.x, ex));
      let s2 = 0;
      for (let c = 0; c < n * n; c++) s2 += (res.x[c] - ex[c]) ** 2 * h * h;
      errs2.push(Math.sqrt(s2));
    }
    const o2 = observedOrders(errs2);
    const oMax = observedOrders(errs);
    for (const p of o2) assert.ok(p > 1.95 && p < 2.1, `${pr.bc}: L2 orders ${o2.map((v) => v.toFixed(3))}`);
    if (pr.bc === 'dirichlet') {
      // The ghost-value wall condition has an O(1) local truncation error in
      // the wall layer: the max-norm order climbs to 2 from below (1.84,
      // 1.89, 1.92 here; 1.96 by 512²), the worst error sitting on the wall.
      for (let k = 0; k < oMax.length; k++) assert.ok(oMax[k] > 1.8 && oMax[k] < 2.05 && (k === 0 || oMax[k] > oMax[k - 1]), `max-norm orders ${oMax}`);
    } else for (const p of oMax) assert.ok(p > 1.9 && p < 2.2, `${pr.bc}: max-norm orders ${oMax.map((v) => v.toFixed(3))}`);
  }
});

test('pure-Neumann null space: the right-hand side is projected, the solution has zero mean, per connected region', () => {
  const n = 16;
  const { op, b } = P.POISSON_PRESETS['closed-box'].make(n);
  assert.equal(op.singular, true);
  const b5 = b.map((v) => v + 5);
  const r1 = P.solve(op, b, 'pcg-mic0', { tol: 1e-12 });
  const r2 = P.solve(op, b5, 'pcg-mic0', { tol: 1e-12 });
  let mean = 0;
  for (const v of b) mean += v;
  mean /= n * n;
  assert.ok(Math.abs(r2.rhsMean - Math.abs(mean + 5)) < 1e-12, 'reports the incompatible mean it removed');
  assert.ok(maxAbsDiff(r1.x, r2.x) < 1e-10, 'adding a constant to b changes nothing');
  assert.ok(Math.abs(r1.x.reduce((a, v) => a + v, 0)) < 1e-10, 'zero-mean gauge');
  // b itself is not modified.
  assert.equal(b5[0], b[0] + 5);

  // A solid wall splits the box: two singular components, each with its own mean.
  const solid = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) solid[7 + j * n] = 1;
  const op2 = P.laplacian(n, n, 1 / n, { bc: 'neumann', solid });
  assert.equal(op2.ncomp, 2);
  const b2 = P.randomRhs(op2, 3);
  const r3 = P.solve(op2, b2, 'mgpcg', { tol: 1e-10 });
  assert.ok(r3.converged);
  let left = 0;
  let right = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) (i < 7 ? (left += r3.x[i + j * n]) : i > 7 ? (right += r3.x[i + j * n]) : 0);
  assert.ok(Math.abs(left) < 1e-9 && Math.abs(right) < 1e-9);
  // The solution satisfies the compatible equations in each region.
  const bc2 = Float64Array.from(b2);
  P.makeCompatible(op2, bc2);
  const rr = new Float64Array(n * n);
  assert.ok(P.residual(op2, r3.x, bc2, rr) < 1e-9 * Math.hypot(...bc2));
});

// ---------------------------------------------------------------------------
// poisson.js: solvers

test('every solver converges on the model problems, to the same answer', () => {
  for (const preset of ['model-dirichlet', 'closed-box', 'obstacle', 'channel']) {
    const { op, b } = P.POISSON_PRESETS[preset].make(32);
    const ref = P.solve(op, b, 'mgpcg', { tol: 1e-12 }).x;
    const bc = Float64Array.from(b);
    P.makeCompatible(op, bc);
    const bn = Math.hypot(...bc);
    const r = new Float64Array(op.n);
    for (const method of Object.keys(P.SOLVERS)) {
      // Plain Jacobi never converges on a pure-Neumann problem (next test);
      // weighted Jacobi does.
      const opts = { tol: 1e-6 };
      if (method === 'jacobi' && op.singular) opts.omega = 0.8;
      const res = P.solve(op, b, method, opts);
      assert.ok(res.converged, `${preset}/${method} did not converge in ${res.iters}`);
      assert.ok(P.residual(op, res.x, bc, r) <= 1.000001e-6 * bn, `${preset}/${method}: true residual`);
      assert.ok(maxAbsDiff(res.x, ref) < 1e-3 * normInf(ref), `${preset}/${method}: answer`);
      assert.equal(res.residuals.length, res.iters + 1);
      // The metadata's `work` is the measured cost per iteration in fine-grid sweeps.
      const w = res.work / res.iters;
      assert.ok(Math.abs(w - P.SOLVERS[method].work) <= 0.02 * P.SOLVERS[method].work, `${preset}/${method}: work per iteration ${w} vs ${P.SOLVERS[method].work}`);
    }
  }
});

test('odd sizes and grids too small to coarsen: multigrid and MGPCG still converge to the true residual, at even-size rates', () => {
  // Coarsening pairs cells; an odd side leaves a half-width coarse cell whose
  // operator is rediscretised on the real geometry, so the factor stays flat.
  for (const [nx, ny] of [[15, 15], [33, 33], [63, 63], [97, 97], [100, 75], [48, 27]]) {
    for (const preset of ['closed-box', 'model-dirichlet', 'obstacle']) {
      const { op, b } = P.POISSON_PRESETS[preset].make(nx, ny);
      const mg = P.solve(op, b, 'multigrid', { tol: 1e-10 });
      assert.ok(mg.converged && trueRel(op, mg.x, b) < 1.0001e-10, `${preset} ${nx}×${ny}: multigrid ${mg.iters} cycles`);
      const f = asymptoticFactor(mg.residuals);
      assert.ok(f < (preset === 'obstacle' ? 0.35 : 0.12), `${preset} ${nx}×${ny}: factor ${f}`);
      const pc = P.solve(op, b, 'mgpcg', { tol: 1e-10 });
      assert.ok(pc.converged && pc.iters <= 12 && trueRel(op, pc.x, b) < 1.0001e-10, `${preset} ${nx}×${ny}: MGPCG ${pc.iters}`);
    }
  }
  // Grids with a side below 4 have a one-level hierarchy (the coarse CG is
  // the whole solve); so has maxLevels 1. Warm starts are honoured.
  for (const [nx, ny, extra] of [[3, 3, {}], [2, 7, {}], [3, 40, {}], [15, 15, { maxLevels: 1 }]]) {
    for (const bc of ['dirichlet', 'neumann']) {
      const op = P.laplacian(nx, ny, 1 / nx, { bc });
      const b = P.randomRhs(op, 4);
      for (const method of ['multigrid', 'mgpcg']) {
        const res = P.solve(op, b, method, { tol: 1e-10, ...extra });
        assert.ok(res.converged && trueRel(op, res.x, b) < 1.0001e-10, `${nx}×${ny} ${bc} ${method}: true residual ${trueRel(op, res.x, b)}`);
        const warm = Float64Array.from(res.x, (v) => v * (1 + 1e-3));
        const again = P.solve(op, b, method, { tol: 1e-10, x: warm, ...extra });
        assert.ok(again.x === warm && again.converged && trueRel(op, warm, b) < 1.0001e-10, `${nx}×${ny} ${bc} ${method}: warm start`);
      }
    }
  }
  const { op: op15, b: b15 } = P.POISSON_PRESETS['model-dirichlet'].make(15);
  assert.equal(P.solve(op15, b15, 'multigrid', { maxLevels: 1 }).levels.length, 1);
  assert.deepEqual(P.solve(op15, b15, 'multigrid').levels, [[15, 15], [8, 8], [4, 4], [2, 2]]);
});

test('solver generators sharing one operator can run interleaved: each gives its solo answer', () => {
  const { op, b } = P.POISSON_PRESETS.obstacle.make(48);
  const b2 = P.randomRhs(op, 77);
  for (const [m1, m2] of [['cg', 'sor'], ['multigrid', 'mgpcg'], ['mgpcg', 'mgpcg'], ['pcg-mic0', 'multigrid']]) {
    const solo1 = P.solve(op, b, m1, { tol: 1e-9 });
    const solo2 = P.solve(op, b2, m2, { tol: 1e-9 });
    const [r1, r2] = interleave([P.SOLVERS[m1].run(op, b, { tol: 1e-9 }), P.SOLVERS[m2].run(op, b2, { tol: 1e-9 })]);
    assert.equal(r1.iters, solo1.iters, `${m1} beside ${m2}`);
    assert.equal(r2.iters, solo2.iters, `${m2} beside ${m1}`);
    assert.ok(maxAbsDiff(r1.x, solo1.x) === 0 && maxAbsDiff(r2.x, solo2.x) === 0, `${m1} + ${m2}: identical iterates`);
    assert.ok(trueRel(op, r1.x, b) < 1.0001e-9 && trueRel(op, r2.x, b2) < 1.0001e-9);
  }
  // Two traced sweeps side by side keep their own cell order.
  const small = P.laplacian(4, 3, 1, { bc: 'dirichlet' });
  const sb = P.randomRhs(small, 2);
  const cells = [[], []];
  interleave([P.gaussSeidel(small, sb, { maxIter: 2, trace: 'cells' }), P.redBlackGS(small, sb, { maxIter: 2, trace: 'cells' })], (k, e) => e.op === 'relax' && cells[k].push(e.cell));
  assert.deepEqual(cells[0], [...Array(12).keys(), ...Array(12).keys()]);
  for (let k = 0; k < 24; k++) assert.equal(((cells[1][k] % 4) + Math.floor(cells[1][k] / 4)) % 2, k % 12 < 6 ? 0 : 1);
  // A generator abandoned mid-solve does not disturb later solves.
  const it = P.mgpcg(op, b, { tol: 1e-9 });
  for (let k = 0; k < 7; k++) it.next();
  const after = P.solve(op, b, 'mgpcg', { tol: 1e-9 });
  assert.equal(after.iters, P.solve(op, b, 'mgpcg', { tol: 1e-9 }).iters);
  assert.ok(trueRel(op, after.x, b) < 1.0001e-9);
});

test('plain Jacobi stalls in a closed box: the checkerboard error has iteration factor exactly −1', () => {
  const n = 16;
  const op = P.laplacian(n, n, 1 / n, { bc: 'neumann' });
  const checker = Float64Array.from({ length: n * n }, (_, c) => ((c % n) + Math.floor(c / n)) % 2 ? -1 : 1);
  // Exact solution = checkerboard; start from 0, so the error is −checker.
  const b = P.applyA(op, checker, new Float64Array(n * n));
  const stalled = P.solve(op, b, 'jacobi', { omega: 1, maxIter: 40, tol: 1e-8 });
  assert.equal(stalled.converged, false);
  for (const r of stalled.residuals) assert.ok(Math.abs(r - 1) < 1e-12, `residual ratio ${r}`);
  const weighted = P.solve(op, b, 'jacobi', { omega: 0.8, tol: 1e-8 });
  assert.ok(weighted.converged && weighted.iters < 100, `weighted Jacobi: ${weighted.iters}`);
  // With a Dirichlet wall the diagonal is larger and ω = 1 converges.
  const opD = P.laplacian(n, n, 1 / n, { bc: 'dirichlet' });
  assert.ok(P.solve(opD, P.randomRhs(opD), 'jacobi', { tol: 1e-6 }).converged);
});

test('1-D model problem: weighted Jacobi damps sine mode k by exactly 1 − 2ω sin²(kπ/(2n+2)); ω = 2/3 cuts the upper half by at least 3×', () => {
  const n = 63;
  const measured = P.modeFactors1d(n, { method: 'jacobi', omega: 2 / 3 });
  for (let k = 1; k <= n; k++) assert.ok(Math.abs(measured[k - 1] - P.jacobiModeFactor(k, n, 2 / 3)) < 1e-12, `mode ${k}`);
  const highest = measured[n - 1];
  assert.ok(highest < -0.33 && highest > -1 / 3, `highest mode factor ${highest}`);
  let upper = 0;
  for (let k = Math.ceil(n / 2); k <= n; k++) upper = Math.max(upper, Math.abs(measured[k - 1]));
  assert.ok(upper <= 1 / 3 + 1e-12, `upper-half smoothing factor ${upper}`);
  assert.ok(measured[0] > 0.999, 'the smoothest mode is barely touched');
  // Plain Jacobi (ω = 1) only flips the sawtooth.
  const plain = P.modeFactors1d(n, { method: 'jacobi', omega: 1 });
  assert.ok(Math.abs(plain[n - 1] + Math.cos(Math.PI / (n + 1))) < 1e-12);
  // Over several sweeps each mode decays geometrically.
  const e0 = P.SMOOTHING_PRESETS.mixed.init(n);
  const a0 = P.sineModes(e0);
  let sweepsSeen = 0;
  const out = drain(P.smooth1d(e0, { method: 'jacobi', omega: 2 / 3, sweeps: 10 }), (ev) => {
    if (ev.t === 'iter') sweepsSeen++;
  });
  assert.equal(sweepsSeen, 10);
  for (const k of [1, 32, 63]) {
    const expect = a0[k - 1] * Math.pow(P.jacobiModeFactor(k, n, 2 / 3), 10);
    assert.ok(Math.abs(out.modes[k - 1] - expect) < 1e-12, `mode ${k} after 10 sweeps`);
  }
  // The sine transform round-trips.
  assert.ok(maxAbsDiff(P.sineSynthesis(P.sineModes(e0)), e0) < 1e-12);
  // Gauss–Seidel smooths too: its upper-half per-mode factors are small.
  const gs = P.modeFactors1d(n, { method: 'gs' });
  for (let k = Math.ceil(n / 2) + 2; k <= n; k++) assert.ok(Math.abs(gs[k - 1]) < 0.5, `GS mode ${k}: ${gs[k - 1]}`);
});

test('multigrid V(2,2) reduces the residual by less than 0.2 per cycle, independently of grid size', () => {
  for (const preset of ['closed-box', 'model-dirichlet']) {
    const f = [32, 64, 128].map((n) => {
      const { op, b } = P.POISSON_PRESETS[preset].make(n);
      const res = P.solve(op, b, 'multigrid', { tol: 1e-12, nu1: 2, nu2: 2 });
      assert.ok(res.converged);
      return asymptoticFactor(res.residuals);
    });
    for (const v of f) assert.ok(v < 0.2, `${preset}: factors ${f.map((v) => v.toFixed(3))}`);
    assert.ok(Math.max(...f) - Math.min(...f) < 0.03, `${preset}: factors ${f.map((v) => v.toFixed(3))} should not grow with n`);
  }
});

test('piecewise-constant prolongation (m_P + m_R = 2) degrades as the grid is refined; bilinear does not', () => {
  const run = (n, prolong, smoother) => {
    const { op, b } = P.POISSON_PRESETS['model-dirichlet'].make(n);
    const res = P.solve(op, b, 'multigrid', { tol: 1e-10, nu1: 1, nu2: 1, prolong, smoother, maxIter: 25 });
    return asymptoticFactor(res.residuals);
  };
  const bil = [run(32, 'bilinear', 'rbgs'), run(128, 'bilinear', 'rbgs')];
  const con = [run(32, 'constant', 'rbgs'), run(128, 'constant', 'rbgs')];
  assert.ok(Math.abs(bil[1] - bil[0]) < 0.03, `bilinear V(1,1): ${bil}`);
  assert.ok(con[1] > con[0] + 0.1, `constant V(1,1): ${con}`);
  assert.ok(run(64, 'constant', 'jacobi') > 1, 'constant prolongation with one Jacobi sweep diverges');
});

test('CG iterations grow like n (cells per side), Jacobi and Gauss–Seidel like n²; SOR at the optimal ω like n', () => {
  const ns = [16, 32, 64];
  const iters = (method, opts = {}) =>
    ns.map((n) => {
      const { op, b } = P.POISSON_PRESETS['model-dirichlet'].make(n);
      return P.solve(op, b, method, { tol: 1e-6, ...opts }).iters;
    });
  const cg = iters('cg');
  const jac = iters('jacobi');
  const gs = iters('gauss-seidel');
  const sor = iters('sor');
  // The metadata's `order` is the exponent p in iterations ∝ n^p.
  assert.ok(Math.abs(logSlope(ns, cg) - P.SOLVERS.cg.order) < 0.15, `CG ${cg}`);
  assert.ok(Math.abs(logSlope(ns, jac) - P.SOLVERS.jacobi.order) < 0.15, `Jacobi ${jac}`);
  assert.ok(Math.abs(logSlope(ns, gs) - P.SOLVERS['gauss-seidel'].order) < 0.15, `GS ${gs}`);
  assert.ok(Math.abs(logSlope(ns, sor) - P.SOLVERS.sor.order) < 0.15, `SOR ${sor}`);
  assert.deepEqual([P.SOLVERS.cg.order, P.SOLVERS.jacobi.order, P.SOLVERS.sor.order], [1, 2, 1]);
  // Gauss–Seidel's spectral radius is the square of Jacobi's: half the sweeps.
  for (let k = 0; k < ns.length; k++) assert.ok(gs[k] / jac[k] > 0.42 && gs[k] / jac[k] < 0.56, `GS/Jacobi ${gs[k] / jac[k]}`);
  // The model-problem ω is near the best ω on a scan (within 15 %).
  const { op, b } = P.POISSON_PRESETS['closed-box'].make(32);
  const w0 = P.sorOptimalOmega(op);
  const at = (w) => P.solve(op, b, 'sor', { tol: 1e-6, omega: w }).iters;
  const best = Math.min(...[-0.1, -0.05, -0.02, 0.02, 0.05].map((d) => at(w0 + d)));
  assert.ok(at(w0) <= 1.15 * best, `SOR at ω_opt ${at(w0)} vs best ${best}`);
  // The textbook formula for the square Dirichlet case.
  const opD = P.laplacian(32, 32, 1 / 32, { bc: 'dirichlet' });
  assert.ok(Math.abs(P.sorOptimalOmega(opD) - 2 / (1 + Math.sin(Math.PI / 32))) < 1e-12);
});

test('preconditioning: MIC(0) < IC(0) < CG in iterations; MIC(0) at τ = 1 grows like √n; τ = 0.97 is the robust default; MGPCG is flat', () => {
  const ns = [16, 32, 64];
  const its = {};
  for (const m of ['cg', 'pcg-ic0', 'pcg-mic0', 'mgpcg']) {
    its[m] = ns.map((n) => {
      const { op, b } = P.POISSON_PRESETS['closed-box'].make(n);
      return P.solve(op, b, m, { tol: 1e-6 }).iters;
    });
  }
  for (let k = 0; k < ns.length; k++) {
    assert.ok(its['pcg-mic0'][k] < its['pcg-ic0'][k] && its['pcg-ic0'][k] < its.cg[k], JSON.stringify(its));
  }
  // Gustafsson's O(√n) is for the full modification τ = 1 on a box, and it
  // holds out to 256² (19, 27, 39, 57 iterations).
  const nsF = [32, 64, 128, 256];
  const micIters = (tau) =>
    nsF.map((n) => {
      const { op, b } = P.POISSON_PRESETS['model-dirichlet'].make(n);
      return P.solve(op, b, 'pcg-mic0', { tol: 1e-6, tau }).iters;
    });
  const full = micIters(1);
  const sFull = logSlope(nsF, full);
  assert.ok(sFull > 0.45 && sFull < 0.6, `MIC(τ = 1) ${full}: slope ${sFull}`);
  assert.ok(Math.abs(sFull - P.SOLVERS['pcg-mic0'].order) < 0.1);
  // The default τ = 0.97 drifts back towards O(n) once 1 − τ outweighs h²
  // (17, 26, 48, 88: slope ≈ 0.85 over the last doubling) …
  assert.equal(P.SOLVERS['pcg-mic0'].defaultTau, 0.97);
  const dflt = micIters(undefined);
  assert.ok(dflt[3] > full[3] && Math.log2(dflt[3] / dflt[2]) > 0.7, `MIC(τ = 0.97) ${dflt}`);
  // … but beats τ = 1 by a wide margin around a solid and on a periodic grid.
  for (const preset of ['obstacle', 'periodic']) {
    const { op, b } = P.POISSON_PRESETS[preset].make(64);
    const a = P.solve(op, b, 'pcg-mic0', { tol: 1e-6 }).iters;
    const t1 = P.solve(op, b, 'pcg-mic0', { tol: 1e-6, tau: 1 }).iters;
    assert.ok(a < 0.75 * t1, `${preset}: τ = 0.97 ${a}, τ = 1 ${t1}`);
  }
  assert.equal(P.SOLVERS.mgpcg.order, 0);
  assert.ok(Math.max(...its.mgpcg) - Math.min(...its.mgpcg) <= 1 && Math.max(...its.mgpcg) <= 8, `MGPCG ${its.mgpcg}`);
});

test('trace events: lexicographic and red–black sweep order; balanced V-cycle levels; work accounting', () => {
  const op = P.laplacian(4, 3, 1, { bc: 'dirichlet' });
  const b = P.randomRhs(op, 2);
  const lex = [];
  drain(P.gaussSeidel(op, b, { maxIter: 1, trace: 'cells' }), (e) => e.op === 'relax' && lex.push(e.cell));
  assert.deepEqual(lex, [...Array(12).keys()]);
  const rb = [];
  const rbEv = [];
  const rbRes = drain(P.redBlackGS(op, b, { maxIter: 1, trace: 'cells' }), (e) => e.op === 'relax' && (rb.push(e.cell), rbEv.push({ ...e })));
  assert.equal(rb.length, 12);
  for (let k = 0; k < 12; k++) assert.equal(((rb[k] % 4) + Math.floor(rb[k] / 4)) % 2, k < 6 ? 0 : 1);
  // Each event carries the value the cell received (one sweep: its final value) and its colour.
  for (const e of rbEv) {
    assert.equal(e.value, rbRes.x[e.cell]);
    assert.equal(e.colour, ((e.cell % 4) + Math.floor(e.cell / 4)) % 2);
  }
  // Traced and untraced runs execute the same sweeps: identical iterates.
  const { op: op16, b: b16 } = P.POISSON_PRESETS.obstacle.make(16);
  for (const run of [P.gaussSeidel, P.redBlackGS, P.jacobi, P.sor]) {
    const a = drain(run(op16, b16, { maxIter: 7, omega: run === P.jacobi ? 0.8 : undefined, trace: 'cells' })).x.slice();
    const c = drain(run(op16, b16, { maxIter: 7, omega: run === P.jacobi ? 0.8 : undefined })).x;
    assert.deepEqual(a, c);
  }

  const { op: op64, b: b64 } = P.POISSON_PRESETS['closed-box'].make(64);
  let depth = 0;
  let maxLevel = 0;
  let iters = 0;
  let enters = 0;
  const smooths = [];
  const res = drain(P.multigrid(op64, b64, { tol: 1e-8, nu1: 2, nu2: 3, trace: true }), (e) => {
    if (e.t === 'enter') {
      assert.equal(e.kind, 'level');
      assert.equal(e.level, depth);
      depth++;
      enters++;
      maxLevel = Math.max(maxLevel, e.level);
    } else if (e.t === 'leave') depth--;
    else if (e.t === 'iter') {
      assert.equal(depth, 0);
      iters++;
    } else if (e.op === 'smooth') {
      assert.equal(e.level, depth - 1);
      smooths.push(e);
    }
  });
  assert.equal(depth, 0);
  assert.equal(iters, res.iters);
  assert.equal(maxLevel, res.levels.length - 1);
  assert.equal(enters, res.iters * res.levels.length);
  // trace: true shows every smoothing sweep: ν1 pre and ν2 post on each level
  // but the coarsest (which is solved), numbered 1…ν.
  const L = res.levels.length;
  assert.equal(smooths.length, res.iters * (2 + 3) * (L - 1));
  assert.equal(smooths.filter((e) => e.pre).length, res.iters * 2 * (L - 1));
  assert.deepEqual(smooths.slice(0, 2).map((e) => [e.level, e.sweep, e.pre]), [[0, 1, true], [0, 2, true]]);
  assert.deepEqual(smooths.slice(-3).map((e) => [e.level, e.sweep, e.pre]), [[0, 1, false], [0, 2, false], [0, 3, false]]);
  // V(2,2): 1 residual + (2 + 2 + 1)·(1 + 1/4 + 1/16 + …) per cycle, plus a tiny coarse solve.
  const r22 = P.solve(op64, b64, 'multigrid', { tol: 1e-8 });
  const perCycle = r22.work / r22.iters;
  assert.ok(perCycle > 7.6 && perCycle < 7.8, `work per cycle ${perCycle}`);
});

test('metadata: TeX parses; every preset builds and solves', () => {
  const texts = [];
  for (const s of Object.values(P.SOLVERS)) texts.push(s.tex);
  for (const s of Object.values(P.SMOOTHERS_1D)) texts.push(s.tex);
  for (const s of Object.values(J.COLLOCATED_KINDS)) texts.push(s.tex);
  for (const s of Object.values(G.BOUNDARY_TYPES)) texts.push(s.tex);
  for (const t of texts) assert.doesNotThrow(() => tex(t), t);
  for (const [id, pr] of Object.entries(P.POISSON_PRESETS)) {
    // Square and both kinds of rectangle.
    for (const [nx, ny] of [[16, 16], [32, 16], [32, 48]]) {
      const { op, b, exact } = pr.make(nx, ny);
      assert.ok(op.nx === nx && op.ny === ny, `${id} ${nx}×${ny}`);
      const res = P.solve(op, b, 'mgpcg', { tol: 1e-10 });
      assert.ok(res.converged, id);
      if (exact) assert.ok(maxAbsDiff(res.x, exact) < 0.01, `${id} ${nx}×${ny}: error ${maxAbsDiff(res.x, exact)}`);
    }
  }
  for (const pr of Object.values(P.SMOOTHING_PRESETS)) assert.equal(pr.init(31).length, 31);
  // Every method entry carries the full metadata set.
  for (const table of [P.SOLVERS, P.SMOOTHERS_1D, J.COLLOCATED_KINDS]) {
    for (const [key, m] of Object.entries(table)) {
      assert.equal(m.id, key);
      for (const f of ['name', 'description', 'tex', 'stability']) assert.ok(typeof m[f] === 'string' && m[f].length > 0, `${key}.${f}`);
      assert.ok(Number.isFinite(m.order), `${key}.order`);
    }
  }
});

// ---------------------------------------------------------------------------
// projection.js

test('project() makes the field divergence-free (max |div| < 1e-8 relative), keeps walls and solids, and is idempotent', () => {
  for (const id of ['random-box', 'obstacle-channel', 'jet']) {
    const g = J.PROJECTION_PRESETS[id].make(64);
    const u0 = Float64Array.from(g.u);
    const v0 = Float64Array.from(g.v);
    const st = J.project(g, { tol: 1e-11 });
    assert.ok(st.converged, id);
    assert.ok(st.relDiv < 1e-8, `${id}: relative max |div| ${st.relDiv}`);
    // Fixed faces are untouched (zero on solids, the inflow speed on the inlet).
    for (let k = 0; k < g.u.length; k++) if (g.uType[k] === G.FACE_FIXED) assert.equal(g.u[k], u0[k]);
    for (let k = 0; k < g.v.length; k++) if (g.vType[k] === G.FACE_FIXED) assert.equal(g.v[k], v0[k]);
    // P² = P.
    const u1 = Float64Array.from(g.u);
    const v1 = Float64Array.from(g.v);
    J.project(g, { tol: 1e-11, warm: false });
    const scale = Math.max(normInf(u1), normInf(v1));
    assert.ok(Math.max(maxAbsDiff(g.u, u1), maxAbsDiff(g.v, v1)) < 1e-9 * scale, `${id}: idempotent`);
  }
  // Inflow on the left leaves through the open right side: the outlet flux equals the inlet flux.
  const g = J.PROJECTION_PRESETS['obstacle-channel'].make(64);
  J.project(g, { tol: 1e-11 });
  let inflow = 0;
  let outflow = 0;
  for (let j = 0; j < g.ny; j++) (inflow += g.u[j * (g.nx + 1)]), (outflow += g.u[g.nx + j * (g.nx + 1)]);
  assert.ok(Math.abs(inflow - outflow) < 1e-8 * inflow);
});

test('project() on odd sizes (no exact halving): divergence-free to the solver tolerance; the interactive options stay close', () => {
  const cases = [
    ['random-box', J.PROJECTION_PRESETS['random-box'].make(63)],
    ['jet', J.PROJECTION_PRESETS.jet.make(45, 31)],
    ['obstacle-channel', J.PROJECTION_PRESETS['obstacle-channel'].make(50)],
    ['vortex-source', J.PROJECTION_PRESETS['vortex-source'].make(33)],
  ];
  for (const [id, g] of cases) {
    const u0 = Float64Array.from(g.u);
    const v0 = Float64Array.from(g.v);
    const st = J.project(g, { tol: 1e-11 });
    assert.ok(st.converged && st.relDiv < 1e-8, `${id} ${g.nx}×${g.ny}: relDiv ${st.relDiv}`);
    // PROJECT_INTERACTIVE (plain multigrid to 1e-4) from a cold start: three
    // cycles (one per step once warm-started), at least a thousandfold drop
    // in the divergence.
    g.u.set(u0);
    g.v.set(v0);
    g.p.fill(0);
    const fast = J.project(g, J.PROJECT_INTERACTIVE);
    assert.ok(fast.converged && fast.iters <= 4 && fast.relDiv < 1e-3, `${id}: interactive ${fast.iters} cycles, relDiv ${fast.relDiv}`);
  }
  assert.deepEqual(J.PROJECT_INTERACTIVE, { method: 'multigrid', tol: 1e-4 });
});

test('projection is orthogonal in the face inner product: |u*|² = |u|² + |G p|² with walls, open sides and periodic sides', () => {
  const g0 = J.PROJECTION_PRESETS['random-box'].make(48);
  const sides = [
    ['random-box', g0],
    ['open', G.macGrid(32, 24, 1 / 32, { bc: 'open' })],
    ['right open', G.macGrid(32, 24, 1 / 32, { bc: { right: 'open' } })],
    ['periodic x, open y', G.macGrid(32, 24, 1 / 32, { bc: { left: 'periodic', right: 'periodic', bottom: 'open', top: 'open' } })],
    ['wall + solid', G.macGrid(32, 24, 1 / 32, { bc: 'wall' })],
  ];
  G.setSolid(sides[4][1], (x, y) => (x - 0.5) ** 2 + (y - 0.4) ** 2 < 0.03);
  const rand = rng(4);
  for (const [id, g] of sides) {
    if (id !== 'random-box') {
      for (let k = 0; k < g.u.length; k++) g.u[k] = 2 * rand() - 1;
      for (let k = 0; k < g.v.length; k++) g.v[k] = 2 * rand() - 1;
      G.enforceBoundary(g);
    }
    const u0 = Float64Array.from(g.u);
    const v0 = Float64Array.from(g.v);
    J.project(g, { tol: 1e-12, warm: false });
    const gu = Float64Array.from(u0, (v, k) => v - g.u[k]);
    const gv = Float64Array.from(v0, (v, k) => v - g.v[k]);
    const e0 = G.faceDot(g, u0, v0, u0, v0);
    const e1 = G.faceDot(g, g.u, g.v, g.u, g.v);
    const e2 = G.faceDot(g, gu, gv, gu, gv);
    assert.ok(Math.abs(e0 - e1 - e2) < 1e-9 * e0, `${id}: ${e0} vs ${e1} + ${e2}`);
    assert.ok(Math.abs(G.faceDot(g, g.u, g.v, gu, gv)) < 1e-9 * e0, `${id}: cross term`);
    assert.ok(e1 < e0, `${id}: energy removed`);
  }
  // faceDot is twice the kinetic energy ½Σ|u|² h²: a uniform flow (1, 0) in a
  // periodic unit square gives 1 (each periodic face counted once), and in a
  // walled one too (the half-weighted boundary faces make up the trapezoid rule).
  for (const bc of ['periodic', { left: 'open', right: 'open' }]) {
    const g = G.macGrid(16, 16, 1 / 16, { bc });
    g.u.fill(1);
    assert.ok(Math.abs(G.faceDot(g, g.u, g.v, g.u, g.v) - 1) < 1e-12, JSON.stringify(bc));
  }
});

test('Helmholtz–Hodge: recovers a known split; parts are orthogonal, divergence-free and curl-free', () => {
  const nx = 48;
  const ny = 32;
  const h = 1 / nx;
  const su = nx + 1;
  const g = G.macGrid(nx, ny, h, { bc: 'periodic' });
  const rand = rng(9);
  // Known parts: curl ψ0 (ψ0 random at corners), G φ0 (φ0 random), mean (U0, V0).
  const psi0 = new Float64Array((nx + 1) * (ny + 1));
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) psi0[i + j * su] = 0.01 * (rand() - 0.5);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) psi0[i + j * su] = psi0[(i % nx) + (j % ny) * su];
  const phi0 = Float64Array.from({ length: nx * ny }, () => 0.01 * (rand() - 0.5));
  const [U0, V0] = [0.3, -0.2];
  const cu = new Float64Array(g.u.length);
  const cv = new Float64Array(g.v.length);
  G.velocityFromStreamfunction(g, psi0, cu, cv);
  const gu = new Float64Array(g.u.length);
  const gv = new Float64Array(g.v.length);
  G.gradient(g, phi0, gu, gv);
  const u = Float64Array.from(cu, (v, k) => v + gu[k] + U0);
  const v = Float64Array.from(cv, (w, k) => w + gv[k] + V0);
  const hh = J.helmholtzHodge(u, v, nx, ny, h, { tol: 1e-12 });
  const scale = Math.max(normInf(u), normInf(v));
  assert.ok(Math.abs(hh.meanU - U0) < 1e-12 && Math.abs(hh.meanV - V0) < 1e-12);
  assert.ok(maxAbsDiff(hh.curlFreeU, gu) < 1e-8 * scale && maxAbsDiff(hh.curlFreeV, gv) < 1e-8 * scale, 'curl-free part = G φ0');
  assert.ok(maxAbsDiff(hh.divFreeU, cu.map((x) => x + U0)) < 1e-8 * scale, 'divergence-free part = curl ψ0 + mean');
  // Orthogonal in the face inner product.
  const a = G.faceDot(g, hh.divFreeU, hh.divFreeV, hh.divFreeU, hh.divFreeV);
  const c = G.faceDot(g, hh.curlFreeU, hh.curlFreeV, hh.curlFreeU, hh.curlFreeV);
  assert.ok(Math.abs(G.faceDot(g, hh.divFreeU, hh.divFreeV, hh.curlFreeU, hh.curlFreeV)) < 1e-10 * Math.sqrt(a * c));
  // Divergence-free part: zero divergence. Curl-free part: zero vorticity.
  assert.ok(normInf(G.divergence(g, new Float64Array(nx * ny), hh.divFreeU, hh.divFreeV)) < 1e-8 * scale / h);
  const w = G.vorticityCorners(g, new Float64Array((nx + 1) * (ny + 1)), hh.curlFreeU, hh.curlFreeV);
  assert.ok(normInf(w) < 1e-8 * scale / h);
  // The streamfunction reproduces the divergence-free part minus its mean.
  G.velocityFromStreamfunction(g, hh.psi, cu, cv);
  assert.ok(maxAbsDiff(cu.map((x) => x + U0), hh.divFreeU) < 1e-8 * scale);
  assert.ok(maxAbsDiff(cv.map((x) => x + V0), hh.divFreeV) < 1e-8 * scale);

  // Odd size, with a reused grid (the ψ operator is cached on it).
  const n = 31;
  const go = G.macGrid(n, n, 1 / n, { bc: 'periodic' });
  const uo = Float64Array.from({ length: (n + 1) * n }, () => rand() - 0.5);
  const vo = Float64Array.from({ length: n * (n + 1) }, () => rand() - 0.5);
  for (let pass = 0; pass < 2; pass++) {
    const ho = J.helmholtzHodge(uo, vo, n, n, 1 / n, { grid: go, tol: 1e-11 });
    const d = G.divergence(go, new Float64Array(n * n), ho.divFreeU, ho.divFreeV);
    assert.ok(normInf(d) < 1e-8 * n, `31² divergence ${normInf(d)}`);
    const su2 = n + 1;
    const pu = new Float64Array((n + 1) * n);
    const pv = new Float64Array(n * (n + 1));
    G.velocityFromStreamfunction(go, ho.psi, pu, pv);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) assert.ok(Math.abs(pu[i + j * su2] + ho.meanU - ho.divFreeU[i + j * su2]) < 1e-8);
  }
});

test('the wide-stencil periodic Laplacian has a 4-dimensional null space (the four parity modes); the compact one has 1', () => {
  const nx = 8;
  const ny = 8;
  const n = nx * ny;
  const modes = [
    (i, j) => 1,
    (i, j) => (i % 2 ? -1 : 1),
    (i, j) => (j % 2 ? -1 : 1),
    (i, j) => ((i + j) % 2 ? -1 : 1),
  ].map((f) => Float64Array.from({ length: n }, (_, c) => f(c % nx, Math.floor(c / nx))));
  const out = new Float64Array(n);
  for (const m of modes) {
    G.wideLaplacian(m, nx, ny, 1, out);
    assert.ok(normInf(out) === 0, 'each parity mode is annihilated exactly');
  }
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) assert.equal(modes[a].reduce((s, v, k) => s + v * modes[b][k], 0), 0);
  const wide = denseOf(n, (x, y) => G.wideLaplacian(x, nx, ny, 1, y));
  assert.equal(n - rank(wide), 4);
  const op = P.laplacian(nx, ny, 1, { bc: 'periodic' });
  const compact = denseOf(n, (x, y) => P.applyA(op, x, y));
  assert.equal(n - rank(compact), 1);
  // The checkerboard is the compact operator's stiffest mode, eigenvalue 8/h².
  P.applyA(op, modes[3], out);
  assert.ok(maxAbsDiff(out, modes[3].map((v) => 8 * v)) < 1e-12);
});

test('collocated exact projection zeroes the central divergence but lets checkerboard pressure through', () => {
  const cg = J.collocatedGrid(32, 32);
  J.COLLOCATED_PRESETS.impulse.init(cg);
  const st = J.collocatedProject(cg, { kind: 'exact' });
  assert.ok(st.relDiv < 1e-9, `relative central divergence ${st.relDiv}`);
  // The kick's divergence lives on one parity sub-grid, so does the pressure.
  const live = [0, 0, 0, 0];
  for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) if (cg.p[i + j * 32] !== 0) live[(i % 2) + 2 * (j % 2)]++;
  assert.equal(live.filter((c) => c > 0).length, 1, `sub-grids carrying pressure: ${live}`);
  assert.ok(Math.abs(st.checkerboard - 0.25) < 1e-9);
  // One sub-grid: 3/4 of the pressure's energy is in the three parity modes.
  assert.ok(Math.abs(st.parity.total - 0.75) < 1e-9 && Math.abs(st.parity.oddI - 0.25) < 1e-9, JSON.stringify(st.parity));
  // Sub-grids of odd size (30 = 2·15): the four solves still close exactly.
  const c30 = J.collocatedGrid(30, 30);
  J.COLLOCATED_PRESETS.noise.init(c30);
  const s30 = J.collocatedProject(c30, { kind: 'exact' });
  assert.ok(s30.relDiv < 1e-9, `30²: relative central divergence ${s30.relDiv}`);
  // The compact (approximate) projection has no such mode, but leaves divergence behind.
  const ca = J.collocatedGrid(32, 32);
  J.COLLOCATED_PRESETS.impulse.init(ca);
  const sa = J.collocatedProject(ca, { kind: 'approximate' });
  assert.ok(sa.checkerboard < 0.05, `approximate checkerboard ${sa.checkerboard}`);
  assert.ok(sa.relDiv > 0.1);
  // Exact projection is idempotent; approximate is not.
  for (const kind of ['exact', 'approximate']) {
    const c2 = J.collocatedGrid(32, 32);
    J.COLLOCATED_PRESETS.noise.init(c2);
    J.collocatedProject(c2, { kind });
    const u1 = Float64Array.from(c2.u);
    J.collocatedProject(c2, { kind });
    const d = maxAbsDiff(c2.u, u1) / normInf(u1);
    if (kind === 'exact') assert.ok(d < 1e-9, `exact: ${d}`);
    else assert.ok(d > 1e-2, `approximate: ${d}`);
  }
  // A grid-scale velocity (−1)^i has zero central divergence: nothing removes it.
  const co = J.collocatedGrid(16, 16);
  J.COLLOCATED_PRESETS['odd-even'].init(co);
  const u0 = Float64Array.from(co.u);
  J.collocatedProject(co, { kind: 'exact' });
  assert.deepEqual(Array.from(co.u), Array.from(u0));
});

test('collocated projections are second-order accurate on a smooth field; the approximate one never adds energy', () => {
  // The smooth preset is a Taylor–Green vortex plus a gradient; the vortex is
  // the exact divergence-free part.
  for (const kind of Object.keys(J.COLLOCATED_KINDS)) {
    const errs = [32, 64, 128].map((n) => {
      const cg = J.collocatedGrid(n, n);
      J.COLLOCATED_PRESETS.smooth.init(cg);
      J.collocatedProject(cg, { kind, tol: 1e-12 });
      let e = 0;
      for (let j = 0; j < n; j++) {
        for (let i = 0; i < n; i++) {
          const x = ((i + 0.5) / n) * 2 * Math.PI;
          const y = ((j + 0.5) / n) * 2 * Math.PI;
          const c = i + j * n;
          e = Math.max(e, Math.abs(cg.u[c] - Math.sin(x) * Math.cos(y)), Math.abs(cg.v[c] + Math.cos(x) * Math.sin(y)));
        }
      }
      return e;
    });
    for (const p of observedOrders(errs)) assert.ok(Math.abs(p - J.COLLOCATED_KINDS[kind].order) < 0.1, `${kind}: errors ${errs}, orders ${observedOrders(errs)}`);
  }
  // Approximate projection: ‖P u‖ ≤ ‖u‖, and repeating it lowers the central divergence.
  const cg = J.collocatedGrid(32, 32);
  J.COLLOCATED_PRESETS.noise.init(cg);
  let prevNorm = Math.hypot(...cg.u, ...cg.v);
  let prevDiv = Infinity;
  for (let k = 0; k < 5; k++) {
    const st = J.collocatedProject(cg, { kind: 'approximate', tol: 1e-12 });
    const nrm = Math.hypot(...cg.u, ...cg.v);
    assert.ok(nrm <= prevNorm * (1 + 1e-12), `pass ${k}: norm grew`);
    assert.ok(st.divAfter.l2 < prevDiv, `pass ${k}: divergence ${st.divAfter.l2}`);
    prevNorm = nrm;
    prevDiv = st.divAfter.l2;
  }
});

test('approximate projection: the central divergence left behind is (L − D_c G_c) φ, O(h²) on smooth fields', () => {
  const rel = [16, 32, 64].map((n) => {
    const cg = J.collocatedGrid(n, n);
    J.COLLOCATED_PRESETS.smooth.init(cg);
    return J.collocatedProject(cg, { kind: 'approximate', tol: 1e-12 }).relDiv;
  });
  for (const p of observedOrders(rel)) assert.ok(p > 1.9 && p < 2.1, `orders ${observedOrders(rel)}`);
  // The identity behind it: L φ = D_c u*, u = u* − G_c φ, so D_c u = (L − D_c G_c) φ
  // with L the compact Laplacian (−A) and D_c G_c the wide one.
  const n = 32;
  const h = 1 / n;
  const cg = J.collocatedGrid(n, n);
  J.COLLOCATED_PRESETS.noise.init(cg);
  J.collocatedProject(cg, { kind: 'approximate', tol: 1e-13 });
  const dc = G.centralDivergence(cg.u, cg.v, n, n, h, new Float64Array(n * n));
  const op = P.laplacian(n, n, h, { bc: 'periodic' });
  const Lphi = P.applyA(op, cg.p, new Float64Array(n * n)).map((x) => -x);
  const Wphi = G.wideLaplacian(cg.p, n, n, h, new Float64Array(n * n));
  const want = Lphi.map((x, c) => x - Wphi[c]);
  assert.ok(maxAbsDiff(dc, want) < 1e-9 * normInf(dc), `|D_c u − (L − D_cG_c)φ| = ${maxAbsDiff(dc, want)} (scale ${normInf(dc)})`);
  // The opposite sign is far off (it is what the TeX once said).
  assert.ok(maxAbsDiff(dc, Wphi.map((x, c) => x - Lphi[c])) > normInf(dc));
  assert.ok(J.COLLOCATED_KINDS.approximate.tex.includes('(\\mathrm{L} - \\mathrm{D}_c\\mathrm{G}_c)'));
});

test('Rhie–Chow faces: exactly divergence-free fluxes that feel the checkerboard', () => {
  const ca = J.collocatedGrid(32, 32);
  const cr = J.collocatedGrid(32, 32);
  J.COLLOCATED_PRESETS.noise.init(ca);
  J.COLLOCATED_PRESETS.noise.init(cr);
  J.collocatedProject(ca, { kind: 'approximate' });
  const st = J.collocatedProject(cr, { kind: 'rhie-chow' });
  assert.ok(st.faceDivAfter.max < 1e-9 * st.divBefore.max, `face divergence ${st.faceDivAfter.max}`);
  assert.ok(maxAbsDiff(ca.u, cr.u) < 1e-12 && maxAbsDiff(ca.p, cr.p) < 1e-12, 'centres match the approximate projection');
  // The Rhie–Chow bracket G_f φ − avg(G_c φ): 2a/h for a checkerboard, O(h²) for smooth φ.
  const n0 = 16;
  const c0 = J.collocatedGrid(n0, n0);
  const checker = Float64Array.from({ length: n0 * n0 }, (_, c) => ((c % n0) + Math.floor(c / n0)) % 2 ? -0.5 : 0.5);
  assert.ok(Math.abs(J.rhieChowTerm(c0, checker) - 2 * 0.5 * n0) < 1e-9);
  const smooth = [16, 32, 64].map((n) => {
    const c = J.collocatedGrid(n, n);
    const phi = Float64Array.from({ length: n * n }, (_, k) => Math.sin((TAU * ((k % n) + 0.5)) / n) * Math.cos((TAU * (Math.floor(k / n) + 0.5)) / n));
    return J.rhieChowTerm(c, phi);
  });
  for (const p of observedOrders(smooth)) assert.ok(p > 1.9 && p < 2.1, `RC term orders ${observedOrders(smooth)}`);
});
