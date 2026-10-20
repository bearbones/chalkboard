// stable-fluids-backtrace: one semi-Lagrangian update taken apart. A 12 × 12
// grid turns as a solid body (the kernel's frozen 'vortex' preset, one turn
// per time unit). Tap a cell: the widget runs the kernel's own advection
// stage (advectPhase, semi-Lagrangian) on a scratch copy of the field with
// each backtrace, and reads back the departure points it computed
// (fluid.px, fluid.py, in cell units) and the value it wrote. It shows the
// exact departure point (the cell rotated back by ωΔt) beside them, the four
// grid values the interpolation reads (blue, with their bilinear weights)
// and the cell it writes (yellow). "Advance one step" applies the kernel's
// step to the whole field: the maximum never grows and the blob blurs.

import { frame, slider, segmented, button, readout } from '../../kit/widgets.js';
import { FieldView, drawGridLines } from '../../kit/field.js';
import { palette } from '../../kit/palette.js';
import { createPreset, step, advectPhase } from '../../sims/stablefluids.js';
import { presetFor, num, pct } from './common.js';

const N = 12;
const PRESETS = {
  default: { deg: 30, method: 'rk2', cell: [9, 6] },
  euler: { deg: 60, method: 'euler', cell: [9, 6] },
};

export function mountBacktrace(fig) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Where does this cell’s new value come from?' });
  const view = new FieldView(f.stage, { nx: N, ny: N, maxHeight: 420, label: 'A 12 by 12 grid in solid-body rotation; tap a cell to see its backtrace' });

  const main = createPreset('vortex', { nx: N });
  const probe = createPreset('vortex', { nx: N });
  const blob = (x, y) => Math.exp(-((x - 0.72) ** 2 + (y - 0.5) ** 2) / 0.03);
  const reset = () => {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) main.dye[i + j * N] = blob((i + 0.5) / N, (j + 0.5) / N);
    main.t = 0;
    main.steps = 0;
    steps = 0;
    total0 = sum(main.dye);
    max0 = maxOf(main.dye);
  };
  const sum = (q) => {
    let s = 0;
    for (let k = 0; k < q.length; k++) s += q[k];
    return s;
  };
  const maxOf = (q) => {
    let m = -Infinity;
    for (let k = 0; k < q.length; k++) if (q[k] > m) m = q[k];
    return m;
  };
  let steps = 0;
  let total0 = 0;
  let max0 = 0;
  let ci = p.cell[0];
  let cj = p.cell[1];
  const dep = { euler: [0, 0, 0], rk2: [0, 0, 0] }; // x, y (cells), value written

  const deg = slider(f.controls, { label: 'Rotation per step ωΔt', min: 5, max: 120, step: 1, value: p.deg, fmt: (v) => `${Math.round(v)}°`, onInput: () => update() });
  const method = segmented(f.controls, {
    label: 'Backtrace used',
    options: [
      ['euler', 'Euler'],
      ['rk2', 'midpoint (RK2)'],
    ],
    value: p.method,
    onChange: () => update(),
  });
  button(f.controls, { label: 'Advance whole field one step', onClick: () => advance() });
  button(f.controls, { label: 'Reset field', onClick: () => (reset(), update()) });

  const rdDep = readout(f.readouts, { label: 'departure point (cells)' });
  const rdErrE = readout(f.readouts, { label: 'Euler miss (cells)', title: 'distance from the Euler departure point to the exact one' });
  const rdErrR = readout(f.readouts, { label: 'RK2 miss (cells)' });
  const rdRad = readout(f.readouts, { label: 'Euler radius / true radius', title: 'exactly √(1 + (ωΔt)²)' });
  const rdW = readout(f.readouts, { label: 'weights read' });
  const rdVal = readout(f.readouts, { label: 'value written' });
  const rdMax = readout(f.readouts, { label: 'field max (start → now)' });
  const rdTot = readout(f.readouts, { label: 'field total since start' });

  const dtOf = () => deg.value / 360; // one turn per time unit

  function probeWith(bt) {
    probe.dye.set(main.dye);
    advectPhase(probe, dtOf(), { advection: 'semi-lagrangian', backtrace: bt, advectVelocity: false });
    const k = ci + cj * N;
    const out = dep[bt];
    out[0] = probe.px[k];
    out[1] = probe.py[k];
    out[2] = probe.dye[k];
  }

  // Bilinear corners and weights of a cell-centred sample at (x, y) in cell
  // units, clamped at the edges as the kernel's sampler is.
  const corner = { i0: 0, j0: 0, i1: 0, j1: 0, w: [0, 0, 0, 0] };
  function corners(x, y) {
    let fa = x - 0.5;
    let fb = y - 0.5;
    fa = Math.max(0, Math.min(N - 1, fa));
    fb = Math.max(0, Math.min(N - 1, fb));
    const i0 = Math.min(N - 2, Math.floor(fa));
    const j0 = Math.min(N - 2, Math.floor(fb));
    const ta = fa - i0;
    const tb = fb - j0;
    corner.i0 = i0;
    corner.j0 = j0;
    corner.i1 = i0 + 1;
    corner.j1 = j0 + 1;
    corner.w[0] = (1 - ta) * (1 - tb);
    corner.w[1] = ta * (1 - tb);
    corner.w[2] = (1 - ta) * tb;
    corner.w[3] = ta * tb;
  }

  function exactDeparture() {
    const th = -2 * Math.PI * dtOf();
    const x = ci + 0.5 - N / 2;
    const y = cj + 0.5 - N / 2;
    return [N / 2 + x * Math.cos(th) - y * Math.sin(th), N / 2 + x * Math.sin(th) + y * Math.cos(th)];
  }

  function update() {
    probeWith('euler');
    probeWith('rk2');
    draw();
  }

  function advance() {
    step(main, dtOf(), { ...main.params, backtrace: method.value });
    steps++;
    update();
  }

  // The dye in a faded sequential ramp, so the read and write marks stand
  // out (one reused colour triple: no allocation per cell).
  const rgb = [0, 0, 0];
  let pal0 = null;
  const faded = (v) => {
    const c = pal0.seq(v);
    const b = pal0.rgb.board;
    rgb[0] = b[0] + 0.55 * (c[0] - b[0]);
    rgb[1] = b[1] + 0.55 * (c[1] - b[1]);
    rgb[2] = b[2] + 0.55 * (c[2] - b[2]);
    return rgb;
  };

  function draw() {
    pal0 = palette();
    view.draw(main.dye, { map: faded });
    const [ex, ey] = exactDeparture();
    const d = dep[method.value];
    corners(d[0], d[1]);
    view.overlay((ctx, X, Y, pal) => {
      drawGridLines(ctx, X, Y, N, N, { pal, alpha: 0.6 });
      const cell = Math.abs(X(1) - X(0));
      // the four cells read
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = pal.css('read');
      ctx.fillStyle = pal.css('read', 0.3);
      const cs = [
        [corner.i0, corner.j0],
        [corner.i1, corner.j0],
        [corner.i0, corner.j1],
        [corner.i1, corner.j1],
      ];
      ctx.font = `${Math.max(10, Math.min(13, cell * 0.34))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      cs.forEach(([i, j], m) => {
        ctx.fillRect(X(i), Y(j + 1), cell, cell);
        ctx.strokeRect(X(i) + 1, Y(j + 1) + 1, cell - 2, cell - 2);
      });
      // weights, in each read cell's outer corner (away from the markers)
      const fs = Math.max(10, Math.min(13, cell * 0.34));
      cs.forEach(([i, j], m) => {
        const lx = X(i + (m % 2 ? 0.7 : 0.3));
        const ly = Y(j + (m > 1 ? 0.75 : 0.25));
        const t = corner.w[m].toFixed(2);
        const tw = ctx.measureText(t).width + 4;
        ctx.fillStyle = pal.css('board', 0.85);
        ctx.fillRect(lx - tw / 2, ly - fs * 0.6, tw, fs * 1.2);
        ctx.fillStyle = pal.css('ink');
        ctx.fillText(t, lx, ly);
      });
      // the cell written
      ctx.strokeStyle = pal.css('write');
      ctx.lineWidth = 3;
      ctx.strokeRect(X(ci) + 1.5, Y(cj + 1) + 1.5, cell - 3, cell - 3);
      // exact path: an arc about the centre
      const r = Math.hypot(ci + 0.5 - N / 2, cj + 0.5 - N / 2);
      const a1 = Math.atan2(cj + 0.5 - N / 2, ci + 0.5 - N / 2);
      const a0 = a1 - 2 * Math.PI * dtOf();
      ctx.strokeStyle = pal.css('ink', 0.8);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      for (let m = 0; m <= 40; m++) {
        const a = a0 + ((a1 - a0) * m) / 40;
        const px = X(N / 2 + r * Math.cos(a));
        const py = Y(N / 2 + r * Math.sin(a));
        if (m === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      // straight backtrace lines and departure points
      const x0 = X(ci + 0.5);
      const y0 = Y(cj + 0.5);
      for (const [bt, col] of [
        ['euler', 's2'],
        ['rk2', 's1'],
      ]) {
        const q = dep[bt];
        ctx.strokeStyle = pal.css(col, bt === method.value ? 1 : 0.5);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = bt === method.value ? 2 : 1.25;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(X(q[0]), Y(q[1]));
        ctx.stroke();
        ctx.beginPath();
        if (bt === 'euler') ctx.rect(X(q[0]) - 5, Y(q[1]) - 5, 10, 10);
        else ctx.arc(X(q[0]), Y(q[1]), 5.5, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.strokeStyle = pal.css('ink');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(ex), Y(ey), 8, 0, 2 * Math.PI);
      ctx.stroke();
    });
    const missE = Math.hypot(dep.euler[0] - ex, dep.euler[1] - ey);
    const missR = Math.hypot(dep.rk2[0] - ex, dep.rk2[1] - ey);
    const r = Math.hypot(ci + 0.5 - N / 2, cj + 0.5 - N / 2);
    rdDep.set(`(${d[0].toFixed(2)}, ${d[1].toFixed(2)})`);
    rdErrE.set(missE, missE > 0.5 ? 'bad' : '');
    rdErrR.set(missR, missR > 0.5 ? 'bad' : '');
    rdRad.set(r > 0.1 ? Math.hypot(dep.euler[0] - N / 2, dep.euler[1] - N / 2) / r : NaN);
    rdW.set(corner.w.map((w) => w.toFixed(2)).join(' + '));
    rdVal.set(num(d[2], 3));
    const m = maxOf(main.dye);
    rdMax.set(`${num(max0, 3)} → ${num(m, 3)}`);
    rdTot.set(steps ? pct(sum(main.dye) / total0 - 1) : '–');
    f.status.textContent = `Cell (${ci}, ${cj}) gets ${num(d[2], 3)}: a weighted average of the four blue values, so it can never exceed the largest of them.${steps ? ` After ${steps} step${steps > 1 ? 's' : ''} the peak is ${num(m, 3)}, down from ${num(max0, 3)}.` : ''}`;
  }

  view.redraw = draw;
  view.onDrag(({ gx, gy, inside }) => {
    if (!inside) return;
    const i = Math.floor(gx);
    const j = Math.floor(gy);
    if (i === ci && j === cj) return;
    ci = i;
    cj = j;
    update();
  });
  reset();
  update();
  return () => view.destroy();
}
