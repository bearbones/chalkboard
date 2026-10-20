// shocks-limiters: the flux-limited method of advection.js ('limited' scheme,
// LeVeque 2002 ch. 6) on a periodic square wave, Gaussian or Jiang–Shu mix.
// Left: Sweby's (1984) diagram, φ against θ, with his TVD region and the
// second-order region between minmod and superbee shaded; the chosen limiter
// bold, the others faint; and dots at (θ, φ(θ)) for every face of the current
// solution, so you can see which faces fall outside the TVD region. Right: the
// numerical solution beside the exact one. Readouts: total variation against
// its initial value, overshoot and undershoot, L1 error, peak, and the number
// of faces outside the TVD region. WENO5 (advection.js 'weno5') is offered for
// comparison; it is not a flux limiter, so it has no curve on the diagram.
//
// data-preset: a LIMITERS id or 'weno5', optionally ':' + profile id
// ('square', 'gaussian', 'combined'), e.g. 'lw' (broken), 'mc' (fixed),
// 'superbee:gaussian'.

import { h, fmt } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { LIMITERS, createState, reset, step, diagnostics, exact } from '../../sims/advection.js';

const TH0 = -1, TH1 = 3; // θ range of the diagram
const NTH = 401;
const NF = 800; // exact-solution samples
const RATE = 0.25; // periods per second while running
const MAXN = 400;
const EPS_W = 1e-6; // faces with a smaller jump get no θ dot

const LIM_ORDER = ['upwind', 'lw', 'bw', 'fromm', 'minmod', 'vanleer', 'mc', 'vanalbada', 'superbee'];
const OPTIONS = [...LIM_ORDER.map((id) => [id, LIMITERS[id].name]), ['weno5', 'WENO5 (not a limiter; for comparison)']];
const PROFILES = [['square', 'square wave'], ['gaussian', 'Gaussian'], ['combined', 'Jiang–Shu mix']];
const NS = [['100', '100'], ['200', '200'], ['400', '400']];

// Sweby's bounds (closed form).
const tvdUpper = (t) => (t > 0 ? Math.min(2 * t, 2) : 0);
const sbee = (t) => Math.max(0, Math.min(1, 2 * t), Math.min(2, t));
const mmod = (t) => (t > 0 ? Math.min(1, t) : 0);

export function mountLimiters(fig, { signal }) {
  const [pl, pp] = (fig.dataset.preset || 'mc').split(':');
  const cfg = {
    lim: OPTIONS.some((o) => o[0] === pl) ? pl : 'mc',
    profile: PROFILES.some((o) => o[0] === pp) ? pp : 'square',
    nu: 0.5,
    n: 200,
  };
  const f = frame(fig, { title: 'Flux limiters: Sweby’s diagram and a travelling square wave', wide: true });
  f.stage.classList.add('cols');
  const colA = h('div');
  const colB = h('div');
  f.stage.append(colA, colB);

  const sw = new Plot(colA, {
    x: { label: 'θ (ratio of upwind to local jump)', min: TH0, max: TH1 },
    y: { label: 'φ(θ)', min: -0.1, max: 2.6 },
    aspect: 1.25,
    minHeight: 220,
    label: 'Sweby diagram: limiter φ against slope ratio θ, with the TVD region and the second-order region shaded, and a dot for every face of the current solution',
  });
  const prof = new Plot(colB, {
    x: { label: 'x', min: 0, max: 1 },
    y: { label: 'u', min: -0.35, max: 1.35 },
    aspect: 1.25,
    minHeight: 220,
    label: 'u against x after advection round the periodic domain: exact and numerical',
  });

  // ---- buffers (allocated once)
  const th = new Float64Array(NTH);
  for (let k = 0; k < NTH; k++) th[k] = TH0 + ((TH1 - TH0) * k) / (NTH - 1);
  const curves = {};
  for (const id of LIM_ORDER) {
    const y = new Float64Array(NTH);
    for (let k = 0; k < NTH; k++) y[k] = LIMITERS[id].phi(th[k]);
    curves[id] = y;
  }
  const dotT = new Float64Array(MAXN).fill(NaN), dotP = new Float64Array(MAXN).fill(NaN);
  const xf = new Float64Array(NF), uf = new Float64Array(NF);
  for (let k = 0; k < NF; k++) xf[k] = (k + 0.5) / NF;
  const D = {};
  let st = null, target = 0, outside = 0;

  // ---- controls
  const limSel = select(f.controls, { label: 'Limiter φ(θ)', options: OPTIONS, value: cfg.lim, onChange: (v) => set({ lim: v }) });
  const profSeg = segmented(f.controls, { label: 'Profile', options: PROFILES, value: cfg.profile, onChange: (v) => set({ profile: v }) });
  const nuSl = slider(f.controls, { label: 'Courant number ν', min: 0.05, max: 1, step: 0.05, value: cfg.nu, fmt: (v) => v.toFixed(2), onInput: (v) => set({ nu: v }) });
  const nSeg = segmented(f.controls, { label: 'Cells n', options: NS, value: String(cfg.n), onChange: (v) => set({ n: Number(v) }) });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'One more period', onClick: () => (loop.pause(), goTo(Math.floor(st.t + 1e-9) + 1)) });
  button(f.controls, { label: 'Reset', onClick: () => (loop.pause(), restart()) });

  // ---- readouts
  const rP = readout(f.readouts, { label: 'periods travelled' });
  const rTV = readout(f.readouts, { label: 'TV / TV at t = 0', title: 'Total variation Σ|u_{j+1} − u_j| against its initial value; a TVD scheme never lets it grow' });
  const rOv = readout(f.readouts, { label: 'overshoot above the initial max' });
  const rUn = readout(f.readouts, { label: 'undershoot below the initial min' });
  const rL1 = readout(f.readouts, { label: 'L1 error', title: 'Δx Σ|u − exact cell average|' });
  const rMax = readout(f.readouts, { label: 'peak value', title: 'The exact peak stays at 1' });
  const rOut = readout(f.readouts, { label: 'faces outside the TVD region', title: 'Faces whose (θ, φ(θ)) lies outside Sweby’s region 0 ≤ φ ≤ min(2θ, 2) (φ = 0 for θ ≤ 0)' });
  const rTvd = readout(f.readouts, { label: 'curve inside the TVD region?' });

  function set(patch) {
    const old = { ...cfg };
    Object.assign(cfg, patch);
    limSel.set(cfg.lim, { silent: true });
    profSeg.set(cfg.profile, { silent: true });
    nuSl.set(cfg.nu, { silent: true });
    nSeg.set(String(cfg.n), { silent: true });
    if (!st || cfg.n !== old.n) st = createState(cfg.n, cfg.profile);
    else if (cfg.profile !== old.profile) reset(st, cfg.profile);
    const weno = cfg.lim === 'weno5';
    const series = [];
    for (const id of LIM_ORDER) {
      if (id === cfg.lim) continue;
      series.push({ x: th, y: curves[id], color: 'muted', width: 1, alpha: 0.45, dash: LIMITERS[id].tvd ? null : [3, 3], hover: false, legend: false });
    }
    if (!weno) series.push({ x: th, y: curves[cfg.lim], color: 's1', width: 3, label: LIMITERS[cfg.lim].name });
    series.push({ x: dotT, y: dotP, color: 's2', width: 0, points: 3, label: 'faces of the current solution', hover: false });
    sw.draw(series, { under: shade, extra: labels });
    prof.draw([
      { x: xf, y: uf, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact' },
      { x: st.x, y: st.u, color: 's1', width: 2, points: cfg.n <= 100 ? 2 : 0, label: weno ? 'WENO5' : LIMITERS[cfg.lim].name },
    ]);
    restart();
  }

  function restart() {
    reset(st);
    target = 0;
    show();
  }

  // Advance to time T (a whole number of periods lands exactly: the last step
  // is shortened to hit T).
  function goTo(T) {
    target = T;
    const opts = cfg.lim === 'weno5' ? null : { limiter: cfg.lim };
    const dtFull = cfg.nu * st.dx; // a = 1
    while (st.t < target - 1e-12) {
      const nu = st.t + dtFull > target ? (target - st.t) / st.dx : cfg.nu;
      if (opts) step(st, 'limited', nu, opts);
      else step(st, 'weno5', nu);
    }
    show();
  }

  function tick(dt) {
    const stop = Math.floor(target + 1e-9) + 1; // pause at the next whole period
    const next = Math.min(stop, st.t + RATE * dt);
    goTo(next);
    if (next >= stop - 1e-12) loop.pause();
  }

  // θ at each face j−1/2 (a > 0): θ = (u_{j−1} − u_{j−2})/(u_j − u_{j−1}).
  function faceDots() {
    const u = st.u, n = st.n, weno = cfg.lim === 'weno5';
    const phi = weno ? null : LIMITERS[cfg.lim].phi;
    outside = 0;
    for (let j = 0; j < MAXN; j++) {
      dotT[j] = NaN;
      dotP[j] = NaN;
      if (j >= n || weno) continue;
      const W = u[j] - u[(j - 1 + n) % n];
      if (Math.abs(W) < EPS_W) continue;
      const t = (u[(j - 1 + n) % n] - u[(j - 2 + n) % n]) / W;
      const p = phi(t);
      if (p > tvdUpper(t) + 1e-12 || p < -1e-12) outside++;
      if (t >= TH0 && t <= TH1) {
        dotT[j] = t;
        dotP[j] = p;
      }
    }
  }

  function shade(ctx, tx, ty, area, pal) {
    // Sweby's TVD region: 0 ≤ φ ≤ min(2θ, 2) for θ > 0.
    ctx.fillStyle = pal.css('s3', 0.14);
    ctx.beginPath();
    ctx.moveTo(tx(0), ty(0));
    ctx.lineTo(tx(1), ty(2));
    ctx.lineTo(tx(TH1), ty(2));
    ctx.lineTo(tx(TH1), ty(0));
    ctx.closePath();
    ctx.fill();
    // Second-order TVD region: between minmod and superbee.
    ctx.fillStyle = pal.css('s3', 0.3);
    ctx.beginPath();
    for (let k = 0; k < NTH; k++) if (th[k] >= 0) ctx.lineTo(tx(th[k]), ty(sbee(th[k])));
    for (let k = NTH - 1; k >= 0; k--) if (th[k] >= 0) ctx.lineTo(tx(th[k]), ty(mmod(th[k])));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.css('s3', 0.8);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx(TH0), ty(0));
    ctx.lineTo(tx(0), ty(0));
    ctx.lineTo(tx(1), ty(2));
    ctx.lineTo(tx(TH1), ty(2));
    ctx.stroke();
  }

  function labels(ctx, tx, ty, area, pal) {
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.fillStyle = pal.css('muted');
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('TVD region', tx(TH1) - 4, ty(2) + 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('dashed: not TVD', area.x0 + 6, area.y0 + 6);
  }

  function show() {
    for (let k = 0; k < NF; k++) uf[k] = exact(st.profile, xf[k], st.t);
    faceDots();
    sw.render();
    prof.render();
    diagnostics(st, D);
    const tvr = D.tv / D.tv0;
    const weno = cfg.lim === 'weno5';
    rP.set(st.t.toFixed(3));
    rTV.set(tvr.toFixed(4), tvr > 1.001 ? 'bad' : 'good');
    rOv.set(fmt(D.overshoot, 3), D.overshoot > 1e-3 ? 'bad' : '');
    rUn.set(fmt(D.undershoot, 3), D.undershoot > 1e-3 ? 'bad' : '');
    rL1.set(fmt(D.l1, 3));
    rMax.set(D.max.toFixed(4));
    rOut.set(weno ? '–' : String(outside), outside > 0 && cfg.nu < 0.999 ? 'bad' : '');
    rTvd.set(weno ? 'not a limiter' : LIMITERS[cfg.lim].tvd ? 'yes' : 'no', weno ? '' : LIMITERS[cfg.lim].tvd ? 'good' : 'bad');
    narrate(tvr, weno);
  }

  function narrate(tvr, weno) {
    let s;
    const name = weno ? 'WENO5' : LIMITERS[cfg.lim].name;
    if (st.t === 0) s = `${name} at ν = ${cfg.nu.toFixed(2)}. Press Run to carry the profile once round the periodic domain; the exact solution comes back unchanged.`;
    else if (cfg.nu > 0.999) s = 'ν = 1: every scheme here shifts the data exactly one cell per step, so the result is exact. Lower ν to see the differences.';
    else if (tvr > 1.001 && !weno) s = `${name}: total variation ${tvr.toFixed(3)} times its initial value. ${outside} faces sit outside the TVD region; there the correction adds new wiggles.`;
    else if (tvr > 1.001) s = `WENO5 is not TVD: its variation is ${tvr.toFixed(4)} times the initial value, a very small overshoot, in exchange for high order on smooth parts.`;
    else s = `${name}: no new wiggles (TV ratio ${tvr.toFixed(4)}), peak ${D.max.toFixed(3)}, L1 error ${fmt(D.l1, 3)}.`;
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  set({});
}
