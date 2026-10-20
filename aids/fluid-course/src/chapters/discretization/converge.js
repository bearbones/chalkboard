// Chapter 6, sections convergence and richardson: two figures.
//   discretization-convergence  a log–log convergence study of an advection
//                               scheme (advection.js convergenceStudy, run in
//                               slices), with reference slopes and the
//                               observed order;
//   discretization-extrapolate  Richardson's deferred approach to the limit on
//                               a central difference and on polygons → π
//                               (verification.js richardsonExtrapolate).

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, segmented, readout, sliced } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { SCHEMES, convergenceStudy } from '../../sims/advection.js';
import { richardsonExtrapolate } from '../../sims/verification.js';
import { clampLog, digits, sci2, figTable, preset } from './common.js';

// ---------------------------------------------------------------------------
// discretization-convergence

const CONV_SCHEMES = ['upwind', 'lxf', 'lw', 'fromm', 'ftcs', 'downwind'];
const NS = [16, 32, 64, 128, 256, 512];
const CONV_PRESETS = {
  default: { scheme: 'lw', nu: 0.5, prof: 'sine', dt: '1' },
  upwind: { scheme: 'upwind', nu: 0.5, prof: 'sine', dt: '1' },
  ftcs: { scheme: 'ftcs', nu: 0.5, prof: 'sine', dt: '1' },
  'ftcs-dx2': { scheme: 'ftcs', nu: 0.5, prof: 'sine', dt: '2' },
  square: { scheme: 'lw', nu: 0.5, prof: 'square', dt: '1' },
  cfl: { scheme: 'lw', nu: 1.1, prof: 'sine', dt: '1' },
};

export function mountConvergence(fig, { signal }) {
  const P = preset(fig, CONV_PRESETS);
  const f = frame(fig, { title: 'A convergence study, one grid at a time' });
  const plot = new Plot(f.stage, {
    x: { label: 'cells n', log: true, min: 10, max: 1000, fmt: (v) => String(Math.round(v)) },
    y: { label: 'L¹ error at t = 1', log: true, fmt: (v) => sci(v, 2) },
    aspect: 1.7,
    label: 'Error against number of cells on log–log axes, with reference slopes of order 1 and 2',
  });
  const schemeSel = select(f.controls, { label: 'Scheme', options: CONV_SCHEMES.map((id) => [id, SCHEMES[id].name]), value: P.scheme, onChange: () => run() });
  const nuS = slider(f.controls, { label: 'Courant number ν on the coarsest grid', min: 0.1, max: 1.2, step: 0.05, value: P.nu, fmt: (v) => v.toFixed(2), onInput: () => run() });
  const profSel = select(f.controls, { label: 'Initial data', options: [['sine', 'sine wave'], ['gaussian', 'Gaussian'], ['square', 'square wave']], value: P.prof, onChange: () => run() });
  const dtSeg = segmented(f.controls, { label: 'Time step', options: [['1', 'Δt ∝ Δx'], ['2', 'Δt ∝ Δx²']], value: P.dt, onChange: () => run() });
  const ordR = readout(f.readouts, { label: 'order, 256 → 512' });
  const errR = readout(f.readouts, { label: 'error at n = 512' });
  const stepsR = readout(f.readouts, { label: 'time steps at n = 512' });
  const nuR = readout(f.readouts, { label: 'ν at n = 512' });

  const ex = new Float64Array(NS.length);
  const ey = new Float64Array(NS.length);
  const r1 = new Float64Array(NS.length);
  const r2 = new Float64Array(NS.length);
  let count = 0;
  let ctl = null;

  function drawPlot() {
    const e0 = count ? Math.min(clampLog(ey[0], 1e-300), 1e3) : 1;
    for (let k = 0; k < NS.length; k++) {
      // guides start a factor 0.4 below the first point, so they run parallel
      // to a converging curve instead of hiding under it
      r1[k] = 0.4 * e0 * (NS[0] / NS[k]);
      r2[k] = 0.4 * e0 * (NS[0] / NS[k]) ** 2;
    }
    plot.draw([
      { x: NS, y: r1, color: 'muted', width: 1.3, dash: [6, 4], label: 'slope −1', hover: false, fit: count === 0 },
      { x: NS, y: r2, color: 'muted', width: 1.3, dash: [2, 3], label: 'slope −2', hover: false, fit: count === 0 },
      { x: ex.subarray(0, count), y: ey.subarray(0, count), color: 's1', width: 2.5, points: 4.5, label: 'measured error' },
    ]);
  }

  let stopPrev = null;
  function run() {
    ctl?.abort();
    if (stopPrev) signal?.removeEventListener('abort', stopPrev);
    ctl = new AbortController();
    const local = ctl;
    const stop = () => local.abort();
    stopPrev = stop;
    signal?.addEventListener('abort', stop, { once: true });
    const scheme = schemeSel.value;
    const nu = nuS.value;
    const prof = profSel.value;
    const p = Number(dtSeg.value);
    count = 0;
    ordR.set('…');
    errR.set('…');
    stepsR.set('…');
    nuR.set('…');
    drawPlot();
    let announced = 0;
    function* driver() {
      const gen = convergenceStudy(scheme, nu, NS, prof, 1, { dtExponent: p });
      for (;;) {
        const r = gen.next();
        if (r.done) return r.value;
        const e = r.value;
        if (e.t === 'iter') {
          ex[count] = e.n;
          ey[count] = Number.isFinite(e.err) ? clampLog(e.err, 1e-300) : 1e300;
          count++;
          drawPlot();
          f.status.textContent = `Ran n = ${e.n} (${e.steps.toLocaleString('en-US')} steps): error ${sci2(e.err)}.`;
        } else if (e.t === 'op' && e.n !== announced) {
          announced = e.n;
          f.status.textContent = `Running n = ${e.n}…`;
        }
        yield;
      }
    }
    sliced(driver(), { budgetMs: 6, signal: local.signal })
      .then((res) => {
        signal?.removeEventListener('abort', stop);
        if (stopPrev === stop) stopPrev = null;
        report(res, scheme, p);
      })
      .catch(() => {});
  }

  function report(res, scheme, p) {
    const errs = res.errors;
    const o = res.orders.at(-1);
    const design = scheme === 'ftcs' && p === 2 ? 2 : SCHEMES[scheme].order;
    const exactAll = errs.every((e) => e < 1e-13);
    ordR.set(exactAll ? 'exact' : Number.isFinite(o) ? o.toFixed(2) : '–', !exactAll && Number.isFinite(o) && Math.abs(o - design) < 0.15 ? 'good' : o < 0 && !exactAll ? 'bad' : '');
    errR.set(sci2(errs.at(-1)), errs.at(-1) > errs[0] ? 'bad' : '');
    stepsR.set(res.steps.at(-1).toLocaleString('en-US'));
    nuR.set(fmt(res.nus.at(-1), 3));
    const grew = errs.at(-1) > 10 * errs[0] || !Number.isFinite(errs.at(-1));
    let k0 = -1;
    for (let k = 1; k < errs.length; k++) if (errs[k] > errs[k - 1] && k0 < 0) k0 = k;
    let msg;
    if (errs.every((e) => e < 1e-13)) msg = `Exact to round-off on every grid: at ν = 1 this scheme moves the data exactly one cell per step, so there is no error to converge.`;
    else if (grew && k0 > 1) msg = `Diverging: the error fell until n = ${NS[k0 - 1]}, then grew to ${sci2(errs.at(-1))}. Consistent but unstable, so refining makes it worse: the round-off that seeds the growth gets more steps to grow.`;
    else if (grew) msg = `Diverging from the start: the error grows as the grid is refined. This scheme is unstable at these settings.`;
    else if (Math.abs(o - design) < 0.15) msg = `Converging at order ${o.toFixed(2)}: the slope matches the design order ${design}.`;
    else if (o > design + 0.15) msg = `Converging at order ${o.toFixed(2)}, faster than the design order ${design}: at this ν the scheme's leading error term happens to vanish. Move ν and it drops back.`;
    else if (o > 0) msg = `Converging, but at order ${o.toFixed(2)}, below the design order ${design}${profSel.value === 'square' ? ': the jump in the data caps the order, whatever the scheme' : ''}.`;
    else msg = `Not converging: the error is not falling with n.`;
    f.status.textContent = msg;
  }
  drawPlot();
  run();
  return () => ctl?.abort();
}

// ---------------------------------------------------------------------------
// discretization-extrapolate

const LEVELS = 5;
const ROWS = 6;
const COLORS = ['s1', 's2', 's3', 's4', 's5'];
const DASHES = [null, [8, 4], [2, 4], [12, 4, 3, 4], [5, 3]];
const E_PRESETS = {
  default: { problem: 'derivative', start: 0.8 },
  pi: { problem: 'pi', start: 6 },
  floor: { problem: 'derivative', start: 0.05 },
};
const XD = 1;
const central = (hh) => (Math.sin(XD + hh) - Math.sin(XD - hh)) / (2 * hh);
const halfPerimeter = (n) => n * Math.sin(Math.PI / n);

export function mountExtrapolate(fig) {
  const P = preset(fig, E_PRESETS);
  const f = frame(fig, { title: 'Richardson extrapolation: defer the limit' });
  const plot = new Plot(f.stage, { x: { label: 'step h', log: true, fmt: (v) => sci(v, 2) }, y: { label: '|error|', log: true, fmt: (v) => sci(v, 2) }, aspect: 1.8, label: 'Error against step for the raw values and each level of extrapolation' });
  const tbl = figTable(['h', ['raw', 'num'], ['1 step', 'num'], ['2 steps', 'num'], ['3 steps', 'num'], ['4 steps', 'num']], [0, 1, 2, 3, 4, 5], { label: 'Correct digits in the Richardson table' });
  const tnote = h('p', { style: { margin: 0, fontSize: '0.85rem', color: 'var(--muted)' } }, 'Cells: correct significant digits. Each column cancels one more even power of h.');
  f.stage.append(tbl.el, tnote);
  const probSeg = segmented(f.controls, {
    label: 'Sequence',
    options: [['derivative', 'central difference of sin at 1'], ['pi', 'polygons → π']],
    value: P.problem,
    onChange: () => {
      startS.el.hidden = probSeg.value !== 'derivative';
      nSel.el.hidden = probSeg.value !== 'pi';
      draw();
    },
  });
  const startS = slider(f.controls, { label: 'largest step h₀', min: 0.01, max: 1.6, log: true, value: P.problem === 'derivative' ? P.start : 0.8, fmt: (v) => fmt(v, 2), onInput: () => draw() });
  const nSel = select(f.controls, { label: 'first polygon', options: [['3', 'triangle'], ['4', 'square'], ['6', 'hexagon']], value: P.problem === 'pi' ? String(P.start) : '6', onChange: () => draw() });
  startS.el.hidden = P.problem !== 'derivative';
  nSel.el.hidden = P.problem !== 'pi';
  const rawR = readout(f.readouts, { label: 'finest raw value' });
  const bestR = readout(f.readouts, { label: 'best extrapolated' });
  const slopeR = readout(f.readouts, { label: 'slopes per level' });

  const T = Array.from({ length: ROWS }, () => new Float64Array(LEVELS).fill(NaN));
  const hs = new Float64Array(ROWS);
  const lx = Array.from({ length: LEVELS }, (_, j) => new Float64Array(ROWS - j));
  const ly = Array.from({ length: LEVELS }, (_, j) => new Float64Array(ROWS - j));

  function draw() {
    const prob = probSeg.value;
    const exact = prob === 'pi' ? Math.PI : Math.cos(XD);
    for (let k = 0; k < ROWS; k++) {
      if (prob === 'pi') {
        const n = Number(nSel.value) * 2 ** k;
        hs[k] = 1 / n;
        T[k][0] = halfPerimeter(n);
      } else {
        hs[k] = startS.value / 2 ** k;
        T[k][0] = central(hs[k]);
      }
      for (let j = 1; j < LEVELS; j++) T[k][j] = k >= j ? richardsonExtrapolate(T[k][j - 1], T[k - 1][j - 1], 2, 2 * j) : NaN;
    }
    let best = { e: Infinity, k: 0, j: 0 };
    const slopes = [];
    for (let j = 0; j < LEVELS; j++) {
      for (let k = j; k < ROWS; k++) {
        lx[j][k - j] = hs[k];
        const e = Math.abs(T[k][j] - exact);
        ly[j][k - j] = clampLog(e, 1e-17);
        if (e < best.e) best = { e, k, j };
      }
      // slope from the two coarsest entries of each column but the last
      // (the finest entries of the last columns sit on the round-off floor)
      if (j < LEVELS - 1) slopes.push(Math.log2(ly[j][0] / ly[j][1]));
    }
    for (let k = 0; k < ROWS; k++) {
      tbl.set(k, 0, prob === 'pi' ? `n = ${Math.round(1 / hs[k])}` : fmt(hs[k], 3));
      for (let j = 0; j < LEVELS; j++) {
        const v = T[k][j];
        tbl.set(k, j + 1, Number.isFinite(v) ? digits(Math.abs(v - exact) / Math.abs(exact)).toFixed(1) : '');
      }
    }
    plot.draw(
      Array.from({ length: LEVELS }, (_, j) => ({ x: lx[j], y: ly[j], color: COLORS[j], width: 2, dash: DASHES[j], points: 3, label: j === 0 ? 'raw' : `${j} step${j > 1 ? 's' : ''}` })),
    );
    const raw = T[ROWS - 1][0];
    rawR.set(`${fmt(raw, 10)} (${digits(Math.abs(raw - exact) / exact).toFixed(1)} digits)`);
    const bv = T[best.k][best.j];
    bestR.set(`${fmt(bv, 12)} (${digits(best.e / exact).toFixed(1)} digits)`, 'good');
    slopeR.set(slopes.map((s) => s.toFixed(1)).join(', '));
    const floorHit = digits(best.e / exact) < 14.5 && (best.j < LEVELS - 1 || best.k < ROWS - 1);
    f.status.textContent =
      prob === 'pi'
        ? `The ${Math.round(1 / hs[ROWS - 1])}-gon alone gives ${digits(Math.abs(raw - exact) / exact).toFixed(1)} digits of π; combining the six polygons gives ${digits(best.e / exact).toFixed(1)}.`
        : floorHit
          ? `Extrapolation stops paying once the entries reach the round-off floor: the best value sits at ${best.j} step${best.j === 1 ? '' : 's'}, not at the corner of the table.`
          : `Each extrapolation removes the next even power of h, so the slopes step up by 2: ${slopes.map((s) => s.toFixed(1)).join(', ')}.`;
  }
  draw();
}
