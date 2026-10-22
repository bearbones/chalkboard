// Chapter 11: Solving for pressure. The linear system behind every
// projection, direct against iterative solution, relaxation (Jacobi,
// Gauss–Seidel, red–black, SOR), why relaxation stalls on smooth error,
// multigrid, conjugate gradients and preconditioning, and what each method
// costs as the grid is refined, including what a loose tolerance leaks.
// Widgets live in ./solvers/; the chapter's own kernels are
// ../sims/ch-solvers-direct.js (Cholesky fill) and ../sims/ch-solvers-krylov.js
// (steepest descent and CG on small dense systems), tested with the chapter's
// claims in tests/fluid-course/ch-solvers.test.js. Everything else runs the
// shared poisson.js and stablefluids.js kernels.

import { mountFill } from './solvers/fill.js';
import { mountSweep } from './solvers/sweep.js';
import { mountSor } from './solvers/sor.js';
import { mountModes } from './solvers/modes.js';
import { mountVcycle } from './solvers/vcycle.js';
import { mountKrylov } from './solvers/krylov.js';
import { mountRace } from './solvers/race.js';
import { mountTolerance } from './solvers/tolerance.js';

export const chapter = {
  id: 'solvers',
  title: 'Solving for pressure',
  short: 'Pressure solvers',
  blurb: 'Jacobi, Gauss–Seidel, conjugate gradients, and multigrid, and why relaxation damps smooth errors slowly.',
  minutes: 45,
  html: String.raw`
<p class="lead-in">Every step of an incompressible projection solver requires finding the pressure field that makes the velocity divergence-free. <a href="#/pressure/projection">The previous chapter</a> formulated that elliptic boundary-value problem; this chapter examines the algorithms that solve it, which account for most of the runtime in an incompressible code. The simplest iterative methods update one cell at a time from its neighbours, damping grid-scale oscillations in a few sweeps while leaving smooth, long-wavelength errors nearly unchanged. Two main approaches overcome that slowdown. Multigrid transfers smooth residuals onto coarser grids where they appear oscillatory and decay rapidly, while conjugate gradients chooses each search direction to be $A$-orthogonal to all previous directions so that earlier progress is never undone. The final section compares how these solvers scale as the grid is refined and measures the volume drift introduced when the pressure solve is stopped at a loose tolerance.</p>

<h2 id="the-system">One equation per cell</h2>

<p>In a projection step you know the provisional velocity $\mathbf{u}^*$, and you need the pressure whose gradient removes its divergence. On a grid of square cells of side $h$, the <a href="#/pressure/mac">MAC grid</a> turns that into one equation for every fluid cell. Each equation links a cell's pressure to its four neighbours through the five-point <dfn data-term="stencil">stencil</dfn>:</p>

<div class="eq" id="eq-five-point">$$\frac{4p_{i,j} - p_{i-1,j} - p_{i+1,j} - p_{i,j-1} - p_{i,j+1}}{h^2} = b_{i,j}$$<span class="eq-tag">(11.1)</span></div>

<p>Here $b_{i,j} = -(\nabla_h\cdot\mathbf{u}^*)_{i,j}/\Delta t$ for a fluid of unit density; the minus signs make the matrix positive. This is the discrete <dfn data-term="pressure-poisson">pressure Poisson equation</dfn>. Next to a wall the missing neighbour drops out and the 4 becomes 3 or 2. Collecting the pressures of an $n \times n$ grid into a vector $\mathbf{p}$ of $N = n^2$ unknowns writes these cell equations as a single linear system, $A\mathbf{p} = \mathbf{b}$.</p>

<p>The matrix $A$ has three structural properties that the solvers in this chapter exploit:</p>
<ul>
<li><strong>Sparse</strong>: each row of length $N$ has at most five nonzero entries, so matrix-free solvers apply the five-point stencil directly without storing $A$ as a matrix.</li>
<li><strong>Symmetric</strong>: the coupling coefficient between adjacent cells $c$ and $d$ is identical in both directions.</li>
<li><strong>Positive definite</strong> when at least one boundary fixes the pressure level (such as an open Dirichlet boundary), and positive semi-definite in a closed box where constant vectors form a one-dimensional null space. In the closed case a solution exists only when $\mathbf{b}$ satisfies the <dfn data-term="compatibility-condition">compatibility condition</dfn> $\sum_c b_c = 0$ from the previous chapter, so every solver below first subtracts the mean of $\mathbf{b}$.</li>
</ul>

<p>Solving $A\mathbf{p} = \mathbf{b}$ dominates the cost of an incompressible step because the Poisson equation is elliptic, coupling every cell's pressure to the divergence across the entire domain at once, as <a href="#/pressure/constraint">the first figure of the previous chapter</a> showed. Whereas explicit advection and body forces read only a local neighbourhood of each cell a fixed number of times per step, the pressure solve must propagate information across the full width of the grid every step.</p>

<p>A <strong>direct</strong> solver computes an exact factorisation—Gaussian elimination, or for symmetric positive definite matrices the Cholesky factorisation $A = LL^{\mathrm{T}}$—followed by forward and backward triangular solves. Treating $A$ as a dense $N \times N$ matrix would require about $N^3/3$ multiply–adds and $N^2$ words of storage ($3 \times 10^{17}$ operations and $10^{12}$ numbers on a $1000 \times 1000$ grid with $N = 10^6$). Numbering the cells row by row instead makes $A$ banded, with every nonzero entry within $n$ columns of the diagonal. Cholesky elimination creates no nonzeros outside the band, but it fills in the entries inside the band, as the figure below shows. The factor $L$ then stores about $N n = n^3$ nonzeros and requires about $N n^2/2 = n^4/2$ multiply–adds—at $n = 1000$, roughly $10^9$ double-precision numbers (8 gigabytes) and $5 \times 10^{11}$ operations. Reordering the unknowns by nested dissection (George, 1973), which recursively numbers two halves of the grid before the separator line of cells between them, reduces the two-dimensional factorisation cost to $O(n^3)$ operations and $O(n^2\log n)$ storage, though fill-in grows much faster in three dimensions.</p>

<figure data-widget="solvers-fill" class="wide"><figcaption>The Cholesky factor of the five-point matrix, measured. Lower half of $A$ on the left, $L$ on the right; lighter entries are fill, zeros of $A$ that elimination turned into nonzeros. The plot counts nonzeros for every $n$ from 4 to 32. Row by row, $L$ fills the band and grows like $n^3$; nested dissection grows more slowly.</figcaption></figure>
<div class="try"><ol>
<li>Drag $n$ from 4 to 32 with the row-by-row numbering. The band in $L$ fills completely: at $n = 24$ the factor has 13,847 nonzeros, against 1,680 in the lower half of $A$ and $Nn = 13{,}824$ for a full band.</li>
<li>Switch to nested dissection at $n = 24$. The fill drops to 7,690, and the gap widens as $n$ grows. The fitted growth readout compares the two.</li>
<li>Look at the numbers of multiply–adds, which grow faster than the fill at roughly $n^4/2$ under row-by-row numbering.</li>
</ol></div>

<p>When the domain geometry and solid boundaries are fixed, $L$ can be factorised once during preprocessing and reused for two triangular solves at every step, making sparse direct solvers practical on moderate two-dimensional grids. Whenever a moving solid or a free surface changes the set of active fluid cells, however, $L$ must be refactorised, and its storage grows superlinearly with $N$. <strong>Iterative</strong> solvers avoid factorisation by starting from an initial guess—often the pressure from the previous time step—and updating it in place using only a few operations per cell and a few vectors of memory, stopping once the residual falls below a chosen tolerance. Their efficiency depends on how many iterations are needed to reach that tolerance, and how that count scales with the grid size $n$.</p>

<aside class="who" data-person="simeon-denis-poisson">In a note of December 1813 he showed that inside an attracting mass the potential obeys an equation with a source term, $\nabla^2 V = -4\pi\rho$ in his sign convention, and not Laplace's equation. In a fluid solver the source is the divergence of the provisional velocity.</aside>

<div data-quiz="q1"></div>

<h2 id="relaxation">Relaxation: fix one cell at a time</h2>

<p>The simplest iterative methods are relaxation schemes, which adjust one cell's pressure at a time so that its local five-point equation (11.1) holds for the current neighbour values. Because updating one cell alters the balance at its four neighbours, the sweep must be repeated over the grid until the equations are satisfied everywhere to tolerance. Beginning in the 1930s, engineers carried out this process by hand as Southwell's relaxation method, scanning for the cell with the largest residual and adjusting it first; on a computer the cells are visited in a fixed sweep order, and that ordering determines both the convergence rate and the available parallelism.</p>

<p><dfn data-term="jacobi-method">Jacobi's method</dfn> updates every cell from the old values of its neighbours:</p>

<div class="eq" id="eq-jacobi">$$\begin{aligned} p_{i,j}^{(k+1)} = \frac{1}{4}\Big(&p_{i-1,j}^{(k)} + p_{i+1,j}^{(k)} \\ &+ p_{i,j-1}^{(k)} + p_{i,j+1}^{(k)} + h^2 b_{i,j}\Big) \end{aligned}$$<span class="eq-tag">(11.2)</span></div>

<p>Every cell can be updated simultaneously, which suits parallel hardware. Weighted Jacobi moves a fraction $\omega$ of the way toward the Jacobi update, $p^{(k+1)} = p^{(k)} + \omega\,(p^{\text{Jacobi}} - p^{(k)})$. <dfn data-term="gauss-seidel">Gauss–Seidel</dfn> instead uses each updated value as soon as it is computed; sweeping row by row from the bottom left, the neighbours to the left and below already hold their new values:</p>

<div class="eq" id="eq-gauss-seidel">$$\begin{aligned} p_{i,j}^{(k+1)} = \frac{1}{4}\Big(&p_{i-1,j}^{(k+1)} + p_{i+1,j}^{(k)} \\ &+ p_{i,j-1}^{(k+1)} + p_{i,j+1}^{(k)} + h^2 b_{i,j}\Big) \end{aligned}$$<span class="eq-tag">(11.3)</span></div>

<p>Gauss–Seidel performs the same arithmetic per sweep as Jacobi, overwrites a single pressure array in place, and converges in roughly half as many sweeps—on a $16 \times 16$ Dirichlet problem ($p = 0$ on the walls), reducing the residual by $10^6$ takes 265 Gauss–Seidel sweeps compared with 564 for Jacobi. Because each update depends on two just-computed neighbours, lexicographic row-by-row sweeping is sequential, but <dfn data-term="red-black-ordering">red–black ordering</dfn> restores parallelism by partitioning the cells by the chessboard parity of $i + j$. Since every red cell's four neighbours are black, all red cells can be updated in parallel using the current black values, followed by all black cells using the new red values, achieving the same convergence rate (264 sweeps on the $16 \times 16$ Dirichlet test).</p>

<p>Tracking convergence requires distinguishing two vectors. The <dfn data-term="residual">residual</dfn> $\mathbf{r} = \mathbf{b} - A\mathbf{p}$ measures the discrepancy in the discrete equations and can be evaluated on every sweep, whereas the algebraic error $\mathbf{e} = \mathbf{p}^* - \mathbf{p}$ measures the distance to the exact discrete solution $\mathbf{p}^*$ and is unknown during a solve. The two are related through $A$:</p>

<div class="eq" id="eq-residual">$$\begin{aligned} A\mathbf{e} &= \mathbf{r}, \\ \frac{\|\mathbf{e}\|}{\|\mathbf{p}^*\|} &\le \kappa(A)\,\frac{\|\mathbf{r}\|}{\|\mathbf{b}\|}, \qquad \kappa(A) = \frac{\lambda_{\max}}{\lambda_{\min}} \end{aligned}$$<span class="eq-tag">(11.4)</span></div>

<p>Here the condition number $\kappa(A)$ is the ratio of the largest to the smallest eigenvalue of $A$ (taking the smallest nonzero eigenvalue in a closed box). For the five-point Laplacian, $\kappa(A)$ scales as $O(n^2)$, growing from about 206 on a $16 \times 16$ closed box to 13,279 at $128 \times 128$. Because $\kappa(A)$ is large, a small residual norm does not guarantee a comparably small error norm, even though practical stopping criteria must test $\|\mathbf{r}\|/\|\mathbf{b}\|$.</p>

<div data-quiz="q2"></div>

<figure data-widget="solvers-sweep" class="wide"><figcaption>Sweeps on a $16 \times 16$ closed box with a random right-hand side, run by the course's solvers with every cell update replayed in order. The cell being written is outlined in the write colour, the four it reads in the read colour; dots mark cells already updated in this sweep. Colour shows the error (the guess minus the exact answer, both with their mean removed) or the residual, each on a fixed scale set at the start.</figcaption></figure>
<div class="try"><ol>
<li>With Gauss–Seidel, watch the error map. After 10 sweeps the residual is down to 0.13 of its start, but the error is still 0.79. What is left of the error is a broad, smooth hill.</li>
<li>Switch the map to the residual and run again. It fades to a speckle within a few sweeps. A smooth error makes almost no residual, because the stencil measures curvature.</li>
<li>Try red–black at one cell per frame: all red cells first, then all black. Then Jacobi, whose reads all come from the previous sweep.</li>
<li>Try SOR (next paragraph). It needs 59 sweeps where Gauss–Seidel needs 561.</li>
</ol></div>

<p>The Jacobi option in this figure uses under-relaxation with $\omega = 0.8$ rather than unweighted Jacobi ($\omega = 1$). On a closed box, unweighted Jacobi fails to damp the <a href="#/pressure/checkerboard">checkerboard</a> mode $(-1)^{i+j}$, because the average of the four neighbours equals minus the cell's own value, so every sweep flips the sign of the mode while preserving its amplitude. After 200 sweeps on the $16 \times 16$ closed box, unweighted Jacobi leaves a relative residual of 0.074, whereas weighted Jacobi with $\omega = 0.8$ reaches 0.026, for reasons the Fourier mode analysis in the next section makes explicit.</p>

<p>Because each Gauss–Seidel update moves a cell only partway toward its converged value when smooth error dominates, <dfn data-term="sor">successive over-relaxation</dfn> (SOR) accelerates convergence by extrapolating past the Gauss–Seidel update by a relaxation factor $\omega \in (1, 2)$:</p>

<div class="eq" id="eq-sor">$$\begin{aligned} p_{i,j}^{(k+1)} &= p_{i,j}^{(k)} + \omega\left(p_{i,j}^{\text{GS}} - p_{i,j}^{(k)}\right), \\ \omega_{\text{opt}} &= \frac{2}{1 + \sqrt{1 - \rho_J^2}} \end{aligned}$$<span class="eq-tag">(11.5)</span></div>

<p>Here $\rho_J$ is the spectral radius of the Jacobi iteration matrix, the per-sweep decay factor of its slowest-converging mode. Young's formula for $\omega_{\text{opt}}$ holds for consistently ordered matrices such as the five-point Laplacian. On the $16 \times 16$ closed box, $\rho_J = 0.9904$ gives $\omega_{\text{opt}} = 1.757$, reducing the sweep count from 561 for Gauss–Seidel to 59 for optimal SOR and improving the asymptotic scaling from $O(n^2)$ sweeps to $O(n)$. As the next figure illustrates, however, that speedup is sensitive to the choice of $\omega$.</p>

<figure data-widget="solvers-sor" class="wide"><figcaption>Left: sweeps for SOR to cut the residual by $10^6$ on a closed box, for $\omega$ from 0.5 to 1.98, each point a full solve. The dashed line is Young's predicted optimum. Right: the residual history at the $\omega$ on the slider, against Gauss–Seidel.</figcaption></figure>
<div class="try"><ol>
<li>Press the button to set $\omega$ to the prediction: 59 sweeps on the $16 \times 16$ grid, and the measured best (1.76) agrees.</li>
<li>Now go to $\omega = 1.95$: 274 sweeps. Past the optimum the cost climbs steeply, and the residual history oscillates.</li>
<li>Go past 2. The iteration diverges, on any grid.</li>
<li>Switch to $32 \times 32$. The optimum moves to 1.870, and the old $\omega$ is now too small. The best $\omega$ depends on the grid and on the shape of the domain, which you rarely know in advance.</li>
</ol></div>

<aside class="pitfall">An over-relaxation factor $\omega$ tuned on one grid is suboptimal on a finer grid, and the sensitivity around $\omega_{\text{opt}}$ is asymmetric—overshooting $\omega_{\text{opt}}$ degrades convergence much more steeply than undershooting it, while $\omega \ge 2$ diverges. See <a href="#/pathologies">the rogues' gallery</a> entry on a badly chosen $\omega$.</aside>

<p>To compare solvers whose iterations do different amounts of arithmetic, work is measured in <dfn data-term="work-unit">work units</dfn>, where one work unit equals the cost of a single fine-grid stencil pass—one relaxation sweep or one matrix–vector product $A\mathbf{x}$. Each of the relaxation methods above performs one work unit per sweep.</p>

<aside class="history" data-era="1823">The names are loose. Gauss described an indirect way of solving least-squares equations in a letter to Gerling dated 26 December 1823; Jacobi published his iteration in 1845 (some histories date it 1846), combined with plane rotations, so the textbook method simplifies what he did; Seidel published his in 1874. Both Gauss and Seidel corrected the unknown with the largest residual first, by hand, and Seidel advised against a fixed cyclic order. Saad and van der Vorst (2000), citing Householder (1964), record that "Forsythe is quoted as having stated that 'the Gauss-Seidel method was not known to Gauss and not recommended by Seidel'". Southwell's relaxation, from 1935 on, was the same hand method grown into a craft for framed structures and then for fields.</aside>

<aside class="who" data-person="lewis-fry-richardson">In a paper read on 13 January 1910 and printed in 1911, he solved Laplace-type and biharmonic problems by finite differences, partly by successive approximation, with the stresses in a masonry dam as his application, and extrapolated the results from several grid sizes.</aside>

<aside class="who" data-person="david-m-young">His Harvard thesis, dated 1 May 1950 and published in 1954, gave the theory of SOR and the optimal factor, turning the hand-relaxers' habit of over-correcting into a rule for machines.</aside>

<aside class="who" data-person="stanley-frankel">In a 1950 paper he analysed the convergence of iterative methods for elliptic difference equations and gave the theory of over-relaxation for machine iteration, independently of Young and at the same time. Over-correcting by rule of thumb was older, from the hand-relaxation era.</aside>

<h2 id="smoothing">Why relaxation stalls</h2>

<p>In the sweep figure above, the residual drops rapidly during the first few passes while the remaining error settles into a smooth profile that decays very slowly. Decomposing the error into spatial Fourier modes explains this behaviour. An oscillatory mode that alternates in sign from cell to cell produces a large residual because each cell differs strongly from the average of its neighbours, so a local relaxation update damps it immediately. A smooth mode that varies slowly across many cells is already close to the average of its four neighbours at every point, producing a tiny local residual and receiving only an $O(h^2)$ adjustment per sweep.</p>

<p>This mode-by-mode decay can be calculated explicitly on the one-dimensional model problem with $n$ interior points between two Dirichlet walls ($e_0 = e_{n+1} = 0$) and grid spacing $h = 1/(n+1)$, where the discrete operator is $(2e_j - e_{j-1} - e_{j+1})/h^2$. Expanding the error in discrete sine modes $e_j = \sum_{k=1}^n a_k \sin\big(jk\pi/(n+1)\big)$—from the half-sine hump $k = 1$ to the grid-scale sawtooth $k = n$—diagonalises the weighted Jacobi iteration, so each sweep multiplies the $k$-th mode amplitude $a_k$ by an eigenvalue $\lambda_k$ without coupling different modes:</p>

<div class="eq" id="eq-mode-factor">$$a_k \leftarrow \lambda_k\,a_k, \qquad \lambda_k = 1 - 2\omega\sin^2\!\left(\frac{k\pi}{2n+2}\right)$$<span class="eq-tag">(11.6)</span></div>

<details class="deeper"><summary>Go deeper: where the factor comes from</summary>
<p>On the homogeneous error equation $A\mathbf{e} = 0$, weighted Jacobi replaces each $e_j$ by $(1-\omega)e_j + \tfrac{\omega}{2}(e_{j-1} + e_{j+1})$. Substituting $e_j = \sin(j\theta)$ with $\theta = k\pi/(n+1)$ and applying the trigonometric identity $\sin((j-1)\theta) + \sin((j+1)\theta) = 2\cos\theta\,\sin(j\theta)$ gives</p>
<p>$$(1-\omega)\sin(j\theta) + \omega\cos\theta\,\sin(j\theta) = \left(1 - \omega(1 - \cos\theta)\right)\sin(j\theta) = \left(1 - 2\omega\sin^2\tfrac{\theta}{2}\right)\sin(j\theta).$$</p>
<p>Because $\sin(j\theta)$ vanishes at $j = 0$ and $j = n+1$, it satisfies the homogeneous Dirichlet boundary conditions automatically and is an exact eigenvector with amplification factor $\lambda_k$. For the smoothest mode ($k = 1$), $\sin^2(\pi/(2n+2)) \approx \pi^2h^2/4$, so $\lambda_1 \approx 1 - \omega\pi^2h^2/2$; reducing its amplitude by a factor of 10 therefore requires about $\ln 10/(\omega\pi^2h^2/2)$ sweeps, which scales as $O(n^2)$. In two dimensions the eigenmodes are products of sines and obey the same $O(n^2)$ scaling.</p>
</details>

<p>At the low-wavenumber end of the spectrum ($k = 1$), $\lambda_1 = 1 - O(h^2)$; for $n = 31$ and $\omega = 2/3$, $\lambda_1 = 0.99679$, so a tenfold reduction requires 716 sweeps, and halving $h$ quadruples that count from 179 sweeps at $n = 15$ to 2,866 at $n = 63$. Across the upper half of the spectrum ($k > n/2$), by contrast, $\sin^2(k\pi/(2n+2))$ lies between $\tfrac12$ and 1; choosing $\omega = 2/3$ places $\lambda_k$ in $[-\tfrac13, \tfrac13]$ for every oscillatory mode, so three sweeps reduce all of them by at least a factor of 27 regardless of $n$. That high-frequency damping depends on the under-relaxation weight $\omega$; for unweighted Jacobi ($\omega = 1$) at $n = 31$, the sawtooth mode $k = n$ has $\lambda_n = -0.9952$, flipping sign on each sweep while barely decaying, and for $\omega > 1$ the highest modes have $|\lambda_k| > 1$ and amplify—the one-dimensional counterpart of the closed-box checkerboard oscillation seen in the previous section.</p>

<div data-quiz="q3"></div>

<figure data-widget="solvers-modes" class="wide"><figcaption>The one-dimensional model problem, relaxed. Top left: the error now and at the start. Bottom left: the size of each sine mode of the error (bars) and at the start (ticks), on a log scale. Right: the factor one sweep applies to each mode, measured from a pure mode (points), with the analytic Jacobi factor (11.6) as a dashed curve. The shaded band is the rough half of the modes.</figcaption></figure>
<div class="try"><ol>
<li>Run the default (smooth plus wiggly, $\omega = 2/3$). After 10 sweeps the roughest mode is down to $1.5 \times 10^{-5}$ of its size; the smooth hump has lost 3%.</li>
<li>Choose the highest mode and set $\omega = 1$. The sawtooth flips every sweep and barely shrinks. Set $\omega = 2/3$, and it disappears in a few sweeps.</li>
<li>Set $\omega = 1.1$ with the smooth-plus-wiggly start. The roughest modes now grow.</li>
<li>Choose "smooth error", then compare $n = 15$, 31 and 63. The readout of sweeps needed to cut mode 1 tenfold quadruples each time.</li>
<li>Try Gauss–Seidel. Although the modes now couple across wavenumbers, the behaviour is similar, with the oscillatory half decaying rapidly (factor 0.19 at the middle mode, $-0.33$ at the roughest) while the smoothest mode retains 0.990 of its amplitude per sweep.</li>
</ol></div>

<p>Because a few relaxation sweeps damp the high-wavenumber components of the error by a grid-independent factor while leaving the low-wavenumber components nearly unchanged, relaxation acts primarily as a <dfn data-term="smoothing">smoother</dfn>. Minimising the worst-case amplification factor across the oscillatory half of the spectrum gives the optimal weighted-Jacobi smoothing parameter $\omega = 2/3$ in one dimension and $\omega = 4/5$ in two dimensions. Used alone as a solver on the two-dimensional pressure problem, relaxation requires $O(n^2)$ sweeps to damp the smoothest mode, with a measured scaling exponent of 1.90 for both Jacobi and Gauss–Seidel across grids from $16^2$ to $128^2$.</p>

<aside class="pitfall">When a Jacobi or Gauss–Seidel solver makes rapid initial progress and then stalls, the slowdown follows directly from the $1 - O(h^2)$ decay factor of the smooth error modes in (11.6) rather than from a coding error. Raising the sweep count requires $O(n^2)$ work as the grid is refined; see <a href="#/pathologies">the rogues' gallery</a> entry on relaxation stall.</aside>

<h2 id="multigrid">Multigrid: smooth error is rough somewhere else</h2>

<p>Once relaxation has damped the oscillatory components on the fine grid, the remaining smooth error varies slowly enough to be represented accurately on a coarser grid with cell width $2h$. Relative to that doubled grid spacing, every spatial wavelength appears twice as oscillatory—halving $n$ in (11.6) quadruples the decay rate of the smoothest mode while reducing the number of cells in two dimensions by a factor of four. Applying this coarsening recursively down a hierarchy of grids until the coarsest grid has only a few unknowns and can be solved directly gives <dfn data-term="multigrid">multigrid</dfn>, in which each grid level damps the error wavelengths comparable to its own cell size.</p>

<p>Because the error $\mathbf{e}$ and the residual $\mathbf{r} = \mathbf{b} - A\mathbf{p}$ satisfy the linear residual equation $A\mathbf{e} = \mathbf{r}$ from (11.4), the coarse grid solves for the smooth error correction rather than re-solving for the pressure from scratch. After smoothing on the fine grid, the solver evaluates the residual $\mathbf{r}$, transfers it to the coarse grid with spacing $2h$, solves the coarse residual equation there, and interpolates the resulting correction back to update the fine-grid pressure:</p>

<div class="eq" id="eq-coarse-correction">$$\begin{aligned} \mathbf{r} &= \mathbf{b} - A\mathbf{p}, \\ A_{2h}\,\mathbf{e}_{2h} &= R\,\mathbf{r}, \\ \mathbf{p} &\leftarrow \mathbf{p} + P\,\mathbf{e}_{2h} \end{aligned}$$<span class="eq-tag">(11.7)</span></div>

<p>Here $A_{2h}$ is the five-point Laplacian discretised on the coarse grid. The <dfn data-term="restriction">restriction</dfn> operator $R$ transfers a fine-grid residual to the coarse grid by setting each coarse cell to the average of the four fine cells it contains, while the <dfn data-term="prolongation">prolongation</dfn> operator $P$ interpolates a coarse correction back to the fine grid—for cell-centred bilinear interpolation, combining $\tfrac{9}{16}$ of the enclosing coarse cell, $\tfrac{3}{16}$ of each of the two adjacent coarse neighbours, and $\tfrac{1}{16}$ of the diagonal neighbour. Because interpolation introduces small high-frequency discrepancies across coarse-cell boundaries, the coarse-grid correction is followed by a few post-smoothing sweeps on the fine grid.</p>

<p>Solving the coarse residual equation $A_{2h}\mathbf{e}_{2h} = R\mathbf{r}$ recursively by the same two-grid procedure defines a <dfn data-term="v-cycle">V-cycle</dfn>, which performs $\nu_1$ pre-smoothing sweeps, restricts the residual to the next coarser level, recurses down to the coarsest grid and back up, prolongs and adds the correction, and finishes with $\nu_2$ post-smoothing sweeps. On a $32 \times 32$ grid, the hierarchy descends through $32^2$, $16^2$, $8^2$, $4^2$, and $2^2$ cells, solving the $2 \times 2$ system directly. Because each two-dimensional coarsening reduces the cell count by a factor of four, all coarser levels combined add at most $\tfrac{1}{4} + \tfrac{1}{16} + \dots = \tfrac{1}{3}$ of the fine-grid work, and a complete V(2,2) cycle—including residual evaluations and grid transfers—costs 7.65 work units.</p>

<figure data-widget="solvers-vcycle" class="wide"><figcaption>V-cycles on a $32 \times 32$ grid, run by the course's multigrid solver and drawn from its trace. The diagram shows where the cycle is. Each small panel copies the cell updates on its level: the correction being built there, which starts from zero on every visit. The big panel is the error of the fine-grid pressure after each complete cycle, rescaled each time to the error that is left (see its legend). The plot is the residual per cycle, with the default V(2,2) cycle as a dashed reference. The start has a noisy first guess, so the error is rough and smooth at once.</figcaption></figure>
<div class="try"><ol>
<li>Watch one cycle at the default settings. Pre-smoothing removes the noise on the fine grid; the coarse panels then build a smooth correction; after the cycle the big panel's scale (in its legend) has shrunk. The first cycle cuts the residual about 280-fold, because most of it came from the rough noise; after that each cycle cuts it by a factor of about 13 to 25.</li>
<li>Set $\nu = 0$ so that no smoothing sweeps are performed. Because the coarse grids cannot represent high-frequency fine-grid error and no smoother damps it, the residual reduction factor per cycle stays at 1.000.</li>
<li>Choose Jacobi with $\omega = 1$ as the smoother and $\nu = 1$. The cycle crawls, at 0.77 rising to 0.99 per cycle, because plain Jacobi leaves the checkerboard alone.</li>
<li>Choose "p = 0 on walls", Jacobi with $\omega = 0.8$, $\nu = 1$, then switch the prolongation from bilinear to constant. The factor goes from about 0.35 per cycle to a divergence at about 1.31.</li>
</ol></div>

<p>The breakdown in that last experiment follows from a theorem of Hemker (1990): for a second-order equation, the prolongation and restriction orders must satisfy $m_P + m_R > 2$. Averaging is first order, as is piecewise-constant prolongation, which copies each coarse value into its four fine cells and leaves a step at every coarse-cell edge that a single light Jacobi sweep cannot smooth away. Two red–black smoothing sweeps per level are enough to compensate for piecewise-constant prolongation, though bilinear prolongation (second order) avoids the issue outright.</p>

<p>On the closed box with bilinear transfers, a V(2,2) cycle reduces the residual by a factor of 0.058 at $16^2$, 0.070 at $32^2$, and 0.081 at both $64^2$ and $128^2$—a rate that stays bounded as the grid is refined. Cutting the residual by $10^6$ takes 4 or 5 cycles at every size, so the total work is proportional to the number of unknowns $N$—optimal scaling, since every unknown must be updated at least once. Around a solid disc the coarse grids staircase the obstacle boundary, raising the per-cycle factor to between 0.10 and 0.17 while keeping it independent of $n$. Full multigrid (FMG) precedes the V-cycles on each level by solving on the coarsest grid and interpolating each converged solution up as the starting guess for the next finer grid, reaching discretisation-level accuracy in $O(N)$ operations (Brandt, 1977).</p>

<div data-quiz="q4"></div>

<aside class="history" data-era="1961">Fedorenko described the two-grid relaxation method in Russian in 1961 (English translation 1962) to accelerate the elliptic solves that dominated the runtime of numerical weather-prediction models. In 1964 he proved that a multigrid cycle converges at a mesh-independent rate on a rectangle, and Bakhvalov generalised the analysis in 1966. In Western numerical analysis the approach gained prominence when Brandt presented his multi-level adaptive technique (MLAT) at a Paris conference in July 1972 (published 1973) and in a comprehensive 1977 Mathematics of Computation paper, whose abstract notes that it solves "the possibly nonlinear system of n discrete equations in O(n) operations (40n additions and shifts for Poisson problems)". Hackbusch developed the method independently in Germany between 1976 and 1978, using the term "multi-grid" in the title of his 1977 Cologne report.</aside>

<aside class="who" data-person="radii-fedorenko">Invented the multigrid idea in 1961 and in 1964 proved, for the Poisson problem on a rectangle, that its convergence rate does not depend on the mesh size.</aside>

<aside class="who" data-person="achi-brandt">Turned multigrid into a general, practical method in the 1970s, from the 1972–73 multi-level adaptive technique to the 1977 Mathematics of Computation paper that most of the literature starts from.</aside>

<h2 id="krylov">Conjugate gradients: the bottom of a bowl</h2>

<p>Because $A$ is symmetric and positive definite, solving $A\mathbf{p} = \mathbf{b}$ is equivalent to minimising the quadratic energy functional</p>

<div class="eq" id="eq-energy">$$\begin{aligned} f(\mathbf{p}) &= \tfrac{1}{2}\,\mathbf{p}^{\mathrm{T}}A\,\mathbf{p} - \mathbf{b}^{\mathrm{T}}\mathbf{p}, \\ \nabla f &= A\mathbf{p} - \mathbf{b} = -\mathbf{r} \end{aligned}$$<span class="eq-tag">(11.8)</span></div>

<p>since $\nabla f(\mathbf{p})$ vanishes precisely when $A\mathbf{p} = \mathbf{b}$. In a pressure projection this minimum has a direct physical interpretation, since the projected velocity $\mathbf{u}^* - \Delta t\,\nabla p$ is the divergence-free field closest to $\mathbf{u}^*$ in kinetic energy—the <a href="#/pressure/hodge">orthogonal decomposition</a> of the previous chapter—and (11.8) is the dual functional for that constrained minimisation. Geometrically, solving for the pressure amounts to descending to the bottom of an $N$-dimensional paraboloid whose steepest downhill direction at any point is the residual $\mathbf{r}$.</p>

<p>The simplest descent strategy is steepest descent, which steps along the current residual direction $\mathbf{r}$ to the minimum of $f$ along that line and then recomputes the gradient. When the level sets of $f$ are spherical ($\kappa = 1$), a single line search reaches the minimum, whereas in an elongated valley with condition number $\kappa = \lambda_{\max}/\lambda_{\min}$, consecutive steps are forced to be orthogonal in Euclidean space and zigzag from wall to wall. In the worst case, each steepest-descent step reduces the error in the energy norm $\|\mathbf{e}\|_A = \sqrt{\mathbf{e}^{\mathrm{T}}A\,\mathbf{e}}$ by $(\kappa - 1)/(\kappa + 1)$, which for $\kappa = O(n^2)$ requires $O(n^2)$ iterations—the same asymptotic scaling as Jacobi.</p>

<p>The <dfn data-term="conjugate-gradient">conjugate gradient method</dfn> eliminates that zigzagging. Its first step is along the steepest-descent direction $\mathbf{r}_0$, and every subsequent search direction $\mathbf{d}_k$ is constructed to be $A$-conjugate to all previous directions, $\mathbf{d}_i^{\mathrm{T}}A\,\mathbf{d}_j = 0$ for $i \neq j$—perpendicular in the inner product induced by $A$. Because a line search along $\mathbf{d}_k$ preserves the optimality already achieved along all earlier conjugate directions, the $k$-th iterate $\mathbf{p}_k$ minimises $\|\mathbf{e}_k\|_A$ over the entire affine subspace $\mathbf{p}_0 + \operatorname{span}\{\mathbf{r}_0, A\mathbf{r}_0, \dots, A^{k-1}\mathbf{r}_0\}$. That span is a Krylov subspace, and algorithms that search it are called <dfn data-term="krylov-method">Krylov methods</dfn>. Because $A$ is symmetric, the new $A$-conjugate direction can be updated from a short two-term recurrence, requiring only one matrix–vector product $A\mathbf{d}_k$ (one work unit) and two inner products per iteration:</p>

<div class="eq" id="eq-cg">$$\begin{aligned} \mathbf{r}_0 &= \mathbf{b} - A\mathbf{p}_0, \quad \mathbf{d}_0 = \mathbf{r}_0, \\ \alpha_k &= \frac{\mathbf{r}_k^{\mathrm{T}}\mathbf{r}_k}{\mathbf{d}_k^{\mathrm{T}}A\,\mathbf{d}_k}, \\ \mathbf{p}_{k+1} &= \mathbf{p}_k + \alpha_k\mathbf{d}_k, \\ \mathbf{r}_{k+1} &= \mathbf{r}_k - \alpha_k A\,\mathbf{d}_k, \\ \beta_k &= \frac{\mathbf{r}_{k+1}^{\mathrm{T}}\mathbf{r}_{k+1}}{\mathbf{r}_k^{\mathrm{T}}\mathbf{r}_k}, \\ \mathbf{d}_{k+1} &= \mathbf{r}_{k+1} + \beta_k\mathbf{d}_k \end{aligned}$$<span class="eq-tag">(11.9)</span></div>

<figure data-widget="solvers-cg"><figcaption>Steepest descent and conjugate gradients on a system with two unknowns, from the chapter's own kernel. The ellipses are contours of the bowl (11.8), with the minimum at the centre. Drag on the picture to move the start; the condition number stretches the bowl and the tilt turns it.</figcaption></figure>
<div class="try"><ol>
<li>At $\kappa = 10$ from the worst start, steepest descent needs 69 steps to cut the residual by $10^6$, each cutting the energy error by exactly $9/11 = 0.818$. Conjugate gradients needs 2.</li>
<li>Raise $\kappa$ to 100: 691 steps for steepest descent, still 2 for conjugate gradients.</li>
<li>Drag the starting point onto a principal axis of the ellipse, where steepest descent steps straight to the minimum in a single iteration because the initial gradient already points at the centre.</li>
<li>Turn on the Jacobi preconditioner with the tilt at 0°, which rescales the axes into a circle so that both methods converge in one step; at 45° the diagonal entries of $A$ are equal, so diagonal scaling leaves the contours unchanged.</li>
</ol></div>

<p>In exact arithmetic conjugate gradients reaches the exact solution in at most $N$ steps (two in the two-variable figure). On a fine grid $N = n^2$ is far too large for $N$-step termination to be useful; what governs practical convergence is the Chebyshev polynomial bound</p>

<div class="eq" id="eq-cg-bound">$$\|\mathbf{e}_k\|_A \le 2\left(\frac{\sqrt{\kappa} - 1}{\sqrt{\kappa} + 1}\right)^{k}\|\mathbf{e}_0\|_A$$<span class="eq-tag">(11.10)</span></div>

<p>which replaces the $\kappa$ of steepest descent with $\sqrt{\kappa}$. Because $\kappa(A) = O(n^2)$, the iteration count scales as $O(\sqrt{\kappa}) = O(n)$—requiring 56, 113, 225, and 424 iterations on the closed box at $16^2$, $32^2$, $64^2$, and $128^2$—matching the asymptotic scaling of optimal SOR without requiring a relaxation parameter.</p>

<p>Faster convergence comes from reshaping the quadratic form with a <dfn data-term="preconditioner">preconditioner</dfn>, an easily inverted matrix $M \approx A$ that transforms the system so conjugate gradients acts on $M^{-1}A$ (in a symmetrically preconditioned form) with a much smaller condition number $\kappa(M^{-1}A)$. Diagonal (Jacobi) preconditioning, $M = \operatorname{diag}(A)$, leaves the uniform-grid Poisson matrix nearly unchanged because almost every interior row has the same diagonal entry $4/h^2$, taking 222 iterations instead of 225 on a $64^2$ closed box (corresponding to the 45°-tilted ellipse in the figure). Incomplete Cholesky, IC(0), performs Cholesky factorisation while discarding all fill-in outside the sparsity pattern of $A$ (Meijerink and van der Vorst, 1977); each preconditioned step costs two work units and converges in 21, 39, 67, and 129 iterations across $16^2$ to $128^2$. Modified incomplete Cholesky, MIC(0) (Gustafsson, 1978), adds the discarded fill entries back onto the diagonal so that $M$ agrees with $A$ on slowly varying vectors, reducing $\kappa(M^{-1}A)$ to $O(n)$ and the iteration count to $O(n^{1/2})$—17, 24, 38, and 70 iterations when using the 0.97 modification factor standard in graphics codes (Bridson, 2015). Using a single multigrid V-cycle as $M^{-1}$ (McAdams et al., 2010) combines the strengths of both approaches, converging in 5 iterations at every grid size while the outer Krylov projection compensates for the modes perturbed near cut cells or irregular obstacles.</p>

<p>While conjugate gradients requires a symmetric positive definite matrix—as the discrete pressure Laplacian provides—other linear systems in fluid dynamics, such as implicit advection–diffusion or coupled velocity–pressure systems, are non-symmetric. Standard Krylov solvers for non-symmetric matrices include GMRES (Saad and Schultz, 1986), which minimises the Euclidean residual norm over the Krylov subspace by storing an orthonormal basis of search directions (typically restarted every $m$ steps to bound memory), and Bi-CGSTAB (van der Vorst, 1992), which maintains short recurrences with fixed storage per step though with less regular residual reduction. In practice both are paired with a preconditioner.</p>

<div data-quiz="q5"></div>

<aside class="history" data-era="1952">Hestenes and Stiefel published the conjugate gradient method in December 1952 after developing it independently—Hestenes with his group at the Institute for Numerical Analysis in Los Angeles and Stiefel in Zürich. Presenting it alongside Gaussian elimination, they wrote, "In our opinion, the conjugate gradient method is superior to the elimination method as a machine method," and described it as "an iterative method which terminates in at most n steps if no rounding-off errors are encountered." Because floating-point rounding causes loss of conjugacy over $N$ steps, the algorithm saw limited use as a direct solver; as Saad and van der Vorst (2000) note, "it took about 25 years for the conjugate gradient method to become the method of choice for symmetric positive definite matrices", following Reid's 1971 analysis of CG as an iterative method and the introduction of incomplete Cholesky preconditioning in 1977. The term "Krylov subspace" refers to the power sequence $\mathbf{v}, A\mathbf{v}, A^2\mathbf{v}, \dots$ used by A. N. Krylov in a 1931 paper on computing the characteristic polynomial of a matrix.</aside>

<aside class="who" data-person="magnus-hestenes">Developed conjugate gradients at the Institute for Numerical Analysis, with Rosser, Forsythe and Paige, and published it with Stiefel in December 1952.</aside>

<aside class="who" data-person="eduard-stiefel">Found the method independently in Zürich and wrote the joint paper while visiting the Bureau of Standards.</aside>

<aside class="who" data-person="henk-van-der-vorst">With Meijerink he made incomplete Cholesky a preconditioner for conjugate gradients (ICCG, 1977), and in 1992 he published Bi-CGSTAB for non-symmetric systems.</aside>

<aside class="who" data-person="saad-schultz-gmres">Their GMRES (July 1986) minimises the residual over the Krylov subspace using the Arnoldi process, for any non-symmetric matrix.</aside>

<h2 id="cost">What it all costs</h2>

<p>Each method so far has a cost per iteration and a number of iterations, and the number depends on the grid. The fair comparison is total work, in work units, against grid size. The table collects the measurements on the closed box with a random right-hand side, cutting the residual by $10^6$ from a zero start. The last column is the fitted exponent $p$ in iterations $\propto n^p$.</p>

<table>
<thead><tr><th>Method</th><th class="num">Work per iteration</th><th class="num">$16^2$</th><th class="num">$32^2$</th><th class="num">$64^2$</th><th class="num">$128^2$</th><th class="num">$p$</th></tr></thead>
<tbody>
<tr><td>Jacobi, $\omega = 0.8$</td><td class="num">1</td><td class="num">1,396</td><td class="num">5,112</td><td class="num">18,959</td><td class="num">73,541</td><td class="num">1.90</td></tr>
<tr><td>Gauss–Seidel</td><td class="num">1</td><td class="num">561</td><td class="num">2,052</td><td class="num">7,633</td><td class="num">29,407</td><td class="num">1.90</td></tr>
<tr><td>SOR, best $\omega$</td><td class="num">1</td><td class="num">59</td><td class="num">113</td><td class="num">234</td><td class="num">447</td><td class="num">0.98</td></tr>
<tr><td>Conjugate gradients</td><td class="num">1</td><td class="num">56</td><td class="num">113</td><td class="num">225</td><td class="num">424</td><td class="num">0.98</td></tr>
<tr><td>CG + IC(0)</td><td class="num">2</td><td class="num">21</td><td class="num">39</td><td class="num">67</td><td class="num">129</td><td class="num">0.86</td></tr>
<tr><td>CG + MIC(0)</td><td class="num">2</td><td class="num">17</td><td class="num">24</td><td class="num">38</td><td class="num">70</td><td class="num">0.68</td></tr>
<tr><td>Multigrid V(2,2)</td><td class="num">7.65</td><td class="num">4</td><td class="num">5</td><td class="num">5</td><td class="num">5</td><td class="num">0.1</td></tr>
<tr><td>CG + multigrid</td><td class="num">7.7</td><td class="num">5</td><td class="num">5</td><td class="num">5</td><td class="num">5</td><td class="num">0</td></tr>
</tbody>
</table>

<p>At $128^2$, Gauss–Seidel requires about 29,000 work units, optimal SOR and plain conjugate gradients about 420–450, MIC(0)-preconditioned CG 140, and multigrid under 40—a gap that widens on finer grids because of their different scaling exponents $p$.</p>

<figure data-widget="solvers-race" class="wide"><figcaption>Five solvers on the same pressure problem. Left: relative residual against work, the solvers advanced together so that none gets ahead. Right: iterations to cut the residual by $10^6$ on grids from $16^2$ to $128^2$, on log scales, with reference slopes. Every point is a full solve by the course's solvers, computed in the background; the readouts give the work to reach $10^{-8}$, the iterations and time on this device at the race's grid size, and the fitted growth.</figcaption></figure>
<div class="try"><ol>
<li>Watch the race on the closed box. Multigrid reaches $10^{-8}$ in 46 work units; Gauss–Seidel has barely started.</li>
<li>On the right plot, compare the slopes with the reference lines: about 2 for relaxation, about 1 for SOR and conjugate gradients, flat for multigrid.</li>
<li>Switch to the box with a disc and compare the two multilevel methods. Multigrid alone needs 7 cycles to cut the residual by $10^6$ where it needed 5, CG with multigrid 6, and neither count grows with the grid.</li>
<li>Switch the preconditioned method to CG + Jacobi, whose curve sits almost on top of plain CG.</li>
</ol></div>

<p>Wall-clock time depends on hardware as well as work units. Benchmarked in Node on a desktop CPU at $128^2$ to a relative tolerance of $10^{-4}$, multigrid takes about 2 milliseconds, multigrid-preconditioned CG about 4 ms, MIC(0)-preconditioned CG about 19 ms, optimal SOR and plain CG 55 to 90 ms, and Gauss–Seidel about 2 seconds (with a typical phone running several times slower). On modern processors, memory bandwidth and parallelism often matter as much as operation counts; Jacobi and red–black Gauss–Seidel sweeps stream regularly through memory and parallelise across every cell at once, whereas lexicographic Gauss–Seidel and the forward/backward triangular solves of IC(0) and MIC(0) have sequential data dependencies, and the coarsest levels of a multigrid hierarchy have too few cells to saturate a GPU. Consequently, real-time GPU solvers sometimes still use red–black or damped Jacobi sweeps, either alone on small grids or as the smoother inside a multigrid cycle.</p>

<p>The final solver parameter is the stopping tolerance. Because the residual of the pressure Poisson equation is proportional to the velocity divergence remaining after projection, the solver tolerance directly sets the local volume error per step. A projected velocity with nonzero divergence $\nabla\cdot\mathbf{u}$ creates fluid volume in some cells and destroys it in others; in a closed box the signed sum vanishes, and the gross volume created and destroyed per step is $\Delta t\,\tfrac{1}{2}\sum_c |(\nabla_h\cdot\mathbf{u})_c|\,h^2$. Although small on a single step, this discrepancy accumulates over thousands of steps. Warm-starting each solve from the previous time step's pressure keeps tight tolerances inexpensive—in the stirred box below, multigrid averages 1.6 V-cycles per step at a relative tolerance of $10^{-4}$.</p>

<div data-quiz="q6"></div>

<figure data-widget="solvers-tolerance" class="wide"><figcaption>A Stable Fluids simulation of a closed $48 \times 48$ box, one step per frame, its pressure solved by multigrid to a tolerance or by a fixed number of Jacobi sweeps. The plot adds up the volume of fluid created (and destroyed) by the divergence each projection leaves behind; earlier runs stay on the plot for comparison. In the layered scene the fluid should stay at rest; the picture shows its speed.</figcaption></figure>
<div class="try"><ol>
<li>Run the swirl at $10^{-4}$, then at $10^{-2}$, then at $10^{-1}$. Over 10 seconds the cumulative volume error is about $1.8 \times 10^{-3}$, 0.20, and 2.2 box volumes, scaling linearly with the solver tolerance.</li>
<li>Switch to 30 fixed Jacobi sweeps per step, which produces a volume error of 0.064 while doing more than twice the work of multigrid at $10^{-4}$ (about 12 work units per step); even 200 Jacobi sweeps leave an error of 0.005.</li>
<li>Choose the layered fluid at rest with a tolerance of $10^{-1}$, where spurious currents of speed up to about 0.5 develop because the unconverged pressure fails to balance the hydrostatic buoyancy gradient. At $10^{-6}$ the fluid remains still to within $2 \times 10^{-6}$.</li>
</ol></div>

<p>Visual simulations typically converge the pressure residual to a relative tolerance of $10^{-4}$ to $10^{-6}$, while quantitative studies use tighter thresholds and monitor both the post-projection divergence and total volume directly. Fixing the number of relaxation sweeps instead of solving to a residual tolerance corresponds to an effective tolerance that degrades as $O(n^2)$ when the grid is refined, producing <a href="#/pressure/projection">the incomplete projection</a> artifacts seen in the previous chapter—tracers that bunch together, smoke plumes that gain or lose volume, and free-surface liquids whose volume drifts over time.</p>

<aside class="pitfall">Stopping the pressure solve early leaves residual divergence at every time step whose volume error accumulates over the run, causing volume drift and spurious currents in a stratified fluid at rest, and worsening under grid refinement when the iteration count is fixed. See <a href="#/pathologies">the rogues' gallery</a> entry on a loose tolerance.</aside>

<aside class="note" data-label="Where to go next">The <a data-aid="pressure-solver">pressure-solver aid</a> animates these solvers step by step on a pressure problem of its own. The next chapter, <a href="#/stable-fluids">A fluid you can stir</a>, puts the multigrid solve inside a fluid you can stir.</aside>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>C. G. J. Jacobi, "Ueber eine neue Auflösungsart der bei der Methode der kleinsten Quadrate vorkommenden lineären Gleichungen", <em>Astronomische Nachrichten</em> 22(20), 297–306 (1845).</li>
<li>C. F. Gauss, letter to C. L. Gerling of 26 December 1823, in <em>Werke</em> vol. 9; English translation by G. E. Forsythe, "Gauss to Gerling on relaxation", <em>Mathematical Tables and Other Aids to Computation</em> 5, 255–258 (1951).</li>
<li>L. Seidel, "Über ein Verfahren, die Gleichungen, auf welche die Methode der kleinsten Quadrate führt, sowie lineäre Gleichungen überhaupt, durch successive Annäherung aufzulösen", <em>Abhandlungen der Bayerischen Akademie der Wissenschaften</em>, math.-nat. Abt. 11, 81–108 (1874).</li>
<li>L. F. Richardson, "The approximate arithmetical solution by finite differences of physical problems involving differential equations, with an application to the stresses in a masonry dam", <em>Philosophical Transactions of the Royal Society A</em> 210, 307–357 (read 13 January 1910; printed 1911).</li>
<li>R. V. Southwell, <em>Relaxation Methods in Engineering Science</em>, Oxford University Press (1940); <em>Relaxation Methods in Theoretical Physics</em>, Oxford University Press (1946).</li>
<li>S. P. Frankel, "Convergence rates of iterative treatments of partial differential equations", <em>Mathematical Tables and Other Aids to Computation</em> 4(30), 65–75 (1950).</li>
<li>D. M. Young, "Iterative methods for solving partial difference equations of elliptic type", <em>Transactions of the American Mathematical Society</em> 76(1), 92–111 (1954); PhD thesis, Harvard (1950).</li>
<li>D. M. Young, <em>Iterative Solution of Large Linear Systems</em>, Academic Press (1971).</li>
<li>M. R. Hestenes and E. Stiefel, "Methods of conjugate gradients for solving linear systems", <em>Journal of Research of the National Bureau of Standards</em> 49(6), 409–436 (December 1952). doi:10.6028/jres.049.044.</li>
<li>R. P. Fedorenko, "A relaxation method for solving elliptic difference equations", <em>Zh. Vychisl. Mat. Mat. Fiz.</em> 1(5), 922–927 (1961); English in <em>USSR Computational Mathematics and Mathematical Physics</em> 1(4), 1092–1096 (1962). doi:10.1016/0041-5553(62)90031-9.</li>
<li>R. P. Fedorenko, "The speed of convergence of one iterative process", <em>USSR Computational Mathematics and Mathematical Physics</em> 4(3), 227–235 (1964).</li>
<li>N. S. Bakhvalov, "On the convergence of a relaxation method with natural constraints on the elliptic operator", <em>USSR Computational Mathematics and Mathematical Physics</em> 6(5), 101–135 (1966). doi:10.1016/0041-5553(66)90118-2.</li>
<li>A. Brandt, "Multi-level adaptive technique (MLAT) for fast numerical solution to boundary value problems", <em>Proceedings of the Third International Conference on Numerical Methods in Fluid Mechanics</em>, Lecture Notes in Physics 18, 82–89, Springer (1973). doi:10.1007/BFb0118663.</li>
<li>A. Brandt, "Multi-level adaptive solutions to boundary-value problems", <em>Mathematics of Computation</em> 31(138), 333–390 (1977). doi:10.1090/S0025-5718-1977-0431719-X.</li>
<li>A. George, "Nested dissection of a regular finite element mesh", <em>SIAM Journal on Numerical Analysis</em> 10(2), 345–363 (1973).</li>
<li>J. A. Meijerink and H. A. van der Vorst, "An iterative solution method for linear systems of which the coefficient matrix is a symmetric M-matrix", <em>Mathematics of Computation</em> 31(137), 148–162 (1977).</li>
<li>I. Gustafsson, "A class of first order factorization methods", <em>BIT</em> 18, 142–156 (1978).</li>
<li>Y. Saad and M. H. Schultz, "GMRES: a generalized minimal residual algorithm for solving nonsymmetric linear systems", <em>SIAM Journal on Scientific and Statistical Computing</em> 7(3), 856–869 (July 1986). doi:10.1137/0907058.</li>
<li>H. A. van der Vorst, "Bi-CGSTAB: a fast and smoothly converging variant of Bi-CG for the solution of nonsymmetric linear systems", <em>SIAM Journal on Scientific and Statistical Computing</em> 13(2), 631–644 (March 1992). doi:10.1137/0913035.</li>
<li>P. W. Hemker, "On the order of prolongations and restrictions in multigrid procedures", <em>Journal of Computational and Applied Mathematics</em> 32, 423–429 (1990).</li>
<li>Y. Saad and H. A. van der Vorst, "Iterative solution of linear systems in the 20th century", <em>Journal of Computational and Applied Mathematics</em> 123, 1–33 (2000). The history of all the methods here.</li>
<li>W. L. Briggs, V. E. Henson and S. F. McCormick, <em>A Multigrid Tutorial</em>, 2nd ed., SIAM (2000). Chapter 2 is the mode analysis of this chapter's smoothing section.</li>
<li>U. Trottenberg, C. W. Oosterlee and A. Schüller, <em>Multigrid</em>, Academic Press (2001).</li>
<li>Y. Saad, <em>Iterative Methods for Sparse Linear Systems</em>, 2nd ed., SIAM (2003).</li>
<li>J. R. Shewchuk, <em>An Introduction to the Conjugate Gradient Method Without the Agonizing Pain</em>, Carnegie Mellon University report CMU-CS-94-125 (1994). The bowl pictures, in full.</li>
<li>R. J. LeVeque, <em>Finite Difference Methods for Ordinary and Partial Differential Equations</em>, SIAM (2007), chapters 3 and 4.</li>
<li>A. McAdams, E. Sifakis and J. Teran, "A parallel multigrid Poisson solver for fluids simulation on large grids", <em>Proceedings of the ACM SIGGRAPH/Eurographics Symposium on Computer Animation</em> (2010).</li>
<li>R. Bridson, <em>Fluid Simulation for Computer Graphics</em>, 2nd ed., CRC Press (2015), chapter 5: the pressure solve and MIC(0).</li>
</ol>
`,
  widgets: {
    'solvers-fill': mountFill,
    'solvers-sweep': mountSweep,
    'solvers-sor': mountSor,
    'solvers-modes': mountModes,
    'solvers-vcycle': mountVcycle,
    'solvers-cg': mountKrylov,
    'solvers-race': mountRace,
    'solvers-tolerance': mountTolerance,
  },
  quizzes: {
    q1: {
      type: 'mcq',
      q: 'A $1000 \\times 1000$ pressure grid is numbered row by row and factorised by banded Cholesky, $A = LL^{\\mathrm{T}}$. Roughly how many nonzero numbers does $L$ hold?',
      choices: [
        'About $3 \\times 10^6$, the same as the lower half of $A$, because the Cholesky factor of a sparse matrix preserves its sparsity.',
        'About $10^9$, because elimination fills the band of half-width $n = 1000$ across all $10^6$ rows.',
        'About $5 \\times 10^{11}$, one entry for every multiply–add.',
        'About $10^{12}$, the full dense matrix.',
      ],
      answer: 1,
      explain: 'Under row-by-row numbering, every nonzero of $A$ lies within $n$ columns of the diagonal, and Cholesky elimination fills that band completely, producing about $N \\times n = 10^6 \\times 10^3 = 10^9$ nonzeros (8 gigabytes in double precision). At $n = 24$ the figure measures 13,847 nonzeros in $L$, compared with 1,680 in the lower half of $A$ and $Nn = 13{,}824$. Elimination never creates fill outside the band, while $5 \\times 10^{11}$ is the operation count $n^4/2$ rather than the number of stored entries.',
    },
    q2: {
      type: 'predict',
      q: 'In the next figure, after 10 Gauss–Seidel sweeps on the $16 \\times 16$ closed box, the residual has fallen to 0.13 of its starting size. How big is the error, relative to the size of the exact answer?',
      choices: [
        'About 0.13 as well, because residual and error shrink together.',
        'About 0.8, because most of the smooth error remains.',
        'About 0.02, the square of the residual ratio.',
        'Larger than at the start, because Gauss–Seidel first amplifies the error.',
      ],
      answer: 1,
      explain: 'The figure measures a relative error of 0.79. Because $A\\mathbf{e} = \\mathbf{r}$ by (11.4) and $A$ is a second-difference operator, a smooth, long-wavelength error $\\mathbf{e}$ has small curvature and produces a much smaller residual $\\mathbf{r}$. Ten Gauss–Seidel sweeps damp the oscillatory error components that dominated the initial residual while leaving the smooth error mode nearly intact.',
    },
    q3: {
      type: 'predict',
      q: 'The next figure starts from a pure sawtooth, mode $k = n$ with $n = 31$, and applies plain Jacobi ($\\omega = 1$). What is left after 10 sweeps?',
      choices: [
        'Nothing, because Jacobi damps the roughest modes first.',
        'About 95% of the sawtooth, with its sign flipping on every sweep.',
        'A smooth hump, because the sawtooth aliases into mode 1.',
        'A sawtooth about 10 times larger, because Jacobi is unstable on that mode.',
      ],
      answer: 1,
      explain: 'By (11.6) the amplification factor for mode $k = n = 31$ at $\\omega = 1$ is $1 - 2\\sin^2(31\\pi/64) = -0.9952$, so 10 sweeps leave $0.9952^{10} \\approx 0.95$ of the initial amplitude while alternating its sign. Because the discrete sine modes are eigenvectors of Jacobi, no energy transfers into mode 1. Setting $\\omega = 2/3$ changes the factor to about $-1/3$ so the sawtooth decays within a few sweeps, whereas instability ($|\\lambda_k| > 1$) occurs only for $\\omega > 1$.',
    },
    q4: {
      type: 'mcq',
      q: 'A multigrid V(2,2) solver needs 5 cycles to cut the residual by $10^6$ on a $32 \\times 32$ closed box. Roughly how many does it need on $128 \\times 128$?',
      choices: [
        'About 80, since iterations grow like $n^2$.',
        'About 20, since iterations grow like $n$.',
        'About 5, because the reduction factor per cycle stays independent of the grid size.',
        'About 2, because finer grids are smoother and need fewer cycles.',
      ],
      answer: 2,
      explain: 'Measured on the closed box, V(2,2) takes 5 cycles at $32^2$, $64^2$, and $128^2$, reducing the residual by a factor of 0.07 to 0.08 per cycle. Because relaxation damps oscillatory modes at a rate independent of $h$ and the coarser levels damp the smoother modes at the same rate on their own scales, the number of cycles stays constant and the total work scales linearly with the number of cells $N$.',
    },
    q5: {
      type: 'mcq',
      q: 'You add a Jacobi preconditioner ($M$ = the diagonal of $A$) to conjugate gradients for the pressure on a $64 \\times 64$ closed box. Plain CG takes 225 iterations. What happens?',
      choices: [
        'About 15 iterations, roughly the square root of 225.',
        'About 112 iterations, halving the iteration count.',
        'About the same (222), because the diagonal is $4/h^2$ on every interior cell so dividing by it merely rescales $A$.',
        'It diverges, because preconditioned CG requires an exact inverse.',
      ],
      answer: 2,
      explain: 'On the $64 \\times 64$ closed box, diagonally preconditioned CG takes 222 iterations compared with 225 for unpreconditioned CG. Because the diagonal of $A$ equals $4/h^2$ on every interior cell, dividing by it merely rescales the matrix without reducing its condition number (like the 45°-tilted bowl in the figure). Diagonal preconditioning helps when the diagonal varies strongly across the grid, such as in variable-density flows, whereas reducing the iteration count on a uniform grid requires a preconditioner that approximates the off-diagonal coupling—such as IC(0) (67 iterations), MIC(0) (38), or a multigrid V-cycle (5).',
    },
    q6: {
      type: 'predict',
      q: 'In the next figure, multigrid at a relative tolerance of $10^{-4}$ leaks $1.8 \\times 10^{-3}$ of the box volume over 10 seconds of a stirred simulation. You loosen the tolerance to $10^{-2}$. What happens to the leak?',
      choices: [
        'Very little, because multigrid overshoots the tolerance within each cycle.',
        'It roughly doubles.',
        'It grows about a hundredfold, to about 0.2 of the box.',
        'It grows ten-thousandfold, because errors square from step to step.',
      ],
      answer: 2,
      explain: 'The measured cumulative volume error grows from $1.77 \\times 10^{-3}$ at $10^{-4}$ to 0.196 at $10^{-2}$, a factor of 110. Because each projection stops at the first cycle whose residual falls below the tolerance, the leftover divergence per step—and therefore its time integral—scales approximately linearly with the tolerance.',
    },
  },
  glossary: {
    'jacobi-method': {
      term: 'Jacobi method',
      def: 'A relaxation scheme for $A\\mathbf{x} = \\mathbf{b}$ that updates every unknown simultaneously to the value satisfying its own row equation using the previous iterate\'s neighbour values; weighted Jacobi applies an under-relaxation factor $\\omega$. Fully parallel, with $O(n^2)$ convergence on the Poisson equation. Jacobi, 1845.',
      section: 'relaxation',
    },
    'gauss-seidel': {
      term: 'Gauss–Seidel',
      def: 'A relaxation scheme that updates unknowns sequentially in place, using each newly computed value immediately. On the five-point Poisson stencil it requires the same arithmetic per sweep as Jacobi and converges in roughly half as many sweeps. Neither Gauss (1823) nor Seidel (1874) used the fixed cyclic ordering standard on computers.',
      section: 'relaxation',
    },
    sor: {
      term: 'successive over-relaxation (SOR)',
      def: 'Gauss–Seidel extrapolated by an over-relaxation factor $1 < \\omega < 2$. With Young\'s optimal parameter $\\omega = 2/(1 + \\sqrt{1 - \\rho_J^2})$, the iteration count on the Poisson equation scales as $O(n)$ rather than $O(n^2)$, while $\\omega \\ge 2$ diverges. Young and Frankel, 1950.',
      section: 'relaxation',
    },
    'red-black-ordering': {
      term: 'red–black ordering',
      def: 'A two-colour chessboard partitioning of a structured grid under which every red cell has only black five-point neighbours, allowing all red cells to be relaxed in parallel followed by all black cells at the same convergence rate as lexicographic Gauss–Seidel.',
      section: 'relaxation',
    },
    residual: {
      term: 'residual',
      def: 'The vector $\\mathbf{r} = \\mathbf{b} - A\\mathbf{x}$ measuring how far an approximate solution $\\mathbf{x}$ is from satisfying $A\\mathbf{x} = \\mathbf{b}$. Unlike the algebraic error $\\mathbf{e} = \\mathbf{x}^* - \\mathbf{x}$, the residual can be computed directly; because $A\\mathbf{e} = \\mathbf{r}$ and $A$ differentiates twice, a large smooth error can correspond to a small residual. In a pressure projection, $\\mathbf{r}$ is proportional to the divergence remaining in the velocity field.',
      section: 'relaxation',
    },
    smoothing: {
      term: 'smoothing',
      def: 'The rapid, grid-independent damping of high-frequency (oscillatory) error modes by a few sweeps of a local relaxation scheme such as damped Jacobi or Gauss–Seidel, which leaves low-frequency (smooth) error modes nearly unchanged. In multigrid, a relaxation scheme applied for this purpose is called a smoother.',
      section: 'smoothing',
    },
    multigrid: {
      term: 'multigrid',
      def: 'A hierarchical solver that combines fine-grid smoothing with residual corrections computed on a sequence of coarser grids, where smooth fine-grid errors appear oscillatory. For the Poisson equation it converges in a grid-independent number of cycles with $O(N)$ total work. Fedorenko, 1961–64; Brandt, 1973–77.',
      section: 'multigrid',
    },
    'v-cycle': {
      term: 'V-cycle',
      def: 'A single recursive multigrid pass that applies $\\nu_1$ pre-smoothing sweeps on the fine grid, restricts the residual to the next coarser level, solves the coarse residual equation recursively (with a direct solve on the coarsest level), prolongs and adds the correction, and applies $\\nu_2$ post-smoothing sweeps, denoted V($\\nu_1$,$\\nu_2$).',
      section: 'multigrid',
    },
    restriction: {
      term: 'restriction',
      def: 'The transfer operator $R$ that maps a fine-grid vector (typically the residual) onto the next coarser grid, such as by averaging the four fine cells inside each coarse cell.',
      section: 'multigrid',
    },
    prolongation: {
      term: 'prolongation',
      def: 'The transfer operator $P$ that interpolates a coarse-grid correction onto the next finer grid, such as cell-centred bilinear interpolation with weights 9/16, 3/16, 3/16, and 1/16. For a second-order elliptic equation, the prolongation and restriction orders must satisfy $m_P + m_R > 2$.',
      section: 'multigrid',
    },
    'conjugate-gradient': {
      term: 'conjugate gradient method (CG)',
      def: 'The Krylov subspace solver for symmetric positive definite systems $A\\mathbf{x} = \\mathbf{b}$, which minimises the quadratic functional $\\tfrac12\\mathbf{x}^{\\mathrm{T}}A\\mathbf{x} - \\mathbf{b}^{\\mathrm{T}}\\mathbf{x}$ along mutually $A$-conjugate directions ($\\mathbf{d}_i^{\\mathrm{T}}A\\mathbf{d}_j = 0$) so that each step preserves optimality over all previous directions. Requires one matrix–vector product per iteration and $O(\\sqrt{\\kappa})$ iterations. Hestenes and Stiefel, 1952.',
      section: 'krylov',
    },
    preconditioner: {
      term: 'preconditioner',
      def: 'An easily inverted approximation $M \\approx A$ used to transform $A\\mathbf{x} = \\mathbf{b}$ into a better-conditioned system with a smaller eigenvalue ratio $\\kappa(M^{-1}A)$. Common choices for the pressure Poisson equation include incomplete Cholesky IC(0), modified incomplete Cholesky MIC(0), and a multigrid V-cycle.',
      section: 'krylov',
    },
    'krylov-method': {
      term: 'Krylov method',
      def: 'An iterative solver whose $k$-th iterate is selected from the affine Krylov subspace $\\mathbf{x}_0 + \\operatorname{span}\\{\\mathbf{r}_0, A\\mathbf{r}_0, \\dots, A^{k-1}\\mathbf{r}_0\\}$ using only matrix–vector products—including conjugate gradients (which minimises the $A$-norm of the error for SPD matrices), GMRES (which minimises the Euclidean residual norm), and Bi-CGSTAB.',
      section: 'krylov',
    },
    'work-unit': {
      term: 'work unit',
      def: 'A normalised unit of computational cost equal to one fine-grid stencil evaluation across all cells (one relaxation sweep or one matrix–vector product $A\\mathbf{x}$), under which a V(2,2) multigrid cycle costs about 7.65 work units.',
      section: 'relaxation',
    },
  },
  pathologies: [
    {
      id: 'relaxation-stall',
      name: 'Relaxation stall',
      family: 'solver',
      symptom: 'A Jacobi or Gauss–Seidel pressure solver makes quick progress for a few sweeps, then the residual falls very slowly, while the error (if you can measure it) hardly moves. Doubling the grid resolution makes it about four times slower.',
      cause: 'Relaxation is local, damping oscillatory error modes by a fixed factor per sweep while multiplying the smoothest error mode by $1 - O(h^2)$, as shown in (11.6). After the initial sweeps remove the rough modes, the remaining smooth error produces a small residual and decays at an $O(n^{-2})$ rate.',
      diagnose: 'Plot the residual norm against sweeps on a logarithmic axis, where stall appears as a steep initial drop followed by a nearly flat tail, and verify whether doubling the grid resolution quadruples the sweep count to a fixed tolerance. Inspecting the error or per-sweep update shows a smooth, domain-scale profile.',
      mitigations: [
        'Use multigrid with the relaxation scheme as its smoother, achieving grid-independent convergence at the cost of a few fine-grid work units per cycle.',
        'Use preconditioned conjugate gradients with MIC(0) or a multigrid preconditioner, so the iteration count scales as $O(n^{1/2})$ or $O(1)$.',
        'Warm-start from the previous time step\'s pressure, so that less smooth error has to be removed. Cheap, and always worth doing.',
        'Use SOR with an estimated optimal $\\omega$ to reduce the scaling from $O(n^2)$ to $O(n)$, noting that $\\omega_{\\text{opt}}$ must be retuned when the grid or geometry changes.',
      ],
      section: 'smoothing',
      demo: { widget: 'solvers-modes', data: { preset: 'stall' } },
    },
    {
      id: 'sor-omega',
      name: 'Badly chosen SOR factor',
      family: 'solver',
      symptom: 'An SOR solver is much slower than expected, sometimes slower than Gauss–Seidel, or its residual oscillates and then grows. It may work on one grid and misbehave after a refinement or a change of geometry.',
      cause: 'The optimal factor $\\omega_{\\text{opt}} = 2/(1 + \\sqrt{1 - \\rho_J^2})$ depends on the grid size and the domain, and tends to 2 as the grid is refined. Just above the optimum the convergence degrades steeply, and for $\\omega \\ge 2$ the iteration diverges; below 1 it is slower than Gauss–Seidel.',
      diagnose: 'Sweep across several values of $\\omega$ and plot the iteration count to a fixed tolerance to locate the sharp minimum. Check whether $\\omega$ was tuned on a coarser grid, and look for oscillations in the residual history that indicate $\\omega > \\omega_{\\text{opt}}$.',
      mitigations: [
        'Estimate $\\rho_J$ for the current grid and apply Young\'s formula, erring slightly below $\\omega_{\\text{opt}}$ where the penalty is much smaller than above it.',
        'Adapt $\\omega$ during the solve from the observed convergence rate, as some codes do.',
        'Replace SOR with a parameter-free Krylov or multilevel solver—plain conjugate gradients matches the $O(n)$ scaling of optimal SOR automatically, while multigrid and preconditioned CG converge much faster.',
      ],
      section: 'relaxation',
      demo: { widget: 'solvers-sor', data: { preset: 'high' } },
    },
    {
      id: 'loose-tolerance',
      name: 'Loose solver tolerance',
      family: 'solver',
      symptom: 'Fluid volume drifts over time, smoke or liquid slowly gains or loses mass, and a fluid that should be at rest develops currents. The effect is proportional to the tolerance and builds up over many steps.',
      cause: 'The residual of the pressure solve is the divergence the projection leaves behind. Stopping at a loose tolerance, or after a fixed small number of iterations, leaves divergence in every step, and its effect on volume accumulates. With a fixed iteration count the leftover grows as the grid is refined.',
      diagnose: 'After each projection, measure $\\|\\nabla\\cdot\\mathbf{u}\\|$ relative to the divergence before it, and sum $\\Delta t\\,\\tfrac12\\sum|\\nabla\\cdot\\mathbf{u}|h^2$ over steps. Halve the tolerance and check whether the cumulative volume drift halves.',
      mitigations: [
        'Solve to a relative tolerance of $10^{-4}$ to $10^{-6}$ (tighter for quantitative work) with a fast solver, and warm-start it from the previous pressure, which keeps tight tolerances inexpensive.',
        'Use a solver whose cost does not grow with the grid (multigrid or multigrid-preconditioned CG), so that a tight tolerance stays affordable on fine grids.',
        'If the budget is fixed, as in real-time graphics, correct the volume error explicitly, for example with a small source term proportional to the volume drift.',
      ],
      section: 'cost',
      demo: { widget: 'solvers-tolerance', data: { preset: 'loose' } },
    },
  ],
  css: `
.chapter[data-chapter="solvers"] .sv-levels { display: grid; grid-template-columns: repeat(auto-fit, minmax(52px, 1fr)); gap: 6px; margin-top: 6px; }
.chapter[data-chapter="solvers"] .sv-level { min-width: 0; display: grid; gap: 2px; }
.chapter[data-chapter="solvers"] .sv-level-label { font-size: 0.8rem; color: var(--muted); text-align: center; }
.chapter[data-chapter="solvers"] .sv-mats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; min-width: 0; align-content: start; }
.chapter[data-chapter="solvers"] .sv-mat { min-width: 0; display: grid; gap: 2px; }
`,
};
