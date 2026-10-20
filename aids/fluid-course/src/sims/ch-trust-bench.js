// Chapter 15 (trust): reading benchmark answers out of a lattice-Boltzmann
// run (lbm.js) and comparing them with their references.
//
// The simulations themselves are lbm.js presets ('poiseuille', 'cavity');
// this module only samples their velocity fields, so the figure and the
// tests measure the same numbers.
//
//   poiseuilleError(L, outY?, outErr?)   steady body-force channel against
//       the exact parabola u(y) = F y (H - y) / (2 rho nu) (lbm.js
//       poiseuilleProfile, walls half-way between nodes at y = 0 and H).
//       Returns the max |u - u_exact| / u_max over the column i = 0, and
//       fills the optional profile arrays (y / H, (u - u_exact) / u_max).
//   poiseuilleSlip(Lambda, H)   the signed error that measurement gives for
//       the steady channel: (16 Lambda - 3) / (3 H^2) of u_max, the same at
//       every cell (a uniform slip), where Lambda is the TRT magic parameter
//       ((tau - 1/2)^2 under BGK; lbm.js magicOf). It vanishes at
//       Lambda = 3/16, the TRT choice that makes half-way bounce-back exact
//       for Poiseuille flow (Ginzburg, Verhaeghe & d'Humieres 2008). The
//       closed form is a fit to this code's runs, not a quoted result: it
//       matches them to about 1e-12 relative for BGK and TRT, tau from 0.55
//       to 3 and H from 8 to 48 (tests/fluid-course/ch-trust.test.js).
//   cavityProfiles(L, out)   centreline profiles of the lid-driven cavity:
//       u / U along the vertical centreline x = 1/2 and v / U along the
//       horizontal centreline y = 1/2, at the cell centres plus the walls.
//   ghiaDeviation(L)   the same profiles linearly interpolated to the 17
//       points of Ghia, Ghia & Shin (1982) Tables I and II at Re = 100
//       (lbm.js GHIA_RE100), and the largest deviations max|u - u_G| / U,
//       max|v - v_G| / U; also the minimum of u on the vertical centreline
//       and its height (Ghia: -0.21090 at y = 0.4531).
//
// Conventions (lbm.js): lattice units, cells indexed i + j nx with j = 0 at
// the bottom, cell centres at (i + 1/2, j + 1/2), half-way bounce-back walls
// on the cell edges, so the cavity's walls are at x, y = 0 and n (scaled to
// 0 and 1 here) and its lid (top) moves at U. The centreline x = 1/2 falls
// between the two middle columns for even n: the average of the two is
// used, which is the linear interpolation there.
//
// Sources: Ghia, Ghia & Shin, J. Comput. Phys. 48 (1982) 387-411 (Tables I
// and II, Re = 100); Krüger et al., The Lattice Boltzmann Method (Springer
// 2017) §5.3 (Poiseuille flow and the BGK wall-slip error).

import { macroscopic, GHIA_RE100 } from './lbm.js';

export function poiseuilleError(L, outY = null, outErr = null) {
  macroscopic(L);
  const { nx, ny } = L;
  const { exact, U } = L.meta;
  let e = 0;
  for (let j = 0; j < ny; j++) {
    const y = j + 0.5;
    const d = (L.ux[j * nx] - exact(y)) / U;
    if (outY) outY[j] = y / ny;
    if (outErr) outErr[j] = d;
    if (Math.abs(d) > e) e = Math.abs(d);
  }
  return e;
}

export const poiseuilleSlip = (Lambda, H) => (16 * Lambda - 3) / (3 * H * H);

// Linear interpolation in cell-index coordinate c (cell k's centre at c = k)
// of n cell values val(k), with the wall values lo at c = -1/2 and hi at
// c = n - 1/2 (half-way bounce-back puts the walls on the cell edges).
function lerpCells(c, n, val, lo, hi) {
  if (c <= 0) return lo + (val(0) - lo) * Math.max(0, (c + 0.5) / 0.5);
  if (c >= n - 1) return val(n - 1) + (hi - val(n - 1)) * Math.min(1, (c - (n - 1)) / 0.5);
  const k = Math.floor(c);
  const t = c - k;
  return (1 - t) * val(k) + t * val(k + 1);
}

// u along x = 1/2 at height y (0..1), linear between cell centres, with
// u = 0 at the bottom wall and u = U at the lid.
function uAt(L, y) {
  const n = L.ny;
  const nx = L.nx;
  const xi = nx / 2 - 0.5;
  const i0 = Math.floor(xi);
  const ti = xi - i0;
  const row = (j) => (1 - ti) * L.ux[i0 + j * nx] + ti * L.ux[i0 + 1 + j * nx];
  return lerpCells(y * n - 0.5, n, row, 0, L.meta.U) / L.meta.U;
}

// v along y = 1/2 at position x (0..1), linear, v = 0 on the side walls.
function vAt(L, x) {
  const n = L.nx;
  const yj = L.ny / 2 - 0.5;
  const j0 = Math.floor(yj);
  const tj = yj - j0;
  const col = (i) => (1 - tj) * L.uy[i + j0 * n] + tj * L.uy[i + (j0 + 1) * n];
  return lerpCells(x * n - 0.5, n, col, 0, 0) / L.meta.U;
}

// Profiles at the cell centres plus the two walls (n + 2 points). out holds
// Float64Arrays y, u, x, v of that length (allocated on first use).
export function cavityProfiles(L, out = {}) {
  macroscopic(L);
  const n = L.ny;
  const m = n + 2;
  if (!out.y || out.y.length !== m) {
    out.y = new Float64Array(m);
    out.u = new Float64Array(m);
    out.x = new Float64Array(m);
    out.v = new Float64Array(m);
  }
  for (let k = 0; k < m; k++) {
    const s = k === 0 ? 0 : k === m - 1 ? 1 : (k - 0.5) / n;
    out.y[k] = s;
    out.u[k] = uAt(L, s);
    out.x[k] = s;
    out.v[k] = vAt(L, s);
  }
  return out;
}

export function ghiaDeviation(L) {
  macroscopic(L);
  const G = GHIA_RE100;
  let du = 0;
  let dv = 0;
  let duAt = 0;
  for (let k = 0; k < G.y.length; k++) {
    const d = Math.abs(uAt(L, G.y[k]) - G.u[k]);
    if (d > du) {
      du = d;
      duAt = G.y[k];
    }
    dv = Math.max(dv, Math.abs(vAt(L, G.x[k]) - G.v[k]));
  }
  // Minimum of u on the vertical centreline (cell-centre resolution).
  let uMin = Infinity;
  let yMin = 0;
  const n = L.ny;
  for (let j = 0; j < n; j++) {
    const y = (j + 0.5) / n;
    const u = uAt(L, y);
    if (u < uMin) {
      uMin = u;
      yMin = y;
    }
  }
  return { du, dv, duAt, uMin, yMin };
}
