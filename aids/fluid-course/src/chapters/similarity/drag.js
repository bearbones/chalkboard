// Figure similarity-drag: the drag coefficient of a sphere against Re from
// four correlations, each drawn over its stated range (and, on request,
// beyond it), with the drag crisis; beside it, the drag force on a smooth
// 22 cm sphere in air against speed, from the wide-range fit.

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, toggle, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { SPHERE_DRAG, cdMorrison } from '../../sims/similarity.js';

const RE_MIN = 0.01;
const RE_MAX = 1e6;
// Smooth sphere in air (stated assumptions): 22 cm, rho = 1.2 kg/m^3, nu = 1.5e-5 m^2/s.
const BALL = { D: 0.22, rho: 1.2, nu: 1.5e-5 };
const force = (U) => (cdMorrison((U * BALL.D) / BALL.nu) * BALL.rho * U * U * Math.PI * BALL.D * BALL.D) / 8;

const ORDER = [
  ['stokes', 's4', [2, 4]],
  ['oseen', 's3', [9, 4, 2, 4]],
  ['schiller-naumann', 's2', [7, 5]],
  ['morrison', 's1', null],
];

const PRESETS = {
  stokes: { Re: 0.1, beyond: false },
  beyond: { Re: 10, beyond: true },
  intermediate: { Re: 100, beyond: false },
  crisis: { Re: 3e5, beyond: false },
};

function logspace(a, b, n) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = 10 ** (Math.log10(a) + ((Math.log10(b) - Math.log10(a)) * i) / (n - 1));
  return out;
}

export function mountSimilarityDrag(fig) {
  const P = { ...(PRESETS[fig.dataset.preset] || PRESETS.intermediate) };
  const { stage, controls, readouts, status } = frame(fig, { title: 'Drag on a sphere', wide: true });
  stage.classList.add('cols');

  // Each correlation sampled once: inside its stated range, and over the whole axis.
  const all = logspace(RE_MIN, RE_MAX, 260);
  const curves = ORDER.map(([id, color, dash]) => {
    const M = SPHERE_DRAG[id];
    const hi = Math.min(M.range[1], RE_MAX);
    const xs = logspace(RE_MIN, hi, Math.max(40, Math.round(60 * Math.log10(hi / RE_MIN) / 2)));
    const ys = xs.map(M.fn);
    const ysAll = all.map(M.fn);
    return { id, M, color, dash, xs, ys, ysAll, hi };
  });

  // The crisis: Morrison's local maximum and minimum between 1e4 and 1e6.
  let peak = { Re: 0, cd: 0 };
  let dip = { Re: 0, cd: Infinity };
  for (let l = 4; l <= 6; l += 0.001) {
    const Re = 10 ** l;
    const cd = cdMorrison(Re);
    if (l < 5.4 && cd > peak.cd) peak = { Re, cd };
    if (l > 5.3 && cd < dip.cd) dip = { Re, cd };
  }

  const speeds = new Float64Array(181);
  const forces = new Float64Array(181);
  for (let i = 0; i < speeds.length; i++) {
    speeds[i] = 2 + (38 * i) / (speeds.length - 1);
    forces[i] = force(speeds[i]);
  }
  let fPeak = { U: 0, F: 0 };
  let fDip = { U: 0, F: Infinity };
  for (let i = 0; i < speeds.length; i++) {
    if (speeds[i] < 22 && forces[i] > fPeak.F) fPeak = { U: speeds[i], F: forces[i] };
    if (speeds[i] > 18 && speeds[i] < 35 && forces[i] < fDip.F) fDip = { U: speeds[i], F: forces[i] };
  }

  const cdPlot = new Plot(stage, {
    x: { label: 'Reynolds number Re', min: RE_MIN, max: RE_MAX, log: true, fmt: (v) => sci(v, 3) },
    y: { label: 'drag coefficient', min: 0.03, max: 5000, log: true, fmt: (v) => fmt(v, 3) },
    aspect: 1.2,
    label: 'Sphere drag coefficient against Reynolds number for four correlations, log axes',
  });
  const fPlot = new Plot(stage, {
    x: { label: 'air speed U (m/s)', min: 0, max: 40 },
    y: { label: 'drag force (N), smooth 22 cm sphere', min: 0, max: 4 },
    aspect: 1.2,
    label: 'Drag force on a smooth 22 cm sphere in air against speed',
  });

  slider(controls, { label: 'Re', min: RE_MIN, max: RE_MAX, log: true, value: P.Re, fmt: (v) => sci(v, 2), onInput: (v) => ((P.Re = v), update()) });
  toggle(controls, { label: 'Draw each fit beyond its range', checked: P.beyond, onChange: (v) => ((P.beyond = v), update()) });

  const outs = curves.map((c) => ({ c, r: readout(readouts, { label: `drag coefficient, ${c.M.name.replace(/ \(.*\)$/, '').replace(', through the drag crisis', '')}` }) }));
  const rSpeed = readout(readouts, { label: 'speed for the 22 cm sphere' });

  function update() {
    const Re = P.Re;
    const series = [];
    for (const c of curves) {
      if (P.beyond) series.push({ x: all, y: c.ysAll, color: c.color, alpha: 0.4, width: 1.2, dash: [1, 4], hover: false, legend: false });
      series.push({ x: c.xs, y: c.ys, color: c.color, dash: c.dash, width: c.id === 'morrison' ? 2.6 : 2, label: c.M.name.replace(', through the drag crisis', '') });
    }
    const morrison = cdMorrison(Re);
    cdPlot.draw(series, {
      under(ctx, tx, ty, area, pal) {
        ctx.fillStyle = pal.css('muted', 0.13);
        ctx.fillRect(tx(peak.Re), area.y0, tx(dip.Re) - tx(peak.Re), area.y1 - area.y0);
        ctx.fillStyle = pal.css('muted');
        ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('drag crisis', tx(peak.Re) - 3, area.y0 + 4);
      },
      extra(ctx, tx, ty, area, pal) {
        ctx.strokeStyle = pal.css('accent');
        ctx.fillStyle = pal.css('board');
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(tx(Re), ty(morrison), 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      },
    });

    for (const { c, r } of outs) {
      const v = c.M.fn(Re);
      const inRange = Re <= c.M.range[1];
      r.set(inRange ? fmt(v, 4) : `${fmt(v, 3)} (out of range)`, inRange ? '' : 'bad');
    }

    const U = (Re * BALL.nu) / BALL.D;
    rSpeed.set(U < 1e-3 ? `${sci(U, 2)} m/s` : `${fmt(U, 3)} m/s`);
    fPlot.draw([{ x: speeds, y: forces, color: 's1', width: 2.6, label: 'drag force (Morrison fit)' }], {
      extra(ctx, tx, ty, area, pal) {
        if (U < 2 || U > 40) return;
        ctx.strokeStyle = pal.css('accent');
        ctx.fillStyle = pal.css('board');
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(tx(U), ty(force(U)), 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      },
    });

    const stokes = SPHERE_DRAG.stokes.fn(Re);
    const sn = SPHERE_DRAG['schiller-naumann'].fn(Re);
    if (Re < 1) {
      status.textContent = `Creeping flow. Stokes's 24/Re is within ${fmt((100 * Math.abs(stokes - morrison)) / morrison, 2)}% of the wide-range fit: inertia hardly matters, and drag grows in proportion to speed.`;
    } else if (Re <= 800) {
      status.textContent = `Inertia matters now. Stokes's law is ${fmt((100 * (sn - stokes)) / sn, 2)}% below Schiller–Naumann at this Re${P.beyond ? '' : ' (turn on the extension to see it fail)'}.`;
    } else if (Re < peak.Re) {
      status.textContent = `The drag coefficient is nearly flat (about 0.4 to 0.5 from Re = 10³ to 10⁵), so drag grows as the square of speed.${P.beyond ? ` Schiller–Naumann, used out of range, says ${fmt(sn, 2)} here.` : ''}`;
    } else if (Re <= dip.Re) {
      status.textContent = `Drag crisis: the drag coefficient falls from ${fmt(peak.cd, 2)} at Re ≈ ${sci(peak.Re, 2)} to ${fmt(dip.cd, 2)} at ${sci(dip.Re, 2)}. For the 22 cm sphere the force itself drops, from about ${fmt(fPeak.F, 2)} N at ${fmt(fPeak.U, 2)} m/s to ${fmt(fDip.F, 3)} N at ${fmt(fDip.U, 3)} m/s.`;
    } else {
      status.textContent = `Past the crisis the drag coefficient creeps back up. The fit is not recommended beyond Re = 10⁶.`;
    }
  }

  update();
  return () => {
    cdPlot.destroy();
    fPlot.destroy();
  };
}
