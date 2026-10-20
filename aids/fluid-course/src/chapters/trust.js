// Chapter 15: Can you trust the numbers? Verification and validation.
// Widgets live in ./trust/; the numbers come from src/sims/verification.js
// (manufactured solutions, GCI, summation, oscillator), lbm.js and the
// ch-trust-* kernels (parallel reduction, benchmark sampling). Every number
// quoted in the prose is checked in tests/fluid-course/ch-trust.test.js.

import { mountMms } from './trust/mms.js';
import { mountGci } from './trust/gci.js';
import { mountFloat, mountReduce } from './trust/float.js';
import { mountBenchmark } from './trust/bench.js';

export const chapter = {
  id: 'trust',
  title: 'Can you trust the numbers?',
  short: 'Verification',
  blurb: 'Verification and validation: convergence studies, manufactured solutions, and Richardson extrapolation.',
  minutes: 45,
  html: String.raw`
<p class="lead-in">Every chapter so far has ended with a way for a simulation to go wrong. Some failures are loud: the solution blows up and fills with NaNs. The dangerous ones are quiet. The code runs, the picture looks like a flow, and the number you report is wrong by five per cent. This chapter is about how you find out. It splits the question in two, turns each half into a procedure you can run, and ends with a field guide to the failures of the whole course.</p>

<h2 id="v-and-v">Two questions: verification and validation</h2>

<p>A simulation result $S$ differs from what nature does, $T$, for two kinds of reason. The first is the <em>model</em>. The equations you chose are an idealisation: a continuum, a Newtonian viscosity, an incompressible flow, a turbulence model, an inflow profile somebody guessed. Even solved exactly, they would not give $T$. The second is the <em>numerics</em>. The computer does not solve those equations exactly. It replaces derivatives by differences, stops an iterative solver early, rounds every operation, and may contain mistakes. Call the exact solution of the model equations $M$. Then</p>

<div class="eq" id="eq-error-split">$$\underbrace{S - T}_{\text{total error}} \;=\; \underbrace{(S - M)}_{\text{numerical error}} \;+\; \underbrace{(M - T)}_{\text{model error}}.$$<span class="eq-tag">(15.1)</span></div>

<p><dfn data-term="verification">Verification</dfn> deals with the first bracket. It is mathematics: it asks whether you are solving the equations right. <dfn data-term="validation">Validation</dfn> deals with the second. It is physics: it asks whether you are solving the right equations. The two-line slogan comes from software engineering and was carried into computational fluid dynamics by Patrick Roache, among others.</p>

<aside class="who" data-person="patrick-roache">Roache wrote one of the first textbooks on computational fluid dynamics (1972). Later he pressed the field to keep verification and validation apart, helped develop manufactured solutions with Stanly Steinberg, and proposed the Grid Convergence Index (1994). His 1998 book collects the whole programme.</aside>

<p>The order matters. Validation without verification proves nothing, because you cannot tell which bracket of (15.1) you are looking at. Suppose a coarse grid smears a mixing layer through <a href="#/advection/diffusion-dispersion">numerical diffusion</a>, and the turbulence model under-predicts mixing. The two errors can cancel, and the run matches the experiment. Refine the grid and the agreement gets <em>worse</em>. The gallery calls this <a href="#/pathologies/numerical-dissipation-as-model">numerical dissipation acting as a model</a>. The only defence is to measure the numerical error first, so that what remains can be blamed on the model.</p>

<p>Verification itself has two parts, and they answer different questions:</p>

<table>
<thead><tr><th>Activity</th><th>Question</th><th>Compared with</th><th>Section</th></tr></thead>
<tbody>
<tr><td>Code verification</td><td>Does the code solve its equations correctly, at its design order?</td><td>An exact solution, often manufactured</td><td><a href="#/trust/code-verification">Manufactured solutions</a></td></tr>
<tr><td>Solution verification</td><td>How large is the numerical error in <em>this</em> run?</td><td>The same run on other grids</td><td><a href="#/trust/solution-verification">Three grids</a></td></tr>
<tr><td>Validation</td><td>How well do the equations describe reality?</td><td>Experiments, with their uncertainty</td><td><a href="#/trust/validation">Benchmarks</a></td></tr>
</tbody>
</table>

<p>Code verification is done once per code (and again after every change). It needs a problem with a known answer, and it tests the code, not any one result. Solution verification is done for every result you report. Its problem has no known answer, so it has to estimate the error from the way the answer changes with the grid. Round-off, the fourth source of numerical error, cuts across both; it gets <a href="#/trust/floating-point">its own section</a>.</p>

<aside class="note" data-label="Where the words come from">Software engineers drew the distinction first. Barry Boehm put it as building the product right against building the right product; the phrasing is often dated to 1979, and it was in print in <em>IEEE Software</em> by 1984. In fluid dynamics the verification half is mathematics you can finish. The validation half never ends: a model is validated only for the flows you compared it with, to the accuracy the experiments allowed.</aside>

<p>Notice what verification cannot promise. A verified code with a small, well-estimated numerical error can still be wrong about the world, because the model may be wrong. Verification tells you that the remaining disagreement is the model's fault. It does not tell you there is none.</p>

<div data-quiz="q1"></div>

<h2 id="code-verification">Code verification: manufactured solutions</h2>

<p>To test a code you need a problem whose exact answer you know. Classical exact solutions are rare and lazy. Poiseuille flow, which you will run <a href="#/trust/validation">at the end of the chapter</a>, has a known answer, but in it the advection term is zero, so a bug in the advection term goes unseen. No textbook solution exercises every term of a real code.</p>

<p>The way out is to run the logic backwards. Choose the answer first: any smooth function you like. Put it into the equations and see what is left over. That leftover is a source term. Add it to the code's right-hand side and your chosen function becomes an exact solution. This is the method of <dfn data-term="manufactured-solution">manufactured solutions</dfn> (MMS). The function need not be physical; it must be smooth, and make every term and every boundary condition do some work.</p>

<p>Here is a small test problem with three terms (diffusion, advection and reaction) and two kinds of boundary condition:</p>

<div class="eq" id="eq-mms-problem">$$-\nu\, u'' + a\, u' + \kappa\, u = s(x), \qquad 0 \le x \le 1, \qquad u(0) = u_m(0), \quad u'(1) = u_m'(1).$$<span class="eq-tag">(15.2)</span></div>

<p>The code under test uses second-order central differences in the interior and a ghost point for the slope condition at $x = 1$, so it should be second order everywhere. Manufacture</p>

<div class="eq" id="eq-mms-source">$$u_m(x) = 1 + e^{-x}\sin 3x, \qquad s(x) = -\nu\, u_m'' + a\, u_m' + \kappa\, u_m,$$<span class="eq-tag">(15.3)</span></div>

<p>with $\nu = 0.1$, $a = 1$ and $\kappa = 1$. The derivatives are worked out by hand, not by the code. Then solve on grids of $N = 10, 20, \dots, 320$ cells and measure the largest error $E_h = \max_i |u_i - u_m(x_i)|$.</p>

<p>The test is not whether the error is small or whether it shrinks. Almost any bug that does not crash a code still lets the error shrink. The test is the <dfn data-term="order-of-accuracy">order of accuracy</dfn>: a second-order code must cut the error by four every time $h$ halves. The <em>observed</em> order from two grids with ratio $r$ is (as in <a href="#/discretization/convergence">chapter 6</a>)</p>

<div class="eq" id="eq-observed-order">$$p_{\text{obs}} = \frac{\ln\left(E_h / E_{h/r}\right)}{\ln r}.$$<span class="eq-tag">(15.4)</span></div>

<p>A correct code gives $E = 1.05 \times 10^{-2}$ at $N = 10$ and $1.04 \times 10^{-5}$ at $N = 320$, with observed orders $1.98, 2.00, 2.00, 2.00, 2.00$. Before you plant a bug, predict what one wrong line does.</p>

<div data-quiz="q2"></div>

<figure data-widget="trust-mms"><figcaption>The MMS lab. The first plot shows the largest error against grid spacing on log–log axes, with reference slopes 1 and 2; the second shows the manufactured solution and the computed one on a coarse grid. The table lists the observed order (15.4) for each refinement.</figcaption></figure>

<div class="try"><ol>
<li>Pick <em>First-order Neumann closure</em>. The orders read $1.60, 0.58, 0.83, 0.92, 0.96$: they wander before settling at 1. On the coarsest grid the buggy code's error, $7.41 \times 10^{-3}$, is <em>smaller</em> than the correct code's. One wrong row in hundreds sets the order of the whole solution.</li>
<li>Pick <em>Coefficient typo in advection</em> (a 4 where a 2 belongs). The error stalls near $0.23$ and the order falls to 0. The code converges, to the solution of a different equation.</li>
<li>Pick <em>Source at the wrong point</em>. Order 1. The error still falls, so a test that only asked "does it converge?" would pass.</li>
<li>Switch the advection term to <em>upwind</em> with no bug. Order 1, and the verdict is a pass. The test compares the code with its design, not with a wish.</li>
<li>Now pick the <em>diffusion typo</em> and switch to the linear solution $1 + 2x$. The error is round-off on every grid. The bug is still there.</li>
</ol></div>

<p>The last experiment shows the method's main weakness. For a linear $u_m$ every difference formula is exact, so a mistake in the diffusion term or the boundary closure leaves no trace. That is why (15.3) multiplies an exponential by a sine: no derivative vanishes or is constant.</p>

<aside class="history" data-era="1985">The idea grew out of computer algebra. Steinberg and Roache used symbolic manipulation to generate source terms for testing CFD codes (<em>J. Comput. Phys.</em>, January 1985, with a companion <em>AIAA Journal</em> paper in 1984). The phrase "manufactured solution" came later: Salari and Knupp trace it to a 1995 AIAA paper by Oberkampf, Blottner and Aeschliman. Some sources date the method to 1984 and some to 1985; both papers exist.</aside>

<p>What can MMS find? Kambiz Salari and Patrick Knupp at Sandia tested this systematically. Their 2000 report includes a blind test in which mistakes were planted in a working code, 21 cases in all, one of them a placebo with no mistake. They concluded that the method "can identify any coding mistake that affects the order-of-accuracy of the numerical method". What it cannot find follows from the same sentence:</p>

<ul>
<li>Mistakes that do not change the order, such as a correct but slow solver.</li>
<li>Code paths the test never runs. A smooth $u_m$ does not exercise shock capturing or limiters, and a test without a slope boundary does not test the slope boundary.</li>
<li>Wrong physics. A wrong viscosity typed into the input file, or a missing term in the model, is invisible: the code is verified against the equations it was given.</li>
</ul>

<p>The method also asks something of the code. In Salari and Knupp's words, its main limitation is "the requirement that the code contain an option for input of distributed source terms and spatially-variable boundary data".</p>

<aside class="pitfall">Look at the second plot with the advection typo at $N = 40$. The computed curve is smooth and close to the manufactured one: nothing about it looks broken. Only the refinement study shows that it will never get closer. A plot of one solution on one grid verifies nothing.</aside>

<h2 id="solution-verification">Solution verification: an error bar from three grids</h2>

<p>A verified code still makes discretisation error on every run. For a real problem you do not know the exact answer, so you cannot measure that error. You can estimate it. If the grid is fine enough that the error in some quantity $f$ behaves like $f_h \approx f_0 + C h^p$, then results on three grids contain three unknowns, $f_0$, $C$ and $p$, and three equations. That is <a href="#/discretization/richardson">Richardson's deferred approach to the limit</a>, turned from a way of improving a number into a way of judging it.</p>

<p>Number the grids from fine to coarse: $h_1 < h_2 < h_3$, with a constant ratio $r = h_2/h_1 = h_3/h_2$. The observed order and the extrapolated value are</p>

<div class="eq" id="eq-three-grid-order">$$p = \frac{\ln\left(\dfrac{f_3 - f_2}{f_2 - f_1}\right)}{\ln r},$$<span class="eq-tag">(15.5)</span></div>

<div class="eq" id="eq-richardson-extrapolation">$$f_0 \approx f_1 + \frac{f_1 - f_2}{r^p - 1}.$$<span class="eq-tag">(15.6)</span></div>

<p>Equation (15.6) is <dfn data-term="richardson-extrapolation">Richardson extrapolation</dfn>. It only makes sense when $(f_2 - f_1)/(f_3 - f_2)$ lies between 0 and 1: the results converge <em>monotonically</em>. If the ratio is negative they zig-zag (<em>oscillatory</em>); if it is 1 or more the differences grow (<em>divergent</em>) and there is nothing to extrapolate.</p>

<aside class="who" data-person="lewis-fry-richardson">Richardson extrapolated the $h^2$ error of central differences in his masonry-dam paper (presented 1910, printed 1911), and with J. A. Gaunt wrote it up systematically as "the deferred approach to the limit" (1927).</aside>

<p>Roache's point in 1994 was that the extrapolated value is less trustworthy than the size of the correction. So report the finest result with an error band rather than replacing it. His <dfn data-term="grid-convergence-index">Grid Convergence Index</dfn> is the relative correction of (15.6), multiplied by a safety factor:</p>

<div class="eq" id="eq-gci">$$\mathrm{GCI}_{\text{fine}} = \frac{F_s\,|e_a|}{r^p - 1}, \qquad e_a = \frac{f_1 - f_2}{f_1}, \qquad F_s = 1.25 \text{ with three grids}.$$<span class="eq-tag">(15.7)</span></div>

<p>With only two grids and an assumed $p$, Roache used $F_s = 3$. Celik, Ghia, Roache and Freitas (2008) turned this into a step-by-step procedure for the <em>Journal of Fluids Engineering</em>, including grids whose ratios differ (the order then comes from a short iteration). The figure runs that procedure.</p>

<aside class="history" data-era="1994">Roache wrote the GCI for authors who were not reporting grid studies at all. His abstract ends with the remark that the simple formulas "may be applied a posteriori by editors and reviewers, even if authors are reluctant to do so".</aside>

<p>The figure takes a quantity from the MMS problem, the value $u(1)$ at the slope boundary, computed on grids $N$, $2N$ and $4N$. Here, unusually, you also know the exact answer, so you can check the error bar.</p>

<figure data-widget="trust-gci"><figcaption>Three grid results (dots) against grid spacing, the Richardson curve through them, the extrapolated value at $h = 0$, and the GCI band around the finest result (shaded, with a bar at $h_1$). The dotted line is the exact value, known here because the solution was manufactured.</figcaption></figure>

<div class="try"><ol>
<li>With the correct code and $N = 10$: $p = 1.98$ and the band is $\pm 0.081\,\%$. The finest grid's true error is $0.064\,\%$, inside the band, and the extrapolated value is off by only $0.0011\,\%$. This is a study in its <dfn data-term="asymptotic-range">asymptotic range</dfn>.</li>
<li>Switch on the boundary bug and set $N = 6$. Grids 12 and 24 agree to $0.008\,\%$, so $p = 6.6$ and the band shrinks to $\pm 10^{-4}\,\%$. The true error is $0.215\,\%$, about two thousand times the band. Switch on the fourth grid: the next triple is oscillatory, with $p = 3.3$.</li>
<li>With the bug, try $N = 13$ to 18: the class is divergent, and the procedure refuses to give a band.</li>
<li>With the bug at $N = 20$: $p = 0.18$. The band is wide ($\pm 0.63\,\%$) and does contain the truth, but the extrapolated value is $0.41\,\%$ low, worse than the finest grid itself.</li>
<li>Switch to <em>a table of three results</em> and pick the Celik et al. examples. The printed values from their Table 1 appear beside the computed ones.</li>
</ol></div>

<p>The second experiment is <a href="#/pathologies/false-convergence">false convergence</a>, and it is the reason grid studies need three grids, not two. On coarse grids the boundary error and the interior error have opposite signs. At one resolution they nearly cancel, two successive results agree by accident, and every formula above believes them. The warning sign was there: an observed order of 6.6 from a scheme whose design order is 2. An observed order that wanders, or sits far from the design order, means the grids are not yet in the asymptotic range; the gallery lists this as <a href="#/pathologies/pre-asymptotic">pre-asymptotic grids</a>.</p>

<details class="deeper"><summary>Go deeper: a check that cannot fail</summary>
<p>Roache also proposed a check that three grids are in the asymptotic range: the ratio $\mathrm{GCI}_{32} / (r^p\, \mathrm{GCI}_{21})$ should be close to 1. With a constant ratio $r$ this is not a test. Put (15.5) into (15.7): $r^p = (f_3 - f_2)/(f_2 - f_1)$, and the ratio reduces exactly to $f_1/f_2$, which is close to 1 for any three results that are close to each other. In the false-convergence case above it is 1.0001. Checks that do carry information are the two you met: compare the observed $p$ with the design order, and repeat the study with a fourth grid.</p>
</details>

<p>Grid studies need the other numerical errors to be smaller than the discretisation error you are measuring. An iterative solver stopped at a <a href="#/solvers/cost">loose tolerance</a> adds an error that does not shrink with $h$, and so does round-off. The next section is about the second of these.</p>

<div data-quiz="q3"></div>

<h2 id="floating-point">Round-off that adds up</h2>

<p><a href="#/discretization/round-off">Chapter 6</a> showed that one rounding is tiny (about $10^{-16}$ in double precision) unless you subtract nearly equal numbers. A long simulation does billions of operations, and the roundings add up. Roundings that fall randomly on either side partly cancel and grow roughly like $\sqrt{n}$; roundings that always fall the same way grow like $n$. Worse than either is adding a small number to a large one.</p>

<p>Think of a mass budget: a total of 1 kg receives $10^{-8}$ kg per step from an inflow. In single precision (Float32) the gap between neighbouring numbers near 1 is $2^{-23} \approx 1.19 \times 10^{-7}$. The exact sum $1 + 10^{-8}$ lies less than half a gap above 1, so it rounds back to 1 at every step. After a million steps the exact total is 1.01 kg and the computed one is exactly 1 kg: all the inflow is lost, silently.</p>

<p>The repair is to keep the lost bits. <dfn data-term="kahan-summation">Kahan summation</dfn> (1965) carries a correction $c$ beside the sum $s$:</p>

<div class="eq" id="eq-kahan">$$\begin{aligned} y &= x_i - c, \\ t &= s + y, \\ c &= (t - s) - y, \\ s &= t. \end{aligned}$$<span class="eq-tag">(15.8)</span></div>

<p>In exact arithmetic $c$ is always zero. In floating point, $(t - s)$ is the part of $y$ that made it into $t$, so $c$ is minus the part rounded away, and the next step adds it back. By Higham's bounds, plain summation of $n$ terms can err by about $(n-1)\,u \sum |x_i|$, where $u$ is the unit round-off ($2^{-24}$ in Float32); Kahan summation by about $2u \sum |x_i|$, whatever $n$ is.</p>

<div data-quiz="q4"></div>

<figure data-widget="trust-float" data-preset="stall"><figcaption>A running total fed a million increments, summed plainly and with Kahan's correction (15.8), with the plain sum's worst-case bound. The <em>oscillator</em> experiment integrates $x'' = -x$ for a million steps in Float32 beside Float64.</figcaption></figure>

<div class="try"><ol>
<li>At the preset (Float32, $10^{-8}$) the plain sum loses everything; Kahan's loses $9.5 \times 10^{-7}$ of it. The readout <em>increment ÷ half-gap at the total</em> is 0.17: below 1, every addition rounds away.</li>
<li>Drag the increment up past $5.96 \times 10^{-8}$, half the gap. The ratio crosses 1, and now each addition rounds <em>up</em> to a whole gap: at $6 \times 10^{-8}$ the plain total gains 98.7 % too much mass.</li>
<li>At $10^{-6}$ the plain sum loses 4.6 %: every rounding has the same sign. Vary the increments by ±50 % and the loss falls to 0.1 % as the roundings partly cancel. Kahan's error is about twenty thousand times smaller.</li>
<li>Float64 with $10^{-10}$: the plain error, $8.3 \times 10^{-8}$ of the inflow, grows in a straight line.</li>
<li>Pick <em>a long oscillator run</em>. Symplectic Euler conserves a slightly modified energy exactly, so its drift is pure round-off: $4.6 \times 10^{-14}$ in Float64, $6.8 \times 10^{-6}$ in Float32. The phase gap reaches $2.17 \times 10^{-4}$ rad; storing $\Delta t = 0.01$ in Float32 shifts the frequency and predicts $2.24 \times 10^{-4}$ by itself. Give Float64 the same rounded constants and the gap falls to $7.0 \times 10^{-6}$.</li>
</ol></div>

<p>Two lessons follow. The scheme's own error after a million steps, $1.5 \times 10^{-2}$, dwarfs any round-off: Float32 is often good enough for a simulation's state. What needs care is constants and accumulators. The Float32 clock, updated by $t \leftarrow t + \Delta t$, is off by 135 time units at $t = 10^4$ and stops altogether at $t = 2^{18} = 262\,144$, where half the gap between floats reaches $\Delta t$. Count steps with an integer and compute $t = n\,\Delta t$.</p>

<aside class="pitfall">Fast-math compiler modes may simplify $(t - s) - y$ to zero, as it is in exact arithmetic, silently deleting Kahan's correction. Keep a test that the compensated sum beats the plain one.</aside>

<p>Round-off has one more surprise. A parallel code splits a sum among threads and combines the partial sums. Change the thread count and the additions change, so the rounded answer changes. Every answer is within the error bound, so none is wrong, but the result now depends on the machine.</p>

<figure data-widget="trust-reduce"><figcaption>The same 16,384 numbers summed with 1 to 64 threads, each taking a contiguous chunk. Each dot is one thread count's answer minus the exact sum, in units in the last place (ulps). The <em>mixed signs</em> data largely cancel, so the sum is worse conditioned.</figcaption></figure>

<div class="try"><ol>
<li>Positive numbers in Float32: 8 different answers, spread over 11 ulps. Switch to Kahan: one answer.</li>
<li>Mixed signs in Float64: 22 different answers spread over 55 ulps (a relative spread of $1.0 \times 10^{-14}$; the condition number is 68). Kahan narrows this to 3 answers within 2 ulps, but does not remove it.</li>
</ol></div>

<aside class="pitfall">Library functions are not exempt: while this figure was being built, $10^y$ in Node.js and in a current Chrome differed in the last bit for 1,613 of the 16,384 data values, which changed the answers above. The data are now built from exact operations.</aside>

<p>For a steady flow the spread is harmless. For a chaotic one it is not: turbulence amplifies a last-bit difference like any other perturbation, so two runs on different processor counts part company, though their statistics should agree. For bitwise reproducibility (for debugging, or tests that compare outputs exactly), fix the reduction order whatever the thread count, or use a reproducible summation algorithm such as Demmel and Nguyen's (2013).</p>

<aside class="history" data-era="1961"><a href="#/people/edward-lorenz">Edward Lorenz</a> restarted a weather model from numbers he typed in from a printout. The printout showed three decimal places; the machine held six. The restarted run matched the old one at first, then drifted until the two were as different as two random states. Rounding, in a chaotic system, is enough to lose the trajectory.</aside>

<h2 id="validation">Validation: benchmarks and experiments</h2>

<p>Once the numerical error is known, you can compare with something outside the code. A <dfn data-term="benchmark">benchmark</dfn> is a problem with a documented reference answer. References come in three strengths. An <em>exact solution</em> of the model equations (Poiseuille or Couette flow, the decaying <a href="#/lattice-particles/lbm-limits">Taylor–Green vortex</a>, the exact Riemann solution behind <a href="#/shocks/sod">Sod's shock tube</a>) is strictly a verification test, but of the whole code with its real boundary conditions. A <em>high-accuracy computation</em> by someone else compares your code with theirs. Only an <em>experiment</em> validates the model, because only an experiment is the world.</p>

<p>The figure runs two benchmarks on the <a href="#/lattice-particles/lbm">lattice Boltzmann</a> code of chapter 13. The first is plane Poiseuille flow, a channel driven by a uniform body force, whose exact profile is a parabola.</p>

<figure data-widget="trust-benchmark"><figcaption>In channel mode the first plot is the computed velocity profile beside the exact parabola, and the second the error at each cell as a percentage of $u_{\max}$, with the steady error predicted by $(16\Lambda - 3)/(3H^2)$. In cavity mode the two plots are the centreline velocities of the lid-driven cavity at Re = 100, beside the tabulated values of Ghia, Ghia and Shin (1982).</figcaption></figure>

<div class="try"><ol>
<li>At the preset (BGK collision, $\tau = 2$, $H = 24$) the flow starts from rest and settles to a profile that is off by $1.91\,\%$ of the peak velocity, the same amount at every cell. The fluid slips at the walls.</li>
<li>Change $H$: the error is $17.2\,\%$ at $H = 8$, $4.30\,\%$ at 16 and $0.48\,\%$ at 48. It falls as $1/H^2$, second order, as it should, but it is there.</li>
<li>Move $\tau$. The error matches $(16\Lambda - 3)/(3H^2)$ with $\Lambda = (\tau - \tfrac12)^2$ to every digit shown. It changes sign at $\tau = \tfrac12 + \sqrt{3/16} \approx 0.933$, where BGK is exact.</li>
<li>Switch to TRT with $\Lambda = 3/16$: exact to round-off at any $\tau$.</li>
<li>Switch to the cavity, run it at each grid size, and watch the largest deviation from Ghia et al.: about $2.0\,\%$ of the lid speed at $24 \times 24$, $1.2\,\%$ at 32, $0.66\,\%$ at 48 and $0.49\,\%$ at 64.</li>
</ol></div>

<p>The channel shows why exact solutions are worth running even for codes you trust. The wall slip of bounce-back under BGK depends on $\tau$, a parameter that only sets the viscosity and has no business moving the wall. The two-relaxation-time collision (Ginzburg, Verhaeghe and d'Humières 2008) fixes it with $\Lambda = 3/16$. Without an exact answer to compare with, a 2 % slip would look like physics.</p>

<p>The cavity is a numerical benchmark. A square box of fluid is driven by its sliding lid; at Re = 100 one main vortex fills it. In 1982 Ghia, Ghia and Shin tabulated the velocity along the two centrelines, and their tables became the standard first check for incompressible codes. In the figure the deviation falls with refinement, from 2 % to 0.5 %, and then stops falling: at $96 \times 96$ it is still 0.5 %. Halving the lid speed (to reduce the lattice's compressibility error) changes little.</p>

<aside class="who" data-person="ghia-ghia-shin">Their 1982 paper computed the driven cavity with a multigrid Navier–Stokes solver. Its centreline tables are cited as "Ghia et al." in thousands of papers, often as if matching them proved a code right.</aside>

<p>That last habit is the trap. Ghia's numbers are a finite-difference solution, not exact values. When your code agrees with them to 0.5 %, you have reached the resolution of the comparison: you cannot tell whether the remaining difference is your error or theirs. Later reference solutions are more accurate (Botella and Peyret's spectral results in 1998; Erturk, Corke and Gökçöl's fine-grid results in 2005). To go further, compare with those, or run your own grid study and put an error bar on your own side.</p>

<p>Experiments bring an error bar of their own. The ASME standard V&amp;V 20 (2009) writes the validation comparison as</p>

<div class="eq" id="eq-vv20">$$E = S - D, \qquad u_{\text{val}} = \sqrt{u_{\text{num}}^2 + u_{\text{input}}^2 + u_D^2}, \qquad \delta_{\text{model}} \in \left[E - u_{\text{val}},\; E + u_{\text{val}}\right],$$<span class="eq-tag">(15.9)</span></div>

<p>where $S$ is the simulation, $D$ the measurement, and the three uncertainties are numerical (a GCI, say), from uncertain inputs (properties, boundary conditions), and experimental. If $|E|$ is much larger than $u_{\text{val}}$, the model error is about $E$ and you know which way to fix it. If $|E|$ is smaller than $u_{\text{val}}$, the model is as good as this comparison can tell, and claiming more is not honest.</p>

<aside class="history" data-era="1839">The exact channel and pipe solutions carry the names of two experimenters. <a href="#/people/gotthilf-hagen">Hagen</a> measured water in narrow brass tubes in 1839, and <a href="#/people/jean-leonard-marie-poiseuille">Poiseuille</a>, a physician interested in blood flow, measured glass capillaries in notes read in December 1840. Neither derived the parabolic profile from theory; that came later.</aside>

<div data-quiz="q5"></div>

<h2 id="checklist">A field guide to wrong answers</h2>

<p>When a result looks wrong, or looks right for no reason you can name, work through the sources of error in a fixed order. Each step assumes the ones before it.</p>

<ol>
<li><strong>Verify the code.</strong> Run manufactured solutions for every term and boundary type you use, and check the observed order against the design order.</li>
<li><strong>Converge the iterations.</strong> Tighten the solver tolerance until the result stops changing at the digits you report (<a href="#/solvers/cost">chapter 11</a>).</li>
<li><strong>Study the grid.</strong> Use three grids or more with a constant ratio. Report $p$, the convergence class and the GCI, and be suspicious when $p$ is far from the design order.</li>
<li><strong>Study the time step</strong> in the same way, for unsteady results.</li>
<li><strong>Check the round-off.</strong> Rerun in higher precision, or with compensated sums for long accumulations, and compare.</li>
<li><strong>Validate.</strong> Compare with benchmarks and experiments, with uncertainties on both sides, as in (15.9).</li>
</ol>

<p>And when something specific goes wrong, here is where the course met it. The last column links the <a href="#/pathologies">rogues' gallery</a>, where each failure has a live demonstration.</p>

<table>
<thead><tr><th>What you see</th><th>Likely cause</th><th>Where to read</th><th>Gallery</th></tr></thead>
<tbody>
<tr><td>A sawtooth at the grid scale that doubles every few steps, then NaNs</td><td>A stability limit broken: CFL number, explicit diffusion limit, $\tau \to \tfrac12$</td><td><a href="#/advection/cfl">CFL</a>, <a href="#/stiffness/heat">heat equation</a>, <a href="#/lattice-particles/lbm-limits">LBM limits</a></td><td><a href="#/pathologies/cfl-violation">CFL</a>, <a href="#/pathologies/ftcs-diffusion-limit">diffusion limit</a>, <a href="#/pathologies/lbm-tau-instability">τ</a></td></tr>
<tr><td>Steady blow-up even at a tiny time step</td><td>An unconditionally unstable scheme (FTCS for advection)</td><td><a href="#/advection/von-neumann">von Neumann analysis</a></td><td><a href="#/pathologies/ftcs-instability">FTCS</a></td></tr>
<tr><td>Wiggles next to fronts and shocks; values outside the physical range</td><td>Dispersive error of a high-order linear scheme (Godunov's theorem)</td><td><a href="#/advection/diffusion-dispersion">dispersion</a>, <a href="#/shocks/godunov-theorem">Godunov</a></td><td><a href="#/pathologies/dispersive-wiggles">wiggles</a>, <a href="#/pathologies/gibbs-oscillations">Gibbs</a></td></tr>
<tr><td>Fronts smeared, peaks shrinking, vortices dying early</td><td>Numerical diffusion of a low-order or semi-Lagrangian scheme</td><td><a href="#/advection/diffusion-dispersion">diffusion</a>, <a href="#/stable-fluids/semi-lagrangian">semi-Lagrangian</a></td><td><a href="#/pathologies/numerical-diffusion">diffusion</a>, <a href="#/pathologies/semi-lagrangian-smearing">smearing</a></td></tr>
<tr><td>Wiggles in a steady advection–diffusion solution</td><td>Cell Péclet number above 2 with central differences</td><td><a href="#/stiffness/peclet">Péclet</a></td><td><a href="#/pathologies/peclet-wiggles">Péclet</a></td></tr>
<tr><td>A shock in the wrong place</td><td>A non-conservative form of the equations</td><td><a href="#/shocks/rankine-hugoniot">Rankine–Hugoniot</a></td><td><a href="#/pathologies/wrong-shock-speed">shock speed</a></td></tr>
<tr><td>A total that should be conserved drifts</td><td>Non-conservative discretisation, an incomplete projection, or round-off accumulation</td><td><a href="#/conservation/finite-volume">finite volumes</a>, <a href="#/pressure/projection">projection</a>, <a href="#/trust/floating-point">round-off</a></td><td><a href="#/pathologies/nonconservative-leak">leak</a>, <a href="#/pathologies/incomplete-projection">projection</a>, <a href="#/pathologies/roundoff-accumulation">round-off</a></td></tr>
<tr><td>A pressure field like a chessboard</td><td>Pressure and velocity stored at the same points</td><td><a href="#/pressure/checkerboard">checkerboard</a></td><td><a href="#/pathologies/checkerboard-pressure">checkerboard</a></td></tr>
<tr><td>A residual that falls fast, then crawls</td><td>A stationary iteration damping only the high frequencies</td><td><a href="#/solvers/relaxation">relaxation</a>, <a href="#/solvers/multigrid">multigrid</a></td><td><a href="#/pathologies/relaxation-stall">stall</a></td></tr>
<tr><td>Energy piling up at the smallest resolved scales</td><td>Aliasing, or a grid too coarse for the flow</td><td><a href="#/turbulence/aliasing">aliasing</a></td><td><a href="#/pathologies/aliasing-instability">aliasing</a>, <a href="#/pathologies/spectral-pileup">pile-up</a></td></tr>
<tr><td>Smooth convergence to an answer that is wrong</td><td>An inconsistent scheme, or a bug that changes the equation</td><td><a href="#/stiffness/inconsistency">inconsistency</a>, <a href="#/trust/code-verification">MMS</a></td><td><a href="#/pathologies/dufort-frankel-inconsistency">Du Fort–Frankel</a></td></tr>
<tr><td>Observed order below design, or wandering</td><td>A low-order component (boundary closure, limiter, non-smooth data) or grids not yet asymptotic</td><td><a href="#/trust/code-verification">MMS</a>, <a href="#/trust/solution-verification">grid studies</a></td><td><a href="#/pathologies/pre-asymptotic">pre-asymptotic</a></td></tr>
<tr><td>Two grids agree, but a third or fourth does not</td><td>Error terms cancelling by accident on coarse grids</td><td><a href="#/trust/solution-verification">grid studies</a></td><td><a href="#/pathologies/false-convergence">false convergence</a></td></tr>
<tr><td>Error that grows as the step shrinks, below some step</td><td>Round-off overtaking truncation</td><td><a href="#/discretization/round-off">round-off</a></td><td><a href="#/pathologies/roundoff-floor">round-off floor</a></td></tr>
<tr><td>Last digits differ between runs or machines</td><td>The order of a parallel reduction</td><td><a href="#/trust/floating-point">round-off</a></td><td></td></tr>
<tr><td>Agrees with the exact solution, but not with the experiment</td><td>The model, at last: closure, boundary data, missing physics</td><td><a href="#/trust/validation">validation</a>, <a href="#/turbulence/modelling">turbulence models</a></td><td><a href="#/pathologies/numerical-dissipation-as-model">dissipation as model</a></td></tr>
</tbody>
</table>

<p>Two habits cover most of the table. Run every new code, and every change to an old one, against a problem with a known answer, at more than one resolution. And never report a number from a single grid: three results and an order cost little more than one, and they turn a number into a measurement.</p>

<p>That is the course's last lesson, and it applies to the course too. Every figure in it runs a kernel that is tested against exact answers, conservation laws and observed orders of accuracy, using the methods of this chapter. Where a kernel matches its reference only approximately, the chapter says by how much.</p>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>P. J. Roache, <em>Verification and Validation in Computational Science and Engineering</em>, Hermosa Publishers, 1998. The programme of this chapter in one book.</li>
<li>P. J. Roache, "Perspective: a method for uniform reporting of grid refinement studies", <em>J. Fluids Eng.</em> 116(3) (1994) 405–413. The Grid Convergence Index.</li>
<li>I. B. Celik, U. Ghia, P. J. Roache and C. J. Freitas, "Procedure for estimation and reporting of uncertainty due to discretization in CFD applications", <em>J. Fluids Eng.</em> 130 (2008) 078001. The step-by-step GCI procedure and its worked examples.</li>
<li>S. Steinberg and P. J. Roache, "Symbolic manipulation and computational fluid dynamics", <em>J. Comput. Phys.</em> 57(2) (1985) 251–284; and P. J. Roache and S. Steinberg, <em>AIAA J.</em> 22(10) (1984) 1390–1394.</li>
<li>K. Salari and P. Knupp, <em>Code Verification by the Method of Manufactured Solutions</em>, Sandia report SAND2000-1444 (June 2000).</li>
<li>P. J. Roache, "Code verification by the method of manufactured solutions", <em>J. Fluids Eng.</em> 124(1) (2002) 4–10 (online November 2001).</li>
<li>W. L. Oberkampf and C. J. Roy, <em>Verification and Validation in Scientific Computing</em>, Cambridge University Press, 2010. The most complete modern treatment.</li>
<li>W. L. Oberkampf, F. G. Blottner and D. P. Aeschliman, AIAA Paper 95-2226 (1995), where Salari and Knupp locate the term "manufactured solution".</li>
<li>ASME V&amp;V 20-2009, <em>Standard for Verification and Validation in Computational Fluid Dynamics and Heat Transfer</em>, ASME, 2009.</li>
<li>B. W. Boehm, "Verifying and validating software requirements and design specifications", <em>IEEE Software</em> 1(1) (1984) 75–88.</li>
<li>L. F. Richardson, "The approximate arithmetical solution by finite differences of physical problems involving differential equations, with an application to the stresses in a masonry dam", <em>Phil. Trans. R. Soc. A</em> 210 (1911) 307; L. F. Richardson and J. A. Gaunt, "The deferred approach to the limit", <em>Phil. Trans. R. Soc. A</em> 226 (1927) 299–361.</li>
<li>W. Kahan, "Further remarks on reducing truncation errors", <em>Commun. ACM</em> 8(1) (1965) 40.</li>
<li>N. J. Higham, <em>Accuracy and Stability of Numerical Algorithms</em>, 2nd ed., SIAM, 2002, chapter 4. Error bounds for every summation order, and for compensated summation.</li>
<li>D. Goldberg, "What every computer scientist should know about floating-point arithmetic", <em>ACM Comput. Surv.</em> 23(1) (1991) 5–48.</li>
<li>T. Ogita, S. M. Rump and S. Oishi, "Accurate sum and dot product", <em>SIAM J. Sci. Comput.</em> 26(6) (2005) 1955–1988. The exact reference sums in the figures.</li>
<li>J. Demmel and H. D. Nguyen, "Fast reproducible floating-point summation", <em>Proc. 21st IEEE Symposium on Computer Arithmetic</em> (2013) 163–172.</li>
<li>E. Hairer, C. Lubich and G. Wanner, <em>Geometric Numerical Integration</em>, 2nd ed., Springer, 2006. The invariant of symplectic Euler.</li>
<li>K. Emanuel, "Edward Norton Lorenz 1917–2008", <em>Biographical Memoirs of the National Academy of Sciences</em> (2011). The 1961 restart.</li>
<li>U. Ghia, K. N. Ghia and C. T. Shin, "High-Re solutions for incompressible flow using the Navier–Stokes equations and a multigrid method", <em>J. Comput. Phys.</em> 48(3) (1982) 387–411.</li>
<li>O. Botella and R. Peyret, "Benchmark spectral results on the lid-driven cavity flow", <em>Computers &amp; Fluids</em> 27(4) (1998) 421–433; E. Erturk, T. C. Corke and C. Gökçöl, "Numerical solutions of 2-D steady incompressible driven cavity flow at high Reynolds numbers", <em>Int. J. Numer. Methods Fluids</em> 48(7) (2005) 747–774.</li>
<li>I. Ginzburg, F. Verhaeghe and D. d'Humières, "Two-relaxation-time lattice Boltzmann scheme: about parametrization, velocity, pressure and mixed boundary conditions", <em>Commun. Comput. Phys.</em> 3(2) (2008) 427–478; T. Krüger et al., <em>The Lattice Boltzmann Method: Principles and Practice</em>, Springer, 2017, chapter 5.</li>
<li>G. Hagen, "Ueber die Bewegung des Wassers in engen cylindrischen Röhren", <em>Ann. Phys. Chem.</em> 46 (1839) 423–442; J. L. M. Poiseuille, "Recherches expérimentales sur le mouvement des liquides dans les tubes de très petits diamètres", <em>Comptes rendus</em> 11 (1840) 961–967 and 1041–1048.</li>
</ol>
`,
  widgets: {
    'trust-mms': mountMms,
    'trust-gci': mountGci,
    'trust-float': mountFloat,
    'trust-reduce': mountReduce,
    'trust-benchmark': mountBenchmark,
  },
  quizzes: {
    q1: {
      type: 'mcq',
      q: 'A team simulates the air flow over a car on one grid and finds a drag coefficient within 2 % of the wind-tunnel value. What has this shown?',
      choices: [
        'That the code is verified: it reproduces a measurement.',
        'That the turbulence model is validated for this car.',
        'Neither, on its own: without an estimate of the numerical error, the agreement could be numerical and model errors cancelling.',
        'Both, since the total error (15.1) is small.',
      ],
      answer: 2,
      explain: 'A small total error does not mean both brackets of (15.1) are small; they can have opposite signs. Verification needs a known answer (code) and a grid study (solution); only then does the remaining 2 % say something about the model. Refining the grid is the test: if the agreement gets worse, it was luck.',
    },
    q2: {
      type: 'predict',
      q: 'The code is second order everywhere except one row: the slope condition at $x = 1$ uses the first-order difference $(u_N - u_{N-1})/h$. As the grid is refined, what does the observed order of the maximum error tend to?',
      choices: [
        '2: one row out of hundreds cannot matter.',
        '1: the boundary error spreads into the whole solution and dominates on fine grids.',
        '1.5: an average of the two orders.',
        '0: the error stops falling.',
      ],
      answer: 1,
      explain: 'The equation couples every point to the boundary, so an $O(h)$ error in one row shifts the whole solution by $O(h)$. On fine grids that beats the $O(h^2)$ interior error. On coarse grids the two have opposite signs and partly cancel, which is why the measured orders wander (1.60, 0.58, 0.83 …) before settling at 1.',
    },
    q3: {
      type: 'num',
      q: 'Three grids with ratio $r = 2$ give $f_1 = 1.0050$ (finest), $f_2 = 1.0200$ and $f_3 = 1.0800$. What is the Richardson-extrapolated value $f_0$?',
      answer: 1.0,
      atol: 0.0005,
      explain: 'The differences are $0.0150$ and $0.0600$, a ratio of 4, so $p = \\ln 4 / \\ln 2 = 2$ by (15.5). Then (15.6) gives $f_0 = 1.0050 + (1.0050 - 1.0200)/3 = 1.0000$. The GCI (15.7) is $1.25 \\times (0.0150/1.0050)/3 \\approx 0.62\\,\\%$, so you would report $1.005 \\pm 0.62\\,\\%$.',
    },
    q4: {
      type: 'predict',
      q: 'In Float32, a total of $1$ receives $10^{-8}$ a million times, by plain addition $s = s + x$. What is the final total?',
      choices: ['1.01, correct to the digits shown', 'About 1.0099: a little is lost to rounding', 'Exactly 1', 'Infinity or NaN: the sum overflows'],
      answer: 2,
      explain: 'Near 1 the gap between Float32 numbers is $2^{-23} \\approx 1.2 \\times 10^{-7}$, so $1 + 10^{-8}$ is less than half a gap above 1 and rounds back to 1. Every addition does the same: the whole inflow is lost. Kahan summation keeps the rounded-away part and gets 1.01.',
    },
    q5: {
      type: 'mcq',
      q: 'Your cavity code differs from the Ghia et al. (1982) tables by 0.5 % of the lid speed, and refining your grid no longer reduces the gap. What can you conclude?',
      choices: [
        'Your code has a bug worth 0.5 %.',
        'Ghia et al. are wrong by 0.5 %.',
        'The comparison has reached its resolution: the reference is itself a numerical solution, so you cannot tell whose error the 0.5 % is.',
        'Lattice Boltzmann methods cannot do better than 0.5 % on this flow.',
      ],
      answer: 2,
      explain: 'A benchmark is only as sharp as its own error. Ghia et al. computed a finite-difference solution. To go further, compare with a more accurate reference (Botella and Peyret 1998; Erturk et al. 2005), or put a GCI on your own result and see whether the gap lies inside it.',
    },
  },
  glossary: {
    verification: {
      term: 'verification',
      def: 'Checking that a code solves its model equations correctly (code verification) and estimating the numerical error of a particular result (solution verification). It is mathematics: are the equations solved right?',
      section: 'v-and-v',
    },
    validation: {
      term: 'validation',
      def: 'Comparing a verified simulation with experiments, with the uncertainty on both sides stated, to judge how well the model equations describe reality: are they the right equations?',
      section: 'v-and-v',
    },
    'manufactured-solution': {
      term: 'manufactured solution',
      def: 'An exact solution chosen in advance for a test problem. The source term and boundary data that make it exact are computed analytically and given to the code, which must then converge to it at its design order of accuracy.',
      section: 'code-verification',
    },
    'richardson-extrapolation': {
      term: 'Richardson extrapolation',
      def: 'Estimating the $h \\to 0$ limit from results on several grids, assuming the error behaves like $C h^p$: $f_0 \\approx f_1 + (f_1 - f_2)/(r^p - 1)$ for grids with ratio $r$.',
      section: 'solution-verification',
    },
    'grid-convergence-index': {
      term: 'Grid Convergence Index (GCI)',
      def: 'Roache’s (1994) error band from a grid study: $F_s\\,|(f_1 - f_2)/f_1| / (r^p - 1)$, with safety factor $F_s = 1.25$ for three or more grids and 3 for two.',
      section: 'solution-verification',
    },
    'asymptotic-range': {
      term: 'asymptotic range',
      def: 'Grid spacings small enough that the leading error term $C h^p$ dominates, so that the observed order matches the design order and Richardson extrapolation can be trusted.',
      section: 'solution-verification',
    },
    'kahan-summation': {
      term: 'Kahan summation',
      def: 'Compensated summation (Kahan 1965): a second variable carries the low-order part that each addition rounds away and adds it back in, so the error bound no longer grows with the number of terms.',
      section: 'floating-point',
    },
    benchmark: {
      term: 'benchmark',
      def: 'A test problem with a documented reference answer (an exact solution, a high-accuracy computation or a careful experiment), used to compare codes and models with something outside themselves.',
      section: 'validation',
    },
  },
  pathologies: [
    {
      id: 'false-convergence',
      name: 'False convergence',
      family: 'accuracy',
      symptom: 'Two grids give nearly the same answer, the observed order is implausibly high and the GCI is tiny, yet the answer is off by far more than the band.',
      cause: 'On coarse grids, error terms of opposite sign (for example a boundary error and an interior error) can cancel at one resolution, so successive results agree by accident. The Richardson model $f_0 + C h^p$ assumes a single dominant term, which does not hold there.',
      diagnose: 'Compare the observed order with the design order: a value far above it is a warning. Add a fourth grid and check that the next triple gives a similar $p$ and still converges monotonically.',
      mitigations: [
        'Use at least three grids, better four, and report the observed order and convergence class beside the GCI.',
        'Refine until the observed order settles near the design order; until then report the spread of results, not an extrapolated value.',
        'Verify the code with manufactured solutions first: in the demonstration the accidental agreement comes from a first-order boundary bug.',
        'Monitor several quantities: an accidental cancellation rarely happens for all of them on the same grids.',
      ],
      section: 'solution-verification',
      demo: { widget: 'trust-gci', data: { preset: 'false-convergence' } },
    },
    {
      id: 'pre-asymptotic',
      name: 'Pre-asymptotic grids',
      family: 'resolution',
      symptom: 'The observed order wanders from one refinement to the next (1.60, 0.58, 0.83, 0.92 in the demonstration) or sits far from the design order; extrapolated values can be worse than the finest grid.',
      cause: 'The grids are too coarse for the leading error term to dominate. Higher-order terms, or error sources of different orders (a first-order boundary closure and a second-order interior), compete.',
      diagnose: 'Tabulate the observed order over several refinements: it should settle. A divergent or oscillatory class in a three-grid study is the same warning.',
      mitigations: [
        'Refine further with a constant refinement ratio, and treat results as qualitative until the order settles.',
        'Use the more cautious safety factor $F_s = 3$ when the observed order is far from the design order.',
        'Look for a low-order component that sets the asymptotic order: a boundary condition, a limiter, a non-smooth solution.',
      ],
      section: 'solution-verification',
      demo: { widget: 'trust-mms', data: { preset: 'bc' } },
    },
    {
      id: 'roundoff-accumulation',
      name: 'Round-off accumulation',
      family: 'accuracy',
      symptom: 'A conserved total drifts slowly over a long run, or stops responding to small inputs altogether; a clock stops advancing; Float32 and Float64 runs, or runs on different thread counts, disagree.',
      cause: 'Every floating-point addition rounds. An increment smaller than half the gap between floats near the total is lost completely, and roundings that always fall the same way add up linearly with the number of steps.',
      diagnose: 'Compare the increment with $u\\,|s|$, half the float spacing at the total $s$. Rerun in higher precision or with compensated sums and compare; watch an invariant that the exact scheme conserves.',
      mitigations: [
        'Accumulate long sums (mass budgets, statistics, time) in Float64, or with Kahan summation.',
        'Keep time as an integer step count and compute $t = n\\,\\Delta t$.',
        'Store quantities relative to a reference value, so that increments are not small next to the stored number.',
        'For reproducible parallel sums, fix the reduction order independently of the thread count, or use a reproducible summation algorithm (Demmel and Nguyen 2013).',
      ],
      section: 'floating-point',
      demo: { widget: 'trust-float', data: { preset: 'stall' } },
    },
  ],
};
