// stable-fluids-splitting: how much kinetic energy each scheme loses on a
// flow that should keep all of it. The Taylor–Green vortex (four
// counter-rotating cells on a periodic square) is a steady solution of the
// inviscid equations, so every joule lost by t = 0.5 is numerical. The
// widget runs the kernel's own step (advect, then project; the
// 'taylor-green' preset with its mgpcg pressure solve) with
// semi-Lagrangian, BFECC and MacCormack advection at five Courant numbers,
// in slices across frames so the page never freezes, and plots the loss
// against the time step on log–log axes beside a line ∝ Δt. A second plot
// shows the energy history for one chosen Courant number, with the exact
// answer (no loss) drawn flat at 1.

import { h } from '../../kit/dom.js';
import { frame, segmented, button, readout, sliced } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createPreset, step, kineticEnergy } from '../../sims/stablefluids.js';
import { presetFor, num } from './common.js';

const SCHEMES = ['semi-lagrangian', 'bfecc', 'maccormack'];
const SHORT = { 'semi-lagrangian': 'Semi-Lagrangian', bfecc: 'BFECC', maccormack: 'MacCormack' };
const COLOR = { 'semi-lagrangian': 's1', bfecc: 's2', maccormack: 's3' };
const DASH = { 'semi-lagrangian': null, bfecc: [6, 4], maccormack: [2, 3] };
const CFLS = [0.25, 0.5, 1, 2, 4];
const T_END = 0.5;

const PRESETS = {
  default: { nx: 32, cfl: 1 },
  fine: { nx: 64, cfl: 1 },
};

export function mountSplitting(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Energy lost by t = 0.5 on a flow that should keep it all', wide: true });
  const pa = h('div.sf-plot');
  const pb = h('div.sf-plot');
  f.stage.append(h('div.sf-two', pa, pb));
  const lossPlot = new Plot(pa, {
    x: { label: 'Courant number UΔt/h (∝ Δt)', log: true, min: 0.2, max: 5, fmt: (v) => num(v, 3) },
    y: { label: 'KE lost (%)', log: true, min: 2, max: 100, fmt: (v) => `${num(v, 3)} %` },
    aspect: 1.6,
    minHeight: 170,
    label: 'Log–log plot of the kinetic energy lost by t = 0.5 against the Courant number, for three advection schemes, beside a line proportional to the time step',
  });
  const histPlot = new Plot(pb, {
    x: { label: 'time t', min: 0, max: T_END },
    y: { label: 'KE / KE at t = 0', min: 0.3, max: 1.05 },
    aspect: 1.6,
    minHeight: 150,
    label: 'Kinetic energy over time for the chosen Courant number; the exact answer stays at 1',
  });

  let nx = p.nx;
  let gen = 0; // run counter, so a stale sweep cannot write into a new one
  // results: loss[s][c] (percent), and histories hist[s][c] = { t, ke }
  const loss = {};
  const hist = {};
  const lossX = {};
  const lossY = {};
  const alloc = () => {
    const maxSteps = Math.ceil((T_END * nx) / CFLS[0]) + 1;
    for (const s of SCHEMES) {
      loss[s] = new Float64Array(CFLS.length).fill(NaN);
      lossX[s] = Float64Array.from(CFLS);
      lossY[s] = new Float64Array(CFLS.length).fill(NaN);
      hist[s] = CFLS.map(() => ({ t: new Float64Array(maxSteps).fill(NaN), ke: new Float64Array(maxSteps).fill(NaN), n: 0 }));
    }
  };

  const grid = segmented(f.controls, {
    label: 'Grid',
    options: [
      ['32', '32 × 32'],
      ['64', '64 × 64'],
    ],
    value: String(nx),
    onChange: (v) => {
      nx = Number(v);
      run();
    },
  });
  const pick = segmented(f.controls, {
    label: 'History for Courant number',
    options: CFLS.map((c) => [String(c), String(c)]),
    value: String(p.cfl),
    onChange: () => drawHist(),
  });
  const again = button(f.controls, { label: 'Run again', onClick: () => run() });

  const rd = {};
  for (const s of SCHEMES) rd[s] = readout(f.readouts, { label: `${SHORT[s]}: loss shrinks by`, title: 'loss at Courant 0.5 divided by loss at Courant 0.25: 2 means the loss is proportional to Δt' });
  const rdPick = readout(f.readouts, { label: 'losses at the chosen Courant number' });

  const guide = { x: new Float64Array(2), y: new Float64Array(2) };

  function drawLoss() {
    const series = [];
    // A guide line ∝ Δt through BFECC's smallest-Δt point (once it exists).
    const b0 = loss.bfecc[0];
    if (Number.isFinite(b0)) {
      guide.x[0] = CFLS[0];
      guide.x[1] = CFLS[CFLS.length - 1];
      guide.y[0] = b0;
      guide.y[1] = (b0 * CFLS[CFLS.length - 1]) / CFLS[0];
      series.push({ x: guide.x, y: guide.y, color: 'muted', dash: [3, 4], width: 1.5, label: '∝ Δt (slope 1)', hover: false });
    }
    for (const s of SCHEMES) series.push({ x: lossX[s], y: lossY[s], color: COLOR[s], dash: DASH[s], points: 3.5, label: SHORT[s] });
    lossPlot.draw(series, {
      // The log axis only labels decades; name the five Courant numbers run.
      extra(ctx, tx, ty, area, pal) {
        ctx.fillStyle = pal.css('muted');
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        for (const c of CFLS) if (c !== 1) ctx.fillText(String(c), tx(c), area.y1 - 3);
      },
    });
  }

  function drawHist() {
    const c = CFLS.indexOf(Number(pick.value));
    const exact = { x: [0, T_END], y: [1, 1], color: 'ink', dash: [5, 4], width: 1.5, label: 'exact (no loss)', hover: false };
    const series = [exact];
    for (const s of SCHEMES) {
      const H = hist[s][c];
      series.push({ x: H.t, y: H.ke, color: COLOR[s], dash: DASH[s], label: SHORT[s] });
    }
    histPlot.draw(series);
    const parts = SCHEMES.map((s) => (Number.isFinite(loss[s][c]) ? `${loss[s][c].toFixed(1)} %` : '…'));
    rdPick.set(parts.join(' · '));
  }

  function readouts() {
    for (const s of SCHEMES) {
      const a = loss[s][0];
      const b = loss[s][1];
      if (Number.isFinite(a) && Number.isFinite(b)) {
        const r = b / a;
        rd[s].set(`${num(r, 3)}× per halving`, r < 1.2 ? 'bad' : r > 1.7 ? 'good' : '');
      } else rd[s].set('…');
    }
  }

  function* sweep(myGen) {
    for (let c = 0; c < CFLS.length; c++) {
      for (const s of SCHEMES) {
        const F = createPreset('taylor-green', { nx });
        const dt = (CFLS[c] * F.h) / F.meta.U;
        const steps = Math.round(T_END / dt);
        const params = { ...F.params, advection: s };
        const ke0 = kineticEnergy(F);
        const H = hist[s][c];
        H.t[0] = 0;
        H.ke[0] = 1;
        H.n = 1;
        for (let k = 1; k <= steps; k++) {
          step(F, dt, params);
          H.t[k] = k * dt;
          H.ke[k] = kineticEnergy(F) / ke0;
          H.n = k + 1;
          yield;
          if (myGen !== gen) return;
        }
        loss[s][c] = 100 * (1 - H.ke[steps]);
        lossY[s][c] = loss[s][c];
        drawLoss();
        if (String(CFLS[c]) === pick.value) drawHist();
        readouts();
        f.status.textContent = `Running: ${SHORT[s]} at Courant number ${CFLS[c]} lost ${num(loss[s][c], 3)} % of its kinetic energy.`;
      }
    }
  }

  function run() {
    gen++;
    const myGen = gen;
    alloc();
    drawLoss();
    drawHist();
    readouts();
    again.disabled = true;
    f.status.textContent = `Running the ${nx} × ${nx} sweep: 15 runs to t = 0.5…`;
    sliced(sweep(myGen), { budgetMs: 6, signal })
      .then(() => {
        if (myGen !== gen) return;
        again.disabled = false;
        const sl = loss['semi-lagrangian'];
        const bf = loss.bfecc;
        f.status.textContent =
          `Done (${nx} × ${nx}). Halving Δt from Courant 0.5 to 0.25 shrinks BFECC’s loss by ${num(bf[1] / bf[0], 3)}× ` +
          `and MacCormack’s by ${num(loss.maccormack[1] / loss.maccormack[0], 3)}×: their remaining error is proportional to Δt. ` +
          `Semi-Lagrangian barely moves (${num(sl[1] / sl[0], 3)}×): each extra step adds another blurring interpolation, which cancels the gain.`;
      })
      .catch(() => {});
  }

  lossPlot.box.onResize(() => drawLoss());
  alloc();
  drawLoss();
  drawHist();
  readouts();
  f.status.textContent = 'The sweep starts when this figure scrolls into view.';
  // Start the sweep the first time the figure is on screen, not at page load.
  let started = false;
  const io = new IntersectionObserver((entries) => {
    if (started || !entries.some((e) => e.isIntersecting)) return;
    started = true;
    io.disconnect();
    run();
  });
  io.observe(fig);
  signal?.addEventListener('abort', () => io.disconnect());
  return () => {
    gen++;
    io.disconnect();
  };
}
