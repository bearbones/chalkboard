// Chapter 5 (similarity): small data tables and closed forms for its figures.
//
// What this module does
//   (a) Water properties against temperature (for Reynolds's tubes): dynamic
//       viscosity and density, interpolated in tables of handbook values.
//   (b) Reynolds's three tube bores and the critical values the chapter
//       quotes, with the regime they imply for a given Re and inlet.
//   (c) The scenario table behind the "where does my flow sit?" figure:
//       each scenario states its length, speed and fluid, and
//       scenarioNumbers() turns them into Re, Ma and Fr.
//   (d) The complementary error function, and the self-similar collapse of
//       the heat-equation step (u = 1/2 erfc((x - 1/2)/sqrt(4 kappa t))),
//       measured on the Crank-Nicolson solver of diffusion.js.
//   (e) Lattice units: what a target Reynolds number costs a lattice
//       Boltzmann run (relaxation time, Mach number, cells and steps), using
//       the unit conversions of lbm.js.
//
// Conventions and units
//   SI units throughout; temperatures in degrees Celsius. No grids here
//   except the 1D heat grid of diffusion.js (nodes x_j = j/n on [0, 1]).
//
// Sources
//   Water viscosity: the IAPWS 2008 formulation at 0.1 MPa, M. L. Huber et
//     al., J. Phys. Chem. Ref. Data 38 (2009) 101, rounded to 4 figures.
//     Density: IAPWS-95 at 0.1 MPa, W. Wagner and A. Pruss, J. Phys. Chem.
//     Ref. Data 31 (2002) 387, rounded to 0.01 kg/m^3. ln(mu) and rho are
//     interpolated linearly in T between table rows (within about 0.5% of
//     the formulation between rows).
//   Reynolds's tubes and thresholds: Reynolds, Phil. Trans. R. Soc. 174
//     (1883) 935 (bores of nearly 1, 1/2 and 1/4 inch); thresholds converted
//     to modern Reynolds numbers by N. Rott, Annu. Rev. Fluid Mech. 22 (1990)
//     1 (lower about 2,020, upper about 12,830); Ekman (1910, cited by Rott),
//     laminar to about 44,000 with a smoothed inlet.
//   Air: about 20 degC at sea level (nu = 1.5e-5 m^2/s, c = 343 m/s); cruise
//     altitude from the International Standard Atmosphere at 11 km
//     (T = 216.65 K, rho = 0.3639 kg/m^3, mu = 1.422e-5 Pa s by Sutherland's
//     law, c = sqrt(1.4 * 287.05 * T)).
//   erfc: power series for |x| < 2.5, Lentz-style continued fraction beyond
//     (Abramowitz & Stegun 7.1.5 and 7.1.14); against a library erfc the
//     absolute error is below 1e-15 and the relative error below 1e-12.
//   Lattice units: nu = (tau - 1/2)/3 and c_s = 1/sqrt(3) for D2Q9 (lbm.js);
//     the box of 20 D by 6 D is the hero preset of lbm.js (240 x 72, D = 12).
//   Intermediate asymptotics: Barenblatt, Scaling, Self-similarity and
//     Intermediate Asymptotics (Cambridge, 1996), ch. 2.
//
// Deviations
//   - The time-step rule for the collapse, dt = max(dx^2/2, t/20) (kappa = 1),
//     is this chapter's choice: small steps while the front is a few cells
//     wide, then steps that grow with t so the run spans decades of time in a
//     couple of hundred steps. Crank-Nicolson stays stable for any dt; the
//     large late steps are harmless because the profile is smooth by then.

import { step } from './diffusion.js';
import { suggestTau, viscosity } from './lbm.js';

// ---------------------------------------------------------------------------
// (a) Water

// [T degC, mu mPa s] at 0.1 MPa (IAPWS 2008; Huber et al. 2009).
export const WATER_VISCOSITY_TABLE = [
  [0, 1.791],
  [5, 1.518],
  [10, 1.306],
  [15, 1.138],
  [20, 1.002],
  [25, 0.89],
  [30, 0.7972],
  [40, 0.6527],
  [50, 0.5465],
  [60, 0.4665],
];

// [T degC, rho kg/m^3] at 0.1 MPa (IAPWS-95; Wagner and Pruss 2002).
export const WATER_DENSITY_TABLE = [
  [0, 999.84],
  [4, 999.97],
  [10, 999.7],
  [20, 998.21],
  [30, 995.65],
  [40, 992.22],
  [50, 988.03],
  [60, 983.2],
];

export const WATER_T_RANGE = [0, 60];

function interp(table, T, log) {
  const n = table.length;
  const t = T < table[0][0] ? table[0][0] : T > table[n - 1][0] ? table[n - 1][0] : T;
  let k = 0;
  while (k < n - 2 && t > table[k + 1][0]) k++;
  const [t0, v0] = table[k];
  const [t1, v1] = table[k + 1];
  const w = (t - t0) / (t1 - t0);
  return log ? Math.exp(Math.log(v0) + w * (Math.log(v1) - Math.log(v0))) : v0 + w * (v1 - v0);
}

// Dynamic viscosity of water in Pa s (T in degC, clamped to 0-60).
export const waterViscosity = (T) => interp(WATER_VISCOSITY_TABLE, T, true) * 1e-3;
// Density of water in kg/m^3 (T in degC, clamped to 0-60).
export const waterDensity = (T) => interp(WATER_DENSITY_TABLE, T, false);
// Kinematic viscosity of water in m^2/s.
export const waterNu = (T) => waterViscosity(T) / waterDensity(T);

// ---------------------------------------------------------------------------
// (b) Reynolds's tubes and thresholds

const INCH = 0.0254;

// Nominal bores (Reynolds: "nearly" 1, 1/2 and 1/4 inch).
export const REYNOLDS_TUBES = [
  { id: 'one', label: '1 inch', D: INCH },
  { id: 'half', label: '½ inch', D: INCH / 2 },
  { id: 'quarter', label: '¼ inch', D: INCH / 4 },
];

// Critical values in modern terms. lower: disturbances die out below it.
// upper: how far a very still inlet kept the flow laminar. ekman: a smoothed
// inlet on the same apparatus. textbook: the conventional engineering value.
export const REYNOLDS_THRESHOLDS = {
  lower: 2020,
  upper: 12830,
  ekman: 44000,
  textbook: 2300,
};

// Inlet conditions for the figure, each with the Re at which steady flow is
// lost. A disturbed inlet loses it near the lower value.
export const REYNOLDS_INLETS = {
  disturbed: { id: 'disturbed', label: 'Disturbed inlet', Re: REYNOLDS_THRESHOLDS.lower },
  still: { id: 'still', label: 'Reynolds’s still tank', Re: REYNOLDS_THRESHOLDS.upper },
  smoothed: { id: 'smoothed', label: 'Ekman’s smoothed inlet', Re: REYNOLDS_THRESHOLDS.ekman },
};

// Pipe Reynolds number of water at T degC in a tube of bore D at mean speed U.
export const pipeReynolds = (U, D, T) => (U * D) / waterNu(T);

// Speed at which a tube of bore D reaches Reynolds number Re at T degC.
export const criticalSpeed = (Re, D, T) => (Re * waterNu(T)) / D;

// What the dye does at Re for a given inlet: 'direct' below the lower value,
// 'direct-unstable' between the lower value and the inlet's limit (laminar,
// but a large enough disturbance would no longer die out), 'sinuous' beyond
// the inlet's limit.
export function dyeRegime(Re, inlet = 'still') {
  const limit = REYNOLDS_INLETS[inlet]?.Re ?? REYNOLDS_THRESHOLDS.upper;
  if (Re < REYNOLDS_THRESHOLDS.lower) return 'direct';
  if (Re < limit) return 'direct-unstable';
  return 'sinuous';
}

// ---------------------------------------------------------------------------
// (c) Scenarios: where real flows sit

const G = 9.81;
const WATER = { name: 'water at 20 °C', nu: 1.0e-6, c: 1480 };
const AIR = { name: 'air at 20 °C', nu: 1.5e-5, c: 343 };
const ISA_T11 = 216.65;
const AIR_CRUISE = { name: 'air at 11 km', nu: 1.422e-5 / 0.3639, c: Math.sqrt(1.4 * 287.05 * ISA_T11) };
const BLOOD = { name: 'blood (3.5 mPa s, 1060 kg/m³)', nu: 3.5e-3 / 1060, c: 1570 };

// L: the length used in Re (and Fr where there is a free surface). Every
// number is a stated, rounded assumption, not a measurement.
export const SCENARIOS = [
  { id: 'bacterium', name: 'Swimming bacterium', L: 2e-6, lengthIs: 'body length 2 µm', U: 3e-5, speedIs: '30 µm/s', fluid: WATER, freeSurface: false },
  { id: 'capillary', name: 'Blood in a capillary', L: 8e-6, lengthIs: 'capillary bore 8 µm', U: 1e-3, speedIs: '1 mm/s', fluid: BLOOD, freeSurface: false },
  { id: 'bee', name: 'Bee in flight', L: 0.012, lengthIs: 'body length 12 mm', U: 5, speedIs: '5 m/s', fluid: AIR, freeSurface: false },
  { id: 'swimmer', name: 'Human swimmer', L: 2, lengthIs: 'body length 2 m', U: 1.5, speedIs: '1.5 m/s', fluid: WATER, freeSurface: true },
  { id: 'river', name: 'Lowland river', L: 2, lengthIs: 'depth 2 m', U: 1, speedIs: '1 m/s', fluid: WATER, freeSurface: true },
  { id: 'car', name: 'Car on a motorway', L: 4.5, lengthIs: 'length 4.5 m', U: 30, speedIs: '30 m/s (108 km/h)', fluid: AIR, freeSurface: false },
  { id: 'ship', name: 'Cargo ship', L: 100, lengthIs: 'hull length 100 m', U: 8, speedIs: '8 m/s (about 15.5 knots)', fluid: WATER, freeSurface: true },
  { id: 'airliner', name: 'Airliner wing at cruise', L: 5, lengthIs: 'wing chord 5 m', U: 250, speedIs: '250 m/s', fluid: AIR_CRUISE, freeSurface: false },
  { id: 'weather', name: 'Weather system', L: 1e6, lengthIs: 'width 1000 km', U: 10, speedIs: '10 m/s', fluid: AIR, freeSurface: false },
];

// Re, Ma and Fr of a scenario with its speed multiplied by `mult`. Fr is NaN
// without a free surface (it does not govern the flow there).
export function scenarioNumbers(s, mult = 1) {
  const U = s.U * mult;
  return {
    U,
    Re: (U * s.L) / s.fluid.nu,
    Ma: U / s.fluid.c,
    Fr: s.freeSurface ? U / Math.sqrt(G * s.L) : NaN,
  };
}

// ---------------------------------------------------------------------------
// (d) erfc and the self-similar heat step

export function erfc(x) {
  const ax = Math.abs(x);
  let r;
  if (ax < 2.5) {
    // erf(x) = 2/sqrt(pi) sum (-1)^k x^(2k+1) / (k! (2k+1))
    let sum = ax;
    let term = ax;
    const x2 = ax * ax;
    for (let k = 1; k < 200; k++) {
      term *= -x2 / k;
      const add = term / (2 * k + 1);
      sum += add;
      if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
    }
    r = 1 - (2 / Math.sqrt(Math.PI)) * sum;
  } else {
    // erfc(x) = exp(-x^2)/sqrt(pi) * 1/(x + (1/2)/(x + 1/(x + (3/2)/(x + ...))))
    let f = 0;
    for (let k = 60; k >= 1; k--) f = k / 2 / (ax + f);
    r = Math.exp(-ax * ax) / Math.sqrt(Math.PI) / (ax + f);
  }
  return x >= 0 ? r : 2 - r;
}

// The similarity solution of u_t = kappa u_xx for a unit step at x = 1/2 on
// an infinite line, as a function of eta = (x - 1/2)/sqrt(4 kappa t).
export const stepSimilarity = (eta) => 0.5 * erfc(eta);

// Front width s = sqrt(4 kappa t) of a heat state (diffusion.js).
export const frontWidth = (state) => Math.sqrt(4 * state.kappa * state.t);

// Time-step rule for the collapse figure (see Deviations).
export const collapseDt = (state) => Math.max((0.5 * state.dx * state.dx) / state.kappa, state.t / 20);

// Advance a Crank-Nicolson heat state (preset 'step') until its front width
// reaches s, landing on it exactly. Returns the number of steps taken.
export function advanceToWidth(state, s) {
  const tTarget = (s * s) / (4 * state.kappa);
  let k = 0;
  while (state.t < tTarget * (1 - 1e-12)) {
    let dt = collapseDt(state);
    if (state.t + dt > tTarget) dt = tTarget - state.t;
    step(state, { scheme: 'cn', dt });
    k++;
  }
  return k;
}

// Largest gap between the computed profile and the similarity solution,
// over all nodes: max_j |u_j - 1/2 erfc((x_j - 1/2)/s)|.
export function similarityGap(state) {
  const s = frontWidth(state);
  if (!(s > 0)) return NaN;
  let worst = 0;
  for (let j = 0; j < state.len; j++) {
    const d = Math.abs(state.u[j] - stepSimilarity((state.x[j] - 0.5) / s));
    if (d > worst) worst = d;
  }
  return worst;
}

// ---------------------------------------------------------------------------
// (e) Lattice units

// Box of the lattice plan, in cylinder diameters (the hero preset of lbm.js).
export const LATTICE_BOX = [20, 6];

// What it takes to run a cylinder at Reynolds number Re with D cells across
// it and inflow speed U (cells per step) in a 20 D x 6 D box:
// tau from lbm.js suggestTau, the lattice viscosity, Ma = U / c_s = U sqrt 3,
// the cell count, steps for the fluid to cross the box once, cell updates
// for that crossing, and D / sqrt(Re), the order of magnitude of the number
// of cells across the boundary layer on the cylinder (delta ~ D Re^-1/2).
export function latticePlan(Re, U, D) {
  const tau = suggestTau(Re, U, D);
  const nx = LATTICE_BOX[0] * D;
  const ny = LATTICE_BOX[1] * D;
  const cells = nx * ny;
  const steps = nx / U;
  return {
    tau,
    nu: viscosity(tau),
    Ma: U * Math.sqrt(3),
    nx,
    ny,
    cells,
    steps,
    updates: cells * steps,
    layerCells: D / Math.sqrt(Re),
  };
}
