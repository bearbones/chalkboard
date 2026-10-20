// shocks-pstar: the exact Riemann solver for the Euler equations, as Newton
// iteration on the star-pressure function f(p) = f_L(p) + f_R(p) + u_R − u_L
// (Toro 2009 ch. 4). Left: f(p) on a log p axis with the Newton tangents
// and iterates, revealed one step at a time from riemann.js solveRiemann.
// Right: the wave fan in the x–t plane from the converged solution (shock
// lines, rarefaction fans, the contact). Readouts: iterate, residual,
// relative change, p*, u*, wave types, and the iteration count of every
// starting guess on this test.
//
// data-preset: a TORO_TESTS id ('test1' … 'test5'), optionally ':' + a
// GUESSES id, e.g. 'test2:pvrs'.

import { fmt } from '../../kit/dom.js';
import { frame, select, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { TORO_TESTS, GUESSES, solveRiemann, exactRiemann, starFunction, makeRiemannSolution } from '../../sims/riemann.js';

const NP = 320; // samples of f(p)
const KCAP = 64; // iterates kept
const FAN = 7; // rays drawn inside a rarefaction fan
const STEP_S = 0.7; // seconds per iterate when playing

const SHORT = { test1: 'Test 1: Sod', test2: 'Test 2: 123 (near vacuum)', test3: 'Test 3: left blast', test4: 'Test 4: right blast', test5: 'Test 5: colliding shocks' };
const GSHORT = { adaptive: 'adaptive', pvrs: 'PV', trrs: 'TR', tsrs: 'TS', mean: 'mean' };

export function mountPstar(fig, { signal }) {
  const [tId, gId] = (fig.dataset.preset || 'test1').split(':');
  const cfg = { test: TORO_TESTS.some((t) => t.id === tId) ? tId : 'test1', guess: GUESSES.some((g) => g.id === gId) ? gId : 'adaptive' };
  const f = frame(fig, { title: 'Solving the Riemann problem: Newton on f(p*) = 0', wide: true });
  f.stage.classList.add('cols');
  const colA = document.createElement('div');
  const colB = document.createElement('div');
  f.stage.append(colA, colB);

  const fp = new Plot(colA, { x: { label: 'pressure p (log scale)', log: true }, y: { label: 'f(p)' }, aspect: 1.25, minHeight: 220, label: 'The star-pressure function f(p) with Newton tangents and iterates; its root is p*' });
  const fan = new Plot(colB, { x: { label: 'x', min: 0, max: 1 }, y: { label: 't', min: 0 }, aspect: 1.25, minHeight: 220, legend: false, hover: false, label: 'The wave fan of the solution in the x–t plane: shocks, rarefaction fans and the contact' });

  // ---- buffers
  const pp = new Float64Array(NP), ff = new Float64Array(NP), zero = new Float64Array(NP);
  const kp = new Float64Array(KCAP), kf = new Float64Array(KCAP), kd = new Float64Array(KCAP), kc = new Float64Array(KCAP);
  const shownP = new Float64Array(KCAP).fill(NaN), shownF = new Float64Array(KCAP).fill(NaN);
  const PF = { f: 0, df: 0, fL: 0, fR: 0 };
  let nIt = 0, shown = 0, sol = makeRiemannSolution(), test = null, acc = 0;

  // ---- controls
  select(f.controls, { label: 'Problem', options: TORO_TESTS.map((t) => [t.id, SHORT[t.id] || t.name]), value: cfg.test, onChange: (v) => ((cfg.test = v), build()) });
  select(f.controls, { label: 'Starting guess', options: GUESSES.map((g) => [g.id, g.name]), value: cfg.guess, onChange: (v) => ((cfg.guess = v), build()) });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Iterate' });
  button(f.controls, { label: 'One step', onClick: () => reveal(shown + 1) });
  button(f.controls, { label: 'Converge', onClick: () => (loop.pause(), reveal(nIt)) });
  button(f.controls, { label: 'Back to the guess', onClick: () => (loop.pause(), reveal(1)) });

  // ---- readouts
  const rK = readout(f.readouts, { label: 'iterate k' });
  const rP = readout(f.readouts, { label: 'p_k' });
  const rF = readout(f.readouts, { label: 'residual f(p_k)' });
  const rC = readout(f.readouts, { label: 'relative change', title: '2|p_k − p_{k−1}|/(p_k + p_{k−1}); stop below 10⁻⁸ (Toro’s test)' });
  const rPs = readout(f.readouts, { label: 'p* (converged)' });
  const rUs = readout(f.readouts, { label: 'u* (contact speed)' });
  const rW = readout(f.readouts, { label: 'waves (left, right)' });
  const rAll = readout(f.readouts, { label: 'Newton steps by guess', title: 'Iterations each starting guess needs on this problem' });

  function build() {
    test = TORO_TESTS.find((t) => t.id === cfg.test);
    const L = test.L, R = test.R;
    // Iterates from the kernel's generator.
    const gen = solveRiemann(L, R, { guess: cfg.guess });
    nIt = 0;
    for (;;) {
      const r = gen.next();
      if (r.done) {
        sol = r.value;
        break;
      }
      const e = r.value;
      if (e.t === 'iter' && nIt < KCAP) {
        kp[nIt] = e.p;
        kf[nIt] = e.residual;
        kd[nIt] = e.dresidual;
        kc[nIt] = e.change;
        nIt++;
      }
    }
    // The curve f(p) over a range that holds the root and every iterate.
    let lo = sol.pStar, hi = sol.pStar;
    for (let k = 0; k < nIt; k++) {
      if (kp[k] < lo) lo = kp[k];
      if (kp[k] > hi) hi = kp[k];
    }
    lo = Math.min(lo, test.L.p, test.R.p) / 4;
    hi = Math.max(hi, test.L.p, test.R.p) * 4;
    const a = Math.log(lo), b = Math.log(hi);
    for (let k = 0; k < NP; k++) {
      pp[k] = Math.exp(a + ((b - a) * k) / (NP - 1));
      ff[k] = starFunction(sol, pp[k], PF);
    }
    fp.setAxes({ x: { min: lo, max: hi } });
    fp.draw([
      { x: pp, y: zero, color: 'muted', width: 1, label: 'f = 0', hover: false, legend: false },
      { x: pp, y: ff, color: 's1', width: 2.5, label: 'f(p) = f_L + f_R + Δu' },
      { x: shownP, y: shownF, color: 's2', width: 0, points: 4, label: 'Newton iterates' },
    ], { extra: drawTangents });
    fan.setAxes({ y: { max: test.t } });
    fan.draw([], { extra: drawFan });
    // Iteration counts for every guess (each a full run of the kernel).
    let s = '';
    for (const g of GUESSES) {
      const so = exactRiemann(L, R, { guess: g.id });
      s += `${s ? ' · ' : ''}${GSHORT[g.id] || g.id} ${so.iterations}`;
    }
    rAll.set(s);
    acc = 0;
    reveal(1);
  }

  // Show iterates 0 … m − 1.
  function reveal(m) {
    shown = Math.max(1, Math.min(nIt, m));
    for (let k = 0; k < KCAP; k++) {
      shownP[k] = k < shown ? kp[k] : NaN;
      shownF[k] = k < shown ? kf[k] : NaN;
    }
    show();
  }

  function tick(dt) {
    acc += dt;
    if (acc < STEP_S) return;
    acc = 0;
    if (shown >= nIt) return loop.pause();
    reveal(shown + 1);
  }

  function drawTangents(ctx, tx, ty, area, pal) {
    ctx.strokeStyle = pal.css('s2', 0.8);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    for (let k = 0; k + 1 < shown; k++) {
      // tangent at p_k meets f = 0 at the next iterate (before damping)
      const pNext = kp[k] - kf[k] / kd[k];
      const pEnd = pNext > 0 ? pNext : kp[k + 1];
      ctx.moveTo(tx(kp[k]), ty(kf[k]));
      ctx.lineTo(tx(pEnd), ty(0));
      ctx.moveTo(tx(kp[k + 1]), ty(0));
      ctx.lineTo(tx(kp[k + 1]), ty(kf[k + 1]));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    if (shown === nIt) {
      ctx.strokeStyle = pal.css('accent');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tx(sol.pStar), ty(0), 7, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  function drawFan(ctx, tx, ty, area, pal) {
    const T = test.t, x0 = test.x0;
    const ray = (s) => {
      ctx.moveTo(tx(x0), ty(0));
      ctx.lineTo(tx(x0 + s * T), ty(T));
    };
    const done = shown === nIt;
    ctx.globalAlpha = done ? 1 : 0.35;
    for (const w of [sol.left, sol.right]) {
      if (w.type === 'shock') {
        ctx.strokeStyle = pal.css('s1');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ray(w.speed);
        ctx.stroke();
      } else {
        ctx.strokeStyle = pal.css('s3');
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let j = 0; j <= FAN; j++) ray(w.head + ((w.tail - w.head) * j) / FAN);
        ctx.stroke();
      }
    }
    ctx.strokeStyle = pal.css('s2');
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ray(sol.contact);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = pal.css('muted');
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(done ? 'thick: shock · fan: rarefaction · dashed: contact' : 'converge to draw the waves', area.x0 + 6, area.y0 + 4);
  }

  function show() {
    fp.render();
    fan.render();
    const k = shown - 1;
    rK.set(String(k));
    rP.set(fmt(kp[k], 6));
    rF.set(fmt(kf[k], 3), Math.abs(kf[k]) < 1e-8 ? 'good' : '');
    rC.set(k === 0 ? '–' : fmt(kc[k], 2), k > 0 && kc[k] <= 1e-8 ? 'good' : '');
    const done = shown === nIt;
    rPs.set(done ? fmt(sol.pStar, 6) : '…');
    rUs.set(done ? fmt(sol.uStar, 6) : '…');
    rW.set(done ? `${sol.left.type}, ${sol.right.type}` : '…');
    narrate(k, done);
  }

  function narrate(k, done) {
    let s;
    if (done) s = `Converged after ${sol.iterations} Newton steps from the ${GSHORT[cfg.guess] || cfg.guess} guess: p* = ${fmt(sol.pStar, 6)}. A ${sol.left.type} on the left and a ${sol.right.type} on the right.`;
    else if (k === 0) s = `The ${GSHORT[cfg.guess] || cfg.guess} guess p₀ = ${fmt(kp[0], 4)}. Each step follows the tangent of f down to f = 0.`;
    else s = `Step ${k}: p = ${fmt(kp[k], 6)}, residual ${fmt(kf[k], 2)}. Near the root the number of correct digits roughly doubles each step.`;
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  build();
}
