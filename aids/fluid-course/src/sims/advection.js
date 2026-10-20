// Linear advection u_t + a u_x = 0 on the periodic unit interval: a dozen
// classical schemes, the initial profiles the course uses, the exact solution,
// diagnostics, von Neumann amplification factors, modified-equation
// coefficients and a convergence study. Widgets animate exactly this code and
// tests/fluid-course/sims-advection.test.js checks it.
//
// Conventions
//   - 1-D periodic, cell-centred grid on [0, 1): n cells, Δx = 1/n, cell j has
//     centre x_j = (j + 1/2)Δx and covers [jΔx, (j + 1)Δx]. (The course's 2-D
//     convention i + j*nx with j = 0 at the bottom, and the MAC layout with u on
//     (nx+1)*ny vertical faces and v on nx*(ny+1) horizontal faces, do not arise
//     in this 1-D module.)
//   - u[j] is the cell average of u over cell j (finite-volume view, LeVeque
//     2002 ch. 4). createState(…, { sample: 'point' }) stores point values at the
//     centres instead; errors are then measured against point values.
//   - Nondimensional: the domain has length 1 and the speed a defaults to 1, so
//     one trip round the domain takes T = 1/|a|. The CFL (Courant) number is
//     ν = a Δt/Δx and carries the sign of a. step() takes ν, not Δt.
//   - Faces: f[i] is the face between cells i-1 and i (x = iΔx), i = 0..n-1,
//     with f[n] = f[0] by periodicity. Every scheme is written in conservation
//     form u_j ← u_j − (f_{j+1/2} − f_{j-1/2}), with f the numerical flux
//     already multiplied by Δt/Δx, so Σ u_j Δx is conserved to round-off.
//   - a < 0 by mirror symmetry: each upwind-biased flux is written once in the
//     "upwind frame" (cells up, upup = one further upstream, down) and
//     multiplied by sign(ν). For a > 0 at face j-1/2: up = j-1, upup = j-2,
//     down = j. For a < 0: up = j, upup = j+1, down = j-1. Symmetric schemes
//     (FTCS, Lax–Friedrichs, Lax–Wendroff, leapfrog) use their formula as is.
//   - State arrays are Float64Arrays allocated once in createState; step()
//     allocates nothing. Periodicity is applied by copying into a buffer with
//     three ghost cells on each side.
//
// Schemes (formulas written for a > 0, ν = aΔt/Δx)
//   upwind        f = ν u_{j-1}. Courant, Isaacson & Rees (1952); LeVeque (2002) ch. 4.
//   downwind      f = ν u_j. The wrong-side difference: unstable for every ν ≠ 0.
//   ftcs          f = ν (u_{j-1} + u_j)/2. Forward time, centred space: unstable
//                 for every ν ≠ 0 (|G|² = 1 + ν² sin²θ). Strikwerda (2004) ch. 1–2.
//   lxf           f = ν (u_{j-1} + u_j)/2 − (u_j − u_{j-1})/2. Lax (1954); LeVeque (2002) ch. 4.
//   lw            f = ν (u_{j-1} + u_j)/2 − ν² (u_j − u_{j-1})/2. Lax & Wendroff (1960);
//                 LeVeque (2002) ch. 6.
//   bw            f = ν u_{j-1} + ν(1 − ν)(u_{j-1} − u_{j-2})/2. The explicit second-order
//                 upwind scheme of Warming & Beam (1976); LeVeque (2002) ch. 6.
//   fromm         f = ν u_{j-1} + ν(1 − ν)(u_j − u_{j-2})/4: the average of the
//                 Lax–Wendroff and Beam–Warming fluxes. Fromm (1968).
//   leapfrog      u_j^{n+1} = u_j^{n-1} − ν (u_{j+1}^n − u_{j-1}^n), three time levels,
//                 started with one Lax–Wendroff step. Its second amplification root
//                 G ≈ −1 is the computational mode, a 2Δt odd–even oscillation in time.
//                 Options (simplifications made visible): start 'ftcs' or 'copy' (u¹ = u⁰,
//                 a careless start that excites the computational mode), and a
//                 Robert–Asselin filter γ (Robert 1966; Asselin 1972). Durran (2010) ch. 2.
//                 Changing ν, or stepping with another scheme in between, restarts it
//                 with a fresh two-level step.
//   limited       Flux-limited high-resolution method in LeVeque's wave-propagation
//                 form (LeVeque 2002 ch. 6, eqs. for the flux-limiter method):
//                   f_{j-1/2} = ν⁺ u_{j-1} + ν⁻ u_j + ½|ν|(1 − |ν|) φ(θ_{j-1/2}) W_{j-1/2},
//                   W_{j-1/2} = u_j − u_{j-1},  θ_{j-1/2} = W_{I-1/2}/W_{j-1/2},  I = j − sign(ν).
//                 φ = 0, 1, θ, (1 + θ)/2 give upwind, Lax–Wendroff, Beam–Warming and Fromm
//                 exactly (offered as limiters 'upwind', 'lw', 'bw', 'fromm'). The TVD
//                 limiters minmod, superbee (due to Roe; credited in Sweby 1984), van Leer (1974), MC (van Leer 1977)
//                 and van Albada (van Albada, van Leer & Roberts 1982) lie in Sweby's (1984)
//                 TVD region, so the method is TVD for |ν| ≤ 1 (Harten 1983).
//                 Deviation: van Albada's φ = (θ² + θ)/(θ² + 1) is negative for −1 < θ < 0;
//                 it is clipped to 0 for θ ≤ 0, as Sweby's TVD region requires.
//                 When W_{j-1/2} = 0 the TVD limiters give φW = 0 (φ is bounded); the four
//                 linear choices are evaluated as c₀W + c₁W_up without dividing. θ is
//                 clamped to ±1e100 (a subnormal W can make it overflow), and van Leer and
//                 van Albada are written in forms that stay finite at θ = ±∞.
//   weno5         Fifth-order WENO reconstruction of Jiang & Shu (1996): three quadratic
//                 (third-order) candidate reconstructions, smoothness indicators β_k, weights
//                 α_k = d_k/(ε + β_k)² with (d₀, d₁, d₂) = (1/10, 6/10, 3/10), ε = 1e-6,
//                 upwind-biased (stencil u_{j-2}..u_{j+2} for the face j+1/2 when a > 0).
//                 Time: the three-stage SSP Runge–Kutta of Shu & Osher (1988), see also
//                 Gottlieb, Shu & Tadmor (2001). Options: weights: 'linear' freezes ω_k = d_k
//                 (the fifth-order linear upwind scheme, which rings at jumps); rk: 1 or 2
//                 swaps in forward Euler or SSP-RK2, both linearly unstable with WENO5
//                 (Wang & Spiteri 2007). Measured here: with the default JS weights the
//                 nonlinear weights add enough dissipation that RK2 never visibly blows up
//                 and forward Euler takes thousands of steps to; with weights: 'linear'
//                 both blow up within a few periods (PRESETS['weno-euler']).
//
// Analysis
//   amplification(): von Neumann factor G(ν, θ) for u_j = e^{ijθ}, θ = kΔx
//   (Strikwerda 2004 ch. 2; LeVeque 2002 ch. 8). For weno5 it is the linearised
//   factor with the optimal weights d_k and the chosen RK polynomial.
//   modifiedEquation(): the leading terms of u_t + a u_x = D u_xx + E u_xxx
//   (Warming & Hyett 1974; LeVeque 2002 §8.6). For a linear scheme these equal
//   the Taylor coefficients of log G(θ)/Δt in powers of iθ; the tests check both.
//   exactAverages(): the reference for every error readout. Composite Gauss–
//   Legendre between the profile's jumps and kinks, plus the closed-form
//   integral of the Jiang–Shu half ellipse; within ~1e-13 for the built-in
//   profiles (tested to 1e-12 against an independent reference).
//   PRESETS: broken/fixed parameter pairs for figures and the rogues' gallery,
//   each with the diagnostics() field that separates them (tested).
//
// References
//   Asselin, R. (1972) Mon. Wea. Rev. 100, 487–490.
//   Courant, R., Friedrichs, K. & Lewy, H. (1928) Math. Ann. 100, 32–74.
//   Courant, R., Isaacson, E. & Rees, M. (1952) Comm. Pure Appl. Math. 5, 243–255.
//   Durran, D. R. (2010) Numerical Methods for Fluid Dynamics, 2nd ed., Springer.
//   Fromm, J. E. (1968) J. Comput. Phys. 3, 176–189.
//   Gottlieb, S., Shu, C.-W. & Tadmor, E. (2001) SIAM Review 43, 89–112.
//   Harten, A. (1983) J. Comput. Phys. 49, 357–393.
//   Henrick, A. K., Aslam, T. D. & Powers, J. M. (2005) J. Comput. Phys. 207, 542–567.
//   Jiang, G.-S. & Shu, C.-W. (1996) J. Comput. Phys. 126, 202–228.
//   Lax, P. D. (1954) Comm. Pure Appl. Math. 7, 159–193.
//   Lax, P. D. & Wendroff, B. (1960) Comm. Pure Appl. Math. 13, 217–237.
//   LeVeque, R. J. (2002) Finite Volume Methods for Hyperbolic Problems, CUP.
//   Robert, A. J. (1966) J. Meteor. Soc. Japan 44, 237–245.
//   Roe, P. L. (1986) Ann. Rev. Fluid Mech. 18, 337–365.
//   Shu, C.-W. & Osher, S. (1988) J. Comput. Phys. 77, 439–471.
//   Strikwerda, J. C. (2004) Finite Difference Schemes and PDEs, 2nd ed., SIAM.
//   Sweby, P. K. (1984) SIAM J. Numer. Anal. 21, 995–1011.
//   van Albada, G. D., van Leer, B. & Roberts, W. W. (1982) Astron. Astrophys. 108, 76–84.
//   van Leer, B. (1974) J. Comput. Phys. 14, 361–370; (1977) J. Comput. Phys. 23, 276–299.
//   Wang, R. & Spiteri, R. J. (2007) SIAM J. Numer. Anal. 45, 1871–1901.
//   Warming, R. F. & Beam, R. M. (1976) AIAA J. 14, 1241–1249.
//   Warming, R. F. & Hyett, B. J. (1974) J. Comput. Phys. 14, 159–179.

import { centres, totalVariation, norm1, norm2, normInf } from './util.js';

const NG = 3; // ghost cells on each side of the periodic copy
const NO_OPTS = Object.freeze({});
const TWO_PI = 2 * Math.PI;

// ---------------------------------------------------------------- limiters

// φ(θ) for the flux-limited method. `linear: [c0, c1]` marks φ = c0 + c1 θ,
// which the kernel evaluates as c0 W + c1 W_up (no division by W).
export const LIMITERS = {
  minmod: {
    id: 'minmod', name: 'minmod', tvd: true,
    description: 'The most cautious TVD limiter: the smaller of the two slopes, zero at an extremum. Smears the most.',
    phi: (t) => (t > 0 ? (t < 1 ? t : 1) : 0),
    tex: '\\phi(\\theta) = \\max\\left(0, \\min(1, \\theta)\\right)',
    cite: 'Roe (1986); LeVeque (2002) ch. 6',
  },
  superbee: {
    id: 'superbee', name: 'superbee', tvd: true,
    description: 'Runs along the upper edge of the TVD region: the sharpest jumps, but it squares off smooth peaks.',
    phi: (t) => Math.max(0, Math.min(1, 2 * t), Math.min(2, t)),
    tex: '\\phi(\\theta) = \\max\\left(0, \\min(1, 2\\theta), \\min(2, \\theta)\\right)',
    cite: 'due to Roe, credited in Sweby (1984); Roe (1986); LeVeque (2002) ch. 6',
  },
  vanleer: {
    id: 'vanleer', name: 'van Leer', tvd: true,
    description: 'A smooth limiter between minmod and superbee: the harmonic mean of the two slopes.',
    // (θ + |θ|)/(1 + |θ|) = 2θ/(1 + θ) for θ > 0, written so that θ = ∞ gives 2, not ∞/∞.
    phi: (t) => (t > 0 ? 2 / (1 + 1 / t) : 0),
    tex: '\\phi(\\theta) = \\frac{\\theta + |\\theta|}{1 + |\\theta|}',
    cite: 'van Leer (1974); LeVeque (2002) ch. 6',
  },
  mc: {
    id: 'mc', name: 'MC (monotonized central)', tvd: true,
    description: 'Takes the central (Fromm) slope unless it would create a new extremum.',
    phi: (t) => Math.max(0, Math.min((1 + t) / 2, 2, 2 * t)),
    tex: '\\phi(\\theta) = \\max\\left(0, \\min\\left(\\frac{1+\\theta}{2}, 2, 2\\theta\\right)\\right)',
    cite: 'van Leer (1977); LeVeque (2002) ch. 6',
  },
  vanalbada: {
    id: 'vanalbada', name: 'van Albada', tvd: true,
    description: 'A smooth rational limiter that tends to 1 for large θ; clipped to 0 for θ ≤ 0 here.',
    // For θ > 1 divide through by θ² so that θ² cannot overflow (θ = ∞ gives 1).
    phi: (t) => (t > 0 ? (t <= 1 ? (t * t + t) / (t * t + 1) : (1 + 1 / t) / (1 + 1 / (t * t))) : 0),
    tex: '\\phi(\\theta) = \\max\\left(0, \\frac{\\theta^2 + \\theta}{\\theta^2 + 1}\\right)',
    cite: 'van Albada, van Leer & Roberts (1982)',
  },
  upwind: {
    id: 'upwind', name: 'none (φ = 0): upwind', tvd: true, linear: [0, 0],
    description: 'No correction at all: the first-order upwind scheme.',
    phi: () => 0,
    tex: '\\phi(\\theta) = 0',
    cite: 'LeVeque (2002) ch. 6',
  },
  lw: {
    id: 'lw', name: 'φ = 1: Lax–Wendroff', tvd: false, linear: [1, 0],
    description: 'Full correction everywhere: the Lax–Wendroff scheme. Not TVD.',
    phi: () => 1,
    tex: '\\phi(\\theta) = 1',
    cite: 'LeVeque (2002) ch. 6',
  },
  bw: {
    id: 'bw', name: 'φ = θ: Beam–Warming', tvd: false, linear: [0, 1],
    description: 'The correction uses the upwind jump: the Beam–Warming scheme. Not TVD.',
    phi: (t) => t,
    tex: '\\phi(\\theta) = \\theta',
    cite: 'LeVeque (2002) ch. 6',
  },
  fromm: {
    id: 'fromm', name: 'φ = (1+θ)/2: Fromm', tvd: false, linear: [0.5, 0.5],
    description: 'The average of the two: Fromm’s scheme. Not TVD.',
    phi: (t) => (1 + t) / 2,
    tex: '\\phi(\\theta) = \\frac{1 + \\theta}{2}',
    cite: 'LeVeque (2002) ch. 6',
  },
};

// ---------------------------------------------------------------- schemes

// nuMax: the largest |ν| for which max_θ |G| ≤ 1 (0 when no ν ≠ 0 is stable).
// For the limited scheme it is the TVD range; for weno5 the linearised range of
// SSP-RK3 with the optimal weights (computed by amplification(), see tests).
export const SCHEMES = {
  upwind: {
    id: 'upwind', name: 'Upwind', kind: 'linear', order: 1, levels: 2, conservative: true,
    nuMax: 1, stability: '0 \\le |\\nu| \\le 1',
    stencil: [-1, 0],
    description: 'Take the difference on the side the wind comes from. Monotone, first order, smeared by numerical diffusion.',
    tex: 'u_j^{n+1} = u_j^n - \\nu\\left(u_j^n - u_{j-1}^n\\right)',
    flux: 'F_{j-1/2} = a\\,u_{j-1}^n',
    modified: 'u_t + a u_x = \\frac{a\\Delta x}{2}(1-\\nu)\\,u_{xx} - \\frac{a\\Delta x^2}{6}(1-\\nu)(1-2\\nu)\\,u_{xxx}',
    note: 'Exact one-cell shift at |ν| = 1. At |ν| = 1/2 the phase is exact for every θ < π and all the error is damping.',
    cite: 'Courant, Isaacson & Rees (1952); LeVeque (2002) ch. 4',
  },
  downwind: {
    id: 'downwind', name: 'Downwind', kind: 'linear', order: 1, levels: 2, conservative: true,
    nuMax: 0, stability: '\\text{unstable for all } \\nu \\ne 0',
    stencil: [0, 1],
    description: 'The difference on the wrong side: information is taken from where the wind is going. Grows at every ν.',
    tex: 'u_j^{n+1} = u_j^n - \\nu\\left(u_{j+1}^n - u_j^n\\right)',
    flux: 'F_{j-1/2} = a\\,u_j^n',
    modified: 'u_t + a u_x = -\\frac{a\\Delta x}{2}(1+\\nu)\\,u_{xx} - \\frac{a\\Delta x^2}{6}(1+\\nu)(1+2\\nu)\\,u_{xxx}',
    note: 'Negative numerical diffusion: an anti-diffusion equation.',
    cite: 'Courant, Friedrichs & Lewy (1928) domain-of-dependence argument; LeVeque (2002) ch. 4',
  },
  ftcs: {
    id: 'ftcs', name: 'FTCS', kind: 'linear', order: 1, levels: 2, conservative: true,
    nuMax: 0, stability: '\\text{unstable for all } \\nu \\ne 0',
    stencil: [-1, 0, 1],
    description: 'Forward Euler in time, centred difference in space. Second order in space, but unstable for every ν > 0: |G|² = 1 + ν² sin²θ.',
    tex: 'u_j^{n+1} = u_j^n - \\frac{\\nu}{2}\\left(u_{j+1}^n - u_{j-1}^n\\right)',
    flux: 'F_{j-1/2} = \\frac{a}{2}\\left(u_{j-1}^n + u_j^n\\right)',
    modified: 'u_t + a u_x = -\\frac{a\\Delta x\\,\\nu}{2}\\,u_{xx} - \\frac{a\\Delta x^2}{6}(1+2\\nu^2)\\,u_{xxx}',
    note: 'Negative numerical diffusion −a²Δt/2 from the forward-Euler step.',
    cite: 'Strikwerda (2004) ch. 1–2',
  },
  lxf: {
    id: 'lxf', name: 'Lax–Friedrichs', kind: 'linear', order: 1, levels: 2, conservative: true,
    nuMax: 1, stability: '|\\nu| \\le 1',
    stencil: [-1, 1],
    description: 'FTCS with u_j replaced by the neighbour average. Stable, but very diffusive, and more so as ν falls.',
    tex: 'u_j^{n+1} = \\frac{1}{2}\\left(u_{j-1}^n + u_{j+1}^n\\right) - \\frac{\\nu}{2}\\left(u_{j+1}^n - u_{j-1}^n\\right)',
    flux: 'F_{j-1/2} = \\frac{a}{2}\\left(u_{j-1}^n + u_j^n\\right) - \\frac{\\Delta x}{2\\Delta t}\\left(u_j^n - u_{j-1}^n\\right)',
    modified: 'u_t + a u_x = \\frac{\\Delta x^2}{2\\Delta t}(1-\\nu^2)\\,u_{xx} + \\frac{a\\Delta x^2}{3}(1-\\nu^2)\\,u_{xxx}',
    note: 'Never reads u_j: odd and even cells evolve separately.',
    cite: 'Lax (1954); LeVeque (2002) ch. 4',
  },
  lw: {
    id: 'lw', name: 'Lax–Wendroff', kind: 'linear', order: 2, levels: 2, conservative: true,
    nuMax: 1, stability: '|\\nu| \\le 1',
    stencil: [-1, 0, 1],
    description: 'Second order from a Taylor series in time. Dispersive: ripples trail behind jumps.',
    tex: 'u_j^{n+1} = u_j^n - \\frac{\\nu}{2}\\left(u_{j+1}^n - u_{j-1}^n\\right) + \\frac{\\nu^2}{2}\\left(u_{j+1}^n - 2u_j^n + u_{j-1}^n\\right)',
    flux: 'F_{j-1/2} = \\frac{a}{2}\\left(u_{j-1}^n + u_j^n\\right) - \\frac{a^2\\Delta t}{2\\Delta x}\\left(u_j^n - u_{j-1}^n\\right)',
    modified: 'u_t + a u_x = -\\frac{a\\Delta x^2}{6}(1-\\nu^2)\\,u_{xxx}',
    note: 'Phase lag for 0 < |ν| < 1: oscillations appear behind a moving jump.',
    cite: 'Lax & Wendroff (1960); LeVeque (2002) ch. 6',
  },
  bw: {
    id: 'bw', name: 'Beam–Warming', kind: 'linear', order: 2, levels: 2, conservative: true,
    nuMax: 2, stability: '0 \\le |\\nu| \\le 2',
    stencil: [-2, -1, 0],
    description: 'Second-order and fully upwind. Dispersive the other way: ripples run ahead of jumps for |ν| < 1.',
    tex: 'u_j^{n+1} = u_j^n - \\frac{\\nu}{2}\\left(3u_j^n - 4u_{j-1}^n + u_{j-2}^n\\right) + \\frac{\\nu^2}{2}\\left(u_j^n - 2u_{j-1}^n + u_{j-2}^n\\right)',
    flux: 'F_{j-1/2} = a\\,u_{j-1}^n + \\frac{a}{2}(1-\\nu)\\left(u_{j-1}^n - u_{j-2}^n\\right)',
    modified: 'u_t + a u_x = \\frac{a\\Delta x^2}{6}(1-\\nu)(2-\\nu)\\,u_{xxx}',
    note: 'Phase lead for 0 < |ν| < 1; exact shifts at |ν| = 1 and 2.',
    cite: 'Warming & Beam (1976); LeVeque (2002) ch. 6',
  },
  fromm: {
    id: 'fromm', name: 'Fromm', kind: 'linear', order: 2, levels: 2, conservative: true,
    nuMax: 1, stability: '0 \\le |\\nu| \\le 1',
    stencil: [-2, -1, 0, 1],
    description: 'The average of Lax–Wendroff and Beam–Warming, whose phase errors partly cancel.',
    tex: 'u_j^{n+1} = \\frac{1}{2}\\left(u_j^{\\mathrm{LW}} + u_j^{\\mathrm{BW}}\\right)',
    flux: 'F_{j-1/2} = a\\,u_{j-1}^n + \\frac{a}{4}(1-\\nu)\\left(u_j^n - u_{j-2}^n\\right)',
    modified: 'u_t + a u_x = \\frac{a\\Delta x^2}{12}(1-\\nu)(1-2\\nu)\\,u_{xxx}',
    note: 'The u_xxx term vanishes at |ν| = 1/2, where the scheme is third order.',
    cite: 'Fromm (1968); LeVeque (2002) ch. 6',
  },
  leapfrog: {
    id: 'leapfrog', name: 'Leapfrog', kind: 'linear', order: 2, levels: 3, conservative: true,
    nuMax: 1, nuMaxOpen: true, stability: '|\\nu| < 1',
    stencil: [-1, 1],
    description: 'Centred in time and space over three levels. No numerical diffusion at all, but a spurious second solution.',
    tex: 'u_j^{n+1} = u_j^{n-1} - \\nu\\left(u_{j+1}^n - u_{j-1}^n\\right)',
    flux: 'F_{j-1/2} = \\frac{a}{2}\\left(u_{j-1}^n + u_j^n\\right) \\text{ over } 2\\Delta t',
    modified: 'u_t + a u_x = -\\frac{a\\Delta x^2}{6}(1-\\nu^2)\\,u_{xxx}',
    note: 'Two roots G = −iν sin θ ± (1 − ν² sin²θ)^{1/2}, both |G| = 1 for |ν| ≤ 1. The root near −1 is the computational mode (a 2Δt flip-flop). At |ν| = 1 the roots meet at θ = π/2 and errors grow linearly, so the range is open. Started with one Lax–Wendroff step.',
    options: { start: 'lw', asselin: 0 },
    cite: 'Strikwerda (2004) ch. 1–2; Durran (2010) ch. 2',
  },
  limited: {
    id: 'limited', name: 'Flux-limited (high resolution)', kind: 'limited', order: 2, levels: 2, conservative: true,
    nuMax: 1, stability: '|\\nu| \\le 1 \\text{ (TVD)}',
    stencil: [-2, -1, 0, 1],
    description: 'Upwind plus a Lax–Wendroff correction scaled by a limiter φ(θ) of the slope ratio: second order where smooth, no new extrema at jumps.',
    tex: 'u_j^{n+1} = u_j^n - \\nu\\left(u_j^n - u_{j-1}^n\\right) - \\frac{\\nu(1-\\nu)}{2}\\left(\\phi_{j+1/2}\\,\\Delta_{j+1/2} - \\phi_{j-1/2}\\,\\Delta_{j-1/2}\\right),\\quad \\Delta_{j-1/2} = u_j^n - u_{j-1}^n,\\ \\theta_{j-1/2} = \\frac{\\Delta_{j-3/2}}{\\Delta_{j-1/2}}',
    flux: 'F_{j-1/2} = a\\,u_{j-1}^n + \\frac{a}{2}(1-\\nu)\\,\\phi(\\theta_{j-1/2})\\left(u_j^n - u_{j-1}^n\\right)',
    modified: null,
    note: 'Second order in smooth monotone regions (φ(1) = 1 gives Lax–Wendroff); drops to first order at extrema, where every TVD limiter gives φ = 0.',
    options: { limiter: 'minmod' },
    cite: 'LeVeque (2002) ch. 6; Sweby (1984); Harten (1983)',
  },
  weno5: {
    id: 'weno5', name: 'WENO5 + SSP-RK3', kind: 'nonlinear', order: 5, levels: 2, conservative: true,
    nuMax: 1.43, stability: '|\\nu| \\lesssim 1.43 \\text{ (linearised, RK3)}',
    stencil: [-3, -2, -1, 0, 1, 2],
    description: 'Three third-order candidate stencils blended by smoothness weights: fifth order where smooth, essentially non-oscillatory at jumps. Advanced in time with three Runge–Kutta stages.',
    tex: '\\frac{\\mathrm{d}u_j}{\\mathrm{d}t} = -\\frac{a}{\\Delta x}\\left(\\hat u_{j+1/2} - \\hat u_{j-1/2}\\right),\\quad \\hat u_{j+1/2} = \\sum_{k=0}^{2} \\omega_k q_k,\\quad \\omega_k = \\frac{\\alpha_k}{\\sum_m \\alpha_m},\\ \\alpha_k = \\frac{d_k}{(\\varepsilon + \\beta_k)^2}',
    flux: 'F_{j-1/2} = a\\,\\hat u_{j-1/2}',
    modified: null,
    rk: 'u^{(1)} = u^n + \\Delta t\\,L(u^n),\\ u^{(2)} = \\frac{3}{4}u^n + \\frac{1}{4}\\left(u^{(1)} + \\Delta t\\,L(u^{(1)})\\right),\\ u^{n+1} = \\frac{1}{3}u^n + \\frac{2}{3}\\left(u^{(2)} + \\Delta t\\,L(u^{(2)})\\right)',
    note: 'Stencil per RK stage. Time error is third order, so a convergence study must shrink Δt faster than Δx (dtExponent 5/3) to see the fifth-order space error. The JS weights can lose accuracy at critical points (Henrick et al. 2005); on sin 2πx at 20–320 cells the loss is not visible. rk 1 and rk 2 are linearly unstable, but the JS weights hide it: they add dissipation where the growing grid-scale noise looks rough, so rk 2 never visibly blows up and rk 1 takes thousands of steps. To show the instability use weights: \'linear\' (preset weno-euler).',
    options: { weights: 'js', eps: 1e-6, rk: 3 },
    cite: 'Jiang & Shu (1996); Shu & Osher (1988); Gottlieb, Shu & Tadmor (2001)',
  },
};

// Stability limits of WENO5 (optimal weights) with each Runge–Kutta order, from
// max_θ |G| ≤ 1: forward Euler and SSP-RK2 are unstable for every ν > 0. This
// is the linear analysis. With the nonlinear JS weights, rk 2 is damped rather
// than visibly unstable (sine, n = 100, ν = 0.9: max|u| falls to 0.64 in 20
// periods, against 8e127 with linear weights) and rk 1 needs ~4000 steps to blow
// up; use weights: 'linear' to show the instability.
export const WENO_NU_MAX = { 1: 0, 2: 0, 3: 1.43 };

// Broken/fixed pairs for figures and the rogues' gallery. Each case is
// { label, scheme, nu, profile, n, steps, opts }: createState(n, profile), then
// `steps` calls of step(state, scheme, nu, opts). `metric` names a field of
// diagnostics() that tells them apart: broken[metric] > threshold > fixed[metric]
// after `steps` steps (the tests check every pair). Widgets keep stepping past
// `steps`; it is the point by which the difference is unmistakable.
export const PRESETS = {
  'cfl-violation': {
    id: 'cfl-violation', name: 'CFL violation', family: 'stability',
    description: 'At ν = 1.1 the exact solution comes from further upstream than upwind’s two-cell stencil reaches (the CFL condition fails), and grid-scale wiggles grow by |1 − 2ν| = 1.2 per step. At ν = 0.9 it is stable.',
    metric: 'max', threshold: 10,
    broken: { label: 'ν = 1.1', scheme: 'upwind', nu: 1.1, profile: 'square', n: 100, steps: 100, opts: {} },
    fixed: { label: 'ν = 0.9', scheme: 'upwind', nu: 0.9, profile: 'square', n: 100, steps: 100, opts: {} },
  },
  'bw-cfl': {
    id: 'bw-cfl', name: 'Beam–Warming past ν = 2', family: 'stability',
    description: 'Beam–Warming reaches two cells upwind, so its limit is ν = 2, not 1: stable at 1.9, unstable at 2.1.',
    metric: 'max', threshold: 10,
    broken: { label: 'ν = 2.1', scheme: 'bw', nu: 2.1, profile: 'square', n: 100, steps: 300, opts: {} },
    fixed: { label: 'ν = 1.9', scheme: 'bw', nu: 1.9, profile: 'square', n: 100, steps: 300, opts: {} },
  },
  downwind: {
    id: 'downwind', name: 'Downwind differencing', family: 'stability',
    description: 'The difference on the side the wind blows towards: negative numerical diffusion, unstable at every ν. Upwind at the same ν is stable.',
    metric: 'max', threshold: 10,
    broken: { label: 'downwind', scheme: 'downwind', nu: 0.5, profile: 'square', n: 100, steps: 100, opts: {} },
    fixed: { label: 'upwind', scheme: 'upwind', nu: 0.5, profile: 'square', n: 100, steps: 100, opts: {} },
  },
  ftcs: {
    id: 'ftcs', name: 'FTCS', family: 'stability',
    description: 'Forward Euler with a centred difference: |G|² = 1 + ν² sin²θ > 1 for every ν. Lax–Friedrichs (average the neighbours) is stable for |ν| ≤ 1.',
    metric: 'max', threshold: 10,
    broken: { label: 'FTCS', scheme: 'ftcs', nu: 0.5, profile: 'square', n: 100, steps: 200, opts: {} },
    fixed: { label: 'Lax–Friedrichs', scheme: 'lxf', nu: 0.5, profile: 'square', n: 100, steps: 200, opts: {} },
  },
  'numerical-diffusion': {
    id: 'numerical-diffusion', name: 'Numerical diffusion', family: 'accuracy',
    description: 'Upwind smears a square wave as if it obeyed u_t + a u_x = D u_xx with D = aΔx(1 − ν)/2. A limited second-order scheme keeps the edges sharp.',
    metric: 'l1', threshold: 0.04,
    broken: { label: 'upwind', scheme: 'upwind', nu: 0.5, profile: 'square', n: 200, steps: 400, opts: {} },
    fixed: { label: 'limited (MC)', scheme: 'limited', nu: 0.5, profile: 'square', n: 200, steps: 400, opts: { limiter: 'mc' } },
  },
  'lw-ringing': {
    id: 'lw-ringing', name: 'Dispersive ringing', family: 'accuracy',
    description: 'Lax–Wendroff is second order but lags short waves, so ripples trail each jump and overshoot by ~23%. A TVD limiter switches to upwind at the jump: no new extrema.',
    metric: 'overshoot', threshold: 0.05,
    broken: { label: 'Lax–Wendroff', scheme: 'lw', nu: 0.5, profile: 'square', n: 200, steps: 400, opts: {} },
    fixed: { label: 'limited (MC)', scheme: 'limited', nu: 0.5, profile: 'square', n: 200, steps: 400, opts: { limiter: 'mc' } },
  },
  'weno-linear-weights': {
    id: 'weno-linear-weights', name: 'WENO without its weights', family: 'accuracy',
    description: 'Freezing the WENO weights at their optimal values gives a fifth-order linear scheme, which rings at jumps (~7% overshoot). The nonlinear weights drop the stencils that cross the jump (~0.05%).',
    metric: 'overshoot', threshold: 0.01,
    broken: { label: 'linear weights', scheme: 'weno5', nu: 0.5, profile: 'square', n: 200, steps: 400, opts: { weights: 'linear' } },
    fixed: { label: 'JS weights', scheme: 'weno5', nu: 0.5, profile: 'square', n: 200, steps: 400, opts: { weights: 'js' } },
  },
  'weno-euler': {
    id: 'weno-euler', name: 'WENO with forward Euler', family: 'stability',
    description: 'The linearised WENO5 operator damps a mode of wavenumber θ only like θ⁶ but turns it like θ, so its eigenvalues hug the imaginary axis, which the stability regions of forward Euler (and RK2) touch only at 0: unstable at every ν. Three-stage SSP-RK3 covers a stretch of the axis and is stable up to ν ≈ 1.43. Shown with linear weights; the JS weights add dissipation that delays the blow-up by thousands of steps.',
    metric: 'max', threshold: 10,
    broken: { label: 'forward Euler', scheme: 'weno5', nu: 0.5, profile: 'sine', n: 100, steps: 400, opts: { weights: 'linear', rk: 1 } },
    fixed: { label: 'SSP-RK3', scheme: 'weno5', nu: 0.5, profile: 'sine', n: 100, steps: 400, opts: { weights: 'linear', rk: 3 } },
  },
  'leapfrog-start': {
    id: 'leapfrog-start', name: 'Leapfrog computational mode', family: 'accuracy',
    description: 'Starting leapfrog with u¹ = u⁰ puts energy into its second root G ≈ −1, a 2Δt flip-flop that never decays. A Lax–Wendroff first step keeps it ~20 times smaller.',
    metric: 'flip', threshold: 0.01,
    broken: { label: 'start u¹ = u⁰', scheme: 'leapfrog', nu: 0.5, profile: 'gaussian', n: 100, steps: 400, opts: { start: 'copy' } },
    fixed: { label: 'Lax–Wendroff start', scheme: 'leapfrog', nu: 0.5, profile: 'gaussian', n: 100, steps: 400, opts: { start: 'lw' } },
  },
  'leapfrog-asselin': {
    id: 'leapfrog-asselin', name: 'Robert–Asselin filter', family: 'accuracy',
    description: 'The Robert–Asselin time filter (γ = 0.1) damps the computational mode of a careless start, at the price of also damping the physical solution (the peak drops ~11% more in two periods).',
    metric: 'flip', threshold: 0.01,
    broken: { label: 'unfiltered', scheme: 'leapfrog', nu: 0.5, profile: 'gaussian', n: 100, steps: 400, opts: { start: 'copy' } },
    fixed: { label: 'γ = 0.1', scheme: 'leapfrog', nu: 0.5, profile: 'gaussian', n: 100, steps: 400, opts: { start: 'copy', asselin: 0.1 } },
  },
};

// ---------------------------------------------------------------- profiles

const JS_D = 0.005;
const JS_BETA = Math.log(2) / (36 * JS_D * JS_D);
const jsG = (x, z) => Math.exp(-JS_BETA * (x - z) * (x - z));
const jsF = (x, c) => Math.sqrt(Math.max(1 - 100 * (x - c) * (x - c), 0));
// Jiang & Shu (1996) linear-advection test on [-1, 1].
function jiangShu(X) {
  if (X >= 0.4 && X <= 0.6) return (jsF(X, 0.5 - JS_D) + jsF(X, 0.5 + JS_D) + 4 * jsF(X, 0.5)) / 6;
  return jiangShuRest(X);
}
// Everything but the half ellipse (Gaussian blend, square, triangle).
function jiangShuRest(X) {
  if (X >= -0.8 && X <= -0.6) return (jsG(X, -0.7 - JS_D) + jsG(X, -0.7 + JS_D) + 4 * jsG(X, -0.7)) / 6;
  if (X >= -0.4 && X <= -0.2) return 1;
  if (X >= 0 && X <= 0.2) return 1 - Math.abs(10 * (X - 0.1));
  return 0;
}
// ∫ sqrt(max(1 − 100(Y − c)², 0)) dY = (s√(1 − s²) + asin s)/20 with s = 10(Y − c) clipped to [−1, 1].
const jsH = (Y, c) => {
  let s = 10 * (Y - c);
  if (s > 1) s = 1;
  else if (s < -1) s = -1;
  return (s * Math.sqrt(1 - s * s) + Math.asin(s)) / 20;
};
const JS_H0 = [jsH(0.4, 0.5 - JS_D), jsH(0.4, 0.5 + JS_D), jsH(0.4, 0.5)];
const jsEllipseFrom04 = (Y) => (jsH(Y, 0.5 - JS_D) - JS_H0[0] + jsH(Y, 0.5 + JS_D) - JS_H0[1] + 4 * (jsH(Y, 0.5) - JS_H0[2])) / 6;
const JS_ELLIPSE_AREA = jsEllipseFrom04(0.6);
// Antiderivative of the half-ellipse part from X = −1: zero before 0.4, constant after 0.6.
function jiangShuEllipsePrim(X) {
  return X <= 0.4 ? 0 : X >= 0.6 ? JS_ELLIPSE_AREA : jsEllipseFrom04(X);
}
// Signed distance on the periodic unit interval, in [-1/2, 1/2).
const pdist = (x, x0) => {
  const d = x - x0;
  return d - Math.floor(d + 0.5);
};
const wrap01 = (x) => x - Math.floor(x);

// Each profile: default params, make(p) → f(x) for x in [0, 1), breaks(p) →
// the points in [0, 1) where f or f' jumps (cell averages integrate piecewise
// between them), and the value range for plot limits. Optionally quad(p) and
// prim(p): f = quad + a part whose antiderivative prim (from x = 0, defined on
// [0, 1]) is known in closed form; cell averages then integrate only quad
// numerically. 'combined' uses this for its half ellipse, whose square-root
// edges Gauss–Legendre integrates badly (errors ~1e-4 per cell).
export const PROFILES = {
  square: {
    id: 'square', name: 'Square wave', smooth: false,
    description: 'A top hat: u = 1 on [lo, hi], 0 elsewhere. Two jumps.',
    params: { lo: 0.25, hi: 0.5 },
    make: (p) => (x) => (x >= p.lo && x <= p.hi ? 1 : 0),
    breaks: (p) => [p.lo, p.hi],
    range: () => [0, 1],
  },
  gaussian: {
    id: 'gaussian', name: 'Gaussian', smooth: true,
    description: 'exp(−(x − x0)²/(2σ²)), smooth (periodic to within e^{−1/(8σ²)}).',
    params: { x0: 0.5, sigma: 0.05 },
    make: (p) => (x) => {
      const d = pdist(x, p.x0);
      return Math.exp((-d * d) / (2 * p.sigma * p.sigma));
    },
    breaks: (p) => [wrap01(p.x0 + 0.5)],
    range: () => [0, 1],
  },
  sine: {
    id: 'sine', name: 'Sine wave', smooth: true,
    description: 'offset + amp·sin(2πkx), k an integer number of waves in the domain.',
    params: { k: 1, amp: 1, offset: 0 },
    make: (p) => (x) => p.offset + p.amp * Math.sin(TWO_PI * p.k * x),
    breaks: () => [],
    range: (p) => [p.offset - Math.abs(p.amp), p.offset + Math.abs(p.amp)],
  },
  triangle: {
    id: 'triangle', name: 'Triangle', smooth: false,
    description: 'A tent of height 1 and half-width w centred at x0: continuous, with three kinks.',
    params: { x0: 0.5, halfWidth: 0.15 },
    make: (p) => (x) => Math.max(0, 1 - Math.abs(pdist(x, p.x0)) / p.halfWidth),
    breaks: (p) => [wrap01(p.x0 - p.halfWidth), wrap01(p.x0), wrap01(p.x0 + p.halfWidth)].sort((a, b) => a - b),
    range: () => [0, 1],
  },
  packet: {
    id: 'packet', name: 'Wave packet', smooth: true,
    description: 'A Gaussian envelope (σ) times cos(2πk(x − x0)): k waves per unit length, so θ = 2πkΔx per cell. Shows dispersion and group velocity.',
    params: { x0: 0.5, sigma: 0.08, k: 16 },
    make: (p) => (x) => {
      const d = pdist(x, p.x0);
      return Math.exp((-d * d) / (2 * p.sigma * p.sigma)) * Math.cos(TWO_PI * p.k * d);
    },
    breaks: (p) => [wrap01(p.x0 + 0.5)],
    range: () => [-1, 1],
  },
  combined: {
    id: 'combined', name: 'Jiang–Shu test', smooth: false,
    description: 'Jiang & Shu (1996): a narrow smooth Gaussian blend, a square wave, a sharp triangle and a half ellipse, mapped from [−1, 1] to [0, 1).',
    params: {},
    make: () => (x) => jiangShu(2 * x - 1),
    // Value jumps at −0.8, −0.6, −0.4, −0.2; kinks at 0, 0.1, 0.2; ellipse edges 0.4, 0.405, 0.595, 0.6.
    breaks: () => [-0.8, -0.6, -0.4, -0.2, 0, 0.1, 0.2, 0.4, 0.405, 0.595, 0.6].map((X) => (X + 1) / 2),
    range: () => [0, 1],
    quad: () => (x) => jiangShuRest(2 * x - 1),
    prim: () => (x) => 0.5 * jiangShuEllipsePrim(2 * x - 1), // dx = dX/2
  },
};

// Resolve a profile spec ('square', { id: 'sine', k: 3 }, or an already
// resolved profile) into { id, name, params, f, breaks, range, smooth, quad,
// prim }. f(x) accepts any real x (it wraps periodically); breaks are sorted.
// quad and prim are the split used by exactAverages (quad = f, prim = null for
// most profiles). Resolve once and reuse.
export function makeProfile(spec = 'square') {
  if (spec && typeof spec === 'object' && typeof spec.f === 'function') return spec;
  const id = typeof spec === 'string' ? spec : spec.id;
  const def = PROFILES[id];
  if (!def) throw new Error(`advection: unknown profile '${id}'`);
  const params = { ...def.params };
  if (typeof spec === 'object') for (const k of Object.keys(def.params)) if (spec[k] !== undefined) params[k] = spec[k];
  const g = def.make(params);
  const f = (x) => g(x - Math.floor(x));
  let quad = f;
  if (def.quad) {
    const q = def.quad(params);
    quad = (x) => q(x - Math.floor(x));
  }
  return {
    id, name: def.name, smooth: def.smooth, params, f,
    breaks: def.breaks(params).slice().sort((a, b) => a - b),
    range: def.range(params),
    quad,
    prim: def.prim ? def.prim(params) : null,
  };
}

// Exact solution u(x, t) = u0(x − a t), a point value.
export function exact(profile, x, t = 0, a = 1) {
  return makeProfile(profile).f(x - a * t);
}

// Composite 5-point Gauss–Legendre with panels no wider than GL_PANEL.
const GL_X = [-0.906179845938664, -0.5384693101056831, 0, 0.5384693101056831, 0.906179845938664];
const GL_W = [0.2369268850561891, 0.4786286704993665, 0.5688888888888889, 0.4786286704993665, 0.2369268850561891];
const GL_PANEL = 1 / 256;
function gaussInt(f, lo, hi) {
  if (hi <= lo) return 0;
  const m = Math.max(1, Math.ceil((hi - lo) / GL_PANEL - 1e-9));
  const h = (hi - lo) / m, hh = 0.5 * h;
  let s = 0;
  for (let p = 0; p < m; p++) {
    const c = lo + (p + 0.5) * h;
    for (let k = 0; k < 5; k++) s += GL_W[k] * f(c + hh * GL_X[k]);
  }
  return s * hh;
}

// Exact cell averages of u(·, t) on n cells. Each cell is split at the
// profile's jumps and kinks and each smooth piece gets composite 5-point
// Gauss–Legendre (panels ≤ 1/256 wide, so one panel per piece once n ≥ 256).
// Piecewise-polynomial pieces are exact; measured against references, every
// built-in profile at its default parameters is within ~1e-13 at any n
// (narrower features, e.g. a Gaussian with σ < 0.01 or a packet with k > 40,
// lose a few digits). The half ellipse of 'combined' is integrated in closed
// form (see PROFILES: quad/prim).
export function exactAverages(profile, n, t = 0, a = 1, out = new Float64Array(n)) {
  const p = makeProfile(profile);
  const dx = 1 / n, f = p.quad ?? p.f, prim = p.prim ?? null, br = p.breaks, nb = br.length;
  const P1 = prim ? prim(1) : 0;
  const shift = a * t;
  for (let j = 0; j < n; j++) {
    // Integrate u0 over [xl, xl + dx] with xl the departure point of the cell's left edge.
    const xl = wrap01(j * dx - shift), xr = xl + dx;
    let cur = xl, s = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < nb; k++) {
        const b = br[k] + pass;
        if (b > cur && b < xr) {
          s += gaussInt(f, cur, b);
          cur = b;
        }
      }
    }
    s += gaussInt(f, cur, xr);
    if (prim) s += (xr > 1 ? P1 + prim(xr - 1) : prim(xr)) - prim(xl);
    out[j] = s / dx;
  }
  return out;
}

// Exact point values at the cell centres.
export function exactPoints(profile, n, t = 0, a = 1, out = new Float64Array(n)) {
  const p = makeProfile(profile);
  const dx = 1 / n;
  for (let j = 0; j < n; j++) out[j] = p.f((j + 0.5) * dx - a * t);
  return out;
}

// ---------------------------------------------------------------- state

// n cells; profile spec; opts { a = 1, sample: 'average' | 'point' }.
export function createState(n, profile = 'square', opts = NO_OPTS) {
  if (!(n >= 4)) throw new Error('advection: need at least 4 cells');
  const state = {
    n,
    dx: 1 / n,
    a: opts.a ?? 1,
    sample: opts.sample ?? 'average',
    profile: makeProfile(profile),
    x: centres(0, 1, n),
    u: new Float64Array(n), // current solution
    u0: new Float64Array(n), // initial data
    uPrev: new Float64Array(n), // u^{n-1} for leapfrog
    exact: new Float64Array(n), // scratch for the exact solution
    s1: new Float64Array(n), // Runge–Kutta stages
    s2: new Float64Array(n),
    g: new Float64Array(n + 2 * NG), // periodic copy with ghosts
    f: new Float64Array(n + 1), // face fluxes × Δt/Δx
    t: 0,
    tc: 0, // Kahan compensation for t (so t does not drift over long runs)
    steps: 0,
    flip: 0, // leapfrog: size of the 2Δt oscillation on the last step (see diagnostics)
    lfReady: false,
    lfNu: 0,
    mass0: 0,
    tv0: 0,
    min0: 0,
    max0: 0,
  };
  reset(state);
  return state;
}

// Back to t = 0 (optionally with a new profile). No allocation unless the
// profile spec needs resolving.
export function reset(state, profile = null) {
  if (profile) state.profile = makeProfile(profile);
  if (state.sample === 'point') exactPoints(state.profile, state.n, 0, state.a, state.u0);
  else exactAverages(state.profile, state.n, 0, state.a, state.u0);
  state.u.set(state.u0);
  state.uPrev.set(state.u0);
  state.t = 0;
  state.tc = 0;
  state.steps = 0;
  state.flip = 0;
  state.lfReady = false;
  let m = 0, lo = Infinity, hi = -Infinity;
  for (let j = 0; j < state.n; j++) {
    const v = state.u0[j];
    m += v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  state.mass0 = m * state.dx;
  state.min0 = lo;
  state.max0 = hi;
  state.tv0 = totalVariation(state.u0);
  return state;
}

// ---------------------------------------------------------------- kernels

function fillGhosts(src, g, n) {
  for (let j = 0; j < n; j++) g[j + NG] = src[j];
  for (let k = 0; k < NG; k++) {
    g[k] = src[n - NG + k];
    g[n + NG + k] = src[k];
  }
}

// Face fluxes (× Δt/Δx) of the two-level linear schemes into f[0..n].
function linearFluxes(id, g, f, n, nu) {
  const s = nu < 0 ? -1 : 1, c = Math.abs(nu);
  const oU = s > 0 ? NG - 1 : NG; // g-index of the upwind cell of face 0
  switch (id) {
    case 'upwind':
      for (let i = 0; i < n; i++) f[i] = nu * g[i + oU];
      break;
    case 'downwind':
      for (let i = 0; i < n; i++) f[i] = nu * g[i + oU + s];
      break;
    case 'ftcs':
      for (let i = 0; i < n; i++) f[i] = 0.5 * nu * (g[i + NG - 1] + g[i + NG]);
      break;
    case 'lxf':
      for (let i = 0; i < n; i++) {
        const l = g[i + NG - 1], r = g[i + NG];
        f[i] = 0.5 * nu * (l + r) - 0.5 * (r - l);
      }
      break;
    case 'lw': {
      const k = 0.5 * nu * nu;
      for (let i = 0; i < n; i++) {
        const l = g[i + NG - 1], r = g[i + NG];
        f[i] = 0.5 * nu * (l + r) - k * (r - l);
      }
      break;
    }
    case 'bw': {
      const k = 0.5 * c * (1 - c);
      for (let i = 0; i < n; i++) {
        const up = g[i + oU];
        f[i] = s * (c * up + k * (up - g[i + oU - s]));
      }
      break;
    }
    case 'fromm': {
      const k = 0.25 * c * (1 - c);
      for (let i = 0; i < n; i++) {
        const b = i + oU;
        f[i] = s * (c * g[b] + k * (g[b + s] - g[b - s]));
      }
      break;
    }
    default:
      throw new Error(`advection: unknown scheme '${id}'`);
  }
  f[n] = f[0];
}

function limitedFluxes(g, f, n, nu, limiterId) {
  const L = LIMITERS[limiterId];
  if (!L) throw new Error(`advection: unknown limiter '${limiterId}'`);
  const s = nu < 0 ? -1 : 1, c = Math.abs(nu);
  const oU = s > 0 ? NG - 1 : NG;
  const k = 0.5 * c * (1 - c);
  const phi = L.phi, lin = L.linear;
  for (let i = 0; i < n; i++) {
    const b = i + oU;
    const qu = g[b];
    const w = g[b + s] - qu; // jump across this face, upwind → downwind
    const wu = qu - g[b - s]; // jump across the upwind neighbour face
    let wt;
    if (lin) wt = lin[0] * w + lin[1] * wu;
    else if (w === 0) wt = 0;
    else {
      // The tail of a jump decays to subnormal values on long runs, so W can be
      // ~1e-320 beside W_up ~ 1e-12 and the ratio overflows to ±∞. Every limiter
      // has saturated long before ±1e100, so clamping changes nothing else.
      let th = wu / w;
      if (th > 1e100) th = 1e100;
      else if (th < -1e100) th = -1e100;
      wt = phi(th) * w;
    }
    f[i] = s * (c * qu + k * wt);
  }
  f[n] = f[0];
}

function wenoFluxes(g, f, n, nu, eps, linear) {
  const s = nu < 0 ? -1 : 1;
  const oU = s > 0 ? NG - 1 : NG;
  const s2 = 2 * s;
  for (let i = 0; i < n; i++) {
    const b = i + oU;
    const v1 = g[b - s2], v2 = g[b - s], v3 = g[b], v4 = g[b + s], v5 = g[b + s2];
    const q0 = (2 * v1 - 7 * v2 + 11 * v3) / 6;
    const q1 = (-v2 + 5 * v3 + 2 * v4) / 6;
    const q2 = (2 * v3 + 5 * v4 - v5) / 6;
    let uh;
    if (linear) uh = 0.1 * q0 + 0.6 * q1 + 0.3 * q2;
    else {
      const d0 = v1 - 2 * v2 + v3, e0 = v1 - 4 * v2 + 3 * v3;
      const d1 = v2 - 2 * v3 + v4, e1 = v2 - v4;
      const d2 = v3 - 2 * v4 + v5, e2 = 3 * v3 - 4 * v4 + v5;
      const b0 = (13 / 12) * d0 * d0 + 0.25 * e0 * e0;
      const b1 = (13 / 12) * d1 * d1 + 0.25 * e1 * e1;
      const b2 = (13 / 12) * d2 * d2 + 0.25 * e2 * e2;
      const a0 = 0.1 / ((eps + b0) * (eps + b0));
      const a1 = 0.6 / ((eps + b1) * (eps + b1));
      const a2 = 0.3 / ((eps + b2) * (eps + b2));
      uh = (a0 * q0 + a1 * q1 + a2 * q2) / (a0 + a1 + a2);
    }
    f[i] = nu * uh;
  }
  f[n] = f[0];
}

// One WENO right-hand side: f ← fluxes of src.
function wenoRhs(state, src, nu, eps, linear) {
  fillGhosts(src, state.g, state.n);
  wenoFluxes(state.g, state.f, state.n, nu, eps, linear);
}

function stepWeno(state, nu, opts) {
  const { n, u, s1, s2, f } = state;
  const eps = opts.eps ?? 1e-6;
  const linear = opts.weights === 'linear';
  const rk = opts.rk ?? 3;
  wenoRhs(state, u, nu, eps, linear);
  if (rk === 1) {
    for (let j = 0; j < n; j++) u[j] -= f[j + 1] - f[j];
    return;
  }
  for (let j = 0; j < n; j++) s1[j] = u[j] - (f[j + 1] - f[j]);
  wenoRhs(state, s1, nu, eps, linear);
  if (rk === 2) {
    for (let j = 0; j < n; j++) u[j] = 0.5 * u[j] + 0.5 * (s1[j] - (f[j + 1] - f[j]));
    return;
  }
  for (let j = 0; j < n; j++) s2[j] = 0.75 * u[j] + 0.25 * (s1[j] - (f[j + 1] - f[j]));
  wenoRhs(state, s2, nu, eps, linear);
  for (let j = 0; j < n; j++) u[j] = u[j] / 3 + (2 / 3) * (s2[j] - (f[j + 1] - f[j]));
}

function stepLeapfrog(state, nu, opts) {
  const { n, u, uPrev, g, f } = state;
  if (!state.lfReady || state.lfNu !== nu) {
    // Start-up: u^{n-1} ← u^n, then one two-level step.
    uPrev.set(u);
    const start = opts.start ?? 'lw';
    if (start !== 'copy') {
      fillGhosts(u, g, n);
      linearFluxes(start === 'ftcs' ? 'ftcs' : 'lw', g, f, n, nu);
      for (let j = 0; j < n; j++) u[j] -= f[j + 1] - f[j];
    }
    state.lfReady = true;
    state.lfNu = nu;
    state.flip = 0;
    return;
  }
  const gamma = opts.asselin ?? 0;
  fillGhosts(u, g, n);
  for (let i = 0; i < n; i++) f[i] = nu * (g[i + NG - 1] + g[i + NG]); // flux over 2Δt
  f[n] = f[0];
  let flip = 0;
  for (let j = 0; j < n; j++) {
    const un = u[j], pv = uPrev[j];
    const next = pv - (f[j + 1] - f[j]);
    const d2 = next - 2 * un + pv; // second difference in time
    if (d2 > flip) flip = d2;
    else if (-d2 > flip) flip = -d2;
    uPrev[j] = gamma ? un + gamma * d2 : un;
    u[j] = next;
  }
  state.flip = 0.25 * flip;
}

// Advance one time step Δt = νΔx/a, in place.
//   schemeId: a key of SCHEMES.
//   nu: CFL number aΔt/Δx, with the sign of state.a (and 0 when a = 0).
//   opts: limiter (limited; default 'minmod'),
//         eps, weights: 'js' | 'linear', rk: 1 | 2 | 3 (weno5),
//         start: 'lw' | 'ftcs' | 'copy', asselin: γ (leapfrog).
// t is accumulated with compensated (Kahan) summation, so after 10⁴–10⁵ steps
// it is still within a few ulps of the sum of the steps' Δt.
export function step(state, schemeId, nu, opts = NO_OPTS) {
  const { n, u, g, f } = state;
  if (nu !== 0) {
    if (state.a === 0) throw new Error('advection: a = 0, so ν = aΔt/Δx must be 0');
    if ((nu > 0) !== (state.a > 0)) throw new Error('advection: ν must have the sign of a');
  }
  if (schemeId === 'leapfrog') stepLeapfrog(state, nu, opts);
  else {
    state.lfReady = false;
    state.flip = 0;
    if (schemeId === 'weno5') stepWeno(state, nu, opts);
    else {
      fillGhosts(u, g, n);
      if (schemeId === 'limited') limitedFluxes(g, f, n, nu, opts.limiter ?? 'minmod');
      else linearFluxes(schemeId, g, f, n, nu);
      for (let j = 0; j < n; j++) u[j] -= f[j + 1] - f[j];
    }
  }
  if (state.a !== 0) {
    const y = (nu * state.dx) / state.a - state.tc;
    const t1 = state.t + y;
    state.tc = t1 - state.t - y;
    state.t = t1;
  }
  state.steps++;
  return state;
}

// ---------------------------------------------------------------- diagnostics

// Mass, total variation, extremes against the initial data, and errors against
// the exact solution at state.t (cell averages, or point values for
// sample: 'point'). Pass `out` to reuse an object across frames.
// flip (leapfrog only, else 0): max_j |u_j^{n+1} − 2u_j^n + u_j^{n−1}|/4 on the
// last step, the amplitude of a 2Δt odd–even oscillation in time. It is the
// computational mode plus a small physical part ≈ ν²Δx²|u_xx|/4.
export function diagnostics(state, out = {}) {
  const { u, n, dx } = state;
  let m = 0, lo = Infinity, hi = -Infinity;
  for (let j = 0; j < n; j++) {
    const v = u[j];
    m += v;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (state.sample === 'point') exactPoints(state.profile, n, state.t, state.a, state.exact);
  else exactAverages(state.profile, n, state.t, state.a, state.exact);
  out.t = state.t;
  out.steps = state.steps;
  out.mass = m * dx;
  out.mass0 = state.mass0;
  out.massError = out.mass - state.mass0;
  out.tv = totalVariation(u);
  out.tv0 = state.tv0;
  out.min = lo;
  out.max = hi;
  out.overshoot = Math.max(0, hi - state.max0);
  out.undershoot = Math.max(0, state.min0 - lo);
  out.l1 = norm1(u, state.exact, dx);
  out.l2 = norm2(u, state.exact, dx);
  out.linf = normInf(u, state.exact);
  out.flip = state.flip;
  return out;
}

// ---------------------------------------------------------------- von Neumann

// G for a > 0 (c = |ν| ≥ 0) and θ of either sign, as [re, im] pairs in `o`
// (o[0], o[1] physical root; o[2], o[3] leapfrog's computational root).
function gPlus(id, c, th, o, rk) {
  const cs = Math.cos(th), sn = Math.sin(th), c2 = Math.cos(2 * th), s2 = Math.sin(2 * th);
  o[2] = NaN;
  o[3] = NaN;
  switch (id) {
    case 'upwind': o[0] = 1 - c + c * cs; o[1] = -c * sn; return;
    case 'downwind': o[0] = 1 + c - c * cs; o[1] = -c * sn; return;
    case 'ftcs': o[0] = 1; o[1] = -c * sn; return;
    case 'lxf': o[0] = cs; o[1] = -c * sn; return;
    case 'lw': o[0] = 1 - c * c * (1 - cs); o[1] = -c * sn; return;
    case 'bw':
      o[0] = 1 - 0.5 * c * (3 - 4 * cs + c2) + 0.5 * c * c * (1 - 2 * cs + c2);
      o[1] = -0.5 * c * (4 * sn - s2) + 0.5 * c * c * (2 * sn - s2);
      return;
    case 'fromm': {
      const lr = 1 - c * c * (1 - cs), li = -c * sn;
      const br = 1 - 0.5 * c * (3 - 4 * cs + c2) + 0.5 * c * c * (1 - 2 * cs + c2);
      const bi = -0.5 * c * (4 * sn - s2) + 0.5 * c * c * (2 * sn - s2);
      o[0] = 0.5 * (lr + br);
      o[1] = 0.5 * (li + bi);
      return;
    }
    case 'leapfrog': {
      // G² + 2iν sinθ G − 1 = 0  →  G = −iν sinθ ± sqrt(1 − ν² sin²θ).
      const b = c * sn, d = 1 - b * b;
      if (d >= 0) {
        const r = Math.sqrt(d);
        o[0] = r; o[1] = -b; o[2] = -r; o[3] = -b;
      } else {
        const r = Math.sqrt(-d); // sqrt(d) = i r
        o[0] = 0; o[1] = -b + Math.sign(b) * r; o[2] = 0; o[3] = -b - Math.sign(b) * r;
      }
      return;
    }
    case 'weno5': {
      // Optimal-weight reconstruction R(θ) = (2e^{-2iθ} − 13e^{-iθ} + 47 + 27e^{iθ} − 3e^{2iθ})/60
      const rr = (2 * c2 - 13 * cs + 47 + 27 * cs - 3 * c2) / 60;
      const ri = (-2 * s2 + 13 * sn + 27 * sn - 3 * s2) / 60;
      // z = −c R (1 − e^{−iθ}),  1 − e^{−iθ} = (1 − cosθ) + i sinθ
      const er = 1 - cs, ei = sn;
      const zr = -c * (rr * er - ri * ei), zi = -c * (rr * ei + ri * er);
      // G = Σ_{k ≤ rk} z^k / k!
      let gr = 1, gi = 0, tr = 1, ti = 0;
      for (let k = 1; k <= rk; k++) {
        const nr = (tr * zr - ti * zi) / k, ni = (tr * zi + ti * zr) / k;
        tr = nr;
        ti = ni;
        gr += tr;
        gi += ti;
      }
      o[0] = gr;
      o[1] = gi;
      return;
    }
    default:
      throw new Error(`advection: no amplification factor for '${id}'`);
  }
}

const GBUF = new Float64Array(4);

function resolveLinear(schemeId, opts) {
  if (schemeId !== 'limited') return schemeId;
  const lim = LIMITERS[opts.limiter ?? 'minmod'];
  if (lim && lim.linear) return lim.id; // 'upwind' | 'lw' | 'bw' | 'fromm'
  throw new Error('advection: the limited scheme is nonlinear; amplification exists only for the linear limiters');
}

// G of the physical root (and leapfrog's computational root) into GBUF.
function ampCore(schemeId, nu, theta, opts) {
  const id = resolveLinear(schemeId, opts);
  gPlus(id, Math.abs(nu), (nu < 0 ? -1 : 1) * theta, GBUF, opts.rk ?? 3);
}

// Branch of arg G nearest the exact phase −νθ, divided by it (1 at θ = 0).
function relSpeedOf(re, im, nu, theta) {
  const exactPhase = -nu * theta;
  if (exactPhase === 0) return 1;
  const phase = Math.atan2(im, re);
  return (phase + TWO_PI * Math.round((exactPhase - phase) / TWO_PI)) / exactPhase;
}

// Von Neumann amplification factor of a linear scheme for the mode e^{ijθ}.
// Returns { re, im, mag, phase, exactPhase, relSpeed, magMax, comp }:
//   phase = arg G ∈ (−π, π], exactPhase = −νθ; relSpeed = numerical/exact phase
//   speed, using the branch of arg G nearest −νθ (1 at θ = 0);
//   magMax = the largest |G| over all roots; comp = leapfrog's computational
//   root { re, im, mag, phase } (null otherwise).
// weno5 uses the optimal (linear) weights and opts.rk (default 3).
// Pass `out` (and keep it) to fill an existing object instead of allocating one,
// e.g. when redrawing a |G|(ν, θ) map. A 200 × 200 map is a few ms of trig, so
// recompute it when ν changes, not on every animation frame.
export function amplification(schemeId, nu, theta, opts = NO_OPTS, out = {}) {
  ampCore(schemeId, nu, theta, opts);
  const re = GBUF[0], im = GBUF[1];
  const mag = Math.hypot(re, im);
  out.re = re;
  out.im = im;
  out.mag = mag;
  out.phase = Math.atan2(im, re);
  out.exactPhase = -nu * theta;
  out.relSpeed = relSpeedOf(re, im, nu, theta);
  out.magMax = mag;
  if (!Number.isNaN(GBUF[2])) {
    const cr = GBUF[2], ci = GBUF[3], cm = Math.hypot(cr, ci);
    const comp = out.comp || (out.comp = { re: 0, im: 0, mag: 0, phase: 0 });
    comp.re = cr;
    comp.im = ci;
    comp.mag = cm;
    comp.phase = Math.atan2(ci, cr);
    if (cm > mag) out.magMax = cm;
  } else out.comp = null;
  return out;
}

// Relative phase speed (numerical / exact) of the mode θ = kΔx. No allocation.
export function relativePhaseSpeed(schemeId, nu, theta, opts = NO_OPTS) {
  ampCore(schemeId, nu, theta, opts);
  return relSpeedOf(GBUF[0], GBUF[1], nu, theta);
}

// max over θ ∈ [0, π] (m samples) of the largest root |G|. No allocation.
export function maxAmplification(schemeId, nu, m = 721, opts = NO_OPTS) {
  let best = 0;
  for (let k = 0; k < m; k++) {
    ampCore(schemeId, nu, (Math.PI * k) / (m - 1), opts);
    let g = Math.hypot(GBUF[0], GBUF[1]);
    if (!Number.isNaN(GBUF[2])) g = Math.max(g, Math.hypot(GBUF[2], GBUF[3]));
    if (g > best) best = g;
  }
  return best;
}

// ---------------------------------------------------------------- modified equation

// Leading terms of the modified equation u_t + a u_x = D u_xx + E u_xxx for a
// linear scheme (Warming & Hyett 1974; LeVeque 2002 §8.6), given the speed a,
// the grid spacing dx and the CFL number ν = aΔt/Δx (same sign as a).
// D > 0 is numerical diffusion (D < 0: anti-diffusion, instability); E is the
// dispersion coefficient: a Fourier mode e^{ik(x−ct)} travels at c = a + E k²
// to this order (E < 0: phase lag; E > 0: phase lead).
export function modifiedEquation(schemeId, a, dx, nu) {
  const A = Math.abs(a), sg = a < 0 ? -1 : 1, c = Math.abs(nu);
  const d1 = A * dx, d2 = A * dx * dx;
  let D, E;
  switch (schemeId) {
    case 'upwind': D = 0.5 * d1 * (1 - c); E = (-d2 / 6) * (1 - c) * (1 - 2 * c); break;
    case 'downwind': D = -0.5 * d1 * (1 + c); E = (-d2 / 6) * (1 + c) * (1 + 2 * c); break;
    case 'ftcs': D = -0.5 * d1 * c; E = (-d2 / 6) * (1 + 2 * c * c); break;
    case 'lxf': D = (d1 * (1 - c * c)) / (2 * c); E = (d2 / 3) * (1 - c * c); break;
    case 'lw': D = 0; E = (-d2 / 6) * (1 - c * c); break;
    case 'bw': D = 0; E = (d2 / 6) * (1 - c) * (2 - c); break;
    case 'fromm': D = 0; E = (d2 / 12) * (1 - c) * (1 - 2 * c); break;
    case 'leapfrog': D = 0; E = (-d2 / 6) * (1 - c * c); break;
    default: throw new Error(`advection: no modified equation for '${schemeId}'`);
  }
  return { D, E: sg * E, tex: SCHEMES[schemeId].modified };
}

// ---------------------------------------------------------------- convergence

// Run schemeId to time T on each grid in ns and measure the error against the
// exact solution. Returns { scheme, ns, nus, steps, errors, orders, norm },
// with orders[k] = log(e_k/e_{k+1}) / log(n_{k+1}/n_k).
// Events, inside one enter/leave span:
//   { t: 'op', op: 'step', k, n, s, steps }   progress: s of the grid's steps done.
//       Yielded every ~opts.chunk cell updates (default 16384, or 4096 for weno5,
//       about 0.15 ms of work in node), so sliced() can keep a frame budget
//       even on the fine grids of a WENO5 study, which take thousands of steps.
//   { t: 'iter', k, n, err, residual, nu, steps, l1, l2, linf }   one per grid.
//   nu: CFL number on the first grid (its sign is taken from opts.a); must be ≠ 0.
//   opts: a (default 1, ≠ 0), norm 'l1' | 'l2' | 'linf' (default 'l1'), sample,
//         dtExponent p (default 1): Δt ∝ Δx^p, i.e. ν_k = ν (n_0/n_k)^{p−1}.
//         Use p > 1 when the time error is lower order than the space error
//         (WENO5 + RK3: p = 5/3 makes Δt³ ∝ Δx⁵). Each grid takes a whole
//         number of steps N, so ν is rounded down to land exactly on T, and the
//         error is measured at t = T exactly (not at the round-off-accumulated t).
//         chunk: cell updates per progress event.
//         Any other opts are passed to step() (limiter, eps, rk, …).
export function* convergenceStudy(schemeId, nu, ns = [32, 64, 128, 256, 512], profile = 'sine', T = 1, opts = NO_OPTS) {
  const a = opts.a ?? 1, norm = opts.norm ?? 'l1', p = opts.dtExponent ?? 1;
  if (!(Math.abs(nu) > 0 && Number.isFinite(nu))) throw new Error('advection: convergenceStudy needs a finite ν ≠ 0');
  if (!(Math.abs(a) > 0 && Number.isFinite(a))) throw new Error('advection: convergenceStudy needs a finite a ≠ 0');
  if (!(T > 0 && Number.isFinite(T))) throw new Error('advection: convergenceStudy needs a finite T > 0');
  const chunk = opts.chunk ?? (schemeId === 'weno5' ? 4096 : 16384);
  const prof = makeProfile(profile);
  const errors = [], nus = [], steps = [];
  yield { t: 'enter', kind: 'convergence', label: `${schemeId}, ν = ${nu}`, scheme: schemeId, nu };
  for (let k = 0; k < ns.length; k++) {
    const n = ns[k];
    const st = createState(n, prof, { a, sample: opts.sample });
    const target = Math.abs(nu) * Math.pow(ns[0] / n, p - 1);
    const N = Math.max(1, Math.ceil((Math.abs(a) * T * n) / target - 1e-9));
    const nuK = (a < 0 ? -1 : 1) * (Math.abs(a) * T * n) / N;
    const per = Math.max(1, Math.floor(chunk / n));
    for (let s = 1; s <= N; s++) {
      step(st, schemeId, nuK, opts);
      if (s % per === 0 && s < N) yield { t: 'op', op: 'step', k, n, s, steps: N };
    }
    st.t = T; // N Δt = T by construction
    const d = diagnostics(st);
    errors.push(d[norm]);
    nus.push(nuK);
    steps.push(N);
    yield { t: 'iter', k, n, err: d[norm], residual: d[norm], nu: nuK, steps: N, l1: d.l1, l2: d.l2, linf: d.linf };
  }
  yield { t: 'leave', kind: 'convergence' };
  const orders = [];
  for (let k = 0; k + 1 < ns.length; k++) orders.push(Math.log(errors[k] / errors[k + 1]) / Math.log(ns[k + 1] / ns[k]));
  return { scheme: schemeId, ns: ns.slice(), nus, steps, errors, orders, norm };
}
