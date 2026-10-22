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
<p class="lead-in">In a gas, compressing the fluid raises its pressure according to an equation of state. In water at everyday speeds the density is nearly constant, and the equations of incompressible flow contain no equation of state for pressure at all. Yet pressure still acts throughout the fluid, making a whole tank of water move when one side is pushed. In an incompressible flow, pressure acts as a constraint force that takes whatever value is needed to keep the fluid from compressing. Computing it requires splitting every velocity field into two parts, solving a Poisson equation at every time step, enforcing compatible boundary conditions, and choosing where on the grid each variable is stored. If velocity and pressure are stored at the same grid points with central differences, the pressure can develop a checkerboard oscillation that produces zero discrete pressure gradient and therefore never affects the velocity.</p>

<h2 id="constraint">Pressure without an equation</h2>

<p>An <dfn data-term="incompressible">incompressible</dfn> fluid of constant density $\rho$ is governed by the <a href="#/conservation/navier-stokes">Navier–Stokes momentum equation</a> together with the constraint that the velocity has zero <dfn data-term="divergence">divergence</dfn> (<a href="#/conservation/mass">the continuity equation</a> when density cannot change):</p>

<div class="eq" id="eq-ns">$$\frac{\partial \mathbf{u}}{\partial t} + (\mathbf{u}\cdot\nabla)\mathbf{u} = -\frac{1}{\rho}\nabla p + \nu\nabla^2\mathbf{u} + \mathbf{f}, \qquad \nabla\cdot\mathbf{u} = 0$$<span class="eq-tag">(10.1)</span></div>

<p>There are four unknowns—three velocity components and the <dfn data-term="pressure">pressure</dfn>—and four equations: three momentum equations and one divergence constraint. Although the counts match, the variables play different roles. The momentum equation gives the time derivative of $\mathbf{u}$, whereas the continuity constraint contains no time derivative and no equation gives $\partial p/\partial t$. Because the density is constant, there is no equation of state; instead, the pressure is determined entirely by the requirement that $\nabla\cdot\mathbf{u}$ remain zero.</p>

<p>In classical mechanics, a bead threaded on a curved wire feels a normal force from the wire that is not given by a force law in advance, but takes whatever value is needed to keep the bead on the wire. Because that constraint force acts at right angles to the wire, it does no work along it; mathematically, it is a Lagrange multiplier. Pressure plays the same role for an incompressible fluid, where the constraint surface is the space of velocity fields with zero divergence and the pressure gradient is the force that keeps the velocity on that subspace. As the next section shows, that gradient is orthogonal to every divergence-free field.</p>

<p>Taking the divergence of the momentum equation yields an explicit equation for $p$. Because $\nabla\cdot\mathbf{u} = 0$, both the time-derivative term $\partial(\nabla\cdot\mathbf{u})/\partial t$ and the viscous term $\nu\nabla^2(\nabla\cdot\mathbf{u})$ vanish, leaving the <dfn data-term="pressure-poisson">pressure Poisson equation</dfn>:</p>

<div class="eq" id="eq-ppe">$$\nabla^2 p = -\rho\,\frac{\partial u_j}{\partial x_i}\frac{\partial u_i}{\partial x_j} + \rho\,\nabla\cdot\mathbf{f}$$<span class="eq-tag">(10.2)</span></div>

<p>(with a sum over repeated indices). Because this equation is elliptic, the pressure at every point depends on the velocity throughout the domain at the same instant, so a disturbance at one boundary affects the far side of the tank immediately. This instantaneous response is the zero-<dfn data-term="mach-number">Mach-number</dfn> limit of a real fluid (see <a href="#/similarity/numbers">the named numbers</a>), in which acoustic waves propagate much faster than the flow itself. In the limit of infinite sound speed, pressure ceases to be a thermodynamic state variable and becomes a global constraint.</p>

<figure data-widget="pressure-push"><figcaption>A sealed square box of still water, 48 × 48 cells. Drag across it to give the water a push $\mathbf{u}^*$ (a blob of velocity along your stroke). With the projection on, the pressure field (colour) is computed so that the new velocity (arrows) has no divergence. With it off you see the raw push, coloured by the divergence it would cause.</figcaption></figure>

<div class="try"><ol>
<li>Look at the default push to the right. Read <em>share of box moving</em>: about 7% of the box before the projection, about 86% after. The pressure is high ahead of the push and low behind it, and the whole box circulates back around.</li>
<li>Untick <em>Enforce incompressibility</em> and colour by divergence. A push alone piles fluid up ahead of the blob and empties it behind, with a divergence of up to about 12 per unit time, which the projection reduces to about $10^{-7}$.</li>
<li>Read <em>kinetic energy kept</em>: about 48%. Half the energy of a local push in two dimensions goes into squeezing, and the pressure removes it. When you drag your own pushes away from the walls, the retained share stays near one half.</li>
<li>Push towards a wall. The pressure builds against the wall, and the water turns aside along it.</li>
</ol></div>

<div data-quiz="q1"></div>

<details class="deeper"><summary>Go deeper: the divergence of the momentum equation, and why codes do not use (10.2) directly</summary>
<p>Taking $\partial/\partial x_i$ of the $i$-th momentum equation and summing over $i$, the commuting derivatives give $\partial_i \partial_t u_i = \partial_t(\nabla\cdot\mathbf{u}) = 0$ and $\partial_i \nabla^2 u_i = \nabla^2(\nabla\cdot\mathbf{u}) = 0$. The advection term expands as $\partial_i(u_j\partial_j u_i) = (\partial_i u_j)(\partial_j u_i) + u_j\partial_j(\partial_i u_i)$, whose second term also vanishes when $\nabla\cdot\mathbf{u} = 0$, leaving (10.2).</p>
<p>That derivation assumes $\nabla\cdot\mathbf{u} = 0$ at the current time, so (10.2) only ensures that the divergence does not <em>change</em>. On a computer the discrete divergence is never identically zero, and under (10.2) any existing divergence error would persist or accumulate from step to step. Practical solvers therefore retain the discrete time derivative and solve for the pressure that drives the divergence to zero at the end of the step from whatever value it has now—the projection method of the next sections, of which (10.2) is the continuous limit.</p>
</details>

<aside class="note" data-label="Energy">Why half? In an unbounded domain a push of fixed direction, written as Fourier modes, keeps only the part of each mode at right angles to its wavevector. Averaged over all directions, that keeps $1/2$ of the energy in two dimensions and $2/3$ in three. The walls of the box change the figure slightly.</aside>

<h2 id="hodge">Every flow is two flows</h2>

<p>Any sufficiently smooth velocity field $\mathbf{w}$ on a bounded domain can be decomposed uniquely into a divergence-free field and the gradient of a scalar potential:</p>

<div class="eq" id="eq-hodge">$$\mathbf{w} = \mathbf{u} + \nabla\phi, \qquad \nabla\cdot\mathbf{u} = 0, \qquad \mathbf{u}\cdot\mathbf{n} = 0 \text{ on the boundary}$$<span class="eq-tag">(10.3)</span></div>

<p>This is the <dfn data-term="helmholtz-hodge">Helmholtz–Hodge decomposition</dfn>. On a periodic domain the boundary condition is replaced by periodicity, and a uniform mean flow is grouped with the <dfn data-term="divergence-free">divergence-free</dfn> part. The two components carry distinct kinematic features. A gradient field $\nabla\phi$ is curl-free, consisting purely of sources and sinks with flow spreading from high $\phi$ to low $\phi$, whereas the divergence-free part $\mathbf{u}$ consists of swirling and circulating flow in which no fluid is created or destroyed. All of the <dfn data-term="vorticity">vorticity</dfn> of $\mathbf{w}$ resides in $\mathbf{u}$, and all of its divergence resides in $\nabla\phi$.</p>

<p>Computing the decomposition requires solving a single Poisson equation. Taking the divergence of (10.3) gives $\nabla^2\phi = \nabla\cdot\mathbf{w}$ with the Neumann boundary condition $\partial\phi/\partial n = \mathbf{w}\cdot\mathbf{n}$ at solid walls; subtracting $\nabla\phi$ from $\mathbf{w}$ then leaves $\mathbf{u}$.</p>

<p>The two components are also orthogonal in $L^2$. Integrating their dot product over the domain and integrating by parts transfers the gradient onto $\mathbf{u}$:</p>

<div class="eq" id="eq-orth">$$\int \mathbf{u}\cdot\nabla\phi\,\mathrm{d}V = \oint \phi\,\mathbf{u}\cdot\mathbf{n}\,\mathrm{d}S - \int \phi\,\nabla\cdot\mathbf{u}\,\mathrm{d}V = 0, \qquad\text{so}\qquad \int |\mathbf{w}|^2 = \int |\mathbf{u}|^2 + \int |\nabla\phi|^2$$<span class="eq-tag">(10.4)</span></div>

<p>Because the energies add like the squared sides of a right-angled triangle, removing $\nabla\phi$ is an orthogonal projection that selects the divergence-free field $\mathbf{u}$ closest to $\mathbf{w}$ in kinetic energy. Writing this variational problem explicitly with a Lagrange multiplier $\lambda$ for the constraint $\nabla\cdot\mathbf{u} = 0$ gives:</p>

<div class="eq" id="eq-min">$$\mathbf{u} = \arg\min_{\nabla\cdot\mathbf{v} = 0}\ \tfrac12\!\int|\mathbf{v} - \mathbf{w}|^2\,\mathrm{d}V \quad\Longrightarrow\quad \mathbf{u} - \mathbf{w} + \nabla\lambda = 0$$<span class="eq-tag">(10.5)</span></div>

<p>The multiplier $\lambda$ is the potential $\phi$, which over a time step $\Delta t$ equals $\Delta t\,p/\rho$—making pressure the Lagrange multiplier for incompressibility. Because the operator is an orthogonal projection, applying it a second time leaves $\mathbf{u}$ unchanged, and projecting a field can only reduce or preserve its kinetic energy.</p>

<figure data-widget="pressure-hodge" class="wide"><figcaption>A periodic square, 40 × 40 cells. Top: your field $\mathbf{w}$, coloured by its divergence; drag on it with the chosen brush. Bottom left: the divergence-free part $\mathbf{u}$, coloured by vorticity. Bottom right: the gradient part $\nabla\phi$, coloured by $\phi$. Arrows use one scale in all three panels.</figcaption></figure>

<div class="try"><ol>
<li>The starting field is a swirl, a source and a sink, all on top of each other. Read the energy line: about 78% of the energy sits in the divergence-free part and 22% in the gradient part, and the cross term is about $10^{-13}$ of the total. The swirl went left, the source and sink went right.</li>
<li>Read the divergence of each part: the original field has divergence up to about 11, while the divergence-free part is around $10^{-9}$ (the solver tolerance) and the curl of the gradient part is zero to machine rounding.</li>
<li>Press <em>Clear</em>, choose the <em>swirl</em> brush and paint. Everything lands bottom left. Now choose <em>source</em>, and all of the painted flow appears in the bottom-right panel.</li>
<li>Choose <em>push</em> and drag a straight stroke. A straight push contains both components, splitting into a swirling pair of eddies on the left and a source–sink dipole on the right with roughly equal energies.</li>
</ol></div>

<aside class="history" data-era="1849">The decomposition is older than its name. <a href="#/people/george-gabriel-stokes">Stokes</a> split a vector field into a gradient and a divergence-free part in a paper read to the Cambridge Philosophical Society on 26 November 1849, nine years before <a href="#/people/hermann-von-helmholtz">Helmholtz</a>'s 1858 paper on vortex motion. Hodge's name comes from the much later generalisation to differential forms. Fluid analysts also call the projection the Leray projection, after <a href="#/people/jean-leray">Jean Leray</a>'s 1934 paper on viscous flow, and the form used for the Navier–Stokes equations is often credited to <a href="#/people/olga-ladyzhenskaya">Ladyzhenskaya</a>.</aside>

<aside class="who" data-person="hermann-von-helmholtz">His 1858 paper on vortex motion separated a flow into a rotational part and an irrotational part with a potential. The decomposition carries his name even though Stokes had it first.</aside>

<details class="deeper"><summary>Go deeper: why the split is unique</summary>
<p>If $\mathbf{w} = \mathbf{u}_1 + \nabla\phi_1 = \mathbf{u}_2 + \nabla\phi_2$, then the difference $\mathbf{u}_1 - \mathbf{u}_2 = \nabla(\phi_2 - \phi_1)$ is simultaneously divergence-free (with zero normal component at walls) and a gradient. By (10.4) it is orthogonal to itself, so its squared integral is zero and the two decompositions coincide. The same argument holds on a periodic domain once the spatially uniform mean flow is assigned to $\mathbf{u}$, since a uniform flow is both divergence-free and curl-free but cannot be written as the gradient of a periodic potential $\phi$. On the staggered MAC grid introduced later in this chapter, the discrete gradient is minus the transpose of the discrete divergence, so discrete orthogonality holds to machine precision rather than only to truncation error.</p>
</details>

<div data-quiz="q2"></div>

<h2 id="projection">Predict, solve, correct</h2>

<p>The <dfn data-term="projection-method">projection method</dfn> turns the Helmholtz–Hodge decomposition into a time-stepping scheme. The first stage advances the velocity using advection, viscosity, and body forces while omitting the pressure gradient, producing an intermediate velocity field $\mathbf{u}^*$ that generally has non-zero divergence. The second stage solves a Poisson equation for the pressure $p^{n+1}$ whose gradient equals the curl-free part of $\mathbf{u}^*$, and the third stage subtracts that gradient to leave a divergence-free velocity $\mathbf{u}^{n+1}$:</p>

<div class="eq" id="eq-proj">$$\begin{aligned} \mathbf{u}^* &= \mathbf{u}^n + \Delta t\left(-(\mathbf{u}^n\cdot\nabla)\mathbf{u}^n + \nu\nabla^2\mathbf{u}^n + \mathbf{f}\right) \\ \nabla^2 p^{n+1} &= \frac{\rho}{\Delta t}\,\nabla\cdot\mathbf{u}^* \\ \mathbf{u}^{n+1} &= \mathbf{u}^* - \frac{\Delta t}{\rho}\,\nabla p^{n+1} \end{aligned}$$<span class="eq-tag">(10.6)</span></div>

<p>Solving the sparse linear system in the middle equation—one unknown per fluid cell—accounts for most of the computational work, and <a href="#/solvers/the-system">the next chapter</a> examines algorithms for it in detail. Any time-stepping scheme can be used for the provisional velocity update; combining (10.6) with semi-Lagrangian advection gives the <a href="#/stable-fluids/splitting">Stable Fluids</a> algorithm.</p>

<aside class="who" data-person="alexandre-chorin">A student of Peter Lax at New York University (PhD 1966), Chorin announced the method in a short note in the Bulletin of the American Mathematical Society in 1967 and gave the full account in Mathematics of Computation in 1968. It is often dated 1968 for that reason.</aside>

<aside class="who" data-person="roger-temam">Independently of Chorin, Temam published a fractional-step method for the Navier–Stokes equations in 1969, in two papers that also proved it converges. That is why the method is often called the Chorin–Temam projection.</aside>

<p><strong>Boundaries.</strong> At a solid wall the corrected velocity must match the wall's normal velocity, $\mathbf{u}^{n+1}\cdot\mathbf{n} = \mathbf{u}_b\cdot\mathbf{n}$. Taking the normal component of the velocity update in (10.6) therefore prescribes the normal derivative $\partial p/\partial n$ rather than $p$ itself—a Neumann boundary condition that simplifies to $\partial p/\partial n = 0$ whenever $\mathbf{u}^*$ already satisfies the wall boundary condition. At an open boundary connected to a reservoir, the pressure itself is fixed by a Dirichlet condition.</p>

<p><strong>The compatibility condition.</strong> In a domain enclosed entirely by walls with prescribed normal velocities, integrating the pressure Poisson equation over the volume and applying the divergence theorem relates the interior source to the boundary flux:</p>

<div class="eq" id="eq-compat">$$\oint \frac{\partial p}{\partial n}\,\mathrm{d}S = \int \nabla^2 p\,\mathrm{d}V = \frac{\rho}{\Delta t}\int \nabla\cdot\mathbf{u}^*\,\mathrm{d}V \quad\Longleftrightarrow\quad \oint \mathbf{u}_b\cdot\mathbf{n}\,\mathrm{d}S = 0$$<span class="eq-tag">(10.7)</span></div>

<p>This <dfn data-term="compatibility-condition">compatibility condition</dfn> expresses volume conservation, requiring as much incompressible fluid to leave through the boundaries as enters. On the grid, the discrete right-hand side $b$ must sum to zero over all fluid cells, $\sum_c b_c = 0$. Moreover, with pure Neumann conditions around the entire boundary, adding a constant to $p$ leaves $\nabla p$ and the velocity unchanged, so the constant vector lies in the null space of the discrete Laplacian. A solution exists only when $b$ satisfies the compatibility sum, and is then unique up to an additive constant, which solvers fix by subtracting the mean of $p$ or pinning one cell.</p>

<figure data-widget="pressure-projection" data-preset="incomplete" class="wide"><figcaption>One projection on a MAC grid: a 64 × 32 channel with a disc, inflow at speed 0.5 on the left, an open boundary on the right. Left: the velocity before ($\mathbf{u}^*$) or after, with tracers or arrows. Right: the relative residual $\|\nabla\cdot\mathbf{u}\|_2/\|\nabla\cdot\mathbf{u}^*\|_2$ against iterations; the dashed line is your budget.</figcaption></figure>

<div class="try"><ol>
<li>The preset allows Jacobi only 10 iterations. The relative residual is about 0.36, leaving more than a third of the initial divergence in the field. When you press Play, the tracers bunch up in front of the disc and thin out elsewhere—an <a href="#/pathologies">incomplete projection</a>.</li>
<li>Drag the iterations to 100, then 1000. Jacobi reaches about 0.13, then 0.03, and still has not finished. Gauss–Seidel is not much better.</li>
<li>Switch to conjugate gradients, which reaches $10^{-12}$ in about 220 iterations, or multigrid, which reaches about $10^{-10}$ in 10 cycles.</li>
<li>Select <em>u* (before)</em> coloured by divergence to see the source term that the projection removes. After a full solve the pressure is high in front of the disc and low behind it.</li>
</ol></div>

<p>Because Jacobi and Gauss–Seidel update each cell only from its immediate neighbours, boundary and global pressure adjustments propagate by one cell per sweep, a bottleneck analysed in <a href="#/solvers/smoothing">chapter 11</a>. The separate <a data-aid="pressure-solver">pressure-solver aid</a> shows the solvers step by step.</p>

<p>The next figure shows what happens when the compatibility condition is violated. Water enters a sealed box through its left wall at speed 1 while a slider controls the outflow speed on the right wall, and two Jacobi solvers run side by side—the unmodified iteration and a solver that first subtracts the mean of $b$.</p>

<figure data-widget="pressure-compat" data-preset="incompatible" class="wide"><figcaption>A 24 × 24 box. Left: the shape of the pressure (its mean subtracted) after the current number of Jacobi sweeps ($\omega = 0.8$), with the velocity it produces. Right: both solvers' relative residual (dotted: the raw solver's floor) and mean pressure level, against sweeps.</figcaption></figure>

<div class="try"><ol>
<li>With no outflow, $\sum b \neq 0$ and no pressure exists. The raw residual stalls at about 0.20 while the mean pressure climbs linearly, reaching about 0.36, 0.73, and 1.09 after 1000, 2000, and 3000 sweeps.</li>
<li>The other solver converges, but read <em>divergence left in every cell</em>: $-1$. The inflow has nowhere to go, so the error is spread evenly over the box.</li>
<li>Drag the outflow to 1 so that the net boundary flux vanishes, and both solvers converge to the same pressure.</li>
<li>Choose <em>open</em> for the right side. The outside pressure fixes the level and gives the fluid a way out.</li>
</ol></div>

<aside class="pitfall">An incompatible right-hand side usually arises from boundary data such as an inflow without a matching outflow or inconsistent moving walls. The pressure level drifts and the solver never meets its tolerance. See the <a href="#/pathologies">gallery entry</a> on Neumann incompatibility.</aside>

<details class="deeper"><summary>Go deeper: why the raw iteration drifts, and the residual floor</summary>
<p>In the linear system $A\mathbf{x} = \mathbf{b}$, the discrete operator $A = -\nabla_h^2$ is symmetric and has the constant vector $\mathbf{1}$ in its null space, so $\mathbf{1}^{\mathsf T}A = 0$. For any vector $\mathbf{x}$, the residual $\mathbf{r} = \mathbf{b} - A\mathbf{x}$ therefore satisfies $\mathbf{1}^{\mathsf T}\mathbf{r} = \mathbf{1}^{\mathsf T}\mathbf{b}$. Because a vector of $N$ entries with a fixed sum has minimal Euclidean norm when all of its entries are equal, the residual norm is bounded below by $\|\mathbf{r}\|_2 \ge |\bar b|\sqrt{N}$, which sets the horizontal floor in the figure. Under weighted Jacobi, $\mathbf{x} \leftarrow \mathbf{x} + \omega D^{-1}\mathbf{r}$ with $D = \operatorname{diag}(A)$, the diagonal-weighted sum $\mathbf{d}^{\mathsf T}\mathbf{x}$ changes by $\omega\,\mathbf{1}^{\mathsf T}\mathbf{r} = \omega\sum_c b_c$ on every sweep, causing the mean pressure level to drift linearly even after the spatial profile has settled.</p>
</details>

<div data-quiz="q3"></div>

<h2 id="checkerboard">The checkerboard trap</h2>

<p>The figures so far have used a staggered grid. The reason becomes clear if we instead place all variables on a <dfn data-term="collocated-grid">collocated grid</dfn>, storing $u$, $v$ and $p$ together at the centre of each cell (one of the <a href="#/discretization/grids">ways to store a function</a>), and approximate both the gradient and the divergence with second-order central differences:</p>

<div class="eq" id="eq-central">$$(\mathrm{G}_c p)_{i,j} = \left(\frac{p_{i+1,j} - p_{i-1,j}}{2h},\ \frac{p_{i,j+1} - p_{i,j-1}}{2h}\right), \qquad (\mathrm{D}_c\mathbf{u})_{i,j} = \frac{u_{i+1,j} - u_{i-1,j}}{2h} + \frac{v_{i,j+1} - v_{i,j-1}}{2h}$$<span class="eq-tag">(10.8)</span></div>

<p>Each <dfn data-term="stencil">stencil</dfn> skips the centre cell $(i,j)$ and takes differences across cells two apart. If we add the <dfn data-term="checkerboard">checkerboard</dfn> mode $p_{i,j} = a(-1)^{i+j}$ to any pressure field, the neighbours $i+1$ and $i-1$ always share the same parity and receive the same increment, so their difference vanishes and $\mathrm{G}_c p = 0$ everywhere. Because this oscillating pressure produces zero discrete gradient force, it never enters the velocity update and nothing in the discrete equations damps it. The same holds for the stripe modes $(-1)^i$ and $(-1)^j$.</p>

<p>This decoupling also appears in the discrete pressure Poisson equation. Projecting with $\mathrm{D}_c$ and $\mathrm{G}_c$ requires solving $\mathrm{D}_c\mathrm{G}_c p = \mathrm{D}_c\mathbf{u}^*/\Delta t$ (for $\rho = 1$), where the composite operator $\mathrm{D}_c\mathrm{G}_c$ is a wide-stencil Laplacian:</p>

<div class="eq" id="eq-wide">$$(\mathrm{D}_c\mathrm{G}_c p)_{i,j} = \frac{p_{i+2,j} - 2p_{i,j} + p_{i-2,j}}{4h^2} + \frac{p_{i,j+2} - 2p_{i,j} + p_{i,j-2}}{4h^2}$$<span class="eq-tag">(10.9)</span></div>

<p>Because (10.9) links each cell only to neighbours two steps away in each direction, partitioning the cells by the parity of $(i, j)$—even–even, odd–even, even–odd, and odd–odd—splits the grid into four independent sub-grids of spacing $2h$. Each parity class is coupled only to cells of the same class, with no stencil connections tying their pressure levels or profiles together. On a periodic domain each sub-grid contributes its own constant mode, expanding the null space of $\mathrm{D}_c\mathrm{G}_c$ from one dimension to four. Grid-scale differences in $\mathbf{u}^*$ drive the four sub-grids independently, leaving the pressure speckled with odd–even oscillations—the <a href="#/pathologies">checkerboard pressure</a> pathology—even while the velocity field remains smooth.</p>

<figure data-widget="pressure-checkerboard" class="wide"><figcaption>A periodic grid of 16 × 16 cells. Top: a smooth pressure hill plus $a$ times an odd–even pattern; the four marker shapes show the four parity sub-grids. Bottom: the $x$-component of the pressure force $-\partial p/\partial x$ as each grid computes it, on the same colour scale. The collocated grid uses (10.8) at the centres; the staggered grid uses the compact difference at the vertical faces.</figcaption></figure>

<div class="try"><ol>
<li>With the checkerboard at $a = 0.3$, the top panel is speckled but the collocated force (bottom left) is just the smooth hill's force. Read the largest change in that force: zero, to rounding error near $10^{-15}$.</li>
<li>The staggered force (bottom right) changes by 9.6, which is $2a/h$ with $h = 1/16$, because it differences adjacent cells directly.</li>
<li>Switch to stripes, then to <em>one sub-grid</em> (a bump on every fourth cell). The collocated force still does not change at all; the staggered one changes by $a/h$.</li>
<li>Drag $a$ to zero and back; the collocated force on the left never changes. Notice the cells marked with circles, which the collocated stencil couples only to other circle cells.</li>
</ol></div>

<div data-quiz="q4"></div>

<aside class="who" data-person="olga-ladyzhenskaya">Her name is on the inf-sup (Ladyzhenskaya–Babuška–Brezzi) condition, which says which pairs of velocity and pressure discretisations are stable. Pairs that fail it, like the collocated one here, admit spurious pressure modes such as the checkerboard.</aside>

<details class="deeper"><summary>Go deeper: the checkerboard in Fourier terms</summary>
<p>Substituting a Fourier mode $p_{i,j} = e^{\mathrm{i}(i\theta_x + j\theta_y)}$ on a periodic grid shows that the central gradient multiplies it by $\mathrm{i}\sin\theta_x/h$ and $\mathrm{i}\sin\theta_y/h$, and the wide Laplacian by $-(\sin^2\theta_x + \sin^2\theta_y)/h^2$. Both vanish when $\sin\theta_x = \sin\theta_y = 0$, which occurs for $\theta_x, \theta_y \in \{0, \pi\}$—the constant mode, the two stripe modes, and the checkerboard. By contrast, the compact five-point Laplacian has symbol $-4(\sin^2\tfrac{\theta_x}{2} + \sin^2\tfrac{\theta_y}{2})/h^2$, which vanishes only at $\theta = 0$. The discrepancy between the two operators is largest at the grid scale $\theta_x, \theta_y = \pi$, where the wide operator's symbol vanishes.</p>
</details>

<h2 id="mac">Staggering the grid</h2>

<p>Storing the velocity components on cell faces rather than at cell centres eliminates the decoupling. On a <dfn data-term="staggered-grid">staggered grid</dfn> the pressure stays at the cell centre, while $u$ lives at the midpoint of the vertical (left and right) faces and $v$ lives at the midpoint of the horizontal (bottom and top) faces. Each velocity component sits midway between the two pressures that drive it, and each cell's divergence is computed from the four normal velocities on its own faces:</p>

<div class="eq" id="eq-mac">$$(\mathrm{G}p)_{i+\frac12,j} = \frac{p_{i+1,j} - p_{i,j}}{h}, \qquad (\mathrm{D}\mathbf{u})_{i,j} = \frac{u_{i+\frac12,j} - u_{i-\frac12,j} + v_{i,j+\frac12} - v_{i,j-\frac12}}{h}$$<span class="eq-tag">(10.10)</span></div>

<p>Both stencils are compact, spanning a single cell width $h$. Their composition $\mathrm{D}\mathrm{G}$ is the standard five-point Laplacian, which couples every cell directly to its four face-sharing neighbours. Because adjacent cells have opposite parity, the staggered gradient of a checkerboard mode $a(-1)^{i+j}$ is $\pm 2a/h$, and only a spatially constant pressure has zero gradient everywhere. Moreover, $\mathrm{D}$ is the exact finite-volume flux balance over a cell (see <a href="#/conservation/finite-volume">finite volumes</a>), so the projection enforces volume conservation cell by cell, and the adjoint identity $\mathrm{G} = -\mathrm{D}^{\mathsf T}$ makes the discrete Helmholtz–Hodge decomposition orthogonal to machine precision.</p>

<figure data-widget="pressure-mac-cell"><figcaption>Where each number lives: pressures at the dots, $u$ (horizontal arrows) on vertical faces, $v$ (vertical arrows) on horizontal faces; on the collocated grid all sit at the centre. Tap a cell or face, or use the arrow keys. The value written is outlined in the write colour, the values read are in the read colour.</figcaption></figure>

<div class="try"><ol>
<li>With the staggered grid and gradient of $p$ selected, tap a vertical face. The stencil reads the two pressures immediately adjacent to the face, and dragging the checkerboard amplitude to 0.5 changes the gradient by $2a/h = 1$.</li>
<li>Switch to the collocated grid. The stencil now writes at a centre and reads the cells two apart, skipping its own pressure. Dragging the checkerboard slider leaves the computed gradient unchanged.</li>
<li>Choose <em>divergence of u</em>. On the staggered grid the stencil reads the four face velocities bounding the cell itself, whereas on the collocated grid it reads the velocities of neighbouring cells and skips the cell's own centre.</li>
</ol></div>

<p>The staggered layout is called the <dfn data-term="mac-grid">MAC grid</dfn>, after the marker-and-cell method of <a href="#/people/francis-harlow">Francis Harlow</a> and <a href="#/people/j-eddie-welch">J. Eddie Welch</a> at Los Alamos, published in Physics of Fluids in December 1965. Their abstract names its primary variables, "the pressure and the velocity components", and the marker particles that "move with the fluid". The method solved a Poisson equation for the pressure every step, two years before Chorin's note. The grid-based fluid solvers of computer graphics descend directly from it.</p>

<aside class="history" data-era="1965">Harlow and Welch named the method for its massless marker particles, which were advected with the flow to track free surfaces, while the Eulerian grid stored pressure at cell centres and velocity components on cell faces. In modern usage "MAC grid" usually refers to that staggered variable arrangement alone, independent of whether marker particles are present.</aside>

<aside class="who" data-person="francis-harlow">His Los Alamos group created the particle-in-cell method in the mid-1950s and, with Welch, the marker-and-cell method in 1965.</aside>

<p>Staggering has practical drawbacks, because any operation that combines different velocity components (such as advection, particle interpolation, or curved boundary treatment) requires spatial averaging across staggered locations, and extending the layout to unstructured meshes complicates the data structures. Many engineering finite-volume codes therefore keep all variables at cell centres and restore pressure–velocity coupling through <dfn data-term="rhie-chow">Rhie–Chow interpolation</dfn>, which forms the cell-face fluxes needed by the continuity equation by blending the interpolated centre velocity with a compact pressure-gradient correction across each face:</p>

<div class="eq" id="eq-rc">$$u_{i+\frac12} = \overline{u}_{i+\frac12} - d_{i+\frac12}\left(\frac{p_{i+1} - p_i}{h} - \overline{(\mathrm{G}_c p)}_{i+\frac12}\right)$$<span class="eq-tag">(10.11)</span></div>

<p>Here the bars denote averages of the two neighbouring cell-centre values and $d$ is a momentum-equation coefficient ($\Delta t/\rho$ in a projection step). For a smooth pressure field the bracketed fourth-difference term is $O(h^2)$, whereas for a checkerboard mode it equals $2a/h$, making the face flux sensitive to the grid-scale oscillations missed by the central gradient and restoring the compact five-point Laplacian in the face-flux continuity equation.</p>

<figure data-widget="pressure-rhie-chow" class="wide"><figcaption>Three ways to project a velocity stored at cell centres, on a periodic grid. <em>Exact</em> solves the wide-stencil equation (10.9); <em>approximate</em> solves with the compact five-point Laplacian and subtracts the central gradient; <em>Rhie–Chow</em> interpolates face velocities and projects them exactly. Left: the pressure, with the projected velocity. Right: the central divergence left behind, on the scale of the divergence before.</figcaption></figure>

<div class="try"><ol>
<li>Start with <em>exact</em> and the one-cell kick. The central divergence is gone (about $10^{-12}$ of the start), but 75% of the pressure is odd–even because the single-cell impulse excites only one of the four parity sub-grids.</li>
<li>Switch to <em>approximate</em>. The pressure is smooth (about 25% odd–even, from the kick's own sharpness), but 60% of the central divergence remains because the compact five-point Laplacian does not match the composite central operator $\mathrm{D}_c\mathrm{G}_c$.</li>
<li>Switch to <em>Rhie–Chow</em>. The face divergence is about $10^{-12}$ and the pressure is smooth. The centre velocities match those of the approximate projection, while the interpolated face fluxes are divergence-free to solver tolerance.</li>
<li>Choose the smooth start: approximate leaves about 12% of the divergence at 16 × 16 and 3% at 32 × 32, showing the $O(h^2)$ truncation difference between the two operators.</li>
</ol></div>

<aside class="who" data-person="rhie-chow">Their paper, presented in June 1982 and published in the AIAA Journal in November 1983, computed turbulent flow past an airfoil with trailing-edge separation on a collocated grid. The interpolation was a means to that end; the title says nothing about it.</aside>

<aside class="pitfall">The original Rhie–Chow formulation has two well-documented defects: its steady converged solution can depend on the momentum under-relaxation factor (Majumdar 1988) and, in unsteady flows, on the time step $\Delta t$. Miller and Schmidt (1988) also reported that "in regions of very rapidly varying pressure gradients, PWIM" (the pressure-weighted interpolation method) "can predict physically unrealistic convective velocities". Modern finite-volume solvers include consistent terms for the old-time and under-relaxation contributions to eliminate both dependencies.</aside>

<div data-quiz="q5"></div>

<h2 id="other-roads">Other roads to incompressibility</h2>

<p>Projection is one of four main algorithmic families used to enforce or approximate incompressibility across computational fluid dynamics.</p>

<p><strong>Artificial compressibility.</strong> In the same year as his projection note, Chorin proposed a hyperbolic alternative for steady flows. When only the steady state is needed, the transient path does not need to be divergence-free; introducing a synthetic compressibility allows the equations to be marched in pseudo-time so that artificial acoustic waves propagate pressure adjustments until the velocity settles. In Chorin's words, "The principle of the method lies in the introduction of an artificial compressibility δ into the equations of motion, in such a way that the final results do not depend on δ." In the form usually written today, the continuity equation is replaced by</p>

<div class="eq" id="eq-ac">$$\frac{\partial p}{\partial \tau} + \frac{1}{\delta}\,\nabla\cdot\mathbf{u} = 0$$<span class="eq-tag">(10.12)</span></div>

<p>with $\tau$ a pseudo-time and $1/\sqrt{\delta}$ playing the part of an artificial sound speed. When the solution stops changing, $\partial p/\partial\tau = 0$ and the constraint holds exactly. <dfn data-term="artificial-compressibility">Artificial compressibility</dfn> needs no Poisson solve, only explicit or implicit marching of a hyperbolic system. For unsteady flows it is wrapped inside each physical step and iterated to convergence there (dual time stepping).</p>

<p><strong>Weakly compressible methods.</strong> A related approach retains an explicit equation of state $p(\rho)$ with a numerical sound speed $c$ chosen large enough that density variations remain small. Dynamic pressure changes scale as $\rho U^2$, producing relative density variations governed by the Mach number:</p>

<div class="eq" id="eq-wc">$$\frac{\delta\rho}{\rho} \approx \frac{\delta p}{\rho c^2} \sim \frac{U^2}{c^2} = \mathrm{Ma}^2, \qquad \Delta t \lesssim \frac{h}{c + U}$$<span class="eq-tag">(10.13)</span></div>

<p>With $c$ set to ten times the peak flow speed, density variations stay around 1%, though explicit stability then restricts the time step to the acoustic scale $h/(c + U)$—roughly ten times smaller than an advective step. <dfn data-term="weakly-compressible">Weakly compressible</dfn> formulations are widely used when a global elliptic solve is impractical, notably in smoothed particle hydrodynamics (<dfn data-term="sph">SPH</dfn>) with a <dfn data-term="tait-equation">Tait equation of state</dfn> and in the <dfn data-term="lattice-boltzmann">lattice Boltzmann</dfn> method, which approaches incompressibility in the low-Mach limit. Chapter 13 covers both (<a href="#/lattice-particles/sph">SPH</a>, <a href="#/lattice-particles/lbm">lattice Boltzmann</a>, and <a href="#/lattice-particles/lbm-limits">its compressibility error</a>).</p>

<p><strong>Pressure correction (SIMPLE).</strong> Engineering finite-volume codes for steady flow mostly use the SIMPLE family, the Semi-Implicit Method for Pressure-Linked Equations. Each outer iteration starts from a provisional pressure, solves the discretised momentum equations, solves a pressure-correction equation derived from continuity, and updates both velocity and pressure. Because the pressure-correction equation drops the neighbour velocity corrections from the momentum stencil (the "semi-implicit" approximation), the pressure update must be under-relaxed for stability. Variants such as SIMPLER, SIMPLEC, and PISO retain more coupling per iteration to reduce the number of outer iterations.</p>

<aside class="who" data-person="suhas-patankar">With Brian Spalding he published the pressure-correction procedure behind SIMPLE in 1972. His 1980 book Numerical Heat Transfer and Fluid Flow made finite volumes on staggered grids with SIMPLE-type correction the standard engineering approach.</aside>

<aside class="history" data-era="1972">Citations for SIMPLE vary. The 1972 International Journal of Heat and Mass Transfer paper by Patankar and <a href="#/people/brian-spalding">Spalding</a> treats three-dimensional parabolic, or marching, flows. The version for recirculating flows is usually cited to Caretto, Gosman, Patankar and Spalding, presented at the third International Conference on Numerical Methods in Fluid Mechanics in 1972 and published in 1973. SIMPLER is dated 1979 in some accounts and presented in Patankar's 1980 book.</aside>

<table>
<thead><tr><th>Approach</th><th>What enforces $\nabla\cdot\mathbf{u} = 0$</th><th>Typical use</th><th>Main limitation</th></tr></thead>
<tbody>
<tr><td>Projection (Chorin–Temam)</td><td>a pressure Poisson solve every step</td><td>unsteady flow, graphics</td><td>one elliptic solve per step</td></tr>
<tr><td>Artificial compressibility</td><td>pseudo-time marching to a steady state</td><td>steady flow; dual time stepping</td><td>many pseudo-steps; only the converged state is incompressible</td></tr>
<tr><td>Weakly compressible (SPH, LBM)</td><td>a stiff equation of state</td><td>free surfaces, particles, GPUs</td><td>small steps; density error about $\mathrm{Ma}^2$; acoustic noise</td></tr>
<tr><td>Pressure correction (SIMPLE family)</td><td>a correction equation inside outer iterations</td><td>steady industrial finite-volume CFD</td><td>under-relaxation; many outer iterations</td></tr>
</tbody>
</table>

<p>Across all four families, enforcing $\nabla\cdot\mathbf{u} = 0$ requires coupling pressure globally across the domain, whether through pseudo-acoustic waves, stiff sound speeds, outer pressure-correction loops, or an elliptic solve at each step. In projection methods, the computational bottleneck is that Poisson solve. <a href="#/solvers/the-system">Chapter 11</a> shows how <a href="#/solvers/multigrid">multigrid</a> and <a href="#/solvers/krylov">conjugate gradients</a> reduce the hundreds of relaxation sweeps seen above to a handful of iterations, and quantifies <a href="#/solvers/cost">the volume drift caused by a loose solver tolerance</a>.</p>

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
        'About the same 7%, because pressure acts only where the fluid was pushed.',
        'Most of it, over 80%, because the elliptic pressure field responds across the whole box at once.',
        'None of it, because the sealed walls make the pressure cancel the push completely.',
        'It depends on how fast sound travels in the water.',
      ],
      answer: 1,
      explain: 'The measured share is about 86%. Because the pressure satisfies an elliptic Poisson equation, a local impulse alters the pressure throughout the domain at once, driving a return circulation around the sides of the box that retains about half of the initial kinetic energy. Sound speed does not appear in the incompressible equations, which correspond to the limit of infinite acoustic speed and instantaneous pressure transmission.',
    },
    q2: {
      type: 'mcq',
      q: 'You project a field $\\mathbf{w}$ and keep 78% of its kinetic energy. Where did the other 22% go?',
      choices: [
        'Numerical dissipation in the pressure solver.',
        'Into the gradient part $\\nabla\\phi$, which the projection removed; the two parts are orthogonal, so their energies add.',
        'It is stored as potential energy in the pressure field and returned later.',
        'Nowhere, because projection conserves kinetic energy up to rounding error.',
      ],
      answer: 1,
      explain: 'By (10.4), $\\int|\\mathbf{w}|^2 = \\int|\\mathbf{u}|^2 + \\int|\\nabla\\phi|^2$, so the removed gradient component $\\nabla\\phi$ accounts for the remaining 22% of the energy up to solver tolerance. Physically, that component represents motion that would compress the fluid; in a continuous incompressible flow, the pressure gradient acts simultaneously with the forcing so that compressive motion never develops.',
    },
    q3: {
      type: 'num',
      q: 'A sealed box of side 1 (24 × 24 cells) has water entering through its left wall at speed 1 and no outflow. A solver that first removes the mean of the right-hand side converges. What divergence $\\nabla\\cdot\\mathbf{u}$ does the projected velocity have in each cell?',
      answer: -1,
      tol: 0.05,
      explain: 'With a net inflow of $1 \\times 1 = 1$ per unit time and fixed wall velocities, the divergence theorem requires $\\int\\nabla\\cdot\\mathbf{u}\\,\\mathrm{d}V = \\oint\\mathbf{u}\\cdot\\mathbf{n}\\,\\mathrm{d}S = -1$ regardless of the pressure field. Subtracting the mean of the right-hand side distributes that net influx uniformly across the unit box, leaving a divergence of $-1$ in every cell because the boundary conditions themselves violate volume conservation.',
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
      explain: 'Because the central difference at cell $(i,j)$ subtracts $p_{i-1,j}$ from $p_{i+1,j}$, which share the same parity and receive the same checkerboard increment, the added pattern cancels identically. That zero gradient leaves the checkerboard mode uncoupled from the velocity on a collocated grid, whereas the compact staggered gradient differences adjacent cells and changes by $2a/h = 9.6$.',
    },
    q5: {
      type: 'mcq',
      q: 'A weakly compressible SPH water code sets its numerical sound speed to ten times the fastest flow speed. Roughly how large are its density variations?',
      choices: [
        'About 10%, because density errors scale with the Mach number.',
        'Of order 1%, because density errors scale with the square of the Mach number.',
        'Zero, because a stiff equation of state makes the fluid exactly incompressible.',
        'About 0.01%, because they scale with the fourth power of the Mach number.',
      ],
      answer: 1,
      explain: 'Dynamic pressure variations scale as $\\delta p \\sim \\rho U^2$, which the equation of state converts into relative density variations $\\delta\\rho/\\rho \\approx \\delta p/(\\rho c^2) \\sim \\mathrm{Ma}^2 = 0.01$ by (10.13). Resolving those acoustic waves restricts the explicit time step to roughly $h/(c+U)$, about ten times smaller than an advective step, and increasing $c$ further tightens that step restriction proportionally.',
    },
  },
  glossary: {
    'projection-method': {
      term: 'projection method',
      def: 'A fractional-step scheme for incompressible flow that advances the velocity without pressure to form $\\mathbf{u}^*$, solves a Poisson equation for the pressure, and subtracts the pressure gradient to make the updated velocity divergence-free. Chorin (1967–68), independently Temam (1969).',
      section: 'projection',
    },
    'helmholtz-hodge': {
      term: 'Helmholtz–Hodge decomposition',
      def: 'The unique decomposition of a vector field into a divergence-free component and the gradient of a scalar potential, $\\mathbf{w} = \\mathbf{u} + \\nabla\\phi$, under appropriate boundary conditions. Because the two components are orthogonal in $L^2$, their kinetic energies add. Derived by Stokes in 1849, prior to Helmholtz (1858).',
      section: 'hodge',
    },
    'pressure-poisson': {
      term: 'pressure Poisson equation',
      def: 'The elliptic equation for pressure obtained by taking the divergence of the momentum equation, $\\nabla^2 p = -\\rho\\,\\partial_i u_j\\,\\partial_j u_i + \\dots$, or in a discrete projection step, $\\nabla^2 p = (\\rho/\\Delta t)\\nabla\\cdot\\mathbf{u}^*$. Solving this linear system accounts for most of the cost of an incompressible projection step.',
      section: 'constraint',
    },
    'divergence-free': {
      term: 'divergence-free',
      def: 'A velocity field satisfying $\\nabla\\cdot\\mathbf{u} = 0$ everywhere, so that no net volume of fluid is created or destroyed in any control volume. On a staggered grid, the projection step enforces this balance cell by cell.',
      section: 'hodge',
    },
    'staggered-grid': {
      term: 'staggered grid',
      def: 'A grid arrangement that stores pressure at cell centres and each velocity component on the cell faces normal to that component. Because the resulting gradient and divergence stencils difference adjacent cells directly, oscillatory checkerboard modes produce a large gradient rather than lying in the null space.',
      section: 'mac',
    },
    'mac-grid': {
      term: 'MAC grid',
      def: 'The staggered arrangement of $u$, $v$ and $p$ introduced in Harlow and Welch\'s marker-and-cell method (1965), with $p_{i,j}$ at cell centres, $u_{i+1/2,j}$ on vertical faces, and $v_{i,j+1/2}$ on horizontal faces. In modern usage the term usually refers to the staggered grid layout alone.',
      section: 'mac',
    },
    'collocated-grid': {
      term: 'collocated grid',
      def: 'A grid that stores all variables (velocity components and pressure) at the same locations, usually the cell centres. While convenient on unstructured meshes, combining collocated storage with central differences decouples pressure into four parity sub-grids unless stabilised by a technique such as Rhie–Chow interpolation.',
      section: 'checkerboard',
    },
    checkerboard: {
      term: 'checkerboard mode',
      def: 'The grid-scale pressure oscillation $(-1)^{i+j}$ (along with the stripe modes $(-1)^i$ and $(-1)^j$). Because its central-difference gradient vanishes identically, a collocated scheme without momentum interpolation leaves this mode uncoupled from the velocity field.',
      section: 'checkerboard',
    },
    'rhie-chow': {
      term: 'Rhie–Chow interpolation',
      def: 'Momentum interpolation for cell-face velocities on a collocated grid, combining the average of adjacent cell-centre velocities with a fourth-difference pressure correction that replaces the averaged central gradient by the compact face gradient. Rhie and Chow, 1983 (presented 1982).',
      section: 'mac',
    },
    'artificial-compressibility': {
      term: 'artificial compressibility',
      def: 'Chorin\'s 1967 method for steady incompressible flow, which replaces $\\nabla\\cdot\\mathbf{u} = 0$ with a pseudo-time evolution equation $\\partial p/\\partial\\tau + \\delta^{-1}\\nabla\\cdot\\mathbf{u} = 0$ and marches until a steady state is reached.',
      section: 'other-roads',
    },
    'compatibility-condition': {
      term: 'compatibility condition',
      def: 'The requirement that the interior source of a pure-Neumann Poisson problem integrate to the prescribed boundary flux, meaning that total inflow must equal total outflow in an enclosed incompressible domain. Discretely, the right-hand side vector must sum to zero.',
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
      diagnose: 'Measure the odd–even content of the pressure on each 2 × 2 block as the fraction of variance in the checkerboard and stripe components, which stays near zero for a smooth field and approaches 3/4 when the pressure is supported on a single parity sub-grid. Check whether the discrete gradient and divergence stencils skip the centre cell.',
      mitigations: [
        'Store velocities on a staggered (MAC) grid, so gradient and divergence are compact and their product is the five-point Laplacian. Standard on structured grids; awkward on unstructured or curvilinear meshes.',
        'Keep a collocated grid but compute face fluxes with Rhie–Chow momentum interpolation. Standard in finite-volume codes; use a variant that removes the dependence on under-relaxation and time step.',
        'Use an approximate projection that solves the compact five-point Laplacian and accepts an $O(h^2)$ central divergence residual, an approach taken in some adaptive-mesh solvers.',
        'In finite elements, choose a velocity–pressure pair that satisfies the inf-sup (LBB) condition, such as Taylor–Hood, or add pressure stabilisation.',
      ],
      section: 'checkerboard',
      demo: { widget: 'pressure-rhie-chow', data: { preset: 'default' } },
    },
    {
      id: 'incomplete-projection',
      name: 'Incomplete projection',
      family: 'constraint',
      symptom: 'The flow behaves as if it were compressible—tracers bunch up in some regions and thin out in others, dye or smoke gains or loses volume, and liquid volume drifts in free-surface simulations. The error worsens when the grid is refined at a fixed iteration count.',
      cause: 'The pressure solve was stopped after too few iterations or at a loose tolerance, so only part of the divergence of $\\mathbf{u}^*$ was removed. Simple relaxation methods remove the large-scale part of the divergence slowest, and that is the part that moves the most fluid.',
      diagnose: 'Monitor the relative residual $\\|\\nabla\\cdot\\mathbf{u}\\|/\\|\\nabla\\cdot\\mathbf{u}^*\\|$ after each projection, and the total volume or the spacing of tracers over time. Check how the iteration count needed grows as you refine the grid.',
      mitigations: [
        'Use a solver whose iteration count stays bounded or grows slowly as the grid is refined, such as multigrid or conjugate gradients preconditioned with multigrid or incomplete Cholesky.',
        'Solve to a relative tolerance and check it, rather than running a fixed number of iterations; warm-start from the previous pressure.',
        'If the budget is fixed (real-time graphics), correct volume drift explicitly, for example by adding a small source term proportional to the volume error.',
        'Avoid adding artificial viscosity or spatial smoothing to damp the resulting oscillations, since smoothing masks the symptoms while leaving the underlying divergence error intact.',
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
      diagnose: 'Sum the right-hand side, or equivalently the net boundary flux $\\oint\\mathbf{u}_b\\cdot\\mathbf{n}\\,\\mathrm{d}S$, which should vanish to rounding error, and monitor the mean pressure for a linear drift from iteration to iteration.',
      mitigations: [
        'Balance the boundary fluxes by scaling the outflow to match the inflow, or replace one wall with an open Dirichlet pressure boundary.',
        'Project the right-hand side onto the compatible subspace by subtracting its mean, and remove the constant mode from the solution; because subtracting the mean masks an unbalanced boundary specification, log the magnitude of the removed mean.',
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
