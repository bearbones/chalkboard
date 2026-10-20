// D2Q9 lattice Boltzmann kernel: BGK and TRT collision, Guo forcing, half-way
// bounce-back (stationary obstacles from an arbitrary mask, moving walls),
// velocity inlets (Zou-He, regularized, equilibrium, non-equilibrium
// extrapolation), four outlet treatments, periodic sides, and the
// presets the course figures use (cylinder, lid-driven cavity, Poiseuille,
// Taylor-Green, a double shear layer for the stability lesson, and the hero
// von Karman street).
//
// The state is a set of nine particle populations f_q per cell. One time step
// is "collide, then stream": each cell relaxes its populations towards a local
// equilibrium, then every population hops one cell along its lattice velocity.
// Boundary conditions fill the populations that would have come from outside.
//
// Conventions
//   - Lattice units throughout: dx = dt = 1, reference density rho0 = 1.
//     Speed of sound c_s = 1/sqrt(3) (c_s^2 = 1/3); kinematic viscosity
//     nu = c_s^2 (tau - 1/2) = (tau - 1/2)/3. Mach number Ma = |u|/c_s.
//     To map to physical units pick a length L (cells) and speed U (lattice):
//     Re = U L / nu is the only number the flow knows about.
//   - Cell (i, j) has flat index c = i + j*nx, j = 0 at the bottom. Its centre
//     is at x = i + 1/2, y = j + 1/2, so the domain is [0, nx] x [0, ny].
//   - Velocities (Krueger et al. 2017 ordering): q = 0 rest; 1..4 = E, N, W, S;
//     5..8 = NE, NW, SW, SE. Weights 4/9, 1/9, 1/36. opp[q] is the reverse.
//   - Populations are stored structure-of-arrays: f[q*N + c], N = nx*ny.
//   - Body force (Guo): macroscopic velocity is u = (sum_q f_q c_q + F/2)/rho.
//   - Walls on a domain side sit half a cell outside the edge nodes (at x = 0,
//     x = nx, y = 0, y = ny): that is where half-way bounce-back puts them.
//     Solid mask cells are obstacles; their walls sit half-way between a solid
//     and a fluid cell centre.
//
// Schemes and sources
//   - D2Q9 lattice and second-order equilibrium: Qian, d'Humieres & Lallemand,
//     Europhys. Lett. 17 (1992) 479; Krueger et al., "The Lattice Boltzmann
//     Method: Principles and Practice", Springer 2017, ch. 3.
//     f^eq_q = w_q rho [1 + 3 c.u + 9/2 (c.u)^2 - 3/2 u.u].
//   - BGK collision (Bhatnagar, Gross & Krook 1954; Qian et al. 1992):
//     f*_q = f_q - (f_q - f^eq_q)/tau.  Viscosity from Chapman-Enskog
//     (Krueger ch. 4): nu = (tau - 1/2)/3.
//   - TRT collision: Ginzburg, Verhaeghe & d'Humieres, Commun. Comput. Phys.
//     3 (2008) 427; Krueger ch. 10. Populations split into symmetric and
//     antisymmetric parts f+-_q = (f_q +- f_opp(q))/2, relaxed at omega+ = 1/tau
//     (sets nu) and omega- = 1/tau-, with the "magic parameter"
//     Lambda = (tau - 1/2)(tau- - 1/2). Lambda = 1/4 is the usual stability
//     choice; Lambda = 3/16 puts the bounce-back wall exactly half-way for
//     Poiseuille flow (exact parabola for any tau). BGK is TRT with
//     omega- = omega+, i.e. Lambda = (tau - 1/2)^2, and this file runs BGK
//     through the same code path that way (algebraically identical).
//   - Guo forcing: Guo, Zheng & Shi, Phys. Rev. E 65 (2002) 046308; Krueger
//     ch. 6. Source S_q = w_q [3 (c_q - u) + 9 (c_q.u) c_q].F, added as
//     (1 - omega/2) S_q. For TRT its symmetric and antisymmetric parts get
//     (1 - omega+/2) and (1 - omega-/2) respectively.
//   - Half-way bounce-back and the moving-wall correction
//     f_opp(q)(x, t+1) = f*_q(x, t) - 6 w_q rho_w c_q.u_w (Ladd, J. Fluid Mech.
//     271 (1994) 285; Krueger ch. 5). Deviation: rho_w is taken as rho0 rather
//     than the local density, which keeps the correction a precomputed table
//     entry; with tangential wall motion the corrections cancel in each cell,
//     so mass is still conserved exactly.
//   - Zou-He velocity and pressure (density) boundaries: Zou & He, Phys.
//     Fluids 9 (1997) 1591; Krueger ch. 5. Written for any side via the
//     outward normal n and tangent t:
//     rho = (sum_{c.n=0} f + 2 sum_{c.n>0} f)/(1 + u.n),
//     f_q = f_opp(q) + 6 w_q rho c_q.u + (c_q.t) N_t for each unknown q (c_q.n<0),
//     N_t = -1/2 sum_{c.n=0} (c.t) f + rho (u.t)/3.
//   - Regularized velocity/pressure boundary: Latt & Chopard, Math. Comput.
//     Simul. 72 (2006) 165; Latt et al., Phys. Rev. E 77 (2008) 056703. Take
//     the Zou-He populations, compute Pi^neq = sum_q c_q c_q (f_q - f^eq_q),
//     and rebuild all nine as f_q = f^eq_q + (9/2) w_q Q_q : Pi^neq with
//     Q_q = c_q c_q - c_s^2 I. This drops the ghost (non-hydrodynamic) part
//     that plain Zou-He bounces back into the domain.
//   - Equilibrium inlet: f_q = f^eq_q(rho, u) for all nine (Krueger ch. 5,
//     first order; 'rho' fixed if the side gives one, else the neighbour's).
//   - Non-equilibrium extrapolation: Guo, Zheng & Shi, Chinese Phys. 11 (2002)
//     366. f_q = f^eq_q(rho_b, u_b) + [f_q - f^eq_q](neighbour), for all nine
//     populations; the inlet prescribes u_b (rho_b from the neighbour), the
//     'extrapolation' outlet prescribes rho_b (u_b from the neighbour).
//   - Outlets: 'zero-gradient' copies the unknown populations from the
//     neighbouring column (first-order extrapolation, Krueger ch. 5);
//     'convective' solves df/dt + U_c df/dn = 0 for them with U_c the mean
//     outflow speed (Orlanski, J. Comput. Phys. 21 (1976) 251; for LBM see
//     Yang, Comput. Math. Appl. 65 (2013) 160); 'pressure' is Zou-He (or
//     regularized) at fixed density with zero tangential velocity;
//     'extrapolation' is the non-equilibrium extrapolation above at fixed
//     density. Deviation: at a 'zero-gradient' or 'convective' outlet node
//     next to a wall, populations the wall's bounce-back has already supplied
//     are not overwritten.
//   - Pressure anchor (measured with this file): a velocity inlet plus a
//     'zero-gradient' or 'convective' outlet fixes no density anywhere. With
//     periodic top/bottom that is harmless (the hero preset: mass within
//     0.1% over 200k steps), but in a walled channel the pressure drop that
//     drives the flow against wall friction has nothing to push on and the
//     mean density creeps up (+13% over 100k steps at Re 200, +47% and a
//     health failure by 56k steps at Re 20). A fixed-density outlet
//     ('extrapolation' or 'pressure') anchors it; the walled cylinder preset
//     uses 'extrapolation' and stays within 0.5% (100k steps, Re 20-200).
//   - Momentum-exchange force on obstacles: F = sum over solid links of
//     2 f*_q c_q (Ladd 1994; Mei, Yu, Shyy & Luo, Phys. Rev. E 65 (2002) 041203).
//   - Streaming patterns (Krueger ch. 13): 'fused' collides and pushes to a
//     second array in one sweep (A-B pattern); 'split' collides in place,
//     then streams in a second sweep. Both give bit-identical results.
//
// Stability and accuracy (what the chapter can say; "measured" means with
// this file, in the tests or with the runs quoted in PRESETS)
//   - tau -> 1/2 means nu -> 0. On a fixed grid the grid Reynolds number
//     U dx / nu = 3U/(tau - 1/2) grows without bound and the scheme
//     eventually goes unstable; neither collision makes an under-resolved
//     flow accurate. tau <= 1/2 (nu <= 0) and a TRT Lambda <= 0 are rejected.
//   - Whether TRT is "more stable" than BGK depends on where the trouble
//     starts (PRESETS.*.cases holds each configuration):
//       * Hero cylinder (Re 150, tau = 0.519) with a Zou-He inlet: BGK blows
//         up at the inlet column within ~200 steps; TRT survives
//         indefinitely. A likely reading (not proven here): Zou-He bounces
//         the non-equilibrium part back unchanged, ghost moments included,
//         and BGK damps those no faster than the stress.
//       * Same flow with a regularized inlet: BGK is fine and TRT is the one
//         that fails (~1000 steps). Hence inlet method 'auto' picks zou-he
//         under TRT and regularized under BGK.
//       * Periodic double shear layer (no boundaries): here BGK is the more
//         robust. At n = 32, BGK fails for tau <= 0.502 and survives 0.505,
//         where TRT fails for every Lambda tried (1/6, 3/16, 1/4); at n = 64
//         BGK fails only for tau <= 0.501, TRT (Lambda = 1/4) already at
//         0.505. With Lambda fixed, tau- = 1/2 + Lambda/(tau - 1/2) grows
//         without bound as tau -> 1/2, so the odd moments barely relax,
//         whereas BGK relaxes them at the same rate as the stress. What
//         rescues the shear layer is resolution (n = 64 survives tau = 0.502
//         under BGK), not the collision operator.
//       * Lambda = 1/4 is the usual default, recommended for stability
//         (Krueger ch. 10); for TRT advection-diffusion a linear stability
//         analysis finds it optimal (Kuzmin, Ginzburg & Mohamad, Comput.
//         Math. Appl. 61 (2011) 3417). That is a linear result, not a
//         guarantee for Navier-Stokes flows: in these nonlinear runs with
//         open boundaries it was not always the
//         most robust: the walled cylinder at Re = 200 (tau = 0.514) under
//         TRT fails at the inlet corner after ~7300 steps with Lambda = 1/4
//         (sooner with 1/12 or 1/2) but ran 100k steps with 3/16, and an
//         earlier hero setting (U = 0.1, Re 200) failed after ~5500 steps
//         with 1/4 and not with 3/16. Both cylinder presets use 3/16.
//   - Compressibility error grows like Ma^2 (tested on Taylor-Green). Keep
//     the free-stream Ma <= ~0.15 (|u| <= ~0.08) for incompressible work:
//     local speeds next to a cylinder run up to ~2x the free stream. health()
//     warns above Ma = 0.3 (|u| ~ 0.17) and fails above Ma = 1.
//   - Positivity of the equilibrium: it is a low-Mach expansion, and every
//     f^eq_q >= 0 exactly while |u| <= c_s (Ma <= 1). Beyond that, the
//     population with c_q.u = -1/3 (for f_S: flow 35.3 degrees above the x
//     axis) is w_q rho (1/2 - 3|u|^2/2) < 0. Only f^eq_0 lasts until
//     Ma = sqrt(2). This is why health()'s machBad defaults to 1.
//   - Half-way bounce-back is second order for grid-aligned walls
//     (Poiseuille, the cavity). An obstacle built from cells (addDisk,
//     painting) is a staircase whose wall is only located to O(dx), so for
//     curved walls the method is first order; interpolated bounce-back
//     (Bouzidi, Firdaouss & Lallemand, Phys. Fluids 13 (2001) 3452) restores
//     second order and is not implemented here.
//   - The 'pressure' outlet (Zou-He or regularized at fixed density) leaves
//     an undamped period-2 velocity oscillation in its last few columns
//     after a start-up transient (measured: 2.7% of U at the outlet node of
//     a 30-cell channel, shrinking ~1.7x per column inward, unchanged from
//     40k to 80k steps). D2Q9 conserves a staggered momentum
//     sum_x (-1)^(x+t) j_x in the interior (collision keeps j_x, and every
//     population that carries x-momentum moves exactly one column per
//     step), so only a boundary can remove it; this one does not. The
//     'extrapolation' outlet, which takes u from the neighbour, damps it.
//
// Obstacles next to open sides (a deviation, for figures that let readers
// draw): a fluid edge node whose inward neighbour is solid can neither take
// an inflow nor extrapolate from its neighbour, so rebuildLinks gives its open
// face stationary half-way bounce-back instead (mass-conserving, identical
// under both streaming patterns), and setSolid/initEquilibrium start it at
// rest. What drawing can still do is physical, and health() reports it
// (measured with the cylinder and hero presets, tau ~ 0.52):
//   - blocking more than about half the cross-section anywhere forces jets
//     through the gap at Ma ~ 0.3-0.6 and blows up within ~200-1400 steps
//     (30 of 72 rows blocked: healthy; 40-60 rows: fails);
//   - near a velocity inlet it happens within tens of steps, because the
//     inlet keeps pushing its whole flux into the blockage (a 20-cell stroke
//     3-4 columns in, or a 40-cell stroke 6-16 columns in); short strokes
//     (4-8 cells) are fine from column 1 on, except that TRT with a Zou-He
//     inlet fails ~3300 steps after a 4-cell stroke in column 2 (one fluid
//     cell between inlet node and obstacle).
// Widgets that let readers draw should cap the blocked fraction, keep a
// margin from the inlet, and announce health().
//
// Corners: where a link crosses two domain sides, a wall wins over an open or
// periodic side, and the top/bottom wall wins over a left/right one (so a
// moving lid owns the corner nodes; this keeps mass exactly conserved).

import { clamp } from './util.js';

const CX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
const CY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
const W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6];
const CXF = Float64Array.from(CX);
const CYF = Float64Array.from(CY);

const SOLID = -2;
const INTERIOR = -1;
const W0 = 4 / 9;
const W1 = 1 / 9;
const W2 = 1 / 36;

export const CS2 = 1 / 3;

export const D2Q9 = Object.freeze({
  q: 9,
  cx: CX,
  cy: CY,
  w: W,
  opp: OPP,
  cs2: 1 / 3,
  names: ['rest', 'E', 'N', 'W', 'S', 'NE', 'NW', 'SW', 'SE'],
});

export const COLLISIONS = Object.freeze({
  bgk: {
    id: 'bgk',
    name: 'BGK (single relaxation time)',
    description: 'Every population relaxes towards equilibrium at the same rate 1/tau.',
    tex: 'f_q^{*} = f_q - \\frac{1}{\\tau}\\left(f_q - f_q^{\\mathrm{eq}}\\right) + \\left(1 - \\frac{1}{2\\tau}\\right) S_q',
    viscosity: '\\nu = c_s^2\\left(\\tau - \\tfrac{1}{2}\\right) = \\tfrac{1}{3}\\left(\\tau - \\tfrac{1}{2}\\right)',
    order: 2,
    stability: 'tau > 1/2 is necessary (enforced); as tau -> 1/2 the stable velocity range shrinks and under-resolved flows blow up.',
  },
  trt: {
    id: 'trt',
    name: 'TRT (two relaxation times)',
    description: 'Even and odd parts of each population pair relax at different rates; the magic parameter Lambda ties them.',
    tex: 'f_q^{*} = f_q - \\omega^{+}\\left(f_q^{+} - f_q^{\\mathrm{eq}+}\\right) - \\omega^{-}\\left(f_q^{-} - f_q^{\\mathrm{eq}-}\\right),\\quad \\Lambda = \\left(\\tfrac{1}{\\omega^{+}} - \\tfrac{1}{2}\\right)\\left(\\tfrac{1}{\\omega^{-}} - \\tfrac{1}{2}\\right)',
    viscosity: '\\nu = \\tfrac{1}{3}\\left(\\tfrac{1}{\\omega^{+}} - \\tfrac{1}{2}\\right)',
    order: 2,
    stability: 'Needs tau > 1/2 and Lambda > 0. Lambda = 1/4 is the usual default (optimal in linear stability analyses, e.g. Kuzmin, Ginzburg & Mohamad 2011 for advection-diffusion); in nonlinear runs it is not always the most robust (measured here: 3/16 outlived 1/4 for cylinders with open boundaries, and in a periodic shear layer near tau = 1/2 BGK outlived every Lambda tried). Lambda = 3/16 makes bounce-back walls exact for Poiseuille flow.',
  },
});

export const STREAMING = Object.freeze({
  fused: { id: 'fused', name: 'Fused collide-and-push', description: 'One sweep: collide a cell, push its nine post-collision populations into the second array.' },
  split: { id: 'split', name: 'Collide, then stream', description: 'Two sweeps: collide in place, then copy every population one cell along its velocity into the second array. Same numbers, slower, shows the two halves.' },
});

export const BOUNDARIES = Object.freeze({
  periodic: { id: 'periodic', name: 'Periodic', description: 'Leaving one side re-enters the opposite side. Must be set on both opposite sides.' },
  wall: { id: 'wall', name: 'Wall (half-way bounce-back)', description: 'No-slip wall half a cell outside the edge nodes; optional tangential velocity u for a moving lid.', tex: 'f_{\\bar q}(\\mathbf{x}, t+1) = f_q^{*}(\\mathbf{x}, t) - 6 w_q \\rho_w\\, \\mathbf{c}_q\\cdot\\mathbf{u}_w' },
  velocity: {
    id: 'velocity',
    name: 'Velocity inlet',
    description: "Prescribed velocity u (uniform or parabolic profile, optional cosine ramp over 'ramp' steps). The method decides what happens to the non-equilibrium part at the edge nodes.",
    methods: {
      auto: "Default: 'zou-he' under TRT, 'regularized' under BGK, the stable pairing for each (measured, see header).",
      'zou-he': 'Zou & He 1997: bounce back the non-equilibrium part. Exact velocity, second order. Near tau = 1/2 it destabilises BGK; TRT copes.',
      regularized: 'Latt & Chopard 2006: Zou-He, then keep only the stress part of the non-equilibrium. Exact velocity; stable with BGK near tau = 1/2, but destabilises TRT there.',
      equilibrium: "All nine populations set to f^eq(rho, u), rho = the side's 'rho' if given, else the neighbour's density. First order, damps sound waves; like regularized, stable with BGK and not with TRT near tau = 1/2.",
      extrapolation: "Guo, Zheng & Shi 2002 (non-equilibrium extrapolation): f = f^eq(rho_neighbour, u) + (f - f^eq) copied from the neighbour. Stable with BGK; not with TRT near tau = 1/2.",
    },
  },
  outlet: {
    id: 'outlet',
    name: 'Outlet',
    description: "What fills the populations entering through an open side. Only the two fixed-density modes anchor the pressure: in a walled channel the others let the mean density drift (see header).",
    modes: {
      'zero-gradient': 'Copy the unknown populations from the neighbour column. Simple, fine with periodic sides; drifts in a walled channel.',
      convective: 'Orlanski-type df/dt + U_c df/dn = 0: fewer reflected vortices; still no pressure anchor.',
      pressure: "Zou-He (or regularized, by 'method') at fixed density 'rho', zero tangential velocity. Anchors pressure, but leaves an undamped period-2 (every other step) velocity oscillation in the last few columns after a transient; vortices crossing it can destabilise BGK at high Re. Prefer 'extrapolation'.",
      extrapolation: "Non-equilibrium extrapolation (Guo, Zheng & Shi 2002) at fixed density 'rho', velocity from the neighbour. Anchors pressure and passes vortices; the cylinder preset's default.",
    },
  },
});

// Every scheme in this file in one table, for figure captions and formula
// cards: id, name, description, tex (KaTeX source), order (formal accuracy),
// stability (what was measured or is known), cite.
export const SCHEMES = Object.freeze({
  equilibrium: {
    id: 'equilibrium', name: 'D2Q9 equilibrium', order: 2,
    description: 'The second-order (low-Mach) Maxwell-Boltzmann expansion: its first three moments are rho, rho u and rho c_s^2 I + rho u u exactly.',
    tex: 'f_q^{\\mathrm{eq}} = w_q\\rho\\left[1 + \\frac{\\mathbf{c}_q\\cdot\\mathbf{u}}{c_s^2} + \\frac{(\\mathbf{c}_q\\cdot\\mathbf{u})^2}{2c_s^4} - \\frac{\\mathbf{u}\\cdot\\mathbf{u}}{2c_s^2}\\right]',
    stability: 'Compressibility error ~ Ma^2. Every f^eq_q >= 0 exactly while |u| <= c_s (Ma <= 1); beyond that the population with c_q.u = -1/3 goes negative (f_0^eq alone would last to Ma = sqrt 2).',
    cite: 'Qian, d\'Humieres & Lallemand (1992); Krueger et al. (2017) ch. 3',
  },
  bgk: { ...COLLISIONS.bgk, cite: 'Bhatnagar, Gross & Krook (1954); Qian et al. (1992); Krueger et al. (2017) ch. 3-4' },
  trt: { ...COLLISIONS.trt, cite: 'Ginzburg, Verhaeghe & d\'Humieres (2008); Krueger et al. (2017) ch. 10' },
  guo: {
    id: 'guo', name: 'Guo forcing', order: 2,
    description: 'A body force enters as a source term and as half a step of momentum in the velocity, so the recovered momentum equation has no spurious terms.',
    tex: 'S_q = w_q\\left[\\frac{\\mathbf{c}_q - \\mathbf{u}}{c_s^2} + \\frac{(\\mathbf{c}_q\\cdot\\mathbf{u})\\,\\mathbf{c}_q}{c_s^4}\\right]\\cdot\\mathbf{F},\\qquad \\rho\\mathbf{u} = \\sum_q f_q\\mathbf{c}_q + \\tfrac{1}{2}\\mathbf{F}',
    stability: 'Adds exactly F of momentum per cell per step.',
    cite: 'Guo, Zheng & Shi, Phys. Rev. E 65 (2002) 046308; Krueger et al. (2017) ch. 6',
  },
  'bounce-back': {
    id: 'bounce-back', name: 'Half-way bounce-back', order: 2, orderCurved: 1,
    description: 'A population that would enter a wall comes back reversed in the same step; the wall sits half-way between nodes. A moving wall adds a momentum correction. Second order for grid-aligned walls; an obstacle built from cells is a staircase, so curved walls are first order (interpolated bounce-back, Bouzidi et al. 2001, restores second order; not used here).',
    tex: BOUNDARIES.wall.tex,
    stability: 'Unconditionally stable; the effective wall position depends on tau under BGK and is exactly half-way under TRT with Lambda = 3/16 (Poiseuille).',
    cite: 'Ladd, J. Fluid Mech. 271 (1994) 285; Ginzburg et al. (2008); Krueger et al. (2017) ch. 5; Bouzidi, Firdaouss & Lallemand, Phys. Fluids 13 (2001) 3452',
  },
  'zou-he': {
    id: 'zou-he', name: 'Zou-He velocity/pressure boundary', order: 2,
    description: 'Solve for the unknown populations so that density and velocity at the edge node are exact, bouncing back the non-equilibrium part.',
    tex: '\\rho = \\frac{\\sum_{\\mathbf{c}\\cdot\\mathbf{n}=0} f + 2\\sum_{\\mathbf{c}\\cdot\\mathbf{n}>0} f}{1 + \\mathbf{u}\\cdot\\mathbf{n}},\\qquad f_q = f_{\\bar q} + 6 w_q\\rho\\,\\mathbf{c}_q\\cdot\\mathbf{u} + (\\mathbf{c}_q\\cdot\\mathbf{t})\\,N_t',
    stability: 'As an inlet: fine with TRT; with BGK near tau = 1/2 the inlet column is where a cylinder run blows up (measured). As a fixed-density outlet it leaves an undamped period-2 velocity oscillation in the last few columns (measured: 2.7% of U at the outlet node).',
    cite: 'Zou & He, Phys. Fluids 9 (1997) 1591; Krueger et al. (2017) ch. 5',
  },
  regularized: {
    id: 'regularized', name: 'Regularized boundary', order: 2,
    description: 'Zou-He, then rebuild all nine populations from equilibrium plus the stress (Pi^neq) part only, discarding the ghost moments.',
    tex: 'f_q = f_q^{\\mathrm{eq}} + \\frac{w_q}{2c_s^4}\\,\\mathbf{Q}_q:\\boldsymbol{\\Pi}^{\\mathrm{neq}},\\qquad \\mathbf{Q}_q = \\mathbf{c}_q\\mathbf{c}_q - c_s^2\\mathbf{I}',
    stability: 'Stable with BGK near tau = 1/2; destabilises TRT there (measured).',
    cite: 'Latt & Chopard, Math. Comput. Simul. 72 (2006) 165; Latt et al., Phys. Rev. E 77 (2008) 056703',
  },
  extrapolation: {
    id: 'extrapolation', name: 'Non-equilibrium extrapolation', order: 2,
    description: 'Equilibrium at the boundary values plus the non-equilibrium part copied from the neighbour node. Used as an inlet (fixed u) or outlet (fixed rho).',
    tex: 'f_q(\\mathbf{x}_b) = f_q^{\\mathrm{eq}}(\\rho_b, \\mathbf{u}_b) + \\left[f_q - f_q^{\\mathrm{eq}}\\right](\\mathbf{x}_f)',
    stability: 'As a fixed-density outlet: stable with BGK and TRT (walled cylinder, Re 20-200, 100k steps). As a velocity inlet: stable with BGK, unstable with TRT near tau = 1/2 (measured).',
    cite: 'Guo, Zheng & Shi, Chinese Phys. 11 (2002) 366',
  },
  'zero-gradient': {
    id: 'zero-gradient', name: 'Zero-gradient outlet', order: 1,
    description: 'Copy the unknown populations from the neighbour column.',
    tex: 'f_q(\\mathbf{x}_b) = f_q(\\mathbf{x}_b - \\mathbf{n})',
    stability: 'Stable, but fixes no density: in a walled channel the mean density drifts upward (measured +4% per 1000 steps on a small channel).',
    cite: 'Krueger et al. (2017) ch. 5',
  },
  convective: {
    id: 'convective', name: 'Convective outlet', order: 1,
    description: 'Advect the unknown populations out at the mean outflow speed so vortices leave with fewer reflections.',
    tex: '\\partial_t f_q + U_c\\,\\partial_n f_q = 0',
    stability: 'Stable; like zero-gradient it fixes no density (slower drift).',
    cite: 'Orlanski, J. Comput. Phys. 21 (1976) 251; Yang, Comput. Math. Appl. 65 (2013) 160',
  },
});

// ---------------------------------------------------------------------------
// Small helpers

// Kinematic viscosity of relaxation time tau, and the inverse.
export function viscosity(tau) {
  return (tau - 0.5) / 3;
}
export function tauFromViscosity(nu) {
  return 0.5 + 3 * nu;
}

// Relaxation time for a target Reynolds number with speed U and length L
// (both in lattice units).
export function suggestTau(Re, U, L) {
  return 0.5 + (3 * U * L) / Re;
}

// Reynolds number U L / nu of a running simulation.
export function reynolds(lbm, U, L) {
  return (U * L) / viscosity(lbm.tau);
}

// TRT antisymmetric relaxation time for a given tau and magic parameter.
export function tauMinus(tau, magic) {
  return 0.5 + magic / (tau - 0.5);
}

// Second-order equilibrium of one cell into out[0..8].
export function equilibrium(rho, ux, uy, out = new Float64Array(9)) {
  const usq = 1.5 * (ux * ux + uy * uy);
  for (let q = 0; q < 9; q++) {
    const cu = CX[q] * ux + CY[q] * uy;
    out[q] = W[q] * rho * (1 + 3 * cu + 4.5 * cu * cu - usq);
  }
  return out;
}

const SIDE_NAMES = ['left', 'right', 'bottom', 'top'];

function normaliseSide(spec, rho0) {
  const s = typeof spec === 'string' ? { type: spec } : { ...(spec || { type: 'periodic' }) };
  if (!BOUNDARIES[s.type]) throw new Error(`lbm: unknown boundary type '${s.type}'`);
  if (s.type === 'wall') s.u = s.u ? [s.u[0], s.u[1]] : [0, 0];
  if (s.type === 'velocity') {
    s.u = s.u ? [s.u[0], s.u[1]] : [0.1, 0];
    s.profile = s.profile || 'uniform';
    s.method = s.method || 'auto';
    if (!['auto', 'zou-he', 'regularized', 'equilibrium', 'extrapolation'].includes(s.method)) throw new Error(`lbm: unknown inlet method '${s.method}'`);
    s.ramp = s.ramp || 0;
  }
  if (s.type === 'outlet') {
    s.mode = s.mode || 'zero-gradient';
    if (!['zero-gradient', 'convective', 'pressure', 'extrapolation'].includes(s.mode)) throw new Error(`lbm: unknown outlet mode '${s.mode}'`);
    s.rho = s.rho ?? rho0;
    s.method = s.method || 'auto'; // pressure mode only: 'auto' | 'zou-he' | 'regularized'
    if (!['auto', 'zou-he', 'regularized'].includes(s.method)) throw new Error(`lbm: unknown pressure-outlet method '${s.method}'`);
  }
  return s;
}

function sideGeometry(name, nx, ny) {
  // n = outward normal, t = tangent (+x or +y), nodes c = start + k*stride.
  const g = {
    left: { n: [-1, 0], t: [0, 1], len: ny, start: 0, stride: nx, inward: 1 },
    right: { n: [1, 0], t: [0, 1], len: ny, start: nx - 1, stride: nx, inward: -1 },
    bottom: { n: [0, -1], t: [1, 0], len: nx, start: 0, stride: 1, inward: nx },
    top: { n: [0, 1], t: [1, 0], len: nx, start: (ny - 1) * nx, stride: 1, inward: -nx },
  }[name];
  const unknown = [], zero = [], out = [];
  for (let q = 0; q < 9; q++) {
    const cn = CX[q] * g.n[0] + CY[q] * g.n[1];
    (cn < 0 ? unknown : cn === 0 ? zero : out).push(q);
  }
  return { name, ...g, unknown: Int32Array.from(unknown), zero: Int32Array.from(zero), out: Int32Array.from(out) };
}

// ---------------------------------------------------------------------------
// Construction

// createLBM({ nx, ny, tau, collision, magic, streaming, rho0, force,
//             forceField, boundaries: { left, right, bottom, top }, solid,
//             ux0, uy0 })
//   collision 'bgk' | 'trt'; magic = TRT Lambda (1/4 default);
//   streaming 'fused' | 'split'; force = [Fx, Fy] uniform body force (Guo);
//   forceField: true allocates per-cell fx, fy arrays added to it;
//   boundaries: each side a type name or { type, ... } (see BOUNDARIES),
//   default all periodic; solid: Uint8Array(nx*ny) obstacle mask.
// Starts at equilibrium with density rho0 and uniform velocity (ux0, uy0).
export function createLBM(opts = {}) {
  const nx = opts.nx ?? 64;
  const ny = opts.ny ?? 64;
  const N = nx * ny;
  const rho0 = opts.rho0 ?? 1;
  const b = opts.boundaries || {};
  const sides = {};
  for (const s of SIDE_NAMES) sides[s] = normaliseSide(b[s], rho0);
  if ((sides.left.type === 'periodic') !== (sides.right.type === 'periodic')) throw new Error('lbm: left and right must both be periodic or neither');
  if ((sides.bottom.type === 'periodic') !== (sides.top.type === 'periodic')) throw new Error('lbm: bottom and top must both be periodic or neither');
  const streaming = opts.streaming || 'fused';
  if (!STREAMING[streaming]) throw new Error(`lbm: unknown streaming '${streaming}'`);

  const par = new Float64Array(4); // omega+, omega-, Fx, Fy (typed: the kernel stays monomorphic)
  const L = {
    nx, ny, N, t: 0, rho0,
    tau: 0, collision: 'bgk', magic: 0.25, omegaPlus: 0, omegaMinus: 0, tauMinus: 0,
    streaming,
    par,
    bodyForce: par.subarray(2, 4), // [Fx, Fy], uniform body force; write to it freely (the macroscopic cache notices)
    fx: new Float64Array(opts.forceField ? N : 0), // per-cell force, added to bodyForce; after writing it, call macroscopic()
    fy: new Float64Array(opts.forceField ? N : 0),
    f: new Float64Array(9 * N),
    fn: new Float64Array(9 * N),
    rho: new Float64Array(N),
    ux: new Float64Array(N),
    uy: new Float64Array(N),
    macroT: -1, // time step that rho/ux/uy were last filled for (-1: stale)
    macroF: new Float64Array(2), // the uniform body force they were filled with
    solid: new Uint8Array(N),
    link: new Int32Array(N),
    dst: null, corr: null, obst: null, rows: 0,
    linksDirty: true,
    sides,
    open: [],
    obstacleForce: new Float64Array(2), // momentum-exchange force on the solid mask, last step
    meta: {},
    _g: new Float64Array(9),
    _scratch2: new Float64Array(2),
  };
  if (opts.force) setBodyForce(L, opts.force[0], opts.force[1]);
  if (opts.solid) L.solid.set(opts.solid);
  for (const name of SIDE_NAMES) {
    const s = sides[name];
    if (s.type === 'velocity' || s.type === 'outlet') {
      const g = sideGeometry(name, nx, ny);
      // At a corner node an "unknown" population may already have come back
      // from the adjacent wall by bounce-back; the outlet must leave it alone
      // or the wall stops conserving mass.
      const fromWall = new Uint8Array(3 * g.len);
      for (let k = 0; k < g.len; k++) {
        const c = g.start + k * g.stride, i = c % nx, j = (c / nx) | 0;
        for (let m = 0; m < 3; m++) {
          const q = g.unknown[m], si = i - CX[q], sj = j - CY[q];
          const yWall = (sj < 0 && sides.bottom.type === 'wall') || (sj >= ny && sides.top.type === 'wall');
          const xWall = (si < 0 && sides.left.type === 'wall') || (si >= nx && sides.right.type === 'wall');
          fromWall[3 * k + m] = yWall || xWall ? 1 : 0;
        }
      }
      // blocked[k] = 1 when edge node k is fluid but its inward neighbour is
      // solid (an obstacle drawn against the open side): rebuildLinks turns
      // that node's open face into a bounce-back wall and applyBoundaries
      // leaves it alone.
      L.open.push({ side: s, g, fromWall, blocked: new Uint8Array(g.len), prev: s.mode === 'convective' ? new Float64Array(3 * g.len) : null, prevInit: false });
    }
  }
  setCollision(L, { tau: opts.tau ?? 0.8, collision: opts.collision || 'bgk', magic: opts.magic ?? 0.25 });
  rebuildLinks(L);
  initEquilibrium(L, { rho: rho0, ux: opts.ux0 ?? 0, uy: opts.uy0 ?? 0 });
  return L;
}

// Change relaxation time, collision operator or magic parameter on the fly.
export function setCollision(L, { tau = L.tau, collision = L.collision, magic = L.magic } = {}) {
  if (!COLLISIONS[collision]) throw new Error(`lbm: unknown collision '${collision}'`);
  // tau = 1/2 is zero viscosity and tau < 1/2 negative viscosity: no flow
  // the course models, and Re = U L / nu would read Infinity or < 0.
  if (!(tau > 0.5 && Number.isFinite(tau))) throw new RangeError(`lbm: tau must be > 1/2 (nu = (tau - 1/2)/3 > 0), got ${tau}`);
  // Lambda <= 0 would give omega- >= 2 (odd moments never damped) or a
  // negative tau-.
  if (collision === 'trt' && !(magic > 0 && Number.isFinite(magic))) throw new RangeError(`lbm: TRT magic parameter must be > 0, got ${magic}`);
  L.tau = tau;
  L.collision = collision;
  L.magic = magic;
  L.omegaPlus = 1 / tau;
  if (collision === 'bgk') {
    L.tauMinus = tau;
    L.omegaMinus = L.omegaPlus;
  } else {
    L.tauMinus = tauMinus(tau, magic);
    L.omegaMinus = 1 / L.tauMinus;
  }
  L.par[0] = L.omegaPlus;
  L.par[1] = L.omegaMinus;
  return L;
}

// Uniform body force (Guo forcing), lattice units: momentum per cell per step.
export function setBodyForce(L, Fx, Fy = 0) {
  L.par[2] = Fx;
  L.par[3] = Fy;
  L.macroT = -1;
  return L;
}

// Effective magic parameter of the current collision (BGK: (tau - 1/2)^2).
export function magicOf(L) {
  return (L.tau - 0.5) * (L.tauMinus - 0.5);
}

// Fill f with the equilibrium of the given fields. Each of rho, ux, uy is a
// number, an array of nx*ny values, or a function (x, y, i, j) of the cell
// centre. Solid cells get u = 0.
export function initEquilibrium(L, { rho = L.rho0, ux = 0, uy = 0 } = {}) {
  const { nx, ny, N, f } = L;
  const val = (v, c, i, j) => (typeof v === 'number' ? v : typeof v === 'function' ? v(i + 0.5, j + 0.5, i, j) : v[c]);
  const e = new Float64Array(9);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      const solid = L.solid[c] === 1;
      equilibrium(val(rho, c, i, j), solid ? 0 : val(ux, c, i, j), solid ? 0 : val(uy, c, i, j), e);
      for (let q = 0; q < 9; q++) f[q * N + c] = e[q];
    }
  }
  // open-side nodes walled off by an obstacle start at rest (see setSolid)
  for (const o of L.open) {
    o.prevInit = false;
    const g = o.g;
    for (let k = 0; k < g.len; k++) {
      const c = g.start + k * g.stride;
      if (!L.solid[c] && L.solid[c + g.inward]) restAt(L, c);
    }
  }
  L.obstacleForce[0] = L.obstacleForce[1] = 0;
  L.macroT = -1;
  return L;
}

// Reset one cell to rest equilibrium at its current density (mass-conserving).
function restAt(L, c) {
  let rho = 0;
  for (let q = 0; q < 9; q++) rho += L.f[q * L.N + c];
  const e = equilibrium(rho, 0, 0, L._g);
  for (let q = 0; q < 9; q++) L.f[q * L.N + c] = e[q];
}

// Mark or clear one obstacle cell. A cell that turns fluid starts at rest at
// rho0. Links are rebuilt lazily on the next step. Painting the inward
// neighbour of an open-side edge node walls that node off (see the header);
// it is set to rest at its own density, because a one-cell pocket between
// two bounce-back faces reverses its x-momentum every step and would never
// damp what it held.
export function setSolid(L, i, j, on = true) {
  if (i < 0 || j < 0 || i >= L.nx || j >= L.ny) return;
  const c = i + j * L.nx;
  const was = L.solid[c] === 1;
  if (was === !!on) return;
  L.solid[c] = on ? 1 : 0;
  if (!on) {
    const e = equilibrium(L.rho0, 0, 0, L._g);
    for (let q = 0; q < 9; q++) L.f[q * L.N + c] = e[q];
  } else {
    for (const o of L.open) {
      const e = c - o.g.inward, g = o.g;
      const onSide = g.stride === 1 ? e >= g.start && e < g.start + g.len : e % L.nx === g.start;
      if (onSide && !L.solid[e]) restAt(L, e);
    }
  }
  L.linksDirty = true;
  L.macroT = -1;
}

// Mark every cell whose centre lies within r of (xc, yc) as solid. Returns
// the number of cells marked.
export function addDisk(L, xc, yc, r) {
  let n = 0;
  for (let j = 0; j < L.ny; j++) {
    for (let i = 0; i < L.nx; i++) {
      const dx = i + 0.5 - xc, dy = j + 0.5 - yc;
      if (dx * dx + dy * dy <= r * r) {
        if (!L.solid[i + j * L.nx]) n++;
        setSolid(L, i, j, true);
      }
    }
  }
  return n;
}

// Change a wall's tangential velocity (e.g. the lid speed).
export function setWallVelocity(L, side, ux, uy = 0) {
  const s = L.sides[side];
  if (s.type !== 'wall') throw new Error(`lbm: side '${side}' is not a wall`);
  s.u[0] = ux;
  s.u[1] = uy;
  L.linksDirty = true;
}

// Change an inlet's velocity (mean velocity for a parabolic profile).
export function setInletVelocity(L, side, ux, uy = 0) {
  const s = L.sides[side];
  if (s.type !== 'velocity') throw new Error(`lbm: side '${side}' is not a velocity inlet`);
  s.u[0] = ux;
  s.u[1] = uy;
}

// Build the streaming table. Interior cells (all eight neighbours fluid and
// inside the domain) stream with fixed offsets; every other fluid cell gets a
// row of nine destinations (index into the target array, or -1 when the
// population leaves through an open side), a moving-wall correction, and a
// flag for links that hit the obstacle mask (momentum exchange).
// An open-side node whose inward neighbour is solid has nowhere to send an
// inflow and nothing to extrapolate from, so its open face becomes a
// stationary half-way bounce-back wall (see the header).
export function rebuildLinks(L) {
  const { nx, ny, N, solid, link, sides } = L;
  const openOf = { left: null, right: null, bottom: null, top: null };
  for (const o of L.open) {
    const g = o.g;
    openOf[g.name] = o;
    for (let k = 0; k < g.len; k++) {
      const c = g.start + k * g.stride;
      o.blocked[k] = !solid[c] && solid[c + g.inward] ? 1 : 0;
    }
  }
  let rows = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (solid[c]) {
        link[c] = SOLID;
        continue;
      }
      let interior = i > 0 && i < nx - 1 && j > 0 && j < ny - 1;
      if (interior) {
        for (let q = 1; q < 9; q++) if (solid[c + CX[q] + CY[q] * nx]) interior = false;
      }
      link[c] = interior ? INTERIOR : rows++;
    }
  }
  if (!L.dst || L.dst.length < rows * 9) {
    const cap = Math.max(rows * 9, 9);
    L.dst = new Int32Array(cap);
    L.corr = new Float64Array(cap);
    L.obst = new Uint8Array(cap);
  }
  const { dst, corr, obst } = L;
  const rho0 = L.rho0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      const r = link[c];
      if (r < 0) continue;
      const b = r * 9;
      for (let q = 0; q < 9; q++) {
        let ti = i + CX[q], tj = j + CY[q];
        const xOut = ti < 0 ? 'left' : ti >= nx ? 'right' : null;
        const yOut = tj < 0 ? 'bottom' : tj >= ny ? 'top' : null;
        let wall = null;
        if (yOut && sides[yOut].type === 'wall') wall = sides[yOut];
        else if (xOut && sides[xOut].type === 'wall') wall = sides[xOut];
        corr[b + q] = 0;
        obst[b + q] = 0;
        if (wall) {
          dst[b + q] = OPP[q] * N + c;
          corr[b + q] = -6 * W[q] * rho0 * (CX[q] * wall.u[0] + CY[q] * wall.u[1]);
          continue;
        }
        let drop = false, block = false;
        if (xOut) {
          if (sides[xOut].type === 'periodic') ti = (ti + nx) % nx;
          else {
            drop = true;
            if (openOf[xOut] && openOf[xOut].blocked[j]) block = true;
          }
        }
        if (yOut) {
          if (sides[yOut].type === 'periodic') tj = (tj + ny) % ny;
          else {
            drop = true;
            if (openOf[yOut] && openOf[yOut].blocked[i]) block = true;
          }
        }
        if (block) {
          dst[b + q] = OPP[q] * N + c;
          continue;
        }
        if (drop) {
          dst[b + q] = -1;
          continue;
        }
        const tc = ti + tj * nx;
        if (solid[tc]) {
          dst[b + q] = OPP[q] * N + c;
          obst[b + q] = 1;
        } else {
          dst[b + q] = q * N + tc;
        }
      }
    }
  }
  L.rows = rows;
  L.linksDirty = false;
  return rows;
}

// ---------------------------------------------------------------------------
// The sweep: one source of truth for the collision and the push.
// mode 0 = fused (collide a cell, push into fn), 1 = collide only (in place),
// 2 = stream only (push f into fn). Everything arrives as typed arrays or
// numbers so the JIT keeps one monomorphic, optimised loop.
// par = [omega+, omega-, Fx, Fy]; fxA/fyA are per-cell forces (length 0 if
// none); out receives the momentum-exchange force on the solid mask.
function sweep(f, fn, link, dst, corr, obst, g, N, nx, par, fxA, fyA, out, mode) {
  const doCollide = mode !== 2, doStream = mode !== 1;
  const wp = par[0], wm = par[1], Fx0 = par[2], Fy0 = par[3];
  const kp = 1 - 0.5 * wp, km = 1 - 0.5 * wm;
  const field = fxA.length > 0;
  const forced = field || Fx0 !== 0 || Fy0 !== 0;
  const N2 = 2 * N, N3 = 3 * N, N4 = 4 * N, N5 = 5 * N, N6 = 6 * N, N7 = 7 * N, N8 = 8 * N;
  let FX = 0, FY = 0;
  for (let c = 0; c < N; c++) {
    const row = link[c];
    if (row === SOLID) continue;
    let g0 = f[c], g1 = f[c + N], g2 = f[c + N2], g3 = f[c + N3], g4 = f[c + N4];
    let g5 = f[c + N5], g6 = f[c + N6], g7 = f[c + N7], g8 = f[c + N8];
    if (doCollide) {
      const rho = g0 + g1 + g2 + g3 + g4 + g5 + g6 + g7 + g8;
      let Fx = Fx0, Fy = Fy0;
      if (field) {
        Fx += fxA[c];
        Fy += fyA[c];
      }
      const ir = 1 / rho;
      const ux = (g1 - g3 + g5 - g6 - g7 + g8 + 0.5 * Fx) * ir;
      const uy = (g2 - g4 + g5 + g6 - g7 - g8 + 0.5 * Fy) * ir;
      const usq = 1.5 * (ux * ux + uy * uy);
      // Relax the symmetric part of each pair at omega+ and the antisymmetric
      // part at omega-: f* = f - w+ (f+ - eq+) -/+ w- (f- - eq-).
      g0 -= wp * (g0 - W0 * rho * (1 - usq));
      let cu = ux, rp, rm, a, bq;
      // pair E/W, c = (1, 0)
      rp = wp * (0.5 * (g1 + g3) - W1 * rho * (1 + 4.5 * cu * cu - usq));
      rm = wm * (0.5 * (g1 - g3) - W1 * rho * 3 * cu);
      a = g1 - rp - rm;
      bq = g3 - rp + rm;
      g1 = a;
      g3 = bq;
      // pair N/S, c = (0, 1)
      cu = uy;
      rp = wp * (0.5 * (g2 + g4) - W1 * rho * (1 + 4.5 * cu * cu - usq));
      rm = wm * (0.5 * (g2 - g4) - W1 * rho * 3 * cu);
      a = g2 - rp - rm;
      bq = g4 - rp + rm;
      g2 = a;
      g4 = bq;
      // pair NE/SW, c = (1, 1)
      cu = ux + uy;
      rp = wp * (0.5 * (g5 + g7) - W2 * rho * (1 + 4.5 * cu * cu - usq));
      rm = wm * (0.5 * (g5 - g7) - W2 * rho * 3 * cu);
      a = g5 - rp - rm;
      bq = g7 - rp + rm;
      g5 = a;
      g7 = bq;
      // pair NW/SE, c = (-1, 1)
      cu = uy - ux;
      rp = wp * (0.5 * (g6 + g8) - W2 * rho * (1 + 4.5 * cu * cu - usq));
      rm = wm * (0.5 * (g6 - g8) - W2 * rho * 3 * cu);
      a = g6 - rp - rm;
      bq = g8 - rp + rm;
      g6 = a;
      g8 = bq;
      if (forced) {
        // Guo source S_q = w_q [3 (c_q - u) + 9 (c_q.u) c_q].F, its even part
        // S+ = w_q (9 (c.u)(c.F) - 3 u.F) weighted by (1 - w+/2) and its odd
        // part S- = 3 w_q c.F by (1 - w-/2).
        const uF3 = 3 * (ux * Fx + uy * Fy);
        g0 -= kp * W0 * uF3;
        let sp = kp * W1 * (9 * ux * Fx - uF3), sm = km * W1 * 3 * Fx;
        g1 += sp + sm;
        g3 += sp - sm;
        sp = kp * W1 * (9 * uy * Fy - uF3);
        sm = km * W1 * 3 * Fy;
        g2 += sp + sm;
        g4 += sp - sm;
        cu = ux + uy;
        let cF = Fx + Fy;
        sp = kp * W2 * (9 * cu * cF - uF3);
        sm = km * W2 * 3 * cF;
        g5 += sp + sm;
        g7 += sp - sm;
        cu = uy - ux;
        cF = Fy - Fx;
        sp = kp * W2 * (9 * cu * cF - uF3);
        sm = km * W2 * 3 * cF;
        g6 += sp + sm;
        g8 += sp - sm;
      }
      if (!doStream) {
        f[c] = g0; f[c + N] = g1; f[c + N2] = g2; f[c + N3] = g3; f[c + N4] = g4;
        f[c + N5] = g5; f[c + N6] = g6; f[c + N7] = g7; f[c + N8] = g8;
        continue;
      }
    }
    if (row === INTERIOR) {
      fn[c] = g0;
      fn[c + 1 + N] = g1;
      fn[c + nx + N2] = g2;
      fn[c - 1 + N3] = g3;
      fn[c - nx + N4] = g4;
      fn[c + nx + 1 + N5] = g5;
      fn[c + nx - 1 + N6] = g6;
      fn[c - nx - 1 + N7] = g7;
      fn[c - nx + 1 + N8] = g8;
    } else {
      g[0] = g0; g[1] = g1; g[2] = g2; g[3] = g3; g[4] = g4;
      g[5] = g5; g[6] = g6; g[7] = g7; g[8] = g8;
      const b = row * 9;
      for (let q = 0; q < 9; q++) {
        const d = dst[b + q];
        if (d >= 0) fn[d] = g[q] + corr[b + q];
        if (obst[b + q] !== 0) {
          FX += 2 * g[q] * CXF[q];
          FY += 2 * g[q] * CYF[q];
        }
      }
    }
  }
  out[0] = FX;
  out[1] = FY;
}

function runSweep(L, mode) {
  sweep(L.f, L.fn, L.link, L.dst, L.corr, L.obst, L._g, L.N, L.nx, L.par, L.fx, L.fy, mode === 1 ? L._scratch2 : L.obstacleForce, mode);
  if (mode !== 1) {
    const t = L.f;
    L.f = L.fn;
    L.fn = t;
    L.t++;
  }
  L.macroT = -1;
}


function prepare(L) {
  if (L.linksDirty) rebuildLinks(L);
  for (const o of L.open) {
    if (o.prev && !o.prevInit) {
      const { g, prev } = o;
      for (let k = 0; k < g.len; k++) {
        const c = g.start + k * g.stride;
        for (let m = 0; m < 3; m++) prev[3 * k + m] = L.f[g.unknown[m] * L.N + c];
      }
      o.prevInit = true;
    }
  }
}

// Collision only, in place (the first half of a split step).
export function collide(L) {
  prepare(L);
  runSweep(L, 1);
}

// Streaming only: push into the second array, swap, advance t. Boundary
// conditions are a separate call (applyBoundaries) so a widget can show the
// populations an open side leaves undetermined.
export function stream(L) {
  prepare(L);
  runSweep(L, 2);
}

// Fill the populations that open sides (velocity inlets, outlets) leave
// unknown after streaming.
export function applyBoundaries(L) {
  const N = L.N, f = L.f, solid = L.solid;
  const Fx0 = L.par[2], Fy0 = L.par[3], fxA = L.fx, fyA = L.fy, field = fxA.length > 0;
  for (let s = 0; s < L.open.length; s++) {
    const o = L.open[s];
    const side = o.side, g = o.g;
    const nxo = g.n[0], nyo = g.n[1], tx = g.t[0], ty = g.t[1];
    const U = g.unknown, Z = g.zero, O = g.out;
    const extrap = side.type === 'velocity' ? side.method === 'extrapolation' : side.mode === 'extrapolation';
    const blocked = o.blocked;
    if (extrap) {
      // Non-equilibrium extrapolation (Guo, Zheng & Shi 2002): equilibrium of
      // the prescribed moment plus the extrapolated one, plus the neighbour's
      // non-equilibrium part, for all nine populations.
      const inlet = side.type === 'velocity';
      let ramp = 1;
      if (inlet && side.ramp > 0 && L.t < side.ramp) ramp = 0.5 - 0.5 * Math.cos((Math.PI * L.t) / side.ramp);
      for (let k = 0; k < g.len; k++) {
        const c = g.start + k * g.stride, cn = c + g.inward;
        if (solid[c] || solid[cn] || blocked[k]) continue;
        let rn = 0, jx = 0.5 * Fx0, jy = 0.5 * Fy0;
        if (field) {
          jx += 0.5 * fxA[cn];
          jy += 0.5 * fyA[cn];
        }
        for (let q = 0; q < 9; q++) {
          const v = f[q * N + cn];
          rn += v;
          jx += v * CX[q];
          jy += v * CY[q];
        }
        const unx = jx / rn, uny = jy / rn; // Guo: u = (sum f c + F/2)/rho
        let rho, ux, uy;
        if (inlet) {
          let prof = 1;
          if (side.profile === 'parabolic') {
            const sN = (k + 0.5) / g.len;
            prof = 6 * sN * (1 - sN);
          }
          rho = rn;
          ux = side.u[0] * prof * ramp;
          uy = side.u[1] * prof * ramp;
        } else {
          rho = side.rho;
          ux = unx;
          uy = uny;
        }
        const usq = 1.5 * (ux * ux + uy * uy), unsq = 1.5 * (unx * unx + uny * uny);
        for (let q = 0; q < 9; q++) {
          const cu = CX[q] * ux + CY[q] * uy, cun = CX[q] * unx + CY[q] * uny;
          const eq = W[q] * rho * (1 + 3 * cu + 4.5 * cu * cu - usq);
          const eqn = W[q] * rn * (1 + 3 * cun + 4.5 * cun * cun - unsq);
          f[q * N + c] = eq + f[q * N + cn] - eqn;
        }
      }
    } else if (side.type === 'velocity' || (side.type === 'outlet' && side.mode === 'pressure')) {
      const method = side.method === 'auto' ? (L.collision === 'trt' ? 'zou-he' : 'regularized') : side.method;
      let ramp = 1;
      if (side.type === 'velocity' && side.ramp > 0 && L.t < side.ramp) ramp = 0.5 - 0.5 * Math.cos((Math.PI * L.t) / side.ramp);
      for (let k = 0; k < g.len; k++) {
        const c = g.start + k * g.stride;
        if (solid[c] || solid[c + g.inward] || blocked[k]) continue;
        const s0 = f[Z[0] * N + c] + f[Z[1] * N + c] + f[Z[2] * N + c];
        const sp = f[O[0] * N + c] + f[O[1] * N + c] + f[O[2] * N + c];
        let ux, uy, rho;
        if (side.type === 'velocity') {
          let prof = 1;
          if (side.profile === 'parabolic') {
            const sN = (k + 0.5) / g.len;
            prof = 6 * sN * (1 - sN);
          }
          ux = side.u[0] * prof * ramp;
          uy = side.u[1] * prof * ramp;
          rho = (s0 + 2 * sp) / (1 + ux * nxo + uy * nyo);
          if (method === 'equilibrium') {
            if (side.rho > 0) rho = side.rho;
            else {
              rho = 0;
              for (let q = 0; q < 9; q++) rho += f[q * N + c + g.inward];
            }
            const usq = 1.5 * (ux * ux + uy * uy);
            for (let q = 0; q < 9; q++) {
              const cu = CX[q] * ux + CY[q] * uy;
              f[q * N + c] = W[q] * rho * (1 + 3 * cu + 4.5 * cu * cu - usq);
            }
            continue;
          }
        } else {
          rho = side.rho;
          const un = (s0 + 2 * sp) / rho - 1;
          ux = un * nxo;
          uy = un * nyo;
        }
        let zt = 0;
        for (let m = 0; m < 3; m++) zt += (CX[Z[m]] * tx + CY[Z[m]] * ty) * f[Z[m] * N + c];
        const Nt = -0.5 * zt + (rho * (ux * tx + uy * ty)) / 3;
        for (let m = 0; m < 3; m++) {
          const q = U[m];
          f[q * N + c] = f[OPP[q] * N + c] + 6 * W[q] * rho * (CX[q] * ux + CY[q] * uy) + (CX[q] * tx + CY[q] * ty) * Nt;
        }
        if (method === 'regularized') {
          // Keep only the hydrodynamic part of the non-equilibrium:
          // f_q = f^eq_q + (9/2) w_q Q_q : Pi^neq, Q = c c - I/3.
          const usq = 1.5 * (ux * ux + uy * uy);
          let pxx = 0, pxy = 0, pyy = 0;
          for (let q = 0; q < 9; q++) {
            const cu = CX[q] * ux + CY[q] * uy;
            const ne = f[q * N + c] - W[q] * rho * (1 + 3 * cu + 4.5 * cu * cu - usq);
            pxx += CX[q] * CX[q] * ne;
            pxy += CX[q] * CY[q] * ne;
            pyy += CY[q] * CY[q] * ne;
          }
          for (let q = 0; q < 9; q++) {
            const cu = CX[q] * ux + CY[q] * uy;
            const cx = CX[q], cy = CY[q];
            f[q * N + c] = W[q] * (rho * (1 + 3 * cu + 4.5 * cu * cu - usq) + 4.5 * ((cx * cx - 1 / 3) * pxx + 2 * cx * cy * pxy + (cy * cy - 1 / 3) * pyy));
          }
        }
      }
    } else if (side.mode === 'zero-gradient') {
      for (let k = 0; k < g.len; k++) {
        const c = g.start + k * g.stride;
        if (solid[c] || solid[c + g.inward] || blocked[k]) continue;
        for (let m = 0; m < 3; m++) if (!o.fromWall[3 * k + m]) f[U[m] * N + c] = f[U[m] * N + c + g.inward];
      }
    } else {
      // convective: mean outflow speed over the neighbour column
      let su = 0, n = 0;
      for (let k = 0; k < g.len; k++) {
        const cc = g.start + k * g.stride + g.inward;
        if (solid[cc]) continue;
        let rho = 0, jn = 0;
        for (let q = 0; q < 9; q++) {
          const v = f[q * N + cc];
          rho += v;
          jn += v * (CX[q] * nxo + CY[q] * nyo);
        }
        su += jn / rho;
        n++;
      }
      const Uc = clamp(n ? su / n : 0, 0, 1);
      const prev = o.prev;
      for (let k = 0; k < g.len; k++) {
        const c = g.start + k * g.stride;
        if (solid[c]) continue;
        if (solid[c + g.inward] || blocked[k]) {
          // walled-off node: keep prev current so it restarts cleanly
          for (let m = 0; m < 3; m++) prev[3 * k + m] = f[U[m] * N + c];
          continue;
        }
        for (let m = 0; m < 3; m++) {
          if (o.fromWall[3 * k + m]) continue;
          const q = U[m];
          const v = (prev[3 * k + m] + Uc * f[q * N + c + g.inward]) / (1 + Uc);
          f[q * N + c] = v;
          prev[3 * k + m] = v;
        }
      }
    }
  }
  L.macroT = -1; // the edge nodes changed: cached macroscopic fields are stale
}

// Advance n time steps.
export function step(L, n = 1) {
  for (let s = 0; s < n; s++) {
    prepare(L);
    if (L.streaming === 'split') {
      runSweep(L, 1);
      runSweep(L, 2);
    } else {
      runSweep(L, 0);
    }
    applyBoundaries(L);
  }
  return L;
}

// One step as a sequence of phases, for figures that pause between them.
// Yields enter/leave trace events around collide, stream and boundaries.
export function* stepPhases(L) {
  yield { t: 'enter', kind: 'collide', label: 'Collide: relax each cell towards its equilibrium' };
  collide(L);
  yield { t: 'leave', kind: 'collide' };
  yield { t: 'enter', kind: 'stream', label: 'Stream: every population hops one cell' };
  stream(L);
  yield { t: 'leave', kind: 'stream' };
  yield { t: 'enter', kind: 'boundary', label: 'Boundaries: fill what came from outside' };
  applyBoundaries(L);
  yield { t: 'leave', kind: 'boundary' };
  return L;
}

// ---------------------------------------------------------------------------
// Diagnostics

// Fill L.rho, L.ux, L.uy from the populations (Guo-corrected velocity).
// Solid cells read rho0 and zero velocity.
export function macroscopic(L) {
  const { N, f, rho: R, ux: UX, uy: UY, solid } = L;
  const Fx0 = L.par[2], Fy0 = L.par[3], fxA = L.fx, fyA = L.fy, field = fxA.length > 0;
  for (let c = 0; c < N; c++) {
    if (solid[c]) {
      R[c] = L.rho0;
      UX[c] = 0;
      UY[c] = 0;
      continue;
    }
    const f0 = f[c], f1 = f[c + N], f2 = f[c + 2 * N], f3 = f[c + 3 * N], f4 = f[c + 4 * N];
    const f5 = f[c + 5 * N], f6 = f[c + 6 * N], f7 = f[c + 7 * N], f8 = f[c + 8 * N];
    const rho = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
    let Fx = Fx0, Fy = Fy0;
    if (field) {
      Fx += fxA[c];
      Fy += fyA[c];
    }
    R[c] = rho;
    UX[c] = (f1 - f3 + f5 - f6 - f7 + f8 + 0.5 * Fx) / rho;
    UY[c] = (f2 - f4 + f5 + f6 - f7 - f8 + 0.5 * Fy) / rho;
  }
  L.macroT = L.t;
  L.macroF[0] = Fx0;
  L.macroF[1] = Fy0;
  return L;
}

// Are L.rho/ux/uy current? Every kernel call that changes f resets macroT;
// a direct write to L.bodyForce is caught by comparing the force. Direct
// writes to L.f or to the per-cell fx/fy fields are not: call macroscopic().
function macroFresh(L) {
  return L.macroT === L.t && L.macroF[0] === L.par[2] && L.macroF[1] === L.par[3];
}

// Vorticity dv/dx - du/dy by central differences into out (length nx*ny).
// Periodic sides wrap; other edges use one-sided differences; solid cells
// count as zero velocity and read zero vorticity.
export function vorticity(L, out) {
  if (!macroFresh(L)) macroscopic(L);
  const { nx, ny, ux, uy, solid } = L;
  const px = L.sides.left.type === 'periodic', py = L.sides.bottom.type === 'periodic';
  for (let j = 0; j < ny; j++) {
    let jd = j - 1, ju = j + 1, dy = 2;
    if (jd < 0) {
      if (py) jd = ny - 1;
      else { jd = 0; dy = 1; }
    }
    if (ju >= ny) {
      if (py) ju = 0;
      else { ju = ny - 1; dy = 1; }
    }
    for (let i = 0; i < nx; i++) {
      const c = i + j * nx;
      if (solid[c]) {
        out[c] = 0;
        continue;
      }
      let il = i - 1, ir = i + 1, dx = 2;
      if (il < 0) {
        if (px) il = nx - 1;
        else { il = 0; dx = 1; }
      }
      if (ir >= nx) {
        if (px) ir = 0;
        else { ir = nx - 1; dx = 1; }
      }
      out[c] = (uy[ir + j * nx] - uy[il + j * nx]) / dx - (ux[i + ju * nx] - ux[i + jd * nx]) / dy;
    }
  }
  return out;
}

// Total mass sum_c sum_q f over fluid cells.
export function totalMass(L) {
  const { N, f, solid } = L;
  let m = 0;
  for (let q = 0; q < 9; q++) {
    const o = q * N;
    for (let c = 0; c < N; c++) if (!solid[c]) m += f[o + c];
  }
  return m;
}

// Kinetic energy sum_c rho |u|^2 / 2 over fluid cells.
export function kineticEnergy(L) {
  if (!macroFresh(L)) macroscopic(L);
  const { N, rho, ux, uy, solid } = L;
  let e = 0;
  for (let c = 0; c < N; c++) if (!solid[c]) e += 0.5 * rho[c] * (ux[c] * ux[c] + uy[c] * uy[c]);
  return e;
}

// Health check for figures: is the run still trustworthy? Scans every fluid
// cell. ok is false once a value is not finite, the density leaves
// rho0 * (1 +- rhoBad), or the Mach number exceeds machBad: by then an
// instability is running away and NaN is a few steps off. warn flags
// compressibility trouble (Ma > machWarn or |rho/rho0 - 1| > rhoWarn) before
// that. negative counts negative populations (an early symptom near tau = 1/2).
export function health(L, { machWarn = 0.3, machBad = 1, rhoWarn = 0.1, rhoBad = 0.5 } = {}) {
  const { N, f, solid, rho0 } = L;
  const Fx0 = L.par[2], Fy0 = L.par[3], fxA = L.fx, fyA = L.fy, field = fxA.length > 0;
  let maxU2 = 0, minRho = Infinity, maxRho = -Infinity, firstBadCell = -1, negative = 0;
  const bad2 = (machBad * machBad) / 3;
  const rhoLo = rho0 * (1 - rhoBad), rhoHi = rho0 * (1 + rhoBad);
  let reason = '';
  for (let c = 0; c < N; c++) {
    if (solid[c]) continue;
    const f0 = f[c], f1 = f[c + N], f2 = f[c + 2 * N], f3 = f[c + 3 * N], f4 = f[c + 4 * N];
    const f5 = f[c + 5 * N], f6 = f[c + 6 * N], f7 = f[c + 7 * N], f8 = f[c + 8 * N];
    const rho = f0 + f1 + f2 + f3 + f4 + f5 + f6 + f7 + f8;
    const jx = f1 - f3 + f5 - f6 - f7 + f8, jy = f2 - f4 + f5 + f6 - f7 - f8;
    if (f0 < 0 || f1 < 0 || f2 < 0 || f3 < 0 || f4 < 0 || f5 < 0 || f6 < 0 || f7 < 0 || f8 < 0) {
      for (let q = 0; q < 9; q++) if (f[q * N + c] < 0) negative++;
    }
    let Fx = Fx0, Fy = Fy0;
    if (field) {
      Fx += fxA[c];
      Fy += fyA[c];
    }
    const ux = (jx + 0.5 * Fx) / rho, uy = (jy + 0.5 * Fy) / rho;
    const u2 = ux * ux + uy * uy;
    if (rho < minRho) minRho = rho;
    if (rho > maxRho) maxRho = rho;
    if (u2 > maxU2) maxU2 = u2;
    if (firstBadCell < 0) {
      if (!Number.isFinite(rho) || !Number.isFinite(u2)) {
        firstBadCell = c;
        reason = 'not a number';
      } else if (!(rho > rhoLo && rho < rhoHi)) {
        firstBadCell = c;
        reason = 'density out of range';
      } else if (!(u2 <= bad2)) {
        firstBadCell = c;
        reason = 'supersonic velocity';
      }
    }
    if (!Number.isFinite(rho) || !Number.isFinite(u2)) {
      maxU2 = NaN;
      if (Number.isNaN(rho)) minRho = maxRho = NaN;
    }
  }
  const maxMach = Math.sqrt(3 * maxU2);
  const ok = firstBadCell < 0;
  const warn = !ok || maxMach > machWarn || maxRho > rho0 * (1 + rhoWarn) || minRho < rho0 * (1 - rhoWarn);
  if (ok && warn) reason = maxMach > machWarn ? 'high Mach number: compressibility error' : 'large density variation';
  return { ok, warn, reason, maxMach, minRho, maxRho, firstBadCell, negative, t: L.t };
}

// ---------------------------------------------------------------------------
// Reference solutions

// Ghia, Ghia & Shin, J. Comput. Phys. 48 (1982) 387, Tables I and II, Re = 100:
// u on the vertical centreline x = 1/2 and v on the horizontal centreline
// y = 1/2 of the unit lid-driven cavity (lid speed 1, moving in +x at y = 1).
export const GHIA_RE100 = Object.freeze({
  y: [1.0, 0.9766, 0.9688, 0.9609, 0.9531, 0.8516, 0.7344, 0.6172, 0.5, 0.4531, 0.2813, 0.1719, 0.1016, 0.0703, 0.0625, 0.0547, 0.0],
  u: [1.0, 0.84123, 0.78871, 0.73722, 0.68717, 0.23151, 0.00332, -0.13641, -0.20581, -0.2109, -0.15662, -0.1015, -0.06434, -0.04775, -0.04192, -0.03717, 0.0],
  x: [1.0, 0.9688, 0.9609, 0.9531, 0.9453, 0.9063, 0.8594, 0.8047, 0.5, 0.2344, 0.2266, 0.1563, 0.0938, 0.0781, 0.0703, 0.0625, 0.0],
  v: [0.0, -0.05906, -0.07391, -0.08864, -0.10313, -0.16914, -0.22445, -0.24533, 0.05454, 0.17527, 0.17507, 0.16077, 0.12317, 0.1089, 0.10091, 0.09233, 0.0],
});

// Body-force-driven Poiseuille flow between walls at y = 0 and y = H.
export function poiseuilleProfile(y, H, F, nu, rho0 = 1) {
  return (F / (2 * rho0 * nu)) * y * (H - y);
}

// Kinetic-energy decay rate of a Taylor-Green vortex with one wavelength
// across an nx by ny periodic box: E(t) = E(0) exp(-rate t),
// rate = 2 nu (kx^2 + ky^2) (the velocity decays at half this rate).
export function taylorGreenRate(nu, nx, ny = nx) {
  const kx = (2 * Math.PI) / nx, ky = (2 * Math.PI) / ny;
  return 2 * nu * (kx * kx + ky * ky);
}

// ---------------------------------------------------------------------------
// Presets

// Preset metadata. defaults are createPreset's options; ranges are the slider
// ranges the course offers. cases are the broken and fixed configurations a
// figure can switch between (AUTHORING: "Presets should include the broken
// case and the fixed case"); pass case.opts to createPreset. case.expect:
//   'blows-up'  health(L).ok turns false within case.steps steps;
//   'survives'  health(L).ok stays true for case.steps steps (measured; the
//               tests run a shorter prefix);
//   'drifts' / 'anchored'  the total mass grows / stays within 1% over
//               case.steps steps;
//   'exact' / 'slip'  the steady Poiseuille profile is / is not exact.
// The tests read every case and check its expectation. hero.onset is the
// step by which shedding is established with the defaults (measured).
// Lambda = 1/4 vs 3/16 for the walled cylinder at Re 200 under TRT: 1/4 fails
// after ~7300 steps, 1/12 after ~1600, 1/2 after ~2000; 3/16 ran 100k.
export const PRESETS = Object.freeze({
  cylinder: {
    id: 'cylinder',
    name: 'Cylinder in a channel',
    description: 'Parabolic inflow (mean speed U), no-slip walls, a cylinder of diameter D two and a half diameters from the inlet, fixed-density outlet. Steady twin vortices at low Re, a von Karman street above Re ~ 50.',
    defaults: { nx: 200, ny: 80, D: 16, Re: 100, U: 0.06, collision: 'bgk', magic: 3 / 16, inlet: 'auto', outlet: 'extrapolation', kick: 0.3, init: 'potential' },
    ranges: { Re: [20, 200] },
    reference: 'Re = U_mean D / nu. Schaefer & Turek (1996) is the classic benchmark for this geometry (blockage D/H = 0.24, off-centre cylinder, Re = 100: St ~ 0.30, C_D ~ 3.23). Measured with the defaults (D/H = 0.2): St = 0.274, C_D = 3.3 at Re = 100; St = 0.297 at Re = 200. Under TRT, Lambda = 3/16 ran 100k steps at Re = 200 where Lambda = 1/4 fails after ~7300.',
    cases: {
      'outlet-drift': {
        name: 'Zero-gradient outlet (drifts)',
        opts: { nx: 80, ny: 32, D: 8, U: 0.08, Re: 20, outlet: 'zero-gradient' },
        expect: 'drifts', steps: 3000,
        note: 'No boundary fixes the density, so the pressure drop that drives the flow has nothing to push on: the mean density creeps up about 4% per 1000 steps in this short channel (about 0.7% per 1000 at full size, Re 20).',
      },
      'outlet-anchored': {
        name: 'Fixed-density extrapolation outlet',
        opts: { nx: 80, ny: 32, D: 8, U: 0.08, Re: 20, outlet: 'extrapolation' },
        expect: 'anchored', steps: 3000,
        note: 'The default outlet fixes the density at the exit: the mass stays within about 1% and stops growing.',
      },
    },
  },
  hero: {
    id: 'hero',
    name: 'Von Karman street',
    description: 'A wide strip with uniform inflow and periodic top and bottom: the wake of a cylinder starts shedding alternating vortices after about 1200 steps (Re 150) and keeps going indefinitely.',
    defaults: { nx: 240, ny: 72, D: 12, Re: 150, U: 0.08, collision: 'bgk', magic: 3 / 16, inlet: 'auto', outlet: 'zero-gradient', kick: 0.5, init: 'potential' },
    ranges: { Re: [40, 200] },
    reference: 'Unbounded-cylinder shedding: Re_crit ~ 47, St ~ 0.16-0.19 for Re = 100-200 (Williamson, Annu. Rev. Fluid Mech. 28 (1996) 477); the periodic images and 1/6 blockage raise St a little. Measured with the defaults: St = 0.188 at Re = 100, 0.202 at Re = 150, 0.209 at Re = 200; steady wake at Re = 40. Shedding is established (wake |v| > U/2 both ways, 3D downstream) by step ~1200 at Re 150-200 and ~2100 at Re 100. Free-stream Ma = 0.14 and peak local Ma <= 0.28, so health() does not warn anywhere in Re 40-200 under BGK or TRT (60k steps each); the defaults ran 200k steps healthy. TRT uses Lambda = 3/16: with 1/4 it fails at the inlet after ~7300 steps at Re 200.',
    onset: 1200,
    cases: {
      'bgk-zou-he': {
        name: 'BGK + Zou-He inlet',
        opts: { collision: 'bgk', inlet: 'zou-he' },
        expect: 'blows-up', steps: 400,
        note: 'Near tau = 1/2 (here 0.519) BGK with a Zou-He inlet blows up at the inlet column after about 200 steps.',
      },
      'trt-zou-he': {
        name: 'TRT + Zou-He inlet',
        opts: { collision: 'trt', inlet: 'zou-he' },
        expect: 'survives', steps: 60000,
        note: 'The same flow under TRT is healthy (60k steps measured).',
      },
      'bgk-regularized': {
        name: 'BGK + regularized inlet (default)',
        opts: { collision: 'bgk', inlet: 'regularized' },
        expect: 'survives', steps: 200000,
        note: 'The default pairing: BGK with a regularized inlet, 200k steps measured.',
      },
      'trt-regularized': {
        name: 'TRT + regularized inlet',
        opts: { collision: 'trt', inlet: 'regularized' },
        expect: 'blows-up', steps: 1500,
        note: 'The pairing that suits BGK destabilises TRT: it fails at the inlet after about 1000 steps.',
      },
    },
  },
  cavity: {
    id: 'cavity',
    name: 'Lid-driven cavity',
    description: 'A square box whose top wall slides at speed U: one primary vortex, corner eddies at higher Re. Compare the centrelines with Ghia et al. (1982).',
    defaults: { n: 64, Re: 100, U: 0.1, collision: 'trt', magic: 0.25 },
    ranges: { Re: [10, 1000] },
    reference: 'Ghia, Ghia & Shin 1982 (GHIA_RE100): u_min = -0.2109 at y = 0.4531 for Re = 100.',
    cases: {},
  },
  poiseuille: {
    id: 'poiseuille',
    name: 'Poiseuille flow',
    description: 'A periodic channel driven by a uniform body force: the profile relaxes to a parabola. With TRT at Lambda = 3/16 bounce-back reproduces it exactly; with BGK the wall drifts with tau.',
    defaults: { nx: 32, ny: 24, tau: 0.8, umax: 0.05, collision: 'trt', magic: 3 / 16 },
    ranges: { tau: [0.51, 3] },
    reference: 'u(y) = F y (H - y) / (2 rho nu), walls at y = 0 and y = H.',
    cases: {
      'bgk-slip': {
        name: 'BGK at tau = 2',
        opts: { collision: 'bgk', tau: 2 },
        expect: 'slip',
        note: 'Under BGK the bounce-back wall sits at a tau-dependent distance: at tau = 2 the profile is off by about 2% of u_max at the default H = 24 (4% at H = 16).',
      },
      'trt-exact': {
        name: 'TRT, Lambda = 3/16, tau = 2',
        opts: { collision: 'trt', magic: 3 / 16, tau: 2 },
        expect: 'exact',
        note: 'TRT with Lambda = 3/16 puts the wall exactly half-way: the parabola is exact to round-off at any tau.',
      },
    },
  },
  'taylor-green': {
    id: 'taylor-green',
    name: 'Taylor-Green vortices',
    description: 'A periodic array of counter-rotating vortices that decays at exactly the rate set by the viscosity: the cleanest check that nu = (tau - 1/2)/3.',
    defaults: { n: 64, tau: 0.6, U: 0.04, collision: 'bgk', magic: 0.25 },
    ranges: { tau: [0.51, 2] },
    reference: 'E(t) = E(0) exp(-2 nu (kx^2 + ky^2) t) (taylorGreenRate).',
    cases: {},
  },
  'shear-layer': {
    id: 'shear-layer',
    name: 'Double shear layer',
    description: 'Two thin periodic shear layers roll up into vortices, with no boundaries anywhere. The defaults (n = 64, tau = 0.51) roll up cleanly. Push tau towards 1/2 and the under-resolved layers blow up: at n = 64, BGK fails for tau <= 0.501 and TRT (Lambda = 1/4) already at 0.505; at n = 32, BGK fails at 0.502. A finer grid, not a different collision operator, is what fixes it.',
    defaults: { n: 64, tau: 0.51, U: 0.1, kappa: 80, delta: 0.05, collision: 'bgk', magic: 0.25 },
    ranges: { tau: [0.5005, 0.6] },
    reference: 'Minion & Brown, J. Comput. Phys. 138 (1997) 734 (thin layer: kappa = 80, delta = 0.05).',
    cases: {
      'bgk-coarse': {
        name: 'BGK, n = 32, tau = 0.502',
        opts: { n: 32, tau: 0.502, collision: 'bgk' },
        expect: 'blows-up', steps: 1000,
        note: 'Under-resolved and nearly inviscid: blows up after about 400 steps.',
      },
      'bgk-coarse-stable': {
        name: 'BGK, n = 32, tau = 0.505',
        opts: { n: 32, tau: 0.505, collision: 'bgk' },
        expect: 'survives', steps: 20000,
        note: 'A little more viscosity on the same grid: healthy.',
      },
      'trt-coarse': {
        name: 'TRT, n = 32, tau = 0.505',
        opts: { n: 32, tau: 0.505, collision: 'trt' },
        expect: 'blows-up', steps: 1000,
        note: 'TRT (Lambda = 1/4) is not more robust here: it fails where BGK survives (about 450 steps). Lambda = 1/6 and 3/16 fail too.',
      },
      'bgk-refined': {
        name: 'BGK, n = 64, tau = 0.502',
        opts: { n: 64, tau: 0.502, collision: 'bgk' },
        expect: 'survives', steps: 20000,
        note: 'Same tau as the first case on a grid twice as fine: healthy. Resolution is the cure.',
      },
    },
  },
});

// Transverse kick in the near wake: a smooth, deterministic asymmetry that
// starts the shedding within about a thousand steps instead of waiting for
// round-off to grow (with the yc offset of a quarter cell).
function wakeKick(xc, yc, D, amp) {
  const s2 = 0.25 * D * D;
  return (x, y) => amp * Math.exp(-((x - xc - D) ** 2 + (y - yc) ** 2) / (2 * s2));
}

// Build a ready-to-run simulation from a preset; opts override the defaults
// (a case: createPreset(id, PRESETS[id].cases[caseId].opts)).
// lbm.meta records U (velocity scale), Lref (length scale), Re and the
// preset's geometry so figures can show them.
export function createPreset(id, opts = {}) {
  const P = PRESETS[id];
  if (!P) throw new Error(`lbm: unknown preset '${id}'`);
  const o = { ...P.defaults, ...opts };
  const common = { collision: o.collision, magic: o.magic, streaming: o.streaming || 'fused' };
  let L;
  if (id === 'cylinder' || id === 'hero') {
    const { nx, ny, D, U, Re } = o;
    const tau = o.tau ?? suggestTau(Re, U, D);
    const walls = id === 'cylinder';
    const profile = walls ? 'parabolic' : 'uniform';
    L = createLBM({
      nx, ny, tau, ...common,
      boundaries: {
        left: { type: 'velocity', u: [U, 0], profile, method: o.inlet },
        right: { type: 'outlet', mode: o.outlet },
        bottom: walls ? 'wall' : 'periodic',
        top: walls ? 'wall' : 'periodic',
      },
    });
    const xc = o.xc ?? (walls ? 2.5 * D : 4 * D);
    const yc = o.yc ?? ny / 2 + 0.25;
    addDisk(L, xc, yc, D / 2);
    // Start from potential flow past the cylinder (with the Bernoulli
    // density) rather than an impulsive uniform stream: far less acoustic
    // noise in the first few hundred steps. Then add the wake kick.
    const kick = wakeKick(xc, yc, D, (o.kick ?? 0) * U);
    const base = walls ? (y) => 6 * U * (y / ny) * (1 - y / ny) : () => U;
    const R2 = (D * D) / 4;
    const pot = (x, y) => {
      const dx = x - xc, dy = y - yc, r2 = dx * dx + dy * dy, Ub = base(y);
      if (o.init === 'uniform' || r2 < R2) return [Ub, 0, Ub];
      const r4 = r2 * r2;
      let u = Ub * (1 - (R2 * (dx * dx - dy * dy)) / r4), v = (-2 * Ub * R2 * dx * dy) / r4;
      // Potential flow reaches 2 Ub on the surface; cap at 1.6 Ub so the
      // start is not above the Mach warning (the boundary layer slows it
      // anyway within a few steps).
      const sp = Math.hypot(u, v), cap = 1.6 * Math.abs(Ub);
      if (sp > cap) {
        u *= cap / sp;
        v *= cap / sp;
      }
      return [u, v, Ub];
    };
    initEquilibrium(L, {
      rho: (x, y) => {
        const [u, v, Ub] = pot(x, y);
        return L.rho0 * (1 + 1.5 * (Ub * Ub - u * u - v * v));
      },
      ux: (x, y) => pot(x, y)[0],
      uy: (x, y) => pot(x, y)[1] + kick(x, y),
    });
    L.meta = { preset: id, U, Lref: D, Re: (U * D) / viscosity(tau), D, xc, yc };
  } else if (id === 'cavity') {
    const n = o.n, nx = o.nx ?? n, ny = o.ny ?? n;
    const tau = o.tau ?? suggestTau(o.Re, o.U, nx);
    L = createLBM({ nx, ny, tau, ...common, boundaries: { left: 'wall', right: 'wall', bottom: 'wall', top: { type: 'wall', u: [o.U, 0] } } });
    L.meta = { preset: id, U: o.U, Lref: nx, Re: (o.U * nx) / viscosity(tau), ghia: GHIA_RE100 };
  } else if (id === 'poiseuille') {
    const { nx, ny, tau, umax } = o;
    const nu = viscosity(tau);
    const F = (8 * nu * umax) / (ny * ny);
    L = createLBM({ nx, ny, tau, ...common, force: [F, 0], boundaries: { left: 'periodic', right: 'periodic', bottom: 'wall', top: 'wall' } });
    L.meta = { preset: id, U: umax, Lref: ny, Re: (umax * ny) / nu, F, H: ny, exact: (y) => poiseuilleProfile(y, ny, F, nu, L.rho0) };
  } else if (id === 'taylor-green') {
    const n = o.n, nx = o.nx ?? n, ny = o.ny ?? n, U = o.U;
    const kx = (2 * Math.PI) / nx, ky = (2 * Math.PI) / ny;
    L = createLBM({ nx, ny, tau: o.tau, ...common });
    // velocity -U cos(kx x) sin(ky y), (kx/ky) U sin(kx x) cos(ky y); the
    // matching pressure p = -(rho0 U^2/4)(cos 2kx x + (kx/ky)^2 cos 2ky y)
    // enters through rho = rho0 + p / c_s^2.
    const r = kx / ky;
    initEquilibrium(L, {
      rho: (x, y) => L.rho0 - 0.75 * L.rho0 * U * U * (Math.cos(2 * kx * x) + r * r * Math.cos(2 * ky * y)),
      ux: (x, y) => -U * Math.cos(kx * x) * Math.sin(ky * y),
      uy: (x, y) => r * U * Math.sin(kx * x) * Math.cos(ky * y),
    });
    L.meta = { preset: id, U, Lref: nx, Re: (U * nx) / viscosity(o.tau), rate: taylorGreenRate(viscosity(o.tau), nx, ny) };
  } else if (id === 'shear-layer') {
    const n = o.n, U = o.U, k = o.kappa, d = o.delta;
    L = createLBM({ nx: n, ny: n, tau: o.tau, ...common });
    initEquilibrium(L, {
      ux: (x, y) => (y / n <= 0.5 ? U * Math.tanh(k * (y / n - 0.25)) : U * Math.tanh(k * (0.75 - y / n))),
      uy: (x) => d * U * Math.sin(2 * Math.PI * (x / n + 0.25)),
    });
    L.meta = { preset: id, U, Lref: n, Re: (U * n) / viscosity(o.tau) };
  }
  return L;
}
