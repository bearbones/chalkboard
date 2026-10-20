// Exact Riemann solver for the 1-D Euler equations of an ideal gas.
//
// What it does. Given a left state W_L = (rho_L, u_L, p_L) for x < x0 and a
// right state W_R for x > x0 at t = 0, the solution is self-similar in
// s = (x - x0)/t: a left wave (shock or rarefaction), a contact moving at u*,
// and a right wave, with two "star" states between them that share the
// pressure p* and the velocity u*. p* is the root of the pressure function
//   f(p) = f_L(p) + f_R(p) + (u_R - u_L) = 0,
// where f_K is the Rankine-Hugoniot relation for a shock (p > p_K) or the
// isentropic relation for a rarefaction (p <= p_K). f is monotone and concave,
// so Newton's method converges from Toro's starting guesses in a few steps.
// The iteration is part of the lesson: solveRiemann is a generator that
// yields { t: 'iter', k, p, residual, dresidual, change, damped } for the
// guess (k = 0) and after every Newton step (residual = f(p), dresidual =
// f'(p), change = 2|p_k - p_{k-1}|/(p_k + p_{k-1})), and returns the full
// solution.
//
// Conventions. States are { rho, u, p } objects (riemannInto takes the six
// numbers directly). Everything
// is nondimensional (any consistent units work); gamma is the ratio of
// specific heats, 1.4 by default. Sound speed a = sqrt(gamma p / rho). The
// solution object reports the wave structure: sol.left / sol.right are
// { type: 'shock', speed } or { type: 'rarefaction', head, tail }, and
// sol.contact is the contact speed u*. sampleRiemann(sol, s, out) returns
// (rho, u, p) and the region label at s = x/t: 'L', 'L-fan', 'L*', 'R*',
// 'R-fan', 'R' or 'vacuum'.
//
// Vacuum. If either initial density is zero the matching vacuum solution is
// used (one rarefaction straight to vacuum). If the pressure positivity
// condition 2(a_L + a_R)/(gamma - 1) > u_R - u_L fails, the two rarefactions
// pull apart and a vacuum opens between them (Toro 2009 §4.6, eq. 4.40); no
// iteration is done and sol.vacuum says which case occurred. Inside a vacuum
// rho = p = 0 and the velocity is undefined; we report u = s so a plotted
// profile stays continuous (a display choice, not physics).
//
// Sources.
//   E. F. Toro, Riemann Solvers and Numerical Methods for Fluid Dynamics,
//   3rd ed., Springer 2009: §4.2 (pressure function, eqs 4.6-4.7), §4.3.1
//   (Newton iteration, eq. 4.44, and the relative-change stopping test),
//   §4.3.2 and §9.5.1 (starting guesses TR, PV, TS and the adaptive choice),
//   §4.4 (wave speeds, star densities), §4.5 (sampling), §4.6 (vacuum),
//   Table 4.1 / 4.3 (test problems and their exact star states).
//   S. K. Godunov, Mat. Sb. 47 (1959) 271-306 (the method that needs this).
//   J. J. Gottlieb and C. P. T. Groth, J. Comput. Phys. 78 (1988) 437-458.
//
// Deviations from Toro's FORTRAN-style listing: the default tolerance on the
// relative pressure change is 1e-8 instead of 1e-6 (both reproduce Table 4.3
// to the digits printed); a Newton step that lands below zero is replaced by
// p/10 instead of Toro's reset to TOL, because near the vacuum threshold p*
// can be far below TOL and the reset would stop there with a large residual
// (each event carries damped: true when this happens); guesses are floored
// at tol * min(p_L, p_R) rather than at an absolute TOL. The iteration is a
// generator; its non-yielding twin riemannInto reuses one preallocated
// solution object so a Godunov flux can call it once per cell face without
// creating objects (the JS engine may still box a few doubles passed between
// functions). Both loops call the same pressureFunction / initialGuess /
// newtonUpdate / finishSolution, so there is one algorithm, not a display
// copy (a test checks they agree bit for bit).

import { drain } from './util.js';

export const GAMMA = 1.4;

// Toro (2009) Table 4.1 test problems with the exact star values of
// Table 4.3 (p*, u*, rho*_L, rho*_R), x0 and output time of chapter 4.
export const TORO_TESTS = [
  {
    id: 'test1', name: 'Sod shock tube (Toro test 1)',
    L: { rho: 1, u: 0, p: 1 }, R: { rho: 0.125, u: 0, p: 0.1 }, x0: 0.5, t: 0.25,
    star: { p: 0.30313, u: 0.92745, rhoL: 0.42632, rhoR: 0.26557 },
    waves: ['rarefaction', 'shock'],
    description: 'Left rarefaction, contact, right shock. The standard first test (Sod 1978).',
  },
  {
    id: 'test2', name: '123 problem (Toro test 2)',
    L: { rho: 1, u: -2, p: 0.4 }, R: { rho: 1, u: 2, p: 0.4 }, x0: 0.5, t: 0.15,
    star: { p: 0.00189, u: 0, rhoL: 0.02185, rhoR: 0.02185 },
    waves: ['rarefaction', 'rarefaction'],
    description: 'Two strong rarefactions and a trivial contact; the star region is close to vacuum.',
  },
  {
    id: 'test3', name: 'Left half of the blast wave (Toro test 3)',
    L: { rho: 1, u: 0, p: 1000 }, R: { rho: 1, u: 0, p: 0.01 }, x0: 0.5, t: 0.012,
    star: { p: 460.894, u: 19.5975, rhoL: 0.57506, rhoR: 5.99924 },
    waves: ['rarefaction', 'shock'],
    description: 'Left half of the Woodward-Colella blast wave: a very strong shock (pressure ratio 1e5).',
  },
  {
    id: 'test4', name: 'Right half of the blast wave (Toro test 4)',
    L: { rho: 1, u: 0, p: 0.01 }, R: { rho: 1, u: 0, p: 100 }, x0: 0.5, t: 0.035,
    star: { p: 46.095, u: -6.19633, rhoL: 5.99242, rhoR: 0.57511 },
    waves: ['shock', 'rarefaction'],
    description: 'Mirror of test 3 at a tenth of the pressure: left shock, contact, right rarefaction.',
  },
  {
    id: 'test5', name: 'Two colliding shocks (Toro test 5)',
    L: { rho: 5.99924, u: 19.5975, p: 460.894 }, R: { rho: 5.99242, u: -6.19633, p: 46.095 },
    x0: 0.5, t: 0.035,
    star: { p: 1691.64, u: 8.68975, rhoL: 14.2823, rhoR: 31.0426 },
    waves: ['shock', 'shock'],
    description: 'The two shocks of tests 3 and 4 collide: left shock, right-moving contact, right shock.',
    note: 'Table 4.3 lists the star state computed from the unrounded star states of tests 3 and 4; from the rounded inputs printed here p* = 1691.647 and u* = 8.68977.',
  },
];

// Starting guesses for p* (Toro 2009 §4.3.2 and §9.5.1).
export const GUESSES = [
  {
    id: 'adaptive', name: 'Adaptive (PV, TR or TS)',
    tex: 'p_0 = \\begin{cases} p_{PV} & p_{\\max}/p_{\\min} \\le 2 \\text{ and } p_{\\min} \\le p_{PV} \\le p_{\\max} \\\\ p_{TR} & p_{PV} < p_{\\min} \\\\ p_{TS} & \\text{otherwise} \\end{cases}',
    description: 'Primitive-variable guess when the pressure ratio is small and it lies between p_L and p_R; otherwise two-rarefaction (expansions) or two-shock (compressions). Toro §9.5.1.',
  },
  { id: 'pvrs', name: 'Primitive variables (PV)', tex: 'p_{PV} = \\tfrac12(p_L + p_R) - \\tfrac18(u_R - u_L)(\\rho_L + \\rho_R)(a_L + a_R)', description: 'Linearised solution in primitive variables, Toro eq. 4.47.' },
  {
    id: 'trrs', name: 'Two rarefactions (TR)',
    tex: 'p_{TR} = \\left[\\frac{a_L + a_R - \\tfrac{\\gamma - 1}{2}(u_R - u_L)}{a_L / p_L^{z} + a_R / p_R^{z}}\\right]^{1/z},\\quad z = \\frac{\\gamma - 1}{2\\gamma}',
    description: 'Exact if both waves are rarefactions, Toro eq. 4.46.',
  },
  {
    id: 'tsrs', name: 'Two shocks (TS)',
    tex: 'p_{TS} = \\frac{g_L p_L + g_R p_R - (u_R - u_L)}{g_L + g_R},\\quad g_K = \\sqrt{\\frac{A_K}{\\hat p + B_K}},\\ \\hat p = \\max(0, p_{PV})',
    description: 'Approximate two-shock solution seeded with the PV guess, Toro eq. 4.48 (A_K, B_K as in the shock branch of the pressure function).',
  },
  { id: 'mean', name: 'Arithmetic mean', tex: 'p_0 = \\tfrac12(p_L + p_R)', description: 'The naive guess; it costs more iterations, and from above the root Newton can overshoot below zero (the step is then damped to p/10).' },
];

const SHOCK = 'shock';
const RAREFACTION = 'rarefaction';

export const soundSpeed = (rho, p, gamma = GAMMA) => Math.sqrt((gamma * p) / rho);

// f_K(p) and its derivative for one side K (Toro eqs 4.6, 4.7, 4.37). Writes
// out.f and out.df and returns out.f.
//   shock (p > p_K):       f = (p - p_K) sqrt(A_K / (p + B_K)),
//                           A_K = 2/((gamma+1) rho_K), B_K = (gamma-1)/(gamma+1) p_K
//   rarefaction (p <= p_K): f = 2 a_K/(gamma-1) [(p/p_K)^((gamma-1)/(2 gamma)) - 1]
export function pressureFunction(p, rhoK, pK, aK, gamma, out) {
  if (p > pK) {
    const A = 2 / ((gamma + 1) * rhoK);
    const B = ((gamma - 1) / (gamma + 1)) * pK;
    const q = Math.sqrt(A / (p + B));
    out.f = (p - pK) * q;
    out.df = q * (1 - (p - pK) / (2 * (B + p)));
  } else {
    const r = p / pK;
    out.f = ((2 * aK) / (gamma - 1)) * (Math.pow(r, (gamma - 1) / (2 * gamma)) - 1);
    out.df = Math.pow(r, -(gamma + 1) / (2 * gamma)) / (rhoK * aK);
  }
  return out.f;
}

// A reusable solution record. All fields are numbers or interned strings, so
// riemannInto can refill it without allocating.
export function makeRiemannSolution() {
  return {
    gamma: GAMMA,
    rhoL: 1, uL: 0, pL: 1, aL: 1, rhoR: 1, uR: 0, pR: 1, aR: 1,
    vacuum: null,            // null | 'generated' | 'left' | 'right' | 'both'
    pStar: NaN, uStar: NaN, rhoStarL: NaN, rhoStarR: NaN, aStarL: NaN, aStarR: NaN,
    left: { type: SHOCK, speed: NaN, head: NaN, tail: NaN },
    right: { type: SHOCK, speed: NaN, head: NaN, tail: NaN },
    contact: NaN,
    iterations: 0,
    converged: false,
  };
}

function setStates(sol, rL, uL, pL, rR, uR, pR, gamma) {
  sol.gamma = gamma;
  sol.rhoL = rL; sol.uL = uL; sol.pL = pL; sol.aL = rL > 0 ? Math.sqrt((gamma * pL) / rL) : 0;
  sol.rhoR = rR; sol.uR = uR; sol.pR = pR; sol.aR = rR > 0 ? Math.sqrt((gamma * pR) / rR) : 0;
  sol.iterations = 0;
  sol.converged = false;
}

// Vacuum detection (Toro §4.6). Returns the vacuum case or null.
export function vacuumCase(rL, uL, pL, rR, uR, pR, gamma = GAMMA) {
  const lv = !(rL > 0), rv = !(rR > 0);
  if (lv && rv) return 'both';
  if (lv) return 'left';
  if (rv) return 'right';
  const aL = Math.sqrt((gamma * pL) / rL), aR = Math.sqrt((gamma * pR) / rR);
  // pressure positivity condition, eq. 4.40
  return (2 * (aL + aR)) / (gamma - 1) <= uR - uL ? 'generated' : null;
}

function finishVacuum(sol, kind) {
  const g = sol.gamma;
  sol.vacuum = kind;
  sol.pStar = 0; sol.rhoStarL = 0; sol.rhoStarR = 0; sol.aStarL = 0; sol.aStarR = 0;
  sol.uStar = NaN; sol.contact = NaN;
  sol.converged = true;
  const L = sol.left, R = sol.right;
  L.type = RAREFACTION; L.speed = NaN; R.type = RAREFACTION; R.speed = NaN;
  // A missing side has no wave: put its head and tail on the vacuum front.
  if (kind === 'left' || kind === 'both') { L.head = L.tail = sol.uR - (2 * sol.aR) / (g - 1); }
  else { L.head = sol.uL - sol.aL; L.tail = sol.uL + (2 * sol.aL) / (g - 1); }
  if (kind === 'right' || kind === 'both') { R.head = R.tail = sol.uL + (2 * sol.aL) / (g - 1); }
  else { R.head = sol.uR + sol.aR; R.tail = sol.uR - (2 * sol.aR) / (g - 1); }
  if (kind === 'both') { L.head = L.tail = R.head = R.tail = 0; }
}

// Floor for damped iterates: near the vacuum threshold p* itself can be
// 1e-20, so no fixed tolerance may act as a floor for the iteration.
const PFLOOR = 1e-300;

// Two-rarefaction guess, Toro eq. 4.46.
function trrsGuess(sol) {
  const g = sol.gamma, z = (g - 1) / (2 * g);
  const num = sol.aL + sol.aR - 0.5 * (g - 1) * (sol.uR - sol.uL);
  const den = sol.aL / Math.pow(sol.pL, z) + sol.aR / Math.pow(sol.pR, z);
  return Math.pow(num / den, 1 / z);
}

// Two-shock guess seeded with p0, Toro eq. 4.48.
function tsrsGuess(sol, p0) {
  const g = sol.gamma;
  const gL = Math.sqrt((2 / ((g + 1) * sol.rhoL)) / (((g - 1) / (g + 1)) * sol.pL + p0));
  const gR = Math.sqrt((2 / ((g + 1) * sol.rhoR)) / (((g - 1) / (g + 1)) * sol.pR + p0));
  return (gL * sol.pL + gR * sol.pR - (sol.uR - sol.uL)) / (gL + gR);
}

// Starting guess for p* (Toro §4.3.2, §9.5.1), floored at tol * min(p_L, p_R)
// (Toro floors at TOL) so a negative PV or TS estimate still starts Newton
// from a positive pressure.
export function initialGuess(sol, kind = 'adaptive', tol = 1e-8) {
  const { rhoL, uL, pL, aL, rhoR, uR, pR, aR } = sol;
  const cup = 0.25 * (rhoL + rhoR) * (aL + aR);
  const floor = tol * Math.min(pL, pR);
  const ppv = Math.max(floor, 0.5 * (pL + pR) + 0.5 * (uL - uR) * cup);
  let p;
  if (kind === 'mean') p = 0.5 * (pL + pR);
  else if (kind === 'pvrs') p = ppv;
  else if (kind === 'trrs') p = trrsGuess(sol);
  else if (kind === 'tsrs') p = tsrsGuess(sol, ppv);
  else {
    const pmin = Math.min(pL, pR), pmax = Math.max(pL, pR);
    if (pmax / pmin <= 2 && ppv >= pmin && ppv <= pmax) p = ppv;
    else if (ppv < pmin) p = trrsGuess(sol);
    else p = tsrsGuess(sol, ppv);
  }
  return Math.max(floor, p);
}

const PF = { f: 0, df: 0 };
const PF2 = { f: 0, df: 0, fL: 0, fR: 0 };
const PFX = { f: 0, df: 0, fL: 0, fR: 0 };

// The star function f(p) = f_L(p) + f_R(p) + u_R - u_L and its derivative,
// written to out (out.f, out.df, out.fL, out.fR). Returns f(p). Widgets plot
// it; the Newton loops below evaluate it. (The default out is a scratch
// object of its own, so plotting between yields cannot disturb a running
// iteration.)
export function starFunction(sol, p, out = PFX) {
  const fL = pressureFunction(p, sol.rhoL, sol.pL, sol.aL, sol.gamma, PF);
  const dL = PF.df;
  const fR = pressureFunction(p, sol.rhoR, sol.pR, sol.aR, sol.gamma, PF);
  out.fL = fL; out.fR = fR;
  out.f = fL + fR + (sol.uR - sol.uL);
  out.df = dL + PF.df;
  return out.f;
}

// One Newton step on f(p) = 0 (Toro eq. 4.44). f is increasing and concave,
// so from below the root Newton climbs monotonically and from above it can
// overshoot below zero. Toro's listing then resets p to TOL; we take p/10
// instead (a damped step), which never stalls at an arbitrary floor.
export function newtonUpdate(p, f, df) {
  const q = p - f / df;
  return q > 0 ? q : Math.max(PFLOOR, 0.1 * p);
}

// Star velocity, star densities and wave speeds once p* is known (§4.4).
function finishSolution(sol, p) {
  const g = sol.gamma;
  const { rhoL, uL, pL, aL, rhoR, uR, pR, aR } = sol;
  starFunction(sol, p, PF2);
  sol.vacuum = null;
  sol.pStar = p;
  sol.uStar = 0.5 * (uL + uR) + 0.5 * (PF2.fR - PF2.fL);
  sol.contact = sol.uStar;
  const G6 = (g - 1) / (g + 1);
  const L = sol.left, R = sol.right;
  if (p > pL) {
    const r = p / pL;
    sol.rhoStarL = (rhoL * (r + G6)) / (G6 * r + 1);
    L.type = SHOCK;
    L.speed = uL - aL * Math.sqrt(((g + 1) / (2 * g)) * r + (g - 1) / (2 * g));
    L.head = L.tail = L.speed;
  } else {
    sol.rhoStarL = rhoL * Math.pow(p / pL, 1 / g);
    L.type = RAREFACTION;
    L.speed = NaN;
    L.head = uL - aL;
    L.tail = sol.uStar - aL * Math.pow(p / pL, (g - 1) / (2 * g));
  }
  if (p > pR) {
    const r = p / pR;
    sol.rhoStarR = (rhoR * (r + G6)) / (G6 * r + 1);
    R.type = SHOCK;
    R.speed = uR + aR * Math.sqrt(((g + 1) / (2 * g)) * r + (g - 1) / (2 * g));
    R.head = R.tail = R.speed;
  } else {
    sol.rhoStarR = rhoR * Math.pow(p / pR, 1 / g);
    R.type = RAREFACTION;
    R.speed = NaN;
    R.head = uR + aR;
    R.tail = sol.uStar + aR * Math.pow(p / pR, (g - 1) / (2 * g));
  }
  sol.aStarL = Math.sqrt((g * p) / sol.rhoStarL);
  sol.aStarR = Math.sqrt((g * p) / sol.rhoStarR);
}

// The lesson version: a generator over Newton iterates. L and R are
// { rho, u, p }. Options: gamma, tol (relative pressure change, Toro's CHA),
// maxIter, guess (an id from GUESSES). Returns the solution object.
export function* solveRiemann(L, R, { gamma = GAMMA, tol = 1e-8, maxIter = 50, guess = 'adaptive' } = {}) {
  const sol = makeRiemannSolution();
  setStates(sol, L.rho, L.u, L.p, R.rho, R.u, R.p, gamma);
  const vac = vacuumCase(L.rho, L.u, L.p, R.rho, R.u, R.p, gamma);
  if (vac) {
    finishVacuum(sol, vac);
    yield { t: 'op', op: 'vacuum', kind: vac };
    return sol;
  }
  // f and f' live in locals: other code may run between yields.
  let p = initialGuess(sol, guess, tol);
  let F = starFunction(sol, p, PF2), dF = PF2.df;
  yield { t: 'iter', k: 0, p, residual: F, dresidual: dF, change: NaN, damped: false };
  for (let k = 1; k <= maxIter; k++) {
    const damped = p - F / dF <= 0;
    const q = newtonUpdate(p, F, dF);
    const change = (2 * Math.abs(q - p)) / (q + p);
    p = q;
    F = starFunction(sol, p, PF2);
    dF = PF2.df;
    sol.iterations = k;
    yield { t: 'iter', k, p, residual: F, dresidual: dF, change, damped };
    if (change <= tol) { sol.converged = true; break; }
  }
  finishSolution(sol, p);
  return sol;
}

// Convenience: run the generator to the end.
export function exactRiemann(L, R, opts = {}) {
  return drain(solveRiemann(L, R, opts));
}

// The allocation-free twin for Godunov fluxes: same functions, no yields.
export function riemannInto(sol, rL, uL, pL, rR, uR, pR, gamma = GAMMA, tol = 1e-8, maxIter = 50) {
  setStates(sol, rL, uL, pL, rR, uR, pR, gamma);
  const vac = vacuumCase(rL, uL, pL, rR, uR, pR, gamma);
  if (vac) { finishVacuum(sol, vac); return sol; }
  let p = initialGuess(sol, 'adaptive', tol);
  starFunction(sol, p, PF2);
  for (let k = 1; k <= maxIter; k++) {
    const q = newtonUpdate(p, PF2.f, PF2.df);
    const change = (2 * Math.abs(q - p)) / (q + p);
    p = q;
    starFunction(sol, p, PF2);
    sol.iterations = k;
    if (change <= tol) { sol.converged = true; break; }
  }
  finishSolution(sol, p);
  return sol;
}

const VAC = 'vacuum';

function leftFan(sol, s, out) {
  const g = sol.gamma;
  const c = 2 / (g + 1) + ((g - 1) / ((g + 1) * sol.aL)) * (sol.uL - s);
  out.rho = sol.rhoL * Math.pow(c, 2 / (g - 1));
  out.u = (2 / (g + 1)) * (sol.aL + 0.5 * (g - 1) * sol.uL + s);
  out.p = sol.pL * Math.pow(c, (2 * g) / (g - 1));
  out.region = 'L-fan';
}

function rightFan(sol, s, out) {
  const g = sol.gamma;
  const c = 2 / (g + 1) - ((g - 1) / ((g + 1) * sol.aR)) * (sol.uR - s);
  out.rho = sol.rhoR * Math.pow(c, 2 / (g - 1));
  out.u = (2 / (g + 1)) * (-sol.aR + 0.5 * (g - 1) * sol.uR + s);
  out.p = sol.pR * Math.pow(c, (2 * g) / (g - 1));
  out.region = 'R-fan';
}

function setOut(out, rho, u, p, region) {
  out.rho = rho; out.u = u; out.p = p; out.region = region;
  return out;
}

// The solution at s = x/t (Toro §4.5, §4.6). Writes out.rho, out.u, out.p,
// out.region and returns out.
export function sampleRiemann(sol, s, out = { rho: 0, u: 0, p: 0, region: '' }) {
  const L = sol.left, R = sol.right;
  if (sol.vacuum) {
    const k = sol.vacuum;
    if (k === 'both') return setOut(out, 0, s, 0, VAC);
    if (k !== 'left') {
      if (s <= L.head) return setOut(out, sol.rhoL, sol.uL, sol.pL, 'L');
      if (s < L.tail) { leftFan(sol, s, out); return out; }
      if (k === 'right') return setOut(out, 0, s, 0, VAC);
    }
    if (k !== 'right') {
      if (s >= R.head) return setOut(out, sol.rhoR, sol.uR, sol.pR, 'R');
      if (s > R.tail) { rightFan(sol, s, out); return out; }
    }
    return setOut(out, 0, s, 0, VAC);
  }
  if (s <= sol.uStar) {
    if (L.type === SHOCK) {
      return s <= L.speed
        ? setOut(out, sol.rhoL, sol.uL, sol.pL, 'L')
        : setOut(out, sol.rhoStarL, sol.uStar, sol.pStar, 'L*');
    }
    if (s <= L.head) return setOut(out, sol.rhoL, sol.uL, sol.pL, 'L');
    if (s >= L.tail) return setOut(out, sol.rhoStarL, sol.uStar, sol.pStar, 'L*');
    leftFan(sol, s, out);
    return out;
  }
  if (R.type === SHOCK) {
    return s >= R.speed
      ? setOut(out, sol.rhoR, sol.uR, sol.pR, 'R')
      : setOut(out, sol.rhoStarR, sol.uStar, sol.pStar, 'R*');
  }
  if (s >= R.head) return setOut(out, sol.rhoR, sol.uR, sol.pR, 'R');
  if (s <= R.tail) return setOut(out, sol.rhoStarR, sol.uStar, sol.pStar, 'R*');
  rightFan(sol, s, out);
  return out;
}

const SAMPLE = { rho: 0, u: 0, p: 0, region: '' };

// Fill profile arrays at positions x (cell centres) at time t, initial
// discontinuity at x0. With sub > 1 each value is the mean of sub samples
// across a cell of width dx (an approximate cell average). t <= 0 gives the
// initial data.
export function riemannProfile(sol, x, x0, t, rho, u, p, { sub = 1, dx = 0 } = {}) {
  for (let i = 0; i < x.length; i++) {
    let sr = 0, su = 0, sp = 0;
    for (let m = 0; m < sub; m++) {
      const xi = sub > 1 ? x[i] + dx * ((m + 0.5) / sub - 0.5) : x[i];
      if (t > 0) sampleRiemann(sol, (xi - x0) / t, SAMPLE);
      else if (xi < x0) setOut(SAMPLE, sol.rhoL, sol.uL, sol.pL, 'L');
      else setOut(SAMPLE, sol.rhoR, sol.uR, sol.pR, 'R');
      sr += SAMPLE.rho; su += SAMPLE.u; sp += SAMPLE.p;
    }
    rho[i] = sr / sub;
    if (u) u[i] = su / sub;
    if (p) p[i] = sp / sub;
  }
}
