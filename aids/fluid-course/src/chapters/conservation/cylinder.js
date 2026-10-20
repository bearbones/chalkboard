// Figure: inviscid (potential) flow past a cylinder, with a circulation
// slider. Left: surface-pressure coefficient as shading, streamlines
// (contours of the closed-form stream function), and the pressure force on
// the surface as arrows. Right: Cp(θ) on the surface against the Γ = 0
// curve 1 − 4 sin²θ. The flow, Cp and the stagnation points come from the
// 'cylinder' entry of src/sims/flows.js; drag and lift are integrated from
// the surface pressure by cylinderForce() in src/sims/ch-conservation.js and
// compared with the Kutta–Joukowski value −ρUΓ.

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, slider, toggle, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette, gradientCss } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';
import { makeFlow } from '../../sims/flows.js';
import { cylinderForce } from '../../sims/ch-conservation.js';
import { planeView, heatLayer, contourSegments, strokeSegments } from './plane.js';

const PRESETS = { paradox: 0, lift: -4, detached: -8 };
const NTH = 241;
const NARROW = 28;
const LEVELS = Array.from({ length: 41 }, (_, k) => (k - 20) * 0.15 + 1e-7);
const SEGMAX = 24000;

export function mountConservationCylinder(fig, ctx) {
  const ui = frame(fig, { title: 'Potential flow past a cylinder: no drag, whatever you do', wide: true });
  ui.stage.classList.add('cols');
  const flow = makeFlow('cylinder', { U: 1, R: 0.5, Gamma: PRESETS[fig.dataset.preset] ?? 0 });
  const p = flow.params;
  const rho = 1;

  const left = h('div.cyl-panel');
  const right = h('div.cyl-panel');
  ui.stage.append(left, right);
  const view = planeView(left, {
    domain: { xmin: -2, xmax: 2, ymin: -1.5, ymax: 1.5 },
    label: 'Potential flow past a cylinder: shading shows the pressure coefficient, lines are streamlines, arrows on the surface show the pressure force.',
    minHeight: 200,
    maxHeight: 380,
  });
  const bar = h('div.legend-bar');
  left.append(h('div.legend-row', { 'aria-hidden': 'true' }, bar, h('div.legend-labels', h('span', 'Cp −3 (suction)'), h('span', '0'), h('span', '+3 (push)'))));
  const heat = heatLayer(120, 90);
  const mask = new Uint8Array(120 * 90);
  const psi = heatLayer(160, 120);
  const psiMask = new Uint8Array(160 * 120);
  const seg = new Float32Array(4 * SEGMAX);
  let nseg = 0;
  const d = view.domain;
  for (let j = 0; j < 90; j++) for (let i = 0; i < 120; i++) mask[i + j * 120] = flow.solid(heat.x(i, d), heat.y(j, d)) ? 1 : 0;
  for (let j = 0; j < 120; j++) for (let i = 0; i < 160; i++) psiMask[i + j * 160] = flow.solid(psi.x(i, d), psi.y(j, d)) ? 1 : 0;

  const plot = new Plot(right, {
    x: { label: 'angle θ on the surface (degrees, 0 = rear)', min: 0, max: 360 },
    y: { label: 'Cp', min: -4, max: 1.5 },
    aspect: 1.3,
    minHeight: 200,
    maxHeight: 360,
    label: 'Surface pressure coefficient against angle, with the zero-circulation curve for reference.',
  });
  const th = new Float64Array(NTH);
  const cp = new Float64Array(NTH);
  const cp0 = new Float64Array(NTH);
  for (let k = 0; k < NTH; k++) {
    th[k] = (360 * k) / (NTH - 1);
    const s = Math.sin((th[k] * Math.PI) / 180);
    cp0[k] = 1 - 4 * s * s;
  }

  // ---- controls ----
  slider(ui.controls, {
    label: 'Circulation Γ (anticlockwise +)',
    min: -9,
    max: 9,
    step: 0.05,
    value: p.Gamma,
    fmt: (v) => fmt(v, 3),
    onInput: (v) => {
      p.Gamma = Math.abs(v) < 0.025 ? 0 : v;
      recompute();
      draw();
    },
    wide: true,
  });
  let showArrows = true;
  toggle(ui.controls, { label: 'Pressure arrows on the surface', checked: true, onChange: (v) => ((showArrows = v), draw()) });

  const rDrag = readout(ui.readouts, { label: "Drag D′ = −∮ p nₓ ds" });
  const rLift = readout(ui.readouts, { label: "Lift L′ = −∮ p n_y ds" });
  const rKJ = readout(ui.readouts, { label: 'Kutta–Joukowski −ρUΓ' });
  const rRatio = readout(ui.readouts, { label: 'Γ / (4πRU)' });
  const rStag = readout(ui.readouts, { label: 'Stagnation points' });

  const force = { drag: 0, lift: 0 };
  let ymin = -4;

  function recompute() {
    // Pressure field and stream function on their grids (closed forms).
    for (let j = 0; j < heat.ny; j++) {
      const y = heat.y(j, d);
      for (let i = 0; i < heat.nx; i++) heat.values[i + j * heat.nx] = flow.pressureCoefficient(heat.x(i, d), y);
    }
    for (let j = 0; j < psi.ny; j++) {
      const y = psi.y(j, d);
      for (let i = 0; i < psi.nx; i++) psi.values[i + j * psi.nx] = flow.streamfunction(psi.x(i, d), y);
    }
    nseg = contourSegments(psi, d, LEVELS, seg, psiMask);
    let mn = 0;
    for (let k = 0; k < NTH; k++) {
      cp[k] = flow.surfaceCp((th[k] * Math.PI) / 180);
      mn = Math.min(mn, cp[k]);
    }
    ymin = mn >= -3.9 ? -4 : mn >= -9.8 ? -10 : -25;
    plot.setAxes({ y: { min: ymin } });
    cylinderForce(flow, 256, rho, force);
    update();
  }

  function update() {
    rDrag.set(Math.abs(force.drag) < 1e-12 ? `0 (to ${sci(Math.max(Math.abs(force.drag), 1e-17), 1)})` : fmt(force.drag, 4), Math.abs(force.drag) < 1e-12 ? 'good' : 'bad');
    rLift.set(Math.abs(force.lift) < 1e-12 ? '0' : `${fmt(force.lift, 4)} ${force.lift > 0 ? '(up)' : '(down)'}`);
    rKJ.set(flow.liftPerSpan(rho) === 0 ? '0' : fmt(flow.liftPerSpan(rho), 4));
    const k = p.Gamma / (4 * Math.PI * p.R * p.U);
    rRatio.set(fmt(k, 3), Math.abs(k) > 1 ? 'bad' : '');
    const sp = flow.stagnationPoints();
    if (sp.length === 2) {
      const a1 = (Math.atan2(sp[0][1], sp[0][0]) * 180) / Math.PI;
      const a2 = (Math.atan2(sp[1][1], sp[1][0]) * 180) / Math.PI;
      rStag.set(`on the surface at ${fmt((a1 + 360) % 360, 3)}° and ${fmt((a2 + 360) % 360, 3)}°`);
    } else if (sp.length === 1) rStag.set(`one, off the body at y = ${fmt(sp[0][1], 3)}`);
    else rStag.set('none');
    if (p.Gamma === 0) ui.status.textContent = 'No circulation: the pressure is symmetric front to back, so the push on the front is cancelled by the push on the back. Drag zero.';
    else if (Math.abs(k) <= 1) ui.status.textContent = `Faster flow ${p.Gamma < 0 ? 'over the top' : 'underneath'}, lower pressure there: lift ${p.Gamma < 0 ? 'up' : 'down'}, equal to −ρUΓ. Front and back still balance: drag zero.`;
    else ui.status.textContent = 'Past Γ = 4πRU the two stagnation points meet and leave the surface: a ring of fluid now circles the body. Still no drag.';
  }

  // ---- drawing ----
  function draw() {
    const pal = palette();
    const c = view.box.ctx;
    bar.style.background = gradientCss('div');
    view.clear(pal);
    heat.paint('div', -3, 3, { mask, alpha: 0.85 });
    c.save();
    view.clip();
    heat.draw(view);
    // Streamlines.
    c.strokeStyle = pal.css('ink', 0.55);
    c.lineWidth = 1;
    strokeSegments(view, seg, nseg);
    // Body.
    const X0 = view.X(p.x0);
    const Y0 = view.Y(p.y0);
    const Rp = p.R * view.s;
    c.fillStyle = pal.css('solid');
    c.beginPath();
    c.arc(X0, Y0, Rp, 0, 2 * Math.PI);
    c.fill();
    c.strokeStyle = pal.css('ink');
    c.lineWidth = 1.5;
    c.stroke();
    // Pressure force per unit area on the surface: −(p − p∞) n = −½ρU²Cp n.
    if (showArrows) {
      for (let k = 0; k < NARROW; k++) {
        const a = (2 * Math.PI * (k + 0.5)) / NARROW;
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        const cpk = flow.surfaceCp(a);
        let L = 0.1 * Math.abs(cpk);
        if (L > 0.42) L = 0.42;
        if (L * view.s < 3) continue;
        const sx = p.x0 + p.R * nx;
        const sy = p.y0 + p.R * ny;
        const suction = cpk < 0;
        c.strokeStyle = pal.css(suction ? 's2' : 's1');
        c.fillStyle = pal.css(suction ? 's2' : 's1');
        c.lineWidth = 1.8;
        if (suction) arrow(c, view.X(sx), view.Y(sy), view.X(sx + nx * L), view.Y(sy + ny * L), 5);
        else arrow(c, view.X(sx + nx * L), view.Y(sy + ny * L), view.X(sx), view.Y(sy), 5);
      }
    }
    // Stagnation points.
    c.strokeStyle = pal.css('ink');
    c.fillStyle = pal.css('board');
    c.lineWidth = 2;
    for (const s of flow.stagnationPoints()) {
      c.beginPath();
      c.arc(view.X(s[0]), view.Y(s[1]), 4.5, 0, 2 * Math.PI);
      c.fill();
      c.stroke();
    }
    // Free stream label.
    c.fillStyle = pal.css('ink');
    c.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillText('U →', view.X(d.xmin) + 6, view.Y(d.ymax) + 4);
    c.restore();
    view.border(pal);

    plot.draw(
      [
        { x: th, y: cp0, color: 'muted', dash: [5, 4], width: 1.5, label: 'Γ = 0: 1 − 4 sin²θ' },
        { x: th, y: cp, color: 's1', width: 2.2, label: `Γ = ${fmt(p.Gamma, 3)}` },
      ],
      {
        extra: (cc, tx, ty, area, pp) => {
          // Mark the stagnation angles on the curve.
          cc.fillStyle = pp.css('board');
          cc.strokeStyle = pp.css('ink');
          cc.lineWidth = 2;
          for (const s of flow.stagnationPoints()) {
            if (Math.abs(Math.hypot(s[0] - p.x0, s[1] - p.y0) - p.R) > 1e-9) continue;
            const deg = ((Math.atan2(s[1] - p.y0, s[0] - p.x0) * 180) / Math.PI + 360) % 360;
            cc.beginPath();
            cc.arc(tx(deg), ty(1), 4, 0, 2 * Math.PI);
            cc.fill();
            cc.stroke();
          }
        },
      },
    );
  }

  view.box.onResize(() => draw());
  recompute();
  draw();
  return () => {
    view.box.destroy();
    plot.destroy();
  };
}
