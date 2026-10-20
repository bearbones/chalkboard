// Tests for the stable-fluids kernel (src/sims/stablefluids.js): the claims
// the course makes about semi-Lagrangian advection, BFECC, MacCormack,
// vorticity confinement, buoyancy, implicit viscosity and the projection,
// each measured, not assumed. Measured numbers are reported with
// t.diagnostic so the API notes can quote them.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drain, observedOrders } from '../../aids/fluid-course/src/sims/util.js';
import { FACE_FIXED } from '../../aids/fluid-course/src/sims/grid2d.js';
import * as S from '../../aids/fluid-course/src/sims/stablefluids.js';
import { tex } from '../../aids/fluid-course/src/kit/math.js';

const fmt = (x) => (Math.abs(x) >= 1e-3 && Math.abs(x) < 1e4 ? x.toFixed(4) : x.toExponential(2));

// L2 error (∫ (q − q_exact)² dA)^½ over the whole box.
function l2err(F, q, exact) {
  let e = 0;
  for (let c = 0; c < q.length; c++) e += (q[c] - exact[c]) ** 2;
  return Math.sqrt(e * F.h * F.h);
}

function range(q) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let c = 0; c < q.length; c++) {
    if (q[c] < lo) lo = q[c];
    if (q[c] > hi) hi = q[c];
  }
  return [lo, hi];
}

// One revolution of the 'vortex' preset; returns the L2 error and the range.
function revolve(opts) {
  const F = S.createPreset('vortex', opts);
  for (let k = 0; k < F.meta.stepsPerTurn; k++) S.step(F, F.meta.dt, F.params);
  return { F, err: l2err(F, F.dye, F.meta.exact), range: range(F.dye) };
}

// Two counter-rotating swirls stirred into the closed 'stir' box.
function stirred(nx = 48, params = {}) {
  const F = S.createPreset('stir', { nx, params });
  S.splat(F, 0.35, 0.5, 0, 3, 0.06);
  S.splat(F, 0.65, 0.5, 0, -3, 0.06);
  return F;
}

// ---------------------------------------------------------------------------
// Metadata and conventions

test('metadata: ids match keys, text fields present, TeX parses', () => {
  for (const name of ['ADVECTION', 'BACKTRACE', 'LIMITERS', 'PRESSURE_SOLVERS', 'FORCES', 'PRESETS']) {
    for (const [key, m] of Object.entries(S[name])) {
      assert.equal(m.id, key, `${name}.${key}.id`);
      for (const f of ['name', 'description']) assert.ok(typeof m[f] === 'string' && m[f].length > 0, `${name}.${key}.${f}`);
      if (m.tex !== undefined) assert.doesNotThrow(() => tex(m.tex), `${name}.${key}.tex`);
    }
  }
  for (const m of Object.values(S.ADVECTION)) {
    assert.ok(S.LIMITERS[m.defaultLimiter]);
    assert.ok(typeof m.tex === 'string' && typeof m.stability === 'string' && m.order >= 1);
  }
  for (const m of Object.values(S.PRESSURE_SOLVERS)) {
    assert.ok(m.ms[96] > 0 && m.ms[128] > m.ms[96], `${m.id}.ms`);
    assert.equal(typeof m.fixed, 'boolean');
  }
  assert.deepEqual(
    S.PHASES.map((p) => p.id),
    ['advect', 'forces', 'viscosity', 'project'],
  );
  assert.ok(Object.isFrozen(S.DEFAULT_PARAMS));
  assert.ok(S.ADVECTION[S.DEFAULT_PARAMS.advection] && S.BACKTRACE[S.DEFAULT_PARAMS.backtrace] && S.PRESSURE_SOLVERS[S.DEFAULT_PARAMS.pressure]);
});

test('createFluid: MAC sizes, shared arrays, j = 0 at the bottom', () => {
  const F = S.createFluid({ nx: 12, ny: 7, channels: 3 });
  assert.equal(F.u.length, 13 * 7);
  assert.equal(F.v.length, 12 * 8);
  assert.equal(F.p.length, 12 * 7);
  assert.equal(F.dyes.length, 3);
  assert.equal(F.dye, F.dyes[0]);
  assert.equal(F.u, F.g.u);
  assert.equal(F.v, F.g.v);
  assert.equal(F.solid, F.g.solid);
  assert.equal(F.h, 1 / 12);
  // setScalar uses cell centres ((i + ½)h, (j + ½)h) with index i + j·nx.
  S.setScalar(F, (x, y) => y);
  assert.ok(Math.abs(F.dye[3 + 0 * 12] - 0.5 / 12) < 1e-15);
  assert.ok(Math.abs(F.dye[3 + 6 * 12] - 6.5 / 12) < 1e-15);
  // Walls fixed, interior free.
  assert.equal(F.g.uType[0], FACE_FIXED);
  assert.equal(F.g.vType[3], FACE_FIXED);
  assert.throws(() => S.step(F, 0.01, { advection: 'nope' }));
  assert.throws(() => S.step(F, 0.01, { pressure: 'nope' }));
  assert.throws(() => S.createPreset('nope'));
});

test('createPreset: nx alone keeps the aspect ratio; every preset runs and stays finite', () => {
  assert.equal(S.createPreset('vortex', { nx: 40 }).ny, 40);
  assert.equal(S.createPreset('obstacle', { nx: 64 }).ny, 32);
  assert.equal(S.createPreset('smoke', { nx: 32 }).ny, 48);
  for (const id of Object.keys(S.PRESETS)) {
    const F = S.createPreset(id, { nx: 32 });
    assert.ok(F.meta.dt > 0 && F.params && typeof F.params === 'object', id);
    for (let k = 0; k < 20; k++) S.step(F, F.meta.dt, F.params);
    const d = F.diag;
    for (const key of ['ke', 'enstrophy', 'divAfter', 'cfl', 'dye', 'dyeDrift', 'pressureResidual']) assert.ok(Number.isFinite(d[key]), `${id}.${key}`);
    for (const a of [F.u, F.v, ...F.dyes, F.temp]) for (let k = 0; k < a.length; k++) assert.ok(Number.isFinite(a[k]), id);
  }
});

// ---------------------------------------------------------------------------
// Rest, hydrostatic balance, divergence

test('a fluid at rest stays exactly at rest, with dye, heat and obstacles, for every scheme', () => {
  for (const advection of Object.keys(S.ADVECTION)) {
    for (const backtrace of Object.keys(S.BACKTRACE)) {
      const F = S.createFluid({ nx: 24, ny: 20, channels: 2, temperature: true });
      S.addCircle(F, 0.4, 0.4, 0.15);
      S.addBox(F, 0.7, 0.1, 0.85, 0.5);
      S.setScalar(F, (x, y) => Math.sin(9 * x) * Math.cos(7 * y) + 1, F.dyes[0]);
      S.setScalar(F, (x, y) => x * y, F.dyes[1]);
      S.setScalar(F, (x) => x, F.temp);
      const d0 = Float64Array.from(F.dyes[0]);
      const p = { advection, backtrace, vorticity: 0.5, viscosity: 0.01 };
      for (let k = 0; k < 10; k++) S.step(F, 0.05, p);
      for (const a of [F.u, F.v]) for (let k = 0; k < a.length; k++) assert.equal(a[k], 0, `${advection}/${backtrace}`);
      // Zero velocity: every departure point is the grid point itself, so
      // the dye is reproduced bit for bit.
      for (let c = 0; c < d0.length; c++) assert.equal(F.dyes[0][c], d0[c]);
      assert.equal(F.diag.dyeDrift, 0);
      assert.equal(F.diag.cfl, 0);
    }
  }
});

// Discrete hydrostatic pressure jump across a v face: the face-averaged
// buoyancy −α s̄ + β T̄.
function hydrostaticError(F, alpha, beta) {
  const { nx, ny, h, p, solid } = F;
  let err = 0;
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (solid[c] || solid[c + nx]) continue;
      const f = -alpha * 0.5 * (F.dye[c] + F.dye[c + nx]) + beta * 0.5 * (F.temp[c] + F.temp[c + nx]);
      err = Math.max(err, Math.abs((p[c + nx] - p[c]) / h - f));
    }
  }
  return err;
}

test('hydrostatic balance: stratified buoyancy around obstacles makes no spurious currents', (t) => {
  const alpha = 1;
  const beta = 4;
  const build = () => {
    const F = S.createFluid({ nx: 40, ny: 40 });
    S.addCircle(F, 0.4, 0.5, 0.15);
    S.addBox(F, 0.7, 0.1, 0.8, 0.6);
    S.setScalar(F, (x, y) => 1 + 0.5 * y * y, F.temp);
    S.setScalar(F, (x, y) => 0.3 + y, F.dye);
    return F;
  };
  // Converged solvers: the buoyancy is a pure gradient, the projection
  // removes all of it, the pressure is hydrostatic, nothing moves.
  for (const pressure of ['mgpcg', 'multigrid', 'pcg-mic0']) {
    const F = build();
    const p = { pressure, pressureTol: 1e-10, pressureMaxIter: 200, buoyancyAlpha: alpha, buoyancyBeta: beta, vorticity: 0.3 };
    let vmax = 0;
    for (let k = 0; k < 40; k++) {
      S.step(F, 1 / 60, p);
      vmax = Math.max(vmax, S.maxFaceSpeed(F));
    }
    const perr = hydrostaticError(F, alpha, beta);
    t.diagnostic(`${pressure} tol 1e-10: max speed ${fmt(vmax)}, dp/dy error ${fmt(perr)}`);
    assert.ok(vmax < 1e-8, `${pressure}: spurious speed ${vmax}`);
    assert.ok(perr < 1e-6, `${pressure}: hydrostatic pressure error ${perr}`);
  }
  // The default interactive solve (multigrid to 1e-4, warm-started) is also
  // quiet: the warm start already holds the hydrostatic pressure.
  {
    const F = build();
    let vmax = 0;
    for (let k = 0; k < 40; k++) {
      S.step(F, 1 / 60, { buoyancyAlpha: alpha, buoyancyBeta: beta, vorticity: 0.3 });
      vmax = Math.max(vmax, S.maxFaceSpeed(F));
    }
    t.diagnostic(`default multigrid 1e-4: max speed ${fmt(vmax)}`);
    assert.ok(vmax < 1e-3);
  }
  // A fixed 30 Jacobi sweeps cannot balance it: the unconverged pressure
  // leaves real currents (the lesson of the pressure chapter).
  {
    const F = build();
    let vmax = 0;
    for (let k = 0; k < 40; k++) {
      S.step(F, 1 / 60, { pressure: 'jacobi', buoyancyAlpha: alpha, buoyancyBeta: beta });
      vmax = Math.max(vmax, S.maxFaceSpeed(F));
    }
    t.diagnostic(`Jacobi 30 sweeps: spurious max speed ${fmt(vmax)}`);
    assert.ok(vmax > 0.05);
  }
});

test('after a step the velocity is discretely divergence-free (walls, inflow, open sides, solids, periodic)', (t) => {
  const cases = [
    ['stir', stirred(48)],
    ['obstacle', S.createPreset('obstacle', { nx: 64 })],
    ['smoke', S.createPreset('smoke', { nx: 32 })],
    ['taylor-green', S.createPreset('taylor-green', { nx: 32 })],
    ['hero', S.createPreset('hero', { nx: 48 })],
  ];
  for (const [id, F] of cases) {
    const p = { ...F.params, pressure: 'mgpcg', pressureTol: 1e-10, pressureMaxIter: 100 };
    let worst = 0;
    for (let k = 0; k < 15; k++) {
      const d = S.step(F, F.meta.dt, p);
      // diag.divAfter is the measured max |D u| over fluid cells.
      assert.ok(Math.abs(S.maxDivergence(F) - d.divAfter) <= 1e-12 * (1 + d.divAfter));
      worst = Math.max(worst, d.divRel);
      assert.ok(d.pressureIters > 0 && d.pressureResidual < 1e-8, `${id}: residual ${d.pressureResidual}`);
    }
    t.diagnostic(`${id}: max relDiv ${fmt(worst)}, final max|Du| ${fmt(F.diag.divAfter)} (before ${fmt(F.diag.divBefore)})`);
    assert.ok(worst < 1e-8, `${id}: relDiv ${worst}`);
  }
  // Default interactive settings and the fixed-sweep solvers, on the same
  // stirred box: the diagnostic reports how much divergence is left.
  const rel = {};
  for (const pressure of ['multigrid', 'pcg-mic0', 'jacobi', 'red-black']) {
    const F = stirred(48, { pressure });
    let worst = 0;
    for (let k = 0; k < 15; k++) worst = Math.max(worst, S.step(F, 1 / 60, F.params).divRel);
    rel[pressure] = worst;
  }
  t.diagnostic(`max relDiv over 15 steps: ${Object.entries(rel).map(([k, v]) => `${k} ${fmt(v)}`).join(', ')}`);
  assert.ok(rel.multigrid < 2e-2 && rel['pcg-mic0'] < 2e-2);
  assert.ok(rel.jacobi > 10 * rel.multigrid && rel['red-black'] > 10 * rel.multigrid);
});

// ---------------------------------------------------------------------------
// Advection accuracy

test('Taylor–Green: semi-Lagrangian loses kinetic energy faster than BFECC and MacCormack', (t) => {
  const loss = {};
  for (const advection of Object.keys(S.ADVECTION)) {
    const F = S.createPreset('taylor-green', { nx: 64, params: { advection, pressureTol: 1e-10 } });
    const ke0 = S.kineticEnergy(F);
    const n = Math.round(0.5 / F.h); // CFL 1 at the peak speed 1, to t = 0.5
    for (let k = 0; k < n; k++) S.step(F, 0.5 / n, F.params);
    loss[advection] = 1 - S.kineticEnergy(F) / ke0;
  }
  t.diagnostic(`KE lost by t = 0.5 (64², CFL 1): ${Object.entries(loss).map(([k, v]) => `${k} ${fmt(v)}`).join(', ')}`);
  assert.ok(loss['semi-lagrangian'] > 1.3 * loss.bfecc);
  assert.ok(loss['semi-lagrangian'] > 1.3 * loss.maccormack);
  assert.ok(loss.bfecc > 0 && loss.maccormack > 0);
});

test('Taylor–Green: the leftover loss of BFECC is the first-order splitting error (∝ Δt); semi-Lagrangian is not', (t) => {
  const run = (advection, cfl) => {
    const F = S.createPreset('taylor-green', { nx: 64, params: { advection, pressureTol: 1e-10 } });
    const ke0 = S.kineticEnergy(F);
    const n = Math.round(0.5 / (cfl * F.h));
    for (let k = 0; k < n; k++) S.step(F, 0.5 / n, F.params);
    return 1 - S.kineticEnergy(F) / ke0;
  };
  const b1 = run('bfecc', 0.5);
  const b2 = run('bfecc', 0.25);
  const s1 = run('semi-lagrangian', 0.5);
  const s2 = run('semi-lagrangian', 0.25);
  t.diagnostic(`KE loss CFL 0.5 → 0.25: BFECC ${fmt(b1)} → ${fmt(b2)} (ratio ${fmt(b1 / b2)}), SL ${fmt(s1)} → ${fmt(s2)}`);
  assert.ok(b1 / b2 > 1.7 && b1 / b2 < 2.3);
  assert.ok(Math.abs(s1 / s2 - 1) < 0.1);
});

test('rotating blob: after one turn BFECC and MacCormack beat semi-Lagrangian; observed orders', (t) => {
  const e = {};
  for (const advection of Object.keys(S.ADVECTION)) e[advection] = revolve({ nx: 64, params: { advection } }).err;
  t.diagnostic(`Gaussian blob, 64², CFL 1, RK2, one turn, L2 error: ${Object.entries(e).map(([k, v]) => `${k} ${fmt(v)}`).join(', ')}`);
  assert.ok(e.bfecc < e['semi-lagrangian'] / 5);
  assert.ok(e.maccormack < e['semi-lagrangian'] / 2);
  // Same for Zalesak's slotted disc (sharp edges; smaller margins).
  const z = {};
  for (const advection of Object.keys(S.ADVECTION)) z[advection] = revolve({ nx: 64, shape: 'slotted-disc', params: { advection } }).err;
  t.diagnostic(`slotted disc, 64², CFL 1, L2 error: ${Object.entries(z).map(([k, v]) => `${k} ${fmt(v)}`).join(', ')}`);
  assert.ok(z.bfecc < z['semi-lagrangian'] && z.maccormack < z['semi-lagrangian']);
  // Observed orders at fixed CFL 3 (h and Δt refined together).
  const ord = {};
  for (const advection of Object.keys(S.ADVECTION)) {
    const errs = [32, 64, 128].map((nx) => revolve({ nx, cfl: 3, params: { advection } }).err);
    ord[advection] = observedOrders(errs);
  }
  t.diagnostic(`observed orders 32→64→128 at CFL 3: ${Object.entries(ord).map(([k, v]) => `${k} ${v.map(fmt).join(', ')}`).join('; ')}`);
  assert.ok(ord['semi-lagrangian'][1] > 0.8 && ord['semi-lagrangian'][1] < 1.3);
  assert.ok(ord.bfecc[1] > 1.7);
  assert.ok(ord.maccormack[1] > 1.6);
});

test('the RK2 backtrace beats the Euler backtrace on a curved path', (t) => {
  const eu = revolve({ nx: 64, cfl: 3, params: { advection: 'bfecc', backtrace: 'euler' } }).err;
  const rk = revolve({ nx: 64, cfl: 3, params: { advection: 'bfecc', backtrace: 'rk2' } }).err;
  t.diagnostic(`BFECC, 64², CFL 3: Euler ${fmt(eu)}, RK2 ${fmt(rk)}`);
  assert.ok(rk < eu / 2);
});

test('MacCormack with clamping creates no new extrema; without a limiter it does', (t) => {
  const worst = { clamp: [Infinity, -Infinity], none: [Infinity, -Infinity] };
  for (const cfl of [0.5, 1, 2.5, 5]) {
    for (const backtrace of ['euler', 'rk2']) {
      for (const limiter of ['clamp', 'none']) {
        const { range: r } = revolve({ nx: 48, cfl, shape: 'slotted-disc', params: { advection: 'maccormack', backtrace, limiter } });
        worst[limiter][0] = Math.min(worst[limiter][0], r[0]);
        worst[limiter][1] = Math.max(worst[limiter][1], r[1]);
      }
    }
  }
  t.diagnostic(`slotted disc in [0, 1], CFL 0.5–5: clamp → [${fmt(worst.clamp[0])}, ${fmt(worst.clamp[1])}], none → [${fmt(worst.none[0])}, ${fmt(worst.none[1])}]`);
  assert.ok(worst.clamp[0] >= 0 && worst.clamp[1] <= 1);
  assert.ok(worst.none[0] < -0.05 && worst.none[1] > 1.05);
  // The default limiter of MacCormack is the clamp.
  assert.equal(S.ADVECTION.maccormack.defaultLimiter, 'clamp');
  // In a stirred, self-advecting flow with walls and an obstacle too.
  const F = stirred(48);
  S.addCircle(F, 0.5, 0.25, 0.08);
  for (let k = 0; k < 120; k++) S.step(F, 1 / 30, F.params);
  for (const q of F.dyes) {
    const [lo, hi] = range(q);
    assert.ok(lo >= 0 && hi <= 1, `stirred dye range [${lo}, ${hi}]`);
  }
});

test('unlimited BFECC and MacCormack need the RK2 backtrace above CFL 2', (t) => {
  const peak = (advection, backtrace, cfl) => {
    const { range: r } = revolve({ nx: 48, cfl, shape: 'slotted-disc', params: { advection, backtrace, limiter: 'none' } });
    return Math.max(-r[0], r[1]);
  };
  const out = {};
  for (const advection of ['bfecc', 'maccormack']) {
    for (const backtrace of ['euler', 'rk2']) out[`${advection}/${backtrace}`] = peak(advection, backtrace, 3);
  }
  t.diagnostic(`max |q| after one turn of a [0, 1] slotted disc, CFL 3, no limiter: ${Object.entries(out).map(([k, v]) => `${k} ${fmt(v)}`).join(', ')}`);
  // Euler back and forth traces do not retrace each other on a curved path,
  // so the "error estimate" is mostly path error and gets amplified.
  assert.ok(out['bfecc/euler'] > 3 && out['maccormack/euler'] > 10);
  assert.ok(out['bfecc/rk2'] < 1.3 && out['maccormack/rk2'] < 1.3);
  // The clamp keeps even the Euler variant in range.
  const { range: r } = revolve({ nx: 48, cfl: 3, shape: 'slotted-disc', params: { advection: 'maccormack', backtrace: 'euler', limiter: 'clamp' } });
  assert.ok(r[0] >= 0 && r[1] <= 1);
});

test('vorticity confinement raises enstrophy above the unconfined run', (t) => {
  const ens = [];
  for (const eps of [0, 0.15, 0.3, 0.6]) {
    const F = stirred(48);
    for (let k = 0; k < 90; k++) S.step(F, 1 / 60, { ...F.params, vorticity: eps });
    ens.push(F.diag.enstrophy);
  }
  t.diagnostic(`enstrophy after 1.5 s at ε = 0, 0.15, 0.3, 0.6: ${ens.map(fmt).join(', ')}`);
  for (let k = 1; k < ens.length; k++) assert.ok(ens[k] > ens[k - 1]);
  assert.ok(ens[2] > 1.05 * ens[0]);
});

test('CFL 5: semi-Lagrangian (and limited MacCormack) stay bounded and report the CFL number', (t) => {
  for (const advection of ['semi-lagrangian', 'maccormack']) {
    const F = S.createPreset('stir', { nx: 48 });
    S.splat(F, 0.5, 0.5, 4, 1, 0.1);
    S.step(F, 1e-9, F.params); // project the splat
    const dt = S.dtForCfl(F, 5);
    assert.ok(Math.abs(S.cflNumber(F, dt) - 5) < 1e-12);
    const ke0 = S.kineticEnergy(F);
    let keMax = 0;
    let cfl0 = 0;
    for (let k = 0; k < 150; k++) {
      const d = S.step(F, dt, F.params.advection === advection ? F.params : { ...F.params, advection });
      if (k === 0) cfl0 = d.cfl;
      keMax = Math.max(keMax, d.ke);
    }
    const [lo, hi] = range(F.dyes[0]);
    t.diagnostic(`${advection}: reported CFL ${fmt(cfl0)}, max KE / KE0 ${fmt(keMax / ke0)}, final ${fmt(F.diag.ke / ke0)}, dye in [${fmt(lo)}, ${fmt(hi)}]`);
    assert.ok(Math.abs(cfl0 - 5) < 1e-9);
    assert.ok(keMax <= ke0);
    assert.ok(lo >= 0 && hi <= 1);
  }
});

test('dye mass: semi-Lagrangian drift is reported, nonzero, and closes the books', (t) => {
  for (const advection of Object.keys(S.ADVECTION)) {
    const F = stirred(48, { advection });
    const m0 = S.dyeTotal(F);
    const added = S.splat(F, 0.5, 0.3, 1, 0, 0.05, 2);
    assert.ok(Math.abs(S.dyeTotal(F) - m0 - added) < 1e-12);
    for (let k = 0; k < 60; k++) S.step(F, 1 / 30, F.params);
    const d = F.diag;
    // Closed box, no decay or diffusion: every change is advection error.
    assert.ok(Math.abs(d.dye - (m0 + d.dyeInjected + d.dyeDrift)) < 1e-12);
    t.diagnostic(`${advection}: drift ${fmt(d.dyeDrift)} of ${fmt(d.dye)} (${fmt(100 * d.dyeDriftRel)} %)`);
    if (advection === 'semi-lagrangian') assert.ok(Math.abs(d.dyeDrift) > 1e-6);
  }
});

test('splat: a Gaussian footprint whose dye integral is amount·πR²', () => {
  const F = S.createFluid({ nx: 128 });
  const R = 0.05;
  const added = S.splat(F, 0.5, 0.5, 0, 0, R, 2);
  assert.ok(Math.abs(added / (2 * Math.PI * R * R) - 1) < 2e-3);
  assert.ok(Math.abs(S.dyeTotal(F) - added) < 1e-14);
  // Per-channel dye, velocity and heat.
  const G = S.createFluid({ nx: 32, channels: 2 });
  S.splat(G, 0.5, 0.5, 1, -1, 0.1, [0, 3], 1);
  assert.equal(S.dyeTotal(G, 0), 0);
  assert.ok(S.dyeTotal(G, 1) > 0 && G.tempActive && S.maxFaceSpeed(G) > 0.9);
  // Wall faces keep their prescribed zero.
  for (let j = 0; j < 32; j++) assert.equal(G.u[j * 33], 0);
});

// ---------------------------------------------------------------------------
// Viscosity and buoyancy

test('implicit viscosity decays a Taylor–Green vortex at the analytic rate and is stable at any νΔt/h²', (t) => {
  const nu = 0.002;
  const F = S.createPreset('taylor-green', { nx: 64, params: { viscosity: nu, advectVelocity: false, diffusionIters: 200, diffusionTol: 1e-12 } });
  const ke0 = S.kineticEnergy(F);
  const dt = 1 / 60;
  const n = 30;
  for (let k = 0; k < n; k++) S.step(F, dt, F.params);
  const ratio = S.kineticEnergy(F) / ke0;
  const k2 = 2 * (2 * Math.PI) ** 2;
  const exact = Math.exp(-2 * k2 * nu * n * dt);
  // Backward Euler with the discrete 5-point eigenvalue.
  const lam = 2 * (4 / (F.h * F.h)) * Math.sin(Math.PI * F.h) ** 2;
  const be = (1 / (1 + nu * dt * lam)) ** (2 * n);
  t.diagnostic(`KE ratio ${fmt(ratio)}, backward-Euler discrete ${fmt(be)}, exact exp(−4k²νt) ${fmt(exact)}`);
  assert.ok(Math.abs(ratio / be - 1) < 1e-6);
  assert.ok(Math.abs(ratio / exact - 1) < 2e-3);
  // νΔt/h² = 384: no blow-up, the swirl is simply damped.
  const G = stirred(48);
  const g0 = S.kineticEnergy(G);
  for (let k = 0; k < 10; k++) S.step(G, 1 / 60, { ...G.params, viscosity: 10 });
  assert.ok(S.kineticEnergy(G) < 1e-3 * g0);
  assert.ok(G.diag.viscosityIters > 0);
});

test('implicit viscosity: no-slip walls (ghost −u half a cell out) give the Dirichlet sine mode its exact discrete decay', () => {
  // Periodic channel, walls at y = 0 and 1: u = sin(πy) is a steady inviscid
  // shear flow and the slowest viscous mode, with the cell-centred eigenvalue
  // (4/h²) sin²(πh/2).
  const nx = 16;
  const ny = 32;
  const F = S.createFluid({ nx, ny, h: 1 / ny, bc: { left: 'periodic', right: 'periodic', bottom: 'wall', top: 'wall' } });
  S.setVelocity(F, (x, y) => Math.sin(Math.PI * y), () => 0);
  const nu = 0.01;
  const dt = 0.05;
  const p = { viscosity: nu, diffusionIters: 500, diffusionTol: 1e-14, pressure: 'mgpcg', pressureTol: 1e-12 };
  for (let k = 0; k < 10; k++) S.step(F, dt, p);
  const lam = (4 / (F.h * F.h)) * Math.sin((Math.PI * F.h) / 2) ** 2;
  const factor = (1 / (1 + nu * dt * lam)) ** 10;
  let err = 0;
  for (let j = 0; j < ny; j++) {
    const exact = factor * Math.sin(Math.PI * (j + 0.5) * F.h);
    for (let i = 0; i <= nx; i++) err = Math.max(err, Math.abs(F.u[i + j * (nx + 1)] - exact));
  }
  assert.ok(err < 1e-9, `max error ${err}`);
  assert.ok(S.maxFaceSpeed(F) < 0.96);
});

test('buoyancy: a hot blob rises, a smoke-laden blob sinks', () => {
  const rise = (alpha, beta) => {
    const F = S.createFluid({ nx: 32, temperature: true });
    S.setScalar(F, (x, y) => Math.exp(-((x - 0.5) ** 2 + (y - 0.5) ** 2) / 0.01), F.temp);
    S.setScalar(F, (x, y) => Math.exp(-((x - 0.5) ** 2 + (y - 0.5) ** 2) / 0.01), F.dye);
    for (let k = 0; k < 10; k++) S.step(F, 1 / 60, { buoyancyAlpha: alpha, buoyancyBeta: beta });
    return F.v[16 + 16 * 32];
  };
  assert.ok(rise(0, 2) > 0.01);
  assert.ok(rise(2, 0) < -0.01);
});

// ---------------------------------------------------------------------------
// Stepping

test('stepPhases yields the stages in order and gives the same state as step()', () => {
  const A = stirred(32, { viscosity: 0.001 });
  const B = stirred(32, { viscosity: 0.001 });
  const phases = [];
  let pressureEvents = 0;
  drain(S.stepPhases(A, 1 / 60, A.params), (e) => {
    if (e.kind === 'phase' && e.t === 'enter') phases.push(e.phase);
    else if (e.t === 'iter') pressureEvents++;
  });
  S.step(B, 1 / 60, B.params);
  assert.deepEqual(phases, ['advect', 'forces', 'viscosity', 'project']);
  assert.ok(pressureEvents >= 1);
  for (let k = 0; k < A.u.length; k++) assert.equal(A.u[k], B.u[k]);
  for (let k = 0; k < A.dye.length; k++) assert.equal(A.dye[k], B.dye[k]);
  // Without viscosity and projection those stages are skipped.
  const C = stirred(32);
  const seen = [];
  drain(S.stepPhases(C, 1 / 60, { project: false }), (e) => e.kind === 'phase' && e.t === 'enter' && seen.push(e.phase));
  assert.deepEqual(seen, ['advect', 'forces']);
  assert.equal(C.diag.pressureSolver, 'none');
  assert.ok(C.diag.divAfter > 0);
});

test('state arrays are allocated once: stepping keeps the same buffers', () => {
  const F = S.createPreset('hero', { nx: 32 });
  const bufs = [F.u, F.v, F.p, F.temp, ...F.dyes, F.px, F.s1, F.lo, F.wc];
  for (let k = 0; k < 5; k++) S.step(F, F.meta.dt, F.params);
  const after = [F.u, F.v, F.p, F.temp, ...F.dyes, F.px, F.s1, F.lo, F.wc];
  for (let k = 0; k < bufs.length; k++) assert.equal(after[k], bufs[k]);
});

test('hero preset is self-sustaining and bounded', (t) => {
  const F = S.createPreset('hero', { nx: 48 });
  const ke = [];
  for (let k = 1; k <= 600; k++) {
    S.step(F, F.meta.dt, F.params);
    if (k % 150 === 0) ke.push(F.diag.ke);
  }
  let hi = 0;
  for (const q of F.dyes) hi = Math.max(hi, range(q)[1]);
  t.diagnostic(`hero 48², KE at t = 2.5, 5, 7.5, 10 s: ${ke.map(fmt).join(', ')}; max dye ${fmt(hi)}`);
  for (const e of ke) assert.ok(e > 0.02 && e < 2);
  assert.ok(hi < 3);
});

test('smoke preset: the hot, smoky plume rises', () => {
  const F = S.createPreset('smoke', { nx: 32 });
  // Height of the highest cell holding dye > 0.1 (the plume front).
  const front = () => {
    let top = 0;
    for (let j = 0; j < F.ny; j++) for (let i = 0; i < F.nx; i++) if (F.dye[i + j * F.nx] > 0.1) top = (j + 0.5) * F.h;
    return top;
  };
  const y0 = front();
  for (let k = 0; k < 90; k++) S.step(F, F.meta.dt, F.params);
  const y1 = front();
  assert.ok(y0 < 0.1 && y1 > 0.6, `front ${y0} → ${y1}`);
  assert.ok(F.diag.ke > 0.01);
  // Without buoyancy or the source's push nothing lifts the smoke.
  const G = S.createPreset('smoke', { nx: 32, params: { buoyancyAlpha: 0, buoyancyBeta: 0 } });
  G.sources[0].fy = 0;
  for (let k = 0; k < 90; k++) S.step(G, G.meta.dt, G.params);
  assert.ok(G.diag.ke < 1e-12);
});

test('obstacle preset: inflow from the left, dye streaks, an open outlet', () => {
  const F = S.createPreset('obstacle', { nx: 64 });
  for (let k = 0; k < 60; k++) S.step(F, F.meta.dt, F.params);
  // Inflow faces hold the prescribed speed; flux in = flux out (incompressible).
  const { nx, ny, h } = F;
  let fin = 0;
  let fout = 0;
  for (let j = 0; j < ny; j++) {
    fin += F.u[j * (nx + 1)] * h;
    fout += F.u[nx + j * (nx + 1)] * h;
  }
  assert.ok(Math.abs(F.u[0] - 1) < 1e-15);
  assert.ok(Math.abs(fout / fin - 1) < 1e-2, `out/in ${fout / fin}`);
  assert.ok(S.dyeTotal(F) > 0.05);
});
