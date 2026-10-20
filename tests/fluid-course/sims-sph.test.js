// Claims the course makes about weakly compressible SPH, checked against the
// kernel in aids/fluid-course/src/sims/sph.js (the same code the figures run).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KERNELS, METHODS, PRESETS, kernelW, kernelF, kernelGrad,
  createNeighbourGrid, createPairList, findPairs,
  createSPH, setParams, step, advance, stableDt, diagnostics, updateKernelSum, probePressure, damBreakFront,
} from '../../aids/fluid-course/src/sims/sph.js';
import { rng, observedOrders } from '../../aids/fluid-course/src/sims/util.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

const KINDS = ['cubic', 'wendland'];

// ------------------------------------------------------------------ kernels

test('both kernels integrate to 1 in 2-D (radial and Cartesian quadrature)', () => {
  for (const k of KINDS) {
    for (const h of [1, 0.037]) {
      // radial midpoint rule: 2 pi int_0^2h W(r) r dr
      const N = 4000, R = 2 * h;
      let s = 0;
      for (let i = 0; i < N; i++) {
        const r = ((i + 0.5) * R) / N;
        s += 2 * Math.PI * r * kernelW(k, r, h) * (R / N);
      }
      assert.ok(Math.abs(s - 1) < 1e-3, `${k} h=${h}: radial integral ${s}`);
      // a genuinely 2-D sum over a fine grid
      const M = 400, d = (2 * R) / M;
      let c = 0;
      for (let a = 0; a < M; a++) for (let b = 0; b < M; b++) {
        c += kernelW(k, Math.hypot(-R + (a + 0.5) * d, -R + (b + 0.5) * d), h) * d * d;
      }
      assert.ok(Math.abs(c - 1) < 1e-3, `${k} h=${h}: Cartesian integral ${c}`);
    }
  }
});

test('kernels have compact support 2h and are positive inside it', () => {
  for (const k of KINDS) {
    assert.equal(kernelW(k, 2, 1), 0);
    assert.equal(kernelW(k, 2.5, 1), 0);
    assert.equal(kernelF(k, 2.2, 1), 0);
    for (let q = 0; q < 2; q += 0.05) assert.ok(kernelW(k, q, 1) > 0, `${k} W(${q}) > 0`);
  }
});

test('analytic gradients are antisymmetric and match finite differences of W', () => {
  const rand = rng(7);
  const h = 0.3, e = 1e-6;
  for (const k of KINDS) {
    for (let n = 0; n < 200; n++) {
      const dx = (rand() * 2 - 1) * 2 * h, dy = (rand() * 2 - 1) * 2 * h;
      const g = kernelGrad(k, dx, dy, h);
      const gji = kernelGrad(k, -dx, -dy, h);
      assert.equal(g[0], -gji[0]);
      assert.equal(g[1], -gji[1]);
      if (Math.hypot(dx, dy) > 1.95 * h || Math.hypot(dx, dy) < 1e-3) continue;
      const fx = (kernelW(k, Math.hypot(dx + e, dy), h) - kernelW(k, Math.hypot(dx - e, dy), h)) / (2 * e);
      const fy = (kernelW(k, Math.hypot(dx, dy + e), h) - kernelW(k, Math.hypot(dx, dy - e), h)) / (2 * e);
      const scale = kernelW(k, 0, h) / h;
      assert.ok(Math.abs(fx - g[0]) < 1e-6 * scale && Math.abs(fy - g[1]) < 1e-6 * scale, `${k} grad at (${dx}, ${dy})`);
    }
    // F is finite at r = 0 (no 0/0 for coincident particles)
    assert.ok(Number.isFinite(kernelF(k, 0, h)));
  }
});

test("W'' changes sign at the stated inflection, and is positive at the default neighbour spacing (Swegle et al. 1995)", () => {
  const d2 = (k, q) => (kernelW(k, q + 1e-4, 1) - 2 * kernelW(k, q, 1) + kernelW(k, q - 1e-4, 1)) / 1e-8;
  for (const k of KINDS) {
    const qi = KERNELS[k].inflection;
    assert.ok(d2(k, qi - 0.02) < 0 && d2(k, qi + 0.02) > 0, `${k}: W'' flips sign at q = ${qi}`);
    // nearest neighbour at q = dx/h = 1/hdx (1.2 cubic, 1.5 Wendland): W'' > 0, so both are
    // tensile-unstable under negative pressure at the default spacing
    const hdx = createSPH({ preset: 'tensile', kernel: k, hdx: 0, resolution: 12 }).hdx;
    assert.ok(d2(k, 1 / hdx) > 0, `${k}: W'' > 0 at q = 1/${hdx}`);
  }
});

// ------------------------------------------------------------------ neighbour search

function brutePairs(x, y, n, radius, nFluid, Lx = 0, Ly = 0) {
  const set = new Set();
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (i >= nFluid && j >= nFluid) continue;
    let dx = x[i] - x[j], dy = y[i] - y[j];
    if (Lx) { dx -= Lx * Math.round(dx / Lx); dy -= Ly * Math.round(dy / Ly); }
    if (dx * dx + dy * dy < radius * radius) set.add(`${i},${j}`);
  }
  return set;
}

function listedPairs(pl, nFluid) {
  const set = new Set();
  for (let k = 0; k < pl.count; k++) {
    const i = pl.i[k], j = pl.j[k];
    assert.ok(i < nFluid, 'the fluid particle of a mixed pair is stored first');
    const key = `${Math.min(i, j)},${Math.max(i, j)}`;
    assert.ok(!set.has(key), `pair ${key} listed twice`);
    set.add(key);
  }
  return set;
}

test('cell-linked-list neighbour search finds exactly the brute-force pairs', () => {
  const rand = rng(3);
  const n = 700, nFluid = 500, radius = 0.06;
  const x = new Float64Array(n), y = new Float64Array(n);
  for (let k = 0; k < n; k++) { x[k] = rand() * 1.2 - 0.1; y[k] = rand() * 0.8 - 0.1; } // some outside the grid box
  // open box: stray particles are clamped into edge cells but still found
  const grid = createNeighbourGrid({ xmin: 0, ymin: 0, xmax: 1, ymax: 0.6, cell: radius, capacity: n });
  const pl = createPairList(16); // forces the list to grow
  findPairs(grid, x, y, n, radius, pl, nFluid);
  const got = listedPairs(pl, nFluid), want = brutePairs(x, y, n, radius, nFluid);
  assert.equal(got.size, want.size);
  for (const key of want) assert.ok(got.has(key), `missing ${key}`);
  // the listed separations are x_i - x_j
  for (let k = 0; k < pl.count; k++) {
    assert.ok(Math.abs(pl.dx[k] - (x[pl.i[k]] - x[pl.j[k]])) < 1e-15);
    assert.ok(Math.abs(pl.r2[k] - (pl.dx[k] ** 2 + pl.dy[k] ** 2)) < 1e-15);
  }
});

test('periodic neighbour search uses the minimum image', () => {
  const rand = rng(11);
  const n = 600, radius = 0.09, Lx = 1, Ly = 0.7;
  const x = new Float64Array(n), y = new Float64Array(n);
  for (let k = 0; k < n; k++) { x[k] = rand() * Lx; y[k] = rand() * Ly; }
  const grid = createNeighbourGrid({ xmin: 0, ymin: 0, xmax: Lx, ymax: Ly, cell: radius, capacity: n, periodic: true });
  const pl = createPairList(64);
  findPairs(grid, x, y, n, radius, pl);
  const got = listedPairs(pl, n), want = brutePairs(x, y, n, radius, n, Lx, Ly);
  assert.equal(got.size, want.size);
  for (const key of want) assert.ok(got.has(key), `missing ${key}`);
});

test('non-finite positions never form pairs (a blown-up run cannot flood the pair list)', () => {
  const rand = rng(5);
  const n = 500, radius = 0.08;
  const x = new Float64Array(n), y = new Float64Array(n);
  for (let k = 0; k < n; k++) { x[k] = rand(); y[k] = rand(); }
  for (let k = 0; k < n; k += 3) { x[k] = NaN; y[k] = NaN; }
  x[1] = Infinity; y[2] = -Infinity;
  const grid = createNeighbourGrid({ xmin: 0, ymin: 0, xmax: 1, ymax: 1, cell: radius, capacity: n });
  const pl = createPairList(64);
  findPairs(grid, x, y, n, radius, pl);
  const got = listedPairs(pl, n), want = brutePairs(x, y, n, radius, n); // NaN distances fail the brute-force test too
  assert.equal(got.size, want.size);
  for (const key of want) assert.ok(got.has(key), `missing ${key}`);
  x.fill(NaN);
  assert.equal(findPairs(grid, x, y, n, radius, pl), 0, 'all NaN: no pairs');
});

test('the pair loop of the simulation evaluates the same W and F as kernelW and kernelF', () => {
  for (const kernel of KINDS) {
    const s = createSPH({ preset: 'hydrostatic', resolution: 12, kernel, jitter: 0.3 });
    const pl = s.pairs, W0 = kernelW(kernel, 0, s.h), F0 = Math.abs(kernelF(kernel, 0, s.h));
    assert.ok(pl.count > 1000);
    for (let k = 0; k < pl.count; k++) {
      const r = Math.sqrt(pl.r2[k]);
      assert.ok(Math.abs(pl.w[k] - kernelW(kernel, r, s.h)) < 1e-12 * W0, `${kernel} W at r = ${r}`);
      assert.ok(Math.abs(pl.f[k] - kernelF(kernel, r, s.h)) < 1e-12 * F0, `${kernel} F at r = ${r}`);
    }
  }
});

test('accelerations equal the documented momentum equation, summed pair by pair (Tait, viscosity with beta, artificial pressure)', () => {
  // A brute-force O(n^2) evaluation of the header's formulas with kernelW and
  // kernelF, against the state createSPH computes. Jitter and velocities make
  // densities, pressures (both signs) and approaching pairs all differ.
  for (const kernel of KINDS) {
    const s = createSPH({
      preset: 'tensile', kernel, resolution: 12, density: 'summation', jitter: 0.25, velocityNoise: 0.05,
      alpha: 0.3, beta: 0.6, artificialPressure: 0.2, backgroundPressure: -0.01, seed: 4,
    });
    const { nFluid: n, x, y, vx, vy, mass: m, h, rho0, B, gamma, c0 } = s;
    const pb = s.backgroundPressure, Wdx = kernelW(kernel, s.dx, h);
    const sep = (i, j) => {
      let dx = x[i] - x[j], dy = y[i] - y[j];
      dx -= Math.round(dx); dy -= Math.round(dy); // unit periodic box
      return [dx, dy];
    };
    const rho = new Float64Array(n), p = new Float64Array(n), c = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) { const [dx, dy] = sep(i, j); rho[i] += m * kernelW(kernel, Math.hypot(dx, dy), h); }
      p[i] = B * ((rho[i] / rho0) ** gamma - 1) + pb;
      c[i] = c0 * (rho[i] / rho0) ** ((gamma - 1) / 2);
    }
    let amax = 0, err = 0, neg = 0, approaching = 0;
    for (let i = 0; i < n; i++) {
      if (p[i] < 0) neg++;
      let ax = 0, ay = 0;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const [dx, dy] = sep(i, j), r = Math.hypot(dx, dy);
        if (r >= 2 * h) continue;
        const F = kernelF(kernel, r, h);
        const vr = (vx[i] - vx[j]) * dx + (vy[i] - vy[j]) * dy;
        let Pi = 0;
        if (vr < 0) {
          const mu = (h * vr) / (r * r + 0.01 * h * h);
          Pi = (-s.alpha * 0.5 * (c[i] + c[j]) * mu + s.beta * mu * mu) / (0.5 * (rho[i] + rho[j]));
          approaching++;
        }
        const R = 0.2 * ((p[i] < 0 ? -p[i] / rho[i] ** 2 : 0) + (p[j] < 0 ? -p[j] / rho[j] ** 2 : 0));
        const term = p[i] / rho[i] ** 2 + p[j] / rho[j] ** 2 + Pi + R * (kernelW(kernel, r, h) / Wdx) ** 4;
        ax -= m * term * F * dx;
        ay -= m * term * F * dy;
      }
      assert.ok(Math.abs(s.rho[i] - rho[i]) < 1e-12 * rho0, `${kernel}: summation density`);
      amax = Math.max(amax, Math.hypot(ax, ay));
      err = Math.max(err, Math.hypot(s.ax[i] - ax, s.ay[i] - ay));
    }
    assert.ok(neg > 0.2 * n && neg < 0.8 * n && approaching > 0, `${kernel}: the check must exercise both signs of p (${neg} negative) and the viscosity`);
    assert.ok(err < 1e-10 * amax, `${kernel}: max |a - a_ref| = ${err / amax} of max |a|`);
  }
});

// ------------------------------------------------------------------ density

test('summation density on a uniform lattice is rho0 within 1 % (Wendland is biased high at small h)', () => {
  const err = (kernel, hdx) => {
    const s = createSPH({ preset: 'tensile', kernel, hdx, density: 'summation', velocityNoise: 0, backgroundPressure: 0, resolution: 24 });
    return s.rho[0] / s.rho0 - 1;
  };
  for (const hdx of [1.2, 1.3, 1.5, 2]) assert.ok(Math.abs(err('cubic', hdx)) < 0.01, `cubic hdx=${hdx}: ${err('cubic', hdx)}`);
  for (const hdx of [1.5, 1.7, 2]) assert.ok(Math.abs(err('wendland', hdx)) < 0.01, `wendland hdx=${hdx}`);
  // Wendland's self-contribution bias: positive, shrinking as h grows (+1.05 % at 1.3 dx)
  const w = [1.2, 1.3, 1.5, 2].map((hdx) => err('wendland', hdx));
  assert.ok(w.every((e) => e > 0) && w[0] > w[1] && w[1] > w[2] && w[2] > w[3], `Wendland bias ${w}`);
  assert.ok(w[1] > 0.01 && w[1] < 0.011);
});

test('kernel-sum deficiency: a flat free surface fills about 3/4 of the kernel, and summation density drops with it', () => {
  for (const kernel of KINDS) {
    const cont = createSPH({ preset: 'hydrostatic', resolution: 16, kernel });
    const summ = createSPH({ preset: 'hydrostatic', resolution: 16, kernel, density: 'summation' });
    const shep = createSPH({ preset: 'hydrostatic', resolution: 16, kernel, density: 'summation', shepard: true });
    updateKernelSum(cont);
    const H = cont.meta.H, dx = cont.dx;
    let ks = 0, rs = 0, rsh = 0, rc = 0, nt = 0, inner = Infinity, innerMax = 0;
    for (let i = 0; i < cont.nFluid; i++) {
      if (cont.y[i] > H - dx) {
        ks += cont.kernelSum[i]; rs += summ.rho[i] / summ.rho0; rsh += shep.rho[i] / shep.rho0; rc += cont.rho[i] / cont.rho0; nt++;
      } else if (cont.y[i] < H - 2 * dx) {
        inner = Math.min(inner, cont.kernelSum[i]);
        innerMax = Math.max(innerMax, cont.kernelSum[i]);
      }
    }
    ks /= nt; rs /= nt; rsh /= nt; rc /= nt;
    // 0.76 (Wendland, h = 1.5 dx) and 0.79 (cubic, h = 1.2 dx) measured
    assert.ok(ks > 0.72 && ks < 0.82, `${kernel}: surface kernel sum ${ks}`);
    assert.ok(inner > 0.99 && innerMax < 1.01, `${kernel}: interior kernel sum in [${inner}, ${innerMax}] (walls fill the kernel)`);
    assert.ok(Math.abs(rs - ks) < 1e-12, 'summation density / rho0 is the kernel sum');
    assert.ok(rsh > rs + 0.04 && rsh < 0.86, `${kernel}: Shepard trims the deficit only partly (${rs} -> ${rsh})`);
    assert.ok(Math.abs(rc - 1) < 1e-3, 'continuity density keeps the surface at rho0');
  }
});

// ------------------------------------------------------------------ hydrostatics and walls

test('hydrostatic tank stays at rest with p = rho g (H - y) (walls: Adami et al. 2012), with or without density diffusion, with either kernel', () => {
  // densityDiffusion 0.1: the delta-SPH term with the hydrostatic part
  // subtracted (Fourtakas et al. 2019) must not make the tank sag.
  for (const densityDiffusion of [0, 0.1]) hydrostaticTank(densityDiffusion, 'wendland');
  hydrostaticTank(0, 'cubic');
});

test('density diffusion without the hydrostatic correction makes the tank at rest sag (Antuono et al. 2012)', () => {
  const bottom = (diffusionHydrostatic) => {
    const s = createSPH({ preset: 'hydrostatic', resolution: 16, densityDiffusion: 0.1, diffusionHydrostatic });
    advance(s, 1.0);
    let pb = 0, nb = 0;
    for (let i = 0; i < s.nFluid; i++) if (s.y[i] < s.dx) { pb += s.p[i]; nb++; }
    return pb / nb / (s.rho0 * s.g * (s.meta.H - 0.5 * s.dx));
  };
  const plain = bottom(false), corrected = bottom(true);
  assert.ok(plain < 0.98, `Molteni & Colagrossi as published: bottom pressure ${plain} of rho g H after 1 s`);
  assert.ok(Math.abs(corrected - 1) < 0.02, `hydrostatic part subtracted: ${corrected}`);
});

function hydrostaticTank(densityDiffusion, kernel) {
  const s = createSPH({ preset: 'hydrostatic', resolution: 16, densityDiffusion, kernel });
  const H = s.meta.H, g = s.g, rho0 = s.rho0, dx = s.dx;
  advance(s, 1.0);
  const d = diagnostics(s);
  assert.ok(!d.blownUp);
  assert.ok(d.maxSpeed < 0.01 * Math.sqrt(g * H), `max speed ${d.maxSpeed / Math.sqrt(g * H)} sqrt(gH)`);
  // bottom row against rho g (H - dx/2)
  let pb = 0, nb = 0;
  for (let i = 0; i < s.nFluid; i++) if (s.y[i] < dx) { pb += s.p[i]; nb++; }
  pb /= nb;
  const ratio = pb / (rho0 * g * (H - 0.5 * dx));
  assert.ok(Math.abs(ratio - 1) < 0.05, `bottom pressure ratio ${ratio}`);
  // a gauge on the floor reads rho g H
  const gauge = probePressure(s, 0.5 * s.meta.tankWidth, 0.5 * dx) / (rho0 * g * (H - 0.5 * dx));
  assert.ok(Math.abs(gauge - 1) < 0.05, `gauge ${gauge}`);
  // least-squares slope dp/dy = -rho0 g
  let sy = 0, sp = 0, syy = 0, syp = 0;
  for (let i = 0; i < s.nFluid; i++) { sy += s.y[i]; sp += s.p[i]; syy += s.y[i] ** 2; syp += s.y[i] * s.p[i]; }
  const n = s.nFluid, slope = (n * syp - sy * sp) / (n * syy - sy * sy);
  assert.ok(Math.abs(slope / (-rho0 * g) - 1) < 0.05, `dp/dy = ${slope / (-rho0 * g)} (-rho0 g)`);
  // weak compressibility: density varies by g H / c0^2 = 0.5 %
  assert.ok(d.maxDensityError < 0.01, `density error ${d.maxDensityError}`);
}

// ------------------------------------------------------------------ conservation

test('linear momentum is conserved to round-off without walls or gravity (periodic box)', () => {
  for (const density of ['continuity', 'summation']) {
    const s = createSPH({ preset: 'tensile', resolution: 20, density, velocityNoise: 0.05, alpha: 0.1, beta: 0.2, artificialPressure: 0.2, densityDiffusion: 0.1 });
    let scale = 0;
    for (let i = 0; i < s.nFluid; i++) scale += s.mass * Math.hypot(s.vx[i], s.vy[i]);
    const d0 = diagnostics(s);
    for (let k = 0; k < 300; k++) step(s);
    const d1 = diagnostics(s);
    assert.ok(Math.abs(d1.momentumX - d0.momentumX) < 1e-13 * scale, `${density} px drift ${(d1.momentumX - d0.momentumX) / scale}`);
    assert.ok(Math.abs(d1.momentumY - d0.momentumY) < 1e-13 * scale, `${density} py drift`);
  }
});

test('linear and angular momentum of a free rotating patch are conserved to round-off', () => {
  const s = createSPH({ preset: 'dam-break', resolution: 10, walls: false, gravity: 0, c0: 20, alpha: 0.1, beta: 0.2, artificialPressure: 0.2 });
  assert.equal(s.nWall, 0);
  for (let i = 0; i < s.nFluid; i++) { s.vx[i] = -1.5 * (s.y[i] - 1) + 0.3; s.vy[i] = 1.5 * (s.x[i] - 0.5) - 0.1; }
  const mom = () => {
    let L = 0, px = 0, py = 0, sc = 0;
    for (let i = 0; i < s.nFluid; i++) {
      L += s.mass * (s.x[i] * s.vy[i] - s.y[i] * s.vx[i]);
      px += s.mass * s.vx[i]; py += s.mass * s.vy[i];
      sc += s.mass * Math.hypot(s.vx[i], s.vy[i]) * (1 + Math.hypot(s.x[i], s.y[i]));
    }
    return { L, px, py, sc };
  };
  const a = mom();
  for (let k = 0; k < 300; k++) step(s);
  const b = mom();
  assert.ok(Math.abs(b.L - a.L) < 1e-13 * a.sc, `angular momentum drift ${(b.L - a.L) / a.sc}`);
  assert.ok(Math.abs(b.px - a.px) < 1e-13 * a.sc && Math.abs(b.py - a.py) < 1e-13 * a.sc);
});

test('without viscosity total energy stays within 1 %; artificial viscosity dissipates it', () => {
  const wave = (alpha) => {
    const s = createSPH({ preset: 'tensile', resolution: 20, kernel: 'wendland', backgroundPressure: 0, velocityNoise: 0, alpha });
    for (let i = 0; i < s.nFluid; i++) { s.vx[i] = 0.05 * Math.sin(2 * Math.PI * s.x[i]); s.vy[i] = 0.03 * Math.sin(2 * Math.PI * s.y[i]); }
    const E0 = diagnostics(s).total;
    let lo = E0, hi = E0;
    for (let k = 0; k < 1000; k++) {
      step(s);
      if (k % 10 === 9) { const e = diagnostics(s).total; lo = Math.min(lo, e); hi = Math.max(hi, e); }
    }
    return { E0, end: diagnostics(s).total, lo, hi };
  };
  const a = wave(0);
  assert.ok((a.hi - a.lo) / a.E0 < 0.01, `energy range ${(a.hi - a.lo) / a.E0}`);
  const b = wave(0.05);
  assert.ok(b.end < 0.3 * b.E0, `alpha = 0.05 leaves ${b.end / b.E0} of the energy`);
});

// ------------------------------------------------------------------ time stepping

test('kick-drift-kick is second order in time (artificial viscosity off), with or without delta-SPH', () => {
  // delta-SPH depends on rho itself; it sees a predicted rho^{n+1} in the
  // second half of the density update (at the half-updated density the step
  // is first order: 1.1-1.4 measured on this problem).
  for (const densityDiffusion of [0, 0.1]) {
    const run = (dt, T) => {
      const s = createSPH({ preset: 'tensile', resolution: 16, kernel: 'wendland', backgroundPressure: 0, velocityNoise: 0, alpha: 0, densityDiffusion });
      for (let i = 0; i < s.nFluid; i++) { s.vx[i] = 0.05 * Math.sin(2 * Math.PI * s.x[i]); s.vy[i] = 0.03 * Math.sin(2 * Math.PI * s.y[i]); }
      const n = Math.round(T / dt);
      for (let k = 0; k < n; k++) step(s, dt);
      return s;
    };
    const T = 0.4, dt0 = 0.02;
    const ref = run(dt0 / 32, T);
    const ex = [], er = [];
    for (const r of [1, 2, 4]) {
      const s = run(dt0 / r, T);
      let a = 0, b = 0;
      for (let i = 0; i < s.nFluid; i++) {
        let d = s.x[i] - ref.x[i];
        d -= Math.round(d);
        a = Math.max(a, Math.abs(d));
        b = Math.max(b, Math.abs(s.rho[i] - ref.rho[i]));
      }
      ex.push(a); er.push(b);
    }
    for (const p of [...observedOrders(ex), ...observedOrders(er)]) assert.ok(p > 1.8 && p < 2.3, `delta ${densityDiffusion}: observed order ${p}`);
  }
});

test('the acoustic CFL bounds the step: stable at c0 dt/h = 1.4, blows up by 2.0; default C = 0.25', () => {
  const run = (C) => {
    const s = createSPH({ preset: 'hydrostatic', resolution: 12 });
    const dt = (C * s.h) / s.c0;
    for (let k = 0; k < 400; k++) {
      step(s, dt);
      if (s.blownUp || diagnostics(s).maxSpeed > 0.5 * Math.sqrt(s.g * s.meta.H)) return k;
    }
    return Infinity;
  };
  assert.equal(run(1.4), Infinity);
  assert.ok(run(2.0) < 100);
  const s = createSPH({ preset: 'hydrostatic', resolution: 12 });
  const dt = stableDt(s);
  assert.ok(Math.abs((s.c0 * dt) / s.h - 0.25) < 0.01, 'at rest the acoustic limit binds');
  assert.ok(s.dtLimits.cv <= s.dtLimits.force && s.dtLimits.cv <= s.dtLimits.visc);
  assert.ok(Math.abs(s.c0 / Math.sqrt(2 * s.g * s.meta.H) - 10) < 1e-9, 'c0 = 10 sqrt(2 g H)');
});

test('an unstable step is flagged as a blow-up and stops the run, even when nothing turns NaN', () => {
  // A lattice under tension flies apart at c0 dt / h = 2.5 without ever
  // producing a NaN; the dam break produces NaNs at 3. Both must be flagged
  // (a particle drifting more than h per step), after which step() is a no-op.
  for (const [preset, C] of [['tensile-fixed', 2.5], ['dam-break', 3]]) {
    const s = createSPH({ preset, resolution: 12 });
    const dt = (C * s.h) / s.c0;
    let k = 0;
    while (!s.blownUp && k < 300) { step(s, dt); k++; }
    assert.ok(s.blownUp, `${preset} at c0 dt/h = ${C}: flagged after ${k} steps`);
    const t = s.t, steps = s.steps, cap = s.pairs.cap;
    assert.equal(step(s, dt), 0);
    assert.equal(step(s), 0);
    assert.equal(s.t, t);
    assert.equal(s.steps, steps);
    assert.equal(s.pairs.cap, cap);
    assert.equal(advance(s, t + 1), 0);
  }
  // a stable run never trips the drift criterion: the default step moves a particle at most a few % of h
  const s = createSPH({ preset: 'dam-break', resolution: 12 });
  let drift = 0;
  for (let k = 0; k < 300; k++) { step(s); drift = Math.max(drift, s.maxDrift); }
  assert.ok(!s.blownUp && drift < 0.1, `max |v| dt / h = ${drift}`);
});

// ------------------------------------------------------------------ instabilities

test('tensile instability: particles pair under negative pressure; artificial pressure prevents it', () => {
  // Seeds 1-8 at this size, t = 2: broken paired 0.09-0.14 with min 0.04-0.15;
  // fixed paired 0 with min 0.94-0.96. The thresholds sit well outside both.
  const run = (opts, T = 2) => {
    const s = createSPH({ resolution: 24, ...opts });
    advance(s, T);
    return diagnostics(s);
  };
  const broken = run({ preset: 'tensile' });
  assert.ok(broken.pairedFraction > 0.05 && broken.minNeighbourRatio < 0.3, `cubic, no fix: paired ${broken.pairedFraction}, min ${broken.minNeighbourRatio}`);
  const fixed = run({ preset: 'tensile-fixed' });
  assert.equal(fixed.pairedFraction, 0);
  assert.ok(fixed.minNeighbourRatio > 0.8, `artificial pressure: min ${fixed.minNeighbourRatio}`);
  // the Wendland kernel does NOT cure the tensile instability (0.39-0.46 paired over seeds 1-8)
  const wend = run({ preset: 'tensile', kernel: 'wendland' });
  assert.ok(wend.pairedFraction > 0.2, `Wendland, no fix: paired ${wend.pairedFraction}`);
  // particle shifting also keeps the lattice open
  const shift = run({ preset: 'tensile', shifting: 2 });
  assert.equal(shift.pairedFraction, 0);
  assert.ok(shift.minNeighbourRatio > 0.5, `shifting: min ${shift.minNeighbourRatio}`);
});

test('pairing instability: under compression the cubic spline pairs from h = 1.3 dx (not at its default 1.2 dx); Wendland C2 does not', () => {
  // Seeds 1-6 at this size, t = 12: h = 2 dx paired 0.58-0.64, h = 1.3 dx
  // 0.28-0.48 (min 0.28-0.34), h = 1.2 dx and Wendland 0 (min > 0.95).
  const run = (opts) => {
    const s = createSPH({ resolution: 20, ...opts });
    advance(s, 12);
    return diagnostics(s);
  };
  const wide = run({ preset: 'pairing' });
  assert.ok(wide.pairedFraction > 0.4, `cubic h = 2 dx: paired ${wide.pairedFraction}`);
  const narrow = run({ preset: 'pairing', hdx: 1.3 });
  assert.ok(narrow.pairedFraction > 0.15 && narrow.minNeighbourRatio < 0.45, `cubic h = 1.3 dx: paired ${narrow.pairedFraction}, min ${narrow.minNeighbourRatio}`);
  const dflt = run({ preset: 'pairing', hdx: 0 });
  assert.equal(dflt.pairedFraction, 0);
  assert.ok(dflt.minNeighbourRatio > 0.9, `cubic at its default h = 1.2 dx: min ${dflt.minNeighbourRatio}`);
  const wend = run({ preset: 'pairing-fixed' });
  assert.equal(wend.pairedFraction, 0);
  assert.ok(wend.minNeighbourRatio > 0.9, `Wendland: min ${wend.minNeighbourRatio}`);
  // it is pressure-driven: the same wide cubic lattice without background pressure holds
  const calm = run({ preset: 'pairing', backgroundPressure: 0 });
  assert.equal(calm.pairedFraction, 0);
});

// ------------------------------------------------------------------ free-surface flows

test('dam break: the front trails Ritter\'s 2 sqrt(gH) and weak compressibility holds density to ~1 %', () => {
  const s = createSPH({ preset: 'dam-break', resolution: 12 });
  const { a } = s.meta;
  const Tunit = Math.sqrt(a / (2 * s.g)); // T = t sqrt(2g/a)
  let maxErr = 0, maxMach = 0, prev = null;
  const fronts = [];
  for (let T = 0.25; T <= 3.0001; T += 0.25) {
    while (s.t < T * Tunit - 1e-12) {
      step(s, Math.min(stableDt(s), T * Tunit - s.t));
      if (s.steps % 25 === 0) {
        const d = diagnostics(s);
        maxErr = Math.max(maxErr, d.maxDensityError);
        maxMach = Math.max(maxMach, d.maxSpeed / s.c0);
      }
    }
    const f = damBreakFront(s);
    assert.ok(Math.abs(f.T - T) < 1e-9);
    assert.ok(f.Z < f.ritterZ, `T=${T}: Z=${f.Z} must trail Ritter ${f.ritterZ}`);
    if (prev) assert.ok(f.Z >= prev.Z - 1e-9, 'the front only advances');
    fronts.push(f);
    prev = f;
  }
  const at = (T) => fronts.find((f) => Math.abs(f.T - T) < 1e-9);
  const late = (at(3).Z - at(2).Z) / 1; // dZ/dT between T = 2 and 3; Ritter gives 2
  assert.ok(late > 1.0 && late < 1.6, `late front speed ${late / 2} of Ritter`);
  assert.ok(at(3).Z > 3.2 && at(3).Z < 4, `Z(T=3) = ${at(3).Z}`);
  assert.ok(maxErr < 0.01, `max density error ${maxErr}`); // 0.5 % measured (delta-SPH on)
  assert.ok(maxMach < 0.2, `max Mach ${maxMach}`);
});

test('density diffusion (delta-SPH) removes the spurious negative pressures of the collapsing column without slowing the front', () => {
  // Plain WCSPH: the release of the dam sends sound waves through the column
  // and they leave particles in tension (p < 0) in a flow whose true pressure
  // is >= 0. Sampled every 0.05 s up to t = 0.45 s, before the far wall.
  const run = (densityDiffusion) => {
    const s = createSPH({ preset: 'dam-break', resolution: 12, densityDiffusion });
    const scale = s.rho0 * s.g * s.meta.H;
    let frac = 0, nSamples = 0, pmin = 0;
    for (let t = 0.05; t <= 0.4501; t += 0.05) {
      advance(s, t);
      let neg = 0;
      for (let i = 0; i < s.nFluid; i++) {
        if (s.p[i] < -0.05 * scale) neg++;
        pmin = Math.min(pmin, s.p[i] / scale);
      }
      frac += neg / s.nFluid;
      nSamples++;
    }
    return { frac: frac / nSamples, pmin, Z: damBreakFront(s).Z };
  };
  const plain = run(0);
  const delta = run(0.1);
  assert.ok(plain.frac > 0.05 && plain.pmin < -0.5, `plain: ${plain.frac} of particles below -0.05 rho g H, min ${plain.pmin}`);
  assert.ok(delta.frac < 0.01 && delta.pmin > -0.3, `delta-SPH: ${delta.frac} below -0.05 rho g H, min ${delta.pmin}`);
  assert.ok(Math.abs(delta.Z / plain.Z - 1) < 0.02, `front ${delta.Z} vs ${plain.Z}`);
});

test('drop impact: negative pressure clumps particles; density diffusion helps, artificial pressure fixes it; the impact compresses by several per cent', () => {
  // Mean paired fraction (nearest neighbour < dx / 2) over the splash,
  // t = 0.5 .. 0.8 s (impact at about 0.35 s). Measured here: 0.165 plain,
  // 0.052 delta only, 0.014 both (at the preset's res 60, t = 0.5 .. 1 s:
  // 0.094, 0.043, 0.0075).
  const run = (opts) => {
    const s = createSPH({ preset: 'drop', resolution: 40, ...opts });
    let sum = 0, k = 0, compression = 0;
    for (let t = 0.5; t <= 0.8001; t += 0.05) {
      while (s.t < t - 1e-12) {
        step(s, Math.min(stableDt(s), t - s.t));
        for (let i = 0; i < s.nFluid; i++) compression = Math.max(compression, s.rho[i] / s.rho0 - 1);
      }
      sum += diagnostics(s).pairedFraction;
      k++;
    }
    assert.ok(!s.blownUp);
    return { paired: sum / k, compression };
  };
  const preset = run({}); // delta = 0.1, eps = 0.2
  const noAP = run({ artificialPressure: 0 });
  const plain = run({ artificialPressure: 0, densityDiffusion: 0 });
  assert.ok(plain.paired > 0.1, `plain WCSPH: mean paired ${plain.paired}`);
  assert.ok(noAP.paired > 0.03 && noAP.paired < 0.5 * plain.paired, `delta-SPH only: mean paired ${noAP.paired}`);
  assert.ok(preset.paired < 0.025 && preset.paired < 0.5 * noAP.paired, `delta-SPH + artificial pressure: mean paired ${preset.paired}`);
  // METHODS.tait: about 1 % in smooth flow, but an impact compresses more
  for (const r of [preset, plain]) assert.ok(r.compression > 0.03 && r.compression < 0.12, `peak compression ${r.compression}`);
});

test('elastic energy is finite for the linear equation of state (gamma = 1) and continuous as gamma -> 1', () => {
  const s = createSPH({ preset: 'hydrostatic', resolution: 10, gamma: 1 });
  const e1 = diagnostics(s).elastic;
  assert.ok(Number.isFinite(e1) && e1 > 0, `gamma = 1: elastic ${e1}`);
  setParams(s, { gamma: 1 + 1e-4 }); // same densities, B changes by 1e-4 too
  const e2 = diagnostics(s).elastic;
  assert.ok(Math.abs(e2 / e1 - 1) < 1e-3, `gamma 1 vs 1.0001: ${e1} vs ${e2}`);
});

test('options: undefined values keep the defaults, unknown or invalid ones throw', () => {
  const s = createSPH({ preset: 'tensile-fixed', kernel: undefined, artificialPressure: undefined, resolution: 12 });
  assert.equal(s.kernel, 'cubic');
  assert.equal(s.artificialPressure, 0.2);
  assert.throws(() => createSPH({ preset: 'tensile', artificalPressure: 0.2 }), /unknown SPH option/);
  assert.throws(() => createSPH({ preset: 'tensile', kernel: 'gaussian' }), /unknown SPH kernel/);
  assert.throws(() => createSPH({ preset: 'tensile', backgroundPressure: NaN }), /finite/);
  assert.throws(() => createSPH({ preset: 'nope' }), /unknown SPH preset/);
  // a key another preset understands is accepted (and ignored)
  assert.doesNotThrow(() => createSPH({ preset: 'tensile', resolution: 12, tankWidth: 3 }));
});

test('setParams: a live change gives exactly the run a fresh build with that setting gives', () => {
  const trajectory = (s) => { for (let k = 0; k < 40; k++) step(s); return Array.from(s.x.slice(0, 50)); };
  // artificial pressure off on the fixed lattice = the broken lattice
  const live = setParams(createSPH({ preset: 'tensile-fixed', resolution: 12 }), { artificialPressure: 0 });
  assert.deepEqual(trajectory(live), trajectory(createSPH({ preset: 'tensile', resolution: 12 })));
  // kernel switch (h kept)
  const k2 = setParams(createSPH({ preset: 'tensile', resolution: 12, hdx: 1.5 }), { kernel: 'wendland' });
  assert.deepEqual(trajectory(k2), trajectory(createSPH({ preset: 'tensile', resolution: 12, hdx: 1.5, kernel: 'wendland' })));
  // derived values follow
  const t = createSPH({ preset: 'hydrostatic', resolution: 10 });
  setParams(t, { gravity: 0, machFactor: 5 });
  assert.equal(t.gy, 0);
  assert.ok(Math.abs(t.c0 - 5 * Math.sqrt(2 * 9.81 * t.meta.H)) < 1e-12 && t.B === (t.rho0 * t.c0 * t.c0) / 7);
  for (let i = 0; i < t.nFluid; i++) assert.ok(t.ay[i] === t.ay[i]); // forces re-evaluated, finite
  assert.throws(() => setParams(t, { hdx: 2 }), /cannot change/);
  assert.throws(() => setParams(t, { resolution: 40 }), /cannot change/);
});

// ------------------------------------------------------------------ metadata

test('metadata: presets build, TeX parses, every method cites its formula', () => {
  for (const id of Object.keys(PRESETS)) {
    const s = createSPH({ preset: id, resolution: id === 'drop' ? 30 : 12 });
    assert.ok(s.nFluid > 0 && Number.isFinite(stableDt(s)), id);
  }
  for (const group of [KERNELS, METHODS]) {
    for (const [k, v] of Object.entries(group)) {
      assert.equal(v.id, k);
      assert.ok(v.name && v.description && v.tex, k);
      assert.doesNotThrow(() => tex(v.tex), k);
    }
  }
});
