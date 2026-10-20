// solvers-tolerance: what a loose pressure tolerance costs in a running
// simulation. The course's Stable Fluids kernel (stablefluids.js) steps a
// 48 × 48 closed box once per frame, its projection solved either by
// multigrid to a relative tolerance or by a fixed number of Jacobi sweeps.
// After every step the figure sums the divergence the projection left
// behind: dt · ½ Σ|D u| h² is the volume of fluid created in some cells
// (and destroyed in others) during that step, since in a closed box the
// signed sum is zero. Two scenes: the three-colour swirl (hero preset),
// and a stratified fluid at rest around a disc, which a converged solver
// keeps exactly still and an unconverged one sets moving.

import { h } from '../../kit/dom.js';
import { frame, slider, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { Plot } from '../../kit/plot.js';
import { createFluid, createPreset, addCircle, setScalar, step, maxFaceSpeed } from '../../sims/stablefluids.js';
import { presetFor, num, legend, allowScroll } from './common.js';

const NX = 48;
const DT = 1 / 60;
const T_END = 10;
const STEPS = Math.round(T_END / DT);
const KEEP = 4;
const SPEED_SCALE = 0.02;
const PRESETS = {
  default: { scene: 'swirl', mode: 'tol', tol: 1e-4, sweeps: 30 },
  loose: { scene: 'swirl', mode: 'tol', tol: 1e-1, sweeps: 30 },
  tight: { scene: 'swirl', mode: 'tol', tol: 1e-6, sweeps: 30 },
  jacobi: { scene: 'swirl', mode: 'sweeps', tol: 1e-4, sweeps: 30 },
  'still-loose': { scene: 'still', mode: 'tol', tol: 1e-1, sweeps: 30 },
  'still-tight': { scene: 'still', mode: 'tol', tol: 1e-6, sweeps: 30 },
};

function build(scene) {
  if (scene === 'still') {
    const F = createFluid({ nx: NX, ny: NX });
    addCircle(F, 0.4, 0.5, 0.15);
    setScalar(F, (x, y) => 1 + 0.5 * y * y, F.temp);
    setScalar(F, (x, y) => 0.3 + y, F.dye);
    return { F, params: { buoyancyAlpha: 1, buoyancyBeta: 4 } };
  }
  const F = createPreset('hero', { nx: NX });
  return { F, params: { ...F.params } };
}

export function mountTolerance(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'What a loose tolerance leaks', wide: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);
  const view = new FieldView(left, { nx: NX, ny: NX, maxHeight: 360, label: 'The simulated box: dye in the swirl scene, flow speed in the still scene' });
  allowScroll(view);
  const leg = legend(left, 'seq', ['0', '', '']);
  const plot = new Plot(right, {
    x: { label: 'time (s)', min: 0, max: T_END },
    y: { label: 'volume created so far (box = 1)', min: 1e-7, max: 10, log: true },
    aspect: 1.2,
    label: 'Total volume of fluid created and destroyed by the leftover divergence, against time, for this run and earlier runs',
  });

  const scene = segmented(f.controls, {
    label: 'Scene',
    options: [
      ['swirl', 'three-colour swirl'],
      ['still', 'layered fluid at rest'],
    ],
    value: p.scene,
    onChange: () => restart(),
  });
  const mode = segmented(f.controls, {
    label: 'Pressure solve',
    options: [
      ['tol', 'multigrid to a tolerance'],
      ['sweeps', 'fixed Jacobi sweeps'],
    ],
    value: p.mode,
    onChange: () => restart(),
  });
  const tol = slider(f.controls, { label: 'tolerance', min: 1e-8, max: 1e-1, log: true, value: p.tol, fmt: (v) => num(v, 2), onInput: () => restart() });
  const sweeps = slider(f.controls, { label: 'Jacobi sweeps per step', min: 1, max: 200, step: 1, value: p.sweeps, fmt: (v) => String(v), onInput: () => restart() });
  const loop = animate(fig, tick, { autoplay: true, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Restart', onClick: () => (restart(), loop.play()) });
  button(f.controls, { label: 'Clear old runs', onClick: () => ((old.length = 0), draw()) });

  const rdT = readout(f.readouts, { label: 'time' });
  const rdL = readout(f.readouts, { label: 'volume created so far' });
  const rdR = readout(f.readouts, { label: 'divergence left by the last projection, ‖Du‖/‖Du*‖' });
  const rdS = readout(f.readouts, { label: 'fastest flow' });
  const rdI = readout(f.readouts, { label: 'pressure iterations per step' });
  const rdM = readout(f.readouts, { label: 'time per step on this device' });

  let F = null;
  let params = null;
  let k = 0;
  let leak = 0;
  let itsSum = 0;
  let msAvg = 0;
  let speed = 0;
  let lastStatus = '';
  let curT = null;
  let curL = null;
  let len = 0;
  const old = [];
  const shown = new Float64Array(NX * NX);

  function describe() {
    return mode.value === 'tol' ? `tol ${num(tol.value, 1)}` : `${sweeps.value} Jacobi sweeps`;
  }

  function restart() {
    if (F && len > 60) {
      old.unshift({ t: curT.subarray(0, len), l: curL.subarray(0, len), label: `${scene.value === 'still' ? 'still' : 'swirl'}, ${lastLabel}` });
      if (old.length > KEEP) old.length = KEEP;
    }
    tol.input.disabled = mode.value !== 'tol';
    sweeps.input.disabled = mode.value !== 'sweeps';
    const s = build(scene.value);
    F = s.F;
    params = { ...s.params };
    if (mode.value === 'tol') {
      params.pressure = 'multigrid';
      params.pressureTol = tol.value;
      params.pressureMaxIter = 100;
    } else {
      params.pressure = 'jacobi';
      params.pressureIters = Math.round(sweeps.value);
    }
    lastLabel = describe();
    curT = new Float64Array(STEPS + 1);
    curL = new Float64Array(STEPS + 1);
    len = 0;
    k = 0;
    leak = 0;
    itsSum = 0;
    msAvg = 0;
    speed = 0;
    draw();
  }
  let lastLabel = '';

  function tick() {
    if (k >= STEPS) {
      loop.pause();
      return;
    }
    const t0 = performance.now();
    step(F, DT, params);
    const dtMs = performance.now() - t0;
    msAvg = k ? 0.9 * msAvg + 0.1 * dtMs : dtMs;
    k++;
    const g = F.g;
    let s = 0;
    for (let c = 0; c < g.nx * g.ny; c++) if (!g.solid[c]) s += Math.abs(g.div[c]);
    leak += 0.5 * s * g.h * g.h * DT;
    itsSum += F.diag.pressureIters;
    speed = maxFaceSpeed(F);
    curT[len] = k * DT;
    curL[len] = Math.max(leak, 1e-12);
    len++;
    draw();
    if (k >= STEPS) loop.pause();
  }

  function draw() {
    const still = scene.value === 'still';
    const g = F.g;
    if (still) {
      // Speed at cell centres from the face velocities.
      const su = g.nx + 1;
      for (let j = 0; j < g.ny; j++) {
        for (let i = 0; i < g.nx; i++) {
          const c = i + j * g.nx;
          const a = 0.5 * (F.u[i + j * su] + F.u[i + 1 + j * su]);
          const b = 0.5 * (F.v[c] + F.v[c + g.nx]);
          shown[c] = Math.sqrt(a * a + b * b);
        }
      }
      view.draw(shown, { map: 'seq', lo: 0, hi: SPEED_SCALE, solid: g.solid });
      leg.set('speed 0', '', `≥ ${SPEED_SCALE}`);
    } else {
      const d = F.dyes;
      for (let c = 0; c < shown.length; c++) shown[c] = d[0][c] + d[1][c] + d[2][c];
      view.draw(shown, { map: 'seq', lo: 0, hi: 1, solid: g.solid });
      leg.set('dye 0', '', '1');
    }
    const series = [];
    if (len > 0) series.push({ x: curT.subarray(0, len), y: curL.subarray(0, len), color: 's1', width: 2.5, label: `now: ${scene.value === 'still' ? 'still' : 'swirl'}, ${describe()}` });
    const dashes = [[7, 4], [2, 3], [10, 3, 2, 3], [4, 2]];
    old.forEach((o, i) => series.push({ x: o.t, y: o.l, color: `s${i + 2}`, dash: dashes[i], width: 1.8, label: o.label }));
    plot.draw(series);

    const relDiv = k ? F.diag.pressureResidual : NaN;
    rdT.set(`${(k * DT).toFixed(2)} s`);
    rdL.set(num(leak, 3), leak > 0.01 ? 'bad' : leak < 1e-4 && k > 60 ? 'good' : '');
    rdR.set(num(relDiv, 2), relDiv > 0.01 ? 'bad' : '');
    rdS.set(num(speed, 3), still && speed > 1e-3 ? 'bad' : '');
    rdI.set(k ? num(itsSum / k, 3) : '–');
    rdM.set(k ? `${num(msAvg, 2)} ms` : '–');
    let msg;
    if (!k) msg = still ? 'A layered fluid at rest: heavy below, light above, held up by its pressure. Nothing should ever move.' : 'Three jets stir the box. Press Run.';
    else if (still && speed > 1e-3) msg = `This fluid should stay at rest, but the unconverged pressure cannot hold it up: currents of ${num(speed, 2)} after ${(k * DT).toFixed(1)} s.`;
    else if (still) msg = `Still at rest to within ${num(speed, 2)}: the pressure balances the weight of every layer to the tolerance asked for.`;
    else if (leak > 0.01) msg = `${describe()}: each step leaves divergence behind, and over ${(k * DT).toFixed(1)} s it has created and destroyed ${num(leak * 100, 2)}% of the box's volume.`;
    else msg = `${describe()}: ${num(leak, 2)} of the box's volume created so far, a ${num(itsSum / k, 2)}-iteration solve per step (warm-started from the last pressure).`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
  }

  view.redraw = () => {
    leg.refresh();
    draw();
  };
  restart();
  return () => {
    view.destroy();
    plot.destroy();
  };
}
