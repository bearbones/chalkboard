// Tests for the spectral kernels: fft.js, spectral.js, turbulence.js.
// Each test checks a claim the course makes (accuracy, convergence order,
// conservation, exact solutions, scaling laws), not a snapshot of output.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rng, gaussian, drain, observedOrders } from '../../aids/fluid-course/src/sims/util.js';
import * as fftModule from '../../aids/fluid-course/src/sims/fft.js';
import * as spectralModule from '../../aids/fluid-course/src/sims/spectral.js';
import * as turbulenceModule from '../../aids/fluid-course/src/sims/turbulence.js';
import { fft, ifft, fft2, ifft2, dft, fftSteps, fftTwoReal, fftReal, wavenumbers, binOf, powerSpectrum } from '../../aids/fluid-course/src/sims/fft.js';
import {
  aliasOf,
  dealiasKmax,
  spectralDerivative,
  fdDerivative,
  modifiedWavenumber,
  derivativeConvergence,
  spectralProduct,
  createBurgers,
  stepBurgers,
  burgersField,
  burgersEnergy,
  burgersSpectrum,
  burgersExact,
  burgersSuggestDt,
  BURGERS_PRESETS,
} from '../../aids/fluid-course/src/sims/spectral.js';
import {
  createTurb2D,
  stepTurb2D,
  turbEnergy,
  turbEnstrophy,
  turbSpectrum,
  turbShells,
  turbVorticity,
  turbVelocity,
  turbDissipation,
  turbSuggestDt,
  TURB2D_PRESETS,
  createSabra,
  stepSabra,
  sabraSuggestDt,
  sabraEnergy,
  sabraHelicity,
  sabraFlux,
  sabraAccumulate,
  sabraResetStats,
  sabraStats,
  SABRA_PRESETS,
  kolmogorovScales,
  flowScales,
  dnsCost,
  EXAMPLE_FLOWS,
  popeSpectrum,
  popeIntegrals,
  popeCoefficients,
  popeResolved,
  popeCutoffFor,
  POPE_CONSTANTS,
} from '../../aids/fluid-course/src/sims/turbulence.js';

const TAU = 2 * Math.PI;
const grid = (n) => Float64Array.from({ length: n }, (_, j) => (TAU * j) / n);
const maxAbsDiff = (a, b) => {
  let e = 0;
  for (let j = 0; j < a.length; j++) e = Math.max(e, Math.abs(a[j] - b[j]));
  return e;
};
// RK4's amplification factor R(z) = 1 + z + z^2/2 + z^3/6 + z^4/24, z = x + i y.
const rk4 = (x, y = 0) => {
  // powers of z
  const z2r = x * x - y * y;
  const z2i = 2 * x * y;
  const z3r = z2r * x - z2i * y;
  const z3i = z2r * y + z2i * x;
  const z4r = z3r * x - z3i * y;
  const z4i = z3r * y + z3i * x;
  return [1 + x + z2r / 2 + z3r / 6 + z4r / 24, y + z2i / 2 + z3i / 6 + z4i / 24];
};
const rk4abs = (x, y = 0) => Math.hypot(...rk4(x, y));

// ---------------------------------------------------------------------------
// Metadata

test('every exported TeX string survived JS escaping: no bare ";" from \\;, no control characters, balanced braces', () => {
  // '\;' in a single-quoted JS string is just ';' (the TeX space is lost), and '\frac',
  // '\text', '\beta' with one backslash become form feed, tab, backspace.
  const found = [];
  // TeX lives in keys named *tex*, in objects named *_TEX, and in DERIVATIVE_METHODS[*].modified
  const isTex = (key, inTex) => inTex || /tex/i.test(key) || key === 'modified';
  const walk = (v, path, inTex = false) => {
    if (typeof v === 'function' || v === null || typeof v !== 'object') return;
    for (const [key, val] of Object.entries(v)) {
      if (typeof val === 'string' && isTex(key, inTex)) found.push([`${path}.${key}`, val]);
      else walk(val, `${path}.${key}`, inTex || /_TEX$/.test(key));
    }
  };
  for (const [name, mod] of Object.entries({ fft: fftModule, spectral: spectralModule, turbulence: turbulenceModule })) walk(mod, name);
  assert.ok(found.length > 20, `found ${found.length} TeX strings`);
  for (const [path, tex] of found) {
    assert.ok(!/(^|[^\\]);/.test(tex), `${path}: bare ';' in ${tex}`);
    assert.ok(!/[\x00-\x1f]/.test(tex), `${path}: control character (single-backslash escape) in ${JSON.stringify(tex)}`);
    let depth = 0;
    for (let i = 0; i < tex.length; i++) {
      if (tex[i] === '\\') i++;
      else if (tex[i] === '{') depth++;
      else if (tex[i] === '}') depth--;
      assert.ok(depth >= 0, `${path}: unbalanced braces`);
    }
    assert.equal(depth, 0, `${path}: unbalanced braces`);
  }
  assert.ok(spectralModule.ALIASING.productTex.includes('\\;\\Rightarrow\\;'));
});

// ---------------------------------------------------------------------------
// FFT

test('FFT matches the naive DFT on random data to 1e-12, every size 1..1024', () => {
  const r = rng(11);
  for (let n = 1; n <= 1024; n *= 2) {
    const re = Float64Array.from({ length: n }, () => gaussian(r));
    const im = Float64Array.from({ length: n }, () => gaussian(r));
    const dRe = new Float64Array(n);
    const dIm = new Float64Array(n);
    dft(re, im, dRe, dIm);
    const fRe = re.slice();
    const fIm = im.slice();
    fft(fRe, fIm);
    const e = Math.max(maxAbsDiff(fRe, dRe), maxAbsDiff(fIm, dIm));
    assert.ok(e < 1e-12, `n=${n}: |FFT - DFT| = ${e}`);
    // inverse DFT agrees with ifft too
    dft(fRe, fIm, dRe, dIm, true);
    ifft(fRe, fIm);
    assert.ok(Math.max(maxAbsDiff(fRe, dRe), maxAbsDiff(fIm, dIm)) < 1e-13);
  }
});

test('inverse FFT round trip and Parseval', () => {
  const r = rng(5);
  for (const n of [8, 64, 512]) {
    const re = Float64Array.from({ length: n }, () => gaussian(r));
    const im = Float64Array.from({ length: n }, () => gaussian(r));
    const a = re.slice();
    const b = im.slice();
    fft(a, b);
    let sx = 0;
    let sX = 0;
    for (let j = 0; j < n; j++) {
      sx += re[j] ** 2 + im[j] ** 2;
      sX += a[j] ** 2 + b[j] ** 2;
    }
    assert.ok(Math.abs(sX / n / sx - 1) < 1e-13, `Parseval n=${n}`);
    ifft(a, b);
    assert.ok(Math.max(maxAbsDiff(a, re), maxAbsDiff(b, im)) < 1e-14, `round trip n=${n}`);
  }
  assert.throws(() => fft(new Float64Array(12), new Float64Array(12)), /power of two/);
});

test('fftSteps is the same transform: log2 N stages of N/2 butterflies, bit-identical result', () => {
  const r = rng(2);
  const n = 64;
  const re = Float64Array.from({ length: n }, r);
  const im = Float64Array.from({ length: n }, r);
  const a = re.slice();
  const b = im.slice();
  fft(a, b);
  const c = re.slice();
  const d = im.slice();
  const stages = [];
  drain(fftSteps(c, d), (e) => e.op === 'stage' && stages.push(e));
  assert.equal(stages.length, 6);
  assert.deepEqual(
    stages.map((s) => s.span),
    [1, 2, 4, 8, 16, 32],
  );
  for (const s of stages) assert.equal(s.butterflies, n / 2);
  assert.equal(maxAbsDiff(a, c), 0);
  assert.equal(maxAbsDiff(b, d), 0);
});

test('2-D FFT equals the separable 2-D DFT; inverse round trip', () => {
  const r = rng(9);
  const nx = 8;
  const ny = 16;
  const re = Float64Array.from({ length: nx * ny }, () => gaussian(r));
  const im = Float64Array.from({ length: nx * ny }, () => gaussian(r));
  const a = re.slice();
  const b = im.slice();
  fft2(a, b, nx, ny);
  let e = 0;
  for (let ky = 0; ky < ny; ky++)
    for (let kx = 0; kx < nx; kx++) {
      let sr = 0;
      let si = 0;
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const ang = -TAU * ((i * kx) / nx + (j * ky) / ny);
          const q = i + j * nx;
          sr += re[q] * Math.cos(ang) - im[q] * Math.sin(ang);
          si += re[q] * Math.sin(ang) + im[q] * Math.cos(ang);
        }
      e = Math.max(e, Math.abs(sr - a[kx + ky * nx]), Math.abs(si - b[kx + ky * nx]));
    }
  assert.ok(e < 1e-12, `2-D FFT vs DFT ${e}`);
  ifft2(a, b, nx, ny);
  assert.ok(Math.max(maxAbsDiff(a, re), maxAbsDiff(b, im)) < 1e-14);
});

test('pruned 2-D FFT for 2/3-rule data gives exactly the full transform where it matters', () => {
  const r = rng(12);
  const n = 32;
  const band = dealiasKmax(n);
  const keep = (j) => Math.abs(j < n / 2 ? j : j - n) <= band;
  const re = new Float64Array(n * n);
  const im = new Float64Array(n * n);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++)
      if (keep(j)) {
        re[i + j * n] = gaussian(r);
        im[i + j * n] = gaussian(r);
      }
  const a = re.slice();
  const b = im.slice();
  fft2(a, b, n, n, true);
  fft2(re, im, n, n, true, band);
  assert.equal(maxAbsDiff(a, re), 0);
  assert.equal(maxAbsDiff(b, im), 0);
  const g = Float64Array.from({ length: n * n }, () => gaussian(r));
  const h = new Float64Array(n * n);
  const g2 = g.slice();
  const h2 = h.slice();
  fft2(g, h, n, n);
  fft2(g2, h2, n, n, false, band);
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const q = i + j * n;
      if (keep(i)) assert.ok(g2[q] === g[q] && h2[q] === h[q]);
      else assert.ok(g2[q] === 0 && h2[q] === 0);
    }
});

test('real-data helpers: two real spectra from one complex FFT; Hermitian symmetry; wavenumbers', () => {
  const r = rng(4);
  const n = 32;
  const x = Float64Array.from({ length: n }, () => gaussian(r));
  const y = Float64Array.from({ length: n }, () => gaussian(r));
  const xr = new Float64Array(n);
  const xi = new Float64Array(n);
  const yr = new Float64Array(n);
  const yi = new Float64Array(n);
  fftTwoReal(x, y, xr, xi, yr, yi);
  const ar = new Float64Array(n);
  const ai = new Float64Array(n);
  fftReal(x, ar, ai);
  assert.ok(Math.max(maxAbsDiff(xr, ar), maxAbsDiff(xi, ai)) < 1e-13);
  fftReal(y, ar, ai);
  assert.ok(Math.max(maxAbsDiff(yr, ar), maxAbsDiff(yi, ai)) < 1e-13);
  for (let k = 1; k < n; k++) {
    assert.ok(Math.abs(ar[k] - ar[n - k]) < 1e-13 && Math.abs(ai[k] + ai[n - k]) < 1e-13, 'X_{-k} = conj X_k');
  }
  const ps = powerSpectrum(ar, ai, new Float64Array(n));
  const mean2 = y.reduce((s, v) => s + v * v, 0) / n;
  assert.ok(Math.abs(ps.reduce((s, v) => s + v, 0) / mean2 - 1) < 1e-13);
  assert.deepEqual(Array.from(wavenumbers(8)), [0, 1, 2, 3, -4, -3, -2, -1]);
  assert.deepEqual(Array.from(wavenumbers(8, TAU, 0)), [0, 1, 2, 3, 0, -3, -2, -1]);
  assert.deepEqual(Array.from(wavenumbers(4, 1)), [0, TAU, -2 * TAU, -TAU]);
});

// ---------------------------------------------------------------------------
// Differentiation: exponential versus algebraic convergence

test('spectral derivative of sin x and exp(sin x) is exact to ~1e-13', () => {
  for (const n of [16, 32, 64]) {
    const x = grid(n);
    const f = x.map(Math.sin);
    const d = spectralDerivative(f, new Float64Array(n));
    assert.ok(maxAbsDiff(d, x.map(Math.cos)) < 1e-13, `sin, n=${n}`);
  }
  const n = 32;
  const x = grid(n);
  const d = spectralDerivative(
    x.map((v) => Math.exp(Math.sin(v))),
    new Float64Array(n),
  );
  const e = maxAbsDiff(
    d,
    x.map((v) => Math.cos(v) * Math.exp(Math.sin(v))),
  );
  assert.ok(e < 1e-13, `exp(sin x) at N = 32: ${e}`);
  // second derivative too, on a domain of length L = 3
  const L = 3;
  const y = Float64Array.from({ length: 64 }, (_, j) => (L * j) / 64);
  const w = (TAU / L) * 2;
  const d2 = spectralDerivative(
    y.map((v) => Math.sin(w * v)),
    new Float64Array(64),
    L,
    2,
  );
  assert.ok(
    maxAbsDiff(
      d2,
      y.map((v) => -w * w * Math.sin(w * v)),
    ) < 1e-11,
  );
});

test('finite differences converge algebraically at orders 2, 4, 6; spectral exponentially', () => {
  const r = drain(derivativeConvergence({ fn: 'expsin', ns: [16, 32, 64, 128, 256], methods: ['fd2', 'fd4', 'fd6', 'spectral'] }));
  const last = (m) => r.orders[m][r.orders[m].length - 1];
  assert.ok(Math.abs(last('fd2') - 2) < 0.02, `fd2 order ${last('fd2')}`);
  assert.ok(Math.abs(last('fd4') - 4) < 0.05, `fd4 order ${last('fd4')}`);
  assert.ok(Math.abs(last('fd6') - 6) < 0.1, `fd6 order ${last('fd6')}`);
  // spectral: from 1.8e-7 at N = 16 to rounding level at N = 32 (an "order" > 20)
  assert.ok(r.errors.spectral[0] / r.errors.spectral[1] > 1e6);
  assert.ok(r.errors.spectral[1] < 1e-13);
  // 256 points of FD4 are still less accurate than 32 points of spectral
  assert.ok(r.errors.fd4[4] > 1e4 * r.errors.spectral[1]);
});

test('geometric convergence for a function analytic in a strip; only algebraic when f is not smooth', () => {
  // f = 1/(1 + sin^2(x/2)) has poles at Im x = +-2 asinh(1): error ~ exp(-asinh(1) N)
  // (coefficients ~ exp(-2 asinh(1) |k|); the derivative error ~ N exp(-asinh(1) N))
  const a = drain(derivativeConvergence({ fn: 'runge', ns: [16, 32], methods: ['spectral'] }));
  const e = a.errors.spectral;
  const rate = (Math.log(e[0] / e[1]) + Math.log(2)) / 16;
  assert.ok(Math.abs(rate - Math.asinh(1)) < 0.03, `geometric rate ${rate}, expected ${Math.asinh(1)}`);
  // |sin x|^3: third derivative jumps, every method falls to order 2
  const b = drain(derivativeConvergence({ fn: 'abscube', ns: [32, 64, 128, 256], methods: ['fd2', 'fd6', 'spectral'] }));
  const ps = b.orders.spectral[2];
  assert.ok(Math.abs(ps - 2) < 0.1, `spectral order on |sin x|^3: ${ps}`);
  assert.ok(Math.abs(b.orders.fd6[2] - 2) < 0.2, `fd6 order on |sin x|^3: ${b.orders.fd6[2]}`);
});

test('modified wavenumbers: spectral exact below Nyquist, FD lags at high k', () => {
  for (const t of [0.1, 1, 2, 3]) assert.equal(modifiedWavenumber('spectral', t), t);
  assert.equal(modifiedWavenumber('spectral', Math.PI), 0);
  assert.ok(Math.abs(modifiedWavenumber('fd2', 1) - Math.sin(1)) < 1e-15);
  // a grid wave at k dx = pi/2 (4 points per wavelength): FD2 at 64 %, FD4 at 85 %
  assert.ok(Math.abs(modifiedWavenumber('fd2', Math.PI / 2) / (Math.PI / 2) - 2 / Math.PI) < 1e-12);
  assert.ok(Math.abs(modifiedWavenumber('fd4', Math.PI / 2) / (Math.PI / 2) - 0.8488263631567751) < 1e-12);
  // and it really is what fdDerivative does to exp(i k x) (real part: cos)
  const n = 16;
  const k = 3;
  const x = grid(n);
  const d = fdDerivative(
    x.map((v) => Math.cos(k * v)),
    new Float64Array(n),
    TAU / n,
    4,
  );
  const kp = modifiedWavenumber('fd4', (k * TAU) / n) / (TAU / n);
  assert.ok(
    maxAbsDiff(
      d,
      x.map((v) => -kp * Math.sin(k * v)),
    ) < 1e-13,
  );
});

// ---------------------------------------------------------------------------
// Aliasing and the 2/3 rule

test('aliasOf: where a mode lands on an N-point grid', () => {
  assert.equal(aliasOf(5, 32), 5);
  assert.equal(aliasOf(-5, 32), -5);
  assert.equal(aliasOf(19, 32), -13);
  assert.equal(aliasOf(33, 32), 1);
  assert.equal(aliasOf(16, 32), 16);
  assert.equal(aliasOf(-16, 32), 16);
  assert.equal(aliasOf(64, 32), 0);
  // the FFT of exp(i k x_j) has its single spike in the bin of aliasOf(k, N)
  const n = 16;
  for (let k = -40; k <= 40; k++) {
    const re = grid(n).map((x) => Math.cos(k * x));
    const im = grid(n).map((x) => Math.sin(k * x));
    fft(re, im);
    const bin = binOf(aliasOf(k, n), n);
    for (let j = 0; j < n; j++) assert.ok(Math.abs(re[j] - (j === bin ? n : 0)) < 1e-11 && Math.abs(im[j]) < 1e-11, `k=${k}`);
  }
  assert.equal(dealiasKmax(64), 21);
  assert.equal(dealiasKmax(128), 42);
  assert.equal(dealiasKmax(256), 85);
});

test('2/3 rule: the product of band-limited signals is exact on kept modes; without it the alias appears at k1 + k2 - N', () => {
  const n = 32;
  const x = grid(n);
  const a = x.map((v) => Math.cos(9 * v));
  const b = x.map((v) => Math.cos(10 * v));
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  // exact: cos 9x cos 10x = (cos x + cos 19x)/2; 19 is not on a 32-point grid
  spectralProduct(a, b, re, im, false);
  assert.ok(Math.abs(re[binOf(aliasOf(9 + 10, n), n)] - 0.25) < 1e-14, 'aliased mode at 19 - 32 = -13');
  assert.equal(binOf(aliasOf(19, n), n), binOf(19 - n, n));
  assert.ok(Math.abs(re[13] - 0.25) < 1e-14, 'and its conjugate at +13');
  spectralProduct(a, b, re, im, true);
  for (let k = 0; k < n; k++) {
    const want = k === 1 || k === n - 1 ? 0.25 : 0;
    assert.ok(Math.abs(re[k] - want) < 1e-14 && Math.abs(im[k]) < 1e-14, `bin ${k}`);
  }
  // random band-limited signals (|k| <= kmax): dealiased product = exact
  // convolution of the coefficients, truncated to |k| <= kmax
  const r = rng(8);
  const km = dealiasKmax(n);
  const ca = new Map();
  const cb = new Map();
  for (let k = 0; k <= km; k++) {
    const pa = [gaussian(r), k ? gaussian(r) : 0];
    const pb = [gaussian(r), k ? gaussian(r) : 0];
    ca.set(k, pa);
    cb.set(k, pb);
    if (k) {
      ca.set(-k, [pa[0], -pa[1]]);
      cb.set(-k, [pb[0], -pb[1]]);
    }
  }
  const synth = (c) =>
    x.map((v) => {
      let s = 0;
      for (const [k, [p, q]] of c) s += p * Math.cos(k * v) - q * Math.sin(k * v);
      return s;
    });
  spectralProduct(synth(ca), synth(cb), re, im, true);
  let err = 0;
  for (let k = -km; k <= km; k++) {
    let sr = 0;
    let si = 0;
    for (const [k1, [p, q]] of ca) {
      const c2 = cb.get(k - k1);
      if (!c2) continue;
      sr += p * c2[0] - q * c2[1];
      si += p * c2[1] + q * c2[0];
    }
    const j = binOf(k, n);
    err = Math.max(err, Math.abs(re[j] - sr), Math.abs(im[j] - si));
  }
  assert.ok(err < 1e-12, `dealiased product vs exact convolution: ${err}`);
  // Without the rule the kept modes are still right (that is why 2/3 works:
  // every alias of a product of kept modes lands above kmax), but the bins
  // kmax < |k| < N/2 now hold aliases, e.g. 9 + 10 at -13, which a time-stepper
  // would carry forward and feed back into the next product.
  spectralProduct(synth(ca), synth(cb), re, im, false);
  const exactAt = (k) => {
    let sr = 0;
    for (const [k1, [p, q]] of ca) {
      const c2 = cb.get(k - k1);
      if (c2) sr += p * c2[0] - q * c2[1];
    }
    return sr;
  };
  let keptErr = 0;
  for (let k = -km; k <= km; k++) keptErr = Math.max(keptErr, Math.abs(re[binOf(k, n)] - exactAt(k)));
  assert.ok(keptErr < 1e-12, `kept modes ${keptErr}`);
  let aliasErr = 0;
  for (let k = km + 1; k < n / 2; k++) aliasErr = Math.max(aliasErr, Math.abs(re[binOf(k, n)] - exactAt(k)));
  assert.ok(aliasErr > 0.1, `aliased content above kmax ${aliasErr}`);
  // and signals that fill the whole band (|k| < N/2) are corrupted everywhere
  const full = x.map((v) => Math.cos(12 * v));
  spectralProduct(full, full, re, im, false); // cos^2 12x = (1 + cos 24x)/2; 24 aliases to -8
  assert.ok(Math.abs(re[8] - 0.25) < 1e-14, 'a low mode (k = 8) that the true product does not contain');
});

// ---------------------------------------------------------------------------
// Burgers

test('Burgers: pseudo-spectral solution converges exponentially to the Cole-Hopf solution', () => {
  const nu = 0.1;
  const errs = [];
  for (const n of [32, 64, 128]) {
    const s = createBurgers({ n, nu, dt: 1 / 200 });
    for (let q = 0; q < 200; q++) stepBurgers(s);
    const ex = burgersExact(grid(n), 1, nu, new Float64Array(n));
    errs.push(maxAbsDiff(burgersField(s, new Float64Array(n)), ex));
  }
  // 4.6e-3, 3.7e-5, 3e-9: each doubling multiplies the accuracy by > 100
  assert.ok(errs[0] / errs[1] > 100 && errs[1] / errs[2] > 1000, errs.join(', '));
  assert.ok(errs[2] < 1e-8);
  // the exact solution itself: u(x, 0) = sin x, odd about x = pi
  const x = grid(64);
  const u0 = burgersExact(x, 0, 0.01, new Float64Array(64));
  assert.ok(maxAbsDiff(u0, x.map(Math.sin)) < 1e-15);
  const u1 = burgersExact(x, 2, 0.01, new Float64Array(64));
  assert.ok(Math.abs(u1[32]) < 1e-12);
  for (let j = 1; j < 32; j++) assert.ok(Math.abs(u1[j] + u1[64 - j]) < 1e-12);
});

test('Burgers: integrating-factor RK4 is fourth order in time', () => {
  const n = 256;
  const nu = 0.1;
  const ex = burgersExact(grid(n), 1, nu, new Float64Array(n));
  const errs = [10, 20, 40].map((m) => {
    const s = createBurgers({ n, nu, dt: 1 / m });
    for (let q = 0; q < m; q++) stepBurgers(s);
    return maxAbsDiff(burgersField(s, new Float64Array(n)), ex);
  });
  const p = observedOrders(errs);
  for (const o of p) assert.ok(o > 3.6 && o < 4.4, `observed orders ${p}`);
});

test('Burgers spectrum sums to the energy; viscosity is integrated exactly (stiff top modes)', () => {
  const s = createBurgers({ n: 64, nu: 0.05, ic: 'random', seed: 3 });
  const E = burgersSpectrum(s, new Float64Array(33));
  assert.ok(Math.abs(E.reduce((a, b) => a + b, 0) / burgersEnergy(s) - 1) < 1e-13);
  // a lone high mode with u u_x negligible: amplitude 1e-8 at k = 20, nu k^2 dt = 4,
  // far beyond explicit RK4's 2.8, decays exactly as exp(-nu k^2 t)
  const t = createBurgers({ n: 64, nu: 1, dt: 0.01, ic: (x) => 1e-8 * Math.sin(20 * x), dealias: true });
  const e0 = burgersEnergy(t);
  for (let q = 0; q < 5; q++) stepBurgers(t);
  assert.ok(Math.abs(burgersEnergy(t) / e0 / Math.exp(-2 * 400 * 0.05) - 1) < 1e-9);
});

test('Burgers, nu = 0, 2/3 rule: the truncated system conserves energy (to RK4 accuracy), even after the shock', () => {
  const drift = (dt) => {
    const s = createBurgers({ n: 128, nu: 0, dt, dealias: true });
    const E0 = burgersEnergy(s);
    let d = 0;
    while (s.t < 2) {
      stepBurgers(s);
      d = Math.max(d, Math.abs(burgersEnergy(s) / E0 - 1));
    }
    return d;
  };
  const a = drift(0.01);
  const b = drift(0.005);
  assert.ok(b < 1e-4, `drift ${b}`);
  assert.ok(a / b > 16, `drift falls at least as dt^4: ${a} -> ${b}`);
});

test('Burgers aliasing: without the 2/3 rule the run blows up at low nu whatever dt; with it energy decays monotonically', () => {
  const run = (dealias, dt) => {
    const s = createBurgers({ n: 128, nu: 0.002, dt, dealias });
    const E0 = burgersEnergy(s);
    let prev = E0;
    let rises = 0;
    let blow = null;
    while (s.t < 2) {
      stepBurgers(s);
      const e = burgersEnergy(s);
      if (!(e < 2 * E0)) {
        blow = s.t;
        break;
      }
      if (e > prev * (1 + 1e-12)) rises++;
      prev = e;
    }
    return { blow, rises };
  };
  for (const dt of [0.005, 0.0025]) {
    const bad = run(false, dt);
    assert.ok(bad.blow !== null && bad.blow > 1 && bad.blow < 1.6, `aliased blow-up at t = ${bad.blow} (dt ${dt})`);
    const good = run(true, dt);
    assert.equal(good.blow, null);
    assert.equal(good.rises, 0, 'dealiased energy never increases');
  }
});

test('Burgers aliasing pile-up: energy reflected into the top modes, measured against a resolved run', () => {
  const nu = 0.004;
  const spec = (n, dealias, dt) => {
    const s = createBurgers({ n, nu, dt, dealias });
    while (s.t < 2 - 1e-9) stepBurgers(s);
    return burgersSpectrum(s, new Float64Array(n / 2 + 1));
  };
  const ref = spec(1024, true, 0.002); // resolved: E(k) falls smoothly
  const al = spec(256, false, 0.002);
  const de = spec(256, true, 0.002);
  const km = dealiasKmax(256);
  const pileAliased = al[127] / ref[127];
  const pileDealiased = de[km] / ref[km];
  assert.ok(pileAliased > 100, `aliased top mode / resolved: ${pileAliased}`);
  assert.ok(pileAliased > 5 * pileDealiased, `dealiased cutoff excess ${pileDealiased} vs aliased ${pileAliased}`);
  // well below the cutoff all three agree
  for (const k of [4, 8, 16]) assert.ok(Math.abs(al[k] / ref[k] - 1) < 0.05 && Math.abs(de[k] / ref[k] - 1) < 0.05);
});

test('burgersExact (Cole-Hopf by quadrature) agrees with the independent Fourier-Bessel series to 1e-12', () => {
  // For u0 = sin x: phi(x, t) = I_0(z) + 2 sum_n I_n(z) e^{-nu n^2 t} cos nx, z = 1/(2 nu),
  // and u = -2 nu phi_x / phi (Cole 1951). I_n(z) e^{-z} = (1/pi) int_0^pi e^{z (cos th - 1)} cos(n th) dth,
  // a periodic integral that the trapezoid rule gets to rounding. The series itself
  // cancels badly where phi is small (near the front at small nu t, phi ~ e^{-2z}), so
  // it is only a reference where its condition number sum|terms| / |sum| is <= 1e3.
  const besselScaled = (n, z) => {
    const m = 2000;
    let acc = 0;
    for (let q = 0; q <= m; q++) {
      const th = (Math.PI * q) / m;
      acc += (q === 0 || q === m ? 0.5 : 1) * Math.exp(z * (Math.cos(th) - 1)) * Math.cos(n * th);
    }
    return acc / m;
  };
  const x = grid(64);
  for (const nu of [0.1, 0.05, 0.02]) {
    const z = 1 / (2 * nu);
    const I = Array.from({ length: 161 }, (_, n) => besselScaled(n, z));
    for (const t of [0.5, 1.5, 3]) {
      const ex = burgersExact(x, t, nu, new Float64Array(64));
      let err = 0;
      let used = 0;
      for (let j = 0; j < 64; j++) {
        let num = 0;
        let den = I[0];
        let abs = I[0];
        for (let n = 1; n <= 160; n++) {
          const c = I[n] * Math.exp(-nu * n * n * t);
          num += 4 * nu * n * c * Math.sin(n * x[j]);
          den += 2 * c * Math.cos(n * x[j]);
          abs += 2 * Math.abs(c);
        }
        if (abs / Math.abs(den) > 1e3) continue;
        used++;
        err = Math.max(err, Math.abs(ex[j] - num / den));
      }
      assert.ok(used >= 16, `nu ${nu}, t ${t}: only ${used} well-conditioned points`); // 19..64 of 64
      assert.ok(err < 1e-12, `nu ${nu}, t ${t}: ${err}`);
    }
  }
});

test('Burgers advective limit dt max|u| kmax = 2 sqrt 2 is sharp: a top-mode ripple grows by exactly |R(iC)| per step', () => {
  // A uniform stream u = 1 carrying a ripple at kmax: the ripple is advected with
  // eigenvalue -i kmax, so each RK4 step multiplies it by |R(-i C)| = |R(i C)|, C = dt kmax.
  const n = 64;
  const km = dealiasKmax(n);
  const growth = (C) => {
    const s = createBurgers({ n, nu: 0, dt: C / km, ic: (x) => 1 + 1e-6 * Math.sin(km * x) });
    const a0 = Math.hypot(s.uRe[km], s.uIm[km]);
    for (let q = 0; q < 200; q++) stepBurgers(s);
    return (Math.hypot(s.uRe[km], s.uIm[km]) / a0) ** (1 / 200);
  };
  for (const C of [2.8, 2.85]) {
    const g = growth(C);
    assert.ok(Math.abs(g / rk4abs(0, C) - 1) < 1e-3, `C = ${C}: per-step factor ${g} vs |R(iC)| ${rk4abs(0, C)}`);
  }
  assert.ok(growth(2.8) < 1 && growth(2.85) > 1, 'stable just below 2.83, unstable just above');
  assert.ok(Math.abs(rk4abs(0, 2 * Math.SQRT2) - 1) < 1e-12, 'the edge is 2 sqrt 2');
  // the presets straddle it: 'cfl-below' stays a calm stream, 'cfl-above' blows up within ~30 steps
  const run = (id) => {
    const s = createBurgers(BURGERS_PRESETS[id].params);
    const E0 = burgersEnergy(s);
    for (let q = 0; q < 200; q++) {
      stepBurgers(s);
      if (!(burgersEnergy(s) < 2 * E0)) return q + 1;
    }
    return null;
  };
  assert.equal(run('cfl-below'), null);
  const b = run('cfl-above');
  assert.ok(b !== null && b < 40, `cfl-above blew up at step ${b}`);
});

test('Burgers with explicit viscosity: a lone mode follows the RK4 polynomial R(-nu k^2 dt), so stiff modes blow up', () => {
  // the same lone high mode as above, nu k^2 dt = 4: the integrating factor gives exp(-4)
  // per step, explicit RK4 gives R(-4) = 5 (growth)
  const mk = (integratingFactor) => createBurgers({ n: 64, nu: 1, dt: 0.01, ic: (x) => 1e-8 * Math.sin(20 * x), integratingFactor });
  const a = mk(true);
  const b = mk(false);
  const a0 = a.uIm[20];
  stepBurgers(a);
  stepBurgers(b);
  assert.ok(Math.abs(a.uIm[20] / a0 / Math.exp(-4) - 1) < 1e-10);
  assert.ok(Math.abs(b.uIm[20] / a0 / rk4(-4)[0] - 1) < 1e-10, `explicit factor ${b.uIm[20] / a0} vs R(-4) = ${rk4(-4)[0]}`);
  // at a non-stiff mode the two agree to O(z^5)
  const c = createBurgers({ n: 64, nu: 0.01, dt: 0.01, ic: (x) => 1e-8 * Math.sin(5 * x), integratingFactor: false });
  stepBurgers(c);
  assert.ok(Math.abs(c.uIm[5] / (-c.n / 2) / 1e-8 / Math.exp(-0.0025) - 1) < 1e-12);
  // the preset pair: explicit blows up from rounding noise in ~10 steps; the
  // integrating factor at the same dt matches Cole-Hopf
  const ex = createBurgers(BURGERS_PRESETS['stiff-explicit'].params);
  let blow = null;
  for (let q = 0; q < 50 && blow === null; q++) if (!(burgersEnergy(stepBurgers(ex)) < 1)) blow = q + 1;
  assert.ok(blow !== null && blow < 20, `explicit blow-up at step ${blow}`);
  const ok = createBurgers(BURGERS_PRESETS['stiff-if'].params);
  while (ok.t < 1 - 1e-9) stepBurgers(ok);
  const n = ok.n;
  const err = maxAbsDiff(burgersField(ok, new Float64Array(n)), burgersExact(grid(n), ok.t, ok.nu, new Float64Array(n)));
  assert.ok(err < 1e-8, `IF error at t = 1: ${err}`);
  // the switch is live: the same state with the integrating factor turned back on is fine
  const tog = createBurgers(BURGERS_PRESETS['stiff-explicit'].params);
  stepBurgers(tog);
  tog.integratingFactor = true;
  for (let q = 0; q < 50; q++) stepBurgers(tog);
  assert.ok(burgersEnergy(tog) < 0.25, 'toggled back to the integrating factor');
});

test('Burgers presets: the fixed cases stay bounded, the broken ones fail, step returns the state', () => {
  for (const p of Object.values(BURGERS_PRESETS)) {
    const s = createBurgers(p.params);
    assert.equal(stepBurgers(s), s);
    for (let q = 0; q < 60; q++) stepBurgers(s);
    const ok = Number.isFinite(burgersEnergy(s)) && burgersEnergy(s) < 1;
    if (p.id === 'stiff-explicit' || p.id === 'cfl-above') assert.ok(!ok, `${p.id} should have blown up`);
    else assert.ok(ok, p.id);
  }
  // pile-up and aliased are marked as the broken half of their pairs
  for (const id of ['pileup', 'aliased', 'stiff-explicit', 'cfl-above']) assert.equal(BURGERS_PRESETS[id].broken, true, id);
  // suggested step: cfl dx / max|u|, capped at dtMax for a quiescent field
  const z = createBurgers({ n: 64, ic: () => 0, dt: 0.01 });
  assert.ok(Math.abs(burgersSuggestDt(z) - 0.1) < 1e-15, 'capped at 10 dt');
  const u = createBurgers({ n: 64, dt: 0.01 });
  assert.ok(Math.abs(burgersSuggestDt(u, 0.5) - (0.5 * TAU) / 64) < 1e-15);
});

// ---------------------------------------------------------------------------
// 2-D turbulence

test('2-D: a single Fourier mode is a steady Euler flow that decays at exactly exp(-2 nu k^2 t) in energy', () => {
  const nu = 0.01;
  const s = createTurb2D({ n: 32, nu, ic: 'mode', mode: [3, 2], dt: 0.05 });
  const E0 = turbEnergy(s);
  for (let q = 0; q < 100; q++) stepTurb2D(s);
  assert.ok(Math.abs(turbEnergy(s) / E0 / Math.exp(-2 * nu * 13 * s.t) - 1) < 1e-12);
  // with hyperviscosity: exp(-2 (nu k^2 + nuH k^(2p)) t)
  const h = createTurb2D({ n: 32, nu: 0, nuH: 1e-6, p: 2, ic: 'mode', mode: [4, 4], dt: 0.05 });
  const H0 = turbEnergy(h);
  for (let q = 0; q < 40; q++) stepTurb2D(h);
  assert.ok(Math.abs(turbEnergy(h) / H0 / Math.exp(-2 * 1e-6 * 32 ** 2 * h.t) - 1) < 1e-12);
  // and the dissipation rate diagnostic equals -dE/dt for it, with hyperviscosity too
  assert.ok(Math.abs(turbDissipation(s) / (2 * nu * 13 * turbEnergy(s)) - 1) < 1e-12);
  assert.ok(Math.abs(turbDissipation(h) / (2 * 1e-6 * 32 ** 2 * turbEnergy(h)) - 1) < 1e-12);
  // explicit dissipation (integratingFactor: false) follows RK4's polynomial instead:
  // energy x R(-z)^2 per step, z = nu k^2 dt = 3.25 > 2.79, so the mode GROWS
  const ifs = createTurb2D({ n: 32, nu: 1, ic: 'mode', mode: [3, 2], dt: 0.25 });
  const exs = createTurb2D({ n: 32, nu: 1, ic: 'mode', mode: [3, 2], dt: 0.25, integratingFactor: false });
  const e0 = turbEnergy(ifs);
  assert.equal(stepTurb2D(ifs), ifs);
  stepTurb2D(exs);
  assert.ok(Math.abs(turbEnergy(ifs) / e0 / Math.exp(-2 * 3.25) - 1) < 1e-12);
  assert.ok(Math.abs(turbEnergy(exs) / e0 / rk4(-3.25)[0] ** 2 - 1) < 1e-12, `explicit ${turbEnergy(exs) / e0} vs R^2 ${rk4(-3.25)[0] ** 2}`);
  assert.ok(turbEnergy(exs) > e0, 'the stiff mode grows');
});

test('2-D advection has the right sign: one tiny step reproduces the analytic tendency -u . grad omega', () => {
  // omega0 = sum A cos(k . x + phi) over a few low modes, so the product u . grad omega
  // (|k| <= 6) is exactly representable on 32^2 with the 2/3 rule (kmax = 10). With
  // lap psi = -omega, u = psi_y, v = -psi_x everything is known in closed form.
  const modes = [
    [1, 2, 1, 0.3],
    [3, 1, 0.8, 1.1],
    [2, -3, 0.6, -0.4],
    [0, 1, 0.5, 0.2],
  ];
  const n = 32;
  const field = (x, y) => {
    let w = 0;
    let u = 0;
    let v = 0;
    let wx = 0;
    let wy = 0;
    for (const [kx, ky, A, ph] of modes) {
      const th = kx * x + ky * y + ph;
      const k2 = kx * kx + ky * ky;
      w += A * Math.cos(th);
      u += (-A * ky * Math.sin(th)) / k2;
      v += (A * kx * Math.sin(th)) / k2;
      wx += -A * kx * Math.sin(th);
      wy += -A * ky * Math.sin(th);
    }
    return { w, rhs: -(u * wx + v * wy) };
  };
  const s = createTurb2D({ n, nu: 0, ic: (x, y) => field(x, y).w, dt: 1e-6 });
  const w0 = turbVorticity(s, new Float64Array(n * n));
  stepTurb2D(s);
  const w1 = turbVorticity(s, new Float64Array(n * n));
  let err = 0;
  let scale = 0;
  for (let j = 0; j < n; j++)
    for (let i = 0; i < n; i++) {
      const q = i + j * n;
      const { rhs } = field(i * s.dx, j * s.dx);
      err = Math.max(err, Math.abs((w1[q] - w0[q]) / s.dt - rhs));
      scale = Math.max(scale, Math.abs(rhs));
    }
  assert.ok(err < 1e-4 * scale, `d omega/dt vs -u . grad omega: ${err} of ${scale} (a sign flip gives 2)`);
});

test('2-D vortex pair turns counter-clockwise at the point-vortex rate Gamma/(pi b^2) minus the periodic-box correction Gamma/L^2', () => {
  // On a periodic box with zero mean vorticity each vortex sits in a uniform background
  // -Gamma/L^2, which slows the pair's rotation by Gamma/L^2 (here 1.389 - 0.159 rad per unit time).
  const G = 2 * Math.PI;
  const b = 1.2;
  const s = createTurb2D({ n: 64, nu: 0, ic: 'merger', radius: 0.3, separation: b, circulation: G, dt: 0.0125 });
  while (s.t < 0.5 - 1e-9) stepTurb2D(s);
  // orientation of the cores (vorticity above 30 % of the peak) from their second moments
  const w = turbVorticity(s, new Float64Array(64 * 64));
  let mx = 0;
  for (const v of w) mx = Math.max(mx, v);
  let ixx = 0;
  let iyy = 0;
  let ixy = 0;
  for (let j = 0; j < 64; j++)
    for (let i = 0; i < 64; i++) {
      const c = w[i + j * 64] - 0.3 * mx;
      if (c <= 0) continue;
      const x = i * s.dx - Math.PI;
      const y = j * s.dx - Math.PI;
      ixx += c * x * x;
      iyy += c * y * y;
      ixy += c * x * y;
    }
  const theta = 0.5 * Math.atan2(2 * ixy, ixx - iyy);
  const expect = (G / (Math.PI * b * b) - G / (TAU * TAU)) * s.t;
  assert.ok(theta > 0, `positive vorticity must turn counter-clockwise, got ${theta}`);
  assert.ok(Math.abs(theta / expect - 1) < 0.05, `angle ${theta} vs point-vortex ${expect}`);
});

test('2-D, nu = 0, 2/3 rule: energy and enstrophy conserved to small drift; without it the run blows up (Phillips)', () => {
  const run = (dealias, dt, T) => {
    const s = createTurb2D({ n: 64, nu: 0, ic: 'random', kPeak: 6, energy: 0.5, seed: 2, dealias, dt });
    const E0 = turbEnergy(s);
    const Z0 = turbEnstrophy(s);
    while (s.t < T - 1e-9) {
      stepTurb2D(s);
      if (!(turbEnergy(s) < 2 * E0)) return { blow: s.t };
    }
    return { dE: Math.abs(turbEnergy(s) / E0 - 1), dZ: Math.abs(turbEnstrophy(s) / Z0 - 1), cfl: s.cfl };
  };
  const a = run(true, 0.01, 1);
  assert.ok(a.dE < 1e-6 && a.dZ < 1e-5, `drift E ${a.dE}, Z ${a.dZ} (cfl ${a.cfl})`);
  const b = run(true, 0.005, 1);
  assert.ok(b.dE < a.dE / 16 && b.dZ < a.dZ / 16, 'drift falls at least as dt^4');
  const c = run(false, 0.01, 1.5);
  assert.ok(c.blow !== undefined && c.blow < 1.2, `aliased run should blow up, got ${JSON.stringify(c)}`);
});

test('2-D diagnostics agree with the grid fields; vorticity is dv/dx - du/dy; the initial spectrum peaks at kPeak', () => {
  const n = 64;
  const s = createTurb2D({ n, ic: 'random', kPeak: 8, energy: 0.7, seed: 4 });
  assert.ok(Math.abs(turbEnergy(s) - 0.7) < 1e-12);
  const sp = turbSpectrum(s, new Float64Array(turbShells(s)));
  assert.ok(Math.abs(sp.reduce((a, b) => a + b, 0) / turbEnergy(s) - 1) < 1e-12);
  let pk = 1;
  for (let k = 1; k < sp.length; k++) if (sp[k] > sp[pk]) pk = k;
  assert.ok(Math.abs(pk - 8) <= 1, `spectrum peak at ${pk}`);
  const u = new Float64Array(n * n);
  const v = new Float64Array(n * n);
  const w = new Float64Array(n * n);
  turbVelocity(s, u, v);
  turbVorticity(s, w);
  let e = 0;
  let z = 0;
  for (let q = 0; q < n * n; q++) {
    e += (u[q] * u[q] + v[q] * v[q]) / 2;
    z += (w[q] * w[q]) / 2;
  }
  assert.ok(Math.abs(e / (n * n) / turbEnergy(s) - 1) < 1e-12);
  assert.ok(Math.abs(z / (n * n) / turbEnstrophy(s) - 1) < 1e-12);
  // omega = dv/dx - du/dy and du/dx + dv/dy = 0, by spectral derivatives on rows and columns
  const row = new Float64Array(n);
  const d = new Float64Array(n);
  const dvdx = new Float64Array(n * n);
  const dudy = new Float64Array(n * n);
  const div = new Float64Array(n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) row[i] = v[i + j * n];
    spectralDerivative(row, d);
    for (let i = 0; i < n; i++) dvdx[i + j * n] = d[i];
    for (let i = 0; i < n; i++) row[i] = u[i + j * n];
    spectralDerivative(row, d);
    for (let i = 0; i < n; i++) div[i + j * n] = d[i];
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) row[j] = u[i + j * n];
    spectralDerivative(row, d);
    for (let j = 0; j < n; j++) dudy[i + j * n] = d[j];
    for (let j = 0; j < n; j++) row[j] = v[i + j * n];
    spectralDerivative(row, d);
    for (let j = 0; j < n; j++) div[i + j * n] += d[j];
  }
  let wmax = 0;
  let err = 0;
  let dmax = 0;
  for (let q = 0; q < n * n; q++) {
    wmax = Math.max(wmax, Math.abs(w[q]));
    err = Math.max(err, Math.abs(dvdx[q] - dudy[q] - w[q]));
    dmax = Math.max(dmax, Math.abs(div[q]));
  }
  assert.ok(err < 1e-12 * wmax, `vorticity sign/convention ${err}`);
  assert.ok(dmax < 1e-12 * wmax, `divergence ${dmax}`);
});

test('2-D vortex pair: merges above the critical core size, co-rotates below it', () => {
  const count = (o) => {
    const n = 64;
    const s = createTurb2D({ n, ic: 'merger', dt: 0.02, ...o });
    while (s.t < 10 - 1e-9) stepTurb2D(s);
    const w = turbVorticity(s, new Float64Array(n * n));
    let mx = 0;
    for (const x of w) mx = Math.max(mx, x);
    let peaks = 0;
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const c = w[i + j * n];
        if (c < 0.4 * mx) continue;
        let top = true;
        for (let dj = -2; dj <= 2 && top; dj++)
          for (let di = -2; di <= 2; di++) if ((di || dj) && w[((i + di + n) % n) + ((j + dj + n) % n) * n] > c) top = false;
        if (top) peaks++;
      }
    return peaks;
  };
  assert.equal(count({ nu: 5e-4, radius: 0.3, separation: 1.2 }), 1, 'a/b = 0.25 merges');
  assert.equal(count({ nu: 2e-4, radius: 0.2, separation: 1.5 }), 2, 'a/b = 0.13 does not');
});

test('2-D presets: phone-sized unless marked heavy, and every one keeps the CFL number <= 0.5', () => {
  // the documented advice is cfl <= 0.5 (limit ~0.68). 64^2 presets run 120 steps here
  // (their whole runs, t = 10-40, peak at 0.458, measured offline); heavy 128^2 ones 3 steps.
  for (const p of Object.values(TURB2D_PRESETS)) {
    assert.equal(p.params.n, p.heavy ? 128 : 64, p.id);
    const s = createTurb2D(p.params);
    const steps = p.heavy ? 3 : p.broken ? 50 : 120;
    let mc = 0;
    for (let q = 0; q < steps; q++) mc = Math.max(mc, stepTurb2D(s).cfl);
    assert.ok(Number.isFinite(turbEnergy(s)) && mc <= 0.5, `${p.id}: max cfl ${mc}`);
  }
  // suggested step: from s.umax after a step (no extra FFT), capped at 10 dt when quiescent
  const s = createTurb2D(TURB2D_PRESETS.decay.params);
  stepTurb2D(s);
  assert.equal(turbSuggestDt(s, 0.5), (0.5 * s.dx) / s.umax);
  const z = createTurb2D({ n: 32, ic: () => 0, dt: 0.01 });
  assert.ok(Math.abs(turbSuggestDt(z) - 0.1) < 1e-15);
});

test('constructor defaults are stable on their own (a widget may call create*() bare)', () => {
  const b = createBurgers();
  for (let i = 0; i < 200; i++) stepBurgers(b);
  assert.ok(Number.isFinite(burgersEnergy(b)) && burgersEnergy(b) < 0.3, 'Burgers default');
  const t = createTurb2D();
  for (let i = 0; i < 20; i++) stepTurb2D(t);
  assert.ok(Number.isFinite(turbEnergy(t)) && t.cfl < 0.8, `2-D default cfl ${t.cfl}`);
  // 22 shells at nu = 1e-7 put tau_eta near 3e-4, so the default dt must be a few 1e-5.
  // A default of 2e-4 survives the spin-up but diverges at t = 3.7 when the first burst
  // reaches the dissipative shells, so run past that.
  const s = createSabra();
  const n = Math.round(4.5 / s.dt);
  for (let i = 0; i < n; i++) stepSabra(s);
  assert.ok(Number.isFinite(sabraEnergy(s)) && sabraEnergy(s) < 10, `Sabra default dt ${s.dt}`);
  for (const p of Object.values(SABRA_PRESETS)) {
    const q = createSabra(p.params);
    for (let i = 0; i < 2000; i++) stepSabra(q);
    assert.ok(Number.isFinite(sabraEnergy(q)), p.id);
  }
});

// ---------------------------------------------------------------------------
// Sabra shell model

test('Sabra, inviscid and unforced: energy conserved to 1e-8, helicity-like invariant to 1e-6', () => {
  const s = createSabra(SABRA_PRESETS.inviscid.params);
  const E0 = sabraEnergy(s);
  const H0 = sabraHelicity(s);
  let hs = 0;
  for (let n = 0; n < s.S; n++) hs += 0.5 * 2 ** n * (s.uRe[n] ** 2 + s.uIm[n] ** 2);
  let dE = 0;
  let dH = 0;
  for (let q = 0; q < 10000; q++) {
    stepSabra(s);
    dE = Math.max(dE, Math.abs(sabraEnergy(s) / E0 - 1));
    dH = Math.max(dH, Math.abs(sabraHelicity(s) - H0) / hs);
  }
  assert.ok(dE < 1e-8, `energy drift ${dE}`);
  assert.ok(dH < 1e-6, `helicity drift ${dH}`); // weighted by 2^n, so the top shells' RK4 error shows more
  // and energy really moved between shells
  assert.ok(Math.abs(s.uRe[0] ** 2 + s.uIm[0] ** 2 - 2 * E0) > 1e-3);
});

test('Sabra energy flux formula equals minus d/dt of the energy in shells 0..n', () => {
  const s = createSabra({ shells: 12, nu: 0, forcing: [], seed: 5, amp: 1 });
  const flux = sabraFlux(s, new Float64Array(12));
  const before = Array.from({ length: 12 }, (_, n) => 0.5 * (s.uRe[n] ** 2 + s.uIm[n] ** 2));
  const dt = 1e-7;
  stepSabra(s, dt);
  let cum = 0;
  for (let n = 0; n < 12; n++) {
    cum += (0.5 * (s.uRe[n] ** 2 + s.uIm[n] ** 2) - before[n]) / dt;
    assert.ok(Math.abs(-cum - flux[n]) < 1e-5, `shell ${n}: ${-cum} vs ${flux[n]}`);
  }
});

test('Sabra integrating factor: a lone shell decays exactly at exp(-nu k^2 t) at nu k^2 dt = 110', () => {
  const s = createSabra({ shells: 22, nu: 1e-7, forcing: [], dt: 1e-3, amp: 0 });
  s.uRe[20] = 1e-3; // no other shell is excited, so every triad vanishes
  for (let q = 0; q < 3; q++) stepSabra(s);
  const k = s.k[20];
  assert.ok(Math.abs(s.uRe[20] / 1e-3 / Math.exp(-1e-7 * k * k * 3e-3) - 1) < 1e-12);
  // explicitly (integratingFactor: false) a lone shell is multiplied by RK4's R(-z) per step:
  // harmless at z = 0.27 (shell 17), explosive at z = 110 (shell 20: R = 5.9e6)
  for (const [n, z] of [
    [17, 1e-7 * 4 ** 17 * 1e-3],
    [20, 1e-7 * 4 ** 20 * 1e-3],
  ]) {
    const e = createSabra({ shells: 22, nu: 1e-7, forcing: [], dt: 1e-3, amp: 0, integratingFactor: false });
    e.uRe[n] = 1e-3;
    assert.equal(stepSabra(e), e);
    assert.ok(Math.abs(e.uRe[n] / 1e-3 / rk4(-z)[0] - 1) < 1e-12, `shell ${n}: ${e.uRe[n] / 1e-3} vs R(-${z}) = ${rk4(-z)[0]}`);
  }
});

test('Sabra stiff-explicit preset blows up where the integrating factor is fine; stats can be refilled in place', () => {
  // 22 shells, nu = 1e-7, dt = 3e-5: nu k_21^2 dt = 13 and nu k_20^2 dt = 3.3, both beyond 2.79
  const e = createSabra(SABRA_PRESETS['stiff-explicit'].params);
  const f = createSabra(SABRA_PRESETS.k41.params);
  let blow = null;
  while (e.t < 2 && blow === null) if (!(sabraEnergy(stepSabra(e)) < 1e6)) blow = e.t;
  while (f.t < 2) stepSabra(f);
  assert.ok(blow !== null && blow < 2, `explicit run blew up at t = ${blow}`);
  assert.ok(Number.isFinite(sabraEnergy(f)) && sabraEnergy(f) < 10, 'the IF run at the same dt is fine');
  assert.equal(SABRA_PRESETS['stiff-explicit'].broken, true);
  // sabraStats(s, range, out) refills a previous result: same object, same numbers
  for (let q = 0; q < 2000; q++) {
    stepSabra(f);
    sabraAccumulate(f);
  }
  const a = sabraStats(f);
  const zeta3 = a.zeta[2];
  const E5 = a.E[5];
  for (let q = 0; q < 10; q++) sabraAccumulate(f);
  const fresh = sabraStats(f);
  const b = sabraStats(f, null, a);
  assert.equal(b, a);
  assert.ok(a.zeta[2] !== zeta3 || a.E[5] !== E5, 'refilled');
  assert.deepEqual(Array.from(b.E), Array.from(fresh.E));
  assert.deepEqual(b.zeta, fresh.zeta);
  assert.deepEqual(b.zetaFlux, fresh.zetaFlux);
  assert.deepEqual(b.range, fresh.range);
  // suggested step capped at 10 dt for a quiescent field
  assert.ok(Math.abs(sabraSuggestDt(createSabra({ amp: 0, forcing: [], dt: 1e-4 })) - 1e-3) < 1e-18);
});

test('Sabra forced cascade: zeta_3 ~ 1, constant positive flux = injection, intermittent exponents', () => {
  const s = createSabra(SABRA_PRESETS.short.params);
  while (s.t < 10) stepSabra(s);
  sabraResetStats(s);
  while (s.t < 160) {
    stepSabra(s);
    if (s.steps % 5 === 0) sabraAccumulate(s);
  }
  const st = sabraStats(s);
  const [n1, n2] = st.range;
  assert.ok(n2 - n1 >= 4, `inertial range ${st.range}`);
  assert.ok(Math.abs(st.zeta[2] - 1) < 0.1, `zeta_3 = ${st.zeta[2]}`);
  assert.ok(Math.abs(st.zetaFlux[2] - 1) < 0.1, `flux-based zeta_3 = ${st.zetaFlux[2]}`);
  for (let n = n1; n <= n2; n++) {
    assert.ok(st.flux[n] > 0, 'flux to small scales');
    assert.ok(Math.abs(st.flux[n] / st.eps - 1) < 0.1, `flux ${st.flux[n]} vs injection ${st.eps} at shell ${n}`);
  }
  // K41 would give zeta_p = p/3; the measured ones bend away (intermittency):
  // zeta_2 a little above 2/3 (spectrum slightly steeper than -5/3), zeta_6 well below 2
  assert.ok(st.zeta[1] > 0.68 && st.zeta[1] < 0.8, `zeta_2 = ${st.zeta[1]}`);
  assert.ok(st.zeta[5] < 1.9, `zeta_6 = ${st.zeta[5]}`);
  for (let p = 1; p < 6; p++) assert.ok(st.zeta[p] > st.zeta[p - 1], 'zeta_p increasing');
});

// ---------------------------------------------------------------------------
// Scales and cost

test('Kolmogorov scales: eta v / nu = 1; L/eta = Re^(3/4) when eps = U^3/L', () => {
  const k = kolmogorovScales(1e-6, 1);
  assert.ok(Math.abs(k.eta - 10 ** -4.5) < 1e-15);
  assert.ok(Math.abs((k.eta * k.v) / 1e-6 - 1) < 1e-12);
  assert.ok(Math.abs(k.eta / k.v / k.tau - 1) < 1e-12);
  for (const f of EXAMPLE_FLOWS) {
    const s = flowScales(f);
    assert.ok(Math.abs(s.LoverEta / s.Re ** 0.75 - 1) < 1e-12, f.id);
    assert.ok(Math.abs(s.ToverTau / s.Re ** 0.5 - 1) < 1e-12, f.id);
  }
});

test('DNS cost: points ~ Re^(9/4), steps ~ Re^(3/4), work ~ Re^3', () => {
  const nus = [1e-2, 1e-4, 1e-6, 1e-8];
  const rows = nus.map((nu) => dnsCost({ L: 1, U: 1, nu }));
  const slope = (key) => Math.log(rows[3][key] / rows[0][key]) / Math.log(rows[3].Re / rows[0].Re);
  assert.ok(Math.abs(slope('perSide') - 0.75) < 1e-9);
  assert.ok(Math.abs(slope('points') - 2.25) < 1e-9);
  assert.ok(Math.abs(slope('steps') - 0.75) < 1e-9);
  assert.ok(Math.abs(slope('flops') - 3) < 1e-9);
  // ten times the Reynolds number costs a thousand times more
  const a = dnsCost({ L: 1, U: 1, nu: 1e-5 });
  const b = dnsCost({ L: 1, U: 1, nu: 1e-6 });
  assert.ok(Math.abs(b.flops / a.flops - 1000) < 1e-6);
});

// ---------------------------------------------------------------------------
// Pope's model spectrum

test('Pope spectrum with the documented constants integrates to k (2 %) and eps (5 %) at high Re', () => {
  for (const p of [
    { k: 1, eps: 1, nu: 1e-6 },
    { k: 2.5, eps: 0.7, nu: 1e-6 },
    { k: 1, eps: 1, nu: 1e-8 },
  ]) {
    const I = popeIntegrals({ ...p, ...POPE_CONSTANTS });
    assert.ok(Math.abs(I.tke / p.k - 1) < 0.02, `tke ${I.tke} vs ${p.k}`);
    assert.ok(Math.abs(I.dissipation / p.eps - 1) < 0.05, `eps ${I.dissipation} vs ${p.eps}`);
  }
  // inertial range: E = C eps^(2/3) kappa^(-5/3) between L and eta
  const p = { k: 1, eps: 1, nu: 1e-8 };
  const L = 1;
  const eta = Math.pow(p.nu ** 3, 0.25);
  const kap = 1 / Math.sqrt(L * eta);
  assert.ok(Math.abs(popeSpectrum(kap, p) / (1.5 * kap ** (-5 / 3)) - 1) < 0.02);
});

test('Pope constants depend on Re: solved c_L, c_eta make the integrals exact and tend to 6.78, 0.40', () => {
  const lo = popeCoefficients(1e3);
  const I = popeIntegrals({ k: 1, eps: 1, nu: 1e-3, cL: lo.cL, cEta: lo.cEta });
  assert.ok(Math.abs(I.tke - 1) < 1e-5 && Math.abs(I.dissipation - 1) < 1e-5);
  // with the high-Re constants at Re_L = 1000 (R_lambda ~ 80) the k integral is 12 % low
  const J = popeIntegrals({ k: 1, eps: 1, nu: 1e-3 });
  assert.ok(J.tke < 0.9);
  const hi = popeCoefficients(1e8);
  assert.ok(Math.abs(hi.cL - 6.78) < 0.02, `c_L ${hi.cL}`);
  assert.ok(Math.abs(hi.cEta - 0.4) < 0.005, `c_eta ${hi.cEta}`);
});

test('LES intuition: resolving 80 % of the energy resolves almost none of the dissipation', () => {
  const p = { k: 1, eps: 1, nu: 1e-5 }; // Re_L = 1e5, R_lambda ~ 800
  const kc = popeCutoffFor(0.8, p);
  const f = popeResolved(kc, p);
  assert.ok(Math.abs(f.tke - 0.8) < 1e-6);
  assert.ok(f.dissipation < 0.01, `dissipation resolved ${f.dissipation}`);
  // in the inertial range the unresolved fraction is (3/2) C (kc L)^(-2/3)
  // (here 0.200 against 0.210: the dissipation range trims the tail by 5 %)
  assert.ok(Math.abs((1 - f.tke) / (2.25 * kc ** (-2 / 3)) - 1) < 0.1);
});
