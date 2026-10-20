// The pressure Poisson equation on a cell-centred grid, and the iterative
// solvers the course compares: Jacobi, Gauss–Seidel (lexicographic and
// red–black), SOR, conjugate gradients, preconditioned CG (Jacobi, IC(0),
// MIC(0), multigrid) and a geometric multigrid V-cycle. Also the 1-D model
// problem used to show why smooth error is slow to die.
//
// GRID AND OPERATOR
//   nx × ny cells of side h, cell (i, j) at ((i + ½)h, (j + ½)h), index
//   c = i + j·nx with j = 0 at the bottom. We solve A x = b where
//   A = −∇²_h is the 5-point NEGATIVE Laplacian (so A is symmetric positive
//   (semi-)definite), stored matrix-free as link weights:
//     (A x)_c = diag_c x_c − Σ_{links c–d} w_cd x_d,   w_cd = 1/h² or 0.
//   op.cE[c] is the weight of the link from c to its east neighbour (wrapping
//   on a periodic axis), op.cN[c] to its north neighbour; op.dir[c] is the
//   Dirichlet part of the diagonal; diag = dir + Σ link weights.
//   Boundaries, one type per side ('neumann' | 'dirichlet' | 'periodic'):
//     neumann    zero flux through the boundary face: no link, nothing added.
//     dirichlet  value g on the boundary face, by the ghost value
//                x_ghost = 2g − x_c: adds 2/h² to the diagonal and 2g/h² to b
//                (addDirichletValues does the b part). Second order overall
//                even though the local truncation error at the wall is O(1).
//     periodic   wrap-around links (must pair left/right, bottom/top).
//   Solid cells (opts.solid[c] = 1) are excluded: no unknown, no links into
//   them, zero flux through their faces (Neumann), which is exactly what the
//   MAC projection needs (projection.js). Cells left with no links at all are
//   inactive too.
//
// NULL SPACE
//   A connected group of active cells that touches no Dirichlet face has the
//   constants in its null space (pure Neumann or periodic problems). The
//   solvers copy b, project it onto the range (subtract its mean on each such
//   component: the least-squares fix if b was incompatible, reported as
//   rhsMean), iterate, and finally fix the gauge by giving x zero mean on each
//   singular component. Components are found by flood fill, so a solid wall
//   that splits the domain is handled.
//
// SOLVERS (generators; drain() them or animate their events)
//   jacobi(op, b, opts), gaussSeidel, redBlackGS, sor, cg, pcg, multigrid, mgpcg,
//   all with the same shape. opts:
//     x        initial guess, overwritten with the solution (warm start);
//              zeros when omitted
//     tol      stop when ‖b − A x‖₂ ≤ max(tol·‖b‖₂, atol) (tol default 1e-6)
//     atol     absolute floor (default 0); without one, a right-hand side
//              that is already round-off cannot meet a relative tolerance
//     maxIter  iteration cap
//     trace    'cells' → also yield {t:'op', op:'relax', cell, value, level,
//              colour?} for every relaxed cell, in sweep order, after each
//              sweep (value = what the cell received; colour for red–black;
//              small grids only); any truthy value → multigrid also yields
//              {t:'op', op:'smooth', level, sweep, pre} after each smoothing
//              sweep (pre: true before the coarse correction, false after)
//              and {t:'op', op:'restrict'|'prolong'|'coarse-solve', level}
//     history  false → do not keep the residual history array
//   Events: {t:'iter', k, residual, work} after each iteration (residual is
//   the relative 2-norm); multigrid yields {t:'enter', kind:'level', level,
//   nx, ny, label} … {t:'leave', kind:'level', level} around the work on each
//   level of every V-cycle (also inside mgpcg).
//   Every solver returns {x, iters, residuals, work, converged, method, rhsMean}
//   with residuals[0] the initial relative residual and residuals[k] after
//   iteration k.
//   WORK is counted in fine-grid sweep equivalents: one 5-point stencil pass
//   over the fine grid (a relaxation sweep, a matrix–vector product, or the
//   pair of triangular solves of IC(0)) is 1; a pass on multigrid level l
//   costs n_l/n_0. Dot products, vector updates, diagonal scaling and the
//   residual evaluated only to monitor a stationary method are not counted.
//   Per iteration: Jacobi, GS, RBGS, SOR 1; CG 1; PCG-Jacobi 1; PCG-IC 2;
//   multigrid V(ν1,ν2) ≈ 1 + (ν1+ν2+1)·4/3 (the residual plus the cycle);
//   MGPCG the same, one matrix–vector product plus one cycle (CG updates the
//   residual recursively, so the cycle needs no residual of its own). With
//   V(2,2) both are ≈ 7.7 (SOLVERS[m].work).
//   WORKSPACES. The IC factor and the multigrid hierarchy (coarse operators,
//   transfer weights) are cached on the operator. The vectors a solve works
//   in (copy of b, residual, CG directions, per-level multigrid vectors,
//   trace buffer) are a workspace that each solver generator takes from the
//   operator's pool when it starts and returns when it finishes. So
//   back-to-back solves allocate nothing big, and several generators alive
//   at once on one operator (a side-by-side race, stepped one iteration per
//   frame each) never share vectors. An operator is immutable: build a new
//   one when the mask or boundaries change.
//
// PERFORMANCE
//   The sweeps, applyA and residual have a fast path for "uniform" cells
//   (op.uni[c] = 1: interior, all four links 1/h², no Dirichlet face), where
//   the stencil is evaluated without loading coefficients; other cells use
//   the general link-weight form. Both give the same numbers. The sweeps are
//   plain functions. With trace 'cells' they also record (cell, value) into a
//   preallocated buffer, and the solver generator replays the buffer as
//   events after the sweep, so traced and untraced runs execute identical
//   arithmetic. Node 20 on a desktop, 128², closed box, tol 1e-4 (cold start,
//   cached operator): multigrid (3 cycles) ≈ 2.3 ms, mgpcg (4 iterations)
//   ≈ 4.4 ms, pcg-mic0 (46) ≈ 18 ms, pcg-ic0 (102) ≈ 40 ms, SOR (307)
//   ≈ 53 ms, cg (341) ≈ 81 ms, pcg-jacobi ≈ 94 ms, Jacobi (ω = 0.8)/GS/RBGS
//   2–3 s. A mid-range phone is 3–5× slower.
//
// MULTIGRID (cell-centred; Briggs, Henson & McCormick 2000; Trottenberg,
// Oosterlee & Schüller 2001; McAdams, Sifakis & Teran 2010 for MGPCG)
//   Coarsening pairs cells, nx → ⌈nx/2⌉ and ny → ⌈ny/2⌉, while both sides are
//   at least 4, so the coarsest grid has 2 or 3 cells on its short side. On
//   an odd side the last coarse column (row) holds a single fine column
//   (row): a half-width cell. The coarse operator is rediscretised, not
//   Galerkin: the finite-volume 5-point operator on the actual coarse cells,
//   where a link carries (open face length)/(distance between centres) and a
//   Dirichlet face (face length)/(distance to the wall). On an even,
//   obstacle-free box this is exactly the 5-point stencil at spacing 2h; a
//   coarse face is as open as the fine faces under it, which is a cheap
//   approximation around solids; on odd sizes it keeps the walls where they
//   are, so odd grids converge as fast as even ones. Restriction is the
//   average of the four children ('average', a quarter of their sum for a
//   half cell) or the transpose of the prolongation divided by 4
//   ('transpose', used by mgpcg for symmetry). Prolongation is cell-centred
//   bilinear between the actual coarse centres (weights 9/16, 3/16, 3/16,
//   1/16 on a uniform grid) or piecewise constant. Near walls the missing
//   coarse neighbour is replaced by the parent (Neumann/solid) or minus the
//   parent mirrored across the wall (Dirichlet). Smoothers: red–black
//   Gauss–Seidel (default), weighted Jacobi (ω = 4/5, the best 2-D smoother
//   weight), or lexicographic GS. The coarsest grid is solved by CG to 1e-12
//   (relative) in its own workspace; with maxLevels: 1 that is a full CG
//   solve per cycle.
//   Smoothing order (opts.symmetric): standalone multigrid runs red then black
//   both before and after the coarse correction (symmetric = false). Running
//   the post-smoother black-then-red instead makes the cycle symmetric, which
//   mgpcg needs (it sets symmetric = true), but as a standalone solver it is
//   slower: the next cycle's first red half-sweep then repeats work. Measured
//   on the closed box, V(2,2) bilinear: 0.08 per cycle with red–black–red–
//   black, 0.155 with the symmetric order. The 'gs' smoother is not
//   symmetrised (no backward post-sweep): use 'rbgs' or 'jacobi' inside mgpcg.
//   Measured V(2,2) convergence factors (closed box, bilinear, RBGS): 0.069,
//   0.081, 0.082, 0.084, 0.084 at n = 32, 64, 128, 256, 512; odd and uneven
//   sizes alike (0.075 at 33², 0.078 at 63², 0.086 at 97², 0.079 at 100×75;
//   periodic odd sizes up to 0.125); around a disc obstacle 0.10–0.17 on
//   square grids and up to 0.28 on a small uneven one (48×27), because the
//   rediscretised coarse operators only approximate the cut cells; mgpcg
//   absorbs that (7–10 iterations to 1e-10 at every size).
//   Note: bilinear prolongation + averaging restriction satisfies the
//   transfer-order rule m_P + m_R > 2 for a second-order operator (Hemker
//   1990); piecewise-constant + averaging (1 + 1) does not. The penalty shows
//   with light smoothing: V(1,1) with a Jacobi smoother converges with
//   bilinear prolongation and diverges with constant. With V(2,2) red–black
//   smoothing the extra smoothing hides it, and on the obstacle preset the
//   constant version is even slightly faster (it never extrapolates across
//   a solid). That is a lesson, not a bug.
//
// IC(0) / MIC(0) (Meijerink & van der Vorst 1977; Gustafsson 1978; Bridson
// 2015 §5.4, whose fluid-pressure form we follow: tuning τ = 0.97 for MIC,
// safety σ = 0.25). Lexicographic order; periodic wrap-around links are left
// out of the factor (M then approximates A without them; still SPD).
//   τ is the share of the dropped fill put back on the diagonal. Gustafsson's
// O(√n) iteration count (κ(M⁻¹A) = O(n) instead of O(n²)) is for the full
// modification τ = 1 on a box: measured to 1e-6 on the Dirichlet model
// problem, 13, 19, 27, 39, 57, 82 iterations at n = 16 … 512 (slope ≈ 0.53).
// Bridson's τ = 0.97, the default here, keeps 3% of the dropped fill out,
// which is more robust around solids and on periodic grids (where τ = 1
// behaves like IC(0)), but once (1 − τ) outweighs h² it drifts back towards
// O(n): 12, 17, 26, 48, 88, 158 on the same problem (slope ≈ 0.55 up to 64²,
// ≈ 0.85 beyond). Pass opts.tau = 1 to show the √n law on fine grids.
//
// 1-D MODEL PROBLEM (Briggs et al. 2000 ch. 2; LeVeque 2007 ch. 4)
//   n interior points on [0, 1], h = 1/(n + 1), homogeneous Dirichlet ends,
//   A = tridiag(−1, 2, −1)/h². smooth1d() iterates on A e = 0, so the iterate
//   IS the error; it decomposes the error into sine modes
//   e_j = Σ_k a_k sin(jkπ/(n+1)) (a discrete sine transform) and reports the
//   amplitude ratio of every mode per sweep. For weighted Jacobi the modes are
//   eigenvectors and the factor is exactly 1 − 2ω sin²(kπ/(2n+2)).
//
// Sources:
//   W. L. Briggs, V. E. Henson & S. F. McCormick (2000), A Multigrid Tutorial,
//     2nd ed., SIAM: ch. 2 (relaxation, mode damping), ch. 3–4 (V-cycle).
//   U. Trottenberg, C. W. Oosterlee & A. Schüller (2001), Multigrid, Academic
//     Press (cell-centred grids and transfer operators).
//   P. W. Hemker (1990), On the order of prolongations and restrictions in
//     multigrid procedures, J. Comput. Appl. Math. 32, 423–429.
//   R. J. LeVeque (2007), Finite Difference Methods for Ordinary and Partial
//     Differential Equations, SIAM: ch. 3 (5-point Laplacian), ch. 4
//     (Jacobi, Gauss–Seidel, SOR, CG, multigrid).
//   D. M. Young (1971), Iterative Solution of Large Linear Systems, Academic
//     Press (optimal SOR, ω = 2/(1 + √(1 − ρ_J²))).
//   Y. Saad (2003), Iterative Methods for Sparse Linear Systems, 2nd ed.,
//     SIAM: ch. 4 (relaxation), ch. 6 and 9 (CG, PCG), ch. 10 (IC/ILU).
//   M. R. Hestenes & E. Stiefel (1952), J. Res. Nat. Bur. Standards 49(6),
//     409–436 (CG). J. R. Shewchuk (1994), An Introduction to the Conjugate
//     Gradient Method Without the Agonizing Pain, CMU-CS-94-125.
//   J. A. Meijerink & H. A. van der Vorst (1977), Math. Comp. 31(137),
//     148–162 (incomplete Cholesky). I. Gustafsson (1978), BIT 18, 142–156
//     (modified incomplete factorization).
//   R. Bridson (2015), Fluid Simulation for Computer Graphics, 2nd ed., CRC
//     Press, ch. 5 (pressure solve, MICCG(0)).
//   A. McAdams, E. Sifakis & J. Teran (2010), A parallel multigrid Poisson
//     solver for fluids simulation on large grids, Proc. SCA 2010 (MGPCG).

import { rng } from './util.js';

const SIDES = ['left', 'right', 'bottom', 'top'];
const PRESSURE_BC = { neumann: 1, dirichlet: 1, periodic: 1 };

function normaliseBc(bc) {
  const out = {};
  for (const s of SIDES) {
    const t = typeof bc === 'string' ? bc : bc[s] ?? 'neumann';
    if (!PRESSURE_BC[t]) throw new Error(`poisson: unknown boundary '${t}' on ${s}`);
    out[s] = t;
  }
  if ((out.left === 'periodic') !== (out.right === 'periodic')) throw new Error('poisson: periodic must pair left/right');
  if ((out.bottom === 'periodic') !== (out.top === 'periodic')) throw new Error('poisson: periodic must pair bottom/top');
  return out;
}

// ---------------------------------------------------------------------------
// Operator

// Build the 5-point operator A = −∇²_h.
//   opts.bc     'neumann' (default) | 'dirichlet' | 'periodic', or per side
//               { left, right, bottom, top }
//   opts.solid  Uint8Array(nx·ny), 1 = excluded cell (zero-flux faces)
export function laplacian(nx, ny, h = 1, opts = {}) {
  if (!(nx >= 2 && ny >= 2)) throw new Error('poisson: need nx, ny >= 2');
  const bc = normaliseBc(opts.bc ?? 'neumann');
  const periodicX = bc.left === 'periodic';
  const periodicY = bc.bottom === 'periodic';
  const solid = opts.solid || null;
  const n = nx * ny;
  const ih2 = 1 / (h * h);
  const cE = new Float64Array(n);
  const cN = new Float64Array(n);
  const dir = new Float64Array(n);
  const open = (c) => !solid || !solid[c];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (!open(c)) continue;
      if (i < nx - 1) {
        if (open(c + 1)) cE[c] = ih2;
      } else if (periodicX) {
        if (open(j * nx)) cE[c] = ih2;
      } else if (bc.right === 'dirichlet') dir[c] += 2 * ih2;
      if (i === 0 && !periodicX && bc.left === 'dirichlet') dir[c] += 2 * ih2;
      if (j < ny - 1) {
        if (open(c + nx)) cN[c] = ih2;
      } else if (periodicY) {
        if (open(i)) cN[c] = ih2;
      } else if (bc.top === 'dirichlet') dir[c] += 2 * ih2;
      if (j === 0 && !periodicY && bc.bottom === 'dirichlet') dir[c] += 2 * ih2;
    }
  }
  return finishOperator({ nx, ny, h, n, bc, periodicX, periodicY, cE, cN, dir, level: 0 });
}

// Diagonal, active mask and null-space components from the link weights.
function finishOperator(op) {
  const { nx, ny, n, cE, cN, dir } = op;
  const diag = new Float64Array(n);
  const invDiag = new Float64Array(n);
  const active = new Uint8Array(n);
  // uni[c] = 1 for an interior cell (no wrap-around neighbours) whose four
  // links are all 1/h² and that has no Dirichlet face: the plain 5-point
  // stencil, which the sweeps evaluate without loading coefficients.
  const uni = new Uint8Array(n);
  const ih2 = 1 / (op.h * op.h);
  let nActive = 0;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    const rowS = (j > 0 ? j - 1 : ny - 1) * nx;
    for (let i = 0; i < nx; i++) {
      const c = row + i;
      const w = i > 0 ? c - 1 : row + nx - 1;
      const d = dir[c] + cE[c] + cE[w] + cN[c] + cN[rowS + i];
      diag[c] = d;
      if (d > 0) {
        active[c] = 1;
        invDiag[c] = 1 / d;
        nActive++;
        if (i > 0 && i < nx - 1 && j > 0 && j < ny - 1 && dir[c] === 0 && cE[c] === ih2 && cE[w] === ih2 && cN[c] === ih2 && cN[rowS + i] === ih2) uni[c] = 1;
      }
    }
  }
  // Connected components through links; a component is singular when no cell
  // in it has a Dirichlet face.
  const comp = new Int32Array(n).fill(-1);
  const stack = new Int32Array(n);
  const sizes = [];
  const sing = [];
  let ncomp = 0;
  for (let s0 = 0; s0 < n; s0++) {
    if (!active[s0] || comp[s0] >= 0) continue;
    const id = ncomp++;
    let top = 0;
    let size = 0;
    let hasDir = false;
    stack[top++] = s0;
    comp[s0] = id;
    while (top > 0) {
      const c = stack[--top];
      size++;
      if (dir[c] > 0) hasDir = true;
      const i = c % nx;
      const j = (c - i) / nx;
      const e = i < nx - 1 ? c + 1 : c - i;
      const w = i > 0 ? c - 1 : c - i + nx - 1;
      const nn = j < ny - 1 ? c + nx : i;
      const s = j > 0 ? c - nx : i + (ny - 1) * nx;
      if (cE[c] > 0 && comp[e] < 0) (comp[e] = id), (stack[top++] = e);
      if (cE[w] > 0 && comp[w] < 0) (comp[w] = id), (stack[top++] = w);
      if (cN[c] > 0 && comp[nn] < 0) (comp[nn] = id), (stack[top++] = nn);
      if (cN[s] > 0 && comp[s] < 0) (comp[s] = id), (stack[top++] = s);
    }
    sizes.push(size);
    sing.push(hasDir ? 0 : 1);
  }
  op.diag = diag;
  op.invDiag = invDiag;
  op.active = active;
  op.uni = uni;
  op.ih2 = ih2;
  op.h2 = op.h * op.h;
  op.nActive = nActive;
  op.comp = comp;
  op.ncomp = ncomp;
  op.compSize = Float64Array.from(sizes);
  op.compSingular = Uint8Array.from(sing);
  op.singular = sing.some((s) => s === 1);
  op._compSum = new Float64Array(ncomp);
  op._pool = [];
  op._cache = {};
  return op;
}

// Per-run workspaces. Each solver generator takes a workspace from its
// operator's pool when it starts and puts it back when it finishes (or is
// closed with return()). Two generators alive at once on the same operator
// (a side-by-side "race" figure) therefore never share vectors, and
// back-to-back solves reuse the same arrays. A generator that is simply
// abandoned keeps its workspace, which is then garbage-collected with it.
function acquire(op) {
  return op._pool.length ? op._pool.pop() : { vec: {}, rec: null, mg: {} };
}

function release(op, ws) {
  op._pool.push(ws);
}

// Vector `name` of length op.n in workspace ws, allocated on first use.
function wsVec(op, ws, name) {
  return ws.vec[name] || (ws.vec[name] = new Float64Array(op.n));
}

// out = A x (zero in inactive cells).
export function applyA(op, x, out) {
  const { nx, ny, cE, cN, diag, uni, ih2 } = op;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    const rowS = (j > 0 ? j - 1 : ny - 1) * nx;
    const rowN = (j < ny - 1 ? j + 1 : 0) * nx;
    for (let i = 0; i < nx; i++) {
      const c = row + i;
      if (uni[c] === 1) {
        out[c] = (4 * x[c] - x[c - 1] - x[c + 1] - x[c - nx] - x[c + nx]) * ih2;
        continue;
      }
      const w = i > 0 ? c - 1 : row + nx - 1;
      const e = i < nx - 1 ? c + 1 : row;
      const s = rowS + i;
      out[c] = diag[c] * x[c] - cE[c] * x[e] - cE[w] * x[w] - cN[c] * x[rowN + i] - cN[s] * x[s];
    }
  }
  return out;
}

// r = b − A x on active cells (0 elsewhere); returns ‖r‖₂.
export function residual(op, x, b, r) {
  const { nx, ny, cE, cN, diag, active, uni, ih2 } = op;
  let ss = 0;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    const rowS = (j > 0 ? j - 1 : ny - 1) * nx;
    const rowN = (j < ny - 1 ? j + 1 : 0) * nx;
    for (let i = 0; i < nx; i++) {
      const c = row + i;
      if (uni[c] === 1) {
        const v = b[c] - (4 * x[c] - x[c - 1] - x[c + 1] - x[c - nx] - x[c + nx]) * ih2;
        r[c] = v;
        ss += v * v;
        continue;
      }
      if (!active[c]) {
        r[c] = 0;
        continue;
      }
      const w = i > 0 ? c - 1 : row + nx - 1;
      const e = i < nx - 1 ? c + 1 : row;
      const s = rowS + i;
      const v = b[c] - (diag[c] * x[c] - cE[c] * x[e] - cE[w] * x[w] - cN[c] * x[rowN + i] - cN[s] * x[s]);
      r[c] = v;
      ss += v * v;
    }
  }
  return Math.sqrt(ss);
}

// Subtract the mean of v on every singular component and zero inactive cells.
// Returns the largest |mean| removed (how incompatible b was).
function projectOutConstants(op, v) {
  const { n, comp, active, compSingular, compSize, ncomp } = op;
  const sum = op._compSum;
  sum.fill(0);
  for (let c = 0; c < n; c++) {
    if (active[c]) sum[comp[c]] += v[c];
    else v[c] = 0;
  }
  let worst = 0;
  for (let k = 0; k < ncomp; k++) {
    sum[k] = compSingular[k] ? sum[k] / compSize[k] : 0;
    worst = Math.max(worst, Math.abs(sum[k]));
  }
  if (op.singular) for (let c = 0; c < n; c++) if (active[c]) v[c] -= sum[comp[c]];
  return worst;
}

// Make b compatible with a singular operator, in place: zero mean on each
// pure-Neumann/periodic component. Returns the largest mean removed.
export function makeCompatible(op, b) {
  return projectOutConstants(op, b);
}

// Fix the gauge of a solution in place: zero mean on each singular component.
export function removeNullspace(op, x) {
  projectOutConstants(op, x);
  return x;
}

// Add the Dirichlet boundary values g(x, y) (evaluated at the boundary face
// centres) to the right-hand side: b_c += 2 g / h² per Dirichlet face.
export function addDirichletValues(op, b, g) {
  const { nx, ny, h, bc, active } = op;
  const s = 2 / (h * h);
  const L = nx * h;
  const T = ny * h;
  for (let j = 0; j < ny; j++) {
    const y = (j + 0.5) * h;
    if (bc.left === 'dirichlet' && active[j * nx]) b[j * nx] += s * g(0, y);
    if (bc.right === 'dirichlet' && active[nx - 1 + j * nx]) b[nx - 1 + j * nx] += s * g(L, y);
  }
  for (let i = 0; i < nx; i++) {
    const x = (i + 0.5) * h;
    if (bc.bottom === 'dirichlet' && active[i]) b[i] += s * g(x, 0);
    if (bc.top === 'dirichlet' && active[i + (ny - 1) * nx]) b[i + (ny - 1) * nx] += s * g(x, T);
  }
  return b;
}

function dot(a, b, n) {
  let s = 0;
  for (let k = 0; k < n; k++) s += a[k] * b[k];
  return s;
}

// ---------------------------------------------------------------------------
// Relaxation sweeps
//
// Plain functions, so the hot loops stay fast. When a trace is wanted they
// fill a recorder with the cells in the order they were relaxed and the value
// each received; the solver generators then replay that as events. Traced and
// untraced runs execute the same loops.

// The workspace's trace recorder, sized for the finest grid of the run (n);
// coarser multigrid levels reuse it.
function recorder(ws, n) {
  const rec = ws.rec && ws.rec.cells.length >= n ? ws.rec : (ws.rec = { cells: new Int32Array(n), vals: new Float64Array(n), len: 0 });
  rec.len = 0;
  return rec;
}

function* replay(op, rec, level, rb) {
  const nx = op.nx;
  for (let k = 0; k < rec.len; k++) {
    const c = rec.cells[k];
    const ev = { t: 'op', op: 'relax', cell: c, value: rec.vals[k], level };
    if (rb) ev.colour = ((c % nx) + ((c / nx) | 0)) & 1;
    yield ev;
  }
}

// Lexicographic Gauss–Seidel / SOR: x_c ← (1−ω) x_c + ω (b_c + Σ w x_nb)/diag.
function relaxLex(op, x, b, omega, rec) {
  const { nx, ny, cE, cN, invDiag, uni, h2 } = op;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    const rowS = (j > 0 ? j - 1 : ny - 1) * nx;
    const rowN = (j < ny - 1 ? j + 1 : 0) * nx;
    for (let i = 0; i < nx; i++) {
      const c = row + i;
      let gs;
      if (uni[c] === 1) gs = 0.25 * (b[c] * h2 + x[c - 1] + x[c + 1] + x[c - nx] + x[c + nx]);
      else {
        const id = invDiag[c];
        if (id === 0) continue;
        const w = i > 0 ? c - 1 : row + nx - 1;
        const e = i < nx - 1 ? c + 1 : row;
        const s = rowS + i;
        gs = (b[c] + cE[c] * x[e] + cE[w] * x[w] + cN[c] * x[rowN + i] + cN[s] * x[s]) * id;
      }
      const v = omega === 1 ? gs : x[c] + omega * (gs - x[c]);
      x[c] = v;
      if (rec !== null) {
        rec.cells[rec.len] = c;
        rec.vals[rec.len++] = v;
      }
    }
  }
}

// Red–black Gauss–Seidel: all cells with (i + j) even ("red", colour 0), then
// all odd ("black"), or the reverse when first = 1. With ω ≠ 1 it is RB-SOR.
function relaxRB(op, x, b, omega, first, rec) {
  const { nx, ny, cE, cN, invDiag, uni, h2 } = op;
  for (let pass = 0; pass < 2; pass++) {
    const colour = pass === 0 ? first : 1 - first;
    for (let j = 0; j < ny; j++) {
      const row = j * nx;
      const rowS = (j > 0 ? j - 1 : ny - 1) * nx;
      const rowN = (j < ny - 1 ? j + 1 : 0) * nx;
      for (let i = (colour + j) & 1; i < nx; i += 2) {
        const c = row + i;
        let gs;
        if (uni[c] === 1) gs = 0.25 * (b[c] * h2 + x[c - 1] + x[c + 1] + x[c - nx] + x[c + nx]);
        else {
          const id = invDiag[c];
          if (id === 0) continue;
          const w = i > 0 ? c - 1 : row + nx - 1;
          const e = i < nx - 1 ? c + 1 : row;
          const s = rowS + i;
          gs = (b[c] + cE[c] * x[e] + cE[w] * x[w] + cN[c] * x[rowN + i] + cN[s] * x[s]) * id;
        }
        const v = omega === 1 ? gs : x[c] + omega * (gs - x[c]);
        x[c] = v;
        if (rec !== null) {
          rec.cells[rec.len] = c;
          rec.vals[rec.len++] = v;
        }
      }
    }
  }
}

// Weighted Jacobi: r = b − A x (skipped when haveR says r is current), then
// x += ω r / diag. Leaves r stale.
function relaxJacobi(op, x, b, omega, r, haveR, rec) {
  if (!haveR) residual(op, x, b, r);
  const { n, invDiag } = op;
  for (let c = 0; c < n; c++) {
    const id = invDiag[c];
    if (id === 0) continue;
    const v = x[c] + omega * r[c] * id;
    x[c] = v;
    if (rec !== null) {
      rec.cells[rec.len] = c;
      rec.vals[rec.len++] = v;
    }
  }
}

// ---------------------------------------------------------------------------
// Shared solver scaffolding

function setup(op, ws, b, opts) {
  const bb = wsVec(op, ws, 'b');
  bb.set(b);
  const rhsMean = projectOutConstants(op, bb);
  const x = opts.x || new Float64Array(op.n);
  for (let c = 0; c < op.n; c++) if (!op.active[c]) x[c] = 0;
  let bn = 0;
  for (let c = 0; c < op.n; c++) bn += bb[c] * bb[c];
  bn = Math.sqrt(bn);
  // b = 0 (after removing the incompatible mean): the answer is x = 0.
  if (bn === 0) x.fill(0);
  const tol = opts.tol ?? 1e-6;
  const atol = opts.atol ?? 0;
  return {
    bb,
    x,
    bn,
    rhsMean,
    tol,
    // Stop when ‖r‖₂ ≤ max(tol·‖b‖₂, atol).
    stop: Math.max(tol * bn, atol),
    // Residuals are reported relative to ‖b‖₂ (absolute when b = 0).
    scale: bn > 0 ? 1 / bn : 1,
    history: opts.history !== false,
    tr: opts.trace === 'cells',
    trAny: !!opts.trace,
  };
}

function finish(op, S, method, iters, residuals, work, lastAbs) {
  if (op.singular) projectOutConstants(op, S.x);
  return { x: S.x, iters, residuals, work, converged: lastAbs <= S.stop, method, rhsMean: S.rhsMean };
}

// A stationary method: one sweep per iteration, true residual after each.
function* stationary(op, b, opts, method, sweep) {
  const ws = acquire(op);
  try {
    const S = setup(op, ws, b, opts);
    const r = wsVec(op, ws, 'r');
    const maxIter = opts.maxIter ?? 200000;
    let abs = residual(op, S.x, S.bb, r);
    const residuals = S.history ? [abs * S.scale] : null;
    let k = 0;
    let work = 0;
    while (abs > S.stop && k < maxIter) {
      const rec = S.tr ? recorder(ws, op.n) : null;
      sweep(S.x, S.bb, r, rec);
      if (rec) yield* replay(op, rec, 0, method === 'red-black' || (method === 'sor' && opts.order === 'redblack'));
      k++;
      work += 1;
      abs = residual(op, S.x, S.bb, r);
      if (residuals) residuals.push(abs * S.scale);
      yield { t: 'iter', k, residual: abs * S.scale, work };
    }
    return finish(op, S, method, k, residuals || [], work, abs);
  } finally {
    release(op, ws);
  }
}

// ---------------------------------------------------------------------------
// Stationary solvers

// Weighted Jacobi, x ← x + ω D⁻¹(b − A x). opts.omega (default 1).
export function* jacobi(op, b, opts = {}) {
  const omega = opts.omega ?? 1;
  // The residual left in r by the previous monitoring step is current, so
  // each iteration costs one stencil pass plus the update.
  return yield* stationary(op, b, opts, 'jacobi', (x, bb, r, rec) => relaxJacobi(op, x, bb, omega, r, true, rec));
}

// Lexicographic Gauss–Seidel (row by row, bottom to top, left to right).
export function* gaussSeidel(op, b, opts = {}) {
  return yield* stationary(op, b, opts, 'gauss-seidel', (x, bb, r, rec) => relaxLex(op, x, bb, 1, rec));
}

// Red–black Gauss–Seidel (all red cells, then all black cells).
export function* redBlackGS(op, b, opts = {}) {
  return yield* stationary(op, b, opts, 'red-black', (x, bb, r, rec) => relaxRB(op, x, bb, 1, 0, rec));
}

// Successive over-relaxation. opts.omega defaults to sorOptimalOmega(op);
// opts.order 'lex' (default) or 'redblack'.
export function* sor(op, b, opts = {}) {
  const omega = opts.omega ?? sorOptimalOmega(op);
  const rb = opts.order === 'redblack';
  return yield* stationary(op, b, opts, 'sor', (x, bb, r, rec) => (rb ? relaxRB(op, x, bb, omega, 0, rec) : relaxLex(op, x, bb, omega, rec)));
}

// Spectral radius of the Jacobi iteration for the obstacle-free model problem
// with this operator's boundary types (Fourier analysis with constant
// diagonal; cell-centred Dirichlet walls make it approximate).
export function jacobiSpectralRadius(op) {
  const theta = (N, lo, hi, skipZero) => {
    // Smallest wavenumber θ = kπ/N allowed by the pair of side conditions.
    const d = (lo === 'dirichlet') + (hi === 'dirichlet');
    if (lo === 'periodic') return skipZero ? (2 * Math.PI) / N : 0;
    if (d === 2) return Math.PI / N;
    if (d === 1) return Math.PI / (2 * N);
    return skipZero ? Math.PI / N : 0;
  };
  const { bc, nx, ny } = op;
  const tx0 = theta(nx, bc.left, bc.right, false);
  const ty0 = theta(ny, bc.bottom, bc.top, false);
  if (tx0 > 0 || ty0 > 0) return 0.5 * (Math.cos(tx0) + Math.cos(ty0));
  const tx1 = theta(nx, bc.left, bc.right, true);
  const ty1 = theta(ny, bc.bottom, bc.top, true);
  return Math.max(0.5 * (Math.cos(tx1) + 1), 0.5 * (1 + Math.cos(ty1)));
}

// Young's optimal SOR factor ω = 2/(1 + √(1 − ρ_J²)). For the square
// Dirichlet model problem with N cells per side (or n = N − 1 interior points
// vertex-centred) this is the textbook 2/(1 + sin(π/N)).
export function sorOptimalOmega(op) {
  const rho = jacobiSpectralRadius(op);
  return 2 / (1 + Math.sqrt(Math.max(0, 1 - rho * rho)));
}

// ---------------------------------------------------------------------------
// Krylov solvers

// Conjugate gradients (Hestenes & Stiefel 1952).
export function* cg(op, b, opts = {}) {
  return yield* pcg(op, b, { ...opts, precond: 'none' });
}

// Preconditioned CG. opts.precond: 'none' | 'jacobi' | 'ic0' | 'mic0' | 'mg'.
// IC options: opts.tau (MIC tuning, default 0.97 for 'mic0'), opts.sigma
// (safety, 0.25). MG options as for multigrid() under opts.mg; the defaults
// make the V-cycle symmetric (RBGS pre red-then-black, post black-then-red,
// i.e. symmetric: true, and transpose restriction). Keep it symmetric: the
// 'gs' smoother is not symmetrised.
export function* pcg(op, b, opts = {}) {
  const precond = opts.precond ?? 'none';
  let ic = null;
  let mg = null;
  let precondWork = 0;
  if (precond === 'ic0' || precond === 'mic0') {
    ic = incompleteCholesky(op, precond === 'mic0' ? opts.tau ?? 0.97 : 0, opts.sigma ?? 0.25);
    precondWork = 1;
  } else if (precond === 'mg') {
    mg = mgSetup(op, { restrict: 'transpose', symmetric: true, ...(opts.mg || {}) });
  } else if (precond !== 'none' && precond !== 'jacobi') throw new Error(`pcg: unknown preconditioner '${precond}'`);
  const ws = acquire(op);
  try {
    const S = setup(op, ws, b, opts);
    const { n } = op;
    const x = S.x;
    const r = wsVec(op, ws, 'r');
    const z = wsVec(op, ws, 'z');
    const p = wsVec(op, ws, 'p');
    const q = wsVec(op, ws, 'q');
    const V = mg ? mgVectors(ws, mg) : null;
    const maxIter = opts.maxIter ?? 4 * n + 20;
    let work = 0;
    // z = M⁻¹ r, with the null space removed on singular problems.
    function* applyM() {
      if (precond === 'none') z.set(r);
      else if (precond === 'jacobi') for (let c = 0; c < n; c++) z[c] = r[c] * op.invDiag[c];
      else if (ic) icSolve(op, ic, r, z);
      else {
        V[0].b.set(r);
        V[0].x.fill(0);
        const st = { work: 0 };
        yield* vcycle(mg, V, 0, st, S.tr ? recorder(ws, n) : null, S.trAny);
        z.set(V[0].x);
        work += st.work;
      }
      work += precondWork;
      if (op.singular) projectOutConstants(op, z);
    }

    let abs = residual(op, x, S.bb, r);
    const residuals = S.history ? [abs * S.scale] : null;
    let k = 0;
    if (abs > S.stop) {
      yield* applyM();
      p.set(z);
      let rz = dot(r, z, n);
      while (k < maxIter) {
        applyA(op, p, q);
        work += 1;
        const pq = dot(p, q, n);
        if (!(pq > 0)) break; // breakdown (exact solution or loss of definiteness)
        const alpha = rz / pq;
        let rr = 0;
        for (let c = 0; c < n; c++) {
          x[c] += alpha * p[c];
          const rc = r[c] - alpha * q[c];
          r[c] = rc;
          rr += rc * rc;
        }
        k++;
        abs = Math.sqrt(rr);
        if (residuals) residuals.push(abs * S.scale);
        yield { t: 'iter', k, residual: abs * S.scale, work };
        if (abs <= S.stop) break;
        yield* applyM();
        const rzNew = dot(r, z, n);
        const beta = rzNew / rz;
        rz = rzNew;
        for (let c = 0; c < n; c++) p[c] = z[c] + beta * p[c];
      }
    }
    const names = { none: 'cg', jacobi: 'pcg-jacobi', ic0: 'pcg-ic0', mic0: 'pcg-mic0', mg: 'mgpcg' };
    return finish(op, S, names[precond], k, residuals || [], work, abs);
  } finally {
    release(op, ws);
  }
}

// MG-preconditioned CG (one symmetric V-cycle per iteration).
export function* mgpcg(op, b, opts = {}) {
  return yield* pcg(op, b, { ...opts, precond: 'mg' });
}

// Incomplete Cholesky factor in Bridson's form: A ≈ (F + E) E⁻¹ (F + E)ᵀ with
// E = diag(1/precon²). Cached on the operator per (τ, σ).
function incompleteCholesky(op, tau, sigma) {
  const key = `ic:${tau}:${sigma}`;
  if (op._cache[key]) return op._cache[key];
  const { nx, ny, cE, cN, diag, active } = op;
  const precon = new Float64Array(op.n);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (!active[c]) continue;
      let e = diag[c];
      if (i > 0) {
        const w = c - 1;
        const a = cE[w] * precon[w];
        const nw = j < ny - 1 ? cN[w] : 0; // west cell's north link (not a wrap link)
        e -= a * a + tau * cE[w] * nw * precon[w] * precon[w];
      }
      if (j > 0) {
        const s = c - nx;
        const a = cN[s] * precon[s];
        const es = i < nx - 1 ? cE[s] : 0; // south cell's east link (not a wrap link)
        e -= a * a + tau * cN[s] * es * precon[s] * precon[s];
      }
      if (e < sigma * diag[c]) e = diag[c];
      precon[c] = 1 / Math.sqrt(e);
    }
  }
  const ic = { tau, sigma, precon, q: new Float64Array(op.n) };
  op._cache[key] = ic;
  return ic;
}

// z = M⁻¹ r by a forward then a backward triangular solve.
function icSolve(op, ic, r, z) {
  const { nx, ny, cE, cN } = op;
  const { precon, q } = ic;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      const pc = precon[c];
      if (pc === 0) {
        q[c] = 0;
        continue;
      }
      let t = r[c];
      if (i > 0) t += cE[c - 1] * precon[c - 1] * q[c - 1];
      if (j > 0) t += cN[c - nx] * precon[c - nx] * q[c - nx];
      q[c] = t * pc;
    }
  }
  for (let j = ny - 1; j >= 0; j--) {
    for (let i = nx - 1; i >= 0; i--) {
      const c = i + j * nx;
      const pc = precon[c];
      if (pc === 0) {
        z[c] = 0;
        continue;
      }
      let t = q[c];
      if (i < nx - 1) t += cE[c] * pc * z[c + 1];
      if (j < ny - 1) t += cN[c] * pc * z[c + nx];
      z[c] = t * pc;
    }
  }
}

// ---------------------------------------------------------------------------
// Geometric multigrid

// Geometry of a level, in units of the finest spacing: column widths wx and
// centres cx (row heights wy, centres cy), domain size Lx × Ly, the open
// length of every east (oE) and north (oN) link, and the Dirichlet face length
// on each side (dL, dR per row; dB, dT per column). A fine operator built by
// laplacian() is uniform: widths 1, open lengths 1 or 0.
function geometry(op) {
  if (op.geom) return op.geom;
  const { nx, ny, n, cE, cN, dir, bc } = op;
  const wx = new Float64Array(nx).fill(1);
  const wy = new Float64Array(ny).fill(1);
  const cx = Float64Array.from({ length: nx }, (_, i) => i + 0.5);
  const cy = Float64Array.from({ length: ny }, (_, j) => j + 0.5);
  const oE = new Float64Array(n);
  const oN = new Float64Array(n);
  for (let c = 0; c < n; c++) {
    oE[c] = cE[c] > 0 ? 1 : 0;
    oN[c] = cN[c] > 0 ? 1 : 0;
  }
  const dL = new Float64Array(ny);
  const dR = new Float64Array(ny);
  const dB = new Float64Array(nx);
  const dT = new Float64Array(nx);
  for (let j = 0; j < ny; j++) {
    if (bc.left === 'dirichlet' && dir[j * nx] > 0) dL[j] = 1;
    if (bc.right === 'dirichlet' && dir[nx - 1 + j * nx] > 0) dR[j] = 1;
  }
  for (let i = 0; i < nx; i++) {
    if (bc.bottom === 'dirichlet' && dir[i] > 0) dB[i] = 1;
    if (bc.top === 'dirichlet' && dir[i + (ny - 1) * nx] > 0) dT[i] = 1;
  }
  op.geom = { wx, wy, cx, cy, Lx: nx, Ly: ny, oE, oN, dL, dR, dB, dT };
  return op.geom;
}

// Widths and centres of the coarse columns (or rows) that pair fine cells
// (2I, 2I+1); on an odd count the last coarse cell holds one fine cell.
function coarsenAxis(w, n) {
  const N = (n + 1) >> 1;
  const W = new Float64Array(N);
  const C = new Float64Array(N);
  let edge = 0;
  for (let I = 0; I < N; I++) {
    W[I] = w[2 * I] + (2 * I + 1 < n ? w[2 * I + 1] : 0);
    C[I] = edge + 0.5 * W[I];
    edge += W[I];
  }
  return { N, W, C };
}

// Coarse operator (see header), or null when the grid is too small to coarsen.
// Coarse cell (I, J) aggregates the fine cells (2I..2I+1, 2J..2J+1) that
// exist; on an odd side the last coarse column (row) holds a single fine
// column (row), a cell of half the nominal width. The coarse operator is the
// finite-volume 5-point Laplacian on the actual coarse cells: a link carries
// (open face length) / (distance between the two centres), a Dirichlet face
// (face length) / (distance from the centre to the wall), both divided by the
// nominal H² = (2h)². A face is as open as the fine faces under it, so solids
// enter as partly open links. On an even box this is exactly the 5-point
// operator rediscretised at spacing 2h (and equals PᵀA P / 8 for piecewise-
// constant P); on odd sizes it keeps the walls where they really are.
function coarsen(op) {
  const { nx, ny } = op;
  if (nx < 4 || ny < 4) return null;
  const g = geometry(op);
  const X = coarsenAxis(g.wx, nx);
  const Y = coarsenAxis(g.wy, ny);
  const NX = X.N;
  const NY = Y.N;
  const N = NX * NY;
  const oE = new Float64Array(N);
  const oN = new Float64Array(N);
  const dL = new Float64Array(NY);
  const dR = new Float64Array(NY);
  const dB = new Float64Array(NX);
  const dT = new Float64Array(NX);
  for (let J = 0; J < NY; J++) {
    const j0 = 2 * J;
    const j1 = j0 + 1 < ny ? j0 + 1 : -1;
    const jt = j1 >= 0 ? j1 : j0; // top fine row of the aggregate
    dL[J] = g.dL[j0] + (j1 >= 0 ? g.dL[j1] : 0);
    dR[J] = g.dR[j0] + (j1 >= 0 ? g.dR[j1] : 0);
    for (let I = 0; I < NX; I++) {
      const i0 = 2 * I;
      const i1 = i0 + 1 < nx ? i0 + 1 : -1;
      const ir = i1 >= 0 ? i1 : i0; // right fine column of the aggregate
      const C = I + J * NX;
      oE[C] = g.oE[ir + j0 * nx] + (j1 >= 0 ? g.oE[ir + j1 * nx] : 0);
      oN[C] = g.oN[i0 + jt * nx] + (i1 >= 0 ? g.oN[i1 + jt * nx] : 0);
    }
  }
  for (let I = 0; I < NX; I++) {
    const i0 = 2 * I;
    const i1 = i0 + 1 < nx ? i0 + 1 : -1;
    dB[I] = g.dB[i0] + (i1 >= 0 ? g.dB[i1] : 0);
    dT[I] = g.dT[i0] + (i1 >= 0 ? g.dT[i1] : 0);
  }
  const H = 2 * op.h;
  const ih2 = 1 / (H * H);
  const Lx = g.Lx;
  const Ly = g.Ly;
  const cE = new Float64Array(N);
  const cN = new Float64Array(N);
  const dir = new Float64Array(N);
  for (let J = 0; J < NY; J++) {
    for (let I = 0; I < NX; I++) {
      const C = I + J * NX;
      if (oE[C] > 0) {
        const d = I < NX - 1 ? X.C[I + 1] - X.C[I] : Lx - X.C[I] + X.C[0];
        cE[C] = (oE[C] / d) * ih2;
      }
      if (oN[C] > 0) {
        const d = J < NY - 1 ? Y.C[J + 1] - Y.C[J] : Ly - Y.C[J] + Y.C[0];
        cN[C] = (oN[C] / d) * ih2;
      }
      let k = 0;
      if (I === 0 && dL[J] > 0) k += dL[J] / X.C[0];
      if (I === NX - 1 && dR[J] > 0) k += dR[J] / (Lx - X.C[I]);
      if (J === 0 && dB[I] > 0) k += dB[I] / Y.C[0];
      if (J === NY - 1 && dT[I] > 0) k += dT[I] / (Ly - Y.C[J]);
      dir[C] = k * ih2;
    }
  }
  const coarse = finishOperator({
    nx: NX,
    ny: NY,
    h: H,
    n: N,
    bc: op.bc,
    periodicX: op.periodicX,
    periodicY: op.periodicY,
    cE,
    cN,
    dir,
    level: op.level + 1,
  });
  coarse.geom = { wx: X.W, wy: Y.W, cx: X.C, cy: Y.C, Lx, Ly, oE, oN, dL, dR, dB, dT };
  return coarse;
}

// Prolongation from coarse to fine: parent index per fine cell, plus for
// bilinear four (index, weight) pairs per fine cell. The weights interpolate
// linearly between the actual coarse centres in each direction (9/16, 3/16,
// 3/16, 1/16 on a uniform grid; plain injection for a fine cell that sits at
// the centre of a half-width coarse cell). Beyond a wall the missing coarse
// value is the parent's (Neumann) or minus the parent's mirrored across the
// wall (Dirichlet); an inactive (solid) coarse neighbour falls back towards
// the parent.
function buildProlongation(fine, coarse, kind) {
  const { nx, ny, n } = fine;
  const NX = coarse.nx;
  const NY = coarse.ny;
  const act = coarse.active;
  const parent = new Int32Array(n).fill(-1);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const f = i + j * nx;
      const C = (i >> 1) + (j >> 1) * NX;
      if (fine.active[f] && act[C]) parent[f] = C;
    }
  }
  if (kind === 'constant') return { kind, parent, idx: null, w: null };
  if (kind !== 'bilinear') throw new Error(`multigrid: unknown prolongation '${kind}'`);
  const gf = geometry(fine);
  const gc = coarse.geom;
  const idx = new Int32Array(4 * n);
  const w = new Float64Array(4 * n);
  const bc = fine.bc;
  // 1-D neighbour of coarse cell I along an axis, toward the fine centre xf:
  // sets nI (index), nT (interpolation weight of the neighbour), nS (sign).
  let nI = 0;
  let nT = 0;
  let nS = 1;
  const axis = (xf, I, Cc, N, L, periodic, loSide, hiSide) => {
    const X0 = Cc[I];
    nI = I;
    nT = 0;
    nS = 1;
    if (xf === X0) return;
    const s = xf > X0 ? 1 : -1;
    const I2 = I + s;
    let Xn;
    if (I2 >= 0 && I2 < N) {
      nI = I2;
      Xn = Cc[I2];
    } else if (periodic) {
      nI = (I2 + N) % N;
      Xn = Cc[nI] + (I2 < 0 ? -L : L);
    } else {
      const wall = I2 < 0 ? 0 : L;
      Xn = 2 * wall - X0; // mirror image of the parent across the wall
      if (bc[I2 < 0 ? loSide : hiSide] === 'dirichlet') nS = -1;
    }
    nT = (xf - X0) / (Xn - X0);
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const f = i + j * nx;
      if (parent[f] < 0) continue;
      const I = i >> 1;
      const J = j >> 1;
      axis(gf.cx[i], I, gc.cx, NX, gc.Lx, fine.periodicX, 'left', 'right');
      const I2 = nI;
      const tx = nT;
      const sx = nS;
      axis(gf.cy[j], J, gc.cy, NY, gc.Ly, fine.periodicY, 'bottom', 'top');
      const J2 = nI;
      const ty = nT;
      const sy = nS;
      const P = I + J * NX;
      const k = 4 * f;
      idx[k] = P;
      w[k] = (1 - tx) * (1 - ty);
      idx[k + 1] = act[I2 + J * NX] ? I2 + J * NX : P;
      w[k + 1] = tx * (1 - ty) * sx;
      idx[k + 2] = act[I + J2 * NX] ? I + J2 * NX : P;
      w[k + 2] = (1 - tx) * ty * sy;
      idx[k + 3] = act[I2 + J2 * NX] ? I2 + J2 * NX : act[I + J2 * NX] ? I + J2 * NX : act[I2 + J * NX] ? I2 + J * NX : P;
      w[k + 3] = tx * ty * sx * sy;
    }
  }
  return { kind, parent, idx, w };
}

// Normalised multigrid options plus the (cached, immutable) level hierarchy
// [{ op, P }]. The per-run vectors live in the workspace (mgVectors).
function mgSetup(op, o = {}) {
  const opts = {
    nu1: o.nu1 ?? 2,
    nu2: o.nu2 ?? 2,
    smoother: o.smoother ?? 'rbgs',
    omega: o.omega ?? (o.smoother === 'jacobi' ? 0.8 : 1),
    prolong: o.prolong ?? 'bilinear',
    restrict: o.restrict ?? 'average',
    maxLevels: o.maxLevels ?? 32,
    coarseTol: o.coarseTol ?? 1e-12,
    symmetric: o.symmetric ?? false,
  };
  if (!['rbgs', 'jacobi', 'gs'].includes(opts.smoother)) throw new Error(`multigrid: unknown smoother '${opts.smoother}'`);
  if (!['average', 'transpose'].includes(opts.restrict)) throw new Error(`multigrid: unknown restriction '${opts.restrict}'`);
  const key = `mg:${opts.prolong}:${opts.maxLevels}`;
  let levels = op._cache[key];
  if (!levels) {
    levels = [];
    let cur = op;
    for (;;) {
      const L = { op: cur, P: null };
      levels.push(L);
      if (levels.length >= opts.maxLevels) break;
      const next = coarsen(cur);
      if (!next) break;
      L.P = buildProlongation(cur, next, opts.prolong);
      cur = next;
    }
    op._cache[key] = levels;
  }
  return { levels, opts, n0: op.n, key };
}

// Per-level x, b, r vectors for one run, kept in the workspace.
function mgVectors(ws, mg) {
  let V = ws.mg[mg.key];
  if (!V) {
    V = mg.levels.map((L) => ({ x: new Float64Array(L.op.n), b: new Float64Array(L.op.n), r: new Float64Array(L.op.n) }));
    ws.mg[mg.key] = V;
  }
  return V;
}

function* smooth(op, Vl, o, pre, rec, level) {
  const { x, b, r } = Vl;
  if (rec) rec.len = 0;
  if (o.smoother === 'jacobi') relaxJacobi(op, x, b, o.omega, r, false, rec);
  else if (o.smoother === 'gs') relaxLex(op, x, b, o.omega, rec);
  else relaxRB(op, x, b, o.omega, pre || !o.symmetric ? 0 : 1, rec);
  if (rec) yield* replay(op, rec, level, o.smoother === 'rbgs');
}

function restrictTo(L, Vl, Vc, o) {
  const { r } = Vl;
  const { parent, idx, w } = L.P;
  const bc = Vc.b;
  bc.fill(0);
  const n = L.op.n;
  if (o.restrict === 'transpose' && idx) {
    for (let f = 0; f < n; f++) {
      if (parent[f] < 0) continue;
      const v = 0.25 * r[f];
      const k = 4 * f;
      bc[idx[k]] += w[k] * v;
      bc[idx[k + 1]] += w[k + 1] * v;
      bc[idx[k + 2]] += w[k + 2] * v;
      bc[idx[k + 3]] += w[k + 3] * v;
    }
  } else {
    for (let f = 0; f < n; f++) if (parent[f] >= 0) bc[parent[f]] += 0.25 * r[f];
  }
  Vc.x.fill(0);
}

function prolongAdd(L, Vl, Vc) {
  const { x } = Vl;
  const xc = Vc.x;
  const { parent, idx, w } = L.P;
  const n = L.op.n;
  if (!idx) {
    for (let f = 0; f < n; f++) if (parent[f] >= 0) x[f] += xc[parent[f]];
    return;
  }
  for (let f = 0; f < n; f++) {
    if (parent[f] < 0) continue;
    const k = 4 * f;
    x[f] += w[k] * xc[idx[k]] + w[k + 1] * xc[idx[k + 1]] + w[k + 2] * xc[idx[k + 2]] + w[k + 3] * xc[idx[k + 3]];
  }
}

// One V-cycle on level l for A_l x_l = b_l (V[l].x is the initial guess).
// rec: trace recorder (trace 'cells') or null; trAny: yield op events.
function* vcycle(mg, V, l, st, rec, trAny) {
  const { levels, opts: o, n0 } = mg;
  const L = levels[l];
  const Vl = V[l];
  const op = L.op;
  const frac = op.n / n0;
  yield { t: 'enter', kind: 'level', level: l, nx: op.nx, ny: op.ny, label: `level ${l}: ${op.nx}×${op.ny}` };
  if (l === levels.length - 1) {
    // CG on the coarsest grid. It takes its own workspace from the coarsest
    // operator's pool, so this is safe even when the coarsest grid is the
    // fine grid itself (maxLevels 1, or a grid too small to coarsen).
    const res = drainSolver(pcg(op, Vl.b, { x: Vl.x, tol: o.coarseTol, history: false }));
    st.work += res.iters * frac;
    if (trAny) yield { t: 'op', op: 'coarse-solve', level: l, iters: res.iters };
    yield { t: 'leave', kind: 'level', level: l };
    return;
  }
  for (let s = 0; s < o.nu1; s++) {
    yield* smooth(op, Vl, o, true, rec, l);
    st.work += frac;
    if (trAny) yield { t: 'op', op: 'smooth', level: l, sweep: s + 1, pre: true };
  }
  residual(op, Vl.x, Vl.b, Vl.r);
  st.work += frac;
  restrictTo(L, Vl, V[l + 1], o);
  if (trAny) yield { t: 'op', op: 'restrict', level: l };
  yield* vcycle(mg, V, l + 1, st, rec, trAny);
  prolongAdd(L, Vl, V[l + 1]);
  if (trAny) yield { t: 'op', op: 'prolong', level: l };
  for (let s = 0; s < o.nu2; s++) {
    yield* smooth(op, Vl, o, false, rec, l);
    st.work += frac;
    if (trAny) yield { t: 'op', op: 'smooth', level: l, sweep: s + 1, pre: false };
  }
  yield { t: 'leave', kind: 'level', level: l };
}

function drainSolver(gen) {
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
}

// Multigrid V(ν1, ν2) cycles in correction form: r = b − A x, e = V(0, r),
// x += e. opts: nu1, nu2 (2, 2), smoother 'rbgs' | 'jacobi' | 'gs', omega
// (4/5 for Jacobi), prolong 'bilinear' | 'constant', restrict 'average' |
// 'transpose', maxLevels, coarseTol (1e-12), symmetric (false: post-smooth
// red then black; true: black then red, see the header), plus the common
// tol, atol, maxIter (100), x, trace, history.
// The returned object also has `levels` (sizes of the hierarchy).
export function* multigrid(op, b, opts = {}) {
  const mg = mgSetup(op, opts);
  const ws = acquire(op);
  try {
    const S = setup(op, ws, b, opts);
    const V = mgVectors(ws, mg);
    const { n } = op;
    const x = S.x;
    const r = wsVec(op, ws, 'r');
    const maxIter = opts.maxIter ?? 100;
    let abs = residual(op, x, S.bb, r);
    const residuals = S.history ? [abs * S.scale] : null;
    let k = 0;
    const st = { work: 0 };
    const rec = S.tr ? recorder(ws, n) : null;
    while (abs > S.stop && k < maxIter) {
      V[0].b.set(r);
      V[0].x.fill(0);
      yield* vcycle(mg, V, 0, st, rec, S.trAny);
      const e = V[0].x;
      for (let c = 0; c < n; c++) x[c] += e[c];
      k++;
      abs = residual(op, x, S.bb, r);
      st.work += 1;
      if (residuals) residuals.push(abs * S.scale);
      yield { t: 'iter', k, residual: abs * S.scale, work: st.work };
    }
    const out = finish(op, S, 'multigrid', k, residuals || [], st.work, abs);
    out.levels = mg.levels.map((L) => [L.op.nx, L.op.ny]);
    return out;
  } finally {
    release(op, ws);
  }
}

// ---------------------------------------------------------------------------
// Metadata and convenience
//
// work: fine-grid sweep equivalents per iteration. order: the exponent p in
// iterations ∝ n^p to reach a fixed tolerance on the model problem, n cells
// per side (Jacobi/GS 2, SOR/CG 1, MIC(0) ½, multigrid 0); iterations says
// the same in words; stability: when the iteration converges.

export const SOLVERS = {
  jacobi: {
    id: 'jacobi',
    name: 'Jacobi',
    description: 'Every cell moves to the value that satisfies its own equation, using the old neighbours. Weighted by ω.',
    tex: 'x_c^{(k+1)} = x_c^{(k)} + \\omega\\,\\frac{b_c - (A x^{(k)})_c}{a_{cc}}',
    work: 1,
    iterations: 'O(n^2) for n cells per side',
    order: 2,
    stability: 'Converges for 0 < ω < 1 (needs ω < 2/λ_max(D⁻¹A), and λ_max ≤ 2). ω = 1 also converges when a Dirichlet face is present, but on a pure-Neumann or periodic grid λ_max(D⁻¹A) = 2 exactly (the checkerboard), so plain Jacobi stalls there; ω = 4/5 is the best smoothing weight in 2-D.',
    run: jacobi,
  },
  'gauss-seidel': {
    id: 'gauss-seidel',
    name: 'Gauss–Seidel',
    description: 'Like Jacobi, but each cell uses the neighbours already updated in this sweep (row by row).',
    tex: 'x_c \\leftarrow \\frac{1}{a_{cc}}\\Big(b_c - \\sum_{d \\ne c} a_{cd}\\, x_d\\Big)',
    work: 1,
    iterations: 'O(n^2), about half of Jacobi',
    order: 2,
    stability: 'Always converges for a symmetric positive definite A.',
    run: gaussSeidel,
  },
  'red-black': {
    id: 'red-black',
    name: 'Red–black Gauss–Seidel',
    description: 'Gauss–Seidel in checkerboard order: all red cells (independent of each other), then all black cells.',
    tex: '\\text{red: } (i+j)\\ \\text{even}, \\quad \\text{black: } (i+j)\\ \\text{odd}',
    work: 1,
    iterations: 'O(n^2), like Gauss–Seidel',
    order: 2,
    stability: 'Always converges for a symmetric positive definite A.',
    run: redBlackGS,
  },
  sor: {
    id: 'sor',
    name: 'SOR',
    description: 'Gauss–Seidel that overshoots by a factor ω; with the optimal ω the iteration count grows like n, not n².',
    tex: '\\omega_{\\mathrm{opt}} = \\frac{2}{1 + \\sqrt{1 - \\rho_J^2}} = \\frac{2}{1 + \\sin(\\pi/N)}',
    work: 1,
    iterations: 'O(n) at the optimal ω',
    order: 1,
    stability: 'Converges for 0 < ω < 2 on a symmetric positive definite A.',
    run: sor,
  },
  cg: {
    id: 'cg',
    name: 'Conjugate gradients',
    description: 'Each step minimises the error in the A-norm over a growing Krylov space; no tuning parameter.',
    tex: '\\alpha_k = \\frac{r_k^{\\top} r_k}{p_k^{\\top} A\\, p_k}, \\quad x_{k+1} = x_k + \\alpha_k p_k',
    work: 1,
    iterations: 'O(n) (error falls like ((√κ − 1)/(√κ + 1))^k, κ ∝ n²)',
    order: 1,
    stability: 'Needs A symmetric positive (semi-)definite and a compatible right-hand side.',
    run: cg,
  },
  'pcg-jacobi': {
    id: 'pcg-jacobi',
    name: 'PCG, Jacobi preconditioner',
    description: 'CG on D⁻¹A. Almost no gain on the Laplacian, whose diagonal is nearly constant.',
    tex: 'M = \\operatorname{diag}(A)',
    work: 1,
    iterations: 'O(n)',
    order: 1,
    stability: 'As CG.',
    run: (op, b, o = {}) => pcg(op, b, { ...o, precond: 'jacobi' }),
  },
  'pcg-ic0': {
    id: 'pcg-ic0',
    name: 'PCG, incomplete Cholesky IC(0)',
    description: 'Cholesky factorisation that keeps only the sparsity of A; a much better M at the cost of two triangular solves.',
    tex: 'M = L L^{\\top} \\approx A, \\quad L \\text{ has the sparsity of } A',
    work: 2,
    iterations: 'O(n), with a smaller constant',
    order: 1,
    stability: 'As CG; a pivot guard keeps M positive definite.',
    run: (op, b, o = {}) => pcg(op, b, { ...o, precond: 'ic0' }),
  },
  'pcg-mic0': {
    id: 'pcg-mic0',
    name: 'PCG, modified incomplete Cholesky MIC(0)',
    description: 'IC(0) that puts the dropped fill back on the diagonal so M and A agree on smooth vectors.',
    tex: 'M\\,\\mathbf{1} \\approx A\\,\\mathbf{1}, \\quad \\tau = 0.97',
    work: 2,
    iterations: 'O(√n) with the full modification τ = 1 on a box (κ(M⁻¹A) falls from O(n²) to O(n)); with the default τ = 0.97 about √n up to 64², drifting back towards O(n) on finer grids, still several times fewer than IC(0)',
    order: 0.5,
    defaultTau: 0.97,
    stability: 'As CG; σ = 0.25 pivot guard. τ = 1 is the fastest on an obstacle-free box but degrades around solids and on periodic grids; τ = 0.97 is the robust choice.',
    run: (op, b, o = {}) => pcg(op, b, { ...o, precond: 'mic0' }),
  },
  multigrid: {
    id: 'multigrid',
    name: 'Multigrid V-cycle',
    description: 'Smooth on the fine grid, solve for the smooth remainder on a coarser grid, recursively.',
    tex: 'x \\leftarrow x + P\\,A_{2h}^{-1} R\\,(b - A x)',
    work: 7.7,
    iterations: 'O(1): a fixed number of cycles at any grid size',
    order: 0,
    stability: 'Converges when smoother and transfers fit the operator (m_P + m_R > 2); V(2,2) reduces the residual by about 0.08 per cycle on a box, 0.1–0.3 around solids (worst on small uneven grids).',
    run: multigrid,
  },
  mgpcg: {
    id: 'mgpcg',
    name: 'Multigrid-preconditioned CG',
    description: 'CG with one symmetric V-cycle as preconditioner; robust where plain multigrid struggles (solids, odd shapes).',
    tex: 'M^{-1} = \\text{one V-cycle}',
    work: 7.7,
    iterations: 'O(1)',
    order: 0,
    stability: 'Needs a symmetric V-cycle (symmetric smoothing, R = Pᵀ/4).',
    run: mgpcg,
  },
};

// Run a solver to completion. method is a key of SOLVERS.
export function solve(op, b, method = 'mgpcg', opts = {}) {
  const s = SOLVERS[method];
  if (!s) throw new Error(`poisson: unknown method '${method}'`);
  return drainSolver(s.run(op, b, opts));
}

// Model problems for the solver figures. make(nx, ny, seed) returns
// { op, b, exact? }: exact is the continuous solution sampled at the cell
// centres where one is known.
export const POISSON_PRESETS = {
  'model-dirichlet': {
    id: 'model-dirichlet',
    name: 'Model problem (Dirichlet)',
    description: 'Unit square, p = 0 on the walls, random right-hand side: every error mode is present.',
    make(nx, ny = nx, seed = 1) {
      const op = laplacian(nx, ny, 1 / nx, { bc: 'dirichlet' });
      return { op, b: randomRhs(op, seed) };
    },
  },
  'closed-box': {
    id: 'closed-box',
    name: 'Closed box (pure Neumann)',
    description: 'The pressure problem of a sealed container: zero-flux walls, pressure fixed only up to a constant.',
    make(nx, ny = nx, seed = 1) {
      const op = laplacian(nx, ny, 1 / nx, { bc: 'neumann' });
      return { op, b: randomRhs(op, seed) };
    },
  },
  dipole: {
    id: 'dipole',
    name: 'Source and sink',
    description: 'Closed box with a source and a sink: a smooth pressure field, easy to see converge.',
    make(nx, ny = nx) {
      const op = laplacian(nx, ny, 1 / nx, { bc: 'neumann' });
      const b = new Float64Array(op.n);
      const h = 1 / nx;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const x = (i + 0.5) * h;
          const y = (j + 0.5) * h;
          const g = (cx, cy) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / 0.01);
          b[i + j * nx] = g(0.3, 0.5 * ny * h) - g(0.7, 0.5 * ny * h);
        }
      }
      return { op, b };
    },
  },
  periodic: {
    id: 'periodic',
    name: 'Periodic box',
    description: 'Wrap-around in both directions; constants are the null space.',
    make(nx, ny = nx, seed = 1) {
      const op = laplacian(nx, ny, 1 / nx, { bc: 'periodic' });
      return { op, b: randomRhs(op, seed) };
    },
  },
  obstacle: {
    id: 'obstacle',
    name: 'Box with an obstacle',
    description: 'Closed box with a solid disc; the solid cells are excluded and their faces carry no flux.',
    make(nx, ny = nx, seed = 1) {
      const h = 1 / nx;
      const solid = new Uint8Array(nx * ny);
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const x = (i + 0.5) * h - 0.5;
          const y = (j + 0.5) * h - 0.5 * ny * h;
          if (x * x + y * y < 0.04) solid[i + j * nx] = 1;
        }
      }
      const op = laplacian(nx, ny, h, { bc: 'neumann', solid });
      return { op, b: randomRhs(op, seed) };
    },
  },
  channel: {
    id: 'channel',
    name: 'Channel with an outlet',
    description: 'Walls on three sides (Neumann), an open outlet on the right (Dirichlet p = 0).',
    make(nx, ny = nx, seed = 1) {
      const op = laplacian(nx, ny, 1 / nx, { bc: { left: 'neumann', right: 'dirichlet', bottom: 'neumann', top: 'neumann' } });
      return { op, b: randomRhs(op, seed) };
    },
  },
  manufactured: {
    id: 'manufactured',
    name: 'Known answer',
    description: 'p = sin(πx/Lx) sin(πy/Ly) on the box [0, Lx] × [0, Ly] (Lx = 1) with p = 0 on the walls; the error can be measured.',
    make(nx, ny = nx) {
      const h = 1 / nx;
      const op = laplacian(nx, ny, h, { bc: 'dirichlet' });
      const b = new Float64Array(op.n);
      const exact = new Float64Array(op.n);
      const kx = Math.PI / (nx * h);
      const ky = Math.PI / (ny * h);
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const s = Math.sin(kx * (i + 0.5) * h) * Math.sin(ky * (j + 0.5) * h);
          exact[i + j * nx] = s;
          b[i + j * nx] = (kx * kx + ky * ky) * s;
        }
      }
      return { op, b, exact };
    },
  },
};

// Seeded uniform random right-hand side on the active cells.
export function randomRhs(op, seed = 1) {
  const rand = rng(seed);
  const b = new Float64Array(op.n);
  for (let c = 0; c < op.n; c++) b[c] = op.active[c] ? 2 * rand() - 1 : 0;
  return b;
}

// ---------------------------------------------------------------------------
// 1-D model problem: smoothing and mode damping

const SINE_TABLES = new Map();
function sineTable(n) {
  let t = SINE_TABLES.get(n);
  if (!t) {
    t = new Float64Array(n * n);
    for (let k = 1; k <= n; k++) for (let j = 1; j <= n; j++) t[(k - 1) * n + (j - 1)] = Math.sin((j * k * Math.PI) / (n + 1));
    SINE_TABLES.set(n, t);
  }
  return t;
}

// Sine-mode amplitudes (discrete sine transform, DST-I) of e (n interior
// values): a_k = 2/(n+1) Σ_j e_j sin(jkπ/(n+1)), k = 1..n stored at out[k−1].
export function sineModes(e, out = new Float64Array(e.length)) {
  const n = e.length;
  const t = sineTable(n);
  const s = 2 / (n + 1);
  for (let k = 0; k < n; k++) {
    let acc = 0;
    const row = k * n;
    for (let j = 0; j < n; j++) acc += e[j] * t[row + j];
    out[k] = acc * s;
  }
  return out;
}

// Inverse of sineModes: e_j = Σ_k a_k sin(jkπ/(n+1)).
export function sineSynthesis(a, out = new Float64Array(a.length)) {
  const n = a.length;
  const t = sineTable(n);
  out.fill(0);
  for (let k = 0; k < n; k++) {
    const ak = a[k];
    if (ak === 0) continue;
    const row = k * n;
    for (let j = 0; j < n; j++) out[j] += ak * t[row + j];
  }
  return out;
}

// Analytic damping of sine mode k per weighted-Jacobi sweep on the 1-D model
// problem with n interior points: λ_k = 1 − 2ω sin²(kπ/(2n+2)).
export function jacobiModeFactor(k, n, omega = 2 / 3) {
  const s = Math.sin((k * Math.PI) / (2 * n + 2));
  return 1 - 2 * omega * s * s;
}

export const SMOOTHERS_1D = {
  jacobi: {
    id: 'jacobi',
    name: 'Weighted Jacobi',
    description: 'Every point moves toward the average of its old neighbours. The sine modes are its eigenvectors, so each mode shrinks by its own fixed factor.',
    tex: '\\lambda_k = 1 - 2\\omega \\sin^2\\!\\Big(\\frac{k\\pi}{2n+2}\\Big)',
    defaultOmega: 2 / 3,
    order: 2,
    stability: 'Converges for 0 < ω ≤ 1; ω = 2/3 damps the upper half of the modes by at least 3× per sweep, while the smoothest mode keeps a factor 1 − O(h²).',
  },
  gs: {
    id: 'gs',
    name: 'Gauss–Seidel',
    description: 'Left to right, each point uses the neighbour already updated in this sweep. The modes mix, but the wiggly ones still die fast.',
    tex: 'e_j \\leftarrow \\tfrac12\\,(e_{j-1} + e_{j+1})',
    defaultOmega: 1,
    order: 2,
    stability: 'Always converges (A is symmetric positive definite).',
  },
  rbgs: {
    id: 'rbgs',
    name: 'Red–black Gauss–Seidel',
    description: 'Odd points first (they do not depend on each other), then even points.',
    tex: '\\text{odd } j \\text{ first, then even } j',
    defaultOmega: 1,
    order: 2,
    stability: 'Always converges (A is symmetric positive definite).',
  },
};

// Relax A e = 0 on the 1-D model problem, starting from a copy of e0.
// opts: method 'jacobi' | 'gs' | 'rbgs', omega (2/3 for Jacobi, else 1),
// sweeps (10), trace ('cells' → {t:'op', op:'relax', cell} per point).
// Yields per sweep {t:'iter', k, residual, error, modes, factors}: residual
// is ‖A e‖₂ relative to the start; error, modes and factors (a_k after /
// a_k before, NaN where a mode was absent) are views of reused arrays, so
// copy them if you keep them. Returns {e, modes, history, residuals}, where
// history[s] is a copy of the mode amplitudes after s sweeps.
export function* smooth1d(e0, opts = {}) {
  const n = e0.length;
  const method = opts.method ?? 'jacobi';
  if (!SMOOTHERS_1D[method]) throw new Error(`smooth1d: unknown method '${method}'`);
  const omega = opts.omega ?? SMOOTHERS_1D[method].defaultOmega;
  const sweeps = opts.sweeps ?? 10;
  const tr = opts.trace === 'cells';
  const e = Float64Array.from(e0);
  const old = new Float64Array(n);
  const modes = sineModes(e);
  const prev = new Float64Array(n);
  const factors = new Float64Array(n);
  const h = 1 / (n + 1);
  const resNorm = () => {
    let s = 0;
    for (let j = 0; j < n; j++) {
      const a = (2 * e[j] - (j > 0 ? e[j - 1] : 0) - (j < n - 1 ? e[j + 1] : 0)) / (h * h);
      s += a * a;
    }
    return Math.sqrt(s);
  };
  const r0 = resNorm() || 1;
  const history = [Float64Array.from(modes)];
  const residuals = [resNorm() / r0];
  const at = (arr, j) => (j < 0 || j >= n ? 0 : arr[j]);
  for (let k = 1; k <= sweeps; k++) {
    prev.set(modes);
    if (method === 'jacobi') {
      old.set(e);
      for (let j = 0; j < n; j++) {
        e[j] = (1 - omega) * old[j] + omega * 0.5 * (at(old, j - 1) + at(old, j + 1));
        if (tr) yield { t: 'op', op: 'relax', cell: j };
      }
    } else if (method === 'gs') {
      for (let j = 0; j < n; j++) {
        e[j] = (1 - omega) * e[j] + omega * 0.5 * (at(e, j - 1) + at(e, j + 1));
        if (tr) yield { t: 'op', op: 'relax', cell: j };
      }
    } else {
      // Points j = 1, 3, 5, … in 1-based numbering first (index 0, 2, …).
      for (let pass = 0; pass < 2; pass++) {
        for (let j = pass; j < n; j += 2) {
          e[j] = (1 - omega) * e[j] + omega * 0.5 * (at(e, j - 1) + at(e, j + 1));
          if (tr) yield { t: 'op', op: 'relax', cell: j, colour: pass };
        }
      }
    }
    sineModes(e, modes);
    for (let m = 0; m < n; m++) factors[m] = Math.abs(prev[m]) > 1e-300 ? modes[m] / prev[m] : NaN;
    history.push(Float64Array.from(modes));
    const res = resNorm() / r0;
    residuals.push(res);
    yield { t: 'iter', k, residual: res, error: e, modes, factors };
  }
  return { e, modes, history, residuals };
}

// Measured per-mode factor of one sweep: start from the pure mode k and
// report a_k after one sweep. Equals jacobiModeFactor for Jacobi; for
// Gauss–Seidel the modes mix, so this is the surviving share of mode k only.
export function modeFactors1d(n, opts = {}) {
  const out = new Float64Array(n);
  const e0 = new Float64Array(n);
  const a = new Float64Array(n);
  for (let k = 1; k <= n; k++) {
    a.fill(0);
    a[k - 1] = 1;
    sineSynthesis(a, e0);
    const res = drainSolver(smooth1d(e0, { ...opts, sweeps: 1, trace: false }));
    out[k - 1] = res.modes[k - 1];
  }
  return out;
}

// Initial errors for the smoothing figure. init(n, seed) → Float64Array(n).
export const SMOOTHING_PRESETS = {
  mixed: {
    id: 'mixed',
    name: 'Smooth plus wiggly',
    description: 'Modes k = 1, n/2 and n: watch the wiggles vanish and the smooth hump stay.',
    init(n) {
      const a = new Float64Array(n);
      a[0] = 1;
      a[Math.floor(n / 2) - 1] = 0.5;
      a[n - 1] = 0.3;
      return sineSynthesis(a);
    },
  },
  random: {
    id: 'random',
    name: 'Random error',
    description: 'Every mode at once (seeded).',
    init(n, seed = 7) {
      const rand = rng(seed);
      return Float64Array.from({ length: n }, () => 2 * rand() - 1);
    },
  },
  smooth: {
    id: 'smooth',
    name: 'Smooth error',
    description: 'Only modes k = 1 and 2: relaxation barely touches them.',
    init(n) {
      const a = new Float64Array(n);
      a[0] = 1;
      a[1] = 0.5;
      return sineSynthesis(a);
    },
  },
  highest: {
    id: 'highest',
    name: 'Highest mode',
    description: 'Mode k = n, the sawtooth. Plain Jacobi (ω = 1) flips its sign and barely shrinks it (factor 1 − 2 sin²(nπ/(2n+2)) ≈ −1); ω = 2/3 cuts it to about a third.',
    init(n) {
      const a = new Float64Array(n);
      a[n - 1] = 1;
      return sineSynthesis(a);
    },
  },
};
