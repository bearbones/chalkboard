// Finite-difference stencil weights from Taylor series, in exact rational
// arithmetic (chapter 6, "From calculus to arithmetic", section taylor).
//
// Given integer offsets s_0 … s_{q−1} (the stencil, in units of h) and a
// derivative order m < q, find weights w_j with
//
//     f^{(m)}(x) ≈ h^{−m} Σ_j w_j f(x + s_j h).
//
// Expanding each f(x + s_j h) in its Taylor series, the right-hand side is
// Σ_k (h^{k−m}/k!) f^{(k)}(x) μ_k with the moments μ_k = Σ_j w_j s_j^k. It
// equals f^{(m)} up to the highest possible power when μ_k = k! δ_{km} for
// k = 0 … q−1: a q × q Vandermonde system with a unique solution when the
// offsets are distinct. The first k ≥ q with μ_k ≠ 0 gives the leading
// truncation error (μ_k/k!) h^{k−m} f^{(k)}(x), so the order of accuracy is
// p = k − m. For symmetric stencils μ_q can vanish and the order is one
// higher than q − m (the central difference is second order from three
// points).
//
// Arithmetic: BigInt fractions, so the weights come out exact (−1/12,
// 2/3, …) for any stencil that fits in a few dozen points; this module does
// not share code with similarity.js rationalRref, whose Number fractions
// would overflow 2^53 on Vandermonde rows with offsets beyond about ±4.
//
// Sources: Fornberg, Math. Comp. 51 (1988) 699-706 (general weights);
//   LeVeque, Finite Difference Methods for ODEs and PDEs (2007) §1.5.

const babs = (a) => (a < 0n ? -a : a);
function bgcd(a, b) {
  a = babs(a);
  b = babs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}
function q(n, d = 1n) {
  if (d === 0n) throw new Error('zero denominator');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = bgcd(n, d) || 1n;
  return { n: n / g, d: d / g };
}
const qsub = (a, b) => q(a.n * b.d - b.n * a.d, a.d * b.d);
const qadd = (a, b) => q(a.n * b.d + b.n * a.d, a.d * b.d);
const qmul = (a, b) => q(a.n * b.n, a.d * b.d);
const qdiv = (a, b) => q(a.n * b.d, a.d * b.n);
const bfact = (k) => {
  let f = 1n;
  for (let i = 2n; i <= BigInt(k); i++) f *= i;
  return f;
};

// Plain-number view of a BigInt fraction: { n, d, value } with n, d Numbers
// (exact for the stencils this course shows).
const view = (a) => ({ n: Number(a.n), d: Number(a.d), value: Number(a.n) / Number(a.d) });

// TeX for a fraction from stencilWeights: '-\tfrac{1}{12}', '2', …
export const ratTex = (a) => (a.d === 1 ? `${a.n}` : `${a.n < 0 ? '-' : ''}\\tfrac{${Math.abs(a.n)}}{${a.d}}`);

// stencilWeights([-1, 0, 1], 1) → { offsets, m, weights: [{n, d, value}],
// order, errorPower k, errorCoef {n, d, value} (= μ_k/k!), moments }.
// Returns null when m ≥ q (too few points for that derivative).
export function stencilWeights(offsets, m = 1) {
  const s = [...new Set(offsets.map((v) => Math.round(v)))].sort((a, b) => a - b);
  const nq = s.length;
  if (!(m >= 0) || m >= nq) return null;
  // Augmented Vandermonde rows: Σ_j w_j s_j^k = k! δ_{km}.
  const A = [];
  for (let k = 0; k < nq; k++) {
    const row = s.map((sj) => q(BigInt(sj) ** BigInt(k)));
    row.push(q(k === m ? bfact(m) : 0n));
    A.push(row);
  }
  for (let c = 0; c < nq; c++) {
    let p = c;
    while (p < nq && A[p][c].n === 0n) p++;
    if (p === nq) return null;
    [A[c], A[p]] = [A[p], A[c]];
    const piv = A[c][c];
    for (let j = c; j <= nq; j++) A[c][j] = qdiv(A[c][j], piv);
    for (let i = 0; i < nq; i++) {
      if (i === c || A[i][c].n === 0n) continue;
      const f = A[i][c];
      for (let j = c; j <= nq; j++) A[i][j] = qsub(A[i][j], qmul(f, A[c][j]));
    }
  }
  const w = A.map((row) => row[nq]);
  // Leading error term: first k ≥ nq with μ_k ≠ 0 (search a few beyond).
  let k = nq;
  let mu = q(0n);
  for (; k < nq + 4; k++) {
    mu = q(0n);
    for (let j = 0; j < nq; j++) mu = qadd(mu, qmul(w[j], q(BigInt(s[j]) ** BigInt(k))));
    if (mu.n !== 0n) break;
  }
  const coef = qdiv(mu, q(bfact(k)));
  return {
    offsets: s,
    m,
    weights: w.map(view),
    order: k - m,
    errorPower: k,
    errorCoef: view(coef),
  };
}

// Apply a stencil: h^{−m} Σ w_j f(x + s_j h), in double precision.
export function applyStencil(st, f, x, h) {
  let sum = 0;
  for (let j = 0; j < st.offsets.length; j++) sum += st.weights[j].value * f(x + st.offsets[j] * h);
  return sum / h ** st.m;
}
