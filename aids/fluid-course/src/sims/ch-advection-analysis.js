// Analysis helpers for the advection chapter (chapter 7), built on the shared
// kernel src/sims/advection.js. Nothing here advances a scheme: every time
// step in the chapter's figures is advection.js step(). This module measures
// what those steps do and turns the kernel's von Neumann and modified-equation
// results into the quantities the chapter plots:
//
//   momentsPeriodic()   mass, centroid offset and variance of a profile on the
//                       periodic unit interval, weighted by u (spreading of a
//                       pulse) or by u² (where a wave packet's energy sits).
//   groupVelocity()     discrete group velocity of a linear scheme, c_g/a, from
//                       the phase of advection.js amplification() (Trefethen
//                       1982: wave packets on a grid travel at dω/dk).
//   modifiedSpeeds()    the leading-order phase and group speeds from the
//                       modified equation u_t + a u_x = D u_xx + E u_xxx
//                       (Warming & Hyett 1974): c = a + E k², c_g = a + 3E k².
//   reach(), cflLimit() how far a scheme's stencil reaches per step, and the
//                       largest Courant number for which its numerical domain
//                       of dependence still contains the characteristic foot
//                       (Courant, Friedrichs & Lewy 1928). This is necessary
//                       for stability, not sufficient: compare SCHEMES.nuMax.
//   EXTRA_PRESETS       a broken/fixed pair in the shape of advection.js
//                       PRESETS, for dispersive undershoot on smooth but
//                       under-resolved data (tested in tests/fluid-course/
//                       ch-advection.test.js).
//
// Conventions follow advection.js: periodic [0, 1), Δx = 1/n, ν = aΔt/Δx with
// the sign of a, θ = kΔx in [0, π].
//
// References
//   Courant, R., Friedrichs, K. & Lewy, H. (1928) Math. Ann. 100, 32–74.
//   Trefethen, L. N. (1982) Group velocity in finite difference schemes.
//     SIAM Review 24, 113–136.
//   Warming, R. F. & Hyett, B. J. (1974) J. Comput. Phys. 14, 159–179.

import { SCHEMES, amplification, modifiedEquation } from './advection.js';

// Moments of u on the periodic grid x (cell centres in [0, 1)) about `centre`:
// each offset x − centre is wrapped into [−1/2, 1/2). power 1 weights by u (a
// positive pulse), power 2 by u² (a signed wave packet's energy). Returns
// { mass, offset, variance } with offset the weighted mean of the wrapped
// offsets. Pass `out` to reuse an object; no allocation otherwise either.
export function momentsPeriodic(x, u, centre, power = 1, out = {}) {
  let m = 0, s1 = 0, s2 = 0;
  const n = u.length;
  for (let j = 0; j < n; j++) {
    let d = x[j] - centre;
    d -= Math.floor(d + 0.5);
    const w = power === 2 ? u[j] * u[j] : u[j];
    m += w;
    s1 += d * w;
    s2 += d * d * w;
  }
  const mean = m !== 0 ? s1 / m : 0;
  out.mass = m;
  out.offset = mean;
  out.variance = m !== 0 ? s2 / m - mean * mean : 0;
  return out;
}

const AMP = {};
// Numerical phase advanced per step, −arg G, on the branch nearest the exact
// νθ (advection.js relSpeed picks that branch).
function phasePerStep(id, nu, theta, opts) {
  const g = amplification(id, nu, theta, opts, AMP);
  return g.relSpeed * nu * theta;
}

// Discrete group velocity of the physical root, as a fraction of a:
// c_g/a = (1/ν) d(−arg G)/dθ. Central difference in θ (h = 1e-5, one-sided
// at the ends of [0, π]). For upwind at |ν| = 1 it is exactly 1.
export function groupVelocity(schemeId, nu, theta, opts = {}) {
  const h = 1e-5;
  const lo = Math.max(0, theta - h), hi = Math.min(Math.PI, theta + h);
  return (phasePerStep(schemeId, nu, hi, opts) - phasePerStep(schemeId, nu, lo, opts)) / ((hi - lo) * nu);
}

// Leading-order phase and group speeds (fractions of a) of the mode θ from
// the modified equation: c/a = 1 + e θ², c_g/a = 1 + 3e θ², where E = e aΔx².
// Valid for θ ≪ 1; the discrete values come from amplification().
export function modifiedSpeeds(schemeId, nu, theta, out = {}) {
  const e = modifiedEquation(schemeId, 1, 1, Math.abs(nu)).E;
  out.phase = 1 + e * theta * theta;
  out.group = 1 + 3 * e * theta * theta;
  out.e = e;
  return out;
}

// Stencil reach per step for a > 0: { left, right } in cells (both ≥ 0).
// Leapfrog reaches one cell per level; the others as in SCHEMES.stencil.
export function reach(schemeId) {
  const st = SCHEMES[schemeId]?.stencil;
  if (!st) throw new Error(`ch-advection: unknown scheme '${schemeId}'`);
  let lo = 0, hi = 0;
  for (const o of st) {
    if (o < lo) lo = o;
    if (o > hi) hi = o;
  }
  return { left: 0 - lo, right: hi }; // 0 − lo, not −lo: no −0 for downwind
}

// The CFL bound for a > 0: the characteristic through (x_j, t_N) lands νN
// cells upstream, and the numerical domain of dependence reaches left·N cells
// upstream, so the condition is ν ≤ left. Downwind reaches no cell upstream:
// no ν > 0 satisfies it.
export function cflLimit(schemeId) {
  return reach(schemeId).left;
}

// Dispersive undershoot on smooth data: Lax–Wendroff on a Gaussian with only
// 2.5 cells per standard deviation leaves trailing ripples that dip below
// zero; on a grid four times finer they are invisible. Same shape as
// advection.js PRESETS (createState(n, profile), then `steps` steps).
export const EXTRA_PRESETS = {
  'lw-dispersion': {
    id: 'lw-dispersion', name: 'Dispersive ripples', family: 'accuracy',
    description: 'Lax–Wendroff on a Gaussian resolved by only a few cells: short waves lag, and a train of ripples trails the pulse and dips below zero. Four times finer, the ripples vanish.',
    metric: 'undershoot', threshold: 0.05,
    broken: { label: 'n = 50', scheme: 'lw', nu: 0.5, profile: 'gaussian', n: 50, steps: 100, opts: {} },
    fixed: { label: 'n = 200', scheme: 'lw', nu: 0.5, profile: 'gaussian', n: 200, steps: 400, opts: {} },
  },
};
