// Finite-difference derivatives in single precision (chapter 6, "From
// calculus to arithmetic"). The shared kernel verification.js sweeps the
// derivative error against h in double precision; this module runs the same
// five formulas with every operation rounded to IEEE single precision, so the
// figure can show how the "V" moves when the machine epsilon grows from
// 2^-52 to 2^-23.
//
// What it does
//   - f32 versions of the verification.js test functions (Squire–Trapp,
//     e^x, sin x): the argument is rounded to single precision, and every
//     elementary result is rounded with Math.fround. Math.sin, Math.exp and
//     Math.sqrt are evaluated in double and then rounded, which models a
//     good single-precision maths library (within one rounding of the exact
//     value).
//   - The same functions in single-precision complex arithmetic, for the
//     complex step. Every product, sum, quotient and elementary function
//     result is rounded to single precision.
//   - fdDerivative32(scheme, x, h, fn): the forward, backward, central,
//     fourth-order central and complex-step formulas of
//     verification.js (DERIVATIVE_SCHEMES), evaluated in single precision.
//     The step h is rounded to single precision first, and so is x + h, just
//     as it would be in a program that stores everything as float32.
//   - derivativeSweep32(opts): the error of each formula against h, in the
//     same shape as verification.js derivativeSweep, with the textbook
//     worst-case error model evaluated at eps = 2^-23 and the measured
//     optimum found by the same branch fit (BRANCH_FIT_DECADES).
//
// Conventions
//   - eps32 = 2^-23 (gap between 1 and the next float32); unit round-off
//     u32 = 2^-24 (verification.js UNIT_ROUNDOFF.f32).
//   - Errors are measured against the exact double-precision derivative
//     (verification.js TEST_FUNCTIONS[fn].df, or the 40-digit dfx0).
//   - Emulating float32 by rounding each double result with Math.fround is
//     exact for + − × ÷ and sqrt, because 53 >= 2·24 + 2 (Figueroa 1995,
//     cited in verification.js). For sin, cos, exp, sinh and cosh it gives
//     the correctly rounded float32 value of the double result, which is
//     within one float32 rounding of the true value: a good libm, not a
//     particular one.
//   - Below about h = ulp32(x)/2 (6e-8 at x = 1.5) the step rounds away
//     (x + h == x in float32), the subtractive formulas return 0 and the
//     error is |f'|. That plateau is real single-precision behaviour.
//   - For the complex step, h below the float32 underflow threshold
//     (about 1.4e-45) rounds to 0, and the products cos x · sinh h become
//     subnormal from about 1e-38. The sweep stops at 1e-36 by default.
//
// Sources: Higham, Accuracy and Stability of Numerical Algorithms, 2nd ed.
//   (2002) ch. 1-2; Goldberg, ACM Comput. Surv. 23 (1991) 5-48; IEEE Std
//   754-2019 (binary32); Squire & Trapp, SIAM Review 40 (1998) 110-112;
//   Martins, Sturdza & Alonso, ACM TOMS 29 (2003) 245-262.

import { TEST_FUNCTIONS, safeTaylorDerivatives, derivativeErrorModel, logspace, BRANCH_FIT_DECADES } from './verification.js';

export const EPS32 = 2 ** -23;

const r = Math.fround;

// ---- single-precision complex arithmetic ([re, im] pairs in two numbers) --
// Each helper returns a fresh {re, im}; a full sweep makes a few thousand of
// them, once per toggle, never per frame. Internal: only the f32 test
// functions use them.
const c32 = (re, im) => ({ re: r(re), im: r(im) });
const cmul32 = (a, b) => c32(r(a.re * b.re) - r(a.im * b.im), r(a.re * b.im) + r(a.im * b.re));
const cadd32 = (a, b) => c32(a.re + b.re, a.im + b.im);
function cdiv32(a, b) {
  // Smith (1962), each operation rounded.
  if (Math.abs(b.re) >= Math.abs(b.im)) {
    const q = r(b.im / b.re);
    const den = r(b.re + r(b.im * q));
    return c32(r(a.re + r(a.im * q)) / den, r(a.im - r(a.re * q)) / den);
  }
  const q = r(b.re / b.im);
  const den = r(r(b.re * q) + b.im);
  return c32(r(r(a.re * q) + a.im) / den, r(r(a.im * q) - a.re) / den);
}
function cexp32(z) {
  const e = r(Math.exp(z.re));
  return c32(e * r(Math.cos(z.im)), e * r(Math.sin(z.im)));
}
const csin32 = (z) => c32(r(Math.sin(z.re)) * r(Math.cosh(z.im)), r(Math.cos(z.re)) * r(Math.sinh(z.im)));
const ccos32 = (z) => c32(r(Math.cos(z.re)) * r(Math.cosh(z.im)), -(r(Math.sin(z.re)) * r(Math.sinh(z.im))));
function csqrt32(z) {
  const m = r(Math.hypot(z.re, z.im));
  if (m === 0) return c32(0, 0);
  if (z.re >= 0) {
    const t = r(Math.sqrt(r(r(m + z.re) / 2)));
    return c32(t, z.im / r(2 * t));
  }
  const t = r(Math.sqrt(r(r(m - z.re) / 2)));
  return c32(Math.abs(z.im) / r(2 * t), z.im < 0 ? -t : t);
}

// ---- the test functions in single precision -------------------------------
function st32(x) {
  const xr = r(x);
  const s = r(Math.sin(xr));
  const c = r(Math.cos(xr));
  const g = r(r(r(s * s) * s) + r(r(c * c) * c));
  return r(r(Math.exp(xr)) / r(Math.sqrt(g)));
}
function st32c(z) {
  const s = csin32(z);
  const c = ccos32(z);
  const g = cadd32(cmul32(cmul32(s, s), s), cmul32(cmul32(c, c), c));
  return cdiv32(cexp32(z), csqrt32(g));
}

// F32_FUNCTIONS[id] = { id, f(x), fc({re, im}) } in single precision; the
// exact derivative and the Cauchy-integral derivatives come from the double
// definitions in verification.js TEST_FUNCTIONS.
export const F32_FUNCTIONS = {
  'squire-trapp': { id: 'squire-trapp', f: st32, fc: st32c },
  exp: { id: 'exp', f: (x) => r(Math.exp(r(x))), fc: (z) => cexp32(c32(z.re, z.im)) },
  sin: { id: 'sin', f: (x) => r(Math.sin(r(x))), fc: (z) => csin32(c32(z.re, z.im)) },
};

// One derivative estimate in single precision. scheme: 'forward' |
// 'backward' | 'central' | 'central4' | 'complex' (the formulas of
// verification.js DERIVATIVE_SCHEMES). Every operation is rounded.
export function fdDerivative32(scheme, x, h, fn = 'squire-trapp') {
  const F = F32_FUNCTIONS[fn];
  if (!F) throw new Error(`unknown test function ${fn}`);
  const f = F.f;
  const xr = r(x);
  const hr = r(h);
  switch (scheme) {
    case 'forward':
      return r(r(f(r(xr + hr)) - f(xr)) / hr);
    case 'backward':
      return r(r(f(xr) - f(r(xr - hr))) / hr);
    case 'central':
      return r(r(f(r(xr + hr)) - f(r(xr - hr))) / r(2 * hr));
    case 'central4': {
      const h2 = r(2 * hr);
      const a1 = r(-f(r(xr + h2)) + r(8 * f(r(xr + hr))));
      const a2 = r(a1 - r(8 * f(r(xr - hr))));
      const num = r(a2 + f(r(xr - h2)));
      return r(num / r(12 * hr));
    }
    case 'complex':
      return r(F.fc({ re: xr, im: hr }).im / hr);
    default:
      throw new Error(`unknown scheme ${scheme}`);
  }
}

// Measured optimum of one error curve by the branch fit that
// verification.js uses for derivativeSweep: fit the truncation branch with
// slope p and the round-off branch with slope -1 (each by the geometric mean
// of err/h^p or err·h over the BRANCH_FIT_DECADES ranges around the model's
// hOpt) and take the crossover. Returns null if a branch has < 2 points.
export function branchOptimum(h, err, p, hOpt) {
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

// The single-precision "V" for every formula, in the shape of
// verification.js derivativeSweep (schemes.forward|backward|central|central4
// with err, model, hOpt, errOpt, fitOk, hMin, errMin, hMinRaw, errMinRaw;
// complex with h, err, model, floor). Errors are absolute, against the
// exact derivative. The model uses eps = 2^-23.
export function derivativeSweep32({ fn = 'squire-trapp', x0 = null, hMax = 1e-1, hMin = 1e-16, perDecade = 4, csMin = 1e-36, csPerDecade = 2 } = {}) {
  const F = TEST_FUNCTIONS[fn];
  if (!F || !F32_FUNCTIONS[fn]) throw new Error(`unknown test function ${fn}`);
  const x = x0 ?? F.x0;
  if (F.domain && !(x > F.domain[0] && x < F.domain[1])) throw new RangeError(`x0 = ${x} is outside the domain of ${fn}`);
  const exact = x === F.x0 && F.dfx0 !== undefined ? F.dfx0 : F.df(x);
  const { d } = safeTaylorDerivatives(F, x, { kmax: 5 });
  const a = Math.log10(hMax);
  const nh = Math.round((a - Math.log10(hMin)) * perDecade) + 1;
  const h = logspace(a, Math.log10(hMin), nh);
  const schemes = {};
  for (const id of ['forward', 'backward', 'central', 'central4']) {
    const err = new Float64Array(nh);
    const model = new Float64Array(nh);
    const m = derivativeErrorModel(id, d, EPS32);
    let kRaw = 0;
    for (let k = 0; k < nh; k++) {
      err[k] = Math.abs(fdDerivative32(id, x, h[k], fn) - exact);
      model[k] = m.at(h[k]);
      if (err[k] < err[kRaw]) kRaw = k;
    }
    const bf = branchOptimum(h, err, m.p, m.hOpt);
    schemes[id] = {
      err,
      model,
      hOpt: m.hOpt,
      errOpt: m.errOpt,
      fitOk: !!bf,
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
  const mc = derivativeErrorModel('complex', d, EPS32);
  for (let k = 0; k < ncs; k++) {
    csErr[k] = Math.abs(fdDerivative32('complex', x, csH[k], fn) - exact);
    csModel[k] = mc.at(csH[k]);
  }
  return { fn, x0: x, exact, derivs: d, epsF: EPS32, h, schemes, complex: { h: csH, err: csErr, model: csModel, hOpt: mc.hOpt, floor: mc.floor } };
}
