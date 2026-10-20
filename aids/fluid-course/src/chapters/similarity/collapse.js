// Figure similarity-collapse: a self-similar solution and its limits. The
// heat equation from a unit step (diffusion.js, Crank-Nicolson) has no
// length scale of its own, so plotted against eta = (x - 1/2)/sqrt(4 kappa t)
// every time collapses onto 1/2 erfc(eta). The grid spacing and the walls
// add two lengths, and the collapse holds only between them.

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, segmented, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createHeat, heatExact, step } from '../../sims/diffusion.js';
import { advanceToWidth, collapseDt, frontWidth, similarityGap, stepSimilarity } from '../../sims/ch-similarity-scales.js';

const S_END = 0.8;
const ETA = 3;
const PRESETS = {
  coarse: { n: 20, view: 'x', s: 0.03 },
  fine: { n: 200, view: 'eta', s: 0.04 },
  walls: { n: 100, view: 'x', s: 0.5 },
  default: { n: 100, view: 'eta', s: 0.016 },
};

// Gap between the exact solution on [0, 1] and the infinite-line similarity
// solution: the walls' share of the error, the same on every grid.
function wallCurve() {
  const xs = new Float64Array(201);
  for (let i = 0; i < xs.length; i++) xs[i] = i / (xs.length - 1);
  const out = new Float64Array(xs.length);
  const ss = [];
  const gaps = [];
  for (let k = 0; k <= 50; k++) {
    const s = 0.06 * (S_END / 0.06) ** (k / 50);
    heatExact('step', xs, (s * s) / 4, 1, out);
    let g = 0;
    for (let i = 0; i < xs.length; i++) g = Math.max(g, Math.abs(out[i] - stepSimilarity((xs[i] - 0.5) / s)));
    ss.push(s);
    gaps.push(g);
  }
  return { s: ss, gap: gaps };
}

// The whole run for one grid: a snapshot after every step until s = S_END.
function run(n) {
  const st = createHeat({ n, preset: 'step' });
  const len = st.len;
  const snaps = [];
  const ss = [];
  const gaps = [];
  const steps = [];
  while (frontWidth(st) < S_END) {
    const dt = collapseDt(st);
    if (frontWidth(st) > 0 && Math.sqrt(4 * (st.t + dt)) > S_END) advanceToWidth(st, S_END);
    else step(st, { scheme: 'cn', dt });
    snaps.push(Float64Array.from(st.u));
    ss.push(frontWidth(st));
    gaps.push(similarityGap(st));
    steps.push(st.steps);
  }
  return { n, len, x: Float64Array.from(st.x), dx: st.dx, snaps, s: ss, gap: gaps, steps };
}

export function mountSimilarityCollapse(fig, { signal }) {
  const P = { ...(PRESETS[fig.dataset.preset] || PRESETS.default) };
  const { stage, controls, readouts, status } = frame(fig, { title: 'One curve for every time', wide: true });
  stage.classList.add('cols');

  const walls = wallCurve();
  const fineX = new Float64Array(241);
  const fineY = new Float64Array(241);
  const etaX = new Float64Array(241);
  const etaY = new Float64Array(241);
  for (let i = 0; i < etaX.length; i++) {
    etaX[i] = -ETA + (2 * ETA * i) / (etaX.length - 1);
    etaY[i] = stepSimilarity(etaX[i]);
    fineX[i] = i / (fineX.length - 1);
  }

  let R = null;
  let k = 0;
  let nodeX = null;
  let nodeU = null;
  let guideS = null;
  let guideG = null;

  const prof = new Plot(stage, {
    x: { label: 'x', min: 0, max: 1 },
    y: { label: 'u', min: -0.05, max: 1.05 },
    aspect: 1.3,
    label: 'Temperature profile on the grid against the similarity solution',
  });
  const gapPlot = new Plot(stage, {
    x: { label: 'front width s = √(4κt)', min: 1e-3, max: 1, log: true, fmt: (v) => fmt(v, 3) },
    y: { label: 'largest gap from ½ erfc η', min: 1e-6, max: 0.3, log: true, fmt: (v) => sci(v, 2) },
    aspect: 1.3,
    label: 'Largest gap between the computed profile and the similarity solution, against front width, log axes',
  });

  slider(controls, { label: 'Grid intervals n', min: 10, max: 400, step: 10, value: P.n, fmt: (v) => String(Math.round(v)), onInput: (v) => setGrid(Math.round(v)) });
  segmented(controls, { label: 'Horizontal axis', options: [['x', 'x'], ['eta', 'η = (x − ½)/s']], value: P.view, onChange: (v) => ((P.view = v), drawAll()) });
  const sSl = slider(controls, { label: 'Front width s', min: 0.002, max: S_END, log: true, value: P.s, fmt: (v) => fmt(v, 3), onInput: (v) => ((P.s = v), show()) });

  const rS = readout(readouts, { label: 'front width s' });
  const rCells = readout(readouts, { label: 'cells across the front s/Δx' });
  const rSteps = readout(readouts, { label: 'time steps' });
  const rGap = readout(readouts, { label: 'largest gap from similarity' });
  const rWall = readout(readouts, { label: 'walls alone (exact vs similarity)' });

  const loop = animate(
    fig,
    (dt) => {
      const sMin = R.s[0];
      const rate = Math.log(S_END / sMin) / 7; // about 7 s end to end
      P.s = Math.min(S_END, P.s * Math.exp(rate * dt));
      sSl.set(P.s, { silent: true });
      show();
      if (P.s >= S_END) loop.pause();
    },
    { autoplay: false, signal },
  );
  const play = playButton(controls, loop);
  play.addEventListener('click', () => {
    if (loop.playing && P.s >= S_END * 0.999) {
      P.s = R.s[0];
      sSl.set(P.s, { silent: true });
    }
  });

  function setGrid(n) {
    P.n = n;
    R = run(n);
    nodeX = new Float64Array(R.len);
    nodeU = new Float64Array(R.len);
    sSl.input.min = String(Math.log10(R.s[0]));
    if (P.s < R.s[0]) P.s = R.s[0];
    sSl.set(P.s, { silent: true });
    // Reference slope: gap = C (dx/s)^2, with C from the run at s = 8 dx.
    let j = 0;
    while (j < R.s.length - 1 && R.s[j] < 8 * R.dx) j++;
    const C = R.gap[j] * (R.s[j] / R.dx) ** 2;
    guideS = [2 * R.dx, Math.min(0.3, 200 * R.dx)];
    guideG = guideS.map((s) => C * (R.dx / s) ** 2);
    drawAll();
  }

  function pick() {
    // last snapshot with s_k <= P.s (snapshots are in increasing s)
    let lo = 0;
    let hi = R.s.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (R.s[mid] <= P.s * (1 + 1e-9)) lo = mid;
      else hi = mid - 1;
    }
    k = lo;
  }

  function fillProfile() {
    const s = R.s[k];
    const u = R.snaps[k];
    for (let j = 0; j < R.len; j++) {
      nodeU[j] = u[j];
      nodeX[j] = P.view === 'eta' ? (R.x[j] - 0.5) / s : R.x[j];
    }
    for (let i = 0; i < fineX.length; i++) fineY[i] = stepSimilarity((fineX[i] - 0.5) / s);
  }

  function wallAt(s) {
    if (s < walls.s[0]) return 0;
    let i = 0;
    while (i < walls.s.length - 2 && walls.s[i + 1] < s) i++;
    const w = (Math.log(s) - Math.log(walls.s[i])) / (Math.log(walls.s[i + 1]) - Math.log(walls.s[i]));
    return Math.exp(Math.log(walls.gap[i] + 1e-300) * (1 - w) + Math.log(walls.gap[i + 1] + 1e-300) * w);
  }

  const markS = (ctx, tx, ty, area, pal) => {
    ctx.fillStyle = pal.css('muted', 0.13);
    ctx.fillRect(area.x0, area.y0, Math.max(0, tx(R.dx) - area.x0), area.y1 - area.y0);
    ctx.strokeStyle = pal.css('accent');
    ctx.lineWidth = 2;
    const x = tx(R.s[k]);
    ctx.beginPath();
    ctx.moveTo(x, area.y0);
    ctx.lineTo(x, area.y1);
    ctx.stroke();
    ctx.fillStyle = pal.css('muted');
    ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    if (tx(R.dx) - area.x0 > 40) ctx.fillText('s < Δx', area.x0 + 4, area.y1 - 4);
  };

  function drawAll() {
    pick();
    fillProfile();
    const eta = P.view === 'eta';
    prof.setAxes({ x: eta ? { label: 'η = (x − ½)/√(4κt)', min: -ETA, max: ETA } : { label: 'x', min: 0, max: 1 } });
    prof.draw([
      { x: eta ? etaX : fineX, y: eta ? etaY : fineY, color: 'ink', dash: [6, 4], width: 2, label: '½ erfc η (similarity)' },
      { x: nodeX, y: nodeU, color: 's1', width: 1.5, points: R.n <= 100 ? 3 : 0, label: `grid, n = ${R.n}` },
    ]);
    gapPlot.draw(
      [
        { x: R.s, y: R.gap, color: 's1', width: 2.2, label: `grid vs similarity (n = ${R.n})` },
        { x: walls.s, y: walls.gap, color: 's2', width: 2, dash: [7, 5], label: 'walls alone' },
        { x: guideS, y: guideG, color: 'muted', width: 1.5, dash: [2, 4], label: '∝ (Δx/s)²', hover: false },
      ],
      { extra: markS },
    );
    narrate();
  }

  function show() {
    const before = k;
    pick();
    if (k === before) return;
    fillProfile();
    prof.render();
    gapPlot.render();
    narrate();
  }

  function narrate() {
    const s = R.s[k];
    const cells = s / R.dx;
    const gap = R.gap[k];
    const wall = wallAt(s);
    rS.set(fmt(s, 3));
    rCells.set(fmt(cells, 3));
    rSteps.set(String(R.steps[k]));
    rGap.set(sci(gap, 2), gap < 1e-3 ? 'good' : gap > 1e-2 ? 'bad' : '');
    rWall.set(wall < 1e-7 ? 'below 10⁻⁷' : sci(wall, 2));
    if (cells < 3) {
      status.textContent = `Grid-dominated: the front is only ${fmt(cells, 2)} cells wide. The grid spacing is a length the problem did not have, and the profile misses the similarity curve by ${sci(gap, 2)}.`;
    } else if (wall > 0.3 * gap) {
      status.textContent = `Walls felt: at s = ${fmt(s, 2)} the front reaches the fixed ends of the rod, so the solution is no longer the infinite-line one. This part of the gap (${sci(wall, 2)}) is the same on every grid.`;
    } else {
      status.textContent = `Self-similar: plotted against η the profile sits on ½ erfc η to within ${sci(gap, 2)}. Each doubling of s/Δx cuts the gap about fourfold, until the walls take over.`;
    }
  }

  setGrid(P.n);
  return () => {
    prof.destroy();
    gapPlot.destroy();
  };
}
