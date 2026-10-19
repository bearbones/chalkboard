// Tests for the D2Q9 lattice Boltzmann kernel: the claims the lattice
// Boltzmann chapter makes, checked against exact moments, conservation,
// analytic solutions (Poiseuille, Taylor-Green), the Ghia et al. (1982)
// cavity data, and measured stability behaviour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  D2Q9, CS2, equilibrium, viscosity, tauFromViscosity, suggestTau, reynolds, tauMinus, magicOf,
  createLBM, createPreset, initEquilibrium, addDisk, setSolid, setCollision, setBodyForce, step, stepPhases,
  macroscopic, vorticity, totalMass, kineticEnergy, health, applyBoundaries,
  poiseuilleProfile, taylorGreenRate, GHIA_RE100, PRESETS, COLLISIONS, SCHEMES, BOUNDARIES,
} from '../../aids/fluid-course/src/sims/lbm.js';
import { rng, drain } from '../../aids/fluid-course/src/sims/util.js';

const { cx, cy, w } = D2Q9;
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b}, got ${a} (tol ${tol})`);

// Run until healthy() fails or max steps pass. Returns the step count at
// failure (Infinity if it survived) and the last health report.
function lifetime(L, max, chunk = 20) {
  for (let s = 0; s < max; s += chunk) {
    step(L, chunk);
    const h = health(L);
    if (!h.ok) return { t: L.t, h };
  }
  return { t: Infinity, h: health(L) };
}

// Every case of a preset with the given expectation.
const casesOf = (id, expect) => Object.entries(PRESETS[id].cases).filter(([, c]) => c.expect === expect);

// Lift coefficient from the momentum-exchange force on the obstacle.
const lift = (L) => (2 * L.obstacleForce[1]) / (L.rho0 * L.meta.U * L.meta.U * L.meta.D);

test('D2Q9 weights are normalised and isotropic up to fourth order, so c_s^2 = 1/3', () => {
  let s0 = 0, sxx = 0, syy = 0, sxy = 0, sxxxx = 0, sxxyy = 0, sx = 0, sxxx = 0;
  for (let q = 0; q < 9; q++) {
    s0 += w[q];
    sx += w[q] * cx[q];
    sxx += w[q] * cx[q] * cx[q];
    syy += w[q] * cy[q] * cy[q];
    sxy += w[q] * cx[q] * cy[q];
    sxxx += w[q] * cx[q] ** 3;
    sxxxx += w[q] * cx[q] ** 4;
    sxxyy += w[q] * cx[q] ** 2 * cy[q] ** 2;
    assert.equal(cx[D2Q9.opp[q]] + cx[q], 0); // opp reverses the velocity
    assert.equal(cy[D2Q9.opp[q]] + cy[q], 0);
  }
  close(s0, 1, 1e-15);
  close(sx, 0, 1e-15);
  close(sxx, CS2, 1e-15);
  close(syy, CS2, 1e-15);
  close(sxy, 0, 1e-15);
  close(sxxx, 0, 1e-15);
  close(sxxxx, 3 * CS2 * CS2, 1e-15);
  close(sxxyy, CS2 * CS2, 1e-15);
});

test('equilibrium moments: density, momentum and rho c_s^2 I + rho u u are exact', () => {
  const e = new Float64Array(9);
  for (const [rho, ux, uy] of [[1, 0, 0], [1.03, 0.1, -0.05], [0.97, -0.17, 0.12], [2, 0.3, 0.3]]) {
    equilibrium(rho, ux, uy, e);
    let m0 = 0, jx = 0, jy = 0, pxx = 0, pxy = 0, pyy = 0;
    for (let q = 0; q < 9; q++) {
      m0 += e[q];
      jx += e[q] * cx[q];
      jy += e[q] * cy[q];
      pxx += e[q] * cx[q] * cx[q];
      pxy += e[q] * cx[q] * cy[q];
      pyy += e[q] * cy[q] * cy[q];
    }
    const tol = 1e-14 * rho;
    close(m0, rho, tol, 'density');
    close(jx, rho * ux, tol, 'x momentum');
    close(jy, rho * uy, tol, 'y momentum');
    close(pxx, rho * CS2 + rho * ux * ux, tol, 'Pi_xx');
    close(pxy, rho * ux * uy, tol, 'Pi_xy');
    close(pyy, rho * CS2 + rho * uy * uy, tol, 'Pi_yy');
  }
});

test('equilibrium positivity: every f^eq_q >= 0 exactly up to |u| = c_s (Ma = 1), not beyond', (t) => {
  // Bisect, in each of 720 flow directions, the speed at which the first
  // population goes negative. The minimum over directions is c_s: the
  // population with c_q.u = -1/3 equals w_q rho (1/2 - 3|u|^2/2) there.
  const e = new Float64Array(9);
  const anyNegative = (m, th) => {
    equilibrium(1, m * Math.cos(th), m * Math.sin(th), e);
    return e.some((v) => v < 0);
  };
  let first = Infinity, at = 0;
  for (let a = 0; a < 720; a++) {
    const th = (2 * Math.PI * a) / 720;
    let lo = 0, hi = 1;
    for (let it = 0; it < 50; it++) {
      const m = 0.5 * (lo + hi);
      if (anyNegative(m, th)) hi = m;
      else lo = m;
    }
    if (hi < first) {
      first = hi;
      at = (th * 180) / Math.PI;
    }
  }
  t.diagnostic(`first negative f^eq at Ma = ${(first / Math.sqrt(CS2)).toFixed(6)} (found at ${at.toFixed(2)} degrees from x; every direction with some c_q.u = -1/3 ties)`);
  close(first / Math.sqrt(CS2), 1, 1e-4, 'threshold Mach number');
  // every population q touches zero at Ma = 1 in the direction where
  // c_q.u = -1/3; for f_S that is 35.3 degrees above the x axis
  const th = Math.atan(1 / Math.sqrt(2)), cs = Math.sqrt(CS2);
  close(equilibrium(1, cs * Math.cos(th), cs * Math.sin(th), e)[4], 0, 1e-15, 'f_S at Ma = 1');
  // just below c_s nothing is negative in any direction; f_0 alone lasts to Ma = sqrt 2
  for (let a = 0; a < 720; a++) assert.ok(!anyNegative(0.999 * Math.sqrt(CS2), (2 * Math.PI * a) / 720));
  close(equilibrium(1, Math.sqrt(2 / 3), 0, e)[0], 0, 1e-15, 'f_0 at Ma = sqrt 2');
  assert.ok(/Ma <= 1/.test(SCHEMES.equilibrium.stability));
  // health() fails at Ma = 1 by default, exactly where positivity can be lost
  const flow = (ma) => ({ nx: 4, ny: 4, ux0: ma * cs * Math.cos(th), uy0: ma * cs * Math.sin(th) });
  const sub = health(createLBM(flow(0.99)));
  const sup = health(createLBM(flow(1.01)));
  assert.ok(sub.ok && sub.warn && sub.negative === 0);
  assert.ok(!sup.ok && sup.reason === 'supersonic velocity' && sup.negative > 0);
});

test('parameter helpers: nu = (tau - 1/2)/3, suggestTau and reynolds invert each other', () => {
  close(viscosity(0.8), 0.1, 1e-15);
  close(tauFromViscosity(viscosity(0.537)), 0.537, 1e-15);
  const tau = suggestTau(150, 0.1, 12);
  close(tau, 0.524, 1e-12);
  const L = createLBM({ nx: 4, ny: 4, tau });
  close(reynolds(L, 0.1, 12), 150, 1e-9);
  // TRT: Lambda = (tau - 1/2)(tau- - 1/2); BGK is the special case tau- = tau.
  close((0.6 - 0.5) * (tauMinus(0.6, 0.25) - 0.5), 0.25, 1e-15);
  setCollision(L, { collision: 'trt', tau: 0.6, magic: 3 / 16 });
  close(magicOf(L), 3 / 16, 1e-15);
  setCollision(L, { collision: 'bgk' });
  close(magicOf(L), 0.01, 1e-15);
  assert.ok(COLLISIONS.bgk.tex.includes('\\tau') && COLLISIONS.trt.tex.includes('\\Lambda'));
  // nu must be positive and the TRT magic parameter too
  for (const bad of [{ tau: 0.5 }, { tau: 0.4 }, { tau: NaN }, { collision: 'trt', tau: 0.5 }, { collision: 'trt', tau: 0.6, magic: 0 }, { collision: 'trt', tau: 0.6, magic: -0.1 }]) {
    assert.throws(() => setCollision(L, bad), RangeError, JSON.stringify(bad));
  }
  assert.equal(L.collision, 'bgk'); // a rejected call changes nothing
  close(L.tau, 0.6, 0);
  assert.throws(() => createLBM({ tau: 0.5 }), RangeError);
  assert.throws(() => createPreset('shear-layer', { tau: 0.49 }), RangeError);
});

test('mass is conserved to 1e-10 in a periodic run, and with a moving lid and an obstacle', () => {
  const rand = rng(7);
  for (const collision of ['bgk', 'trt']) {
    const L = createLBM({ nx: 48, ny: 48, tau: 0.53, collision });
    initEquilibrium(L, { rho: () => 1 + 0.02 * (rand() - 0.5), ux: () => 0.05 * (rand() - 0.5), uy: () => 0.05 * (rand() - 0.5) });
    const m0 = totalMass(L);
    step(L, 2000);
    assert.ok(health(L).ok);
    assert.ok(Math.abs(totalMass(L) - m0) / m0 < 1e-10, `${collision} periodic drift ${(totalMass(L) - m0) / m0}`);
  }
  const C = createLBM({ nx: 32, ny: 32, tau: 0.6, collision: 'trt', boundaries: { left: 'wall', right: 'wall', bottom: 'wall', top: { type: 'wall', u: [0.1, 0] } } });
  addDisk(C, 12, 12, 4);
  initEquilibrium(C, {});
  const m0 = totalMass(C);
  step(C, 2000);
  assert.ok(Math.abs(totalMass(C) - m0) / m0 < 1e-10, `cavity drift ${(totalMass(C) - m0) / m0}`);
});

test('Guo forcing adds exactly F of momentum per cell per step; with no force momentum is conserved', () => {
  const momentum = (L) => {
    let px = 0, py = 0;
    for (let c = 0; c < L.N; c++) for (let q = 0; q < 9; q++) {
      px += L.f[q * L.N + c] * cx[q];
      py += L.f[q * L.N + c] * cy[q];
    }
    return [px, py];
  };
  const F = [1e-5, -2e-5];
  const L = createLBM({ nx: 16, ny: 12, tau: 0.7, collision: 'trt', force: F });
  const p0 = momentum(L);
  step(L, 100);
  const p1 = momentum(L);
  close((p1[0] - p0[0]) / (L.N * F[0] * 100), 1, 1e-9);
  close((p1[1] - p0[1]) / (L.N * F[1] * 100), 1, 1e-9);
  const rand = rng(3);
  const Q = createLBM({ nx: 20, ny: 20, tau: 0.55, collision: 'bgk' });
  initEquilibrium(Q, { ux: () => 0.05 * (rand() - 0.5), uy: () => 0.05 * (rand() - 0.5) });
  const q0 = momentum(Q);
  step(Q, 500);
  const q1 = momentum(Q);
  close(q1[0], q0[0], 1e-11);
  close(q1[1], q0[1], 1e-11);
});

test('fused and split streaming, and the stepPhases generator, give bit-identical results', () => {
  const make = (streaming) => {
    const L = createLBM({
      nx: 40, ny: 30, tau: 0.7, collision: 'trt', streaming, force: [1e-5, 0],
      boundaries: { left: { type: 'velocity', u: [0.05, 0], method: 'zou-he' }, right: { type: 'outlet', mode: 'convective' }, bottom: 'wall', top: { type: 'wall', u: [0.05, 0] } },
    });
    addDisk(L, 12, 15, 4);
    initEquilibrium(L, { ux: 0.05 });
    return L;
  };
  const a = make('fused'), b = make('split'), c = make('fused');
  step(a, 300);
  step(b, 300);
  const kinds = [];
  for (let s = 0; s < 300; s++) drain(stepPhases(c), (e) => s === 0 && e.t === 'enter' && kinds.push(e.kind));
  assert.deepEqual(kinds, ['collide', 'stream', 'boundary']);
  for (let k = 0; k < a.f.length; k++) {
    if (a.f[k] !== b.f[k] || a.f[k] !== c.f[k]) assert.fail(`population ${k} differs`);
  }
  assert.equal(a.obstacleForce[0], b.obstacleForce[0]);
});

test('an obstacle drawn against an open side walls off that edge node: healthy, and fused, split and stepPhases still agree', () => {
  for (const mode of ['zero-gradient', 'extrapolation', 'convective', 'pressure']) {
    for (const collision of ['bgk', 'trt']) {
      const make = (streaming) => {
        const L = createLBM({
          nx: 40, ny: 30, tau: 0.53, collision, streaming,
          // periodic in y: a walled channel with a zero-gradient outlet drifts
          // in density on its own (see the outlet-drift case)
          boundaries: { left: { type: 'velocity', u: [0.06, 0] }, right: { type: 'outlet', mode }, bottom: 'periodic', top: 'periodic' },
        });
        initEquilibrium(L, { ux: 0.06 });
        return L;
      };
      // a reader paints mid-run: a stroke one column in from the inlet and
      // one from the outlet, each touching the edge node's inward neighbour
      const paint = (L) => {
        for (let j = 8; j < 16; j++) setSolid(L, 1, j);
        for (let j = 14; j < 22; j++) setSolid(L, L.nx - 2, j);
      };
      const a = make('fused'), b = make('split'), c = make('fused');
      step(a, 50); step(b, 50);
      for (let s = 0; s < 50; s++) drain(stepPhases(c));
      paint(a); paint(b); paint(c);
      step(a, 400); step(b, 400);
      for (let s = 0; s < 400; s++) drain(stepPhases(c));
      for (let k = 0; k < a.f.length; k++) {
        if (a.solid[k % a.N]) continue;
        if (a.f[k] !== b.f[k] || a.f[k] !== c.f[k]) assert.fail(`${mode} ${collision}: population ${k} differs`);
      }
      const h = health(a);
      assert.ok(h.ok && !h.warn, `${mode} ${collision}: ${h.reason} at cell ${h.firstBadCell}, rho ${h.minRho}..${h.maxRho}`);
      // (!h.warn above also rules out the frozen-population symptom: an
      // outlet node stuck at rho ~ 0.75.) The walled-off edge nodes take no
      // inflow: they start at rest when painted and keep no x-momentum.
      macroscopic(a);
      for (const [i, j] of [[0, 11], [a.nx - 1, 18]]) {
        const c0 = i + j * a.nx;
        assert.ok(Math.abs(a.ux[c0]) < 1e-12, `${mode} ${collision}: walled-off node ux ${a.ux[c0]}`);
      }
    }
  }
});

test('cached macroscopic fields never go stale: after the boundary phase, after a direct bodyForce write', () => {
  // A figure that draws between the phases of stepPhases: the inlet node
  // must read the prescribed velocity once the boundary phase has run.
  const L = createPreset('hero', { nx: 80, ny: 32, D: 8 });
  step(L, 50);
  const om = new Float64Array(L.N);
  drain(stepPhases(L), (e) => {
    if (e.t === 'leave' && e.kind === 'stream') vorticity(L, om); // fills the cache mid-step
  });
  vorticity(L, om);
  for (let j = 0; j < L.ny; j++) close(L.ux[j * L.nx], L.meta.U, 1e-12, `inlet ux at j = ${j}`);
  const e1 = kineticEnergy(L);
  macroscopic(L);
  assert.equal(kineticEnergy(L), e1);
  // writing the uniform force directly changes the Guo velocity u = (sum f c + F/2)/rho
  const P = createPreset('poiseuille');
  step(P, 100);
  vorticity(P, new Float64Array(P.N));
  P.bodyForce[0] *= 10;
  const k1 = kineticEnergy(P);
  const ref = Float64Array.from(P.ux);
  macroscopic(P);
  assert.deepEqual(ref, P.ux);
  assert.equal(kineticEnergy(P), k1);
  setBodyForce(P, 0, 0);
  assert.ok(kineticEnergy(P) < k1);
});

// Steady body-force-driven channel flow (the poiseuille preset, 3 columns
// wide: the flow is one-dimensional): walls at y = 0 and y = H.
function poiseuille(collision, tau, magic, H = 16, extra = {}) {
  const L = createPreset('poiseuille', { nx: 3, ny: H, tau, collision, magic, ...extra });
  const nu = viscosity(L.tau), F = L.meta.F;
  step(L, Math.ceil((20 * H * H) / (Math.PI ** 2 * nu)));
  macroscopic(L);
  let err = 0;
  const prof = [];
  for (let j = 0; j < H; j++) {
    const u = L.ux[1 + j * 3];
    prof.push(u);
    err = Math.max(err, Math.abs(u - poiseuilleProfile(j + 0.5, H, F, nu)) / L.meta.U);
  }
  close(L.meta.exact(H / 2), L.meta.U, 1e-15); // the preset's force gives u_max at the centre
  // effective viscosity from the centreline speed, u_c = F H^2 / (8 nu)
  // the two nodes nearest the centre sit at y = H/2 -+ 1/2, where
  // u = F (H^2/4 - 1/4) / (2 nu): invert for the viscosity the flow feels
  const uc = 0.5 * (prof[H / 2 - 1] + prof[H / 2]);
  const nuEff = (F * (H * H / 4 - 0.25)) / (2 * uc);
  return { err, nuEff, nu, uc, prof, F };
}

test('Poiseuille: TRT with Lambda = 3/16 reproduces the parabola for any tau, with nu = (tau - 1/2)/3', (t) => {
  for (const tau of [0.6, 2]) {
    const r = poiseuille('trt', tau, 3 / 16);
    t.diagnostic(`TRT 3/16 tau ${tau}: max error ${r.err.toExponential(2)} u_max, nu_eff/nu = ${(r.nuEff / r.nu).toFixed(9)}`);
    assert.ok(r.err < 1e-6, `tau ${tau}: max error ${r.err} of u_max`);
    close(r.nuEff / r.nu, 1, 1e-6, `effective viscosity at tau ${tau}`);
  }
});

test('Poiseuille: with BGK the bounce-back wall moves with tau (exact only where Lambda = (tau-1/2)^2 = 3/16)', (t) => {
  const r2 = poiseuille('bgk', 2, 0);
  t.diagnostic(`BGK tau 2: max error ${(100 * r2.err).toFixed(2)}% of u_max`);
  assert.ok(r2.err > 0.02, `BGK tau = 2 should show a few per cent slip error, got ${r2.err}`);
  const rMagic = poiseuille('bgk', 0.5 + Math.sqrt(3 / 16), 0);
  assert.ok(rMagic.err < 1e-6, `BGK at tau = 1/2 + sqrt(3/16): ${rMagic.err}`);
  // TRT's steady state depends on Lambda only: same normalised profile at two taus
  const a = poiseuille('trt', 0.7, 0.25), b = poiseuille('trt', 1.7, 0.25);
  for (let j = 0; j < a.prof.length; j++) close((a.prof[j] * a.nu) / a.F, (b.prof[j] * b.nu) / b.F, 1e-7 * (a.uc * a.nu) / a.F);
  t.diagnostic(`TRT Lambda 1/4: max error ${a.err.toExponential(2)} u_max`);
  assert.ok(a.err > 1e-4, 'Lambda = 1/4 is not exact for Poiseuille');
  // the preset's broken/fixed pair, as a figure would build it
  for (const [id, c] of Object.entries(PRESETS.poiseuille.cases)) {
    const r = poiseuille(c.opts.collision, c.opts.tau, c.opts.magic, 24, c.opts);
    t.diagnostic(`case ${id}: max error ${r.err.toExponential(2)} u_max`);
    if (c.expect === 'exact') assert.ok(r.err < 1e-6, id);
    else assert.ok(r.err > 0.01, id);
  }
});

function taylorGreen(collision, tau, n, U = 0.04) {
  const L = createPreset('taylor-green', { n, tau, U, collision });
  step(L, 10); // let the initial non-equilibrium transient pass
  const E1 = kineticEnergy(L), t1 = L.t;
  const T = Math.max(20, Math.round(0.5 / L.meta.rate));
  step(L, T);
  const E2 = kineticEnergy(L);
  return { rate: -Math.log(E2 / E1) / (L.t - t1), exact: L.meta.rate, L };
}

test('Taylor-Green energy decays at 2 nu (kx^2 + ky^2) with nu = (tau - 1/2)/3, within 2%', (t) => {
  for (const [collision, tau, n] of [['bgk', 0.6, 32], ['bgk', 0.8, 32], ['trt', 0.8, 32], ['trt', 0.56, 64]]) {
    const r = taylorGreen(collision, tau, n);
    t.diagnostic(`${collision} tau ${tau} n ${n}: rate/exact = ${(r.rate / r.exact).toFixed(4)}`);
    assert.ok(Math.abs(r.rate / r.exact - 1) < 0.02, `${collision} tau ${tau}: rate/exact = ${r.rate / r.exact}`);
    // and clearly not the "naive" viscosity tau/3
    const naive = taylorGreenRate(tau / 3, n);
    assert.ok(Math.abs(r.rate / naive - 1) > 0.3);
  }
});

test('compressibility error: the extra error in the Taylor-Green decay rate grows like Ma^2', (t) => {
  const err = (U) => {
    const r = taylorGreen('bgk', 0.8, 32, U);
    return r.rate / r.exact - 1;
  };
  const base = err(0.005);
  const e = [0.04, 0.08, 0.16].map((U) => err(U) - base);
  t.diagnostic(`extra rate error at U = 0.04, 0.08, 0.16: ${e.map((x) => x.toExponential(2)).join(', ')}; ratios ${(e[1] / e[0]).toFixed(2)}, ${(e[2] / e[1]).toFixed(2)}`);
  for (let k = 1; k < e.length; k++) {
    const ratio = e[k] / e[k - 1];
    assert.ok(ratio > 3.6 && ratio < 4.4, `doubling U should quadruple the error, ratio ${ratio}`);
  }
  assert.ok(Math.abs(e[2]) < 0.02, 'at Ma ~ 0.28 the error is still about 1%');
});

test('vorticity of the Taylor-Green field matches 2 U k cos(kx) cos(ky)', () => {
  const n = 64, U = 0.04, k = (2 * Math.PI) / n;
  const L = createPreset('taylor-green', { n, U, tau: 0.6 });
  const om = vorticity(L, new Float64Array(L.N));
  let err = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const exact = 2 * U * k * Math.cos(k * (i + 0.5)) * Math.cos(k * (j + 0.5));
    err = Math.max(err, Math.abs(om[i + j * n] - exact));
  }
  assert.ok(err < 0.01 * 2 * U * k, `max vorticity error ${err}`);
});

test('lid-driven cavity at Re = 100 matches Ghia et al. (1982) centrelines within 5% on a 48^2 grid', (t) => {
  const n = 48;
  const L = createPreset('cavity', { n, Re: 100 });
  step(L, 7000); // about 15 lid transit times: converged to 1e-5
  macroscopic(L);
  const U = L.meta.U;
  const u = [], v = [];
  for (let j = 0; j < n; j++) u.push((0.5 * (L.ux[n / 2 - 1 + j * n] + L.ux[n / 2 + j * n])) / U);
  for (let i = 0; i < n; i++) v.push((0.5 * (L.uy[i + (n / 2 - 1) * n] + L.uy[i + (n / 2) * n])) / U);
  const extremum = (a, sgn) => {
    let k = 1;
    for (let j = 1; j < a.length - 1; j++) if (sgn * a[j] > sgn * a[k]) k = j;
    const p = a[k - 1], b = a[k], c = a[k + 1];
    const off = (0.5 * (p - c)) / (p - 2 * b + c);
    return { value: b - 0.25 * (p - c) * off, at: (k + 0.5 + off) / a.length };
  };
  const umin = extremum(u, -1), vmax = extremum(v, 1), vmin = extremum(v, -1);
  t.diagnostic(`u_min ${umin.value.toFixed(4)} at y ${umin.at.toFixed(3)}; v_max ${vmax.value.toFixed(4)} at x ${vmax.at.toFixed(3)}; v_min ${vmin.value.toFixed(4)} at x ${vmin.at.toFixed(3)}`);
  close(umin.value, -0.2109, 0.05 * 0.2109, 'u_min');
  close(umin.at, 0.4531, 0.03, 'y of u_min');
  close(vmax.value, 0.17527, 0.05 * 0.17527, 'v_max');
  close(vmin.value, -0.24533, 0.05 * 0.24533, 'v_min');
  close(vmin.at, 0.8047, 0.03, 'x of v_min');
  assert.equal(GHIA_RE100.u[GHIA_RE100.y.indexOf(0.4531)], -0.2109);
});

test('velocity inlets impose the prescribed velocity exactly at the edge nodes', () => {
  for (const method of ['zou-he', 'regularized', 'equilibrium', 'extrapolation']) {
    for (const profile of ['uniform', 'parabolic']) {
      const L = createLBM({
        nx: 30, ny: 20, tau: 0.6, collision: 'bgk',
        boundaries: { left: { type: 'velocity', u: [0.06, 0.01], profile, method }, right: { type: 'outlet', mode: 'zero-gradient' }, bottom: 'wall', top: 'wall' },
      });
      addDisk(L, 12, 10, 3);
      initEquilibrium(L, {});
      step(L, 200);
      macroscopic(L);
      for (let j = 0; j < L.ny; j++) {
        const s = (j + 0.5) / L.ny, prof = profile === 'parabolic' ? 6 * s * (1 - s) : 1;
        close(L.ux[j * L.nx], 0.06 * prof, 1e-12, `${method} ${profile} ux at j=${j}`);
        close(L.uy[j * L.nx], 0.01 * prof, 1e-12, `${method} ${profile} uy at j=${j}`);
      }
    }
  }
  // the fixed-density outlets hold their density
  for (const mode of ['pressure', 'extrapolation']) {
    const P = createLBM({ nx: 30, ny: 10, tau: 0.6, boundaries: { left: { type: 'velocity', u: [0.05, 0] }, right: { type: 'outlet', mode, rho: 0.99 }, bottom: 'periodic', top: 'periodic' } });
    step(P, 100);
    macroscopic(P);
    for (let j = 0; j < P.ny; j++) close(P.rho[P.nx - 1 + j * P.nx], 0.99, 1e-12, mode);
  }
  // a uniform stream through every inlet/outlet pairing stays exactly uniform
  for (const mode of ['zero-gradient', 'convective', 'pressure', 'extrapolation']) {
    const S = createLBM({ nx: 24, ny: 8, tau: 0.55, ux0: 0.08, boundaries: { left: { type: 'velocity', u: [0.08, 0] }, right: { type: 'outlet', mode }, bottom: 'periodic', top: 'periodic' } });
    step(S, 300);
    macroscopic(S);
    for (let c = 0; c < S.N; c++) {
      close(S.ux[c], 0.08, 1e-12, mode);
      close(S.uy[c], 0, 1e-12, mode);
    }
  }
});

test('outlets started from rest: zero-gradient, convective and extrapolation settle to the uniform stream; the pressure outlet keeps a period-2 ripple', (t) => {
  // A 30 x 4 periodic strip with a Zou-He inlet, started at rest. The
  // fixed-density outlets trap a slowly damped acoustic mode (velocity fixed
  // at one end, density at the other), hence the long run.
  const U = 0.05;
  const strip = (mode) => createLBM({ nx: 30, ny: 4, tau: 0.7, boundaries: { left: { type: 'velocity', u: [U, 0], method: 'zou-he' }, right: { type: 'outlet', mode }, bottom: 'periodic', top: 'periodic' } });
  const run = (mode, T, S = strip(mode)) => {
    step(S, T - S.t);
    macroscopic(S);
    const a = Float64Array.from(S.ux.subarray(0, 30));
    step(S, 1);
    macroscopic(S);
    const b = Float64Array.from(S.ux.subarray(0, 30));
    // split each column into its mean and its period-2 (every other step) part
    return { mean: a.map((v, i) => (v + b[i]) / 2 / U - 1), ripple: a.map((v, i) => (v - b[i]) / 2 / U) };
  };
  const amax = (x) => Math.max(...Array.from(x, Math.abs));
  for (const [mode, T, tolMean, tolRipple] of [['zero-gradient', 1000, 1e-5, 1e-7], ['convective', 1000, 1e-5, 1e-7], ['extrapolation', 40000, 1e-4, 1e-6]]) {
    const r = run(mode, T);
    t.diagnostic(`${mode} after ${T} steps: |u/U - 1| <= ${amax(r.mean).toExponential(1)}, ripple ${amax(r.ripple).toExponential(1)}`);
    assert.ok(amax(r.mean) < tolMean && amax(r.ripple) < tolRipple, mode);
  }
  const P = strip('pressure');
  const p = run('pressure', 40000, P), p2 = run('pressure', 40400, P);
  const last = p.ripple[29];
  t.diagnostic(`pressure after 40000 steps: mean |u/U - 1| <= ${amax(p.mean).toExponential(1)}, ripple at the outlet node ${(100 * Math.abs(last)).toFixed(2)}% of U, ratio per column ${(p.ripple[29] / p.ripple[28]).toFixed(2)}`);
  assert.ok(Math.abs(last) > 0.01, 'the pressure outlet keeps a ripple of a few per cent of U');
  close(Math.abs(p2.ripple[29]), Math.abs(last), 1e-3 * Math.abs(last), 'and it does not decay');
  assert.ok(Math.abs(p.ripple[29 - 8]) < 0.02 * Math.abs(last), 'confined to the last few columns');
  assert.ok(amax(p.mean) < 1e-3);
  assert.ok(/period-2/.test(BOUNDARIES.outlet.modes.pressure));
});

test('momentum exchange: at steady state the obstacle carries the whole body force', (t) => {
  const F = 2e-6;
  const L = createLBM({ nx: 40, ny: 30, tau: 1, collision: 'trt', force: [F, 0] });
  addDisk(L, 20, 15, 5);
  initEquilibrium(L, {});
  let fluid = 0;
  for (let c = 0; c < L.N; c++) fluid += 1 - L.solid[c];
  step(L, 6000);
  t.diagnostic(`F_obstacle / (N_fluid F) = ${(L.obstacleForce[0] / (fluid * F)).toFixed(7)}`);
  close(L.obstacleForce[0] / (fluid * F), 1, 1e-4);
  close(L.obstacleForce[1], 0, 1e-12);
});

test('near tau = 1/2 the stable inlet depends on the collision (hero cases): Zou-He kills BGK, regularized kills TRT', (t) => {
  // PRESETS.hero.cases at full size (240 x 72, Re 150, tau = 0.519).
  const out = {};
  for (const [id, c] of Object.entries(PRESETS.hero.cases)) {
    // survivors: a prefix of the measured run, over five times the BGK +
    // Zou-He lifetime and past the TRT + regularized one
    const max = c.expect === 'blows-up' ? c.steps : 1200;
    const r = lifetime(createPreset('hero', c.opts), max);
    out[id] = r;
    if (c.expect === 'blows-up') {
      assert.ok(r.t <= c.steps, `${id} should blow up within ${c.steps} steps, lived ${r.t}`);
      assert.ok(r.h.firstBadCell % 240 <= 1, `${id}: the failure starts at the inlet column`);
    } else {
      assert.equal(r.t, Infinity, `${id} should survive ${max} steps, failed at ${r.t}`);
    }
  }
  t.diagnostic(Object.entries(out).map(([id, r]) => `${id}: ${r.t === Infinity ? 'healthy' : `fails at ${r.t}`}`).join('; '));
  // 'auto' is the stable pairing for each collision
  assert.equal(createPreset('hero').sides.left.method, 'auto');
  assert.equal(PRESETS.hero.cases['bgk-zou-he'].expect, 'blows-up');
  assert.equal(PRESETS.hero.cases['trt-zou-he'].expect, 'survives');
  assert.equal(PRESETS.hero.cases['bgk-regularized'].expect, 'survives');
  assert.equal(PRESETS.hero.cases['trt-regularized'].expect, 'blows-up');
});

test('periodic double shear layer (cases): BGK blows up on a coarse grid as tau -> 1/2, TRT is not more robust there, refinement is', (t) => {
  const out = [];
  for (const [id, c] of Object.entries(PRESETS['shear-layer'].cases)) {
    const max = c.expect === 'blows-up' ? c.steps : 3000;
    const r = lifetime(createPreset('shear-layer', c.opts), max, 50);
    out.push(`${id} ${r.t === Infinity ? 'healthy' : `fails at ${r.t}`}`);
    if (c.expect === 'blows-up') assert.ok(r.t <= c.steps, `${id}: lived ${r.t}`);
    else assert.equal(r.t, Infinity, `${id}: failed at ${r.t}`);
  }
  t.diagnostic(out.join('; '));
  const C = PRESETS['shear-layer'].cases;
  // the pairs the lesson turns on: same grid, more viscosity; same tau, TRT; same tau, finer grid
  assert.equal(C['bgk-coarse'].opts.n, C['bgk-coarse-stable'].opts.n);
  assert.equal(C['trt-coarse'].opts.tau, C['bgk-coarse-stable'].opts.tau);
  assert.equal(C['bgk-refined'].opts.tau, C['bgk-coarse'].opts.tau);
  // the defaults themselves roll up without trouble (the description says so)
  const d = lifetime(createPreset('shear-layer'), 1500, 50);
  assert.equal(d.t, Infinity);
  assert.ok(!d.h.warn, d.h.reason);
});

test('health() flags a blow-up while every value is still finite, and reports NaN when it comes', () => {
  const L = createPreset('hero', PRESETS.hero.cases['bgk-zou-he'].opts);
  let h, warnedAt = -1;
  for (let s = 0; s < 2000; s++) {
    step(L, 1);
    h = health(L);
    if (h.warn && warnedAt < 0) warnedAt = L.t;
    if (!h.ok) break;
  }
  assert.equal(h.ok, false);
  assert.notEqual(h.reason, 'not a number');
  assert.ok(L.f.every(Number.isFinite), 'flagged before any NaN');
  assert.ok(h.firstBadCell >= 0);
  assert.ok(warnedAt > 0 && warnedAt < L.t, `warned at ${warnedAt}, failed at ${L.t}`);
  const fresh = createPreset('hero', { nx: 60, ny: 24, D: 6 });
  const g = health(fresh);
  assert.ok(g.ok && !g.warn && g.maxMach < 0.3 && g.minRho > 0.9 && g.maxRho < 1.1);
  fresh.f[5 * fresh.N + 100] = NaN;
  const bad = health(fresh);
  assert.equal(bad.ok, false);
  assert.equal(bad.firstBadCell, 100);
  assert.equal(bad.reason, 'not a number');
  // high Mach warns before it fails
  const fast = createLBM({ nx: 8, ny: 8, ux0: 0.25 });
  const hf = health(fast);
  assert.ok(hf.ok && hf.warn && /Mach/.test(hf.reason));
});

test('a cylinder wake is steady at Re = 20 and sheds at Re = 100 (onset near Re ~ 47)', (t) => {
  const span = (Re) => {
    const L = createPreset('cylinder', { nx: 120, ny: 48, D: 8, U: 0.08, Re });
    let lo = Infinity, hi = -Infinity;
    for (let s = 0; s < 6000; s += 10) {
      step(L, 10);
      if (L.t > 4000) {
        const c = lift(L);
        lo = Math.min(lo, c);
        hi = Math.max(hi, c);
      }
    }
    assert.ok(health(L).ok);
    return hi - lo;
  };
  const s20 = span(20), s100 = span(100);
  t.diagnostic(`lift-coefficient span over steps 4000-6000: Re 20 ${s20.toExponential(2)}, Re 100 ${s100.toFixed(3)}`);
  assert.ok(s20 < 0.05, 'Re = 20: lift is steady');
  assert.ok(s100 > 1, 'Re = 100: lift oscillates');
});

test('a walled channel needs a fixed-density outlet: zero-gradient lets the mass drift, extrapolation anchors it (cylinder cases)', (t) => {
  const res = {};
  for (const [id, c] of Object.entries(PRESETS.cylinder.cases)) {
    const L = createPreset('cylinder', c.opts);
    const m0 = totalMass(L);
    step(L, c.steps - 1000);
    const m2 = totalMass(L) / m0;
    step(L, 1000);
    const m3 = totalMass(L) / m0;
    assert.ok(health(L).ok, id);
    res[id] = { m2, m3 };
    if (c.expect === 'drifts') assert.ok(m3 > 1.08 && m3 - m2 > 0.03, `${id}: mass ${m2} -> ${m3}`); // ~4% per 1000 steps
    else assert.ok(Math.abs(m3 - 1) < 0.01 && Math.abs(m3 - m2) < 0.005, `${id}: mass ${m2} -> ${m3}`);
  }
  t.diagnostic(Object.entries(res).map(([id, r]) => `${id}: mass ratio ${r.m2.toFixed(4)} -> ${r.m3.toFixed(4)}`).join('; '));
  assert.deepEqual(Object.values(PRESETS.cylinder.cases).map((c) => c.expect).sort(), ['anchored', 'drifts']);
});

test('hero preset: no compressibility warning from the first step, shedding by ~1200 steps, healthy at the top of its Re range under TRT', (t) => {
  const L = createPreset('hero');
  assert.equal(L.nx, 240);
  assert.equal(L.ny, 72);
  close(L.meta.Re, PRESETS.hero.defaults.Re, 1e-9);
  const { U, D } = L.meta;
  // transverse velocity on the wake axis, three diameters downstream
  const probe = Math.round(L.meta.xc + 3 * D) + Math.floor(L.meta.yc) * L.nx;
  const vAt = () => {
    let r = 0, jy = 0;
    for (let q = 0; q < 9; q++) {
      const v = L.f[q * L.N + probe];
      r += v;
      jy += v * cy[q];
    }
    return jy / r;
  };
  let up = -1, down = -1, maxMach = 0, lo = 0, hi = 0;
  for (let s = 0; s < 2000; s++) {
    step(L, 1);
    const h = health(L); // every step, from t = 1: start-up spikes count too
    assert.ok(h.ok && !h.warn, `step ${L.t}: ${h.reason}`);
    maxMach = Math.max(maxMach, h.maxMach);
    const v = vAt() / U;
    if (v > 0.5 && up < 0) up = L.t;
    if (v < -0.5 && down < 0) down = L.t;
    if (L.t > 1300) {
      const c = lift(L);
      lo = Math.min(lo, c);
      hi = Math.max(hi, c);
    }
  }
  const onset = Math.max(up, down);
  t.diagnostic(`Re 150 BGK: wake |v| > U/2 both ways by step ${onset}; lift over steps 1300-2000 in [${lo.toFixed(3)}, ${hi.toFixed(3)}]; peak Mach ${maxMach.toFixed(3)} (machWarn 0.3)`);
  assert.ok(up > 0 && down > 0 && onset <= 1.25 * PRESETS.hero.onset, `onset ${onset}`);
  assert.ok(lo < -0.3 && hi > 0.3, `alternating lift expected, got [${lo}, ${hi}]`);
  // top of the Re range under TRT (Lambda = 3/16; Lambda = 1/4 fails here after ~7300 steps)
  const T = createPreset('hero', { Re: PRESETS.hero.ranges.Re[1], collision: 'trt' });
  close(magicOf(T), 3 / 16, 1e-12);
  let tMach = 0;
  for (let s = 0; s < 2000; s += 10) {
    step(T, 10);
    const h = health(T);
    assert.ok(h.ok && !h.warn, `TRT Re 200 at step ${T.t}: ${h.reason}`);
    tMach = Math.max(tMach, h.maxMach);
  }
  t.diagnostic(`Re 200 TRT: healthy without warnings for 2000 steps, peak Mach ${tMach.toFixed(3)}`);
});

test('every preset builds and runs healthy for a few hundred steps', () => {
  for (const id of Object.keys(PRESETS)) {
    const small = id === 'hero' || id === 'cylinder' ? { nx: 80, ny: 32, D: 8 } : id === 'poiseuille' ? {} : { n: 32 };
    const L = createPreset(id, small);
    step(L, 200);
    const h = health(L);
    assert.ok(h.ok, `${id}: ${h.reason}`);
    assert.ok(Number.isFinite(L.meta.Re));
  }
  // metadata the figures read: every scheme has its formula, order, stability note and source
  for (const [id, sch] of Object.entries(SCHEMES)) {
    assert.equal(sch.id, id);
    for (const k of ['name', 'description', 'tex', 'stability', 'cite']) assert.ok(typeof sch[k] === 'string' && sch[k].length > 0, `${id}.${k}`);
    assert.ok(sch.order === 1 || sch.order === 2, id);
    assert.ok(sch.tex.includes('\\') && !sch.tex.includes('\\\\'), `${id}: single TeX backslashes at runtime`);
  }
  // staircased (cell-built) obstacles are first order; the card must not say otherwise
  assert.equal(SCHEMES['bounce-back'].orderCurved, 1);
  assert.ok(!/widest stable range/.test(COLLISIONS.trt.stability));
  // every case names a known expectation and builds
  for (const [pid, P] of Object.entries(PRESETS)) {
    for (const [cid, c] of Object.entries(P.cases)) {
      assert.ok(['blows-up', 'survives', 'drifts', 'anchored', 'exact', 'slip'].includes(c.expect), `${pid}.${cid}`);
      for (const k of ['name', 'note']) assert.ok(typeof c[k] === 'string' && c[k].length > 0, `${pid}.${cid}.${k}`);
      assert.ok(createPreset(pid, c.opts).N > 0);
    }
  }
  for (const m of Object.keys(BOUNDARIES.velocity.methods)) if (m !== 'auto') assert.ok(SCHEMES[m], m);
  for (const m of Object.keys(BOUNDARIES.outlet.modes)) if (m !== 'pressure') assert.ok(SCHEMES[m], m);
  assert.throws(() => createPreset('nope'));
  assert.throws(() => createLBM({ boundaries: { left: 'wall' } }), /periodic/);
  // applyBoundaries is a no-op on a fully periodic box
  const P = createLBM({ nx: 4, ny: 4 });
  const before = Float64Array.from(P.f);
  applyBoundaries(P);
  assert.deepEqual(P.f, before);
});
