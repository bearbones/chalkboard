// Figure similarity-pi: a Buckingham Pi builder. Pick the variables a
// quantity depends on and the repeating variables; the kernel's exact
// rational null-space computation (sims/similarity.js) does the rest.

import { h } from '../../kit/dom.js';
import { frame, select, button, readout } from '../../kit/widgets.js';
import { tex } from '../../kit/math.js';
import { VARIABLES, PI_PRESETS, NUMBERS, DIMENSIONS, piGroups } from '../../sims/similarity.js';

// Variables the library does not have, as custom { id, dims, tex } objects.
const CUSTOM = {
  m: { id: 'm', name: 'mass', tex: 'm', dims: [1, 0, 0, 0] },
  R: { id: 'R', name: 'blast radius', tex: 'R', dims: [0, 1, 0, 0] },
  E: { id: 'E', name: 'energy released', tex: 'E', dims: [1, 2, -2, 0] },
  x: { id: 'x', name: 'distance from the step', tex: 'x', dims: [0, 1, 0, 0] },
};
const varOf = (id) => CUSTOM[id] || VARIABLES[id];

const fromKernel = (id, extras) => ({ name: PI_PRESETS[id].name, vars: PI_PRESETS[id].vars, extras, note: PI_PRESETS[id].note });

const PROBLEMS = {
  'sphere-drag': fromKernel('sphere-drag', ['eps', 'c', 'g']),
  'pipe-pressure-drop': fromKernel('pipe-pressure-drop', ['c']),
  'ship-resistance': fromKernel('ship-resistance', ['sigma']),
  'vortex-shedding': fromKernel('vortex-shedding', ['eps']),
  'compressible-drag': fromKernel('compressible-drag', ['g']),
  'droplet-breakup': fromKernel('droplet-breakup', ['g']),
  'natural-convection': fromKernel('natural-convection', []),
  pump: fromKernel('pump', ['eps']),
  pendulum: { name: 'Period of a pendulum', vars: ['t', 'L', 'g', 'm'], extras: ['rho'], names: { t: 'period' }, note: 'The mass is in the list on purpose.' },
  'blast-wave': { name: 'Radius of a blast wave', vars: ['R', 'E', 't', 'rho'], extras: [], names: { t: 'time since the blast' }, note: 'One group, so it must be a constant: R grows as t to the power 2/5.' },
  'heat-step': { name: 'Temperature after a sudden step', vars: ['T', 'dT', 'x', 't', 'alpha'], extras: [], names: { T: 'temperature rise', dT: 'size of the step' }, note: 'The second group is the similarity variable of the last section.' },
};

// Figure presets: a problem, optionally with a repeating set or dropped variables.
const FIGURE_PRESETS = {
  'sphere-stokes': { problem: 'sphere-drag', repeating: ['mu', 'U', 'D'] },
  creeping: { problem: 'sphere-drag', drop: ['rho'] },
  'bad-repeating': { problem: 'sphere-drag', repeating: ['rho', 'U'] },
};

const texOf = (id) => varOf(id).tex;
const math = (src, cls) => h('span', { class: cls || null, html: tex(src) });

function powerTex(p) {
  if (p === 1) return '';
  if (Number.isInteger(p)) return `^{${p}}`;
  if (Number.isInteger(2 * p)) return `^{${2 * p}/2}`;
  return `^{${+p.toFixed(3)}}`;
}

export function mountSimilarityPi(fig) {
  const { stage, controls, readouts, status } = frame(fig, { title: 'Buckingham Π builder' });
  const preset = FIGURE_PRESETS[fig.dataset.preset] || { problem: PROBLEMS[fig.dataset.preset] ? fig.dataset.preset : 'sphere-drag' };

  let problemId = preset.problem;
  let included = new Set();
  let repeating = null; // null: the kernel chooses

  const varBox = h('div.chips', { role: 'group', 'aria-label': 'Variables in the problem' });
  const repBox = h('div.chips', { role: 'group', 'aria-label': 'Repeating variables' });
  const matrixBox = h('div', { style: { overflowX: 'auto', maxWidth: '100%' } });
  const groupBox = h('div', { 'aria-live': 'polite' });
  const noteEl = h('p', { style: { margin: '0', fontSize: '0.9rem', color: 'var(--muted)' } });
  const label = (t) => h('p', { style: { margin: '0', fontSize: '0.84rem', color: 'var(--muted)' } }, t);
  stage.append(noteEl, label('Variables (tap to add or remove; the first is the quantity you want):'), varBox, label('Repeating variables (tap to choose):'), repBox, matrixBox, groupBox);

  const problemSel = select(controls, {
    label: 'Problem',
    options: Object.entries(PROBLEMS).map(([id, p]) => [id, p.name]),
    value: problemId,
    onChange: (v) => setProblem(v),
  });
  button(controls, { label: 'Automatic choice', kind: 'small', onClick: () => ((repeating = null), update()) });
  const rN = readout(readouts, { label: 'variables n' });
  const rRank = readout(readouts, { label: 'rank r (independent dimensions)' });
  const rCount = readout(readouts, { label: 'groups n − r' });

  function setProblem(id, extra = {}) {
    problemId = id;
    const P = PROBLEMS[id];
    included = new Set(P.vars.filter((v) => !(extra.drop || []).includes(v)));
    repeating = extra.repeating || null;
    problemSel.set(id, { silent: true });
    update();
  }

  const nameOf = (id) => PROBLEMS[problemId].names?.[id] || varOf(id).name;

  function chip(id, pressed, onClick, disabled) {
    const b = h('button.chip', { type: 'button', 'aria-pressed': String(pressed), 'aria-disabled': disabled ? 'true' : null, title: nameOf(id) }, math(texOf(id)), ' ', h('span', nameOf(id)));
    if (disabled) b.style.opacity = '0.75';
    b.addEventListener('click', () => !disabled && onClick());
    return b;
  }

  function update() {
    const P = PROBLEMS[problemId];
    noteEl.textContent = P.note || '';
    const candidates = [...P.vars, ...P.extras.filter((v) => !P.vars.includes(v))];
    const list = candidates.filter((v) => included.has(v));
    const first = P.vars[0];

    // Variables row
    varBox.replaceChildren(
      ...candidates.map((id) =>
        chip(
          id,
          included.has(id),
          () => {
            included.has(id) ? included.delete(id) : included.add(id);
            repeating = null;
            update();
          },
          id === first,
        ),
      ),
    );

    let res = null;
    let err = null;
    try {
      res = piGroups(list.map(varOf), { repeating });
    } catch (e) {
      err = e;
    }
    // Rank for messages even when the chosen repeating set is invalid.
    const auto = err ? piGroups(list.map(varOf)) : res;
    const repSet = new Set(res ? res.repeating : repeating || []);

    repBox.replaceChildren(
      ...list.map((id) =>
        chip(id, repSet.has(id), () => {
          const cur = res ? [...res.repeating] : [...(repeating || [])];
          repeating = cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id];
          update();
        }),
      ),
    );

    // Dimension matrix: rows M, L, T, Theta that are used; columns the variables.
    const rows = [0, 1, 2, 3].filter((r) => list.some((id) => varOf(id).dims[r] !== 0));
    const cell = (c, attrs = {}) => h('td', { class: 'num', ...attrs }, c);
    const table = h(
      'table',
      { 'aria-label': 'Dimension matrix' },
      h('caption', { style: { textAlign: 'left', fontSize: '0.84rem', color: 'var(--muted)' } }, 'Dimension matrix: the power of each base dimension in each variable'),
      h('thead', h('tr', h('th', ''), ...list.map((id) => h('th', { class: 'num', scope: 'col' }, math(texOf(id)))))),
      h(
        'tbody',
        ...rows.map((r) => h('tr', h('th', { scope: 'row' }, math(DIMENSIONS[r].tex)), ...list.map((id) => cell(fmtInt(varOf(id).dims[r]))))),
        h('tr', h('th', { scope: 'row', style: { fontWeight: '400', fontSize: '0.84rem' } }, 'repeating'), ...list.map((id) => cell(repSet.has(id) ? '✓' : ''))),
      ),
    );
    matrixBox.replaceChildren(table);

    rN.set(String(list.length));
    rRank.set(String(auto.rank));
    rCount.set(String(auto.count), auto.count === 0 ? 'bad' : '');

    if (err) {
      const k = (repeating || []).length;
      groupBox.replaceChildren(h('p', { style: { margin: '0' } }, 'No groups until the repeating set is valid.'));
      status.textContent =
        k !== auto.rank
          ? `Choose exactly ${auto.rank} repeating variables: you have ${k}. They must between them carry every base dimension in the matrix.`
          : `Those ${k} are not dimensionally independent: some power product of them is already dimensionless, so they cannot fix every base dimension.`;
      return;
    }
    if (res.count === 0) {
      groupBox.replaceChildren(h('p', { style: { margin: '0' } }, 'No dimensionless group can be formed from these variables.'));
      status.textContent = 'With n = r there is no group at all: the answer cannot depend on these variables alone. Something it depends on is missing from the list.';
      return;
    }

    const items = res.groups.map((g, i) => {
      const named = g.named ? NUMBERS[g.named.id] : null;
      const nameTex = named ? ` = \\mathrm{${named.id}}${powerTex(g.named.power)}` : '';
      return h('li', math(`\\Pi_{${i + 1}} = ${g.tex}${nameTex}`), named ? h('span', { style: { color: 'var(--muted)', fontSize: '0.88rem' } }, ` (${named.name}${g.named.power !== 1 ? ', as a power' : ''})`) : null);
    });
    groupBox.replaceChildren(h('ol', { style: { margin: '0', paddingLeft: '1.4em', display: 'grid', gap: '6px' } }, ...items), h('p', { style: { margin: '6px 0 0' } }, math(res.relation)));

    // Narration
    const unused = res.repeating.filter((id) => res.groups.every((g) => g.exponents[res.vars.indexOf(id)] === 0));
    const msgs = [`${res.n} variables, rank ${res.rank}, so ${res.count} group${res.count > 1 ? 's' : ''}.`];
    if (res.repeating.includes(first)) msgs.push(`You made ${nameOf(first)} a repeating variable: legal, but now it hides inside every group and you cannot solve for it.`);
    else if (unused.length) msgs.push(`${unused.map(nameOf).join(' and ')} appears in no group, so it cannot matter.`);
    else if (res.count === 1) msgs.push('One group: it must be a constant. Dimensions alone fix the law up to one number.');
    else if (res.count === 2) msgs.push('Π₁ = φ(Π₂): one curve from experiment covers every size, speed and fluid.');
    else msgs.push(`Π₁ depends on ${res.count - 1} groups: still far fewer experiments than varying all ${res.n - 1} variables one at a time.`);
    status.textContent = msgs.join(' ');
  }

  setProblem(problemId, preset);
}

function fmtInt(v) {
  if (v === 0) return '0';
  return v < 0 ? `−${-v}` : String(v);
}
