// Chapter 10 (pressure): the claims its prose, figures and gallery entries
// make, measured on the kernels the figures run (src/sims/projection.js,
// grid2d.js, poisson.js and the chapter's own ch-pressure-compat.js and
// ch-pressure-push.js), at the figures' own settings.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { macGrid, divergence, gradient, enforceBoundary, faceDot, vorticityCorners, centralGradient, parityFractions } from '../../aids/fluid-course/src/sims/grid2d.js';
import { project, projectSteps, pressureOperator, helmholtzHodge, PROJECTION_PRESETS, collocatedGrid, collocatedProject, COLLOCATED_PRESETS } from '../../aids/fluid-course/src/sims/projection.js';
import { jacobi } from '../../aids/fluid-course/src/sims/poisson.js';
import { naiveJacobi, compatBox, boundaryInflow } from '../../aids/fluid-course/src/sims/ch-pressure-compat.js';
import { addBlob, movingShare } from '../../aids/fluid-course/src/sims/ch-pressure-push.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b} (tol ${tol})`);
const drain = (gen) => {
  for (;;) {
    const r = gen.next();
    if (r.done) return r.value;
  }
};
const maxAbs = (a) => a.reduce((m, x) => Math.max(m, Math.abs(x)), 0);
const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

// ---------------------------------------------------------------- constraint

test('push: a local push moves most of the box and keeps about half its energy (pressure-push default)', () => {
  const N = 48;
  const g = macGrid(N, N, 1 / N, { bc: 'wall' });
  addBlob(g, g.u, g.v, 0.38, 0.5, 1, 0, 0.07);
  enforceBoundary(g);
  divergence(g, g.div);
  close(maxAbs(g.div), 11.8, 0.1, 'max divergence of the push');
  const ke0 = faceDot(g, g.u, g.v, g.u, g.v);
  const s0 = movingShare(g, g.u, g.v);
  const r = project(g, { method: 'mgpcg', tol: 1e-8, warm: false });
  const ke1 = faceDot(g, g.u, g.v, g.u, g.v);
  const s1 = movingShare(g, g.u, g.v);
  close(s0, 0.073, 0.005, 'share moving before');
  close(s1, 0.86, 0.01, 'share moving after');
  close(ke1 / ke0, 0.48, 0.01, 'energy kept');
  assert.ok(r.divAfter.max < 1e-6, `divergence after ${r.divAfter.max}`);
  assert.ok(r.iters <= 8, `iterations ${r.iters}`);
  // Projecting twice changes nothing.
  const u1 = Float64Array.from(g.u);
  project(g, { method: 'mgpcg', tol: 1e-8, warm: false });
  let d = 0;
  for (let k = 0; k < u1.length; k++) d = Math.max(d, Math.abs(u1[k] - g.u[k]));
  assert.ok(d < 1e-6, `re-projection changed u by ${d}`);
});

// ---------------------------------------------------------------- hodge

test('hodge: swirl + source + sink splits 78/22, orthogonal to rounding (pressure-hodge default)', () => {
  const N = 40;
  const src = PROJECTION_PRESETS['vortex-source'].make(N);
  const work = macGrid(N, N, 1 / N, { bc: 'periodic' });
  const hh = helmholtzHodge(src.u, src.v, N, N, 1 / N, { grid: work, tol: 1e-9 });
  const e = faceDot(src, src.u, src.v, src.u, src.v);
  const a = faceDot(src, hh.divFreeU, hh.divFreeV, hh.divFreeU, hh.divFreeV);
  const b = faceDot(src, hh.curlFreeU, hh.curlFreeV, hh.curlFreeU, hh.curlFreeV);
  const x = faceDot(src, hh.divFreeU, hh.divFreeV, hh.curlFreeU, hh.curlFreeV);
  close(a / e, 0.78, 0.01, 'divergence-free share');
  close((a + b) / e, 1, 1e-9, 'energies add');
  assert.ok(Math.abs(x / e) < 1e-10, `cross term ${x / e}`);
  const d = new Float64Array(N * N);
  divergence(work, d, src.u, src.v);
  close(maxAbs(d), 11.1, 0.1, 'max divergence of the field');
  divergence(work, d, hh.divFreeU, hh.divFreeV);
  assert.ok(maxAbs(d) < 1e-8, `divergence of the divergence-free part ${maxAbs(d)}`);
  const w = new Float64Array((N + 1) * (N + 1));
  vorticityCorners(work, w, hh.curlFreeU, hh.curlFreeV);
  assert.ok(maxAbs(w) < 1e-9, `curl of the gradient part ${maxAbs(w)}`);
});

test('hodge: a straight push splits about half and half', () => {
  const N = 40;
  const g = macGrid(N, N, 1 / N, { bc: 'periodic' });
  addBlob(g, g.u, g.v, 0.5, 0.5, 1, 0, 0.075);
  enforceBoundary(g);
  const hh = helmholtzHodge(g.u, g.v, N, N, 1 / N, { tol: 1e-10 });
  const e = faceDot(g, g.u, g.v, g.u, g.v);
  const a = faceDot(g, hh.divFreeU, hh.divFreeV, hh.divFreeU, hh.divFreeV);
  assert.ok(a / e > 0.45 && a / e < 0.55, `divergence-free share ${a / e}`);
});

// ---------------------------------------------------------------- projection

const relResidual = (scene, n, method, K, solver = {}) => {
  const g = PROJECTION_PRESETS[scene].make(n);
  const r = drain(projectSteps(g, { method, maxIter: K, tol: 1e-12, warm: false, solver }));
  return { res: r.residuals.at(-1), iters: r.iters, converged: r.converged };
};

test('projection: residual after K iterations on the channel (pressure-projection settings)', () => {
  const J = { omega: 0.8 };
  close(relResidual('obstacle-channel', 64, 'jacobi', 10, J).res, 0.36, 0.01, 'Jacobi 10');
  close(relResidual('obstacle-channel', 64, 'jacobi', 100, J).res, 0.125, 0.005, 'Jacobi 100');
  close(relResidual('obstacle-channel', 64, 'jacobi', 1000, J).res, 0.032, 0.002, 'Jacobi 1000');
  const gs = relResidual('obstacle-channel', 64, 'gauss-seidel', 1000).res;
  assert.ok(gs > 0.005 && gs < 0.02, `Gauss-Seidel 1000: ${gs}`);
  const cg = relResidual('obstacle-channel', 64, 'cg', 1000);
  assert.ok(cg.converged && cg.iters >= 210 && cg.iters <= 230, `CG iterations ${cg.iters}`);
  const mg10 = relResidual('obstacle-channel', 64, 'multigrid', 10).res;
  assert.ok(mg10 < 1e-9, `multigrid 10: ${mg10}`);
  const mg = relResidual('obstacle-channel', 64, 'multigrid', 1000);
  assert.ok(mg.converged && mg.iters <= 13, `multigrid iterations ${mg.iters}`);
});

// ---------------------------------------------------------------- compatibility

test('compat: boundaryInflow is minus the summed divergence (discrete divergence theorem)', () => {
  for (const [opts, q] of [
    [{ outflow: 0 }, 1],
    [{ outflow: 0.5 }, 0.5],
    [{ outflow: 1 }, 0],
    [{ right: 'open' }, 1],
  ]) {
    const g = compatBox(24, opts);
    divergence(g, g.div);
    let s = 0;
    for (const d of g.div) s += d;
    close(boundaryInflow(g), q, 1e-12, `inflow ${JSON.stringify(opts)}`);
    close(boundaryInflow(g), -s * g.h * g.h, 1e-12, `divergence theorem ${JSON.stringify(opts)}`);
  }
  const ch = PROJECTION_PRESETS['obstacle-channel'].make(64);
  divergence(ch, ch.div);
  let s = 0;
  for (let c = 0; c < ch.div.length; c++) if (!ch.solid[c]) s += ch.div[c];
  close(boundaryInflow(ch), -s * ch.h * ch.h, 1e-10, 'channel');
});

const compatRun = (outflow, sweeps, right = 'wall') => {
  const g = compatBox(24, { inflow: 1, outflow, right });
  const op = pressureOperator(g);
  divergence(g, g.div);
  const b = Float64Array.from(g.div, (d) => -d);
  return { g, op, b, run: drain(naiveJacobi(op, b, { omega: 0.8, maxIter: sweeps })) };
};

test('compat: raw Jacobi on an incompatible box stalls at its floor and its level drifts linearly (pressure-compat incompatible)', () => {
  const { op, b, run } = compatRun(0, 3000);
  assert.ok(op.singular, 'walls all round: singular operator');
  const N = b.length;
  const sb = b.reduce((s, x) => s + x, 0);
  const bn = Math.hypot(...b);
  const floor = (Math.abs(sb / N) * Math.sqrt(N)) / bn;
  close(floor, 0.204, 0.001, 'residual floor');
  for (const r of run.residuals) assert.ok(r >= floor * (1 - 1e-9), `residual ${r} below the floor ${floor}`);
  close(run.residuals.at(-1), floor, 0.01 * floor, 'stalls at the floor');
  close(run.means[1000], 0.364, 0.005, 'mean after 1000');
  close(run.means[2000], 0.726, 0.005, 'mean after 2000');
  close(run.means[3000], 1.089, 0.005, 'mean after 3000');
  for (let k = 1; k < run.weighted.length; k += 250) close(run.weighted[k] - run.weighted[k - 1], 0.8 * sb, 1e-6 * Math.abs(sb), `weighted sum step ${k}`);
});

test('compat: balanced box converges with no drift; mean removal leaves uniform divergence -Q', () => {
  const { run } = compatRun(1, 3000);
  assert.ok(run.residuals.at(-1) < 1e-4, `balanced residual ${run.residuals.at(-1)}`);
  close(run.weighted.at(-1), run.weighted[0], 1e-6, 'no drift');
  // The course solver (mean of b removed) converges on the incompatible box too.
  const inc = compatRun(0, 1);
  const shared = drain(jacobi(inc.op, inc.b, { omega: 0.8, maxIter: 3000, tol: 1e-14 }));
  assert.ok(shared.residuals.at(-1) < 1e-4, `mean-removed residual ${shared.residuals.at(-1)}`);
  for (const [outflow, q] of [
    [0, 1],
    [0.5, 0.5],
  ]) {
    const g = compatBox(24, { inflow: 1, outflow });
    project(g, { method: 'mgpcg', tol: 1e-10, warm: false });
    close(mean(g.div), -q, 1e-6, `divergence left, outflow ${outflow}`);
    close(maxAbs(g.div.map((d) => d + q)), 0, 1e-6, `uniform, outflow ${outflow}`);
  }
  const open = compatBox(24, { inflow: 1, right: 'open' });
  const r = project(open, { method: 'mgpcg', tol: 1e-10, warm: false });
  assert.ok(!pressureOperator(open).singular, 'open side: non-singular');
  assert.ok(r.relDiv < 1e-8, `open side relDiv ${r.relDiv}`);
});

// ---------------------------------------------------------------- checkerboard

test('checkerboard: the central gradient cannot see odd-even patterns; the MAC gradient sees 2a/h (or a/h)', () => {
  const N = 16;
  const h = 1 / N;
  const g = macGrid(N, N, h, { bc: 'periodic' });
  const ps = new Float64Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) ps[i + j * N] = 0.5 * Math.sin(2 * Math.PI * (i + 0.5) * h) * Math.cos(2 * Math.PI * (j + 0.5) * h);
  const gx0 = new Float64Array(N * N);
  const gy0 = new Float64Array(N * N);
  const gu0 = new Float64Array(g.u.length);
  const gv0 = new Float64Array(g.v.length);
  centralGradient(ps, N, N, h, gx0, gy0, true);
  gradient(g, ps, gu0, gv0);
  const a = 0.3;
  const patterns = {
    checker: [(i, j) => ((i + j) & 1 ? -1 : 1), 2],
    stripe: [(i) => (i & 1 ? -1 : 1), 2],
    subgrid: [(i, j) => (!(i & 1) && !(j & 1) ? 1 : 0), 1],
  };
  for (const [name, [q, jump]] of Object.entries(patterns)) {
    const p = Float64Array.from(ps);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) p[i + j * N] += a * q(i, j);
    const gx = new Float64Array(N * N);
    const gy = new Float64Array(N * N);
    centralGradient(p, N, N, h, gx, gy, true);
    let dc = 0;
    for (let c = 0; c < N * N; c++) dc = Math.max(dc, Math.abs(gx[c] - gx0[c]), Math.abs(gy[c] - gy0[c]));
    assert.ok(dc < 1e-12, `${name}: collocated change ${dc}`);
    const gu = new Float64Array(g.u.length);
    const gv = new Float64Array(g.v.length);
    gradient(g, p, gu, gv);
    let dm = 0;
    for (let k = 0; k < gu.length; k++) dm = Math.max(dm, Math.abs(gu[k] - gu0[k]));
    close(dm, (jump * a) / h, 1e-9, `${name}: MAC change`);
  }
  close((2 * a) / h, 9.6, 1e-12, 'quoted 2a/h');
  // mac-cell figure: h = 1, a = 0.5 → 2a/h = 1.
  const pc = new Float64Array(6 * 4).map((_, c) => 0.5 * (((c % 6) + Math.floor(c / 6)) & 1 ? -1 : 1));
  const g1 = macGrid(6, 4, 1, { bc: 'periodic' });
  const gu1 = new Float64Array(g1.u.length);
  gradient(g1, pc, gu1, new Float64Array(g1.v.length));
  close(maxAbs(gu1), 1, 1e-12, 'mac-cell 2a/h');
});

test('collocated projections: exact is speckled, approximate leaves O(h²) divergence, Rhie-Chow fluxes are exact (pressure-rhie-chow)', () => {
  const run = (n, pre, kind) => {
    const cg = collocatedGrid(n, n);
    COLLOCATED_PRESETS[pre].init(cg, 3);
    return collocatedProject(cg, { kind, tol: 1e-10 });
  };
  let r = run(16, 'impulse', 'exact');
  close(r.parity.total, 0.75, 0.005, 'exact impulse parity');
  assert.ok(r.relDiv < 1e-10, `exact relDiv ${r.relDiv}`);
  r = run(16, 'impulse', 'approximate');
  close(r.parity.total, 0.246, 0.005, 'approximate impulse parity');
  close(r.relDiv, 0.605, 0.005, 'approximate impulse relDiv');
  r = run(16, 'impulse', 'rhie-chow');
  assert.ok(r.faceDivAfter.max / r.divBefore.max < 1e-9, 'Rhie-Chow face divergence');
  close(r.parity.total, 0.246, 0.005, 'Rhie-Chow impulse parity');
  close(run(16, 'smooth', 'approximate').relDiv, 0.124, 0.003, 'smooth 16');
  close(run(32, 'smooth', 'approximate').relDiv, 0.032, 0.002, 'smooth 32');
  close(run(16, 'noise', 'exact').parity.total, 0.75, 0.005, 'exact noise parity');
  const out = parityFractions(new Float64Array(16 * 16).map((_, c) => ((c % 16) + Math.floor(c / 16)) & 1 ? -1 : 1), 16, 16);
  close(out.checker, 1, 1e-12, 'pure checkerboard share');
});
