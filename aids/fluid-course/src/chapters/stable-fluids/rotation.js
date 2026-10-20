// stable-fluids-rotation: the classic accuracy test for advection. A frozen
// solid-body rotation (one turn per time unit) carries a dye shape round the
// centre of the box; after every whole turn the exact answer is the starting
// shape, and at any moment it is that shape rotated. The kernel's 'vortex'
// preset (src/sims/stablefluids.js) runs the same rotation side by side with
// semi-Lagrangian, BFECC and MacCormack advection; each panel overlays the
// exact shape's outline. The plot tracks the L2 error against the exact
// rotated shape (or the fraction of ∫q² kept), and the table gives the error,
// the range (new extrema betray overshoot) and the change in total dye.
//
// The exact shapes are closed-form (a Gaussian blob and Zalesak's slotted
// disc, exactly as the kernel builds them; checked against fluid.meta.exact
// at mount).

import { h } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, playButton, animate } from '../../kit/widgets.js';
import { FieldView } from '../../kit/field.js';
import { Plot } from '../../kit/plot.js';
import { createPreset, step } from '../../sims/stablefluids.js';
import { presetFor, num, pct } from './common.js';

const ALL = ['semi-lagrangian', 'bfecc', 'maccormack'];
const SHORT = { 'semi-lagrangian': 'Semi-Lagrangian', bfecc: 'BFECC', maccormack: 'MacCormack' };
const COLOR = { 'semi-lagrangian': 's1', bfecc: 's2', maccormack: 's3' };
const DASH = { 'semi-lagrangian': null, bfecc: [6, 4], maccormack: [2, 3] };
const NX = 64;
const TURNS = 3; // the plot holds this many turns
const CAP = 4096; // plot points per scheme
const TURN_RATE = 0.35; // turns per second of animation

const PRESETS = {
  default: { schemes: ALL, shape: 'gaussian', cfl: 1, backtrace: 'rk2', limiter: 'default', plot: 'error' },
  sl: { schemes: ['semi-lagrangian'], cfl: 1 },
  slotted: { shape: 'slotted-disc' },
  overshoot: { shape: 'slotted-disc', cfl: 3, backtrace: 'euler', limiter: 'none' },
  mass: { cfl: 5, plot: 'mass' },
};

// Shape geometry as the kernel's 'vortex' preset builds it (64², H = 1).
function shapeSpec(shape) {
  return shape === 'slotted-disc' ? { R: 0.15, sx: 0.5, sy: 0.75 } : { R: 0.1, sx: 0.75, sy: 0.5 };
}

export function mountRotation(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const schemes = p.schemes;
  const f = frame(fig, { title: 'One turn of a rotating dye shape', wide: true });
  const trio = h('div.sf-trio', { style: { gridTemplateColumns: `repeat(${schemes.length}, minmax(0, ${schemes.length === 1 ? '360px' : '1fr'}))` } });
  f.stage.append(trio);
  const views = [];
  for (const id of schemes) {
    const cell = h('div.sf-panel');
    trio.append(cell);
    cell.append(h('div.sf-panel-title', h('i.sf-swatch', { style: { background: `var(--${COLOR[id]})` } }), SHORT[id]));
    views.push(new FieldView(cell, { nx: NX, ny: NX, minHeight: 90, maxHeight: 360, label: `${SHORT[id]} advection of a rotating dye shape, with the exact shape outlined` }));
  }
  const plotWrap = h('div');
  f.stage.append(plotWrap);
  const plot = new Plot(plotWrap, {
    x: { label: 'turns', min: 0, max: TURNS },
    y: { label: 'L2 error', min: 1e-3, max: 10, log: true },
    aspect: 2.6,
    minHeight: 150,
    label: 'L2 error against the exact rotated shape, for each scheme, over three turns',
  });
  const table = h('table.sf-table');
  const tbody = h('tbody');
  table.append(h('thead', h('tr', h('th', 'scheme'), h('th.num', 'L2 error'), h('th.num', 'min … max'), h('th.num', 'dye total'))), tbody);
  const cells = {};
  for (const id of schemes) {
    const tdE = h('td.num', '–');
    const tdR = h('td.num', '–');
    const tdM = h('td.num', '–');
    tbody.append(h('tr', h('td', SHORT[id]), tdE, tdR, tdM));
    cells[id] = { tdE, tdR, tdM };
  }
  f.stage.append(h('div.sf-table-wrap', table));

  // ---- controls ----
  const shape = segmented(f.controls, {
    label: 'Shape',
    options: [
      ['gaussian', 'Gaussian blob'],
      ['slotted-disc', 'slotted disc'],
    ],
    value: p.shape,
    onChange: () => build(),
  });
  const cfl = slider(f.controls, { label: 'CFL number at the shape', min: 0.25, max: 8, log: true, value: p.cfl, fmt: (v) => v.toFixed(2), onInput: () => build() });
  const backtrace = segmented(f.controls, {
    label: 'Backtrace',
    options: [
      ['rk2', 'midpoint (RK2)'],
      ['euler', 'Euler'],
    ],
    value: p.backtrace,
    onChange: () => build(),
  });
  const limiter = schemes.length > 1
    ? select(f.controls, {
        label: 'Limiter (BFECC, MacCormack)',
        options: [
          ['default', 'each scheme’s default'],
          ['none', 'none'],
          ['clamp', 'clamp'],
          ['revert', 'revert'],
        ],
        value: p.limiter,
        onChange: () => build(),
      })
    : null;
  const mode = segmented(f.controls, {
    label: 'Plot',
    options: [
      ['error', 'L2 error'],
      ['kept', '∫q² kept'],
      ['mass', 'dye total'],
    ],
    value: p.plot,
    onChange: () => {
      rerecord();
      drawPlot();
    },
  });
  const loop = animate(fig, tick, { autoplay: true, signal });
  playButton(f.controls, loop, { label: 'Rotate' });
  button(f.controls, { label: 'Reset', onClick: () => build() });

  // ---- state ----
  const fluids = {};
  const exact = new Float64Array(NX * NX);
  const xs = new Float64Array(CAP);
  const ys = {};
  for (const id of schemes) ys[id] = new Float64Array(CAP);
  const series = {};
  let count = 0;
  let due = 0;
  let mass0 = 0;
  let var0 = 0;
  let lastStatus = '';
  const wide = { err: false, mass: false };
  const stat = {};
  for (const id of schemes) stat[id] = { err: 0, lo: 0, hi: 1, mass: 0, kept: 1 };

  function exactAt(theta) {
    const sp = shapeSpec(shape.value);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    const R2 = sp.R * sp.R;
    const w = sp.R / 3;
    const slotted = shape.value === 'slotted-disc';
    for (let j = 0; j < NX; j++) {
      const y = (j + 0.5) / NX - 0.5;
      for (let i = 0; i < NX; i++) {
        const x = (i + 0.5) / NX - 0.5;
        // Rotate the point back by theta to find where its dye started.
        const x0 = 0.5 + c * x + s * y;
        const y0 = 0.5 - s * x + c * y;
        const dx = x0 - sp.sx;
        const dy = y0 - sp.sy;
        let v;
        if (slotted) v = dx * dx + dy * dy > R2 ? 0 : Math.abs(dx) < 0.5 * w && dy < sp.R * (2 / 3) ? 0 : 1;
        else v = Math.exp(-(dx * dx + dy * dy) / R2);
        exact[i + j * NX] = v;
      }
    }
  }

  function measure(id) {
    const F = fluids[id];
    const q = F.dye;
    let e = 0;
    let lo = Infinity;
    let hi = -Infinity;
    let m = 0;
    let v2 = 0;
    for (let k = 0; k < q.length; k++) {
      const a = q[k];
      e += (a - exact[k]) ** 2;
      if (a < lo) lo = a;
      if (a > hi) hi = a;
      m += a;
      v2 += a * a;
    }
    const st = stat[id];
    st.err = Math.sqrt(e) / NX;
    st.lo = lo;
    st.hi = hi;
    st.mass = m / mass0 - 1;
    st.kept = v2 / var0;
  }

  function record() {
    if (count >= CAP) return;
    const F = fluids[schemes[0]];
    xs[count] = F.t / F.meta.period;
    for (const id of schemes) {
      const st = stat[id];
      ys[id][count] = mode.value === 'error' ? st.err : mode.value === 'kept' ? st.kept : 1 + st.mass;
    }
    count++;
  }

  function build() {
    for (const id of schemes) {
      const params = { advection: id, backtrace: backtrace.value };
      if (limiter && limiter.value !== 'default') params.limiter = limiter.value;
      fluids[id] = createPreset('vortex', { nx: NX, shape: shape.value, cfl: cfl.value, params });
    }
    const F = fluids[schemes[0]];
    exactAt(0);
    let d = 0;
    mass0 = 0;
    var0 = 0;
    for (let k = 0; k < exact.length; k++) {
      d = Math.max(d, Math.abs(exact[k] - F.meta.exact[k]));
      mass0 += F.meta.exact[k];
      var0 += F.meta.exact[k] ** 2;
    }
    if (d > 1e-12) console.warn('stable-fluids-rotation: closed-form shape differs from the kernel preset by', d);
    xs.fill(NaN);
    wide.err = false;
    wide.mass = false;
    for (const id of schemes) {
      ys[id].fill(NaN);
      measure(id);
      series[id] = { x: xs, y: ys[id], color: COLOR[id], dash: DASH[id], label: SHORT[id], width: 2 };
    }
    count = 0;
    due = 0;
    record();
    drawPlot();
    drawFields();
    lastStatus = '';
    narrate();
  }

  function rerecord() {
    // Switching the plotted quantity restarts the trace from the current state.
    xs.fill(NaN);
    for (const id of schemes) ys[id].fill(NaN);
    count = 0;
    record();
  }

  function tick(dt) {
    const F0 = fluids[schemes[0]];
    if (F0.t >= TURNS * F0.meta.period - 1e-9) {
      loop.pause();
      narrate(true);
      return;
    }
    due += dt * TURN_RATE * F0.meta.stepsPerTurn;
    let n = Math.min(8, Math.floor(due));
    due -= n;
    if (n < 1) return;
    const t0 = performance.now();
    while (n-- > 0 && F0.t < TURNS * F0.meta.period - 1e-9) {
      for (const id of schemes) {
        const F = fluids[id];
        step(F, F.meta.dt, F.params);
      }
      exactAt((2 * Math.PI * F0.t) / F0.meta.period);
      for (const id of schemes) measure(id);
      record();
      if (performance.now() - t0 > 6) break;
    }
    drawPlot();
    drawFields();
    narrate();
  }

  function drawFields() {
    const F0 = fluids[schemes[0]];
    const theta = (2 * Math.PI * F0.t) / F0.meta.period;
    const sp = shapeSpec(shape.value);
    const c = Math.cos(theta);
    const s = Math.sin(theta);
    schemes.forEach((id, k) => {
      const view = views[k];
      view.redraw = drawFields;
      view.draw(fluids[id].dye, { map: 'seq', lo: 0, hi: 1 });
      view.overlay((ctx, X, Y, pal) => {
        ctx.strokeStyle = pal.css('accent', 0.9);
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        const rot = (px, py) => {
          const x = px - 0.5;
          const y = py - 0.5;
          return [X((0.5 + c * x - s * y) * NX), Y((0.5 + s * x + c * y) * NX)];
        };
        if (shape.value === 'slotted-disc') {
          // Disc outline, then up the slot (half width R/6) to 2R/3 above
          // the centre, across, and back down.
          const hw = sp.R / 6;
          const a0 = Math.asin(hw / sp.R);
          const N = 48;
          for (let m = 0; m <= N; m++) {
            const a = -Math.PI / 2 + a0 + ((2 * Math.PI - 2 * a0) * m) / N;
            const q = rot(sp.sx + sp.R * Math.cos(a), sp.sy + sp.R * Math.sin(a));
            if (m === 0) ctx.moveTo(q[0], q[1]);
            else ctx.lineTo(q[0], q[1]);
          }
          const yt = sp.sy + (2 / 3) * sp.R;
          let q = rot(sp.sx - hw, yt);
          ctx.lineTo(q[0], q[1]);
          q = rot(sp.sx + hw, yt);
          ctx.lineTo(q[0], q[1]);
          ctx.closePath();
        } else {
          const [qx, qy] = rot(sp.sx, sp.sy);
          ctx.arc(qx, qy, Math.abs(X(sp.R * NX) - X(0)), 0, 2 * Math.PI);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });
    });
    for (const id of schemes) {
      const st = stat[id];
      const cl = cells[id];
      const e = num(st.err, 3);
      if (cl.tdE.textContent !== e) cl.tdE.textContent = e;
      const r = `${tiny(st.lo)} … ${tiny(st.hi)}`;
      if (cl.tdR.textContent !== r) cl.tdR.textContent = r;
      cl.tdR.className = st.lo < -1e-3 || st.hi > 1 + 1e-3 ? 'num bad' : 'num';
      const m = pct(st.mass);
      if (cl.tdM.textContent !== m) cl.tdM.textContent = m;
    }
  }

  // Range ends to three decimals; round-off-sized values read as 0.
  const tiny = (v) => (Math.abs(v) < 5e-4 ? '0' : num(v, 3));

  function drawPlot() {
    const m = mode.value;
    // Axes widen (and stay wide until the next build) when a scheme leaves
    // the usual range, so a blow-up or a large mass loss stays on the plot.
    for (const id of schemes) {
      if (stat[id].err > 0.8) wide.err = true;
      if (stat[id].mass < -0.1 || stat[id].mass > 0.12) wide.mass = true;
    }
    if (m === 'error') plot.setAxes({ y: { label: 'L2 error', min: 1e-3, max: wide.err ? 100 : 1, log: true } });
    else if (m === 'kept') plot.setAxes({ y: { label: '∫q² / ∫q₀²', min: 0, max: 1.05, log: false } });
    else plot.setAxes({ y: { label: 'dye total / start', min: wide.mass ? 0.5 : 0.9, max: wide.mass ? 1.3 : 1.12, log: false } });
    plot.draw(schemes.map((id) => series[id]), {
      extra(ctx, tx, ty, area, pal) {
        if (m === 'error') return;
        ctx.strokeStyle = pal.css('ink', 0.7);
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(area.x0, ty(1));
        ctx.lineTo(area.x1, ty(1));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = pal.css('muted');
        ctx.font = '12px system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('exact', area.x1 - 4, ty(1) - 4);
      },
    });
  }

  function narrate(done = false) {
    const F0 = fluids[schemes[0]];
    let msg = `${F0.meta.stepsPerTurn} steps per turn at CFL ${F0.meta.cfl.toFixed(2)} (at the shape's centre; the box corners move 2.8 times faster).`;
    const blown = schemes.find((id) => !(Math.max(-stat[id].lo, stat[id].hi) < 2));
    const over = schemes.find((id) => stat[id].lo < -0.01 || stat[id].hi > 1.01);
    if (blown) msg = `${SHORT[blown]} is blowing up: values reach ${num(Math.max(-stat[blown].lo, stat[blown].hi), 2)} in a field that started in [0, 1]. Choose the midpoint backtrace or the clamp.`;
    else if (over) msg = `${SHORT[over]} overshoots: new values outside [0, 1] appear (${num(stat[over].lo, 2)} … ${num(stat[over].hi, 3)}). A limiter removes them.`;
    else if (done) msg = `${TURNS} turns done. ${msg}`;
    if (msg !== lastStatus) {
      f.status.textContent = msg;
      lastStatus = msg;
    }
  }

  build();
  return () => views.forEach((v) => v.destroy());
}
