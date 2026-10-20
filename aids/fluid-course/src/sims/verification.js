// Verification, floating point and convergence studies.
//
// What this module does
//   (a) Derivatives by finite differences against the step h: forward,
//       backward, second-order central, fourth-order central and the complex
//       step. A sweep returns the measured total error (the "V": truncation
//       ~ h^p falling to the right, round-off ~ eps/h rising to the left), the
//       textbook worst-case model of both terms with its optimal step, and
//       the measured optimum from fits to the two branches.
//   (b) Floating point: catastrophic cancellation (naive vs rewritten
//       formulas), naive vs Kahan (compensated) summation of many small mass
//       increments, and Float32 (Math.fround) vs Float64 drift in a long
//       harmonic-oscillator integration whose discrete invariant is exact, so
//       every bit of drift is round-off.
//   (c) Convergence-study helpers: observed order from a sequence of errors,
//       Richardson extrapolation from three grids, Roache's grid convergence
//       index (GCI, Fs = 1.25) by the Celik et al. (2008) procedure, and
//       Roache's asymptotic-range check.
//   (d) The method of manufactured solutions (MMS) on a steady 1-D
//       advection-diffusion-reaction boundary-value problem solved with
//       second-order finite differences and a Thomas solve, with "bug"
//       toggles a widget can switch on to watch the observed order drop.
//
// Conventions
//   - Everything is nondimensional (the MMS problem lives on x in [0, 1]).
//     The one dimensional example is the gauge-pressure cancellation, in
//     pascals and metres (water, rho = 1000 kg/m^3, g = 9.81 m/s^2).
//   - 1-D grids are vertex-centred: x_i = i h, i = 0..N, h = 1/N. (No 2-D
//     fields here; the course-wide 2-D indexing i + j*nx, j = 0 at the
//     bottom, and the MAC layout, u (nx+1)*ny and v nx*(ny+1), do not
//     arise.)
//   - In three-grid studies grid 1 is the FINEST (Roache; Celik et al.):
//     h1 < h2 < h3, r21 = h2/h1, r32 = h3/h2, eps21 = f2 - f1.
//   - eps is Number.EPSILON = 2^-52 (the gap between 1 and the next double);
//     the unit round-off is u = eps/2. For Float32, eps = 2^-23.
//   - The sweep's refinement study (mmsStudy) is a generator yielding
//     { t: 'iter', k, n, h, errMax, errL2, order } per grid (see util.js) so
//     a widget can drain it across frames; tests drain the same generator.
//
// Sources
//   Finite differences and the optimal step: Press, Teukolsky, Vetterling &
//     Flannery, Numerical Recipes, 3rd ed. (2007) §5.7; Nocedal & Wright,
//     Numerical Optimization, 2nd ed. (2006) §8.1; Sauer, Numerical Analysis
//     (2006) §5.1. Fourth-order stencil: Fornberg, Math. Comp. 51 (1988) 699.
//   Complex step: Lyness & Moler, SIAM J. Numer. Anal. 4 (1967) 202
//     (derivatives of analytic functions, incl. the Cauchy-integral formula
//     used here for f'', f''', f^(5)); Squire & Trapp, SIAM Review 40 (1998)
//     110; Martins, Sturdza & Alonso, ACM TOMS 29 (2003) 245. The test
//     function f(x) = e^x / sqrt(sin^3 x + cos^3 x) at x = 1.5 is the one
//     used in those two papers. Complex division uses Smith, CACM 5 (1962)
//     435.
//   Floating point: Goldberg, ACM Comput. Surv. 23 (1991) 5; Higham,
//     Accuracy and Stability of Numerical Algorithms, 2nd ed. (2002) ch. 1
//     (cancellation) and §4.3 (compensated summation, error bounds);
//     Kahan, CACM 8 (1965) 40. The exact reference sum is the cascaded
//     TwoSum "Sum2" of Ogita, Rump & Oishi, SIAM J. Sci. Comput. 26 (2005)
//     1955 (TwoSum: Knuth, TAOCP vol. 2, §4.2.2). Float32 arithmetic is
//     emulated by rounding every double result with Math.fround; for + - * /
//     this equals true single precision because 53 >= 2*24 + 2 (Figueroa,
//     SIGNUM Newsl. 30(3) (1995) 21). Round-off growth in long integrations:
//     Brouwer, Astron. J. 46 (1937) 149. Symplectic Euler and its modified
//     invariant: Hairer, Lubich & Wanner, Geometric Numerical Integration,
//     2nd ed. (2006) ch. I and IX.
//   Richardson extrapolation: Richardson, Phil. Trans. R. Soc. A 210 (1911)
//     307; Richardson & Gaunt, Phil. Trans. A 226 (1927) 299.
//   GCI: Roache, J. Fluids Eng. 116 (1994) 405; Roache, Verification and
//     Validation in Computational Science and Engineering (1998);
//     Celik, Ghia, Roache & Freitas, J. Fluids Eng. 130 (2008) 078001,
//     Eqs. (3)-(7) and Table 1 (reproduced by GCI_EXAMPLES below).
//   MMS: Salari & Knupp, Sandia report SAND2000-1444 (2000); Roache,
//     J. Fluids Eng. 124 (2002) 4; Roy, J. Comput. Phys. 205 (2005) 131;
//     Oberkampf & Roy, Verification and Validation in Scientific Computing
//     (2010) ch. 5-6. Boundary closures for a Neumann condition (first-order
//     one-sided vs second-order ghost point): LeVeque, Finite Difference
//     Methods for Ordinary and Partial Differential Equations (2007) §2.12.
//     Thomas algorithm: Thomas (1949); see e.g. LeVeque §2.3 or any
//     numerical-analysis text.
//
// Deviations from the textbook forms
//   - The round-off model is the textbook worst-case estimate (Sauer §5.1;
//     Nocedal & Wright §8.1): every function value is charged a full
//     eps * |f| (about one ulp) and all the errors are given the same sign.
//     Real rounding errors are usually smaller (up to u = eps/2 for one
//     correctly rounded operation) and partly cancel. So the measured "V"
//     typically sits about 5x BELOW the model on its round-off branch
//     (geometric mean of measured/model 0.06-0.23 over h in [1e-15, 1e-11]
//     for the three test functions), only occasionally touching it. The
//     measured optimum lies LEFT of the predicted h* (0.2-0.75 h*), and
//     errOpt overstates the error there by 2-12x (the single luckiest point
//     of a sweep can be 300x below errOpt). Read hOpt as "the scale of the
//     best step" and errOpt as a pessimistic estimate, not a prediction.
//   - representableStep applies the Numerical Recipes trick h = (x + h) - x.
//     The representation error it removes is the same size as the rounding
//     of f itself, so it trims the round-off branch by roughly a third
//     (measured ratio 0.4-0.9) without changing its slope or h*.
//   - The complex-step model has no 1/h term: there is no subtraction, so
//     its floor is about eps * |f'|.
//   - The "measured optimum" of a sweep is the crossover of the two measured
//     branches, each fitted with its known slope (h^p and 1/h), not the raw
//     argmin: the bottom of the V is broad and noisy, and a lucky
//     cancellation can put the raw argmin two decades away. The raw argmin
//     is also returned.
//   - The MMS problem also has a round-off floor: with the defaults the max
//     error bottoms out near 5e-10 around N = 8e4 and grows again beyond
//     (the discrete operator's condition number grows like 1/h^2).

import { drain, rng } from './util.js';

// ---------------------------------------------------------------------------
// Small complex arithmetic (objects { re, im }). Not used in per-step loops.

export const cx = (re, im = 0) => ({ re, im });
export const cadd = (a, b) => ({ re: a.re + b.re, im: a.im + b.im });
export const csub = (a, b) => ({ re: a.re - b.re, im: a.im - b.im });
export const cmul = (a, b) => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
export const cscale = (a, s) => ({ re: a.re * s, im: a.im * s });

// Smith's (1962) division: avoids overflow/underflow in c^2 + d^2.
export function cdiv(a, b) {
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const r = b.im / b.re;
    const den = b.re + b.im * r;
    return { re: (a.re + a.im * r) / den, im: (a.im - a.re * r) / den };
  }
  const r = b.re / b.im;
  const den = b.re * r + b.im;
  return { re: (a.re * r + a.im) / den, im: (a.im * r - a.re) / den };
}
export function cexp(z) {
  const e = Math.exp(z.re);
  return { re: e * Math.cos(z.im), im: e * Math.sin(z.im) };
}
export const csin = (z) => ({ re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) });
export const ccos = (z) => ({ re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) });
// Principal square root, written so a tiny imaginary part survives (no
// cancellation in either branch).
export function csqrt(z) {
  const r = Math.hypot(z.re, z.im);
  if (r === 0) return { re: 0, im: 0 };
  if (z.re >= 0) {
    const t = Math.sqrt((r + z.re) / 2);
    return { re: t, im: z.im / (2 * t) };
  }
  const t = Math.sqrt((r - z.re) / 2);
  return { re: Math.abs(z.im) / (2 * t), im: z.im < 0 ? -t : t };
}

// ---------------------------------------------------------------------------
// (a) Finite-difference derivatives against h

function stF(x) {
  const s = Math.sin(x);
  const c = Math.cos(x);
  return Math.exp(x) / Math.sqrt(s * s * s + c * c * c);
}
function stFc(z) {
  const s = csin(z);
  const c = ccos(z);
  const g = cadd(cmul(cmul(s, s), s), cmul(cmul(c, c), c));
  return cdiv(cexp(z), csqrt(g));
}
function stDf(x) {
  const s = Math.sin(x);
  const c = Math.cos(x);
  const g = s * s * s + c * c * c;
  return stF(x) * (1 - (3 * (s * s * c - c * c * s)) / (2 * g));
}

// Distance from a real x to the nearest singularity of the Squire–Trapp
// function. sin^3 z + cos^3 z = (sin z + cos z)(1 - sin z cos z) vanishes at
// z = -pi/4 + k pi (real) and at z = pi/4 + k pi +- i acosh(2)/2 (complex,
// where sin 2z = 2); the square root has branch points there.
function stSingularityDistance(x) {
  const q = Math.PI / 4;
  const k = Math.round((x + q) / Math.PI);
  const real = Math.abs(x + q - k * Math.PI);
  const kc = Math.round((x - q) / Math.PI);
  const cplx = Math.hypot(x - q - kc * Math.PI, Math.acosh(2) / 2);
  return Math.min(real, cplx);
}

// Test functions: real evaluation f, complex evaluation fc (same formula in
// complex arithmetic), exact derivative df. radius is the default radius for
// the Cauchy-integral derivatives; singularityDistance(x), when given, lets
// derivativeSweep shrink it to 0.3 of the distance to the nearest
// singularity. domain is the open interval of real x on which f is real.
export const TEST_FUNCTIONS = {
  'squire-trapp': {
    id: 'squire-trapp',
    name: 'Squire–Trapp test function',
    tex: 'f(x) = \\frac{e^{x}}{\\sqrt{\\sin^{3}x + \\cos^{3}x}}',
    x0: 1.5,
    radius: 0.25, // at x = 1.5 the nearest singularity (x = 3pi/4) is 0.86 away
    domain: [-Math.PI / 4, (3 * Math.PI) / 4], // sin x + cos x > 0
    singularityDistance: stSingularityDistance,
    f: stF,
    fc: stFc,
    df: stDf,
    dfx0: 4.0534278938986206577, // f'(1.5) from 40-digit arithmetic (rounds to the nearest double)
    note: 'The function Squire & Trapp (1998) and Martins, Sturdza & Alonso (2003) differentiate at x = 1.5; f\'(1.5) = 4.05342789389862...',
  },
  exp: {
    id: 'exp',
    name: 'Exponential',
    tex: 'f(x) = e^{x}',
    x0: 1,
    radius: 1,
    domain: [-Infinity, Infinity],
    f: Math.exp,
    fc: cexp,
    df: Math.exp,
    note: 'Every derivative equals f, so the error constants are easy to check by hand.',
  },
  sin: {
    id: 'sin',
    name: 'Sine',
    tex: 'f(x) = \\sin x',
    x0: 1,
    radius: 1,
    domain: [-Infinity, Infinity],
    f: Math.sin,
    fc: csin,
    df: Math.cos,
    note: 'A periodic function: the derivatives cycle through cos, -sin, -cos, sin.',
  },
};

// Error model for each formula: |error| ~ trunc * |f^(k)| * h^order + round * eps|f| / h.
// The round-off term is the textbook worst case (each value off by eps|f|,
// all errors adding), so errorTex and hOptTex describe an upper estimate:
// measured round-off is typically about 5x smaller (see the header).
export const DERIVATIVE_SCHEMES = {
  forward: {
    id: 'forward',
    name: 'Forward difference',
    tex: "f'(x) \\approx \\frac{f(x+h) - f(x)}{h}",
    errorTex: "\\frac{h}{2}|f''| + \\frac{2\\varepsilon |f|}{h}",
    hOptTex: "h^{*} = 2\\sqrt{\\varepsilon |f| / |f''|} \\sim \\sqrt{\\varepsilon}",
    order: 1,
    k: 2,
    trunc: 1 / 2,
    round: 2,
    description: 'One extra function value. Truncation error O(h); round-off from subtracting two nearly equal values grows like eps/h.',
  },
  backward: {
    id: 'backward',
    name: 'Backward difference',
    tex: "f'(x) \\approx \\frac{f(x) - f(x-h)}{h}",
    errorTex: "\\frac{h}{2}|f''| + \\frac{2\\varepsilon |f|}{h}",
    hOptTex: "h^{*} = 2\\sqrt{\\varepsilon |f| / |f''|} \\sim \\sqrt{\\varepsilon}",
    order: 1,
    k: 2,
    trunc: 1 / 2,
    round: 2,
    description: 'The mirror image of the forward difference: same order, same optimal step.',
  },
  central: {
    id: 'central',
    name: 'Central difference',
    tex: "f'(x) \\approx \\frac{f(x+h) - f(x-h)}{2h}",
    errorTex: "\\frac{h^{2}}{6}|f'''| + \\frac{\\varepsilon |f|}{h}",
    hOptTex: "h^{*} = \\left(3\\varepsilon |f| / |f'''|\\right)^{1/3} \\sim \\varepsilon^{1/3}",
    order: 2,
    k: 3,
    trunc: 1 / 6,
    round: 1,
    description: 'Symmetric, so the h^1 terms cancel: O(h^2). Same round-off growth, so the best step is larger and the best error much smaller.',
  },
  central4: {
    id: 'central4',
    name: 'Fourth-order central',
    tex: "f'(x) \\approx \\frac{-f(x+2h) + 8f(x+h) - 8f(x-h) + f(x-2h)}{12h}",
    errorTex: "\\frac{h^{4}}{30}|f^{(5)}| + \\frac{3\\varepsilon |f|}{2h}",
    hOptTex: "h^{*} = \\left(\\tfrac{45}{4}\\varepsilon |f| / |f^{(5)}|\\right)^{1/5} \\sim \\varepsilon^{1/5}",
    order: 4,
    k: 5,
    trunc: 1 / 30,
    round: 3 / 2,
    description: 'Five-point stencil: O(h^4). Round-off still grows like eps/h; the coefficients 1, 8, 8, 1 over 12 make it 1.5 eps|f|/h.',
  },
  complex: {
    id: 'complex',
    name: 'Complex step',
    tex: "f'(x) \\approx \\frac{\\operatorname{Im} f(x + ih)}{h}",
    errorTex: "\\frac{h^{2}}{6}|f'''| + \\varepsilon |f'|",
    hOptTex: 'any h \\lesssim \\sqrt{\\varepsilon} \\text{ (no subtraction, no round-off growth)}',
    order: 2,
    k: 3,
    trunc: 1 / 6,
    round: 0,
    description: 'Evaluate f at a complex point and keep the imaginary part. No subtraction, so h can be as small as 1e-200 and the result is accurate to machine precision. Needs f written in operations that extend to complex numbers.',
  },
};

const testFunction = (fn) => {
  const F = typeof fn === 'string' ? TEST_FUNCTIONS[fn] : fn;
  if (!F || typeof F.f !== 'function') throw new Error(`unknown test function ${fn}`);
  return F;
};

// One derivative estimate. scheme: a DERIVATIVE_SCHEMES id; fn: a
// TEST_FUNCTIONS id or object. representableStep applies h = (x + h) - x so
// the step actually taken is the one divided by (Numerical Recipes §5.7);
// when h is below half an ulp of x that step is 0 and the result is NaN.
export function fdDerivative(scheme, x, h, { fn = 'squire-trapp', representableStep = false } = {}) {
  const F = testFunction(fn);
  const f = F.f;
  if (representableStep && scheme !== 'complex') h = x + h - x;
  switch (scheme) {
    case 'forward':
      return (f(x + h) - f(x)) / h;
    case 'backward':
      return (f(x) - f(x - h)) / h;
    case 'central':
      return (f(x + h) - f(x - h)) / (2 * h);
    case 'central4':
      return (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);
    case 'complex':
      return F.fc(cx(x, h)).im / h;
    default:
      throw new Error(`unknown scheme ${scheme}`);
  }
}

// Derivatives f^(k)(x0), k = 0..kmax, by the Cauchy integral formula on a
// circle of radius r, discretised by the n-point trapezoidal rule
// (Lyness & Moler 1967). Spectrally accurate for analytic f; the error is
// about (r/R)^n with R the distance to the nearest singularity.
export function taylorDerivatives(fc, x0, { kmax = 5, radius = 0.25, n = 64 } = {}) {
  const out = new Float64Array(kmax + 1);
  const vals = [];
  for (let j = 0; j < n; j++) {
    const th = (2 * Math.PI * j) / n;
    vals.push({ th, v: fc(cx(x0 + radius * Math.cos(th), radius * Math.sin(th))) });
  }
  let fact = 1;
  for (let k = 0; k <= kmax; k++) {
    if (k > 0) fact *= k;
    let s = 0;
    for (const { th, v } of vals) s += v.re * Math.cos(k * th) + v.im * Math.sin(k * th); // Re(f e^{-ik th})
    out[k] = (fact * s) / (n * Math.pow(radius, k));
  }
  return out;
}

// n points equally spaced in log10 from 10^a to 10^b (both ends included).
export function logspace(a, b, n) {
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) out[k] = Math.pow(10, n === 1 ? a : a + ((b - a) * k) / (n - 1));
  return out;
}

// Cauchy-integral derivatives of a test function at x with a radius that is
// safe there: 0.3 of the distance to the nearest singularity when the
// function says where they are (never more than F.radius), then a self-check
// (f and f' from the integral must match F.f and F.df to 1e-9 of their
// scale), halving the radius up to 8 times if it fails. Returns
// { d, radius, ok }.
export function safeTaylorDerivatives(fn, x, { kmax = 5 } = {}) {
  const F = testFunction(fn);
  let radius = F.radius;
  if (F.singularityDistance) radius = Math.min(radius, 0.3 * F.singularityDistance(x));
  const f0 = F.f(x);
  const df0 = F.df(x);
  let d = null;
  for (let tries = 0; tries <= 8; tries++) {
    d = taylorDerivatives(F.fc, x, { kmax, radius });
    const scale0 = Math.max(Math.abs(f0), radius * Math.abs(df0));
    const scale1 = Math.max(Math.abs(df0), Math.abs(f0) / radius);
    if (Math.abs(d[0] - f0) <= 1e-9 * scale0 && Math.abs(d[1] - df0) <= 1e-9 * scale1) return { d, radius, ok: true };
    radius /= 2;
  }
  return { d, radius: radius * 2, ok: false };
}

// Error model terms for one scheme, from the derivatives d = [f, f', f'', ...].
// For the subtractive formulas errOpt is the model's (pessimistic) error at
// hOpt; the measured error at the measured optimum is 2-12x smaller (header).
export function derivativeErrorModel(scheme, d, epsF = Number.EPSILON) {
  const S = DERIVATIVE_SCHEMES[scheme];
  if (!S) throw new Error(`unknown scheme ${scheme}`);
  const A = S.trunc * Math.abs(d[S.k]);
  const p = S.order;
  if (S.round === 0) {
    const floor = epsF * Math.abs(d[1]);
    return { A, B: 0, p, floor, hOpt: Math.sqrt(floor / A), errOpt: floor, at: (h) => A * h ** p + floor };
  }
  const B = S.round * epsF * Math.abs(d[0]);
  const hOpt = Math.pow(B / (p * A), 1 / (p + 1));
  const errOpt = (B / hOpt) * (1 + 1 / p);
  return { A, B, p, floor: 0, hOpt, errOpt, at: (h) => A * h ** p + B / h };
}

// Which points of a sweep the branch fits use, in decades of h relative to
// the model's hOpt: the truncation branch from +0.75 to +2, the round-off
// branch from -3 to -0.75 (both away from the bottom of the V).
export const BRANCH_FIT_DECADES = { truncation: [0.75, 2], roundoff: [-3, -0.75] };

// Measured optimum of one error curve: fit the truncation branch with its
// known slope (err ~ A' h^p) and the round-off branch with slope -1
// (err ~ B'/h), each by the geometric mean of err/h^p or err*h, and take the
// crossover h = (B'/(p A'))^(1/(p+1)), the minimum of A' h^p + B'/h. The
// bottom of the V is broad and noisy (a lucky cancellation can put the raw
// argmin two decades away), so this is far steadier than the argmin.
function branchFit(h, err, p, hOpt) {
  let la = 0;
  let na = 0;
  let lb = 0;
  let nb = 0;
  const [t0, t1] = BRANCH_FIT_DECADES.truncation;
  const [r0, r1] = BRANCH_FIT_DECADES.roundoff;
  for (let k = 0; k < h.length; k++) {
    if (!(err[k] > 0) || !Number.isFinite(err[k])) continue;
    const dec = Math.log10(h[k] / hOpt);
    if (dec >= t0 && dec <= t1) {
      la += Math.log(err[k] / h[k] ** p);
      na++;
    } else if (dec >= r0 && dec <= r1) {
      lb += Math.log(err[k] * h[k]);
      nb++;
    }
  }
  if (na < 2 || nb < 2) return null;
  const A = Math.exp(la / na);
  const B = Math.exp(lb / nb);
  const hBest = Math.pow(B / (p * A), 1 / (p + 1));
  return { A, B, hBest, errBest: (B / hBest) * (1 + 1 / p) };
}

// The V-shaped error curve for every formula. Returns plain arrays a widget
// can plot on log-log axes. err may be exactly 0 at a lucky h (clamp it
// before taking a log). Per scheme:
//   model            the worst-case model curve, with its hOpt and errOpt;
//   fitA, fitB       the measured branches err ~ fitA h^p and fitB / h
//                    (fitted curve in `fitted`), see branchFit;
//   hMin, errMin     the measured optimum: the crossover of the two fitted
//                    branches and the fitted error there (fitOk false, and
//                    the raw argmin used instead, if a branch has < 2
//                    points in range);
//   hMinRaw, errMinRaw  the single smallest error in the sweep.
// With representableStep the h grid stops before the steps that round to 0
// (h < ulp(x)/2), so every err is finite. derivsOk is false if no radius
// gave trustworthy Cauchy-integral derivatives (the model is then
// unreliable). For the complex step, complex.h runs on to csMin. Throws if x0
// is outside the function's domain.
export function derivativeSweep({
  fn = 'squire-trapp',
  x0 = null,
  hMax = 1e-1,
  hMin = 1e-16,
  perDecade = 4,
  csMin = 1e-200,
  csPerDecade = 2,
  epsF = Number.EPSILON,
  representableStep = false,
} = {}) {
  const F = testFunction(fn);
  const x = x0 ?? F.x0;
  if (F.domain && !(x > F.domain[0] && x < F.domain[1])) {
    throw new RangeError(`x0 = ${x} is outside the domain (${F.domain[0]}, ${F.domain[1]}) of ${F.id}`);
  }
  const exact = x === F.x0 && F.dfx0 !== undefined ? F.dfx0 : F.df(x);
  const { d, radius, ok: derivsOk } = safeTaylorDerivatives(F, x, { kmax: 5 });
  const a = Math.log10(hMax);
  const nAll = Math.round((a - Math.log10(hMin)) * perDecade) + 1;
  const hAll = logspace(a, Math.log10(hMin), nAll);
  let nh = nAll;
  if (representableStep) while (nh > 1 && x + hAll[nh - 1] - x === 0) nh--;
  const h = nh === nAll ? hAll : hAll.slice(0, nh);
  const schemes = {};
  for (const id of ['forward', 'backward', 'central', 'central4']) {
    const err = new Float64Array(nh);
    const model = new Float64Array(nh);
    const fitted = new Float64Array(nh);
    const m = derivativeErrorModel(id, d, epsF);
    let kRaw = 0;
    for (let k = 0; k < nh; k++) {
      err[k] = Math.abs(fdDerivative(id, x, h[k], { fn: F, representableStep }) - exact);
      model[k] = m.at(h[k]);
      if (err[k] < err[kRaw]) kRaw = k;
    }
    const bf = branchFit(h, err, m.p, m.hOpt);
    if (bf) for (let k = 0; k < nh; k++) fitted[k] = bf.A * h[k] ** m.p + bf.B / h[k];
    else fitted.fill(NaN);
    schemes[id] = {
      err,
      model,
      fitted,
      hOpt: m.hOpt,
      errOpt: m.errOpt,
      fitOk: !!bf,
      fitA: bf ? bf.A : NaN,
      fitB: bf ? bf.B : NaN,
      hMin: bf ? bf.hBest : h[kRaw],
      errMin: bf ? bf.errBest : err[kRaw],
      hMinRaw: h[kRaw],
      errMinRaw: err[kRaw],
    };
  }
  const ncs = Math.round((a - Math.log10(csMin)) * csPerDecade) + 1;
  const csH = logspace(a, Math.log10(csMin), ncs);
  const csErr = new Float64Array(ncs);
  const csModel = new Float64Array(ncs);
  const mc = derivativeErrorModel('complex', d, epsF);
  for (let k = 0; k < ncs; k++) {
    csErr[k] = Math.abs(fdDerivative('complex', x, csH[k], { fn: F }) - exact);
    csModel[k] = mc.at(csH[k]);
  }
  return {
    fn: F.id,
    x0: x,
    exact,
    derivs: d,
    radius,
    derivsOk,
    epsF,
    h,
    schemes,
    complex: { h: csH, err: csErr, model: csModel, hOpt: mc.hOpt, floor: mc.floor },
  };
}

// ---------------------------------------------------------------------------
// (b) Floating point

const RHO_W = 1000;
const G0 = 9.81;
const P_ATM = 101325; // exactly representable in Float32 (an integer < 2^24)

// Independent references for the cancellation examples: each computes the
// same quantity a third way (a convergent series or another identity), so
// the stable form's error can be measured too (it is a few ulps, not 0).
function oneMinusCosSeries(x) {
  // x^2/2 - x^4/24 + ... to x^18/18!; for x <= 0.1 the next term is about
  // 1e-36 relative.
  const x2 = x * x;
  let term = x2 / 2;
  let s = 0;
  for (let k = 1; k <= 9; k++) {
    s += term;
    term *= -x2 / ((2 * k + 1) * (2 * k + 2));
  }
  return s;
}
function quadraticSmallRootSeries(b) {
  // -(1/b) sum_k C_k / b^(2k) with the Catalan numbers C_k (the root y of
  // y = (1 + y^2)/b); for b >= 10 the terms fall by about 4/b^2 each.
  const z = 1 / (b * b);
  let ck = 1;
  let zk = 1;
  let s = 0;
  for (let k = 0; k < 60; k++) {
    const t = ck * zk;
    s += t;
    if (t < 1e-20 * s) break;
    ck = (ck * 2 * (2 * k + 1)) / (k + 2);
    zk *= z;
  }
  return -s / b;
}
// sqrt(x+1) - sqrt(x) = sqrt(x) (exp(log1p(1/x)/2) - 1), with no subtraction.
const sqrtDiffIdentity = (x) => Math.sqrt(x) * Math.expm1(0.5 * Math.log1p(1 / x));
function expm1Series(x) {
  // Taylor series of e^x - 1 to x^15/15!; for |x| <= 0.1 the next term is
  // about 5e-29 relative.
  let term = x;
  let s = 0;
  for (let k = 2; k <= 16; k++) {
    s += term;
    term *= x / k;
  }
  return s;
}

// Catastrophic cancellation: each entry computes the same quantity two ways,
// naive and stable, and reference(x) a third, independent way (see above;
// for gauge-pressure the exact double value of the Float32 data).
export const CANCELLATION = {
  'one-minus-cos': {
    id: 'one-minus-cos',
    name: '1 − cos x for small x',
    tex: '1 - \\cos x',
    texStable: '2\\sin^{2}(x/2)',
    xMin: 1e-10,
    xMax: 1e-1,
    naive: (x) => 1 - Math.cos(x),
    stable: (x) => {
      const s = Math.sin(x / 2);
      return 2 * s * s;
    },
    reference: oneMinusCosSeries,
    note: 'cos x rounds to within u of 1, so all digits of x^2/2 below u are lost; below x = 2^-26.5 ≈ 1.05e-8 (where x^2/2 drops under 2^-54, half the spacing of doubles just below 1) the naive form returns exactly 0.',
  },
  quadratic: {
    id: 'quadratic',
    name: 'Small root of x² + bx + 1 = 0',
    tex: '\\frac{-b + \\sqrt{b^{2} - 4}}{2}',
    texStable: '\\frac{-2}{b + \\sqrt{b^{2} - 4}}',
    xMin: 1e1,
    xMax: 1e9,
    naive: (b) => (-b + Math.sqrt(b * b - 4)) / 2,
    stable: (b) => -2 / (b + Math.sqrt(b * b - 4)),
    reference: quadraticSmallRootSeries,
    note: 'For large b, sqrt(b^2 - 4) ≈ b and the naive numerator subtracts two nearly equal numbers. Multiplying by the conjugate (Vieta) removes the subtraction.',
  },
  'sqrt-diff': {
    id: 'sqrt-diff',
    name: '√(x+1) − √x for large x',
    tex: '\\sqrt{x+1} - \\sqrt{x}',
    texStable: '\\frac{1}{\\sqrt{x+1} + \\sqrt{x}}',
    xMin: 1,
    xMax: 1e16,
    naive: (x) => Math.sqrt(x + 1) - Math.sqrt(x),
    stable: (x) => 1 / (Math.sqrt(x + 1) + Math.sqrt(x)),
    reference: sqrtDiffIdentity,
    note: 'The same conjugate trick. At x = 1e16, x + 1 rounds to x and the naive difference is exactly 0.',
  },
  expm1: {
    id: 'expm1',
    name: 'eˣ − 1 for small x',
    tex: 'e^{x} - 1',
    texStable: '\\operatorname{expm1}(x)',
    xMin: 1e-16,
    xMax: 1e-1,
    naive: (x) => Math.exp(x) - 1,
    stable: (x) => Math.expm1(x),
    reference: expm1Series,
    note: 'Libraries provide expm1 and log1p precisely because e^x - 1 and log(1 + x) cancel for small x.',
  },
  'gauge-pressure': {
    id: 'gauge-pressure',
    name: 'Hydrostatic Δp from absolute pressures in Float32',
    tex: '(p_{\\mathrm{atm}} + \\rho g\\,\\Delta z) - p_{\\mathrm{atm}}',
    texStable: '\\rho g\\,\\Delta z \\text{ (store gauge pressure)}',
    xMin: 1e-7,
    xMax: 1,
    naive: (dz) => Math.fround(Math.fround(P_ATM + Math.fround(RHO_W * G0 * dz)) - P_ATM),
    stable: (dz) => Math.fround(RHO_W * G0 * dz),
    reference: (dz) => RHO_W * G0 * dz,
    note: 'Single precision near 101 325 Pa has a spacing of 2^-7 ≈ 0.0078 Pa, so adding then subtracting atmospheric pressure costs up to 2^-8 ≈ 0.0039 Pa, and a pressure difference of a few millipascals stored on top of atmospheric pressure is mostly rounding. Codes solve for a gauge or perturbation pressure for this reason. x is the height difference in metres; values in Pa.',
  },
};

// Evaluate one cancellation example over a log sweep of x. relErrStable can
// be exactly 0 where stable and reference agree to the last bit (clamp
// before taking a log).
export function cancellationSweep(id, { n = 91, xMin = null, xMax = null } = {}) {
  const E = CANCELLATION[id];
  if (!E) throw new Error(`unknown cancellation example ${id}`);
  const x = logspace(Math.log10(xMin ?? E.xMin), Math.log10(xMax ?? E.xMax), n);
  const naive = new Float64Array(n);
  const stable = new Float64Array(n);
  const reference = new Float64Array(n);
  const relErrNaive = new Float64Array(n);
  const relErrStable = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    naive[k] = E.naive(x[k]);
    stable[k] = E.stable(x[k]);
    reference[k] = E.reference ? E.reference(x[k]) : stable[k];
    relErrNaive[k] = Math.abs(naive[k] - reference[k]) / Math.abs(reference[k]);
    relErrStable[k] = Math.abs(stable[k] - reference[k]) / Math.abs(reference[k]);
  }
  return { id, x, naive, stable, reference, relErrNaive, relErrStable };
}

// Unit round-off u (half the machine epsilon) for each precision.
export const UNIT_ROUNDOFF = { f64: 2 ** -53, f32: 2 ** -24 };

// Running sums of `start + increment + increment + ...` three ways:
//   naive  s += x                       (recursive summation)
//   kahan  compensated summation (Kahan 1965)
//   exact  cascaded TwoSum in double-double (Ogita, Rump & Oishi 2005), used
//          as the reference; its error is ~1e-32 relative, far below both.
// precision 'f32' rounds the data and every naive/Kahan operation to single
// precision with Math.fround. jitter > 0 scales each increment by a seeded
// random factor in [1 - jitter, 1 + jitter].
export function createSummation({ start = 1, increment = 1e-8, precision = 'f32', jitter = 0, seed = 1 } = {}) {
  const r = precision === 'f32' ? Math.fround : (v) => v;
  const s0 = r(start);
  return {
    precision,
    increment,
    jitter,
    rand: rng(seed),
    k: 0,
    start: s0,
    naive: s0,
    kahan: s0,
    comp: 0,
    hi: s0,
    lo: 0,
    absSum: Math.abs(s0),
  };
}

// Add `count` more increments. Mutates s; no allocation.
export function stepSummation(s, count = 1) {
  const f32 = s.precision === 'f32';
  const fr = Math.fround;
  let { naive, kahan, comp, hi, lo, absSum } = s;
  for (let i = 0; i < count; i++) {
    let x = s.jitter > 0 ? s.increment * (1 + s.jitter * (2 * s.rand() - 1)) : s.increment;
    if (f32) {
      x = fr(x);
      naive = fr(naive + x);
      const y = fr(x - comp);
      const t = fr(kahan + y);
      comp = fr(fr(t - kahan) - y);
      kahan = t;
    } else {
      naive = naive + x;
      const y = x - comp;
      const t = kahan + y;
      comp = t - kahan - y;
      kahan = t;
    }
    // TwoSum(hi, x): exact error of the double addition, accumulated in lo.
    const sum = hi + x;
    const bb = sum - hi;
    lo += hi - (sum - bb) + (x - bb);
    hi = sum;
    absSum += Math.abs(x);
  }
  s.naive = naive;
  s.kahan = kahan;
  s.comp = comp;
  s.hi = hi;
  s.lo = lo;
  s.absSum = absSum;
  s.k += count;
  return s;
}

// Errors of the current sums. `added` is the exact mass added so far; the
// relative errors are relative to it ("how much of the inflow was lost").
// bounds are Higham's (2002, §4.2-4.3) first-order bounds: naive
// (k) u sum|x_i|, Kahan 2u sum|x_i| (+ O(k u^2)). Pass a reusable `out`
// object to read the errors every frame without allocating.
export function summationErrors(s, out = {}) {
  const exact = s.hi + s.lo;
  const added = s.hi - s.start + s.lo;
  const u = UNIT_ROUNDOFF[s.precision];
  const naiveErr = Math.abs(s.naive - s.hi - s.lo);
  const kahanErr = Math.abs(s.kahan - s.hi - s.lo);
  out.k = s.k;
  out.exact = exact;
  out.added = added;
  out.naive = s.naive;
  out.kahan = s.kahan;
  out.naiveErr = naiveErr;
  out.kahanErr = kahanErr;
  out.naiveAddedRel = naiveErr / Math.abs(added);
  out.kahanAddedRel = kahanErr / Math.abs(added);
  out.boundNaive = s.k * u * s.absSum;
  out.boundKahan = (2 * u + s.k * u * u) * s.absSum;
  return out;
}

// Run a summation and record the errors at `samples` evenly spaced counts.
// This runs all `steps` in one call (about 10-15 ms for 1e6 steps in node,
// several frames on a phone): use it to precompute, and drive an animation
// with createSummation + stepSummation(s, PRESETS[...].stepsPerFrame) +
// summationErrors(s, out) instead.
export function summationDrift({ steps = 1e6, samples = 100, ...params } = {}) {
  const s = createSummation(params);
  const k = new Float64Array(samples + 1);
  const naiveErr = new Float64Array(samples + 1);
  const kahanErr = new Float64Array(samples + 1);
  const exact = new Float64Array(samples + 1);
  const e = {};
  let done = 0;
  for (let j = 0; j <= samples; j++) {
    const target = Math.round((steps * j) / samples);
    stepSummation(s, target - done);
    done = target;
    summationErrors(s, e);
    k[j] = done;
    naiveErr[j] = e.naiveErr;
    kahanErr[j] = e.kahanErr;
    exact[j] = e.exact;
  }
  return { k, naiveErr, kahanErr, exact, final: summationErrors(s), state: s };
}

// Harmonic oscillator x'' = -omega^2 x by symplectic Euler,
//   v <- v - (dt omega^2) x;   x <- x + dt v,
// run side by side in Float64 and in Float32 (every operation through
// Math.fround). In exact arithmetic this map conserves the modified energy
//   H~ = (v^2 + omega^2 x^2 - dt omega^2 x v) / 2
// exactly (Hairer, Lubich & Wanner 2006), so any drift in H~ is round-off.
// The Float32 copy also stores its constants dt and dt omega^2 in single
// precision, which changes the discrete frequency slightly: that systematic
// error grows linearly in the phase. sameParams: true gives the Float64 copy
// the same rounded constants, isolating per-operation round-off.
// The clocks t += dt in each precision show the classic stalled-time bug.
export function createOscillator({ omega = 1, dt = 0.01, x0 = 1, v0 = 0, sameParams = false } = {}) {
  const fr = Math.fround;
  const dt32 = fr(dt);
  const w2dt32 = fr(omega * omega * dt);
  const s = {
    omega,
    dt,
    x0,
    v0,
    n: 0,
    x64: x0,
    v64: v0,
    t64: 0,
    x32: fr(x0),
    v32: fr(v0),
    t32: 0,
    dt32,
    w2dt32,
    dt64: sameParams ? dt32 : dt,
    w2dt64: sameParams ? w2dt32 : omega * omega * dt,
  };
  s.inv64 = mapInvariant(s.x64, s.v64, s.dt64, s.w2dt64);
  s.inv32 = mapInvariant(s.x32, s.v32, dt32, w2dt32);
  return s;
}

export function oscillatorInvariant(x, v, omega, dt) {
  const w2 = omega * omega;
  return 0.5 * (v * v + w2 * x * x - dt * w2 * x * v);
}

// The same invariant written with the step coefficients as coded (a in
// x += a v, b in v -= b x): ((b/a) x^2 + v^2 - b x v)/2. Each copy is checked
// against the invariant of its own (possibly rounded) constants.
const mapInvariant = (x, v, a, b) => 0.5 * ((b / a) * x * x + v * v - b * x * v);

// Phase advance per step of the symplectic-Euler map with step coefficients
// a (in x += a v) and b (in v -= b x): the trace is 2 - ab, so
// cos(theta) = 1 - ab/2, i.e. theta = 2 asin(sqrt(ab)/2) (the cancellation-
// free form).
export const eulerPhasePerStep = (a, b) => 2 * Math.asin(Math.sqrt(a * b) / 2);

// Time at which a Float32 clock t += dt stops advancing: the first power of
// two T whose half-ulp, T 2^-24, reaches dt (at equality, ties-to-even
// stalls it too). Below T the clock still moves, but by a rounded amount, so
// it runs fast or slow long before it stops.
export const float32ClockStall = (dt) => Math.pow(2, Math.ceil(Math.log2(Math.fround(dt) * 2 ** 24)));

// Advance both copies by `count` steps. Mutates s; no allocation.
export function stepOscillator(s, count = 1) {
  const fr = Math.fround;
  const w2dt = s.w2dt64;
  const dt = s.dt64;
  const w2dt32 = s.w2dt32;
  const dt32 = s.dt32;
  const dtClock = s.dt;
  let { x64, v64, t64, x32, v32, t32 } = s;
  for (let i = 0; i < count; i++) {
    v64 -= w2dt * x64;
    x64 += dt * v64;
    t64 += dtClock;
    v32 = fr(v32 - fr(w2dt32 * x32));
    x32 = fr(x32 + fr(dt32 * v32));
    t32 = fr(t32 + dt32);
  }
  s.x64 = x64;
  s.v64 = v64;
  s.t64 = t64;
  s.x32 = x32;
  s.v32 = v32;
  s.t32 = t32;
  s.n += count;
  return s;
}

// Diagnostics of the current state:
//   invErr64, invErr32  relative change of H~ (round-off only)
//   phaseDiff           phase of the Float32 copy minus phase of the Float64
//                       copy, radians, in (-pi, pi]
//   phaseFromParams     the part of phaseDiff predicted from the rounded
//                       constants alone: n (theta32 - theta64)
//   posDiff             |x32 - x64|
//   truncErr64          |x64 - exact ODE solution| (the scheme's own phase
//                       error, for contrast with round-off)
//   clockErr64/32       t - n dt
// Pass a reusable `out` object to read them every frame without allocating.
export function oscillatorErrors(s, out = {}) {
  const t = s.n * s.dt;
  const exact = s.x0 * Math.cos(s.omega * t) + (s.v0 / s.omega) * Math.sin(s.omega * t);
  const i64 = mapInvariant(s.x64, s.v64, s.dt64, s.w2dt64);
  const i32 = mapInvariant(s.x32, s.v32, s.dt32, s.w2dt32);
  let d = Math.atan2(-s.v32 / s.omega, s.x32) - Math.atan2(-s.v64 / s.omega, s.x64);
  d = Math.atan2(Math.sin(d), Math.cos(d));
  out.n = s.n;
  out.t = t;
  out.invErr64 = Math.abs(i64 - s.inv64) / s.inv64;
  out.invErr32 = Math.abs(i32 - s.inv32) / s.inv32;
  out.phaseDiff = d;
  out.phaseFromParams = s.n * (eulerPhasePerStep(s.dt32, s.w2dt32) - eulerPhasePerStep(s.dt64, s.w2dt64));
  out.posDiff = Math.abs(s.x32 - s.x64);
  out.truncErr64 = Math.abs(s.x64 - exact);
  out.clockErr64 = s.t64 - t;
  out.clockErr32 = s.t32 - t;
  return out;
}

// Sampled run of `steps` steps in one call (about 10-15 ms for 1e6 steps in
// node): for precomputing. To animate, call stepOscillator(s,
// PRESETS[...].stepsPerFrame) and oscillatorErrors(s, out) once per frame.
export function oscillatorDrift({ steps = 1e6, samples = 200, ...params } = {}) {
  const s = createOscillator(params);
  const keys = ['n', 't', 'invErr64', 'invErr32', 'phaseDiff', 'phaseFromParams', 'posDiff', 'truncErr64', 'clockErr64', 'clockErr32'];
  const out = {};
  for (const key of keys) out[key] = new Float64Array(samples + 1);
  const e = {};
  let done = 0;
  for (let j = 0; j <= samples; j++) {
    const target = Math.round((steps * j) / samples);
    stepOscillator(s, target - done);
    done = target;
    oscillatorErrors(s, e);
    for (const key of keys) out[key][j] = e[key];
  }
  out.state = s;
  return out;
}

// ---------------------------------------------------------------------------
// (c) Convergence-study helpers

// Observed order between successive entries of (h, error) pairs with any
// refinement ratios: p_k = ln(e_k / e_{k+1}) / ln(h_k / h_{k+1}).
export function observedOrdersH(hs, errs) {
  const out = [];
  for (let k = 0; k + 1 < errs.length; k++) out.push(Math.log(errs[k] / errs[k + 1]) / Math.log(hs[k] / hs[k + 1]));
  return out;
}

// Least-squares fit of log e = log C + p log h. Returns { p, C }.
export function fitOrder(hs, errs) {
  let n = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let k = 0; k < errs.length; k++) {
    if (!(errs[k] > 0)) continue;
    const X = Math.log(hs[k]);
    const Y = Math.log(errs[k]);
    n++;
    sx += X;
    sy += Y;
    sxx += X * X;
    sxy += X * Y;
  }
  const p = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { p, C: Math.exp((sy - p * sx) / n) };
}

// Richardson extrapolation with a known order p: f1 is the finer value.
export const richardsonExtrapolate = (f1, f2, r, p) => f1 + (f1 - f2) / (r ** p - 1);

// Convergence class of three grid values (1 = finest) from the ratio
// R = (f2 - f1)/(f3 - f2): 0 < R < 1 monotone, R < 0 oscillatory, R >= 1
// (or f3 = f2 != f1) divergent. f2 = f1 is 'indeterminate': the two finest
// grids agree, which may mean the exact answer was reached or may hide an
// oscillation (Celik et al. 2008 note the procedure fails when e21 or e32
// is near zero).
function convergenceClass(f1, f2, f3) {
  if (f2 === f1) return 'indeterminate';
  const R = (f2 - f1) / (f3 - f2);
  if (R > 0 && R < 1) return 'monotone';
  if (R < 0) return 'oscillatory';
  return 'divergent';
}

// Three grids with a constant ratio r (1 = finest): observed order
//   p = ln((f3 - f2) / (f2 - f1)) / ln r,
// the extrapolated value, the convergence ratio R = (f2 - f1)/(f3 - f2) and
// its class (see convergenceClass). Only monotone data fit the Richardson
// model f = f0 + C h^p, so fExt is NaN otherwise: for oscillatory data p is
// NaN as well (the log of a negative ratio; gci3 follows Celik's
// absolute-value convention instead), for divergent data p <= 0 (the error
// grows), and for indeterminate data p = Infinity.
export function richardson3(f1, f2, f3, r = 2) {
  const R = (f2 - f1) / (f3 - f2);
  const convergence = convergenceClass(f1, f2, f3);
  const p = Math.log((f3 - f2) / (f2 - f1)) / Math.log(r);
  const fExt = convergence === 'monotone' ? richardsonExtrapolate(f1, f2, r, p) : NaN;
  return { p, fExt, R, convergence };
}

// Celik et al. (2008) procedure (Eqs. 3-7) for three grids, 1 = finest.
// Give the grid sizes as h = [h1, h2, h3], or as cell counts N = [N1, N2, N3]
// with the dimension dim (h ~ N^(-1/dim), Eqs. 1-2), or the ratios r21, r32.
// The apparent order solves
//   p = |ln|e32/e21| + q(p)| / ln r21,  q(p) = ln((r21^p - s)/(r32^p - s)),
//   s = sign(e32/e21),
// by fixed-point iteration from q = 0 (exact for constant r).
// Returns p, the extrapolated value, e_a^21, e_ext^21, GCI_fine^21 (as
// fractions, not percent), the coarse-pair GCI_32 (relative to f2), and
// Roache's asymptotic-range ratio GCI_32 / (r21^p GCI_21), which is ~1 when
// the grids are in the asymptotic range.
// The absolute values in Eq. 3 hide divergence: |e21| > |e32| still gives a
// positive p. The GCI assumes the grids converge (Roache 1998), so for
// 'divergent' and 'indeterminate' data (see convergenceClass) valid is false
// and every extrapolated quantity and GCI is NaN; p is still reported.
// Oscillatory data keep valid = true, as in Celik's Table 1, column 3.
export function gci3({ f, h = null, N = null, dim = 2, r21 = null, r32 = null, Fs = 1.25, tol = 1e-12, maxIter = 200 }) {
  const [f1, f2, f3] = f;
  if (h) {
    r21 = h[1] / h[0];
    r32 = h[2] / h[1];
  } else if (N) {
    r21 = Math.pow(N[0] / N[1], 1 / dim);
    r32 = Math.pow(N[1] / N[2], 1 / dim);
  }
  const e21 = f2 - f1;
  const e32 = f3 - f2;
  const ratio = e32 / e21;
  const s = Math.sign(ratio);
  const lnr = Math.log(r21);
  const a = Math.log(Math.abs(ratio));
  let p = Math.abs(a) / lnr;
  let iterations = 0;
  let converged = false;
  for (; iterations < maxIter; iterations++) {
    const q = Math.log((r21 ** p - s) / (r32 ** p - s));
    const pNew = Math.abs(a + q) / lnr;
    if (!Number.isFinite(pNew)) {
      p = NaN;
      break;
    }
    const dp = Math.abs(pNew - p);
    p = pNew;
    if (dp < tol * Math.max(1, p)) {
      converged = true;
      iterations++;
      break;
    }
  }
  const convergence = e32 === 0 && e21 !== 0 ? 'divergent' : convergenceClass(f1, f2, f3);
  const valid = convergence === 'monotone' || convergence === 'oscillatory';
  const rp21 = valid ? r21 ** p : NaN;
  const rp32 = valid ? r32 ** p : NaN;
  const fExt21 = (rp21 * f1 - f2) / (rp21 - 1);
  const fExt32 = (rp32 * f2 - f3) / (rp32 - 1);
  const ea21 = Math.abs((f1 - f2) / f1);
  const eext21 = Math.abs((fExt21 - f1) / fExt21);
  const gciFine21 = (Fs * ea21) / (rp21 - 1);
  const ea32 = Math.abs((f2 - f3) / f2);
  const gci32 = (Fs * ea32) / (rp32 - 1);
  return {
    p,
    iterations,
    converged,
    valid,
    r21,
    r32,
    e21,
    e32,
    s,
    convergence,
    fExt21,
    fExt32,
    ea21,
    eext21,
    gciFine21,
    ea32,
    gci32,
    asymptoticRatio: gci32 / (rp21 * gciFine21),
  };
}

// Celik et al. (2008) Table 1, three columns: backward-facing-step flow,
// data from Celik & Karatekin (1997). Printed results: p, phi_ext^21 and the
// percentages e_a^21, e_ext^21, GCI_fine^21. Cells are 2-D (dim = 2).
export const GCI_EXAMPLES = [
  {
    id: 'celik-reattachment',
    label: 'Dimensionless reattachment length (monotonic convergence)',
    N: [18000, 8000, 4500],
    dim: 2,
    f: [6.063, 5.972, 5.863],
    printed: { r21: 1.5, r32: 1.333, p: 1.53, fExt21: 6.1685, ea21: 1.5, eext21: 1.7, gciFine21: 2.2 },
  },
  {
    id: 'celik-velocity-p-lt-1',
    label: 'Axial velocity at x/H = 8, y = 0.0526 (p < 1)',
    N: [18000, 4500, 980],
    dim: 2,
    f: [10.788, 10.725, 10.605],
    printed: { r21: 2.0, r32: 2.143, p: 0.75, fExt21: 10.8801, ea21: 0.6, eext21: 0.9, gciFine21: 1.1 },
  },
  {
    id: 'celik-velocity-oscillatory',
    label: 'Axial velocity at x/H = 8, y = 0.0526 (oscillatory convergence)',
    N: [18000, 4500, 980],
    dim: 2,
    f: [6.0042, 5.9624, 6.0909],
    printed: { r21: 2.0, r32: 2.143, p: 1.51, fExt21: 6.0269, ea21: 0.7, eext21: 0.4, gciFine21: 0.5 },
  },
];

// ---------------------------------------------------------------------------
// (d) Method of manufactured solutions
//
// PDE on 0 <= x <= 1:   -nu u'' + a u' + kappa u = s(x),
//   u(0) = u_m(0) (Dirichlet),   u'(1) = u_m'(1) (Neumann).
// Pick u_m, compute s = -nu u_m'' + a u_m' + kappa u_m analytically, solve
// the discrete problem, compare with u_m. Interior rows (i = 1..N-1):
//   -nu (u_{i-1} - 2u_i + u_{i+1})/h^2 + a (u_{i+1} - u_{i-1})/(2h) + kappa u_i = s(x_i)
// Boundary row at x_N = 1: ghost point u_{N+1} = u_{N-1} + 2h q substituted
// into the same centred equation (second order; LeVeque 2007 §2.12).
// The 'upwind' advection option (a first-order scheme, not a bug) uses
// a (u_i - u_{i-1})/h for a > 0, mirrored for a < 0.

export const MMS_SOLUTIONS = {
  'sine-exp': {
    id: 'sine-exp',
    name: 'Smooth, every term active',
    tex: 'u_m(x) = 1 + e^{-x}\\sin 3x',
    u: (x) => 1 + Math.exp(-x) * Math.sin(3 * x),
    du: (x) => Math.exp(-x) * (3 * Math.cos(3 * x) - Math.sin(3 * x)),
    d2u: (x) => Math.exp(-x) * (-8 * Math.sin(3 * x) - 6 * Math.cos(3 * x)),
    duTex: "u_m' = e^{-x}(3\\cos 3x - \\sin 3x)",
    d2uTex: "u_m'' = -e^{-x}(8\\sin 3x + 6\\cos 3x)",
    note: 'Non-polynomial, with non-zero first and second derivatives, so every term of the equation and both boundary conditions are exercised (Salari & Knupp 2000).',
  },
  linear: {
    id: 'linear',
    name: 'Too simple: linear',
    tex: 'u_m(x) = 1 + 2x',
    u: (x) => 1 + 2 * x,
    du: () => 2,
    d2u: () => 0,
    duTex: "u_m' = 2",
    d2uTex: "u_m'' = 0",
    note: 'Central differences are exact on a linear function and u\'\' = 0, so a bug in the diffusion term or in the boundary closure is invisible: the error is round-off on every grid.',
  },
};

export const MMS_BUGS = {
  none: {
    id: 'none',
    name: 'Correct solver',
    correct: '',
    buggy: '',
    expected: 'Observed order 2 on every refinement.',
    expectedOrder: 2,
  },
  'bc-first-order': {
    id: 'bc-first-order',
    name: 'First-order Neumann closure',
    correct: 'ghost point: u[N+1] = u[N-1] + 2*h*q, then the centred equation at i = N',
    buggy: '(u[N] - u[N-1]) / h = q',
    expected: 'One first-order row at the boundary pollutes the whole solution: the observed order tends to 1. On coarse grids the O(h) boundary error and the O(h^2) interior error have opposite signs and partly cancel, so the order wanders before settling (1.6, 0.6, 0.8, 0.9, 1.0 from N = 10 with the defaults), and on the coarsest grid the buggy code even beats the correct one.',
    expectedOrder: 1,
  },
  'advection-half': {
    id: 'advection-half',
    name: 'Coefficient typo in advection',
    correct: 'a * (u[i+1] - u[i-1]) / (2*h)',
    buggy: 'a * (u[i+1] - u[i-1]) / (4*h)',
    expected: 'The code solves a different equation (advection speed a/2): the error stops falling and the observed order goes to 0.',
    expectedOrder: 0,
  },
  'source-shift': {
    id: 'source-shift',
    name: 'Source at the wrong point',
    correct: 's(x[i])',
    buggy: 's(x[i] + h/2)',
    expected: 'An O(h) error in the forcing: observed order drops to 1.',
    expectedOrder: 1,
  },
  'diffusion-half': {
    id: 'diffusion-half',
    name: 'Coefficient typo in diffusion',
    correct: 'nu * (u[i-1] - 2*u[i] + u[i+1]) / h**2',
    buggy: 'nu * (u[i-1] - 2*u[i] + u[i+1]) / (2*h**2)',
    expected: 'Wrong equation again (diffusivity nu/2): the error plateaus. With the linear manufactured solution it is invisible.',
    expectedOrder: 0,
  },
};

export const MMS_DEFAULTS = { nu: 0.1, a: 1, kappa: 1, solution: 'sine-exp', advection: 'central', n0: 10, levels: 6, ratio: 2 };

// The manufactured source term s = -nu u'' + a u' + kappa u, evaluated from
// the analytic derivatives.
export function mmsSource(x, sol, nu, a, kappa) {
  return -nu * sol.d2u(x) + a * sol.du(x) + kappa * sol.u(x);
}
export function mmsSourceTex(nu = MMS_DEFAULTS.nu, a = MMS_DEFAULTS.a, kappa = MMS_DEFAULTS.kappa) {
  let body = '';
  for (const [c, sym] of [[-nu, "u_m''"], [a, "u_m'"], [kappa, 'u_m']]) {
    if (c === 0) continue;
    const m = Math.abs(c);
    const mag = m === 1 ? '' : `${Number(m.toPrecision(6))}\\,`;
    const sign = body === '' ? (c < 0 ? '-' : '') : c < 0 ? ' - ' : ' + ';
    body += `${sign}${mag}${sym}`;
  }
  return `s(x) = ${body || '0'}`;
}

// Thomas algorithm for a tridiagonal system: lower[i] u[i-1] + diag[i] u[i]
// + upper[i] u[i+1] = rhs[i], i = 0..n-1. Overwrites diag and rhs; writes u.
// No pivoting (the MMS rows are diagonally dominant for cell Peclet < 2).
export function thomasSolve(lower, diag, upper, rhs, u, n = diag.length) {
  for (let i = 1; i < n; i++) {
    const m = lower[i] / diag[i - 1];
    diag[i] -= m * upper[i - 1];
    rhs[i] -= m * rhs[i - 1];
  }
  u[n - 1] = rhs[n - 1] / diag[n - 1];
  for (let i = n - 2; i >= 0; i--) u[i] = (rhs[i] - upper[i] * u[i + 1]) / diag[i];
  return u;
}

// Solve the MMS problem on N cells (an integer >= 2). bugs: a bug id or an
// array of ids. Unknown solution, advection or bug ids throw, so a typo
// cannot silently show the correct solver. Returns the grid, the discrete
// and manufactured solutions and the error norms (max and discrete L2 over
// the nodes).
export function mmsSolve({
  n = 40,
  nu = MMS_DEFAULTS.nu,
  a = MMS_DEFAULTS.a,
  kappa = MMS_DEFAULTS.kappa,
  solution = MMS_DEFAULTS.solution,
  advection = MMS_DEFAULTS.advection,
  bugs = [],
} = {}) {
  const sol = typeof solution === 'string' ? MMS_SOLUTIONS[solution] : solution;
  if (!sol || typeof sol.u !== 'function') throw new Error(`unknown manufactured solution ${solution}`);
  if (advection !== 'central' && advection !== 'upwind') throw new Error(`unknown advection scheme ${advection} (central or upwind)`);
  const set = new Set(typeof bugs === 'string' ? [bugs] : bugs);
  for (const b of set) if (!MMS_BUGS[b]) throw new Error(`unknown MMS bug ${b}`);
  if (!Number.isInteger(n) || n < 2) throw new RangeError(`N must be an integer >= 2 (got ${n})`);
  const h = 1 / n;
  const d = (set.has('diffusion-half') ? 0.5 : 1) * nu; // diffusivity as coded
  const ac = (set.has('advection-half') ? 0.5 : 1) * a; // advection speed as coded
  const shift = set.has('source-shift') ? h / 2 : 0;
  const m = n; // unknowns u_1..u_N stored at k = i - 1
  const lower = new Float64Array(m);
  const diag = new Float64Array(m);
  const upper = new Float64Array(m);
  const rhs = new Float64Array(m);
  const sol1 = new Float64Array(m);
  const dh2 = d / (h * h);
  let lo;
  let di;
  let up;
  if (advection === 'upwind') {
    lo = -dh2 - Math.max(ac, 0) / h;
    up = -dh2 + Math.min(ac, 0) / h;
    di = 2 * dh2 + kappa + Math.abs(ac) / h;
  } else {
    lo = -dh2 - ac / (2 * h);
    up = -dh2 + ac / (2 * h);
    di = 2 * dh2 + kappa;
  }
  const u0 = sol.u(0);
  const q = sol.du(1);
  for (let i = 1; i <= n; i++) {
    const k = i - 1;
    lower[k] = lo;
    diag[k] = di;
    upper[k] = up;
    rhs[k] = mmsSource(i * h + shift, sol, nu, a, kappa);
  }
  rhs[0] -= lo * u0;
  lower[0] = 0;
  // Boundary row i = N.
  const kN = n - 1;
  upper[kN] = 0;
  if (set.has('bc-first-order')) {
    lower[kN] = -1 / h;
    diag[kN] = 1 / h;
    rhs[kN] = q;
  } else {
    // Ghost point u_{N+1} = u_{N-1} + 2hq in the row's own stencil:
    // lo u_{N-1} + di u_N + up (u_{N-1} + 2hq) = s_N.
    lower[kN] = lo + up;
    rhs[kN] -= up * 2 * h * q;
  }
  thomasSolve(lower, diag, upper, rhs, sol1, m);
  const x = new Float64Array(n + 1);
  const u = new Float64Array(n + 1);
  const exact = new Float64Array(n + 1);
  let errMax = 0;
  let s2 = 0;
  for (let i = 0; i <= n; i++) {
    x[i] = i * h;
    u[i] = i === 0 ? u0 : sol1[i - 1];
    exact[i] = sol.u(x[i]);
    const e = Math.abs(u[i] - exact[i]);
    errMax = Math.max(errMax, e);
    s2 += e * e;
  }
  return { n, h, x, u, exact, errMax, errL2: Math.sqrt(s2 * h) };
}

// Refinement study: N_k = round(n0 ratio^k), k = 0..levels-1 (forced to
// increase by at least 1 per level), so non-integer ratios such as 1.5 work;
// the observed order uses the actual h ratio of each pair. Yields one 'iter'
// event per grid with the observed order against the previous grid (max
// norm), and returns the table.
export function* mmsStudy(opts = {}) {
  const { n0 = MMS_DEFAULTS.n0, levels = MMS_DEFAULTS.levels, ratio = MMS_DEFAULTS.ratio, ...rest } = opts;
  if (!(ratio > 1)) throw new RangeError(`refinement ratio must be > 1 (got ${ratio})`);
  const rows = [];
  let nPrev = 0;
  for (let k = 0; k < levels; k++) {
    const n = Math.max(Math.round(n0 * ratio ** k), nPrev + 1);
    nPrev = n;
    const r = mmsSolve({ ...rest, n });
    const prev = rows[k - 1];
    const order = prev ? Math.log(prev.errMax / r.errMax) / Math.log(prev.h / r.h) : NaN;
    const orderL2 = prev ? Math.log(prev.errL2 / r.errL2) / Math.log(prev.h / r.h) : NaN;
    const row = { n, h: r.h, errMax: r.errMax, errL2: r.errL2, order, orderL2 };
    rows.push(row);
    yield { t: 'iter', k, ...row };
  }
  return {
    rows,
    h: rows.map((r) => r.h),
    errMax: rows.map((r) => r.errMax),
    errL2: rows.map((r) => r.errL2),
    orders: rows.slice(1).map((r) => r.order),
    finalOrder: rows[rows.length - 1].order,
  };
}

// Convenience: run the study to completion.
export const mmsConvergence = (opts = {}) => drain(mmsStudy(opts));

// ---------------------------------------------------------------------------
// Presets the chapter's figures can name. stepsPerFrame (summation and
// oscillator presets) is a per-animation-frame chunk for stepSummation /
// stepOscillator: 0.05-0.1 ms per frame in node on a desktop (well under
// 1 ms on a mid-range phone), so a 1e6-step preset animates in 50-100
// frames.

export const PRESETS = {
  'fd-v': { kind: 'derivative', fn: 'squire-trapp', note: 'All five formulas on the Squire–Trapp function at x = 1.5.' },
  'fd-v-exp': { kind: 'derivative', fn: 'exp', note: 'The same sweep on e^x at x = 1 (all derivatives equal e).' },
  'fd-representable': {
    kind: 'derivative',
    fn: 'squire-trapp',
    representableStep: true,
    note: 'h = (x + h) - x, so the step divided by is the step taken. That representation error is the same size as the rounding of f itself, so the round-off branch drops by only about a third and the V keeps its shape and its best h. The sweep stops at h ≈ 2e-16, where the step would round to 0.',
  },
  'cancel-cos': { kind: 'cancellation', id: 'one-minus-cos' },
  'cancel-quadratic': { kind: 'cancellation', id: 'quadratic' },
  'cancel-gauge': { kind: 'cancellation', id: 'gauge-pressure' },
  'sum-f32-stall': { kind: 'summation', precision: 'f32', start: 1, increment: 1e-8, steps: 1e6, stepsPerFrame: 1e4, note: 'Float32: each 1e-8 kg increment is below half an ulp of 1 kg, so naive summation never moves.' },
  'sum-f32-drift': { kind: 'summation', precision: 'f32', start: 1, increment: 1e-6, steps: 1e6, jitter: 0.5, stepsPerFrame: 1e4, note: 'Float32 with increments above the rounding threshold: naive drift grows steadily.' },
  'sum-f64-drift': { kind: 'summation', precision: 'f64', start: 1, increment: 1e-10, steps: 1e6, stepsPerFrame: 2e4, note: 'Float64: the drift is small but systematic; Kahan stays at round-off.' },
  'oscillator-long': { kind: 'oscillator', omega: 1, dt: 0.01, steps: 1e6, stepsPerFrame: 1e4, note: '10 000 time units (about 1 600 periods), Float32 beside Float64.' },
  'oscillator-same-params': { kind: 'oscillator', omega: 1, dt: 0.01, steps: 1e6, sameParams: true, stepsPerFrame: 1e4, note: 'Both copies use the Float32-rounded dt: what is left is per-operation round-off.' },
  'mms-correct': { kind: 'mms', bugs: [] },
  'mms-bc': { kind: 'mms', bugs: ['bc-first-order'], note: 'The order wanders (1.6, 0.6, 0.8, 0.9) before settling at 1; on the coarsest grid the bug even looks better than the correct code.' },
  'mms-advection-typo': { kind: 'mms', bugs: ['advection-half'] },
  'mms-source-shift': { kind: 'mms', bugs: ['source-shift'] },
  'mms-diffusion-typo': { kind: 'mms', bugs: ['diffusion-half'] },
  'mms-weak-solution': { kind: 'mms', solution: 'linear', bugs: ['diffusion-half'], note: 'A linear manufactured solution cannot see the diffusion typo.' },
  'mms-ratio-1.5': { kind: 'mms', ratio: 1.5, levels: 8, note: 'Refinement ratio 1.5 (N = 10, 15, 23, 34, ...): the observed order uses the actual h ratios and is still 2.' },
  'mms-upwind': { kind: 'mms', advection: 'upwind', note: 'First-order upwind advection (a scheme choice, not a bug): order 1.' },
  'gci-celik': { kind: 'gci', example: 'celik-reattachment' },
  'gci-oscillatory': { kind: 'gci', example: 'celik-velocity-oscillatory' },
};
