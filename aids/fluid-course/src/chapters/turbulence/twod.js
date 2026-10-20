// turbulence-2d: two-dimensional incompressible flow in a doubly periodic
// box, run by the pseudo-spectral vorticity solver in src/sims/turbulence.js
// (64 x 64, integrating-factor RK4, 2/3 rule switchable). Left: vorticity,
// on a diverging scale fixed at the initial maximum. Right: the energy
// spectrum E(k) now and at t = 0, with k^-3 and k^-5/3 guides and the
// 2/3 cutoff. Readouts: time, E/E0, Z/Z0 (enstrophy), the energy-weighted
// mean wavenumber (falls as energy moves to large scales), the CFL number.
//
// data-preset: 'default' / 'decay' (random vortices that merge), 'aliased'
// (no 2/3 rule: blows up near t = 0.84), 'dealiased' (the same run with the
// rule), 'merger' (two vortices), 'shear-layer' (Kelvin–Helmholtz roll-up).

import { h } from '../../kit/dom.js';
import { frame, select, toggle, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { FieldView } from '../../kit/field.js';
import { gradientCss } from '../../kit/palette.js';
import { TURB2D_PRESETS, createTurb2D, stepTurb2D, turbVorticity, turbEnergy, turbEnstrophy, turbSpectrum, turbShells } from '../../sims/turbulence.js';
import { presetFor, num, vmark, now, reducedMotion } from './common.js';

const IDS = ['decay', 'aliased', 'dealiased', 'merger', 'shear-layer'];
const PRESETS = { default: { id: 'decay' } };
for (const id of IDS) PRESETS[id] = { id };
const NAMES = {
  decay: 'Decaying turbulence',
  aliased: 'Broken: no 2/3 rule, low viscosity',
  dealiased: 'Fixed: the same with the 2/3 rule',
  merger: 'Two vortices merge',
  'shear-layer': 'Double shear layer',
};
const T_END = { decay: 40, aliased: 3, dealiased: 3, merger: 12, 'shear-layer': 12 };

export function mountTwoD(fig, { signal }) {
  const pre = presetFor(fig, PRESETS);
  const cfg = { id: pre.id === 'default' ? 'decay' : pre.id };
  const f = frame(fig, { title: 'Two-dimensional turbulence: the energy goes up the scales', wide: true });
  f.stage.classList.add('cols');
  const colA = h('div');
  const colB = h('div');
  f.stage.append(colA, colB);

  // The solver is created once, in build(); the view only needs the size.
  const n0 = TURB2D_PRESETS[cfg.id].params.n;
  let s = null;
  const view = new FieldView(colA, { nx: n0, ny: n0, maxHeight: 360, minHeight: 200, label: 'Vorticity of a two-dimensional flow in a periodic box: positive (counter-clockwise) one colour, negative the other' });
  const bar = h('div.legend-bar', { 'aria-hidden': 'true', style: { background: gradientCss('div') } });
  const barLabels = h('div.legend-labels', { 'aria-hidden': 'true' }, h('span', 'clockwise'), h('span', '0'), h('span', 'counter-clockwise'));
  colA.append(h('div.legend-row', bar, barLabels));
  const spec = new Plot(colB, {
    x: { label: 'wavenumber k', log: true, min: 1, max: 48 },
    y: { label: 'E(k)', log: true },
    aspect: 1.15,
    minHeight: 220,
    label: 'Energy spectrum now and at the start, with k to the minus 3 and k to the minus five-thirds guides and the two-thirds cutoff',
  });

  // ---- controls
  select(f.controls, { label: 'Preset', options: IDS.map((id) => [id, NAMES[id]]), value: cfg.id, onChange: (v) => ((cfg.id = v), build(), reducedMotion() || loop.play()) });
  const deTg = toggle(f.controls, { label: '2/3 rule (dealias)', checked: TURB2D_PRESETS[cfg.id].params.dealias !== false, onChange: (v) => ((s.dealias = v), show()) });
  const loop = animate(fig, tick, { signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Restart', onClick: () => (build(), loop.play()) });

  // ---- readouts
  const rT = readout(f.readouts, { label: 'time t' });
  const rE = readout(f.readouts, { label: 'energy E/E₀', title: 'Kinetic energy over its initial value: nearly conserved in 2-D' });
  const rZ = readout(f.readouts, { label: 'enstrophy Z/Z₀', title: 'Mean squared vorticity over its initial value: cascades to small scales and is dissipated' });
  const rK = readout(f.readouts, { label: 'mean wavenumber Σk E / Σ E', title: 'Falls as energy moves to larger scales: the inverse cascade' });
  const rC = readout(f.readouts, { label: 'CFL number', title: 'max(|u|, |v|) Δt / Δx; the presets keep it at or below 0.5' });

  // ---- buffers
  let w, ns, kx, eNow, eInit, g3X, g3Y, g5X, g5Y, wMax, E0, Z0, blown, widened, yMax;

  function build() {
    s = createTurb2D(TURB2D_PRESETS[cfg.id].params);
    deTg.set(s.dealias, { silent: true });
    if (view.nx !== s.n) view.resize(s.n, s.n);
    w = new Float64Array(s.n * s.n);
    ns = turbShells(s);
    kx = new Float64Array(ns - 1);
    for (let k = 1; k < ns; k++) kx[k - 1] = k;
    eNow = new Float64Array(ns);
    eInit = new Float64Array(ns);
    turbSpectrum(s, eInit);
    eInit.copyWithin(0, 1);
    eNow.set(eInit);
    // guides anchored at the initial spectral peak
    let kp = 1;
    for (let k = 1; k < ns - 1; k++) if (eInit[k - 1] > eInit[kp - 1]) kp = k;
    const ep = eInit[kp - 1];
    g3X = Float64Array.from([kp, 48]);
    g3Y = Float64Array.from([ep, ep * (kp / 48) ** 3]);
    g5X = Float64Array.from([1, kp]);
    g5Y = Float64Array.from([ep * kp ** (5 / 3), ep]);
    turbVorticity(s, w);
    wMax = 0;
    for (let q = 0; q < w.length; q++) wMax = Math.max(wMax, Math.abs(w[q]));
    E0 = turbEnergy(s);
    Z0 = turbEnstrophy(s);
    blown = false;
    yMax = ep * 10;
    widened = false;
    spec.setAxes({ y: { min: Math.max(1e-14, ep * 1e-10), max: yMax } });
    spec.draw(
      [
        { x: g5X, y: g5Y, color: 's3', width: 1.5, dash: [2, 3], label: 'k^(−5/3)', hover: false, fit: false },
        { x: g3X, y: g3Y, color: 'ink', width: 1.5, dash: [6, 4], label: 'k⁻³', hover: false, fit: false },
        { x: kx, y: eInit, color: 'muted', width: 1.5, label: 'at t = 0', fit: false },
        { x: kx, y: eNow, color: 's1', width: 2.5, label: 'now', fit: false },
      ],
      { extra: marks },
    );
    view.redraw = drawField;
    show();
  }

  function marks(ctx, tx, ty, area, pal) {
    if (s.dealias) vmark(ctx, tx, area, pal, s.kmax, '2/3 cutoff', { color: 's2', align: 'right', top: false });
    vmark(ctx, tx, area, pal, s.n / 2, 'N/2', { color: 'muted', align: 'right' });
  }

  function drawField() {
    view.draw(w, { map: 'div', lo: -wMax, hi: wMax });
  }

  function tick() {
    if (blown || s.t >= T_END[cfg.id] - 1e-9) return loop.pause();
    const t0 = now();
    stepTurb2D(s);
    // a second step when the first was quick (a desktop), never on a phone
    if (now() - t0 < 2 && s.t < T_END[cfg.id] - 1e-9) stepTurb2D(s);
    show();
  }

  function show() {
    const E = turbEnergy(s);
    const Z = turbEnstrophy(s);
    if (!Number.isFinite(E) || E > 10 * E0) blown = true;
    turbVorticity(s, w);
    drawField();
    turbSpectrum(s, eNow);
    let sk = 0;
    let se = 0;
    for (let k = 1; k < ns; k++) {
      const e = eNow[k];
      sk += k * e;
      se += e;
      eNow[k - 1] = e;
    }
    // After a blow-up, widen the axis once so the runaway spectrum stays in view.
    if (blown && !widened) {
      let top = 0;
      for (let k = 0; k < ns - 1; k++) if (Number.isFinite(eNow[k])) top = Math.max(top, eNow[k]);
      if (top > yMax) spec.setAxes({ y: { max: top * 10 } });
      widened = true;
    }
    spec.render();
    rT.set(s.t.toFixed(2));
    rE.set(Number.isFinite(E) ? num(E / E0, 4) : '∞', E > 1.0001 * E0 || !Number.isFinite(E) ? 'bad' : '');
    rZ.set(Number.isFinite(Z) ? num(Z / Z0, 3) : '∞', Z > 1.0001 * Z0 || !Number.isFinite(Z) ? 'bad' : '');
    rK.set(se > 0 && Number.isFinite(sk / se) ? (sk / se).toFixed(2) : '–');
    rC.set(s.steps ? s.cfl.toFixed(2) : '–', s.cfl > 0.7 ? 'bad' : '');
    narrate(E, Z);
  }

  function narrate(E, Z) {
    let msg;
    if (blown) msg = `Blew up at t = ${s.t.toFixed(2)}: without the 2/3 rule, aliasing errors fed energy into the grid scale. Switch the rule on and press Restart.`;
    else if (E > 1.0001 * E0) msg = `Energy is rising (E/E₀ = ${(E / E0).toFixed(3)}), which viscosity forbids: aliasing at work.`;
    else if (s.t === 0) msg = 'Press Run.';
    else if (cfg.id === 'decay') msg = `Energy kept: ${(100 * E / E0).toFixed(1)} %. Enstrophy kept: ${(100 * Z / Z0).toFixed(1)} %. Like-signed vortices merge and the spectrum moves to low k.`;
    else msg = `Energy kept: ${(100 * E / E0).toFixed(1)} %. Enstrophy kept: ${(100 * Z / Z0).toFixed(1)} %.`;
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }

  build();
}
