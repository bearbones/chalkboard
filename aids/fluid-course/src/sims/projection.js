// Pressure projection: making a velocity field divergence-free.
//
// MAC PROJECTION (Chorin 1968; Harlow & Welch 1965; Stam 1999; Bridson 2015 ch. 5)
//   Given an intermediate face velocity u* on a MAC grid (grid2d.js), find φ
//   with  A φ = −D u* / s  (A = −D G, the 5-point operator of poisson.js with
//   walls → Neumann, open sides → Dirichlet, solids excluded) and set
//   u = u* − s G φ, so D u = 0 in every fluid cell up to the solver tolerance:
//   the relative residual of the pressure solve IS ‖D u‖₂ / ‖D u*‖₂.
//   s = opts.scale is Δt/ρ (default 1, so φ is the "pressure" in velocity ×
//   length units); the solution is left in g.p and reused as the next initial
//   guess unless opts.warm === false. Fixed faces (walls, solids) are never
//   changed; open faces are. On a closed box the net wall inflow must vanish:
//   if it does not, the uniform part of the divergence cannot be removed and
//   is reported as `incompatibility`.
//   In the face inner product grid2d.faceDot (boundary faces weighted ½, so
//   that G = −Dᵀ on walls, solids, open and periodic sides alike) u is the
//   closest field to u* that is divergence-free and matches the fixed faces,
//   and the map is idempotent. When every fixed face carries zero velocity
//   (no inflow) it is the orthogonal projector, so it never adds kinetic
//   energy: |u*|² = |u|² + |s G φ|². A prescribed inflow makes the map affine,
//   and the energy of the result can then exceed that of u* (the inflow has
//   to go somewhere).
//
// COST AND INTERACTIVE SIZES (node 20, desktop; a mid-range phone is roughly
// 3–5× slower, and the frame budget there is 8 ms)
//   Warm-started project() per step on the jet preset, after a
//   semi-Lagrangian self-advection and a jet force (a stand-in for a
//   stable-fluids step):
//     64²  defaults (mgpcg, tol 1e-6)                     ≈ 0.9–1.3 ms (3 iterations)
//     128² defaults                                        ≈ 3.4–4.7 ms (over a phone budget)
//     128² PROJECT_INTERACTIVE {method:'multigrid', tol:1e-4} ≈ 1.3 ms (1 cycle;
//          max |D u| / max |D u*| ≤ 1e-3)
//     64²  PROJECT_INTERACTIVE                             ≈ 0.35 ms
//   (ranges: run-to-run spread.) Editing the solid mask rebuilds the operator
//   and the multigrid hierarchy (and any IC factor) on the next call: ≈ 0.9 ms
//   at 64², 1.6 ms at 128²; a step that grows an obstacle every frame costs
//   ≈ 1.5–1.9 ms at 64² and ≈ 5.7 ms at 128² with the defaults.
//   Any nx, ny ≥ 2 works; multigrid coarsens odd sizes too, so no size falls
//   off a cost cliff (100² defaults ≈ 2.1 ms).
//
// HELMHOLTZ–HODGE (Chorin & Marsden 1993 §1.3)
//   On a periodic MAC grid every field splits uniquely into
//   u = (curl ψ + ū) + G φ: a divergence-free part (a streamfunction part plus
//   the mean flow ū, the harmonic part on a torus) and a curl-free part G φ.
//   The parts are orthogonal in faceDot; G φ has zero vorticity at every corner
//   (curl G = 0 on the MAC grid) and curl ψ has zero divergence (D curl = 0).
//
// COLLOCATED PROJECTIONS AND THE CHECKERBOARD (Patankar 1980 ch. 6; Almgren,
// Bell & Szymczak 1996; Rhie & Chow 1983; Ferziger & Perić 2002 ch. 7)
//   u, v, p all at cell centres on a periodic grid (even nx, ny), with the
//   central gradient G_c and divergence D_c of grid2d.js.
//   'exact'        solve D_c G_c φ = D_c u* (the wide stencil, spacing 2h) and
//                  set u = u* − G_c φ: D_c u = 0 to solver tolerance. The wide
//                  operator splits into four independent compact Laplacians,
//                  one per parity sub-grid ((i mod 2, j mod 2)), solved here
//                  one after the other; each has its own arbitrary constant
//                  (we give each sub-grid zero mean), so 1, (−1)^i, (−1)^j and
//                  (−1)^{i+j} are all invisible to it: checkerboard pressures
//                  are in its null space.
//   'approximate'  solve the compact 5-point L φ = D_c u* (L = −A, the
//                  compact Laplacian) instead and set u = u* − G_c φ. No
//                  checkerboard null space (only constants), but D_c u ≠ 0:
//                  D_c u = D_c u* − D_c G_c φ = (L − L_wide) φ with L_wide =
//                  D_c G_c, which is O(h²) on smooth fields; and the
//                  projector is not idempotent.
//   'rhie-chow'    momentum interpolation: average u* to faces, project those
//                  faces exactly with the compact MAC operator, and correct the
//                  centres with the averaged face gradient (= G_c φ). The face
//                  velocity then obeys u_f = avg(u) − (G_f φ − avg(G_c φ)), the
//                  Rhie–Chow formula with d = Δt/ρ = 1: the bracket is O(h²)
//                  for smooth φ but ±2φ̂/h for a checkerboard of amplitude φ̂,
//                  so the face fluxes, which are exactly divergence-free, see
//                  and suppress odd–even pressure. In this pressure-free
//                  projection φ and the centre velocities equal the
//                  'approximate' ones; the difference is the face field.
//                  (Deviation: Rhie & Chow wrote it for a SIMPLE-type
//                  pressure-correction scheme with momentum-equation
//                  coefficients d; here d is the projection's Δt/ρ.)
//
// Sources:
//   A. J. Chorin (1968), Numerical solution of the Navier–Stokes equations,
//     Math. Comp. 22, 745–762.
//   F. H. Harlow & J. E. Welch (1965), Phys. Fluids 8(12), 2182–2189.
//   J. Stam (1999), Stable fluids, Proc. SIGGRAPH 99, 121–128.
//   R. Bridson (2015), Fluid Simulation for Computer Graphics, 2nd ed., CRC
//     Press, ch. 5.
//   A. J. Chorin & J. E. Marsden (1993), A Mathematical Introduction to Fluid
//     Mechanics, 3rd ed., Springer, §1.3 (Helmholtz–Hodge decomposition).
//   S. V. Patankar (1980), Numerical Heat Transfer and Fluid Flow, Hemisphere,
//     ch. 6 (checkerboard pressure field).
//   C. M. Rhie & W. L. Chow (1983), Numerical study of the turbulent flow past
//     an airfoil with trailing edge separation, AIAA J. 21(11), 1525–1532.
//   A. S. Almgren, J. B. Bell & W. G. Szymczak (1996), A numerical method for
//     the incompressible Navier–Stokes equations based on an approximate
//     projection, SIAM J. Sci. Comput. 17(2), 358–369.
//   J. H. Ferziger & M. Perić (2002), Computational Methods for Fluid
//     Dynamics, 3rd ed., Springer, ch. 7.

import { drain, rng } from './util.js';
import { macGrid, setSolid, enforceBoundary, divergence, subtractGradient, gradient, vorticityCorners, centresToFaces, centralGradient, centralDivergence, checkerboardFraction, parityFractions } from './grid2d.js';
import { laplacian, SOLVERS } from './poisson.js';

const PRESSURE_OF = { wall: 'neumann', open: 'dirichlet', periodic: 'periodic' };

// The pressure operator of a MAC grid (cached on the grid until its masks
// change).
export function pressureOperator(g) {
  if (g._pOp && g._pOpVersion === g.version) return g._pOp;
  const bc = {};
  for (const s of ['left', 'right', 'bottom', 'top']) bc[s] = PRESSURE_OF[g.bc[s]];
  g._pOp = laplacian(g.nx, g.ny, g.h, { bc, solid: g.solid });
  g._pOpVersion = g.version;
  return g._pOp;
}

// project() options that fit a phone's frame budget at 128² (see the header):
// plain multigrid, warm-started from the last pressure, to 1e-4 relative.
export const PROJECT_INTERACTIVE = { method: 'multigrid', tol: 1e-4 };

// Max and L2 norm (Σ d² h²)^½ of a cell field over the fluid cells.
function cellNorms(f, solid, h) {
  let max = 0;
  let ss = 0;
  for (let c = 0; c < f.length; c++) {
    if (solid && solid[c]) continue;
    const a = Math.abs(f[c]);
    if (a > max) max = a;
    ss += a * a;
  }
  return { max, l2: Math.sqrt(ss) * h };
}

// Generator form of project(): yields the pressure solver's events.
//   opts.method   key of poisson SOLVERS (default 'mgpcg')
//   opts.tol      relative residual of the pressure solve (default 1e-6):
//                 stops when ‖D u‖₂ ≤ tol·max(‖D u*‖₂, ‖u*‖₂/h) (vector
//                 2-norms over cells and faces)
//   opts.maxIter  solver cap; opts.solver: extra solver options
//   opts.scale    Δt/ρ (default 1); opts.warm (default true): start from g.p
//   opts.enforce  apply enforceBoundary first (default true)
//   opts.trace, opts.history passed to the solver
// Returns { method, divBefore, divAfter, relDiv, iters, residuals, work,
// converged, incompatibility } where div* = {max, l2} over fluid cells and
// relDiv = divAfter.max / divBefore.max.
// The grid's velocity, pressure and divergence are the state being changed,
// so run one projectSteps generator per grid at a time (solver generators on
// separate grids, or several solvers on one poisson operator, are fine).
export function* projectSteps(g, opts = {}) {
  const method = opts.method ?? 'mgpcg';
  const solver = SOLVERS[method];
  if (!solver) throw new Error(`project: unknown method '${method}'`);
  const scale = opts.scale ?? 1;
  if (opts.enforce !== false) enforceBoundary(g);
  const op = pressureOperator(g);
  const n = g.nx * g.ny;
  const rhs = g._rhs || (g._rhs = new Float64Array(n));
  divergence(g, g.div);
  const divBefore = cellNorms(g.div, g.solid, g.h);
  const inv = 1 / scale;
  for (let c = 0; c < n; c++) rhs[c] = op.active[c] ? -g.div[c] * inv : 0;
  if (opts.warm === false) g.p.fill(0);
  // Absolute floor: a divergence below tol·‖u*‖₂/h (what the velocity's own
  // size could produce) counts as zero, so re-projecting a projected field
  // stops at once instead of chasing round-off.
  let uu = 0;
  for (let k = 0; k < g.u.length; k++) uu += g.u[k] * g.u[k];
  for (let k = 0; k < g.v.length; k++) uu += g.v[k] * g.v[k];
  const tol = opts.tol ?? 1e-6;
  const res = yield* solver.run(op, rhs, {
    ...(opts.solver || {}),
    tol,
    atol: (tol * Math.sqrt(uu)) / (g.h * Math.abs(scale)),
    maxIter: opts.maxIter,
    x: g.p,
    trace: opts.trace,
    history: opts.history,
  });
  subtractGradient(g, g.p, scale);
  divergence(g, g.div);
  const divAfter = cellNorms(g.div, g.solid, g.h);
  return {
    method,
    divBefore,
    divAfter,
    relDiv: divBefore.max > 0 ? divAfter.max / divBefore.max : 0,
    iters: res.iters,
    residuals: res.residuals,
    work: res.work,
    converged: res.converged,
    incompatibility: res.rhsMean * scale,
  };
}

// Project the MAC velocity (g.u, g.v) onto discretely divergence-free fields,
// in place. Options and result as projectSteps.
export function project(g, opts = {}) {
  return drain(projectSteps(g, opts));
}

// Helmholtz–Hodge decomposition of a periodic MAC field (u: (nx+1)·ny, v:
// nx·(ny+1); the duplicate last column/row is ignored and rewritten).
//   opts.grid   a periodic macGrid(nx, ny, h) to reuse (else one is made);
//               the ψ operator and its multigrid hierarchy are cached on it
//   opts.method, opts.tol (default 'mgpcg', 1e-10)
//   opts.streamfunction  false to skip ψ
// Returns { divFreeU, divFreeV, curlFreeU, curlFreeV, phi, psi, meanU, meanV,
// stats }: u = divFree + curlFree, curlFree = G φ, divFree = curl ψ + mean,
// φ cell-centred (nx·ny), ψ at corners ((nx+1)·(ny+1), periodic duplicates
// filled). The result arrays are new on every call.
// Cost: two Poisson solves to 1e-10 (φ and ψ). With a reused grid, node 20 on
// a desktop: ≈ 4 ms at 64², 14 ms at 128² (tol 1e-6: 2.5 and 10 ms). Meant
// for a figure that decomposes a field on demand, not for every frame.
export function helmholtzHodge(u, v, nx, ny, h = 1 / nx, opts = {}) {
  const g = opts.grid || macGrid(nx, ny, h, { bc: 'periodic' });
  if (!g.periodicX || !g.periodicY) throw new Error('helmholtzHodge: needs a periodic grid');
  const su = nx + 1;
  g.u.set(u);
  g.v.set(v);
  enforceBoundary(g);
  let mu = 0;
  let mv = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) (mu += g.u[i + j * su]), (mv += g.v[i + j * nx]);
  mu /= nx * ny;
  mv /= nx * ny;
  const curlFreeU = Float64Array.from(g.u);
  const curlFreeV = Float64Array.from(g.v);
  const stats = project(g, { method: opts.method ?? 'mgpcg', tol: opts.tol ?? 1e-10, warm: false, enforce: false });
  const divFreeU = Float64Array.from(g.u);
  const divFreeV = Float64Array.from(g.v);
  for (let k = 0; k < curlFreeU.length; k++) curlFreeU[k] -= divFreeU[k];
  for (let k = 0; k < curlFreeV.length; k++) curlFreeV[k] -= divFreeV[k];
  const phi = Float64Array.from(g.p);
  let psi = null;
  if (opts.streamfunction !== false) {
    // A ψ = ω at the corners: the corner lattice of a periodic grid is again
    // an nx × ny periodic lattice with spacing h.
    const H = g._hodge || (g._hodge = { op: laplacian(nx, ny, h, { bc: 'periodic' }), w: new Float64Array((nx + 1) * (ny + 1)), rhs: new Float64Array(nx * ny) });
    const { w, rhs } = H;
    vorticityCorners(g, w, divFreeU, divFreeV);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) rhs[i + j * nx] = w[i + j * su];
    const sol = drain(SOLVERS.mgpcg.run(H.op, rhs, { tol: opts.tol ?? 1e-10 }));
    psi = new Float64Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) psi[i + j * su] = sol.x[(i % nx) + (j % ny) * nx];
  }
  return { divFreeU, divFreeV, curlFreeU, curlFreeV, phi, psi, meanU: mu, meanV: mv, stats };
}

// ---------------------------------------------------------------------------
// Collocated grid

// order: observed order of accuracy of the projected cell-centre velocity on
// a smooth field (all three are second order); stability: how the projection
// operator P behaves when applied repeatedly (Fourier analysis on the torus:
// the approximate projection is symmetric with eigenvalues
// 1 − (sin²θx + sin²θy) / (4 sin²(θx/2) + 4 sin²(θy/2)) ∈ [0, 1]).
export const COLLOCATED_KINDS = {
  exact: {
    id: 'exact',
    name: 'Exact projection (wide stencil)',
    description: 'Solves with the central-difference operator itself, so the central divergence vanishes, but four decoupled sub-grids let checkerboard pressure through.',
    tex: '\\mathrm{D}_c \\mathrm{G}_c\\,\\phi = \\mathrm{D}_c \\mathbf{u}^*, \\quad (\\mathrm{D}_c\\mathrm{G}_c\\phi)_{i} = \\frac{\\phi_{i+2} - 2\\phi_i + \\phi_{i-2}}{4h^2} + \\dots',
    order: 2,
    stability: 'A true orthogonal projection: idempotent, never adds energy. Each of the four parity sub-grids is singular on its own, so checkerboard pressure is invisible to it.',
  },
  approximate: {
    id: 'approximate',
    name: 'Approximate projection (compact stencil)',
    description: 'Solves with the compact 5-point Laplacian: no checkerboard null space, but the central divergence is only O(h²) small.',
    tex: '\\mathrm{L}\\,\\phi = \\mathrm{D}_c \\mathbf{u}^*, \\quad \\mathrm{D}_c \\mathbf{u} = (\\mathrm{L} - \\mathrm{D}_c\\mathrm{G}_c)\\,\\phi \\ne 0',
    order: 2,
    stability: 'Not idempotent (P² ≠ P) but stable: P is symmetric with eigenvalues in [0, 1], so it never adds energy, and repeating it drives the central divergence down monotonically (slowly for grid-scale modes).',
  },
  'rhie-chow': {
    id: 'rhie-chow',
    name: 'Momentum interpolation (Rhie–Chow)',
    description: 'Face velocities interpolated from the centres and projected exactly with the compact operator: the fluxes are divergence-free and feel odd–even pressure.',
    tex: 'u_{i+1/2} = \\overline{u}_{i+1/2} - \\Big(\\frac{\\phi_{i+1} - \\phi_i}{h} - \\overline{(\\mathrm{G}_c\\phi)}_{i+1/2}\\Big)',
    order: 2,
    stability: 'The face projection is exact (idempotent on the fluxes); the cell-centre velocities behave as the approximate projection.',
  },
};

// State for the collocated lesson: periodic nx × ny (both even), cell-centred
// u, v, p plus a periodic MAC grid `mac` that holds the face velocities of the
// Rhie–Chow variant.
export function collocatedGrid(nx, ny, h = 1 / nx) {
  if (nx % 2 || ny % 2 || nx < 4 || ny < 4) throw new Error('collocatedGrid: nx, ny must be even and >= 4');
  const n = nx * ny;
  const F = () => new Float64Array(n);
  return {
    nx,
    ny,
    h,
    u: F(),
    v: F(),
    p: F(),
    div: F(),
    gx: F(),
    gy: F(),
    rhs: F(),
    mac: macGrid(nx, ny, h, { bc: 'periodic' }),
    _op: null,
    _sub: null,
  };
}

// Generator form of collocatedProject(): yields solver events, and for
// 'exact' {t:'enter', kind:'subgrid', parity:[a, b], label} … {t:'leave',
// kind:'subgrid'} around each sub-grid solve.
//   opts.kind 'exact' | 'approximate' | 'rhie-chow' (default 'exact')
//   opts.method (default 'mgpcg'), opts.tol (default 1e-10), opts.trace
// Mutates cg.u, cg.v, cg.p (and cg.mac.u, cg.mac.v for 'rhie-chow').
// Returns { kind, divBefore, divAfter, relDiv, checkerboard, parity, iters,
// work, faceDivAfter?, rhieChowMax? } with div* = {max, l2} of the central
// divergence, checkerboard = checkerboardFraction(p) (the (−1)^{i+j} share),
// parity = parityFractions(p) ({checker, oddI, oddJ, total}: all the odd–even
// pressure the central gradient cannot see), faceDivAfter the MAC divergence
// of the face field and rhieChowMax = max |G_f φ − avg(G_c φ)|.
export function* collocatedProjectSteps(cg, opts = {}) {
  const kind = opts.kind ?? 'exact';
  if (!COLLOCATED_KINDS[kind]) throw new Error(`collocatedProject: unknown kind '${kind}'`);
  const method = opts.method ?? 'mgpcg';
  const solver = SOLVERS[method];
  const tol = opts.tol ?? 1e-10;
  const { nx, ny, h, u, v, p, div, gx, gy, rhs } = cg;
  const n = nx * ny;
  centralDivergence(u, v, nx, ny, h, div);
  const divBefore = cellNorms(div, null, h);
  for (let c = 0; c < n; c++) rhs[c] = -div[c];
  p.fill(0);
  let iters = 0;
  let work = 0;
  const out = { kind };
  if (kind === 'exact') {
    const NX = nx >> 1;
    const NY = ny >> 1;
    const sub = cg._sub || (cg._sub = { op: laplacian(NX, NY, 2 * h, { bc: 'periodic' }), b: new Float64Array(NX * NY), x: new Float64Array(NX * NY) });
    for (let pj = 0; pj < 2; pj++) {
      for (let pi = 0; pi < 2; pi++) {
        yield { t: 'enter', kind: 'subgrid', parity: [pi, pj], label: `sub-grid (i ${pi ? 'odd' : 'even'}, j ${pj ? 'odd' : 'even'})` };
        for (let J = 0; J < NY; J++) for (let I = 0; I < NX; I++) sub.b[I + J * NX] = rhs[2 * I + pi + (2 * J + pj) * nx];
        sub.x.fill(0);
        const res = yield* solver.run(sub.op, sub.b, { tol, x: sub.x, trace: opts.trace });
        for (let J = 0; J < NY; J++) for (let I = 0; I < NX; I++) p[2 * I + pi + (2 * J + pj) * nx] = sub.x[I + J * NX];
        iters += res.iters;
        work += res.work / 4;
        yield { t: 'leave', kind: 'subgrid' };
      }
    }
  } else {
    const op = cg._op || (cg._op = laplacian(nx, ny, h, { bc: 'periodic' }));
    if (kind === 'rhie-chow') {
      // Face velocities from the intermediate centre velocities.
      centresToFaces(cg.mac, u, v);
    }
    const res = yield* solver.run(op, rhs, { tol, x: p, trace: opts.trace });
    iters = res.iters;
    work = res.work;
    if (kind === 'rhie-chow') {
      const mac = cg.mac;
      subtractGradient(mac, p, 1);
      divergence(mac, mac.div);
      out.faceDivAfter = cellNorms(mac.div, null, h);
    }
  }
  centralGradient(p, nx, ny, h, gx, gy);
  for (let c = 0; c < n; c++) {
    u[c] -= gx[c];
    v[c] -= gy[c];
  }
  if (kind === 'rhie-chow') out.rhieChowMax = rhieChowTerm(cg, p);
  centralDivergence(u, v, nx, ny, h, div);
  out.divBefore = divBefore;
  out.divAfter = cellNorms(div, null, h);
  out.relDiv = divBefore.max > 0 ? out.divAfter.max / divBefore.max : 0;
  out.checkerboard = checkerboardFraction(p, nx, ny);
  out.parity = parityFractions(p, nx, ny);
  out.iters = iters;
  out.work = work;
  return out;
}

// Project the collocated velocity in place. See collocatedProjectSteps.
export function collocatedProject(cg, opts = {}) {
  return drain(collocatedProjectSteps(cg, opts));
}

// max over faces of |G_f φ − avg(G_c φ)|: the Rhie–Chow correction. For a
// smooth φ it is O(h²); for a checkerboard of amplitude a it is 2a/h.
// Uses cg.gx, cg.gy as scratch.
export function rhieChowTerm(cg, phi) {
  const { nx, ny, h, gx, gy } = cg;
  centralGradient(phi, nx, ny, h, gx, gy);
  let m = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      const e = ((i + 1) % nx) + j * nx;
      const nn = i + ((j + 1) % ny) * nx;
      const dx = Math.abs((phi[e] - phi[c]) / h - 0.5 * (gx[c] + gx[e]));
      const dy = Math.abs((phi[nn] - phi[c]) / h - 0.5 * (gy[c] + gy[nn]));
      if (dx > m) m = dx;
      if (dy > m) m = dy;
    }
  }
  return m;
}

// ---------------------------------------------------------------------------
// Presets

// Initial velocities for the collocated lesson. init(cg, seed) fills cg.u, cg.v.
export const COLLOCATED_PRESETS = {
  impulse: {
    id: 'impulse',
    name: 'One-cell kick',
    description: 'u = 1 in a single cell. The exact projection puts all the pressure on one of the four sub-grids: a checkerboard.',
    init(cg) {
      cg.u.fill(0);
      cg.v.fill(0);
      cg.u[(cg.nx >> 1) + (cg.ny >> 1) * cg.nx] = 1;
    },
  },
  smooth: {
    id: 'smooth',
    name: 'Smooth vortex plus gradient',
    description: 'A Taylor–Green vortex plus the gradient of a smooth potential: every method recovers the vortex closely.',
    init(cg) {
      const { nx, ny, h } = cg;
      const Lx = nx * h;
      const Ly = ny * h;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const x = ((i + 0.5) * h * 2 * Math.PI) / Lx;
          const y = ((j + 0.5) * h * 2 * Math.PI) / Ly;
          const c = i + j * nx;
          cg.u[c] = Math.sin(x) * Math.cos(y) + 0.5 * Math.cos(x) * Math.sin(2 * y);
          cg.v[c] = -Math.cos(x) * Math.sin(y) + Math.sin(x) * Math.cos(2 * y);
        }
      }
    },
  },
  noise: {
    id: 'noise',
    name: 'Random velocities',
    description: 'Seeded noise at every scale, including the grid scale.',
    init(cg, seed = 3) {
      const rand = rng(seed);
      for (let c = 0; c < cg.u.length; c++) {
        cg.u[c] = 2 * rand() - 1;
        cg.v[c] = 2 * rand() - 1;
      }
    },
  },
  'odd-even': {
    id: 'odd-even',
    name: 'Odd–even velocity',
    description: 'u = (−1)^i: a sawtooth whose central divergence is exactly zero, so no collocated projection removes it.',
    init(cg) {
      const { nx, ny } = cg;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) (cg.u[i + j * nx] = i & 1 ? -1 : 1), (cg.v[i + j * nx] = 0);
    },
  },
};

// Starting fields for the MAC projection figures. make(nx, ny, seed) returns
// a fresh macGrid with u*, v* set (not yet projected).
export const PROJECTION_PRESETS = {
  'random-box': {
    id: 'random-box',
    name: 'Random flow in a closed box',
    description: 'Seeded random face velocities inside four walls.',
    make(nx, ny = nx, seed = 1) {
      const g = macGrid(nx, ny, 1 / nx, { bc: 'wall' });
      const rand = rng(seed);
      for (let k = 0; k < g.u.length; k++) g.u[k] = 2 * rand() - 1;
      for (let k = 0; k < g.v.length; k++) g.v[k] = 2 * rand() - 1;
      return enforceBoundary(g);
    },
  },
  'obstacle-channel': {
    id: 'obstacle-channel',
    name: 'Channel past a cylinder',
    description: 'Inflow u = 1 on the left, an open outlet on the right, walls above and below, a solid disc: projection turns uniform flow into flow around the disc.',
    make(nx, ny = nx >> 1) {
      const h = 1 / nx;
      const g = macGrid(nx, ny, h, { bc: { left: 'wall', right: 'open', bottom: 'wall', top: 'wall' }, wall: { left: 1 } });
      const H = ny * h;
      const r = 0.15 * H;
      setSolid(g, (x, y) => (x - 0.3) ** 2 + (y - 0.5 * H) ** 2 < r * r);
      g.u.fill(1);
      g.v.fill(0);
      return enforceBoundary(g);
    },
  },
  'vortex-source': {
    id: 'vortex-source',
    name: 'Vortex plus source and sink (periodic)',
    description: 'A swirl plus a source–sink pair on a periodic square: the Hodge decomposition separates them.',
    make(nx, ny = nx) {
      const h = 1 / nx;
      const g = macGrid(nx, ny, h, { bc: 'periodic' });
      const su = nx + 1;
      const Ly = ny * h;
      // Swirl from a Gaussian streamfunction; source/sink from the gradient
      // of a potential with two opposite Gaussian bumps.
      const psi = (x, y) => 0.08 * Math.exp(-((x - 0.5) ** 2 + (y - 0.5 * Ly) ** 2) / 0.02);
      const phi = (x, y) => 0.03 * (Math.exp(-((x - 0.25) ** 2 + (y - 0.5 * Ly) ** 2) / 0.01) - Math.exp(-((x - 0.75) ** 2 + (y - 0.5 * Ly) ** 2) / 0.01));
      const d = 1e-5;
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i <= nx; i++) {
          const x = i * h;
          const y = (j + 0.5) * h;
          g.u[i + j * su] = (psi(x, y + d) - psi(x, y - d)) / (2 * d) + (phi(x + d, y) - phi(x - d, y)) / (2 * d);
        }
      }
      for (let j = 0; j <= ny; j++) {
        for (let i = 0; i < nx; i++) {
          const x = (i + 0.5) * h;
          const y = j * h;
          g.v[i + j * nx] = -(psi(x + d, y) - psi(x - d, y)) / (2 * d) + (phi(x, y + d) - phi(x, y - d)) / (2 * d);
        }
      }
      return enforceBoundary(g);
    },
  },
  jet: {
    id: 'jet',
    name: 'Jet in a closed box',
    description: 'A short rightward jet in the middle of a sealed box: the pressure pushes the fluid back around it into two eddies.',
    make(nx, ny = nx) {
      const g = macGrid(nx, ny, 1 / nx, { bc: 'wall' });
      const su = nx + 1;
      const j0 = Math.floor(ny * 0.45);
      const j1 = Math.ceil(ny * 0.55);
      const i0 = Math.floor(nx * 0.3);
      const i1 = Math.ceil(nx * 0.5);
      for (let j = j0; j < j1; j++) for (let i = i0; i <= i1; i++) g.u[i + j * su] = 1;
      return enforceBoundary(g);
    },
  },
};

// Face gradient G φ of the grid's current pressure g.p (the correction the
// last project() subtracted, divided by opts.scale), into gu, gv.
export function pressureGradient(g, gu, gv) {
  return gradient(g, g.p, gu, gv);
}
