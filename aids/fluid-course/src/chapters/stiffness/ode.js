// stiffness-ode: a stiff ODE (Prothero–Robinson, or a 2×2 system with
// eigenvalues -1 and -1000) integrated with six methods at a chosen step h.
// The whole run is computed when a control changes; the figure shows the
// solution against the exact one and the error on a log scale.

import { frame, slider, select, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { STABILITY_METHODS, stabilityAbs, stabilityValue, createProblem, createIntegrator, resetIntegrator, step as odeStep, fillExact as odeExact } from '../../sims/stiff.js';
import { presetFor, num } from './common.js';

const PRESETS = {
  default: { problem: 'pr', method: 'euler', h: 0.0019 },
  'euler-broken': { problem: 'pr', method: 'euler', h: 0.0021 },
  'euler-fixed': { problem: 'pr', method: 'euler', h: 0.0019 },
  'big-steps': { problem: 'pr', method: 'implicit-euler', h: 0.1 },
  'trapezoid-ringing': { problem: 'pr2', method: 'trapezoid', h: 0.1 },
  'two-scales': { problem: '2x2', method: 'euler', h: 0.0021 },
};
const PROBLEMS = [
  ['pr', 'Prothero–Robinson, y₀ = 1'],
  ['pr2', 'Prothero–Robinson, y₀ = 2'],
  ['2x2', 'Two time scales (2×2)'],
];
const METHODS = ['euler', 'heun', 'rk4', 'implicit-euler', 'trapezoid', 'bdf2'].map((k) => [k, STABILITY_METHODS[k].name]);
const FAST = -1000;
const MAXPTS = 1200;
const K = 400;
const CAP = 1e8;

export function mountOde(fig) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'A stiff ODE: one fast mode, one slow answer', wide: true });
  f.stage.classList.add('cols');
  const left = document.createElement('div');
  const right = document.createElement('div');
  f.stage.append(left, right);
  const yPlot = new Plot(left, { x: { label: 't', min: 0, max: 2 }, y: { label: 'y', min: -1.6, max: 2.6 }, aspect: 1.4, label: 'Numerical solution against the exact solution' });
  const ePlot = new Plot(right, { x: { label: 't', min: 0, max: 2 }, y: { label: '|error|', log: true, min: 1e-12, max: 1e4 }, aspect: 1.4, label: 'Size of the error against time, log scale' });

  const problems = {
    pr: createProblem('prothero-robinson', {}),
    pr2: createProblem('prothero-robinson', { y0: 2, tEnd: 1 }),
    '2x2': createProblem('two-by-two', {}),
  };
  const integ = Object.fromEntries(Object.entries(problems).map(([k, P]) => [k, createIntegrator(P, {})]));

  const T = new Float64Array(MAXPTS + 2);
  const Y0 = new Float64Array(MAXPTS + 2);
  const Y1 = new Float64Array(MAXPTS + 2);
  const E = new Float64Array(MAXPTS + 2);
  const TE = new Float64Array(K);
  const XE0 = new Float64Array(K);
  const XE1 = new Float64Array(K);
  const tmp = new Float64Array(2);

  const prob = select(f.controls, { label: 'Problem', options: PROBLEMS, value: p.problem, onChange: () => (setProblem(), run()) });
  const method = select(f.controls, { label: 'Method', options: METHODS, value: p.method, onChange: () => (setProblem(), run()) });
  const hS = slider(f.controls, { label: 'step h', min: 5e-4, max: 0.5, log: true, value: p.h, fmt: (v) => num(v), onInput: () => run() });

  const rdZ = readout(f.readouts, { label: 'hλ of the fast mode' });
  const rdR = readout(f.readouts, { label: 'R(hλ), one step' });
  const rdN = readout(f.readouts, { label: 'steps' });
  const rdMax = readout(f.readouts, { label: 'max error' });
  const rdEnd = readout(f.readouts, { label: 'error at the end' });

  function setProblem() {
    const P = problems[prob.value];
    const two = P.dim === 2;
    for (let k = 0; k < K; k++) {
      TE[k] = P.tEnd * (k / (K - 1)) ** 2;
      P.exact(TE[k], tmp);
      XE0[k] = tmp[0];
      XE1[k] = two ? tmp[1] : NaN;
    }
    yPlot.setAxes({ x: { max: P.tEnd } });
    ePlot.setAxes({ x: { max: P.tEnd } });
    const name = STABILITY_METHODS[method.value].name;
    yPlot.draw([
      { x: TE, y: XE0, color: 'ink', dash: [5, 4], width: 1.5, label: two ? 'exact y₁' : 'exact y' },
      two && { x: TE, y: XE1, color: 'muted', dash: [2, 3], width: 1.5, label: 'exact y₂' },
      { x: T, y: Y0, color: 's1', width: 2, label: two ? `${name}, y₁` : name },
      two && { x: T, y: Y1, color: 's2', width: 2, dash: [6, 3], label: `${name}, y₂` },
    ]);
    ePlot.draw([{ x: T, y: E, color: 's1', width: 2, label: `error, ${name}` }]);
  }

  function run() {
    const P = problems[prob.value];
    const st = integ[prob.value];
    const m = method.value;
    const h = hS.value;
    const N = Math.round(P.tEnd / h);
    const stride = Math.max(1, Math.ceil(N / MAXPTS));
    resetIntegrator(st);
    let c = 0;
    let maxErr = 0;
    let err = 0;
    let blew = false;
    const record = () => {
      T[c] = st.t;
      Y0[c] = st.y[0];
      Y1[c] = P.dim === 2 ? st.y[1] : NaN;
      E[c] = err;
      c++;
    };
    record();
    for (let k = 1; k <= N; k++) {
      odeStep(st, { h, method: m });
      odeExact(st);
      err = 0;
      for (let i = 0; i < P.dim; i++) err = Math.max(err, Math.abs(st.y[i] - st.exact[i]));
      if (!(err <= CAP)) {
        blew = true;
        err = Math.min(err, 1e300);
        record();
        break;
      }
      if (err > maxErr) maxErr = err;
      if (k % stride === 0 || k === N) record();
    }
    for (let k = c; k < T.length; k++) T[k] = Y0[k] = Y1[k] = E[k] = NaN;
    // points when the steps are few enough to see
    const pts = N <= 80 ? 3 : 0;
    yPlot.series[two(P) ? 2 : 1].points = pts;
    if (two(P)) yPlot.series[3].points = pts;
    yPlot.render();
    ePlot.render();

    const z = FAST * h;
    const R = stabilityValue(m, z, 0).re;
    const absR = stabilityAbs(m, z, 0);
    const name = STABILITY_METHODS[m].name;
    rdZ.set(num(z));
    rdR.set(num(m === 'bdf2' ? absR : R, 4) + (m === 'bdf2' ? ' (|root|)' : ''), absR > 1 + 1e-12 ? 'bad' : absR < 0.5 ? 'good' : '');
    rdN.set(blew ? `${st.steps} (stopped)` : String(N));
    rdMax.set(blew ? `> ${num(CAP)}` : num(maxErr), blew || maxErr > 0.1 ? 'bad' : '');
    rdEnd.set(blew ? '–' : num(err), blew ? 'bad' : '');
    let msg;
    if (blew) msg = `${name} blows up: hλ = ${num(z)} lies outside its stability region, so |R| = ${num(absR, 3)} multiplies every error each step. Stopped after ${st.steps} steps.`;
    else if (absR > 0.9 && maxErr > 1e-3) msg = `Stable, but R(hλ) = ${num(R, 3)}: the fast transient flips sign every step and fades slowly, so the error stays at ${num(err)} after ${N} steps.`;
    else msg = `Stable: the fast mode is multiplied by ${num(m === 'bdf2' ? absR : R, 3)} per step. ${N} steps, largest error ${num(maxErr)}.`;
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }
  const two = (P) => P.dim === 2;

  setProblem();
  run();
  return () => {
    yPlot.destroy();
    ePlot.destroy();
  };
}
