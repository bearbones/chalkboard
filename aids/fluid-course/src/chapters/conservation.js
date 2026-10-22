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
  minutes: 45,
  html: String.raw`
<p class="lead-in">Every conservation law in this course is an accounting balance. Given a fixed region in a fluid and a quantity inside it—mass, momentum, or energy—the total inside can change for only two reasons: either the quantity crosses the boundary of the region, or a source inside creates or destroys it. Applying the balance to mass gives the continuity equation; applying it to momentum, with a constitutive law for the forces, gives the Navier–Stokes equations; applying it to a row of grid cells gives the finite-volume method, which is how most fluid solvers discretise conservation laws.</p>

<p>This chapter builds the equations from that one idea. It leans on the material derivative from <a href="#/viewpoints/material-derivative">Two ways of watching a flow</a> and uses vector notation ($\nabla$, $\nabla\cdot$) freely; the story of where that notation came from is told in <a href="#/notation/vectors">How the equations got their shape</a>. On the way you will meet an old embarrassment of the theory, d'Alembert's paradox, and see why the way you write a conservation law on a computer matters as much as the law itself.</p>

<h2 id="control-volumes">Boxes, faces and fluxes</h2>

<p>Pick a region of space and keep it fixed while the fluid streams through it. Engineers call it a <dfn data-term="control-volume">control volume</dfn>. Its boundary is the <em>control surface</em>, and at each point of that surface $\mathbf{n}$ is the unit normal pointing out of the region.</p>

<p>Let $\phi$ be the amount of some quantity per unit volume, such as the density $\rho$ for mass or $\rho\mathbf{u}$ for momentum. The <dfn data-term="flux">flux</dfn> $\mathbf{F}$ measures how much of that quantity crosses a surface per unit area and per unit time. Because fluid moving at velocity $\mathbf{u}$ carries its contents with it, every flux includes an advective part $\phi\,\mathbf{u}$, alongside any non-advective transport such as heat conduction or viscous stress. Across a surface element $\mathrm{d}S$ with outward unit normal $\mathbf{n}$, only the normal component contributes, so $\mathbf{F}\cdot\mathbf{n}\,\mathrm{d}S$ is the rate at which the quantity leaves through $\mathrm{d}S$ (or enters, when $\mathbf{F}\cdot\mathbf{n} &lt; 0$).</p>

<p>With a source $s$ (amount made per unit volume per unit time), the books for a fixed volume $V$ read</p>

<div class="eq" id="eq-balance">$$\frac{\mathrm{d}}{\mathrm{d}t}\int_V \phi\,\mathrm{d}V \;=\; -\oint_S \mathbf{F}\cdot\mathbf{n}\,\mathrm{d}S \;+\; \int_V s\,\mathrm{d}V .$$<span class="eq-tag">(3.1)</span></div>

<p>Equation (3.1) states that the rate of change of the total inside $V$ equals the net inflow across the boundary $S$ plus the net production within $V$. Because this <em>integral form</em> requires no derivatives of $\phi$ or $\mathbf{F}$, it remains valid across discontinuities such as shock waves, as used in <a href="#/shocks/rankine-hugoniot">the chapter on shocks</a>.</p>

<p>To turn (3.1) into a differential equation we need one theorem. The <strong>divergence theorem</strong> (Gauss's theorem) says that the total outflow through a closed surface equals the integral of the <dfn data-term="divergence">divergence</dfn> over the volume inside:</p>

<div class="eq" id="eq-divergence-theorem">$$\oint_S \mathbf{F}\cdot\mathbf{n}\,\mathrm{d}S \;=\; \int_V \nabla\cdot\mathbf{F}\,\mathrm{d}V .$$<span class="eq-tag">(3.2)</span></div>

<p>To see why (3.2) holds, partition the volume into many small boxes. For each small box, the net outflow across its faces is approximately $\nabla\cdot\mathbf{F}$ times its volume (<a href="#/viewpoints/deformation">the previous chapter</a>). When the outflows of all the small boxes are summed, every interior face is shared by two adjacent boxes with opposite outward normals, so the flux leaving one box equals the flux entering its neighbour and all interior faces cancel in pairs, leaving only the integral over the outer boundary $S$. The finite-volume method at the end of this chapter relies on the same pairwise cancellation on a discrete grid.</p>

<p>Substituting (3.2) into (3.1) and moving the time derivative inside the integral over the fixed volume $V$ gives an integral identity that holds for every control volume, however small. Wherever the integrand is continuous, it must vanish pointwise:</p>

<div class="eq" id="eq-local">$$\frac{\partial \phi}{\partial t} + \nabla\cdot\mathbf{F} = s .$$<span class="eq-tag">(3.3)</span></div>

<p>This is the <em>local</em> or <em>differential</em> form of a conservation law. It holds wherever the fields are smooth enough to differentiate.</p>

<p>Test this before you trust it. In the figure below, an exact flow (a source, a vortex, the flow past a cylinder and others) streams through a square box that you can drag. The arrows on the faces show the flux $\mathbf{u}\cdot\mathbf{n}$ of volume: inflow in one colour, pointing in; outflow in another, pointing out. The readouts give the flow through each face, their sum, and the other side of (3.2), the volume integral of $\nabla\cdot\mathbf{u}$.</p>

<div data-quiz="q1"></div>

<figure data-widget="conservation-box" data-preset="source" class="wide"><figcaption>A fixed control volume in a 2-D flow. The face fluxes are integrated by Gauss–Legendre quadrature on the exact velocity field; the source term is computed independently from the source's known strength. The divergence theorem says the two must agree, and the last readout shows that they do.</figcaption></figure>

<div class="try"><ol>
<li>Start with the box away from the source. Fluid enters on the side nearer the source and leaves on the far side, and the net outflow is zero. Move the box around and verify that the net outflow stays zero.</li>
<li>Drag the box over the dashed circle, the core where fluid is made. The net outflow jumps to $m = 2\pi$, and it stays there whether the box is small or large, as long as it holds the whole core.</li>
<li>Put the left edge of the box through the centre of the core. The box now holds half the core, and half of $m$ leaves through its faces.</li>
<li>Switch to the vortex, the stagnation point and the cylinder. Plenty of fluid crosses each face, yet every net outflow is zero because these flows are divergence-free.</li>
<li>Try the double gyre, and press Play if the figure is paused. The face fluxes change from moment to moment; the net stays zero at every instant.</li>
</ol></div>

<p>Instead of a fixed control volume, we can follow a <em>material volume</em> $V(t)$ that moves and deforms with the local fluid velocity so that no fluid crosses its boundary. Because Newton's laws of mechanics apply directly to a fixed body of matter (a material volume) rather than an Eulerian box, converting between the two requires the <strong>Reynolds transport theorem</strong>. For a material volume $V(t)$ that coincides with the fixed volume $V$ at time $t$,</p>

<div class="eq" id="eq-transport">$$\frac{\mathrm{d}}{\mathrm{d}t}\int_{V(t)} \phi\,\mathrm{d}V \;=\; \int_V \frac{\partial \phi}{\partial t}\,\mathrm{d}V \;+\; \oint_S \phi\,\mathbf{u}\cdot\mathbf{n}\,\mathrm{d}S .$$<span class="eq-tag">(3.4)</span></div>

<p>The change in what a moving blob of fluid contains is the change inside the fixed box it occupies, plus what it carries out through the walls as it moves.</p>

<details class="deeper"><summary>Go deeper: the transport theorem from a moving boundary</summary>
<p>Over a short time $\delta t$, each patch $\mathrm{d}S$ of the material surface moves a distance $\mathbf{u}\,\delta t$. It sweeps out a thin slab of volume $(\mathbf{u}\cdot\mathbf{n})\,\delta t\,\mathrm{d}S$, positive where the surface moves outward. The material volume at $t + \delta t$ is the old region plus these slabs, so</p>
<p>$$\int_{V(t+\delta t)} \phi(t+\delta t)\,\mathrm{d}V - \int_{V(t)} \phi(t)\,\mathrm{d}V \approx \delta t\int_V \frac{\partial \phi}{\partial t}\,\mathrm{d}V + \delta t\oint_S \phi\,\mathbf{u}\cdot\mathbf{n}\,\mathrm{d}S .$$</p>
<p>Divide by $\delta t$ and let it go to zero. Using (3.2) on the surface term gives the local version, $\int_V \left(\partial_t\phi + \nabla\cdot(\phi\mathbf{u})\right)\mathrm{d}V$. With $\partial_t\phi + \nabla\cdot(\phi\mathbf{u}) = \mathrm{D}\phi/\mathrm{D}t + \phi\,\nabla\cdot\mathbf{u}$ this connects the box picture to the parcel picture of <a href="#/viewpoints/material-derivative">the previous chapter</a>.</p>
</details>

<aside class="note" data-label="Integral first">Textbooks often present (3.3) as the conservation law and (3.1) as a consequence. Numerically it is better to think the other way round. The integral form is what nature enforces, and it survives discontinuities; the differential form is a convenient consequence for smooth flows. Finite-volume methods discretise (3.1) directly.</aside>

<h2 id="mass">Mass: the continuity equation</h2>

<p>Mass is the simplest account. The amount per unit volume is the density $\rho$. Mass crosses a surface only by being carried, so its flux is $\rho\mathbf{u}$. No ordinary flow makes or destroys mass. Equation (3.1) becomes</p>

<div class="eq" id="eq-mass-integral">$$\frac{\mathrm{d}}{\mathrm{d}t}\int_V \rho\,\mathrm{d}V + \oint_S \rho\,\mathbf{u}\cdot\mathbf{n}\,\mathrm{d}S = 0 ,$$<span class="eq-tag">(3.5)</span></div>

<p>and its local form (3.3) is the <dfn data-term="continuity-equation">continuity equation</dfn>:</p>

<div class="eq" id="eq-continuity">$$\frac{\partial \rho}{\partial t} + \nabla\cdot(\rho\,\mathbf{u}) = 0 .$$<span class="eq-tag">(3.6)</span></div>

<p>Expand the divergence by the product rule, $\nabla\cdot(\rho\mathbf{u}) = \mathbf{u}\cdot\nabla\rho + \rho\,\nabla\cdot\mathbf{u}$, and collect the first two terms into the <dfn data-term="material-derivative">material derivative</dfn>:</p>

<div class="eq" id="eq-continuity-material">$$\frac{\mathrm{D}\rho}{\mathrm{D}t} + \rho\,\nabla\cdot\mathbf{u} = 0 .$$<span class="eq-tag">(3.7)</span></div>

<p>The two forms say the same thing from two viewpoints. Equation (3.6) watches a fixed point: density there rises when more mass flows in than out. Equation (3.7) follows a parcel: its density rises exactly as fast as its volume shrinks, because $\nabla\cdot\mathbf{u}$ is the rate at which a parcel's volume grows, per unit volume. The parcel's mass never changes.</p>

<p>A flow is <dfn data-term="incompressible">incompressible</dfn> when every parcel keeps its density as it moves, $\mathrm{D}\rho/\mathrm{D}t = 0$. Then (3.7) leaves</p>

<div class="eq" id="eq-incompressible">$$\nabla\cdot\mathbf{u} = 0 .$$<span class="eq-tag">(3.8)</span></div>

<p>Condition (3.8) is a statement about the flow rather than the fluid alone: it holds whenever the pressure variations in the flow are too small to compress individual parcels noticeably, which for a gas means that the flow speed is small compared with the speed of sound (density variations scale as the square of the <a href="#/similarity/numbers">Mach number</a>, so air at road speeds behaves as incompressible). Moreover, $\mathrm{D}\rho/\mathrm{D}t = 0$ requires only that each parcel keep its own density along its trajectory, not that $\rho$ be uniform across the domain; in the ocean, for example, salinity and temperature vary from layer to layer while each parcel's density remains nearly constant.</p>

<p>Look again at the box figure. Away from the source core, every flow there satisfies (3.8), and every box shows zero net outflow. The cored source is an idealised exception where volume is injected inside the core, representing the mouth of a supply pipe seen from far away.</p>

<div data-quiz="q2"></div>

<aside class="history" data-era="1752">The continuity condition came before the general equations of motion. Euler derived the condition for an incompressible fluid in a memoir read on 31 August 1752 but printed only in 1761. d'Alembert had derived the incompressibility condition in his entry for the Berlin Academy's 1749 prize on fluid resistance, published in French in 1752 as the <em>Essai d'une nouvelle théorie de la résistance des fluides</em>; Darrigol and Frisch suggest calling it "d'Alembert's condition". Euler's general continuity equation for a compressible fluid is in his memoir "Principes généraux du mouvement des fluides", presented in 1755 and printed in 1757 (Darrigol and Frisch 2008).</aside>

<aside class="note" data-label="Why it matters numerically">In an incompressible solver, (3.8) acts as an instantaneous kinematic constraint on the velocity field rather than an evolution equation for $\rho$, and pressure serves as the Lagrange multiplier that enforces it—the central topic of <a href="#/pressure/constraint">The pressure puzzle</a>.</aside>

<h2 id="momentum">Momentum: forces on a box</h2>

<p>For momentum the quantity per unit volume is $\rho\mathbf{u}$, a vector, and it is carried with flux $\rho\mathbf{u}(\mathbf{u}\cdot\mathbf{n})$ through a face. Unlike mass, momentum can be created or destroyed inside the control volume by forces. Newton's second law, applied to a material volume and translated by (3.4), says that the momentum in a fixed box changes because momentum is carried through its walls and because forces act on what is inside.</p>

<p>Forces on a piece of fluid come in two kinds. <em>Body forces</em> such as gravity or Coriolis and centrifugal accelerations act throughout the volume, contributing $\int_V \rho\,\mathbf{f}\,\mathrm{d}V$, where $\mathbf{f}$ is the force per unit mass. <em>Surface forces</em> are exerted by the fluid outside the box on the fluid inside, through the walls. The force per unit area on a face is the <em>traction</em> $\mathbf{t}$. In a fluid at rest it is just the pressure, pushing straight in (<a href="#/continuum/pressure">What is a fluid?</a>). In a moving fluid it can also have a component along the face, a shear stress, and its size and direction depend on how the face is tilted.</p>

<p>Cauchy showed that this dependence is as simple as it could be. At each point there is a single matrix, the <dfn data-term="cauchy-stress">Cauchy stress tensor</dfn> $\boldsymbol{\sigma}$, which turns the normal of any face into the traction on it:</p>

<div class="eq" id="eq-cauchy">$$\mathbf{t}(\mathbf{n}) = \boldsymbol{\sigma}\,\mathbf{n}, \qquad t_i = \sigma_{ij}\,n_j .$$<span class="eq-tag">(3.9)</span></div>

<p>The entry $\sigma_{ij}$ is the $i$-component of force per unit area on a face whose normal points along $j$. The diagonal entries are normal stresses, the others shears. Balancing angular momentum on a small cube shows that $\boldsymbol{\sigma} = \boldsymbol{\sigma}^{\top}$, reducing its nine entries in three dimensions to six independent components.</p>

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

<p>In an ideal (inviscid) fluid, the stress tensor retains its hydrostatic form $\boldsymbol{\sigma} = -p\,\mathbf{I}$ even when the fluid is in motion, so every surface experiences only a normal pressure push with no internal friction. Since $\nabla\cdot(-p\mathbf{I}) = -\nabla p$, substituting this into (3.10) yields the <dfn data-term="euler-equations">Euler equations</dfn>:</p>

<div class="eq" id="eq-euler">$$\rho\,\frac{\mathrm{D}\mathbf{u}}{\mathrm{D}t} = -\nabla p + \rho\,\mathbf{f} .$$<span class="eq-tag">(3.11)</span></div>

<aside class="who" data-person="leonhard-euler">Euler wrote the equations of motion of an ideal fluid, with continuity, in his 1755 memoir (printed 1757). He then said what was missing: "it is not the laws of Mechanics that we lack in order to pursue this research but only the Analysis, which has not yet been sufficiently developed for this purpose." Nearly three centuries later the analysis is still not finished, as the last section of this chapter explains.</aside>

<p>For an incompressible fluid of uniform density, the three momentum equations and the divergence constraint (3.8) form a closed system of four equations for the three velocity components and the pressure. For a compressible gas, the density is a fifth unknown governed by (3.6), and pressure is linked to density and temperature through a thermodynamic equation of state together with an energy conservation equation. In every case, closing Cauchy's equation (3.10) requires a <em>constitutive law</em> that specifies the stress tensor $\boldsymbol{\sigma}$ in terms of the flow variables, characterising the material properties of the fluid.</p>

<aside class="who" data-person="augustin-louis-cauchy">Cauchy announced the idea of stress in 1822 and gave the full treatment, with the tetrahedron argument, in 1827. He described how it came to him: "It came into my mind that these two kinds could be reduced to one, still called tension or pressure, of the same nature as the hydrodynamic pressure exerted by a fluid against the surface of a solid. Yet the new pressure should not be perpendicular upon the faces which undergo it, nor be the same in all directions at a given point."</aside>

<h2 id="navier-stokes">Viscosity and the Navier–Stokes equations</h2>

<p>Real fluids resist being sheared. A layer sliding over another drags it along, at a rate set by the viscosity (<a href="#/continuum/viscosity">What is a fluid?</a>). Because uniform translation and rigid rotation produce no relative deformation, internal friction depends only on how rapidly neighbouring parcels deform relative to one another, measured by the <dfn data-term="strain-rate">strain-rate</dfn> tensor $\mathbf{S} = \tfrac{1}{2}(\nabla\mathbf{u} + \nabla\mathbf{u}^{\top})$ of the <a href="#/viewpoints/deformation">previous chapter</a>.</p>

<p>A <dfn data-term="newtonian-fluid">Newtonian fluid</dfn> is one whose extra stress is proportional to $\mathbf{S}$. If the fluid has no preferred direction, the most general linear law has two constants:</p>

<div class="eq" id="eq-newtonian">$$\boldsymbol{\sigma} = -p\,\mathbf{I} + 2\mu\,\mathbf{S} + \lambda\,(\nabla\cdot\mathbf{u})\,\mathbf{I} .$$<span class="eq-tag">(3.12)</span></div>

<p>The shear viscosity $\mu$ is the one you measure by sliding plates. The second constant $\lambda$ acts only when parcels change volume. Stokes chose $\lambda = -\tfrac{2}{3}\mu$, so that the mean normal stress equals $-p$ even in a compressing flow. This choice, the <em>Stokes hypothesis</em>, says the bulk viscosity $\lambda + \tfrac{2}{3}\mu$ is zero. It is an assumption, accurate for monatomic gases and good enough for most others. For an incompressible flow the $\lambda$ term vanishes, so the question does not arise.</p>

<aside class="who" data-person="simeon-denis-poisson">Poisson's memoir on elastic solids and viscous fluids (read 12 October 1829, printed 1831) kept two independent viscous constants, the pair $\mu$ and $\lambda$ of (3.12). Stokes's hypothesis cut them to one. Poisson's name returns with his 1813 equation, $\nabla^2 V = f$ (a potential driven by a source), which every incompressible solver meets as the pressure Poisson equation.</aside>

<p>Substituting (3.12) into Cauchy's equation (3.10) for an incompressible flow ($\nabla\cdot\mathbf{u} = 0$) with constant viscosity $\mu$ simplifies the viscous force $\nabla\cdot(2\mu\mathbf{S}) = \mu\nabla^2\mathbf{u} + \mu\nabla(\nabla\cdot\mathbf{u})$ to $\mu\nabla^2\mathbf{u}$. Dividing by $\rho$ and writing $\nu = \mu/\rho$ for the <dfn data-term="kinematic-viscosity">kinematic viscosity</dfn> yields the incompressible <dfn data-term="navier-stokes">Navier–Stokes equations</dfn>:</p>

<div class="eq" id="eq-navier-stokes">$$\class{t1}{\frac{\partial \mathbf{u}}{\partial t}} + \class{t2}{(\mathbf{u}\cdot\nabla)\,\mathbf{u}} = \class{t3}{-\frac{1}{\rho}\nabla p} + \class{t4}{\nu\,\nabla^2\mathbf{u}} + \class{t5}{\mathbf{f}}, \qquad \nabla\cdot\mathbf{u} = 0 .$$<span class="eq-tag">(3.13)</span></div>

<p>Each term is a different physical effect, and much of this course is about how to compute each one. Read them in order, matching the colours in the figure below:</p>

<table>
<thead><tr><th>Term</th><th>What it is</th><th>What it does</th><th>Where the course computes it</th></tr></thead>
<tbody>
<tr><td>$\class{t1}{\partial\mathbf{u}/\partial t}$</td><td>local (unsteady) acceleration</td><td>the change at a fixed point</td><td>time stepping: <a href="#/stiffness/implicit">Stiffness</a></td></tr>
<tr><td>$\class{t2}{(\mathbf{u}\cdot\nabla)\mathbf{u}}$</td><td>convective acceleration</td><td>speeding up or turning as a parcel moves; the only nonlinear term</td><td><a href="#/advection/upwind">Advection</a>; <a href="#/shocks/burgers">Shocks</a></td></tr>
<tr><td>$\class{t3}{-\nabla p/\rho}$</td><td>pressure gradient</td><td>pushes from high to low pressure; keeps $\nabla\cdot\mathbf{u} = 0$</td><td>projection: <a href="#/pressure/projection">Pressure</a></td></tr>
<tr><td>$\class{t4}{\nu\nabla^2\mathbf{u}}$</td><td>viscous diffusion</td><td>smooths velocity differences</td><td>diffusion: <a href="#/stiffness/heat">Stiffness</a></td></tr>
<tr><td>$\class{t5}{\mathbf{f}}$</td><td>body force per unit mass</td><td>gravity, buoyancy, stirring</td><td>forcing: <a href="#/stable-fluids/sandbox">Stable fluids</a></td></tr>
</tbody>
</table>

<p>A solution of (3.13) is a velocity field for which these five terms balance at every point and every instant. A few flows are simple enough to write down exactly. In the figure, pick one and drag the probe. The bars show each term at the probe, the two sides of the equation and their difference.</p>

<figure data-widget="conservation-budget" data-preset="taylor-green" class="wide"><figcaption>The terms of (3.13), per unit mass, at the probe, for exact solutions of the Navier–Stokes equations. Velocities, their derivatives and the closed-form pressure come from the shared flow kernels; nothing here is simulated, so the residual reflects only floating-point round-off and finite-difference truncation (at most a few millionths of the largest term).</figcaption></figure>

<div class="try"><ol>
<li>In the decaying cells (Taylor–Green), drag the probe around. The local term always matches the viscous term, and the convective term always matches the pressure term. The flow fades, and friction is what fades it.</li>
<li>Switch to the pressure-driven channel. Nothing accelerates; the pressure push is balanced by viscous drag at every height. Now try the gravity-driven channel, which produces the same parabolic velocity profile with the body force $\mathbf{f}$ replacing the pressure gradient.</li>
<li>Turn off the viscous term. The channel and the decaying cells go out of balance because both rely on viscous forces. The potential flow past the cylinder and the solid-body rotation stay balanced. For them $\nabla^2\mathbf{u} = 0$, so they solve Euler's equations too.</li>
<li>In the spreading vortex (Lamb–Oseen), compare "along $u$" with "across $u$". Along the flow, the slowing is set by viscosity. Across it, the pressure gradient supplies the centripetal acceleration that bends parcels round in circles.</li>
<li>Raise $\nu$ in the channel. The viscous term grows, and the pressure gradient needed to drive the same flow grows with it.</li>
</ol></div>

<div data-quiz="q3"></div>

<p>Completing the mathematical problem requires boundary conditions at solid walls. Impermeability requires the normal velocity $\mathbf{u}\cdot\mathbf{n}$ to match that of the wall, while the <em>no-slip condition</em> requires the tangential velocity of the fluid at the wall to match the wall's tangential velocity as well. After decades of nineteenth-century debate, experiments confirmed no-slip for liquids and gases at ordinary densities; it breaks down in rarefied gases when the <dfn data-term="mean-free-path">mean free path</dfn> is comparable to the flow scale (<a href="#/continuum/continuum">What is a fluid?</a>), where wall-slip models are needed.</p>

<aside class="history" data-era="1822">Darrigol (2002) counts five separate derivations of these equations. Navier's came first, in a memoir read to the Paris Academy on 18 March 1822 and printed in 1827. He started from forces between molecules. Cauchy followed in 1823 and Poisson in 1829 (printed 1831). Saint-Venant presented a derivation in 1834 that needed no assumption about molecular forces, and printed a summary of it in 1843. Stokes's continuum derivation, read at Cambridge on 14 April 1845 and printed in the Society's <em>Transactions</em> a few years later, is the one textbooks follow. The compound name "Navier–Stokes" became standard in the twentieth century.</aside>

<aside class="who" data-person="adhemar-barre-de-saint-venant">Saint-Venant obtained the viscous stresses from one assumption, that the tangential stress on each face points along the direction of sliding, with nothing assumed about molecules (memoir presented 14 April 1834, printed note 1843). His note writes stresses with the double subscripts $p_{xy}$ that are still in use.</aside>

<aside class="who" data-person="claude-louis-navier">Navier was the first to write the viscous equations of motion. His constant $\varepsilon$ played the role of today's viscosity, and his wall condition let the fluid slip along a solid wall, with a resistance proportional to the slip.</aside>

<aside class="who" data-person="george-gabriel-stokes">Stokes derived the equations from the rate of deformation alone, introduced the notation $\mathrm{D}/\mathrm{D}t$, and tested the no-slip condition against pipe data. It failed for the large pipes he had measurements for: "I found that the formulae did not at all agree with experiment." Those flows were turbulent, which nobody could yet recognise. The support for no-slip came from Poiseuille's capillary-tube measurements (1840) and from Stokes's own pendulum theory (1850), which matched Baily's pendulum experiments.</aside>

<p>For ordinary liquids and gases, from water in pipes to air over wings, the Navier–Stokes equations agree closely with experiment wherever the two can be compared. The challenge lies in solving them, which is the subject of the rest of this course.</p>

<h2 id="paradox">d'Alembert's paradox</h2>

<p>Before viscosity entered the equations of motion, inviscid theory faced a major contradiction. When a body is placed in a steady, uniform stream of inviscid fluid whose motion is irrotational (as when started from rest), the Euler equations predict that the net force on the body in the direction of the stream—the drag—is identically zero. This result is <dfn data-term="dalembert-paradox">d'Alembert's paradox</dfn>, contradicting everyday experience with any solid moving through water or air.</p>

<p>The circular cylinder shows how it happens. The potential flow around it, which you watched in the previous chapter, has surface speed $2U\sin\theta$, where $\theta$ is measured from the rear. Bernoulli's equation turns speed into pressure, and the <em>pressure coefficient</em> $C_p = (p - p_\infty)/(\tfrac{1}{2}\rho U^2)$ on the surface is</p>

<div class="eq" id="eq-cp">$$C_p(\theta) = 1 - 4\sin^2\theta .$$<span class="eq-tag">(3.14)</span></div>

<p>It is $+1$ at the front and rear stagnation points, and $-3$ at the top and bottom, where the flow is fastest. The pattern is the same front and back. The front is pushed backwards exactly as hard as the rear is pushed forwards, so the net force along the stream is zero. The pattern is also the same top and bottom, so there is no lift either.</p>

<div data-quiz="q4"></div>

<figure data-widget="conservation-cylinder" data-preset="paradox" class="wide"><figcaption>Inviscid flow past a cylinder ($U = 1$, $R = 0.5$, $\rho = 1$). Left: shading shows $C_p$, lines are streamlines, and arrows show the pressure force on the surface, pushing in where $C_p$ is positive and pulling out where it is negative. Right: $C_p$ on the surface, with the zero-circulation curve (3.14) dashed. Drag and lift are integrated from the surface pressure and compared with the Kutta–Joukowski value.</figcaption></figure>

<div class="try"><ol>
<li>With no circulation, the arrows at the front and back match, and so do those at the top and bottom. The drag readout is zero to about $10^{-16}$.</li>
<li>Drag the circulation negative (clockwise). The flow over the top speeds up and the flow underneath slows down, so the suction on top wins: lift appears, equal to $-\rho U\Gamma$. The drag stays zero.</li>
<li>Watch the two stagnation points slide down the surface as $|\Gamma|$ grows. At $|\Gamma| = 4\pi R U \approx 6.28$ they meet at the bottom; beyond it, one stagnation point floats off the body and a ring of fluid circles the cylinder.</li>
<li>Compare the solid curve with the dashed one to see how circulation breaks the top–bottom symmetry while preserving the fore–aft symmetry, producing lift without drag.</li>
</ol></div>

<p>The lift result is the <em>Kutta–Joukowski theorem</em>: in steady two-dimensional potential flow, a body with circulation $\Gamma$ (positive anticlockwise) experiences a force of magnitude $\rho U |\Gamma|$ per unit span perpendicular to the oncoming stream, while the drag in steady two-dimensional potential flow remains zero. Kutta worked out a special case in 1902 and Zhukovsky proved the general theorem in 1906, establishing the circulation theory of aerofoil lift.</p>

<aside class="who" data-person="nikolai-zhukovsky">Zhukovsky (also written Joukowski) stated the general lift theorem in 1906 and checked it with experiments on rotating disks at Kuchino, near Moscow. Kutta pointed out that the formula was already contained in his 1902 work on a particular profile, and the double name stuck.</aside>

<aside class="who" data-person="jean-le-rond-dalembert">d'Alembert announced the paradox in 1768, for bodies symmetric front to back: "Thus I do not see, I admit, how one can satisfactorily explain by theory the resistance of fluids. On the contrary, it seems to me that the theory, developed in all possible rigor, gives, at least in several cases, a strictly vanishing resistance; a singular paradox which I leave to future Geometers to elucidate."</aside>

<aside class="history" data-era="1768">The paradox is often dated to d'Alembert's 1752 <em>Essai</em> on fluid resistance, but the <em>Essai</em> does not state it. He announced it in volume 5 of his <em>Opuscules mathématiques</em> (1768) and returned to it in 1780 (Grimberg, Pauls and Frisch 2008). Borda had already derived zero drag in a memoir for the academy year 1766 (printed 1769), from the principle of "live forces" (conservation of energy), and concluded that the principle did not apply there. Saint-Venant gave the general statement in 1846–47 and blamed the neglect of viscosity.</aside>

<p>The paradox was resolved in 1904 by Prandtl. Viscosity is tiny in water and air, but it is not zero. At the wall, no-slip forces the fluid to rest, while a short distance away the inviscid solution is moving at speed $U$. Between them is a thin <dfn data-term="boundary-layer">boundary layer</dfn>, where the velocity changes so steeply that friction matters however small $\nu$ is. Balancing the convective term against the viscous term across the layer gives its thickness: $U/L \sim \nu/\delta^2$, so</p>

<div class="eq" id="eq-boundary-layer">$$\frac{\delta}{L} \sim \mathrm{Re}^{-1/2}, \qquad \mathrm{Re} = \frac{U L}{\nu} .$$<span class="eq-tag">(3.15)</span></div>

<p>For air at 10 m/s along a plate 1 m long, the <dfn data-term="reynolds-number">Reynolds number</dfn> is $\mathrm{Re} \approx 7\times 10^5$ and the estimate gives $\delta \approx 1$ mm; the full laminar calculation gives about 6 mm at the trailing edge. Either way the layer is thin. On the rear of a blunt body, the pressure rises again towards the rear stagnation point. The slow fluid in the layer cannot push against that rise for long, so it stops and the layer <em>separates</em> from the wall. Behind the body is a wide, low-pressure wake instead of the high pressure of (3.14). The front–back symmetry is broken, and the drag returns. Viscosity's direct effect, the friction in the layer, is small. Its indirect effect, rearranging the whole pressure field, is large.</p>

<aside class="who" data-person="ludwig-prandtl">Prandtl presented the idea at the International Congress of Mathematicians in Heidelberg in August 1904, in a paper of eight printed pages (1905). His working term was "Übergangsschicht", transition layer: "In der schmalen Übergangsschicht ergeben dann die schroffen Geschwindigkeitsunterschiede trotz der kleinen Reibungskonstanten merkliche Wirkungen." In plain translation: in the narrow transition layer the abrupt differences in velocity then produce noticeable effects, despite the small friction constant.</aside>

<aside class="pitfall">A numerical solution of the Euler equations for flow past a bluff body often <em>does</em> show a wake and drag. The equations have not changed. The scheme's numerical dissipation (<a href="#/advection/diffusion-dispersion">Advection</a>) acts as an uncontrolled viscosity that lets the flow separate. Because this apparent drag is an artefact of the grid resolution and discretisation scheme rather than physical viscosity, it cannot be used as a drag prediction.</aside>

<h2 id="finite-volume">Finite volumes: bookkeeping on a grid</h2>

<p>Return to the integral law (3.1), now in one dimension, and cut the line into cells of width $\Delta x$. Call the amount per unit length in cell $j$, averaged over the cell, $q_j$. A cell's contents change only through its two faces, at $x_{j-1/2}$ and $x_{j+1/2}$. If $F_{j+1/2}$ is the flux through the right face, integrated over one time step and divided by $\Delta t$, then (3.1) for this cell is exact:</p>

<div class="eq" id="eq-fv">$$q_j^{n+1} = q_j^{n} - \frac{\Delta t}{\Delta x}\left(F_{j+1/2} - F_{j-1/2}\right) .$$<span class="eq-tag">(3.16)</span></div>

<p>This update is the <dfn data-term="finite-volume">finite-volume method</dfn>. All numerical approximation enters in how the numerical flux $F_{j+1/2}$ is reconstructed from neighbouring cell averages, as developed in the chapters on <a href="#/advection/upwind">advection</a> and <a href="#/shocks/limiters">shocks</a>. Regardless of that reconstruction, the method is conservative whenever <em>each face has a single flux shared by both adjacent cells</em>, so that what leaves cell $j$ across face $j+\tfrac{1}{2}$ equals what enters cell $j+1$. Summing (3.16) over all cells then cancels the interior fluxes in pairs, just as interior faces cancelled in the divergence theorem:</p>

<div class="eq" id="eq-telescope">$$\sum_j q_j^{n+1}\,\Delta x = \sum_j q_j^{n}\,\Delta x - \Delta t\left(F_{\text{right end}} - F_{\text{left end}}\right) .$$<span class="eq-tag">(3.17)</span></div>

<p>The sum telescopes. Only the boundary fluxes can change the total. On a periodic domain nothing changes at all, apart from round-off, at any resolution and for any flux formula. An update written as (3.16) is said to be in <dfn data-term="conservation-form">conservation form</dfn>.</p>

<p>To see why conservation form matters when the wave speed varies in space, consider traffic of density $q(x, t)$ (cars per kilometre) on a ring road where the speed limit $a(x)$ drops through a roadworks zone. Because the flux is $a q$ (cars per hour), conservation of cars reads</p>
<p>$$\frac{\partial q}{\partial t} + \frac{\partial (a q)}{\partial x} = 0 .$$</p>
<p>For smooth solutions, expanding the derivative by the product rule gives the analytically equivalent form $\partial_t q + a\,\partial_x q + a'\,q = 0$. Discretising this expanded equation with an upwind difference and the exact derivative $a'$ gives</p>

<div class="eq" id="eq-product">$$q_j^{n+1} = q_j^{n} - \Delta t\left(a_j\,\frac{q_j^{n} - q_{j-1}^{n}}{\Delta x} + a'_j\,q_j^{n}\right) .$$<span class="eq-tag">(3.18)</span></div>

<p>Although (3.18) is consistent and first-order accurate like the flux form, it cannot be written as a difference of single-valued face fluxes. At face $j-\tfrac{1}{2}$, cell $j$ adds an incoming amount $a_j q_{j-1}\Delta t$, whereas cell $j-1$ subtracts $(a_{j-1} + a'_{j-1}\Delta x)\,q_{j-1}\Delta t$. Because the two cells evaluate the transport across their shared face using different local coefficients, the two amounts differ by $\mathcal{O}(\Delta x^2 a'' q)$, creating or destroying cars at the interface so that the sum no longer telescopes and the total number of cars drifts.</p>

<div data-quiz="q5"></div>

<figure data-widget="conservation-telescoping" data-preset="leak" class="wide"><figcaption>The same traffic on the same ring road, computed two ways with first-order upwinding and the same time step. Top row: the flux form (3.16), with face flux $F_{j+1/2} = a(x_{j+1/2})\,q_j$. Bottom row: the product-rule form (3.18), or the advective form $q_t + a q_x = 0$. The dashed outline is the exact solution, from characteristics. The marks under the bottom row show cars made (up) or lost (down) at each face in the last step. The lower plot shows the relative change in each total on a log scale.</figcaption></figure>

<div class="try"><ol>
<li>Press Drive. The block of cars bunches up in the slow zone and spreads out again after it. In the top row the total stays fixed to about $10^{-16}$, the level of round-off. In the bottom row the marks show cars appearing at the faces where the speed limit bends, and the total climbs.</li>
<li>Tap a face in the slow zone, then press Step. The readouts show what the left cell sends and what the right cell receives through that face in the bottom row. They differ. In the top row they are the same number by construction.</li>
<li>Compare 50, 100 and 200 cells. The leak per pass roughly halves each time because the conservation error is first order in $\Delta x$, while the flux form remains at round-off throughout.</li>
<li>Choose the constant-speed road. Now $a' = 0$, and both updates are the same arithmetic, so both conserve.</li>
<li>Switch the bottom row to the advective form. It drops the $a'q$ term entirely and solves a different equation, one that carries values rather than amounts. Its total collapses while the cars are in the slow zone, because it never lets them bunch up.</li>
</ol></div>

<p>On this road, the product-rule discretisation (3.18) gains about 27% of the total cars in one circuit on a 50-cell grid, 12% on 100 cells, and 6% on 200 cells, converging to the exact total only at first order. The flux form (3.16) conserves the total to machine precision ($\approx 10^{-16}$) at every resolution, even though its profile is visibly smeared by the <dfn data-term="numerical-diffusion">numerical diffusion</dfn> of first-order upwinding (<a href="#/advection/diffusion-dispersion">Advection</a>). Exact conservation and pointwise accuracy are distinct properties; writing the update in flux-difference form guarantees exact conservation at any grid resolution without extra computational work.</p>

<details class="deeper"><summary>Go deeper: how fast the product rule leaks</summary>
<p>Sum (3.18) over a periodic grid. Summing by parts, $\sum_j a_j(q_j - q_{j-1}) = \sum_j q_j\,(a_j - a_{j+1})$, so the total $M = \sum_j q_j\Delta x$ changes by</p>
<p>$$\frac{M^{n+1} - M^{n}}{\Delta t} = \Delta x\sum_j q_j\left(\frac{a_{j+1} - a_j}{\Delta x} - a'_j\right) = \frac{\Delta x}{2}\sum_j q_j\,a''_j\,\Delta x + \mathcal{O}(\Delta x^2) .$$</p>
<p>The leak rate is approximately $\tfrac{1}{2}\Delta x\int q\,a''\,\mathrm{d}x$, which is first order in $\Delta x$ and largest where $a(x)$ has strong curvature. In the flux form the corresponding sum is identically zero because each interior flux $F_{j+1/2}$ appears once with a positive sign and once with a negative sign.</p>
</details>

<aside class="pitfall">A non-conservative update leaks mass in smooth flow, as here, and the leak shrinks as the grid is refined. At a shock it is worse. The <dfn data-term="rankine-hugoniot">jump conditions</dfn> that fix a shock's speed come from the integral form (3.1) (<a href="#/shocks/rankine-hugoniot">Shocks</a>). A scheme that does not conserve can converge, as the grid is refined, to a shock that moves at the wrong speed (Hou and LeFloch 1994). Conversely, Lax and Wendroff proved in 1960 that when a consistent scheme in conservation form converges as the grid is refined, its limit is a <dfn data-term="weak-solution">weak solution</dfn> of the conservation law whose shocks satisfy the Rankine–Hugoniot jump conditions. See <a href="#/pathologies">the gallery</a>.</aside>

<p>In two and three dimensions the idea is the same. The cells are boxes, or any polyhedra, and each face carries one flux, shared by the two cells it separates. The divergence theorem (3.2) is then exact cell by cell, and the totals of mass, momentum and energy are conserved to round-off. This is why finite volumes underlie most general-purpose engineering CFD codes (Versteeg and Malalasekera 2007), and why the staggered grids of <a href="#/pressure/mac">The pressure puzzle</a> place velocities on cell faces.</p>

<h2 id="millennium">An open question</h2>

<p>For all their success, the Navier–Stokes equations hold a famous unsolved problem. In 2000 the Clay Mathematics Institute listed it among seven Millennium Prize Problems, announced on 24 May 2000 at the Collège de France in Paris, each with a prize of one million US dollars. The official description, by Charles Fefferman, concerns incompressible flow in all of three-dimensional space or in a periodic box. A solver must prove one of two things. Either, with no forcing, every smooth initial velocity field (decaying fast enough at infinity, in the unbounded case) has a smooth, finite-energy solution for all time. Or there exists a smooth initial field (with smooth forcing allowed) for which no such global smooth solution exists because the solution develops a finite-time singularity. In two dimensions, smooth initial data are known to produce smooth solutions for all time, as Ladyzhenskaya proved for bounded domains in 1958–59. In three dimensions smoothness is known only for small initial data or for a short time. Leray showed in 1934 that weak solutions, which need not be smooth, exist for all time. Whether they are smooth, or even unique, is open. Fefferman also warns against settling the question by computer: "Many numerical computations appear to exhibit blowup for solutions of the Euler equations, but the extreme numerical instability of the equations makes it very hard to draw reliable conclusions."</p>

<p>The Millennium problem asks a question of mathematical regularity—whether the three-dimensional continuum equations themselves are guaranteed to have smooth, unique solutions for all time—rather than how to approximate them numerically or model turbulent statistics. Progress continues around its edges. Buckmaster and Vicol (posted 2017, published 2019) showed that some weak solutions are not unique. Theirs are not Leray's weak solutions and they are far from smooth, so the Clay problem stands; as they write, "the question of uniqueness of Leray-Hopf weak solutions for the 3D Navier-Stokes equations remains however open." Engineers do not wait for the answer. They trust the equations because computed solutions, checked as described in <a href="#/trust/validation">Can you trust the numbers?</a>, agree with experiment.</p>

<aside class="who" data-person="jean-leray">Leray built his weak solutions in 1934 by smoothing the velocity that does the carrying, solving the smoothed problem, and passing to a limit. He called them "turbulent solutions"; whether they have anything to do with physical turbulence is still debated. The projection onto divergence-free fields used in <a href="#/pressure/hodge">The pressure puzzle</a> is often named after him.</aside>

<aside class="who" data-person="olga-ladyzhenskaya">Ladyzhenskaya proved that two-dimensional viscous flow in a bounded domain has a unique solution for all time (announced 1958, full paper 1959), and wrote the standard mathematical monograph on viscous incompressible flow (1961). Her name is also on the inf-sup condition that tells you which velocity–pressure discretisations avoid spurious pressure modes.</aside>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>G. K. Batchelor (1967). <em>An Introduction to Fluid Dynamics</em>. Cambridge University Press. Chapters 2 and 3: conservation of mass, the transport theorem, stress, and the Newtonian fluid.</li>
<li>P. K. Kundu, I. M. Cohen and D. R. Dowling (2016). <em>Fluid Mechanics</em>, 6th ed. Academic Press. Chapter 4: conservation laws.</li>
<li>J. D. Anderson (2017). <em>Fundamentals of Aerodynamics</em>, 6th ed. McGraw-Hill. Chapter 3: potential flow past a cylinder with and without circulation, the Kutta–Joukowski theorem and d'Alembert's paradox.</li>
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
<li>G. G. Stokes (1847). On the theories of the internal friction of fluids in motion, and of the equilibrium and motion of elastic solids. <em>Transactions of the Cambridge Philosophical Society</em> 8, 287–319 (read 14 April 1845; volume completed 1849). Reprinted in <em>Mathematical and Physical Papers</em>, vol. 1 (1880).</li>
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
        'Zero, because whatever flows in through one face flows out through another.',
        'About $m/2 = 3.14$, since the box encloses half the core and half of the volume created inside leaves through its faces.',
        'The full $m = 6.28$, because any box that intersects the source collects all of its output.',
        'It depends on the size of the box, since a larger box captures more of the outflow.',
      ],
      answer: 1,
      explain: 'By the divergence theorem, the net outflow equals the integral of $\\nabla\\cdot\\mathbf{u}$ over the box, which is $m$ times the fraction of the core enclosed ($1/2$). Fluid generated in the outer half of the core enters through the left face and exits through the remaining faces with zero net contribution, so the box size does not affect the result once it encloses half the core.',
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
      explain: 'By (3.7), $\\nabla\\cdot\\mathbf{u}$ is the relative rate of volume expansion of a fluid parcel, so $\\nabla\\cdot\\mathbf{u} = 0$ means that every parcel preserves its volume and density ($\\mathrm{D}\\rho/\\mathrm{D}t = 0$). Different parcels may still have different densities, as in a salt- or temperature-stratified ocean, and both speed and pressure vary in space.',
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
      explain: 'The convective term $(\\mathbf{u}\\cdot\\nabla)\\mathbf{u}$ multiplies the velocity by its own spatial gradient, so doubling $\\mathbf{u}$ quadruples the term. This quadratic nonlinearity drives shock steepening and turbulence, and in incompressible flow it also enters the source term of the pressure Poisson equation (see The pressure puzzle), whereas the viscous diffusion term $\\nu\\nabla^2\\mathbf{u}$ is linear.',
    },
    q4: {
      type: 'predict',
      q: 'Before you move the slider: give the cylinder some circulation, as if it were spinning. In this inviscid flow, what happens to the force on it?',
      choices: [
        'Lift appears, and drag appears with it, as for a spinning ball in air.',
        'Lift appears, at right angles to the stream; the drag stays exactly zero.',
        'Nothing, because potential flow gives zero force of every kind.',
        'Drag appears, because the spinning surface rubs on the fluid; there is no lift.',
      ],
      answer: 1,
      explain: 'Circulation speeds up the flow on one side and slows it on the other, breaking the top–bottom pressure symmetry and producing a lift force $-\\rho U\\Gamma$ per unit span by the Kutta–Joukowski theorem. Fore–aft symmetry is preserved, so the pressure drag remains zero; in a real fluid, drag arises from viscous shear and boundary-layer separation.',
    },
    q5: {
      type: 'predict',
      q: 'With 50 cells on the road with the slow zone, the product-rule form gains about 27% of the cars in one pass round the ring. Predict what happens with 100 cells.',
      choices: [
        'Still about 27%, because the error is in the formula and refining cannot help.',
        'About half as much, near 12%, because the leak at each face shrinks with $\\Delta x$ as a first-order error.',
        'About a quarter, near 7%, because upwinding is second order.',
        'It vanishes, since any refinement eliminates a conservation leak.',
      ],
      answer: 1,
      explain: 'The measured leak is 26.6% with 50 cells, 12.2% with 100 and 5.9% with 200. The leak rate is about $\\tfrac{1}{2}\\Delta x\\int q\\,a^{\\prime\\prime}\\,\\mathrm{d}x$, first order in $\\Delta x$. So the product-rule form does converge for smooth flow, slowly. The flux form is exact to round-off at every resolution, because each face has one flux. At a shock the difference is sharper: a non-conservative scheme can converge to a shock at the wrong speed.',
    },
  },
  glossary: {
    'control-volume': {
      term: 'Control volume',
      def: 'A region of space, usually fixed, used to formulate an integral conservation balance, in which the total inside changes only through surface fluxes and internal sources.',
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
