// Chapter 2: viewpoints. Prose, questions, glossary and the gallery entry;
// the figures live in ./viewpoints/ and run src/sims/flows.js (flows,
// integrators, lines, material derivative, material loops) and
// src/sims/ch-viewpoints-kinematics.js (the swinging stream, the warm patch,
// the velocity-gradient split), both tested in tests/fluid-course/.

import { mountTwoViews } from './viewpoints/two-views.js';
import { mountLines } from './viewpoints/lines.js';
import { mountDdt } from './viewpoints/ddt.js';
import { mountDeform } from './viewpoints/deform.js';
import { mountIntegrators } from './viewpoints/integrators.js';

export const chapter = {
  id: 'viewpoints',
  title: 'Two ways of watching a flow',
  short: 'Two ways of watching',
  blurb: 'Following parcels (Lagrange) versus watching fixed points (Euler), the material derivative, and streamlines, pathlines and streaklines.',
  minutes: 30,
  html: String.raw`
<p class="lead-in">Stand on a bridge over a river. You can pick out one leaf and follow it downstream, or you can stare at one patch of water under the bridge and watch whatever passes through it. Either way you learn everything about the flow, and fluid dynamics uses both views all the time. This chapter sets them up, draws the three kinds of curve that people mean by "flow lines" and shows why they disagree, builds the one operator that translates between the two views, and takes a small piece of fluid apart to see what it does as it moves. It ends with the first numerical failure of the course, met while doing nothing harder than following a particle round a circle.</p>

<h2 id="lagrangian-eulerian">Following parcels or watching places</h2>

<p><a href="#/continuum/parcels">Chapter 1</a> replaced individual molecules with <dfn data-term="fluid-parcel">fluid parcels</dfn>—volumes small enough to be treated as points yet large enough to have a well-defined density and velocity. There are two ways to describe how they move.</p>

<p>The first is to follow individual parcels by assigning each one a label—usually its initial position $\mathbf{a}$ at $t = 0$—and recording its later position $\mathbf{X}(\mathbf{a}, t)$. Other properties are indexed by the same label, so the parcel's velocity is $\partial\mathbf{X}/\partial t$ at fixed $\mathbf{a}$ and its temperature is $T(\mathbf{a}, t)$. This is the <dfn data-term="lagrangian">Lagrangian</dfn> description, which corresponds to the measurements made by a weather balloon or a drifting ocean float.</p>

<p>The second is to observe fixed locations in space, recording the velocity $\mathbf{u}(\mathbf{x}, t)$, pressure $p(\mathbf{x}, t)$, and temperature $T(\mathbf{x}, t)$ at each point $\mathbf{x}$ and time $t$. Representing the flow through fields of position and time is the <dfn data-term="eulerian">Eulerian</dfn> description, used by weather stations, wind-tunnel anemometers, and fixed simulation grids.</p>

<p>The two are joined by one equation. A parcel's velocity is the field's velocity, read at the place where the parcel is now:</p>

<div class="eq" id="eq-path">$$\begin{gathered} \dfrac{\partial \mathbf{X}}{\partial t}(\mathbf{a}, t) = \mathbf{u}\big(\mathbf{X}(\mathbf{a}, t),\, t\big), \\ \mathbf{X}(\mathbf{a}, 0) = \mathbf{a}. \end{gathered}$$<span class="eq-tag">(2.1)</span></div>

<p>Read from right to left, (2.1) states that when the velocity field is known, each parcel's trajectory follows from solving an ordinary differential equation. Read from left to right, the velocity field at $\mathbf{x}$ is the velocity of whichever parcel is passing through $\mathbf{x}$ at that instant. Integrating (2.1) numerically is the subject of the final section.</p>

<p>Some terms apply specifically to one description. A flow is <em>steady</em> when the Eulerian field is independent of time at every fixed point, $\partial\mathbf{u}/\partial t = 0$. Individual parcels can still accelerate in a steady flow; as a parcel passes a cylinder, for example, it speeds up over the shoulder and slows down behind it. The figure below compares both descriptions of the same flow.</p>

<figure data-widget="viewpoints-two-views" data-preset="cylinder"><figcaption>One flow, two descriptions. The arrows show the Eulerian velocity field at fixed points at the current instant; the dots show tracked Lagrangian parcels coloured in alternating stripes to make the deformation visible. The ring is a sensor fixed in space; the large dot is a parcel released from it, with its path so far. The plot compares the speeds the two record. Drag the ring to move the sensor.</figcaption></figure>

<div class="try"><ol>
<li>In the steady flow past a cylinder the fixed sensor records a constant speed of 0.90. The parcel's record rises to about 1.59 as it passes over the top of the cylinder and falls again behind it. The readout shows the spread of each record.</li>
<li>Drag the sensor to just above the cylinder. Its record remains flat at a higher speed, since a steady flow is time-independent at every fixed point.</li>
<li>Pick the swinging stream. Its velocity is the same everywhere at any instant but changes in time, so the two records lie on top of each other. Here all change is change in time.</li>
<li>Pick the double gyre and switch off Euler's arrows. Both records change, differently. The stripes of parcels are stretched and folded, which no single picture of arrows shows.</li>
</ol></div>

<div data-quiz="q1"></div>

<aside class="history" data-era="1755">Both descriptions are Euler's. He followed particles, labelled by where they started, in his memoir on rivers (written about 1750–51, printed 1767) and in a 1760 letter to Lagrange (printed 1762). His general equations of fluid motion (presented 1755, printed 1757) use fields at fixed points. Riemann, as reported by his student Hankel, already credited Euler with both <a href="#src-frisch-hankel">[5]</a>. Lagrange used particle labels too, but in his <i>Méchanique analitique</i> (1788, p. 453) he set the two side by side and advised, in Frisch, Grimberg and Villone's translation: "The [Eulerian] equations are much simpler than the [Lagrangian] ones; thus, in the theory of fluids, one should prefer the former over the latter." The labels came later, and the one carrying Lagrange's name is the description he advised against.</aside>

<aside class="who" data-person="leonhard-euler">Wrote the field equations of an ideal fluid in the fixed-point description (presented 1755, printed 1757). He derived the continuity condition earlier by following a small triangle and a small pyramid of fluid as they deform (read 1752, printed 1761), so he worked in both views.</aside>

<aside class="who" data-person="joseph-louis-lagrange">His 1781 memoir defined the stream function, which he wrote as $\omega$. His <i>Méchanique analitique</i> (1788) gave the equations of fluid motion in both descriptions, and recommended the fixed-point one.</aside>

<p>Numerical methods divide along the same lines. An Eulerian grid solver keeps its cells fixed in space and computes the flux of mass, momentum, and energy across cell faces—a transport step whose discretisation is the main subject of <a href="#/advection/characteristics">chapter 7</a>. A Lagrangian particle method such as smoothed particle hydrodynamics (<a href="#/lattice-particles/sph">chapter 13</a>) advects quantities simply by moving the particles, though the particles then cluster or separate and require neighbour searches at each step. Semi-Lagrangian schemes (<a href="#/stable-fluids/semi-lagrangian">chapter 12</a>) store values on a fixed grid but trace trajectories backwards over each time step to interpolate the arriving values.</p>

<h2 id="lines">Streamlines, pathlines and streaklines</h2>

<p>A flow is hard to draw. Arrows at a few points say little about where the fluid goes, so people draw curves instead. There are three natural kinds, and each matches a way of photographing a flow.</p>

<p>A <dfn data-term="streamline">streamline</dfn> is a curve that is tangent to the velocity at every point, at one instant. It is a snapshot. In two dimensions it solves</p>

<div class="eq" id="eq-streamline">$$\frac{\mathrm{d}x}{u(x, y, t)} = \frac{\mathrm{d}y}{v(x, y, t)} \qquad \text{with } t \text{ held fixed.}$$<span class="eq-tag">(2.2)</span></div>

<p>A photograph of many small specks with a short exposure shows short dashes, and the dashes line up along streamlines. In a two-dimensional flow that keeps its area, the streamlines are the contours of a single function, the stream function $\psi$, with $u = \partial\psi/\partial y$ and $v = -\partial\psi/\partial x$.</p>

<p>A <dfn data-term="pathline">pathline</dfn> is the trajectory of a single parcel over time, obtained by integrating (2.1) and seen experimentally in a long exposure of one illuminated tracer particle.</p>

<p>A <dfn data-term="streakline">streakline</dfn> is the curve formed, at one instant, by every parcel that has passed through one fixed point. Dye leaking steadily from a nozzle, or smoke from a chimney, draws one. Most photographs of flow patterns, made with dye or smoke, show streaklines.</p>

<p>In a steady flow the three coincide. The streamlines never change, a parcel moves along the one it starts on, and every parcel released from the same nozzle follows the same path. In an unsteady flow they can be completely different. The cleanest example is a uniform stream whose direction swings from side to side:</p>

<div class="eq" id="eq-swing">$$\begin{aligned} \mathbf{u} &= \big(U,\; V\sin\omega t\big), \\ x &= x_0 + U(t - t_0), \\ y &= y_0 - \frac{V}{\omega}\big(\cos\omega t - \cos\omega t_0\big). \end{aligned}$$<span class="eq-tag">(2.3)</span></div>

<p>At any instant the velocity is the same everywhere, so every streamline is a straight line, tilted by $V\sin\omega t$ over $U$. The second part of (2.3) is the exact position at time $t$ of the parcel that was at $(x_0, y_0)$ at time $t_0$. Holding $t_0$ fixed while varying $t$ traces a sinusoidal pathline of wavelength $2\pi U/\omega$ and peak-to-peak height $2V/\omega$. Holding $t$ fixed while varying the release time $t_0 \le t$ traces the streakline from a nozzle at $(x_0, y_0)$—a sinusoid of the same shape that propagates downstream at speed $U$, like the jet from a garden hose swung from side to side. Thus a single unsteady flow simultaneously exhibits straight streamlines, wavy pathlines, and a travelling wavy streakline.</p>

<figure data-widget="viewpoints-lines" data-preset="swing" class="wide"><figcaption>Three kinds of flow line from one source point, the ring. Thick solid line: the streamline through the source at the current instant, with a few other streamlines drawn thin. Dashed line with a moving dot: the pathline of the parcel released at $t = 0$. Solid line with beads: the streakline of dye released ever since. For the swinging stream the exact pathline and streakline from (2.3) are drawn as fine dots underneath. The readouts measure how far the pathline and streakline stray from the streamline. Drag the ring to move the source.</figcaption></figure>

<div class="try"><ol>
<li>Press Play. The streamline through the source swings like a straight stick, the parcel traces a wave and the dye forms a wave that travels downstream. Both depart from the streamline by up to 0.51, matching the wave height $2V/\omega$ for $V = 0.8$ and $\omega = \pi$.</li>
<li>Pick the steady vortex or the steady cells. All three lines lie on one curve. The separations stay at or below $10^{-4}$, reflecting only the numerical integration tolerance.</li>
<li>Pick the spreading vortex. Although the flow is unsteady ($|\partial\mathbf{u}/\partial t| \ne 0$ at the source as the vortex decays), all three curves still coincide because the velocity changes only in magnitude while its direction remains tangent to the same circle.</li>
<li>Pick the double gyre, whose dividing line sways back and forth, and play it to $t = 10$. The dye curls about 0.45 away from the streamline through its source. Drag the source and try again.</li>
</ol></div>

<div data-quiz="q2"></div>

<aside class="pitfall">When you compare a simulation with an experiment, compare like with like. Plotting software usually draws streamlines from the velocity field at one instant; dye and smoke draw streaklines. In an unsteady flow such as the wake behind a cylinder the two pictures look different even when the simulation is perfect. To compare with a dye photograph, release virtual dye in the simulation.</aside>

<aside class="history" data-era="1868">The term is older than its modern meaning. Stokes in 1842 wrote of "lines of motion". Rankine used "stream-line" in 1868, defining it as "the line, whether straight or curved, that is traced by a particle in a current of fluid", and Lamb's <i>Treatise</i> (1879) likewise tied the term to particle paths in steady motion. The modern instantaneous definition, which also applies to unsteady flow, came later.</aside>

<h2 id="material-derivative">The material derivative</h2>

<p>Put one thermometer on a pier and another on a boat drifting with the current. The pier's thermometer reports how the temperature changes at one place. The boat's thermometer reports how the temperature of one parcel of water changes. The two rates differ, and the difference is simple to work out.</p>

<p>A boat at position $\mathbf{X}(t)$ measures $T(\mathbf{X}(t), t)$. Differentiating with respect to time by the chain rule and substituting $\mathrm{d}\mathbf{X}/\mathrm{d}t = \mathbf{u}$ from (2.1) gives</p>

<div class="eq" id="eq-ddt">$$\begin{aligned} \frac{\mathrm{D}T}{\mathrm{D}t} &\equiv \frac{\mathrm{d}}{\mathrm{d}t}\,T\big(\mathbf{X}(t), t\big) \\ {} &= \underbrace{\frac{\partial T}{\partial t}}_{\text{local}} + \underbrace{\mathbf{u}\cdot\nabla T}_{\text{convective}}. \end{aligned}$$<span class="eq-tag">(2.4)</span></div>

<p>This operator is the <dfn data-term="material-derivative">material derivative</dfn>, giving the rate of change experienced by a moving parcel. The first term $\partial T/\partial t$ is the local rate of change at a fixed point, as measured at the pier; the second term $\mathbf{u}\cdot\nabla T$ is the convective rate of change due to the parcel's motion across spatial gradients of $T$. Three cases illustrate how the two terms combine:</p>

<ul>
<li>A warm patch stays put while the water flows through it. The pier sees no change ($\partial T/\partial t = 0$), whereas the boat warms and cools as it crosses the patch, so its temperature change is purely convective.</li>
<li>The warm patch drifts with the water, as a patch of warm water would if nothing mixed it. Now the boat sees no change, $\mathrm{D}T/\mathrm{D}t = 0$, while the pier watches the patch go by. The local and convective terms are equal and opposite.</li>
<li>The sun warms all the water at a rate $\beta$. That adds $\beta$ to both rates, and the boat feels exactly $\beta$ if the patch also drifts with the water.</li>
</ul>

<p>When every parcel preserves its temperature as it moves ($\mathrm{D}T/\mathrm{D}t = 0$), $T$ satisfies the advection equation $\partial T/\partial t + \mathbf{u}\cdot\nabla T = 0$. Although trivial to solve along known parcel trajectories, the advection equation is notoriously difficult to discretise accurately on a fixed Eulerian grid, as examined in <a href="#/advection/characteristics">chapter 7</a>.</p>

<figure data-widget="viewpoints-dDt" data-preset="fixed" class="wide"><figcaption>A warm patch in a river (uniform flow) or a whirlpool (solid-body rotation). The square is a thermometer on a pier; the dot is one on a boat drifting with the water. The bars split the boat's rate of change into the local part $\partial T/\partial t$, the convective part $\mathbf{u}\cdot\nabla T$ and their sum $\mathrm{D}T/\mathrm{D}t$, all computed from the fields at the boat. The thin tick on the sum bar is computed directly by finite-differencing the boat's temperature history over time. The plot shows both records. Drag the square to move the pier.</figcaption></figure>

<div class="try"><ol>
<li>With $k = 0$ the patch stays put. The pier's record is flat; the boat's rises and falls. The local bar is empty and the convective bar equals the sum.</li>
<li>Set $k = 1$ so that the patch drifts with the water. Now the boat's record is flat and the pier's rises and falls. The local and convective bars are equal and opposite, and the sum is zero.</li>
<li>Keep $k = 1$ and turn on the sunshine, $\beta = 0.3$. The sum bar reads exactly 0.3 at every moment, wherever the boat is.</li>
<li>Try $k = 0.5$, or the whirlpool. In every case the tick matches the end of the sum bar, confirming that the Eulerian expansion (2.4) agrees with the rate measured along the boat's trajectory.</li>
</ol></div>

<div data-quiz="q3"></div>

<p>The same operator applies to anything a parcel carries, including its own velocity. The acceleration of a parcel, the quantity Newton's second law is about, is</p>

<div class="eq" id="eq-accel">$$\mathbf{a} = \frac{\mathrm{D}\mathbf{u}}{\mathrm{D}t} = \frac{\partial\mathbf{u}}{\partial t} + (\mathbf{u}\cdot\nabla)\,\mathbf{u}.$$<span class="eq-tag">(2.5)</span></div>

<p>The convective term $(\mathbf{u}\cdot\nabla)\mathbf{u}$ explains why parcels accelerate in the cylinder flow even when the field is steady, as they move between regions of different speed. Because the velocity multiplies its own gradient, the term is quadratic in $\mathbf{u}$—the nonlinearity that makes waves steepen into shocks (<a href="#/shocks/burgers">chapter 8</a>) and flows break up into turbulence (<a href="#/turbulence/what-is-turbulence">chapter 14</a>). <a href="#/conservation/momentum">Chapter 3</a> sets (2.5) equal to the forces on a parcel.</p>

<details class="deeper"><summary>Go deeper: the material derivative is a derivative at fixed label</summary>
<p>In the Lagrangian description a quantity is a function $f(\mathbf{a}, t)$ of the label and time, and the rate a parcel feels is simply $\partial f/\partial t$ at fixed $\mathbf{a}$. In the Eulerian description the same quantity is $F(\mathbf{x}, t)$, with $f(\mathbf{a}, t) = F(\mathbf{X}(\mathbf{a}, t), t)$. Differentiating at fixed $\mathbf{a}$,</p>
<p>$$\begin{aligned} \left.\frac{\partial f}{\partial t}\right|_{\mathbf{a}} &= \left.\frac{\partial F}{\partial t}\right|_{\mathbf{x}} + \sum_{i} \frac{\partial F}{\partial x_i}\,\left.\frac{\partial X_i}{\partial t}\right|_{\mathbf{a}} \\ {} &= \frac{\partial F}{\partial t} + \mathbf{u}\cdot\nabla F. \end{aligned}$$</p>
<p>So $\mathrm{D}/\mathrm{D}t$ is the Lagrangian time derivative written in Eulerian variables. That matches Stokes's definition of the symbol (see below) as differentiation with time and the particle's labels as the independent variables, "and not $t, x, y, z$".</p>
</details>

<aside class="history" data-era="1845">The capital D is Stokes's. In his paper on the friction of fluids (read 14 April 1845, printed 1847) he wrote ordinary partial derivatives with a plain d, so he needed a different letter for the rate following a particle: "where D is used, as it will be in the rest of this paper, to denote differentiation in which the independent variables are t and three parameters of the particle considered, (such for instance as its initial co-ordinates,) and not t, x, y, z" <a href="#src-stokes">[6]</a>. The operator itself, combining local change and convective terms, had already appeared in Euler's equations (presented 1755, printed 1757), and is variously called the material, substantial, convective, or Lagrangian derivative.</aside>

<aside class="who" data-person="george-gabriel-stokes">Derived the viscous equations of motion from the rate at which a fluid element deforms (read 1845, printed 1847), and introduced $\mathrm{D}/\mathrm{D}t$ in the same paper. The rate of deformation is the subject of the next section.</aside>

<h2 id="deformation">What a small parcel does</h2>

<p>Zoom in on one small parcel. Across a small enough distance the velocity changes linearly, so a point at offset $\mathbf{r}$ from the parcel's centre $\mathbf{x}$ moves at</p>

<div class="eq" id="eq-taylor">$$\mathbf{u}(\mathbf{x} + \mathbf{r}) \approx \mathbf{u}(\mathbf{x}) + (\nabla\mathbf{u})\,\mathbf{r}.$$<span class="eq-tag">(2.6)</span></div>

<p>Here $\nabla\mathbf{u}$ is the velocity-gradient matrix, with rows $(\partial u/\partial x,\; \partial u/\partial y)$ and $(\partial v/\partial x,\; \partial v/\partial y)$. While $\mathbf{u}(\mathbf{x})$ translates the parcel as a whole, the four entries of $\nabla\mathbf{u}$ govern its rotation, stretching, and expansion. Decomposing $\nabla\mathbf{u}$ into symmetric and antisymmetric parts separates these effects:</p>

<div class="eq" id="eq-split">$$\begin{aligned} \nabla\mathbf{u} &= \mathbf{S} + \mathbf{W}, \\ \mathbf{S} &= \tfrac12\big(\nabla\mathbf{u} + \nabla\mathbf{u}^{\top}\big), \\ \mathbf{W} &= \tfrac12\big(\nabla\mathbf{u} - \nabla\mathbf{u}^{\top}\big), \\ \mathbf{W}\mathbf{r} &= \tfrac12\omega\,(-r_y,\; r_x), \\ \omega &= \frac{\partial v}{\partial x} - \frac{\partial u}{\partial y}. \end{aligned}$$<span class="eq-tag">(2.7)</span></div>

<p>The antisymmetric part $\mathbf{W}$ moves the point at $\mathbf{r}$ perpendicular to $\mathbf{r}$ in proportion to $|\mathbf{r}|$, producing a rigid rotation at angular velocity $\omega/2$. The number $\omega$ is the <dfn data-term="vorticity">vorticity</dfn>, twice the local rate of spin. In three dimensions it is a vector, $\boldsymbol{\omega} = \nabla\times\mathbf{u}$; in a plane flow only its component out of the plane survives, which is the $\omega$ above. A small paddle wheel carried by the flow would turn at $\omega/2$.</p>

<p>The symmetric part $\mathbf{S}$ is the strain-rate tensor, and it holds all the deformation. Its trace is the <dfn data-term="divergence">divergence</dfn>,</p>

<div class="eq" id="eq-area">$$\begin{aligned} \nabla\cdot\mathbf{u} &= \frac{\partial u}{\partial x} + \frac{\partial v}{\partial y} = \operatorname{tr}\mathbf{S} \\ {} &= \frac{1}{A}\frac{\mathrm{D}A}{\mathrm{D}t}, \end{aligned}$$<span class="eq-tag">(2.8)</span></div>

<p>the rate at which a parcel's area $A$ grows, per unit area (its volume, in three dimensions). What is left of $\mathbf{S}$ once the trace is removed stretches the parcel along one axis and squeezes it along the perpendicular axis at the same rate, so it changes the parcel's shape without changing its area. That rate,</p>

<p>$$\begin{aligned} \sigma &= \sqrt{e_1^2 + e_2^2}, \\ e_1 &= \tfrac12\big(\partial u/\partial x - \partial v/\partial y\big), \\ e_2 &= \tfrac12\big(\partial u/\partial y + \partial v/\partial x\big), \end{aligned}$$</p>

<p>is the <dfn data-term="strain-rate">strain rate</dfn> of the parcel, and the stretching axis lies along an eigenvector of $\mathbf{S}$. So a small parcel does four things: it moves ($\mathbf{u}$), spins ($\omega$), swells or shrinks ($\nabla\cdot\mathbf{u}$) and changes shape ($\sigma$). In <a href="#/continuum/deforms">chapter 1</a> the shear rate of a sliding layer was $\dot\gamma = \mathrm{d}u/\mathrm{d}y$; that layer has $\omega = -\dot\gamma$ and $\sigma = \dot\gamma/2$, half spin and half strain.</p>

<table>
<caption>Five simple flows, each the velocity field near one point</caption>
<thead><tr><th>Flow</th><th>Velocity</th><th class="num">$\nabla\cdot\mathbf{u}$</th><th class="num">$\omega$</th><th class="num">$\sigma$</th></tr></thead>
<tbody>
<tr><td>Rotation</td><td>$\Omega\,(-y,\; x)$</td><td class="num">0</td><td class="num">$2\Omega$</td><td class="num">0</td></tr>
<tr><td>Shear</td><td>$(\dot\gamma\, y,\; 0)$</td><td class="num">0</td><td class="num">$-\dot\gamma$</td><td class="num">$\dot\gamma/2$</td></tr>
<tr><td>Strain</td><td>$(a x,\; -a y)$</td><td class="num">0</td><td class="num">0</td><td class="num">$a$</td></tr>
<tr><td>Vortex, outside its core</td><td>$u_\theta = \Gamma/2\pi r$</td><td class="num">0</td><td class="num">0</td><td class="num">$\Gamma/2\pi r^2$</td></tr>
<tr><td>Expansion</td><td>$\tfrac12 c\,(x,\; y)$</td><td class="num">$c$</td><td class="num">0</td><td class="num">0</td></tr>
</tbody>
</table>

<p>Notice the contrast between simple shear and the irrotational vortex in the table. Simple shear, where horizontal layers slide along straight lines, has nonzero vorticity ($\omega = -\dot\gamma$) because the faster upper edge tips an upright fluid line clockwise while the horizontal line stays flat. Conversely, outside the core of a point vortex the fluid moves along circular streamlines with zero vorticity ($\omega = 0$), because each parcel is sheared in the opposite sense at the same rate as its orbital motion turns it—keeping its average orientation fixed like a Ferris-wheel gondola, as shown in the figure below.</p>

<figure data-widget="viewpoints-deform" data-preset="shear" class="wide"><figcaption>A small circle of fluid (shaded) carried by one of five flows, with two of its diameters drawn as material lines. The cross at its centre is a small rigid paddle that turns at $\omega/2$. Arrows at the centre show the stretching and squeezing axes when there is strain. The readouts give $\nabla\cdot\mathbf{u}$, $\omega$ and $\sigma$ at the centre, the parcel's area relative to its start, and how far the paddle and the two diameters have turned. Drag the parcel to start it somewhere else.</figcaption></figure>

<div class="try"><ol>
<li>In simple shear, the horizontal diameter stays horizontal while the vertical one tips over by 68° at $t = 2.5$. The paddle turns steadily at $\omega/2 = -0.5$, which is 72° by then, between the two. The area stays at 1.</li>
<li>In pure strain, the paddle does not rotate at all, while the circle deforms into a long thin ellipse. The area still stays at 1, because $\nabla\cdot\mathbf{u} = 0$.</li>
<li>In the point vortex (outside its core), the parcel orbits the centre while the paddle keeps its orientation and $\omega$ reads 0.</li>
<li>Inside the source core, $\nabla\cdot\mathbf{u} = 1$, so the area grows as $e^{t}$ (reaching 2.718 at $t = 1$) without rotation.</li>
<li>In solid-body rotation, both diameters and the paddle rotate rigidly together at 360° per revolution without stretching.</li>
</ol></div>

<div data-quiz="q4"></div>

<p>This decomposition underpins two key steps in the chapters ahead. First, because rigid rotation ($\mathbf{W}$) produces no relative deformation between neighbouring fluid elements, viscous stresses can depend only on the symmetric strain-rate tensor $\mathbf{S}$, which determines the form of the viscous term in the Navier–Stokes equations (<a href="#/conservation/navier-stokes">chapter 3</a>). Second, (2.8) shows that when $\nabla\cdot\mathbf{u} = 0$, every fluid parcel preserves its area (or volume in three dimensions) regardless of how strongly it is stretched or sheared. Enforcing this kinematic incompressibility constraint (<a href="#/conservation/mass">chapter 3</a>) on a discrete grid is the central problem of Part III, beginning in <a href="#/pressure/constraint">chapter 10</a>.</p>

<details class="deeper"><summary>Go deeper: why the divergence is the rate of area growth</summary>
<p>Take a small parallelogram of fluid spanned by two short material vectors $\mathbf{p}$ and $\mathbf{q}$. By (2.6) each one changes as $\mathrm{D}\mathbf{p}/\mathrm{D}t = (\nabla\mathbf{u})\,\mathbf{p}$. Its area is the cross product $A = p_x q_y - p_y q_x$, so</p>
<p>$$\begin{aligned} \frac{\mathrm{D}A}{\mathrm{D}t} &= \big((\nabla\mathbf{u})\mathbf{p}\big)\times\mathbf{q} + \mathbf{p}\times\big((\nabla\mathbf{u})\mathbf{q}\big) \\ {} &= \operatorname{tr}(\nabla\mathbf{u})\,(\mathbf{p}\times\mathbf{q}) \\ {} &= (\nabla\cdot\mathbf{u})\,A. \end{aligned}$$</p>
<p>The middle step is an identity for any 2×2 matrix $\mathbf{M}$: $(\mathbf{M}\mathbf{p})\times\mathbf{q} + \mathbf{p}\times(\mathbf{M}\mathbf{q}) = (\operatorname{tr}\mathbf{M})\,\mathbf{p}\times\mathbf{q}$, which you can check by writing out the components. The off-diagonal entries of $\mathbf{M}$ cancel; only the diagonal, the trace, survives. A large parcel is a sum of small ones, so the same holds for any parcel. In three dimensions the same argument with a box and its triple product gives the rate of volume growth. Euler derived the continuity condition in a memoir read in 1752 (printed 1761) in essentially this way, by following a small triangle and a small pyramid of fluid.</p>
</details>

<aside class="pitfall">Watch for a factor of two when you read older texts. Lamb's $\xi, \eta, \zeta$ and the "Wirbel" of Prandtl's 1904 paper ($w = \tfrac12\operatorname{rot} v$) are angular velocities, half of the modern vorticity $\omega = \nabla\times\mathbf{u}$. Copying a classical result without checking the convention gives answers out by exactly 2.</aside>

<aside class="who" data-person="hermann-von-helmholtz">His 1858 paper on vortex motion split the local motion of a fluid element into translation, rotation and deformation, as in (2.7), and proved that in an ideal fluid vortex lines move with the fluid.</aside>

<aside class="who" data-person="william-thomson-kelvin">Defined the circulation, the line integral of velocity round a closed curve, and proved that in an ideal fluid "the circulation in any closed line moving with the fluid, remains constant through all time" (read 1867, printed 1868–69). The closed line is a material loop like the ones in the figures. By Stokes's theorem its circulation is the vorticity integrated over the area inside it.</aside>

<h2 id="tracking">Following a particle on a computer</h2>

<p>Every pathline, streakline and material loop in this chapter was computed by solving (2.1), $\mathrm{d}\mathbf{X}/\mathrm{d}t = \mathbf{u}(\mathbf{X}, t)$, numerically, one particle at a time. The simplest way is to take the current velocity and move in a straight line along it for a short time $\Delta t$:</p>

<div class="eq" id="eq-euler">$$\mathbf{X}^{n+1} = \mathbf{X}^{n} + \Delta t\,\mathbf{u}\big(\mathbf{X}^{n}, t^{n}\big).$$<span class="eq-tag">(2.9)</span></div>

<p>This is the explicit (forward) Euler method, whose local truncation error per step is $\mathcal{O}(\Delta t^2)$. Applied to solid-body rotation $\mathbf{u} = \Omega\,(-y, x)$, where every exact trajectory is a circle, each step advances the particle along the tangent to its current circle. Because the tangent of length $r\,\Omega\Delta t$ is perpendicular to the radius $r$, the new radius by Pythagoras's theorem is</p>

<div class="eq" id="eq-growth">$$\begin{gathered} r^{n+1} = |G|\,r^{n}, \\ |G| = \sqrt{1 + (\Omega\Delta t)^2} \;>\; 1. \end{gathered}$$<span class="eq-tag">(2.10)</span></div>

<p>Because $|G| &gt; 1$ for every $\Delta t &gt; 0$, the particle spirals outward regardless of how small the time step is made. At $\Omega\Delta t = 0.2$, each step multiplies the radius by 1.0198; one revolution (31.4 steps) multiplies it by 1.85, and 100 steps (just over three turns) enlarge it by a factor of 7.1. A closed ring of particles expands even faster, its enclosed area growing as $|G|^{2n}$—by $1.04^{100} \approx 50.5$ over 100 steps—even though $\nabla\cdot\mathbf{u} = 0$ and the exact area is constant by (2.8). Since the radial amplification per revolution is approximately $e^{\pi\Omega\Delta t}$, halving $\Delta t$ only replaces the per-turn factor by its square root (from ×1.85 to ×1.37, then ×1.17). Explicit Euler converges at first order as $\Delta t \to 0$ by slowing the outward drift rather than eliminating it, making it the first entry in the <a href="#/pathologies">gallery of pathologies</a>.</p>

<figure data-widget="viewpoints-integrators" data-preset="broken" class="wide"><figcaption>A particle (solid track) and a small ring of particles (shaded) stepped round solid-body rotation with $\Omega = 1$, starting at radius 1. Dashed: the exact circle and where the ring should be. The open ring on the circle marks where the particle should be now. The plot shows the radius and the ring's area relative to their starting values on a log axis, traced (solid) and predicted from the one-step factor $|G|$ (dashed and dotted), up to $\Omega t = 20$, just over three turns.</figcaption></figure>

<div data-quiz="q5"></div>

<div class="try"><ol>
<li>With explicit Euler at $\Omega\Delta t = 0.2$, by $\Omega t = 20$ the radius is 7.11 times too large and the ring's area is 50.5 times too large. The traced lines sit on the predictions $|G|^n$ and $|G|^{2n}$.</li>
<li>Slide the step down to 0.05. The spiral is slower, ×1.17 per turn, but $|G|$ still reads above 1.</li>
<li>Switch to midpoint at 0.2. After 100 steps the radius is 1.0202—barely visible on the circle, though $|G| = \sqrt{1 + (\Omega\Delta t)^4/4}$ still exceeds 1 and drifts outward over longer runs.</li>
<li>Switch to RK4. Now $|G|$ is just below 1, and the drift is too small to see. Slide the step up past $2\sqrt2 \approx 2.83$ and RK4 spirals out too. At $\Omega\Delta t = 2$ it is stable but loses 95% of the radius by $\Omega t = 20$.</li>
<li>Switch to implicit midpoint and set the step to 2. The radius remains 1 and the ring preserves its area, but each step advances the angle by $2\arctan(1) = 90^\circ$ instead of $2\ \text{rad} \approx 114.6^\circ$, illustrating how an unconditionally stable step can still have a large phase error.</li>
</ol></div>

<p>The pattern in those numbers has a simple explanation. In complex form, $z = x + iy$, solid-body rotation is $\mathrm{d}z/\mathrm{d}t = i\Omega z$, and any Runge–Kutta method multiplies $z$ by a fixed number $G = R(i\Omega\Delta t)$ each step, where $R$ is a polynomial or rational function that belongs to the method. A pure rotation sits on the imaginary axis, and the question is whether $|R|$ is above or below 1 there:</p>

<table>
<caption>One-step factor in solid-body rotation, $w = \Omega\Delta t$</caption>
<thead><tr><th>Method</th><th>$|G|$</th><th>Behaviour</th></tr></thead>
<tbody>
<tr><td>Explicit Euler</td><td>$\sqrt{1 + w^2}$</td><td>1.0198 at $w = 0.2$; spirals out at every step size</td></tr>
<tr><td>Midpoint (RK2)</td><td>$\sqrt{1 + w^4/4}$</td><td>1.0002 at $w = 0.2$; spirals out, slowly</td></tr>
<tr><td>Classical RK4</td><td>$\sqrt{1 - \tfrac{w^6}{72} + \tfrac{w^8}{576}}$</td><td>spirals in for $w &lt; 2\sqrt2$, out above</td></tr>
<tr><td>Implicit midpoint</td><td>$1$</td><td>keeps the radius; turns by $2\arctan(w/2)$ instead of $w$</td></tr>
</tbody>
</table>

<p>This stability analysis recurs twice in Part II. In <a href="#/advection/ftcs">chapter 7</a>, combining forward Euler with a centred spatial difference produces purely imaginary eigenvalues for every Fourier mode, causing unconditional amplification for the same reason. In <a href="#/stiffness/stiffness">chapter 9</a>, the curves $|R(z)| = 1$ define the stability regions of time-stepping schemes in the complex plane. In any two-dimensional incompressible flow ($\nabla\cdot\mathbf{u} = 0$), the stream function $\psi$ acts as a Hamiltonian for the parcel coordinates $(x, y)$, and because the implicit midpoint rule is a symplectic integrator, it preserves parcel areas up to the tolerance of the nonlinear solve required at each step <a href="#src-hlw">[11]</a>, placing its truncation error entirely in the phase.</p>

<p>Particle tracking is not a side issue. Particle methods such as SPH (<a href="#/lattice-particles/sph">chapter 13</a>) move every particle with an integrator like these at every step, and semi-Lagrangian advection (<a href="#/stable-fluids/semi-lagrangian">chapter 12</a>) traces a path backwards from every grid cell at every step. One explicit Euler step backwards in a vortex lands outside the circle by the same factor $\sqrt{1 + (\Omega\Delta t)^2}$, so the cell is filled from the wrong place.</p>

<aside class="pitfall">Euler orbit drift: particles traced with explicit Euler spiral out of any rotating flow, and clouds and loops of tracers swell although $\nabla\cdot\mathbf{u} = 0$. A smaller step only slows it. Use RK4 for tracing, or a symplectic method when areas must be kept over long runs. See the <a href="#/pathologies">gallery</a>.</aside>

<h2 id="sources">Sources and further reading</h2>

<ol class="refs">
<li id="src-batchelor">G. K. Batchelor (1967). <i>An Introduction to Fluid Dynamics</i>. Cambridge University Press. Ch. 2: Lagrangian and Eulerian descriptions, the material derivative, streamlines, and the analysis of the relative motion near a point (§2.3).</li>
<li id="src-kundu">P. K. Kundu, I. M. Cohen and D. R. Dowling (2016). <i>Fluid Mechanics</i>, 6th ed. Academic Press. Ch. 3: kinematics, including streamlines, pathlines and streaklines in unsteady flow.</li>
<li id="src-darrigol">O. Darrigol and U. Frisch (2008). From Newton's mechanics to Euler's equations. <i>Physica D</i> 237, 1855–1869. The history of Euler's hydrodynamics, including his river memoir and his derivation of continuity.</li>
<li id="src-euler">L. Euler (1757). Principes généraux du mouvement des fluides. <i>Mémoires de l'Académie des Sciences de Berlin</i> 11 (for 1755), 274–315. English translation: General principles of the motion of fluids, <i>Physica D</i> 237 (2008), 1825–1839; arXiv:0802.2383.</li>
<li id="src-frisch-hankel">U. Frisch, G. Grimberg and B. Villone (2017). A contemporary look at Hermann Hankel's 1861 pioneering work on Lagrangian fluid dynamics. <i>European Physical Journal H</i> 42, 537–556. Source of the translation of Lagrange (1788, p. 453) and of Riemann's credit to Euler.</li>
<li id="src-stokes">G. G. Stokes (1847). On the theories of the internal friction of fluids in motion, and of the equilibrium and motion of elastic solids. <i>Transactions of the Cambridge Philosophical Society</i> 8, 287–319 (read 14 April 1845). Reprinted in <i>Mathematical and Physical Papers</i>, vol. 1 (1880), 75–129; D/Dt on p. 91.</li>
<li id="src-helmholtz">H. Helmholtz (1858). Über Integrale der hydrodynamischen Gleichungen, welche den Wirbelbewegungen entsprechen. <i>Journal für die reine und angewandte Mathematik</i> 55, 25–55.</li>
<li id="src-kelvin">W. Thomson (1869). On vortex motion. <i>Transactions of the Royal Society of Edinburgh</i> 25, 217–260 (read 29 April 1867).</li>
<li id="src-lamb">H. Lamb (1932). <i>Hydrodynamics</i>, 6th ed. Cambridge University Press. The derivative following the motion, and the component angular velocities $\xi, \eta, \zeta$, half of the modern vorticity.</li>
<li id="src-shadden">S. C. Shadden, F. Lekien and J. E. Marsden (2005). Definition and properties of Lagrangian coherent structures from finite-time Lyapunov exponents in two-dimensional aperiodic flows. <i>Physica D</i> 212, 271–304. The double-gyre flow used in the figures.</li>
<li id="src-hlw">E. Hairer, C. Lubich and G. Wanner (2006). <i>Geometric Numerical Integration</i>, 2nd ed. Springer. Symplectic integrators, the implicit midpoint rule, and area preservation.</li>
<li id="src-hnw">E. Hairer, S. P. Nørsett and G. Wanner (1993). <i>Solving Ordinary Differential Equations I: Nonstiff Problems</i>, 2nd ed. Springer. Runge–Kutta methods and their stability functions.</li>
</ol>
`,
  widgets: {
    'viewpoints-two-views': mountTwoViews,
    'viewpoints-lines': mountLines,
    'viewpoints-dDt': mountDdt,
    'viewpoints-deform': mountDeform,
    'viewpoints-integrators': mountIntegrators,
  },
  quizzes: {
    q1: {
      type: 'mcq',
      q: 'The flow past a cylinder is steady: $\\partial\\mathbf{u}/\\partial t = 0$ everywhere. Does a parcel that passes over the top of the cylinder accelerate?',
      choices: [
        'No, because steady means that no velocity changes',
        'Yes, because it moves to places where the velocity is different, so $(\\mathbf{u}\\cdot\\nabla)\\mathbf{u} \\ne 0$',
        'Only if the fluid is viscous',
        'Only its direction changes, never its speed',
      ],
      answer: 1,
      explain: 'Steady is a statement about fixed points. A parcel feels $\\mathrm{D}\\mathbf{u}/\\mathrm{D}t = \\partial\\mathbf{u}/\\partial t + (\\mathbf{u}\\cdot\\nabla)\\mathbf{u}$, and the second term is not zero. In the first figure the parcel speeds up from about 0.83 to 1.59 over the cylinder while the sensor reads a constant. Both its speed and its direction change.',
    },
    q2: {
      type: 'predict',
      q: 'In the swinging stream $\\mathbf{u} = (U, V\\sin\\omega t)$ every streamline is straight at every instant. Before you play it: what shape does the dye from a fixed nozzle make?',
      choices: [
        'A straight line through the nozzle, tilting back and forth with the streamlines',
        'A wave that travels downstream',
        'A straight horizontal line, because the sideways velocity averages to zero',
        'A circle',
      ],
      answer: 1,
      explain: 'Each blob of dye retains the transverse displacement $-(V/\\omega)(\\cos\\omega t - \\cos\\omega t_0)$ integrated along its trajectory since its release time $t_0$. Because parcels released at different times $t_0$ have experienced different phases of the oscillating cross-flow, their positions at a single instant $t$ form a sinusoid of wavelength $2\\pi U/\\omega$ convected downstream at speed $U$, whereas the instantaneous streamlines depend only on $\\mathbf{u}(\\mathbf{x}, t)$ at time $t$.',
    },
    q3: {
      type: 'num',
      q: 'A river flows east at 0.5 m/s. Downstream the water gets warmer by 0.2 °C per kilometre. At a fixed point on the bank the temperature is rising by 0.36 °C per hour. At what rate does a thermometer drifting with the water warm, in °C per hour?',
      answer: 0.72,
      tol: 0.02,
      unit: '°C/h',
      explain: 'The convective rate is $\\mathbf{u}\\cdot\\nabla T = 0.5 \\times 0.0002 = 10^{-4}$ °C/s (0.36 °C/h) as the drifter is carried into warmer water. Adding the local rate of 0.36 °C/h gives $\\mathrm{D}T/\\mathrm{D}t = 0.72$ °C/h; if the river flowed west into colder water at the same speed, the local and convective terms would cancel.',
    },
    q4: {
      type: 'mcq',
      q: 'Outside its core, the fluid round a vortex moves in circles with $u_\\theta = \\Gamma/(2\\pi r)$. What is the vorticity there?',
      choices: [
        '$\\Gamma/(\\pi r^2)$, twice the angular velocity $u_\\theta/r$ of the orbit',
        'Zero',
        'Negative, because the speed falls with radius',
        'It cannot be defined, because the flow is curved',
      ],
      answer: 1,
      explain: 'Vorticity measures the local angular velocity of a parcel about its own centre. Here the orbital motion turns a radial material line one way at rate $u_\\theta/r$, while the faster inner streamlines shear a circumferential line the opposite way at the same rate, giving $\\omega = \\frac{1}{r}\\frac{\\mathrm{d}(r u_\\theta)}{\\mathrm{d}r} = 0$ outside the core while straining the parcel at rate $\\sigma = \\Gamma/(2\\pi r^2)$.',
    },
    q5: {
      type: 'predict',
      q: 'At $\\Omega\\Delta t = 0.2$, explicit Euler makes the particle spiral out by a factor of 1.85 per turn. You halve the step to 0.1. Per turn, the radius now grows by about…',
      choices: [
        '1, because the step is now small enough',
        '1.37, the square root of 1.85',
        '1.85 again, the same growth per turn reached in twice as many steps',
        '0.93, spiralling inwards instead',
      ],
      answer: 1,
      explain: 'Per turn the growth is $(1 + w^2)^{\\pi/w} \\approx e^{\\pi w}$ with $w = \\Omega\\Delta t$, so halving $w$ halves the exponent and takes the square root (1.367). That is first-order convergence: the growth tends to 1 as $\\Delta t \\to 0$, though $|G| = \\sqrt{1 + w^2}$ exceeds 1 at every finite step. Check it with the slider.',
    },
  },
  glossary: {
    lagrangian: {
      term: 'Lagrangian description',
      def: 'Describing a flow by following individual fluid parcels, each labelled (usually by its starting position $\\mathbf{a}$), and recording its position $\\mathbf{X}(\\mathbf{a}, t)$ and properties over time. Particle methods such as SPH are Lagrangian. Euler used this description first, while Lagrange recommended the fixed-point form for fluids.',
      section: 'lagrangian-eulerian',
    },
    eulerian: {
      term: 'Eulerian description',
      def: 'Describing a flow by fields, such as velocity $\\mathbf{u}(\\mathbf{x}, t)$ and pressure $p(\\mathbf{x}, t)$, recorded at fixed points in space. Grid-based solvers are Eulerian, computing fluxes as fluid moves through fixed cells.',
      section: 'lagrangian-eulerian',
    },
    streamline: {
      term: 'streamline',
      def: 'A curve tangent to the velocity at every point at one instant, $\\mathrm{d}x/u = \\mathrm{d}y/v$ with $t$ fixed. In two-dimensional incompressible flow, a contour of the stream function. It coincides with pathlines and streaklines only in steady flow.',
      section: 'lines',
    },
    pathline: {
      term: 'pathline',
      def: 'The track of one fluid parcel over time, found by solving $\\mathrm{d}\\mathbf{X}/\\mathrm{d}t = \\mathbf{u}(\\mathbf{X}, t)$. A long exposure of one marked particle shows it.',
      section: 'lines',
    },
    streakline: {
      term: 'streakline',
      def: 'At one instant, the curve formed by all the parcels that have passed through a given fixed point, as dye from a nozzle or smoke from a chimney shows. Most dye and smoke photographs of flow show streaklines.',
      section: 'lines',
    },
    'material-derivative': {
      term: 'material derivative',
      def: 'The rate of change following a fluid parcel, $\\mathrm{D}/\\mathrm{D}t = \\partial/\\partial t + \\mathbf{u}\\cdot\\nabla$, combining the local rate of change at a fixed point with the convective rate of change due to motion across spatial gradients. Stokes introduced the symbol D (read 1845, printed 1847) for the operator that had appeared in Euler\'s equations of 1755.',
      section: 'material-derivative',
    },
    vorticity: {
      term: 'vorticity',
      def: 'The curl of the velocity, $\\boldsymbol{\\omega} = \\nabla\\times\\mathbf{u}$; in a plane flow the single number $\\omega = \\partial v/\\partial x - \\partial u/\\partial y$. It is twice the local rate of spin of a small parcel. A flow can go round in circles with zero vorticity (outside a vortex core), and a straight shear flow has vorticity.',
      section: 'deformation',
    },
    'strain-rate': {
      term: 'strain rate',
      def: 'How fast a small parcel of fluid changes shape. It is held in the strain-rate tensor $\\mathbf{S} = \\tfrac12(\\nabla\\mathbf{u} + \\nabla\\mathbf{u}^{\\top})$, the symmetric part of the velocity gradient; for a sliding layer it is the shear rate $\\dot\\gamma = \\mathrm{d}u/\\mathrm{d}y$. Viscous stress in a Newtonian fluid is proportional to it.',
      section: 'deformation',
    },
    divergence: {
      term: 'divergence',
      def: 'For a velocity field, $\\nabla\\cdot\\mathbf{u} = \\partial u/\\partial x + \\partial v/\\partial y\\,(+\\,\\partial w/\\partial z)$, the trace of the velocity gradient. It is the rate at which a small parcel\'s area (or volume) grows, per unit area. Incompressible flow has $\\nabla\\cdot\\mathbf{u} = 0$.',
      section: 'deformation',
    },
  },
  pathologies: [
    {
      id: 'euler-orbit-drift',
      name: 'Euler orbit drift',
      family: 'stability',
      symptom: 'Particles traced through a vortex or any rotating flow spiral outwards. Rings and clouds of tracers swell although the flow is divergence-free. A smaller time step slows the drift but never stops it.',
      cause: 'Explicit Euler moves each particle along the tangent to its path, and the tangent leads outside a circle. In solid-body rotation each step multiplies the radius by $|G| = \\sqrt{1 + (\\Omega\\Delta t)^2}$, which exceeds 1 at every step size because forward Euler amplifies purely imaginary eigenvalues.',
      diagnose: 'Trace a particle in solid-body rotation, or round any closed streamline, and plot its radius against time on a log axis. Euler drift is a straight line rising by $\\tfrac12\\log(1 + (\\Omega\\Delta t)^2)$ per step, while a ring\'s area grows as $|G|^{2n}$ (×50.5 after 100 steps at $\\Omega\\Delta t = 0.2$). Halving $\\Delta t$ takes the square root of the growth per turn.',
      mitigations: [
        'Use classical RK4, which has $|G| &lt; 1$ for $\\Omega\\Delta t &lt; 2\\sqrt2$ and negligible amplitude drift at moderate step sizes, requiring four velocity evaluations per step.',
        'Use a second-order Runge–Kutta method such as explicit midpoint, which requires two evaluations per step and reduces the radial growth factor to $|G| = \\sqrt{1 + (\\Omega\\Delta t)^4/4}$, though it still drifts outwards over long integrations.',
        'Reduce the time step or add adaptive error control, bearing in mind that explicit Euler converges only at first order as $\\Delta t \\to 0$.',
        'Use a symplectic integrator such as implicit midpoint, which gives $|G| = 1$ in linear flows and preserves area in any 2-D incompressible flow, requiring a nonlinear solve per step and placing its truncation error in the phase.',
        'Where the local motion is a known rotation, apply an exponential integrator to rotate the position directly using the local angular velocity.',
      ],
      section: 'tracking',
      demo: { widget: 'viewpoints-integrators', data: { preset: 'broken' } },
    },
  ],
  css: `
.chapter[data-chapter="viewpoints"] .vp-side { display: grid; gap: 8px; min-width: 0; align-content: start; }
.chapter[data-chapter="viewpoints"] .vp-sw { display: inline-block; width: 18px; height: 4px; border-radius: 2px; margin-right: 6px; vertical-align: middle; background: var(--s1); }
.chapter[data-chapter="viewpoints"] .vp-sw.s2 { background: var(--s2); }
.chapter[data-chapter="viewpoints"] .vp-sw.s3 { background: var(--s3); }
.chapter[data-chapter="viewpoints"] .prose th, .chapter[data-chapter="viewpoints"] .prose td { padding: 7px 8px; }
.chapter[data-chapter="viewpoints"] table caption { caption-side: top; text-align: left; color: var(--muted); font-size: 0.9rem; padding-bottom: 4px; }
`,
};
