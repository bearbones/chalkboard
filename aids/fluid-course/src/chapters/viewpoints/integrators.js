// viewpoints-integrators: tracking a particle in solid-body rotation, where
// the exact path is a circle. The reader picks the integrator and the step
// ΩΔt; every step is taken by flows.js rkStep, and a material loop by
// advectLoop. Beside each traced radius and area sits the prediction from
// the method's one-step factor |G| = |R(iΩΔt)| (flows.js
// rotationAmplification): r/r₀ = |G|ⁿ and A/A₀ = |G|²ⁿ. Explicit Euler has
// |G| > 1 at every step size; RK4 has |G| < 1 below ΩΔt = 2√2; implicit
// midpoint has |G| = 1 at any step and errs only in phase.

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, segmented, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { makeFlow, rkStep, rotationAmplification, createMaterialLoop, resetMaterialLoop, advectLoop, loopArea, IMPLICIT_STATUS } from '../../sims/flows.js';
import { growthPerTurn } from '../../sims/ch-viewpoints-kinematics.js';
import { planeView } from './view.js';

const METHODS = [
  ['euler', 'Explicit Euler'],
  ['midpoint', 'Midpoint'],
  ['rk4', 'RK4'],
  ['implicit-midpoint', 'Implicit midpoint'],
];
const PRESETS = {
  broken: { method: 'euler', w: 0.2 },
  midpoint: { method: 'midpoint', w: 0.2 },
  fixed: { method: 'rk4', w: 0.2 },
  'rk4-edge': { method: 'rk4', w: 2.9 },
  symplectic: { method: 'implicit-midpoint', w: 0.2 },
  'big-step': { method: 'implicit-midpoint', w: 2 },
};
const T_END = 20; // run length, in units of 1/Ω (a little over three turns)
const W_MIN = 0.02;
const W_MAX = 3.2;
const MAXS = Math.ceil(T_END / W_MIN) + 1;
const NL = 64; // points on the material loop
const LOOP = { cx: 0.6, cy: 0.2, r: 0.3, n: NL };
const RATE = 2.5; // simulated time per second of animation
const NEX = 96; // points on the exact circle and loop

export function mountIntegrators(fig, ctx) {
  const ui = frame(fig, { title: 'Tracking a particle round a circle', wide: true });
  ui.stage.classList.add('cols');
  const view = planeView(ui.stage, {
    domain: { xmin: -1.4, xmax: 1.4, ymin: -1.4, ymax: 1.4 },
    aspect: 1,
    maxHeight: 420,
    label: 'A particle and a small loop of particles stepped round solid-body rotation, with the exact circle and the exact loop position dashed.',
  });
  const plot = new Plot(ui.stage, {
    x: { label: 'time Ωt', min: 0, max: T_END },
    y: { label: 'ratio to the start', log: true },
    aspect: 1.15,
    label: 'Radius and loop area relative to their starting values, traced and predicted, against time',
  });

  const flow = makeFlow('rotation', { Omega: 1 });
  const loop = createMaterialLoop({ ...LOOP, capacity: NL });
  const PX = new Float64Array(MAXS + 1);
  const PY = new Float64Array(MAXS + 1);
  const TT = new Float64Array(MAXS + 1);
  // The whole run (…F) and what the plot shows (NaN after the revealed step).
  const RF = new Float64Array(MAXS + 1);
  const AF = new Float64Array(MAXS + 1);
  const RR = new Float64Array(MAXS + 1);
  const RP = new Float64Array(MAXS + 1);
  const AA = new Float64Array(MAXS + 1);
  const AP = new Float64Array(MAXS + 1);
  const LX = new Float64Array((MAXS + 1) * NL);
  const LY = new Float64Array((MAXS + 1) * NL);
  const EX = new Float64Array(NEX + 1);
  const EY = new Float64Array(NEX + 1);
  const O = new Float64Array(2);
  const series = [
    { x: TT, y: RR, color: 's1', width: 2.5, label: 'radius r/r₀, traced' },
    { x: TT, y: RP, color: 'ink', width: 1.5, dash: [6, 4], label: 'radius predicted, |G|ⁿ' },
    { x: TT, y: AA, color: 's2', width: 2.5, label: 'loop area A/A₀, traced' },
    { x: TT, y: AP, color: 'ink', width: 1.5, dash: [2, 3], label: 'area predicted, |G|²ⁿ' },
  ];

  let method = 'euler';
  let w = 0.2;
  let M = 0; // steps in the run
  let n = 0; // steps revealed
  let G = 1;
  let failures = 0;

  // The whole run, computed at once (at most 1,000 steps of 65 particles).
  function compute() {
    G = rotationAmplification(method, w);
    M = Math.min(MAXS, Math.round(T_END / w));
    IMPLICIT_STATUS.failures = 0;
    resetMaterialLoop(loop, LOOP);
    let x = 1;
    let y = 0;
    for (let k = 0; k <= M; k++) {
      if (k > 0) {
        rkStep(flow, x, y, (k - 1) * w, w, method, O);
        x = O[0];
        y = O[1];
        advectLoop(loop, flow, (k - 1) * w, w, method);
      }
      PX[k] = x;
      PY[k] = y;
      RF[k] = Math.hypot(x, y);
      AF[k] = loopArea(loop, true) / loop.area0;
      for (let i = 0; i < NL; i++) {
        LX[k * NL + i] = loop.x[i];
        LY[k * NL + i] = loop.y[i];
      }
    }
    failures = IMPLICIT_STATUS.failures;
    for (let k = 0; k <= MAXS; k++) TT[k] = k * w;
  }

  // Show steps 0 … m (NaN breaks the plotted lines after that).
  function setReveal(m) {
    n = Math.max(0, Math.min(M, m));
    for (let k = 0; k <= MAXS; k++) {
      if (k <= n) {
        RR[k] = RF[k];
        RP[k] = G ** k;
        AA[k] = AF[k];
        AP[k] = G ** (2 * k);
      } else {
        RR[k] = NaN;
        RP[k] = NaN;
        AA[k] = NaN;
        AP[k] = NaN;
      }
    }
  }

  function run(fromStart) {
    compute();
    setReveal(fromStart ? 0 : M);
    plot.draw(series, { yExtent: [0.5, 2] });
    draw();
  }

  function draw() {
    const pal = palette();
    const c = view.box.ctx;
    // Zoom out to keep the particle and the loop in view.
    let far = 1.25;
    for (let k = 0; k <= n; k++) if (RF[k] > far) far = RF[k];
    const lo = n * NL;
    for (let i = 0; i < NL; i++) {
      const r = Math.hypot(LX[lo + i], LY[lo + i]);
      if (r > far) far = r;
    }
    const span = 1.12 * far;
    view.setDomain({ xmin: -span, xmax: span, ymin: -span, ymax: span });
    view.clear(pal);
    c.save();
    view.clip();
    c.lineJoin = 'round';
    // Exact: the unit circle, and the loop turned rigidly by Ωt.
    const tn = n * w;
    for (let k = 0; k <= NEX; k++) {
      const a = (2 * Math.PI * k) / NEX;
      EX[k] = Math.cos(a);
      EY[k] = Math.sin(a);
    }
    c.strokeStyle = pal.css('ink', 0.7);
    c.lineWidth = 1.25;
    c.setLineDash([5, 4]);
    c.beginPath();
    view.path(EX, EY, 0, NEX + 1);
    const ca = Math.cos(tn);
    const sa = Math.sin(tn);
    for (let k = 0; k <= NEX; k++) {
      const a = (2 * Math.PI * k) / NEX;
      const x = LOOP.cx + LOOP.r * Math.cos(a);
      const y = LOOP.cy + LOOP.r * Math.sin(a);
      EX[k] = ca * x - sa * y;
      EY[k] = sa * x + ca * y;
    }
    view.path(EX, EY, 0, NEX + 1);
    c.stroke();
    c.setLineDash([]);
    // The loop as stepped.
    c.fillStyle = pal.css('s2', 0.25);
    c.strokeStyle = pal.css('s2');
    c.lineWidth = 2;
    c.beginPath();
    view.path(LX, LY, lo, lo + NL);
    c.closePath();
    c.fill();
    c.stroke();
    // The particle's track, with a dot at each step when the steps are big enough to see.
    c.strokeStyle = pal.css('s1');
    c.lineWidth = 2;
    c.beginPath();
    view.path(PX, PY, 0, n + 1);
    c.stroke();
    if (w * view.s >= 6) {
      c.fillStyle = pal.css('s1');
      c.beginPath();
      for (let k = 0; k <= n; k++) view.dot(PX[k], PY[k], 2.5);
      c.fill();
    }
    // Where the particle should be: a ring on the circle.
    c.strokeStyle = pal.css('ink');
    c.lineWidth = 1.5;
    c.beginPath();
    view.dot(Math.cos(tn), Math.sin(tn), 6);
    c.stroke();
    c.fillStyle = pal.css('s1');
    c.strokeStyle = pal.css('board');
    c.beginPath();
    view.dot(PX[n], PY[n], 6);
    c.fill();
    c.stroke();
    // Centre of rotation.
    c.fillStyle = pal.css('ink');
    c.beginPath();
    view.dot(0, 0, 2.5);
    c.fill();
    c.restore();
    view.border(pal);

    const bad = G > 1 + 1e-12;
    rG.set(G === 1 ? '1 (exactly)' : G.toFixed(8), bad ? 'bad' : 'good');
    rTurns.set(fmt((2 * Math.PI) / w, 3));
    rR.set(`${fmt(RF[n], 5)} (predicted ${fmt(G ** n, 5)})`);
    rA.set(`${fmt(AF[n], 5)} (predicted ${fmt(G ** (2 * n), 5)})`);
    if (n > 0) {
      const a1 = Math.atan2(PY[n], PX[n]);
      const a0 = Math.atan2(PY[n - 1], PX[n - 1]);
      let da = a1 - a0;
      if (da < -Math.PI) da += 2 * Math.PI;
      if (da > Math.PI) da -= 2 * Math.PI;
      rTurn.set(`${fmt((da * 180) / Math.PI, 4)}° (exact ${fmt((w * 180) / Math.PI, 4)}°)`);
    } else rTurn.set('–');
    narrate(bad);
  }

  function narrate(bad) {
    const per = growthPerTurn(G, w);
    let s;
    if (method === 'implicit-midpoint') {
      s = `Implicit midpoint: |G| = 1 at any step, so radius and area are kept. Its error is all in the phase: each step turns ${fmt((2 * Math.atan(w / 2) * 180) / Math.PI, 4)}° instead of ${fmt((w * 180) / Math.PI, 4)}°.`;
      if (failures > 0) s += ` The Newton solve failed on ${failures} steps.`;
    } else if (bad) {
      s = `${method === 'euler' ? 'Explicit Euler' : method === 'rk4' ? 'RK4' : 'Midpoint'}: every step multiplies the radius by ${G.toFixed(6)}, so the particle spirals out, × ${per < 1e4 ? fmt(per, 4) : sci(per, 2)} per turn.`;
      if (method === 'rk4') s += ' Above ΩΔt = 2√2 ≈ 2.83 even RK4 is unstable here.';
      if (method === 'euler') s += ' No step is small enough to stop it; a smaller step only slows it.';
    } else {
      s = `RK4 below ΩΔt = 2√2: |G| = ${G.toFixed(10)}, a slow inward drift (× ${fmt(per, 6)} per turn) that you cannot see at this scale.`;
    }
    if (ui.status.textContent !== s) ui.status.textContent = s;
  }

  // ---- controls -----------------------------------------------------------------------
  const preset = PRESETS[fig.dataset.preset] || PRESETS.broken;
  method = preset.method;
  w = preset.w;
  const methodSeg = segmented(ui.controls, {
    label: 'Integrator',
    options: METHODS,
    value: method,
    onChange: (v) => {
      method = v;
      run(anim.playing);
    },
  });
  const wSlider = slider(ui.controls, {
    label: 'step ΩΔt',
    min: W_MIN,
    max: W_MAX,
    log: true,
    value: w,
    fmt: (v) => fmt(v, 3),
    onInput: (v) => {
      w = v;
      run(anim.playing);
    },
  });
  let carry = 0;
  const anim = animate(
    fig,
    (dt) => {
      carry += (dt * RATE) / w;
      const k = Math.floor(carry);
      if (k < 1) return;
      carry -= k;
      setReveal(n + k);
      if (n >= M) anim.pause();
      plot.render();
      draw();
    },
    { autoplay: true, signal: ctx.signal },
  );
  anim.onChange((playing) => {
    if (playing && n >= M) {
      carry = 0;
      setReveal(0);
      plot.render();
      draw();
    }
  });
  playButton(ui.controls, anim, { label: 'Play from the start' });

  const rG = readout(ui.readouts, { label: '|G|: radius factor per step' });
  const rTurns = readout(ui.readouts, { label: 'steps per turn' });
  const rR = readout(ui.readouts, { label: 'radius r/r₀ now' });
  const rA = readout(ui.readouts, { label: 'loop area A/A₀ now' });
  const rTurn = readout(ui.readouts, { label: 'turn in the last step' });

  view.box.onResize(() => draw());
  ctx.signal?.addEventListener('abort', () => {
    view.box.destroy();
    plot.destroy();
  });
  run(anim.playing);
  methodSeg.set(method, { silent: true });
  wSlider.set(w, { silent: true });
}
