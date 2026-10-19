// notation-einstein: pick an index expression and a dimension, and see every
// sum the summation convention hides. Free indices (one equation per value)
// are coloured t1, summed indices t2. The expansion is the pure kernel in
// sims/ch-notation-index.js, which the tests check.

import { h } from '../../kit/dom.js';
import { frame, select, segmented, toggle, readout } from '../../kit/widgets.js';
import { tex } from '../../kit/math.js';
import { EXPRESSIONS, expand, compactTex, sigmaTex } from '../../sims/ch-notation-index.js';

const ORDER = ['conv', 'grad', 'div', 'stress', 'lap', 'delta', 'curl', 'bad'];

const WHAT = {
  conv: 'Row x is Euler\'s convective term u(du/dx) + v(du/dy) + w(du/dz).',
  grad: 'A free index and nothing repeated: one term per equation, no sum at all.',
  div: 'Every index is repeated, so nothing is free: the result is one number at each point.',
  stress: 'Row x is Cauchy\'s dA/dx + dF/dy + dE/dz with A = σ_xx, F = σ_xy, E = σ_xz.',
  lap: 'The same j appears on both derivatives, so it is summed: the Laplacian of each component.',
  delta: 'δ_ij is 1 when i = j and 0 otherwise, so the sum keeps only the term with j = i.',
  curl: 'ε_ijk is +1, −1 or 0, so most of the written-out terms vanish. In a plane flow only the z component survives.',
  bad: 'Index i appears three times in one term. The rule says nothing about that case, so the expression has no meaning.',
};

export function mountEinstein(fig) {
  const f = frame(fig, { title: 'What the summation convention hides', wide: true });
  const key = h(
    'div.nt-key',
    h('span.nt-key-item', h('span.nt-sw.t1'), 'free index: one equation per value'),
    h('span.nt-key-item', h('span.nt-sw.t2'), 'summed index: add over all values'),
  );
  const compact = h('div.nt-eqs.nt-compact');
  const sigmaLine = h('div.nt-eqs', { hidden: true });
  const arrow = h('p.nt-comp-label', 'Written out:');
  const expanded = h('div.nt-eqs');
  const what = h('p.nt-note');
  f.stage.append(key, compact, sigmaLine, arrow, expanded, what);

  const rFree = readout(f.readouts, { label: 'Free index' });
  const rSum = readout(f.readouts, { label: 'Summed index' });
  const rEq = readout(f.readouts, { label: 'Equations' });
  const rTerms = readout(f.readouts, { label: 'Terms written out' });

  const state = { id: 'conv', d: 3, mode: 'num', sigma: false, zeros: false };
  const draw = () => {
    const spec = EXPRESSIONS[state.id];
    const e = expand(spec, state.d, { mode: state.mode, zeros: state.zeros });
    compact.innerHTML = tex(compactTex(spec), { display: true });
    sigmaLine.hidden = !state.sigma || !!e.error || !e.dummy.length;
    if (!sigmaLine.hidden) sigmaLine.innerHTML = tex(`${compactTex(spec)}\\;\\equiv\\;${sigmaTex(spec, state.d)}`, { display: true });
    zeros.el.hidden = !e.symbols;
    what.textContent = WHAT[spec.id];
    if (e.error) {
      arrow.hidden = true;
      expanded.replaceChildren();
      rFree.set('–');
      rSum.set(`${e.error.index} appears ${e.error.count} times`, 'bad');
      rEq.set('–');
      rTerms.set('–');
      f.status.textContent = `Ill-formed: index ${e.error.index} appears ${e.error.count} times in one term, and the convention allows at most two.`;
      return;
    }
    arrow.hidden = false;
    const body = e.free.length
      ? `\\begin{aligned}${e.rows.map((r) => `${r.label}:&\\quad ${r.tex}`).join('\\\\')}\\end{aligned}`
      : e.rows[0].tex;
    expanded.innerHTML = tex(body, { display: true });
    const plane = spec.plane && state.d === 2;
    rFree.set(e.free.length ? `${e.free.join(', ')}${plane ? ' (z only)' : ''}` : 'none');
    rSum.set(e.dummy.length ? e.dummy.join(', ') : 'none');
    rEq.set(String(e.rows.length));
    const per = e.symbols ? `${e.termsPerRow} each, ${e.nonzeroPerRow} non-zero` : `${e.termsPerRow} each`;
    rTerms.set(`${e.total} (${per})`);
    const eqWord = e.rows.length === 1 ? 'one equation' : `${e.rows.length} equations`;
    const sumWord = e.dummy.length ? `summed over ${e.dummy.join(' and ')}` : 'with no sum';
    f.status.textContent = `${spec.name} in ${state.d}-D: ${eqWord}, ${sumWord}, ${e.total} terms written out.`;
  };

  select(f.controls, {
    label: 'Expression',
    options: ORDER.map((id) => [id, EXPRESSIONS[id].text]),
    value: state.id,
    onChange: (v) => ((state.id = v), draw()),
  });
  segmented(f.controls, { label: 'Dimensions', options: [['2', '2-D'], ['3', '3-D']], value: '3', onChange: (v) => ((state.d = Number(v)), draw()) });
  segmented(f.controls, { label: 'Write indices as', options: [['num', '1, 2, 3'], ['xyz', 'x, y, z']], value: 'num', onChange: (v) => ((state.mode = v), draw()) });
  toggle(f.controls, { label: 'Show the Σ signs', checked: false, onChange: (on) => ((state.sigma = on), draw()) });
  const zeros = toggle(f.controls, { label: 'Keep the zero terms', checked: false, onChange: (on) => ((state.zeros = on), draw()) });

  const preset = fig.dataset.preset;
  if (preset && EXPRESSIONS[preset]) state.id = preset;
  f.controls.querySelector('select').value = state.id;
  draw();
}
