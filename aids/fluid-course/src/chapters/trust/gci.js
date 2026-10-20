// Chapter 15, section solution-verification: an error bar from three grids.
//   trust-gci  Richardson extrapolation and Roache's Grid Convergence Index
//              (verification.js gci3, the Celik et al. 2008 procedure) on
//              either the MMS solver's value u(1) from grids N, 2N, 4N, where
//              the exact answer is known so the error bar can be checked, or
//              a table of three results typed in by the reader.

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, toggle, segmented, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { gci3, mmsSolve, MMS_SOLUTIONS, GCI_EXAMPLES } from '../../sims/verification.js';
import { preset, pct, numberInput, hrule } from './common.js';

const EXACT = MMS_SOLUTIONS['sine-exp'].u(1);
const TABLES = {
  'celik-reattachment': GCI_EXAMPLES[0],
  'celik-velocity-p-lt-1': GCI_EXAMPLES[1],
  'celik-velocity-oscillatory': GCI_EXAMPLES[2],
  divergent: { id: 'divergent', label: 'Made-up: the differences grow', N: [4000, 2000, 1000], dim: 1, f: [1.0, 1.1, 1.15], printed: null },
};
const TABLE_NAMES = [
  ['celik-reattachment', 'Celik et al.: reattachment length'],
  ['celik-velocity-p-lt-1', 'Celik et al.: velocity, p < 1'],
  ['celik-velocity-oscillatory', 'Celik et al.: velocity, oscillatory'],
  ['divergent', 'Made-up: divergent'],
  ['own', 'Your own numbers'],
];
const PRESETS = {
  default: { mode: 'solver', N: 10, bug: false, fourth: false },
  'false-convergence': { mode: 'solver', N: 6, bug: true, fourth: false },
  'pre-asymptotic': { mode: 'solver', N: 20, bug: true, fourth: false },
  celik: { mode: 'table', table: 'celik-reattachment' },
  'celik-p-lt-1': { mode: 'table', table: 'celik-velocity-p-lt-1' },
  'celik-oscillatory': { mode: 'table', table: 'celik-velocity-oscillatory' },
  divergent: { mode: 'table', table: 'divergent' },
};
const CURVE = 121;
const u1 = (n, bug) => mmsSolve({ n, bugs: bug ? ['bc-first-order'] : [] }).u[n];

export function mountGci(fig) {
  const P = { N: 10, bug: false, fourth: false, table: 'celik-reattachment', ...preset(fig, PRESETS) };
  const f = frame(fig, { title: 'Three grids, one error bar', wide: true });
  const plot = new Plot(f.stage, {
    x: { label: 'grid spacing h', min: 0 },
    y: { label: 'u(1)', fmt: (v) => fmt(v, 6) },
    aspect: 1.5,
    label: 'The three grid results against grid spacing, the Richardson curve through them, the extrapolated value at h = 0 and the GCI band around the finest result',
  });

  const modeSeg = segmented(f.controls, {
    label: 'Results from',
    options: [['solver', 'the MMS solver (exact answer known)'], ['table', 'a table of three results']],
    value: P.mode,
    onChange: () => {
      showMode();
      update();
    },
  });
  // Solver controls.
  const nS = slider(f.controls, { label: 'coarsest grid N (grids N, 2N, 4N)', min: 4, max: 32, step: 1, value: P.N, fmt: (v) => String(Math.round(v)), onInput: () => update() });
  const bugT = toggle(f.controls, { label: 'First-order bug at the boundary', checked: P.bug, onChange: () => update() });
  const fourthT = toggle(f.controls, { label: 'Check with a fourth grid, 8N', checked: P.fourth, onChange: () => update() });
  // Table controls.
  const tableSel = select(f.controls, {
    label: 'Example',
    options: TABLE_NAMES,
    value: P.table,
    onChange: (v) => {
      if (v !== 'own') loadTable(TABLES[v]);
      update();
    },
  });
  const tableBox = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px 12px', flexBasis: '100%' } });
  f.controls.append(tableBox);
  const own = () => {
    tableSel.set('own', { silent: true });
    update();
  };
  const fIn = [0, 1, 2].map((k) => numberInput(tableBox, { label: `f${'₁₂₃'[k]}${k === 0 ? ' (finest)' : k === 2 ? ' (coarsest)' : ''}`, value: 0, onChange: own }));
  const NIn = [0, 1, 2].map((k) => numberInput(tableBox, { label: `cells N${'₁₂₃'[k]}`, value: 0, step: 1, width: '7em', onChange: own }));
  const dimSel = select(tableBox, { label: 'dimensions', options: [['1', '1'], ['2', '2'], ['3', '3']], value: '2', onChange: own });

  const pR = readout(f.readouts, { label: 'observed order p' });
  const clsR = readout(f.readouts, { label: 'convergence' });
  const extR = readout(f.readouts, { label: 'extrapolated f₀' });
  const gciR = readout(f.readouts, { label: 'GCI on the finest grid' });
  const trueR = readout(f.readouts, { label: 'true error of the finest grid' });
  const inR = readout(f.readouts, { label: 'truth inside the band?' });
  const nextR = readout(f.readouts, { label: 'p from grids 2N, 4N, 8N' });
  const printedR = readout(f.readouts, { label: 'printed by Celik et al.' });
  const solverOnly = [trueR, inR].map((r) => [r.el, r.el.previousElementSibling]).flat();

  const cx = new Float64Array(CURVE);
  const cy = new Float64Array(CURVE);
  const px = new Float64Array(3);
  const py = new Float64Array(3);

  function loadTable(T) {
    T.f.forEach((v, k) => fIn[k].set(v, { silent: true }));
    T.N.forEach((v, k) => NIn[k].set(v, { silent: true }));
    dimSel.set(String(T.dim), { silent: true });
  }
  function showMode() {
    const solver = modeSeg.value === 'solver';
    for (const c of [nS, bugT, fourthT]) c.el.hidden = !solver;
    tableSel.el.hidden = solver;
    tableBox.hidden = solver;
    for (const el of solverOnly) el.hidden = !solver;
  }
  if (P.mode === 'table') loadTable(TABLES[P.table]);
  else loadTable(TABLES['celik-reattachment']);
  showMode();

  function update() {
    const solver = modeSeg.value === 'solver';
    let g;
    let fs;
    let hsAbs;
    let next = null;
    let f4 = NaN;
    const N = Math.round(nS.value);
    const bug = bugT.value;
    if (solver) {
      fs = [u1(4 * N, bug), u1(2 * N, bug), u1(N, bug)];
      hsAbs = [1 / (4 * N), 1 / (2 * N), 1 / N];
      g = gci3({ f: fs, h: hsAbs });
      if (fourthT.value) {
        f4 = u1(8 * N, bug);
        next = gci3({ f: [f4, fs[0], fs[1]], h: [1 / (8 * N), 1 / (4 * N), 1 / (2 * N)] });
      }
    } else {
      fs = fIn.map((c) => c.value);
      const Ns = NIn.map((c) => c.value);
      const dim = Number(dimSel.value);
      if (!(Ns[0] > Ns[1] && Ns[1] > Ns[2] && Ns[2] > 0) || fs.some((v) => !Number.isFinite(v))) {
        f.status.textContent = 'Give three results with N₁ > N₂ > N₃ > 0 (grid 1 is the finest).';
        return;
      }
      g = gci3({ f: fs, N: Ns, dim });
      hsAbs = [1, g.r21, g.r21 * g.r32];
    }
    const h1 = hsAbs[0];
    const h3 = hsAbs[2];
    for (let k = 0; k < 3; k++) {
      px[k] = hsAbs[k];
      py[k] = fs[k];
    }
    // Richardson curve f0 + (f1 - f0)(h/h1)^p, drawn only where that model
    // holds (monotone convergence).
    const curveOk = g.valid && g.convergence === 'monotone' && Number.isFinite(g.fExt21);
    for (let i = 0; i < CURVE; i++) {
      const hh = (i / (CURVE - 1)) * h3;
      cx[i] = hh;
      cy[i] = curveOk ? g.fExt21 + (fs[0] - g.fExt21) * (hh / h1) ** g.p : NaN;
    }
    const band = g.valid ? g.gciFine21 * Math.abs(fs[0]) : NaN;
    const lo = Math.min(...fs, solver ? EXACT : Infinity, Number.isFinite(g.fExt21) ? g.fExt21 : Infinity, Number.isFinite(band) ? fs[0] - band : Infinity, Number.isFinite(f4) ? f4 : Infinity);
    const hi = Math.max(...fs, solver ? EXACT : -Infinity, Number.isFinite(g.fExt21) ? g.fExt21 : -Infinity, Number.isFinite(band) ? fs[0] + band : -Infinity, Number.isFinite(f4) ? f4 : -Infinity);
    plot.setAxes({ x: { label: solver ? 'grid spacing h' : 'grid spacing h / h₁', min: 0, max: h3 * 1.06 } });
    plot.draw(
      [
        { x: cx, y: cy, color: 's1', width: 1.6, dash: [6, 4], label: 'Richardson curve', hover: false },
        { x: px, y: py, color: 's1', width: 0, points: 5, label: 'grids N, 2N, 4N' },
        Number.isFinite(f4) ? { x: [1 / (8 * N)], y: [f4], color: 's2', width: 0, points: 5, label: 'fourth grid, 8N' } : null,
        g.valid && Number.isFinite(g.fExt21) ? { x: [0], y: [g.fExt21], color: 's3', width: 0, points: 6, label: 'extrapolated f₀' } : null,
      ],
      {
        // Head-room above the highest mark for the 'exact u(1)' label.
        yExtent: [lo, hi + 0.1 * (hi - lo || Math.abs(hi) * 1e-3)],
        under(ctx, tx, ty, area, pal) {
          if (!Number.isFinite(band)) return;
          const y0 = ty(fs[0] + band);
          const y1 = ty(fs[0] - band);
          ctx.fillStyle = pal.css('accent', 0.16);
          ctx.fillRect(area.x0, Math.min(y0, y1) - 0.5, area.x1 - area.x0, Math.max(1, Math.abs(y1 - y0)) + 1);
          ctx.strokeStyle = pal.css('accent', 0.9);
          ctx.lineWidth = 2;
          ctx.beginPath();
          const xb = tx(h1);
          ctx.moveTo(xb, y0);
          ctx.lineTo(xb, y1);
          ctx.stroke();
        },
        extra(ctx, tx, ty, area, pal) {
          if (solver) hrule(ctx, ty, area, pal, EXACT, 'exact u(1)', { token: 'ink', dash: [2, 3] });
        },
      },
    );

    // Readouts.
    const fmtP = (q) => (Number.isFinite(q.p) ? q.p.toFixed(q.p < 10 ? 2 : 1) : '–');
    pR.set(fmtP(g));
    clsR.set(g.convergence, g.convergence === 'monotone' ? '' : 'bad');
    extR.set(Number.isFinite(g.fExt21) && g.valid ? fmt(g.fExt21, 7) : '–');
    gciR.set(g.valid ? `± ${pct(g.gciFine21)}` : 'undefined', g.valid ? '' : 'bad');
    const trueErr = Math.abs(fs[0] - EXACT) / EXACT;
    const inside = g.valid && trueErr <= g.gciFine21;
    if (solver) {
      trueR.set(pct(trueErr));
      inR.set(g.valid ? (inside ? 'yes' : `no: ${fmt(trueErr / g.gciFine21, 2)} × the band`) : '–', g.valid ? (inside ? 'good' : 'bad') : '');
    }
    nextR.el.hidden = nextR.el.previousElementSibling.hidden = !next;
    if (next) nextR.set(`${fmtP(next)} (${next.convergence})`, next.convergence === 'monotone' && Math.abs(next.p - g.p) < 0.3 ? '' : 'bad');
    const T = !solver && TABLES[tableSel.value];
    const printed = T && T.printed;
    printedR.el.hidden = printedR.el.previousElementSibling.hidden = !printed;
    if (printed) printedR.set(`p = ${printed.p}, f₀ = ${printed.fExt21}, GCI ${printed.gciFine21} %`);

    // Narration.
    let msg;
    if (!g.valid) {
      msg =
        g.convergence === 'divergent'
          ? `Divergent: the change from grid 2 to grid 1 (${sci(Math.abs(fs[1] - fs[0]), 2)}) is not smaller than the change from grid 3 to grid 2 (${sci(Math.abs(fs[2] - fs[1]), 2)}). These grids are not converging, so there is no error bar to give. Refine further, or look for a bug.`
          : 'The two finest results are identical, so the observed order is infinite and the procedure breaks down. Check with a fourth grid.';
    } else if (g.convergence === 'oscillatory') {
      msg = `Oscillatory: the results zig-zag as h shrinks, so the model f = f₀ + C hᵖ does not hold. Celik et al. still report a GCI (± ${pct(g.gciFine21)}) using |p|, but treat it as a rough guide.${next ? ` The next triple gives p = ${fmtP(next)} (${next.convergence}).` : ''}`;
    } else if (solver) {
      const extBetter = Math.abs(g.fExt21 - EXACT) < Math.abs(fs[0] - EXACT);
      if (!inside)
        msg = `False convergence. Grids 2N and 4N agree to ${pct(Math.abs(fs[0] - fs[1]) / fs[0])}, so p comes out at ${fmtP(g)} and the band shrinks to ± ${pct(g.gciFine21)}. The finest result is really off by ${pct(trueErr)}, ${fmt(trueErr / g.gciFine21, 2)} times the band. An observed order far above the design order (2) is the warning.${next ? ` The fourth grid gives the game away: the next triple is ${next.convergence}, p = ${fmtP(next)}.` : ' Switch on the fourth grid.'}`;
      else if (Math.abs(g.p - 2) > 0.5)
        msg = `Not in the asymptotic range: p = ${fmtP(g)}, far from the design order 2. The band (± ${pct(g.gciFine21)}) does contain the truth, but only because a small p makes it wide, and the extrapolated value is ${extBetter ? 'better' : 'worse'} than the finest grid (off by ${pct(Math.abs(g.fExt21 - EXACT) / EXACT)}).`;
      else
        msg = `In the asymptotic range: p = ${fmtP(g)}, close to the design order 2. The GCI says the finest grid is within ± ${pct(g.gciFine21)} of the grid-converged answer; its true error is ${pct(trueErr)}, and the extrapolated value is off by only ${pct(Math.abs(g.fExt21 - EXACT) / EXACT)}.`;
    } else {
      msg = `Monotone convergence at p = ${fmtP(g)} (refinement ratios ${fmt(g.r21, 3)} and ${fmt(g.r32, 3)}). Report the finest result as ${fmt(fs[0], 6)} ± ${pct(g.gciFine21)}.${printed ? ' The printed values beside it come from the paper: they should agree.' : ''}`;
    }
    f.status.textContent = msg;
  }
  update();
}
