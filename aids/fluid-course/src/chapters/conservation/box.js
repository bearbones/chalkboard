// Figure: a control volume you drag through a 2-D flow. The four face fluxes
// and the net outflow come from boxFlux() in src/sims/ch-conservation.js
// (Gauss–Legendre on the analytic fields of src/sims/flows.js); the other
// side of the divergence theorem, the source strength inside the box, from
// enclosedSource(). Tracer particles move with advectParticles() (flows.js).

import { h, fmt } from '../../kit/dom.js';
import { frame, slider, select, button, readout, playButton, animate } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';
import { makeFlow, advectParticles } from '../../sims/flows.js';
import { rng } from '../../sims/util.js';
import { boxFlux, enclosedSource } from '../../sims/ch-conservation.js';
import { planeView, heatLayer, velocityArrows } from './plane.js';

// Flows offered, with a reference speed for colours and arrow lengths.
const CASES = {
  source: { label: 'Source (fluid made in the core)', flow: 'source', params: {}, uref: 2.4, spawn: 'core' },
  'half-body': { label: 'Source in a stream', flow: 'source', params: { Uinf: 1 }, uref: 2.4, spawn: 'mixed' },
  sink: { label: 'Sink (fluid removed in the core)', flow: 'source', params: { m: -2 * Math.PI }, uref: 2.4, spawn: 'edges' },
  rankine: { label: 'Vortex (Rankine)', flow: 'rankine', params: {}, uref: 3, spawn: 'uniform' },
  stagnation: { label: 'Stagnation point', flow: 'stagnation', params: {}, uref: 2.4, spawn: 'uniform' },
  cylinder: { label: 'Flow past a cylinder', flow: 'cylinder', params: {}, uref: 1.6, spawn: 'left' },
  'double-gyre': { label: 'Double gyre (unsteady)', flow: 'double-gyre', params: {}, uref: 0.3, spawn: 'uniform' },
};

const PRESETS = {
  source: { flow: 'source', cx: 0.95, cy: 0.45, size: 0.8 },
  around: { flow: 'source', cx: 0.1, cy: -0.05, size: 1.0 },
  'half-body': { flow: 'half-body', cx: 0.2, cy: 0.1, size: 1.0 },
  rankine: { flow: 'rankine', cx: 0.3, cy: 0.2, size: 0.9 },
  stagnation: { flow: 'stagnation', cx: 0.5, cy: 0.5, size: 0.8 },
  cylinder: { flow: 'cylinder', cx: -0.6, cy: 0.35, size: 0.9 },
  'double-gyre': { flow: 'double-gyre', cx: 1.0, cy: 0.5, size: 0.5 },
};

const NP = 420; // tracer particles
const FACE_SAMPLES = 7;

export function mountConservationBox(fig, ctx) {
  const preset = PRESETS[fig.dataset.preset] ?? PRESETS.source;
  const ui = frame(fig, { title: 'A box in the flow: what goes in, what comes out', wide: true });

  let caseId = preset.flow;
  let spec = CASES[caseId];
  let flow = makeFlow(spec.flow, { ...spec.params });
  let t = 0;
  const b = { x0: 0, x1: 0, y0: 0, y1: 0 };
  let cx = preset.cx;
  let cy = preset.cy;
  let size = preset.size;

  const view = planeView(ui.stage, {
    domain: flow.domain,
    label: 'A flow field with a square control volume. Arrows on its faces show fluid crossing in or out; drag the box to move it.',
    minHeight: 220,
    maxHeight: 440,
  });
  view.box.canvas.tabIndex = 0;
  let heat = null;
  let skipSolid = null;
  const VEL = new Float64Array(2);

  const legend = h('div', { 'aria-hidden': 'true', style: { display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: '0.84rem', color: 'var(--muted)' } });
  ui.stage.append(legend);

  const flux = { left: 0, right: 0, bottom: 0, top: 0, net: 0 };
  const xs = new Float64Array(NP);
  const ys = new Float64Array(NP);
  const age = new Float64Array(NP);
  const life = new Float64Array(NP);
  let rand = rng(3);

  // ---- controls ----
  const flowSel = select(ui.controls, {
    label: 'Flow',
    options: Object.entries(CASES).map(([k, c]) => [k, c.label]),
    value: caseId,
    onChange: (v) => setCase(v),
  });
  const sizeSl = slider(ui.controls, {
    label: 'Box size',
    min: 0.2,
    max: 1.6,
    step: 0.02,
    value: size,
    fmt: (v) => v.toFixed(2),
    onInput: (v) => {
      size = v;
      placeBox();
      draw();
    },
  });
  const loop = animate(fig, tick, { signal: ctx.signal });
  playButton(ui.controls, loop, { label: 'Play' });
  button(ui.controls, {
    label: 'Centre the box',
    onClick: () => {
      // On the core, vortex, stagnation point or body; mid-domain otherwise.
      const d = view.domain;
      cx = flow.params.x0 ?? 0.5 * (d.xmin + d.xmax);
      cy = flow.params.y0 ?? 0.5 * (d.ymin + d.ymax);
      placeBox();
      draw();
    },
  });

  const rIn = readout(ui.readouts, { label: 'Out through the right face' });
  const rLeft = readout(ui.readouts, { label: 'Out through the left face' });
  const rTop = readout(ui.readouts, { label: 'Out through the top face' });
  const rBot = readout(ui.readouts, { label: 'Out through the bottom face' });
  const rNet = readout(ui.readouts, { label: 'Net outflow ∮ u·n ds' });
  const rSrc = readout(ui.readouts, { label: 'Source inside ∬ ∇·u dA' });
  const rDiff = readout(ui.readouts, { label: 'Difference (divergence theorem)' });

  // ---- state ----
  function placeBox() {
    const d = view.domain;
    const half = size / 2;
    const w = Math.min(half, (d.xmax - d.xmin) / 2 - 0.01);
    const hh = Math.min(half, (d.ymax - d.ymin) / 2 - 0.01);
    cx = Math.min(d.xmax - w, Math.max(d.xmin + w, cx));
    cy = Math.min(d.ymax - hh, Math.max(d.ymin + hh, cy));
    b.x0 = cx - w;
    b.x1 = cx + w;
    b.y0 = cy - hh;
    b.y1 = cy + hh;
  }

  function spawn(k, initial) {
    const d = view.domain;
    const p = flow.params;
    let mode = spec.spawn;
    if (mode === 'mixed') mode = rand() < 0.45 ? 'core' : 'left';
    if (mode === 'core') {
      const r = (p.a || 0.1) * Math.sqrt(rand());
      const th = 2 * Math.PI * rand();
      xs[k] = p.x0 + r * Math.cos(th);
      ys[k] = p.y0 + r * Math.sin(th);
      if (initial) {
        // Spread the first batch along their paths so the picture starts full.
        const rr = (p.a || 0.1) + 1.6 * rand();
        xs[k] = p.x0 + rr * Math.cos(th);
        ys[k] = p.y0 + rr * Math.sin(th);
      }
    } else if (mode === 'left' && !initial) {
      xs[k] = d.xmin + 0.02 * rand();
      ys[k] = d.ymin + (d.ymax - d.ymin) * rand();
    } else if (mode === 'edges' && !initial) {
      // Sink: fluid arrives from the edges of the picture.
      const s = rand() * 2 * ((d.xmax - d.xmin) + (d.ymax - d.ymin));
      const W = d.xmax - d.xmin;
      const H = d.ymax - d.ymin;
      if (s < W) {
        xs[k] = d.xmin + s;
        ys[k] = d.ymin + 0.01;
      } else if (s < 2 * W) {
        xs[k] = d.xmin + s - W;
        ys[k] = d.ymax - 0.01;
      } else if (s < 2 * W + H) {
        xs[k] = d.xmin + 0.01;
        ys[k] = d.ymin + s - 2 * W;
      } else {
        xs[k] = d.xmax - 0.01;
        ys[k] = d.ymin + s - 2 * W - H;
      }
    } else {
      xs[k] = d.xmin + (d.xmax - d.xmin) * rand();
      ys[k] = d.ymin + (d.ymax - d.ymin) * rand();
      if (flow.solid && flow.solid(xs[k], ys[k])) xs[k] = d.xmin + 0.01;
    }
    age[k] = initial ? 6 * rand() : 0;
    life[k] = 4 + 6 * rand();
  }

  function setCase(id, { keepBox = false } = {}) {
    caseId = id;
    spec = CASES[id];
    flow = makeFlow(spec.flow, { ...spec.params });
    t = 0;
    view.setDomain(flow.domain);
    const d = view.domain;
    heat = heatLayer(96, Math.max(24, Math.round((96 * (d.ymax - d.ymin)) / (d.xmax - d.xmin))));
    skipSolid = flow.solid ? (x, y) => flow.solid(x, y) : null;
    if (!keepBox) {
      cx = 0.5 * (d.xmin + d.xmax) + 0.25 * (d.xmax - d.xmin);
      cy = 0.5 * (d.ymin + d.ymax) + 0.1 * (d.ymax - d.ymin);
    }
    rand = rng(3);
    for (let k = 0; k < NP; k++) spawn(k, true);
    placeBox();
    sampleHeat();
    draw();
  }

  function sampleHeat() {
    const d = view.domain;
    const nx = heat.nx;
    const vel = VEL;
    for (let j = 0; j < heat.ny; j++) {
      const y = d.ymin + ((j + 0.5) * (d.ymax - d.ymin)) / heat.ny;
      for (let i = 0; i < nx; i++) {
        const x = d.xmin + ((i + 0.5) * (d.xmax - d.xmin)) / nx;
        flow.velocity(x, y, t, vel);
        heat.values[i + j * nx] = flow.solid && flow.solid(x, y) ? NaN : Math.hypot(vel[0], vel[1]);
      }
    }
  }

  // ---- drawing ----
  function draw() {
    const pal = palette();
    const c = view.box.ctx;
    view.clear(pal);
    heat.paint('seq', 0, spec.uref, { alpha: 0.55 });
    c.save();
    view.clip();
    heat.draw(view);
    const p = flow.params;
    // Body or core.
    if (spec.flow === 'cylinder') {
      c.fillStyle = pal.css('solid');
      c.beginPath();
      c.arc(view.X(p.x0), view.Y(p.y0), p.R * view.s, 0, 2 * Math.PI);
      c.fill();
    }
    velocityArrows(view, flow, t, { cols: 15, scale: (0.6 * (view.domain.xmax - view.domain.xmin)) / 15 / spec.uref, pal, skip: skipSolid });
    // Particles.
    c.fillStyle = pal.css('particle', 0.85);
    c.beginPath();
    for (let k = 0; k < NP; k++) {
      const px = view.X(xs[k]);
      const py = view.Y(ys[k]);
      c.moveTo(px + 1.7, py);
      c.arc(px, py, 1.7, 0, 2 * Math.PI);
    }
    c.fill();
    if (spec.flow === 'source') {
      c.strokeStyle = pal.css('accent');
      c.lineWidth = 1.5;
      c.setLineDash([4, 3]);
      c.beginPath();
      c.arc(view.X(p.x0), view.Y(p.y0), p.a * view.s, 0, 2 * Math.PI);
      c.stroke();
      c.setLineDash([]);
    }
    // The box.
    const X0 = view.X(b.x0);
    const X1 = view.X(b.x1);
    const Y0 = view.Y(b.y0);
    const Y1 = view.Y(b.y1);
    c.fillStyle = pal.css('write', 0.16);
    c.fillRect(X0, Y1, X1 - X0, Y0 - Y1);
    c.strokeStyle = pal.css('ink');
    c.lineWidth = 2;
    c.strokeRect(X0, Y1, X1 - X0, Y0 - Y1);
    // Face flux arrows: u·n at samples along each face, drawn along the normal.
    faceArrows(c, pal, b.x0, b.y0, b.x0, b.y1, -1, 0);
    faceArrows(c, pal, b.x1, b.y0, b.x1, b.y1, 1, 0);
    faceArrows(c, pal, b.x0, b.y0, b.x1, b.y0, 0, -1);
    faceArrows(c, pal, b.x0, b.y1, b.x1, b.y1, 0, 1);
    c.restore();
    view.border(pal);
  }

  function faceArrows(c, pal, xa, ya, xb, yb, nx, ny) {
    const k = 0.55 / spec.uref; // plane units of arrow per unit of u·n
    for (let m = 0; m < FACE_SAMPLES; m++) {
      const f = (m + 0.5) / FACE_SAMPLES;
      const x = xa + f * (xb - xa);
      const y = ya + f * (yb - ya);
      flow.velocity(x, y, t, VEL);
      const un = VEL[0] * nx + VEL[1] * ny;
      let L = un * k;
      if (L > 0.4) L = 0.4;
      if (L < -0.4) L = -0.4;
      if (Math.abs(L) * view.s < 3) continue;
      const out = un > 0;
      c.strokeStyle = pal.css(out ? 's2' : 's1');
      c.fillStyle = pal.css(out ? 's2' : 's1');
      c.lineWidth = 2.5;
      if (out) arrow(c, view.X(x), view.Y(y), view.X(x + nx * L), view.Y(y + ny * L), 6);
      else arrow(c, view.X(x - nx * L), view.Y(y - ny * L), view.X(x), view.Y(y), 6);
    }
  }

  function update() {
    boxFlux(flow, b, t, flux);
    const src = enclosedSource(flow, b);
    rIn.set(flux.right);
    rLeft.set(flux.left);
    rTop.set(flux.top);
    rBot.set(flux.bottom);
    const netZero = Math.abs(flux.net) < 1e-9;
    rNet.set(netZero ? fmt(0) + ' (to ' + fmt(Math.max(Math.abs(flux.net), 1e-16), 1) + ')' : fmt(flux.net, 4));
    rSrc.set(src, '');
    const diff = Math.abs(flux.net - src);
    rDiff.set(fmt(Math.max(diff, 1e-16), 2), diff < 1e-8 ? 'good' : 'bad');
    let msg;
    if (spec.flow === 'source') {
      const m = flow.params.m;
      const frac = src / m;
      const what = m > 0 ? 'made' : 'removed';
      if (frac > 0.999) msg = `The whole core is inside: net outflow = m = ${fmt(m, 3)} per unit depth, however big the box.`;
      else if (frac > 0.001) msg = `The box holds ${Math.round(100 * frac)}% of the core, so ${Math.round(100 * frac)}% of the fluid ${what} there crosses its faces.`;
      else msg = 'No source inside: what flows in through some faces flows out through others.';
    } else msg = `Net outflow zero: this flow is divergence-free, so what goes in comes out${flow.steady ? '' : ', at every instant'}.`;
    ui.status.textContent = msg;
  }

  function tick(dt) {
    const step = Math.min(dt, 1 / 30) * (spec.flow === 'double-gyre' ? 3 : 0.5);
    advectParticles(flow, xs, ys, NP, t, step, 'midpoint');
    t += step;
    const d = view.domain;
    for (let k = 0; k < NP; k++) {
      age[k] += step;
      const x = xs[k];
      const y = ys[k];
      if (age[k] > life[k] || !(x > d.xmin && x < d.xmax && y > d.ymin && y < d.ymax) || (spec.flow === 'source' && flow.params.m < 0 && Math.hypot(x - flow.params.x0, y - flow.params.y0) < 0.6 * flow.params.a)) spawn(k, false);
    }
    if (!flow.steady) sampleHeat();
    update();
    draw();
  }

  // ---- interaction: drag the box, or tap to move it there ----
  const P = new Float64Array(2);
  let grab = null;
  const cv = view.box.canvas;
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    view.toPlane(e, P);
    const inside = P[0] > b.x0 && P[0] < b.x1 && P[1] > b.y0 && P[1] < b.y1;
    grab = inside ? { dx: cx - P[0], dy: cy - P[1] } : { dx: 0, dy: 0 };
    cx = P[0] + grab.dx;
    cy = P[1] + grab.dy;
    placeBox();
    update();
    draw();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!grab) return;
    view.toPlane(e, P);
    cx = P[0] + grab.dx;
    cy = P[1] + grab.dy;
    placeBox();
    update();
    draw();
  });
  const end = () => {
    grab = null;
    ctx.settings?.set?.('conservation-box', { flow: caseId, cx, cy, size });
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('keydown', (e) => {
    const stepK = 0.05;
    const moves = { ArrowLeft: [-stepK, 0], ArrowRight: [stepK, 0], ArrowUp: [0, stepK], ArrowDown: [0, -stepK] };
    const mv = moves[e.key];
    if (!mv) return;
    e.preventDefault();
    cx += mv[0];
    cy += mv[1];
    placeBox();
    update();
    draw();
  });

  view.box.onResize(() => {
    draw();
  });

  // Legend (HTML, so it wraps on phones).
  const key = (sw, text) => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px' } }, sw, text);
  const bar = (token) => h('i', { style: { display: 'inline-block', width: '20px', height: '4px', borderRadius: '2px', background: `var(--${token})` } });
  legend.append(
    key(bar('s1'), 'flowing in'),
    key(bar('s2'), 'flowing out'),
    key(h('i', { style: { display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', border: '2px dashed var(--accent)' } }), 'source core'),
    key(null, 'shading: speed |u|'),
  );

  setCase(caseId, { keepBox: true });
  update();
  draw();
  return () => {
    loop.destroy();
    view.box.destroy();
  };
}
