// Chapter 10 (pressure) kernel: what happens when a pure-Neumann pressure
// problem has no solution.
//
// On a closed box every side is a wall, so the pressure Poisson operator
// A = −∇²_h (poisson.js) has the constants in its null space: A·1 = 0, and
// because A is symmetric, 1ᵀA = 0 as well. A x = b can then be solved only if
// Σ_c b_c = 0 (the compatibility condition). For the projection,
// b = −D u*/s, and Σ_c (D u*)_c h² telescopes to the net volume flux out
// through the boundary faces, so the condition says: as much fluid must leave
// the box as enters it.
//
// The course's shared solvers (poisson.js) always make b compatible first,
// subtracting its mean (the least-squares fix, reported as rhsMean). This
// file keeps the raw iteration so the chapter can show what that fix
// prevents:
//
//   naiveJacobi(op, b, opts)  weighted Jacobi x ← x + ω D⁻¹(b − A x) with NO
//                             compatibility projection and no gauge fix: a
//                             generator yielding {t:'iter', k, residual,
//                             mean, weighted} after every sweep, returning
//                             {x, iters, residuals, means, weighted}.
//   For an incompatible b the residual cannot fall below |b̄|·√N (N active
//   cells, b̄ the mean of b), because Σ_c r_c = Σ_c b_c for every x. The
//   iterate drifts: the diagonal-weighted sum W(x) = Σ_c d_c x_c changes by
//   exactly ω Σ_c b_c per sweep (d_c = A's diagonal), since dᵀD⁻¹(b − A x)
//   = 1ᵀ(b − A x) = 1ᵀb. So the pressure level climbs (or sinks) for ever,
//   linearly in the sweep count, while its shape settles.
//   With a compatible b the same iteration converges (slowly, as Jacobi does)
//   and W(x) stays at its starting value.
//
//   boundaryInflow(g)         net volume flux INTO a MAC grid's domain
//                             through its boundary faces, per unit depth:
//                             h·(Σ u_left − Σ u_right + Σ v_bottom − Σ v_top)
//                             over faces next to fluid cells. Equals
//                             −Σ_c (D u)_c h² over fluid cells (the discrete
//                             divergence theorem), which the tests check.
//   compatBox(n, opts)        the chapter's scene: an n × n box (h = 1/n) with
//                             an inflow of speed opts.inflow through the left
//                             wall and, on the right, either a wall with a
//                             prescribed outflow opts.outflow or an open side
//                             (p = 0 outside). Interior velocity zero: u* is
//                             the boundary data alone.
//
// Units: as grid2d.js (lengths in box widths, h = 1/n); the projection scale
// s = Δt/ρ is 1, so b = −D u*.
// Sources: the compatibility condition for the Neumann problem, e.g.
// R. J. LeVeque (2007), Finite Difference Methods for Ordinary and Partial
// Differential Equations, SIAM, §2.12; R. Bridson (2015), Fluid Simulation
// for Computer Graphics, 2nd ed., CRC Press, ch. 5 (closed domains);
// Jacobi iteration: Y. Saad (2003), Iterative Methods for Sparse Linear
// Systems, 2nd ed., SIAM, ch. 4 (singular systems: ch. 4 exercises).

import { applyA } from './poisson.js';
import { macGrid, enforceBoundary } from './grid2d.js';

// Net volume flux into the domain through its boundary faces (per unit depth).
export function boundaryInflow(g) {
  const { nx, ny, h, solid } = g;
  const su = nx + 1;
  let q = 0;
  if (!g.periodicX) {
    for (let j = 0; j < ny; j++) {
      if (!solid[j * nx]) q += g.u[j * su];
      if (!solid[nx - 1 + j * nx]) q -= g.u[nx + j * su];
    }
  }
  if (!g.periodicY) {
    for (let i = 0; i < nx; i++) {
      if (!solid[i]) q += g.v[i];
      if (!solid[i + (ny - 1) * nx]) q -= g.v[i + ny * nx];
    }
  }
  return q * h;
}

// The compatibility scene: inflow through the left wall; on the right a wall
// with a prescribed outflow speed, or an open side.
//   opts.inflow  (default 1), opts.outflow (default 0), opts.right 'wall' | 'open'
export function compatBox(n, opts = {}) {
  const inflow = opts.inflow ?? 1;
  const outflow = opts.outflow ?? 0;
  const right = opts.right ?? 'wall';
  const g = macGrid(n, n, 1 / n, { bc: { left: 'wall', right, bottom: 'wall', top: 'wall' }, wall: { left: inflow, right: right === 'wall' ? outflow : 0 } });
  g.u.fill(0);
  g.v.fill(0);
  return enforceBoundary(g);
}

// Raw weighted Jacobi on A x = b: no compatibility projection, no gauge fix.
//   opts.omega (default 1), opts.maxIter (default 1000), opts.x (initial
//   guess, iterated in place), opts.tol (relative residual to stop at,
//   default 0: run all sweeps), opts.history (default true).
export function* naiveJacobi(op, b, opts = {}) {
  const omega = opts.omega ?? 1;
  const maxIter = opts.maxIter ?? 1000;
  const tol = opts.tol ?? 0;
  const { n, active, invDiag, diag } = op;
  const x = opts.x || new Float64Array(n);
  const r = new Float64Array(n);
  const keep = opts.history !== false;
  let bn = 0;
  let na = 0;
  for (let c = 0; c < n; c++) {
    if (!active[c]) {
      x[c] = 0;
      continue;
    }
    bn += b[c] * b[c];
    na++;
  }
  bn = Math.sqrt(bn) || 1;
  const stats = () => {
    applyA(op, x, r);
    let rr = 0;
    let m = 0;
    let w = 0;
    for (let c = 0; c < n; c++) {
      if (!active[c]) continue;
      const d = b[c] - r[c];
      r[c] = d;
      rr += d * d;
      m += x[c];
      w += diag[c] * x[c];
    }
    return { residual: Math.sqrt(rr) / bn, mean: m / na, weighted: w };
  };
  let s = stats();
  const residuals = keep ? [s.residual] : null;
  const means = keep ? [s.mean] : null;
  const weighted = keep ? [s.weighted] : null;
  let k = 0;
  while (k < maxIter && s.residual > tol) {
    // r holds b − A x from the last stats() call.
    for (let c = 0; c < n; c++) if (active[c]) x[c] += omega * invDiag[c] * r[c];
    k++;
    s = stats();
    if (keep) {
      residuals.push(s.residual);
      means.push(s.mean);
      weighted.push(s.weighted);
    }
    yield { t: 'iter', k, residual: s.residual, mean: s.mean, weighted: s.weighted };
  }
  return { x, iters: k, residuals: residuals || [], means: means || [], weighted: weighted || [] };
}
