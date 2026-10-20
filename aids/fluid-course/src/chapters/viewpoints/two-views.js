// viewpoints-two-views: one flow, watched two ways. Arrows show Euler's
// field (the velocity at fixed points, now); dots are Lagrange's parcels
// (each one followed). A fixed sensor (s1) and a tagged parcel released
// from it (s2) record the speed they feel; the plot compares the records.

import { fmt } from '../../kit/dom.js';
import { frame, select, toggle, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { makeFlow, rkStep } from '../../sims/flows.js';
import { makeSwingingFlow } from '../../sims/ch-viewpoints-kinematics.js';
import { planeView, dragHandles, drawFlowArrows, drawBody, clamp } from './view.js';

const SCENES = {
  cylinder: {
    label: 'Steady: past a cylinder',
    make: () => makeFlow('cylinder'),
    sensor: [-1.5, 0.3],
    window: 4,
    rate: 1,
    open: true,
    arrows: [12, 9],
    stripe: 0.5,
  },
  swing: {
    label: 'Unsteady, uniform: swinging stream',
    make: () => makeSwingingFlow(),
    sensor: [0.5, 0],
    window: 4,
    rate: 1,
    open: true,
    arrows: [12, 7],
    stripe: 0.5,
  },
  gyre: {
    label: 'Unsteady: double gyre',
    make: () => makeFlow('double-gyre'),
    sensor: [0.6, 0.4],
    window: 10,
    rate: 2.5,
    open: false,
    arrows: [12, 6],
    stripe: 0.25,
  },
};

const N = 260; // Lagrangian parcels
const CAP = 512; // record capacity
const DT_REC = 0.05; // record spacing (time units)
const H_MAX = 0.02; // largest particle step

export function mountTwoViews(fig, ctx) {
  const ui = frame(fig, { title: 'Euler’s arrows and Lagrange’s parcels', wide: true });
  ui.stage.classList.add('cols');
  const view = planeView(ui.stage, {
    domain: { xmin: -2, xmax: 2, ymin: -1.5, ymax: 1.5 },
    aspect: 4 / 3,
    label: 'A flow drawn two ways: arrows of velocity at fixed points, and dots for parcels that move with the fluid. A ring marks a fixed sensor; a filled dot is a parcel released from it.',
  });
  const plot = new Plot(ui.stage, {
    x: { label: 'time since the parcel left the sensor', min: 0, max: 4 },
    y: { label: 'speed |u|', min: 0 },
    aspect: 4 / 3,
    label: 'Speed recorded by the fixed sensor and by the moving parcel, against time',
  });

  const px = new Float64Array(N);
  const py = new Float64Array(N);
  const band = new Uint8Array(N);
  const recT = new Float64Array(CAP);
  const recS = new Float64Array(CAP);
  const recP = new Float64Array(CAP);
  const trailX = new Float64Array(CAP);
  const trailY = new Float64Array(CAP);
  const O = new Float64Array(2);
  const V = new Float64Array(2);
  for (let k = 0; k < CAP; k++) recT[k] = k * DT_REC;

  let scene = SCENES.cylinder;
  let flow = scene.make();
  let t = 0;
  let sx = 0;
  let sy = 0;
  let tx = 0; // tagged parcel
  let ty = 0;
  let age = 0;
  let nrec = 0;
  let nextRec = 0;
  let rng = 1;
  const rand = () => {
    rng = (rng * 16807) % 2147483647;
    return (rng - 1) / 2147483646;
  };

  const plotSeries = [
    { x: recT, y: recS, color: 's1', label: 'fixed sensor' },
    { x: recT, y: recP, color: 's2', dash: [6, 4], label: 'moving parcel' },
  ];

  const inside = (x, y) => {
    const d = flow.domain;
    return x >= d.xmin && x <= d.xmax && y >= d.ymin && y <= d.ymax && !(flow.solid && flow.solid(x, y));
  };

  function seedParcels() {
    rng = 12345;
    const d = flow.domain;
    for (let k = 0; k < N; k++) {
      let x;
      let y;
      do {
        x = d.xmin + rand() * (d.xmax - d.xmin);
        y = d.ymin + rand() * (d.ymax - d.ymin);
      } while (flow.solid && flow.solid(x, y));
      px[k] = x;
      py[k] = y;
      band[k] = Math.floor((x - d.xmin) / scene.stripe) & 1;
    }
  }

  function speedAt(x, y, time) {
    flow.velocity(x, y, time, V);
    return Math.hypot(V[0], V[1]);
  }

  function release() {
    tx = sx;
    ty = sy;
    age = 0;
    nrec = 0;
    nextRec = 0;
    recS.fill(NaN);
    recP.fill(NaN);
    record();
  }

  function record() {
    if (nrec >= CAP) return;
    recS[nrec] = speedAt(sx, sy, t);
    recP[nrec] = speedAt(tx, ty, t);
    trailX[nrec] = tx;
    trailY[nrec] = ty;
    nrec++;
    nextRec += DT_REC;
  }

  function setScene(id) {
    scene = SCENES[id] || SCENES.cylinder;
    flow = scene.make();
    view.setDomain(flow.domain);
    plot.setAxes({ x: { max: scene.window } });
    t = 0;
    sx = scene.sensor[0];
    sy = scene.sensor[1];
    seedParcels();
    release();
    plot.draw(plotSeries);
    narrate();
    draw();
  }

  // Advance everything by sim time dt in steps of at most H_MAX.
  function advance(dt) {
    const n = Math.max(1, Math.ceil(dt / H_MAX));
    const h = dt / n;
    const d = flow.domain;
    for (let s = 0; s < n; s++) {
      for (let k = 0; k < N; k++) {
        rkStep(flow, px[k], py[k], t, h, 'rk4', O);
        let x = O[0];
        let y = O[1];
        if (!(x >= d.xmin && x <= d.xmax && y >= d.ymin && y <= d.ymax)) {
          if (scene.open) {
            // Out of the window: a new parcel enters upstream. Its stripe
            // depends on when it enters, so the stripes stay material lines.
            x = d.xmin + 0.001;
            y = d.ymin + rand() * (d.ymax - d.ymin);
            band[k] = Math.floor((t * (flow.params.U ?? 1)) / scene.stripe + 1e-9) & 1 ? 0 : 1;
          } else {
            x = clamp(x, d.xmin, d.xmax);
            y = clamp(y, d.ymin, d.ymax);
          }
        }
        px[k] = x;
        py[k] = y;
      }
      rkStep(flow, tx, ty, t, h, 'rk4', O);
      tx = O[0];
      ty = O[1];
      t += h;
      age += h;
      if (age + 1e-9 >= nextRec) record();
      if (!inside(tx, ty) || age >= scene.window - 1e-9) {
        release();
        narrate();
      }
    }
  }

  const rT = readout(ui.readouts, { label: 'time since release', fmt: (v) => fmt(v, 3) });
  const rS = readout(ui.readouts, { label: 'sensor speed (fixed point)', fmt: (v) => fmt(v, 3) });
  const rP = readout(ui.readouts, { label: 'parcel speed (moving)', fmt: (v) => fmt(v, 3) });
  const rRange = readout(ui.readouts, { label: 'spread of each record', title: 'largest minus smallest speed recorded since release' });

  function spread(a, n) {
    let lo = Infinity;
    let hi = -Infinity;
    for (let k = 0; k < n; k++) {
      if (a[k] < lo) lo = a[k];
      if (a[k] > hi) hi = a[k];
    }
    return n ? hi - lo : 0;
  }

  function narrate() {
    const id = sceneSel.value;
    ui.status.textContent =
      id === 'cylinder'
        ? 'Steady flow: the arrows never change, so the sensor reads one number. The parcel still speeds up over the cylinder and slows behind it.'
        : id === 'swing'
          ? 'The stream is the same everywhere at each instant, so the sensor and the parcel feel exactly the same speed: all change is change in time.'
          : 'Unsteady and non-uniform: the sensor sees the field change in time; the parcel also moves to where the speed is different.';
  }

  function draw() {
    const pal = palette();
    const c = view.box.ctx;
    view.clear(pal);
    c.save();
    view.clip();
    if (showArrows.value) drawFlowArrows(view, flow, t, flow.domain, { nx: scene.arrows[0], ny: scene.arrows[1], scale: 0.3, color: 'ink', alpha: 0.45, pal });
    if (showParcels.value) {
      for (let b = 0; b < 2; b++) {
        c.fillStyle = b ? pal.css('particle', 0.85) : pal.css('muted', 0.55);
        c.beginPath();
        for (let k = 0; k < N; k++) if (band[k] === b) view.dot(px[k], py[k], 2.1);
        c.fill();
      }
    }
    drawBody(view, flow, pal);
    // The tagged parcel's path so far.
    c.strokeStyle = pal.css('s2', 0.9);
    c.lineWidth = 2;
    c.setLineDash([]);
    c.beginPath();
    view.path(trailX, trailY, 0, nrec);
    c.lineTo(view.X(tx), view.Y(ty));
    c.stroke();
    c.fillStyle = pal.css('s2');
    c.strokeStyle = pal.css('board');
    c.lineWidth = 1.5;
    c.beginPath();
    view.dot(tx, ty, 6);
    c.fill();
    c.stroke();
    // The sensor: a ring that never moves.
    c.strokeStyle = pal.css('s1');
    c.lineWidth = 3;
    c.beginPath();
    view.dot(sx, sy, 8);
    c.stroke();
    c.restore();
    view.border(pal);

    rT.set(age);
    rS.set(speedAt(sx, sy, t));
    rP.set(speedAt(tx, ty, t));
    rRange.set(`sensor ${fmt(spread(recS, nrec), 2)} · parcel ${fmt(spread(recP, nrec), 2)}`);
  }

  let plotTick = 0;
  const loop = animate(
    fig,
    (dt) => {
      advance(dt * scene.rate);
      draw();
      if (++plotTick % 4 === 0) plot.render();
    },
    { autoplay: true, signal: ctx.signal },
  );

  const sceneSel = select(ui.controls, {
    label: 'Flow',
    options: Object.entries(SCENES).map(([k, s]) => [k, s.label]),
    value: SCENES[fig.dataset.preset] ? fig.dataset.preset : 'cylinder',
    onChange: (v) => setScene(v),
  });
  playButton(ui.controls, loop);
  button(ui.controls, {
    label: 'Release a new parcel',
    onClick: () => {
      release();
      plot.render();
      draw();
    },
  });
  const showArrows = toggle(ui.controls, { label: 'Euler’s arrows', checked: true, onChange: () => draw() });
  const showParcels = toggle(ui.controls, { label: 'Lagrange’s parcels', checked: true, onChange: () => draw() });

  dragHandles(view, {
    pick: (x, y, slop) => (Math.hypot(x - sx, y - sy) < Math.max(slop, 0.15) ? 'sensor' : null),
    move: (_k, x, y) => {
      const d = flow.domain;
      const nx = clamp(x, d.xmin + 0.02, d.xmax - 0.02);
      const ny = clamp(y, d.ymin + 0.02, d.ymax - 0.02);
      if (flow.solid && flow.solid(nx, ny)) return;
      sx = nx;
      sy = ny;
      release();
      plot.render();
      draw();
    },
  });

  view.box.onResize(() => draw());
  ctx.signal?.addEventListener('abort', () => {
    view.box.destroy();
    plot.destroy();
  });
  setScene(sceneSel.value);
}
