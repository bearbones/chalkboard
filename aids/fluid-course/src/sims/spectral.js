// Spectral methods on a periodic interval: differentiation, aliasing, and the
// viscous Burgers equation solved pseudo-spectrally.
//
// What it does
//   1. Spectral differentiation of grid data on [0, L) (FFT, multiply by i k,
//      inverse FFT) beside periodic central finite differences of order 2, 4
//      and 6, so a figure can set exponential against algebraic convergence.
//      derivativeConvergence() is the refinement study as a generator.
//   2. aliasOf(k, N): the wavenumber that mode k masquerades as on N points.
//   3. spectralProduct(): the pseudo-spectral product of two grid signals,
//      with or without the 2/3 rule, the operation where aliasing enters.
//   4. Burgers  u_t + u u_x = nu u_xx  on [0, 2 pi), pseudo-spectral in space,
//      integrating-factor RK4 in time, with a dealiasing switch, an energy
//      spectrum and the exact Cole-Hopf solution for u0 = sin x as reference.
//
// Conventions
//   Grid x_j = j L / N, j = 0 .. N-1 (periodic, x = 0 is a grid point).
//   Spectra are unscaled FFT coefficients (see fft.js); the Fourier coefficient
//   of the series u(x) = sum_k c_k exp(i k x) is c_k = U_k / N.
//   Nondimensional: L = 2 pi by default, so wavenumbers are integers; the
//   Burgers velocity scale is the initial amplitude (1), time is x / u.
//   In first derivatives the Nyquist mode N/2 is set to zero (its derivative
//   is ambiguous on the grid; Trefethen 2000, ch. 3). This is done with or
//   without dealiasing, so "dealias off" still drops that one mode.
//
// Dealiasing
//   The 2/3 rule (Orszag 1971) keeps |k| <= kmax = floor((N - 1) / 3), so that
//   3 kmax < N: the product of two retained modes reaches |k1 + k2| <= 2 kmax,
//   and its alias k1 + k2 - N lies below -kmax, outside the kept band, where
//   it is discarded. Products are then exact on the kept modes (a Galerkin
//   truncation). The textbook statement keeps |k| < N/3; for N a power of two
//   this is the same set.
//
// Burgers time stepping (integrating factor, IF-RK4)
//   In Fourier space  dU/dt = -nu k^2 U + N(U),  N(U) = -(i k / 2) FFT(u^2).
//   With V = exp(nu k^2 t) U the stiff viscous term is integrated exactly and
//   classical RK4 handles N; the step is Trefethen 2000, Program 27 (written
//   there for KdV): with E = exp(-nu k^2 dt / 2),
//     a = dt N(U),  b = dt N(E (U + a/2)),  c = dt N(E U + b/2),
//     d = dt N(E^2 U + E c),
//     U <- E^2 U + (E^2 a + 2 E (b + c) + d) / 6.
//   The nonlinear term uses the conservative form (u^2/2)_x. With the 2/3
//   rule the inviscid semi-discrete energy sum |U_k|^2 is conserved exactly;
//   without it aliasing errors feed the top of the spectrum ("spectral
//   blocking", Boyd 2001, ch. 11) and, at low nu, blow the run up.
//   Stability: RK4's stability region reaches the imaginary axis out to
//   2 sqrt 2 = 2.83, so dt max|u| kmax <= 2.83 is a sufficient advective
//   condition (kmax = floor((N-1)/3) with the 2/3 rule, N/2 - 1 without;
//   CFL numbers max|u| dt / dx of about 1.35 and 0.9). It is sharp for a
//   uniform stream carrying a ripple in the top mode (the 'cfl-below' and
//   'cfl-above' presets; the tests measure the growth factor |R(i C)| on
//   both sides). Steep or thermalised solutions usually tolerate more,
//   because their top modes are nearly empty. There is no viscous limit
//   with the integrating factor (Trefethen 2000, ch. 10: stability regions;
//   Kassam & Trefethen 2005 on integrating-factor methods).
//   Simplification switch: integratingFactor = false treats -nu k^2 U
//   explicitly inside the same RK4 (E = 1). Then the top modes need
//   nu kmax^2 dt <= 2.79 (RK4 on the negative real axis); the
//   'stiff-explicit' preset breaks that and blows up, and 'stiff-if' is the
//   same run with the integrating factor.
//
// References
//   L. N. Trefethen (2000), Spectral Methods in MATLAB, SIAM: ch. 3 (periodic
//     differentiation), ch. 4 (smoothness and accuracy), ch. 10 and Program 27
//     (integrating-factor RK4).
//   J. P. Boyd (2001), Chebyshev and Fourier Spectral Methods, 2nd ed., Dover:
//     ch. 2 (convergence), ch. 11 (aliasing, spectral blocking, the 2/3 rule).
//   A.-K. Kassam & L. N. Trefethen (2005), SIAM J. Sci. Comput. 26, 1214
//     (integrating-factor and exponential time differencing for stiff PDEs).
//   S. A. Orszag (1971), J. Atmos. Sci. 28, 1074 (the two-thirds rule).
//   C. Canuto, M. Y. Hussaini, A. Quarteroni & T. A. Zang (2006), Spectral
//     Methods: Fundamentals in Single Domains, Springer (Fourier collocation,
//     aliasing and dealiasing).
//   B. Fornberg (1988), Math. Comp. 51, 699 (finite-difference weights).
//   S. K. Lele (1992), J. Comput. Phys. 103, 16 (modified wavenumbers).
//   J. D. Cole (1951) and E. Hopf (1950): the Cole-Hopf transformation;
//     G. B. Whitham (1974), Linear and Nonlinear Waves, Wiley, ch. 4.
//   S. S. Ray, U. Frisch, S. Nazarenko & T. Matsumoto (2011), Phys. Rev. E 84,
//     016301 (thermalisation of Galerkin-truncated Burgers and Euler).

import { wrap, rng } from './util.js';
import { fft, ifft, fftPlan, wavenumbers } from './fft.js';

const TAU = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Aliasing

// The wavenumber in (-N/2, N/2] that mode k is indistinguishable from on an
// N-point periodic grid (L = 2 pi): exp(i k x_j) = exp(i aliasOf(k, N) x_j).
// A real signal cos(k x) shows up at |aliasOf(k, N)|.
export function aliasOf(k, N) {
  let a = ((k % N) + N) % N;
  if (a > N / 2) a -= N;
  return a;
}

export const ALIASING = {
  identityTex: 'e^{i(k+N)x_j} = e^{ikx_j}, \\qquad x_j = \\frac{2\\pi j}{N}',
  productTex: 'k_1 + k_2 > \\tfrac{N}{2} \\;\\Rightarrow\\; \\text{seen at } k_1 + k_2 - N',
  ruleTex: '|k| \\le k_{\\max} = \\left\\lfloor \\frac{N-1}{3} \\right\\rfloor',
  rule: '2/3 rule (Orszag 1971): keep |k| <= floor((N-1)/3), so every alias of a product of kept modes lands outside the kept band and is discarded',
};

// Largest wavenumber kept by the 2/3 rule on N points: 3 kmax < N.
export const dealiasKmax = (N) => Math.floor((N - 1) / 3);

// Zero the bins of a spectrum that the 2/3 rule discards (dealias = true), and
// always the Nyquist bin, which no real first derivative can represent.
function truncate(re, im, n, dealias) {
  const km = dealias ? dealiasKmax(n) : n / 2 - 1;
  for (let j = km + 1; j < n - km; j++) {
    re[j] = 0;
    im[j] = 0;
  }
}

// ---------------------------------------------------------------------------
// Differentiation

const work = new Map();
function ws(n) {
  let w = work.get(n);
  if (!w) {
    w = { re: new Float64Array(n), im: new Float64Array(n), re2: new Float64Array(n), im2: new Float64Array(n) };
    work.set(n, w);
  }
  return w;
}

// The m-th derivative of periodic grid data f on [0, L) by FFT: multiply
// coefficient k by (i k)^m. For odd m the Nyquist coefficient is zeroed.
export function spectralDerivative(f, out, L = TAU, m = 1) {
  const n = f.length;
  const { re, im } = ws(n);
  fftPlan(n);
  for (let j = 0; j < n; j++) {
    re[j] = f[j];
    im[j] = 0;
  }
  fft(re, im);
  const s = TAU / L;
  for (let j = 0; j < n; j++) {
    const k = s * (j < n / 2 ? j : j - n);
    let ar = re[j];
    let ai = im[j];
    for (let q = 0; q < m; q++) {
      const t = ar;
      ar = -k * ai;
      ai = k * t;
    }
    re[j] = ar;
    im[j] = ai;
  }
  if (m % 2 === 1 && n % 2 === 0) {
    re[n / 2] = 0;
    im[n / 2] = 0;
  }
  ifft(re, im);
  for (let j = 0; j < n; j++) out[j] = re[j];
  return out;
}

// Central-difference weights for f'(x_j) = (1/dx) sum_s w_s (f_{j+s} - f_{j-s}).
const FD_WEIGHTS = {
  2: [1 / 2],
  4: [2 / 3, -1 / 12],
  6: [3 / 4, -3 / 20, 1 / 60],
};

// First derivative of periodic grid data by central differences of the given
// order of accuracy (2, 4 or 6), spacing dx.
export function fdDerivative(f, out, dx, order = 2) {
  const w = FD_WEIGHTS[order];
  if (!w) throw new Error(`fdDerivative: order ${order} not in 2, 4, 6`);
  const n = f.length;
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let q = 0; q < w.length; q++) s += w[q] * (f[wrap(j + q + 1, n)] - f[wrap(j - q - 1, n)]);
    out[j] = s / dx;
  }
  return out;
}

// Modified wavenumber k' dx of a derivative scheme as a function of the true
// k dx in [0, pi]: the scheme differentiates exp(i k x) as i k' exp(i k x).
// Spectral is exact (k' = k) up to Nyquist, where it is zero.
export function modifiedWavenumber(method, kdx) {
  if (method === 'spectral') return Math.abs(kdx) >= Math.PI ? 0 : kdx;
  const order = DERIVATIVE_METHODS[method]?.order;
  const w = FD_WEIGHTS[order];
  if (!w) throw new Error(`modifiedWavenumber: unknown method ${method}`);
  let s = 0;
  for (let q = 0; q < w.length; q++) s += 2 * w[q] * Math.sin((q + 1) * kdx);
  return s;
}

export const DERIVATIVE_METHODS = {
  fd2: {
    id: 'fd2',
    name: '2nd-order central difference',
    short: 'FD2',
    order: 2,
    tex: "f'_j \\approx \\frac{f_{j+1} - f_{j-1}}{2\\Delta x}",
    modified: "k'\\Delta x = \\sin(k\\Delta x)",
    convergence: 'algebraic, error ~ N^-2',
  },
  fd4: {
    id: 'fd4',
    name: '4th-order central difference',
    short: 'FD4',
    order: 4,
    tex: "f'_j \\approx \\frac{-f_{j+2} + 8 f_{j+1} - 8 f_{j-1} + f_{j-2}}{12\\Delta x}",
    modified: "k'\\Delta x = \\frac{8\\sin(k\\Delta x) - \\sin(2k\\Delta x)}{6}",
    convergence: 'algebraic, error ~ N^-4',
  },
  fd6: {
    id: 'fd6',
    name: '6th-order central difference',
    short: 'FD6',
    order: 6,
    tex: "f'_j \\approx \\frac{45(f_{j+1} - f_{j-1}) - 9(f_{j+2} - f_{j-2}) + (f_{j+3} - f_{j-3})}{60\\Delta x}",
    modified: "k'\\Delta x = \\frac{45\\sin(k\\Delta x) - 9\\sin(2k\\Delta x) + \\sin(3k\\Delta x)}{30}",
    convergence: 'algebraic, error ~ N^-6',
  },
  spectral: {
    id: 'spectral',
    name: 'Fourier spectral',
    short: 'Spectral',
    order: Infinity,
    tex: "f'(x_j) \\approx \\mathcal{F}^{-1}\\left[\\, i k \\, \\hat f_k \\,\\right]_j",
    modified: "k' = k \\quad (|k| < N/2)",
    convergence: 'faster than any power of 1/N for smooth periodic f; geometric (~ e^{-aN}) when f is analytic in a strip',
  },
};

// Periodic test functions on [0, 2 pi) with exact derivatives. The smoothness
// of f sets how fast spectral differentiation converges (Trefethen 2000, ch. 4).
export const TEST_FUNCTIONS = {
  sin: {
    id: 'sin',
    name: 'sin x',
    tex: 'f(x) = \\sin x',
    f: (x) => Math.sin(x),
    df: (x) => Math.cos(x),
    smoothness: 'a single Fourier mode: spectral is exact (to rounding) once N >= 4',
  },
  expsin: {
    id: 'expsin',
    name: 'exp(sin x)',
    tex: 'f(x) = e^{\\sin x}',
    f: (x) => Math.exp(Math.sin(x)),
    df: (x) => Math.cos(x) * Math.exp(Math.sin(x)),
    smoothness: 'entire: coefficients fall faster than geometrically; the derivative reaches rounding level (~1e-14) by N = 32',
  },
  runge: {
    id: 'runge',
    name: '1 / (1 + sin²(x/2))',
    tex: 'f(x) = \\frac{1}{1 + \\sin^2(x/2)}',
    f: (x) => 1 / (1 + Math.sin(x / 2) ** 2),
    df: (x) => {
      const s = Math.sin(x / 2);
      return (-s * Math.cos(x / 2)) / (1 + s * s) ** 2;
    },
    smoothness: 'analytic in the strip |Im x| < 2 asinh(1) = 1.76: geometric convergence, error ~ exp(-0.88 N), rounding level by N = 64',
  },
  abscube: {
    id: 'abscube',
    name: '|sin x|³',
    tex: 'f(x) = |\\sin x|^3',
    f: (x) => Math.abs(Math.sin(x)) ** 3,
    df: (x) => 3 * Math.sin(x) * Math.abs(Math.sin(x)) * Math.cos(x),
    smoothness: 'third derivative jumps at x = 0, pi: coefficients decay like k^-4, so every method, spectral included, converges only as N^-2 in the derivative',
  },
};

// Max-norm errors of each method's derivative of a test function on grids of
// N points, as a refinement study. Yields { t: 'iter', k, n, errors } per grid
// (drain it in a test, or slice it across frames in a figure) and returns
// { ns, errors: { method: [...] }, orders: { method: [...] } }, where orders
// are the observed algebraic orders log2(e_N / e_2N) between grid doublings.
export function* derivativeConvergence({ fn = 'expsin', ns = [8, 16, 32, 64, 128], methods = ['fd2', 'fd4', 'spectral'] } = {}) {
  const tf = typeof fn === 'string' ? TEST_FUNCTIONS[fn] : fn;
  const errors = {};
  for (const m of methods) errors[m] = [];
  yield { t: 'enter', kind: 'convergence', label: tf.name ?? 'f' };
  for (let k = 0; k < ns.length; k++) {
    const n = ns[k];
    const dx = TAU / n;
    const f = new Float64Array(n);
    const exact = new Float64Array(n);
    const d = new Float64Array(n);
    for (let j = 0; j < n; j++) {
      f[j] = tf.f(j * dx);
      exact[j] = tf.df(j * dx);
    }
    const row = {};
    for (const m of methods) {
      if (m === 'spectral') spectralDerivative(f, d, TAU, 1);
      else fdDerivative(f, d, dx, DERIVATIVE_METHODS[m].order);
      let e = 0;
      for (let j = 0; j < n; j++) e = Math.max(e, Math.abs(d[j] - exact[j]));
      errors[m].push(e);
      row[m] = e;
    }
    yield { t: 'iter', k, n, errors: row };
  }
  yield { t: 'leave', kind: 'convergence' };
  const orders = {};
  for (const m of methods) {
    orders[m] = [];
    for (let k = 0; k + 1 < ns.length; k++) orders[m].push(Math.log(errors[m][k] / errors[m][k + 1]) / Math.log(ns[k + 1] / ns[k]));
  }
  return { ns: ns.slice(), errors, orders };
}

// ---------------------------------------------------------------------------
// Products and aliasing

// The pseudo-spectral product w = a b of two real grid signals of length N:
// transform both, (optionally) truncate them to the 2/3 band, multiply on
// the grid, transform back, (optionally) truncate the result. Writes the
// Fourier coefficients c_k = W_k / N into (outRe, outIm) bin by bin. With
// dealias = false, a product mode k1 + k2 > N/2 lands in bin aliasOf(k1+k2, N).
export function spectralProduct(a, b, outRe, outIm, dealias = true) {
  const n = a.length;
  const w = ws(n);
  for (let j = 0; j < n; j++) {
    w.re[j] = a[j];
    w.im[j] = b[j];
  }
  // a and b are real: transform them together, separate, truncate, return.
  if (dealias) {
    fft(w.re, w.im);
    for (let k = 0; k < n; k++) {
      const m = (n - k) % n;
      w.re2[k] = 0.5 * (w.re[k] + w.re[m]);
      w.im2[k] = 0.5 * (w.im[k] - w.im[m]);
      outRe[k] = 0.5 * (w.im[k] + w.im[m]);
      outIm[k] = -0.5 * (w.re[k] - w.re[m]);
    }
    truncate(w.re2, w.im2, n, true);
    truncate(outRe, outIm, n, true);
    for (let k = 0; k < n; k++) {
      // z = A + i B, so that ifft gives a + i b again
      w.re[k] = w.re2[k] - outIm[k];
      w.im[k] = w.im2[k] + outRe[k];
    }
    ifft(w.re, w.im);
  }
  for (let j = 0; j < n; j++) {
    w.re[j] = w.re[j] * w.im[j];
    w.im[j] = 0;
  }
  fft(w.re, w.im);
  if (dealias) truncate(w.re, w.im, n, true);
  for (let k = 0; k < n; k++) {
    outRe[k] = w.re[k] / n;
    outIm[k] = w.im[k] / n;
  }
}

// ---------------------------------------------------------------------------
// Burgers equation

export const BURGERS_PRESETS = {
  smooth: {
    id: 'smooth',
    name: 'Resolved (nu = 0.1)',
    description: 'A sine wave steepens into a smooth front. Every mode is resolved: the solution matches the exact Cole-Hopf solution to 1e-8 at t = 1 and to 2e-7 at worst (t ~ 1.7, the steepest front).',
    params: { n: 128, nu: 0.1, ic: 'sine', dealias: true, dt: 0.01 },
  },
  front: {
    id: 'front',
    name: 'Steep front (nu = 0.02)',
    description: 'A front about 0.04 wide on 256 points: still resolved, the maximum error against Cole-Hopf peaks near 3e-3 when the front is steepest (t ~ 1.5), and the spectrum falls off cleanly before the top.',
    params: { n: 256, nu: 0.02, ic: 'sine', dealias: true, dt: 0.005 },
  },
  pileup: {
    id: 'pileup',
    name: 'Aliasing pile-up (nu = 0.004, no 2/3 rule)',
    description: 'The front is thinner than the grid can hold. Without dealiasing, energy that should leave through the top of the spectrum is aliased back just below Nyquist: the last mode carries hundreds of times the energy of a resolved run, and grid-scale wiggles cover the profile.',
    broken: true,
    params: { n: 256, nu: 0.004, ic: 'sine', dealias: false, dt: 0.002 },
  },
  aliased: {
    id: 'aliased',
    name: 'Aliasing blow-up (nu = 0.002, no 2/3 rule)',
    description: 'Less viscosity on 128 points without dealiasing: the energy, which the true equation can only lose, starts to grow after the shock forms and the run blows up near t = 1.4, whatever the time step.',
    broken: true,
    params: { n: 128, nu: 0.002, ic: 'sine', dealias: false, dt: 0.005 },
  },
  dealiased: {
    id: 'dealiased',
    name: 'Same, dealiased (nu = 0.002, 2/3 rule)',
    description: 'Same grid and viscosity with the 2/3 rule: Gibbs wiggles remain beside the shock and energy still collects at the cutoff (the grid cannot resolve the shock), but the energy decays monotonically and the run stays bounded.',
    params: { n: 128, nu: 0.002, ic: 'sine', dealias: true, dt: 0.005 },
  },
  inviscid: {
    id: 'inviscid',
    name: 'Inviscid, Galerkin-truncated (nu = 0)',
    description: 'With nu = 0 and the 2/3 rule the truncated system conserves energy exactly, so after the shock forms the energy cannot dissipate: it spreads into grid-scale noise ("thermalisation"; Ray et al. 2011, Phys. Rev. E 84, 016301).',
    params: { n: 128, nu: 0, ic: 'sine', dealias: true, dt: 0.005 },
  },
  'stiff-explicit': {
    id: 'stiff-explicit',
    name: 'Explicit viscosity: stiff blow-up (nu = 0.1)',
    description: 'The smooth problem on 256 points with dt = 0.01 and the viscous term inside RK4 instead of the integrating factor. The top kept mode has nu kmax^2 dt = 7.2, beyond RK4\'s 2.79 on the negative real axis, so every mode above k ~ 53 is unstable (the top one grows 70-fold per step) and the run blows up from rounding noise in about 10 steps (t = 0.1), although the advective number dt max|u| kmax is only 0.85.',
    broken: true,
    params: { n: 256, nu: 0.1, ic: 'sine', dealias: true, dt: 0.01, integratingFactor: false },
  },
  'stiff-if': {
    id: 'stiff-if',
    name: 'Same, integrating factor (nu = 0.1)',
    description: 'The same grid, viscosity and step with the viscous term integrated exactly: the run is stable and accurate, because only the advective limit dt max|u| kmax <= 2.83 applies.',
    params: { n: 256, nu: 0.1, ic: 'sine', dealias: true, dt: 0.01, integratingFactor: true },
  },
  'cfl-below': {
    id: 'cfl-below',
    name: 'Advective limit: just below (dt U kmax = 2.75)',
    description: 'A uniform stream U = 1 carrying a 1 % ripple in the top kept mode (k = 21 of 64 points), nu = 0. The ripple is carried at speed U, so each RK4 step multiplies it by |R(i U kmax dt)| = |R(2.75 i)| = 0.82 and it fades.',
    params: { n: 64, nu: 0, ic: 'ripple', dealias: true, dt: 2.75 / 21 },
  },
  'cfl-above': {
    id: 'cfl-above',
    name: 'Advective limit: just above (dt U kmax = 2.9)',
    description: 'The same stream with a step 5 % larger: |R(2.9 i)| = 1.19 > 1, so the ripple grows 19 % per step and the run blows up in about 30 steps. The edge is 2 sqrt 2 = 2.83, where RK4\'s stability region crosses the imaginary axis.',
    broken: true,
    params: { n: 64, nu: 0, ic: 'ripple', dealias: true, dt: 2.9 / 21 },
  },
};

export const BURGERS_SCHEME = {
  id: 'if-rk4',
  name: 'Pseudo-spectral Fourier, integrating-factor RK4',
  tex: '\\frac{\\mathrm{d}\\hat u_k}{\\mathrm{d}t} = -\\nu k^2 \\hat u_k - \\frac{i k}{2}\\,\\widehat{(u^2)}_k',
  order: 4,
  spaceOrder: Infinity,
  stability: 'sufficient: dt max|u| kmax <= 2 sqrt 2 = 2.83 (RK4 on the imaginary axis; kmax = floor((N-1)/3) dealiased, N/2 - 1 not). Sharp for a uniform stream with a top-mode ripple; steep or thermalised solutions usually tolerate more because their top modes are nearly empty. No viscous limit with the integrating factor; with integratingFactor = false the viscous term also needs nu kmax^2 dt <= 2.79',
  stabilityTex: '\\Delta t\\,\\max|u|\\,k_{\\max} \\le 2\\sqrt{2}',
  explicitStabilityTex: '\\nu k_{\\max}^2 \\Delta t \\le 2.79',
};

// A Burgers state on N points of [0, 2 pi). ic: 'sine' (u0 = A sin x; the
// inviscid shock forms at x = pi, t = 1/A), 'two-modes' (sin x + sin(2x + 1)/2),
// 'random' (seeded, modes 1..4 with amplitude ~ 1/k), 'ripple' (a uniform
// stream A with a 1 % ripple in the top kept mode, A (1 + 0.01 sin(km x)),
// km = floor((N-1)/3) dealiased or N/2 - 1 not), or a function u0(x).
// integratingFactor = false treats the viscous term explicitly (see header);
// both it and dealias may be toggled on the state between steps.
export function createBurgers({ n = 256, nu = 0.02, dt = 0.005, ic = 'sine', amplitude = 1, dealias = true, seed = 1, integratingFactor = true } = {}) {
  fftPlan(n);
  const s = {
    n,
    L: TAU,
    nu,
    dt,
    dealias,
    integratingFactor,
    t: 0,
    steps: 0,
    kmax: dealiasKmax(n),
    k: wavenumbers(n, TAU, 0), // Nyquist -> 0 for the first derivative
    k2: new Float64Array(n), // k^2 with the true Nyquist value, for viscosity
    uRe: new Float64Array(n),
    uIm: new Float64Array(n),
    nRe: new Float64Array(n),
    nIm: new Float64Array(n),
    tRe: new Float64Array(n),
    tIm: new Float64Array(n),
    accRe: new Float64Array(n),
    accIm: new Float64Array(n),
    pRe: new Float64Array(n),
    pIm: new Float64Array(n),
    E: new Float64Array(n),
    E2: new Float64Array(n),
    _dt: NaN,
    _nu: NaN,
    _if: null,
    umax: 0,
  };
  const kk = wavenumbers(n);
  for (let j = 0; j < n; j++) s.k2[j] = kk[j] * kk[j];
  let u0 = ic;
  if (ic === 'sine') u0 = (x) => amplitude * Math.sin(x);
  else if (ic === 'two-modes') u0 = (x) => amplitude * (Math.sin(x) + 0.5 * Math.sin(2 * x + 1));
  else if (ic === 'ripple') {
    const km = dealias ? dealiasKmax(n) : n / 2 - 1;
    u0 = (x) => amplitude * (1 + 0.01 * Math.sin(km * x));
  }  else if (ic === 'random') {
    const r = rng(seed);
    const ph = [0, r(), r(), r(), r()].map((p) => p * TAU);
    u0 = (x) => {
      let v = 0;
      for (let q = 1; q <= 4; q++) v += (amplitude / q) * Math.sin(q * x + ph[q]);
      return v;
    };
  }
  if (typeof u0 !== 'function') throw new Error(`createBurgers: unknown ic ${ic}`);
  for (let j = 0; j < n; j++) {
    s.uRe[j] = u0((j * TAU) / n);
    s.uIm[j] = 0;
  }
  fft(s.uRe, s.uIm);
  truncate(s.uRe, s.uIm, n, dealias);
  return s;
}

// N(U) = -(i k / 2) FFT(u^2), truncated; with integratingFactor off it also
// carries the viscous term -nu k^2 U. Reads (inRe, inIm), writes (outRe, outIm).
function burgersN(s, inRe, inIm, outRe, outIm) {
  const { n, k, pRe, pIm } = s;
  for (let j = 0; j < n; j++) {
    pRe[j] = inRe[j];
    pIm[j] = inIm[j];
  }
  ifft(pRe, pIm);
  let um = 0;
  for (let j = 0; j < n; j++) {
    const u = pRe[j];
    if (Math.abs(u) > um) um = Math.abs(u);
    pRe[j] = u * u;
    pIm[j] = 0;
  }
  s.umax = um;
  fft(pRe, pIm);
  for (let j = 0; j < n; j++) {
    const h = 0.5 * k[j];
    outRe[j] = h * pIm[j];
    outIm[j] = -h * pRe[j];
  }
  if (!s.integratingFactor && s.nu) {
    const { k2, nu } = s;
    for (let j = 0; j < n; j++) {
      outRe[j] -= nu * k2[j] * inRe[j];
      outIm[j] -= nu * k2[j] * inIm[j];
    }
  }
  truncate(outRe, outIm, n, s.dealias);
}

// Advance a Burgers state by one IF-RK4 step of size dt (default s.dt).
// With s.integratingFactor false, E = 1 and this is classical RK4 on the
// whole right-hand side. Mutates s, allocates nothing, returns s.
export function stepBurgers(s, dt = s.dt) {
  const { n, uRe, uIm, nRe, nIm, tRe, tIm, accRe, accIm, E, E2 } = s;
  const useIF = !!s.integratingFactor;
  if (dt !== s._dt || s.nu !== s._nu || useIF !== s._if) {
    for (let j = 0; j < n; j++) {
      E[j] = useIF ? Math.exp(-0.5 * s.nu * s.k2[j] * dt) : 1;
      E2[j] = E[j] * E[j];
    }
    s._dt = dt;
    s._nu = s.nu;
    s._if = useIF;
  }
  if (s.dealias) truncate(uRe, uIm, n, true);
  burgersN(s, uRe, uIm, nRe, nIm);
  for (let j = 0; j < n; j++) {
    accRe[j] = E2[j] * dt * nRe[j];
    accIm[j] = E2[j] * dt * nIm[j];
    tRe[j] = E[j] * (uRe[j] + 0.5 * dt * nRe[j]);
    tIm[j] = E[j] * (uIm[j] + 0.5 * dt * nIm[j]);
  }
  burgersN(s, tRe, tIm, nRe, nIm);
  for (let j = 0; j < n; j++) {
    accRe[j] += 2 * E[j] * dt * nRe[j];
    accIm[j] += 2 * E[j] * dt * nIm[j];
    tRe[j] = E[j] * uRe[j] + 0.5 * dt * nRe[j];
    tIm[j] = E[j] * uIm[j] + 0.5 * dt * nIm[j];
  }
  burgersN(s, tRe, tIm, nRe, nIm);
  for (let j = 0; j < n; j++) {
    accRe[j] += 2 * E[j] * dt * nRe[j];
    accIm[j] += 2 * E[j] * dt * nIm[j];
    tRe[j] = E2[j] * uRe[j] + E[j] * dt * nRe[j];
    tIm[j] = E2[j] * uIm[j] + E[j] * dt * nIm[j];
  }
  burgersN(s, tRe, tIm, nRe, nIm);
  for (let j = 0; j < n; j++) {
    uRe[j] = E2[j] * uRe[j] + (accRe[j] + dt * nRe[j]) / 6;
    uIm[j] = E2[j] * uIm[j] + (accIm[j] + dt * nIm[j]) / 6;
  }
  s.t += dt;
  s.steps++;
  return s;
}

// A step for CFL number cfl: dt = min(dtMax, cfl * dx / max|u|), dx = 2 pi / N,
// using max|u| from the last nonlinear evaluation (or the current field
// before the first step). Since kmax dx ~ 2 pi / 3 with the 2/3 rule, cfl = 0.5
// means dt max|u| kmax ~ 1.05 (1.57 without dealiasing), inside the 2.83
// limit. dtMax (default 10 s.dt) keeps a quiescent or tiny field from asking
// for an enormous step.
export function burgersSuggestDt(s, cfl = 0.5, dtMax = 10 * s.dt) {
  let um = s.umax;
  if (!(um > 0)) {
    burgersField(s, s.pRe);
    for (let j = 0; j < s.n; j++) um = Math.max(um, Math.abs(s.pRe[j]));
  }
  return Math.min(dtMax, (cfl * (TAU / s.n)) / um);
}

// Grid values u(x_j) of the state into out (length N).
export function burgersField(s, out) {
  const { n, uRe, uIm } = s;
  const re = s.pRe;
  const im = s.pIm;
  for (let j = 0; j < n; j++) {
    re[j] = uRe[j];
    im[j] = uIm[j];
  }
  ifft(re, im);
  for (let j = 0; j < n; j++) out[j] = re[j];
  return out;
}

// Mean kinetic energy (1/L) int u^2/2 dx = sum_k |U_k|^2 / (2 N^2).
export function burgersEnergy(s) {
  let e = 0;
  for (let j = 0; j < s.n; j++) e += s.uRe[j] * s.uRe[j] + s.uIm[j] * s.uIm[j];
  return e / (2 * s.n * s.n);
}

// Energy spectrum E(k), k = 0 .. N/2, into out (length N/2 + 1): the energy
// in modes +k and -k together, so sum_k E(k) = burgersEnergy(s).
export function burgersSpectrum(s, out) {
  const { n, uRe, uIm } = s;
  const c = 1 / (2 * n * n);
  out[0] = c * (uRe[0] * uRe[0] + uIm[0] * uIm[0]);
  for (let k = 1; k < n / 2; k++) {
    const m = n - k;
    out[k] = c * (uRe[k] * uRe[k] + uIm[k] * uIm[k] + uRe[m] * uRe[m] + uIm[m] * uIm[m]);
  }
  const q = n / 2;
  out[q] = c * (uRe[q] * uRe[q] + uIm[q] * uIm[q]);
  return out;
}

// Exact solution of u_t + u u_x = nu u_xx with u(x, 0) = A sin x, nu > 0, by
// the Cole-Hopf transformation (Whitham 1974, ch. 4):
//   u(x, t) = int ((x - y)/t) e^{-G/(2 nu)} dy / int e^{-G/(2 nu)} dy,
//   G(y) = int_0^y u0(s) ds + (x - y)^2 / (2 t) = A (1 - cos y) + (x - y)^2 / (2 t),
// over the whole line. The minimiser of G is a characteristic foot,
// |x - y| <= |A| t, and the Gaussian factor adds sqrt(160 nu t) on each side
// (e^-40 beyond it), which bounds the range. The integrals use the trapezoid
// rule with spacing a sixth of the narrowest possible peak width
// sigma = sqrt(2 nu / M), M = |A| + 1/t >= |G''|. For this smooth, rapidly
// decaying integrand the trapezoid error falls like exp(-2 pi sigma / h)
// (Trefethen & Weideman 2014, SIAM Rev. 56, 385), here ~ e^-38. They run only
// where the integrand matters:
//   1. a coarse scan, 16 fine steps apart, finds the smallest sampled G;
//   2. on a coarse cell of width H, G >= min(endpoints) - M H^2 / 8 (the
//      curvature bound), so a cell whose bound exceeds that minimum by more
//      than 80 nu carries weights below e^-40 and is skipped;
//   3. the fine sum runs over the remaining cells only, with the weights
//      shifted by the coarse minimum (so nothing overflows or underflows).
// The skipped weights change the result by under 1e-14 relative. Cost per
// point: about 2 R / (16 h) cosines for the scan plus 16 (cos + exp) per kept
// cell, typically 100-200 evaluations; about 0.9 ms for 256 points in desktop
// node (3-5 ms on a phone). A figure should evaluate it on a plot grid of
// <= 128 points, and only when t or nu changes, not on every frame.
// Evaluates at the points x (array) into out. Allocates nothing.
export function burgersExact(x, t, nu, out, A = 1) {
  if (!(nu > 0)) throw new Error('burgersExact: needs nu > 0');
  if (!(t > 0)) {
    for (let q = 0; q < x.length; q++) out[q] = A * Math.sin(x[q]);
    return out;
  }
  const aA = Math.abs(A);
  const R = aA * t + Math.sqrt(160 * nu * t);
  const M = aA + 1 / t; // |G''| <= |A| + 1/t
  // Fine spacing: a sixth of the narrowest peak width sqrt(2 nu t / (1 + |A| t)).
  const h = Math.sqrt((2 * nu) / M) / 6;
  const B = 16; // fine steps per coarse cell
  const mc = Math.ceil(R / (B * h)); // coarse cells on each side
  const H = R / mc;
  const hh = H / B;
  const slack = (M * H * H) / 8; // how far G can dip below its cell endpoints
  const cut = 80 * nu; // e^{-cut / (2 nu)} = e^-40
  const c = 1 / (2 * nu);
  const it2 = 1 / (2 * t);
  for (let q = 0; q < x.length; q++) {
    const xq = x[q];
    let gmin = Infinity;
    for (let i = -mc; i <= mc; i++) {
      const d = i * H;
      const g = A * (1 - Math.cos(xq + d)) + d * d * it2;
      if (g < gmin) gmin = g;
    }
    let num = 0;
    let den = 0;
    let dPrev = -mc * H;
    let gPrev = A * (1 - Math.cos(xq + dPrev)) + dPrev * dPrev * it2;
    for (let i = -mc; i < mc; i++) {
      const dNext = (i + 1) * H;
      const gNext = A * (1 - Math.cos(xq + dNext)) + dNext * dNext * it2;
      if (Math.min(gPrev, gNext) - slack <= gmin + cut) {
        // fine points y = xq + d, d = i H + f hh, f = 0 .. B-1
        for (let f = 0; f < B; f++) {
          const d = dPrev + f * hh;
          const w = Math.exp(-c * (A * (1 - Math.cos(xq + d)) + d * d * it2 - gmin));
          num -= w * d; // x - y = -d
          den += w;
        }
      }
      dPrev = dNext;
      gPrev = gNext;
    }
    out[q] = num / (den * t);
  }
  return out;
}
