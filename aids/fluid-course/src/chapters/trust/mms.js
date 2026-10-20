// Chapter 15, section code-verification: the MMS lab.
//   trust-mms  plant a bug in a small boundary-value solver
//              (verification.js mmsSolve / mmsConvergence) and watch the
//              observed order of accuracy fall away from the design order.

import { h, sci } from '../../kit/dom.js';
import { frame, select, segmented, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { mmsSolve, mmsConvergence, MMS_SOLUTIONS, MMS_BUGS } from '../../sims/verification.js';
import { preset, clampLog, sci2, figTable } from './common.js';

const N0 = 10;
const LEVELS = 6; // N = 10, 20, ..., 320
const PRESETS = {
  default: { bug: 'none', solution: 'sine-exp', advection: 'central', show: '10' },
  bc: { bug: 'bc-first-order', solution: 'sine-exp', advection: 'central', show: '10' },
  'advection-typo': { bug: 'advection-half', solution: 'sine-exp', advection: 'central', show: '40' },
  'source-shift': { bug: 'source-shift', solution: 'sine-exp', advection: 'central', show: '10' },
  'diffusion-typo': { bug: 'diffusion-half', solution: 'sine-exp', advection: 'central', show: '40' },
  'weak-solution': { bug: 'diffusion-half', solution: 'linear', advection: 'central', show: '10' },
  upwind: { bug: 'none', solution: 'sine-exp', advection: 'upwind', show: '10' },
};
const BUG_ORDER = ['none', 'bc-first-order', 'advection-half', 'source-shift', 'diffusion-half'];
const FINE = 201;

export function mountMms(fig) {
  const P = preset(fig, PRESETS);
  const f = frame(fig, { title: 'Manufactured solutions: does the code converge at its design order?', wide: true });
  // The plots get their own two-column grid: on the stage itself the
  // full-width table would keep a third auto-fit track alive at desktop width.
  const left = h('div');
  const right = h('div');
  f.stage.append(h('div', { style: { display: 'grid', gap: '10px', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' } }, left, right));
  const conv = new Plot(left, {
    x: { label: 'grid spacing h', log: true, min: 0.002, max: 0.2, fmt: (v) => sci(v, 2) },
    y: { label: 'max error', log: true, fmt: (v) => sci(v, 2) },
    aspect: 1.25,
    label: 'Maximum error against grid spacing on log–log axes, with reference lines of slope 1 and 2',
  });
  const sol = new Plot(right, {
    x: { label: 'x', min: 0, max: 1 },
    y: { label: 'u' },
    aspect: 1.25,
    label: 'The manufactured solution as a line and the computed solution as dots on the grid shown',
  });
  const code = h('p', { style: { margin: '0', fontSize: '0.85rem', color: 'var(--muted)' } });
  const tbl = figTable(['N', ['max error', 'num'], ['observed order', 'num']], [0, 1, 2, 3, 4, 5], { label: 'Refinement study: error and observed order on each grid' });
  f.stage.append(code, tbl.el);

  const bugSel = select(f.controls, { label: 'Bug in the code', options: BUG_ORDER.map((id) => [id, MMS_BUGS[id].name]), value: P.bug, onChange: () => update() });
  const solSeg = segmented(f.controls, {
    label: 'Manufactured solution',
    options: [['sine-exp', '1 + e⁻ˣ sin 3x'], ['linear', '1 + 2x']],
    value: P.solution,
    onChange: () => update(),
  });
  const advSeg = segmented(f.controls, { label: 'Advection term', options: [['central', 'central (2nd order)'], ['upwind', 'upwind (1st order)']], value: P.advection, onChange: () => update() });
  const showSeg = segmented(f.controls, { label: 'Grid shown in the second plot', options: [['10', 'N = 10'], ['20', 'N = 20'], ['40', 'N = 40']], value: P.show, onChange: () => update() });

  const ordR = readout(f.readouts, { label: 'observed order, N = 160 → 320' });
  const desR = readout(f.readouts, { label: 'design order' });
  const errR = readout(f.readouts, { label: 'max error at N = 320' });
  const verR = readout(f.readouts, { label: 'verdict' });

  const hs = new Float64Array(LEVELS);
  const es = new Float64Array(LEVELS);
  const r1 = new Float64Array(LEVELS);
  const r2 = new Float64Array(LEVELS);
  const xf = new Float64Array(FINE);
  const uf = new Float64Array(FINE);
  for (let i = 0; i < FINE; i++) xf[i] = i / (FINE - 1);

  function update() {
    const bug = bugSel.value;
    const solution = solSeg.value;
    const advection = advSeg.value;
    const bugs = bug === 'none' ? [] : [bug];
    const res = mmsConvergence({ n0: N0, levels: LEVELS, ratio: 2, solution, advection, bugs });
    const exactEverywhere = res.errMax.every((e) => e < 1e-12);
    for (let k = 0; k < LEVELS; k++) {
      hs[k] = res.h[k];
      es[k] = clampLog(res.errMax[k], 1e-16);
    }
    // Reference lines start a factor 3 above the coarsest error so that a
    // measured line of the same slope runs parallel to them, not on top.
    const e0 = 3 * (exactEverywhere ? 1e-2 : es[0]);
    for (let k = 0; k < LEVELS; k++) {
      r1[k] = e0 * (hs[k] / hs[0]);
      r2[k] = e0 * (hs[k] / hs[0]) ** 2;
    }
    conv.draw([
      { x: hs, y: r1, color: 'muted', width: 1.3, dash: [7, 4], label: 'slope 1', hover: false },
      { x: hs, y: r2, color: 'muted', width: 1.3, dash: [2, 3], label: 'slope 2', hover: false },
      { x: hs, y: es, color: 's1', width: 2.5, points: 4.5, label: 'measured' },
    ]);

    const n = Number(showSeg.value);
    const r = mmsSolve({ n, solution, advection, bugs });
    const S = MMS_SOLUTIONS[solution];
    for (let i = 0; i < FINE; i++) uf[i] = S.u(xf[i]);
    sol.draw([
      { x: xf, y: uf, color: 'ink', width: 1.6, dash: [6, 4], label: 'manufactured uₘ' },
      { x: r.x, y: r.u, color: 's1', width: 0, points: 3.8, label: `computed, N = ${n}` },
    ]);

    for (let k = 0; k < LEVELS; k++) {
      const row = res.rows[k];
      tbl.set(k, 0, String(row.n));
      tbl.set(k, 1, sci2(row.errMax));
      tbl.set(k, 2, k === 0 ? '' : exactEverywhere ? '–' : row.order.toFixed(2));
    }

    const design = advection === 'upwind' ? 1 : 2;
    const pFin = res.orders.at(-1);
    ordR.set(exactEverywhere ? 'none (exact)' : pFin.toFixed(2), exactEverywhere ? '' : Math.abs(pFin - design) < 0.1 ? 'good' : 'bad');
    desR.set(String(design));
    errR.set(sci2(res.errMax.at(-1)));
    const B = MMS_BUGS[bug];
    code.replaceChildren();
    if (bug !== 'none') code.append('The line as coded: ', h('code', B.buggy), '. It should read: ', h('code', B.correct), '.');
    else if (advection === 'upwind') code.append('No bug: the advection term is deliberately first-order upwind, ', h('code', 'a * (u[i] - u[i-1]) / h'), '.');
    else code.append('No bug: every line matches the scheme on paper.');

    let verdict;
    let msg;
    const orders = res.orders.map((p) => p.toFixed(2)).join(', ');
    if (exactEverywhere) {
      verdict = 'test is blind';
      msg = `The error is round-off (below ${sci(Math.max(...res.errMax) * 1.01 + 1e-300, 1)}) on every grid${bug !== 'none' ? ', even with the bug in place' : ''}. The manufactured solution is linear, so u″ = 0 and every difference formula is exact for it: a bug in the diffusion term or in the boundary closure leaves no trace. Pick a solution that exercises every term.`;
      verR.set(verdict, 'bad');
    } else if (Math.abs(pFin - design) < 0.1) {
      verdict = design === 2 ? 'passes' : 'passes (order 1 by design)';
      msg = `Observed orders ${orders}: the error falls by ${design === 2 ? '4' : '2'} each time h halves, as designed. ${advection === 'upwind' ? 'Upwind is a first-order scheme, so order 1 is a pass here: the test checks the code against its own design, not against a wish.' : 'This is what a correct code looks like.'}`;
      verR.set(verdict, 'good');
    } else if (pFin < 0.2) {
      verdict = 'fails: no convergence';
      msg = `Observed orders ${orders}: the error stalls at ${sci2(res.errMax.at(-1))}. The code is solving a different equation, so refining the grid only converges to the wrong answer.`;
      verR.set(verdict, 'bad');
    } else {
      verdict = `fails: order ${pFin.toFixed(1)}, not ${design}`;
      msg =
        bug === 'bc-first-order'
          ? `Observed orders ${orders}. The order wanders before settling at 1, and on the coarsest grid this buggy code has a smaller error (${sci2(res.errMax[0])}) than the correct one (${sci2(mmsSolve({ n: N0, solution, advection }).errMax)}). One wrong boundary row pollutes the whole solution.`
          : `Observed orders ${orders}: the error converges, but only at first order. A test that only checks "the error gets smaller" would pass this bug.`;
      verR.set(verdict, 'bad');
    }
    f.status.textContent = msg;
  }
  update();
}
