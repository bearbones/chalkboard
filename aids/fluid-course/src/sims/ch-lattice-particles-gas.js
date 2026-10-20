// Chapter 13 (lattice-particles) kernel: two Boolean lattice gases, HPP and
// FHP, and the shear-wave test that shows why the lattice's symmetry matters.
//
// The models
//   - HPP (Hardy, Pomeau & de Pazzis, Phys. Rev. Lett. 31 (1973) 276;
//     J. Math. Phys. 14 (1973) 1746): a square lattice, four unit velocities
//     (E, N, W, S), at most one particle per velocity per site (one bit
//     each). Collision: a head-on pair (E + W, or N + S) and nothing else at
//     the site turns through 90 degrees. Then every particle hops one site
//     along its velocity. Mass and momentum are conserved exactly, but so is
//     much more: the x-momentum summed along every row, and the y-momentum
//     summed along every column, because collisions only swap a zero-
//     x-momentum pair (E + W) for another (N + S) and E/W particles never
//     leave their row. Those spurious invariants (and the square lattice's
//     too-small symmetry group) make HPP's large-scale equations anisotropic.
//   - FHP (Frisch, Hasslacher & Pomeau, Phys. Rev. Lett. 56 (1986) 1505), in
//     the variant usually called FHP-I: a triangular (hexagonal-symmetry)
//     lattice, six unit velocities at 60 degree intervals, no rest particle.
//     Collisions: a head-on pair alone at a site turns through +60 or -60
//     degrees, chosen at random; a symmetric triple (0, 2, 4) becomes
//     (1, 3, 5) and vice versa. The triple collision removes the spurious
//     invariant that head-on collisions alone would leave. With six
//     velocities the fourth-order lattice tensor is isotropic, so the
//     large-scale flow obeys an isotropic Navier-Stokes equation (with the
//     known lattice-gas defects: noise, a density-dependent factor in the
//     advection term, a velocity-dependent pressure; Frisch et al., Complex
//     Systems 1 (1987) 649).
//   - Viscosity of FHP-I in the Boltzmann (molecular-chaos) approximation,
//     lattice units, d = mean occupation per velocity:
//       nu(d) = 1 / (12 d (1 - d)^3) - 1/8
//     (Frisch et al. 1987; Wolf-Gladrow, Lattice-Gas Cellular Automata and
//     Lattice Boltzmann Models, Springer LNM 1725 (2000) ch. 3). The tests
//     compare the measured shear-wave decay with it.
//
// The test the chapter runs (shearWave): start from the local equilibrium
// of a sinusoidal shear flow u = U e sin(k . x), e perpendicular to k, by
// filling each velocity slot with probability d (1 + 2 c_q . u) (the linear
// equilibrium for D = 2 and unit speeds: its mean momentum per site is
// b d u). Then measure the amplitude
//   A(t) = 2 / (b d N) sum_sites (j . e) sin(k . x)
// which starts at U and, for a Navier-Stokes fluid, decays like
// exp(-nu k^2 t) whatever the direction of k. On HPP an axis-aligned wave
// (k along y, flow along x) cannot decay at all: A is a combination of the
// conserved row momenta, so it stays at its initial value exactly. A wave at
// 45 degrees decays. On FHP waves along x and along y decay at the same
// rate.
//
// Conventions
//   - Sites are stored row by row: c = i + j * nx, j = 0 at the bottom; both
//     directions periodic. Each site is one byte; bit q is velocity q.
//   - HPP velocities q = 0..3: E, N, W, S. Site positions x = i, y = j.
//   - FHP velocities q = 0..5 at angles 60 q degrees: E, NE, NW, W, SW, SE.
//     The triangular lattice is stored in offset rows: site (i, j) sits at
//     x = i + (j odd ? 1/2 : 0), y = j sqrt(3)/2, so ny must be even for the
//     vertical period to close. The physical box is nx by ny sqrt(3)/2.
//   - Randomness (FHP chirality) comes from a seeded xorshift32 stream, one
//     bit per site per step: deterministic, the same in node and browsers.
//   - step(gas, n) does collide-then-stream n times and allocates nothing.

import { rng } from './util.js';

const S3 = Math.sqrt(3) / 2;

export const GAS_MODELS = Object.freeze({
  hpp: {
    id: 'hpp',
    name: 'HPP (square lattice, 1973)',
    b: 4,
    cx: [1, 0, -1, 0],
    cy: [0, 1, 0, -1],
    description: 'Four velocities on a square lattice; head-on pairs turn through 90 degrees. Conserves mass and momentum, and also the momentum of every row and column: its large-scale flow is anisotropic.',
    cite: 'Hardy, Pomeau & de Pazzis, Phys. Rev. Lett. 31 (1973) 276',
  },
  fhp: {
    id: 'fhp',
    name: 'FHP (triangular lattice, 1986)',
    b: 6,
    cx: [1, 0.5, -0.5, -1, -0.5, 0.5],
    cy: [0, S3, S3, 0, -S3, -S3],
    description: 'Six velocities on a triangular lattice; head-on pairs turn through +-60 degrees at random, symmetric triples rotate by 60 degrees. Its large-scale flow obeys an isotropic Navier-Stokes equation.',
    cite: 'Frisch, Hasslacher & Pomeau, Phys. Rev. Lett. 56 (1986) 1505',
  },
});

// Shear-wave orientations: k is the wavevector direction, e the flow
// direction. 'diag' is HPP only (it needs nx = ny).
export const WAVES = Object.freeze({
  'flow-x': { id: 'flow-x', name: 'flow along x, varying in y', note: 'u_x = U sin(k y)' },
  'flow-y': { id: 'flow-y', name: 'flow along y, varying in x', note: 'u_y = U sin(k x)' },
  diag: { id: 'diag', name: 'at 45 degrees', note: 'u = U (1, -1)/sqrt 2 sin(k (x + y)/sqrt 2 ...)' },
});

// FHP-I shear viscosity (Boltzmann approximation), lattice units.
export function fhpViscosity(d) {
  return 1 / (12 * d * (1 - d) ** 3) - 1 / 8;
}

// Collision tables: out = table[state]. HPP has one table; FHP two (one per
// chirality of the head-on rotation).
function hppTable() {
  const t = new Uint8Array(16);
  for (let s = 0; s < 16; s++) t[s] = s;
  t[0b0101] = 0b1010; // E + W -> N + S
  t[0b1010] = 0b0101; // N + S -> E + W
  return t;
}

function fhpTables() {
  const plus = new Uint8Array(64), minus = new Uint8Array(64);
  for (let s = 0; s < 64; s++) plus[s] = minus[s] = s;
  for (let q = 0; q < 3; q++) {
    const pair = (1 << q) | (1 << (q + 3));
    const rot = (k) => (1 << ((q + k + 6) % 6)) | (1 << ((q + k + 3 + 6) % 6));
    plus[pair] = rot(1);
    minus[pair] = rot(-1);
  }
  const A = 0b010101, B = 0b101010;
  plus[A] = minus[A] = B;
  plus[B] = minus[B] = A;
  return [plus, minus];
}

// Push destination of site c along velocity q: dest[c * b + q].
function destinations(model, nx, ny) {
  const N = nx * ny;
  const b = GAS_MODELS[model].b;
  const dest = new Int32Array(N * b);
  const w = (i) => ((i % nx) + nx) % nx;
  const v = (j) => ((j % ny) + ny) % ny;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (model === 'hpp') {
        dest[c * 4 + 0] = w(i + 1) + j * nx;
        dest[c * 4 + 1] = i + v(j + 1) * nx;
        dest[c * 4 + 2] = w(i - 1) + j * nx;
        dest[c * 4 + 3] = i + v(j - 1) * nx;
      } else {
        // offset rows: odd rows sit half a site to the right
        const odd = j & 1;
        const up = v(j + 1) * nx, dn = v(j - 1) * nx;
        dest[c * 6 + 0] = w(i + 1) + j * nx; // E
        dest[c * 6 + 1] = w(i + odd) + up; // NE
        dest[c * 6 + 2] = w(i - 1 + odd) + up; // NW
        dest[c * 6 + 3] = w(i - 1) + j * nx; // W
        dest[c * 6 + 4] = w(i - 1 + odd) + dn; // SW
        dest[c * 6 + 5] = w(i + odd) + dn; // SE
      }
    }
  }
  return dest;
}

// Build a lattice gas holding a sinusoidal shear wave.
//   model    'hpp' | 'fhp'
//   nx, ny   sites (FHP: ny even). Defaults 128 x 128 (HPP), 128 x 148 (FHP,
//            a box 128 by 128.2).
//   density  d, mean occupation per velocity slot (0 < d < 1)
//   wave     'flow-x' | 'flow-y' | 'diag' (diag: HPP with nx = ny)
//   U        wave amplitude in lattice units (keep d (1 + 2U) < 1)
//   modes    wavelengths per box (default 1)
//   seed     for the initial occupation and the FHP chirality stream
export function createGas(opts = {}) {
  const model = opts.model || 'fhp';
  const M = GAS_MODELS[model];
  if (!M) throw new Error(`lattice gas: unknown model '${model}'`);
  const nx = opts.nx ?? 128;
  const ny = opts.ny ?? (model === 'fhp' ? 148 : 128);
  if (model === 'fhp' && ny % 2) throw new RangeError('lattice gas: FHP needs an even number of rows');
  const d = opts.density ?? 0.2;
  const U = opts.U ?? 0.2;
  const wave = opts.wave || 'flow-x';
  if (!WAVES[wave]) throw new Error(`lattice gas: unknown wave '${wave}'`);
  if (wave === 'diag' && (model !== 'hpp' || nx !== ny)) throw new RangeError("lattice gas: the 'diag' wave needs HPP on a square box");
  if (!(d > 0 && d < 1)) throw new RangeError('lattice gas: density must lie in (0, 1)');
  if (d * (1 + 2 * U) > 1) throw new RangeError('lattice gas: d (1 + 2U) must not exceed 1');
  const modes = opts.modes ?? 1;
  const N = nx * ny;
  const b = M.b;
  const Lx = nx, Ly = model === 'fhp' ? ny * S3 : ny;
  // wavevector k and flow direction e
  let kx = 0, ky = 0, ex = 0, ey = 0;
  if (wave === 'flow-x') {
    ky = (2 * Math.PI * modes) / Ly;
    ex = 1;
  } else if (wave === 'flow-y') {
    kx = (2 * Math.PI * modes) / Lx;
    ey = 1;
  } else {
    kx = ky = (2 * Math.PI * modes) / Lx; // sin(k(x + y)) is periodic on the square box
    ex = Math.SQRT1_2;
    ey = -Math.SQRT1_2;
  }
  const X = new Float64Array(N), Y = new Float64Array(N), phase = new Float64Array(N);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      X[c] = model === 'fhp' ? i + (j & 1 ? 0.5 : 0) : i;
      Y[c] = model === 'fhp' ? j * S3 : j;
      phase[c] = Math.sin(kx * X[c] + ky * Y[c]);
    }
  }
  const gas = {
    model, name: M.name, nx, ny, N, b, d, U, wave, Lx, Ly,
    k: Math.hypot(kx, ky), kx, ky, ex, ey,
    cx: Float64Array.from(M.cx), cy: Float64Array.from(M.cy),
    cell: new Uint8Array(N), next: new Uint8Array(N),
    dest: destinations(model, nx, ny),
    X, Y, phase,
    tables: model === 'hpp' ? [hppTable(), hppTable()] : fhpTables(),
    t: 0,
    rand: 0,
    seed: opts.seed ?? 1,
    // projection weight per site for the momentum along e: (c_q . e)
    ce: new Float64Array(b),
    // per-state momentum along e and particle count (table lookups)
    stateMom: new Float64Array(1 << b),
    stateMomX: new Float64Array(1 << b),
    stateMomY: new Float64Array(1 << b),
    stateCount: new Uint8Array(1 << b),
  };
  for (let q = 0; q < b; q++) gas.ce[q] = gas.cx[q] * ex + gas.cy[q] * ey;
  for (let s = 0; s < 1 << b; s++) {
    let m = 0, mx = 0, my = 0, n = 0;
    for (let q = 0; q < b; q++) {
      if (s & (1 << q)) {
        m += gas.ce[q];
        mx += gas.cx[q];
        my += gas.cy[q];
        n++;
      }
    }
    gas.stateMom[s] = m;
    gas.stateMomX[s] = mx;
    gas.stateMomY[s] = my;
    gas.stateCount[s] = n;
  }
  // initial occupation: probability d (1 + 2 c_q . u) per slot
  const rand = rng(gas.seed);
  for (let c = 0; c < N; c++) {
    const ux = U * ex * phase[c], uy = U * ey * phase[c];
    let s = 0;
    for (let q = 0; q < b; q++) {
      const p = d * (1 + 2 * (gas.cx[q] * ux + gas.cy[q] * uy));
      if (rand() < p) s |= 1 << q;
    }
    gas.cell[c] = s;
  }
  // xorshift32 seed for the chirality stream (never zero)
  gas.rand = (Math.floor(rand() * 0xffffffff) | 1) >>> 0;
  return gas;
}

// n steps of collide-then-stream.
export function step(gas, n = 1) {
  const { N, b, dest } = gas;
  const [t0, t1] = gas.tables;
  let cell = gas.cell, next = gas.next;
  let r = gas.rand, bits = 0, left = 0;
  for (let s = 0; s < n; s++) {
    next.fill(0);
    for (let c = 0; c < N; c++) {
      let st = cell[c];
      if (st === 0) continue;
      if (left === 0) {
        // xorshift32
        r ^= r << 13;
        r >>>= 0;
        r ^= r >>> 17;
        r ^= r << 5;
        r >>>= 0;
        bits = r;
        left = 32;
      }
      st = bits & 1 ? t1[st] : t0[st];
      bits >>>= 1;
      left--;
      const o = c * b;
      for (let q = 0; q < b; q++) if (st & (1 << q)) next[dest[o + q]] |= 1 << q;
    }
    const tmp = cell;
    cell = next;
    next = tmp;
    gas.t++;
  }
  gas.cell = cell;
  gas.next = next;
  gas.rand = r;
  return gas;
}

// Shear-wave amplitude A(t) (starts near U; see the header).
export function waveAmplitude(gas) {
  const { N, cell, phase, stateMom } = gas;
  let s = 0;
  for (let c = 0; c < N; c++) {
    const st = cell[c];
    if (st) s += stateMom[st] * phase[c];
  }
  return (2 * s) / (gas.b * gas.d * N);
}

// Totals: particle count and momentum.
export function totals(gas, out = {}) {
  const { N, cell, stateCount, stateMomX, stateMomY } = gas;
  let n = 0, px = 0, py = 0;
  for (let c = 0; c < N; c++) {
    const st = cell[c];
    n += stateCount[st];
    px += stateMomX[st];
    py += stateMomY[st];
  }
  out.mass = n;
  out.px = px;
  out.py = py;
  return out;
}

// Row sums of x-momentum (length ny): HPP conserves every one of them.
export function rowMomentum(gas, out = new Float64Array(gas.ny)) {
  const { nx, ny, cell, stateMomX } = gas;
  for (let j = 0; j < ny; j++) {
    let s = 0;
    for (let i = 0; i < nx; i++) s += stateMomX[cell[i + j * nx]];
    out[j] = s;
  }
  return out;
}

// Coarse-grain into an NB x NB grid of equal boxes in physical space (the
// FHP rows are sqrt(3)/2 apart, so the boxes hold whole sites by position,
// not by index). Fills, per box K = I + J * NB: ue[K], the mean velocity
// along the wave's flow direction e, u = j / (b d) from the linear
// equilibrium (mean momentum per site j = b d u), and, if given, occ[K], the
// mean occupation per velocity slot. The box index of every site is cached
// on the gas at the first call.
export function coarseGrain(gas, NB, ue, occ) {
  const { N, cell, stateMom, stateCount, b, d } = gas;
  if (!gas.box || gas.boxNB !== NB) {
    gas.box = new Int32Array(N);
    gas.boxSites = new Float64Array(NB * NB);
    gas.boxNB = NB;
    for (let c = 0; c < N; c++) {
      const I = Math.min(NB - 1, Math.floor((gas.X[c] * NB) / gas.Lx));
      const J = Math.min(NB - 1, Math.floor((gas.Y[c] * NB) / gas.Ly));
      gas.box[c] = I + J * NB;
      gas.boxSites[I + J * NB]++;
    }
  }
  const box = gas.box, sites = gas.boxSites, M = NB * NB;
  ue.fill(0, 0, M);
  if (occ) occ.fill(0, 0, M);
  for (let c = 0; c < N; c++) {
    const st = cell[c];
    if (!st) continue;
    ue[box[c]] += stateMom[st];
    if (occ) occ[box[c]] += stateCount[st];
  }
  for (let K = 0; K < M; K++) {
    ue[K] /= b * d * sites[K];
    if (occ) occ[K] /= b * sites[K];
  }
  return ue;
}

// Exact decay of the shear-wave amplitude for a Navier-Stokes fluid of
// kinematic viscosity nu: U exp(-nu k^2 t).
export function shearDecay(U, nu, k, t) {
  return U * Math.exp(-nu * k * k * t);
}

// Least-squares decay rate of ln A against t over samples (t, A) with
// A > floor; returns { rate, nu } with nu = rate / k^2.
export function fitDecay(ts, As, k, floor = 0) {
  let n = 0, st = 0, sl = 0, stt = 0, stl = 0;
  for (let m = 0; m < ts.length; m++) {
    if (!(As[m] > floor)) continue;
    const l = Math.log(As[m]);
    n++;
    st += ts[m];
    sl += l;
    stt += ts[m] * ts[m];
    stl += ts[m] * l;
  }
  if (n < 2) return { rate: NaN, nu: NaN };
  const rate = -(n * stl - st * sl) / (n * stt - st * st);
  return { rate, nu: rate / (k * k) };
}
