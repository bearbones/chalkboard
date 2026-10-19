// Turbulence: a 2-D pseudo-spectral vorticity solver, the Sabra shell model,
// Kolmogorov-scale and DNS-cost calculators, and Pope's model spectrum.
//
// (a) 2-D decaying turbulence (createTurb2D / stepTurb2D)
//   Incompressible Navier-Stokes in vorticity-streamfunction form on the
//   doubly periodic square [0, 2 pi)^2, N x N points (N = 64 or 128):
//     omega_t + u . grad omega = nu lap omega - nuH (-lap)^p omega,
//     lap psi = -omega,  u = d psi/dy,  v = -d psi/dx,
//   so omega = dv/dx - du/dy. Fourier pseudo-spectral in space (Canuto,
//   Hussaini, Quarteroni & Zang 2006, Spectral Methods: Fundamentals in Single
//   Domains, Springer; Orszag 1971, J. Atmos. Sci. 28, 1074): derivatives are exact multiplications by
//   i k, the advection term u . grad omega is formed on the grid and
//   transformed back, and the 2/3 rule (square truncation |kx|, |ky| <= kmax,
//   kmax = floor((N-1)/3)) removes its aliases when `dealias` is on. The
//   Nyquist row and column are always zeroed. Time stepping: integrating-
//   factor RK4 (the linear dissipation is integrated exactly; Trefethen 2000,
//   Spectral Methods in MATLAB, Program 27; Kassam & Trefethen 2005), with E = exp(Lk dt/2),
//   Lk = -nu k^2 - nuH k^(2p).
//   Cost per step: 4 stages x 3 complex 2-D FFTs (u + i v and omega_x + i omega_y
//   are packed into one inverse transform each; Numerical Recipes sect. 12.3).
//   Measured in desktop node: about 1 ms per step at 64^2 and 4.5 ms at 128^2.
//   A mid-range phone is 3-5x slower, so 64^2 fits one step per frame inside
//   the 8 ms budget and 128^2 does not: the presets are 64^2, and the 128^2
//   variants (marked heavy: true) need one step every 2-3 frames.
//   Stability: the RK4 limit on the imaginary axis, dt (max|u| kmax + max|v| kmax)
//   <= 2.83, which with the 2/3 rule is a CFL number max(|u|,|v|) dt / dx of
//   about 0.68 in the worst case (0.45 without dealiasing); runs tolerate more
//   when the top modes are nearly empty. Use cfl <= 0.5 (turbSuggestDt); every
//   preset's dt keeps max(|u|,|v|) dt / dx <= 0.5 over its whole run.
//   Simplification switch: integratingFactor = false puts -Lk omega inside
//   the RK4 right-hand side (E = 1), which then also needs Lk dt <= 2.79 on
//   every kept mode (RK4 on the negative real axis).
//   Grid: x_i = i dx, y_j = j dx, dx = 2 pi / N, index i + j N, j = 0 at the
//   bottom. Spectral arrays use the same layout over (kx bin, ky bin).
//   Diagnostics are domain averages: energy E = <|u|^2>/2, enstrophy
//   Z = <omega^2>/2, and the shell-summed spectrum E(k) over shells
//   k - 1/2 <= |k| < k + 1/2 with sum_k E(k) = E. For the dealiased inviscid
//   system E and Z are exact invariants of the semi-discrete equations
//   (Galerkin truncation); RK4 conserves them to O(dt^4) per unit time.
//   Units: nondimensional; box 2 pi, initial r.m.s. velocity O(1).
//   References: Kraichnan (1967) Phys. Fluids 10, 1417 and Batchelor (1969)
//   Phys. Fluids Suppl. 12, II-233 (2-D cascades, k^-3 enstrophy range);
//   McWilliams (1984) J. Fluid Mech. 146, 21 (decaying 2-D turbulence and
//   coherent vortices); Brown & Minion (1995) J. Comput. Phys. 122, 165 and
//   Bell, Colella & Glaz (1989) J. Comput. Phys. 85, 257 (double shear layer);
//   Meunier, Ehrenstein, Leweke & Rossi (2002) Phys. Fluids 14, 2757 (merger
//   of co-rotating vortices above a critical core size a/b ~ 0.22);
//   Phillips (1959), in The Atmosphere and the Sea in Motion (Rossby Memorial
//   Volume), 501 (nonlinear instability from aliasing, seen here with the 2/3
//   rule switched off).
//
// (b) Sabra shell model (createSabra / stepSabra)
//   L'vov, Podivilov, Pomyalov, Procaccia & Vandembroucq (1998) Phys. Rev. E
//   58, 1811: complex shell velocities u_n, n = 0 .. S-1, at
//   k_n = k0 lambda^n,
//     du_n/dt = i (a k_{n+1} u_{n+2} u*_{n+1} + b k_n u_{n+1} u*_{n-1}
//                  - c k_{n-1} u_{n-1} u_{n-2}) - nu k_n^2 u_n + f_n,
//   with u_{-1} = u_{-2} = u_S = u_{S+1} = 0 and a + b + c = 0, so the energy
//   E = (1/2) sum |u_n|^2 is conserved by the nonlinear terms (the paper uses
//   sum |u_n|^2; we halve it to match kinetic energy). Defaults a = 1,
//   b = -1/2, c = -1/2, lambda = 2: the 3-D-like regime, whose second
//   invariant sum (a/c)^n |u_n|^2 = sum (-1)^n (k_n/k0) |u_n|^2 is helicity-like.
//   Viscosity by an exact integrating factor (the top shells are very stiff:
//   nu k_n^2 dt >> 1), nonlinear terms and forcing by RK4. The switch
//   integratingFactor = false puts -nu k_n^2 u_n inside RK4 instead; then
//   every shell needs nu k_n^2 dt <= 2.79, which the 'stiff-explicit' preset
//   breaks (nu k_21^2 dt = 13). Energy flux through shell n (out of
//   shells 0..n):
//     Pi_n = Im[ a k_{n+1} u*_n u*_{n+1} u_{n+2} - c k_n u*_{n-1} u*_n u_{n+1} ],
//   derived from the equations (the tests check it against d/dt of the
//   partial energy). Structure functions S_p(k_n) = <|u_n|^p>; K41 predicts
//   S_p ~ k_n^(-p/3), i.e. zeta_p = p/3 and E(k_n) = <|u_n|^2>/k_n ~ k^-5/3.
//   Measured zeta_p deviate from p/3 (intermittency); zeta_3 = 1 is exact
//   for the flux correlator (the shell-model 4/5 law; L'vov et al. 1998).
//   Further reading: Biferale (2003) Annu. Rev. Fluid Mech. 35, 441;
//   Ditlevsen (2011) Turbulence and Shell Models, Cambridge.
//
// (c) Scales and cost (kolmogorovScales, flowScales, dnsCost)
//   Kolmogorov (1941) scales eta = (nu^3/eps)^(1/4), tau = (nu/eps)^(1/2),
//   v = (nu eps)^(1/4) (Pope 2000, sect. 6.1). With the dissipation
//   estimate eps = C_eps U^3 / L (Taylor 1935, Proc. R. Soc. A 151, 421;
//   Pope 2000, sect. 6.1)
//   L/eta = C_eps^(1/4) Re^(3/4). A pseudo-spectral DNS of a box of side
//   domainOverL * L with spacing dx = dxOverEta * eta needs N^3 ~ Re^(9/4)
//   points; a run of `turnovers` large-eddy times L/U with an advective step
//   dt = cfl dx / U takes ~ Re^(3/4) steps; total work ~ Re^3 (Pope 2000,
//   sect. 9.1.2). These are homogeneous-turbulence estimates: with walls the
//   near-wall layer costs more (Choi & Moin 2012, Phys. Fluids 24, 011702:
//   about Re^(37/14) points for a boundary layer).
//
// (d) Pope's model spectrum (popeSpectrum and friends)
//   Pope (2000), eqs. 6.246-6.248:
//     E(kappa) = C eps^(2/3) kappa^(-5/3) f_L(kappa L) f_eta(kappa eta),
//     f_L(x) = (x / sqrt(x^2 + c_L))^(5/3 + p0),
//     f_eta(x) = exp(-beta ((x^4 + c_eta^4)^(1/4) - c_eta)),
//   C = 1.5, p0 = 2, beta = 5.2, with L = k^(3/2)/eps (k = turbulent kinetic
//   energy) and eta = (nu^3/eps)^(1/4). c_L and c_eta are fixed by
//   int E = k and int 2 nu kappa^2 E = eps; at high Reynolds number they tend
//   to c_L ~ 6.78 and c_eta ~ 0.40 (Pope 2000, sect. 6.5.3). popeCoefficients
//   solves for them at any Re. popeResolved gives the fraction of k and of
//   eps below a cutoff wavenumber (what an LES with that cutoff resolves; Pope
//   2004, New J. Phys. 6, 35, suggests resolving ~80 % of k).

import { rng, gaussian } from './util.js';
import { fft2, fftPlan } from './fft.js';

const TAU = 2 * Math.PI;

// ===========================================================================
// (a) 2-D pseudo-spectral vorticity solver

export const TURB2D_SCHEME = {
  id: 'ps-ifrk4',
  name: 'Fourier pseudo-spectral, 2/3 rule, integrating-factor RK4',
  tex: '\\frac{\\partial \\hat\\omega_{\\mathbf{k}}}{\\partial t} = -\\widehat{(\\mathbf{u}\\cdot\\nabla\\omega)}_{\\mathbf{k}} - \\left(\\nu k^2 + \\nu_h k^{2p}\\right)\\hat\\omega_{\\mathbf{k}}, \\qquad \\hat\\psi_{\\mathbf{k}} = \\hat\\omega_{\\mathbf{k}} / k^2',
  order: 4,
  spaceOrder: Infinity,
  stability: 'advective CFL: dt (max|u| + max|v|) kmax <= 2.83 (RK4 on the imaginary axis), i.e. max(|u|,|v|) dt / dx <~ 0.68 with the 2/3 rule; use <= 0.5. Viscosity and hyperviscosity are unconditionally stable through the integrating factor (with integratingFactor = false they need (nu k^2 + nuH k^2p) dt <= 2.79)',
  stabilityTex: '\\Delta t\\,\\frac{\\max|\\mathbf{u}|}{\\Delta x} \\lesssim 0.5',
  fftsPerStep: 12,
  cost: 'about 1 ms per step at 64^2 and 4.5 ms at 128^2 in desktop node; a phone is 3-5x slower, so run 128^2 (heavy) presets at one step every 2-3 frames',
};

export const TURB2D_PRESETS = {
  decay: {
    id: 'decay',
    name: 'Decaying turbulence',
    description: 'Random vorticity with its energy peaked at k = 6 on 64 x 64 organises into coherent vortices that merge. Enstrophy cascades to small scales and is dissipated; energy moves to larger scales and is nearly conserved (hyperviscosity confines dissipation to the top of the band).',
    params: { n: 64, nu: 1e-5, nuH: 1e-10, p: 4, dealias: true, ic: 'random', kPeak: 6, energy: 0.5, seed: 7, dt: 0.015 },
  },
  'decay-128': {
    id: 'decay-128',
    name: 'Decaying turbulence (128², heavy)',
    description: 'The same experiment on a 128 x 128 grid with the peak at k = 10: a wider band of scales. About 4.5 ms per step in desktop node, so on a phone take one step every 2-3 frames.',
    heavy: true,
    params: { n: 128, nu: 1e-5, nuH: 5e-13, p: 4, dealias: true, ic: 'random', kPeak: 10, energy: 0.5, seed: 7, dt: 0.006 },
  },
  aliased: {
    id: 'aliased',
    name: 'Aliased: no 2/3 rule',
    description: 'Random vorticity peaked at k = 6 on 64 x 64 with little viscosity and no dealiasing. Aliasing errors feed energy and enstrophy into the grid scale until the run blows up near t = 0.8 (the nonlinear instability of Phillips 1959).',
    broken: true,
    params: { n: 64, nu: 1e-4, dealias: false, ic: 'random', kPeak: 6, energy: 0.5, seed: 2, dt: 0.01 },
  },
  dealiased: {
    id: 'dealiased',
    name: 'Dealiased: 2/3 rule',
    description: 'The same run with the 2/3 rule. The truncated system conserves energy and enstrophy exactly apart from viscosity, so nothing can grow without bound.',
    params: { n: 64, nu: 1e-4, dealias: true, ic: 'random', kPeak: 6, energy: 0.5, seed: 2, dt: 0.01 },
  },
  merger: {
    id: 'merger',
    name: 'Vortex merger',
    description: 'Two equal Gaussian vortices of the same sign, core radius a = 0.3 at separation b = 1.2 (a/b = 0.25, above the critical ~0.22): they co-rotate counter-clockwise, draw together by t ~ 2.5, shed spiral arms and leave a single core by t ~ 6.',
    params: { n: 64, nu: 5e-4, dealias: true, ic: 'merger', radius: 0.3, separation: 1.2, circulation: 2 * Math.PI, dt: 0.015 },
  },
  'merger-128': {
    id: 'merger-128',
    name: 'Vortex merger (128², heavy)',
    description: 'The same merger on 128 x 128, with finer spiral arms. About 4.5 ms per step in desktop node, so on a phone take one step every 2-3 frames.',
    heavy: true,
    params: { n: 128, nu: 5e-4, dealias: true, ic: 'merger', radius: 0.3, separation: 1.2, circulation: 2 * Math.PI, dt: 0.0075 },
  },
  'no-merger': {
    id: 'no-merger',
    name: 'Vortex pair that does not merge',
    description: 'Smaller cores, a = 0.2 at b = 1.5 (a/b = 0.13, and still only 0.17 at t = 30 as viscosity spreads the cores): the pair just co-rotates, still two vortices at t = 30.',
    params: { n: 64, nu: 2e-4, dealias: true, ic: 'merger', radius: 0.2, separation: 1.5, circulation: 2 * Math.PI, dt: 0.0125 },
  },
  'shear-layer': {
    id: 'shear-layer',
    name: 'Double shear layer',
    description: 'Two shear layers of width pi/10 with a small sinusoidal kick roll up into Kelvin-Helmholtz vortices. This is the classic test (Bell, Colella & Glaz 1989; Brown & Minion 1995) rescaled to a 2 pi box, made 1.5 times thicker and 3 times more viscous (Re = U width / nu ~ 160) so that 64 points resolve the braids.',
    params: { n: 64, nu: 2e-3, dealias: true, ic: 'shear-layer', width: Math.PI / 10, kick: 0.05, dt: 0.02 },
  },
  'shear-layer-128': {
    id: 'shear-layer-128',
    name: 'Double shear layer (128², heavy)',
    description: 'The classic thickness, width pi/15 (rho = 30 in Brown & Minion 1995), with nu = 6.3e-4, on 128 x 128. About 4.5 ms per step in desktop node, so on a phone take one step every 2-3 frames.',
    heavy: true,
    params: { n: 128, nu: 6.3e-4, dealias: true, ic: 'shear-layer', width: Math.PI / 15, kick: 0.05, dt: 0.01 },
  },
  cellular: {
    id: 'cellular',
    name: 'Single-mode cellular flow',
    description: 'omega = cos(3x + 2y): an exact steady solution of the Euler equations (u . grad omega = 0) that only decays, at exactly exp(-2 nu k^2 t) in energy.',
    params: { n: 64, nu: 0.01, dealias: true, ic: 'mode', mode: [3, 2], amplitude: 1, dt: 0.02 },
  },
};

// Create a 2-D state. Options:
//   n (64 | 128 | any power of two), nu, nuH (hyperviscosity), p (its order,
//   dissipation nuH k^(2p)), dealias, dt, and an initial condition `ic`:
//   'random' (kPeak, energy, seed: E(k) ~ k^4 exp(-2 (k/kPeak)^2), random phases),
//   'merger' (radius, separation, circulation), 'shear-layer' (width, kick),
//   'mode' (mode: [mx, my], amplitude): omega = A cos(mx x + my y),
//   or a function omega0(x, y). integratingFactor (default true): false treats
//   the dissipation explicitly (see header). dealias, integratingFactor, nu,
//   nuH and p may all be changed on the state between steps.
export function createTurb2D(opts = {}) {
  const o = { n: 64, nu: 1e-3, nuH: 0, p: 4, dealias: true, integratingFactor: true, dt: 0.01, ic: 'random', ...opts };
  const n = o.n;
  fftPlan(n);
  const m = n * n;
  const F = () => new Float64Array(m);
  const s = {
    n,
    L: TAU,
    dx: TAU / n,
    nu: o.nu,
    nuH: o.nuH,
    p: o.p,
    dealias: o.dealias,
    integratingFactor: o.integratingFactor,
    dt: o.dt,
    t: 0,
    steps: 0,
    kmax: Math.floor((n - 1) / 3),
    wRe: F(),
    wIm: F(), // state: FFT of omega
    tRe: F(),
    tIm: F(), // stage input
    nRe: F(),
    nIm: F(), // stage output N(.)
    aRe: F(),
    aIm: F(), // RK accumulator
    p1Re: F(),
    p1Im: F(), // u + i v on the grid
    p2Re: F(),
    p2Im: F(), // omega_x + i omega_y on the grid
    kx: new Float64Array(n), // derivative wavenumbers (Nyquist -> 0)
    k2: F(), // |k|^2 (true values)
    inv: F(), // 1/|k|^2 (0 at k = 0)
    mask: new Uint8Array(m), // 1 where the bin is kept
    shell: new Uint16Array(m), // round(|k|)
    Lk: F(), // dissipation rate nu k^2 + nuH k^(2p) per bin
    E: F(),
    E2: F(),
    _dt: NaN,
    _nu: NaN,
    _nuH: NaN,
    _p: NaN,
    _if: null,
    _dealias: null,
    umax: 0,
    cfl: 0,
  };
  for (let j = 0; j < n; j++) s.kx[j] = j === n / 2 ? 0 : j < n / 2 ? j : j - n;
  for (let jy = 0; jy < n; jy++) {
    const ky = jy < n / 2 ? jy : jy - n;
    for (let jx = 0; jx < n; jx++) {
      const kx = jx < n / 2 ? jx : jx - n;
      const q = jx + jy * n;
      const k2 = kx * kx + ky * ky;
      s.k2[q] = k2;
      s.inv[q] = k2 > 0 ? 1 / k2 : 0;
      s.shell[q] = Math.round(Math.sqrt(k2));
    }
  }
  setMask(s);
  const w0 = initialVorticity(s, o);
  if (w0) turbSetVorticity(s, w0);
  else turbRandomVorticity(s, o);
  return s;
}

function setMask(s) {
  const { n } = s;
  const km = s.dealias ? s.kmax : n / 2 - 1;
  for (let jy = 0; jy < n; jy++) {
    const ky = Math.abs(jy < n / 2 ? jy : jy - n);
    for (let jx = 0; jx < n; jx++) {
      const kx = Math.abs(jx < n / 2 ? jx : jx - n);
      s.mask[jx + jy * n] = kx <= km && ky <= km ? 1 : 0;
    }
  }
  s._dealias = s.dealias;
}

function initialVorticity(s, o) {
  const { n, dx } = s;
  const w = new Float64Array(n * n);
  const ic = o.ic;
  if (typeof ic === 'function') {
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) w[i + j * n] = ic(i * dx, j * dx);
  } else if (ic === 'mode') {
    const [mx, my] = o.mode ?? [3, 2];
    const A = o.amplitude ?? 1;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) w[i + j * n] = A * Math.cos(mx * i * dx + my * j * dx);
  } else if (ic === 'merger') {
    // Two Gaussian vortices omega = Gamma/(pi a^2) exp(-r^2/a^2), centred
    // at (pi -/+ b/2, pi), summed over periodic images.
    const a = o.radius ?? 0.35;
    const b = o.separation ?? 1.2;
    const G = o.circulation ?? TAU;
    const w0 = G / (Math.PI * a * a);
    const cs = [
      [Math.PI - b / 2, Math.PI],
      [Math.PI + b / 2, Math.PI],
    ];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        let v = 0;
        for (const [cx, cy] of cs)
          for (let ox = -1; ox <= 1; ox++)
            for (let oy = -1; oy <= 1; oy++) {
              const ddx = i * dx - cx + ox * TAU;
              const ddy = j * dx - cy + oy * TAU;
              v += w0 * Math.exp(-(ddx * ddx + ddy * ddy) / (a * a));
            }
        w[i + j * n] = v;
      }
  } else if (ic === 'shear-layer') {
    // u = tanh((y - pi/2)/d) for y <= pi, tanh((3 pi/2 - y)/d) above;
    // v = kick sin(x). omega = dv/dx - du/dy.
    const d = o.width ?? Math.PI / 15;
    const kick = o.kick ?? 0.05;
    for (let j = 0; j < n; j++) {
      const y = j * dx;
      const dudy = y <= Math.PI ? 1 / (d * Math.cosh((y - Math.PI / 2) / d) ** 2) : -1 / (d * Math.cosh((1.5 * Math.PI - y) / d) ** 2);
      for (let i = 0; i < n; i++) w[i + j * n] = kick * Math.cos(i * dx) - dudy;
    }
  } else if (ic === 'random') {
    return null; // built in spectral space by turbRandomVorticity
  } else throw new Error(`createTurb2D: unknown ic ${ic}`);
  return w;
}

// Replace the state with the grid vorticity w (length N^2, index i + j N).
// Removes the mean (a periodic box cannot hold net circulation) and applies
// the current truncation.
export function turbSetVorticity(s, w) {
  const { n, wRe, wIm, mask } = s;
  const m = n * n;
  for (let q = 0; q < m; q++) {
    wRe[q] = w[q];
    wIm[q] = 0;
  }
  fft2(wRe, wIm, n, n);
  wRe[0] = 0;
  wIm[0] = 0;
  for (let q = 0; q < m; q++)
    if (!mask[q]) {
      wRe[q] = 0;
      wIm[q] = 0;
    }
  s.umax = 0; // stale; turbSuggestDt recomputes it
}

// Random field with E(k) ~ k^4 exp(-2 (k/kPeak)^2) (peak at kPeak), from
// seeded white noise filtered in spectral space, scaled to energy `energy`.
// Each shell holds ~ pi k modes of a half plane, so |omega_k|^2 ~ k E(k).
export function turbRandomVorticity(s, { kPeak = 10, energy = 0.5, seed = 1 } = {}) {
  const { n, wRe, wIm, mask, k2 } = s;
  const r = rng(seed);
  const m = n * n;
  for (let q = 0; q < m; q++) {
    wRe[q] = gaussian(r);
    wIm[q] = 0;
  }
  fft2(wRe, wIm, n, n);
  for (let q = 0; q < m; q++) {
    const k = Math.sqrt(k2[q]);
    const Ek = k ** 4 * Math.exp(-2 * (k / kPeak) ** 2);
    const f = q === 0 || !mask[q] ? 0 : Math.sqrt(k * Ek);
    wRe[q] *= f;
    wIm[q] *= f;
  }
  const e = turbEnergy(s);
  const sc = e > 0 ? Math.sqrt(energy / e) : 0;
  for (let q = 0; q < m; q++) {
    wRe[q] *= sc;
    wIm[q] *= sc;
  }
  s.umax = 0;
}

// Dissipation rate per bin, Lk = nu k^2 + nuH k^(2p), recomputed only when
// nu, nuH or p change (so diagnostics can reuse it without Math.pow).
function refreshRates(s) {
  if (s.nu === s._nu && s.nuH === s._nuH && s.p === s._p) return;
  const { k2, Lk } = s;
  const m = s.n * s.n;
  for (let q = 0; q < m; q++) Lk[q] = s.nu * k2[q] + (s.nuH ? s.nuH * Math.pow(k2[q], s.p) : 0);
  s._nu = s.nu;
  s._nuH = s.nuH;
  s._p = s.p;
  s._dt = NaN; // the integrating factors depend on Lk
}

// Integrating factors E = exp(-Lk dt / 2), E2 = E^2 (all 1 when the
// integrating factor is switched off).
function refreshFactors(s, dt) {
  refreshRates(s);
  const useIF = !!s.integratingFactor;
  if (dt === s._dt && useIF === s._if) return;
  const { Lk, E, E2 } = s;
  const m = s.n * s.n;
  for (let q = 0; q < m; q++) {
    E[q] = useIF ? Math.exp(-0.5 * Lk[q] * dt) : 1;
    E2[q] = E[q] * E[q];
  }
  s._dt = dt;
  s._if = useIF;
}

// N(w) = -FFT(u omega_x + v omega_y), masked; with the integrating factor off
// it also carries -Lk w. Reads (inRe, inIm), writes (nRe, nIm). Records
// max(|u|, |v|) when `track` is set.
function advection(s, inRe, inIm, track) {
  const { n, kx, inv, mask, p1Re, p1Im, p2Re, p2Im, nRe, nIm } = s;
  for (let jy = 0; jy < n; jy++) {
    const ky = kx[jy];
    const row = jy * n;
    for (let jx = 0; jx < n; jx++) {
      const q = row + jx;
      const kxx = kx[jx];
      const wr = inRe[q];
      const wi = inIm[q];
      const pr = wr * inv[q];
      const pi = wi * inv[q];
      // u + i v with u = i ky psi, v = -i kx psi
      p1Re[q] = kxx * pr - ky * pi;
      p1Im[q] = ky * pr + kxx * pi;
      // omega_x + i omega_y with omega_x = i kx omega, omega_y = i ky omega
      p2Re[q] = -kxx * wi - ky * wr;
      p2Im[q] = kxx * wr - ky * wi;
    }
  }
  const band = s.dealias ? s.kmax : 0; // pruned transforms for 2/3-rule data
  fft2(p1Re, p1Im, n, n, true, band);
  fft2(p2Re, p2Im, n, n, true, band);
  const m = n * n;
  let um = 0;
  if (track) {
    for (let q = 0; q < m; q++) {
      const a = Math.abs(p1Re[q]);
      const b = Math.abs(p1Im[q]);
      if (a > um) um = a;
      if (b > um) um = b;
    }
    s.umax = um;
  }
  for (let q = 0; q < m; q++) {
    nRe[q] = -(p1Re[q] * p2Re[q] + p1Im[q] * p2Im[q]);
    nIm[q] = 0;
  }
  fft2(nRe, nIm, n, n, false, band);
  for (let q = 0; q < m; q++)
    if (!mask[q]) {
      nRe[q] = 0;
      nIm[q] = 0;
    }
  if (!s.integratingFactor) {
    const { Lk } = s;
    for (let q = 0; q < m; q++) {
      nRe[q] -= Lk[q] * inRe[q];
      nIm[q] -= Lk[q] * inIm[q];
    }
  }
}

// Advance one IF-RK4 step of size dt (default s.dt). Mutates s, allocates
// nothing, returns s. Afterwards s.umax is max(|u|, |v|) at the start of the
// step and s.cfl the CFL number umax dt / dx actually used.
export function stepTurb2D(s, dt = s.dt) {
  const { n, wRe, wIm, tRe, tIm, nRe, nIm, aRe, aIm, E, E2, mask } = s;
  const m = n * n;
  if (s.dealias !== s._dealias) setMask(s);
  refreshFactors(s, dt);
  for (let q = 0; q < m; q++)
    if (!mask[q]) {
      wRe[q] = 0;
      wIm[q] = 0;
    }
  advection(s, wRe, wIm, true);
  for (let q = 0; q < m; q++) {
    const e = E[q];
    aRe[q] = E2[q] * dt * nRe[q];
    aIm[q] = E2[q] * dt * nIm[q];
    tRe[q] = e * (wRe[q] + 0.5 * dt * nRe[q]);
    tIm[q] = e * (wIm[q] + 0.5 * dt * nIm[q]);
  }
  advection(s, tRe, tIm, false);
  for (let q = 0; q < m; q++) {
    const e = E[q];
    aRe[q] += 2 * e * dt * nRe[q];
    aIm[q] += 2 * e * dt * nIm[q];
    tRe[q] = e * wRe[q] + 0.5 * dt * nRe[q];
    tIm[q] = e * wIm[q] + 0.5 * dt * nIm[q];
  }
  advection(s, tRe, tIm, false);
  for (let q = 0; q < m; q++) {
    const e = E[q];
    aRe[q] += 2 * e * dt * nRe[q];
    aIm[q] += 2 * e * dt * nIm[q];
    tRe[q] = E2[q] * wRe[q] + e * dt * nRe[q];
    tIm[q] = E2[q] * wIm[q] + e * dt * nIm[q];
  }
  advection(s, tRe, tIm, false);
  for (let q = 0; q < m; q++) {
    wRe[q] = E2[q] * wRe[q] + (aRe[q] + dt * nRe[q]) / 6;
    wIm[q] = E2[q] * wIm[q] + (aIm[q] + dt * nIm[q]) / 6;
  }
  s.t += dt;
  s.steps++;
  s.cfl = (s.umax * dt) / s.dx;
  return s;
}

// Time step for a target CFL number (default 0.5): min(dtMax, cfl dx / umax),
// umax = max(|u|, |v|). After a step it reuses s.umax from the start of that
// step (no extra FFT); before the first step, or after turbSetVorticity, it
// computes the velocity. dtMax (default 10 s.dt) keeps a quiescent or tiny
// field from asking for an enormous step.
export function turbSuggestDt(s, cfl = 0.5, dtMax = 10 * s.dt) {
  let um = s.umax;
  if (!(um > 0)) {
    turbVelocity(s, s.p1Re, s.p1Im);
    um = 0;
    for (let q = 0; q < s.n * s.n; q++) um = Math.max(um, Math.abs(s.p1Re[q]), Math.abs(s.p1Im[q]));
  }
  return Math.min(dtMax, (cfl * s.dx) / um);
}

// Grid vorticity into out (length N^2, index i + j N).
export function turbVorticity(s, out) {
  const { n, wRe, wIm, p2Re, p2Im } = s;
  const m = n * n;
  for (let q = 0; q < m; q++) {
    p2Re[q] = wRe[q];
    p2Im[q] = wIm[q];
  }
  fft2(p2Re, p2Im, n, n, true);
  for (let q = 0; q < m; q++) out[q] = p2Re[q];
  return out;
}

// Grid velocity (u, v) into uOut, vOut (length N^2). uOut/vOut may be the
// state's own scratch arrays.
export function turbVelocity(s, uOut, vOut) {
  const { n, kx, inv, wRe, wIm, p1Re, p1Im } = s;
  for (let jy = 0; jy < n; jy++) {
    const ky = kx[jy];
    for (let jx = 0; jx < n; jx++) {
      const q = jx + jy * n;
      const pr = wRe[q] * inv[q];
      const pi = wIm[q] * inv[q];
      p1Re[q] = kx[jx] * pr - ky * pi;
      p1Im[q] = ky * pr + kx[jx] * pi;
    }
  }
  fft2(p1Re, p1Im, n, n, true);
  if (uOut !== p1Re) for (let q = 0; q < n * n; q++) uOut[q] = p1Re[q];
  if (vOut !== p1Im) for (let q = 0; q < n * n; q++) vOut[q] = p1Im[q];
}

// Mean kinetic energy <|u|^2>/2 = sum |w_k|^2 / (2 k^2 N^4).
export function turbEnergy(s) {
  const { wRe, wIm, inv } = s;
  const m = s.n * s.n;
  let e = 0;
  for (let q = 0; q < m; q++) e += (wRe[q] * wRe[q] + wIm[q] * wIm[q]) * inv[q];
  return e / (2 * m * m);
}

// Mean enstrophy <omega^2>/2 = sum |w_k|^2 / (2 N^4).
export function turbEnstrophy(s) {
  const { wRe, wIm } = s;
  const m = s.n * s.n;
  let z = 0;
  for (let q = 0; q < m; q++) z += wRe[q] * wRe[q] + wIm[q] * wIm[q];
  return z / (2 * m * m);
}

// Shell-summed energy spectrum E(k), k = 0 .. turbShells(s) - 1, into out.
// sum_k E(k) = turbEnergy(s).
export function turbSpectrum(s, out) {
  const { wRe, wIm, inv, shell } = s;
  const m = s.n * s.n;
  out.fill(0);
  const c = 1 / (2 * m * m);
  for (let q = 0; q < m; q++) out[shell[q]] += c * (wRe[q] * wRe[q] + wIm[q] * wIm[q]) * inv[q];
  return out;
}

// Length of the spectrum array: shells up to the corner of the grid.
export const turbShells = (s) => Math.round(Math.SQRT2 * (s.n / 2)) + 1;

// Energy dissipation rate eps = 2 nu Z + hyperviscous part, from the state:
// sum 2 Lk |w_k|^2 / (2 k^2 N^4), using the cached rates Lk.
export function turbDissipation(s) {
  refreshRates(s);
  const { wRe, wIm, inv, Lk } = s;
  const m = s.n * s.n;
  let d = 0;
  for (let q = 0; q < m; q++) d += Lk[q] * inv[q] * (wRe[q] * wRe[q] + wIm[q] * wIm[q]);
  return d / (m * m);
}

// ===========================================================================
// (b) Sabra shell model

export const SABRA_PRESETS = {
  k41: {
    id: 'k41',
    name: 'Long cascade (22 shells)',
    description: 'Constant forcing on the first shell and nu = 1e-7: an inertial range of about 12 shells where <|u_n|^2> falls nearly as k_n^(-2/3), i.e. E(k) ~ k^-5/3.',
    params: { shells: 22, nu: 1e-7, forcing: [[0, 0.5, 0.5]], dt: 3e-5, seed: 1 },
  },
  medium: {
    id: 'medium',
    name: 'Medium cascade (20 shells)',
    description: 'nu = 1e-6: about 9 inertial shells, three times cheaper per unit time.',
    params: { shells: 20, nu: 1e-6, forcing: [[0, 0.5, 0.5]], dt: 1e-4, seed: 1 },
  },
  short: {
    id: 'short',
    name: 'Short cascade (16 shells)',
    description: 'nu = 1e-5: a short inertial range, cheap enough to average for hundreds of large-eddy times in a second.',
    params: { shells: 16, nu: 1e-5, forcing: [[0, 0.5, 0.5]], dt: 5e-4, seed: 1 },
  },
  inviscid: {
    id: 'inviscid',
    name: 'Inviscid, unforced',
    description: 'nu = 0 and no forcing: the energy sum |u_n|^2 / 2 and the helicity-like sum (-2)^n |u_n|^2 / 2 are both conserved while energy sloshes between shells.',
    params: { shells: 12, nu: 0, forcing: [], dt: 1e-4, seed: 3, amp: 1 },
  },
  'stiff-explicit': {
    id: 'stiff-explicit',
    name: 'Explicit viscosity: stiff blow-up (22 shells)',
    description: 'The long cascade with the viscous term inside RK4 instead of the integrating factor. The top shells have nu k_n^2 dt = 13 and 3.3, beyond RK4\'s 2.79 on the negative real axis, so once the cascade reaches them they grow up to 1000-fold per step and the run blows up (t ~ 1), at a time step the integrating-factor run takes in its stride.',
    broken: true,
    params: { shells: 22, nu: 1e-7, forcing: [[0, 0.5, 0.5]], dt: 3e-5, seed: 1, integratingFactor: false },
  },
};

export const SABRA_SCHEME = {
  id: 'sabra',
  name: 'Sabra shell model, integrating-factor RK4',
  tex: '\\frac{\\mathrm{d}u_n}{\\mathrm{d}t} = i\\left(a k_{n+1} u_{n+2} u_{n+1}^{*} + b k_n u_{n+1} u_{n-1}^{*} - c k_{n-1} u_{n-1} u_{n-2}\\right) - \\nu k_n^2 u_n + f_n',
  order: 4,
  stability: 'the viscous term is exact (integrating factor), so nu k_n^2 dt may be >> 1 (with integratingFactor = false every shell needs nu k_n^2 dt <= 2.79); dt must resolve the fastest nonlinear time, which in bursts is several times shorter than the Kolmogorov time tau_eta = (nu/eps)^(1/2): dt ~ 0.1 tau_eta is safe (0.18 tau_eta blew up in a 22-shell run)',
  k41Tex: '\\langle |u_n|^p \\rangle \\propto k_n^{-\\zeta_p}, \\quad \\zeta_p^{\\mathrm{K41}} = p/3',
};

// Create a Sabra state with S = shells shells, k_n = k0 lambda^n, n = 0..S-1.
// forcing: list of [n, re, im] constant complex forces. The initial field is
// small random noise with a K41-like amplitude k_n^(-1/3) (seeded), times amp.
// integratingFactor = false treats viscosity explicitly (may be toggled on
// the state between steps).
export function createSabra({ shells = 22, k0 = 1, lambda = 2, a = 1, b = -0.5, nu = 1e-7, forcing = [[0, 0.5, 0.5]], dt = 3e-5, seed = 1, amp = 0.1, integratingFactor = true } = {}) {
  const S = shells;
  const F = () => new Float64Array(S);
  const s = {
    S,
    k0,
    lambda,
    a,
    b,
    c: -a - b,
    nu,
    dt,
    integratingFactor,
    t: 0,
    steps: 0,
    k: F(),
    uRe: F(),
    uIm: F(),
    fRe: F(),
    fIm: F(),
    tRe: F(),
    tIm: F(),
    nRe: F(),
    nIm: F(),
    aRe: F(),
    aIm: F(),
    E: F(),
    E2: F(),
    _dt: NaN,
    _nu: NaN,
    _if: null,
    // statistics: count, sums of |u_n|^p for p = 1..6, flux, injection
    stats: { count: 0, sp: new Float64Array(6 * S), flux: F(), fluxAbs: new Float64Array(6 * S), inject: 0, energy: 0 },
  };
  for (let n = 0; n < S; n++) s.k[n] = k0 * lambda ** n;
  for (const [n, re, im] of forcing) {
    s.fRe[n] += re;
    s.fIm[n] += im;
  }
  const r = rng(seed);
  for (let n = 0; n < S; n++) {
    const A = amp * s.k[n] ** (-1 / 3) * Math.exp(-s.k[n] / s.k[Math.min(S - 1, 6)]);
    const ph = TAU * r();
    s.uRe[n] = A * Math.cos(ph);
    s.uIm[n] = A * Math.sin(ph);
  }
  return s;
}

// Nonlinear terms plus forcing, G(u) = du/dt - (-nu k^2 u), plus -nu k^2 u
// itself when the integrating factor is off. Writes (nRe, nIm).
function sabraN(s, uRe, uIm) {
  const { S, k, a, b, c, fRe, fIm, nRe, nIm } = s;
  for (let n = 0; n < S; n++) {
    // z = a k_{n+1} u_{n+2} u*_{n+1} + b k_n u_{n+1} u*_{n-1} - c k_{n-1} u_{n-1} u_{n-2}
    let zr = 0;
    let zi = 0;
    if (n + 2 < S) {
      const xr = uRe[n + 2];
      const xi = uIm[n + 2];
      const yr = uRe[n + 1];
      const yi = -uIm[n + 1];
      const kk = a * k[n + 1];
      zr += kk * (xr * yr - xi * yi);
      zi += kk * (xr * yi + xi * yr);
    }
    if (n >= 1 && n + 1 < S) {
      const xr = uRe[n + 1];
      const xi = uIm[n + 1];
      const yr = uRe[n - 1];
      const yi = -uIm[n - 1];
      const kk = b * k[n];
      zr += kk * (xr * yr - xi * yi);
      zi += kk * (xr * yi + xi * yr);
    }
    if (n >= 2) {
      const xr = uRe[n - 1];
      const xi = uIm[n - 1];
      const yr = uRe[n - 2];
      const yi = uIm[n - 2];
      const kk = -c * k[n - 1];
      zr += kk * (xr * yr - xi * yi);
      zi += kk * (xr * yi + xi * yr);
    }
    // i z + f
    nRe[n] = -zi + fRe[n];
    nIm[n] = zr + fIm[n];
  }
  if (!s.integratingFactor && s.nu) {
    for (let n = 0; n < S; n++) {
      const d = s.nu * k[n] * k[n];
      nRe[n] -= d * uRe[n];
      nIm[n] -= d * uIm[n];
    }
  }
}

// Advance one IF-RK4 step (default s.dt). Mutates s, allocates nothing,
// returns s.
export function stepSabra(s, dt = s.dt) {
  const { S, uRe, uIm, tRe, tIm, nRe, nIm, aRe, aIm, E, E2 } = s;
  const useIF = !!s.integratingFactor;
  if (dt !== s._dt || s.nu !== s._nu || useIF !== s._if) {
    for (let n = 0; n < S; n++) {
      E[n] = useIF ? Math.exp(-0.5 * s.nu * s.k[n] * s.k[n] * dt) : 1;
      E2[n] = E[n] * E[n];
    }
    s._dt = dt;
    s._nu = s.nu;
    s._if = useIF;
  }
  sabraN(s, uRe, uIm);
  for (let n = 0; n < S; n++) {
    aRe[n] = E2[n] * dt * nRe[n];
    aIm[n] = E2[n] * dt * nIm[n];
    tRe[n] = E[n] * (uRe[n] + 0.5 * dt * nRe[n]);
    tIm[n] = E[n] * (uIm[n] + 0.5 * dt * nIm[n]);
  }
  sabraN(s, tRe, tIm);
  for (let n = 0; n < S; n++) {
    aRe[n] += 2 * E[n] * dt * nRe[n];
    aIm[n] += 2 * E[n] * dt * nIm[n];
    tRe[n] = E[n] * uRe[n] + 0.5 * dt * nRe[n];
    tIm[n] = E[n] * uIm[n] + 0.5 * dt * nIm[n];
  }
  sabraN(s, tRe, tIm);
  for (let n = 0; n < S; n++) {
    aRe[n] += 2 * E[n] * dt * nRe[n];
    aIm[n] += 2 * E[n] * dt * nIm[n];
    tRe[n] = E2[n] * uRe[n] + E[n] * dt * nRe[n];
    tIm[n] = E2[n] * uIm[n] + E[n] * dt * nIm[n];
  }
  sabraN(s, tRe, tIm);
  for (let n = 0; n < S; n++) {
    uRe[n] = E2[n] * uRe[n] + (aRe[n] + dt * nRe[n]) / 6;
    uIm[n] = E2[n] * uIm[n] + (aIm[n] + dt * nIm[n]) / 6;
  }
  s.t += dt;
  s.steps++;
  return s;
}

// A time step from the current fastest nonlinear rate max_n k_n |u_n|:
// dt = safety / rate. In the 22-shell preset that rate reaches ~5/tau_eta in
// bursts; the preset's fixed dt corresponds to safety ~ 0.5 at the worst burst
// and twice that step blew up, so keep safety <= 0.4 if you adapt dt.
// dtMax (default 10 s.dt) caps the step for a quiescent field.
export function sabraSuggestDt(s, safety = 0.4, dtMax = 10 * s.dt) {
  const { uRe, uIm, k } = s;
  let r = 0;
  for (let n = 0; n < s.S; n++) r = Math.max(r, k[n] * Math.sqrt(uRe[n] * uRe[n] + uIm[n] * uIm[n]));
  return Math.min(dtMax, safety / r);
}

// Energy (1/2) sum |u_n|^2.
export function sabraEnergy(s) {
  let e = 0;
  for (let n = 0; n < s.S; n++) e += s.uRe[n] * s.uRe[n] + s.uIm[n] * s.uIm[n];
  return 0.5 * e;
}

// Second quadratic invariant (1/2) sum (a/c)^n |u_n|^2; for a = 1, b = c = -1/2
// it is (1/2) sum (-2)^n |u_n|^2, the helicity-like invariant (with k0 = 1).
export function sabraHelicity(s) {
  const r = s.a / s.c;
  let h = 0;
  let w = 1;
  for (let n = 0; n < s.S; n++) {
    h += w * (s.uRe[n] * s.uRe[n] + s.uIm[n] * s.uIm[n]);
    w *= r;
  }
  return 0.5 * h;
}

// Im(u*_{m-1} u*_m u_{m+1}) for the triad centred on shell m (0 at the ends).
function triad(s, m) {
  if (m < 1 || m + 1 >= s.S) return 0;
  const { uRe, uIm } = s;
  // p = u*_{m-1} u*_m
  const pr = uRe[m - 1] * uRe[m] - uIm[m - 1] * uIm[m];
  const pi = -(uRe[m - 1] * uIm[m] + uIm[m - 1] * uRe[m]);
  return pr * uIm[m + 1] + pi * uRe[m + 1];
}

// Energy flux Pi_n out of shells 0..n through the nonlinear terms, into out
// (length S): Pi_n = a k_{n+1} T_{n+1} - c k_n T_n, T_m = Im(u*_{m-1} u*_m u_{m+1}).
export function sabraFlux(s, out) {
  const { S, k, a, c } = s;
  for (let n = 0; n < S; n++) out[n] = (n + 1 < S ? a * k[n + 1] * triad(s, n + 1) : 0) - c * k[n] * triad(s, n);
  return out;
}

// Energy injection rate by the forcing, sum Re(f_n u*_n).
export function sabraInjection(s) {
  let p = 0;
  for (let n = 0; n < s.S; n++) p += s.fRe[n] * s.uRe[n] + s.fIm[n] * s.uIm[n];
  return p;
}

// Add the current state to the running statistics.
export function sabraAccumulate(s) {
  const st = s.stats;
  const { S, uRe, uIm, k, a, c } = s;
  st.count++;
  for (let n = 0; n < S; n++) {
    const m = Math.sqrt(uRe[n] * uRe[n] + uIm[n] * uIm[n]); // not Math.hypot: it allocates in V8
    let q = m;
    for (let p = 0; p < 6; p++) {
      st.sp[p * S + n] += q;
      q *= m;
    }
    const tn = triad(s, n);
    st.flux[n] += (n + 1 < S ? a * k[n + 1] * triad(s, n + 1) : 0) - c * k[n] * tn;
    // flux-based structure function |T_n|^(p/3) (removes the phase oscillation)
    const at = Math.abs(tn);
    const r3 = Math.cbrt(at);
    let v = r3;
    for (let p = 0; p < 6; p++) {
      st.fluxAbs[p * S + n] += v;
      v *= r3;
    }
  }
  st.inject += sabraInjection(s);
  st.energy += sabraEnergy(s);
}

export function sabraResetStats(s) {
  const st = s.stats;
  st.count = 0;
  st.sp.fill(0);
  st.flux.fill(0);
  st.fluxAbs.fill(0);
  st.inject = 0;
  st.energy = 0;
}

// Minus the least-squares slope of ln(arr[off + n]) against ln(k[n]) over
// shells n1..n2: the exponent zeta in arr ~ k^-zeta. Allocates nothing.
function logSlope(k, arr, off, n1, n2) {
  const cnt = n2 - n1 + 1;
  let sx = 0;
  let sy = 0;
  for (let n = n1; n <= n2; n++) {
    sx += Math.log(k[n]);
    sy += Math.log(arr[off + n]);
  }
  sx /= cnt;
  sy /= cnt;
  let num = 0;
  let den = 0;
  for (let n = n1; n <= n2; n++) {
    const dx = Math.log(k[n]) - sx;
    num += dx * (Math.log(arr[off + n]) - sy);
    den += dx * dx;
  }
  return -num / den;
}

// Averages and scaling exponents from the accumulated statistics.
// range = [n1, n2] (inclusive shell indices) for the power-law fits; by
// default the shells between the forcing + 3 and the Kolmogorov shell - 3,
// where k_eta = (eps / nu^3)^(1/4) from the measured injection eps.
// Returns {
//   count, eps (mean injection), energy (mean), kEta, range,
//   k, spectrum (<|u_n|^2>), E (<|u_n|^2>/k_n, the energy spectrum),
//   S: [S_1..S_6] (each <|u_n|^p> per shell), flux (<Pi_n>),
//   zeta: [zeta_1..zeta_6] from S_p ~ k^-zeta_p,
//   zetaFlux: [...] from <|T_n|^(p/3)> (flux-based, smoother),
//   zetaK41: [1/3, 2/3, ..., 2] }
// Pass a previous result for the same state as `out` to refill it in place
// (no allocation, for a figure that redraws the statistics every frame).
export function sabraStats(s, range = null, out = null) {
  const st = s.stats;
  const { S, k } = s;
  const N = Math.max(1, st.count);
  const eps = st.inject / N;
  const kEta = s.nu > 0 && eps > 0 ? Math.pow(eps / s.nu ** 3, 0.25) : Infinity;
  let n1;
  let n2;
  if (range) {
    n1 = range[0];
    n2 = range[1];
  } else {
    let nf = 0;
    for (let n = 0; n < S; n++) if (s.fRe[n] || s.fIm[n]) nf = n;
    let ne = S - 1;
    while (ne > 0 && k[ne] > kEta) ne--;
    n1 = nf + 3;
    n2 = Math.max(nf + 5, Math.min(S - 3, ne - 3));
  }
  let o = out;
  if (!o || o.k.length !== S) {
    const Sp = [];
    for (let p = 0; p < 6; p++) Sp.push(new Float64Array(S));
    o = {
      count: 0,
      eps: 0,
      energy: 0,
      kEta: 0,
      range: [0, 0],
      k: Float64Array.from(k),
      spectrum: Sp[1],
      E: new Float64Array(S),
      S: Sp,
      flux: new Float64Array(S),
      zeta: [0, 0, 0, 0, 0, 0],
      zetaFlux: [0, 0, 0, 0, 0, 0],
      zetaK41: [1, 2, 3, 4, 5, 6].map((p) => p / 3),
    };
  }
  o.count = st.count;
  o.eps = eps;
  o.energy = st.energy / N;
  o.kEta = kEta;
  o.range[0] = n1;
  o.range[1] = n2;
  for (let p = 0; p < 6; p++) {
    const row = o.S[p];
    for (let n = 0; n < S; n++) row[n] = st.sp[p * S + n] / N;
    o.zeta[p] = logSlope(k, st.sp, p * S, n1, n2);
    o.zetaFlux[p] = logSlope(k, st.fluxAbs, p * S, n1, n2); // the 1/N shifts ln, not the slope
  }
  for (let n = 0; n < S; n++) {
    o.E[n] = o.S[1][n] / k[n];
    o.flux[n] = st.flux[n] / N;
  }
  return o;
}

// ===========================================================================
// (c) Kolmogorov scales and the cost of DNS

// Kolmogorov length, time and velocity scales (Pope 2000, sect. 6.1).
export function kolmogorovScales(nu, eps) {
  return {
    eta: Math.pow((nu * nu * nu) / eps, 0.25),
    tau: Math.sqrt(nu / eps),
    v: Math.pow(nu * eps, 0.25),
  };
}

// Scales of a flow with integral length L (m), velocity U (m/s) and kinematic
// viscosity nu (m^2/s), assuming eps = Ceps U^3 / L (Ceps ~ 1; Pope 2000,
// sect. 6.1). Returns Re = U L / nu, eps, eta, tau, v, L/eta (= Ceps^(1/4)
// Re^(3/4)), the large-eddy time L/U, and its ratio to tau (~ Re^(1/2)).
export function flowScales({ L, U, nu, Ceps = 1 }) {
  const Re = (U * L) / nu;
  const eps = (Ceps * U ** 3) / L;
  const kol = kolmogorovScales(nu, eps);
  return { Re, eps, ...kol, LoverEta: L / kol.eta, T: L / U, ToverTau: L / U / kol.tau };
}

// Order-of-magnitude cost of a pseudo-spectral DNS of homogeneous turbulence
// at the scales of a flow (Pope 2000, sect. 9.1.2). Assumptions, all options:
//   Ceps = 1            eps = Ceps U^3 / L
//   domainOverL = 4     box side in integral scales (the box must hold several
//                       of the largest eddies)
//   dxOverEta = 2       grid spacing in Kolmogorov lengths (k_max eta ~ 1.5)
//   turnovers = 10      simulated time in large-eddy times L/U
//   cfl = 0.5           dt = cfl dx / U
//   flopsPerPointStep = 1000   (about 15 FFTs per RK stage, several stages)
//   flopRate = 1e15     sustained flop/s (a petaflop machine, fully used)
// Returns { Re, eta, perSide, points, steps, flops, seconds, years } with
// perSide ~ Re^(3/4), points ~ Re^(9/4), steps ~ Re^(3/4), flops ~ Re^3.
export function dnsCost({ L, U, nu, Ceps = 1, domainOverL = 4, dxOverEta = 2, turnovers = 10, cfl = 0.5, flopsPerPointStep = 1000, flopRate = 1e15 }) {
  const { Re, eta } = flowScales({ L, U, nu, Ceps });
  const dx = dxOverEta * eta;
  const perSide = (domainOverL * L) / dx;
  const points = perSide ** 3;
  const steps = (turnovers * L) / (cfl * dx);
  const flops = points * steps * flopsPerPointStep;
  const seconds = flops / flopRate;
  return { Re, eta, dx, perSide, points, steps, flops, seconds, years: seconds / 3.156e7 };
}

export const DNS_SCALING = {
  LoverEta: { exponent: 3 / 4, tex: 'L/\\eta \\sim \\mathrm{Re}^{3/4}' },
  points: { exponent: 9 / 4, tex: 'N^3 \\sim \\mathrm{Re}^{9/4}' },
  steps: { exponent: 3 / 4, tex: 'N_t \\sim \\mathrm{Re}^{3/4}' },
  cost: { exponent: 3, tex: 'N^3 N_t \\sim \\mathrm{Re}^{3}' },
};

export const KOLMOGOROV_TEX = {
  eta: '\\eta = \\left(\\frac{\\nu^3}{\\varepsilon}\\right)^{1/4}',
  tau: '\\tau_\\eta = \\left(\\frac{\\nu}{\\varepsilon}\\right)^{1/2}',
  v: 'u_\\eta = (\\nu\\varepsilon)^{1/4}',
  eps: '\\varepsilon \\approx C_\\varepsilon \\frac{U^3}{L}',
  ratio: '\\frac{L}{\\eta} = C_\\varepsilon^{1/4}\\,\\mathrm{Re}^{3/4}, \\qquad \\mathrm{Re} = \\frac{UL}{\\nu}',
};

// Example flows for the cost table. L is the size of the energetic eddies
// (or of the body), U a typical speed, nu the kinematic viscosity at the
// stated conditions. Rough, order-of-magnitude choices.
export const EXAMPLE_FLOWS = [
  { id: 'cup', name: 'Stirred cup of tea', L: 0.05, U: 0.05, nu: 1.0e-6, note: 'spoon-stirred, water at 20 °C' },
  { id: 'hose', name: 'Garden-hose jet', L: 0.015, U: 3, nu: 1.0e-6, note: 'nozzle diameter 1.5 cm, water at 20 °C' },
  { id: 'car', name: 'Car on a motorway', L: 4.5, U: 30, nu: 1.5e-5, note: 'body length, 108 km/h, air at 20 °C' },
  { id: 'wing', name: 'Airliner wing in cruise', L: 5, U: 250, nu: 3.5e-5, note: 'mean chord, 900 km/h, air at about 11 km altitude' },
  { id: 'abl', name: 'Atmospheric boundary layer', L: 1000, U: 10, nu: 1.5e-5, note: 'layer depth 1 km, 10 m/s wind' },
];

// ===========================================================================
// (d) Pope's model spectrum

export const POPE_CONSTANTS = { C: 1.5, p0: 2, beta: 5.2, cL: 6.78, cEta: 0.4 };

export const POPE_TEX = {
  E: 'E(\\kappa) = C\\,\\varepsilon^{2/3}\\kappa^{-5/3} f_L(\\kappa L)\\, f_\\eta(\\kappa\\eta)',
  fL: 'f_L(\\kappa L) = \\left(\\frac{\\kappa L}{\\left[(\\kappa L)^2 + c_L\\right]^{1/2}}\\right)^{5/3 + p_0}',
  fEta: 'f_\\eta(\\kappa\\eta) = \\exp\\left\\{-\\beta\\left(\\left[(\\kappa\\eta)^4 + c_\\eta^4\\right]^{1/4} - c_\\eta\\right)\\right\\}',
};

// Model spectrum E(kappa) for turbulent kinetic energy k, dissipation eps and
// viscosity nu, with L = k^(3/2)/eps and eta = (nu^3/eps)^(1/4).
export function popeSpectrum(kappa, { k, eps, nu, C = 1.5, p0 = 2, beta = 5.2, cL = 6.78, cEta = 0.4 }) {
  const L = k ** 1.5 / eps;
  const eta = Math.pow(nu ** 3 / eps, 0.25);
  const x = kappa * L;
  const fL = Math.pow(x / Math.sqrt(x * x + cL), 5 / 3 + p0);
  const y = kappa * eta;
  const fEta = Math.exp(-beta * (Math.pow(y ** 4 + cEta ** 4, 0.25) - cEta));
  return C * Math.pow(eps, 2 / 3) * Math.pow(kappa, -5 / 3) * fL * fEta;
}

// int E dkappa and int 2 nu kappa^2 E dkappa over (0, inf), and the parts
// below a cutoff kc if one is given, by the trapezoid rule in ln kappa from
// 1e-6/L to 1e3/eta (the integrands are negligible beyond). With a cutoff the
// two sides are integrated separately so the split is exact in kc.
export function popeIntegrals(p, kc = Infinity, n = 4000) {
  const L = p.k ** 1.5 / p.eps;
  const eta = Math.pow(p.nu ** 3 / p.eps, 0.25);
  const a = Math.log(1e-6 / L);
  const b = Math.log(1e3 / eta);
  const part = (lo, hi, m) => {
    let tke = 0;
    let diss = 0;
    if (!(hi > lo)) return [0, 0];
    const h = (hi - lo) / m;
    for (let q = 0; q <= m; q++) {
      const kap = Math.exp(lo + q * h);
      const w = (q === 0 || q === m ? 0.5 : 1) * h * kap; // d kappa = kappa d ln kappa
      const E = popeSpectrum(kap, p);
      tke += w * E;
      diss += w * 2 * p.nu * kap * kap * E;
    }
    return [tke, diss];
  };
  const c = Math.min(b, Math.max(a, Math.log(kc)));
  const m1 = Math.max(2, Math.round((n * (c - a)) / (b - a)));
  const [t1, d1] = part(a, c, m1);
  const [t2, d2] = part(c, b, Math.max(2, n - m1));
  return { tke: t1 + t2, dissipation: d1 + d2, tkeBelow: t1, dissipationBelow: d1, L, eta };
}

// Fraction of TKE and of dissipation in wavenumbers below kc (what an LES with
// cutoff kc resolves) and above it (what its subgrid model must carry).
export function popeResolved(kc, p) {
  const I = popeIntegrals(p, kc);
  return {
    tke: I.tkeBelow / I.tke,
    dissipation: I.dissipationBelow / I.dissipation,
    tkeSubgrid: 1 - I.tkeBelow / I.tke,
    dissipationSubgrid: 1 - I.dissipationBelow / I.dissipation,
  };
}

// The cutoff wavenumber below which a fraction `frac` of the TKE lies
// (bisection in ln kappa). Pope (2004) suggests frac = 0.8 for LES.
export function popeCutoffFor(frac, p) {
  const L = p.k ** 1.5 / p.eps;
  const eta = Math.pow(p.nu ** 3 / p.eps, 0.25);
  let lo = Math.log(1e-3 / L);
  let hi = Math.log(10 / eta);
  for (let it = 0; it < 60; it++) {
    const mid = 0.5 * (lo + hi);
    if (popeResolved(Math.exp(mid), p).tke < frac) lo = mid;
    else hi = mid;
  }
  return Math.exp(0.5 * (lo + hi));
}

// Solve for c_L and c_eta so that the model spectrum integrates exactly to k
// and its dissipation integral to eps at Reynolds number Re_L = k^2/(eps nu)
// (Pope 2000, sect. 6.5.3). Alternating 1-D secant solves; returns
// { cL, cEta, ReL, ReLambda }, with Re_lambda = sqrt(20 Re_L / 3).
export function popeCoefficients(ReL, { C = 1.5, p0 = 2, beta = 5.2 } = {}) {
  const base = { k: 1, eps: 1, nu: 1 / ReL, C, p0, beta };
  let cL = 6.78;
  let cEta = 0.4;
  const solve = (f, x0, x1) => {
    let f0 = f(x0);
    let f1 = f(x1);
    for (let it = 0; it < 50 && Math.abs(f1) > 1e-12; it++) {
      const x2 = x1 - (f1 * (x1 - x0)) / (f1 - f0);
      x0 = x1;
      f0 = f1;
      x1 = Math.max(1e-6, x2);
      f1 = f(x1);
    }
    return x1;
  };
  for (let sweep = 0; sweep < 30; sweep++) {
    const prevL = cL;
    const prevE = cEta;
    cL = solve((x) => popeIntegrals({ ...base, cL: x, cEta }, Infinity, 1500).tke - 1, cL, cL * 1.05);
    cEta = solve((x) => popeIntegrals({ ...base, cL, cEta: x }, Infinity, 1500).dissipation - 1, cEta, cEta * 1.05);
    if (Math.abs(cL - prevL) < 1e-10 * cL && Math.abs(cEta - prevE) < 1e-10 * cEta) break;
  }
  return { cL, cEta, ReL, ReLambda: Math.sqrt((20 * ReL) / 3) };
}

// Log-spaced samples of the model spectrum and the dissipation spectrum
// D = 2 nu kappa^2 E, for plotting: { kappa, E, D, L, eta } (n points from
// 0.01/L to 3/eta).
export function popeCurve(p, n = 200) {
  const L = p.k ** 1.5 / p.eps;
  const eta = Math.pow(p.nu ** 3 / p.eps, 0.25);
  const a = Math.log(0.01 / L);
  const b = Math.log(3 / eta);
  const kappa = new Float64Array(n);
  const E = new Float64Array(n);
  const D = new Float64Array(n);
  for (let q = 0; q < n; q++) {
    kappa[q] = Math.exp(a + ((b - a) * q) / (n - 1));
    E[q] = popeSpectrum(kappa[q], p);
    D[q] = 2 * p.nu * kappa[q] ** 2 * E[q];
  }
  return { kappa, E, D, L, eta };
}
