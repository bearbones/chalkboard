// stiffness-thomas: one implicit heat step, solved by the Thomas algorithm
// one operation at a time. The trace comes from diffusion.js's thomas()
// generator, the same code every implicit step in the course runs.

import { frame, slider, select, button, readout, playButton, animate, canvasBox } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { createHeat, setHeatPreset, assembleHeat, finishHeatStep, thomas, dtForR, heatExact } from '../../sims/diffusion.js';
import { presetFor, num } from './common.js';

const PRESETS = {
  default: { scheme: 'btcs', r: 2 },
  cn: { scheme: 'cn', r: 2 },
};
const N = 10; // intervals: 9 unknowns
const NF = 161;
const FONT = '"Atkinson Hyperlegible", system-ui, sans-serif';
const SUB = '₀₁₂₃₄₅₆₇₈₉';
const sub = (j) => String(j).replace(/[0-9]/g, (d) => SUB[d]);

export function mountThomas(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'One implicit step: the Thomas algorithm', wide: true });
  f.stage.classList.add('cols');
  const left = document.createElement('div');
  const right = document.createElement('div');
  f.stage.append(left, right);
  const box = canvasBox(left, { aspect: 1.3, minHeight: 220, label: 'The tridiagonal matrix of one implicit step, with the working columns c′, d′ and x of the Thomas algorithm' });
  const plot = new Plot(right, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u', min: -0.15, max: 1.15 }, aspect: 1.3, label: 'Old temperature, the new values as back substitution produces them, and the exact solution' });

  const s = createHeat({ n: N, preset: 'step' });
  const m = s.m;
  const total = 8 * m - 7;
  const XN = s.x;
  const uOld = new Float64Array(N + 1);
  const uNew = new Float64Array(N + 1);
  const XF = new Float64Array(NF);
  const EF = new Float64Array(NF);
  for (let k = 0; k < NF; k++) XF[k] = k / (NF - 1);

  let gen = null;
  let phase = 'ready';
  let cur = -1; // row of the current operation
  let reads = [];
  let elim = -1; // rows 0..elim eliminated
  let back = m; // rows back..m-1 solved
  let flops = 0;
  let pivot = NaN;
  let acc = 0;
  let narr = '';

  const scheme = select(f.controls, { label: 'Scheme', options: [['btcs', 'Backward Euler'], ['cn', 'Crank–Nicolson']], value: p.scheme, onChange: () => begin() });
  const rS = slider(f.controls, { label: 'mesh ratio r', min: 0.1, max: 20, log: true, value: p.r, fmt: (v) => num(v), onInput: () => begin() });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop);
  button(f.controls, { label: 'Next operation', onClick: () => (loop.pause(), next(), draw()) });
  button(f.controls, { label: 'Finish the step', onClick: () => (loop.pause(), finishAll(), draw()) });
  button(f.controls, { label: 'Reset', onClick: () => (loop.pause(), setHeatPreset(s, 'step'), begin()) });

  const rdPhase = readout(f.readouts, { label: 'phase' });
  const rdRow = readout(f.readouts, { label: 'row j' });
  const rdPiv = readout(f.readouts, { label: 'pivot' });
  const rdVal = readout(f.readouts, { label: 'value written' });
  const rdFl = readout(f.readouts, { label: 'flops so far' });
  const rdT = readout(f.readouts, { label: 'time t' });
  let lastVal = '–';

  plot.draw([
    { x: XF, y: EF, color: 'ink', dash: [5, 4], width: 1.5, label: 'exact at t + Δt' },
    { x: XN, y: uOld, color: 'muted', width: 1, dash: [2, 3], points: 3, label: 'u before the step' },
    { x: XN, y: uNew, color: 's1', width: 2, points: 4, label: 'new u (back substitution)' },
  ]);

  function begin() {
    const dt = dtForR(s, rS.value);
    assembleHeat(s, { scheme: scheme.value, dt });
    gen = thomas(s.lower, s.diag, s.upper, s.rhs, { x: s.sol, cp: s.cp, dp: s.dp });
    uOld.set(s.uPrev);
    uNew.fill(NaN);
    uNew[0] = s.left;
    uNew[N] = s.right;
    heatExact('step', XF, s.t + dt, s.kappa, EF);
    phase = 'ready';
    cur = -1;
    reads = [];
    elim = -1;
    back = m;
    flops = 0;
    pivot = NaN;
    lastVal = '–';
    narr = `Assembled ${m} equations, one per interior node: each new value appears with its two neighbours, so the matrix is tridiagonal. Press Next operation.`;
    draw();
  }

  // Advance to the next operation (skipping enter/leave markers).
  function next() {
    if (!gen) return begin();
    for (;;) {
      const r = gen.next();
      if (r.done) {
        finishHeatStep(s);
        gen = null;
        phase = 'done';
        cur = -1;
        reads = [];
        narr = `Step done in ${flops} flops (8m − 7 with m = ${m}): t = ${num(s.t)}. Next operation starts another step.`;
        return;
      }
      const e = r.value;
      if (e.t === 'enter') phase = e.kind;
      if (e.t !== 'op') continue;
      cur = e.row;
      reads = e.reads;
      const j = e.row + 1;
      if (e.op === 'eliminate') {
        elim = e.row;
        pivot = e.pivot;
        const cost = e.row === 0 ? 2 : e.row < m - 1 ? 6 : 5;
        flops += cost;
        lastVal = `c′ = ${num(e.cp)}, d′ = ${num(e.dp)}`;
        narr =
          e.row === 0
            ? `Row ${j}: divide by the diagonal entry ${num(e.pivot)}, so the row reads u₁ + c′u₂ = d′ (${cost} flops).`
            : `Row ${j}: subtract ${num(e.factor)} times row ${j - 1} to clear the entry left of the diagonal, then divide by the pivot ${num(e.pivot)} (${cost} flops).`;
      } else {
        back = e.row;
        uNew[j] = e.x;
        const cost = e.row === m - 1 ? 0 : 2;
        flops += cost;
        lastVal = `x = ${num(e.x)}`;
        narr = e.row === m - 1 ? `Back substitution starts at the bottom: the last row now reads u${sub(j)} = d′, so x = ${num(e.x)} (no arithmetic).` : `u${sub(j)} = d′ − c′ u${sub(j + 1)} = ${num(e.x)} (${cost} flops).`;
      }
      return;
    }
  }

  function finishAll() {
    if (!gen) begin();
    while (gen) next();
  }

  function tick(dtWall) {
    acc += dtWall * 2.5;
    while (acc >= 1) {
      acc -= 1;
      next();
      if (phase === 'done') {
        loop.pause();
        acc = 0;
        break;
      }
    }
    draw();
  }

  function draw() {
    drawMatrix();
    plot.render();
    rdPhase.set(phase === 'forward' ? 'forward elimination' : phase === 'back' ? 'back substitution' : phase === 'done' ? 'step done' : 'assembled');
    rdRow.set(cur >= 0 ? String(cur + 1) : '–');
    rdPiv.set(phase === 'forward' ? num(pivot) : '–');
    rdVal.set(lastVal);
    rdFl.set(`${flops} of ${total}`);
    rdT.set(num(s.t));
    if (f.status.textContent !== narr) f.status.textContent = narr;
  }

  function drawMatrix() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear();
    const top = 22;
    const S = Math.max(60, Math.min(H - top - 8, W * 0.58));
    const c = S / m;
    const x0 = 6;
    const y0 = top;
    const xr = x0 + S + 12;
    const wc = Math.max(20, (W - xr - 4) / 3);
    const fs = Math.max(9, Math.min(12, c * 0.48, wc * 0.26));
    const cellFs = Math.max(8, Math.min(12, c * 0.46));
    const digits = c >= 28 ? 2 : 1;
    ctx.font = `${fs}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pal.css('muted');
    ctx.fillText('matrix', x0 + S / 2, top / 2);
    ['c′', 'd′', 'x'].forEach((t, k) => ctx.fillText(t, xr + wc * (k + 0.5), top / 2));
    // read rows: a pale stripe
    for (const rr of reads) {
      ctx.fillStyle = pal.css('read', 0.16);
      ctx.fillRect(x0, y0 + rr * c, xr - x0 + 3 * wc, c);
    }
    for (let i = 0; i < m; i++) {
      for (let k = Math.max(0, i - 1); k <= Math.min(m - 1, i + 1); k++) {
        const x = x0 + k * c;
        const y = y0 + i * c;
        let fill = 'muted';
        let alpha = 0.28;
        let text = '';
        let gone = false;
        if (k === i - 1) {
          gone = i <= elim;
          text = num(s.lower[i], digits);
        } else if (k === i) {
          if (i <= elim) {
            fill = 's1';
            text = '1';
          } else text = num(s.diag[i], digits);
        } else {
          if (i >= back) gone = true;
          else if (i <= elim) {
            fill = 's1';
            text = num(s.cp[i], digits);
          } else text = num(s.upper[i], digits);
        }
        if (gone) {
          ctx.strokeStyle = pal.css('grid');
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1.5, y + 1.5, c - 3, c - 3);
          continue;
        }
        ctx.fillStyle = pal.css(fill, alpha);
        ctx.fillRect(x + 1, y + 1, c - 2, c - 2);
        if (c >= 18) {
          ctx.font = `${cellFs}px ${FONT}`;
          ctx.fillStyle = pal.css('ink');
          ctx.fillText(text, x + c / 2, y + c / 2);
          ctx.font = `${fs}px ${FONT}`;
        }
      }
      // working columns
      const y = y0 + i * c + c / 2;
      ctx.fillStyle = pal.css('ink');
      if (i <= elim) {
        ctx.fillText(num(s.cp[i], 2), xr + wc * 0.5, y);
        ctx.fillText(num(s.dp[i], 2), xr + wc * 1.5, y);
      }
      if (i >= back) ctx.fillText(num(s.sol[i], 2), xr + wc * 2.5, y);
    }
    // outline the matrix band and the current row
    ctx.strokeStyle = pal.css('muted', 0.6);
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, S - 1, S - 1);
    for (let k = 0; k < 3; k++) ctx.strokeRect(xr + wc * k + 2.5, y0 + 0.5, wc - 5, S - 1);
    if (cur >= 0) {
      ctx.strokeStyle = pal.css('write');
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x0 + 1, y0 + cur * c + 1, xr - x0 + 3 * wc - 4, c - 2);
    }
  }

  box.onResize(() => draw());
  begin();
  return () => {
    box.destroy();
    plot.destroy();
  };
}
