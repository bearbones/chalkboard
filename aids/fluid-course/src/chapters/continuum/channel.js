// continuum-channel: viscosity as the diffusion of momentum, measured in a
// box of molecules. The MD channel of src/sims/molecules.js (400 WCA disks,
// thermal walls) starts from rest. Either the walls slide (Couette) or a
// body force pushes the gas (Poiseuille). Slab averages of the molecular
// velocity are compared with the continuum start-up solution of
//   ∂u/∂t = ν ∂²u/∂y² + g,   u = wall velocity at y = 0 and y = L,
// a Fourier sine series (Carslaw & Jaeger 1959, Conduction of Heat in
// Solids, §3.3; the same series as heat conduction in a slab). Both curves
// pass through the same exponential moving average, so display smoothing
// lags them equally. ν = 1.1 σ²/τ is the value measured in these boxes
// (MD_PRESETS notes); after the Poiseuille flow settles, a long time
// average fits a parabola and reports ν = −g / (2·curvature).

import { fmt } from '../../kit/dom.js';
import { frame, slider, segmented, button, readout, playButton, canvasBox, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';
import { createMD, mdStep, mdEnergy, MD_PRESETS, createCellAverages, cellAverages, createAccumulator, resetAccumulator, accumulate, accumulatorAverages } from '../../sims/molecules.js';
import { boxRect, drawMolecules, drawBoxFrame } from './md-view.js';

const NU = 1.1; // σ²/τ, measured in these boxes (see MD_PRESETS)
const NS = 12; // slabs
const NT = 151; // Fourier terms
const MEMORY = 3; // τ, display smoothing
const SETTLE = { couette: 40, poiseuille: 100 }; // τ before the long average starts

const PRESETS = {
  default: { mode: 'couette', alpha: 1 },
  couette: { mode: 'couette', alpha: 1 },
  poiseuille: { mode: 'poiseuille', alpha: 1 },
  slip: { mode: 'poiseuille', alpha: 0 },
};

export function mountChannel(fig, { signal }) {
  const preset = PRESETS[fig.dataset.preset] || PRESETS.default;
  const f = frame(fig, { title: 'Momentum diffusing through molecules', wide: true });
  f.stage.classList.add('cols');
  const box = canvasBox(f.stage, { aspect: 2.4, minHeight: 140, maxHeight: 300, label: 'A channel of 400 soft disks between two walls, with an arrow for the mean velocity of each horizontal slab.' });
  const plotWrap = document.createElement('div');
  f.stage.append(plotWrap);
  const plot = new Plot(plotWrap, {
    x: { label: 'velocity u (σ/τ)', min: -1.3, max: 1.3 },
    y: { label: 'height y / L', min: 0, max: 1 },
    aspect: 1.3,
    label: 'Velocity profile across the channel: slab averages of the molecules beside the continuum solution',
  });

  let mode = preset.mode;
  let alpha = preset.alpha;
  let md = null;
  let spf = 20;
  const avg = createCellAverages(1, NS);
  const acc = createAccumulator(1, NS);
  const accOut = createCellAverages(1, NS);
  const emaMD = new Float64Array(NS);
  const emaTh = new Float64Array(NS);
  const ys = new Float64Array(NS); // slab centres, y / L
  const steadyX = new Float64Array(NS * 4 + 1);
  const steadyY = new Float64Array(NS * 4 + 1);
  const sinTab = new Float64Array(NS * NT);
  const coef = new Float64Array(NT + 1);
  const E = {};
  const rect = { s: 1, x: 0, y: 0, w: 1, h: 1 };
  let fit = null;
  let tempEMA = 1;
  let seed = 1;

  for (let j = 0; j < NS; j++) {
    ys[j] = (j + 0.5) / NS;
    for (let n = 1; n <= NT; n++) sinTab[j * NT + n - 1] = Math.sin(n * Math.PI * ys[j]);
  }

  function params() {
    if (mode === 'couette') return { ...MD_PRESETS.couette.params, flow: null, accommodation: alpha, seed };
    return { ...MD_PRESETS.poiseuille.params, accommodation: alpha, seed };
  }

  // Steady continuum profile with no slip, as a function of η = y/L.
  function steady(eta) {
    if (mode === 'couette') return md.wallU[0] + (md.wallU[1] - md.wallU[0]) * eta;
    return ((md.g * md.Ly * md.Ly) / (2 * NU)) * eta * (1 - eta);
  }

  function restart() {
    md = createMD(params());
    spf = mode === 'couette' ? MD_PRESETS.couette.stepsPerFrame : MD_PRESETS.poiseuille.stepsPerFrame;
    emaMD.fill(0);
    emaTh.fill(0);
    resetAccumulator(acc);
    fit = null;
    mdEnergy(md, E);
    tempEMA = E.temperature;
    // Sine coefficients of the steady profile: the transient starts at −steady.
    const L = md.Ly;
    for (let n = 1; n <= NT; n++) {
      const odd = n % 2 === 1;
      if (mode === 'couette') {
        const uB = md.wallU[0];
        const d = md.wallU[1] - md.wallU[0];
        coef[n] = (2 / (n * Math.PI)) * (uB * (odd ? 2 : 0) + d * (odd ? 1 : -1));
      } else {
        coef[n] = odd ? (4 * md.g * L * L) / (NU * n ** 3 * Math.PI ** 3) : 0;
      }
    }
    for (let q = 0; q < steadyX.length; q++) {
      const eta = q / (steadyX.length - 1);
      steadyY[q] = eta;
      steadyX[q] = steady(eta);
    }
    plot.setAxes({ x: mode === 'couette' ? { min: -1.3, max: 1.3 } : { min: -0.2, max: 2 } });
  }

  // Continuum start-up solution at slab j, time t.
  function theory(j, t) {
    const L = md.Ly;
    let w = 0;
    for (let n = 1; n <= NT; n++) {
      const c = coef[n];
      if (c === 0) continue;
      const e = Math.exp((-NU * n * n * Math.PI * Math.PI * t) / (L * L));
      if (e < 1e-9) break;
      w += c * sinTab[j * NT + n - 1] * e;
    }
    return steady(ys[j]) - w;
  }

  segmented(f.controls, {
    label: 'Drive',
    options: [
      ['couette', 'Sliding walls'],
      ['poiseuille', 'Pushed channel'],
    ],
    value: mode,
    onChange: (v) => {
      mode = v;
      restart();
      draw();
    },
  });
  slider(f.controls, {
    label: 'Wall grip α',
    min: 0,
    max: 1,
    step: 0.05,
    value: alpha,
    fmt: (v) => v.toFixed(2),
    onInput: (v) => {
      alpha = v;
      md.accommodation = v; // read by the kernel at every wall hit
      resetAccumulator(acc);
      fit = null;
      updateText();
    },
  });
  button(f.controls, {
    label: 'Restart',
    kind: 'ghost',
    title: 'Start again from rest with a fresh set of molecules',
    onClick: () => {
      seed++;
      restart();
      draw();
    },
  });

  const rTime = readout(f.readouts, { label: 'time t (τ)' });
  const rT = readout(f.readouts, { label: 'temperature T' });
  const rMid = readout(f.readouts, { label: 'mid-channel: molecules / continuum' });
  const rFit = readout(f.readouts, { label: 'long average' });
  const rSlip = readout(f.readouts, { label: 'slip at the walls' });
  const rSpf = readout(f.readouts, { label: 'steps per frame' });

  // ---- drawing ------------------------------------------------------------------
  function drawBox() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    boxRect(W, H, md.Lx, md.Ly, 8, rect);
    drawMolecules(ctx, rect, md, { r: 0.4, fill: pal.css('particle', 0.6) });
    drawBoxFrame(ctx, rect, pal, true);
    // wall motion
    if (mode === 'couette') {
      ctx.strokeStyle = pal.css('ink');
      ctx.fillStyle = pal.css('ink');
      ctx.lineWidth = 2;
      const len = Math.min(50, 0.15 * rect.w);
      const cx = rect.x + rect.w / 2;
      const dirT = Math.sign(md.wallU[1]);
      const dirB = Math.sign(md.wallU[0]);
      arrow(ctx, cx - (dirT * len) / 2, rect.y - 2.5, cx + (dirT * len) / 2, rect.y - 2.5, 6);
      arrow(ctx, cx - (dirB * len) / 2, rect.y + rect.h + 2.5, cx + (dirB * len) / 2, rect.y + rect.h + 2.5, 6);
    }
    // slab-mean arrows
    ctx.strokeStyle = pal.css('accent');
    ctx.fillStyle = pal.css('accent');
    ctx.lineWidth = 2.5;
    const S = 0.18 * rect.w;
    const x0 = rect.x + 0.5 * rect.w;
    for (let j = 0; j < NS; j++) {
      const py = rect.y + rect.h * (1 - ys[j]);
      const len = Math.max(-0.48 * rect.w, Math.min(0.48 * rect.w, emaMD[j] * S));
      if (Math.abs(len) > 2) arrow(ctx, x0 - len / 2, py, x0 + len / 2, py, 6);
    }
  }

  const mdX = new Float64Array(NS);
  function drawPlot() {
    mdX.set(emaMD);
    const series = [
      { x: steadyX, y: steadyY, color: 'muted', dash: [2, 4], width: 1.5, label: 'steady, no slip', hover: false },
      { x: emaTh, y: ys, color: 's2', dash: [7, 4], width: 2.5, label: `continuum, ν = ${NU}` },
      { x: mdX, y: ys, color: 's1', width: 2, points: 4, label: 'molecules (slab averages)' },
    ];
    plot.draw(series);
  }

  // Least-squares polynomial of degree 1 or 2 through the slab averages
  // (normal equations, Gaussian elimination; buffers allocated once).
  const fA = new Float64Array(9);
  const fb = new Float64Array(3);
  const fx = new Float64Array(3);
  function polyfit(u, deg) {
    const m = deg + 1;
    fA.fill(0);
    fb.fill(0);
    for (let j = 0; j < NS; j++) {
      const y = ys[j] * md.Ly;
      for (let r = 0; r < m; r++) {
        const pr = r === 0 ? 1 : r === 1 ? y : y * y;
        fb[r] += pr * u[j];
        for (let c = 0; c < m; c++) fA[r * m + c] += pr * (c === 0 ? 1 : c === 1 ? y : y * y);
      }
    }
    for (let p = 0; p < m; p++) {
      for (let r = p + 1; r < m; r++) {
        const q = fA[r * m + p] / fA[p * m + p];
        for (let c = p; c < m; c++) fA[r * m + c] -= q * fA[p * m + c];
        fb[r] -= q * fb[p];
      }
    }
    for (let r = m - 1; r >= 0; r--) {
      let s = fb[r];
      for (let c = r + 1; c < m; c++) s -= fA[r * m + c] * fx[c];
      fx[r] = s / fA[r * m + r];
    }
    return fx;
  }

  let lastStatus = '';
  function updateText() {
    rTime.set(fmt(md.t, 3));
    rT.set(fmt(tempEMA, 3));
    rSpf.set(String(spf));
    const jm = NS / 2;
    // Couette: half the difference between the top and bottom slabs (it
    // averages two slabs); Poiseuille: the two middle slabs.
    const mid = mode === 'couette' ? 0.5 * (emaMD[NS - 1] - emaMD[0]) : 0.5 * (emaMD[jm] + emaMD[jm - 1]);
    const midTh = mode === 'couette' ? 0.5 * (emaTh[NS - 1] - emaTh[0]) : 0.5 * (emaTh[jm] + emaTh[jm - 1]);
    rMid.set(`${fmt(mid, 2)} / ${fmt(midTh, 2)}`);
    const lbl = mode === 'couette' ? 'speed beside the walls: molecules / continuum' : 'centre speed: molecules / continuum';
    const dtEl = rMid.el.previousElementSibling;
    if (dtEl.textContent !== lbl) dtEl.textContent = lbl;
    if (fit) {
      rFit.set(mode === 'couette' ? `du/dy = ${fmt(fit.slope, 3)} (no slip: ${fmt(fit.slope0, 3)})` : `ν ≈ ${fmt(fit.nu, 3)} σ²/τ`);
      rSlip.set(fmt(fit.slip, 2));
    } else {
      rFit.set(md.t < SETTLE[mode] ? `starts at t = ${SETTLE[mode]}` : 'collecting…');
      rSlip.set('–');
    }
    let s;
    // Slowest mode excited by the start-up: n = 1 for the pushed channel;
    // n = 2 for walls sliding in opposite directions (the odd modes vanish).
    const tD = (md.Ly * md.Ly) / ((mode === 'couette' ? 4 : 1) * Math.PI * Math.PI * NU);
    if (alpha < 0.05) s = mode === 'couette' ? 'No grip: molecules bounce off the walls like mirrors, so the sliding walls pass on no momentum and the gas stays at rest.' : 'No grip: the walls cannot take any momentum away, so the whole gas slides as a plug and speeds up for ever.';
    else if (md.t < 0.3 * tD) s = mode === 'couette' ? 'The walls drag the nearest molecules; the momentum has not yet diffused into the middle.' : 'The push acts everywhere, but the walls hold the edges back.';
    else if (md.t < Math.min(SETTLE[mode], 3 * tD)) s = `${mode === 'couette' ? 'Momentum is diffusing in from both walls: the viscous time L²/(4π²ν) is about' : 'Momentum is diffusing to the walls: the viscous time L²/(π²ν) is about'} ${fmt(tD, 2)} τ.`;
    else s = mode === 'couette' ? 'Settled: a straight profile, as Newton supposed, with a little slip at each wall.' : 'Settled: the push is balanced by viscous friction, and the profile is a parabola.';
    if (s !== lastStatus) {
      f.status.textContent = s;
      lastStatus = s;
    }
  }

  function draw() {
    drawBox();
    drawPlot();
    updateText();
  }

  function advance() {
    const t0 = performance.now();
    mdStep(md, spf);
    const ms = performance.now() - t0;
    if (ms > 6 && spf > 6) spf = Math.max(6, Math.floor(spf * 0.8));
    else if (ms < 3 && spf < MD_PRESETS[mode].stepsPerFrame) spf++;
    cellAverages(md, 1, NS, avg);
    mdEnergy(md, E);
    tempEMA += 0.05 * (E.temperature - tempEMA);
    const a = 1 - Math.exp(-(spf * md.dt) / MEMORY);
    for (let j = 0; j < NS; j++) {
      emaMD[j] += a * (avg.u[j] - emaMD[j]);
      emaTh[j] += a * (theory(j, md.t) - emaTh[j]);
    }
    if (md.t >= SETTLE[mode] && alpha >= 0.05) {
      accumulate(acc, md);
      if (acc.samples >= 60 && acc.samples % 10 === 0) {
        const o = accumulatorAverages(acc, md, accOut);
        if (mode === 'couette') {
          const c = polyfit(o.u, 1);
          const slope0 = (md.wallU[1] - md.wallU[0]) / md.Ly;
          const uTop = c[0] + c[1] * md.Ly;
          const uBot = c[0];
          fit = { slope: c[1], slope0, slip: 0.5 * (md.wallU[1] - uTop + (uBot - md.wallU[0])) };
        } else {
          const c = polyfit(o.u, 2);
          const nu = -md.g / (2 * c[2]);
          const uw = 0.5 * (c[0] + c[0] + c[1] * md.Ly + c[2] * md.Ly * md.Ly);
          fit = { nu, slip: uw };
        }
      }
    }
  }

  restart();
  box.onResize(drawBox);
  const loop = animate(
    fig,
    () => {
      advance();
      draw();
    },
    { signal },
  );
  playButton(f.controls, loop);
  draw();
  return () => {
    loop.destroy();
    box.destroy();
    plot.destroy();
  };
}
