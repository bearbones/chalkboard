// turbulence-shell: the Sabra shell model (src/sims/turbulence.js) running
// live. Shell n holds one complex velocity u_n at wavenumber k_n = 2^n; the
// first shell is forced, viscosity drains the top. After a spin-up the
// figure averages |u_n|^p at equal time intervals and shows
//   left:  the time-averaged spectrum E(k_n) = <|u_n|^2>/k_n with a k^(-5/3)
//          line (or compensated by k^(5/3)/eps^(2/3)), the instantaneous
//          values, k_eta and the last shell;
//   right: the scaling exponents zeta_p against K41's p/3 and the
//          She–Leveque formula (closed form), or the mean energy flux
//          Pi_n / eps through each shell.
// Readouts: time, samples, eps, k_eta, last shell / k_eta, the spectral
// slope, the mean flux over the inertial range, zeta_3 and zeta_6.
//
// Time step: sabraSuggestDt (safety 0.4) capped at a quarter of the
// estimated Kolmogorov time; samples are taken every Kolmogorov time, so the
// averages are time averages even though dt varies.
//
// data-preset: 'medium' (default), 'k41', 'short', 'truncated' (broken:
// the last shell is below k_eta, so energy piles up).

import { frame, slider, select, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { SABRA_PRESETS, createSabra, stepSabra, sabraSuggestDt, sabraAccumulate, sabraResetStats, sabraStats } from '../../sims/turbulence.js';
import { presetFor, num, label, vmark, now } from './common.js';

const SPIN = 5; // time units before averaging starts
const BUDGET = 4; // ms of stepping per frame
const EPS_GUESS = 0.85; // typical eps at forcing 0.5 (measured 0.72–0.93)

const pk = (id) => ({ shells: SABRA_PRESETS[id].params.shells, nu: SABRA_PRESETS[id].params.nu, f: 0.5 });
const PRESETS = {
  default: pk('medium'),
  medium: pk('medium'),
  k41: pk('k41'),
  short: pk('short'),
  truncated: { shells: 15, nu: SABRA_PRESETS.k41.params.nu, f: 0.5 },
};
const PRESET_OPTIONS = [
  ['medium', '20 shells, ν = 10⁻⁶'],
  ['k41', '22 shells, ν = 10⁻⁷ (long cascade)'],
  ['short', '16 shells, ν = 10⁻⁵ (short)'],
  ['truncated', 'Broken: 15 shells, ν = 10⁻⁷ (too few)'],
];

export function mountShell(fig, { signal }) {
  const pre = presetFor(fig, PRESETS);
  const cfg = { shells: pre.shells, nu: pre.nu, f: pre.f, view: 'raw', panel: 'zeta', preset: pre.id === 'default' ? 'medium' : pre.id };
  const f = frame(fig, { title: 'A cascade you can watch: the Sabra shell model', wide: true });
  f.stage.classList.add('cols');
  const colA = document.createElement('div');
  const colB = document.createElement('div');
  f.stage.append(colA, colB);

  const spec = new Plot(colA, {
    x: { label: 'shell wavenumber kₙ = 2ⁿ', log: true },
    y: { label: 'E(kₙ)', log: true },
    aspect: 1.25,
    minHeight: 230,
    label: 'Time-averaged energy spectrum of the shell model on log–log axes, with the instantaneous values, a k to the minus five-thirds reference line and the Kolmogorov wavenumber',
  });
  const side = new Plot(colB, {
    x: { label: 'order p', min: 0, max: 6.5 },
    y: { label: 'ζₚ', min: 0, max: 2.4 },
    aspect: 1.25,
    minHeight: 230,
    label: 'Scaling exponents zeta p of the shell model against Kolmogorov 1941 (p over 3) and the She–Leveque formula, or the energy flux through each shell',
  });

  // ---- controls
  const presetSel = select(f.controls, { label: 'Preset', options: PRESET_OPTIONS, value: cfg.preset, onChange: (v) => applyPreset(v) });
  const nuSl = slider(f.controls, { label: 'Viscosity ν', min: 1e-7, max: 1e-4, log: true, value: cfg.nu, fmt: (v) => num(v, 2), onInput: (v) => ((cfg.nu = v), build()) });
  const shSl = slider(f.controls, { label: 'Shells', min: 10, max: 24, step: 1, value: cfg.shells, fmt: (v) => String(Math.round(v)), onInput: (v) => ((cfg.shells = Math.round(v)), build()) });
  const fSl = slider(f.controls, { label: 'Forcing f', min: 0.25, max: 1, step: 0.05, value: cfg.f, fmt: (v) => v.toFixed(2), onInput: (v) => ((cfg.f = v), build()) });
  segmented(f.controls, { label: 'Spectrum', options: [['raw', 'E(k)'], ['comp', 'compensated']], value: cfg.view, onChange: (v) => ((cfg.view = v), layout()) });
  segmented(f.controls, { label: 'Right panel', options: [['zeta', 'exponents ζₚ'], ['flux', 'flux Πₙ/ε']], value: cfg.panel, onChange: (v) => ((cfg.panel = v), layout()) });
  const loop = animate(fig, tick, { signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Restart', onClick: () => build() });

  // ---- readouts
  const rT = readout(f.readouts, { label: 'time t' });
  const rN = readout(f.readouts, { label: 'samples averaged' });
  const rEps = readout(f.readouts, { label: 'ε (mean injection)', title: 'Mean power put in by the forcing; in a steady state it equals the dissipation rate' });
  const rKeta = readout(f.readouts, { label: 'k_η = (ε/ν³)^¼' });
  const rRes = readout(f.readouts, { label: 'last shell / k_η', title: 'Below about 1 the shells stop before the dissipation range' });
  const rSlope = readout(f.readouts, { label: 'spectral slope (K41: −1.667)', title: 'Least-squares slope of the averaged E(k_n) over the shaded inertial range' });
  const rFlux = readout(f.readouts, { label: 'mean Πₙ/ε, inertial range', title: 'Energy flux through each shell over the injection rate: 1 means everything put in at the top is passed down' });
  const rZ3 = readout(f.readouts, { label: 'ζ₃ (K41: 1)' });
  const rZ6 = readout(f.readouts, { label: 'ζ₆ (K41: 2)' });

  // ---- state and plot buffers (rebuilt only when a control changes)
  let s, st, S, kk, eAvg, eInst, refX, refY, fluxY, oneX, oneY, dtMax, dSample, nextSample, blown;
  const pX = Float64Array.from([1, 2, 3, 4, 5, 6]);
  const zY = new Float64Array(6);
  const k41X = Float64Array.from([0, 6.5]);
  const k41Y = Float64Array.from([0, 6.5 / 3]);
  const slX = new Float64Array(27);
  const slY = new Float64Array(27);
  for (let q = 0; q < 27; q++) {
    const p = (6.5 * q) / 26;
    slX[q] = p;
    slY[q] = p / 9 + 2 * (1 - (2 / 3) ** (p / 3)); // She & Leveque (1994), closed form
  }

  function applyPreset(id) {
    const p = PRESETS[id];
    cfg.preset = id;
    cfg.shells = p.shells;
    cfg.nu = p.nu;
    cfg.f = p.f;
    nuSl.set(cfg.nu, { silent: true });
    shSl.set(cfg.shells, { silent: true });
    fSl.set(cfg.f, { silent: true });
    build();
  }

  function build() {
    S = cfg.shells;
    s = createSabra({ shells: S, nu: cfg.nu, forcing: [[0, cfg.f, cfg.f]], dt: 3e-5, seed: 1 });
    const epsEst = EPS_GUESS * (cfg.f / 0.5) ** 1.5;
    const tauEta = Math.sqrt(cfg.nu / epsEst);
    dtMax = 0.25 * tauEta;
    dSample = tauEta;
    nextSample = SPIN;
    blown = false;
    st = null;
    kk = Float64Array.from(s.k);
    eAvg = new Float64Array(S).fill(NaN);
    eInst = new Float64Array(S);
    fluxY = new Float64Array(S).fill(NaN);
    refX = Float64Array.from([kk[0], kk[S - 1]]);
    refY = new Float64Array(2).fill(NaN);
    oneX = Float64Array.from([kk[0], kk[S - 1]]);
    oneY = Float64Array.from([1, 1]);
    zY.fill(NaN);
    layout();
    show();
  }

  // Axes and series for the current view (called on build and on view changes).
  function layout() {
    const kEtaGuess = (EPS_GUESS * (cfg.f / 0.5) ** 1.5 / cfg.nu ** 3) ** 0.25;
    if (cfg.view === 'raw') {
      const lo = Math.min(kEtaGuess, kk[S - 1]) ** (-5 / 3) * 1e-4;
      spec.setAxes({ x: { min: 1, max: kk[S - 1] }, y: { label: 'E(kₙ) = ⟨|uₙ|²⟩ / kₙ', min: 10 ** Math.floor(Math.log10(lo)), max: 10 } });
    } else {
      spec.setAxes({ x: { min: 1, max: kk[S - 1] }, y: { label: 'kₙ^(5/3) E(kₙ) / ε^(2/3)', min: 0.01, max: 10 } });
    }
    spec.draw(
      [
        { x: kk, y: eInst, color: 'muted', width: 0, points: 2.5, label: 'instantaneous', fit: false },
        { x: refX, y: refY, color: 'ink', width: 1.5, dash: [6, 4], label: cfg.view === 'raw' ? 'k^(−5/3) (K41)' : 'flat (K41)', hover: false, fit: false },
        { x: kk, y: eAvg, color: 's1', width: 2, points: 3.5, label: 'time average', fit: false },
      ],
      { extra: spectrumMarks },
    );
    if (cfg.panel === 'zeta') {
      side.setAxes({ x: { label: 'order p', min: 0, max: 6.5, log: false }, y: { label: 'ζₚ', min: 0, max: 2.4 } });
      side.draw(
        [
          { x: k41X, y: k41Y, color: 'ink', width: 1.5, dash: [6, 4], label: 'K41: p/3', hover: false },
          { x: slX, y: slY, color: 's3', width: 1.5, dash: [2, 3], label: 'She–Leveque 1994', hover: false },
          { x: pX, y: zY, color: 's1', width: 0, points: 4.5, label: 'measured ζₚ' },
        ],
        { extra: null },
      );
    } else {
      side.setAxes({ x: { label: 'shell wavenumber kₙ', min: 1, max: kk[S - 1], log: true }, y: { label: 'Πₙ / ε', min: -0.2, max: 1.4 } });
      side.draw(
        [
          { x: oneX, y: oneY, color: 'ink', width: 1.5, dash: [6, 4], label: 'all of ε passed on', hover: false },
          { x: kk, y: fluxY, color: 's2', width: 2, points: 3.5, label: 'mean flux Πₙ/ε' },
        ],
        { extra: fluxMarks },
      );
    }
  }

  function shadeRange(ctx, tx, area, pal) {
    if (!st || st.count < 50) return;
    const x0 = tx(kk[st.range[0]]);
    const x1 = tx(kk[st.range[1]]);
    ctx.fillStyle = pal.css('accent', 0.08);
    ctx.fillRect(x0, area.y0, x1 - x0, area.y1 - area.y0);
  }

  function spectrumMarks(ctx, tx, ty, area, pal) {
    shadeRange(ctx, tx, area, pal);
    const kEta = st && st.count > 0 ? st.kEta : NaN;
    if (Number.isFinite(kEta)) vmark(ctx, tx, area, pal, kEta, 'k_η', { color: 'accent', align: kEta > kk[S - 1] / 4 ? 'right' : 'left' });
    label(ctx, pal, 'forced', tx(1) + 4, area.y1 - 4, { size: 11 });
  }

  function fluxMarks(ctx, tx, ty, area, pal) {
    shadeRange(ctx, tx, area, pal);
    const kEta = st && st.count > 0 ? st.kEta : NaN;
    if (Number.isFinite(kEta)) vmark(ctx, tx, area, pal, kEta, 'k_η', { color: 'accent', align: kEta > kk[S - 1] / 4 ? 'right' : 'left' });
  }

  function tick() {
    if (blown) return loop.pause();
    const t0 = now();
    let n = 0;
    while (true) {
      const dt = sabraSuggestDt(s, 0.4, dtMax);
      stepSabra(s, dt);
      if (s.t >= nextSample) {
        if (nextSample === SPIN) sabraResetStats(s);
        sabraAccumulate(s);
        nextSample += dSample;
      }
      if ((++n & 63) === 0) {
        if (!Number.isFinite(s.uRe[S - 1] + s.uRe[0])) {
          blown = true;
          break;
        }
        if (now() - t0 > BUDGET) break;
      }
    }
    show();
  }

  function show() {
    const { uRe, uIm } = s;
    let finite = true;
    for (let n = 0; n < S; n++) {
      eInst[n] = (uRe[n] * uRe[n] + uIm[n] * uIm[n]) / kk[n];
      if (!Number.isFinite(eInst[n])) finite = false;
    }
    if (!finite) blown = true;
    const have = s.stats.count > 0;
    if (have) st = sabraStats(s, null, st);
    const eps = have ? st.eps : NaN;
    const comp = cfg.view === 'comp';
    const ce = comp ? Math.pow(Math.max(eps, 1e-12), -2 / 3) : 1;
    for (let n = 0; n < S; n++) {
      const c = comp ? Math.pow(kk[n], 5 / 3) * ce : 1;
      eAvg[n] = have ? st.E[n] * c : NaN;
      eInst[n] *= c;
      fluxY[n] = have ? st.flux[n] / eps : NaN;
    }
    // Reference line through the averaged spectrum at the start of the fit range.
    if (have && st.count >= 50) {
      const n1 = st.range[0];
      const a = eAvg[n1] / (comp ? 1 : Math.pow(kk[n1], -5 / 3));
      refY[0] = comp ? a : a * Math.pow(refX[0], -5 / 3);
      refY[1] = comp ? a : a * Math.pow(refX[1], -5 / 3);
    } else {
      refY[0] = NaN;
      refY[1] = NaN;
    }
    const ok = have && st.count >= 200;
    for (let p = 0; p < 6; p++) zY[p] = ok ? st.zeta[p] : NaN;
    spec.render();
    side.render();

    rT.set(s.t.toFixed(2));
    rN.set(have ? String(st.count) : `starts at t = ${SPIN}`);
    rEps.set(have ? num(eps, 3) : '–');
    const kEta = have ? st.kEta : NaN;
    rKeta.set(have ? num(kEta, 2) : '–');
    const res = kk[S - 1] / kEta;
    rRes.set(have ? num(res, 2) : '–', have ? (res < 1 ? 'bad' : 'good') : '');
    let fl = NaN;
    if (ok) {
      fl = 0;
      for (let n = st.range[0]; n <= st.range[1]; n++) fl += fluxY[n];
      fl /= st.range[1] - st.range[0] + 1;
    }
    const slope = ok ? -1 - st.zeta[1] : NaN;
    rSlope.set(ok ? slope.toFixed(3).replace('-', '−') : '–', ok && res < 1 ? 'bad' : '');
    rFlux.set(ok ? fl.toFixed(2) : '–');
    rZ3.set(ok ? st.zeta[2].toFixed(3) : '–');
    rZ6.set(ok ? st.zeta[5].toFixed(3) : '–');
    narrate(have, ok, res, slope);
  }

  function narrate(have, ok, res, slope) {
    let msg;
    if (blown) msg = `Blew up at t = ${s.t.toFixed(2)}. Press Restart.`;
    else if (!have) msg = `Spinning up: averaging starts at t = ${SPIN}, once the cascade has filled the shells.`;
    else if (!ok) msg = 'Collecting samples…';
    else if (res < 1) msg = `Under-resolved: the last shell stops below k_η, so energy piles up at the top and the slope flattens to ${slope.toFixed(2).replace('-', '−')}. Add shells or raise ν.`;
    else msg = `Averaging over t = ${SPIN}–${s.t.toFixed(0)}. Slope ${slope.toFixed(2).replace('-', '−')} against K41's −1.67; the gap is intermittency.`;
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }

  build();
}
