// Chapter 13: lattice Boltzmann and particles. Prose, questions, glossary and
// gallery entries. The figures live in ./lattice-particles/ and run the shared
// kernels src/sims/lbm.js and src/sims/sph.js, plus this chapter's Boolean
// lattice-gas kernel src/sims/ch-lattice-particles-gas.js (tested in
// tests/fluid-course/ch-lattice-particles.test.js). The vortex-street widget
// also runs on the course home page with data-preset="hero".

import { mountStreet } from './lattice-particles/street.js';
import { mountCollide } from './lattice-particles/collide.js';
import { mountTau } from './lattice-particles/tau.js';
import { mountMach } from './lattice-particles/mach.js';
import { mountGas } from './lattice-particles/gas.js';
import { mountSph } from './lattice-particles/sph.js';
import { mountTensile } from './lattice-particles/tensile.js';

export const chapter = {
  id: 'lattice-particles',
  title: 'Lattice Boltzmann and particles',
  short: 'Lattices & particles',
  blurb: 'Collide-and-stream on a lattice and smoothed particle hydrodynamics, two alternatives to grid-based Navier–Stokes solvers.',
  minutes: 50,
  html: String.raw`
<p class="lead-in">Every method so far in this course starts from the Navier–Stokes equations and discretises them on a grid, replacing derivatives with differences and obtaining the pressure from a Poisson solve. This chapter explores two alternatives. In the first approach, particles hop between the nodes of a lattice and collide by simple local rules chosen so that their macroscopic averages obey the Navier–Stokes equations, leading from Boolean lattice gases to the <dfn data-term="lattice-boltzmann">lattice Boltzmann method</dfn>. The second approach dispenses with the grid altogether. In <dfn data-term="sph">smoothed particle hydrodynamics</dfn>, the fluid is represented by a cloud of particles that carry mass and move with the flow, and every derivative is evaluated as a weighted sum over neighbours. Although both methods are straightforward to implement and parallelise well, each introduces failure modes absent from grid solvers, which the interactive figures below let you trigger and diagnose directly.</p>

<h2 id="lattice-gas">Lattice gases: a fluid made of bits</h2>
<p>A real gas is a crowd of molecules that fly in straight lines and bounce off each other. Nobody tracks them one by one to design a wing. The <a href="#/continuum/continuum">continuum hypothesis</a> of chapter 1 says that once you average over many collisions, the details stop mattering. Mass, momentum and energy are conserved at every collision, and their averages obey the Navier–Stokes equations. The <dfn data-term="mean-free-path">mean free path</dfn> and the molecular speed only set the values of the viscosity and the sound speed.</p>
<p>Because the microscopic details drop out of the macroscopic equations, the collision rules can be chosen to suit a computer. Suppose particles sit on the nodes of a lattice, where each particle moves along one of a few unit velocities $\mathbf{c}_q$ by one link per time step. With at most one particle per velocity direction at each node, the state of a node is specified by a handful of bits. Each time step has two stages. In the <em>collision</em> stage, the particles at each node are rearranged by a fixed rule that keeps their number and their total momentum. In the <em>streaming</em> stage, every particle hops one link along its velocity. If $n_q(\mathbf{x}, t) \in \{0, 1\}$ indicates whether velocity slot $q$ at node $\mathbf{x}$ is occupied, the evolution rule is</p>
<div class="eq" id="eq-lga">$$n_q(\mathbf{x} + \mathbf{c}_q,\ t + 1) = n_q(\mathbf{x}, t) + C_q\big(\mathbf{n}(\mathbf{x}, t)\big),$$<span class="eq-tag">(13.1)</span></div>
<p>where the collision term $C_q$ is $-1$, $0$ or $+1$. This is a <dfn data-term="lattice-gas">lattice gas</dfn>, a cellular automaton whose macroscopic averages approximate a fluid. Because the update rules only permute bits in integer arithmetic, mass and momentum are conserved <em>exactly</em> with no floating-point round-off.</p>
<p>The first lattice gas, called HPP after its authors, used a square lattice with four velocities: east, north, west and south. When exactly two particles meet head on, they leave at right angles; every other arrangement passes straight through. Although HPP conserves mass and momentum, a four-velocity square lattice lacks sufficient rotational symmetry, so its large-scale equations depend on the angle of the flow relative to the grid axes.</p>
<p>Worse, HPP conserves far too many quantities. A head-on collision swaps an east–west pair, which carries no $x$-momentum, for a north–south pair, which also carries none, and east- and west-moving particles never leave their row. Consequently the total $x$-momentum of every row is conserved separately for all time, as is the $y$-momentum of every column—spurious invariants that a real fluid does not share. In a shear flow whose velocity points along $x$ and varies with $y$, viscosity should diffuse momentum across the rows, but in HPP the momentum of each row remains frozen.</p>
<aside class="who" data-person="hardy-pomeau-de-pazzis-hpp">J. Hardy, Y. Pomeau and O. de Pazzis published the square-lattice model in 1973 (Phys. Rev. Lett., July; J. Math. Phys., December), followed by a longer study of its transport properties in 1976, to investigate statistical-mechanical questions such as the decay of correlations. Their model is a Boolean lattice gas rather than a lattice Boltzmann scheme, which emerged fifteen years later, though the two are sometimes conflated.</aside>
<p>The repair came in 1986, when Frisch, Hasslacher and Pomeau moved to a triangular lattice where each node has six neighbours and six velocities at 60° to each other. A head-on pair now turns through $\pm 60°$, and a symmetric triple of particles at 120° turns into the other triple, removing the spurious invariants that head-on collisions alone would leave. Six directions provide enough rotational symmetry to make the large-scale equations isotropic and recover the Navier–Stokes equations. The model, called FHP, also has a computable viscosity. Under the molecular-chaos approximation that colliding particles are uncorrelated, a lattice with a fraction $d$ of its slots occupied has kinematic viscosity</p>
<div class="eq" id="eq-fhp-nu">$$\nu(d) = \frac{1}{12\,d\,(1 - d)^{3}} - \frac{1}{8}$$<span class="eq-tag">(13.2)</span></div>
<p>in lattice units (one link, one step). The figure runs both gases on a sinusoidal shear wave that in an isotropic viscous fluid decays like $\exp(-\nu k^2 t)$ regardless of orientation. Because the raw Boolean bits are noisy, the display averages the velocity over boxes of about six by six nodes to make the wave visible.</p>
<div data-quiz="q1"></div>
<figure data-widget="lattice-particles-gas" class="wide"><figcaption>Two lattice gases on a periodic box of 128 by 128 nodes (FHP: 128 by 148 rows of its triangular lattice). Colour shows the velocity along the wave, averaged over small boxes; the plot tracks the wave amplitude $A/U$ against time step. For FHP the dashed curve is the decay predicted by (13.2). The readouts count particles and total momentum, both of which remain strictly constant.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> on HPP with the flow along $x$. After 8000 steps <b>A / U</b> is unchanged from its initial value (the random fill puts it within a few per cent of 1), and <b>ν measured</b> reads 0. The stripes jitter with statistical noise, but the wave never decays.</li>
<li>Choose <b>at 45°</b>. The same wave, rotated to cut diagonally across the lattice, now decays. The viscosity depends on direction because the underlying square lattice is anisotropic.</li>
<li>Switch to <b>FHP</b> and run the wave along $x$, then along $y$. Both decay at nearly the rate given by (13.2). Averaged over six random seeds at $d = 0.25$, the measured viscosities are 0.683 and 0.677 against the theoretical value of 0.665.</li>
<li>Move <b>Occupation d</b> to 0.15 on FHP. The measured viscosity now runs 15 to 30% above (13.2) because particle correlations become significant away from $d \approx 0.25$. Note that <b>Δ particles</b> stays at 0 throughout.</li>
</ol></div>
<details class="deeper"><summary>Go deeper: why six directions and not four</summary>
<p>The momentum flux of a lattice gas near equilibrium is built from sums over the velocity set. The viscous part involves the fourth-order tensor $T_{abcd} = \sum_q c_{qa} c_{qb} c_{qc} c_{qd}$. For the large-scale equations to be isotropic, this tensor must be invariant under rotation, which in two dimensions requires $T_{xxxx} = 3\,T_{xxyy}$, matching the isotropic tensor $\delta_{ab}\delta_{cd} + \delta_{ac}\delta_{bd} + \delta_{ad}\delta_{bc}$.</p>
<p>For the square lattice, only the east and west velocities have an $x$-component, giving $T_{xxxx} = 1 + 1 = 2$, while no velocity has both components, so $T_{xxyy} = 0$ and the ratio $T_{xxxx}/T_{xxyy}$ diverges instead of equalling 3. For the six velocities at angles $60°\,q$,</p>
$$T_{xxxx} = \sum_{q=0}^{5}\cos^4(60°\,q) = 1 + 4\cdot\tfrac{1}{16} + 1 = \tfrac{9}{4},\qquad T_{xxyy} = \sum_{q=0}^{5}\cos^2\sin^2(60°\,q) = 4\cdot\tfrac{3}{16} = \tfrac{3}{4},$$
<p>giving the required ratio of 3. The lattice Boltzmann scheme in the next section achieves the same isotropic ratio on a square grid by using nine velocities weighted so that the fourth-order sums satisfy $T_{xxxx} = 3\,T_{xxyy}$.</p>
</details>
<p>Although FHP demonstrated that a discrete velocity set on a symmetric lattice recovers the Navier–Stokes equations, Boolean lattice gases have three practical drawbacks. Their statistical noise requires heavy spatial or temporal averaging; they break Galilean invariance because a density-dependent factor multiplies the advection term, causing a vortex carried by a uniform stream to travel at the wrong speed; and the viscosity in (13.2) has a positive lower bound, which caps the Reynolds number. All three limitations motivated evolving the ensemble-averaged populations directly.</p>
<aside class="who" data-person="frisch-hasslacher-pomeau-fhp">Uriel Frisch, Brosl Hasslacher and Yves Pomeau showed in a letter of April 1986 that a lattice gas on a hexagonal lattice reproduces the Navier–Stokes equation. Their abstract says such a gas “simulates the Navier-Stokes equation, and can be used to design simple, massively parallel computing machines”. Stephen Wolfram published a long paper on cellular-automaton fluids later the same year, and the two sides have disagreed about priority since; read both and judge for yourself.</aside>

<h2 id="lbm">Lattice Boltzmann: collide and stream</h2>
<p>Statistical noise disappears if the simulation tracks ensemble averages instead of individual bits, replacing each Boolean occupation $n_q$ with a real number $f_q(\mathbf{x}, t)$ that represents the expected number of particles at node $\mathbf{x}$ moving with velocity $\mathbf{c}_q$. In kinetic theory this average is called a velocity distribution or population. In 1988 McNamara and Zanetti evolved these averages directly on the FHP lattice using the lattice-gas collision rules; as their abstract notes, the approach “completely eliminates the statistical noise that plagues the usual lattice-gas simulations”. This is the lattice Boltzmann equation, named after the Boltzmann equation of kinetic theory.</p>
<aside class="who" data-person="mcnamara-zanetti">Guy McNamara and Gianluigi Zanetti (Phys. Rev. Lett., November 1988) evolved the averaged lattice-gas equation directly as a numerical solver rather than using it only to analyse Boolean lattice gases. Their collision operator was still the complicated polynomial inherited from the lattice gas; linearised and single-relaxation collision operators followed in 1989 (Higuera, Succi and Benzi; Higuera and Jiménez).</aside>
<p>Because the macroscopic equations depend on conservation and symmetry rather than the detailed Boolean collision table, the collision operator can be simplified to a single linear relaxation. At each step, every population relaxes a fixed fraction $1/\tau$ of the way towards its local equilibrium value $f_q^{\mathrm{eq}}$ before streaming to the neighbouring node:</p>
<div class="eq" id="eq-lbgk">$$f_q(\mathbf{x} + \mathbf{c}_q,\ t + 1) = f_q - \frac{1}{\tau}\Big(f_q - f_q^{\mathrm{eq}}\Big),$$<span class="eq-tag">(13.3)</span></div>
<p>with everything on the right evaluated at node $\mathbf{x}$ and time $t$.</p>
<p>The relaxation term is the <dfn data-term="bgk-collision">BGK collision</dfn> operator, after Bhatnagar, Gross and Krook, who introduced a single-relaxation-time model in kinetic theory in 1954. The parameter $\tau$ is the dimensionless <dfn data-term="relaxation-time">relaxation time</dfn> measured in time steps, and the right-hand side of (13.3) is the post-collision population. The shift of $\mathbf{x}$ by $\mathbf{c}_q$ on the left is <dfn data-term="streaming">streaming</dfn>, in which each post-collision population is copied unchanged to the neighbouring node along $\mathbf{c}_q$.</p>
<p>The lattice used throughout this chapter has nine velocities on a square grid: one at rest, four to the nearest neighbours and four to the diagonal ones. It is called D2Q9 (two dimensions, nine velocities). Density and momentum are sums over the populations of a node:</p>
<div class="eq" id="eq-moments">$$\rho = \sum_{q=0}^{8} f_q,\qquad \rho\,\mathbf{u} = \sum_{q=0}^{8} \mathbf{c}_q\, f_q.$$<span class="eq-tag">(13.4)</span></div>
<p>The equilibrium is a second-order Mach-number expansion of the Maxwell–Boltzmann distribution, with weights $w_q = 4/9$ for the rest population, $1/9$ for the four axis directions and $1/36$ for the four diagonals, and with $c_s^2 = 1/3$:</p>
<div class="eq" id="eq-feq">$$f_q^{\mathrm{eq}} = w_q\,\rho\left[1 + \frac{\mathbf{c}_q\cdot\mathbf{u}}{c_s^2} + \frac{(\mathbf{c}_q\cdot\mathbf{u})^2}{2c_s^4} - \frac{\mathbf{u}\cdot\mathbf{u}}{2c_s^2}\right].$$<span class="eq-tag">(13.5)</span></div>
<p>The weights are chosen so that the zeroth and first moments of $f_q^{\mathrm{eq}}$ equal $\rho$ and $\rho\mathbf{u}$, ensuring that collisions conserve mass and momentum. Its second moment gives the equilibrium momentum flux $\rho c_s^2\,\mathbf{I} + \rho\mathbf{u}\mathbf{u}$, combining an isotropic pressure $p = c_s^2\rho$ with the advective flux $\rho\mathbf{u}\mathbf{u}$, where $c_s = 1/\sqrt{3}$ is the lattice speed of sound.</p>
<p>Viscous stresses arise from the non-equilibrium part $f_q - f_q^{\mathrm{eq}}$. A velocity gradient continually drives the populations away from equilibrium while collisions relax them back; the longer the relaxation time $\tau$, the further momentum is transported across shear layers between collisions. Carrying out a multiscale Chapman–Enskog expansion shows that streaming and BGK collision together reproduce the Navier–Stokes equations with kinematic viscosity</p>
<div class="eq" id="eq-lbm-nu">$$\nu = c_s^2\left(\tau - \tfrac{1}{2}\right) = \frac{\tau - \tfrac{1}{2}}{3}$$<span class="eq-tag">(13.6)</span></div>
<p>in lattice units, up to compressibility errors of order $\mathrm{Ma}^2$ (<a href="#/lattice-particles/lbm-limits">see the limits below</a>). The $-\tfrac12$ shift comes from the second-order truncation error of the discrete streaming step, which has the exact form of a negative viscosity and is absorbed directly into $\nu$. Consequently $\tau$ must remain strictly above $\tfrac12$, since $\tau = \tfrac12$ corresponds to zero viscosity.</p>
<aside class="who" data-person="qian-dhumieres-lallemand">Y. H. Qian, D. d’Humières and P. Lallemand (Europhys. Lett., February 1992) replaced the lattice-gas collision with a single relaxation towards a chosen equilibrium. Their abstract says the model “is noise-free, has Galileian invariance and a velocity-independent pressure”, the three defects of lattice gases removed at once. Credit is shared: Chen, Chen, Martínez and Matthaeus (December 1991) and Chen, Chen and Matthaeus (April 1992) published closely related models, and Koelman a simple scheme in 1991.</aside>
<p>The figure decomposes a single step on a 3 by 3 periodic lattice. Each node draws its nine populations as arrows scaled by $f_q/w_q$, so a node at rest shows nine equal arrows. The middle node starts with a non-zero velocity and an added non-equilibrium perturbation—a shear stress and a normal stress that leave both its density and its momentum unchanged. The open rings mark where each arrow would end at local equilibrium.</p>
<figure data-widget="lattice-particles-collide"><figcaption>One lattice-Boltzmann step taken apart (lbm.js on a 3 by 3 periodic D2Q9 lattice). <b>Collide</b> relaxes every node towards its own equilibrium (the rings); <b>Stream</b> moves every population one node along its arrow. The readouts measure the factor by which the last collision multiplied the middle node’s non-equilibrium part, beside the BGK prediction $1 - 1/\tau$.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Collide</b>. The density <b>ρ</b> and velocity <b>u</b> of the middle node stay constant while every arrow relaxes towards its ring. At $\tau = 0.8$, <b>last collision ×</b> equals $1 - 1/\tau = -0.25$, meaning that each arrow overshoots its ring by a quarter of the initial departure, so the non-equilibrium part shrinks and changes sign.</li>
<li>Press <b>Stream</b>. Each post-collision population is copied directly to its target neighbour, spreading the middle node’s momentum to the eight surrounding nodes without arithmetic.</li>
<li>Set <b>Relaxation time τ</b> to 1 and collide to see the non-equilibrium part vanish in a single step. At $\tau = 2$ the factor is $+0.5$, relaxing half-way without overshooting, whereas at $\tau = 0.55$ the factor is $-0.818$, so each collision overshoots almost to the mirror image and barely damps the non-equilibrium part.</li>
</ol></div>
<details class="deeper"><summary>Go deeper: where $\nu = (\tau - \tfrac12)/3$ comes from</summary>
<p>The Chapman–Enskog expansion treats the departure from equilibrium as small, of the order of the <dfn data-term="knudsen-number">Knudsen number</dfn>—the ratio of the collision length (here one lattice spacing times $\tau$) to the macroscopic length scale of the flow. Expanding the streamed term in (13.3) in a second-order Taylor series gives</p>
$$\Big(\partial_t + \mathbf{c}_q\cdot\nabla\Big) f_q + \tfrac12\Big(\partial_t + \mathbf{c}_q\cdot\nabla\Big)^2 f_q + \dots = -\frac{1}{\tau}\Big(f_q - f_q^{\mathrm{eq}}\Big).$$
<p>To first order the non-equilibrium part is $f_q - f_q^{\mathrm{eq}} \approx -\tau\,(\partial_t + \mathbf{c}_q\cdot\nabla) f_q^{\mathrm{eq}}$. Substituting this first-order relation into the second-order term combines the two into $-(\tau - \tfrac12)(\partial_t + \mathbf{c}_q\cdot\nabla) f_q^{\mathrm{eq}}$, where the $-\tfrac12$ arises from the second-order Taylor term of the streaming step.</p>
<p>Taking velocity moments of the expanded equation yields the macroscopic conservation laws. Because collisions conserve mass and momentum, the zeroth and first moments give the continuity and momentum equations. The momentum flux is $\sum_q \mathbf{c}_q\mathbf{c}_q f_q$, whose equilibrium part is $\rho c_s^2\mathbf{I} + \rho\mathbf{u}\mathbf{u}$. Evaluating the non-equilibrium part with the $-\tfrac12$ shift included produces $-\rho\,c_s^2(\tau - \tfrac12)\big(\nabla\mathbf{u} + \nabla\mathbf{u}^{\mathrm{T}}\big)$, a Newtonian viscous stress with $\nu = c_s^2(\tau - \tfrac12)$. This step relies on the isotropy of the weighted fourth-order sums of D2Q9, namely $\sum_q w_q c_{qx}^4 = \tfrac13$ and $\sum_q w_q c_{qx}^2 c_{qy}^2 = \tfrac19$, which have the required ratio of 3. A remaining error term of order $\rho u^3$ appears because nine discrete velocities cannot match the full third moment of a continuous Maxwellian; that term produces the Mach-number error examined in <a href="#/lattice-particles/lbm-limits">the limits section</a>. Krüger et al. (2017, ch. 4) give the full derivation.</p>
</details>
<p>Unlike the <a href="#/advection/upwind">upwind scheme</a> of chapter 7, which interpolates across fractions of a cell and smears profiles, lattice Boltzmann shifts each population by an exact lattice link per step without interpolation error. All of the physical approximation is concentrated in the local collision operator, so each node needs only its own nine populations to collide and its eight neighbours to stream. Instead of solving a global Poisson equation for the pressure, the scheme evaluates $p = c_s^2\rho$ locally, which makes the simulated fluid slightly compressible (<a href="#/lattice-particles/lbm-limits">see the limits section</a>).</p>
<div data-quiz="q2"></div>

<h2 id="vortex-street">The cylinder wake and the vortex street</h2>
<p>When a circular cylinder sits in a steady stream at very low speed, the flow wraps smoothly round it and closes up behind. At higher speeds, the boundary layer separates from the rear of the cylinder to form a symmetric pair of recirculating eddies turning in opposite directions. Above a critical speed, that steady pair becomes unstable: one eddy grows, detaches and drifts downstream while the opposite eddy forms in its place, organising the wake into two staggered rows of alternating vortices. This periodic wake is the <dfn data-term="vortex-street">vortex street</dfn>, visible behind islands in satellite cloud images and audible when wind makes an overhead wire hum.</p>
<p>Which regime appears is governed by the <dfn data-term="reynolds-number">Reynolds number</dfn> $\mathrm{Re} = UD/\nu$ based on the free-stream speed $U$ and cylinder diameter $D$. Periodic vortex shedding begins at a critical value near $\mathrm{Re} \approx 47\text{–}49$ for an isolated circular cylinder (Williamson 1996 reviews the measurements). Above onset, the shedding frequency $f$ is characterised by the <dfn data-term="strouhal-number">Strouhal number</dfn> introduced in <a href="#/similarity/numbers">chapter 5</a>:</p>
<div class="eq" id="eq-strouhal">$$\mathrm{St} = \frac{f D}{U},\qquad \mathrm{Re} = \frac{U D}{\nu}.$$<span class="eq-tag">(13.7)</span></div>
<p>For a circular cylinder, St rises from about 0.12 at onset to about 0.2 and remains near 0.2 across several decades of Reynolds number, making the cylinder wake a standard benchmark for unsteady flow solvers. Reproducing both the onset Reynolds number and the Strouhal curve verifies that a solver’s viscosity, time stepping and wall boundary conditions are working together.</p>
<p>The figure simulates a cylinder wake on a D2Q9 lattice of 240 by 72 nodes, with a cylinder 12 nodes across, a uniform inflow of $U = 0.08$ lattice units on the left, an outflow on the right, and periodic top and bottom boundaries. Colour shows the <dfn data-term="vorticity">vorticity</dfn>, the local curl of the velocity field. The Reynolds-number slider sets $\tau$ through (13.6), giving $\nu = 0.08 \times 12/150 = 0.0064$ and $\tau = 0.5192$ at $\mathrm{Re} = 150$. A probe three diameters downstream of the cylinder records the cross-stream velocity, from whose period the widget measures St alongside Williamson’s (1988) experimental curve fit.</p>
<figure data-widget="vortex-street" class="wide"><figcaption>Flow past a cylinder on a D2Q9 lattice (lbm.js, BGK with a regularised inlet), coloured by positive and negative vorticity. The plot traces the probe’s cross-stream velocity $v/U$. The readouts report the measured Strouhal number, Williamson’s fit (valid for $49 &lt; \mathrm{Re} &lt; 178$), the maximum local Mach number and the mass drift.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> at $\mathrm{Re} = 150$. After the initial wake develops over the first thousand steps, it begins to oscillate and locks into a regular vortex street by about step 1200. Once the periodic wake settles, <b>St measured</b> reads about 0.20, compared with 0.183 from Williamson’s fit.</li>
<li>Drag <b>Reynolds number Re</b> down to 40. The oscillation damps out, leaving two steady attached eddies. In this strip the shedding onset lies between $\mathrm{Re} = 44$ and $47$.</li>
<li>Try $\mathrm{Re} = 200$, above the range of Williamson’s laminar fit. The shed vortices roll up more tightly and St rises to about 0.21. Watch <b>max Ma</b>, which stays near 0.25, below the 0.3 warning threshold of the solver’s health check.</li>
</ol></div>
<figure data-widget="vortex-street" data-preset="steady"><figcaption>The same wake at $\mathrm{Re} = 40$, below the onset of shedding. The start-up perturbation decays by about a fifth every 1000 steps, leaving a steady pair of eddies behind the cylinder.</figcaption></figure>
<p>The table compares the Strouhal numbers measured on the 72-node strip against Williamson’s experimental fit for an unbounded cylinder and against a simulation in a strip twice as wide.</p>
<table>
<thead><tr><th class="num">Re</th><th class="num">St, 72-node strip</th><th class="num">St, 144-node strip</th><th class="num">St, Williamson fit</th></tr></thead>
<tbody>
<tr><td class="num">60</td><td class="num">0.167</td><td class="num">–</td><td class="num">0.136</td></tr>
<tr><td class="num">100</td><td class="num">0.188</td><td class="num">0.176</td><td class="num">0.164</td></tr>
<tr><td class="num">150</td><td class="num">0.202</td><td class="num">0.192</td><td class="num">0.183</td></tr>
</tbody>
</table>
<p>Most of the discrepancy comes from blockage in the narrow domain rather than grid resolution. Because the periodic boundaries sit only six diameters apart and the inlet is four diameters upstream, the simulation represents an infinite row of cylinders in a confined channel rather than an isolated cylinder in an unbounded stream. Widening the strip to 144 nodes lowers St from 0.188 to 0.176 at $\mathrm{Re} = 100$, whereas doubling the resolution to a 24-node cylinder at the original aspect ratio leaves St at 0.192. As <a href="#/trust/validation">validation</a> in chapter 15 emphasises, a discrepancy with experiment often traces back to boundary geometry rather than the discretisation scheme.</p>
<aside class="note" data-label="Lattice units">Everything above is in lattice units: one node spacing, one time step. To map onto a real flow, match the Reynolds number. A 1 cm cylinder in water ($\nu = 10^{-6}\ \mathrm{m^2/s}$) at Re 150 has $U = 1.5$ cm/s. With 12 nodes across it, $\Delta x = 0.83$ mm. The lattice viscosity 0.0064 equals $\nu\,\Delta t/\Delta x^2$, which fixes $\Delta t = 4.4$ ms. Then $U\,\Delta t/\Delta x = 0.08$, as it should.</aside>
<aside class="who" data-person="theodore-von-karman">In notes to the Göttingen academy (1911, continued 1912), Theodore von Kármán showed that two rows of ideal point vortices can be stable only if they are staggered, with the row spacing about 0.28 times the spacing along a row. With H. Rubach (1912) he linked the street to the drag of the body. In his memoir <em>The Wind and Beyond</em> (1967) he recalls a congress, which he dates to 1930, where he conceded: “All right, I do not object if in London this is called Kármán Vortex Street. In Berlin, let us call it Karmansche Wirbelstrasse, and in Paris, Boulevard d'Henri Bénard.”</aside>
<aside class="history" data-era="1908"><a href="#/people/henri-benard">Henri Bénard</a> observed and filmed alternating vortices behind moving obstacles in two notes of November 1908, before Kármán’s stability analysis, and French usage retains the name Bénard–Kármán street. In 1926 Bénard argued that Kármán’s ideal-vortex spacing ratios depart from measurements in real liquids. Earlier still, <a href="#/people/vincenc-strouhal">Vincenc Strouhal</a> (presented February 1878) measured how the pitch of the aeolian tones produced by wires and rods moving through air scales with $U/D$.</aside>
<aside class="who" data-person="francis-harlow">The first computed vortex street is usually credited to Jacob Fromm and Francis Harlow (Phys. Fluids, July 1963), with a vorticity–stream-function method at Los Alamos. It is often remembered as flow past a cylinder, but their body was a plate suddenly set moving in a channel. They compared the onset of shedding, the drag and the Strouhal number with experiments.</aside>
<div data-quiz="q3"></div>

<h2 id="lbm-limits">Lattice Boltzmann’s numerical limits</h2>
<p>Although the lattice Boltzmann method is inexpensive per step and straightforward to code, its numerical errors arise from three distinct approximations: the relaxation time near $\tau = \tfrac12$, the finite Mach number, and the staircased wall treatment.</p>
<h3 id="tau-half">τ close to ½: running out of viscosity</h3>
<p>By (13.6), reaching a high Reynolds number on a fixed grid requires a small viscosity $\nu$ and therefore a relaxation time $\tau$ close to $\tfrac12$. As the figure in <a href="#/lattice-particles/lbm">the collide-and-stream section</a> showed, when $\tau$ approaches $\tfrac12$ the single-step multiplier $1 - 1/\tau$ approaches $-1$, so the non-equilibrium part alternates in sign at every step with almost no damping. When the flow develops velocity gradients that are too sharp for the grid to resolve, short-wavelength modes accumulate energy until the simulation blows up.</p>
<p>The figure simulates a periodic double shear layer—two thin layers of opposite velocity that roll up into vortices in a domain without walls (after Minion and Brown 1997). The slider moves $\tau$ towards $\tfrac12$ on a log scale, while the kernel’s health check monitors every node for excessive Mach numbers, out-of-range densities, or negative populations, reporting a warning before any value overflows to NaN.</p>
<figure data-widget="lattice-particles-tau" data-preset="bgk-coarse"><figcaption>A double shear layer (lbm.js preset shear-layer), coloured by vorticity, starting at $n = 32$ and $\tau = 0.502$. The readouts are the Reynolds number on the box, the largest local Mach number, the density range and the count of negative populations. <b>Compare</b> loads the preset’s broken and fixed cases.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b>. The layers begin to roll up, break into grid-scale oscillations, and blow up after about 400 steps.</li>
<li>Raise <b>τ − ½</b> to 0.005 on the same 32-node grid (<b>Compare</b>: BGK, n = 32, τ = 0.505). The run remains stable.</li>
<li>Return to $\tau = 0.502$ and set <b>Lattice n × n</b> to 64. The same $\tau$ remains stable on a grid twice as fine because the finer mesh resolves the shear layers; on the $64^2$ grid BGK fails only at $\tau \le 0.501$.</li>
<li>Try <b>TRT</b> at $n = 32$ and $\tau = 0.505$. It blows up where BGK remained stable.</li>
</ol></div>
<p>More general collision operators are often introduced to improve stability near $\tau = \tfrac12$. <em>Two-relaxation-time</em> (TRT) collision relaxes the symmetric and antisymmetric parts of the populations at two different rates (Ginzburg, Verhaeghe and d’Humières 2008), while <em>multiple-relaxation-time</em> (MRT) collision relaxes each moment at its own rate (Lallemand and Luo 2000; d’Humières et al. 2002; not implemented here). Although these extra relaxation rates help tune stability and boundary accuracy in many flows, TRT does not stabilise this under-resolved shear layer for any standard value of its free parameter. In the cylinder wake the ranking depends on the boundary condition: at $\mathrm{Re} = 150$ with a Zou–He inlet, BGK blows up at the inlet in about 200 steps whereas TRT runs past 60 000 steps, yet with a regularised inlet BGK remains stable past 200 000 steps while TRT fails in about 1000. Stability near $\tau = \tfrac12$ depends on the coupled system of interior collision operator, boundary conditions, and grid resolution, and in every case shown here refining the grid restored stability.</p>
<aside class="pitfall">When a lattice-Boltzmann run blows up at small $\tau - \tfrac12$, the cause is under-resolution on the chosen grid rather than a fundamental ceiling on the Reynolds number. The double shear layer at $\tau = 0.502$ fails on a $32^2$ grid because the shear layers are under-resolved, yet runs cleanly on a $64^2$ grid. See <a href="#/pathologies">τ → ½ instability</a> in the gallery.</aside>
<h3 id="mach-error">The Mach-number error</h3>
<p>Because lattice Boltzmann sets $p = c_s^2\rho$ instead of solving a Poisson equation for pressure, pressure gradients require small density variations. The solver therefore approximates an <dfn data-term="incompressible">incompressible</dfn> liquid by a weakly compressible gas, introducing a compressibility error that scales with the square of the <dfn data-term="mach-number">Mach number</dfn>:</p>
<div class="eq" id="eq-mach">$$\mathrm{Ma} = \frac{U}{c_s} = \sqrt{3}\,U,\qquad \text{error} \propto \mathrm{Ma}^2.$$<span class="eq-tag">(13.8)</span></div>
<p>Part of this error comes from weak physical compressibility—acoustic waves and density variations of order $\mathrm{Ma}^2$—and part comes from the $\rho u^3$ third-moment error of the nine-velocity lattice. The figure measures the combined error on decaying Taylor–Green vortices, a periodic array of eddies whose exact incompressible energy decay rate is fixed by $\nu$. Each point comes from a short run at a chosen lattice speed $U$, with the baseline discretisation error at $U = 0.005$ subtracted to isolate the Mach-dependent part.</p>
<figure data-widget="lattice-particles-mach"><figcaption>The extra error in the Taylor–Green decay rate against Mach number, on log axes (lbm.js, $n = 32$, $\tau = 0.8$, BGK). The dashed line has slope 2. The dotted vertical line marks Ma = 0.3, where the kernel’s health check begins to warn.</figcaption></figure>
<div class="try"><ol>
<li>Read the slope: the points follow the $\mathrm{Ma}^2$ line. The vortices decay too slowly by about $0.19\,\mathrm{Ma}^2$: 0.19% at Ma 0.1, 0.75% at Ma 0.2, 1.7% at Ma 0.3.</li>
<li>Drag <b>Lattice speed U</b> to 0.4 (Ma 0.69). The error reaches about 8% and bends below the line as higher-order terms beyond $\mathrm{Ma}^2$ become significant.</li>
</ol></div>
<p>Reducing the Mach error requires lowering the lattice speed $U$, which increases the computational work and tightens the stability constraint. At a fixed grid size $N$ and Reynolds number, halving $U$ doubles the number of time steps needed to reach a given physical time and halves $\nu = UN/\mathrm{Re}$, pushing $\tau$ closer to $\tfrac12$. In practice Ma is usually kept below 0.1 to 0.3, and grid refinement is often carried out with diffusive scaling ($\Delta t \propto \Delta x^2$ rather than $\Delta t \propto \Delta x$) so that the $\mathrm{Ma}^2$ compressibility error decreases at the same second-order rate as the spatial error.</p>
<h3 id="bounce-back">Walls: bounce-back</h3>
<p>The simplest no-slip boundary condition in lattice Boltzmann is <dfn data-term="bounce-back">bounce-back</dfn>, which reflects any population streaming into a solid node back along the link it came from. Because momentum is reversed locally at the link midpoint, no boundary equation is solved, and the scheme is second-order accurate whenever the wall lies half-way between fluid and solid nodes along a grid line. Curved boundaries such as a circular cylinder do not align with the grid; on a square lattice the cylinder becomes a staircase of cells, reducing simple bounce-back to first-order accuracy because the effective diameter varies with how the circle intersects the lattice. For the 12-node cylinder in <a href="#/lattice-particles/vortex-street">the wake section</a>, this staircase shifts the effective boundary by a significant fraction of a lattice spacing. Interpolated bounce-back (Bouzidi, Firdaouss and Lallemand 2001) uses the exact wall distance along each cut link to restore second-order accuracy, at the cost of extra interpolation work and slight mass leakage. Open inlets and outlets require closures of their own—such as the Zou–He and regularised inlets compared above—whose formulation directly affects high-Re stability.</p>
<div data-quiz="q4"></div>

<h2 id="sph">Smoothed particle hydrodynamics</h2>
<p>Whereas lattice Boltzmann evolves velocity distributions on a fixed lattice, smoothed particle hydrodynamics discretises the continuum equations directly on a set of moving particles. Each particle $j$ carries a fixed mass $m_j$, a velocity and a density as it moves with the flow. Because this <a href="#/viewpoints/lagrangian-eulerian">Lagrangian</a> formulation (<a href="#/viewpoints/lagrangian-eulerian">chapter 2</a>) tracks material parcels directly, advection requires no spatial derivative and mass is conserved automatically. Free surfaces also require no interface-tracking algorithm, since the fluid simply ends where the particles end.</p>
<p>To evaluate spatial derivatives from scattered particle positions, SPH smooths each particle’s property over a local neighbourhood using a bell-shaped weight function $W$, the <dfn data-term="smoothing-kernel">smoothing kernel</dfn>, normalised to integrate to 1 and vanishing beyond a support radius $2h$, where $h$ is the smoothing length. Any field $A$ and its gradient are approximated at position $\mathbf{x}$ by summing over nearby particles weighted by their volumes $m_j/\rho_j$:</p>
<div class="eq" id="eq-sph-interp">$$\begin{gathered}A(\mathbf{x}) \approx \sum_j \frac{m_j}{\rho_j}\,A_j\,W(\mathbf{x} - \mathbf{x}_j,\ h),\\ \nabla A(\mathbf{x}) \approx \sum_j \frac{m_j}{\rho_j}\,A_j\,\nabla W(\mathbf{x} - \mathbf{x}_j,\ h).\end{gathered}$$<span class="eq-tag">(13.9)</span></div>
<p>Because $W$ is a known analytic function, spatial derivatives act directly on the kernel. Setting $A = \rho$ in (13.9) reduces the density of particle $i$ to a kernel-weighted sum of its neighbours’ masses:</p>
<div class="eq" id="eq-sph-rho">$$\rho_i = \sum_j m_j\,W_{ij},\qquad W_{ij} = W(\mathbf{x}_i - \mathbf{x}_j,\ h).$$<span class="eq-tag">(13.10)</span></div>
<p>The momentum equation is written in a symmetric pairwise form so that each pair of particles exerts equal and opposite forces along the line joining them, conserving both linear and angular momentum to floating-point round-off:</p>
<div class="eq" id="eq-sph-mom">$$\frac{\mathrm{d}\mathbf{v}_i}{\mathrm{d}t} = -\sum_j m_j\left(\frac{p_i}{\rho_i^{2}} + \frac{p_j}{\rho_j^{2}} + \Pi_{ij}\right)\nabla_i W_{ij} + \mathbf{g}.$$<span class="eq-tag">(13.11)</span></div>
<p>To obtain the pressure without solving a Poisson equation on scattered particles, <dfn data-term="weakly-compressible">weakly compressible</dfn> SPH closes the equations with a stiff algebraic equation of state, so that small density variations produce large restoring pressures and the system can be integrated explicitly. For liquids, the standard choice is the <dfn data-term="tait-equation">Tait equation</dfn> (Monaghan 1994):</p>
<div class="eq" id="eq-tait">$$p = \frac{\rho_0 c_0^{2}}{\gamma}\left[\left(\frac{\rho}{\rho_0}\right)^{\gamma} - 1\right],\qquad \gamma = 7.$$<span class="eq-tag">(13.12)</span></div>
<p>Rather than using the physical sound speed of water ($1500\ \mathrm{m/s}$), weakly compressible SPH sets an artificial sound speed $c_0$ around ten times the maximum expected flow speed, keeping the Mach number near $0.1$ and density variations near $\mathrm{Ma}^2 \approx 1\%$. Like lattice Boltzmann and the <a href="#/pressure/other-roads">artificial compressibility</a> method of chapter 10, this trades weak compressibility for a purely local pressure update, though the explicit time step is then restricted by the acoustic CFL condition $\Delta t \approx 0.25\,h/c_0$.</p>
<p>Approaching particles also require dissipation to damp acoustic oscillations and prevent particle interpenetration at shocks. The standard <dfn data-term="artificial-viscosity">artificial viscosity</dfn> adds a pairwise term $\Pi_{ij}$ to (13.11) that acts only when a pair of particles is approaching ($\mathbf{v}_{ij}\cdot\mathbf{r}_{ij} &lt; 0$):</p>
<div class="eq" id="eq-sph-av">$$\begin{gathered}\Pi_{ij} = \frac{-\alpha\,\bar{c}_{ij}\,\mu_{ij} + \beta\,\mu_{ij}^{2}}{\bar{\rho}_{ij}},\\ \mu_{ij} = \frac{h\,\mathbf{v}_{ij}\cdot\mathbf{r}_{ij}}{r_{ij}^{2} + 0.01h^{2}}\quad\text{if } \mathbf{v}_{ij}\cdot\mathbf{r}_{ij} &lt; 0,\ \text{else } \Pi_{ij} = 0.\end{gathered}$$<span class="eq-tag">(13.13)</span></div>
<p>Here bars denote pair averages, $\mathbf{r}_{ij} = \mathbf{x}_i - \mathbf{x}_j$ and $\mathbf{v}_{ij} = \mathbf{v}_i - \mathbf{v}_j$, analogous to the artificial viscosity used in <a href="#/shocks/riemann">shock-capturing grid schemes</a>.</p>
<aside class="who" data-person="leon-lucy">Leon Lucy (Astron. J., December 1977) described a “finite-size particle scheme” for gas dynamics and used it to test whether a rotating protostar could split into a multiple star; in his run it became a triple system holding 60% of the original mass. Gingold and Monaghan introduced the name smoothed particle hydrodynamics in the same year.</aside>
<aside class="who" data-person="gingold-monaghan">Robert Gingold and Joseph Monaghan (Mon. Not. R. Astron. Soc., 1977), working independently of Lucy, gave the method its name. With about 80 particles in three dimensions they reproduced rotating and magnetic polytropes, model stars, to within a few per cent. Only Lucy’s paper studied fission. Monaghan and Gingold introduced the pairwise artificial viscosity in 1983, and Monaghan’s 1992 review made it standard.</aside>
<p>The figure runs a two-dimensional dam break, in which a water column one unit wide and two units tall at the left of a four-unit tank is released at $t = 0$ and collapses along the floor. Solid walls are represented by rows of fixed dummy particles whose pressure is extrapolated from the adjacent fluid (a simplified form of Adami, Hu and Adams 2012) so that the kernel support remains full near walls. The density is integrated from the continuity equation with a diffusive smoothing term called δ-SPH (Molteni and Colagrossi 2009), examined in <a href="#/lattice-particles/sph-limits">SPH’s numerical limits</a> below. The plot compares the surge-front position $Z$ (in column widths) against dimensionless time $T = t\sqrt{gH}/a$ alongside Ritter’s (1892) ideal shallow-water solution $Z = 1 + 2T$.</p>
<figure data-widget="lattice-particles-sph" class="wide"><figcaption>A weakly compressible SPH dam break (sph.js, Wendland kernel, 800 fluid particles at 20 per column width). Colour by speed, pressure or kernel sum. The plot tracks the front position $Z$ against $T$, beside Ritter’s ideal front. The readouts report the share of particles with a clearly negative pressure and the maximum density error.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b>. The front accelerates from rest and trails Ritter’s line throughout, reaching the far wall a little after $T = 3$ whereas Ritter’s ideal front arrives at $T = 1.5$. Because Ritter’s solution neglects the initial vertical acceleration of the tall column, it acts as an upper bound on the front speed rather than an exact target for the two-dimensional collapse.</li>
<li>Colour by <b>pressure</b>. The column begins with a hydrostatic profile—high at the floor and zero at the free surface—and develops a sharp pressure peak when the surge impacts the right wall. Meanwhile <b>max |ρ/ρ₀ − 1|</b> stays near or below 1% until impact.</li>
<li>Drag <b>Artificial viscosity α</b> to 0.5. The splash becomes visibly sluggish; even the default $\alpha = 0.05$ corresponds to a large physical viscosity, as the note below calculates.</li>
</ol></div>
<aside class="note" data-label="Viscous water">In two dimensions the artificial viscosity (13.13) acts like an effective kinematic viscosity of approximately $\alpha h c_0/8$. For this tank, with $\alpha = 0.05$, $h = 0.075$ m, and $c_0 = 62.6$ m/s, that gives $0.03\text{ m}^2/\text{s}$, roughly thirty thousand times the kinematic viscosity of water, so the simulated collapse has a Reynolds number of a few hundred compared with about $10^7$ for real water. Gravity and inertia dominate bulk free-surface sloshing in a dam break, whereas flows sensitive to viscous shear require a physical viscosity operator and a smaller smoothing length $h$.</aside>
<details class="deeper"><summary>Go deeper: where the kernel sums come from</summary>
<p>Starting from the identity $A(\mathbf{x}) = \int A(\mathbf{x}')\,\delta(\mathbf{x} - \mathbf{x}')\,\mathrm{d}\mathbf{x}'$, replacing the Dirac delta function with the smoothing kernel gives</p>
$$A(\mathbf{x}) \approx \int A(\mathbf{x}')\,W(\mathbf{x} - \mathbf{x}',\ h)\,\mathrm{d}\mathbf{x}'.$$
<p>For a symmetric kernel normalised to 1, the first moment vanishes by symmetry and the leading smoothing error is $O(h^2)$, proportional to the second derivatives of $A$. Approximating the integral by a quadrature sum over particle volumes $\mathrm{d}\mathbf{x}' \to m_j/\rho_j$ yields (13.9). Differentiating under the integral and integrating by parts transfers the gradient onto the kernel, provided the boundary term vanishes because the kernel support lies entirely inside the fluid. This derivation relies on two assumptions—that particles remain evenly distributed enough for the sum to approximate the integral, and that the kernel support lies entirely inside the fluid—both of which break down in <a href="#/lattice-particles/sph-limits">the next section</a>.</p>
<p>The symmetric pressure gradient in (13.11) follows from expanding $\nabla p/\rho = \nabla(p/\rho) + (p/\rho^2)\nabla\rho$ and applying (13.9) to each term, producing a pairwise force antisymmetric in $i$ and $j$ that conserves momentum exactly.</p>
</details>

<h2 id="sph-limits">SPH’s numerical limits</h2>
<p>While SPH conserves mass and momentum exactly and tracks splashes without an interface grid, its accuracy and stability depend on how evenly the particles remain spaced, how many neighbours lie inside each kernel, and what happens where the kernel support is truncated at a free surface.</p>
<h3 id="tensile">Particles that clump: the tensile instability</h3>
<p>Under tension (negative pressure), standard SPH particles attract each other in pairs and clump into strings. Swegle, Hicks and Attaway (1995) showed by a von Neumann stability analysis that this <dfn data-term="tensile-instability">tensile instability</dfn> depends on the product of the stress and the kernel’s second derivative $W''$ evaluated at the neighbour spacing. Standard bell-shaped kernels are convex in their outer shell ($W'' &gt; 0$), where a particle’s nearest neighbours sit; under tension, a pair of neighbours in that region experiences an attractive force that strengthens as the separation shrinks. Because this clumping arises from the spatial derivative of the kernel rather than time-stepping error, reducing $\Delta t$ does not prevent it. Price (2012) attributes the term “tensile instability” to Monaghan (2000), who also introduced the standard remedy, <em>artificial pressure</em>—a short-range repulsive term activated only under negative pressure, proportional to $(W_{ij}/W(\Delta p))^4$ where $\Delta p$ is the initial particle spacing.</p>
<p>A distinct clumping mode occurs under positive pressure when the smoothing length $h$ is large enough to include many neighbours. Dehnen and Aly (2012) showed that this <em>pairing instability</em> is avoided by Wendland kernels, whose Fourier transforms are strictly non-negative.</p>
<figure data-widget="lattice-particles-tensile" data-preset="tensile" class="wide"><figcaption>A periodic square lattice of 900 SPH particles under a uniform background pressure, perturbed by a tiny random kick (sph.js presets tensile, tensile-fixed, pairing, pairing-fixed). Particles whose nearest neighbour is closer than half the lattice spacing are highlighted; the plot tracks their share against time.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> on the tensile case: cubic spline, $h = 1.2\,\Delta p$, background pressure $-0.03$. Within one time unit about a sixth of the particles have paired up, and <b>min spacing / dx</b> falls to about 0.1.</li>
<li>Press <b>Reset</b>, tick <b>Artificial pressure</b>, then <b>Run</b> (or choose the tensile-fixed case). No pairs form; the lattice deforms gradually (the closest pair stays near 0.6 of the spacing by $t = 6$) without clumping.</li>
<li>Press <b>Reset</b>, switch <b>Kernel</b> to Wendland C2 (still under tension, without artificial pressure), then <b>Run</b>. About 5% of the particles still pair up, because changing the kernel does not remove the attractive force under negative pressure.</li>
<li>Choose the <b>pairing</b> case: cubic spline at $h = 2\,\Delta p$ under <em>positive</em> pressure. After an initial quiet period, most of the lattice pairs up—63% by $t = 8$ and over 90% by $t = 14$—whereas the Wendland kernel at the same $h$ (<b>pairing-fixed</b>) keeps the lattice regular.</li>
</ol></div>
<div data-quiz="q5"></div>
<h3 id="truncation">Kernel truncation at a free surface</h3>
<p>Inside the bulk fluid a particle’s kernel support is filled with neighbours, whereas at a free surface half of its support extends into empty space, causing the kernel sum $\sum_j (m_j/\rho_0) W_{ij}$ to drop from 1 in the interior to about 0.76 at a flat surface (Wendland kernel, $h = 1.5\,\Delta p$). When density is evaluated directly by the summation formula (13.10), surface particles therefore register a density roughly 24% below $\rho_0$. The stiff Tait equation (13.12) converts that apparent density deficit into a strong negative pressure that pulls the surface particles into clumps through the tensile instability. Integrating the density from the continuity equation, as in the baseline dam break, avoids this artefact because each particle’s density changes only in response to the relative velocity of its neighbours.</p>
<figure data-widget="lattice-particles-sph" data-preset="summation" class="wide"><figcaption>The dam break with summation density. Before you press Run, colour by <b>kernel sum</b> to see the deficit along the free surface; colour by pressure while it runs to see the negative pressures it causes.</figcaption></figure>
<div class="try"><ol>
<li>Before pressing Run, set <b>Colour by</b> to kernel sum. The top surface reads about 0.75 and the corners drop lower still (<b>min kernel sum</b> 0.56).</li>
<li>Press <b>Run</b> and watch the first few hundredths of a second. Instead of remaining smoothly spaced with a truncated kernel sum, the surface particles clump together until their kernels fill up: by $t = 0.02$ s the minimum kernel sum exceeds 0.9, and by $t = 0.05$ s half the particles register a strongly negative pressure and have paired up.</li>
<li>Set <b>Density</b> back to continuity with δ-SPH diffusion and compare. The kernel sums at the surface remain low, but no clumping occurs because the density evolution no longer depends on the raw kernel sum.</li>
</ol></div>
<h3 id="noise">Pressure noise</h3>
<p>Integrating density from the continuity equation introduces a different difficulty: because weakly compressible SPH supports acoustic waves and the continuity equation contains no spatial smoothing, high-frequency density fluctuations persist from particle to particle, speckling the pressure field with noise and producing negative pressures inside falling water. The δ-SPH formulation (Molteni and Colagrossi 2009) adds a diffusive smoothing term to the continuity equation to damp these particle-scale density differences; in our implementation the hydrostatic density gradient is subtracted before smoothing so that a still tank remains strictly at rest.</p>
<figure data-widget="lattice-particles-sph" data-preset="noisy" class="wide"><figcaption>The dam break with continuity density and no density diffusion. Colour is by speed; switch <b>Colour by</b> to pressure to see the noise.</figcaption></figure>
<div class="try"><ol>
<li>Run the simulation and watch <b>p &lt; −0.05ρgH</b>. At $t = 0.05$ s about a quarter of the water registers a strongly negative pressure (26%), and the fraction fluctuates as acoustic waves reverberate through the column, reaching 15% again at $t = 0.6$ s.</li>
<li>Compare the baseline dam break with δ-SPH enabled. Although the sudden release causes a brief acoustic transient in the first $0.02$ s, the negative-pressure fraction drops below 1% by $t = 0.05$ s and stays there until the surge strikes the far wall.</li>
<li>Compare the surge fronts in the two runs. Because the acoustic rattle contaminates the local pressure field while barely affecting the bulk momentum, the front position looks nearly identical even when the pressure field is unusable.</li>
</ol></div>
<h3 id="neighbours">The cost of neighbours</h3>
<p>Every SPH particle interacts with all particles inside its kernel support of radius $2h$. With $h = 1.5\,\Delta p$, the support is a disc of radius $3\,\Delta p$, enclosing about 28 neighbours in two dimensions and well over a hundred in three. Updating the neighbour list each step with a spatial cell list or tree scales linearly with the particle count, yet the inner-loop work per particle remains substantial: on the machine used to build this course, one dam-break step takes about 0.34 μs per particle (fluid plus wall), compared with about 0.02 μs per node for a D2Q9 lattice-Boltzmann step on the cylinder wake, and the artificial sound speed requires small explicit time steps. Thus SPH’s advantage lies in handling free surfaces and large deformations without a mesh, whereas its cost per particle-step is substantially higher than a lattice or grid update.</p>
<aside class="pitfall">An SPH run that looks good can still have a wrong pressure field. Plot the pressure along a line through the fluid, or the share of particles at negative pressure, before you trust any force or load you read from it. See <a href="#/pathologies">SPH pressure noise</a> in the gallery.</aside>

<h2 id="compare">Grids, lattices and particles</h2>
<p>No single discretisation family dominates across all incompressible, single-phase flows. The table below compares the finite-volume projection methods of chapters 3 and 10 with the lattice-Boltzmann and SPH formulations developed in this chapter.</p>
<table>
<thead><tr><th></th><th>Grid (finite volume, projection)</th><th>Lattice Boltzmann</th><th>SPH</th></tr></thead>
<tbody>
<tr><td>What is stored</td><td>velocity and pressure in cells</td><td>nine populations per node</td><td>position, velocity and density per particle</td></tr>
<tr><td>Incompressibility</td><td>exact, through a pressure solve</td><td>approximate, error of order $\mathrm{Ma}^2$</td><td>approximate, stiff equation of state, density error about 1%</td></tr>
<tr><td>Conservation</td><td>mass and momentum to solver tolerance (finite volume)</td><td>mass and momentum to round-off in the interior; walls and open boundaries can leak</td><td>mass exactly; momentum to round-off with symmetric forces</td></tr>
<tr><td>Advection</td><td>discretised; numerical diffusion (<a href="#/advection/diffusion-dispersion">chapter 7</a>)</td><td>exact streaming along links; error moves into the collision</td><td>exact: particles move with the flow</td></tr>
<tr><td>Walls</td><td>well understood, high order possible</td><td>bounce-back: easy for any shape, first order on curves unless interpolated</td><td>wall particles or repulsive forces; delicate</td></tr>
<tr><td>Free surfaces</td><td>need a tracking method (level set, volume of fluid)</td><td>need an extra model</td><td>free: no particles, no fluid</td></tr>
<tr><td>Time step</td><td>flow CFL, or larger with implicit or semi-Lagrangian schemes</td><td>one step per lattice link, tied to Ma</td><td>acoustic CFL with an artificial sound speed</td></tr>
<tr><td>Parallelism</td><td>good, but the pressure solve is global</td><td>excellent: purely local collide and stream</td><td>good, with neighbour search and load balancing</td></tr>
<tr><td>Noise</td><td>none intrinsic</td><td>none (lattice gases: severe)</td><td>particle disorder; pressure noise without filtering</td></tr>
<tr><td>Typical failures</td><td>CFL blow-up, checkerboards, numerical diffusion</td><td>τ → ½ blow-up, Mach error, staircase walls</td><td>tensile instability, surface truncation, pressure noise</td></tr>
</tbody>
</table>
<p>Each of the three families exchanges one set of numerical constraints for another. Lattice Boltzmann replaces the global pressure Poisson equation with a local collide-and-stream update, accepting weak compressibility ($\mathrm{Ma}^2$ error) and small acoustic time steps; that makes it well suited to complex fixed geometries on massively parallel hardware, such as porous media, urban wind fields, and blood vessels. SPH dispenses with the mesh to track free surfaces and advection directly, at the cost of neighbour searches, kernel truncation errors, and acoustic pressure noise; it is used primarily for violent free-surface flows—sloshing tanks, wave impacts, dam breaks—and for self-gravitating gas in astrophysics. Finite-volume and projection methods on grids remain the standard choice for most industrial and aerodynamic flows because their convergence rates, conservation properties, and wall boundary conditions are the sharpest and best understood.</p>
<p>Across all three families, specific diagnostic quantities indicate when the numerical approximation is breaking down: the CFL number and velocity divergence on a grid, the ratio of $\tau - \tfrac12$ to grid resolution along with the Mach number in lattice Boltzmann, and the kernel sum, density error, and fraction of negative-pressure particles in SPH. Monitoring those diagnostics during a run and comparing the output against an independent benchmark—as we did with Williamson’s fit for the cylinder wake—catches numerical failures before the solution is trusted. The <a href="#/trust/checklist">field guide</a> in chapter 15 and the <a href="#/pathologies">rogues’ gallery</a> summarise these diagnostics across the course.</p>
<p>Both non-grid families have developed extensive refinements beyond the baseline schemes presented here—including MRT and cumulant collision operators, interpolated curved boundaries, and adaptive mesh refinement for lattice Boltzmann, as well as incompressible projection, Riemann-solver interactions, particle shifting, and variable smoothing lengths for SPH—each designed to overcome one of the failure modes demonstrated above.</p>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>J. Hardy, Y. Pomeau and O. de Pazzis, “Time evolution of a two-dimensional classical lattice system”, Phys. Rev. Lett. 31 (1973) 276–279; “Time evolution of a two-dimensional model system. I. Invariant states and time correlation functions”, J. Math. Phys. 14 (1973) 1746–1759.</li>
<li>U. Frisch, B. Hasslacher and Y. Pomeau, “Lattice-gas automata for the Navier-Stokes equation”, Phys. Rev. Lett. 56 (1986) 1505–1508.</li>
<li>S. Wolfram, “Cellular automaton fluids 1: Basic theory”, J. Stat. Phys. 45 (1986) 471–526.</li>
<li>U. Frisch, D. d’Humières, B. Hasslacher, P. Lallemand, Y. Pomeau and J.-P. Rivet, “Lattice gas hydrodynamics in two and three dimensions”, Complex Systems 1 (1987) 649–707.</li>
<li>D. A. Wolf-Gladrow, <em>Lattice-Gas Cellular Automata and Lattice Boltzmann Models: An Introduction</em>, Lecture Notes in Mathematics 1725, Springer (2000). Derives the FHP viscosity (13.2).</li>
<li>G. R. McNamara and G. Zanetti, “Use of the Boltzmann equation to simulate lattice-gas automata”, Phys. Rev. Lett. 61 (1988) 2332–2335.</li>
<li>F. J. Higuera, S. Succi and R. Benzi, “Lattice gas dynamics with enhanced collisions”, Europhys. Lett. 9 (1989) 345–349; F. J. Higuera and J. Jiménez, “Boltzmann approach to lattice gas simulations”, Europhys. Lett. 9 (1989) 663–668.</li>
<li>Y. H. Qian, D. d’Humières and P. Lallemand, “Lattice BGK models for Navier-Stokes equation”, Europhys. Lett. 17 (1992) 479–484.</li>
<li>H. Chen, S. Chen and W. H. Matthaeus, “Recovery of the Navier-Stokes equations using a lattice-gas Boltzmann method”, Phys. Rev. A 45 (1992) R5339–R5342; J. M. V. A. Koelman, “A simple lattice Boltzmann scheme for Navier-Stokes fluid flow”, Europhys. Lett. 15 (1991) 603–607.</li>
<li>P. L. Bhatnagar, E. P. Gross and M. Krook, “A model for collision processes in gases”, Phys. Rev. 94 (1954) 511–525.</li>
<li>S. Chen and G. D. Doolen, “Lattice Boltzmann method for fluid flows”, Annu. Rev. Fluid Mech. 30 (1998) 329–364.</li>
<li>T. Krüger, H. Kusumaatmaja, A. Kuzmin, O. Shardt, G. Silva and E. M. Viggen, <em>The Lattice Boltzmann Method: Principles and Practice</em>, Springer (2017).</li>
<li>I. Ginzburg, F. Verhaeghe and D. d’Humières, “Two-relaxation-time lattice Boltzmann scheme: about parametrization, velocity, pressure and mixed boundary conditions”, Commun. Comput. Phys. 3 (2008) 427–478.</li>
<li>P. Lallemand and L.-S. Luo, “Theory of the lattice Boltzmann method: dispersion, dissipation, isotropy, Galilean invariance, and stability”, Phys. Rev. E 61 (2000) 6546–6562; D. d’Humières, I. Ginzburg, M. Krafczyk, P. Lallemand and L.-S. Luo, “Multiple-relaxation-time lattice Boltzmann models in three dimensions”, Phil. Trans. R. Soc. A 360 (2002) 437–451.</li>
<li>M. Bouzidi, M. Firdaouss and P. Lallemand, “Momentum transfer of a Boltzmann-lattice fluid with boundaries”, Phys. Fluids 13 (2001) 3452–3459.</li>
<li>Q. Zou and X. He, “On pressure and velocity boundary conditions for the lattice Boltzmann BGK model”, Phys. Fluids 9 (1997) 1591–1598.</li>
<li>M. L. Minion and D. L. Brown, “Performance of under-resolved two-dimensional incompressible flow simulations, II”, J. Comput. Phys. 138 (1997) 734–765.</li>
<li>H. Bénard, “Formation périodique de centres de giration à l’arrière d’un obstacle en mouvement”, C. R. Acad. Sci. 147 (1908) 839–842.</li>
<li>T. von Kármán, “Über den Mechanismus des Widerstandes, den ein bewegter Körper in einer Flüssigkeit erfährt”, Nachr. Ges. Wiss. Göttingen, Math.-phys. Kl. (1911; continued 1912); T. von Kármán and H. Rubach, Phys. Z. 13 (1912) 49–59.</li>
<li>J. E. Wesfreid, “Henri Bénard: Thermal convection and vortex shedding”, C. R. Mécanique 345 (2017) 446–466 (quotes von Kármán and L. Edson, <em>The Wind and Beyond</em>, 1967).</li>
<li>J. E. Fromm and F. H. Harlow, “Numerical solution of the problem of vortex street development”, Phys. Fluids 6 (1963) 975–982.</li>
<li>C. H. K. Williamson, “Defining a universal and continuous Strouhal–Reynolds number relationship for the laminar vortex shedding of a circular cylinder”, Phys. Fluids 31 (1988) 2742–2744; “Vortex dynamics in the cylinder wake”, Annu. Rev. Fluid Mech. 28 (1996) 477–539.</li>
<li>L. B. Lucy, “A numerical approach to the testing of the fission hypothesis”, Astron. J. 82 (1977) 1013–1024.</li>
<li>R. A. Gingold and J. J. Monaghan, “Smoothed particle hydrodynamics: theory and application to non-spherical stars”, Mon. Not. R. Astron. Soc. 181 (1977) 375–389.</li>
<li>J. J. Monaghan and R. A. Gingold, “Shock simulation by the particle method SPH”, J. Comput. Phys. 52 (1983) 374–389.</li>
<li>J. J. Monaghan, “Smoothed particle hydrodynamics”, Annu. Rev. Astron. Astrophys. 30 (1992) 543–574; “Smoothed particle hydrodynamics”, Rep. Prog. Phys. 68 (2005) 1703–1759.</li>
<li>J. J. Monaghan, “Simulating free surface flows with SPH”, J. Comput. Phys. 110 (1994) 399–406.</li>
<li>J. W. Swegle, D. L. Hicks and S. W. Attaway, “Smoothed particle hydrodynamics stability analysis”, J. Comput. Phys. 116 (1995) 123–134.</li>
<li>J. J. Monaghan, “SPH without a tensile instability”, J. Comput. Phys. 159 (2000) 290–311.</li>
<li>W. Dehnen and H. Aly, “Improving convergence in smoothed particle hydrodynamics simulations without pairing instability”, Mon. Not. R. Astron. Soc. 425 (2012) 1068–1082.</li>
<li>D. Molteni and A. Colagrossi, “A simple procedure to improve the pressure evaluation in hydrodynamic context using the SPH”, Comput. Phys. Commun. 180 (2009) 861–872.</li>
<li>S. Adami, X. Y. Hu and N. A. Adams, “A generalized wall boundary condition for smoothed particle hydrodynamics”, J. Comput. Phys. 231 (2012) 7057–7075.</li>
<li>D. J. Price, “Smoothed particle hydrodynamics and magnetohydrodynamics”, J. Comput. Phys. 231 (2012) 759–794.</li>
<li>A. Ritter, “Die Fortpflanzung der Wasserwellen”, Z. Ver. Dtsch. Ing. 36 (1892) 947–954. The dam-break geometry follows J. C. Martin and W. J. Moyce, Phil. Trans. R. Soc. A 244 (1952) 312–324.</li>
</ol>
`,
  widgets: {
    'vortex-street': mountStreet,
    'lattice-particles-collide': mountCollide,
    'lattice-particles-tau': mountTau,
    'lattice-particles-mach': mountMach,
    'lattice-particles-gas': mountGas,
    'lattice-particles-sph': mountSph,
    'lattice-particles-tensile': mountTensile,
  },
  quizzes: {
    q1: {
      type: 'predict',
      q: 'Before you run the figure below: on the square HPP lattice, a shear flow along $x$ varies like $\\sin(ky)$. A viscous fluid would smooth it out. What will the lattice gas do?',
      choices: [
        'Decay like $\\exp(-\\nu k^2 t)$, just more noisily than a grid solver.',
        'Not decay at all: the amplitude stays where it started.',
        'Decay much faster than a real fluid, because the particles collide so often.',
        'Blow up, because integer arithmetic cannot represent a smooth wave.',
      ],
      answer: 1,
      explain: 'HPP collisions swap an east–west pair for a north–south pair, and both carry zero $x$-momentum. Because east- and west-movers never leave their row, the $x$-momentum of every row is conserved for all time, so a shear wave built from those row momenta cannot decay. When the wave is rotated by 45°, it decays because the viscosity of the four-velocity square lattice is anisotropic. The integer arithmetic itself is exact and conserves mass and momentum without round-off.',
    },
    q2: {
      type: 'num',
      q: 'You want a lattice-Boltzmann flow at $\\mathrm{Re} = 1000$ on a domain $N = 100$ nodes across, with lattice speed $U = 0.05$. Using $\\nu = (\\tau - \\tfrac12)/3$, what relaxation time $\\tau$ do you need?',
      answer: 0.515,
      tol: 0.002,
      explain: '$\\nu = UN/\\mathrm{Re} = 0.05 \\times 100/1000 = 0.005$, so $\\tau = \\tfrac12 + 3\\nu = 0.515$, which is already close to $\\tfrac12$. Raising Re to $10\\,000$ on the same grid lowers $\\tau$ to $0.5015$, where under-resolved shear layers trigger the $\\tau \\to \\tfrac12$ instability shown later in this chapter. Lowering $U$ to reduce the Mach error pushes $\\tau$ closer to $\\tfrac12$ because $\\nu$ scales with $U$.',
    },
    q3: {
      type: 'num',
      q: 'A telegraph wire 4 mm thick sings in a 12 m/s wind. Taking $\\mathrm{St} \\approx 0.2$, at what frequency are vortices shed?',
      answer: 600,
      tol: 0.05,
      unit: 'Hz',
      explain: '$f = \\mathrm{St}\\,U/D = 0.2 \\times 12/0.004 = 600$ Hz. The Reynolds number is $UD/\\nu \\approx 12 \\times 0.004/(1.5\\times 10^{-5}) \\approx 3200$ in air, well inside the wide range where St stays near 0.2. Consequently the pitch rises in proportion to the wind speed, as Strouhal measured for wires in 1878, because each shed vortex pushes the wire sideways at the shedding frequency.',
    },
    q4: {
      type: 'mcq',
      q: 'A lattice-Boltzmann run at $\\mathrm{Ma} = 0.2$ has a compressibility error you want to cut by a factor of four, keeping the grid and the Reynolds number fixed. What do you do, and what does it cost?',
      choices: [
        'Halve the lattice speed $U$, which reduces the $\\mathrm{Ma}^2$ error by four while moving $\\tau$ closer to $\\tfrac12$ and doubling the number of steps.',
        'Switch from BGK to TRT collision, because the Mach error comes from the single relaxation time.',
        'Refine the grid by a factor of two, since finer grids reduce every error.',
        'Raise $\\tau$ to add viscosity and damp the density waves.',
      ],
      answer: 0,
      explain: 'Because the Mach error comes from the low-Mach equilibrium and the nine-velocity lattice, changing the collision operator does not remove it, and refining the grid at fixed $U$ leaves Ma unchanged. Raising $\\tau$ alters the Reynolds number and therefore simulates a different flow. Halving $U$ quarters the $\\mathrm{Ma}^2$ error, though at fixed Re and $N$ it also halves $\\nu$, pushing $\\tau$ closer to $\\tfrac12$, and doubles the number of steps needed to reach the same physical time.',
    },
    q5: {
      type: 'predict',
      q: 'In the tensile case, particles pair up under negative pressure with the cubic-spline kernel. The Wendland kernel is known to prevent the pairing instability. Switch the kernel to Wendland, keeping the negative pressure and no artificial pressure. What do you expect?',
      choices: [
        'No pairs form, because Wendland kernels prevent clumping of every kind.',
        'Pairs still form, because Wendland kernels prevent pairing under compression rather than the tensile instability.',
        'The particles fly apart, because the Wendland kernel is too weak to hold them.',
        'The same pairing fraction as the cubic spline, because the kernel does not affect stability.',
      ],
      answer: 1,
      explain: 'The two instabilities have distinct mechanisms. Under tension, any kernel whose second derivative is positive at the neighbour spacing pulls pairs together (Swegle et al. 1995), and both kernels are convex there at these smoothing lengths. In the figure about 5% of the particles pair with the Wendland kernel, compared with 17–20% for the cubic spline, so the tensile clumping is reduced rather than eliminated. Preventing tensile clumping requires artificial pressure, whereas Wendland kernels eliminate the pairing instability that occurs under compression at large neighbour counts.',
    },
  },
  glossary: {
    'lattice-gas': {
      term: 'lattice gas',
      def: 'A cellular automaton in which particles hop between the nodes of a lattice and collide by fixed rules that conserve mass and momentum. Its averages behave like a fluid when the lattice is symmetric enough (FHP, hexagonal), whereas a four-velocity square lattice (HPP) remains anisotropic.',
      section: 'lattice-gas',
    },
    'lattice-boltzmann': {
      term: 'lattice Boltzmann method',
      def: 'A flow solver that evolves real-valued particle distributions $f_q$ on a lattice by alternating local collisions and streaming along links. Its averages obey the Navier–Stokes equations with $\\nu = (\\tau - \\tfrac12)/3$, up to errors of order $\\mathrm{Ma}^2$.',
      section: 'lbm',
    },
    'bgk-collision': {
      term: 'BGK collision',
      def: 'The single-relaxation-time collision operator in lattice Boltzmann, which relaxes every population a fraction $1/\\tau$ of the way towards its local equilibrium. Named after Bhatnagar, Gross and Krook (1954).',
      section: 'lbm',
    },
    'relaxation-time': {
      term: 'relaxation time',
      def: 'In lattice Boltzmann, the dimensionless parameter $\\tau$ (in time steps) over which collisions relax the populations towards equilibrium. It sets the kinematic viscosity $\\nu = (\\tau - \\tfrac12)/3$ and must stay above $\\tfrac12$.',
      section: 'lbm',
    },
    streaming: {
      term: 'streaming',
      def: 'The step of a lattice gas or lattice-Boltzmann scheme in which every population moves one link along its velocity unchanged. Because populations shift from node to node without spatial interpolation, the streaming step introduces no numerical diffusion.',
      section: 'lbm',
    },
    'bounce-back': {
      term: 'bounce-back',
      def: 'The simplest lattice-Boltzmann no-slip wall boundary condition, in which a population that would stream into a solid node is reflected back along the link it came from. It is second-order accurate for walls aligned with grid lines and first-order on staircased curved walls.',
      section: 'lbm-limits',
    },
    'vortex-street': {
      term: 'vortex street',
      def: 'The periodic wake behind a bluff body above a critical Reynolds number (about 47 for a circular cylinder), consisting of two staggered rows of alternating-sign vortices shed at a frequency characterised by the Strouhal number.',
      section: 'vortex-street',
    },
    sph: {
      term: 'smoothed particle hydrodynamics (SPH)',
      def: 'A mesh-free Lagrangian method in which the fluid is represented by moving particles and every field and derivative is evaluated as a kernel-weighted sum over neighbours. Introduced independently by Lucy and by Gingold and Monaghan in 1977.',
      section: 'sph',
    },
    'smoothing-kernel': {
      term: 'smoothing kernel',
      def: 'In SPH, the bell-shaped weight $W(r, h)$, normalised to integrate to 1 and vanishing beyond $2h$, that spreads each particle’s property over its neighbourhood. Its functional form governs the interpolation accuracy and susceptibility to clumping instabilities.',
      section: 'sph',
    },
    'weakly-compressible': {
      term: 'weakly compressible',
      def: 'Approximating a liquid as a slightly compressible fluid with an artificial sound speed roughly ten times the maximum flow speed, keeping density variations near 1% and avoiding a global pressure Poisson solve. Used in weakly compressible SPH and, via $p = c_s^2\\rho$, in lattice Boltzmann.',
      section: 'sph',
    },
    'tait-equation': {
      term: 'Tait equation',
      def: 'The stiff algebraic equation of state $p = (\\rho_0 c_0^2/\\gamma)[(\\rho/\\rho_0)^\\gamma - 1]$ with $\\gamma = 7$, used in weakly compressible SPH to convert small density variations into restoring pressures (Monaghan 1994).',
      section: 'sph',
    },
    'artificial-viscosity': {
      term: 'artificial viscosity',
      def: 'Numerical dissipation added to a scheme to damp oscillations and prevent particle interpenetration at shocks. In SPH, a pairwise force acting only on approaching particles (Monaghan and Gingold 1983), often much larger than the physical viscosity of water.',
      section: 'sph',
    },
    'tensile-instability': {
      term: 'tensile instability',
      def: 'The clumping of SPH particles into pairs and strings under negative pressure, driven by the positive second derivative of the smoothing kernel at the neighbour spacing (Swegle, Hicks and Attaway 1995) and stabilised by artificial pressure (Monaghan 2000).',
      section: 'sph-limits',
    },
  },
  pathologies: [
    {
      id: 'lbm-tau-instability',
      name: 'τ → ½ instability (lattice Boltzmann)',
      family: 'stability',
      symptom: 'Grid-scale oscillations appear in sharp shear layers, densities drift out of range, populations become negative, and the simulation blows up within a few hundred steps.',
      cause: 'As $\\tau \\to \\tfrac12$ the kinematic viscosity $\\nu = (\\tau - \\tfrac12)/3$ approaches zero, and each collision multiplies the non-equilibrium part by $1 - 1/\\tau \\approx -1$. When the flow develops gradients too sharp for the grid to resolve, nothing damps the shortest-wavelength modes.',
      diagnose: 'Monitor the largest local Mach number, density range and negative-population count, and compare $\\tau - \\tfrac12$ across grid resolutions: the same $\\tau$ that blows up at $n = 32$ remains stable at $n = 64$.',
      mitigations: [
        'Refine the grid so the thinnest shear layers span several nodes, at the cost of more nodes and time steps.',
        'Raise $\\tau$ (lowering the Reynolds number) if the problem specification allows.',
        'Use TRT or MRT collision and tune the free parameters, which improves stability in many flows even though TRT fails on the periodic shear layer shown here.',
        'Match the boundary condition to the collision operator; for example, BGK with a regularised inlet remains stable at $\\mathrm{Re} = 150$ where a Zou–He inlet blows up.',
      ],
      section: 'lbm-limits',
      demo: { widget: 'lattice-particles-tau', data: { preset: 'bgk-coarse' } },
    },
    {
      id: 'lbm-compressibility-error',
      name: 'Mach-number error (lattice Boltzmann)',
      family: 'accuracy',
      symptom: 'Results remain smooth and stable but deviate from the incompressible reference by a few per cent, and refining the grid at fixed lattice speed $U$ does not reduce the discrepancy.',
      cause: 'Lattice Boltzmann evolves a weakly compressible fluid with $p = c_s^2\\rho$ and a nine-velocity lattice that omits part of the third equilibrium moment, introducing compressibility errors of order $\\mathrm{Ma}^2$ where $\\mathrm{Ma} = \\sqrt{3}\\,U$.',
      diagnose: 'Halve the lattice speed $U$ at a fixed Reynolds number and grid resolution; if the error drops by a factor of four, Mach-number compressibility is dominant. In the Taylor–Green test here, the decay rate errs by about $0.19\\,\\mathrm{Ma}^2$.',
      mitigations: [
        'Keep Ma below 0.1 to 0.3 (lattice speed $U$ below 0.06 to 0.17), which requires more time steps and pushes $\\tau$ closer to $\\tfrac12$.',
        'Refine the grid using diffusive scaling ($\\Delta t \\propto \\Delta x^2$) so that the $\\mathrm{Ma}^2$ error decreases at the same second-order rate as the spatial error.',
        'Use extended equilibria or larger velocity sets that match third-order moments, at the cost of more populations per node.',
      ],
      section: 'lbm-limits',
      demo: { widget: 'lattice-particles-mach', data: {} },
    },
    {
      id: 'lattice-anisotropy',
      name: 'Lattice anisotropy',
      family: 'accuracy',
      symptom: 'The simulated flow depends on its orientation relative to the lattice axes; on the square HPP lattice, a shear wave aligned with the grid axes never decays, whereas the same wave rotated by 45° decays.',
      cause: 'Isotropic Newtonian viscous stress requires an isotropic fourth-order velocity tensor, which a four-velocity square lattice cannot provide. In addition, HPP conserves the momentum of every row and column separately.',
      diagnose: 'Run the same decaying shear wave along $x$, along $y$ and at 45° to the grid axes and compare the measured decay rates.',
      mitigations: [
        'Use a velocity set with isotropic fourth-order sums, such as six velocities on a triangular lattice (FHP) or nine weighted velocities on a square lattice (D2Q9).',
        'Include multi-particle collisions (such as the FHP triple collision) that break spurious row and column invariants.',
        'In lattice Boltzmann, keep the Mach number small because higher-order anisotropic terms grow with flow speed.',
      ],
      section: 'lattice-gas',
      demo: { widget: 'lattice-particles-gas', data: { preset: '' } },
    },
    {
      id: 'sph-tensile-instability',
      name: 'Tensile instability (SPH)',
      family: 'stability',
      symptom: 'In regions of negative pressure, particles attract each other into pairs and strings, opening voids and corrupting the density and stress fields.',
      cause: 'Where the smoothing kernel is convex ($W\'\' &gt; 0$, the outer shell where nearest neighbours sit), negative pressure makes the pairwise force attractive and stronger as particles approach (Swegle, Hicks and Attaway 1995). Because the instability arises from the spatial discretisation rather than the time integrator, reducing the time step does not prevent it.',
      diagnose: 'Track the minimum neighbour spacing or the fraction of particles whose nearest neighbour lies closer than half the initial spacing $\\Delta p$.',
      mitigations: [
        'Add Monaghan’s (2000) artificial pressure, a short-range repulsive force activated only under negative pressure.',
        'Avoid negative pressures by adding a positive background pressure or using wall and free-surface closures that do not induce spurious tension.',
        'Apply particle-shifting schemes to keep particles evenly spaced, at the cost of small transport corrections.',
        'Note that switching to a Wendland kernel cures pairing under compression but does not eliminate the tensile instability under negative pressure.',
      ],
      section: 'sph-limits',
      demo: { widget: 'lattice-particles-tensile', data: { preset: 'tensile' } },
    },
    {
      id: 'sph-kernel-truncation',
      name: 'Kernel truncation at a free surface (SPH)',
      family: 'boundary',
      symptom: 'When density is computed by kernel summation, particles along a free surface register an artificially low density and a strong negative pressure, causing the surface layer to clump within the first few hundredths of a second.',
      cause: 'Because half of a surface particle’s kernel support extends into empty space, the kernel sum $\\sum_j (m_j/\\rho_0)W_{ij}$ drops from 1 in the bulk to about 0.76 at a flat surface, and the stiff equation of state converts the resulting 24% density deficit into strong tension.',
      diagnose: 'Inspect the kernel sum at $t = 0$: values well below 1 mark the truncated surface layer, where summation density produces negative pressures until the surface particles clump together and refill their kernels.',
      mitigations: [
        'Integrate the density from the continuity equation instead of summation, so that density changes depend on velocity divergence rather than the truncated kernel sum.',
        'Clamp negative pressures at free-surface particles, or detect free-surface particles and set their pressure to zero.',
        'Renormalise the kernel sum with a Shepard filter, which partially compensates for missing neighbours.',
        'Along solid boundaries, place layers of dummy wall particles so that the fluid kernel support is never truncated.',
      ],
      section: 'sph-limits',
      demo: { widget: 'lattice-particles-sph', data: { preset: 'summation' } },
    },
    {
      id: 'sph-pressure-noise',
      name: 'Pressure noise (weakly compressible SPH)',
      family: 'accuracy',
      symptom: 'Although the free-surface trajectory looks smooth, the pressure field is speckled with particle-to-particle oscillations and widespread negative pressures in gravity-driven flow.',
      cause: 'Explicit weakly compressible SPH supports high-frequency acoustic waves, and integrating the continuity equation without a diffusive term leaves particle-scale density fluctuations undamped.',
      diagnose: 'Track the fraction of particles below a negative pressure threshold or plot pressure along a cross-section; in the dam break here, 26% of the fluid reads below $-0.05\\rho g H$ at $t = 0.05$ s without density diffusion, compared with less than 1% with δ-SPH.',
      mitigations: [
        'Add δ-SPH density diffusion (Molteni and Colagrossi 2009) with the hydrostatic gradient subtracted so that a still tank remains at rest.',
        'Apply periodic Shepard filtering to smooth the density field.',
        'Use Riemann-solver SPH or incompressible SPH with a pressure Poisson solve, at higher cost per step.',
        'Increase the artificial viscosity $\\alpha$ moderately to damp acoustic waves, at the cost of higher effective viscosity.',
      ],
      section: 'sph-limits',
      demo: { widget: 'lattice-particles-sph', data: { preset: 'noisy' } },
    },
  ],
};
