// turbulence-spectrum: Pope's model spectrum (popeSpectrum and friends in
// src/sims/turbulence.js) at a chosen Reynolds number Re_L = k^2/(eps nu),
// in units with k = eps = 1 (so L = k^(3/2)/eps = 1). The plot is
// premultiplied, kappa E(kappa)/k and kappa D(kappa)/eps against log kappa,
// so the area under each curve left of a wavenumber is the fraction of the
// energy (or of the dissipation) held below it. A slider sets an LES
// cutoff kappa_c; the shaded area is what the LES resolves, the rest is
// what its subgrid model must carry. A button finds Pope's 80 % cutoff by
// bisection on popeResolved, run in slices across frames.
// Readouts: Re_lambda, kappa_c L, kappa_c eta, resolved TKE and dissipation
// (popeResolved), and the LES grid as a fraction of a DNS grid with
// kappa_max eta = 1.5, (kappa_c eta / 1.5)^3.
//
// The coefficients c_L, c_eta that make the spectrum integrate to k and eps
// (popeCoefficients) are solved after the first paint and cached per Re;
// until then the high-Re constants are used.
//
// data-preset: 'default' (Re_L = 10^5, kappa_c L = 10).

import { frame, slider, segmented, button, readout, sliced } from '../../kit/widgets.js';
import { Plot } from '../../kit/plot.js';
import { POPE_CONSTANTS, popeSpectrum, popeResolved, popeCoefficients } from '../../sims/turbulence.js';
import { presetFor, num, pct, pow10, vmark } from './common.js';

const NP = 220;
const RES = [1e3, 1e4, 1e5, 1e6, 1e8];
const PRESETS = { default: { re: 1e5, kc: 10 } };

export function mountSpectrum(fig, { signal }) {
  const pre = presetFor(fig, PRESETS);
  const cfg = { re: pre.re, kc: pre.kc };
  const f = frame(fig, { title: 'How much of the energy does an LES hold?', wide: true });
  const plot = new Plot(f.stage, {
    x: { label: 'wavenumber κL', log: true },
    y: { label: 'premultiplied spectrum', min: 0, max: 1 },
    aspect: 2.1,
    minHeight: 220,
    label: 'Premultiplied model energy and dissipation spectra against wavenumber on a log axis, with the resolved part left of the LES cutoff shaded',
  });

  const coef = new Map(); // Re -> { cL, cEta }
  const kap = new Float64Array(NP);
  const pe = new Float64Array(NP);
  const pd = new Float64Array(NP);
  const p = { k: 1, eps: 1, nu: 1 / cfg.re, cL: POPE_CONSTANTS.cL, cEta: POPE_CONSTANTS.cEta };
  let eta = 1;

  segmented(f.controls, {
    label: 'Re_L = k²/(εν)',
    options: RES.map((r) => [String(r), pow10(r)]),
    value: String(cfg.re),
    onChange: (v) => setRe(Number(v)),
  });
  const kcSl = slider(f.controls, { label: 'LES cutoff κ_c L', min: 1, max: 1e3, log: true, value: cfg.kc, fmt: (v) => num(v, 3), onInput: (v) => ((cfg.kc = v), show()) });
  const find = button(f.controls, { label: 'Find the 80 % cutoff', onClick: () => findCutoff() });

  const rRl = readout(f.readouts, { label: 'Re_λ = (20 Re_L/3)^½' });
  const rKc = readout(f.readouts, { label: 'κ_c η' });
  const rTke = readout(f.readouts, { label: 'energy resolved', title: 'Fraction of the turbulent kinetic energy at wavenumbers below the cutoff' });
  const rDiss = readout(f.readouts, { label: 'dissipation resolved', title: 'Fraction of the dissipation rate below the cutoff; the rest is the subgrid model’s job' });
  const rGrid = readout(f.readouts, { label: 'LES grid / DNS grid', title: '(κ_c η / 1.5)³: points in an LES with this cutoff over points in a DNS with κ_max η = 1.5' });

  function curve() {
    const c = coef.get(cfg.re);
    p.nu = 1 / cfg.re;
    p.cL = c ? c.cL : POPE_CONSTANTS.cL;
    p.cEta = c ? c.cEta : POPE_CONSTANTS.cEta;
    eta = Math.pow(p.nu ** 3 / p.eps, 0.25);
    const a = Math.log(0.05);
    const b = Math.log(3 / eta);
    let me = 0;
    let md = 0;
    for (let q = 0; q < NP; q++) {
      const k = Math.exp(a + ((b - a) * q) / (NP - 1));
      kap[q] = k;
      const E = popeSpectrum(k, p);
      pe[q] = k * E; // kappa E / k (k = 1)
      pd[q] = k * 2 * p.nu * k * k * E; // kappa D / eps (eps = 1)
      me = Math.max(me, pe[q]);
      md = Math.max(md, pd[q]);
    }
    // Scale both curves to the same peak height for display; the areas stay
    // in proportion within each curve, which is what the shading shows.
    for (let q = 0; q < NP; q++) {
      pe[q] /= me;
      pd[q] /= md;
    }
    plot.setAxes({ x: { min: 0.05, max: 3 / eta } });
    kcSl.input.max = String(Math.log10(1.5 / eta));
    if (cfg.kc > 1.5 / eta) kcSl.set(1.5 / eta, { silent: true });
    plot.draw(
      [
        { x: kap, y: pe, color: 's1', width: 2.5, label: 'energy, κE(κ)' },
        { x: kap, y: pd, color: 's2', width: 2.5, dash: [6, 3], label: 'dissipation, κD(κ)' },
      ],
      { under: shade, extra: marks },
    );
  }

  function shade(ctx, tx, ty, area, pal) {
    // resolved part of each curve: fill under it up to the cutoff
    for (const [arr, col] of [[pe, 's1'], [pd, 's2']]) {
      ctx.fillStyle = pal.css(col, 0.18);
      ctx.beginPath();
      ctx.moveTo(tx(kap[0]), ty(0));
      for (let q = 0; q < NP && kap[q] <= cfg.kc; q++) ctx.lineTo(tx(kap[q]), ty(arr[q]));
      ctx.lineTo(tx(Math.min(cfg.kc, kap[NP - 1])), ty(0));
      ctx.closePath();
      ctx.fill();
    }
  }

  function marks(ctx, tx, ty, area, pal) {
    vmark(ctx, tx, area, pal, cfg.kc, 'LES cutoff', { color: 'accent', dash: [], align: cfg.kc > 1 / eta / 30 ? 'right' : 'left' });
    vmark(ctx, tx, area, pal, 1, '1/L', { color: 'muted', align: 'left', top: false });
    vmark(ctx, tx, area, pal, 1 / eta, '1/η', { color: 'muted', align: 'right', top: false });
  }

  function show() {
    const r = popeResolved(cfg.kc, p);
    plot.render();
    rRl.set(num(Math.sqrt((20 * cfg.re) / 3), 3));
    rKc.set(num(cfg.kc * eta, 3));
    rTke.set(pct(r.tke), r.tke >= 0.8 ? 'good' : 'bad');
    rDiss.set(pct(r.dissipation));
    const g = Math.pow((cfg.kc * eta) / 1.5, 3);
    rGrid.set(g >= 1 ? '1 (this is a DNS)' : num(g, 2));
    const msg =
      r.tke >= 0.8
        ? `Resolves ${pct(r.tke)} of the energy (Pope's 80 % guideline met) but only ${pct(r.dissipation)} of the dissipation: the subgrid model must carry the rest.`
        : `Resolves ${pct(r.tke)} of the energy, short of Pope's 80 % guideline; the model carries most of the turbulence.`;
    if (f.status.textContent !== msg) f.status.textContent = msg;
  }

  function setRe(re) {
    cfg.re = re;
    curve();
    show();
    calibrate();
  }

  // Solve for c_L and c_eta at this Re after the current frame has painted.
  let pending = 0;
  function calibrate() {
    if (coef.has(cfg.re)) return;
    clearTimeout(pending);
    const re = cfg.re;
    pending = setTimeout(() => {
      if (signal?.aborted) return;
      const c = popeCoefficients(re);
      coef.set(re, { cL: c.cL, cEta: c.cEta });
      if (cfg.re === re) {
        curve();
        show();
      }
    }, 30);
  }
  signal?.addEventListener('abort', () => clearTimeout(pending));

  // Bisection in ln kappa for 80 % of the energy, one popeResolved per slice step.
  function* bisect(frac) {
    let lo = Math.log(0.05);
    let hi = Math.log(1.5 / eta);
    for (let it = 0; it < 40; it++) {
      const mid = 0.5 * (lo + hi);
      if (popeResolved(Math.exp(mid), p).tke < frac) lo = mid;
      else hi = mid;
      yield it;
    }
    return Math.exp(hi);
  }

  function findCutoff() {
    find.disabled = true;
    f.status.textContent = 'Searching…';
    sliced(bisect(0.8), { budgetMs: 6, signal })
      .then((kc) => {
        cfg.kc = kc;
        kcSl.set(kc, { silent: true });
        show();
      })
      .catch(() => {})
      .finally(() => (find.disabled = false));
  }

  curve();
  show();
  calibrate();
}
