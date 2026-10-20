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
  blurb: 'Two other roads: collide-and-stream on a lattice, and smoothed particles.',
  minutes: 50,
  html: String.raw`
<p class="lead-in">Every method so far in this course starts from the Navier–Stokes equations and discretises them: derivatives become differences on a grid, and the pressure comes from a Poisson solve. This chapter takes two other roads. The first starts below the continuum. Invent a toy world of particles that hop between the nodes of a lattice and collide by simple rules, then check that their averages obey the Navier–Stokes equations. That road leads from lattice gases to the <dfn data-term="lattice-boltzmann">lattice Boltzmann method</dfn>, which is now a mainstream solver. The second road throws the grid away. The fluid becomes a cloud of particles that carry mass and move with the flow, and every derivative becomes a weighted sum over neighbours. That is <dfn data-term="sph">smoothed particle hydrodynamics</dfn>. Both methods are simple to write and easy to run in parallel. Both also fail in ways no grid method does, and by the end of the chapter you will have caused each failure yourself.</p>

<h2 id="lattice-gas">Lattice gases: a fluid made of bits</h2>
<p>A real gas is a crowd of molecules that fly in straight lines and bounce off each other. Nobody tracks them one by one to design a wing. The <a href="#/continuum/continuum">continuum hypothesis</a> of chapter 1 says that once you average over many collisions, the details stop mattering. Mass, momentum and energy are conserved at every collision, and their averages obey the Navier–Stokes equations. The <dfn data-term="mean-free-path">mean free path</dfn> and the molecular speed only set the values of the viscosity and the sound speed.</p>
<p>If the details do not matter, you can choose them to suit a computer. Put particles on the nodes of a lattice. Let each one move with one of a few unit velocities $\mathbf{c}_q$, one link per time step. Allow at most one particle per velocity at each node, so the state of a node is a handful of bits. Each time step has two stages. In the <em>collision</em> stage, the particles at each node are rearranged by a fixed rule that keeps their number and their total momentum. In the <em>streaming</em> stage, every particle hops one link along its velocity. If $n_q(\mathbf{x}, t) \in \{0, 1\}$ says whether the slot for velocity $q$ at node $\mathbf{x}$ is full, the whole model is</p>
<div class="eq" id="eq-lga">$$n_q(\mathbf{x} + \mathbf{c}_q,\ t + 1) = n_q(\mathbf{x}, t) + C_q\big(\mathbf{n}(\mathbf{x}, t)\big),$$<span class="eq-tag">(13.1)</span></div>
<p>where the collision term $C_q$ is $-1$, $0$ or $+1$. This is a <dfn data-term="lattice-gas">lattice gas</dfn>: a cellular automaton whose averages are meant to behave like a fluid. Everything is integer arithmetic. Mass and momentum are conserved <em>exactly</em>, with no round-off at all, because the rules only move bits around.</p>
<p>The first lattice gas used a square lattice with four velocities: east, north, west and south. When exactly two particles meet head on, they leave at right angles; every other arrangement passes straight through. It is called HPP after its authors. It conserves mass and momentum, but it does not behave like a fluid. A square lattice is not symmetric enough. Its large-scale equations depend on the direction of the flow relative to the lattice, so a vortex knows which way the grid lines run.</p>
<p>Worse, HPP conserves far too much. A head-on collision swaps an east–west pair, which carries no $x$-momentum, for a north–south pair, which also carries none. East- and west-moving particles never leave their row. So the total $x$-momentum of every row is conserved separately, for ever, and so is the $y$-momentum of every column. Those are invariants the real fluid does not have. Set up a shear flow whose velocity points along $x$ and varies along $y$, and viscosity should smooth it out. In HPP it cannot: the momentum of each row is frozen.</p>
<aside class="who" data-person="hardy-pomeau-de-pazzis-hpp">J. Hardy, Y. Pomeau and O. de Pazzis published the square-lattice model in 1973 (Phys. Rev. Lett., July; J. Math. Phys., December), with a longer study of its transport properties in 1976. They used it to study statistical mechanics, such as how fast correlations decay, not to simulate flows. It is sometimes called the first lattice Boltzmann model. It is not: it is a Boolean lattice gas, and lattice Boltzmann came fifteen years later.</aside>
<p>The repair came in 1986. Frisch, Hasslacher and Pomeau moved to a triangular lattice, where each node has six neighbours and six velocities at 60° to each other. A head-on pair now turns through $\pm 60°$, and a symmetric triple of particles at 120° turns into the other triple. The triple collision kills the spurious invariant that head-on collisions alone would leave. Six directions are just enough symmetry: the large-scale equations come out isotropic, and they are the Navier–Stokes equations. The model, called FHP, also has a computable viscosity. In the usual approximation that neighbouring particles are uncorrelated, a lattice with a fraction $d$ of its slots full has</p>
<div class="eq" id="eq-fhp-nu">$$\nu(d) = \frac{1}{12\,d\,(1 - d)^{3}} - \frac{1}{8}$$<span class="eq-tag">(13.2)</span></div>
<p>in lattice units (one link, one step). The figure runs both gases on the test that separates them: a sinusoidal shear wave that should decay like $\exp(-\nu k^2 t)$ whichever way it points. The picture is the flow velocity averaged over boxes of about six by six nodes. The raw bits are pure noise, and you need that much averaging just to see the wave.</p>
<div data-quiz="q1"></div>
<figure data-widget="lattice-particles-gas" class="wide"><figcaption>Two lattice gases on a periodic box of 128 by 128 nodes (FHP: 128 by 148 rows of its triangular lattice). Colour is the velocity along the wave, averaged over small boxes; the plot is the wave amplitude $A/U$ against time step. For FHP the dashed curve is the decay that (13.2) predicts. The readouts count particles and total momentum: both stay exactly constant.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> on HPP with the flow along $x$. After 8000 steps <b>A / U</b> is exactly where it started (the random fill puts it within a few per cent of 1), and <b>ν measured</b> reads 0. The stripes jitter with noise, but the wave never decays.</li>
<li>Choose <b>at 45°</b>. The same wave, turned to cut across the lattice diagonally, now decays. The viscosity depends on direction: that is the lattice showing through.</li>
<li>Switch to <b>FHP</b> and run the wave along $x$, then along $y$. Both decay at about the rate of (13.2). Averaged over six random seeds at $d = 0.25$, the measured viscosities are 0.683 and 0.677 against the theory’s 0.665.</li>
<li>Move <b>Occupation d</b> to 0.15 on FHP. The measured viscosity now runs 15 to 30% above (13.2). The formula ignores correlations between particles, and away from $d \approx 0.25$ that matters. Note that <b>Δ particles</b> stays at 0 whatever you do.</li>
</ol></div>
<details class="deeper"><summary>Go deeper: why six directions and not four</summary>
<p>The momentum flux of a lattice gas near equilibrium is built from sums over the velocity set. The viscous part involves the fourth-order tensor $T_{abcd} = \sum_q c_{qa} c_{qb} c_{qc} c_{qd}$. For the large-scale equations to be isotropic, this tensor must look the same in every direction. In two dimensions, that means $T_{xxxx} = 3\,T_{xxyy}$, the ratio for the isotropic tensor $\delta_{ab}\delta_{cd} + \delta_{ac}\delta_{bd} + \delta_{ad}\delta_{bc}$.</p>
<p>For the square lattice, only east and west have an $x$-component: $T_{xxxx} = 1 + 1 = 2$. No velocity has both components, so $T_{xxyy} = 0$. The ratio is infinite, not 3. For the six velocities at angles $60°\,q$,</p>
$$T_{xxxx} = \sum_{q=0}^{5}\cos^4(60°\,q) = 1 + 4\cdot\tfrac{1}{16} + 1 = \tfrac{9}{4},\qquad T_{xxyy} = \sum_{q=0}^{5}\cos^2\sin^2(60°\,q) = 4\cdot\tfrac{3}{16} = \tfrac{3}{4},$$
<p>and the ratio is exactly 3. Isotropy is a property of the velocity set, and you can check it with a pencil. The lattice Boltzmann lattice of the next section reaches the same ratio by a different route: it has nine velocities on a square grid, and weights chosen to make the weighted sums isotropic.</p>
</details>
<p>FHP proved the idea, and its 1986 letter pointed out that such rules could drive very simple parallel machines. But lattice gases had three practical problems. They are noisy, so every answer has to be averaged over space or time. They are not Galilean invariant: a factor that depends on the density multiplies the advection term, so a vortex carried by a stream moves at the wrong speed. And the viscosity in (13.2) cannot be made small, which caps the Reynolds number. Each of these pushed people towards averaging the bits before simulating them.</p>
<aside class="who" data-person="frisch-hasslacher-pomeau-fhp">Uriel Frisch, Brosl Hasslacher and Yves Pomeau showed in a letter of April 1986 that a lattice gas on a hexagonal lattice reproduces the Navier–Stokes equation. Their abstract says such a gas “simulates the Navier-Stokes equation, and can be used to design simple, massively parallel computing machines”. Stephen Wolfram published a long paper on cellular-automaton fluids later the same year, and the two sides have disagreed about priority since; read both and judge for yourself.</aside>

<h2 id="lbm">Lattice Boltzmann: collide and stream</h2>
<p>The cure for the noise is to stop tracking bits. Replace each Boolean $n_q$ by its average: a real number $f_q(\mathbf{x}, t)$, the expected number of particles at node $\mathbf{x}$ moving with velocity $\mathbf{c}_q$. Physicists call such an average a distribution, or a population. In 1988 McNamara and Zanetti evolved these averages directly, with the same lattice and the same collision rules as the lattice gas. Their abstract says the approach “completely eliminates the statistical noise that plagues the usual lattice-gas simulations”. This is the lattice Boltzmann equation, named after the Boltzmann equation of kinetic theory, which evolves the velocity distribution of a real gas.</p>
<aside class="who" data-person="mcnamara-zanetti">Guy McNamara and Gianluigi Zanetti (Phys. Rev. Lett., November 1988) used the averaged lattice-gas equation as the simulation itself, not just as a tool for analysing lattice gases. Their collision operator was still the complicated one inherited from the lattice gas. Simpler collision operators followed in 1989 (Higuera, Succi and Benzi; Higuera and Jiménez).</aside>
<p>The second simplification was the big one. The exact collision rules hardly matter, as long as mass and momentum are conserved and the result relaxes towards a local equilibrium. So pick the simplest rule with those properties. Move every population a fixed fraction $1/\tau$ of the way towards its equilibrium value, then stream:</p>
<div class="eq" id="eq-lbgk">$$f_q(\mathbf{x} + \mathbf{c}_q,\ t + 1) = f_q - \frac{1}{\tau}\Big(f_q - f_q^{\mathrm{eq}}\Big),$$<span class="eq-tag">(13.3)</span></div>
<p>with everything on the right evaluated at node $\mathbf{x}$ and time $t$.</p>
<p>The last term is the <dfn data-term="bgk-collision">BGK collision</dfn>, after Bhatnagar, Gross and Krook, who used a single relaxation rate in kinetic theory in 1954. The number $\tau$ is the <dfn data-term="relaxation-time">relaxation time</dfn>, in time steps. The right-hand side is the post-collision value. The shift of $\mathbf{x}$ by $\mathbf{c}_q$ on the left is <dfn data-term="streaming">streaming</dfn>: each post-collision population is copied, unchanged, to the neighbour it points at.</p>
<p>The lattice used throughout this chapter has nine velocities on a square grid: one at rest, four to the nearest neighbours and four to the diagonal ones. It is called D2Q9 (two dimensions, nine velocities). Density and momentum are sums over the populations of a node:</p>
<div class="eq" id="eq-moments">$$\rho = \sum_{q=0}^{8} f_q,\qquad \rho\,\mathbf{u} = \sum_{q=0}^{8} \mathbf{c}_q\, f_q.$$<span class="eq-tag">(13.4)</span></div>
<p>The equilibrium is a truncated Maxwell–Boltzmann distribution, with weights $w_q = 4/9$ for the rest population, $1/9$ for the four axis directions and $1/36$ for the four diagonals, and with $c_s^2 = 1/3$:</p>
<div class="eq" id="eq-feq">$$f_q^{\mathrm{eq}} = w_q\,\rho\left[1 + \frac{\mathbf{c}_q\cdot\mathbf{u}}{c_s^2} + \frac{(\mathbf{c}_q\cdot\mathbf{u})^2}{2c_s^4} - \frac{\mathbf{u}\cdot\mathbf{u}}{2c_s^2}\right].$$<span class="eq-tag">(13.5)</span></div>
<p>It is built so that its density and momentum are exactly $\rho$ and $\rho\mathbf{u}$. Collisions therefore conserve both. Its momentum flux is $\rho c_s^2\,\mathbf{I} + \rho\mathbf{u}\mathbf{u}$: a pressure $p = c_s^2\rho$ plus the advection of momentum. The constant $c_s = 1/\sqrt{3}$ is the lattice speed of sound.</p>
<p>The viscosity comes from the part of $f$ that is <em>not</em> in equilibrium. A shear flow keeps pushing the populations away from equilibrium, and collisions keep pulling them back. The longer they take to relax, the more momentum leaks between neighbouring layers, so a larger $\tau$ means a more viscous fluid. A calculation called the Chapman–Enskog expansion makes this exact. Streaming and BGK collision together reproduce the Navier–Stokes equations, with kinematic viscosity</p>
<div class="eq" id="eq-lbm-nu">$$\nu = c_s^2\left(\tau - \tfrac{1}{2}\right) = \frac{\tau - \tfrac{1}{2}}{3}$$<span class="eq-tag">(13.6)</span></div>
<p>in lattice units, plus errors that grow with the square of the Mach number (<a href="#/lattice-particles/lbm-limits">see the limits below</a>). The $-\tfrac12$ is a gift from the discretisation. The scheme’s own leading error has the form of a viscosity, and it is negative. Instead of fighting it, lattice Boltzmann absorbs it into the physical value. That is also why $\tau$ must stay above $\tfrac12$: at $\tau = \tfrac12$ the fluid would have no viscosity at all.</p>
<aside class="who" data-person="qian-dhumieres-lallemand">Y. H. Qian, D. d’Humières and P. Lallemand (Europhys. Lett., February 1992) replaced the lattice-gas collision with a single relaxation towards a chosen equilibrium. Their abstract says the model “is noise-free, has Galileian invariance and a velocity-independent pressure”, the three defects of lattice gases removed at once. Credit is shared: Chen, Chen, Martínez and Matthaeus (December 1991) and Chen, Chen and Matthaeus (April 1992) published closely related models, and Koelman a simple scheme in 1991.</aside>
<p>The figure takes one step apart on a 3 by 3 periodic lattice. Each node draws its nine populations as arrows, scaled by $f_q/w_q$, so a node at rest shows nine equal arrows. The middle node starts with a velocity and with a deliberate non-equilibrium part: a shear stress and a normal stress that change neither its density nor its momentum. The open rings mark where each arrow would end at equilibrium.</p>
<figure data-widget="lattice-particles-collide"><figcaption>One lattice-Boltzmann step taken apart (lbm.js on a 3 by 3 periodic D2Q9 lattice). <b>Collide</b> relaxes every node towards its own equilibrium (the rings); <b>Stream</b> moves every population one node along its arrow. The readouts measure the factor by which the last collision multiplied the middle node’s non-equilibrium part, beside the BGK prediction $1 - 1/\tau$.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Collide</b>. The density <b>ρ</b> and velocity <b>u</b> of the middle node do not change, and every arrow moves towards its ring. <b>last collision ×</b> equals $1 - 1/\tau = -0.25$ at $\tau = 0.8$: each arrow moves a quarter past its ring, so the non-equilibrium part shrinks and changes sign.</li>
<li>Press <b>Stream</b>. Nothing is computed: populations are copied to neighbours, so the middle node’s momentum spreads to the eight around it.</li>
<li>Set <b>Relaxation time τ</b> to 1 and collide: the non-equilibrium part vanishes in one step. At 2 the factor is $+0.5$: each collision goes half-way and never overshoots. At 0.55 it is $-0.818$: every collision overshoots almost all the way to the mirror image, and the non-equilibrium part hardly shrinks. That is what makes $\tau$ near $\tfrac12$ delicate.</li>
</ol></div>
<details class="deeper"><summary>Go deeper: where $\nu = (\tau - \tfrac12)/3$ comes from</summary>
<p>The Chapman–Enskog expansion treats the departure from equilibrium as small, of the order of the <dfn data-term="knudsen-number">Knudsen number</dfn>: the ratio of the collision length (here one lattice spacing times $\tau$) to the length over which the flow changes. Taylor-expand the streamed term in (13.3) to second order:</p>
$$\Big(\partial_t + \mathbf{c}_q\cdot\nabla\Big) f_q + \tfrac12\Big(\partial_t + \mathbf{c}_q\cdot\nabla\Big)^2 f_q + \dots = -\frac{1}{\tau}\Big(f_q - f_q^{\mathrm{eq}}\Big).$$
<p>To first order the non-equilibrium part is $f_q - f_q^{\mathrm{eq}} \approx -\tau\,(\partial_t + \mathbf{c}_q\cdot\nabla) f_q^{\mathrm{eq}}$. Put that back into the second-order term, and the two terms combine into $-(\tau - \tfrac12)(\partial_t + \mathbf{c}_q\cdot\nabla) f_q^{\mathrm{eq}}$. The $\tfrac12$ comes from the second-order Taylor term of the streaming, so it is a discretisation error, folded into the physics.</p>
<p>Now take moments. Collisions conserve mass and momentum, so the zeroth and first moments give the continuity and momentum equations. The momentum flux is $\sum_q \mathbf{c}_q\mathbf{c}_q f_q$. Its equilibrium part is $\rho c_s^2\mathbf{I} + \rho\mathbf{u}\mathbf{u}$. Its non-equilibrium part, with the $\tfrac12$ correction included, works out to $-\rho\,c_s^2(\tau - \tfrac12)\big(\nabla\mathbf{u} + \nabla\mathbf{u}^{\mathrm{T}}\big)$, which is a Newtonian viscous stress with $\nu = c_s^2(\tau - \tfrac12)$. The working needs the weighted fourth-order sums of D2Q9 to be isotropic, which they are: $\sum_q w_q c_{qx}^4 = \tfrac13$ and $\sum_q w_q c_{qx}^2 c_{qy}^2 = \tfrac19$, a ratio of 3. It also leaves an error term of order $\rho u^3$, because nine velocities cannot represent the third moment of a real Maxwellian. That term is the Mach-number error of <a href="#/lattice-particles/lbm-limits">the limits section</a>. Krüger et al. (2017, ch. 4) give the full derivation.</p>
</details>
<p>Notice what streaming does <em>not</em> do. In the <a href="#/advection/upwind">upwind scheme</a> of chapter 7, moving a profile by a fraction of a cell means interpolating, and interpolation smears. Here every population moves exactly one link per step, so the copy is exact. All the approximation lives in the local collision. That is the source of the method’s appeal: each node needs only its own nine numbers to collide and its eight neighbours to stream. No pressure equation is solved anywhere. The pressure is just $c_s^2\rho$, so the fluid is slightly compressible, which is the price you pay in <a href="#/lattice-particles/lbm-limits">the limits section</a>.</p>
<div data-quiz="q2"></div>

<h2 id="vortex-street">The cylinder wake and the vortex street</h2>
<p>Put a cylinder in a steady stream. At very low speed the flow wraps smoothly round it and closes up behind. Faster, the flow separates from the back of the cylinder and leaves two eddies attached behind it, turning in opposite directions. Faster still, that pair stops being steady. One eddy grows, breaks away and drifts downstream, then the other does the same, and the wake becomes two staggered rows of vortices with opposite spins. That pattern is the <dfn data-term="vortex-street">vortex street</dfn>. You can see it behind islands in satellite images of clouds, and hear it when wind makes a wire sing.</p>
<p>Which regime you get depends on one number, the <dfn data-term="reynolds-number">Reynolds number</dfn> $\mathrm{Re} = UD/\nu$ of the free-stream speed $U$ and the diameter $D$. Shedding starts at a critical value near 47 to 49 for an isolated cylinder (Williamson 1996 reviews the measurements). Once it starts, the shedding frequency $f$ falls into a second dimensionless number of <a href="#/similarity/numbers">chapter 5</a>, the <dfn data-term="strouhal-number">Strouhal number</dfn>:</p>
<div class="eq" id="eq-strouhal">$$\mathrm{St} = \frac{f D}{U},\qquad \mathrm{Re} = \frac{U D}{\nu}.$$<span class="eq-tag">(13.7)</span></div>
<p>For a circular cylinder, St rises from about 0.12 at onset to about 0.2, and stays near 0.2 over a huge range of Reynolds numbers. That makes the vortex street a standard test for unsteady solvers. A code that gets the onset and the Strouhal number right has its viscosity, its time accuracy and its boundary conditions roughly in order.</p>
<p>The figure is a lattice-Boltzmann cylinder wake: a strip of 240 by 72 nodes, a cylinder 12 nodes across, a uniform inflow of $U = 0.08$ lattice units on the left and an outflow on the right. The top and bottom are periodic. Colour is the <dfn data-term="vorticity">vorticity</dfn>, the local spin of the fluid. The Reynolds-number slider sets $\tau$ through (13.6): at $\mathrm{Re} = 150$, $\nu = 0.08 \times 12/150 = 0.0064$ and $\tau = 0.5192$. A probe three diameters behind the cylinder records the cross-stream velocity. The widget measures St from its period and prints Williamson’s (1988) fit to experiments beside it.</p>
<figure data-widget="vortex-street" class="wide"><figcaption>Flow past a cylinder on a D2Q9 lattice (lbm.js, BGK with a regularised inlet), coloured by vorticity: one sign in one colour, the other in the other. The plot is the probe’s cross-stream velocity $v/U$. The readouts give the measured Strouhal number, Williamson’s fit (valid for $49 &lt; \mathrm{Re} &lt; 178$), the largest local Mach number and the mass drift.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> at $\mathrm{Re} = 150$. For the first thousand steps or so the wake is still forming. Then it starts to sway from side to side, and by about step 1200 the street is established. Wait for <b>St measured</b>: about 0.20, against Williamson’s 0.183.</li>
<li>Drag <b>Reynolds number Re</b> down to 40. The swaying dies away and two attached eddies remain. In this strip the onset lies between Re 44 and 47.</li>
<li>Try Re 200, beyond the range of Williamson’s fit. The vortices are tighter and St rises to about 0.21. Keep an eye on <b>max Ma</b>: it stays near a quarter of the sound speed, below the 0.3 where the health check would warn.</li>
</ol></div>
<figure data-widget="vortex-street" data-preset="steady"><figcaption>The same wake at $\mathrm{Re} = 40$, below the onset of shedding. The start-up kick dies away by about a fifth every 1000 steps, leaving a steady pair of eddies behind the cylinder.</figcaption></figure>
<p>The measured Strouhal numbers run high. The table shows them beside Williamson’s fit, and beside a run on a strip twice as wide.</p>
<table>
<thead><tr><th class="num">Re</th><th class="num">St, 72-node strip</th><th class="num">St, 144-node strip</th><th class="num">St, Williamson fit</th></tr></thead>
<tbody>
<tr><td class="num">60</td><td class="num">0.167</td><td class="num">–</td><td class="num">0.136</td></tr>
<tr><td class="num">100</td><td class="num">0.188</td><td class="num">0.176</td><td class="num">0.164</td></tr>
<tr><td class="num">150</td><td class="num">0.202</td><td class="num">0.192</td><td class="num">0.183</td></tr>
</tbody>
</table>
<p>The gap is mostly confinement, not resolution. Periodic sides six diameters apart make this a row of cylinders, not one, and the inlet is only four diameters upstream. Widening the strip to 144 nodes lowers St from 0.188 to 0.176 at Re 100. Doubling the resolution to a 24-node cylinder in a strip of the same shape does not lower it (0.192). This is the first lesson of <a href="#/trust/validation">validation</a>: before you blame the scheme, check that you simulated the experiment and not a cousin of it.</p>
<aside class="note" data-label="Lattice units">Everything above is in lattice units: one node spacing, one time step. To map onto a real flow, match the Reynolds number. A 1 cm cylinder in water ($\nu = 10^{-6}\ \mathrm{m^2/s}$) at Re 150 has $U = 1.5$ cm/s. With 12 nodes across it, $\Delta x = 0.83$ mm. The lattice viscosity 0.0064 equals $\nu\,\Delta t/\Delta x^2$, which fixes $\Delta t = 4.4$ ms. Then $U\,\Delta t/\Delta x = 0.08$, as it should.</aside>
<aside class="who" data-person="theodore-von-karman">In notes to the Göttingen academy (1911, continued 1912), Theodore von Kármán showed that two rows of ideal point vortices can be stable only if they are staggered, with the row spacing about 0.28 times the spacing along a row. With H. Rubach (1912) he linked the street to the drag of the body. In his memoir <em>The Wind and Beyond</em> (1967) he recalls a congress, which he dates to 1930, where he conceded: “All right, I do not object if in London this is called Kármán Vortex Street. In Berlin, let us call it Karmansche Wirbelstrasse, and in Paris, Boulevard d'Henri Bénard.”</aside>
<aside class="history" data-era="1908">The joke had a point. <a href="#/people/henri-benard">Henri Bénard</a> observed and filmed alternating vortices behind moving obstacles in two notes of November 1908, before Kármán’s theory, and French usage keeps the name Bénard–Kármán street. In 1926 Bénard argued that Kármán’s ideal-vortex laws do not hold accurately in real liquids. The pitch of the tones made by wires and rods moving through air had been measured earlier still, by <a href="#/people/vincenc-strouhal">Strouhal</a> (presented February 1878), though he measured sound, not flow.</aside>
<aside class="who" data-person="francis-harlow">The first computed vortex street is usually credited to Jacob Fromm and Francis Harlow (Phys. Fluids, July 1963), with a vorticity–stream-function method at Los Alamos. It is often remembered as flow past a cylinder, but their body was a plate suddenly set moving in a channel. They compared the onset of shedding, the drag and the Strouhal number with experiments.</aside>
<div data-quiz="q3"></div>

<h2 id="lbm-limits">Lattice Boltzmann’s numerical limits</h2>
<p>The lattice Boltzmann method is cheap per step and easy to write, and its errors hide in three places: the relaxation time, the Mach number and the walls. Each has a symptom you can provoke.</p>
<h3 id="tau-half">τ close to ½: running out of viscosity</h3>
<p>By (13.6), a high Reynolds number on a given grid means a small $\nu$, which means $\tau$ close to $\tfrac12$. The figure in <a href="#/lattice-particles/lbm">the collide-and-stream section</a> showed what that does to a single collision: the factor $1 - 1/\tau$ approaches $-1$, so the non-equilibrium part flips sign at every step and barely shrinks. Nothing damps the shortest waves the lattice can carry. If the flow makes gradients that are too sharp for the grid, those waves grow, and the run blows up.</p>
<p>The figure is a periodic double shear layer: two thin layers of opposite velocity that roll up into vortices, with no walls anywhere (after Minion and Brown 1997). The slider moves $\tau$ towards $\tfrac12$ on a log scale. The kernel’s health check watches every node for a large Mach number, a density out of range, or negative populations. It reports a warning before any value turns into NaN.</p>
<figure data-widget="lattice-particles-tau" data-preset="bgk-coarse"><figcaption>A double shear layer (lbm.js preset shear-layer), coloured by vorticity, starting at $n = 32$ and $\tau = 0.502$. The readouts are the Reynolds number on the box, the largest local Mach number, the density range and the count of negative populations. <b>Compare</b> loads the preset’s broken and fixed cases.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b>. The layers try to roll up, break into grid-scale noise, and blow up after about 400 steps.</li>
<li>Raise <b>τ − ½</b> to 0.005 on the same 32-node grid (<b>Compare</b>: BGK, n = 32, τ = 0.505). It stays healthy.</li>
<li>Go back to $\tau = 0.502$, and set <b>Lattice n × n</b> to 64. The same $\tau$ on a grid twice as fine is healthy: it resolves the layers that the coarse grid could not. On this grid BGK fails only at $\tau \le 0.501$.</li>
<li>Try <b>TRT</b> at n = 32 and $\tau = 0.505$. It fails where BGK survived.</li>
</ol></div>
<p>The last item matters, because the textbook cure for trouble near $\tau = \tfrac12$ is a better collision operator. <em>Two-relaxation-time</em> (TRT) collision relaxes the symmetric and antisymmetric parts of the populations at two different rates (Ginzburg, Verhaeghe and d’Humières 2008). <em>Multiple-relaxation-time</em> (MRT) collision relaxes each moment at its own rate (Lallemand and Luo 2000; d’Humières et al. 2002); it is not implemented here. These operators give you free parameters for stability and for boundary accuracy, and in many flows they help. In this shear layer TRT does not, at any of the usual values of its free parameter. In the cylinder wake the ranking reverses. With a Zou–He inlet at Re 150 BGK blows up at the inlet in about 200 steps, and TRT runs for at least 60 000. With a regularised inlet BGK is healthy for 200 000 steps, and TRT fails in about 1000. Stability near $\tau = \tfrac12$ belongs to the whole scheme, boundaries included, not to the collision operator alone. The cure that worked in every case here was resolution.</p>
<aside class="pitfall">Do not read “blew up” as “the Reynolds number is too high for lattice Boltzmann”. It means the grid is too coarse for that Reynolds number. The shear layer at $\tau = 0.502$ fails on 32 nodes and runs on 64. See <a href="#/pathologies">τ → ½ instability</a> in the gallery.</aside>
<h3 id="mach-error">The Mach-number error</h3>
<p>Lattice Boltzmann has no pressure equation. Its pressure is $p = c_s^2\rho$, so the density must vary to push the flow around. The method simulates a slightly compressible gas and hopes it behaves like an <dfn data-term="incompressible">incompressible</dfn> liquid. It does, to an error that grows like the square of the <dfn data-term="mach-number">Mach number</dfn>:</p>
<div class="eq" id="eq-mach">$$\mathrm{Ma} = \frac{U}{c_s} = \sqrt{3}\,U,\qquad \text{error} \propto \mathrm{Ma}^2.$$<span class="eq-tag">(13.8)</span></div>
<p>Some of this error is physical compressibility: density waves and a density that varies by order $\mathrm{Ma}^2$. Some is the lattice: the $\rho u^3$ term that nine velocities cannot represent. The figure measures it on Taylor–Green vortices, a periodic array of eddies whose energy decays at a rate fixed exactly by $\nu$. Each point is a short run at one lattice speed $U$. The error at $U = 0.005$ is subtracted, so what remains is the part that depends on Ma.</p>
<figure data-widget="lattice-particles-mach"><figcaption>The extra error in the Taylor–Green decay rate against Mach number, on log axes (lbm.js, $n = 32$, $\tau = 0.8$, BGK). The dashed line has slope 2. The dotted vertical line is where the kernel’s health check starts to warn, at Ma = 0.3.</figcaption></figure>
<div class="try"><ol>
<li>Read the slope: the points follow the $\mathrm{Ma}^2$ line. The vortices decay too slowly by about $0.19\,\mathrm{Ma}^2$: 0.19% at Ma 0.1, 0.75% at Ma 0.2, 1.7% at Ma 0.3.</li>
<li>Drag <b>Lattice speed U</b> to 0.4 (Ma 0.69). The error reaches about 8% and bends below the line, as the terms beyond $\mathrm{Ma}^2$ start to matter.</li>
</ol></div>
<p>The fix is to run slower, and it is not free. At a fixed grid and Reynolds number, lowering $U$ lowers $\nu = UN/\mathrm{Re}$, which pushes $\tau$ towards $\tfrac12$. It also means more steps for the same physical time. Halve the Mach number and you need twice the steps. Practitioners usually keep Ma below about 0.1 to 0.3. When they refine the grid, they often scale the time step like $\Delta x^2$ (“diffusive scaling”) rather than like $\Delta x$, so that the Mach error falls as fast as the spatial error. That makes fine lattice-Boltzmann grids more expensive than the cost per step suggests.</p>
<h3 id="bounce-back">Walls: bounce-back</h3>
<p>The simplest wall in lattice Boltzmann is <dfn data-term="bounce-back">bounce-back</dfn>: a population that would stream into a solid node is sent straight back where it came from, reversed. No equation is solved; momentum is reflected, so the fluid sticks to the wall. With the wall taken to sit half-way between the last fluid node and the first solid one, it is second-order accurate for walls that follow the grid lines. A cylinder is not like that. On a square lattice its surface is a staircase of cells, and bounce-back there is only first order: the effective diameter depends on how the circle happens to cut the grid. The cylinder in <a href="#/lattice-particles/vortex-street">the wake section</a> is 12 nodes across, so its edge is uncertain by a good fraction of a node. Interpolated bounce-back (Bouzidi, Firdaouss and Lallemand 2001) uses the true wall position and restores second order, at the cost of extra work and of exact mass conservation. Inlets and outlets need their own rules too. The Zou–He and regularised inlets used above are two of them, and as the cylinder showed, the choice changes stability.</p>
<div data-quiz="q4"></div>

<h2 id="sph">Smoothed particle hydrodynamics</h2>
<p>Lattice Boltzmann kept a grid and changed the equations. Smoothed particle hydrodynamics keeps the equations and throws away the grid. The fluid is a set of particles, each carrying a fixed mass $m_j$, a velocity and a density, and each moving with the flow. That is the <a href="#/viewpoints/lagrangian-eulerian">Lagrangian</a> view of chapter 2: there is no advection term to discretise, because the particles <em>are</em> the advection. Mass is conserved exactly, because no particle ever gains or loses any. And a free surface needs no special treatment: where there are no particles, there is no fluid.</p>
<p>The question is how to take a derivative when your data sit at scattered points. The answer is smoothing. Spread each particle’s value over a small neighbourhood with a bump-shaped weight function $W$, the <dfn data-term="smoothing-kernel">smoothing kernel</dfn>. It is normalised to integrate to 1, and it falls to zero beyond a distance $2h$, where $h$ is the smoothing length. Any field $A$ is then estimated at any point as a weighted sum over nearby particles, each counted with its own volume $m_j/\rho_j$:</p>
<div class="eq" id="eq-sph-interp">$$\begin{gathered}A(\mathbf{x}) \approx \sum_j \frac{m_j}{\rho_j}\,A_j\,W(\mathbf{x} - \mathbf{x}_j,\ h),\\ \nabla A(\mathbf{x}) \approx \sum_j \frac{m_j}{\rho_j}\,A_j\,\nabla W(\mathbf{x} - \mathbf{x}_j,\ h).\end{gathered}$$<span class="eq-tag">(13.9)</span></div>
<p>The gradient falls on the kernel, which you know analytically. Put $A = \rho$ in (13.9) and the density of particle $i$ becomes a plain kernel-weighted sum of its neighbours’ masses:</p>
<div class="eq" id="eq-sph-rho">$$\rho_i = \sum_j m_j\,W_{ij},\qquad W_{ij} = W(\mathbf{x}_i - \mathbf{x}_j,\ h).$$<span class="eq-tag">(13.10)</span></div>
<p>The momentum equation is written in a symmetric form, so that each pair of particles pushes equally and oppositely along the line between them. Then linear and angular momentum are conserved to round-off:</p>
<div class="eq" id="eq-sph-mom">$$\frac{\mathrm{d}\mathbf{v}_i}{\mathrm{d}t} = -\sum_j m_j\left(\frac{p_i}{\rho_i^{2}} + \frac{p_j}{\rho_j^{2}} + \Pi_{ij}\right)\nabla_i W_{ij} + \mathbf{g}.$$<span class="eq-tag">(13.11)</span></div>
<p>That leaves the pressure. Water is nearly incompressible, and an incompressible SPH needs a pressure Poisson solve over scattered particles, which loses much of the simplicity. The common shortcut is <dfn data-term="weakly-compressible">weakly compressible</dfn> SPH. Give the fluid a stiff equation of state, so that a small compression produces a large pressure, and integrate everything explicitly. The usual choice is the <dfn data-term="tait-equation">Tait equation</dfn> (Monaghan 1994):</p>
<div class="eq" id="eq-tait">$$p = \frac{\rho_0 c_0^{2}}{\gamma}\left[\left(\frac{\rho}{\rho_0}\right)^{\gamma} - 1\right],\qquad \gamma = 7.$$<span class="eq-tag">(13.12)</span></div>
<p>The trick is to choose an artificial sound speed $c_0$: about ten times the fastest flow speed, not the real 1500 m/s of water. Then the Mach number is about 0.1, and density varies by about $\mathrm{Ma}^2 \approx 1\%$. This is the same bargain as lattice Boltzmann and as <a href="#/pressure/other-roads">artificial compressibility</a> in chapter 10: accept a little compressibility to avoid solving for the pressure. The price is the time step. An explicit scheme must resolve sound waves, so $\Delta t$ is about $0.25\,h/c_0$, set by the fake sound speed rather than by the flow.</p>
<p>Particles that approach each other also need some dissipation, or sound waves rattle the particles for ever and shocks let particles pass through each other. The standard <dfn data-term="artificial-viscosity">artificial viscosity</dfn> adds the pairwise term $\Pi_{ij}$ to (13.11). It acts only on pairs that are approaching:</p>
<div class="eq" id="eq-sph-av">$$\begin{gathered}\Pi_{ij} = \frac{-\alpha\,\bar{c}_{ij}\,\mu_{ij} + \beta\,\mu_{ij}^{2}}{\bar{\rho}_{ij}},\\ \mu_{ij} = \frac{h\,\mathbf{v}_{ij}\cdot\mathbf{r}_{ij}}{r_{ij}^{2} + 0.01h^{2}}\quad\text{if } \mathbf{v}_{ij}\cdot\mathbf{r}_{ij} &lt; 0,\ \text{else } \Pi_{ij} = 0.\end{gathered}$$<span class="eq-tag">(13.13)</span></div>
<p>Here bars are pair averages, $\mathbf{r}_{ij} = \mathbf{x}_i - \mathbf{x}_j$ and $\mathbf{v}_{ij} = \mathbf{v}_i - \mathbf{v}_j$. It is the particle cousin of the artificial viscosity that <a href="#/shocks/riemann">shock-capturing grid schemes</a> use.</p>
<aside class="who" data-person="leon-lucy">Leon Lucy (Astron. J., December 1977) described a “finite-size particle scheme” for gas dynamics. He used it to test whether a rotating protostar could split into a multiple star; in his run it became a triple system holding 60% of the original mass. The name smoothed particle hydrodynamics is not his.</aside>
<aside class="who" data-person="gingold-monaghan">Robert Gingold and Joseph Monaghan (Mon. Not. R. Astron. Soc., 1977), working independently of Lucy, gave the method its name. With about 80 particles in three dimensions they reproduced rotating and magnetic polytropes, model stars, to within a few per cent. Only Lucy’s paper studied fission. Monaghan and Gingold introduced the pairwise artificial viscosity in 1983, and Monaghan’s 1992 review made it standard.</aside>
<p>The figure is the classic test: a dam break. A column of water one unit wide and two tall stands at the left of a tank four units long. At $t = 0$ the dam vanishes and the column collapses along the floor. Walls are rows of fixed dummy particles whose pressure is extrapolated from the fluid, a simplified form of the method of Adami, Hu and Adams (2012), so the kernel never runs out of neighbours at a wall. The density is integrated from the continuity equation with a small density diffusion called δ-SPH (Molteni and Colagrossi 2009), which <a href="#/lattice-particles/sph-limits">SPH’s numerical limits</a> explains. The plot tracks the surge front against Ritter’s (1892) shallow-water solution $Z = 1 + 2T$, where $Z$ is the front position in column widths and $T = t\sqrt{gH}/a$.</p>
<figure data-widget="lattice-particles-sph" class="wide"><figcaption>A weakly compressible SPH dam break (sph.js, Wendland kernel, 800 fluid particles at 20 per column width). Colour by speed, pressure or kernel sum. The plot is the front position $Z$ against $T$, beside Ritter’s ideal front. The readouts include the share of particles with a clearly negative pressure and the largest density error.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b>. The front starts slowly and trails Ritter’s line all the way. Ritter assumes shallow water from the start, while the real column must first fall. The surge reaches the far wall a little after $T = 3$, where Ritter’s front would arrive at $T = 1.5$. Ritter is an upper bound, not a target.</li>
<li>Colour by <b>pressure</b>. The column starts hydrostatic, high at the bottom and zero at the top, and a pressure spike appears when the surge hits the wall. <b>max |ρ/ρ₀ − 1|</b> stays near or below a per cent until impact.</li>
<li>Drag <b>Artificial viscosity α</b> to 0.5. The splash becomes sticky. Even the default $\alpha = 0.05$ is a large viscosity in physical terms; see the note below.</li>
</ol></div>
<aside class="note" data-label="Viscous water">In two dimensions the artificial viscosity (13.13) acts like a kinematic viscosity of about $\alpha h c_0/8$. For this tank, with $\alpha = 0.05$, $h = 0.075$ m and $c_0 = 62.6$ m/s, that is 0.03 m²/s, about thirty thousand times the viscosity of water. The Reynolds number of the simulated collapse is a few hundred, against about ten million for real water. SPH dam breaks look right because, for this flow, gravity and inertia dominate. If viscosity matters to your question, use a physical viscosity model and enough particles to afford a small one.</aside>
<details class="deeper"><summary>Go deeper: where the kernel sums come from</summary>
<p>Start from the identity $A(\mathbf{x}) = \int A(\mathbf{x}')\,\delta(\mathbf{x} - \mathbf{x}')\,\mathrm{d}\mathbf{x}'$ and replace the delta function by the kernel:</p>
$$A(\mathbf{x}) \approx \int A(\mathbf{x}')\,W(\mathbf{x} - \mathbf{x}',\ h)\,\mathrm{d}\mathbf{x}'.$$
<p>For a symmetric kernel that integrates to 1, the error is $O(h^2)$: the first moment vanishes by symmetry, so the leading error comes from the curvature of $A$. Now cut the integral into the volumes owned by particles, $\mathrm{d}\mathbf{x}' \to m_j/\rho_j$, and you have (13.9). The gradient follows by differentiating under the integral and integrating by parts; the boundary term vanishes only if the kernel’s support lies entirely inside the fluid. Two assumptions have crept in. The particles must be spread evenly enough for the sum to approximate the integral, and the support must not be cut off. <a href="#/lattice-particles/sph-limits">SPH’s numerical limits</a> breaks both.</p>
<p>The symmetric pressure term of (13.11) comes from writing $\nabla p/\rho = \nabla(p/\rho) + (p/\rho^2)\nabla\rho$ and applying (13.9) to each piece. The result is antisymmetric in $i$ and $j$, which is what conserves momentum.</p>
</details>

<h2 id="sph-limits">SPH’s numerical limits</h2>
<p>SPH conserves mass and momentum exactly and handles splashes that would defeat a grid. Its weaknesses come from the particles themselves: how they are arranged, how many neighbours they have, and what happens where neighbours are missing.</p>
<h3 id="tensile">Particles that clump: the tensile instability</h3>
<p>Under tension, meaning negative pressure, standard SPH particles attract each other in pairs and clump into strings. Swegle, Hicks and Attaway (1995) traced this <dfn data-term="tensile-instability">tensile instability</dfn> with a stability analysis. It depends on the sign of the stress and of the kernel’s second derivative $W''$ at the neighbour spacing. Bell-shaped kernels are convex in their outer parts ($W'' &gt; 0$), and the nearest neighbours of a particle usually sit there. In that region, tension makes a pair of particles pull closer, and the closer they get, the harder they pull. It is a property of the discretisation, not of the time integration, so a smaller step does not help. Price (2012) credits the name itself to Monaghan (2000), who also gave the standard fix, <em>artificial pressure</em>. It is a short-range repulsion that switches on under negative pressure, with a strength proportional to $(W_{ij}/W(\Delta p))^4$, where $\Delta p$ is the initial particle spacing.</p>
<p>A second clumping has a different cause. With many neighbours, some kernels let particles pair up even under compression. This is the <em>pairing instability</em>. Dehnen and Aly (2012) showed that Wendland kernels, whose Fourier transforms are positive, do not suffer from it.</p>
<figure data-widget="lattice-particles-tensile" data-preset="tensile" class="wide"><figcaption>A periodic square lattice of 900 SPH particles under a uniform background pressure, with a tiny random kick (sph.js presets tensile, tensile-fixed, pairing, pairing-fixed). Particles whose nearest neighbour is closer than half the lattice spacing are highlighted; the plot is their share against time.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> on the tensile case: cubic spline, $h = 1.2\,\Delta p$, background pressure $-0.03$. Within one time unit about a sixth of the particles have paired up, and <b>min spacing / dx</b> falls to about 0.1.</li>
<li>Press <b>Reset</b>, tick <b>Artificial pressure</b>, then <b>Run</b> (or choose the tensile-fixed case). No pairs form. The lattice still loosens slowly (the closest pair reaches about 0.6 of the spacing by $t = 6$), but nothing clumps.</li>
<li>Press <b>Reset</b>, switch <b>Kernel</b> to Wendland C2 (still under tension, without artificial pressure), then <b>Run</b>. Particles still pair, about 5% of them: a better kernel does not cure the tensile instability.</li>
<li>Choose the <b>pairing</b> case: cubic spline at $h = 2\,\Delta p$ under <em>positive</em> pressure. Nothing happens for a while, then most of the lattice pairs: 63% by $t = 8$ and over 90% by $t = 14$. The Wendland kernel at the same $h$ (<b>pairing-fixed</b>) holds the lattice perfectly.</li>
</ol></div>
<div data-quiz="q5"></div>
<h3 id="truncation">Kernel truncation at a free surface</h3>
<p>Inside the fluid a particle’s kernel is full of neighbours. At a free surface half of it hangs over empty space. The kernel sum $\sum_j (m_j/\rho_0) W_{ij}$, which is 1 inside, drops to about 0.76 at a flat surface (Wendland kernel, $h = 1.5\,\Delta p$). If you compute density by summation, (13.10), surface particles therefore read about a quarter too light. The Tait equation turns that into a large negative pressure, which pulls the surface particles together: the tensile instability again, now at the surface. Integrating the density from the continuity equation, as the dam break does, avoids the problem, because each particle’s density changes only when its neighbours converge or diverge.</p>
<figure data-widget="lattice-particles-sph" data-preset="summation" class="wide"><figcaption>The dam break with summation density. Before you press Run, colour by <b>kernel sum</b> to see the deficit along the free surface; colour by pressure while it runs to see the negative pressures it causes.</figcaption></figure>
<div class="try"><ol>
<li>Before you press Run, set <b>Colour by</b> to kernel sum. The top surface reads about 0.75 and the corners less (<b>min kernel sum</b> 0.56).</li>
<li>Press <b>Run</b> and watch the first few hundredths of a second. The surface particles pull together until their kernels are nearly full: by $t = 0.02$ s the minimum kernel sum is above 0.9. By $t = 0.05$ s half the particles read a clearly negative pressure and half have paired. The deficit has not been cured; it has been converted into clumps.</li>
<li>Set <b>Density</b> back to continuity with δ-SPH diffusion and compare. The kernel sums at the surface stay low, but nothing clumps, because the density no longer depends on them.</li>
</ol></div>
<h3 id="noise">Pressure noise</h3>
<p>Continuity density has its own fault. Weakly compressible SPH is full of sound waves, and with nothing to damp them, the pressure field is speckled with particle-to-particle noise. Many particles read negative pressures in water that is merely falling. δ-SPH adds a small diffusion term to the continuity equation that smooths density differences between neighbours. Here it removes the hydrostatic part of the difference first, so a tank at rest stays at rest.</p>
<figure data-widget="lattice-particles-sph" data-preset="noisy" class="wide"><figcaption>The dam break with continuity density and no density diffusion. Colour is by speed; switch <b>Colour by</b> to pressure to see the noise.</figcaption></figure>
<div class="try"><ol>
<li>Run it and watch <b>p &lt; −0.05ρgH</b>. At $t = 0.05$ s about a quarter of the water reads a clearly negative pressure (26%). The share comes and goes as pressure waves rattle through the column, and it is 15% again at $t = 0.6$ s.</li>
<li>Compare the first dam break, with δ-SPH. The sudden release causes a brief burst of negative pressure there too, in the first two hundredths of a second, but it is gone by $t = 0.05$ s and stays near 1% or below until the surge hits the far wall.</li>
<li>Compare the fronts in the two runs. The front moves almost identically: the noise spoils the pressure field, not the bulk motion. That is why it is easy to miss.</li>
</ol></div>
<h3 id="neighbours">The cost of neighbours</h3>
<p>Every SPH particle interacts with every other particle inside its support. With $h = 1.5\,\Delta p$ and support $2h$, that is a disc of radius three spacings, about 28 neighbours in two dimensions and well over a hundred in three. Finding them each step needs a spatial data structure, a cell list or tree, which makes the search cost proportional to the number of particles. The work per particle is still large. On the machine that built this course, a dam-break step costs about 0.34 μs per particle (fluid plus wall). A lattice-Boltzmann step on the cylinder wake costs about 0.02 μs per node, roughly twenty times less. On top of that SPH needs small steps, because of the artificial sound speed. Particles buy free surfaces and exact advection. They do not buy speed.</p>
<aside class="pitfall">An SPH run that looks good can still have a wrong pressure field. Plot the pressure along a line through the fluid, or the share of particles at negative pressure, before you trust any force or load you read from it. See <a href="#/pathologies">SPH pressure noise</a> in the gallery.</aside>

<h2 id="compare">Grids, lattices and particles</h2>
<p>No method in this course wins everywhere. The table sets the three families side by side for incompressible, single-phase flow. The grid column means the finite-volume and projection methods of chapters 3 and 10. The other two columns are the methods as they were built in this chapter.</p>
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
<p>Read the table as a list of trades, not a ranking. Lattice Boltzmann buys locality by giving up exact incompressibility, and pays with small time steps and the Mach error. That suits flows with complex fixed geometry and big parallel machines: porous media, flow through a city block, blood in vessels. SPH buys free surfaces and exact advection by giving up the regular grid, and pays with noise and neighbour searches. That suits splashing, breaking and violent flows such as sloshing tanks, wave impacts and dam breaks, and astrophysics, where it began. Grid methods remain the default for most engineering flows, because their accuracy and their boundary conditions are the best understood.</p>
<p>The most useful habit carries across all three. Each method has a quantity that tells you when it is lying. On a grid it is the CFL number and the divergence. For lattice Boltzmann it is $\tau - \tfrac12$ against the resolution, and the Mach number. For SPH it is the kernel sum, the density error and the share of particles at negative pressure. Put those numbers in your readouts and watch them, as the figures here do. Then check the result against something you trust, as the vortex street was checked against Williamson’s fit. The <a href="#/trust/checklist">field guide</a> in chapter 15 and the <a href="#/pathologies">rogues’ gallery</a> collect the symptoms.</p>
<p>This chapter has shown only the simplest version of each method. Both families now have far more machinery than you met here. For lattice Boltzmann: MRT and cumulant collisions, interpolated walls, grid refinement and multiphase models. For SPH: incompressible and Riemann-based variants, particle shifting and adaptive resolution. The failures in this chapter are the reasons each of those exists.</p>

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
        'Not decay at all: the amplitude stays exactly where it started.',
        'Decay much faster than a real fluid, because the particles collide so often.',
        'Blow up, because integer arithmetic cannot represent a smooth wave.',
      ],
      answer: 1,
      explain: 'HPP collisions swap an east–west pair for a north–south pair, and both carry zero $x$-momentum. East- and west-movers never leave their row, so the $x$-momentum of every row is conserved for ever. The wave is built from those row momenta, so it cannot change. Turn the wave through 45° and it does decay: the viscosity depends on direction. Integer arithmetic is not the problem; it conserves mass and momentum exactly.',
    },
    q2: {
      type: 'num',
      q: 'You want a lattice-Boltzmann flow at $\\mathrm{Re} = 1000$ on a domain $N = 100$ nodes across, with lattice speed $U = 0.05$. Using $\\nu = (\\tau - \\tfrac12)/3$, what relaxation time $\\tau$ do you need?',
      answer: 0.515,
      tol: 0.002,
      explain: '$\\nu = UN/\\mathrm{Re} = 0.05 \\times 100/1000 = 0.005$, so $\\tau = \\tfrac12 + 3\\nu = 0.515$. That is already close to $\\tfrac12$. Ask for Re 10 000 on the same grid and $\\tau = 0.5015$: you are in the territory of the shear-layer blow-up shown later in this chapter. Lowering $U$ to cut the Mach error makes it worse, because $\\nu$ falls with $U$.',
    },
    q3: {
      type: 'num',
      q: 'A telegraph wire 4 mm thick sings in a 12 m/s wind. Taking $\\mathrm{St} \\approx 0.2$, at what frequency are vortices shed?',
      answer: 600,
      tol: 0.05,
      unit: 'Hz',
      explain: '$f = \\mathrm{St}\\,U/D = 0.2 \\times 12/0.004 = 600$ Hz. The Reynolds number is $UD/\\nu \\approx 12 \\times 0.004/(1.5\\times 10^{-5}) \\approx 3200$ in air, well inside the wide range where St stays near 0.2. That is why the pitch rises in proportion to the wind speed, as Strouhal measured for wires in 1878. Each shed vortex pushes the wire sideways, so the wire sings at the shedding frequency.',
    },
    q4: {
      type: 'mcq',
      q: 'A lattice-Boltzmann run at $\\mathrm{Ma} = 0.2$ has a compressibility error you want to cut by a factor of four, keeping the grid and the Reynolds number fixed. What do you do, and what does it cost?',
      choices: [
        'Halve the lattice speed $U$. The error falls like $\\mathrm{Ma}^2$, but $\\tau$ moves closer to $\\tfrac12$ and you need twice as many steps.',
        'Switch from BGK to TRT collision. The Mach error is a defect of the single relaxation time.',
        'Refine the grid by a factor of two. Finer grids reduce every error.',
        'Raise $\\tau$ to add viscosity. More viscosity damps the density waves.',
      ],
      answer: 0,
      explain: 'The Mach error comes from the equilibrium and the lattice, so a different collision operator does not remove it. Refining the grid at fixed $U$ leaves Ma unchanged. Raising $\\tau$ changes the Reynolds number, so it simulates a different flow. Halving $U$ quarters the error, but at fixed Re and $N$ it also halves $\\nu$, which pushes $\\tau$ towards $\\tfrac12$, and it doubles the number of steps for the same physical time.',
    },
    q5: {
      type: 'predict',
      q: 'In the tensile case, particles pair up under negative pressure with the cubic-spline kernel. The Wendland kernel is known to prevent the pairing instability. Switch the kernel to Wendland, keeping the negative pressure and no artificial pressure. What do you expect?',
      choices: [
        'No pairs: Wendland kernels fix clumping of every kind.',
        'Pairs still form: Wendland stops pairing under compression, not the tensile instability.',
        'The particles fly apart, because the Wendland kernel is too weak to hold them.',
        'The same pairing as the cubic spline, because the kernel makes no difference to stability.',
      ],
      answer: 1,
      explain: 'The two instabilities have different causes. Under tension, any kernel whose second derivative is positive at the neighbour spacing pulls pairs together (Swegle et al. 1995), and both kernels are convex there at these smoothing lengths. In the figure about 5% of the particles pair with Wendland, against 17–20% with the cubic spline: better, not cured. The cure for tension is artificial pressure. Wendland kernels fix the other clumping, the pairing instability under compression with many neighbours.',
    },
  },
  glossary: {
    'lattice-gas': {
      term: 'lattice gas',
      def: 'A cellular automaton in which particles hop between the nodes of a lattice and collide by fixed rules that conserve mass and momentum. Its averages behave like a fluid if the lattice is symmetric enough (FHP, hexagonal), but not on a square lattice (HPP). Exactly conserving, but noisy.',
      section: 'lattice-gas',
    },
    'lattice-boltzmann': {
      term: 'lattice Boltzmann method',
      def: 'A flow solver that evolves real-valued particle distributions $f_q$ on a lattice by alternating local collisions and streaming along links. Its averages obey the Navier–Stokes equations with $\\nu = (\\tau - \\tfrac12)/3$, up to errors of order $\\mathrm{Ma}^2$.',
      section: 'lbm',
    },
    'bgk-collision': {
      term: 'BGK collision',
      def: 'The single-relaxation-time collision of lattice Boltzmann: every population moves a fraction $1/\\tau$ of the way towards its local equilibrium. Named after Bhatnagar, Gross and Krook (1954).',
      section: 'lbm',
    },
    'relaxation-time': {
      term: 'relaxation time',
      def: 'In lattice Boltzmann, the number $\\tau$ of time steps over which collisions pull the populations back to equilibrium. It sets the viscosity, $\\nu = (\\tau - \\tfrac12)/3$, and must stay above $\\tfrac12$.',
      section: 'lbm',
    },
    streaming: {
      term: 'streaming',
      def: 'The step of a lattice gas or lattice-Boltzmann scheme in which every population moves one link along its velocity, unchanged. It is exact: no interpolation, no numerical diffusion.',
      section: 'lbm',
    },
    'bounce-back': {
      term: 'bounce-back',
      def: 'The simplest lattice-Boltzmann wall: a population that would stream into a solid node is reflected back along the link it came from. Second order for walls along grid lines; first order on staircased curved walls.',
      section: 'lbm-limits',
    },
    'vortex-street': {
      term: 'vortex street',
      def: 'The wake of a bluff body above a critical Reynolds number (about 47 for a cylinder): two staggered rows of vortices of opposite sign, shed alternately at a frequency given by the Strouhal number.',
      section: 'vortex-street',
    },
    sph: {
      term: 'smoothed particle hydrodynamics (SPH)',
      def: 'A mesh-free Lagrangian method in which the fluid is a set of moving particles and every field and derivative is a kernel-weighted sum over neighbours. Introduced independently by Lucy and by Gingold and Monaghan in 1977.',
      section: 'sph',
    },
    'smoothing-kernel': {
      term: 'smoothing kernel',
      def: 'In SPH, the bump-shaped weight $W(r, h)$, normalised to integrate to 1 and zero beyond about $2h$, that spreads each particle’s value over its neighbourhood. Its shape decides accuracy and which clumping instabilities appear.',
      section: 'sph',
    },
    'weakly-compressible': {
      term: 'weakly compressible',
      def: 'Treating a liquid as a slightly compressible fluid with an artificial sound speed about ten times the flow speed, so density varies by about 1% and no pressure equation is solved. Used by SPH and, in effect, by lattice Boltzmann.',
      section: 'sph',
    },
    'tait-equation': {
      term: 'Tait equation',
      def: 'The stiff equation of state $p = (\\rho_0 c_0^2/\\gamma)[(\\rho/\\rho_0)^\\gamma - 1]$ with $\\gamma = 7$, used by weakly compressible SPH to turn small density changes into large pressures (Monaghan 1994).',
      section: 'sph',
    },
    'artificial-viscosity': {
      term: 'artificial viscosity',
      def: 'Dissipation added to a scheme to damp oscillations or capture shocks. In SPH, a pairwise term that acts only on approaching particles (Monaghan and Gingold 1983). It can be far larger than the real viscosity of the fluid.',
      section: 'sph',
    },
    'tensile-instability': {
      term: 'tensile instability',
      def: 'The clumping of SPH particles into pairs and strings under negative pressure, caused by the sign of the kernel’s second derivative at the neighbour spacing (Swegle, Hicks and Attaway 1995). Fixed by artificial pressure (Monaghan 2000).',
      section: 'sph-limits',
    },
  },
  pathologies: [
    {
      id: 'lbm-tau-instability',
      name: 'τ → ½ instability (lattice Boltzmann)',
      family: 'stability',
      symptom: 'What you see: grid-scale noise appears in sharp layers, densities leave their range, populations go negative, and the run blows up within a few hundred steps.',
      cause: 'Why: as $\\tau \\to \\tfrac12$ the viscosity $\\nu = (\\tau - \\tfrac12)/3$ vanishes, and each collision flips the non-equilibrium part with a factor $1 - 1/\\tau$ near $-1$. When the flow makes gradients the grid cannot resolve, nothing damps the shortest waves.',
      diagnose: 'How to tell: watch a health check (largest Mach number, density range, negative populations). Compare $\\tau - \\tfrac12$ with the resolution: the same $\\tau$ that fails at $n = 32$ runs at $n = 64$.',
      mitigations: [
        'Refine the grid so the thinnest layers span several nodes. This is the cure that works, and it costs more nodes and steps.',
        'Raise $\\tau$ (a lower Reynolds number), if the physics allows.',
        'Use TRT or MRT collision and tune the free parameters. This helps in many flows, but it is not universal: in the shear layer here TRT fails where BGK survives.',
        'Choose boundary conditions that suit the collision operator: BGK with a Zou–He inlet fails near $\\tau = \\tfrac12$ where a regularised inlet survives.',
      ],
      section: 'lbm-limits',
      demo: { widget: 'lattice-particles-tau', data: { preset: 'bgk-coarse' } },
    },
    {
      id: 'lbm-compressibility-error',
      name: 'Mach-number error (lattice Boltzmann)',
      family: 'accuracy',
      symptom: 'What you see: results that are smooth and stable but wrong by a few per cent, and the error does not fall when you refine the grid at a fixed lattice speed.',
      cause: 'Why: lattice Boltzmann simulates a slightly compressible gas with $p = c_s^2\\rho$, and the lattice cannot represent the third moment of the equilibrium. Both give errors of order $\\mathrm{Ma}^2$ with $\\mathrm{Ma} = \\sqrt{3}\\,U$.',
      diagnose: 'How to tell: halve the lattice speed $U$ at a fixed Reynolds number and grid. If the answer changes by about a quarter of the old error, it was a Mach error. Here the Taylor–Green decay is about $0.19\\,\\mathrm{Ma}^2$ too slow.',
      mitigations: [
        'Keep Ma below about 0.1 to 0.3 (lattice speed below 0.06 to 0.17). This costs steps, and it pushes $\\tau$ towards $\\tfrac12$.',
        'Refine with diffusive scaling ($\\Delta t \\propto \\Delta x^2$), so the Mach error falls as fast as the spatial error.',
        'Use extended equilibria or larger velocity sets that represent more moments, at the cost of more populations per node.',
      ],
      section: 'lbm-limits',
      demo: { widget: 'lattice-particles-mach', data: {} },
    },
    {
      id: 'lattice-anisotropy',
      name: 'Lattice anisotropy',
      family: 'accuracy',
      symptom: 'What you see: the same flow behaves differently depending on how it is oriented relative to the lattice. On the square HPP lattice, a shear wave along the axes never decays, while the same wave at 45° does.',
      cause: 'Why: the velocity set is not symmetric enough. Isotropic viscous stress needs isotropic fourth-order velocity sums, which four directions on a square lattice cannot provide. HPP also conserves the momentum of every row and column, an invariant real fluids do not have.',
      diagnose: 'How to tell: run the same test rotated relative to the lattice (a shear wave along $x$, along $y$ and at 45°) and compare the decay rates.',
      mitigations: [
        'Use a velocity set with isotropic fourth-order sums: six directions on a hexagonal lattice (FHP), or nine weighted velocities on a square lattice (D2Q9).',
        'Add collisions that destroy spurious invariants (the FHP triple collision).',
        'In lattice Boltzmann, keep the Mach number low: higher-order anisotropic terms grow with the velocity.',
      ],
      section: 'lattice-gas',
      demo: { widget: 'lattice-particles-gas', data: { preset: '' } },
    },
    {
      id: 'sph-tensile-instability',
      name: 'Tensile instability (SPH)',
      family: 'stability',
      symptom: 'What you see: under negative pressure, particles pull together in pairs and strings, leaving holes. The density field becomes lumpy and any stress field is ruined.',
      cause: 'Why: where the kernel is convex ($W\'\' &gt; 0$, the outer part where nearest neighbours sit), a negative pressure makes the pair force attractive, and it grows as the particles approach (Swegle, Hicks and Attaway 1995). It is a property of the spatial discretisation, not of the time step.',
      diagnose: 'How to tell: track the closest-neighbour distance or the share of particles whose nearest neighbour is closer than half the initial spacing. A clean lattice keeps it near 1 spacing.',
      mitigations: [
        'Artificial pressure (Monaghan 2000): a short-range repulsion under negative pressure. Cheap and effective, but it adds a non-physical force.',
        'Avoid negative pressures: add a background pressure, or use wall and free-surface treatments that do not produce spurious tension.',
        'Particle shifting, which keeps particles evenly spaced at the cost of small mass-transport errors.',
        'Changing the kernel alone does not cure it: the Wendland kernel still clumps under tension.',
      ],
      section: 'sph-limits',
      demo: { widget: 'lattice-particles-tensile', data: { preset: 'tensile' } },
    },
    {
      id: 'sph-kernel-truncation',
      name: 'Kernel truncation at a free surface (SPH)',
      family: 'boundary',
      symptom: 'What you see: with summation density, particles at the free surface read too low a density and a large negative pressure, and the surface clumps or tears within the first few hundredths of a second.',
      cause: 'Why: a surface particle’s kernel is half empty. The kernel sum $\\sum_j (m_j/\\rho_0)W_{ij}$ drops from 1 to about 0.76 at a flat surface, so summation density reads about a quarter low, and the stiff equation of state turns that into strong tension.',
      diagnose: 'How to tell: look at the kernel sum at the start of the run. Values well below 1 mark the surface; with summation density those particles read low density and negative pressure. Look early: once the surface has clumped, the kernel sums are back near 1 and the evidence is gone.',
      mitigations: [
        'Integrate density with the continuity equation instead of summation. It does not see the missing neighbours.',
        'Clamp negative pressures at free-surface particles, or detect the surface and set its pressure to zero.',
        'Renormalise with the kernel sum (Shepard filter). It only partly helps at the surface.',
        'At walls, use dummy wall particles so the kernel is never truncated there.',
      ],
      section: 'sph-limits',
      demo: { widget: 'lattice-particles-sph', data: { preset: 'summation' } },
    },
    {
      id: 'sph-pressure-noise',
      name: 'Pressure noise (weakly compressible SPH)',
      family: 'accuracy',
      symptom: 'What you see: the motion looks right, but the pressure field is speckled particle by particle, and many particles read negative pressure in water that should be near zero or hydrostatic.',
      cause: 'Why: an explicit, weakly compressible scheme is full of sound waves, and continuity density has nothing that damps the particle-to-particle density differences they leave behind.',
      diagnose: 'How to tell: count the particles below a small negative pressure, or plot pressure along a line through the fluid. In the dam break here, 0.05 s after the release a quarter of the water reads below $-0.05\\rho g H$ without density diffusion, and none with it.',
      mitigations: [
        'Density diffusion (δ-SPH, Molteni and Colagrossi 2009), with the hydrostatic part removed so a tank at rest stays at rest.',
        'Periodic Shepard filtering of the density.',
        'Riemann-solver-based SPH, or incompressible SPH with a pressure solve, at higher cost per step.',
        'Moderate artificial viscosity, which damps the noise but makes the fluid more viscous.',
      ],
      section: 'sph-limits',
      demo: { widget: 'lattice-particles-sph', data: { preset: 'noisy' } },
    },
  ],
};
