// Scenario builders. Each returns a fresh Chamber plus how many intervals to
// run headless before the viewer takes over, and whether to settle the pressure
// first (so the first visible solve starts from a warm seed, as it would
// mid-simulation).

import * as P from './physics.js';
import { Chamber } from './solver.js';

const W = 16,
  H = 16;

// Pressure at depth below an open surface, for building near-equilibrium
// initial states (the solver will still find the exact one).
function hydrostatic(depthCells, rho = P.RHO) {
  return P.P_ATM + P.GRAVITY * rho * depthCells;
}

function airMassAt(p, T) {
  return 1 / P.gasVolume(P.R_AIR, T, p);
}

function fillTank(ch, waterline, Tw, Tair = P.T_ATM) {
  for (let y = 0; y < ch.h; y++)
    for (let x = 0; x < ch.w; x++) {
      const i = y * ch.w + x;
      if (y < waterline) ch.setCell(i, { air: airMassAt(P.P_ATM, Tair), T: Tair });
      else ch.setCell(i, { liquid: P.RHO, T: Tw });
    }
}

// An inverted cup: a solid lid with two short walls, trapping a gas pocket.
function cup(ch, { lid, left, right, depth, wallT = NaN }) {
  for (let x = left; x <= right; x++) ch.setSolid(lid * ch.w + x, wallT);
  for (let y = lid + 1; y <= lid + depth; y++) {
    ch.setSolid(y * ch.w + left, wallT);
    ch.setSolid(y * ch.w + right, wallT);
  }
}

export const SCENARIOS = [
  {
    id: 'still',
    name: 'Still water',
    blurb:
      'A tank of water under air, nothing happening. The first solve starts cold: the solver tries three seed guesses, keeps the best, and Newton finishes the job. Watch which seed wins and why.',
    build() {
      const ch = new Chamber(W, H);
      fillTank(ch, 6, 300);
      ch.drag = 2;
      return { ch, prelude: 0, settle: false };
    },
  },
  {
    id: 'hot',
    name: 'Sudden heating',
    blurb:
      'An air pocket trapped under an inverted cup gets a sudden burst of heat (300 K → 450 K). Its gas-law volume jumps by half, so its residual jumps to +0.5 cell volumes. Liquid cannot compress, so Newton must raise the pressure everywhere in a smooth, connected bump.',
    build() {
      const ch = new Chamber(W, H);
      fillTank(ch, 5, 300);
      cup(ch, { lid: 8, left: 5, right: 10, depth: 2 });
      for (let y = 9; y <= 10; y++)
        for (let x = 6; x <= 9; x++) {
          const p = hydrostatic(11 - 5); // a gas pocket sits at the pressure of its lower interface
          ch.setCell(y * W + x, { air: airMassAt(p, 300), T: 300 });
        }
      ch.drag = 2;
      return {
        ch,
        prelude: 0,
        settle: true,
        afterPrelude(ch) {
          for (let y = 9; y <= 10; y++)
            for (let x = 6; x <= 9; x++) {
              const i = y * W + x;
              ch.pulse[i] = ch.ma[i] * P.CP_AIR * 150; // +150 K at constant pressure
            }
        },
      };
    },
  },
  {
    id: 'cold',
    name: 'Sudden chill',
    blurb:
      'A pocket of warm, humid air (345 K, 95% saturated) is trapped under a cup whose walls are suddenly held at 290 K. Each interval the prepass conducts heat out of the cells touching the walls: their air contracts and vapour condenses to dew. The residual turns negative there, Newton lowers the pocket pressure, and water starts to climb into the cup.',
    build() {
      const ch = new Chamber(W, H);
      fillTank(ch, 5, 300);
      cup(ch, { lid: 8, left: 5, right: 10, depth: 2, wallT: 290 });
      const p = hydrostatic(11 - 5),
        T = 345;
      const xv = (0.95 * P.saturationPressurePa(T)) / (p * P.PA_PER_UNIT);
      const gasR = (p * P.PA_PER_UNIT) / (T * 1000); // Σ m·R that fills one cell
      for (let y = 9; y <= 10; y++)
        for (let x = 6; x <= 9; x++) ch.setCell(y * W + x, { vapour: (xv * gasR) / P.R_VAP, air: ((1 - xv) * gasR) / P.R_AIR, T });
      ch.drag = 2;
      return {
        ch,
        prelude: 0,
        settle: true,
        afterPrelude(ch) {
          ch.conductance = 30; // µJ per time-unit per K, per wall face
        },
      };
    },
  },
  {
    id: 'boil',
    name: 'Boiling pot',
    blurb:
      'Water at 373.1 K, a hair under its boiling point, sits on a burner under a headspace of steam. As the bottom cells cross saturation, vapour is born inside cells that had no gas at all. Its slope dO/dp is large and negative (more pressure, less boiling), and the Jacobian diagonal lights up exactly there.',
    build() {
      const ch = new Chamber(W, H);
      fillTank(ch, 6, 373.1);
      // Above a pot at the boil the air has been driven off: the headspace is steam.
      const Tsat = P.saturationTemperature(P.P_ATM * P.PA_PER_UNIT);
      for (let i = 0; i < 6 * W; i++) ch.setCell(i, { vapour: 1 / P.gasVolume(P.R_VAP, Tsat + 0.01, P.P_ATM), T: Tsat + 0.01 });
      // 3000 µJ per time-unit warms a liquid cell (≈4010 µJ/K) by ~0.75 K per 1/60 s.
      for (let x = 6; x <= 9; x++) ch.heater[(H - 1) * W + x] = 3000;
      ch.drag = 2;
      return { ch, prelude: 0, settle: true };
    },
  },
];
