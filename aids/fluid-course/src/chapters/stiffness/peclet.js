// stiffness-peclet: steady advection–diffusion -a u' + kappa u'' = 0 on [0, 1]
// with u(0) = 0, u(1) = 1: a boundary layer of width about kappa/a at the
// outflow. Central differencing, first-order upwind and exponential fitting
// on the same grid, against the exact profile. The Péclet slider pushes the
// cell Péclet number P = a dx / kappa across 2.

import { frame, slider, select, toggle, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { createAdvDiff, solveAdvDiff, advDiffExact, advDiffCoefficients } from '../../sims/diffusion.js';
import { presetFor, maxDiff, num } from './common.js';

const PRESETS = {
  default: { Pe: 20, n: 20, central: true, upwind: true, fitted: true },
  'central-wiggles': { Pe: 80, n: 20, central: true, upwind: false, fitted: true },
  'central-refined': { Pe: 80, n: 50, central: true, upwind: false, fitted: false },
  'upwind-smearing': { Pe: 40, n: 20, central: false, upwind: true, fitted: true },
};
const NS = [10, 20, 50, 160];
const NF = 400;

export function mountPeclet(fig) {
  const p = presetFor(fig, PRESETS);
  const f = frame(fig, { title: 'A boundary layer: when diffusion is too weak for the grid' });
  const plot = new Plot(f.stage, { x: { label: 'x', min: 0, max: 1 }, y: { label: 'u', min: -1, max: 1.25 }, aspect: 1.6, label: 'Steady advection–diffusion profile: three schemes against the exact boundary layer' });

  const states = new Map(NS.map((n) => [n, { c: createAdvDiff(n), u: createAdvDiff(n), f: createAdvDiff(n) }]));
  const XF = new Float64Array(NF);
  const EF = new Float64Array(NF);
  for (let k = 0; k < NF; k++) XF[k] = k / (NF - 1);

  const peS = slider(f.controls, { label: 'Péclet number Pe = aL/κ', min: 5, max: 320, log: true, value: p.Pe, fmt: (v) => num(v), onInput: () => update(false) });
  const nSel = select(f.controls, { label: 'Grid', options: NS.map((n) => [String(n), `n = ${n} cells`]), value: String(p.n), onChange: () => update(true) });
  const tC = toggle(f.controls, { label: 'central', checked: p.central, onChange: () => update(true) });
  const tU = toggle(f.controls, { label: 'upwind', checked: p.upwind, onChange: () => update(true) });
  const tF = toggle(f.controls, { label: 'exponential fitting', checked: p.fitted, onChange: () => update(true) });

  const rdP = readout(f.readouts, { label: 'cell Péclet P = aΔx/κ' });
  const rdA = readout(f.readouts, { label: 'central weight α = 1 − P/2' });
  const rdMin = readout(f.readouts, { label: 'lowest central u' });
  const rdEc = readout(f.readouts, { label: 'error, central' });
  const rdEu = readout(f.readouts, { label: 'error, upwind' });
  const rdEf = readout(f.readouts, { label: 'error, fitted' });
  const rdK = readout(f.readouts, { label: 'upwind’s extra κ' });

  function update(structural) {
    const n = Number(nSel.value);
    const Pe = peS.value;
    const st = states.get(n);
    solveAdvDiff(st.c, { a: Pe, kappa: 1, scheme: 'central' });
    solveAdvDiff(st.u, { a: Pe, kappa: 1, scheme: 'upwind' });
    solveAdvDiff(st.f, { a: Pe, kappa: 1, scheme: 'fitted' });
    for (let k = 0; k < NF; k++) EF[k] = advDiffExact(XF[k], Pe);
    if (structural || !plot.series.length) {
      const pts = n > 50 ? 2 : 3.5;
      plot.draw([
        { x: XF, y: EF, color: 'ink', dash: [5, 4], width: 1.5, label: 'exact' },
        tC.value && { x: st.c.x, y: st.c.u, color: 's1', width: 2, points: pts, label: 'central' },
        tU.value && { x: st.u.x, y: st.u.u, color: 's2', width: 2, dash: [7, 4], points: pts, label: 'upwind' },
        tF.value && { x: st.f.x, y: st.f.u, color: 's3', width: 1.5, dash: [2, 3], points: pts, label: 'exponential fitting' },
      ]);
    } else plot.render();

    const P = Pe / n;
    const { alpha } = advDiffCoefficients('central', P);
    let minC = Infinity;
    for (let j = 0; j <= n; j++) minC = Math.min(minC, st.c.u[j]);
    const ec = maxDiff(st.c.u, st.c.exact, n + 1);
    const eu = maxDiff(st.u.u, st.u.exact, n + 1);
    const ef = maxDiff(st.f.u, st.f.exact, n + 1);
    rdP.set(num(P), P > 2 ? 'bad' : 'good');
    rdA.set(num(alpha), alpha < 0 ? 'bad' : '');
    rdMin.set(num(minC), minC < -1e-12 ? 'bad' : '');
    rdEc.set(num(ec));
    rdEu.set(num(eu));
    rdEf.set(num(ef));
    rdK.set(`${num(P / 2)} κ`);
    let msg;
    if (P > 2) msg = `P = ${num(P)} > 2: central differencing gives the downstream neighbour the negative weight α = ${num(alpha)}, so the profile zig-zags and dips to ${num(minC)}. Refine to n > ${num(Pe / 2)} or change scheme.`;
    else if (P > 1) msg = `P = ${num(P)} ≤ 2: central differencing is monotone, though the layer spans only a cell or two. Upwind adds ${num(P / 2)}κ of numerical diffusion.`;
    else msg = `P = ${num(P)}: the grid resolves the layer. Central is second order (error ${num(ec)}); upwind is first order (error ${num(eu)}).`;
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }

  update(true);
  return () => plot.destroy();
}
