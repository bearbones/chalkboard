// Trace consumer: turns the solver's event stream into "where are we" state for
// the panels, and decides which events are stops at a chosen granularity.

import { RANK } from './solver.js';
import { Stencil5, buildHierarchy, bicgstab, jacobiOnly, vcycleOnly, LinearFailure } from './linear.js';

// Whole-field ops (cell −1) are stops at the granularity of the decision they
// report: accept/reject end an interval, a merit or seed verdict ends a
// candidate, a convergence check ends a Krylov iteration.
const OP_RANK = { accept: 0, reject: 0, seed: 3, merit: 3, floor: 3, check: 3, vector: 6 };

export function eventRank(e) {
  if (e.t === 'enter') return RANK[e.kind] ?? RANK.op;
  if (e.t === 'op') return e.cell < 0 ? (OP_RANK[e.op] ?? 6) : RANK.op;
  return Infinity; // `leave` and `unwind` are bookkeeping, never stops
}

// Cost of one event in fine-grid passes: a cell update at any level costs
// 1/n₀, a whole-field vector update costs one pass. This is the honest x-axis
// for comparing a 5-iteration Krylov solve with a 400-sweep Jacobi solve.
export function opWork(e, n0) {
  if (e.t !== 'op') return 0;
  if (e.op === 'vector') return 1;
  return e.cell >= 0 ? 1 / n0 : 0;
}

export class Tracer {
  constructor(n0) {
    this.n0 = n0;
    this.stack = [];
    this.byKind = {};
    this.op = null;
    this.events = 0;
    this.linearId = 0; // increments at each linear solve
    this.linearPoints = null; // [{work, rel}] for the live linear plot
    this.work = 0;
  }
  get span() {
    return this.stack[this.stack.length - 1] || null;
  }
  get sweep() {
    return this.byKind.sweep;
  }
  get vcycle() {
    return this.byKind.vcycle;
  }
  get hierarchy() {
    return this.byKind.hierarchy;
  }
  get candidate() {
    return this.byKind.candidate;
  }
  get pass() {
    return this.byKind.pass;
  }
  get stage() {
    return this.byKind.stage?.stage || null;
  }
  reindex() {
    this.byKind = {};
    for (const s of this.stack) this.byKind[s.kind] = s;
  }
  push(e) {
    this.events++;
    if (e.t === 'enter') {
      this.stack.push(e);
      this.byKind[e.kind] = e;
      this.op = null;
      if (e.kind === 'stage' && e.stage === 'linear') {
        this.linearId++;
        this.work = 0;
        this.linearPoints = [{ work: 0, rel: 1 }];
      }
    } else if (e.t === 'leave') {
      this.stack.pop();
      this.reindex();
      this.op = null;
    } else if (e.t === 'unwind') {
      while (this.stack.length && this.span.kind !== e.kind) this.stack.pop();
      this.reindex();
      this.op = null;
    } else {
      this.op = e;
      if (this.stage === 'linear') {
        this.work += opWork(e, this.n0);
        if (e.op === 'check') this.linearPoints.push({ work: this.work, rel: e.value });
      }
    }
  }
}

// Run all three linear methods headless on one Newton system, for the ghost
// curves: what each would have done on exactly this J and b.
export function ghostRuns(J, b, eta) {
  const out = {};
  for (const method of ['bicgstab', 'vcycle', 'jacobi']) {
    const A = new Stencil5(J.w, J.h);
    A.rows.set(J.rows);
    const ctx = { delta: new Float64Array(A.n), linearHistory: [] };
    const gen = (function* () {
      if (method === 'jacobi') return yield* jacobiOnly(A, b, ctx, { eta });
      const levels = yield* buildHierarchy(A);
      return method === 'vcycle' ? yield* vcycleOnly(A, levels, b, ctx, { eta }) : yield* bicgstab(A, levels, b, ctx, { eta });
    })();
    const pts = [{ work: 0, rel: 1 }];
    let work = 0,
      ok = true;
    try {
      for (;;) {
        const { value: e, done } = gen.next();
        if (done) break;
        work += opWork(e, A.n);
        if (e.t === 'op' && e.op === 'check') pts.push({ work, rel: e.value });
      }
    } catch (err) {
      if (!(err instanceof LinearFailure)) throw err;
      ok = false;
    }
    out[method] = { pts, ok, iterations: pts.length - 1 };
  }
  return out;
}
