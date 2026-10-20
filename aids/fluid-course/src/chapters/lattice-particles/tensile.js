// lattice-particles-tensile: particles that clump. A periodic square lattice
// of SPH particles (sph.js presets 'tensile', 'tensile-fixed', 'pairing',
// 'pairing-fixed': box side 1, 30 x 30 particles, a small random kick)
// held under a uniform background pressure: negative (tension) for the
// tensile instability of Swegle, Hicks & Attaway (1995), positive with a
// wide cubic-spline kernel for the pairing instability. The clumping metric
// is sph.js diagnostics().pairedFraction: the share of particles whose
// nearest neighbour is closer than half the lattice spacing.
//
// Artificial pressure (Monaghan 2000) and the kernel switch are live
// (setParams). data-preset: 'tensile' (default), 'tensile-fixed',
// 'pairing', 'pairing-fixed'.

import { h } from '../../kit/dom.js';
import { frame, select, toggle, readout, playButton, button, animate, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { Plot } from '../../kit/plot.js';
import { PRESETS, createSPH, setParams, step, diagnostics } from '../../sims/sph.js';
import { governor, fmtPct } from './common.js';

const CASES = ['tensile', 'tensile-fixed', 'pairing', 'pairing-fixed'];
const TEND = { tensile: 6, 'tensile-fixed': 6, pairing: 14, 'pairing-fixed': 14 };
const TIME_RATE = 1.2; // model time units per second of animation
const HMAX = 400;

export function mountTensile(fig, { signal }) {
  const preset = CASES.includes(fig.dataset.preset) ? fig.dataset.preset : 'tensile';
  const f = frame(fig, { title: 'Particles that clump', wide: true });
  f.stage.classList.add('cols');
  const cfg = { kase: preset };
  let S = null, tEnd = 6;
  const D = {};
  const hT = new Float64Array(HMAX), hP = new Float64Array(HMAX);
  let hN = 0, lastT = -1;

  function build() {
    S = createSPH({ preset: cfg.kase });
    tEnd = TEND[cfg.kase];
    hN = 0;
    lastT = -1;
    diagnostics(S, D);
    record();
    apToggle.set(S.artificialPressure > 0, { silent: true });
    kerSel.set(S.kernel, { silent: true });
  }
  function record() {
    if (hN < HMAX && S.t - lastT >= tEnd / HMAX) {
      hT[hN] = S.t;
      hP[hN] = D.pairedFraction;
      hN++;
      lastT = S.t;
    }
  }

  const box = canvasBox(f.stage, { aspect: 1, minHeight: 240, maxHeight: 400, label: 'A square lattice of particles in a periodic box; particles whose nearest neighbour has come closer than half the spacing are highlighted.' });
  const plotBox = h('div.lp-plot');
  plotBox.style.cssText = 'display:grid;gap:6px;min-width:0;align-content:start';
  f.stage.append(plotBox);
  const plot = new Plot(plotBox, {
    x: { label: 'time', min: 0, max: 6 },
    y: { label: 'paired fraction', min: 0, max: 1 },
    aspect: 1.4,
    label: 'Fraction of particles in close pairs against time.',
  });

  function draw() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    const side = Math.min(W, H) - 12;
    const ox = (W - side) / 2, oy = (H + side) / 2;
    const r = Math.max(1.2, 0.3 * S.dx * side);
    ctx.strokeStyle = pal.css('line');
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy - side, side, side);
    const lim = 0.5 * S.dx;
    for (let pass = 0; pass < 2; pass++) {
      ctx.fillStyle = pal.css(pass ? 'bad' : 's1', pass ? 1 : 0.85);
      ctx.beginPath();
      for (let i = 0; i < S.nFluid; i++) {
        const paired = S.nnDist[i] < lim;
        if (paired !== (pass === 1)) continue;
        const x = ox + S.x[i] * side, y = oy - S.y[i] * side;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, 2 * Math.PI);
      }
      ctx.fill();
    }
    plot.setAxes({ x: { max: tEnd } });
    plot.draw([{ x: hT.subarray(0, hN), y: hP.subarray(0, hN), color: 'bad', label: 'paired (nearest neighbour < dx/2)' }]);
  }
  box.onResize(() => S && draw());

  const ro = {
    t: readout(f.readouts, { label: 'time', fmt: (v) => v.toFixed(2) }),
    pb: readout(f.readouts, { label: 'background p', fmt: (v) => v.toFixed(3), title: 'Uniform pressure added to every particle: negative is tension' }),
    k: readout(f.readouts, { label: 'kernel, h/dx', title: 'Smoothing kernel and smoothing length over particle spacing' }),
    pair: readout(f.readouts, { label: 'paired', fmt: (v) => fmtPct(v), title: 'Share of particles whose nearest neighbour is closer than dx/2' }),
    nn: readout(f.readouts, { label: 'min spacing / dx', fmt: (v) => v.toFixed(2), title: 'Closest pair of particles, in units of the initial spacing' }),
    rho: readout(f.readouts, { label: 'max |ρ/ρ₀ − 1|', fmt: (v) => fmtPct(v, 2) }),
  };
  function report() {
    ro.t.set(S.t);
    ro.pb.set(S.backgroundPressure);
    ro.k.set(`${S.kernel === 'cubic' ? 'cubic' : 'Wendland'}, ${(S.h / S.dx).toFixed(1)}`);
    ro.pair.set(D.pairedFraction, D.pairedFraction > 0.05 ? 'bad' : 'good');
    ro.nn.set(D.minNeighbourRatio, D.minNeighbourRatio < 0.5 ? 'bad' : '');
    ro.rho.set(D.maxDensityError);
    const tension = S.backgroundPressure < 0;
    const fix = S.artificialPressure > 0 ? ` Artificial pressure ε = ${S.artificialPressure} is on.` : '';
    if (S.blownUp) f.status.textContent = `Blew up at time ${S.t.toFixed(2)}.`;
    else if (D.pairedFraction > 0.05)
      f.status.textContent = `${fmtPct(D.pairedFraction)} of the particles have clumped into pairs and strings${tension ? ' under tension' : ' under compression'}.${fix}`;
    else f.status.textContent = `The lattice holds: no particle has a neighbour closer than ${D.minNeighbourRatio.toFixed(2)} dx.${fix}`;
  }

  const gov = governor({ budgetMs: 6, guess: 0.6 });
  let acc = 0;
  const loop = animate(
    fig,
    (dt) => {
      if (S.blownUp || S.t >= tEnd) {
        loop.pause();
        return;
      }
      acc += dt * TIME_RATE;
      const t0 = performance.now();
      let n = 0;
      while (S.t < tEnd && acc > 0 && n < gov.fit(1000) && !S.blownUp) {
        const t1 = S.t;
        step(S);
        acc -= S.t - t1;
        n++;
      }
      if (acc > 0.2) acc = 0.2;
      gov.record(n, performance.now() - t0);
      diagnostics(S, D);
      record();
      draw();
      report();
    },
    { signal },
  );
  loop.onChange((playing) => {
    if (playing && (S.blownUp || S.t >= tEnd)) restart();
  });

  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Reset', onClick: () => restart() });
  select(f.controls, {
    label: 'Case',
    options: CASES.map((k) => [k, PRESETS[k].name]),
    value: cfg.kase,
    onChange: (v) => {
      cfg.kase = v;
      restart();
      loop.play();
    },
  });
  const apToggle = toggle(f.controls, {
    label: 'Artificial pressure (ε = 0.2)',
    checked: false,
    onChange: (on) => {
      setParams(S, { artificialPressure: on ? 0.2 : 0 });
      report();
    },
  });
  const kerSel = select(f.controls, {
    label: 'Kernel (same h)',
    options: [['cubic', 'cubic spline'], ['wendland', 'Wendland C2']],
    value: 'cubic',
    onChange: (v) => {
      setParams(S, { kernel: v });
      diagnostics(S, D);
      report();
    },
  });

  function restart() {
    build();
    acc = 0;
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
