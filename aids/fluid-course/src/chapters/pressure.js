// Chapter 10: The pressure puzzle. Incompressibility as a constraint, the
// Helmholtz–Hodge decomposition and projection, the compatibility condition,
// the collocated checkerboard and the staggered MAC grid, and the other
// roads (artificial compressibility, weakly compressible methods, SIMPLE).
// Widgets live in ./pressure/; the chapter's own kernel is
// ../sims/ch-pressure-compat.js (tests: tests/fluid-course/ch-pressure.test.js).

import { mountPush } from './pressure/push.js';
import { mountHodge } from './pressure/hodge.js';
import { mountProjection } from './pressure/project.js';
import { mountCompat } from './pressure/compat.js';
import { mountCheckerboard } from './pressure/checker.js';
import { mountMacCell } from './pressure/maccell.js';
import { mountRhieChow } from './pressure/rhiechow.js';

export const chapter = {
  id: 'pressure',
  title: 'The pressure puzzle',
  short: 'Pressure',
  blurb: 'Incompressibility as a constraint, projection, the Helmholtz–Hodge decomposition, and the checkerboard trap.',
  minutes: 40,
  html: String.raw`
<p class="lead-in">In a gas, pressure is easy to understand. Squeeze the gas and it pushes back, and an equation of state tells you by how much. In water at everyday speeds there is almost no squeezing, and the equations of incompressible flow have no equation for pressure at all. Yet pressure is still there, and it is what makes a whole tank of water move when you push one side of it. This chapter is about that puzzle. Pressure turns out to be a constraint force: whatever it must be to stop the fluid from compressing. Computing it means splitting every flow into two parts, solving a Poisson equation at every time step, paying attention to the boundaries, and choosing where on the grid each number lives. Get the last choice wrong and the pressure fills with a checkerboard pattern that the velocity cannot even see.</p>

<h2 id="constraint">Pressure without an equation</h2>

<p>Start from the equations of an <dfn data-term="incompressible">incompressible</dfn> fluid of constant density $\rho$: the <a href="#/conservation/navier-stokes">Navier–Stokes momentum equation</a> and the condition that the velocity has no <dfn data-term="divergence">divergence</dfn>, which is <a href="#/conservation/mass">the continuity equation</a> when density cannot change.</p>

<div class="eq" id="eq-ns">$$\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u}\cdot\nabla)\mathbf{u} = -\frac{1}{\rho}\nabla p + \nu\nabla^2\mathbf{u} + \mathbf{f}, \qquad \nabla\cdot\mathbf{u} = 0$$<span class="eq-tag">(10.1)</span></div>

<p>Count the unknowns: three velocity components and the <dfn data-term="pressure">pressure</dfn>. Count the equations: three momentum equations and one constraint. The numbers match, but look at the roles. The momentum equation says how $\mathbf{u}$ changes in time. The constraint has no time derivative at all, and nothing anywhere says how $p$ changes in time. There is no equation of state, because the density does not vary. In a compressible gas, pressure follows from density and temperature. Here it follows from nothing but the requirement that $\nabla\cdot\mathbf{u}$ stay zero.</p>

<p>Mechanics has a name for a quantity like that. A bead threaded on a curved wire feels a force from the wire. No law gives that force in advance: it is whatever it must be to keep the bead on the wire, and it is always at right angles to the wire, so it does no work along it. That force is a Lagrange multiplier. Pressure plays the same part for an incompressible fluid. The "wire" is the set of all velocity fields with zero divergence, and the pressure gradient is the push that keeps the flow on it. You will see in the next section that the push is at right angles to that set in a precise sense.</p>

<p>You can still get an equation for $p$. Take the divergence of the momentum equation. The time-derivative term becomes $\partial(\nabla\cdot\mathbf{u})/\partial t$, which must vanish; the viscous term vanishes too. What is left is a <dfn data-term="pressure-poisson">pressure Poisson equation</dfn>:</p>

<div class="eq" id="eq-ppe">$$\nabla^2 p = -\rho\,\frac{\partial u_j}{\partial x_i}\frac{\partial u_i}{\partial x_j} + \rho\,\nabla\cdot\mathbf{f}$$<span class="eq-tag">(10.2)</span></div>

<p>(with a sum over repeated indices). It is an elliptic equation: the pressure at every point depends on the velocity everywhere at the same instant. Information about a push reaches the far side of the tank immediately. That is the incompressible limit of a real fluid, in which sound would carry the news at a speed much larger than the flow, so that the <dfn data-term="mach-number">Mach number</dfn> is close to zero (see <a href="#/similarity/numbers">the named numbers</a>). Infinite sound speed is exactly what makes pressure a constraint rather than a state.</p>

<figure data-widget="pressure-push"><figcaption>A sealed square box of still water, 48 × 48 cells. Drag across it to give the water a push $\mathbf{u}^*$ (a blob of velocity along your stroke). With the projection on, the pressure field (colour) is computed so that the new velocity (arrows) has no divergence. With it off you see the raw push, coloured by the divergence it would cause.</figcaption></figure>

<div class="try"><ol>
<li>Look at the default push to the right. Read <em>share of box moving</em>: about 7% of the box before the projection, about 86% after. The pressure is high ahead of the push and low behind it, and the whole box circulates back around.</li>
<li>Untick <em>Enforce incompressibility</em> and colour by divergence. A push alone piles fluid up ahead of the blob and empties it behind: divergence up to about 12 per unit time. The projection takes it to about $10^{-7}$.</li>
<li>Read <em>kinetic energy kept</em>: about 48%. Half the energy of a local push in two dimensions goes into squeezing, and the pressure removes it. Drag your own pushes: the share is always about half away from the walls.</li>
<li>Push towards a wall. The pressure builds against the wall, and the water turns aside along it.</li>
</ol></div>

<div data-quiz="q1"></div>

<details class="deeper"><summary>Go deeper: the divergence of the momentum equation, and why codes do not use (10.2) directly</summary>
<p>Take $\partial/\partial x_i$ of the $i$-th momentum equation and sum. Derivatives commute, so $\partial_i \partial_t u_i = \partial_t(\nabla\cdot\mathbf{u}) = 0$ and $\partial_i \nabla^2 u_i = \nabla^2(\nabla\cdot\mathbf{u}) = 0$. The advection term gives $\partial_i(u_j\partial_j u_i) = (\partial_i u_j)(\partial_j u_i) + u_j\partial_j(\partial_i u_i)$, and the last part is zero. That leaves (10.2).</p>
<p>Notice what was used: $\nabla\cdot\mathbf{u} = 0$ at the current time. Equation (10.2) only says that the divergence does not <em>change</em>. A computer never has exactly zero divergence, and errors in $\nabla\cdot\mathbf{u}$ would then sit there or slowly accumulate, with nothing to remove them. So practical codes keep the time derivative: they ask for a pressure that makes the divergence zero at the end of the step, starting from whatever it is now. That is the projection method of the next sections, and (10.2) is its continuous limit.</p>
</details>

<aside class="note" data-label="Energy">Why half? In an unbounded domain a push of fixed direction, written as Fourier modes, keeps only the part of each mode at right angles to its wavevector. Averaged over all directions, that keeps $1/2$ of the energy in two dimensions and $2/3$ in three. The walls of the box change the figure slightly.</aside>

<h2 id="hodge">Every flow is two flows</h2>

<p>Here is the idea that turns the pressure puzzle into an algorithm. Any reasonable velocity field $\mathbf{w}$ on a domain can be split, in exactly one way, into a part with no divergence and a part that is the gradient of a scalar:</p>

<div class="eq" id="eq-hodge">$$\mathbf{w} = \mathbf{u} + \nabla\phi, \qquad \nabla\cdot\mathbf{u} = 0, \qquad \mathbf{u}\cdot\mathbf{n} = 0 \text{ on the boundary}$$<span class="eq-tag">(10.3)</span></div>

<p>This is the <dfn data-term="helmholtz-hodge">Helmholtz–Hodge decomposition</dfn>. On a periodic domain the boundary condition is replaced by periodicity, and a uniform mean flow counts with the <dfn data-term="divergence-free">divergence-free</dfn> part. The two parts have opposite characters. A gradient field $\nabla\phi$ has no curl: it is all sources and sinks, flow spreading out of high $\phi$ and into low $\phi$, with no swirl. The divergence-free part $\mathbf{u}$ is all swirl and through-flow, and no fluid is created or destroyed anywhere in it. The <dfn data-term="vorticity">vorticity</dfn> of $\mathbf{w}$ lives entirely in $\mathbf{u}$, and its divergence entirely in $\nabla\phi$.</p>

<p>Finding the split costs one Poisson equation. Take the divergence of (10.3): $\nabla^2\phi = \nabla\cdot\mathbf{w}$. Solve that for $\phi$, with $\partial\phi/\partial n = \mathbf{w}\cdot\mathbf{n}$ at walls, and subtract $\nabla\phi$ from $\mathbf{w}$. What remains is $\mathbf{u}$.</p>

<p>The two parts are also orthogonal. Multiply them and integrate over the domain; integration by parts moves the gradient onto $\mathbf{u}$:</p>

<div class="eq" id="eq-orth">$$\int \mathbf{u}\cdot\nabla\phi\,\mathrm{d}V = \oint \phi\,\mathbf{u}\cdot\mathbf{n}\,\mathrm{d}S - \int \phi\,\nabla\cdot\mathbf{u}\,\mathrm{d}V = 0, \qquad\text{so}\qquad \int |\mathbf{w}|^2 = \int |\mathbf{u}|^2 + \int |\nabla\phi|^2$$<span class="eq-tag">(10.4)</span></div>

<p>Energies add, like the squares of the sides of a right-angled triangle. So removing the gradient part is an orthogonal projection: of all divergence-free fields, $\mathbf{u}$ is the one closest to $\mathbf{w}$. That gives the Lagrange multiplier of the last section a precise form. Minimise $\tfrac12\int|\mathbf{u} - \mathbf{w}|^2$ subject to $\nabla\cdot\mathbf{u} = 0$:</p>

<div class="eq" id="eq-min">$$\mathbf{u} = \arg\min_{\nabla\cdot\mathbf{v} = 0}\ \tfrac12\!\int|\mathbf{v} - \mathbf{w}|^2\,\mathrm{d}V \quad\Longrightarrow\quad \mathbf{u} - \mathbf{w} + \nabla\lambda = 0$$<span class="eq-tag">(10.5)</span></div>

<p>The multiplier $\lambda$ for the constraint is $\phi$. In a time step of length $\Delta t$ it will be $\Delta t\,p/\rho$: the pressure is, quite literally, the Lagrange multiplier of incompressibility. Projecting twice changes nothing, and a projection can only remove energy, never add it.</p>

<figure data-widget="pressure-hodge" class="wide"><figcaption>A periodic square, 40 × 40 cells. Top: your field $\mathbf{w}$, coloured by its divergence; drag on it with the chosen brush. Bottom left: the divergence-free part $\mathbf{u}$, coloured by vorticity. Bottom right: the gradient part $\nabla\phi$, coloured by $\phi$. Arrows use one scale in all three panels.</figcaption></figure>

<div class="try"><ol>
<li>The starting field is a swirl, a source and a sink, all on top of each other. Read the energy line: about 78% of the energy sits in the divergence-free part and 22% in the gradient part, and the cross term is about $10^{-13}$ of the total. The swirl went left, the source and sink went right.</li>
<li>Read the divergence of each part: the original field has divergence up to about 11, the divergence-free part about $10^{-9}$ (the solver tolerance). The curl of the gradient part is zero to rounding.</li>
<li>Press <em>Clear</em>, choose the <em>swirl</em> brush and paint. Everything lands bottom left. Now choose <em>source</em>: everything lands bottom right.</li>
<li>Choose <em>push</em> and drag a straight stroke. A push is neither: it splits into a swirling pair of eddies (left) and a source–sink dipole (right), with energies close to half and half.</li>
</ol></div>

<aside class="history" data-era="1849">The decomposition is older than its name. <a href="#/people/george-gabriel-stokes">Stokes</a> split a vector field into a gradient and a divergence-free part in a paper read to the Cambridge Philosophical Society on 26 November 1849, nine years before <a href="#/people/hermann-von-helmholtz">Helmholtz</a>'s 1858 paper on vortex motion. Hodge's name comes from the much later generalisation to differential forms. Fluid analysts also call the projection the Leray projection, after <a href="#/people/jean-leray">Jean Leray</a>'s 1934 paper on viscous flow, and the form used for the Navier–Stokes equations is often credited to <a href="#/people/olga-ladyzhenskaya">Ladyzhenskaya</a>.</aside>

<aside class="who" data-person="hermann-von-helmholtz">His 1858 paper on vortex motion separated a flow into a rotational part and an irrotational part with a potential. The decomposition carries his name even though Stokes had it first.</aside>

<details class="deeper"><summary>Go deeper: why the split is unique</summary>
<p>Suppose $\mathbf{w} = \mathbf{u}_1 + \nabla\phi_1 = \mathbf{u}_2 + \nabla\phi_2$. Then $\mathbf{u}_1 - \mathbf{u}_2 = \nabla(\phi_2 - \phi_1)$ is both divergence-free (with zero normal component at walls) and a gradient. By (10.4) it is orthogonal to itself, so its integral of squares is zero, and it vanishes. On a periodic domain the same argument works once the mean flow is assigned to $\mathbf{u}$: a uniform flow has no divergence and no curl, yet it is not the gradient of any periodic $\phi$, so it belongs with $\mathbf{u}$. On the MAC grid of this chapter the same holds exactly for the discrete operators, because the discrete gradient is minus the transpose of the discrete divergence. That is why the widget's cross term is at rounding level rather than at truncation-error level.</p>
</details>

<div data-quiz="q2"></div>

<h2 id="projection">Predict, solve, correct</h2>

<p>The <dfn data-term="projection-method">projection method</dfn> turns the decomposition into a time step. First, ignore the pressure and the constraint and advance the velocity with everything else: advection, viscosity and forces. Call the result $\mathbf{u}^*$. It is a perfectly good velocity field except that it has divergence. Then project: find the pressure whose gradient removes exactly the gradient part of $\mathbf{u}^*$, and subtract it.</p>

<div class="eq" id="eq-proj">$$\begin{aligned} \mathbf{u}^* &= \mathbf{u}^n + \Delta t\left(-(\mathbf{u}^n\cdot\nabla)\mathbf{u}^n + \nu\nabla^2\mathbf{u}^n + \mathbf{f}\right) \\ \nabla^2 p^{n+1} &= \frac{\rho}{\Delta t}\,\nabla\cdot\mathbf{u}^* \\ \mathbf{u}^{n+1} &= \mathbf{u}^* - \frac{\Delta t}{\rho}\,\nabla p^{n+1} \end{aligned}$$<span class="eq-tag">(10.6)</span></div>

<p>Predict, solve, correct. The middle line, a large sparse linear system with one unknown per cell, is almost all of the cost; <a href="#/solvers/the-system">the next chapter</a> is about solving it. The first line can use any scheme: the <a href="#/stable-fluids/splitting">stable fluids</a> step is this recipe with semi-Lagrangian advection.</p>

<aside class="who" data-person="alexandre-chorin">A student of Peter Lax at New York University (PhD 1966), Chorin announced the method in a short note in the Bulletin of the American Mathematical Society in 1967 and gave the full account in Mathematics of Computation in 1968. It is often dated 1968 for that reason.</aside>

<aside class="who" data-person="roger-temam">Independently of Chorin, Temam published a fractional-step method for the Navier–Stokes equations in 1969, in two papers that also proved it converges. That is why the method is often called the Chorin–Temam projection.</aside>

<p><strong>Boundaries.</strong> At a solid wall the corrected velocity must satisfy $\mathbf{u}^{n+1}\cdot\mathbf{n} = \mathbf{u}_b\cdot\mathbf{n}$, with $\mathbf{u}_b$ the wall's velocity. The normal component of the last line of (10.6) then fixes $\partial p/\partial n$, not $p$: a Neumann condition, usually $\partial p/\partial n = 0$ because $\mathbf{u}^*$ already has the wall's normal velocity. At an open boundary into a reservoir the pressure itself is known (a Dirichlet condition).</p>

<p><strong>The compatibility condition.</strong> In a box with walls on every side, integrate the pressure equation over the whole box. The divergence theorem turns the left side into the boundary integral of $\partial p/\partial n$, which the walls fix:</p>

<div class="eq" id="eq-compat">$$\oint \frac{\partial p}{\partial n}\,\mathrm{d}S = \int \nabla^2 p\,\mathrm{d}V = \frac{\rho}{\Delta t}\int \nabla\cdot\mathbf{u}^*\,\mathrm{d}V \quad\Longleftrightarrow\quad \oint \mathbf{u}_b\cdot\mathbf{n}\,\mathrm{d}S = 0$$<span class="eq-tag">(10.7)</span></div>

<p>This <dfn data-term="compatibility-condition">compatibility condition</dfn> is just conservation of volume: an incompressible fluid in a sealed box can take in only as much as it lets out. On the grid it becomes $\sum_c b_c = 0$ for the right-hand side $b$. There is a second, gentler fact: with Neumann conditions all round, adding a constant to $p$ changes nothing, because only $\nabla p$ enters the velocity. The discrete matrix has the constant vector in its null space. A solution exists only if $b$ is compatible, and then it is unique only up to that constant. Solvers handle the constant by fixing the mean of $p$, or by simply ignoring it.</p>

<figure data-widget="pressure-projection" data-preset="incomplete" class="wide"><figcaption>One projection on a MAC grid: a 64 × 32 channel with a disc, inflow at speed 0.5 on the left, an open boundary on the right. Left: the velocity before ($\mathbf{u}^*$) or after, with tracers or arrows. Right: the relative residual $\|\nabla\cdot\mathbf{u}\|_2/\|\nabla\cdot\mathbf{u}^*\|_2$ against iterations; the dashed line is your budget.</figcaption></figure>

<div class="try"><ol>
<li>The preset allows Jacobi only 10 iterations. Read the residual: about 0.36, so a third of the divergence is still there. Press Play: the tracers bunch up in front of the disc and thin out elsewhere. This is an <a href="#/pathologies">incomplete projection</a>.</li>
<li>Drag the iterations to 100, then 1000. Jacobi reaches about 0.13, then 0.03, and still has not finished. Gauss–Seidel is not much better.</li>
<li>Switch to conjugate gradients: about 220 iterations to reach $10^{-12}$. Multigrid: about $10^{-10}$ after 10 iterations.</li>
<li>Show <em>u* (before)</em> coloured by divergence: that is what the projection removes. After a full solve the pressure is high in front of the disc and low behind it.</li>
</ol></div>

<p>Jacobi and Gauss–Seidel fix the divergence cell by cell, and information crawls one cell per sweep; <a href="#/solvers/smoothing">chapter 11</a> explains why. The separate <a data-aid="pressure-solver">pressure-solver aid</a> shows the solvers step by step.</p>

<p>Now break the compatibility condition on purpose. Water enters a sealed box through its left wall at speed 1, and you set how fast it leaves through the right wall. Two Jacobi solvers run side by side: the raw iteration, and one that first removes the mean of $b$, as practical solvers do.</p>

<figure data-widget="pressure-compat" data-preset="incompatible" class="wide"><figcaption>A 24 × 24 box. Left: the shape of the pressure (its mean subtracted) after the current number of Jacobi sweeps ($\omega = 0.8$), with the velocity it produces. Right: both solvers' relative residual (dotted: the raw solver's floor) and mean pressure level, against sweeps.</figcaption></figure>

<div class="try"><ol>
<li>With no outflow, $\sum b \neq 0$ and no pressure exists. The raw residual stalls at about 0.20 while the mean pressure climbs in a straight line: about 0.36, 0.73 and 1.09 after 1000, 2000 and 3000 sweeps.</li>
<li>The other solver converges, but read <em>divergence left in every cell</em>: $-1$. The inflow has nowhere to go, so the error is spread evenly over the box.</li>
<li>Drag the outflow to 1: the books balance and both solvers converge to the same pressure.</li>
<li>Choose <em>open</em> for the right side. The outside pressure fixes the level and gives the fluid a way out.</li>
</ol></div>

<aside class="pitfall">An incompatible right-hand side usually comes from boundary data: an inflow with no matching outflow, or inconsistent moving walls. The pressure level drifts and the solver never meets its tolerance. See the <a href="#/pathologies">gallery entry</a> on Neumann incompatibility.</aside>

<details class="deeper"><summary>Go deeper: why the raw iteration drifts, and the residual floor</summary>
<p>Write the pressure system as $A\mathbf{x} = \mathbf{b}$, with $A$ the discrete $-\nabla^2$ (symmetric, with the constant vector $\mathbf{1}$ in its null space, so $\mathbf{1}^{\mathsf T}A = 0$). For any $\mathbf{x}$ the residual $\mathbf{r} = \mathbf{b} - A\mathbf{x}$ has $\mathbf{1}^{\mathsf T}\mathbf{r} = \mathbf{1}^{\mathsf T}\mathbf{b}$. A vector of $N$ entries with a fixed sum is shortest when all entries are equal, so $\|\mathbf{r}\|_2 \ge |\bar b|\sqrt{N}$: the floor in the figure. Weighted Jacobi updates $\mathbf{x} \leftarrow \mathbf{x} + \omega D^{-1}\mathbf{r}$, with $D$ the diagonal of $A$, so the weighted sum $\mathbf{d}^{\mathsf T}\mathbf{x}$ changes by exactly $\omega\,\mathbf{1}^{\mathsf T}\mathbf{r} = \omega\sum_c b_c$ every sweep. The shape settles while the level rises without end.</p>
</details>

<div data-quiz="q3"></div>

<h2 id="checkerboard">The checkerboard trap</h2>

<p>So far the grid has quietly been a staggered one. To see why, try the obvious alternative: a <dfn data-term="collocated-grid">collocated grid</dfn>, with $u$, $v$ and $p$ all stored at the same point, the centre of each cell (one of the <a href="#/discretization/grids">ways to store a function</a>). Centred differences are second-order accurate and symmetric, so use them for both the gradient and the divergence:</p>

<div class="eq" id="eq-central">$$(\mathrm{G}_c p)_{i,j} = \left(\frac{p_{i+1,j} - p_{i-1,j}}{2h},\ \frac{p_{i,j+1} - p_{i,j-1}}{2h}\right), \qquad (\mathrm{D}_c\mathbf{u})_{i,j} = \frac{u_{i+1,j} - u_{i-1,j}}{2h} + \frac{v_{i,j+1} - v_{i,j-1}}{2h}$$<span class="eq-tag">(10.8)</span></div>

<p>Each <dfn data-term="stencil">stencil</dfn> skips the cell it is computed at and reads cells two apart. Now add the <dfn data-term="checkerboard">checkerboard</dfn> pattern $p_{i,j} = a(-1)^{i+j}$ to any pressure. Cells $i+1$ and $i-1$ always have the same colour on a chessboard, so they get the same added value, and the difference is zero: $\mathrm{G}_c$ of the checkerboard vanishes everywhere. The checkerboard is a pressure with no force. The velocity cannot feel it, so nothing in the equations can control it. The same holds for the stripes $(-1)^i$ and $(-1)^j$.</p>

<p>Look at the pressure equation this grid produces. Projecting with $\mathrm{D}_c$ and $\mathrm{G}_c$ needs $\mathrm{D}_c\mathrm{G}_c p = \mathrm{D}_c\mathbf{u}^*/\Delta t$ (with $\rho = 1$), and that operator is a wide Laplacian:</p>

<div class="eq" id="eq-wide">$$(\mathrm{D}_c\mathrm{G}_c p)_{i,j} = \frac{p_{i+2,j} - 2p_{i,j} + p_{i-2,j}}{4h^2} + \frac{p_{i,j+2} - 2p_{i,j} + p_{i,j-2}}{4h^2}$$<span class="eq-tag">(10.9)</span></div>

<p>It couples each cell only to cells two away. Colour the cells by the parity of $(i, j)$: even–even, odd–even, even–odd, odd–odd. Each of the four classes talks only to itself. The one grid has fallen apart into four interleaved grids, each with spacing $2h$, each with its own pressure, and with nothing tying their levels or shapes together. On a periodic grid each sub-grid has its own constant in the null space, so $\mathrm{D}_c\mathrm{G}_c$ has a four-dimensional null space instead of one. Any noise at the grid scale in $\mathbf{u}^*$ is free to set the four sub-grids differently, and the pressure you see is speckled with odd–even patterns. That is the <a href="#/pathologies">checkerboard pressure</a> pathology. The velocity can look perfectly reasonable while it happens.</p>

<figure data-widget="pressure-checkerboard" class="wide"><figcaption>A periodic grid of 16 × 16 cells. Top: a smooth pressure hill plus $a$ times an odd–even pattern; the four marker shapes show the four parity sub-grids. Bottom: the $x$-component of the pressure force $-\partial p/\partial x$ as each grid computes it, on the same colour scale. The collocated grid uses (10.8) at the centres; the staggered grid uses the compact difference at the vertical faces.</figcaption></figure>

<div class="try"><ol>
<li>With the checkerboard at $a = 0.3$, the top panel is speckled but the collocated force (bottom left) is just the smooth hill's force. Read the largest change in that force: zero, to rounding error near $10^{-15}$.</li>
<li>The staggered force (bottom right) changes by 9.6, which is $2a/h$ with $h = 1/16$: it sees every jump between neighbours.</li>
<li>Switch to stripes, then to <em>one sub-grid</em> (a bump on every fourth cell). The collocated force still does not change at all; the staggered one changes by $a/h$.</li>
<li>Drag $a$ to zero and back. Whatever you do, the left panel never moves. Find the cells marked with circles: in the collocated stencil they only ever talk to other circles.</li>
</ol></div>

<div data-quiz="q4"></div>

<aside class="who" data-person="olga-ladyzhenskaya">Her name is on the inf-sup (Ladyzhenskaya–Babuška–Brezzi) condition, which says which pairs of velocity and pressure discretisations are stable. Pairs that fail it, like the collocated one here, admit spurious pressure modes such as the checkerboard.</aside>

<details class="deeper"><summary>Go deeper: the checkerboard in Fourier terms</summary>
<p>On a periodic grid put $p_{i,j} = e^{\mathrm{i}(i\theta_x + j\theta_y)}$. The central gradient multiplies it by $\mathrm{i}\sin\theta_x/h$ and $\mathrm{i}\sin\theta_y/h$, and the wide Laplacian by $-(\sin^2\theta_x + \sin^2\theta_y)/h^2$. Both vanish when $\sin\theta_x = \sin\theta_y = 0$, that is for $\theta_x, \theta_y \in \{0, \pi\}$: the constant, the two stripes and the checkerboard. The compact five-point Laplacian has symbol $-4(\sin^2\tfrac{\theta_x}{2} + \sin^2\tfrac{\theta_y}{2})/h^2$, which vanishes only at $\theta = 0$. The difference between the two symbols is largest exactly at the grid scale, where the wide operator is blind.</p>
</details>

<h2 id="mac">Staggering the grid</h2>

<p>The cure is to store the velocity components somewhere else. On a <dfn data-term="staggered-grid">staggered grid</dfn> the pressure stays at the cell centre, but $u$ lives at the middle of the left and right faces of each cell and $v$ at the middle of the bottom and top faces. Each velocity component sits exactly where a difference of two neighbouring pressures is centred, and each cell's divergence is built from the four velocities on its own faces:</p>

<div class="eq" id="eq-mac">$$(\mathrm{G}p)_{i+\frac12,j} = \frac{p_{i+1,j} - p_{i,j}}{h}, \qquad (\mathrm{D}\mathbf{u})_{i,j} = \frac{u_{i+\frac12,j} - u_{i-\frac12,j} + v_{i,j+\frac12} - v_{i,j-\frac12}}{h}$$<span class="eq-tag">(10.10)</span></div>

<p>Both stencils are compact: they span one cell, not two. Their product $\mathrm{D}\mathrm{G}$ is the ordinary five-point Laplacian, which couples every cell to its four nearest neighbours. Neighbouring cells always have opposite checkerboard colours, so the gradient of $a(-1)^{i+j}$ is $\pm 2a/h$, as large as it can be. There is no hiding place left: the only pressure with no force is a constant. The divergence $\mathrm{D}$ is also exactly a finite-volume flux balance for the cell (see <a href="#/conservation/finite-volume">finite volumes</a>), so the projection conserves volume cell by cell. On this grid $\mathrm{G} = -\mathrm{D}^{\mathsf T}$, which is why the decomposition earlier came out exactly orthogonal.</p>

<figure data-widget="pressure-mac-cell"><figcaption>Where each number lives: pressures at the dots, $u$ (horizontal arrows) on vertical faces, $v$ (vertical arrows) on horizontal faces; on the collocated grid all sit at the centre. Tap a cell or face, or use the arrow keys. The value written is outlined in the write colour, the values read are in the read colour.</figcaption></figure>

<div class="try"><ol>
<li>On the staggered grid, gradient of $p$: tap a vertical face. The stencil reads the two pressures on either side, half a cell from the face. Drag the checkerboard to 0.5: the result changes by exactly $2a/h = 1$.</li>
<li>Switch to the collocated grid. The stencil now writes at a centre and reads the cells two apart, skipping its own pressure. Drag the checkerboard: the result does not change.</li>
<li>Choose <em>divergence of u</em>. Staggered: it reads the cell's own four faces. Collocated: the neighbours' velocities, never the cell's own.</li>
</ol></div>

<p>The staggered layout is called the <dfn data-term="mac-grid">MAC grid</dfn>, after the marker-and-cell method of <a href="#/people/francis-harlow">Francis Harlow</a> and <a href="#/people/j-eddie-welch">J. Eddie Welch</a> at Los Alamos, published in Physics of Fluids in December 1965. Their abstract names its primary variables, "the pressure and the velocity components", and the marker particles that "move with the fluid". The method solved a Poisson equation for the pressure every step, two years before Chorin's note. The grid-based fluid solvers of computer graphics descend directly from it.</p>

<aside class="history" data-era="1965">The name tells you what Harlow and Welch thought was new: the markers, massless particles carried by the flow that show where the fluid is, so that free surfaces could be followed. Today "MAC grid" usually means only the staggered arrangement of $u$, $v$ and $p$, and the markers have become a separate subject. Accounts of the staggered layout follow later descriptions; the course has checked only the paper's abstract.</aside>

<aside class="who" data-person="francis-harlow">His Los Alamos group created the particle-in-cell method in the mid-1950s and, with Welch, the marker-and-cell method in 1965.</aside>

<p>Staggering has costs. Every term that mixes velocity components (advection, particle interpolation, curved walls) needs averaging, and on unstructured meshes the bookkeeping becomes painful. Many engineering codes therefore keep every variable at the cell centre and repair the coupling instead. The standard repair is <dfn data-term="rhie-chow">Rhie–Chow interpolation</dfn>: velocities are still stored at centres, but the fluxes through faces, which the continuity equation actually needs, are interpolated so that they feel the compact pressure difference across the face.</p>

<div class="eq" id="eq-rc">$$u_{i+\frac12} = \overline{u}_{i+\frac12} - d_{i+\frac12}\left(\frac{p_{i+1} - p_i}{h} - \overline{(\mathrm{G}_c p)}_{i+\frac12}\right)$$<span class="eq-tag">(10.11)</span></div>

<p>Here the bars are averages of the two neighbouring centre values and $d$ is a coefficient from the discrete momentum equation ($\Delta t/\rho$ in a projection). For a smooth pressure the bracket is $O(h^2)$, a small correction. For a checkerboard it is $2a/h$, so the face flux reacts to exactly the pattern the centred gradient misses, and the pressure equation for the face fluxes is the compact one again.</p>

<figure data-widget="pressure-rhie-chow" class="wide"><figcaption>Three ways to project a velocity stored at cell centres, on a periodic grid. <em>Exact</em> solves the wide-stencil equation (10.9); <em>approximate</em> solves with the compact five-point Laplacian and subtracts the central gradient; <em>Rhie–Chow</em> interpolates face velocities and projects them exactly. Left: the pressure, with the projected velocity. Right: the central divergence left behind, on the scale of the divergence before.</figcaption></figure>

<div class="try"><ol>
<li>Start with <em>exact</em> and the one-cell kick. The central divergence is gone (about $10^{-12}$ of the start), but 75% of the pressure is odd–even: the kick landed on one sub-grid only.</li>
<li>Switch to <em>approximate</em>. The pressure is smooth (about 25% odd–even, from the kick's own sharpness), but 60% of the central divergence is left: the compact operator is not $\mathrm{D}_c\mathrm{G}_c$.</li>
<li>Switch to <em>Rhie–Chow</em>. The face divergence is about $10^{-12}$ and the pressure is smooth. The centre velocities are those of the approximate projection; what is exact is the face flux.</li>
<li>Choose the smooth start: approximate leaves about 12% of the divergence at 16 × 16 and 3% at 32 × 32. The error is $O(h^2)$.</li>
</ol></div>

<aside class="who" data-person="rhie-chow">Their paper, presented in June 1982 and published in the AIAA Journal in November 1983, computed turbulent flow past an airfoil with trailing-edge separation on a collocated grid. The interpolation was a means to that end; the title says nothing about it.</aside>

<aside class="pitfall">The original form has known flaws: its converged solution can depend on the under-relaxation factor (Majumdar 1988) and, in unsteady use, on the time step. Miller and Schmidt (1988) reported that "in regions of very rapidly varying pressure gradients, PWIM" (the pressure-weighted interpolation method) "can predict physically unrealistic convective velocities". Modern codes use corrected variants.</aside>

<div data-quiz="q5"></div>

<h2 id="other-roads">Other roads to incompressibility</h2>

<p>Projection is not the only way to keep a fluid incompressible. Three other families are worth knowing, because you will meet them in other chapters and in other people's codes.</p>

<p><strong>Artificial compressibility.</strong> In the same year as his projection note, Chorin proposed the opposite idea for steady flows. If you only want the steady state, you do not care how the flow gets there. So give the fluid a fake compressibility, march it in pseudo-time, and let the fake sound waves carry the pressure information until nothing changes any more. In his words, "The principle of the method lies in the introduction of an artificial compressibility δ into the equations of motion, in such a way that the final results do not depend on δ." In the form usually written today the continuity equation is replaced by</p>

<div class="eq" id="eq-ac">$$\frac{\partial p}{\partial \tau} + \frac{1}{\delta}\,\nabla\cdot\mathbf{u} = 0$$<span class="eq-tag">(10.12)</span></div>

<p>with $\tau$ a pseudo-time and $1/\sqrt{\delta}$ playing the part of an artificial sound speed. When the solution stops changing, $\partial p/\partial\tau = 0$ and the constraint holds exactly. <dfn data-term="artificial-compressibility">Artificial compressibility</dfn> needs no Poisson solve, only explicit or implicit marching of a hyperbolic system. For unsteady flows it is wrapped inside each physical step and iterated to convergence there (dual time stepping).</p>

<p><strong>Weakly compressible methods.</strong> The other way round is to keep a real equation of state but make the sound speed $c$ large enough that the density barely changes. Bernoulli's balance gives pressure changes of order $\rho U^2$, and a stiff equation of state turns those into density changes:</p>

<div class="eq" id="eq-wc">$$\frac{\delta\rho}{\rho} \approx \frac{\delta p}{\rho c^2} \sim \frac{U^2}{c^2} = \mathrm{Ma}^2, \qquad \Delta t \lesssim \frac{h}{c + U}$$<span class="eq-tag">(10.13)</span></div>

<p>With $c$ ten times the fastest flow, the density varies by about 1%. The price is the time step, set by sound rather than by the flow, so ten times smaller than the flow alone would need. <dfn data-term="weakly-compressible">Weakly compressible</dfn> methods are the natural choice where a global Poisson solve is awkward: smoothed particle hydrodynamics (<dfn data-term="sph">SPH</dfn>) with its <dfn data-term="tait-equation">Tait equation of state</dfn>, and the <dfn data-term="lattice-boltzmann">lattice Boltzmann</dfn> method, which is compressible by construction and only nearly incompressible at low Mach number. Chapter 13 covers both (<a href="#/lattice-particles/sph">SPH</a>, <a href="#/lattice-particles/lbm">lattice Boltzmann</a>, and <a href="#/lattice-particles/lbm-limits">its compressibility error</a>).</p>

<p><strong>Pressure correction (SIMPLE).</strong> Engineering finite-volume codes for steady flow mostly use the SIMPLE family, the Semi-Implicit Method for Pressure-Linked Equations. Guess a pressure, solve the momentum equations, then solve a pressure-correction equation derived from continuity, correct the velocities and the pressure, and repeat. Each outer iteration is a projection with simplified momentum coefficients (the neighbour corrections are dropped, which is the "semi" in the name), so the pressure correction must be under-relaxed. Variants (SIMPLER, SIMPLEC, PISO) trade more work per iteration for fewer iterations. That under-relaxation is the factor on which the original Rhie–Chow form could depend.</p>

<aside class="who" data-person="suhas-patankar">With Brian Spalding he published the pressure-correction procedure behind SIMPLE in 1972. His 1980 book Numerical Heat Transfer and Fluid Flow made finite volumes on staggered grids with SIMPLE-type correction the standard engineering approach.</aside>

<aside class="history" data-era="1972">Citations for SIMPLE vary. The 1972 International Journal of Heat and Mass Transfer paper by Patankar and <a href="#/people/brian-spalding">Spalding</a> treats three-dimensional parabolic, or marching, flows. The version for recirculating flows is usually cited to Caretto, Gosman, Patankar and Spalding, presented at the third International Conference on Numerical Methods in Fluid Mechanics in 1972 and published in 1973. SIMPLER is dated 1979 in some accounts and presented in Patankar's 1980 book.</aside>

<table>
<thead><tr><th>Approach</th><th>What enforces $\nabla\cdot\mathbf{u} = 0$</th><th>Typical use</th><th>Price</th></tr></thead>
<tbody>
<tr><td>Projection (Chorin–Temam)</td><td>a pressure Poisson solve every step</td><td>unsteady flow, graphics</td><td>one elliptic solve per step</td></tr>
<tr><td>Artificial compressibility</td><td>pseudo-time marching to a steady state</td><td>steady flow; dual time stepping</td><td>many pseudo-steps; only the converged state is incompressible</td></tr>
<tr><td>Weakly compressible (SPH, LBM)</td><td>a stiff equation of state</td><td>free surfaces, particles, GPUs</td><td>small steps; density error about $\mathrm{Ma}^2$; acoustic noise</td></tr>
<tr><td>Pressure correction (SIMPLE family)</td><td>a correction equation inside outer iterations</td><td>steady industrial finite-volume CFD</td><td>under-relaxation; many outer iterations</td></tr>
</tbody>
</table>

<p>All four share the core fact of this chapter: in an incompressible fluid the pressure is a constraint, not a state, and somewhere every method pays to enforce it. Projection pays with a Poisson solve every step. The next chapter is about making that solve fast: <a href="#/solvers/multigrid">multigrid</a> and <a href="#/solvers/krylov">conjugate gradients</a> turn the hundreds of Jacobi iterations above into a handful. It also covers <a href="#/solvers/cost">what a loose tolerance costs</a>, which is the incomplete projection seen here.</p>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>F. H. Harlow and J. E. Welch, "Numerical calculation of time-dependent viscous incompressible flow of fluid with free surface", <em>Physics of Fluids</em> 8(12), 2182–2189 (December 1965). doi:10.1063/1.1761178.</li>
<li>A. J. Chorin, "The numerical solution of the Navier–Stokes equations for an incompressible fluid", <em>Bulletin of the American Mathematical Society</em> 73(6), 928–931 (1967). doi:10.1090/S0002-9904-1967-11853-6.</li>
<li>A. J. Chorin, "Numerical solution of the Navier–Stokes equations", <em>Mathematics of Computation</em> 22(104), 745–762 (1968). doi:10.1090/S0025-5718-1968-0242392-2.</li>
<li>A. J. Chorin, "A numerical method for solving incompressible viscous flow problems", <em>Journal of Computational Physics</em> 2(1), 12–26 (August 1967); reprinted in 135, 118–125 (1997). doi:10.1016/0021-9991(67)90037-X.</li>
<li>R. Temam, "Sur l'approximation de la solution des équations de Navier–Stokes par la méthode des pas fractionnaires (I)", <em>Archive for Rational Mechanics and Analysis</em> 32(2), 135–153 (1969); (II), 33(5), 377–385 (1969).</li>
<li>G. G. Stokes, "On the dynamical theory of diffraction", <em>Transactions of the Cambridge Philosophical Society</em> 9, 1 (read 26 November 1849).</li>
<li>H. Helmholtz, "Über Integrale der hydrodynamischen Gleichungen, welche den Wirbelbewegungen entsprechen", <em>Journal für die reine und angewandte Mathematik</em> 55, 25–55 (1858).</li>
<li>J. Leray, "Sur le mouvement d'un liquide visqueux emplissant l'espace", <em>Acta Mathematica</em> 63, 193–248 (1934).</li>
<li>O. A. Ladyzhenskaya, <em>The Mathematical Theory of Viscous Incompressible Flow</em>, Gordon and Breach (Russian 1961; English 1963; 2nd English edition 1969).</li>
<li>S. V. Patankar and D. B. Spalding, "A calculation procedure for heat, mass and momentum transfer in three-dimensional parabolic flows", <em>International Journal of Heat and Mass Transfer</em> 15(10), 1787–1806 (1972).</li>
<li>L. S. Caretto, A. D. Gosman, S. V. Patankar and D. B. Spalding, "Two calculation procedures for steady, three-dimensional flows with recirculation", <em>Proceedings of the Third International Conference on Numerical Methods in Fluid Mechanics</em>, Lecture Notes in Physics, Springer (1973), 60–68. doi:10.1007/BFb0112677.</li>
<li>S. V. Patankar, <em>Numerical Heat Transfer and Fluid Flow</em>, Hemisphere (1980). Finite volumes, staggered grids and SIMPLE, very clearly explained.</li>
<li>C. M. Rhie and W. L. Chow, "Numerical study of the turbulent flow past an airfoil with trailing edge separation", <em>AIAA Journal</em> 21(11), 1525–1532 (November 1983); presented as AIAA paper 82-0998 (June 1982).</li>
<li>S. Majumdar, "Role of underrelaxation in momentum interpolation for calculation of flow with nonstaggered grids", <em>Numerical Heat Transfer</em> 13(1), 125–132 (1988).</li>
<li>T. F. Miller and F. W. Schmidt, "Use of a pressure-weighted interpolation method for the solution of the incompressible Navier–Stokes equations", <em>Numerical Heat Transfer</em> 14(2), 213–233 (1988). doi:10.1080/10407788808913641.</li>
<li>J. Stam, "Stable fluids", <em>Proceedings of SIGGRAPH 99</em>, 121–128 (1999). doi:10.1145/311535.311548. The projection method brought to interactive graphics.</li>
<li>R. Bridson, <em>Fluid Simulation for Computer Graphics</em>, 2nd ed., CRC Press (2015). MAC grids, projection, boundaries and the compatibility condition, written for programmers.</li>
<li>R. J. LeVeque, <em>Finite Difference Methods for Ordinary and Partial Differential Equations</em>, SIAM (2007), §2.12 on the Neumann problem and its compatibility condition.</li>
</ol>
`,
  widgets: {
    'pressure-push': mountPush,
    'pressure-hodge': mountHodge,
    'pressure-projection': mountProjection,
    'pressure-compat': mountCompat,
    'pressure-checkerboard': mountCheckerboard,
    'pressure-mac-cell': mountMacCell,
    'pressure-rhie-chow': mountRhieChow,
  },
  quizzes: {
    q1: {
      type: 'predict',
      q: 'In the figure above, a push to the right sets about 7% of a sealed 48 × 48 box moving (speed above 1% of the peak). After the projection, roughly how much of the box moves?',
      choices: [
        'About the same 7%: pressure only acts where the fluid was pushed.',
        'Most of it, over 80%: the pressure answers everywhere at once.',
        'None of it: the pressure cancels the push, because the box is sealed.',
        'It depends on how fast sound travels in the water.',
      ],
      answer: 1,
      explain: 'The measured share is about 86%. Pressure obeys an elliptic equation, so a local push changes the pressure everywhere, and water that is shoved forward must come back round the sides. The push is not cancelled: about half its energy survives as a circulation. And sound speed does not enter: incompressibility is the limit of infinite sound speed, which is why the response is instantaneous.',
    },
    q2: {
      type: 'mcq',
      q: 'You project a field $\\mathbf{w}$ and keep 78% of its kinetic energy. Where did the other 22% go?',
      choices: [
        'Numerical dissipation in the pressure solver.',
        'Into the gradient part $\\nabla\\phi$, which the projection removed; the two parts are orthogonal, so their energies add.',
        'It is stored as potential energy in the pressure field and returned later.',
        'Nowhere: a projection keeps energy, and the loss is a rounding error.',
      ],
      answer: 1,
      explain: 'By (10.4), $\\int|\\mathbf{w}|^2 = \\int|\\mathbf{u}|^2 + \\int|\\nabla\\phi|^2$: the removed part carries exactly the missing energy, up to the solver tolerance. Physically it is the part of the motion that would have compressed the fluid. An incompressible fluid has no elastic energy to store it in, so in a real time step that energy is simply never created: the pressure acts within the step.',
    },
    q3: {
      type: 'num',
      q: 'A sealed box of side 1 (24 × 24 cells) has water entering through its left wall at speed 1 and no outflow. A solver that first removes the mean of the right-hand side converges. What divergence $\\nabla\\cdot\\mathbf{u}$ does the projected velocity have in each cell?',
      answer: -1,
      tol: 0.05,
      explain: 'The net inflow is $1 \\times 1 = 1$ per unit time, so the volume budget says $\\int\\nabla\\cdot\\mathbf{u}\\,\\mathrm{d}V = \\oint\\mathbf{u}\\cdot\\mathbf{n}\\,\\mathrm{d}S = -1$, whatever the pressure does: the wall velocities are fixed. Removing the mean spreads that deficit evenly, $-1$ in every cell of a box of area 1. The sign is negative because fluid converges into the box. The solver did not fail: the problem as posed has no solution.',
    },
    q4: {
      type: 'predict',
      q: 'In the next figure you will add a checkerboard $a(-1)^{i+j}$ with $a = 0.3$ to a smooth pressure on a 16 × 16 grid ($h = 1/16$). By how much does the collocated (central-difference) pressure force change?',
      choices: [
        'By $2a/h = 9.6$ everywhere, alternating in sign.',
        'By about $a = 0.3$.',
        'Not at all.',
        'It grows without limit, because the pattern is unstable.',
      ],
      answer: 2,
      explain: 'The central difference reads $p_{i+1}$ and $p_{i-1}$, which always have the same checkerboard colour, so the pattern cancels exactly. That is the trap: a pressure mode with no force, which the velocity can never feel and so never controls. The $2a/h$ answer is right for the staggered grid, which differences neighbours.',
    },
    q5: {
      type: 'mcq',
      q: 'A weakly compressible SPH water code sets its numerical sound speed to ten times the fastest flow speed. Roughly how large are its density variations?',
      choices: [
        'About 10%: density errors scale with the Mach number.',
        'Of order 1%: density errors scale with the square of the Mach number.',
        'Zero: a stiff equation of state makes the fluid exactly incompressible.',
        'About 0.01%: they scale with the fourth power of the Mach number.',
      ],
      answer: 1,
      explain: 'Pressure changes are of order $\\rho U^2$ and the equation of state turns them into density changes $\\delta\\rho/\\rho \\approx \\delta p/(\\rho c^2) \\sim \\mathrm{Ma}^2 = 0.01$, by (10.13). The price is the time step, which must resolve sound: about $h/(c+U)$, ten times smaller than the flow alone would need. Raising $c$ further cuts the density error but makes every step shorter.',
    },
  },
  glossary: {
    'projection-method': {
      term: 'projection method',
      def: 'A time step for incompressible flow in three stages: advance the velocity ignoring pressure to get $\\mathbf{u}^*$; solve a Poisson equation for the pressure; subtract its gradient so that the new velocity has no divergence. Chorin (1967–68), independently Temam (1969).',
      section: 'projection',
    },
    'helmholtz-hodge': {
      term: 'Helmholtz–Hodge decomposition',
      def: 'The unique split of a vector field into a divergence-free part and the gradient of a scalar, $\\mathbf{w} = \\mathbf{u} + \\nabla\\phi$, with suitable boundary conditions. The parts are orthogonal, so their energies add. Stokes had it in 1849, before Helmholtz.',
      section: 'hodge',
    },
    'pressure-poisson': {
      term: 'pressure Poisson equation',
      def: 'The elliptic equation for pressure obtained by taking the divergence of the momentum equation, $\\nabla^2 p = -\\rho\\,\\partial_i u_j\\,\\partial_j u_i + \\dots$; in a projection step, $\\nabla^2 p = (\\rho/\\Delta t)\\nabla\\cdot\\mathbf{u}^*$. Solving it is most of the cost of an incompressible solver.',
      section: 'constraint',
    },
    'divergence-free': {
      term: 'divergence-free',
      def: 'A velocity field with $\\nabla\\cdot\\mathbf{u} = 0$ everywhere: no fluid is created or destroyed at any point. Incompressible flow must be divergence-free; on a grid this is enforced cell by cell by the projection.',
      section: 'hodge',
    },
    'staggered-grid': {
      term: 'staggered grid',
      def: 'A grid that stores different variables at different places: pressure at cell centres, each velocity component at the faces normal to it. Gradient and divergence then use compact stencils, and no checkerboard pressure can hide.',
      section: 'mac',
    },
    'mac-grid': {
      term: 'MAC grid',
      def: 'The staggered arrangement of $u$, $v$ and $p$ used by Harlow and Welch\'s marker-and-cell method (1965): $p_{i,j}$ at centres, $u_{i+1/2,j}$ on vertical faces, $v_{i,j+1/2}$ on horizontal faces. The name now usually means the layout alone.',
      section: 'mac',
    },
    'collocated-grid': {
      term: 'collocated grid',
      def: 'A grid that stores all variables (velocity and pressure) at the same points, usually the cell centres. Simple to code on any mesh, but with central differences it decouples the pressure into four sub-grids unless repaired, for example by Rhie–Chow interpolation.',
      section: 'checkerboard',
    },
    checkerboard: {
      term: 'checkerboard mode',
      def: 'The grid-scale pressure pattern $(-1)^{i+j}$ (and the stripes $(-1)^i$, $(-1)^j$). Its central-difference gradient is zero, so on a collocated grid it exerts no force, the velocity cannot feel it, and nothing controls it.',
      section: 'checkerboard',
    },
    'rhie-chow': {
      term: 'Rhie–Chow interpolation',
      def: 'Momentum interpolation of face velocities on a collocated grid: the average of the centre velocities plus a term that replaces the averaged central pressure gradient by the compact difference across the face. It couples neighbouring pressures and removes the checkerboard. Rhie and Chow, 1983 (presented 1982).',
      section: 'mac',
    },
    'artificial-compressibility': {
      term: 'artificial compressibility',
      def: 'Chorin\'s 1967 method for steady incompressible flow: replace the constraint by a pressure equation in pseudo-time, $\\partial p/\\partial\\tau + \\delta^{-1}\\nabla\\cdot\\mathbf{u} = 0$, and march until nothing changes. The converged state is exactly divergence-free; the path to it is not physical.',
      section: 'other-roads',
    },
    'compatibility-condition': {
      term: 'compatibility condition',
      def: 'For a Poisson equation with Neumann conditions on the whole boundary, a solution exists only if the source integrates to the boundary flux: in a sealed box, as much fluid must leave as enters. On the grid, the right-hand side must sum to zero.',
      section: 'projection',
    },
  },
  pathologies: [
    {
      id: 'checkerboard-pressure',
      name: 'Checkerboard pressure',
      family: 'constraint',
      symptom: 'The pressure field is speckled with an odd–even pattern at the grid scale, or with stripes, while the velocity looks smooth and reasonable. Refining the grid does not make it go away.',
      cause: 'On a collocated grid with central differences the pressure gradient at a cell reads only the cells two away, so the pattern $(-1)^{i+j}$ (and the stripes) has zero gradient and exerts no force. The pressure equation $\\mathrm{D}_c\\mathrm{G}_c p = \\dots$ uses a wide stencil that splits the grid into four uncoupled sub-grids, each free to take its own values.',
      diagnose: 'Measure the odd–even content of the pressure: on each 2 × 2 block, the share of energy in the checkerboard and stripe components. It is near zero for a smooth field and near 3/4 when the pressure sits on one sub-grid. Check whether your gradient and divergence stencils skip the centre cell.',
      mitigations: [
        'Store velocities on a staggered (MAC) grid, so gradient and divergence are compact and their product is the five-point Laplacian. Standard on structured grids; awkward on unstructured or curvilinear meshes.',
        'Keep a collocated grid but compute face fluxes with Rhie–Chow momentum interpolation. Standard in finite-volume codes; use a variant that removes the dependence on under-relaxation and time step.',
        'Approximate projection: solve with the compact Laplacian and accept an $O(h^2)$ divergence at the centres. Used in some adaptive codes.',
        'In finite elements, choose a velocity–pressure pair that satisfies the inf-sup (LBB) condition, such as Taylor–Hood, or add pressure stabilisation.',
      ],
      section: 'checkerboard',
      demo: { widget: 'pressure-rhie-chow', data: { preset: 'default' } },
    },
    {
      id: 'incomplete-projection',
      name: 'Incomplete projection',
      family: 'constraint',
      symptom: 'The flow looks compressible: tracers bunch up in some places and spread out in others, dye or smoke gains or loses volume, and liquid volume drifts in free-surface simulations. It gets worse when the grid is refined at a fixed iteration count.',
      cause: 'The pressure solve was stopped after too few iterations or at a loose tolerance, so only part of the divergence of $\\mathbf{u}^*$ was removed. Simple relaxation methods remove the large-scale part of the divergence slowest, and that is the part that moves the most fluid.',
      diagnose: 'Monitor the relative residual $\\|\\nabla\\cdot\\mathbf{u}\\|/\\|\\nabla\\cdot\\mathbf{u}^*\\|$ after each projection, and the total volume or the spacing of tracers over time. Check how the iteration count needed grows as you refine the grid.',
      mitigations: [
        'Use a solver whose iteration count does not grow with the grid: multigrid, or conjugate gradients preconditioned with multigrid or incomplete Cholesky.',
        'Solve to a relative tolerance and check it, rather than running a fixed number of iterations; warm-start from the previous pressure.',
        'If the budget is fixed (real-time graphics), correct volume drift explicitly, for example by adding a small source term proportional to the volume error.',
        'Do not fix the symptom with extra viscosity or smoothing: they hide the leak without closing it.',
      ],
      section: 'projection',
      demo: { widget: 'pressure-projection', data: { preset: 'incomplete' } },
    },
    {
      id: 'neumann-incompatibility',
      name: 'Neumann incompatibility',
      family: 'boundary',
      symptom: 'The pressure solver never reaches its tolerance and stalls at a residual floor, and the pressure level drifts from iteration to iteration or from step to step, while its shape looks plausible. A solver that removes the mean converges but leaves a uniform divergence everywhere.',
      cause: 'With walls on every side the pressure equation has a solution only if the right-hand side sums to zero, which says that as much fluid leaves through the boundary as enters. An inflow without a matching outflow, inconsistent moving walls, or mass sources break that, and then no pressure exists.',
      diagnose: 'Sum the right-hand side, or equivalently the net boundary flux $\\oint\\mathbf{u}_b\\cdot\\mathbf{n}\\,\\mathrm{d}S$: it must be zero to rounding. Watch the mean of the pressure from iteration to iteration; a linear drift means an incompatible system.',
      mitigations: [
        'Fix the boundary data so that the fluxes balance: scale the outflow to match the inflow, or make one boundary an open (pressure) boundary.',
        'Project the right-hand side onto the compatible subspace (subtract its mean), and remove the constant from the solution. Every robust solver does this; it hides the inconsistency, so log the mean that was removed.',
        'Pin the pressure at one cell only for direct solvers that need a non-singular matrix; it does not make an incompatible problem solvable.',
      ],
      section: 'projection',
      demo: { widget: 'pressure-compat', data: { preset: 'incompatible' } },
    },
  ],
  css: `
.chapter[data-chapter="pressure"] .pr-panel { min-width: 0; display: grid; gap: 4px; }
.chapter[data-chapter="pressure"] .pr-panel-label { font-size: 0.86rem; color: var(--muted); }
.chapter[data-chapter="pressure"] .pr-formula { margin: 6px 0 0; font-family: var(--font-mono); font-size: 0.84rem; line-height: 1.5; overflow-wrap: anywhere; }
`,
};
