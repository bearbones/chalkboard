// Chapter 7: advection. Prose, questions, glossary and gallery entries; the
// figures live in ./advection/ and run src/sims/advection.js (the shared
// scheme kernel) and src/sims/ch-advection-analysis.js (moments, group
// velocity, CFL reach), both tested in tests/fluid-course/.

import { mountSchemes } from './advection/schemes.js';
import { mountCharacteristics } from './advection/characteristics.js';
import { mountStencil } from './advection/stencil.js';
import { mountCone } from './advection/cone.js';
import { mountAmplification } from './advection/amplification.js';
import { mountModified } from './advection/modified.js';

export const chapter = {
  id: 'advection',
  title: 'Advection: the hardest easy equation',
  short: 'Advection',
  blurb: 'Upwinding, the CFL condition, von Neumann stability, and numerical diffusion and dispersion.',
  minutes: 40,
  html: String.raw`
<p class="lead-in">Pour a line of dye into a river that flows at a steady speed. A minute later the line is further downstream, and it has the same shape. That is advection—the transport of a quantity by a flow without changing its profile. Its equation is the simplest in fluid dynamics, and its exact solution is a pure shift, yet every grid method introduces one of three errors: it blows up, smears the profile, or produces ripples. The tools developed here—the CFL condition, von Neumann analysis, and the modified equation—predict which behaviour to expect before running a simulation, and they apply to every explicit fluid solver in the rest of the course.</p>

<h2 id="characteristics">Characteristics: the exact answer</h2>
<p>Consider a quantity $u(x, t)$, such as a dye concentration or a temperature, carried along a line by a flow of constant speed $a$. If nothing mixes or reacts, each fluid parcel keeps its initial value of $u$, so an observer moving with a parcel sees $u$ remain constant. Expressed in derivatives, this gives the <dfn data-term="advection">advection</dfn> equation:</p>
<div class="eq" id="eq-advection">$$\frac{\partial u}{\partial t} + a\,\frac{\partial u}{\partial x} = 0.$$<span class="eq-tag">(7.1)</span></div>
<p>The left side is the rate of change seen by an observer moving at speed $a$. It is the <a href="#/viewpoints/material-derivative">material derivative</a> of <i>Two ways of watching a flow</i>, in one dimension with a uniform velocity. To check that the equation says what we claimed, follow a point that moves with the flow, $x = x_0 + at$. By the chain rule,</p>
$$\frac{\mathrm{d}}{\mathrm{d}t}\,u(x_0 + at,\ t) = \frac{\partial u}{\partial t} + a\,\frac{\partial u}{\partial x} = 0,$$
<p>so $u$ is constant along each line $x - at = x_0$. These lines are the <dfn data-term="characteristic">characteristics</dfn> of the equation. Each one carries the value it started with, so for any initial profile $u_0(x)$ the solution is</p>
<div class="eq" id="eq-shift">$$u(x, t) = u_0(x - at).$$<span class="eq-tag">(7.2)</span></div>
<p>The profile slides right at speed $a$ if $a &gt; 0$ and left if $a &lt; 0$, keeping its shape without smearing, oscillating, or growing. Equation (7.2) expresses two properties that govern every numerical method in this chapter: information travels in one direction only, from upstream to downstream, and it travels at a finite speed. The value at $(x, t)$ depends on the initial data at a single point, the <em>foot</em> of its characteristic at $x - at$.</p>

<figure data-widget="advection-characteristics" class="wide"><figcaption>The $x$–$t$ plane coloured by the exact solution $u = u_0(x - at)$ on a periodic interval. Thin lines are characteristics. The thick line runs from the probe back to its foot on the $t = 0$ axis; the plot below shows the profile at $t = 0$ (dashed) and at the probe's time (solid).</figcaption></figure>
<div class="try"><ol>
<li>Drag the probe around the plane. The readouts <b>u at probe</b> and <b>u₀ at foot</b> always agree, as required by (7.2).</li>
<li>Slide <b>Speed a</b> through zero. The characteristics stand up, then lean the other way, and the side the information comes from (the <b>upwind side</b>) swaps.</li>
<li>Pick the square wave. Its jumps travel along characteristics without smoothing.</li>
</ol></div>

<aside class="who" data-person="jean-le-rond-dalembert">In a memoir for the Berlin Academy (academy year 1747, printed 1749) d'Alembert wrote the equation of the vibrating string and gave its general solution as the sum of two waves travelling in opposite directions. Each of those waves obeys an equation like (7.1), one with speed $+c$ and one with $-c$.</aside>

<p>Advection is difficult on a grid because $u$ is stored only at discrete points $x_j = j\,\Delta x$ and times $t^n = n\,\Delta t$. After one step, the exact value at $x_j$ is the old profile evaluated at the foot $x_j - a\Delta t$, which rarely lands on a grid node. A numerical scheme must therefore reconstruct the profile between grid points from discrete samples, and those reconstruction errors accumulate over many steps. Unlike diffusion, which physically damps the shortest wavelengths and smooths out small-scale numerical errors, pure advection preserves every wavelength indefinitely.</p>
<p>The same structure carries over to harder problems. Nonlinear equations such as Burgers' equation (<a href="#/shocks/burgers">next chapter</a>) have characteristics whose speed depends on $u$ itself. Systems such as the Euler equations have several families of characteristics moving at different speeds. Their numerical methods are built from the pieces in this chapter.</p>
<aside class="note" data-label="Riemann's invariants">For a gas with pressure a function of density alone, Riemann (notice 1859, paper 1860) found two combinations of velocity and density that stay constant along two families of characteristics. That is the nonlinear, two-wave version of (7.2), and it is how he saw that compressions steepen into shocks. See <a href="#/people/bernhard-riemann">his page</a>.</aside>

<h2 id="ftcs">The obvious scheme, and why it explodes</h2>
<p>The most natural first attempt replaces the time derivative with a forward difference (first order in $\Delta t$) and the space derivative with a centred difference (second order in $\Delta x$; see <a href="#/discretization/taylor">Taylor series and finite differences</a>). The resulting scheme is called FTCS, for <em>forward time, centred space</em>:</p>
<div class="eq" id="eq-ftcs">$$u_j^{n+1} = u_j^n - \frac{\nu}{2}\left(u_{j+1}^n - u_{j-1}^n\right), \qquad \nu = \frac{a\,\Delta t}{\Delta x}.$$<span class="eq-tag">(7.3)</span></div>
<p>The dimensionless ratio $\nu$ is the <dfn data-term="courant-number">Courant number</dfn>, which measures how many grid cells a signal crosses in one time step. Because the difference equation reduces to (7.1) as $\Delta t$ and $\Delta x$ shrink to zero, FTCS is <dfn data-term="consistency">consistent</dfn>—yet running it reveals an immediate instability.</p>

<div data-quiz="q1"></div>

<figure data-widget="advection-schemes" data-preset="ftcs" class="wide"><figcaption>The advection lab, set up with FTCS on a square wave ($n = 100$, $\nu = 0.5$). The dashed line is the exact solution. The lower plot shows the largest $|u|$ on a log axis; the dashed line there has the slope that von Neumann analysis predicts (see <a href="#/advection/von-neumann">Von Neumann analysis</a>). Switch <b>Compare</b> to Lax–Friedrichs for the fix.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b>. Grid-scale wiggles appear at the jumps and grow. After one trip round the domain (200 steps) the largest value is about $3.5 \times 10^8$.</li>
<li>Watch the lower plot. On a log axis the growth is a straight line, indicating a fixed factor per step. <b>measured growth / step</b> hovers between 1.11 and 1.12, against <b>max |G|</b> = 1.118.</li>
<li>Pull ν down to 0.1 and run again. It still blows up, only more slowly ($|u|$ reaches about 14 after one trip). No time step makes FTCS stable.</li>
<li>Switch <b>Compare</b> to <b>Lax–Friedrichs</b>. Stable, but the square wave turns into a low hump (peak 0.71 after one trip).</li>
</ol></div>

<p>To see why a consistent scheme explodes, consider a single sine wave on the grid. Under a centred spatial difference, the wave simply oscillates in time at each node, turning (7.1) into a set of pure rotations in the complex plane—one per wavelength. Applying forward Euler to a rotation steps along the tangent and lands slightly outside the circle every time, so every wave grows at each step regardless of how small $\Delta t$ is. Because the shortest waves grow fastest, the blow-up begins as a sawtooth at the jumps. <a href="#/advection/von-neumann">Von Neumann analysis</a> makes this geometric picture quantitative, illustrating the <a href="#/discretization/convergence">Lax equivalence theorem</a>: a consistent linear scheme converges if and only if it is stable.</p>
<p>Peter Lax (1954) stabilised FTCS by replacing $u_j^n$ on the right of (7.3) with the average of its two neighbours:</p>
<div class="eq" id="eq-lxf">$$u_j^{n+1} = \tfrac12\left(u_{j+1}^n + u_{j-1}^n\right) - \frac{\nu}{2}\left(u_{j+1}^n - u_{j-1}^n\right).$$<span class="eq-tag">(7.4)</span></div>
<p>This Lax–Friedrichs scheme is stable for $|\nu| \le 1$, because averaging the neighbours damps the unstable modes more strongly than the forward Euler step amplifies them. That same averaging, however, also smooths the profile itself: as shown in <a href="#/advection/diffusion-dispersion">Numerical diffusion and dispersion</a>, Lax–Friedrichs at $\nu = 0.5$ introduces three times as much numerical diffusion as the upwind scheme of the next section.</p>
<aside class="who" data-person="peter-lax">Lax's 1954 paper on weak solutions of conservation laws used the averaged scheme (7.4) to compute shocks; Godunov later recalled that A. I. Zhukov in Moscow had independently used the same update.</aside>
<details class="deeper"><summary>Go deeper: can a tiny time step save FTCS?</summary>
<p>Von Neumann analysis (below) shows that FTCS multiplies a wave of wavenumber $\theta = k\Delta x$ by a factor of magnitude $\sqrt{1 + \nu^2\sin^2\theta}$ at every step. Over a fixed time $T$ there are $T/\Delta t$ steps, so the worst-case growth is</p>
$$\left(1 + \nu^2\right)^{T/(2\Delta t)} \le \exp\!\left(\frac{\nu^2 T}{2\Delta t}\right) = \exp\!\left(\frac{a^2\,\Delta t\,T}{2\,\Delta x^2}\right).$$
<p>That stays bounded as the grid is refined only if $\Delta t$ shrinks like $\Delta x^2$. In the sense of Lax and Richtmyer, then, FTCS is stable under $\Delta t \le C\Delta x^2$, the restriction of an explicit diffusion solver (<a href="#/stiffness/heat">Diffusion and stiffness</a>). For advection, where upwind schemes require only $\Delta t \propto \Delta x$, scaling $\Delta t$ with $\Delta x^2$ makes the step count grow fourfold at every grid refinement.</p></details>

<h2 id="upwind">Look upwind</h2>
<p>The centred difference fails because it weights both neighbours equally, whereas advection carries information in a single direction. When $a &gt; 0$, the solution at $x_j$ is determined entirely by upstream values to the left, while the right-hand neighbour lies downstream. Taking the spatial difference on the upstream—or <dfn data-term="upwind">upwind</dfn>—side respects this direction of propagation:</p>
<div class="eq" id="eq-upwind">$$u_j^{n+1} = \begin{cases} u_j^n - \nu\left(u_j^n - u_{j-1}^n\right), & a &gt; 0,\\[2pt] u_j^n - \nu\left(u_{j+1}^n - u_j^n\right), & a &lt; 0. \end{cases}$$<span class="eq-tag">(7.5)</span></div>
<p>Rewriting the $a &gt; 0$ case of this first-order upwind scheme as a weighted combination of the old values shows why it is stable:</p>
$$u_j^{n+1} = (1 - \nu)\,u_j^n + \nu\,u_{j-1}^n .$$
<p>This expression is <em>linear interpolation</em> between $x_{j-1}$ and $x_j$. The exact solution at $x_j$ is the old profile evaluated at the characteristic foot $x_j - \nu\Delta x$. When $0 \le \nu \le 1$, the foot lies between $x_{j-1}$ and $x_j$, and (7.5) evaluates the straight line through $u_{j-1}^n$ and $u_j^n$ at that foot—tracing the characteristic back one step and interpolating. Because the two weights $1 - \nu$ and $\nu$ are non-negative and sum to 1, the new value is a convex combination of the old values and remains bounded by their minimum and maximum, preventing both blow-up and new oscillations.</p>

<figure data-widget="advection-upwind-stencil"><figcaption>Top: two time levels of a grid. The characteristic through the target point (yellow) lands at the foot (diamond); the shaded band marks the scheme's stencil. Bottom: the old values, the exact profile (dashed) and the polynomial through the stencil values (solid). The scheme's new value (filled circle) sits on that polynomial at the foot; the ring marks the exact value.</figcaption></figure>
<div class="try"><ol>
<li>With <b>Upwind</b>, move ν between 0 and 1. The filled circle slides along the straight line, and <b>Σ|weights|</b> stays at 1. Notice the small gap between it and the ring—the linear interpolation error that produces numerical diffusion.</li>
<li>Push ν past 1. The foot leaves the stencil and the scheme <em>extrapolates</em>, so one weight turns negative and Σ|weights| = $2\nu - 1$ climbs above 1, matching <b>max |G|</b>.</li>
<li>Choose <b>Downwind</b>, the difference on the wrong side. The foot is outside its stencil for every $\nu &gt; 0$.</li>
<li>Choose <b>Lax–Wendroff</b>. Its three-point stencil fits a parabola whose foot lies inside the stencil, though one weight is negative (see <a href="#/advection/higher-order">Higher-order schemes</a>).</li>
</ol></div>

<p>The interpolation view also says what goes wrong on the other side. The downwind difference, $u_j^n - \nu(u_{j+1}^n - u_j^n)$ for $a &gt; 0$, is the same line pushed through $x_j$ and $x_{j+1}$ and read off outside them. Extrapolation with weights $1 + \nu$ and $-\nu$ amplifies any wiggle by up to $1 + 2\nu$ every step. Try it in the lab below.</p>

<figure data-widget="advection-schemes" data-preset="downwind" class="wide"><figcaption>Downwind against upwind on the same square wave ($n = 100$, $\nu = 0.5$). The lab pauses after 100 steps, where the gallery compares the pair.</figcaption></figure>
<div class="try"><ol>
<li>Run the downwind case. The largest value doubles every step (<b>max |G|</b> = 2) and reaches about $6 \times 10^{28}$ by step 100.</li>
<li>Switch to <b>upwind</b> and run. The solution stays bounded, while the peak sinks slightly and the corners round off from interpolation smoothing.</li>
</ol></div>

<p>Which side is "upwind" depends only on the sign of $a$. A real solver checks the sign at every face, every step, because the flow can turn round.</p>
<div data-quiz="q2"></div>

<aside class="who" data-person="richard-courant">In 1952 Courant, Eugene Isaacson and Mina Rees solved nonlinear hyperbolic systems by tracing characteristics back from each new grid point and interpolating between old values. For linear advection their method is exactly (7.5), and the first-order upwind scheme is still often called the CIR scheme after them.</aside>
<aside class="note" data-label="Names">In finite-volume form, (7.5) is called the <em>donor-cell</em> scheme because each cell face carries the value of the upstream cell donating the fluid; van Leer (2006) traces the term to the Los Alamos and Livermore laboratories.</aside>
<p>Tracing characteristics and interpolating also suggests how to take larger steps: rather than restricting the stencil to immediate neighbours, a <a href="#/stable-fluids/semi-lagrangian">semi-Lagrangian scheme</a> (see <i>A fluid you can stir</i>) follows the characteristic back across as many cells as the time step requires and interpolates around the cell containing the foot. Because its stencil moves with the foot, it remains stable far beyond $\nu = 1$, whereas fixed-stencil schemes are bound by the domain-of-dependence limit derived next.</p>

<h2 id="cfl">The CFL condition</h2>
<p>In the first-order upwind scheme, one step at $x_j$ depends on $x_{j-1}$ and $x_j$, two steps depend on $x_{j-2}$ through $x_j$, and $N$ steps depend on $N + 1$ points stretching $N\Delta x$ upstream. That triangle of grid points is the scheme's <em>numerical domain of dependence</em>, whereas the exact solution's domain of dependence is the single characteristic foot $x_j - aN\Delta t$. Courant, Friedrichs and Lewy showed in 1928 that if the characteristic foot lies outside the numerical fan, the scheme cannot converge: perturbing the initial data near the foot changes the exact solution at $x_j$ while leaving the numerical solution unchanged, because those initial values never enter the stencil. Refining the grid at a fixed ratio $\Delta t/\Delta x$ leaves both fans unchanged, so the <dfn data-term="cfl-condition">CFL condition</dfn> requires the numerical domain of dependence to contain the physical one. For a stencil reaching $L$ cells upstream per step, this requires</p>
<div class="eq" id="eq-cfl">$$|\nu| = \frac{|a|\,\Delta t}{\Delta x} \le L, \qquad\text{so } |\nu| \le 1 \text{ for upwind, FTCS, Lax–Friedrichs and Lax–Wendroff}.$$<span class="eq-tag">(7.6)</span></div>
<p>In physical terms, a signal cannot travel further in one time step than the stencil reaches. Beam–Warming (<a href="#/advection/higher-order">below</a>) reaches two cells upstream and allows $\nu \le 2$, whereas the downwind stencil reaches zero cells upstream and violates the condition for every $\nu &gt; 0$.</p>

<figure data-widget="advection-cfl-cone" class="wide"><figcaption>The space–time lattice for $N$ steps to time $T$. Blue: the lattice points the scheme can feel from the yellow point, and the triangle they fill. Bold line: the exact characteristic from the yellow point; its foot (diamond) is at $x = -aT$. The bars compare the range of ν where the CFL condition holds with the range where the scheme is actually stable (from von Neumann analysis).</figcaption></figure>
<div class="try"><ol>
<li>With <b>Upwind</b>, drag ν past 1. The foot leaves the triangle exactly at $\nu = 1$, where the stable bar ends too.</li>
<li>Change <b>Steps to reach T</b> from 4 to 16 at fixed ν. The lattice gets finer while the triangle's footprint stays fixed, showing why refinement at a fixed Courant number cannot rescue a CFL violation.</li>
<li>Choose <b>Beam–Warming</b>. The triangle reaches two cells per step and both bars stretch to $\nu = 2$.</li>
<li>Choose <b>FTCS</b>. The CFL bar fills up to $\nu = 1$, yet the stable bar is empty. The CFL condition is necessary, not sufficient.</li>
</ol></div>

<div data-quiz="q4"></div>

<figure data-widget="advection-schemes" data-preset="cfl-violation" class="wide"><figcaption>Upwind at $\nu = 1.1$ against $\nu = 0.9$, on a square wave with $n = 100$. Both are the same scheme; only the time step differs.</figcaption></figure>
<div class="try"><ol>
<li>Run at $\nu = 1.1$. A sawtooth grows from the jumps by a factor of 1.2 per step and reaches about $6 \times 10^6$ after 100 steps.</li>
<li>Switch to $\nu = 0.9$. The run is stable and the peak stays at or below 1.</li>
<li>Now set ν to exactly 1.00 and choose the Gaussian. Upwind becomes an exact one-cell shift at each step, so the dashed and solid curves coincide.</li>
</ol></div>

<aside class="history" data-era="1928">Courant, Friedrichs and Lewy's paper "Über die partiellen Differenzengleichungen der mathematischen Physik" (<i>Mathematische Annalen</i> 100, 1928) predates electronic computers. Its aim was mathematical: to prove that solutions exist by showing that difference solutions converge. "Nowhere do we assume the existence of the solution to the differential equation problem", they wrote; "on the contrary, we obtain a simple existence proof by using the limiting process." For hyperbolic problems they found that "convergence is obtained only if the ratio of the mesh widths in different directions satisfies certain inequalities which in turn depend on the position of the characteristics relative to the mesh" (English translation, 1967). The condition was a requirement for convergence. Reading it as a rule for machine calculation came after 1945.</aside>
<aside class="who" data-person="hans-lewy">Third author of the 1928 paper. For the wave equation it states: "From this follows a remarkable fact: if for the case $k &lt; 1$ one lets $h \to 0$, then the solution to the difference equation in general cannot converge to the solution of the differential equation." There $h$ was the time step and $kh$ the space step, so $k$ is the reciprocal of today's Courant number.</aside>
<aside class="who" data-person="kurt-friedrichs">Courant's collaborator on the 1928 paper and later on <i>Supersonic Flow and Shock Waves</i> (1948). His name is also on the Lax–Friedrichs scheme (7.4).</aside>
<p>The condition was found again by experiment. At wartime Los Alamos, <a href="#/people/rudolf-peierls">Rudolf Peierls</a> ran into the time-step limit in hydrodynamic calculations without knowing the 1928 paper. Morgan and Archer (2021) write that "Peierls clearly did not know about the Courant stability condition, he re-discovered it empirically", that it was first called the Peierls condition there, and that "by 1945 Los Alamos was referring to it as the Courant condition." In 1950 <a href="#/people/jule-charney">Charney</a>, Fjørtoft and von Neumann noted that integrating the full forecast equations would need time and space steps "chosen to satisfy the Courant-Friedrichs-Lewy condition (1928) for the computational stability of the equation governing the motion of long gravity waves". Fast gravity waves would have forced tiny steps, which was one reason they integrated a filtered equation instead.</p>
<aside class="note" data-label="Courant number or CFL number?">The 1928 paper did not name the ratio. By 1967 Richtmyer and Morton could write that it "is often called the 'Courant number'". The name honours only Courant; "CFL number" credits all three authors. Symbols vary too: $\nu$, $C$, $\sigma$ and others.</aside>
<p>Although the CFL condition is necessary for convergence—as Lax noted in 2013, "The CFL condition is only a necessary condition for the convergence of difference schemes"—it is not sufficient on its own: FTCS satisfies $|\nu| \le 1$ and still blows up. In a variable-speed or multidimensional flow, the time step is restricted by the fastest signal anywhere on the grid, so practical solvers recompute $\Delta t$ at every step from the maximum of $|a|/\Delta x$ across the domain, multiplied by a safety factor. By contrast, an <dfn data-term="implicit-method">implicit</dfn> scheme (<a href="#/stiffness/implicit">Implicit methods</a>) couples all grid points through a linear system at each step, extending its numerical domain of dependence across the entire grid and satisfying the CFL condition at any $\Delta t$, though large Courant numbers still degrade time accuracy.</p>
<aside class="pitfall">The CFL number of a simulation is set by its fastest signal, which may not be the flow you are interested in. Sound waves in a nearly incompressible flow, or gravity waves in an atmosphere, can force tiny steps on a slow flow. See <a href="#/pathologies">CFL violation</a> in the gallery.</aside>

<div data-quiz="q3"></div>

<h2 id="von-neumann">Von Neumann analysis</h2>
<p>To determine whether a scheme is actually stable, we can track a single Fourier mode on a periodic grid. Because a linear scheme with constant coefficients does not couple different wavelengths, each Fourier mode evolves independently and is multiplied by a complex factor at every step. Writing a single mode with dimensionless wavenumber $\theta = k\Delta x$ (the phase shift from one grid point to the next) gives</p>
<div class="eq" id="eq-mode">$$u_j^n = G(\theta)^n\, e^{\mathrm{i} j\theta}, \qquad 0 \le \theta \le \pi .$$<span class="eq-tag">(7.7)</span></div>
<p>Small $\theta$ corresponds to a long, well-resolved wave, while $\theta = \pi$ is the shortest wave the grid can represent—a sawtooth that alternates sign from point to point. The <dfn data-term="amplification-factor">amplification factor</dfn> $G(\theta)$ determines both the amplitude and phase evolution of that mode: its magnitude $|G|$ is the growth or decay factor per step, and its argument is the phase shift. Because the exact solution translates every mode by $\nu$ cells per step without changing its amplitude, the exact amplification factor is $e^{-\mathrm{i}\nu\theta}$, which has $|G| = 1$. <dfn data-term="von-neumann-analysis">Von Neumann analysis</dfn> requires $|G(\theta)| \le 1$ for every $\theta \in [0, \pi]$ so that no mode can grow.</p>
<p>Substituting (7.7) into the upwind scheme (7.5) and cancelling the common factor $G^n e^{\mathrm{i}j\theta}$ yields</p>
<div class="eq" id="eq-g-upwind">$$G = 1 - \nu\left(1 - e^{-\mathrm{i}\theta}\right), \qquad |G|^2 = 1 - 2\nu(1 - \nu)(1 - \cos\theta).$$<span class="eq-tag">(7.8)</span></div>
<p>When $0 \le \nu \le 1$, the product $\nu(1 - \nu)$ is non-negative and $|G| \le 1$ for all $\theta$. When $\nu &gt; 1$, $\nu(1 - \nu)$ becomes negative and $|G| &gt; 1$ for every $\theta &gt; 0$. The fastest-growing mode is the sawtooth at $\theta = \pi$, where $|G(\pi)| = |1 - 2\nu|$—giving the growth factor of 1.2 per step observed at $\nu = 1.1$, whereas at $\nu = 1/2$ the sawtooth has $G(\pi) = 0$ and is eliminated in a single step. For FTCS (7.3), substituting $e^{\mathrm{i}\theta} - e^{-\mathrm{i}\theta} = 2\mathrm{i}\sin\theta$ gives</p>
<div class="eq" id="eq-g-ftcs">$$G = 1 - \mathrm{i}\,\nu\sin\theta, \qquad |G|^2 = 1 + \nu^2\sin^2\theta \;&gt;\; 1 .$$<span class="eq-tag">(7.9)</span></div>
<p>This algebra reproduces the outward spiral described in <a href="#/advection/ftcs">the FTCS section</a>: at $\nu = 0.5$, the four-cell wave ($\theta = \pi/2$) grows by $\sqrt{1.25} = 1.118$ per step. Lax–Friedrichs has $G = \cos\theta - \mathrm{i}\nu\sin\theta$, so $|G|^2 = \cos^2\theta + \nu^2\sin^2\theta \le 1$ if and only if $|\nu| \le 1$. At $\theta = \pi$, however, Lax–Friedrichs gives $|G(\pi)| = 1$ for every $\nu$, leaving the sawtooth undamped because its stencil omits the central node $u_j^n$ and decouples odd and even grid points.</p>

<figure data-widget="advection-amplification" class="wide"><figcaption>Left: $G(\theta)$ in the complex plane as $\theta$ runs from 0 to $\pi$, with the unit circle (dotted) and the exact factor $e^{-\mathrm{i}\nu\theta}$ (dashed). Right: $|G|$ and the relative phase speed $c/a$ against $\theta$. The marked point is the wavenumber chosen on the slider.</figcaption></figure>
<div class="try"><ol>
<li>Upwind at $\nu = 0.5$: the locus is a circle inside the unit circle, touching it only at $\theta = 0$. Long waves survive; short waves are damped.</li>
<li>Drag ν past 1. The locus bulges out of the unit circle at $\theta = \pi$ first, and <b>max over θ of |G|</b> turns red.</li>
<li>Choose <b>FTCS</b>. The locus is a vertical line through 1, lying outside the unit circle for every $\theta$ except 0 and $\pi$ at any $\nu \ne 0$.</li>
<li>Choose <b>Leapfrog</b> (see <a href="#/advection/higher-order">Higher-order schemes</a>). Both of its roots lie on the unit circle for $\nu &lt; 1$, producing zero amplitude damping, with a second, computational root near $-1$.</li>
<li>Back to upwind, set $\theta = 2$ (about three points per wavelength) and move ν across 0.5. The phase speed goes from slow ($c/a$ = 0.68 at ν = 0.25) to fast (1.11 at ν = 0.75).</li>
</ol></div>

<aside class="who" data-person="john-von-neumann">The Fourier test carries his name, but he never published a full account of it himself. Textbooks often say it was first described briefly by Crank and Nicolson (1947); the earliest confirmed printed use involving von Neumann is the 1950 ENIAC weather-forecast paper he wrote with Charney and Fjørtoft.</aside>
<aside class="history" data-era="1950">In Section V of "Numerical integration of the barotropic vorticity equation" (<i>Tellus</i>, 1950), Charney, Fjørtoft and von Neumann put a single Fourier harmonic into their linearised difference equations and asked that its growth factor, which they called $\omega$, satisfy $|\omega| \le 1$. "We shall employ a heuristic procedure", they wrote, "which is, however, patterned after the rigorous method of Courant, Friedrichs, and Lewy (1928)." O'Brien, Hyman and Kaplan published another account the same year. Lax and Richtmyer's 1956 survey gave the test its standard form, in a section headed "The Von Neumann (Necessary) Condition for Stability", and called $G$ the amplification matrix.</aside>
<aside class="who" data-person="klara-dan-von-neumann">The authors of the 1950 forecast paper thanked "Mrs K. von Neumann for instruction in the technique of coding for the Eniac and for checking the final code". Popular accounts that credit her with producing the forecast go beyond that source.</aside>
<p>Even when the initial profile is smooth and contains negligible energy at short wavelengths, floating-point round-off introduces a small component of every mode at each step, seeding any unstable wavelength. As Lax and Richtmyer (1956) noted (see <a href="#/discretization/convergence">the discretisation chapter</a>), only initial data "chosen with diabolical care" avoid exciting unstable modes. In the lab, FTCS at $\nu = 0.1$ on a smooth Gaussian ($n = 100$) appears nearly intact after one period with a peak of 1.16, but by five periods the growing short waves push the peak to 135.</p>
<aside class="who" data-person="robert-richtmyer">Co-author with Lax of the 1956 survey that proved the equivalence theorem, and author of the standard early textbook on difference methods (1957; second edition with K. W. Morton, 1967).</aside>
<p>Von Neumann analysis is exact only for linear, constant-coefficient schemes on periodic grids. With variable coefficients, practitioners "freeze" them and check the test at every point; with boundaries or nonlinearity, it is a necessary check rather than a proof. Even so, it remains the first test to run on any new scheme, because a few lines of algebra immediately reveal how each wavenumber is damped and shifted.</p>
<details class="deeper"><summary>Go deeper: where the numbers on the figure come from</summary>
<p>Writing $G = |G|\,e^{-\mathrm{i}\phi}$, where $\phi$ is the phase shift per step, and comparing with the exact phase shift $\nu\theta$ gives the <em>relative phase speed</em> $c/a = \phi/(\nu\theta)$. A wave of wavelength $\lambda = 2\pi\Delta x/\theta$ needs $2\pi/(\nu\theta)$ steps to travel one wavelength. In that time its amplitude changes by $|G|^{2\pi/(\nu\theta)}$ and its phase drifts by $(c/a - 1) \times 360^\circ$. For upwind at $\nu = 0.5$ and four points per wavelength ($\theta = \pi/2$), $|G| = 1/\sqrt2$ and the wave needs 8 steps per wavelength, so it retains $(1/\sqrt2)^8 = 1/16$ (about 6%) of its amplitude after a single wavelength.</p></details>

<h2 id="diffusion-dispersion">Numerical diffusion and dispersion</h2>
<p>A stable scheme still alters the profile it carries, either by damping short waves so that peaks sink and fronts smear (<dfn data-term="numerical-diffusion">numerical diffusion</dfn>) or by moving different wavelengths at different speeds so that sharp features break into ripples (<dfn data-term="numerical-dispersion">numerical dispersion</dfn>). Both effects appear directly in the partial differential equation that the discrete scheme actually approximates.</p>
<p>Expanding each term of a scheme in a Taylor series about $(x_j, t^n)$, as in <a href="#/discretization/taylor">Taylor series and finite differences</a>, and using the PDE to replace higher time derivatives with spatial derivatives yields the <dfn data-term="modified-equation">modified equation</dfn>—the PDE that the discrete solution approximates to higher order than (7.1). For the schemes in this chapter, it takes the form</p>
<div class="eq" id="eq-modified">$$\frac{\partial u}{\partial t} + a\,\frac{\partial u}{\partial x} = D\,\frac{\partial^2 u}{\partial x^2} + E\,\frac{\partial^3 u}{\partial x^3} + \cdots .$$<span class="eq-tag">(7.10)</span></div>
<p>The second-derivative term $D\,u_{xx}$ acts like the <a href="#/stiffness/heat">heat equation</a>, smoothing the profile by numerical diffusion, whereas the third-derivative term $E\,u_{xxx}$ is dispersive, shifting the propagation speed of each wavelength without changing its amplitude. First-order schemes have $D \ne 0$ as their leading error, while second-order schemes cancel $D$ so that the $E$ term leads. For upwind, Lax–Friedrichs, and FTCS, the leading diffusion coefficients are</p>
<div class="eq" id="eq-diffusion">$$D_{\text{upwind}} = \frac{a\,\Delta x}{2}(1 - \nu), \qquad D_{\text{LxF}} = \frac{a\,\Delta x}{2}\cdot\frac{1 - \nu^2}{\nu}, \qquad D_{\text{FTCS}} = -\frac{a\,\Delta x}{2}\,\nu .$$<span class="eq-tag">(7.11)</span></div>
<p>These three coefficients explain the behaviour observed in the simulations. Upwind's diffusivity $D_{\text{upwind}}$ vanishes at $\nu = 1$, where the scheme shifts data by one cell per step without error, and increases as $\nu \to 0$—meaning that reducing the time step on a fixed grid increases the total smearing. Lax–Friedrichs multiplies $D_{\text{upwind}}$ by $(1 + \nu)/\nu$, which equals 3 at $\nu = 0.5$. Finally, FTCS has $D_{\text{FTCS}} &lt; 0$, equivalent to running the heat equation backwards in time and amplifying short-wavelength ripples without bound.</p>

<div data-quiz="q5"></div>

<figure data-widget="advection-modified" data-preset="diffusion" class="wide"><figcaption>A Gaussian pulse ($\sigma = 0.05$) carried once round the domain. Dotted: the solution of the heat equation with the scheme's $D$ from (7.11), which spreads a Gaussian so that its variance grows by $2Dt$. The lower plot compares the measured growth of the pulse's variance with $2Dt$.</figcaption></figure>
<div class="try"><ol>
<li>Run upwind at $\nu = 0.5$, $n = 100$. The measured variance grows by 0.0050 over one trip, the value $2Dt$ predicts with $D = 2.5 \times 10^{-3}$, and the dotted Gaussian sits on the numerical one.</li>
<li>Lower ν to 0.2 and run again. $D$ rises to $4 \times 10^{-3}$ and the pulse spreads more. At $\nu = 0.9$, $D$ drops to $5 \times 10^{-4}$.</li>
<li>Switch to <b>Lax–Friedrichs</b>. At $\nu = 0.5$ the spread is three times faster. At small ν the pulse grows so wide it overlaps its periodic copies; the status line says when the comparison stops being clean.</li>
<li>Double $n$ at fixed ν. Because numerical diffusion is a first-order error, $D$ halves.</li>
</ol></div>
<aside class="pitfall">Because numerical diffusion mimics physical viscosity, a smoothed front in a viscous flow simulation can be dominated by $D_{\text{upwind}}$ rather than the physical diffusivity $\kappa$. Comparing $D_{\text{upwind}}$ with $\kappa$ defines the <dfn data-term="cell-peclet-number">cell Péclet number</dfn> (<a href="#/stiffness/peclet">the Péclet number</a>); when it exceeds 2, numerical diffusion exceeds physical diffusion.</aside>

<p>The modified equation also shows how to stabilise FTCS. Because FTCS introduces negative diffusion with coefficient $-\tfrac12 a\Delta x\,\nu = -\tfrac12 a^2\Delta t$, adding $+\tfrac12 a^2\Delta t\,u_{xx}$ (discretised with a centred second difference) cancels the leading $O(\Delta t)$ error:</p>
<div class="eq" id="eq-lw">$$u_j^{n+1} = u_j^n - \frac{\nu}{2}\left(u_{j+1}^n - u_{j-1}^n\right) + \frac{\nu^2}{2}\left(u_{j+1}^n - 2u_j^n + u_{j-1}^n\right).$$<span class="eq-tag">(7.12)</span></div>
<p>This is the <dfn data-term="lax-wendroff">Lax–Wendroff</dfn> scheme, which is second-order accurate and stable for $|\nu| \le 1$, with $D = 0$ and leading dispersive coefficient $E = -\tfrac16 a\Delta x^2 (1 - \nu^2)$. Substituting a plane wave $e^{\mathrm{i}(kx - \omega t)}$ into $u_t + a u_x = E u_{xxx}$ shows that its amplitude stays constant while its phase and group speeds become</p>
<div class="eq" id="eq-dispersion">$$c = \frac{\omega}{k} = a + E k^2, \qquad c_g = \frac{\mathrm{d}\omega}{\mathrm{d}k} = a + 3E k^2 .$$<span class="eq-tag">(7.13)</span></div>
<p>Because the phase speed $c$ depends on the wavenumber $k$, different wavelengths travel at different speeds. When $E &lt; 0$, short waves lag behind long ones: for Lax–Wendroff at $\nu = 0.5$, a four-cell wave travels at $c = 0.75a$, and the two-cell sawtooth is stationary. The departure of $c/a$ from 1 is the <dfn data-term="phase-error">phase error</dfn>. When a sharp front—composed of many Fourier modes—is advected by a dispersive scheme, its short-wavelength components separate from the front as a train of ripples. A localized wave packet moves at the group velocity $c_g$, which lags three times as much as the phase speed. On the discrete grid, as Trefethen (1982) showed, the exact group velocity is given by the derivative of the amplification phase, $c_g/a = (1/\nu)\,\mathrm{d}\phi/\mathrm{d}\theta$.</p>

<figure data-widget="advection-modified" data-preset="dispersion" class="wide"><figcaption>A wave packet with 16 waves across the domain ($\theta = 1.0$ at $n = 100$: 6.25 points per wavelength), run once round. Dashed vertical line: where the exact packet is. Dashed line in colour: where the discrete group velocity says the packet should be. The triangle marks the measured centre of the packet's energy. The lower plot shows how far the packet lags, measured and predicted.</figcaption></figure>
<div class="try"><ol>
<li>Run <b>Leapfrog</b> (a centred scheme with no damping at all; see <a href="#/advection/higher-order">Higher-order schemes</a>). The crests move at $c = 0.87a$ but the packet moves at only $c_g = 0.59a$. After one trip it lags by 0.41, within half a per cent of the discrete group velocity. The leading-order modified equation says 0.38: close, but this wave is too short for a two-term Taylor series.</li>
<li>Set $n = 200$, so the waves are twice as well resolved. The lag drops to 0.10, and both predictions agree with the measurement.</li>
<li>Try <b>Lax–Wendroff</b> at $n = 100$. It damps this wave by 2% per step, so the packet nearly vanishes. Damping removes the shortest, slowest parts first, so the remains lag less than predicted.</li>
<li>Try <b>Beam–Warming</b>: $E &gt; 0$, so the packet runs ahead instead. Then <b>Fromm</b> at $\nu = 0.5$: no lag at all.</li>
</ol></div>
<aside class="history" data-era="1968">Hirt (1968) expanded difference equations in Taylor series to read off their stability "heuristically" from the extra second-derivative terms. Warming and Hyett (1974) named the "modified equation approach" and made it systematic, while Godunov recalled that A. I. Zhukov in Moscow had used a "first differential approximation" along the same lines in the early 1950s. Because Taylor series assume smoothness and small $\theta = k\Delta x$, the modified equation describes well-resolved waves; near a discontinuity or at the grid scale ($\theta \sim \pi$), only the full amplification factor $G(\theta)$ is reliable.</aside>

<h2 id="higher-order">Higher-order schemes and dispersion</h2>
<p>To reduce the smearing of first-order upwind, higher-order schemes widen the stencil to cancel additional Taylor-series terms. Lax and Wendroff (1960) derived (7.12) directly from a second-order Taylor expansion in time, $u^{n+1} = u + \Delta t\,u_t + \tfrac12\Delta t^2 u_{tt}$, by substituting the PDE relations $u_t = -a u_x$ and $u_{tt} = a^2 u_{xx}$ and approximating both spatial derivatives with centred differences—a procedure that extends directly to nonlinear systems of conservation laws.</p>
<aside class="who" data-person="burton-wendroff">Lax's doctoral student at New York University, then his co-author on "Systems of conservation laws" (1960). That paper introduced the second-order conservative scheme and proved that a convergent conservative scheme converges to a weak solution, the Lax–Wendroff theorem.</aside>
<p>Other second-order schemes choose different three-point stencils. Fitting a parabola through the three upwind nodes $x_{j-2}, x_{j-1}, x_j$ instead of the centred trio gives the Beam–Warming scheme (Warming and Beam 1976), which is stable for $0 \le \nu \le 2$ and has $E &gt; 0$ for $\nu &lt; 1$, placing dispersive ripples ahead of a jump rather than behind it. Noting that the dispersive errors of Lax–Wendroff and Beam–Warming have opposite signs, Fromm (1968) averaged the two schemes to obtain $E = \tfrac{1}{12} a\Delta x^2 (1 - \nu)(1 - 2\nu)$, which vanishes at $\nu = 1/2$—making Fromm's scheme third-order accurate there, with its $L^1$ error on a sine wave falling by a factor of 8 each time $n$ doubles. The table below summarises all seven schemes in the lab.</p>
<div class="table-wrap"><table>
<thead><tr><th>Scheme</th><th>Points (for $a &gt; 0$)</th><th>Stable for</th><th>Leading error term</th><th class="num">Measured order</th></tr></thead>
<tbody>
<tr><td>Upwind</td><td>$j-1,\ j$</td><td>$0 \le \nu \le 1$</td><td>diffusion, $D = \tfrac12 a\Delta x(1-\nu)$</td><td class="num">0.99</td></tr>
<tr><td>Lax–Friedrichs</td><td>$j-1,\ j+1$</td><td>$|\nu| \le 1$</td><td>diffusion, $D = \tfrac12 a\Delta x(1-\nu^2)/\nu$</td><td class="num">0.99</td></tr>
<tr><td>FTCS</td><td>$j-1,\ j,\ j+1$</td><td>never</td><td>anti-diffusion, $D = -\tfrac12 a\Delta x\,\nu$</td><td class="num">–</td></tr>
<tr><td>Lax–Wendroff</td><td>$j-1,\ j,\ j+1$</td><td>$|\nu| \le 1$</td><td>dispersion, $E = -\tfrac16 a\Delta x^2(1-\nu^2)$</td><td class="num">2.00</td></tr>
<tr><td>Beam–Warming</td><td>$j-2,\ j-1,\ j$</td><td>$0 \le \nu \le 2$</td><td>dispersion, $E = \tfrac16 a\Delta x^2(1-\nu)(2-\nu)$</td><td class="num">2.00</td></tr>
<tr><td>Fromm</td><td>$j-2, \dots, j+1$</td><td>$0 \le \nu \le 1$</td><td>dispersion, $E = \tfrac1{12} a\Delta x^2(1-\nu)(1-2\nu)$</td><td class="num">2.00 (3.00 at $\nu = \tfrac12$)</td></tr>
<tr><td>Leapfrog</td><td>$j \pm 1$, three levels</td><td>$|\nu| &lt; 1$</td><td>dispersion, $E = -\tfrac16 a\Delta x^2(1-\nu^2)$, no damping</td><td class="num">2.00</td></tr>
</tbody></table></div>
<p>The orders are measured in the $L^1$ norm on a sine wave carried once round the domain, between $n = 256$ and $512$ at $\nu = 0.8$ (the convergence study of <a href="#/discretization/convergence">Consistency, stability and convergence</a>).</p>
<p>The drawback of Lax–Wendroff appears in its stencil weights. In the figure under <a href="#/advection/upwind">Look upwind</a>, one of its three weights is negative, a property shared by every linear scheme of second order or higher. With a negative weight, the new value is no longer bounded by the old ones. Smooth profiles are barely affected, but a square wave develops trailing ripples.</p>

<div data-quiz="q6"></div>

<figure data-widget="advection-schemes" data-preset="lw-ringing" class="wide"><figcaption>Lax–Wendroff against a flux-limited scheme on a square wave ($n = 200$, $\nu = 0.5$, one trip round). The limited scheme is a preview of <i>Shocks and the limits of linear schemes</i>.</figcaption></figure>
<div class="try"><ol>
<li>Run Lax–Wendroff. Ripples trail each jump, as the negative $E$ predicts, and the solution overshoots by 23% (<b>overshoot / undershoot</b>). <b>TV / TV₀</b> climbs above 1: the scheme has made new wiggles.</li>
<li>Switch to the limited scheme. No overshoot at all, and the jumps stay much sharper than upwind's.</li>
<li>Choose <b>Beam–Warming</b> from the scheme menu: the ripples move to the front of each jump.</li>
</ol></div>
<p>Every linear high-order scheme faces this same barrier: Godunov proved in 1959 that a linear scheme that preserves monotonicity (creating no new extrema) can be at most first-order accurate (<a href="#/shocks/godunov-theorem">Godunov's theorem</a>). Achieving sharp fronts without spurious oscillations requires a nonlinear scheme that uses second-order weights in smooth regions and reverts toward first-order upwind near steep gradients, as <a href="#/shocks/limiters">flux limiters</a> do.</p>

<p>Another classic second-order method is <em>leapfrog</em>, which applies centred differences in both time and space across three time levels:</p>
<div class="eq" id="eq-leapfrog">$$u_j^{n+1} = u_j^{n-1} - \nu\left(u_{j+1}^n - u_{j-1}^n\right).$$<span class="eq-tag">(7.14)</span></div>
<p>For $|\nu| &lt; 1$, leapfrog has $|G| = 1$ at every wavenumber, introducing no amplitude damping at all—a property that made it a staple of weather and ocean models for decades (though once $|\nu| &gt; 1$ it blows up rapidly, with $\max|G| = 1.22$ already at $\nu = 1.02$). Because the update spans three time levels, however, its amplification polynomial is quadratic in $G$ and produces two roots per wavenumber: a physical mode that tracks the exact factor $e^{-\mathrm{i}\nu\theta}$, and a spurious <em>computational mode</em> near $G = -1$ that alternates sign at every step and propagates upstream. Because $|G| = 1$ for both roots, any energy injected into the computational mode by an inaccurate initial step or by nonlinear terms persists undamped throughout the simulation.</p>

<figure data-widget="advection-schemes" data-preset="leapfrog-start" class="wide"><figcaption>Leapfrog on a Gaussian ($n = 100$, $\nu = 0.5$) started two ways. "Copy" sets $u^1 = u^0$; the fix takes one Lax–Wendroff step first. The <b>leapfrog flip</b> readout is the size of the step-to-step oscillation, $\max_j |u_j^{n+1} - 2u_j^n + u_j^{n-1}|/4$. It also picks up a small part from the smooth pulse itself, about $\nu^2\Delta x^2|u_{xx}|/4$.</figcaption></figure>
<div class="try"><ol>
<li>Run the copy start. A small spurious packet appears and drifts to the <em>left</em> while the physical pulse moves right, with the step-to-step flip reaching $3.5 \times 10^{-2}$ after 400 steps.</li>
<li>Switch to the Lax–Wendroff start. The flip drops eighteen-fold to $1.9 \times 10^{-3}$ with no upstream packet, leaving mainly the smooth pulse's own second derivative in time.</li>
<li>Go back to the copy start and set <b>Asselin filter γ</b> to 0.10. The spurious mode is damped out, though the main pulse also loses amplitude faster.</li>
</ol></div>
<p>To suppress this mode during a run, the time filter of Robert (1966) and Asselin (1972) nudges the middle time level towards the average of its neighbours after each step:</p>
<div class="eq" id="eq-asselin">$$\bar u^{\,n} = u^n + \gamma\left(\bar u^{\,n-1} - 2u^n + u^{n+1}\right).$$<span class="eq-tag">(7.15)</span></div>
<p>Because the bracketed term is a second difference in time, it is large for a mode that alternates sign every step and small for a slowly varying physical wave, damping the computational mode much more strongly than the physical solution. Even so, the filter introduces weak first-order time damping: with $\gamma = 0.1$, it reduces the step-to-step oscillation of the copy start by a factor of 24 while lowering the peak of the Gaussian after 400 steps from 0.92 to 0.81.</p>
<aside class="note" data-label="What carries forward">Every explicit solver in the rest of the course obeys a CFL condition. Every one has a modified equation with a $D$ or an $E$ in it. When a later chapter shows a smeared vortex, a rippled shock or a time step that will not grow, come back here.</aside>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>R. Courant, K. Friedrichs and H. Lewy, "Über die partiellen Differenzengleichungen der mathematischen Physik", <i>Mathematische Annalen</i> 100 (1928) 32–74. English translation by P. Fox, "On the partial difference equations of mathematical physics", <i>IBM Journal of Research and Development</i> 11(2) (1967) 215–234.</li>
<li>R. Courant, E. Isaacson and M. Rees, "On the solution of nonlinear hyperbolic differential equations by finite differences", <i>Communications on Pure and Applied Mathematics</i> 5(3) (1952) 243–255.</li>
<li>P. D. Lax, "Weak solutions of nonlinear hyperbolic equations and their numerical computation", <i>Communications on Pure and Applied Mathematics</i> 7(1) (1954) 159–193.</li>
<li>J. G. Charney, R. Fjørtoft and J. von Neumann, "Numerical integration of the barotropic vorticity equation", <i>Tellus</i> 2(4) (1950) 237–254.</li>
<li>G. G. O'Brien, M. A. Hyman and S. Kaplan, "A study of the numerical solution of partial differential equations", <i>Journal of Mathematics and Physics</i> 29 (1950) 223–251.</li>
<li>P. D. Lax and R. D. Richtmyer, "Survey of the stability of linear finite difference equations", <i>Communications on Pure and Applied Mathematics</i> 9(2) (1956) 267–293.</li>
<li>P. D. Lax and B. Wendroff, "Systems of conservation laws", <i>Communications on Pure and Applied Mathematics</i> 13(2) (1960) 217–237.</li>
<li>C. W. Hirt, "Heuristic stability theory for finite-difference equations", <i>Journal of Computational Physics</i> 2(4) (1968) 339–355.</li>
<li>R. F. Warming and B. J. Hyett, "The modified equation approach to the stability and accuracy analysis of finite-difference methods", <i>Journal of Computational Physics</i> 14(2) (1974) 159–179.</li>
<li>J. E. Fromm, "A method for reducing dispersion in convective difference schemes", <i>Journal of Computational Physics</i> 3(2) (1968) 176–189.</li>
<li>R. F. Warming and R. M. Beam, "Upwind second-order difference schemes and applications in aerodynamic flows", <i>AIAA Journal</i> 14(9) (1976) 1241–1249.</li>
<li>A. J. Robert, "The integration of a low order spectral form of the primitive meteorological equations", <i>Journal of the Meteorological Society of Japan</i> Ser. II, 44(5) (1966) 237–245.</li>
<li>R. Asselin, "Frequency filter for time integrations", <i>Monthly Weather Review</i> 100(6) (1972) 487–490.</li>
<li>L. N. Trefethen, "Group velocity in finite difference schemes", <i>SIAM Review</i> 24(2) (1982) 113–136.</li>
<li>R. D. Richtmyer and K. W. Morton, <i>Difference Methods for Initial-Value Problems</i>, 2nd edn (Interscience, 1967).</li>
<li>B. van Leer, "Upwind and high-resolution methods for compressible flow: from donor cell to residual-distribution schemes", <i>Communications in Computational Physics</i> 1(2) (2006) 192–206.</li>
<li>N. R. Morgan and B. J. Archer, "On the origins of Lagrangian hydrodynamic methods", arXiv:2103.06249 (2021).</li>
<li>P. D. Lax, "Stability of difference schemes", in C. A. de Moura and C. S. Kubrusly (eds), <i>The Courant–Friedrichs–Lewy (CFL) Condition: 80 Years After Its Discovery</i> (Birkhäuser, 2013) 1–7.</li>
<li>R. J. LeVeque, <i>Finite Volume Methods for Hyperbolic Problems</i> (Cambridge University Press, 2002), chapters 4, 6 and 8. The clearest modern account of everything in this chapter.</li>
<li>D. R. Durran, <i>Numerical Methods for Fluid Dynamics: With Applications to Geophysics</i>, 2nd edn (Springer, 2010). Leapfrog, the Robert–Asselin filter and phase errors, from the weather-model side.</li>
</ol>
`,
  widgets: {
    'advection-schemes': mountSchemes,
    'advection-characteristics': mountCharacteristics,
    'advection-upwind-stencil': mountStencil,
    'advection-cfl-cone': mountCone,
    'advection-amplification': mountAmplification,
    'advection-modified': mountModified,
  },
  quizzes: {
    q1: {
      type: 'predict',
      q: 'You are about to run FTCS (7.3) on a square wave. If it misbehaves, which change will make it stable?',
      choices: [
        'A small enough time step, say $\\nu = 0.1$',
        'A finer grid at the same $\\nu$',
        'Smooth initial data instead of a square wave',
        'None of these: it grows at every $\\nu \\ne 0$',
      ],
      answer: 3,
      explain: 'Every wave is multiplied by $\\sqrt{1 + \\nu^2\\sin^2\\theta} &gt; 1$ per step. A small $\\nu$ only slows the growth (1.005 per step at $\\nu = 0.1$); a finer grid at fixed $\\nu$ changes nothing; smooth data only delay it, because rounding error seeds the short waves. Run the lab to see each case.',
    },
    q2: {
      type: 'mcq',
      q: 'The flow speed is $a = -2$: information moves to the left. Which difference is the upwind one for $\\partial u/\\partial x$ at $x_j$?',
      choices: [
        '$(u_j - u_{j-1})/\\Delta x$',
        '$(u_{j+1} - u_j)/\\Delta x$',
        '$(u_{j+1} - u_{j-1})/(2\\Delta x)$',
        'Either one-sided difference, as long as $|\\nu| \\le 1$',
      ],
      answer: 1,
      explain: 'With $a &lt; 0$ the foot of the characteristic, $x_j - a\\Delta t$, lies to the right of $x_j$, so the stencil must reach right to use $u_j$ and $u_{j+1}$. The left-sided difference would be downwind here and unstable at every $\\nu$; the centred one is FTCS.',
    },
    q3: {
      type: 'num',
      q: 'A weather model has 10 km grid cells, and the fastest wind is 40 m/s. Using first-order upwind, what is the largest stable time step, in seconds?',
      answer: 250,
      tol: 0.02,
      unit: 's',
      explain: '$\\nu = |a|\\Delta t/\\Delta x \\le 1$ gives $\\Delta t \\le 10\\,000/40 = 250$ s. In practice you take a safety factor below 1. A scheme reaching two cells upstream, such as Beam–Warming, would allow 500 s. A model that also carries sound or gravity waves must use their speed instead, which is far larger.',
    },
    q4: {
      type: 'mcq',
      q: 'At your chosen time step, the characteristic\'s foot lies inside a scheme\'s numerical domain of dependence. What can you conclude?',
      choices: [
        'The scheme is stable',
        'The scheme may converge; you still have to check stability',
        'The scheme is exact',
        'Nothing useful: the CFL condition matters only for implicit schemes',
      ],
      answer: 1,
      explain: 'The CFL condition is necessary for convergence, though stability must still be checked separately—FTCS satisfies $|\\nu| \\le 1$ and blows up anyway. Implicit schemes satisfy the domain-of-dependence condition automatically because each step couples all grid points.',
    },
    q5: {
      type: 'predict',
      q: 'On a fixed grid, you halve the upwind time step ($\\nu$ from 0.8 to 0.4) to be more accurate. After the pulse has gone once round, it will be…',
      choices: [
        'sharper, because the time error is smaller',
        'more smeared, because $D = \\tfrac12 a\\Delta x(1 - \\nu)$ grows as $\\nu$ falls',
        'the same, because the error is set by $\\Delta x$ alone',
      ],
      answer: 1,
      explain: 'The space and time errors of upwind partly cancel, and they cancel exactly at $\\nu = 1$. Going from 0.8 to 0.4 triples $D$, from $0.1\\,a\\Delta x$ to $0.3\\,a\\Delta x$. Because $D$ is proportional to $\\Delta x$, refining the spatial grid reduces the smearing.',
    },
    q6: {
      type: 'predict',
      q: 'You are about to run Lax–Wendroff on a square wave. Where will the wiggles appear, and why?',
      choices: [
        'Ahead of each jump, because its short waves travel faster than $a$',
        'Behind each jump, because its short waves travel slower than $a$',
        'Equally on both sides, because the scheme is centred',
        'Nowhere, because second-order schemes do not wiggle',
      ],
      answer: 1,
      explain: 'Its modified equation has $E = -\\tfrac16 a\\Delta x^2(1 - \\nu^2) &lt; 0$, so $c = a + Ek^2 &lt; a$ and the short waves that make up the jump lag behind it. Beam–Warming has $E &gt; 0$ for $\\nu &lt; 1$ and puts them in front. By Godunov\'s theorem no linear second-order scheme avoids them altogether.',
    },
  },
  glossary: {
    advection: {
      term: 'advection',
      def: 'Transport of a quantity by a flow without change. In one dimension with constant speed $a$ it obeys $u_t + a u_x = 0$, whose solution slides the initial profile along at speed $a$.',
      section: 'characteristics',
    },
    characteristic: {
      term: 'characteristic',
      def: 'A curve in the $x$–$t$ plane along which information travels. For $u_t + a u_x = 0$ the characteristics are the lines $x - at = $ const, and $u$ is constant along each.',
      section: 'characteristics',
    },
    upwind: {
      term: 'upwind differencing',
      def: 'Taking differences from the side information comes from, chosen by the sign of the wave speed. First-order upwind is stable for $0 \\le |\\nu| \\le 1$, creates no new extrema, and smears fronts.',
      section: 'upwind',
    },
    'cfl-condition': {
      term: 'CFL condition',
      def: 'Courant, Friedrichs and Lewy (1928): a scheme can converge only if its numerical domain of dependence contains the exact one. For a stencil reaching one cell upstream per step, $|\\nu| \\le 1$. Necessary, not sufficient.',
      section: 'cfl',
    },
    'courant-number': {
      term: 'Courant number',
      def: '$\\nu = a\\,\\Delta t/\\Delta x$: the number of cells a signal crosses in one time step. Also called the CFL number.',
      section: 'ftcs',
    },
    'von-neumann-analysis': {
      term: 'von Neumann analysis',
      def: 'A stability test for linear, constant-coefficient schemes on periodic grids: insert one Fourier mode $e^{\\mathrm{i}j\\theta}$ and require its amplification factor to satisfy $|G(\\theta)| \\le 1$ for every $\\theta$.',
      section: 'von-neumann',
    },
    'amplification-factor': {
      term: 'amplification factor',
      def: 'The complex number $G(\\theta)$ by which a linear scheme multiplies the Fourier mode $e^{\\mathrm{i}j\\theta}$ in one step. $|G|$ measures growth or damping; its phase, against the exact $-\\nu\\theta$, measures phase error.',
      section: 'von-neumann',
    },
    'numerical-diffusion': {
      term: 'numerical diffusion',
      def: 'Smearing by a scheme\'s even-order truncation error, which acts like a diffusion term $D\\,u_{xx}$ in the modified equation. For upwind, $D = \\tfrac12 a\\Delta x(1 - \\nu)$.',
      section: 'diffusion-dispersion',
    },
    'numerical-dispersion': {
      term: 'numerical dispersion',
      def: 'Waves of different lengths moving at different numerical speeds, caused by odd-order truncation error ($E\\,u_{xxx}$). A sharp feature comes apart into a train of ripples.',
      section: 'diffusion-dispersion',
    },
    'modified-equation': {
      term: 'modified equation',
      def: 'The PDE a scheme actually solves to higher accuracy, found by Taylor-expanding the scheme: $u_t + a u_x = D u_{xx} + E u_{xxx} + \\dots$ (Hirt 1968; Warming and Hyett 1974).',
      section: 'diffusion-dispersion',
    },
    'lax-wendroff': {
      term: 'Lax–Wendroff scheme',
      def: 'The second-order scheme of Lax and Wendroff (1960). For advection it is FTCS plus the counter-diffusion $\\tfrac12 a^2\\Delta t\\,u_{xx}$. Stable for $|\\nu| \\le 1$; dispersive, so it rings at jumps.',
      section: 'diffusion-dispersion',
    },
    'phase-error': {
      term: 'phase error',
      def: 'The difference between a wave\'s numerical and exact phase speeds, $c/a - 1$. Negative means the wave lags. It depends on the wavelength, which is what makes a scheme dispersive.',
      section: 'diffusion-dispersion',
    },
  },
  pathologies: [
    {
      id: 'ftcs-instability',
      name: 'FTCS instability',
      family: 'stability',
      symptom: 'Grid-scale wiggles appear and grow by a fixed factor every step, at any time step, although each difference quotient is accurate.',
      cause: 'Forward Euler in time with a centred space difference. The centred difference turns each Fourier mode into a pure oscillation, and forward Euler spirals oscillations outwards: $|G|^2 = 1 + \\nu^2\\sin^2\\theta &gt; 1$ for every $\\nu \\ne 0$. The modified equation has negative diffusion, $D = -\\tfrac12 a\\Delta x\\,\\nu$.',
      diagnose: 'Plot $\\max|u|$ against step on a log axis: a straight line whose slope is $\\log\\sqrt{1 + \\nu^2}$ (1.118 per step at $\\nu = 0.5$). Halving $\\Delta t$ slows it but does not stop it.',
      mitigations: [
        'Upwind differencing: stable for $|\\nu| \\le 1$, but first order and diffusive.',
        'Lax–Wendroff: add the counter-diffusion $\\tfrac12 a^2\\Delta t\\,u_{xx}$ to cancel the instability and gain second-order accuracy, though dispersive ripples appear at jumps.',
        'Keep the centred difference and change the time integrator to one whose stability region covers part of the imaginary axis (leapfrog, or three-stage Runge–Kutta), which requires either a three-level history or extra stages per step.',
        'Lax–Friedrichs (average the neighbours): stable for $|\\nu| \\le 1$ and very diffusive.',
      ],
      section: 'ftcs',
      demo: { widget: 'advection-schemes', data: { preset: 'ftcs' } },
    },
    {
      id: 'cfl-violation',
      name: 'CFL violation',
      family: 'stability',
      symptom: 'A sawtooth that alternates sign from cell to cell, starting where the solution is steepest and growing by a fixed factor each step.',
      cause: 'The time step lets information travel further than the stencil reaches ($\\nu &gt; 1$ for upwind), so the scheme extrapolates. For upwind the shortest wave grows by $|1 - 2\\nu|$ per step.',
      diagnose: 'Compute $\\nu = |a|\\Delta t/\\Delta x$ with the fastest signal speed anywhere on the grid, including sound or gravity waves. A growth ratio of 1.2 per step at $\\nu = 1.1$ is the signature for upwind.',
      mitigations: [
        'Choose $\\Delta t$ every step from the CFL number with a safety factor, using the largest $|a|/\\Delta x$ in the domain.',
        'An implicit scheme: its domain of dependence is the whole grid, so it is stable at large $\\nu$, though time accuracy degrades and each step requires a linear solve.',
        'A semi-Lagrangian scheme, whose stencil moves to the foot of the characteristic, or a wider upwind stencil (Beam–Warming allows $\\nu \\le 2$).',
        'Local time stepping or subcycling, where only a few cells are small or fast.',
      ],
      section: 'cfl',
      demo: { widget: 'advection-schemes', data: { preset: 'cfl-violation' } },
    },
    {
      id: 'numerical-diffusion',
      name: 'Numerical diffusion',
      family: 'accuracy',
      symptom: 'Fronts smear and peaks sink as the solution travels, while the total amount (mass) stays exact. Lowering the time step makes it worse.',
      cause: 'Even-order truncation error. First-order upwind solves $u_t + a u_x = D u_{xx}$ with $D = \\tfrac12 a\\Delta x(1 - \\nu)$ more accurately than the equation you meant, so a pulse spreads as if by heat conduction.',
      diagnose: 'Measure the width of a pulse: its variance grows at the rate $2D$. Halving $\\Delta x$ at fixed $\\nu$ halves a first-order error. Comparing $D$ with the physical diffusivity shows whether numerical diffusion dominates at large cell Péclet numbers.',
      mitigations: [
        'A second-order scheme with a flux limiter: sharp fronts without new wiggles (see the Shocks chapter).',
        'Refine the grid where the fronts are, since $D$ is proportional to $\\Delta x$.',
        'Run first-order upwind near $\\nu = 1$, where $D$ vanishes, rather than at small $\\nu$.',
        'Higher-order interpolation in semi-Lagrangian schemes (cubic rather than linear).',
      ],
      section: 'diffusion-dispersion',
      demo: { widget: 'advection-schemes', data: { preset: 'numerical-diffusion' } },
    },
    {
      id: 'dispersive-wiggles',
      name: 'Dispersive ripples',
      family: 'accuracy',
      symptom: 'A train of ripples trailing (or leading) a steep or narrow feature; values dip below the initial minimum although the scheme is stable and conserves mass.',
      cause: 'Odd-order truncation error $E\\,u_{xxx}$: waves of different lengths travel at different speeds, $c = a + Ek^2$, so a feature made of many wavelengths comes apart. Lax–Wendroff and leapfrog lag their short waves ($E &lt; 0$); Beam–Warming leads them.',
      diagnose: 'Compare the minimum and maximum with the initial ones (undershoot and overshoot). See which side of the feature the ripples are on. Refine: on smooth data they shrink fast once the feature is resolved (Lax–Wendroff on a Gaussian of width $\\sigma = 0.05$, one trip: undershoot 0.15 at 50 cells, 0.03 at 100, below $10^{-4}$ at 200).',
      mitigations: [
        'Resolve the features: about ten or more points per wavelength of the shortest wave that matters.',
        'Flux limiters or WENO near steep gradients (see the Shocks chapter) keep fronts sharp and ripple-free, though they introduce nonlinearity and slightly clip smooth peaks.',
        'Add a small amount of explicit high-wavenumber dissipation (a spatial filter or artificial viscosity) to damp the shortest waves.',
        'Pick the scheme and Courant number with the smallest phase error for your data (Fromm at $\\nu = \\tfrac12$ has none to leading order).',
      ],
      section: 'diffusion-dispersion',
      demo: { widget: 'advection-schemes', data: { preset: 'lw-dispersion' } },
    },
    {
      id: 'leapfrog-splitting',
      name: 'Leapfrog time splitting',
      family: 'accuracy',
      symptom: 'Odd and even time steps drift apart so that the solution oscillates from step to step, often accompanied by a spurious wave packet travelling upstream.',
      cause: 'Leapfrog is a three-level scheme with two roots of $G$ per wavenumber. The second, computational root sits near $G = -1$, never decays, and is fed by a careless first step ($u^1 = u^0$) or by nonlinear terms.',
      diagnose: 'Monitor $\\max_j|u_j^{n+1} - 2u_j^n + u_j^{n-1}|$ against the size of the solution, or plot odd and even steps separately.',
      mitigations: [
        'Start with a second-order two-level step (Lax–Wendroff or Runge–Kutta) rather than setting $u^1 = u^0$. In the lab the flip readout falls from $3.5 \\times 10^{-2}$ to $1.9 \\times 10^{-3}$, and most of what remains is the smooth solution\'s own curvature in time.',
        'The Robert–Asselin time filter damps the computational mode while slightly damping the physical wave ($\\gamma = 0.1$ reduces the Gaussian peak by 11% over two periods in the lab).',
        'Restart now and then with a two-level step.',
        'Use a two-level time integrator, such as a Runge–Kutta method, instead.',
      ],
      section: 'higher-order',
      demo: { widget: 'advection-schemes', data: { preset: 'leapfrog-asselin' } },
    },
  ],
};
