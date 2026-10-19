// continuum-shear: four materials in identical shear cells under the same
// applied shear stress. A Hookean solid (τ = Gγ), a Newtonian liquid
// (τ = μγ̇), a shear-thinning power-law liquid (τ = Kγ̇ⁿ, n = 1/2) and a
// Bingham yield-stress paste (γ̇ = 0 below τ_y, τ = τ_y + μ_p γ̇ above).
// These are closed-form constitutive laws (Barnes, Hutton & Walters 1989,
// An Introduction to Rheology, chs 2 and 4), so the widget integrates them
// directly: there is no numerical scheme to share. Inertia is ignored, so
// a fluid stops the instant the stress is removed; the solid relaxes to its
// new strain with a short display time constant.
//
// Units: G = μ = K = μ_p = 1, τ_y = 0.5, time in seconds of animation.

import { fmt } from '../../kit/dom.js';
import { frame, slider, segmented, button, readout, playButton, canvasBox, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';

const TAU_MAX = 2;
const TAU_Y = 0.5;
const N_POW = 0.5;
const RELAX = 0.12; // s, display time constant of the solid
const HIST = 240; // samples of history
const SAMPLE_DT = 0.05; // s between samples (12 s of history)
const GMAX = 4; // strain axis limit

const MATS = [
  { id: 'solid', name: 'Solid (rubber)', color: 's1', dash: null },
  { id: 'newton', name: 'Newtonian', color: 's2', dash: [7, 4] },
  { id: 'thin', name: 'Shear-thinning', color: 's3', dash: [2, 4] },
  { id: 'paste', name: 'Yield-stress paste', color: 's4', dash: [10, 4, 2, 4] },
];

// Steady strain rate of each fluid at shear stress tau.
const rateNewton = (tau) => tau;
const rateThin = (tau) => Math.sign(tau) * Math.pow(Math.abs(tau), 1 / N_POW);
const ratePaste = (tau) => Math.sign(tau) * Math.max(0, Math.abs(tau) - TAU_Y);

const PRESETS = {
  default: { tau: 0.3, mode: 'strain' },
  'below-yield': { tau: 0.3, mode: 'strain' },
  'above-yield': { tau: 1.2, mode: 'strain' },
  'flow-curves': { tau: 1, mode: 'rate' },
};

export function mountShear(fig, { signal }) {
  const preset = PRESETS[fig.dataset.preset] || PRESETS.default;
  const f = frame(fig, { title: 'One push, four materials' });
  f.stage.classList.add('cols');
  const box = canvasBox(f.stage, { aspect: 1.9, minHeight: 230, maxHeight: 340, label: 'Four shear cells side by side: a rubber block, a Newtonian liquid, a shear-thinning liquid and a yield-stress paste, each between a fixed bottom plate and a top plate pushed sideways by the same shear stress. Drag sideways to change the stress.' });
  const plotWrap = document.createElement('div');
  f.stage.append(plotWrap);
  const plot = new Plot(plotWrap, { x: { label: 'strain γ', min: -GMAX, max: GMAX }, y: { label: 'shear stress τ', min: -TAU_MAX, max: TAU_MAX }, aspect: 1.25, hover: false, label: 'Plot of shear stress against strain or strain rate for the four materials' });

  // State
  const strain = new Float64Array(4); // γ for each material
  const rate = new Float64Array(4); // current γ̇
  const histG = MATS.map(() => new Float64Array(HIST));
  const histT = new Float64Array(HIST);
  const drawX = MATS.map(() => new Float64Array(HIST));
  const drawY = MATS.map(() => new Float64Array(HIST));
  let nHist = 0;
  let head = 0;
  let sinceSample = 0;
  let tau = preset.tau;

  // Flow curves (static): τ from −2 to 2.
  const NC = 161;
  const curveT = new Float64Array(NC);
  const curves = [new Float64Array(NC), new Float64Array(NC), new Float64Array(NC)];
  for (let k = 0; k < NC; k++) {
    const t = -TAU_MAX + (2 * TAU_MAX * k) / (NC - 1);
    curveT[k] = t;
    curves[0][k] = rateNewton(t);
    curves[1][k] = rateThin(t);
    curves[2][k] = ratePaste(t);
  }
  const solidX = [0, 0];
  const solidY = [-TAU_MAX, TAU_MAX];
  const hookeX = [-TAU_MAX, TAU_MAX];
  const hookeY = [-TAU_MAX, TAU_MAX];

  let mode = preset.mode;
  const tauCtl = slider(f.controls, {
    label: 'Shear stress τ',
    min: -TAU_MAX,
    max: TAU_MAX,
    step: 0.01,
    value: tau,
    fmt: (v) => v.toFixed(2),
    onInput: (v) => {
      tau = v;
      if (!loop.playing) drawAll();
    },
  });
  segmented(f.controls, {
    label: 'Plot stress against',
    options: [
      ['strain', 'strain γ'],
      ['rate', 'strain rate γ̇'],
    ],
    value: mode,
    onChange: (v) => {
      mode = v;
      drawPlot();
    },
  });
  button(f.controls, {
    label: 'Let go (τ = 0)',
    onClick: () => {
      tauCtl.set(0);
    },
  });
  button(f.controls, {
    label: 'Re-ink',
    kind: 'ghost',
    title: 'Set every strain back to zero and clear the trails',
    onClick: () => {
      strain.fill(0);
      nHist = 0;
      head = 0;
      drawAll();
    },
  });

  const rTau = readout(f.readouts, { label: 'stress τ' });
  const rSolid = readout(f.readouts, { label: 'solid strain γ' });
  const rNewton = readout(f.readouts, { label: 'Newtonian γ̇' });
  const rThin = readout(f.readouts, { label: 'shear-thinning γ̇' });
  const rApp = readout(f.readouts, { label: 'shear-thinning τ/γ̇', title: 'apparent viscosity' });
  const rPaste = readout(f.readouts, { label: 'paste γ̇' });

  // Drag sideways on the cells to set the stress.
  let drag = null;
  const cv = box.canvas;
  cv.style.touchAction = 'none';
  cv.style.cursor = 'ew-resize';
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    drag = { x: box.pointer(e).x, tau };
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = box.pointer(e).x - drag.x;
    const v = Math.max(-TAU_MAX, Math.min(TAU_MAX, drag.tau + (dx / Math.max(120, 0.45 * box.width)) * TAU_MAX));
    tauCtl.set(Math.round(v * 100) / 100);
  });
  const endDrag = () => (drag = null);
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);

  function stepModel(dt) {
    const target = tau; // G = 1
    const a = 1 - Math.exp(-dt / RELAX);
    const before = strain[0];
    strain[0] += (target - strain[0]) * a;
    rate[0] = dt > 0 ? (strain[0] - before) / dt : 0;
    rate[1] = rateNewton(tau);
    rate[2] = rateThin(tau);
    rate[3] = ratePaste(tau);
    for (let m = 1; m < 4; m++) strain[m] += rate[m] * dt;
    sinceSample += dt;
    if (sinceSample >= SAMPLE_DT) {
      sinceSample = 0;
      for (let m = 0; m < 4; m++) histG[m][head] = strain[m];
      histT[head] = tau;
      head = (head + 1) % HIST;
      if (nHist < HIST) nHist++;
    }
  }

  // ---- drawing ------------------------------------------------------------------
  function drawCells() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    const cw = W / 2;
    const chh = H / 2;
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    for (let m = 0; m < 4; m++) {
      const ox = (m % 2) * cw;
      const oy = ((m / 2) | 0) * chh;
      drawCell(ctx, pal, m, ox, oy, cw, chh);
    }
    // separators
    ctx.strokeStyle = pal.css('line');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(cw) + 0.5, 4);
    ctx.lineTo(Math.round(cw) + 0.5, H - 4);
    ctx.moveTo(4, Math.round(chh) + 0.5);
    ctx.lineTo(W - 4, Math.round(chh) + 0.5);
    ctx.stroke();
  }

  function drawCell(ctx, pal, m, ox, oy, cw, chh) {
    const mat = MATS[m];
    const padX = 10;
    const top = oy + 34; // top plate bottom edge
    const bot = oy + chh - 14; // bottom plate top edge
    const gap = Math.max(10, bot - top);
    const x0 = ox + padX;
    const x1 = ox + cw - padX;
    const w = x1 - x0;
    const g = strain[m];
    // label
    ctx.fillStyle = pal.css(mat.color);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(mat.name, x0, oy + 5);
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'right';
    const flowing = m > 0 && Math.abs(rate[m]) > 1e-9;
    ctx.fillText(m === 0 ? `γ = ${fmt(g, 2)}` : flowing ? 'flowing' : 'still', x1, oy + 5);
    // bottom plate
    ctx.fillStyle = pal.css('solid');
    ctx.fillRect(x0, bot, w, 6);
    ctx.strokeStyle = pal.css('muted', 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = x0 + 4; x < x1; x += 8) {
      ctx.moveTo(x, bot + 6);
      ctx.lineTo(x - 5, bot + 11);
    }
    ctx.stroke();
    if (m === 0) {
      // Solid block: a parallelogram, bottom glued, top shifted by γ·gap.
      const shift = Math.max(-1.3, Math.min(1.3, g)) * gap;
      const bx0 = x0 + 0.22 * w;
      const bx1 = x1 - 0.22 * w;
      ctx.fillStyle = pal.css('s1', 0.22);
      ctx.strokeStyle = pal.css('s1');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(bx0, bot);
      ctx.lineTo(bx1, bot);
      ctx.lineTo(bx1 + shift, top);
      ctx.lineTo(bx0 + shift, top);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // material lines inside the block
      ctx.strokeStyle = pal.css('dye', 0.7);
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let k = 1; k < 4; k++) {
        const xb = bx0 + ((bx1 - bx0) * k) / 4;
        ctx.moveTo(xb, bot);
        ctx.lineTo(xb + shift, top);
      }
      ctx.stroke();
      // top plate glued to the block
      ctx.fillStyle = pal.css('solid');
      ctx.fillRect(bx0 + shift - 6, top - 8, bx1 - bx0 + 12, 8);
      pushArrow(ctx, pal, bx1 + shift + 8, top - 4, w);
      return;
    }
    // Fluid layer
    ctx.fillStyle = pal.css('liquid', 0.32);
    ctx.fillRect(x0, top, w, gap);
    // Dye lines: material lines x = x0 + γ·(height above the bottom), wrapped.
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, top, w, gap);
    ctx.clip();
    ctx.strokeStyle = pal.css('dye', 0.85);
    ctx.lineWidth = 1.5;
    const nl = 5;
    const sp = w / nl;
    const segs = 24;
    ctx.beginPath();
    for (let k = 0; k < nl; k++) {
      let prev = null;
      for (let s = 0; s <= segs; s++) {
        const yy = (s / segs) * gap;
        let xx = (k + 0.5) * sp + g * yy;
        xx = ((xx % w) + w) % w;
        const px = x0 + xx;
        const py = bot - yy;
        if (prev === null || Math.abs(xx - prev) > w / 2) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        prev = xx;
      }
    }
    ctx.stroke();
    ctx.restore();
    // Velocity profile: arrows proportional to γ̇·height.
    const r = rate[m];
    if (Math.abs(r) > 1e-6) {
      ctx.strokeStyle = pal.css('ink', 0.75);
      ctx.fillStyle = pal.css('ink', 0.75);
      ctx.lineWidth = 1.5;
      const scale = 0.11 * w; // px per unit of γ̇ at the top
      for (let q = 1; q <= 3; q++) {
        const frac = q / 3;
        const len = Math.max(-0.42 * w, Math.min(0.42 * w, r * frac * scale));
        const py = bot - frac * gap + (q === 3 ? 5 : 0);
        const ax = x0 + 0.5 * w - len / 2;
        if (Math.abs(len) > 2) arrow(ctx, ax, py, ax + len, py, 5);
      }
    }
    // Top plate: long, with a marker that moves with the plate.
    ctx.fillStyle = pal.css('solid');
    ctx.fillRect(x0, top - 8, w, 8);
    const mk = (((0.5 * w + g * gap) % w) + w) % w;
    ctx.fillStyle = pal.css('ink', 0.8);
    ctx.fillRect(x0 + mk - 2, top - 8, 4, 8);
    pushArrow(ctx, pal, x1 - 2, top - 4, w);
  }

  function pushArrow(ctx, pal, xEnd, y, w) {
    if (Math.abs(tau) < 0.005) return;
    const len = (tau / TAU_MAX) * 0.3 * w;
    ctx.strokeStyle = pal.css('accent');
    ctx.fillStyle = pal.css('accent');
    ctx.lineWidth = 2.5;
    const xs = tau > 0 ? xEnd - Math.abs(len) - 4 : xEnd - 4;
    if (tau > 0) arrow(ctx, xs, y - 10, xs + Math.abs(len), y - 10, 7);
    else arrow(ctx, xs, y - 10, xs - Math.abs(len), y - 10, 7);
  }

  function drawPlot() {
    if (mode === 'rate') {
      plot.setAxes({ x: { label: 'strain rate γ̇', min: -4.2, max: 4.2 } });
      plot.draw(
        [
          { x: solidX, y: solidY, color: 's1', label: 'solid at rest', width: 2.5 },
          { x: curves[0], y: curveT, color: 's2', dash: MATS[1].dash, label: 'Newtonian τ = μγ̇' },
          { x: curves[1], y: curveT, color: 's3', dash: MATS[2].dash, label: 'shear-thinning τ = Kγ̇ⁿ' },
          { x: curves[2], y: curveT, color: 's4', dash: MATS[3].dash, label: 'paste τ = τ_y + μ_pγ̇' },
        ],
        { extra: markRate },
      );
      return;
    }
    plot.setAxes({ x: { label: 'strain γ', min: -GMAX, max: GMAX } });
    // Trails in chronological order.
    for (let m = 0; m < 4; m++) {
      const start = nHist < HIST ? 0 : head;
      for (let k = 0; k < nHist; k++) {
        const q = (start + k) % HIST;
        drawX[m][k] = Math.max(-GMAX * 1.02, Math.min(GMAX * 1.02, histG[m][q]));
        drawY[m][k] = histT[q];
      }
    }
    plot.draw(
      [
        { x: hookeX, y: hookeY, color: 'muted', dash: [3, 4], width: 1.5, label: 'Hooke τ = Gγ', hover: false },
        ...MATS.map((mt, m) => ({ x: drawX[m].subarray(0, nHist), y: drawY[m].subarray(0, nHist), color: mt.color, dash: mt.dash, label: mt.name, width: 2 })),
      ],
      { extra: markStrain },
    );
  }

  function dot(ctx, pal, x, y, color) {
    ctx.fillStyle = pal.css(color);
    ctx.strokeStyle = pal.css('board');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  function markStrain(ctx, tx, ty, area, pal) {
    for (let m = 0; m < 4; m++) {
      const g = strain[m];
      const off = Math.abs(g) > GMAX;
      const x = tx(Math.max(-GMAX, Math.min(GMAX, g)));
      if (off) {
        ctx.strokeStyle = pal.css(MATS[m].color);
        ctx.fillStyle = pal.css(MATS[m].color);
        ctx.lineWidth = 2;
        const dir = g > 0 ? 1 : -1;
        arrow(ctx, x - dir * 14, ty(tau), x - dir * 2, ty(tau), 6);
      } else dot(ctx, pal, x, ty(tau), MATS[m].color);
    }
  }

  function markRate(ctx, tx, ty, area, pal) {
    // horizontal line at the applied stress
    ctx.strokeStyle = pal.css('accent', 0.7);
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(area.x0, ty(tau));
    ctx.lineTo(area.x1, ty(tau));
    ctx.stroke();
    ctx.setLineDash([]);
    for (let m = 0; m < 4; m++) dot(ctx, pal, tx(Math.max(-4.2, Math.min(4.2, rate[m]))), ty(tau), MATS[m].color);
  }

  let lastStatus = '';
  function updateReadouts() {
    rTau.set(fmt(tau, 3));
    rSolid.set(fmt(strain[0], 3));
    rNewton.set(fmt(rate[1], 3));
    rThin.set(fmt(rate[2], 3));
    rApp.set(Math.abs(tau) < 1e-9 ? '–' : fmt(tau / rate[2], 3));
    rPaste.set(fmt(rate[3], 3));
    let s;
    const a = Math.abs(tau);
    if (a < 0.005) s = 'No stress. The solid springs back to its old shape; the fluids stay wherever you left them.';
    else if (a <= TAU_Y) s = `|τ| = ${a.toFixed(2)} is below the paste's yield stress ${TAU_Y}: the paste holds like a solid, while both liquids keep deforming.`;
    else s = `|τ| = ${a.toFixed(2)} is above the yield stress ${TAU_Y}: the paste flows too. Only the solid has stopped.`;
    if (s !== lastStatus) {
      f.status.textContent = s;
      lastStatus = s;
    }
  }

  function drawAll() {
    // keep rates current even when paused
    rate[1] = rateNewton(tau);
    rate[2] = rateThin(tau);
    rate[3] = ratePaste(tau);
    drawCells();
    drawPlot();
    updateReadouts();
  }

  box.onResize(drawCells);
  const loop = animate(
    fig,
    (dt) => {
      stepModel(dt);
      drawCells();
      drawPlot();
      updateReadouts();
    },
    { signal },
  );
  playButton(f.controls, loop);
  // Static first frame
  stepModel(0);
  drawAll();
  return () => {
    loop.destroy();
    box.destroy();
    plot.destroy();
  };
}
