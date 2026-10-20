// advection-upwind-stencil: one time step seen as "trace back and
// interpolate". The characteristic through (x_j, t + Δt) lands at the foot
// x_j − νΔx. A scheme whose stencil brackets the foot interpolates there; one
// whose stencil does not must extrapolate. The new value u_j^{n+1} is
// advection.js step() on a 12-point periodic grid; the drawn line or parabola
// is the polynomial through the stencil values (closed form), and the figure
// shows the two agree.

import { fmt } from '../../kit/dom.js';
import { frame, slider, segmented, readout, canvasBox } from '../../kit/widgets.js';
import { palette } from '../../kit/palette.js';
import { SCHEMES, createState, reset, step, maxAmplification } from '../../sims/advection.js';
import { fmtNu, fmtG } from './common.js';

const N = 12; // grid points on the periodic interval
const J = 5; // the target point
const SHOW = 3; // points shown each side of J
const PROFILE = { id: 'gaussian', x0: 0.62, sigma: 0.12 };
const OPTIONS = [['upwind', 'Upwind'], ['downwind', 'Downwind'], ['lw', 'Lax–Wendroff'], ['bw', 'Beam–Warming']];
const NC = 121; // samples of the drawn curves

// Lagrange basis weight of stencil point k (offsets in cells) at position s.
function weight(st, k, s) {
  let w = 1;
  for (let m = 0; m < st.length; m++) if (m !== k) w *= (s - st[m]) / (st[k] - st[m]);
  return w;
}

export function mountStencil(fig, { signal }) {
  const f = frame(fig, { title: 'One step: trace back, then interpolate' });
  const box = canvasBox(f.stage, { aspect: 1.45, minHeight: 260, maxHeight: 460, label: 'Grid points at two time levels with the characteristic traced back to its foot, and the stencil values with the interpolating polynomial' });
  const st = createState(N, PROFILE, { sample: 'point' });
  const cfg = { scheme: 'upwind', nu: 0.4 };
  const W = new Float64Array(3);
  const cx = new Float64Array(NC), cy = new Float64Array(NC);

  segmented(f.controls, { label: 'Scheme', options: OPTIONS, value: cfg.scheme, onChange: (v) => ((cfg.scheme = v), draw()) });
  slider(f.controls, { label: 'Courant number ν', min: 0, max: 2.5, step: 0.01, value: cfg.nu, fmt: fmtNu, onInput: (v) => ((cfg.nu = v), draw()) });

  const rFoot = readout(f.readouts, { label: 'foot (cells upstream)', title: 'The characteristic lands ν cells upstream of x_j' });
  const rSpan = readout(f.readouts, { label: 'stencil reaches', title: 'Cells the stencil uses, relative to j' });
  const rW = readout(f.readouts, { label: 'weights', title: 'Interpolation weights of the stencil values, left to right' });
  const rSum = readout(f.readouts, { label: 'Σ|weights|', title: '1 when every weight is non-negative: then no new maxima or minima' });
  const rNew = readout(f.readouts, { label: 'new u_j (scheme)', title: 'From one call of the kernel step()' });
  const rEx = readout(f.readouts, { label: 'exact u at foot' });
  const rG = readout(f.readouts, { label: 'max |G|', title: 'Largest von Neumann amplification factor' });

  function draw() {
    const pal = palette();
    const ctx = box.ctx;
    const Wd = box.width, H = box.height;
    box.clear();
    const sten = SCHEMES[cfg.scheme].stencil; // offsets for a > 0
    const lo = sten[0], hi = sten[sten.length - 1];
    const nu = cfg.nu;
    // one step of the kernel
    reset(st);
    if (nu > 0) step(st, cfg.scheme, nu);
    const uNew = st.u[J];
    const u0 = st.u0;
    const exactFoot = st.profile.f(st.x[J] - nu / N);
    let sum = 0;
    for (let k = 0; k < sten.length; k++) {
      W[k] = weight(sten, k, -nu);
      sum += Math.abs(W[k]);
    }
    const inside = -nu >= lo - 1e-12 && -nu <= hi + 1e-12;

    // geometry: offsets s ∈ [−SHOW − 0.6, SHOW + 0.6] across the width
    const padL = 36, padR = 14;
    const sMin = -SHOW - 0.6, sMax = SHOW + 0.6;
    const SX = (s) => padL + ((s - sMin) / (sMax - sMin)) * (Wd - padL - padR);
    const topY0 = 26, topY1 = Math.round(H * 0.36); // t^{n+1} row, t^n row
    const botTop = topY1 + 34, botBot = H - 26;
    const uLo = -0.25, uHi = 1.25;
    const UY = (u) => botBot - ((u - uLo) / (uHi - uLo)) * (botBot - botTop);
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';

    // --- top: two time levels
    ctx.strokeStyle = pal.css('line');
    ctx.lineWidth = 1;
    for (const y of [topY0, topY1]) {
      ctx.beginPath();
      ctx.moveTo(SX(sMin), y);
      ctx.lineTo(SX(sMax), y);
      ctx.stroke();
    }
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('tⁿ⁺¹', padL - 6, topY0);
    ctx.fillText('tⁿ', padL - 6, topY1);
    // stencil interval
    ctx.fillStyle = pal.css(inside ? 'read' : 'bad', 0.18);
    ctx.fillRect(SX(lo) - 6, topY1 - 10, SX(hi) - SX(lo) + 12, 20);
    // grid points
    for (let s = -SHOW; s <= SHOW; s++) {
      const used = s >= lo && s <= hi && sten.includes(s);
      for (const y of [topY0, topY1]) {
        ctx.beginPath();
        ctx.arc(SX(s), y, y === topY1 && used ? 6 : 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = pal.css(y === topY1 && used ? 'read' : 'muted');
        ctx.fill();
      }
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = pal.css('muted');
    for (let s = -SHOW; s <= SHOW; s++) ctx.fillText(s === 0 ? 'j' : s < 0 ? `j${s}`.replace('-', '−') : `j+${s}`, SX(s), topY0 - 7);
    // target and characteristic
    const footX = SX(Math.max(sMin, -nu));
    ctx.strokeStyle = pal.css('accent');
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(SX(0), topY0);
    if (-nu >= sMin) ctx.lineTo(footX, topY1);
    else ctx.lineTo(SX(sMin), topY0 + ((topY1 - topY0) * (0 - sMin)) / Math.max(nu, 1e-9));
    ctx.stroke();
    ctx.fillStyle = pal.css('write');
    ctx.beginPath();
    ctx.arc(SX(0), topY0, 6, 0, 2 * Math.PI);
    ctx.fill();
    if (-nu >= sMin) {
      ctx.fillStyle = pal.css('accent');
      ctx.beginPath();
      ctx.moveTo(footX, topY1 - 7);
      ctx.lineTo(footX + 7, topY1);
      ctx.lineTo(footX, topY1 + 7);
      ctx.lineTo(footX - 7, topY1);
      ctx.closePath();
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('foot', footX, topY1 + 10);
    }

    // --- bottom: values at tⁿ, the exact profile, the stencil polynomial
    ctx.strokeStyle = pal.css('grid');
    ctx.lineWidth = 1;
    for (const u of [0, 1]) {
      ctx.beginPath();
      ctx.moveTo(SX(sMin), UY(u));
      ctx.lineTo(SX(sMax), UY(u));
      ctx.stroke();
    }
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('0', padL - 6, UY(0));
    ctx.fillText('1', padL - 6, UY(1));
    ctx.fillText('u', padL - 22, (botTop + botBot) / 2);
    // exact profile at tⁿ (thin dashed)
    for (let k = 0; k < NC; k++) {
      const s = sMin + ((sMax - sMin) * k) / (NC - 1);
      cx[k] = s;
      cy[k] = st.profile.f(st.x[J] + s / N);
    }
    curve(ctx, cx, cy, SX, UY, pal.css('ink', 0.7), 1.5, [5, 4]);
    // the stencil polynomial (closed form), drawn across the panel
    for (let k = 0; k < NC; k++) {
      let p = 0;
      for (let m = 0; m < sten.length; m++) p += weight(sten, m, cx[k]) * u0[(J + sten[m] + N) % N];
      cy[k] = p;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(SX(sMin), botTop - 6, SX(sMax) - SX(sMin), botBot - botTop + 12);
    ctx.clip();
    curve(ctx, cx, cy, SX, UY, pal.css('s1'), 2, []);
    ctx.restore();
    // grid values
    for (let s = -SHOW; s <= SHOW; s++) {
      const used = sten.includes(s);
      ctx.beginPath();
      ctx.arc(SX(s), UY(u0[(J + s + N) % N]), used ? 6 : 4, 0, 2 * Math.PI);
      ctx.fillStyle = pal.css(used ? 'read' : 'muted');
      ctx.fill();
    }
    // the foot: scheme value (on the polynomial) and exact value
    if (-nu >= sMin) {
      const yS = Math.max(botTop - 4, Math.min(botBot + 4, UY(uNew)));
      ctx.strokeStyle = pal.css('accent', 0.6);
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(footX, topY1 + 24);
      ctx.lineTo(footX, botBot);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = pal.css('write');
      ctx.strokeStyle = pal.css('ink');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(footX, yS, 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = pal.css('ink');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(footX, UY(exactFoot), 8, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(Wd < 460 ? 'dashed: exact · solid: stencil polynomial' : 'dashed: exact profile · solid: polynomial through the stencil', padL, H - 4);

    rFoot.set(fmtNu(nu));
    rSpan.set(`${lo} … ${hi}`.replace(/-/g, '−'));
    let ws = '';
    for (let k = 0; k < sten.length; k++) ws += (k ? ', ' : '') + fmt(W[k], 3);
    rW.set(ws);
    rSum.set(fmt(sum, 3), sum > 1 + 1e-9 ? 'bad' : 'good');
    rNew.set(fmt(uNew, 4));
    rEx.set(fmt(exactFoot, 4));
    const g = maxAmplification(cfg.scheme, nu || 1e-9);
    rG.set(fmtG(g), g > 1 + 1e-9 ? 'bad' : 'good');
    const name = SCHEMES[cfg.scheme].name;
    let s;
    if (nu === 0) s = 'ν = 0: nothing moves, and every scheme returns u_j unchanged.';
    else if (inside && sum <= 1 + 1e-9) s = `${name} interpolates: the foot lies inside its stencil and every weight is positive, so the new value lies between its neighbours.`;
    else if (inside) s = `${name} interpolates with a parabola: the foot is inside the stencil, but one weight is negative (Σ|w| = ${fmt(sum, 3)}), so it can overshoot near jumps.`;
    else s = `${name} extrapolates: the foot is outside its stencil. Weights of mixed sign add up to Σ|w| = ${fmt(sum, 3)} > 1, and errors grow.`;
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  function curve(ctx, xs, ys, SX, UY, color, width, dash) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    for (let k = 0; k < xs.length; k++) {
      const y = Math.max(-1e4, Math.min(1e4, UY(ys[k])));
      if (k) ctx.lineTo(SX(xs[k]), y);
      else ctx.moveTo(SX(xs[k]), y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  box.onResize(draw);
  draw();
  signal?.addEventListener('abort', () => box.destroy());
}
