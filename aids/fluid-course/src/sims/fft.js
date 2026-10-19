// Fast Fourier transforms for the spectral kernels (spectral.js, turbulence.js).
//
// What it does
//   An in-place, iterative, radix-2 decimation-in-time complex FFT on a pair of
//   Float64Arrays (re, im), its inverse, a 2-D transform over rows and columns,
//   a naive O(N^2) DFT as a reference, helpers for real data (two real signals
//   for the price of one complex transform) and wavenumber arrays.
//
// Conventions
//   Forward:  X_k = sum_{j=0}^{N-1} x_j exp(-2 pi i j k / N)      (no scaling)
//   Inverse:  x_j = (1/N) sum_{k=0}^{N-1} X_k exp(+2 pi i j k / N)
//   So ifft(fft(x)) = x and Parseval reads sum |x_j|^2 = (1/N) sum |X_k|^2.
//   Index k of the spectrum holds wavenumber k for k < N/2 and k - N for
//   k > N/2; index N/2 is the Nyquist mode (see wavenumbers()).
//   2-D arrays are row-major with index i + j * nx, j = 0 the bottom row, the
//   same layout as the cell-centred fields of the course. fft2 transforms each
//   row (along x, length nx) and then each column (along y, length ny).
//   Sizes must be powers of two.
//
// Implementation notes
//   Twiddle factors and the bit-reversal permutation are computed once per
//   size and cached (fftPlan). The transform is: bit-reverse, then log2 N
//   butterfly stages of span 1, 2, 4, ... (Cooley & Tukey 1965; Press et al.,
//   Numerical Recipes, 3rd ed. 2007, sect. 12.2). fftSteps() runs the same
//   stage function and yields one trace event per stage, so a figure can show
//   the order of work without a second implementation. fft() fuses the first
//   two stages (twiddles 1 and -i) into one multiplication-free pass; the
//   result is bit-identical to fftSteps().
//   fft2 is the row-column method. The column pass is done as a multiple
//   (batched) FFT across all columns at once: each butterfly combines two
//   whole rows, so memory is walked contiguously (Van Loan, Computational
//   Frameworks for the FFT, 1992, ch. 3, the sections on the multiple DFT
//   and the multidimensional FFT). It is still a sequence of 1-D transforms,
//   not the "vector-radix" FFT, which decimates both indices at once with
//   2 x 2 butterflies (Rivard 1977, IEEE Trans. ASSP 25, 250).
//   For spectra truncated by the 2/3 rule, fft2 can skip the rows and columns
//   that are known to be zero or unwanted (the `band` argument; about 13 %
//   faster in the 2-D solver). Nothing allocates after the first call at a
//   given size.
//
// References
//   J. W. Cooley & J. W. Tukey (1965), Math. Comp. 19, 297-301.
//   W. H. Press, S. A. Teukolsky, W. T. Vetterling & B. P. Flannery (2007),
//     Numerical Recipes, 3rd ed., sects. 12.2 (FFT) and 12.3 (real data).
//   C. Van Loan (1992), Computational Frameworks for the Fast Fourier Transform, SIAM.
//   G. E. Rivard (1977), IEEE Trans. Acoust. Speech Signal Process. 25, 250-252
//     (the vector-radix 2-D FFT, named here only to say this is not it).

export const FFT_INFO = {
  id: 'radix2-dit',
  name: 'Radix-2 Cooley-Tukey FFT (decimation in time)',
  tex: 'X_k = \\sum_{j=0}^{N-1} x_j\\, e^{-2\\pi i jk/N}',
  inverseTex: 'x_j = \\frac{1}{N}\\sum_{k=0}^{N-1} X_k\\, e^{2\\pi i jk/N}',
  butterflyTex: "\\begin{aligned} a' &= a + w^k b \\\\ b' &= a - w^k b \\end{aligned}, \\qquad w = e^{-2\\pi i/\\text{size}}",
  cost: 'N/2 log2 N butterflies (one complex multiply and two adds each), against N^2 multiply-adds for the direct sum',
  costTex: '\\tfrac{N}{2}\\log_2 N \\text{ butterflies vs. } N^2',
};

const plans = new Map();

// The cached plan for size n: bit-reversal table and twiddles
// w_t = exp(-2 pi i t / n), t = 0 .. n/2 - 1.
export function fftPlan(n) {
  let p = plans.get(n);
  if (p) return p;
  if (!(n >= 1) || (n & (n - 1)) !== 0) throw new Error(`fft: size ${n} is not a power of two`);
  let bits = 0;
  while (1 << bits < n) bits++;
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    let x = i;
    for (let b = 0; b < bits; b++) {
      r = (r << 1) | (x & 1);
      x >>= 1;
    }
    rev[i] = r;
  }
  const half = Math.max(1, n >> 1);
  const cos = new Float64Array(half);
  const sin = new Float64Array(half);
  for (let t = 0; t < half; t++) {
    const a = (-2 * Math.PI * t) / n;
    cos[t] = Math.cos(a);
    sin[t] = Math.sin(a);
  }
  // Exact values at the quarter turn, so the fused radix-4 first pass and the
  // plain stages agree to the last bit (Math.cos(-pi/2) is 6e-17, not 0).
  if (n % 4 === 0) {
    cos[n / 4] = 0;
    sin[n / 4] = -1;
  }
  // Scratch for the real-data helpers (two signals in one transform).
  p = { n, bits, rev, cos, sin, sRe: new Float64Array(n), sIm: new Float64Array(n) };
  plans.set(n, p);
  return p;
}

// Bit-reversal permutation of n entries starting at off.
function bitReverse(re, im, off, plan) {
  const { n, rev } = plan;
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      const a = off + i;
      const b = off + j;
      let t = re[a];
      re[a] = re[b];
      re[b] = t;
      t = im[a];
      im[a] = im[b];
      im[b] = t;
    }
  }
}

// One butterfly stage: blocks of length `size`, pairs (a, a + size/2), twiddle
// w^(k n/size) for the k-th pair of a block. sign = +1 forward, -1 inverse.
function stage(re, im, off, plan, size, sign) {
  const { n, cos, sin } = plan;
  const h = size >> 1;
  const step = n / size;
  for (let k = 0; k < h; k++) {
    const wr = cos[k * step];
    const wi = sign * sin[k * step];
    for (let s = off + k; s < off + n; s += size) {
      const b = s + h;
      const xr = re[b] * wr - im[b] * wi;
      const xi = re[b] * wi + im[b] * wr;
      re[b] = re[s] - xr;
      im[b] = im[s] - xi;
      re[s] += xr;
      im[s] += xi;
    }
  }
}

// The first two stages (sizes 2 and 4) have twiddles 1 and -i (forward), so
// they are fused into one multiplication-free radix-4 pass. The result is
// bit-for-bit the same as running stage() for sizes 2 and 4.
function first4(re, im, off, n, sign) {
  for (let s = off; s < off + n; s += 4) {
    const b0r = re[s] + re[s + 1];
    const b0i = im[s] + im[s + 1];
    const b1r = re[s] - re[s + 1];
    const b1i = im[s] - im[s + 1];
    const b2r = re[s + 2] + re[s + 3];
    const b2i = im[s + 2] + im[s + 3];
    const b3r = re[s + 2] - re[s + 3];
    const b3i = im[s + 2] - im[s + 3];
    const xr = sign * b3i;
    const xi = -sign * b3r;
    re[s] = b0r + b2r;
    im[s] = b0i + b2i;
    re[s + 2] = b0r - b2r;
    im[s + 2] = b0i - b2i;
    re[s + 1] = b1r + xr;
    im[s + 1] = b1i + xi;
    re[s + 3] = b1r - xr;
    im[s + 3] = b1i - xi;
  }
}

function transform(re, im, off, plan, sign) {
  bitReverse(re, im, off, plan);
  let size = 2;
  if (plan.n >= 4) {
    first4(re, im, off, plan.n, sign);
    size = 8;
  }
  for (; size <= plan.n; size <<= 1) stage(re, im, off, plan, size, sign);
}

// In-place forward FFT of (re, im), length a power of two. With inverse = true
// it computes the inverse transform, including the 1/N.
export function fft(re, im, inverse = false) {
  const n = re.length;
  if (n <= 1) return;
  const plan = fftPlan(n);
  transform(re, im, 0, plan, inverse ? -1 : 1);
  if (inverse) {
    const s = 1 / n;
    for (let j = 0; j < n; j++) {
      re[j] *= s;
      im[j] *= s;
    }
  }
}

// In-place inverse FFT (scaled by 1/N), so ifft(fft(x)) = x.
export function ifft(re, im) {
  fft(re, im, true);
}

// The same transform as fft(), yielding one trace event per stage so a
// figure can animate the butterfly diagram. Events:
//   { t: 'enter', kind: 'fft', label, n }
//   { t: 'op', op: 'bit-reverse', swaps: [[i, j], ...] }
//   { t: 'op', op: 'stage', s, size, span, butterflies, twiddles }   after the stage ran
//   { t: 'leave', kind: 'fft' }
// Returns { re, im }. Drained, it equals fft(re, im, inverse) exactly.
export function* fftSteps(re, im, inverse = false) {
  const n = re.length;
  const plan = fftPlan(n);
  const sign = inverse ? -1 : 1;
  yield { t: 'enter', kind: 'fft', label: inverse ? 'inverse FFT' : 'FFT', n };
  const swaps = [];
  for (let i = 0; i < n; i++) if (plan.rev[i] > i) swaps.push([i, plan.rev[i]]);
  bitReverse(re, im, 0, plan);
  yield { t: 'op', op: 'bit-reverse', swaps };
  let s = 0;
  for (let size = 2; size <= n; size <<= 1) {
    stage(re, im, 0, plan, size, sign);
    yield { t: 'op', op: 'stage', s: s++, size, span: size >> 1, butterflies: n >> 1, twiddles: size >> 1 };
  }
  if (inverse) {
    for (let j = 0; j < n; j++) {
      re[j] /= n;
      im[j] /= n;
    }
  }
  yield { t: 'leave', kind: 'fft' };
  return { re, im };
}

// Column transforms of an nx-by-ny row-major array, all columns i in
// [lo, hi) at once.
function columns(re, im, nx, plan, sign, lo = 0, hi = nx) {
  const { n, rev, cos, sin } = plan;
  for (let j = 0; j < n; j++) {
    const r = rev[j];
    if (r > j) {
      const a = j * nx;
      const b = r * nx;
      for (let i = lo; i < hi; i++) {
        let t = re[a + i];
        re[a + i] = re[b + i];
        re[b + i] = t;
        t = im[a + i];
        im[a + i] = im[b + i];
        im[b + i] = t;
      }
    }
  }
  let size0 = 2;
  if (n >= 4) {
    for (let s = 0; s < n; s += 4) {
      const r0 = s * nx;
      const r1 = r0 + nx;
      const r2 = r1 + nx;
      const r3 = r2 + nx;
      for (let i = lo; i < hi; i++) {
        const b0r = re[r0 + i] + re[r1 + i];
        const b0i = im[r0 + i] + im[r1 + i];
        const b1r = re[r0 + i] - re[r1 + i];
        const b1i = im[r0 + i] - im[r1 + i];
        const b2r = re[r2 + i] + re[r3 + i];
        const b2i = im[r2 + i] + im[r3 + i];
        const b3r = re[r2 + i] - re[r3 + i];
        const b3i = im[r2 + i] - im[r3 + i];
        const xr = sign * b3i;
        const xi = -sign * b3r;
        re[r0 + i] = b0r + b2r;
        im[r0 + i] = b0i + b2i;
        re[r2 + i] = b0r - b2r;
        im[r2 + i] = b0i - b2i;
        re[r1 + i] = b1r + xr;
        im[r1 + i] = b1i + xi;
        re[r3 + i] = b1r - xr;
        im[r3 + i] = b1i - xi;
      }
    }
    size0 = 8;
  }
  for (let size = size0; size <= n; size <<= 1) {
    const h = size >> 1;
    const step = n / size;
    for (let k = 0; k < h; k++) {
      const wr = cos[k * step];
      const wi = sign * sin[k * step];
      for (let s = k; s < n; s += size) {
        const a = s * nx;
        const b = (s + h) * nx;
        if (k === 0) {
          for (let i = lo; i < hi; i++) {
            const xr = re[b + i];
            const xi = im[b + i];
            re[b + i] = re[a + i] - xr;
            im[b + i] = im[a + i] - xi;
            re[a + i] += xr;
            im[a + i] += xi;
          }
        } else {
          for (let i = lo; i < hi; i++) {
            const br = re[b + i];
            const bi = im[b + i];
            const xr = br * wr - bi * wi;
            const xi = br * wi + bi * wr;
            re[b + i] = re[a + i] - xr;
            im[b + i] = im[a + i] - xi;
            re[a + i] += xr;
            im[a + i] += xi;
          }
        }
      }
    }
  }
}

// In-place 2-D FFT of an nx-by-ny array (index i + j * nx): every row along x,
// then every column along y. inverse = true includes the 1/(nx ny).
// band > 0 prunes the work for spectra truncated by the 2/3 rule (used by
// turbulence.js): the inverse assumes the rows with |ky| > band are zero and
// skips them; the forward transforms only the columns with |kx| <= band and
// zeroes the rest. Bins with |kx|, |ky| <= band, and every grid value of an
// inverse, are exactly what the full transform gives.
export function fft2(re, im, nx, ny, inverse = false, band = 0) {
  const sign = inverse ? -1 : 1;
  const prune = band > 0 && 2 * band + 1 < Math.min(nx, ny);
  if (nx > 1) {
    const px = fftPlan(nx);
    for (let j = 0; j < ny; j++) {
      if (prune && inverse && j > band && j < ny - band) continue;
      transform(re, im, j * nx, px, sign);
    }
  }
  if (ny > 1) {
    const py = fftPlan(ny);
    if (prune && !inverse) {
      columns(re, im, nx, py, sign, 0, band + 1);
      columns(re, im, nx, py, sign, nx - band, nx);
      for (let j = 0; j < ny; j++) {
        const row = j * nx;
        for (let i = band + 1; i < nx - band; i++) {
          re[row + i] = 0;
          im[row + i] = 0;
        }
      }
    } else columns(re, im, nx, py, sign);
  }
  if (inverse) {
    const s = 1 / (nx * ny);
    const m = nx * ny;
    for (let q = 0; q < m; q++) {
      re[q] *= s;
      im[q] *= s;
    }
  }
}

// In-place inverse 2-D FFT, scaled by 1/(nx ny).
export function ifft2(re, im, nx, ny) {
  fft2(re, im, nx, ny, true);
}

// Naive O(N^2) discrete Fourier transform into (outRe, outIm): the definition
// the FFT must reproduce. For tests and for counting operations, not for use.
export function dft(re, im, outRe, outIm, inverse = false) {
  const n = re.length;
  const sign = inverse ? 1 : -1;
  for (let k = 0; k < n; k++) {
    let sr = 0;
    let si = 0;
    for (let j = 0; j < n; j++) {
      const a = (sign * 2 * Math.PI * ((j * k) % n)) / n;
      const c = Math.cos(a);
      const s = Math.sin(a);
      sr += re[j] * c - im[j] * s;
      si += re[j] * s + im[j] * c;
    }
    outRe[k] = inverse ? sr / n : sr;
    outIm[k] = inverse ? si / n : si;
  }
}

// Spectrum of one real signal x into (outRe, outIm), full length N.
export function fftReal(x, outRe, outIm) {
  const n = x.length;
  for (let j = 0; j < n; j++) {
    outRe[j] = x[j];
    outIm[j] = 0;
  }
  fft(outRe, outIm);
}

// Spectra of two real signals a, b with ONE complex FFT: transform z = a + i b,
// then A_k = (Z_k + conj Z_{-k}) / 2 and B_k = (Z_k - conj Z_{-k}) / (2i)
// (Numerical Recipes sect. 12.3). Outputs are full length N.
export function fftTwoReal(a, b, aRe, aIm, bRe, bIm) {
  const n = a.length;
  const p = fftPlan(n);
  const zr = p.sRe;
  const zi = p.sIm;
  for (let j = 0; j < n; j++) {
    zr[j] = a[j];
    zi[j] = b[j];
  }
  fft(zr, zi);
  for (let k = 0; k < n; k++) {
    const m = (n - k) % n;
    const cr = zr[m];
    const ci = -zi[m]; // conj Z_{-k}
    aRe[k] = 0.5 * (zr[k] + cr);
    aIm[k] = 0.5 * (zi[k] + ci);
    // (Z - conj Z_{-k}) / (2i) = -i (Z - conj Z_{-k}) / 2
    bRe[k] = 0.5 * (zi[k] - ci);
    bIm[k] = -0.5 * (zr[k] - cr);
  }
}

// Wavenumbers of the FFT bins for a periodic domain of length L:
// k_j = (2 pi / L) * (j for j < N/2, j - N for j > N/2). The Nyquist bin
// j = N/2 gets -N/2 (2 pi / L) by default; pass nyquist = 0 for the value used
// in odd derivatives (Trefethen 2000, ch. 3), where that mode must be zeroed.
export function wavenumbers(n, L = 2 * Math.PI, nyquist = null) {
  const out = new Float64Array(n);
  const s = (2 * Math.PI) / L;
  for (let j = 0; j < n; j++) out[j] = s * (j < n / 2 ? j : j - n);
  if (n % 2 === 0) out[n / 2] = nyquist === null ? -s * (n / 2) : nyquist;
  return out;
}

// Integer wavenumber held by FFT bin j of an N-point transform (Nyquist -> -N/2).
export const binWavenumber = (j, n) => (j < n / 2 ? j : j - n);

// FFT bin that holds integer wavenumber k (any integer; aliases wrap).
export const binOf = (k, n) => ((k % n) + n) % n;

// |X_k|^2 / N^2 for each bin: the power of each mode, normalised so that
// sum(out) = mean |x_j|^2 (Parseval).
export function powerSpectrum(re, im, out) {
  const n = re.length;
  const s = 1 / (n * n);
  for (let k = 0; k < n; k++) out[k] = (re[k] * re[k] + im[k] * im[k]) * s;
  return out;
}
