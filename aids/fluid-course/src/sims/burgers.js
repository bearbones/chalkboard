// Inviscid Burgers' equation u_t + (u^2/2)_x = 0 on a 1-D grid.
//
// What it does. A finite-volume time-stepper for the simplest nonlinear
// conservation law, with a menu of numerical fluxes so a reader can compare
// them on the same data: Godunov (exact Riemann solution), Rusanov (local
// Lax-Friedrichs), Lax-Friedrichs, Roe with and without Harten's entropy
// fix, Lax-Wendroff in Richtmyer's two-step form and in the original
// one-step form, and MUSCL (limited linear
// reconstruction + any of the first-order fluxes + SSP-RK2). One scheme is
// deliberately wrong: 'upwind-nc' discretises the quasi-linear form u u_x
// instead of the flux form, and its shocks move at the wrong speed.
// Alongside: exact Riemann solutions, the exact smooth solution of the sine
// wave (before and after it breaks), the N-wave, a shock-position tracker and
// the Rankine-Hugoniot speed.
//
// Conventions. Cell-centred values u[i], i = 0..n-1, on [xmin, xmax] with
// dx = (xmax - xmin)/n and centres x[i] = xmin + (i + 1/2) dx. Face k sits
// between cells k-1 and k (k = 0..n) and carries the numerical flux F[k]; a
// conservative step is
//   u_i <- u_i - (dt/dx) (F[i+1] - F[i]).
// Two ghost cells per side are filled each stage: 'periodic' wraps,
// 'transmissive' copies the nearest interior value (zero gradient). The
// equation is already nondimensional: u is a speed, x a length, t a time in
// any consistent units. The flux is f(u) = u^2/2, so the wave speed is
// f'(u) = u and the CFL number is nu = max|u| dt/dx.
//
// API. createBurgers({ preset, n, scheme, ... }) allocates a state;
// stepBurgers(state, dt) advances it in place (no explicit allocation: the
// typed arrays are made once in createBurgers); burgersDt(state, cfl) gives
// the CFL time step; burgersExact(state, out) fills the exact solution at
// state.t. Scheme, limiter, Riemann flux used inside MUSCL and the
// entropy-fix width are plain fields of the state (state.scheme etc.) and
// may be changed between steps.
//
// Failure guard. After every step the profile is scanned. The first value
// that is not finite, or whose size exceeds state.blowup times the largest
// |u| at the first step (default 1e3; entropy solutions obey a maximum
// principle, max|u(t)| <= max|u0|, so this is a numerical blow-up), is
// recorded in state.failure = { cell, x, t, step, u, reason }, and further
// steps are refused (stepBurgers returns false, advanceBurgers stops). A
// scheme that blows up therefore reports where and when, instead of filling
// the plot with NaN while the clock keeps running.
//
// Sources.
//   R. J. LeVeque, Finite Volume Methods for Hyperbolic Problems, CUP 2002:
//     §11.2-11.5 (characteristics, Burgers, rarefactions, compression waves
//     and breaking), §11.7 (equal-area rule), §11.8 (shock speed), §11.15
//     (N-wave decay), §12.1 (Godunov), §12.2-12.3 (Roe-type fluctuations,
//     transonic rarefactions and why the scalar Roe flux needs an entropy fix),
//     §12.5 (Lax-Friedrichs, local Lax-Friedrichs / Rusanov), §12.9 (the
//     non-conservative upwind method and its wrong shock speed), §12.10-12.11
//     (Lax-Wendroff theorem, entropy), §6.9-6.12 (slope and flux limiters,
//     TVD); §15.3 treats the systems version of the Roe solver and its
//     entropy fixes (used in euler1d.js).
//   E. F. Toro, Riemann Solvers and Numerical Methods for Fluid Dynamics,
//     3rd ed. 2009: §2.4 and §5.4 (Burgers' Riemann problem and Godunov
//     flux), §5.3.3 (Lax-Friedrichs, Richtmyer), §10.5.1 (Rusanov), §13-14
//     (TVD and MUSCL).
//   S. K. Godunov, Mat. Sb. 47 (1959). V. V. Rusanov, J. Comput. Math. Phys.
//   USSR 1 (1961). P. D. Lax, CPAM 7 (1954). P. D. Lax and B. Wendroff,
//   CPAM 13 (1960) 217-237. R. D. Richtmyer, NCAR Tech. Note 63-2 (1963). P. L. Roe, J. Comput. Phys. 43 (1981). A. Harten, J. Comput.
//   Phys. 49 (1983); A. Harten and J. M. Hyman, J. Comput. Phys. 50 (1983).
//   B. van Leer, J. Comput. Phys. 32 (1979) (MUSCL). C.-W. Shu and S. Osher,
//   J. Comput. Phys. 77 (1988); S. Gottlieb and C.-W. Shu, Math. Comp. 67
//   (1998) (SSP-RK2 = Heun's method in Shu-Osher form).
//
// Deviations. Roe's entropy fix uses Harten's (1983) smoothed |a|,
//   Q(a) = |a| if |a| >= delta, (a^2 + delta^2)/(2 delta) otherwise,
// with the local width delta = max(0, a - u_L, u_R - a) suggested by
// Harten and Hyman (1983) unless a fixed state.delta > 0 is set. For Burgers
// that width is (u_R - u_L)/2 at an expansion and 0 at a shock, so the fix
// only ever touches expansions. (LeVeque §15.3 also describes Harten and
// Hyman's wave-splitting variant for systems; euler1d.js uses that one.) The
// sine and N-wave initial data are sampled at cell centres, Riemann steps are
// cell averaged, which matters only at O(dx^2) for smooth data but decides
// the transonic demo: Roe keeps the expansion shock only when the jump sits
// on a cell face (even n for the 'transonic' preset). With odd n the middle
// cell holds the sonic value u = 0, Roe's flux at its faces equals
// Godunov's, and even plain Roe opens the fan.
//
// Time step. Every scheme carries cflMax (BURGERS_SCHEMES); burgersDt and
// advanceBurgers default to 0.9 cflMax for the current scheme, and honour an
// explicit cfl so a figure can cross the limit on purpose.

import { centres, sum } from './util.js';

const f = (u) => 0.5 * u * u;

// The exact solution of the Riemann problem u(x,0) = u_L (x<0), u_R (x>0) at
// s = x/t (LeVeque §11.3-11.4 and §11.8, Toro §2.4). A shock (u_L > u_R) moves at the
// Rankine-Hugoniot speed (u_L + u_R)/2; otherwise a rarefaction fan u = x/t.
export function burgersRiemann(uL, uR, s) {
  if (uL > uR) return s < 0.5 * (uL + uR) ? uL : uR;
  if (s <= uL) return uL;
  if (s >= uR) return uR;
  return s;
}

// Rankine-Hugoniot shock speed [f]/[u] for f = u^2/2.
export function rhSpeed(uL, uR) {
  return uL === uR ? uL : (f(uR) - f(uL)) / (uR - uL);
}

// Slope limiters (LeVeque §6.9-6.12, Toro §13.8). Each takes the backward
// and forward differences a = u_i - u_{i-1}, b = u_{i+1} - u_i and returns
// the limited slope times dx.
export const LIMITERS = [
  { id: 'minmod', name: 'minmod', tex: '\\sigma = \\operatorname{minmod}(a, b)', description: 'The smaller slope when both agree in sign, else zero. Most diffusive TVD limiter.' },
  { id: 'vanleer', name: 'van Leer', tex: '\\sigma = \\frac{2ab}{a + b} \\ (ab > 0)', description: 'Harmonic mean of the two slopes (van Leer 1974). Smooth.' },
  { id: 'mc', name: 'MC', tex: '\\sigma = \\operatorname{minmod}\\left(2a, \\tfrac12(a+b), 2b\\right)', description: 'Monotonised central (van Leer 1977). Sharp and robust.' },
  { id: 'superbee', name: 'superbee', tex: '\\sigma = \\operatorname{maxmod}\\left(\\operatorname{minmod}(2a, b), \\operatorname{minmod}(a, 2b)\\right)', description: 'Due to Roe, as credited in Sweby (1984). Most compressive TVD limiter; squares off smooth waves.' },
  { id: 'none', name: 'unlimited (Fromm)', tex: '\\sigma = \\tfrac12(a + b)', description: 'Central slope, no limiting. Second order but oscillates at jumps (Godunov\'s theorem).' },
];

const minmod2 = (a, b) => (a * b <= 0 ? 0 : Math.abs(a) < Math.abs(b) ? a : b);

export function limitSlope(id, a, b) {
  switch (id) {
    case 'minmod': return minmod2(a, b);
    case 'vanleer': return a * b > 0 ? (2 * a * b) / (a + b) : 0;
    case 'mc': {
      if (a * b <= 0) return 0;
      const s = a > 0 ? 1 : -1;
      return s * Math.min(2 * Math.abs(a), 0.5 * Math.abs(a + b), 2 * Math.abs(b));
    }
    case 'superbee': {
      if (a * b <= 0) return 0;
      const s1 = minmod2(2 * a, b), s2 = minmod2(a, 2 * b);
      return Math.abs(s1) > Math.abs(s2) ? s1 : s2;
    }
    default: return 0.5 * (a + b);
  }
}

// cflMax is the largest CFL number nu = max|u| dt/dx at which the scheme is
// stable (and, for the monotone and TVD schemes, TVD).
export const BURGERS_SCHEMES = [
  {
    id: 'godunov', name: 'Godunov', order: 1, conservative: true, cflMax: 1, stability: 'max|u| dt/dx <= 1',
    tex: 'F_{i+1/2} = f\\big(u^{*}(0; u_i, u_{i+1})\\big)',
    description: 'Flux of the exact Riemann solution at x/t = 0. Monotone, entropy satisfying, least diffusive first-order scheme.',
  },
  {
    id: 'rusanov', name: 'Rusanov (local Lax-Friedrichs)', order: 1, conservative: true, cflMax: 1, stability: 'max|u| dt/dx <= 1',
    tex: 'F = \\tfrac12(f_L + f_R) - \\tfrac12\\max(|u_L|, |u_R|)(u_R - u_L)',
    description: 'Central flux plus the smallest viscosity that keeps it upwind-safe. Robust, smears more than Godunov.',
  },
  {
    id: 'lf', name: 'Lax-Friedrichs', order: 1, conservative: true, cflMax: 1, stability: 'max|u| dt/dx <= 1',
    tex: 'F = \\tfrac12(f_L + f_R) - \\frac{\\Delta x}{2\\Delta t}(u_R - u_L)',
    description: 'Global maximal viscosity dx^2/(2 dt). Very diffusive, especially at small time steps; odd and even cells decouple.',
  },
  {
    id: 'roe', name: 'Roe (no entropy fix)', order: 1, conservative: true, cflMax: 1, stability: 'max|u| dt/dx <= 1',
    tex: 'F = \\tfrac12(f_L + f_R) - \\tfrac12|\\hat a|(u_R - u_L),\\quad \\hat a = \\tfrac12(u_L + u_R)',
    description: 'Upwinds by the Roe speed of the jump. Exact for shocks, but a transonic jump (u_L < 0 < u_R) that sits on a cell face is never fully opened: an entropy-violating stationary expansion shock from -m to m, m = min(-u_L, u_R), stays at the face (the whole jump when u_L = -u_R) and only the rest spreads into a fan. If a cell already holds the sonic value u = 0 the fan opens as it should.',
  },
  {
    id: 'roe-fix', name: 'Roe + Harten entropy fix', order: 1, conservative: true, cflMax: 1, stability: 'max|u| dt/dx <= 1',
    tex: 'Q(\\hat a) = \\begin{cases} |\\hat a| & |\\hat a| \\ge \\delta \\\\ \\dfrac{\\hat a^2 + \\delta^2}{2\\delta} & |\\hat a| < \\delta \\end{cases}',
    description: 'Roe with |a| smoothed near zero (Harten 1983), width delta = max(0, a - u_L, u_R - a) (Harten-Hyman) unless a fixed delta is set. Opens transonic rarefactions.',
  },
  {
    id: 'lw', name: 'Lax-Wendroff (Richtmyer two-step)', order: 2, conservative: true, cflMax: 1, stability: 'max|u| dt/dx <= 1',
    tex: 'u_{i+1/2}^{n+1/2} = \\tfrac12(u_i + u_{i+1}) - \\frac{\\Delta t}{2\\Delta x}(f_{i+1} - f_i),\\quad F = f(u_{i+1/2}^{n+1/2})',
    description: 'Second order on smooth data, oscillates at shocks (no linear monotone scheme can be second order: Godunov\'s theorem). At a stationary shock through u = 0 on a cell face (preset \'stationary\') the predictor averages the two sides to u = 0 and the face flux collapses to f(0) = 0: the cells beside the shock grow roughly linearly in time (max|u| ~ 60 at t = 0.4 on 200 cells), then explode near t = 1.26, where the blow-up guard stops the run.',
  },
  {
    id: 'lw1', name: 'Lax-Wendroff (one-step, 1960)', order: 2, conservative: true, cflMax: 1, stability: 'max|u| dt/dx <= 1',
    tex: 'F = \\tfrac12(f_L + f_R) - \\frac{\\Delta t}{2\\Delta x}\\,\\hat a\\,(f_R - f_L),\\quad \\hat a = f\'\\big(\\tfrac12(u_L + u_R)\\big)',
    description: 'The original nonlinear Lax-Wendroff flux, Jacobian at the face midpoint. Same order and the same shock ringing as Richtmyer, but it carries the right flux through a stationary shock.',
  },
  {
    id: 'muscl', name: 'MUSCL + limiter + SSP-RK2', order: 2, conservative: true, cflMax: 0.5,
    stability: 'max|u| dt/dx <= 1/2: TVD with any limiter in the TVD region (minmod alone allows 2/3)',
    tex: 'u^{L}_{i+1/2} = u_i + \\tfrac12\\sigma_i,\\ u^{R}_{i+1/2} = u_{i+1} - \\tfrac12\\sigma_{i+1}',
    description: 'Limited piecewise-linear reconstruction, a first-order flux at each face, two-stage strong-stability-preserving Runge-Kutta. Second order away from extrema and shocks. Above CFL 1/2 the steeper limiters (MC, superbee) raise the total variation.',
  },
  {
    id: 'upwind-nc', name: 'Non-conservative upwind', order: 1, conservative: false, cflMax: 1, stability: 'max|u| dt/dx <= 1',
    tex: 'u_i^{n+1} = u_i^n - \\frac{\\Delta t}{\\Delta x}\\, u_i^n\\,(u_i^n - u_{i-1}^n)\\quad (u_i^n \\ge 0)',
    description: 'Upwind differencing of the quasi-linear form u u_x. Fine for smooth data; its shocks travel at the wrong speed (LeVeque §12.9).',
  },
];

export const RIEMANN_FLUXES = ['godunov', 'rusanov', 'lf', 'roe', 'roe-fix'];

// One numerical flux at a face from left/right values. lam = dt/dx (only
// 'lf' and 'lw' use it); delta > 0 fixes Harten's width for 'roe-fix'.
export function burgersFlux(scheme, uL, uR, lam, delta = 0) {
  switch (scheme) {
    case 'godunov':
      return f(burgersRiemann(uL, uR, 0));
    case 'rusanov':
      return 0.5 * (f(uL) + f(uR)) - 0.5 * Math.max(Math.abs(uL), Math.abs(uR)) * (uR - uL);
    case 'lf':
      return 0.5 * (f(uL) + f(uR)) - (0.5 / lam) * (uR - uL);
    case 'roe':
    case 'roe-fix': {
      const a = 0.5 * (uL + uR);
      let q = Math.abs(a);
      if (scheme === 'roe-fix') {
        const d = delta > 0 ? delta : Math.max(0, a - uL, uR - a);
        if (q < d) q = (a * a + d * d) / (2 * d);
      }
      return 0.5 * (f(uL) + f(uR)) - 0.5 * q * (uR - uL);
    }
    case 'lw': {
      const uh = 0.5 * (uL + uR) - 0.5 * lam * (f(uR) - f(uL));
      return f(uh);
    }
    case 'lw1': {
      const a = 0.5 * (uL + uR);
      return 0.5 * (f(uL) + f(uR)) - 0.5 * lam * a * (f(uR) - f(uL));
    }
    default:
      throw new Error(`burgers: unknown flux ${scheme}`);
  }
}

// ---------------------------------------------------------------------------
// Initial data and exact solutions.

export const BURGERS_PRESETS = [
  {
    id: 'shock', name: 'Shock (Riemann step)', domain: [0, 1], bc: 'transmissive', tEnd: 0.5,
    params: { uL: 1, uR: 0, x0: 0.25 }, exact: 'riemann',
    description: 'u = 1 left of x0, 0 right. A shock moving at (u_L + u_R)/2.',
  },
  {
    id: 'rarefaction', name: 'Rarefaction (Riemann step)', domain: [0, 1], bc: 'transmissive', tEnd: 0.5,
    params: { uL: 0, uR: 1, x0: 0.25 }, exact: 'riemann',
    description: 'u = 0 left, 1 right. The jump opens into a fan u = (x - x0)/t.',
  },
  {
    id: 'transonic', name: 'Transonic rarefaction', domain: [-1, 1], bc: 'transmissive', tEnd: 0.5,
    params: { uL: -1, uR: 1, x0: 0 }, exact: 'riemann',
    description: 'u = -1 left, +1 right: a fan centred on a sonic point u = 0. With the jump on a cell face (even n), Roe without an entropy fix keeps it as a stationary expansion shock, bit for bit. With odd n the middle cell holds u = 0 and even plain Roe opens the fan, which is why the defect hides on some grids.',
  },
  {
    id: 'sine', name: 'Sine wave (breaking)', domain: [0, 1], bc: 'periodic', tEnd: 0.3,
    params: { amp: 1, mean: 0 }, exact: 'sine',
    description: 'u0 = mean + amp sin(2 pi x), periodic. Steepens and breaks at t = 1/(2 pi amp) ~ 0.159, then a shock decays the energy.',
  },
  {
    id: 'nwave', name: 'N-wave', domain: [-2, 2], bc: 'transmissive', tEnd: 1.5,
    params: { k: 1, L: 1 }, exact: 'nwave',
    description: 'u0 = k x for |x| < L, else 0. Two shocks at x = +/- L sqrt(1 + k t) with a linear ramp u = k x/(1 + k t) between.',
  },
  {
    id: 'stationary', name: 'Stationary shock', domain: [0, 1], bc: 'transmissive', tEnd: 0.4,
    params: { uL: 1, uR: -1, x0: 0.5 }, exact: 'riemann',
    description: 'u = 1 left, -1 right: the Rankine-Hugoniot speed is 0 and the exact solution never changes. Godunov, Roe and one-step Lax-Wendroff keep it exactly; Richtmyer\'s predictor gives u = 0 at the shock face and the cells beside it grow until the blow-up guard stops the run (even n puts the jump on a face).',
  },
];

export const burgersPreset = (id) => BURGERS_PRESETS.find((p) => p.id === id);

// Breaking time of u0 = mean + amp sin(2 pi x): -1/min(u0') = 1/(2 pi amp).
export const breakingTime = (amp = 1) => 1 / (2 * Math.PI * amp);

// Characteristic map of the unit sine, minus the target y.
const sineFoot = (xi, tau, y) => xi + tau * Math.sin(2 * Math.PI * xi) - y;

// Unit-amplitude, zero-mean sine solution W(y, tau) on the periodic unit
// interval (LeVeque §11.2 and §11.5 for characteristics and breaking, §11.7
// for the equal-area rule). u = sin(2 pi xi) along the characteristic from
// xi, which reaches x = xi + tau sin(2 pi xi). For y in [0, 1/2] the right
// foot is the smallest root xi of that map in [0, 1/2]: up to the first
// turning point the map is monotone, and every characteristic beyond it has
// already entered the shock, which by symmetry stays at y = 1/2. The other
// half follows from u(y) = -u(1 - y). Before breaking this is the unique
// root; after breaking it is the entropy (equal-area) solution.
function sineUnit(y, tau) {
  y -= Math.floor(y);
  if (y > 0.5) return -sineUnit(1 - y, tau);
  if (y === 0 || y === 0.5 || tau <= 0) return Math.sin(2 * Math.PI * y);
  const w = 2 * Math.PI * tau;
  let hi = w <= 1 ? 0.5 : Math.acos(-1 / w) / (2 * Math.PI);
  let lo = 0;
  // Bisection, then Newton polish. The foot map is < 0 at lo and >= 0 at hi
  // by construction.
  for (let it = 0; it < 60; it++) {
    const mid = 0.5 * (lo + hi);
    if (sineFoot(mid, tau, y) < 0) lo = mid; else hi = mid;
    if (hi - lo < 1e-15) break;
  }
  let xi = 0.5 * (lo + hi);
  for (let it = 0; it < 2; it++) {
    const d = 1 + w * Math.cos(2 * Math.PI * xi);
    if (d > 1e-6) xi -= sineFoot(xi, tau, y) / d;
  }
  return Math.sin(2 * Math.PI * xi);
}

// Exact solution for u0 = mean + amp sin(2 pi x) on [0, 1], periodic:
// u(x, t) = mean + amp W(x - mean t, amp t). Valid for all t >= 0 (the shock
// forms at t = breakingTime(amp) at x = 1/2 + mean t).
export function sineExact(x, t, amp = 1, mean = 0) {
  if (amp === 0) return mean;
  // A negative amplitude is the same wave shifted by half a period.
  const shift = amp < 0 ? 0.5 : 0;
  const a = Math.abs(amp);
  return mean + a * sineUnit(x - mean * t + shift, a * t);
}

// Exact N-wave: u0 = k x on |x| < L (k > 0), 0 elsewhere.
export function nwaveExact(x, t, k = 1, L = 1) {
  const s = L * Math.sqrt(1 + k * t);
  return Math.abs(x) < s ? (k * x) / (1 + k * t) : 0;
}

function exactAt(kind, q, x, t) {
  if (kind === 'riemann') {
    if (t <= 0) return x < q.x0 ? q.uL : q.uR;
    return burgersRiemann(q.uL, q.uR, (x - q.x0) / t);
  }
  if (kind === 'sine') return sineExact(x, t, q.amp, q.mean);
  return nwaveExact(x, t, q.k, q.L);
}

// Exact value of a preset at (x, t); params override the preset's defaults.
export function burgersExactValue(presetId, params, x, t) {
  const pr = burgersPreset(presetId);
  return exactAt(pr.exact, { ...pr.params, ...params }, x, t);
}

// ---------------------------------------------------------------------------
// State and stepping.

const NG = 2;

export function createBurgers({
  preset = 'shock', params = {}, n = 200, scheme = 'godunov', limiter = 'minmod',
  riemann = 'godunov', delta = 0, domain = null, bc = null, blowup = 1e3,
} = {}) {
  const pr = burgersPreset(preset);
  if (!pr) throw new Error(`burgers: unknown preset ${preset}`);
  const [xmin, xmax] = domain || pr.domain;
  const state = {
    preset, params: { ...pr.params, ...params },
    n, xmin, xmax, dx: (xmax - xmin) / n, x: centres(xmin, xmax, n),
    bc: bc || pr.bc,
    scheme,       // an id from BURGERS_SCHEMES
    limiter,      // MUSCL slope limiter (an id from LIMITERS)
    riemann,      // MUSCL face flux (an id from RIEMANN_FLUXES)
    delta,        // > 0: fixed Harten width for 'roe-fix'
    blowup,       // failure once |u| > blowup * uRef (0: only non-finite values fail)
    uRef: 0,      // max|u| when the first step is taken
    failure: null,
    t: 0, steps: 0,
    u: new Float64Array(n),
    w: new Float64Array(n + 2 * NG),   // padded copy with ghosts
    F: new Float64Array(n + 1),        // face fluxes
    u1: new Float64Array(n),           // SSP-RK2 stage
    sig: new Float64Array(n + 2 * NG), // MUSCL slopes
  };
  resetBurgers(state);
  return state;
}

// Put the preset's initial data back (cell averages for steps, centre values
// for smooth data), set t = 0 and clear any failure. Returns the state. A
// widget that draws its own initial data into state.u should do so after
// this call: the blow-up bound is taken from u at the first step.
export function resetBurgers(state) {
  const pr = burgersPreset(state.preset);
  const q = state.params, { n, dx, x, u } = state;
  for (let i = 0; i < n; i++) {
    if (pr.exact === 'riemann') {
      const a = x[i] - 0.5 * dx, b = x[i] + 0.5 * dx;
      const fr = Math.min(1, Math.max(0, (q.x0 - a) / (b - a)));
      u[i] = fr * q.uL + (1 - fr) * q.uR;
    } else {
      u[i] = exactAt(pr.exact, q, x[i], 0);
    }
  }
  state.t = 0;
  state.steps = 0;
  state.failure = null;
  return state;
}

// Exact solution of the state's preset at state.t, sampled at cell centres.
export function burgersExact(state, out = new Float64Array(state.n)) {
  const kind = burgersPreset(state.preset).exact;
  for (let i = 0; i < state.n; i++) out[i] = exactAt(kind, state.params, state.x[i], state.t);
  return out;
}

function fillGhosts(state, src) {
  const { n, w, bc } = state;
  for (let i = 0; i < n; i++) w[i + NG] = src[i];
  for (let g = 0; g < NG; g++) {
    if (bc === 'periodic') {
      w[g] = src[n - NG + g];
      w[n + NG + g] = src[g];
    } else {
      w[g] = src[0];
      w[n + NG + g] = src[n - 1];
    }
  }
}

// Face fluxes F[0..n] from the cell values in src.
function computeFluxes(state, src, lam) {
  fillGhosts(state, src);
  const { n, w, F, sig } = state;
  if (state.scheme === 'muscl') {
    for (let k = 1; k < n + 2 * NG - 1; k++) sig[k] = limitSlope(state.limiter, w[k] - w[k - 1], w[k + 1] - w[k]);
    for (let k = 0; k <= n; k++) {
      const uL = w[k + NG - 1] + 0.5 * sig[k + NG - 1];
      const uR = w[k + NG] - 0.5 * sig[k + NG];
      F[k] = burgersFlux(state.riemann, uL, uR, lam, state.delta);
    }
  } else {
    for (let k = 0; k <= n; k++) F[k] = burgersFlux(state.scheme, w[k + NG - 1], w[k + NG], lam, state.delta);
  }
}

// max|u|, or NaN as soon as a NaN is met.
const maxAbs = (u) => {
  let m = 0;
  for (let i = 0; i < u.length; i++) {
    const a = Math.abs(u[i]);
    if (a > m) m = a;
    else if (a !== a) return NaN;
  }
  return m;
};

// The failure guard: the first cell that is non-finite or beyond the
// blow-up bound, recorded once.
function checkBurgers(state) {
  const { n, u } = state;
  const bound = state.blowup > 0 ? state.blowup * state.uRef : Infinity;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(u[i]);
    if (a <= bound && a < Infinity) continue;
    state.failure = {
      cell: i, x: state.x[i], t: state.t, step: state.steps, u: u[i],
      reason: Number.isFinite(u[i]) ? 'blow-up' : 'non-finite',
    };
    return;
  }
}

// Advance the state by dt in place. Returns false (and does nothing) once
// state.failure is set; a step that blows up sets it.
export function stepBurgers(state, dt) {
  if (state.failure) return false;
  const { n, u, F, w, u1 } = state;
  const lam = dt / state.dx;
  if (state.steps === 0) state.uRef = maxAbs(u);
  if (state.scheme === 'upwind-nc') {
    fillGhosts(state, u);
    for (let i = 0; i < n; i++) {
      const c = w[i + NG];
      u[i] = c >= 0 ? c - lam * c * (c - w[i + NG - 1]) : c - lam * c * (w[i + NG + 1] - c);
    }
  } else if (state.scheme === 'muscl') {
    computeFluxes(state, u, lam);
    for (let i = 0; i < n; i++) u1[i] = u[i] - lam * (F[i + 1] - F[i]);
    computeFluxes(state, u1, lam);
    for (let i = 0; i < n; i++) u[i] = 0.5 * u[i] + 0.5 * (u1[i] - lam * (F[i + 1] - F[i]));
  } else {
    computeFluxes(state, u, lam);
    for (let i = 0; i < n; i++) u[i] -= lam * (F[i + 1] - F[i]);
  }
  state.t += dt;
  state.steps++;
  checkBurgers(state);
  return !state.failure;
}

// The default CFL number of a scheme: 0.9 of its cflMax.
export function burgersCfl(scheme) {
  const sc = BURGERS_SCHEMES.find((s) => s.id === scheme);
  return 0.9 * (sc ? sc.cflMax : 1);
}

// Time step from the CFL number nu = max|u| dt/dx. With cfl omitted (or
// null) it uses burgersCfl(state.scheme): 0.9 for the first-order schemes
// and Lax-Wendroff, 0.45 for MUSCL. NaN if the profile holds a non-finite
// value.
export function burgersDt(state, cfl = null) {
  const c = cfl ?? burgersCfl(state.scheme);
  return (c * state.dx) / Math.max(maxAbs(state.u), 1e-12);
}

// Step to exactly tEnd (the last step is shortened), or until a failure.
// Returns the step count.
export function advanceBurgers(state, tEnd, cfl = null, maxSteps = 1e6) {
  let k = 0;
  while (state.t < tEnd - 1e-14 && k < maxSteps && !state.failure) {
    const dt = Math.min(burgersDt(state, cfl), tEnd - state.t);
    if (!(dt > 0)) break;
    stepBurgers(state, dt);
    k++;
  }
  return k;
}

// Integrals the chapter reports: mass sum(u) dx and energy sum(u^2/2) dx.
export const burgersMass = (state) => sum(state.u) * state.dx;
export function burgersEnergy(state) {
  let s = 0;
  for (let i = 0; i < state.n; i++) s += f(state.u[i]);
  return s * state.dx;
}

// Does the profile fall through level between cells j and j+1?
const crossesDown = (u, j, level) => j >= 0 && j + 1 < u.length && u[j] >= level && u[j + 1] < level;

// Shock tracker: the position where the profile falls through `level`
// nearest the steepest drop (largest u[k] - u[k+1]) among cells with
// xa <= x <= xb, interpolated linearly between the two cells. With level
// NaN the midpoint of that steepest pair is used. NaN when there is no
// downward crossing.
export function shockPosition(u, x, level = NaN, xa = -Infinity, xb = Infinity) {
  const n = u.length;
  let k = -1, best = -Infinity;
  for (let i = 0; i + 1 < n; i++) {
    if (x[i] < xa || x[i + 1] > xb) continue;
    const d = u[i] - u[i + 1];
    if (d > best) { best = d; k = i; }
  }
  if (k < 0) return NaN;
  if (Number.isNaN(level)) level = 0.5 * (u[k] + u[k + 1]);
  for (let r = 0; r < n; r++) {
    const j = crossesDown(u, k - r, level) ? k - r : crossesDown(u, k + r, level) ? k + r : -1;
    if (j >= 0) return x[j] + ((u[j] - level) / (u[j] - u[j + 1])) * (x[j + 1] - x[j]);
  }
  return NaN;
}
