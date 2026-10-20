// turbulence-implicit: who decides how much energy a shock destroys? Burgers'
// equation from u0 = sin(2 pi x) on [0, 1] (periodic), run to t = 0.8 by
//   - a finite-volume scheme from src/sims/burgers.js (Godunov, Rusanov,
//     Lax–Friedrichs or MUSCL) on n cells, with no viscosity term at all;
//   - the pseudo-spectral solver from src/sims/spectral.js (N = 128, 2/3
//     rule) with an explicit viscosity nu, possibly 0, on [0, 2 pi) with
//     x' = 2 pi x and t' = 2 pi t (the same equation after rescaling);
// beside the exact entropy solution (sineExact). After the shock forms at
// t_b = 1/(2 pi) the exact energy falls at a rate set by the jump alone. A
// scheme's own dissipation does the same job as the subgrid model of an
// implicit LES; with nu = 0 the truncated spectral system keeps all its
// energy and "thermalises".
// Both schemes always take their own full steps (finite volume: 0.9 of its
// CFL limit; spectral: dt' = 0.005), never steps shortened to meet a frame,
// except the last one at t = 0.8. That matters: Lax–Friedrichs dissipation
// scales as dx^2/dt, so frame-clipped steps would make it frame-rate
// dependent. Energies are recorded at every step.
// Left: energy against time. Right: u(x) now. Readouts: time, energy of
// each, error at the current time, energy lost before t_b (exact: none).
//
// data-preset: 'default' / 'godunov' (fixed: within 1 % after breaking),
// 'lf' (broken: Lax–Friedrichs, too dissipative), 'galerkin' (broken:
// spectral with nu = 0 keeps its energy).

import { h } from '../../kit/dom.js';
import { frame, select, segmented, button, readout, playButton, animate, sliced } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createBurgers as createFV, stepBurgers as stepFV, burgersDt, burgersEnergy as energyFV, sineExact, breakingTime } from '../../sims/burgers.js';
import { createBurgers as createSP, stepBurgers as stepSP, burgersField, burgersEnergy as energySP } from '../../sims/spectral.js';
import { presetFor, vmark } from './common.js';

const T_END = 0.8;
const RATE = 0.12; // simulated time per second
const NT = 161; // exact-energy samples, every 0.005
const DT_S = T_END / (NT - 1);
const DT_SP = 0.005; // spectral step in t' = 2 pi t
const MAXH = 1200; // history slots: at most ~230 FV steps (n = 256), ~1010 spectral steps
const NE = 512; // points for the exact energy
const NXP = 300; // points for the exact profile
const NSP = 128; // spectral grid
const TAU = 2 * Math.PI;
const TB = breakingTime(1);

const PRESETS = {
  default: { scheme: 'godunov', n: 128, nu: 0.002 },
  godunov: { scheme: 'godunov', n: 128, nu: 0.002 },
  lf: { scheme: 'lf', n: 128, nu: 0.005 },
  galerkin: { scheme: 'godunov', n: 128, nu: 0 },
};
const SCHEMES = [
  ['godunov', 'Godunov (first order)'],
  ['rusanov', 'Rusanov (first order)'],
  ['lf', 'Lax–Friedrichs (first order)'],
  ['muscl', 'MUSCL (second order)'],
];
const NUS = [['0', '0'], ['0.002', '0.002'], ['0.005', '0.005'], ['0.01', '0.01']];

export function mountImplicit(fig, { signal }) {
  const pre = presetFor(fig, PRESETS);
  const cfg = { scheme: pre.scheme, n: pre.n, nu: pre.nu };
  const f = frame(fig, { title: 'Numerical dissipation doing a model’s job', wide: true });
  f.stage.classList.add('cols');
  const colA = h('div');
  const colB = h('div');
  f.stage.append(colA, colB);

  const ePlot = new Plot(colA, {
    x: { label: 'time t', min: 0, max: T_END },
    y: { label: 'energy ∫u²/2 dx', min: 0, max: 0.27 },
    aspect: 1.3,
    minHeight: 220,
    label: 'Energy against time for the exact entropy solution, a finite-volume scheme and a spectral run, with the breaking time marked',
  });
  const uPlot = new Plot(colB, {
    x: { label: 'x', min: 0, max: 1 },
    y: { label: 'u', min: -1.3, max: 1.3 },
    aspect: 1.3,
    minHeight: 220,
    label: 'u against x now: exact entropy solution, finite-volume cells and spectral run',
  });

  // ---- controls
  select(f.controls, { label: 'Finite-volume scheme', options: SCHEMES, value: cfg.scheme, onChange: (v) => ((cfg.scheme = v), build()) });
  segmented(f.controls, { label: 'Cells n', options: [['64', '64'], ['128', '128'], ['256', '256']], value: String(cfg.n), onChange: (v) => ((cfg.n = Number(v)), build()) });
  segmented(f.controls, { label: 'Spectral ν (N = 128)', options: NUS, value: String(cfg.nu), onChange: (v) => ((cfg.nu = Number(v)), build()) });
  const loop = animate(fig, tick, { autoplay: false, signal });
  playButton(f.controls, loop, { label: 'Run' });
  button(f.controls, { label: 'Restart', onClick: () => (build(), loop.play()) });

  // ---- readouts
  const rT = readout(f.readouts, { label: 'time t' });
  const rEx = readout(f.readouts, { label: 'energy, exact' });
  const rFv = readout(f.readouts, { label: 'energy, finite volume' });
  const rSp = readout(f.readouts, { label: 'energy, spectral' });
  const rLoss = readout(f.readouts, { label: 'lost before t_b (exact: 0)', title: 'Energy lost by the finite-volume scheme before the shock exists; all of it is numerical' });

  // ---- buffers
  const tS = new Float64Array(NT);
  for (let q = 0; q < NT; q++) tS[q] = q * DT_S;
  const eEx = new Float64Array(NT).fill(NaN);
  const hFvT = new Float64Array(MAXH).fill(NaN);
  const hFvE = new Float64Array(MAXH).fill(NaN);
  const hSpT = new Float64Array(MAXH).fill(NaN);
  const hSpE = new Float64Array(MAXH).fill(NaN);
  const xp = new Float64Array(NXP);
  const up = new Float64Array(NXP);
  for (let q = 0; q < NXP; q++) xp[q] = (q + 0.5) / NXP;
  const xs = new Float64Array(NSP + 1);
  for (let j = 0; j <= NSP; j++) xs[j] = j / NSP;
  const us = new Float64Array(NSP + 1);
  let fv, sp, t, nFv, nSp, lossTb, exactReady = false;

  // Exact energy history, computed once in slices after the first paint.
  function* exactHistory() {
    for (let q = 0; q < NT; q++) {
      let e = 0;
      for (let i = 0; i < NE; i++) {
        const u = sineExact((i + 0.5) / NE, tS[q], 1, 0);
        e += u * u;
      }
      eEx[q] = (0.5 * e) / NE;
      if ((q & 7) === 7) yield q;
    }
  }

  function build() {
    fv = createFV({ preset: 'sine', params: { amp: 1, mean: 0 }, n: cfg.n, scheme: cfg.scheme });
    sp = createSP({ n: NSP, nu: cfg.nu, dt: 0.005, ic: 'sine', dealias: true });
    t = 0;
    lossTb = NaN;
    hFvT.fill(NaN);
    hFvE.fill(NaN);
    hSpT.fill(NaN);
    hSpE.fill(NaN);
    hFvT[0] = 0;
    hFvE[0] = energyFV(fv);
    hSpT[0] = 0;
    hSpE[0] = energySP(sp);
    nFv = 1;
    nSp = 1;
    const fvLabel = SCHEMES.find((s) => s[0] === cfg.scheme)[1].replace(/ \(.*\)/, '') + `, n = ${cfg.n}`;
    const spLabel = `spectral, ν = ${cfg.nu}`;
    ePlot.draw(
      [
        { x: tS, y: eEx, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact' },
        { x: hFvT, y: hFvE, color: 's1', width: 2.5, label: fvLabel },
        { x: hSpT, y: hSpE, color: 's2', width: 2, dash: [3, 2], label: spLabel },
      ],
      { extra: (ctx, tx, ty, area, pal) => vmark(ctx, tx, area, pal, TB, 'shock forms', { color: 'muted', top: false }) },
    );
    uPlot.draw([
      { x: xp, y: up, color: 'ink', width: 1.5, dash: [6, 4], label: 'exact' },
      { x: fv.x, y: fv.u, color: 's1', width: 2, step: true, label: fvLabel },
      { x: xs, y: us, color: 's2', width: 1.5, dash: [3, 2], label: spLabel },
    ]);
    show();
  }

  // Full steps up to T; a step is shortened only to land on T_END.
  function advanceTo(T) {
    const end = T >= T_END - 1e-12;
    while (!fv.failure && nFv < MAXH) {
      let dt = burgersDt(fv);
      if (fv.t + dt > T + 1e-12) {
        if (!end || fv.t >= T_END - 1e-12) break;
        dt = T_END - fv.t;
      }
      const e0 = hFvE[nFv - 1];
      const t0 = fv.t;
      stepFV(fv, dt);
      hFvT[nFv] = fv.t;
      hFvE[nFv] = energyFV(fv);
      // energy lost before the shock exists: interpolate to t_b
      if (!Number.isFinite(lossTb) && fv.t >= TB) lossTb = 1 - (e0 + ((hFvE[nFv] - e0) * (TB - t0)) / (fv.t - t0)) / 0.25;
      nFv++;
    }
    const tp = TAU * T;
    while (nSp < MAXH) {
      let dt = DT_SP;
      if (sp.t + dt > tp + 1e-12) {
        if (!end || sp.t >= TAU * T_END - 1e-12) break;
        dt = TAU * T_END - sp.t;
      }
      stepSP(sp, dt);
      hSpT[nSp] = sp.t / TAU;
      hSpE[nSp] = energySP(sp);
      nSp++;
    }
  }

  function tick(dt) {
    if (t >= T_END - 1e-12) return loop.pause();
    t = Math.min(T_END, t + RATE * dt);
    advanceTo(t);
    show();
  }

  // Exact energy at time tt, interpolated in the table.
  function exactAt(tt) {
    const x = Math.min(NT - 1, Math.max(0, tt / DT_S));
    const q = Math.min(NT - 2, Math.floor(x));
    return eEx[q] + (eEx[q + 1] - eEx[q]) * (x - q);
  }

  function show() {
    for (let q = 0; q < NXP; q++) up[q] = sineExact(xp[q], t, 1, 0);
    burgersField(sp, us);
    us[NSP] = us[0];
    ePlot.render();
    uPlot.render();
    // each run is compared with the exact energy at its own time
    const ex = exactReady ? exactAt(t) : NaN;
    const exFv = exactReady ? exactAt(fv.t) : NaN;
    const exSp = exactReady ? exactAt(sp.t / TAU) : NaN;
    const efv = energyFV(fv);
    const esp = energySP(sp);
    const err = (e, x) => {
      if (!Number.isFinite(x)) return '';
      const pc = 100 * (e / x - 1);
      return Math.abs(pc) < 0.05 ? ' (0.0 %)' : ` (${pc > 0 ? '+' : '−'}${Math.abs(pc).toFixed(1)} %)`;
    };
    rT.set(t.toFixed(3));
    rEx.set(Number.isFinite(ex) ? ex.toFixed(4) : '…');
    rFv.set(efv.toFixed(4) + err(efv, exFv), Number.isFinite(exFv) && Math.abs(efv / exFv - 1) > 0.03 ? 'bad' : '');
    rSp.set(esp.toFixed(4) + err(esp, exSp), Number.isFinite(exSp) && Math.abs(esp / exSp - 1) > 0.03 ? 'bad' : '');
    rLoss.set(Number.isFinite(lossTb) ? `${(100 * lossTb).toFixed(1)} %` : '–', lossTb > 0.03 ? 'bad' : '');
    narrate(exFv, exSp, efv, esp);
  }

  function narrate(ex, exSp, efv, esp) {
    let msg;
    if (t === 0) msg = 'Press Run. The shock forms at t = 1/(2π) ≈ 0.159; until then the exact energy stays at 0.25.';
    else if (t < TB) msg = 'Before the shock: any energy lost now is the scheme’s, not the physics’.';
    else if (!Number.isFinite(ex)) msg = 'Computing the exact energy…';
    else {
      const sp = cfg.nu === 0 && esp > 1.2 * exSp ? ' The spectral run with ν = 0 keeps all its energy: nothing in it can dissipate, so the energy spreads into grid-scale noise.' : '';
      const fvm = Math.abs(efv / ex - 1) <= 0.03 ? `The ${SCHEMES.find((x) => x[0] === cfg.scheme)[1].replace(/ \(.*\)/, '')} scheme removes about the right energy with no viscosity term at all.` : `The finite-volume scheme is ${efv < ex ? 'removing too much' : 'keeping too much'} energy (${(100 * (efv / ex - 1)).toFixed(1).replace('-', '−')} %).`;
      msg = fvm + sp;
    }
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }

  build();
  sliced(exactHistory(), { budgetMs: 4, signal })
    .then(() => {
      exactReady = true;
      show();
    })
    .catch(() => {});
}
