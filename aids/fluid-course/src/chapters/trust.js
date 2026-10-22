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
  blurb: 'Separating numerical error from model error through manufactured solutions, three-grid convergence studies, compensated summation, and validation benchmarks.',
  minutes: 45,
  html: String.raw`
<p class="lead-in">While unstable simulations fail visibly by diverging to infinity or NaN, subtle errors allow a solver to run smoothly and produce plausible flow fields whose quantitative predictions are wrong by several per cent. Diagnosing those quiet errors requires separating two distinct questions—whether the code solves its governing equations accurately, and whether those equations adequately represent the physical flow—turning each question into a quantitative test, and cataloguing the characteristic failure modes encountered across the course.</p>

<h2 id="v-and-v">Two questions: verification and validation</h2>

<p>A simulation result $S$ differs from the physical truth $T$ for two distinct reasons. First, the <em>mathematical model</em> is an idealisation that invokes approximations such as a continuum hypothesis, Newtonian viscosity, incompressibility, a turbulence closure, or idealised boundary conditions; even the exact solution $M$ of those model equations differs from $T$. Second, the <em>numerical method</em> approximates derivatives with finite differences or finite volumes, terminates iterative solvers at a finite tolerance, rounds every floating-point operation, and may contain coding defects, so the computed solution $S$ differs from $M$. Adding and subtracting $M$ separates the total error into two terms:</p>

<div class="eq" id="eq-error-split">$$\underbrace{S - T}_{\text{total error}} \;=\; \underbrace{(S - M)}_{\text{numerical error}} \;+\; \underbrace{(M - T)}_{\text{model error}}.$$<span class="eq-tag">(15.1)</span></div>

<p><dfn data-term="verification">Verification</dfn> addresses the first term $(S - M)$, which is a mathematical question of whether the code solves its chosen governing equations accurately. <dfn data-term="validation">Validation</dfn> addresses the second term $(M - T)$, which is a physical question of how well the chosen equations represent reality. This distinction originated in software engineering and was systematically developed for computational fluid dynamics by Patrick Roache and colleagues.</p>

<aside class="who" data-person="patrick-roache">Roache wrote one of the earliest textbooks on computational fluid dynamics (1972). He subsequently championed the formal separation of verification and validation, co-developed the method of manufactured solutions with Stanly Steinberg, and introduced the Grid Convergence Index (1994), collecting the methodology in his 1998 monograph.</aside>

<p>Verification must precede validation because comparing $S$ directly with $T$ leaves the two terms in (15.1) confounded. If a coarse grid smears a mixing layer through <a href="#/advection/diffusion-dispersion">numerical diffusion</a> while the turbulence closure under-predicts turbulent mixing, the two errors can cancel so that the coarse-grid simulation matches an experiment. Refining the grid reduces the numerical diffusion and makes the agreement with experiment <em>worse</em>—a failure mode catalogued in the gallery as <a href="#/pathologies/numerical-dissipation-as-model">numerical dissipation acting as a model</a>. Quantifying the numerical error $(S - M)$ first ensures that the remaining discrepancy can be attributed to the physical model.</p>

<p>Verification itself comprises two distinct activities alongside validation:</p>

<table>
<thead><tr><th>Activity</th><th>Question</th><th>Compared with</th><th>Section</th></tr></thead>
<tbody>
<tr><td>Code verification</td><td>Does the code solve its equations correctly, at its design order?</td><td>An exact solution, often manufactured</td><td><a href="#/trust/code-verification">Manufactured solutions</a></td></tr>
<tr><td>Solution verification</td><td>How large is the numerical error in <em>this</em> run?</td><td>The same run on other grids</td><td><a href="#/trust/solution-verification">Three grids</a></td></tr>
<tr><td>Validation</td><td>How well do the equations describe reality?</td><td>Experiments, with their uncertainty</td><td><a href="#/trust/validation">Benchmarks</a></td></tr>
</tbody>
</table>

<p>Code verification is performed when a solver is written and repeated whenever the code changes; it requires a test problem with a known exact solution and evaluates the solver implementation as a whole. Solution verification is performed for every production run whose quantitative output is reported; because the exact solution of the application problem is unknown, it estimates the discretisation error from the rate at which the computed solution converges across a sequence of grids. Floating-point round-off affects both activities and is examined in <a href="#/trust/floating-point">its own section</a>.</p>

<aside class="note" data-label="Where the words come from">Software engineers formulated the distinction first. Barry Boehm summarised verification and validation as building the product right versus building the right product, a phrasing used in the late 1970s and published in <em>IEEE Software</em> in 1984. In computational mechanics, code verification is a finite mathematical test, whereas validation is ongoing because a physical model is validated only for the flow regimes and accuracy levels covered by experimental comparisons.</aside>

<p>Even a verified code with a small, well-characterised numerical error can disagree with experiment when the underlying physical model is incomplete. Verification establishes that the numerical error $(S - M)$ is small enough for any remaining discrepancy with experiment to be attributed to the model $(M - T)$.</p>

<div data-quiz="q1"></div>

<h2 id="code-verification">Code verification: manufactured solutions</h2>

<p>Testing whether a code achieves its theoretical order of accuracy requires a problem with a known exact solution. Classical analytical solutions cover only simplified flow regimes in which key terms of the governing equations vanish identically. In plane Poiseuille flow (<a href="#/trust/validation">examined later in this chapter</a>), for example, the nonlinear advection term is identically zero, so a coding error in the advection operator leaves the solution unaffected. Analytical textbook solutions rarely exercise every term, coupling, and boundary condition of a general-purpose solver simultaneously.</p>

<p>The method of <dfn data-term="manufactured-solution">manufactured solutions</dfn> (MMS) reverses the problem formulation. Instead of solving a given equation to find an unknown solution, one selects a smooth analytical function $u_m$ in advance, substitutes it into the differential operator, and defines the resulting expression as a source term $s$. Adding $s$ to the right-hand side of the governing equations makes $u_m$ an exact solution of the forced system. The manufactured function $u_m$ need not represent a realistic physical flow, provided it is smooth and has non-zero derivatives that exercise every differential operator and boundary condition in the solver.</p>

<p>Consider a one-dimensional advection–diffusion–reaction equation with a Dirichlet boundary condition at $x = 0$ and a Neumann slope condition at $x = 1$:</p>

<div class="eq" id="eq-mms-problem">$$-\nu\, u'' + a\, u' + \kappa\, u = s(x), \qquad 0 \le x \le 1, \qquad u(0) = u_m(0), \quad u'(1) = u_m'(1).$$<span class="eq-tag">(15.2)</span></div>

<p>Because the solver uses second-order central differences in the interior and a second-order ghost-point closure for the Neumann condition at $x = 1$, its global design order of accuracy is $p = 2$. We choose the manufactured solution</p>

<div class="eq" id="eq-mms-source">$$u_m(x) = 1 + e^{-x}\sin 3x, \qquad s(x) = -\nu\, u_m'' + a\, u_m' + \kappa\, u_m,$$<span class="eq-tag">(15.3)</span></div>

<p>with $\nu = 0.1$, $a = 1$, and $\kappa = 1$. The derivatives in $s(x)$ are differentiated analytically so that the forcing is independent of the code's finite-difference stencils. Solving on a sequence of grids with $N = 10, 20, \dots, 320$ cells yields the maximum nodal error $E_h = \max_i |u_i - u_m(x_i)|$ on each grid.</p>

<p>Because even a solver with a coding defect in a boundary stencil or higher-order term often produces an error that decreases as $h \to 0$, the quantitative criterion for code verification is the <dfn data-term="order-of-accuracy">order of accuracy</dfn>, which requires a second-order scheme to reduce $E_h$ by a factor of four each time the grid spacing $h$ is halved. From two grids with refinement ratio $r$, the <em>observed</em> order is (<a href="#/discretization/convergence">chapter 6</a>)</p>

<div class="eq" id="eq-observed-order">$$p_{\text{obs}} = \frac{\ln\left(E_h / E_{h/r}\right)}{\ln r}.$$<span class="eq-tag">(15.4)</span></div>

<p>The bug-free solver produces $E = 1.05 \times 10^{-2}$ at $N = 10$ and $1.04 \times 10^{-5}$ at $N = 320$, with observed orders $1.98, 2.00, 2.00, 2.00, 2.00$. Before introducing defects in the widget, consider how a single first-order boundary stencil affects the global convergence rate.</p>

<div data-quiz="q2"></div>

<figure data-widget="trust-mms"><figcaption>The MMS lab. The first plot shows the maximum error against grid spacing on log–log axes alongside reference slopes of 1 and 2; the second shows the manufactured solution and the discrete solution on a coarse grid. The table lists the observed order (15.4) at each refinement step.</figcaption></figure>

<div class="try"><ol>
<li>Pick <em>First-order Neumann closure</em>. The observed orders read $1.60, 0.58, 0.83, 0.92, 0.96$, wandering on coarse grids before approaching 1. On the coarsest grid ($N = 10$) the defective code's error ($7.41 \times 10^{-3}$) is actually <em>smaller</em> than the bug-free code's error, yet that single first-order row degrades the asymptotic order of the entire domain to 1.</li>
<li>Pick <em>Coefficient typo in advection</em> (a denominator of 4 instead of 2). The error plateaus near $0.23$ and the observed order drops to 0, because the code converges to the solution of a modified equation with half the advection speed.</li>
<li>Pick <em>Source at the wrong point</em>. The observed order drops to 1. Because the error still decreases as the grid is refined, a qualitative check that merely asks whether the error shrinks would miss the defect.</li>
<li>Switch the advection term to <em>upwind</em> with no bug. The observed order settles to 1 and the verification test passes, because the test checks whether the code converges at the design order of the chosen discretisation.</li>
<li>Now pick the <em>diffusion typo</em> and switch to the linear manufactured solution $1 + 2x$. The error drops to machine round-off on every grid even though the diffusion bug remains present.</li>
</ol></div>

<p>The final experiment illustrates why the manufactured solution must have non-trivial higher derivatives. When $u_m(x)$ is linear, $u_m''(x) = 0$ identically and every finite-difference stencil is exact, so errors in the diffusion coefficient or boundary closure produce zero residual. Multiplying an exponential by a sine in (15.3) ensures that derivatives of all orders remain non-zero across the domain.</p>

<aside class="history" data-era="1985">Symbolic computer algebra made manufactured solutions practical for complex PDEs. Steinberg and Roache used symbolic manipulation to generate analytical source terms for verifying CFD codes (<em>J. Comput. Phys.</em>, January 1985, with a companion <em>AIAA Journal</em> paper in 1984). Salari and Knupp trace the phrase "manufactured solution" to a 1995 AIAA paper by Oberkampf, Blottner and Aeschliman.</aside>

<p>To evaluate what MMS can detect in practice, Kambiz Salari and Patrick Knupp at Sandia National Laboratories conducted a blind verification study (2000) in which 20 distinct coding mistakes (plus one bug-free control) were planted in a working solver. They demonstrated that MMS "can identify any coding mistake that affects the order-of-accuracy of the numerical method". Conversely, three classes of issues lie outside the scope of an MMS order test:</p>

<ul>
<li>Inefficiencies that preserve the discretisation accuracy, such as an unpreconditioned iterative solver that converges slowly to the right discrete solution.</li>
<li>Unused code branches—a smooth $u_m$ will not activate shock-capturing limiters unless they are tested separately, and a Dirichlet-only test will not exercise a Neumann boundary routine.</li>
<li>Modelling and input errors—an incorrect physical viscosity in an input deck or an omitted physical mechanism leaves the order of convergence unchanged because the solver is verified against the equations as coded.</li>
</ul>

<p>Applying MMS also requires software hooks. As Salari and Knupp note, its main practical requirement is "that the code contain an option for input of distributed source terms and spatially-variable boundary data".</p>

<aside class="pitfall">In the second plot with the advection typo at $N = 40$, the computed curve is smooth and visually close to the manufactured solution. Visual inspection on a single grid cannot detect an inconsistent discretisation; only systematic grid refinement reveals whether the error converges at the design order.</aside>

<h2 id="solution-verification">Solution verification: an error bar from three grids</h2>

<p>Even a fully verified code incurs discretisation error on every grid of finite spacing $h$. In an application problem where the exact solution $f_0$ is unknown, the discretisation error can be estimated from the solutions on multiple grids. When the grid spacing is fine enough that the leading truncation term dominates, a scalar output functional $f_h$ behaves as $f_h \approx f_0 + C h^p$. Evaluating $f_h$ on three systematically refined grids provides three equations for the three unknowns $f_0$, $C$, and $p$—applying <a href="#/discretization/richardson">Richardson's deferred approach to the limit</a> to estimate both the continuum value and the numerical uncertainty.</p>

<p>Labelling the grids from finest to coarsest as $h_1 < h_2 < h_3$ with a constant refinement ratio $r = h_2/h_1 = h_3/h_2$, the observed order of accuracy and the Richardson-extrapolated estimate are</p>

<div class="eq" id="eq-three-grid-order">$$p = \frac{\ln\left(\dfrac{f_3 - f_2}{f_2 - f_1}\right)}{\ln r},$$<span class="eq-tag">(15.5)</span></div>

<div class="eq" id="eq-richardson-extrapolation">$$f_0 \approx f_1 + \frac{f_1 - f_2}{r^p - 1}.$$<span class="eq-tag">(15.6)</span></div>

<p>Equation (15.6) is <dfn data-term="richardson-extrapolation">Richardson extrapolation</dfn>. It applies when the difference ratio $(f_2 - f_1)/(f_3 - f_2)$ lies between 0 and 1, corresponding to <em>monotonic</em> convergence. When the ratio is negative, the solution alternates in sign across refinements (<em>oscillatory</em>); when the ratio is 1 or greater, the grid-to-grid differences grow with refinement (<em>divergent</em>) and Richardson extrapolation cannot be applied.</p>

<aside class="who" data-person="lewis-fry-richardson">Richardson eliminated the leading $O(h^2)$ error of central differences in his masonry-dam stress calculation (presented 1910, published 1911) and generalised the method with J. A. Gaunt as "the deferred approach to the limit" (1927).</aside>

<p>In 1994 Roache observed that because the extrapolated estimate $f_0$ relies on $p$ being accurately known, it is safer to report the fine-grid solution $f_1$ accompanied by a conservative uncertainty band. His <dfn data-term="grid-convergence-index">Grid Convergence Index</dfn> (GCI) scales the relative Richardson correction in (15.6) by a safety factor $F_s$:</p>

<div class="eq" id="eq-gci">$$\mathrm{GCI}_{\text{fine}} = \frac{F_s\,|e_a|}{r^p - 1}, \qquad e_a = \frac{f_1 - f_2}{f_1}, \qquad F_s = 1.25 \text{ with three grids}.$$<span class="eq-tag">(15.7)</span></div>

<p>When only two grids are available and $p$ must be assumed rather than measured, Roache recommended $F_s = 3$. Celik, Ghia, Roache and Freitas (2008) standardised this calculation as the editorial policy of the <em>Journal of Fluids Engineering</em>, including fixed-point iteration for non-constant grid refinement ratios $r_{21} \ne r_{32}$. The widget below implements their step-by-step procedure.</p>

<aside class="history" data-era="1994">Roache introduced the GCI to standardise error reporting across CFD publications, noting at the end of his abstract that the formula "may be applied a posteriori by editors and reviewers, even if authors are reluctant to do so".</aside>

<p>The widget tracks the boundary value $u(1)$ from the MMS problem (15.2) across grids of $N$, $2N$, and $4N$ cells, allowing the GCI uncertainty band to be compared directly against the known exact value $u_m(1)$.</p>

<figure data-widget="trust-gci"><figcaption>Three grid results (dots) plotted against grid spacing $h$, the fitted Richardson curve $f_0 + C h^p$, the extrapolated estimate at $h = 0$, and the GCI uncertainty band around the finest grid result (shaded, with an error bar at $h_1$). The dotted line marks the exact manufactured value.</figcaption></figure>

<div class="try"><ol>
<li>With the correct code and $N = 10$, the observed order is $p = 1.98$ and the GCI band is $\pm 0.081\,\%$. The finest grid's true error is $0.064\,\%$ (well inside the band), and the Richardson-extrapolated value errs by only $0.0011\,\%$, confirming that the grids lie inside the <dfn data-term="asymptotic-range">asymptotic range</dfn>.</li>
<li>Switch on the boundary bug and set $N = 6$. Grids 12 and 24 happen to agree within $0.008\,\%$, yielding a spurious order $p = 6.6$ and a tiny GCI band of $\pm 10^{-4}\,\%$, even though the true error is $0.215\,\%$ (roughly two thousand times wider than the band). Switching on the fourth grid reveals oscillatory convergence with $p = 3.3$ on the next triple.</li>
<li>With the bug enabled, try $N = 13$ to 18: the three-grid differences grow ($|f_2 - f_1| \ge |f_3 - f_2|$), the convergence class is flagged as divergent, and the GCI formula withholds an error bar.</li>
<li>With the bug at $N = 20$, the observed order is $p = 0.18$. The resulting GCI band is wide ($\pm 0.63\,\%$) and encloses the exact value, whereas the extrapolated estimate $f_0$ overshoots and errs by $0.41\,\%$—worse than the unextrapolated fine-grid value.</li>
<li>Switch to <em>a table of three results</em> and select the Celik et al. examples to compare the widget's output with the published values in their Table 1.</li>
</ol></div>

<p>The second experiment demonstrates <a href="#/pathologies/false-convergence">false convergence</a> and shows why grid convergence studies require at least three grids. When two competing error contributions carry opposite signs—here, the first-order boundary error and the second-order interior error—they can cancel near a particular grid spacing so that two successive grids agree closely by coincidence. On three grids, that cancellation manifests as an anomalously high observed order ($p = 6.6$ for a second-order scheme). Whenever the observed order fluctuates across refinements or departs substantially from the theoretical design order, the grids have not yet reached the asymptotic range, a condition catalogued as <a href="#/pathologies/pre-asymptotic">pre-asymptotic grids</a>.</p>

<details class="deeper"><summary>Go deeper: why the ratio check $\mathrm{GCI}_{32} / (r^p\,\mathrm{GCI}_{21})$ is an identity at constant $r$</summary>
<p>Roache also suggested checking whether three grids lie in the asymptotic range by verifying that $\mathrm{GCI}_{32} / (r^p\, \mathrm{GCI}_{21}) \approx 1$. When the refinement ratio $r$ is constant across all three grids and $p$ is computed from (15.5), however, substituting $r^p = (f_3 - f_2)/(f_2 - f_1)$ into (15.7) simplifies the ratio identically to $f_1/f_2$, which is close to 1 whenever $f_1$ and $f_2$ are close in magnitude—even in the false-convergence case above, where it evaluates to 1.0001. Meaningful checks of asymptotic behaviour instead compare the observed $p$ against the theoretical design order and verify that $p$ remains consistent when a fourth grid is added.</p>
</details>

<p>Reliable grid convergence studies require that iterative convergence error and floating-point round-off remain much smaller than the discretisation error on the finest grid. Terminating an iterative linear solver at a <a href="#/solvers/cost">loose residual tolerance</a> introduces an algebraic error that does not decrease with $h$, and accumulated floating-point round-off sets a floor below which further refinement cannot reduce the error.</p>

<div data-quiz="q3"></div>

<h2 id="floating-point">Round-off that adds up</h2>

<p><a href="#/discretization/round-off">Chapter 6</a> showed that a single floating-point operation incurs a relative rounding error bounded by the unit round-off ($u \approx 1.1 \times 10^{-16}$ in IEEE 754 double precision) unless two nearly equal numbers are subtracted. Over a long integration comprising billions of operations, individual rounding errors accumulate. Unbiased errors of random sign partially cancel and grow as $\sqrt{n}$, whereas systematically biased errors of a single sign grow linearly with $n$. An extreme form of systematic loss occurs when a small increment is repeatedly added to a much larger running total.</p>

<p>Consider a cumulative mass budget in which a reservoir holding $1\text{ kg}$ receives an inflow of $10^{-8}\text{ kg}$ at each time step. In IEEE 754 single precision (Float32), the spacing between adjacent representable numbers just above $1$ is $\mathrm{ulp}(1) = 2^{-23} \approx 1.19 \times 10^{-7}$. Because the exact sum $1 + 10^{-8}$ lies less than half a spacing above $1$, round-to-nearest-even maps it back to $1$ on every step. After $10^6$ steps the exact mass is $1.01\text{ kg}$, while the Float32 accumulator remains at $1\text{ kg}$ with the entire inflow lost to swamping.</p>

<p>Compensated summation recovers the discarded low-order bits. <dfn data-term="kahan-summation">Kahan summation</dfn> (1965) maintains a running compensation variable $c$ alongside the partial sum $s$:</p>

<div class="eq" id="eq-kahan">$$\begin{aligned} y &= x_i - c, \\ t &= s + y, \\ c &= (t - s) - y, \\ s &= t. \end{aligned}$$<span class="eq-tag">(15.8)</span></div>

<p>In exact arithmetic $c$ would equal zero at every step. In floating-point arithmetic, $(t - s)$ recovers the high-order part of $y$ that was absorbed into $t$, so $c = (t - s) - y$ captures the negative of the rounding error committed during $s + y$ and subtracts it at the next iteration. Higham's error analysis shows that while the relative error of naive recursive summation of $n$ terms is bounded to leading order by $(n-1)\,u \sum |x_i| / \left|\sum x_i\right|$ (with $u = 2^{-24}$ in Float32), Kahan summation reduces the leading bound to $2u \sum |x_i| / \left|\sum x_i\right|$, independent of $n$ until $n u$ ceases to be small.</p>

<div data-quiz="q4"></div>

<figure data-widget="trust-float" data-preset="stall"><figcaption>A running total receiving one million increments, summed with naive recursive addition and with Kahan's compensated summation (15.8), alongside Higham's worst-case bound for naive addition. The <em>oscillator</em> experiment integrates $x'' = -x$ for one million steps in Float32 alongside Float64.</figcaption></figure>

<div class="try"><ol>
<li>At the default preset (Float32, increment $10^{-8}$), naive addition loses $100\,\%$ of the inflow whereas Kahan summation loses $9.5 \times 10^{-7}$ of it. The readout <em>increment ÷ half-gap at the total</em> is 0.17; whenever this ratio is below 1, each naive addition rounds back to the unchanged total.</li>
<li>Drag the increment past $5.96 \times 10^{-8}$ (half the spacing $\mathrm{ulp}(1)$). Once the ratio exceeds 1, each naive addition rounds <em>up</em> by a full spacing $\mathrm{ulp}(1)$, so at $6 \times 10^{-8}$ the naive sum over-predicts the added mass by $98.7\,\%$.</li>
<li>At an increment of $10^{-6}$, naive addition loses $4.6\,\%$ because every rounding error has the same sign. Varying the increments uniformly by $\pm 50\,\%$ reduces the naive loss to $0.1\,\%$ as positive and negative roundings partially cancel, while Kahan's error remains roughly twenty thousand times smaller.</li>
<li>In Float64 with an increment of $10^{-10}$, the naive relative error ($8.3 \times 10^{-8}$ of the total inflow) grows linearly with step count.</li>
<li>Pick <em>a long oscillator run</em>. Symplectic Euler exactly conserves a modified shadow Hamiltonian in exact arithmetic, so any energy drift comes purely from round-off ($4.6 \times 10^{-14}$ in Float64 versus $6.8 \times 10^{-6}$ in Float32). The phase discrepancy reaches $2.17 \times 10^{-4}\text{ rad}$ because rounding the step size $\Delta t = 0.01$ to Float32 shifts the discrete frequency enough to account for $2.24 \times 10^{-4}\text{ rad}$ on its own; running Float64 with the same Float32-rounded constants reduces the phase difference to $7.0 \times 10^{-6}\text{ rad}$.</li>
</ol></div>

<p>Because the first-order truncation error of symplectic Euler after $10^6$ steps ($1.5 \times 10^{-2}$) is orders of magnitude larger than the Float32 state round-off, single precision is often adequate for storing field arrays when memory bandwidth is the bottleneck, provided that constants and long-running accumulators are handled in double precision or with compensation. For example, updating simulation time via $t \leftarrow t + \Delta t$ in Float32 accumulates a drift of 135 time units by $t = 10^4$ and stalls completely at $t = 2^{18} = 262\,144$, where half the spacing between adjacent Float32 numbers reaches $\Delta t = 0.01$. Recording the step index as an integer $n$ and evaluating $t = n\,\Delta t$ eliminates clock drift altogether.</p>

<aside class="pitfall">Aggressive compiler optimisations (such as <code>-ffast-math</code>) apply algebraic associativity to simplify $(t - s) - y$ to zero, eliminating Kahan's compensation term at compile time. Unit tests for compensated accumulators should verify on a swamping input that the compiled routine retains the low-order bits.</aside>

<p>Floating-point non-associativity also affects parallel reductions. When a global integral—such as total mass, kinetic energy, or an inner product in a Krylov solver—is partitioned across threads and reduced, changing the thread count alters the parenthesisation of the sum and therefore changes the rounded result. Although every thread count's sum lies within the floating-point error bound, the output is no longer bitwise identical across processor configurations.</p>

<figure data-widget="trust-reduce"><figcaption>The same 16,384 numbers summed across 1 to 64 threads, where each thread sums a contiguous block before a sequential reduction of the block totals. Each dot shows the difference between that thread count's result and the exact sum in units in the last place (ulps). The <em>mixed signs</em> dataset exhibits strong cancellation and a higher condition number.</figcaption></figure>

<div class="try"><ol>
<li>With positive numbers in Float32, the 64 thread counts produce 8 distinct answers spanning 11 ulps; switching to Kahan summation collapses all thread counts to a single value.</li>
<li>With mixed signs in Float64 (condition number $\kappa = 68$), the 64 thread counts produce 22 distinct answers spanning 55 ulps (a relative spread of $1.0 \times 10^{-14}$). Kahan summation narrows the spread to 3 distinct answers within 2 ulps.</li>
</ol></div>

<aside class="pitfall">Transcendental math library functions can also vary by one unit in the last place across runtimes; during the construction of this widget, evaluating $10^y$ in Node.js and in Chrome differed in the last bit for 1,613 of the 16,384 test values, shifting the reduction results above. The widget now constructs its test array using exact integer-derived floating-point operations.</aside>

<p>While a spread of a few units in the last place is negligible in a steady laminar calculation, a chaotic turbulent flow amplifies last-bit perturbations exponentially, causing two runs on different processor counts to diverge in instantaneous velocity while converging to the same ensemble statistics. When bitwise reproducibility across thread counts is required for regression testing or debugging, one can either enforce a fixed tree-reduction order independent of thread count or use a reproducible summation algorithm based on fixed-point bins, such as Demmel and Nguyen's (2013).</p>

<aside class="history" data-era="1961"><a href="#/people/edward-lorenz">Edward Lorenz</a> encountered sensitivity to rounding in 1961 when he restarted a weather integration by typing three-digit numbers from a line-printer listing into a Royal McBee LGP-30 computer that stored six decimal digits internally. The restarted trajectory initially tracked the original run before diverging completely, illustrating how small initial perturbations grow exponentially in chaotic dynamics.</aside>

<h2 id="validation">Validation: benchmarks and experiments</h2>

<p>Once code verification and grid convergence studies have bounded the numerical error $(S - M)$, the simulation can be compared against external reference data. A <dfn data-term="benchmark">benchmark</dfn> is a well-defined problem with a documented reference solution, and three distinct kinds of references serve different purposes. Comparing against an <em>exact analytical solution</em> of the governing equations—such as plane Poiseuille or Couette flow, the decaying <a href="#/lattice-particles/lbm-limits">Taylor–Green vortex</a>, or the exact Riemann solution of <a href="#/shocks/sod">Sod's shock tube</a>—is a verification test of the complete solver with physical boundary conditions. Comparing against a <em>high-resolution numerical reference</em> checks consistency between independent codes and discretisations. Comparing against a <em>laboratory or field experiment</em> performs physical validation by testing the mathematical model against reality.</p>

<p>The widget below runs two classic benchmarks using the <a href="#/lattice-particles/lbm">lattice Boltzmann solver</a> from chapter 13: plane Poiseuille flow driven by a uniform body force (which has an exact parabolic velocity profile) and the two-dimensional lid-driven cavity at $\mathrm{Re} = 100$.</p>

<figure data-widget="trust-benchmark"><figcaption>In channel mode, the left plot compares the computed velocity profile against the exact parabola and the right plot shows the nodal error as a percentage of $u_{\max}$, alongside the analytical slip error $(16\Lambda - 3)/(3H^2)$. In cavity mode, the two plots compare the horizontal and vertical centreline velocity profiles at $\mathrm{Re} = 100$ against the tabulated finite-difference values of Ghia, Ghia and Shin (1982).</figcaption></figure>

<div class="try"><ol>
<li>At the default channel preset (BGK collision, $\tau = 2$, $H = 24$), the flow accelerates from rest to a steady parabolic profile shifted uniformly above the exact parabola by $1.91\,\%$ of $u_{\max}$, caused by artificial slip at the bounce-back walls.</li>
<li>Vary the channel height $H$: the relative wall-slip error is $17.2\,\%$ at $H = 8$, $4.30\,\%$ at $H = 16$, and $0.48\,\%$ at $H = 48$, converging at second order as $1/H^2$.</li>
<li>Vary the relaxation time $\tau$: the steady error matches the analytical formula $(16\Lambda - 3)/(3H^2)$ with $\Lambda = (\tau - \tfrac12)^2$ to all displayed digits, passing through zero at $\tau = \tfrac12 + \sqrt{3/16} \approx 0.933$.</li>
<li>Switch the collision operator to TRT with magic parameter $\Lambda = 3/16$: the velocity profile matches the exact parabola to machine round-off at every $\tau$.</li>
<li>Switch to the lid-driven cavity, run each grid resolution to steady state, and observe the maximum difference from the tabulated points of Ghia et al. (1982): $2.0\,\%$ of the lid speed on $24 \times 24$, $1.2\,\%$ on $32 \times 32$, $0.66\,\%$ on $48 \times 48$, and $0.49\,\%$ on $64 \times 64$.</li>
</ol></div>

<p>The Poiseuille channel benchmark demonstrates the diagnostic value of exact analytical solutions. Under BGK collision with halfway bounce-back, the effective wall location shifts inward or outward as a function of $\tau$, even though $\tau$ is supposed to control only the kinematic viscosity. The two-relaxation-time (TRT) collision operator of Ginzburg, Verhaeghe and d'Humières (2008) eliminates this viscosity-dependent slip when $\Lambda = 3/16$. Without an exact reference profile, a $2\,\%$ velocity offset on a single grid could easily be mistaken for a physical feature.</p>

<p>The lid-driven cavity illustrates a numerical inter-code benchmark. A square enclosure of fluid is sheared by its top wall moving at constant speed, forming a primary central vortex and corner eddies at $\mathrm{Re} = 100$. In 1982 Ghia, Ghia and Shin published centreline velocity tables computed with a coupled vorticity–streamfunction multigrid solver on a $129 \times 129$ grid. In the widget above, the discrepancy between the lattice Boltzmann solution and the Ghia et al. table decreases from $2\,\%$ on $24 \times 24$ to $0.5\,\%$ on $64 \times 64$, but then plateaus at $0.5\,\%$ on $96 \times 96$, even when the lid Mach number is halved to reduce weak compressibility error.</p>

<aside class="who" data-person="ghia-ghia-shin">Their 1982 <em>Journal of Computational Physics</em> paper tabulated multigrid streamfunction–vorticity solutions of the 2-D driven cavity up to $\mathrm{Re} = 10\,000$, providing a standard reference dataset for incompressible flow solvers.</aside>

<p>Because the tabulated values of Ghia et al. come from a finite-difference calculation on a finite grid (and are printed to four decimal places), they carry their own discretisation and rounding uncertainty. Once a solver agrees with their table to within roughly $0.5\,\%$, the comparison has reached the accuracy of the reference table itself. Testing convergence beyond that level requires either a higher-accuracy reference solution—such as the spectral Chebyshev–collocation benchmark of Botella and Peyret (1998) or the $601 \times 601$ fine-grid study of Erturk, Corke and Gökçöl (2005)—or an independent three-grid Richardson study on the solver's own grids.</p>

<p>When validating against laboratory measurements, experimental and input uncertainties must be combined with the numerical uncertainty. The ASME V&amp;V 20 standard (2009) defines the validation comparison error $E$ and combined validation standard uncertainty $u_{\text{val}}$ as</p>

<div class="eq" id="eq-vv20">$$E = S - D, \qquad u_{\text{val}} = \sqrt{u_{\text{num}}^2 + u_{\text{input}}^2 + u_D^2}, \qquad \delta_{\text{model}} \in \left[E - u_{\text{val}},\; E + u_{\text{val}}\right],$$<span class="eq-tag">(15.9)</span></div>

<p>where $S$ is the simulation prediction, $D$ is the experimental datum, and $u_{\text{num}}$, $u_{\text{input}}$, and $u_D$ are the standard uncertainties arising from numerical discretisation, uncertain input parameters (fluid properties and boundary geometry), and experimental measurement. When $|E| \gg u_{\text{val}}$, the model error $\delta_{\text{model}} = M - T$ is approximately $E$, providing a clear signal of the sign and magnitude of the physical modelling deficiency. When $|E| \le u_{\text{val}}$, any discrepancy between the model and reality is smaller than the combined noise floor $u_{\text{val}}$ of the comparison.</p>

<aside class="history" data-era="1839">Laminar pipe and channel flow is named after two nineteenth-century experimentalists: <a href="#/people/gotthilf-hagen">Gotthilf Hagen</a>, who measured water flow through narrow brass tubes in 1839, and <a href="#/people/jean-leonard-marie-poiseuille">Jean Léonard Marie Poiseuille</a>, a physiologist investigating blood flow in microvessels, who measured flow rates through glass capillaries in memoirs read to the Académie des Sciences in December 1840. Both established the fourth-power diameter law experimentally before Eduard Hagenbach (1860) and Franz Neumann derived the parabolic profile from the Navier–Stokes equations.</aside>

<div data-quiz="q5"></div>

<h2 id="checklist">A field guide to wrong answers</h2>

<p>Diagnosing an unexpected simulation result—or confirming that a plausible result is trustworthy—requires checking the sources of error in sequence, because each step relies on the preceding ones being under control:</p>

<ol>
<li><strong>Verify the code.</strong> Run manufactured solutions that exercise every active term and boundary condition, confirming that the observed order matches the theoretical design order.</li>
<li><strong>Converge the algebraic iterations.</strong> Tighten the linear and nonlinear solver tolerances until the target output quantities stop changing in the reported digits (<a href="#/solvers/cost">chapter 11</a>).</li>
<li><strong>Perform a spatial grid study.</strong> Compute on at least three systematically refined grids with a constant ratio $r$, report the observed order $p$, convergence class, and GCI, and refine further if $p$ deviates substantially from the design order.</li>
<li><strong>Perform a time-step study</strong> across multiple $\Delta t$ values in unsteady calculations.</li>
<li><strong>Check floating-point sensitivity.</strong> Compare against a higher-precision run or use compensated summation for long-time accumulations and global reductions.</li>
<li><strong>Validate against external data.</strong> Compare against benchmarks and experimental measurements while accounting for numerical, input, and experimental uncertainties via (15.9).</li>
</ol>

<p>Table 15.2 summarises the numerical and physical failure modes examined throughout the course and links each entry to its interactive demonstration in the <a href="#/pathologies">rogues' gallery</a>.</p>

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
<tr><td>Agrees with the exact solution, but not with the experiment</td><td>Inadequate physical model (turbulence closure, boundary data, or omitted physics)</td><td><a href="#/trust/validation">validation</a>, <a href="#/turbulence/modelling">turbulence models</a></td><td><a href="#/pathologies/numerical-dissipation-as-model">dissipation as model</a></td></tr>
</tbody>
</table>

<p>Two practices address the majority of these failure modes: testing every new solver and code modification against an analytical or manufactured solution across multiple grids, and accompanying every reported numerical prediction with a three-grid convergence study and uncertainty estimate.</p>

<p>The interactive simulation kernels in this course are verified using the same suite of tests—checking exact analytical profiles, discrete conservation invariants, and observed orders of accuracy under grid refinement, and reporting the residual discrepancy wherever a benchmark comparison is approximate.</p>

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
        'That the code is verified because it reproduces a measurement.',
        'That the turbulence model is validated for this car.',
        'Neither on its own, because without an estimate of the numerical error, the agreement could come from numerical and model errors cancelling.',
        'Both, since the total error (15.1) is small.',
      ],
      answer: 2,
      explain: 'A small total error $S - T$ can arise when $(S - M)$ and $(M - T)$ in (15.1) have similar magnitudes and opposite signs. Establishing that the model is accurate requires verifying the code against a known solution and estimating the discretisation error across multiple grids; if refining the grid degrades the agreement with the wind tunnel, the coarse-grid match was due to error cancellation.',
    },
    q2: {
      type: 'predict',
      q: 'The code is second order everywhere except one row, where the slope condition at $x = 1$ uses the first-order difference $(u_N - u_{N-1})/h$. As the grid is refined, what does the observed order of the maximum error tend to?',
      choices: [
        '2, because one row out of hundreds has negligible effect.',
        '1, because the boundary error couples into the interior solution and dominates on fine grids.',
        '1.5, corresponding to the average of the interior and boundary orders.',
        '0, meaning the error stops decreasing.',
      ],
      answer: 1,
      explain: 'Because the elliptic boundary-value problem couples every interior node to the Neumann boundary condition, an $O(h)$ truncation error in that single boundary row shifts the global solution by $O(h)$, which dominates the $O(h^2)$ interior error on fine grids. On coarse grids the boundary and interior errors have opposite signs and partially cancel, causing the observed orders to fluctuate (1.60, 0.58, 0.83 …) before settling to 1.',
    },
    q3: {
      type: 'num',
      q: 'Three grids with ratio $r = 2$ give $f_1 = 1.0050$ (finest), $f_2 = 1.0200$ and $f_3 = 1.0800$. What is the Richardson-extrapolated value $f_0$?',
      answer: 1.0,
      atol: 0.0005,
      explain: 'The grid-to-grid differences are $f_2 - f_1 = 0.0150$ and $f_3 - f_2 = 0.0600$, a ratio of 4, which gives $p = \\ln 4 / \\ln 2 = 2$ by (15.5). Substituting into (15.6) yields $f_0 = 1.0050 + (1.0050 - 1.0200)/3 = 1.0000$. The corresponding GCI from (15.7) is $1.25 \\times (0.0150/1.0050)/3 \\approx 0.62\\,\\%$, giving a reported value of $1.005 \\pm 0.62\\,\\%$.',
    },
    q4: {
      type: 'predict',
      q: 'In Float32, a total of $1$ receives $10^{-8}$ a million times by plain addition $s = s + x$. What is the final total?',
      choices: ['1.01, accurate to the displayed digits', 'About 1.0099, with a small fraction lost to rounding', 'Exactly 1', 'Infinity or NaN due to overflow'],
      answer: 2,
      explain: 'Just above 1, the spacing between adjacent Float32 numbers is $2^{-23} \\approx 1.2 \\times 10^{-7}$, so $1 + 10^{-8}$ lies less than half a spacing above 1 and rounds back to 1 on every step, losing the entire inflow. Kahan summation accumulates the discarded low-order bits in its compensation variable and recovers 1.01.',
    },
    q5: {
      type: 'mcq',
      q: 'Your cavity code differs from the Ghia et al. (1982) tables by 0.5 % of the lid speed, and refining your grid no longer reduces the gap. What can you conclude?',
      choices: [
        'Your code has a coding defect that introduces a 0.5 % offset.',
        'Ghia et al. made an error of 0.5 %.',
        'The comparison has reached the accuracy limit of the reference table, which is itself a finite-difference approximation.',
        'Lattice Boltzmann methods cannot achieve better than 0.5 % accuracy on this flow.',
      ],
      answer: 2,
      explain: 'Because Ghia et al. computed their benchmark table using a finite-difference multigrid solver on a $129\\times129$ grid, their numbers contain their own discretisation error. Testing convergence beyond $0.5\\,\\%$ requires comparing against a higher-accuracy reference solution (such as Botella and Peyret 1998 or Erturk et al. 2005) or computing a three-grid GCI on your own solver.',
    },
  },
  glossary: {
    verification: {
      term: 'verification',
      def: 'Determining that a computational model implementation accurately represents the developer’s conceptual description and solution of the governing equations, comprising code verification (checking order of accuracy against known solutions) and solution verification (estimating the numerical error of a given calculation).',
      section: 'v-and-v',
    },
    validation: {
      term: 'validation',
      def: 'Determining the degree to which a mathematical model is an accurate representation of the real world from the perspective of the intended uses of the model, assessed by comparing verified simulations against experimental data with quantified uncertainties.',
      section: 'v-and-v',
    },
    'manufactured-solution': {
      term: 'manufactured solution',
      def: 'A smooth analytical function chosen in advance for code verification; substituting it into the governing PDE defines the exact forcing source term and boundary values, allowing the solver’s observed order of accuracy to be tested.',
      section: 'code-verification',
    },
    'richardson-extrapolation': {
      term: 'Richardson extrapolation',
      def: 'Combining discrete solutions on systematically refined grids to eliminate the leading-order truncation error term $C h^p$, yielding the continuum estimate $f_0 \\approx f_1 + (f_1 - f_2)/(r^p - 1)$ for grid refinement ratio $r$.',
      section: 'solution-verification',
    },
    'grid-convergence-index': {
      term: 'Grid Convergence Index (GCI)',
      def: 'Roache’s (1994) standardised discretisation uncertainty estimate from a grid refinement study, defined as $F_s\\,|(f_1 - f_2)/f_1| / (r^p - 1)$ with safety factor $F_s = 1.25$ on three or more grids and $F_s = 3$ on two grids.',
      section: 'solution-verification',
    },
    'asymptotic-range': {
      term: 'asymptotic range',
      def: 'The regime of sufficiently fine grid spacings $h$ in which the single leading-order truncation term $C h^p$ dominates all higher-order terms, so that the observed order $p$ is constant and matches the theoretical design order.',
      section: 'solution-verification',
    },
    'kahan-summation': {
      term: 'Kahan summation',
      def: 'Compensated floating-point addition (Kahan 1965) in which a secondary variable captures the rounding error committed at each step and feeds it into the next addition, keeping the relative error bound independent of the number of summed terms $n$.',
      section: 'floating-point',
    },
    benchmark: {
      term: 'benchmark',
      def: 'A standardised test problem with a documented reference solution—either an exact analytical solution, a high-precision numerical solution, or a well-characterised experiment—used to evaluate solver accuracy or model fidelity.',
      section: 'validation',
    },
  },
  pathologies: [
    {
      id: 'false-convergence',
      name: 'False convergence',
      family: 'accuracy',
      symptom: 'Two successive grids produce nearly identical output values, yielding an anomalously high observed order $p$ and an artificially narrow GCI band, even though the solution error is much larger than the band.',
      cause: 'On coarse grids, competing truncation error terms of opposite sign (such as a first-order boundary error and a second-order interior error) can cancel near a particular grid spacing. Because Richardson extrapolation assumes a single dominant error term $C h^p$, accidental two-grid agreement under-predicts the true error.',
      diagnose: 'Compare the observed order $p$ against the theoretical design order of the scheme, since an observed order substantially above the design order signals error cancellation. Adding a fourth grid checks whether the next three-grid triple maintains monotonic convergence at a consistent order.',
      mitigations: [
        'Use at least three systematically refined grids (and a fourth when $p$ departs from the design order), reporting the observed order and convergence class alongside the GCI.',
        'Continue refining until the observed order stabilises near the theoretical design order before applying Richardson extrapolation.',
        'Verify the solver with manufactured solutions first to eliminate low-order boundary or stencil bugs that create competing error terms.',
        'Track multiple output functionals simultaneously, since accidental cancellation rarely occurs at the same grid spacing across independent flow quantities.',
      ],
      section: 'solution-verification',
      demo: { widget: 'trust-gci', data: { preset: 'false-convergence' } },
    },
    {
      id: 'pre-asymptotic',
      name: 'Pre-asymptotic grids',
      family: 'resolution',
      symptom: 'The observed order of accuracy fluctuates across successive refinements (such as 1.60, 0.58, 0.83, 0.92 in the MMS boundary-bug test) or differs substantially from the design order, and Richardson-extrapolated values can be less accurate than the fine-grid solution.',
      cause: 'The grids are too coarse for the single leading-order truncation term $C h^p$ to dominate higher-order terms or competing error sources of different orders.',
      diagnose: 'Tabulate the observed order across at least three grid refinements to check whether $p$ settles toward the design order; oscillatory or divergent three-grid differences likewise indicate pre-asymptotic resolution.',
      mitigations: [
        'Refine the grid further with a constant refinement ratio until the observed order stabilises.',
        'Apply the conservative safety factor $F_s = 3$ when computing a GCI on grids whose observed order differs from the theoretical order.',
        'Inspect boundary closures, slope limiters, and solution smoothness to identify any lower-order component that reduces the true asymptotic convergence rate.',
      ],
      section: 'solution-verification',
      demo: { widget: 'trust-mms', data: { preset: 'bc' } },
    },
    {
      id: 'roundoff-accumulation',
      name: 'Round-off accumulation',
      family: 'accuracy',
      symptom: 'A globally conserved quantity drifts steadily over long integrations or fails to register small boundary fluxes; a floating-point simulation clock slows down and eventually stalls; or Float32, Float64, and multi-threaded runs disagree.',
      cause: 'Each floating-point addition rounds its result to the nearest representable number. Increments smaller than $\\tfrac12\\,\\mathrm{ulp}(s)$ are lost completely when added to a large running total $s$, while biased rounding errors of consistent sign accumulate linearly with the number of steps.',
      diagnose: 'Compare the increment magnitude against $u\\,|s|$ (half the floating-point spacing at the accumulator value $s$), and compare results against a double-precision or Kahan-compensated run.',
      mitigations: [
        'Accumulate long running totals (mass budgets, time averages, and global norms) in Float64 or with Kahan compensated summation.',
        'Maintain the time step index as an integer $n$ and evaluate physical time as $t = n\\,\\Delta t$.',
        'Store perturbations relative to a reference state so that small increments are not added directly to a large background value.',
        'Enforce a fixed tree-reduction order independent of thread count, or use a reproducible summation algorithm (Demmel and Nguyen 2013), when bitwise-identical parallel reductions are required.',
      ],
      section: 'floating-point',
      demo: { widget: 'trust-float', data: { preset: 'stall' } },
    },
  ],
};
