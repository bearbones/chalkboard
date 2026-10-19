// continuum-sample: from molecules to a continuum. A soft-disk molecular
// dynamics box (src/sims/molecules.js, 400 WCA disks, periodic) is cut into
// averaging cells; each cell shows its mean velocity (an arrow) and how far
// its molecule count is from the average (a tint). The log–log panel puts
// two measured noises beside the 1/√N law:
//   - density noise σ_N/⟨N⟩ of an ideal gas (Poisson points, densitySweep),
//   - the thermal noise of the cell-mean velocity in the MD box, in units of
//     the thermal speed √(k_BT/m), accumulated live for each cell size.
// In the "Hidden vortices" preset the box also carries a Taylor–Green flow;
// its amplitude is found by projecting every molecule's velocity onto the
// pattern, and drawn as a horizontal line: cells whose noise sits below the
// line show the vortices.

import { fmt } from '../../kit/dom.js';
import { frame, slider, segmented, toggle, button, readout, playButton, canvasBox, animate, sliced } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';
import { createMD, mdStep, mdEnergy, MD_PRESETS, createCellAverages, cellAverages, createPoissonGas, densitySweep } from '../../sims/molecules.js';
import { boxRect, drawMolecules, drawBoxFrame } from './md-view.js';

const NXS = [1, 2, 3, 4, 6, 8, 12, 16, 24];
const nyOf = (nx) => Math.max(1, Math.round(nx / 1.5));
const ELLS = [1, Math.SQRT2, 2, 2 * Math.SQRT2, 4, 4 * Math.SQRT2, 8, 8 * Math.SQRT2, 16];

const PRESETS = {
  default: { flow: 'equilibrium', k: 6 },
  equilibrium: { flow: 'equilibrium', k: 6 },
  vortex: { flow: 'vortex', k: 3 },
  noisy: { flow: 'vortex', k: 8 },
  coarse: { flow: 'vortex', k: 1 },
};

const sinc = (z) => (z === 0 ? 1 : Math.sin(z) / z);

export function mountSample(fig, { signal }) {
  const preset = PRESETS[fig.dataset.preset] || PRESETS.default;
  const f = frame(fig, { title: 'Averaging molecules into a continuum', wide: true });
  f.stage.classList.add('cols');
  const box = canvasBox(f.stage, { aspect: 1.45, minHeight: 200, maxHeight: 420, label: 'A box of 400 soft disks in thermal motion, divided into averaging cells. Each cell shows an arrow for its mean velocity and a tint for how its molecule count differs from the average.' });
  const plotWrap = document.createElement('div');
  f.stage.append(plotWrap);
  const plot = new Plot(plotWrap, {
    x: { label: 'molecules per sample N', min: 0.5, max: 1000, log: true },
    y: { label: 'relative noise', min: 0.01, max: 2, log: true },
    aspect: 1.25,
    label: 'Log–log plot of relative noise against the number of molecules in the sample, with the line 1 over root N',
  });

  let flow = preset.flow;
  let k = preset.k;
  let md = null;
  const E = {};
  const avgs = NXS.map((nx) => createCellAverages(nx, nyOf(nx)));
  const noiseSum = new Float64Array(NXS.length);
  const noiseCnt = new Float64Array(NXS.length);
  const noiseX = new Float64Array(NXS.length);
  const noiseY = new Float64Array(NXS.length);
  let nNoise = 0;
  let amp = 0; // Taylor–Green amplitude from the projection
  let ampDen = 1; // Σ|pattern|² over molecules, for the projection's own noise
  let showMol = true;
  const lineX = [0.5, 1000];
  const lineY = [1 / Math.sqrt(0.5), 1 / Math.sqrt(1000)];
  const densX = [];
  const densY = [];
  const rect = { s: 1, x: 0, y: 0, w: 1, h: 1 };
  let tempEMA = 1;

  function restart() {
    md = createMD({ ...MD_PRESETS[flow].params, seed: 1 });
    noiseSum.fill(0);
    noiseCnt.fill(0);
    nNoise = 0;
    mdEnergy(md, E);
    tempEMA = E.temperature;
    amp = flow === 'vortex' ? projectAmp() : 0;
    cellAverages(md, NXS[k], nyOf(NXS[k]), avgs[k]);
  }

  // Amplitude of the Taylor–Green pattern in the molecular velocities.
  function projectAmp() {
    const kx = (2 * Math.PI) / md.Lx;
    const ky = (2 * Math.PI) / md.Ly;
    const r = kx / ky;
    let num = 0;
    let den = 0;
    for (let i = 0; i < md.N; i++) {
      const sx = Math.sin(kx * md.x[i]);
      const cx = Math.cos(kx * md.x[i]);
      const sy = Math.sin(ky * md.y[i]);
      const cy = Math.cos(ky * md.y[i]);
      const fx = sx * cy;
      const fy = -r * cx * sy;
      num += md.vx[i] * fx + md.vy[i] * fy;
      den += fx * fx + fy * fy;
    }
    ampDen = den;
    return num / den;
  }

  segmented(f.controls, {
    label: 'Box',
    options: [
      ['equilibrium', 'Gas at rest'],
      ['vortex', 'Hidden vortices'],
    ],
    value: flow,
    onChange: (v) => {
      flow = v;
      restart();
      draw();
    },
  });
  slider(f.controls, {
    label: 'Averaging cells',
    min: 0,
    max: NXS.length - 1,
    step: 1,
    value: k,
    fmt: (v) => `${NXS[v]} × ${nyOf(NXS[v])}`,
    onInput: (v) => {
      k = Math.round(v);
      cellAverages(md, NXS[k], nyOf(NXS[k]), avgs[k]);
      draw();
    },
  });
  toggle(f.controls, {
    label: 'Show molecules',
    checked: true,
    onChange: (v) => {
      showMol = v;
      drawBox();
    },
  });
  button(f.controls, {
    label: 'Restart',
    kind: 'ghost',
    onClick: () => {
      restart();
      draw();
    },
  });

  const rCell = readout(f.readouts, { label: 'molecules per cell' });
  const rMeas = readout(f.readouts, { label: 'velocity noise, measured', title: 'rms cell-mean velocity component over √T, averaged since this cell size was chosen' });
  const rPred = readout(f.readouts, { label: 'velocity noise, 1/√N' });
  const rT = readout(f.readouts, { label: 'temperature T' });
  const rAmp = readout(f.readouts, { label: 'vortex speed A' });

  // ---- drawing ------------------------------------------------------------------
  function drawBox() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    boxRect(W, H, md.Lx, md.Ly, 4, rect);
    const nx = NXS[k];
    const ny = nyOf(nx);
    const a = avgs[k];
    const cw = rect.w / nx;
    const chh = rect.h / ny;
    const mean = md.N / (nx * ny);
    // density tint
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        const d = (a.count[c] - mean) / mean;
        ctx.fillStyle = pal.css(d > 0 ? 'div-pos' : 'div-neg', 0.6 * Math.min(1, Math.abs(d)));
        ctx.fillRect(rect.x + i * cw, rect.y + rect.h - (j + 1) * chh, cw, chh);
      }
    }
    if (showMol) drawMolecules(ctx, rect, md, { r: 0.4, fill: pal.css('particle', 0.55) });
    // grid
    ctx.strokeStyle = pal.css('ink', 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < nx; i++) {
      const px = Math.round(rect.x + i * cw) + 0.5;
      ctx.moveTo(px, rect.y);
      ctx.lineTo(px, rect.y + rect.h);
    }
    for (let j = 1; j < ny; j++) {
      const py = Math.round(rect.y + j * chh) + 0.5;
      ctx.moveTo(rect.x, py);
      ctx.lineTo(rect.x + rect.w, py);
    }
    ctx.stroke();
    drawBoxFrame(ctx, rect, pal, false);
    // mean-velocity arrows
    const S = 4 * rect.s; // px per unit speed
    const cap = 0.46 * Math.min(cw, chh);
    ctx.strokeStyle = pal.css('accent');
    ctx.fillStyle = pal.css('accent');
    ctx.lineWidth = Math.min(cw, chh) > 30 ? 2.5 : 1.6;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const c = i + j * nx;
        let ax = a.u[c] * S;
        let ay = a.v[c] * S;
        const L = Math.hypot(ax, ay);
        if (L > cap) {
          ax *= cap / L;
          ay *= cap / L;
        }
        const cxp = rect.x + (i + 0.5) * cw;
        const cyp = rect.y + rect.h - (j + 0.5) * chh;
        if (L < 1.5) {
          ctx.beginPath();
          ctx.arc(cxp, cyp, 1.6, 0, 2 * Math.PI);
          ctx.fill();
          continue;
        }
        arrow(ctx, cxp - ax / 2, cyp + ay / 2, cxp + ax / 2, cyp - ay / 2, Math.min(7, 0.4 * L + 2));
      }
    }
  }

  function drawPlot() {
    nNoise = 0;
    for (let q = 0; q < NXS.length; q++) {
      if (noiseCnt[q] < 20) continue;
      const v = Math.sqrt(noiseSum[q] / noiseCnt[q]);
      if (!(v > 0)) continue;
      noiseX[nNoise] = md.N / (NXS[q] * nyOf(NXS[q]));
      noiseY[nNoise] = v;
      nNoise++;
    }
    const series = [
      { x: lineX, y: lineY, color: 'ink', dash: [6, 4], width: 1.5, label: '1/√N', hover: false },
      { x: densX, y: densY, color: 's1', width: 0, points: 4.5, label: 'density noise, ideal gas' },
      { x: noiseX.subarray(0, nNoise), y: noiseY.subarray(0, nNoise), color: 's2', width: 0, points: 4.5, label: 'velocity noise, MD box' },
    ];
    if (flow === 'vortex') {
      const v = Math.max(0.011, Math.abs(amp) / Math.sqrt(tempEMA));
      series.push({ x: lineX, y: [v, v], color: 's3', dash: [2, 4], width: 2, label: 'vortex speed A/√T', hover: false });
    }
    plot.draw(series, { extra: markCurrent });
  }

  function markCurrent(ctx, tx, ty, area, pal) {
    const nc = md.N / (NXS[k] * nyOf(NXS[k]));
    const px = tx(nc);
    ctx.strokeStyle = pal.css('accent', 0.8);
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, area.y0);
    ctx.lineTo(px, area.y1);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = pal.css('accent');
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = px > (area.x0 + area.x1) / 2 ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('your cells', px + (ctx.textAlign === 'left' ? 4 : -4), area.y0 + 4);
  }

  let lastStatus = '';
  function updateText() {
    const nx = NXS[k];
    const ny = nyOf(nx);
    const nc = md.N / (nx * ny);
    rCell.set(fmt(nc, 3));
    const pred = Math.sqrt((1 / nc) * Math.max(0, 1 - nc / md.N));
    rPred.set(nx * ny === 1 ? '0 (total momentum)' : `${fmt(1 / Math.sqrt(nc), 2)} (${fmt(pred, 2)} with fixed total)`);
    if (flow === 'equilibrium' && noiseCnt[k] >= 20) rMeas.set(fmt(Math.sqrt(noiseSum[k] / noiseCnt[k]), 2));
    else rMeas.set(flow === 'equilibrium' ? 'measuring…' : 'only in the gas at rest');
    rT.set(fmt(tempEMA, 3));
    rAmp.set(flow === 'vortex' ? fmt(amp, 2) : '0');
    let s;
    const noise = Math.sqrt(tempEMA / nc);
    if (flow === 'equilibrium') {
      if (nx * ny === 1) s = 'One cell: its mean velocity is the total momentum of the box, which is exactly zero. No noise, and no information.';
      else if (nc < 3) s = `About ${fmt(nc, 2)} molecules per cell: each arrow is nearly one molecule's thermal velocity. Pure noise.`;
      else if (nx * ny <= 2) s = 'Two halves: the fixed total momentum forces them to cancel, so the measured noise dips below 1/√N.';
      else s = `${fmt(nc, 2)} molecules per cell: the arrows still jitter by about ${fmt(100 / Math.sqrt(nc), 2)}% of the thermal speed, though the gas is at rest.`;
    } else {
      const resolved = Math.abs(sinc(Math.PI / nx) * sinc(Math.PI / ny));
      if (resolved < 0.1) s = 'Too coarse: each cell spans a whole vortex, so the average wipes it out.';
      else if (Math.abs(amp) * resolved < 1.5 * noise) s = Math.abs(amp) < 2.5 * Math.sqrt(tempEMA / ampDen) ? 'The vortices have decayed into the thermal noise: viscosity has turned their motion into heat. Press Restart.' : 'Too fine: the vortices are there, but each cell holds so few molecules that its average is mostly noise.';
      else s = 'Small but not too small: each cell holds enough molecules to beat the noise, and is small enough to see the vortices.';
    }
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

  function measure() {
    const nx = NXS[k];
    const ny = nyOf(nx);
    const a = cellAverages(md, nx, ny, avgs[k]);
    mdEnergy(md, E);
    tempEMA += 0.05 * (E.temperature - tempEMA);
    if (flow === 'vortex') amp = projectAmp();
    else if (nx * ny > 1) {
      let s = 0;
      let n = 0;
      for (let c = 0; c < nx * ny; c++) {
        if (a.count[c] > 0) {
          s += 0.5 * (a.u[c] * a.u[c] + a.v[c] * a.v[c]);
          n++;
        }
      }
      noiseSum[k] += s / E.temperature;
      noiseCnt[k] += n;
    }
  }

  restart();
  box.onResize(drawBox);
  const loop = animate(
    fig,
    () => {
      mdStep(md, MD_PRESETS[flow].stepsPerFrame);
      measure();
      draw();
    },
    { signal },
  );
  playButton(f.controls, loop);
  draw();

  // Ideal-gas density noise, computed after first paint in small slices.
  function* densityJob() {
    yield;
    const gas = createPoissonGas({ n: 1, L: 160, dim: 2, seed: 1 });
    yield;
    const it = densitySweep(gas, ELLS, 200, 7);
    for (;;) {
      const r = it.next();
      if (r.done) return r.value;
      if (r.value.t === 'iter') {
        densX.push(r.value.expected);
        densY.push(r.value.relative);
        if (!loop.playing) drawPlot();
      }
      yield;
    }
  }
  sliced(densityJob(), { budgetMs: 4, signal }).catch(() => {});

  return () => {
    loop.destroy();
    box.destroy();
    plot.destroy();
  };
}
