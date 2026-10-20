// Weakly compressible smoothed particle hydrodynamics (WCSPH) in two
// dimensions: kernels, a cell-linked-list neighbour search, density by
// summation or continuity, the Tait equation of state, the symmetric
// (momentum-conserving) pressure force, Monaghan artificial viscosity,
// gravity, fixed wall particles with extrapolated pressure, the tensile-
// instability fixes, and a kick-drift-kick leapfrog.
//
// The scheme, piece by piece (Monaghan 1992, 2005; Violeau 2012, Fluid
// Mechanics and the SPH Method, Oxford University Press):
//
//   rho_i      = sum_j m_j W_ij                                  (summation)
//   drho_i/dt  = sum_j m_j (v_i - v_j) . grad_i W_ij             (continuity)
//   p_i        = B [ (rho_i / rho0)^gamma - 1 ] + p_b,  B = rho0 c0^2 / gamma
//   dv_i/dt    = - sum_j m_j ( p_i/rho_i^2 + p_j/rho_j^2 + Pi_ij + R_ij f_ij^n ) grad_i W_ij + g
//   Pi_ij      = ( -alpha cbar_ij mu_ij + beta mu_ij^2 ) / rhobar_ij  if v_ij . r_ij < 0, else 0
//   mu_ij      = h v_ij . r_ij / ( r_ij^2 + 0.01 h^2 )
//
// Conventions
//   - Particles 0 .. nFluid-1 are fluid; nFluid .. n-1 are fixed wall
//     (dummy) particles. Positions x[k], y[k] with y up (gravity is -y).
//   - The neighbour grid is a uniform grid of square cells at least one
//     kernel support (2h) wide, indexed cx + cy * ncx with cy = 0 at the
//     bottom (the course's i + j * nx convention). Particles are binned with
//     a counting sort into preallocated typed arrays every step, and pairs
//     within the support are listed once each (half stencil). A pair list
//     (i, j, dx, dy, r^2, W, F) is shared by every pass of the step. Nothing
//     is allocated per step; the pair list alone doubles if a configuration
//     ever overflows its initial capacity.
//   - Periodic (lattice) presets need the box to hold at least 3 kernel
//     supports (3 * 2h <= 1): resolution >= 6 hdx.
//   - Non-finite positions (after a blow-up) are left out of the neighbour
//     grid, so they never form pairs. step() flags sph.blownUp when a
//     velocity is non-finite or a particle drifts more than h in one step
//     (the kernel no longer resolves its motion), and is a no-op after that.
//   - Live changes: setParams(sph, patch) takes createSPH option names and
//     re-evaluates the forces. Live-tunable: alpha, beta, artificialPressure,
//     apN, shifting, density, shepard, shepardEvery, densityDiffusion,
//     diffusionHydrostatic, pressureFloor, clampWallPressure, cfl, forceCfl,
//     viscCfl, gravity, backgroundPressure, c0, machFactor, gamma, kernel
//     (h is kept). Everything else (resolution, hdx, geometry, walls, seed)
//     needs a new createSPH.
//   - grad_i W_ij = F(r_ij) (x_i - x_j), with F = (1/r) dW/dr <= 0 written so
//     it is finite at r = 0. Every pair force is applied as +f to i and -f to
//     j, so total momentum is conserved to round-off whenever walls and
//     gravity are absent.
//   - Smoothing length h = hdx * dx (dx = initial particle spacing), support
//     radius 2h for both kernels. Defaults: hdx = 1.2 for the cubic spline
//     (on a square lattice under positive pressure it pairs from about
//     h = 1.3 dx: measured, the lattice holds at 1.2 and 1.25 and pairs at
//     1.3, and a tank at rest pairs from the bottom at 1.3 after a few
//     seconds), 1.5 for Wendland C2 (whose self-term biases the summation
//     density high at small h: +1.05 % at 1.3).
//
// Units
//   Free-surface presets ('dam-break', 'drop', 'hydrostatic') are in SI:
//   metres, seconds, rho0 = 1000 kg/m^3, g = 9.81 m/s^2. In 2-D a particle's
//   mass m = rho0 dx^2 is per unit depth (kg/m) and pressure is in Pa. The
//   artificial speed of sound is c0 = 10 * (expected max speed), so the Mach
//   number is about 0.1 and density varies by about Ma^2 = 1 % (Monaghan
//   1994). The lattice presets ('tensile', 'tensile-fixed', 'pairing',
//   'pairing-fixed') are nondimensional: periodic box of side 1, rho0 = 1,
//   c0 = 1, no gravity; a background pressure p_b loads the lattice in
//   tension (p_b < 0) or compression (p_b > 0), and a small seeded random
//   velocity (velocityNoise * c0) seeds the instability.
//
// Schemes and sources (public literature)
//   - Cubic spline (M4) kernel: Monaghan & Lattanzio 1985, A&A 149:135.
//     2-D normalisation 10 / (7 pi h^2), support 2h.
//   - Wendland C2 kernel: Wendland 1995, Adv. Comput. Math. 4:389; in SPH,
//     Dehnen & Aly 2012, MNRAS 425:1068 (free of the pairing instability).
//     Written with support 2h: W = 7/(4 pi h^2) (1 - q/2)^4 (1 + 2q).
//   - Density summation and continuity, symmetric pressure gradient:
//     Monaghan 1992, ARA&A 30:543; Monaghan 2005, Rep. Prog. Phys. 68:1703.
//     Shepard (1968) renormalisation: as a periodic filter of the continuity
//     density, Colagrossi & Landrini 2003, J. Comput. Phys. 191:448. Applied
//     to the summation density (option shepard) it is our two-pass variant:
//     volumes come from the raw summation, because with the previous step's
//     densities as volumes the ratio cannot respond to compression at all.
//   - Density diffusion (option densityDiffusion = delta, continuity only):
//     the delta-SPH term of Molteni & Colagrossi 2009, Comput. Phys. Commun.
//     180:861, D_i += delta h c0 sum_j psi_ij . grad_i W_ij m_j / rho_j with
//     psi_ij = 2 (rho_j - rho_i) (x_j - x_i) / (r_ij^2 + 0.01 h^2). On its
//     own it diffuses the hydrostatic density gradient too, so the tank at
//     rest slowly sags (Antuono, Colagrossi & Marrone 2012, Comput. Phys.
//     Commun. 183:2570); measured here (option diffusionHydrostatic: false,
//     tank at resolution 16), the bottom pressure falls 3 % in 1 s and 12 %
//     in 6 s (2 % and 9 % at the preset's resolution 30).
//     DEVIATION: instead of Antuono's renormalised gradients we subtract the
//     hydrostatic density difference, as Fourtakas et al. 2019 (Comput.
//     Fluids 190:346) do, linearised:
//     rho^H_j - rho^H_i = (rho0 / c0^2) g . (x_j - x_i). Only fluid-fluid
//     pairs diffuse. delta = 0.1 in the dam-break and drop presets: it removes
//     the acoustic pressure noise (spurious negative pressures) of plain
//     WCSPH; 0 elsewhere, so the conservation and order tests see the plain
//     scheme.
//   - Tait equation of state with gamma = 7 and c0 = 10 Vmax: Monaghan 1994,
//     J. Comput. Phys. 110:399.
//   - Artificial viscosity: Monaghan 1992 (alpha, beta, eta^2 = 0.01 h^2).
//     Its equivalent kinematic viscosity in 2-D is nu = alpha h c / 8
//     (Monaghan 2005).
//   - Walls: fixed dummy particles in ceil(2h/dx) layers with pressure
//     extrapolated from the fluid, Adami, Hu & Adams 2012, J. Comput. Phys.
//     231:7057 (static walls):
//       p_w = [ sum_f p_f W_wf + (g . sum_f rho_f r_wf W_wf) ] / sum_f W_wf,
//     and rho_w from the inverse equation of state. DEVIATION: Adami et al.
//     use the Hu & Adams inter-particle-averaged momentum equation; here the
//     wall's p_w and rho_w enter the same Monaghan symmetric form as a fluid
//     neighbour, and the artificial viscosity sees the wall at rest (wall
//     velocity 0) rather than Adami's extrapolated no-slip velocity. By
//     default p_w is clamped at >= 0 (free-surface flows; option
//     clampWallPressure) so walls never suck fluid onto themselves.
//   - Tensile instability: Swegle, Hicks & Attaway 1995, J. Comput. Phys.
//     116:123 (unstable when stress * W'' > 0, i.e. under tension at the
//     usual spacings). Fix: Monaghan 2000, J. Comput. Phys. 159:290,
//     artificial pressure R_ij f_ij^n with f_ij = W(r_ij) / W(dx), n = 4,
//     R_i = eps |p_i| / rho_i^2 when p_i < 0 (else 0), eps ~ 0.2. Only the
//     negative-pressure part is implemented (Monaghan's optional small
//     positive-pressure term is omitted).
//   - Particle shifting: Lind, Xu, Stansby & Rogers 2012, J. Comput. Phys.
//     231:1499 (Fickian shift dr_i = -D grad C_i, with the gradient of the
//     particle concentration carrying the same (1 + 0.2 (W/W(dx))^4) term).
//     DEVIATION: D = A h |v_i| dt, the form of Skillen et al. 2013, CMAME
//     265:163, which suits the small explicit WCSPH step; particles whose
//     kernel sum is below 0.85 (at the free surface) are not shifted, the
//     shift is capped at 0.1 dx per step, and the field variables are not
//     Taylor-corrected after the shift.
//   - Pairing instability (positive pressure): Price 2012, J. Comput. Phys.
//     231:759; Dehnen & Aly 2012. Usually described as a many-neighbour
//     effect; on the 2-D square lattice here the cubic spline already pairs
//     at h = 1.3 dx (about 21 neighbours), and wider kernels pair faster.
//   - Time step: Monaghan & Kos 1999, J. Waterway Port Coastal Ocean Eng.
//     125:145: dt = min( C_cv h / (c_max + max mu), C_f sqrt(h / |a|max) ),
//     plus a viscous limit C_nu h^2 / nu with nu = alpha h c_max / 8.
//   - Integrator: kick-drift-kick leapfrog (velocity Verlet; Verlet 1967).
//     The continuity density is advanced like a position, with the half-
//     step velocity and a trapezoid in the geometry:
//       rho^{n+1} = rho^n + dt/2 [ D(x^n, v^{n+1/2}, rho^n)
//                                 + D(x^{n+1}, v^{n+1/2}, rho*) ],
//     so the density-velocity (acoustic) coupling is time-centred (Stormer-
//     Verlet for sound waves). The delta-SPH term depends on rho itself; it
//     sees the predictor rho* = rho^n + dt D(x^n, v^{n+1/2}, rho^n) in the
//     second evaluation (Heun's trapezoid), since evaluating it at the half-
//     updated density makes the step first order (measured 1.1-1.3). The
//     whole step is second order when the artificial viscosity is off, with
//     or without delta-SPH (measured 2.0). (Giving the density two half kicks like
//     the velocity, with the rates from the previous and the current
//     evaluation, centres its update at t^n instead; the amplification
//     matrix of a sound wave then has determinant 1 + (omega dt)^2 / 2 > 1
//     and the hydrostatic tank blows up.) As is usual for SPH, the artificial
//     viscosity after the drift sees the half-step velocity, which makes that
//     dissipative term first order in time.
//   - Dam-break reference: the shallow-water dry-bed front speed 2 sqrt(g H)
//     (Ritter 1892, Z. Ver. Dtsch. Ing. 36:947). Martin & Moyce 1952 (Phil. Trans. R. Soc. A
//     244:312) use the nondimensional front Z = x/a and time T = n t
//     sqrt(g/a) = t sqrt(gH)/a for a column a wide and H = n^2 a high
//     (T = t sqrt(2g/a) for the classic n^2 = 2); in those variables
//     Ritter's front is Z = 1 + 2T. No experimental data are reproduced here.

import { rng, gaussian } from './util.js';

const PI = Math.PI;
const ETA2 = 0.01; // eta^2 / h^2 in mu_ij (Monaghan 1992)

// ---------------------------------------------------------------- metadata

export const KERNELS = {
  cubic: {
    id: 'cubic',
    name: 'Cubic spline (M4)',
    cite: 'Monaghan & Lattanzio 1985',
    description: 'The classic SPH kernel. Its gradient peaks at q = 2/3 and falls to zero at the centre, so close pairs feel less repulsion. Under compression it pairs once h is about 1.3 dx or more (measured on a square lattice; a wider kernel only pairs faster), so the default here is h = 1.2 dx. Under tension it suffers the tensile instability.',
    support: 2,
    sigma2d: 10 / (7 * PI),
    tex: 'W(r,h)=\\frac{10}{7\\pi h^{2}}\\begin{cases}1-\\frac{3}{2}q^{2}+\\frac{3}{4}q^{3} & 0\\le q<1\\\\ \\frac{1}{4}(2-q)^{3} & 1\\le q<2\\\\ 0 & q\\ge 2\\end{cases},\\quad q=\\frac{r}{h}',
    inflection: 2 / 3, // q where W'' = 0; W'' > 0 beyond it (Swegle et al. 1995)
  },
  wendland: {
    id: 'wendland',
    name: 'Wendland C2',
    cite: 'Wendland 1995; Dehnen & Aly 2012',
    description: 'A compactly supported kernel whose Fourier transform is positive, so it does not pair particles under compression, however many neighbours (Dehnen & Aly 2012). It does not cure the tensile instability under negative pressure: W\'\' > 0 at the neighbour spacing, as for the cubic spline.',
    support: 2,
    sigma2d: 7 / (4 * PI),
    tex: 'W(r,h)=\\frac{7}{4\\pi h^{2}}\\left(1-\\frac{q}{2}\\right)^{4}(1+2q),\\quad 0\\le q<2',
    inflection: 1 / 2, // q where W'' = 0; W'' > 0 beyond it
  },
};

export const METHODS = {
  summation: {
    id: 'summation', name: 'Density by summation',
    description: 'Density is the kernel-weighted mass of the neighbours. Exact mass conservation, but particles at a free surface see a truncated kernel and too low a density.',
    tex: '\\rho_i=\\sum_j m_j W_{ij}',
  },
  shepard: {
    id: 'shepard', name: 'Shepard renormalisation',
    description: 'Divide by the kernel sum so a truncated kernel still averages to the right value (Shepard 1968). As a periodic filter of the continuity density it smooths pressure noise (Colagrossi & Landrini 2003). Applied to the summation density (two passes, raw-summation volumes) it only trims the free-surface deficit on a flat surface, from 24 % to 17 % (Wendland, h = 1.5 dx) or 21 % to 16 % (cubic, h = 1.2 dx); with the previous step\'s densities as volumes the formula cannot see compression at all.',
    tex: '\\rho_i=\\frac{\\sum_j m_j W_{ij}}{\\sum_j \\frac{m_j}{\\rho_j} W_{ij}}',
  },
  continuity: {
    id: 'continuity', name: 'Continuity equation',
    description: 'Density is integrated in time from the velocity divergence. No free-surface deficiency, but errors accumulate (Monaghan 1994).',
    tex: '\\frac{\\mathrm{d}\\rho_i}{\\mathrm{d}t}=\\sum_j m_j (\\mathbf{v}_i-\\mathbf{v}_j)\\cdot\\nabla_i W_{ij}',
  },
  densityDiffusion: {
    id: 'densityDiffusion', name: 'Density diffusion (delta-SPH)',
    description: 'A small diffusion of the continuity density between neighbours that damps the acoustic pressure noise of weakly compressible SPH (Molteni & Colagrossi 2009). The hydrostatic part of the density difference is subtracted first (Fourtakas et al. 2019), so a tank at rest stays at rest. Because it depends on the density itself, the second half of each density update evaluates it at a predicted density; at the half-updated density the step would be only first order.',
    tex: '\\frac{\\mathrm{d}\\rho_i}{\\mathrm{d}t}\\Big|_{\\delta}=\\delta h c_0\\sum_j \\boldsymbol{\\psi}_{ij}\\cdot\\nabla_i W_{ij}\\frac{m_j}{\\rho_j},\\quad \\boldsymbol{\\psi}_{ij}=\\frac{2\\left[(\\rho_j-\\rho_i)-(\\rho^{H}_j-\\rho^{H}_i)\\right](\\mathbf{x}_j-\\mathbf{x}_i)}{r_{ij}^{2}+0.01h^{2}}',
  },
  tait: {
    id: 'tait', name: 'Tait equation of state',
    description: 'Stiff pressure from density. c0 = 10 Vmax keeps density within about 1 % of rho0 in smooth flow (Ma^2); impacts briefly compress it by 5-10 %. Measured peaks at the preset resolutions: the dam break hitting the far wall, 7.3 % with density diffusion and 8.3 % without; the drop hitting the pool, 5.4 % with density diffusion, 7.0 % with neither fix, and 10.3 % with artificial pressure alone.',
    tex: 'p=\\frac{\\rho_0 c_0^{2}}{\\gamma}\\left[\\left(\\frac{\\rho}{\\rho_0}\\right)^{\\gamma}-1\\right],\\quad \\gamma=7',
  },
  momentum: {
    id: 'momentum', name: 'Symmetric pressure gradient',
    description: 'Each pair pushes equally and oppositely along the line between them, so linear and angular momentum are conserved to round-off (Monaghan 1992).',
    tex: '\\frac{\\mathrm{d}\\mathbf{v}_i}{\\mathrm{d}t}=-\\sum_j m_j\\left(\\frac{p_i}{\\rho_i^{2}}+\\frac{p_j}{\\rho_j^{2}}+\\Pi_{ij}\\right)\\nabla_i W_{ij}+\\mathbf{g}',
  },
  viscosity: {
    id: 'viscosity', name: 'Monaghan artificial viscosity',
    description: 'A pairwise bulk viscosity that acts only on approaching pairs; alpha damps acoustic noise, beta stops interpenetration at high Mach.',
    tex: '\\Pi_{ij}=\\frac{-\\alpha\\,\\bar{c}_{ij}\\mu_{ij}+\\beta\\mu_{ij}^{2}}{\\bar{\\rho}_{ij}},\\quad \\mu_{ij}=\\frac{h\\,\\mathbf{v}_{ij}\\cdot\\mathbf{r}_{ij}}{r_{ij}^{2}+0.01h^{2}}',
    equivalentViscosity: 'nu = alpha h c / 8 (2-D)',
  },
  artificialPressure: {
    id: 'artificialPressure', name: 'Artificial pressure',
    description: 'A short-range repulsion that switches on under negative pressure and keeps particles from pairing up (Monaghan 2000).',
    tex: 'R_{ij}f_{ij}^{n},\\quad f_{ij}=\\frac{W(r_{ij})}{W(\\Delta p)},\\quad R_i=\\varepsilon\\frac{|p_i|}{\\rho_i^{2}}\\ (p_i<0),\\quad \\varepsilon=0.2,\\ n=4',
  },
  shifting: {
    id: 'shifting', name: 'Particle shifting',
    description: 'Nudge particles down the gradient of particle concentration so they stay evenly spaced (Lind et al. 2012; D as in Skillen et al. 2013).',
    tex: '\\delta\\mathbf{r}_i=-A\\,h\\,|\\mathbf{v}_i|\\,\\Delta t\\,\\nabla C_i,\\quad \\nabla C_i=\\sum_j\\frac{m_j}{\\rho_j}\\left(1+0.2f_{ij}^{4}\\right)\\nabla_i W_{ij}',
  },
  walls: {
    id: 'walls', name: 'Dummy wall particles (Adami et al. 2012)',
    description: 'Fixed particles behind the wall whose pressure is extrapolated from the fluid, including the hydrostatic part, so the kernel is never truncated at a wall.',
    tex: 'p_w=\\frac{\\sum_f p_f W_{wf}+\\mathbf{g}\\cdot\\sum_f \\rho_f\\mathbf{r}_{wf}W_{wf}}{\\sum_f W_{wf}}',
  },
  leapfrog: {
    id: 'leapfrog', name: 'Kick-drift-kick leapfrog',
    description: 'Half a velocity kick, a full drift, new forces, another half kick. Symplectic for the conservative part; the continuity density drifts with the positions (a trapezoid, with a predicted density for the delta-SPH term). Second order in time (measured 2.0, with or without delta-SPH) while the artificial viscosity is off; the viscosity, which sees the half-step velocity, makes it first order.',
    tex: '\\mathbf{v}^{n+1/2}=\\mathbf{v}^{n}+\\tfrac{\\Delta t}{2}\\mathbf{a}^{n},\\ \\mathbf{x}^{n+1}=\\mathbf{x}^{n}+\\Delta t\\,\\mathbf{v}^{n+1/2},\\ \\mathbf{v}^{n+1}=\\mathbf{v}^{n+1/2}+\\tfrac{\\Delta t}{2}\\mathbf{a}^{n+1}',
    order: 2,
  },
  timestep: {
    id: 'timestep', name: 'Time-step limits (Monaghan & Kos 1999)',
    description: 'Acoustic CFL with the viscous mu term, a force (acceleration) limit, and the diffusion limit of the equivalent viscosity.',
    tex: '\\Delta t=\\min\\left(0.25\\frac{h}{c_{\\max}+\\max\\mu_{ij}},\\ 0.25\\sqrt{\\frac{h}{|\\mathbf{a}|_{\\max}}},\\ 0.125\\frac{h^{2}}{\\nu}\\right)',
    stability: 'Unstable once c0 dt / h exceeds about 1.7 (measured in the tank at rest: 1.70 Wendland, 1.79 cubic, 1.77 and 1.83 with delta-SPH); C_cv = 0.25 leaves a wide margin. The step is set by the artificial sound speed, not the flow speed. A blow-up is flagged (blownUp) once a particle drifts more than h in a step or a velocity is not finite.',
  },
};

// Default settings shared by every preset; each preset overrides some.
const BASE = {
  kernel: 'wendland',
  hdx: 0,              // h / dx; 0: 1.2 for the cubic spline, 1.5 for Wendland C2
  rho0: 1000,
  gravity: 9.81,       // magnitude, acting in -y
  gamma: 7,
  c0: 0,               // 0: 10 * vmax of the preset
  machFactor: 10,      // c0 = machFactor * vmax
  backgroundPressure: 0,
  density: 'continuity', // or 'summation'
  shepard: false,      // summation only: divide by the kernel sum (two-pass Shepard)
  shepardEvery: 0,     // continuity only: Shepard density filter every N steps (0 = off)
  pressureFloor: -Infinity, // clamp fluid pressure from below; 0 (no tension) destabilises the continuity density: the dam break gains energy
  densityDiffusion: 0, // continuity only: delta of the delta-SPH diffusion term (0 = off)
  diffusionHydrostatic: true, // subtract the hydrostatic density difference first (false: Molteni & Colagrossi as published; a tank at rest sags)
  alpha: 0.05,
  beta: 0,
  artificialPressure: 0, // epsilon (Monaghan 2000), 0 = off
  apN: 4,
  shifting: 0,         // A in D = A h |v| dt, 0 = off
  cfl: 0.25,           // C_cv
  forceCfl: 0.25,      // C_f
  viscCfl: 0.125,      // C_nu
  clampWallPressure: true,
  walls: true,         // false: leave out the tank (a free patch of fluid)
  wallLayers: 0,       // 0: ceil(2h/dx)
  seed: 1,
  jitter: 0,           // random initial displacement, fraction of dx
  velocityNoise: 0,    // random initial velocity, fraction of c0
};

export const PRESETS = {
  'dam-break': {
    id: 'dam-break', name: 'Dam break',
    description: 'A water column a wide and 2a tall collapses along a dry floor (the Martin & Moyce 1952 geometry). Track the front against Ritter\'s 2 sqrt(gH). Density diffusion (delta = 0.1) is on; set densityDiffusion to 0 to see the pressure noise of plain WCSPH. After the water hits the far wall, about a tenth of the particles pair up in the splash (tensile instability under negative pressure); shifting: 2 cuts that to about a third. The walls are 5a tall because the jet runs about 4.7a up the far wall.',
    defaults: { resolution: 25, a: 1, heightRatio: 2, tankWidth: 4, wallHeight: 5, densityDiffusion: 0.1 },
  },
  drop: {
    id: 'drop', name: 'Drop into a pool',
    description: 'A disc of water falls into a shallow pool and splashes. The impact briefly compresses the water by about 5 % and leaves pockets of negative pressure where particles clump. At this resolution, density diffusion (delta = 0.1) halves the clumping and artificial pressure (eps = 0.2) cuts it by a further factor of about six: mean paired fraction over t = 0.5-1 s of 0.094 with neither, 0.043 with delta only and 0.0075 with both. Set either to 0 to compare.',
    defaults: { resolution: 60, tankWidth: 2, poolDepth: 0.45, dropRadius: 0.25, dropHeight: 1.3, wallHeight: 2, densityDiffusion: 0.1, artificialPressure: 0.2 },
  },
  hydrostatic: {
    id: 'hydrostatic', name: 'Tank at rest',
    description: 'Water at rest in a tank. Pressure should grow linearly with depth, rho g H at the bottom, and nothing should move.',
    defaults: { resolution: 30, tankWidth: 1, depth: 1, wallHeight: 1.2, alpha: 0.1 },
  },
  tensile: {
    id: 'tensile', name: 'Tensile instability (broken)',
    description: 'A periodic lattice held under uniform negative pressure (p_b = -0.03, about -0.2 B) with the cubic spline at its default h = 1.2 dx. Within t = 2, 10-20 % of the particles have clumped into pairs and strings: the tensile instability. The Wendland kernel clumps too (try kernel: wendland).',
    defaults: { resolution: 30, kernel: 'cubic', backgroundPressure: -0.03, velocityNoise: 1e-3 },
  },
  'tensile-fixed': {
    id: 'tensile-fixed', name: 'Tensile instability, artificial pressure',
    description: 'The same stretched lattice with Monaghan\'s artificial pressure (eps = 0.2, n = 4). No pairs form: the lattice slowly loses its perfect order, but every nearest neighbour stays beyond about half the spacing (measured to t = 20).',
    defaults: { resolution: 30, kernel: 'cubic', backgroundPressure: -0.03, velocityNoise: 1e-3, artificialPressure: 0.2 },
  },
  pairing: {
    id: 'pairing', name: 'Pairing instability (broken)',
    description: 'A periodic lattice under positive pressure (p_b = 0.05) with the cubic spline at h = 2 dx (about 50 neighbours). Close pairs feel too little repulsion and stick together; by t = 10 more than half the particles are paired. On this lattice the cubic spline pairs from about h = 1.3 dx (21 neighbours; set hdx: 1.3), more slowly, and holds at its default 1.2 dx. Without the background pressure nothing pairs.',
    defaults: { resolution: 30, kernel: 'cubic', hdx: 2, backgroundPressure: 0.05, velocityNoise: 1e-3 },
  },
  'pairing-fixed': {
    id: 'pairing-fixed', name: 'Pairing instability, Wendland kernel',
    description: 'The same compressed lattice and neighbour count with the Wendland C2 kernel, which does not pair (Dehnen & Aly 2012).',
    defaults: { resolution: 30, kernel: 'wendland', hdx: 2, backgroundPressure: 0.05, velocityNoise: 1e-3 },
  },
};

// ---------------------------------------------------------------- kernels

// W(r, h) for 'cubic' or 'wendland'; support 2h, 2-D normalisation.
export function kernelW(kernel, r, h) {
  const q = r / h;
  if (q >= 2) return 0;
  if (kernel === 'wendland') {
    const t = 1 - 0.5 * q;
    const t2 = t * t;
    return (7 / (4 * PI * h * h)) * t2 * t2 * (1 + 2 * q);
  }
  const s = 10 / (7 * PI * h * h);
  if (q < 1) return s * (1 - 1.5 * q * q + 0.75 * q * q * q);
  const t = 2 - q;
  return s * 0.25 * t * t * t;
}

// F(r, h) = (1/r) dW/dr, finite at r = 0, so grad_i W_ij = F * (x_i - x_j).
export function kernelF(kernel, r, h) {
  const q = r / h;
  if (q >= 2) return 0;
  if (kernel === 'wendland') {
    const t = 1 - 0.5 * q;
    return (-5 * (7 / (4 * PI * h * h)) * t * t * t) / (h * h);
  }
  const s = 10 / (7 * PI * h * h);
  if (q < 1) return (s * (-3 + 2.25 * q)) / (h * h);
  const t = 2 - q;
  return (-s * 0.75 * t * t) / (q * h * h);
}

// grad_i W_ij for the separation (dx, dy) = x_i - x_j. Returns [gx, gy] (or
// fills out).
export function kernelGrad(kernel, dx, dy, h, out = [0, 0]) {
  const f = kernelF(kernel, Math.sqrt(dx * dx + dy * dy), h);
  out[0] = f * dx;
  out[1] = f * dy;
  return out;
}

// ---------------------------------------------------------------- neighbour search

export function createPairList(capacity = 1024) {
  return {
    count: 0,
    cap: capacity,
    i: new Int32Array(capacity),
    j: new Int32Array(capacity),
    dx: new Float64Array(capacity),
    dy: new Float64Array(capacity),
    r2: new Float64Array(capacity),
    w: new Float64Array(capacity),
    f: new Float64Array(capacity),
  };
}

// Double the pair arrays, keeping their contents (only on overflow).
function growPairs(pl) {
  const cap = pl.cap * 2;
  for (const k of ['i', 'j']) { const a = new Int32Array(cap); a.set(pl[k]); pl[k] = a; }
  for (const k of ['dx', 'dy', 'r2', 'w', 'f']) { const a = new Float64Array(cap); a.set(pl[k]); pl[k] = a; }
  pl.cap = cap;
}

// A uniform grid of cells at least `cell` wide covering [xmin, xmax] x
// [ymin, ymax]. Periodic grids tile the box exactly (at least 3 x 3 cells);
// non-periodic grids clamp stray particles into the edge cells (still
// correct, just slower if many escape).
export function createNeighbourGrid({ xmin, ymin, xmax, ymax, cell, capacity, periodic = false }) {
  const Lx = xmax - xmin, Ly = ymax - ymin;
  let ncx, ncy, csx, csy;
  if (periodic) {
    ncx = Math.floor(Lx / cell + 1e-9);
    ncy = Math.floor(Ly / cell + 1e-9);
    if (ncx < 3 || ncy < 3) throw new Error('periodic box must be at least 3 kernel supports wide');
    csx = Lx / ncx;
    csy = Ly / ncy;
  } else {
    ncx = Math.max(1, Math.ceil(Lx / cell));
    ncy = Math.max(1, Math.ceil(Ly / cell));
    csx = csy = cell;
  }
  const ncell = ncx * ncy;
  return {
    xmin, ymin, Lx, Ly, ncx, ncy, csx, csy, ncell, periodic,
    cellOf: new Int32Array(capacity),
    start: new Int32Array(ncell + 1),
    cursor: new Int32Array(ncell),
    fluidEnd: new Int32Array(ncell), // per cell: end of its fluid particles in sorted
    sorted: new Int32Array(capacity),
  };
}

// Counting sort of particles 0..n-1 into cells. The sort is stable, so in
// each cell the fluid particles (indices < nFluid) come first and end at
// grid.fluidEnd[c]. A particle with a non-finite position (a blown-up run)
// gets cellOf = -1 and is left out, so it can never form a pair.
export function binParticles(grid, x, y, n, nFluid = n) {
  const { xmin, ymin, csx, csy, ncx, ncy, ncell, cellOf, start, cursor, fluidEnd, sorted } = grid;
  const ix = 1 / csx, iy = 1 / csy;
  cursor.fill(0);
  fluidEnd.fill(0);
  for (let p = 0; p < n; p++) {
    const xp = x[p], yp = y[p];
    if (!(xp - xp === 0 && yp - yp === 0)) { cellOf[p] = -1; continue; } // NaN or +-Infinity
    let cx = Math.floor((xp - xmin) * ix);
    let cy = Math.floor((yp - ymin) * iy);
    if (cx < 0) cx = 0; else if (cx >= ncx) cx = ncx - 1;
    if (cy < 0) cy = 0; else if (cy >= ncy) cy = ncy - 1;
    const c = cx + cy * ncx;
    cellOf[p] = c;
    cursor[c]++;
    if (p < nFluid) fluidEnd[c]++;
  }
  start[0] = 0;
  for (let c = 0; c < ncell; c++) {
    start[c + 1] = start[c] + cursor[c];
    cursor[c] = start[c];
    fluidEnd[c] += start[c];
  }
  for (let p = 0; p < n; p++) {
    const c = cellOf[p];
    if (c >= 0) sorted[cursor[c]++] = p;
  }
}

// Forward half stencil: the cell itself, then E, NW, N, NE. Each unordered
// pair of cells is visited once.
const OFFX = [0, 1, -1, 0, 1];
const OFFY = [0, 0, 1, 1, 1];

// List every pair (i, j) with |x_i - x_j| < radius exactly once. Pairs of
// two wall particles (both indices >= nFluid) are skipped; in a mixed pair
// the fluid particle is stored as i. dx, dy = x_i - x_j (minimum image if
// periodic). Returns the number of pairs.
export function findPairs(grid, x, y, n, radius, pl, nFluid = n) {
  binParticles(grid, x, y, n, nFluid);
  const { ncx, ncy, start, fluidEnd, sorted, periodic, Lx, Ly } = grid;
  const hx = 0.5 * Lx, hy = 0.5 * Ly;
  const r2max = radius * radius;
  let PI_ = pl.i, PJ = pl.j, PDX = pl.dx, PDY = pl.dy, PR2 = pl.r2, cap = pl.cap;
  let np = 0;
  for (let cy = 0; cy < ncy; cy++) {
    for (let cx = 0; cx < ncx; cx++) {
      const c = cx + cy * ncx;
      const a0 = start[c], a1 = start[c + 1];
      if (a0 === a1) continue;
      for (let k = 0; k < 5; k++) {
        let nx = cx + OFFX[k], ny = cy + OFFY[k];
        if (periodic) {
          if (nx < 0) nx += ncx; else if (nx >= ncx) nx -= ncx;
          if (ny >= ncy) ny -= ncy;
        } else if (nx < 0 || nx >= ncx || ny >= ncy) continue;
        const d = nx + ny * ncx;
        const b0 = start[d], b1 = start[d + 1], bf = fluidEnd[d];
        if (b0 === b1) continue;
        for (let a = a0; a < a1; a++) {
          const i = sorted[a];
          const xi = x[i], yi = y[i];
          const iWall = i >= nFluid;
          // A wall particle pairs only with the fluid of the other cell.
          const bEnd = iWall ? bf : b1;
          for (let b = k === 0 ? a + 1 : b0; b < bEnd; b++) {
            const j = sorted[b];
            let dx = xi - x[j], dy = yi - y[j];
            if (periodic) {
              if (dx > hx) dx -= Lx; else if (dx < -hx) dx += Lx;
              if (dy > hy) dy -= Ly; else if (dy < -hy) dy += Ly;
            }
            const r2 = dx * dx + dy * dy;
            if (!(r2 < r2max)) continue; // also rejects NaN
            if (np === cap) {
              growPairs(pl);
              PI_ = pl.i; PJ = pl.j; PDX = pl.dx; PDY = pl.dy; PR2 = pl.r2; cap = pl.cap;
            }
            if (iWall) { PI_[np] = j; PJ[np] = i; PDX[np] = -dx; PDY[np] = -dy; }
            else { PI_[np] = i; PJ[np] = j; PDX[np] = dx; PDY[np] = dy; }
            PR2[np] = r2;
            np++;
          }
        }
      }
    }
  }
  pl.count = np;
  return np;
}

// ---------------------------------------------------------------- set-up helpers

function tankWalls(out, width, height, dx, layers) {
  // Bottom (including the corners), then the two side walls above it.
  for (let l = 0; l < layers; l++) {
    const yy = -(l + 0.5) * dx;
    for (let xx = -(layers - 0.5) * dx; xx < width + layers * dx - 1e-9 * dx; xx += dx) out.push(xx, yy);
  }
  for (let l = 0; l < layers; l++) {
    for (let yy = 0.5 * dx; yy < height; yy += dx) {
      out.push(-(l + 0.5) * dx, yy);
      out.push(width + (l + 0.5) * dx, yy);
    }
  }
}

function block(out, x0, y0, w, hgt, dx) {
  const nx = Math.round(w / dx), ny = Math.round(hgt / dx);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) out.push(x0 + (i + 0.5) * dx, y0 + (j + 0.5) * dx);
}

function disc(out, xc, yc, R, dx) {
  const n = Math.ceil(R / dx) + 1;
  for (let j = -n; j <= n; j++) {
    for (let i = -n; i <= n; i++) {
      const px = (i + 0.5) * dx, py = (j + 0.5) * dx;
      if (px * px + py * py <= R * R) out.push(xc + px, yc + py);
    }
  }
}

// ---------------------------------------------------------------- create

// Option keys some preset understands (BASE plus every preset's defaults).
const KNOWN_OPTS = new Set(['preset', ...Object.keys(BASE), ...Object.values(PRESETS).flatMap((p) => Object.keys(p.defaults))]);

// Throw on a value that would silently break a run: an unknown kernel or
// density method, or a non-numeric / NaN / infinite number (pressureFloor
// may be -Infinity).
function checkOptions(o, defaults) {
  if (!KERNELS[o.kernel]) throw new Error(`unknown SPH kernel ${o.kernel}`);
  if (o.density !== 'continuity' && o.density !== 'summation') throw new Error(`unknown SPH density method ${o.density}`);
  for (const k in o) {
    const ref = k in BASE ? BASE[k] : defaults[k];
    if (typeof ref !== 'number') continue;
    const v = o[k];
    const ok = typeof v === 'number' && (k === 'pressureFloor' ? !Number.isNaN(v) && v !== Infinity : Number.isFinite(v));
    if (!ok) throw new Error(`SPH option ${k} must be a finite number, got ${v}`);
  }
}

// createSPH({ preset, ...overrides }) -> state. Every BASE key and every
// key of the preset's defaults can be overridden. Keys set to undefined are
// ignored (the default stands); a key no preset knows (a typo) throws.
export function createSPH(opts = {}) {
  const presetId = opts.preset || 'dam-break';
  const preset = PRESETS[presetId];
  if (!preset) throw new Error(`unknown SPH preset ${presetId}`);
  const o = { ...BASE, ...preset.defaults };
  for (const k in opts) {
    if (opts[k] === undefined) continue;
    if (!KNOWN_OPTS.has(k)) throw new Error(`unknown SPH option ${k}`);
    o[k] = opts[k];
  }
  o.preset = presetId;
  checkOptions(o, preset.defaults);
  const fluid = [], walls = [];
  const meta = { preset: presetId };
  let dx, rho0 = o.rho0, g = o.gravity, vmax, periodic = false, box = null;
  let surface = null; // free-surface height per fluid particle for hydrostatic init
  let tank = null;    // [width, wall height] of the open-topped tank

  if (presetId === 'dam-break') {
    const a = o.a, H = o.heightRatio * a;
    dx = a / o.resolution;
    block(fluid, 0, 0, a, H, dx);
    surface = () => H;
    vmax = Math.sqrt(2 * g * H);
    Object.assign(meta, { a, H, x0: a, ritterSpeed: 2 * Math.sqrt(g * H), tankWidth: o.tankWidth, wallHeight: o.wallHeight });
    tank = [o.tankWidth, o.wallHeight];
  } else if (presetId === 'drop') {
    dx = o.tankWidth / o.resolution;
    const d = Math.round(o.poolDepth / dx) * dx;
    block(fluid, 0, 0, o.tankWidth, d, dx);
    const nPool = fluid.length / 2;
    disc(fluid, 0.5 * o.tankWidth, o.dropHeight, o.dropRadius, dx);
    surface = (k) => (k < nPool ? d : null);
    vmax = Math.sqrt(2 * g * Math.max(o.dropHeight + o.dropRadius - d, d));
    Object.assign(meta, { poolDepth: d, dropRadius: o.dropRadius, dropHeight: o.dropHeight, tankWidth: o.tankWidth });
    tank = [o.tankWidth, o.wallHeight];
  } else if (presetId === 'hydrostatic') {
    dx = o.tankWidth / o.resolution;
    const H = Math.round(o.depth / dx) * dx;
    block(fluid, 0, 0, o.tankWidth, H, dx);
    surface = () => H;
    vmax = Math.sqrt(2 * g * H);
    Object.assign(meta, { H, tankWidth: o.tankWidth, bottomPressure: rho0 * g * H });
    tank = [o.tankWidth, o.wallHeight];
  } else {
    // Periodic lattice presets: nondimensional unit box.
    periodic = true;
    rho0 = opts.rho0 !== undefined ? o.rho0 : 1;
    g = opts.gravity !== undefined ? o.gravity : 0;
    dx = 1 / o.resolution;
    block(fluid, 0, 0, 1, 1, dx);
    vmax = 0.1; // c0 = 1 with machFactor 10
    box = [1, 1];
    Object.assign(meta, { box: 1 });
  }

  const hdx = o.hdx || (o.kernel === 'wendland' ? 1.5 : 1.2);
  const h = hdx * dx;
  const support = 2 * h;
  const layers = o.wallLayers || Math.ceil(support / dx - 1e-9);
  if (tank && o.walls) tankWalls(walls, tank[0], tank[1], dx, layers);

  const nFluid = fluid.length / 2, nWall = walls.length / 2, n = nFluid + nWall;
  // c0 = 10 Vmax (Monaghan 1994); with gravity off there is no natural speed,
  // so Vmax falls back to 1 (pass c0 to choose).
  const vref = vmax > 0 ? vmax : 1;
  const c0 = o.c0 || o.machFactor * vref;
  const gamma = o.gamma;
  const B = (rho0 * c0 * c0) / gamma;
  const mass = rho0 * dx * dx;
  const kcode = o.kernel === 'wendland' ? 1 : 0;

  // Live-tunable settings are stored under their option names (see
  // setParams); g is the gravity magnitude and (gx, gy) its vector.
  const sph = {
    preset: presetId, meta, opts: o,
    kernel: o.kernel, kcode, h, hdx, support, dx, mass, rho0, c0, vref, gamma, B,
    backgroundPressure: o.backgroundPressure, gx: 0, gy: 0 - g, g, // 0 - g: no -0 when g = 0
    density: o.density, shepard: !!o.shepard, shepardEvery: o.shepardEvery | 0,
    pressureFloor: o.pressureFloor, densityDiffusion: o.densityDiffusion, diffusionHydrostatic: !!o.diffusionHydrostatic,
    alpha: o.alpha, beta: o.beta, artificialPressure: o.artificialPressure, apN: o.apN, shifting: o.shifting,
    cfl: o.cfl, forceCfl: o.forceCfl, viscCfl: o.viscCfl, clampWallPressure: !!o.clampWallPressure,
    periodic, box, layers,
    n, nFluid, nWall,
    x: new Float64Array(n), y: new Float64Array(n),
    vx: new Float64Array(n), vy: new Float64Array(n),
    ax: new Float64Array(n), ay: new Float64Array(n),
    rho: new Float64Array(n), drho: new Float64Array(n),
    rhoPred: new Float64Array(n),     // predicted rho^{n+1} seen by the delta-SPH term
    maxDrift: 0,                      // largest |v| dt / h of the last step
    p: new Float64Array(n), cs: new Float64Array(n),
    prho2: new Float64Array(n),       // p / rho^2, per particle, for the pair loop
    kernelSum: new Float64Array(n),   // sum_j (m_j/rho0) W_ij: 1 inside, 0.76-0.79 on a flat free surface
    vsum: new Float64Array(n),        // scratch: Shepard denominators sum_j (m_j/rho_j) W_ij, or 1/rho for the density diffusion
    nnDist: new Float64Array(n),      // distance to the nearest fluid neighbour
    work: new Float64Array(n),        // scratch: Shepard numerator, wall weights
    gcx: new Float64Array(n), gcy: new Float64Array(n), // concentration gradient (shifting)
    W0: kernelW(o.kernel, 0, h),
    Wdx: kernelW(o.kernel, dx, h),
    t: 0, steps: 0, lastDt: 0, maxMu: 0,
    dtLimits: { cv: 0, force: 0, visc: 0 },
    nnStats: { min: 0, mean: 0, paired: 0 },
    blownUp: false,
    grid: null, pairs: null,
  };

  for (let k = 0; k < nFluid; k++) { sph.x[k] = fluid[2 * k]; sph.y[k] = fluid[2 * k + 1]; }
  for (let k = 0; k < nWall; k++) { sph.x[nFluid + k] = walls[2 * k]; sph.y[nFluid + k] = walls[2 * k + 1]; }

  // Initial density: hydrostatic where there is a free surface above, so the
  // column starts in equilibrium (p = rho0 g depth through the inverse EOS).
  for (let k = 0; k < n; k++) sph.rho[k] = rho0;
  if (surface) {
    for (let k = 0; k < nFluid; k++) {
      const s = surface(k);
      if (s == null) continue;
      const ph = rho0 * g * Math.max(0, s - sph.y[k]);
      sph.rho[k] = rho0 * Math.pow(1 + ph / B, 1 / gamma);
    }
  }

  const rand = rng(o.seed);
  if (o.jitter > 0) {
    for (let k = 0; k < nFluid; k++) {
      sph.x[k] += o.jitter * dx * (2 * rand() - 1);
      sph.y[k] += o.jitter * dx * (2 * rand() - 1);
    }
  }
  if (o.velocityNoise > 0) {
    let mx = 0, my = 0;
    for (let k = 0; k < nFluid; k++) {
      sph.vx[k] = o.velocityNoise * c0 * gaussian(rand);
      sph.vy[k] = o.velocityNoise * c0 * gaussian(rand);
      mx += sph.vx[k]; my += sph.vy[k];
    }
    for (let k = 0; k < nFluid; k++) { sph.vx[k] -= mx / nFluid; sph.vy[k] -= my / nFluid; }
  }

  // Neighbour grid: the periodic box, or the bounding box of the set-up with
  // room for splashes above.
  if (periodic) {
    sph.grid = createNeighbourGrid({ xmin: 0, ymin: 0, xmax: box[0], ymax: box[1], cell: support, capacity: n, periodic: true });
  } else {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let k = 0; k < n; k++) {
      x0 = Math.min(x0, sph.x[k]); x1 = Math.max(x1, sph.x[k]);
      y0 = Math.min(y0, sph.y[k]); y1 = Math.max(y1, sph.y[k]);
    }
    const ySpan = y1 - y0;
    sph.grid = createNeighbourGrid({ xmin: x0 - support, ymin: y0 - support, xmax: x1 + support, ymax: y1 + 0.5 * ySpan + support, cell: support, capacity: n });
  }
  const nb = Math.round(PI * (support / dx) ** 2);
  sph.pairs = createPairList(Math.max(1024, Math.ceil(n * nb * 0.6)));

  interact(sph, 0);
  return sph;
}

// Settings that can change on a live state (createSPH option names).
const LIVE_PARAMS = new Set([
  'alpha', 'beta', 'artificialPressure', 'apN', 'shifting', 'density', 'shepard', 'shepardEvery',
  'densityDiffusion', 'diffusionHydrostatic', 'pressureFloor', 'clampWallPressure',
  'cfl', 'forceCfl', 'viscCfl', 'gravity', 'backgroundPressure', 'c0', 'machFactor', 'gamma', 'kernel',
]);

// Change settings of a running simulation, by createSPH option name, then
// re-evaluate density, pressure and forces at the current positions so the
// next kick uses them. Derived values follow: gravity sets (gx, gy); c0,
// machFactor (c0 = machFactor * the preset's reference speed) and gamma set
// B; kernel sets the kernel tables but keeps h (rebuild for the new kernel's
// default h). Keys set to undefined are ignored; a key that needs a rebuild
// (resolution, hdx, geometry, walls, seed, ...) throws. Returns sph.
export function setParams(sph, patch = {}) {
  const o = { ...sph.opts };
  let any = false;
  for (const k in patch) {
    if (patch[k] === undefined) continue;
    if (!LIVE_PARAMS.has(k)) throw new Error(`SPH option ${k} cannot change on a live state; build a new one with createSPH`);
    o[k] = patch[k];
    any = true;
  }
  if (!any) return sph;
  checkOptions(o, PRESETS[sph.preset].defaults);
  sph.opts = o;
  sph.alpha = o.alpha; sph.beta = o.beta;
  sph.artificialPressure = o.artificialPressure; sph.apN = o.apN;
  sph.shifting = o.shifting;
  sph.density = o.density; sph.shepard = !!o.shepard; sph.shepardEvery = o.shepardEvery | 0;
  sph.densityDiffusion = o.densityDiffusion; sph.diffusionHydrostatic = !!o.diffusionHydrostatic;
  sph.pressureFloor = o.pressureFloor; sph.clampWallPressure = !!o.clampWallPressure;
  sph.cfl = o.cfl; sph.forceCfl = o.forceCfl; sph.viscCfl = o.viscCfl;
  sph.backgroundPressure = o.backgroundPressure;
  if (patch.gravity !== undefined) { sph.g = o.gravity; sph.gx = 0; sph.gy = 0 - o.gravity; }
  if (patch.c0 !== undefined || patch.machFactor !== undefined) {
    if (!(patch.c0 > 0)) o.c0 = 0; // machFactor governs unless c0 itself is given
    sph.c0 = o.c0 || o.machFactor * sph.vref;
  }
  sph.gamma = o.gamma;
  sph.B = (sph.rho0 * sph.c0 * sph.c0) / sph.gamma;
  if (o.kernel !== sph.kernel) {
    sph.kernel = o.kernel;
    sph.kcode = o.kernel === 'wendland' ? 1 : 0;
    sph.W0 = kernelW(o.kernel, 0, sph.h);
    sph.Wdx = kernelW(o.kernel, sph.dx, sph.h);
  }
  interact(sph, 0);
  return sph;
}

// ---------------------------------------------------------------- one evaluation

// out_i = m W(0) + sum_j m W_ij over the pair list, for fluid i.
function massSum(out, PI_, PJ, PW, np, nFluid, m, W0) {
  for (let i = 0; i < nFluid; i++) out[i] = m * W0;
  for (let k = 0; k < np; k++) {
    const i = PI_[k], j = PJ[k], mw = m * PW[k];
    out[i] += mw;
    if (j < nFluid) out[j] += mw;
  }
}

// out_i = sum_j (m / rho_j) W_ij including the self term, for fluid i.
function volumeSum(out, rho, PI_, PJ, PW, np, n, nFluid, m, W0) {
  for (let i = 0; i < nFluid; i++) out[i] = (m / rho[i]) * W0;
  for (let k = 0; k < np; k++) {
    const i = PI_[k], j = PJ[k], w = PW[k];
    out[i] += (m / rho[j]) * w;
    if (j < nFluid) out[j] += (m / rho[i]) * w;
  }
}

// Pairs, kernel values, density, pressure, wall pressure and accelerations at
// the current positions. dt is used only by the continuity density (the
// second half of its update; 0 at creation).
function interact(sph, dt) {
  const { x, y, vx, vy, ax, ay, rho, drho, p, cs, n, nFluid, mass: m, h, kcode } = sph;
  const pl = sph.pairs;
  const np = findPairs(sph.grid, x, y, n, sph.support, pl, nFluid);
  const PI_ = pl.i, PJ = pl.j, PDX = pl.dx, PDY = pl.dy, PR2 = pl.r2, PW = pl.w, PF = pl.f;

  // Kernel values for every pair, once.
  const ih = 1 / h, h2 = h * h;
  if (kcode === 1) {
    const a = 7 / (4 * PI * h2);
    const fa = -5 * a / h2;
    for (let k = 0; k < np; k++) {
      const q = Math.sqrt(PR2[k]) * ih;
      const t = 1 - 0.5 * q;
      const t3 = t * t * t;
      PW[k] = a * t3 * t * (1 + 2 * q);
      PF[k] = fa * t3;
    }
  } else {
    const s = 10 / (7 * PI * h2);
    const sf = s / h2;
    for (let k = 0; k < np; k++) {
      const q = Math.sqrt(PR2[k]) * ih;
      if (q < 1) {
        PW[k] = s * (1 - 1.5 * q * q + 0.75 * q * q * q);
        PF[k] = sf * (-3 + 2.25 * q);
      } else {
        const t = 2 - q;
        PW[k] = s * 0.25 * t * t * t;
        PF[k] = (-sf * 0.75 * t * t) / q;
      }
    }
  }

  // --- density
  const vs = sph.vsum, work = sph.work, W0 = sph.W0;
  if (sph.density === 'summation') {
    // Raw summation rho*_i = sum_j m W_ij (walls included) into work.
    massSum(work, PI_, PJ, PW, np, nFluid, m, W0);
    if (sph.shepard) {
      // Shepard renormalisation with the raw summation volumes m / rho*_j
      // (two passes): rho_i = rho*_i / sum_j (m / rho*_j) W_ij. Wall
      // particles use their extrapolated density from the previous step.
      for (let i = nFluid; i < n; i++) work[i] = rho[i];
      volumeSum(vs, work, PI_, PJ, PW, np, n, nFluid, m, W0);
      for (let i = 0; i < nFluid; i++) rho[i] = work[i] / vs[i];
    } else {
      for (let i = 0; i < nFluid; i++) rho[i] = work[i];
    }
  } else {
    if (dt > 0 && sph.densityDiffusion > 0) {
      // The delta-SPH term depends on rho: give it the predictor
      // rho* = rho^n + dt D1 (Heun), not the half-updated rho^n + dt/2 D1,
      // or the step drops to first order. work still holds D1 from
      // densityHalfKick; walls never diffuse, so they keep their rho.
      const rp = sph.rhoPred, half = 0.5 * dt;
      for (let i = 0; i < nFluid; i++) rp[i] = rho[i] + half * work[i];
      for (let i = nFluid; i < n; i++) rp[i] = rho[i];
      continuityRate(sph, drho, np, rp);
    } else {
      continuityRate(sph, drho, np, rho);
    }
    // Second half of the trapezoid in x (see densityHalfKick).
    for (let i = 0; i < nFluid; i++) rho[i] += 0.5 * dt * drho[i];
    if (sph.shepardEvery > 0 && dt > 0 && (sph.steps + 1) % sph.shepardEvery === 0) {
      // Shepard filter of the continuity density (Colagrossi & Landrini
      // 2003): rho_i = sum_j m W_ij / sum_j (m / rho_j) W_ij.
      massSum(work, PI_, PJ, PW, np, nFluid, m, W0);
      volumeSum(vs, rho, PI_, PJ, PW, np, n, nFluid, m, W0);
      for (let i = 0; i < nFluid; i++) rho[i] = work[i] / vs[i];
    }
  }
  // Kernel sum, needed here only by shifting (its free-surface test);
  // diagnostics() refreshes it otherwise.
  if (sph.shifting > 0) updateKernelSum(sph);

  // --- equation of state (fluid)
  const { rho0, B, gamma, c0 } = sph;
  const pb = sph.backgroundPressure;
  const ir0 = 1 / rho0, gm1h = 0.5 * (gamma - 1), pFloor = sph.pressureFloor;
  const P = sph.prho2;
  for (let i = 0; i < nFluid; i++) {
    const r = rho[i] * ir0;
    let pi;
    if (gamma === 7) {
      const r2 = r * r, r3 = r2 * r;
      pi = B * (r3 * r3 * r - 1) + pb;
      cs[i] = c0 * r3; // c = c0 (rho/rho0)^((gamma-1)/2)
    } else {
      pi = B * (Math.pow(r, gamma) - 1) + pb;
      cs[i] = c0 * Math.pow(r, gm1h);
    }
    p[i] = pi < pFloor ? pFloor : pi;
    P[i] = p[i] / (rho[i] * rho[i]);
  }

  // --- wall pressure (Adami, Hu & Adams 2012), static walls
  if (sph.nWall > 0) {
    const gx = sph.gx, gy = sph.gy;
    for (let i = nFluid; i < n; i++) { p[i] = 0; work[i] = 0; }
    for (let k = 0; k < np; k++) {
      const j = PJ[k];
      if (j < nFluid) continue;
      const i = PI_[k], w = PW[k];
      // r_wf = x_w - x_f = -(dx, dy)
      p[j] += (p[i] - rho[i] * (gx * PDX[k] + gy * PDY[k])) * w;
      work[j] += w;
    }
    for (let i = nFluid; i < n; i++) {
      let pw = work[i] > 0 ? p[i] / work[i] : 0;
      if (sph.clampWallPressure && pw < 0) pw = 0;
      p[i] = pw;
      let arg = (pw - pb) / B + 1;
      if (arg < 0.5) arg = 0.5; // keeps rho_w > 0 under strong suction
      rho[i] = rho0 * Math.pow(arg, 1 / gamma);
      cs[i] = c0 * Math.pow(rho[i] * ir0, gm1h);
      P[i] = pw / (rho[i] * rho[i]);
    }
  }

  // --- accelerations
  const { alpha, beta, apN } = sph;
  const apEps = sph.artificialPressure;
  const iWdx = 1 / sph.Wdx;
  const eta2 = ETA2 * h2;
  const gcx = sph.gcx, gcy = sph.gcy, shifting = sph.shifting > 0;
  for (let i = 0; i < nFluid; i++) { ax[i] = sph.gx; ay[i] = sph.gy; }
  if (shifting) for (let i = 0; i < nFluid; i++) { gcx[i] = 0; gcy[i] = 0; }
  let maxMu = 0;
  for (let k = 0; k < np; k++) {
    const i = PI_[k], j = PJ[k];
    const Pi = P[i], Pj = P[j];
    const dx = PDX[k], dy = PDY[k], F = PF[k];
    let term = Pi + Pj;
    // artificial viscosity
    const vdx = vx[i] - vx[j], vdy = vy[i] - vy[j];
    const vr = vdx * dx + vdy * dy;
    if (vr < 0 && (alpha > 0 || beta > 0)) {
      const mu = (h * vr) / (PR2[k] + eta2);
      term += (-alpha * (cs[i] + cs[j]) * mu + 2 * beta * mu * mu) / (rho[i] + rho[j]);
      if (-mu > maxMu) maxMu = -mu;
    }
    // artificial pressure (negative-pressure part)
    if (apEps > 0) {
      let R = 0;
      if (Pi < 0) R -= apEps * Pi;
      if (Pj < 0) R -= apEps * Pj;
      if (R > 0) {
        const fw = PW[k] * iWdx;
        term += R * (apN === 4 ? fw * fw * fw * fw : Math.pow(fw, apN));
      }
    }
    const s = m * term * F;
    const fx = s * dx, fy = s * dy;
    ax[i] -= fx; ay[i] -= fy;
    if (j < nFluid) { ax[j] += fx; ay[j] += fy; }
    if (shifting) {
      const fw = PW[k] * iWdx;
      const c = (1 + 0.2 * fw * fw * fw * fw) * F;
      const vj = m / rho[j], vi = m / rho[i];
      gcx[i] += vj * c * dx; gcy[i] += vj * c * dy;
      if (j < nFluid) { gcx[j] -= vi * c * dx; gcy[j] -= vi * c * dy; }
    }
  }
  sph.maxMu = maxMu;
}

// ---------------------------------------------------------------- time step

// The stable step for the current state (Monaghan & Kos 1999), also stored
// per limit in sph.dtLimits so a figure can show which one binds.
export function stableDt(sph) {
  const { nFluid, ax, ay, cs, h } = sph;
  let a2 = 0, cmax = sph.c0;
  for (let i = 0; i < nFluid; i++) {
    const q = ax[i] * ax[i] + ay[i] * ay[i];
    if (q > a2) a2 = q;
    if (cs[i] > cmax) cmax = cs[i];
  }
  const cv = (sph.cfl * h) / (cmax + sph.maxMu);
  const force = a2 > 0 ? sph.forceCfl * Math.sqrt(h / Math.sqrt(a2)) : Infinity;
  const nu = (sph.alpha * h * cmax) / 8;
  const visc = nu > 0 ? (sph.viscCfl * h * h) / nu : Infinity;
  sph.dtLimits.cv = cv; sph.dtLimits.force = force; sph.dtLimits.visc = visc;
  return Math.min(cv, force, visc);
}

// ---------------------------------------------------------------- step

// Advance one kick-drift-kick step. dt defaults to the stable step; pass a
// number to force one (too large a step is a lesson too). Returns dt used.
// The run is flagged sph.blownUp when a velocity turns non-finite or a
// particle drifts more than h in one step (sph.maxDrift = max |v| dt / h);
// after that step() does nothing and returns 0.
export function step(sph, dt) {
  if (sph.blownUp) return 0;
  if (!(dt > 0)) dt = stableDt(sph);
  const { x, y, vx, vy, ax, ay, nFluid } = sph;
  const half = 0.5 * dt;
  for (let i = 0; i < nFluid; i++) {
    vx[i] += half * ax[i];
    vy[i] += half * ay[i];
  }
  if (sph.density !== 'summation') densityHalfKick(sph, dt);
  let drift2 = 0, finite = true;
  for (let i = 0; i < nFluid; i++) {
    const sx = dt * vx[i], sy = dt * vy[i];
    x[i] += sx;
    y[i] += sy;
    const d2 = sx * sx + sy * sy;
    if (d2 > drift2) drift2 = d2;
    else if (!(d2 >= 0)) finite = false; // NaN
  }
  sph.maxDrift = finite ? Math.sqrt(drift2) / sph.h : NaN;
  if (sph.periodic) {
    const Lx = sph.box[0], Ly = sph.box[1];
    for (let i = 0; i < nFluid; i++) {
      if (x[i] < 0) x[i] += Lx; else if (x[i] >= Lx) x[i] -= Lx;
      if (y[i] < 0) y[i] += Ly; else if (y[i] >= Ly) y[i] -= Ly;
    }
  }
  interact(sph, dt);
  let bad = !(sph.maxDrift <= 1);
  for (let i = 0; i < nFluid; i++) {
    vx[i] += half * ax[i];
    vy[i] += half * ay[i];
    if (!(vx[i] * vx[i] + vy[i] * vy[i] < 1e30)) bad = true;
  }
  if (bad) sph.blownUp = true;
  if (sph.shifting > 0) shift(sph, dt);
  sph.t += dt;
  sph.steps++;
  sph.lastDt = dt;
  return dt;
}

// First half of the continuity update, rho += dt/2 D(x^n, v^{n+1/2}), using
// the pair list (geometry) of the previous evaluation at x^n. interact()
// adds dt/2 D(x^{n+1}, v^{n+1/2}) after the drift: a trapezoid in x with the
// velocity held at the half step, so the drift of (x, rho) is second order
// and the density-velocity coupling stays time-centred.
function densityHalfKick(sph, dt) {
  const { rho, nFluid, work } = sph;
  continuityRate(sph, work, sph.pairs.count, rho);
  const half = 0.5 * dt;
  for (let i = 0; i < nFluid; i++) rho[i] += half * work[i];
}

// out_i = drho_i/dt over the first np pairs of the pair list: the continuity
// equation, plus the delta-SPH density diffusion when densityDiffusion > 0
// (Molteni & Colagrossi 2009) with the hydrostatic part of the density
// difference removed (Fourtakas et al. 2019), fluid-fluid pairs only:
//   D_i += delta h c0 sum_j 2 [ (rho_j - rho_i) - (rho^H_j - rho^H_i) ]
//          (x_j - x_i) . grad_i W_ij / (r_ij^2 + 0.01 h^2) * m_j / rho_j,
//   rho^H_j - rho^H_i = (rho0 / c0^2) g . (x_j - x_i)   (linearised Tait).
// rho is the density the diffusion term sees (the state's, or a predictor).
function continuityRate(sph, out, np, rho) {
  const { vx, vy, nFluid, mass: m } = sph;
  const { i: PI_, j: PJ, dx: PDX, dy: PDY, r2: PR2, f: PF } = sph.pairs;
  for (let i = 0; i < nFluid; i++) out[i] = 0;
  const delta = sph.densityDiffusion;
  if (!(delta > 0)) {
    for (let k = 0; k < np; k++) {
      const i = PI_[k], j = PJ[k];
      const dvx = vx[i] - vx[j], dvy = vy[i] - vy[j]; // walls have v = 0
      const d = m * (dvx * PDX[k] + dvy * PDY[k]) * PF[k];
      out[i] += d;
      if (j < nFluid) out[j] += d;
    }
    return;
  }
  const irho = sph.vsum; // scratch (summation-only otherwise): 1 / rho
  for (let i = 0; i < nFluid; i++) irho[i] = 1 / rho[i];
  const eta2 = ETA2 * sph.h * sph.h;
  const cd = 2 * delta * sph.h * sph.c0;
  const hy = sph.diffusionHydrostatic ? sph.rho0 / (sph.c0 * sph.c0) : 0, gx = sph.gx * hy, gy = sph.gy * hy;
  for (let k = 0; k < np; k++) {
    const i = PI_[k], j = PJ[k];
    const dx = PDX[k], dy = PDY[k], F = PF[k];
    const dvx = vx[i] - vx[j], dvy = vy[i] - vy[j];
    const d = m * (dvx * dx + dvy * dy) * F;
    if (j < nFluid) {
      // (rho_j - rho_i) minus its hydrostatic part; dx, dy = x_i - x_j, and
      // (x_j - x_i) . grad_i W_ij = -r^2 F
      const r2 = PR2[k];
      const s = (-cd * m * (rho[j] - rho[i] + gx * dx + gy * dy) * F * r2) / (r2 + eta2);
      out[i] += d + s * irho[j];
      out[j] += d - s * irho[i];
    } else {
      out[i] += d;
    }
  }
}

// Fickian particle shifting (Lind et al. 2012) with D = A h |v_i| dt. It runs
// after the step, so the next step's first density half kick sees the pair
// geometry from before the shift (at most 0.1 dx off).
function shift(sph, dt) {
  const { x, y, vx, vy, gcx, gcy, kernelSum, nFluid, h, dx } = sph;
  const A = sph.shifting, cap = 0.1 * dx, cap2 = cap * cap;
  for (let i = 0; i < nFluid; i++) {
    if (kernelSum[i] < 0.85) continue; // free surface: leave alone
    const D = A * h * Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]) * dt;
    let sx = -D * gcx[i], sy = -D * gcy[i];
    const s2 = sx * sx + sy * sy;
    if (s2 > cap2) { const k = cap / Math.sqrt(s2); sx *= k; sy *= k; }
    x[i] += sx;
    y[i] += sy;
  }
  if (sph.periodic) {
    const Lx = sph.box[0], Ly = sph.box[1];
    for (let i = 0; i < nFluid; i++) {
      if (x[i] < 0) x[i] += Lx; else if (x[i] >= Lx) x[i] -= Lx;
      if (y[i] < 0) y[i] += Ly; else if (y[i] >= Ly) y[i] -= Ly;
    }
  }
}

// Run until time t (or maxSteps). Returns the number of steps taken.
export function advance(sph, tEnd, maxSteps = Infinity) {
  let k = 0;
  while (sph.t < tEnd && k < maxSteps && !sph.blownUp) {
    const dt = Math.min(stableDt(sph), tEnd - sph.t);
    step(sph, dt > 0 ? dt : undefined);
    k++;
  }
  return k;
}

// ---------------------------------------------------------------- diagnostics

// Energies, density error, momentum, dam-break front, kernel-sum deficiency
// and the clumping metric. Pass `out` to reuse an object.
export function diagnostics(sph, out = {}) {
  updateKernelSum(sph);
  const { nFluid, x, y, vx, vy, rho, p, mass: m, rho0, B, gamma, g, kernelSum, dx } = sph;
  const pb = sph.backgroundPressure;
  let ke = 0, pe = 0, ee = 0, px = 0, py = 0, maxErr = 0, sumErr = 0, front = -Infinity, vmax2 = 0, ksMin = Infinity;
  // Elastic energy per unit mass, e(rho) = integral of p / rho^2 d rho from
  // rho0 (Tait): B rho^(gamma-1) / ((gamma-1) rho0^gamma) + (B - p_b) / rho
  // - u0; for gamma = 1 (linear EOS) its limit (B / rho0) ln(rho / rho0)
  // + (B - p_b) (1 / rho - 1 / rho0).
  const linear = gamma === 1;
  const u0 = linear ? (B - pb) / rho0 : B / ((gamma - 1) * rho0) + (B - pb) / rho0;
  const ca = linear ? B / rho0 : B / ((gamma - 1) * Math.pow(rho0, gamma));
  const ir0 = 1 / rho0;
  for (let i = 0; i < nFluid; i++) {
    const v2 = vx[i] * vx[i] + vy[i] * vy[i];
    ke += 0.5 * m * v2;
    pe += m * g * y[i];
    const r = rho[i];
    ee += m * ((linear ? ca * Math.log(r * ir0) : ca * Math.pow(r, gamma - 1)) + (B - pb) / r - u0);
    px += m * vx[i];
    py += m * vy[i];
    const e = Math.abs(rho[i] / rho0 - 1);
    if (e > maxErr) maxErr = e;
    sumErr += e;
    if (x[i] > front) front = x[i];
    if (v2 > vmax2) vmax2 = v2;
    if (kernelSum[i] < ksMin) ksMin = kernelSum[i];
  }
  const nn = nearestNeighbours(sph);
  out.t = sph.t;
  out.steps = sph.steps;
  out.dt = sph.lastDt;
  out.kinetic = ke;
  out.potential = pe;
  out.elastic = ee;
  out.total = ke + pe + ee;
  out.momentumX = px;
  out.momentumY = py;
  out.maxSpeed = Math.sqrt(vmax2);
  out.maxDensityError = maxErr;
  out.meanDensityError = sumErr / nFluid;
  out.front = front;
  out.kernelSumMin = ksMin;
  out.minNeighbourRatio = nn.min / dx;
  out.meanNeighbourRatio = nn.mean / dx;
  out.pairedFraction = nn.paired;
  out.maxPressure = maxOf(p, nFluid);
  out.blownUp = sph.blownUp;
  return out;
}

// Refresh sph.kernelSum = sum_j (m / rho0) W_ij (self and wall particles
// included) from the current pair list: the fraction of the kernel that is
// filled with particles. It is 1 in the bulk and drops where a free surface
// truncates the kernel (on the outer row of a flat surface 0.76 for Wendland
// at h = 1.5 dx, 0.79 for the cubic spline at 1.2 dx). It
// is exactly the density that summation would give, divided by rho0, which
// is why summation underestimates density at a free surface.
export function updateKernelSum(sph) {
  const { i, j, w, count } = sph.pairs;
  const ks = sph.kernelSum, nFluid = sph.nFluid, ir0 = 1 / sph.rho0;
  massSum(ks, i, j, w, count, nFluid, sph.mass, sph.W0);
  for (let k = 0; k < nFluid; k++) ks[k] *= ir0;
  return ks;
}

function maxOf(a, n) {
  let s = -Infinity;
  for (let k = 0; k < n; k++) if (a[k] > s) s = a[k];
  return s;
}

// Nearest fluid neighbour of every fluid particle, from the current pair
// list (fills sph.nnDist; capped at the kernel support). paired is the
// fraction of fluid particles whose nearest neighbour is closer than
// threshold * dx. min and mean are absolute distances; diagnostics()
// reports them in units of dx.
export function nearestNeighbours(sph, threshold = 0.5) {
  const { nFluid, nnDist, support, pairs } = sph;
  for (let i = 0; i < nFluid; i++) nnDist[i] = support * support;
  const { i: PI_, j: PJ, r2: PR2, count } = pairs;
  for (let k = 0; k < count; k++) {
    const j = PJ[k];
    if (j >= nFluid) continue;
    const i = PI_[k], r2 = PR2[k];
    if (r2 < nnDist[i]) nnDist[i] = r2;
    if (r2 < nnDist[j]) nnDist[j] = r2;
  }
  let min = Infinity, sum = 0, paired = 0;
  const lim = threshold * sph.dx;
  for (let i = 0; i < nFluid; i++) {
    const d = Math.sqrt(nnDist[i]);
    nnDist[i] = d;
    if (d < min) min = d;
    sum += d;
    if (d < lim) paired++;
  }
  const st = sph.nnStats;
  st.min = min; st.mean = sum / nFluid; st.paired = paired / nFluid;
  return st;
}

// SPH-interpolated (Shepard-normalised) fluid pressure p at a point. It is
// the model pressure, background pressure p_b included: in the free-surface
// presets (p_b = 0) it is what a gauge would read; on the lattices it reads
// p_b in a fluid at rest. O(nFluid); call occasionally.
export function probePressure(sph, px, py) {
  const { nFluid, x, y, p, rho, mass: m, h, kernel, support } = sph;
  let num = 0, den = 0;
  const s2 = support * support;
  for (let j = 0; j < nFluid; j++) {
    const dx = px - x[j], dy = py - y[j];
    const r2 = dx * dx + dy * dy;
    if (r2 >= s2) continue;
    const w = (m / rho[j]) * kernelW(kernel, Math.sqrt(r2), h);
    num += p[j] * w;
    den += w;
  }
  return den > 0 ? num / den : 0;
}

// Dam-break scales: nondimensional front Z = x/a and time T = t sqrt(gH)/a
// (Martin & Moyce 1952; T = t sqrt(2g/a) for H = 2a), and Ritter's dry-bed
// shallow-water front x = a + 2 sqrt(g H) t, i.e. Z = 1 + 2T. The front x is
// the largest x of any fluid particle: the toe of the surge on the floor
// until the water reaches the far wall (x = tankWidth) and stays there.
// Pass `out` to reuse an object.
export function damBreakFront(sph, out = {}) {
  const { a, H } = sph.meta;
  const front = maxOf(sph.x, sph.nFluid);
  const T = sph.t * Math.sqrt((sph.g * H) / (a * a));
  out.x = front;
  out.Z = front / a;
  out.T = T;
  out.ritterZ = 1 + 2 * T;
  out.ritterX = a + 2 * Math.sqrt(sph.g * H) * sph.t;
  return out;
}
