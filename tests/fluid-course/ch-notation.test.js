// Tests for the notation chapter: the index-notation expander behind the
// notation-einstein figure, and the error ratios the notation-grid figure
// quotes from the shared advection kernel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPRESSIONS, classify, levi, ranges, expand, compactTex, sigmaTex } from '../../aids/fluid-course/src/sims/ch-notation-index.js';
import { convergenceStudy } from '../../aids/fluid-course/src/sims/advection.js';
import { drain } from '../../aids/fluid-course/src/sims/util.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

const strip = (s) => s.replace(/\\class\{t\d\}\{([^{}]*)\}/g, '$1');

test('classify: free indices occur once, summed indices twice, three times is an error', () => {
  assert.deepEqual(classify(EXPRESSIONS.conv.factors).free, ['i']);
  assert.deepEqual(classify(EXPRESSIONS.conv.factors).dummy, ['j']);
  assert.deepEqual(classify(EXPRESSIONS.div.factors).free, []);
  assert.deepEqual(classify(EXPRESSIONS.div.factors).dummy, ['i']);
  assert.deepEqual(classify(EXPRESSIONS.grad.factors).dummy, []);
  assert.deepEqual(classify(EXPRESSIONS.curl.factors).dummy, ['j', 'k']);
  assert.deepEqual(classify(EXPRESSIONS.bad.factors).error, { index: 'i', count: 3 });
  assert.equal(expand(EXPRESSIONS.bad, 3).rows.length, 0);
});

test('the permutation symbol: +1 for even, −1 for odd, 0 for a repeat', () => {
  assert.equal(levi(1, 2, 3), 1);
  assert.equal(levi(2, 3, 1), 1);
  assert.equal(levi(3, 1, 2), 1);
  assert.equal(levi(1, 3, 2), -1);
  assert.equal(levi(3, 2, 1), -1);
  assert.equal(levi(2, 1, 3), -1);
  for (const [a, b, c] of [[1, 1, 2], [2, 3, 3], [3, 1, 3]]) assert.equal(levi(a, b, c), 0);
});

test('counts: one equation per free value, d^(summed indices) terms per equation', () => {
  for (const d of [2, 3]) {
    const conv = expand(EXPRESSIONS.conv, d);
    assert.equal(conv.rows.length, d);
    assert.equal(conv.termsPerRow, d);
    assert.equal(conv.total, d * d);
    const div = expand(EXPRESSIONS.div, d);
    assert.equal(div.rows.length, 1);
    assert.equal(div.termsPerRow, d);
    const grad = expand(EXPRESSIONS.grad, d);
    assert.equal(grad.rows.length, d);
    assert.equal(grad.termsPerRow, 1);
    const lap = expand(EXPRESSIONS.lap, d);
    assert.equal(lap.total, d * d);
  }
  const curl3 = expand(EXPRESSIONS.curl, 3);
  assert.equal(curl3.rows.length, 3);
  assert.equal(curl3.termsPerRow, 9);
  assert.equal(curl3.nonzeroPerRow, 2);
  assert.equal(curl3.total, 27);
  assert.equal(curl3.nonzero, 6);
  const curl2 = expand(EXPRESSIONS.curl, 2);
  assert.deepEqual(ranges(EXPRESSIONS.curl, 2), { i: [3], j: [1, 2], k: [1, 2] });
  assert.equal(curl2.rows.length, 1);
  assert.equal(curl2.termsPerRow, 4);
  assert.equal(curl2.nonzeroPerRow, 2);
});

test('the convective row for x is Euler\'s u du/dx + v du/dy + w du/dz', () => {
  const row = expand(EXPRESSIONS.conv, 3, { mode: 'xyz' }).rows[0];
  assert.equal(strip(row.tex), 'u\\,\\frac{\\partial u}{\\partial x} + v\\,\\frac{\\partial u}{\\partial y} + w\\,\\frac{\\partial u}{\\partial z}');
  const div = expand(EXPRESSIONS.div, 3, { mode: 'xyz' }).rows[0];
  assert.equal(strip(div.tex), '\\frac{\\partial u}{\\partial x} + \\frac{\\partial v}{\\partial y} + \\frac{\\partial w}{\\partial z}');
  const lap = expand(EXPRESSIONS.lap, 2, { mode: 'xyz' }).rows[1];
  assert.equal(strip(lap.tex), '\\frac{\\partial^{2} v}{\\partial x^{2}} + \\frac{\\partial^{2} v}{\\partial y^{2}}');
});

test('ε_ijk ∂_j u_k is the curl, checked on a linear velocity field', () => {
  // u_k = A[k][j] x_j, so ∂_j u_k = A[k][j]; the curl is (A32 − A23, A13 − A31, A21 − A12).
  const A = [[0.3, -1.7, 2.1], [0.9, -0.4, 1.3], [-2.2, 0.6, 0.8]];
  const at = (k, j) => A[k - 1][j - 1];
  const e = expand(EXPRESSIONS.curl, 3);
  const omega = e.rows.map((r) => r.terms.reduce((s, t) => s + t.coef * at(t.vals.k, t.vals.j), 0));
  const want = [A[2][1] - A[1][2], A[0][2] - A[2][0], A[1][0] - A[0][1]];
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(omega[i] - want[i]) < 1e-15, `ω_${i + 1}`);
  assert.equal(strip(expand(EXPRESSIONS.curl, 2, { mode: 'xyz' }).rows[0].tex), '\\frac{\\partial v}{\\partial x} - \\frac{\\partial u}{\\partial y}');
});

test('δ_ij u_j picks out u_i', () => {
  for (const d of [2, 3]) {
    const e = expand(EXPRESSIONS.delta, d);
    e.rows.forEach((r, k) => {
      const live = r.terms.filter((t) => t.coef !== 0);
      assert.equal(live.length, 1);
      assert.equal(live[0].vals.j, k + 1);
      assert.equal(strip(r.simplified), `u_{${k + 1}}`);
    });
  }
});

test('every TeX string the expander writes parses', () => {
  for (const spec of Object.values(EXPRESSIONS)) {
    assert.doesNotThrow(() => tex(compactTex(spec), { display: true }), `${spec.id} compact`);
    for (const d of [2, 3]) {
      assert.doesNotThrow(() => tex(sigmaTex(spec, d), { display: true }), `${spec.id} sigma`);
      for (const mode of ['num', 'xyz'])
        for (const zeros of [false, true])
          for (const r of expand(spec, d, { mode, zeros }).rows) {
            for (const s of [r.label, r.tex, r.rawTex, r.simplified]) assert.doesNotThrow(() => tex(s, { display: true }), `${spec.id} ${d} ${mode}: ${s}`);
          }
    }
  }
});

// The notation-grid figure quotes these ratios (ν = 0.8, sine, one period,
// grids 32 → 256): halving Δx divides the error by about 2^p.
test('error ratios on halving Δx match O(Δx^p) for the figure\'s schemes', () => {
  const ratios = (id) => {
    const r = drain(convergenceStudy(id, 0.8, [32, 64, 128, 256], 'sine', 1));
    return r.errors.slice(1).map((e, k) => r.errors[k] / e);
  };
  for (const id of ['lw', 'bw', 'leapfrog']) {
    const q = ratios(id);
    assert.ok(Math.abs(q[q.length - 1] - 4) < 0.05, `${id}: ${q}`);
  }
  for (const id of ['upwind', 'lxf']) {
    const q = ratios(id);
    assert.ok(Math.abs(q[q.length - 1] - 2) < 0.1, `${id}: ${q}`);
  }
  // FTCS is consistent but unstable: the error first halves, then grid-scale
  // round-off grows until the finest grid is useless.
  const f = drain(convergenceStudy('ftcs', 0.8, [32, 64, 128, 256], 'sine', 1));
  assert.ok(f.errors[0] / f.errors[1] > 1.8, `ftcs first ratio ${f.errors[0] / f.errors[1]}`);
  assert.ok(f.errors[3] > 1e6, `ftcs finest error ${f.errors[3]}`);
});
