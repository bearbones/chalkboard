// Chapter 9 (stiffness) kernel: Richardson's three-level ("leapfrog") scheme
// for the heat equation, and the refinement study that separates a stable but
// inconsistent scheme (Du Fort–Frankel with dt/dx fixed) from a convergent one.
//
// What is here
//   RICHARDSON                  metadata (TeX, stability) for the figure.
//   richardsonRoots(xi, r)      the two real roots of G^2 + 8 r s G - 1 = 0,
//                               s = sin^2(xi/2): one step of the scheme maps
//                               the pair (u^{n-1}, u^n) of a Fourier mode by
//                               these factors.
//   richardsonAmplification     the larger root modulus, 4 r s + sqrt(1 + 16 r^2 s^2),
//                               which exceeds 1 for every r > 0 and xi != 0:
//                               the scheme is unconditionally unstable.
//   richardsonStep(state, dt)   one step on a createHeat() state from
//                               diffusion.js (Dirichlet or periodic). Like
//                               diffusion.js's Du Fort–Frankel, it starts (and
//                               restarts whenever dt changes) with one
//                               Crank–Nicolson step, which supplies u^1.
//   heatRefinementStudy(...)    generator: for each n, run a heat scheme on
//                               the 'sine' preset to time T with dt = c dx
//                               (path 'dt/dx') or dt = r dx^2 (path 'r'),
//                               and yield the max-norm error against the exact
//                               heat solution. Returns the list of results.
//
// The scheme: u_j^{n+1} = u_j^{n-1} + 2 r (u_{j+1}^n - 2 u_j^n + u_{j-1}^n),
// r = kappa dt / dx^2: centred in time and space, second order in both, and
// unstable for every r > 0. Numerical analysts call it Richardson's scheme;
// Du Fort–Frankel replaces 2 u_j^n by u_j^{n+1} + u_j^{n-1}, which makes it
// stable for every r but consistent with the heat equation only if dt/dx -> 0.
// Sources: Richtmyer & Morton, Difference Methods for Initial-Value Problems,
// 2nd ed. (1967) ch. 8; Morton & Mayers, Numerical Solution of PDEs, 2nd ed.
// (2005) ch. 2; Galloway & Ivers, ANZIAM J. 63 (2021), doi:10.1017/S1446181121000043
// (Du Fort–Frankel as a stabilised Richardson leapfrog); Du Fort & Frankel,
// Math. Tables Aids Comput. 7 (1953) 135–152.
//
// Conventions follow diffusion.js: domain [0, 1], dx = 1/n, nondimensional
// time (kappa = 1 by default). The step allocates nothing: it uses the
// state's u, uPrev and work arrays.

import { step as heatStep, meshRatio, createHeat, heatExact, dufortFrankelRoots } from './diffusion.js';

export const RICHARDSON = {
  id: 'richardson',
  name: 'Richardson (leapfrog)',
  description: 'Centred in time and in space: second order in both, and unstable for every r > 0. One root of its amplification equation always lies outside the unit circle.',
  tex: 'u_j^{n+1} = u_j^{n-1} + 2r\\left(u_{j+1}^n - 2u_j^n + u_{j-1}^n\\right)',
  texG: 'G^2 + 8r\\sin^2\\frac{\\xi}{2}\\,G - 1 = 0',
  stability: '\\text{no } r > 0',
};

// The two real roots of G^2 + 8 r s G - 1 = 0 with s = sin^2(xi / 2).
// Their product is -1, so one has modulus >= 1, with equality only if s = 0.
export function richardsonRoots(xi, r) {
  const b = 4 * r * Math.sin(xi / 2) ** 2;
  const q = Math.sqrt(1 + b * b);
  // g1 = -b + q written without cancellation: 1 / (b + q)
  return { g1: 1 / (b + q), g2: -b - q };
}

// Largest root modulus: 4 r s + sqrt(1 + 16 r^2 s^2) (>= 1).
export function richardsonAmplification(xi, r) {
  const b = 4 * r * Math.sin(xi / 2) ** 2;
  return b + Math.sqrt(1 + b * b);
}

// One step of Richardson's scheme on a diffusion.js heat state. The first
// step, and any step whose dt differs from the last one, is a Crank–Nicolson
// step (as diffusion.js does for Du Fort–Frankel). Mutates state.u; afterwards
// state.uPrev holds the previous time level.
export function richardsonStep(state, dt) {
  if (!(state.steps > 0 && state.lastDt === dt)) {
    heatStep(state, { scheme: 'cn', dt });
    state.lastScheme = 'richardson';
    return state;
  }
  const r = meshRatio(state, dt);
  const two = 2 * r;
  const { u, uPrev: q, work: w, len } = state;
  if (state.bc === 'dirichlet') {
    u[0] = state.left;
    u[len - 1] = state.right;
    w[0] = state.left;
    w[len - 1] = state.right;
    for (let j = 1; j < len - 1; j++) w[j] = q[j] + two * (u[j + 1] - 2 * u[j] + u[j - 1]);
  } else {
    const n = len;
    w[0] = q[0] + two * (u[1] - 2 * u[0] + u[n - 1]);
    for (let j = 1; j < n - 1; j++) w[j] = q[j] + two * (u[j + 1] - 2 * u[j] + u[j - 1]);
    w[n - 1] = q[n - 1] + two * (u[0] - 2 * u[n - 1] + u[n - 2]);
  }
  q.set(u);
  u.set(w);
  state.t += dt;
  state.steps++;
  state.lastDt = dt;
  state.lastScheme = 'richardson';
  return state;
}

// Advance a heat state by one step of any scheme in this chapter:
// 'richardson' here, or a diffusion.js scheme id.
export function chapterHeatStep(state, scheme, dt, theta) {
  if (scheme === 'richardson') return richardsonStep(state, dt);
  return heatStep(state, { scheme, dt, theta });
}

// Values beyond this are reported as a blow-up (Infinity) by the study.
export const BLOWUP = 1e12;

// Refinement study on the 'sine' preset (u0 = sin pi x, u = 0 at both ends).
// opts: { scheme: 'dufort-frankel' | 'richardson' | a diffusion.js scheme,
//         path: 'dt/dx' (dt = c dx) | 'r' (dt = r dx^2), c = 0.5, r = 1,
//         ns = [10, 20, 40, 80, 160], T = 0.2, kappa = 1 }.
// Yields { n, dt, r, c, steps, error, amplitude, exactAmplitude, blewUp } per
// grid (error = max-norm error against the exact heat solution at T,
// amplitude = u at x = 1/2), and returns the array of them.
export function* heatRefinementStudy(opts = {}) {
  const scheme = opts.scheme ?? 'dufort-frankel';
  const path = opts.path ?? 'dt/dx';
  const c = opts.c ?? 0.5;
  const r0 = opts.r ?? 1;
  const ns = opts.ns ?? [10, 20, 40, 80, 160];
  const T = opts.T ?? 0.2;
  const kappa = opts.kappa ?? 1;
  const out = [];
  for (const n of ns) {
    const s = createHeat({ n, kappa, preset: 'sine' });
    const dx = 1 / n;
    const dt = path === 'r' ? (r0 * dx * dx) / kappa : c * dx;
    const steps = Math.round(T / dt);
    let blewUp = false;
    for (let k = 0; k < steps; k++) {
      chapterHeatStep(s, scheme, dt);
      const mid = s.u[n >> 1];
      if (!(Math.abs(mid) < BLOWUP) || !(Math.abs(s.u[1]) < BLOWUP)) {
        blewUp = true;
        break;
      }
    }
    let error = Infinity;
    if (!blewUp) {
      const ex = heatExact('sine', s.x, s.t, kappa);
      error = 0;
      for (let j = 0; j < s.len; j++) error = Math.max(error, Math.abs(s.u[j] - ex[j]));
      if (!(error < BLOWUP)) {
        error = Infinity;
        blewUp = true;
      }
    }
    const res = {
      n,
      dt,
      r: (kappa * dt) / (dx * dx),
      c: dt / dx,
      steps: s.steps,
      t: s.t,
      error,
      amplitude: blewUp ? NaN : s.u[n >> 1],
      exactAmplitude: Math.exp(-kappa * Math.PI * Math.PI * s.t),
      blewUp,
    };
    out.push(res);
    yield res;
  }
  return out;
}

// The larger root modulus of Du Fort–Frankel, for comparison in the figure
// (re-exported shape: |G| <= 1 for every r, xi).
export function dufortFrankelModulus(xi, r) {
  const g = dufortFrankelRoots(xi, r);
  return Math.max(Math.hypot(g.re1, g.im1), Math.hypot(g.re2, g.im2));
}
