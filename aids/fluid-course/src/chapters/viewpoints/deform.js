// viewpoints-deform: what a small parcel does in five simple flows. A
// material loop (carried point by point with RK4 by flows.js advectLoop)
// shows translation, spin, stretching and growth; two material diameters
// show how individual lines turn; a small rigid paddle at the centre turns
// at ω/2, integrated along the centre's path. Readouts give ∇·u, ω and σ at
// the centre (gradientParts of flows.js velocityGradient) and the loop's
// area against its starting area.

import { fmt } from '../../kit/dom.js';
import { frame, select, button, readout, playButton, animate } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';
import { makeFlow, rkStep, velocityGradient, createMaterialLoop, resetMaterialLoop, advectLoop, loopArea } from '../../sims/flows.js';
import { gradientParts } from '../../sims/ch-viewpoints-kinematics.js';
import { planeView, dragHandles, drawFlowArrows, clamp } from './view.js';

const FLOWS = {
  rotation: {
    label: 'Solid-body rotation',
    make: () => makeFlow('rotation', { Omega: 1 }),
    view: { xmin: -1.95, xmax: 1.95, ymin: -1.3, ymax: 1.3 },
    centre: [0.9, 0],
    r: 0.3,
    run: 2 * Math.PI,
    arrows: [12, 8],
    note: 'Solid-body rotation: the parcel turns as a rigid whole. Both diameters and the paddle turn together, at ω/2 = Ω, and nothing stretches.',
  },
  shear: {
    label: 'Simple shear',
    make: () => makeFlow('couette', { U: 1, H: 1 }),
    view: { xmin: 0, xmax: 3, ymin: 0, ymax: 1 },
    centre: [0.6, 0.5],
    r: 0.25,
    run: 2.5,
    arrows: [12, 4],
    note: 'Simple shear: half spin, half strain. The horizontal diameter does not turn, the upright one tips over, and the paddle turns steadily at ω/2. The circle becomes a tilted ellipse.',
  },
  strain: {
    label: 'Pure strain',
    make: () => makeFlow('stagnation', { a: 1 }),
    view: { xmin: -1.2, xmax: 1.8, ymin: -0.2, ymax: 1.8 },
    centre: [0.15, 1.45],
    r: 0.25,
    run: 1.5,
    arrows: [12, 8],
    note: 'Pure strain: no spin at all (ω = 0, the paddle stays still), but the circle is stretched along x and squeezed along y at the same rate, so its area stays put.',
  },
  vortex: {
    label: 'Point vortex, outside its core',
    make: () => makeFlow('rankine'),
    view: { xmin: -1.95, xmax: 1.95, ymin: -1.3, ymax: 1.3 },
    centre: [1.1, 0],
    r: 0.2,
    run: 3,
    arrows: [12, 8],
    note: 'Outside the core of a vortex the fluid goes round, yet ω = 0: the paddle keeps facing the same way while the parcel orbits and is sheared out.',
  },
  source: {
    label: 'Source, inside its core',
    make: () => makeFlow('source', { m: Math.PI, a: 1 }),
    view: { xmin: -1.2, xmax: 1.2, ymin: -0.8, ymax: 0.8 },
    centre: [0.25, 0.15],
    r: 0.2,
    run: 1,
    arrows: [12, 8],
    note: 'Inside the source’s core fluid is being added: ∇·u = 1, so the parcel’s area grows like e^t. No spin and no shape change.',
  },
};

const N = 120; // points on the loop
const Q = N / 4; // the diameters join points 0–2Q and Q–3Q
const H = 0.02; // largest step
const HOLD = 1.5; // seconds to hold the final frame before going again

export function mountDeform(fig, ctx) {
  const ui = frame(fig, { title: 'What a small parcel does', wide: true });
  const view = planeView(ui.stage, {
    domain: FLOWS.rotation.view,
    aspect: 1.5,
    maxHeight: 440,
    label: 'A small circle of fluid carried by the flow, with two of its diameters and a small rigid paddle at its centre.',
  });
  const loop = createMaterialLoop({ n: N, capacity: N });
  const O = new Float64Array(2);
  const parts = {};
  let spec = FLOWS.rotation;
  let flow = spec.make();
  let t = 0;
  let cx = 0;
  let cy = 0;
  let phi = 0; // paddle angle
  let turn1 = 0; // how far each material diameter has turned (unwrapped)
  let turn2 = 0;
  let prev1 = 0;
  let prev2 = 0;
  let hold = 0;
  let x0 = 0;
  let y0 = 0;

  function reset() {
    t = 0;
    phi = 0;
    hold = 0;
    cx = x0;
    cy = y0;
    resetMaterialLoop(loop, { cx: x0, cy: y0, r: spec.r, n: N });
    turn1 = 0;
    turn2 = 0;
    prev1 = diamAngle(0, 2 * Q);
    prev2 = diamAngle(Q, 3 * Q);
  }

  function setFlow(id) {
    spec = FLOWS[id] || FLOWS.rotation;
    flow = spec.make();
    view.setDomain(spec.view);
    x0 = spec.centre[0];
    y0 = spec.centre[1];
    reset();
    ui.status.textContent = spec.note;
    draw();
  }

  function advance(dt) {
    if (t >= spec.run - 1e-9) {
      hold += dt;
      if (hold > HOLD) {
        reset();
        ui.status.textContent = spec.note;
      }
      return;
    }
    let left = Math.min(dt, spec.run - t);
    while (left > 1e-12) {
      const h = Math.min(H, left);
      // Paddle: dφ/dt = ω/2 at the centre (midpoint rule in time along the path).
      gradientParts(velocityGradient(flow, cx, cy, t), parts);
      const w0 = parts.vort;
      advectLoop(loop, flow, t, h, 'rk4');
      rkStep(flow, cx, cy, t, h, 'rk4', O);
      cx = O[0];
      cy = O[1];
      gradientParts(velocityGradient(flow, cx, cy, t + h), parts);
      phi += 0.25 * h * (w0 + parts.vort);
      const a1 = diamAngle(0, 2 * Q);
      const a2 = diamAngle(Q, 3 * Q);
      turn1 += wrap(a1 - prev1);
      turn2 += wrap(a2 - prev2);
      prev1 = a1;
      prev2 = a2;
      t += h;
      left -= h;
    }
    if (t >= spec.run - 1e-9) {
      const ratio = loopArea(loop, true) / loop.area0;
      ui.status.textContent = `After t = ${fmt(spec.run, 3)}: area × ${fmt(ratio, 4)}. ${spec.note}`;
    }
  }

  const deg = (a) => (a * 180) / Math.PI;
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const ang = (a) => fmt(Math.abs(deg(a)) < 0.05 ? 0 : deg(a), 3);
  const diamAngle = (i, j) => Math.atan2(loop.y[j] - loop.y[i], loop.x[j] - loop.x[i]);

  function draw() {
    const pal = palette();
    const c = view.box.ctx;
    const s = view.s;
    view.clear(pal);
    c.save();
    view.clip();
    drawFlowArrows(view, flow, t, spec.view, { nx: spec.arrows[0], ny: spec.arrows[1], scale: 0.3, color: 'ink', alpha: 0.35, pal });
    // Start position, faint.
    c.strokeStyle = pal.css('muted', 0.7);
    c.lineWidth = 1;
    c.setLineDash([3, 4]);
    c.beginPath();
    view.dot(x0, y0, spec.r * s);
    c.stroke();
    c.setLineDash([]);
    // The parcel.
    c.fillStyle = pal.css('s1', 0.22);
    c.strokeStyle = pal.css('s1');
    c.lineWidth = 2;
    c.beginPath();
    view.path(loop.x, loop.y, 0, loop.n);
    c.closePath();
    c.fill();
    c.stroke();
    // Two material diameters.
    const q = Q;
    c.strokeStyle = pal.css('s3');
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(view.X(loop.x[0]), view.Y(loop.y[0]));
    c.lineTo(view.X(loop.x[2 * q]), view.Y(loop.y[2 * q]));
    c.moveTo(view.X(loop.x[q]), view.Y(loop.y[q]));
    c.lineTo(view.X(loop.x[3 * q]), view.Y(loop.y[3 * q]));
    c.stroke();
    // Principal axes of strain at the centre: stretch outward, squeeze inward.
    gradientParts(velocityGradient(flow, cx, cy, t), parts);
    const L = clamp(parts.sigma, 0, 1.5) * 0.35 * spec.r * s * 2.5;
    if (L > 3) {
      c.strokeStyle = pal.css('accent');
      c.fillStyle = pal.css('accent');
      c.lineWidth = 1.75;
      const px = view.X(cx);
      const py = view.Y(cy);
      // Stretching axis e and squeezing axis n, in canvas directions (y down).
      const ex = Math.cos(parts.theta);
      const ey = -Math.sin(parts.theta);
      const nx = -Math.sin(parts.theta);
      const ny = -Math.cos(parts.theta);
      const base = spec.r * s * 0.55;
      const tip = base + L;
      for (let sg = 1; sg >= -1; sg -= 2) {
        arrow(c, px + sg * ex * base, py + sg * ey * base, px + sg * ex * tip, py + sg * ey * tip, 5);
        arrow(c, px + sg * nx * tip, py + sg * ny * tip, px + sg * nx * base, py + sg * ny * base, 5);
      }
    }
    // The paddle: rigid, turning at ω/2.
    const pr = Math.max(7, spec.r * s * 0.45);
    const px = view.X(cx);
    const py = view.Y(cy);
    c.strokeStyle = pal.css('ink');
    c.lineWidth = 3;
    c.beginPath();
    for (let k = 0; k < 2; k++) {
      const a = phi + (k * Math.PI) / 2;
      c.moveTo(px - pr * Math.cos(a), py + pr * Math.sin(a));
      c.lineTo(px + pr * Math.cos(a), py - pr * Math.sin(a));
    }
    c.stroke();
    c.fillStyle = pal.css('ink');
    c.beginPath();
    c.arc(px + pr * Math.cos(phi), py - pr * Math.sin(phi), 3.5, 0, 2 * Math.PI);
    c.fill();
    c.restore();
    if (spec === FLOWS.shear) {
      // The two walls of the shear flow.
      c.strokeStyle = pal.css('solid');
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(view.X(spec.view.xmin), view.Y(0) + 2);
      c.lineTo(view.X(spec.view.xmax), view.Y(0) + 2);
      c.moveTo(view.X(spec.view.xmin), view.Y(1) - 2);
      c.lineTo(view.X(spec.view.xmax), view.Y(1) - 2);
      c.stroke();
    }
    view.border(pal);

    rDiv.set(Math.abs(parts.div) < 1e-6 ? 0 : parts.div);
    rVort.set(Math.abs(parts.vort) < 1e-6 ? 0 : parts.vort);
    rSigma.set(parts.sigma < 1e-6 ? 0 : parts.sigma);
    rArea.set(loopArea(loop, true) / loop.area0);
    rTurn.set(`paddle ${ang(phi)}° · diameters ${ang(turn1)}°, ${ang(turn2)}°`);
  }

  const flowSel = select(ui.controls, {
    label: 'Flow',
    options: Object.entries(FLOWS).map(([k, f]) => [k, f.label]),
    value: FLOWS[fig.dataset.preset] ? fig.dataset.preset : 'shear',
    onChange: (v) => setFlow(v),
  });
  const anim = animate(
    fig,
    (dt) => {
      advance(dt);
      draw();
    },
    { autoplay: true, signal: ctx.signal },
  );
  playButton(ui.controls, anim);
  button(ui.controls, {
    label: 'Start again',
    onClick: () => {
      reset();
      ui.status.textContent = spec.note;
      draw();
    },
  });

  const rDiv = readout(ui.readouts, { label: '∇·u (area growth rate)', fmt: (v) => fmt(v, 3) });
  const rVort = readout(ui.readouts, { label: 'ω (vorticity)', fmt: (v) => fmt(v, 3) });
  const rSigma = readout(ui.readouts, { label: 'σ (strain rate)', fmt: (v) => fmt(v, 3) });
  const rArea = readout(ui.readouts, { label: 'area A/A₀', fmt: (v) => fmt(v, 5) });
  const rTurn = readout(ui.readouts, { label: 'turned so far' });

  dragHandles(view, {
    pick: (x, y, slop) => (Math.hypot(x - cx, y - cy) < Math.max(slop, spec.r * 1.2) ? 'parcel' : null),
    move: (_k, x, y) => {
      const d = spec.view;
      const m = spec.r + 0.02;
      x0 = clamp(x, d.xmin + m, d.xmax - m);
      y0 = clamp(y, d.ymin + m, d.ymax - m);
      reset();
      ui.status.textContent = spec.note;
      draw();
    },
  });

  view.box.onResize(() => draw());
  ctx.signal?.addEventListener('abort', () => view.box.destroy());
  setFlow(flowSel.value);
}
