// turbulence-aliasing: viscous Burgers' equation u_t + u u_x = nu u_xx from
// u0 = sin x on [0, 2 pi), solved twice by the pseudo-spectral kernel in
// src/sims/spectral.js on the same grid with the same viscosity and step:
// once without the 2/3 rule and once with it. The front forms at x = pi,
// t = 1. Left: u(x) of both runs beside the exact Cole–Hopf solution
// (burgersExact, recomputed on 128 points every few frames). Right: their
// energy spectra E(k), with the 2/3 cutoff and the Nyquist wavenumber
// marked and a k^-2 guide (the spectrum of a jump).
// Readouts: E/E0 for each run (the true energy can only fall), the time at
// which the aliased run's energy first rose, and the share of energy in the
// top tenth of each run's band (the pile-up diagnostic).
//
// data-preset: 'default' (N = 128, nu = 0.002: the run without the rule
// blows up near t = 1.36), 'threshold' (nu = 0.005: it survives), 'pileup'
// (N = 256, nu = 0.004: energy piles up below Nyquist), 'front' (N = 256,
// nu = 0.02: resolved, the two runs agree).

import { h } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { BURGERS_PRESETS, createBurgers, stepBurgers, burgersField, burgersEnergy, burgersSpectrum, burgersExact, dealiasKmax } from '../../sims/spectral.js';
import { presetFor, num, vmark, reducedMotion } from './common.js';

const T_END = 4;
const RATE = 0.6; // simulated time per second of playback
const NX = 128; // exact-solution samples
const TAU = 2 * Math.PI;

const bp = (id) => ({ n: BURGERS_PRESETS[id].params.n, nu: BURGERS_PRESETS[id].params.nu, dt: BURGERS_PRESETS[id].params.dt });
const PRESETS = {
  default: bp('aliased'),
  aliased: bp('aliased'),
  threshold: { ...bp('aliased'), nu: 0.005 },
  pileup: bp('pileup'),
  front: bp('front'),
};
const PRESET_OPTIONS = [
  ['aliased', 'Broken: N = 128, ν = 0.002'],
  ['threshold', 'Just survives: N = 128, ν = 0.005'],
  ['pileup', 'Pile-up: N = 256, ν = 0.004'],
  ['front', 'Resolved: N = 256, ν = 0.02'],
];

export function mountAliasing(fig, { signal }) {
  const pre = presetFor(fig, PRESETS);
  const cfg = { n: pre.n, nu: pre.nu, dt: pre.dt, preset: pre.id === 'default' ? 'aliased' : pre.id };
  const f = frame(fig, { title: 'Aliasing in a spectral Burgers solver', wide: true });
  f.stage.classList.add('cols');
  const colA = h('div');
  const colB = h('div');
  f.stage.append(colA, colB);

  const prof = new Plot(colA, {
    x: { label: 'x', min: 0, max: TAU },
    y: { label: 'u', min: -1.6, max: 1.6 },
    aspect: 1.3,
    minHeight: 220,
    label: 'u against x for the run without the two-thirds rule, the run with it, and the exact solution',
  });
  const spec = new Plot(colB, {
    x: { label: 'wavenumber k', log: true, min: 1 },
    y: { label: 'E(k)', log: true, min: 1e-14, max: 1 },
    aspect: 1.3,
    minHeight: 220,
    label: 'Energy spectra of both runs on log–log axes, with the two-thirds cutoff and the Nyquist wavenumber marked',
  });

  // ---- controls
  select(f.controls, { label: 'Preset', options: PRESET_OPTIONS, value: cfg.preset, onChange: (v) => applyPreset(v) });
  const nuSl = slider(f.controls, { label: 'Viscosity ν', min: 1e-3, max: 0.1, log: true, value: cfg.nu, fmt: (v) => num(v, 2), onInput: (v) => ((cfg.nu = v), restart()) });
  const nSeg = segmented(f.controls, {
    label: 'Grid N',
    options: [['64', '64'], ['128', '128'], ['256', '256']],
    value: String(cfg.n),
    onChange: (v) => ((cfg.n = Number(v)), (cfg.dt = 0.64 / cfg.n), restart()),
  });
  const loop = animate(fig, tick, { signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Restart', onClick: () => restart(true) });

  // ---- readouts
  const rT = readout(f.readouts, { label: 'time t' });
  const rEa = readout(f.readouts, { label: 'E/E₀, no 2/3 rule', title: 'Viscous Burgers can only lose energy: a rise is the aliasing error at work' });
  const rEd = readout(f.readouts, { label: 'E/E₀, 2/3 rule' });
  const rRise = readout(f.readouts, { label: 'energy first rose (no rule)' });
  const rTopA = readout(f.readouts, { label: 'top-tenth energy share, no rule', title: 'Fraction of the energy in the top 10 % of the wavenumbers the run keeps' });
  const rTopD = readout(f.readouts, { label: 'top-tenth energy share, 2/3 rule' });

  // ---- state
  let A, D, n, half, xs, uA, uD, kx, sA, sD, guideX, guideY, E0, eaPrev, tRise, tBlow, simT, frames;
  const xe = new Float64Array(NX);
  const ue = new Float64Array(NX);
  for (let q = 0; q < NX; q++) xe[q] = (TAU * q) / NX;
  let exactT = -1;

  // A changed setting starts a fresh run (the Restart button always plays).
  function restart(force = false) {
    build();
    if (force || !reducedMotion()) loop.play();
  }

  function applyPreset(id) {
    const p = PRESETS[id];
    cfg.preset = id;
    cfg.n = p.n;
    cfg.nu = p.nu;
    cfg.dt = p.dt;
    nuSl.set(cfg.nu, { silent: true });
    nSeg.set(String(cfg.n), { silent: true });
    restart();
  }

  function build() {
    n = cfg.n;
    half = n / 2;
    A = createBurgers({ n, nu: cfg.nu, dt: cfg.dt, ic: 'sine', dealias: false });
    D = createBurgers({ n, nu: cfg.nu, dt: cfg.dt, ic: 'sine', dealias: true });
    xs = new Float64Array(n + 1);
    for (let j = 0; j <= n; j++) xs[j] = (TAU * j) / n;
    uA = new Float64Array(n + 1);
    uD = new Float64Array(n + 1);
    kx = new Float64Array(half);
    for (let k = 1; k <= half; k++) kx[k - 1] = k;
    sA = new Float64Array(half);
    sD = new Float64Array(half);
    guideX = Float64Array.from([1, half]);
    guideY = new Float64Array(2);
    E0 = burgersEnergy(A);
    eaPrev = E0;
    tRise = NaN;
    tBlow = NaN;
    simT = 0;
    frames = 0;
    exactT = -1;
    spec.setAxes({ x: { max: half } });
    prof.draw([
      { x: xe, y: ue, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact (Cole–Hopf)' },
      { x: xs, y: uA, color: 's1', width: 2, label: 'without 2/3 rule' },
      { x: xs, y: uD, color: 's2', width: 2, dash: [3, 2], label: 'with 2/3 rule' },
    ]);
    spec.draw(
      [
        { x: guideX, y: guideY, color: 'ink', width: 1.5, dash: [6, 4], label: 'k⁻² (a jump)', hover: false, fit: false },
        { x: kx, y: sA, color: 's1', width: 2, label: 'without 2/3 rule' },
        { x: kx, y: sD, color: 's2', width: 2, dash: [3, 2], label: 'with 2/3 rule' },
      ],
      { extra: marks },
    );
    show(true);
  }

  function marks(ctx, tx, ty, area, pal) {
    const km = dealiasKmax(n);
    vmark(ctx, tx, area, pal, km, '2/3 cutoff', { color: 's2', align: 'right', top: false });
    vmark(ctx, tx, area, pal, half, 'N/2', { color: 's1', align: 'right' });
  }

  function tick(dt) {
    if (D.t >= T_END - 1e-9) return loop.pause();
    simT = Math.min(T_END, simT + RATE * dt);
    let k = 0;
    while (D.t < simT - 1e-12 && k < 12) {
      stepBurgers(D);
      if (!Number.isFinite(tBlow)) {
        stepBurgers(A);
        const e = burgersEnergy(A);
        if (!Number.isFinite(tRise) && e > eaPrev * (1 + 1e-9)) tRise = A.t;
        eaPrev = e;
        if (!(e < 2 * E0)) tBlow = A.t;
      }
      k++;
    }
    show(false);
  }

  function topShare(sp, kTop) {
    let tot = 0;
    let top = 0;
    const k0 = Math.ceil(0.9 * kTop);
    for (let k = 1; k <= half; k++) {
      const v = sp[k - 1];
      tot += v;
      if (k >= k0) top += v;
    }
    return tot > 0 ? top / tot : NaN;
  }

  function show(force) {
    burgersField(A, uA);
    burgersField(D, uD);
    uA[n] = uA[0];
    uD[n] = uD[0];
    // spectra k = 1..N/2 (index 0 of the kernel's array is the mean)
    burgersSpectrumInto(A, sA);
    burgersSpectrumInto(D, sD);
    guideY[0] = sD[0];
    guideY[1] = sD[0] / (half * half);
    if (force || (frames++ % 6 === 0 && Math.abs(D.t - exactT) > 1e-9)) {
      burgersExact(xe, D.t, cfg.nu, ue, 1);
      exactT = D.t;
    }
    prof.render();
    spec.render();

    const ea = burgersEnergy(A) / E0;
    const ed = burgersEnergy(D) / E0;
    rT.set(D.t.toFixed(2));
    rEa.set(Number.isFinite(ea) ? ea.toFixed(4) : '∞', Number.isFinite(tBlow) || Number.isFinite(tRise) ? 'bad' : '');
    rEd.set(ed.toFixed(4));
    rRise.set(Number.isFinite(tRise) ? `t = ${tRise.toFixed(2)}` : 'never', Number.isFinite(tRise) ? 'bad' : 'good');
    const ta = topShare(sA, half - 1);
    const td = topShare(sD, dealiasKmax(n));
    rTopA.set(num(ta, 2), ta > 2 * td && ta > 1e-3 ? 'bad' : '');
    rTopD.set(num(td, 2));
    narrate();
  }

  // The kernel writes k = 0..N/2 into an array of N/2 + 1; this view wants
  // k = 1..N/2. A small scratch array keeps the copy allocation-free.
  let scratch = new Float64Array(0);
  function burgersSpectrumInto(s, out) {
    if (scratch.length !== half + 1) scratch = new Float64Array(half + 1);
    burgersSpectrum(s, scratch);
    for (let k = 1; k <= half; k++) out[k - 1] = scratch[k];
  }

  function narrate() {
    let msg;
    if (Number.isFinite(tBlow)) msg = `Without the 2/3 rule the energy, which can only fall, began to rise at t = ${tRise.toFixed(2)} and the run blew up at t = ${tBlow.toFixed(2)}. With the rule the same grid stays bounded.`;
    else if (Number.isFinite(tRise)) msg = `Without the 2/3 rule the energy rose at t = ${tRise.toFixed(2)}, which the true equation forbids; viscosity has held it so far.`;
    else if (D.t < 0.9) msg = 'The sine wave steepens towards a front at x = π (t = 1).';
    else msg = D.t >= T_END - 1e-9 ? 'Done. Both runs lost energy, as they must.' : 'Front formed; both runs are losing energy, as they should.';
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }

  build();
}
