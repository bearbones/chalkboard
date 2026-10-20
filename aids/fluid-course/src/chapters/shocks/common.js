// Shared bits of the chapter 8 (shocks) figures: number formats, small
// diagnostics measured on a solution array (jumps, total variation, L1
// distance) and option lists. No numerical scheme lives here: every update
// is burgers.js, euler1d.js, riemann.js or advection.js.

import { fmt } from '../../kit/dom.js';

// Largest jump between neighbouring cells: a shock or expansion shock that
// the scheme has failed to spread shows up as a jump of order one.
export function maxJump(u, n = u.length) {
  let m = 0;
  for (let i = 1; i < n; i++) {
    const d = Math.abs(u[i] - u[i - 1]);
    if (d > m) m = d;
  }
  return m;
}

// Total variation Σ|u_{i+1} − u_i|.
export function totalVar(u, n = u.length) {
  let s = 0;
  for (let i = 1; i < n; i++) s += Math.abs(u[i] - u[i - 1]);
  return s;
}

// Δx Σ|a − b|.
export function l1(a, b, dx, n = a.length) {
  let s = 0;
  for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]);
  return s * dx;
}

export function minOf(a, n = a.length) {
  let m = Infinity;
  for (let i = 0; i < n; i++) if (a[i] < m) m = a[i];
  return m;
}

export function maxOf(a, n = a.length) {
  let m = -Infinity;
  for (let i = 0; i < n; i++) if (a[i] > m) m = a[i];
  return m;
}

// Signed numbers with a true minus sign and fixed decimals.
export function fx(v, d = 3) {
  if (!Number.isFinite(v)) return '–';
  const s = Math.abs(v).toFixed(d);
  return v < 0 && Number(s) !== 0 ? `−${s}` : s;
}

// Burgers flux f(u) = u²/2, for the closed-form mass budget of a Riemann
// problem with transmissive ends: d/dt ∫u dx = f(u_L) − f(u_R).
export const burgersF = (u) => 0.5 * u * u;
