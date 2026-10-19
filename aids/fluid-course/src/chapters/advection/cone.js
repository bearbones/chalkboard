// advection-cfl-cone: the Courant–Friedrichs–Lewy argument as a picture.
// The value at the top point (x = 0, t = T) depends, through the scheme, on
// the lattice points inside a cone that widens by the stencil's reach each
// step back; at t = 0 it spans [−L/ν, R/ν]·aT, whatever the refinement. The
// exact solution depends on one point only, the foot x = −aT. Reach and the
// CFL bound come from ch-advection-analysis.js; the stable range of ν is
// sampled from advection.js maxAmplification().

import { fmt } from '../../kit/dom.js';
import { frame, slider, select, segmented, readout, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { SCHEMES, maxAmplification } from '../../sims/advection.js';
import { reach, cflLimit } from '../../sims/ch-advection-analysis.js';
import { LINEAR_OPTIONS, fmtNu, fmtG } from './common.js';

const NU_MIN = 0.1, NU_MAX = 2.5;
const NS = 241; // ν samples for the stability bar
const XMIN = -3.3, XMAX = 1.9; // window in units of aT

export function mountCone(fig, { signal }) {
  const f = frame(fig, { title: 'Domains of dependence: the scheme’s cone and the true characteristic', wide: true });
  const box = canvasBox(f.stage, { aspect: 2.1, minHeight: 280, maxHeight: 440, label: 'Space–time lattice: the numerical domain of dependence of one point, the exact characteristic, and bars of the CFL and stable ranges of ν' });
  const cfg = { scheme: 'upwind', nu: 0.8, steps: 4 };
  const stable = new Uint8Array(NS);
  let stableFor = '';

  select(f.controls, { label: 'Scheme', options: LINEAR_OPTIONS, value: cfg.scheme, onChange: (v) => ((cfg.scheme = v), draw()) });
  slider(f.controls, { label: 'Courant number ν', min: NU_MIN, max: NU_MAX, step: 0.01, value: cfg.nu, fmt: fmtNu, onInput: (v) => ((cfg.nu = v), draw()) });
  segmented(f.controls, { label: 'Steps to reach T (refine)', options: [['4', '4'], ['8', '8'], ['16', '16']], value: '4', onChange: (v) => ((cfg.steps = Number(v)), draw()) });

  const rCfl = readout(f.readouts, { label: 'CFL bound', title: 'Largest ν for which the cone contains the foot' });
  const rCone = readout(f.readouts, { label: 'cone at t = 0', title: 'Numerical domain of dependence, in units of aT' });
  const rFoot = readout(f.readouts, { label: 'foot inside?' });
  const rG = readout(f.readouts, { label: 'max |G|', title: 'Largest von Neumann amplification factor at this ν' });
  const rStable = readout(f.readouts, { label: 'stable for', title: 'Sampled from max|G| ≤ 1 on 0.1 ≤ ν ≤ 2.5' });

  function sampleStable() {
    if (stableFor === cfg.scheme) return;
    stableFor = cfg.scheme;
    for (let k = 0; k < NS; k++) {
      const nu = NU_MIN + ((NU_MAX - NU_MIN) * k) / (NS - 1);
      stable[k] = maxAmplification(cfg.scheme, nu, 181) <= 1 + 1e-9 ? 1 : 0;
    }
  }

  function draw() {
    sampleStable();
    const pal = palette();
    const ctx = box.ctx;
    const W = box.width, H = box.height;
    box.clear();
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    const { left: L, right: R } = reach(cfg.scheme);
    const lim = cflLimit(cfg.scheme);
    const nu = cfg.nu, N = cfg.steps;
    const dx = 1 / (nu * N); // in units of aT
    const inside = nu <= lim + 1e-12;

    const padL = 30, padR = 12, top = 22;
    const barH = 64;
    const bot = H - barH - 30;
    const PX = (x) => padL + ((x - XMIN) / (XMAX - XMIN)) * (W - padL - padR);
    const PY = (t) => bot - t * (bot - top);

    // numerical cone
    ctx.fillStyle = pal.css('read', 0.2);
    ctx.beginPath();
    ctx.moveTo(PX(0), PY(1));
    ctx.lineTo(PX(-L / nu), PY(0));
    ctx.lineTo(PX(R / nu), PY(0));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.css('read', 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // lattice
    const mLo = Math.ceil(XMIN / dx), mHi = Math.floor(XMAX / dx);
    for (let n = 0; n <= N; n++) {
      const back = N - n; // steps back from the top
      for (let m = mLo; m <= mHi; m++) {
        const inCone = m >= -L * back && m <= R * back;
        const r = inCone ? 3.2 : 2;
        ctx.fillStyle = pal.css(inCone ? 'read' : 'muted', inCone ? 1 : 0.55);
        ctx.beginPath();
        ctx.arc(PX(m * dx), PY(n / N), r, 0, 2 * Math.PI);
        ctx.fill();
      }
    }
    // axes
    ctx.strokeStyle = pal.css('line');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PX(XMIN), PY(0));
    ctx.lineTo(PX(XMAX), PY(0));
    ctx.stroke();
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('T', padL - 8, PY(1));
    ctx.fillText('0', padL - 8, PY(0));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let x = -3; x <= 1; x++) ctx.fillText(x === 0 ? '0' : `${x < 0 ? '−' : ''}${Math.abs(x)}aT`, PX(x), PY(0) + 5);
    // the true characteristic and its foot
    ctx.strokeStyle = pal.css('accent');
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(PX(0), PY(1));
    ctx.lineTo(PX(-1), PY(0));
    ctx.stroke();
    const fx = PX(-1), fy = PY(0);
    ctx.fillStyle = pal.css(inside ? 'good' : 'bad');
    ctx.beginPath();
    ctx.moveTo(fx, fy - 8);
    ctx.lineTo(fx + 8, fy);
    ctx.lineTo(fx, fy + 8);
    ctx.lineTo(fx - 8, fy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.css('write');
    ctx.beginPath();
    ctx.arc(PX(0), PY(1), 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = pal.css('ink');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(inside ? 'foot inside the cone' : 'foot outside the cone', Math.min(fx + 10, W - 140), fy - 8);

    // ν bars: CFL range and von Neumann stable range
    const bx0 = padL + 70, bx1 = W - padR - 8;
    const BX = (v) => bx0 + ((v - 0) / NU_MAX) * (bx1 - bx0);
    const y1 = H - barH - 2, y2 = y1 + 22;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pal.css('muted');
    ctx.fillText('CFL holds', bx0 - 6, y1 + 7);
    ctx.fillText('stable', bx0 - 6, y2 + 7);
    ctx.fillStyle = pal.css('grid');
    ctx.fillRect(bx0, y1, bx1 - bx0, 14);
    ctx.fillRect(bx0, y2, bx1 - bx0, 14);
    ctx.fillStyle = pal.css('s1', 0.85);
    if (lim > 0) ctx.fillRect(bx0, y1, BX(Math.min(lim, NU_MAX)) - bx0, 14);
    ctx.fillStyle = pal.css('s2', 0.85);
    for (let k = 0; k < NS; k++) {
      if (!stable[k]) continue;
      const v = NU_MIN + ((NU_MAX - NU_MIN) * k) / (NS - 1);
      const w = (bx1 - bx0) * ((NU_MAX - NU_MIN) / (NS - 1) / NU_MAX);
      ctx.fillRect(BX(v) - w / 2, y2, w + 0.5, 14);
    }
    // ticks and the current ν
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = 0; v <= 2.5; v += 0.5) ctx.fillText(v === 0 ? 'ν = 0' : String(v), BX(v), y2 + 18);
    ctx.strokeStyle = pal.css('ink');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(BX(nu), y1 - 4);
    ctx.lineTo(BX(nu), y2 + 16);
    ctx.stroke();

    // readouts and narration
    const g = maxAmplification(cfg.scheme, nu);
    rCfl.set(lim > 0 ? `ν ≤ ${lim}` : 'never (no upstream point)', inside ? 'good' : 'bad');
    rCone.set(`[${fmt(-L / nu, 3)}, ${fmt(R / nu, 3)}]`.replace(/-/g, '−'));
    rFoot.set(inside ? 'yes' : 'no', inside ? 'good' : 'bad');
    rG.set(fmtG(g), g > 1 + 1e-9 ? 'bad' : 'good');
    rStable.set(stableRange());
    const name = SCHEMES[cfg.scheme].name;
    let s;
    if (!inside && lim === 0) s = `${name} never looks upstream, so its cone misses the foot at every ν > 0. It cannot converge.`;
    else if (!inside) s = `ν = ${fmtNu(nu)} > ${lim}: the foot lies outside ${name}’s cone. Refining Δx and Δt together leaves the cone where it is; only a smaller ν brings the foot back in.`;
    else if (g > 1 + 1e-9) s = `The cone contains the foot, yet ${name} is unstable (max |G| = ${fmtG(g)}). The CFL condition is necessary, not sufficient.`;
    else s = `The cone contains the foot and max |G| ≤ 1: ${name} can converge at this ν.`;
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  function stableRange() {
    let lo = -1, hi = -1;
    for (let k = 0; k < NS; k++) {
      if (stable[k]) {
        if (lo < 0) lo = k;
        hi = k;
      }
    }
    if (lo < 0) return 'no ν in [0.1, 2.5]';
    const v = (k) => NU_MIN + ((NU_MAX - NU_MIN) * k) / (NS - 1);
    const open = SCHEMES[cfg.scheme].nuMaxOpen && Math.abs(v(hi) - SCHEMES[cfg.scheme].nuMax) < 1e-9;
    return `ν ${open ? '<' : '≤'} ${v(hi).toFixed(2)}`;
  }

  box.onResize(draw);
  draw();
  signal?.addEventListener('abort', () => box.destroy());
}
