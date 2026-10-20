// Chapter 5 (similarity): the claims its prose, figures, quizzes and gallery
// entry make, measured on the kernels the figures run
// (src/sims/ch-similarity-scales.js, src/sims/similarity.js,
// src/sims/diffusion.js, src/sims/lbm.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  WATER_VISCOSITY_TABLE, WATER_DENSITY_TABLE, waterViscosity, waterDensity, waterNu,
  REYNOLDS_TUBES, REYNOLDS_THRESHOLDS, pipeReynolds, criticalSpeed, dyeRegime,
  SCENARIOS, scenarioNumbers, erfc, stepSimilarity, frontWidth, advanceToWidth, similarityGap,
  latticePlan, LATTICE_BOX,
} from '../../aids/fluid-course/src/sims/ch-similarity-scales.js';
import {
  colebrook, frictionColebrook, frictionHaaland, cdStokes, cdSchillerNaumann, cdMorrison,
  strouhalCylinder, shipScaling, SHIP_PRESETS, ittc1957, piGroups,
} from '../../aids/fluid-course/src/sims/similarity.js';
import { createHeat, heatExact } from '../../aids/fluid-course/src/sims/diffusion.js';
import { viscosity, suggestTau } from '../../aids/fluid-course/src/sims/lbm.js';
import { drain } from '../../aids/fluid-course/src/sims/util.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const rel = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol * Math.abs(b), `${msg}: ${a} vs ${b} (rel tol ${tol})`);
const scen = (id) => SCENARIOS.find((s) => s.id === id);

// ---------------------------------------------------------------------------
// Water and Reynolds's tubes

test('water tables: IAPWS values are reproduced at the rows and interpolation stays within 0.5% between them', () => {
  for (const [T, mu] of WATER_VISCOSITY_TABLE) rel(waterViscosity(T), mu * 1e-3, 1e-12, `mu at ${T}`);
  for (const [T, rho] of WATER_DENSITY_TABLE) rel(waterDensity(T), rho, 1e-12, `rho at ${T}`);
  // Mid-row checks against IAPWS 2008 values at 0.1 MPa (about 1.405 mPa s at
  // 7.5 degC and 0.719 at 35 degC): log-linear interpolation stays within 0.5%.
  rel(waterViscosity(7.5), 1.405e-3, 5e-3, 'mu at 7.5');
  rel(waterViscosity(35), 0.719e-3, 5e-3, 'mu at 35');
  // Monotone: viscosity falls as water warms (the chapter's temperature claim).
  for (let T = 0; T < 60; T += 1) assert.ok(waterNu(T + 1) < waterNu(T), `nu falls at ${T}`);
  // Clamped outside 0-60 degC.
  assert.equal(waterNu(-5), waterNu(0));
  assert.equal(waterNu(80), waterNu(60));
});

test('Reynolds tubes: the critical speeds quoted in the prose and quiz 1', () => {
  const [one, half, quarter] = REYNOLDS_TUBES.map((t) => t.D);
  close(criticalSpeed(2020, one, 15), 0.091, 0.001, '1 inch lower');
  close(criticalSpeed(2020, half, 15), 0.181, 0.001, '1/2 inch lower');
  close(criticalSpeed(2020, quarter, 15), 0.362, 0.001, '1/4 inch lower');
  close(criticalSpeed(12830, half, 15), 1.151, 0.002, '1/2 inch upper');
  // Inverse of pipeReynolds.
  for (const t of REYNOLDS_TUBES) close(pipeReynolds(criticalSpeed(4000, t.D, 22), t.D, 22), 4000, 1e-9, t.id);
  // Halving the bore doubles the speed (quiz 1); 5 -> 40 degC cuts it 2.3-fold.
  rel(criticalSpeed(2020, half, 15) / criticalSpeed(2020, one, 15), 2, 1e-12, 'halving D');
  close(waterNu(5) / waterNu(40), 2.31, 0.01, 'nu(5)/nu(40)');
  // Try list: the half-inch tube at 0.4 m/s, 15 degC.
  const Re = pipeReynolds(0.4, half, 15);
  close(Re, 4459, 5, 'Re at 0.4 m/s');
  assert.equal(dyeRegime(Re, 'still'), 'direct-unstable');
  assert.equal(dyeRegime(Re, 'disturbed'), 'sinuous');
});

test('dyeRegime: boundaries at the lower value and at each inlet limit', () => {
  const { lower, upper, ekman } = REYNOLDS_THRESHOLDS;
  assert.equal(dyeRegime(lower - 1, 'still'), 'direct');
  assert.equal(dyeRegime(lower - 1, 'disturbed'), 'direct');
  assert.equal(dyeRegime(lower, 'disturbed'), 'sinuous');
  assert.equal(dyeRegime(upper - 1, 'still'), 'direct-unstable');
  assert.equal(dyeRegime(upper, 'still'), 'sinuous');
  assert.equal(dyeRegime(upper, 'smoothed'), 'direct-unstable');
  assert.equal(dyeRegime(ekman, 'smoothed'), 'sinuous');
});

// ---------------------------------------------------------------------------
// Scenarios (the numbers table and the regimes figure)

test('scenarios: the Re, Ma and Fr values quoted in the chapter', () => {
  rel(scenarioNumbers(scen('bacterium')).Re, 6e-5, 0.01, 'bacterium Re');
  rel(scenarioNumbers(scen('car')).Re, 9e6, 0.01, 'car Re');
  close(scenarioNumbers(scen('car')).Ma, 0.0875, 0.0005, 'car Ma');
  close(0.3 / scenarioNumbers(scen('car')).Ma, 3.43, 0.01, 'car speed multiple for Ma 0.3');
  rel(scenarioNumbers(scen('weather')).Re, 6.67e11, 0.01, 'weather Re');
  close(Math.log10(scenarioNumbers(scen('weather')).Re / scenarioNumbers(scen('bacterium')).Re), 16, 0.1, 'sixteen decades');
  close(scenarioNumbers(scen('ship')).Fr, 0.255, 0.001, 'ship Fr');
  close(scenarioNumbers(scen('swimmer')).Fr, 0.339, 0.001, 'swimmer Fr');
  close(scenarioNumbers(scen('airliner')).Ma, 0.847, 0.002, 'airliner Ma');
  rel(scenarioNumbers(scen('airliner')).Re, 3.2e7, 0.02, 'airliner Re');
  assert.ok(Number.isNaN(scenarioNumbers(scen('car')).Fr), 'no free surface, no Fr');
  // Hull speed: a wave as long as the hull at Fr = 1/sqrt(2 pi).
  close(1 / Math.sqrt(2 * Math.PI), 0.399, 0.001, 'Fr at lambda = L');
});

// ---------------------------------------------------------------------------
// Pi groups (dimensional-analysis section)

test('Pi groups: counts and groups used in the prose, try list and quiz 2', () => {
  assert.equal(piGroups(['F', 'rho', 'U', 'D', 'mu']).count, 2);
  assert.equal(piGroups(['F', 'U', 'D', 'mu']).count, 1);
  assert.equal(piGroups(['F', 'rho', 'U', 'D', 'mu', 'eps', 'c', 'g']).count, 5);
  assert.throws(() => piGroups(['F', 'rho', 'U', 'D', 'mu'], { repeating: ['rho', 'U'] }));
});

// ---------------------------------------------------------------------------
// erfc and the self-similar collapse

test('erfc: reference values, continuity at the series/fraction switch, symmetry', () => {
  close(erfc(0), 1, 1e-15, 'erfc 0');
  close(erfc(1), 0.157299207050285, 1e-14, 'erfc 1');
  close(erfc(2), 0.004677734981047266, 1e-15, 'erfc 2');
  close(erfc(3), 2.209049699858544e-5, 1e-17, 'erfc 3');
  close(erfc(-1), 2 - 0.157299207050285, 1e-14, 'erfc -1');
  rel(erfc(2.5 - 1e-12), erfc(2.5 + 1e-12), 1e-10, 'continuity at 2.5');
  close(stepSimilarity(0), 0.5, 1e-15, 'midpoint');
});

test('collapse: advanceToWidth lands exactly; the gap falls about fourfold per doubling until the walls take over', () => {
  const st = createHeat({ n: 100, preset: 'step' });
  advanceToWidth(st, 0.128);
  close(frontWidth(st), 0.128, 1e-12, 'lands on s');
  const gapAt = (n, s) => {
    const h = createHeat({ n, preset: 'step' });
    advanceToWidth(h, s);
    return similarityGap(h);
  };
  // Fixed s = 0.1, grids 100 -> 200 -> 400: ratios between 3.5 and 6.
  const g = [100, 200, 400].map((n) => gapAt(n, 0.1));
  for (let i = 0; i < 2; i++) {
    const r = g[i] / g[i + 1];
    assert.ok(r > 3.5 && r < 6, `ratio ${r}`);
  }
  // Under-resolved front (s = dx): a gap of order 1e-2.
  const coarse = gapAt(10, 0.1);
  assert.ok(coarse > 1e-2 && coarse < 4e-2, `coarse gap ${coarse}`);
  // Walls: at s = 0.5 the gap is about 0.075-0.08 on every grid, and equals
  // the exact-vs-similarity gap of the walls alone.
  const xs = new Float64Array(201).map((_, i) => i / 200);
  const out = new Float64Array(201);
  heatExact('step', xs, 0.25 / 4, 1, out);
  let wall = 0;
  for (let i = 0; i < 201; i++) wall = Math.max(wall, Math.abs(out[i] - stepSimilarity((xs[i] - 0.5) / 0.5)));
  for (const n of [20, 100, 400]) close(gapAt(n, 0.5), wall, 0.006, `walls n = ${n}`);
  assert.ok(wall > 0.07 && wall < 0.085, `wall gap ${wall}`);
});

// ---------------------------------------------------------------------------
// Lattice units

test('latticePlan: the hero run, the broken and fixed presets, and the Re^3 cost', () => {
  const hero = latticePlan(150, 0.08, 12);
  close(hero.tau, 0.5192, 1e-12, 'hero tau');
  assert.equal(hero.nx, 240);
  assert.equal(hero.ny, 72);
  assert.equal(hero.steps, 3000);
  close(hero.Ma, 0.1386, 1e-4, 'hero inflow Ma');
  close(viscosity(hero.tau), hero.nu, 1e-15, 'nu from lbm.js');
  close(hero.tau, suggestTau(150, 0.08, 12), 1e-15, 'tau from lbm.js');
  const push = latticePlan(1500, 0.08, 12);
  close(push.tau, 0.50192, 1e-9, 'push tau');
  close(push.layerCells, 0.31, 0.01, 'push layer');
  const faster = latticePlan(1500, 0.3, 12);
  close(faster.tau, 0.5072, 1e-9, 'faster tau');
  close(faster.Ma, 0.52, 0.001, 'faster Ma');
  const finer = latticePlan(1500, 0.08, 120);
  close(finer.tau, hero.tau, 1e-12, 'finer tau');
  rel(finer.updates / hero.updates, 1000, 1e-12, 'ten times Re, a thousand times the work');
  assert.ok(finer.layerCells > 3, 'finer resolves the layer scale');
  assert.deepEqual(LATTICE_BOX, [20, 6]);
  // Quiz 6: U = 0.8 at D = 12 reaches Re 1500 at tau 0.519 but is supersonic.
  close(suggestTau(1500, 0.8, 12), hero.tau, 1e-12, 'quiz 6 U route');
  assert.ok(Math.sqrt(3) * 0.8 > 1);
});

// ---------------------------------------------------------------------------
// Claims about the shared similarity kernel quoted in the chapter

test('Colebrook: iteration counts, Haaland deviation, contraction factor', () => {
  const N = drain(colebrook(1e5, 0, { method: 'newton', f0: 0.02 }));
  const F = drain(colebrook(1e5, 0, { method: 'fixed-point', f0: 0.02 }));
  close(N.f, 0.01799, 5e-6, 'f smooth 1e5');
  assert.equal(N.iterations, 3);
  assert.equal(F.iterations, 14);
  const dev = frictionHaaland(1e5, 0) / N.f - 1;
  assert.ok(Math.abs(dev) < 0.01, `Haaland within 1%: ${dev}`);
  close((2 / Math.LN10) / (1 / Math.sqrt(N.f)), 0.117, 0.002, '|g\'| smooth 1e5');
  assert.equal(drain(colebrook(1e6, 0.01, { method: 'fixed-point', f0: 0.02 })).iterations, 5);
});

test('Colebrook bad start: safeguards fire, and a plain iteration returns NaN', () => {
  const count = (method) => {
    let guards = 0;
    const out = drain(colebrook(1e4, 0, { method, f0: 1e-10 }), (e) => e.safeguard && guards++);
    return { guards, out };
  };
  const N = count('newton');
  const F = count('fixed-point');
  assert.equal(N.guards, 4);
  assert.equal(F.guards, 5);
  close(N.out.f, frictionColebrook(1e4, 0), 1e-12, 'Newton converges');
  close(F.out.f, frictionColebrook(1e4, 0), 1e-12, 'fixed point converges');
  // Plain iterations (test-only, no safeguard) from x0 = 1e5.
  const b = 2.51 / 1e4;
  let x = 1e5;
  x = -2 * Math.log10(b * x);
  close(x, -2.8, 0.01, 'first fixed-point step');
  x = -2 * Math.log10(b * x);
  assert.ok(Number.isNaN(x), 'fixed point NaN');
  x = 1e5;
  const R = (y) => y + 2 * Math.log10(b * y);
  const dR = (y) => 1 + 2 / (Math.LN10 * y);
  x -= R(x) / dR(x);
  close(x, -1.93, 0.01, 'first Newton step');
  x -= R(x) / dR(x);
  assert.ok(Number.isNaN(x), 'Newton NaN');
});

test('sphere drag: values at Re 10, the drag crisis and the 22 cm ball', () => {
  close(cdStokes(10), 2.4, 1e-12, 'Stokes at 10');
  close(cdSchillerNaumann(10), 4.15, 0.005, 'Schiller-Naumann at 10');
  close(cdMorrison(10), 3.97, 0.005, 'Morrison at 10');
  let peak = { Re: 0, cd: 0 };
  let dip = { Re: 0, cd: 9 };
  for (let e = 4.5; e <= 6; e += 0.0005) {
    const Re = 10 ** e;
    const cd = cdMorrison(Re);
    if (Re < 3e5 && cd > peak.cd) peak = { Re, cd };
    if (Re > 2e5 && cd < dip.cd) dip = { Re, cd };
  }
  close(peak.cd, 0.438, 0.002, 'peak');
  rel(peak.Re, 1.56e5, 0.02, 'peak Re');
  close(dip.cd, 0.0902, 0.001, 'dip');
  rel(dip.Re, 4.44e5, 0.02, 'dip Re');
  // Plateau 1e3-1e5 between 0.39 and 0.49.
  for (let e = 3; e <= 5; e += 0.05) {
    const cd = cdMorrison(10 ** e);
    assert.ok(cd > 0.39 && cd < 0.49, `plateau ${cd}`);
  }
  // Force on a smooth 22 cm sphere in air (rho 1.2, nu 1.5e-5): local max then min.
  const D = 0.22;
  const force = (U) => cdMorrison((U * D) / 1.5e-5) * 0.5 * 1.2 * U * U * (Math.PI / 4) * D * D;
  let fMax = { U: 0, F: 0 };
  for (let U = 5; U < 20; U += 0.01) if (force(U) > fMax.F) fMax = { U, F: force(U) };
  let fMin = { U: 0, F: 9 };
  for (let U = fMax.U; U < 30; U += 0.01) if (force(U) < fMin.F) fMin = { U, F: force(U) };
  close(fMax.F, 2.04, 0.02, 'force max');
  close(fMax.U, 16.4, 0.3, 'speed at max');
  close(fMin.F, 1.45, 0.02, 'force min');
  close(fMin.U, 24.2, 0.3, 'speed at min');
});

test('Strouhal: the wire presets and Roshko values', () => {
  const nuAir = 1.5e-5;
  const S = strouhalCylinder((10 * 1e-3) / nuAir);
  close(S.st, 0.208, 0.001, 'St 1 mm 10 m/s');
  close((S.st * 10) / 1e-3, 2080, 10, 'frequency');
  close(strouhalCylinder(100).st, 0.167, 0.001, 'Roshko 100');
  assert.equal(strouhalCylinder((2 * 2e-4) / nuAir).regime, 'steady');
  assert.ok(Number.isNaN(strouhalCylinder((3 * 1e-3) / nuAir).st), 'transition at Re 200');
});

test('ship models: Froude speeds, friction ratios and Reynolds-matching speeds', () => {
  const cargo = shipScaling(SHIP_PRESETS['cargo-1-25']);
  close(cargo.froude.speed, 1.6, 1e-9, 'cargo model speed');
  rel(cargo.froude.Re, 6.4e6, 1e-6, 'cargo model Re');
  rel(cargo.ship.Re, 8e8, 1e-6, 'ship Re');
  close(cargo.froude.Cf / cargo.ship.Cf, 2.06, 0.01, 'cargo Cf ratio');
  close(cargo.reynolds.speed, 200, 1e-6, 'cargo Re-match speed');
  rel(cargo.nuNeeded, 8e-9, 1e-6, 'nu needed');
  close(ittc1957(8e8), cargo.ship.Cf, 1e-15, 'ITTC line');
  const tanker = shipScaling(SHIP_PRESETS['tanker-1-50']);
  close(tanker.froude.speed, 1.06, 0.01, 'tanker model speed');
  close(tanker.froude.Cf / tanker.ship.Cf, 2.34, 0.01, 'tanker Cf ratio');
  const yacht = shipScaling(SHIP_PRESETS['yacht-1-10']);
  close(yacht.reynolds.speed, 40, 0.5, 'yacht Re-match speed');
});
