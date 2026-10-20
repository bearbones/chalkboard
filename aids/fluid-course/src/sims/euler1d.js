// 1-D Euler equations of an ideal gas: a finite-volume shock-tube solver.
//
// What it does. Advances the conserved variables U = (rho, rho u, E) with
//   U_t + F(U)_x = 0,  F = (rho u, rho u^2 + p, u (E + p)),
//   E = p/(gamma - 1) + rho u^2 / 2,
// by the conservative update
//   U_i <- U_i - (dt/dx) (F[i+1] - F[i])
// with a choice of numerical flux at each face: Lax-Friedrichs, Rusanov,
// HLL, HLLC, Roe (Harten-Hyman entropy fix on or off), Godunov with the exact
// Riemann solver of riemann.js, and Richtmyer's two-step Lax-Wendroff. With
// order = 2 the face states come from MUSCL-Hancock: limited slopes of the
// primitive variables (rho, u, p) and a half-step predictor. A positivity
// check runs after every step and records the first cell and time where
// rho <= 0 or p <= 0 (or a value stops being finite) in state.failure, and
// further steps are refused, so a failing scheme reports where it broke
// instead of filling the plot with NaN.
//
// Conventions. n cells on [xmin, xmax], dx = (xmax - xmin)/n, centres
// x[i] = xmin + (i + 1/2) dx. Arrays are padded with two ghost cells per side
// (padded index i + 2 is cell i); state.rho, state.mom, state.E (conserved)
// and state.u, state.p (velocity, pressure) are views of the n interior
// cells. Face k (k = 0..n) lies between cells k-1 and k. Boundaries:
// 'transmissive' (zero-gradient copy), 'periodic', 'reflective' (mirror with
// the velocity reversed: a closed box). Nondimensional: the presets use the
// usual shock-tube units (rho ~ 1, p ~ 1, gamma = 1.4), in which a = 1.18 is
// the sound speed of the reference gas. The time step comes from the CFL
// number dt = C dx / max_i(|u_i| + a_i) (Toro eq. 6.20); because that bound
// ignores the not-yet-formed shocks of Riemann initial data, eulerDt follows
// Toro (§6.3.2) and caps C at 0.2 for the first five steps. Every flux,
// first order or with MUSCL-Hancock, is stable up to C = 1 (cflMax).
//
// Exact solutions. Riemann presets carry their exact solution in
// state.exact (a riemann.js solution record), recomputed by resetEuler from
// state.L, state.R and state.gamma, so a widget may edit those and reset.
// The smooth presets have closed forms: 'entropy-wave' is advected
// unchanged; 'acoustic-wave' is a simple (isentropic, one-family) sound wave
// rho = 1 + eps sin 2 pi x, p = rho^gamma, u = 2(a - a0)/(gamma - 1), whose
// exact solution before it breaks follows from u + a being constant along
// the C+ characteristics (Toro §3.1.3; LeVeque §14.10-14.12): the state at
// (x, t) is the initial state at the foot xi of x = xi + (u + a)(xi) t,
// found by bisection and Newton. With eps = 0.1 it breaks at t ~ 1.1.
//
// Allocation. stepEuler creates no objects and no arrays; the typed arrays
// are made once in createEuler. (The JS engine may still box some doubles
// passed between functions; the exact-Godunov flux, which runs the Newton
// iteration at every face, is the worst case.)
//
// Sources.
//   E. F. Toro, Riemann Solvers and Numerical Methods for Fluid Dynamics,
//     3rd ed., Springer 2009: §3.1 (equations), §5.3 (LF, Richtmyer LW),
//     §6.3 (Godunov's method, CFL, start-up), §10.3 (HLL), §10.4 (HLLC),
//     §10.5 (wave-speed estimates incl. Davis, Einfeldt and PVRS-based),
//     §10.5.1 (Rusanov), §11.2 (Roe solver for Euler, eqs 11.58-11.70),
//     §11.4.2 (Harten-Hyman entropy fix), §14.4 (MUSCL-Hancock), Tables 4.1,
//     4.3 (tests 1-5) and 10.1 (tests 6-7: isolated contacts).
//   E. F. Toro, M. Spruce and W. Speares, Shock Waves 4 (1994) 25-34 (HLLC).
//   A. Harten, P. D. Lax and B. van Leer, SIAM Rev. 25 (1983) 35-61 (HLL).
//   B. Einfeldt, SIAM J. Numer. Anal. 25 (1988) 294-318; B. Einfeldt, C.-D.
//     Munz, P. L. Roe and B. Sjogreen, J. Comput. Phys. 92 (1991) 273-295
//     (wave speeds; linearised Riemann solvers are not positively conservative,
//     the 123-type problem).
//   P. Batten, N. Clarke, C. Lambert and D. M. Causon, SIAM J. Sci. Comput.
//     18 (1997) 1553-1570 (the S* formula used here).
//   P. L. Roe, J. Comput. Phys. 43 (1981) 357-372. A. Harten and J. M. Hyman,
//     J. Comput. Phys. 50 (1983) 235-269.
//   B. van Leer, SIAM J. Sci. Stat. Comput. 5 (1984) 1-20 (MUSCL-Hancock).
//   G. A. Sod, J. Comput. Phys. 27 (1978) 1-31. P. Woodward and P. Colella,
//     J. Comput. Phys. 54 (1984) 115-173 (blast wave). C.-W. Shu and S. Osher,
//     J. Comput. Phys. 83 (1989) 32-78 (shock-entropy interaction).
//   S. Jin and J.-G. Liu, J. Comput. Phys. 126 (1996) 373-389; M. Arora and
//     P. L. Roe, J. Comput. Phys. 130 (1997) 25-40; J. J. Quirk, Int. J.
//     Numer. Methods Fluids 18 (1994) 555-574 (post-shock oscillations of
//     slowly moving shocks).
//   R. J. LeVeque, Finite Volume Methods for Hyperbolic Problems, CUP 2002,
//     ch. 14-15 (gas dynamics, approximate Riemann solvers).
//
// Deviations from the textbook forms.
//   - MUSCL-Hancock works in primitive variables: the slopes of (rho, u, p)
//     are limited component by component and the half-step predictor uses the
//     primitive quasi-linear matrix, W -= (dt/2dx) A(W) dW (Toro §14.4 notes
//     both forms). If a predicted face state has rho <= 0 or p <= 0 the cell
//     falls back to a zero slope (first order there), a common safeguard.
//   - HLL and HLLC use Einfeldt's wave-speed bounds by default
//     (S_L = min(u_L - a_L, u~ - a~), S_R = max(u_R + a_R, u~ + a~) with Roe
//     averages ~); 'davis' and 'pvrs' (Toro §10.5.2) are options.
//   - Roe's entropy fix is the Harten-Hyman split of a transonic 1- or
//     3-wave (Toro §11.4.2). It needs the Roe intermediate state; if that
//     state is unphysical (rho* <= 0 or p* <= 0, as in the 123 problem) the
//     fix cannot be evaluated and the plain Roe flux is used.
//   - 'lw' (Richtmyer) and 'lf' always use the cell values, never the
//     MUSCL-Hancock states, so order = 2 does not change them.

import { centres } from './util.js';
import { GAMMA, TORO_TESTS, makeRiemannSolution, riemannInto, sampleRiemann, riemannProfile } from './riemann.js';
import { limitSlope } from './burgers.js';

// Stability: every flux is stable for S_max dt/dx <= 1 (Toro §6.3.2 for
// Godunov-type schemes, §5.3 for LF and Richtmyer, §14.4 for MUSCL-Hancock;
// the 'Euler CFL limit' test measures it); cflMax holds that number.
const CFL1 = 'S_max dt/dx <= 1, S_max = max(|u| + a) (also with MUSCL-Hancock, order 2)';

export const EULER_FLUXES = [
  {
    id: 'godunov', name: 'Godunov (exact Riemann)', order: 1, holdsContact: true, cflMax: 1, stability: CFL1,
    tex: 'F_{i+1/2} = F\\big(W^{*}(0; W_i, W_{i+1})\\big)',
    description: 'Flux of the exact Riemann solution at x/t = 0, found by Newton iteration at every face. The reference first-order scheme.',
  },
  {
    id: 'lf', name: 'Lax-Friedrichs', order: 1, holdsContact: false, cflMax: 1, stability: 'S_max dt/dx <= 1 (order 2 does not apply: always first order)',
    tex: 'F = \\tfrac12(F_L + F_R) - \\frac{\\Delta x}{2\\Delta t}(U_R - U_L)',
    description: 'Maximal viscosity dx^2/(2 dt). Very robust and very diffusive.',
  },
  {
    id: 'rusanov', name: 'Rusanov', order: 1, holdsContact: false, cflMax: 1, stability: CFL1,
    tex: 'F = \\tfrac12(F_L + F_R) - \\tfrac12 S_{\\max}(U_R - U_L),\\quad S_{\\max} = \\max(|u_L| + a_L, |u_R| + a_R)',
    description: 'Local Lax-Friedrichs: one wave speed for all three fields. Robust, smears contacts badly.',
  },
  {
    id: 'hll', name: 'HLL', order: 1, holdsContact: false, cflMax: 1, stability: CFL1,
    tex: 'F = \\frac{S_R F_L - S_L F_R + S_L S_R (U_R - U_L)}{S_R - S_L}',
    description: 'Two waves bound the fan; one averaged state between them. Positively conservative with Einfeldt speeds, but blind to the contact.',
  },
  {
    id: 'hllc', name: 'HLLC', order: 1, holdsContact: true, cflMax: 1, stability: CFL1,
    tex: 'S_{*} = \\frac{p_R - p_L + \\rho_L u_L (S_L - u_L) - \\rho_R u_R (S_R - u_R)}{\\rho_L (S_L - u_L) - \\rho_R (S_R - u_R)}',
    description: 'HLL with the contact restored (Toro, Spruce and Speares 1994): two star states separated by S*. Resolves an isolated contact exactly.',
  },
  {
    id: 'roe', name: 'Roe', order: 1, holdsContact: true, cflMax: 1, stability: CFL1,
    tex: 'F = \\tfrac12(F_L + F_R) - \\tfrac12\\sum_{k=1}^{3} |\\tilde\\lambda_k|\\,\\tilde\\alpha_k \\tilde{\\mathbf{K}}_k',
    description: 'Exact solution of the linearised problem at Roe averages. Sharp; without an entropy fix it admits expansion shocks at sonic points, and it is not positively conservative: in near-vacuum expansions such as the 123 problem it drives the pressure (internal energy) negative, with or without the fix (Einfeldt et al. 1991).',
  },
  {
    id: 'lw', name: 'Lax-Wendroff (Richtmyer)', order: 2, holdsContact: false, cflMax: 1, stability: 'S_max dt/dx <= 1 (order 2 does not apply: Richtmyer is already second order)',
    tex: 'U_{i+1/2}^{n+1/2} = \\tfrac12(U_i + U_{i+1}) - \\frac{\\Delta t}{2\\Delta x}(F_{i+1} - F_i),\\quad F_{i+1/2} = F(U_{i+1/2}^{n+1/2})',
    description: 'Second order, centred, no limiter: overshoots and rings at shocks and contacts.',
  },
];

export const WAVE_SPEEDS = [
  {
    id: 'einfeldt', name: 'Einfeldt (Roe-averaged)',
    tex: 'S_L = \\min(u_L - a_L,\\ \\tilde u - \\tilde a),\\quad S_R = \\max(u_R + a_R,\\ \\tilde u + \\tilde a)',
    description: 'S_L = min(u_L - a_L, u~ - a~), S_R = max(u_R + a_R, u~ + a~) with Roe averages ~. Positively conservative HLL (HLLE).',
  },
  {
    id: 'davis', name: 'Davis',
    tex: 'S_L = \\min(u_L - a_L,\\ u_R - a_R),\\quad S_R = \\max(u_L + a_L,\\ u_R + a_R)',
    description: 'S_L = min(u_L - a_L, u_R - a_R), S_R = max(u_L + a_L, u_R + a_R).',
  },
  {
    id: 'pvrs', name: 'Pressure-based (PVRS)',
    tex: 'S_L = u_L - a_L q_L,\\ S_R = u_R + a_R q_R,\\quad q_K = \\begin{cases} 1 & p_{PV} \\le p_K \\\\ \\sqrt{1 + \\frac{\\gamma + 1}{2\\gamma}\\left(\\frac{p_{PV}}{p_K} - 1\\right)} & p_{PV} > p_K \\end{cases}',
    description: 'Toro §10.5.2: shock-speed estimates from the linearised (PVRS) star pressure p_PV.',
  },
];

// ---------------------------------------------------------------------------
// Test problems.

// Exact single shock of Mach number M moving at speed S into the gas
// (rho_R, p_R) on its right: the post-shock left state from the
// Rankine-Hugoniot conditions (Toro §3.1.3).
export function shockStates(M, S, rhoR = 1, pR = 1, gamma = GAMMA) {
  const aR = Math.sqrt((gamma * pR) / rhoR);
  const uR = S - M * aR;
  const rr = ((gamma + 1) * M * M) / ((gamma - 1) * M * M + 2);
  const pr = (2 * gamma * M * M - (gamma - 1)) / (gamma + 1);
  const rhoL = rhoR * rr;
  return { L: { rho: rhoL, u: S + (uR - S) / rr, p: pR * pr }, R: { rho: rhoR, u: uR, p: pR } };
}

const toro = (id) => TORO_TESTS.find((t) => t.id === id);
const slow = shockStates(3, -3.44 + 3 * Math.sqrt(1.4));

// ---- The simple sound wave (preset 'acoustic-wave').
// Initial data: rho = 1 + eps sin 2 pi x, p = rho^gamma (entropy p/rho^gamma
// = 1 everywhere), a = sqrt(gamma) rho^((gamma-1)/2), and the left-moving
// Riemann invariant u - 2a/(gamma-1) fixed at -2 a0/(gamma-1), a0 = sqrt(gamma):
// a right-going simple wave whose every state moves at c = u + a.
export const ACOUSTIC_EPS = 0.1;

function simpleWaveState(xi, eps, g, out) {
  const rho = 1 + eps * Math.sin(2 * Math.PI * xi);
  const a0 = Math.sqrt(g), a = a0 * Math.pow(rho, 0.5 * (g - 1));
  out.rho = rho;
  out.u = (2 * (a - a0)) / (g - 1);
  out.p = Math.pow(rho, g);
  return out;
}

// Characteristic speed c = u + a at the foot xi, and dc/dxi.
const SW = { rho: 0, u: 0, p: 0 };
function simpleWaveSpeed(xi, eps, g) {
  simpleWaveState(xi, eps, g, SW);
  return SW.u + Math.sqrt((g * SW.p) / SW.rho);
}
function simpleWaveSpeedSlope(xi, eps, g) {
  const rho = 1 + eps * Math.sin(2 * Math.PI * xi);
  return 0.5 * (g + 1) * Math.sqrt(g) * Math.pow(rho, 0.5 * (g - 3)) * 2 * Math.PI * eps * Math.cos(2 * Math.PI * xi);
}

// Exact state of the simple wave at (x, t), valid before it breaks: solve
// G(xi) = xi + c(xi) t - x = 0, which is increasing in xi until the
// breaking time, bracketed by xi in [x - c_max t, x - c_min t].
export function simpleWaveExact(x, t, out = { rho: 0, u: 0, p: 0 }, gamma = GAMMA, eps = ACOUSTIC_EPS) {
  const g = gamma;
  const cmin = simpleWaveSpeed(0.75, eps, g), cmax = simpleWaveSpeed(0.25, eps, g);
  let lo = x - cmax * t, hi = x - cmin * t;
  for (let it = 0; it < 60 && hi - lo > 1e-15; it++) {
    const mid = 0.5 * (lo + hi);
    if (mid + simpleWaveSpeed(mid, eps, g) * t - x < 0) lo = mid; else hi = mid;
  }
  let xi = 0.5 * (lo + hi);
  for (let it = 0; it < 2; it++) {
    const d = 1 + simpleWaveSpeedSlope(xi, eps, g) * t;
    if (d > 1e-6) xi -= (xi + simpleWaveSpeed(xi, eps, g) * t - x) / d;
  }
  return simpleWaveState(xi, eps, g, out);
}

// Breaking time of the simple wave: 1 / max(-dc/dxi), by sampling the foot.
export function simpleWaveBreakingTime(gamma = GAMMA, eps = ACOUSTIC_EPS) {
  let m = 0;
  for (let k = 0; k < 4096; k++) m = Math.max(m, -simpleWaveSpeedSlope(k / 4096, eps, gamma));
  return 1 / m;
}

export const EULER_PRESETS = [
  {
    id: 'sod', name: 'Sod shock tube (Toro test 1)', domain: [0, 1], x0: 0.5, tEnd: 0.25, n: 200,
    L: toro('test1').L, R: toro('test1').R, exact: true,
    description: 'Rarefaction, contact and shock. Every scheme should get this right; the differences are in how sharp the contact and shock are.',
  },
  {
    id: 'sod-sonic', name: 'Sod with a sonic rarefaction (Toro ch. 6 test 1)', domain: [0, 1], x0: 0.3, tEnd: 0.2, n: 100,
    L: { rho: 1, u: 0.75, p: 1 }, R: { rho: 0.125, u: 0, p: 0.1 }, exact: true,
    description: 'Sod with u_L = 0.75 so the left rarefaction straddles u - a = 0. Roe without an entropy fix leaves a small jump (an expansion shock) at the sonic point.',
  },
  {
    id: '123', name: '123 problem (Toro test 2)', domain: [0, 1], x0: 0.5, tEnd: 0.15, n: 100,
    L: toro('test2').L, R: toro('test2').R, exact: true,
    description: 'Two strong rarefactions pull the middle towards vacuum (p* = 0.0019). Roe\'s linearised star state drives the pressure at the centre negative on the third step (rho ~ 0.6, p ~ -0.11 on 100 cells), with or without the entropy fix; HLL with Einfeldt speeds stays positive.',
  },
  {
    id: 'blast-left', name: 'Left half of the blast wave (Toro test 3)', domain: [0, 1], x0: 0.5, tEnd: 0.012, n: 200,
    L: toro('test3').L, R: toro('test3').R, exact: true,
    description: 'Pressure ratio 1e5: a strong shock followed closely by a contact, a thin dense shell that every first-order scheme under-resolves.',
  },
  {
    id: 'blast-right', name: 'Right half of the blast wave (Toro test 4)', domain: [0, 1], x0: 0.5, tEnd: 0.035, n: 200,
    L: toro('test4').L, R: toro('test4').R, exact: true,
    description: 'Mirror image of test 3 at one tenth of the pressure.',
  },
  {
    id: 'collision', name: 'Two colliding shocks (Toro test 5)', domain: [0, 1], x0: 0.5, tEnd: 0.035, n: 200,
    L: toro('test5').L, R: toro('test5').R, exact: true,
    description: 'The shocks of tests 3 and 4 collide: two shocks and a slowly moving contact.',
  },
  {
    id: 'contact', name: 'Stationary contact (Toro test 6)', domain: [0, 1], x0: 0.5, tEnd: 2, n: 100,
    L: { rho: 1.4, u: 0, p: 1 }, R: { rho: 1, u: 0, p: 1 }, exact: true,
    description: 'An isolated contact at rest: the exact solution never changes. HLLC, Roe and Godunov keep it exactly; HLL, Rusanov and LF smear it.',
  },
  {
    id: 'slow-shock', name: 'Slowly moving shock', domain: [0, 1], x0: 0.2, tEnd: 2.5, n: 200,
    L: slow.L, R: slow.R, exact: true,
    description: 'A Mach 3 shock moving at S = 0.11 (data of the kind used by Jin and Liu 1996 and Arora and Roe 1997: rho 3.86/1, u -0.81/-3.44, p 10.33/1). First-order Godunov-type schemes leave long-wavelength oscillations in the momentum behind it.',
  },
  {
    id: 'shu-osher', name: 'Shu-Osher shock-entropy interaction', domain: [-5, 5], x0: -4, tEnd: 1.8, n: 400,
    L: { rho: 3.857143, u: 2.629369, p: 10.33333 }, R: null, exact: false,
    init: (x) => (x < -4 ? { rho: 3.857143, u: 2.629369, p: 10.33333 } : { rho: 1 + 0.2 * Math.sin(5 * x), u: 0, p: 1 }),
    reference: 'No exact solution. The reference is a fine-grid run (MUSCL-Hancock, HLLC, MC limiter, n = 3200), computed with eulerReference().',
    description: 'A Mach 3 shock runs into a sinusoidal density field and leaves high-frequency entropy waves behind it. A test of resolution, not of exactness (Shu and Osher 1989).',
  },
  {
    id: 'entropy-wave', name: 'Smooth entropy wave', domain: [0, 1], x0: 0, tEnd: 1, n: 100, bc: 'periodic',
    L: null, R: null, exact: true,
    init: (x) => ({ rho: 1 + 0.2 * Math.sin(2 * Math.PI * x), u: 1, p: 1 }),
    exactAt: (x, t, out) => { out.rho = 1 + 0.2 * Math.sin(2 * Math.PI * (x - t)); out.u = 1; out.p = 1; return out; },
    description: 'A density sine carried by uniform flow (u = 1, p = 1) round a periodic box. Only the contact field moves (u and p are constant), so it measures the order of accuracy of the density update alone. One period at t = 1.',
  },
  {
    id: 'acoustic-wave', name: 'Smooth sound wave (simple wave)', domain: [0, 1], x0: 0, tEnd: 0.4, n: 100, bc: 'periodic',
    L: null, R: null, exact: true,
    init: (x, gamma = GAMMA) => simpleWaveState(x, ACOUSTIC_EPS, gamma, { rho: 0, u: 0, p: 0 }),
    exactAt: (x, t, out, gamma = GAMMA) => simpleWaveExact(x, t, out, gamma, ACOUSTIC_EPS),
    description: 'A right-going sound wave of amplitude 10% (rho = 1 + 0.1 sin 2 pi x, isentropic, one Riemann invariant constant) round a periodic box. Density, velocity and pressure all vary, so it tests the coupled update, including every term of the MUSCL-Hancock predictor. Its crests outrun its troughs and it steepens: exact solution by characteristics until it breaks at t ~ 1.12.',
  },
];

export const eulerPreset = (id) => EULER_PRESETS.find((p) => p.id === id);

// ---------------------------------------------------------------------------
// State.

const NG = 2;

export function createEuler({
  preset = 'sod', n = 0, flux = 'hllc', order = 1, limiter = 'minmod', entropyFix = false,
  waveSpeeds = 'einfeldt', gamma = GAMMA, bc = null, domain = null, L = null, R = null, x0 = null,
} = {}) {
  const pr = eulerPreset(preset);
  if (!pr) throw new Error(`euler1d: unknown preset ${preset}`);
  n = n || pr.n;
  const [xmin, xmax] = domain || pr.domain;
  const N = n + 2 * NG;
  const arr = () => new Float64Array(N);
  const state = {
    preset, n, xmin, xmax, dx: (xmax - xmin) / n, x: centres(xmin, xmax, n), gamma,
    bc: bc || pr.bc || 'transmissive',
    flux,          // an id from EULER_FLUXES
    order,         // 1 or 2 (MUSCL-Hancock)
    limiter,       // an id from LIMITERS in burgers.js
    entropyFix,    // Roe only: Harten-Hyman fix on/off
    waveSpeeds,    // HLL/HLLC: an id from WAVE_SPEEDS
    L: L || pr.L, R: R || pr.R, x0: x0 ?? pr.x0,
    t: 0, steps: 0, failure: null,
    q0: arr(), q1: arr(), q2: arr(),           // conserved, padded
    w0: arr(), w1: arr(), w2: arr(),           // primitive rho, u, p, padded
    bl0: arr(), bl1: arr(), bl2: arr(),        // MUSCL-Hancock left-face states
    br0: arr(), br1: arr(), br2: arr(),        // MUSCL-Hancock right-face states
    F0: new Float64Array(n + 1), F1: new Float64Array(n + 1), F2: new Float64Array(n + 1),
    exact: null,
  };
  state.padded = [state.q0, state.q1, state.q2, state.w0, state.w1, state.w2];
  state.rho = state.q0.subarray(NG, NG + n);
  state.mom = state.q1.subarray(NG, NG + n);
  state.E = state.q2.subarray(NG, NG + n);
  state.u = state.w1.subarray(NG, NG + n);
  state.p = state.w2.subarray(NG, NG + n);
  resetEuler(state);
  return state;
}

function setCell(state, i, rho, u, p) {
  const k = i + NG, g = state.gamma;
  state.q0[k] = rho;
  state.q1[k] = rho * u;
  state.q2[k] = p / (g - 1) + 0.5 * rho * u * u;
}

// Initial data: Riemann data are cell averages of the conserved variables
// (only the cell containing x0 is mixed); presets with init(x, gamma)
// ('shu-osher', 'entropy-wave', 'acoustic-wave') are sampled at cell
// centres. The exact Riemann solution (state.exact) is recomputed from the
// current state.L, state.R and state.gamma, so a widget can edit those (or
// x0) and call resetEuler. Returns the state.
export function resetEuler(state) {
  const pr = eulerPreset(state.preset), { n, dx, x, L, R, x0, gamma: g } = state;
  state.exact = pr.exact && !pr.init && L && R
    ? riemannInto(state.exact || makeRiemannSolution(), L.rho, L.u, L.p, R.rho, R.u, R.p, g)
    : null;
  for (let i = 0; i < n; i++) {
    if (pr.init) {
      const W = pr.init(x[i], g);
      setCell(state, i, W.rho, W.u, W.p);
      continue;
    }
    const fr = Math.min(1, Math.max(0, (x0 - (x[i] - 0.5 * dx)) / dx));
    const k = i + NG;
    state.q0[k] = fr * L.rho + (1 - fr) * R.rho;
    state.q1[k] = fr * L.rho * L.u + (1 - fr) * R.rho * R.u;
    state.q2[k] = fr * (L.p / (g - 1) + 0.5 * L.rho * L.u * L.u) + (1 - fr) * (R.p / (g - 1) + 0.5 * R.rho * R.u * R.u);
  }
  state.t = 0;
  state.steps = 0;
  state.failure = null;
  primitivesAndCheck(state);
  return state;
}

// Primitive variables of the interior cells, then the positivity check.
function primitivesAndCheck(state) {
  const { n, q0, q1, q2, w0, w1, w2, gamma: g } = state;
  for (let i = NG; i < n + NG; i++) {
    const r = q0[i], u = q1[i] / r, p = (g - 1) * (q2[i] - 0.5 * q1[i] * u);
    w0[i] = r; w1[i] = u; w2[i] = p;
    if (!(r > 0) || !(p > 0) || !Number.isFinite(u)) {
      if (!state.failure) {
        state.failure = {
          cell: i - NG, x: state.x[i - NG], t: state.t, step: state.steps, rho: r, u, p,
          reason: !(r > 0) ? 'density <= 0' : !(p > 0) ? 'pressure <= 0' : 'non-finite velocity',
        };
      }
    }
  }
}

function fillGhosts(state) {
  const { n, bc, padded } = state;
  for (let a = 0; a < 6; a++) {
    const q = padded[a];
    const flip = bc === 'reflective' && (a === 1 || a === 4) ? -1 : 1;
    for (let g = 0; g < NG; g++) {
      if (bc === 'periodic') {
        q[g] = q[n + g];
        q[n + NG + g] = q[NG + g];
      } else if (bc === 'reflective') {
        q[NG - 1 - g] = flip * q[NG + g];
        q[n + NG + g] = flip * q[n + NG - 1 - g];
      } else {
        q[g] = q[NG];
        q[n + NG + g] = q[n + NG - 1];
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Numerical fluxes. Each takes left/right primitive states and writes the
// three flux components into OUT.

const OUT = new Float64Array(3);
const RS = makeRiemannSolution();
const SMP = { rho: 0, u: 0, p: 0, region: '' };
let SL = 0, SR = 0;

function waveSpeeds(kind, rL, uL, pL, aL, rR, uR, pR, aR, g) {
  if (kind === 'davis') {
    SL = Math.min(uL - aL, uR - aR);
    SR = Math.max(uL + aL, uR + aR);
  } else if (kind === 'pvrs') {
    const ppv = Math.max(0, 0.5 * (pL + pR) - 0.125 * (uR - uL) * (rL + rR) * (aL + aR));
    const z = (g + 1) / (2 * g);
    const qL = ppv <= pL ? 1 : Math.sqrt(1 + z * (ppv / pL - 1));
    const qR = ppv <= pR ? 1 : Math.sqrt(1 + z * (ppv / pR - 1));
    SL = uL - aL * qL;
    SR = uR + aR * qR;
  } else {
    const sL = Math.sqrt(rL), sR = Math.sqrt(rR);
    const HL = (pL / (g - 1) + 0.5 * rL * uL * uL + pL) / rL;
    const HR = (pR / (g - 1) + 0.5 * rR * uR * uR + pR) / rR;
    const ut = (sL * uL + sR * uR) / (sL + sR);
    const Ht = (sL * HL + sR * HR) / (sL + sR);
    const at = Math.sqrt(Math.max(0, (g - 1) * (Ht - 0.5 * ut * ut)));
    SL = Math.min(uL - aL, ut - at);
    SR = Math.max(uR + aR, ut + at);
  }
}

// One face flux. lam = dt/dx (LF and LW need it).
export function eulerFlux(id, rL, uL, pL, rR, uR, pR, g, lam, opts, out = OUT) {
  const EL = pL / (g - 1) + 0.5 * rL * uL * uL;
  const ER = pR / (g - 1) + 0.5 * rR * uR * uR;
  const fL0 = rL * uL, fL1 = rL * uL * uL + pL, fL2 = uL * (EL + pL);
  const fR0 = rR * uR, fR1 = rR * uR * uR + pR, fR2 = uR * (ER + pR);
  const d0 = rR - rL, d1 = rR * uR - rL * uL, d2 = ER - EL;
  switch (id) {
    case 'lf': {
      const c = 0.5 / lam;
      out[0] = 0.5 * (fL0 + fR0) - c * d0;
      out[1] = 0.5 * (fL1 + fR1) - c * d1;
      out[2] = 0.5 * (fL2 + fR2) - c * d2;
      return out;
    }
    case 'rusanov': {
      const aL = Math.sqrt((g * pL) / rL), aR = Math.sqrt((g * pR) / rR);
      const s = Math.max(Math.abs(uL) + aL, Math.abs(uR) + aR);
      out[0] = 0.5 * (fL0 + fR0 - s * d0);
      out[1] = 0.5 * (fL1 + fR1 - s * d1);
      out[2] = 0.5 * (fL2 + fR2 - s * d2);
      return out;
    }
    case 'hll':
    case 'hllc': {
      const aL = Math.sqrt((g * pL) / rL), aR = Math.sqrt((g * pR) / rR);
      waveSpeeds(opts?.waveSpeeds || 'einfeldt', rL, uL, pL, aL, rR, uR, pR, aR, g);
      if (SL >= 0) { out[0] = fL0; out[1] = fL1; out[2] = fL2; return out; }
      if (SR <= 0) { out[0] = fR0; out[1] = fR1; out[2] = fR2; return out; }
      if (id === 'hll') {
        const c = 1 / (SR - SL);
        out[0] = (SR * fL0 - SL * fR0 + SL * SR * d0) * c;
        out[1] = (SR * fL1 - SL * fR1 + SL * SR * d1) * c;
        out[2] = (SR * fL2 - SL * fR2 + SL * SR * d2) * c;
        return out;
      }
      const mL = rL * (SL - uL), mR = rR * (SR - uR);
      const Ss = (pR - pL + uL * mL - uR * mR) / (mL - mR);
      if (Ss >= 0) {
        const c = mL / (SL - Ss);
        out[0] = fL0 + SL * (c - rL);
        out[1] = fL1 + SL * (c * Ss - rL * uL);
        out[2] = fL2 + SL * (c * (EL / rL + (Ss - uL) * (Ss + pL / mL)) - EL);
      } else {
        const c = mR / (SR - Ss);
        out[0] = fR0 + SR * (c - rR);
        out[1] = fR1 + SR * (c * Ss - rR * uR);
        out[2] = fR2 + SR * (c * (ER / rR + (Ss - uR) * (Ss + pR / mR)) - ER);
      }
      return out;
    }
    case 'roe': {
      const sL = Math.sqrt(rL), sR = Math.sqrt(rR);
      const HL = (EL + pL) / rL, HR = (ER + pR) / rR;
      const ut = (sL * uL + sR * uR) / (sL + sR);
      const Ht = (sL * HL + sR * HR) / (sL + sR);
      const at2 = (g - 1) * (Ht - 0.5 * ut * ut);
      const at = Math.sqrt(at2);
      // wave strengths (Toro eqs 11.68-11.70)
      const a2 = ((g - 1) / at2) * (d0 * (Ht - ut * ut) + ut * d1 - d2);
      const a1 = (d0 * (ut + at) - d1 - at * a2) / (2 * at);
      const a3 = d0 - (a1 + a2);
      const l1 = ut - at, l2 = ut, l3 = ut + at;
      if (opts?.entropyFix) {
        // Harten-Hyman (Toro §11.4.2): split a transonic 1- or 3-rarefaction.
        const aL = Math.sqrt((g * pL) / rL), aR = Math.sqrt((g * pR) / rR);
        const rsL = rL + a1, msL = rL * uL + a1 * l1, EsL = EL + a1 * (Ht - ut * at);
        const usL = msL / rsL, psL = (g - 1) * (EsL - 0.5 * msL * usL);
        if (rsL > 0 && psL > 0) {
          const lamL = uL - aL, lamR = usL - Math.sqrt((g * psL) / rsL);
          if (lamL < 0 && lamR > 0) {
            const lb = (lamL * (lamR - l1)) / (lamR - lamL);
            out[0] = fL0 + lb * a1;
            out[1] = fL1 + lb * a1 * l1;
            out[2] = fL2 + lb * a1 * (Ht - ut * at);
            return out;
          }
        }
        const rsR = rR - a3, msR = rR * uR - a3 * l3, EsR = ER - a3 * (Ht + ut * at);
        const usR = msR / rsR, psR = (g - 1) * (EsR - 0.5 * msR * usR);
        if (rsR > 0 && psR > 0) {
          const lamL = usR + Math.sqrt((g * psR) / rsR), lamR = uR + aR;
          if (lamL < 0 && lamR > 0) {
            const lb = (lamR * (l3 - lamL)) / (lamR - lamL);
            out[0] = fR0 - lb * a3;
            out[1] = fR1 - lb * a3 * l3;
            out[2] = fR2 - lb * a3 * (Ht + ut * at);
            return out;
          }
        }
      }
      const c1 = Math.abs(l1) * a1, c2 = Math.abs(l2) * a2, c3 = Math.abs(l3) * a3;
      out[0] = 0.5 * (fL0 + fR0 - (c1 + c2 + c3));
      out[1] = 0.5 * (fL1 + fR1 - (c1 * l1 + c2 * l2 + c3 * l3));
      out[2] = 0.5 * (fL2 + fR2 - (c1 * (Ht - ut * at) + c2 * 0.5 * ut * ut + c3 * (Ht + ut * at)));
      return out;
    }
    case 'lw': {
      const r = 0.5 * (rL + rR) - 0.5 * lam * (fR0 - fL0);
      const m = 0.5 * (rL * uL + rR * uR) - 0.5 * lam * (fR1 - fL1);
      const E = 0.5 * (EL + ER) - 0.5 * lam * (fR2 - fL2);
      const u = m / r, p = (g - 1) * (E - 0.5 * m * u);
      out[0] = m;
      out[1] = m * u + p;
      out[2] = u * (E + p);
      return out;
    }
    case 'godunov': {
      riemannInto(RS, rL, uL, pL, rR, uR, pR, g);
      sampleRiemann(RS, 0, SMP);
      const { rho, u, p } = SMP;
      const E = p / (g - 1) + 0.5 * rho * u * u;
      out[0] = rho * u;
      out[1] = rho * u * u + p;
      out[2] = u * (E + p);
      return out;
    }
    default:
      throw new Error(`euler1d: unknown flux ${id}`);
  }
}

// MUSCL-Hancock face states for padded cells 1..n+2 (Toro §14.4, primitive
// form): limited slopes, boundary-extrapolated values, half-step predictor.
function musclHancock(state, lam) {
  const { n, w0, w1, w2, bl0, bl1, bl2, br0, br1, br2, limiter, gamma: g } = state;
  for (let i = 1; i <= n + 2; i++) {
    const r = w0[i], u = w1[i], p = w2[i];
    let dr = limitSlope(limiter, r - w0[i - 1], w0[i + 1] - r);
    let du = limitSlope(limiter, u - w1[i - 1], w1[i + 1] - u);
    let dp = limitSlope(limiter, p - w2[i - 1], w2[i + 1] - p);
    // predictor: W -= (dt/2dx) A(W) dW
    let er = 0.5 * lam * (u * dr + r * du);
    let eu = 0.5 * lam * (u * du + dp / r);
    let ep = 0.5 * lam * (g * p * du + u * dp);
    let lr = r - 0.5 * dr - er, lp = p - 0.5 * dp - ep;
    let rr = r + 0.5 * dr - er, rp = p + 0.5 * dp - ep;
    if (!(lr > 0 && rr > 0 && lp > 0 && rp > 0)) {
      dr = du = dp = er = eu = ep = 0;
      lr = rr = r; lp = rp = p;
    }
    bl0[i] = lr; bl1[i] = u - 0.5 * du - eu; bl2[i] = lp;
    br0[i] = rr; br1[i] = u + 0.5 * du - eu; br2[i] = rp;
  }
}

// Advance by dt in place. Returns false (and does nothing) once
// state.failure is set; a step that makes rho or p non-positive sets it.
export function stepEuler(state, dt) {
  if (state.failure) return false;
  const { n, gamma: g, flux, F0, F1, F2, q0, q1, q2 } = state;
  const lam = dt / state.dx;
  fillGhosts(state);
  const recon = state.order === 2 && flux !== 'lw' && flux !== 'lf';
  if (recon) musclHancock(state, lam);
  const A0 = recon ? state.br0 : state.w0, A1 = recon ? state.br1 : state.w1, A2 = recon ? state.br2 : state.w2;
  const B0 = recon ? state.bl0 : state.w0, B1 = recon ? state.bl1 : state.w1, B2 = recon ? state.bl2 : state.w2;
  for (let k = 0; k <= n; k++) {
    const a = k + NG - 1, b = k + NG;
    eulerFlux(flux, A0[a], A1[a], A2[a], B0[b], B1[b], B2[b], g, lam, state, OUT);
    F0[k] = OUT[0]; F1[k] = OUT[1]; F2[k] = OUT[2];
  }
  for (let i = 0; i < n; i++) {
    const k = i + NG;
    q0[k] -= lam * (F0[i + 1] - F0[i]);
    q1[k] -= lam * (F1[i + 1] - F1[i]);
    q2[k] -= lam * (F2[i + 1] - F2[i]);
  }
  state.t += dt;
  state.steps++;
  primitivesAndCheck(state);
  return !state.failure;
}

// CFL time step: dt = C dx / max(|u| + a), with C capped at 0.2 for the
// first five steps (Toro §6.3.2) unless startup is false.
export function eulerDt(state, cfl = 0.9, startup = true) {
  const { n, w0, w1, w2, gamma: g } = state;
  let s = 0;
  for (let i = NG; i < n + NG; i++) {
    const v = Math.abs(w1[i]) + Math.sqrt((g * w2[i]) / w0[i]);
    if (v > s) s = v;
  }
  const c = startup && state.steps < 5 ? Math.min(cfl, 0.2) : cfl;
  return (c * state.dx) / s;
}

// Step to exactly tEnd (or until a failure). Returns the number of steps.
export function advanceEuler(state, tEnd, cfl = 0.9, maxSteps = 1e6) {
  let k = 0;
  while (state.t < tEnd - 1e-14 && k < maxSteps && !state.failure) {
    const dt = Math.min(eulerDt(state, cfl), tEnd - state.t);
    if (!(dt > 0)) break;
    stepEuler(state, dt);
    k++;
  }
  return k;
}

// The same loop as a generator for long runs that a widget slices across
// frames (sliced() in the kit): yields { t: 'iter', k, time, dt } per step.
export function* runEuler(state, tEnd, cfl = 0.9) {
  let k = 0;
  while (state.t < tEnd - 1e-14 && !state.failure) {
    const dt = Math.min(eulerDt(state, cfl), tEnd - state.t);
    stepEuler(state, dt);
    k++;
    yield { t: 'iter', k, time: state.t, dt };
  }
  return state;
}

// Fine-grid reference for presets without an exact solution (Shu-Osher):
// MUSCL-Hancock + HLLC + MC limiter on n cells, run to the preset's tEnd. A
// generator so a widget can slice it; drain() it in node.
export function* eulerReference(presetId = 'shu-osher', n = 3200, cfl = 0.8) {
  const pr = eulerPreset(presetId);
  const ref = createEuler({ preset: presetId, n, flux: 'hllc', order: 2, limiter: 'mc' });
  yield* runEuler(ref, pr.tEnd, cfl);
  return ref;
}

// Totals (sum of U dx) of mass, momentum and energy over the interior.
export function eulerTotals(state, out = { mass: 0, momentum: 0, energy: 0 }) {
  let m = 0, p = 0, e = 0;
  for (let i = 0; i < state.n; i++) { m += state.rho[i]; p += state.mom[i]; e += state.E[i]; }
  out.mass = m * state.dx; out.momentum = p * state.dx; out.energy = e * state.dx;
  return out;
}

// Exact solution at state.t for presets that have one (Riemann data, the
// entropy wave, the simple sound wave), at cell centres (sub > 1 averages
// sub samples per cell). Returns null if there is none.
const XW = { rho: 0, u: 0, p: 0 };
export function eulerExact(state, out = null, sub = 1) {
  const pr = eulerPreset(state.preset);
  if (!state.exact && !pr.exactAt) return null;
  const n = state.n, dx = state.dx;
  out = out || { rho: new Float64Array(n), u: new Float64Array(n), p: new Float64Array(n) };
  if (state.exact) {
    riemannProfile(state.exact, state.x, state.x0, state.t, out.rho, out.u, out.p, { sub, dx });
  } else {
    for (let i = 0; i < n; i++) {
      let sr = 0, su = 0, sp = 0;
      for (let m = 0; m < sub; m++) {
        const xi = sub > 1 ? state.x[i] + dx * ((m + 0.5) / sub - 0.5) : state.x[i];
        pr.exactAt(xi, state.t, XW, state.gamma);
        sr += XW.rho; su += XW.u; sp += XW.p;
      }
      out.rho[i] = sr / sub; out.u[i] = su / sub; out.p[i] = sp / sub;
    }
  }
  return out;
}
