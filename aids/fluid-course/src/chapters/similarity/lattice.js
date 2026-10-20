// Figure similarity-lattice: what a Reynolds number costs in lattice units.
// A D2Q9 lattice Boltzmann run fixes nu = (tau - 1/2)/3 and c_s = 1/sqrt 3
// (lbm.js), so Re = U D / nu ties three knobs together: the cylinder size D
// in cells, the inflow speed U in cells per step, and tau. Raising Re must
// push tau toward 1/2, U toward the speed of sound, or D (and the cost) up.
// The plot is the (Re, D) plane with lines of constant tau for the current
// U; the readouts come from latticePlan (ch-similarity-scales.js).

import { fmt, sci } from '../../kit/dom.js';
import { frame, slider, readout } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { latticePlan } from '../../sims/ch-similarity-scales.js';

const PRESETS = {
  hero: { Re: 150, U: 0.08, D: 12 },
  push: { Re: 1500, U: 0.08, D: 12 },
  faster: { Re: 1500, U: 0.3, D: 12 },
  finer: { Re: 1500, U: 0.08, D: 120 },
};

const RE_MIN = 10;
const RE_MAX = 1e5;
const D_MIN = 4;
const D_MAX = 2000;
const TAUS = [0.501, 0.505, 0.52, 0.6, 1];
const TAU_FLOOR = 0.505;
const MA_WARN = 0.3;
const STAGGER = 2.2;

const tauText = (t) => fmt(t, t - 0.5 < 0.01 ? 5 : 4);

export function mountSimilarityLattice(fig) {
  const P = { ...(PRESETS[fig.dataset.preset] || PRESETS.hero) };
  const { stage, controls, readouts, status } = frame(fig, { title: 'Reynolds number in lattice units', wide: true });

  const plot = new Plot(stage, {
    x: { label: 'Reynolds number Re', min: RE_MIN, max: RE_MAX, log: true, fmt: (v) => sci(v, 2) },
    y: { label: 'cylinder diameter D (cells)', min: D_MIN, max: D_MAX, log: true, fmt: (v) => fmt(v, 3) },
    aspect: 1.25,
    maxHeight: 380,
    label: 'Lines of constant relaxation time in the plane of Reynolds number and cylinder size in cells, with the current run marked',
  });

  // Every series array is allocated once and refilled on input.
  const lines = TAUS.map((tau) => ({ tau, x: new Float64Array([RE_MIN, RE_MAX]), y: new Float64Array(2) }));
  const layerX = new Float64Array([RE_MIN, RE_MAX]);
  const layerY = new Float64Array([Math.sqrt(RE_MIN), Math.sqrt(RE_MAX)]);
  const ptX = new Float64Array(1);
  const ptY = new Float64Array(1);
  const series = [
    ...lines.map((l) => ({
      x: l.x,
      y: l.y,
      color: l.tau < TAU_FLOOR + 1e-9 ? 'bad' : 'muted',
      width: l.tau === 0.52 ? 2 : 1.2,
      dash: l.tau < TAU_FLOOR + 1e-9 ? [5, 4] : null,
      label: l.tau === 0.501 ? 'τ within 0.005 of ½' : l.tau === 0.52 ? 'lines of constant τ' : undefined,
      hover: false,
    })),
    { x: layerX, y: layerY, color: 's3', width: 2, dash: [8, 5], label: 'D = √Re: boundary-layer scale one cell' },
    { x: ptX, y: ptY, color: 'accent', points: 7, width: 0, label: 'this run' },
  ];

  slider(controls, { label: 'Reynolds number', min: RE_MIN, max: RE_MAX, log: true, value: P.Re, fmt: (v) => fmt(v, 3), onInput: (v) => ((P.Re = v), update()) });
  slider(controls, { label: 'Inflow speed U (cells per step)', min: 0.01, max: 0.4, step: 0.005, value: P.U, fmt: (v) => fmt(v, 3), onInput: (v) => ((P.U = v), update()) });
  slider(controls, { label: 'Cylinder diameter D (cells)', min: D_MIN, max: 400, log: true, value: P.D, fmt: (v) => String(Math.round(v)), onInput: (v) => ((P.D = Math.round(v)), update()) });

  const rTau = readout(readouts, { label: 'relaxation time τ' });
  const rMa = readout(readouts, { label: 'inflow Mach number U√3' });
  const rLayer = readout(readouts, { label: 'cells across D/√Re' });
  const rGrid = readout(readouts, { label: 'grid (20D × 6D)' });
  const rSteps = readout(readouts, { label: 'steps to cross the box once' });
  const rCost = readout(readouts, { label: 'cell updates, one crossing' });

  const hero = latticePlan(PRESETS.hero.Re, PRESETS.hero.U, PRESETS.hero.D);

  function update() {
    for (const l of lines) {
      l.y[0] = (RE_MIN * (l.tau - 0.5)) / (3 * P.U);
      l.y[1] = (RE_MAX * (l.tau - 0.5)) / (3 * P.U);
    }
    ptX[0] = P.Re;
    ptY[0] = P.D;
    plot.draw(series, {
      extra(ctx, tx, ty, area, pal) {
        ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        // The lines are parallel (slope 1), so labels at one height would
        // collide: label line i (largest tau first, leftmost) at a height
        // that steps down by a factor STAGGER per line.
        for (let i = 0; i < lines.length; i++) {
          const l = lines[lines.length - 1 - i];
          const d = D_MAX / (1.3 * STAGGER ** i);
          const re = (d * 3 * P.U) / (l.tau - 0.5);
          if (re < RE_MIN || re > RE_MAX / 2.5) continue;
          ctx.fillStyle = pal.css(l.tau < TAU_FLOOR + 1e-9 ? 'bad' : 'muted');
          ctx.fillText(`τ = ${l.tau}`, tx(re) + 4, ty(d) + 4);
        }
      },
    });

    const L = latticePlan(P.Re, P.U, P.D);
    const nearHalf = L.tau < TAU_FLOOR;
    const fast = L.Ma > MA_WARN;
    const thin = L.layerCells < 0.5;
    rTau.set(tauText(L.tau), nearHalf ? 'bad' : 'good');
    rMa.set(fmt(L.Ma, 3), fast ? 'bad' : 'good');
    rLayer.set(fmt(L.layerCells, 2), thin ? 'bad' : '');
    rGrid.set(`${L.nx} × ${L.ny} = ${sci(L.cells, 2)} cells`);
    rSteps.set(sci(L.steps, 2));
    const costRatio = L.updates / hero.updates;
    rCost.set(Math.abs(costRatio - 1) < 0.005 ? `${sci(L.updates, 2)} (the hero run)` : `${sci(L.updates, 2)} (×${fmt(costRatio, 3)} the hero run)`);

    const head = `Re ${fmt(P.Re, 3)} with D = ${P.D} cells and U = ${fmt(P.U, 3)} needs τ = ${tauText(L.tau)}.`;
    const issues = [];
    if (nearHalf) issues.push('τ is within 0.005 of ½, where the lattice chapter’s coarse runs blow up unless the grid is refined');
    if (fast) issues.push(`the inflow Mach number ${fmt(L.Ma, 2)} is above 0.3, and the flow speeds up further round the cylinder (in the hero run the peak is about twice the inflow value), so compressibility errors grow like Ma²`);
    if (thin) issues.push(`the boundary-layer scale D/√Re is only ${fmt(L.layerCells, 2)} of a cell, so the grid cannot resolve the layer`);
    if (issues.length) status.textContent = `${head} Trouble: ${issues.join('; and ')}.`;
    else {
      const cost = Math.abs(costRatio - 1) < 0.005 ? 'This is the hero run’s cost.' : `This run costs ${fmt(costRatio, 3)} times as much as the hero run per crossing of the box.`;
      status.textContent = `${head} τ, Mach number and resolution are all in the range the lattice chapter’s hero run uses. ${cost}`;
    }
  }

  update();
  return () => plot.destroy();
}
