// viewpoints-lines: streamlines (s1), the pathline of one particle (s2) and
// the streakline of dye (s3), all from one source point, traced by the
// flows.js kernels. In a steady flow the three coincide; in an unsteady flow
// they part, and the readouts measure how far. For the swinging stream the
// exact pathline and streakline are drawn too (thin ink dashes).

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, select, slider, toggle, readout, playButton, animate } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { makeFlow, tracePathline, createStreakline, streaklineReset, streaklineStep, streakIndex } from '../../sims/flows.js';
import { makeSwingingFlow, swingExactPath, createStreamlineBuffer, streamlineThrough, polylineGap } from '../../sims/ch-viewpoints-kinematics.js';
import { planeView, dragHandles, drawBody, clamp } from './view.js';

const FLOWS = {
  vortex: {
    label: 'Steady vortex',
    make: () => makeFlow('rankine'),
    source: [0.8, 0],
    T: 6,
    dt: 0.02,
    ds: 0.02,
    seeds: [[0.15, 0], [0.45, 0], [1.25, 0], [1.75, 0]],
  },
  cells: {
    label: 'Steady cells',
    make: () => makeFlow('taylor-green'),
    source: [0.5, 0.25],
    T: 6,
    dt: 0.02,
    ds: 0.02,
    seeds: [[0.5, 0.08], [0.5, 0.4], [1.5, 0.15], [1.5, 0.35], [0.5, 1.15], [0.5, 1.35], [1.5, 1.15], [1.5, 1.35]],
  },
  spreading: {
    label: 'Spreading vortex (unsteady)',
    make: () => makeFlow('lamb-oseen', { nu: 0.02, t0: 1 }),
    source: [0.6, 0],
    T: 6,
    dt: 0.02,
    ds: 0.02,
    seeds: [[0.15, 0], [0.35, 0], [1.1, 0], [1.6, 0]],
  },
  swing: {
    label: 'Swinging stream (unsteady)',
    make: () => makeSwingingFlow(),
    source: [0.3, 0],
    T: 4,
    dt: 0.02,
    ds: 0.02,
    seeds: [[2, -0.9], [2, -0.45], [2, 0.45], [2, 0.9]],
    exact: true,
  },
  gyre: {
    label: 'Double gyre (unsteady)',
    make: () => makeFlow('double-gyre'),
    source: [0.6, 0.4],
    T: 10,
    dt: 0.05,
    ds: 0.01,
    seeds: [[0.5, 0.12], [0.5, 0.3], [1.5, 0.12], [1.5, 0.3], [1, 0.9]],
  },
};

const NMAX = 320; // most steps in a run (T / dt)
const NEX = 160; // points on each exact curve

export function mountLines(fig, ctx) {
  const ui = frame(fig, { title: 'Streamline, pathline, streakline', wide: true });
  const view = planeView(ui.stage, {
    domain: { xmin: 0, xmax: 4, ymin: -1.2, ymax: 1.2 },
    aspect: 1.6,
    maxHeight: 480,
    label: 'Three kinds of flow line from one source point: streamlines at the current instant, the path of the first particle released, and the streak of dye released ever since.',
  });

  const pathX = new Float64Array(NMAX + 1);
  const pathY = new Float64Array(NMAX + 1);
  const streak = createStreakline({ capacity: NMAX + 2 });
  const skX = new Float64Array(NMAX + 2);
  const skY = new Float64Array(NMAX + 2);
  const inX = new Float64Array(NMAX + 2);
  const inY = new Float64Array(NMAX + 2);
  const main = createStreamlineBuffer(500);
  const bg = Array.from({ length: 8 }, () => createStreamlineBuffer(420));
  const exPX = new Float64Array(NEX + 1);
  const exPY = new Float64Array(NEX + 1);
  const exSX = new Float64Array(NEX + 1);
  const exSY = new Float64Array(NEX + 1);
  const O = new Float64Array(2);
  const U0 = new Float64Array(2);
  const U1 = new Float64Array(2);

  let spec = FLOWS.swing;
  let flow = spec.make();
  let N = 0; // steps in the run
  let n = 0; // current step
  let streakN = -1; // step the streakline is at
  let sx = 0;
  let sy = 0;
  let bgCount = 0;
  let gapStreak = 0;
  let gapPath = 0;
  let bgTime = NaN; // instant the background streamlines were traced at

  // ---- computation ---------------------------------------------------------------
  function retrace() {
    // The pathline of the particle released at t = 0, for the whole run.
    tracePathline(flow, sx, sy, 0, spec.dt, N, 'rk4', pathX, pathY);
    streak.x0 = sx;
    streak.y0 = sy;
    streakN = -1;
  }

  function streakTo(m) {
    if (m < streakN || streakN < 0) {
      streaklineReset(streak, 0);
      streakN = 0;
    }
    while (streakN < m) {
      streaklineStep(streak, flow, streakN * spec.dt, spec.dt, 'rk4');
      streakN++;
    }
  }

  // Trace the lines at the current step. withGaps = false skips the gap
  // measurements (the slowest part) on most animation frames.
  function linesAt(withGaps = true) {
    const t = n * spec.dt;
    streakTo(n);
    const d = flow.domain;
    // Streak points in release order, newest (at the source) first.
    let m = 0;
    for (let k = 0; k < streak.count; k++) {
      const i = streakIndex(streak, k);
      skX[k] = streak.x[i];
      skY[k] = streak.y[i];
      if (skX[k] >= d.xmin && skX[k] <= d.xmax && skY[k] >= d.ymin && skY[k] <= d.ymax) {
        inX[m] = skX[k];
        inY[m] = skY[k];
        m++;
      }
    }
    const nm = streamlineThrough(flow, sx, sy, t, spec.ds, main, d);
    if (withGaps) {
      gapStreak = polylineGap(inX, inY, m, main.x, main.y, nm);
      m = 0;
      for (let k = 0; k <= n; k++) {
        if (pathX[k] >= d.xmin && pathX[k] <= d.xmax && pathY[k] >= d.ymin && pathY[k] <= d.ymax) {
          inX[m] = pathX[k];
          inY[m] = pathY[k];
          m++;
        }
      }
      gapPath = polylineGap(inX, inY, m, main.x, main.y, nm);
    }
    // Background streamlines: once for a steady flow, every instant otherwise.
    if (Number.isNaN(bgTime) || (!flow.steady && bgTime !== t)) {
      bgCount = Math.min(spec.seeds.length, bg.length);
      for (let s = 0; s < bgCount; s++) streamlineThrough(flow, spec.seeds[s][0], spec.seeds[s][1], t, spec.ds, bg[s], d);
      bgTime = t;
    }
    if (spec.exact) {
      const p = flow.params;
      for (let k = 0; k <= NEX; k++) {
        const tk = (t * k) / NEX;
        swingExactPath(p, sx, sy, 0, tk, O);
        exPX[k] = O[0];
        exPY[k] = O[1];
        swingExactPath(p, sx, sy, tk, t, O);
        exSX[k] = O[0];
        exSY[k] = O[1];
      }
    }
  }

  // ---- drawing -----------------------------------------------------------------------
  function draw() {
    const pal = palette();
    const c = view.box.ctx;
    const t = n * spec.dt;
    view.clear(pal);
    c.save();
    view.clip();
    c.lineJoin = 'round';
    c.lineCap = 'round';
    if (showStream.value) {
      c.strokeStyle = pal.css('s1', 0.4);
      c.lineWidth = 1.5;
      c.setLineDash([]);
      c.beginPath();
      for (let s = 0; s < bgCount; s++) view.path(bg[s].x, bg[s].y, 0, bg[s].n);
      c.stroke();
      c.strokeStyle = pal.css('s1');
      c.lineWidth = 4;
      c.beginPath();
      view.path(main.x, main.y, 0, main.n);
      c.stroke();
    }
    drawBody(view, flow, pal);
    if (spec.exact && (showPath.value || showStreak.value)) {
      c.strokeStyle = pal.css('ink', 0.8);
      c.lineWidth = 1;
      c.setLineDash([2, 3]);
      c.beginPath();
      if (showPath.value) view.path(exPX, exPY, 0, NEX + 1);
      if (showStreak.value) view.path(exSX, exSY, 0, NEX + 1);
      c.stroke();
    }
    if (showStreak.value) {
      c.strokeStyle = pal.css('s3');
      c.lineWidth = 2.5;
      c.setLineDash([]);
      c.beginPath();
      view.path(skX, skY, 0, streak.count);
      c.stroke();
      c.fillStyle = pal.css('s3');
      c.beginPath();
      for (let k = 0; k < streak.count; k += 5) view.dot(skX[k], skY[k], 3.2);
      c.fill();
    }
    if (showPath.value) {
      c.strokeStyle = pal.css('s2');
      c.lineWidth = 2.5;
      c.setLineDash([7, 5]);
      c.beginPath();
      view.path(pathX, pathY, 0, n + 1);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = pal.css('s2');
      c.strokeStyle = pal.css('board');
      c.lineWidth = 1.5;
      c.beginPath();
      view.dot(pathX[n], pathY[n], 5.5);
      c.fill();
      c.stroke();
    }
    // The source: a nozzle that stays put.
    c.fillStyle = pal.css('ink');
    c.beginPath();
    view.dot(sx, sy, 5);
    c.fill();
    c.strokeStyle = pal.css('ink');
    c.lineWidth = 1.5;
    c.beginPath();
    view.dot(sx, sy, 9);
    c.stroke();
    c.restore();
    view.border(pal);

    rT.set(t);
    rSteady.set(flow.steady ? 'yes' : 'no');
    flow.velocity(sx, sy, t + 1e-4, U1);
    flow.velocity(sx, sy, Math.max(0, t - 1e-4), U0);
    const dudt = Math.hypot(U1[0] - U0[0], U1[1] - U0[1]) / (t + 1e-4 - Math.max(0, t - 1e-4));
    rDudt.set(dudt < 1e-6 ? '0' : fmt(dudt, 3));
    const shown = n > 0;
    rGapS.set(shown ? sci(Math.max(gapStreak, 1e-12), 2) : '–');
    rGapP.set(shown ? sci(Math.max(gapPath, 1e-12), 2) : '–');
    narrate(shown);
  }

  function narrate(shown) {
    if (!shown) {
      ui.status.textContent = 'Nothing released yet: press Play or move the time slider.';
      return;
    }
    const gap = Math.max(gapStreak, gapPath);
    if (gap < 1e-3) {
      ui.status.textContent = flow.steady
        ? `Steady flow: all three lines lie on one curve (largest gap ${sci(Math.max(gap, 1e-12), 1)}).`
        : `Unsteady, yet the lines coincide (gap ${sci(Math.max(gap, 1e-12), 1)}): only the speed changes, never the direction.`;
    } else {
      ui.status.textContent = `Unsteady flow: the dye is up to ${fmt(gapStreak, 2)} away from the streamline through its source, and the first particle is up to ${fmt(gapPath, 2)} away.`;
    }
  }

  function refresh(withGaps = true) {
    linesAt(withGaps);
    draw();
  }

  // ---- controls -------------------------------------------------------------------------
  const flowSel = select(ui.controls, {
    label: 'Flow',
    options: Object.entries(FLOWS).map(([k, s]) => [k, s.label]),
    value: FLOWS[fig.dataset.preset] ? fig.dataset.preset : 'swing',
    onChange: (v) => setFlow(v),
  });
  const tSlider = slider(ui.controls, {
    label: 'time t',
    min: 0,
    max: 4,
    step: 0.02,
    value: 4,
    fmt: (v) => fmt(v, 3),
    onInput: (v) => {
      loop.pause();
      n = clamp(Math.round(v / spec.dt), 0, N);
      refresh();
    },
  });
  let frames = 0;
  const loop = animate(
    fig,
    (dt) => {
      const rate = spec.T / 6; // a whole run takes about six seconds
      const target = Math.min(N, n + Math.max(1, Math.round((dt * rate) / spec.dt)));
      n = target;
      tSlider.set(n * spec.dt, { silent: true });
      refresh(n >= N || ++frames % 6 === 0);
      if (n >= N) loop.pause();
    },
    { autoplay: false, signal: ctx.signal },
  );
  loop.onChange((playing) => {
    if (playing && n >= N) {
      n = 0;
      refresh();
    }
  });
  playButton(ui.controls, loop, { label: 'Play from t = 0' });
  const swatch = (cls, text) => [h('i', { class: `vp-sw ${cls}`, 'aria-hidden': 'true' }), text];
  const showStream = toggle(ui.controls, { label: swatch('s1', 'streamlines'), checked: true, onChange: () => draw() });
  const showPath = toggle(ui.controls, { label: swatch('s2', 'pathline'), checked: true, onChange: () => draw() });
  const showStreak = toggle(ui.controls, { label: swatch('s3', 'streakline'), checked: true, onChange: () => draw() });

  const rT = readout(ui.readouts, { label: 'time t', fmt: (v) => fmt(v, 3) });
  const rSteady = readout(ui.readouts, { label: 'steady?' });
  const rDudt = readout(ui.readouts, { label: '|∂u/∂t| at the source' });
  const rGapS = readout(ui.readouts, { label: 'streakline’s gap from streamline', title: 'largest distance from any dye particle in view to the streamline through the source' });
  const rGapP = readout(ui.readouts, { label: 'pathline’s gap from streamline', title: 'largest distance from the first particle’s path to the streamline through the source' });

  function setFlow(id) {
    loop.pause();
    spec = FLOWS[id] || FLOWS.swing;
    flow = spec.make();
    N = Math.min(NMAX, Math.round(spec.T / spec.dt));
    view.setDomain(flow.domain);
    sx = spec.source[0];
    sy = spec.source[1];
    tSlider.input.max = String(spec.T);
    tSlider.input.step = String(spec.dt);
    n = N;
    bgTime = NaN;
    tSlider.set(spec.T, { silent: true });
    retrace();
    refresh();
  }

  dragHandles(view, {
    pick: (x, y, slop) => (Math.hypot(x - sx, y - sy) < Math.max(slop, 0.12) ? 'source' : null),
    move: (_k, x, y) => {
      const d = flow.domain;
      const nx = clamp(x, d.xmin + 0.02, d.xmax - 0.02);
      const ny = clamp(y, d.ymin + 0.02, d.ymax - 0.02);
      if (flow.solid && flow.solid(nx, ny)) return;
      sx = nx;
      sy = ny;
      retrace();
      refresh();
    },
  });

  view.box.onResize(() => draw());
  ctx.signal?.addEventListener('abort', () => view.box.destroy());
  setFlow(flowSel.value);
}
