import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PressureSolver, DEFAULTS } from '../aids/pressure-solver/src/solver.js';
import { drain, buildHierarchy, vcycle, bicgstab, LEFT, CENTER, RIGHT, UP, DOWN } from '../aids/pressure-solver/src/linear.js';
import { SCENARIOS } from '../aids/pressure-solver/src/scenarios.js';
import { Tracer, eventRank } from '../aids/pressure-solver/src/trace.js';
import { DOCS, docFor } from '../aids/pressure-solver/src/docs.js';

function scene(id) {
  const built = SCENARIOS.find((s) => s.id === id).build();
  const solver = new PressureSolver(built.ch);
  if (built.settle) drain(solver.settle());
  built.afterPrelude?.(built.ch);
  return { ch: built.ch, solver };
}

// The first Newton system of a scenario's first interval. For 'hot' it is the
// trapped pocket right after the heat pulse.
function firstSystem(id) {
  const { solver } = scene(id);
  const gen = solver.interval();
  for (;;) {
    const e = gen.next().value;
    if (e.t === 'enter' && e.kind === 'stage' && e.stage === 'linear') break;
  }
  return { solver, A: solver.x.J, b: Float64Array.from(solver.x.rhs) };
}

function denseSolve(A, b) {
  const n = A.n;
  const M = Array.from({ length: n }, () => new Float64Array(n + 1));
  for (let i = 0; i < n; i++) {
    for (const k of [UP, LEFT, CENTER, RIGHT, DOWN]) {
      const j = A.column(i, k);
      if (j >= 0) M[i][j] += A.get(i, k);
    }
    M[i][n] = b[i];
  }
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      if (f) for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

for (const sc of SCENARIOS) {
  test(`${sc.id}: 25 intervals converge, conserving mass`, () => {
    const { ch, solver } = scene(sc.id);
    const mass = () => {
      let m = 0;
      for (let i = 0; i < ch.n; i++) m += ch.water[i] + ch.ma[i];
      return m - ch.externalMass;
    };
    const m0 = mass();
    for (let k = 0; k < 25; k++) {
      const r = drain(solver.interval());
      assert.ok(r.newton <= DEFAULTS.maxNewton);
      assert.ok(solver.x.cur.maxR <= DEFAULTS.tol, `interval ${k + 1}: max|R| = ${solver.x.cur.maxR}`);
    }
    assert.ok(Math.abs(mass() - m0) / m0 < 1e-9, `mass drifted by ${mass() - m0}`);
  });
}

test('the Jacobian matches finite differences of the residual', () => {
  const { solver } = scene('cold');
  const { ch, x } = solver;
  x.dt = ch.dt;
  drain(solver.prepass());
  x.cur.p.set(ch.pAccepted);
  drain(solver.evaluate(x.cur));
  drain(solver.assemble());
  const base = Float64Array.from(x.cur.R);
  const probe = x.cand;
  // A liquid cell, a gas cell in the pocket, and a cell beside the cup wall.
  for (const j of [12 * 16 + 3, 9 * 16 + 7, 11 * 16 + 5]) {
    if (!ch.fluid[j]) continue;
    const h = 1e-3;
    probe.p.set(x.cur.p);
    probe.p[j] += h;
    drain(solver.evaluate(probe));
    for (const [i, k] of [[j, CENTER], [j - 1, RIGHT], [j + 1, LEFT], [j - 16, DOWN], [j + 16, UP]]) {
      if (!ch.fluid[i]) continue;
      const fd = (probe.R[i] - base[i]) / h;
      const an = x.J.get(i, k);
      assert.ok(Math.abs(fd - an) <= 1e-3 * Math.abs(an) + 1e-12, `J[${i}][${j}]: analytic ${an}, FD ${fd}`);
    }
  }
});

// The energy norm ‖e‖ = sqrt(−eᵀAe) (A is negative definite) is the norm a
// symmetric V-cycle is guaranteed to shrink. On the open tank it shrinks by about 0.7 per cycle;
// on the trapped pocket barely, because its slow mode straddles the solid lid,
// which is the case BiCGStab exists for.
for (const [id, factor] of [['still', 0.8], ['hot', 1]]) {
  test(`one V-cycle reduces the energy-norm error (${id})`, () => {
    const { A, b } = firstSystem(id);
    const levels = drain(buildHierarchy(A));
    const exact = denseSolve(A, b);
    const energy = (z) => {
      const e = exact.map((v, i) => v - z[i]);
      let s = 0;
      for (let i = 0; i < A.n; i++) s -= e[i] * A.rowTimes(i, e);
      return Math.sqrt(s);
    };
    levels[0].rhs.set(b);
    const z = Float64Array.from(drain(vcycle(levels, 0)));
    const ratio = energy(z) / energy(new Float64Array(A.n));
    assert.ok(ratio < factor, `${id}: energy error ratio ${ratio}`);
  });
}

test('BiCGStab reaches the forcing tolerance on the trapped-pocket system', () => {
  const { A, b } = firstSystem('hot');
  const levels = drain(buildHierarchy(A));
  const ctx = { delta: new Float64Array(A.n), linearHistory: [] };
  const r = drain(bicgstab(A, levels, b, ctx, { eta: 0.01 }));
  assert.ok(r.rel <= 0.01 && r.iterations < 20);
  let m = 0,
    bn = 0;
  for (let i = 0; i < A.n; i++) {
    m = Math.max(m, Math.abs(b[i] - A.rowTimes(i, ctx.delta)));
    bn = Math.max(bn, Math.abs(b[i]));
  }
  assert.ok(m / bn <= 0.01 + 1e-12);
});

test('the trace is well nested and every stop has a doc line', () => {
  const { ch, solver } = scene('boil');
  const tr = new Tracer(ch.n);
  const gen = solver.interval();
  for (;;) {
    const { value: e, done } = gen.next();
    if (done) break;
    tr.push(e);
    if (eventRank(e) <= 7) {
      const d = docFor(tr, solver.opt.linear);
      const line = d.line(tr);
      assert.ok(line >= 0 && line < d.code.length, `${d.title}: line ${line}`);
    }
  }
  assert.equal(tr.stack.length, 0);
  assert.ok(Object.keys(DOCS).length >= 10);
});
