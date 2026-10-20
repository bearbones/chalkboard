// Stable fluids: a real-time incompressible fluid on a MAC grid that you can
// stir with a pointer. One step is the classic operator split
//
//   advect (semi-Lagrangian, BFECC or MacCormack)  →  forces (sources,
//   buoyancy, vorticity confinement)  →  optional implicit viscosity  →
//   pressure projection
//
// and every stage is unconditionally stable, so the time step is chosen for
// looks and speed, not for stability: the CFL number may exceed 1. The price
// is accuracy: semi-Lagrangian advection with linear interpolation smears
// every field (numerical dissipation of order h²/Δt) and does not conserve
// what it carries. BFECC and MacCormack cancel the leading error; vorticity
// confinement puts back some of the swirl the smearing removed.
//
// CONVENTIONS
//   Grid: nx × ny square cells of side h; by default h = 1/nx, so the domain
//   is [0, 1] × [0, ny/nx] with the origin at the bottom-left corner.
//   Cell-centred fields (dye, temperature, pressure, solid mask): index
//   i + j·nx, j = 0 at the bottom, centre ((i + ½)h, (j + ½)h).
//   MAC velocity (grid2d.js): u on vertical faces, (nx + 1)·ny values, index
//   i + j·(nx + 1), at (i·h, (j + ½)h); v on horizontal faces, nx·(ny + 1)
//   values, index i + j·nx, at ((i + ½)h, j·h).
//   fluid.g is the grid2d macGrid; fluid.u, fluid.v, fluid.p, fluid.solid are
//   its arrays (same objects).
//
// UNITS (nondimensional)
//   Length in domain widths, time in "seconds" of the animation, density
//   ρ = 1, so the pressure p is in velocity² units and the projection uses
//   scale Δt/ρ = Δt (projection.js), leaving the true pressure in fluid.p.
//   A speed of 1 crosses the domain in one time unit; at 60 frames per second
//   and nx = 128 that is a CFL number of 128/60 ≈ 2.1. Dye and temperature
//   are dimensionless (temperature is the excess over ambient); buoyancy
//   coefficients α, β are accelerations per unit dye / temperature; ν is a
//   kinematic viscosity in (domain width)² per time unit; the confinement
//   strength ε is dimensionless.
//
// SCHEMES AND SOURCES
//   Operator splitting and semi-Lagrangian advection: J. Stam (1999), Stable
//     fluids, Proc. SIGGRAPH 99, 121–128 (§3: q^{n+1}(x) = q^n(x − Δt u),
//     with a second-order Runge–Kutta backtrace; there on a collocated grid,
//     here on the MAC grid of R. Bridson (2015), Fluid Simulation for
//     Computer Graphics, 2nd ed., CRC Press, ch. 2–3, whose order of stages
//     (advect, body forces, project) we follow, with viscosity before the
//     projection as in Stam 1999 §3). Backtrace: 'euler' x − Δt u(x);
//     'rk2' the midpoint rule x − Δt u(x − ½Δt u(x)) (Bridson §3.1).
//     Interpolation is bilinear (grid2d.js sampling conventions: clamped on
//     walls and open sides, wrapped on periodic ones). Deviation: the
//     sampler is re-implemented here because the limiters need the four
//     interpolation corners.
//   BFECC (back and forth error compensation and correction): B. Kim, Y. Liu,
//     I. Llamas & J. Rossignac (2005), FlowFixer: using BFECC for fluid
//     simulation, Eurographics Workshop on Natural Phenomena, 51–56.
//     q̂ = A(q), q̄ = Aᴿ(q̂), q̃ = q + ½(q − q̄), q^{n+1} = A(q̃), with A the
//     semi-Lagrangian step and Aᴿ the same step run backwards (velocity −u).
//     Published without a limiter (default 'none' here).
//   MacCormack with a limiter: A. Selle, R. Fedkiw, B. Kim, Y. Liu &
//     J. Rossignac (2008), An unconditionally stable MacCormack method,
//     J. Sci. Comput. 35, 350–371. q̂ = A(q), q̄ = Aᴿ(q̂),
//     q^{n+1} = q̂ + ½(q − q̄), then limited by the extrema of the four grid
//     values that the first semi-Lagrangian sample interpolated: 'clamp'
//     clips to [min, max] (the default for MacCormack); 'revert' falls back
//     to the semi-Lagrangian value q̂ wherever the corrected value leaves that
//     range. Either limiter can be applied to BFECC too.
//   Order of the step in time: whatever the advection scheme, the
//     advect-then-project splitting is first order in Δt (the commutator of
//     the two stages), so BFECC and MacCormack make the advection second
//     order in space but not the whole solver second order in time (measured
//     on the Taylor–Green vortex in the tests).
//   Vorticity confinement: J. Steinhoff & D. Underhill (1994), Phys. Fluids
//     6(8), 2738–2744; in the form of R. Fedkiw, J. Stam & H. W. Jensen
//     (2001), Visual simulation of smoke, Proc. SIGGRAPH 2001, 15–22, eq. 9–11:
//     N = ∇|ω| / |∇|ω||, f = ε h (N × ω), which in 2-D is
//     f = ε h ω (N_y, −N_x). Evaluated at cell centres from the corner
//     vorticity of grid2d.js averaged to centres, then averaged to faces.
//     It is computed first in the force stage, from the advected velocity,
//     before buoyancy and sources add their (not yet projected) impulses.
//   Boussinesq buoyancy: Fedkiw, Stam & Jensen (2001) eq. 8,
//     f = (−α s + β (T − T_amb)) ŷ with s the smoke density (dye channel 0)
//     and T the temperature (T_amb = 0), averaged to v faces.
//   Implicit viscosity: backward Euler (I − νΔt ∇²) u^{n+1} = u* on each face
//     grid (Stam 1999 §3; Bridson 2015 ch. 10), solved by red–black
//     Gauss–Seidel sweeps. Deviation: poisson.js has no shifted (Helmholtz)
//     operator, so the sweeps are local to this file. Walls are no-slip for
//     the tangential component (ghost value −u, wall half a cell away);
//     solid-face neighbours are Dirichlet at their value (0) one cell away
//     (first order there); open sides are zero-gradient. The same solver with
//     insulated (zero-flux) walls and solids gives optional dye diffusion.
//   Projection: projection.js (Chorin 1968; Bridson 2015 ch. 5) with any
//     poisson.js solver: 'jacobi' and 'red-black' for a fixed number of
//     sweeps, 'pcg-mic0' (Bridson §5.4), 'multigrid' and 'mgpcg' to a
//     relative tolerance. Warm-started from the previous pressure.
//   Classic test problems: Zalesak's slotted disc (S. T. Zalesak (1979),
//     J. Comput. Phys. 31, 335–362) in solid-body rotation; the inviscid
//     Taylor–Green vortex, an exact steady solution of the Euler equations
//     (G. I. Taylor & A. E. Green (1937), Proc. R. Soc. A 158, 499–521).
//
// BOUNDARIES AND SOLIDS
//   Domain sides as in grid2d.js: 'wall' (a prescribed normal velocity, 0 or
//   an inflow speed via opts.wall), 'open' (p = 0 outside) or 'periodic'.
//   Solid cells (addCircle, addBox) are stationary obstacles. Before each
//   advection the scalars are extrapolated one cell into the solids (mean of
//   the fluid neighbours) so that backtraces ending just inside an obstacle
//   do not drag zero dye into the fluid. Velocity is not extrapolated: a
//   backtrace that ends inside a solid reads the solid's zero face velocity,
//   which acts like a thin no-slip layer (Bridson 2015 extrapolates velocity
//   into solids instead; this is cheaper and only matters at the surface).
//   Solid cells hold zero dye and temperature after every step.
//
// WHAT IS NOT CONSERVED (measured in the tests)
//   Semi-Lagrangian interpolation is not conservative: Σ q(x − Δt u) ≠ Σ q.
//   fluid.diag.dyeAdvectDelta is the change in total dye made by this step's
//   advection alone; dyeDrift accumulates it since creation. In a closed box
//   that is pure numerical error; with open sides it also counts outflow,
//   and at an inflow wall the dye carried in from the edge cells (the
//   'obstacle' preset), so there it is not an error measure. Implicit dye
//   diffusion (params.diffusion) conserves dye only as far as its sweeps
//   converge, and is not included in dyeDrift.
//   Solids: the extrapolation reaches only cells that share an edge with
//   fluid (not the diagonal corner cells of a box), and a backtrace that
//   ends deeper inside an obstacle (CFL > 1 next to it) reads zero dye.
//   Kinetic energy is lost by interpolation (all schemes) and by an
//   incompletely converged projection; the projection itself never adds
//   energy without inflow (projection.js).
//
// PERFORMANCE (node 20 on a desktop; a mid-range phone is 3–5× slower and
// its frame budget is about 8 ms, so aim for ≤ 2 ms here)
//   Whole step, 'stir' preset with a pointer dragging through it (CFL ≈ 5),
//   MacCormack + RK2, two dye channels:
//     64²   multigrid 1.3 ms   (semi-Lagrangian 0.9 ms)
//     96²   multigrid 3.0 ms, mgpcg 3.3–3.5, Jacobi(30) 3.7–4.0,
//           red–black(30) 4.1–4.6, MIC(0)-PCG 4.9–5.4 (semi-Lagrangian 2.0)
//     128²  multigrid 5.3–5.7 ms, mgpcg 6.2, Jacobi(30) 6.5–7.1,
//           red–black(30) 7.6–8.0, MIC(0)-PCG 10.8–11.4 (semi-Lagrangian 3.7)
//   Projection alone: PRESSURE_SOLVERS[*].ms. MacCormack and BFECC cost
//   about twice semi-Lagrangian; RK2 adds about 40 % over Euler.
//   Recommended for phones: about 64² (4–6 k cells) with MacCormack, RK2 and
//   warm-started multigrid (the preset defaults, 1.2–1.7 ms per step); 96²
//   only with semi-Lagrangian advection. Fixed-sweep Jacobi is no cheaper
//   than multigrid here and leaves max|D u| near its pre-projection size.

import { rng, drain } from './util.js';
import { macGrid, setSolid, enforceBoundary, divergence, faceDot, vorticityCentres, velocityFromStreamfunction, SOLID, FACE_FIXED } from './grid2d.js';
import { projectSteps } from './projection.js';

// ---------------------------------------------------------------------------
// Metadata

// Advection schemes. order: observed order of the L2 error of a smooth blob
// carried once around a solid-body rotation at fixed CFL (measured in the
// tests with the RK2 backtrace; see claims there). samples: bilinear samples
// per advected value (velocity samples for the backtrace excluded).
export const ADVECTION = {
  'semi-lagrangian': {
    id: 'semi-lagrangian',
    name: 'Semi-Lagrangian',
    description: 'Follow the flow backwards from each grid point for one time step and interpolate the old field there. Stable at any CFL number, but every interpolation smooths, so fields blur and energy drains away.',
    tex: 'q_{\\mathbf{x}}^{n+1} = q^{n}\\big(\\mathbf{x} - \\Delta t\\,\\mathbf{u}(\\mathbf{x})\\big)',
    order: 1,
    samples: 1,
    defaultLimiter: 'none',
    stability: 'Unconditionally stable: linear interpolation is a convex combination of old values, so max |q| never grows, at any CFL number.',
    cite: 'Courant, Isaacson & Rees (1952); Stam (1999) §3; Bridson (2015) ch. 3',
  },
  bfecc: {
    id: 'bfecc',
    name: 'BFECC',
    description: 'Advect forwards, then backwards; half the difference from the start is the error of one step. Correct the old field by it and advect again.',
    tex: '\\hat q = A(q),\\quad \\bar q = A^{R}(\\hat q),\\quad q^{n+1} = A\\big(q + \\tfrac{1}{2}(q - \\bar q)\\big)',
    order: 2,
    samples: 3,
    defaultLimiter: 'none',
    stability: 'Stable in practice for linear advection at large CFL; without a limiter it can overshoot near sharp fronts (new extrema).',
    cite: 'Kim, Liu, Llamas & Rossignac (2005); Dupont & Liu (2003)',
  },
  maccormack: {
    id: 'maccormack',
    name: 'MacCormack (limited)',
    description: 'Like BFECC, but the error estimate corrects the forward result directly, saving one advection. A limiter clamps the result to the values it was interpolated from.',
    tex: '\\hat q = A(q),\\quad \\bar q = A^{R}(\\hat q),\\quad q^{n+1} = \\hat q + \\tfrac{1}{2}(q - \\bar q)',
    order: 2,
    samples: 2,
    defaultLimiter: 'clamp',
    stability: 'With the clamping limiter the result never leaves the range of the values it was interpolated from, so it is as bounded as semi-Lagrangian at any CFL number; second order where the field is smooth.',
    cite: 'Selle, Fedkiw, Kim, Liu & Rossignac (2008)',
  },
};

export const BACKTRACE = {
  euler: {
    id: 'euler',
    name: 'Euler backtrace',
    description: 'One straight step back along the velocity at the grid point. On a curved path it lands outside the circle: a rotating blob spirals outwards.',
    tex: '\\mathbf{x}_d = \\mathbf{x} - \\Delta t\\,\\mathbf{u}(\\mathbf{x})',
    order: 1,
  },
  rk2: {
    id: 'rk2',
    name: 'Midpoint (RK2) backtrace',
    description: 'Step back half way, read the velocity there, and use it for the full step.',
    tex: '\\mathbf{x}_d = \\mathbf{x} - \\Delta t\\,\\mathbf{u}\\big(\\mathbf{x} - \\tfrac{1}{2}\\Delta t\\,\\mathbf{u}(\\mathbf{x})\\big)',
    order: 2,
  },
};

export const LIMITERS = {
  none: { id: 'none', name: 'No limiter', description: 'Use the corrected value as it is: sharper, but it may overshoot.' },
  clamp: {
    id: 'clamp',
    name: 'Clamp',
    description: 'Clamp the corrected value to the range of the four grid values the first interpolation used: no new extrema.',
    tex: 'q^{n+1} \\leftarrow \\min\\big(\\max(q^{n+1}, q_{\\min}), q_{\\max}\\big)',
  },
  revert: {
    id: 'revert',
    name: 'Revert',
    description: 'If the corrected value leaves that range, fall back to the plain semi-Lagrangian value.',
  },
};

// Pressure solvers passed through to projection.js / poisson.js. fixed: the
// solver runs exactly params.pressureIters sweeps (tol 0), as real-time codes
// do; otherwise it runs to the relative tolerance params.pressureTol (capped
// at params.pressureMaxIter). defaults: the DEFAULT_PARAMS values step() uses.
// ms: measured cost of the projection stage per step, { 96: …, 128: … } in
// milliseconds, in the 'stir' preset while a pointer drags through it
// (warm-started, CFL ≈ 5), node 20 on a desktop; a mid-range phone is 3–5×
// slower. relDiv: the largest max|D u| / max|D u*| seen in that run.
export const PRESSURE_SOLVERS = {
  jacobi: {
    id: 'jacobi',
    method: 'jacobi',
    name: 'Jacobi, fixed sweeps',
    description: 'A fixed number of weighted Jacobi sweeps, warm-started from the last pressure. Cheap and parallel, but far from converged: divergence is left behind and the flow looks compressible at large scales.',
    fixed: true,
    defaults: { iterations: 30, omega: 0.8 },
    ms: { 96: 1.9, 128: 3.5 },
    relDiv: 1.1,
    tex: 'p_c \\leftarrow p_c + \\omega\\,\\frac{b_c - (A p)_c}{a_{cc}}',
  },
  'red-black': {
    id: 'red-black',
    method: 'red-black',
    name: 'Red–black Gauss–Seidel, fixed sweeps',
    description: 'A fixed number of red–black Gauss–Seidel sweeps: about twice as effective per sweep as Jacobi.',
    fixed: true,
    defaults: { iterations: 30 },
    ms: { 96: 2.5, 128: 4.4 },
    relDiv: 1.1,
  },
  'pcg-mic0': {
    id: 'pcg-mic0',
    method: 'pcg-mic0',
    name: 'MIC(0)-preconditioned CG',
    description: 'Conjugate gradients with a modified incomplete Cholesky preconditioner (Bridson 2015 §5.4) to a relative tolerance.',
    fixed: false,
    defaults: { tol: 1e-4, maxIter: 50 },
    ms: { 96: 3.3, 128: 7.7 },
    relDiv: 2.3e-2,
  },
  multigrid: {
    id: 'multigrid',
    method: 'multigrid',
    name: 'Multigrid V-cycles',
    description: 'V(2,2) cycles to a relative tolerance; warm-started from the last pressure, one or two cycles per frame suffice. The default, and the fastest here.',
    fixed: false,
    defaults: { tol: 1e-4, maxIter: 50 },
    ms: { 96: 1.2, 128: 2.1 },
    relDiv: 4e-3,
  },
  mgpcg: {
    id: 'mgpcg',
    method: 'mgpcg',
    name: 'Multigrid-preconditioned CG',
    description: 'CG with one V-cycle as preconditioner: robust around obstacles; the reference solver for tests (with a tight tolerance).',
    fixed: false,
    defaults: { tol: 1e-4, maxIter: 50 },
    ms: { 96: 1.5, 128: 2.6 },
    relDiv: 1.1e-2,
  },
};

// Force terms (for the chapter's equations).
export const FORCES = {
  buoyancy: {
    id: 'buoyancy',
    name: 'Boussinesq buoyancy',
    description: 'Hot fluid rises, smoke-laden fluid sinks; density differences matter only through this force.',
    tex: '\\mathbf{f}_{\\mathrm{buoy}} = \\big(-\\alpha\\, s + \\beta\\,(T - T_{\\mathrm{amb}})\\big)\\,\\hat{\\mathbf{y}}',
    cite: 'Fedkiw, Stam & Jensen (2001) eq. 8',
  },
  confinement: {
    id: 'confinement',
    name: 'Vorticity confinement',
    description: 'Push fluid around each vortex in its own direction of spin, towards the vortex core, to undo some of the numerical smearing. Scaled by h, so it vanishes as the grid is refined.',
    tex: '\\mathbf{N} = \\frac{\\nabla|\\omega|}{|\\nabla|\\omega||},\\quad \\mathbf{f}_{\\mathrm{conf}} = \\varepsilon\\, h\\,(\\mathbf{N} \\times \\boldsymbol{\\omega})',
    cite: 'Steinhoff & Underhill (1994); Fedkiw, Stam & Jensen (2001) eq. 9–11',
  },
  viscosity: {
    id: 'viscosity',
    name: 'Implicit viscosity',
    description: 'Backward Euler diffusion of each velocity component: stable for any ν Δt / h².',
    tex: '\\big(I - \\nu\\,\\Delta t\\,\\nabla_h^2\\big)\\,\\mathbf{u}^{n+1} = \\mathbf{u}^{*}',
    cite: 'Stam (1999) §3; Bridson (2015) ch. 10',
  },
};

// The four stages of a step, in order (stepPhases yields these).
export const PHASES = [
  { id: 'advect', name: 'Advect', description: 'Carry velocity, dye and temperature along the old velocity field.' },
  { id: 'forces', name: 'Forces', description: 'Add sources, buoyancy and vorticity confinement; decay dye and heat.' },
  { id: 'viscosity', name: 'Viscosity', description: 'Implicit diffusion of velocity (and dye), when switched on.' },
  { id: 'project', name: 'Project', description: 'Solve for pressure and subtract its gradient: the velocity becomes divergence-free.' },
];

// Defaults for step(fluid, dt, params): any key left out of params takes
// this value. Flat keys so that sliders can bind to them.
export const DEFAULT_PARAMS = Object.freeze({
  advection: 'maccormack', // key of ADVECTION
  backtrace: 'rk2', // key of BACKTRACE
  limiter: null, // key of LIMITERS; null → the scheme's defaultLimiter
  advectVelocity: true, // false: velocity is frozen (kinematic tests); scalars still move
  project: true, // false: skip the projection (watch divergence appear)
  pressure: 'multigrid', // key of PRESSURE_SOLVERS
  pressureIters: 30, // sweeps for the fixed solvers
  pressureTol: 1e-4, // relative tolerance for the others
  pressureMaxIter: 50,
  jacobiOmega: 0.8,
  viscosity: 0, // kinematic ν
  diffusion: 0, // dye diffusivity κ
  diffusionIters: 30, // red–black sweeps (cap) for viscosity and dye diffusion
  diffusionTol: 1e-6,
  vorticity: 0, // confinement ε
  buoyancyAlpha: 0, // weight of smoke (dye channel 0)
  buoyancyBeta: 0, // thermal lift
  dyeDecay: 0, // per unit time, all channels
  heatDecay: 0, // per unit time
  sources: true, // apply fluid.sources
  diagnostics: true, // false: skip energy/enstrophy (cheaper)
  trace: false, // passed to the pressure solver (stepPhases figures)
});

const P = (params, key) => (params[key] !== undefined ? params[key] : DEFAULT_PARAMS[key]);

// ---------------------------------------------------------------------------
// Creation

// A fluid at rest.
//   nx, ny       cells (ny defaults to nx); h defaults to 1/nx
//   bc, wall     domain sides and wall speeds as grid2d.macGrid
//   channels     number of dye fields (default 1); fluid.dye is channel 0
//   temperature  true to advect temperature from the start (it also switches
//                on when a source or splat adds heat)
// Returns the state object; every array is allocated here (and the advection
// and diffusion workspaces on first use), never inside step().
export function createFluid(opts = {}) {
  const nx = opts.nx ?? 64;
  const ny = opts.ny ?? nx;
  const h = opts.h ?? 1 / nx;
  const g = macGrid(nx, ny, h, { bc: opts.bc ?? 'wall', wall: opts.wall });
  const n = nx * ny;
  const nf = (nx + 1) * (ny + 1);
  const channels = opts.channels ?? 1;
  const dyes = [];
  for (let k = 0; k < channels; k++) dyes.push(new Float64Array(n));
  const F = {
    nx,
    ny,
    h,
    g,
    u: g.u,
    v: g.v,
    p: g.p,
    solid: g.solid,
    dyes,
    dye: dyes[0],
    temp: new Float64Array(n),
    tempActive: !!opts.temperature,
    sources: [],
    t: 0,
    steps: 0,
    dyeInjected: 0,
    dyeDrift: 0,
    // Workspaces.
    u0: new Float64Array((nx + 1) * ny),
    v0: new Float64Array(nx * (ny + 1)),
    px: new Float64Array(nf), // departure points (grid units)
    py: new Float64Array(nf),
    qx: new Float64Array(nf), // arrival points (forward trace)
    qy: new Float64Array(nf),
    s1: new Float64Array(nf),
    s2: new Float64Array(nf),
    lo: new Float64Array(nf),
    hi: new Float64Array(nf),
    cell: new Float64Array(n), // scalar scratch
    wc: new Float64Array(n), // vorticity at centres
    wcorner: new Float64Array(nf),
    fxc: new Float64Array(n),
    fyc: new Float64Array(n),
    layouts: null,
    _rim: null,
    _rimVersion: -1,
    _diff: null,
    _projOpts: { method: 'multigrid', tol: 1e-4, maxIter: 50, scale: 1, solver: { omega: 0.8 }, history: false, trace: false },
    diag: {
      t: 0,
      step: 0,
      dt: 0,
      cfl: 0,
      maxSpeed: 0,
      ke: 0,
      enstrophy: 0,
      divBefore: 0,
      divAfter: 0,
      divRel: 0,
      pressureSolver: '',
      pressureIters: 0,
      pressureResidual: 0,
      pressureConverged: true,
      viscosityIters: 0,
      viscosityResidual: 0,
      dye: 0,
      dyeAdvectDelta: 0,
      dyeDrift: 0,
      dyeDriftRel: 0,
      dyeInjected: 0,
    },
    meta: {},
  };
  const px = g.periodicX;
  const py = g.periodicY;
  F.layouts = {
    // Points of each field, in grid units: point (i, j) of a layout sits at
    // (i + ox, j + oy); ni × nj distinct samples for interpolation (periodic
    // duplicates excluded), cols × rows points stored with row stride cols.
    U: { id: 'U', cols: nx + 1, rows: ny, ni: px ? nx : nx + 1, nj: ny, ox: 0, oy: 0.5 },
    V: { id: 'V', cols: nx, rows: ny + 1, ni: nx, nj: py ? ny : ny + 1, ox: 0.5, oy: 0 },
    C: { id: 'C', cols: nx, rows: ny, ni: nx, nj: ny, ox: 0.5, oy: 0.5 },
  };
  F.diag.dye = dyeTotal(F);
  return F;
}

// ---------------------------------------------------------------------------
// Bilinear sampling (grid2d.js conventions: clamp to the last sample on a
// non-periodic axis, wrap on a periodic one). f[a + b·stride], a < ni, b < nj,
// at fractional sample coordinates (fa, fb). Two versions: bilerpWrap handles
// periodic axes; bilerpClamp is the fast path for a domain with no periodic
// side (it clamps to [0, ni − 1] by taking the last cell with weight 1, so it
// never reads past a row). The *MM variants also store the min and max of the
// four corners in lo[k], hi[k] for the limiters.

function bilerpWrap(f, stride, ni, nj, fa, fb, wrapA, wrapB) {
  let a0;
  let a1;
  let ta;
  if (wrapA) {
    fa -= Math.floor(fa / ni) * ni;
    if (fa >= ni) fa = 0;
    a0 = Math.floor(fa);
    ta = fa - a0;
    a1 = a0 + 1 === ni ? 0 : a0 + 1;
  } else if (fa <= 0) {
    a0 = a1 = 0;
    ta = 0;
  } else if (fa >= ni - 1) {
    a0 = a1 = ni - 1;
    ta = 0;
  } else {
    a0 = Math.floor(fa);
    a1 = a0 + 1;
    ta = fa - a0;
  }
  let b0;
  let b1;
  let tb;
  if (wrapB) {
    fb -= Math.floor(fb / nj) * nj;
    if (fb >= nj) fb = 0;
    b0 = Math.floor(fb);
    tb = fb - b0;
    b1 = b0 + 1 === nj ? 0 : b0 + 1;
  } else if (fb <= 0) {
    b0 = b1 = 0;
    tb = 0;
  } else if (fb >= nj - 1) {
    b0 = b1 = nj - 1;
    tb = 0;
  } else {
    b0 = Math.floor(fb);
    b1 = b0 + 1;
    tb = fb - b0;
  }
  const r0 = b0 * stride;
  const r1 = b1 * stride;
  const f00 = f[a0 + r0];
  const f10 = f[a1 + r0];
  const f01 = f[a0 + r1];
  const f11 = f[a1 + r1];
  const lo = f00 + ta * (f10 - f00);
  const hi = f01 + ta * (f11 - f01);
  return lo + tb * (hi - lo);
}

function bilerpWrapMM(f, stride, ni, nj, fa, fb, wrapA, wrapB, lo, hi, k) {
  let a0;
  let a1;
  let ta;
  if (wrapA) {
    fa -= Math.floor(fa / ni) * ni;
    if (fa >= ni) fa = 0;
    a0 = Math.floor(fa);
    ta = fa - a0;
    a1 = a0 + 1 === ni ? 0 : a0 + 1;
  } else if (fa <= 0) {
    a0 = a1 = 0;
    ta = 0;
  } else if (fa >= ni - 1) {
    a0 = a1 = ni - 1;
    ta = 0;
  } else {
    a0 = Math.floor(fa);
    a1 = a0 + 1;
    ta = fa - a0;
  }
  let b0;
  let b1;
  let tb;
  if (wrapB) {
    fb -= Math.floor(fb / nj) * nj;
    if (fb >= nj) fb = 0;
    b0 = Math.floor(fb);
    tb = fb - b0;
    b1 = b0 + 1 === nj ? 0 : b0 + 1;
  } else if (fb <= 0) {
    b0 = b1 = 0;
    tb = 0;
  } else if (fb >= nj - 1) {
    b0 = b1 = nj - 1;
    tb = 0;
  } else {
    b0 = Math.floor(fb);
    b1 = b0 + 1;
    tb = fb - b0;
  }
  const r0 = b0 * stride;
  const r1 = b1 * stride;
  const f00 = f[a0 + r0];
  const f10 = f[a1 + r0];
  const f01 = f[a0 + r1];
  const f11 = f[a1 + r1];
  lo[k] = Math.min(Math.min(f00, f10), Math.min(f01, f11));
  hi[k] = Math.max(Math.max(f00, f10), Math.max(f01, f11));
  const l = f00 + ta * (f10 - f00);
  const u = f01 + ta * (f11 - f01);
  return l + tb * (u - l);
}

// ni1 = ni − 1, nj1 = nj − 1 (both ≥ 1). A clamped axis reads its edge
// sample twice with weight 0 on the copy (da or db = 0), so a point on or
// beyond the edge returns that sample exactly (f + 0·(f − f) = f; the form
// f00 + 1·(f10 − f00) would be off by an ulp).
function bilerpClamp(f, stride, ni1, nj1, fa, fb) {
  let a0;
  let ta;
  let da = 1;
  if (fa <= 0) {
    a0 = 0;
    ta = 0;
  } else if (fa >= ni1) {
    a0 = ni1;
    ta = 0;
    da = 0;
  } else {
    a0 = fa | 0;
    ta = fa - a0;
  }
  let b0;
  let tb;
  let db = stride;
  if (fb <= 0) {
    b0 = 0;
    tb = 0;
  } else if (fb >= nj1) {
    b0 = nj1;
    tb = 0;
    db = 0;
  } else {
    b0 = fb | 0;
    tb = fb - b0;
  }
  const k = a0 + b0 * stride;
  const f00 = f[k];
  const f10 = f[k + da];
  const f01 = f[k + db];
  const f11 = f[k + db + da];
  const l = f00 + ta * (f10 - f00);
  const u = f01 + ta * (f11 - f01);
  return l + tb * (u - l);
}

// As bilerpClamp. The range is that of the four corners read (at the low
// edge, fa ≤ 0, that includes one zero-weight neighbour: a slightly wider
// range, still inside the field's own min and max, so no new extrema are
// possible).
function bilerpClampMM(f, stride, ni1, nj1, fa, fb, lo, hi, m) {
  let a0;
  let ta;
  let da = 1;
  if (fa <= 0) {
    a0 = 0;
    ta = 0;
  } else if (fa >= ni1) {
    a0 = ni1;
    ta = 0;
    da = 0;
  } else {
    a0 = fa | 0;
    ta = fa - a0;
  }
  let b0;
  let tb;
  let db = stride;
  if (fb <= 0) {
    b0 = 0;
    tb = 0;
  } else if (fb >= nj1) {
    b0 = nj1;
    tb = 0;
    db = 0;
  } else {
    b0 = fb | 0;
    tb = fb - b0;
  }
  const k = a0 + b0 * stride;
  const f00 = f[k];
  const f10 = f[k + da];
  const f01 = f[k + db];
  const f11 = f[k + db + da];
  const m0 = f00 < f10 ? f00 : f10;
  const m1 = f01 < f11 ? f01 : f11;
  const x0 = f00 > f10 ? f00 : f10;
  const x1 = f01 > f11 ? f01 : f11;
  lo[m] = m0 < m1 ? m0 : m1;
  hi[m] = x0 > x1 ? x0 : x1;
  const l = f00 + ta * (f10 - f00);
  const u = f01 + ta * (f11 - f01);
  return l + tb * (u - l);
}

// ---------------------------------------------------------------------------
// Advection

// Is point k of layout L a non-moving point (fixed face, solid cell)?
function skipMask(F, L) {
  return L.id === 'U' ? F.g.uType : L.id === 'V' ? F.g.vType : F.g.solid;
}
function skipValue(L) {
  return L.id === 'C' ? SOLID : FACE_FIXED;
}

// Trace every moving point of layout L through the velocity (u0, v0) for
// time sign·dt; positions in grid units into (outX, outY). sign = +1 traces
// backwards (departure points), −1 forwards (arrival points).
function tracePoints(F, L, sign, dt, rk2, outX, outY) {
  const { nx, h, u0, v0 } = F;
  const wx = F.g.periodicX;
  const wy = F.g.periodicY;
  const wrap = wx || wy;
  const su = nx + 1;
  const LU = F.layouts.U;
  const LV = F.layouts.V;
  const uni = LU.ni;
  const unj = LU.nj;
  const vni = LV.ni;
  const vnj = LV.nj;
  const s = (sign * dt) / h;
  const half = 0.5 * s;
  const { cols, rows, ox, oy } = L;
  const mask = skipMask(F, L);
  const sv = skipValue(L);
  const id = L.id === 'U' ? 0 : L.id === 'V' ? 1 : 2;
  for (let j = 0; j < rows; j++) {
    const y = j + oy;
    for (let i = 0; i < cols; i++) {
      const k = i + j * cols;
      const x = i + ox;
      if (mask[k] === sv) {
        outX[k] = x;
        outY[k] = y;
        continue;
      }
      // Velocity at the point itself: the own component is stored there.
      let u;
      let v;
      if (id === 0) {
        u = u0[k];
        v = wrap ? bilerpWrap(v0, nx, vni, vnj, x - 0.5, y, wx, wy) : bilerpClamp(v0, nx, vni - 1, vnj - 1, x - 0.5, y);
      } else if (id === 1) {
        u = wrap ? bilerpWrap(u0, su, uni, unj, x, y - 0.5, wx, wy) : bilerpClamp(u0, su, uni - 1, unj - 1, x, y - 0.5);
        v = v0[k];
      } else {
        u = 0.5 * (u0[i + j * su] + u0[i + 1 + j * su]);
        v = 0.5 * (v0[k] + v0[k + nx]);
      }
      if (rk2) {
        const xm = x - half * u;
        const ym = y - half * v;
        if (wrap) {
          u = bilerpWrap(u0, su, uni, unj, xm, ym - 0.5, wx, wy);
          v = bilerpWrap(v0, nx, vni, vnj, xm - 0.5, ym, wx, wy);
        } else {
          u = bilerpClamp(u0, su, uni - 1, unj - 1, xm, ym - 0.5);
          v = bilerpClamp(v0, nx, vni - 1, vnj - 1, xm - 0.5, ym);
        }
      }
      outX[k] = x - s * u;
      outY[k] = y - s * v;
    }
  }
}

// One semi-Lagrangian pass: dst[k] = src(X[k], Y[k]) on moving points;
// fixed points copy src. With mm, the corner range of every sample goes to
// F.lo, F.hi.
function slPass(F, L, dst, src, X, Y, mm) {
  const { cols, rows, ni, nj, ox, oy } = L;
  const wx = F.g.periodicX;
  const wy = F.g.periodicY;
  const mask = skipMask(F, L);
  const sv = skipValue(L);
  const n = cols * rows;
  const lo = F.lo;
  const hi = F.hi;
  if (wx || wy) {
    for (let k = 0; k < n; k++) {
      if (mask[k] === sv) dst[k] = src[k];
      else if (mm) dst[k] = bilerpWrapMM(src, cols, ni, nj, X[k] - ox, Y[k] - oy, wx, wy, lo, hi, k);
      else dst[k] = bilerpWrap(src, cols, ni, nj, X[k] - ox, Y[k] - oy, wx, wy);
    }
    return;
  }
  const ni1 = ni - 1;
  const nj1 = nj - 1;
  if (mm) {
    for (let k = 0; k < n; k++) dst[k] = mask[k] === sv ? src[k] : bilerpClampMM(src, cols, ni1, nj1, X[k] - ox, Y[k] - oy, lo, hi, k);
  } else {
    for (let k = 0; k < n; k++) dst[k] = mask[k] === sv ? src[k] : bilerpClamp(src, cols, ni1, nj1, X[k] - ox, Y[k] - oy);
  }
}

// Advect field `q` (layout L) in place with the current departure points
// (F.px, F.py) and, for BFECC/MacCormack, arrival points (F.qx, F.qy).
// Fixed points keep their value, or become 0 with fixedZero (solid cells for
// scalars; their extrapolated values are still used by the passes).
function advectField(F, L, q, scheme, limiter, fixedZero) {
  const { px, py, qx, qy, s1, s2, lo, hi } = F;
  const n = L.cols * L.rows;
  const mask = skipMask(F, L);
  const sv = skipValue(L);
  if (scheme === 'semi-lagrangian') {
    slPass(F, L, s1, q, px, py, false);
    for (let k = 0; k < n; k++) q[k] = fixedZero && mask[k] === sv ? 0 : s1[k];
    return;
  }
  const lim = limiter === 'clamp' ? 1 : limiter === 'revert' ? 2 : 0;
  // q̂ = A(q) (with the corner range for the limiter), q̄ = Aᴿ(q̂).
  slPass(F, L, s1, q, px, py, lim !== 0);
  slPass(F, L, s2, s1, qx, qy, false);
  if (scheme === 'maccormack') {
    for (let k = 0; k < n; k++) {
      if (mask[k] === sv) {
        if (fixedZero) q[k] = 0;
        continue;
      }
      let r = s1[k] + 0.5 * (q[k] - s2[k]);
      if (lim === 1) r = r < lo[k] ? lo[k] : r > hi[k] ? hi[k] : r;
      else if (lim === 2 && (r < lo[k] || r > hi[k])) r = s1[k];
      q[k] = r;
    }
    return;
  }
  // BFECC: q̃ = q + ½(q − q̄) into s2, then q^{n+1} = A(q̃) into q, keeping
  // the semi-Lagrangian value q̂ (s1) for the 'revert' limiter.
  for (let k = 0; k < n; k++) s2[k] = mask[k] === sv ? q[k] : q[k] + 0.5 * (q[k] - s2[k]);
  const { cols, ni, nj, ox, oy } = L;
  const wx = F.g.periodicX;
  const wy = F.g.periodicY;
  const wrap = wx || wy;
  for (let k = 0; k < n; k++) {
    if (mask[k] === sv) {
      if (fixedZero) q[k] = 0;
      continue;
    }
    let r = wrap ? bilerpWrap(s2, cols, ni, nj, px[k] - ox, py[k] - oy, wx, wy) : bilerpClamp(s2, cols, ni - 1, nj - 1, px[k] - ox, py[k] - oy);
    if (lim === 1) r = r < lo[k] ? lo[k] : r > hi[k] ? hi[k] : r;
    else if (lim === 2 && (r < lo[k] || r > hi[k])) r = s1[k];
    q[k] = r;
  }
}

// Solid cells next to fluid (rebuilt when the mask changes).
function solidRim(F) {
  const g = F.g;
  if (F._rim && F._rimVersion === g.version) return F._rim;
  const { nx, ny, solid } = g;
  const list = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (!solid[c]) continue;
      if ((i > 0 && !solid[c - 1]) || (i < nx - 1 && !solid[c + 1]) || (j > 0 && !solid[c - nx]) || (j < ny - 1 && !solid[c + nx])) list.push(c);
    }
  }
  let any = 0;
  for (let c = 0; c < nx * ny; c++) any |= solid[c];
  F._rim = { cells: Int32Array.from(list), any: !!any };
  F._rimVersion = g.version;
  return F._rim;
}

// Fill the rim of the solids with the mean of their fluid neighbours.
function extrapolateIntoSolids(F, q) {
  const rim = solidRim(F);
  if (!rim.any) return;
  const { nx, ny, solid } = F.g;
  const cells = rim.cells;
  for (let m = 0; m < cells.length; m++) {
    const c = cells[m];
    const i = c % nx;
    const j = (c - i) / nx;
    let s = 0;
    let w = 0;
    if (i > 0 && !solid[c - 1]) (s += q[c - 1]), w++;
    if (i < nx - 1 && !solid[c + 1]) (s += q[c + 1]), w++;
    if (j > 0 && !solid[c - nx]) (s += q[c - nx]), w++;
    if (j < ny - 1 && !solid[c + nx]) (s += q[c + nx]), w++;
    q[c] = w ? s / w : 0;
  }
}

// The advection stage: velocity (unless frozen), every dye channel and the
// temperature are carried along the velocity at the start of the step.
export function advectPhase(F, dt, params = DEFAULT_PARAMS) {
  const scheme = P(params, 'advection');
  const info = ADVECTION[scheme];
  if (!info) throw new Error(`stablefluids: unknown advection '${scheme}'`);
  const limiter = P(params, 'limiter') ?? info.defaultLimiter;
  if (!LIMITERS[limiter]) throw new Error(`stablefluids: unknown limiter '${limiter}'`);
  const bt = P(params, 'backtrace');
  if (!BACKTRACE[bt]) throw new Error(`stablefluids: unknown backtrace '${bt}'`);
  const rk2 = bt === 'rk2';
  const twoWay = scheme !== 'semi-lagrangian';
  const g = F.g;
  F.u0.set(g.u);
  F.v0.set(g.v);
  const { U, V, C } = F.layouts;
  if (P(params, 'advectVelocity')) {
    tracePoints(F, U, 1, dt, rk2, F.px, F.py);
    if (twoWay) tracePoints(F, U, -1, dt, rk2, F.qx, F.qy);
    advectField(F, U, g.u, scheme, limiter, false);
    tracePoints(F, V, 1, dt, rk2, F.px, F.py);
    if (twoWay) tracePoints(F, V, -1, dt, rk2, F.qx, F.qy);
    advectField(F, V, g.v, scheme, limiter, false);
    enforceBoundary(g);
  }
  tracePoints(F, C, 1, dt, rk2, F.px, F.py);
  if (twoWay) tracePoints(F, C, -1, dt, rk2, F.qx, F.qy);
  const before = dyeTotal(F);
  for (let k = 0; k < F.dyes.length; k++) {
    extrapolateIntoSolids(F, F.dyes[k]);
    advectField(F, C, F.dyes[k], scheme, limiter, true);
  }
  if (F.tempActive) {
    extrapolateIntoSolids(F, F.temp);
    advectField(F, C, F.temp, scheme, limiter, true);
  }
  const delta = dyeTotal(F) - before;
  F.diag.dyeAdvectDelta = delta;
  F.dyeDrift += delta;
}

// ---------------------------------------------------------------------------
// Forces

// Add a Gaussian footprint w = exp(−r²/R²) (cut at 3R) centred at physical
// (x, y): velocity += (du, dv)·w on movable faces, dye += amount·w (number
// for channel 0, or one number per channel), temperature += heat·w. With
// set = true the scalars are raised to max(q, amount·w) instead (an emitter
// that holds its value). Returns the dye added (all channels, × h²).
function footprint(F, x, y, R, du, dv, dye, heat, set) {
  const { nx, ny, h, g } = F;
  const su = nx + 1;
  const ir2 = 1 / (R * R);
  const reach = 3 * R;
  const i0 = Math.max(0, Math.floor((x - reach) / h) - 1);
  const i1 = Math.min(nx, Math.ceil((x + reach) / h) + 1);
  const j0 = Math.max(0, Math.floor((y - reach) / h) - 1);
  const j1 = Math.min(ny, Math.ceil((y + reach) / h) + 1);
  if (du !== 0) {
    for (let j = j0; j < Math.min(j1, ny); j++) {
      const dy = (j + 0.5) * h - y;
      for (let i = i0; i <= i1; i++) {
        const f = i + j * su;
        if (g.uType[f] === FACE_FIXED) continue;
        const dx = i * h - x;
        const r2 = (dx * dx + dy * dy) * ir2;
        if (r2 < 9) g.u[f] += du * Math.exp(-r2);
      }
    }
  }
  if (dv !== 0) {
    for (let j = j0; j <= j1; j++) {
      const dy = j * h - y;
      for (let i = i0; i < Math.min(i1, nx); i++) {
        const f = i + j * nx;
        if (g.vType[f] === FACE_FIXED) continue;
        const dx = (i + 0.5) * h - x;
        const r2 = (dx * dx + dy * dy) * ir2;
        if (r2 < 9) g.v[f] += dv * Math.exp(-r2);
      }
    }
  }
  let added = 0;
  const multi = dye !== null && typeof dye === 'object';
  const hasDye = multi || (dye !== 0 && dye !== null && dye !== undefined);
  const hasHeat = heat !== 0 && heat !== null && heat !== undefined;
  if (hasHeat) F.tempActive = true;
  if (hasDye || hasHeat) {
    for (let j = j0; j < Math.min(j1, ny); j++) {
      const dy = (j + 0.5) * h - y;
      for (let i = i0; i < Math.min(i1, nx); i++) {
        const c = i + j * nx;
        if (g.solid[c]) continue;
        const dx = (i + 0.5) * h - x;
        const r2 = (dx * dx + dy * dy) * ir2;
        if (r2 >= 9) continue;
        const w = Math.exp(-r2);
        if (hasDye) {
          const nch = multi ? Math.min(dye.length, F.dyes.length) : 1;
          for (let k = 0; k < nch; k++) {
            const a = multi ? dye[k] : dye;
            if (!a) continue;
            const q = F.dyes[k];
            const old = q[c];
            const nv = set ? Math.max(old, a * w) : old + a * w;
            q[c] = nv;
            added += nv - old;
          }
        }
        if (hasHeat) F.temp[c] = set ? Math.max(F.temp[c], heat * w) : F.temp[c] + heat * w;
      }
    }
  }
  return added * h * h;
}

// Stir the fluid at physical (x, y): add the velocity (fx, fy) at the centre
// of a Gaussian of radius `radius` (an impulse: the next step's projection
// removes its divergent part), and dye (amount at the centre; a number for
// channel 0 or an array per channel) and optional heat. Applied immediately.
// Returns the total dye added (∫ dye dA ≈ amount·π·radius²). The footprint
// is cut at the domain edges; it does not wrap across a periodic side.
export function splat(F, x, y, fx, fy, radius, dye = 0, heat = 0) {
  const added = footprint(F, x, y, radius, fx, fy, dye, heat, false);
  F.dyeInjected += added;
  enforceBoundary(F.g);
  return added;
}

// A continuous source (applied every step while params.sources is on):
//   { x, y, radius, fx, fy: acceleration at the centre (velocity per time),
//     dye: rate per time (number or per-channel array), heat: rate,
//     set: true → dye/heat are held at least at that value instead of added,
//     orbit: { cx, cy, r, omega, phase, force, angle } → the source moves on
//       a circle; its force has magnitude `force` and points at the centre
//       rotated by `angle` radians }
export function addSource(F, src) {
  F.sources.push(src);
  if (src.heat) F.tempActive = true;
  return src;
}

function applySources(F, dt) {
  const S = F.sources;
  for (let k = 0; k < S.length; k++) {
    const s = S[k];
    if (s.orbit) {
      const o = s.orbit;
      const th = (o.phase || 0) + (o.omega || 0) * F.t;
      const c = Math.cos(th);
      const sn = Math.sin(th);
      s.x = o.cx + o.r * c;
      s.y = o.cy + o.r * sn;
      const a = o.angle || 0;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      // Inward direction (−c, −sn) rotated by a.
      s.fx = (o.force || 0) * (-c * ca + sn * sa);
      s.fy = (o.force || 0) * (-sn * ca - c * sa);
    }
    const set = !!s.set;
    const dye = s.dye ?? 0;
    const heat = s.heat ?? 0;
    let dyeArg = dye;
    if (!set && dye) {
      if (typeof dye === 'object') {
        // Scale the per-channel rates by dt (scratch kept on the source).
        const tmp = s._scaled || (s._scaled = new Float64Array(dye.length));
        for (let m = 0; m < dye.length; m++) tmp[m] = dye[m] * dt;
        dyeArg = tmp;
      } else dyeArg = dye * dt;
    }
    F.dyeInjected += footprint(F, s.x, s.y, s.radius, (s.fx || 0) * dt, (s.fy || 0) * dt, dyeArg, set ? heat : heat * dt, set);
  }
}

function applyBuoyancy(F, dt, alpha, beta) {
  const { nx, ny, g, temp } = F;
  const s = F.dyes[0];
  const vType = g.vType;
  const v = g.v;
  const wy = g.periodicY;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i < nx; i++) {
      const f = i + j * nx;
      if (vType[f] === FACE_FIXED) continue;
      // Cells below and above the face (wrapped or clamped at the ends).
      const cb = j > 0 ? f - nx : wy ? i + (ny - 1) * nx : f;
      const ct = j < ny ? f : wy ? i : f - nx;
      const sm = 0.5 * (s[cb] + s[ct]);
      const tm = 0.5 * (temp[cb] + temp[ct]);
      v[f] += dt * (-alpha * sm + beta * tm);
    }
  }
}

// Vorticity confinement f = ε h ω (N_y, −N_x), N = ∇|ω| / |∇|ω||.
function applyConfinement(F, dt, eps) {
  const { nx, ny, h, g, wc, fxc, fyc } = F;
  const solid = g.solid;
  vorticityCentres(g, wc, g.u, g.v, F.wcorner);
  const mag = F.cell;
  const n = nx * ny;
  for (let c = 0; c < n; c++) mag[c] = solid[c] ? 0 : Math.abs(wc[c]);
  const wx = g.periodicX;
  const wy = g.periodicY;
  const sc = eps * h;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (solid[c]) {
        fxc[c] = 0;
        fyc[c] = 0;
        continue;
      }
      // Central differences, one-sided at non-periodic edges (h cancels in N).
      const ie = i < nx - 1 ? c + 1 : wx ? j * nx : c;
      const iw = i > 0 ? c - 1 : wx ? nx - 1 + j * nx : c;
      const jn = j < ny - 1 ? c + nx : wy ? i : c;
      const js = j > 0 ? c - nx : wy ? i + (ny - 1) * nx : c;
      const gx = (mag[ie] - mag[iw]) / (ie === c || iw === c ? 1 : 2);
      const gy = (mag[jn] - mag[js]) / (jn === c || js === c ? 1 : 2);
      const len = Math.sqrt(gx * gx + gy * gy);
      if (len < 1e-12 * (mag[c] + 1e-300)) {
        fxc[c] = 0;
        fyc[c] = 0;
        continue;
      }
      const w = wc[c];
      fxc[c] = (sc * w * gy) / len;
      fyc[c] = (-sc * w * gx) / len;
    }
  }
  facesFromCentres(F, dt, fxc, fyc);
}

// u += dt · (average of the two adjacent cell values) on movable faces
// (open boundary faces take their one cell).
function facesFromCentres(F, dt, fx, fy) {
  const { nx, ny, g } = F;
  const su = nx + 1;
  const { u, v, uType, vType } = g;
  const wx = g.periodicX;
  const wy = g.periodicY;
  for (let j = 0; j < ny; j++) {
    const row = j * nx;
    for (let i = 0; i <= nx; i++) {
      const f = i + j * su;
      if (uType[f] === FACE_FIXED) continue;
      let a;
      if (i === 0 || i === nx) a = wx ? 0.5 * (fx[row] + fx[row + nx - 1]) : fx[i === 0 ? row : row + nx - 1];
      else a = 0.5 * (fx[row + i - 1] + fx[row + i]);
      u[f] += dt * a;
    }
  }
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i < nx; i++) {
      const f = i + j * nx;
      if (vType[f] === FACE_FIXED) continue;
      let a;
      if (j === 0 || j === ny) a = wy ? 0.5 * (fy[i] + fy[i + (ny - 1) * nx]) : fy[j === 0 ? i : i + (ny - 1) * nx];
      else a = 0.5 * (fy[f - nx] + fy[f]);
      v[f] += dt * a;
    }
  }
}

// The force stage: vorticity confinement, sources, buoyancy, dye and heat
// decay. Forces are applied with forward Euler (u += Δt f), each evaluated
// from the state left by advection.
export function forcesPhase(F, dt, params = DEFAULT_PARAMS) {
  let touched = false;
  // Confinement first, so it sees the advected velocity and not one that
  // already holds this step's (unprojected) buoyancy or source impulses:
  // those are not divergence-free and their curl next to walls and solids
  // would be "confined" into a real swirl (a fluid in hydrostatic balance
  // would start to move).
  const eps = P(params, 'vorticity');
  if (eps !== 0) {
    applyConfinement(F, dt, eps);
    touched = true;
  }
  if (P(params, 'sources') && F.sources.length) {
    applySources(F, dt);
    touched = true;
  }
  const alpha = P(params, 'buoyancyAlpha');
  const beta = P(params, 'buoyancyBeta');
  if (alpha !== 0 || beta !== 0) {
    applyBuoyancy(F, dt, alpha, beta);
    touched = true;
  }
  const kd = P(params, 'dyeDecay');
  if (kd > 0) {
    // Exact exponential decay, so it stays stable for any dt.
    const f = Math.exp(-kd * dt);
    for (let k = 0; k < F.dyes.length; k++) {
      const q = F.dyes[k];
      for (let c = 0; c < q.length; c++) q[c] *= f;
    }
  }
  const kh = P(params, 'heatDecay');
  if (kh > 0 && F.tempActive) {
    const f = Math.exp(-kh * dt);
    const T = F.temp;
    for (let c = 0; c < T.length; c++) T[c] *= f;
  }
  // Periodic duplicates back in step (a frozen kinematic field is left alone
  // when no force touched it).
  if (touched) enforceBoundary(F.g);
}

// ---------------------------------------------------------------------------
// Implicit diffusion (viscosity, dye diffusion)

// Neighbour tables for red–black sweeps on one layout, rebuilt when the mask
// changes. nb[4k + d] ≥ 0: index of the neighbour (an unknown or a fixed
// value); −1: ghost equal to the point itself (zero gradient); −2: ghost
// equal to minus the point (no-slip wall half a cell away). dc[k] = 4 −
// (#−1 ghosts) + (#−2 ghosts), so the diagonal is 1 + a·dc[k].
function diffusionTable(F, id) {
  const g = F.g;
  F._diff = F._diff && F._diff.version === g.version ? F._diff : { version: g.version };
  if (F._diff[id]) return F._diff[id];
  const { nx, ny, bc, solid, uType, vType } = g;
  const wx = g.periodicX;
  const wy = g.periodicY;
  const L = F.layouts[id];
  const { cols, rows } = L;
  const n = cols * rows;
  const nb = new Int32Array(4 * n);
  const dc = new Float64Array(n);
  const red = [];
  const black = [];
  const isScalar = id === 'C';
  // Distinct points per axis (periodic duplicates are not unknowns).
  const ci = id === 'U' && wx ? nx : cols;
  const cj = id === 'V' && wy ? ny : rows;
  const unknown = (i, j) => {
    if (i >= ci || j >= cj) return false;
    const k = i + j * cols;
    if (id === 'U') return uType[k] !== FACE_FIXED;
    if (id === 'V') return vType[k] !== FACE_FIXED;
    return !solid[k];
  };
  for (let j = 0; j < cj; j++) {
    for (let i = 0; i < ci; i++) {
      if (!unknown(i, j)) continue;
      const k = i + j * cols;
      let d = 4;
      // Directions: east, west, north, south.
      const steps = [
        [1, 0, 'x', 'right'],
        [-1, 0, 'x', 'left'],
        [0, 1, 'y', 'top'],
        [0, -1, 'y', 'bottom'],
      ];
      for (let s = 0; s < 4; s++) {
        const [di, dj, axis, side] = steps[s];
        let ii = i + di;
        let jj = j + dj;
        const wrapAxis = axis === 'x' ? wx : wy;
        const lim = axis === 'x' ? ci : cj;
        const cur = axis === 'x' ? ii : jj;
        let code;
        if (cur < 0 || cur >= lim) {
          if (wrapAxis) {
            if (axis === 'x') ii = (ii + lim) % lim;
            else jj = (jj + lim) % lim;
            code = ii + jj * cols;
          } else if (isScalar) code = -1; // insulated walls, zero-gradient open sides
          else {
            // Normal direction of this component (only open boundary faces
            // reach here): zero gradient. Tangential: no-slip at walls.
            const normal = (id === 'U' && axis === 'x') || (id === 'V' && axis === 'y');
            code = normal || bc[side] === 'open' ? -1 : -2;
          }
        } else {
          code = ii + jj * cols;
          if (isScalar && solid[code]) code = -1; // zero flux into solids
        }
        if (code === -1) d -= 1;
        else if (code === -2) d += 1;
        nb[4 * k + s] = code;
      }
      dc[k] = d;
      ((i + j) & 1 ? black : red).push(k);
    }
  }
  const T = { nb, dc, red: Int32Array.from(red), black: Int32Array.from(black) };
  F._diff[id] = T;
  return T;
}

// Solve (I − a ∇²_h) x = b (a = κΔt/h²) by red–black Gauss–Seidel, starting
// from x = b (in place: x holds b on entry). Stops when the largest update in
// a sweep is below tol·max|b| or after maxIter sweeps. Returns the sweep
// count and the last relative update in F.diag-style object `out`.
function diffuseImplicit(F, id, x, a, maxIter, tol, out) {
  const T = diffusionTable(F, id);
  const { nb, dc } = T;
  const b = F.s1;
  const n = x.length;
  let bmax = 0;
  for (let k = 0; k < n; k++) {
    b[k] = x[k];
    const m = Math.abs(x[k]);
    if (m > bmax) bmax = m;
  }
  let it = 0;
  let change = 0;
  if (bmax === 0) {
    out.iters = 0;
    out.residual = 0;
    return out;
  }
  while (it < maxIter) {
    change = 0;
    for (let pass = 0; pass < 2; pass++) {
      const list = pass === 0 ? T.red : T.black;
      for (let m = 0; m < list.length; m++) {
        const k = list[m];
        const k4 = 4 * k;
        let s = 0;
        for (let d = 0; d < 4; d++) {
          const q = nb[k4 + d];
          if (q >= 0) s += x[q];
        }
        const nv = (b[k] + a * s) / (1 + a * dc[k]);
        const dlt = Math.abs(nv - x[k]);
        if (dlt > change) change = dlt;
        x[k] = nv;
      }
    }
    it++;
    if (change <= tol * bmax) break;
  }
  out.iters = it;
  out.residual = change / bmax;
  return out;
}

const _diffOut = { iters: 0, residual: 0 };

// The viscosity stage: implicit diffusion of u and v with ν, and of every dye
// channel with params.diffusion. Unconditionally stable.
export function viscosityPhase(F, dt, params = DEFAULT_PARAMS) {
  const nu = P(params, 'viscosity');
  const kappa = P(params, 'diffusion');
  const maxIter = P(params, 'diffusionIters');
  const tol = P(params, 'diffusionTol');
  const h2 = F.h * F.h;
  let iters = 0;
  let res = 0;
  if (nu > 0) {
    diffuseImplicit(F, 'U', F.g.u, (nu * dt) / h2, maxIter, tol, _diffOut);
    iters = Math.max(iters, _diffOut.iters);
    res = Math.max(res, _diffOut.residual);
    diffuseImplicit(F, 'V', F.g.v, (nu * dt) / h2, maxIter, tol, _diffOut);
    iters = Math.max(iters, _diffOut.iters);
    res = Math.max(res, _diffOut.residual);
    enforceBoundary(F.g);
  }
  if (kappa > 0) {
    for (let k = 0; k < F.dyes.length; k++) diffuseImplicit(F, 'C', F.dyes[k], (kappa * dt) / h2, maxIter, tol, _diffOut);
  }
  F.diag.viscosityIters = iters;
  F.diag.viscosityResidual = res;
}

// ---------------------------------------------------------------------------
// Projection (projection.js)

// Options object for projectSteps, reused from step to step.
function projectOptions(F, dt, params) {
  const id = P(params, 'pressure');
  const S = PRESSURE_SOLVERS[id];
  if (!S) throw new Error(`stablefluids: unknown pressure solver '${id}'`);
  const o = F._projOpts;
  o.method = S.method;
  o.scale = dt;
  o.trace = P(params, 'trace');
  if (S.fixed) {
    o.tol = 0;
    o.maxIter = P(params, 'pressureIters');
  } else {
    o.tol = P(params, 'pressureTol');
    o.maxIter = P(params, 'pressureMaxIter');
  }
  o.solver.omega = id === 'jacobi' ? P(params, 'jacobiOmega') : undefined;
  return o;
}

function recordProjection(F, res, id) {
  const d = F.diag;
  d.pressureSolver = id;
  d.pressureIters = res.iters;
  d.divBefore = res.divBefore.max;
  d.divAfter = res.divAfter.max;
  d.divRel = res.relDiv;
  // The relative residual of the pressure solve is ‖D u‖₂ / ‖D u*‖₂.
  d.pressureResidual = res.divBefore.l2 > 0 ? res.divAfter.l2 / res.divBefore.l2 : 0;
  d.pressureConverged = res.converged;
}

// The projection stage (generator: yields the pressure solver's events).
export function* projectPhase(F, dt, params = DEFAULT_PARAMS) {
  const res = yield* projectSteps(F.g, projectOptions(F, dt, params));
  recordProjection(F, res, P(params, 'pressure'));
  return res;
}

// ---------------------------------------------------------------------------
// Stepping

const EV = {};
for (const ph of PHASES) EV[ph.id] = Object.freeze({ t: 'enter', kind: 'phase', phase: ph.id, label: ph.name });
const EV_LEAVE = Object.freeze({ t: 'leave', kind: 'phase' });

// One time step as a generator: yields {t:'enter', kind:'phase', phase,
// label} … {t:'leave', kind:'phase'} around each stage (advect, forces,
// viscosity when on, project when on), and inside 'project' the pressure
// solver's own events. Returns fluid.diag. step() drains this generator, so
// a figure that pauses between stages runs exactly the same code.
export function* stepPhases(F, dt, params = DEFAULT_PARAMS) {
  const d = F.diag;
  d.maxSpeed = maxFaceSpeed(F);
  d.cfl = (d.maxSpeed * dt) / F.h;
  d.dt = dt;
  yield EV.advect;
  advectPhase(F, dt, params);
  yield EV_LEAVE;
  yield EV.forces;
  forcesPhase(F, dt, params);
  yield EV_LEAVE;
  if (P(params, 'viscosity') > 0 || P(params, 'diffusion') > 0) {
    yield EV.viscosity;
    viscosityPhase(F, dt, params);
    yield EV_LEAVE;
  } else {
    d.viscosityIters = 0;
    d.viscosityResidual = 0;
  }
  if (P(params, 'project')) {
    yield EV.project;
    yield* projectPhase(F, dt, params);
    yield EV_LEAVE;
  } else {
    divergence(F.g, F.g.div);
    const m = maxAbsFluid(F.g.div, F.g.solid);
    d.divBefore = m;
    d.divAfter = m;
    d.divRel = 1;
    d.pressureSolver = 'none';
    d.pressureIters = 0;
    d.pressureResidual = 1;
    d.pressureConverged = false;
  }
  // Solid cells hold no scalars.
  if (solidRim(F).any) {
    const s = F.g.solid;
    for (let k = 0; k < F.dyes.length; k++) {
      const q = F.dyes[k];
      for (let c = 0; c < q.length; c++) if (s[c]) q[c] = 0;
    }
    for (let c = 0; c < s.length; c++) if (s[c]) F.temp[c] = 0;
  }
  F.t += dt;
  F.steps++;
  d.t = F.t;
  d.step = F.steps;
  d.dye = dyeTotal(F);
  d.dyeDrift = F.dyeDrift;
  d.dyeInjected = F.dyeInjected;
  const base = d.dye - F.dyeDrift;
  d.dyeDriftRel = Math.abs(base) > 0 ? F.dyeDrift / base : 0;
  if (P(params, 'diagnostics')) {
    d.ke = kineticEnergy(F);
    d.enstrophy = enstrophy(F);
  }
  return d;
}

// Advance one time step of length dt (mutates the fluid; returns fluid.diag).
export function step(F, dt, params = DEFAULT_PARAMS) {
  return drain(stepPhases(F, dt, params));
}

// ---------------------------------------------------------------------------
// Diagnostics

function maxAbsFluid(f, solid) {
  let m = 0;
  for (let c = 0; c < f.length; c++) {
    if (solid[c]) continue;
    const a = Math.abs(f[c]);
    if (a > m) m = a;
  }
  return m;
}

// Largest face speed |u| or |v| (inflow walls included).
export function maxFaceSpeed(F) {
  let m = 0;
  const { u, v } = F.g;
  for (let k = 0; k < u.length; k++) {
    const a = Math.abs(u[k]);
    if (a > m) m = a;
  }
  for (let k = 0; k < v.length; k++) {
    const a = Math.abs(v[k]);
    if (a > m) m = a;
  }
  return m;
}

// CFL number max(|u|, |v|)·Δt/h: how many cells the fastest face value moves
// in one step. Semi-Lagrangian advection is stable at any value, but its
// accuracy falls as it grows.
export function cflNumber(F, dt) {
  return (maxFaceSpeed(F) * dt) / F.h;
}

// The Δt that gives CFL number `cfl` for the current velocity (Infinity at
// rest).
export function dtForCfl(F, cfl) {
  const m = maxFaceSpeed(F);
  return m > 0 ? (cfl * F.h) / m : Infinity;
}

// Kinetic energy per unit density ½ ∫|u|² dA (grid2d.faceDot weights).
export function kineticEnergy(F) {
  return 0.5 * faceDot(F.g, F.g.u, F.g.v, F.g.u, F.g.v);
}

// Cell-centred vorticity (corner values averaged) into out (default the
// fluid's own buffer fluid.wc).
export function vorticity(F, out = F.wc) {
  return vorticityCentres(F.g, out, F.g.u, F.g.v, F.wcorner);
}

// Enstrophy ½ ∫ ω² dA over fluid cells (cell-centred vorticity).
export function enstrophy(F) {
  const w = vorticity(F, F.wc);
  const s = F.g.solid;
  let e = 0;
  for (let c = 0; c < w.length; c++) if (!s[c]) e += w[c] * w[c];
  return 0.5 * e * F.h * F.h;
}

// ∫ dye dA over fluid cells, for one channel or (channel = -1) all.
export function dyeTotal(F, channel = -1) {
  const s = F.g.solid;
  let t = 0;
  const k0 = channel < 0 ? 0 : channel;
  const k1 = channel < 0 ? F.dyes.length : channel + 1;
  for (let k = k0; k < k1; k++) {
    const q = F.dyes[k];
    for (let c = 0; c < q.length; c++) if (!s[c]) t += q[c];
  }
  return t * F.h * F.h;
}

// Max |D u| over fluid cells for the current velocity.
export function maxDivergence(F) {
  divergence(F.g, F.g.div);
  return maxAbsFluid(F.g.div, F.g.solid);
}

// ---------------------------------------------------------------------------
// Setting fields and obstacles

// Face velocities from functions of physical position: u = fu(x, y) on u
// faces, v = fv(x, y) on v faces. Boundary values are then imposed.
export function setVelocity(F, fu, fv) {
  const { nx, ny, h, g } = F;
  const su = nx + 1;
  for (let j = 0; j < ny; j++) for (let i = 0; i <= nx; i++) g.u[i + j * su] = fu(i * h, (j + 0.5) * h);
  for (let j = 0; j <= ny; j++) for (let i = 0; i < nx; i++) g.v[i + j * nx] = fv((i + 0.5) * h, j * h);
  enforceBoundary(g);
  return F;
}

// Discretely divergence-free face velocities from a streamfunction ψ(x, y)
// sampled at the cell corners (u = ∂ψ/∂y, v = −∂ψ/∂x).
export function setStreamfunction(F, psi) {
  const { nx, ny, h, g } = F;
  const su = nx + 1;
  const c = F.wcorner;
  for (let j = 0; j <= ny; j++) {
    for (let i = 0; i <= nx; i++) {
      const ii = g.periodicX && i === nx ? 0 : i;
      const jj = g.periodicY && j === ny ? 0 : j;
      c[i + j * su] = psi(ii * h, jj * h);
    }
  }
  velocityFromStreamfunction(g, c);
  enforceBoundary(g);
  return F;
}

// field[c] = fn(x, y) at fluid cell centres (0 in solids); field defaults to
// dye channel 0. Resets the dye bookkeeping when a dye channel is set.
export function setScalar(F, fn, field = F.dye) {
  const { nx, ny, h, g } = F;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      field[c] = g.solid[c] ? 0 : fn((i + 0.5) * h, (j + 0.5) * h);
    }
  }
  if (field === F.temp) F.tempActive = true;
  return F;
}

function afterMaskEdit(F) {
  const s = F.g.solid;
  for (let c = 0; c < s.length; c++) {
    if (!s[c]) continue;
    for (let k = 0; k < F.dyes.length; k++) F.dyes[k][c] = 0;
    F.temp[c] = 0;
  }
  enforceBoundary(F.g);
  return F;
}

// Add a solid disc of radius r centred at physical (x, y) (cells whose centre
// is inside). Existing solids are kept.
export function addCircle(F, x, y, r) {
  const old = Uint8Array.from(F.g.solid);
  setSolid(F.g, (cx, cy, i, j) => old[i + j * F.nx] || (cx - x) ** 2 + (cy - y) ** 2 < r * r);
  return afterMaskEdit(F);
}

// Add a solid axis-aligned box [x0, x1] × [y0, y1] (cells whose centre is
// inside).
export function addBox(F, x0, y0, x1, y1) {
  const old = Uint8Array.from(F.g.solid);
  setSolid(F.g, (cx, cy, i, j) => old[i + j * F.nx] || (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1));
  return afterMaskEdit(F);
}

// Remove every obstacle.
export function clearSolids(F) {
  setSolid(F.g, () => false);
  return afterMaskEdit(F);
}

// ---------------------------------------------------------------------------
// Presets
//
// createPreset(id, opts) returns a fresh fluid with the preset's fields,
// obstacles and sources, plus fluid.params (the recommended step params,
// a plain object a figure may edit) and fluid.meta ({ preset, dt, … }:
// dt is the suggested time step). opts override PRESETS[id].defaults; nx
// alone keeps the preset's aspect ratio.
//
// Default sizes are chosen for a phone: each animated preset costs about
// 1.2–1.7 ms per step in node on a desktop (roughly 4–8 ms on a mid-range
// phone, about its frame budget; 'hero' is the heaviest). For a desktop,
// pass { nx: 128 } (stir 128²: ≈ 5.5 ms per step; see the PERFORMANCE notes
// in the header).

export const PRESETS = {
  stir: {
    id: 'stir',
    name: 'Stir the box',
    description: 'A closed box of still fluid with bands of two dyes. Drag to stir: watch the bands fold, then blur.',
    defaults: { nx: 64, ny: 64, dt: 1 / 60 },
    params: { advection: 'maccormack', backtrace: 'rk2', pressure: 'multigrid', vorticity: 0 },
  },
  smoke: {
    id: 'smoke',
    name: 'Buoyant smoke plume',
    description: 'Hot smoke released at the bottom of a tall box with an open top: buoyancy lifts it, confinement keeps its curls.',
    defaults: { nx: 48, ny: 72, dt: 1 / 60, seed: 7 },
    params: { advection: 'maccormack', backtrace: 'rk2', pressure: 'multigrid', vorticity: 0.25, buoyancyAlpha: 0.1, buoyancyBeta: 4, heatDecay: 0.3 },
  },
  obstacle: {
    id: 'obstacle',
    name: 'Flow past a cylinder',
    description: 'Uniform inflow from the left, an open outlet on the right, a cylinder in the stream; dye streaks show the wake.',
    defaults: { nx: 96, ny: 48, dt: 1 / 60, speed: 1, radius: 0.07 },
    params: { advection: 'maccormack', backtrace: 'rk2', pressure: 'mgpcg', pressureTol: 1e-4, vorticity: 0.3 },
  },
  vortex: {
    id: 'vortex',
    name: 'Solid-body rotation (accuracy test)',
    description: 'A frozen velocity field that turns the box once per time unit, carrying a dye shape around the centre. After one turn the exact answer is the starting shape: the error is all numerical.',
    defaults: { nx: 64, ny: 64, shape: 'gaussian', omega: 2 * Math.PI, cfl: 1 },
    params: { advection: 'semi-lagrangian', backtrace: 'rk2', advectVelocity: false, project: false },
  },
  'taylor-green': {
    id: 'taylor-green',
    name: 'Taylor–Green vortex (periodic)',
    description: 'Four counter-rotating cells on a periodic square: a steady solution of the inviscid equations, so any loss of kinetic energy is numerical dissipation.',
    defaults: { nx: 64, ny: 64, U: 1, dt: 1 / 60 },
    params: { advection: 'semi-lagrangian', backtrace: 'rk2', pressure: 'mgpcg', pressureTol: 1e-8 },
  },
  hero: {
    id: 'hero',
    name: 'Three-colour swirl',
    description: 'Three emitters circle the box, each pushing its own colour of dye towards the middle, where the jets collide and roll up. Dye fades slowly, so the picture keeps renewing itself.',
    defaults: { nx: 64, ny: 64, dt: 1 / 60 },
    params: { advection: 'maccormack', backtrace: 'rk2', pressure: 'multigrid', vorticity: 0.35, dyeDecay: 0.25 },
  },
};

// Gaussian blob and Zalesak's slotted disc, as functions of (x, y).
function dyeShape(shape, cx, cy, R) {
  if (shape === 'slotted-disc') {
    // Zalesak (1979): disc of radius R with a slot of width R/3 cut from the
    // bottom edge up to 5R/3 above it.
    const w = R / 3;
    return (x, y) => {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > R * R) return 0;
      if (Math.abs(dx) < 0.5 * w && dy < R * (2 / 3)) return 0;
      return 1;
    };
  }
  const s2 = R * R;
  return (x, y) => Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / s2);
}

export function createPreset(id, opts = {}) {
  const Pr = PRESETS[id];
  if (!Pr) throw new Error(`stablefluids: unknown preset '${id}'`);
  const o = { ...Pr.defaults, ...opts };
  // nx alone keeps the preset's aspect ratio (so { nx: 128 } on a square
  // preset is 128², not 128 × 64).
  if (opts.nx !== undefined && opts.ny === undefined) o.ny = Math.max(2, Math.round((opts.nx * Pr.defaults.ny) / Pr.defaults.nx));
  const params = { ...Pr.params, ...(opts.params || {}) };
  let F;
  const meta = { preset: id, dt: o.dt };
  if (id === 'stir') {
    F = createFluid({ nx: o.nx, ny: o.ny, bc: 'wall', channels: 2 });
    const H = o.ny / o.nx;
    // Alternating horizontal bands of the two dyes, smooth-edged.
    setScalar(F, (x, y) => 0.5 + 0.5 * Math.tanh(12 * Math.sin((6 * Math.PI * y) / H)), F.dyes[0]);
    setScalar(F, (x, y) => 0.5 - 0.5 * Math.tanh(12 * Math.sin((6 * Math.PI * y) / H)), F.dyes[1]);
  } else if (id === 'smoke') {
    F = createFluid({ nx: o.nx, ny: o.ny, bc: { left: 'wall', right: 'wall', bottom: 'wall', top: 'open' }, temperature: true });
    const rand = rng(o.seed);
    const cx = 0.5 + 0.01 * (rand() - 0.5);
    addSource(F, { x: cx, y: 0.08, radius: 0.05, dye: 1, heat: 1, set: true, fx: 0, fy: 1.5 });
    // A little seeded noise in the starting temperature breaks the symmetry.
    setScalar(F, () => 0.02 * (rand() - 0.5), F.temp);
  } else if (id === 'obstacle') {
    const ny = o.ny;
    const H = ny / o.nx;
    F = createFluid({ nx: o.nx, ny, bc: { left: 'wall', right: 'open', bottom: 'wall', top: 'wall' }, wall: { left: o.speed } });
    addCircle(F, 0.25, 0.5 * H + 0.15 * F.h, o.radius);
    setVelocity(F, () => o.speed, () => 0);
    // Dye streaks: thin emitters along the inflow edge.
    const streaks = 7;
    for (let k = 0; k < streaks; k++) addSource(F, { x: 0.5 * F.h, y: ((k + 0.5) / streaks) * H, radius: 1.2 * F.h, dye: 1, set: true });
    meta.U = o.speed;
    meta.D = 2 * o.radius;
  } else if (id === 'vortex') {
    F = createFluid({ nx: o.nx, ny: o.ny, bc: 'wall' });
    const H = o.ny / o.nx;
    const cx = 0.5;
    const cy = 0.5 * H;
    const om = o.omega;
    // Not enforceBoundary'd: the frozen field keeps its (nonzero) wall
    // values, which no point of the blob ever reaches.
    const su = o.nx + 1;
    for (let j = 0; j < o.ny; j++) for (let i = 0; i <= o.nx; i++) F.u[i + j * su] = -om * ((j + 0.5) * F.h - cy);
    for (let j = 0; j <= o.ny; j++) for (let i = 0; i < o.nx; i++) F.v[i + j * o.nx] = om * ((i + 0.5) * F.h - cx);
    const slotted = o.shape === 'slotted-disc';
    const R = o.R ?? (slotted ? 0.15 : 0.1);
    const sx = slotted ? cx : cx + 0.25;
    const sy = slotted ? cy + 0.25 : cy;
    setScalar(F, dyeShape(o.shape, sx, sy, R), F.dye);
    meta.period = (2 * Math.PI) / Math.abs(om);
    // A whole number of steps per turn, with CFL number o.cfl at the centre
    // of the shape (radius 0.25 from the axis; the box corners move 2.8×
    // faster).
    const speed = Math.abs(om) * 0.25;
    const steps = Math.max(1, Math.round(meta.period / ((o.cfl * F.h) / speed)));
    meta.stepsPerTurn = steps;
    meta.dt = meta.period / steps;
    meta.cfl = (speed * meta.dt) / F.h;
    meta.exact = Float64Array.from(F.dye);
    meta.shape = o.shape;
  } else if (id === 'taylor-green') {
    F = createFluid({ nx: o.nx, ny: o.ny, bc: 'periodic' });
    const U = o.U;
    const H = o.ny / o.nx;
    const k = 2 * Math.PI;
    // ψ = (U/k) sin(kx) sin(ky): u = U sin(kx) cos(ky), v = −U cos(kx) sin(ky).
    setStreamfunction(F, (x, y) => (U / k) * Math.sin(k * x) * Math.sin((k * y) / H));
    setScalar(F, (x, y) => (Math.sin(k * x) * Math.sin((k * y) / H) > 0 ? 1 : 0), F.dye);
    meta.U = U;
  } else if (id === 'hero') {
    F = createFluid({ nx: o.nx, ny: o.ny, bc: 'wall', channels: 3 });
    const H = o.ny / o.nx;
    for (let k = 0; k < 3; k++) {
      const dye = [0, 0, 0];
      dye[k] = 6;
      addSource(F, {
        x: 0.5,
        y: 0.5 * H,
        radius: 0.035,
        dye,
        orbit: { cx: 0.5, cy: 0.5 * H, r: 0.3, omega: 0.35, phase: (2 * Math.PI * k) / 3, force: 9, angle: 0.45 },
      });
    }
  }
  F.params = params;
  F.meta = { ...meta, ...(F.meta || {}) };
  F.diag.dye = dyeTotal(F);
  return F;
}
