// notation-five-ways: the x-momentum equation as Euler (1757), Navier (1822),
// Stokes (1845), the vector form, index notation and the compact index form
// wrote it. The same five kinds of term keep the same colours throughout:
// t1 time derivative, t2 convective, t3 pressure, t4 friction, t5 body force.
// Historical forms follow the research dossier (Euler: Frisch's translation of
// E226; Navier and Stokes: their memoirs as transcribed in the dossier).

import { h } from '../../kit/dom.js';
import { frame, slider, button, toggle, readout } from '../../kit/widgets.js';
import { tex } from '../../kit/math.js';

const STAGES = [
  {
    id: 'euler',
    who: 'Euler: presented 1755, printed 1757',
    short: 'Euler',
    title: 'Euler, 1757',
    when: 'Presented to the Berlin Academy in 1755, printed 1757',
    mom: String.raw`\class{t5}{P}-\class{t3}{\frac{1}{q}\left(\frac{dp}{dx}\right)}=\class{t1}{\left(\frac{du}{dt}\right)}+\class{t2}{u\left(\frac{du}{dx}\right)+v\left(\frac{du}{dy}\right)+w\left(\frac{du}{dz}\right)}`,
    compLabel: 'Continuity, as he wrote it',
    comp: String.raw`\left(\frac{dq}{dt}\right)+\left(\frac{d.qu}{dx}\right)+\left(\frac{d.qv}{dy}\right)+\left(\frac{d.qw}{dz}\right)=0`,
    partial: '(du/dx): d inside brackets',
    friction: 'none: an ideal fluid',
    lines: 'three, one per axis (x shown)',
    note: 'Euler\'s units are his own: p is a pressure measured as the height of a column of a reference fluid, q = ρ/ρ₀ is a density with no units, and the force P is divided by g. The y and z equations repeat the pattern with Q, R and v, w.',
  },
  {
    id: 'navier',
    who: 'Navier: read 1822, printed 1827',
    short: 'Navier',
    title: 'Navier, 1822',
    when: 'Read to the Academy 18 March 1822, printed 1827',
    mom: String.raw`\class{t5}{\mathrm{P}}-\class{t3}{\frac{dp}{dx}}=\rho\left(\class{t1}{\frac{du}{dt}}+\class{t2}{u\frac{du}{dx}+v\frac{du}{dy}+w\frac{du}{dz}}\right)-\class{t4}{\varepsilon\left(\frac{d^2u}{dx^2}+\frac{d^2u}{dy^2}+\frac{d^2u}{dz^2}\right)}`,
    compLabel: 'His wall condition, which lets the fluid slip',
    comp: String.raw`E\,u+\varepsilon\,\frac{du}{dz}=0`,
    partial: 'du/dx: a plain d; context says it is partial',
    friction: 'ε, about μ/2 (Bistafa 2018)',
    lines: 'three, one per axis (x shown)',
    note: 'Navier reached the extra term from a model of forces between molecules. His ε is not exactly today\'s μ. The letters ρ and p are the ones still in use.',
  },
  {
    id: 'stokes',
    who: 'Stokes: read 1845, printed 1847',
    short: 'Stokes',
    title: 'Stokes, 1845',
    when: 'Read 14 April 1845, printed 1847',
    mom: String.raw`\rho\left(\class{t1}{\frac{Du}{Dt}}-\class{t5}{X}\right)+\class{t3}{\frac{dp}{dx}}-\class{t4}{\mu\left(\frac{d^2u}{dx^2}+\frac{d^2u}{dy^2}+\frac{d^2u}{dz^2}\right)-\frac{\mu}{3}\frac{d}{dx}\left(\frac{du}{dx}+\frac{dv}{dy}+\frac{dw}{dz}\right)}=0`,
    compLabel: 'Incompressible case: add this and the μ/3 term vanishes',
    comp: String.raw`\frac{du}{dx}+\frac{dv}{dy}+\frac{dw}{dz}=0`,
    partial: 'du/dx: still a plain d; D/Dt follows the particle',
    friction: 'μ, one constant',
    lines: 'three, one per axis (x shown)',
    note: 'Du/Dt packs the time term and the convective term (colours 1 and 2) into one symbol. The μ/3 term assumes zero bulk viscosity, a modelling choice now called the Stokes hypothesis.',
  },
  {
    id: 'vector',
    who: 'Gibbs, Heaviside; textbooks from 1901',
    short: 'Vector',
    title: 'Vector form, 20th century',
    when: 'Notation of Gibbs (1881–84) and Heaviside (1893); textbook form after Gibbs and Wilson (1901)',
    mom: String.raw`\rho\left(\class{t1}{\frac{\partial\mathbf{u}}{\partial t}}+\class{t2}{(\mathbf{u}\cdot\nabla)\mathbf{u}}\right)=\class{t3}{-\nabla p}+\class{t4}{\mu\nabla^2\mathbf{u}}+\class{t5}{\rho\mathbf{f}}`,
    compLabel: 'Continuity (incompressible)',
    comp: String.raw`\nabla\cdot\mathbf{u}=0`,
    partial: '∂ (Legendre 1786, revived by Jacobi 1841)',
    friction: 'μ',
    lines: 'one vector equation',
    note: 'A modern rendering for an incompressible fluid with constant μ. Prandtl\'s 1904 boundary-layer paper already gives the viscous equation in Gibbs\'s vector notation.',
  },
  {
    id: 'index',
    who: 'Ricci–Levi-Civita 1900, Einstein 1916',
    short: 'Index',
    title: 'Index notation, 20th century',
    when: 'Ricci and Levi-Civita (1900), Einstein\'s summation rule (1916); in fluid texts such as Batchelor (1967)',
    mom: String.raw`\class{t1}{\frac{\partial u_i}{\partial t}}+\class{t2}{u_j\frac{\partial u_i}{\partial x_j}}=\class{t3}{-\frac{1}{\rho}\frac{\partial p}{\partial x_i}}+\class{t4}{\nu\frac{\partial^2 u_i}{\partial x_j\,\partial x_j}}+\class{t5}{f_i}`,
    compLabel: 'Continuity (incompressible)',
    comp: String.raw`\frac{\partial u_i}{\partial x_i}=0`,
    partial: '∂/∂x_j, with the summation convention',
    friction: 'ν = μ/ρ',
    lines: 'one line standing for three (i = 1, 2, 3)',
    note: 'The free index i says "one equation for each direction". The repeated index j says "add up over j = 1, 2, 3". No vector identities are needed to manipulate it.',
  },
  {
    id: 'compact',
    who: 'current usage',
    short: 'Compact',
    title: 'Compact index form, today',
    when: 'Common in current papers and lecture notes',
    mom: String.raw`\class{t1}{\partial_t u_i}+\class{t2}{u_j\,\partial_j u_i}=\class{t3}{-\tfrac{1}{\rho}\,\partial_i p}+\class{t4}{\nu\,\partial_j\partial_j u_i}+\class{t5}{f_i}`,
    compLabel: 'Continuity (incompressible)',
    comp: String.raw`\partial_i u_i=0`,
    partial: '∂_j, short for ∂/∂x_j',
    friction: 'ν',
    lines: 'one line standing for three (i = 1, 2, 3)',
    note: 'The same physics as Euler\'s and Stokes\'s lines, in about a third of the ink. The price is that you must know the conventions before you can read it.',
  },
];

const KEY = [
  ['t1', 'time derivative'],
  ['t2', 'convective'],
  ['t3', 'pressure'],
  ['t4', 'friction'],
  ['t5', 'body force'],
];

export function mountFiveWays(fig, { settings }) {
  const f = frame(fig, { title: 'One equation, six ways of writing it', wide: true });
  // Render every stage once; switching stages only swaps prepared MathML.
  const rendered = STAGES.map((s) => ({ mom: tex(s.mom, { display: true }), comp: tex(s.comp, { display: true }) }));

  const key = h(
    'div.nt-key',
    { 'aria-label': 'Colour key for the terms' },
    KEY.map(([cls, label], k) => h('span.nt-key-item', h(`span.nt-sw.${cls}`), `${k + 1} ${label}`)),
  );
  const head = h('div.nt-stage-head');
  const momEl = h('div.nt-eqs');
  const compLabel = h('p.nt-comp-label');
  const compEl = h('div.nt-eqs');
  const note = h('p.nt-note');
  const card = h('div.nt-card', head, momEl, compLabel, compEl, note);
  const all = h('ol.nt-all', { hidden: true });
  STAGES.forEach((s, k) => {
    all.append(h('li', h('span.nt-all-title', s.title), h('div.nt-eqs', { html: rendered[k].mom })));
  });
  f.stage.append(key, card, all);

  const rWho = readout(f.readouts, { label: 'Written' });
  const rPartial = readout(f.readouts, { label: 'Partial derivative' });
  const rFriction = readout(f.readouts, { label: 'Friction term' });
  const rLines = readout(f.readouts, { label: 'Momentum equations on the page' });

  let k = 0;
  const show = (i, { announce = true } = {}) => {
    k = Math.max(0, Math.min(STAGES.length - 1, i));
    const s = STAGES[k];
    head.replaceChildren(h('span.nt-step', `${k + 1} / ${STAGES.length}`), h('strong', s.title), h('span.nt-when', s.when));
    momEl.innerHTML = rendered[k].mom;
    compLabel.textContent = s.compLabel;
    compEl.innerHTML = rendered[k].comp;
    note.textContent = s.note;
    rWho.set(s.who);
    rPartial.set(s.partial);
    rFriction.set(s.friction);
    rLines.set(s.lines);
    [...all.children].forEach((li, j) => li.classList.toggle('current', j === k));
    prev.disabled = k === 0;
    next.disabled = k === STAGES.length - 1;
    if (step.value !== k + 1) step.set(k + 1, { silent: true });
    settings?.set('notation-five-ways', s.id);
    if (announce) f.status.textContent = `Stage ${k + 1} of ${STAGES.length}: ${s.title}. ${s.when}.`;
  };

  const step = slider(f.controls, {
    label: 'Stage',
    min: 1,
    max: STAGES.length,
    step: 1,
    value: 1,
    fmt: (v) => `${Math.round(v)} · ${STAGES[Math.round(v) - 1].short}`,
    onInput: (v) => show(Math.round(v) - 1),
  });
  const prev = button(f.controls, { label: '◀ Earlier', onClick: () => show(k - 1) });
  const next = button(f.controls, { label: 'Later ▶', onClick: () => show(k + 1) });
  toggle(f.controls, {
    label: 'Colour the terms',
    checked: true,
    onChange: (on) => f.stage.classList.toggle('nt-plain', !on),
  });
  toggle(f.controls, {
    label: 'All six at once',
    checked: false,
    onChange: (on) => {
      all.hidden = !on;
      card.hidden = on;
      f.status.textContent = on ? 'Showing all six forms of the x-momentum equation, oldest first.' : '';
    },
  });

  const preset = fig.dataset.preset || settings?.get('notation-five-ways', 'euler') || 'euler';
  const start = STAGES.findIndex((s) => s.id === preset);
  show(start < 0 ? 0 : start, { announce: false });
}
