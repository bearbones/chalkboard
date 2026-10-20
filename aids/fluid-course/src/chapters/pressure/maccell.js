// pressure-mac-cell: an explorable patch of grid. On the staggered (MAC) grid
// pressure lives at cell centres, u on the vertical faces and v on the
// horizontal faces; on the collocated grid all three live at the centres.
// Pick an operator (gradient or divergence) and tap a place: the value that
// is written is ringed in the 'write' colour, the values its stencil reads
// in the 'read' colour, and the formula is written out with the numbers.
// The checkerboard slider adds a·(−1)^{i+j} to the field being read: the MAC
// stencils change by ±2a/h, the collocated ones by exactly 0, because they
// read two cells apart, on the same parity sub-grid. The values come from the
// shared kernels (grid2d.js gradient, divergence, centralGradient,
// centralDivergence) on a periodic 6 × 4 grid with h = 1.

import { h } from '../../kit/dom.js';
import { frame, segmented, slider, toggle, readout, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { arrow } from '../../kit/field.js';
import { macGrid, gradient, divergence, centralGradient, centralDivergence } from '../../sims/grid2d.js';
import { presetFor } from './common.js';

const NX = 6;
const NY = 4;
const HH = 1;
const PRESETS = {
  default: { grid: 'mac', op: 'grad', a: 0, subgrids: false },
  collocated: { grid: 'col', op: 'grad', a: 0.5, subgrids: true },
  divergence: { grid: 'mac', op: 'div', a: 0, subgrids: false },
};

// Smooth fields with short decimals so the arithmetic is easy to follow.
const r2 = (v) => Math.round(v * 100) / 100;
const pSmooth = (x, y) => r2(0.4 + 0.15 * x + 0.1 * y);
const uSmooth = (x, y) => r2(0.5 + 0.1 * x - 0.05 * y);
const vSmooth = (x, y) => r2(0.3 - 0.05 * x + 0.1 * y);
const sgn = (i, j) => ((i + j) & 1 ? -1 : 1);
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (n) => String(n).replace(/[0-9]/g, (d) => SUB[d]);
const half = (k) => `${k - 1}½`.replace(/^-1½$/, '−½').replace(/^0½$/, '½');
const f2 = (v) => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2);

export function mountMacCell(fig, { signal }) {
  const p0 = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Where the numbers live, and what each stencil reads' });
  const box = canvasBox(f.stage, { aspect: NX / NY + 0.1, maxHeight: 380, minHeight: 200, label: 'A 6 by 4 patch of grid cells showing where pressure and velocity are stored. Tap a cell or face, or use the arrow keys, to choose where the operator is evaluated.' });
  box.canvas.tabIndex = 0;
  box.canvas.style.touchAction = 'manipulation';
  const formula = h('p.pr-formula', { 'aria-live': 'off' });
  f.stage.append(formula);

  const grid = segmented(f.controls, {
    label: 'Grid',
    options: [
      ['mac', 'staggered (MAC)'],
      ['col', 'collocated'],
    ],
    value: p0.grid,
    onChange: () => (clampTarget(), update()),
  });
  const op = segmented(f.controls, {
    label: 'Operator',
    options: [
      ['grad', 'gradient of p'],
      ['div', 'divergence of u'],
    ],
    value: p0.op,
    onChange: () => (clampTarget(), update()),
  });
  const amp = slider(f.controls, { label: 'add checkerboard a·(−1)^(i+j), a =', min: 0, max: 1, step: 0.05, value: p0.a, fmt: (v) => v.toFixed(2), onInput: () => update() });
  const subs = toggle(f.controls, { label: 'Mark the four sub-grids', checked: p0.subgrids, onChange: () => draw() });

  const rdVal = readout(f.readouts, { label: 'value written' });
  const rdChk = readout(f.readouts, { label: 'change caused by the checkerboard' });
  const rdReads = readout(f.readouts, { label: 'values read' });

  // Fields on a periodic grid (h = 1). MAC faces and centres; collocated centres.
  const g = macGrid(NX, NY, HH, { bc: 'periodic' });
  const n = NX * NY;
  const p = new Float64Array(n);
  const gu = new Float64Array(g.u.length);
  const gv = new Float64Array(g.v.length);
  const div = new Float64Array(n);
  const uc = new Float64Array(n);
  const vc = new Float64Array(n);
  const gx = new Float64Array(n);
  const gy = new Float64Array(n);
  const dc = new Float64Array(n);
  const su = NX + 1;

  // Target: kind 'cell' | 'u' | 'v', with integer indices (faces: i or j is
  // the face index, i.e. u-face i sits between cells i−1 and i).
  const target = { kind: 'cell', i: 2, j: 1 };
  let res = { value: 0, base: 0, reads: [], write: null, text: '' };
  let lastStatus = '';

  function fill(a) {
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const c = i + j * NX;
        const s = a * sgn(i, j);
        p[c] = pSmooth(i + 0.5, j + 0.5) + (op.value === 'grad' ? s : 0);
        uc[c] = uSmooth(i + 0.5, j + 0.5) + (op.value === 'div' ? s : 0);
        vc[c] = vSmooth(i + 0.5, j + 0.5);
      }
    }
    for (let j = 0; j < NY; j++) for (let i = 0; i <= NX; i++) g.u[i + j * su] = uSmooth(i, j + 0.5) + (op.value === 'div' ? a * sgn(i, j) : 0);
    for (let j = 0; j <= NY; j++) for (let i = 0; i < NX; i++) g.v[i + j * NX] = vSmooth(i + 0.5, j);
    gradient(g, p, gu, gv);
    divergence(g, div);
    centralGradient(p, NX, NY, HH, gx, gy, true);
    centralDivergence(uc, vc, NX, NY, HH, dc, true);
  }

  // Evaluate the chosen stencil at the target; returns its value and the
  // tokens it reads (for highlighting and for the formula).
  function evaluate() {
    const t = target;
    const mac = grid.value === 'mac';
    const P = (i, j) => ({ kind: 'p', i, j, v: p[i + j * NX], name: `p${sub(i)},${sub(j)}` });
    if (op.value === 'grad') {
      if (mac && t.kind === 'u') {
        const a = P(t.i - 1, t.j);
        const b = P(t.i, t.j);
        return { value: gu[t.i + t.j * su], reads: [a, b], write: { kind: 'u', i: t.i, j: t.j }, text: `∂p/∂x at u-face (${half(t.i)}, ${t.j}) = (${b.name} − ${a.name}) / h = (${f2(b.v)} − ${f2(a.v)}) / 1 = ${f2(gu[t.i + t.j * su])}` };
      }
      if (mac && t.kind === 'v') {
        const a = P(t.i, t.j - 1);
        const b = P(t.i, t.j);
        return { value: gv[t.i + t.j * NX], reads: [a, b], write: { kind: 'v', i: t.i, j: t.j }, text: `∂p/∂y at v-face (${t.i}, ${half(t.j)}) = (${b.name} − ${a.name}) / h = (${f2(b.v)} − ${f2(a.v)}) / 1 = ${f2(gv[t.i + t.j * NX])}` };
      }
      // collocated gradient at a cell (x component)
      const a = P(t.i - 1, t.j);
      const b = P(t.i + 1, t.j);
      const c = t.i + t.j * NX;
      return { value: gx[c], reads: [a, b], write: { kind: 'cell', i: t.i, j: t.j }, text: `∂p/∂x at cell (${t.i}, ${t.j}) = (${b.name} − ${a.name}) / 2h = (${f2(b.v)} − ${f2(a.v)}) / 2 = ${f2(gx[c])}. The cell's own p${sub(t.i)},${sub(t.j)} is never read.` };
    }
    const c = t.i + t.j * NX;
    if (mac) {
      const uw = { kind: 'u', i: t.i, j: t.j, v: g.u[t.i + t.j * su], name: `u${sub(t.i)}` };
      const ue = { kind: 'u', i: t.i + 1, j: t.j, v: g.u[t.i + 1 + t.j * su], name: `u${sub(t.i + 1)}` };
      const vs = { kind: 'v', i: t.i, j: t.j, v: g.v[t.i + t.j * NX], name: `v${sub(t.j)}` };
      const vn = { kind: 'v', i: t.i, j: t.j + 1, v: g.v[t.i + (t.j + 1) * NX], name: `v${sub(t.j + 1)}` };
      return { value: div[c], reads: [uw, ue, vs, vn], write: { kind: 'cell', i: t.i, j: t.j }, text: `∇·u in cell (${t.i}, ${t.j}) = (u east − u west + v north − v south) / h = (${f2(ue.v)} − ${f2(uw.v)} + ${f2(vn.v)} − ${f2(vs.v)}) / 1 = ${f2(div[c])}` };
    }
    const U = (i, j) => ({ kind: 'uc', i, j, v: uc[i + j * NX] });
    const V = (i, j) => ({ kind: 'vc', i, j, v: vc[i + j * NX] });
    const r = [U(t.i - 1, t.j), U(t.i + 1, t.j), V(t.i, t.j - 1), V(t.i, t.j + 1)];
    return { value: dc[c], reads: r, write: { kind: 'cell', i: t.i, j: t.j }, text: `∇·u at cell (${t.i}, ${t.j}) = (u east − u west) / 2h + (v north − v south) / 2h = (${f2(r[1].v)} − ${f2(r[0].v)} + ${f2(r[3].v)} − ${f2(r[2].v)}) / 2 = ${f2(dc[c])}. The cell's own u and v are never read.` };
  }

  function update() {
    fill(0);
    const base = evaluate().value;
    fill(amp.value);
    res = evaluate();
    res.base = base;
    const d = res.value - base;
    rdVal.set(f2(res.value));
    const a = amp.value;
    rdChk.set(a === 0 ? '0 (no checkerboard)' : `${f2(d)}${Math.abs(d) < 1e-12 ? ' (invisible)' : ` (= ${Math.abs(d / a).toFixed(0)}a/h)`}`, a === 0 ? '' : Math.abs(d) < 1e-12 ? 'bad' : 'good');
    rdReads.set(res.reads.length === 2 ? `2 pressures, ${grid.value === 'mac' ? 'neighbours' : 'two cells apart'}` : `4 velocities, ${grid.value === 'mac' ? 'on the cell’s own faces' : 'in the four neighbour cells'}`);
    formula.textContent = res.text;
    let msg;
    const mac = grid.value === 'mac';
    if (a === 0) msg = mac ? 'Staggered grid: each stencil reads the nearest neighbours, one half-cell either side of where it writes.' : 'Collocated grid: each central stencil skips the cell it writes and reads cells two apart.';
    else if (mac) msg = `The checkerboard alternates between neighbours, so this stencil sees a jump of 2a = ${(2 * a).toFixed(2)} and the result changes by ${f2(d)}.`;
    else msg = `Both values read sit on the same parity sub-grid, so the checkerboard adds the same ${f2(a)} (or −${f2(a)}) to each, and they cancel: the result does not change.`;
    if (msg !== lastStatus) f.status.textContent = lastStatus = msg;
    draw();
  }

  // Keep the target valid for the current operator and grid.
  function clampTarget() {
    const mac = grid.value === 'mac';
    if (op.value === 'grad' && mac) {
      if (target.kind === 'cell') {
        target.kind = 'u';
        target.i = Math.max(1, Math.min(NX - 1, target.i));
      }
    } else if (target.kind !== 'cell') target.kind = 'cell';
    const inner = !mac || op.value === 'grad';
    if (target.kind === 'cell') {
      const lo = inner ? 1 : 0;
      target.i = Math.max(lo, Math.min(NX - 1 - lo, target.i));
      target.j = Math.max(lo, Math.min(NY - 1 - lo, target.j));
    } else if (target.kind === 'u') {
      target.i = Math.max(1, Math.min(NX - 1, target.i));
      target.j = Math.max(0, Math.min(NY - 1, target.j));
    } else {
      target.i = Math.max(0, Math.min(NX - 1, target.i));
      target.j = Math.max(1, Math.min(NY - 1, target.j));
    }
  }

  // Layout: cells are square, letterboxed in the canvas.
  const L = { s: 1, x0: 0, y0: 0 };
  function layout() {
    const W = box.width;
    const H = box.height;
    const pad = 10;
    L.s = Math.min((W - 2 * pad) / NX, (H - 2 * pad) / NY);
    L.x0 = (W - L.s * NX) / 2;
    L.y0 = (H - L.s * NY) / 2;
  }
  const X = (x) => L.x0 + x * L.s;
  const Y = (y) => L.y0 + (NY - y) * L.s;

  function mark(ctx, pal, x, y, kind, r) {
    // The four parity sub-grids: circle, square, triangle, diamond.
    ctx.beginPath();
    if (kind === 0) ctx.arc(x, y, r, 0, 2 * Math.PI);
    else if (kind === 1) ctx.rect(x - r * 0.85, y - r * 0.85, 1.7 * r, 1.7 * r);
    else if (kind === 2) {
      ctx.moveTo(x, y - r * 1.1);
      ctx.lineTo(x + r, y + r * 0.8);
      ctx.lineTo(x - r, y + r * 0.8);
      ctx.closePath();
    } else {
      ctx.moveTo(x, y - r * 1.15);
      ctx.lineTo(x + r * 1.15, y);
      ctx.lineTo(x, y + r * 1.15);
      ctx.lineTo(x - r * 1.15, y);
      ctx.closePath();
    }
  }

  function ring(ctx, x, y, r, color, w = 3) {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.stroke();
  }

  function label(ctx, text, x, y, color, bold = false) {
    ctx.font = `${bold ? '700 ' : ''}${Math.max(10, Math.min(13, L.s * 0.2))}px "Atkinson Hyperlegible", system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function draw() {
    layout();
    const pal = palette();
    const ctx = box.ctx;
    box.clear(pal.css('board'));
    const s = L.s;
    const mac = grid.value === 'mac';
    // cells
    ctx.strokeStyle = pal.css('line');
    ctx.lineWidth = 1;
    for (let i = 0; i <= NX; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.round(X(i)) + 0.5, Y(0));
      ctx.lineTo(Math.round(X(i)) + 0.5, Y(NY));
      ctx.stroke();
    }
    for (let j = 0; j <= NY; j++) {
      ctx.beginPath();
      ctx.moveTo(X(0), Math.round(Y(j)) + 0.5);
      ctx.lineTo(X(NX), Math.round(Y(j)) + 0.5);
      ctx.stroke();
    }
    const isRead = (kind, i, j) => res.reads.some((t) => t.kind === kind && t.i === i && t.j === j);
    const w = res.write;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // velocity storage
    const tick = Math.min(16, s * 0.28);
    if (mac) {
      for (let j = 0; j < NY; j++) {
        for (let i = 0; i <= NX; i++) {
          const x = X(i);
          const y = Y(j + 0.5);
          const rd = op.value === 'div' && isRead('u', i, j);
          const wr = w && w.kind === 'u' && w.i === i && w.j === j;
          ctx.strokeStyle = ctx.fillStyle = pal.css(rd ? 'read' : wr ? 'write' : 's2', rd || wr ? 1 : 0.7);
          ctx.lineWidth = rd || wr ? 2.4 : 1.6;
          arrow(ctx, x - tick / 2, y, x + tick / 2, y, 4);
          if (rd) label(ctx, f2(g.u[i + j * su]), x, y - tick * 0.9, pal.css('read'), true);
          if (wr) {
            ring(ctx, x, y, tick * 0.85, pal.css('write'));
            label(ctx, f2(res.value), x, y - tick * 1.4, pal.css('write'), true);
          }
        }
      }
      for (let j = 0; j <= NY; j++) {
        for (let i = 0; i < NX; i++) {
          const x = X(i + 0.5);
          const y = Y(j);
          const rd = op.value === 'div' && isRead('v', i, j);
          const wr = w && w.kind === 'v' && w.i === i && w.j === j;
          ctx.strokeStyle = ctx.fillStyle = pal.css(rd ? 'read' : wr ? 'write' : 's3', rd || wr ? 1 : 0.7);
          ctx.lineWidth = rd || wr ? 2.4 : 1.6;
          arrow(ctx, x, y + tick / 2, x, y - tick / 2, 4);
          if (rd) label(ctx, f2(g.v[i + j * NX]), x + tick * 1.6, y, pal.css('read'), true);
          if (wr) {
            ring(ctx, x, y, tick * 0.85, pal.css('write'));
            label(ctx, f2(res.value), x + tick * 1.9, y, pal.css('write'), true);
          }
        }
      }
    }
    // pressure (and collocated velocity) at centres
    for (let j = 0; j < NY; j++) {
      for (let i = 0; i < NX; i++) {
        const x = X(i + 0.5);
        const y = Y(j + 0.5);
        const kind = (i & 1) + 2 * (j & 1);
        const rdP = op.value === 'grad' && isRead('p', i, j);
        const rdU = op.value === 'div' && !mac && (isRead('uc', i, j) || isRead('vc', i, j));
        const wr = w && w.kind === 'cell' && w.i === i && w.j === j;
        const r = Math.min(7, s * 0.1);
        ctx.fillStyle = pal.css(rdP ? 'read' : 'ink', rdP ? 1 : 0.75);
        if (subs.value) {
          mark(ctx, pal, x, y, kind, r * 1.15);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(x, y, r * 0.8, 0, 2 * Math.PI);
          ctx.fill();
        }
        if (!mac) {
          const ru = op.value === 'div' && isRead('uc', i, j);
          const rv = op.value === 'div' && isRead('vc', i, j);
          ctx.strokeStyle = ctx.fillStyle = pal.css(ru ? 'read' : 's2', ru ? 1 : 0.6);
          ctx.lineWidth = ru ? 2.4 : 1.4;
          arrow(ctx, x + r, y, x + r + tick * 0.9, y, 3.5);
          ctx.strokeStyle = ctx.fillStyle = pal.css(rv ? 'read' : 's3', rv ? 1 : 0.6);
          ctx.lineWidth = rv ? 2.4 : 1.4;
          arrow(ctx, x, y - r, x, y - r - tick * 0.9, 3.5);
        }
        if (op.value === 'grad') label(ctx, f2(p[i + j * NX]), x, y + r + 9, pal.css(rdP ? 'read' : 'muted'), rdP);
        if (rdU) {
          const t = res.reads.find((q) => q.i === i && q.j === j);
          label(ctx, f2(t.v), x, y + r + 9, pal.css('read'), true);
        }
        if (rdP) ring(ctx, x, y, r + 6, pal.css('read'), 2.5);
        if (wr) {
          ctx.strokeStyle = pal.css('write');
          ctx.lineWidth = 3;
          ctx.strokeRect(X(i) + 3, Y(j + 1) + 3, s - 6, s - 6);
          label(ctx, `→ ${f2(res.value)}`, x, Y(j + 1) + 13, pal.css('write'), true);
        }
      }
    }
  }

  // Tap: pick the nearest valid target.
  box.canvas.addEventListener('pointerdown', (e) => {
    const pt = box.pointer(e);
    const gxp = (pt.x - L.x0) / L.s;
    const gyp = NY - (pt.y - L.y0) / L.s;
    if (gxp < 0 || gyp < 0 || gxp > NX || gyp > NY) return;
    if (op.value === 'grad' && grid.value === 'mac') {
      const du = Math.abs(gxp - Math.round(gxp));
      const dv = Math.abs(gyp - Math.round(gyp));
      if (du < dv) Object.assign(target, { kind: 'u', i: Math.round(gxp), j: Math.floor(gyp) });
      else Object.assign(target, { kind: 'v', i: Math.floor(gxp), j: Math.round(gyp) });
    } else Object.assign(target, { kind: 'cell', i: Math.floor(gxp), j: Math.floor(gyp) });
    clampTarget();
    update();
  });
  box.canvas.addEventListener('keydown', (e) => {
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!d) return;
    e.preventDefault();
    target.i += d[0];
    target.j += d[1];
    clampTarget();
    update();
  });
  box.onResize(() => draw());
  void signal;

  clampTarget();
  update();
  return () => box.destroy();
}
