// Dimensional analysis, dimensionless numbers and classical correlations.
//
// What this module does
//   (a) A library of physical variables with dimensions in the base
//       quantities mass M, length L, time T and temperature Theta, and SI
//       units. dimensionMatrix(vars) builds the dimension matrix; piGroups()
//       finds a complete set of dimensionless groups by an exact rational
//       null-space computation (small fraction arithmetic, no floating-point
//       rank decisions). The number of groups is n - rank.
//   (b) Named dimensionless numbers (Re, Ma, Fr, St, We, Pr, Pe, Kn, Ca, Ri,
//       Ra, Eu, Sc, Gr, plus Ne and Nu) with definitions, meaning and TeX,
//       and identifyGroup() to name a group found by piGroups(), in any of
//       its listed forms (Re as rho U L/mu or U L/nu, Pr as nu/alpha or
//       mu c_p/k, ...).
//   (c) Correlations: pipe friction factor (laminar, Blasius, Colebrook-White
//       solved by a generator yielding fixed-point or Newton iterations,
//       Haaland), sphere drag (Stokes, Oseen, Schiller-Naumann, Morrison),
//       cylinder Strouhal number (Roshko 1954 fits and the subcritical
//       plateau), and a ship-model scaling calculator showing that Froude and
//       Reynolds similarity cannot both hold in the same fluid.
//
// Conventions and units
//   - SI units throughout. Dimension vectors are [M, L, T, Theta].
//   - Exponent vectors of groups are aligned with the variable list passed
//     in. A group's `integer` form is scaled to coprime integers with the
//     non-repeating variable's exponent positive.
//   - Friction factor f is the Darcy (Moody) factor: dp = f (L/D) rho U^2/2.
//     rr is the relative roughness eps/D. Reynolds numbers use the pipe or
//     sphere diameter, or the cylinder diameter for the Strouhal number.
//   - No grids here, so the course's i + j*nx convention does not arise.
//
// Sources
//   Pi theorem: Buckingham, Phys. Rev. 4 (1914) 345. Closely related results
//     appear earlier (Vaschy, Ann. Telegr. 19 (1892) 25; Riabouchinsky,
//     L'Aerophile 1911), and Rayleigh used the method of dimensions widely;
//     we make no priority claim. Textbook treatment: White, Fluid Mechanics,
//     ch. 5; Barenblatt, Scaling, Self-similarity and Intermediate
//     Asymptotics (1996) ch. 1. Null space by Gauss-Jordan elimination in
//     exact rational arithmetic (any linear-algebra text).
//   Pipe friction: laminar f = 64/Re (Hagen-Poiseuille); Blasius, VDI
//     Forschungsheft 131 (1913), f = 0.316 Re^(-1/4) for smooth pipes,
//     roughly 4e3 < Re < 1e5; Colebrook, J. Inst. Civ. Eng. 11 (1939) 133
//     (with White: Proc. R. Soc. A 161 (1937) 367); Moody, Trans. ASME 66
//     (1944) 671; Haaland, J. Fluids Eng. 105 (1983) 89.
//   Sphere drag: Stokes, Trans. Camb. Phil. Soc. 9 (1851) 8; Oseen, Ark. Mat.
//     Astron. Fys. 6 (1910) no. 29, C_D = (24/Re)(1 + 3Re/16); Schiller &
//     Naumann, Z. Ver. Dtsch. Ing. 77 (1933) 318, C_D = (24/Re)(1 +
//     0.15 Re^0.687) for Re < 800 (range as tabulated by Clift, Grace &
//     Weber, Bubbles, Drops and Particles, 1978, Table 5.2); Morrison, An
//     Introduction to Fluid Mechanics (Cambridge UP, 2013) Fig. 8.13 and the
//     note "Data correlation for drag coefficient for sphere" (Michigan Tech,
//     2016): a fit through the drag crisis, not recommended beyond Re = 1e6.
//   Strouhal number: Roshko, NACA Report 1191 (1954), Eqs. (1)-(2):
//     F = f d^2/nu = 0.212 Re - 4.5 (50 < Re < 150, "stable range") and
//     F = 0.212 Re - 2.7 (300 < Re < 2000, "irregular range"), i.e.
//     St = 0.212 (1 - 21.2/Re) and St = 0.212 (1 - 12.7/Re). Roshko calls
//     150 < Re < 300 a transition range and saw periodic wake fluctuations up
//     to the critical Re of about 2e5. Onset of shedding near Re = 47:
//     Provansal, Mathis & Boyer, J. Fluid Mech. 182 (1987) 1; Williamson,
//     Annu. Rev. Fluid Mech. 28 (1996) 477 (Roshko's own stable range starts
//     at 40).
//   Ship models: Froude similarity with the ITTC 1957 model-ship correlation
//     line C_F = 0.075/(log10 Re - 2)^2 for the frictional part (ITTC
//     Recommended Procedure 7.5-02-02-02).
//
// Deviations
//   - colebrook() adds a safeguard to textbook Newton / fixed-point
//     iteration: a step that would make x = 1/sqrt(f) <= 0 (possible from a
//     starting f0 far below the answer) is replaced by halving x.
//   - strouhalCylinder() returns NaN in Roshko's transition range and above
//     the critical Reynolds number rather than inventing a value there; the
//     0.2 plateau is a round number, not a fit, and meets Roshko's irregular-
//     range fit (0.211 at Re = 2000) with a small step.

import { drain } from './util.js';

// ---------------------------------------------------------------------------
// (a) Variables and dimensions

export const DIMENSIONS = [
  { id: 'M', name: 'mass', tex: '\\mathsf{M}', si: 'kg' },
  { id: 'L', name: 'length', tex: '\\mathsf{L}', si: 'm' },
  { id: 'T', name: 'time', tex: '\\mathsf{T}', si: 's' },
  { id: 'Theta', name: 'temperature', tex: '\\Theta', si: 'K' },
];

const v = (id, name, tex, dims, si) => ({ id, name, tex, dims, si });

// dims = [M, L, T, Theta]; si is a TeX unit string.
export const VARIABLES = {
  rho: v('rho', 'density', '\\rho', [1, -3, 0, 0], '\\mathrm{kg\\,m^{-3}}'),
  mu: v('mu', 'dynamic viscosity', '\\mu', [1, -1, -1, 0], '\\mathrm{Pa\\,s}'),
  nu: v('nu', 'kinematic viscosity', '\\nu', [0, 2, -1, 0], '\\mathrm{m^{2}\\,s^{-1}}'),
  U: v('U', 'velocity', 'U', [0, 1, -1, 0], '\\mathrm{m\\,s^{-1}}'),
  L: v('L', 'length', 'L', [0, 1, 0, 0], '\\mathrm{m}'),
  D: v('D', 'diameter', 'D', [0, 1, 0, 0], '\\mathrm{m}'),
  H: v('H', 'height or depth', 'H', [0, 1, 0, 0], '\\mathrm{m}'),
  eps: v('eps', 'roughness height', '\\epsilon', [0, 1, 0, 0], '\\mathrm{m}'),
  lambda: v('lambda', 'mean free path', '\\lambda', [0, 1, 0, 0], '\\mathrm{m}'),
  p: v('p', 'pressure', 'p', [1, -1, -2, 0], '\\mathrm{Pa}'),
  dp: v('dp', 'pressure difference', '\\Delta p', [1, -1, -2, 0], '\\mathrm{Pa}'),
  tau: v('tau', 'shear stress', '\\tau', [1, -1, -2, 0], '\\mathrm{Pa}'),
  K: v('K', 'bulk modulus', 'K', [1, -1, -2, 0], '\\mathrm{Pa}'),
  g: v('g', 'gravitational acceleration', 'g', [0, 1, -2, 0], '\\mathrm{m\\,s^{-2}}'),
  sigma: v('sigma', 'surface tension', '\\sigma', [1, 0, -2, 0], '\\mathrm{N\\,m^{-1}}'),
  c: v('c', 'speed of sound', 'c', [0, 1, -1, 0], '\\mathrm{m\\,s^{-1}}'),
  f: v('f', 'frequency', 'f', [0, 0, -1, 0], '\\mathrm{Hz}'),
  omega: v('omega', 'angular velocity', '\\omega', [0, 0, -1, 0], '\\mathrm{rad\\,s^{-1}}'),
  t: v('t', 'time', 't', [0, 0, 1, 0], '\\mathrm{s}'),
  F: v('F', 'force', 'F', [1, 1, -2, 0], '\\mathrm{N}'),
  P: v('P', 'power', 'P', [1, 2, -3, 0], '\\mathrm{W}'),
  Q: v('Q', 'volume flow rate', 'Q', [0, 3, -1, 0], '\\mathrm{m^{3}\\,s^{-1}}'),
  mdot: v('mdot', 'mass flow rate', '\\dot{m}', [1, 0, -1, 0], '\\mathrm{kg\\,s^{-1}}'),
  k: v('k', 'thermal conductivity', 'k', [1, 1, -3, -1], '\\mathrm{W\\,m^{-1}\\,K^{-1}}'),
  cp: v('cp', 'specific heat capacity', 'c_{p}', [0, 2, -2, -1], '\\mathrm{J\\,kg^{-1}\\,K^{-1}}'),
  alpha: v('alpha', 'thermal diffusivity', '\\alpha', [0, 2, -1, 0], '\\mathrm{m^{2}\\,s^{-1}}'),
  Dm: v('Dm', 'mass diffusivity', '\\mathcal{D}', [0, 2, -1, 0], '\\mathrm{m^{2}\\,s^{-1}}'),
  T: v('T', 'temperature', 'T', [0, 0, 0, 1], '\\mathrm{K}'),
  dT: v('dT', 'temperature difference', '\\Delta T', [0, 0, 0, 1], '\\mathrm{K}'),
  beta: v('beta', 'thermal expansion coefficient', '\\beta', [0, 0, 0, -1], '\\mathrm{K^{-1}}'),
  h: v('h', 'heat transfer coefficient', 'h', [1, 0, -3, -1], '\\mathrm{W\\,m^{-2}\\,K^{-1}}'),
};

// TeX for a dimension vector, e.g. [1, -1, -2, 0] -> M L^{-1} T^{-2}.
export function dimensionTex(dims) {
  const parts = [];
  for (let r = 0; r < 4; r++) {
    if (dims[r] === 0) continue;
    parts.push(dims[r] === 1 ? DIMENSIONS[r].tex : `${DIMENSIONS[r].tex}^{${dims[r]}}`);
  }
  return parts.length ? parts.join('\\,') : '1';
}

const resolve = (id) => {
  const V = typeof id === 'string' ? VARIABLES[id] : id;
  if (!V || !V.dims) throw new Error(`unknown variable ${id}`);
  return V;
};

// Dimension matrix: rows are base dimensions, columns the variables. Rows
// that are zero for every variable are dropped (dims lists those kept).
export function dimensionMatrix(vars) {
  const V = vars.map(resolve);
  const dims = [];
  const rows = [];
  for (let r = 0; r < 4; r++) {
    const row = V.map((x) => x.dims[r]);
    if (row.some((e) => e !== 0)) {
      dims.push(DIMENSIONS[r].id);
      rows.push(row);
    }
  }
  return { dims, vars: V.map((x) => x.id), rows };
}

// --- exact rational arithmetic (numerators and denominators stay small) ---

const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
};
export function frac(n, d = 1) {
  if (d === 0) throw new Error('zero denominator');
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d) || 1;
  return { n: n / g, d: d / g };
}
const fsub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const fmul = (a, b) => frac(a.n * b.n, a.d * b.d);
const fdiv = (a, b) => frac(a.n * b.d, a.d * b.n);
export const fracToNumber = (a) => a.n / a.d;
export const fracTex = (a) => (a.d === 1 ? `${a.n}` : `${a.n < 0 ? '-' : ''}\\tfrac{${Math.abs(a.n)}}{${a.d}}`);

// Reduced row echelon form in exact rationals. matrix: rows of integers or
// fractions. Returns { R (fractions), pivots (column of each pivot row), rank }.
export function rationalRref(matrix) {
  const R = matrix.map((row) => row.map((e) => (typeof e === 'number' ? frac(e) : e)));
  const m = R.length;
  const n = m ? R[0].length : 0;
  const pivots = [];
  let r = 0;
  for (let c = 0; c < n && r < m; c++) {
    let p = -1;
    for (let i = r; i < m; i++) if (R[i][c].n !== 0) {
      p = i;
      break;
    }
    if (p < 0) continue;
    [R[r], R[p]] = [R[p], R[r]];
    const piv = R[r][c];
    for (let j = 0; j < n; j++) R[r][j] = fdiv(R[r][j], piv);
    for (let i = 0; i < m; i++) {
      if (i === r || R[i][c].n === 0) continue;
      const fct = R[i][c];
      for (let j = 0; j < n; j++) R[i][j] = fsub(R[i][j], fmul(fct, R[r][j]));
    }
    pivots.push(c);
    r++;
  }
  return { R, pivots, rank: r };
}

export const rationalRank = (matrix) => rationalRref(matrix).rank;

// Preferred repeating variables, in order: a density, a velocity (or a rate),
// a length (the textbook choice, e.g. White ch. 5), then others.
export const REPEATING_PREFERENCE = ['rho', 'U', 'omega', 'D', 'L', 'H', 'mu', 'nu', 'g', 'c', 'k', 'dT', 'T', 'alpha', 'cp', 'sigma', 'Q', 'f'];

const subMatrix = (rows, cols) => rows.map((row) => cols.map((c) => row[c]));

// A variable not in REPEATING_PREFERENCE (e.g. a custom one) that is a pure
// length ranks with L.
function repeatingRank(id, i, rows) {
  const k = REPEATING_PREFERENCE.indexOf(id);
  if (k >= 0) return k;
  const pureLength = rows.every((row, r) => row[i] === (r === 1 ? 1 : 0));
  return pureLength ? REPEATING_PREFERENCE.indexOf('L') : -1;
}

function chooseRepeating(ids, rows, rank) {
  const order = ids.map((id, i) => ({ id, i, pref: repeatingRank(id, i, rows) }));
  const rest = order.slice(1).sort((a, b) => (a.pref < 0 ? 1e9 : a.pref) - (b.pref < 0 ? 1e9 : b.pref) || a.i - b.i);
  const candidates = [...rest, order[0]]; // the first variable (the "answer") goes last
  const chosen = [];
  let r = 0;
  for (const cnd of candidates) {
    if (r === rank) break;
    const trial = [...chosen, cnd.i];
    const rr = rationalRank(subMatrix(rows, trial));
    if (rr > r) {
      chosen.push(cnd.i);
      r = rr;
    }
  }
  return chosen.map((i) => ids[i]);
}

// TeX for a product of powers with integer exponents, as a fraction. texs
// (optional) gives each variable's symbol; otherwise the library's is used.
export function groupTex(ids, exps, texs = null) {
  const num = [];
  const den = [];
  ids.forEach((id, i) => {
    const e = exps[i];
    if (e === 0) return;
    const sym = texs?.[i] ?? (VARIABLES[id] ? VARIABLES[id].tex : id);
    const a = Math.abs(e);
    const term = a === 1 ? sym : `${sym}^{${a}}`;
    (e > 0 ? num : den).push(term);
  });
  const N = num.length ? num.join(' ') : '1';
  return den.length ? `\\frac{${N}}{${den.join(' ')}}` : N;
}

// Buckingham pi groups of a list of variables: library ids, or custom
// objects { id, dims: [M, L, T, Theta], tex? } (a custom id is named only if
// it is a library id used in NUMBERS). repeating: ids of the
// repeating (core) variables; they must be dimensionally independent and
// exactly rank of them. Without it they are chosen automatically: never
// the first variable (treated as the dependent quantity) if avoidable,
// otherwise by REPEATING_PREFERENCE, then list order.
// Each group: { label (its non-repeating variable), exponents (numbers,
// with the label's exponent 1), fractions, integer (coprime integers),
// tex, named (identifyGroup result or null) }.
export function piGroups(vars, { repeating = null } = {}) {
  const Vs = vars.map(resolve);
  const ids = Vs.map((x) => x.id);
  if (new Set(ids).size !== ids.length) throw new Error('duplicate variable');
  const texs = Vs.map((x) => x.tex ?? x.id);
  const n = ids.length;
  const rows = [0, 1, 2, 3].map((r) => Vs.map((x) => x.dims[r] ?? 0));
  const rank = rationalRank(rows);
  const rep = repeating ? repeating.map((x) => (typeof x === 'string' ? x : resolve(x).id)) : chooseRepeating(ids, rows, rank);
  const repIdx = rep.map((id) => {
    const i = ids.indexOf(id);
    if (i < 0) throw new Error(`repeating variable ${id} is not in the list`);
    return i;
  });
  if (rep.length !== rank || rationalRank(subMatrix(rows, repIdx)) !== rank) {
    throw new Error(`need exactly ${rank} dimensionally independent repeating variables (got ${rep.join(', ')})`);
  }
  const others = ids.map((_, i) => i).filter((i) => !repIdx.includes(i));
  const cols = [...repIdx, ...others];
  const { R } = rationalRref(subMatrix(rows, cols)); // pivots are columns 0..rank-1
  const groups = others.map((oi, j) => {
    const col = rank + j;
    const fr = ids.map(() => frac(0));
    fr[oi] = frac(1);
    for (let i = 0; i < rank; i++) fr[repIdx[i]] = frac(-R[i][col].n, R[i][col].d);
    let l = 1;
    for (const q of fr) l = (l * q.d) / gcd(l, q.d);
    let integer = fr.map((q) => (q.n * l) / q.d);
    const g = integer.reduce((a, b) => gcd(a, b), 0) || 1;
    integer = integer.map((e) => e / g);
    const exponents = fr.map(fracToNumber);
    return {
      label: ids[oi],
      exponents,
      fractions: fr,
      integer,
      tex: groupTex(ids, integer, texs),
      named: identifyGroup(ids, exponents, Vs.map((x) => x.dims)),
    };
  });
  const texList = groups.map((g, i) => `\\Pi_{${i + 1}} = ${g.tex}`).join(',\\quad ');
  const relation = groups.length > 1 ? `\\Pi_{1} = \\phi(${groups.slice(1).map((_, i) => `\\Pi_{${i + 2}}`).join(', ')})` : groups.length === 1 ? '\\Pi_{1} = \\text{const}' : '';
  return { vars: ids, n, rank, count: n - rank, repeating: rep, groups, tex: texList, relation };
}

// ---------------------------------------------------------------------------
// (b) Named dimensionless numbers. exps are over VARIABLES ids, with L the
// characteristic length; alt lists equivalent forms in other variables (e.g.
// Re = UL/nu) that identifyGroup also recognises. after: whom it is named
// after (no history beyond that is claimed here).

export const NUMBERS = {
  Re: {
    id: 'Re',
    name: 'Reynolds number',
    after: 'Osborne Reynolds',
    tex: '\\mathrm{Re} = \\frac{\\rho U L}{\\mu} = \\frac{U L}{\\nu}',
    exps: { rho: 1, U: 1, L: 1, mu: -1 },
    alt: [{ U: 1, L: 1, nu: -1 }],
    ratio: 'inertial forces / viscous forces',
    meaning: 'Small: viscosity dominates, flow is smooth and reversible-looking. Large: inertia dominates, thin boundary layers, and above a geometry-dependent threshold, turbulence.',
  },
  Ma: {
    id: 'Ma',
    name: 'Mach number',
    after: 'Ernst Mach',
    tex: '\\mathrm{Ma} = \\frac{U}{c}',
    exps: { U: 1, c: -1 },
    ratio: 'flow speed / speed of sound',
    meaning: 'Density changes scale like Ma^2/2 at low speed, so below about 0.3 a flow can usually be treated as incompressible. Above 1, shocks can form.',
  },
  Fr: {
    id: 'Fr',
    name: 'Froude number',
    after: 'William Froude',
    tex: '\\mathrm{Fr} = \\frac{U}{\\sqrt{g L}}',
    exps: { U: 1, g: -0.5, L: -0.5 },
    ratio: 'flow speed / gravity-wave speed (inertia / gravity)',
    meaning: 'Governs free-surface flows: ship waves, open channels, hydraulic jumps. Some authors define it as U^2/(gL).',
  },
  St: {
    id: 'St',
    name: 'Strouhal number',
    after: 'Vincenc Strouhal',
    tex: '\\mathrm{St} = \\frac{f L}{U}',
    exps: { f: 1, L: 1, U: -1 },
    ratio: 'flow-through time / oscillation period',
    meaning: 'Dimensionless frequency of an unsteady flow, such as vortex shedding behind a cylinder (about 0.2 over a wide range of Re).',
  },
  We: {
    id: 'We',
    name: 'Weber number',
    after: 'Moritz Weber',
    tex: '\\mathrm{We} = \\frac{\\rho U^{2} L}{\\sigma}',
    exps: { rho: 1, U: 2, L: 1, sigma: -1 },
    ratio: 'inertia / surface tension',
    meaning: 'Decides whether drops and jets hold together or break up.',
  },
  Pr: {
    id: 'Pr',
    name: 'Prandtl number',
    after: 'Ludwig Prandtl',
    tex: '\\mathrm{Pr} = \\frac{\\nu}{\\alpha} = \\frac{\\mu c_{p}}{k}',
    exps: { nu: 1, alpha: -1 },
    alt: [{ mu: 1, cp: 1, k: -1 }],
    ratio: 'momentum diffusivity / thermal diffusivity',
    meaning: 'A fluid property: about 0.7 for air, 7 for water at room temperature, about 0.02 for liquid metals. Sets the ratio of velocity to thermal boundary-layer thickness.',
  },
  Pe: {
    id: 'Pe',
    name: 'Péclet number',
    after: 'Jean Claude Eugène Péclet',
    tex: '\\mathrm{Pe} = \\frac{U L}{\\alpha} = \\mathrm{Re}\\,\\mathrm{Pr}',
    exps: { U: 1, L: 1, alpha: -1 },
    alt: [{ rho: 1, cp: 1, U: 1, L: 1, k: -1 }, { U: 1, L: 1, Dm: -1 }],
    ratio: 'advection / diffusion (of heat; use the mass diffusivity for species)',
    meaning: 'Large Pe: a scalar is carried with the flow and diffusion only smooths thin fronts. On a grid, the cell Péclet number U dx/alpha decides whether central differencing wiggles.',
  },
  Kn: {
    id: 'Kn',
    name: 'Knudsen number',
    after: 'Martin Knudsen',
    tex: '\\mathrm{Kn} = \\frac{\\lambda}{L}',
    exps: { lambda: 1, L: -1 },
    ratio: 'molecular mean free path / body size',
    meaning: 'The continuum (Navier–Stokes) description needs Kn << 1; rarefied gases and microdevices break it.',
  },
  Ca: {
    id: 'Ca',
    name: 'Capillary number',
    after: null,
    tex: '\\mathrm{Ca} = \\frac{\\mu U}{\\sigma}',
    exps: { mu: 1, U: 1, sigma: -1 },
    ratio: 'viscous forces / surface tension',
    meaning: 'Governs slow interfacial flows: coating films, bubbles in capillaries, oil displacement in porous rock.',
  },
  Ri: {
    id: 'Ri',
    name: 'Richardson number (bulk)',
    after: 'Lewis Fry Richardson',
    tex: '\\mathrm{Ri} = \\frac{g \\beta \\Delta T L}{U^{2}}',
    exps: { g: 1, beta: 1, dT: 1, L: 1, U: -2 },
    ratio: 'buoyancy / inertia',
    meaning: 'Stratification against shear: large Ri suppresses mixing. (The gradient form uses N^2 over the squared shear.)',
  },
  Ra: {
    id: 'Ra',
    name: 'Rayleigh number',
    after: 'Lord Rayleigh',
    tex: '\\mathrm{Ra} = \\frac{g \\beta \\Delta T L^{3}}{\\nu \\alpha} = \\mathrm{Gr}\\,\\mathrm{Pr}',
    exps: { g: 1, beta: 1, dT: 1, L: 3, nu: -1, alpha: -1 },
    alt: [{ g: 1, beta: 1, dT: 1, L: 3, rho: 2, cp: 1, mu: -1, k: -1 }],
    ratio: 'buoyant driving / (momentum diffusion x heat diffusion)',
    meaning: 'Natural convection: a fluid layer heated from below starts to convect above a critical Ra (about 1708 between rigid plates).',
  },
  Eu: {
    id: 'Eu',
    name: 'Euler number',
    after: 'Leonhard Euler',
    tex: '\\mathrm{Eu} = \\frac{\\Delta p}{\\rho U^{2}}',
    exps: { dp: 1, rho: -1, U: -2 },
    alt: [{ p: 1, rho: -1, U: -2 }],
    ratio: 'pressure difference / dynamic pressure',
    meaning: 'The pressure coefficient (often defined with a factor 1/2). In a pipe, Eu = (f/2)(L/D).',
  },
  Sc: {
    id: 'Sc',
    name: 'Schmidt number',
    after: 'Ernst Schmidt',
    tex: '\\mathrm{Sc} = \\frac{\\nu}{\\mathcal{D}}',
    exps: { nu: 1, Dm: -1 },
    alt: [{ mu: 1, rho: -1, Dm: -1 }],
    ratio: 'momentum diffusivity / mass diffusivity',
    meaning: 'The Prandtl number of species transport: about 1 for gases, about 1000 for solutes in water.',
  },
  Gr: {
    id: 'Gr',
    name: 'Grashof number',
    after: 'Franz Grashof',
    tex: '\\mathrm{Gr} = \\frac{g \\beta \\Delta T L^{3}}{\\nu^{2}}',
    exps: { g: 1, beta: 1, dT: 1, L: 3, nu: -2 },
    alt: [{ g: 1, beta: 1, dT: 1, L: 3, rho: 2, mu: -2 }],
    ratio: 'buoyancy / viscous forces',
    meaning: 'Plays the role of Re^2 in natural convection.',
  },
  Ne: {
    id: 'Ne',
    name: 'Newton number (force coefficient)',
    after: 'Isaac Newton',
    tex: '\\mathrm{Ne} = \\frac{F}{\\rho U^{2} L^{2}}',
    exps: { F: 1, rho: -1, U: -2, L: -2 },
    ratio: 'force / dynamic-pressure force',
    meaning: 'Drag and lift coefficients are this group with a factor 2 and a reference area: C_D = F / (rho U^2 A / 2).',
  },
  Nu: {
    id: 'Nu',
    name: 'Nusselt number',
    after: 'Wilhelm Nusselt',
    tex: '\\mathrm{Nu} = \\frac{h L}{k}',
    exps: { h: 1, L: 1, k: -1 },
    ratio: 'convective heat transfer / conduction',
    meaning: 'How much the flow enhances heat transfer over pure conduction across the same length.',
  },
};

const isLengthDims = (d) => !!d && d[0] === 0 && d[1] === 1 && d[2] === 0 && (d[3] ?? 0) === 0;

// Name a group: is it a power of one of NUMBERS (in its main or an alt
// form)? Any pure-length variable in the group may play the characteristic
// length L (so mu/(rho U D) is Re^-1). dims (optional) gives each variable's
// dimension vector, so custom length variables count too. Returns
// { id, power } or null.
export function identifyGroup(ids, exponents, dims = null) {
  const g = {};
  const lengths = [];
  ids.forEach((id, i) => {
    if (exponents[i] === 0) return;
    g[id] = exponents[i];
    if (id !== 'L' && isLengthDims(dims?.[i] ?? VARIABLES[id]?.dims)) lengths.push(id);
  });
  const gKeys = Object.keys(g);
  const lengthChoices = ['L', ...lengths];
  for (const N of Object.values(NUMBERS)) {
    for (const form of [N.exps, ...(N.alt ?? [])]) {
      for (const ell of lengthChoices) {
        const def = {};
        for (const [id, e] of Object.entries(form)) {
          const key = id === 'L' ? ell : id;
          def[key] = (def[key] || 0) + e;
        }
        const dKeys = Object.keys(def);
        if (dKeys.length !== gKeys.length || !dKeys.every((k) => k in g)) continue;
        const c = g[dKeys[0]] / def[dKeys[0]];
        if (dKeys.every((k) => Math.abs(g[k] - c * def[k]) < 1e-12)) return { id: N.id, power: c };
      }
    }
  }
  return null;
}

// Pi-group problems a figure can offer.
export const PI_PRESETS = {
  'sphere-drag': { name: 'Drag on a sphere', vars: ['F', 'rho', 'U', 'D', 'mu'], repeating: ['rho', 'U', 'D'], note: 'Two groups: a force coefficient and the Reynolds number.' },
  'pipe-pressure-drop': { name: 'Pressure drop in a rough pipe', vars: ['dp', 'rho', 'U', 'D', 'mu', 'L', 'eps'], repeating: ['rho', 'U', 'D'], note: 'Four groups: Euler number, Re, L/D and relative roughness eps/D.' },
  'ship-resistance': { name: 'Resistance of a ship', vars: ['F', 'rho', 'U', 'L', 'mu', 'g'], repeating: ['rho', 'U', 'L'], note: 'Force coefficient, Re and Fr: the model test cannot match both Re and Fr.' },
  'vortex-shedding': { name: 'Vortex shedding frequency', vars: ['f', 'U', 'D', 'rho', 'mu'], repeating: ['rho', 'U', 'D'], note: 'St = phi(Re).' },
  'compressible-drag': { name: 'Drag at high speed', vars: ['F', 'rho', 'U', 'L', 'mu', 'c'], repeating: ['rho', 'U', 'L'], note: 'Re and Ma both appear.' },
  'droplet-breakup': { name: 'Drop in a gas stream', vars: ['sigma', 'rho', 'U', 'D', 'mu'], repeating: ['rho', 'U', 'D'], note: 'We and Re (or Ca = We/Re).' },
  'natural-convection': { name: 'Natural convection from a heated plate', vars: ['h', 'k', 'L', 'g', 'beta', 'dT', 'nu', 'alpha'], repeating: ['k', 'L', 'nu', 'dT'], note: 'Nu = phi(Gr-like group, beta dT, Pr).' },
  'pump': { name: 'Pump power', vars: ['P', 'rho', 'omega', 'D', 'Q', 'mu'], repeating: ['rho', 'omega', 'D'], note: 'Power number, flow coefficient and a rotational Reynolds number.' },
};

// ---------------------------------------------------------------------------
// (c) Correlations: pipe friction

export const frictionLaminar = (Re) => 64 / Re;
export const frictionBlasius = (Re) => 0.316 * Math.pow(Re, -0.25);
export function frictionHaaland(Re, rr = 0) {
  const x = -1.8 * Math.log10(Math.pow(rr / 3.7, 1.11) + 6.9 / Re);
  return 1 / (x * x);
}

// Colebrook-White in x = 1/sqrt(f):
//   R(x) = x + 2 log10(rr/3.7 + 2.51 x / Re) = 0.
// method 'fixed-point': x <- -2 log10(rr/3.7 + 2.51 x/Re) (linear
// convergence, rate |g'| = (2/ln 10)(2.51/Re)/(rr/3.7 + 2.51x/Re) < 0.87/x);
// 'newton': x <- x - R/R' (quadratic). R is increasing and concave, so
// Newton from a start left of the root (f0 above the answer) climbs
// monotonically to it. From the right (f0 too small) the first tangent step
// lands left of the root and can overshoot past x = 0, where the log is
// undefined; the fixed-point map also goes negative when rr/3.7 + 2.51x/Re
// > 1. Safeguard: any step that would give x <= 0 is replaced by x/2 (the
// event carries safeguard: true), so every iterate stays physical. Yields
// { t: 'iter', k, x, f, residual, safeguard } (k = 0 is the start) and
// returns { f, x, iterations, residual, converged, method, safeguards }.
// residual is |R(x)|; f is NaN if the residual is not finite.
export function* colebrook(Re, rr = 0, { method = 'newton', f0 = 0.02, tol = 1e-13, maxIter = 200 } = {}) {
  if (!(f0 > 0)) throw new RangeError(`starting friction factor must be positive (got ${f0})`);
  if (method !== 'newton' && method !== 'fixed-point') throw new Error(`unknown method ${method}`);
  const a = rr / 3.7;
  const b = 2.51 / Re;
  const c = 2 / Math.LN10;
  const R = (x) => x + 2 * Math.log10(a + b * x);
  let x = 1 / Math.sqrt(f0);
  let res = Math.abs(R(x));
  yield { t: 'iter', k: 0, x, f: 1 / (x * x), residual: res, safeguard: false };
  let k = 0;
  let safeguards = 0;
  while (k < maxIter && res > tol) {
    const xOld = x;
    x = method === 'fixed-point' ? -2 * Math.log10(a + b * x) : x - R(x) / (1 + (c * b) / (a + b * x));
    const safeguard = !(x > 0);
    if (safeguard) {
      x = xOld / 2;
      safeguards++;
    }
    k++;
    res = Math.abs(R(x));
    yield { t: 'iter', k, x, f: 1 / (x * x), residual: res, safeguard };
    if (!safeguard && Math.abs(x - xOld) <= 2 * Number.EPSILON * Math.abs(x)) break; // stagnated at round-off
  }
  const finite = Number.isFinite(res);
  return { f: finite ? 1 / (x * x) : NaN, x, iterations: k, residual: res, converged: finite && res <= Math.max(tol, 1e-12), method, safeguards };
}

export const frictionColebrook = (Re, rr = 0, opts = {}) => drain(colebrook(Re, rr, opts)).f;

// Moody-chart friction factor with its regime. Laminar below Re = 2300;
// 2300-4000 is 'transitional' (no reliable value: the Colebrook value is
// returned and flagged); turbulent above.
export function frictionFactor(Re, rr = 0) {
  if (Re < 2300) return { f: frictionLaminar(Re), regime: 'laminar' };
  return { f: frictionColebrook(Re, rr), regime: Re < 4000 ? 'transitional' : 'turbulent' };
}

// Darcy-Weisbach pressure drop.
export const pressureDrop = ({ f, L, D, rho, U }) => (f * (L / D) * rho * U * U) / 2;

export const FRICTION_MODELS = {
  laminar: { id: 'laminar', name: 'Laminar (Hagen–Poiseuille)', tex: 'f = \\frac{64}{\\mathrm{Re}}', range: [0, 2300], fn: (Re) => frictionLaminar(Re) },
  blasius: { id: 'blasius', name: 'Blasius (smooth)', tex: 'f = 0.316\\,\\mathrm{Re}^{-1/4}', range: [4e3, 1e5], fn: (Re) => frictionBlasius(Re) },
  colebrook: {
    id: 'colebrook',
    name: 'Colebrook–White (implicit)',
    tex: '\\frac{1}{\\sqrt{f}} = -2\\log_{10}\\left(\\frac{\\epsilon/D}{3.7} + \\frac{2.51}{\\mathrm{Re}\\sqrt{f}}\\right)',
    range: [4e3, 1e8],
    fn: (Re, rr) => frictionColebrook(Re, rr),
  },
  haaland: {
    id: 'haaland',
    name: 'Haaland (explicit)',
    tex: '\\frac{1}{\\sqrt{f}} = -1.8\\log_{10}\\left[\\left(\\frac{\\epsilon/D}{3.7}\\right)^{1.11} + \\frac{6.9}{\\mathrm{Re}}\\right]',
    range: [4e3, 1e8],
    fn: (Re, rr) => frictionHaaland(Re, rr),
  },
};

// ---------------------------------------------------------------------------
// Sphere drag coefficient C_D = F / (rho U^2 (pi D^2/4) / 2), Re = rho U D/mu.

export const cdStokes = (Re) => 24 / Re;
export const cdOseen = (Re) => (24 / Re) * (1 + (3 * Re) / 16);
export const cdSchillerNaumann = (Re) => (24 / Re) * (1 + 0.15 * Math.pow(Re, 0.687));
export function cdMorrison(Re) {
  const a = Re / 5;
  const b = Re / 2.63e5;
  const c = Re / 1e6;
  return 24 / Re + (2.6 * a) / (1 + Math.pow(a, 1.52)) + (0.411 * Math.pow(b, -7.94)) / (1 + Math.pow(b, -8)) + (0.25 * c) / (1 + c);
}

export const SPHERE_DRAG = {
  stokes: { id: 'stokes', name: 'Stokes (creeping flow)', tex: 'C_D = \\frac{24}{\\mathrm{Re}}', range: [0, 1], fn: cdStokes },
  oseen: { id: 'oseen', name: 'Oseen correction', tex: 'C_D = \\frac{24}{\\mathrm{Re}}\\left(1 + \\frac{3}{16}\\mathrm{Re}\\right)', range: [0, 5], fn: cdOseen },
  'schiller-naumann': {
    id: 'schiller-naumann',
    name: 'Schiller–Naumann',
    tex: 'C_D = \\frac{24}{\\mathrm{Re}}\\left(1 + 0.15\\,\\mathrm{Re}^{0.687}\\right)',
    range: [0, 800],
    fn: cdSchillerNaumann,
  },
  morrison: {
    id: 'morrison',
    name: 'Morrison (2013), through the drag crisis',
    tex: 'C_D = \\frac{24}{\\mathrm{Re}} + \\frac{2.6\\,(\\mathrm{Re}/5)}{1 + (\\mathrm{Re}/5)^{1.52}} + \\frac{0.411\\,(\\mathrm{Re}/2.63\\times 10^{5})^{-7.94}}{1 + (\\mathrm{Re}/2.63\\times 10^{5})^{-8}} + \\frac{0.25\\,(\\mathrm{Re}/10^{6})}{1 + \\mathrm{Re}/10^{6}}',
    range: [0, 1e6],
    fn: cdMorrison,
  },
};

// ---------------------------------------------------------------------------
// Cylinder vortex shedding: Strouhal number St = f D / U against Re.

export const SHEDDING_ONSET_RE = 47;

export const STROUHAL_FITS = [
  {
    id: 'roshko-stable',
    name: 'Roshko (1954), stable range',
    tex: '\\mathrm{St} = 0.212\\left(1 - \\frac{21.2}{\\mathrm{Re}}\\right)',
    range: [50, 150],
    fn: (Re) => 0.212 * (1 - 21.2 / Re),
    source: 'NACA Report 1191, Eq. (2a), from F = f d^2/nu = 0.212 Re - 4.5.',
  },
  {
    id: 'roshko-irregular',
    name: 'Roshko (1954), irregular range',
    tex: '\\mathrm{St} = 0.212\\left(1 - \\frac{12.7}{\\mathrm{Re}}\\right)',
    range: [300, 2000],
    fn: (Re) => 0.212 * (1 - 12.7 / Re),
    source: 'NACA Report 1191, Eq. (2b), from F = 0.212 Re - 2.7. Extended to Re = 10 000 it stays within 4% of Roshko\'s best-fit line.',
  },
  {
    id: 'subcritical-plateau',
    name: 'Subcritical plateau',
    tex: '\\mathrm{St} \\approx 0.2',
    range: [2000, 2e5],
    fn: () => 0.2,
    source: 'A round value, not a fit: Roshko found St essentially constant in the irregular range, with periodic wake fluctuations up to the critical Re of about 2e5.',
  },
];

// St for a cylinder at Re, with the regime. NaN where no single value
// exists: below onset there is no shedding (St = 0 is returned), in
// Roshko's 150-300 transition range, and beyond the drag crisis.
export function strouhalCylinder(Re) {
  if (Re < SHEDDING_ONSET_RE) return { st: 0, regime: 'steady', fit: null };
  for (const F of STROUHAL_FITS) {
    if (Re >= F.range[0] && Re <= F.range[1]) return { st: F.fn(Re), regime: F.id, fit: F.id };
  }
  if (Re < 50) return { st: STROUHAL_FITS[0].fn(Re), regime: 'roshko-stable', fit: 'roshko-stable', extrapolated: true };
  if (Re < 300) return { st: NaN, regime: 'transition', fit: null };
  return { st: NaN, regime: 'critical', fit: null };
}

// ---------------------------------------------------------------------------
// Ship-model scaling. scale = L_model / L_ship (e.g. 1/25). Both in the same
// fluid (nu) and the same gravity. Froude similarity: U_m = U_s sqrt(scale).
// Reynolds similarity: U_m = U_s / scale. Their ratio is scale^(-3/2), and
// matching both would need nu_m = nu_s scale^(3/2).

export const ittc1957 = (Re) => 0.075 / Math.pow(Math.log10(Re) - 2, 2);

export function shipScaling({ lengthShip = 100, speedShip = 8, scale = 1 / 25, nu = 1.0e-6, g = 9.81 } = {}) {
  const Lm = lengthShip * scale;
  const FrS = speedShip / Math.sqrt(g * lengthShip);
  const ReS = (speedShip * lengthShip) / nu;
  const vFr = speedShip * Math.sqrt(scale);
  const vRe = speedShip / scale;
  const ReAtFr = (vFr * Lm) / nu;
  return {
    lengthModel: Lm,
    ship: { Fr: FrS, Re: ReS, Cf: ittc1957(ReS) },
    froude: { speed: vFr, Fr: FrS, Re: ReAtFr, Cf: ittc1957(ReAtFr), reRatio: ReAtFr / ReS },
    reynolds: { speed: vRe, Re: ReS, Fr: vRe / Math.sqrt(g * Lm), speedRatio: vRe / speedShip },
    speedRatio: vRe / vFr, // = scale^(-3/2)
    nuNeeded: nu * Math.pow(scale, 1.5),
  };
}

export const SHIP_PRESETS = {
  'cargo-1-25': { lengthShip: 100, speedShip: 8, scale: 1 / 25, nu: 1.0e-6, note: '100 m ship at 8 m/s (about 15.5 knots), 4 m model in fresh water at 20 °C.' },
  'yacht-1-10': { lengthShip: 12, speedShip: 4, scale: 1 / 10, nu: 1.0e-6, note: 'A 12 m yacht and a 1.2 m model.' },
  'tanker-1-50': { lengthShip: 300, speedShip: 7.5, scale: 1 / 50, nu: 1.0e-6, note: 'A 300 m tanker: Reynolds matching would need a model at 375 m/s.' },
};
