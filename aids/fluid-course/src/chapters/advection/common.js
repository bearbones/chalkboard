// Shared bits of the chapter 7 (advection) figures: option lists, number
// formats and a pointer-drag helper. Drawing and controls only; every number
// a figure shows comes from src/sims/advection.js or
// src/sims/ch-advection-analysis.js.

import { fmt } from '../../kit/dom.js';

// The linear schemes, in the order the chapter meets them.
export const LINEAR_OPTIONS = [
  ['upwind', 'Upwind'],
  ['downwind', 'Downwind'],
  ['ftcs', 'FTCS (centred)'],
  ['lxf', 'Lax–Friedrichs'],
  ['lw', 'Lax–Wendroff'],
  ['bw', 'Beam–Warming'],
  ['fromm', 'Fromm'],
  ['leapfrog', 'Leapfrog'],
];

export const PROFILE_OPTIONS = [
  ['square', 'Square wave'],
  ['gaussian', 'Gaussian'],
  ['triangle', 'Triangle'],
  ['packet', 'Wave packet'],
  ['combined', 'Four shapes (Jiang–Shu)'],
];

export const fmtNu = (v) => v.toFixed(2);

// |G| readout: three decimals near 1, where the difference matters.
export function fmtG(v) {
  if (!Number.isFinite(v)) return '–';
  if (v > 0.5 && v < 2) return v.toFixed(3);
  return fmt(v, 3);
}

// θ = kΔx as a fraction of π, and as points per wavelength.
export const fmtTheta = (th) => `${(th / Math.PI).toFixed(2)}π`;
export const ppw = (th) => (th > 0 ? (2 * Math.PI) / th : Infinity);

// Drag on a canvas: fn(e, first) on pointerdown and on every move while
// pressed. Pointer capture is best effort (synthetic events have no active
// pointer to capture). Sets touch-action: none on this canvas only.
export function onPointerDrag(canvas, fn, signal) {
  let down = false;
  canvas.style.touchAction = 'none';
  canvas.style.cursor = 'crosshair';
  const opts = signal ? { signal } : undefined;
  canvas.addEventListener('pointerdown', (e) => {
    down = true;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // no active pointer (synthetic event): dragging still works
    }
    fn(e, true);
  }, opts);
  canvas.addEventListener('pointermove', (e) => {
    if (down) fn(e, false);
  }, opts);
  const end = () => {
    down = false;
  };
  canvas.addEventListener('pointerup', end, opts);
  canvas.addEventListener('pointercancel', end, opts);
}
