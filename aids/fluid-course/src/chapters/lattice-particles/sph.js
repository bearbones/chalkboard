// lattice-particles-sph: a weakly compressible SPH dam break (sph.js preset
// 'dam-break': a column a = 1 m wide and 2a tall collapses along a dry floor
// in a tank 4a long). Every step is sph.js step(); the front is
// damBreakFront(), the density error, kernel sum and paired fraction come
// from diagnostics(). The reference is Ritter's shallow-water dry-bed front
// Z = 1 + 2T, which a real column trails at first (it starts from rest and
// is not shallow).
//
// data-preset: '' (Wendland kernel, continuity density with delta-SPH
// diffusion), 'noisy' (no density diffusion: spurious negative pressures),
// 'summation' (summation density: the free surface's half-empty kernels read
// as low density, negative pressure, and the surface clumps), 'cubic'.

import { h, fmt } from '../../kit/dom.js';
import { frame, select, slider, readout, playButton, button, animate, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { Plot } from '../../kit/plot.js';
import { createSPH, setParams, step, diagnostics, damBreakFront } from '../../sims/sph.js';
import { governor, fmtPct } from './common.js';

const DENSITY = {
  delta: { name: 'continuity + δ-SPH diffusion', opts: { density: 'continuity', densityDiffusion: 0.1 } },
  continuity: { name: 'continuity, no diffusion', opts: { density: 'continuity', densityDiffusion: 0 } },
  summation: { name: 'summation', opts: { density: 'summation', densityDiffusion: 0 } },
};
const PRESETS = {
  '': { density: 'delta', kernel: 'wendland' },
  noisy: { density: 'continuity', kernel: 'wendland' },
  summation: { density: 'summation', kernel: 'wendland' },
  cubic: { density: 'delta', kernel: 'cubic' },
};
const COLOURS = [['speed', 'speed'], ['pressure', 'pressure'], ['kernel', 'kernel sum']];
const NBUCKET = 16;
const HMAX = 400;
const XMIN = -0.2, XMAX = 4.2, YMIN = -0.2, YMAX = 2.6;

export function mountSph(fig, { signal }) {
  const p0 = PRESETS[fig.dataset.preset] || PRESETS[''];
  const f = frame(fig, { title: 'A dam break in smoothed particles', wide: true });
  f.stage.classList.add('cols');
  const cfg = { ...p0, resolution: 20, alpha: 0.05, colour: 'speed' };

  let S = null, pg = 1, blown = false;
  let bucket = null;
  const D = {}, F = {};
  const hT = new Float64Array(HMAX), hZ = new Float64Array(HMAX), rT = new Float64Array(2), rZ = new Float64Array(2);
  let hN = 0, lastSample = -1;

  function build() {
    S = createSPH({ preset: 'dam-break', resolution: cfg.resolution, kernel: cfg.kernel, alpha: cfg.alpha, ...DENSITY[cfg.density].opts });
    pg = S.rho0 * S.g * S.meta.H;
    bucket = new Uint8Array(S.nFluid);
    blown = false;
    hN = 0;
    lastSample = -1;
    sample();
  }
  function sample() {
    damBreakFront(S, F);
    if (hN < HMAX && F.T - lastSample >= 0.02) {
      hT[hN] = F.T;
      hZ[hN] = F.Z;
      hN++;
      lastSample = F.T;
    }
  }

  // ---- views
  const box = canvasBox(f.stage, { aspect: (XMAX - XMIN) / (YMAX - YMIN), minHeight: 200, maxHeight: 420, label: 'Particles of water collapsing from a column on the left along the floor of a tank, coloured by speed, pressure or kernel sum.' });
  const plotBox = h('div.lp-plot');
  plotBox.style.cssText = 'display:grid;gap:6px;min-width:0;align-content:start';
  f.stage.append(plotBox);
  const plot = new Plot(plotBox, {
    x: { label: 'T = t √(gH) / a', min: 0, max: 4 },
    y: { label: 'front Z = x / a', min: 1, max: 4.2 },
    aspect: 1.4,
    label: 'Position of the surge front against time, beside Ritter’s shallow-water front Z = 1 + 2T.',
  });
  rT[0] = 0;
  rT[1] = 1.6;
  rZ[0] = 1;
  rZ[1] = 4.2;

  // CSS colours of the buckets, rebuilt only when the theme or map changes
  let fillPal = null, fillDiv = false;
  const fillCache = new Array(NBUCKET);
  function bucketFills(pal, div) {
    if (pal !== fillPal || div !== fillDiv) {
      for (let b = 0; b < NBUCKET; b++) {
        const t = (b + 0.5) / NBUCKET;
        const c = div ? pal.div(2 * t - 1) : pal.seq(0.25 + 0.75 * t);
        fillCache[b] = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
      }
      fillPal = pal;
      fillDiv = div;
    }
    return fillCache;
  }
  function colourOf(i) {
    if (cfg.colour === 'speed') return Math.hypot(S.vx[i], S.vy[i]) / (2 * Math.sqrt(S.g * S.meta.H)); // 0..1 seq
    if (cfg.colour === 'pressure') return 0.5 + 0.5 * Math.max(-1, Math.min(1, S.p[i] / pg)); // div, centred
    return (S.kernelSum[i] - 0.5) / 0.6; // seq: 0.5 .. 1.1
  }
  function draw() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    const s = Math.min(W / (XMAX - XMIN), H / (YMAX - YMIN));
    const ox = (W - s * (XMAX - XMIN)) / 2 - XMIN * s, oy = H - (H - s * (YMAX - YMIN)) / 2 + YMIN * s;
    const r = Math.max(1, 0.55 * S.dx * s);
    // walls
    ctx.fillStyle = pal.css('solid');
    ctx.beginPath();
    for (let k = S.nFluid; k < S.nFluid + S.nWall; k++) {
      const y = S.y[k];
      if (y > YMAX) continue;
      ctx.rect(ox + S.x[k] * s - r, oy - y * s - r, 2 * r, 2 * r);
    }
    ctx.fill();
    // fluid, one path per colour bucket
    for (let i = 0; i < S.nFluid; i++) {
      const t = colourOf(i);
      bucket[i] = t > 0 ? (t < 1 ? (t * NBUCKET) | 0 : NBUCKET - 1) : 0;
    }
    const fills = bucketFills(pal, cfg.colour === 'pressure');
    for (let b = 0; b < NBUCKET; b++) {
      ctx.fillStyle = fills[b];
      ctx.beginPath();
      let any = false;
      for (let i = 0; i < S.nFluid; i++) {
        if (bucket[i] !== b) continue;
        const x = S.x[i], y = S.y[i];
        if (!(y < YMAX + 1)) continue;
        ctx.moveTo(ox + x * s + r, oy - y * s);
        ctx.arc(ox + x * s, oy - y * s, r, 0, 2 * Math.PI);
        any = true;
      }
      if (any) ctx.fill();
    }
    // the column's starting outline
    ctx.strokeStyle = pal.css('muted', 0.6);
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy - S.meta.H * s, S.meta.a * s, S.meta.H * s);
    ctx.setLineDash([]);
    plot.draw([
      { x: rT, y: rZ, color: 'muted', dash: [6, 4], label: 'Ritter: Z = 1 + 2T' },
      { x: hT.subarray(0, hN), y: hZ.subarray(0, hN), color: 's1', label: 'SPH front' },
    ]);
  }
  box.onResize(() => S && draw());

  // ---- readouts
  const ro = {
    t: readout(f.readouts, { label: 't', fmt: (v) => `${v.toFixed(3)} s` }),
    Z: readout(f.readouts, { label: 'front Z', fmt: (v) => v.toFixed(2), title: 'Furthest particle from the left wall, in column widths' }),
    neg: readout(f.readouts, { label: 'p < −0.05ρgH', fmt: (v) => fmtPct(v), title: 'Share of fluid particles with a clearly negative pressure: in water falling freely there should be almost none' }),
    rho: readout(f.readouts, { label: 'max |ρ/ρ₀ − 1|', fmt: (v) => fmtPct(v, 2), title: 'Largest density error: weak compressibility aims at about 1%' }),
    ks: readout(f.readouts, { label: 'min kernel sum', fmt: (v) => v.toFixed(2), title: 'Smallest Σ (m/ρ₀) W: 1 inside the water, well below 1 at a free surface where the kernel is cut off' }),
    pair: readout(f.readouts, { label: 'paired', fmt: (v) => fmtPct(v), title: 'Share of particles whose nearest neighbour is closer than half the initial spacing' }),
  };
  function negFraction() {
    let n = 0;
    const lim = -0.05 * pg;
    for (let i = 0; i < S.nFluid; i++) if (S.p[i] < lim) n++;
    return n / S.nFluid;
  }
  function report() {
    diagnostics(S, D);
    const neg = negFraction();
    ro.t.set(S.t);
    ro.Z.set(F.Z);
    ro.neg.set(neg, neg > 0.05 ? 'bad' : '');
    ro.rho.set(D.maxDensityError, D.maxDensityError > 0.03 ? 'bad' : '');
    ro.ks.set(D.kernelSumMin);
    ro.pair.set(D.pairedFraction, D.pairedFraction > 0.1 ? 'bad' : '');
    if (S.blownUp) {
      blown = true;
      loop.pause();
      f.status.textContent = `Blew up at t = ${S.t.toFixed(3)} s.`;
      return;
    }
    const where = F.Z >= 3.95 ? 'The surge has hit the far wall.' : `Front at Z = ${F.Z.toFixed(2)}; Ritter’s idealised front would be at ${Math.min(F.ritterZ, 4).toFixed(2)}${F.ritterZ > 4 ? ' (the wall)' : ''}.`;
    f.status.textContent = `${DENSITY[cfg.density].name}, ${cfg.kernel} kernel: ${where}${neg > 0.05 ? ` ${fmtPct(neg)} of the water reads a negative pressure: noise, not physics.` : ''}`;
  }

  // ---- loop
  const gov = governor({ budgetMs: 6, guess: 0.8 });
  const TEND = 2.5;
  const loop = animate(
    fig,
    () => {
      if (blown) return;
      if (S.t >= TEND) {
        loop.pause();
        return;
      }
      const n = gov.fit(40);
      const t0 = performance.now();
      for (let k = 0; k < n && !S.blownUp; k++) {
        step(S);
        sample();
      }
      gov.record(n, performance.now() - t0);
      draw();
      report();
    },
    { signal },
  );
  loop.onChange((playing) => {
    if (playing && (blown || S.t >= TEND)) restart();
  });

  // ---- controls
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Reset', onClick: () => restart() });
  select(f.controls, { label: 'Density', options: Object.entries(DENSITY).map(([k, d]) => [k, d.name]), value: cfg.density, onChange: (v) => ((cfg.density = v), restart()) });
  select(f.controls, { label: 'Kernel', options: [['wendland', 'Wendland C2 (h = 1.5 dx)'], ['cubic', 'cubic spline (h = 1.2 dx)']], value: cfg.kernel, onChange: (v) => ((cfg.kernel = v), restart()) });
  select(f.controls, { label: 'Particles per column width', options: [['15', '15'], ['20', '20'], ['25', '25']], value: String(cfg.resolution), onChange: (v) => ((cfg.resolution = Number(v)), restart()) });
  select(f.controls, { label: 'Colour by', options: COLOURS, value: cfg.colour, onChange: (v) => ((cfg.colour = v), S && (diagnostics(S, D), draw())) });
  slider(f.controls, {
    label: 'Artificial viscosity α',
    min: 0,
    max: 0.5,
    step: 0.01,
    value: cfg.alpha,
    fmt: (v) => fmt(v, 2),
    onInput: (v) => {
      cfg.alpha = v;
      if (S) setParams(S, { alpha: v });
    },
  });

  function restart() {
    build();
    diagnostics(S, D);
    draw();
    report();
  }
  restart();
  return () => {
    loop.destroy();
    box.destroy();
    plot.box.destroy();
  };
}
