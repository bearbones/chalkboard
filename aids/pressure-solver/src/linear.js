// Linear solvers for the Newton correction  J·δ = −R.
//
// Every routine is a generator. It yields a trace event for each read/write the
// visualization can show, and returns its result. Draining a generator without
// looking at the events is how tests and headless runs use the same code.
//
// Event shapes:
//   { t: 'enter', kind, label, ...info }   a span opens (see RANK in trace.js)
//   { t: 'leave', kind }                    the innermost span closes
//   { t: 'op', op, cell, reads, ... }       one cell (or face) is computed
//
// Aggregation V-cycle, BiCGStab, and 5-point rows.

// Slots of a 5-point row.
export const UP = 0;
export const LEFT = 1;
export const CENTER = 2;
export const RIGHT = 3;
export const DOWN = 4;

export class Stencil5 {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.n = w * h;
    this.rows = new Float64Array(this.n * 5);
  }
  get(i, k) {
    return this.rows[i * 5 + k];
  }
  set(i, k, v) {
    this.rows[i * 5 + k] = v;
  }
  diag(i) {
    return this.rows[i * 5 + CENTER];
  }
  // Column index for slot k of row i, or -1 off the grid.
  column(i, k) {
    const x = i % this.w,
      y = (i / this.w) | 0;
    switch (k) {
      case UP:
        return y > 0 ? i - this.w : -1;
      case LEFT:
        return x > 0 ? i - 1 : -1;
      case CENTER:
        return i;
      case RIGHT:
        return x + 1 < this.w ? i + 1 : -1;
      case DOWN:
        return y + 1 < this.h ? i + this.w : -1;
    }
    return -1;
  }
  // (A·x)_i
  rowTimes(i, x) {
    let s = this.rows[i * 5 + CENTER] * x[i];
    for (const k of [UP, LEFT, RIGHT, DOWN]) {
      const j = this.column(i, k);
      if (j >= 0) s += this.rows[i * 5 + k] * x[j];
    }
    return s;
  }
  neighbours(i) {
    const out = [];
    for (const k of [UP, LEFT, RIGHT, DOWN]) {
      const j = this.column(i, k);
      if (j >= 0) out.push(j);
    }
    return out;
  }
}

// ---- Aggregate partition (mirror-symmetric pairing) -----------------------
// Even lengths pair cells from the edge. Odd lengths keep the remainder at the
// centre so the partition stays mirror-symmetric.
export function aggregateCount(n) {
  if (n <= 1) return 1;
  const m = n >> 1;
  return n % 2 === 0 || m % 2 ? m : m + 1;
}
export function aggregateOf(n, x) {
  if (n <= 1) return 0;
  const m = n >> 1;
  if (n % 2 === 0) return x >> 1;
  const centre = m % 2 ? (m - 1) / 2 : m / 2,
    first = m % 2 ? m - 1 : m,
    after = m % 2 ? m + 2 : m + 1;
  return x < first ? x >> 1 : x < after ? centre : centre + 1 + ((x - after) >> 1);
}

// Galerkin coarse operator R·A·P with constant prolongation and sum
// restriction. Entries that stay inside an aggregate fold into its diagonal;
// entries that cross into a neighbouring aggregate become its off-diagonal.
export function coarsen(A) {
  const cw = aggregateCount(A.w),
    ch = aggregateCount(A.h);
  const C = new Stencil5(cw, ch);
  const map = new Int32Array(A.n);
  for (let i = 0; i < A.n; i++) {
    const x = i % A.w,
      y = (i / A.w) | 0;
    map[i] = aggregateOf(A.h, y) * cw + aggregateOf(A.w, x);
  }
  for (let i = 0; i < A.n; i++) {
    const I = map[i];
    C.rows[I * 5 + CENTER] += A.rows[i * 5 + CENTER];
    for (const k of [UP, LEFT, RIGHT, DOWN]) {
      const j = A.column(i, k);
      if (j < 0) continue;
      const v = A.rows[i * 5 + k];
      if (map[j] === I) C.rows[I * 5 + CENTER] += v;
      else C.rows[I * 5 + k] += v;
    }
  }
  return { C, map };
}

// The hierarchy: coarsen until 1×1. The cycle requires every diagonal < 0 and
// every off-diagonal ≥ 0 at every level before it trusts the cycle.
export function* buildHierarchy(A) {
  yield { t: 'enter', kind: 'hierarchy', label: 'Build multigrid hierarchy' };
  const levels = [{ A, map: null, z: new Float64Array(A.n), zNext: new Float64Array(A.n), rhs: new Float64Array(A.n), r: new Float64Array(A.n) }];
  let cur = A;
  while (cur.n > 1) {
    const { C, map } = coarsen(cur);
    const lvl = levels.length;
    for (let I = 0; I < C.n; I++) {
      const fine = [];
      for (let i = 0; i < cur.n; i++) if (map[i] === I) fine.push(i);
      yield { t: 'op', op: 'galerkin', level: lvl, cell: I, reads: fine, readLevel: lvl - 1 };
    }
    levels.push({ A: C, map, z: new Float64Array(C.n), zNext: new Float64Array(C.n), rhs: new Float64Array(C.n), r: new Float64Array(C.n) });
    cur = C;
  }
  for (const L of levels) {
    for (let i = 0; i < L.A.n; i++) {
      if (!(L.A.diag(i) < 0)) throw new LinearFailure('aggregate pressure: unusable diagonal');
      for (const k of [UP, LEFT, RIGHT, DOWN]) if (L.A.get(i, k) < 0) throw new LinearFailure('aggregate pressure: unsupported off-diagonal');
    }
  }
  yield { t: 'leave', kind: 'hierarchy' };
  return levels;
}

export class LinearFailure extends Error {}

const OMEGA = 2 / 3; // weighted Jacobi, ω = 2/3
const SWEEPS = 2; // 2 pre-sweeps + 2 post-sweeps

// One weighted-Jacobi sweep, z ← z + ω (rhs − A z) / diag.
// Every cell reads the OLD iterate (buffer z) and writes the NEW one (zNext):
// order does not matter, which is why the GPU runs it as a ping-pong.
function* jacobiSweep(L, level, label) {
  const { A } = L;
  yield { t: 'enter', kind: 'sweep', label, level };
  for (let i = 0; i < A.n; i++) {
    const res = L.rhs[i] - A.rowTimes(i, L.z);
    L.zNext[i] = L.z[i] + (OMEGA * res) / A.diag(i);
    yield { t: 'op', op: 'jacobi', level, cell: i, reads: A.neighbours(i), value: L.zNext[i] };
  }
  const tmp = L.z;
  L.z = L.zNext;
  L.zNext = tmp;
  yield { t: 'leave', kind: 'sweep' };
}

// One V-cycle: z ≈ A⁻¹ rhs at `level`. Reads levels[level].rhs, leaves the
// result in levels[level].z.
export function* vcycle(levels, level = 0) {
  const L = levels[level];
  const { A } = L;
  yield { t: 'enter', kind: 'level', label: `Level ${level} (${A.w}×${A.h})`, level };
  if (A.n === 1) {
    L.z[0] = L.rhs[0] / A.diag(0);
    yield { t: 'op', op: 'coarse-solve', level, cell: 0, reads: [], value: L.z[0] };
    yield { t: 'leave', kind: 'level' };
    return L.z;
  }
  L.z.fill(0);
  for (let s = 0; s < SWEEPS; s++) yield* jacobiSweep(L, level, `Pre-smooth ${s + 1}/${SWEEPS}`);

  yield { t: 'enter', kind: 'sweep', label: 'Residual r = rhs − A·z', level };
  for (let i = 0; i < A.n; i++) {
    L.r[i] = L.rhs[i] - A.rowTimes(i, L.z);
    yield { t: 'op', op: 'mg-residual', level, cell: i, reads: A.neighbours(i), value: L.r[i] };
  }
  yield { t: 'leave', kind: 'sweep' };

  const C = levels[level + 1];
  yield { t: 'enter', kind: 'sweep', label: 'Restrict: sum r over each 2×2 block', level: level + 1 };
  C.rhs.fill(0);
  for (let i = 0; i < A.n; i++) C.rhs[C.map[i]] += L.r[i];
  for (let I = 0; I < C.A.n; I++) {
    const fine = [];
    for (let i = 0; i < A.n; i++) if (C.map[i] === I) fine.push(i);
    yield { t: 'op', op: 'restrict', level: level + 1, cell: I, reads: fine, readLevel: level, value: C.rhs[I] };
  }
  yield { t: 'leave', kind: 'sweep' };

  yield* vcycle(levels, level + 1);

  yield { t: 'enter', kind: 'sweep', label: 'Prolong: add the coarse correction', level };
  for (let i = 0; i < A.n; i++) {
    L.z[i] += C.z[C.map[i]];
    yield { t: 'op', op: 'prolong', level, cell: i, reads: [C.map[i]], readLevel: level + 1, value: L.z[i] };
  }
  yield { t: 'leave', kind: 'sweep' };

  for (let s = 0; s < SWEEPS; s++) yield* jacobiSweep(L, level, `Post-smooth ${s + 1}/${SWEEPS}`);
  yield { t: 'leave', kind: 'level' };
  return L.z;
}

// Preconditioner application out = M⁻¹ v (one V-cycle).
function* precondition(levels, v, out, label) {
  yield { t: 'enter', kind: 'vcycle', label };
  levels[0].rhs.set(v);
  yield* vcycle(levels, 0);
  out.set(levels[0].z);
  yield { t: 'leave', kind: 'vcycle' };
}

function* matvec(A, x, y, label, field) {
  yield { t: 'enter', kind: 'sweep', label, level: 0 };
  for (let i = 0; i < A.n; i++) {
    y[i] = A.rowTimes(i, x);
    yield { t: 'op', op: 'matvec', level: 0, cell: i, reads: A.neighbours(i), field };
  }
  yield { t: 'leave', kind: 'sweep' };
}

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function normInf(a) {
  let m = 0;
  for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
  return m;
}

// A whole-field vector update. Shown as one step: every cell does the same
// arithmetic on its own entries, with no neighbour reads.
function vec(label) {
  return { t: 'op', op: 'vector', label, cell: -1, reads: [] };
}

// Right-preconditioned BiCGStab with the V-cycle as M. Stops when the TRUE
// residual satisfies ‖b − A·x‖∞ ≤ η‖b‖∞ (it is recomputed every
// iteration and restarts on drift). `ctx` receives x (the Newton correction
// being built) and history for the plots.
export function* bicgstab(A, levels, b, ctx, { eta, maxIter = 1024 }) {
  const n = A.n;
  const x = ctx.delta;
  x.fill(0);
  const r = Float64Array.from(b),
    rhat = Float64Array.from(b);
  const p = new Float64Array(n),
    v = new Float64Array(n),
    s = new Float64Array(n),
    t = new Float64Array(n),
    ph = new Float64Array(n),
    sh = new Float64Array(n),
    tr = new Float64Array(n);
  const bnorm = normInf(b);
  ctx.linearHistory.push(1);
  if (bnorm === 0) return { iterations: 0, rel: 0 };
  let rho = 1,
    alpha = 1,
    omega = 1;
  for (let it = 1; it <= maxIter; it++) {
    yield { t: 'enter', kind: 'krylov', label: `BiCGStab iteration ${it}`, iteration: it };
    const rhoNew = dot(rhat, r);
    if (rhoNew === 0 || !isFinite(rhoNew)) throw new LinearFailure('BiCGStab breakdown (ρ = 0)');
    const beta = (rhoNew / rho) * (alpha / omega);
    for (let i = 0; i < n; i++) p[i] = r[i] + beta * (p[i] - omega * v[i]);
    yield vec('p = r + β(p − ω·v)');
    yield* precondition(levels, p, ph, 'p̂ = M⁻¹p  (one V-cycle)');
    yield* matvec(A, ph, v, 'v = A·p̂', 'v');
    alpha = rhoNew / dot(rhat, v);
    for (let i = 0; i < n; i++) s[i] = r[i] - alpha * v[i];
    yield vec('s = r − α·v');
    yield* precondition(levels, s, sh, 'ŝ = M⁻¹s  (one V-cycle)');
    yield* matvec(A, sh, t, 't = A·ŝ', 't');
    const tt = dot(t, t);
    omega = tt > 0 ? dot(t, s) / tt : 0;
    for (let i = 0; i < n; i++) x[i] += alpha * ph[i] + omega * sh[i];
    yield vec('δ += α·p̂ + ω·ŝ');
    // True residual, recomputed (not the recurrence's running estimate).
    yield* matvec(A, x, tr, 'True residual b − A·δ', 'true');
    for (let i = 0; i < n; i++) tr[i] = b[i] - tr[i];
    const rel = normInf(tr) / bnorm;
    ctx.linearHistory.push(rel);
    yield { t: 'op', op: 'check', cell: -1, reads: [], label: `‖b − Aδ‖∞/‖b‖∞ = ${rel.toExponential(2)}  (target ${eta})`, value: rel };
    yield { t: 'leave', kind: 'krylov' };
    if (rel <= eta) return { iterations: it, rel };
    if (!isFinite(rel)) throw new LinearFailure('BiCGStab diverged');
    for (let i = 0; i < n; i++) r[i] = s[i] - omega * t[i];
    // Restart on drift: if the recurrence disagrees with the true residual,
    // continue from the true one.
    if (normInf(r) < 0.5 * normInf(tr) || omega === 0) {
      r.set(tr);
      rhat.set(tr);
      p.fill(0);
      v.fill(0);
      rho = alpha = omega = 1;
    } else rho = rhoNew;
  }
  throw new LinearFailure('BiCGStab iteration cap');
}

// Solver-lab alternatives, for comparison with the default.

// Plain weighted Jacobi on the fine grid: x ← x + ω (b − A x)/diag.
export function* jacobiOnly(A, b, ctx, { eta, maxIter = 600 }) {
  const L = { A, z: ctx.delta, zNext: new Float64Array(A.n), rhs: b };
  L.z.fill(0);
  const bnorm = normInf(b);
  ctx.linearHistory.push(1);
  if (bnorm === 0) return { iterations: 0, rel: 0 };
  const tr = new Float64Array(A.n);
  for (let it = 1; it <= maxIter; it++) {
    yield { t: 'enter', kind: 'krylov', label: `Jacobi sweep ${it}`, iteration: it };
    yield* jacobiSweep(L, 0, `Weighted Jacobi sweep ${it}`);
    if (L.z !== ctx.delta) ctx.delta.set(L.z); // keep δ visible after the ping-pong
    for (let i = 0; i < A.n; i++) tr[i] = b[i] - A.rowTimes(i, L.z);
    const rel = normInf(tr) / bnorm;
    ctx.linearHistory.push(rel);
    yield { t: 'op', op: 'check', cell: -1, reads: [], label: `‖b − Aδ‖∞/‖b‖∞ = ${rel.toExponential(2)}  (target ${eta})`, value: rel };
    yield { t: 'leave', kind: 'krylov' };
    if (rel <= eta) {
      ctx.delta.set(L.z);
      return { iterations: it, rel };
    }
  }
  ctx.delta.set(L.z);
  throw new LinearFailure(`Jacobi did not reach η in ${maxIter} sweeps`);
}

// Stationary multigrid: repeated V-cycles x ← x + M⁻¹(b − A x).
export function* vcycleOnly(A, levels, b, ctx, { eta, maxIter = 200 }) {
  const x = ctx.delta;
  x.fill(0);
  const bnorm = normInf(b);
  ctx.linearHistory.push(1);
  if (bnorm === 0) return { iterations: 0, rel: 0 };
  const r = Float64Array.from(b),
    z = new Float64Array(A.n);
  for (let it = 1; it <= maxIter; it++) {
    yield { t: 'enter', kind: 'krylov', label: `V-cycle iteration ${it}`, iteration: it };
    yield* precondition(levels, r, z, 'z = M⁻¹r  (one V-cycle)');
    for (let i = 0; i < A.n; i++) x[i] += z[i];
    yield vec('δ += z');
    yield* matvec(A, x, r, 'True residual b − A·δ', 'true');
    for (let i = 0; i < A.n; i++) r[i] = b[i] - r[i];
    const rel = normInf(r) / bnorm;
    ctx.linearHistory.push(rel);
    yield { t: 'op', op: 'check', cell: -1, reads: [], label: `‖b − Aδ‖∞/‖b‖∞ = ${rel.toExponential(2)}  (target ${eta})`, value: rel };
    yield { t: 'leave', kind: 'krylov' };
    if (rel <= eta) return { iterations: it, rel };
    if (!isFinite(rel)) throw new LinearFailure('V-cycle iteration diverged');
  }
  throw new LinearFailure(`V-cycles did not reach η in ${maxIter} iterations`);
}

// Mirrored MIC(0)-preconditioned Conjugate Gradient on (−A)·δ = −b
// (since A has negative diagonal and non-negative off-diagonals, −A is SPD).
export function* micpcg(A, b, ctx, { eta, maxIter = 400 }) {
  const n = A.n,
    w = A.w;
  const x = ctx.delta;
  x.fill(0);
  const bnorm = normInf(b);
  ctx.linearHistory.push(1);
  if (bnorm === 0) return { iterations: 0, rel: 0 };

  const pre = [new Float64Array(n), new Float64Array(n)];
  const fwd = new Float64Array(n),
    other = new Float64Array(n),
    z = new Float64Array(n),
    r = new Float64Array(n),
    d = new Float64Array(n),
    q = new Float64Array(n);
  ctx.micZ = z;
  ctx.micPre = pre[0];
  for (let i = 0; i < n; i++) r[i] = -b[i]; // r = (−b) − (−A)·0

  const idx = (k, rev) => ((k / w) | 0) * w + (rev ? w - 1 - (k % w) : k % w);
  const prevSlot = (rev) => (rev ? RIGHT : LEFT);
  const nextSlot = (rev) => (rev ? LEFT : RIGHT);

  yield { t: 'enter', kind: 'hierarchy', label: 'Build mirrored MIC(0) incomplete Cholesky factors' };
  for (let rev = 0; rev < 2; rev++) {
    const p = pre[rev];
    yield { t: 'enter', kind: 'sweep', label: `MIC(0) factor (${rev ? 'right→left' : 'left→right'})`, level: 0 };
    for (let k = 0; k < n; k++) {
      const i = idx(k, rev);
      const full = -A.diag(i);
      let pivot = full;
      const reads = [];
      const jh = A.column(i, prevSlot(rev));
      if (jh >= 0) {
        const edge = A.get(i, prevSlot(rev)),
          perp = Math.max(0, A.get(jh, DOWN)),
          qj = p[jh] * p[jh];
        if (edge > 0) {
          pivot -= edge * (edge + 0.97 * perp) * qj;
          reads.push(jh);
        }
      }
      const jv = A.column(i, UP);
      if (jv >= 0) {
        const edge = A.get(i, UP),
          perp = Math.max(0, A.get(jv, nextSlot(rev))),
          qj = p[jv] * p[jv];
        if (edge > 0) {
          pivot -= edge * (edge + 0.97 * perp) * qj;
          reads.push(jv);
        }
      }
      if (pivot < 0.25 * full) pivot = full;
      p[i] = pivot > 0 ? 1 / Math.sqrt(pivot) : 0;
      yield { t: 'op', op: 'mic-factor', level: 0, cell: i, reads, value: p[i] };
    }
    yield { t: 'leave', kind: 'sweep' };
  }
  yield { t: 'leave', kind: 'hierarchy' };

  function* applyMic() {
    yield { t: 'enter', kind: 'vcycle', label: 'z = M⁻¹r  (mirrored MIC(0) triangular sweeps)' };
    for (let rev = 0; rev < 2; rev++) {
      const p = pre[rev],
        out = rev ? other : z,
        tag = rev ? 'R→L' : 'L→R';
      yield { t: 'enter', kind: 'sweep', label: `Forward substitution (${tag})`, level: 0 };
      for (let k = 0; k < n; k++) {
        const i = idx(k, rev);
        let val = r[i];
        const reads = [];
        const jh = A.column(i, prevSlot(rev));
        if (jh >= 0) {
          const edge = A.get(i, prevSlot(rev));
          if (edge > 0) {
            val += edge * p[jh] * fwd[jh];
            reads.push(jh);
          }
        }
        const jv = A.column(i, UP);
        if (jv >= 0) {
          const edge = A.get(i, UP);
          if (edge > 0) {
            val += edge * p[jv] * fwd[jv];
            reads.push(jv);
          }
        }
        fwd[i] = val * p[i];
        yield { t: 'op', op: 'pc-fwd', level: 0, cell: i, reads, value: fwd[i] };
      }
      yield { t: 'leave', kind: 'sweep' };

      yield { t: 'enter', kind: 'sweep', label: `Backward substitution (${tag})`, level: 0 };
      for (let k = n - 1; k >= 0; k--) {
        const i = idx(k, rev);
        let val = fwd[i];
        const reads = [];
        const jh = A.column(i, nextSlot(rev));
        if (jh >= 0) {
          const edge = A.get(i, nextSlot(rev));
          if (edge > 0) {
            val += edge * p[i] * out[jh];
            reads.push(jh);
          }
        }
        const jv = A.column(i, DOWN);
        if (jv >= 0) {
          const edge = A.get(i, DOWN);
          if (edge > 0) {
            val += edge * p[i] * out[jv];
            reads.push(jv);
          }
        }
        out[i] = val * p[i];
        yield { t: 'op', op: 'pc-bwd', level: 0, cell: i, reads, value: out[i] };
      }
      yield { t: 'leave', kind: 'sweep' };
    }
    for (let i = 0; i < n; i++) z[i] = 0.5 * (z[i] + other[i]);
    yield vec('z = ½(z_L→R + z_R→L)');
    yield { t: 'leave', kind: 'vcycle' };
  }

  let rz = 0;
  for (let it = 1; it <= maxIter; it++) {
    yield { t: 'enter', kind: 'krylov', label: `MIC(0)-PCG iteration ${it}`, iteration: it };
    yield* applyMic();
    const rzNew = dot(r, z);
    if (!(rzNew > 0) || !isFinite(rzNew)) throw new LinearFailure('MIC(0)-PCG breakdown (r·z ≤ 0)');
    if (it === 1) {
      d.set(z);
      yield vec('d = z');
    } else {
      const beta = rzNew / rz;
      for (let i = 0; i < n; i++) d[i] = z[i] + beta * d[i];
      yield vec('d = z + β·d');
    }
    rz = rzNew;

    yield { t: 'enter', kind: 'sweep', label: 'q = (−A)·d', level: 0 };
    for (let i = 0; i < n; i++) {
      q[i] = -A.rowTimes(i, d);
      yield { t: 'op', op: 'matvec', level: 0, cell: i, reads: A.neighbours(i), field: 'q' };
    }
    yield { t: 'leave', kind: 'sweep' };

    const dq = dot(d, q);
    if (!(dq > 0) || !isFinite(dq)) throw new LinearFailure('MIC(0)-PCG breakdown (d·q ≤ 0)');
    const alpha = rz / dq;
    for (let i = 0; i < n; i++) x[i] += alpha * d[i];
    yield vec('δ += α·d');

    yield { t: 'enter', kind: 'sweep', label: 'True residual r = (−b) − (−A)·δ', level: 0 };
    for (let i = 0; i < n; i++) {
      r[i] = A.rowTimes(i, x) - b[i];
      yield { t: 'op', op: 'matvec', level: 0, cell: i, reads: A.neighbours(i), field: 'true' };
    }
    yield { t: 'leave', kind: 'sweep' };

    const rel = normInf(r) / bnorm;
    ctx.linearHistory.push(rel);
    yield { t: 'op', op: 'check', cell: -1, reads: [], label: `‖b − Aδ‖∞/‖b‖∞ = ${rel.toExponential(2)}  (target ${eta})`, value: rel };
    yield { t: 'leave', kind: 'krylov' };
    if (rel <= eta) return { iterations: it, rel };
    if (!isFinite(rel)) throw new LinearFailure('MIC(0)-PCG diverged');
  }
  throw new LinearFailure(`MIC(0)-PCG did not reach η in ${maxIter} iterations`);
}

export function drain(gen) {
  for (;;) {
    const { value, done } = gen.next();
    if (done) return value;
  }
}
