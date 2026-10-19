// Shared helpers for the numerical kernels in src/sims/. No DOM here: every
// kernel must import cleanly under node --test.
//
// Trace events (for kernels written as generators, see AUTHORING.md):
//   { t: 'enter', kind, label, ...info }   a span opens (a sweep, a V-cycle level)
//   { t: 'leave', kind }                    the innermost span closes
//   { t: 'op', op, cell, reads, ... }       one cell (or face) is computed
//   { t: 'iter', k, residual, ... }         an outer iteration finished

// Deterministic PRNG (mulberry32). Same seed, same sequence, in every browser
// and in node, so tests and figures agree.
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Standard normal samples from a uniform source (Box–Muller).
export function gaussian(rand) {
  let u = 0;
  while (u === 0) u = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

// n points on [a, b], both ends included.
export function linspace(a, b, n) {
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) out[k] = n === 1 ? a : a + ((b - a) * k) / (n - 1);
  return out;
}

// Cell centres of n equal cells on [a, b].
export function centres(a, b, n) {
  const out = new Float64Array(n);
  const dx = (b - a) / n;
  for (let k = 0; k < n; k++) out[k] = a + (k + 0.5) * dx;
  return out;
}

// Periodic index.
export const wrap = (j, n) => ((j % n) + n) % n;

// Grid norms of a vector (or of a − b). With dx they are the discrete L1/L2
// norms of a function; without it they are plain vector norms.
export function norm1(a, b = null, dx = 1) {
  let s = 0;
  for (let k = 0; k < a.length; k++) s += Math.abs(b ? a[k] - b[k] : a[k]);
  return s * dx;
}
export function norm2(a, b = null, dx = 1) {
  let s = 0;
  for (let k = 0; k < a.length; k++) {
    const d = b ? a[k] - b[k] : a[k];
    s += d * d;
  }
  return Math.sqrt(s * dx);
}
export function normInf(a, b = null) {
  let s = 0;
  for (let k = 0; k < a.length; k++) s = Math.max(s, Math.abs(b ? a[k] - b[k] : a[k]));
  return s;
}

export function sum(a) {
  let s = 0;
  for (let k = 0; k < a.length; k++) s += a[k];
  return s;
}

// Total variation of a periodic (default) or open 1-D profile.
export function totalVariation(u, periodic = true) {
  let s = 0;
  for (let k = 1; k < u.length; k++) s += Math.abs(u[k] - u[k - 1]);
  if (periodic && u.length > 1) s += Math.abs(u[0] - u[u.length - 1]);
  return s;
}

// Observed order of accuracy from errors on a sequence of grids refined by
// ratio r: p_k = log(e_k / e_{k+1}) / log r.
export function observedOrders(errors, r = 2) {
  const out = [];
  for (let k = 0; k + 1 < errors.length; k++) out.push(Math.log(errors[k] / errors[k + 1]) / Math.log(r));
  return out;
}

// Run a generator to completion. Returns its return value; with onEvent, each
// yielded event is passed along (tests count or check them).
export function drain(gen, onEvent = null) {
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
    onEvent?.(r.value);
  }
}

// Count yielded events by type/op, for tests and work meters.
export function countEvents(gen) {
  const counts = {};
  const value = drain(gen, (e) => {
    const key = e?.t === 'op' ? `op:${e.op}` : e?.t ?? 'other';
    counts[key] = (counts[key] || 0) + 1;
  });
  return { value, counts };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
