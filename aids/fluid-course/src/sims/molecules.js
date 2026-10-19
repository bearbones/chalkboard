// The continuum hypothesis, three ways. Pure and DOM-free; the figures and
// the tests call the same functions.
//
// (a) Density is a statistical average. Points scattered by a homogeneous
//     Poisson process of mean number density n (2-D or 3-D, periodic box of
//     side L). Counting the points in a sample box of side ℓ gives a count
//     with mean N = nℓ^d and standard deviation √N, so the relative
//     fluctuation of the measured density is 1/√N: a "density at a point"
//     only makes sense once the box holds many molecules. Poisson counts are
//     drawn with Knuth's multiplicative method (Knuth, TAOCP vol. 2, 3rd ed.,
//     §3.4.1), summed over chunks of mean ≤ 500 so e^{−mean} never underflows.
//     The points are bucketed into a uniform grid of about 4 per cell by a
//     counting sort (O(N)), so counting a box visits only the cells it
//     overlaps and checks points only in its boundary cells. densitySamples()
//     is a generator that yields one event per sample box (so a figure can
//     drop the boxes one at a time); sampleDensity() drains it.
//
// (b) Velocity is a statistical average too. A small soft-disk molecular
//     dynamics (MD) box in reduced units: σ = ε = m = k_B = 1, so lengths are
//     in molecular diameters, energies in ε, temperature in ε/k_B and time in
//     τ = σ√(m/ε). Pair potential: WCA (Weeks, Chandler & Andersen 1971,
//     J. Chem. Phys. 54, 5237: Lennard-Jones cut at its minimum 2^{1/6}σ and
//     shifted up by ε, purely repulsive) or Lennard-Jones truncated at r_c
//     and shifted to zero there. Integrator: velocity Verlet (Swope,
//     Andersen, Berens & Wilson 1982, J. Chem. Phys. 76, 637; Allen &
//     Tildesley 2017, Computer Simulation of Liquids, 2nd ed., ch. 3),
//     second order, symplectic and time-reversible, so the energy error
//     oscillates at O(Δt²) instead of drifting. Forces from linked cell lists
//     with a half stencil (Allen & Tildesley 2017, ch. 5). x is periodic; y
//     is periodic, a specular (mirror) wall or a thermal wall at y = 0 and
//     y = L_y. Thermal walls re-emit a molecule that hits them with a
//     Maxwellian at the wall temperature and the wall velocity (diffuse
//     reflection with accommodation α, Maxwell 1879, Phil. Trans. R. Soc.
//     170, 231); the normal component is drawn from the flux-weighted
//     (Rayleigh) distribution. Moving thermal walls drive Couette flow; a
//     body force g along x between still walls drives Poiseuille flow; the
//     walls also remove viscous heat. They are not perfectly no-slip: the
//     fluid next to them lags the wall by roughly a mean free path times the
//     shear rate. Particle arrays are indexed by particle; coarse cells are
//     indexed i + j * nx with j = 0 at the bottom wall.
//     Coarse-graining: cellAverages() bins molecules into nx × ny cells and
//     returns number density, mean velocity and temperature per cell. With
//     n_c molecules in a cell, each component of the cell-mean velocity has
//     thermal noise of standard deviation √(k_B T / m n_c): it shrinks like
//     (cell area)^{−1/2}. (In a periodic box the total momentum is fixed, so
//     the variance carries a factor 1 − n_c/N, as in sampling without
//     replacement.)
//
// (c) Gas facts in SI units. Mean free path of hard spheres of diameter d,
//     λ = k_B T / (√2 π d² p) (Maxwell 1860; Vincenti & Kruger 1965,
//     Introduction to Physical Gas Dynamics, ch. 1; Bird 1994, Molecular Gas
//     Dynamics and the Direct Simulation of Gas Flows, ch. 1). The effective
//     diameter of an "air molecule" depends on the molecular model; with the
//     usual round d = 3.7e-10 m the formula gives 65.7 nm at 20 °C and 1 atm,
//     and published values for air at room conditions are 65–68 nm (e.g.
//     Jennings 1988, J. Aerosol Sci. 19, 159).
//     Knudsen number Kn = λ / L with regimes continuum < 0.01 < slip < 0.1 <
//     transition < 10 < free molecular (Schaaf & Chambré 1958; Karniadakis,
//     Beskok & Aluru 2005, Microflows and Nanoflows, ch. 1). Number density
//     n = p / k_B T; at 0 °C and 1 atm this is the Loschmidt constant
//     n₀ = 2.686 780 111 × 10²⁵ m⁻³ (CODATA 2018, exact since the 2019 SI).

import { rng, gaussian, drain } from './util.js';

// ---- (c) gas facts ---------------------------------------------------------------

export const KB = 1.380649e-23; // Boltzmann constant, J/K (exact)
export const NA = 6.02214076e23; // Avogadro constant, 1/mol (exact)
export const ATM = 101325; // standard atmosphere, Pa (exact)
export const T0 = 273.15; // 0 °C in K
export const LOSCHMIDT = ATM / (KB * T0); // m⁻³ at 0 °C, 1 atm: 2.6867801e25

// "Air molecule" for textbook estimates. d is an effective hard-sphere
// diameter (the value depends on the molecular model; 3.7e-10 m is the usual
// round number). molarMass is that of dry air.
export const AIR = {
  d: 3.7e-10, // m
  molarMass: 28.9647e-3, // kg/mol
  m: 28.9647e-3 / 6.02214076e23, // kg per molecule, ≈ 4.81e-26
};

// Molecules per cubic metre of an ideal gas at pressure p (Pa), temperature T (K).
export const numberDensity = (p = ATM, T = T0) => p / (KB * T);

// Hard-sphere mean free path in metres.
export function meanFreePath({ T = 293.15, p = ATM, d = AIR.d } = {}) {
  return (KB * T) / (Math.SQRT2 * Math.PI * d * d * p);
}

// Mean molecular speed √(8 k_B T / π m), m/s.
export const meanSpeed = (T = 293.15, m = AIR.m) => Math.sqrt((8 * KB * T) / (Math.PI * m));

export const knudsen = (lambda, L) => lambda / L;

export const KNUDSEN_REGIMES = [
  { id: 'continuum', name: 'Continuum', min: 0, max: 0.01, description: 'Navier–Stokes with no-slip walls works.' },
  { id: 'slip', name: 'Slip flow', min: 0.01, max: 0.1, description: 'Navier–Stokes still works in the bulk, but the gas slips and jumps in temperature at walls.' },
  { id: 'transition', name: 'Transition', min: 0.1, max: 10, description: 'Neither continuum nor free-molecular: solve the Boltzmann equation (e.g. DSMC).' },
  { id: 'free-molecular', name: 'Free molecular', min: 10, max: Infinity, description: 'Molecules hit walls far more often than each other.' },
];

export function knudsenRegime(Kn) {
  for (const r of KNUDSEN_REGIMES) if (Kn < r.max) return r;
  return KNUDSEN_REGIMES[KNUDSEN_REGIMES.length - 1];
}

// Expected number of molecules in a cube of side L (m) at p, T (default 0 °C, 1 atm).
export function moleculesInCube(L, { p = ATM, T = T0 } = {}) {
  return numberDensity(p, T) * L * L * L;
}

// Formulas a figure or chapter can show next to these numbers (JS strings,
// so TeX backslashes are doubled).
export const GAS_FORMULAS = {
  meanFreePath: {
    name: 'Mean free path (hard spheres)',
    tex: '\\lambda = \\frac{k_B T}{\\sqrt{2}\\,\\pi d^2 p} = \\frac{1}{\\sqrt{2}\\,\\pi d^2 n}',
    description: 'Average distance a molecule travels between collisions; the √2 accounts for the motion of the molecules it hits (Maxwell 1860).',
  },
  numberDensity: {
    name: 'Ideal-gas number density',
    tex: 'n = \\frac{p}{k_B T}',
    description: 'Molecules per unit volume; at 0 °C and 1 atm it is the Loschmidt constant.',
  },
  loschmidt: {
    name: 'Loschmidt constant',
    tex: 'n_0 = \\frac{p_0}{k_B T_0} = 2.687 \\times 10^{25}\\ \\mathrm{m^{-3}}',
    description: 'Molecules per cubic metre of an ideal gas at 0 °C and 101 325 Pa (exact in the 2019 SI).',
  },
  knudsen: {
    name: 'Knudsen number',
    tex: '\\mathrm{Kn} = \\frac{\\lambda}{L}',
    description: 'Mean free path over the length scale of the flow: continuum below 0.01, slip to 0.1, transition to 10, free molecular above.',
  },
  meanSpeed: {
    name: 'Mean molecular speed',
    tex: '\\bar{c} = \\sqrt{\\frac{8 k_B T}{\\pi m}}',
    description: 'Mean speed of a Maxwell–Boltzmann gas: about 460 m/s for air at room temperature.',
  },
  fluctuation: {
    name: 'Density fluctuation',
    tex: '\\frac{\\sigma_N}{\\langle N \\rangle} = \\frac{1}{\\sqrt{N}},\\quad N = n \\ell^d',
    description: 'Relative scatter of the molecule count in a sample box of side ℓ (Poisson statistics).',
  },
  cellNoise: {
    name: 'Noise of a cell-mean velocity',
    tex: '\\sigma_{\\bar{u}} = \\sqrt{\\frac{k_B T}{m\\, n_c}}',
    description: 'Thermal noise of the mean velocity of n_c molecules: it fades like the inverse square root of the averaging cell size.',
  },
};
for (const id of Object.keys(GAS_FORMULAS)) GAS_FORMULAS[id].id = id;

// Side of the sample box (m) whose density fluctuation is rel (e.g. 0.01),
// from 1/√(n L^dim) = rel.
export function boxForFluctuation(rel, n = LOSCHMIDT, dim = 3) {
  return Math.pow(1 / (rel * rel * n), 1 / dim);
}

// ---- (a) Poisson gas and density sampling -------------------------------------------

// One Poisson(mean) sample.
export function poissonSample(mean, rand) {
  let total = 0;
  let left = mean;
  while (left > 0) {
    const chunk = Math.min(left, 500);
    left -= chunk;
    const limit = Math.exp(-chunk);
    let prod = rand();
    let k = 0;
    while (prod > limit) {
      prod *= rand();
      k++;
    }
    total += k;
  }
  return total;
}

// A periodic box of side L (dim = 2 or 3) filled by a Poisson process of mean
// density n: the count is Poisson(n L^dim) and the positions are uniform.
// The points are stored grouped by grid cell (G cells per side, about 4
// points per cell; the order of iid points carries no information): the
// points of cell c = i + G·(j + G·k) are x[start[c] .. start[c + 1]). O(N).
export function createPoissonGas({ n = 1, L = 100, dim = 2, seed = 1 } = {}) {
  const rand = rng(seed);
  const count = poissonSample(n * Math.pow(L, dim), rand);
  const px = new Float64Array(count);
  const py = new Float64Array(count);
  const pz = dim === 3 ? new Float64Array(count) : null;
  for (let k = 0; k < count; k++) {
    px[k] = rand() * L;
    py[k] = rand() * L;
    if (pz) pz[k] = rand() * L;
  }
  const G = Math.max(1, Math.min(dim === 3 ? 64 : 512, Math.round(Math.pow(count / 4, 1 / dim))));
  const cs = L / G;
  const ncell = dim === 3 ? G * G * G : G * G;
  const cellOf = new Int32Array(count);
  const start = new Int32Array(ncell + 1);
  const bin = (v) => {
    const i = Math.floor(v / cs);
    return i >= G ? G - 1 : i < 0 ? 0 : i;
  };
  for (let k = 0; k < count; k++) {
    const c = bin(px[k]) + G * (bin(py[k]) + (pz ? G * bin(pz[k]) : 0));
    cellOf[k] = c;
    start[c + 1]++;
  }
  for (let c = 0; c < ncell; c++) start[c + 1] += start[c];
  const fill = start.slice(0, ncell);
  const x = new Float64Array(count);
  const y = new Float64Array(count);
  const z = pz ? new Float64Array(count) : null;
  for (let k = 0; k < count; k++) {
    const i = fill[cellOf[k]]++;
    x[i] = px[k];
    y[i] = py[k];
    if (z) z[i] = pz[k];
  }
  return { n, L, dim, count, x, y, z, G, cellSize: cs, start };
}

// Number of points in the box [x0, x0 + ℓ) × [y0, y0 + ℓ) (× [z0, z0 + ℓ) in
// 3-D), wrapping periodically. Needs ℓ ≤ L; corners are wrapped into
// [0, L). Visits the grid cells the box overlaps: a cell wholly inside adds
// its count, a boundary cell checks its points. Cost ~ (ℓ/cell)^d cells plus
// the points of the ~2d(ℓ/cell)^{d−1} boundary cells. No allocation.
export function countInBox(gas, x0, y0, z0, ell) {
  const { L, G, cellSize: cs, start, x, y, z } = gas;
  const X0 = x0 - Math.floor(x0 / L) * L;
  const Y0 = y0 - Math.floor(y0 / L) * L;
  const Z0 = z ? z0 - Math.floor(z0 / L) * L : 0;
  // Unwrapped cell ranges, at most G cells per axis (each cell once).
  const ix0 = Math.floor(X0 / cs);
  const iy0 = Math.floor(Y0 / cs);
  const iz0 = z ? Math.floor(Z0 / cs) : 0;
  const nxv = Math.min(G, Math.floor((X0 + ell) / cs) - ix0 + 1);
  const nyv = Math.min(G, Math.floor((Y0 + ell) / cs) - iy0 + 1);
  const nzv = z ? Math.min(G, Math.floor((Z0 + ell) / cs) - iz0 + 1) : 1;
  // A cell counts as wholly inside only with a margin, so points that sit
  // within round-off of the box edge are always checked one by one.
  const eps = 1e-9 * L;
  let c = 0;
  for (let a = 0; a < nzv; a++) {
    const izu = iz0 + a;
    const iz = izu >= G ? izu - G : izu;
    const fullZ = !z || (izu * cs - Z0 >= eps && Z0 + ell - (izu + 1) * cs >= eps);
    for (let b = 0; b < nyv; b++) {
      const iyu = iy0 + b;
      const iy = iyu >= G ? iyu - G : iyu;
      const fullY = iyu * cs - Y0 >= eps && Y0 + ell - (iyu + 1) * cs >= eps;
      const row = G * (iy + G * iz);
      for (let e = 0; e < nxv; e++) {
        const ixu = ix0 + e;
        const cell = (ixu >= G ? ixu - G : ixu) + row;
        const s0 = start[cell];
        const s1 = start[cell + 1];
        const fullX = ixu * cs - X0 >= eps && X0 + ell - (ixu + 1) * cs >= eps;
        if (fullX && fullY && fullZ) {
          c += s1 - s0;
          continue;
        }
        for (let k = s0; k < s1; k++) {
          if (!fullX) {
            let d = x[k] - X0;
            if (d < 0) d += L;
            if (d >= ell) continue;
          }
          if (!fullY) {
            let d = y[k] - Y0;
            if (d < 0) d += L;
            if (d >= ell) continue;
          }
          if (!fullZ) {
            let d = z[k] - Z0;
            if (d < 0) d += L;
            if (d >= ell) continue;
          }
          c++;
        }
      }
    }
  }
  return c;
}

function densityStats(gas, ell, trials, s, ss) {
  const mean = s / trials;
  const variance = trials > 1 ? (ss - trials * mean * mean) / (trials - 1) : 0;
  const std = Math.sqrt(Math.max(variance, 0));
  const expected = gas.n * Math.pow(ell, gas.dim);
  return {
    ell,
    expected,
    mean,
    std,
    relative: mean > 0 ? std / mean : Infinity,
    predicted: 1 / Math.sqrt(expected),
    density: mean / Math.pow(ell, gas.dim),
  };
}

// Drop `trials` sample boxes of side ℓ at random places and count the points
// in each. Yields { t: 'op', op: 'box', k, x0, y0, z0, ell, count } per box
// (a figure can draw each box as it lands) and returns { ell, expected,
// mean, std, relative = std/mean, predicted = 1/√(nℓ^d), density }. Keep ℓ
// well below L: boxes that overlap a lot are correlated.
export function* densitySamples(gas, ell, trials = 200, seed = 7) {
  const rand = rng(seed);
  let s = 0;
  let ss = 0;
  for (let k = 0; k < trials; k++) {
    const x0 = rand() * gas.L;
    const y0 = rand() * gas.L;
    const z0 = gas.dim === 3 ? rand() * gas.L : 0;
    const c = countInBox(gas, x0, y0, z0, ell);
    s += c;
    ss += c * c;
    yield { t: 'op', op: 'box', k, x0, y0, z0, ell, count: c };
  }
  return densityStats(gas, ell, trials, s, ss);
}

// The same measurement, run to completion.
export function sampleDensity(gas, ell, trials = 200, seed = 7) {
  return drain(densitySamples(gas, ell, trials, seed));
}

// A sweep over sample-box sizes for a log–log figure drained across frames:
// forwards every box event of densitySamples, then yields { t: 'iter', k,
// ell, expected, relative, predicted } when a size is done, and returns the
// array of results. One box costs well under 0.1 ms in node at the course's
// sizes (L = 160 in 2-D, L = 30 in 3-D), so sliced() can pace it freely.
export function* densitySweep(gas, ells, trials = 200, seed = 7) {
  const out = [];
  for (let k = 0; k < ells.length; k++) {
    const r = yield* densitySamples(gas, ells[k], trials, seed + k);
    out.push(r);
    yield { t: 'iter', k, ell: r.ell, expected: r.expected, relative: r.relative, predicted: r.predicted };
  }
  return out;
}

// Least-squares fit of y = C x^p on log axes. Returns { exponent, prefactor, r2 }.
export function fitPowerLaw(xs, ys) {
  const n = xs.length;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let k = 0; k < n; k++) {
    const a = Math.log(xs[k]);
    const b = Math.log(ys[k]);
    sx += a;
    sy += b;
    sxx += a * a;
    sxy += a * b;
    syy += b * b;
  }
  const cov = sxy - (sx * sy) / n;
  const vx = sxx - (sx * sx) / n;
  const vy = syy - (sy * sy) / n;
  const exponent = cov / vx;
  const prefactor = Math.exp((sy - exponent * sx) / n);
  return { exponent, prefactor, r2: (cov * cov) / (vx * vy) };
}

// ---- (b) molecular dynamics box ------------------------------------------------------

const RC_WCA = Math.pow(2, 1 / 6);

export const MD_DEFAULTS = {
  N: 400,
  density: 0.4, // molecules per σ² (area fraction πρ/4 ≈ 0.31)
  aspect: 1.5, // Lx / Ly
  T: 1, // initial temperature (and wall temperature)
  dt: 0.005,
  potential: 'wca', // 'wca' | 'lj'
  rc: 2.5, // cut-off for 'lj'
  walls: 'periodic', // 'periodic' | 'specular' | 'thermal' (in y)
  wallU: [0, 0], // [bottom, top] wall velocities (thermal walls)
  wallT: null, // wall temperature (default T)
  accommodation: 1, // fraction of wall hits re-emitted diffusely (thermal walls)
  g: 0, // body force per unit mass along x
  flow: null, // initial mean flow: null | 'shear' | 'taylor-green' | 'couette'
  U0: 1, // its amplitude
  seed: 1,
};

// stepsPerFrame: a suggested animation rate. At N = 400 a step costs
// 0.03–0.045 ms in node (assume 3–5× that on a phone), so 30 steps a frame
// stay inside a phone's ~8 ms frame budget; at 30 a frame the Poiseuille
// channel takes ~11 s at 60 fps to settle. Measured in these boxes (ρ = 0.4,
// T ≈ 1–1.6): kinematic viscosity ν ≈ 1.1 σ²/τ.
export const MD_PRESETS = {
  equilibrium: {
    name: 'Gas at rest',
    description: 'A periodic box in equilibrium. Every molecule moves fast, yet the coarse-grained velocity is zero: the noise you see is pure sampling error.',
    params: { walls: 'periodic' },
    stepsPerFrame: 4,
  },
  vortex: {
    name: 'Hidden vortices',
    description: 'Four counter-rotating cells (a Taylor–Green velocity) added to the thermal motion. Invisible in single molecules, obvious in large averaging cells; it decays as viscosity acts.',
    params: { walls: 'periodic', flow: 'taylor-green', U0: 1 },
    stepsPerFrame: 4,
  },
  couette: {
    name: 'Sliding walls (Couette)',
    description: 'The walls slide in opposite directions at speed 1 (about the thermal speed). Time-averaged in slabs, the molecular velocities fall on the straight continuum profile, with a little slip at each wall. Viscous heating warms the gas to T ≈ 1.3; the walls carry the heat away.',
    params: { walls: 'thermal', wallU: [-1, 1], flow: 'couette', aspect: 3 },
    stepsPerFrame: 20,
  },
  poiseuille: {
    name: 'Pushed channel (Poiseuille)',
    description: 'A body force g = 0.03 drives the gas along a channel between still walls, starting from rest. The slab-averaged profile grows into a parabola on the viscous time L_y²/(π²ν) ≈ 30 τ (about 6,000 steps, with ν ≈ 1 in reduced units) and settles after about 20,000 steps, with a centreline speed near gL_y²/(8ν) ≈ 1.2. Viscous heating warms the gas to T ≈ 1.6.',
    params: { walls: 'thermal', g: 0.03, aspect: 3 },
    stepsPerFrame: 30,
  },
};

for (const id of Object.keys(MD_PRESETS)) MD_PRESETS[id].id = id;

// The imposed initial mean flow (also the reference a figure can overlay).
export function mdMeanFlow(md, x, y, out) {
  const { flow, U0, Lx, Ly, wallU } = md;
  out[0] = 0;
  out[1] = 0;
  if (flow === 'shear') {
    out[0] = U0 * Math.sin((2 * Math.PI * y) / Ly);
  } else if (flow === 'taylor-green') {
    const kx = (2 * Math.PI) / Lx;
    const ky = (2 * Math.PI) / Ly;
    out[0] = U0 * Math.sin(kx * x) * Math.cos(ky * y);
    out[1] = -U0 * (kx / ky) * Math.cos(kx * x) * Math.sin(ky * y);
  } else if (flow === 'couette') {
    out[0] = wallU[0] + ((wallU[1] - wallU[0]) * y) / Ly;
  }
  return out;
}

export function createMD(opts = {}) {
  const o = { ...MD_DEFAULTS, ...opts };
  const N = o.N;
  const area = N / o.density;
  const Ly = Math.sqrt(area / o.aspect);
  const Lx = area / Ly;
  const lj = o.potential === 'lj';
  const rc = lj ? o.rc : RC_WCA;
  const irc6 = 1 / Math.pow(rc, 6);
  const shift = lj ? -4 * irc6 * (irc6 - 1) : 1;
  const periodicY = o.walls === 'periodic';
  let ncx = Math.floor(Lx / rc);
  let ncy = Math.floor(Ly / rc);
  if (ncx < 3 || (periodicY && ncy < 3)) {
    ncx = 1;
    ncy = 1;
  }
  const md = {
    N,
    Lx,
    Ly,
    dt: o.dt,
    t: 0,
    steps: 0,
    potential: o.potential,
    rc,
    rc2: rc * rc,
    shift,
    walls: o.walls,
    periodicY,
    wallU: [o.wallU[0], o.wallU[1]],
    wallT: o.wallT ?? o.T,
    accommodation: o.accommodation,
    g: o.g,
    flow: o.flow,
    U0: o.U0,
    T: o.T,
    x: new Float64Array(N),
    y: new Float64Array(N),
    vx: new Float64Array(N),
    vy: new Float64Array(N),
    ax: new Float64Array(N),
    ay: new Float64Array(N),
    ncx,
    ncy,
    cw: Lx / ncx,
    ch: Ly / ncy,
    head: new Int32Array(ncx * ncy),
    next: new Int32Array(N),
    pe: 0, // potential energy after the last force evaluation
    virial: 0, // Σ r·F over pairs
    wallImpulse: new Float64Array(2), // x-momentum given to the gas by the [bottom, top] wall since creation
    rand: rng(o.seed),
  };
  // Square lattice, slightly jittered; spacing √(1/ρ) > 2^{1/6} at ρ < 0.79.
  const nx = Math.ceil(Math.sqrt(N * o.aspect));
  const ny = Math.ceil(N / nx);
  const sx = Lx / nx;
  const sy = Ly / ny;
  const rand = md.rand;
  for (let k = 0; k < N; k++) {
    const i = k % nx;
    const j = (k / nx) | 0;
    md.x[k] = (i + 0.5 + 0.1 * (rand() - 0.5)) * sx;
    md.y[k] = (j + 0.5 + 0.1 * (rand() - 0.5)) * sy;
  }
  // Maxwellian velocities, zero total momentum, exact initial temperature.
  let mx = 0;
  let my = 0;
  for (let k = 0; k < N; k++) {
    md.vx[k] = gaussian(rand);
    md.vy[k] = gaussian(rand);
    mx += md.vx[k];
    my += md.vy[k];
  }
  mx /= N;
  my /= N;
  let ke = 0;
  for (let k = 0; k < N; k++) {
    md.vx[k] -= mx;
    md.vy[k] -= my;
    ke += 0.5 * (md.vx[k] * md.vx[k] + md.vy[k] * md.vy[k]);
  }
  const scale = Math.sqrt((o.T * mdDegreesOfFreedom(md)) / (2 * ke));
  const mean = new Float64Array(2);
  for (let k = 0; k < N; k++) {
    mdMeanFlow(md, md.x[k], md.y[k], mean);
    md.vx[k] = md.vx[k] * scale + mean[0];
    md.vy[k] = md.vy[k] * scale + mean[1];
  }
  computeForces(md);
  return md;
}

// Kinetic degrees of freedom: 2N − 2 when total momentum is conserved
// (periodic box, no body force), else 2N.
export function mdDegreesOfFreedom(md) {
  return md.periodicY && md.g === 0 ? 2 * md.N - 2 : 2 * md.N;
}

// Half stencil: own cell, then E, NW, N, NE. Each pair is visited once.
const OFF_X = [0, 1, -1, 0, 1];
const OFF_Y = [0, 0, 1, 1, 1];

function computeForces(md) {
  const { N, x, y, ax, ay, head, next, ncx, ncy, cw, ch, Lx, Ly, periodicY, rc2, shift, g } = md;
  const hx = 0.5 * Lx;
  const hy = 0.5 * Ly;
  head.fill(-1);
  for (let i = 0; i < N; i++) {
    let cx = (x[i] / cw) | 0;
    if (cx >= ncx) cx = ncx - 1;
    else if (cx < 0) cx = 0;
    let cy = (y[i] / ch) | 0;
    if (cy >= ncy) cy = ncy - 1;
    else if (cy < 0) cy = 0;
    const c = cx + cy * ncx;
    next[i] = head[c];
    head[c] = i;
    ax[i] = g;
    ay[i] = 0;
  }
  const nOff = ncx === 1 && ncy === 1 ? 1 : 5;
  let pe = 0;
  let virial = 0;
  for (let cy = 0; cy < ncy; cy++) {
    for (let cx = 0; cx < ncx; cx++) {
      const c = cx + cy * ncx;
      if (head[c] < 0) continue;
      for (let o = 0; o < nOff; o++) {
        let ox = cx + OFF_X[o];
        let oy = cy + OFF_Y[o];
        if (ox >= ncx) ox -= ncx;
        else if (ox < 0) ox += ncx;
        if (oy >= ncy) {
          if (!periodicY) continue;
          oy -= ncy;
        }
        const c2 = ox + oy * ncx;
        for (let i = head[c]; i >= 0; i = next[i]) {
          const xi = x[i];
          const yi = y[i];
          let fxi = 0;
          let fyi = 0;
          for (let j = o === 0 ? next[i] : head[c2]; j >= 0; j = next[j]) {
            let dx = xi - x[j];
            if (dx > hx) dx -= Lx;
            else if (dx < -hx) dx += Lx;
            let dy = yi - y[j];
            if (periodicY) {
              if (dy > hy) dy -= Ly;
              else if (dy < -hy) dy += Ly;
            }
            const r2 = dx * dx + dy * dy;
            if (r2 >= rc2) continue;
            const ir2 = 1 / r2;
            const ir6 = ir2 * ir2 * ir2;
            const fr = 24 * ir2 * ir6 * (2 * ir6 - 1); // |F| / r
            const fx = fr * dx;
            const fy = fr * dy;
            fxi += fx;
            fyi += fy;
            ax[j] -= fx;
            ay[j] -= fy;
            pe += 4 * ir6 * (ir6 - 1) + shift;
            virial += fr * r2;
          }
          ax[i] += fxi;
          ay[i] += fyi;
        }
      }
    }
  }
  md.pe = pe;
  md.virial = virial;
}

// Bounce a molecule that crossed a y-wall during the drift.
function wallHit(md, i, top) {
  const { y, vx, vy, Ly, rand } = md;
  y[i] = top ? 2 * Ly - y[i] : -y[i];
  if (md.walls === 'thermal' && rand() < md.accommodation) {
    const s = Math.sqrt(md.wallT);
    const old = vx[i];
    vx[i] = md.wallU[top ? 1 : 0] + s * gaussian(rand);
    let u = rand();
    while (u === 0) u = rand();
    const vn = s * Math.sqrt(-2 * Math.log(u));
    vy[i] = top ? -vn : vn;
    md.wallImpulse[top ? 1 : 0] += vx[i] - old;
  } else {
    vy[i] = -vy[i];
  }
}

// Advance the box by `steps` velocity-Verlet steps of md.dt. No allocation.
export function mdStep(md, steps = 1) {
  const { N, x, y, vx, vy, ax, ay, Lx, Ly, periodicY } = md;
  for (let s = 0; s < steps; s++) {
    const dt = md.dt;
    const h = 0.5 * dt;
    for (let i = 0; i < N; i++) {
      vx[i] += h * ax[i];
      vy[i] += h * ay[i];
      let xi = x[i] + dt * vx[i];
      if (xi >= Lx) xi -= Lx;
      else if (xi < 0) xi += Lx;
      x[i] = xi;
      const yi = y[i] + dt * vy[i];
      y[i] = yi;
      if (periodicY) {
        if (yi >= Ly) y[i] = yi - Ly;
        else if (yi < 0) y[i] = yi + Ly;
      } else if (yi < 0) wallHit(md, i, false);
      else if (yi > Ly) wallHit(md, i, true);
    }
    computeForces(md);
    for (let i = 0; i < N; i++) {
      vx[i] += h * ax[i];
      vy[i] += h * ay[i];
    }
    md.t += dt;
    md.steps++;
  }
}

// Energies and momentum. Temperature is 2·KE / (degrees of freedom).
export function mdEnergy(md, out = {}) {
  const { N, vx, vy } = md;
  let ke = 0;
  let px = 0;
  let py = 0;
  for (let i = 0; i < N; i++) {
    ke += 0.5 * (vx[i] * vx[i] + vy[i] * vy[i]);
    px += vx[i];
    py += vy[i];
  }
  out.kinetic = ke;
  out.potential = md.pe;
  out.total = ke + md.pe;
  out.temperature = (2 * ke) / mdDegreesOfFreedom(md);
  out.px = px;
  out.py = py;
  // Virial pressure (2-D): P = (N T + ½ Σ r·F) / A.
  out.pressure = (N * out.temperature + 0.5 * md.virial) / (md.Lx * md.Ly);
  return out;
}

// ---- coarse-graining --------------------------------------------------------------

export function createCellAverages(nx, ny) {
  const n = nx * ny;
  return {
    nx,
    ny,
    count: new Float64Array(n), // molecules per cell
    rho: new Float64Array(n), // number density
    u: new Float64Array(n), // mean velocity (0 in an empty cell)
    v: new Float64Array(n),
    T: new Float64Array(n), // ½⟨|v − ū|²⟩ (0 with fewer than 2 molecules)
  };
}

function binOf(md, i, nx, ny) {
  let cx = ((md.x[i] / md.Lx) * nx) | 0;
  if (cx >= nx) cx = nx - 1;
  else if (cx < 0) cx = 0;
  let cy = ((md.y[i] / md.Ly) * ny) | 0;
  if (cy >= ny) cy = ny - 1;
  else if (cy < 0) cy = 0;
  return cx + cy * nx;
}

// Instantaneous coarse-grained fields on nx × ny cells covering the box.
// out from createCellAverages(nx, ny); allocated if omitted.
export function cellAverages(md, nx, ny, out = null) {
  const o = out ?? createCellAverages(nx, ny);
  const { count, rho, u, v, T } = o;
  count.fill(0);
  u.fill(0);
  v.fill(0);
  T.fill(0);
  for (let i = 0; i < md.N; i++) {
    const c = binOf(md, i, nx, ny);
    count[c]++;
    u[c] += md.vx[i];
    v[c] += md.vy[i];
    T[c] += md.vx[i] * md.vx[i] + md.vy[i] * md.vy[i];
  }
  const cellArea = (md.Lx * md.Ly) / (nx * ny);
  for (let c = 0; c < nx * ny; c++) {
    const n = count[c];
    rho[c] = n / cellArea;
    if (n > 0) {
      u[c] /= n;
      v[c] /= n;
    }
    // Σ|v − ū|² = Σ|v|² − n|ū|²; unbiased with n − 1, divided by 2 dof.
    T[c] = n > 1 ? (T[c] - n * (u[c] * u[c] + v[c] * v[c])) / (2 * (n - 1)) : 0;
  }
  return o;
}

// Time averaging on top of space averaging: accumulate snapshots, then read
// the averages. Mean velocity is molecule-weighted (total momentum over total
// count), which is the coarse-grained velocity of the continuum.
export function createAccumulator(nx, ny) {
  const n = nx * ny;
  return { nx, ny, samples: 0, n: new Float64Array(n), su: new Float64Array(n), sv: new Float64Array(n), sq: new Float64Array(n) };
}

export function resetAccumulator(acc) {
  acc.samples = 0;
  acc.n.fill(0);
  acc.su.fill(0);
  acc.sv.fill(0);
  acc.sq.fill(0);
}

export function accumulate(acc, md) {
  const { nx, ny } = acc;
  for (let i = 0; i < md.N; i++) {
    const c = binOf(md, i, nx, ny);
    acc.n[c]++;
    acc.su[c] += md.vx[i];
    acc.sv[c] += md.vy[i];
    acc.sq[c] += md.vx[i] * md.vx[i] + md.vy[i] * md.vy[i];
  }
  acc.samples++;
}

export function accumulatorAverages(acc, md, out = null) {
  const { nx, ny } = acc;
  const o = out ?? createCellAverages(nx, ny);
  const cellArea = (md.Lx * md.Ly) / (nx * ny);
  for (let c = 0; c < nx * ny; c++) {
    const n = acc.n[c];
    o.count[c] = acc.samples ? n / acc.samples : 0;
    o.rho[c] = o.count[c] / cellArea;
    o.u[c] = n > 0 ? acc.su[c] / n : 0;
    o.v[c] = n > 0 ? acc.sv[c] / n : 0;
    o.T[c] = n > 1 ? 0.5 * (acc.sq[c] / n - o.u[c] * o.u[c] - o.v[c] * o.v[c]) : 0;
  }
  return o;
}
