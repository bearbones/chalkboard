// stable-fluids-sandbox: the main sandbox. A real-time incompressible fluid
// from src/sims/stablefluids.js (MAC grid; advect → forces → project) that
// the reader stirs by dragging. Every choice the chapter discusses is a
// control: advection scheme, pressure solver and its sweeps, vorticity
// confinement ε, time step, grid size, an obstacle. Readouts report the
// diagnostics that tell the stories apart: CFL number, kinetic energy,
// enstrophy, the divergence left by the projection, dye gained or lost, and
// the measured cost of a step. "Step one stage" drains stepPhases() one
// stage at a time, so the reader can watch divergence appear when forces
// act and vanish when the projection runs.
//
// Sizes follow the kernel's performance note: the default grids are the
// presets' phone sizes (about 64²); the "desktop" size is labelled as such.

import { h } from '../../kit/dom.js';
import { frame, slider, select, segmented, toggle, button, readout, playButton, animate } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { PRESETS as KERNEL_PRESETS, createPreset, step, stepPhases, splat, addCircle, clearSolids, vorticity, maxDivergence, dyeTotal, kineticEnergy, enstrophy, cflNumber } from '../../sims/stablefluids.js';
import { presetFor, num, pct, legend, paintDye, maxAbs, meanOf } from './common.js';

// Scenes: kernel preset, grid sizes (nx; aspect kept by createPreset), an
// optional obstacle (centre, radius as fractions of width / height).
const SCENES = {
  stir: { preset: 'stir', name: 'Stir a box of dye', sizes: { s: 32, m: 64, l: 96 }, disc: [0.5, 0.5, 0.1], closed: true },
  smoke: { preset: 'smoke', name: 'Buoyant smoke', sizes: { s: 32, m: 48, l: 64 }, disc: [0.5, 0.45, 0.08], closed: false },
  obstacle: { preset: 'obstacle', name: 'Flow past a disc', sizes: { s: 64, m: 96, l: 128 }, disc: null, closed: false },
  swirl: { preset: 'hero', name: 'Three-colour swirl', sizes: { s: 48, m: 64, l: 96 }, disc: [0.5, 0.5, 0.08], closed: true },
};

const SOLVERS = [
  ['multigrid', 'Multigrid to 10⁻⁴ (default)'],
  ['mgpcg', 'Multigrid-PCG to 10⁻⁴'],
  ['pcg-mic0', 'MIC(0)-PCG to 10⁻⁴'],
  ['jacobi', 'Jacobi, fixed sweeps'],
  ['red-black', 'Red–black GS, fixed sweeps'],
  ['none', 'No projection'],
];

const PRESETS = {
  default: { scene: 'stir', adv: 'maccormack', solver: 'multigrid', sweeps: 30, eps: 0, dt: 1 / 60, colour: 'dye', size: 'm', obstacle: false, auto: false, kick: true, play: true },
  smoke: { scene: 'smoke', eps: 0.25, kick: false },
  'smoke-plain': { scene: 'smoke', eps: 0, kick: false },
  obstacle: { scene: 'obstacle', eps: 0.3, kick: false, obstacle: true },
  swirl: { scene: 'swirl', eps: 0.35, kick: false },
  blur: { adv: 'semi-lagrangian', auto: true, kick: false },
  stages: { colour: 'divergence', kick: true, play: false },
  jacobi: { solver: 'jacobi', sweeps: 5, colour: 'divergence', auto: true, kick: false },
  noise: { eps: 4, kick: true },
  budget: { size: 'l', solver: 'jacobi', sweeps: 30, auto: true, kick: false },
};

const AUTO_FORCE = 20; // acceleration of the auto-stirring paddle (tuned: CFL ≈ 2 at 64²)
const AUTO_OMEGA = 2; // its angular speed, rad per time unit

export function mountSandbox(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Stable fluids: stir it', wide: true });
  const holder = h('div.sf-field');
  f.stage.append(holder);
  const leg = legend(f.stage, 'seq', ['', '', '']);

  let F = null;
  let view = null;
  let sceneKey = p.scene;
  let gen = null; // a step being taken one stage at a time
  let stageName = '';
  let paddle = 0;
  let msEma = 0;
  let frameNo = 0;
  let stepEvery = 1;
  let dye0 = 0;
  let keHist = 0; // smoothed KE trend for the confinement narration
  let vortScale = 1;
  let lastStatus = '';
  const params = {};

  // ---- controls ----
  const scene = select(f.controls, {
    label: 'Scene',
    options: Object.entries(SCENES).map(([k, s]) => [k, s.name]),
    value: p.scene,
    onChange: (v) => {
      sceneKey = v;
      obstacle.set(v === 'obstacle', { silent: true });
      eps.set(KERNEL_PRESETS[SCENES[v].preset].params.vorticity ?? 0, { silent: true });
      build();
    },
  });
  const adv = select(f.controls, {
    label: 'Advection',
    options: [
      ['semi-lagrangian', 'Semi-Lagrangian'],
      ['bfecc', 'BFECC'],
      ['maccormack', 'MacCormack (clamped)'],
    ],
    value: p.adv,
    onChange: () => syncParams(),
  });
  const solver = select(f.controls, { label: 'Pressure solve', options: SOLVERS, value: p.solver, onChange: () => syncParams() });
  const sweeps = slider(f.controls, { label: 'Fixed sweeps', min: 1, max: 200, log: true, value: p.sweeps, fmt: (v) => String(Math.round(v)), onInput: () => syncParams() });
  const eps = slider(f.controls, { label: 'Confinement ε', min: 0, max: 6, step: 0.05, value: p.eps, fmt: (v) => v.toFixed(2), onInput: () => syncParams() });
  const dtS = slider(f.controls, { label: 'Time step Δt', min: 1 / 240, max: 1 / 10, log: true, value: p.dt, fmt: (v) => `${v.toFixed(4)} (1/${Math.round(1 / v)})`, onInput: () => syncParams() });
  const size = segmented(f.controls, {
    label: 'Grid',
    options: [
      ['s', 'coarse'],
      ['m', 'phone'],
      ['l', 'desktop'],
    ],
    value: p.size,
    onChange: () => build(),
  });
  const colour = segmented(f.controls, {
    label: 'Colour',
    options: [
      ['dye', 'dye'],
      ['vorticity', 'vorticity'],
      ['divergence', 'divergence'],
      ['pressure', 'pressure'],
    ],
    value: p.colour,
    onChange: () => draw(),
  });
  const obstacle = toggle(f.controls, { label: 'Obstacle', checked: p.obstacle || p.scene === 'obstacle', onChange: () => setObstacle() });
  const auto = toggle(f.controls, { label: 'Auto-stir paddle', checked: p.auto });

  const loop = animate(fig, tick, { autoplay: p.play, signal });
  playButton(f.controls, loop, { label: 'Run' });
  loop.onChange(() => draw());
  button(f.controls, { label: 'Stir for me', onClick: () => (kick(), draw()) });
  button(f.controls, { label: 'Step one stage', onClick: () => stageStep() });
  button(f.controls, { label: 'Reset', onClick: () => build() });

  const rdGrid = readout(f.readouts, { label: 'grid' });
  const rdMs = readout(f.readouts, { label: 'cost per step' });
  const rdCfl = readout(f.readouts, { label: 'CFL number', title: 'max |u| Δt / h: cells crossed per step by the fastest fluid' });
  const rdKe = readout(f.readouts, { label: 'kinetic energy ½∫|u|²' });
  const rdEns = readout(f.readouts, { label: 'enstrophy ½∫ω²' });
  const rdDiv = readout(f.readouts, { label: 'divergence left max|∇·u| / max|∇·u*|' });
  const rdIt = readout(f.readouts, { label: 'pressure iterations' });
  const rdDye = readout(f.readouts, { label: 'dye 1 since start', title: 'Change in the total of the first dye; in a closed box without sources, all of it is advection error' });

  // ---- building ----
  function syncParams() {
    params.advection = adv.value;
    params.limiter = null;
    const s = solver.value;
    params.project = s !== 'none';
    params.pressure = s === 'none' ? 'multigrid' : s;
    params.pressureIters = Math.round(sweeps.value);
    params.vorticity = eps.value;
    sweeps.el.classList.toggle('sf-dim', !(s === 'jacobi' || s === 'red-black'));
  }

  function build() {
    gen = null;
    stageName = '';
    const sc = SCENES[sceneKey];
    F = createPreset(sc.preset, { nx: sc.sizes[size.value] });
    Object.keys(params).forEach((k) => delete params[k]);
    Object.assign(params, F.params);
    syncParams();
    if (obstacle.value && sc.disc) addDisc();
    if (!obstacle.value && sceneKey === 'obstacle') clearSolids(F);
    if (p.kick && sceneKey === 'stir') kick();
    dye0 = dyeTotal(F, 0);
    msEma = 0;
    keHist = 0;
    vortScale = 1;
    frameNo = 0;
    stepEvery = 1;
    if (view) {
      view.box.wrap.remove();
      view.destroy();
    }
    view = new FieldView(holder, { nx: F.nx, ny: F.ny, maxHeight: 460, label: `${sc.name}: a ${F.nx} by ${F.ny} fluid grid; drag on it to stir` });
    view.redraw = () => {
      leg.refresh();
      draw();
    };
    view.onDrag(onDrag);
    rdGrid.set(`${F.nx} × ${F.ny}`);
    draw();
  }

  function addDisc() {
    const sc = SCENES[sceneKey];
    const H = F.ny / F.nx;
    if (sc.disc) addCircle(F, sc.disc[0], sc.disc[1] * H, sc.disc[2]);
  }
  function setObstacle() {
    if (!F) return;
    if (obstacle.value) {
      if (sceneKey === 'obstacle') build();
      else addDisc();
    } else clearSolids(F);
    draw();
  }

  function kick() {
    const H = F.ny / F.nx;
    splat(F, 0.35, 0.5 * H, 0, 3, 0.06);
    splat(F, 0.65, 0.5 * H, 0, -3, 0.06);
  }

  // Drag: a velocity impulse equal to the pointer's velocity, spread over a
  // Gaussian of radius 0.045, scaled so that ~60 events per second add the
  // pointer's speed once.
  let lastT = 0;
  function onDrag({ gx, gy, dgx, dgy, first, inside }) {
    const now = performance.now();
    const dtEv = first ? 1 / 60 : Math.max(1 / 240, Math.min(0.1, (now - lastT) / 1000));
    lastT = now;
    if (!inside || first) return;
    const hh = F.h;
    let vx = (dgx * hh) / dtEv;
    let vy = (dgy * hh) / dtEv;
    const s = Math.hypot(vx, vy);
    if (s > 6) {
      vx *= 6 / s;
      vy *= 6 / s;
    }
    const w = Math.min(1, dtEv * 60);
    splat(F, gx * hh, gy * hh, vx * w, vy * w, 0.045);
    if (!loop.playing && !gen) loop.play();
  }

  // ---- stepping ----
  function paddleSplat(dt) {
    const H = F.ny / F.nx;
    paddle += dt * AUTO_OMEGA;
    const c = Math.cos(paddle);
    const s = Math.sin(paddle);
    splat(F, 0.5 + 0.28 * c, 0.5 * H + 0.28 * Math.min(1, H) * s, -AUTO_FORCE * dt * s, AUTO_FORCE * dt * c, 0.05);
  }

  function finishStage() {
    if (!gen) return;
    for (let r = gen.next(); !r.done; r = gen.next());
    gen = null;
    stageName = '';
  }

  function tick() {
    if (gen) finishStage();
    frameNo++;
    if (frameNo % stepEvery !== 0) return;
    const dt = dtS.value;
    if (auto.value) paddleSplat(dt);
    const t0 = performance.now();
    step(F, dt, params);
    const ms = performance.now() - t0;
    msEma = msEma ? 0.9 * msEma + 0.1 * ms : ms;
    // Over budget (a slow phone or the desktop grid): step every other frame.
    stepEvery = msEma > 12 ? 2 : 1;
    draw();
  }

  // One stage of a step (advect, forces, viscosity, project).
  function stageStep() {
    loop.pause();
    const dt = dtS.value;
    if (!gen) {
      if (auto.value) paddleSplat(dt);
      gen = stepPhases(F, dt, params);
    }
    for (;;) {
      const r = gen.next();
      if (r.done) {
        gen = null;
        stageName = '';
        break;
      }
      const e = r.value;
      if (e.t === 'enter' && e.kind === 'phase') stageName = e.label;
      else if (e.t === 'leave' && e.kind === 'phase') break;
    }
    draw(true);
  }

  // ---- drawing ----
  function draw(staged = false) {
    if (!F || !view) return;
    const d = F.diag;
    const solid = F.solid;
    const mode = colour.value;
    if (mode === 'dye') {
      paintDye(view, F.dyes, solid);
      leg.el.hidden = true;
    } else {
      leg.el.hidden = false;
      if (leg.kind !== 'div') leg.setKind('div');
      if (mode === 'vorticity') {
        const w = vorticity(F);
        const m = Math.max(1e-6, maxAbs(w, solid));
        vortScale = 0.85 * vortScale + 0.15 * m;
        view.draw(w, { map: 'div', lo: -vortScale, hi: vortScale, solid });
        leg.set(`−${num(vortScale, 2)}`, 'ω = 0', `+${num(vortScale, 2)}`);
      } else if (mode === 'divergence') {
        maxDivergence(F); // fills F.g.div
        // Scale: the divergence the last projection started from, so a
        // converged projection reads as blank and a leaky one does not.
        const m = Math.max(1e-9, d.divBefore || maxAbs(F.g.div, solid));
        view.draw(F.g.div, { map: 'div', lo: -m, hi: m, solid });
        leg.set(`−${num(m, 2)}`, '∇·u = 0', `+${num(m, 2)}`);
      } else {
        const mean = meanOf(F.p, solid);
        let m = 0;
        for (let k = 0; k < F.p.length; k++) if (!solid[k]) m = Math.max(m, Math.abs(F.p[k] - mean));
        m = Math.max(m, 1e-9);
        view.draw(F.p, { map: 'div', lo: mean - m, hi: mean + m, solid });
        leg.set(`−${num(m, 2)}`, 'mean p', `+${num(m, 2)}`);
      }
    }
    // readouts
    rdMs.set(msEma ? `${msEma.toFixed(2)} ms${stepEvery > 1 ? ' (every 2nd frame)' : ''}` : '–');
    // Before the first step (or mid-step) the step's diagnostics are stale:
    // measure the current fields instead.
    const fresh = staged || !d.step;
    rdCfl.set(fresh ? cflNumber(F, dtS.value) : d.cfl);
    const ke = fresh ? kineticEnergy(F) : d.ke;
    rdKe.set(ke);
    rdEns.set(fresh ? enstrophy(F) : d.enstrophy);
    const leaky = params.project && d.divRel > 0.05;
    rdDiv.set(!params.project ? 'not projected' : d.step ? num(d.divRel, 2) : '–', !params.project || leaky ? 'bad' : d.step ? 'good' : '');
    rdIt.set(params.project && d.step ? String(d.pressureIters) : '–');
    if (SCENES[sceneKey].closed && dye0 > 0) {
      const rel = dyeTotal(F, 0) / dye0 - 1;
      rdDye.set(sceneKey === 'swirl' ? 'sources and decay: n/a' : pct(rel));
    } else rdDye.set('open boundary: n/a');
    // narration
    keHist = keHist ? 0.98 * keHist + 0.02 * ke : ke;
    let msg = '';
    if (staged && stageName) {
      const dv = maxDivergence(F);
      msg = `Stage done: ${stageName}. Now max |∇·u| = ${num(dv, 2)}${stageName === 'Project' ? ', the projection has removed the divergence the other stages made' : stageName === 'Forces' ? ': the forces are not divergence-free' : ''}. Press again for the next stage.`;
    } else if (staged) {
      msg = `Step ${d.step} complete. Press again to start the next step at the advection stage.`;
    } else if (!params.project) msg = 'No projection: the velocity is not divergence-free, so the dye piles up in some places and thins out in others.';
    else if (leaky) msg = `Incomplete projection: ${Math.round(100 * d.divRel)} % of the divergence survives each step. The flow is compressible at large scales.`;
    else if (eps.value >= 2 && d.step > 120 && ke > 1.02 * keHist && !auto.value) msg = `Confinement ε = ${eps.value.toFixed(1)} is adding energy to a closed, unforced box: kinetic energy is rising on its own.`;
    else if (d.cfl > 1) msg = `CFL ${d.cfl.toFixed(1)}: the fastest fluid crosses ${d.cfl.toFixed(1)} cells per step, and the solver is still stable.`;
    else if (!loop.playing) msg = 'Paused. Press Run, or "Step one stage" to take a step one stage at a time.';
    else msg = 'Drag across the field to stir it. The readouts update every step.';
    if (msg !== lastStatus) {
      f.status.textContent = msg;
      lastStatus = msg;
    }
  }

  build();
  return () => view?.destroy();
}
