// Chapter 6: From calculus to arithmetic. How derivatives become differences
// (Taylor series, stencils, truncation error, order of accuracy), why shrinking
// the step eventually makes things worse (round-off, cancellation, the complex
// step), the ways of storing a function in n numbers (points, cell averages,
// hat functions, Fourier modes), when refinement is guaranteed to converge
// (Lax–Richtmyer), and Richardson, who did all of this by hand.
// Kernels: src/sims/verification.js and src/sims/advection.js (shared), and the
// chapter's own src/sims/ch-discretization-{stencil,precision,represent}.js;
// tests in tests/fluid-course/ch-discretization.test.js.

import { mountStencil, mountWeights } from './discretization/stencil.js';
import { mountV, mountCancel } from './discretization/vee.js';
import { mountRepresentations } from './discretization/represent.js';
import { mountConvergence, mountExtrapolate } from './discretization/converge.js';

export const chapter = {
  id: 'discretization',
  title: 'From calculus to arithmetic',
  short: 'Discretisation',
  blurb: 'Taylor series, stencils, truncation error, and the round-off floor beneath them all.',
  minutes: 40,
  html: String.raw`
<p class="lead-in">Because a computer stores a finite array of floating-point numbers—each rounded to about sixteen decimal digits—rather than a continuous function, numerical PDE solvers replace derivatives and integrals with arithmetic on discrete values. In this chapter you will approximate derivatives with finite differences and measure how their truncation error shrinks with the step size, see why shrinking the step too far amplifies round-off error, compare four ways of representing a function in $n$ numbers, and examine the Lax equivalence theorem that links consistency and stability to convergence. The chapter closes with Lewis Fry Richardson, who carried out finite-difference calculations and $h^2$ extrapolation by hand more than a century ago.</p>

<h2 id="taylor">Taylor series and finite differences</h2>

<p>A derivative is the slope of a function at a point, whereas a grid stores $f$ only at points separated by a finite spacing $h$. Approximating the derivative from the slope of a chord across those grid points introduces an error whose size and rate of decay with $h$ come directly from Taylor's theorem.</p>

<p>For a smooth function, the value a small step away is the value at $x$ plus a series of terms in powers of $h$:</p>

<div class="eq" id="eq-taylor">$$f(x+h) = f(x) + h\,f'(x) + \frac{h^2}{2}\,f''(x) + \frac{h^3}{6}\,f'''(x) + \frac{h^4}{24}\,f^{(4)}(x) + \dots$$<span class="eq-tag">(6.1)</span></div>

<p>Rearranging (6.1) for $f'(x)$ gives the forward <dfn data-term="finite-difference">finite-difference</dfn> formula together with the series of terms that the approximation omits:</p>

<div class="eq" id="eq-forward">$$\frac{f(x+h) - f(x)}{h} = f'(x) + \underbrace{\frac{h}{2}\,f''(x) + \frac{h^2}{6}\,f'''(x) + \dots}_{\text{truncation error}}$$<span class="eq-tag">(6.2)</span></div>

<p>The omitted remainder is the <dfn data-term="truncation-error">truncation error</dfn>, named because it comes from truncating the Taylor series. Its leading term is $\tfrac{h}{2}f''(x)$, so halving $h$ halves the error; the backward difference, $(f(x) - f(x-h))/h$, has the same leading magnitude with the opposite sign. Subtracting the Taylor expansion of $f(x-h)$ from that of $f(x+h)$ cancels every even power of $h$, leaving the centred difference:</p>

<div class="eq" id="eq-central">$$\frac{f(x+h) - f(x-h)}{2h} = f'(x) + \frac{h^2}{6}\,f'''(x) + \frac{h^4}{120}\,f^{(5)}(x) + \dots$$<span class="eq-tag">(6.3)</span></div>

<p>Because its leading error is proportional to $h^2$, halving the step size reduces the error by a factor of four. The exponent $p$ is the formula's <dfn data-term="order-of-accuracy">order of accuracy</dfn>: a method of order $p$ has truncation error $C h^p$ as $h \to 0$, written $O(h^p)$ in <dfn data-term="big-o">big-O</dfn> notation. The order of accuracy determines how fast the error falls under grid refinement—halving $h$ divides the leading error by $2$ at first order, by $4$ at second order and by $16$ at fourth order. Adding the expansions of $f(x+h)$ and $f(x-h)$ instead cancels the odd powers and yields the centred second difference, used throughout the diffusion and pressure chapters:</p>

<div class="eq" id="eq-second">$$\frac{f(x+h) - 2f(x) + f(x-h)}{h^2} = f''(x) + \frac{h^2}{12}\,f^{(4)}(x) + \dots$$<span class="eq-tag">(6.4)</span></div>

<p>The set of points a formula uses, with their weights, is its <dfn data-term="stencil">stencil</dfn>. The centred first derivative uses $\{x-h, x+h\}$ with weights $\{-\tfrac12, \tfrac12\}$, divided by $h$. The second difference uses $\{x-h, x, x+h\}$ with weights $\{1, -2, 1\}$, divided by $h^2$. On a grid $x_j = j\,\Delta x$ with values $f_j$, the same formulas read $(f_{j+1} - f_{j-1})/2\Delta x$ and so on. The rest of the course writes them that way.</p>

<figure data-widget="discretization-stencil"><figcaption>Four estimates of the slope of $f(x) = e^x/\sqrt{\sin^3 x + \cos^3 x}$ at $x_0$, drawn as lines through the point with the estimated slope, beside the exact tangent (grey, dashed). The table gives each error at $h$ and at $h/2$; the ratio of the two is $2^p$ for a formula of order $p$.</figcaption></figure>

<div class="try"><ol>
<li>At the default $h = 0.1$ read the ratio column: about 2 for forward and backward, 4 for central, 16 for the fourth-order formula. Those are $2^1$, $2^2$ and $2^4$.</li>
<li>Drag $h$ up to 0.4. The ratios wander away from 2, 4 and 16: the leading term no longer dominates the ones behind it. Order is a statement about small $h$, and "small" depends on the function.</li>
<li>Pick $\sin x$ and put $x_0$ at 0. The forward difference now looks second order, because $f''(0) = 0$ removes its leading error term. The design order is the worst case; a particular function at a particular point can do better.</li>
<li>Push $h$ down to $10^{-3}$. The fourth-order ratio goes ragged. The error there is so small that rounding in the arithmetic has started to show, which is the subject of the next section.</li>
</ol></div>

<p>There is nothing special about the textbook formulas. Pick any set of offsets $s_j$ (in units of $h$) and ask for weights $w_j$ so that $h^{-m}\sum_j w_j f(x + s_j h)$ approximates the $m$-th derivative. Substitute the Taylor series (6.1) for every $f(x + s_j h)$ and collect powers of $h$. The combination equals $f^{(m)}$ plus a truncation error if the weights satisfy one linear condition per power:</p>

<div class="eq" id="eq-moments">$$\sum_{j} w_j\, s_j^{\,k} = \begin{cases} m! & k = m \\ 0 & k \ne m \end{cases}\qquad k = 0, 1, \dots, q-1$$<span class="eq-tag">(6.5)</span></div>

<p>With $q$ distinct points, (6.5) is a non-singular $q \times q$ Vandermonde system with a unique solution. The first power $k \ge q$ that the weights do not cancel determines the leading truncation error and sets the order $p = k - m$, so $q$ points achieve order at least $q - m$ in general. A symmetric stencil on an even derivative—or an antisymmetric stencil on an odd derivative—gains an additional order of accuracy because the first uncancelled moment vanishes by symmetry, which is why three points yield a second-order second derivative. Bengt Fornberg formulated a fast, numerically stable algorithm for generating these weights on arbitrary point sets (1988), used to build stencils on non-uniform grids and near boundaries.</p>

<figure data-widget="discretization-weights"><figcaption>Switch stencil points on and off and choose the derivative. The weights come from solving (6.5) in exact fractions. The plot shows the measured error on $\sin x$ at $x = 0.7$ (solid) beside the predicted leading term (dashed); their slope on these log–log axes is the order.</figcaption></figure>

<div class="try"><ol>
<li>Switch on $-2, -1, 0, +1, +2$. You get $\tfrac{1}{12}, -\tfrac{2}{3}, 0, \tfrac{2}{3}, -\tfrac{1}{12}$ and order 4: the formula in the previous figure.</li>
<li>Use only $0, +1, +2$. This is the one-sided formula you need at a wall, where there is no point at $-1$. It is second order, but its error constant is $-\tfrac13$, twice the size of the centred formula's $\tfrac16$.</li>
<li>Choose $f''$ and switch off points until fewer than three remain. The status explains why: two values cannot see curvature.</li>
<li>Watch the measured curve at small $h$. Every stencil eventually leaves its predicted line and turns upward. Higher derivatives turn up sooner, because they divide by $h^m$.</li>
</ol></div>

<aside class="who" data-person="gottfried-wilhelm-leibniz">Leibniz built his calculus on <i>differentia</i> and <i>summa</i>: d for a difference and ∫ (a long s) for a sum. Both first appear in his manuscripts of autumn 1675 (∫ on 29 October, d on 11 November), and in print in 1684 (d) and 1686 (∫). A finite difference is his d before the limit is taken, and a quadrature rule is his ∫ carried out as an actual sum.</aside>

<aside class="history" data-era="1755">Euler wrote $\Delta y$ for the change in $y$ when $x$ grows by a finite step, and adopted $\Delta x$ for the step itself, in his <i>Institutiones calculi differentialis</i> (1755). Numerical analysis took a long time to settle on it. Courant, Friedrichs and Lewy (1928) used $h$ for the time step. Lax and Richtmyer (1956) wrote $\Delta t$ and $\Delta x$. Many numerical-analysis books today use $h$ for the space step and $k$ for the time step, the reverse of 1928. Check the convention before you copy a formula.</aside>

<details class="deeper"><summary>Go deeper: truncation error of a formula, and of a scheme</summary>
<p>For a single formula, the truncation error is what (6.2) shows: the difference between the formula applied to the exact function and the exact derivative. For a time-stepping scheme the idea is the same, applied to the whole update. Substitute the exact solution of the PDE into the difference equation; whatever is left over is the local truncation error $\tau$. A scheme is <em>consistent</em> if $\tau \to 0$ as the grid is refined, and it has order $p$ in space and $q$ in time if $\tau = O(\Delta x^p + \Delta t^q)$.</p>
<p>Two conventions are in use, and they differ by a factor of $\Delta t$. Richtmyer and Morton (1967) divide the leftover by $\Delta t$, so a first-order scheme has truncation error $O(\Delta t)$. Other books do not, and call the same quantity the local error $O(\Delta t^2)$. Neither is the error you see at the end of a run. That global error is the accumulation of many local errors, and whether they accumulate harmlessly is the question of stability (see <a href="#/discretization/convergence">below</a>).</p>
<p>The symmetric cancellation in (6.3) is general. If the offsets come in pairs $\pm s$ and the weights are odd (for odd $m$) or even (for even $m$) under $s \to -s$, every moment $\sum_j w_j s_j^k$ with $k - m$ odd vanishes. The first surviving error power is then $k = m + p$ with $p$ even.</p>
</details>

<div data-quiz="q1"></div>

<h2 id="round-off">Round-off: when smaller steps make things worse</h2>

<p>In exact arithmetic, shrinking $h$ indefinitely would drive the truncation error to zero; in floating-point arithmetic, however, each number is stored to a finite precision. IEEE 754 double precision carries 53 binary significand bits (about 16 decimal digits), so the spacing between $1$ and the next larger representable number—the <dfn data-term="machine-epsilon">machine epsilon</dfn>—is $\varepsilon = 2^{-52} \approx 2.2 \times 10^{-16}$, while single precision has $\varepsilon = 2^{-23} \approx 1.2 \times 10^{-7}$. Each basic arithmetic operation rounds its exact result to the nearest representable floating-point number, introducing a relative error of at most $\varepsilon/2$ known as <dfn data-term="round-off-error">round-off error</dfn>.</p>

<p>While a single rounding error of size $\varepsilon/2$ is tiny, subtracting two nearly equal numbers cancels their shared leading digits and leaves a small difference dominated by the rounding errors already present in the operands. At $x = 10^{-6}$, for example, $1 - \cos x$ has the exact value $5.0 \times 10^{-13}$, but $\cos x$ is stored with an absolute rounding error of up to $1.1 \times 10^{-16}$, leaving only about four accurate significant digits in the difference; below $x \approx 1.05 \times 10^{-8}$, $\cos x$ rounds to $1$ and $1 - \cos x$ evaluates to $0$. This loss of significance is <em>catastrophic cancellation</em>, and it is avoided by algebraic rearrangement—writing $1 - \cos x = 2\sin^2(x/2)$ eliminates the subtraction of nearly equal quantities and retains full machine precision.</p>

<figure data-widget="discretization-cancel"><figcaption>Five formulas that subtract nearly equal numbers, each beside an algebraically equal rearrangement. The plot shows the relative error of each against $x$; the readouts count the correct significant digits at the chosen $x$.</figcaption></figure>

<div class="try"><ol>
<li>Slide $x$ down from $10^{-1}$. The naive $1 - \cos x$ loses digits steadily as $\cos x$ approaches 1, then returns exactly 0. The rearranged form stays at the round-off floor throughout.</li>
<li>Choose the hydrostatic example. It computes a pressure difference in single precision by subtracting two absolute pressures near 101 325 Pa, where the spacing of single-precision numbers is about 0.0078 Pa. A 0.1 mm column of water comes out as 0.984 Pa instead of 0.981. This is why flow solvers store gauge or perturbation pressure, not absolute pressure.</li>
<li>Try the small root of $x^2 + bx + 1 = 0$ at $b = 10^8$: the textbook quadratic formula gets less than one digit right.</li>
</ol></div>

<p>Every difference quotient is a cancellation. At $x = 1.5$ with $h = 10^{-8}$, the function in the figures above takes the values 4.497780054 and 4.497780094. They agree in eight leading digits, so their difference keeps only the other eight. Dividing by $h$ does not bring them back. So the error of a forward difference has two parts pulling in opposite directions: truncation, which shrinks with $h$, and round-off, which grows as $1/h$. A simple worst-case model charges each function value an error of $\varepsilon|f|$:</p>

<div class="eq" id="eq-v">$$E(h) \approx \underbrace{\frac{h}{2}\,|f''|}_{\text{truncation}} + \underbrace{\frac{2\varepsilon\,|f|}{h}}_{\text{round-off}},\qquad h^{*} = 2\sqrt{\frac{\varepsilon\,|f|}{|f''|}} \sim \sqrt{\varepsilon}$$<span class="eq-tag">(6.6)</span></div>

<p>On log–log axes the two terms are straight lines of slope $+1$ and $-1$, and their sum is a V. The best step sits near $\sqrt{\varepsilon} \approx 1.5 \times 10^{-8}$, and at the bottom of the V the relative error is about $\sqrt{\varepsilon}$—roughly eight decimal digits, half of what double precision holds. A higher-order formula has a steeper truncation branch, so the V's bottom moves to larger $h$ and lower error. In general an order-$p$ formula is best near $h \sim \varepsilon^{1/(p+1)}$, with about $\varepsilon^{p/(p+1)}$ relative error. In double precision that is about 8 digits at first order, 10 to 11 at second order and 12 to 13 at fourth order.</p>

<figure data-widget="discretization-v" class="wide"><figcaption>Relative error of the forward, central, fourth-order and complex-step derivatives of the same function at $x = 1.5$, against the step $h$. Circles mark each formula's best step, found by fitting the two branches of its V. The horizontal rule is machine epsilon for the chosen arithmetic. The worst-case model (6.6) can be overlaid.</figcaption></figure>

<div class="try"><ol>
<li>Slide $h$ from right to left. The status tells you which branch of the central difference's V you are on. Shrinking $h$ helps until about $3 \times 10^{-6}$, then hurts.</li>
<li>Switch on the worst-case model. Measured errors sit below it on the round-off side, usually by a factor of several, because rounding errors partly cancel rather than all adding up. The measured best steps also sit a little to the left of the model's $h^*$. The model captures the V shape and scaling with $\varepsilon$, while overestimating the amplitude of the round-off branch.</li>
<li>Switch to single precision. The whole V moves up and to the right. The forward difference now manages only 3 to 4 digits, at $h$ near $2 \times 10^{-4}$, and the central difference about 5. Estimate the best forward step from $\sqrt{\varepsilon}$ with $\varepsilon = 1.2 \times 10^{-7}$ and compare.</li>
<li>Still in single precision, go below $h \approx 6 \times 10^{-8}$. Now $x + h$ rounds back to $x$, the step has vanished, and every difference formula returns 0. Only the complex step survives.</li>
</ol></div>

<p>The flat curve in that figure is the <dfn data-term="complex-step">complex step</dfn> approximation. Evaluating an analytic function $f$ at the complex argument $x + ih$ and expanding in a Taylor series separates the even powers into the real part and the odd powers into the imaginary part, so the first derivative appears in the imaginary part without any subtraction:</p>

<div class="eq" id="eq-complex-step">$$f(x + ih) = f(x) + ih\,f'(x) - \frac{h^2}{2}\,f''(x) - \frac{ih^3}{6}\,f'''(x) + \dots\quad\Rightarrow\quad f'(x) = \frac{\operatorname{Im} f(x+ih)}{h} + O(h^2)$$<span class="eq-tag">(6.7)</span></div>

<p>Because (6.7) subtracts no nearly equal numbers, it has no $1/h$ round-off branch: at $h = 10^{-200}$ the $O(h^2)$ truncation error is far below machine epsilon, and $\operatorname{Im} f(x+ih)/h$ is accurate to full double precision (or about seven digits in single precision). Applying (6.7) requires $f$ to be analytic and the evaluation routine to support complex arithmetic without non-analytic operations such as absolute values or branching on the imaginary part. Aerodynamic design codes use the complex step to verify adjoint gradients and compute sensitivities (Martins, Sturdza and Alonso 2003); the use of complex arithmetic for differentiation goes back to Lyness and Moler (1967), and the compact formula (6.7) was popularised by Squire and Trapp (1998), whose test function is plotted in these figures.</p>

<aside class="note" data-label="Which epsilon?">Books disagree on the name. Some call $2^{-52}$ (the gap above 1) machine epsilon, as here and as in most programming languages. Others give that name to the unit round-off $u = 2^{-53}$, the largest relative error of one correctly rounded operation. The two differ by a factor of 2. Check which one a formula means before you trust its constant.</aside>

<aside class="pitfall">If a gradient check, a finite-difference Jacobian or a Newton solver behaves worse when you shrink its difference step, you have walked past the bottom of the V. See <a href="#/pathologies">the gallery</a> entries for the round-off floor and for catastrophic cancellation. Scale the step with the variable ($h \approx \sqrt{\varepsilon}\max(|x|, 1)$ for a forward difference) and never use a fixed tiny $h$.</aside>

<details class="deeper"><summary>Go deeper: where the best step comes from</summary>
<p>Write the error of an order-$p$ formula as $E(h) = A h^p + B/h$, with $A$ the truncation constant (for example $|f''|/2$) and $B$ the round-off constant (for example $2\varepsilon|f|$). Setting $\mathrm{d}E/\mathrm{d}h = 0$ gives</p>
$$h^{*} = \left(\frac{B}{pA}\right)^{1/(p+1)},\qquad E(h^{*}) = \left(1 + \frac{1}{p}\right)\frac{B}{h^{*}} \propto \varepsilon^{p/(p+1)}$$
<p>With $\varepsilon = 2.2 \times 10^{-16}$ that is about $10^{-7.8}$ for $p = 1$, $10^{-10.4}$ for $p = 2$ and $10^{-12.5}$ for $p = 4$, if $A$ and $B$ are of order one. The measured best errors in the figure for this function are 7.9, 10.5 and 12.4 digits. In single precision the same formulas give 3.4, 4.7 and 5.7 digits.</p>
<p>The model treats every rounding error as being as large as possible and all of them as adding. Real rounding errors are smaller on average and partly cancel, which is why the measured round-off branch lies several times below the model. That does not change the slopes, so it barely moves $h^*$.</p>
</details>

<div data-quiz="q2"></div>

<h2 id="grids">Points, cell averages and basis functions</h2>

<p>Before you can differentiate anything on a computer you must decide what your $n$ stored numbers <em>mean</em>. The same list of numbers can stand for very different things, and the choice decides what a method keeps exactly and what it only approximates. There are three main answers.</p>

<p><strong>Point values.</strong> Each number is the function at a grid point, $u_j = u(x_j)$. Derivatives come from finite differences, as above. This is the simplest choice, and the one the <a href="#/advection/ftcs">advection</a> and <a href="#/stiffness/heat">diffusion</a> chapters mostly use.</p>

<p><strong>Cell averages.</strong> Each number is the average of the function over a cell, $\bar u_j = \frac{1}{h}\int_{\text{cell } j} u\,\mathrm{d}x$. This is the <dfn data-term="finite-volume">finite-volume</dfn> view of <a href="#/conservation/finite-volume">chapter 3</a>. Its great virtue is bookkeeping: $h\sum_j \bar u_j$ is the total amount of $u$, exactly, so a scheme that only moves amounts between neighbouring cells conserves mass and momentum to round-off.</p>

<p><strong>Basis coefficients.</strong> Each number is the weight of a fixed shape, and the function is their sum, $u(x) \approx \sum_k c_k\,\phi_k(x)$. If the shapes are local, such as the piecewise-linear "hat" that is 1 at one node and 0 at its neighbours, you have the <dfn data-term="finite-element">finite element</dfn> method. If they are global, such as sines and cosines spanning the whole domain, you have a <dfn data-term="spectral-method">spectral method</dfn>. The coefficients are usually chosen so that the error is orthogonal to every basis function, which makes the sum the best fit in the mean-square sense.</p>

<div class="eq" id="eq-reps">$$u_j = u(x_j),\qquad \bar u_j = \frac{1}{h}\int_{x_j}^{x_{j+1}} u\,\mathrm{d}x,\qquad u(x) \approx \sum_{k} c_k\,\phi_k(x)$$<span class="eq-tag">(6.8)</span></div>

<p>Which representation keeps the integral $\int u\,\mathrm{d}x$ exactly? Cell averages do, by definition. Hat-function coefficients do too, because the hats add up to the constant 1, so the mean-square fit cannot get the total wrong. The Fourier series does, because its zeroth coefficient is the mean. Point values do not. Their sum is only the trapezoidal rule for $\int u$, which misses by an amount proportional to $h$ when $u$ has a jump and to $h^2$ when it has a kink, though it is extraordinarily accurate for smooth periodic data.</p>

<p>On smooth data, piecewise-linear interpolation of point values and hat-function projection both converge at second order in $L^2$, whereas piecewise-constant cell averages are first order unless a slope is reconstructed inside each cell (the limiters of <a href="#/shocks/limiters">chapter 8</a>). For smooth periodic functions, a truncated Fourier series converges faster than any algebraic power of $1/n$—on the smooth bump below, twelve numbers give an error near $10^{-5}$ and sixteen give $6 \times 10^{-8}$. That spectral accuracy is why spectral methods are widely used to simulate turbulence in simple geometries (<a href="#/turbulence/aliasing">chapter 14</a>). At a jump, however, every representation drops to a mean-square error falling only like $n^{-1/2}$; the Fourier series overshoots each jump by about 9% of its height regardless of how many modes are kept, and the mean-square-best hat fit overshoots as well, whereas cell averages and point values remain bounded by the extrema of $u$.</p>

<figure data-widget="discretization-representations" class="wide"><figcaption>One function on the periodic interval $[0, 1)$ stored in $n$ numbers four ways: point values (joined by straight lines), cell averages (a constant per cell), hat-function coefficients (the mean-square-best piecewise-linear fit) and a truncated Fourier series with $2K+1 \le n$ coefficients. The table compares all four at this $n$: mean-square ($L^2$) error, the error in the integral, and the overshoot as a fraction of the function's range.</figcaption></figure>

<div class="try"><ol>
<li>On the smooth bump at $n = 12$, step through the four representations and read the table. The Fourier error is hundreds of times smaller than the others. Raise $n$ to 16 and it drops to $6 \times 10^{-8}$; the others barely move.</li>
<li>Choose the square wave and Fourier modes, then raise $n$. The wiggles crowd towards the jumps, but their height settles near 9% instead of shrinking. More modes do not remove the overshoot; they only narrow it.</li>
<li>With the square wave, compare the "∫R − ∫f" column of the table (scroll it sideways on a phone), or step through the representations and watch the mass-error readout. Averages, hats and Fourier keep the integral to round-off. Point values miss by about $10^{-2}$ at $n = 16$.</li>
<li>Choose the narrow Gaussian at $n = 12$. Every representation is poor, and the order readout is far from its design value. The bump is only a few cells wide. Raise $n$ to 32 or more and the orders settle at 2 for points and hats and 1 for averages, while the Fourier error plunges to round-off. A method shows its order only once the features are resolved.</li>
</ol></div>

<aside class="who" data-person="richard-courant">His 1943 paper on variational methods used piecewise-linear functions on triangles, an early mathematical ancestor of the finite element method. The engineering method grew up largely independently, in 1950s structural analysis.</aside>

<aside class="history" data-era="1848">The 9% overshoot of a Fourier series at a jump is called the Gibbs phenomenon, after J. Willard Gibbs's letters to <i>Nature</i> in 1898 and 1899. Henry Wilbraham had described it in 1848, half a century earlier (Hewitt and Hewitt 1979). The limiting overshoot is about 0.0895 of the jump on each side.</aside>

<div data-quiz="q3"></div>

<h2 id="convergence">Consistency, stability and convergence</h2>

<p>What you want from a numerical method is <dfn data-term="convergence">convergence</dfn>: as the grid is refined, the computed solution approaches the exact one. The truncation error of the previous sections does not promise that. It measures how well the scheme approximates the equation in a single step at a single point. A time-stepping scheme takes thousands of steps, and each step carries forward all the errors made before it. If the scheme damps old errors, or merely keeps them the same size, the final error is roughly the sum of the local ones. If it amplifies them, small errors grow without limit, however accurate each step is.</p>

<p>Convergence therefore depends on two separate properties. A scheme has <dfn data-term="consistency">consistency</dfn> if its local truncation error tends to zero as $\Delta x$ and $\Delta t$ tend to zero, meaning the discrete equation approaches the continuous PDE. It has <dfn data-term="stability">stability</dfn> if the solutions it produces stay bounded, uniformly in the grid, over a fixed time interval $[0, T]$, ruling out error amplification that grows without bound as the grid is refined while allowing physical growth of the form $e^{CT}$. The <dfn data-term="lax-equivalence">Lax equivalence theorem</dfn>, proved by Peter Lax and Robert Richtmyer (1956), joins the two:</p>

<div class="eq" id="eq-lax">$$\text{consistency} + \text{stability} \iff \text{convergence}$$<span class="eq-tag">(6.9)</span></div>

<p>It holds for a well-posed linear initial-value problem and a consistent linear scheme. It is the reason numerical analysts spend so much effort on stability. Consistency is usually easy, a Taylor expansion as in the <a href="#/discretization/taylor">first section</a>. Stability is the hard part, and the tools for it (the <a href="#/advection/cfl">CFL condition</a>, <a href="#/advection/von-neumann">von Neumann analysis</a>) are the business of the next chapter. You might hope that stability only matters for rounding errors, so that exact arithmetic would not need it. Lax and Richtmyer answered that too: an unstable scheme fails even in exact arithmetic, "unless, of course, the initial data are chosen with diabolical care so as to be exactly free of those components that would be unduly amplified if they were present."</p>

<p>In practice you check convergence with a <dfn data-term="convergence-study">convergence study</dfn>. Solve a problem whose exact answer you know on a sequence of grids, each twice as fine as the last. Measure the error on each. Plot error against $n$ on log–log axes: a converging method of order $p$ gives a straight line of slope $-p$. Between two grids the observed order is</p>

<div class="eq" id="eq-order">$$p_{\text{obs}} = \frac{\log\left(E_{n}/E_{2n}\right)}{\log 2}$$<span class="eq-tag">(6.10)</span></div>

<p>If it settles at the design order, the scheme converges as advertised and the code very likely implements it correctly. If it settles lower, something (a bug, a boundary condition, a jump in the data) is limiting it. <a href="#/trust/code-verification">Chapter 15</a> turns this into a formal method for verifying codes.</p>

<figure data-widget="discretization-convergence"><figcaption>A convergence study of the advection equation $u_t + u_x = 0$ (<a href="#/advection/characteristics">chapter 7</a>), carried once round a periodic domain, on 16 to 512 cells. Each point is one complete run; the dashed lines have slopes −1 and −2. The readout gives the observed order between the two finest grids.</figcaption></figure>

<div class="try"><ol>
<li>The default is Lax–Wendroff on a sine wave at Courant number $\nu = 0.5$. The points fall on a line parallel to the slope −2 guide, and the observed order is 2.00.</li>
<li>Choose upwind. Its order creeps up from 0.8 on the coarsest pair to 0.99 on the finest. Quote orders from the finest grids, where the leading error term dominates.</li>
<li>Choose Fromm's scheme. At $\nu = 0.5$ it converges at third order, one better than its design order, because its leading error term vanishes at exactly that Courant number. Move $\nu$ and it drops back to 2.</li>
<li>Choose the square wave. Every scheme drops below first order: about 1/2 for upwind and Lax–Friedrichs, 0.6 to 0.75 for Lax–Wendroff and Fromm. A jump is not smooth, so the Taylor series behind every order estimate does not apply there.</li>
<li>Set $\nu = 1$. Upwind and Lax–Wendroff become exact: each step moves the data exactly one cell, and the error is round-off on every grid.</li>
</ol></div>

<p>To see what happens when stability fails, consider FTCS (forward in time, centred in space), the simplest centred scheme for advection. Although FTCS is consistent—first order in time and second order in space—it is unconditionally unstable at every fixed Courant number (<a href="#/advection/ftcs">chapter 7</a> shows why). Predict what its convergence study looks like before you run it.</p>

<div data-quiz="q4"></div>

<figure data-widget="discretization-convergence" data-preset="ftcs"><figcaption>The same study for FTCS at $\nu = 0.5$. Switch the time step to $\Delta t \propto \Delta x^2$ to make it stable in the Lax–Richtmyer sense.</figcaption></figure>

<div class="try"><ol>
<li>Watch the points arrive. The error halves from 0.53 at $n = 16$ to 0.05 at $n = 128$, exactly what a consistent first-order scheme should do, and then jumps to about $10^{8}$ at $n = 256$ and $10^{32}$ at $n = 512$.</li>
<li>Switch to $\Delta t \propto \Delta x^2$. The same scheme now converges, at order 2. The per-step growth of FTCS is at most $\sqrt{1 + \nu^2}$, and with $\nu \propto \Delta x$ its compound over a fixed time stays bounded. Stability is achieved by shrinking the time step quadratically, requiring 32,768 steps on the finest grid instead of 1,024.</li>
<li>Go back to Lax–Wendroff and raise $\nu$ to 1.1, past its stability limit. The error falls on the coarse grids and then explodes. Consistency did not change; stability did.</li>
</ol></div>

<p>Notice why FTCS looked fine on the coarse grids. The sine wave itself is a long wave, which FTCS barely amplifies. What grows is a short wave about four cells long, the fastest-growing mode of FTCS. It starts at round-off size, about $10^{-16}$, and grows by a factor of up to $\sqrt{1 + \nu^2}$ per step. A finer grid takes more steps, so the round-off seed has more time to grow. At $n = 128$ it has not yet reached the size of the truncation error; at $n = 256$ it has overtaken it by eight orders of magnitude. An unstable scheme can pass a quick test on a coarse grid and fail on the grid you actually wanted.</p>

<aside class="who" data-person="peter-lax">The general framework was first presented at Lax's seminar at New York University in January 1954. The joint paper with Richtmyer, "Survey of the stability of linear finite difference equations", was received in October 1955 and appeared in 1956. The theorem is often called simply the Lax equivalence theorem; Lax's biographers say his work on it was inspired by Richtmyer.</aside>

<aside class="who" data-person="robert-richtmyer">Co-author of the 1956 equivalence theorem, and author of <i>Difference Methods for Initial-Value Problems</i> (1957; second edition with K. W. Morton, 1967), the standard early textbook on the subject.</aside>

<aside class="note" data-label="Linear only">The theorem is about linear problems. For the nonlinear equations of gas dynamics, a convergent scheme can still converge to the wrong answer. It must also be written in conservation form, and an entropy condition is needed to pick out the physical solution (<a href="#/shocks/rankine-hugoniot">chapter 8</a>). And stability alone is not enough either: a stable scheme that is not consistent converges to a different equation (<a href="#/stiffness/inconsistency">chapter 9</a>).</aside>

<details class="deeper"><summary>Go deeper: why stability turns local errors into a global bound</summary>
<p>Write one step of a linear scheme as $\mathbf{u}^{n+1} = S\,\mathbf{u}^n$ and let $\mathbf{e}^n$ be the error at step $n$. Substituting the exact solution into the scheme leaves a local error $\Delta t\,\boldsymbol{\tau}^n$ per step, so $\mathbf{e}^{n+1} = S\,\mathbf{e}^n - \Delta t\,\boldsymbol{\tau}^n$. Unrolling from $\mathbf{e}^0 = 0$:</p>
$$\mathbf{e}^{N} = -\Delta t\sum_{n=0}^{N-1} S^{\,N-1-n}\,\boldsymbol{\tau}^n$$
<p>Stability in the Lax–Richtmyer sense means $\|S^k\| \le K$ for all $k\Delta t \le T$, with $K$ independent of the grid. Then $\|\mathbf{e}^N\| \le K\,N\Delta t\,\max_n\|\boldsymbol{\tau}^n\| = K\,T\,\max_n\|\boldsymbol{\tau}^n\|$, which tends to zero with the truncation error. So a stable scheme of order $p$ converges at order $p$. The converse, that convergence requires stability, is the deeper half of the theorem; it uses the uniform boundedness principle.</p>
</details>

<div data-quiz="q5"></div>

<h2 id="richardson">Richardson: arithmetic by hand</h2>

<p>Several ideas in this chapter were first put to serious use by one man, without a computer. In a paper read to the Royal Society on 13 January 1910 and printed in its <i>Philosophical Transactions</i> in 1911, Lewis Fry Richardson computed the stresses in a masonry dam by replacing the derivatives in its equations with central differences on a grid. The abstract states the whole programme in one sentence: "In order to deal with irregular boundaries, analysis is replaced by arithmetic, continuous functions are represented by tables of numbers, differentials by central differences." He solved the resulting large systems by an iteration that corrects each guess by a multiple of its residual, an ancestor of the relaxation methods of <a href="#/solvers/relaxation">chapter 11</a>. He paid human computers piece rates; one of the quickest boys averaged 2,000 operations a week on three-digit numbers.</p>

<p>The same paper made a further step. Richardson knew from Taylor series that the error of his central differences has the form $k_2 h^2 + k_4 h^4 + \dots$. So he computed the answer on two grids and used the known form of the error to cancel its leading term. If $F(h)$ has error $k h^p + \dots$, then</p>

<div class="eq" id="eq-richardson">$$F^{*} = F(h/2) + \frac{F(h/2) - F(h)}{2^{p} - 1}$$<span class="eq-tag">(6.11)</span></div>

<p>has no $h^p$ term at all. That is <dfn data-term="richardson-extrapolation">Richardson extrapolation</dfn>. Applied once to the central difference with $p = 2$, it reproduces exactly the five-point fourth-order formula of the first section. Applied again with $p = 4$ it cancels the $h^4$ term, and so on. Richardson developed the idea systematically in 1927, in a paper with J. A. Gaunt whose title names it "the deferred approach to the limit". In his words: "When such difficulties are encountered it may be well to return to the manner in which they did things before the calculus was invented, postponing the passage to the limit until after the problem has been solved for a moderate number of moderately small differences." He illustrated it by estimating $\pi$ from regular polygons inscribed in a circle, whose half-perimeters $n\sin(\pi/n)$ approach $\pi$ with an error series in even powers of $1/n$.</p>

<figure data-widget="discretization-extrapolate"><figcaption>Richardson's table. The first column is the raw sequence, each row with half the step of the one above (or twice as many polygon sides). Each further column applies (6.11) to its neighbours with $p = 2, 4, 6, 8$. The cells give correct significant digits; the plot shows the error of each column against the step.</figcaption></figure>

<div class="try"><ol>
<li>With the default central difference starting at $h_0 = 0.8$, the raw values creep from 1 to 4 correct digits. Four rounds of extrapolation of the same six numbers give about 15. The slopes on the plot step up by 2 per column: 2, 4, 6, 8.</li>
<li>Start from $h_0 = 0.05$. The extrapolated columns now reach the round-off floor of the previous section after one or two rounds, and further columns get slightly worse. Extrapolation assumes the error is the smooth series; round-off is not.</li>
<li>Choose the polygons, starting from the hexagon. The 192-gon alone gives about 4 digits of $\pi$; the extrapolated table gives essentially all 16. If you combine the 2-, 3-, 4-, 5- and 6-gons (fitting a polynomial in $1/n^2$ and evaluating it at zero) you get 3.14159264.</li>
</ol></div>

<p>Richardson extrapolation also yields an asymptotic error estimate without solving on a third grid: the difference $F(h/2) - F^* = (F(h/2) - F(h))/(2^p - 1)$ estimates the leading-order error remaining in the fine-grid answer $F(h/2)$. Engineering practice uses three-grid versions of this estimate to put an uncertainty band on a simulation—the Grid Convergence Index of <a href="#/trust/solution-verification">chapter 15</a>.</p>

<aside class="who" data-person="lewis-fry-richardson">Pioneer of numerical PDEs: finite differences, iterative solution and $h^2$ extrapolation in the 1910 dam paper, the first numerical weather forecast in 1922, and the "deferred approach to the limit" in 1927. The time-stepping scheme for the heat equation that textbooks name after him is unstable, a story told in <a href="#/stiffness/inconsistency">chapter 9</a>.</aside>

<p>Richardson's most ambitious calculation was a weather forecast. <i>Weather Prediction by Numerical Process</i> (1922) set out a complete method: divide the atmosphere into columns on a grid, replace the equations of motion with finite differences, and step forward in time. He worked one example by hand, in France between 1916 and 1918, while he served with the Friends' Ambulance Unit. He started from observations at 0700 UTC on 20 May 1910 and computed the initial rates of change in two columns over central Europe. "It took me the best part of six weeks to draw up the computing forms and to work out the new distribution in two vertical columns for the first time. My office was a heap of hay in a cold rest billet." During the Battle of Champagne in April 1917 his working copy was sent to the rear and lost. It was found some months later under a heap of coal.</p>

<p>Extrapolated over a single six-hour step, Richardson's tendency calculation predicted that surface pressure at a grid point in Bavaria would rise by 145 hPa, whereas the observed barometer remained nearly steady. Peter Lynch's 2006 reconstruction clarifies two points often misstated in textbook accounts: the six weeks Richardson mentioned covered only designing the computing forms and completing the first draft (Lynch estimates the full calculation took roughly 960 hours over two years), and the large error did not come from step-by-step CFL instability, because Richardson evaluated only the initial time derivatives—twenty numbers in total—and multiplied by six hours in a single forward step. When Lynch repeated the arithmetic on a computer, he reproduced Richardson's tendency (145.4 versus 145.1 hPa), and when he first smoothed the initial wind and pressure fields with a digital filter to remove high-frequency gravity-wave imbalance, the predicted six-hour pressure change dropped to a realistic −0.9 hPa. In Lynch's words, the six-hour extrapolation "exacerbated the problem, but was not the root cause of it."</p>

<aside class="history" data-era="1922">The book ends with a "forecast factory": a hall of human computers, each working on one part of the globe, coordinated by a conductor. Richardson estimated that 64,000 computers would be needed to keep pace with the weather (MacTutor rounds this to 60,000; Lynch reckoned that about a million would really have been needed). The preface is modest about it: "Perhaps some day in the dim future it will be possible to advance the computations faster than the weather advances and at a cost less than the saving to mankind due to the information gained. But that is a dream." The first computer forecasts ran on ENIAC in 1950, organised by John von Neumann with Jule Charney and Ragnar Fjørtoft.</aside>

<div data-quiz="q6"></div>

<h2 id="sources">Sources and further reading</h2>

<ol class="refs">
<li>L. F. Richardson, "The approximate arithmetical solution by finite differences of physical problems involving differential equations, with an application to the stresses in a masonry dam", <i>Phil. Trans. R. Soc. Lond. A</i> 210 (1911) 307–357, doi:10.1098/rsta.1911.0009. Read 13 January 1910; abstract printed March 1910.</li>
<li>L. F. Richardson and J. A. Gaunt, "The deferred approach to the limit", <i>Phil. Trans. R. Soc. Lond. A</i> 226 (1927) 299–361, doi:10.1098/rsta.1927.0008.</li>
<li>L. F. Richardson, <i>Weather Prediction by Numerical Process</i>, Cambridge University Press (1922); Dover reprint (1965).</li>
<li>P. Lynch, <i>The Emergence of Numerical Weather Prediction: Richardson's Dream</i>, Cambridge University Press (2006). The reconstruction of the 1922 forecast and the analysis of why it failed.</li>
<li>P. D. Lax and R. D. Richtmyer, "Survey of the stability of linear finite difference equations", <i>Comm. Pure Appl. Math.</i> 9(2) (1956) 267–293, doi:10.1002/cpa.3160090206.</li>
<li>R. D. Richtmyer and K. W. Morton, <i>Difference Methods for Initial-Value Problems</i>, 2nd ed., Interscience (1967).</li>
<li>R. Courant, "Variational methods for the solution of problems of equilibrium and vibrations", <i>Bull. Amer. Math. Soc.</i> 49(1) (1943) 1–23, doi:10.1090/S0002-9904-1943-07818-4.</li>
<li>B. Fornberg, "Generation of finite difference formulas on arbitrarily spaced grids", <i>Math. Comp.</i> 51(184) (1988) 699–706.</li>
<li>R. J. LeVeque, <i>Finite Difference Methods for Ordinary and Partial Differential Equations</i>, SIAM (2007). Chapters 1 and 2 cover stencils, truncation error and convergence.</li>
<li>R. J. LeVeque, <i>Finite Volume Methods for Hyperbolic Problems</i>, Cambridge University Press (2002), chapter 4.</li>
<li>G. Strang and G. J. Fix, <i>An Analysis of the Finite Element Method</i>, Prentice-Hall (1973), chapter 1.</li>
<li>L. N. Trefethen, <i>Spectral Methods in MATLAB</i>, SIAM (2000).</li>
<li>N. J. Higham, <i>Accuracy and Stability of Numerical Algorithms</i>, 2nd ed., SIAM (2002), chapters 1 and 2.</li>
<li>D. Goldberg, "What every computer scientist should know about floating-point arithmetic", <i>ACM Comput. Surv.</i> 23(1) (1991) 5–48.</li>
<li><i>IEEE Standard for Floating-Point Arithmetic</i>, IEEE Std 754-2019.</li>
<li>J. N. Lyness and C. B. Moler, "Numerical differentiation of analytic functions", <i>SIAM J. Numer. Anal.</i> 4(2) (1967) 202–210.</li>
<li>W. Squire and G. Trapp, "Using complex variables to estimate derivatives of real functions", <i>SIAM Review</i> 40(1) (1998) 110–112.</li>
<li>J. R. R. A. Martins, P. Sturdza and J. J. Alonso, "The complex-step derivative approximation", <i>ACM Trans. Math. Softw.</i> 29(3) (2003) 245–262.</li>
<li>E. Hewitt and R. E. Hewitt, "The Gibbs–Wilbraham phenomenon: an episode in Fourier analysis", <i>Arch. Hist. Exact Sci.</i> 21 (1979) 129–160.</li>
<li>L. Euler, <i>Institutiones calculi differentialis</i>, St Petersburg (1755), Part I, chapter 1.</li>
</ol>
`,
  widgets: {
    'discretization-stencil': mountStencil,
    'discretization-weights': mountWeights,
    'discretization-cancel': mountCancel,
    'discretization-v': mountV,
    'discretization-representations': mountRepresentations,
    'discretization-convergence': mountConvergence,
    'discretization-extrapolate': mountExtrapolate,
  },
  quizzes: {
    q1: {
      type: 'num',
      q: 'A central difference (6.3) gives a derivative with error $8 \\times 10^{-4}$ at $h = 0.02$. Roughly what error do you expect at $h = 0.005$?',
      answer: 5e-5,
      tol: 0.1,
      explain: 'The step shrinks by 4 and the error by $4^2 = 16$, because the leading error $\\tfrac{h^2}{6}f\'\'\'$ is second order: $8 \\times 10^{-4}/16 = 5 \\times 10^{-5}$. If you answered $2 \\times 10^{-4}$ you scaled it as first order, like a forward difference. Both assume $h$ is small enough for the leading term to dominate and large enough for round-off not to matter.',
    },
    q2: {
      type: 'predict',
      q: 'In double precision you shrink the step of a central difference from $10^{-2}$ to $10^{-12}$. What happens to its error?',
      choices: [
        'It keeps falling like $h^2$, all the way down to about $10^{-16}$.',
        'It falls like $h^2$ until $h$ is near $10^{-5}$, then rises roughly like $1/h$.',
        'It falls until about $10^{-8}$ and then stays flat at machine epsilon.',
        'It does not change: double precision has more than enough digits for any $h$.',
      ],
      answer: 1,
      explain: 'Truncation error ($\\propto h^2$) and round-off error ($\\propto \\varepsilon/h$) pull in opposite directions, so the error traces a V with its bottom near $\\varepsilon^{1/3} \\approx 6 \\times 10^{-6}$. Below that, subtracting two nearly equal function values loses more digits than the smaller step gains. The round-off branch does not stay flat; it grows as $h$ shrinks, because the cancellation gets worse and the division by $h$ magnifies it. Only the complex step, which subtracts nothing, stays flat.',
    },
    q3: {
      type: 'mcq',
      q: 'A square wave stored as a truncated Fourier series with 64 modes overshoots each jump by about 9%. You double the number of modes to 128. What happens to the overshoot?',
      choices: [
        'It halves, because the series converges at first order.',
        'It stays near 9%, but the wiggles crowd closer to the jump.',
        'It disappears, because spectral methods converge faster than any power of $1/n$.',
        'It grows, because higher modes add more oscillation.',
      ],
      answer: 1,
      explain: 'This is the Gibbs phenomenon. The peak overshoot tends to about 0.0895 of the jump however many modes you keep; extra modes only narrow the region where it occurs, so the mean-square error still falls (like $n^{-1/2}$). Spectral accuracy needs smooth data: the faster-than-any-power convergence holds for smooth periodic functions, not for a jump.',
    },
    q4: {
      type: 'predict',
      q: 'FTCS on a sine wave at $\\nu = 0.5$ has errors 0.53, 0.23, 0.11 and 0.051 on 16, 32, 64 and 128 cells. What do you expect at 512 cells?',
      choices: [
        'About 0.013: it is first order, so the error keeps halving.',
        'About 0.001: the second-order space error takes over on fine grids.',
        'An enormous error: FTCS is unstable, and on fine grids the instability overwhelms everything.',
        'About 0.05: the error has stalled at the truncation error.',
      ],
      answer: 2,
      explain: 'FTCS is consistent but unstable at any fixed Courant number, so by the Lax equivalence theorem it cannot converge. On coarse grids the growth has too few steps to show. A finer grid takes more steps, and a short wave about four cells long, seeded by round-off at $10^{-16}$, grows by up to $\\sqrt{1+\\nu^2}$ per step until it dominates: the measured error is about $10^{8}$ at 256 cells and $10^{32}$ at 512.',
    },
    q5: {
      type: 'num',
      q: 'A quantity whose error behaves like $C h^2$ comes out as 1.0400 at $h = 0.1$ and 1.0100 at $h = 0.05$. Use Richardson extrapolation (6.11) to estimate the exact value.',
      answer: 1.0,
      atol: 0.0005,
      explain: '$F^* = F(h/2) + (F(h/2) - F(h))/(2^2 - 1) = 1.0100 + (1.0100 - 1.0400)/3 = 1.0000$. The two errors are $4C(0.05)^2$ and $C(0.05)^2$ here, in the ratio 4, so their difference, 0.03, is three times the fine-grid error. Extrapolation only works when the error really has the assumed form; on grids too coarse for the leading term to dominate it can make things worse.',
    },
    q6: {
      type: 'mcq',
      q: 'Richardson\'s 1922 hand forecast predicted a 145 hPa pressure rise in six hours where the real barometer was nearly steady. What does the modern reconstruction by Peter Lynch identify as the root cause?',
      choices: [
        'A time step that violated the CFL condition, so a numerical instability grew step by step.',
        'Imbalance in the initial data, which excited spurious fast gravity waves; filtering the initial state gives a realistic −0.9 hPa.',
        'Arithmetic mistakes made under wartime conditions.',
        'A grid far too coarse to represent the weather systems over Europe.',
      ],
      answer: 1,
      explain: 'Richardson computed only the initial rates of change and extrapolated them in a single six-hour step, so no step-by-step instability could have grown. Lynch reproduced his numbers (145.4 against 145.1 hPa) and showed that balancing the initial winds and pressures first gives −0.9 hPa. The long time step made the effect of the imbalance worse, though the imbalance in the initial data was the primary cause.',
    },
  },
  glossary: {
    'finite-difference': {
      term: 'finite difference',
      def: 'An approximation to a derivative built from function values at a few nearby points, such as $(f(x+h) - f(x-h))/2h$ for $f\'(x)$. Taylor series give its weights and its error.',
      section: 'taylor',
    },
    'truncation-error': {
      term: 'truncation error',
      def: 'The error a discrete formula makes because it keeps only the first terms of a Taylor series. For a scheme, what is left over when the exact solution is substituted into the difference equations. Conventions differ by a factor of $\\Delta t$.',
      section: 'taylor',
    },
    'order-of-accuracy': {
      term: 'order of accuracy',
      def: 'The power $p$ in an error that behaves like $Ch^p$ as the step $h$ shrinks. Halving $h$ divides the error by $2^p$. It describes small $h$ only, and smooth data only.',
      section: 'taylor',
    },
    'round-off-error': {
      term: 'round-off error',
      def: 'The error from storing numbers and the results of arithmetic with finitely many digits. Each correctly rounded operation has relative error at most half the machine epsilon; subtraction of nearly equal numbers can magnify it enormously.',
      section: 'round-off',
    },
    'machine-epsilon': {
      term: 'machine epsilon',
      def: 'The gap between 1 and the next larger floating-point number: $2^{-52} \\approx 2.2 \\times 10^{-16}$ in double precision, $2^{-23} \\approx 1.2 \\times 10^{-7}$ in single. Some texts use the name for half this value, the unit round-off.',
      section: 'round-off',
    },
    'complex-step': {
      term: 'complex step',
      def: 'The derivative estimate $f\'(x) \\approx \\operatorname{Im} f(x + ih)/h$. It subtracts nothing, so it has no cancellation and works with tiny $h$, giving derivatives accurate to round-off. Needs $f$ analytic and a code that runs in complex arithmetic.',
      section: 'round-off',
    },
    'finite-element': {
      term: 'finite element method',
      def: 'A discretisation that writes the solution as a sum of local basis functions (for example piecewise-linear hats on a mesh) and chooses the coefficients so that the error is orthogonal to every basis function.',
      section: 'grids',
    },
    'spectral-method': {
      term: 'spectral method',
      def: 'A discretisation that writes the solution as a sum of global basis functions, such as Fourier modes. On smooth data its error falls faster than any power of $1/n$; at a jump it suffers the Gibbs overshoot.',
      section: 'grids',
    },
    consistency: {
      term: 'consistency',
      def: 'A scheme is consistent if its local truncation error tends to zero as the grid spacing and time step tend to zero, so that the discrete equations approach the continuous PDE.',
      section: 'convergence',
    },
    stability: {
      term: 'stability',
      def: 'In the Lax–Richtmyer sense, a scheme is stable if its solutions stay bounded over a fixed time interval by a constant that does not depend on the grid. Growth like $e^{CT}$ is allowed; growth that worsens with refinement is not.',
      section: 'convergence',
    },
    convergence: {
      term: 'convergence',
      def: 'A scheme converges if its solution approaches the exact solution as the grid spacing and time step tend to zero.',
      section: 'convergence',
    },
    'lax-equivalence': {
      term: 'Lax equivalence theorem',
      def: 'For a well-posed linear initial-value problem and a consistent scheme, stability is necessary and sufficient for convergence (Lax and Richtmyer 1956). Also called the Lax–Richtmyer theorem.',
      section: 'convergence',
    },
    'convergence-study': {
      term: 'convergence study',
      def: 'Running the same problem on a sequence of refined grids and plotting the error against the grid size on log–log axes. The slope is the observed order of accuracy.',
      section: 'convergence',
    },
  },
  pathologies: [
    {
      id: 'roundoff-floor',
      name: 'Round-off floor in difference quotients',
      family: 'accuracy',
      symptom: 'Shrinking the step size $h$ of a finite-difference derivative, Jacobian or gradient check past its optimal value causes the error to grow roughly as $1/h$ and turn noisy; with a very small step the derivative evaluates to $0$.',
      cause: 'The truncation error falls like $h^p$, but the two function values being subtracted agree in more and more leading digits, so their rounding errors (about $\\varepsilon|f|$ each) are divided by $h$. The sum is smallest near $h \\sim \\varepsilon^{1/(p+1)}$: about $10^{-8}$ for a forward difference in double precision, a few times $10^{-4}$ in single.',
      diagnose: 'Sweep $h$ over many decades and plot the error, or the change in the estimate, on log–log axes. A V shape with a right branch of slope $p$ and a left branch of slope $-1$ is the signature. Also check that $x + h \\ne x$ in the working precision.',
      mitigations: [
        'Choose the step near the bottom of the V and scale it with the variable, for example $h = \\sqrt{\\varepsilon}\\max(|x|, 1)$ for a forward difference and $\\varepsilon^{1/3}\\max(|x|, 1)$ for a central one.',
        'Use a higher-order formula: its V bottoms out at a larger step and a smaller error (about 13 digits for fourth order in double precision), at the cost of more function evaluations.',
        'Avoid differencing altogether: the complex step or automatic differentiation give derivatives accurate to round-off, at the cost of complex or dual-number arithmetic throughout the code.',
        'Work in double rather than single precision for anything that is differenced.',
        'Make the step exactly representable ($h \\leftarrow (x + h) - x$). This removes one source of error but only modestly lowers the round-off branch.',
      ],
      section: 'round-off',
      demo: { widget: 'discretization-v', data: { preset: 'floor' } },
    },
    {
      id: 'catastrophic-cancellation',
      name: 'Catastrophic cancellation',
      family: 'accuracy',
      symptom: 'A small difference of two large quantities has few or no correct digits: $1 - \\cos x$ returns exactly 0 for $x$ below about $10^{-8}$; a pressure difference computed from two absolute pressures in single precision comes out in steps of a few millipascals.',
      cause: 'Subtraction of nearly equal numbers is exact, but the leading digits cancel and what remains is dominated by the rounding errors already in the operands. The relative error is magnified by roughly $(|a| + |b|)/|a - b|$.',
      diagnose: 'Compare the result with an algebraically equivalent form, or recompute in higher precision. Look for subtractions whose operands are much larger than their difference, especially in single precision.',
      mitigations: [
        'Rearrange the formula to avoid the subtraction: half-angle identities ($1 - \\cos x = 2\\sin^2(x/2)$), conjugates for square roots and the quadratic formula, and library functions such as expm1 and log1p.',
        'Store deviations from a reference state rather than totals: gauge or perturbation pressure, density anomalies, displacement from a base position.',
        'Carry the critical subtraction in higher precision, or accumulate long sums with compensated (Kahan) summation.',
      ],
      section: 'round-off',
      demo: { widget: 'discretization-cancel', data: { preset: 'gauge' } },
    },
  ],
};
