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
  blurb: 'Jacobi, Gauss–Seidel, conjugate gradients and multigrid, and why smooth errors are slow to die.',
  minutes: 45,
  html: String.raw`
<p class="lead-in">Every step of an incompressible simulation ends with the same chore: find the pressure that makes the velocity divergence-free. <a href="#/pressure/projection">The last chapter</a> set that problem up. This one is about solving it, which is where most of the computer time goes. You will meet the simple methods first. They update one cell at a time from its neighbours, and you will see exactly why they stall: they remove rough errors quickly and smooth errors painfully slowly. Then come the two ideas that rescued the field. Multigrid treats smooth error on coarser grids, where it is no longer smooth. Conjugate gradients chooses each step so that it never undoes the steps before it. The chapter ends with a race and a bill: what each method costs as the grid is refined, and what a loose tolerance does to a running simulation.</p>

<h2 id="the-system">One equation per cell</h2>

<p>In a projection step you know the provisional velocity $\mathbf{u}^*$, and you need the pressure whose gradient removes its divergence. On a grid of square cells of side $h$, the <a href="#/pressure/mac">MAC grid</a> turns that into one equation for every fluid cell. Each equation links a cell's pressure to its four neighbours through the five-point <dfn data-term="stencil">stencil</dfn>:</p>

<div class="eq" id="eq-five-point">$$\frac{4p_{i,j} - p_{i-1,j} - p_{i+1,j} - p_{i,j-1} - p_{i,j+1}}{h^2} = b_{i,j}$$<span class="eq-tag">(11.1)</span></div>

<p>Here $b_{i,j} = -(\nabla_h\cdot\mathbf{u}^*)_{i,j}/\Delta t$ for a fluid of unit density; the minus signs make the matrix positive. This is the discrete <dfn data-term="pressure-poisson">pressure Poisson equation</dfn>. Next to a wall the missing neighbour drops out and the 4 becomes 3 or 2. Gather the pressures of an $n \times n$ grid into one vector $\mathbf{p}$ of $N = n^2$ unknowns, and the equations become one linear system, $A\mathbf{p} = \mathbf{b}$.</p>

<p>The matrix $A$ has three properties that everything in this chapter uses.</p>
<ul>
<li>It is <strong>sparse</strong>: at most five nonzeros in a row of length $N$. A code never stores it. It only ever applies the stencil, which is why the solvers here are called matrix-free.</li>
<li>It is <strong>symmetric</strong>: cell $c$ feels cell $d$ exactly as $d$ feels $c$.</li>
<li>It is <strong>positive definite</strong> when some boundary fixes the pressure level, for example an open side. In a closed box it is only semi-definite: adding a constant to every pressure changes nothing, so the constants are a null space, and a solution exists only if $\mathbf{b}$ sums to zero. That is the <dfn data-term="compatibility-condition">compatibility condition</dfn> of the last chapter. Every solver below first removes the mean of $\mathbf{b}$, as the course's solvers do.</li>
</ul>

<p>Why is this the bottleneck of an incompressible code? The equation is elliptic: every pressure depends on every divergence in the domain, at once. A push at one wall changes the pressure at the other, as <a href="#/pressure/constraint">the first figure of the last chapter</a> showed. So there is no local shortcut. Advection and forces touch each cell a fixed number of times per step; the pressure solve has to move information across the whole grid, every step.</p>

<p>The obvious approach is <strong>direct</strong>: Gaussian elimination, or its symmetric form, Cholesky factorisation $A = LL^{\mathrm{T}}$, followed by two triangular solves. Treated as a dense matrix, $A$ costs about $N^3/3$ multiply–adds to factorise. For a $1000 \times 1000$ grid, $N = 10^6$, that is $3 \times 10^{17}$, and $10^{12}$ numbers to store. Nobody does that. Number the cells row by row instead, and $A$ is banded: every nonzero lies within $n$ places of the diagonal. Elimination never creates nonzeros outside the band, but it fills the band in, as the figure shows. $L$ then holds about $N n = n^3$ numbers and costs about $N n^2/2 = n^4/2$ multiply–adds: for $n = 1000$, $10^9$ numbers (8 gigabytes) and $5 \times 10^{11}$ operations. Cleverer numberings help. Nested dissection, analysed by George in 1973, numbers each half of the grid before the line of cells that separates them, recursively, and brings the two-dimensional cost down to $O(n^3)$ operations and $O(n^2\log n)$ storage. (In three dimensions the fill is far worse.)</p>

<figure data-widget="solvers-fill" class="wide"><figcaption>The Cholesky factor of the five-point matrix, measured. Lower half of $A$ on the left, $L$ on the right; lighter entries are fill, zeros of $A$ that elimination turned into nonzeros. The plot counts nonzeros for every $n$ from 4 to 32. Row by row, $L$ fills the band and grows like $n^3$; nested dissection grows more slowly.</figcaption></figure>
<div class="try"><ol>
<li>Drag $n$ from 4 to 32 with the row-by-row numbering. The band in $L$ fills completely: at $n = 24$ the factor has 13,847 nonzeros, against 1,680 in the lower half of $A$ and $Nn = 13{,}824$ for a full band.</li>
<li>Switch to nested dissection at $n = 24$. The fill drops to 7,690, and the gap widens as $n$ grows. The fitted growth readout compares the two.</li>
<li>Look at the numbers of multiply–adds: they grow faster than the fill, about $n^4/2$ row by row.</li>
</ol></div>

<p>Direct solvers are not hopeless. If the grid and its solid cells never change, the factor can be computed once and reused every step, and sparse direct solvers do well on small two-dimensional problems. But $L$ must be recomputed whenever an obstacle moves or a free surface changes which cells hold fluid, and its memory grows faster than the grid. The alternative is <strong>iterative</strong>: start from a guess and improve it. Each iteration costs a few operations per cell and needs a few vectors of storage. The previous time step's pressure is an excellent first guess. And you can stop as soon as the answer is good enough. The whole question is then how many iterations "good enough" takes, and how that number grows with $n$.</p>

<aside class="who" data-person="simeon-denis-poisson">In a note of December 1813 he showed that inside an attracting mass the potential obeys an equation with a source term, $\nabla^2 V = -4\pi\rho$ in his sign convention, and not Laplace's equation. In a fluid solver the source is the divergence of the provisional velocity.</aside>

<div data-quiz="q1"></div>

<h2 id="relaxation">Relaxation: fix one cell at a time</h2>

<p>Here is the simplest idea there is. Pick a cell. Its equation (11.1) is not satisfied by the current guess. Change that cell's pressure so that its own equation holds exactly, with the neighbours as they are. Then move to the next cell. Each fix spoils the equations of the neighbours a little, so one pass over the grid is not enough; you go round again, and again. Engineers did this by hand from the 1930s on, as Southwell's "relaxation", choosing at each step the cell whose equation was worst. Machines do it in a fixed order, and the order turns out to matter.</p>

<p><dfn data-term="jacobi-method">Jacobi's method</dfn> updates every cell from the old values of its neighbours:</p>

<div class="eq" id="eq-jacobi">$$\begin{aligned} p_{i,j}^{(k+1)} = \frac{1}{4}\Big(&p_{i-1,j}^{(k)} + p_{i+1,j}^{(k)} \\ &+ p_{i,j-1}^{(k)} + p_{i,j+1}^{(k)} + h^2 b_{i,j}\Big) \end{aligned}$$<span class="eq-tag">(11.2)</span></div>

<p>Every cell can be done at the same time, which suits parallel hardware. Weighted Jacobi moves only a fraction $\omega$ of the way: $p^{(k+1)} = p^{(k)} + \omega\,(p^{\text{Jacobi}} - p^{(k)})$. <dfn data-term="gauss-seidel">Gauss–Seidel</dfn> uses each new value as soon as it exists. Sweeping row by row from the bottom left, the neighbours to the left and below have already been updated:</p>

<div class="eq" id="eq-gauss-seidel">$$\begin{aligned} p_{i,j}^{(k+1)} = \frac{1}{4}\Big(&p_{i-1,j}^{(k+1)} + p_{i+1,j}^{(k)} \\ &+ p_{i,j-1}^{(k+1)} + p_{i,j+1}^{(k)} + h^2 b_{i,j}\Big) \end{aligned}$$<span class="eq-tag">(11.3)</span></div>

<p>It costs the same per sweep, needs no second copy of the grid, and on this problem converges about twice as fast. On a $16 \times 16$ grid with $p = 0$ on the walls, cutting the residual by $10^6$ takes 564 Jacobi sweeps and 265 Gauss–Seidel sweeps. The price is that the cells must be done in order. <dfn data-term="red-black-ordering">Red–black ordering</dfn> gets parallelism back. Colour the cells like a chessboard. A red cell's four neighbours are all black, so all the red cells can be updated at once, then all the black ones. It is still Gauss–Seidel, just in a different order, and it converges at the same rate: 264 sweeps on the same problem.</p>

<p>Before you run the next figure, one more distinction. The <dfn data-term="residual">residual</dfn> $\mathbf{r} = \mathbf{b} - A\mathbf{p}$ says how badly the current guess fails the equations, and you can compute it at any time. The error $\mathbf{e} = \mathbf{p}^* - \mathbf{p}$ is how far the guess is from the true answer $\mathbf{p}^*$, and you never know it, because you do not know $\mathbf{p}^*$. The two are linked by the matrix itself:</p>

<div class="eq" id="eq-residual">$$\begin{aligned} A\mathbf{e} &= \mathbf{r}, \\ \frac{\|\mathbf{e}\|}{\|\mathbf{p}^*\|} &\le \kappa(A)\,\frac{\|\mathbf{r}\|}{\|\mathbf{b}\|}, \qquad \kappa(A) = \frac{\lambda_{\max}}{\lambda_{\min}} \end{aligned}$$<span class="eq-tag">(11.4)</span></div>

<p>The condition number $\kappa$ is the ratio of the largest to the smallest eigenvalue of $A$ (the smallest nonzero one in a closed box). For the five-point matrix it grows like $n^2$: about 206 on a $16 \times 16$ closed box and 13,279 on a $128 \times 128$ one. So a small residual does not promise a small error. Every solver stops on the residual, because that is all it has.</p>

<div data-quiz="q2"></div>

<figure data-widget="solvers-sweep" class="wide"><figcaption>Sweeps on a $16 \times 16$ closed box with a random right-hand side, run by the course's solvers with every cell update replayed in order. The cell being written is outlined in the write colour, the four it reads in the read colour; dots mark cells already updated in this sweep. Colour shows the error (the guess minus the exact answer, both with their mean removed) or the residual, each on a fixed scale set at the start.</figcaption></figure>
<div class="try"><ol>
<li>With Gauss–Seidel, watch the error map. After 10 sweeps the residual is down to 0.13 of its start, but the error is still 0.79. What is left of the error is a broad, smooth hill.</li>
<li>Switch the map to the residual and run again. It fades to a speckle within a few sweeps. A smooth error makes almost no residual, because the stencil measures curvature.</li>
<li>Try red–black at one cell per frame: all red cells first, then all black. Then Jacobi, whose reads all come from the previous sweep.</li>
<li>Try SOR (next paragraph). It needs 59 sweeps where Gauss–Seidel needs 561.</li>
</ol></div>

<p>Jacobi in this figure uses $\omega = 0.8$, not 1. On a closed box, plain Jacobi cannot damp one pattern at all: the <a href="#/pressure/checkerboard">checkerboard</a> $(-1)^{i+j}$. For that pattern the average of the four neighbours is exactly minus the cell's own value, so each sweep flips its sign and keeps its size. After 200 sweeps on the $16 \times 16$ box, plain Jacobi has a residual of 0.074, and $\omega = 0.8$ has 0.026. The next section shows why.</p>

<p>Gauss–Seidel can be pushed further. Since each update moves a cell in the right direction but not far enough, move it further: <dfn data-term="sor">successive over-relaxation</dfn> (SOR) takes the Gauss–Seidel value and overshoots,</p>

<div class="eq" id="eq-sor">$$\begin{aligned} p_{i,j}^{(k+1)} &= p_{i,j}^{(k)} + \omega\left(p_{i,j}^{\text{GS}} - p_{i,j}^{(k)}\right), \\ \omega_{\text{opt}} &= \frac{2}{1 + \sqrt{1 - \rho_J^2}} \end{aligned}$$<span class="eq-tag">(11.5)</span></div>

<p>with $1 < \omega < 2$. Here $\rho_J$ is the spectral radius of Jacobi's iteration, the factor by which its slowest error shrinks per sweep. Young's formula for the best $\omega$ holds for matrices like this one. On the $16 \times 16$ closed box, $\rho_J = 0.9904$ and $\omega_{\text{opt}} = 1.757$, and SOR needs 59 sweeps instead of 561. That is the difference between a cost that grows like $n^2$ and one that grows like $n$. The catch is in the next figure.</p>

<figure data-widget="solvers-sor" class="wide"><figcaption>Left: sweeps for SOR to cut the residual by $10^6$ on a closed box, for $\omega$ from 0.5 to 1.98, each point a full solve. The dashed line is Young's predicted optimum. Right: the residual history at the $\omega$ on the slider, against Gauss–Seidel.</figcaption></figure>
<div class="try"><ol>
<li>Press the button to set $\omega$ to the prediction: 59 sweeps on the $16 \times 16$ grid, and the measured best (1.76) agrees.</li>
<li>Now go to $\omega = 1.95$: 274 sweeps. Past the optimum the cost climbs steeply, and the residual history oscillates.</li>
<li>Go past 2. The iteration diverges, on any grid.</li>
<li>Switch to $32 \times 32$. The optimum moves to 1.870, and the old $\omega$ is now too small. The best $\omega$ depends on the grid and on the shape of the domain, which you rarely know in advance.</li>
</ol></div>

<aside class="pitfall">A fixed $\omega$ tuned on one grid is wrong on the next, and the penalty is lopsided: a little too large costs far more than a little too small. Above 2 SOR diverges. See <a href="#/pathologies">the rogues' gallery</a> entry on a badly chosen $\omega$.</aside>

<p>One more unit before the comparison gets serious. A <dfn data-term="work-unit">work unit</dfn> is one pass of the stencil over the whole grid: a relaxation sweep, or one product $A\mathbf{x}$. It is the fair currency for comparing methods whose iterations cost different amounts. Every method above costs one work unit per sweep.</p>

<aside class="history" data-era="1823">The names are loose. Gauss described an indirect way of solving least-squares equations in a letter to Gerling dated 26 December 1823; Jacobi published his iteration in 1845 (some histories date it 1846), combined with plane rotations, so the textbook method simplifies what he did; Seidel published his in 1874. Both Gauss and Seidel corrected the unknown with the largest residual first, by hand, and Seidel advised against a fixed cyclic order. Saad and van der Vorst (2000), citing Householder (1964), record that "Forsythe is quoted as having stated that 'the Gauss-Seidel method was not known to Gauss and not recommended by Seidel'". Southwell's relaxation, from 1935 on, was the same hand method grown into a craft for framed structures and then for fields.</aside>

<aside class="who" data-person="lewis-fry-richardson">In a paper read on 13 January 1910 and printed in 1911, he solved Laplace-type and biharmonic problems by finite differences, partly by successive approximation, with the stresses in a masonry dam as his application, and extrapolated the results from several grid sizes.</aside>

<aside class="who" data-person="david-m-young">His Harvard thesis, dated 1 May 1950 and published in 1954, gave the theory of SOR and the optimal factor, turning the hand-relaxers' habit of over-correcting into a rule for machines.</aside>

<aside class="who" data-person="stanley-frankel">In a 1950 paper he analysed the convergence of iterative methods for elliptic difference equations and gave the theory of over-relaxation for machine iteration, independently of Young and at the same time. Over-correcting by rule of thumb was older, from the hand-relaxation era.</aside>

<h2 id="smoothing">Why relaxation stalls</h2>

<p>The sweep figure showed the symptom: the residual collapses, then the error sits there. To see why, think of the error as a sum of waves. A rough wave, one that changes sign from cell to cell, has a large residual, because the stencil compares each cell with its neighbours and they disagree strongly. A relaxation step sees that disagreement and fixes it. A smooth wave, one that changes slowly across many cells, looks locally almost like a solution. Each cell is nearly the average of its neighbours, the residual is tiny, and a local update can only nudge it. Relaxation is a local method, and smooth error is a global problem.</p>

<p>You can make that exact on the one-dimensional version of the problem: $n$ points between two walls with the error held at zero on both, and the stencil $(2e_j - e_{j-1} - e_{j+1})/h^2$ with $h = 1/(n+1)$. Write the error as a sum of sine modes, $e_j = \sum_k a_k \sin\big(jk\pi/(n+1)\big)$, where mode $k = 1$ is one smooth hump and $k = n$ is a sawtooth. For weighted Jacobi the sine modes are eigenvectors: each sweep multiplies mode $k$ by its own factor and leaves the others alone.</p>

<div class="eq" id="eq-mode-factor">$$a_k \leftarrow \lambda_k\,a_k, \qquad \lambda_k = 1 - 2\omega\sin^2\!\left(\frac{k\pi}{2n+2}\right)$$<span class="eq-tag">(11.6)</span></div>

<details class="deeper"><summary>Go deeper: where the factor comes from</summary>
<p>Weighted Jacobi on $A\mathbf{e} = 0$ replaces each $e_j$ by $(1-\omega)e_j + \tfrac{\omega}{2}(e_{j-1} + e_{j+1})$. Put in $e_j = \sin(j\theta)$ with $\theta = k\pi/(n+1)$. The identity $\sin((j-1)\theta) + \sin((j+1)\theta) = 2\cos\theta\,\sin(j\theta)$ gives</p>
<p>$$(1-\omega)\sin(j\theta) + \omega\cos\theta\,\sin(j\theta) = \left(1 - \omega(1 - \cos\theta)\right)\sin(j\theta) = \left(1 - 2\omega\sin^2\tfrac{\theta}{2}\right)\sin(j\theta).$$</p>
<p>The sine vanishes at $j = 0$ and $j = n+1$, so the boundary conditions hold for free, and the mode comes back multiplied by $\lambda_k$. For the smoothest mode, $\sin^2(\pi/(2n+2)) \approx \pi^2h^2/4$, so $\lambda_1 \approx 1 - \omega\pi^2h^2/2$. Cutting it tenfold takes $\ln 10/(\omega\pi^2h^2/2)$ sweeps, which grows like $n^2$. In two dimensions the modes are products of sines and the same algebra gives the same conclusion.</p>
</details>

<p>Read the formula from both ends. For the smoothest mode, $\lambda_1$ is $1$ minus something of order $h^2$. With $n = 31$ and $\omega = 2/3$ it is 0.99679, and a tenfold cut takes 716 sweeps. Halve $h$ and it takes four times as many: 179 at $n = 15$, 2,866 at $n = 63$. For the rough half of the modes ($k > n/2$), $\sin^2$ is between $\tfrac12$ and 1, and with $\omega = 2/3$ every factor lies between $-\tfrac13$ and $\tfrac13$. Three sweeps cut every rough mode at least 27-fold, on any grid. The choice of $\omega$ matters. With $\omega = 1$, plain Jacobi, the sawtooth has $\lambda_n = -0.9952$ at $n = 31$: it flips sign every sweep and hardly shrinks. With $\omega > 1$ the roughest modes have $|\lambda_k| > 1$ and grow. That is the checkerboard trap of the last section, in one dimension.</p>

<div data-quiz="q3"></div>

<figure data-widget="solvers-modes" class="wide"><figcaption>The one-dimensional model problem, relaxed. Top left: the error now and at the start. Bottom left: the size of each sine mode of the error (bars) and at the start (ticks), on a log scale. Right: the factor one sweep applies to each mode, measured from a pure mode (points), with the analytic Jacobi factor (11.6) as a dashed curve. The shaded band is the rough half of the modes.</figcaption></figure>
<div class="try"><ol>
<li>Run the default (smooth plus wiggly, $\omega = 2/3$). After 10 sweeps the roughest mode is down to $1.5 \times 10^{-5}$ of its size; the smooth hump has lost 3%.</li>
<li>Choose the highest mode and set $\omega = 1$. The sawtooth flips every sweep and barely shrinks. Set $\omega = 2/3$: it is gone in a few sweeps.</li>
<li>Set $\omega = 1.1$ with the smooth-plus-wiggly start. The roughest modes now grow.</li>
<li>Choose "smooth error", then compare $n = 15$, 31 and 63. The readout of sweeps needed to cut mode 1 tenfold quadruples each time.</li>
<li>Try Gauss–Seidel. The modes now mix, but the picture is the same: the rough half dies fast (factor 0.19 at the middle mode, $-0.33$ at the roughest) and the smoothest mode keeps 0.990 of itself per sweep.</li>
</ol></div>

<p>So relaxation is not really a solver. It is a <dfn data-term="smoothing">smoother</dfn>: a few sweeps remove the rough part of the error, quickly and on any grid, and leave the smooth part almost untouched. The best weight for this job is $\omega = 2/3$ in one dimension and $\omega = 4/5$ in two, the values that make the worst factor over the rough half as small as possible. On the two-dimensional pressure problem the stall is the same. The number of sweeps needed grows like $n^2$, with fitted exponents of 1.90 for Jacobi and Gauss–Seidel between $16^2$ and $128^2$ in the race at the end of the chapter.</p>

<aside class="pitfall">A slowly converging relaxation solver is not a bug in the code: it is the smooth error doing what (11.6) says. Adding sweeps only buys time, at a cost that grows like $n^2$. See <a href="#/pathologies">the rogues' gallery</a> entry on relaxation stall, and read on for the cure.</aside>

<h2 id="multigrid">Multigrid: smooth error is rough somewhere else</h2>

<p>Take an error that relaxation has smoothed. Sample it on a grid with cells twice as wide. It is still well represented: a smooth hump needs few points. But on the coarse grid it looks twice as rough as it did, because each coarse cell spans twice the distance. Relaxation there damps it faster, and costs a quarter as much, since the coarse grid has a quarter of the cells. Repeat on a grid coarser still, and again, until the grid has so few cells that it can be solved exactly. That is <dfn data-term="multigrid">multigrid</dfn>: each grid size handles the part of the error that looks rough to it.</p>

<p>The coarse grid cannot solve for the pressure itself: it would make the same mistakes, coarsely. It solves for the correction. After smoothing on the fine grid, compute the residual, carry it down, solve the residual equation (11.4) there, and carry the correction back up:</p>

<div class="eq" id="eq-coarse-correction">$$\begin{aligned} \mathbf{r} &= \mathbf{b} - A\mathbf{p}, \\ A_{2h}\,\mathbf{e}_{2h} &= R\,\mathbf{r}, \\ \mathbf{p} &\leftarrow \mathbf{p} + P\,\mathbf{e}_{2h} \end{aligned}$$<span class="eq-tag">(11.7)</span></div>

<p>$A_{2h}$ is the same five-point operator on the coarse grid. <dfn data-term="restriction">Restriction</dfn> $R$ carries a fine-grid vector down: on cell-centred grids, each coarse cell takes the average of the four fine cells inside it. <dfn data-term="prolongation">Prolongation</dfn> $P$ carries a coarse vector up by bilinear interpolation: each fine cell takes $\tfrac{9}{16}$ of the coarse cell it lies in, $\tfrac{3}{16}$ from each of the two nearest coarse neighbours, and $\tfrac{1}{16}$ from the diagonal one. Interpolation leaves a little rough error of its own, so the correction is followed by a few more sweeps of smoothing.</p>

<p>Apply the same idea to the coarse equation, recursively, and you have a <dfn data-term="v-cycle">V-cycle</dfn>: smooth $\nu_1$ times, restrict the residual, cycle on the coarser grid, prolong the correction and add it, smooth $\nu_2$ times. The cycle goes down the levels and back up, like the letter V. In the course's solver, a $32 \times 32$ grid has levels of $32^2$, $16^2$, $8^2$, $4^2$ and $2^2$ cells, and the $2 \times 2$ grid is solved exactly. Each level has a quarter of the cells of the one above, so the coarse levels together cost at most a third of the finest one. A V(2,2) cycle costs 7.65 work units here, counting the residual.</p>

<figure data-widget="solvers-vcycle" class="wide"><figcaption>V-cycles on a $32 \times 32$ grid, run by the course's multigrid solver and drawn from its trace. The diagram shows where the cycle is. Each small panel copies the cell updates on its level: the correction being built there, which starts from zero on every visit. The big panel is the error of the fine-grid pressure after each complete cycle, rescaled each time to the error that is left (see its legend). The plot is the residual per cycle, with the default V(2,2) cycle as a dashed reference. The start has a noisy first guess, so the error is rough and smooth at once.</figcaption></figure>
<div class="try"><ol>
<li>Watch one cycle at the default settings. Pre-smoothing removes the noise on the fine grid; the coarse panels then build a smooth correction; after the cycle the big panel's scale (in its legend) has shrunk. The first cycle cuts the residual about 280-fold, because most of it came from the rough noise; after that each cycle cuts it by a factor of about 13 to 25.</li>
<li>Set $\nu = 0$: no smoothing. The coarse grids cannot see rough error, and nothing removes it. The factor per cycle is 1.000: no progress at all.</li>
<li>Choose Jacobi with $\omega = 1$ as the smoother and $\nu = 1$. The cycle crawls, at 0.77 rising to 0.99 per cycle, because plain Jacobi leaves the checkerboard alone.</li>
<li>Choose "p = 0 on walls", Jacobi with $\omega = 0.8$, $\nu = 1$, then switch the prolongation from bilinear to constant. The factor goes from about 0.35 per cycle to a divergence at about 1.31.</li>
</ol></div>

<p>The last experiment is a known rule, not an accident. For a second-order equation the orders of the two transfers must add to more than 2: $m_P + m_R > 2$ (Hemker 1990). Averaging is first order, and so is piecewise-constant prolongation, which copies each coarse value into its four children and leaves a step at every coarse-cell edge. One light Jacobi sweep cannot smooth those steps away. Bilinear prolongation is second order and passes the test. With heavier smoothing the problem is hidden: two red–black sweeps each way repair the constant version.</p>

<p>Now the result that makes multigrid special. On the closed box, the residual factor per V(2,2) cycle is 0.058 at $16^2$, 0.070 at $32^2$, and 0.081 at both $64^2$ and $128^2$. It does not grow with the grid. Cutting the residual by $10^6$ takes 4 or 5 cycles at every size, so the total work is proportional to the number of unknowns. No method can do better than that, since every unknown must at least be written once. Around a solid disc the coarse grids only approximate the cut cells and the factor is worse, 0.10 to 0.17, but still independent of $n$. Full multigrid goes one step further: it starts on the coarsest grid and interpolates each answer up as the first guess on the next finer grid, which in Brandt's analysis solves the problem to the accuracy of the discretisation in $O(N)$ operations.</p>

<div data-quiz="q4"></div>

<aside class="history" data-era="1961">Fedorenko described the method in 1961, in Russian, while trying to speed up the Poisson solves that ate most of the machine time of a weather-forecasting code; the English translation is dated 1962. In 1964 he proved that its convergence rate does not degrade as the mesh is refined, and Bakhvalov extended the analysis in 1966. The work was little known in the West until Brandt presented his multi-level adaptive technique at a Paris conference in July 1972 (printed 1973), followed by a long paper in Mathematics of Computation in 1977, whose abstract promises to solve "the possibly nonlinear system of n discrete equations in O(n) operations (40n additions and shifts for Poisson problems)". Hackbusch developed the method independently in Germany in 1976–78; his 1977 report already has "multi-grid" in its title. Who coined the name is not known.</aside>

<aside class="who" data-person="radii-fedorenko">Invented the multigrid idea in 1961 and in 1964 proved, for the Poisson problem on a rectangle, that its convergence rate does not depend on the mesh size.</aside>

<aside class="who" data-person="achi-brandt">Turned multigrid into a general, practical method in the 1970s, from the 1972–73 multi-level adaptive technique to the 1977 Mathematics of Computation paper that most of the literature starts from.</aside>

<h2 id="krylov">Conjugate gradients: the bottom of a bowl</h2>

<p>There is a second way to see the pressure equation. Because $A$ is symmetric and positive definite, solving $A\mathbf{p} = \mathbf{b}$ is the same as finding the lowest point of the quadratic bowl</p>

<div class="eq" id="eq-energy">$$\begin{aligned} f(\mathbf{p}) &= \tfrac{1}{2}\,\mathbf{p}^{\mathrm{T}}A\,\mathbf{p} - \mathbf{b}^{\mathrm{T}}\mathbf{p}, \\ \nabla f &= A\mathbf{p} - \mathbf{b} = -\mathbf{r} \end{aligned}$$<span class="eq-tag">(11.8)</span></div>

<p>since the gradient vanishes exactly at the solution. For the projection this has a physical meaning. The corrected velocity $\mathbf{u}^* - \Delta t\,\nabla p$ is the divergence-free field closest to $\mathbf{u}^*$ in kinetic energy, the <a href="#/pressure/hodge">orthogonal split</a> of the last chapter, and the pressure equation is the condition for that minimum. So solving for pressure is a descent to the bottom of a bowl in $N$ dimensions, and the residual is the downhill direction.</p>

<p>The obvious descent is steepest descent: walk along $\mathbf{r}$ to the lowest point on that line, then turn to the new downhill direction. In a round bowl that reaches the bottom in one step. In a long, narrow valley it zigzags from wall to wall. The bowl's shape is set by the eigenvalues of $A$: its walls are $\kappa$ times steeper in one direction than in another. In the worst case steepest descent cuts the error by a factor of $(\kappa - 1)/(\kappa + 1)$ per step, in the energy norm $\|\mathbf{e}\|_A = \sqrt{\mathbf{e}^{\mathrm{T}}A\,\mathbf{e}}$. With $\kappa$ of order $n^2$, that is as slow as Jacobi.</p>

<p>The <dfn data-term="conjugate-gradient">conjugate gradient method</dfn> fixes the zigzag. Its first step is steepest descent. Every later direction is chosen to be conjugate to all the earlier ones, $\mathbf{d}_i^{\mathrm{T}}A\,\mathbf{d}_j = 0$: perpendicular in the bowl's own geometry. A step along a conjugate direction never spoils the minimisation already done along the others, so nothing is ever undone. After $k$ steps the iterate is the best possible, in the energy norm, among all guesses of the form $\mathbf{p}_0$ plus a combination of $\mathbf{r}_0, A\mathbf{r}_0, \dots, A^{k-1}\mathbf{r}_0$. That space is a Krylov subspace, and every method built on it is a <dfn data-term="krylov-method">Krylov method</dfn>. Remarkably, the conjugate direction comes from a two-term recurrence, so each iteration needs one product with $A$ (one work unit) and a few dot products:</p>

<div class="eq" id="eq-cg">$$\begin{aligned} \mathbf{r}_0 &= \mathbf{b} - A\mathbf{p}_0, \quad \mathbf{d}_0 = \mathbf{r}_0, \\ \alpha_k &= \frac{\mathbf{r}_k^{\mathrm{T}}\mathbf{r}_k}{\mathbf{d}_k^{\mathrm{T}}A\,\mathbf{d}_k}, \\ \mathbf{p}_{k+1} &= \mathbf{p}_k + \alpha_k\mathbf{d}_k, \\ \mathbf{r}_{k+1} &= \mathbf{r}_k - \alpha_k A\,\mathbf{d}_k, \\ \beta_k &= \frac{\mathbf{r}_{k+1}^{\mathrm{T}}\mathbf{r}_{k+1}}{\mathbf{r}_k^{\mathrm{T}}\mathbf{r}_k}, \\ \mathbf{d}_{k+1} &= \mathbf{r}_{k+1} + \beta_k\mathbf{d}_k \end{aligned}$$<span class="eq-tag">(11.9)</span></div>

<figure data-widget="solvers-cg"><figcaption>Steepest descent and conjugate gradients on a system with two unknowns, from the chapter's own kernel. The ellipses are contours of the bowl (11.8), with the minimum at the centre. Drag on the picture to move the start; the condition number stretches the bowl and the tilt turns it.</figcaption></figure>
<div class="try"><ol>
<li>At $\kappa = 10$ from the worst start, steepest descent needs 69 steps to cut the residual by $10^6$, each cutting the energy error by exactly $9/11 = 0.818$. Conjugate gradients needs 2.</li>
<li>Raise $\kappa$ to 100: 691 steps for steepest descent, still 2 for conjugate gradients.</li>
<li>Drag the start onto an axis of the ellipse. Steepest descent now goes straight to the centre: the zigzag depends on where you start, the worst case does not.</li>
<li>Turn on the Jacobi preconditioner with the tilt at 0°: the bowl becomes round and both methods take one step. At 45° it changes nothing.</li>
</ol></div>

<p>In exact arithmetic conjugate gradients reaches the exact answer in at most $N$ steps, two in the figure. On the pressure problem $N$ is huge and that guarantee is useless. What matters is the classical bound</p>

<div class="eq" id="eq-cg-bound">$$\|\mathbf{e}_k\|_A \le 2\left(\frac{\sqrt{\kappa} - 1}{\sqrt{\kappa} + 1}\right)^{k}\|\mathbf{e}_0\|_A$$<span class="eq-tag">(11.10)</span></div>

<p>with $\sqrt{\kappa}$ where steepest descent has $\kappa$. Since $\kappa$ grows like $n^2$, the iteration count grows like $n$: on the closed box, 56, 113, 225 and 424 iterations from $16^2$ to $128^2$. That is the same growth as SOR at its best $\omega$, with no parameter to tune.</p>

<p>To do better, change the bowl. A <dfn data-term="preconditioner">preconditioner</dfn> is an approximation $M \approx A$ that is cheap to invert; conjugate gradients then works with $M^{-1}A$ (in a form that keeps the symmetry), whose condition number can be far smaller. The cheapest choice, Jacobi preconditioning with $M$ the diagonal of $A$, does nothing here, because the diagonal is $4/h^2$ in nearly every cell: 222 iterations instead of 225 on a $64^2$ box. That is the 45° bowl in the figure. Incomplete Cholesky, IC(0), runs Cholesky factorisation but throws away every fill entry, keeping $L$ as sparse as $A$ (Meijerink and van der Vorst, 1977). It costs two work units per iteration and needs 21, 39, 67 and 129 iterations from $16^2$ to $128^2$. Modified incomplete Cholesky, MIC(0) (Gustafsson, 1978), adds the dropped fill back onto the diagonal so that $M$ matches $A$ on smooth vectors. That brings $\kappa(M^{-1}A)$ down to order $n$, and the iteration count to order $\sqrt{n}$ on a plain box. With the slightly cautious weighting used in graphics codes (Bridson's book puts back 97% of the fill), the counts are 17, 24, 38 and 70. Best of all is to use one multigrid V-cycle as the preconditioner (McAdams and colleagues, 2010): 5 iterations at every size, and robust around obstacles, where the conjugate-gradient wrapper absorbs the coarse grids' mistakes.</p>

<p>Conjugate gradients needs a symmetric positive definite matrix. The pressure matrix is one, but many matrices in fluid dynamics are not: implicit advection, or velocity and pressure solved together. For those, the standard Krylov methods are GMRES (Saad and Schultz, 1986), which picks the iterate with the smallest residual in the Krylov space but must store every direction, so it is restarted every $m$ steps; and Bi-CGSTAB (van der Vorst, 1992), which uses short recurrences like conjugate gradients at the price of less regular convergence. Both are usually run with a preconditioner.</p>

<div data-quiz="q5"></div>

<aside class="history" data-era="1952">Hestenes and Stiefel published the method in December 1952, after finding it independently, Hestenes at the Institute for Numerical Analysis in Los Angeles and Stiefel in Zürich. They saw it as a rival to elimination: "In our opinion, the conjugate gradient method is superior to the elimination method as a machine method." They also called it "an iterative method which terminates in at most n steps if no rounding-off errors are encountered." Round-off destroys the exact termination, and judged as a direct method it disappointed. Saad and van der Vorst write that "it took about 25 years for the conjugate gradient method to become the method of choice for symmetric positive definite matrices". Its wide use came once it was treated as an iterative method and paired with preconditioners such as incomplete Cholesky (1977). The name "Krylov subspace" honours a 1931 paper by A. N. Krylov on computing characteristic polynomials; he did not study linear solvers, and who attached his name is not known.</aside>

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

<p>At $128^2$ the gap is enormous: about 29,000 work units for Gauss–Seidel, 450 for SOR or conjugate gradients, 140 for MIC(0) and under 40 for multigrid. And it widens with every refinement, because the exponents differ. Run the race yourself.</p>

<figure data-widget="solvers-race" class="wide"><figcaption>Five solvers on the same pressure problem. Left: relative residual against work, the solvers advanced together so that none gets ahead. Right: iterations to cut the residual by $10^6$ on grids from $16^2$ to $128^2$, on log scales, with reference slopes. Every point is a full solve by the course's solvers, computed in the background; the readouts give the work to reach $10^{-8}$, the iterations and time on this device at the race's grid size, and the fitted growth.</figcaption></figure>
<div class="try"><ol>
<li>Watch the race on the closed box. Multigrid reaches $10^{-8}$ in 46 work units; Gauss–Seidel has barely started.</li>
<li>On the right plot, compare the slopes with the reference lines: about 2 for relaxation, about 1 for SOR and conjugate gradients, flat for multigrid.</li>
<li>Switch to the box with a disc and compare the two multilevel methods. Multigrid alone needs 7 cycles to cut the residual by $10^6$ where it needed 5, CG with multigrid 6, and neither count grows with the grid.</li>
<li>Switch the preconditioned method to CG + Jacobi: its curve sits on top of plain CG.</li>
</ol></div>

<p>Work units are not seconds. Measured in node on a desktop machine at $128^2$ to a tolerance of $10^{-4}$, multigrid takes about 2 milliseconds, CG with multigrid about 4, MIC(0) about 19, SOR and plain conjugate gradients 55 to 90, and Gauss–Seidel about two seconds. A phone is several times slower. Real hardware adds two further concerns. Memory traffic often costs more than arithmetic, so methods that touch each value once per sweep do well. And parallelism matters: Jacobi and red–black sweeps parallelise perfectly, while lexicographic Gauss–Seidel and the triangular solves of IC(0) and MIC(0) are sequential by nature, and the coarsest multigrid levels leave most of a GPU idle. That is why graphics codes on GPUs still often run Jacobi or red–black sweeps, accepting the stall.</p>

<p>The last decision is when to stop. The residual of the pressure solve is exactly the divergence the projection leaves behind, so the tolerance is the leak you accept. A projected velocity with divergence $\nabla\cdot\mathbf{u}$ creates fluid in some cells and destroys it in others; in a closed box the two balance, and the volume created per step is $\Delta t\,\tfrac{1}{2}\sum_c |(\nabla_h\cdot\mathbf{u})_c|\,h^2$. It looks small, but it happens every step, and it accumulates. The solve is warm-started from the previous pressure, which is why multigrid needs only about 1.6 cycles per step at $10^{-4}$ in the stirred box below.</p>

<div data-quiz="q6"></div>

<figure data-widget="solvers-tolerance" class="wide"><figcaption>A Stable Fluids simulation of a closed $48 \times 48$ box, one step per frame, its pressure solved by multigrid to a tolerance or by a fixed number of Jacobi sweeps. The plot adds up the volume of fluid created (and destroyed) by the divergence each projection leaves behind; earlier runs stay on the plot for comparison. In the layered scene the fluid should stay at rest; the picture shows its speed.</figcaption></figure>
<div class="try"><ol>
<li>Run the swirl at $10^{-4}$, then at $10^{-2}$, then at $10^{-1}$. Over 10 seconds the leak is about $1.8 \times 10^{-3}$, 0.20 and 2.2 box volumes: it scales with the tolerance.</li>
<li>Switch to 30 fixed Jacobi sweeps per step: a leak of 0.064, for more than twice the work of multigrid at $10^{-4}$ (about 12 work units a step). Even 200 sweeps leak 0.005.</li>
<li>Choose the layered fluid at rest with a tolerance of $10^{-1}$: currents of up to about 0.5 appear from nothing, because the unconverged pressure cannot hold the layers up. At $10^{-6}$ the fluid stays still to about $2 \times 10^{-6}$.</li>
</ol></div>

<p>So pick the tolerance for what you need, and check it. A relative tolerance of $10^{-4}$ to $10^{-6}$ is common for visual work; quantitative work goes tighter. Monitor the divergence after the projection, and the total volume, not just the iteration count. A fixed iteration budget, as in many real-time codes, is a tolerance in disguise, and a worse one on a finer grid. The symptom of getting this wrong is <a href="#/pressure/projection">the incomplete projection</a> of the last chapter: tracers that bunch up, smoke that gains or loses volume, liquid that slowly disappears.</p>

<aside class="pitfall">Stopping early leaves divergence in every step, and the leak adds up: volume drifts, a fluid at rest starts to move, and the error grows with the grid at a fixed iteration count. See <a href="#/pathologies">the rogues' gallery</a> entry on a loose tolerance.</aside>

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
        'About $3 \\times 10^6$, the same as the lower half of $A$: the factor of a sparse matrix is sparse.',
        'About $10^9$: elimination fills the band of half-width $n = 1000$ in all $10^6$ rows.',
        'About $5 \\times 10^{11}$: one for every multiply–add.',
        'About $10^{12}$, the full dense matrix.',
      ],
      answer: 1,
      explain: 'Row by row, every nonzero of $A$ lies within $n$ places of the diagonal, and elimination fills that band: $N \\times n = 10^6 \\times 10^3 = 10^9$ numbers, 8 gigabytes. The figure measures it: at $n = 24$, 13,847 nonzeros against $Nn = 13{,}824$. It never fills outside the band, so it is not dense, and $5 \\times 10^{11}$ is the count of operations ($n^4/2$), not of stored numbers.',
    },
    q2: {
      type: 'predict',
      q: 'In the next figure, after 10 Gauss–Seidel sweeps on the $16 \\times 16$ closed box, the residual has fallen to 0.13 of its starting size. How big is the error, relative to the size of the exact answer?',
      choices: [
        'About 0.13 as well: residual and error shrink together.',
        'About 0.8: most of the error is still there.',
        'About 0.02, the square of the residual ratio.',
        'Larger than at the start: Gauss–Seidel first makes the error worse.',
      ],
      answer: 1,
      explain: 'The figure measures 0.79. By (11.4), $A\\mathbf{e} = \\mathbf{r}$, and $A$ is a second difference: for a smooth error it is small, so a large smooth error hides behind a small residual. Relaxation removes the rough part of the error, which carries most of the residual, and leaves the smooth part. The error does fall, slowly, so it is not made worse.',
    },
    q3: {
      type: 'predict',
      q: 'The next figure starts from a pure sawtooth, mode $k = n$ with $n = 31$, and applies plain Jacobi ($\\omega = 1$). What is left after 10 sweeps?',
      choices: [
        'Nothing: Jacobi kills the roughest modes first.',
        'About 95% of the sawtooth, its sign flipping every sweep.',
        'A smooth hump: the sawtooth turns into mode 1.',
        'A sawtooth about 10 times larger: Jacobi is unstable on it.',
      ],
      answer: 1,
      explain: 'By (11.6) the factor is $1 - 2\\sin^2(31\\pi/64) = -0.9952$, so 10 sweeps leave $0.9952^{10} \\approx 0.95$. The modes are eigenvectors of Jacobi, so nothing turns into another mode. With $\\omega = 2/3$ the factor is about $-1/3$ and the sawtooth is gone in a few sweeps. Instability needs $|\\lambda| > 1$, which takes $\\omega > 1$.',
    },
    q4: {
      type: 'mcq',
      q: 'A multigrid V(2,2) solver needs 5 cycles to cut the residual by $10^6$ on a $32 \\times 32$ closed box. Roughly how many does it need on $128 \\times 128$?',
      choices: [
        'About 80, since iterations grow like $n^2$.',
        'About 20, since iterations grow like $n$.',
        'About 5: the factor per cycle does not depend on the grid.',
        'About 2: finer grids are smoother, so multigrid gets faster.',
      ],
      answer: 2,
      explain: 'Measured: 5 cycles at $32^2$, $64^2$ and $128^2$, with a factor of 0.07 to 0.08 per cycle. Smoothing removes rough error at a rate independent of $h$, and every smooth component is rough on some coarser grid. The work per cycle grows with the number of cells, so total work is proportional to $N$; the cycle count does not shrink, because the problem does not get easier.',
    },
    q5: {
      type: 'mcq',
      q: 'You add a Jacobi preconditioner ($M$ = the diagonal of $A$) to conjugate gradients for the pressure on a $64 \\times 64$ closed box. Plain CG takes 225 iterations. What happens?',
      choices: [
        'About 15 iterations: the square root of 225.',
        'About 112: Jacobi halves the iteration count.',
        'About the same, 222: the diagonal is $4/h^2$ almost everywhere, so dividing by it only rescales.',
        'It diverges: preconditioned CG needs an exact inverse.',
      ],
      answer: 2,
      explain: 'Measured: 222 against 225. A constant diagonal scales $A$ without changing its shape, like the 45° bowl in the figure. Diagonal scaling helps when the diagonal varies a lot, for example with large jumps in density. To change the iteration count you need an $M$ that captures the coupling between cells: incomplete Cholesky (67 iterations here), MIC(0) (38) or a multigrid cycle (5).',
    },
    q6: {
      type: 'predict',
      q: 'In the next figure, multigrid at a relative tolerance of $10^{-4}$ leaks $1.8 \\times 10^{-3}$ of the box volume over 10 seconds of a stirred simulation. You loosen the tolerance to $10^{-2}$. What happens to the leak?',
      choices: [
        'Nothing much: multigrid is so efficient that it overshoots the tolerance anyway.',
        'It roughly doubles.',
        'It grows about a hundredfold, to about 0.2 of the box.',
        'It grows ten-thousandfold: errors square from step to step.',
      ],
      answer: 2,
      explain: 'Measured: 0.196 against $1.77 \\times 10^{-3}$, a factor of 110. Each projection leaves divergence in proportion to the tolerance, and the leak is the sum over steps, so it scales with the tolerance. Multigrid does overshoot within a cycle, but it stops at the first cycle below the tolerance. Nothing squares: the leftovers add up linearly.',
    },
  },
  glossary: {
    'jacobi-method': {
      term: 'Jacobi method',
      def: 'An iteration for $A\\mathbf{x} = \\mathbf{b}$ that sets every unknown, all at once, to the value that satisfies its own equation with the old values of the others. Weighted Jacobi moves only a fraction $\\omega$ of the way. Fully parallel, but slow on smooth error. Jacobi, 1845.',
      section: 'relaxation',
    },
    'gauss-seidel': {
      term: 'Gauss–Seidel',
      def: 'Relaxation that updates the unknowns one after another and uses each new value at once. Same cost as Jacobi and about twice as fast on the pressure problem, but sequential in its usual row-by-row order. Neither Gauss (1823) nor Seidel (1874) used the fixed cyclic order taught today.',
      section: 'relaxation',
    },
    sor: {
      term: 'successive over-relaxation (SOR)',
      def: 'Gauss–Seidel with each update multiplied by a factor $1 < \\omega < 2$. With the optimal $\\omega = 2/(1 + \\sqrt{1 - \\rho_J^2})$ the iteration count grows like $n$ instead of $n^2$; above the optimum it degrades quickly, and above 2 it diverges. Young and Frankel, 1950.',
      section: 'relaxation',
    },
    'red-black-ordering': {
      term: 'red–black ordering',
      def: 'Colouring grid cells like a chessboard. With a five-point stencil a red cell has only black neighbours, so all red cells can be relaxed in parallel, then all black ones. Same convergence rate as row-by-row Gauss–Seidel.',
      section: 'relaxation',
    },
    residual: {
      term: 'residual',
      def: '$\\mathbf{r} = \\mathbf{b} - A\\mathbf{x}$: how badly a guess fails the equations. It is computable, unlike the error $\\mathbf{e}$, and the two are linked by $A\\mathbf{e} = \\mathbf{r}$, so a small residual can hide a large smooth error. In a projection it is the divergence left behind.',
      section: 'relaxation',
    },
    smoothing: {
      term: 'smoothing',
      def: 'What relaxation sweeps really do: damp the rough (high-frequency) part of the error quickly, by a factor independent of the grid, while leaving smooth error almost untouched. A method used this way is called a smoother.',
      section: 'smoothing',
    },
    multigrid: {
      term: 'multigrid',
      def: 'A solver that combines smoothing on the fine grid with corrections computed on a hierarchy of coarser grids, where smooth error looks rough. For the Poisson equation it converges at a rate independent of the grid, in work proportional to the number of unknowns. Fedorenko, 1961–64; Brandt, 1973–77.',
      section: 'multigrid',
    },
    'v-cycle': {
      term: 'V-cycle',
      def: 'One multigrid iteration: smooth, restrict the residual to the next coarser grid, apply the cycle there recursively (solving exactly on the coarsest grid), prolong the correction back, smooth again. V($\\nu_1$,$\\nu_2$) names the numbers of sweeps before and after.',
      section: 'multigrid',
    },
    restriction: {
      term: 'restriction',
      def: 'The multigrid operator that carries a fine-grid vector (usually the residual) to the next coarser grid, for example by averaging the four fine cells inside each coarse cell.',
      section: 'multigrid',
    },
    prolongation: {
      term: 'prolongation',
      def: 'The multigrid operator that carries a coarse-grid correction to the next finer grid by interpolation; bilinear on cell-centred grids (weights 9/16, 3/16, 3/16, 1/16). Its order plus that of the restriction must exceed the order of the equation (2 for Poisson).',
      section: 'multigrid',
    },
    'conjugate-gradient': {
      term: 'conjugate gradient method (CG)',
      def: 'The Krylov method for symmetric positive definite systems: it minimises the energy $\\tfrac12\\mathbf{x}^{\\mathrm{T}}A\\mathbf{x} - \\mathbf{b}^{\\mathrm{T}}\\mathbf{x}$ along directions that are mutually $A$-conjugate, so no step undoes another. One matrix–vector product per iteration; iterations grow like $\\sqrt{\\kappa}$. Hestenes and Stiefel, 1952.',
      section: 'krylov',
    },
    preconditioner: {
      term: 'preconditioner',
      def: 'An approximation $M \\approx A$ that is cheap to invert, used to replace $A\\mathbf{x} = \\mathbf{b}$ by a better-conditioned system such as $M^{-1}A\\mathbf{x} = M^{-1}\\mathbf{b}$. For the pressure: incomplete Cholesky, MIC(0), or a multigrid cycle; the diagonal (Jacobi) does almost nothing.',
      section: 'krylov',
    },
    'krylov-method': {
      term: 'Krylov method',
      def: 'An iterative method whose $k$-th iterate lies in $\\mathbf{x}_0 + \\operatorname{span}\\{\\mathbf{r}_0, A\\mathbf{r}_0, \\dots, A^{k-1}\\mathbf{r}_0\\}$ and is the best there in some sense: conjugate gradients (energy norm), GMRES (residual norm), Bi-CGSTAB. Needs only products with $A$.',
      section: 'krylov',
    },
    'work-unit': {
      term: 'work unit',
      def: 'The cost of one pass of the stencil over the whole fine grid: a relaxation sweep or one matrix–vector product. Used to compare solvers whose iterations cost different amounts; a multigrid V(2,2) cycle is about 7.7 work units.',
      section: 'relaxation',
    },
  },
  pathologies: [
    {
      id: 'relaxation-stall',
      name: 'Relaxation stall',
      family: 'solver',
      symptom: 'A Jacobi or Gauss–Seidel pressure solver makes quick progress for a few sweeps, then the residual falls very slowly, while the error (if you can measure it) hardly moves. Doubling the grid resolution makes it about four times slower.',
      cause: 'Relaxation is local: it damps rough error by a fixed factor per sweep, but the smooth error modes are multiplied by $1 - O(h^2)$, as (11.6) shows. What is left after the first sweeps is smooth error, which also makes a small residual, so the residual understates it.',
      diagnose: 'Plot the residual against sweeps on a log axis: a fast drop then a long shallow line. Repeat on a grid twice as fine and check whether the sweep count to a fixed tolerance quadruples. Look at the error or the update: it should be smooth and large-scale.',
      mitigations: [
        'Use multigrid, with the relaxation as its smoother: grid-independent convergence for a few times the cost of a sweep. Some effort to implement, especially around solids.',
        'Use preconditioned conjugate gradients (MIC(0) or a multigrid preconditioner): iterations grow like $n^{1/2}$ or not at all.',
        'Warm-start from the previous time step\'s pressure, so that less smooth error has to be removed. Cheap, and always worth doing.',
        'SOR with a well-chosen $\\omega$ turns $n^2$ into $n$, but needs tuning for every grid and geometry.',
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
      diagnose: 'Run a few values of $\\omega$ and count sweeps to a fixed tolerance: the curve has a sharp minimum. Check whether your $\\omega$ was tuned on a different grid. An oscillating residual history means $\\omega$ is past the optimum.',
      mitigations: [
        'Estimate $\\rho_J$ for the actual grid (for a box, from the grid size) and use Young\'s formula; err on the low side, since too small costs less than too large.',
        'Adapt $\\omega$ during the solve from the observed convergence rate, as some codes do.',
        'Replace SOR with a method that has no such parameter: conjugate gradients converges at the same rate as optimal SOR, and multigrid or preconditioned CG much faster.',
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
      diagnose: 'After each projection, measure $\\|\\nabla\\cdot\\mathbf{u}\\|$ relative to the divergence before it, and sum $\\Delta t\\,\\tfrac12\\sum|\\nabla\\cdot\\mathbf{u}|h^2$ over steps. Halve the tolerance: if the drift halves, the solver is the cause.',
      mitigations: [
        'Solve to a relative tolerance of $10^{-4}$ to $10^{-6}$ (tighter for quantitative work) with a fast solver, and warm-start it from the previous pressure, which makes tight tolerances cheap.',
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
