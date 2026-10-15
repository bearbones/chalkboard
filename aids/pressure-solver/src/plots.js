// Convergence plots, drawn on small canvases in the same chalk palette.

import { css } from './board.js';

const METHOD_NAME = { bicgstab: 'BiCGStab + V-cycle', vcycle: 'V-cycles alone', jacobi: 'Jacobi alone' };

function setup(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const W = Math.max(1, Math.round(r.width * dpr)),
    H = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g, w: r.width, h: r.height };
}

function frame(g, w, h, pal, box, { xTicks, yTicks, xLabel }) {
  g.clearRect(0, 0, w, h);
  g.font = '11px "JetBrains Mono", ui-monospace, monospace';
  g.textBaseline = 'middle';
  g.strokeStyle = css(pal.grid);
  g.fillStyle = css(pal.ink, 0.6);
  g.lineWidth = 1;
  for (const [v, label] of yTicks) {
    const y = box.y(v);
    g.beginPath();
    g.moveTo(box.x0, y);
    g.lineTo(box.x1, y);
    g.stroke();
    g.textAlign = 'right';
    g.fillText(label, box.x0 - 5, y);
  }
  g.textAlign = 'center';
  g.textBaseline = 'top';
  for (const [v, label] of xTicks) g.fillText(label, box.x(v), box.y1 + 4);
  g.fillText(xLabel, (box.x0 + box.x1) / 2, box.y1 + 17);
}

function makeBox(w, h, xr, yr) {
  const x0 = 46,
    x1 = w - 10,
    y0 = 10,
    y1 = h - 34;
  return {
    x0,
    x1,
    y0,
    y1,
    x: (v) => x0 + ((v - xr[0]) / (xr[1] - xr[0])) * (x1 - x0),
    y: (v) => y1 - ((Math.min(yr[1], Math.max(yr[0], v)) - yr[0]) / (yr[1] - yr[0])) * (y1 - y0),
  };
}

function dashedLevel(g, box, y, color, label) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.setLineDash([5, 4]);
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(box.x0, box.y(y));
  g.lineTo(box.x1, box.y(y));
  g.stroke();
  g.textAlign = 'right';
  g.textBaseline = 'bottom';
  g.fillText(label, box.x1, box.y(y) - 2);
  g.restore();
}

// log₁₀ max|R| per Newton iteration, this transaction bold and recent ones faint.
export function drawNewton(canvas, pal, current, past, tol) {
  const { g, w, h } = setup(canvas);
  const all = [current, ...past];
  let maxIt = 4;
  for (const hist of all) maxIt = Math.max(maxIt, hist.length - 1);
  let top = 0;
  for (const hist of all) for (const pt of hist) if (isFinite(pt.maxR) && pt.maxR > 0) top = Math.max(top, Math.ceil(Math.log10(pt.maxR)));
  const yr = [-11, Math.max(0, top)];
  const box = makeBox(w, h, [0, maxIt], yr);
  const yTicks = [];
  for (let v = yr[0] + 1; v <= yr[1]; v += 2) yTicks.push([v, `1e${v}`]);
  const xTicks = [];
  const step = maxIt > 12 ? 5 : 1;
  for (let k = 0; k <= maxIt; k += step) xTicks.push([k, String(k)]);
  frame(g, w, h, pal, box, { xTicks, yTicks, xLabel: 'Newton iteration' });
  g.font = '11px "JetBrains Mono", ui-monospace, monospace';
  dashedLevel(g, box, Math.log10(tol), css(pal.accent), 'tolerance 1e-9');

  const line = (hist, color, width, dots) => {
    const pts = hist.filter((p) => isFinite(p.maxR) && p.maxR > 0);
    if (!pts.length) return;
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.beginPath();
    pts.forEach((p, k) => (k ? g.lineTo : g.moveTo).call(g, box.x(p.iter), box.y(Math.log10(p.maxR))));
    g.stroke();
    if (!dots) return;
    for (const p of pts) {
      g.beginPath();
      g.arc(box.x(p.iter), box.y(Math.log10(p.maxR)), 3.2, 0, 2 * Math.PI);
      g.fill();
      if (p.alpha != null && p.alpha < 1) {
        g.save();
        g.fillStyle = css(pal.accent);
        g.textAlign = 'left';
        g.textBaseline = 'bottom';
        g.fillText(`α=${p.alpha >= 1 / 64 ? '1/' + Math.round(1 / p.alpha) : p.alpha.toExponential(0)}`, box.x(p.iter) + 4, box.y(Math.log10(p.maxR)) - 3);
        g.restore();
      }
    }
  };
  past.forEach((hist, k) => line(hist, css(pal.ink, 0.12 + 0.06 * (past.length - k)), 1.2, false));
  line(current, css(pal.write), 2.2, true);
}

// Linear relative residual vs work, live run bold, all three methods as ghosts.
export function drawLinear(canvas, pal, live, liveMethod, ghosts, eta) {
  const { g, w, h } = setup(canvas);
  const X = (work) => Math.log10(1 + work);
  const xr = [0, Math.log10(1 + 3000)];
  const yr = [-3, 0.5];
  const box = makeBox(w, h, xr, yr);
  const xTicks = [0, 1, 10, 100, 1000].map((v) => [X(v), String(v)]);
  const yTicks = [
    [0, '1'],
    [-1, '0.1'],
    [-2, '0.01'],
    [-3, '1e-3'],
  ];
  frame(g, w, h, pal, box, { xTicks, yTicks, xLabel: 'work, in fine-grid passes (log scale)' });
  g.font = '11px "JetBrains Mono", ui-monospace, monospace';
  dashedLevel(g, box, Math.log10(eta), css(pal.accent), `η = ${eta}`);
  if (!live) {
    g.fillStyle = css(pal.ink, 0.55);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('waiting for the first linear solve', (box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
    return [];
  }
  const path = (pts, color, width, dash) => {
    g.save();
    g.strokeStyle = color;
    g.lineWidth = width;
    g.setLineDash(dash || []);
    g.beginPath();
    pts.forEach((p, k) => (k ? g.lineTo : g.moveTo).call(g, Math.min(box.x1, box.x(X(p.work))), box.y(Math.log10(Math.max(1e-30, p.rel)))));
    g.stroke();
    g.restore();
  };
  const summary = [];
  if (ghosts) {
    for (const m of ['jacobi', 'vcycle', 'bicgstab']) {
      const gh = ghosts[m];
      if (!gh) continue;
      if (gh.pts.length > 1) path(gh.pts, m === liveMethod ? css(pal.write, 0.4) : css(pal.ink, 0.38), 1.4, [4, 3]);
      const unit = m === 'jacobi' ? 'sweep' : 'iteration';
      summary.push({ method: m, live: m === liveMethod, text: `${METHOD_NAME[m]}: ${gh.iterations} ${unit}${gh.iterations === 1 ? '' : 's'}${gh.ok ? '' : ', gave up'}` });
    }
  }
  path(live, css(pal.write), 2.4);
  g.fillStyle = css(pal.write);
  for (const p of live) {
    g.beginPath();
    g.arc(Math.min(box.x1, box.x(X(p.work))), box.y(Math.log10(Math.max(1e-30, p.rel))), 2.8, 0, 2 * Math.PI);
    g.fill();
  }
  return summary;
}

// One column per interval: bar height = Newton iterations, pink ticks = rejected attempts.
export function drawTimeline(canvas, pal, intervals) {
  const { g, w, h } = setup(canvas);
  g.clearRect(0, 0, w, h);
  const n = Math.max(30, intervals.length);
  const shown = intervals.slice(-n);
  const bw = w / n;
  const maxN = Math.max(6, ...shown.map((r) => r.newton));
  const base = h - 4;
  for (let k = 0; k < shown.length; k++) {
    const r = shown[k];
    const x = k * bw;
    const bh = ((h - 18) * r.newton) / maxN;
    g.fillStyle = css(pal.ink, 0.55);
    g.fillRect(x + bw * 0.18, base - bh, bw * 0.64, bh);
    for (let a = 1; a < r.attempt; a++) {
      g.fillStyle = css(pal.accent);
      g.fillRect(x + bw * 0.18, base - bh - 4 * a, bw * 0.64, 2.5);
    }
  }
  g.strokeStyle = css(pal.grid);
  g.beginPath();
  g.moveTo(0, base + 0.5);
  g.lineTo(w, base + 0.5);
  g.stroke();
}
