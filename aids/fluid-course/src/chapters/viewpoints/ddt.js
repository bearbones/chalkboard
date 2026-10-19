// viewpoints-dDt: the material derivative, felt. A warm patch sits in a
// river (uniform flow) or a whirlpool (solid-body rotation). A thermometer
// on a pier stays put (s1); one on a boat drifts with the water (s2). The
// bars split the boat's rate of change into the local part ∂T/∂t (s1), the
// convective part u·∇T (s3) and their sum DT/Dt (s2), computed by flows.js
// materialDerivative; a tick on the sum bar is the rate at which the boat's
// own reading changes, measured by following the boat (no gradients).

import { h, fmt } from '../../kit/dom.js';
import { frame, slider, segmented, button, readout, playButton, animate, canvasBox } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { makeFlow, rkStep, materialDerivative } from '../../sims/flows.js';
import { makePatch } from '../../sims/ch-viewpoints-kinematics.js';
import { planeView, dragHandles, heatLayer, drawFlowArrows, clamp } from './view.js';

const SCENES = {
  river: {
    label: 'River',
    flow: () => makeFlow('uniform', { U: 1, V: 0 }),
    domain: { xmin: -2, xmax: 2, ymin: -1, ymax: 1 },
    grid: [96, 48],
    boat: [-0.9, 0.1],
    pier: [0.7, -0.25],
    run: 2.9,
    arrows: [10, 5],
  },
  whirlpool: {
    label: 'Whirlpool',
    flow: () => makeFlow('rotation', { Omega: 1 }),
    domain: { xmin: -1.5, xmax: 1.5, ymin: -1.5, ymax: 1.5 },
    grid: [64, 64],
    boat: [0.9 * Math.cos(-0.5), 0.9 * Math.sin(-0.5)],
    pier: [0, 0.9],
    run: 2 * Math.PI,
    arrows: [8, 8],
  },
};

const PRESETS = {
  fixed: { scene: 'river', k: 0, beta: 0 },
  carried: { scene: 'river', k: 1, beta: 0 },
  warming: { scene: 'river', k: 1, beta: 0.3 },
  whirlpool: { scene: 'whirlpool', k: 0, beta: 0 },
};

const H = 0.02; // boat step and record spacing
const CAP = 400;
const BAR_MAX = 2; // the bars' full scale, in temperature per unit time
const DELTA = 1e-3; // time offset for the boat's own rate of change

export function mountDdt(fig, ctx) {
  const ui = frame(fig, { title: 'A thermometer on a pier, one on a boat', wide: true });
  ui.stage.classList.add('cols');
  const view = planeView(ui.stage, {
    domain: SCENES.river.domain,
    aspect: 1.5,
    label: 'Temperature map of the water with a warm patch. A square marks a thermometer fixed on a pier; a dot marks one on a boat drifting with the water.',
  });
  const side = h('div.vp-side');
  ui.stage.append(side);
  const bars = canvasBox(side, { height: 116, label: 'Bars: the local rate, the convective rate and their sum, the material derivative, at the boat' });
  const plot = new Plot(side, {
    x: { label: 'time t', min: 0, max: 3 },
    y: { label: 'temperature T', min: 0 },
    aspect: 1.9,
    label: 'Temperature recorded by the pier and by the boat, against time',
  });

  const recT = new Float64Array(CAP);
  const recPier = new Float64Array(CAP);
  const recBoat = new Float64Array(CAP);
  const O = new Float64Array(2);
  const md = {};
  const mdPier = {};
  const series = [
    { x: recT, y: recPier, color: 's1', label: 'pier (fixed)' },
    { x: recT, y: recBoat, color: 's2', dash: [6, 4], label: 'boat (moving)' },
  ];
  let layer = heatLayer(96, 48);

  let scene = SCENES.river;
  let flow = scene.flow();
  let patch = makePatch('river');
  let t = 0;
  let bx = 0;
  let by = 0;
  let px = 0;
  let py = 0;
  let nrec = 0;
  let hot = 1;

  function record() {
    if (nrec >= CAP) return;
    recT[nrec] = t;
    recPier[nrec] = patch(px, py, t);
    recBoat[nrec] = patch(bx, by, t);
    nrec++;
  }

  function restart() {
    t = 0;
    bx = scene.boat[0];
    by = scene.boat[1];
    nrec = 0;
    recPier.fill(NaN);
    recBoat.fill(NaN);
    for (let k = 0; k < CAP; k++) recT[k] = k * H;
    record();
  }

  function setScene(id, keepPier = false) {
    scene = SCENES[id] || SCENES.river;
    flow = scene.flow();
    patch = makePatch(id === 'whirlpool' ? 'whirlpool' : 'river', { k: kSlider.value, beta: betaSlider.value });
    view.setDomain(scene.domain);
    if (layer.nx !== scene.grid[0] || layer.ny !== scene.grid[1]) layer = heatLayer(scene.grid[0], scene.grid[1]);
    if (!keepPier) {
      px = scene.pier[0];
      py = scene.pier[1];
    }
    plot.setAxes({ x: { max: scene.run } });
    restart();
    plot.draw(series);
    draw();
  }

  function advance(dt) {
    let left = dt;
    while (left > 1e-12) {
      const h = Math.min(H, left, nrec * H - t > 1e-12 ? nrec * H - t : H);
      rkStep(flow, bx, by, t, h, 'rk4', O);
      bx = O[0];
      by = O[1];
      t += h;
      left -= h;
      if (t >= nrec * H - 1e-9) record();
      if (t >= scene.run - 1e-9) {
        restart();
        plot.render();
        break;
      }
    }
  }

  // ---- drawing ------------------------------------------------------------------------
  function draw() {
    const pal = palette();
    const c = view.box.ctx;
    const d = scene.domain;
    // The map: fixed colour scale from 0 to the hottest the run reaches.
    hot = 1 + patch.params.beta * scene.run;
    const nx = layer.nx;
    const ny = layer.ny;
    const dx = (d.xmax - d.xmin) / nx;
    const dy = (d.ymax - d.ymin) / ny;
    const v = layer.values;
    for (let j = 0; j < ny; j++) {
      const y = d.ymin + (j + 0.5) * dy;
      for (let i = 0; i < nx; i++) v[i + j * nx] = patch(d.xmin + (i + 0.5) * dx, y, t);
    }
    layer.paint(0, hot, 'seq');
    view.clear(pal);
    c.save();
    view.clip();
    layer.draw(view, d);
    drawFlowArrows(view, flow, t, d, { nx: scene.arrows[0], ny: scene.arrows[1], scale: 0.28, color: 'ink', alpha: 0.35, pal });
    // Boat's track so far.
    c.strokeStyle = pal.css('s2', 0.8);
    c.lineWidth = 1.5;
    c.setLineDash([4, 4]);
    c.beginPath();
    if (scene === SCENES.river) {
      c.moveTo(view.X(scene.boat[0]), view.Y(scene.boat[1]));
      c.lineTo(view.X(bx), view.Y(by));
    } else {
      const r = Math.hypot(scene.boat[0], scene.boat[1]);
      const a0 = Math.atan2(scene.boat[1], scene.boat[0]);
      c.arc(view.X(0), view.Y(0), r * view.s, -a0, -(a0 + t), true);
    }
    c.stroke();
    c.setLineDash([]);
    // Pier: a square that never moves.
    c.fillStyle = pal.css('s1');
    c.strokeStyle = pal.css('board');
    c.lineWidth = 2;
    c.beginPath();
    c.rect(view.X(px) - 7, view.Y(py) - 7, 14, 14);
    c.fill();
    c.stroke();
    // Boat: a dot that drifts with the water.
    c.fillStyle = pal.css('s2');
    c.beginPath();
    view.dot(bx, by, 7);
    c.fill();
    c.stroke();
    c.restore();
    view.border(pal);

    materialDerivative(flow, patch, bx, by, t, 1e-5, md);
    materialDerivative(flow, patch, px, py, t, 1e-5, mdPier);
    // What the boat's thermometer itself does: follow the boat a moment
    // back and a moment on (RK4 steps of ∓δ) and difference its readings.
    // This uses no gradient at all, only the moving thermometer.
    rkStep(flow, bx, by, t, DELTA, 'rk4', O);
    const ahead = patch(O[0], O[1], t + DELTA);
    rkStep(flow, bx, by, t, -DELTA, 'rk4', O);
    const behind = patch(O[0], O[1], t - DELTA);
    const slope = (ahead - behind) / (2 * DELTA);
    drawBars(pal, slope);

    rBoat.set(patch(bx, by, t));
    rTotal.set(md.total);
    rSlope.set(Math.abs(slope) < 5e-7 ? '0' : fmt(slope, 3));
    rPier.set(mdPier.local);
    narrate();
  }

  function drawBars(pal, slope) {
    const c = bars.ctx;
    const W = bars.width;
    const Hh = bars.height;
    bars.clear(pal.css('board'));
    const rows = [
      ['∂T/∂t local', md.local, 's1'],
      ['u·∇T convective', md.convective, 's3'],
      ['DT/Dt total', md.total, 's2'],
    ];
    const labelW = Math.min(132, W * 0.4);
    const x0 = labelW + (W - labelW - 10) / 2;
    const half = (W - labelW - 16) / 2;
    const rowH = (Hh - 22) / 3;
    c.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    c.textBaseline = 'middle';
    // Zero line and scale ticks.
    c.strokeStyle = pal.css('line');
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(Math.round(x0) + 0.5, 4);
    c.lineTo(Math.round(x0) + 0.5, Hh - 18);
    c.stroke();
    c.fillStyle = pal.css('muted');
    c.textAlign = 'center';
    c.fillText(`−${BAR_MAX}`, x0 - half, Hh - 8);
    c.fillText('0', x0, Hh - 8);
    c.fillText(`+${BAR_MAX}`, x0 + half, Hh - 8);
    for (let r = 0; r < 3; r++) {
      const [lab, val, col] = rows[r];
      const yc = 4 + rowH * (r + 0.5);
      c.textAlign = 'left';
      c.fillStyle = pal.css('ink');
      c.fillText(lab, 6, yc);
      const w = (clamp(val, -BAR_MAX, BAR_MAX) / BAR_MAX) * half;
      c.fillStyle = pal.css(col);
      c.fillRect(w >= 0 ? x0 : x0 + w, yc - rowH * 0.32, Math.abs(w), rowH * 0.64);
    }
    // The boat's measured slope, as a tick on the total bar.
    if (Number.isFinite(slope)) {
      const yc = 4 + rowH * 2.5;
      const xs = x0 + (clamp(slope, -BAR_MAX, BAR_MAX) / BAR_MAX) * half;
      c.strokeStyle = pal.css('ink');
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(xs, yc - rowH * 0.5);
      c.lineTo(xs, yc + rowH * 0.5);
      c.stroke();
    }
  }

  function narrate() {
    const k = patch.params.k;
    const beta = patch.params.beta;
    let s;
    if (Math.abs(k - 1) < 1e-9) {
      s = beta > 0
        ? `The patch drifts with the water, so the boat feels only the sunshine: DT/Dt = β = ${fmt(beta, 2)} everywhere, while the pier sees the patch go by.`
        : 'The patch drifts with the water: the boat’s reading never changes (DT/Dt = 0), while the pier sees the patch go by. The local and convective bars cancel.';
    } else if (k === 0) {
      s = beta > 0
        ? `The patch stays put: the pier feels only the sunshine (∂T/∂t = β = ${fmt(beta, 2)}), while the boat also feels the patch as it passes.`
        : 'The patch stays put: the pier’s reading never changes (∂T/∂t = 0), but the boat warms and cools as it crosses the patch. All its change is convective.';
    } else {
      s = `The patch moves at ${fmt(k, 2)} × the water’s speed, so the water slips through it: both thermometers see change, and the boat’s is the smaller part (the bars do not cancel).`;
    }
    if (ui.status.textContent !== s) ui.status.textContent = s;
  }

  // ---- controls -----------------------------------------------------------------------
  const preset = PRESETS[fig.dataset.preset] || PRESETS.fixed;
  const sceneSeg = segmented(ui.controls, {
    label: 'Water',
    options: Object.entries(SCENES).map(([key, s]) => [key, s.label]),
    value: preset.scene,
    onChange: (v) => setScene(v),
  });
  const kSlider = slider(ui.controls, {
    label: 'patch moves at k × water speed: k =',
    min: 0,
    max: 1.5,
    step: 0.05,
    value: preset.k,
    fmt: (v) => fmt(v, 2),
    onInput: (v) => {
      patch.params.k = v;
      restart();
      plot.render();
      draw();
    },
  });
  const betaSlider = slider(ui.controls, {
    label: 'sunshine warms all water at β =',
    min: 0,
    max: 0.4,
    step: 0.05,
    value: preset.beta,
    fmt: (v) => fmt(v, 2),
    onInput: (v) => {
      patch.params.beta = v;
      restart();
      plot.render();
      draw();
    },
  });
  let plotTick = 0;
  const loop = animate(
    fig,
    (dt) => {
      advance(dt * 0.8);
      draw();
      if (++plotTick % 4 === 0) plot.render();
    },
    { autoplay: true, signal: ctx.signal },
  );
  playButton(ui.controls, loop);
  button(ui.controls, {
    label: 'Restart',
    onClick: () => {
      restart();
      plot.render();
      draw();
    },
  });

  const rBoat = readout(ui.readouts, { label: 'boat: T', fmt: (v) => fmt(v, 3) });
  const rTotal = readout(ui.readouts, { label: 'boat: DT/Dt = ∂T/∂t + u·∇T', fmt: (v) => fmt(Math.abs(v) < 5e-7 ? 0 : v, 3) });
  const rSlope = readout(ui.readouts, { label: 'boat: rate its own reading changes', title: 'the boat’s thermometer read a moment before and a moment after, following the boat' });
  const rPier = readout(ui.readouts, { label: 'pier: ∂T/∂t (slope of its record)', fmt: (v) => fmt(Math.abs(v) < 5e-7 ? 0 : v, 3) });

  dragHandles(view, {
    pick: (x, y, slop) => (Math.hypot(x - px, y - py) < Math.max(slop, 0.12) ? 'pier' : null),
    move: (_k, x, y) => {
      const d = scene.domain;
      px = clamp(x, d.xmin + 0.05, d.xmax - 0.05);
      py = clamp(y, d.ymin + 0.05, d.ymax - 0.05);
      restart();
      plot.render();
      draw();
    },
  });

  view.box.onResize(() => draw());
  bars.onResize(() => draw());
  ctx.signal?.addEventListener('abort', () => {
    view.box.destroy();
    bars.destroy();
    plot.destroy();
  });
  setScene(sceneSeg.value);
}
