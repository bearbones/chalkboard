// Chapter 15, section validation: two benchmarks for one lattice-Boltzmann
// code (lbm.js), run live.
//   trust-benchmark  channel mode: body-force Poiseuille flow against the
//                    exact parabola (ch-trust-bench.js poiseuilleError,
//                    poiseuilleSlip); cavity mode: the lid-driven cavity at
//                    Re = 100 against the centreline data of Ghia, Ghia &
//                    Shin (1982) (lbm.js GHIA_RE100, ch-trust-bench.js
//                    cavityProfiles, ghiaDeviation).

import { h, fmt } from '../../kit/dom.js';
import { frame, slider, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createPreset, step, health, magicOf, GHIA_RE100 } from '../../sims/lbm.js';
import { poiseuilleError, poiseuilleSlip, cavityProfiles, ghiaDeviation } from '../../sims/ch-trust-bench.js';
import { preset, pct, hrule } from './common.js';

const PRESETS = {
  default: { mode: 'channel', collision: 'bgk', tau: 2, H: '24', n: '32' },
  trt: { mode: 'channel', collision: 'trt', tau: 2, H: '24', n: '32' },
  magic: { mode: 'channel', collision: 'bgk', tau: 0.5 + Math.sqrt(3 / 16), H: '24', n: '32' },
  cavity: { mode: 'cavity', collision: 'bgk', tau: 2, H: '24', n: '32' },
  'cavity-fine': { mode: 'cavity', collision: 'bgk', tau: 2, H: '24', n: '64' },
};
const BUDGET_MS = 4;
const FINE = 101;

export function mountBenchmark(fig, { signal }) {
  const P = preset(fig, PRESETS);
  const f = frame(fig, { title: 'Run a benchmark, compare with the reference', wide: true });
  f.stage.classList.add('cols');
  const left = h('div');
  const right = h('div');
  f.stage.append(left, right);
  const plotA = new Plot(left, { x: { label: '' }, y: { label: '' }, aspect: 1.15, label: 'Computed velocity profile beside the reference' });
  const plotB = new Plot(right, { x: { label: '' }, y: { label: '' }, aspect: 1.15, label: 'Second profile or error profile beside the reference' });

  const modeSeg = segmented(f.controls, {
    label: 'Benchmark',
    options: [['channel', 'channel flow (exact answer)'], ['cavity', 'lid-driven cavity (Ghia et al.)']],
    value: P.mode,
    onChange: () => {
      showMode();
      restart();
    },
  });
  const collSeg = segmented(f.controls, { label: 'Collision', options: [['bgk', 'BGK'], ['trt', 'TRT, Λ = 3/16']], value: P.collision, onChange: () => restart() });
  const tauS = slider(f.controls, { label: 'relaxation time τ', min: 0.55, max: 3, step: 0.001, value: P.tau, fmt: (v) => v.toFixed(3), onInput: () => restart() });
  const HSeg = segmented(f.controls, { label: 'Cells across the channel H', options: ['8', '16', '24', '48'], value: P.H, onChange: () => restart() });
  const nSeg = segmented(f.controls, { label: 'Grid n × n', options: ['24', '32', '48', '64'], value: P.n, onChange: () => restart() });

  const rk = readout(f.readouts, { label: 'steps' });
  const ra = readout(f.readouts, { label: '' });
  const rb = readout(f.readouts, { label: '' });
  const rc = readout(f.readouts, { label: '' });
  const rd = readout(f.readouts, { label: '' });
  const label = (ro, text) => {
    const dt = ro.el.previousElementSibling;
    if (dt.textContent !== text) dt.textContent = text;
  };

  let L = null;
  let steps = 0;
  let steady = false;
  let prev = Infinity;
  // Channel buffers (sized for the largest H).
  const yC = new Float64Array(48);
  const uC = new Float64Array(48);
  const eC = new Float64Array(48);
  const eP = new Float64Array(48);
  const yF = new Float64Array(FINE);
  const uF = new Float64Array(FINE);
  for (let i = 0; i < FINE; i++) {
    yF[i] = i / (FINE - 1);
    uF[i] = 4 * yF[i] * (1 - yF[i]);
  }
  const prof = {};

  function showMode() {
    const ch = modeSeg.value === 'channel';
    collSeg.el.hidden = !ch;
    tauS.el.hidden = !ch;
    HSeg.el.hidden = !ch;
    nSeg.el.hidden = ch;
    if (ch) {
      plotA.setAxes({ x: { label: 'y / H', min: 0, max: 1 }, y: { label: 'u / u_max', min: -0.05, max: 1.1 } });
      plotB.setAxes({ x: { label: 'y / H', min: 0, max: 1 }, y: { label: 'error, % of u_max', min: null, max: null } });
      label(ra, 'largest error now');
      label(rb, 'steady error, (16Λ − 3)/(3H²)');
      label(rc, 'Λ');
      label(rd, 'status');
    } else {
      plotA.setAxes({ x: { label: 'u / U on x = ½', min: -0.35, max: 1.05 }, y: { label: 'y', min: 0, max: 1 } });
      plotB.setAxes({ x: { label: 'x', min: 0, max: 1 }, y: { label: 'v / U on y = ½', min: -0.3, max: 0.22 } });
      label(ra, 'max |u − u_Ghia| / U');
      label(rb, 'max |v − v_Ghia| / U');
      label(rc, 'min u / U (Ghia −0.2109 at y = 0.4531)');
      label(rd, 'Mach number');
    }
  }

  function restart() {
    steps = 0;
    steady = false;
    prev = Infinity;
    if (modeSeg.value === 'channel') {
      const collision = collSeg.value;
      L = createPreset('poiseuille', { nx: 4, ny: Number(HSeg.value), collision, tau: tauS.value, magic: 3 / 16 });
    } else {
      L = createPreset('cavity', { n: Number(nSeg.value), U: 0.1, Re: 100 });
    }
    showMode();
    render();
    if (!loop.playing && !reduced()) loop.play();
  }

  function render() {
    if (modeSeg.value === 'channel') {
      const H = L.ny;
      const e = poiseuilleError(L, yC, eC);
      for (let j = 0; j < H; j++) uC[j] = L.ux[j * L.nx] / L.meta.U;
      const lam = magicOf(L);
      const slip = poiseuilleSlip(lam, H);
      plotA.draw([
        { x: yF, y: uF, color: 'ink', width: 1.6, dash: [6, 4], label: 'exact parabola' },
        { x: yC.subarray(0, H), y: uC.subarray(0, H), color: 's1', width: 0, points: 3.6, label: 'lattice Boltzmann' },
      ]);
      for (let j = 0; j < H; j++) eP[j] = 100 * eC[j];
      plotB.draw([{ x: yC.subarray(0, H), y: eP.subarray(0, H), color: 's1', width: 2, points: 3, label: 'error' }], {
        yExtent: [Math.min(0, 100 * slip) - 0.01, Math.max(0, 100 * slip) + 0.01],
        extra(ctx, tx, ty, area, pal) {
          hrule(ctx, ty, area, pal, 100 * slip, 'predicted steady error', { token: 'accent', dash: [5, 4], below: slip < 0 });
        },
      });
      rk.set(steps.toLocaleString('en-US'));
      ra.set(pct(e), steady && e > 1e-6 ? 'bad' : steady ? 'good' : '');
      rb.set(pct(Math.abs(slip)), Math.abs(slip) < 1e-9 ? 'good' : '');
      rc.set(collSeg.value === 'trt' ? '3/16 (TRT)' : `(τ − ½)² = ${fmt(lam, 4)}`);
      rd.set(steady ? 'steady' : 'developing');
      const what = collSeg.value === 'trt' ? 'TRT with Λ = 3/16' : `BGK at τ = ${tauS.value.toFixed(3)}`;
      f.status.textContent = !steady
        ? `${what}: the flow is starting from rest and still developing (${steps.toLocaleString('en-US')} steps). The error shrinks as it approaches the parabola.`
        : Math.abs(slip) < 1e-9
          ? `Steady after ${steps.toLocaleString('en-US')} steps. ${what}: the largest error is ${pct(e)} of u_max, which is round-off. The bounce-back wall sits exactly half-way between nodes, as the exact solution assumes.`
          : Math.abs(slip) < 2e-6
            ? `Steady after ${steps.toLocaleString('en-US')} steps. ${what}: the slip has all but vanished (${pct(e)} of u_max), because τ is within the slider's step of ½ + √(3/16) ≈ 0.9330, where BGK's wall sits exactly half-way between nodes. One extra digit in τ would make it smaller still; the TRT collision gets there for any τ.`
          : `Steady after ${steps.toLocaleString('en-US')} steps. ${what}: every cell is off by the same ${pct(e)} of u_max, a ${slip > 0 ? 'slip' : 'lag'} at the walls that refining the grid shrinks as 1/H² but does not remove. ${collSeg.value === 'bgk' ? 'Move τ through 0.933, or switch to TRT.' : ''}`;
    } else {
      const p = cavityProfiles(L, prof);
      const d = ghiaDeviation(L);
      const G = GHIA_RE100;
      plotA.draw([
        { x: p.u, y: p.y, color: 's1', width: 2.2, label: 'lattice Boltzmann', hover: false },
        { x: G.u, y: G.y, color: 'ink', width: 0, points: 4, label: 'Ghia, Ghia & Shin (1982)', hover: false },
      ]);
      plotB.draw([
        { x: p.x, y: p.v, color: 's1', width: 2.2, label: 'lattice Boltzmann' },
        { x: G.x, y: G.v, color: 'ink', width: 0, points: 4, label: 'Ghia, Ghia & Shin (1982)' },
      ]);
      const hl = health(L);
      rk.set(steps.toLocaleString('en-US'));
      ra.set(pct(d.du), steady ? (d.du < 0.01 ? 'good' : '') : '');
      rb.set(pct(d.dv), steady ? (d.dv < 0.01 ? 'good' : '') : '');
      rc.set(`${d.uMin.toFixed(4).replace("-", "−")} at y = ${d.yMin.toFixed(3)}`);
      rd.set(fmt(hl.maxMach, 2), hl.ok ? '' : 'bad');
      const n = L.nx;
      f.status.textContent = !hl.ok
        ? `The run failed: ${hl.reason}.`
        : !steady
          ? `Re = 100 on ${n} × ${n} cells: the vortex is spinning up (${steps.toLocaleString('en-US')} steps).`
          : `Steady after ${steps.toLocaleString('en-US')} steps on ${n} × ${n} cells: the centrelines match Ghia et al. to within ${pct(Math.max(d.du, d.dv))} of the lid speed. ${n < 64 ? 'Refine the grid and the gap shrinks.' : 'Past this point the gap stops shrinking: it is now as small as the differences between the reference and better solutions.'}`;
    }
  }

  function advance() {
    const t0 = performance.now();
    const channel = modeSeg.value === 'channel';
    const chunk = channel ? 100 : 20;
    do {
      step(L, chunk);
      steps += chunk;
      if (channel) {
        const e = poiseuilleError(L);
        if (Math.abs(e - prev) < 1e-9) steady = true;
        prev = e;
      } else if (steps % 200 === 0) {
        const p = cavityProfiles(L, prof);
        const um = p.u[(p.u.length - 1) >> 1];
        if (Math.abs(um - prev) < 2e-7) steady = true;
        prev = um;
      }
    } while (!steady && performance.now() - t0 < BUDGET_MS);
  }

  const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const loop = animate(
    fig,
    () => {
      if (steady) {
        loop.pause();
        return;
      }
      advance();
      render();
      if (steady) loop.pause();
    },
    { autoplay: false, signal },
  );
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Restart', onClick: () => restart() });
  restart();
}
