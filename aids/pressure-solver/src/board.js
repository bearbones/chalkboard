// The board: the grid drawn as a field heatmap, with what the current step
// reads (blue, dashed) and writes (yellow) chalked on top.

import * as P from './physics.js';
import { aggregateCount, aggregateOf, UP, LEFT, CENTER, RIGHT, DOWN } from './linear.js';

// ---- palette (read from CSS tokens so both themes work) --------------------
const TOKENS = ['board', 'ink', 'grid', 'write', 'read', 'accent', 'map-neg', 'map-zero', 'map-pos', 'map-lo', 'map-mid', 'map-hi', 'liquid', 'gas-air', 'gas-vapour', 'solid', 'hatch', 'cold'];

export function readPalette(el) {
  const cs = getComputedStyle(el);
  const pal = {};
  for (const t of TOKENS) pal[t] = hexRgb(cs.getPropertyValue('--' + t).trim());
  return pal;
}
function hexRgb(h) {
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  if (!m) return [128, 128, 128];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

export function sequential(pal, t) {
  t = clamp01(t);
  return t < 0.5 ? lerp(pal['map-lo'], pal['map-mid'], t * 2) : lerp(pal['map-mid'], pal['map-hi'], t * 2 - 1);
}
export function diverging(pal, t) {
  // t ∈ [−1, 1]
  return t < 0 ? lerp(pal['map-zero'], pal['map-neg'], clamp01(-t)) : lerp(pal['map-zero'], pal['map-pos'], clamp01(t));
}
export function gradientCss(pal, kind) {
  const stops = [];
  for (let k = 0; k <= 8; k++) {
    const t = k / 8;
    stops.push(css(kind === 'div' ? diverging(pal, 2 * t - 1) : sequential(pal, t)));
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

// ---- multigrid geometry: each level's cells as rectangles of fine cells ----
export function levelGeometry(w, h) {
  const levels = [];
  let lw = w,
    lh = h,
    rects = [];
  for (let i = 0; i < w * h; i++) rects.push([i % w, (i / w) | 0, (i % w) + 1, ((i / w) | 0) + 1]);
  let fineToLevel = Array.from({ length: w * h }, (_, i) => i);
  levels.push({ w, h, rects, fineToLevel });
  while (lw * lh > 1) {
    const cw = aggregateCount(lw),
      chh = aggregateCount(lh);
    const map = [];
    for (let i = 0; i < lw * lh; i++) map.push(aggregateOf(lh, (i / lw) | 0) * cw + aggregateOf(lw, i % lw));
    fineToLevel = fineToLevel.map((j) => map[j]);
    rects = Array.from({ length: cw * chh }, () => [Infinity, Infinity, -Infinity, -Infinity]);
    for (let i = 0; i < w * h; i++) {
      const r = rects[fineToLevel[i]],
        x = i % w,
        y = (i / w) | 0;
      r[0] = Math.min(r[0], x);
      r[1] = Math.min(r[1], y);
      r[2] = Math.max(r[2], x + 1);
      r[3] = Math.max(r[3], y + 1);
    }
    levels.push({ w: cw, h: chh, rects, fineToLevel });
    lw = cw;
    lh = chh;
  }
  return levels;
}

// ---- which buffer and field the current step is about ----------------------
export function activeBuffer(solver, tr) {
  return tr.candidate ? solver.x.cand : solver.x.cur;
}

export const FIELDS = {
  auto: 'Auto (follows the step)',
  pressure: 'Pressure',
  residual: 'Residual R',
  delta: 'Correction δ',
  mg: 'Multigrid vector',
  temperature: 'Temperature',
  material: 'Material',
  slope: 'Source slope dO/dp',
};

export function autoField(tr) {
  const stage = tr.stage;
  if (tr.pass) return { source: 'material', faces: 'pressure', residual: 'residual' }[tr.pass.pass];
  if (stage === 'prepass') return 'temperature';
  if (stage === 'jacobian') return 'slope';
  if (stage === 'linear') return tr.hierarchy ? 'slope' : tr.byKind.level ? 'mg' : 'delta';
  if (stage === 'transport') return 'material';
  if (stage || tr.byKind.seed) return 'residual';
  return 'pressure'; // between intervals: the answer
}

// The vector a V-cycle level is writing right now, and how far the sweep got.
function mgVector(solver, tr) {
  const levels = solver.x.levels;
  const lvlSpan = tr.byKind.level;
  if (!levels || !lvlSpan) return null;
  const sweep = tr.sweep;
  const op = tr.op;
  let level = sweep?.level ?? lvlSpan.level;
  const L = levels[level];
  if (!L) return null;
  const cursor = op && op.level === level && op.cell >= 0 ? op.cell : -1;
  let values,
    name,
    fresh = cursor >= 0 ? cursor : sweep ? -1 : L.A.n;
  const label = sweep?.label || '';
  if (op?.op === 'jacobi' || label.includes('smooth')) {
    // Ping-pong: cells up to the cursor are in the new buffer, the rest still old.
    values = new Float64Array(L.A.n);
    for (let i = 0; i < L.A.n; i++) values[i] = i <= cursor ? L.zNext[i] : L.z[i];
    name = 'z (correction at this level)';
    fresh = L.A.n;
  } else if (label.startsWith('Residual')) {
    values = L.r;
    name = 'r = rhs − A·z';
  } else if (label.startsWith('Restrict')) {
    values = L.rhs;
    name = 'rhs (restricted residual)';
  } else if (label.startsWith('Prolong') || op?.op === 'coarse-solve') {
    values = L.z;
    name = 'z (correction at this level)';
  } else {
    values = L.rhs;
    name = 'rhs (what this level must solve)';
    fresh = L.A.n;
  }
  return { level, values, name, fresh };
}

export function fieldData(solver, tr, choice) {
  const { ch, x } = solver;
  const buf = activeBuffer(solver, tr);
  const field = choice === 'auto' ? autoField(tr) : choice;
  const n = ch.n;
  const out = { field, level: 0, kind: 'seq', values: null, lo: 0, hi: 1, labels: ['', '', ''], name: FIELDS[field], fresh: n };
  const fluidRange = (arr, f = (v) => v) => {
    let lo = Infinity,
      hi = -Infinity;
    for (let i = 0; i < n; i++)
      if (ch.fluid[i]) {
        const v = f(arr[i], i);
        if (isFinite(v)) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
      }
    return [lo, hi];
  };
  if (field === 'pressure') {
    const g = new Float64Array(n);
    for (let i = 0; i < n; i++) g[i] = (buf.p[i] - P.P_ATM) * P.PA_PER_UNIT;
    let [lo, hi] = fluidRange(g);
    if (hi - lo < 1) hi = lo + 1;
    Object.assign(out, { values: g, lo, hi, labels: [fmtPa(lo), 'gauge pressure', fmtPa(hi)], name: 'Pressure above 1 atm' });
  } else if (field === 'residual') {
    Object.assign(out, { values: buf.R, kind: 'reslog', labels: ['−1', '|R| ≤ 1e-9', '+1'], name: 'Residual R (cell volumes, signed log)' });
  } else if (field === 'delta') {
    let m = 0;
    for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(x.delta[i]));
    m = m || 1;
    Object.assign(out, { values: x.delta, kind: 'div', lo: -m, hi: m, labels: [fmtPa(-m * P.PA_PER_UNIT), '0', fmtPa(m * P.PA_PER_UNIT)], name: 'Newton correction δ' });
  } else if (field === 'temperature') {
    let [lo, hi] = fluidRange(buf.T);
    if (hi - lo < 1) {
      const c = 0.5 * (lo + hi);
      lo = c - 0.5;
      hi = c + 0.5;
    }
    Object.assign(out, { values: buf.T, lo, hi, labels: [`${lo.toFixed(1)} K`, 'temperature', `${hi.toFixed(1)} K`] });
  } else if (field === 'material') {
    Object.assign(out, { kind: 'material', values: buf.mv, labels: ['liquid', 'air', 'vapour'], name: 'Material: liquid, air, vapour' });
  } else if (field === 'slope') {
    const g = new Float64Array(n);
    for (let i = 0; i < n; i++) g[i] = Math.abs(x.slope[i]) > 0 ? Math.log10(Math.abs(x.slope[i])) : -Infinity;
    let [lo, hi] = fluidRange(g);
    if (!isFinite(lo)) [lo, hi] = [-6, -4];
    if (hi - lo < 1) lo = hi - 1;
    Object.assign(out, { values: g, lo, hi, labels: [`1e${lo.toFixed(0)}`, '|dO/dp| (log)', `1e${hi.toFixed(0)}`] });
  } else if (field === 'mg') {
    const mg = mgVector(solver, tr);
    if (!mg) return fieldData(solver, tr, 'delta');
    let m = 0;
    for (let i = 0; i < mg.values.length; i++) m = Math.max(m, Math.abs(mg.values[i]));
    m = m || 1;
    Object.assign(out, { values: mg.values, kind: 'div', level: mg.level, lo: -m, hi: m, fresh: mg.fresh, labels: [`−${m.toExponential(1)}`, '0', `+${m.toExponential(1)}`], name: `Level ${mg.level}: ${mg.name}` });
  }
  // Cells the running pass has not reached yet still hold stale values: dim them.
  const writes = { source: 'material', residual: 'residual' }[tr.pass?.pass] || (tr.stage === 'jacobian' ? 'slope' : null);
  if (field === writes && tr.op?.cell >= 0) out.fresh = tr.op.cell;
  return out;
}

export function fmtPa(pa) {
  const a = Math.abs(pa);
  const s = pa < 0 ? '−' : '+';
  if (a >= 1e4) return `${s}${(a / 1000).toFixed(1)} kPa`;
  if (a >= 100) return `${s}${a.toFixed(0)} Pa`;
  if (a >= 1) return `${s}${a.toFixed(1)} Pa`;
  return `${s}${a.toPrecision(2)} Pa`;
}

// ---- the renderer -------------------------------------------------------------
export class Board {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.geom = null;
    this.lastWrite = []; // per level: time of each cell's latest write
    this.frameOps = 0;
    this.busy = 1;
    this.selected = -1;
  }
  setChamber(ch) {
    this.geom = levelGeometry(ch.w, ch.h);
    this.lastWrite = this.geom.map((L) => new Float64Array(L.rects.length).fill(-Infinity));
  }
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = Math.max(1, Math.round(r.width * dpr)),
      H = Math.max(1, Math.round(r.height * dpr));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
    }
    this.dpr = dpr;
  }
  // Remember a write for the fading glow trail.
  record(e, now) {
    const lw = this.lastWrite[e.level ?? 0];
    if (e.cell < 0 || !lw || e.cell >= lw.length) return;
    lw[e.cell] = now;
    this.frameOps++;
  }
  cellAt(clientX, clientY, ch) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor(((clientX - r.left) / r.width) * ch.w),
      y = Math.floor(((clientY - r.top) / r.height) * ch.h);
    return x >= 0 && y >= 0 && x < ch.w && y < ch.h ? y * ch.w + x : -1;
  }

  draw(solver, tr, fd, pal, opts) {
    const { g } = this;
    const { ch } = solver;
    const W = this.canvas.width,
      s = W / ch.w;
    const buf = activeBuffer(solver, tr);
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = css(pal.board);
    g.fillRect(0, 0, W, this.canvas.height);
    g.scale(s, s); // draw in fine-cell units
    const px = 1 / s;

    // Field fill.
    const lv = this.geom[fd.level];
    const color = (v, i) => {
      if (fd.kind === 'reslog') {
        const a = Math.abs(v);
        const t = a <= 1e-9 ? 0 : clamp01((Math.log10(a) + 9) / 9);
        return diverging(pal, v < 0 ? -t : t);
      }
      if (fd.kind === 'div') return diverging(pal, v / fd.hi);
      if (fd.kind === 'material') {
        const ml = ch.water[i] - buf.mv[i];
        const gasR = buf.mv[i] * P.R_VAP + ch.ma[i] * P.R_AIR;
        const share = gasR > 0 ? (buf.mv[i] * P.R_VAP) / gasR : 0;
        const gas = lerp(pal['gas-air'], pal['gas-vapour'], share);
        return lerp(gas, pal.liquid, clamp01(ml / P.RHO));
      }
      return sequential(pal, (v - fd.lo) / (fd.hi - fd.lo));
    };
    if (fd.level === 0) {
      for (let i = 0; i < ch.n; i++) {
        if (!ch.fluid[i]) continue;
        const v = fd.values ? fd.values[i] : 0;
        g.globalAlpha = i <= fd.fresh ? 1 : 0.45;
        g.fillStyle = css(color(v, i));
        g.fillRect(i % ch.w, (i / ch.w) | 0, 1, 1);
      }
      g.globalAlpha = 1;
    } else {
      for (let I = 0; I < lv.rects.length; I++) {
        const r = lv.rects[I];
        g.globalAlpha = I <= fd.fresh ? 1 : 0.45;
        g.fillStyle = css(color(fd.values[I], -1));
        g.fillRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
      }
      g.globalAlpha = 1;
    }

    // Faint grid.
    g.strokeStyle = css(pal.grid, 0.9);
    g.lineWidth = px;
    g.beginPath();
    for (let k = 1; k < ch.w; k++) {
      g.moveTo(k, 0);
      g.lineTo(k, ch.h);
    }
    for (let k = 1; k < ch.h; k++) {
      g.moveTo(0, k);
      g.lineTo(ch.w, k);
    }
    g.stroke();

    // Solids: hatched, held walls tinted cold.
    for (let i = 0; i < ch.n; i++) {
      if (ch.fluid[i]) continue;
      const x = i % ch.w,
        y = (i / ch.w) | 0;
      const held = isFinite(ch.heldT[i]) && ch.conductance > 0;
      g.fillStyle = css(held ? pal.cold : pal.solid, fd.level ? 0.75 : 1);
      g.fillRect(x, y, 1, 1);
      g.save();
      g.beginPath();
      g.rect(x, y, 1, 1);
      g.clip();
      g.strokeStyle = css(pal.hatch, 0.55);
      g.lineWidth = 1.2 * px;
      g.beginPath();
      for (let k = -1; k < 2; k += 0.34) {
        g.moveTo(x + k, y + 1);
        g.lineTo(x + k + 1, y);
      }
      g.stroke();
      g.restore();
    }

    // Liquid/gas interface: an edge where one side is mostly liquid and the other mostly gas.
    const liq = (i) => (ch.water[i] - buf.mv[i]) / P.RHO > 0.5;
    g.strokeStyle = css(pal.ink, 0.85);
    g.lineWidth = 2 * px;
    g.lineCap = 'round';
    g.beginPath();
    for (let i = 0; i < ch.n; i++) {
      if (!ch.fluid[i]) continue;
      const x = i % ch.w,
        y = (i / ch.w) | 0;
      if (ch.openRight(i) && liq(i) !== liq(i + 1)) {
        g.moveTo(x + 1, y);
        g.lineTo(x + 1, y + 1);
      }
      if (ch.openDown(i) && liq(i) !== liq(i + ch.w)) {
        g.moveTo(x, y + 1);
        g.lineTo(x + 1, y + 1);
      }
    }
    g.stroke();

    // Coarse-level block outlines.
    if (fd.level > 0 || tr.hierarchy) {
      const L = this.geom[fd.level || tr.op?.level || 1];
      if (L) {
        g.strokeStyle = css(pal.ink, 0.55);
        g.lineWidth = 1.5 * px;
        g.setLineDash([4 * px, 3 * px]);
        for (const r of L.rects) g.strokeRect(r[0], r[1], r[2] - r[0], r[3] - r[1]);
        g.setLineDash([]);
      }
    }

    // Face velocities.
    const showVel = opts.velocities || fd.field === 'pressure' || tr.stage === 'transport';
    if (showVel) this.drawVelocities(ch, buf, pal, px);

    // Glow trail of recent writes. When a frame writes more than half the
    // grid the order is too fast to follow, so the trail fades out rather
    // than washing the field yellow.
    const now = opts.now,
      tau = opts.trailTau;
    if (this.frameOps > 0) this.busy = Math.min(1, (0.5 * ch.n) / this.frameOps);
    this.frameOps = 0;
    if (this.busy > 0.05)
      for (let i = 0; i < ch.n; i++) {
        // A fine cell glows with its own latest write or its block's, whichever is newer.
        let t = -Infinity;
        for (let l = 0; l < this.geom.length; l++) t = Math.max(t, this.lastWrite[l][this.geom[l].fineToLevel[i]]);
        const age = now - t;
        if (age > tau * 4) continue;
        g.fillStyle = css(pal.write, 0.3 * this.busy * Math.exp(-age / tau));
        g.fillRect(i % ch.w, (i / ch.w) | 0, 1, 1);
      }

    // The current op: reads (blue, dashed) and the write (yellow).
    const op = tr.op;
    if (op) this.drawOp(op, ch, pal, px);

    // The selected cell.
    if (this.selected >= 0) {
      const x = this.selected % ch.w,
        y = (this.selected / ch.w) | 0;
      g.strokeStyle = css(pal.accent);
      g.lineWidth = 2.5 * px;
      g.strokeRect(x + 1.5 * px, y + 1.5 * px, 1 - 3 * px, 1 - 3 * px);
    }
  }

  drawVelocities(ch, buf, pal, px) {
    const { g } = this;
    let m = 0;
    for (let i = 0; i < ch.n; i++) m = Math.max(m, Math.abs(buf.u[i]), Math.abs(buf.v[i]));
    for (let i = 0; i < ch.w; i++) m = Math.max(m, Math.abs(buf.top[i]));
    if (!(m > 0)) return;
    const len = (u) => 0.42 * Math.sqrt(Math.abs(u) / m);
    g.strokeStyle = css(pal.ink, 0.75);
    g.fillStyle = css(pal.ink, 0.75);
    g.lineWidth = 1.4 * px;
    for (let i = 0; i < ch.n; i++) {
      const x = i % ch.w,
        y = (i / ch.w) | 0;
      if (ch.openRight(i) && buf.u[i]) arrow(g, x + 1, y + 0.5, Math.sign(buf.u[i]) * len(buf.u[i]), 0, px);
      if (ch.openDown(i) && buf.v[i]) arrow(g, x + 0.5, y + 1, 0, Math.sign(buf.v[i]) * len(buf.v[i]), px);
      if (ch.openTop(i) && buf.top[i]) arrow(g, x + 0.5, 0, 0, Math.sign(buf.top[i]) * len(buf.top[i]), px);
    }
  }

  drawOp(op, ch, pal, px) {
    const { g } = this;
    const level = op.level ?? 0;
    const L = this.geom[level];
    const RL = this.geom[op.readLevel ?? level];
    const centre = (r) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2];
    const faceSeg = (f) => {
      const ax = f.a % ch.w,
        ay = (f.a / ch.w) | 0;
      if (f.dir === 'x') return [ax + 1, ay, ax + 1, ay + 1];
      if (f.dir === 'y') return [ax, ay + 1, ax + 1, ay + 1];
      return [ax, 0, ax + 1, 0];
    };
    const w = op.cell >= 0 && L ? L.rects[op.cell] : null;
    // Reads.
    g.strokeStyle = css(pal.read);
    g.lineWidth = 2 * px;
    g.setLineDash([3.5 * px, 2.5 * px]);
    const reads = op.reads || [];
    for (const j of reads) {
      const r = RL?.rects[j];
      if (!r) continue;
      g.strokeRect(r[0] + 2 * px, r[1] + 2 * px, r[2] - r[0] - 4 * px, r[3] - r[1] - 4 * px);
    }
    g.setLineDash([]);
    if (op.faces) {
      g.lineWidth = 4 * px;
      g.lineCap = 'round';
      for (const f of op.faces) {
        const [x0, y0, x1, y1] = faceSeg(f);
        g.beginPath();
        g.moveTo(x0 + (x1 - x0) * 0.15, y0 + (y1 - y0) * 0.15);
        g.lineTo(x1 - (x1 - x0) * 0.15, y1 - (y1 - y0) * 0.15);
        g.stroke();
      }
    }
    // Read → write arrows (skip when there are many: the dashed boxes say it).
    if (w && reads.length && reads.length <= 6 && !op.face) {
      const [cx, cy] = centre(w);
      g.strokeStyle = css(pal.read, 0.9);
      g.fillStyle = css(pal.read, 0.9);
      g.lineWidth = 1.6 * px;
      for (const j of reads) {
        const r = RL?.rects[j];
        if (!r) continue;
        const [rx, ry] = centre(r);
        const dx = cx - rx,
          dy = cy - ry,
          d = Math.hypot(dx, dy);
        if (d < 1e-6) continue;
        const shrink = Math.min(0.32, d * 0.3);
        arrow(g, rx + (dx / d) * shrink, ry + (dy / d) * shrink, dx - (dx / d) * 2 * shrink, dy - (dy / d) * 2 * shrink, px);
      }
    }
    // The write.
    g.save();
    g.shadowColor = css(pal.write, 0.9);
    g.shadowBlur = 8 * (this.dpr || 1);
    g.strokeStyle = css(pal.write);
    if (op.face) {
      const [x0, y0, x1, y1] = faceSeg(op.face);
      g.lineWidth = 5 * px;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x1, y1);
      g.stroke();
    } else if (w) {
      const k = op.faces ? 6 : 1.5; // leave the cell's edges free for the face reads
      g.lineWidth = 3 * px;
      g.strokeRect(w[0] + k * px, w[1] + k * px, w[2] - w[0] - 2 * k * px, w[3] - w[1] - 2 * k * px);
    }
    g.restore();
  }
}

function arrow(g, x, y, dx, dy, px) {
  const d = Math.hypot(dx, dy);
  if (d < 2 * px) return;
  const ux = dx / d,
    uy = dy / d,
    hs = Math.min(0.16, d * 0.45);
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x + dx, y + dy);
  g.stroke();
  g.beginPath();
  g.moveTo(x + dx, y + dy);
  g.lineTo(x + dx - ux * hs - uy * hs * 0.6, y + dy - uy * hs + ux * hs * 0.6);
  g.lineTo(x + dx - ux * hs + uy * hs * 0.6, y + dy - uy * hs - ux * hs * 0.6);
  g.closePath();
  g.fill();
}

// A row of a 5-point matrix, for the inspector's plus-shaped stencil.
export function stencilRow(A, i) {
  return { up: A.get(i, UP), left: A.get(i, LEFT), center: A.get(i, CENTER), right: A.get(i, RIGHT), down: A.get(i, DOWN) };
}
