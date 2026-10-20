// Figure: the Navier–Stokes equations as a budget at one point. Drag the
// probe through an exact solution and watch the five terms (per unit mass)
// balance: ∂u/∂t + (u·∇)u = −∇p/ρ + ν∇²u + f. Every number comes from
// momentumBudget() in src/sims/ch-conservation.js, which differentiates the
// analytic fields of src/sims/flows.js and uses each flow's closed-form
// pressure; this file only projects the vectors and draws them.

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, slider, select, toggle, segmented, button, readout, playButton, canvasBox, animate } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { BUDGET_FLOWS, makeBudgetFlow, createBudget, momentumBudget } from '../../sims/ch-conservation.js';
import { planeView, heatLayer, velocityArrows } from './plane.js';

const PROBE = {
  'taylor-green': [0.3, 0.75],
  channel: [1.5, 0.25],
  'channel-gravity': [1.5, 0.25],
  'lamb-oseen': [0.45, 0.3],
  cylinder: [0.15, 0.62],
  rotation: [0.8, 0.5],
};
const UREF = { 'taylor-green': 1, channel: 1, 'channel-gravity': 1, 'lamb-oseen': 1.6, cylinder: 2, rotation: 2.4 };
const ROWS = [
  { key: 'local', label: '∂u/∂t', color: 's1', side: 'left' },
  { key: 'convective', label: '(u·∇)u', color: 's2', side: 'left' },
  { key: 'pressure', label: '−∇p/ρ', color: 's3', side: 'right' },
  { key: 'viscous', label: 'ν∇²u', color: 's4', side: 'right' },
  { key: 'body', label: 'f', color: 's5', side: 'right' },
];

export function mountConservationBudget(fig, ctx) {
  let id = BUDGET_FLOWS[fig.dataset.preset] ? fig.dataset.preset : 'taylor-green';
  const ui = frame(fig, { title: 'The momentum budget at a point', wide: true });
  ui.stage.classList.add('cols');
  let nu = 0.01;
  let viscous = true;
  let comp = 'along';
  let t = 0;
  let flow = makeBudgetFlow(id, nu);
  const out = createBudget();
  const probe = new Float64Array(2);
  probe[0] = PROBE[id][0];
  probe[1] = PROBE[id][1];
  const vals = new Float64Array(8); // five terms, two sides, residual (projected)

  const left = h('div.bud-panel');
  const right = h('div.bud-panel');
  ui.stage.append(left, right);
  const view = planeView(left, {
    domain: flow.domain,
    label: 'An exact flow, shaded by speed, with a probe you can drag.',
    minHeight: 200,
    maxHeight: 320,
  });
  let heat = null;
  let skip = null;
  const bars = canvasBox(right, { aspect: 1.25, minHeight: 250, maxHeight: 360, label: 'Bar chart of the five terms of the momentum equation at the probe, the two sides of the equation, and their difference.' });

  // ---- controls ----
  select(ui.controls, {
    label: 'Exact solution',
    options: Object.entries(BUDGET_FLOWS).map(([k, s]) => [k, s.name]),
    value: id,
    onChange: (v) => setFlow(v),
  });
  slider(ui.controls, {
    label: 'Viscosity ν',
    min: 0.001,
    max: 0.1,
    log: true,
    value: nu,
    fmt: (v) => fmt(v, 2),
    onInput: (v) => {
      nu = v;
      if ('nu' in flow.params) flow.params.nu = v;
      ref = refScale();
      sample();
      draw();
    },
  });
  toggle(ui.controls, {
    label: 'Keep the viscous term (Navier–Stokes)',
    checked: true,
    onChange: (v) => {
      viscous = v;
      draw();
    },
  });
  segmented(ui.controls, {
    label: 'Component',
    options: [
      ['along', 'along u'],
      ['across', 'across u'],
    ],
    value: comp,
    onChange: (v) => {
      comp = v;
      draw();
    },
  });
  const loop = animate(fig, tick, { signal: ctx.signal, autoplay: false });
  playButton(ui.controls, loop, { label: 'Run time' });
  button(ui.controls, { label: 't = 0', onClick: () => ((t = 0), sample(), draw()) });

  const rPos = readout(ui.readouts, { label: 'Probe (x, y), t' });
  const rU = readout(ui.readouts, { label: 'Speed |u|' });
  const rBig = readout(ui.readouts, { label: 'Largest term (either component)' });
  const rRes = readout(ui.readouts, { label: 'Residual / largest term' });

  // Typical size of the terms for this flow (largest |term| on a coarse
  // lattice at t = 0), so that "every term is zero here" can be recognised.
  let ref = 1;
  function refScale() {
    const d = flow.domain;
    let m = 0;
    for (let j = 1; j < 8; j++) {
      for (let i = 1; i < 8; i++) {
        const x = d.xmin + ((d.xmax - d.xmin) * i) / 8;
        const y = d.ymin + ((d.ymax - d.ymin) * j) / 8;
        if (!clear(x, y)) continue;
        momentumBudget(id, flow, x, y, 0, nu, out);
        m = Math.max(m, out.scale);
      }
    }
    return m > 0 ? m : 1;
  }
  // The probe's finite-difference stencil must stay in the fluid: keep it a
  // little way off a solid body.
  function clear(x, y) {
    if (!flow.solid) return true;
    const p = flow.params;
    if (id === 'cylinder') return Math.hypot(x - p.x0, y - p.y0) > 1.01 * p.R;
    return !flow.solid(x, y);
  }

  function setFlow(v) {
    id = v;
    flow = makeBudgetFlow(id, nu);
    ref = refScale();
    t = 0;
    probe[0] = PROBE[id][0];
    probe[1] = PROBE[id][1];
    view.setDomain(flow.domain);
    const d = view.domain;
    heat = heatLayer(90, Math.max(30, Math.round((90 * (d.ymax - d.ymin)) / (d.xmax - d.xmin))));
    skip = flow.solid ? (x, y) => flow.solid(x, y) : null;
    sample();
    draw();
  }

  const VEL = new Float64Array(2);
  function sample() {
    const d = view.domain;
    for (let j = 0; j < heat.ny; j++) {
      const y = heat.y(j, d);
      for (let i = 0; i < heat.nx; i++) {
        const x = heat.x(i, d);
        flow.velocity(x, y, t, VEL);
        heat.values[i + j * heat.nx] = flow.solid && flow.solid(x, y) ? NaN : Math.hypot(VEL[0], VEL[1]);
      }
    }
  }

  function tick(dt) {
    t += dt;
    sample();
    draw();
  }

  // Project the vector terms onto the chosen direction.
  function project() {
    momentumBudget(id, flow, probe[0], probe[1], t, nu, out, { viscous });
    const u = out.u[0];
    const v = out.u[1];
    const s = Math.hypot(u, v);
    let ex = 1;
    let ey = 0;
    if (s > 1e-9) {
      ex = u / s;
      ey = v / s;
    }
    if (comp === 'across') {
      const tmp = ex;
      ex = -ey;
      ey = tmp;
    }
    for (let k = 0; k < 5; k++) {
      const a = out[ROWS[k].key];
      vals[k] = a[0] * ex + a[1] * ey;
    }
    vals[5] = vals[0] + vals[1];
    vals[6] = vals[2] + (viscous ? vals[3] : 0) + vals[4];
    vals[7] = out.residual[0] * ex + out.residual[1] * ey;
    return s;
  }

  function draw() {
    const pal = palette();
    // Field.
    const c = view.box.ctx;
    view.clear(pal);
    heat.paint('seq', 0, UREF[id], { alpha: 0.6 });
    c.save();
    view.clip();
    heat.draw(view);
    const d = view.domain;
    if (id === 'cylinder') {
      const p = flow.params;
      c.fillStyle = pal.css('solid');
      c.beginPath();
      c.arc(view.X(p.x0), view.Y(p.y0), p.R * view.s, 0, 2 * Math.PI);
      c.fill();
    }
    velocityArrows(view, flow, t, { cols: 14, scale: (0.65 * (d.xmax - d.xmin)) / 14 / UREF[id], pal, skip });
    // Probe.
    const px = view.X(probe[0]);
    const py = view.Y(probe[1]);
    c.strokeStyle = pal.css('accent');
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(px, py, 9, 0, 2 * Math.PI);
    c.moveTo(px - 14, py);
    c.lineTo(px - 4, py);
    c.moveTo(px + 4, py);
    c.lineTo(px + 14, py);
    c.moveTo(px, py - 14);
    c.lineTo(px, py - 4);
    c.moveTo(px, py + 4);
    c.lineTo(px, py + 14);
    c.stroke();
    c.restore();
    view.border(pal);

    const speed = project();
    drawBars(pal, speed);

    // Numbers.
    rPos.set(`(${fmt(probe[0], 3)}, ${fmt(probe[1], 3)}), t = ${fmt(t, 3)}`);
    rU.set(speed);
    rBig.set(out.scale);
    // At a stagnation point or a vortex centre every term vanishes and a
    // relative residual is meaningless; measure against the flow's own scale.
    const still = out.scale < 1e-6 * ref;
    const res = Math.hypot(out.residual[0], out.residual[1]) / Math.max(out.scale, 1e-300);
    const balanced = still || res < 1e-5;
    rRes.set(still ? 'every term ≈ 0 here' : sci(Math.max(res, 1e-17), 1), balanced ? 'good' : 'bad');
    const visc = Math.hypot(out.viscous[0], out.viscous[1]) / Math.max(out.scale, 1e-300);
    if (still) ui.status.textContent = 'Every term is zero here (a stagnation point or the centre of a vortex): nothing to balance. Move the probe.';
    else if (viscous) ui.status.textContent = balanced ? `Balanced to ${sci(Math.max(res, 1e-17), 1)} of the largest term: this field solves the Navier–Stokes equations here.` : 'Out of balance.';
    else if (balanced) ui.status.textContent = 'Balanced without the viscous term: here ν∇²u = 0, so this flow also solves Euler’s equations.';
    else ui.status.textContent = `Without the viscous term the books do not balance: the missing ν∇²u is ${fmt(100 * visc, 2)}% of the largest term. This flow needs viscosity.`;
  }

  function drawBars(pal, speed) {
    const c = bars.ctx;
    const W = bars.width;
    const H = bars.height;
    bars.clear(pal.css('board'));
    c.font = '13px "Atkinson Hyperlegible", system-ui, sans-serif';
    const labW = Math.min(110, Math.max(84, W * 0.26));
    const valW = 76;
    const x0 = labW;
    const x1 = W - valW;
    const zero = (x0 + x1) / 2;
    const half = (x1 - x0) / 2 - 4;
    let big = 1e-300;
    for (let k = 0; k < 8; k++) big = Math.max(big, Math.abs(vals[k]));
    const n = 9; // 5 terms, a gap, 2 sums, residual
    const top = 26;
    const rowH = Math.max(18, (H - top - 6) / n);
    c.textBaseline = 'middle';
    c.fillStyle = pal.css('muted');
    c.textAlign = 'center';
    const dir = speed > 1e-9 ? (comp === 'along' ? 'component along u' : 'component across u') : comp === 'along' ? 'x component (u = 0 here)' : 'y component (u = 0 here)';
    c.fillText(dir, (x0 + x1) / 2, 12);
    c.strokeStyle = pal.css('line');
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(Math.round(zero) + 0.5, top - 2);
    c.lineTo(Math.round(zero) + 0.5, H - 4);
    c.stroke();
    const row = (r, label, v, color, opts = {}) => {
      const y = top + (r + 0.5) * rowH;
      c.textAlign = 'right';
      c.fillStyle = pal.css(opts.dim ? 'muted' : 'ink');
      c.fillText(label, x0 - 8, y);
      const w = (v / big) * half;
      const bh = Math.min(14, rowH - 6);
      if (opts.outline) {
        c.strokeStyle = pal.css(color);
        c.lineWidth = 2;
        c.strokeRect(Math.min(zero, zero + w), y - bh / 2, Math.abs(w), bh);
      } else {
        c.fillStyle = pal.css(color, opts.dim ? 0.3 : 0.9);
        c.fillRect(Math.min(zero, zero + w), y - bh / 2, Math.abs(w), bh);
      }
      c.textAlign = 'left';
      c.fillStyle = pal.css(opts.dim ? 'muted' : 'ink');
      c.fillText(Math.abs(v) < 1e-12 * big ? '0' : Math.abs(v) < 1e-3 * big ? sci(v, 1) : fmt(v, 3), x1 + 6, y);
    };
    for (let k = 0; k < 5; k++) row(k, ROWS[k].label, vals[k], ROWS[k].color, { dim: k === 3 && !viscous });
    row(5.4, 'left side', vals[5], 'ink', { outline: true });
    row(6.4, 'right side', vals[6], 'ink', { outline: true });
    row(7.6, 'residual', vals[7], 'accent');
    // Separator between the terms and the sums.
    c.strokeStyle = pal.css('grid');
    c.beginPath();
    c.moveTo(8, top + 5.1 * rowH);
    c.lineTo(W - 8, top + 5.1 * rowH);
    c.stroke();
  }

  // ---- probe dragging ----
  const P = new Float64Array(2);
  let dragging = false;
  const cv = view.box.canvas;
  cv.tabIndex = 0;
  const moveTo = (e) => {
    view.toPlane(e, P);
    const dd = view.domain;
    const ex = 0.02 * (dd.xmax - dd.xmin);
    P[0] = Math.min(dd.xmax - ex, Math.max(dd.xmin + ex, P[0]));
    P[1] = Math.min(dd.ymax - ex, Math.max(dd.ymin + ex, P[1]));
    if (!clear(P[0], P[1])) return;
    probe[0] = P[0];
    probe[1] = P[1];
    draw();
  };
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    dragging = true;
    moveTo(e);
  });
  cv.addEventListener('pointermove', (e) => dragging && moveTo(e));
  cv.addEventListener('pointerup', () => (dragging = false));
  cv.addEventListener('pointercancel', () => (dragging = false));
  cv.addEventListener('keydown', (e) => {
    const s = 0.04 * (view.domain.xmax - view.domain.xmin);
    const mv = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, s], ArrowDown: [0, -s] }[e.key];
    if (!mv) return;
    e.preventDefault();
    const x = probe[0] + mv[0];
    const y = probe[1] + mv[1];
    if (!clear(x, y)) return;
    probe[0] = x;
    probe[1] = y;
    draw();
  });

  view.box.onResize(() => draw());
  bars.onResize(() => draw());
  setFlow(id);
  return () => {
    loop.destroy();
    view.box.destroy();
    bars.destroy();
  };
}
