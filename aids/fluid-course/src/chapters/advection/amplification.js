// advection-amplification: the von Neumann picture. For each wavenumber
// θ = kΔx a linear scheme multiplies the Fourier mode e^{ijθ} by G(θ) per
// step. Left: G(θ) traced in the complex plane against the unit circle and
// the exact factor e^{−iνθ}. Right: |G| and the relative phase speed c/a
// against θ. All values from advection.js amplification() and
// maxAmplification(); the unit circle and the exact arc are closed form.

import { fmt } from '../../kit/dom.js';
import { frame, slider, select, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { SCHEMES, amplification, maxAmplification } from '../../sims/advection.js';
import { LINEAR_OPTIONS, fmtNu, fmtG, fmtTheta, ppw } from './common.js';

const M = 181; // θ samples on [0, π]

export function mountAmplification(fig, { signal }) {
  const f = frame(fig, { title: 'The amplification factor G(θ)', wide: true });
  f.stage.classList.add('cols');
  const plane = new Plot(f.stage, { x: { label: 'Re G', min: -1.7, max: 1.7 }, y: { label: 'Im G', min: -1.7, max: 1.7 }, equal: true, aspect: 1.1, minHeight: 240, hover: false, label: 'The complex plane: the unit circle, the exact factor and the scheme’s G as θ runs from 0 to π' });
  const curves = new Plot(f.stage, { x: { label: 'θ = kΔx (in units of π)', min: 0, max: 1 }, y: { label: '|G| and c/a', min: 0, max: 1.5 }, aspect: 1.1, minHeight: 240, label: '|G| and relative phase speed against θ' });
  const cfg = { scheme: 'upwind', nu: 0.5, theta: Math.PI / 2 };

  // Buffers, filled in place.
  const th = new Float64Array(M), thPi = new Float64Array(M);
  const gRe = new Float64Array(M), gIm = new Float64Array(M), cRe = new Float64Array(M), cIm = new Float64Array(M);
  const eRe = new Float64Array(M), eIm = new Float64Array(M), uRe = new Float64Array(2 * M), uIm = new Float64Array(2 * M);
  const mag = new Float64Array(M), spd = new Float64Array(M), one = new Float64Array(M).fill(1);
  for (let k = 0; k < M; k++) {
    th[k] = (Math.PI * k) / (M - 1);
    thPi[k] = k / (M - 1);
  }
  for (let k = 0; k < 2 * M; k++) {
    const a = (2 * Math.PI * k) / (2 * M - 1);
    uRe[k] = Math.cos(a);
    uIm[k] = Math.sin(a);
  }
  const A = {};

  select(f.controls, { label: 'Scheme', options: LINEAR_OPTIONS, value: cfg.scheme, onChange: (v) => ((cfg.scheme = v), draw()) });
  slider(f.controls, { label: 'Courant number ν', min: 0.05, max: 2, step: 0.01, value: cfg.nu, fmt: fmtNu, onInput: (v) => ((cfg.nu = v), draw()) });
  slider(f.controls, { label: 'Wavenumber θ', min: 0.02, max: Math.PI, step: 0.01, value: cfg.theta, fmt: (v) => `${fmtTheta(v)} (${fmt(ppw(v), 3)} points per wave)`, onInput: (v) => ((cfg.theta = v), draw()) });

  const rG = readout(f.readouts, { label: '|G(θ)|' });
  const rMax = readout(f.readouts, { label: 'max over θ of |G|' });
  const rSpd = readout(f.readouts, { label: 'c / a at θ', title: 'Numerical phase speed over the true speed' });
  const rAmp = readout(f.readouts, { label: 'amplitude after one wavelength', title: '|G| raised to the number of steps the wave needs to travel one wavelength, 2π/(νθ)' });
  const rPh = readout(f.readouts, { label: 'phase error per wavelength', title: '(c/a − 1) × 360°' });

  function draw() {
    const { scheme, nu, theta } = cfg;
    const lf = scheme === 'leapfrog';
    let gmax = 0, top = 1.25, kMax = 0;
    for (let k = 0; k < M; k++) {
      amplification(scheme, nu, th[k], undefined, A);
      gRe[k] = A.re;
      gIm[k] = A.im;
      mag[k] = A.mag;
      spd[k] = A.relSpeed;
      if (A.magMax > gmax) {
        gmax = A.magMax;
        kMax = k;
      }
      if (A.mag > top) top = A.mag;
      if (A.relSpeed > top && A.relSpeed < 4) top = A.relSpeed;
      if (lf && A.comp) {
        cRe[k] = A.comp.re;
        cIm[k] = A.comp.im;
      }
      eRe[k] = Math.cos(nu * th[k]);
      eIm[k] = -Math.sin(nu * th[k]);
    }
    curves.setAxes({ y: { max: Math.min(4, Math.ceil(top * 1.08 * 4) / 4) } });
    const g = amplification(scheme, nu, theta, undefined, A);
    const gr = g.re, gi = g.im, gm = g.mag, rs = g.relSpeed;
    const name = SCHEMES[scheme].name;
    plane.draw(
      [
        { x: uRe, y: uIm, color: 'muted', width: 1, dash: [3, 3], label: '|G| = 1', fit: false },
        { x: eRe, y: eIm, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact e^(−iνθ)' },
        { x: gRe, y: gIm, color: 's1', width: 2.5, label: name },
        lf ? { x: cRe, y: cIm, color: 's2', width: 2, dash: [2, 3], label: 'computational root' } : null,
      ],
      {
        extra: (ctx, tx, ty, area, pal) => {
          dot(ctx, tx(Math.cos(nu * theta)), ty(-Math.sin(nu * theta)), 5, pal.css('ink'), pal);
          dot(ctx, tx(gr), ty(gi), 6, pal.css('s1'), pal);
          if (lf && A.comp) dot(ctx, tx(A.comp.re), ty(A.comp.im), 5, pal.css('s2'), pal);
        },
      },
    );
    curves.draw(
      [
        { x: thPi, y: one, color: 'muted', width: 1, dash: [2, 3], hover: false, label: 'exact (= 1)' },
        { x: thPi, y: mag, color: 's1', width: 2.5, label: '|G|' },
        { x: thPi, y: spd, color: 's3', width: 2, dash: [7, 4], label: 'c / a' },
      ],
      {
        extra: (ctx, tx, ty, area, pal) => {
          ctx.strokeStyle = pal.css('accent', 0.7);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(tx(theta / Math.PI), area.y0);
          ctx.lineTo(tx(theta / Math.PI), area.y1);
          ctx.stroke();
        },
      },
    );
    const steps = (2 * Math.PI) / (nu * theta);
    const amp = Math.pow(gm, steps);
    rG.set(fmtG(gm), gm > 1 + 1e-9 ? 'bad' : '');
    rMax.set(fmtG(gmax), gmax > 1 + 1e-9 ? 'bad' : 'good');
    rSpd.set(fmt(rs, 3));
    rAmp.set(amp < 1e6 ? `${fmt(100 * amp, 3)}%` : '> 10⁸%', amp > 1 + 1e-9 ? 'bad' : '');
    rPh.set(`${rs >= 1 ? '+' : '−'}${fmt(Math.abs(rs - 1) * 360, 3)}°`);
    let s;
    if (gmax > 1 + 1e-9) {
      s = `Unstable: G leaves the unit circle. The worst wave, θ = ${fmtTheta(th[kMax])}, grows by a factor ${fmtG(gmax)} every step.`;
    } else {
      const lost = 1 - amp;
      const slow = rs < 1 ? 'slow' : 'fast';
      s = `Stable at ν = ${fmtNu(nu)}. A wave with ${fmt(ppw(theta), 3)} points per wavelength keeps ${fmt(100 * amp, 3)}% of its amplitude per wavelength travelled${lost < 1e-6 ? ' (no damping)' : ''} and runs ${fmt(Math.abs(rs - 1) * 100, 2)}% ${slow}.`;
    }
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  function dot(ctx, x, y, r, color, pal) {
    ctx.fillStyle = color;
    ctx.strokeStyle = pal.css('board');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }

  draw();
  signal?.addEventListener('abort', () => {
    plane.destroy();
    curves.destroy();
  });
}
