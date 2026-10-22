// Chapter 14: turbulence. Prose, questions, glossary and gallery entries; the
// figures live in ./turbulence/ and run the shared kernels
// src/sims/turbulence.js (Sabra shell model, 2-D spectral vorticity solver,
// DNS cost, Pope's model spectrum), src/sims/spectral.js (pseudo-spectral
// Burgers) and src/sims/burgers.js (finite-volume Burgers).

import { mountShell } from './turbulence/shell.js';
import { mountCost } from './turbulence/cost.js';
import { mountAliasing } from './turbulence/aliasing.js';
import { mountTwoD } from './turbulence/twod.js';
import { mountSpectrum } from './turbulence/spectrum.js';
import { mountImplicit } from './turbulence/implicit.js';

export const chapter = {
  id: 'turbulence',
  title: 'Turbulence and the cascade of scales',
  short: 'Turbulence',
  blurb: 'The energy cascade, Kolmogorov\'s scales, why direct numerical simulation scales as Re³, and how RANS and LES model unresolved eddies.',
  minutes: 45,
  html: String.raw`
<p class="lead-in">Most everyday flows are turbulent—the air wake behind a car, the plume from a chimney, or a stirred cup of tea. Although the Navier–Stokes equations govern all of them without any new physical laws, a turbulent flow contains eddies across a wide range of length and time scales, and resolving every eddy down to the dissipation scale requires computational work that grows as the cube of the Reynolds number. This chapter derives that scale separation, counts the grid points and time steps required to resolve it, shows how under-resolution and aliasing corrupt spectral simulations, and introduces the closures used in RANS and LES to model the unresolved scales.</p>

<h2 id="what-is-turbulence">What turbulence is</h2>
<p>When water is poured from a jug into a basin, the surface near the jet churns with eddies of many sizes that spin, stretch, merge and decay further out. No two pours trace the same trajectory, yet every pour produces the same statistical distribution of velocities and length scales. That combination—unpredictable in individual detail while reproducible in its statistics—characterises turbulent flow.</p>
<p>People have drawn this motion for five hundred years. Leonardo da Vinci filled notebook pages with water falling into pools and eddies shed behind obstacles, using the Italian word <i>turbolenza</i> for the motion, though his notebooks remained unpublished for centuries. The technical English term is much younger: Kelvin used "turbulent" and "turbulence" for irregular eddying flow in 1887, four years after Osborne Reynolds had called the same motion "sinuous" in his pipe-flow dye experiments (<a href="#/similarity/reynolds-1883">chapter 5</a>).</p>
<aside class="who" data-person="leonardo-da-vinci">His drawings of jets and wakes are the earliest detailed studies of turbulent water. Fluid dynamicists cite a note in the Codex Atlanticus as the first application of the Italian noun <i>turbolenza</i> to fluid flow, adapting the classical Latin adjective <i>turbulentus</i>.</aside>
<aside class="who" data-person="william-thomson-kelvin">In two 1887 papers in the <i>Philosophical Magazine</i> Kelvin used "turbulent" and "turbulence" for eddying flow, though the term became standard usage only in the early twentieth century.</aside>
<p>While no single one-line definition captures every case, a <dfn data-term="turbulence">turbulent</dfn> flow exhibits five properties together:</p>
<ul>
<li><b>Irregular.</b> Velocity at a point fluctuates aperiodically in time and space, even though the governing equations are deterministic.</li>
<li><b>Chaotic.</b> Tiny perturbations in initial conditions grow rapidly, so reproducible predictions apply to statistical averages rather than individual trajectories.</li>
<li><b>Mixing.</b> Turbulent eddies transport heat, momentum and dissolved dye orders of magnitude faster than molecular diffusion.</li>
<li><b>Dissipative.</b> Viscous shear at the smallest scales continually converts kinetic energy into heat, so the motion decays within seconds once stirring stops.</li>
<li><b>Multiscale.</b> Eddies span a continuous hierarchy of length and time scales that widens as the <dfn data-term="reynolds-number">Reynolds number</dfn> increases.</li>
</ul>
<p>Whether a fluid motion becomes turbulent depends on the dynamical state of the flow—summarised by the Reynolds number $\mathrm{Re} = UL/\nu$, the ratio of inertial forces to viscous damping—rather than on the fluid alone. The same water flows in smooth <dfn data-term="laminar">laminar</dfn> layers through a narrow, slow pipe and transitions to <dfn data-term="turbulent">turbulent</dfn> eddies in a wide, fast one.</p>
<p>The physical picture of how those scales interact came from numerical weather prediction. In his 1922 book, Lewis Fry Richardson wrote, in the middle of a prose paragraph, that "big whirls have little whirls that feed on their velocity, and little whirls have lesser whirls and so on to viscosity—in the molecular sense." Kinetic energy enters at the largest scales, transfers down through successively smaller eddies without viscous loss, and is dissipated into heat at the smallest scales—the <a href="#/turbulence/cascade">energy cascade</a> analysed in the next section.</p>
<aside class="who" data-person="lewis-fry-richardson">The "big whirls" sentence is on page 66 of <i>Weather Prediction by Numerical Process</i> (1922). It is usually reset as a four-line verse with "in the molecular sense" dropped, and read as a parody of the "great fleas have little fleas" rhyme.</aside>
<p>In 1963 Edward Lorenz showed that a three-variable truncation of thermal convection never settles or repeats, and that an infinitesimal perturbation to its initial state amplifies until the two trajectories become uncorrelated. Because a three-dimensional turbulence simulation exhibits the same sensitivity—two runs differing in the last bit of a single floating-point number diverge within a few turnover times—simulations are evaluated by the convergence of their mean profiles, spectra and higher-order statistics.</p>
<aside class="who" data-person="edward-lorenz">Lorenz's first image for sensitivity was a sea gull: "one flap of a sea gull's wings would be enough to alter the course of the weather forever" (1963). The butterfly came later, probably from Joseph Smagorinsky in 1969, who appears later in this chapter.</aside>
<p>At the smallest scales, viscous dissipation is also strongly uneven in space and time, concentrating into thin vortex sheets and tubes that occupy only a small fraction of the volume. Because of this <a href="#/turbulence/shell-model">intermittency</a>, dimensional scaling arguments capture low-order averages accurately while underpredicting extreme fluctuations.</p>
<p>The sections that follow examine the Richardson–Kolmogorov cascade, an interactive shell model of scale transfer, the $\mathrm{Re}^3$ computational scaling of direct numerical simulation, aliasing errors in spectral solvers, the inverse energy cascade in two dimensions, and the RANS and LES closures used when full resolution is infeasible.</p>

<h2 id="cascade">Richardson's cascade and Kolmogorov's scales</h2>
<p>When a spoon stirs a cup of tea, it injects kinetic energy at the length scale of the spoon, $L$, with characteristic velocities of order $U$. The largest eddies break up in roughly one turnover time $L/U$, transferring their kinetic energy to smaller scales at a rate per unit mass of order</p>
<div class="eq" id="eq-epsilon">$$\varepsilon \sim \frac{U^2}{L/U} = \frac{U^3}{L}.$$<span class="eq-tag">(14.1)</span></div>
<p>Notice that the kinematic viscosity $\nu$ does not appear in (14.1). In statistically steady turbulence the viscous dissipation rate at the smallest scales must match the rate at which energy is injected at the largest scales, so $\varepsilon$ is controlled by the large-scale motion $U^3/L$. When $\nu$ is decreased at fixed $U$ and $L$, the flow generates sharper velocity gradients at smaller scales so that $\nu\langle|\nabla\mathbf{u}|^2\rangle$ continues to dissipate energy at the same rate $\varepsilon$, and measurements confirm that $\varepsilon L/U^3$ approaches a constant of order unity at high Reynolds number.</p>
<p>In 1941 Andrey Kolmogorov proposed that at sufficiently high Reynolds number the smallest eddies lose all memory of the large-scale geometry and forcing. Their statistical properties then depend only on the energy flux $\varepsilon$ arriving from larger scales and the kinematic viscosity $\nu$ that damps them. Dimensional analysis forms a unique length, time and velocity from $\varepsilon$ and $\nu$:</p>
<div class="eq" id="eq-kolmogorov">$$\begin{gathered}\eta = \left(\dfrac{\nu^3}{\varepsilon}\right)^{1/4}, \qquad \tau_\eta = \left(\dfrac{\nu}{\varepsilon}\right)^{1/2}, \\ u_\eta = (\nu\varepsilon)^{1/4}.\end{gathered}$$<span class="eq-tag">(14.2)</span></div>
<p>At these <dfn data-term="kolmogorov-scale">Kolmogorov scales</dfn>, the local Reynolds number of an eddy of size $\eta$ and velocity $u_\eta$ is $u_\eta\eta/\nu = 1$, so viscous damping balances inertia and the cascade terminates. Substituting (14.1) into (14.2) gives the ratios between the integral scale and the Kolmogorov microscales:</p>
<div class="eq" id="eq-scale-ratio">$$\frac{L}{\eta} \sim \mathrm{Re}^{3/4}, \qquad \frac{L/U}{\tau_\eta} \sim \mathrm{Re}^{1/2}.$$<span class="eq-tag">(14.3)</span></div>
<p>For a stirred cup of tea with $L = 5$ cm, $U = 5$ cm/s and $\nu = 10^{-6}$ m²/s, the Reynolds number is $\mathrm{Re} = 2500$, giving $\varepsilon \approx 2.5\times10^{-3}$ W/kg, $\eta \approx 0.14$ mm, $\tau_\eta \approx 0.02$ s and $u_\eta \approx 7$ mm/s. The ratio of largest to smallest eddy sizes is $L/\eta \approx 350 \approx 2500^{3/4}$.</p>
<div data-quiz="q1"></div>
<p>Between $L$ and $\eta$ lies the <dfn data-term="inertial-range">inertial range</dfn>, consisting of eddies much smaller than the forcing scale $L$ and much larger than the dissipation scale $\eta$. Across this range neither the geometry of the stirring nor the molecular viscosity acts directly, so the energy flux $\varepsilon$ is the only relevant parameter. By dimensional analysis, velocity differences across a distance $r$ scale as $\delta u(r) \sim (\varepsilon r)^{1/3}$, and the kinetic energy per unit wavenumber $k \sim 1/r$ follows the power law</p>
<div class="eq" id="eq-five-thirds">$$E(k) = C\,\varepsilon^{2/3}\,k^{-5/3}, \qquad \eta^{-1} \gg k \gg L^{-1},$$<span class="eq-tag">(14.4)</span></div>
<p>with Kolmogorov constant $C \approx 1.5$ from experiment. This scale-by-scale transfer—energy injected at low wavenumbers, passed without loss across the inertial range, and dissipated by viscosity near $k \sim \eta^{-1}$—is the <dfn data-term="energy-cascade">energy cascade</dfn>. Although (14.4) is universally called Kolmogorov's $-5/3$ spectrum, Kolmogorov's 1941 papers formulated the scaling in physical space via second-order structure functions; his student Alexander Obukhov derived the wavenumber spectrum in the same year, and Lars Onsager obtained it independently in 1945.</p>
<aside class="who" data-person="andrey-kolmogorov">Three short notes in the Soviet Academy's <i>Doklady</i> in 1941 set out the universal small scales, the 2/3 law for structure functions and the exact 4/5 law. Many Western readers met them through Batchelor's 1947 review. Landau's objection, that $\varepsilon$ itself fluctuates, led to Kolmogorov's 1962 refinement.</aside>
<aside class="who" data-person="alexander-obukhov">Obukhov gave the inertial-range spectrum $k^{-5/3}$ in a 1941 <i>Doklady</i> note, the Fourier-space counterpart of Kolmogorov's 2/3 law.</aside>
<p>One relation in Kolmogorov's 1941 theory is derived directly from the Kármán–Howarth equation rather than dimensional analysis. For the longitudinal velocity increment $\delta u_\parallel$ across separation $r$ in the inertial range of homogeneous isotropic turbulence,</p>
<div class="eq" id="eq-four-fifths">$$\left\langle (\delta u_\parallel)^3 \right\rangle = -\frac{4}{5}\,\varepsilon\, r.$$<span class="eq-tag">(14.5)</span></div>
<p>The negative sign reflects the forward transfer of energy toward smaller scales, which is accompanied by negatively skewed longitudinal velocity increments as fluid elements compress along the line of separation. Unlike (14.4), the 4/5 law (14.5) is an exact consequence of the Navier–Stokes equations with no empirical constant.</p>
<details class="deeper"><summary>Go deeper: Onsager and rough solutions</summary>
<p>If $\varepsilon$ remains finite as $\nu \to 0$, the limiting inviscid flow must dissipate kinetic energy without viscosity. Because any smooth solution of the Euler equations conserves energy, such a limit solution must be rough. Onsager conjectured in 1949 that the threshold is Hölder continuity with exponent $1/3$, matching the inertial-range scaling $\delta u \sim r^{1/3}$—velocity fields smoother than $1/3$ must conserve energy, whereas rougher fields can dissipate energy even at zero viscosity. Constantin, E and Titi proved the conservation side in 1994, and Isett proved the dissipative side in 2018 by constructing weak Euler solutions that fail to conserve energy for every Hölder exponent below $1/3$. Just as shock-capturing schemes in <a href="#/shocks/burgers">chapter 8</a> compute dissipative weak solutions at discontinuities, high-Reynolds-number turbulence simulations rely on dissipative behaviour at unresolved scales.</p>
</details>
<aside class="who" data-person="lars-onsager">Onsager derived the $k^{-5/3}$ spectrum independently in a 1945 abstract, and in 1949 stated the 1/3 threshold now called Onsager's conjecture, with almost no proof. His Nobel Prize (1968) was in chemistry, for other work.</aside>
<div data-quiz="q2"></div>

<h2 id="shell-model">A cascade you can watch: the shell model</h2>
<p>Resolving six decades of an inertial cascade in three dimensions would require more grid points than any existing computer can hold. A <dfn data-term="shell-model">shell model</dfn> captures the scale-to-scale transfer in a low-dimensional dynamical system by dividing wavenumber space into logarithmically spaced shells $k_n = 2^n$ (one per octave), representing all modes in shell $n$ by a single complex velocity variable $u_n$, and coupling adjacent shells through energy-conserving quadratic interactions modelled on the Navier–Stokes advection term. The Sabra model of L'vov and co-workers (1998), descended from Gledzer's 1973 model and its GOY variant, is</p>
<div class="eq" id="eq-sabra">$$\begin{aligned}\frac{\mathrm{d}u_n}{\mathrm{d}t} = {} & i\,\big(a\,k_{n+1}\,u_{n+2}\,u_{n+1}^{*} + b\,k_n\,u_{n+1}\,u_{n-1}^{*} \\ & - c\,k_{n-1}\,u_{n-1}\,u_{n-2}\big) - \nu k_n^2 u_n + f_n,\end{aligned}$$<span class="eq-tag">(14.6)</span></div>
<p>with $a = 1$, $b = c = -\tfrac12$ and external forcing $f_n$ applied only to the first shell. Because $a + b + c = 0$, the quadratic terms transfer kinetic energy $\tfrac12\sum|u_n|^2$ between shells while conserving the total in the absence of forcing and viscosity, just like the advection term in the Navier–Stokes equations. The viscous term $-\nu k_n^2 u_n$ drains energy from the highest-wavenumber shells.</p>
<p>Because a shell model collapses each octave of wavenumber space into a single complex amplitude, it omits spatial geometry and vortex structures altogether, retaining only the nonlinear energy cascade across scales. With 22 shells, (14.6) spans wavenumbers from $k_0 = 1$ to $k_{21} \approx 2\times 10^6$—more than six decades—using just 22 complex ODEs, making shell models a standard testbed for high-Reynolds-number cascade statistics.</p>
<p>The primary observables are the structure-function moments of each shell:</p>
<div class="eq" id="eq-zeta">$$\begin{gathered}S_p(k_n) = \left\langle |u_n|^p \right\rangle \sim k_n^{-\zeta_p}, \\ \text{K41: } \zeta_p = \dfrac{p}{3}.\end{gathered}$$<span class="eq-tag">(14.7)</span></div>
<p>The one-dimensional energy spectrum plotted in the figure is $E(k_n) = \langle|u_n|^2\rangle/k_n$, whose log–log slope is $-1-\zeta_2$, equal to $-5/3$ under Kolmogorov's 1941 scaling. The scale-to-scale energy flux $\Pi_n$ across shell $n$ remains constant and equal to the injection rate $\varepsilon$ across the inertial range.</p>
<figure data-widget="turbulence-shell" data-preset="k41" class="wide"><figcaption>The Sabra shell model (14.6), forced at the first shell. Left: the time-averaged spectrum $E(k_n)$ (thick), instantaneous shell values (dots), the $k^{-5/3}$ reference and the Kolmogorov wavenumber $k_\eta$; the shaded band marks the inertial range used for the power-law fits. Right: the measured scaling exponents $\zeta_p$ compared with Kolmogorov's $p/3$ and the She–Leveque formula, or the normalised spectral flux through each shell. Time averages begin at $t = 5$.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> and let the simulation reach $t \approx 40$ (a few seconds). The <b>spectral slope</b> settles near $-1.73$, slightly steeper than $-5/3$. Switch <b>Right panel</b> to <b>flux</b>: $\Pi_n/\varepsilon$ stays flat near 1 across the inertial range before dropping to zero in the viscous range.</li>
<li>Switch back to <b>exponents</b>. $\zeta_3$ sits close to 1 (1.01 in a long run), whereas $\zeta_6$ measures 1.74 to 1.80, well below the K41 value of 2 and close to the She–Leveque curve (1.78).</li>
<li>Choose the <b>Broken</b> preset (15 shells at the same viscosity). Because the highest shell now stops at a tenth of $k_\eta$ (<b>last shell / k_η</b> turns red), viscous damping at the cutoff is too weak to absorb the arriving flux, and the spectrum flattens to a slope near $-1.3$. Drag <b>Shells</b> upward one shell at a time: the inertial-range slope recovers as the cutoff passes $k_\eta$, reaching $-1.64$ at 18 shells (ratio 0.77) and $-1.71$ at 19 shells (ratio 1.5).</li>
<li>Try <b>Spectrum: compensated</b>. Multiplying $E(k_n)$ by $k_n^{5/3}/\varepsilon^{2/3}$ turns a $-5/3$ power law into a horizontal line, making the intermittency tilt immediately visible.</li>
</ol></div>
<p>The departure of $\zeta_p$ from the linear Kolmogorov scaling $p/3$ is caused by <dfn data-term="intermittency">intermittency</dfn>. While the 1941 theory replaces the energy flux with its uniform mean $\varepsilon$, the actual cascade fluctuates strongly in time, so rare intense bursts dominate high-order moments at small scales. Consequently $S_p(k_n)$ decays more slowly than $k_n^{-p/3}$ for $p > 3$ and faster for $p &lt; 3$, curving $\zeta_p$ below the $p/3$ line. The parameter-free model $\zeta_p = p/9 + 2\left(1 - (2/3)^{p/3}\right)$ of She and Leveque (1994), plotted directly alongside the simulation data, closely matches both the shell model and three-dimensional Navier–Stokes measurements, while $\zeta_3 = 1$ remains exact as the shell-model counterpart of Kolmogorov's 4/5 law (14.5).</p>
<aside class="pitfall">The broken preset is the shell-model counterpart of an under-resolved turbulence simulation. When the grid cutoff stops well short of the Kolmogorov dissipation scale, energy arriving at the highest wavenumber cannot be dissipated fast enough; it accumulates at the cutoff and backs up across the spectrum, flattening the slope across the entire inertial range rather than affecting only the highest shell. The same spectral pile-up occurs in Fourier Navier–Stokes solvers (<a href="#/turbulence/aliasing">see the aliasing section</a>).</aside>
<div data-quiz="q3"></div>
<p>Because the highest resolved shell turns over on the Kolmogorov timescale $\tau_\eta$, explicit time integration requires a step size of roughly $\tfrac14\tau_\eta$—about twelve thousand steps per large-eddy turnover time for 22 shells. The same <a href="#/stiffness/stiffness">stiffness</a> governs full three-dimensional turbulence simulations, compounded by billions of spatial grid points.</p>

<h2 id="dns-cost">Direct numerical simulation and its cost</h2>
<p>A <dfn data-term="dns">direct numerical simulation</dfn> (DNS) integrates the three-dimensional Navier–Stokes equations without any turbulence model, using a spatial grid fine enough to resolve the Kolmogorov length $\eta$ and a time step small enough to track the fastest eddies. The scale ratios in (14.3) determine how rapidly the computational work grows with Reynolds number.</p>
<p>Consider a periodic box a few integral scales across, say $4L$, with grid spacing $\Delta x = 2\eta$, typical of a spectral DNS. The number of grid points per coordinate direction is $N = 4L/(2\eta) = 2L/\eta \sim 2\,\mathrm{Re}^{3/4}$, so in three spatial dimensions</p>
<div class="eq" id="eq-dns-points">$$\begin{gathered}N^3 \sim \mathrm{Re}^{9/4}, \qquad \text{steps} \sim \dfrac{L}{\eta} \sim \mathrm{Re}^{3/4}, \\ \text{work} \sim N^3 \times \text{steps} \sim \mathrm{Re}^{3}.\end{gathered}$$<span class="eq-tag">(14.8)</span></div>
<p>The time-step count follows from the <a href="#/advection/cfl">CFL condition</a>: because the large-scale flow sweeps the smallest eddies across the grid at speed $U$, stability requires $\Delta t \sim \Delta x/U$, so integrating over a fixed number of large-eddy turnover times $L/U$ takes of order $L/\eta \sim \mathrm{Re}^{3/4}$ steps. Multiplying the spatial degrees of freedom by the number of time steps shows that the total computational work scales as $\mathrm{Re}^3$, so increasing the Reynolds number by a factor of 10 increases the required operations by a factor of 1000.</p>
<figure data-widget="turbulence-cost" class="wide"><figcaption>Estimated DNS cost for representative flows under the stated assumptions (in the note below the bars): total grid points, time steps, or wall-clock time on a selected machine, on logarithmic axes. The bottom bar represents your chosen Reynolds number. Dashed markers indicate the largest DNS grid run to date ($32768^3$), and for wall time one day, one year and the age of the universe.</figcaption></figure>
<div class="try"><ol>
<li>At $\mathrm{Re} = 10^5$ the readouts report 11,000 points per side and about 22 hours on a petaflop machine—a feasible calculation on a national supercomputer.</li>
<li>Drag <b>Your flow: Re</b> upwards until <b>grid points</b> turns red at about $\mathrm{Re} = 4\times10^5$, showing that under these assumptions the largest DNS grid run to date reaches a Reynolds number of a few hundred thousand.</li>
<li>Compare the bars in <b>wall time</b>: the stirred cup of tea takes about a second, a car on a motorway ($\mathrm{Re} = 9\times10^6$) about 1,850 years, an airliner wing over a hundred thousand years, and the atmospheric boundary layer about 750 million years.</li>
<li>Switch the <b>Machine</b> to the exaflop computer. Because the work scales as $\mathrm{Re}^3$, a thousandfold increase in computing speed increases the accessible Reynolds number by a factor of only 10.</li>
</ol></div>
<div data-quiz="q4"></div>
<p>Since 1972, when Steven Orszag and G. S. Patterson simulated homogeneous isotropic turbulence on a $32^3$ pseudo-spectral grid, steady increases in supercomputer memory and speed have gone into climbing the $\mathrm{Re}^3$ curve. In 1987 John Kim, Parviz Moin and Robert Moser simulated turbulent channel flow at $\mathrm{Re} = 3300$ (based on centreline velocity and channel half-width) on about four million grid points without any subgrid model, producing detailed velocity and vorticity statistics that matched laboratory measurements. Periodic-box DNS grids for isotropic turbulence have grown by three orders of magnitude per side since 1972:</p>
<div class="table-wrap"><table>
<caption>Some of the largest DNS grids of isotropic turbulence</caption>
<thead><tr><th>Year</th><th>Grid</th><th>Who, where</th></tr></thead>
<tbody>
<tr><td>1972</td><td>$32^3$</td><td>Orszag and Patterson, <i>Phys. Rev. Lett.</i></td></tr>
<tr><td>2002–03</td><td>$4096^3$</td><td>Yokokawa, Kaneda and co-workers, Earth Simulator</td></tr>
<tr><td>2015</td><td>$8192^3$</td><td>Yeung, Zhai and Sreenivasan, <i>PNAS</i></td></tr>
<tr><td>2016</td><td>$12288^3$</td><td>Ishihara and co-workers, <i>Phys. Rev. Fluids</i></td></tr>
<tr><td>2019</td><td>$18432^3$</td><td>Ravikumar, Appelhans and Yeung, SC19</td></tr>
<tr><td>2024–25</td><td>$32768^3$</td><td>Yeung and co-workers, <i>Comput. Phys. Commun.</i> (about 35 trillion points; scaling runs)</td></tr>
</tbody></table></div>
<aside class="who" data-person="steven-orszag">With Patterson he made spectral methods practical for turbulence: aliasing removed efficiently (1971), then the first simulation of three-dimensional isotropic turbulence (<i>Phys. Rev. Lett.</i>, January 1972).</aside>
<aside class="who" data-person="g-s-patterson">Co-author of the 1971 aliasing paper and the 1972 $32^3$ simulation with Orszag.</aside>
<aside class="who" data-person="kim-moin-moser">Their 1987 channel-flow DNS (<i>J. Fluid Mech.</i> 177) on a $192\times129\times160$ grid ran with no subgrid model and compared many statistics with experiments.</aside>
<aside class="note" data-label="Walls make it worse">Near a solid wall the dynamically active eddies scale with viscous wall units rather than the outer Kolmogorov length $\eta$. Choi and Moin (2012) estimate that the total grid count for a boundary-layer DNS scales as $\mathrm{Re}^{37/14}$, even steeper than the $\mathrm{Re}^{9/4}$ scaling of isotropic box turbulence. Studies of extreme small-scale gradients also require finer resolution ($\Delta x \lesssim \eta$) and therefore reach a lower Reynolds number on a given grid.</aside>
<p>Because of this $\mathrm{Re}^3$ scaling, DNS serves primarily as a research tool at moderate Reynolds numbers to study fundamental turbulence physics and calibrate closures, while aerodynamic and industrial flows rely on turbulence modelling. The remaining sections examine what goes wrong when a simulation is run on a grid too coarse to resolve $\eta$, and how RANS and LES model the unresolved scales.</p>

<h2 id="aliasing">Spectral methods and aliasing</h2>
<p>Most DNS codes for homogeneous isotropic turbulence use a <dfn data-term="spectral-method">spectral method</dfn>, expanding the velocity field in Fourier modes $e^{ikx}$, evaluating spatial derivatives exactly in wavenumber space via multiplication by $ik$, and computing quadratic nonlinear terms such as $u\,\partial u/\partial x$ by transforming to physical space, multiplying pointwise on the grid, and transforming back. Using the fast Fourier transform, this pseudo-spectral evaluation requires $O(N\log N)$ operations per step rather than $O(N^2)$ for a direct convolution sum, but multiplying modes on a discrete grid introduces aliasing.</p>
<p>On a uniform grid of $N$ points $x_j = 2\pi j/N$, the Fourier modes $k$ and $k - N$ take identical values at every grid point:</p>
<div class="eq" id="eq-alias">$$e^{i(k-N)x_j} = e^{ikx_j}\,e^{-2\pi i j} = e^{ikx_j}.$$<span class="eq-tag">(14.9)</span></div>
<p>Because the two modes are identical on the grid points, multiplying two resolved modes $k_1$ and $k_2$ whose sum exceeds the Nyquist wavenumber $N/2$ folds the product back onto the resolved wavenumber $k_1 + k_2 - N$. This folding of high wavenumbers into low ones is <dfn data-term="aliasing">aliasing</dfn>, analogous to wagon wheels appearing to rotate backwards on film. Aliased interactions destroy the skew-symmetry of the advection term, allowing the discrete nonlinear operator to generate spurious kinetic energy instead of merely transferring it between modes.</p>
<div data-quiz="q5"></div>
<p>Aliasing is eliminated if the active spectrum is truncated at a cutoff $|k| \le K$ chosen so that every aliased product falls outside the active band. Because a quadratic product of active modes reaches at most $2K$, its alias lands at or above $2K - N$; requiring that alias to fall below $-K$ gives</p>
<div class="eq" id="eq-two-thirds">$$2K - N &lt; -K \quad\Longleftrightarrow\quad K &lt; \frac{N}{3}.$$<span class="eq-tag">(14.10)</span></div>
<p>Retaining only the lower two thirds of the modes ($|k| &lt; N/3$) and zeroing the upper third before and after each product is the <dfn data-term="two-thirds-rule">two-thirds rule</dfn>. Removing aliased interactions by this truncation—or equivalently by zero-padding transforms to $3N/2$ points per direction before multiplying—is called <dfn data-term="dealiasing">dealiasing</dfn>. Although the two-thirds rule discards a third of the wavenumbers in each coordinate direction ($1 - (2/3)^3 \approx 70\%$ of the modes in three dimensions), it restores exact energy conservation to the discrete nonlinear term.</p>
<figure data-widget="turbulence-aliasing" class="wide"><figcaption>Viscous Burgers' equation from $u_0 = \sin x$, solved twice by the same pseudo-spectral code with the same grid, viscosity and time step: without the two-thirds rule (solid) and with it (dashed), beside the exact solution. Left: $u(x)$, which forms a steep front at $x = \pi$ at $t = 1$. Right: the energy spectra, with the two-thirds cutoff and $N/2$ marked alongside a $k^{-2}$ reference slope. The exact total energy decreases monotonically.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> on the broken preset ($N = 128$, $\nu = 0.002$). As the steep front forms at $t = 1$, <b>energy first rose</b> reports $t \approx 1.0$; since the unforced viscous Burgers' equation can only dissipate energy, any increase comes from aliasing, and the undeliased run blows up at $t \approx 1.36$. On the same grid, the dealiased run remains bounded, though it develops dispersive oscillations near the under-resolved front.</li>
<li>Drag <b>Viscosity ν</b> up. At 0.004 the aliased run still blows up, though later ($t \approx 1.9$). At 0.005 it remains bounded, even though its total energy still rises spuriously at $t \approx 1.14$ because increased viscosity damps the high-wavenumber modes enough to mask the aliasing error without eliminating the spurious energy production.</li>
<li>Choose <b>Pile-up</b> ($N = 256$, $\nu = 0.004$). Neither run blows up, but the undeliased spectrum hooks upward near $N/2$, and even with the two-thirds rule energy accumulates near the $N/3$ cutoff (compare <b>top-tenth energy share</b>).</li>
<li>Choose <b>Resolved</b> ($\nu = 0.02$). The viscous front is now wide enough for the grid to resolve, and both spectral runs match the exact Cole–Hopf solution.</li>
</ol></div>
<p>The pile-up preset illustrates what happens when a dealiased spectral grid is still too coarse to resolve the dissipation scale. At $t = 1.5$, the undeliased run holds about a thousand times the energy of a fully resolved reference at its highest wavenumber, while the dealiased run still holds fifty times too much energy at its $N/3$ cutoff. Because neither grid resolves the shock thickness set by $\nu$, energy cascading to the cutoff wavenumber cannot be dissipated fast enough and accumulates at the top of the band, just as in the 15-shell truncation of the Sabra model. Even when the two-thirds rule eliminates aliasing, the grid must still resolve the viscous length scale.</p>
<p>Aliasing instability was first diagnosed in numerical weather prediction. Norman Phillips's pioneering general-circulation integration (presented in 1955, published in 1956) terminated prematurely because, in his words, "truncation errors eventually put an end to the forecast by producing a large fictitious increase in energy." In 1959 he demonstrated with a three-wave analytical model how quadratic products of resolved waves fold onto resolved wavenumbers and grow exponentially—a mechanism he named nonlinear computational instability. Akio Arakawa resolved the problem for finite-difference weather models in 1966 by constructing a discrete Jacobian that conserves both kinetic energy and enstrophy, preventing energy from running away. Orszag's 1971 note showed that zeroing the upper third of the Fourier spectrum eliminates quadratic aliasing in pseudo-spectral solvers.</p>
<aside class="who" data-person="norman-phillips">His 1956 model ran for about a month of simulated time on the IAS computer before spurious energy growth ended it. His 1959 contribution to the Rossby Memorial Volume explained the mechanism: aliasing in the nonlinear terms.</aside>
<aside class="who" data-person="akio-arakawa">Designed a discrete advection operator for two-dimensional flow that conserves kinetic energy and enstrophy (<i>J. Comput. Phys.</i> 1, 1966), which stops the spurious pile-up of energy at the grid scale.</aside>
<aside class="pitfall">In any unforced viscous flow simulation, total kinetic energy must decrease monotonically. Monitoring total kinetic energy at every time step provides an immediate diagnostic for aliasing, non-conservative advection schemes, and time-stepping instabilities.</aside>

<h2 id="two-d">Two-dimensional turbulence and the inverse cascade</h2>
<p>In a two-dimensional turbulent flow, vortices merge into larger structures rather than breaking down into smaller ones. Because there is no third spatial direction along which vortex tubes can be stretched, the <dfn data-term="vorticity">vorticity</dfn> $\omega$ of each fluid parcel is materially conserved in the inviscid limit and altered only by viscosity. Consequently, inviscid two-dimensional flow conserves a second quadratic invariant alongside kinetic energy:</p>
<div class="eq" id="eq-2d-invariants">$$\begin{gathered}E = \tfrac12\langle|\mathbf{u}|^2\rangle = \int E(k)\,\mathrm{d}k, \\ Z = \tfrac12\langle\omega^2\rangle = \int k^2 E(k)\,\mathrm{d}k.\end{gathered}$$<span class="eq-tag">(14.11)</span></div>
<p>Both $E$ and the enstrophy $Z$ are conserved by the nonlinear advection terms. When energy concentrated near a wavenumber $k$ spreads to neighbouring wavenumbers, the $k^2$ weighting in $Z$ means that any transfer of energy to higher wavenumbers increases $Z$ unless a larger fraction of energy simultaneously moves to lower wavenumbers. Ragnar Fjørtoft derived these spectral triad constraints in 1953, showing that in two dimensions energy transfers predominantly toward large scales while enstrophy transfers toward small scales.</p>
<p>Robert Kraichnan formulated the statistical theory of this dual cascade in 1967, with Leith (1968) and Batchelor (1969) developing related results. When a two-dimensional flow is forced at an intermediate wavenumber, two distinct inertial ranges form: an <dfn data-term="inverse-cascade">inverse cascade</dfn> of energy toward small $k$ with $E(k) \propto k^{-5/3}$, and a forward cascade of enstrophy toward large $k$ with $E(k) \propto k^{-3}$. As Kraichnan wrote in his abstract, "The −5/3 range is found to entail backward energy cascade, from higher to lower wavenumbers k, together with zero-vorticity flow." This dual-cascade picture is known as Kraichnan–Leith–Batchelor theory.</p>
<aside class="who" data-person="robert-kraichnan">His 1967 <i>Physics of Fluids</i> paper predicted the dual cascade of 2-D turbulence, with energy moving to large scales and enstrophy to small scales. He had previously been one of Einstein's last assistants at the Institute for Advanced Study.</aside>
<aside class="who" data-person="ragnar-fjortoft">His 1953 <i>Tellus</i> paper analysed how simultaneous conservation of energy and enstrophy constrains interacting wavenumber triads in 2-D nondivergent flow, requiring any transfer of energy to smaller scales to be accompanied by a larger transfer to larger scales.</aside>
<figure data-widget="turbulence-2d" class="wide"><figcaption>Two-dimensional flow in a periodic box ($64\times64$ points) evolved by the pseudo-spectral vorticity solver, with a small hyperviscosity removing enstrophy at the top of the band. Left: vorticity on a colour scale fixed at the initial maximum. Right: the energy spectrum at the current time and at $t = 0$, with $k^{-3}$ and $k^{-5/3}$ reference slopes; the two-thirds cutoff is marked when dealiasing is active.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> on <b>Decaying turbulence</b>. Like-signed vortices pair up and merge, reducing the <b>mean wavenumber</b> from 6.4 to 2.8 by $t = 8$ and 1.8 by $t = 16$. Meanwhile <b>energy</b> decays slowly (retaining 0.89 of its initial value at $t = 8$) whereas <b>enstrophy</b> drops to 0.21, because enstrophy cascades to small scales where viscosity dissipates it while energy moves to large scales where viscous damping is weak.</li>
<li>Choose <b>Broken: no 2/3 rule</b>. The total energy rises (as reported on the status line) and the simulation blows up around $t = 0.9$, starting with grid-scale noise. Choose <b>Fixed</b> to see the dealiased run retain 98% of its energy at $t = 2$.</li>
<li>Choose <b>Two vortices merge</b> to watch a pair of co-rotating vortices wind around each other and coalesce into a single larger vortex, illustrating an individual step of the inverse cascade.</li>
</ol></div>
<p>Large-scale motions in the atmosphere and oceans behave nearly two-dimensionally because planetary rotation and stable density stratification suppress vertical motion, and flowing soap films provide a laboratory realisation of 2-D turbulence. The inverse cascade also explains why two-dimensional smoke simulations in graphics (<a href="#/stable-fluids/confinement">chapter 12</a>) naturally form large, persistent swirls that merge over time.</p>
<p>In numerical methods, two-dimensional turbulence provides a stringent test of discrete conservation. Because the continuous inviscid equations conserve both energy and enstrophy, a discretisation that fails to conserve them distorts the spectral transfer. Dealiased pseudo-spectral equations conserve both invariants in the inviscid limit, and Arakawa's 1966 finite-difference Jacobian was constructed specifically to preserve both invariants on a grid.</p>

<h2 id="modelling">Modelling unresolved scales: RANS and LES</h2>
<p>Because direct numerical simulation scales as $\mathrm{Re}^3$, engineering flows at high Reynolds numbers require turbulence models that represent the effects of unresolved eddies without computing them directly. Two main approaches are used: Reynolds-averaged Navier–Stokes (RANS) equations average over all turbulent fluctuations and model their entire stress contribution, whereas large-eddy simulation (LES) resolves the large, energy-carrying eddies on the grid and models only the subgrid scales. Both approaches require a <em>closure model</em> that expresses the unresolved stresses in terms of the resolved flow field.</p>
<p><b>Reynolds averaging.</b> In 1895 Osborne Reynolds decomposed the velocity into a mean and a fluctuating part, $\mathbf{u} = \overline{\mathbf{u}} + \mathbf{u}'$, and averaged the Navier–Stokes equations. While the linear terms take the same form for the mean flow, averaging the quadratic advection term introduces a covariance, $\overline{u_i u_j} = \overline{u}_i\,\overline{u}_j + \overline{u_i' u_j'}$, so the mean flow satisfies</p>
<div class="eq" id="eq-rans">$$\begin{aligned}\frac{\partial \overline{u}_i}{\partial t} + \overline{u}_j \frac{\partial \overline{u}_i}{\partial x_j} = {} & -\frac{1}{\rho}\frac{\partial \overline{p}}{\partial x_i} + \nu \nabla^2 \overline{u}_i \\ & - \frac{\partial \overline{u_i' u_j'}}{\partial x_j}.\end{aligned}$$<span class="eq-tag">(14.12)</span></div>
<p>The last term involves the unknown Reynolds stress tensor $-\rho\overline{u_i' u_j'}$. Deriving an exact transport equation for $\overline{u_i' u_j'}$ from the Navier–Stokes equations introduces unknown triple correlations $\overline{u_i' u_j' u_k'}$, whose transport equations in turn depend on fourth-order correlations. This hierarchy of unclosed moments is the <dfn data-term="closure-problem">closure problem</dfn>, and every <dfn data-term="rans">RANS</dfn> model closes the hierarchy by approximating the Reynolds stress in terms of mean-flow quantities.</p>
<p>The earliest and most widely used closure is Boussinesq's eddy-viscosity hypothesis (presented to the Académie des Sciences in 1872 and published in 1877), which models the deviatoric Reynolds stress as proportional to the mean rate-of-strain tensor,</p>
<div class="eq" id="eq-boussinesq">$$\begin{gathered}-\overline{u_i' u_j'} = \nu_T\left(\dfrac{\partial \overline{u}_i}{\partial x_j} + \dfrac{\partial \overline{u}_j}{\partial x_i}\right) - \dfrac{2}{3}k\,\delta_{ij}, \\ k = \tfrac12\overline{u_i'u_i'}.\end{gathered}$$<span class="eq-tag">(14.13)</span></div>
<p>The <dfn data-term="eddy-viscosity">eddy viscosity</dfn> $\nu_T$ is a property of the local turbulent flow state that frequently exceeds the molecular viscosity $\nu$ by two to four orders of magnitude. RANS closures differ in how they specify $\nu_T$. Prandtl's mixing-length model (1925) sets $\nu_T = \ell_m^2\,|\mathrm{d}\overline{u}/\mathrm{d}y|$ using an empirically prescribed mixing length $\ell_m$. The $k$–$\varepsilon$ model, in the standard formulation of Launder and Spalding (1974), solves two transport equations for the turbulent kinetic energy $k$ and its dissipation rate $\varepsilon$ and sets $\nu_T = C_\mu k^2/\varepsilon$ with $C_\mu = 0.09$. The Spalart–Allmaras model (1992) solves a single transport equation directly for an eddy-viscosity variable tailored to aerodynamic boundary layers. Because RANS solves only for the mean flow and its grid requirements away from walls depend only weakly on $\mathrm{Re}$, it remains the standard tool for routine industrial CFD.</p>
<aside class="who" data-person="osborne-reynolds">His averaging paper was read to the Royal Society on 24 May 1894 and published in 1895. The turbulent stress tensor in (14.12) bears his name.</aside>
<aside class="who" data-person="joseph-boussinesq">His <i>Essai sur la théorie des eaux courantes</i> related turbulent stresses to mean velocity gradients, nearly two decades before Reynolds introduced his formal averaging decomposition.</aside>
<aside class="who" data-person="g-i-taylor">His 1915 paper on eddy motion in the atmosphere introduced the English term "eddy viscosity".</aside>
<aside class="who" data-person="ludwig-prandtl">Proposed the mixing-length model in 1925, expressing the eddy viscosity as the square of a characteristic mixing length times the magnitude of the mean shear.</aside>
<aside class="who" data-person="brian-launder">With Jones (1972) and Spalding (1974), formulated the standard $k$–$\varepsilon$ model widely used in engineering CFD.</aside>
<aside class="who" data-person="brian-spalding">Co-authored the 1974 paper that established the standard coefficients and form of the $k$–$\varepsilon$ model.</aside>
<aside class="who" data-person="spalart-allmaras">Presented their one-equation eddy-viscosity model at the AIAA Aerospace Sciences Meeting in January 1992 and published the journal version in 1994.</aside>
<aside class="pitfall">The Boussinesq hypothesis assumes that the principal axes of the Reynolds stress tensor align with those of the mean strain-rate tensor. Direct measurements and DNS comparisons (surveyed by Schmitt in 2007) show that this alignment fails in flows with strong curvature, swirl, separation, or secondary corner motions, although eddy-viscosity models remain accurate in attached thin shear layers.</aside>
<p><b>Large-eddy simulation.</b> <dfn data-term="les">LES</dfn> applies a spatial filter of width $\Delta$ (comparable to the grid spacing) to the Navier–Stokes equations, directly resolving eddies larger than $\Delta$ while modelling the momentum transport of smaller eddies through a subgrid-scale stress tensor. The classic closure is Smagorinsky's eddy viscosity built from the magnitude of the resolved strain-rate tensor $\overline{S}_{ij}$:</p>
<div class="eq" id="eq-smagorinsky">$$\begin{gathered}\nu_T = (C_s\Delta)^2\,\left|\overline{S}\right|, \qquad C_s \approx 0.1\text{–}0.2, \\ \left|\overline{S}\right| = \left(2\,\overline{S}_{ij}\overline{S}_{ij}\right)^{1/2}.\end{gathered}$$<span class="eq-tag">(14.14)</span></div>
<p>Joseph Smagorinsky introduced this strain-dependent viscosity in 1963 to damp grid-scale energy accumulation in a general-circulation model of the atmosphere. James Deardorff applied the same closure in 1970 to simulate three-dimensional turbulent channel flow on 6720 grid cells, establishing large-eddy simulation for engineering flows.</p>
<aside class="who" data-person="joseph-smagorinsky">Introduced the strain-dependent subgrid eddy viscosity in his 1963 primitive-equation general-circulation model, which Lilly and Deardorff subsequently adapted into the foundation of engineering LES.</aside>
<aside class="who" data-person="james-deardorff">His 1970 three-dimensional channel-flow simulation compared computed turbulence statistics against Laufer's experimental data, demonstrating that resolving the large eddies while modelling the subgrid scales could capture channel turbulence.</aside>
<p>Pope recommends that a well-resolved LES capture at least 80% of the turbulent kinetic energy in the resolved scales. His model wavenumber spectrum—combining the Kolmogorov $\kappa^{-5/3}$ inertial range (14.4) with a low-wavenumber production roll-off $f_L(\kappa L)$ and an exponential dissipation-range decay $f_\eta(\kappa\eta)$—quantifies where the energy and dissipation reside across scales:</p>
<div class="eq" id="eq-pope">$$\begin{gathered}E(\kappa) = C\,\varepsilon^{2/3}\kappa^{-5/3}\,f_L(\kappa L)\,f_\eta(\kappa\eta), \\ f_\eta = \exp\left\{-\beta\left(\left[(\kappa\eta)^4 + c_\eta^4\right]^{1/4} - c_\eta\right)\right\}.\end{gathered}$$<span class="eq-tag">(14.15)</span></div>
<figure data-widget="turbulence-spectrum" class="wide"><figcaption>Pope's model spectrum (14.15) in units where $k = \varepsilon = 1$, plotted in premultiplied form ($\kappa E(\kappa)$ and $\kappa D(\kappa)$ against $\log\kappa$) so that equal areas represent equal fractions of total energy or dissipation. Each curve is normalised by its own peak. The shaded areas to the left of the LES cutoff show the resolved fractions of energy (solid) and dissipation (dashed), while the remainder must be supplied by the subgrid model.</figcaption></figure>
<div class="try"><ol>
<li>At $\mathrm{Re}_L = 10^5$ with the cutoff at $\kappa_c L = 10$, the LES resolves 54% of the energy and 0.03% of the dissipation.</li>
<li>Press <b>Find the 80 % cutoff</b>. It lands at $\kappa_c L \approx 34$, where the LES resolves 80% of the kinetic energy and only about 0.2% of the viscous dissipation, using a grid about $7\times10^{-8}$ times the size of a DNS grid.</li>
<li>Switch Re between $10^3$ and $10^8$ and find the 80% cutoff each time: $\kappa_c L$ increases only from 18.5 to 37.5, nearly independent of Re, whereas the DNS cutoff at $1/\eta$ grows as $\mathrm{Re}_L^{3/4}$.</li>
</ol></div>
<p>Because kinetic energy is concentrated in the large eddies while viscous dissipation is concentrated near $\eta$, an LES that resolves 80% of the energy resolves almost none of the molecular dissipation. The primary role of the subgrid-scale model is therefore to drain energy from the smallest resolved scales at the cascade rate $\varepsilon$. Away from solid boundaries, the grid required to resolve 80% of the energy is nearly independent of $\mathrm{Re}$. Near a solid wall, however, the energy-containing eddies shrink with increasing Reynolds number, and Choi and Moin (2012) estimate that wall-resolved LES requires a grid count scaling as $\mathrm{Re}^{13/7}$ unless the near-wall layer is itself modelled.</p>
<div data-quiz="q6"></div>
<p>Because the primary role of a subgrid closure is to drain energy near the grid cutoff, an upwind or Godunov-type advection scheme already provides grid-scale dissipation of that kind. Implicit LES—including the monotonically integrated LES (MILES) approach introduced by Boris and co-workers in 1992—omits any explicit subgrid stress tensor and relies on the scheme's own <dfn data-term="numerical-diffusion">numerical diffusion</dfn> to act as the subgrid sink. Whether implicit LES succeeds depends on whether the numerical dissipation matches the physical cascade rate. Inviscid Burgers' equation after shock formation provides a direct test, because its exact entropy solution dissipates energy at the shock at a rate determined solely by the jump amplitude (<a href="#/shocks/burgers">chapter 8</a>).</p>
<figure data-widget="turbulence-implicit" class="wide"><figcaption>Burgers' equation evolved from $u_0 = \sin 2\pi x$ past the breaking time $t_b = 1/(2\pi)$. Left: kinetic energy versus time for the exact entropy solution (dashed), a finite-volume scheme without explicit viscosity, and a dealiased pseudo-spectral run with explicit viscosity $\nu$. Right: velocity profiles at the current time. Press Run.</figcaption></figure>
<div class="try"><ol>
<li>Run the default: Godunov's scheme on 128 cells with no explicit viscosity term. After the shock forms, the computed energy remains within about 1% of the exact entropy solution (0.0% at $t = 0.5$, +1.0% at $t = 0.8$), because the numerical dissipation across the captured shock matches the exact Rankine–Hugoniot dissipation rate.</li>
<li>Switch the scheme to <b>Lax–Friedrichs</b>. It loses 6.1% of the energy before the shock even forms (<b>lost before t_b</b>) and remains about 8% below the exact energy afterwards (16% low on 64 cells; 4% low on 256 cells), showing how its effective dissipation varies with grid spacing.</li>
<li>Set <b>Spectral ν</b> to 0. Without viscous dissipation, the dealiased spectral run conserves energy: at $t = 0.8$ it holds more than five times the exact energy, piled up as grid-scale oscillations. At $\nu = 0.002$ it holds 29% too much energy, whereas at $\nu = 0.005$ it tracks the exact post-shock energy within about 1%.</li>
</ol></div>
<aside class="pitfall">Combining a dissipative advection scheme with an explicit subgrid eddy viscosity introduces two competing sources of dissipation. On coarse grids the numerical dissipation of the advection scheme often exceeds the explicit subgrid stress, rendering the subgrid model parameters ineffective and causing the effective viscosity to change as the grid is refined. Quantifying a scheme's numerical dissipation on a benchmark with a known energy budget and comparing results across multiple grids (<a href="#/trust">chapter 15</a>) separates numerical smoothing from the subgrid closure.</aside>
<details class="deeper"><summary>Go deeper: why RANS and LES disagree about the same flow</summary>
<p>RANS averages over all turbulent time scales or an ensemble of realisations, so its unclosed Reynolds stress tensor must represent momentum transport by eddies of every size, including the large, geometry-dependent structures. Because no single closure relation applies universally to all large-scale eddy geometries, RANS models rely on empirical coefficients calibrated against specific classes of flows. LES filters only scales smaller than $\Delta$, leaving the geometry-dependent large eddies to be resolved directly by the grid while modelling only the more nearly isotropic small scales, where simple closures such as (14.14) are effective. In return, LES requires a three-dimensional, time-accurate integration run over many flow-through times to accumulate converged statistics, increasing computational effort by orders of magnitude compared with a steady RANS calculation. Hybrid RANS–LES methods such as detached-eddy simulation (DES) use a RANS closure inside attached boundary layers and switch to LES in separated wake regions.</p>
</details>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>L. F. Richardson, <i>Weather Prediction by Numerical Process</i> (Cambridge University Press, 1922), p. 66.</li>
<li>W. Thomson (Lord Kelvin), "On the propagation of laminar motion through a turbulently moving inviscid liquid", <i>Philosophical Magazine</i> (5) 24 (October 1887) 342–353.</li>
<li>A. Colagrossi, S. Marrone, P. Colagrossi and D. Le Touzé, "Da Vinci's observation of turbulence", <i>Physics of Fluids</i> 33 (2021) 115122. I. Marusic and S. Broomhall, "Leonardo da Vinci and fluid mechanics", <i>Annual Review of Fluid Mechanics</i> 53 (2021) 1–25.</li>
<li>E. N. Lorenz, "Deterministic nonperiodic flow", <i>Journal of the Atmospheric Sciences</i> 20(2) (1963) 130–141; "The predictability of hydrodynamic flow", <i>Transactions of the New York Academy of Sciences</i> 25(4) (1963) 409–432.</li>
<li>A. N. Kolmogorov, notes in <i>Doklady Akademii Nauk SSSR</i> 30, 31 and 32 (1941); English translations in <i>Proceedings of the Royal Society A</i> 434 (1991) 9–13 and 15–17. "A refinement of previous hypotheses…", <i>Journal of Fluid Mechanics</i> 13 (1962) 82–85.</li>
<li>A. M. Obukhov, note on the spectral distribution of energy in a turbulent flow, <i>Doklady Akademii Nauk SSSR</i> 32 (1941) 22–24 (English titles of the translation vary).</li>
<li>L. Onsager, "Statistical hydrodynamics", <i>Il Nuovo Cimento</i> 6, Suppl. 2 (1949) 279–287. G. L. Eyink and K. R. Sreenivasan, "Onsager and the theory of hydrodynamic turbulence", <i>Reviews of Modern Physics</i> 78 (2006) 87–135. P. Isett, "A proof of Onsager's conjecture", <i>Annals of Mathematics</i> 188 (2018) 871–963.</li>
<li>V. S. L'vov, E. Podivilov, A. Pomyalov, I. Procaccia and D. Vandembroucq, "Improved shell model of turbulence", <i>Physical Review E</i> 58 (1998) 1811–1822. L. Biferale, "Shell models of energy cascade in turbulence", <i>Annual Review of Fluid Mechanics</i> 35 (2003) 441–468.</li>
<li>Z.-S. She and E. Leveque, "Universal scaling laws in fully developed turbulence", <i>Physical Review Letters</i> 72 (1994) 336–339.</li>
<li>S. A. Orszag and G. S. Patterson, "Numerical simulation of three-dimensional homogeneous isotropic turbulence", <i>Physical Review Letters</i> 28(2) (1972) 76–79.</li>
<li>J. Kim, P. Moin and R. Moser, "Turbulence statistics in fully developed channel flow at low Reynolds number", <i>Journal of Fluid Mechanics</i> 177 (1987) 133–166.</li>
<li>Y. Kaneda, T. Ishihara, M. Yokokawa, K. Itakura and A. Uno, "Energy dissipation rate and energy spectrum in high resolution direct numerical simulations of turbulence in a periodic box", <i>Physics of Fluids</i> 15 (2003) L21–L24. P. K. Yeung, X. M. Zhai and K. R. Sreenivasan, <i>PNAS</i> 112 (2015) 12633–12638. T. Ishihara et al., <i>Physical Review Fluids</i> 1 (2016) 082403. P. K. Yeung et al., <i>Computer Physics Communications</i> 306 (2025) 109364.</li>
<li>H. Choi and P. Moin, "Grid-point requirements for large eddy simulation: Chapman's estimates revisited", <i>Physics of Fluids</i> 24 (2012) 011702.</li>
<li>N. A. Phillips, "The general circulation of the atmosphere: a numerical experiment", <i>Quarterly Journal of the Royal Meteorological Society</i> 82 (1956) 123–164; "An example of non-linear computational instability", in <i>The Atmosphere and the Sea in Motion</i>, ed. B. Bolin (Rockefeller Institute Press, 1959) 501–504.</li>
<li>A. Arakawa, "Computational design for long-term numerical integration of the equations of fluid motion", <i>Journal of Computational Physics</i> 1 (1966) 119–143.</li>
<li>S. A. Orszag, "On the elimination of aliasing in finite-difference schemes by filtering high-wavenumber components", <i>Journal of the Atmospheric Sciences</i> 28(6) (1971) 1074. G. S. Patterson and S. A. Orszag, "Spectral calculations of isotropic turbulence: efficient removal of aliasing interactions", <i>Physics of Fluids</i> 14 (1971) 2538–2541.</li>
<li>R. Fjørtoft, "On the changes in the spectral distribution of kinetic energy for two-dimensional, nondivergent flow", <i>Tellus</i> 5 (1953) 225–230. R. H. Kraichnan, "Inertial ranges in two-dimensional turbulence", <i>Physics of Fluids</i> 10 (1967) 1417–1423.</li>
<li>O. Reynolds, "On the dynamical theory of incompressible viscous fluids and the determination of the criterion", <i>Philosophical Transactions of the Royal Society A</i> 186 (1895) 123–164.</li>
<li>J. Boussinesq, "Essai sur la théorie des eaux courantes", <i>Mémoires présentés par divers savants à l'Académie des Sciences</i> 23 (1877). F. G. Schmitt, "About Boussinesq's turbulent viscosity hypothesis", <i>Comptes Rendus Mécanique</i> 335 (2007) 617–627.</li>
<li>G. I. Taylor, "Eddy motion in the atmosphere", <i>Philosophical Transactions of the Royal Society A</i> 215 (1915) 1–26. L. Prandtl, "Bericht über Untersuchungen zur ausgebildeten Turbulenz", <i>ZAMM</i> 5 (1925) 136–139.</li>
<li>B. E. Launder and D. B. Spalding, "The numerical computation of turbulent flows", <i>Computer Methods in Applied Mechanics and Engineering</i> 3 (1974) 269–289. P. R. Spalart and S. R. Allmaras, "A one-equation turbulence model for aerodynamic flows", AIAA Paper 92-0439 (1992); <i>La Recherche Aérospatiale</i> (1994) 5–21.</li>
<li>J. Smagorinsky, "General circulation experiments with the primitive equations: I. The basic experiment", <i>Monthly Weather Review</i> 91(3) (1963) 99–164. J. W. Deardorff, "A numerical study of three-dimensional turbulent channel flow at large Reynolds numbers", <i>Journal of Fluid Mechanics</i> 41(2) (1970) 453–480.</li>
<li>J. P. Boris, F. F. Grinstein, E. S. Oran and R. L. Kolbe, "New insights into large eddy simulation", <i>Fluid Dynamics Research</i> 10 (1992) 199–228.</li>
<li>S. B. Pope, <i>Turbulent Flows</i> (Cambridge University Press, 2000), chapters 6, 9 and 13; "Ten questions concerning the large-eddy simulation of turbulent flows", <i>New Journal of Physics</i> 6 (2004) 35.</li>
<li>U. Frisch, <i>Turbulence: The Legacy of A. N. Kolmogorov</i> (Cambridge University Press, 1995). H. Tennekes and J. L. Lumley, <i>A First Course in Turbulence</i> (MIT Press, 1972).</li>
</ol>
`,
  widgets: {
    'turbulence-shell': mountShell,
    'turbulence-cost': mountCost,
    'turbulence-aliasing': mountAliasing,
    'turbulence-2d': mountTwoD,
    'turbulence-spectrum': mountSpectrum,
    'turbulence-implicit': mountImplicit,
  },
  quizzes: {
    q1: {
      type: 'num',
      q: 'A car is 4.5 m long and drives at 30 m/s through air with $\\nu = 1.5\\times10^{-5}$ m²/s. Using $\\varepsilon \\sim U^3/L$, estimate the Kolmogorov length $\\eta$, in micrometres.',
      answer: 27.4,
      tol: 3,
      explain: '$\\varepsilon = 30^3/4.5 = 6000$ W/kg, so $\\eta = (\\nu^3/\\varepsilon)^{1/4} = (3.4\\times10^{-15}/6000)^{1/4} \\approx 2.7\\times10^{-5}$ m, about 27 µm, thinner than a hair. Because the car length is $L = 4.5$ m, the scale ratio is $L/\\eta \\approx 1.6\\times10^5$, matching $\\mathrm{Re}^{3/4}$ for $\\mathrm{Re} = 9\\times10^6$. Getting about 7 mm means $\\nu$ was used where (14.2) has $\\nu^3$.',
    },
    q2: {
      type: 'mcq',
      q: 'You halve the viscosity of a turbulent flow, keeping its size $L$ and speed $U$ fixed. What happens to the dissipation rate $\\varepsilon$ and the Kolmogorov length $\\eta$?',
      choices: [
        '$\\varepsilon$ halves; $\\eta$ is unchanged',
        '$\\varepsilon$ is unchanged; $\\eta$ shrinks by a factor $2^{3/4} \\approx 1.7$',
        '$\\varepsilon$ doubles; $\\eta$ shrinks by a factor 2',
        'Both are unchanged, because the large eddies are unchanged',
      ],
      answer: 1,
      explain: 'The large eddies set the rate at which kinetic energy enters the cascade, $\\varepsilon \\sim U^3/L$, which in statistical equilibrium equals the rate at which energy leaves at the dissipation scale. Rather than changing the total dissipation rate $\\varepsilon$, lowering $\\nu$ extends the cascade to smaller scales where sharper velocity gradients compensate for the smaller viscosity, reducing $\\eta = (\\nu^3/\\varepsilon)^{1/4}$ by $2^{3/4}$.',
    },
    q3: {
      type: 'predict',
      q: 'Before you choose the broken preset: the shell model keeps the same viscosity but stops at 15 shells, so its last shell sits at about a tenth of the Kolmogorov wavenumber $k_\\eta$. What happens to the time-averaged spectrum?',
      choices: [
        'Nothing in the inertial range; only the dissipation range is cut off',
        'It gets steeper, because energy is lost at the cut',
        'Energy piles up at the top shells and the whole spectrum flattens, well above $-5/3$',
        'The model blows up at once',
      ],
      answer: 2,
      explain: 'Because kinetic energy leaves the system only through viscous damping, and viscosity is weak at $k \\ll k_\\eta$, the energy flux arriving at the 15th shell accumulates and backs up across the inertial range, flattening the log–log slope to about $-1.3$ instead of $-1.67$. Truncating the grid above the Kolmogorov scale removes the viscous sink where the cascade would normally dissipate energy, which is why an LES requires a subgrid-scale model.',
    },
    q4: {
      type: 'mcq',
      q: 'A DNS at Reynolds number Re takes a week. Roughly how long does the same flow take at ten times the Reynolds number, on the same machine?',
      choices: [
        'About 10 weeks',
        'About 180 weeks, because the grid grows as $\\mathrm{Re}^{9/4}$',
        'About 1000 weeks, around 20 years',
        'About 6 weeks, since the time step can grow',
      ],
      answer: 2,
      explain: 'The three-dimensional grid grows as $\\mathrm{Re}^{9/4}$ ($10^{9/4} \\approx 180$), and the number of time steps simultaneously grows as $\\mathrm{Re}^{3/4}$ ($\\approx 5.6$) because the finer grid spacing requires a smaller CFL time step. Multiplying the two factors gives $\\mathrm{Re}^{3}$, a thousandfold increase in total work.',
    },
    q5: {
      type: 'num',
      q: 'A pseudo-spectral code on $N = 64$ points, with no dealiasing, multiplies the modes $k = 20$ and $k = 25$. Their product has wavenumber 45, which the grid cannot hold. At what wavenumber magnitude $|k|$ does it show up?',
      answer: 19,
      tol: 0.5,
      explain: 'By (14.9) the modes $k$ and $k - N$ take identical values on the grid, so $k = 45$ folds onto $45 - 64 = -19$, a resolved mode with $|k| = 19$. Under the two-thirds rule the active spectrum retains only $|k| \\le 21$, so $k = 25$ is zeroed beforehand and every quadratic alias of active modes lands in the discarded upper third.',
    },
    q6: {
      type: 'mcq',
      q: 'An LES at $\\mathrm{Re}_L = 10^5$ resolves 80% of the turbulent kinetic energy, as Pope recommends. Roughly what share of the dissipation does it resolve?',
      choices: [
        'About 80%, the same as the energy',
        'About 50%',
        'About 0.2%',
        'Exactly zero, because an LES has no viscosity',
      ],
      answer: 2,
      explain: 'Whereas kinetic energy is concentrated in the large eddies, viscous dissipation is weighted by $\\kappa^2$ and peaks near $1/\\eta$, far above the LES filter cutoff. Integrating Pope\'s model spectrum gives 0.23% of the dissipation resolved at the 80% energy cutoff, so the subgrid-scale closure must drain nearly all of the cascading energy.',
    },
  },
  glossary: {
    turbulence: {
      term: 'turbulence',
      def: 'Irregular, chaotic, strongly mixing and dissipative flow containing eddies across a wide range of scales that widens with the Reynolds number $\\mathrm{Re} = UL/\\nu$.',
      section: 'what-is-turbulence',
    },
    'energy-cascade': {
      term: 'energy cascade',
      def: 'The scale-by-scale transfer of kinetic energy from the large eddies where it is injected, across the inertial range without viscous loss, to the Kolmogorov microscale where molecular viscosity converts it into heat.',
      section: 'cascade',
    },
    'kolmogorov-scale': {
      term: 'Kolmogorov scales',
      def: 'The dissipation microscales of turbulence determined by the energy dissipation rate $\\varepsilon$ and kinematic viscosity $\\nu$: length $\\eta = (\\nu^3/\\varepsilon)^{1/4}$, time $\\tau_\\eta = (\\nu/\\varepsilon)^{1/2}$, and velocity $u_\\eta = (\\nu\\varepsilon)^{1/4}$, with $L/\\eta \\sim \\mathrm{Re}^{3/4}$.',
      section: 'cascade',
    },
    'inertial-range': {
      term: 'inertial range',
      def: 'Intermediate scales $\\eta \\ll r \\ll L$ that are too small to depend on the large-scale forcing geometry and too large to be damped directly by viscosity, where the energy spectrum follows $E(k) = C\\varepsilon^{2/3}k^{-5/3}$.',
      section: 'cascade',
    },
    'shell-model': {
      term: 'shell model',
      def: 'A low-dimensional dynamical system with one complex velocity variable per octave of wavenumber, $k_n = 2^n$, coupled to adjacent shells by energy-conserving quadratic terms. Although it omits spatial geometry, it reproduces the $-5/3$ inertial-range spectrum and anomalous intermittency exponents across many decades of wavenumber.',
      section: 'shell-model',
    },
    intermittency: {
      term: 'intermittency',
      def: 'Spatial and temporal patchiness of small-scale velocity gradients and dissipation, which causes high-order structure-function moments to grow faster toward small scales than Kolmogorov\'s 1941 dimensional scaling predicts ($\\zeta_p < p/3$ for $p > 3$).',
      section: 'shell-model',
    },
    dns: {
      term: 'direct numerical simulation (DNS)',
      def: 'Integrating the unsteady three-dimensional Navier–Stokes equations without any turbulence model on a grid fine enough to resolve the Kolmogorov scale $\\eta$, with total computational work scaling as $\\mathrm{Re}^3$.',
      section: 'dns-cost',
    },
    aliasing: {
      term: 'aliasing',
      def: 'On a uniform grid of $N$ points, Fourier modes $k$ and $k - N$ take identical values at every node, so nonlinear products whose wavenumber exceeds $N/2$ fold back onto resolved wavenumbers and can generate spurious energy growth.',
      section: 'aliasing',
    },
    dealiasing: {
      term: 'dealiasing',
      def: 'Eliminating aliased wavenumber interactions from nonlinear products in a pseudo-spectral solver, either by zeroing the upper third of the spectrum (the two-thirds rule), padding transforms to $3N/2$ points before multiplying, or using phase-shifted evaluations.',
      section: 'aliasing',
    },
    'two-thirds-rule': {
      term: 'two-thirds rule',
      def: 'Dealiasing a quadratic product by retaining only Fourier modes with $|k| < N/3$ and zeroing the top third before and after multiplying, ensuring that every aliased interaction falls into the zeroed band (Orszag 1971).',
      section: 'aliasing',
    },
    'inverse-cascade': {
      term: 'inverse cascade',
      def: 'In two-dimensional turbulence, the net transfer of kinetic energy toward larger length scales (smaller wavenumbers $k$) with spectrum $E(k) \\propto k^{-5/3}$, constrained by the simultaneous conservation of energy and enstrophy.',
      section: 'two-d',
    },
    'closure-problem': {
      term: 'closure problem',
      def: 'Averaging or filtering the nonlinear Navier–Stokes equations introduces unknown Reynolds or subgrid stresses whose exact transport equations bring in progressively higher-order velocity correlations; a turbulence model closes the system by approximating those stresses in terms of resolved variables.',
      section: 'modelling',
    },
    rans: {
      term: 'RANS',
      def: 'Reynolds-averaged Navier–Stokes: equations for the ensemble- or time-averaged flow in which the momentum transport of all turbulent fluctuations is represented by a Reynolds-stress closure such as k–ε or Spalart–Allmaras.',
      section: 'modelling',
    },
    'eddy-viscosity': {
      term: 'eddy viscosity',
      def: 'An effective viscosity $\\nu_T$ that models turbulent Reynolds or subgrid stresses as proportional to the mean or resolved strain-rate tensor (Boussinesq\'s hypothesis). Unlike the molecular viscosity $\\nu$, $\\nu_T$ depends on the local velocity fluctuations and length scales of the flow and is often hundreds of times larger than $\\nu$.',
      section: 'modelling',
    },
    les: {
      term: 'large-eddy simulation (LES)',
      def: 'Filtering the Navier–Stokes equations at the grid scale $\\Delta$ to compute the unsteady three-dimensional motion of the large, energetic eddies directly while modelling smaller scales with a subgrid closure such as Smagorinsky\'s $\\nu_T = (C_s\\Delta)^2|\\overline{S}|$.',
      section: 'modelling',
    },
  },
  pathologies: [
    {
      id: 'aliasing-instability',
      name: 'Aliasing instability',
      family: 'stability',
      symptom: 'A pseudo-spectral or centred-difference simulation of a nonlinear flow runs smoothly at first, then its total kinetic energy begins to rise despite viscous damping, grid-scale oscillations appear, and the run blows up even when the time step is reduced.',
      cause: 'Quadratic products of resolved modes generate wavenumbers above the Nyquist limit that fold back onto resolved wavenumbers (aliasing), breaking the skew-symmetry of the discrete advection operator and feeding energy into high-wavenumber modes (Phillips 1959).',
      diagnose: 'Monitor total kinetic energy at every step, since in an unforced viscous flow it must decrease monotonically, and check for an upward hook near $N/2$ in the energy spectrum. In the figure, viscous Burgers on 128 points with $\\nu = 0.002$ first gains energy at $t \\approx 1.0$ and blows up at $t \\approx 1.37$, whereas applying the two-thirds rule keeps the run bounded.',
      mitigations: [
        'Dealias quadratic products using the two-thirds rule or $3N/2$ zero-padding.',
        'Discretise the advection term in an energy-conserving skew-symmetric form (or Arakawa\'s Jacobian in two dimensions).',
        'Increasing grid resolution or viscosity damps the high-wavenumber modes enough to prevent blow-up (as at $\\nu = 0.005$), though without dealiasing the discrete nonlinear term still generates spurious energy.',
      ],
      section: 'aliasing',
      demo: { widget: 'turbulence-aliasing', data: { preset: 'aliased' } },
    },
    {
      id: 'spectral-pileup',
      name: 'Spectral pile-up',
      family: 'resolution',
      symptom: 'The energy spectrum flattens or hooks upward near the highest resolved wavenumbers instead of decaying exponentially, accompanied in physical space by grid-scale ripples near steep gradients and an artificially shallow inertial-range slope.',
      cause: 'When the grid cutoff sits well below the Kolmogorov wavenumber, energy cascading to the highest resolved modes cannot be dissipated by viscosity and accumulates near the cutoff, even when the two-thirds rule removes aliasing.',
      diagnose: 'Plot the energy spectrum on log–log axes (or premultiplied by $k^{5/3}$) and check that $k_{\\max}\\eta \\gtrsim 1.5$. In the pile-up preset (Burgers, $N = 256$, $\\nu = 0.004$, $t = 1.5$), the top mode without dealiasing holds about 1000 times the resolved reference energy, and the dealiased run still holds 50 times too much at its $N/3$ cutoff.',
      mitigations: [
        'Refine the grid to resolve the viscous dissipation scale ($k_{\\max}\\eta \\gtrsim 1.5$ for spectral DNS), or increase $\\nu$ to match the available grid.',
        'Include an LES subgrid-scale model to drain cascading energy at the filter cutoff.',
        'Apply a high-wavenumber spectral filter or hyperviscosity to absorb energy at the top of the band, documenting the modified dissipation operator.',
      ],
      section: 'aliasing',
      demo: { widget: 'turbulence-aliasing', data: { preset: 'pileup' } },
    },
    {
      id: 'numerical-dissipation-as-model',
      name: 'Numerical dissipation acting as a model',
      family: 'resolution',
      symptom: 'An under-resolved simulation matches an experiment on one coarse grid but drifts as the mesh is refined, or changing the explicit subgrid-scale model constants has negligible effect on the computed statistics.',
      cause: 'The leading truncation error of a dissipative upwind or monotone scheme acts as an effective viscosity that scales with the grid spacing $\\Delta x$ rather than the physical viscosity or explicit subgrid closure.',
      diagnose: 'Test the solver on a benchmark with a known energy budget. For inviscid Burgers from $u_0 = \\sin 2\\pi x$, exact energy remains constant at $0.25$ until the shock forms at $t_b = 1/(2\\pi)$, yet Lax–Friedrichs on 128 cells loses 6.1% of the energy before $t_b$ and sits 8% low afterwards, whereas Godunov\'s scheme stays within about 1%.',
      mitigations: [
        'Quantify the scheme\'s numerical dissipation on a canonical test problem before adding an explicit subgrid closure.',
        'Pair explicit LES closures with low-dissipation centred or spectral schemes, or use implicit LES deliberately with a high-resolution monotone scheme.',
        'Compare turbulence statistics across at least two grid resolutions to verify that the results are controlled by the physical model rather than $\\Delta x$.',
      ],
      section: 'modelling',
      demo: { widget: 'turbulence-implicit', data: { preset: 'lf' } },
    },
  ],
  css: `
.chapter[data-chapter="turbulence"] table caption { caption-side: top; text-align: left; color: var(--muted); font-size: 0.9rem; padding-bottom: 4px; }
.chapter[data-chapter="turbulence"] .cost-note { margin: 6px 0 0; font-size: 0.82rem; color: var(--muted); line-height: 1.4; }
`,
};
