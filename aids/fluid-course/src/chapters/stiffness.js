// Chapter 9: Diffusion and stiffness. Explicit diffusion step limits,
// implicit solvers, Crank–Nicolson's ringing, stiffness in ODE solvers,
// the cell Péclet number, and Du Fort–Frankel as a scheme that is stable
// but converges to the wrong equation.
// Kernels: src/sims/diffusion.js, src/sims/stiff.js and the chapter's own
// src/sims/ch-stiffness-richardson.js; tests in tests/fluid-course/ch-stiffness.test.js.

import { mountHeat } from './stiffness/heat.js';
import { mountThomas } from './stiffness/thomas.js';
import { mountRegions } from './stiffness/regions.js';
import { mountOde } from './stiffness/ode.js';
import { mountPeclet } from './stiffness/peclet.js';
import { mountDufort } from './stiffness/dufort.js';

export const chapter = {
  id: 'stiffness',
  title: 'Diffusion and stiffness',
  short: 'Stiffness',
  blurb: 'Explicit diffusion limits, implicit solvers, Crank–Nicolson oscillations, stiffness, and the cell Péclet number.',
  minutes: 35,
  html: String.raw`
<p class="lead-in">Although physical diffusion smooths every gradient, it often restricts the time step more severely than advection. Because an explicit diffusion solver requires time steps proportional to the square of the grid spacing, halving $\Delta x$ multiplies the step count by four. This chapter derives that quadratic stability limit, shows how implicit methods remove it with a tridiagonal linear solve, explains why Crank–Nicolson still oscillates on sharp initial data, and connects these effects to the general concept of stiffness in systems with widely separated timescales—closing with Du Fort–Frankel, an unconditionally stable explicit scheme that can converge to the wrong differential equation.</p>

<h2 id="heat">The heat equation and the explicit limit</h2>

<p>When a warm region sits inside a cooler bar, heat flows from hot to cold and changes temperature fastest where the profile is most sharply curved, since a local peak loses heat to both sides while a trough gains from both. Along a straight-line profile, each point receives as much heat from one side as it loses to the other, so the temperature remains steady. The <dfn data-term="diffusion-equation">diffusion equation</dfn> states that the local rate of change is proportional to the second spatial derivative (curvature):</p>

<div class="eq" id="eq-heat">$$\frac{\partial u}{\partial t} = \kappa\,\frac{\partial^2 u}{\partial x^2}$$<span class="eq-tag">(9.1)</span></div>

<p>Here $u$ is the temperature (or a concentration, or a velocity component under viscosity) and $\kappa$ is the diffusivity, in square metres per second. Substituting a single Fourier mode $u = e^{-\kappa k^2 t}\sin kx$ shows that it keeps its shape and decays at the rate $\kappa k^2$: halving the wavelength quadruples the decay rate, separating the timescales of short and long waves by factors of $k^2$. Diffusion erases the shortest waves almost immediately while the longest ones decay slowly, so a heat problem spans many timescales at once.</p>

<p>The obvious scheme, FTCS (forward in time, centred in space, the same recipe as in <a href="#/advection/ftcs">the advection chapter</a>), replaces the time derivative by a forward difference and the curvature by the centred second difference:</p>

<div class="eq" id="eq-ftcs">$$u_j^{n+1} = u_j^n + r\left(u_{j+1}^n - 2u_j^n + u_{j-1}^n\right),\qquad r = \frac{\kappa\,\Delta t}{\Delta x^2}$$<span class="eq-tag">(9.2)</span></div>

<p>Because each updated value is computed directly from known values at level $n$, FTCS is an <dfn data-term="explicit-method">explicit method</dfn>. The dimensionless mesh ratio $r$ compares the diffusion distance over one step with the cell width. Rearranging the update as $u_j^{n+1} = (1-2r)\,u_j^n + r\,u_{j+1}^n + r\,u_{j-1}^n$ expresses the new temperature as a weighted combination of the three neighbouring values whose weights sum to 1. For $r \le 1/2$, all three weights are non-negative, so the new value is bounded by the old values of the stencil and no new extrema can form. When $r > 1/2$, the central weight $1 - 2r$ becomes negative, causing a local peak to overshoot into a trough on the next step and amplifying the oscillation at every subsequent step.</p>

<p><dfn data-term="von-neumann-analysis">Von Neumann analysis</dfn> quantifies this growth rate. Substituting a discrete Fourier mode $u_j^n = G^n e^{ij\xi}$, where $\xi = k\Delta x$ is the wavenumber in grid units, shows that each step multiplies the mode by the <dfn data-term="amplification-factor">amplification factor</dfn></p>

<div class="eq" id="eq-ftcs-g">$$G(\xi) = 1 - 4r\sin^2\frac{\xi}{2},\qquad |G| \le 1 \text{ for every } \xi \iff r \le \frac{1}{2}$$<span class="eq-tag">(9.3)</span></div>

<p>The most restrictive mode is the shortest wave the grid can represent—the sawtooth $(-1)^j$ at $\xi = \pi$, for which $G(\pi) = 1 - 4r$ (equal to $-1.08$ at $r = 0.52$). The mode that the exact heat equation damps fastest is therefore the first one that FTCS amplifies when $r > 1/2$. Because stability requires $\Delta t \le \Delta x^2/(2\kappa)$, halving the cell size requires four times as many time steps. On a uniform three-dimensional grid, the limit tightens to $\Delta t \le \Delta x^2/(6\kappa)$, so the total work to reach a fixed time with $n$ cells per side scales as $n^5$ ($n^3$ unknowns across $O(n^2)$ steps).</p>

<div data-quiz="q1"></div>

<figure data-widget="stiffness-heat" class="wide"><figcaption>The heat equation on $[0, 1]$ with $u = 0$ at both ends. Left: the numerical solution (dots) against the exact one (dashed). Right: the scheme's amplification factor for every wavenumber the grid holds, against the exact one-step decay $e^{-r\xi^2}$; the shaded bands are $|G| > 1$. The initial data are $\sin \pi x$ plus a sawtooth of height $10^{-3}$, the mode that is first to go wrong.</figcaption></figure>

<div class="try"><ol>
<li>Press Play at $r = 0.4$. The sawtooth (too small to see) dies within a few steps, and the sine decays like the dashed curve.</li>
<li>Drag $r$ to 0.52 and press Play. Watch the readout <em>worst |G| on the grid</em>: 1.078. The sawtooth grows by that factor each step, from $10^{-3}$ to visible in about 50 steps, and the run stops when the error passes 3, about 105 steps in.</li>
<li>Set $r$ to exactly 0.5. The shortest wave now has $G = -1$: it flips sign but never grows. Over 300 steps the error stays at about $10^{-3}$, the height of the sawtooth.</li>
<li>Keep $r = 0.4$ and switch the grid from $n = 50$ to $n = 100$. The step $\Delta t$ drops by four, and <em>steps to t = 0.1</em> rises from 625 to 2,500.</li>
</ol></div>

<aside class="pitfall">The classic way to meet this limit is to refine a grid that worked and keep the old time step. Halving $\Delta x$ quadruples $r$, so a run that sat at $r = 0.2$ jumps to $r = 0.8$ and explodes from the shortest waves. See <a href="#/pathologies">the gallery entry</a> on the explicit diffusion limit.</aside>

<details class="deeper"><summary>Go deeper: where $1 - 4r\sin^2(\xi/2)$ comes from</summary>
<p>Substitute $u_j^n = G^n e^{ij\xi}$ into (9.2) and divide by $G^n e^{ij\xi}$:</p>
<p>$$G = 1 + r\left(e^{i\xi} - 2 + e^{-i\xi}\right) = 1 + r\,(2\cos\xi - 2) = 1 - 4r\sin^2\frac{\xi}{2}.$$</p>
<p>The exact equation multiplies the same mode by $e^{-\kappa k^2 \Delta t} = e^{-r\xi^2}$ in one step, which lies in $(0, 1]$ for every $\xi$. For small $\xi$ the two agree, $G \approx 1 - r\xi^2$, which is why long waves are computed well. For $\xi$ near $\pi$ the scheme's $G$ is $1 - 4r$ while the exact factor is $e^{-\pi^2 r}$, close to zero. The scheme is stable when $-1 \le 1 - 4r$, that is $r \le 1/2$. The weighted-average argument in the text gives the same bound and more: for $r \le 1/2$ the maximum of $|u|$ never grows (a discrete maximum principle), even with boundaries and variable data, where Fourier analysis says nothing.</p>
</details>

<h2 id="implicit">Implicit methods: one solve per step</h2>

<p>In the exact heat equation, a perturbation at one end of the bar influences the entire domain instantaneously, whereas an explicit three-point stencil propagates information by only one cell per step and is restricted to $\Delta t \propto \Delta x^2$. Evaluating the spatial second difference at the <em>new</em> time level $n+1$ instead of level $n$ couples all new values simultaneously, giving backward Euler in time (BTCS):</p>

<div class="eq" id="eq-btcs">$$-r\,u_{j-1}^{n+1} + (1 + 2r)\,u_j^{n+1} - r\,u_{j+1}^{n+1} = u_j^n$$<span class="eq-tag">(9.4)</span></div>

<p>Because the unknown values $u^{n+1}$ appear in the spatial difference, BTCS is an <dfn data-term="implicit-method">implicit method</dfn> that advances the solution by solving a linear system of equations at each time step. Its amplification factor $G(\xi) = 1/\left(1 + 4r\sin^2(\xi/2)\right)$ lies in $(0, 1]$ for every $r > 0$ and every wavenumber $\xi$, making the scheme unconditionally stable and damping the shortest wavelengths most strongly, just as the exact equation does.</p>

<p>The system is tridiagonal: each equation involves a node and its two neighbours. Gaussian elimination on a tridiagonal matrix needs no fill-in and no pivoting when the diagonal dominates ($1 + 2r > r + r$ here). It reduces to two sweeps, the <dfn data-term="thomas-algorithm">Thomas algorithm</dfn>. The forward sweep clears the entry left of the diagonal row by row and scales each row so its diagonal is 1, storing two numbers per row, $c'_j$ and $d'_j$. The backward sweep then reads off the unknowns from the bottom up: $u_j = d'_j - c'_j\,u_{j+1}$. For $m$ unknowns that is $8m - 7$ arithmetic operations, counted from the code the figure runs: two for the first row, six for each middle row and five for the last on the way down, then two per row on the way back. The name comes from a 1949 report by L. H. Thomas; the method itself is just elimination, written out for three diagonals.</p>

<figure data-widget="stiffness-thomas" class="wide"><figcaption>One implicit step on 10 cells (9 unknowns), from a step profile with $u(0) = 1$. Left: the matrix and the algorithm's working columns. The yellow outline is the row being written, blue stripes are the rows it reads. Forward elimination turns the matrix into ones on the diagonal with $c'$ above it; back substitution clears $c'$ and fills $x$ from the bottom. Right: the old profile, the new values as they arrive, and the exact solution one step later.</figcaption></figure>

<div class="try"><ol>
<li>Press Next operation a few times and follow the yellow row down the matrix. Each forward row reads only the row above it.</li>
<li>Keep pressing. At the bottom the last row holds one unknown, and back substitution climbs up again. The new profile on the right appears from the right-hand end.</li>
<li>Read the flop count when the step is done: 65, which is $8 \times 9 - 7$. Raise $r$ to 20 and finish another step: the operation count is unchanged, because the work of an implicit step does not depend on its step size.</li>
</ol></div>

<p>In 1D, each backward Euler or Crank–Nicolson step performs about 13 floating-point operations per unknown (5 to assemble the right-hand side and about 8 in the Thomas solve, including a division per row) compared with 5 for FTCS. In return, the time step $\Delta t$ can be chosen for temporal accuracy rather than explicit stability, as shown in the table below for $u_0 = \sin\pi x$ integrated to $t = 0.1$ with $\kappa = 1$.</p>

<div class="table-wrap"><table>
<thead><tr><th class="num">cells $n$</th><th class="num">FTCS steps at $r = 1/2$</th><th class="num">FTCS max error</th><th class="num">Crank–Nicolson steps, $\Delta t = 0.005$</th><th class="num">Crank–Nicolson max error</th></tr></thead>
<tbody>
<tr><td class="num">50</td><td class="num">500</td><td class="num">$2.4\times 10^{-4}$</td><td class="num">20</td><td class="num">$4.6\times 10^{-5}$</td></tr>
<tr><td class="num">100</td><td class="num">2,000</td><td class="num">$6.1\times 10^{-5}$</td><td class="num">20</td><td class="num">$4.4\times 10^{-5}$</td></tr>
<tr><td class="num">200</td><td class="num">8,000</td><td class="num">$1.5\times 10^{-5}$</td><td class="num">20</td><td class="num">$6.7\times 10^{-5}$</td></tr>
</tbody></table></div>

<p>While the explicit step count grows as $n^2$, the Crank–Nicolson step count remains fixed at 20 across all three grids, achieving comparable accuracy with hundreds of times fewer steps on the finest mesh. Unconditional stability does not guarantee temporal accuracy at large $\Delta t$, however: because backward Euler is only first-order accurate in time, running it with $\Delta t = 0.01$ on the same problem gives $u(\tfrac12, 0.1) = 0.390$ against the exact $0.3727$, a 5% time-truncation error.</p>

<div data-quiz="q2"></div>

<aside class="note" data-label="In two and three dimensions">The implicit system is no longer tridiagonal. A 2D grid gives a matrix with five diagonals spread far apart, and plain elimination fills in the gaps. Practical codes either split the step into 1D sweeps along each direction, each one a set of Thomas solves (alternating-direction implicit and other splitting methods, see <a href="#/stable-fluids/splitting">operator splitting</a>), or solve the full system iteratively, ideally with <a href="#/solvers/multigrid">multigrid</a>. The <a href="#/solvers/the-system">linear-solvers chapter</a> takes this up.</aside>

<details class="deeper"><summary>Go deeper: the Thomas recurrences</summary>
<p>Write row $i$ of the system as $a_i x_{i-1} + b_i x_i + c_i x_{i+1} = d_i$, with $a_1 = c_m = 0$. Elimination produces</p>
<p>$$c'_1 = \frac{c_1}{b_1},\quad d'_1 = \frac{d_1}{b_1},\qquad c'_i = \frac{c_i}{b_i - a_i c'_{i-1}},\quad d'_i = \frac{d_i - a_i d'_{i-1}}{b_i - a_i c'_{i-1}},$$</p>
<p>then $x_m = d'_m$ and $x_i = d'_i - c'_i\,x_{i+1}$. The pivots $b_i - a_i c'_{i-1}$ never vanish when $|b_i| \ge |a_i| + |c_i|$ with strict inequality in at least one row, because then $|c'_i| \le 1$ at every row. For (9.4) the pivots stay above $1 + r$. The work and storage are both proportional to $m$, which is why 1D implicit diffusion is almost as cheap as explicit diffusion per step.</p>
</details>

<h2 id="crank-nicolson">Crank–Nicolson: second order, and ringing</h2>

<p>Backward Euler is stable but only first order in time. Averaging the explicit and implicit differences centres the scheme at the half step and gains an order: this is <dfn data-term="crank-nicolson">Crank–Nicolson</dfn>. With $\delta^2 u_j = u_{j+1} - 2u_j + u_{j-1}$, the family that contains all three schemes so far is the $\theta$-method</p>

<div class="eq" id="eq-theta">$$u_j^{n+1} - u_j^n = r\left[\theta\,\delta^2 u_j^{n+1} + (1 - \theta)\,\delta^2 u_j^n\right]$$<span class="eq-tag">(9.5)</span></div>

<p>with $\theta = 0$ for FTCS, $\theta = 1$ for backward Euler and $\theta = 1/2$ for Crank–Nicolson. In time, Crank–Nicolson is the trapezoid rule. Its amplification factor</p>

<div class="eq" id="eq-cn-g">$$G(\xi) = \frac{1 - 2r\sin^2(\xi/2)}{1 + 2r\sin^2(\xi/2)}$$<span class="eq-tag">(9.6)</span></div>

<p>has $|G| \le 1$ for every $r$, so the scheme is unconditionally stable and second order in both time and space. It is the default for diffusion terms in a great many codes.</p>

<aside class="history" data-era="1947">John Crank and Phyllis Nicolson published the method in the January 1947 issue of the <em>Proceedings of the Cambridge Philosophical Society</em>. It grew out of a wartime request to Douglas Hartree about a very nonlinear heat-conduction problem with a temperature-dependent heat source. According to Charlotte Froese Fischer's biography of Hartree, as quoted by MacTutor, the problem was put to Hartree and he chose Crank and Nicolson to work on it. An earlier explicit approach had given oscillating errors; their implicit method needed more work per step but removed the oscillations and allowed much larger steps. The work was done on desk calculators: MacTutor quotes Crank recalling that to burn a piece of wood numerically could then take a week. Textbooks often cite the 1947 paper as an early appearance of von Neumann's Fourier stability test; the earliest confirmed full printed account co-authored by von Neumann is the 1950 paper with Charney and Fjørtoft.</aside>

<aside class="who" data-person="john-crank">Co-author of the 1947 method. His book <em>The Mathematics of Diffusion</em> (Oxford, 1956) became the standard reference on diffusion problems.</aside>

<aside class="who" data-person="phyllis-nicolson">From Hartree's Manchester group. One part of her 1946 thesis treats heat flow with heat released by chemical reactions, the problem behind the 1947 paper. The paper is signed P. Nicolson; "Nicholson" is a common misspelling.</aside>

<p>Although $|G(\xi)| \le 1$ for all $r$, Crank–Nicolson damps the shortest wavelengths poorly when $r$ is large: as $r \to \infty$, $G(\pi) = (1 - 2r)/(1 + 2r)$ approaches $-1$, reaching $-19/21 \approx -0.905$ at $r = 10$. Whereas the exact heat equation multiplies that sawtooth mode by $e^{-10\pi^2} \approx 0$, Crank–Nicolson retains 90% of its amplitude and reverses its sign on every step. Smooth initial profiles contain negligible energy at $\xi \approx \pi$, but a step, kink, or sudden change in boundary value excites high-wavenumber modes that persist as a sign-alternating sawtooth beside the steep gradient.</p>

<figure data-widget="stiffness-heat" data-preset="cn-ringing" class="wide"><figcaption>The same laboratory, set to Crank–Nicolson on a step from $u = 1$ to $u = 0$ at $r = 10$ (50 cells). Watch the profile near $x = 1/2$ and the total variation readout, which for the exact solution can only fall.</figcaption></figure>

<div class="try"><ol>
<li>Press Step a few times. The total variation jumps from 1 to 1.567 on the first step and the profile zig-zags beside the jump. Press Play to watch the zig-zag flip every step.</li>
<li>Switch to backward Euler at the same $r$. Because its $G(\pi)$ approaches 0 for short waves rather than $-1$, no oscillations appear, and on this discontinuous profile its error after 12 steps (0.0070) is smaller than Crank–Nicolson's (0.020).</li>
<li>Back on Crank–Nicolson, tick <em>Start with two backward-Euler half steps</em> and reset. The ringing is gone. Press Step 13 times, which reaches the same time as 12 full steps because the start-up uses two presses: the error is $1.7\times 10^{-4}$, forty times smaller than backward Euler's.</li>
<li>Choose the θ-method and try $\theta = 0.6$, then $0.95$. The first still overshoots (total variation 1.22), while the second is monotone and first-order accurate in time.</li>
<li>Find where ringing starts. With Crank–Nicolson on the step, new wiggles appear once $r$ passes about 4.</li>
</ol></div>

<p>Although the shortest waves have $G &lt; 0$ and alternate in sign as soon as $r > 1/2$, on this 50-cell step profile their amplitude remains small enough that the solution stays monotone up to $r = 4$, with the total variation rising only from $r = 4.05$ onward. The stricter textbook bound $r(1 - \theta) \le 1/2$—which gives $r \le 1$ for Crank–Nicolson—is the sufficient condition for the $\theta$-method to satisfy a discrete maximum principle for arbitrary initial data.</p>

<p>Practitioners have four standard cures, roughly in order of use. <strong>Rannacher start-up</strong> (Rannacher, 1984): replace the first Crank–Nicolson step, where the data are sharpest, by two (or four) backward-Euler half steps, which damp the short waves, then continue with Crank–Nicolson. Second-order accuracy survives. <strong>$\theta$ a little above 1/2</strong> damps the short waves at every step but drops to first order. To stop the sign flips at $r = 10$ you need $\theta \ge 1 - 1/(4r) = 0.975$. <strong>An L-stable second-order method</strong> such as BDF2, the subject of the next section. And <strong>smaller steps</strong> while the data are sharp. Østerby (2003) compares several of these.</p>

<details class="deeper"><summary>Go deeper: Crank–Nicolson is the trapezoid rule</summary>
<p>Discretising in space alone decouples the Fourier modes into independent ODEs $\dot{y} = \lambda y$ with $\lambda = -(4\kappa/\Delta x^2)\sin^2(\xi/2)$. Applying the trapezoid rule $y_{n+1} = y_n + \tfrac{h}{2}(\lambda y_n + \lambda y_{n+1})$ gives $y_{n+1} = R(h\lambda)\,y_n$ with</p>
<p>$$R(z) = \frac{1 + z/2}{1 - z/2},\qquad z = h\lambda = -4r\sin^2\frac{\xi}{2},$$</p>
<p>which is (9.6). The same substitution turns backward Euler into $R(z) = 1/(1 - z)$ and FTCS into $R(z) = 1 + z$. For the $\theta$-method, $G(\pi) = (1 - 4(1-\theta)r)/(1 + 4\theta r)$, which is non-negative when $\theta \ge 1 - 1/(4r)$. The maximum principle needs the centre weight of the explicit half to be non-negative, $1 - 2(1-\theta)r \ge 0$, which is $\theta \ge 1 - 1/(2r)$: 0.95 at $r = 10$.</p>
</details>

<div data-quiz="q3"></div>

<h2 id="stiffness">What stiffness is</h2>

<p>Discretising the heat equation in space while leaving time continuous yields a system of coupled ordinary differential equations, $\mathrm{d}\mathbf{u}/\mathrm{d}t = A\mathbf{u}$, where $A$ is the centred second-difference matrix divided by $\Delta x^2$. In this <dfn data-term="method-of-lines">method of lines</dfn> formulation, choosing a time-stepping scheme is equivalent to choosing an ODE integrator for $\mathrm{d}\mathbf{u}/\mathrm{d}t = A\mathbf{u}$, whose behaviour is governed by the eigenvalues of $A$:</p>

<div class="eq" id="eq-mol">$$\lambda_k = -\frac{4\kappa}{\Delta x^2}\sin^2\frac{k\pi\Delta x}{2},\qquad k = 1, \ldots, n-1$$<span class="eq-tag">(9.7)</span></div>

<p>They run from about $-\kappa\pi^2$ (the smooth mode that carries the answer) to about $-4\kappa/\Delta x^2$ (the sawtooth, which decays almost at once). The ratio of the two, the stiffness ratio $\cot^2(\pi\Delta x/2) \approx 4/(\pi^2\Delta x^2)$, is about 1,012 for 50 cells, and it grows like $n^2$. In a <dfn data-term="stiffness">stiff</dfn> problem, the fastest modes decay on a timescale much shorter than the motion of interest—forcing an explicit solver to take tiny steps for stability even when the solution is varying slowly. If you actually need to resolve those fast modes, the problem is not stiff, regardless of the eigenvalue ratio. Lambert (1991) discusses the definitions in detail.</p>

<p>To see what a method does to each mode, apply it to Dahlquist's test equation $y' = \lambda y$. One step gives $y_{n+1} = R(z)\,y_n$ with $z = h\lambda$, and the method is stable for that mode when $|R(z)| \le 1$. The set of such $z$ in the complex plane is the method's <dfn data-term="stability-region">stability region</dfn>. For explicit Euler, $R(z) = 1 + z$, a disc of radius 1 centred on $-1$, so a real negative eigenvalue needs $h|\lambda| \le 2$. For the stiffest heat mode that is $h \le \Delta x^2/(2\kappa\cos^2(\pi\Delta x/2))$, just above $\Delta x^2/(2\kappa)$: the FTCS limit (9.3), now in ODE form. RK4 does better, reaching $-2.785$ on the real axis, but every explicit Runge–Kutta method has a polynomial $R$, which must grow as $|z| \to \infty$. Its region is bounded, and its step still shrinks like $\Delta x^2$.</p>

<p>Implicit methods have rational stability functions $R(z)$, allowing their stability regions to cover the entire left half-plane $\operatorname{Re} z \le 0$. Methods with this property are called <dfn data-term="a-stability">A-stable</dfn> (Dahlquist, 1963), ensuring that every decaying mode remains bounded at any step size. Backward Euler, the trapezoid rule, and the two-step backward differentiation formula (BDF2) are all A-stable; in the same 1963 paper, Dahlquist proved that no A-stable linear multistep method can exceed second order (the second Dahlquist barrier). As Crank–Nicolson showed, however, A-stability alone does not guarantee strong damping of the fastest modes, because the trapezoid rule has $R(z) \to -1$ as $z \to -\infty$. An A-stable method that also satisfies $\lim_{z \to -\infty} R(z) = 0$ is called <dfn data-term="l-stability">L-stable</dfn>: backward Euler and BDF2 are L-stable and damp very stiff modes in a single step, whereas the trapezoid rule is not. Curtiss and Hirschfelder's 1952 paper <em>Integration of stiff equations</em> introduced both the term "stiff" and the backward differentiation formulas.</p>

<figure data-widget="stiffness-regions" class="wide"><figcaption>Left: the stability region (shaded) of the chosen method in the plane of $z = h\lambda$, with the heat equation's eigenvalues $h\lambda_k$ for $n$ cells marked on the negative real axis. Right: the growth factor $|R|$ per step along the negative real axis on log scales, against the exact factor $e^{-h|\lambda|}$, with each heat mode marked. Modes above the dashed line grow.</figcaption></figure>

<div class="try"><ol>
<li>With explicit Euler, $n = 16$ and $h = 0.0019$, all 15 modes sit inside the disc. Drag $h$ up past 0.00197 and watch the stiffest mode leave the region.</li>
<li>Set $h$ back to 0.0019 and raise $n$ to 32. The eigenvalues spread four times further left: 21 of the 31 modes now grow. Each grid refinement requires reducing $h$ by a factor of four.</li>
<li>Switch to RK4. Its region is bigger, so the limit is about 40% larger, but it is still bounded.</li>
<li>Choose the trapezoid rule with $n = 64$ and $h = 0.01$. Every mode is inside, but on the right $|R|$ of the stiffest mode is about 0.98, where the exact factor is zero to every digit. Switch to BDF2 or implicit Euler and that factor drops well below 1.</li>
</ol></div>

<p>Stiffness arises in any system that couples rapid relaxation to a slow evolution, including chemical kinetics, electrical networks, and elastic structures with stiff springs. A compact scalar example is the Prothero–Robinson equation $y' = \lambda(y - \cos t) - \sin t$ with $\lambda = -1000$, whose exact solution through $y(0) = 1$ is simply $\cos t$, while any perturbation off that curve decays on a timescale of $1/1000$. Although $h = 0.1$ easily resolves $\cos t$, explicit Euler requires $h &lt; 2/1000$ for stability.</p>

<figure data-widget="stiffness-ode" data-preset="euler-broken" class="wide"><figcaption>A stiff ODE integrated to the end of its run. Left: the numerical solution against the exact one. Right: the error on a log scale. The readouts give $h\lambda$ for the fast eigenvalue $\lambda = -1000$ and the factor $R(h\lambda)$ the method applies to that mode each step.</figcaption></figure>

<div class="try"><ol>
<li>At $h = 0.0021$, explicit Euler has $h\lambda = -2.1$ and $R = -1.1$. Every small error, truncation or rounding, grows by 10% per step. The figure stops the run near $t = 0.71$, when the error passes $10^{8}$; left alone it would reach $10^{33}$ by $t = 2$. Drop $h$ to 0.0019: the largest error is $1.8\times 10^{-6}$.</li>
<li>Try RK4. It survives up to $h = 0.0027$ and fails at 0.0028: a bigger stability interval, the same kind of limit.</li>
<li>Choose implicit Euler and push $h$ to 0.1, fifty times the explicit limit. The error is $5\times 10^{-5}$.</li>
<li>Pick the problem with $y_0 = 2$, which starts off the slow solution, and the trapezoid rule at $h = 0.1$. The transient is multiplied by $R(-100) = -49/51$ each step: after ten steps it is still 0.67, flipping sign every step. Implicit Euler ($R = 1/101$) removes it in one step.</li>
<li>Choose the two-time-scale system. Its fast mode has decayed by $t = 0.01$, yet explicit Euler at $h = 0.0021$ still explodes before $t = 5$. A mode you cannot see still limits the step.</li>
</ol></div>

<div data-quiz="q4"></div>

<details class="deeper"><summary>Go deeper: the eigenvalues of the second difference</summary>
<p>Try $u_j = \sin(k\pi x_j)$ with $x_j = j\Delta x$, which vanishes at both ends. Then</p>
<p>$$u_{j+1} - 2u_j + u_{j-1} = 2\left(\cos(k\pi\Delta x) - 1\right)u_j = -4\sin^2\frac{k\pi\Delta x}{2}\,u_j,$$</p>
<p>so these sines are the eigenvectors, and dividing by $\Delta x^2$ gives (9.7). The smallest, for $k = 1$, is $-\kappa\pi^2$ to within $O(\Delta x^2)$, the decay rate of the exact first mode. The largest, for $k = n - 1$, is $-(4\kappa/\Delta x^2)\cos^2(\pi\Delta x/2)$. Their ratio is $\cot^2(\pi\Delta x/2)$, and for small $\Delta x$ this is close to $4/(\pi^2\Delta x^2)$.</p>
</details>

<h2 id="peclet">When diffusion is too weak: the Péclet number</h2>

<p>When a fluid flows at speed $a$ while diffusing heat with diffusivity $\kappa$, the ratio of advective transport to diffusive spreading over a length scale $L$ defines the <dfn data-term="peclet-number">Péclet number</dfn> $\mathrm{Pe} = aL/\kappa$, named after the French physicist Jean Claude Eugène Péclet. At large $\mathrm{Pe}$, advection dominates across most of the domain and diffusion is confined to thin boundary or internal layers where boundary conditions force a rapid change, as in the steady two-point problem</p>

<div class="eq" id="eq-advdiff">$$-a\,u' + \kappa\,u'' = 0,\quad u(0) = 0,\ u(1) = 1:\qquad u(x) = \frac{e^{\mathrm{Pe}\,x} - 1}{e^{\mathrm{Pe}} - 1}$$<span class="eq-tag">(9.8)</span></div>

<p>The profile stays near 0 almost all the way and climbs to 1 in a boundary layer of width about $1/\mathrm{Pe}$ at the outflow end. Central differences for both terms give, after dividing by $2\kappa/\Delta x^2$,</p>

<div class="eq" id="eq-central-weights">$$u_j = \frac{1}{2}\left[\left(1 + \frac{P}{2}\right)u_{j-1} + \left(1 - \frac{P}{2}\right)u_{j+1}\right],\qquad P = \frac{a\,\Delta x}{\kappa}$$<span class="eq-tag">(9.9)</span></div>

<p>where $P$ is the <dfn data-term="cell-peclet-number">cell Péclet number</dfn>, the Péclet number on the scale of a single grid cell. Equation (9.9) expresses $u_j$ as a weighted average of its two neighbours biased toward the upstream node $u_{j-1}$. When $P > 2$, the downstream weight $\tfrac12(1 - P/2)$ turns negative and the scheme loses its discrete maximum principle, just as FTCS did for $r > 1/2$. Because the difference equation has general solution $A + B\rho^j$ with root $\rho = (1 + P/2)/(1 - P/2)$, which is negative for $P > 2$, the discrete profile oscillates in sign from node to node: at $P = 4$, $\rho = -3$, and the interior values adjacent to the outflow alternate through $-1/3$, $1/9$, $-1/27$, dipping below both boundary values.</p>

<figure data-widget="stiffness-peclet" data-preset="central-wiggles"><figcaption>Steady advection–diffusion with the boundary layer at $x = 1$. Central differencing, first-order upwind and exponential fitting on the same grid, against the exact profile (9.8). The Péclet slider changes the physics; the grid select changes only the resolution.</figcaption></figure>

<div class="try"><ol>
<li>With 20 cells and $\mathrm{Pe} = 80$, the cell Péclet number is 4. Central differencing zig-zags and dips to $-1/3$; exponential fitting lies exactly on the exact curve at every node.</li>
<li>Slide Pe down until $P$ passes 2 (Pe = 40). The wiggles vanish exactly there.</li>
<li>Back at Pe = 80, switch to 50 cells: $P = 1.6$, central is monotone, and its error falls from 0.35 to 0.091.</li>
<li>Turn on upwind at Pe = 40 with 20 cells. It never wiggles, but the readout shows why: it behaves like central differencing with $\kappa$ doubled, so its layer is too thick (error 0.20).</li>
</ol></div>

<p>There are three standard cures. <strong>Refine</strong> until $P \le 2$ in the layer, which is what the physics asks for anyway if the layer matters. <strong>Upwind</strong> the advection term, as in <a href="#/advection/upwind">the advection chapter</a>. That is always monotone, and it is exactly central differencing with $\kappa$ replaced by $\kappa + |a|\Delta x/2$: <dfn data-term="numerical-diffusion">numerical diffusion</dfn> of the size of the physical diffusion once $P = 2$. <strong>Exponential fitting</strong> solves (9.8) exactly between neighbouring nodes. This replaces $\kappa$ by $\kappa\,(P/2)\coth(P/2)$ and makes the scheme exact at the nodes for constant $a$ and $\kappa$, monotone for every $P$, and close to upwind when $P$ is large. It was found more than once: by Allen and Southwell (1955) for viscous flow, by Il'in (1969) in numerical analysis, and by Scharfetter and Gummel (1969) for semiconductor devices. The hybrid and power-law schemes popularised by Patankar's 1980 book are cheap approximations to it. With variable coefficients or in several dimensions, no scheme of this kind is exact, but the fitting keeps its monotonicity.</p>

<p>The cell Péclet number also links this section to the first. An explicit scheme for advection–diffusion faces two separate step limits, $\Delta t \le \Delta x^2/(2\kappa)$ for diffusion and $\Delta t \le \Delta x/|a|$ for advection (the <a href="#/advection/cfl">CFL condition</a>). Their ratio is exactly $P/2$. On a grid fine enough to resolve the layers ($P \lesssim 2$), the diffusion limit is the tighter of the two. That is why so many flow solvers treat viscous terms implicitly and advection explicitly.</p>

<aside class="pitfall">Wiggles near an outflow boundary in a steady solution are almost always $P > 2$. Check $P$ cell by cell, in each direction, before blaming the solver or the boundary condition. The <a href="#/pathologies">gallery</a> has this one too.</aside>

<details class="deeper"><summary>Go deeper: solving the central-difference equations</summary>
<p>Look for solutions of (9.9) of the form $u_j = \rho^j$. Then $(1 - P/2)\rho^2 - 2\rho + (1 + P/2) = 0$, whose roots are $\rho = 1$ and $\rho = (1 + P/2)/(1 - P/2)$. With $u_0 = 0$ and $u_n = 1$, the solution is $u_j = (\rho^j - 1)/(\rho^n - 1)$. The exact solution is $e^{\mathrm{Pe}\,x_j} = (e^P)^j$, so central differencing replaces $e^P$ by $\rho$. These agree to second order for small $P$; for $P > 2$ the sign of $\rho$ is wrong. Exponential fitting chooses the coefficients so that $\rho = e^P$ exactly.</p>
</details>

<h2 id="inconsistency">Stable is not enough: Du Fort–Frankel</h2>

<p>The first finite-difference attack on the heat equation is often credited to Lewis Fry Richardson. His paper on finite differences was read to the Royal Society in January 1910 and printed in 1911. MacTutor's biography of Crank says the simple finite-difference replacement for the heat equation was "proposed by L F Richardson in 1910". It adds that the instability of Richardson's scheme "was not recognised until lengthy numerical computations were carried out by Crank, Nicolson and others". Textbooks give his name to the centred three-level scheme</p>

<div class="eq" id="eq-richardson">$$u_j^{n+1} = u_j^{n-1} + 2r\left(u_{j+1}^n - 2u_j^n + u_{j-1}^n\right)$$<span class="eq-tag">(9.10)</span></div>

<p>which is centred and second-order accurate in both time and space, and unconditionally unstable for every $r > 0$. Its amplification factors satisfy the quadratic $G^2 + 8r\sin^2(\xi/2)\,G - 1 = 0$, whose two roots multiply to $-1$, forcing one root to have magnitude greater than 1 at every non-zero wavenumber (reaching $-(4 + \sqrt{17}) \approx -8.1$ for the sawtooth mode at $r = 1$).</p>

<aside class="who" data-person="lewis-fry-richardson">In the 1910 paper (printed 1911) he solved partial differential equations by finite differences by hand, paying human computers piece rates. The extrapolation to zero mesh size from the same paper is in <a href="#/discretization/richardson">the discretisation chapter</a>.</aside>

<p>In 1953 E. C. Du Fort and Stanley Frankel found a way to keep the leapfrog structure and gain stability. Replace the $2u_j^n$ in the centre of (9.10) by the average $u_j^{n+1} + u_j^{n-1}$. The new value still appears only at node $j$, so the scheme stays explicit:</p>

<div class="eq" id="eq-dufort">$$(1 + 2r)\,u_j^{n+1} = (1 - 2r)\,u_j^{n-1} + 2r\left(u_{j+1}^n + u_{j-1}^n\right)$$<span class="eq-tag">(9.11)</span></div>

<p>whose amplification factors satisfy $|G| \le 1$ for every $r > 0$. As Galloway and Ivers (2021) describe it, "DuFort–Frankel averaging is a tactic to stabilize Richardson's unstable three-level leapfrog timestepping scheme." Expanding the time average in a Taylor series around $(x_j, t^n)$, however, gives $u_j^{n+1} + u_j^{n-1} = 2u_j^n + \Delta t^2\,u_{tt} + \ldots$, so that (9.11) actually approximates</p>

<div class="eq" id="eq-dufort-modified">$$u_t + \kappa\left(\frac{\Delta t}{\Delta x}\right)^2 u_{tt} = \kappa\,u_{xx} + \mathcal{O}(\Delta t^2, \Delta x^2)$$<span class="eq-tag">(9.12)</span></div>

<p>This is its <dfn data-term="modified-equation">modified equation</dfn>. When the grid is refined at fixed $\Delta t/\Delta x$, the extra second-derivative term in time remains fixed and the scheme converges to a damped wave equation (the telegraph equation) rather than the heat equation. Du Fort–Frankel is <dfn data-term="consistency">consistent</dfn> with the heat equation only if $\Delta t/\Delta x \to 0$ as $\Delta x \to 0$—for example by holding $r$ fixed, which reimposes the $\Delta t \propto \Delta x^2$ scaling that the scheme was designed to avoid. As Lax and Richtmyer noted in their 1956 survey, the scheme is unconditionally stable, yet "the time increment must be limited on account of the consistency condition".</p>

<div data-quiz="q5"></div>

<figure data-widget="stiffness-dufort" data-preset="broken" class="wide"><figcaption>$u_0 = \sin\pi x$ on $[0, 1]$. Left: the amplitude at $x = 1/2$ against time, beside the heat equation's $e^{-\pi^2 t}$ and the damped wave equation that (9.12) predicts for the current $\Delta t/\Delta x$. Right: the error at $t = 0.2$ for every grid along both refinement paths, with the current grid circled.</figcaption></figure>

<div class="try"><ol>
<li>With $\Delta t = \Delta x/2$ and 40 cells, the amplitude follows the damped wave, not the heat equation. At $t = 0.2$ it is $-0.51$ instead of $+0.139$.</li>
<li>Refine to 80 and 160 cells. The error at $t = 0.2$ grows: 0.65, 0.68, 0.70, approaching the gap between the two equations. Every run is stable.</li>
<li>Switch the path to $r = 1$. Now $\Delta t/\Delta x = 1/n$ shrinks as you refine, and the error falls like $n^{-2}$: $1.55\times 10^{-3}$ at 40 cells.</li>
<li>Switch to Richardson. It blows up on every grid from 20 cells on the $r = 1$ path, and from 40 cells with $\Delta t = \Delta x/2$, where the run to $t = 0.2$ is short enough to finish first on the coarser grids. Rounding errors seed the growth.</li>
</ol></div>

<aside class="who" data-person="stanley-frankel">With E. C. Du Fort he published the scheme of this section in 1953, in <em>Mathematical Tables and Other Aids to Computation</em>. In 1950 he had found over-relaxation for elliptic problems, independently of David Young.</aside>

<p>This is the lesson of the <dfn data-term="lax-equivalence">Lax equivalence theorem</dfn> seen from the other side. For a linear problem, a consistent scheme converges if and only if it is stable (<a href="#/discretization/convergence">the discretisation chapter</a>). Richardson's scheme is consistent and unstable, so it fails. Du Fort–Frankel, refined with $\Delta t/\Delta x$ fixed, is stable and inconsistent, so it converges to the wrong thing. You need both properties along the path you will actually refine on, and a refinement study against a known solution is the only practical way to be sure.</p>

<aside class="note" data-label="In practice">Diffusion terms in flow codes are usually treated implicitly, with Crank–Nicolson (often with a backward-Euler start), backward Euler when robustness matters more than accuracy, or BDF2. Advection stays explicit, and the two are combined by <a href="#/stable-fluids/splitting">operator splitting</a> or implicit–explicit (IMEX) time-steppers. Explicit diffusion survives where the diffusive limit is no tighter than the advective one, that is where $P \gtrsim 2$, or where the diffusivity is small.</aside>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>J. Crank and P. Nicolson, "A practical method for numerical evaluation of solutions of partial differential equations of the heat-conduction type", <em>Proc. Cambridge Philos. Soc.</em> 43(1) (January 1947) 50–67, doi:10.1017/S0305004100023197. Reprinted in <em>Adv. Comput. Math.</em> 6 (1996) 207–226, doi:10.1007/BF02127704.</li>
<li>MacTutor History of Mathematics, biographies of John Crank and Phyllis Nicolson (St Andrews), for the wartime background, the quotation from Froese Fischer's biography of Hartree, and Richardson's 1910 scheme.</li>
<li>L. F. Richardson, "The approximate arithmetical solution by finite differences of physical problems involving differential equations, with an application to the stresses in a masonry dam", <em>Phil. Trans. R. Soc. A</em> 210 (1911) 307–357; read 13 January 1910.</li>
<li>E. C. Du Fort and S. P. Frankel, "Stability conditions in the numerical treatment of parabolic differential equations", <em>Math. Tables Aids Comput.</em> 7 (1953) 135–152.</li>
<li>P. D. Lax and R. D. Richtmyer, "Survey of the stability of linear finite difference equations", <em>Comm. Pure Appl. Math.</em> 9 (1956) 267–293.</li>
<li>D. Galloway and D. Ivers, "Slow-burning instabilities of DuFort–Frankel finite differencing", <em>ANZIAM J.</em> 63(1) (2021) 23–38, doi:10.1017/S1446181121000043.</li>
<li>J. G. Charney, R. Fjørtoft and J. von Neumann, "Numerical integration of the barotropic vorticity equation", <em>Tellus</em> 2 (1950) 237–254; G. G. O'Brien, M. A. Hyman and S. Kaplan, "A study of the numerical solution of partial differential equations", <em>J. Math. Phys.</em> 29 (1950) 223–251.</li>
<li>L. H. Thomas, "Elliptic problems in linear difference equations over a network", Watson Scientific Computing Laboratory report, Columbia University (1949).</li>
<li>R. Rannacher, "Finite element solution of diffusion problems with irregular data", <em>Numer. Math.</em> 43 (1984) 309–327.</li>
<li>O. Østerby, "Five ways of reducing the Crank–Nicolson oscillations", <em>BIT</em> 43 (2003) 811–822.</li>
<li>G. Dahlquist, "A special stability problem for linear multistep methods", <em>BIT</em> 3 (1963) 27–43.</li>
<li>C. F. Curtiss and J. O. Hirschfelder, "Integration of stiff equations", <em>Proc. Natl. Acad. Sci. USA</em> 38 (1952) 235–243.</li>
<li>A. Prothero and A. Robinson, "On the stability and accuracy of one-step methods for solving stiff systems of ordinary differential equations", <em>Math. Comp.</em> 28 (1974) 145–162.</li>
<li>D. N. de G. Allen and R. V. Southwell, "Relaxation methods applied to determine the motion, in two dimensions, of a viscous fluid past a fixed cylinder", <em>Quart. J. Mech. Appl. Math.</em> 8 (1955) 129–145.</li>
<li>A. M. Il'in, "Differencing scheme for a differential equation with a small parameter affecting the highest derivative", <em>Math. Notes</em> 6 (1969) 596–602.</li>
<li>D. L. Scharfetter and H. K. Gummel, "Large-signal analysis of a silicon Read diode oscillator", <em>IEEE Trans. Electron Devices</em> 16 (1969) 64–77.</li>
<li>S. V. Patankar, <em>Numerical Heat Transfer and Fluid Flow</em> (Hemisphere, 1980), ch. 5.</li>
<li>K. W. Morton and D. F. Mayers, <em>Numerical Solution of Partial Differential Equations</em>, 2nd ed. (Cambridge, 2005), ch. 2: explicit and implicit schemes, the θ-method and the maximum principle.</li>
<li>R. D. Richtmyer and K. W. Morton, <em>Difference Methods for Initial-Value Problems</em>, 2nd ed. (Interscience, 1967): Richardson's and Du Fort–Frankel's schemes.</li>
<li>R. J. LeVeque, <em>Finite Difference Methods for Ordinary and Partial Differential Equations</em> (SIAM, 2007), ch. 7–9: stability regions, stiffness and the method of lines.</li>
<li>E. Hairer and G. Wanner, <em>Solving Ordinary Differential Equations II: Stiff and Differential-Algebraic Problems</em>, 2nd ed. (Springer, 1996).</li>
<li>J. D. Lambert, <em>Numerical Methods for Ordinary Differential Systems</em> (Wiley, 1991), ch. 6: what stiffness is, and why the stiffness ratio is not a definition.</li>
<li>J. C. Strikwerda, <em>Finite Difference Schemes and Partial Differential Equations</em>, 2nd ed. (SIAM, 2004).</li>
</ol>
`,
  widgets: {
    'stiffness-heat': mountHeat,
    'stiffness-thomas': mountThomas,
    'stiffness-regions': mountRegions,
    'stiffness-ode': mountOde,
    'stiffness-peclet': mountPeclet,
    'stiffness-dufort': mountDufort,
  },
  quizzes: {
    q1: {
      type: 'predict',
      q: 'The figure below starts from $\\sin\\pi x$ plus a sawtooth $(-1)^j$ of height $10^{-3}$. You will run FTCS at $r = 0.52$, just 4% past the limit $r \\le 1/2$. What do you expect?',
      choices: [
        'The error grows by about 4% overall, since $r$ is only 4% too large.',
        'The sawtooth grows by about 8% per step and soon swamps the sine.',
        'The whole profile grows smoothly by a small factor per step.',
        'Nothing visible: the sine decays as usual and the sawtooth with it.',
      ],
      answer: 1,
      explain: 'Only the shortest waves are unstable, and they are hit hardest: $G(\\pi) = 1 - 4r = -1.08$, so the sawtooth changes sign and grows by 8% every step. Compounded, that is a factor of $10^3$ in about 90 steps. Exceeding a stability threshold triggers exponential growth of the shortest grid modes, even while the smooth sine wave ($G \\approx 1 - r\\pi^2\\Delta x^2$) continues to decay accurately.',
    },
    q2: {
      type: 'num',
      q: 'FTCS at $r = 1/2$ needs 500 steps to reach $t = 0.1$ on 50 cells ($\\kappa = 1$). How many steps does it need on 400 cells?',
      answer: 32000,
      tol: 0.01,
      unit: 'steps',
      explain: 'The step is $\\Delta t = r\\Delta x^2/\\kappa$, so eight times more cells means $64$ times smaller steps: $500 \\times 64 = 32{,}000$. Each step also has eight times as many unknowns, so the work grows $512$-fold. Crank–Nicolson with $\\Delta t = 0.005$ would still take 20 steps.',
    },
    q3: {
      type: 'mcq',
      q: 'Crank–Nicolson is stable for every time step. Why does it produce a zig-zag beside a step at $r = 10$, while backward Euler at the same $r$ does not?',
      choices: [
        'It is not really stable for $r > 1/2$; the zig-zag is the start of a blow-up.',
        'Its amplification factor for the shortest waves is close to $-1$: they barely decay and flip sign every step. Backward Euler damps them towards 0.',
        'Rounding error in the tridiagonal solve, which grows with $r$.',
        'The step is under-resolved on 50 cells; any second-order scheme would ring there.',
      ],
      answer: 1,
      explain: 'At $r = 10$, $G(\\pi) = (1-20)/(1+20) = -19/21$, so the sawtooth mode remains bounded and decays slowly while flipping sign each step, whereas the exact heat equation damps it immediately. Backward Euler has $G(\\pi) = 1/41$, eliminating the short-wavelength modes in a step or two, and a Rannacher start (two backward-Euler half steps) damps them while preserving second-order accuracy.',
    },
    q4: {
      type: 'mcq',
      q: 'Which statement describes a stiff problem?',
      choices: [
        'The solution changes rapidly everywhere, so every method needs small steps.',
        'Some modes decay much faster than the solution of interest changes, so an explicit method\'s step is set by stability, not accuracy.',
        'The equations are nonlinear, so an implicit method needs Newton iterations.',
        'Its stiffness ratio is above 1,000.',
      ],
      answer: 1,
      explain: 'Stiffness is a mismatch between the step accuracy needs and the step an explicit method can take. If the solution really changes fast, small steps are needed anyway and an explicit method is the right tool. A large ratio of eigenvalues is a warning sign rather than a sufficient definition, because what matters is whether the fast modes must be resolved. The Prothero–Robinson solution is just $\\cos t$, yet explicit Euler needs $h < 0.002$.',
    },
    q5: {
      type: 'predict',
      q: 'Du Fort–Frankel is explicit and stable for every $r$. In the figure below you will refine the grid with $\\Delta t = \\Delta x/2$. What happens to the error at $t = 0.2$?',
      choices: [
        'It falls like $\\Delta x^2$: the scheme is second order.',
        'It falls like $\\Delta x$, because $\\Delta t$ only shrinks like $\\Delta x$.',
        'It grows towards about 0.7: the scheme converges to a damped wave equation.',
        'It blows up on the finer grids, where $r = n/2$ is large.',
      ],
      answer: 2,
      explain: 'The scheme approximates $u_t + \\kappa(\\Delta t/\\Delta x)^2 u_{tt} = \\kappa u_{xx}$. With $\\Delta t/\\Delta x = 1/2$ the extra term never vanishes, so refining converges to that damped wave equation, whose amplitude at $t = 0.2$ is $-0.574$ instead of $+0.139$. Stability holds throughout, whereas consistency fails along this refinement path, and the Lax equivalence theorem requires both.',
    },
  },
  glossary: {
    'diffusion-equation': {
      term: 'diffusion equation',
      def: 'The heat equation $u_t = \\kappa u_{xx}$ (or $\\kappa\\nabla^2 u$): a quantity spreads at a rate set by the curvature of its profile. Each Fourier mode decays like $e^{-\\kappa k^2 t}$, so short waves die first.',
      section: 'heat',
    },
    'explicit-method': {
      term: 'explicit method',
      def: 'A time-stepping scheme whose new values follow directly from known values, node by node. Cheap per step, but its stability region is bounded, so fast-decaying (stiff) modes force small steps.',
      section: 'heat',
    },
    'implicit-method': {
      term: 'implicit method',
      def: 'A scheme in which the unknown new values appear on both sides of the update, so each step solves a system of equations (tridiagonal for 1D diffusion). More work per step; many are stable for any step.',
      section: 'implicit',
    },
    'thomas-algorithm': {
      term: 'Thomas algorithm',
      def: 'Gaussian elimination for a tridiagonal system: a forward sweep, then back substitution, $8m - 7$ operations for $m$ unknowns. Safe without pivoting when the matrix is diagonally dominant.',
      section: 'implicit',
    },
    'crank-nicolson': {
      term: 'Crank–Nicolson',
      def: 'The 1947 scheme of Crank and Nicolson: average the explicit and implicit spatial differences, which is the trapezoid rule in time. Second order and stable for any step, but stiff modes are multiplied by nearly $-1$ per step, so sharp data ring at large $r$.',
      section: 'crank-nicolson',
    },
    'a-stability': {
      term: 'A-stability',
      def: 'A method is A-stable if its stability region contains the whole left half-plane $\\operatorname{Re} z \\le 0$: no decaying mode can grow, whatever the step (Dahlquist, 1963).',
      section: 'stiffness',
    },
    'l-stability': {
      term: 'L-stability',
      def: 'A-stability plus $R(z) \\to 0$ as $z \\to -\\infty$, so very stiff modes are removed in one step. Backward Euler and BDF2 are L-stable; the trapezoid rule (Crank–Nicolson) is not.',
      section: 'stiffness',
    },
    stiffness: {
      term: 'stiffness',
      def: 'A problem is stiff when some of its modes decay much faster than the solution of interest changes, so an explicit method\'s step is set by stability rather than accuracy. Diffusion on a fine grid is the standard example.',
      section: 'stiffness',
    },
    'method-of-lines': {
      term: 'method of lines',
      def: 'Discretising a PDE in space alone to obtain a system of ODEs $\\mathrm{d}\\mathbf{u}/\\mathrm{d}t = A\\mathbf{u}$, which is then integrated in time with an ODE solver whose stability depends on the eigenvalues of $A$.',
      section: 'stiffness',
    },
    'stability-region': {
      term: 'stability region',
      def: 'The set of $z = h\\lambda$ in the complex plane where a method applied to $y\' = \\lambda y$ does not grow, $|R(z)| \\le 1$. A linear system is integrated stably when every $h\\lambda_k$ lies inside.',
      section: 'stiffness',
    },
    'peclet-number': {
      term: 'Péclet number',
      def: '$\\mathrm{Pe} = aL/\\kappa$: how strongly a flow of speed $a$ carries a quantity, compared with how fast diffusion spreads it over a length $L$. Large Pe means thin layers. Named after Jean Claude Eugène Péclet.',
      section: 'peclet',
    },
    'cell-peclet-number': {
      term: 'cell Péclet number',
      def: '$P = a\\Delta x/\\kappa$, the Péclet number of one grid cell. Central differencing of advection–diffusion keeps the maximum principle only for $|P| \\le 2$; beyond that it wiggles node to node.',
      section: 'peclet',
    },
  },
  pathologies: [
    {
      id: 'ftcs-diffusion-limit',
      name: 'Explicit diffusion past its step limit',
      family: 'stability',
      symptom: 'A sawtooth at the grid scale appears and grows by the same factor every step until it swamps the solution. It often follows a grid refinement that kept the old time step.',
      cause: 'FTCS multiplies the shortest wave by $1 - 4r$ per step, with $r = \\kappa\\Delta t/\\Delta x^2$, and $|1 - 4r| > 1$ once $r > 1/2$. Because $r$ scales like $1/\\Delta x^2$, halving $\\Delta x$ at a fixed step quadruples it.',
      diagnose: 'Compute $\\kappa\\Delta t\\sum_i 1/\\Delta x_i^2$ (it must be at most 1/2), using the largest diffusivity and smallest cells. Plot $\\max|u|$ against step on a log axis: a straight line means one unstable mode growing at a fixed rate.',
      mitigations: [
        'Limit the step: $\\Delta t \\le \\Delta x^2/(2d\\kappa)$ on a uniform grid in $d$ dimensions, computed alongside the CFL limit in adaptive codes.',
        'Treat diffusion implicitly (backward Euler, Crank–Nicolson, BDF2), often pairing implicit diffusion with explicit advection (IMEX or operator splitting) so that each step requires one linear solve.',
        'Sub-cycle: take several explicit diffusion steps per advection step when the diffusive limit is only a few times tighter.',
        'Runge–Kutta–Chebyshev (super-time-stepping) methods, whose stability interval on the negative real axis grows like the square of the number of stages: useful for moderate stiffness.',
      ],
      section: 'heat',
      demo: { widget: 'stiffness-heat', data: { preset: 'ftcs-blowup' } },
    },
    {
      id: 'cn-ringing',
      name: 'Crank–Nicolson ringing',
      family: 'accuracy',
      symptom: 'Sign-alternating wiggles beside jumps, kinks or sudden boundary changes that flip every step and fade only slowly, in a scheme described as unconditionally stable.',
      cause: 'For large $r$ Crank–Nicolson multiplies the shortest waves by $(1 - 2r)/(1 + 2r) \\to -1$: they barely decay and change sign each step. Smooth data have almost no such modes; sharp data or a sudden change put them there.',
      diagnose: 'Watch the total variation, which for the exact solution can only fall: a rise means new extrema. Compute $G(\\pi)$; on the 50-cell step in this chapter new wiggles appear once $r$ passes about 4.',
      mitigations: [
        'Rannacher start-up: replace the first step (or after any sudden change) by two or four backward-Euler half steps, then continue with Crank–Nicolson. Keeps second order.',
        'Take $\\theta$ a little above 1/2, or backward Euler for very large steps: monotone, but first order in time.',
        'Use an L-stable second-order method such as BDF2 or an L-stable implicit Runge–Kutta method.',
        'Use smaller steps while the data are sharp, or smooth the initial discontinuity.',
      ],
      section: 'crank-nicolson',
      demo: { widget: 'stiffness-heat', data: { preset: 'cn-ringing' } },
    },
    {
      id: 'stiff-explicit-blowup',
      name: 'Explicit integrator on a stiff problem',
      family: 'stability',
      symptom: 'An explicit integrator explodes on a smooth, slowly varying solution, or survives only with absurdly small steps, long after the fast transient has gone. An adaptive solver keeps shrinking its step while its error estimates look tiny.',
      cause: 'A fast decaying mode with eigenvalue $\\lambda$ puts $h\\lambda$ outside the bounded stability region of every explicit method unless $h\\lambda$ stays within its real stability interval ($h \\le 2/|\\lambda|$ for Euler, $2.785/|\\lambda|$ for RK4). The mode need not be visible: rounding error seeds it.',
      diagnose: 'Estimate the largest $|\\lambda|$ (the spectral radius of the Jacobian, or $4\\kappa/\\Delta x^2$ for 1D diffusion) and compare $h|\\lambda|$ with the method\'s stability interval; reducing $h$ just below the stability threshold eliminates the blow-up immediately.',
      mitigations: [
        'Use an implicit L-stable method (BDF, Radau IIA, or backward Euler at low accuracy), which is the default in stiff ODE libraries and requires a linear or Newton solve per step.',
        'Treat only the stiff part implicitly (IMEX splitting), when it is linear or local, as with diffusion or fast chemistry.',
        'Remove the fast scale if it is not needed, for example with a quasi-steady approximation.',
        'For moderate stiffness, an explicit method with a long real stability interval (Runge–Kutta–Chebyshev).',
      ],
      section: 'stiffness',
      demo: { widget: 'stiffness-ode', data: { preset: 'euler-broken' } },
    },
    {
      id: 'peclet-wiggles',
      name: 'Cell-Péclet wiggles',
      family: 'accuracy',
      symptom: 'Node-to-node oscillations in a steady advection–diffusion solution, usually just upstream of an outflow boundary or a thin layer, with values outside the range of the boundary data.',
      cause: 'Central differencing gives the downstream neighbour the weight $1 - P/2$, which is negative when the cell Péclet number $P = a\\Delta x/\\kappa$ exceeds 2. The discrete solution then contains powers of a negative number.',
      diagnose: 'Compute $P$ cell by cell in each direction. Check the discrete maximum principle: the solution should stay between its boundary values.',
      mitigations: [
        'Refine where $P > 2$, locally near the layer.',
        'Upwind the advection term: always monotone but first order, with numerical diffusion $|a|\\Delta x/2$ that thickens layers.',
        'Exponential fitting (Allen–Southwell, Il\'in, Scharfetter–Gummel) or its cheap approximations, the hybrid and power-law schemes: monotone, and exact at the nodes for constant coefficients.',
        'Higher-order bounded schemes with flux limiters, which avoid wiggles without first-order smearing everywhere.',
      ],
      section: 'peclet',
      demo: { widget: 'stiffness-peclet', data: { preset: 'central-wiggles' } },
    },
    {
      id: 'dufort-frankel-inconsistency',
      name: 'Stable but inconsistent (Du Fort–Frankel)',
      family: 'accuracy',
      symptom: 'A scheme that never blows up converges, under refinement, to the wrong answer: the error stops falling, or grows.',
      cause: 'Du Fort–Frankel is stable for every $r$, but its truncation error contains $\\kappa(\\Delta t/\\Delta x)^2 u_{tt}$. Refined with $\\Delta t/\\Delta x$ fixed, that term survives, and the scheme approximates a damped wave equation instead of the heat equation.',
      diagnose: 'Run a refinement study along the path you will actually use (for example $\\Delta t \\propto \\Delta x$) against an exact or manufactured solution: the observed order is near zero or negative. Derive the modified equation.',
      mitigations: [
        'Refine with $\\Delta t/\\Delta x \\to 0$ (for example $\\Delta t \\propto \\Delta x^2$), which reimposes the quadratic step-size scaling of an explicit diffusion solver.',
        'Use a consistent unconditionally stable scheme instead: backward Euler, Crank–Nicolson or BDF2.',
        'Check consistency and stability together (Lax equivalence): stability alone says nothing about the limit.',
      ],
      section: 'inconsistency',
      demo: { widget: 'stiffness-dufort', data: { preset: 'broken' } },
    },
  ],
};
