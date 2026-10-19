// Chapter 7 (advection): the claims its prose, figures and gallery entries
// make, measured on the kernels the figures run (src/sims/advection.js and
// src/sims/ch-advection-analysis.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCHEMES, PRESETS, createState, step, diagnostics, maxAmplification, amplification, modifiedEquation, exact, makeProfile,
} from '../../aids/fluid-course/src/sims/advection.js';
import {
  momentsPeriodic, groupVelocity, modifiedSpeeds, reach, cflLimit, EXTRA_PRESETS,
} from '../../aids/fluid-course/src/sims/ch-advection-analysis.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const run = (st, id, nu, N, opts) => {
  for (let k = 0; k < N; k++) step(st, id, nu, opts);
  return st;
};
const LINEAR = ['upwind', 'downwind', 'ftcs', 'lxf', 'lw', 'bw', 'fromm', 'leapfrog'];

test('momentsPeriodic: a Gaussian has its own variance, wherever it sits on the circle', () => {
  for (const x0 of [0.5, 0.97, 0.02]) {
    const st = createState(400, { id: 'gaussian', x0, sigma: 0.05 }, { sample: 'point' });
    const m = momentsPeriodic(st.x, st.u, x0, 1);
    close(m.offset, 0, 1e-9, `offset at x0 = ${x0}`);
    close(m.variance, 0.05 * 0.05, 1e-6, `variance at x0 = ${x0}`);
  }
});

test('upwind spreads a pulse exactly as the modified equation says: variance grows by 2Dt', () => {
  for (const [n, nu] of [[100, 0.5], [100, 0.2], [100, 0.9], [200, 0.5]]) {
    const st = createState(n, 'gaussian');
    const v0 = momentsPeriodic(st.x, st.u, 0.5, 1).variance;
    const N = Math.round(1 / (nu / n)); // one revolution
    run(st, 'upwind', nu, N);
    const v1 = momentsPeriodic(st.x, st.u, (0.5 + st.t) % 1, 1).variance;
    const D = modifiedEquation('upwind', 1, 1 / n, nu).D;
    close((v1 - v0) / (2 * D * st.t), 1, 2e-3, `upwind n=${n} ν=${nu}`);
  }
});

test('Lax–Friedrichs spreads faster, and matches 2Dt while the pulse stays narrow', () => {
  const st = createState(100, 'gaussian');
  const v0 = momentsPeriodic(st.x, st.u, 0.5, 1).variance;
  run(st, 'lxf', 0.5, 200);
  const v1 = momentsPeriodic(st.x, st.u, (0.5 + st.t) % 1, 1).variance;
  const D = modifiedEquation('lxf', 1, 0.01, 0.5).D;
  close((v1 - v0) / (2 * D * st.t), 1, 0.01, 'LxF n=100 ν=0.5');
  assert.ok(D / modifiedEquation('upwind', 1, 0.01, 0.5).D > 2.9, 'LxF diffuses three times as much as upwind at ν = 0.5');
});

test('groupVelocity: upwind at ν = 1 is exact; leapfrog matches cos θ / sqrt(1 − ν² sin² θ)', () => {
  for (const th of [0.3, 1, 2]) close(groupVelocity('upwind', 1, th), 1, 1e-6, `upwind ν=1 θ=${th}`);
  for (const nu of [0.3, 0.5, 0.8]) {
    for (const th of [0.2, 1.005, 2.5]) {
      const want = Math.cos(th) / Math.sqrt(1 - nu * nu * Math.sin(th) ** 2);
      close(groupVelocity('leapfrog', nu, th), want, 1e-6, `leapfrog ν=${nu} θ=${th}`);
    }
  }
  // Lax–Wendroff's shortest waves travel backwards as packets.
  assert.ok(groupVelocity('lw', 0.5, 3) < 0, 'LW group velocity near θ = π is negative');
});

test('modifiedSpeeds agrees with the discrete phase speed for well-resolved waves', () => {
  for (const id of ['lw', 'bw', 'fromm', 'leapfrog', 'upwind']) {
    for (const nu of [0.25, 0.5, 0.75]) {
      const th = 0.1;
      const ms = modifiedSpeeds(id, nu, th);
      const g = amplification(id, nu, th);
      close(ms.phase, g.relSpeed, 2e-4, `${id} ν=${nu} phase`);
      close(ms.group, groupVelocity(id, nu, th), 5e-4, `${id} ν=${nu} group`);
    }
  }
});

test('a leapfrog wave packet travels at the discrete group velocity, not at a', () => {
  const n = 100, nu = 0.5, k = 16;
  const theta = (2 * Math.PI * k) / n;
  const cg = groupVelocity('leapfrog', nu, theta);
  close(cg, 0.5915, 1e-3, 'c_g/a at θ = 1.005');
  const st = createState(n, 'packet');
  const N = 200;
  run(st, 'leapfrog', nu, N, { start: 'lw' });
  const predicted = 0.5 + cg * st.t;
  const m = momentsPeriodic(st.x, st.u, predicted % 1, 2);
  close(m.offset, 0, 0.005, 'envelope centre relative to x0 + c_g t');
  const lag = predicted - (0.5 + st.t);
  close(lag, -0.4085, 2e-3, 'lag behind the exact packet after t = 1');
});

test('reach and cflLimit: the stencils of SCHEMES, and the CFL bound is necessary', () => {
  const want = { upwind: 1, downwind: 0, ftcs: 1, lxf: 1, lw: 1, bw: 2, fromm: 2, leapfrog: 1 };
  for (const id of LINEAR) {
    assert.equal(cflLimit(id), want[id], id);
    assert.ok(reach(id).right >= 0, id);
    // Past the CFL bound every scheme amplifies some mode.
    assert.ok(maxAmplification(id, cflLimit(id) + 0.05) > 1 + 1e-3, `${id} unstable beyond the CFL bound`);
  }
  // Necessary, not sufficient: FTCS and downwind fail inside it (downwind has none).
  assert.ok(maxAmplification('ftcs', 0.5) > 1.1, 'FTCS unstable at ν = 0.5 although ν ≤ 1');
  for (const id of ['upwind', 'lxf', 'lw', 'fromm', 'bw']) {
    assert.ok(maxAmplification(id, SCHEMES[id].nuMax) <= 1 + 1e-12, `${id} stable at its nuMax`);
  }
});

test('measured growth per step matches the largest von Neumann factor', () => {
  for (const [id, nu] of [['ftcs', 0.5], ['upwind', 1.1], ['downwind', 0.5], ['lw', 1.1], ['bw', 2.1]]) {
    const st = createState(100, 'square');
    run(st, id, nu, 150);
    const before = diagnostics(st).max;
    run(st, id, nu, 50);
    const rate = Math.pow(diagnostics(st).max / before, 1 / 50);
    const g = maxAmplification(id, nu);
    assert.ok(rate <= g * 1.001 && rate >= g * 0.98, `${id} ν=${nu}: ${rate} vs ${g}`);
  }
});

test('EXTRA_PRESETS lw-dispersion: the broken run dips below zero, the fixed run does not', () => {
  const p = EXTRA_PRESETS['lw-dispersion'];
  const metric = (cfg) => {
    const st = createState(cfg.n, cfg.profile);
    run(st, cfg.scheme, cfg.nu, cfg.steps, cfg.opts);
    close(st.t, 1, 1e-9, 'one revolution');
    return diagnostics(st)[p.metric];
  };
  const broken = metric(p.broken), fixed = metric(p.fixed);
  assert.ok(broken > p.threshold, `broken undershoot ${broken}`);
  assert.ok(fixed < p.threshold / 10, `fixed undershoot ${fixed}`);
  // The pulse keeps its mass: the ripples are rearrangement, not loss.
  const st = createState(50, 'gaussian');
  run(st, 'lw', 0.5, 100);
  assert.ok(Math.abs(diagnostics(st).massError) < 1e-12, 'mass conserved');
});

test('the chapter text numbers: FTCS growth, upwind damping of the odd-even mode, LxF keeping it', () => {
  close(maxAmplification('ftcs', 0.5), Math.sqrt(1.25), 1e-9, 'FTCS max |G| at ν = 0.5');
  close(amplification('upwind', 0.5, Math.PI).mag, 0, 1e-12, 'upwind kills θ = π at ν = 1/2');
  close(amplification('lxf', 0.5, Math.PI).mag, 1, 1e-12, 'LxF never damps θ = π');
  close(amplification('lw', 0.5, Math.PI / 2).relSpeed, 0.749, 1e-3, 'LW speed at four points per wavelength');
  close(maxAmplification('leapfrog', 1.02), 1.221, 2e-3, 'leapfrog just past ν = 1');
  // Upwind at ν = 1 is the exact shift.
  const st = createState(64, 'square');
  run(st, 'upwind', 1, 64);
  const f = makeProfile('square');
  let err = 0;
  for (let j = 0; j < 64; j++) err = Math.max(err, Math.abs(st.u[j] - st.u0[j]));
  assert.ok(err < 1e-12 && f && exact, 'upwind at ν = 1 returns the start after one revolution');
  assert.ok(PRESETS['cfl-violation'], 'shared preset present');
});
