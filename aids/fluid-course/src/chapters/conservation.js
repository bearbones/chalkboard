// Chapter 3: The bookkeeping: conservation laws. Control volumes and fluxes,
// the divergence theorem, mass, momentum and stress, the Navier–Stokes
// equations, d'Alembert's paradox, and the finite-volume method as the same
// bookkeeping done on a grid. Kernels: src/sims/ch-conservation.js (tests in
// tests/fluid-course/ch-conservation.test.js) and src/sims/flows.js.

import { mountConservationBox } from './conservation/box.js';
import { mountConservationBudget } from './conservation/budget.js';
import { mountConservationCylinder } from './conservation/cylinder.js';
import { mountConservationTelescoping } from './conservation/telescoping.js';

export const chapter = {
  id: 'conservation',
  title: 'The bookkeeping: conservation laws',
  short: 'Conservation laws',
  blurb: 'Control volumes, fluxes and the divergence theorem, building up to the Navier–Stokes equations.',
  minutes: 40,
  html: String.raw`
<p class="lead-in">Every equation in this course is a piece of bookkeeping. Draw a box anywhere in a fluid and count something inside it: mass, momentum, energy. The amount can change for only two reasons. Some crosses the walls of the box, or something inside the box makes or destroys it. Write that down for mass and you get the continuity equation. Write it down for momentum, with the right account of the forces, and you get the Navier–Stokes equations. Write it down for a row of grid cells and you get the finite-volume method, which is how most fluid solvers keep their books.</p>

<p>This chapter builds the equations from that one idea. It uses the notation of <a href="#/notation/vectors">chapter 1</a> and the material derivative of <a href="#/viewpoints/material-derivative">chapter 2</a>. On the way you will meet an old embarrassment of the theory, d'Alembert's paradox, and see why the way you write a conservation law on a computer matters as much as the law itself.</p>

<h2 id="control-volumes">Boxes, faces and fluxes</h2>

<p>Pick a region of space and keep it fixed while the fluid streams through it. Engineers call it a <dfn data-term="control-volume">control volume</dfn>. Its boundary is the <em>control surface</em>, and at each point of that surface $\mathbf{n}$ is the unit normal pointing out of the region.</p>

<p>Let $\phi$ be the amount of some quantity per unit volume: the density $\rho$ for mass, or $\rho\mathbf{u}$ for momentum. The <dfn data-term="flux">flux</dfn> $\mathbf{F}$ says how much of it crosses a surface, per unit area and per unit time. Fluid moving with velocity $\mathbf{u}$ carries its contents with it, so part of every flux is $\phi\,\mathbf{u}$. Some quantities also cross a surface without fluid crossing it: heat by conduction, momentum by viscous friction. Those parts are added to $\mathbf{F}$ too. Only the component along the normal matters: $\mathbf{F}\cdot\mathbf{n}\,\mathrm{d}S$ is the amount leaving through the patch $\mathrm{d}S$ each second. If it is negative, the quantity is coming in.</p>

<p>With a source $s$ (amount made per unit volume per unit time), the books for a fixed volume $V$ read</p>

<div class="eq" id="eq-balance">$$\frac{\mathrm{d}}{\mathrm{d}t}\int_V \phi\,\mathrm{d}V \;=\; -\oint_S \mathbf{F}\cdot\mathbf{n}\,\mathrm{d}S \;+\; \int_V s\,\mathrm{d}V .$$<span class="eq-tag">(3.1)</span></div>

<p>In words: the rate of change inside equals the net inflow through the walls plus whatever is made inside. Nothing else is allowed. This <em>integral form</em> is the fundamental statement. It needs no derivatives of $\phi$ or $\mathbf{F}$, so it still holds when the flow has a jump, such as a shock wave. That fact returns in <a href="#/shocks/rankine-hugoniot">chapter 8</a>.</p>

<p>To turn (3.1) into a differential equation we need one theorem. The <strong>divergence theorem</strong> (Gauss's theorem) says that the total outflow through a closed surface equals the integral of the divergence over the volume inside:</p>

<div class="eq" id="eq-divergence-theorem">$$\oint_S \mathbf{F}\cdot\mathbf{n}\,\mathrm{d}S \;=\; \int_V \nabla\cdot\mathbf{F}\,\mathrm{d}V .$$<span class="eq-tag">(3.2)</span></div>

<p>Here is the reason it is true. Cut the volume into many small boxes. For each one, the outflow through its faces is about $\nabla\cdot\mathbf{F}$ times its volume; that is what divergence means (<a href="#/viewpoints/deformation">chapter 2</a>). Now add up all the boxes. Every inner face is shared by two neighbours, and what leaves one enters the other, so the inner faces cancel in pairs. Only the outer surface is left. Keep this cancellation in mind. It is the whole idea of the finite-volume method at the end of the chapter.</p>

<p>Put (3.2) into (3.1). Because the box is fixed, the time derivative can move inside the integral. The result must hold for every box, however small, so the integrand itself must vanish:</p>

<div class="eq" id="eq-local">$$\frac{\partial \phi}{\partial t} + \nabla\cdot\mathbf{F} = s .$$<span class="eq-tag">(3.3)</span></div>

<p>This is the <em>local</em> or <em>differential</em> form of a conservation law. It holds wherever the fields are smooth enough to differentiate.</p>

<p>Test this before you trust it. In the figure below, a flow from chapter 2 streams through a square box that you can drag. The arrows on the faces show the flux $\mathbf{u}\cdot\mathbf{n}$ of volume: inflow in one colour, pointing in; outflow in another, pointing out. The readouts give the flow through each face, their sum, and the other side of (3.2), the volume integral of $\nabla\cdot\mathbf{u}$.</p>

<div data-quiz="q1"></div>

<figure data-widget="conservation-box" data-preset="source" class="wide"><figcaption>A fixed control volume in a 2-D flow. The face fluxes are integrated by Gauss–Legendre quadrature on the exact velocity field; the source term is computed independently from the source's known strength. The divergence theorem says the two must agree, and the last readout shows that they do.</figcaption></figure>

<div class="try"><ol>
<li>Start with the box away from the source. Fluid enters on the side nearer the source and leaves on the far side, and the net outflow is zero. Move the box around: it stays zero.</li>
<li>Drag the box over the dashed circle, the core where fluid is made. The net outflow jumps to $m = 2\pi$, and it stays there whether the box is small or large, as long as it holds the whole core.</li>
<li>Put the left edge of the box through the centre of the core. The box now holds half the core, and half of $m$ leaves through its faces.</li>
<li>Switch to the vortex, the stagnation point and the cylinder. Plenty of fluid crosses each face, yet every net outflow is zero: these flows are divergence-free.</li>
<li>Try the double gyre and press Play. The face fluxes change from moment to moment; the net stays zero at every instant.</li>
</ol></div>

<p>A fixed box is not the only choice. A <em>material volume</em> moves and deforms with the fluid, so no fluid crosses its surface; it is the continuum version of a fixed set of particles. Newton's laws apply to material volumes, not to fixed boxes, so we need to move between the two. The rule for doing that is the <strong>Reynolds transport theorem</strong>. For a material volume $V(t)$ that coincides with the fixed volume $V$ at the instant $t$,</p>

<div class="eq" id="eq-transport">$$\frac{\mathrm{d}}{\mathrm{d}t}\int_{V(t)} \phi\,\mathrm{d}V \;=\; \int_V \frac{\partial \phi}{\partial t}\,\mathrm{d}V \;+\; \oint_S \phi\,\mathbf{u}\cdot\mathbf{n}\,\mathrm{d}S .$$<span class="eq-tag">(3.4)</span></div>

<p>The change in what a moving blob of fluid contains is the change inside the fixed box it occupies, plus what it carries out through the walls as it moves.</p>

<details class="deeper"><summary>Go deeper: the transport theorem from a moving boundary</summary>
<p>Over a short time $\delta t$, each patch $\mathrm{d}S$ of the material surface moves a distance $\mathbf{u}\,\delta t$. It sweeps out a thin slab of volume $(\mathbf{u}\cdot\mathbf{n})\,\delta t\,\mathrm{d}S$, positive where the surface moves outward. The material volume at $t + \delta t$ is the old region plus these slabs, so</p>
<p>$$\int_{V(t+\delta t)} \phi(t+\delta t)\,\mathrm{d}V - \int_{V(t)} \phi(t)\,\mathrm{d}V \approx \delta t\int_V \frac{\partial \phi}{\partial t}\,\mathrm{d}V + \delta t\oint_S \phi\,\mathbf{u}\cdot\mathbf{n}\,\mathrm{d}S .$$</p>
<p>Divide by $\delta t$ and let it go to zero. Using (3.2) on the surface term gives the local version, $\int_V \left(\partial_t\phi + \nabla\cdot(\phi\mathbf{u})\right)\mathrm{d}V$. With $\partial_t\phi + \nabla\cdot(\phi\mathbf{u}) = \mathrm{D}\phi/\mathrm{D}t + \phi\,\nabla\cdot\mathbf{u}$ this connects the box picture to the parcel picture of <a href="#/viewpoints/material-derivative">chapter 2</a>.</p>
</details>

<aside class="note" data-label="Integral first">Textbooks often present (3.3) as the conservation law and (3.1) as a consequence. Numerically it is better to think the other way round. The integral form is what nature enforces, and it survives discontinuities; the differential form is a convenient consequence for smooth flows. Finite-volume methods discretise (3.1) directly.</aside>

<h2 id="mass">Mass: the continuity equation</h2>

<p>Mass is the simplest account. The amount per unit volume is the density $\rho$. Mass crosses a surface only by being carried, so its flux is $\rho\mathbf{u}$. No ordinary flow makes or destroys mass. Equation (3.1) becomes</p>

<div class="eq" id="eq-mass-integral">$$\frac{\mathrm{d}}{\mathrm{d}t}\int_V \rho\,\mathrm{d}V + \oint_S \rho\,\mathbf{u}\cdot\mathbf{n}\,\mathrm{d}S = 0 ,$$<span class="eq-tag">(3.5)</span></div>

<p>and its local form (3.3) is the <dfn data-term="continuity-equation">continuity equation</dfn>:</p>

<div class="eq" id="eq-continuity">$$\frac{\partial \rho}{\partial t} + \nabla\cdot(\rho\,\mathbf{u}) = 0 .$$<span class="eq-tag">(3.6)</span></div>

<p>Expand the divergence by the product rule, $\nabla\cdot(\rho\mathbf{u}) = \mathbf{u}\cdot\nabla\rho + \rho\,\nabla\cdot\mathbf{u}$, and collect the first two terms into the material derivative:</p>

<div class="eq" id="eq-continuity-material">$$\frac{\mathrm{D}\rho}{\mathrm{D}t} + \rho\,\nabla\cdot\mathbf{u} = 0 .$$<span class="eq-tag">(3.7)</span></div>

<p>The two forms say the same thing from two viewpoints. Equation (3.6) watches a fixed point: density there rises when more mass flows in than out. Equation (3.7) follows a parcel: its density rises exactly as fast as its volume shrinks, because $\nabla\cdot\mathbf{u}$ is the rate at which a parcel's volume grows, per unit volume. The parcel's mass never changes.</p>

<p>A flow is <dfn data-term="incompressible">incompressible</dfn> when every parcel keeps its density as it moves, $\mathrm{D}\rho/\mathrm{D}t = 0$. Then (3.7) leaves</p>

<div class="eq" id="eq-incompressible">$$\nabla\cdot\mathbf{u} = 0 .$$<span class="eq-tag">(3.8)</span></div>

<p>Read this condition carefully. It does <em>not</em> say the density is the same everywhere. The ocean is saltier and colder at depth, so its density varies by a few parts in a thousand, yet each parcel keeps its own density as it moves, and the flow is incompressible to high accuracy. Nor does it say that liquids cannot be compressed. It says that the pressure changes in this flow are too small to squeeze the parcels noticeably. For a gas this means the flow speed is small compared with the speed of sound. Density changes then scale roughly as the square of the <a href="#/similarity/numbers">Mach number</a>, which is why air at road speeds behaves as an incompressible fluid.</p>

<p>Look again at the box figure. Away from the source core, every flow there satisfies (3.8), and every box shows zero net outflow. The cored source is the exception you can build in a computer but not in an incompressible fluid: a region where volume appears out of nowhere. In practice it stands for the end of a pipe that injects fluid, seen from far away.</p>

<div data-quiz="q2"></div>

<aside class="history" data-era="1752">The continuity condition came before the general equations of motion. Euler derived the condition for an incompressible fluid in a memoir read on 31 August 1752 but printed only in 1761. d'Alembert had stated the incompressibility condition in his <em>Essai d'une nouvelle théorie de la résistance des fluides</em>, published in Paris the same year. Euler's general continuity equation for a compressible fluid is in his memoir "Principes généraux du mouvement des fluides", presented in 1755 and printed in 1757 (Darrigol and Frisch 2008).</aside>

<aside class="note" data-label="Why it matters numerically">In an incompressible solver, (3.8) is not an equation for $\rho$ at all. It is a constraint the velocity must satisfy at every instant, and enforcing it is the job of the pressure. That idea, and the cost of enforcing it, take up <a href="#/pressure/constraint">chapter 10</a>.</aside>

<h2 id="momentum">Momentum: forces on a box</h2>

<p>For momentum the quantity per unit volume is $\rho\mathbf{u}$, a vector, and it is carried with flux $\rho\mathbf{u}(\mathbf{u}\cdot\mathbf{n})$ through a face. Unlike mass, momentum has sources: forces. Newton's second law, applied to a material volume and translated by (3.4), says that the momentum in a fixed box changes because momentum is carried through its walls and because forces act on what is inside.</p>

<p>Forces on a piece of fluid come in two kinds. <em>Body forces</em> act on every bit of mass at a distance: gravity, or the apparent forces in a rotating frame. They add up to $\int_V \rho\,\mathbf{f}\,\mathrm{d}V$, with $\mathbf{f}$ the force per unit mass. <em>Surface forces</em> are exerted by the fluid outside the box on the fluid inside, through the walls. The force per unit area on a face is the <em>traction</em> $\mathbf{t}$. In a fluid at rest it is just the pressure, pushing straight in (<a href="#/continuum/pressure">chapter 0</a>). In a moving fluid it can also have a component along the face, a shear stress, and its size and direction depend on how the face is tilted.</p>

<p>Cauchy showed that this dependence is as simple as it could be. At each point there is a single matrix, the <dfn data-term="cauchy-stress">Cauchy stress tensor</dfn> $\boldsymbol{\sigma}$, which turns the normal of any face into the traction on it:</p>

<div class="eq" id="eq-cauchy">$$\mathbf{t}(\mathbf{n}) = \boldsymbol{\sigma}\,\mathbf{n}, \qquad t_i = \sigma_{ij}\,n_j .$$<span class="eq-tag">(3.9)</span></div>

<p>The entry $\sigma_{ij}$ is the $i$-component of force per unit area on a face whose normal points along $j$. The diagonal entries are normal stresses, the others shears. Balancing the turning moments on a small cube shows that $\boldsymbol{\sigma}$ is symmetric, so in three dimensions it has six independent entries, not nine.</p>

<details class="deeper"><summary>Go deeper: Cauchy's tetrahedron</summary>
<p>Take a tiny tetrahedron with three faces on the coordinate planes and a slanted fourth face of area $A$ with outward normal $\mathbf{n}$. The coordinate faces have areas $A n_1$, $A n_2$, $A n_3$ and outward normals $-\mathbf{e}_1$, $-\mathbf{e}_2$, $-\mathbf{e}_3$. If the tetrahedron has size $h$, the surface forces on it scale like $h^2$, while its mass times acceleration and the body force scale like $h^3$. Newton's law for the tetrahedron is</p>
<p>$$\mathbf{t}(\mathbf{n})\,A - \sum_{j} \mathbf{t}(\mathbf{e}_j)\,A n_j = \mathcal{O}(h^3) .$$</p>
<p>Divide by $A \sim h^2$ and let $h \to 0$. The surface forces must balance on their own: $\mathbf{t}(\mathbf{n}) = \sum_j \mathbf{t}(\mathbf{e}_j)\,n_j$. The traction on any face is a linear combination of the tractions on three coordinate faces, which is (3.9) with column $j$ of $\boldsymbol{\sigma}$ equal to $\mathbf{t}(\mathbf{e}_j)$. Cauchy used this argument in 1827 (Exercices de mathématiques, vol. 2).</p>
</details>

<p>Now the momentum books balance. The net surface force on a box is $\oint_S \boldsymbol{\sigma}\mathbf{n}\,\mathrm{d}S = \int_V \nabla\cdot\boldsymbol{\sigma}\,\mathrm{d}V$, by the divergence theorem applied to each row of $\boldsymbol{\sigma}$. Repeating the steps that led to (3.7) gives <strong>Cauchy's equation of motion</strong>, Newton's second law per unit volume of fluid:</p>

<div class="eq" id="eq-cauchy-momentum">$$\rho\,\frac{\mathrm{D}\mathbf{u}}{\mathrm{D}t} = \nabla\cdot\boldsymbol{\sigma} + \rho\,\mathbf{f} .$$<span class="eq-tag">(3.10)</span></div>

<p>Mass times acceleration on the left; net surface force and body force, per unit volume, on the right. Equation (3.10) holds for any continuum, fluid or solid. What makes a fluid a fluid is the rule that gives $\boldsymbol{\sigma}$.</p>

<details class="deeper"><summary>Go deeper: the conservation form of the momentum equation</summary>
<p>Written as a conservation law (3.3) for the momentum density $\rho\mathbf{u}$, with the continuity equation used to move $\rho$ inside the derivatives, (3.10) becomes</p>
<p>$$\frac{\partial (\rho\mathbf{u})}{\partial t} + \nabla\cdot\left(\rho\,\mathbf{u}\otimes\mathbf{u} - \boldsymbol{\sigma}\right) = \rho\,\mathbf{f} .$$</p>
<p>The momentum flux has two parts: momentum carried by the flow, $\rho\,\mathbf{u}\otimes\mathbf{u}$, and momentum handed across a surface by stress, $-\boldsymbol{\sigma}$. Compressible-flow codes discretise this form, together with (3.6) and an energy equation, because it keeps all three totals exact. The final section shows what goes wrong when you don't.</p>
</details>

<p>The simplest rule is the one for a fluid at rest, $\boldsymbol{\sigma} = -p\,\mathbf{I}$: the same pressure on every face, pushing inward. Assume that it also holds in motion, so that the fluid has no internal friction at all. Since $\nabla\cdot(-p\mathbf{I}) = -\nabla p$, (3.10) becomes the <dfn data-term="euler-equations">Euler equations</dfn>:</p>

<div class="eq" id="eq-euler">$$\rho\,\frac{\mathrm{D}\mathbf{u}}{\mathrm{D}t} = -\nabla p + \rho\,\mathbf{f} .$$<span class="eq-tag">(3.11)</span></div>

<aside class="who" data-person="leonhard-euler">Euler wrote the equations of motion of an ideal fluid, with continuity, in his 1755 memoir (printed 1757). He then said what was missing: "it is not the laws of Mechanics that we lack in order to pursue this research but only the Analysis, which has not yet been sufficiently developed for this purpose." Nearly three centuries later the analysis is still not finished, as the last section of this chapter explains.</aside>

<p>Count equations and unknowns. For an incompressible fluid of uniform density the unknowns are the three velocity components and the pressure. The equations are three momentum components and the constraint (3.8). Four and four, so the system is closed. For a compressible gas, the density is a fifth unknown and (3.6) a fifth equation. The pressure then comes from an equation of state, which brings in the temperature and an energy equation. In every case, (3.10) on its own is not enough. Something has to say how stress depends on the motion. That is a <em>constitutive law</em>, and it is a statement about the material, not a conservation law.</p>

<aside class="who" data-person="augustin-louis-cauchy">Cauchy announced the idea of stress in 1822 and gave the full treatment, with the tetrahedron argument, in 1827. He described how it came to him: "It came into my mind that these two kinds could be reduced to one, still called tension or pressure, of the same nature as the hydrodynamic pressure exerted by a fluid against the surface of a solid. Yet the new pressure should not be perpendicular upon the faces which undergo it, nor be the same in all directions at a given point."</aside>

<h2 id="navier-stokes">Viscosity and the Navier–Stokes equations</h2>

<p>Real fluids resist being sheared. A layer sliding over another drags it along, at a rate set by the viscosity (<a href="#/continuum/viscosity">chapter 0</a>). Friction depends on how fast neighbouring parcels move relative to each other. It does not depend on the velocity itself, because a uniform translation or rotation deforms nothing. The measure of deformation is the strain-rate tensor $\mathbf{S} = \tfrac{1}{2}(\nabla\mathbf{u} + \nabla\mathbf{u}^{\top})$ of <a href="#/viewpoints/deformation">chapter 2</a>.</p>

<p>A <em>Newtonian fluid</em> is one whose extra stress is proportional to $\mathbf{S}$. If the fluid has no preferred direction, the most general linear law has two constants:</p>

<div class="eq" id="eq-newtonian">$$\boldsymbol{\sigma} = -p\,\mathbf{I} + 2\mu\,\mathbf{S} + \lambda\,(\nabla\cdot\mathbf{u})\,\mathbf{I} .$$<span class="eq-tag">(3.12)</span></div>

<p>The shear viscosity $\mu$ is the one you measure by sliding plates. The second constant $\lambda$ acts only when parcels change volume. Stokes chose $\lambda = -\tfrac{2}{3}\mu$, so that the mean normal stress equals $-p$ even in a compressing flow. This choice, the <em>Stokes hypothesis</em>, says the bulk viscosity $\lambda + \tfrac{2}{3}\mu$ is zero. It is an assumption, accurate for monatomic gases and good enough for most others. For an incompressible flow the $\lambda$ term vanishes, so the question does not arise.</p>

<p>Put (3.12) into Cauchy's equation (3.10). With $\nabla\cdot\mathbf{u} = 0$ and constant $\mu$, the divergence of $2\mu\mathbf{S}$ is $\mu\nabla^2\mathbf{u} + \mu\nabla(\nabla\cdot\mathbf{u}) = \mu\nabla^2\mathbf{u}$. Divide by $\rho$ and write $\nu = \mu/\rho$ for the kinematic viscosity. The result is the incompressible <dfn data-term="navier-stokes">Navier–Stokes equations</dfn>:</p>

<div class="eq" id="eq-navier-stokes">$$\class{t1}{\frac{\partial \mathbf{u}}{\partial t}} + \class{t2}{(\mathbf{u}\cdot\nabla)\,\mathbf{u}} = \class{t3}{-\frac{1}{\rho}\nabla p} + \class{t4}{\nu\,\nabla^2\mathbf{u}} + \class{t5}{\mathbf{f}}, \qquad \nabla\cdot\mathbf{u} = 0 .$$<span class="eq-tag">(3.13)</span></div>

<p>Each term is a different physical effect, and much of this course is about how to compute each one. Read them in order, matching the colours in the figure below:</p>

<table>
<thead><tr><th>Term</th><th>What it is</th><th>What it does</th><th>Where the course computes it</th></tr></thead>
<tbody>
<tr><td>$\class{t1}{\partial\mathbf{u}/\partial t}$</td><td>local (unsteady) acceleration</td><td>the change at a fixed point</td><td>time stepping, <a href="#/stiffness/implicit">chapter 9</a></td></tr>
<tr><td>$\class{t2}{(\mathbf{u}\cdot\nabla)\mathbf{u}}$</td><td>convective acceleration</td><td>speeding up or turning as a parcel moves; the only nonlinear term</td><td>advection, <a href="#/advection/upwind">chapter 7</a>; shocks, <a href="#/shocks/burgers">chapter 8</a></td></tr>
<tr><td>$\class{t3}{-\nabla p/\rho}$</td><td>pressure gradient</td><td>pushes from high to low pressure; keeps $\nabla\cdot\mathbf{u} = 0$</td><td>projection, <a href="#/pressure/projection">chapter 10</a></td></tr>
<tr><td>$\class{t4}{\nu\nabla^2\mathbf{u}}$</td><td>viscous diffusion</td><td>smooths velocity differences</td><td>diffusion and stiffness, <a href="#/stiffness/heat">chapter 9</a></td></tr>
<tr><td>$\class{t5}{\mathbf{f}}$</td><td>body force per unit mass</td><td>gravity, buoyancy, stirring</td><td>forcing in <a href="#/stable-fluids/sandbox">chapter 12</a></td></tr>
</tbody>
</table>

<p>A solution of (3.13) is a velocity field for which these five terms balance at every point and every instant. A few flows are simple enough to write down exactly. In the figure, pick one and drag the probe. The bars show each term at the probe, the two sides of the equation and their difference.</p>

<figure data-widget="conservation-budget" data-preset="taylor-green" class="wide"><figcaption>The terms of (3.13), per unit mass, at the probe, for exact solutions of the Navier–Stokes equations. Velocities, their derivatives and the closed-form pressure come from the shared flow kernels; nothing here is simulated, so the residual is round-off and finite-difference truncation, about a millionth of the largest term or less.</figcaption></figure>

<div class="try"><ol>
<li>In the decaying cells (Taylor–Green), drag the probe around. The local term always matches the viscous term, and the convective term always matches the pressure term. The flow fades, and friction is what fades it.</li>
<li>Switch to the pressure-driven channel. Nothing accelerates; the pressure push is balanced by viscous drag at every height. Now try the gravity-driven channel: the same velocity, with the weight $\mathbf{f}$ doing the pressure's job.</li>
<li>Turn off the viscous term. The channel and the decaying cells go out of balance: they need viscosity. The potential flow past the cylinder and the solid-body rotation stay balanced. For them $\nabla^2\mathbf{u} = 0$, so they solve Euler's equations too.</li>
<li>In the spreading vortex (Lamb–Oseen), compare "along $u$" with "across $u$". Along the flow, the slowing is set by viscosity. Across it, the pressure gradient supplies the centripetal acceleration that bends parcels round in circles.</li>
<li>Raise $\nu$ in the channel. The viscous term grows, and the pressure gradient needed to drive the same flow grows with it.</li>
</ol></div>

<div data-quiz="q3"></div>

<p>One more ingredient completes the problem: what happens at a solid wall. Fluid cannot pass through a wall, so $\mathbf{u}\cdot\mathbf{n}$ equals the wall's normal velocity. The <em>no-slip condition</em> asks for more: the fluid touching the wall moves with it, tangential component included. It took decades to settle, and for liquids and gases at ordinary densities experiment now confirms it. It fails in rarefied gases, where the mean free path is not small compared with the flow (<a href="#/continuum/continuum">chapter 0</a>), and slip conditions return.</p>

<aside class="history" data-era="1822">Darrigol (2002) counts five separate derivations of these equations. Navier's came first, in a memoir read to the Paris Academy on 18 March 1822 and printed in 1827. He started from forces between molecules. Cauchy followed in 1823 and Poisson in 1829 (printed 1831). Saint-Venant presented a derivation in 1834 that needed no assumption about molecular forces, and printed a summary of it in 1843. Stokes's continuum derivation, read at Cambridge on 14 April 1845 and printed in 1847, is the one textbooks follow. The double name "Navier–Stokes" came much later, apparently in the twentieth century; who first used it is not known.</aside>

<aside class="who" data-person="claude-louis-navier">Navier was the first to write the viscous equations of motion. His constant $\varepsilon$ played the role of today's viscosity, and his wall condition let the fluid slip along a solid wall, with a resistance proportional to the slip.</aside>

<aside class="who" data-person="george-gabriel-stokes">Stokes derived the equations from the rate of deformation alone, introduced the notation $\mathrm{D}/\mathrm{D}t$, and tested the no-slip condition against pipe data. It failed for the large pipes he had measurements for: "I found that the formulae did not at all agree with experiment." Those flows were turbulent, which nobody could yet recognise. Poiseuille's capillary-tube data and Stokes's own pendulum experiments later supported no-slip.</aside>

<p>The Navier–Stokes equations pass every test we can set them for ordinary fluids, from blood in capillaries to air over wings. The difficulty is not whether they are right. It is how to solve them, and the rest of this course is about that.</p>

<h2 id="paradox">d'Alembert's paradox</h2>

<p>Before viscosity entered the equations, there was a scandal. Take the Euler equations, a steady uniform stream and a body in it, and suppose the flow is irrotational, as it is when it starts from rest. Then the force on the body along the stream, the drag, comes out exactly zero. Every swimmer, sailor and archer knew this was wrong.</p>

<p>The circular cylinder shows how it happens. The potential flow around it (chapter 2) has surface speed $2U\sin\theta$, where $\theta$ is measured from the rear. Bernoulli's equation turns speed into pressure, and the <em>pressure coefficient</em> $C_p = (p - p_\infty)/(\tfrac{1}{2}\rho U^2)$ on the surface is</p>

<div class="eq" id="eq-cp">$$C_p(\theta) = 1 - 4\sin^2\theta .$$<span class="eq-tag">(3.14)</span></div>

<p>It is $+1$ at the front and rear stagnation points, and $-3$ at the top and bottom, where the flow is fastest. The pattern is the same front and back. The front is pushed backwards exactly as hard as the rear is pushed forwards, so the net force along the stream is zero. The pattern is also the same top and bottom, so there is no lift either.</p>

<div data-quiz="q4"></div>

<figure data-widget="conservation-cylinder" data-preset="paradox" class="wide"><figcaption>Inviscid flow past a cylinder ($U = 1$, $R = 0.5$, $\rho = 1$). Left: shading shows $C_p$, lines are streamlines, and arrows show the pressure force on the surface, pushing in where $C_p$ is positive and pulling out where it is negative. Right: $C_p$ on the surface, with the zero-circulation curve (3.14) dashed. Drag and lift are integrated from the surface pressure and compared with the Kutta–Joukowski value.</figcaption></figure>

<div class="try"><ol>
<li>With no circulation, the arrows at the front and back match, and so do those at the top and bottom. The drag readout is zero to about $10^{-16}$.</li>
<li>Drag the circulation negative (clockwise). The flow over the top speeds up and the flow underneath slows down, so the suction on top wins: lift appears, equal to $-\rho U\Gamma$. The drag stays zero.</li>
<li>Watch the two stagnation points slide down the surface as $|\Gamma|$ grows. At $|\Gamma| = 4\pi R U \approx 6.28$ they meet at the bottom; beyond it, one stagnation point floats off the body and a ring of fluid circles the cylinder.</li>
<li>Compare the solid curve with the dashed one: circulation breaks the top–bottom symmetry but keeps the front–back symmetry. That is why lift appears and drag does not.</li>
</ol></div>

<p>The lift result is the <em>Kutta–Joukowski theorem</em>: in steady two-dimensional potential flow, a body with circulation $\Gamma$ (positive anticlockwise) feels a force $\rho U |\Gamma|$ per unit span, at right angles to the stream. Kutta worked out a special case in 1902 and Zhukovsky gave the general result in 1906. It is the basis of the theory of wings, and it has no drag in it: steady two-dimensional potential flow past a body never gives drag.</p>

<aside class="who" data-person="jean-le-rond-dalembert">d'Alembert announced the paradox in 1768, for bodies symmetric front to back: "Thus I do not see, I admit, how one can satisfactorily explain by theory the resistance of fluids. On the contrary, it seems to me that the theory, developed in all possible rigor, gives, at least in several cases, a strictly vanishing resistance; a singular paradox which I leave to future Geometers to elucidate."</aside>

<aside class="history" data-era="1768">The paradox is often dated to d'Alembert's 1752 <em>Essai</em> on fluid resistance, but the <em>Essai</em> does not state it. He announced it in volume 5 of his <em>Opuscules mathématiques</em> (1768) and returned to it in 1780 (Grimberg, Pauls and Frisch 2008). Borda had already derived zero drag in a memoir for the academy year 1766 (printed 1769), from the principle of "live forces" (conservation of energy), and concluded that the principle did not apply there. Saint-Venant gave the general statement in 1846–47 and blamed the neglect of viscosity.</aside>

<p>The paradox was resolved in 1904 by Prandtl. Viscosity is tiny in water and air, but it is not zero. At the wall, no-slip forces the fluid to rest, while a short distance away the inviscid solution is moving at speed $U$. Between them is a thin <dfn data-term="boundary-layer">boundary layer</dfn>, where the velocity changes so steeply that friction matters however small $\nu$ is. Balancing the convective term against the viscous term across the layer gives its thickness: $U/L \sim \nu/\delta^2$, so</p>

<div class="eq" id="eq-boundary-layer">$$\frac{\delta}{L} \sim \mathrm{Re}^{-1/2}, \qquad \mathrm{Re} = \frac{U L}{\nu} .$$<span class="eq-tag">(3.15)</span></div>

<p>For air at 10 m/s along a plate 1 m long, $\mathrm{Re} \approx 7\times 10^5$ and the estimate gives $\delta \approx 1$ mm; the full laminar calculation gives about 6 mm at the trailing edge. Either way the layer is thin. On the rear of a blunt body, the pressure rises again towards the rear stagnation point. The slow fluid in the layer cannot push against that rise for long, so it stops and the layer <em>separates</em> from the wall. Behind the body is a wide, low-pressure wake instead of the high pressure of (3.14). The front–back symmetry is broken, and the drag returns. Viscosity's direct effect, the friction in the layer, is small. Its indirect effect, rearranging the whole pressure field, is large.</p>

<aside class="who" data-person="ludwig-prandtl">Prandtl presented the idea at the International Congress of Mathematicians in Heidelberg in August 1904, in a paper of eight printed pages (1905). His working term was "Übergangsschicht", transition layer: "In der schmalen Übergangsschicht ergeben dann die schroffen Geschwindigkeitsunterschiede trotz der kleinen Reibungskonstanten merkliche Wirkungen." In plain translation: in the narrow transition layer the abrupt differences in velocity then produce noticeable effects, despite the small friction constant.</aside>

<aside class="pitfall">A numerical solution of the Euler equations for flow past a bluff body often <em>does</em> show a wake and drag. The equations have not changed. The scheme's numerical dissipation (<a href="#/advection/diffusion-dispersion">chapter 7</a>) acts as an uncontrolled viscosity that lets the flow separate. Such a drag depends on the grid and the scheme, not on the fluid, so treat it as an error, not a prediction.</aside>

<h2 id="finite-volume">Finite volumes: bookkeeping on a grid</h2>

<p>Return to the integral law (3.1), now in one dimension, and cut the line into cells of width $\Delta x$. Call the amount per unit length in cell $j$, averaged over the cell, $q_j$. A cell's contents change only through its two faces, at $x_{j-1/2}$ and $x_{j+1/2}$. If $F_{j+1/2}$ is the flux through the right face, integrated over one time step and divided by $\Delta t$, then (3.1) for this cell is exact:</p>

<div class="eq" id="eq-fv">$$q_j^{n+1} = q_j^{n} - \frac{\Delta t}{\Delta x}\left(F_{j+1/2} - F_{j-1/2}\right) .$$<span class="eq-tag">(3.16)</span></div>

<p>That is the <dfn data-term="finite-volume">finite-volume method</dfn>. The approximation comes only in choosing $F_{j+1/2}$ from the cell averages near the face: chapters 7 and 8 are about how to choose it. Whatever the choice, one rule makes the method conservative: <em>each face has one flux, used by both neighbours</em>. What cell $j$ sends through face $j+\tfrac{1}{2}$ is exactly what cell $j+1$ receives. Sum (3.16) over all cells and the inner fluxes cancel in pairs, just as the inner faces did in the divergence theorem:</p>

<div class="eq" id="eq-telescope">$$\sum_j q_j^{n+1}\,\Delta x = \sum_j q_j^{n}\,\Delta x - \Delta t\left(F_{\text{right end}} - F_{\text{left end}}\right) .$$<span class="eq-tag">(3.17)</span></div>

<p>The sum telescopes. Only the boundary fluxes can change the total. On a periodic domain nothing changes at all, apart from round-off, at any resolution and for any flux formula. An update written as (3.16) is said to be in <dfn data-term="conservation-form">conservation form</dfn>.</p>

<p>Now the trap. Take cars on a ring road, with density $q$ (cars per kilometre) and a speed limit $a(x)$ that drops through a zone of road works. The flux is $a q$ (cars per hour), and the number of cars obeys</p>
<p>$$\frac{\partial q}{\partial t} + \frac{\partial (a q)}{\partial x} = 0 .$$</p>
<p>For smooth $q$, the product rule gives an equivalent equation, $\partial_t q + a\,\partial_x q + a'\,q = 0$. Discretise that one with the same upwind difference and an exact $a'$:</p>

<div class="eq" id="eq-product">$$q_j^{n+1} = q_j^{n} - \Delta t\left(a_j\,\frac{q_j^{n} - q_{j-1}^{n}}{\Delta x} + a'_j\,q_j^{n}\right) .$$<span class="eq-tag">(3.18)</span></div>

<p>It looks just as good. It is consistent and first-order accurate, like the flux form. But it is not a flux difference. Cell $j$ reads it as taking in $a_j q_{j-1}\Delta t$ through its left face. Cell $j-1$, using its own speed $a_{j-1}$, believes it sent out $(a_{j-1} + a'_{j-1}\Delta x)\,q_{j-1}\Delta t$ through the same face. The two numbers differ by an amount of order $\Delta x^2\,a''$, and the difference is cars made or destroyed at that face. Nothing telescopes, and the total drifts.</p>

<div data-quiz="q5"></div>

<figure data-widget="conservation-telescoping" data-preset="leak" class="wide"><figcaption>The same traffic on the same ring road, computed two ways with first-order upwinding and the same time step. Top row: the flux form (3.16), with face flux $F_{j+1/2} = a(x_{j+1/2})\,q_j$. Bottom row: the product-rule form (3.18), or the advective form $q_t + a q_x = 0$. The dashed outline is the exact solution, from characteristics. The marks under the bottom row show cars made (up) or lost (down) at each face in the last step. The lower plot shows the relative change in each total on a log scale.</figcaption></figure>

<div class="try"><ol>
<li>Press Drive. The block of cars bunches up in the slow zone and spreads out again after it. In the top row the total stays fixed to about $10^{-16}$, the level of round-off. In the bottom row the marks show cars appearing at the faces where the speed limit bends, and the total climbs.</li>
<li>Tap a face in the slow zone, then press Step. The readouts show what the left cell sends and what the right cell receives through that face in the bottom row. They differ. In the top row they are the same number by construction.</li>
<li>Compare 50, 100 and 200 cells. The leak per pass roughly halves each time: it is a first-order error. The flux form stays at round-off throughout.</li>
<li>Choose the constant-speed road. Now $a' = 0$, and both updates are the same arithmetic, so both conserve.</li>
<li>Switch the bottom row to the advective form. It drops the $a'q$ term entirely and solves a different equation, one that carries values rather than amounts. Its total collapses while the cars are in the slow zone, because it never lets them bunch up.</li>
</ol></div>

<p>On this road, with 50 cells, the product-rule form gains about 27% of the cars in one pass round the ring; with 100 cells, about 12%; with 200, about 6%. It converges, slowly, to the right answer. The flux form is out by about $10^{-16}$ at every resolution. That does not make it accurate: its profile is visibly smeared, by the numerical diffusion of upwinding (<a href="#/advection/upwind">chapter 7</a>). Conservation and accuracy are separate properties. Conservation is the one you can have exactly, for free, by writing the update the right way.</p>

<details class="deeper"><summary>Go deeper: how fast the product rule leaks</summary>
<p>Sum (3.18) over a periodic grid. Summing by parts, $\sum_j a_j(q_j - q_{j-1}) = \sum_j q_j\,(a_j - a_{j+1})$, so the total $M = \sum_j q_j\Delta x$ changes by</p>
<p>$$\frac{M^{n+1} - M^{n}}{\Delta t} = \Delta x\sum_j q_j\left(\frac{a_{j+1} - a_j}{\Delta x} - a'_j\right) = \frac{\Delta x}{2}\sum_j q_j\,a''_j\,\Delta x + \mathcal{O}(\Delta x^2) .$$</p>
<p>The leak rate is about $\tfrac{1}{2}\Delta x\int q\,a''\,\mathrm{d}x$: first order in $\Delta x$, and largest where the speed limit bends sharply. In the flux form the same sum is exactly zero, because each $F_{j+1/2}$ appears once with each sign.</p>
</details>

<aside class="pitfall">A non-conservative update leaks mass in smooth flow, as here, and the leak shrinks as the grid is refined. At a shock it is worse. The jump conditions that fix a shock's speed come from the integral form (3.1) (<a href="#/shocks/rankine-hugoniot">chapter 8</a>). A scheme that does not conserve can converge, as the grid is refined, to a shock that moves at the wrong speed (Hou and LeFloch 1994). Lax and Wendroff proved the converse in 1960: if a consistent scheme in conservation form converges, it converges to a weak solution of the conservation law, so its shocks satisfy the jump conditions. See <a href="#/pathologies">the gallery</a>.</aside>

<p>In two and three dimensions the idea is the same. The cells are boxes, or any polyhedra, and each face carries one flux, shared by the two cells it separates. The divergence theorem (3.2) is then exact cell by cell, and the totals of mass, momentum and energy are conserved to round-off. This is why finite volumes underlie most general-purpose engineering CFD codes (Versteeg and Malalasekera 2007), and why the projection methods of <a href="#/pressure/mac">chapter 10</a> place velocities on cell faces.</p>

<h2 id="millennium">An open question</h2>

<p>For all their success, the Navier–Stokes equations hold a famous unsolved problem. In 2000 the Clay Mathematics Institute listed it among seven Millennium Prize Problems, announced on 24 May 2000 at the Collège de France in Paris, each with a prize of one million US dollars. The official description, by Charles Fefferman, asks for a proof of one of two things for incompressible flow in all of three-dimensional space, or in a periodic box, with no forcing. Either every smooth initial velocity field with finite energy has a smooth solution for all time, or some such field leads to a solution that breaks down in finite time. In two dimensions the answer has long been known: solutions stay smooth (Ladyzhenskaya proved this for bounded domains in 1958–59). In three dimensions smoothness is known only for small initial data or for a short time. Leray showed in 1934 that weak solutions, which need not be smooth, exist for all time. Whether they are smooth, or even unique, is open. Fefferman also warns against settling the question by computer: "Many numerical computations appear to exhibit blowup for solutions of the Euler equations, but the extreme numerical instability of the equations makes it very hard to draw reliable conclusions."</p>

<p>The prize is not about solving the equations numerically, and it is not about explaining turbulence. It asks whether the equations themselves always have well-behaved solutions. Progress continues around its edges. Buckmaster and Vicol (2019) showed that some weak solutions are not unique. Theirs are not Leray's weak solutions and they are far from smooth, so the Clay problem stands; as they write, "the question of uniqueness of Leray-Hopf weak solutions for the 3D Navier-Stokes equations remains however open." Engineers do not wait for the answer. They trust the equations because computed solutions, checked as described in <a href="#/trust/validation">chapter 16</a>, agree with experiment.</p>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>G. K. Batchelor (1967). <em>An Introduction to Fluid Dynamics</em>. Cambridge University Press. Chapter 1 and §§2.2, 3.1–3.3: the divergence and transport theorems, stress, and the Newtonian fluid.</li>
<li>P. K. Kundu, I. M. Cohen and D. R. Dowling (2016). <em>Fluid Mechanics</em>, 6th ed. Academic Press. Chapter 4: conservation laws.</li>
<li>J. D. Anderson (2017). <em>Fundamentals of Aerodynamics</em>, 6th ed. McGraw-Hill. §§3.13–3.16: the cylinder, the Kutta–Joukowski theorem and d'Alembert's paradox.</li>
<li>R. J. LeVeque (2002). <em>Finite Volume Methods for Hyperbolic Problems</em>. Cambridge University Press. Chapters 2, 4, 9 and 12: conservation form, variable-coefficient advection and non-conservative schemes.</li>
<li>H. K. Versteeg and W. Malalasekera (2007). <em>An Introduction to Computational Fluid Dynamics: The Finite Volume Method</em>, 2nd ed. Pearson.</li>
<li>P. Lax and B. Wendroff (1960). Systems of conservation laws. <em>Communications on Pure and Applied Mathematics</em> 13, 217–237.</li>
<li>T. Y. Hou and P. G. LeFloch (1994). Why nonconservative schemes converge to wrong solutions: error analysis. <em>Mathematics of Computation</em> 62, 497–530.</li>
<li>L. Euler (1757). Principes généraux du mouvement des fluides (E226). <em>Mémoires de l'Académie des Sciences de Berlin</em> 11, 274–315. English translation by T. E. Burton, adapted by U. Frisch: arXiv:0802.2383.</li>
<li>O. Darrigol and U. Frisch (2008). From Newton's mechanics to Euler's equations. <em>Physica D</em> 237, 1855–1869.</li>
<li>G. Grimberg, W. Pauls and U. Frisch (2008). Genesis of d'Alembert's paradox and analytical elaboration of the drag problem. <em>Physica D</em> 237, 1878–1886.</li>
<li>O. Darrigol (2002). Between hydrodynamics and elasticity theory: the first five births of the Navier–Stokes equation. <em>Archive for History of Exact Sciences</em> 56, 95–150.</li>
<li>O. Darrigol (2005). <em>Worlds of Flow: A History of Hydrodynamics from the Bernoullis to Prandtl</em>. Oxford University Press.</li>
<li>C.-L. Navier (1827). Mémoire sur les lois du mouvement des fluides. <em>Mémoires de l'Académie Royale des Sciences de l'Institut de France</em> 6, 389–440 (read 18 March 1822).</li>
<li>A.-L. Cauchy (1827). De la pression ou tension dans un corps solide. <em>Exercices de mathématiques</em> 2, 42–56.</li>
<li>G. G. Stokes (1847). On the theories of the internal friction of fluids in motion, and of the equilibrium and motion of elastic solids. <em>Transactions of the Cambridge Philosophical Society</em> 8, 287–319 (read 14 April 1845). Reprinted in <em>Mathematical and Physical Papers</em>, vol. 1 (1880).</li>
<li>L. Prandtl (1905). Über Flüssigkeitsbewegung bei sehr kleiner Reibung. <em>Verhandlungen des III. Internationalen Mathematiker-Kongresses, Heidelberg 1904</em>, Teubner, Leipzig, 484–491.</li>
<li>G. I. Taylor and A. E. Green (1937). Mechanism of the production of small eddies from large ones. <em>Proceedings of the Royal Society of London A</em> 158, 499–521.</li>
<li>C. L. Fefferman (2000). Existence and smoothness of the Navier–Stokes equation. Official problem description, Clay Mathematics Institute.</li>
<li>J. Leray (1934). Sur le mouvement d'un liquide visqueux emplissant l'espace. <em>Acta Mathematica</em> 63, 193–248.</li>
<li>O. A. Ladyzhenskaya (1959). Solution "in the large" of the nonstationary boundary value problem for the Navier–Stokes system with two space variables. <em>Communications on Pure and Applied Mathematics</em> 12, 427–433.</li>
<li>T. Buckmaster and V. Vicol (2019). Nonuniqueness of weak solutions to the Navier–Stokes equation. <em>Annals of Mathematics</em> 189, 101–144.</li>
</ol>
`,
  widgets: {
    'conservation-box': mountConservationBox,
    'conservation-budget': mountConservationBudget,
    'conservation-cylinder': mountConservationCylinder,
    'conservation-telescoping': mountConservationTelescoping,
  },
  quizzes: {
    q1: {
      type: 'predict',
      q: 'The source in the figure below makes fluid at a volume rate $m = 2\\pi$ per unit depth, spread evenly over its small core. You place the box so that its left edge runs through the centre of the core and the rest of the core is inside. What will the net outflow read?',
      choices: [
        'Zero: whatever flows in through one face flows out through another.',
        'About $m/2 = 3.14$: the box holds half the core, so half of what is made there leaves through its faces.',
        'The full $m = 6.28$: a box that touches the source collects all of it.',
        'It depends on the size of the box: a bigger box catches more of the outflow.',
      ],
      answer: 1,
      explain: 'By the divergence theorem the net outflow equals the integral of $\\nabla\\cdot\\mathbf{u}$ over the box, which is $m$ times the fraction of the core inside: one half. Fluid made in the other half of the core enters through the left face and leaves again, so it adds nothing. The size of the box does not matter once it holds that half of the core; only what is made inside counts.',
    },
    q2: {
      type: 'mcq',
      q: 'A flow is incompressible, $\\nabla\\cdot\\mathbf{u} = 0$. Which statement must be true?',
      choices: [
        'The density is the same everywhere in the fluid.',
        'Every fluid parcel keeps its volume, and so its density, as it moves.',
        'The fluid moves with the same speed everywhere.',
        'The pressure is the same everywhere.',
      ],
      answer: 1,
      explain: 'By (3.7), $\\nabla\\cdot\\mathbf{u}$ is the rate at which a parcel’s volume grows. Zero divergence means no parcel changes its volume or its density, $\\mathrm{D}\\rho/\\mathrm{D}t = 0$. Different parcels can still have different densities: the ocean is incompressible to high accuracy, yet its density varies with salt and temperature. Speed and pressure can vary freely; in fact pressure differences are what keep the flow divergence-free.',
    },
    q3: {
      type: 'mcq',
      q: 'Which term makes the incompressible Navier–Stokes equations (3.13) nonlinear?',
      choices: [
        'The unsteady term $\\partial\\mathbf{u}/\\partial t$.',
        'The convective term $(\\mathbf{u}\\cdot\\nabla)\\mathbf{u}$.',
        'The pressure term $-\\nabla p/\\rho$.',
        'The viscous term $\\nu\\nabla^2\\mathbf{u}$.',
      ],
      answer: 1,
      explain: 'The convective term multiplies the velocity by its own gradient: double $\\mathbf{u}$ and it quadruples. That self-interaction is behind turbulence, and behind shocks in compressible flow. The pressure term looks linear, but in incompressible flow the pressure is fixed by the velocity through a Poisson equation whose source is quadratic in $\\mathbf{u}$ (chapter 10). The viscous term is linear: it is a diffusion operator.',
    },
    q4: {
      type: 'predict',
      q: 'Before you move the slider: give the cylinder some circulation, as if it were spinning. In this inviscid flow, what happens to the force on it?',
      choices: [
        'Lift appears, and drag appears with it, as for a spinning ball in air.',
        'Lift appears, at right angles to the stream; the drag stays exactly zero.',
        'Nothing: potential flow gives zero force of every kind.',
        'Drag appears, because the spinning surface rubs on the fluid; there is no lift.',
      ],
      answer: 1,
      explain: 'Circulation speeds up the flow on one side and slows it on the other, so the pressure is no longer symmetric top to bottom: lift $-\\rho U\\Gamma$ per unit span, the Kutta–Joukowski theorem. It is still symmetric front to back, so the drag remains zero. There is no rubbing in an inviscid fluid. A real spinning ball has drag because of its boundary layer and wake, which potential flow leaves out.',
    },
    q5: {
      type: 'predict',
      q: 'With 50 cells on the road with the slow zone, the product-rule form gains about 27% of the cars in one pass round the ring. Predict what happens with 100 cells.',
      choices: [
        'Still about 27%: the error is in the formula, so refining cannot help.',
        'About half as much, near 12%: the leak at each face shrinks with $\\Delta x$, so it is a first-order error.',
        'About a quarter, near 7%: upwinding is second order.',
        'It vanishes: any refinement fixes a leak like this.',
      ],
      answer: 1,
      explain: 'The measured leak is 26.6% with 50 cells, 12.2% with 100 and 5.9% with 200. The leak rate is about $\\tfrac{1}{2}\\Delta x\\int q\\,a^{\\prime\\prime}\\,\\mathrm{d}x$, first order in $\\Delta x$. So the product-rule form does converge for smooth flow, slowly. The flux form is exact to round-off at every resolution, because each face has one flux. At a shock the difference is sharper: a non-conservative scheme can converge to a shock at the wrong speed.',
    },
  },
  glossary: {
    'control-volume': {
      term: 'Control volume',
      def: 'A region of space, usually fixed, used to keep the books of a conserved quantity: the amount inside changes only by fluxes through its surface and sources within.',
      section: 'control-volumes',
    },
    flux: {
      term: 'Flux',
      def: 'The amount of a quantity crossing a surface per unit area per unit time, $\\mathbf{F}\\cdot\\mathbf{n}$. For a quantity carried by the flow it includes $\\phi\\,\\mathbf{u}$; heat conduction and viscous stress add parts that need no fluid to cross.',
      section: 'control-volumes',
    },
    'continuity-equation': {
      term: 'Continuity equation',
      def: 'Conservation of mass in local form: $\\partial\\rho/\\partial t + \\nabla\\cdot(\\rho\\mathbf{u}) = 0$, or $\\mathrm{D}\\rho/\\mathrm{D}t + \\rho\\nabla\\cdot\\mathbf{u} = 0$ following a parcel.',
      section: 'mass',
    },
    incompressible: {
      term: 'Incompressible flow',
      def: 'A flow in which every parcel keeps its density, $\\mathrm{D}\\rho/\\mathrm{D}t = 0$, so that $\\nabla\\cdot\\mathbf{u} = 0$. The density may still differ from parcel to parcel. A good model for liquids and for gases at low Mach number.',
      section: 'mass',
    },
    'cauchy-stress': {
      term: 'Cauchy stress tensor',
      def: 'The symmetric tensor $\\boldsymbol{\\sigma}$ that gives the force per unit area on any surface through a point from its unit normal: $\\mathbf{t} = \\boldsymbol{\\sigma}\\mathbf{n}$. For a fluid at rest, $\\boldsymbol{\\sigma} = -p\\mathbf{I}$.',
      section: 'momentum',
    },
    'euler-equations': {
      term: 'Euler equations',
      def: 'The equations of motion of an inviscid fluid, $\\rho\\,\\mathrm{D}\\mathbf{u}/\\mathrm{D}t = -\\nabla p + \\rho\\mathbf{f}$, with conservation of mass (and of energy for a compressible gas).',
      section: 'momentum',
    },
    'navier-stokes': {
      term: 'Navier–Stokes equations',
      def: 'Momentum conservation for a Newtonian fluid. For incompressible flow with constant viscosity: $\\partial_t\\mathbf{u} + (\\mathbf{u}\\cdot\\nabla)\\mathbf{u} = -\\nabla p/\\rho + \\nu\\nabla^2\\mathbf{u} + \\mathbf{f}$, with $\\nabla\\cdot\\mathbf{u} = 0$.',
      section: 'navier-stokes',
    },
    'dalembert-paradox': {
      term: 'd’Alembert’s paradox',
      def: 'In steady, irrotational, inviscid flow a body in a uniform stream feels no drag. Announced by d’Alembert in 1768; resolved by Prandtl’s boundary layer (1904), whose separation produces a wake.',
      section: 'paradox',
    },
    'boundary-layer': {
      term: 'Boundary layer',
      def: 'The thin layer next to a wall where viscosity brings the flow to rest (no slip). Its thickness scales as $\\delta \\sim L\\,\\mathrm{Re}^{-1/2}$. When it separates it changes the pressure on the whole body.',
      section: 'paradox',
    },
    'conservation-form': {
      term: 'Conservation form',
      def: 'A discretisation written as a difference of face fluxes, $q_j^{n+1} = q_j^n - \\frac{\\Delta t}{\\Delta x}(F_{j+1/2} - F_{j-1/2})$, with each face flux shared by its two cells. The total then changes only through the boundary.',
      section: 'finite-volume',
    },
    'finite-volume': {
      term: 'Finite-volume method',
      def: 'A discretisation that stores cell averages and updates each cell by the fluxes through its faces: the integral conservation law applied cell by cell. Conservative by construction when each face has a single flux.',
      section: 'finite-volume',
    },
  },
  pathologies: [
    {
      id: 'nonconservative-leak',
      name: 'Non-conservative leak',
      family: 'conservation',
      symptom: 'What you see: the total mass (or number of cars, or energy) drifts steadily although nothing enters or leaves the domain. In flows with shocks, the shocks travel at the wrong speed.',
      cause: 'Why: the update discretises an expanded, non-conservative form such as $a q_x + a^{\\prime} q$ instead of $(aq)_x$. The two cells that share a face each compute their own estimate of what crossed it, the estimates differ, and the difference is mass made or destroyed at that face.',
      diagnose: 'How to tell: sum $q_j\\Delta x$ every step. A flux-form update changes the total only by boundary fluxes and round-off (about $10^{-16}$ relative). A drift that halves when you halve $\\Delta x$ is a first-order leak. With shocks, compare the shock speed with the Rankine–Hugoniot value.',
      mitigations: [
        'Write the update in flux form, $q_j^{n+1} = q_j^n - \\frac{\\Delta t}{\\Delta x}(F_{j+1/2} - F_{j-1/2})$, with one flux per face shared by both neighbours. This costs nothing and is what finite-volume codes do.',
        'Discretise the conservation form of the PDE, not an expanded one. For gas dynamics, update the conserved variables (density, momentum, energy); primitive variables are fine for reconstruction but not for the update.',
        'Where a non-conservative system cannot be avoided (some multiphase and shallow-water models), use path-conservative schemes and test the shock speeds they give against known solutions.',
        'As a last resort, monitor the total and correct it each step. A global rescaling restores the total but can put mass in the wrong place.',
      ],
      section: 'finite-volume',
      demo: { widget: 'conservation-telescoping', data: { preset: 'leak' } },
    },
  ],
};
