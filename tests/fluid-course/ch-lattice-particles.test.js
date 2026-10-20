// Chapter 13 (lattice-particles): the claims its prose and figures make,
// measured on the kernels the figures run: the chapter's own lattice-gas
// kernel (src/sims/ch-lattice-particles-gas.js), lbm.js and sph.js. Claims
// already covered by sims-lbm.test.js (preset cases, onset near Re 47, the
// Ma^2 scaling, hero health) and sims-sph.test.js (tensile and pairing
// cases, kernel sums) are not repeated; these are the extra numbers the
// chapter quotes, with the settings its figures use.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAS_MODELS, createGas, step as gasStep, waveAmplitude, totals, rowMomentum, coarseGrain, fhpViscosity, fitDecay,
} from '../../aids/fluid-course/src/sims/ch-lattice-particles-gas.js';
import { createLBM, createPreset, initEquilibrium, collide, stream, equilibrium, step, health, totalMass, kineticEnergy, D2Q9 } from '../../aids/fluid-course/src/sims/lbm.js';
import { createSPH, step as sphStep, diagnostics, damBreakFront } from '../../aids/fluid-course/src/sims/sph.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);

// amplitude history of a shear wave, sampled every `every` steps
function waveRun(opts, steps, every = 10) {
  const g = createGas(opts);
  const ts = [], As = [];
  for (let s = 0; s <= steps; s += every) {
    ts.push(g.t);
    As.push(waveAmplitude(g) / g.U);
    if (s < steps) gasStep(g, every);
  }
  return { g, ts, As };
}
// the figure's fit: ln A against t while A/U > 0.2
function figureNu(opts, steps = 1500) {
  const { g, ts, As } = waveRun(opts, steps);
  let n = 0;
  while (n < As.length && As[n] > 0.2) n++;
  return fitDecay(ts.slice(0, n), As.slice(0, n), g.k).nu;
}

// ---------------------------------------------------------------- lattice gases

test('lattice gases: collision tables conserve particle number and momentum, state by state', () => {
  for (const model of ['hpp', 'fhp']) {
    const g = createGas({ model, nx: 8, ny: 8 });
    const M = GAS_MODELS[model];
    for (const table of g.tables) {
      for (let s = 0; s < 1 << M.b; s++) {
        const o = table[s];
        assert.equal(g.stateCount[o], g.stateCount[s], `${model} count ${s}`);
        close(g.stateMomX[o], g.stateMomX[s], 1e-12, `${model} px ${s}`);
        close(g.stateMomY[o], g.stateMomY[s], 1e-12, `${model} py ${s}`);
      }
    }
  }
});

test('lattice gases: total mass and momentum are conserved exactly over a run', () => {
  for (const model of ['hpp', 'fhp']) {
    const g = createGas({ model, nx: 64, ny: 64, density: 0.3, seed: 7 });
    const a = totals(g, {});
    gasStep(g, 300);
    const b = totals(g, {});
    assert.equal(b.mass, a.mass, `${model} mass`);
    close(b.px, a.px, 1e-9, `${model} px`);
    close(b.py, a.py, 1e-9, `${model} py`);
  }
});

test('HPP: every row keeps its x-momentum, so an axis-aligned shear wave never decays; at 45 degrees it does', () => {
  const g = createGas({ model: 'hpp', wave: 'flow-x', density: 0.25, U: 0.25, seed: 1 });
  const r0 = rowMomentum(g).slice();
  const A0 = waveAmplitude(g);
  gasStep(g, 2000);
  assert.deepEqual(Array.from(rowMomentum(g)), Array.from(r0));
  assert.equal(waveAmplitude(g), A0, 'the amplitude is a sum of row momenta: unchanged to the last bit');
  const diag = waveRun({ model: 'hpp', wave: 'diag', density: 0.25, U: 0.25, seed: 1 }, 1500);
  assert.ok(diag.As.at(-1) < 0.15, `diagonal wave decays: A/U = ${diag.As.at(-1)}`);
});

test('FHP: the shear wave decays at the same rate along x and along y, near the Boltzmann-approximation viscosity', (t) => {
  for (const d of [0.25]) {
    const nx = [], ny = [];
    for (let seed = 1; seed <= 4; seed++) {
      nx.push(figureNu({ model: 'fhp', wave: 'flow-x', density: d, U: 0.25, seed }));
      ny.push(figureNu({ model: 'fhp', wave: 'flow-y', density: d, U: 0.25, seed }));
    }
    const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
    const th = fhpViscosity(d);
    t.diagnostic(`d = ${d}: nu along x ${mean(nx).toFixed(3)}, along y ${mean(ny).toFixed(3)}, theory ${th.toFixed(3)}`);
    assert.ok(Math.abs(mean(nx) / mean(ny) - 1) < 0.06, 'isotropic within 6%');
    assert.ok(Math.abs(mean(nx) / th - 1) < 0.1 && Math.abs(mean(ny) / th - 1) < 0.1, 'within 10% of theory');
  }
  close(fhpViscosity(0.25), 0.6653, 1e-3, 'nu(0.25)');
});

test('FHP figure default (seed 1, d = 0.25): measured viscosity quoted by the chapter', (t) => {
  const v = figureNu({ model: 'fhp', wave: 'flow-x', density: 0.25, U: 0.25, seed: 1 });
  t.diagnostic(`nu = ${v.toFixed(3)}`);
  assert.ok(v > 0.6 && v < 0.75);
});

test('coarseGrain returns the wave: box velocities follow U sin(k.x) on average', () => {
  const g = createGas({ model: 'fhp', wave: 'flow-x', density: 0.25, U: 0.25, seed: 3 });
  const NB = 21, ue = new Float64Array(NB * NB);
  coarseGrain(g, NB, ue);
  let num = 0, den = 0;
  for (let J = 0; J < NB; J++) {
    const s = Math.sin(((J + 0.5) / NB) * 2 * Math.PI);
    for (let I = 0; I < NB; I++) {
      num += ue[I + J * NB] * s;
      den += s * s;
    }
  }
  close(num / den, 0.25, 0.03, 'projected amplitude');
});

// ---------------------------------------------------------------- one LBM step

test('collision relaxes f - f^eq by exactly (1 - 1/tau) and leaves density and momentum alone; streaming moves populations', () => {
  const { cx, cy } = D2Q9;
  for (const tau of [0.55, 0.8, 2]) {
    const L = createLBM({ nx: 3, ny: 3, tau });
    initEquilibrium(L, { ux: (x, y, i, j) => (i === 1 && j === 1 ? 0.12 : 0), uy: (x, y, i, j) => (i === 1 && j === 1 ? 0.05 : 0) });
    const N = 9, c = 4;
    L.f[5 * N + c] += 0.012;
    L.f[7 * N + c] += 0.012;
    L.f[6 * N + c] -= 0.012;
    L.f[8 * N + c] -= 0.012;
    L.macroT = -1;
    const mom = () => {
      let r = 0, jx = 0, jy = 0;
      for (let q = 0; q < 9; q++) {
        r += L.f[q * N + c];
        jx += cx[q] * L.f[q * N + c];
        jy += cy[q] * L.f[q * N + c];
      }
      return [r, jx, jy];
    };
    const [r0, jx0, jy0] = mom();
    const feq = equilibrium(r0, jx0 / r0, jy0 / r0);
    const before = Array.from({ length: 9 }, (_, q) => L.f[q * N + c] - feq[q]);
    collide(L);
    const [r1, jx1, jy1] = mom();
    close(r1, r0, 1e-14, 'rho');
    close(jx1, jx0, 1e-14, 'jx');
    close(jy1, jy0, 1e-14, 'jy');
    for (let q = 0; q < 9; q++) close(L.f[q * N + c] - feq[q], (1 - 1 / tau) * before[q], 1e-14, `q ${q}, tau ${tau}`);
    // stream: the middle node's east population lands on the east neighbour
    const east = L.f[1 * N + c];
    stream(L);
    close(L.f[1 * N + 5], east, 0, 'east population streamed one node');
  }
});

// ---------------------------------------------------------------- the cylinder wake

// the figure's Strouhal measurement: upward crossings of the wake probe
function wakeSt(Re, steps) {
  const L = createPreset('hero', { Re });
  const { xc, yc, D, U } = L.meta;
  const N = L.N, F = L.f, c = Math.round(xc + 3 * D) + Math.floor(yc) * L.nx;
  const cross = [];
  let armed = false, amp = 0;
  for (let s = 0; s < steps; s++) {
    step(L, 1);
    const rho = F[c] + F[c + N] + F[c + 2 * N] + F[c + 3 * N] + F[c + 4 * N] + F[c + 5 * N] + F[c + 6 * N] + F[c + 7 * N] + F[c + 8 * N];
    const v = (F[c + 2 * N] - F[c + 4 * N] + F[c + 5 * N] + F[c + 6 * N] - F[c + 7 * N] - F[c + 8 * N]) / rho / U;
    if (L.t > steps - 1500) amp = Math.max(amp, Math.abs(v));
    if (v < -0.05) armed = true;
    else if (armed && v > 0) {
      armed = false;
      cross.push(L.t);
    }
  }
  const k = cross.length;
  const St = k >= 6 ? D / (U * ((cross[k - 1] - cross[k - 5]) / 4)) : NaN;
  return { St, amp, L };
}

test('vortex street: St from the wake probe is 0.20 at Re 150 and 0.19 at Re 100, a little above Williamson\'s unbounded-cylinder fit', (t) => {
  const w = (Re) => -3.3265 / Re + 0.1816 + 1.6e-4 * Re;
  const a = wakeSt(150, 6000), b = wakeSt(100, 7000);
  t.diagnostic(`Re 150: St ${a.St.toFixed(3)} (Williamson ${w(150).toFixed(3)}), amp ${a.amp.toFixed(2)}; Re 100: St ${b.St.toFixed(3)} (Williamson ${w(100).toFixed(3)}), amp ${b.amp.toFixed(2)}`);
  close(a.St, 0.202, 0.008, 'Re 150');
  close(b.St, 0.188, 0.008, 'Re 100');
  assert.ok(a.St > w(150) && a.St < 1.15 * w(150), 'within 15% above the fit');
  assert.ok(health(a.L).ok && !health(a.L).warn);
});

test('vortex street: at Re 40 the start-up kick dies away, by about a fifth every 1000 steps (the figure\'s steady preset)', () => {
  const a = wakeSt(40, 3000).amp, b = wakeSt(40, 8000).amp;
  const perK = (b / a) ** (1 / 5);
  assert.ok(b < 0.05, `probe amplitude ${b}`);
  assert.ok(perK > 0.7 && perK < 0.85, `factor per 1000 steps ${perK}`);
});

test('hero: mass stays within 0.1% and health is clean over 20k steps', () => {
  const L = createPreset('hero');
  const m0 = totalMass(L);
  for (let k = 0; k < 4; k++) {
    step(L, 5000);
    const h = health(L);
    assert.ok(h.ok && !h.warn, `step ${L.t}: ${h.reason}`);
    assert.ok(Math.abs(totalMass(L) / m0 - 1) < 1e-3);
  }
});

// ---------------------------------------------------------------- tau -> 1/2 and Mach

test('shear layer, n = 64: BGK blows up at tau = 0.501 and survives 0.502 (the figure\'s slider)', () => {
  const life = (tau) => {
    const L = createPreset('shear-layer', { n: 64, tau, collision: 'bgk' });
    for (let s = 0; s < 3000; s += 10) {
      step(L, 10);
      if (!health(L).ok) return L.t;
    }
    return Infinity;
  };
  const a = life(0.501), b = life(0.502);
  assert.ok(a < 1000, `0.501 fails (${a})`);
  assert.equal(b, Infinity);
});

test('Taylor-Green: the extra decay-rate error is about -0.19 Ma^2 (the scheme decays too slowly)', () => {
  const err = (U) => {
    const L = createPreset('taylor-green', { n: 32, tau: 0.8, U, collision: 'bgk' });
    step(L, 10);
    const E1 = kineticEnergy(L), t1 = L.t;
    step(L, Math.max(20, Math.round(0.5 / L.meta.rate)));
    return -Math.log(kineticEnergy(L) / E1) / (L.t - t1) / L.meta.rate - 1;
  };
  const base = err(0.005);
  for (const U of [0.04, 0.08, 0.16]) {
    const c = (err(U) - base) / (3 * U * U);
    assert.ok(c < -0.17 && c > -0.2, `U = ${U}: coefficient ${c}`);
  }
});

// ---------------------------------------------------------------- SPH dam break (figure resolution 20)

function damBreak(opts, marks) {
  const S = createSPH({ preset: 'dam-break', resolution: 20, ...opts });
  const pg = S.rho0 * S.g * S.meta.H;
  const out = [];
  const D = {}, F = {};
  let wallT = NaN;
  for (const tm of marks) {
    while (S.t < tm) {
      sphStep(S);
      if (Number.isNaN(wallT) && damBreakFront(S, F).Z >= 3.95) wallT = F.T;
    }
    let neg = 0;
    for (let i = 0; i < S.nFluid; i++) if (S.p[i] < -0.05 * pg) neg++;
    diagnostics(S, D);
    out.push({ t: S.t, neg: neg / S.nFluid, paired: D.pairedFraction, ks: D.kernelSumMin, rhoErr: D.maxDensityError });
  }
  return { out, wallT, S };
}

test('dam break: delta-SPH keeps negative pressures rare before impact; without it a quarter of the water reads negative', (t) => {
  const a = damBreak({}, [0.05, 0.4, 0.6]);
  const b = damBreak({ densityDiffusion: 0 }, [0.05, 0.6]);
  t.diagnostic(`delta: ${a.out.map((o) => (100 * o.neg).toFixed(1)).join(', ')}%; plain: ${b.out.map((o) => (100 * o.neg).toFixed(1)).join(', ')}%`);
  for (const o of a.out) assert.ok(o.neg < 0.02, `delta t = ${o.t}: ${o.neg}`);
  assert.ok(b.out[0].neg > 0.2, `plain at t = 0.05: ${b.out[0].neg}`);
  assert.ok(b.out[1].neg > 0.1, `plain at t = 0.6: ${b.out[1].neg}`);
  for (const o of a.out) assert.ok(o.rhoErr < 0.01, 'density within 1% before impact');
  // the free surface truncates the kernel: the smallest kernel sum is ~0.56
  assert.ok(a.out[0].ks > 0.5 && a.out[0].ks < 0.62, `kernel sum ${a.out[0].ks}`);
});

test('dam break: summation density reads the half-empty surface kernels as low density: half the water negative, half of it paired', (t) => {
  const r = damBreak({ density: 'summation', densityDiffusion: 0 }, [0.05]);
  t.diagnostic(`summation at t = 0.05: negative ${(100 * r.out[0].neg).toFixed(1)}%, paired ${(100 * r.out[0].paired).toFixed(1)}%`);
  assert.ok(r.out[0].neg > 0.4);
  assert.ok(r.out[0].paired > 0.4);
});

test('dam break: the surge reaches the far wall (Z = 4) at T ~ 3.3, well behind Ritter\'s Z = 1 + 2T (T = 1.5)', () => {
  const r = damBreak({}, [0.8]);
  assert.ok(r.wallT > 3.1 && r.wallT < 3.5, `T at the wall ${r.wallT}`);
});
