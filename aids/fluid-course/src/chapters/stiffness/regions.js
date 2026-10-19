// stiffness-regions: stability regions in the complex z = h lambda plane for
// six ODE methods, with the method-of-lines eigenvalues of the heat equation
// placed on them. Refining the grid or lengthening the step pushes the
// stiffest eigenvalue out of the region of an explicit method.

import { frame, slider, select, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { STABILITY_METHODS, stabilityAbs, stabilityGrid, boundaryLocus, maxStableStep, heatEigenvalues, stiffnessRatio } from '../../sims/stiff.js';
import { presetFor, num } from './common.js';

const PRESETS = {
  default: { method: 'euler', v: 4, h: 0.0019 },
  euler: { method: 'euler', v: 4, h: 0.0019 },
  refine: { method: 'euler', v: 5, h: 0.0019 },
  rk4: { method: 'rk4', v: 4, h: 0.0019 },
  implicit: { method: 'implicit-euler', v: 6, h: 0.01 },
  trapezoid: { method: 'trapezoid', v: 6, h: 0.01 },
  bdf2: { method: 'bdf2', v: 6, h: 0.01 },
};
const METHODS = ['euler', 'heun', 'rk4', 'implicit-euler', 'trapezoid', 'bdf2'].map((k) => [k, STABILITY_METHODS[k].name]);
const NMAX = 128;
const NS = 300;
const GW = 200;

export function mountRegions(fig) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Stability regions and the heat equation’s eigenvalues', wide: true });
  f.stage.classList.add('cols');
  const left = document.createElement('div');
  const right = document.createElement('div');
  f.stage.append(left, right);
  const plane = new Plot(left, {
    x: { label: 'Re z, z = hλ', min: -4.6, max: 1.4 },
    y: { label: 'Im z', min: -3.1, max: 3.1 },
    equal: true,
    hover: false,
    aspect: 1.15,
    label: 'Stability region of the chosen method in the complex plane, with the scaled heat-equation eigenvalues on the negative real axis',
  });
  const axis = new Plot(right, {
    x: { label: 'h|λ| along the negative real axis', log: true, min: 1e-4, max: 1e5 },
    y: { label: '|R| per step', log: true, min: 1e-6, max: 1e2 },
    aspect: 1.15,
    label: 'Growth factor |R| per step along the negative real axis, with each heat mode marked',
  });

  // preallocated arrays
  const lam = new Float64Array(NMAX - 1);
  const ZERO = new Float64Array(NMAX - 1);
  const EIN = new Float64Array(NMAX - 1);
  const EOUT = new Float64Array(NMAX - 1);
  const PXI = new Float64Array(NMAX - 1);
  const PYI = new Float64Array(NMAX - 1);
  const PXO = new Float64Array(NMAX - 1);
  const PYO = new Float64Array(NMAX - 1);
  const SX = new Float64Array(NS);
  const SR = new Float64Array(NS);
  const SE = new Float64Array(NS);
  for (let k = 0; k < NS; k++) {
    SX[k] = 10 ** (-4 + (9 * k) / (NS - 1));
    SE[k] = Math.exp(-SX[k]);
  }
  const loci = new Map();
  const locus = (m) => (loci.has(m) || loci.set(m, boundaryLocus(m, 400, { extent: 40 })), loci.get(m));

  // the shaded region: an offscreen image recomputed when the method, the view or the theme changes
  const off = document.createElement('canvas');
  const octx = off.getContext('2d');
  let grid = null;
  let img = null;
  let key = '';
  let lastPal = null;

  const method = select(f.controls, { label: 'Method', options: METHODS, value: p.method, onChange: () => (setMethod(), update()) });
  const nS = slider(f.controls, { label: 'grid cells n', min: 3, max: 7, step: 1, value: p.v, fmt: (v) => String(2 ** v), onInput: () => update() });
  const hS = slider(f.controls, { label: 'time step h', min: 1e-5, max: 1, log: true, value: p.h, fmt: (v) => num(v), onInput: () => update() });

  const rdRatio = readout(f.readouts, { label: 'stiffness ratio' });
  const rdZ = readout(f.readouts, { label: 'h|λ| of the stiffest mode' });
  const rdR = readout(f.readouts, { label: '|R| of the stiffest mode' });
  const rdH = readout(f.readouts, { label: 'largest stable h' });
  const rdOut = readout(f.readouts, { label: 'modes outside' });
  const rdSteps = readout(f.readouts, { label: 'steps to reach t = 0.1' });

  function shade(ctx, tx, ty, area, pal) {
    const w = area.x1 - area.x0;
    const hgt = area.y1 - area.y0;
    const gh = Math.max(20, Math.min(400, Math.round((GW * hgt) / w)));
    const re0 = tx.inv(area.x0);
    const re1 = tx.inv(area.x1);
    const im0 = ty.inv(area.y1);
    const im1 = ty.inv(area.y0);
    const k = `${method.value}|${re0.toFixed(4)}|${re1.toFixed(4)}|${im0.toFixed(4)}|${im1.toFixed(4)}|${gh}`;
    if (k !== key || pal !== lastPal) {
      key = k;
      lastPal = pal;
      if (!img || img.height !== gh) {
        off.width = GW;
        off.height = gh;
        img = octx.createImageData(GW, gh);
        grid = new Float32Array(GW * gh);
      }
      stabilityGrid(method.value, [re0, re1], [im0, im1], GW, gh, grid);
      const [r, g, b] = pal.rgb.s2;
      const d = img.data;
      for (let j = 0; j < gh; j++) {
        const row = gh - 1 - j;
        for (let i = 0; i < GW; i++) {
          const o = 4 * (i + row * GW);
          const inside = grid[i + j * GW] <= 1;
          d[o] = r;
          d[o + 1] = g;
          d[o + 2] = b;
          d[o + 3] = inside ? 70 : 0;
        }
      }
      octx.putImageData(img, 0, 0);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, area.x0, area.y0, w, hgt);
  }

  function offscreenNote(ctx, tx, ty, area, pal) {
    const edge = tx.inv(area.x0);
    let offLeft = 0;
    for (let k = 0; k < NMAX - 1; k++) if (EIN[k] < edge || EOUT[k] < edge) offLeft++;
    if (!offLeft) return;
    ctx.fillStyle = pal.css('bad');
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`◀ ${offLeft} more off to the left`, area.x0 + 6, ty(0) + 8);
  }

  function shadeAbove(ctx, tx, ty, area, pal) {
    const y1 = ty(1);
    ctx.fillStyle = pal.css('bad', 0.07);
    ctx.fillRect(area.x0, area.y0, area.x1 - area.x0, y1 - area.y0);
    ctx.strokeStyle = pal.css('bad', 0.6);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(area.x0, y1);
    ctx.lineTo(area.x1, y1);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function setMethod() {
    const m = method.value;
    for (let k = 0; k < NS; k++) SR[k] = stabilityAbs(m, -SX[k], 0);
    const L = locus(m);
    plane.draw(
      [
        { x: L.re, y: L.im, color: 's2', width: 2, label: 'edge of the region, |R| = 1' },
        { x: EIN, y: ZERO, color: 's1', width: 0, points: 3.5, label: 'hλₖ inside' },
        { x: EOUT, y: ZERO, color: 'bad', width: 0, points: 4.5, label: 'hλₖ outside: grows' },
      ],
      { under: shade, extra: offscreenNote },
    );
    axis.draw(
      [
        { x: SX, y: SE, color: 'ink', dash: [5, 4], width: 1.5, label: 'exact decay e^(−h|λ|)' },
        { x: SX, y: SR, color: 's2', width: 2, label: `|R|, ${STABILITY_METHODS[m].name}` },
        { x: PXI, y: PYI, color: 's1', width: 0, points: 3.5, label: 'heat modes' },
        { x: PXO, y: PYO, color: 'bad', width: 0, points: 4.5, label: 'growing modes' },
      ],
      { under: shadeAbove },
    );
  }

  function update() {
    const m = method.value;
    const n = 2 ** nS.value;
    const h = hS.value;
    heatEigenvalues(n, 1, lam);
    let out = 0;
    let worst = 0;
    for (let k = 0; k < NMAX - 1; k++) {
      EIN[k] = EOUT[k] = PXI[k] = PYI[k] = PXO[k] = PYO[k] = NaN;
      if (k >= n - 1) continue;
      const z = h * lam[k];
      const R = stabilityAbs(m, z, 0);
      const grows = R > 1 + 1e-12;
      if (grows) {
        out++;
        EOUT[k] = z;
        PXO[k] = -z;
        PYO[k] = R;
      } else {
        EIN[k] = z;
        PXI[k] = -z;
        PYI[k] = R;
      }
      if (R > worst) worst = R;
    }
    const lmax = lam[n - 2];
    const zmax = h * Math.abs(lmax);
    const Rs = stabilityAbs(m, -zmax, 0);
    const hmax = maxStableStep(m, lmax);
    plane.render();
    axis.render();
    rdRatio.set(num(stiffnessRatio(n), 4));
    rdZ.set(num(zmax));
    rdR.set(num(Rs, 4), Rs > 1 + 1e-12 ? 'bad' : Rs > 0.9 ? '' : 'good');
    rdH.set(num(hmax));
    rdOut.set(`${out} of ${n - 1}`, out ? 'bad' : 'good');
    rdSteps.set(num(Math.ceil(0.1 / h - 1e-9)));
    const name = STABILITY_METHODS[m].name;
    let msg;
    if (out) msg = `${out} of ${n - 1} modes lie outside the region, so ${name} blows up. With n = ${n} it needs h ≤ ${num(hmax)}.`;
    else if (Rs > 0.9) msg = `Stable: every mode is inside. But the stiffest mode keeps |R| = ${num(Rs, 3)} per step, where the exact factor is ${num(Math.exp(-zmax))}: it lingers instead of vanishing.`;
    else if (Number.isFinite(hmax)) msg = `Stable: all ${n - 1} modes inside. The step is capped at ${num(hmax)} by the stiffest mode, not by accuracy.`;
    else msg = `Stable for every h: ${name} contains the whole negative real axis. The step can be chosen for accuracy alone.`;
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }

  setMethod();
  update();
  return () => {
    plane.destroy();
    axis.destroy();
  };
}
