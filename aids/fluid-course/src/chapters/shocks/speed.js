// shocks-speed: a Burgers shock from a step u_L | u_R (u_L > u_R) run twice,
// once by a conservative scheme (flux form) and once by upwind differencing
// of the quasi-linear form u u_x (burgers.js 'upwind-nc'). The exact
// solution moves at the Rankine–Hugoniot speed (u_L + u_R)/2. Top: u against
// x. Bottom: shock position against time for both runs and the exact line.
// Readouts: positions, errors in cells, average speeds, and the mass budget
// against the exact one, d/dt ∫u dx = f(u_L) − f(u_R).
//
// data-preset: 'half' (u_L = 1, u_R = 0.5), 'zero' (u_L = 1, u_R = 0).

import { fmt } from '../../kit/dom.js';
import { frame, slider, select, segmented, button, readout, playButton, animate } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createBurgers, resetBurgers, advanceBurgers, burgersRiemann, burgersMass, shockPosition, rhSpeed } from '../../sims/burgers.js';
import { burgersF } from './common.js';

const T_END = 0.5;
const X0 = 0.25;
const RATE = 0.125; // simulated time per second
const NF = 600;
const HCAP = 512;

const CONS = [
  ['godunov', 'Godunov'],
  ['roe', 'Roe'],
  ['rusanov', 'Rusanov'],
  ['lf', 'Lax–Friedrichs'],
  ['muscl', 'MUSCL (minmod)'],
];
const NS = [['50', '50'], ['100', '100'], ['200', '200'], ['400', '400'], ['800', '800']];

export function mountSpeed(fig, { signal }) {
  const f = frame(fig, { title: 'Shock speed: conservative against non-conservative', wide: true });
  const P = fig.dataset.preset === 'zero' ? { uL: 1, uR: 0 } : { uL: 1, uR: 0.5 };
  const cfg = { uL: P.uL, uR: P.uR, scheme: 'godunov', n: 200 };

  const prof = new Plot(f.stage, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u', min: -0.1, max: 1.6 }, aspect: 2.4, minHeight: 170, label: 'u against x: exact shock, conservative scheme and non-conservative scheme' });
  const pos = new Plot(f.stage, { x: { label: 't', min: 0, max: T_END }, y: { label: 'shock position x_s', min: X0 - 0.02, max: 1 }, aspect: 3.2, minHeight: 130, label: 'Shock position against time: the Rankine–Hugoniot line and the two schemes' });

  // ---- buffers
  const xf = new Float64Array(NF), uf = new Float64Array(NF);
  for (let k = 0; k < NF; k++) xf[k] = (k + 0.5) / NF;
  const hT = new Float64Array(HCAP).fill(NaN), hC = new Float64Array(HCAP).fill(NaN), hN = new Float64Array(HCAP).fill(NaN);
  const eT = new Float64Array([0, T_END]), eX = new Float64Array(2);
  let hLen = 0;
  let sc, nc, m0c = 0, m0n = 0;
  let t = 0;

  // ---- controls
  const uLSl = slider(f.controls, { label: 'Left state u_L', min: 0.2, max: 1.5, step: 0.05, value: cfg.uL, fmt: (v) => v.toFixed(2), onInput: (v) => set({ uL: v }) });
  const uRSl = slider(f.controls, { label: 'Right state u_R', min: 0, max: 1.45, step: 0.05, value: cfg.uR, fmt: (v) => v.toFixed(2), onInput: (v) => set({ uR: v }) });
  const schSel = select(f.controls, { label: 'Conservative scheme', options: CONS, value: cfg.scheme, onChange: (v) => set({ scheme: v }) });
  const nSeg = segmented(f.controls, { label: 'Cells n', options: NS, value: String(cfg.n), onChange: (v) => set({ n: Number(v) }) });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Jump to t = 0.5', onClick: () => (loop.pause(), goTo(T_END)) });
  button(f.controls, { label: 'Reset', onClick: () => (loop.pause(), restart()) });

  // ---- readouts
  const rS = readout(f.readouts, { label: 'RH speed (u_L + u_R)/2' });
  const rX = readout(f.readouts, { label: 'exact position', title: 'x_s = 0.25 + s t' });
  const rC = readout(f.readouts, { label: 'conservative: position (error)', title: 'Where u crosses (u_L + u_R)/2; error in cells' });
  const rN = readout(f.readouts, { label: 'non-conservative: position (error)' });
  const rVC = readout(f.readouts, { label: 'average speed, conservative' });
  const rVN = readout(f.readouts, { label: 'average speed, non-conservative' });
  const rMC = readout(f.readouts, { label: 'mass budget error, conservative', title: '∫u dx minus its exact value ∫u₀ dx + t (f(u_L) − f(u_R))' });
  const rMN = readout(f.readouts, { label: 'mass budget error, non-conservative' });

  function build() {
    sc = createBurgers({ preset: 'shock', params: { uL: cfg.uL, uR: cfg.uR, x0: X0 }, n: cfg.n, scheme: cfg.scheme });
    nc = createBurgers({ preset: 'shock', params: { uL: cfg.uL, uR: cfg.uR, x0: X0 }, n: cfg.n, scheme: 'upwind-nc' });
    prof.draw([
      { x: xf, y: uf, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact' },
      { x: sc.x, y: sc.u, color: 's1', width: 2, points: cfg.n <= 100 ? 2 : 0, label: `${CONS.find((c) => c[0] === cfg.scheme)[1]} (conservative)` },
      { x: nc.x, y: nc.u, color: 's2', width: 2, dash: [4, 3], label: 'upwind on u u_x (non-conservative)' },
    ]);
    pos.draw([
      { x: eT, y: eX, color: 'ink', width: 1.5, dash: [6, 4], label: 'Rankine–Hugoniot' },
      { x: hT, y: hC, color: 's1', width: 2, label: 'conservative' },
      { x: hT, y: hN, color: 's2', width: 2, dash: [4, 3], label: 'non-conservative' },
    ]);
  }

  function set(patch) {
    const old = { ...cfg };
    Object.assign(cfg, patch);
    uLSl.set(cfg.uL, { silent: true });
    uRSl.set(cfg.uR, { silent: true });
    schSel.set(cfg.scheme, { silent: true });
    nSeg.set(String(cfg.n), { silent: true });
    if (!sc || cfg.n !== old.n || cfg.scheme !== old.scheme) build();
    restart();
  }

  function restart() {
    for (const s of [sc, nc]) {
      s.params.uL = cfg.uL;
      s.params.uR = cfg.uR;
      resetBurgers(s);
    }
    m0c = burgersMass(sc);
    m0n = burgersMass(nc);
    t = 0;
    hT.fill(NaN);
    hC.fill(NaN);
    hN.fill(NaN);
    hLen = 0;
    const s = rhSpeed(cfg.uL, cfg.uR);
    eX[0] = X0;
    eX[1] = X0 + s * T_END;
    record();
    show();
  }

  const shock = () => cfg.uL > cfg.uR + 1e-9;
  const level = () => 0.5 * (cfg.uL + cfg.uR);

  function record() {
    if (hLen >= HCAP) return;
    hT[hLen] = t;
    hC[hLen] = shock() ? shockPosition(sc.u, sc.x, level()) : NaN;
    hN[hLen] = shock() ? shockPosition(nc.u, nc.x, level()) : NaN;
    hLen++;
  }

  // Advance both runs to time T, recording the shock positions on the way
  // (at most every 0.005 in t, so a jump draws a curve, not a chord).
  function goTo(T) {
    const target = Math.min(T_END, T);
    while (t < target - 1e-12) {
      t = Math.min(target, t + 0.005);
      advanceBurgers(sc, t);
      advanceBurgers(nc, t);
      record();
    }
    show();
  }

  function tick(dt) {
    if (t >= T_END - 1e-12) return loop.pause();
    goTo(t + RATE * dt);
  }

  function show() {
    const uL = cfg.uL, uR = cfg.uR;
    for (let k = 0; k < NF; k++) uf[k] = t > 0 ? burgersRiemann(uL, uR, (xf[k] - X0) / t) : xf[k] < X0 ? uL : uR;
    prof.render();
    pos.render();
    const s = rhSpeed(uL, uR), xs = X0 + s * t, dx = sc.dx;
    const budget = t * (burgersF(uL) - burgersF(uR));
    const emc = burgersMass(sc) - (m0c + budget), emn = burgersMass(nc) - (m0n + budget);
    rS.set(shock() ? s.toFixed(3) : 'no shock (rarefaction)');
    rX.set(shock() ? xs.toFixed(4) : '–');
    let pc = NaN, pn = NaN;
    if (shock()) {
      pc = shockPosition(sc.u, sc.x, level());
      pn = shockPosition(nc.u, nc.x, level());
      const ec = (pc - xs) / dx, en = (pn - xs) / dx;
      rC.set(`${pc.toFixed(4)} (${ec >= 0 ? '+' : '−'}${Math.abs(ec).toFixed(1)} cells)`, Math.abs(ec) > 1.5 ? 'bad' : 'good');
      rN.set(`${pn.toFixed(4)} (${en >= 0 ? '+' : '−'}${Math.abs(en).toFixed(1)} cells)`, Math.abs(en) > 1.5 ? 'bad' : 'good');
      rVC.set(t > 0.05 ? ((pc - X0) / t).toFixed(3) : '–');
      rVN.set(t > 0.05 ? ((pn - X0) / t).toFixed(3) : '–');
    } else {
      rC.set('–');
      rN.set('–');
      rVC.set('–');
      rVN.set('–');
    }
    rMC.set(fmt(emc, 2), Math.abs(emc) > 1e-6 ? 'bad' : 'good');
    rMN.set(fmt(emn, 2), Math.abs(emn) > 1e-6 ? 'bad' : 'good');
    narrate(xs, pc, pn, dx);
  }

  function narrate(xs, pc, pn, dx) {
    let s;
    if (!shock()) s = 'u_R ≥ u_L: faster fluid is on the right, so the step opens into a rarefaction fan and both schemes get it right. Lower u_R below u_L to make a shock.';
    else if (t === 0) s = 'A step: faster fluid on the left catches up with slower fluid on the right. Press Run.';
    else if (cfg.uR === 0 && Math.abs(pn - X0) < 0.5 * dx) s = 'The non-conservative shock has not moved at all: ahead of it u = 0, and its update u_i(u_i − u_{i−1}) is zero there, so no cell ever changes.';
    else if (Math.abs(pn - xs) > 1.5 * dx) s = `The non-conservative shock is ${((xs - pn) / dx).toFixed(1)} cells behind the Rankine–Hugoniot position (${(xs - pn).toFixed(3)} in x). Double n and the gap in x stays about the same.`;
    else s = 'Both shocks are close to the exact position so far. Run on, or make the jump bigger.';
    if (f.status.textContent !== s) f.status.textContent = s;
  }

  set({});
}
