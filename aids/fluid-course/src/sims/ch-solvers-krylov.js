// Chapter 11 (solvers) kernel: steepest descent and conjugate gradients on a
// small dense symmetric positive definite system, to show what "conjugate"
// buys. The grid solvers (poisson.js cg, pcg) are the real thing; this file
// exists for the two-unknown picture, where the iterates can be drawn on the
// contours of the energy f(x) = ½ xᵀA x − bᵀx and you can see the zigzag.
//
//   quadratic2(kappa, angle)   a 2 × 2 SPD matrix with eigenvalues 1 and κ,
//                              its stiff axis (eigenvalue κ) at `angle`
//                              radians from the x axis: {A, n: 2, lmin, lmax,
//                              v1, v2} (v1 the eigenvector of 1, v2 of κ).
//   spdMatrix(eigs, seed)      Q diag(eigs) Qᵀ with a seeded random
//                              orthogonal Q (Gram–Schmidt), any size.
//   steepestDescent(A, b, opts) generator: x ← x + α r with α = rᵀr / rᵀA r,
//                              the exact minimiser of f along the residual.
//   conjugateGradient(A, b, opts) generator: Hestenes–Stiefel CG.
//   Both: A is a Float64Array(n·n) (row-major, symmetric), opts {x0, tol
//   (relative residual, default 1e-10), maxIter (default 10 000), precond
//   'none' | 'jacobi'}. With precond 'jacobi' they use the residual scaled by
//   D⁻¹ (preconditioned steepest descent and PCG). They yield
//   {t:'iter', k, x, r, p, alpha, residual, energy} after each step, where x,
//   r and p are views of reused arrays (copy them to keep them), residual is
//   ‖r‖₂/‖r₀‖₂ and energy is the A-norm of the error relative to the start,
//   ‖x − x*‖_A / ‖x₀ − x*‖_A (x* from a direct solve). They return {x, iters,
//   residuals, energies, converged}.
//   sdRate(kappa)              (κ − 1)/(κ + 1): the worst-case factor by which
//                              steepest descent cuts the A-norm error per step
//                              (Kantorovich); reached in 2-D from the start
//                              worstStart2(q).
//   cgBound(kappa, k)          2((√κ − 1)/(√κ + 1))^k, the classical bound on
//                              CG's A-norm error after k steps.
//   energyAt(A, b, x)          f(x) = ½ xᵀA x − bᵀx.
//   solveDense(A, b)           Gaussian elimination with partial pivoting
//                              (the reference answer; small n only).
//
// Sources: M. R. Hestenes & E. Stiefel (1952), J. Res. Nat. Bur. Standards
// 49(6), 409–436; J. R. Shewchuk (1994), An Introduction to the Conjugate
// Gradient Method Without the Agonizing Pain, CMU-CS-94-125 (§6, §9);
// Y. Saad (2003), Iterative Methods for Sparse Linear Systems, 2nd ed., SIAM,
// §5.3 and §6.11 (the convergence bound).

import { rng } from './util.js';

export function quadratic2(kappa, angle = 0) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  // A = 1·v1 v1ᵀ + κ·v2 v2ᵀ with v2 = (c, s), v1 = (−s, c).
  const A = new Float64Array([s * s + kappa * c * c, (kappa - 1) * c * s, (kappa - 1) * c * s, c * c + kappa * s * s]);
  return { A, n: 2, lmin: Math.min(1, kappa), lmax: Math.max(1, kappa), v1: [-s, c], v2: [c, s] };
}

export function spdMatrix(eigs, seed = 1) {
  const n = eigs.length;
  const rand = rng(seed);
  const Q = new Float64Array(n * n);
  for (let k = 0; k < n; k++) {
    // Column k: random, then orthogonalised against the earlier columns.
    for (let i = 0; i < n; i++) Q[i * n + k] = 2 * rand() - 1;
    for (let pass = 0; pass < 2; pass++) {
      for (let m = 0; m < k; m++) {
        let d = 0;
        for (let i = 0; i < n; i++) d += Q[i * n + k] * Q[i * n + m];
        for (let i = 0; i < n; i++) Q[i * n + k] -= d * Q[i * n + m];
      }
    }
    let nn = 0;
    for (let i = 0; i < n; i++) nn += Q[i * n + k] ** 2;
    nn = Math.sqrt(nn);
    for (let i = 0; i < n; i++) Q[i * n + k] /= nn;
  }
  const A = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += Q[i * n + k] * eigs[k] * Q[j * n + k];
      A[i * n + j] = s;
    }
  }
  // Symmetrise exactly.
  for (let i = 0; i < n; i++) for (let j = 0; j < i; j++) A[i * n + j] = A[j * n + i] = 0.5 * (A[i * n + j] + A[j * n + i]);
  return A;
}

export function solveDense(A, b) {
  const n = b.length;
  const M = Float64Array.from(A);
  const x = Float64Array.from(b);
  for (let k = 0; k < n; k++) {
    let piv = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i * n + k]) > Math.abs(M[piv * n + k])) piv = i;
    if (piv !== k) {
      for (let j = 0; j < n; j++) [M[k * n + j], M[piv * n + j]] = [M[piv * n + j], M[k * n + j]];
      [x[k], x[piv]] = [x[piv], x[k]];
    }
    for (let i = k + 1; i < n; i++) {
      const f = M[i * n + k] / M[k * n + k];
      for (let j = k; j < n; j++) M[i * n + j] -= f * M[k * n + j];
      x[i] -= f * x[k];
    }
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = x[i];
    for (let j = i + 1; j < n; j++) s -= M[i * n + j] * x[j];
    x[i] = s / M[i * n + i];
  }
  return x;
}

function matVec(A, x, out) {
  const n = x.length;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += A[i * n + j] * x[j];
    out[i] = s;
  }
  return out;
}

const dot = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

export function energyAt(A, b, x) {
  const t = matVec(A, x, new Float64Array(x.length));
  return 0.5 * dot(x, t) - dot(b, x);
}

// A-norm of x − xs, using scratch t and d.
function aNorm(A, x, xs, d, t) {
  for (let i = 0; i < x.length; i++) d[i] = x[i] - xs[i];
  matVec(A, d, t);
  return Math.sqrt(Math.max(dot(d, t), 0));
}

function start(A, b, opts) {
  const n = b.length;
  const x = new Float64Array(n);
  if (opts.x0) x.set(opts.x0);
  const xs = solveDense(A, b);
  const r = new Float64Array(n);
  const z = new Float64Array(n);
  const p = new Float64Array(n);
  const q = new Float64Array(n);
  const d = new Float64Array(n);
  const t = new Float64Array(n);
  matVec(A, x, q);
  for (let i = 0; i < n; i++) r[i] = b[i] - q[i];
  const inv = new Float64Array(n);
  for (let i = 0; i < n; i++) inv[i] = opts.precond === 'jacobi' ? 1 / A[i * n + i] : 1;
  const r0 = Math.sqrt(dot(r, r)) || 1;
  const e0 = aNorm(A, x, xs, d, t) || 1;
  return { n, x, xs, r, z, p, q, d, t, inv, r0, e0, tol: opts.tol ?? 1e-10, maxIter: opts.maxIter ?? 10000 };
}

export function* steepestDescent(A, b, opts = {}) {
  const S = start(A, b, opts);
  const { n, x, r, z, q, inv } = S;
  const residuals = [Math.sqrt(dot(r, r)) / S.r0];
  const energies = [1];
  let k = 0;
  while (residuals[k] > S.tol && k < S.maxIter) {
    for (let i = 0; i < n; i++) z[i] = inv[i] * r[i];
    matVec(A, z, q);
    const zq = dot(z, q);
    if (!(zq > 0)) break;
    const alpha = dot(r, z) / zq;
    for (let i = 0; i < n; i++) {
      x[i] += alpha * z[i];
      r[i] -= alpha * q[i];
    }
    k++;
    const res = Math.sqrt(dot(r, r)) / S.r0;
    const en = aNorm(A, x, S.xs, S.d, S.t) / S.e0;
    residuals.push(res);
    energies.push(en);
    yield { t: 'iter', k, x, r, p: z, alpha, residual: res, energy: en };
  }
  return { x, iters: k, residuals, energies, converged: residuals[k] <= S.tol };
}

export function* conjugateGradient(A, b, opts = {}) {
  const S = start(A, b, opts);
  const { n, x, r, z, p, q, inv } = S;
  for (let i = 0; i < n; i++) z[i] = inv[i] * r[i];
  p.set(z);
  let rz = dot(r, z);
  const residuals = [Math.sqrt(dot(r, r)) / S.r0];
  const energies = [1];
  let k = 0;
  while (residuals[k] > S.tol && k < S.maxIter) {
    matVec(A, p, q);
    const pq = dot(p, q);
    if (!(pq > 0)) break;
    const alpha = rz / pq;
    for (let i = 0; i < n; i++) {
      x[i] += alpha * p[i];
      r[i] -= alpha * q[i];
    }
    k++;
    const res = Math.sqrt(dot(r, r)) / S.r0;
    const en = aNorm(A, x, S.xs, S.d, S.t) / S.e0;
    residuals.push(res);
    energies.push(en);
    // Report the direction just used, then build the next one.
    yield { t: 'iter', k, x, r, p, alpha, residual: res, energy: en };
    for (let i = 0; i < n; i++) z[i] = inv[i] * r[i];
    const rzNew = dot(r, z);
    const beta = rzNew / rz;
    rz = rzNew;
    for (let i = 0; i < n; i++) p[i] = z[i] + beta * p[i];
  }
  return { x, iters: k, residuals, energies, converged: residuals[k] <= S.tol };
}

export const sdRate = (kappa) => (kappa - 1) / (kappa + 1);

export const cgBound = (kappa, k) => {
  const s = Math.sqrt(kappa);
  return 2 * ((s - 1) / (s + 1)) ** k;
};

// The start from which steepest descent on quadratic2(κ, angle) with b = 0
// is slowest: error components 1/λ along each eigenvector, e = v1 + v2/κ
// (scaled to unit length). Each step then cuts the A-norm error by exactly
// (κ − 1)/(κ + 1).
export function worstStart2(q) {
  const k = q.lmax;
  const x = [q.v1[0] + q.v2[0] / k, q.v1[1] + q.v2[1] / k];
  const s = Math.hypot(x[0], x[1]);
  return [x[0] / s, x[1] / s];
}
