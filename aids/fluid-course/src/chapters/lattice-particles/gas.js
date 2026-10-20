// lattice-particles-gas: Boolean lattice gases, HPP (square, 1973) against
// FHP (triangular, 1986), on the test that separates them: a sinusoidal
// shear wave should decay at the same rate whichever way it points. Each
// site holds one bit per velocity; collisions and streaming are integer
// operations, so mass and momentum are conserved exactly. The kernel is
// src/sims/ch-lattice-particles-gas.js (createGas, step, waveAmplitude,
// coarseGrain, fhpViscosity, fitDecay).
//
// The picture is the flow velocity along the wave, averaged over boxes of
// about 6 x 6 sites (the raw bits are pure noise). The plot is the wave's
// amplitude A(t)/U; for FHP the dashed curve is exp(-nu k^2 t) with the
// Boltzmann-approximation viscosity nu(d).
//
// data-preset: '' (HPP, wave varying along y: never decays), 'hpp-diag'
// (HPP, wave at 45 degrees: decays), 'fhp' (flow along x), 'fhp-y'.

import { h, fmt } from '../../kit/dom.js';
import { frame, segmented, slider, readout, playButton, button, animate } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { Plot } from '../../kit/plot.js';
import { GAS_MODELS, createGas, step, waveAmplitude, coarseGrain, totals, fhpViscosity, fitDecay } from '../../sims/ch-lattice-particles-gas.js';
import { governor } from './common.js';

const NB = 21; // boxes per side
const HMAX = 800; // amplitude samples kept
const EVERY = 10; // steps per sample
const TMAX = HMAX * EVERY;
const RATE = 400; // steps per second wanted
const U = 0.25;

const PRESETS = {
  '': { model: 'hpp', wave: 'flow-x' },
  'hpp-diag': { model: 'hpp', wave: 'diag' },
  fhp: { model: 'fhp', wave: 'flow-x' },
  'fhp-y': { model: 'fhp', wave: 'flow-y' },
};

export function mountGas(fig, { signal }) {
  const p0 = PRESETS[fig.dataset.preset] || PRESETS[''];
  const f = frame(fig, { title: 'Lattice gases: does the lattice show?', wide: true });
  f.stage.classList.add('cols');
  const cfg = { ...p0, d: 0.25, seed: 1 };

  let gas = null, m0 = null, nuFit = NaN;
  const ue = new Float64Array(NB * NB);
  const hT = new Float64Array(HMAX), hA = new Float64Array(HMAX), thA = new Float64Array(HMAX);
  let hN = 0;
  const tot = {};

  const view = new FieldView(f.stage, { nx: NB, ny: NB, smooth: true, maxHeight: 360, minHeight: 200, label: 'Velocity along the shear wave, averaged over small boxes of lattice sites: a sinusoidal pattern of stripes, speckled by the noise of the individual particles.' });
  const plotBox = h('div.lp-plot');
  plotBox.style.cssText = 'display:grid;gap:6px;min-width:0;align-content:start';
  f.stage.append(plotBox);
  const plot = new Plot(plotBox, {
    x: { label: 'time step', min: 0, max: 3000 },
    y: { label: 'wave amplitude A / U', min: -0.1, max: 1.1 },
    aspect: 1.3,
    label: 'Amplitude of the shear wave against time step; for FHP the dashed curve is the decay that the Boltzmann-approximation viscosity predicts.',
  });

  function build() {
    gas = createGas({ model: cfg.model, wave: cfg.wave, density: cfg.d, U, seed: cfg.seed });
    m0 = totals(gas, {});
    hN = 0;
    nuFit = NaN;
    sample();
  }
  function sample() {
    if (hN === HMAX) return;
    hT[hN] = gas.t;
    hA[hN] = waveAmplitude(gas) / U;
    thA[hN] = gas.model === 'fhp' ? Math.exp(-fhpViscosity(cfg.d) * gas.k * gas.k * gas.t) : NaN;
    hN++;
  }
  function draw() {
    coarseGrain(gas, NB, ue);
    view.draw(ue, { map: 'div', lo: -1.6 * U, hi: 1.6 * U });
    const tEnd = hN ? hT[hN - 1] : 0;
    plot.setAxes({ x: { min: 0, max: Math.max(3000, Math.ceil(tEnd / 1000) * 1000) } });
    plot.draw([
      gas.model === 'fhp' ? { x: hT.subarray(0, hN), y: thA.subarray(0, hN), color: 'muted', dash: [6, 4], label: `exp(−νk²t), ν = ${fhpViscosity(cfg.d).toFixed(3)}` } : null,
      { x: hT.subarray(0, hN), y: hA.subarray(0, hN), color: gas.model === 'fhp' ? 's1' : 's2', label: `${gas.model.toUpperCase()}, ${cfg.wave === 'diag' ? 'wave at 45°' : cfg.wave === 'flow-x' ? 'flow along x' : 'flow along y'}` },
    ]);
  }
  view.redraw = () => gas && draw();

  // ---- readouts
  const ro = {
    t: readout(f.readouts, { label: 'step', fmt: (v) => String(v) }),
    A: readout(f.readouts, { label: 'A / U', fmt: (v) => v.toFixed(3), title: 'Current amplitude of the shear wave over its starting value' }),
    nu: readout(f.readouts, { label: 'ν measured', fmt: (v) => (Number.isFinite(v) ? (Math.abs(v) < 5e-4 ? '0 (no decay)' : v.toFixed(3)) : '–'), title: 'Viscosity from a fit of ln A against time while A/U > 0.2' }),
    th: readout(f.readouts, { label: 'ν theory (FHP)', fmt: (v) => (Number.isFinite(v) ? v.toFixed(3) : '–'), title: 'FHP-I viscosity in the Boltzmann approximation, 1/(12 d (1 − d)³) − 1/8; it ignores correlations between particles' }),
    dm: readout(f.readouts, { label: 'Δ particles', fmt: (v) => String(v), title: 'Change in the number of particles since the start: exactly zero' }),
    dp: readout(f.readouts, { label: 'Δ momentum', fmt: (v) => (Math.abs(v) < 1e-9 ? '0' : v.toExponential(1)), title: 'Change in total momentum since the start: zero to round-off' }),
  };
  function report() {
    totals(gas, tot);
    const A = hN ? hA[hN - 1] : 1;
    // fit while A/U > 0.2 (above the noise)
    let n = 0;
    while (n < hN && hA[n] > 0.2) n++;
    nuFit = n >= 10 && hT[n - 1] >= 300 ? fitDecay(hT.subarray(0, n), hA.subarray(0, n), gas.k).nu : NaN;
    ro.t.set(gas.t);
    ro.A.set(A);
    ro.nu.set(nuFit);
    ro.th.set(gas.model === 'fhp' ? fhpViscosity(cfg.d) : NaN);
    ro.dm.set(tot.mass - m0.mass, tot.mass !== m0.mass ? 'bad' : 'good');
    ro.dp.set(Math.hypot(tot.px - m0.px, tot.py - m0.py));
    const name = GAS_MODELS[gas.model].name;
    if (gas.model === 'hpp' && cfg.wave !== 'diag')
      f.status.textContent = `${name}: after ${gas.t} steps the wave has not decayed at all (A/U = ${A.toFixed(3)}). The momentum along every lattice row is conserved separately, so a wave lined up with the lattice cannot diffuse.`;
    else if (gas.model === 'hpp') f.status.textContent = `${name}: the same wave turned through 45° decays${Number.isFinite(nuFit) ? ` with ν ≈ ${nuFit.toFixed(2)}` : ''}. The viscosity depends on direction: the lattice shows.`;
    else f.status.textContent = `${name}: the wave decays${Number.isFinite(nuFit) ? ` with ν ≈ ${nuFit.toFixed(3)}` : ''}, the same along x and along y; the Boltzmann-approximation theory gives ${fhpViscosity(cfg.d).toFixed(3)}.`;
  }

  // ---- loop
  const gov = governor({ budgetMs: 5, guess: 0.3 });
  let acc = 0;
  const loop = animate(
    fig,
    (dt) => {
      if (gas.t >= TMAX) {
        loop.pause();
        return;
      }
      acc += dt * RATE;
      let n = gov.fit(Math.floor(acc / EVERY) * EVERY);
      n -= n % EVERY;
      if (n === 0 && acc >= EVERY) n = EVERY;
      acc = Math.min(acc - n, 4 * EVERY);
      const t0 = performance.now();
      for (let s = 0; s < n; s += EVERY) {
        step(gas, EVERY);
        sample();
      }
      gov.record(n, performance.now() - t0);
      draw();
      report();
    },
    { signal },
  );

  // ---- controls
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Reset', onClick: () => restart() });
  const waveSeg = segmented(f.controls, {
    label: 'Wave',
    options: [['flow-x', 'flow along x'], ['flow-y', 'flow along y'], ['diag', 'at 45° (HPP)']],
    value: cfg.wave,
    onChange: (v) => {
      cfg.wave = v;
      if (v === 'diag' && cfg.model !== 'hpp') {
        cfg.model = 'hpp';
        modelSeg.set('hpp', { silent: true });
      }
      restart();
    },
  });
  const modelSeg = segmented(f.controls, {
    label: 'Lattice',
    options: [['hpp', 'HPP (square)'], ['fhp', 'FHP (hexagonal)']],
    value: cfg.model,
    onChange: (v) => {
      cfg.model = v;
      if (v === 'fhp' && cfg.wave === 'diag') {
        cfg.wave = 'flow-x';
        waveSeg.set('flow-x', { silent: true });
      }
      restart();
    },
  });
  slider(f.controls, {
    label: 'Occupation d',
    min: 0.1,
    max: 0.5,
    step: 0.01,
    value: cfg.d,
    fmt: (v) => fmt(v, 2),
    onInput: (v) => {
      cfg.d = v;
      restart();
    },
  });

  function restart() {
    build();
    acc = 0;
    draw();
    report();
  }
  build();
  draw();
  report();
  return () => {
    loop.destroy();
    view.destroy();
    plot.box.destroy();
  };
}
