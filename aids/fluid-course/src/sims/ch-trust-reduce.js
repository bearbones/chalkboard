// Chapter 15 (trust): why a parallel sum is not reproducible.
//
// A parallel reduction splits n numbers into P contiguous chunks, sums each
// chunk on its own "thread", then adds the P partial sums. In exact
// arithmetic the answer does not depend on P. In floating point every
// addition rounds, and changing P changes which additions happen, so the
// rounded result changes with the thread count. This module performs those
// reductions sequentially and deterministically (no real threads), so a
// figure and the tests see exactly the same numbers.
//
// What it provides
//   makeData(n, kind, { seed, precision })   seeded test data:
//       'positive'  uniform in [0, 1): a well-conditioned sum;
//       'mixed'     random signs, magnitudes log-uniform over six decades,
//                   so the terms nearly cancel and the sum is ill-conditioned.
//   exactSum(x)        the sum to about twice working precision, by the
//                      cascaded TwoSum "Sum2" of Ogita, Rump & Oishi (2005),
//                      rounded once to a double. Its error is far below the
//                      spread this module measures (see the tests).
//   chunkedSum(x, P, { precision, method })   one reduction with P chunks;
//       method 'naive' (recursive summation in each chunk and across the
//       partials) or 'kahan' (compensated summation, Kahan 1965, in each
//       chunk and across the partials).
//   sweepThreads(x, Ps, opts)   generator: yields { t: 'iter', k, P, sum }
//       per thread count and returns Float64Array of sums, so a widget can
//       drain it across frames (util.js drain for tests).
//   conditionNumber(x)  sum|x_i| / |sum x_i|: how much relative accuracy the
//                       data let any summation keep.
//   ulp(v, precision)   the spacing of floating-point numbers at v.
//
// Conventions
//   - precision 'f32' rounds every datum and every operation to single
//     precision with Math.fround (exact emulation of IEEE binary32 for + and
//     -, Figueroa 1995); 'f64' is native double.
//   - Chunks are contiguous and as equal as possible: chunk c holds indices
//     [floor(c n / P), floor((c + 1) n / P)).
//   - Error bounds (Higham 2002, §4.2-4.3): any order of recursive summation
//     has |s^ - s| <= gamma_{n-1} sum|x_i|, gamma_k = k u / (1 - k u); Kahan
//     summation has |s^ - s| <= (2u + O(n u^2)) sum|x_i|. With P chunks the
//     compensated bound holds per chunk, plus the compensated combination.
//
// Sources
//   N. J. Higham, Accuracy and Stability of Numerical Algorithms, 2nd ed.,
//     SIAM (2002), ch. 4. W. Kahan, "Further remarks on reducing truncation
//     errors", CACM 8 (1965) 40. T. Ogita, S. M. Rump and S. Oishi,
//     "Accurate sum and dot product", SIAM J. Sci. Comput. 26 (2005) 1955.
//     J. Demmel and H. D. Nguyen, "Fast reproducible floating-point
//     summation", IEEE ARITH 21 (2013) 163, on why reductions are not
//     reproducible and how to make them so.

import { rng } from './util.js';

const ident = (v) => v;

export const REDUCE_DATA = {
  positive: { id: 'positive', name: 'positive numbers', note: 'Uniform in [0, 1): every term adds, the sum is well conditioned.' },
  mixed: { id: 'mixed', name: 'mixed signs', note: 'Random signs and magnitudes from about 1e-3 to 1e3: the terms nearly cancel, so the sum is ill conditioned.' },
};

// Seeded data. With precision 'f32' each value is rounded to single precision
// first, so the data themselves are exactly representable in both precisions.
export function makeData(n, kind = 'positive', { seed = 1, precision = 'f64' } = {}) {
  if (!REDUCE_DATA[kind]) throw new Error(`unknown data kind ${kind}`);
  if (!Number.isInteger(n) || n < 1) throw new RangeError(`n must be a positive integer (got ${n})`);
  const r = rng(seed);
  const round = precision === 'f32' ? Math.fround : ident;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // rng() gives 32 random bits; add a second draw so a double gets a full
    // 53-bit mantissa (otherwise short sums of such values would be exact).
    const v = r() + r() * 2 ** -32;
    if (kind === 'positive') x[i] = round(v);
    else {
      // Magnitude (1 + v) * 2^k with k uniform in -10..9, so from about 1e-3
      // to 1e3. Built from exact operations only: Math.pow and 10 ** y are
      // not correctly rounded, and engines differ in the last bit, which
      // would change the very sums this data set is meant to compare.
      const k = Math.floor(r() * 20) - 10;
      let mag = 1 + v;
      for (let j = 0; j < k; j++) mag *= 2;
      for (let j = 0; j > k; j--) mag *= 0.5;
      x[i] = round(r() < 0.5 ? -mag : mag);
    }
  }
  return x;
}

// Cascaded TwoSum (Ogita, Rump & Oishi 2005, Algorithm 4.4 "Sum2"): the
// result is as accurate as if computed in twice the working precision and
// rounded once.
export function exactSum(x) {
  let s = 0;
  let c = 0;
  for (let i = 0; i < x.length; i++) {
    const a = x[i];
    const t = s + a;
    const z = t - s;
    c += s - (t - z) + (a - z);
    s = t;
  }
  return s + c;
}

export const conditionNumber = (x) => {
  let abs = 0;
  for (let i = 0; i < x.length; i++) abs += Math.abs(x[i]);
  return abs / Math.abs(exactSum(x));
};

// Spacing of floating-point numbers at v (one unit in the last place).
export function ulp(v, precision = 'f64') {
  const a = Math.abs(v);
  if (a === 0) return precision === 'f32' ? 2 ** -149 : Number.MIN_VALUE;
  const e = Math.floor(Math.log2(a));
  // Guard the log2 rounding at exact powers of two.
  const p = 2 ** e > a ? e - 1 : 2 ** (e + 1) <= a ? e + 1 : e;
  return 2 ** (p - (precision === 'f32' ? 23 : 52));
}

// One reduction with P contiguous chunks. No allocation.
export function chunkedSum(x, P, { precision = 'f64', method = 'naive' } = {}) {
  const n = x.length;
  if (!Number.isInteger(P) || P < 1 || P > n) throw new RangeError(`threads must be an integer in [1, n] (got ${P})`);
  if (method !== 'naive' && method !== 'kahan') throw new Error(`unknown method ${method}`);
  const fr = precision === 'f32' ? Math.fround : ident;
  const kahan = method === 'kahan';
  let total = 0;
  let totalComp = 0;
  for (let c = 0; c < P; c++) {
    const i0 = Math.floor((c * n) / P);
    const i1 = Math.floor(((c + 1) * n) / P);
    let s = 0;
    let comp = 0;
    for (let i = i0; i < i1; i++) {
      if (kahan) {
        const y = fr(x[i] - comp);
        const t = fr(s + y);
        comp = fr(fr(t - s) - y);
        s = t;
      } else s = fr(s + x[i]);
    }
    if (kahan) {
      const y = fr(s - totalComp);
      const t = fr(total + y);
      totalComp = fr(fr(t - total) - y);
      total = t;
    } else total = fr(total + s);
  }
  return total;
}

// Sum the same data with each thread count in Ps. Yields one event per
// count; returns the sums.
export function* sweepThreads(x, Ps, opts = {}) {
  const out = new Float64Array(Ps.length);
  for (let k = 0; k < Ps.length; k++) {
    out[k] = chunkedSum(x, Ps[k], opts);
    yield { t: 'iter', k, P: Ps[k], sum: out[k] };
  }
  return out;
}

// Higham's first-order bounds for the absolute error of any recursive
// summation order (naive) and of compensated summation (kahan).
export function summationBounds(x, precision = 'f64') {
  const u = precision === 'f32' ? 2 ** -24 : 2 ** -53;
  let abs = 0;
  for (let i = 0; i < x.length; i++) abs += Math.abs(x[i]);
  const n = x.length;
  return { naive: ((n - 1) * u * abs) / (1 - (n - 1) * u), kahan: (2 * u + n * u * u) * abs, absSum: abs };
}
