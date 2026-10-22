// Chapter 8: shocks. Prose, questions, glossary and gallery entries; the
// figures live in ./shocks/ and run the shared kernels src/sims/burgers.js,
// euler1d.js, riemann.js and advection.js (tested in
// tests/fluid-course/sims-shocks.test.js and sims-advection.test.js).

import { mountBreaking } from './shocks/breaking.js';
import { mountSpeed } from './shocks/speed.js';
import { mountEntropy } from './shocks/entropy.js';
import { mountPstar } from './shocks/pstar.js';
import { mountSod } from './shocks/sod.js';
import { mountLimiters } from './shocks/limiters.js';

export const chapter = {
  id: 'shocks',
  title: 'Shocks and the limits of linear schemes',
  short: 'Shocks',
  blurb: 'Burgers\' equation, conservation form, entropy, Godunov\'s theorem and flux limiters.',
  minutes: 55,
  html: String.raw`
<p class="lead-in">In <a href="#/advection">chapter 7</a>, every wave kept its shape because every part of it travelled at the same speed. In a compressible gas, however, a compressed, hotter crest carries sound faster than the rarefied trough ahead of it, so the back of each compression overtakes the front and steepens into a discontinuous jump—a shock—in finite time. Once the profile jumps, the derivatives in the differential equation cease to exist and the classical definition of a solution breaks down. Replacing it with the integral conservation law shows why a numerical scheme must be written in conservation form to compute the right shock speed, why an entropy condition is needed to rule out unphysical expansion shocks, how Godunov built an upwind method from exact shock-tube solutions at cell faces, and why his theorem forces high-order shock-capturing schemes to use nonlinear flux limiters.</p>

<h2 id="burgers">Burgers' equation: when characteristics cross</h2>
<p>The essential nonlinearity of compressible wave propagation is that the wave speed depends on the local state of the fluid. The simplest model that captures this mechanism is <dfn data-term="burgers-equation">Burgers' equation</dfn>, in which each point of the velocity profile $u(x, t)$ moves at its own value $u$:</p>
<div class="eq" id="eq-burgers">$$\frac{\partial u}{\partial t} + u\,\frac{\partial u}{\partial x} = 0 \qquad\Longleftrightarrow\qquad \frac{\partial u}{\partial t} + \frac{\partial}{\partial x}\left(\frac{u^2}{2}\right) = 0.$$<span class="eq-tag">(8.1)</span></div>
<p>The left-hand equation is the <a href="#/advection/characteristics">advection equation</a> of chapter 7 with the constant speed $a$ replaced by $u$, while the right-hand equation writes it as a <dfn data-term="conservation-form">conservation law</dfn> with flux $f(u) = u^2/2$. By the chain rule, the two forms are identical wherever $u$ is differentiable, but they cease to be equivalent as soon as $u$ develops a discontinuity.</p>
<p>Along a trajectory moving at the local fluid speed, $\mathrm{d}x/\mathrm{d}t = u$, the material derivative vanishes ($\mathrm{d}u/\mathrm{d}t = u_t + u\,u_x = 0$), so $u$—and therefore the trajectory's slope—remains constant. Each point $\xi$ of the initial profile $u_0$ is carried along a straight <dfn data-term="characteristic">characteristic</dfn>:</p>
<div class="eq" id="eq-burgers-char">$$x = \xi + t\,u_0(\xi), \qquad u\bigl(\xi + t\,u_0(\xi),\ t\bigr) = u_0(\xi).$$<span class="eq-tag">(8.2)</span></div>
<p>Where $u_0$ increases from left to right, faster fluid is in front and the lines fan apart. Where $u_0$ decreases, faster fluid is behind and the lines converge. Two neighbouring lines starting $\mathrm{d}\xi$ apart are $\left(1 + t\,u_0'(\xi)\right)\mathrm{d}\xi$ apart at time $t$, so they meet when $1 + t\,u_0' = 0$. The first meeting happens at the <em>breaking time</em></p>
<div class="eq" id="eq-breaking">$$t_b = -\frac{1}{\min_\xi u_0'(\xi)}.$$<span class="eq-tag">(8.3)</span></div>
<p>For $u_0 = A\sin 2\pi x$ the steepest descent is $-2\pi A$, at $x = 1/2$, so $t_b = 1/(2\pi A)$: 0.159 for $A = 1$. Until then the slope at $x = 1/2$ is $-2\pi A/(1 - 2\pi A t)$, which runs off to $-\infty$ as $t \to t_b$.</p>

<figure data-widget="shocks-breaking" data-preset="after" class="wide"><figcaption>Left: characteristics (8.2) of the sine wave $u_0 = A\sin 2\pi x$ on a periodic interval, with the breaking time $t_b$ dashed and the current time as a solid line. Right: at that time, the curve traced by the characteristics (dotted), the exact entropy solution (dashed) and a finite-volume scheme run on the conservation form.</figcaption></figure>
<div class="try"><ol>
<li>Drag <b>Time t</b> from 0 to 0.15. The profile steepens at $x = 1/2$ and the readout <b>steepest slope</b> grows without bound as $t$ approaches $t_b = 0.159$.</li>
<li>Go past $t_b$ with <b>let them cross</b>. The dotted curve folds over, assigning three values of $u$ to a single $x$ where (8.2) ceases to define a single-valued velocity field.</li>
<li>Switch to <b>stop at the shock</b>. Every characteristic near $x = 1/2$ now terminates on the thick vertical shock line. The exact solution (dashed) is a jump, and the scheme follows it.</li>
<li>Watch <b>energy ∫u²/2 exact</b>. It stays at 0.25 until $t_b$, then falls (0.176 at $t = 0.3$). Compare MUSCL and Godunov at $n = 200$: MUSCL matches the exact 0.17616 to five digits, Godunov gives 0.17551.</li>
</ol></div>

<p>Continuing the solution past $t_b$ requires returning to the integral conservation law of <a href="#/conservation/control-volumes">chapter 3</a>, which holds on any control interval $[x_1, x_2]$:</p>
<div class="eq" id="eq-integral">$$\frac{\mathrm{d}}{\mathrm{d}t}\int_{x_1}^{x_2} u\,\mathrm{d}x = f\bigl(u(x_1, t)\bigr) - f\bigl(u(x_2, t)\bigr).$$<span class="eq-tag">(8.4)</span></div>
<p>Because (8.4) contains no derivatives of $u$, it remains well-defined when $u$ has discontinuities. A function that satisfies (8.4) on every interval without necessarily being differentiable is a <dfn data-term="weak-solution">weak solution</dfn>, and its discontinuities are <dfn data-term="shock">shocks</dfn>. In the figure, conservation of $\int u\,\mathrm{d}x$ replaces the overturned fold with a vertical jump at $x = 1/2$ that cuts off equal areas from the two lobes.</p>
<p>Although a shock conserves $\int u\,\mathrm{d}x$, it dissipates mechanical energy. Multiplying (8.1) by $u$ shows that smooth solutions also satisfy $(u^2/2)_t + (u^3/3)_x = 0$ and conserve $\int (u^2/2)\,\mathrm{d}x$, whereas across a shock of jump $[u] = u_L - u_R$ this energy decays at the rate $[u]^3/12$. In a physical gas, viscosity and heat conduction spread the transition over a thin layer of width proportional to $\nu/[u]$ in the viscous Burgers equation $u_t + u u_x = \nu u_{xx}$, converting mechanical energy into heat. As $\nu \to 0$, the layer thickness shrinks to zero while the rate of energy dissipation remains finite, and the inviscid weak solution records the net jump across the layer without resolving its internal structure.</p>

<details class="deeper"><summary>Go deeper: weak solutions with test functions</summary>
<p>The interval form (8.4) is one way to define a weak solution. The standard way multiplies the conservation law by a smooth test function $\varphi(x, t)$ that vanishes outside a bounded region and integrates by parts, moving every derivative onto $\varphi$:</p>
$$\int_0^\infty\!\!\int_{-\infty}^{\infty} \left(u\,\varphi_t + f(u)\,\varphi_x\right)\mathrm{d}x\,\mathrm{d}t + \int_{-\infty}^{\infty} u_0(x)\,\varphi(x, 0)\,\mathrm{d}x = 0 .$$
<p>If $u$ is smooth this is equivalent to (8.1). If $u$ is only bounded, it still makes sense, and choosing $\varphi$ close to the indicator of a box $[x_1, x_2] \times [t_1, t_2]$ gives back (8.4). Lax's 1954 paper built the theory of computing shocks on this definition.</p></details>

<aside class="who" data-person="harry-bateman">In a 1915 survey for the <i>Monthly Weather Review</i>, Bateman wrote down the viscous equation $u_t + u u_x = \nu u_{xx}$ now named after Burgers, 24 years before Burgers's 1939 paper.</aside>
<aside class="who" data-person="jan-burgers">Burgers studied $u_t + u u_x = \nu u_{xx}$ from 1939 as a "mathematical model" of turbulence, with a fuller account in 1948. Hopf (1950) and Cole (1951) showed independently that the substitution $u = -2\nu(\ln\phi)_x$ reduces it to the linear heat equation, ruling out chaotic turbulence while providing an exact testbed for shock formation and dissipation. Because the surname is Burgers, the possessive is written Burgers' equation.</aside>
<aside class="history" data-era="1848">Stokes was the first to propose that a smooth sound wave must turn into a jump (<i>Philosophical Magazine</i>, 1848). He kept mass and momentum across his "surface of discontinuity", with pressure proportional to density. In his collected papers of 1883 he withdrew it: "It was however pointed out to me by Sir William Thomson, and afterwards independently by Lord Rayleigh, that the discontinuous motion supposed above involves a violation of the principle of the conservation of energy." His pressure law had nowhere to put the energy a shock dissipates. Which quantities a jump conserves is a physical choice, and the next section shows that it fixes the speed.</aside>

<h2 id="rankine-hugoniot">The speed of a shock</h2>
<p>A shock is a moving wall between two states. Whatever flows into it from one side must come out of the other, or pile up inside, and a wall of zero thickness has no room to store anything. That single observation fixes how fast it moves.</p>
<p>Placing a short control interval $[x_1, x_2]$ around a shock at $x_s(t)$, with $u = u_L$ immediately to its left and $u = u_R$ to its right, relates the shock speed $s = \mathrm{d}x_s/\mathrm{d}t$ to the fluxes. As the shock moves right, a strip of width $s\,\mathrm{d}t$ changes from $u_R$ to $u_L$, so the integral in (8.4) changes at the rate $s\,(u_L - u_R)$. By (8.4) that must equal the net inflow $f(u_L) - f(u_R)$. Hence</p>
<div class="eq" id="eq-rh">$$s\,\bigl(u_L - u_R\bigr) = f(u_L) - f(u_R), \qquad\text{for Burgers}\qquad s = \frac{u_L + u_R}{2}.$$<span class="eq-tag">(8.5)</span></div>
<p>This is the <dfn data-term="rankine-hugoniot">Rankine–Hugoniot condition</dfn>: jump in the conserved quantity times speed equals jump in the flux. For the <dfn data-term="euler-equations">Euler equations</dfn> there is one such condition for each conserved quantity, mass, momentum and energy, and together they give the shock speed and the state behind a shock from the state in front.</p>
<p>The shock speed depends on which conservation law is integrated across the jump. Multiplying (8.1) by $u$ produces a second conservation law, $(u^2/2)_t + (u^3/3)_x = 0$, that has identical smooth solutions, yet applying (8.5) to this equation yields a different shock speed:</p>
<div class="eq" id="eq-rh-wrong">$$s' = \frac{u_L^3/3 - u_R^3/3}{u_L^2/2 - u_R^2/2} = \frac23\,\frac{u_L^2 + u_L u_R + u_R^2}{u_L + u_R}.$$<span class="eq-tag">(8.6)</span></div>
<p>For $u_L = 1$ and $u_R = 0$, (8.6) gives $s' = 2/3$ instead of $s = 1/2$. Two PDEs that are equivalent for smooth profiles thus predict different shock speeds, because the jump condition is determined by which physical quantity is conserved across the discontinuity—mass, momentum, and total energy for a gas (<a href="#/conservation/control-volumes">chapter 3</a>), or $u$ itself in Burgers' model.</p>
<p>A numerical scheme makes the same choice, whether its author meant to or not. A <dfn data-term="finite-volume">finite-volume</dfn> scheme in conservation form,</p>
<div class="eq" id="eq-fv">$$u_j^{n+1} = u_j^n - \frac{\Delta t}{\Delta x}\left(F_{j+1/2} - F_{j-1/2}\right),$$<span class="eq-tag">(8.7)</span></div>
<p>passes each face flux from one cell to its neighbour, so the sum $\sum_j u_j \Delta x$ changes only through the boundaries. That is (8.4) on the grid. A scheme for the left form of (8.1), such as upwind differencing of $u\,u_x$, has no face fluxes, and nothing makes it conserve $u$ across a jump.</p>

<figure data-widget="shocks-speed" data-preset="half" class="wide"><figcaption>A step from $u_L$ to $u_R$ starting at $x = 0.25$, run twice: by a conservative scheme (8.7), and by upwind differences of $u\,u_x$ (non-conservative). Top: the profiles beside the exact shock. Bottom: shock position against time, with the Rankine–Hugoniot line. The <b>mass budget error</b> readouts compare $\int u\,\mathrm{d}x$ with its exact value, which changes only through the ends.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Jump to t = 0.5</b> with $u_L = 1$, $u_R = 0.5$ and $n = 200$. The exact shock is at 0.625. The conservative shock is within a cell of it; the non-conservative one is at 0.587, 7.6 cells behind, and its mass budget is short by 0.02.</li>
<li>Refine to $n = 800$. The non-conservative shock is now 28.6 cells behind, at 0.589. In physical units the position error does not shrink, because grid refinement converges to a shock moving at the wrong speed.</li>
<li>Set $u_R = 0$. The non-conservative shock remains stationary because its update $u_i(u_i - u_{i-1})$ vanishes wherever $u_i = 0$.</li>
<li>Raise $u_R$ above $u_L$. Now there is no shock, only a fan, and both schemes agree with the exact solution.</li>
</ol></div>
<aside class="pitfall">Whereas the conservation error of a non-conservative scheme on a smooth flow shrinks as the grid is refined (<a href="#/conservation/finite-volume">chapter 3</a>), at a shock it persists in the limit $\Delta x \to 0$, causing the scheme to converge to a discontinuity with the wrong speed. See "Wrong shock speed" in the <a href="#/pathologies">rogues' gallery</a>.</aside>

<p>Conversely, Lax and Wendroff proved in 1960 that if a consistent scheme in conservation form converges under grid refinement, its limit is a weak solution whose shocks automatically satisfy (8.5). Because weak solutions are not unique, however, the Lax–Wendroff theorem does not guarantee that a conservative scheme selects the physically admissible shock.</p>
<details class="deeper"><summary>Go deeper: why conservation form gives the right jump</summary>
<p>Multiply (8.7) by $\varphi(x_j, t^n)\Delta x$ for a smooth test function $\varphi$ and sum over $j$ and $n$. Summation by parts moves the differences onto $\varphi$, exactly as integration by parts does in the weak form:</p>
$$\sum_n\sum_j \left[u_j^{n+1}\,\frac{\varphi_j^{n+1} - \varphi_j^n}{\Delta t} + F_{j+1/2}\,\frac{\varphi_{j+1}^n - \varphi_j^n}{\Delta x}\right]\Delta x\,\Delta t + \sum_j u_j^0\varphi_j^0\,\Delta x = 0 .$$
<p>If $u_j^n$ stays bounded and converges in $L^1$ on bounded sets, and the flux is consistent, $F(u, u) = f(u)$, each sum converges to the corresponding integral of the weak form. Nothing in the argument needs $u$ to be smooth, which is why it works at shocks. A non-conservative scheme leaves terms that do not telescope, and they converge to something that depends on the inside of the numerical shock profile.</p></details>
<aside class="who" data-person="william-john-macquorn-rankine">Rankine's paper was read to the Royal Society on 16 December 1869 and printed in 1870. He wrote the mass and momentum balance across a "wave of sudden disturbance" and argued that such a wave needs heat conduction inside it, so it cannot be adiabatic throughout.</aside>
<aside class="who" data-person="pierre-henri-hugoniot">Hugoniot derived the jump conditions from conservation of mass, momentum and energy independently of Rankine, in a memoir printed in 1887 and 1889. He died in February 1887, aged 35, so the second part appeared after his death. The joint name covers two separate arguments made seventeen years apart.</aside>

<h2 id="entropy">Too many solutions: the entropy condition</h2>
<p>When Burgers' equation starts from an upward step, with $u = u_L$ on the left and $u = u_R &gt; u_L$ on the right, the faster fluid lies ahead of the slower fluid and pulls away from it. The characteristics fan out from the initial discontinuity at every speed between $u_L$ and $u_R$, filling the gap with a continuous linear ramp called a <dfn data-term="rarefaction">rarefaction</dfn> fan:</p>
<div class="eq" id="eq-fan">$$u(x, t) = \begin{cases} u_L & x &lt; u_L t \\ x/t & u_L t \le x \le u_R t \\ u_R & x &gt; u_R t. \end{cases}$$<span class="eq-tag">(8.8)</span></div>
<p>Yet the upward step itself, propagating intact at the Rankine–Hugoniot speed $(u_L + u_R)/2$, also satisfies the integral conservation law (8.4), as do infinitely many combinations of sub-jumps and fans. Selecting the unique physical weak solution requires an additional constraint beyond conservation.</p>
<p>For Burgers' equation, three equivalent criteria single out this physical weak solution. First, in the vanishing-viscosity limit $\nu \to 0$ of $u_t + u u_x = \nu u_{xx}$, viscosity always smooths an upward step into the rarefaction fan (8.8) rather than a persistent jump. Second, Lax's geometric <dfn data-term="entropy-condition">entropy condition</dfn> requires characteristics to enter a shock from both sides rather than emerge from it:</p>
<div class="eq" id="eq-lax-entropy">$$f'(u_L) &gt; s &gt; f'(u_R), \qquad\text{for Burgers}\qquad u_L &gt; u_R.$$<span class="eq-tag">(8.9)</span></div>
<p>Third, the energy inequality $(u^2/2)_t + (u^3/3)_x \le 0$ must hold in the weak sense: whereas a compressive shock ($u_L &gt; u_R$) dissipates mechanical energy at the rate $[u]^3/12$, an upward jump ($u_L &lt; u_R$) would generate energy at the same rate. Such an unphysical upward jump is called an <em>expansion shock</em>. The name "entropy condition" comes from gas dynamics, where the second law of thermodynamics requires specific entropy to increase across a shock, permitting only compressive jumps.</p>
<p>Because the Lax–Wendroff theorem guarantees only that a conservative scheme converges to a weak solution, a conservative solver that does not enforce (8.9) can lock onto an expansion shock. A classic example is Roe's approximate Riemann solver, which linearises the jump at each cell face around a single average wave speed—$\hat a = (u_L + u_R)/2$ for Burgers' equation—and applies upwind differencing at that speed:</p>
<div class="eq" id="eq-roe">$$F^{\text{Roe}}_{j+1/2} = \tfrac12\left(f(u_j) + f(u_{j+1})\right) - \tfrac12\,|\hat a_{j+1/2}|\,\left(u_{j+1} - u_j\right).$$<span class="eq-tag">(8.10)</span></div>
<p>This is exact for a shock. Now take $u_L = -1$, $u_R = 1$. The fan should open around the <em>sonic point</em>, where the wave speed $f'(u) = u$ passes through zero. But $\hat a = 0$, so the dissipation term vanishes and $F = \tfrac12(\tfrac12 + \tfrac12) = \tfrac12$, which equals $f(u_L)$ and $f(u_R)$. Every cell sees zero net flux and nothing moves. The jump stays put forever, satisfying (8.5) with $s = 0$ and violating (8.9).</p>

<figure data-widget="shocks-entropy" data-preset="roe" class="wide"><figcaption>Burgers' equation from $u_L$ to $u_R = 1$ on $[-1, 1]$, jump at $x = 0$. The exact solution is the fan (8.8). Readouts: the largest jump between neighbouring cells (a fan spreads it; an expansion shock keeps it), the $L^1$ error, and the energy against the exact energy, which leaves only through the open ends.</figcaption></figure>
<div class="try"><ol>
<li>Run plain Roe with $u_L = -1$ and $n = 200$. At $t = 0.5$ the jump between cells is still 2.000 and the energy is 1.0000, against 0.6667 exactly: the expansion shock is supplying the energy that flows out through the ends.</li>
<li>Switch to <b>Roe + entropy fix</b>. The fan opens; the largest jump is 0.072 and the $L^1$ error 0.0199. <b>Godunov</b> gives the same numbers, and <b>Rusanov</b> opens it too.</li>
<li>Back on plain Roe, choose <b>101 (odd)</b> cells. The fan opens (largest jump 0.067) because the central cell straddles $x = 0$ and starts with cell average $u = 0$, avoiding a sonic face jump; shifting the discontinuity to a cell face restores the expansion shock.</li>
<li>Set $u_L = -0.5$ on 200 cells. Roe keeps a jump of 1.0, from $-0.5$ to $0.5$, and opens the rest. Set $u_L \ge 0$: no sonic point, and every flux opens the fan.</li>
</ol></div>
<p>The fix is to put back some dissipation where Roe's average speed is near zero inside an expansion. Harten's entropy fix replaces $|\hat a|$ in (8.10) by a smoothed version that never falls below a width $\delta$; the kernel takes $\delta$ from the difference between the two characteristic speeds, so the fix only ever touches expansions. Godunov's own flux needs no fix at all, because it uses the exact entropy solution at each face.</p>
<details class="deeper"><summary>Go deeper: the fluxes in the figure, written out</summary>
<p>For a convex flux the exact (Godunov) flux at a face is the flux of the entropy solution of the face's Riemann problem at $x/t = 0$. For Burgers' equation that works out as</p>
$$F^{\text{God}}(u_L, u_R) = \begin{cases} \min_{u_L \le u \le u_R} f(u) & u_L \le u_R, \\ \max_{u_R \le u \le u_L} f(u) & u_L &gt; u_R. \end{cases}$$
<p>At a transonic expansion, $u_L &lt; 0 &lt; u_R$, the minimum is $f(0) = 0$, the flux at the sonic point. Roe's flux (8.10) gives $\tfrac12$ there. Rusanov's flux replaces $|\hat a|$ by the largest speed in sight, $\max(|u_L|, |u_R|)$: always enough dissipation, and more than needed. Harten's fix uses $Q(\hat a) = |\hat a|$ for $|\hat a| \ge \delta$ and $Q(\hat a) = (\hat a^2 + \delta^2)/(2\delta)$ below it, with $\delta = \max\left(0,\ \hat a - u_L,\ u_R - \hat a\right)$ (Harten and Hyman 1983), which is zero at a shock.</p></details>
<p>The same defect appears in gas dynamics. In the shock-tube lab below, Sod's problem with the left gas pushed to $u_L = 0.75$ has a left rarefaction that straddles the sonic point $u - a = 0$. Roe's solver without a fix leaves a density jump of about 0.19 inside the fan at $n = 100$, and 0.187 at $n = 200$ and $400$: refining does not remove it. With the fix the jump falls with the cell size, 0.047, 0.025, 0.013.</p>
<figure data-widget="shocks-sod" data-preset="sonic" class="wide"><figcaption>The shock-tube lab on Sod's problem with a sonic rarefaction ($u_L = 0.75$, $n = 100$). <b>Compare</b> switches between Roe without and with the Harten–Hyman entropy fix. Watch the readout <b>largest ρ jump inside the left fan</b>.</figcaption></figure>
<aside class="who" data-person="philip-roe">Roe's 1981 paper made Godunov-type upwind schemes cheap by solving a linearised Riemann problem exactly instead of the nonlinear one. The basic solver enforces no entropy condition, so practical codes add a fix. "I believe we must build upon simplicity; the human mind has no other option," he wrote in 1998.</aside>
<aside class="history" data-era="1870">Rankine's note of 1 August 1870 already ruled out the expansion shock, before any entropy argument: "Sir William Thomson has pointed out to the author, that a wave of sudden rarefaction, though mathematically possible, is an unstable condition of motion; any deviation from absolute suddenness tending to make the disturbance become more and more gradual. Hence the only wave of sudden disturbance whose permanency of type is physically possible, is one of sudden compression". The argument is about stability. A smeared expansion spreads further, which is what the fan does.</aside>

<h2 id="riemann">The Riemann problem and Godunov's method</h2>
<p>Every example so far started from two constant states meeting at a jump. That initial-value problem is the <dfn data-term="riemann-problem">Riemann problem</dfn>, and it turns out to be the building block of a whole family of schemes. For Burgers' equation its solution is a single wave: a shock if $u_L &gt; u_R$, a fan if $u_L &lt; u_R$. It depends only on $x/t$, because the data have no length scale.</p>
<p>For a gas the problem is the shock tube: a diaphragm separates two gases at rest or moving, at different pressures and densities, and is removed at $t = 0$. The gas obeys the one-dimensional Euler equations, three conservation laws for mass, momentum and total energy:</p>
<div class="eq" id="eq-euler1d">$$\frac{\partial}{\partial t}\begin{pmatrix} \rho \\ \rho u \\ E \end{pmatrix} + \frac{\partial}{\partial x}\begin{pmatrix} \rho u \\ \rho u^2 + p \\ u\,(E + p) \end{pmatrix} = 0, \qquad p = (\gamma - 1)\left(E - \tfrac12\rho u^2\right),$$<span class="eq-tag">(8.11)</span></div>
<p>with $\gamma = 1.4$ for air. Small disturbances travel at three speeds, $u - a$, $u$ and $u + a$, where $a = \sqrt{\gamma p/\rho}$ is the speed of sound. So the solution has three waves. The outer two are sound waves turned nonlinear, each either a shock or a rarefaction. The middle one moves with the gas as a <dfn data-term="contact-discontinuity">contact discontinuity</dfn>, across which density (and temperature) jump while pressure and velocity do not. Between the outer waves lie two "star" states with a common pressure $p^*$ and velocity $u^*$.</p>
<p>Finding $p^*$ is a one-dimensional root-finding problem. For each side $K = L, R$, the wave connecting the outer state to pressure $p$ changes the velocity by an amount $f_K(p)$ that has a closed form: a shock branch from the Rankine–Hugoniot conditions if $p &gt; p_K$, and a rarefaction branch from the characteristic relations if $p \le p_K$. Velocity must be continuous across the contact, which gives one equation for one unknown:</p>
<div class="eq" id="eq-pstar">$$f(p) = f_L(p) + f_R(p) + u_R - u_L = 0, \qquad u^* = \tfrac12(u_L + u_R) + \tfrac12\bigl(f_R(p^*) - f_L(p^*)\bigr).$$<span class="eq-tag">(8.12)</span></div>
<p>The function $f$ increases monotonically and is concave, so Newton's method converges reliably from a sensible starting guess, and quickly from a good one.</p>

<figure data-widget="shocks-pstar" data-preset="test1" class="wide"><figcaption>The exact Riemann solver, one Newton step at a time (Toro's tests 1–5; test 1 is Sod's problem). Left: $f(p)$ on a logarithmic pressure axis, with each tangent followed down to $f = 0$. Right: the wave pattern of the converged solution in the $x$–$t$ plane.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>One step</b> repeatedly on test 1. The residual falls from $6.5\times10^{-2}$ to $1.0\times10^{-3}$, $2.5\times10^{-7}$ and $1.4\times10^{-14}$, so the number of correct digits roughly doubles at each Newton step, converging to $p^* = 0.30313$.</li>
<li>Choose test 2, the 123 problem, and the <b>PV</b> guess. The guess is negative and is floored to a tiny positive pressure, and Newton needs 10 steps. The two-rarefaction guess (TR) is exact when both waves are rarefactions, as here, and needs 1.</li>
<li>Try tests 3 to 5: pressure ratios up to $10^5$, and two colliding shocks. <b>Newton steps by guess</b> shows that no single guess wins everywhere, which is why the adaptive rule switches between them.</li>
</ol></div>

<p>Godunov (1959) used these exact Riemann solutions directly as a numerical scheme. Interpreting the cell averages $u_j^n$ as a piecewise-constant profile defines a local Riemann problem at every cell interface between $u_j^n$ and $u_{j+1}^n$. Evaluating the exact Riemann solution along the interface ray $x/t = 0$ gives the face flux for the finite-volume update (8.7):</p>
<div class="eq" id="eq-godunov">$$F_{j+1/2} = f\!\left(u^{\text{RP}}\!\left(0;\ u_j^n,\ u_{j+1}^n\right)\right).$$<span class="eq-tag">(8.13)</span></div>
<p>As long as waves from neighbouring faces do not reach each other's face within a step (a CFL condition), this is the exact evolution of the piecewise-constant data, followed by averaging. That is <dfn data-term="godunov-method">Godunov's method</dfn>. It is conservative, it is upwind for every wave family at once, and it picks the entropy solution at every face. For linear advection it reduces to the <a href="#/advection/upwind">upwind scheme</a> of chapter 7.</p>
<p>Because solving the exact Riemann problem requires a nonlinear root-finding loop at every face and time step, most practical codes replace it with an <dfn data-term="approximate-riemann-solver">approximate Riemann solver</dfn> based on a simplified wave structure. Roe's solver (1981) solves a linearised three-wave system exactly and resolves all three wave families sharply. HLL (Harten, Lax and van Leer 1983) retains only the two outer acoustic waves with a single averaged state between them, smearing the contact discontinuity, while HLLC (Toro, Spruce and Speares 1994) restores the middle contact wave, and Rusanov's flux bounds all waves with a single maximum speed. The shock-tube lab below compares all five.</p>
<aside class="who" data-person="bernhard-riemann">Riemann's paper on plane sound waves of finite amplitude (notice 1859, paper 1860) worked out what happens from an arbitrary initial jump. He presented it as mathematics: "Diese Untersuchung macht nicht darauf Anspruch, der experimentellen Forschung nützliche Ergebnisse zu liefern; der Verfasser wünscht sie nur als einen Beitrag zur Theorie der nicht linearen partiellen Differentialgleichungen betrachtet zu sehen." (It claims no results useful to experiment, only a contribution to the theory of nonlinear partial differential equations.) He took pressure to depend on density alone, so his jump conditions conserve mass and momentum but not energy. "Riemann problem" is a later label.</aside>
<aside class="who" data-person="sergei-godunov">Godunov devised the scheme in 1953–54, when Keldysh and Gelfand asked him for a variant of the von Neumann–Richtmyer method for the institute's new Strela computer. He defended it as a thesis on 4 November 1954; it was published in 1959 in <i>Matematicheskii Sbornik</i>, after two journals had rejected it. He read Lax's 1954 paper only after his defence, and later said: "If I had received this paper one year earlier, the "Godunov's scheme" would never have been constructed."</aside>
<aside class="history" data-era="1944">Before Godunov, shocks were captured by adding viscosity on purpose. Rudolf Peierls suggested an artificially large viscosity to von Neumann in a letter of 28 March 1944. Richtmyer worked it out in a Los Alamos report of March 1948, writing: "It was pointed out by von Neumann that what is clearly needed is to take into account in the equations the dissipative mechanisms that operate in a physical shock to convert mechanical energy irreversibly into heat." The joint von Neumann–Richtmyer paper appeared in 1950. Artificial viscosity is still in use, for example in the <a href="#/lattice-particles/sph">particle methods</a> of chapter 13.</aside>

<h2 id="sod">The shock tube</h2>
<p>Sod's 1978 survey compared the shock-capturing schemes of the day on a shock-tube problem, and it is still the usual first test of a new scheme. A tube on $[0, 1]$ holds gas at rest with $\rho = 1$, $p = 1$ on the left of a diaphragm at $x = 0.5$, and $\rho = 0.125$, $p = 0.1$ on the right. When the diaphragm is removed at $t = 0$, the exact solution at $t = 0.25$ develops all three wave types:</p>
<ul>
<li>a rarefaction moving left into the high-pressure gas, its head at speed $-1.183$ and its tail at $-0.070$, inside which density and pressure fall smoothly;</li>
<li>a contact at speed $u^* = 0.927$, where density drops from 0.426 to 0.266 while $p^* = 0.303$ and $u^*$ carry straight across;</li>
<li>a shock at speed 1.752 running into the low-pressure gas.</li>
</ul>
<p>The shock and the contact discontinuity behave very differently on a grid because of their characteristic geometry. At a shock, characteristics converge from both sides as required by (8.9), steepening the profile to balance numerical diffusion and holding the captured shock to a fixed width of a few cells. At a contact discontinuity, the characteristics on both sides run parallel to the interface at speed $u^*$; with no compressive steepening to counteract numerical diffusion, the contact spreads continuously like the linear square wave of <a href="#/advection/diffusion-dispersion">chapter 7</a>.</p>

<figure data-widget="shocks-sod" data-preset="sod" class="wide"><figcaption>The shock-tube lab on Sod's problem ($n = 200$, HLLC, first order). Density, velocity and pressure, each beside the exact solution. Readouts: the exact $p^*$ and its Newton steps, the $L^1$ density error, the total variation of density against the exact one (above 1 means new wiggles), and the minimum density and pressure.</figcaption></figure>
<div class="try"><ol>
<li>Run HLLC to $t = 0.25$. Between 5% and 95% of each jump, the shock spans 3 cells and the contact 20. The $L^1$ density error is 0.0103 and the TV ratio 1.000: no wiggles.</li>
<li>Cycle through the fluxes at first order. The error rises from Godunov (0.0098), Roe (0.0100) and HLLC (0.0103) through HLL (0.0111) and Rusanov (0.0170) to Lax–Friedrichs (0.0231). Most of the difference is at the contact.</li>
<li>Switch <b>Order</b> to 2 (MUSCL–Hancock) with the MC limiter: $L^1$ falls to 0.0021. Try the other limiters: minmod 0.0035, van Leer 0.0024, superbee 0.0014.</li>
<li>Pick <b>Lax–Wendroff</b>. Its $L^1$ error, 0.0061, beats every first-order flux, but the TV ratio jumps to 1.64. Hold that thought for the next section.</li>
</ol></div>
<p>The table below compares the first-order $L^1$ density errors at $n = 200$. Because the diffusive spreading of the contact discontinuity ($O(\Delta x^{1/2})$ in $L^1$) dominates the global error, the measured $L^1$ convergence rate between $n = 100$ and $800$ is only 0.55–0.67 rather than 1.0.</p>
<div class="table-wrap"><table>
<thead><tr><th>Flux (first order, $n = 200$)</th><th>Waves it resolves</th><th class="num">$L^1$ error in $\rho$</th></tr></thead>
<tbody>
<tr><td>Lax–Friedrichs</td><td>none: central average plus maximal dissipation</td><td class="num">0.0231</td></tr>
<tr><td>Rusanov</td><td>one speed, the largest</td><td class="num">0.0170</td></tr>
<tr><td>HLL</td><td>two outer waves</td><td class="num">0.0111</td></tr>
<tr><td>HLLC</td><td>outer waves and contact</td><td class="num">0.0103</td></tr>
<tr><td>Roe</td><td>all three, linearised</td><td class="num">0.0100</td></tr>
<tr><td>Godunov (exact)</td><td>all three, exactly</td><td class="num">0.0098</td></tr>
</tbody></table></div>

<figure data-widget="shocks-sod" data-preset="contact" class="wide"><figcaption>An isolated contact at rest ($\rho = 1.4$ against $1$, equal pressure, $n = 100$, run to $t = 2$). The exact solution never changes. <b>Compare</b> switches between Rusanov and HLLC.</figcaption></figure>
<div class="try"><ol>
<li>Run Rusanov to $t = 2$. The jump spreads over many cells; the $L^1$ density error is 0.047.</li>
<li>Switch to HLLC. The contact remains completely sharp with zero error because HLLC's three-wave model includes the contact wave and reproduces a stationary contact exactly, as do Roe and Godunov, whereas HLL and Lax–Friedrichs smear it.</li>
</ol></div>
<p>The second-order option in the lab uses the MUSCL–Hancock scheme from the final paper of van Leer's series. Rather than holding each cell constant, it reconstructs a linear profile in each cell whose slope is restricted by a <a href="#/shocks/limiters">limiter</a> to prevent new extrema, advances the two cell-edge values by half a time step using that slope, and then solves the interface Riemann problems between the evolved edge states—achieving second-order accuracy in smooth regions while reverting toward first order at discontinuities.</p>
<aside class="who" data-person="bram-van-leer">Van Leer did this work as an astronomer at the University Observatory in Leiden. His series "Towards the ultimate conservative difference scheme" ran in five parts, 1973–1979; Part V, the second-order sequel to Godunov's method, is the MUSCL paper. In 2011 he drew attention to V. P. Kolgan, who had published a limited second-order reconstruction in 1972. Calling MUSCL "the first TVD scheme" is anachronistic: the term TVD came in 1983.</aside>

<h2 id="godunov-theorem">Godunov's theorem</h2>
<p>On Sod's problem, Lax–Wendroff raises the total-variation ratio to 1.64 because linear second-order schemes oscillate at discontinuities (<a href="#/advection/higher-order">chapter 7</a>), whereas first-order schemes remain monotone at the cost of heavy smearing. In the same 1959 paper that introduced his upwind method, Godunov proved that no linear scheme can avoid both defects.</p>
<p>A scheme for $u_t + a u_x = 0$ is called <dfn data-term="monotone-scheme">monotone</dfn> if it preserves monotonicity ($u_j^n \ge u_{j+1}^n$ for all $j$ implies $u_j^{n+1} \ge u_{j+1}^{n+1}$), which prevents any new maxima or minima from forming. A linear scheme computes each updated value as a fixed weighted sum of old values,</p>
<div class="eq" id="eq-linear-scheme">$$u_j^{n+1} = \sum_k c_k\,u_{j+k}^n ,$$<span class="eq-tag">(8.14)</span></div>
<p>with weights $c_k$ that depend on $\nu = a\Delta t/\Delta x$ but not on the solution $u$. Such a linear update is monotone if and only if every weight satisfies $c_k \ge 0$: any negative weight produces an overshoot when applied to a step profile, whereas non-negative weights summing to 1 form a convex combination bounded by the existing values.</p>
<p><dfn data-term="godunov-theorem">Godunov's theorem</dfn> states that a linear monotone scheme for linear advection is at most first-order accurate. Because non-negative weights act like a probability distribution over grid points, averaging values from different locations introduces a non-zero variance—the second moment of the weights—unless all the weight sits on a single node, which occurs only when $\nu$ is an integer and the scheme shifts the grid by a whole number of cells.</p>
<details class="deeper"><summary>Go deeper: the proof in four lines</summary>
<p>A scheme is second-order accurate when it reproduces the exact solution $u(x - a\Delta t)$ for every quadratic $u$. Apply (8.14) to $u = 1$, $u = x$ and $u = x^2$ on the grid $x_j = j\Delta x$ and compare with the exact shifted values:</p>
$$\sum_k c_k = 1, \qquad \sum_k k\,c_k = -\nu, \qquad \sum_k k^2 c_k = \nu^2 .$$
<p>Combine the three:</p>
$$\sum_k c_k\,(k + \nu)^2 = \nu^2 - 2\nu^2 + \nu^2 = 0 .$$
<p>If every $c_k \ge 0$, every term of this sum is non-negative, so each must vanish: $c_k = 0$ unless $k = -\nu$. Then (8.14) is $u_j^{n+1} = u_{j-\nu}^n$, possible only for integer $\nu$. So for any other $\nu$ a monotone linear scheme cannot be second order. That proves the theorem.</p>
<p>Two other results are often confused with this one. Harten, Hyman and Lax (1976) showed that monotone schemes in the nonlinear sense (the update is a non-decreasing function of every old value) are at most first order too. And TVD schemes, below, are a strictly larger class than monotone ones; they reach second order except at extrema.</p></details>
<p>Because Godunov's theorem applies only to <em>linear</em> schemes with data-independent weights $c_k$, it also points to the remedy: if the weights adapt to the local solution, the scheme becomes nonlinear—even when applied to a linear PDE—and can use second-order weights in smooth regions while reverting to non-negative upwind weights at steep gradients. Every modern high-resolution shock-capturing scheme takes this nonlinear route.</p>

<figure data-widget="shocks-sod" data-preset="lw-ringing" class="wide"><figcaption>Sod's problem with a linear second-order scheme (Lax–Wendroff, in Richtmyer's two-step form) and a nonlinear one (MUSCL–Hancock with HLLC and the MC limiter), $n = 200$. Use <b>Compare</b>.</figcaption></figure>
<div class="try"><ol>
<li>Run Lax–Wendroff. Oscillations appear next to the shock and the contact, pushing the density TV ratio to 1.64 even though the $L^1$ error is 0.0061—showing why an integral error norm alone can fail to detect local oscillations.</li>
<li>Switch to MUSCL–Hancock. The wiggles are gone (TV ratio 1.01) and the error is 0.0021, smaller than Lax–Wendroff's.</li>
<li>Choose the blast-wave problem (pressure ratio $10^5$) with Lax–Wendroff. The ringing is so strong that the density goes negative and the run stops at step 12.</li>
</ol></div>
<aside class="pitfall">Ringing next to a shock is not noise to be filtered afterwards. In a gas it can drive density or pressure negative, as in the blast wave, and the run dies. See "Gibbs oscillations at shocks" in the <a href="#/pathologies">rogues' gallery</a>.</aside>
<aside class="note" data-label="Second-order Godunov schemes">The second-order schemes built on Godunov's method, such as MUSCL and PPM, are often called "Godunov schemes". Godunov himself disclaimed them: "I claim I cannot be considered as the author of them."</aside>

<h2 id="limiters">Flux limiters and TVD</h2>
<p>A limiter decides, face by face, how much of a high-order correction the local data can take. Near a jump it takes none and the scheme is upwind; where the data are smooth it takes all of it and the scheme is second order. To make "smooth" precise, compare the jump at a face with the jump one face upwind. For $a &gt; 0$,</p>
<div class="eq" id="eq-theta">$$\theta_{j+1/2} = \frac{u_j - u_{j-1}}{u_{j+1} - u_j}.$$<span class="eq-tag">(8.15)</span></div>
<p>On smooth data $\theta \approx 1$. At an extremum the two jumps have opposite signs and $\theta &lt; 0$. Near the edge of a jump $\theta$ is close to 0 or very large. The flux-limited scheme adds a fraction $\phi(\theta)$ of the Lax–Wendroff correction to the upwind flux:</p>
<div class="eq" id="eq-limited">$$F_{j+1/2} = a\,u_j + \tfrac12\,a\,(1 - \nu)\,\phi(\theta_{j+1/2})\,\left(u_{j+1} - u_j\right).$$<span class="eq-tag">(8.16)</span></div>
<p>With $\phi = 0$ this is upwind; with $\phi = 1$ it is Lax–Wendroff; with $\phi = \theta$ it is Beam–Warming. A <dfn data-term="flux-limiter">flux limiter</dfn> is a function $\phi(\theta)$ chosen to switch between them.</p>
<p>To rule out spurious oscillations, Harten (1983) measured the <em>total variation</em> $TV(u) = \sum_j |u_{j+1} - u_j|$, which is the sum of all jumps between adjacent cells and remains constant under exact linear advection. A scheme that satisfies $TV(u^{n+1}) \le TV(u^n)$ on every step is called <dfn data-term="tvd">total variation diminishing</dfn> (TVD) and cannot create new local extrema. Sweby (1984) showed that (8.16) is TVD for all $0 \le \nu \le 1$ whenever $\phi(\theta)$ satisfies</p>
<div class="eq" id="eq-sweby">$$0 \le \phi(\theta) \le \min(2\theta,\ 2) \quad (\theta &gt; 0), \qquad \phi(\theta) = 0 \quad (\theta \le 0).$$<span class="eq-tag">(8.17)</span></div>
<p>Drawn in the $(\theta, \phi)$ plane this is a region, and for second order a limiter should also pass through $\phi(1) = 1$ and stay between the lines $\phi = \theta$ and $\phi = 1$, which carves out the darker band between minmod (its lower edge) and superbee (its upper edge). Lax–Wendroff's $\phi = 1$ leaves the region at $\theta \le 0$ and below $\theta = 1/2$: exactly at extrema and at the foot of a jump, where it rings.</p>
<div class="table-wrap"><table>
<thead><tr><th>Limiter</th><th>$\phi(\theta)$</th><th>Character</th></tr></thead>
<tbody>
<tr><td>minmod</td><td>$\max\left(0, \min(1, \theta)\right)$</td><td>lower edge: most cautious, most smearing</td></tr>
<tr><td>van Leer</td><td>$(\theta + |\theta|)/(1 + |\theta|)$</td><td>smooth, in between</td></tr>
<tr><td>MC</td><td>$\max\left(0, \min\left(\tfrac{1+\theta}{2}, 2, 2\theta\right)\right)$</td><td>central slope unless it would make an extremum</td></tr>
<tr><td>superbee</td><td>$\max\left(0, \min(1, 2\theta), \min(2, \theta)\right)$</td><td>upper edge: sharpest jumps, squares off peaks</td></tr>
</tbody></table></div>

<figure data-widget="shocks-limiters" data-preset="lw" class="wide"><figcaption>Left: Sweby's diagram. The light band is the TVD region (8.17), the dark band its second-order part; the chosen limiter is bold, the others faint (dashed if not TVD). Each dot is one face of the current solution, at its $(\theta, \phi(\theta))$. Right: the profile after advection round the periodic domain ($n = 200$, $\nu = 0.5$), beside the exact solution.</figcaption></figure>
<div class="try"><ol>
<li>Run Lax–Wendroff ($\phi = 1$) for one period. The faces at the edges of the square wave sit outside the shaded region (46 of them at the end), the TV ratio is 1.95 and the overshoot 23%.</li>
<li>Choose MC. Every dot lies on the curve inside the region, the TV ratio is exactly 1.0000, there is no overshoot, and the $L^1$ error is 0.0169 against upwind's 0.0797.</li>
<li>Compare minmod (0.0314), van Leer (0.0204) and superbee (0.0088) on the square wave. Then pick the Gaussian: superbee's peak is flattened into a plateau, and its error (0.0033) is now four times MC's (0.0008).</li>
<li>Try Fromm, $\phi = (1 + \theta)/2$: second order, outside the region for $\theta &lt; 1/3$ and $\theta &gt; 3$ (TV ratio 1.23, overshoot 5%).</li>
<li>Set $\nu = 1$. The correction is multiplied by $1 - \nu = 0$ and every scheme shifts the data exactly.</li>
</ol></div>
<details class="deeper"><summary>Go deeper: why (8.17) is enough</summary>
<p>Harten's lemma: write a scheme as $u_j^{n+1} = u_j - C_{j-1/2}(u_j - u_{j-1}) + D_{j+1/2}(u_{j+1} - u_j)$. If $C_{j-1/2} \ge 0$, $D_{j+1/2} \ge 0$ and $C_{j+1/2} + D_{j+1/2} \le 1$ for every $j$, it is TVD. (Subtract neighbouring updates, take absolute values and sum; the conditions make every coefficient non-negative.) For (8.16), use $u_{j+1} - u_j = (u_j - u_{j-1})/\theta_{j+1/2}$ to put everything on the upwind jump:</p>
$$C_{j-1/2} = \nu\left[1 + \tfrac12(1 - \nu)\left(\frac{\phi(\theta_{j+1/2})}{\theta_{j+1/2}} - \phi(\theta_{j-1/2})\right)\right], \qquad D = 0 .$$
<p>If $0 \le \phi(\theta)/\theta \le 2$ and $0 \le \phi(\theta) \le 2$, the bracket lies between $\nu$ and $2 - \nu$, so $\nu^2 \le C \le \nu(2 - \nu) \le 1$ for $0 \le \nu \le 1$. Those two bounds are (8.17).</p></details>
<p>Because $\theta &lt; 0$ at any local extremum, every TVD limiter sets $\phi = 0$ at smooth peaks and troughs, locally reverting to first-order upwind and clipping smooth extrema: after one period, the unit Gaussian peak drops to 0.924 with minmod, 0.976 with MC, and 0.987 with superbee. Avoiding this peak clipping requires relaxing the strict TVD bound to allow tiny, high-order-controlled overshoots. ENO schemes (Harten, Engquist, Osher and Chakravarthy 1987) reconstruct each cell from the smoothest of several candidate stencils, while <dfn data-term="weno">WENO</dfn> schemes (Liu, Osher and Chan 1994; Jiang and Shu 1996) take a convex combination of all candidate stencils with nonlinear weights that vanish on stencils crossing a jump. Selecting WENO5 in the figure yields a TV ratio of 1.0018 (a 0.05% overshoot) on the square wave while preserving 0.998 of the Gaussian peak.</p>
<aside class="who" data-person="ami-harten">Harten's 1983 paper defined the total-variation property and called it "TVNI", total variation nonincreasing. The initials TVD appeared the same month in a NASA memorandum he wrote with Yee and Warming. "Diminishing" is loose: the definition allows the variation to stay the same.</aside>
<aside class="who" data-person="peter-sweby">Sweby's 1984 paper put the limiters of van Leer, Roe and others into one framework and derived the region (8.17). Strictly, his diagram shows sufficient bounds for his class of schemes. Neither "Sweby diagram" nor "superbee" is in the paper's abstract, which credits "a very compressive limiter due to Roe".</aside>
<aside class="history" data-era="1973">Nonlinear limiting was found several times. Boris and Book's flux-corrected transport (1973) takes a diffusive step, then adds back as much antidiffusive flux as possible without creating new extrema. Van Leer's Part II (1974) built monotonicity into a second-order scheme, and Kolgan (1972) limited reconstructed slopes. Claims of priority for any one of them need care.</aside>

<h2 id="failures">When good schemes go wrong</h2>
<p>Even a conservative, upwind, entropy-satisfying, TVD scheme can exhibit numerical artefacts on strong shocks and rarefactions that are easily mistaken for physical features.</p>
<p><strong>The slowly moving shock.</strong> A strong shock that crawls across the grid leaves a trail of long, low ripples in the smooth flow behind it, although the exact state there is constant. The cause is in the numerical shock's internal structure. A shock captured over two or three cells has a profile that depends on where it sits relative to the cell faces. As it moves slowly from one cell to the next, that profile changes periodically, and each change sheds a small wave downstream. A fast shock sheds them at a high frequency that the scheme's own diffusion damps; a slow one sheds long waves that survive. The more sharply a scheme resolves the shock, the worse this is.</p>
<figure data-widget="shocks-sod" data-preset="slow-shock" class="wide"><figcaption>A Mach 3 shock moving at speed 0.11 ($n = 200$, run to $t = 2.5$). The readout <b>momentum wiggle behind the shock</b> is the largest deviation of $\rho u$ from its exact value in a window behind the shock, as a fraction of the momentum jump. <b>Compare</b> switches between Roe and Rusanov.</figcaption></figure>
<div class="try"><ol>
<li>Run Roe. Momentum behind the shock wobbles by 13.9% of the jump. Godunov (13.6%) and HLLC (13.7%) are no better.</li>
<li>Switch to Rusanov. The wobble falls to 0.17%, but the $L^1$ density error rises from 0.0047 to 0.0289: the shock is smeared over many more cells.</li>
<li>Back on Roe, choose second order. The wobble grows to over 30%: a sharper shock sheds stronger waves.</li>
</ol></div>
<p><strong>Positivity loss.</strong> Density and pressure cannot be negative. Toro's "123 problem" pulls the gas apart from the middle with two strong rarefactions, leaving a near-vacuum with $p^* = 0.0019$. Roe's solver linearises around an average state, and for such strong expansions that linear state can contain a negative pressure. On the third step the centre cell's pressure becomes $-0.11$ and the run stops: the sound speed $\sqrt{\gamma p/\rho}$ no longer exists. The entropy fix does not help. HLL-type solvers whose outer wave speeds are bounds on the true ones keep density and pressure positive (Einfeldt, Munz, Roe and Sjögreen 1991).</p>
<figure data-widget="shocks-sod" data-preset="positivity" class="wide"><figcaption>The 123 problem ($n = 100$). <b>Compare</b> switches between Roe and HLLC. Watch <b>min ρ</b> and <b>min p</b>.</figcaption></figure>
<div class="try"><ol>
<li>Run Roe. It fails at step 3 in cell 49 ($x = 0.495$) with $\rho = 0.60$ and $p = -0.11$.</li>
<li>Switch to HLLC. It runs to the end with minimum pressure 0.0080 and minimum density 0.022, positive throughout, against the exact $p^* = 0.0019$.</li>
</ol></div>
<p><strong>The carbuncle.</strong> In two or more dimensions, when supersonic flow past a blunt body is computed on a grid aligned with the bow shock, the stagnation region of the shock can bulge upstream into a spurious protuberance known as the carbuncle. Reported in blunt-body calculations by Peery and Imlay (1988) and analysed alongside related odd–even grid decoupling by Quirk (1994), this instability primarily affects complete Riemann solvers—such as Godunov, Roe, and HLLC—that resolve contact and shear waves with minimal transverse dissipation, whereas two-wave solvers like HLL that smear shear waves suppress it. Production codes typically blend in a more dissipative flux like HLL or Rusanov in cells where a shock sensor detects a strong compressive jump.</p>
<aside class="who" data-person="james-quirk">Quirk's 1994 paper catalogued subtle failures of popular Godunov-type schemes. He did not discover the carbuncle; the usual first citation is Peery and Imlay's 1988 blunt-body paper.</aside>
<aside class="note" data-label="What carries forward">Shocks need conservation form, an entropy-satisfying flux and a nonlinear limiter, in that order. The incompressible solvers of chapters 10 to 12 never meet a shock, but their advection steps meet the same limiters, and their pressure solves are the other half of the Euler equations.</aside>

<div data-quiz="q1"></div>
<div data-quiz="q2"></div>
<div data-quiz="q3"></div>
<div data-quiz="q4"></div>
<div data-quiz="q5"></div>
<div data-quiz="q6"></div>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>H. Bateman, "Some recent researches on the motion of fluids", <i>Monthly Weather Review</i> 43(4) (1915) 163–170.</li>
<li>J. M. Burgers, "A mathematical model illustrating the theory of turbulence", <i>Advances in Applied Mechanics</i> 1 (1948) 171–199.</li>
<li>E. Hopf, "The partial differential equation $u_t + uu_x = \mu u_{xx}$", <i>Communications on Pure and Applied Mathematics</i> 3 (1950) 201–230. J. D. Cole, "On a quasi-linear parabolic equation occurring in aerodynamics", <i>Quarterly of Applied Mathematics</i> 9 (1951) 225–236.</li>
<li>G. G. Stokes, "On a difficulty in the theory of sound", <i>Philosophical Magazine</i> (3) 33 (1848) 349; with the note added in <i>Mathematical and Physical Papers</i> vol. 2 (Cambridge, 1883).</li>
<li>B. Riemann, "Ueber die Fortpflanzung ebener Luftwellen von endlicher Schwingungsweite", <i>Abhandlungen der Königlichen Gesellschaft der Wissenschaften zu Göttingen</i> 8 (1860); notice in <i>Göttinger Nachrichten</i> 1859, Nr. 19.</li>
<li>W. J. M. Rankine, "On the thermodynamic theory of waves of finite longitudinal disturbance", <i>Philosophical Transactions of the Royal Society</i> 160 (1870) 277–288 (read 16 December 1869).</li>
<li>H. Hugoniot, "Sur la propagation du mouvement dans les corps et spécialement dans les gaz parfaits", <i>Journal de l'École polytechnique</i>, cahier 57 (1887) and cahier 58 (1889).</li>
<li>J. von Neumann and R. D. Richtmyer, "A method for the numerical calculation of hydrodynamic shocks", <i>Journal of Applied Physics</i> 21(3) (1950) 232–237. N. R. Morgan and B. J. Archer, "On the origins of Lagrangian hydrodynamic methods", arXiv:2103.06249 (2021).</li>
<li>P. D. Lax, "Weak solutions of nonlinear hyperbolic equations and their numerical computation", <i>Communications on Pure and Applied Mathematics</i> 7(1) (1954) 159–193.</li>
<li>P. D. Lax and B. Wendroff, "Systems of conservation laws", <i>Communications on Pure and Applied Mathematics</i> 13(2) (1960) 217–237.</li>
<li>S. K. Godunov, "A difference method for numerical calculation of discontinuous solutions of the equations of hydrodynamics", <i>Matematicheskii Sbornik</i> 47(89) (1959) 271–306. S. K. Godunov, "Reminiscences about numerical schemes", arXiv:0810.0649 (2008).</li>
<li>A. Harten, J. M. Hyman and P. D. Lax, "On finite-difference approximations and entropy conditions for shocks", <i>Communications on Pure and Applied Mathematics</i> 29 (1976) 297–322.</li>
<li>J. P. Boris and D. L. Book, "Flux-corrected transport. I. SHASTA, a fluid transport algorithm that works", <i>Journal of Computational Physics</i> 11 (1973) 38–69.</li>
<li>B. van Leer, "Towards the ultimate conservative difference scheme. II. Monotonicity and conservation combined in a second-order scheme", <i>Journal of Computational Physics</i> 14(4) (1974) 361–370; "V. A second-order sequel to Godunov's method", 32(1) (1979) 101–136. B. van Leer, "A historical oversight: Vladimir P. Kolgan and his high-resolution scheme", <i>Journal of Computational Physics</i> 230 (2011) 2378–2383.</li>
<li>G. A. Sod, "A survey of several finite difference methods for systems of nonlinear hyperbolic conservation laws", <i>Journal of Computational Physics</i> 27 (1978) 1–31.</li>
<li>P. L. Roe, "Approximate Riemann solvers, parameter vectors, and difference schemes", <i>Journal of Computational Physics</i> 43(2) (1981) 357–372.</li>
<li>A. Harten, "High resolution schemes for hyperbolic conservation laws", <i>Journal of Computational Physics</i> 49(3) (1983) 357–393. H. C. Yee, R. F. Warming and A. Harten, "Implicit total variation diminishing (TVD) schemes for steady-state calculations", NASA TM-84342 (1983).</li>
<li>A. Harten, P. D. Lax and B. van Leer, "On upstream differencing and Godunov-type schemes for hyperbolic conservation laws", <i>SIAM Review</i> 25(1) (1983) 35–61. A. Harten and J. M. Hyman, "Self adjusting grid methods for one-dimensional hyperbolic conservation laws", <i>Journal of Computational Physics</i> 50 (1983) 235–269.</li>
<li>P. K. Sweby, "High resolution schemes using flux limiters for hyperbolic conservation laws", <i>SIAM Journal on Numerical Analysis</i> 21(5) (1984) 995–1011.</li>
<li>A. Harten, B. Engquist, S. Osher and S. R. Chakravarthy, "Uniformly high order accurate essentially non-oscillatory schemes, III", <i>Journal of Computational Physics</i> 71(2) (1987) 231–303.</li>
<li>B. Einfeldt, "On Godunov-type methods for gas dynamics", <i>SIAM Journal on Numerical Analysis</i> 25(2) (1988) 294–318. B. Einfeldt, C. D. Munz, P. L. Roe and B. Sjögreen, "On Godunov-type methods near low densities", <i>Journal of Computational Physics</i> 92 (1991) 273–295.</li>
<li>K. M. Peery and S. T. Imlay, "Blunt-body flow simulations", AIAA Paper 88-2904 (1988).</li>
<li>E. F. Toro, M. Spruce and W. Speares, "Restoration of the contact surface in the HLL-Riemann solver", <i>Shock Waves</i> 4(1) (1994) 25–34.</li>
<li>J. J. Quirk, "A contribution to the great Riemann solver debate", <i>International Journal for Numerical Methods in Fluids</i> 18(6) (1994) 555–574.</li>
<li>X.-D. Liu, S. Osher and T. Chan, "Weighted essentially non-oscillatory schemes", <i>Journal of Computational Physics</i> 115(1) (1994) 200–212. G.-S. Jiang and C.-W. Shu, "Efficient implementation of weighted ENO schemes", <i>Journal of Computational Physics</i> 126(1) (1996) 202–228.</li>
<li>R. J. LeVeque, <i>Finite Volume Methods for Hyperbolic Problems</i> (Cambridge University Press, 2002), chapters 6, 11 and 12.</li>
<li>E. F. Toro, <i>Riemann Solvers and Numerical Methods for Fluid Dynamics</i>, 3rd ed. (Springer, 2009), chapters 4, 6, 10, 11, 13 and 14.</li>
</ol>
`,
  widgets: {
    'shocks-breaking': mountBreaking,
    'shocks-speed': mountSpeed,
    'shocks-entropy': mountEntropy,
    'shocks-pstar': mountPstar,
    'shocks-sod': mountSod,
    'shocks-limiters': mountLimiters,
  },
  quizzes: {
    q1: {
      type: 'num',
      q: 'Burgers\' equation starts from $u_0 = 0.5\\sin 2\\pi x$. At what time does it first form a shock?',
      answer: 0.3183,
      tol: 0.02,
      explain: 'By (8.3), $t_b = -1/\\min u_0\' = 1/(2\\pi \\cdot 0.5) = 1/\\pi \\approx 0.318$. Halving the amplitude doubles the breaking time: a weaker wave needs longer for its fast parts to catch its slow ones. Any amplitude breaks eventually; only viscosity can stop it.',
    },
    q2: {
      type: 'mcq',
      q: 'A Burgers shock has $u_L = 2$ on its left and $u_R = 0$ on its right. How fast does it move?',
      choices: [
        '$1$',
        '$4/3$',
        '$2$, the speed of the fluid behind it',
        'It depends on the grid',
      ],
      answer: 0,
      explain: 'By the Rankine–Hugoniot condition for $f(u) = u^2/2$, $s = [f]/[u] = (2 - 0)/(2 - 0) = 1$, the average of the two states, whereas $4/3$ comes from conserving $u^2/2$ instead of $u$ in (8.6). A shock moves slower than the fluid behind it (so characteristics run into it) and faster than the fluid ahead. A conservative scheme puts the shock within a cell or so of the right place on any grid, whereas a non-conservative one converges to the wrong shock position.',
    },
    q3: {
      type: 'predict',
      q: 'Before you run the entropy figure: Roe\'s flux on Burgers\' equation, $u_L = -1$, $u_R = 1$, 200 cells. What happens to the jump at $x = 0$?',
      choices: [
        'It opens into a fan, a little smeared',
        'It stays exactly where it is',
        'It moves right at speed 1/2',
        'It grows wiggles and blows up',
      ],
      answer: 1,
      explain: 'Roe\'s average speed is $(u_L + u_R)/2 = 0$, so its dissipation vanishes and the flux is $\\tfrac12$ on both sides of every cell: nothing changes. The jump satisfies Rankine–Hugoniot with $s = 0$, which is why conservation alone cannot catch it. It violates the entropy condition, and it creates energy. An entropy fix or Godunov\'s flux opens the fan.',
    },
    q4: {
      type: 'mcq',
      q: 'Godunov\'s theorem forbids a second-order scheme for advection that never makes new extrema. Which of these escapes it?',
      choices: [
        'A linear scheme with a wider stencil, say five points',
        'A linear scheme run with a smaller time step',
        'A scheme whose weights depend on the solution, such as a flux limiter',
        'A higher-order Runge–Kutta time integrator with a centred space difference',
      ],
      answer: 2,
      explain: 'The theorem covers every linear scheme, whatever its stencil, time step or time integrator, because the proof requires only fixed non-negative weights and the three moment conditions for second order. A limiter makes the weights depend on the data, so the scheme is nonlinear (even for a linear equation) and the theorem does not apply, though TVD schemes still revert to first order at smooth extrema.',
    },
    q5: {
      type: 'mcq',
      q: 'In the Sod lab at first order, the contact is smeared over many more cells than the shock. Why?',
      choices: [
        'The contact is a smaller jump, so the scheme notices it less',
        'Characteristics converge into a shock and push numerical diffusion back; at a contact they run parallel, so nothing does',
        'The contact moves faster than the shock',
        'The density jump at the contact is not conserved',
      ],
      answer: 1,
      explain: 'A shock is self-sharpening: diffusion spreads it and the converging characteristics squeeze it, so it settles at a fixed width of a few cells. A contact moves with the gas, like the square wave of <a href="#/advection/diffusion-dispersion">chapter 7</a>, and its width grows for the whole run. That is why fluxes that resolve the contact (HLLC, Roe, Godunov) win on Sod\'s problem, and why a contact at rest stays exact with HLLC and spreads with Rusanov.',
    },
    q6: {
      type: 'mcq',
      q: 'Superbee gives the smallest error of the TVD limiters on the square wave. Carry a smooth Gaussian round the domain once ($n = 200$, $\\nu = 0.5$). Which TVD limiter now gives the smallest $L^1$ error?',
      choices: [
        'Superbee again: sharper is always better',
        'Minmod, because it is the most cautious',
        'MC',
        'They are all the same on smooth data, since all are second order',
      ],
      answer: 2,
      explain: 'Measured: MC 0.0008, van Leer 0.0016, superbee 0.0033, minmod 0.0049. Superbee runs along the top of the TVD region and steepens every slope it can, which squares off a smooth peak. Minmod clips the most. All TVD limiters switch to first order at the peak ($\\theta &lt; 0$), so they are not equal there, and the choice of limiter is a choice of which data you care about.',
    },
  },
  glossary: {
    'burgers-equation': {
      term: 'Burgers\' equation',
      def: 'The simplest nonlinear conservation law, $u_t + (u^2/2)_x = 0$ (inviscid) or $u_t + u u_x = \\nu u_{xx}$ (viscous). Each point of the profile moves at its own height, so compressions steepen into shocks in finite time. Written by Bateman in 1915 and studied by Burgers from 1939.',
      section: 'burgers',
    },
    shock: {
      term: 'shock',
      def: 'A jump in the solution of a conservation law that moves at the speed fixed by the Rankine–Hugoniot condition and that characteristics run into from both sides. In a real gas it is a layer a few mean free paths thick, across which mechanical energy turns into heat.',
      section: 'burgers',
    },
    'weak-solution': {
      term: 'weak solution',
      def: 'A function that satisfies a conservation law in integral form, $\\tfrac{\\mathrm{d}}{\\mathrm{d}t}\\int_{x_1}^{x_2} u\\,\\mathrm{d}x = f(u(x_1)) - f(u(x_2))$, or against every smooth test function, without needing derivatives. It may jump. Weak solutions are not unique; the entropy condition picks the physical one.',
      section: 'burgers',
    },
    'rankine-hugoniot': {
      term: 'Rankine–Hugoniot condition',
      def: 'The jump condition $s\\,[u] = [f(u)]$ for a discontinuity moving at speed $s$: jump in the conserved quantity times speed equals jump in the flux. One condition per conserved quantity. For Burgers, $s = (u_L + u_R)/2$.',
      section: 'rankine-hugoniot',
    },
    'entropy-condition': {
      term: 'entropy condition',
      def: 'The extra condition that selects the physical weak solution. In Lax\'s form, characteristics must enter a shock from both sides, $f\'(u_L) &gt; s &gt; f\'(u_R)$; equivalently, a convex entropy (for Burgers, $u^2/2$) may only be destroyed at a jump, never created. For a gas it is the second law.',
      section: 'entropy',
    },
    'riemann-problem': {
      term: 'Riemann problem',
      def: 'A conservation law started from two constant states separated by a single jump. Its solution depends only on $x/t$. For the Euler equations it has three waves: a shock or rarefaction, a contact, and a shock or rarefaction. Godunov-type schemes solve one at every cell face.',
      section: 'riemann',
    },
    'godunov-method': {
      term: 'Godunov\'s method',
      def: 'A finite-volume scheme that treats cell averages as piecewise constant, solves the Riemann problem at every face, and uses the flux of that solution at the face. Conservative, upwind for every wave and entropy-satisfying; first order. Devised 1953–54, published 1959.',
      section: 'riemann',
    },
    rarefaction: {
      term: 'rarefaction (expansion fan)',
      def: 'A smooth wave in which characteristics fan out from a point, so that the solution spreads into a ramp, $u = x/t$ for Burgers. In a gas, the density and pressure fall smoothly through it. It is what an upward jump in wave speed must become.',
      section: 'entropy',
    },
    'contact-discontinuity': {
      term: 'contact discontinuity',
      def: 'A jump in density (and temperature) that moves with the gas, with pressure and velocity continuous across it. Characteristics run parallel to it, so numerical diffusion widens it for as long as a run lasts, unlike a shock.',
      section: 'riemann',
    },
    tvd: {
      term: 'TVD (total variation diminishing)',
      def: 'A scheme for which the total variation $\\sum_j |u_{j+1} - u_j|$ never increases from one step to the next, so that it creates no new extrema. Defined by Harten (1983, as "TVNI"). TVD schemes can be second order except at smooth extrema.',
      section: 'limiters',
    },
    'flux-limiter': {
      term: 'flux limiter',
      def: 'A function $\\phi(\\theta)$ of the ratio of neighbouring jumps that decides how much of a high-order flux correction to add: none near a jump (upwind), all of it where the data are smooth. Sweby (1984) gave the region of $\\phi$ that keeps the scheme TVD.',
      section: 'limiters',
    },
    'monotone-scheme': {
      term: 'monotone scheme',
      def: 'A scheme whose new values are non-decreasing functions of all the old values; for a linear scheme, one whose weights are all non-negative. It creates no new extrema and is at most first order (Godunov 1959 for linear schemes; Harten, Hyman and Lax 1976 in general).',
      section: 'godunov-theorem',
    },
    'godunov-theorem': {
      term: 'Godunov\'s theorem',
      def: 'A linear scheme that never creates new extrema (all weights non-negative) is at most first-order accurate (Godunov 1959). It applies to linear schemes only: nonlinear schemes such as flux limiters escape it.',
      section: 'godunov-theorem',
    },
    weno: {
      term: 'WENO',
      def: 'Weighted essentially non-oscillatory reconstruction (Liu, Osher and Chan 1994; Jiang and Shu 1996): a convex combination of several candidate stencils whose weights favour the smooth ones near a jump. Fifth order on smooth data, with tiny overshoots at jumps; not TVD.',
      section: 'limiters',
    },
    'approximate-riemann-solver': {
      term: 'approximate Riemann solver',
      def: 'A face flux computed from a simplified wave pattern instead of the exact Riemann solution: Roe (linearised), HLL (two waves), HLLC (two waves plus contact), Rusanov (one speed). Cheaper than the exact solver; each has its own failure modes.',
      section: 'riemann',
    },
  },
  pathologies: [
    {
      id: 'wrong-shock-speed',
      name: 'Wrong shock speed',
      family: 'conservation',
      symptom: 'A shock that looks sharp and stable but sits in the wrong place, falling further behind (or ahead of) the true position as time goes on. Refining the grid does not move it closer.',
      cause: 'The scheme discretises a non-conservative form of the equations, such as $u\\,u_x$ instead of $(u^2/2)_x$. Although smooth solutions are unaffected, at a jump the scheme no longer enforces the Rankine–Hugoniot condition for the conserved quantity, and its shock moves at a speed set by the internal structure of its numerical shock profile.',
      diagnose: 'Sum $u_j\\Delta x$ and compare with its exact budget (initial total plus boundary fluxes): a conservative scheme matches to round-off. Measure the shock position against the Rankine–Hugoniot speed; for Burgers from $u_L = 1$, $u_R = 0.5$ the non-conservative shock is 0.038 behind at $t = 0.5$ on 200 cells and still 0.036 behind on 800.',
      mitigations: [
        'Write the scheme in conservation form, with one flux per face shared by the two cells.',
        'For equations with no conservation form (some multiphase and shallow-water models with non-conservative products), use path-conservative schemes and check their shock speeds against known solutions.',
        'Shock fitting: track the shock explicitly and impose the jump conditions there; exact, but complex in more than one dimension.',
      ],
      section: 'rankine-hugoniot',
      demo: { widget: 'shocks-speed', data: { preset: 'half' } },
    },
    {
      id: 'expansion-shock',
      name: 'Expansion shock',
      family: 'accuracy',
      symptom: 'A sharp jump that stays put (or moves) where the exact solution is a smooth rarefaction fan, usually at a sonic point where the wave speed changes sign. In a gas, a density step inside a rarefaction.',
      cause: 'The flux satisfies conservation but not the entropy condition. Roe\'s linearised solver sees only the average wave speed at each face; at a transonic expansion that average is near zero, its dissipation vanishes, and the upward jump is a valid weak solution that it keeps.',
      diagnose: 'Look for a jump inside a fan whose size does not shrink with the cell size (Sod with a sonic rarefaction: 0.19 at 100 cells, 0.187 at 200 and 400). For Burgers, the energy $\\int u^2/2$ rises above its exact value: an expansion shock creates energy.',
      mitigations: [
        'An entropy fix: Harten\'s smoothed $|\\hat a|$ or the Harten–Hyman wave splitting adds dissipation only at transonic expansions.',
        'Use a flux that satisfies the entropy condition by construction: Godunov\'s exact flux, HLL or Rusanov (more diffusive).',
        'Second-order reconstruction reduces the jump but does not remove the cause; keep the fix on.',
      ],
      section: 'entropy',
      demo: { widget: 'shocks-entropy', data: { preset: 'roe' } },
    },
    {
      id: 'gibbs-oscillations',
      name: 'Gibbs oscillations at shocks',
      family: 'accuracy',
      symptom: 'Overshoots and trains of wiggles next to shocks and contacts, of a fixed relative size that does not shrink as the grid is refined. Named by analogy with the overshoot of a Fourier series at a jump. In strong problems the wiggles drive density or pressure negative.',
      cause: 'A linear scheme of second order or higher has a negative weight somewhere (Godunov\'s theorem), so near a jump the new value is not an average of old ones and overshoots. Dispersion separates the short waves that make up the jump.',
      diagnose: 'Total variation of the solution against that of the exact one, or against its initial value for advection: a ratio above 1 means new extrema (Lax–Wendroff on Sod: 1.64). Look for overshoots that keep their size under refinement.',
      mitigations: [
        'Flux or slope limiters (TVD, MUSCL): second order in smooth regions, first order at jumps; clips smooth extrema.',
        'WENO or other essentially non-oscillatory reconstructions: high order with very small overshoots; more expensive.',
        'Artificial viscosity added near shocks (von Neumann–Richtmyer, or a shock sensor): simple; needs tuning and smears.',
        'Filtering the solution after the fact is a last resort: it damps the ringing and the resolved features alike.',
      ],
      section: 'godunov-theorem',
      demo: { widget: 'shocks-sod', data: { preset: 'lw-ringing' } },
    },
    {
      id: 'positivity-loss',
      name: 'Positivity loss',
      family: 'stability',
      symptom: 'Density or pressure becomes negative in a strong expansion or near vacuum, the sound speed turns imaginary and the run stops, often within a few steps.',
      cause: 'Linearised Riemann solvers such as Roe\'s compute intermediate states that are not physically admissible when the expansion is strong. Linear high-order schemes can do the same through overshoots. Nothing in conservation form forces a positive pressure, which is a nonlinear function of the conserved variables.',
      diagnose: 'Track the minimum density and pressure every step. On the 123 problem, Roe fails at step 3 with $p \\approx -0.11$ in the centre cell, with or without the entropy fix.',
      mitigations: [
        'Use a positively conservative flux: HLL or HLLE with wave-speed bounds (Einfeldt), or HLLC with suitable speeds.',
        'Positivity-preserving limiters that scale the high-order update back towards a first-order positive one where needed.',
        'Floors on density and pressure: robust but not conservative; the error has to go somewhere.',
      ],
      section: 'failures',
      demo: { widget: 'shocks-sod', data: { preset: 'positivity' } },
    },
    {
      id: 'slow-shock-noise',
      name: 'Slowly moving shock noise',
      family: 'accuracy',
      symptom: 'Long-wavelength ripples in the flow behind a strong shock that moves slowly across the grid, where the exact solution is constant. Most visible in momentum.',
      cause: 'A captured shock spans a few cells and its internal profile depends on where it sits relative to the cell faces. As it crawls from one cell to the next the profile changes periodically and sheds a small wave each time. A slow shock sheds long waves that the scheme\'s diffusion does not damp.',
      diagnose: 'Plot momentum behind the shock: a wobble that repeats each time the shock crosses a cell. For a Mach 3 shock at speed 0.11, Roe, Godunov and HLLC give 13–14% of the momentum jump at first order and over 30% at second order; Rusanov gives 0.17%.',
      mitigations: [
        'Increase dissipation at the shock using a more diffusive flux (Rusanov, HLL) or a local blend, which widens the captured shock profile.',
        'Shock-detecting dissipation or flattening (as in PPM) applied only near strong shocks.',
        'Move the grid with the shock (shock fitting, or a frame moving at the shock speed) when the shock is the point of the calculation.',
      ],
      section: 'failures',
      demo: { widget: 'shocks-sod', data: { preset: 'slow-shock' } },
    },
    {
      id: 'carbuncle',
      name: 'Carbuncle',
      family: 'stability',
      symptom: 'In supersonic flow past a blunt body, the middle of the computed bow shock bulges forward into a lump, with spurious flow behind it. Nothing like it appears in experiments. Two-dimensional only.',
      cause: 'Complete Riemann solvers (Godunov, Roe, HLLC) resolve contact and shear waves with almost no dissipation. Along a strong shock aligned with the grid, that leaves transverse perturbations undamped, and odd–even decoupling grows. Reported in blunt-body calculations by Peery and Imlay (1988); catalogued by Quirk (1994).',
      diagnose: 'A strong shock aligned with grid lines that develops a bulge or a sawtooth along its length, and changes when the flux is switched to HLL. No single test settles it; it depends on grid, Mach number and solver.',
      mitigations: [
        'Hybrid fluxes: switch to HLL (or another dissipative flux) in cells near strong shocks, keeping the complete solver elsewhere.',
        'Add dissipation to the shear and contact waves near shocks (rotated or blended Riemann solvers).',
        'Grids not aligned with the shock reduce it but do not remove it. No cure is universally accepted.',
      ],
      section: 'failures',
    },
  ],
};
