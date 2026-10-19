// stiffness-heat: the heat-equation lab. FTCS, backward Euler, Crank–Nicolson
// or the theta method on a 1D grid, beside the exact solution, with the
// amplification factor G(xi) of the chosen scheme against the exact decay
// e^{-r xi^2}. The r slider crosses FTCS's limit r = 1/2 and CN's ringing.

import { frame, slider, select, toggle, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createHeat, setHeatPreset, step, dtForR, heatExact, fillExact, amplification, amplificationCurve, heatStabilityLimit } from '../../sims/diffusion.js';
import { totalVariationOf, maxDiff, presetFor, num } from './common.js';

const PRESETS = {
  default: { scheme: 'ftcs', init: 'noisy-sine', r: 0.4, theta: 0.6, n: 50, rannacher: false },
  'ftcs-blowup': { scheme: 'ftcs', init: 'noisy-sine', r: 0.52 },
  'ftcs-stable': { scheme: 'ftcs', init: 'noisy-sine', r: 0.5 },
  'cn-ringing': { scheme: 'cn', init: 'step', r: 10 },
  'be-step': { scheme: 'btcs', init: 'step', r: 10 },
  rannacher: { scheme: 'cn', init: 'step', r: 10, rannacher: true },
  theta: { scheme: 'theta', init: 'step', r: 10, theta: 0.6 },
};

const SCHEMES = [
  ['ftcs', 'FTCS (explicit)'],
  ['btcs', 'Backward Euler'],
  ['cn', 'Crank–Nicolson'],
  ['theta', 'θ-method'],
];
const SCHEME_NAME = Object.fromEntries(SCHEMES);
const INITS = [
  ['noisy-sine', 'sin πx + grid noise'],
  ['modes', 'two sine modes'],
  ['step', 'step'],
  ['top-hat', 'top hat'],
];
const T_END = 0.5;
const NF = 201;
const NG = 161;

export function mountHeat(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'The heat equation: explicit against implicit', wide: true });
  f.stage.classList.add('cols');
  const left = document.createElement('div');
  const right = document.createElement('div');
  f.stage.append(left, right);

  const uPlot = new Plot(left, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u', min: -0.45, max: 1.45 }, aspect: 1.45, label: 'Temperature u(x) of the numerical scheme against the exact solution' });
  const gPlot = new Plot(right, {
    x: { label: 'ξ = kΔx (π is the shortest wave)', min: 0, max: Math.PI },
    y: { label: 'G per step', min: -1.6, max: 1.15 },
    aspect: 1.45,
    label: 'Amplification factor G of each Fourier mode per step, against the exact decay',
  });

  // grids: one heat state per n, made on first use
  const states = new Map();
  let s = null;
  const XF = new Float64Array(NF);
  const EF = new Float64Array(NF);
  for (let k = 0; k < NF; k++) XF[k] = k / (NF - 1);
  const curve = { xi: new Float64Array(NG), G: new Float64Array(NG), exact: new Float64Array(NG) };

  let tv0 = 1;
  let startup = 0;
  let acc = 0;
  let blown = false;
  let lastStatus = '';

  const scheme = select(f.controls, { label: 'Scheme', options: SCHEMES, value: p.scheme, onChange: () => restart(true) });
  const init = select(f.controls, { label: 'Initial data', options: INITS, value: p.init, onChange: () => restart(true) });
  const grid = select(f.controls, { label: 'Grid', options: [['25', 'n = 25'], ['50', 'n = 50'], ['100', 'n = 100']], value: String(p.n), onChange: () => restart(true) });
  const rS = slider(f.controls, { label: 'mesh ratio r = κΔt/Δx²', min: 0.05, max: 50, log: true, value: p.r, fmt: (v) => num(v), onInput: () => restart(false) });
  const thS = slider(f.controls, { label: 'θ (θ-method only)', min: 0, max: 1, step: 0.01, value: p.theta, fmt: (v) => v.toFixed(2), onInput: () => scheme.value === 'theta' && restart(false) });
  const ran = toggle(f.controls, { label: 'Start with two backward-Euler half steps (Rannacher)', checked: p.rannacher, onChange: () => restart(false) });

  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop);
  button(f.controls, { label: 'Step', onClick: () => (loop.pause(), advance(), update()) });
  button(f.controls, { label: 'Reset', onClick: () => restart(false) });

  const rdT = readout(f.readouts, { label: 'time t' });
  const rdDt = readout(f.readouts, { label: 'Δt' });
  const rdN = readout(f.readouts, { label: 'steps to t = 0.1' });
  const rdG = readout(f.readouts, { label: 'worst |G| on the grid' });
  const rdGpi = readout(f.readouts, { label: 'G of the shortest wave' });
  const rdE = readout(f.readouts, { label: 'max error' });
  const rdTV = readout(f.readouts, { label: 'total variation (start)' });

  const dtNow = () => dtForR(s, rS.value);
  const theta = () => thS.value;
  const useStartup = () => ran.value && scheme.value !== 'ftcs';

  function restart(structural) {
    const n = Number(grid.value);
    if (!states.has(n)) states.set(n, createHeat({ n, preset: init.value }));
    s = states.get(n);
    setHeatPreset(s, init.value);
    tv0 = totalVariationOf(s.u, s.len);
    startup = useStartup() ? 2 : 0;
    acc = 0;
    blown = false;
    thS.input.disabled = scheme.value !== 'theta';
    ran.input.disabled = scheme.value === 'ftcs';
    amplificationCurve(scheme.value, rS.value, { theta: theta(), out: curve });
    if (structural || !uPlot.series.length) {
      uPlot.draw([
        { x: XF, y: EF, color: 'ink', dash: [5, 4], width: 1.5, label: 'exact' },
        { x: s.x, y: s.u, color: 's1', width: 1.5, points: n > 50 ? 1.6 : 2.4, label: SCHEME_NAME[scheme.value] },
      ]);
      gPlot.draw(
        [
          { x: curve.xi, y: curve.exact, color: 'ink', dash: [5, 4], width: 1.5, label: 'exact e^(−rξ²)' },
          { x: curve.xi, y: curve.G, color: 's1', width: 2, label: `G(ξ), ${SCHEME_NAME[scheme.value]}` },
        ],
        { under: shadeUnstable },
      );
    } else gPlot.render();
    update();
  }

  function shadeUnstable(ctx, tx, ty, area, pal) {
    ctx.fillStyle = pal.css('bad', 0.08);
    const y1 = ty(1);
    const ym1 = ty(-1);
    ctx.fillRect(area.x0, area.y0, area.x1 - area.x0, y1 - area.y0);
    ctx.fillRect(area.x0, ym1, area.x1 - area.x0, area.y1 - ym1);
    ctx.strokeStyle = pal.css('bad', 0.6);
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    for (const y of [y1, ym1]) {
      ctx.beginPath();
      ctx.moveTo(area.x0, y);
      ctx.lineTo(area.x1, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = pal.css('bad', 0.85);
    ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('|G| > 1: grows', area.x1 - 4, ym1 + 15);
  }

  function advance() {
    if (blown || s.t >= T_END) return;
    const dt = dtNow();
    if (startup > 0) {
      step(s, { scheme: 'btcs', dt: dt / 2 });
      startup--;
    } else step(s, { scheme: scheme.value, dt, theta: theta() });
  }

  function tick(dtWall) {
    const dt = dtNow();
    const rate = Math.min(2000, Math.max(2, 0.02 / dt));
    acc += dtWall * rate;
    let k = Math.min(40, Math.floor(acc));
    acc -= Math.floor(acc);
    while (k-- > 0 && !blown && s.t < T_END) advance();
    update();
    if (blown || s.t >= T_END) loop.pause();
  }

  // worst |G| over the modes the grid holds, xi_k = k pi / n, k = 1..n-1
  function worstG() {
    let w = 0;
    for (let k = 1; k < s.n; k++) {
      const g = Math.abs(amplification(scheme.value, (k * Math.PI) / s.n, rS.value, theta()));
      if (g > w) w = g;
    }
    return w;
  }

  function update() {
    fillExact(s);
    heatExact(init.value, XF, s.t, s.kappa, EF);
    const err = maxDiff(s.u, s.exact, s.len);
    if (!(err < 3)) blown = true;
    const tv = totalVariationOf(s.u, s.len);
    const dt = dtNow();
    const w = worstG();
    const gShort = amplification(scheme.value, ((s.n - 1) * Math.PI) / s.n, rS.value, theta());
    const limit = heatStabilityLimit(scheme.value, theta());
    uPlot.render();
    rdT.set(num(s.t));
    rdDt.set(num(dt));
    rdN.set(String(Math.ceil(0.1 / dt - 1e-9)));
    rdG.set(num(w, 4), w > 1 + 1e-12 ? 'bad' : 'good');
    rdGpi.set(num(gShort), gShort < -0.5 ? 'bad' : '');
    rdE.set(num(err), err > 0.05 ? 'bad' : '');
    rdTV.set(`${num(tv)} (${num(tv0)})`, tv > tv0 + 1e-9 ? 'bad' : '');
    let msg;
    if (blown) msg = `Blowing up: the shortest wave grows by |G| = ${num(w, 4)} per step, so the error passed 3 after ${s.steps} steps. Paused.`;
    else if (w > 1 + 1e-12) msg = `r = ${num(rS.value)} is past this scheme's limit r ≤ ${num(limit)}: the shortest wave will grow by ${num(w, 4)} per step. Press Play.`;
    else if (tv > tv0 + 1e-9) msg = `Stable, but the total variation has risen above its starting value: new wiggles. The shortest wave has G = ${num(gShort)}: it flips sign every step and barely decays.`;
    else if (gShort < -0.5) msg = `Stable, but G = ${num(gShort)} for the shortest wave: it flips sign every step and decays slowly.`;
    else if (s.t >= T_END) msg = `Reached t = ${T_END}: the profile has nearly settled.`;
    else msg = `Stable: every grid mode decays (worst |G| = ${num(w, 4)}).`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  restart(true);
  return () => {
    uPlot.destroy();
    gPlot.destroy();
  };
}
