// stiffness-dufort: Du Fort–Frankel and Richardson's leapfrog on the heat
// equation with u0 = sin(pi x). Two refinement paths: dt = dx/2 (dt/dx fixed)
// and r = 1 (dt = dx^2, so dt/dx -> 0). Left: the amplitude u(1/2, t)
// against the heat equation's e^{-pi^2 t} and the damped-wave (telegraph)
// equation the scheme really approximates when dt/dx is fixed. Right: the
// error at t = 0.2 as the grid is refined, along both paths.

import { frame, slider, segmented, readout, sliced } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createHeat, setHeatPreset, amplification, telegraphAmplitude } from '../../sims/diffusion.js';
import { chapterHeatStep, richardsonAmplification, heatRefinementStudy } from '../../sims/ch-stiffness-richardson.js';
import { presetFor, num } from './common.js';

const PRESETS = {
  default: { scheme: 'dufort-frankel', path: 'dt/dx', v: 2 },
  broken: { scheme: 'dufort-frankel', path: 'dt/dx', v: 2 },
  fixed: { scheme: 'dufort-frankel', path: 'r', v: 2 },
  richardson: { scheme: 'richardson', path: 'r', v: 1 },
};
const NS = [10, 20, 40, 80, 160];
const TA = 1;
const TS = 0.2;
const MAXA = 800;
const NF = 240;
const BIG = 1e6;

export function mountDufort(fig, { signal }) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'Stable is not enough: Du Fort–Frankel', wide: true });
  f.stage.classList.add('cols');
  const left = document.createElement('div');
  const right = document.createElement('div');
  f.stage.append(left, right);
  const aPlot = new Plot(left, { x: { label: 't', min: 0, max: TA }, y: { label: 'u(½, t)', min: -1, max: 1.05 }, aspect: 1.4, label: 'Amplitude of the sine mode at the centre against time, with the heat equation and the damped-wave equation' });
  const ePlot = new Plot(right, { x: { label: 'grid cells n', log: true, min: 8, max: 200 }, y: { label: 'error at t = 0.2', log: true, min: 1e-5, max: 10 }, aspect: 1.4, label: 'Error at t = 0.2 against grid size along the two refinement paths' });

  const states = new Map();
  const AT = new Float64Array(MAXA + 2).fill(NaN);
  const AY = new Float64Array(MAXA + 2).fill(NaN);
  const TF = new Float64Array(NF);
  const HF = new Float64Array(NF);
  const WF = new Float64Array(NF);
  for (let k = 0; k < NF; k++) {
    TF[k] = (TA * k) / (NF - 1);
    HF[k] = Math.exp(-Math.PI * Math.PI * TF[k]);
  }
  const NX = Float64Array.from(NS);
  const E1 = new Float64Array(NS.length).fill(NaN);
  const E2 = new Float64Array(NS.length).fill(NaN);
  const REF = Float64Array.from(NS, (n) => 2.5 / (n * n));
  const studies = {};
  let blew1 = [];
  let blew2 = [];
  let runToken = 0;

  const scheme = segmented(f.controls, { label: 'Scheme', options: [['dufort-frankel', 'Du Fort–Frankel'], ['richardson', 'Richardson (leapfrog)']], value: p.scheme, onChange: () => changed() });
  const path = segmented(f.controls, { label: 'Refine with', options: [['dt/dx', 'Δt = Δx/2'], ['r', 'r = 1 (Δt = Δx²)']], value: p.path, onChange: () => changed() });
  const nS = slider(f.controls, { label: 'grid cells n', min: 0, max: NS.length - 1, step: 1, value: p.v, fmt: (v) => String(NS[v]), onInput: () => changed() });

  const rdC = readout(f.readouts, { label: 'Δt/Δx' });
  const rdR = readout(f.readouts, { label: 'r = κΔt/Δx²' });
  const rdG = readout(f.readouts, { label: 'worst |G| on the grid' });
  const rdA = readout(f.readouts, { label: 'u(½) at t = 0.2 (heat: 0.139)' });
  const rdE = readout(f.readouts, { label: 'error at t = 0.2' });

  aPlot.draw([
    { x: TF, y: HF, color: 'ink', dash: [5, 4], width: 1.5, label: 'heat equation e^(−π²t)' },
    { x: TF, y: WF, color: 's2', dash: [7, 4], width: 2, label: 'damped wave equation' },
    { x: AT, y: AY, color: 's1', width: 2, label: 'scheme' },
  ]);
  ePlot.draw(
    [
      { x: NX, y: REF, color: 'muted', dash: [2, 3], width: 1.5, label: 'slope n⁻²', hover: false },
      { x: NX, y: E1, color: 's1', width: 2, points: 4, label: 'Δt = Δx/2' },
      { x: NX, y: E2, color: 's2', width: 2, dash: [7, 4], points: 4, label: 'r = 1' },
    ],
    { extra: marks },
  );

  const nNow = () => NS[nS.value];
  const dtNow = () => (path.value === 'r' ? 1 / (nNow() * nNow()) : 0.5 / nNow());

  function marks(ctx, tx, ty, area, pal) {
    const k = nS.value;
    const arr = path.value === 'r' ? E2 : E1;
    if (Number.isFinite(arr[k])) {
      ctx.strokeStyle = pal.css('write');
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(tx(NS[k]), ty(arr[k]), 8, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.font = '12px "Atkinson Hyperlegible", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let j = 0; j < NS.length; j++) {
      const both = blew1[j] && blew2[j];
      if (!blew1[j] && !blew2[j]) continue;
      ctx.fillStyle = pal.css('bad');
      ctx.fillText(both ? '× ×' : '×', tx(NS[j]), area.y0 + 4);
    }
    if (blew1.some(Boolean) || blew2.some(Boolean)) {
      ctx.textAlign = 'left';
      ctx.fillText('× blew up', area.x0 + 6, area.y0 + 20);
    }
  }

  function study() {
    const sc = scheme.value;
    if (studies[sc]) return Promise.resolve(studies[sc]);
    const out = { dtdx: null, r: null };
    function* both() {
      out.dtdx = yield* heatRefinementStudy({ scheme: sc, path: 'dt/dx', c: 0.5, ns: NS, T: TS });
      out.r = yield* heatRefinementStudy({ scheme: sc, path: 'r', r: 1, ns: NS, T: TS });
      return out;
    }
    return sliced(both(), { budgetMs: 6, signal }).then((res) => (studies[sc] = res));
  }

  function showStudy(res) {
    for (let j = 0; j < NS.length; j++) {
      E1[j] = res.dtdx[j].blewUp ? NaN : res.dtdx[j].error;
      E2[j] = res.r[j].blewUp ? NaN : res.r[j].error;
    }
    blew1 = res.dtdx.map((x) => x.blewUp);
    blew2 = res.r.map((x) => x.blewUp);
    const row = (path.value === 'r' ? res.r : res.dtdx)[nS.value];
    rdA.set(row.blewUp ? 'blew up' : num(row.amplitude), row.blewUp || Math.abs(row.amplitude - row.exactAmplitude) > 0.05 ? 'bad' : 'good');
    rdE.set(row.blewUp ? '∞' : num(row.error), row.blewUp || row.error > 0.05 ? 'bad' : 'good');
    ePlot.render();
  }

  function worstG() {
    const n = nNow();
    const r = dtNow() * n * n;
    let w = 0;
    for (let k = 1; k < n; k++) {
      const xi = (k * Math.PI) / n;
      const g = scheme.value === 'richardson' ? richardsonAmplification(xi, r) : amplification('dufort-frankel', xi, r);
      if (g > w) w = g;
    }
    return w;
  }

  function runAmplitude() {
    const token = ++runToken;
    const n = nNow();
    const dt = dtNow();
    const sc = scheme.value;
    if (!states.has(n)) states.set(n, createHeat({ n, preset: 'sine' }));
    const s = states.get(n);
    setHeatPreset(s, 'sine');
    const steps = Math.round(TA / dt);
    const stride = Math.max(1, Math.ceil(steps / MAXA));
    AT.fill(NaN);
    AY.fill(NaN);
    AT[0] = 0;
    AY[0] = s.u[n >> 1];
    let c = 1;
    function* go() {
      for (let k = 1; k <= steps; k++) {
        if (token !== runToken) return;
        chapterHeatStep(s, sc, dt);
        const a = s.u[n >> 1];
        if (!(Math.abs(a) < BIG) || !(Math.abs(s.u[(n >> 1) + 1]) < BIG)) {
          AT[c] = s.t;
          AY[c] = Math.sign(a) * BIG;
          break;
        }
        if (k % stride === 0 || k === steps) {
          AT[c] = s.t;
          AY[c] = a;
          c++;
        }
        if (k % 256 === 0) yield;
      }
      if (token === runToken) aPlot.render();
    }
    sliced(go(), { budgetMs: 6, signal }).catch(() => {});
  }

  function changed() {
    const n = nNow();
    const dt = dtNow();
    const c = dt * n;
    for (let k = 0; k < NF; k++) WF[k] = telegraphAmplitude(Math.PI, TF[k], 1, c);
    const w = worstG();
    rdC.set(num(c));
    rdR.set(num(dt * n * n));
    rdG.set(num(w, 4), w > 1 + 1e-12 ? 'bad' : 'good');
    rdA.set('…');
    rdE.set('…');
    aPlot.render();
    ePlot.render();
    runAmplitude();
    study()
      .then((res) => {
        showStudy(res);
        narrate(w);
      })
      .catch(() => {});
    narrate(w);
  }

  function narrate(w) {
    const n = nNow();
    let msg;
    if (scheme.value === 'richardson') msg = `Richardson’s leapfrog is unstable for every r > 0: here the shortest wave grows by ${num(w, 3)} per step, from rounding error upwards.`;
    else if (path.value === 'dt/dx') msg = `Stable (worst |G| = ${num(w, 4)}), yet wrong: with Δt/Δx fixed at 1/2 the scheme follows the damped wave equation (dashed), not the heat equation. Refining past n = ${n} makes the error at t = 0.2 grow.`;
    else msg = `Stable and consistent: on this path Δt/Δx = 1/n → 0, so the extra term vanishes and the error falls like n⁻².`;
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }

  changed();
  return () => {
    runToken++;
    aPlot.destroy();
    ePlot.destroy();
  };
}
