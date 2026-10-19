// continuum-parcel: a fluid parcel keeps its mass but not its molecules.
// The equilibrium MD box of src/sims/molecules.js (400 WCA disks, periodic,
// at rest). At the start, the molecules inside a circle are tagged. The
// circle is a parcel of a fluid whose mean velocity is zero, so it stays
// put. The plot follows two counts against time: tagged molecules still
// inside (they wander off by self-diffusion) and all molecules inside (it
// only jitters around its start).

import { fmt } from '../../kit/dom.js';
import { frame, button, readout, playButton, canvasBox, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { palette } from '../../kit/palette.js';
import { createMD, mdStep, MD_PRESETS, MD_DEFAULTS } from '../../sims/molecules.js';
import { boxRect, drawMolecules, drawBoxFrame } from './md-view.js';

const R = 6; // parcel radius, molecular diameters
const T_END = 60; // τ of history
const NREC = 300;
const SPF = 8; // MD steps per frame

export function mountParcel(fig, { signal }) {
  const f = frame(fig, { title: 'A parcel keeps its mass, not its molecules' });
  f.stage.classList.add('cols');
  const box = canvasBox(f.stage, { aspect: 1.5, minHeight: 190, maxHeight: 380, label: 'A box of 400 soft disks at rest. The molecules that started inside the dashed circle are coloured; over time they wander out and others wander in.' });
  const plotWrap = document.createElement('div');
  f.stage.append(plotWrap);
  const plot = new Plot(plotWrap, {
    x: { label: 'time t (τ)', min: 0, max: T_END },
    y: { label: 'fraction of the starting count', min: 0, max: 1.3 },
    aspect: 1.4,
    label: 'Plot against time of the tagged molecules still inside the parcel and of all molecules inside it, as fractions of the starting count',
  });

  let md = null;
  const tag = new Uint8Array(MD_DEFAULTS.N);
  let n0 = 1;
  let cx = 0;
  let cy = 0;
  const recT = new Float64Array(NREC);
  const recTag = new Float64Array(NREC);
  const recAll = new Float64Array(NREC);
  let nRec = 0;
  let t0 = 0;
  let inTag = 0;
  let inAll = 0;
  const rect = { s: 1, x: 0, y: 0, w: 1, h: 1 };
  const oneX = [0, T_END];
  const oneY = [1, 1];

  function restart(seed) {
    md = createMD({ ...MD_PRESETS.equilibrium.params, seed });
    mdStep(md, 100); // loosen the initial lattice
    cx = md.Lx / 2;
    cy = md.Ly / 2;
    n0 = 0;
    for (let i = 0; i < md.N; i++) {
      const inside = (md.x[i] - cx) ** 2 + (md.y[i] - cy) ** 2 < R * R;
      tag[i] = inside ? 1 : 0;
      if (inside) n0++;
    }
    t0 = md.t;
    nRec = 0;
    count();
    record();
  }

  function count() {
    inTag = 0;
    inAll = 0;
    for (let i = 0; i < md.N; i++) {
      let dx = md.x[i] - cx;
      if (dx > md.Lx / 2) dx -= md.Lx;
      else if (dx < -md.Lx / 2) dx += md.Lx;
      let dy = md.y[i] - cy;
      if (dy > md.Ly / 2) dy -= md.Ly;
      else if (dy < -md.Ly / 2) dy += md.Ly;
      if (dx * dx + dy * dy < R * R) {
        inAll++;
        if (tag[i]) inTag++;
      }
    }
  }

  function record() {
    const t = md.t - t0;
    if (nRec >= NREC || (nRec > 0 && t < recT[nRec - 1] + T_END / NREC)) return;
    if (t > T_END) return;
    recT[nRec] = t;
    recTag[nRec] = inTag / n0;
    recAll[nRec] = inAll / n0;
    nRec++;
  }

  let seed = 1;
  button(f.controls, {
    label: 'Tag a new parcel',
    kind: 'ghost',
    onClick: () => {
      seed++;
      restart(seed);
      draw();
    },
  });
  const rTime = readout(f.readouts, { label: 'time t (τ)' });
  const rTag = readout(f.readouts, { label: 'tagged molecules still inside' });
  const rAll = readout(f.readouts, { label: 'all molecules inside' });

  function drawBox() {
    const { ctx, width: W, height: H } = box;
    const pal = palette();
    box.clear(pal.css('board'));
    boxRect(W, H, md.Lx, md.Ly, 4, rect);
    drawMolecules(ctx, rect, md, { r: 0.4, fill: pal.css('particle', 0.35), mask: tag, want: 0 });
    drawMolecules(ctx, rect, md, { r: 0.45, fill: pal.css('s1'), mask: tag, want: 1 });
    drawBoxFrame(ctx, rect, pal, false);
    ctx.strokeStyle = pal.css('accent');
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(rect.x + cx * rect.s, rect.y + rect.h - cy * rect.s, R * rect.s, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPlot() {
    plot.draw([
      { x: oneX, y: oneY, color: 'muted', dash: [3, 4], width: 1.5, label: 'start', hover: false, legend: false },
      { x: recT.subarray(0, nRec), y: recAll.subarray(0, nRec), color: 's2', dash: [7, 4], label: 'all molecules inside' },
      { x: recT.subarray(0, nRec), y: recTag.subarray(0, nRec), color: 's1', label: 'tagged molecules inside' },
    ]);
  }

  let lastStatus = '';
  function updateText() {
    const t = md.t - t0;
    rTime.set(fmt(t, 3));
    rTag.set(`${inTag} of ${n0}`);
    rAll.set(`${inAll} (started at ${n0})`);
    let s;
    if (t < 3) s = 'Every coloured molecule starts inside the parcel.';
    else if (t < T_END) s = `${Math.round((100 * (n0 - inTag)) / n0)}% of the original molecules have left, yet the parcel still holds about as many molecules as it started with.`;
    else s = 'The record is full. Tag a new parcel to watch again.';
    if (s !== lastStatus) {
      f.status.textContent = s;
      lastStatus = s;
    }
  }

  function draw() {
    drawBox();
    drawPlot();
    updateText();
  }

  restart(seed);
  box.onResize(drawBox);
  const loop = animate(
    fig,
    () => {
      mdStep(md, SPF);
      count();
      record();
      draw();
    },
    { signal },
  );
  playButton(f.controls, loop);
  draw();
  return () => {
    loop.destroy();
    box.destroy();
    plot.destroy();
  };
}
