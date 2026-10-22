// Chapter 12: A fluid you can stir. Stam's Stable Fluids step (advect,
// forces, implicit viscosity, projection) as a real-time sandbox; the
// semi-Lagrangian backtrace and why it never blows up; its numerical
// diffusion and mass drift; the first-order splitting error; BFECC and
// MacCormack with clamping; vorticity confinement; and the real-time budget.
// The kernel is ../sims/stablefluids.js (tests:
// tests/fluid-course/sims-stablefluids.test.js); every number in the prose
// was measured with it. Widgets live in ./stable-fluids/.

import { mountSandbox } from './stable-fluids/sandbox.js';
import { mountRotation } from './stable-fluids/rotation.js';
import { mountBacktrace } from './stable-fluids/backtrace.js';
import { mountSplitting } from './stable-fluids/splitting.js';

export const chapter = {
  id: 'stable-fluids',
  title: 'A fluid you can stir',
  short: 'Stable fluids',
  blurb: 'Semi-Lagrangian advection, operator splitting, numerical dissipation, and higher-order corrections.',
  minutes: 40,
  html: String.raw`
<p class="lead-in">Explicit advection and diffusion schemes are restricted by stability limits, blowing up whenever the time step exceeds the Courant or viscous threshold. An interactive simulation that must advance at a fixed sixty frames per second regardless of how fast the user stirs the fluid needs an unconditionally stable time step. Jos Stam's "Stable Fluids" algorithm (1999) achieves this by combining semi-Lagrangian backtrace advection, implicit viscosity, and a pressure projection so that no stage can amplify kinetic energy at any $\Delta t$. This chapter examines each stage of that split step, quantifies the numerical diffusion and splitting error that accompany large time steps, and compares two ways of restoring lost small-scale structure: forward–backward advection corrections (BFECC and MacCormack) and vorticity confinement.</p>

<h2 id="sandbox">A fluid that never blows up</h2>

<p>Below is a closed box of still fluid, 64 × 64 cells, holding two dyes in horizontal bands. Drag across it to stir. Each frame the solver takes one time step of the incompressible flow equations, carrying the velocity and the dyes along the flow, adding body forces, and projecting the velocity onto a divergence-free field with a <a href="#/pressure/projection">pressure projection</a>. The readouts report the <dfn data-term="courant-number">CFL number</dfn> (how many cells the fastest fluid crosses per step), the kinetic energy, the enstrophy (half the integral of the squared vorticity), the post-projection divergence residual, and the cumulative drift in total dye mass.</p>

<figure data-widget="stable-fluids-sandbox" class="wide"><figcaption>A closed 64 × 64 box (the phone size) with two dyes, MacCormack advection with clamping, a midpoint backtrace, and a multigrid pressure solve to a relative tolerance of $10^{-4}$. Drag to stir; "Stir for me" adds two opposite jets. The colour menu switches between dye, vorticity, divergence and pressure. Every control the chapter discusses is here: the advection scheme, the pressure solver and its sweeps, confinement $\varepsilon$, the time step, the grid and an obstacle.</figcaption></figure>

<div class="try"><ol>
<li>Drag fast. The CFL readout often exceeds 2, meaning the fastest fluid crosses two or more cells per step. An explicit upwind scheme would blow up above 1 (see <a href="#/advection/cfl">the CFL condition</a>), whereas the flow here remains bounded.</li>
<li>Push the time step slider to its maximum, 1/10, and stir hard. The flow becomes less accurate, but it still does not explode.</li>
<li>Switch Advection to Semi-Lagrangian, turn on the auto-stir paddle and press Reset. After two seconds only about a quarter of the cells still hold nearly pure dye (below 0.1 or above 0.9). With MacCormack selected after Reset, about half do. Stirring mixes the dye in both cases, but semi-Lagrangian reaches a blurred state faster because of interpolation smoothing.</li>
<li>Choose "No projection" under Pressure solve. The dye piles up in some places and thins out in others, because the velocity now has sources and sinks.</li>
</ol></div>

<p>Earlier three-dimensional Navier–Stokes solvers in computer graphics relied on explicit time stepping, which restricted the time step whenever velocities grew large.</p>

<aside class="who" data-person="foster-metaxas">At the University of Pennsylvania, Nick Foster and Dimitri Metaxas solved the full three-dimensional Navier–Stokes equations to animate liquids ("Realistic animation of liquids", Graphical Models and Image Processing, September 1996), and applied the approach to hot, turbulent gases at SIGGRAPH 97. They used explicit finite differences in the marker-and-cell tradition of <a href="#/people/francis-harlow">Harlow</a> and <a href="#/people/j-eddie-welch">Welch</a> (1965), so their time step was limited by stability.</aside>

<p>While earlier graphics papers had animated fluids with two-dimensional Navier–Stokes solvers, shallow-water equations, or vortex particles, Foster and Metaxas (1996) brought three-dimensional marker-and-cell Navier–Stokes simulation to graphics using explicit finite differences, whose stability required small time steps in rapid flows. Three years later, Stam replaced the explicit updates with unconditionally stable stages.</p>

<aside class="who" data-person="jos-stam">Working at Alias|wavefront, Stam presented "Stable Fluids" at SIGGRAPH 99. The paper combined backward-traced (semi-Lagrangian) advection, implicit viscosity and a pressure projection into a solver that stays bounded at any time step. He was candid about the cost, writing that the model "would not be accurate enough for most engineering applications" because it "suffers from too much “numerical dissipation”".</aside>

<p>As Stam noted in his 1999 paper, "The model would not be accurate enough for most engineering applications. Indeed, it suffers from too much “numerical dissipation”, i.e., the flow tends to dampen too rapidly as compared to actual experiments." In interactive graphics, that heightened numerical damping is an acceptable trade-off for guaranteed stability at a fixed frame rate.</p>

<aside class="history" data-era="1999">Stam wrote in 1999 that his method "cannot be found in the computational fluids literature". That claim is contested. Its main ingredient, semi-Lagrangian advection, was well established in numerical weather prediction (Staniforth and Côté reviewed it in 1991), and tracing characteristics backwards goes back to <a href="#/people/richard-courant">Courant</a>, Isaacson and Rees in 1952. Stam acknowledged this in his later paper for game developers (usually dated 2003), saying the idea "apparently goes back to the work by Courant et al.". The projection itself is <a href="#/people/alexandre-chorin">Chorin</a>'s (1967–68). What was new was the combination, tuned for graphics, and the decision to accept dissipation in exchange for stability.</aside>

<p>The solver in the sandbox advances each time step through four sequential stages:</p>

<ol>
<li><strong>Advect</strong>: transport the velocity, dyes, and temperature along the flow (next section).</li>
<li><strong>Forces</strong>: add user stirring, buoyancy, and optional vorticity confinement.</li>
<li><strong>Viscosity</strong>: diffuse the velocity with an implicit backward-Euler solve when $\nu > 0$ ($\nu = 0$ by default).</li>
<li><strong>Project</strong>: remove the velocity divergence with a pressure Poisson solve.</li>
</ol>

<p>Because each of the four stages is non-expansive in kinetic energy or maximum norm, their composition remains stable for any $\Delta t$, as <a href="#/stable-fluids/splitting">the operator-splitting section</a> analyses in detail.</p>

<div data-quiz="q1"></div>

<h2 id="semi-lagrangian">Look backwards: semi-Lagrangian advection</h2>

<p>Advection transports a scalar quantity along the flow without changing its value on fluid parcels, satisfying $Dq/Dt = 0$ in the language of the <a href="#/viewpoints/material-derivative">material derivative</a>. The explicit Eulerian schemes of <a href="#/advection/upwind">the advection chapter</a> approximate $\partial q/\partial t$ from neighbouring grid cells and become unstable when the flow crosses more than one cell per step.</p>

<p><dfn data-term="semi-lagrangian">Semi-Lagrangian</dfn> advection updates each grid point by tracing its characteristic trajectory backwards in time over $\Delta t$ to find the <dfn data-term="departure-point">departure point</dfn> where the fluid parcel arriving at $\mathbf{x}_{i,j}$ started the step, and evaluating the old field $q^n$ there. Because $q$ is constant along exact particle paths, only two numerical approximations enter: the backward trajectory integration is approximate, and the departure point generally falls between grid nodes so $q^n$ must be interpolated:</p>

<div class="eq" id="eq-sl">$$q^{n+1}_{i,j} = I\big[q^n\big](\mathbf{x}_d), \qquad \mathbf{x}_d = \mathbf{x}_{i,j} - \Delta t\,\mathbf{u}(\mathbf{x}_{i,j})$$<span class="eq-tag">(12.1)</span></div>

<p>Here $I[q^n]$ denotes spatial interpolation of the old field and $\mathbf{x}_d$ is the departure point estimated by a single backward Euler step. When streamlines are curved, a straight tangent step drifts off the streamline; the second-order midpoint (RK2) rule reduces that trajectory error by stepping halfway back to sample the velocity at the midpoint and using that velocity for the full backward step:</p>

<div class="eq" id="eq-rk2">$$\mathbf{x}_{\mathrm{mid}} = \mathbf{x}_{i,j} - \tfrac{1}{2}\Delta t\,\mathbf{u}(\mathbf{x}_{i,j}), \qquad \mathbf{x}_d = \mathbf{x}_{i,j} - \Delta t\,\mathbf{u}(\mathbf{x}_{\mathrm{mid}})$$<span class="eq-tag">(12.2)</span></div>

<p>In two dimensions the interpolation is usually bilinear. If the departure point falls at fractional coordinates $(a, b) \in [0,1]^2$ inside the cell formed by four surrounding grid nodes, bilinear interpolation forms the weighted average:</p>

<div class="eq" id="eq-bilinear">$$I[q](\mathbf{x}_d) = (1-a)(1-b)\,q_{00} + a(1-b)\,q_{10} + (1-a)\,b\,q_{01} + a\,b\,q_{11}$$<span class="eq-tag">(12.3)</span></div>

<p>Because the four weights are non-negative and sum to 1, the interpolated value always lies between the minimum and maximum of the four donor values. As Stam (1999) noted, "the maximum value of the new field is never larger than the largest value of the previous field." Because this maximum principle holds for any $\Delta t$, the scheme is unconditionally stable in $L^\infty$, and the Courant number determines only how many cells away the departure point lies rather than whether the iteration remains bounded.</p>

<figure data-widget="stable-fluids-backtrace"><figcaption>A 12 × 12 grid turning as a solid body, one turn per time unit, carrying a dye blob. Tap a cell (yellow outline: the value written). The dashed arc is the true path back over one step; the open ring is the exact departure point. The square is the Euler departure point and the dot is the midpoint (RK2) one. The four blue cells are the values the chosen backtrace interpolates, with their bilinear weights. "Advance whole field one step" applies a full step of the kernel to every cell.</figcaption></figure>

<div class="try"><ol>
<li>At the starting rotation per step, $\omega\Delta t = 30°$, the Euler point misses the exact one by about half a cell (0.48 cells for the default cell), whereas the midpoint point misses by less than a tenth (0.08). Raise it to 60°, and the misses grow to 1.9 and 0.66 cells.</li>
<li>Read "Euler radius / true radius". A straight step along the tangent always lands outside the circle by a factor of $\sqrt{1 + (\omega\Delta t)^2}$—1.129 at 30° and 1.448 at 60°. Repeated every step, this outward bias makes a rotating blob spiral outwards.</li>
<li>Press "Advance whole field one step" twelve times at 30°, one full turn. The blob comes back where it started, but its peak has dropped from 0.94 to about 0.49 because every bilinear lookup averages four neighbours.</li>
</ol></div>

<p>Because linear interpolation averages neighbouring values, each step introduces <dfn data-term="numerical-diffusion">numerical diffusion</dfn>. For a uniform velocity and a Courant number below 1, bilinear semi-Lagrangian advection is algebraically identical to first-order upwind differencing, since the departure point lies between the grid node and its immediate upwind neighbour with the same weights. A Taylor expansion of the interpolation error gives the effective diffusion coefficient:</p>

<div class="eq" id="eq-sldiff">$$D_{\mathrm{num}} = \frac{\alpha(1-\alpha)\,h^2}{2\,\Delta t}$$<span class="eq-tag">(12.4)</span></div>

<p>Here $h$ is the cell width and $\alpha \in [0, 1)$ is the fractional part of the Courant number, measuring where the departure point lands between two adjacent grid nodes. Equation (12.4) has two direct consequences. First, because $\Delta t$ appears in the denominator, taking a smaller time step at a fixed non-integer $\alpha$ increases $D_{\mathrm{num}}$—more steps are taken per unit time, and each interpolation adds $O(h^2)$ smoothing. Second, whenever the Courant number is an exact integer ($\alpha = 0$), the departure point lands directly on a grid node and $D_{\mathrm{num}}$ vanishes because values are copied without interpolation.</p>

<details class="deeper"><summary>Go deeper: where (12.4) comes from</summary>
<p>In one dimension with a constant velocity $a > 0$, the departure point of $x_j$ is $x_j - a\Delta t$. Decomposing the Courant number as $a\Delta t/h = m + \alpha$ with integer $m$ and $0 \le \alpha < 1$ places the departure point a fraction $\alpha$ of the way from $x_{j-m}$ to $x_{j-m-1}$, so linear interpolation gives</p>
<p>$$q_j^{n+1} = (1-\alpha)\,q^n_{j-m} + \alpha\,q^n_{j-m-1}.$$</p>
<p>A Taylor expansion around the exact departure point $x_j - a\Delta t$ shows that linear interpolation across a spacing $h$ at fraction $\alpha$ equals the exact value plus $\tfrac{1}{2}\alpha(1-\alpha)h^2\,\partial^2 q/\partial x^2 + O(h^3)$. Over a step $\Delta t$, that leading error matches a forward-Euler step of the diffusion equation with $D_{\mathrm{num}}\,\Delta t = \tfrac{1}{2}\alpha(1-\alpha)h^2$, yielding (12.4).</p>
<p>When the Courant number $\nu = a\Delta t/h$ is below 1, $m = 0$ and $\alpha = \nu$, so</p>
<p>$$D_{\mathrm{num}} = \frac{\nu(1-\nu)h^2}{2\Delta t} = \frac{a h(1-\nu)}{2},$$</p>
<p>which is the numerical diffusion coefficient of first-order upwind derived in <a href="#/advection/diffusion-dispersion">the advection chapter</a>. Shrinking $\Delta t$ reduces $\nu$ and increases $D_{\mathrm{num}}$ toward $ah/2$. Above $\nu = 1$, explicit upwind becomes unstable, whereas semi-Lagrangian advection shifts its interpolation stencil to the cell $(x_{j-m}, x_{j-m-1})$ enclosing the departure point.</p>
</details>

<p>Solid-body rotation provides a clean test of advection accuracy because the velocity field rotates the entire domain once per unit time, returning the exact solution to its initial profile after every full revolution so that any discrepancy is numerical error.</p>

<figure data-widget="stable-fluids-rotation" data-preset="sl" class="wide"><figcaption>Semi-Lagrangian advection of a Gaussian blob on a 64 × 64 grid in solid-body rotation, with the exact shape outlined (dashed). The CFL number is measured at the blob's centre; the plot shows the L2 error against the exact rotated shape over three turns, and the table shows the error, the range of values and the change in total dye.</figcaption></figure>

<div class="try"><ol>
<li>At CFL 1 the L2 error after one turn is about 0.044 and the blob keeps 56 % of its $\int q^2$. Set the CFL to 0.5, which takes twice as many smaller steps; the error rises to about 0.070 and the blob retains only 36 %, as predicted by (12.4).</li>
<li>Set the CFL to 3, where the error drops to about 0.023, and then to 5, where it rises again (0.032) as the two-stage midpoint backtrace becomes less accurate over longer arcs.</li>
<li>Switch the backtrace to Euler and watch the blob spiral outwards as it fades.</li>
<li>Switch the plot to "dye total". At CFL 1 the total changes by +0.27 % in one turn; at CFL 5 by −4.7 %.</li>
</ol></div>

<p>That last experiment illustrates a second limitation of semi-Lagrangian advection. Because (12.1) interpolates point values at departure locations rather than exchanging fluxes across shared cell faces as a <a href="#/conservation/finite-volume">finite-volume scheme</a> does, nothing enforces a discrete conservation balance between neighbouring cells, and the total mass of dye or smoke can drift upward or downward over time.</p>

<aside class="pitfall">If a game uses semi-Lagrangian advection for something that must be conserved, such as the amount of smoke a fire has produced or the volume of a liquid, it will slowly gain or lose it. The drift is worst for thin features at large CFL numbers. See <a href="#/pathologies/semi-lagrangian-mass-loss">semi-Lagrangian mass loss</a> and <a href="#/pathologies/semi-lagrangian-smearing">semi-Lagrangian smearing</a> in the gallery.</aside>

<div data-quiz="q2"></div>

<div data-quiz="q3"></div>

<h2 id="splitting">One step, four stages</h2>

<p>The incompressible Navier–Stokes equations couple advection, body forces, viscous diffusion, and the incompressibility constraint simultaneously. Rather than solving a coupled nonlinear system at each frame, Stable Fluids uses <dfn data-term="operator-splitting">operator splitting</dfn>, advancing one physical term at a time so that each stage takes the output of the preceding stage as its input. Writing $A$ for semi-Lagrangian advection and $P$ for the pressure projection, the simulation kernel advances $\mathbf{u}^n$ to $\mathbf{u}^{n+1}$ in four sub-steps:</p>

<div class="eq" id="eq-step">$$\begin{aligned} \mathbf{u}^{(1)} &= A(\mathbf{u}^n) \\ \mathbf{u}^{(2)} &= \mathbf{u}^{(1)} + \Delta t\,\mathbf{f} \\ \big(I - \nu\,\Delta t\,\nabla_h^2\big)\,\mathbf{u}^{(3)} &= \mathbf{u}^{(2)} \\ \mathbf{u}^{n+1} &= P\,\mathbf{u}^{(3)} \end{aligned}$$<span class="eq-tag">(12.5)</span></div>

<p>Stam's 1999 paper ordered the stages as forces, advection, diffusion, and projection; the kernel here advects before adding forces so that flow-dependent forces such as vorticity confinement are evaluated on the advected velocity. Both orderings have the same first-order splitting accuracy, and placing the projection last ensures that the velocity field used for advection at the start of the next step is discretely divergence-free.</p>

<p>Each of the four stages is unconditionally stable on its own. Bilinear semi-Lagrangian advection is a convex average that cannot increase the maximum velocity, adding a bounded body force changes the velocity by at most $\Delta t\,\|\mathbf{f}\|$, the backward-Euler viscosity solve damps every discrete Fourier mode for any $\nu\Delta t/h^2 > 0$ (see <a href="#/stiffness/implicit">implicit methods</a>; the kernel test suite verifies stability at $\nu\Delta t/h^2 = 384$), and the orthogonal projection $P$ removes the curl-free component of $\mathbf{u}^{(3)}$ and can only decrease kinetic energy. Composing these four stages therefore produces a time step that remains bounded for any $\Delta t$.</p>

<details class="deeper"><summary>Go deeper: why implicit viscosity cannot blow up</summary>
<p>Substituting a discrete Fourier mode $\hat u\,e^{\mathrm{i}(\theta_x i + \theta_y j)}$ into the third equation of (12.5) with the five-point Laplacian multiplies its amplitude by</p>
<p>$$g = \frac{1}{1 + 4\,\dfrac{\nu\Delta t}{h^2}\left(\sin^2\dfrac{\theta_x}{2} + \sin^2\dfrac{\theta_y}{2}\right)},$$</p>
<p>which satisfies $0 < g \le 1$ for every wavenumber $(\theta_x, \theta_y)$ and every $\nu\Delta t/h^2 > 0$. Very large time steps strongly damp high-wavenumber modes without oscillating or blowing up, whereas explicit forward-Euler diffusion in two dimensions requires $\nu\Delta t/h^2 \le 1/4$ for stability.</p>
</details>

<p>The sandbox preset below steps through the sub-steps one stage at a time, colouring the domain by the velocity divergence normalised by the pre-projection divergence.</p>

<figure data-widget="stable-fluids-sandbox" data-preset="stages" class="wide"><figcaption>The sandbox, paused, coloured by divergence $\nabla\cdot\mathbf{u}$, after two opposite jets have been added. "Step one stage" runs the advect, forces and project stages one at a time (the viscosity stage is skipped because $\nu = 0$); the status line reports the largest divergence after each one.</figcaption></figure>

<div class="try"><ol>
<li>Press "Step one stage" three times. After the jets and the advection the field is full of divergence; after Project it is blank.</li>
<li>Keep pressing. Each new step's advection and forces put divergence back, and each projection removes it again. The divergence never builds up.</li>
</ol></div>

<p>Sequential operator splitting introduces a time-discretisation error whenever the sub-step operators do not commute, because the continuous PDE applies all processes simultaneously rather than one after another. By the Baker–Campbell–Hausdorff expansion for two linear operators $A$ and $B$,</p>

<div class="eq" id="eq-lie">$$e^{\Delta t B}\,e^{\Delta t A} = e^{\Delta t (A + B) + \frac{1}{2}\Delta t^2 [B, A] + O(\Delta t^3)}, \qquad [B, A] = BA - AB$$<span class="eq-tag">(12.6)</span></div>

<p>Each step incurs a local commutator error of $O(\Delta t^2)$, which over $T/\Delta t$ steps accumulates to a global error of $O(\Delta t)$ at a fixed time $T$, making sequential splitting first-order accurate in time regardless of the spatial accuracy of the individual stages.</p>

<details class="deeper"><summary>Go deeper: Strang splitting</summary>
<p>The leading $\Delta t^2 [B, A]$ commutator error in (12.6) cancels when the sub-steps are arranged symmetrically—applying a half step of $A$, a full step of $B$, and a second half step of $A$:</p>
<p>$$e^{\frac{1}{2}\Delta t A}\,e^{\Delta t B}\,e^{\frac{1}{2}\Delta t A} = e^{\Delta t (A+B) + O(\Delta t^3)}.$$</p>
<p>This symmetric composition is Strang splitting (Strang, 1968), which achieves second-order accuracy in time when each sub-step operator is at least second order, and adjacent half-steps of $A$ between consecutive time steps can be combined. Following Stam (1999), the kernel here uses the first-order Lie–Trotter sequence (12.5).</p>
</details>

<p>The next figure isolates this splitting error on the two-dimensional Taylor–Green vortex, a periodic array of four counter-rotating vortices. In the inviscid limit ($\nu = 0$) the Taylor–Green vortex is an exact steady solution of the two-dimensional Euler equations, so any decay in kinetic energy is purely numerical dissipation. Running the full split step to $t = 0.5$ across five time steps with three advection schemes shows that once BFECC or MacCormack removes most of the spatial interpolation diffusion, the remaining energy loss scales linearly with $\Delta t$.</p>

<figure data-widget="stable-fluids-splitting" class="wide"><figcaption>Taylor–Green vortex on a periodic 32 × 32 grid ($U = 1$), run to $t = 0.5$ with each scheme at Courant numbers 0.25 to 4 (about 0.3 s of computation, done in slices across frames). Top: energy lost against the time step, log–log, with a dashed line of slope 1 ($\propto \Delta t$). Bottom: kinetic energy over time at the chosen Courant number, with the exact answer (no loss) at 1. The 64 × 64 grid takes about six times longer.</figcaption></figure>

<div class="try"><ol>
<li>Read the readouts. Halving the time step from Courant 0.5 to 0.25 divides BFECC's kinetic-energy loss by about 1.85 (from 13.3 % to 7.2 %) on the 32 × 32 grid, and by 1.92 (from 7.1 % to 3.7 %) on the 64 × 64 grid, matching the $O(\Delta t)$ scaling of a first-order splitting error.</li>
<li>Semi-Lagrangian's loss stays nearly flat (36.4 % to 37.4 %, a ratio of 0.975) because its $O(h^2/\Delta t)$ interpolation blur increases as the time step shrinks and offsets the reduction in splitting error.</li>
<li>Pick Courant 4 for the history plot. On the 32 × 32 grid all three schemes lose more than half their energy by $t = 0.5$, where the large-step splitting and trajectory errors dominate the spatial differences between schemes.</li>
</ol></div>

<p>Although BFECC and MacCormack raise the spatial accuracy of the advection stage, the complete split step (12.5) remains first order in $\Delta t$ because of the sequential operator splitting.</p>

<div data-quiz="q4"></div>

<h2 id="sharper">Getting the detail back</h2>

<p>Because semi-Lagrangian advection smooths the field on both forward and backward steps in the same way, advecting a field forward by $\Delta t$ and then backward by $-\Delta t$ provides a direct estimate of the one-step interpolation error.</p>

<p>Let $A$ denote one forward semi-Lagrangian step and $A^R$ the same step with the velocity negated. Applying $A$ to $q$ gives $\hat q = A(q)$, and advecting backwards gives $\bar q = A^R(\hat q)$. Because both passes add the same leading even-order diffusion error $e$ to second order, $\bar q \approx q + 2e$, so $e \approx \tfrac{1}{2}(\bar q - q)$. <dfn data-term="bfecc">BFECC</dfn> (back and forth error compensation and correction) subtracts that estimated error from $q$ before taking a final forward step:</p>

<div class="eq" id="eq-bfecc">$$\hat q = A(q), \quad \bar q = A^{R}(\hat q), \quad q^{n+1} = A\big(q + \tfrac{1}{2}(q - \bar q)\big)$$<span class="eq-tag">(12.7)</span></div>

<p>BFECC requires three semi-Lagrangian interpolations per step. The semi-Lagrangian <dfn data-term="maccormack">MacCormack</dfn> scheme eliminates the third pass by applying the error correction directly to the forward-advected field $\hat q$:</p>

<div class="eq" id="eq-maccormack">$$\hat q = A(q), \quad \bar q = A^{R}(\hat q), \quad q^{n+1} = \hat q + \tfrac{1}{2}(q - \bar q)$$<span class="eq-tag">(12.8)</span></div>

<p>Because subtracting $\tfrac{1}{2}(\bar q - q)$ introduces negative stencil weights, the corrected value is no longer a convex combination of surrounding grid values and can overshoot or undershoot near steep gradients. Clamping each corrected value to the minimum and maximum of the four grid nodes read during the forward interpolation $\hat q = A(q)$ acts as a local <em>limiter</em> that prevents new extrema and restores unconditional $L^\infty$ stability.</p>

<aside class="history" data-era="2003–2008">BFECC was introduced by Dupont and Liu (2003) for level-set interface tracking, and applied to the advection steps of a fluid solver by Kim, Liu, Llamas and Rossignac (2005). Selle, <a href="#/people/ronald-fedkiw">Fedkiw</a>, Kim, Liu and Rossignac (2008) showed that the cheaper form (12.8) estimates the error in the same way, kept it bounded with a clamp, and named it by analogy with R. W. MacCormack's 1969 predictor–corrector finite-difference method.</aside>

<figure data-widget="stable-fluids-rotation" class="wide"><figcaption>The same rotation test with three schemes side by side: semi-Lagrangian, BFECC (no limiter, its default) and MacCormack (clamped). The outline is the exact shape; the plot shows each scheme's L2 error, and the table shows each scheme's range of values and change in total dye.</figcaption></figure>

<div class="try"><ol>
<li>After one turn of the Gaussian at CFL 1 the L2 errors are about 0.044 (semi-Lagrangian), 0.014 (MacCormack) and 0.0029 (BFECC). BFECC keeps 99 % of $\int q^2$.</li>
<li>Switch to the slotted disc, a shape with sharp edges and corners. The errors are closer (0.148, 0.144, and 0.086) because steep discontinuities challenge all three schemes. Without a limiter, BFECC overshoots to a range of [−0.08, 1.14], whereas clamped MacCormack stays within [0, 1].</li>
<li>Switch the plot to "dye total". MacCormack gains 7 % of the slotted disc in one turn, showing that forward–backward error correction does not make the scheme conservative.</li>
</ol></div>

<figure data-widget="stable-fluids-rotation" data-preset="overshoot" class="wide"><figcaption>The broken case: the slotted disc at CFL 3, with the Euler backtrace and the limiter switched off for BFECC and MacCormack. Choose "clamp" in the limiter menu, or the midpoint backtrace, to repair it.</figcaption></figure>

<div class="try"><ol>
<li>Watch the table. After one turn the unlimited MacCormack values run from about −59 to 58, and BFECC's from −10 to 8, as the unclipped correction amplifies trajectory discrepancies.</li>
<li>Choose "clamp" in the limiter menu. Both stay inside [0, 1] (MacCormack's L2 error is then about 0.23). While the clamp prevents unbounded growth, the first-order Euler backtrace still spirals the disc outward and loses about a third of its dye in one turn.</li>
<li>Alternatively, leave the limiter off and switch to the midpoint backtrace, under which MacCormack overshoots only slightly (−0.19 to 0.99) because the forward and backward trajectories retrace each other much more closely.</li>
</ol></div>

<p>Refining the grid across 32, 64, and 128 cells at a fixed Courant number of 3 yields a measured spatial convergence order of about 1.0 for plain semi-Lagrangian advection, 1.9 for BFECC, and 1.6 to 1.8 for clamped MacCormack. While both correction schemes approach second-order spatial accuracy on smooth profiles, MacCormack's $L^2$ error on the Gaussian blob remains about five times larger than BFECC's, discontinuous edges still suffer from $O(1)$ gradient clipping, and none of the three schemes conserves total dye mass. Moreover, unconditional stability holds only for plain semi-Lagrangian advection and for the clamped forms of BFECC and MacCormack.</p>

<p>Higher-order spatial interpolation offers a third way to reduce numerical diffusion; Fedkiw, Stam, and Jensen (2001) replaced bilinear interpolation with a monotonic cubic Hermite interpolant that steepens gradients without introducing new extrema. All three approaches trade extra memory reads per cell—two bilinear lookups for MacCormack, three for BFECC, or a $4 \times 4$ stencil for bicubic interpolation—for lower dissipation, as benchmarked in <a href="#/stable-fluids/budget">the final section</a>.</p>

<aside class="pitfall">An unlimited correction scheme combined with a cheap Euler backtrace can blow up at large CFL numbers, the very situation stable fluids was meant to handle. If you use BFECC or MacCormack, use a limiter, a midpoint backtrace, or both. See <a href="#/pathologies/maccormack-overshoot">MacCormack overshoot</a>.</aside>

<div data-quiz="q5"></div>

<h2 id="confinement">Vorticity confinement</h2>

<p>Even with a second-order advection correction, a coarse grid smooths out vortices that span only a few cells, causing smoke plumes to lose their small-scale curls. <dfn data-term="vorticity-confinement">Vorticity confinement</dfn> counteracts this dissipative spreading by applying a body force where <dfn data-term="vorticity">vorticity</dfn> is concentrated, accelerating the fluid tangentially around each vortex core in its existing direction of rotation:</p>

<div class="eq" id="eq-conf">$$\mathbf{N} = \frac{\nabla|\omega|}{\big|\nabla|\omega|\big|}, \qquad \mathbf{f}_{\mathrm{conf}} = \varepsilon\,h\,\big(\mathbf{N}\times\boldsymbol{\omega}\big)$$<span class="eq-tag">(12.9)</span></div>

<p>$\mathbf{N}$ is a unit vector pointing up the slope of $|\omega|$, towards the nearest vortex centre. Crossing it with the vorticity gives a force that runs around the centre in the vortex's own direction. The strength $\varepsilon$ is a user-chosen parameter, and the factor $h$ makes the force shrink as the grid is refined.</p>

<aside class="who" data-person="john-steinhoff">At the University of Tennessee Space Institute, Steinhoff developed confinement for helicopter rotor wakes, where tip vortices have to travel a long way across a coarse grid without smearing out. He presented it as "vorticity capturing" by January 1992; the standard reference is Steinhoff and Underhill, Physics of Fluids, August 1994.</aside>

<aside class="who" data-person="ronald-fedkiw">With Stam and Henrik Wann Jensen, Fedkiw brought confinement into graphics in "Visual simulation of smoke" (SIGGRAPH 2001), which solved the inviscid equations on a staggered grid with semi-Lagrangian advection and a projection. They described the idea plainly: "The basic idea is to inject the energy lost due to numerical dissipation back into the fluid using a forcing term." They credited it to Steinhoff: "This technique was invented by Steinhoff about 10 years ago".</aside>

<figure data-widget="stable-fluids-sandbox" data-preset="smoke" class="wide"><figcaption>Buoyant smoke: a hot, smoky source at the bottom of a 48 × 72 box with an open top, buoyancy and confinement $\varepsilon = 0.25$ (the kernel's preset). Compare the next figure, which is the same plume with $\varepsilon = 0$.</figcaption></figure>

<figure data-widget="stable-fluids-sandbox" data-preset="smoke-plain" class="wide"><figcaption>The same plume with confinement off. Switch the colour to vorticity in both figures to compare how much small-scale swirl survives.</figcaption></figure>

<p>In the stirred 48 × 48 box after 1.5 s, increasing $\varepsilon$ raises the measured enstrophy monotonically from 3.67 at $\varepsilon = 0$ to 3.97 at 0.15, 4.29 at 0.3, and 4.95 at 0.6, restoring small-scale billows to the smoke plume. Because the factor of $h$ causes $\mathbf{f}_{\mathrm{conf}}$ to vanish in the limit $h \to 0$, Fedkiw, Stam, and Jensen termed the force "physically consistent" with the inviscid Euler equations. On any finite grid, however, vorticity confinement acts as an empirical anti-dissipative forcing with a user-tuned parameter $\varepsilon$ that injects kinetic energy wherever $|\boldsymbol{\omega}|$ has a gradient, and setting $\varepsilon$ too large amplifies grid-scale perturbations into self-sustaining motion.</p>

<figure data-widget="stable-fluids-sandbox" data-preset="noise" class="wide"><figcaption>The broken case: the stirred box with confinement $\varepsilon = 4$ and no paddle. The box is closed and nothing stirs it after the first two jets, so the kinetic energy should only fall.</figcaption></figure>

<div class="try"><ol>
<li>Let it run and watch the kinetic energy readout. With $\varepsilon = 0$ the energy of this box falls (from 0.012 at 2 s to 0.007 at 10 s). At $\varepsilon = 4$ it climbs instead, from about 0.02 at 2 s to about 0.07 at 10 s. The status line reports when the energy rises with nothing stirring the box.</li>
<li>Switch the colour to vorticity to see the domain fill with grid-scale vortices generated by the confinement force.</li>
<li>Bring $\varepsilon$ down to 0.3 and Reset. The swirls stay crisp longer than at 0 but the energy still decays.</li>
</ol></div>

<aside class="pitfall">Because vorticity confinement acts on any local peak in $|\boldsymbol{\omega}|$, it amplifies grid-scale truncation noise alongside resolved vortices; when $\varepsilon$ is too large, it injects kinetic energy faster than numerical diffusion removes it. See <a href="#/pathologies/confinement-noise">confinement noise</a>.</aside>

<div data-quiz="q6"></div>

<h2 id="budget">The real-time budget</h2>

<p>An interactive application running at 60 frames per second has 16.7 ms per frame in total, leaving perhaps 8 ms on a mid-range mobile device for the fluid solver once rendering and application logic are accounted for. Choosing the grid resolution, advection scheme, and pressure solver comes down to allocating that per-frame budget across stages.</p>

<p>The table below reports the mean wall-clock time per step of the stirred box in the course kernel on a desktop CPU (Node, averaged over 300 steps with active pointer stirring; a mid-range phone is roughly three to five times slower):</p>

<table>
<thead><tr><th>Grid</th><th class="num">Cells</th><th class="num">MacCormack + multigrid</th><th class="num">Semi-Lagrangian + multigrid</th></tr></thead>
<tbody>
<tr><td>64 × 64</td><td class="num">4 096</td><td class="num">1.3–1.4 ms</td><td class="num">0.9 ms</td></tr>
<tr><td>96 × 96</td><td class="num">9 216</td><td class="num">3.0–3.5 ms</td><td class="num">2.0 ms</td></tr>
<tr><td>128 × 128</td><td class="num">16 384</td><td class="num">5.3–5.7 ms</td><td class="num">3.7 ms</td></tr>
</tbody>
</table>

<p>A 64 × 64 grid is therefore the default mobile resolution in the sandbox, as larger grids such as 96 × 96 ("desktop") can exceed the 12 ms threshold above which the widget drops to stepping every second frame.</p>

<p>The other major expense is the pressure projection, which real-time implementations often truncate to a small fixed number of Jacobi sweeps because each sweep is simple and data-parallel. On this CPU benchmark, however, fixed Jacobi sweeps are both slower and less accurate than multigrid; on the 64 × 64 box stirred by the paddle, 30 Jacobi sweeps take 1.6 ms per step compared with 1.4 ms for warm-started multigrid, while leaving a mean relative divergence of about 0.10 against multigrid's 0.0006. Even 200 Jacobi sweeps (about 5 ms per step) leave nine times more residual divergence than multigrid, because—as <a href="#/solvers">the solvers chapter</a> showed—local relaxation damps short-wavelength residuals rapidly while barely reducing domain-scale compressions.</p>

<figure data-widget="stable-fluids-sandbox" data-preset="jacobi" class="wide"><figcaption>The same box stirred by the paddle, with only 5 Jacobi sweeps per projection, coloured by divergence. Compare the "divergence left" readout with the default multigrid solve; move the sweeps slider to see how many it takes.</figcaption></figure>

<div class="try"><ol>
<li>With 5 sweeps, more than half of the divergence survives each projection (the readout averages about 0.6 and at times comes close to 1). Switch the colour to dye, where the bands bunch up and thin out as if the fluid were compressible.</li>
<li>Drag the sweeps slider to 30, then 200. The divergence falls, but slowly, and the cost per step rises.</li>
<li>Switch the solver to multigrid. About two V-cycles per step bring the divergence down to a thousandth or less.</li>
</ol></div>

<p>Beyond visible compression of dye bands, stopping the pressure solve after 30 Jacobi sweeps in a stably stratified box under gravity fails to maintain hydrostatic balance, generating spurious currents of speed 0.69 where the exact velocity is zero—an example of an <a href="#/pathologies/incomplete-projection">incomplete projection</a>.</p>

<aside class="who" data-person="robert-bridson">Bridson's "Fluid Simulation for Computer Graphics" (2008; second edition 2015) became the standard practical guide to grid fluids for graphics, including semi-Lagrangian advection on a MAC grid and the pressure solve with conjugate gradients preconditioned by modified incomplete Cholesky, MIC(0). In this small kernel MIC(0) is the slowest of the converged solvers; at 64 × 64 its projection costs about 1.25 ms against 0.55 ms for multigrid, because it needs ten or more iterations where warm-started multigrid needs about two V-cycles.</aside>

<figure data-widget="stable-fluids-sandbox" data-preset="budget" class="wide"><figcaption>The desktop grid (96 × 96) with 30 Jacobi sweeps and the paddle on. Watch "cost per step"; on a slow device the sandbox drops to stepping every second frame.</figcaption></figure>

<p>Each approximation in the real-time budget produces a characteristic visual artifact when pushed too far:</p>

<ul>
<li><strong>Coarse grid or plain semi-Lagrangian advection</strong>: dye edges and small vortices diffuse away within a few seconds as kinetic energy and scalar variance are damped by $O(h^2/\Delta t)$ interpolation smoothing.</li>
<li><strong>Under-converged pressure projection</strong>: the velocity retains large-scale divergence, causing dye bands to bunch and thin as if compressible and liquid volumes to drift.</li>
<li><strong>Large time steps</strong>: the simulation remains stable, but curved trajectories are under-resolved and the $O(\Delta t)$ operator-splitting error dissipates more than half of the Taylor–Green vortex energy by $t = 0.5$ at Courant 4 on a 32 × 32 grid.</li>
<li><strong>Excessive vorticity confinement</strong>: grid-scale truncation noise is amplified into small, self-sustaining vortices that inject kinetic energy into an unforced domain.</li>
<li><strong>Unconserved scalar advection</strong>: because point-sampling advection does not balance cell-face fluxes, total dye mass drifts by up to a few per cent over several seconds of rapid stirring, and faster for thin features at high Courant numbers.</li>
</ul>

<p>While the Stable Fluids splitting guarantees boundedness at any time step, visual and physical fidelity depend on balancing these five sources of error.</p>

<h2 id="sources">Sources and further reading</h2>

<ol class="refs">
<li>J. Stam, "Stable fluids", <em>Proceedings of SIGGRAPH 99</em>, 121–128 (1999). doi:10.1145/311535.311548. The method, its stability argument and its admitted numerical dissipation.</li>
<li>N. Foster and D. Metaxas, "Realistic animation of liquids", <em>Graphical Models and Image Processing</em> 58(5), 471–483 (1996). Explicit 3-D Navier–Stokes for liquids in graphics.</li>
<li>A. Staniforth and J. Côté, "Semi-Lagrangian integration schemes for atmospheric models—a review", <em>Monthly Weather Review</em> 119(9), 2206–2223 (1991). The method's roots in weather prediction.</li>
<li>R. Courant, E. Isaacson and M. Rees, "On the solution of nonlinear hyperbolic differential equations by finite differences", <em>Communications on Pure and Applied Mathematics</em> 5(3), 243–255 (1952).</li>
<li>A. J. Chorin, "Numerical solution of the Navier–Stokes equations", <em>Mathematics of Computation</em> 22(104), 745–762 (1968). The projection method.</li>
<li>G. Strang, "On the construction and comparison of difference schemes", <em>SIAM Journal on Numerical Analysis</em> 5(3), 506–517 (1968). Symmetric (Strang) splitting.</li>
<li>T. F. Dupont and Y. Liu, "Back and forth error compensation and correction methods for removing errors induced by uneven gradients of the level set function", <em>Journal of Computational Physics</em> 190(1), 311–324 (2003).</li>
<li>B. Kim, Y. Liu, I. Llamas and J. Rossignac, "FlowFixer: using BFECC for fluid simulation", <em>Eurographics Workshop on Natural Phenomena</em>, 51–56 (2005). doi:10.2312/NPH/NPH05/051-056.</li>
<li>A. Selle, R. Fedkiw, B. Kim, Y. Liu and J. Rossignac, "An unconditionally stable MacCormack method", <em>Journal of Scientific Computing</em> 35(2–3), 350–371 (issue dated 2008; online November 2007). doi:10.1007/s10915-007-9166-4.</li>
<li>J. Steinhoff and D. Underhill, "Modification of the Euler equations for 'vorticity confinement': application to the computation of interacting vortex rings", <em>Physics of Fluids</em> 6(8), 2738–2744 (1994). doi:10.1063/1.868164.</li>
<li>R. Fedkiw, J. Stam and H. W. Jensen, "Visual simulation of smoke", <em>Proceedings of SIGGRAPH 2001</em>, 15–22 (2001). doi:10.1145/383259.383260. Vorticity confinement and monotonic cubic interpolation for smoke.</li>
<li>G. I. Taylor and A. E. Green, "Mechanism of the production of small eddies from large ones", <em>Proceedings of the Royal Society of London A</em> 158(895), 499–521 (1937). The Taylor–Green vortex.</li>
<li>S. T. Zalesak, "Fully multidimensional flux-corrected transport algorithms for fluids", <em>Journal of Computational Physics</em> 31(3), 335–362 (1979). The slotted-disc rotation test.</li>
<li>R. Bridson, <em>Fluid Simulation for Computer Graphics</em>, A K Peters (2008); second edition, CRC Press (2015). The practical reference for everything in this chapter.</li>
</ol>
`,
  widgets: {
    'stable-fluids-sandbox': mountSandbox,
    'stable-fluids-rotation': mountRotation,
    'stable-fluids-backtrace': mountBacktrace,
    'stable-fluids-splitting': mountSplitting,
  },
  quizzes: {
    q1: {
      type: 'predict',
      q: 'Before you stir hard: the CFL readout in the sandbox will soon read 2 or more, so the fastest fluid crosses two cells per step. What happens?',
      choices: [
        'It blows up within a few steps, like the explicit upwind scheme above CFL 1.',
        'It stays bounded. The step becomes less accurate, but no value can grow without limit.',
        'The solver quietly halves the time step until the CFL number is back below 1.',
        'The pressure solve stops converging, so the divergence readout climbs without limit.',
      ],
      answer: 1,
      explain: 'The Courant–Friedrichs–Lewy stability limit applies to explicit schemes that compute $\\partial q/\\partial t$ from fixed neighbour stencils. Semi-Lagrangian advection instead interpolates the old field at the departure point regardless of how many cells away it lies, and because bilinear interpolation is a convex combination of four values, no new extrema can form. With the time step held fixed by the slider, large Courant numbers increase truncation error without causing instability.',
    },
    q2: {
      type: 'mcq',
      q: 'You run a semi-Lagrangian solver on a fixed grid and halve the time step, to make it more accurate. What happens to the blurring of a rotating blob after one turn?',
      choices: [
        'It roughly halves, because the error of a first-order method is proportional to $\\Delta t$.',
        'It worsens, because twice as many interpolations are performed and each adds $O(h^2)$ smoothing.',
        'It does not change, because the blur depends only on the grid spacing $h$.',
        'It disappears once the CFL number is below 1.',
      ],
      answer: 1,
      explain: 'By (12.4), the effective numerical diffusion coefficient is $D_{\\mathrm{num}} = \\alpha(1-\\alpha)h^2/(2\\Delta t)$ with $\\Delta t$ in the denominator. On the 64 × 64 rotating Gaussian test, halving the Courant number from 1 to 0.5 raises the one-turn $L^2$ error from 0.044 to 0.070 because twice as many diffusive interpolations are performed per revolution.',
    },
    q3: {
      type: 'num',
      q: 'A blob turns as a solid body. In one time step it rotates by $\\omega\\Delta t = 0.5$ radians. A single straight (Euler) backtrace from a point at radius $r$ lands at what multiple of $r$ from the centre?',
      answer: 1.118,
      tol: 0.01,
      unit: '× r',
      explain: 'Because the velocity at radius $r$ has magnitude $\\omega r$ tangent to the circle, a straight backward Euler step of length $\\omega r\\Delta t$ lands at radius $r\\sqrt{1 + (\\omega\\Delta t)^2} = r\\sqrt{1.25} \\approx 1.118\\,r$. Repeated at every step, this outward radial bias causes a rotating blob to spiral outward, whereas the midpoint (RK2) backtrace samples the velocity halfway back and nearly eliminates the radial drift.',
    },
    q4: {
      type: 'predict',
      q: 'The splitting figure is about to run. When the time step is halved (Courant number 0.5 to 0.25), which schemes will lose about half as much kinetic energy by $t = 0.5$?',
      choices: [
        'All three, because every scheme here is first order in time.',
        'BFECC and MacCormack, while semi-Lagrangian changes very little because its interpolation blur grows as the step shrinks.',
        'None, because numerical dissipation comes from the spatial grid rather than the time step.',
        'Only semi-Lagrangian, because it is the only first-order scheme.',
      ],
      answer: 1,
      explain: 'On the 32 × 32 Taylor–Green vortex, halving the Courant number from 0.5 to 0.25 reduces BFECC\'s kinetic-energy loss from 13.3% to 7.2% (a ratio of 1.85, and 1.92 at 64 × 64), exposing the $O(\\Delta t)$ operator-splitting error. Plain semi-Lagrangian advection changes from 36.4% to 37.4% because its $O(h^2/\\Delta t)$ interpolation diffusion increases as $\\Delta t$ shrinks, offsetting the smaller splitting error.',
    },
    q5: {
      type: 'mcq',
      q: 'The MacCormack correction can create values outside the range of the starting field. What does the clamping limiter do?',
      choices: [
        'It rescales the whole field after each step so that the total amount of dye is unchanged.',
        'It clips each new value to the range of the four grid values its first interpolation read, so no new maxima or minima can appear.',
        'It reduces the time step locally wherever the CFL number exceeds 1.',
        'It switches the backtrace from Euler to the midpoint rule near sharp edges.',
      ],
      answer: 1,
      explain: 'Clamping restricts each corrected value to the minimum and maximum of the four grid values read during the forward interpolation, restoring the local maximum principle that keeps semi-Lagrangian advection bounded. It does not enforce mass conservation (clamped MacCormack gains about 7% of the slotted disc\'s mass over one turn at CFL 1) or alter $\\Delta t$ or the backtrace trajectory. Without clamping, MacCormack with an Euler backtrace at CFL 3 amplifies overshoots to about $\\pm 58$.',
    },
    q6: {
      type: 'mcq',
      q: 'Vorticity confinement adds the force $\\varepsilon h\\,(\\mathbf{N}\\times\\boldsymbol{\\omega})$. Which statement is true?',
      choices: [
        'It models a real physical effect that numerical schemes leave out, so a larger $\\varepsilon$ is always more realistic.',
        'It conserves kinetic energy by transferring energy from large scales to small scales.',
        'It is a correction for numerical diffusion. It shrinks with the cell size $h$, and on a fixed grid a large $\\varepsilon$ adds energy and grid-scale noise.',
        'It removes divergence from the velocity, so the projection can use fewer iterations.',
      ],
      answer: 2,
      explain: 'Because the confinement force is scaled by $h$, it vanishes as $h \\to 0$, but on any fixed grid it injects kinetic energy wherever vorticity has a nonzero gradient. In the closed, unforced sandbox at $\\varepsilon = 4$, the kinetic energy climbs from about 0.02 at 2 s to 0.07 at 10 s, and the subsequent pressure projection is still needed to remove the divergence introduced by the force.',
    },
  },
  glossary: {
    'semi-lagrangian': {
      term: 'semi-Lagrangian advection',
      def: 'Advection by tracing each grid point backwards along the flow over $\\Delta t$ to its departure point and interpolating the old field there. With bilinear interpolation the update is a convex combination of four values and is stable at any Courant number, though each step introduces $O(h^2/\\Delta t)$ numerical diffusion and does not conserve total mass.',
      section: 'semi-lagrangian',
    },
    'departure-point': {
      term: 'departure point',
      def: 'The position at the start of a time step of the fluid parcel that arrives at a given grid node at the end of the step, estimated by integrating the velocity field backwards in time with an Euler or midpoint (RK2) step.',
      section: 'semi-lagrangian',
    },
    'operator-splitting': {
      term: 'operator splitting',
      def: 'Advancing an evolution equation with multiple physical terms by applying each sub-step operator sequentially (advection, body forces, implicit viscosity, and pressure projection). Sequential Lie–Trotter splitting is first-order accurate in time when the operators do not commute, whereas symmetric Strang splitting is second order.',
      section: 'splitting',
    },
    'stable-fluids': {
      term: 'Stable Fluids',
      def: 'Jos Stam\'s 1999 algorithm for interactive incompressible flow, combining semi-Lagrangian backtrace advection, body forces, implicit viscous diffusion, and a Chorin–Temam pressure projection. Because every stage is unconditionally stable, the solver accepts arbitrarily large time steps while introducing numerical diffusion at coarse resolutions or small Courant numbers.',
      section: 'sandbox',
    },
    bfecc: {
      term: 'BFECC',
      def: 'Back and forth error compensation and correction (Dupont and Liu, 2003; Kim et al., 2005), a three-pass semi-Lagrangian scheme that advects a field forward and backward to estimate the leading diffusion error $\\tfrac{1}{2}(\\bar q - q)$, subtracts that estimate from the initial field, and advects forward a final time to achieve nearly second-order accuracy on smooth fields.',
      section: 'sharper',
    },
    maccormack: {
      term: 'MacCormack (semi-Lagrangian)',
      def: 'A two-pass semi-Lagrangian correction scheme (Selle et al., 2008) that applies the forward–backward error estimate directly to the forward-advected field, $q^{n+1} = \\hat q + \\tfrac{1}{2}(q - \\bar q)$, and clamps the result to the range of the four donor nodes to prevent new extrema. Named by analogy with R. W. MacCormack\'s 1969 finite-difference scheme.',
      section: 'sharper',
    },
    'vorticity-confinement': {
      term: 'vorticity confinement',
      def: 'An empirical body force $\\varepsilon h\\,(\\mathbf{N}\\times\\boldsymbol{\\omega})$, with $\\mathbf{N} = \\nabla|\\boldsymbol{\\omega}|/|\\nabla|\\boldsymbol{\\omega}||$ pointing toward vortex cores, designed to counteract numerical diffusion by accelerating swirling motion around local vorticity peaks (Steinhoff and Underhill, 1994; Fedkiw, Stam, and Jensen, 2001).',
      section: 'confinement',
    },
  },
  pathologies: [
    {
      id: 'semi-lagrangian-smearing',
      name: 'Semi-Lagrangian smearing',
      family: 'accuracy',
      symptom: 'Sharp dye edges and small vortices diffuse away within a few seconds, smoke plumes appear thick and overly viscous, and a rotating blob loses peak amplitude and spreads. Reducing the time step on a fixed grid increases the blurring.',
      cause: 'Every time step interpolates the old field at departure points, and bilinear interpolation averages four surrounding values with an effective diffusion coefficient $\\alpha(1-\\alpha)h^2/(2\\Delta t)$, where $\\alpha$ is the fractional part of the Courant number, so taking more steps per unit time increases total smoothing.',
      diagnose: 'Advect a profile with a known exact solution under solid-body rotation and measure both the $L^2$ error and the retained fraction of $\\int q^2$ after one revolution at two different time steps; on a 64 × 64 grid a Gaussian blob retains 56% of $\\int q^2$ at CFL 1 but only 36% at CFL 0.5.',
      mitigations: [
        'Use a forward–backward correction scheme such as clamped MacCormack (two interpolations per cell) or BFECC (three), which reduce the Gaussian blob\'s $L^2$ error by factors of roughly 3 and 15.',
        'Refine the spatial grid if the frame budget permits, since the interpolation error scales as $O(h^2)$ at fixed Courant number.',
        'Use a higher-order interpolant such as monotonic cubic Hermite interpolation to steepen resolved gradients.',
        'Avoid reducing $\\Delta t$ below what trajectory accuracy requires, since smaller Courant numbers increase the number of diffusive interpolations per unit time.',
        'Add moderate vorticity confinement to sustain small-scale rotational features when visual detail matters more than strict energy conservation.',
      ],
      section: 'semi-lagrangian',
      demo: { widget: 'stable-fluids-rotation', data: { preset: 'sl' } },
    },
    {
      id: 'semi-lagrangian-mass-loss',
      name: 'Semi-Lagrangian mass drift',
      family: 'conservation',
      symptom: 'The total mass of dye, smoke, or liquid drifts upward or downward in a closed domain with no sources or sinks, with thin filaments losing or gaining mass most rapidly at large Courant numbers.',
      cause: 'Semi-Lagrangian advection samples point values at departure locations rather than exchanging conservative fluxes across shared cell faces, and neither BFECC nor MacCormack enforces discrete flux balance.',
      diagnose: 'Track the spatial integral of each advected scalar in a closed domain without sources or decay; on a 64 × 64 grid, a rotating Gaussian changes its total mass by +0.27% per revolution at CFL 1 and by −4.7% at CFL 5.',
      mitigations: [
        'Use a conservative flux-form finite-volume or cell-integrated semi-Lagrangian scheme when strict mass conservation is required.',
        'Apply a global mass-restoration correction after each step to match the known total mass, noting that uniform rescaling redistributes error across the domain.',
        'Use moderate Courant numbers when advecting thin filaments so departure trajectories remain well resolved.',
      ],
      section: 'semi-lagrangian',
      demo: { widget: 'stable-fluids-rotation', data: { preset: 'mass' } },
    },
    {
      id: 'maccormack-overshoot',
      name: 'MacCormack and BFECC overshoot',
      family: 'accuracy',
      symptom: 'Unphysical extrema—such as negative dye concentrations or densities exceeding 1—appear adjacent to sharp edges, and when paired with a first-order Euler backtrace at Courant numbers above 2 they grow into a numerical instability.',
      cause: 'Subtracting the forward–backward error estimate $\\tfrac{1}{2}(\\bar q - q)$ introduces negative weights so the update is no longer a convex combination of donor values, and trajectory errors from a straight Euler backtrace on curved streamlines amplify the discrepancy.',
      diagnose: 'Monitor the minimum and maximum of each advected scalar at every step; on the slotted disc at CFL 3 with an Euler backtrace and no limiter, MacCormack reaches about $\\pm 58$ in a single revolution, while unlimited BFECC overshoots to 1.14 even at CFL 1.',
      mitigations: [
        'Clamp each corrected value to the minimum and maximum of the four donor nodes read during the forward interpolation, eliminating new extrema.',
        'Revert locally to the plain semi-Lagrangian update whenever the corrected value falls outside the donor range.',
        'Use a second-order midpoint (RK2) backtrace so the forward and backward trajectories retrace each other accurately on curved streamlines.',
      ],
      section: 'sharper',
      demo: { widget: 'stable-fluids-rotation', data: { preset: 'overshoot' } },
    },
    {
      id: 'confinement-noise',
      name: 'Confinement noise',
      family: 'accuracy',
      symptom: 'A smooth flow develops a dense field of grid-scale vortices, smoke plumes appear to boil, and the total kinetic energy of an unforced closed domain increases over time.',
      cause: 'Vorticity confinement applies a tangential force proportional to $\\varepsilon h$ wherever $|\\boldsymbol{\\omega}|$ has a gradient, amplifying grid-scale truncation noise alongside resolved vortices and injecting energy faster than numerical diffusion removes it when $\\varepsilon$ is large.',
      diagnose: 'Turn off external forcing in a closed box and monitor the kinetic energy, which should decay monotonically; at $\\varepsilon = 4$ in the 64 × 64 sandbox, the kinetic energy instead rises from about 0.02 at 2 s to 0.07 at 10 s.',
      mitigations: [
        'Use a modest confinement strength $\\varepsilon$ tuned to the grid resolution (the smoke preset uses $\\varepsilon = 0.25$).',
        'Rely primarily on a second-order advection scheme (clamped MacCormack or BFECC) or a finer grid to preserve resolved vortices.',
        'Modulate the confinement force by scalar smoke concentration so that quiescent ambient fluid is not forced.',
      ],
      section: 'confinement',
      demo: { widget: 'stable-fluids-sandbox', data: { preset: 'noise' } },
    },
  ],
  css: `
.chapter[data-chapter="stable-fluids"] .sf-field { min-width: 0; }
.chapter[data-chapter="stable-fluids"] .sf-trio { display: grid; gap: 6px; justify-content: center; }
.chapter[data-chapter="stable-fluids"] .sf-panel { min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 2px; }
.chapter[data-chapter="stable-fluids"] .sf-panel-title { display: flex; align-items: center; gap: 5px; font-size: 0.82rem; line-height: 1.15; color: var(--muted); overflow-wrap: anywhere; }
.chapter[data-chapter="stable-fluids"] .sf-swatch { display: inline-block; width: 10px; height: 10px; border-radius: 2px; flex: none; }
.chapter[data-chapter="stable-fluids"] .sf-table-wrap { overflow-x: auto; max-width: 100%; }
.chapter[data-chapter="stable-fluids"] .sf-table { border-collapse: collapse; font-size: 0.86rem; margin: 6px 0 0; }
.chapter[data-chapter="stable-fluids"] .sf-table th, .chapter[data-chapter="stable-fluids"] .sf-table td { padding: 2px 8px; border-bottom: 1px solid var(--line); text-align: left; }
.chapter[data-chapter="stable-fluids"] .sf-table .num { text-align: right; font-variant-numeric: tabular-nums; }
.chapter[data-chapter="stable-fluids"] .sf-table .bad { color: var(--bad); font-weight: 600; }
.chapter[data-chapter="stable-fluids"] .sf-dim { opacity: 0.5; }
.chapter[data-chapter="stable-fluids"] .sf-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; }
.chapter[data-chapter="stable-fluids"] .sf-plot { min-width: 0; }
`,
};
