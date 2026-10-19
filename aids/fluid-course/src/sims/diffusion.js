// Diffusion: the 1-D heat equation, implicit time stepping, and the steady
// advection–diffusion boundary layer.
//
// What is here
//   thomas(a, b, c, d, opts)      tridiagonal solve as a generator: forward
//                                 elimination then back substitution, one
//                                 trace event per row; returns the solution.
//   solveCyclic(...)              periodic (cyclic) tridiagonal solve by the
//                                 Sherman–Morrison correction, two Thomas runs.
//   createHeat / step / resetHeat u_t = kappa u_xx on [0, 1]: FTCS, backward
//                                 Euler (BTCS), Crank–Nicolson, the theta
//                                 method and Du Fort–Frankel, with Dirichlet
//                                 or periodic boundaries. setHeatPreset swaps
//                                 the preset of a live state in place.
//   assembleHeat / finishHeatStep one implicit step split in two, so a figure
//                                 can animate the Thomas solve between them;
//                                 step() runs the same two halves.
//   heatExact / fillExact         exact solutions: sine modes and Fourier
//                                 series for a step and a top hat.
//   amplification(...)            von Neumann amplification factors G(xi, r).
//   telegraphAmplitude(...)       the damped-wave equation Du Fort–Frankel
//                                 really solves when dt/dx is held fixed.
//   createAdvDiff / solveAdvDiff  steady -a u' + kappa u'' = 0, u(0) = 0,
//                                 u(1) = 1: central, upwind, exponentially
//                                 fitted (Il'in–Allen–Southwell /
//                                 Scharfetter–Gummel), plus the exact profile.
//   HEAT_DEMOS / ADVDIFF_DEMOS    broken / fixed recipe pairs for each
//                                 pathology; the tests run these recipes.
//
// Conventions
//   Nondimensional: the domain is [0, 1] and time is in units of L^2/kappa
//   when kappa = 1 (kappa is kept as a parameter so r can be shown as
//   kappa dt / dx^2). Nodes x_j = j dx with dx = 1/n.
//   Dirichlet: n + 1 nodes j = 0..n; u[0] = left and u[n] = right are held
//   fixed, the n - 1 interior values are the unknowns. state.left and
//   state.right are live: every scheme writes them into u[0] and u[n] at the
//   start of each step, so a boundary slider acts on the next step the same
//   way for every scheme (both time levels of the step see the new value).
//   Periodic: n nodes j = 0..n-1 (node n is node 0 again); all n are unknowns.
//   Mesh ratio r = kappa dt / dx^2. Fourier angle xi = k dx in [0, pi] (the
//   spec's theta_k; xi is used here so it is not confused with the
//   theta-method weight).
//   Tridiagonal row i reads a[i] x[i-1] + b[i] x[i] + c[i] x[i+1] = d[i];
//   a[0] and c[n-1] are ignored by thomas() and are the corner entries
//   A[0][n-1] and A[n-1][0] for solveCyclic().
//   Advection–diffusion: cell Péclet number P = a dx / kappa; global Péclet
//   number Pe = a L / kappa = a / kappa.
//
// Schemes and sources
//   FTCS, BTCS, theta method, Fourier (von Neumann) analysis and the discrete
//   maximum principle r (1 - theta) <= 1/2: Morton & Mayers, Numerical
//   Solution of PDEs, 2nd ed. (2005), ch. 2; Strikwerda, Finite Difference
//   Schemes and PDEs, 2nd ed. (2004), ch. 6; LeVeque, Finite Difference
//   Methods for ODEs and PDEs (2007), ch. 9. Von Neumann's method in print:
//   O'Brien, Hyman & Kaplan, J. Math. Phys. 29 (1951) 223–251.
//   Crank–Nicolson: Crank & Nicolson, Proc. Camb. Phil. Soc. 43 (1947) 50–67.
//   Its oscillations for large r (G -> -1 as r -> infinity): Østerby, BIT 43
//   (2003) 811–822; LeVeque (2007) §8.3 on L-stability.
//   Du Fort–Frankel: Du Fort & Frankel, Math. Tables Aids Comput. 7 (1953)
//   135–152. Consistency only if dt/dx -> 0; with dt/dx = c fixed the scheme
//   is consistent with u_t + kappa c^2 u_tt = kappa u_xx instead (Strikwerda
//   2004 ch. 6; Morton & Mayers 2005 ch. 2, three-time-level schemes).
//   Startup: a three-level scheme needs u^1. We take one Crank–Nicolson step
//   (also whenever dt changes), which supplies u_t(0) = kappa u_xx(0).
//   The damped-wave limit tau A'' + A' + kappa k^2 A = 0 is solved in closed
//   form; the slow root is written -2 kappa k^2 / (1 + sqrt(1 - 4 tau kappa
//   k^2)), the cancellation-free form of the quadratic formula (Higham,
//   Accuracy and Stability of Numerical Algorithms, 2nd ed., 2002, §1.8), so
//   the curve tends to the heat equation's e^{-kappa k^2 t} as dt/dx -> 0.
//   Thomas algorithm: L. H. Thomas, Watson Sci. Comput. Lab. report (1949);
//   Golub & Van Loan, Matrix Computations, 4th ed. (2013) §4.3 (LU of a
//   banded matrix without pivoting; safe for diagonally dominant systems).
//   Cyclic systems: Press et al., Numerical Recipes, 3rd ed. (2007) §2.7.
//   Exact solutions: separation of variables and Fourier series (Carslaw &
//   Jaeger, Conduction of Heat in Solids, 2nd ed., 1959, ch. 3). The series
//   for the step and top hat need O(1/sqrt(kappa t)) terms at small t, so
//   sin(m pi x) and cos(m pi x) are advanced by a rotation recurrence
//   (multiply by e^{i pi x} each term) rather than by a sin() call per term
//   and node; the rounding error grows like m * eps, below 1e-11 for the
//   at most 50,000 terms used.
//   Steady advection–diffusion: Patankar, Numerical Heat Transfer and Fluid
//   Flow (1980) ch. 5 (central, upwind, exact and exponential schemes);
//   Allen & Southwell, Q. J. Mech. Appl. Math. 8 (1955) 129–145; Il'in,
//   Math. Notes 6 (1969) 596–602; Scharfetter & Gummel, IEEE Trans. Electron
//   Devices 16 (1969) 64–77; Roos, Stynes & Tobiska, Robust Numerical Methods
//   for Singularly Perturbed Differential Equations, 2nd ed. (2008) Part I.
//   The fitted scheme is written in Scharfetter–Gummel flux form with the
//   Bernoulli function B(P) = P / (e^P - 1); this is algebraically the same
//   as central differencing with kappa replaced by kappa (P/2) coth(P/2)
//   (Il'in / Allen–Southwell), but it does not lose digits for large P.
//
// Performance: the step functions allocate no typed arrays. Every tridiagonal
// solve runs the same thomas() generator the figures animate, with trace off;
// the only per-step allocation is that generator object. heatExact keeps one
// module-level scratch array, grown only when a longer grid is passed.

import { drain } from './util.js';

// ---------------------------------------------------------------- metadata

export const HEAT_SCHEMES = {
  ftcs: {
    id: 'ftcs',
    name: 'FTCS (explicit)',
    description: 'Forward Euler in time, centred second difference in space. Cheap, but stable only for r ≤ 1/2, so dt must shrink like dx².',
    tex: 'u_j^{n+1} = u_j^n + r\\left(u_{j+1}^n - 2u_j^n + u_{j-1}^n\\right)',
    texG: 'G(\\xi) = 1 - 4r\\sin^2\\frac{\\xi}{2}',
    theta: 0,
    levels: 2,
    order: { time: 1, space: 2 },
    stability: 'r \\le \\frac{1}{2}',
    rMax: 0.5,
    maxPrincipleR: 0.5,
  },
  btcs: {
    id: 'btcs',
    name: 'Backward Euler (BTCS)',
    description: 'Implicit: the new values appear on both sides, so each step solves a tridiagonal system. Stable for every r and never oscillates (L-stable), but only first order in time.',
    tex: '(1 + 2r)\\,u_j^{n+1} - r\\left(u_{j+1}^{n+1} + u_{j-1}^{n+1}\\right) = u_j^n',
    texG: 'G(\\xi) = \\frac{1}{1 + 4r\\sin^2(\\xi/2)}',
    theta: 1,
    levels: 2,
    order: { time: 1, space: 2 },
    stability: '\\text{all } r',
    rMax: Infinity,
    maxPrincipleR: Infinity,
  },
  cn: {
    id: 'cn',
    name: 'Crank–Nicolson',
    description: 'The average of FTCS and backward Euler: second order in time and stable for every r, but G → −1 for stiff modes, so sharp data rings with sign-alternating wiggles when r is large.',
    tex: 'u_j^{n+1} - u_j^n = \\frac{r}{2}\\left(\\delta^2 u_j^{n+1} + \\delta^2 u_j^n\\right),\\quad \\delta^2 u_j = u_{j+1} - 2u_j + u_{j-1}',
    texG: 'G(\\xi) = \\frac{1 - 2r\\sin^2(\\xi/2)}{1 + 2r\\sin^2(\\xi/2)}',
    theta: 0.5,
    levels: 2,
    order: { time: 2, space: 2 },
    stability: '\\text{all } r',
    rMax: Infinity,
    maxPrincipleR: 1,
  },
  theta: {
    id: 'theta',
    name: 'θ-method',
    description: 'A weighted average: θ = 0 is FTCS, θ = 1/2 Crank–Nicolson, θ = 1 backward Euler. Unconditionally stable for θ ≥ 1/2; second order in time only at θ = 1/2.',
    tex: 'u_j^{n+1} - u_j^n = r\\left[\\theta\\,\\delta^2 u_j^{n+1} + (1 - \\theta)\\,\\delta^2 u_j^n\\right]',
    texG: 'G(\\xi) = \\frac{1 - 4(1 - \\theta)\\,r\\sin^2(\\xi/2)}{1 + 4\\theta\\,r\\sin^2(\\xi/2)}',
    theta: null,
    levels: 2,
    order: { time: '2 if θ = 1/2, else 1', space: 2 },
    stability: 'r \\le \\frac{1}{2(1 - 2\\theta)}\\ \\text{if}\\ \\theta < \\frac{1}{2};\\ \\text{all } r\\ \\text{if}\\ \\theta \\ge \\frac{1}{2}',
    rMax: null,
    maxPrincipleR: null,
  },
  'dufort-frankel': {
    id: 'dufort-frankel',
    name: 'Du Fort–Frankel',
    description: 'Explicit and unconditionally stable, which sounds too good to be true, and is: it is consistent with the heat equation only if dt/dx → 0. With dt/dx fixed it converges to a damped wave equation.',
    tex: '(1 + 2r)\\,u_j^{n+1} = (1 - 2r)\\,u_j^{n-1} + 2r\\left(u_{j+1}^n + u_{j-1}^n\\right)',
    texG: '(1 + 2r)\\,G^2 - 4r\\cos\\xi\\,G - (1 - 2r) = 0',
    texModified: 'u_t + \\kappa\\left(\\frac{\\Delta t}{\\Delta x}\\right)^2 u_{tt} = \\kappa u_{xx} + \\mathcal{O}(\\Delta t^2, \\Delta x^2)',
    theta: null,
    levels: 3,
    order: { time: 2, space: 2, note: 'only if Δt/Δx → 0' },
    stability: '\\text{all } r',
    rMax: Infinity,
    maxPrincipleR: null,
  },
};

// Largest stable r for a scheme (von Neumann, all modes).
export function heatStabilityLimit(scheme, theta = 0.5) {
  if (scheme === 'theta') return theta >= 0.5 ? Infinity : 1 / (2 * (1 - 2 * theta));
  return HEAT_SCHEMES[scheme].rMax;
}

// Sufficient condition for the discrete maximum principle of the theta method
// (Morton & Mayers ch. 2): r (1 - theta) <= 1/2.
export function maxPrincipleLimit(scheme, theta = 0.5) {
  const th = scheme === 'theta' ? theta : HEAT_SCHEMES[scheme].theta;
  if (th === null) return NaN;
  return th >= 1 ? Infinity : 1 / (2 * (1 - th));
}

// Initial data. initial(x) is the continuous function (the mean of the two
// one-sided values at a jump); noise adds eps (-1)^j at the unknowns, a
// grid-scale perturbation that the continuous problem cannot represent.
const tophatDirichlet = (x0, x1) => (m) => (2 / (m * Math.PI)) * (Math.cos(m * Math.PI * x0) - Math.cos(m * Math.PI * x1));
const sineSum = (modes) => (x) => {
  let s = 0;
  for (const [m, b] of modes) s += b * Math.sin(m * Math.PI * x);
  return s;
};
const near = (x, y) => Math.abs(x - y) < 1e-12;

export const HEAT_PRESETS = {
  sine: {
    id: 'sine',
    name: 'Sine mode',
    description: 'u₀ = sin πx with u = 0 at both ends. A single eigenmode: it keeps its shape and decays like exp(−κπ²t).',
    bc: 'dirichlet',
    left: 0,
    right: 0,
    sine: [[1, 1]],
    initial: sineSum([[1, 1]]),
  },
  modes: {
    id: 'modes',
    name: 'Two modes',
    description: 'u₀ = sin πx + ½ sin 6πx. The short wave decays 36 times faster than the long one.',
    bc: 'dirichlet',
    left: 0,
    right: 0,
    sine: [[1, 1], [6, 0.5]],
    initial: sineSum([[1, 1], [6, 0.5]]),
  },
  'noisy-sine': {
    id: 'noisy-sine',
    name: 'Sine plus grid noise',
    description: 'sin πx plus a 10⁻³ sawtooth (−1)^j: the highest grid mode, the first to blow up when FTCS is run with r > 1/2.',
    bc: 'dirichlet',
    left: 0,
    right: 0,
    sine: [[1, 1]],
    noise: 1e-3,
    initial: sineSum([[1, 1]]),
  },
  'top-hat': {
    id: 'top-hat',
    name: 'Top hat',
    description: 'u₀ = 1 on 0.4 < x < 0.6, else 0; u = 0 at both ends. Its Fourier series has every odd mode.',
    bc: 'dirichlet',
    left: 0,
    right: 0,
    coeff: tophatDirichlet(0.4, 0.6),
    initial: (x) => (near(x, 0.4) || near(x, 0.6) ? 0.5 : x > 0.4 && x < 0.6 ? 1 : 0),
  },
  step: {
    id: 'step',
    name: 'Step',
    description: 'u₀ = 1 for x < 1/2, 0 beyond, with u(0) = 1 and u(1) = 0. Relaxes to the straight line 1 − x.',
    bc: 'dirichlet',
    left: 1,
    right: 0,
    // sine coefficients of u0 - (1 - x)
    coeff: (m) => (-2 * Math.cos((m * Math.PI) / 2)) / (m * Math.PI),
    initial: (x) => (near(x, 0.5) ? 0.5 : x < 0.5 ? 1 : 0),
  },
  'periodic-sine': {
    id: 'periodic-sine',
    name: 'Periodic sine',
    description: 'u₀ = sin 2πx on a periodic domain; decays like exp(−4κπ²t). The mean (zero) is conserved.',
    bc: 'periodic',
    fourier: { mean: 0, modes: [[1, 0, 1]] },
    initial: (x) => Math.sin(2 * Math.PI * x),
  },
  'periodic-top-hat': {
    id: 'periodic-top-hat',
    name: 'Periodic top hat',
    description: 'u₀ = 1 on 1/4 < x < 3/4 on a periodic domain. Total heat (the mean, 1/2) is conserved exactly by every scheme here.',
    bc: 'periodic',
    fourier: {
      mean: 0.5,
      cos: (m) => (Math.sin(2 * Math.PI * m * 0.75) - Math.sin(2 * Math.PI * m * 0.25)) / (Math.PI * m),
      sin: (m) => (Math.cos(2 * Math.PI * m * 0.25) - Math.cos(2 * Math.PI * m * 0.75)) / (Math.PI * m),
    },
    initial: (x) => (near(x, 0.25) || near(x, 0.75) ? 0.5 : x > 0.25 && x < 0.75 ? 1 : 0),
  },
};

// Broken / fixed pairs for the heat-equation pathologies. Each side is a
// complete recipe { preset, scheme, theta?, n, r | dtOverDx, steps }: run
// createHeat({ n, preset }) and `steps` calls of step() with
// dt = heatDemoDt(state, recipe). The test file runs exactly these recipes,
// so the numbers a chapter quotes from here are the tested ones.
export const HEAT_DEMOS = {
  'ftcs-blowup': {
    id: 'ftcs-blowup',
    name: 'FTCS past r = 1/2',
    description: 'sin πx plus a 10⁻³ sawtooth. At r = 0.52 the sawtooth (the highest grid mode) grows by |G| ≈ 1.078 per step and passes 10⁵ within 300 steps; at r = 0.5 it never grows.',
    broken: { preset: 'noisy-sine', scheme: 'ftcs', n: 50, r: 0.52, steps: 300 },
    fixed: { preset: 'noisy-sine', scheme: 'ftcs', n: 50, r: 0.5, steps: 300 },
  },
  'cn-ringing': {
    id: 'cn-ringing',
    name: 'Crank–Nicolson rings at large r',
    description: 'A step with r = 10. Crank–Nicolson sends the stiffest modes through G ≈ −1, so the profile zig-zags and the error beside the jump flips sign every step. Backward Euler (G → 0) stays monotone at the same r.',
    broken: { preset: 'step', scheme: 'cn', n: 50, r: 10, steps: 12 },
    fixed: { preset: 'step', scheme: 'btcs', n: 50, r: 10, steps: 12 },
  },
  'dufort-frankel-inconsistency': {
    id: 'dufort-frankel-inconsistency',
    name: 'Du Fort–Frankel with dt/dx fixed',
    description: 'sin πx to t = 0.2. With dt = dx/2 the scheme is stable but solves a damped wave equation: the amplitude swings to −0.57 instead of decaying to +0.14. With r = 1 (dt/dx → 0 as the grid is refined) it solves the heat equation.',
    broken: { preset: 'sine', scheme: 'dufort-frankel', n: 40, dtOverDx: 0.5, steps: 16 },
    fixed: { preset: 'sine', scheme: 'dufort-frankel', n: 40, r: 1, steps: 320 },
  },
};

// dt for a demo recipe on a state: recipe.dt, or r dx^2 / kappa, or c dx.
export function heatDemoDt(state, recipe) {
  if (recipe.dt != null) return recipe.dt;
  if (recipe.r != null) return (recipe.r * state.dx * state.dx) / state.kappa;
  return recipe.dtOverDx * state.dx;
}

// ---------------------------------------------------------------- Thomas

// Tridiagonal solve, row i: a[i] x[i-1] + b[i] x[i] + c[i] x[i+1] = d[i].
// opts: { n = b.length, x, cp, dp (work arrays, allocated if absent),
//         trace = true }. Inputs a, b, c, d are not modified; x may alias d.
// Events (trace on):
//   { t: 'enter', kind: 'forward', label, n }
//   { t: 'op', op: 'eliminate', row, cell: row, reads: [row-1, row], pivot, factor, cp, dp }
//      pivot = b[i] - a[i] cp[i-1] (the divisor), factor = a[i] (the
//      multiple of the normalised previous row subtracted from this one)
//   { t: 'leave', kind: 'forward' } then { t: 'enter', kind: 'back', ... }
//   { t: 'op', op: 'substitute', row, cell: row, reads: [row, row+1], x }
//   { t: 'leave', kind: 'back' }
// Returns x. No pivoting: safe when |b_i| >= |a_i| + |c_i| (Golub & Van Loan §4.3).
export function* thomas(a, b, c, d, opts = {}) {
  const n = opts.n ?? b.length;
  const x = opts.x ?? new Float64Array(n);
  const cp = opts.cp ?? new Float64Array(n);
  const dp = opts.dp ?? new Float64Array(n);
  const trace = opts.trace ?? true;
  if (n === 0) return x;
  if (trace) yield { t: 'enter', kind: 'forward', label: 'Forward elimination', n };
  let piv = b[0];
  cp[0] = n > 1 ? c[0] / piv : 0;
  dp[0] = d[0] / piv;
  if (trace) yield { t: 'op', op: 'eliminate', row: 0, cell: 0, reads: [0], pivot: piv, factor: 0, cp: cp[0], dp: dp[0] };
  for (let i = 1; i < n; i++) {
    piv = b[i] - a[i] * cp[i - 1];
    cp[i] = i < n - 1 ? c[i] / piv : 0;
    dp[i] = (d[i] - a[i] * dp[i - 1]) / piv;
    if (trace) yield { t: 'op', op: 'eliminate', row: i, cell: i, reads: [i - 1, i], pivot: piv, factor: a[i], cp: cp[i], dp: dp[i] };
  }
  if (trace) {
    yield { t: 'leave', kind: 'forward' };
    yield { t: 'enter', kind: 'back', label: 'Back substitution', n };
  }
  x[n - 1] = dp[n - 1];
  if (trace) yield { t: 'op', op: 'substitute', row: n - 1, cell: n - 1, reads: [n - 1], x: x[n - 1] };
  for (let i = n - 2; i >= 0; i--) {
    x[i] = dp[i] - cp[i] * x[i + 1];
    if (trace) yield { t: 'op', op: 'substitute', row: i, cell: i, reads: [i, i + 1], x: x[i] };
  }
  if (trace) yield { t: 'leave', kind: 'back' };
  return x;
}

// Preallocated work for solveCyclic on n unknowns (n >= 3).
export function cyclicWork(n) {
  const w = {
    n,
    bb: new Float64Array(n),
    uu: new Float64Array(n),
    y: new Float64Array(n),
    z: new Float64Array(n),
    cp: new Float64Array(n),
    dp: new Float64Array(n),
  };
  w.o1 = { n, x: w.y, cp: w.cp, dp: w.dp, trace: false };
  w.o2 = { n, x: w.z, cp: w.cp, dp: w.dp, trace: false };
  return w;
}

// Periodic tridiagonal system: as thomas(), plus the corner entries
// A[0][n-1] = a[0] and A[n-1][0] = c[n-1]. Sherman–Morrison: solve two
// ordinary tridiagonal systems with a rank-one-modified matrix, then correct
// (Numerical Recipes §2.7). Writes x and returns it.
export function solveCyclic(a, b, c, d, x, work) {
  const n = work.n;
  if (n < 3) throw new Error('solveCyclic needs n >= 3');
  const alpha = c[n - 1];
  const beta = a[0];
  const gamma = -b[0];
  const { bb, uu, y, z } = work;
  for (let i = 0; i < n; i++) {
    bb[i] = b[i];
    uu[i] = 0;
  }
  bb[0] = b[0] - gamma;
  bb[n - 1] = b[n - 1] - (alpha * beta) / gamma;
  uu[0] = gamma;
  uu[n - 1] = alpha;
  drain(thomas(a, bb, c, d, work.o1));
  drain(thomas(a, bb, c, uu, work.o2));
  const fact = (y[0] + (beta * y[n - 1]) / gamma) / (1 + z[0] + (beta * z[n - 1]) / gamma);
  for (let i = 0; i < n; i++) x[i] = y[i] - fact * z[i];
  return x;
}

// ---------------------------------------------------------------- heat equation

function resolvePreset(p) {
  if (typeof p !== 'string') return p;
  const out = HEAT_PRESETS[p];
  if (!out) throw new Error(`unknown heat preset ${p}`);
  return out;
}

// opts: { n = 50 (intervals, dx = 1/n), kappa = 1, preset = 'sine' (id or
// object), bc, left, right (override the preset), init(x, j, n) (custom
// initial data; then fillExact returns null) }.
export function createHeat(opts = {}) {
  const preset = resolvePreset(opts.preset ?? 'sine');
  const bc = opts.bc ?? preset.bc ?? 'dirichlet';
  const n = opts.n ?? 50;
  const len = bc === 'periodic' ? n : n + 1;
  const m = bc === 'periodic' ? n : n - 1;
  if (bc === 'periodic' && n < 3) throw new Error('periodic grid needs n >= 3');
  const state = {
    preset,
    bc,
    n,
    len,
    m,
    dx: 1 / n,
    kappa: opts.kappa ?? 1,
    left: opts.left ?? preset.left ?? 0,
    right: opts.right ?? preset.right ?? 0,
    init: opts.init ?? null,
    t: 0,
    steps: 0,
    lastDt: NaN,
    lastScheme: '',
    pendingDt: NaN,
    pendingScheme: '',
    x: new Float64Array(len),
    u: new Float64Array(len),
    uPrev: new Float64Array(len),
    work: new Float64Array(len),
    exact: new Float64Array(len),
    lower: new Float64Array(m),
    diag: new Float64Array(m),
    upper: new Float64Array(m),
    rhs: new Float64Array(m),
    sol: new Float64Array(m),
    cp: new Float64Array(m),
    dp: new Float64Array(m),
  };
  for (let j = 0; j < len; j++) state.x[j] = j / n;
  state.tw = { n: m, x: state.sol, cp: state.cp, dp: state.dp, trace: false };
  state.cw = bc === 'periodic' ? cyclicWork(m) : null;
  resetHeat(state);
  return state;
}

// Back to t = 0 with the initial data (no allocation).
export function resetHeat(state) {
  const { u, x, n, len, preset } = state;
  const noise = state.init ? 0 : preset.noise ?? 0;
  for (let j = 0; j < len; j++) {
    u[j] = state.init ? state.init(x[j], j, n) : preset.initial(x[j]);
    if (noise) u[j] += noise * (j % 2 === 0 ? 1 : -1);
  }
  if (state.bc === 'dirichlet') {
    u[0] = state.left;
    u[n] = state.right;
  }
  state.uPrev.set(u);
  state.t = 0;
  state.steps = 0;
  state.lastDt = NaN;
  state.lastScheme = '';
  state.pendingDt = NaN;
  state.pendingScheme = '';
  return state;
}

// Switch an existing state to another preset with the same boundary type
// (the arrays have the preset's length) and restart it: preset, left/right
// and the initial data all change together. Throws if the bc differs; build
// a new state with createHeat for that.
export function setHeatPreset(state, preset) {
  const p = resolvePreset(preset);
  if ((p.bc ?? 'dirichlet') !== state.bc) throw new Error(`preset ${p.id} has bc ${p.bc}; this state is ${state.bc}`);
  state.preset = p;
  state.init = null;
  state.left = p.left ?? 0;
  state.right = p.right ?? 0;
  return resetHeat(state);
}

// dt that gives mesh ratio r on this grid.
export const dtForR = (state, r) => (r * state.dx * state.dx) / state.kappa;
export const meshRatio = (state, dt) => (state.kappa * dt) / (state.dx * state.dx);

// Write the live boundary values into the end nodes (Dirichlet only).
function applyBoundary(s) {
  if (s.bc !== 'dirichlet') return;
  s.u[0] = s.left;
  s.u[s.n] = s.right;
}

function explicitStep(s, r) {
  const { u, uPrev: p, len } = s;
  p.set(u);
  if (s.bc === 'dirichlet') {
    for (let j = 1; j < len - 1; j++) u[j] = p[j] + r * (p[j + 1] - 2 * p[j] + p[j - 1]);
  } else {
    const n = len;
    u[0] = p[0] + r * (p[1] - 2 * p[0] + p[n - 1]);
    for (let j = 1; j < n - 1; j++) u[j] = p[j] + r * (p[j + 1] - 2 * p[j] + p[j - 1]);
    u[n - 1] = p[n - 1] + r * (p[0] - 2 * p[n - 1] + p[n - 2]);
  }
}

// The theta method in three parts: assemble the (cyclic) tridiagonal system
// for the unknowns from the current u, solve it into s.sol, copy s.sol back.
function assembleTheta(s, r, theta) {
  const { u, uPrev: p, lower, diag, upper, rhs, m } = s;
  p.set(u);
  const im = theta * r;
  const ex = (1 - theta) * r;
  if (s.bc === 'dirichlet') {
    if (m === 0) return;
    for (let i = 0; i < m; i++) {
      const j = i + 1;
      lower[i] = -im;
      diag[i] = 1 + 2 * im;
      upper[i] = -im;
      rhs[i] = p[j] + ex * (p[j + 1] - 2 * p[j] + p[j - 1]);
    }
    rhs[0] += im * s.left;
    rhs[m - 1] += im * s.right;
  } else {
    const n = m;
    for (let i = 0; i < n; i++) {
      lower[i] = -im;
      diag[i] = 1 + 2 * im;
      upper[i] = -im;
      const jm = i === 0 ? n - 1 : i - 1;
      const jp = i === n - 1 ? 0 : i + 1;
      rhs[i] = p[i] + ex * (p[jp] - 2 * p[i] + p[jm]);
    }
  }
}

function solveTheta(s) {
  if (s.m === 0) return;
  if (s.bc === 'dirichlet') drain(thomas(s.lower, s.diag, s.upper, s.rhs, s.tw));
  else solveCyclic(s.lower, s.diag, s.upper, s.rhs, s.sol, s.cw);
}

function copySolution(s) {
  const { u, sol, m } = s;
  const off = s.bc === 'dirichlet' ? 1 : 0;
  for (let i = 0; i < m; i++) u[i + off] = sol[i];
}

function thetaStep(s, r, theta) {
  assembleTheta(s, r, theta);
  solveTheta(s);
  copySolution(s);
}

function implicitTheta(scheme, theta) {
  switch (scheme) {
    case 'btcs':
      return 1;
    case 'cn':
      return 0.5;
    case 'theta':
      return theta ?? 0.5;
    default:
      throw new Error(`assembleHeat is for the implicit two-level schemes (btcs, cn, theta), not ${scheme}`);
  }
}

function advance(s, dt, scheme) {
  s.t += dt;
  s.steps++;
  s.lastDt = dt;
  s.lastScheme = scheme;
}

function dufortFrankelStep(s, r) {
  const { u, uPrev: q, work: w, len } = s;
  const den = 1 + 2 * r;
  const a = (1 - 2 * r) / den;
  const b = (2 * r) / den;
  if (s.bc === 'dirichlet') {
    w[0] = s.left;
    w[len - 1] = s.right;
    for (let j = 1; j < len - 1; j++) w[j] = a * q[j] + b * (u[j + 1] + u[j - 1]);
  } else {
    const n = len;
    w[0] = a * q[0] + b * (u[1] + u[n - 1]);
    for (let j = 1; j < n - 1; j++) w[j] = a * q[j] + b * (u[j + 1] + u[j - 1]);
    w[n - 1] = a * q[n - 1] + b * (u[0] + u[n - 2]);
  }
  q.set(u);
  u.set(w);
}

// Advance one time step. params: { scheme: 'ftcs' | 'btcs' | 'cn' | 'theta' |
// 'dufort-frankel', dt, theta (for 'theta') }. Mutates state.u (and uPrev,
// which afterwards holds the previous time level). Dirichlet values are
// taken from state.left/right at the start of the step. Du Fort–Frankel
// restarts with one Crank–Nicolson step on the first step and whenever dt
// changes.
export function step(state, params) {
  const scheme = params.scheme ?? 'cn';
  const dt = params.dt;
  const r = meshRatio(state, dt);
  applyBoundary(state);
  switch (scheme) {
    case 'ftcs':
      explicitStep(state, r);
      break;
    case 'btcs':
    case 'cn':
    case 'theta':
      thetaStep(state, r, implicitTheta(scheme, params.theta));
      break;
    case 'dufort-frankel':
      if (state.steps > 0 && state.lastDt === dt) dufortFrankelStep(state, r);
      else thetaStep(state, r, 0.5);
      break;
    default:
      throw new Error(`unknown heat scheme ${scheme}`);
  }
  advance(state, dt, scheme);
  return state;
}

// The first half of one implicit step (btcs, cn or theta), for figures that
// animate the linear solve: applies the boundary values, saves u in uPrev and
// fills state.lower/diag/upper/rhs (m unknowns; the interior nodes 1..n-1 for
// Dirichlet, all n nodes for periodic). Solve into state.sol, then call
// finishHeatStep. For Dirichlet the solve is a plain Thomas run, e.g.
//   assembleHeat(s, { scheme: 'cn', dt });
//   for (const e of thomas(s.lower, s.diag, s.upper, s.rhs, { x: s.sol })) draw(e);
//   finishHeatStep(s);
// For periodic it is solveCyclic(s.lower, s.diag, s.upper, s.rhs, s.sol, s.cw)
// (its corners are lower[0] and upper[m-1]). step() runs these same pieces.
export function assembleHeat(state, params) {
  const scheme = params.scheme ?? 'cn';
  const theta = implicitTheta(scheme, params.theta);
  applyBoundary(state);
  assembleTheta(state, meshRatio(state, params.dt), theta);
  state.pendingDt = params.dt;
  state.pendingScheme = scheme;
  return state;
}

// The second half: copy state.sol into u and advance t by the assembled dt.
export function finishHeatStep(state) {
  if (!(state.pendingDt >= 0)) throw new Error('finishHeatStep without assembleHeat');
  copySolution(state);
  advance(state, state.pendingDt, state.pendingScheme);
  state.pendingDt = NaN;
  state.pendingScheme = '';
  return state;
}

// Exact solution of u_t = kappa u_xx for a preset, at points xs and time t.
// Dirichlet: u = left + (right - left) x + sum_m b_m sin(m pi x) e^{-kappa m^2 pi^2 t}.
// Periodic:  u = mean + sum_m (A_m cos 2 pi m x + B_m sin 2 pi m x) e^{-4 kappa pi^2 m^2 t}.
// Infinite series are summed until the next term is below e^{-40} of its
// coefficient (at most 50,000 terms); at t = 0 the initial function is returned
// (grid noise in 'noisy-sine' is not part of the exact solution). The long
// series use the rotation recurrence described in the header.
let seriesScratch = new Float64Array(0);

// Sum_{m=1..M} e^{-kappa (w m)^2 t} (A_m cos(m w x) + B_m sin(m w x)) into
// out (A may be null: a sine series). The damped coefficients are computed
// once into scratch; then, node by node, (cos, sin)(m w x) is advanced by one
// rotation per term with everything held in local variables.
function addSeries(out, xs, w, kappa, t, M, A, B) {
  if (seriesScratch.length < 2 * M) seriesScratch = new Float64Array(2 * M);
  const sc = seriesScratch;
  for (let m = 1; m <= M; m++) {
    const g = Math.exp(-kappa * (w * m) ** 2 * t);
    sc[m - 1] = A ? g * A(m) : 0;
    sc[M + m - 1] = g * B(m);
  }
  for (let k = 0; k < xs.length; k++) {
    const c1 = Math.cos(w * xs[k]);
    const s1 = Math.sin(w * xs[k]);
    let c = c1;
    let s = s1;
    let acc = 0;
    if (A) {
      for (let i = 0; i < M; i++) {
        acc += sc[i] * c + sc[M + i] * s;
        const cn = c * c1 - s * s1;
        s = s * c1 + c * s1;
        c = cn;
      }
    } else {
      for (let i = 0; i < M; i++) {
        acc += sc[M + i] * s;
        const cn = c * c1 - s * s1;
        s = s * c1 + c * s1;
        c = cn;
      }
    }
    out[k] += acc;
  }
}

export function heatExact(preset, xs, t, kappa = 1, out = new Float64Array(xs.length)) {
  const p = resolvePreset(preset);
  const nx = xs.length;
  if (t <= 0) {
    for (let k = 0; k < nx; k++) out[k] = p.initial(xs[k]);
    return out;
  }
  if (p.bc === 'dirichlet') {
    const L = p.left ?? 0;
    const R = p.right ?? 0;
    for (let k = 0; k < nx; k++) out[k] = L + (R - L) * xs[k];
    if (p.sine) {
      for (const [m, b] of p.sine) {
        const g = b * Math.exp(-kappa * (m * Math.PI) ** 2 * t);
        for (let k = 0; k < nx; k++) out[k] += g * Math.sin(m * Math.PI * xs[k]);
      }
    } else {
      const M = Math.min(50000, Math.ceil(Math.sqrt(40 / (kappa * Math.PI * Math.PI * t))) + 2);
      addSeries(out, xs, Math.PI, kappa, t, M, null, p.coeff);
    }
  } else {
    const f = p.fourier;
    for (let k = 0; k < nx; k++) out[k] = f.mean;
    if (f.modes) {
      for (const [m, A, B] of f.modes) {
        const g = Math.exp(-kappa * (2 * Math.PI * m) ** 2 * t);
        for (let k = 0; k < nx; k++) {
          const ph = 2 * Math.PI * m * xs[k];
          out[k] += g * (A * Math.cos(ph) + B * Math.sin(ph));
        }
      }
    } else {
      const M = Math.min(50000, Math.ceil(Math.sqrt(40 / (kappa * 4 * Math.PI * Math.PI * t))) + 2);
      addSeries(out, xs, 2 * Math.PI, kappa, t, M, f.cos, f.sin);
    }
  }
  return out;
}

// Fill state.exact with the exact solution at state.t. Returns null when the
// state has custom initial data or overrides the preset's boundary conditions.
export function fillExact(state) {
  const p = state.preset;
  if (state.init || state.bc !== p.bc) return null;
  if (state.bc === 'dirichlet' && (state.left !== (p.left ?? 0) || state.right !== (p.right ?? 0))) return null;
  return heatExact(p, state.x, state.t, state.kappa, state.exact);
}

// ---------------------------------------------------------------- Fourier analysis

// The two roots of the Du Fort–Frankel amplification equation
// (1 + 2r) G^2 - 4 r cos(xi) G - (1 - 2r) = 0.
export function dufortFrankelRoots(xi, r) {
  const den = 1 + 2 * r;
  const disc = 1 - 4 * r * r * Math.sin(xi) ** 2;
  const re = (2 * r * Math.cos(xi)) / den;
  if (disc >= 0) {
    const s = Math.sqrt(disc) / den;
    return { re1: re + s, im1: 0, re2: re - s, im2: 0 };
  }
  const s = Math.sqrt(-disc) / den;
  return { re1: re, im1: s, re2: re, im2: -s };
}

// Amplification factor G of one step for the Fourier mode e^{i k x}, with
// xi = k dx. Signed real G for the two-level schemes; for Du Fort–Frankel the
// modulus of the larger root.
export function amplification(scheme, xi, r, theta = 0.5) {
  const s2 = Math.sin(xi / 2) ** 2;
  switch (scheme) {
    case 'ftcs':
      return 1 - 4 * r * s2;
    case 'btcs':
      return 1 / (1 + 4 * r * s2);
    case 'cn':
      return (1 - 2 * r * s2) / (1 + 2 * r * s2);
    case 'theta':
      return (1 - 4 * (1 - theta) * r * s2) / (1 + 4 * theta * r * s2);
    case 'dufort-frankel': {
      // larger root modulus of dufortFrankelRoots, without building the object:
      // real roots (2r cos xi ± sqrt(disc)) / (1 + 2r); complex pair |G|^2 = (2r - 1) / (2r + 1)
      const disc = 1 - 4 * r * r * Math.sin(xi) ** 2;
      if (disc >= 0) return (2 * r * Math.abs(Math.cos(xi)) + Math.sqrt(disc)) / (1 + 2 * r);
      return Math.sqrt((2 * r - 1) / (2 * r + 1));
    }
    default:
      throw new Error(`unknown heat scheme ${scheme}`);
  }
}

// The exact decay of the same mode over one step: e^{-kappa k^2 dt} = e^{-r xi^2}.
export const exactAmplification = (xi, r) => Math.exp(-r * xi * xi);

// G sampled on xi in [0, pi] for plotting. Pass out = { xi, G, exact } (equal
// length Float64Arrays) to refill them in place, e.g. every frame while r is
// dragged; samples then defaults to out.xi.length.
export function amplificationCurve(scheme, r, { theta = 0.5, samples, out = null } = {}) {
  const ns = samples ?? out?.xi.length ?? 181;
  const xi = out?.xi ?? new Float64Array(ns);
  const G = out?.G ?? new Float64Array(ns);
  const ex = out?.exact ?? new Float64Array(ns);
  for (let k = 0; k < ns; k++) {
    xi[k] = (Math.PI * k) / (ns - 1);
    G[k] = amplification(scheme, xi[k], r, theta);
    ex[k] = exactAmplification(xi[k], r);
  }
  return out ?? { xi, G, exact: ex };
}

// Amplitude A(t) of the mode sin(k x) under the equation Du Fort–Frankel is
// consistent with when c = dt/dx is fixed: tau A'' + A' + kappa k^2 A = 0,
// tau = kappa c^2, with A(0) = 1 and A'(0) = -kappa k^2 (the slope the
// Crank–Nicolson startup step supplies). c = 0 gives the heat equation.
export function telegraphAmplitude(k, t, kappa, c) {
  const lam = kappa * k * k;
  const tau = kappa * c * c;
  if (tau === 0) return Math.exp(-lam * t);
  const D = 1 - 4 * tau * lam;
  if (D > 0) {
    // overdamped: A = C1 e^{s1 t} + C2 e^{s2 t}. Both the slow root s1 and the
    // fast-mode weight C2 are written without cancellation, so small c is safe.
    const sq = Math.sqrt(D);
    const q = 1 + sq;
    const s1 = (-2 * lam) / q;
    const s2 = -q / (2 * tau);
    const C2 = (-4 * tau * tau * lam * lam) / (q * q * sq);
    return (1 - C2) * Math.exp(s1 * t) + C2 * Math.exp(s2 * t);
  }
  const al = -1 / (2 * tau);
  if (D === 0) return (1 + (-lam - al) * t) * Math.exp(al * t);
  const om = Math.sqrt(-D) / (2 * tau);
  const B = (-lam - al) / om;
  return Math.exp(al * t) * (Math.cos(om * t) + B * Math.sin(om * t));
}

// ---------------------------------------------------------------- steady advection–diffusion

export const ADVDIFF_SCHEMES = {
  central: {
    id: 'central',
    name: 'Central differencing',
    description: 'Second order, but when the cell Péclet number |P| = |a| dx/κ exceeds 2 (either flow direction) the downstream coefficient turns negative and the solution wiggles node to node.',
    tex: '-a\\,\\frac{u_{j+1} - u_{j-1}}{2\\Delta x} + \\kappa\\,\\frac{u_{j+1} - 2u_j + u_{j-1}}{\\Delta x^2} = 0',
    order: 2,
    monotone: '|P| \\le 2',
  },
  upwind: {
    id: 'upwind',
    name: 'First-order upwind',
    description: 'Takes the advective difference from the upstream side. Always monotone, but only first order: it is central differencing with κ increased by |a| dx/2 (numerical diffusion).',
    tex: '-a\\,\\frac{u_j - u_{j-1}}{\\Delta x} + \\kappa\\,\\frac{u_{j+1} - 2u_j + u_{j-1}}{\\Delta x^2} = 0\\quad (a > 0)',
    texDiffusion: '\\kappa_{\\mathrm{num}} = \\frac{|a|\\,\\Delta x}{2}',
    order: 1,
    monotone: '\\text{all } P',
  },
  fitted: {
    id: 'fitted',
    name: 'Exponential fitting',
    description: 'Il’in–Allen–Southwell / Scharfetter–Gummel: solve the equation exactly between neighbouring nodes. Exact at the nodes for constant a and κ, monotone for every P, and it turns into upwind as P grows.',
    tex: '\\kappa \\to \\kappa\\,\\frac{P}{2}\\coth\\frac{P}{2},\\qquad P = \\frac{a\\,\\Delta x}{\\kappa}',
    texFlux: 'F_{j+1/2} = \\frac{\\kappa}{\\Delta x}\\left[B(P)\\,u_{j+1} - B(-P)\\,u_j\\right],\\quad B(P) = \\frac{P}{e^P - 1}',
    order: 'exact at nodes',
    monotone: '\\text{all } P',
  },
};

// Broken / fixed pairs for the boundary layer: { scheme, n, a, kappa } for
// createAdvDiff(n) and solveAdvDiff(state, { a, kappa, scheme }). The tests
// run these recipes.
export const ADVDIFF_DEMOS = {
  'central-wiggles': {
    id: 'central-wiggles',
    name: 'Central differencing past P = 2',
    description: '20 cells, a = 80, κ = 1: cell Péclet number 4. Central differencing zig-zags node to node and leaves [0, 1] (u ≈ −1/3 next to the outflow); exponential fitting on the same grid is exact at the nodes.',
    broken: { scheme: 'central', n: 20, a: 80, kappa: 1 },
    fixed: { scheme: 'fitted', n: 20, a: 80, kappa: 1 },
  },
  'central-refined': {
    id: 'central-refined',
    name: 'Refine until P < 2',
    description: 'The other cure: keep central differencing and refine the grid. With a = 80 and 50 cells, P = 1.6 and the profile is monotone.',
    broken: { scheme: 'central', n: 20, a: 80, kappa: 1 },
    fixed: { scheme: 'central', n: 50, a: 80, kappa: 1 },
  },
  'upwind-smearing': {
    id: 'upwind-smearing',
    name: 'Upwind smears the layer',
    description: 'a = 40, κ = 1 on 20 cells (P = 2): upwind never wiggles, but its numerical diffusion a dx/2 doubles κ and thickens the boundary layer. Exponential fitting is monotone and exact at the nodes.',
    broken: { scheme: 'upwind', n: 20, a: 40, kappa: 1 },
    fixed: { scheme: 'fitted', n: 20, a: 40, kappa: 1 },
  },
};

// Bernoulli function B(x) = x / (e^x - 1), B(0) = 1.
export function bernoulli(x) {
  if (Math.abs(x) < 1e-8) return 1 - x / 2;
  return x / Math.expm1(x);
}

// The fitting factor sigma(P) = (P/2) coth(P/2): fitted kappa = sigma kappa.
export function fittingFactor(P) {
  const h = P / 2;
  if (Math.abs(h) < 1e-4) return 1 + (h * h) / 3;
  return h / Math.tanh(h);
}

export const cellPeclet = (a, kappa, dx) => (a * dx) / kappa;

// Exact solution of -a u' + kappa u'' = 0, u(0) = 0, u(1) = 1, with Pe = a/kappa:
// u = (e^{Pe x} - 1) / (e^{Pe} - 1), evaluated without overflow.
export function advDiffExact(x, Pe) {
  if (Pe === 0) return x;
  if (Math.abs(Pe) < 700) return Math.expm1(Pe * x) / Math.expm1(Pe);
  return Pe > 0 ? Math.exp(Pe * (x - 1)) : -Math.expm1(Pe * x);
}

// Every scheme here is a two-point flux F_{j+1/2} = (kappa/dx)(alpha u_{j+1} - beta u_j),
// so node j reads beta u_{j-1} - (alpha + beta) u_j + alpha u_{j+1} = 0.
// The scheme is monotone (an M-matrix) iff alpha >= 0 and beta >= 0. For
// central differencing alpha = 1 - P/2 < 0 iff P > 2 and beta = 1 + P/2 < 0
// iff P < -2, so it is monotone iff |P| <= 2.
export function advDiffCoefficients(scheme, P) {
  switch (scheme) {
    case 'central':
      return { alpha: 1 - P / 2, beta: 1 + P / 2 };
    case 'upwind':
      return P >= 0 ? { alpha: 1, beta: 1 + P } : { alpha: 1 - P, beta: 1 };
    case 'fitted':
      return { alpha: bernoulli(P), beta: bernoulli(-P) };
    default:
      throw new Error(`unknown advection–diffusion scheme ${scheme}`);
  }
}

// n intervals, n + 1 nodes; n - 1 unknowns.
export function createAdvDiff(n = 20) {
  const m = n - 1;
  const s = {
    n,
    m,
    dx: 1 / n,
    P: 0,
    Pe: 0,
    alpha: 1,
    beta: 1,
    x: new Float64Array(n + 1),
    u: new Float64Array(n + 1),
    exact: new Float64Array(n + 1),
    lower: new Float64Array(m),
    diag: new Float64Array(m),
    upper: new Float64Array(m),
    rhs: new Float64Array(m),
    sol: new Float64Array(m),
    cp: new Float64Array(m),
    dp: new Float64Array(m),
  };
  for (let j = 0; j <= n; j++) s.x[j] = j / n;
  s.tw = { n: m, x: s.sol, cp: s.cp, dp: s.dp, trace: false };
  return s;
}

// Fill the tridiagonal system (state.lower/diag/upper/rhs) for params
// { a, kappa, scheme }. A figure can then animate thomas() on it.
export function assembleAdvDiff(state, params) {
  const { a, kappa, scheme } = params;
  const P = (a * state.dx) / kappa;
  const { alpha, beta } = advDiffCoefficients(scheme, P);
  const { lower, diag, upper, rhs, m } = state;
  for (let i = 0; i < m; i++) {
    lower[i] = -beta;
    diag[i] = alpha + beta;
    upper[i] = -alpha;
    rhs[i] = 0;
  }
  // u(0) = 0 adds nothing; u(1) = 1 moves alpha * 1 to the right-hand side.
  if (m > 0) rhs[m - 1] += alpha;
  state.P = P;
  state.Pe = a / kappa;
  state.alpha = alpha;
  state.beta = beta;
  return state;
}

// Solve the steady problem; fills state.u (nodal values including the two
// boundary nodes) and state.exact. Returns state.u.
export function solveAdvDiff(state, params) {
  assembleAdvDiff(state, params);
  const { u, exact, x, n, m, sol } = state;
  if (m > 0) drain(thomas(state.lower, state.diag, state.upper, state.rhs, state.tw));
  u[0] = 0;
  u[n] = 1;
  for (let i = 0; i < m; i++) u[i + 1] = sol[i];
  for (let j = 0; j <= n; j++) exact[j] = advDiffExact(x[j], state.Pe);
  return u;
}
