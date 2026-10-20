// Figure: two rows of finite-volume buckets carrying the same law,
// q_t + (a(x) q)_x = 0 (cars on a ring road whose speed limit changes), one
// in flux form and one written with the product rule (or the advective
// form). The updates, the per-face send/receive bookkeeping and the exact
// solution all come from src/sims/ch-conservation.js (createFV, stepFV,
// faceLeak, exactFV); this file only draws them.

import { h, fmt, sci } from '../../kit/dom.js';
import { frame, select, segmented, button, readout, playButton, canvasBox, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { SPEED_PROFILES, createFV, resetFV, stepFV, massFV, faceLeak, exactFV } from '../../sims/ch-conservation.js';

const PRESETS = {
  leak: { n: 50, speed: 'zone', other: 'product', start: 'block' },
  fine: { n: 200, speed: 'zone', other: 'product', start: 'block' },
  wave: { n: 50, speed: 'wave', other: 'product', start: 'bump' },
  uniform: { n: 50, speed: 'uniform', other: 'product', start: 'block' },
  advective: { n: 50, speed: 'zone', other: 'advective', start: 'block' },
};

const OTHER_NAMES = { product: 'Product rule', advective: 'Advective form' };
const YMAX = { zone: 3.7, wave: 4.4, uniform: 1.25 };
const M = 360; // exact-solution samples
const HIST = 1200; // samples on the mass plot
const SECONDS_PER_PASS = 6;
const FLOOR = 1e-17;

export function mountConservationTelescoping(fig, ctx) {
  const preset = { ...(PRESETS[fig.dataset.preset] ?? PRESETS.leak) };
  const ui = frame(fig, { title: 'Buckets and fluxes: who keeps the books?', wide: true });

  let n = preset.n;
  let speed = preset.speed;
  let other = preset.other;
  let start = preset.start;
  let A = null; // flux form
  let B = null; // the other update
  let face = 0; // selected face j+½
  const xs = new Float64Array(M);
  const exA = new Float64Array(M);
  for (let k = 0; k < M; k++) xs[k] = (k + 0.5) / M;
  const hx = new Float64Array(HIST);
  const hA = new Float64Array(HIST);
  const hB = new Float64Array(HIST);
  let hn = 0;
  let acc = 0;
  let frameNo = 0;

  const cb = canvasBox(ui.stage, { aspect: 2, minHeight: 360, maxHeight: 440, label: 'Two rows of cells carrying the same traffic round a ring road: the top row uses the flux form, the bottom row the product rule. Dashed outlines show the exact solution; marks under the bottom row show mass made or lost at each face. Tap a face to inspect it.' });
  cb.canvas.tabIndex = 0;
  cb.canvas.style.touchAction = 'manipulation';
  const plotWrap = h('div');
  ui.stage.append(plotWrap);
  const plot = new Plot(plotWrap, {
    x: { label: 'passes round the road', min: 0, max: 3 },
    y: { label: '|change in total| / total', log: true, min: 1e-17, max: 1 },
    aspect: 2.6,
    minHeight: 170,
    maxHeight: 260,
    label: 'Relative change of the total amount against time, on a log scale, for both updates.',
  });

  // ---- controls ----
  const loop = animate(fig, tick, { signal: ctx.signal, autoplay: false });
  playButton(ui.controls, loop, { label: 'Drive' });
  button(ui.controls, { label: 'Step', onClick: () => (advance(1), draw(true)) });
  button(ui.controls, { label: 'Reset', onClick: () => (build(), draw(true)) });
  segmented(ui.controls, { label: 'Cells', options: [[25, '25'], [50, '50'], [100, '100'], [200, '200']], value: n, onChange: (v) => ((n = Number(v)), build(), draw(true)) });
  select(ui.controls, {
    label: 'Road',
    options: Object.entries(SPEED_PROFILES).map(([k, s]) => [k, s.name]),
    value: speed,
    onChange: (v) => ((speed = v), build(), draw(true)),
  });
  select(ui.controls, {
    label: 'Bottom row',
    options: [['product', 'Product rule (non-conservative)'], ['advective', 'Advective form (another law)']],
    value: other,
    onChange: (v) => ((other = v), build(), draw(true)),
  });
  select(ui.controls, {
    label: 'Start',
    options: [['block', 'Block of cars'], ['bump', 'Smooth bump']],
    value: start,
    onChange: (v) => ((start = v), build(), draw(true)),
  });

  const rTime = readout(ui.readouts, { label: 'Passes round the road' });
  const rA = readout(ui.readouts, { label: 'Total, flux form' });
  const rB = readout(ui.readouts, { label: 'Total, bottom row' });
  const rFace = readout(ui.readouts, { label: 'Selected face' });
  const rSend = readout(ui.readouts, { label: 'Bottom row: left cell sends' });
  const rRecv = readout(ui.readouts, { label: 'Bottom row: right cell receives' });

  function build() {
    A = createFV(n, { speed, start });
    B = createFV(n, { speed, start });
    hn = 0;
    acc = 0;
    record();
    // Default selected face: the entrance to the slow zone (or a steep spot).
    face = Math.min(n - 1, Math.max(0, Math.round((speed === 'wave' ? 0.12 : 0.35) * n) - 1));
    plot.setAxes({ x: { max: 3 } });
  }

  function record() {
    if (hn >= HIST) {
      // Keep every other sample and carry on: the plot stays bounded.
      for (let k = 0; k < HIST / 2; k++) {
        hx[k] = hx[2 * k];
        hA[k] = hA[2 * k];
        hB[k] = hB[2 * k];
      }
      hn = HIST / 2;
    }
    const pass = A.t / A.period;
    hx[hn] = pass;
    hA[hn] = Math.max(FLOOR, Math.abs(massFV(A) / A.mass0 - 1));
    hB[hn] = Math.max(FLOOR, Math.abs(massFV(B) / B.mass0 - 1));
    hn++;
  }

  function advance(k) {
    for (let s = 0; s < k; s++) {
      stepFV(A, 'conservative');
      stepFV(B, other);
    }
    record();
  }

  function tick(dt) {
    const stepsPerPass = A.period / A.dt;
    acc += (dt * stepsPerPass) / SECONDS_PER_PASS;
    let k = Math.floor(acc);
    acc -= k;
    if (k > 8) k = 8;
    if (k > 0) advance(k);
    frameNo++;
    draw(frameNo % 4 === 0);
    if (A.t / A.period >= 3) {
      loop.pause();
      draw(true);
    }
  }

  // ---- drawing ----
  const LAYOUT = { pad: 8, label: 16 };
  const L = { s0: 0, speedH: 0, r1: 0, r2: 0, rowH: 0, leak: 0, leakH: 18 };
  function layout() {
    const H = cb.height;
    const gap = 8;
    L.s0 = LAYOUT.pad;
    L.speedH = Math.round(0.12 * H);
    L.rowH = Math.round((H - 2 * LAYOUT.pad - L.speedH - 2 * gap - 2 * LAYOUT.label - 3 - L.leakH - 14) / 2);
    L.r1 = L.s0 + L.speedH + gap + LAYOUT.label;
    L.r2 = L.r1 + L.rowH + gap + LAYOUT.label;
    L.leak = L.r2 + L.rowH + 3;
  }

  function draw(withPlot) {
    const pal = palette();
    const c = cb.ctx;
    const W = cb.width;
    cb.clear(pal.css('board'));
    if (L.rowH === 0) layout();
    const x0 = LAYOUT.pad;
    const w = W - 2 * LAYOUT.pad;
    const X = (x) => x0 + x * w;
    c.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    c.textBaseline = 'top';

    // Speed strip: a(x), filled.
    const amax = A.amax;
    c.fillStyle = pal.css('muted', 0.28);
    c.strokeStyle = pal.css('muted');
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(X(0), L.s0 + L.speedH);
    for (let k = 0; k <= 160; k++) {
      const x = k / 160;
      c.lineTo(X(x), L.s0 + L.speedH - (A.a(x) / amax) * (L.speedH - 2));
    }
    c.lineTo(X(1), L.s0 + L.speedH);
    c.closePath();
    c.fill();
    c.fillStyle = pal.css('muted');
    c.textAlign = 'left';
    c.fillText('speed limit a(x)', X(0) + 4, L.s0 + 1);

    const ymax = YMAX[speed];
    exactFV(A, xs, exA);
    drawRow(c, pal, A, L.r1, L.rowH, ymax, X, w, 's1', 'flux form: each face has one flux');
    drawRow(c, pal, B, L.r2, L.rowH, ymax, X, w, 's2', `${OTHER_NAMES[other].toLowerCase()}: each cell keeps its own books`);

    // Leak marks under the bottom row: amount made (up) or destroyed (down)
    // at each face in the last step, scaled to the largest.
    let big = 1e-300;
    for (let j = 0; j < n; j++) big = Math.max(big, Math.abs(faceLeak(B, j)));
    const mid = L.leak + L.leakH / 2;
    c.strokeStyle = pal.css('line');
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(X(0), mid + 0.5);
    c.lineTo(X(1), mid + 0.5);
    c.stroke();
    c.fillStyle = pal.css('muted');
    c.textAlign = 'right';
    c.textBaseline = 'top';
    c.fillText('bottom row: cars made ↑ or lost ↓ at each face', X(1) - 2, L.leak + L.leakH + 1);
    if (big > 1e-12 * A.dx) {
      c.fillStyle = pal.css('accent');
      const bw = Math.max(1.5, Math.min(4, (0.5 * w) / n));
      for (let j = 0; j < n; j++) {
        const v = faceLeak(B, j) / big;
        const hh = v * (L.leakH / 2 - 1);
        const px = X((j + 1) / n);
        if (hh > 0) c.fillRect(px - bw / 2, mid - hh, bw, hh);
        else c.fillRect(px - bw / 2, mid, bw, -hh);
      }
    }

    // Selected face.
    const fx = X((face + 1) / n);
    c.strokeStyle = pal.css('ink', 0.7);
    c.setLineDash([3, 3]);
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(fx + 0.5, L.r1 - 4);
    c.lineTo(fx + 0.5, L.leak + L.leakH);
    c.stroke();
    c.setLineDash([]);

    // Numbers.
    const pass = A.t / A.period;
    rTime.set(pass.toFixed(2));
    const dA = massFV(A) / A.mass0 - 1;
    const dB = massFV(B) / B.mass0 - 1;
    rA.set(signedPct(dA), Math.abs(dA) < 1e-12 ? 'good' : 'bad');
    rB.set(signedPct(dB), Math.abs(dB) > 1e-3 ? 'bad' : 'good');
    rFace.set(`j + ½ = ${face + 1} of ${n} (x = ${fmt((face + 1) / n, 3)})`);
    if (B.steps > 0) {
      rSend.set(fmt(B.send[face] * B.dx, 4));
      rRecv.set(fmt(B.recv[face] * B.dx, 4) + (Math.abs(faceLeak(B, face)) > 1e-15 ? `  (${faceLeak(B, face) > 0 ? '+' : '−'}${fmt(Math.abs(faceLeak(B, face)), 2)})` : ''));
    } else {
      rSend.set('press Step');
      rRecv.set('press Step');
    }
    if (B.steps === 0) ui.status.textContent = 'Same road, same start, same cells. Press Drive or Step.';
    else if (speed === 'uniform') ui.status.textContent = 'Constant speed: the two updates are the same arithmetic, and both keep every car.';
    else if (other === 'advective') ui.status.textContent = `The advective form moves values, not amounts: so far its total has swung by up to ${fmt(peakB() * 100, 2)}% as the cars pass the slow zone. It is a different law.`;
    else ui.status.textContent = `After ${pass.toFixed(2)} passes the product rule has ${dB > 0 ? 'made' : 'lost'} ${fmt(Math.abs(dB) * 100, 3)}% of the cars; the flux form is out by ${sci(Math.max(Math.abs(dA), 1e-17), 1)} (round-off).`;

    if (withPlot) {
      plot.draw(
        [
          { x: hx.subarray(0, hn), y: hA.subarray(0, hn), color: 's1', label: 'flux form' },
          { x: hx.subarray(0, hn), y: hB.subarray(0, hn), color: 's2', dash: [6, 4], label: OTHER_NAMES[other].toLowerCase() },
        ],
        {
          under: (cc, tx, ty, area, p) => {
            const y = ty(2.2e-16);
            cc.strokeStyle = p.css('muted');
            cc.setLineDash([2, 4]);
            cc.lineWidth = 1;
            cc.beginPath();
            cc.moveTo(area.x0, y);
            cc.lineTo(area.x1, y);
            cc.stroke();
            cc.setLineDash([]);
            cc.fillStyle = p.css('muted');
            cc.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
            cc.textAlign = 'right';
            cc.textBaseline = 'bottom';
            cc.fillText('round-off (ε ≈ 2.2 × 10⁻¹⁶)', area.x1 - 4, y - 2);
          },
        },
      );
    }
  }

  // Peak of the bottom row's relative change so far.
  function peakB() {
    let m = 0;
    for (let k = 0; k < hn; k++) m = Math.max(m, hB[k]);
    return m;
  }

  function signedPct(d) {
    if (d === 0) return '0 (exactly)';
    if (Math.abs(d) < 1e-9) return `${d < 0 ? '−' : '+'}${sci(Math.max(Math.abs(d), 1e-17), 1)} (round-off)`;
    return `${d > 0 ? '+' : '−'}${fmt(Math.abs(d) * 100, 3)}%`;
  }

  function drawRow(c, pal, S, top, hgt, ymax, X, w, color, label) {
    const base = top + hgt;
    c.fillStyle = pal.css('ink');
    c.textAlign = 'left';
    c.fillText(label, X(0) + 2, top - LAYOUT.label + 2);
    // Cell walls (light), bars.
    const cw = w / S.n;
    c.fillStyle = pal.css(color, 0.75);
    for (let j = 0; j < S.n; j++) {
      const v = Math.min(S.q[j], ymax * 1.02);
      const hh = (v / ymax) * hgt;
      c.fillRect(X(j / S.n) + (cw > 6 ? 0.5 : 0), base - hh, Math.max(0.8, cw - (cw > 6 ? 1 : 0)), hh);
    }
    c.strokeStyle = pal.css('line');
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(X(0), base + 0.5);
    c.lineTo(X(1), base + 0.5);
    if (cw > 5) {
      for (let j = 0; j <= S.n; j++) {
        const px = Math.round(X(j / S.n)) + 0.5;
        c.moveTo(px, base);
        c.lineTo(px, base - 4);
      }
    }
    c.stroke();
    // Exact solution outline.
    c.strokeStyle = pal.css('ink');
    c.lineWidth = 1.4;
    c.setLineDash([5, 3]);
    c.beginPath();
    for (let k = 0; k < M; k++) {
      const v = Math.min(exA[k], ymax * 1.02);
      const px = X(xs[k]);
      const py = base - (v / ymax) * hgt;
      if (k === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
    c.setLineDash([]);
  }

  // ---- interaction: tap a face ----
  cb.canvas.addEventListener('pointerdown', (e) => {
    const p = cb.pointer(e);
    const x = (p.x - LAYOUT.pad) / (cb.width - 2 * LAYOUT.pad);
    face = Math.min(n - 1, Math.max(0, Math.round(x * n) - 1));
    draw(false);
  });
  cb.canvas.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') face = (face + n - 1) % n;
    else if (e.key === 'ArrowRight') face = (face + 1) % n;
    else return;
    e.preventDefault();
    draw(false);
  });
  cb.onResize(() => (layout(), draw(true)));

  build();
  draw(true);
  return () => {
    loop.destroy();
    cb.destroy();
    plot.destroy();
  };
}
