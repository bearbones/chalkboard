// lattice-particles-collide: one lattice-Boltzmann step taken apart. A 3 x 3
// periodic D2Q9 lattice (lbm.js createLBM); every node starts at rest except
// the middle one, which holds a moving equilibrium plus a deliberate
// non-equilibrium part (a shear stress and a normal stress, neither of which
// changes its density or momentum). Collide relaxes every node a fraction
// 1/tau of the way to its own equilibrium (lbm.js collide); Stream moves each
// population one node along its velocity (lbm.js stream). The arrows are
// f_q / w_q, so a node at rest has nine equal arrows. The equilibrium
// f_q^eq / w_q of the node's current density and velocity is drawn as open
// rings where each arrow would end (a dashed circle for the rest population).
//
// data-preset: '' (tau = 0.8), 'overshoot' (tau = 0.55: the non-equilibrium
// part flips sign at each collision), 'slow' (tau = 2).

import { frame, slider, button, readout, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { D2Q9, createLBM, initEquilibrium, setCollision, collide, stream, equilibrium } from '../../sims/lbm.js';
import { fmtTau } from './common.js';

const { cx: CX, cy: CY, w: WQ } = D2Q9;
const U0 = [0.12, 0.05]; // velocity of the middle node
const A_SHEAR = 0.012, A_NORMAL = 0.008; // non-equilibrium amplitudes

export function mountCollide(fig) {
  const preset = fig.dataset.preset || '';
  const tau0 = preset === 'overshoot' ? 0.55 : preset === 'slow' ? 2 : 0.8;
  const f = frame(fig, { title: 'Collide, then stream' });
  const L = createLBM({ nx: 3, ny: 3, tau: tau0 });
  const N = 9, MID = 4;
  const feq = new Float64Array(9);
  let phase = 'start', lastRatio = NaN, nColl = 0, nStr = 0;

  function reset() {
    initEquilibrium(L, { ux: (x, y, i, j) => (i === 1 && j === 1 ? U0[0] : 0), uy: (x, y, i, j) => (i === 1 && j === 1 ? U0[1] : 0) });
    // shear: + on NE, SW; - on NW, SE. normal: + on E, W; - on N, S.
    const F = L.f;
    F[5 * N + MID] += A_SHEAR;
    F[7 * N + MID] += A_SHEAR;
    F[6 * N + MID] -= A_SHEAR;
    F[8 * N + MID] -= A_SHEAR;
    F[1 * N + MID] += A_NORMAL;
    F[3 * N + MID] += A_NORMAL;
    F[2 * N + MID] -= A_NORMAL;
    F[4 * N + MID] -= A_NORMAL;
    L.macroT = -1;
    phase = 'start';
    lastRatio = NaN;
    nColl = nStr = 0;
  }

  // moments and non-equilibrium size of node c
  function node(c) {
    const F = L.f;
    let rho = 0, jx = 0, jy = 0;
    for (let q = 0; q < 9; q++) {
      const v = F[q * N + c];
      rho += v;
      jx += v * CX[q];
      jy += v * CY[q];
    }
    const ux = jx / rho, uy = jy / rho;
    equilibrium(rho, ux, uy, feq);
    let neq = 0;
    for (let q = 0; q < 9; q++) neq += Math.abs(F[q * N + c] - feq[q]);
    return { rho, ux, uy, neq };
  }

  // ---- view
  const box = canvasBox(f.stage, { aspect: 1.25, minHeight: 260, maxHeight: 420, label: 'Three by three lattice of nodes, each with nine arrows whose lengths are its populations; small rings mark the equilibrium lengths each node relaxes towards.' });
  function draw() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    const cell = Math.min(W, H) / 3.1;
    const ox = (W - 3 * cell) / 2, oy = (H - 3 * cell) / 2;
    const unit = cell * 0.26; // arrow length of f_q = w_q
    // lattice lines
    ctx.strokeStyle = pal.css('grid');
    ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + (k + 0.5) * cell);
      ctx.lineTo(ox + 3 * cell, oy + (k + 0.5) * cell);
      ctx.moveTo(ox + (k + 0.5) * cell, oy);
      ctx.lineTo(ox + (k + 0.5) * cell, oy + 3 * cell);
      ctx.stroke();
    }
    for (let j = 0; j < 3; j++) {
      for (let i = 0; i < 3; i++) {
        const c = i + j * 3;
        const X = ox + (i + 0.5) * cell, Y = oy + (2.5 - j) * cell;
        const nd = node(c);
        const mid = c === MID;
        // equilibrium: an open ring where each arrow would end at f^eq
        ctx.strokeStyle = pal.css('ink', 0.7);
        ctx.lineWidth = 1.2;
        for (let q = 1; q < 9; q++) {
          const n = Math.hypot(CX[q], CY[q]), len = (feq[q] / WQ[q]) * unit;
          ctx.beginPath();
          ctx.arc(X + (CX[q] / n) * len, Y - (CY[q] / n) * len, 3.2, 0, 2 * Math.PI);
          ctx.stroke();
        }
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(X, Y, Math.max(1, (feq[0] / WQ[0]) * unit * 0.35), 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
        // populations
        const col = mid ? 's1' : 's3';
        ctx.strokeStyle = pal.css(col);
        ctx.fillStyle = pal.css(col);
        ctx.lineWidth = 2.2;
        for (let q = 1; q < 9; q++) {
          const v = L.f[q * N + c] / WQ[q];
          const len = Math.max(0, v) * unit;
          const n = Math.hypot(CX[q], CY[q]);
          arrowTo(ctx, X, Y, X + (CX[q] / n) * len, Y - (CY[q] / n) * len);
        }
        ctx.beginPath();
        ctx.arc(X, Y, Math.max(1.5, (L.f[c] / WQ[0]) * unit * 0.35), 0, 2 * Math.PI);
        ctx.globalAlpha = 0.35;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.stroke();
        // velocity of the node
        if (Math.hypot(nd.ux, nd.uy) > 1e-4) {
          ctx.strokeStyle = pal.css('accent');
          ctx.fillStyle = pal.css('accent');
          ctx.lineWidth = 2.5;
          const s = cell * 2.4;
          arrowTo(ctx, X, Y, X + nd.ux * s, Y - nd.uy * s);
        }
      }
    }
    ctx.fillStyle = pal.css('muted');
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`after ${nColl} collision${nColl === 1 ? '' : 's'}, ${nStr} stream${nStr === 1 ? '' : 's'}`, 6, 6);
  }
  box.onResize(draw);

  // ---- readouts
  const ro = {
    rho: readout(f.readouts, { label: 'ρ (middle)', fmt: (v) => v.toFixed(4), title: 'Density of the middle node: the sum of its nine populations' }),
    u: readout(f.readouts, { label: 'u (middle)', title: 'Velocity of the middle node: momentum over density' }),
    neq: readout(f.readouts, { label: 'Σ|f − f^eq|', fmt: (v) => v.toExponential(2), title: 'Size of the middle node’s non-equilibrium part' }),
    ratio: readout(f.readouts, { label: 'last collision ×', fmt: (v) => (Number.isFinite(v) ? v.toFixed(3) : '–'), title: 'Measured factor by which the last collision multiplied each f − f^eq of the middle node' }),
    pred: readout(f.readouts, { label: '1 − 1/τ', fmt: (v) => v.toFixed(3), title: 'BGK prediction for that factor' }),
  };
  function report() {
    const nd = node(MID);
    ro.rho.set(nd.rho);
    ro.u.set(`(${nd.ux.toFixed(3)}, ${nd.uy.toFixed(3)})`);
    ro.neq.set(nd.neq);
    ro.ratio.set(lastRatio, Number.isFinite(lastRatio) && lastRatio < 0 ? 'bad' : '');
    ro.pred.set(1 - 1 / L.tau);
    const msg = {
      start: 'The middle node moves to the right and carries some stress (arrow tips off their equilibrium rings). Press Collide.',
      collide: `Collide: each population moved 1/τ = ${(1 / L.tau).toFixed(2)} of the way to its equilibrium ring. Density and velocity did not change.${L.tau < 1 ? ' With τ < 1 it overshoots: the non-equilibrium part changes sign.' : ''}`,
      stream: 'Stream: every population hopped one node along its arrow (the lattice wraps round). The middle node’s momentum has spread to its neighbours, which are now out of equilibrium too.',
    }[phase];
    f.status.textContent = msg;
  }
  function doCollide() {
    // f - feq of the middle node, before and after, along the shear pattern
    const before = L.f[5 * N + MID] - (node(MID), feq[5]);
    collide(L);
    const after = L.f[5 * N + MID] - (node(MID), feq[5]);
    lastRatio = Math.abs(before) > 1e-12 ? after / before : NaN;
    phase = 'collide';
    nColl++;
    draw();
    report();
  }
  function doStream() {
    stream(L);
    phase = 'stream';
    nStr++;
    draw();
    report();
  }
  button(f.controls, { label: 'Collide', kind: 'primary', onClick: doCollide });
  button(f.controls, { label: 'Stream', onClick: doStream });
  button(f.controls, { label: 'Reset', onClick: () => (reset(), draw(), report()) });
  slider(f.controls, {
    label: 'Relaxation time τ',
    min: 0.51,
    max: 2.5,
    step: 0.01,
    value: tau0,
    fmt: fmtTau,
    onInput: (v) => {
      setCollision(L, { tau: v });
      report();
    },
  });

  reset();
  draw();
  report();
  return () => box.destroy();
}

function seg(ctx, x0, y0, x1, y1) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function arrowTo(ctx, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (len < 1) return;
  seg(ctx, x0, y0, x1, y1);
  const hl = Math.min(7, len * 0.4), ux = dx / len, uy = dy / len;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - hl * ux + hl * 0.5 * uy, y1 - hl * uy - hl * 0.5 * ux);
  ctx.lineTo(x1 - hl * ux - hl * 0.5 * uy, y1 - hl * uy + hl * 0.5 * ux);
  ctx.closePath();
  ctx.fill();
}
