// shocks-breaking: Burgers' equation u_t + (u²/2)_x = 0 from a sine wave.
// Left: characteristics x = ξ + t u0(ξ) in the x–t plane, either drawn
// through each other (the multivalued "solution") or stopped where they
// enter the shock (the entropy solution). Right: u against x at the chosen
// time: the exact entropy solution (burgers.js sineExact), the multivalued
// curve traced by the characteristics (closed form), and a conservative
// scheme run by burgers.js stepBurgers. Readouts: breaking time, steepest
// slope, energy exact against numerical, mass, L1 error.
//
// data-preset: 'before' (t = 0.10) or 'after' (t = 0.30); amplitude 1.

import { h, fmt } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createBurgers, resetBurgers, advanceBurgers, sineExact, breakingTime, burgersMass, burgersEnergy, burgersExact } from '../../sims/burgers.js';
import { l1, fx } from './common.js';

const TMAX = 0.5;
const NF = 600; // exact-solution samples (midpoints of [0, 1])
const NC = 1201; // samples of the multivalued characteristic curve
const NCH = 24; // characteristic lines drawn
const RATE = 0.08; // simulated time per second of playback

const SCHEMES = [
  ['godunov', 'Godunov (first order)'],
  ['rusanov', 'Rusanov (first order)'],
  ['muscl', 'MUSCL, MC limiter (second order)'],
];
const NS = [['50', '50'], ['100', '100'], ['200', '200'], ['400', '400']];
const TWO_PI = 2 * Math.PI;

export function mountBreaking(fig, { signal }) {
  const f = frame(fig, { title: 'Burgers’ equation: a sine wave breaks', wide: true });
  f.stage.classList.add('cols');
  const colA = h('div');
  const colB = h('div');
  f.stage.append(colA, colB);

  const cfg = { amp: 1, t: fig.dataset.preset === 'after' ? 0.3 : 0.1, scheme: 'godunov', n: 200, mode: 'cross' };

  const xt = new Plot(colA, {
    x: { label: 'x', min: 0, max: 1 },
    y: { label: 't', min: 0, max: TMAX },
    aspect: 1.25,
    minHeight: 220,
    legend: false,
    hover: false,
    label: 'Characteristic lines of Burgers’ equation in the x–t plane, with the breaking time, the current time and the shock path',
  });
  const prof = new Plot(colB, {
    x: { label: 'x', min: 0, max: 1 },
    y: { label: 'u', min: -1.7, max: 1.7 },
    aspect: 1.25,
    minHeight: 220,
    label: 'u against x: the exact entropy solution, the multivalued curve traced by the characteristics, and the numerical solution',
  });

  // ---- buffers (allocated once; the state is rebuilt only when n changes)
  const xf = new Float64Array(NF), uf = new Float64Array(NF);
  for (let k = 0; k < NF; k++) xf[k] = (k + 0.5) / NF;
  const xc = new Float64Array(NC), uc = new Float64Array(NC);
  let st = createBurgers({ preset: 'sine', params: { amp: cfg.amp, mean: 0 }, n: cfg.n, scheme: cfg.scheme, limiter: 'mc' });
  let ex = new Float64Array(cfg.n);

  // ---- controls
  const ampSl = slider(f.controls, { label: 'Amplitude A', min: 0.25, max: 1.5, step: 0.05, value: cfg.amp, fmt: (v) => v.toFixed(2), onInput: (v) => set({ amp: v }) });
  const tSl = slider(f.controls, { label: 'Time t', min: 0, max: TMAX, step: 0.005, value: cfg.t, fmt: (v) => v.toFixed(3), onInput: (v) => goTo(v) });
  const modeSeg = segmented(f.controls, {
    label: 'Characteristics',
    options: [['cross', 'let them cross'], ['shock', 'stop at the shock']],
    value: cfg.mode,
    onChange: (v) => ((cfg.mode = v), show()),
  });
  const schSel = select(f.controls, { label: 'Scheme', options: SCHEMES, value: cfg.scheme, onChange: (v) => set({ scheme: v }) });
  const nSeg = segmented(f.controls, { label: 'Cells n', options: NS, value: String(cfg.n), onChange: (v) => set({ n: Number(v) }) });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Play' });
  button(f.controls, { label: 'Back to t = 0', onClick: () => (loop.pause(), goTo(0)) });

  // ---- readouts
  const rT = readout(f.readouts, { label: 'time t' });
  const rTb = readout(f.readouts, { label: 'breaking time t_b', title: 't_b = 1/(2πA): when the steepest characteristics first meet' });
  const rSlope = readout(f.readouts, { label: 'steepest slope (exact)', title: 'u_x at x = 1/2: −2πA/(1 − 2πA t) before breaking' });
  const rJump = readout(f.readouts, { label: 'shock jump [u]', title: 'u just left of the shock minus u just right of it (exact)' });
  const rEx = readout(f.readouts, { label: 'energy ∫u²/2 exact', title: 'Constant until t_b, then lost at the rate [u]³/12' });
  const rEn = readout(f.readouts, { label: 'energy, numerical' });
  const rMass = readout(f.readouts, { label: 'mass ∫u dx, numerical', title: 'Exactly 0 for all time; a conservative scheme keeps it to round-off' });
  const rL1 = readout(f.readouts, { label: 'L1 error', title: 'Δx Σ|u − exact| at the cell centres' });

  function set(patch) {
    const nOld = cfg.n;
    Object.assign(cfg, patch);
    ampSl.set(cfg.amp, { silent: true });
    schSel.set(cfg.scheme, { silent: true });
    nSeg.set(String(cfg.n), { silent: true });
    if (cfg.n !== nOld) {
      st = createBurgers({ preset: 'sine', params: { amp: cfg.amp, mean: 0 }, n: cfg.n, scheme: cfg.scheme, limiter: 'mc' });
      ex = new Float64Array(cfg.n);
    }
    st.params.amp = cfg.amp;
    st.scheme = cfg.scheme;
    resetBurgers(st);
    prof.draw([
      { x: xc, y: uc, color: 'muted', width: 1.5, dash: [2, 3], label: 'characteristics (multivalued)', hover: false },
      { x: xf, y: uf, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact (entropy) solution' },
      { x: st.x, y: st.u, color: 's1', width: 2, points: cfg.n <= 100 ? 2 : 0, label: SCHEMES.find((s) => s[0] === cfg.scheme)[1] },
    ]);
    goTo(cfg.t);
  }

  // Bring the numerical solution to time T (from t = 0 if T is earlier).
  function goTo(T) {
    cfg.t = Math.min(TMAX, Math.max(0, T));
    tSl.set(cfg.t, { silent: true });
    if (cfg.t < st.t - 1e-12) resetBurgers(st);
    if (cfg.t > st.t) advanceBurgers(st, cfg.t);
    show();
  }

  function tick(dt) {
    if (cfg.t >= TMAX - 1e-12) return loop.pause();
    goTo(cfg.t + RATE * dt);
  }

  function exactEnergy() {
    let e = 0;
    for (let k = 0; k < NF; k++) e += uf[k] * uf[k];
    return (0.5 * e) / NF;
  }

  function show() {
    const A = cfg.amp, t = cfg.t, tb = breakingTime(A);
    for (let k = 0; k < NF; k++) uf[k] = sineExact(xf[k], t, A, 0);
    // Multivalued solution: the point ξ carries u0(ξ) to x = ξ + t u0(ξ).
    for (let k = 0; k < NC; k++) {
      const xi = -0.5 + (2 * k) / (NC - 1);
      const u0 = A * Math.sin(TWO_PI * xi);
      xc[k] = xi + t * u0;
      uc[k] = u0;
    }
    burgersExact(st, ex);
    prof.render();
    xt.render();

    const broken = t > tb;
    const slope = broken ? -Infinity : (-TWO_PI * A) / (1 - TWO_PI * A * t);
    const jump = broken ? sineExact(0.5 - 1e-9, t, A, 0) - sineExact(0.5 + 1e-9, t, A, 0) : 0;
    const eEx = exactEnergy(), eNum = burgersEnergy(st);
    rT.set(t.toFixed(3));
    rTb.set(tb.toFixed(4), broken ? 'bad' : '');
    rSlope.set(broken ? '−∞ (shock)' : fmt(slope, 3), broken ? 'bad' : '');
    rJump.set(broken ? `${jump.toFixed(3)}  (dE/dt = −${((jump * jump * jump) / 12).toFixed(4)})` : 'no shock yet');
    rEx.set(eEx.toFixed(5));
    rEn.set(eNum.toFixed(5));
    rMass.set(fmt(burgersMass(st), 2));
    rL1.set(fmt(l1(st.u, ex, st.dx, st.n), 3));
    narrate(t, tb, eEx, eNum);
  }

  function drawXT(ctx, tx, ty, area, pal) {
    const A = cfg.amp, tb = breakingTime(A);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = pal.css('muted', 0.85);
    ctx.beginPath();
    for (let k = 0; k < NCH; k++) {
      const xi = (k + 0.5) / NCH;
      const u0 = A * Math.sin(TWO_PI * xi);
      let tEnd = TMAX;
      if (cfg.mode === 'shock' && tb < TMAX) {
        // Entropy solution: the characteristic ends where it reaches the
        // stationary shock at x = 1/2 (closed form for this symmetric case).
        const th = (0.5 - xi) / u0;
        if (th > 0 && th < tEnd) tEnd = th;
      }
      for (let c = -1; c <= 1; c++) {
        ctx.moveTo(tx(xi + c), ty(0));
        ctx.lineTo(tx(xi + c + tEnd * u0), ty(tEnd));
      }
    }
    ctx.stroke();
    // breaking time
    if (tb < TMAX) {
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = pal.css('bad', 0.9);
      ctx.beginPath();
      ctx.moveTo(area.x0, ty(tb));
      ctx.lineTo(area.x1, ty(tb));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = pal.css('bad');
      ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('t_b', area.x0 + 4, ty(tb) - 2);
      if (cfg.mode === 'shock') {
        ctx.strokeStyle = pal.css('accent');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx(0.5), ty(tb));
        ctx.lineTo(tx(0.5), ty(TMAX));
        ctx.stroke();
      }
    }
    // now
    ctx.strokeStyle = pal.css('s1');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(area.x0, ty(cfg.t));
    ctx.lineTo(area.x1, ty(cfg.t));
    ctx.stroke();
  }

  function narrate(t, tb, eEx, eNum) {
    let s;
    if (t === 0) s = 'The initial sine wave. Each point moves at its own height u: the crest at x = 1/4 moves right, the trough at x = 3/4 moves left.';
    else if (t < tb) s = `Before breaking: the characteristics have not met yet, the profile steepens at x = 1/2, and the energy stays at ${eEx.toFixed(4)}.`;
    else {
      const frac = (eNum - eEx) / eEx;
      s = cfg.mode === 'cross'
        ? `t > t_b: the characteristics cross, so the dotted curve is multivalued. The exact solution replaces the fold by a jump at x = 1/2.`
        : `t > t_b: characteristics run into the shock and end there. Energy is lost at the jump (exact ${eEx.toFixed(4)}; this scheme ${frac >= 0 ? '+' : '−'}${Math.abs(100 * frac).toFixed(1)}%).`;
    }
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  xt.draw([], { extra: drawXT });
  set({});
}
