// Four ways to store a function with n numbers (chapter 6, "From calculus to
// arithmetic", section grids). On the periodic interval [0, 1) a profile f is
// represented by
//   points    u_j = f(x_j) at the nodes x_j = j/n (finite differences),
//             reconstructed by periodic linear interpolation;
//   averages  ū_j = (1/h)∫ f over the cell [x_j, x_{j+1}] (finite volumes),
//             reconstructed as a constant in each cell;
//   hats      c_j, the L² projection of f onto the periodic piecewise-linear
//             "hat" functions φ_j (finite elements, P1): M c = b with the
//             mass matrix M = (h/6)·[1 4 1] and the load b_j = ∫ f φ_j;
//   fourier   the truncated Fourier series a_0 + Σ_{k=1}^{K} 2(a_k cos 2πkx +
//             b_k sin 2πkx) with K = floor((n − 1)/2), so 2K + 1 ≤ n real
//             coefficients (a spectral method), a_k = ∫ f cos 2πkx dx, etc.
// and then measured: the L² and max error of the reconstruction, the "mass"
// error ∫R − ∫f, and the overshoot above the range of f.
//
// What each representation conserves (the reason the chapter cares):
//   averages  h Σ ū_j = ∫ f exactly, by definition.
//   hats      h Σ c_j = ∫ f exactly, because the constant 1 = Σ φ_j lies in
//             the space and the projection error is orthogonal to it.
//   fourier   a_0 = ∫ f exactly (mode 0 is the mean).
//   points    nothing: h Σ u_j is the trapezoid rule, a quadrature of ∫ f
//             with its own error (O(h) at a jump; spectrally small for
//             smooth periodic f; Trefethen & Weideman, SIAM Rev. 56 (2014)
//             385-458).
//
// Numerics. One composite 5-point Gauss–Legendre rule is built per (profile,
// n): its panels are split at the profile's breaks and at every node j/n,
// and no panel is wider than 1/1024. Every integral (averages, loads, Fourier
// coefficients, ∫f, ∫R and the error norms) uses it, so the integrands are
// smooth within each panel. The max error and overshoot are taken over the
// quadrature nodes (spacing ≤ 1/1024 · 0.2), close to the true sup norm.
// The cyclic tridiagonal mass system is solved by Jacobi sweeps; the
// iteration matrix has spectral radius 1/2, so 60 sweeps reach 1e-18.
//
// Sources: LeVeque, Finite Volume Methods for Hyperbolic Problems (2002)
//   ch. 4; Strang & Fix, An Analysis of the Finite Element Method (1973)
//   ch. 1; Trefethen, Spectral Methods in MATLAB (2000) ch. 1-4; Gibbs
//   overshoot 0.0895 of the jump: Hewitt & Hewitt, Arch. Hist. Exact Sci. 21
//   (1979) 129-160.

import { makeProfile } from './advection.js';

export const REPRESENTATIONS = {
  points: { id: 'points', name: 'Point values', family: 'finite difference', conserves: false },
  averages: { id: 'averages', name: 'Cell averages', family: 'finite volume', conserves: true },
  hats: { id: 'hats', name: 'Hat functions', family: 'finite element (P1)', conserves: true },
  fourier: { id: 'fourier', name: 'Fourier modes', family: 'spectral', conserves: true },
};

// A smooth, periodic, non-trigonometric-polynomial test function scaled to
// [0, 1]: (e^{sin 2πx} − e^{−1}) / (e − e^{−1}). Its mean is
// (I0(1) − e^{−1}) / (e − e^{−1}) with I0 the modified Bessel function.
const EM1 = Math.exp(-1);
const SPAN = Math.E - EM1;
export const SMOOTH_PROFILE = {
  id: 'smooth',
  name: 'Smooth bump',
  smooth: true,
  params: {},
  f: (x) => (Math.exp(Math.sin(2 * Math.PI * x)) - EM1) / SPAN,
  breaks: [],
  range: [0, 1],
  quad: null,
  prim: null,
};
export const SMOOTH_MEAN = (1.2660658777520083 - EM1) / SPAN; // I0(1) = 1.2660658777520083...

// The square wave's jumps sit at 0.31 and 0.67, off every node j/n for
// n < 100, so no representation is exact by the luck of alignment (with
// advection.js's default edges 0.25 and 0.5, cell averages on n = 4m cells
// reproduce the square wave exactly).
export const REP_PROFILES = {
  smooth: SMOOTH_PROFILE,
  gaussian: makeProfile('gaussian'),
  triangle: makeProfile('triangle'),
  square: makeProfile({ id: 'square', lo: 0.31, hi: 0.67 }),
};

const resolve = (spec) => (typeof spec === 'string' ? REP_PROFILES[spec] ?? makeProfile(spec) : makeProfile(spec));

const GL_X = [-0.906179845938664, -0.5384693101056831, 0, 0.5384693101056831, 0.906179845938664];
const GL_W = [0.2369268850561891, 0.4786286704993665, 0.5688888888888889, 0.4786286704993665, 0.2369268850561891];
const PANEL = 1 / 1024;

// The composite rule for (profile, n): { x, w, f, cell } with cell[q] the
// index j of the cell [j/n, (j+1)/n) that node q lies in.
export function quadrature(spec, n) {
  const p = resolve(spec);
  const cuts = new Set();
  for (let j = 0; j <= n; j++) cuts.add(j / n);
  for (const b of p.breaks) cuts.add(b - Math.floor(b));
  const edges = [...cuts].sort((a, b) => a - b);
  let m = 0;
  for (let i = 0; i + 1 < edges.length; i++) m += Math.max(1, Math.ceil((edges[i + 1] - edges[i]) / PANEL - 1e-9));
  const x = new Float64Array(5 * m);
  const w = new Float64Array(5 * m);
  const fv = new Float64Array(5 * m);
  const cell = new Int32Array(5 * m);
  let q = 0;
  for (let i = 0; i + 1 < edges.length; i++) {
    const lo = edges[i];
    const hi = edges[i + 1];
    if (hi <= lo) continue;
    const k = Math.max(1, Math.ceil((hi - lo) / PANEL - 1e-9));
    const hp = (hi - lo) / k;
    const j = Math.min(n - 1, Math.floor((lo + hi) * 0.5 * n));
    for (let s = 0; s < k; s++) {
      const c = lo + (s + 0.5) * hp;
      for (let g = 0; g < 5; g++) {
        x[q] = c + 0.5 * hp * GL_X[g];
        w[q] = 0.5 * hp * GL_W[g];
        fv[q] = p.f(x[q]);
        cell[q] = j;
        q++;
      }
    }
  }
  return { profile: p, n, x: x.subarray(0, q), w: w.subarray(0, q), f: fv.subarray(0, q), cell: cell.subarray(0, q) };
}

// Build one representation. Returns { kind, n, coef, K (fourier only),
// evaluate(x), mass } where mass = ∫ R over [0, 1).
export function represent(spec, n, kind, Q = null) {
  if (!REPRESENTATIONS[kind]) throw new Error(`unknown representation ${kind}`);
  if (!(n >= 2)) throw new RangeError('n must be at least 2');
  const p = resolve(spec);
  const h = 1 / n;
  if (kind === 'points') {
    const u = new Float64Array(n);
    for (let j = 0; j < n; j++) u[j] = p.f(j * h);
    let s = 0;
    for (let j = 0; j < n; j++) s += u[j];
    const evaluate = (x) => {
      const y = (x - Math.floor(x)) * n;
      const j = Math.min(n - 1, Math.floor(y));
      const t = y - j;
      return (1 - t) * u[j] + t * u[(j + 1) % n];
    };
    return { kind, n, coef: u, evaluate, mass: s * h };
  }
  Q = Q && Q.n === n && Q.profile === p ? Q : quadrature(p, n);
  if (kind === 'averages') {
    const u = new Float64Array(n);
    for (let q = 0; q < Q.x.length; q++) u[Q.cell[q]] += Q.w[q] * Q.f[q];
    let s = 0;
    for (let j = 0; j < n; j++) {
      s += u[j];
      u[j] *= n;
    }
    const evaluate = (x) => u[Math.min(n - 1, Math.floor((x - Math.floor(x)) * n))];
    return { kind, n, coef: u, evaluate, mass: s };
  }
  if (kind === 'hats') {
    const b = new Float64Array(n);
    for (let q = 0; q < Q.x.length; q++) {
      const j = Q.cell[q];
      const t = Q.x[q] * n - j;
      const wf = Q.w[q] * Q.f[q];
      b[j] += (1 - t) * wf;
      b[(j + 1) % n] += t * wf;
    }
    // (h/6)(c_{j-1} + 4 c_j + c_{j+1}) = b_j, by Jacobi: c_j ← (6 b_j / h − c_{j−1} − c_{j+1}) / 4.
    let c = new Float64Array(n);
    let nx = new Float64Array(n);
    for (let j = 0; j < n; j++) c[j] = b[j] * n;
    for (let it = 0; it < 80; it++) {
      let change = 0;
      let big = 0;
      for (let j = 0; j < n; j++) {
        const v = (6 * n * b[j] - c[(j + n - 1) % n] - c[(j + 1) % n]) / 4;
        change = Math.max(change, Math.abs(v - c[j]));
        big = Math.max(big, Math.abs(v));
        nx[j] = v;
      }
      [c, nx] = [nx, c];
      if (change <= 1e-16 * Math.max(1, big)) break;
    }
    let s = 0;
    for (let j = 0; j < n; j++) s += c[j];
    const evaluate = (x) => {
      const y = (x - Math.floor(x)) * n;
      const j = Math.min(n - 1, Math.floor(y));
      const t = y - j;
      return (1 - t) * c[j] + t * c[(j + 1) % n];
    };
    return { kind, n, coef: c, evaluate, mass: s * h };
  }
  // fourier
  const K = Math.floor((n - 1) / 2);
  const a = new Float64Array(K + 1);
  const bs = new Float64Array(K + 1);
  for (let q = 0; q < Q.x.length; q++) {
    const wf = Q.w[q] * Q.f[q];
    const th = 2 * Math.PI * Q.x[q];
    const c1 = Math.cos(th);
    const s1 = Math.sin(th);
    let ck = 1;
    let sk = 0;
    a[0] += wf;
    for (let k = 1; k <= K; k++) {
      const t = ck * c1 - sk * s1;
      sk = sk * c1 + ck * s1;
      ck = t;
      a[k] += wf * ck;
      bs[k] += wf * sk;
    }
  }
  const evaluate = (x) => {
    const th = 2 * Math.PI * x;
    const c1 = Math.cos(th);
    const s1 = Math.sin(th);
    let ck = 1;
    let sk = 0;
    let v = a[0];
    for (let k = 1; k <= K; k++) {
      const t = ck * c1 - sk * s1;
      sk = sk * c1 + ck * s1;
      ck = t;
      v += 2 * (a[k] * ck + bs[k] * sk);
    }
    return v;
  };
  return { kind, n, K, coef: a, sinCoef: bs, evaluate, mass: a[0] };
}

// Errors of one representation: { l2, linf, mass, exactMass, massErr,
// overshoot, undershoot } with the overshoot and undershoot as fractions of
// the profile's range (max R − max f, min f − min R; ≥ 0).
export function measure(spec, n, kind, Q = null) {
  const p = resolve(spec);
  Q = Q && Q.n === n && Q.profile === p ? Q : quadrature(p, n);
  const R = represent(p, n, kind, Q);
  let s2 = 0;
  let inf = 0;
  let I = 0;
  let rmax = -Infinity;
  let rmin = Infinity;
  for (let q = 0; q < Q.x.length; q++) {
    const v = R.evaluate(Q.x[q]);
    const e = v - Q.f[q];
    s2 += Q.w[q] * e * e;
    inf = Math.max(inf, Math.abs(e));
    I += Q.w[q] * Q.f[q];
    if (v > rmax) rmax = v;
    if (v < rmin) rmin = v;
  }
  // Piecewise-linear reconstructions peak at the nodes, which the Gauss
  // points never touch.
  if (kind === 'points' || kind === 'hats') {
    for (let j = 0; j < n; j++) {
      const v = R.coef[j];
      if (v > rmax) rmax = v;
      if (v < rmin) rmin = v;
    }
  }
  const [lo, hi] = p.range;
  const span = hi - lo || 1;
  return {
    kind,
    n,
    l2: Math.sqrt(s2),
    linf: inf,
    mass: R.mass,
    exactMass: I,
    massErr: R.mass - I,
    overshoot: Math.max(0, (rmax - hi) / span),
    undershoot: Math.max(0, (lo - rmin) / span),
    rep: R,
  };
}

// L² error against n for one representation: { ns, l2, orders } with
// orders[i] = log2(l2[i−1]/l2[i]) when ns doubles.
export function representationStudy(spec, kind, ns = [8, 16, 32, 64, 128]) {
  const l2 = new Float64Array(ns.length);
  const orders = new Float64Array(ns.length).fill(NaN);
  for (let i = 0; i < ns.length; i++) {
    l2[i] = measure(spec, ns[i], kind).l2;
    if (i > 0) orders[i] = Math.log(l2[i - 1] / l2[i]) / Math.log(ns[i] / ns[i - 1]);
  }
  return { ns, l2, orders };
}
