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
  blurb: 'Semi-Lagrangian advection, projection, numerical dissipation, and the tricks that fight it.',
  minutes: 40,
  html: String.raw`
<p class="lead-in">Every solver in this course so far has had a speed limit: take too large a time step and it explodes. That is fine for a calculation that runs overnight. It is not fine for a fluid you stir with your finger, which has to produce a new frame sixty times a second whatever you do to it. This chapter builds such a fluid. It uses the recipe that made interactive fluids common, Jos Stam's "Stable Fluids" of 1999, which never blows up at any time step. You will take it apart stage by stage, find out why it is stable, and measure the price: it quietly drains energy and smears detail. Then you will try the tricks that win some of the detail back, and see which of them are numerics and which are make-up.</p>

<h2 id="sandbox">A fluid that never blows up</h2>

<p>Below is a closed box of still fluid, 64 × 64 cells, holding two dyes in horizontal bands. Drag across it to stir. Each frame the solver takes one time step of the incompressible flow equations: it carries the velocity and the dyes along the flow, adds any forces, and then makes the velocity divergence-free with a <a href="#/pressure/projection">pressure projection</a>. The readouts show what the step is doing: how many cells the fastest fluid crosses per step (the <dfn data-term="courant-number">CFL number</dfn>), the kinetic energy, the enstrophy (half the integral of the vorticity squared, a measure of how much swirl there is), how much divergence the projection left behind, and how much of the first dye has been gained or lost.</p>

<figure data-widget="stable-fluids-sandbox" class="wide"><figcaption>A closed 64 × 64 box (the phone size) with two dyes, MacCormack advection with clamping, a midpoint backtrace, and a multigrid pressure solve to a relative tolerance of $10^{-4}$. Drag to stir; "Stir for me" adds two opposite jets. The colour menu switches between dye, vorticity, divergence and pressure. Every control the chapter discusses is here: the advection scheme, the pressure solver and its sweeps, confinement $\varepsilon$, the time step, the grid and an obstacle.</figcaption></figure>

<div class="try"><ol>
<li>Drag fast. The CFL readout often goes above 2: the fastest fluid crosses two or more cells per step. An explicit upwind scheme would blow up at 1 (see <a href="#/advection/cfl">the CFL condition</a>). Nothing happens here.</li>
<li>Push the time step slider to its maximum, 1/10, and stir hard. The flow becomes less accurate, but it still does not explode.</li>
<li>Switch Advection to Semi-Lagrangian, turn on the auto-stir paddle and press Reset. After two seconds only about a quarter of the cells still hold nearly pure dye (below 0.1 or above 0.9). Choose MacCormack and Reset: about half do. Stirring really does mix, so both end up mixed, but semi-Lagrangian gets there faster, partly by blurring.</li>
<li>Choose "No projection" under Pressure solve. The dye piles up in some places and thins out in others, because the velocity now has sources and sinks.</li>
</ol></div>

<p>The stability you just saw is what made interactive fluids practical. It is worth knowing what came before.</p>

<aside class="who" data-person="foster-metaxas">At the University of Pennsylvania, Nick Foster and Dimitri Metaxas solved the full three-dimensional Navier–Stokes equations to animate liquids ("Realistic animation of liquids", Graphical Models and Image Processing, September 1996), and applied the approach to hot, turbulent gases at SIGGRAPH 97. They used explicit finite differences in the marker-and-cell tradition of <a href="#/people/francis-harlow">Harlow</a> and <a href="#/people/j-eddie-welch">Welch</a> (1965), so their time step was limited by stability.</aside>

<p>Foster and Metaxas's work was an early full 3-D Navier–Stokes liquid animation in graphics. It was not the first fluid model in graphics: earlier papers had used shallow-water equations, vortex particles and a simplified 2-D Navier–Stokes solver. But their explicit scheme meant that a fast flow forced a small time step. Stam removed that limit.</p>

<aside class="who" data-person="jos-stam">Working at Alias|wavefront, Stam presented "Stable Fluids" at SIGGRAPH 99. The paper combined backward-traced (semi-Lagrangian) advection, implicit viscosity and a pressure projection into a solver that stays bounded at any time step. He was candid about the cost, writing that the model "would not be accurate enough for most engineering applications" because it "suffers from too much “numerical dissipation”".</aside>

<p>Stam's full sentence is worth reading, because it sets the terms of this whole chapter: "The model would not be accurate enough for most engineering applications. Indeed, it suffers from too much “numerical dissipation”, i.e., the flow tends to dampen too rapidly as compared to actual experiments." Stability was bought with accuracy. For a film or a game that is often a good trade: the eye forgives a flow that is a little too viscous, but it does not forgive a frame full of NaNs.</p>

<aside class="history" data-era="1999">Stam wrote in 1999 that his method "cannot be found in the computational fluids literature". That claim is contested. Its main ingredient, semi-Lagrangian advection, was well established in numerical weather prediction (Staniforth and Côté reviewed it in 1991), and tracing characteristics backwards goes back to <a href="#/people/richard-courant">Courant</a>, Isaacson and Rees in 1952. Stam acknowledged this in his later paper for game developers (usually dated 2003), saying the idea "apparently goes back to the work by Courant et al.". The projection itself is <a href="#/people/alexandre-chorin">Chorin</a>'s (1967–68). What was new was the combination, tuned for graphics, and the decision to accept dissipation in exchange for stability.</aside>

<p>The solver you are stirring has four stages per step, which the rest of the chapter takes apart in turn:</p>

<ol>
<li><strong>Advect</strong>: carry the velocity, the dyes and any temperature along the flow (next section).</li>
<li><strong>Forces</strong>: add your stirring, buoyancy and, optionally, vorticity confinement.</li>
<li><strong>Viscosity</strong>: diffuse the velocity, implicitly, when a viscosity is set (it is zero here).</li>
<li><strong>Project</strong>: remove the divergence with a pressure solve.</li>
</ol>

<p>Each stage is either unconditionally stable or a projection, which never adds energy. That is the whole secret of the method, and <a href="#/stable-fluids/splitting">the splitting section</a> makes it precise. The first stage is the clever one.</p>

<div data-quiz="q1"></div>

<h2 id="semi-lagrangian">Look backwards: semi-Lagrangian advection</h2>

<p>Advection moves a quantity along with the flow without changing it. A blob of dye keeps its value as it is carried along: in the language of the <a href="#/viewpoints/material-derivative">material derivative</a>, $Dq/Dt = 0$. The explicit schemes of <a href="#/advection/upwind">the advection chapter</a> work on the Eulerian grid: they estimate $\partial q/\partial t$ from neighbouring values, and become unstable when the flow crosses more than a cell per step.</p>

<p><dfn data-term="semi-lagrangian">Semi-Lagrangian</dfn> advection asks a different question. Do not ask where the fluid at this grid point is going. Ask where the fluid that <em>will</em> be at this grid point at the end of the step <em>came from</em>. Follow the flow backwards for one time step, from the grid point to its <dfn data-term="departure-point">departure point</dfn>, and copy the old value from there. Because $q$ does not change along the path, that is exactly the new value, apart from two errors: the backward path is only approximate, and the departure point is usually between grid points, so its value has to be interpolated.</p>

<div class="eq" id="eq-sl">$$q^{n+1}_{i,j} = I\big[q^n\big](\mathbf{x}_d), \qquad \mathbf{x}_d = \mathbf{x}_{i,j} - \Delta t\,\mathbf{u}(\mathbf{x}_{i,j})$$<span class="eq-tag">(12.1)</span></div>

<p>Here $I[q^n]$ means "interpolate the old field", and $\mathbf{x}_d$ is the departure point found with one straight Euler step backwards. On a curved path a straight step misses the curve. A better choice is the midpoint rule (a second-order Runge–Kutta step): go back half a step, read the velocity there, and use it for the full step.</p>

<div class="eq" id="eq-rk2">$$\mathbf{x}_{\mathrm{mid}} = \mathbf{x}_{i,j} - \tfrac{1}{2}\Delta t\,\mathbf{u}(\mathbf{x}_{i,j}), \qquad \mathbf{x}_d = \mathbf{x}_{i,j} - \Delta t\,\mathbf{u}(\mathbf{x}_{\mathrm{mid}})$$<span class="eq-tag">(12.2)</span></div>

<p>In two dimensions the interpolation is usually bilinear. Write the departure point's position inside the cell formed by four grid values as fractions $a$ and $b$ of a cell width. The new value is a weighted average of those four values:</p>

<div class="eq" id="eq-bilinear">$$I[q](\mathbf{x}_d) = (1-a)(1-b)\,q_{00} + a(1-b)\,q_{10} + (1-a)\,b\,q_{01} + a\,b\,q_{11}$$<span class="eq-tag">(12.3)</span></div>

<p>The four weights are never negative and they add up to 1. So the new value always lies between the smallest and largest of the four values it was read from. However large the time step, no new value can exceed the largest old value, and nothing can grow. Stam put it this way: "the maximum value of the new field is never larger than the largest value of the previous field". That single property is why the method is unconditionally stable. The CFL number now only says how far back the departure point is. It does not decide whether the scheme survives.</p>

<figure data-widget="stable-fluids-backtrace"><figcaption>A 12 × 12 grid turning as a solid body, one turn per time unit, carrying a dye blob. Tap a cell (yellow outline: the value written). The dashed arc is the true path back over one step; the open ring is the exact departure point. The square is the Euler departure point and the dot is the midpoint (RK2) one. The four blue cells are the values the chosen backtrace interpolates, with their bilinear weights. "Advance whole field one step" applies a full step of the kernel to every cell.</figcaption></figure>

<div class="try"><ol>
<li>At the starting rotation per step, $\omega\Delta t = 30°$, the Euler point misses the exact one by about half a cell (0.48 cells for the default cell); the midpoint point misses by less than a tenth (0.08). Raise it to 60°: the misses grow to 1.9 and 0.66 cells.</li>
<li>Read "Euler radius / true radius". A straight step along the tangent always lands outside the circle, by a factor of exactly $\sqrt{1 + (\omega\Delta t)^2}$: 1.129 at 30°, 1.448 at 60°. Repeated every step, this makes a rotating blob spiral outwards.</li>
<li>Press "Advance whole field one step" twelve times at 30°, one full turn. The blob comes back where it started, but its peak has dropped from 0.94 to about 0.49. The weights in the blue cells show why: every new value is an average.</li>
</ol></div>

<p>Averaging is the catch. An average of neighbouring values is smoother than the values themselves, so every step smooths the field a little. This is <dfn data-term="numerical-diffusion">numerical diffusion</dfn> again, the same disease as first-order upwind. In fact, for a constant velocity and a CFL number below 1, linear semi-Lagrangian advection <em>is</em> the upwind scheme: the departure point lies between the grid point and its upwind neighbour, and the interpolation weights are the upwind scheme's coefficients. The expansion below gives the size of the effect:</p>

<div class="eq" id="eq-sldiff">$$D_{\mathrm{num}} = \frac{\alpha(1-\alpha)\,h^2}{2\,\Delta t}$$<span class="eq-tag">(12.4)</span></div>

<p>Here $h$ is the cell width and $\alpha$ is the fractional part of the CFL number: how far between two grid points the departure point lands. Two things follow, and the first is a surprise. Look at the $\Delta t$ in the denominator: at a fixed fractional position, <em>a smaller time step blurs more</em>, because there are more interpolations per unit of time and each one adds the same smoothing. Second, when the departure point lands exactly on a grid point ($\alpha = 0$), there is no blur at all, because the value is copied, not averaged.</p>

<details class="deeper"><summary>Go deeper: where (12.4) comes from</summary>
<p>Take one dimension and a constant velocity $a > 0$. The departure point of $x_j$ is $x_j - a\Delta t$. Write $a\Delta t/h = m + \alpha$, with $m$ a whole number and $0 \le \alpha < 1$; the departure point then lies a fraction $\alpha$ of the way from $x_{j-m}$ to $x_{j-m-1}$. Linear interpolation gives</p>
<p>$$q_j^{n+1} = (1-\alpha)\,q^n_{j-m} + \alpha\,q^n_{j-m-1}.$$</p>
<p>The error of linear interpolation between two points a distance $h$ apart, at fraction $\alpha$, is $\tfrac{1}{2}\alpha(1-\alpha)h^2 q''$: the interpolated value equals the exact value plus that term. So each step computes the exact shift plus $\tfrac{1}{2}\alpha(1-\alpha)h^2\,\partial^2 q/\partial x^2$. That is what one step of a diffusion equation with coefficient $D$ adds, with $D\,\Delta t = \tfrac{1}{2}\alpha(1-\alpha)h^2$, which is (12.4).</p>
<p>When the CFL number $\nu = a\Delta t/h$ is below 1, $m = 0$ and $\alpha = \nu$, so</p>
<p>$$D_{\mathrm{num}} = \frac{\nu(1-\nu)h^2}{2\Delta t} = \frac{a h(1-\nu)}{2},$$</p>
<p>which is exactly the numerical diffusion of first-order upwind found in <a href="#/advection/diffusion-dispersion">the advection chapter</a>. Shrinking $\Delta t$ makes $\nu$ smaller and $D_{\mathrm{num}}$ larger, up to $ah/2$. Above $\nu = 1$, upwind blows up; semi-Lagrangian just moves on to the next pair of grid points.</p>
</details>

<p>The best test of an advection scheme is a shape that should come back unchanged. In the next figure a frozen velocity field turns the whole box once per time unit, so after each whole turn the exact answer is the starting shape. Any difference is numerical error.</p>

<figure data-widget="stable-fluids-rotation" data-preset="sl" class="wide"><figcaption>Semi-Lagrangian advection of a Gaussian blob on a 64 × 64 grid in solid-body rotation, with the exact shape outlined (dashed). The CFL number is measured at the blob's centre; the plot shows the L2 error against the exact rotated shape over three turns, and the table shows the error, the range of values and the change in total dye.</figcaption></figure>

<div class="try"><ol>
<li>At CFL 1 the L2 error after one turn is about 0.044 and the blob keeps 56 % of its $\int q^2$. Set the CFL to 0.5, which means twice as many, smaller steps. The error rises to about 0.070 and the blob keeps only 36 %: a smaller time step blurs more, as (12.4) predicts.</li>
<li>Set the CFL to 3: the error falls to about 0.023. Then try 5: it rises again (0.032), because the backtrace itself becomes less accurate.</li>
<li>Switch the backtrace to Euler and watch the blob spiral outwards as it fades.</li>
<li>Switch the plot to "dye total". At CFL 1 the total changes by +0.27 % in one turn; at CFL 5 by −4.7 %.</li>
</ol></div>

<p>The last item is a second weakness. Semi-Lagrangian advection does not conserve the total amount of dye. Unlike a <a href="#/conservation/finite-volume">finite-volume scheme</a>, it does not move dye from one cell to another through faces. It reads values. Nothing in (12.1) makes the dye leaving one cell equal the dye arriving in the next, so the total drifts, up or down.</p>

<aside class="pitfall">If a game uses semi-Lagrangian advection for something that must be conserved, such as the amount of smoke a fire has produced or the volume of a liquid, it will slowly gain or lose it. The drift is worst for thin features at large CFL numbers. See <a href="#/pathologies/semi-lagrangian-mass-loss">semi-Lagrangian mass loss</a> and <a href="#/pathologies/semi-lagrangian-smearing">semi-Lagrangian smearing</a> in the gallery.</aside>

<div data-quiz="q2"></div>

<div data-quiz="q3"></div>

<h2 id="splitting">One step, four stages</h2>

<p>The incompressible Navier–Stokes equations combine several processes at once: advection, forcing, viscous diffusion, and the pressure that keeps the flow divergence-free. Solving them all together in one implicit step would mean a large nonlinear system each frame. Stable Fluids instead uses <dfn data-term="operator-splitting">operator splitting</dfn>: it handles one process at a time, and each stage starts from the result of the previous one. With $A$ for semi-Lagrangian advection and $P$ for the projection, the kernel behind these figures takes the step</p>

<div class="eq" id="eq-step">$$\begin{aligned} \mathbf{u}^{(1)} &= A(\mathbf{u}^n) \\ \mathbf{u}^{(2)} &= \mathbf{u}^{(1)} + \Delta t\,\mathbf{f} \\ \big(I - \nu\,\Delta t\,\nabla_h^2\big)\,\mathbf{u}^{(3)} &= \mathbf{u}^{(2)} \\ \mathbf{u}^{n+1} &= P\,\mathbf{u}^{(3)} \end{aligned}$$<span class="eq-tag">(12.5)</span></div>

<p>Stam's paper listed the stages as add forces, advect, diffuse, project. The kernel advects first and then adds forces, so that forces computed from the flow (confinement, below) see the advected velocity. Both orders are splittings of the same kind, with the same order of error. What matters is that the projection comes last: the velocity used to advect at the next step is divergence-free.</p>

<p>Look at each stage's stability. Advection is a weighted average, so it cannot grow. Adding a bounded force adds a bounded amount. The viscosity stage is implicit, a backward Euler step, which damps every Fourier mode at any time step (see <a href="#/stiffness/implicit">implicit methods</a>); the kernel's tests run it at $\nu\Delta t/h^2 = 384$ and it simply damps the swirl. The projection removes the gradient part of the velocity and can only lower the kinetic energy. A chain of steps that are each stable is stable, so the whole step is stable for any $\Delta t$.</p>

<details class="deeper"><summary>Go deeper: why implicit viscosity cannot blow up</summary>
<p>Put a Fourier mode $\hat u\,e^{\mathrm{i}(\theta_x i + \theta_y j)}$ into the third line of (12.5) with the five-point Laplacian. Each component gets multiplied by</p>
<p>$$g = \frac{1}{1 + 4\,\dfrac{\nu\Delta t}{h^2}\left(\sin^2\dfrac{\theta_x}{2} + \sin^2\dfrac{\theta_y}{2}\right)},$$</p>
<p>which lies between 0 and 1 for every mode and every $\nu\Delta t/h^2$. Large time steps damp the short waves almost to zero, which is the right qualitative behaviour for viscosity, though the decay rate of the short waves is not accurate. Compare the explicit scheme, which needs $\nu\Delta t/h^2 \le 1/4$ in two dimensions.</p>
</details>

<p>Use the sandbox below to watch the stages act one at a time. Colour shows divergence, scaled to the divergence the last projection started from.</p>

<figure data-widget="stable-fluids-sandbox" data-preset="stages" class="wide"><figcaption>The sandbox, paused, coloured by divergence $\nabla\cdot\mathbf{u}$, after two opposite jets have been added. "Step one stage" runs the advect, forces and project stages one at a time (the viscosity stage is skipped because $\nu = 0$); the status line reports the largest divergence after each one.</figcaption></figure>

<div class="try"><ol>
<li>Press "Step one stage" three times. After the jets and the advection the field is full of divergence; after Project it is blank.</li>
<li>Keep pressing. Each new step's advection and forces put divergence back, and each projection removes it again. The divergence never builds up.</li>
</ol></div>

<p>Splitting has a cost. The equations say that all the processes act at once; the split step lets them act one after another. If two processes do not commute, the order matters, and the difference is an error. For two linear operators $A$ and $B$,</p>

<div class="eq" id="eq-lie">$$e^{\Delta t B}\,e^{\Delta t A} = e^{\Delta t (A + B) + \frac{1}{2}\Delta t^2 [B, A] + O(\Delta t^3)}, \qquad [B, A] = BA - AB$$<span class="eq-tag">(12.6)</span></div>

<p>Each step is wrong by a term of size $\Delta t^2$, and reaching a fixed time takes $1/\Delta t$ steps, so the error at that time is proportional to $\Delta t$. The split step is first order in time, however accurate each stage is.</p>

<details class="deeper"><summary>Go deeper: Strang splitting</summary>
<p>The error term in (12.6) can be cancelled by symmetry. Take half a step of $A$, a full step of $B$, then another half step of $A$:</p>
<p>$$e^{\frac{1}{2}\Delta t A}\,e^{\Delta t B}\,e^{\frac{1}{2}\Delta t A} = e^{\Delta t (A+B) + O(\Delta t^3)}.$$</p>
<p>This is Strang splitting (Strang, 1968), which is second order if each sub-step is at least second order. Consecutive half steps of $A$ can be merged, so it costs little extra. The kernel here does not use it: it uses the plain sequence (12.5), as Stam did.</p>
</details>

<p>The next figure measures the splitting error. The Taylor–Green vortex is four counter-rotating cells on a periodic square. Without viscosity it is a steady solution of the equations: the exact flow never changes, so every bit of kinetic energy it loses is numerical. The figure runs the full step to $t = 0.5$ at five time steps, with three advection schemes. The two sharper schemes in the next section remove most of the interpolation blur, so what they still lose is mostly the splitting error.</p>

<figure data-widget="stable-fluids-splitting" class="wide"><figcaption>Taylor–Green vortex on a periodic 32 × 32 grid ($U = 1$), run to $t = 0.5$ with each scheme at Courant numbers 0.25 to 4 (about 0.3 s of computation, done in slices across frames). Top: energy lost against the time step, log–log, with a dashed line of slope 1 ($\propto \Delta t$). Bottom: kinetic energy over time at the chosen Courant number, with the exact answer (no loss) at 1. The 64 × 64 grid takes about six times longer.</figcaption></figure>

<div class="try"><ol>
<li>Read the readouts. Halving the time step from Courant 0.5 to 0.25 divides BFECC's loss by about 1.85 (13.3 % to 7.2 %) on the 32 × 32 grid. On 64 × 64 the ratio is 1.92 (7.1 % to 3.7 %). The loss is close to proportional to $\Delta t$: a first-order error in time.</li>
<li>Semi-Lagrangian's loss hardly moves (36.4 % to 37.4 %), a ratio of 0.975. Its interpolation blur grows as the time step shrinks and cancels the gain.</li>
<li>Pick Courant 4 for the history plot. On the 32 × 32 grid all three schemes lose more than half their energy by $t = 0.5$: at large time steps the time error dominates and the sharper schemes no longer help.</li>
</ol></div>

<p>Do not conclude that BFECC or MacCormack make the solver second order. They sharpen the advection; the step as a whole stays first order in time because of the splitting.</p>

<div data-quiz="q4"></div>

<h2 id="sharper">Getting the detail back</h2>

<p>Semi-Lagrangian advection blurs because it interpolates. You cannot avoid interpolating, but you can estimate the error the interpolation made and subtract it. The trick is to run the advection backwards. If the scheme were perfect, advecting a field forwards one step and then backwards one step would return the original field. It does not, and the difference measures the error.</p>

<p>Write $A$ for one semi-Lagrangian step and $A^R$ for the same step with the velocity reversed. Start from $q$, advect forwards to get $\hat q$, and then backwards to get $\bar q$. If each pass adds the same error $e$, then $\bar q = q + 2e$, so the error of one pass is $e = \tfrac{1}{2}(\bar q - q)$. <dfn data-term="bfecc">BFECC</dfn> (back and forth error compensation and correction) subtracts that error from the starting field and advects again:</p>

<div class="eq" id="eq-bfecc">$$\hat q = A(q), \quad \bar q = A^{R}(\hat q), \quad q^{n+1} = A\big(q + \tfrac{1}{2}(q - \bar q)\big)$$<span class="eq-tag">(12.7)</span></div>

<p>That costs three interpolations instead of one. The semi-Lagrangian form of <dfn data-term="maccormack">MacCormack</dfn> saves one of them by applying the correction to the forward result instead:</p>

<div class="eq" id="eq-maccormack">$$\hat q = A(q), \quad \bar q = A^{R}(\hat q), \quad q^{n+1} = \hat q + \tfrac{1}{2}(q - \bar q)$$<span class="eq-tag">(12.8)</span></div>

<p>Both corrections are differences, not averages, so they lose the guarantee that made semi-Lagrangian stable. Near a sharp edge they can overshoot and create values outside the starting range. The fix is a <em>limiter</em>: clamp each new value to the range of the four grid values the first interpolation read. With the clamp the scheme cannot create new extremes, which restores the stability guarantee.</p>

<aside class="history" data-era="2003–2008">BFECC was introduced by Dupont and Liu (2003) for level-set interface tracking, and applied to the advection steps of a fluid solver by Kim, Liu, Llamas and Rossignac (2005). Selle, <a href="#/people/ronald-fedkiw">Fedkiw</a>, Kim, Liu and Rossignac (2008) showed that the cheaper form (12.8) estimates the error in the same way, kept it bounded with a clamp, and named it after MacCormack's 1969 predictor–corrector scheme. The name is an eponym: MacCormack was not involved.</aside>

<figure data-widget="stable-fluids-rotation" class="wide"><figcaption>The same rotation test with three schemes side by side: semi-Lagrangian, BFECC (no limiter, its default) and MacCormack (clamped). The outline is the exact shape; the plot shows each scheme's L2 error, and the table shows each scheme's range of values and change in total dye.</figcaption></figure>

<div class="try"><ol>
<li>After one turn of the Gaussian at CFL 1 the L2 errors are about 0.044 (semi-Lagrangian), 0.014 (MacCormack) and 0.0029 (BFECC). BFECC keeps 99 % of $\int q^2$.</li>
<li>Switch to the slotted disc, a shape with sharp edges and corners. The errors are closer: 0.148, 0.144 and 0.086. Sharp edges are hard for every scheme. BFECC's range now runs from −0.08 to 1.14: without a limiter it overshoots. MacCormack's stays inside [0, 1].</li>
<li>Switch the plot to "dye total". MacCormack gains 7 % of the slotted disc in one turn. The sharper schemes are not more conservative.</li>
</ol></div>

<figure data-widget="stable-fluids-rotation" data-preset="overshoot" class="wide"><figcaption>The broken case: the slotted disc at CFL 3, with the Euler backtrace and the limiter switched off for BFECC and MacCormack. Choose "clamp" in the limiter menu, or the midpoint backtrace, to repair it.</figcaption></figure>

<div class="try"><ol>
<li>Watch the table. After one turn the unlimited MacCormack values run from about −59 to 58, and BFECC's from −10 to 8. The correction has turned into an instability.</li>
<li>Choose "clamp" in the limiter menu. Both stay inside [0, 1] (MacCormack's L2 error is then about 0.23). The clamp stops the instability but cannot fix the Euler backtrace: the disc still spirals outwards and about a third of its dye is lost in one turn.</li>
<li>Or keep the limiter off and use the midpoint backtrace instead. MacCormack now overshoots only slightly (−0.19 to 0.99): the bad departure points of the Euler step were feeding the instability.</li>
</ol></div>

<p>How much accuracy do the corrections buy? At a fixed CFL number of 3, on 32, 64 and 128 cells, the measured order of accuracy in space is about 1.0 for semi-Lagrangian, 1.9 for BFECC and 1.6 to 1.8 for MacCormack. So the sharper schemes are close to second order in space, and they are much better at keeping a smooth blob. They do not fix everything. MacCormack's error on the blob is about five times BFECC's, and on sharp shapes neither is close to exact. None of the three conserves dye. "Unconditionally stable" applies to semi-Lagrangian and to the clamped schemes, not to the unlimited ones.</p>

<p>A third route is better interpolation. Fedkiw, Stam and Jensen used a monotonic cubic interpolation instead of a linear one for their smoke. It is more accurate on smooth fields and is designed not to overshoot. All three routes cost extra memory reads per value. MacCormack reads two samples, BFECC three; the kernel's timing tables give the bill in <a href="#/stable-fluids/budget">the last section</a>.</p>

<aside class="pitfall">An unlimited correction scheme combined with a cheap Euler backtrace can blow up at large CFL numbers, the very situation stable fluids was meant to handle. If you use BFECC or MacCormack, use a limiter, a midpoint backtrace, or both. See <a href="#/pathologies/maccormack-overshoot">MacCormack overshoot</a>.</aside>

<div data-quiz="q5"></div>

<h2 id="confinement">Vorticity confinement</h2>

<p>Even with sharper advection, a coarse grid smears small swirls. A vortex a few cells wide is averaged into its neighbours step after step until it fades. Smoke loses its curls and looks thick, as if it were syrup. <dfn data-term="vorticity-confinement">Vorticity confinement</dfn> is a deliberate counter-force. It finds the places where the <dfn data-term="vorticity">vorticity</dfn> is concentrated and pushes the flow around them in their own direction of spin, which squeezes the swirl back towards the vortex core.</p>

<div class="eq" id="eq-conf">$$\mathbf{N} = \frac{\nabla|\omega|}{\big|\nabla|\omega|\big|}, \qquad \mathbf{f}_{\mathrm{conf}} = \varepsilon\,h\,\big(\mathbf{N}\times\boldsymbol{\omega}\big)$$<span class="eq-tag">(12.9)</span></div>

<p>$\mathbf{N}$ is a unit vector pointing up the slope of $|\omega|$, towards the nearest vortex centre. Crossing it with the vorticity gives a force that runs around the centre in the vortex's own direction. The strength $\varepsilon$ is a knob you set by eye. The factor $h$ makes the force shrink as the grid is refined, so on a fine enough grid it would vanish.</p>

<aside class="who" data-person="john-steinhoff">At the University of Tennessee Space Institute, Steinhoff developed confinement for helicopter rotor wakes, where tip vortices have to travel a long way across a coarse grid without smearing out. He presented it as "vorticity capturing" by January 1992; the standard reference is Steinhoff and Underhill, Physics of Fluids, August 1994.</aside>

<aside class="who" data-person="ronald-fedkiw">With Stam and Henrik Wann Jensen, Fedkiw brought confinement into graphics in "Visual simulation of smoke" (SIGGRAPH 2001), which solved the inviscid equations on a staggered grid with semi-Lagrangian advection and a projection. They described the idea plainly: "The basic idea is to inject the energy lost due to numerical dissipation back into the fluid using a forcing term." They credited it to Steinhoff: "This technique was invented by Steinhoff about 10 years ago".</aside>

<figure data-widget="stable-fluids-sandbox" data-preset="smoke" class="wide"><figcaption>Buoyant smoke: a hot, smoky source at the bottom of a 48 × 72 box with an open top, buoyancy and confinement $\varepsilon = 0.25$ (the kernel's preset). Compare the next figure, which is the same plume with $\varepsilon = 0$.</figcaption></figure>

<figure data-widget="stable-fluids-sandbox" data-preset="smoke-plain" class="wide"><figcaption>The same plume with confinement off. Switch the colour to vorticity in both figures to compare how much small-scale swirl survives.</figcaption></figure>

<p>Confinement works, in the sense that the smoke looks livelier. Measured on a stirred 48 × 48 box after 1.5 s, the enstrophy rises steadily with $\varepsilon$: 3.67 with no confinement, 3.97 at 0.15, 4.29 at 0.3 and 4.95 at 0.6. But look at what it is. It is a force that adds energy at small scales, wherever there is vorticity, with a strength chosen by eye. Fedkiw, Stam and Jensen called their version "physically consistent", and the factor $h$ does make it vanish as the grid is refined. But on any grid you actually run it on, it is a correction for numerical error, not a model of any physical process. Turn it up too far and it invents motion.</p>

<figure data-widget="stable-fluids-sandbox" data-preset="noise" class="wide"><figcaption>The broken case: the stirred box with confinement $\varepsilon = 4$ and no paddle. The box is closed and nothing stirs it after the first two jets, so the kinetic energy should only fall.</figcaption></figure>

<div class="try"><ol>
<li>Let it run and watch the kinetic energy readout. With $\varepsilon = 0$ the energy of this box falls (from 0.012 at 2 s to 0.007 at 10 s). At $\varepsilon = 4$ it climbs instead, from about 0.02 at 2 s to about 0.07 at 10 s. The status line reports when the energy rises with nothing stirring the box.</li>
<li>Switch the colour to vorticity: the box fills with small, tightly wound swirls that no physical process put there.</li>
<li>Bring $\varepsilon$ down to 0.3 and Reset. The swirls stay crisp longer than at 0 but the energy still decays.</li>
</ol></div>

<aside class="pitfall">Confinement cannot tell a real small vortex from grid-scale noise: both have concentrated vorticity, and it amplifies both. Too large an $\varepsilon$ turns a smooth flow into a boiling one and pumps energy into a closed box. See <a href="#/pathologies/confinement-noise">confinement noise</a>.</aside>

<div data-quiz="q6"></div>

<h2 id="budget">The real-time budget</h2>

<p>A game running at 60 frames a second has about 16.7 ms per frame for everything. On a mid-range phone, a fluid simulation that wants to share that time with rendering and game logic gets perhaps 8 ms. Every choice in this chapter is really a choice about how to spend those milliseconds, and the visible failures of real-time fluids are what happens when one of them is cut too far.</p>

<p>Here is what one step of the stirred box costs in the kernel on a desktop computer (Node, mean of 300 steps, with a pointer stirring). A mid-range phone is three to five times slower.</p>

<table>
<thead><tr><th>Grid</th><th class="num">Cells</th><th class="num">MacCormack + multigrid</th><th class="num">Semi-Lagrangian + multigrid</th></tr></thead>
<tbody>
<tr><td>64 × 64</td><td class="num">4 096</td><td class="num">1.3–1.4 ms</td><td class="num">0.9 ms</td></tr>
<tr><td>96 × 96</td><td class="num">9 216</td><td class="num">3.0–3.5 ms</td><td class="num">2.0 ms</td></tr>
<tr><td>128 × 128</td><td class="num">16 384</td><td class="num">5.3–5.7 ms</td><td class="num">3.7 ms</td></tr>
</tbody>
</table>

<p>That is why the sandbox's default is 64 × 64: about the largest grid a phone can step every frame with the sharper advection. The "desktop" grid size in the sandbox is labelled for a reason. If the measured step cost goes above 12 ms, the sandbox steps only every second frame, and the fluid visibly slows down.</p>

<p>The other big cost is the pressure solve, and it is the one most often cut. A projection that stops early leaves divergence behind, which the next step carries forward. Many real-time codes run a fixed, small number of Jacobi sweeps because each sweep is cheap and parallel. Here that is a poor trade. On the 64 × 64 box stirred by the paddle, 30 Jacobi sweeps take slightly <em>longer</em> per step than warm-started multigrid (1.6 ms against 1.4 ms for the whole step, on a desktop) and leave about a tenth of the divergence in place (a mean of 0.1 of the divergence the projection started from, against about 0.0006 for multigrid). Even 200 sweeps, at about 5 ms, leave nine times more than multigrid. <a href="#/solvers">The solvers chapter</a> explains why: Jacobi removes short-wavelength errors quickly but barely touches the long ones, which are exactly the large-scale compressions you see.</p>

<figure data-widget="stable-fluids-sandbox" data-preset="jacobi" class="wide"><figcaption>The same box stirred by the paddle, with only 5 Jacobi sweeps per projection, coloured by divergence. Compare the "divergence left" readout with the default multigrid solve; move the sweeps slider to see how many it takes.</figcaption></figure>

<div class="try"><ol>
<li>With 5 sweeps, more than half of the divergence survives each projection (the readout averages about 0.6 and at times comes close to 1). Switch the colour to dye: the bands bunch up and thin out as if the fluid were compressible.</li>
<li>Drag the sweeps slider to 30, then 200. The divergence falls, but slowly, and the cost per step rises.</li>
<li>Switch the solver to multigrid. About two V-cycles per step bring the divergence down to a thousandth or less.</li>
</ol></div>

<p>An incomplete projection is not only a cosmetic problem. In a box of fluid held up against gravity, a pressure solve that stops at 30 Jacobi sweeps cannot hold the fluid still: the kernel's tests measure spurious currents of speed 0.69 where the exact answer is zero. The pressure chapter calls this an <a href="#/pathologies/incomplete-projection">incomplete projection</a>.</p>

<aside class="who" data-person="robert-bridson">Bridson's "Fluid Simulation for Computer Graphics" (2008; second edition 2015) became the standard practical guide to grid fluids for graphics, including semi-Lagrangian advection on a MAC grid and the pressure solve with conjugate gradients preconditioned by modified incomplete Cholesky, MIC(0). In this small kernel MIC(0) is the slowest of the converged solvers: at 64 × 64 its projection costs about 1.25 ms against 0.55 ms for multigrid, because it needs ten or more iterations where warm-started multigrid needs about two V-cycles.</aside>

<figure data-widget="stable-fluids-sandbox" data-preset="budget" class="wide"><figcaption>The desktop grid (96 × 96) with 30 Jacobi sweeps and the paddle on. Watch "cost per step"; on a slow device the sandbox drops to stepping every second frame.</figcaption></figure>

<p>Putting it together, here is what the player sees when each part of the budget runs out:</p>

<ul>
<li><strong>Too coarse a grid, or plain semi-Lagrangian advection</strong>: dye and smoke smear, swirls die out within seconds, and smoke looks thick and sluggish. The energy is going into numerical diffusion.</li>
<li><strong>Too few pressure iterations</strong>: the flow looks compressible. Dye collects in some places and thins out in others, smoke leaks through itself, and liquids gain or lose volume.</li>
<li><strong>Too large a time step</strong>: nothing explodes, but the motion becomes wrong. Fast swirls are under-resolved, the splitting error grows, and the energy loss rises (more than half of the Taylor–Green energy by $t = 0.5$ at Courant 4 on a 32 × 32 grid).</li>
<li><strong>Too much confinement</strong>: the flow boils with small curls and gains energy from nowhere.</li>
<li><strong>No scheme</strong>: conserves dye exactly. Totals drift, by up to a few per cent over several seconds of hard stirring in the box, and faster for sharp shapes at large CFL numbers.</li>
</ul>

<p>The stable-fluids recipe guarantees only that the simulation never blows up. Whether it looks right depends on these trade-offs.</p>

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
      explain: 'The CFL limit belongs to explicit schemes that build $\\partial q/\\partial t$ from neighbouring values. Semi-Lagrangian advection reads the old field at the departure point, however far away it is, and the interpolation is a weighted average, so no value can grow. The time step here is fixed (the slider sets it); a large one costs accuracy, not stability.',
    },
    q2: {
      type: 'mcq',
      q: 'You run a semi-Lagrangian solver on a fixed grid and halve the time step, to make it more accurate. What happens to the blurring of a rotating blob after one turn?',
      choices: [
        'It roughly halves: the error of a first-order method is proportional to $\\Delta t$.',
        'It gets worse: there are twice as many interpolations, and each smooths the field about as much as before.',
        'It does not change: the blur depends only on the grid spacing $h$.',
        'It disappears once the CFL number is below 1.',
      ],
      answer: 1,
      explain: 'The numerical diffusion is $D = \\alpha(1-\\alpha)h^2/(2\\Delta t)$, with $\\Delta t$ in the denominator. Measured on the 64 × 64 rotating Gaussian, the L2 error after one turn is 0.044 at CFL 1 and 0.070 at CFL 0.5. Below CFL 1 the scheme is the upwind scheme, and its diffusion grows towards $ah/2$ as the CFL number shrinks.',
    },
    q3: {
      type: 'num',
      q: 'A blob turns as a solid body. In one time step it rotates by $\\omega\\Delta t = 0.5$ radians. A single straight (Euler) backtrace from a point at radius $r$ lands at what multiple of $r$ from the centre?',
      answer: 1.118,
      tol: 0.01,
      unit: '× r',
      explain: 'The velocity at radius $r$ is tangent to the circle, with speed $\\omega r$. A straight step of length $\\omega r\\Delta t$ along the tangent lands at distance $r\\sqrt{1 + (\\omega\\Delta t)^2} = r\\sqrt{1.25} \\approx 1.118\\,r$. Every step pushes the departure point outwards, so an Euler backtrace makes a rotating blob spiral outwards. The midpoint backtrace reads the velocity half way back, which turns the step and almost removes the drift.',
    },
    q4: {
      type: 'predict',
      q: 'The splitting figure is about to run. When the time step is halved (Courant number 0.5 to 0.25), which schemes will lose about half as much kinetic energy by $t = 0.5$?',
      choices: [
        'All three: every scheme here is first order in time, so every loss halves.',
        'BFECC and MacCormack. Semi-Lagrangian hardly changes, because its interpolation blur grows as the step shrinks.',
        'None: numerical dissipation comes from the grid, so the time step does not matter.',
        'Only semi-Lagrangian, because it is the only first-order scheme.',
      ],
      answer: 1,
      explain: 'BFECC loses 13.3 % at Courant 0.5 and 7.2 % at 0.25 on 32 × 32 (ratio 1.85; 1.92 on 64 × 64): what is left is the first-order splitting error, proportional to $\\Delta t$. Semi-Lagrangian goes from 36.4 % to 37.4 %: its spatial blur, which grows as $\\Delta t$ shrinks, cancels the smaller time error. Sharper advection does not make the step second order in time.',
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
      explain: 'The clamp restores the property that made semi-Lagrangian stable: each new value lies within the range of the values it came from. It does not conserve dye (clamped MacCormack gains 7 % of the slotted disc in one turn at CFL 1), and it does not change the time step or the backtrace. Without it, MacCormack with an Euler backtrace at CFL 3 reaches values of about ±58.',
    },
    q6: {
      type: 'mcq',
      q: 'Vorticity confinement adds the force $\\varepsilon h\\,(\\mathbf{N}\\times\\boldsymbol{\\omega})$. Which statement is true?',
      choices: [
        'It models a real physical effect that numerical schemes leave out, so a larger $\\varepsilon$ is always more realistic.',
        'It conserves kinetic energy: it only moves energy from large scales to small ones.',
        'It is a correction for numerical diffusion. It shrinks with the cell size $h$, and on a fixed grid a large $\\varepsilon$ adds energy and grid-scale noise.',
        'It removes divergence from the velocity, so the projection can use fewer iterations.',
      ],
      answer: 2,
      explain: 'The force is scaled by $h$, so it vanishes as the grid is refined, but on any grid you run it adds energy wherever there is vorticity. In the closed sandbox box with $\\varepsilon = 4$ and nothing stirring, the kinetic energy rises from about 0.02 to 0.07 between 2 s and 10 s. It is not divergence-free either: the projection still has to clean up after it.',
    },
  },
  glossary: {
    'semi-lagrangian': {
      term: 'semi-Lagrangian advection',
      def: 'Advection by tracing each grid point backwards along the flow for one time step to its departure point and interpolating the old field there. With linear interpolation the new value is a weighted average of old values, so the scheme is stable at any CFL number, but every step smooths the field and the total is not conserved.',
      section: 'semi-lagrangian',
    },
    'departure-point': {
      term: 'departure point',
      def: 'The point a fluid parcel started from at the beginning of a time step, if it arrives at a given grid point at the end. Semi-Lagrangian schemes find it by integrating the velocity backwards (an Euler or midpoint step) and read the old field there.',
      section: 'semi-lagrangian',
    },
    'operator-splitting': {
      term: 'operator splitting',
      def: 'Advancing an equation with several terms by applying one term at a time (advection, then forces, then diffusion, then projection), each starting from the previous result. The plain sequence is first order in time when the terms do not commute; symmetric (Strang) splitting is second order.',
      section: 'splitting',
    },
    'stable-fluids': {
      term: 'Stable Fluids',
      def: 'Jos Stam\'s 1999 method for interactive fluids: each step adds forces, advects by semi-Lagrangian backtracing, diffuses implicitly and projects onto divergence-free fields. Every stage is stable for any time step, at the price of heavy numerical dissipation.',
      section: 'sandbox',
    },
    bfecc: {
      term: 'BFECC',
      def: 'Back and forth error compensation and correction: advect a field forwards and then backwards, take half the difference from the start as the error of one step, correct the field by it and advect again. Three semi-Lagrangian passes; close to second order in space where the field is smooth, but it can overshoot without a limiter.',
      section: 'sharper',
    },
    maccormack: {
      term: 'MacCormack (semi-Lagrangian)',
      def: 'A semi-Lagrangian correction scheme (Selle et al. 2008) that applies the forward–backward error estimate to the forward result, $q^{n+1} = \\hat q + \\tfrac{1}{2}(q - \\bar q)$, in two passes. Used with a clamp to the range of the interpolated values, so it makes no new extrema. Named after, but not by, R. W. MacCormack.',
      section: 'sharper',
    },
    'vorticity-confinement': {
      term: 'vorticity confinement',
      def: 'An added force, $\\varepsilon h\\,(\\mathbf{N}\\times\\boldsymbol{\\omega})$ with $\\mathbf{N}$ pointing towards vortex centres, that pushes swirl back into vortex cores to counter numerical diffusion. A numerical correction rather than physics: it adds energy, and too large an $\\varepsilon$ creates grid-scale noise.',
      section: 'confinement',
    },
  },
  pathologies: [
    {
      id: 'semi-lagrangian-smearing',
      name: 'Semi-Lagrangian smearing',
      family: 'accuracy',
      symptom: 'What you see: sharp dye edges and small swirls blur away within seconds; smoke looks thick and sluggish; a rotating blob shrinks and spreads. Making the time step smaller makes it worse, not better.',
      cause: 'Why: every step interpolates the old field at the departure points, and linear interpolation is a weighted average. Each step adds diffusion with coefficient $\\alpha(1-\\alpha)h^2/(2\\Delta t)$, where $\\alpha$ is the fractional part of the CFL number: more steps per unit time means more smoothing.',
      diagnose: 'How to tell: advect a shape with a known exact answer (solid-body rotation) and measure the L2 error and the fraction of $\\int q^2$ kept after one turn; compare two time steps. On a 64 × 64 grid a Gaussian keeps 56 % of $\\int q^2$ at CFL 1 and 36 % at CFL 0.5.',
      mitigations: [
        'A correction scheme: MacCormack with clamping (two samples per value) or BFECC (three), which cut the blob\'s error by roughly 3× and 15×.',
        'A finer grid, if the budget allows: the blur shrinks with $h$, at four times the cost per halving in 2-D.',
        'Higher-order (for example monotonic cubic) interpolation: sharper, at more reads per value.',
        'Do not shrink $\\Delta t$ below what accuracy needs: with semi-Lagrangian advection it adds blur.',
        'Vorticity confinement to restore the look of small swirls, knowing it adds energy rather than fixing the error.',
      ],
      section: 'semi-lagrangian',
      demo: { widget: 'stable-fluids-rotation', data: { preset: 'sl' } },
    },
    {
      id: 'semi-lagrangian-mass-loss',
      name: 'Semi-Lagrangian mass drift',
      family: 'conservation',
      symptom: 'What you see: the total amount of dye, smoke or liquid slowly changes in a closed box with no sources. Thin features fade or gain mass, worst at large CFL numbers.',
      cause: 'Why: the scheme reads values at departure points instead of moving amounts through cell faces, so nothing makes what leaves one cell equal what arrives in another. Neither BFECC nor MacCormack fixes this.',
      diagnose: 'How to tell: track the total of each advected quantity in a closed box without sources or decay. A rotating Gaussian on 64 × 64 changes its total by +0.27 % per turn at CFL 1 and −4.7 % at CFL 5.',
      mitigations: [
        'A flux-form (finite-volume) advection scheme where conservation matters, at the price of a CFL limit or more complex remapping.',
        'A global correction: rescale or redistribute the field after each step to restore the known total (common in practice, but it moves the error around rather than removing it).',
        'Smaller CFL numbers for thin features, accepting more blur.',
      ],
      section: 'semi-lagrangian',
      demo: { widget: 'stable-fluids-rotation', data: { preset: 'mass' } },
    },
    {
      id: 'maccormack-overshoot',
      name: 'MacCormack and BFECC overshoot',
      family: 'accuracy',
      symptom: 'What you see: values outside the starting range, such as negative dye or density above 1, appear next to sharp edges. With an Euler backtrace at large CFL numbers they grow into an instability.',
      cause: 'Why: the error correction $\\tfrac{1}{2}(q - \\bar q)$ is a difference, not an average, so the new value is no longer a convex combination of old values. Bad departure points from a straight backtrace on a curved path feed the overshoot.',
      diagnose: 'How to tell: report the minimum and maximum of each advected field every step. On the slotted disc at CFL 3 with an Euler backtrace and no limiter, MacCormack reaches about ±58 in one turn; BFECC without a limiter overshoots to 1.14 even at CFL 1.',
      mitigations: [
        'Clamp each corrected value to the range of the four values the first interpolation read (no new extrema, some sharpness lost at edges).',
        'Revert to the plain semi-Lagrangian value wherever the corrected one leaves that range.',
        'Use a midpoint (RK2) backtrace, which removes the instability and leaves only small overshoots.',
      ],
      section: 'sharper',
      demo: { widget: 'stable-fluids-rotation', data: { preset: 'overshoot' } },
    },
    {
      id: 'confinement-noise',
      name: 'Confinement noise',
      family: 'accuracy',
      symptom: 'What you see: a smooth flow fills with small, tightly wound swirls; smoke boils; the kinetic energy of a closed, unforced box rises.',
      cause: 'Why: vorticity confinement adds a force wherever vorticity is concentrated, and cannot tell a real small vortex from grid-scale noise. Its strength $\\varepsilon$ is a free parameter; too large a value pumps energy in faster than numerical diffusion removes it.',
      diagnose: 'How to tell: switch off all stirring in a closed box and watch the kinetic energy; it must fall. With $\\varepsilon = 4$ in the stirred 64 × 64 box it rises from about 0.02 to 0.07 between 2 s and 10 s. Plot enstrophy against $\\varepsilon$.',
      mitigations: [
        'Use the smallest $\\varepsilon$ that gives the look you want (the kernel\'s smoke preset uses 0.25), tuned per grid size.',
        'Reduce the need for it with sharper advection (MacCormack or BFECC) or a finer grid.',
        'Apply it only where wanted, for example scaled by smoke density, so clear air is left alone.',
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
