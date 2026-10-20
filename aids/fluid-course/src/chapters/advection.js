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
<p class="lead-in">Pour a line of dye into a river that flows at a steady speed. A minute later the line is further downstream, and it has the same shape. That is advection: a quantity carried along by a flow without changing. Its equation is the simplest in fluid dynamics, and its exact solution is a shift. Yet every method that computes it on a grid gets it wrong in one of three ways. It blows up, it smears, or it ripples. This chapter is about why. The tools you meet here (the CFL condition, von Neumann analysis and the modified equation) tell you which failure to expect before you run anything, and they apply to every explicit fluid solver in the rest of the course.</p>

<h2 id="characteristics">Characteristics: the exact answer</h2>
<p>Take a quantity $u(x, t)$, such as a dye concentration or a temperature, carried by a flow of constant speed $a$ along a line. If nothing mixes or reacts, each parcel of fluid keeps its value of $u$. Ride along with a parcel and you see $u$ stay constant. That is the whole of the physics. In symbols it is the <dfn data-term="advection">advection</dfn> equation:</p>
<div class="eq" id="eq-advection">$$\frac{\partial u}{\partial t} + a\,\frac{\partial u}{\partial x} = 0.$$<span class="eq-tag">(7.1)</span></div>
<p>The left side is the rate of change seen by an observer moving at speed $a$. It is the <a href="#/viewpoints/material-derivative">material derivative</a> of <i>Two ways of watching a flow</i>, in one dimension with a uniform velocity. To check that the equation says what we claimed, follow a point that moves with the flow, $x = x_0 + at$. By the chain rule,</p>
$$\frac{\mathrm{d}}{\mathrm{d}t}\,u(x_0 + at,\ t) = \frac{\partial u}{\partial t} + a\,\frac{\partial u}{\partial x} = 0,$$
<p>so $u$ is constant along each line $x - at = x_0$. These lines are the <dfn data-term="characteristic">characteristics</dfn> of the equation. Each one carries the value it started with, so for any initial profile $u_0(x)$ the solution is</p>
<div class="eq" id="eq-shift">$$u(x, t) = u_0(x - at).$$<span class="eq-tag">(7.2)</span></div>
<p>The profile slides right at speed $a$ if $a &gt; 0$ and left if $a &lt; 0$. It keeps its shape exactly: no smearing, no new wiggles, no growth. Two facts hidden in (7.2) drive the rest of the chapter. First, information travels one way only, from upstream to downstream. Second, it travels at a finite speed. The value at a point $(x, t)$ depends on the initial data at a single point, the <em>foot</em> of its characteristic, $x - at$.</p>

<figure data-widget="advection-characteristics" class="wide"><figcaption>The $x$–$t$ plane coloured by the exact solution $u = u_0(x - at)$ on a periodic interval. Thin lines are characteristics. The thick line runs from the probe back to its foot on the $t = 0$ axis; the plot below shows the profile at $t = 0$ (dashed) and at the probe's time (solid).</figcaption></figure>
<div class="try"><ol>
<li>Drag the probe around the plane. The readouts <b>u at probe</b> and <b>u₀ at foot</b> always agree: that is (7.2).</li>
<li>Slide <b>Speed a</b> through zero. The characteristics stand up, then lean the other way, and the side the information comes from (the <b>upwind side</b>) swaps.</li>
<li>Pick the square wave. Its jumps travel along characteristics too: the exact solution never smooths them.</li>
</ol></div>

<aside class="who" data-person="jean-le-rond-dalembert">In a memoir for the Berlin Academy (academy year 1747, printed 1749) d'Alembert wrote the equation of the vibrating string and gave its general solution as the sum of two waves travelling in opposite directions. Each of those waves obeys an equation like (7.1), one with speed $+c$ and one with $-c$.</aside>

<p>Why call this the hardest easy equation? Because a grid knows $u$ only at points $x_j = j\,\Delta x$ and times $t^n = n\,\Delta t$. After one step the exact answer at $x_j$ is the old profile at the foot $x_j - a\Delta t$, and the foot almost never lands on a grid point. The scheme has to <em>reconstruct</em> the profile between points from the values it has. Every reconstruction makes an error, and on a long run those errors pile up. A pure shift is the most unforgiving test there is, because the right answer has no smoothing in it to hide behind. A diffusion problem forgives errors in its shortest waves, since the physics damps them anyway. Advection keeps every wavelength forever.</p>
<p>The same structure carries over to harder problems. Nonlinear equations such as Burgers' equation (<a href="#/shocks/burgers">next chapter</a>) have characteristics whose speed depends on $u$ itself. Systems such as the Euler equations have several families of characteristics moving at different speeds. Their numerical methods are built from the pieces in this chapter.</p>
<aside class="note" data-label="Riemann's invariants">For a gas with pressure a function of density alone, Riemann (notice 1859, paper 1860) found two combinations of velocity and density that stay constant along two families of characteristics. That is the nonlinear, two-wave version of (7.2), and it is how he saw that compressions steepen into shocks. See <a href="#/people/bernhard-riemann">his page</a>.</aside>

<h2 id="ftcs">The obvious scheme, and why it explodes</h2>
<p>Here is what most people write first. Replace the time derivative by a forward difference and the space derivative by a centred difference. Each is a textbook approximation (see <a href="#/discretization/taylor">Taylor series and finite differences</a>): the forward difference is first order in $\Delta t$ and the centred difference is second order in $\Delta x$. The result is called FTCS, for <em>forward time, centred space</em>:</p>
<div class="eq" id="eq-ftcs">$$u_j^{n+1} = u_j^n - \frac{\nu}{2}\left(u_{j+1}^n - u_{j-1}^n\right), \qquad \nu = \frac{a\,\Delta t}{\Delta x}.$$<span class="eq-tag">(7.3)</span></div>
<p>The number $\nu$ is the <dfn data-term="courant-number">Courant number</dfn>: how many cells a signal crosses in one step. It turns up in every scheme in this chapter. The scheme is <dfn data-term="consistency">consistent</dfn>: shrink $\Delta t$ and $\Delta x$ and the difference equation turns into (7.1). It looks harmless. Run it.</p>

<div data-quiz="q1"></div>

<figure data-widget="advection-schemes" data-preset="ftcs" class="wide"><figcaption>The advection lab, set up with FTCS on a square wave ($n = 100$, $\nu = 0.5$). The dashed line is the exact solution. The lower plot shows the largest $|u|$ on a log axis; the dashed line there has the slope that von Neumann analysis predicts (see <a href="#/advection/von-neumann">Von Neumann analysis</a>). Switch <b>Compare</b> to Lax–Friedrichs for the fix.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b>. Grid-scale wiggles appear at the jumps and grow. After one trip round the domain (200 steps) the largest value is about $3.5 \times 10^8$.</li>
<li>Watch the lower plot. On a log axis the growth is a straight line: a fixed factor per step. <b>measured growth / step</b> hovers between 1.11 and 1.12, against <b>max |G|</b> = 1.118.</li>
<li>Pull ν down to 0.1 and run again. It still blows up, only more slowly ($|u|$ reaches about 14 after one trip). No time step makes FTCS stable.</li>
<li>Switch <b>Compare</b> to <b>Lax–Friedrichs</b>. Stable, but the square wave turns into a low hump (peak 0.71 after one trip).</li>
</ol></div>

<p>Why does an accurate-looking scheme explode? Look at one wave. A sine wave on the grid, under the centred difference, simply oscillates in time at each point: the centred difference turns (7.1) into a set of pure rotations, one per wavelength. Forward Euler, applied to a rotation, steps along the tangent and lands slightly outside the circle every time. So every wave grows a little every step, whatever $\Delta t$ you choose. The shortest waves grow fastest, which is why the blow-up starts as a sawtooth at the jumps. <a href="#/advection/von-neumann">Von Neumann analysis</a>, below, turns this picture into a formula. For now notice the lesson: <em>consistency is not enough</em>. A scheme can approximate each derivative well and still be useless, because errors can feed on themselves. That is the content of the <a href="#/discretization/convergence">Lax equivalence theorem</a>: a consistent linear scheme converges if and only if it is stable.</p>
<p>The first fix is due to Peter Lax (1954). Replace $u_j^n$ on the right of (7.3) by the average of its two neighbours:</p>
<div class="eq" id="eq-lxf">$$u_j^{n+1} = \tfrac12\left(u_{j+1}^n + u_{j-1}^n\right) - \frac{\nu}{2}\left(u_{j+1}^n - u_{j-1}^n\right).$$<span class="eq-tag">(7.4)</span></div>
<p>This Lax–Friedrichs scheme is stable for $|\nu| \le 1$. The averaging smooths each step, and that smoothing beats the growth. It also smooths the solution you wanted. In <a href="#/advection/diffusion-dispersion">Numerical diffusion and dispersion</a> you will see that, at $\nu = 0.5$, Lax–Friedrichs smears three times as fast as the scheme of the next section.</p>
<aside class="who" data-person="peter-lax">Lax's 1954 paper on weak solutions of conservation laws used the averaged scheme (7.4) to compute shocks. Why Friedrichs's name joined his is not documented; Godunov recalled that A. I. Zhukov in Moscow had a method that coincided with it.</aside>
<details class="deeper"><summary>Go deeper: can a tiny time step save FTCS?</summary>
<p>Only at a ruinous price. Von Neumann analysis (below) shows that FTCS multiplies a wave of wavenumber $\theta = k\Delta x$ by a factor of size $\sqrt{1 + \nu^2\sin^2\theta}$ every step. Over a fixed time $T$ there are $T/\Delta t$ steps, so the worst growth is</p>
$$\left(1 + \nu^2\right)^{T/(2\Delta t)} \le \exp\!\left(\frac{\nu^2 T}{2\Delta t}\right) = \exp\!\left(\frac{a^2\,\Delta t\,T}{2\,\Delta x^2}\right).$$
<p>That stays bounded as the grid is refined only if $\Delta t$ shrinks like $\Delta x^2$. In the sense of Lax and Richtmyer, then, FTCS is stable under $\Delta t \le C\Delta x^2$, the restriction of an explicit diffusion solver (<a href="#/stiffness/heat">Diffusion and stiffness</a>). For advection, which needs only $\Delta t \propto \Delta x$, that is wasted work on a scale that grows with every refinement. Nobody uses FTCS for advection.</p></details>

<h2 id="upwind">Look upwind</h2>
<p>The centred difference fails because it treats both neighbours alike, while the physics does not. When $a &gt; 0$ the value at $x_j$ next step comes from the left. The right-hand neighbour is downstream: it has no say. So take the space difference from the side the information comes from, the <dfn data-term="upwind">upwind</dfn> side:</p>
<div class="eq" id="eq-upwind">$$u_j^{n+1} = \begin{cases} u_j^n - \nu\left(u_j^n - u_{j-1}^n\right), & a &gt; 0,\\[2pt] u_j^n - \nu\left(u_{j+1}^n - u_j^n\right), & a &lt; 0. \end{cases}$$<span class="eq-tag">(7.5)</span></div>
<p>This is the first-order upwind scheme. There is a second way to read it, and it explains why it works. For $a &gt; 0$ rewrite the first line as</p>
$$u_j^{n+1} = (1 - \nu)\,u_j^n + \nu\,u_{j-1}^n .$$
<p>That is <em>linear interpolation</em>. The exact answer is the old profile at the foot $x_j - \nu\Delta x$. When $0 \le \nu \le 1$ the foot lies between $x_{j-1}$ and $x_j$, and (7.5) draws a straight line between the two old values and reads it off at the foot. So the scheme does what the physics says: trace the characteristic back one step, then interpolate. The two weights $1 - \nu$ and $\nu$ are both non-negative and add up to 1. The new value is therefore an average of old values. It can never be larger than the largest of them or smaller than the smallest, so the scheme cannot blow up and cannot create wiggles.</p>

<figure data-widget="advection-upwind-stencil"><figcaption>Top: two time levels of a grid. The characteristic through the target point (yellow) lands at the foot (diamond); the shaded band marks the scheme's stencil. Bottom: the old values, the exact profile (dashed) and the polynomial through the stencil values (solid). The scheme's new value (filled circle) sits on that polynomial at the foot; the ring marks the exact value.</figcaption></figure>
<div class="try"><ol>
<li>With <b>Upwind</b>, move ν between 0 and 1. The filled circle slides along the straight line, and <b>Σ|weights|</b> stays at 1. Notice the small gap between it and the ring: interpolation error, the seed of the smearing you will measure under numerical diffusion.</li>
<li>Push ν past 1. The foot leaves the stencil and the scheme <em>extrapolates</em>: one weight turns negative and Σ|weights| = $2\nu - 1$ climbs above 1, matching <b>max |G|</b>.</li>
<li>Choose <b>Downwind</b>, the difference on the wrong side. The foot is outside its stencil for every $\nu &gt; 0$.</li>
<li>Choose <b>Lax–Wendroff</b>. Its stencil has three points and the curve is a parabola: inside the stencil, but with one negative weight. Remember this for <a href="#/advection/higher-order">Higher order, and its price</a>.</li>
</ol></div>

<p>The interpolation view also says what goes wrong on the other side. The downwind difference, $u_j^n - \nu(u_{j+1}^n - u_j^n)$ for $a &gt; 0$, is the same line pushed through $x_j$ and $x_{j+1}$ and read off outside them. Extrapolation with weights $1 + \nu$ and $-\nu$ amplifies any wiggle by up to $1 + 2\nu$ every step. Try it in the lab below.</p>

<figure data-widget="advection-schemes" data-preset="downwind" class="wide"><figcaption>Downwind against upwind on the same square wave ($n = 100$, $\nu = 0.5$). The lab pauses after 100 steps, where the gallery compares the pair.</figcaption></figure>
<div class="try"><ol>
<li>Run the downwind case. The largest value doubles every step (<b>max |G|</b> = 2) and reaches about $6 \times 10^{28}$ by step 100.</li>
<li>Switch to <b>upwind</b> and run. Nothing grows: the peak sinks slightly and the corners round off. That rounding is the price of upwinding.</li>
</ol></div>

<p>Which side is "upwind" depends only on the sign of $a$. A real solver checks the sign at every face, every step, because the flow can turn round.</p>
<div data-quiz="q2"></div>

<aside class="who" data-person="richard-courant">In 1952 Courant, Eugene Isaacson and Mina Rees solved nonlinear hyperbolic systems by tracing characteristics back from each new grid point and interpolating between old values. For linear advection their method is exactly (7.5), and the first-order upwind scheme is still often called the CIR scheme after them.</aside>
<aside class="note" data-label="Names">The finite-volume form of (7.5) is the <em>donor-cell</em> scheme: each cell face carries the value of the cell the flow comes from. Van Leer (2006) traces that name to the Los Alamos and Livermore laboratories. Who first said "upwind" has not been established.</aside>
<p>The trace-and-interpolate reading has a further consequence. Nothing forces you to stop one cell upstream. A <a href="#/stable-fluids/semi-lagrangian">semi-Lagrangian scheme</a> (in <i>A fluid you can stir</i>) follows the characteristic back as far as the time step requires, then interpolates around wherever the foot lands. Its stencil moves with the foot, so it can take time steps far beyond $\nu = 1$. Fixed-stencil schemes cannot, and the next section shows why not.</p>

<h2 id="cfl">The CFL condition</h2>
<p>Look at which old values a scheme uses. One upwind step at $x_j$ uses $x_{j-1}$ and $x_j$. Two steps use $x_{j-2}$ to $x_j$, and $N$ steps use $N + 1$ points stretching $N\Delta x$ upstream. That fan of grid points is the scheme's <em>numerical domain of dependence</em>. The exact solution's domain of dependence is a single point, the foot $x_j - aN\Delta t$. Courant, Friedrichs and Lewy saw in 1928 that if the foot lies outside the numerical fan, the scheme cannot converge. The argument is short. Change the initial data near the foot only. The exact solution at $x_j$ changes; the numerical one cannot, because it never looks there. No refinement repairs this, since both fans scale together when $\Delta t$ and $\Delta x$ shrink in proportion. This is the <dfn data-term="cfl-condition">CFL condition</dfn>. For a scheme that reaches $L$ cells upstream per step it reads</p>
<div class="eq" id="eq-cfl">$$|\nu| = \frac{|a|\,\Delta t}{\Delta x} \le L, \qquad\text{so } |\nu| \le 1 \text{ for upwind, FTCS, Lax–Friedrichs and Lax–Wendroff}.$$<span class="eq-tag">(7.6)</span></div>
<p>Physically: in one time step a signal may not travel further than the stencil can see. Beam–Warming (<a href="#/advection/higher-order">below</a>) reaches two cells upstream, so its limit is $\nu \le 2$. Downwind reaches none, so it fails at every $\nu &gt; 0$.</p>

<figure data-widget="advection-cfl-cone" class="wide"><figcaption>The space–time lattice for $N$ steps to time $T$. Blue: the lattice points the scheme can feel from the yellow point, and the triangle they fill. Bold line: the exact characteristic from the yellow point; its foot (diamond) is at $x = -aT$. The bars compare the range of ν where the CFL condition holds with the range where the scheme is actually stable (from von Neumann analysis).</figcaption></figure>
<div class="try"><ol>
<li>With <b>Upwind</b>, drag ν past 1. The foot leaves the triangle exactly at $\nu = 1$, where the stable bar ends too.</li>
<li>Change <b>Steps to reach T</b> from 4 to 16 at fixed ν. The lattice gets finer, but the triangle does not move: refinement at a fixed Courant number cannot rescue a CFL violation.</li>
<li>Choose <b>Beam–Warming</b>: the triangle reaches two cells per step and both bars stretch to $\nu = 2$.</li>
<li>Choose <b>FTCS</b>. The CFL bar fills up to $\nu = 1$, yet the stable bar is empty. The CFL condition is necessary, not sufficient.</li>
</ol></div>

<div data-quiz="q4"></div>

<figure data-widget="advection-schemes" data-preset="cfl-violation" class="wide"><figcaption>Upwind at $\nu = 1.1$ against $\nu = 0.9$, on a square wave with $n = 100$. Both are the same scheme; only the time step differs.</figcaption></figure>
<div class="try"><ol>
<li>Run at $\nu = 1.1$. A sawtooth grows from the jumps by a factor of 1.2 per step and reaches about $6 \times 10^6$ after 100 steps.</li>
<li>Switch to $\nu = 0.9$. The run is stable and the peak stays at or below 1.</li>
<li>Now set ν to exactly 1.00 and choose the Gaussian. Upwind becomes an exact one-cell shift each step: the dashed and solid curves coincide.</li>
</ol></div>

<aside class="history" data-era="1928">Courant, Friedrichs and Lewy's paper "Über die partiellen Differenzengleichungen der mathematischen Physik" (<i>Mathematische Annalen</i> 100, 1928) predates electronic computers. Its aim was mathematical: to prove that solutions exist by showing that difference solutions converge. "Nowhere do we assume the existence of the solution to the differential equation problem", they wrote; "on the contrary, we obtain a simple existence proof by using the limiting process." For hyperbolic problems they found that "convergence is obtained only if the ratio of the mesh widths in different directions satisfies certain inequalities which in turn depend on the position of the characteristics relative to the mesh" (English translation, 1967). The condition was a requirement for convergence. Reading it as a rule for machine calculation came after 1945.</aside>
<aside class="who" data-person="hans-lewy">Third author of the 1928 paper. For the wave equation it states: "From this follows a remarkable fact: if for the case $k &lt; 1$ one lets $h \to 0$, then the solution to the difference equation in general cannot converge to the solution of the differential equation." There $h$ was the time step and $kh$ the space step, so $k$ is the reciprocal of today's Courant number. Accounts that credit Lewy alone with the key idea have no primary source; treat it as the work of all three.</aside>
<aside class="who" data-person="kurt-friedrichs">Courant's collaborator on the 1928 paper and later on <i>Supersonic Flow and Shock Waves</i> (1948). His name is also on the Lax–Friedrichs scheme (7.4).</aside>
<p>The condition was found again by experiment. At wartime Los Alamos, <a href="#/people/rudolf-peierls">Rudolf Peierls</a> ran into the time-step limit in hydrodynamic calculations without knowing the 1928 paper. Morgan and Archer (2021) write that "Peierls clearly did not know about the Courant stability condition, he re-discovered it empirically", that it was first called the Peierls condition there, and that "by 1945 Los Alamos was referring to it as the Courant condition." In 1950 <a href="#/people/jule-charney">Charney</a>, Fjørtoft and von Neumann noted that integrating the full forecast equations would need time and space steps "chosen to satisfy the Courant-Friedrichs-Lewy condition (1928) for the computational stability of the equation governing the motion of long gravity waves". Fast gravity waves would have forced tiny steps, which was one reason they integrated a filtered equation instead.</p>
<aside class="note" data-label="Courant number or CFL number?">The 1928 paper did not name the ratio. By 1967 Richtmyer and Morton could write that it "is often called the 'Courant number'". The name honours only Courant; "CFL number" credits all three authors. Symbols vary too: $\nu$, $C$, $\sigma$ and others.</aside>
<p>Three remarks keep the condition in proportion. First, it is <em>necessary, not sufficient</em>. FTCS satisfies it for $|\nu| \le 1$ and still blows up. As Lax put it in 2013: "The CFL condition is only a necessary condition for the convergence of difference schemes." Second, it is about the fastest signal anywhere on the grid, not the average one. A real solver computes $\Delta t$ every step from the largest $|a|/\Delta x$ in the domain, with a safety factor. Third, an <dfn data-term="implicit-method">implicit</dfn> scheme (<a href="#/stiffness/implicit">Implicit methods</a>) couples every point to every other in a single step, so its numerical domain of dependence is the whole grid. It satisfies the CFL condition at any $\Delta t$. Whether it is <em>accurate</em> at large $\nu$ is another matter.</p>
<aside class="pitfall">The CFL number of a simulation is set by its fastest signal, which may not be the flow you are interested in. Sound waves in a nearly incompressible flow, or gravity waves in an atmosphere, can force tiny steps on a slow flow. See <a href="#/pathologies">CFL violation</a> in the gallery.</aside>

<div data-quiz="q3"></div>

<h2 id="von-neumann">Von Neumann analysis</h2>
<p>The CFL condition tells you when a scheme <em>cannot</em> work. To know when it <em>does</em> work you need more. The tool is to watch a single wave. Any grid function on a periodic grid is a sum of sine waves, its Fourier modes. A linear scheme with constant coefficients does not mix them: each mode comes out of a step as the same mode, multiplied by a complex number. So write one mode, with $\theta = k\Delta x$ the phase change from one grid point to the next:</p>
<div class="eq" id="eq-mode">$$u_j^n = G(\theta)^n\, e^{\mathrm{i} j\theta}, \qquad 0 \le \theta \le \pi .$$<span class="eq-tag">(7.7)</span></div>
<p>Small $\theta$ is a long, well-resolved wave; $\theta = \pi$ is the shortest wave the grid can hold, a sawtooth that alternates sign from point to point. The <dfn data-term="amplification-factor">amplification factor</dfn> $G(\theta)$ says everything about that mode. Its size $|G|$ is how much the wave grows or shrinks per step. Its phase says how far the wave moves. The exact solution moves every mode by $\nu$ cells per step without change, so the exact factor is $e^{-\mathrm{i}\nu\theta}$, with $|G| = 1$. <dfn data-term="von-neumann-analysis">Von Neumann analysis</dfn> is the requirement $|G(\theta)| \le 1$ for every $\theta$: no wave may grow.</p>
<p>Put (7.7) into the upwind scheme (7.5). Every term carries the same $G^n e^{\mathrm{i}j\theta}$, which cancels:</p>
<div class="eq" id="eq-g-upwind">$$G = 1 - \nu\left(1 - e^{-\mathrm{i}\theta}\right), \qquad |G|^2 = 1 - 2\nu(1 - \nu)(1 - \cos\theta).$$<span class="eq-tag">(7.8)</span></div>
<p>For $0 \le \nu \le 1$ the product $\nu(1 - \nu)$ is non-negative, so $|G| \le 1$: stable. For $\nu &gt; 1$ it is negative and $|G| &gt; 1$ for every $\theta &gt; 0$. The worst wave is the sawtooth, $|G(\pi)| = |1 - 2\nu|$, which is the factor 1.2 per step you saw at $\nu = 1.1$. At $\nu = 1/2$ the same sawtooth has $G = 0$: upwind wipes it out in one step. For FTCS (7.3), $e^{\mathrm{i}\theta} - e^{-\mathrm{i}\theta} = 2\mathrm{i}\sin\theta$ gives</p>
<div class="eq" id="eq-g-ftcs">$$G = 1 - \mathrm{i}\,\nu\sin\theta, \qquad |G|^2 = 1 + \nu^2\sin^2\theta \;&gt;\; 1 .$$<span class="eq-tag">(7.9)</span></div>
<p>That is the outward spiral of <a href="#/advection/ftcs">the FTCS section</a>, now in numbers: at $\nu = 0.5$ the worst wave, four points per wavelength, grows by $\sqrt{1.25} = 1.118$ per step. Lax–Friedrichs gives $G = \cos\theta - \mathrm{i}\nu\sin\theta$, so $|G|^2 = \cos^2\theta + \nu^2\sin^2\theta \le 1$ exactly when $|\nu| \le 1$. Note that $|G(\pi)| = 1$ for Lax–Friedrichs at every $\nu$: it never damps the sawtooth, because its stencil skips the centre point and lets odd and even points drift apart.</p>

<figure data-widget="advection-amplification" class="wide"><figcaption>Left: $G(\theta)$ in the complex plane as $\theta$ runs from 0 to $\pi$, with the unit circle (dotted) and the exact factor $e^{-\mathrm{i}\nu\theta}$ (dashed). Right: $|G|$ and the relative phase speed $c/a$ against $\theta$. The marked point is the wavenumber chosen on the slider.</figcaption></figure>
<div class="try"><ol>
<li>Upwind at $\nu = 0.5$: the locus is a circle inside the unit circle, touching it only at $\theta = 0$. Long waves survive; short waves are damped.</li>
<li>Drag ν past 1. The locus bulges out of the unit circle at $\theta = \pi$ first, and <b>max over θ of |G|</b> turns red.</li>
<li>Choose <b>FTCS</b>. The locus is a vertical line through 1: outside the circle for every $\theta$ except 0 and $\pi$, at every ν.</li>
<li>Choose <b>Leapfrog</b> (see <a href="#/advection/higher-order">Higher order</a>). Both of its roots lie exactly on the unit circle for $\nu &lt; 1$: no damping at all. The second, computational, root sits near $-1$.</li>
<li>Back to upwind, set $\theta = 2$ (about three points per wavelength) and move ν across 0.5. The phase speed goes from slow ($c/a$ = 0.68 at ν = 0.25) to fast (1.11 at ν = 0.75).</li>
</ol></div>

<aside class="who" data-person="john-von-neumann">The Fourier test carries his name, but he never published a full account of it himself. Textbooks often say it was first described briefly by Crank and Nicolson (1947); the earliest confirmed printed use involving von Neumann is the 1950 ENIAC weather-forecast paper he wrote with Charney and Fjørtoft.</aside>
<aside class="history" data-era="1950">In Section V of "Numerical integration of the barotropic vorticity equation" (<i>Tellus</i>, 1950), Charney, Fjørtoft and von Neumann put a single Fourier harmonic into their linearised difference equations and asked that its growth factor, which they called $\omega$, satisfy $|\omega| \le 1$. "We shall employ a heuristic procedure", they wrote, "which is, however, patterned after the rigorous method of Courant, Friedrichs, and Lewy (1928)." O'Brien, Hyman and Kaplan published another account the same year. Lax and Richtmyer's 1956 survey gave the test its standard form, in a section headed "The Von Neumann (Necessary) Condition for Stability", and called $G$ the amplification matrix.</aside>
<aside class="who" data-person="klara-dan-von-neumann">The authors of the 1950 forecast paper thanked "Mrs K. von Neumann for instruction in the technique of coding for the Eniac and for checking the final code". Popular accounts that credit her with producing the forecast go beyond that source.</aside>
<p>Why should stability matter if your initial data are smooth and contain no short waves? Because they will. Rounding error puts a little of every wavelength into the solution at every step, and any unstable mode then grows from that seed. As Lax and Richtmyer (1956) put it in the remark quoted in <a href="#/discretization/convergence">the discretisation chapter</a>, only initial data "chosen with diabolical care" escape. You can see the delay in the lab. FTCS at $\nu = 0.1$ on a smooth Gaussian ($n = 100$) looks almost fine after one trip round, peaking at 1.16. After five trips it has reached 135.</p>
<aside class="who" data-person="robert-richtmyer">Co-author with Lax of the 1956 survey that proved the equivalence theorem, and author of the standard early textbook on difference methods (1957; second edition with K. W. Morton, 1967).</aside>
<p>Von Neumann analysis is exact only for linear, constant-coefficient schemes on periodic grids. With variable coefficients, practitioners "freeze" them and check the test at every point; with boundaries or nonlinearity, it is a necessary check rather than a proof. It is still the first thing to compute for any new scheme, because it costs a few lines of algebra and it is usually right.</p>
<details class="deeper"><summary>Go deeper: where the numbers on the figure come from</summary>
<p>Write $G = |G|\,e^{-\mathrm{i}\phi}$, where $\phi$ is the phase the scheme moves the wave per step. The exact phase is $\nu\theta$, so the <em>relative phase speed</em> is $c/a = \phi/(\nu\theta)$. A wave of wavelength $\lambda = 2\pi\Delta x/\theta$ needs $2\pi/(\nu\theta)$ steps to travel one wavelength. In that time its amplitude changes by $|G|^{2\pi/(\nu\theta)}$ and its phase drifts by $(c/a - 1) \times 360^\circ$. For upwind at $\nu = 0.5$ and four points per wavelength ($\theta = \pi/2$), $|G| = 1/\sqrt2$ and the wave needs 8 steps per wavelength, so it keeps $(1/\sqrt2)^8 = 1/16$ of its amplitude: about 6%. A short wave does not survive a first-order scheme.</p></details>

<h2 id="diffusion-dispersion">Numerical diffusion and dispersion</h2>
<p>A stable scheme still changes the shape of what it carries. It does so in two distinct ways. It can <em>damp</em> waves, so peaks sink and fronts smear, or it can move waves of different length at different speeds, so a sharp feature comes apart into ripples. The first is called <dfn data-term="numerical-diffusion">numerical diffusion</dfn>, the second <dfn data-term="numerical-dispersion">numerical dispersion</dfn>. The cleanest way to see both is to ask which equation the scheme really solves.</p>
<p>Expand every term of a scheme in a Taylor series about $(x_j, t^n)$, as in <a href="#/discretization/taylor">Taylor series and finite differences</a>, and use the equation itself to swap time derivatives for space derivatives. What is left is the <dfn data-term="modified-equation">modified equation</dfn>: the PDE that the scheme's output satisfies more accurately than the one you meant to solve. For the schemes in this chapter it has the form</p>
<div class="eq" id="eq-modified">$$\frac{\partial u}{\partial t} + a\,\frac{\partial u}{\partial x} = D\,\frac{\partial^2 u}{\partial x^2} + E\,\frac{\partial^3 u}{\partial x^3} + \cdots .$$<span class="eq-tag">(7.10)</span></div>
<p>The even derivative is a diffusion term: it is the <a href="#/stiffness/heat">heat equation</a> hiding inside your advection scheme. The odd derivative is dispersive: it does not change a wave's amplitude, only its speed. For first-order schemes $D$ dominates; for second-order schemes $D = 0$ and $E$ leads. For upwind, Lax–Friedrichs and FTCS the diffusion coefficients are</p>
<div class="eq" id="eq-diffusion">$$D_{\text{upwind}} = \frac{a\,\Delta x}{2}(1 - \nu), \qquad D_{\text{LxF}} = \frac{a\,\Delta x}{2}\cdot\frac{1 - \nu^2}{\nu}, \qquad D_{\text{FTCS}} = -\frac{a\,\Delta x}{2}\,\nu .$$<span class="eq-tag">(7.11)</span></div>
<p>Three things follow at once. Upwind's $D$ is zero at $\nu = 1$, where the scheme is an exact shift, and largest as $\nu \to 0$. So a smaller time step makes upwind <em>more</em> diffusive, not less. Lax–Friedrichs carries an extra factor $(1 + \nu)/\nu$, which is 3 at $\nu = 0.5$. And FTCS has a <em>negative</em> diffusion coefficient. A heat equation run backwards in time sharpens every wiggle without limit, which is the modified-equation view of the instability you met with FTCS.</p>

<div data-quiz="q5"></div>

<figure data-widget="advection-modified" data-preset="diffusion" class="wide"><figcaption>A Gaussian pulse ($\sigma = 0.05$) carried once round the domain. Dotted: the solution of the heat equation with the scheme's $D$ from (7.11), which spreads a Gaussian so that its variance grows by $2Dt$. The lower plot compares the measured growth of the pulse's variance with $2Dt$.</figcaption></figure>
<div class="try"><ol>
<li>Run upwind at $\nu = 0.5$, $n = 100$. The measured variance grows by 0.0050 over one trip, the value $2Dt$ predicts with $D = 2.5 \times 10^{-3}$, and the dotted Gaussian sits on the numerical one.</li>
<li>Lower ν to 0.2 and run again. $D$ rises to $4 \times 10^{-3}$ and the pulse spreads more. Raise it to 0.9: $D = 5 \times 10^{-4}$.</li>
<li>Switch to <b>Lax–Friedrichs</b>. At $\nu = 0.5$ the spread is three times faster. At small ν the pulse grows so wide it overlaps its periodic copies; the status line says when the comparison stops being clean.</li>
<li>Double $n$ at fixed ν. $D$ halves: numerical diffusion is a first-order error.</li>
</ol></div>
<aside class="pitfall">Numerical diffusion looks like physics. A smeared front in a simulation of a real diffusive flow may be mostly $D_{\text{upwind}}$, not the viscosity you specified. Compare $D$ with the physical diffusivity; when the <dfn data-term="cell-peclet-number">cell Péclet number</dfn> is large (<a href="#/stiffness/peclet">the Péclet number</a>) the numerical one wins.</aside>

<p>The modified equation also suggests a cure. FTCS fails because it has a diffusion coefficient of $-\tfrac12 a^2\Delta t$. Add exactly $+\tfrac12 a^2\Delta t\,u_{xx}$, discretised with a centred second difference, and the leading error cancels:</p>
<div class="eq" id="eq-lw">$$u_j^{n+1} = u_j^n - \frac{\nu}{2}\left(u_{j+1}^n - u_{j-1}^n\right) + \frac{\nu^2}{2}\left(u_{j+1}^n - 2u_j^n + u_{j-1}^n\right).$$<span class="eq-tag">(7.12)</span></div>
<p>This is the <dfn data-term="lax-wendroff">Lax–Wendroff</dfn> scheme. It is second order and stable for $|\nu| \le 1$, and its modified equation has $D = 0$ and $E = -\tfrac16 a\Delta x^2 (1 - \nu^2)$. What does an $E$ term do? Put a single wave $e^{\mathrm{i}(kx - \omega t)}$ into $u_t + a u_x = E u_{xxx}$. It travels unchanged in amplitude, with</p>
<div class="eq" id="eq-dispersion">$$c = \frac{\omega}{k} = a + E k^2, \qquad c_g = \frac{\mathrm{d}\omega}{\mathrm{d}k} = a + 3E k^2 .$$<span class="eq-tag">(7.13)</span></div>
<p>The phase speed $c$ now depends on wavelength. With $E &lt; 0$ short waves are slow: for Lax–Wendroff at $\nu = 0.5$, a wave with four points per wavelength runs at $c = 0.75a$, and the shortest wave, two points per wavelength, does not move at all. The difference between $c/a$ and 1 is the <dfn data-term="phase-error">phase error</dfn>. A sharp feature is a sum of many wavelengths. Once they travel at different speeds the feature comes apart, and the short waves fall behind as a train of ripples. A group of waves, a <em>packet</em>, moves at the group velocity $c_g$, which lags even further. On the grid the exact group velocity comes from the phase of $G$, as Trefethen (1982) showed: $c_g/a = (1/\nu)\,\mathrm{d}\phi/\mathrm{d}\theta$.</p>

<figure data-widget="advection-modified" data-preset="dispersion" class="wide"><figcaption>A wave packet with 16 waves across the domain ($\theta = 1.0$ at $n = 100$: 6.25 points per wavelength), run once round. Dashed vertical line: where the exact packet is. Dashed line in colour: where the discrete group velocity says the packet should be. The triangle marks the measured centre of the packet's energy. The lower plot shows how far the packet lags, measured and predicted.</figcaption></figure>
<div class="try"><ol>
<li>Run <b>Leapfrog</b> (a centred scheme with no damping at all; see <a href="#/advection/higher-order">Higher order</a>). The crests move at $c = 0.87a$ but the packet moves at only $c_g = 0.59a$. After one trip it lags by 0.41, within half a per cent of the discrete group velocity. The leading-order modified equation says 0.38: close, but this wave is too short for a two-term Taylor series.</li>
<li>Set $n = 200$, so the waves are twice as well resolved. The lag drops to 0.10, and both predictions agree with the measurement.</li>
<li>Try <b>Lax–Wendroff</b> at $n = 100$. It damps this wave by 2% per step, so the packet nearly vanishes. Damping removes the shortest, slowest parts first, so the remains lag less than predicted.</li>
<li>Try <b>Beam–Warming</b>: $E &gt; 0$, so the packet runs ahead instead. Then <b>Fromm</b> at $\nu = 0.5$: no lag at all.</li>
</ol></div>
<aside class="history" data-era="1968">Hirt (1968) expanded difference equations in Taylor series to read off their stability "heuristically" from the extra second-derivative terms. Warming and Hyett (1974) named the "modified equation approach" and made it systematic. Godunov recalled that A. I. Zhukov in Moscow used the same idea, a "first differential approximation", in the early 1950s. Keep its limits in mind: it is an asymptotic statement about smooth solutions and well-resolved waves. Near a jump, or for waves a few cells long, use $G(\theta)$ instead.</aside>

<h2 id="higher-order">Higher order, and its price</h2>
<p>First-order upwind is robust and smears everything. The natural move is to use more points and cancel more Taylor terms. Lax and Wendroff (1960) reached (7.12) by a different road from the one above: expand $u$ in time to second order, $u^{n+1} = u + \Delta t\,u_t + \tfrac12\Delta t^2 u_{tt}$, then use the equation to write $u_t = -a u_x$ and $u_{tt} = a^2 u_{xx}$, and replace both space derivatives by centred differences. The same recipe works for systems of conservation laws, which is why the scheme has lasted.</p>
<aside class="who" data-person="burton-wendroff">Lax's doctoral student at New York University, then his co-author on "Systems of conservation laws" (1960). That paper introduced the second-order conservative scheme and proved that a convergent conservative scheme converges to a weak solution, the Lax–Wendroff theorem.</aside>
<p>Lax–Wendroff is not the only second-order choice. Fitting the parabola through the three upwind points $x_{j-2}, x_{j-1}, x_j$ instead of the centred three gives the Beam–Warming scheme (Warming and Beam 1976): fully upwind, stable for $0 \le \nu \le 2$, with $E &gt; 0$ for $\nu &lt; 1$, so it puts its ripples ahead of a jump rather than behind. Fromm (1968) noticed that the two errors have opposite signs and averaged the schemes. Fromm's $E = \tfrac{1}{12} a\Delta x^2 (1 - \nu)(1 - 2\nu)$ vanishes at $\nu = 1/2$. There the scheme is third-order accurate: measured on a sine wave, its error falls by a factor 8 every time $n$ doubles. The table collects the measured behaviour of every scheme in the lab, from the same kernel.</p>
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
<p>Now the price. Go back to the stencil figure in <a href="#/advection/upwind">Look upwind</a> and pick Lax–Wendroff: its parabola has a negative weight. Every linear scheme of second order or higher has one. A negative weight means the new value is not an average of old ones, so near a jump it can overshoot the old maximum. Smooth data hardly notice. A square wave rings.</p>

<div data-quiz="q6"></div>

<figure data-widget="advection-schemes" data-preset="lw-ringing" class="wide"><figcaption>Lax–Wendroff against a flux-limited scheme on a square wave ($n = 200$, $\nu = 0.5$, one trip round). The limited scheme is a preview of <i>Shocks and the limits of linear schemes</i>.</figcaption></figure>
<div class="try"><ol>
<li>Run Lax–Wendroff. Ripples trail each jump, as the negative $E$ predicts, and the solution overshoots by 23% (<b>overshoot / undershoot</b>). <b>TV / TV₀</b> climbs above 1: the scheme has made new wiggles.</li>
<li>Switch to the limited scheme. No overshoot at all, and the jumps stay much sharper than upwind's.</li>
<li>Choose <b>Beam–Warming</b> from the scheme menu: the ripples move to the front of each jump.</li>
</ol></div>
<p>This is not a defect of Lax–Wendroff in particular. Godunov proved in 1959 that a linear scheme that never creates new extrema can be at most first order (<a href="#/shocks/godunov-theorem">Godunov's theorem</a>). To get sharp fronts without ringing you must give up linearity: let the scheme detect steep gradients and fall back to upwind there. That is what <a href="#/shocks/limiters">flux limiters</a> do.</p>

<p>One more second-order scheme deserves a warning label. <em>Leapfrog</em> uses centred differences in both time and space, reaching back two time levels:</p>
<div class="eq" id="eq-leapfrog">$$u_j^{n+1} = u_j^{n-1} - \nu\left(u_{j+1}^n - u_{j-1}^n\right).$$<span class="eq-tag">(7.14)</span></div>
<p>For $|\nu| &lt; 1$ it has $|G| = 1$ for every wave: no damping at all, which is why it served weather and ocean models for decades. (At $\nu = 1.02$ its worst factor is already 1.22, and on the square wave $|u|$ passes 10 within about 30 steps.) But a three-level scheme has two roots of $G$ for each wavenumber. One follows the exact factor $e^{-\mathrm{i}\nu\theta}$. The other, the <em>computational mode</em>, sits near $G = -1$: it flips sign every step and travels the wrong way. It never decays. Whatever puts energy into it, such as a careless first step or a nonlinear term, leaves a ghost that stays for the rest of the run.</p>

<figure data-widget="advection-schemes" data-preset="leapfrog-start" class="wide"><figcaption>Leapfrog on a Gaussian ($n = 100$, $\nu = 0.5$) started two ways. "Copy" sets $u^1 = u^0$; the fix takes one Lax–Wendroff step first. The <b>leapfrog flip</b> readout is the size of the step-to-step oscillation, $\max_j |u_j^{n+1} - 2u_j^n + u_j^{n-1}|/4$. It also picks up a small part from the smooth pulse itself, about $\nu^2\Delta x^2|u_{xx}|/4$.</figcaption></figure>
<div class="try"><ol>
<li>Run the copy start. A small dipole appears and drifts to the <em>left</em> while the pulse goes right: the computational mode. After 400 steps the flip is $3.5 \times 10^{-2}$.</li>
<li>Switch to the Lax–Wendroff start. The flip drops to $1.9 \times 10^{-3}$, eighteen times smaller, and no ghost appears. What is left is mostly the pulse's own curvature in time, not the computational mode.</li>
<li>Go back to the copy start and set <b>Asselin filter γ</b> to 0.10. The ghost fades, but the main pulse loses height faster too.</li>
</ol></div>
<p>The usual cure is the time filter of Robert (1966) and Asselin (1972). After each step, nudge the middle time level towards the average of its neighbours:</p>
<div class="eq" id="eq-asselin">$$\bar u^{\,n} = u^n + \gamma\left(\bar u^{\,n-1} - 2u^n + u^{n+1}\right).$$<span class="eq-tag">(7.15)</span></div>
<p>The term in brackets is a second difference in time. It is large for a mode that flips sign every step and small for a slowly varying one, so it damps the computational mode much more than the physical one. Not by nothing, though: with $\gamma = 0.1$ the lab cuts the flip of the copy start by a factor of 24, and the pulse after 400 steps peaks at 0.81 instead of 0.92. Every cure in this chapter has a cost, and the useful skill is knowing which cost you are paying.</p>
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
      explain: 'With $a &lt; 0$ the foot of the characteristic, $x_j - a\\Delta t$, lies to the right of $x_j$, so the stencil must reach right: $u_j$ and $u_{j+1}$. The left-sided difference would be downwind here and unstable at every $\\nu$; the centred one is FTCS.',
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
      explain: 'The CFL condition is necessary, not sufficient. FTCS satisfies it for $|\\nu| \\le 1$ and blows up anyway. Implicit schemes satisfy it automatically, because one step couples every point.',
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
      explain: 'The space and time errors of upwind partly cancel, and they cancel exactly at $\\nu = 1$. Going from 0.8 to 0.4 triples $D$, from $0.1\\,a\\Delta x$ to $0.3\\,a\\Delta x$. To reduce numerical diffusion, refine $\\Delta x$: $D$ is proportional to it.',
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
      explain: 'Its modified equation has $E = -\\tfrac16 a\\Delta x^2(1 - \\nu^2) &lt; 0$, so $c = a + Ek^2 &lt; a$: the short waves that make up the jump lag and trail it. Beam–Warming has $E &gt; 0$ for $\\nu &lt; 1$ and puts them in front. By Godunov\'s theorem no linear second-order scheme avoids them altogether.',
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
        'Lax–Wendroff: add exactly the diffusion that cancels the instability, $\\tfrac12 a^2\\Delta t\\,u_{xx}$, and gain second order; it rings at jumps.',
        'Keep the centred difference and change the time integrator to one whose stability region covers part of the imaginary axis (leapfrog, or three-stage Runge–Kutta), at the cost of extra stages or a computational mode.',
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
        'An implicit scheme: its domain of dependence is the whole grid, so it is stable at large $\\nu$, at the cost of accuracy and a linear solve per step.',
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
      diagnose: 'Measure the width of a pulse: its variance grows at the rate $2D$. Halve $\\Delta x$ and a first-order error halves. Compare $D$ with the physical diffusivity: when the cell Péclet number is large, the numerical diffusion dominates.',
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
        'Flux limiters or WENO near steep gradients (see the Shocks chapter): sharp and ripple-free, at the cost of nonlinearity and some clipping of smooth peaks.',
        'A little explicit dissipation aimed at the shortest waves (a filter or artificial viscosity), at some cost in accuracy.',
        'Pick the scheme and Courant number with the smallest phase error for your data (Fromm at $\\nu = \\tfrac12$ has none to leading order).',
      ],
      section: 'diffusion-dispersion',
      demo: { widget: 'advection-schemes', data: { preset: 'lw-dispersion' } },
    },
    {
      id: 'leapfrog-splitting',
      name: 'Leapfrog time splitting',
      family: 'accuracy',
      symptom: 'Odd and even time steps drift apart: the solution flips by a small amount from step to step, often with a ghost of the solution travelling the wrong way.',
      cause: 'Leapfrog is a three-level scheme with two roots of $G$ per wavenumber. The second, computational root sits near $G = -1$, never decays, and is fed by a careless first step ($u^1 = u^0$) or by nonlinear terms.',
      diagnose: 'Monitor $\\max_j|u_j^{n+1} - 2u_j^n + u_j^{n-1}|$ against the size of the solution, or plot odd and even steps separately.',
      mitigations: [
        'Start with a second-order two-level step (Lax–Wendroff or Runge–Kutta), not $u^1 = u^0$. In the lab the flip readout falls from $3.5 \\times 10^{-2}$ to $1.9 \\times 10^{-3}$, and most of what remains is the smooth solution\'s own curvature in time.',
        'The Robert–Asselin time filter: damps the computational mode, but also damps the physical solution a little ($\\gamma = 0.1$ costs 11% of the peak over two trips in the lab).',
        'Restart now and then with a two-level step.',
        'Use a two-level time integrator, such as a Runge–Kutta method, instead.',
      ],
      section: 'higher-order',
      demo: { widget: 'advection-schemes', data: { preset: 'leapfrog-asselin' } },
    },
  ],
};
