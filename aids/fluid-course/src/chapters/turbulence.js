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
  title: 'Turbulence: the scales you can\'t afford',
  short: 'Turbulence',
  blurb: 'The cascade, Kolmogorov\'s scales, why direct simulation costs Re³, and how RANS and LES cope.',
  minutes: 45,
  html: String.raw`
<p class="lead-in">Most of the flows around you are turbulent: the air past a moving car, the smoke from a chimney, the tea you have just stirred. The Navier–Stokes equations describe all of them, and nothing in this chapter needs new physics. The trouble is size. A turbulent flow holds eddies over a huge range of scales, and a simulation that follows every one of them costs roughly the cube of the Reynolds number. This chapter shows where that range comes from, what it costs to resolve, what goes wrong when you don't, and how engineers model the part they can't afford.</p>

<h2 id="what-is-turbulence">What turbulence is</h2>
<p>Pour water from a jug into a basin and watch the surface. Near the jet it boils with eddies of every size; a little further out they spin, stretch, merge and fade. No two pours look the same, yet every pour looks the same <em>kind</em> of mess. That pair of facts, irregular in detail but regular in its statistics, is the heart of the subject.</p>
<p>People have drawn this for five hundred years. Leonardo da Vinci filled notebook pages with water falling into pools and eddies shed behind obstacles, and used the Italian word <i>turbolenza</i> for the motion. The notebooks stayed unpublished for centuries, so this careful looking did not feed into the science that followed. The technical English word is younger. Kelvin used "turbulent" and "turbulence" for irregular eddying flow in 1887; four years earlier, Osborne Reynolds had called the same motion "sinuous" in his dye experiments (<a href="#/similarity/reynolds-1883">chapter 5</a>).</p>
<aside class="who" data-person="leonardo-da-vinci">His drawings of jets and wakes are the earliest detailed studies of turbulent water. Fluid dynamicists cite a note in the Codex Atlanticus as the first use of the Italian noun for a flow. Latin already had <i>turbulentus</i>, so "Leonardo coined the word" overstates it.</aside>
<aside class="who" data-person="william-thomson-kelvin">In two 1887 papers in the <i>Philosophical Magazine</i> Kelvin used "turbulent" and "turbulence" for eddying flow. The term caught on slowly: it became standard only in the early twentieth century.</aside>
<p>There is no one-line definition that everyone accepts, but a <dfn data-term="turbulence">turbulent</dfn> flow has these properties together:</p>
<ul>
<li><b>Irregular.</b> Velocity at a point fluctuates in a way that looks random, though the equations are deterministic.</li>
<li><b>Chaotic.</b> Two flows that start almost the same end up completely different. You can predict statistics, not the detail.</li>
<li><b>Mixing.</b> It spreads heat, momentum and dye far faster than molecular diffusion would.</li>
<li><b>Dissipative.</b> It turns kinetic energy into heat steadily. Stop stirring the tea and it stops within seconds.</li>
<li><b>Multiscale.</b> Eddies span a range of sizes that grows with the <dfn data-term="reynolds-number">Reynolds number</dfn>.</li>
</ul>
<p>Turbulence is a property of the flow, not of the fluid. The same water is <dfn data-term="laminar">laminar</dfn> in a thin slow pipe and <dfn data-term="turbulent">turbulent</dfn> in a fast wide one. What changes is $\mathrm{Re} = UL/\nu$, the ratio of the inertia that stirs the flow to the viscosity that smooths it.</p>
<p>The earliest picture of how the scales fit together came from a weather forecaster. In his 1922 book on numerical weather prediction, Lewis Fry Richardson wrote, in the middle of a prose paragraph, that "big whirls have little whirls that feed on their velocity, and little whirls have lesser whirls and so on to viscosity—in the molecular sense." Energy goes in at the large scales, passes down through smaller and smaller eddies, and is turned into heat only at the bottom. That is the <a href="#/turbulence/cascade">cascade</a> of the next section.</p>
<aside class="who" data-person="lewis-fry-richardson">The "big whirls" sentence is on page 66 of <i>Weather Prediction by Numerical Process</i> (1922). It is usually reset as a four-line verse with "in the molecular sense" dropped, and read as a parody of the "great fleas have little fleas" rhyme.</aside>
<p>Chaos is the second difficulty. In 1963 Edward Lorenz found that a three-variable model cut down from convection never settles and never repeats, and that a tiny change in its starting state grows until the two runs are unrelated. A turbulent simulation does the same. Two runs that differ in the last digit of one number soon become unrelated. So you never judge a turbulence simulation by its trajectory; you judge it by averages, spectra and other statistics, and ask whether those have converged.</p>
<aside class="who" data-person="edward-lorenz">Lorenz's first image for sensitivity was a sea gull: "one flap of a sea gull's wings would be enough to alter the course of the weather forever" (1963). The butterfly came later, probably from Joseph Smagorinsky in 1969, who appears later in this chapter.</aside>
<p>The third difficulty is that the small scales do not behave politely. Bursts of intense dissipation are concentrated in thin sheets and tubes that fill a small fraction of the volume. This patchiness, <a href="#/turbulence/shell-model">intermittency</a>, is why simple dimensional arguments get the averages right and the extremes wrong.</p>
<p>The rest of the chapter takes these in turn: the cascade and the scales it sets, a toy cascade you can run, the bill for resolving it, the numerical traps of spectral codes, the strange case of two dimensions, and the models used when the bill is too high.</p>

<h2 id="cascade">Richardson's cascade and Kolmogorov's scales</h2>
<p>Stir a cup of tea with a spoon. You put energy in at the scale of the spoon, $L$, with speeds about $U$. A large eddy loses its identity in roughly one turnover time, $L/U$, handing its energy to smaller eddies. So the rate at which energy enters the cascade, per unit mass, is</p>
<div class="eq" id="eq-epsilon">$$\varepsilon \sim \frac{U^2}{L/U} = \frac{U^3}{L}.$$<span class="eq-tag">(14.1)</span></div>
<p>Viscosity does not appear. In a steady state the flow must dissipate energy at the same rate it is fed, so the dissipation rate $\varepsilon$ is set by the large eddies, not by $\nu$. Lower the viscosity and the flow does not dissipate less; it makes smaller eddies until it can dissipate the same amount. Measurements bear this out: $\varepsilon L/U^3$ tends to a constant of order one as Re grows.</p>
<p>Where does the cascade stop? In 1941 Andrey Kolmogorov proposed that at high Reynolds number the smallest eddies forget how the flow was stirred. Their statistics depend only on what reaches them, $\varepsilon$, and on what kills them, $\nu$. From those two quantities there is exactly one length, one time and one speed:</p>
<div class="eq" id="eq-kolmogorov">$$\begin{gathered}\eta = \left(\dfrac{\nu^3}{\varepsilon}\right)^{1/4}, \qquad \tau_\eta = \left(\dfrac{\nu}{\varepsilon}\right)^{1/2}, \\ u_\eta = (\nu\varepsilon)^{1/4}.\end{gathered}$$<span class="eq-tag">(14.2)</span></div>
<p>These are the <dfn data-term="kolmogorov-scale">Kolmogorov scales</dfn>. Check that they are the bottom: the Reynolds number of an eddy of size $\eta$ and speed $u_\eta$ is $u_\eta\eta/\nu = 1$, so viscosity and inertia are equal there. Put (14.1) into (14.2) and the ratio of the largest to the smallest scale is</p>
<div class="eq" id="eq-scale-ratio">$$\frac{L}{\eta} \sim \mathrm{Re}^{3/4}, \qquad \frac{L/U}{\tau_\eta} \sim \mathrm{Re}^{1/2}.$$<span class="eq-tag">(14.3)</span></div>
<p>For the tea, $L = 5$ cm, $U = 5$ cm/s and $\nu = 10^{-6}$ m²/s give Re = 2500, $\varepsilon \approx 2.5\times10^{-3}$ W/kg, $\eta \approx 0.14$ mm, $\tau_\eta \approx 0.02$ s and $u_\eta \approx 7$ mm/s. The largest eddies are about 350 times the smallest, which is $2500^{3/4}$.</p>
<div data-quiz="q1"></div>
<p>Between $L$ and $\eta$ lies the <dfn data-term="inertial-range">inertial range</dfn>: eddies too small to feel the stirring and too large to feel viscosity. There only $\varepsilon$ matters, and dimensional analysis fixes everything. An eddy of size $r$ has speed $\delta u(r) \sim (\varepsilon r)^{1/3}$, and the energy spectrum, the energy per unit wavenumber $k \sim 1/r$, is</p>
<div class="eq" id="eq-five-thirds">$$E(k) = C\,\varepsilon^{2/3}\,k^{-5/3}, \qquad \eta^{-1} \gg k \gg L^{-1},$$<span class="eq-tag">(14.4)</span></div>
<p>with $C \approx 1.5$ from experiment. The whole picture, energy fed in at large scales, passed down without loss through the inertial range and dissipated at the bottom, is the <dfn data-term="energy-cascade">energy cascade</dfn>. The famous $-5/3$ is usually called Kolmogorov's spectrum, but his 1941 notes work with velocity differences in space; his student Alexander Obukhov wrote the spectral form the same year, and Lars Onsager reached it independently in 1945.</p>
<aside class="who" data-person="andrey-kolmogorov">Three short notes in the Soviet Academy's <i>Doklady</i> in 1941 set out the universal small scales, the 2/3 law for structure functions and the exact 4/5 law. Many Western readers met them through Batchelor's 1947 review. Landau's objection, that $\varepsilon$ itself fluctuates, led to Kolmogorov's 1962 refinement.</aside>
<aside class="who" data-person="alexander-obukhov">Obukhov gave the inertial-range spectrum $k^{-5/3}$ in a 1941 <i>Doklady</i> note, the Fourier-space counterpart of Kolmogorov's 2/3 law.</aside>
<p>One result in this theory is exact rather than dimensional. For the velocity difference $\delta u_\parallel$ along a separation $r$ in the inertial range of homogeneous isotropic turbulence, Kolmogorov derived from the Navier–Stokes equations</p>
<div class="eq" id="eq-four-fifths">$$\left\langle (\delta u_\parallel)^3 \right\rangle = -\frac{4}{5}\,\varepsilon\, r.$$<span class="eq-tag">(14.5)</span></div>
<p>The minus sign says the flux goes downscale: on average, fluid approaching itself faster than it separates is how large eddies feed small ones. It is the one law in the subject with no fitted constant.</p>
<details class="deeper"><summary>Go deeper: Onsager and rough solutions</summary>
<p>If $\varepsilon$ stays finite as $\nu \to 0$, the limit flow must dissipate energy without viscosity. A smooth solution of the Euler equations conserves energy exactly, so the limit cannot be smooth. Onsager asserted in 1949 that the dividing line is Hölder continuity with exponent 1/3, the roughness of $\delta u \sim r^{1/3}$: velocity fields smoother than that conserve energy, rougher ones can fail to. Constantin, E and Titi proved the conserving half in 1994; Isett proved the other half in 2018 by building weak Euler solutions that do not conserve energy for every exponent below 1/3. Shock-capturing schemes in <a href="#/shocks/burgers">chapter 8</a> already had to live with non-smooth weak solutions; turbulence asks the same of every high-Re simulation.</p>
</details>
<aside class="who" data-person="lars-onsager">Onsager derived the $k^{-5/3}$ spectrum independently in a 1945 abstract, and in 1949 stated the 1/3 threshold now called Onsager's conjecture, with almost no proof. His Nobel Prize (1968) was in chemistry, for other work.</aside>
<div data-quiz="q2"></div>

<h2 id="shell-model">A cascade you can watch: the shell model</h2>
<p>To see a cascade you would normally need a three-dimensional simulation with billions of points. A <dfn data-term="shell-model">shell model</dfn> keeps only the skeleton. Split wavenumber space into shells $k_n = 2^n$, one per octave, and give each shell a single complex number $u_n$ for the velocity at that scale. Then couple each shell only to its nearest neighbours, with quadratic terms like those of Navier–Stokes. The Sabra model of L'vov and co-workers (1998), descended from Gledzer's 1973 model and its GOY variant, is</p>
<div class="eq" id="eq-sabra">$$\begin{aligned}\frac{\mathrm{d}u_n}{\mathrm{d}t} = {} & i\,\big(a\,k_{n+1}\,u_{n+2}\,u_{n+1}^{*} + b\,k_n\,u_{n+1}\,u_{n-1}^{*} \\ & - c\,k_{n-1}\,u_{n-1}\,u_{n-2}\big) - \nu k_n^2 u_n + f_n,\end{aligned}$$<span class="eq-tag">(14.6)</span></div>
<p>with $a = 1$, $b = c = -\tfrac12$ and the forcing $f_n$ acting on the first shell only. Because $a + b + c = 0$, the nonlinear terms move energy $\tfrac12\sum|u_n|^2$ between shells without creating or destroying it, just as the advection term does in the real equations. Viscosity drains the top shells, where $k_n^2$ is large.</p>
<p>Be clear about what this is. It is a toy, not Navier–Stokes: there is no space, no geometry, no vortex, only one number per octave. What it keeps is the cascade itself. With 22 shells it spans wavenumbers from 1 to about two million, more than six decades, for 22 complex numbers. A real simulation over the same range would need more points than any computer holds. That is why shell models are the standard laboratory for cascade statistics.</p>
<p>The quantities to measure are the moments of each shell, the shell model's version of structure functions:</p>
<div class="eq" id="eq-zeta">$$\begin{gathered}S_p(k_n) = \left\langle |u_n|^p \right\rangle \sim k_n^{-\zeta_p}, \\ \text{K41: } \zeta_p = \dfrac{p}{3}.\end{gathered}$$<span class="eq-tag">(14.7)</span></div>
<p>The averaged spectrum in the figure is $E(k_n) = \langle|u_n|^2\rangle/k_n$, so its slope is $-1-\zeta_2$, which is $-5/3$ if Kolmogorov is right. The flux $\Pi_n$, the rate at which energy crosses shell $n$ on its way down, should equal the injection rate $\varepsilon$ throughout the inertial range.</p>
<figure data-widget="turbulence-shell" data-preset="k41" class="wide"><figcaption>The Sabra shell model (14.6), forced at the first shell. Left: the time-averaged spectrum $E(k_n)$ (thick), this instant's values (dots), the $k^{-5/3}$ reference and the Kolmogorov wavenumber $k_\eta$; the shaded band is the inertial range used for the fits. Right: the measured exponents $\zeta_p$ against Kolmogorov's $p/3$ and the She–Leveque formula, or the flux through each shell. Averages start at $t = 5$.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> and let it reach $t \approx 40$, a few seconds. <b>spectral slope</b> settles near $-1.73$, a little steeper than $-5/3$. Switch <b>Right panel</b> to <b>flux</b>: $\Pi_n/\varepsilon$ is flat and close to 1 across the inertial range. Energy goes in at the top and comes out at the bottom.</li>
<li>Switch back to <b>exponents</b>. $\zeta_3$ sits close to 1 (1.01 in a long run), but $\zeta_6$ comes out near 1.74 to 1.80, well below Kolmogorov's 2 and close to the She–Leveque curve (1.78).</li>
<li>Choose the <b>Broken</b> preset: 15 shells at the same viscosity. The last shell now stops at a tenth of $k_\eta$ (<b>last shell / k_η</b> turns red), energy has nowhere to go, and the slope flattens to about $-1.3$. Drag <b>Shells</b> up one at a time. The slope recovers as the ratio passes 1: $-1.64$ at 18 shells (ratio 0.77), $-1.71$ at 19 (ratio 1.5).</li>
<li>Try <b>Spectrum: compensated</b>. Multiplying by $k^{5/3}/\varepsilon^{2/3}$ turns the $-5/3$ law into a flat line and makes any tilt easy to see.</li>
</ol></div>
<p>The gap between $\zeta_p$ and $p/3$ is <dfn data-term="intermittency">intermittency</dfn>. Kolmogorov's 1941 theory treats $\varepsilon$ as the same everywhere; in fact the cascade is bursty, and at small scales rare violent events carry a growing share of the high moments. Each moment then grows faster towards small scales than K41 predicts for $p > 3$ and slower for $p &lt; 3$, and $\zeta_p$ bends below the straight line. She and Leveque (1994) proposed the closed form $\zeta_p = p/9 + 2\left(1 - (2/3)^{p/3}\right)$, which matches measured Navier–Stokes exponents well; it is drawn beside your measurements, not fitted to them. $\zeta_3 = 1$ survives intermittency, the shell-model echo of the exact 4/5 law (14.5).</p>
<aside class="pitfall">The broken preset is the shell-model version of an under-resolved simulation. If the grid stops before the dissipation scale, the energy arriving at the top has nowhere to go. It piles up there and backs up the cascade, so the whole inertial range is wrong, not just the last shell. The same pile-up appears in spectral solvers; see <a href="#/turbulence/aliasing">the aliasing section</a>.</aside>
<div data-quiz="q3"></div>
<p>Even this toy pays the price of the range of scales. The top shell turns over in about $\tau_\eta$, so the time step must be a fraction of $\tau_\eta$: here about a quarter. With 22 shells that means about twelve thousand steps per unit of large-eddy time. The same <a href="#/stiffness/stiffness">stiffness</a> appears in a full simulation, multiplied by billions of points.</p>

<h2 id="dns-cost">Direct numerical simulation and its cost</h2>
<p>A <dfn data-term="dns">direct numerical simulation</dfn>, DNS, solves the Navier–Stokes equations with no turbulence model at all: the grid resolves every eddy down to $\eta$ and the time step follows the fastest of them. It is the most faithful kind of simulation, and the costliest. The scales of (14.3) tell you how costly.</p>
<p>Take a box a few large-eddy sizes across, say $4L$, with a spacing of $\Delta x = 2\eta$, about what a spectral code needs. The number of points per side is $N = 4L/(2\eta) = 2L/\eta \sim 2\,\mathrm{Re}^{3/4}$, and in three dimensions</p>
<div class="eq" id="eq-dns-points">$$\begin{gathered}N^3 \sim \mathrm{Re}^{9/4}, \qquad \text{steps} \sim \dfrac{L}{\eta} \sim \mathrm{Re}^{3/4}, \\ \text{work} \sim N^3 \times \text{steps} \sim \mathrm{Re}^{3}.\end{gathered}$$<span class="eq-tag">(14.8)</span></div>
<p>The steps follow from the <a href="#/advection/cfl">CFL condition</a>: the large eddies carry the small ones past the grid at speed $U$, so $\Delta t \sim \Delta x/U$, and covering a fixed number of large-eddy times $L/U$ takes about $L/\eta$ steps. Multiply out and the work grows as the cube of the Reynolds number. Ten times the Reynolds number costs a thousand times the computing.</p>
<figure data-widget="turbulence-cost" class="wide"><figcaption>What a DNS of each flow would cost under the stated assumptions (in the note under the bars): grid points, time steps, or wall time on a chosen machine, on log scales. The last bar is your flow, at the Reynolds number you set. Dashed markers: the largest DNS grid run so far ($32768^3$), and for wall time a day, a year and the age of the universe.</figcaption></figure>
<div class="try"><ol>
<li>At Re = $10^5$ the readouts give 11,000 points per side and about 22 hours on a petaflop machine. Feasible, for a research group.</li>
<li>Drag <b>Your flow: Re</b> upwards until <b>grid points</b> turns red. That happens at about Re = $4\times10^5$: under these assumptions, the largest grid ever run buys a Reynolds number of a few hundred thousand.</li>
<li>Read the bars in <b>wall time</b>. The stirred tea takes about a second. The car on a motorway (Re = $9\times10^6$) takes about 1,850 years; the airliner wing over a hundred thousand years; the atmospheric boundary layer about 750 million years.</li>
<li>Switch the <b>Machine</b> to the exaflop computer. A thousandfold faster machine buys a factor of only 10 in Re, because of the cube.</li>
</ol></div>
<div data-quiz="q4"></div>
<p>The history of DNS is a history of that cube. In 1972 Steven Orszag and G. S. Patterson simulated homogeneous isotropic turbulence on a $32^3$ pseudo-spectral grid: turbulence at laboratory Reynolds numbers, computed rather than measured. In 1987 John Kim, Parviz Moin and Robert Moser computed turbulent flow in a channel at Re = 3300 (centreline velocity and half-width) on about four million points, with no model of any kind, and compared many of its statistics with experiments. Grids for isotropic turbulence have grown ever since:</p>
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
<aside class="note" data-label="Walls make it worse">Near a wall the important eddies shrink with the wall units, not with $\eta$. Choi and Moin (2012) estimate grid points growing like $\mathrm{Re}^{37/14}$ for DNS of a boundary layer, faster than $\mathrm{Re}^{9/4}$. Real runs also choose $\Delta x/\eta$ differently from the figure: studies of the smallest scales resolve $\eta$ more finely and so reach a lower Re on the same grid.</aside>
<p>So DNS is a research instrument, run at the highest Reynolds number a machine allows, to test theories and to calibrate models. It is not how anyone designs a car. The rest of the chapter looks at what goes wrong when you try to cut corners, and what engineers do instead.</p>

<h2 id="aliasing">Spectral methods and aliasing</h2>
<p>Most DNS of isotropic turbulence uses a <dfn data-term="spectral-method">spectral method</dfn>: write the velocity as a sum of Fourier modes $e^{ikx}$, take derivatives exactly by multiplying by $ik$, and form the nonlinear term $u\,\partial u/\partial x$ by going back to the grid, multiplying point by point, and transforming forward again. This "pseudo-spectral" trick costs $O(N\log N)$ per step instead of $O(N^2)$. It has one trap.</p>
<p>On a grid of $N$ points $x_j = 2\pi j/N$, the modes $k$ and $k - N$ take the same values at every grid point:</p>
<div class="eq" id="eq-alias">$$e^{i(k-N)x_j} = e^{ikx_j}\,e^{-2\pi i j} = e^{ikx_j}.$$<span class="eq-tag">(14.9)</span></div>
<p>The grid cannot tell them apart. Multiplying two resolved modes $k_1$ and $k_2$ makes a mode $k_1 + k_2$, which may be too high for the grid to hold. It does not vanish; it reappears as $k_1 + k_2 - N$, a low wavenumber that the true equation never fed. This is <dfn data-term="aliasing">aliasing</dfn>, the same effect that makes wagon wheels turn backwards on film. The aliased terms break the property that kept energy in check: the discrete nonlinear term no longer just moves energy between modes, it can create it.</p>
<div data-quiz="q5"></div>
<p>The cure is to make room. Keep only modes with $|k| \le K$. A product then reaches at most $2K$, and its alias lands at $2K - N$ or above. If that is below $-K$, every alias falls in the discarded band, and setting those modes to zero after each product removes it:</p>
<div class="eq" id="eq-two-thirds">$$2K - N &lt; -K \quad\Longleftrightarrow\quad K &lt; \frac{N}{3}.$$<span class="eq-tag">(14.10)</span></div>
<p>Keep the lower two thirds of the band, $|k| &lt; N/3$, and zero the top third. This is the <dfn data-term="two-thirds-rule">two-thirds rule</dfn>, and applying it, or any equivalent such as padding to $3N/2$ points before multiplying, is called <dfn data-term="dealiasing">dealiasing</dfn>. You pay a third of your wavenumbers in each direction, $1 - (2/3)^3 \approx 70\%$ of the modes in three dimensions, for a scheme whose nonlinear term conserves energy exactly, as the real one does.</p>
<figure data-widget="turbulence-aliasing" class="wide"><figcaption>Viscous Burgers' equation from $u_0 = \sin x$, solved twice by the same pseudo-spectral code with the same grid, viscosity and time step: without the two-thirds rule (solid) and with it (dashed), beside the exact solution. Left: $u(x)$; a front forms at $x = \pi$ at $t = 1$. Right: the energy spectra, with the two-thirds cutoff and $N/2$ marked and a $k^{-2}$ guide, the spectrum of a jump. The exact energy can only fall.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> on the broken preset ($N = 128$, $\nu = 0.002$). The front forms at $t = 1$. Just after, <b>energy first rose</b> reports $t \approx 1.0$: viscous Burgers can only lose energy, so that rise is aliasing. The run without the rule blows up at $t \approx 1.36$. The run with the rule, on the same grid, stays bounded, though it wiggles near the front; that is the second failure, below.</li>
<li>Drag <b>Viscosity ν</b> up. At 0.004 the aliased run still blows up, later ($t \approx 1.9$). At 0.005 it survives, though its energy still rose at $t \approx 1.14$. Enough viscosity hides aliasing; it does not remove it.</li>
<li>Choose <b>Pile-up</b> ($N = 256$, $\nu = 0.004$). Neither run blows up, but the spectrum without the rule turns upward near $N/2$. With the rule, energy still collects at the cutoff, though less (compare <b>top-tenth energy share</b>).</li>
<li>Choose <b>Resolved</b> ($\nu = 0.02$). The front is wide enough for the grid, and the two runs and the exact solution agree.</li>
</ol></div>
<p>The third step shows a second failure that dealiasing does not fix. In the pile-up preset at $t = 1.5$, the run without the rule holds about a thousand times the energy of a fully resolved reference at its top wavenumber; the dealiased run still holds fifty times too much at its own cutoff. Both grids are too coarse for a front of that width. Nothing in either removes energy as it arrives at the top, so it backs up, exactly as in the truncated shell model. The two-thirds rule removes aliasing. It does not remove under-resolution.</p>
<p>The history runs through weather forecasting. Norman Phillips's general-circulation experiment (presented in 1955, published in 1956) ended because, in his words, "truncation errors eventually put an end to the forecast by producing a large fictitious increase in energy." In 1959 he showed with a simple example how short waves produced by products alias onto resolved waves and grow without bound: nonlinear instability. Akio Arakawa's answer (1966) was a finite-difference Jacobian built to conserve discrete energy and mean-square vorticity, so the energy could not run away. Orszag's 1971 note showed that discarding the top third of the wavenumbers removes the aliases in quadratic terms; the name "two-thirds rule" came later.</p>
<aside class="who" data-person="norman-phillips">His 1956 model ran for about a month of simulated time on the IAS computer before spurious energy growth ended it. His 1959 contribution to the Rossby Memorial Volume explained the mechanism: aliasing in the nonlinear terms.</aside>
<aside class="who" data-person="akio-arakawa">Designed a discrete advection operator for two-dimensional flow that conserves kinetic energy and enstrophy (<i>J. Comput. Phys.</i> 1, 1966), which stops the spurious pile-up of energy at the grid scale.</aside>
<aside class="pitfall">If a viscous simulation's total energy ever rises without forcing, something is wrong. Print the energy every step; it is the cheapest diagnostic there is. Aliasing, a non-conservative discretisation of the advection term, and an unstable time step all show up there first.</aside>

<h2 id="two-d">Two-dimensional turbulence runs backwards</h2>
<p>Run a turbulence simulation in two dimensions and the eddies grow instead of shrinking. That is not a bug. In 2-D a vortex cannot be stretched, because there is no third direction to stretch it in, and without stretching the <dfn data-term="vorticity">vorticity</dfn> $\omega$ of each fluid parcel is simply carried along, changed only by viscosity. So 2-D flow has a second invariant besides the energy:</p>
<div class="eq" id="eq-2d-invariants">$$\begin{gathered}E = \tfrac12\langle|\mathbf{u}|^2\rangle = \int E(k)\,\mathrm{d}k, \\ Z = \tfrac12\langle\omega^2\rangle = \int k^2 E(k)\,\mathrm{d}k.\end{gathered}$$<span class="eq-tag">(14.11)</span></div>
<p>Both are conserved by the nonlinear terms. Now suppose energy in a band around $k$ spreads out to neighbouring wavenumbers. Because the enstrophy weights each mode by $k^2$, energy moving to higher $k$ raises $Z$, so to keep $Z$ fixed more energy must move to lower $k$ at the same time. Ragnar Fjørtoft worked out these constraints on triads of interacting waves in 1953. The upshot is that in 2-D, energy tends to move to large scales and enstrophy to small ones.</p>
<p>Robert Kraichnan turned this into a theory in 1967, with Leith (1968) and Batchelor (1969) reaching related results. Force a 2-D flow at a middle wavenumber and you get two inertial ranges: an <dfn data-term="inverse-cascade">inverse cascade</dfn> of energy towards small $k$ with $E(k) \propto k^{-5/3}$, and a forward cascade of enstrophy towards large $k$ with $E(k) \propto k^{-3}$. In Kraichnan's abstract: "The −5/3 range is found to entail backward energy cascade, from higher to lower wavenumbers k, together with zero-vorticity flow." The usual name is Kraichnan–Leith–Batchelor theory.</p>
<aside class="who" data-person="robert-kraichnan">His 1967 <i>Physics of Fluids</i> paper predicted the dual cascade of 2-D turbulence: energy to large scales, enstrophy to small. He had been one of Einstein's last assistants at the Institute for Advanced Study.</aside>
<aside class="who" data-person="ragnar-fjortoft">His 1953 <i>Tellus</i> paper analysed how energy moves between interacting wavenumber triads in 2-D nondivergent flow. He showed that it obeys different rules from 3-D. He did not forbid all transfer of energy to small scales, as is sometimes said.</aside>
<figure data-widget="turbulence-2d" class="wide"><figcaption>Two-dimensional flow in a periodic box, $64\times64$ points, by the pseudo-spectral vorticity solver. A small hyperviscosity removes enstrophy at the top of the band. Left: vorticity, on a colour scale fixed at the initial maximum. Right: the energy spectrum now and at $t = 0$, with $k^{-3}$ and $k^{-5/3}$ guides; the two-thirds cutoff is marked when the rule is on.</figcaption></figure>
<div class="try"><ol>
<li>Press <b>Run</b> on <b>Decaying turbulence</b>. Same-signed vortices find each other and merge. <b>mean wavenumber</b> falls from 6.4 to 2.8 by $t = 8$ and 1.8 by $t = 16$. Meanwhile <b>energy</b> falls only slowly (0.89 of its start at $t = 8$) while <b>enstrophy</b> falls to 0.21: the enstrophy goes to small scales and is dissipated there, the energy goes to large scales and is not.</li>
<li>Choose <b>Broken: no 2/3 rule</b>. The energy rises (the status line says so) and the run blows up at about $t = 0.9$, grid-scale noise first. Choose <b>Fixed</b>: the same flow with the rule keeps 98% of its energy at $t = 2$.</li>
<li>Choose <b>Two vortices merge</b> and watch a pair of co-rotating vortices wrap round each other into one: the inverse cascade, one event at a time.</li>
</ol></div>
<p>This is more than a curiosity. Large-scale motions in the atmosphere and oceans are nearly two-dimensional, because rotation and stable stratification suppress vertical motion,. Soap films give laboratory 2-D turbulence. It also explains why 2-D smoke simulations for games and films (<a href="#/stable-fluids/confinement">chapter 12</a>) look as they do: big swirls that merge and persist.</p>
<p>For numerics, 2-D is a severe test. The real flow conserves energy and enstrophy; a scheme that conserves only one, or neither, sends energy the wrong way. With the two-thirds rule the truncated spectral equations conserve both exactly in the absence of viscosity. Arakawa's Jacobian does the same for finite differences, and that is why he built it.</p>

<h2 id="modelling">When you can't resolve it, model it</h2>
<p>If DNS costs $\mathrm{Re}^3$, an engineer simulating a car needs a way to compute without resolving every eddy. There are two families. RANS averages the turbulence away and models all of it. LES resolves the large eddies and models only the small ones. Both need a <em>model</em>: an assumption about the part you don't compute, expressed in terms of the part you do.</p>
<p><b>Reynolds averaging.</b> In 1895 Osborne Reynolds split the velocity into a mean and a fluctuation, $\mathbf{u} = \overline{\mathbf{u}} + \mathbf{u}'$, and averaged the Navier–Stokes equations. Everything linear averages cleanly. The advection term does not: $\overline{u_i u_j} = \overline{u}_i\,\overline{u}_j + \overline{u_i' u_j'}$, so the mean flow obeys</p>
<div class="eq" id="eq-rans">$$\begin{aligned}\frac{\partial \overline{u}_i}{\partial t} + \overline{u}_j \frac{\partial \overline{u}_i}{\partial x_j} = {} & -\frac{1}{\rho}\frac{\partial \overline{p}}{\partial x_i} + \nu \nabla^2 \overline{u}_i \\ & - \frac{\partial \overline{u_i' u_j'}}{\partial x_j}.\end{aligned}$$<span class="eq-tag">(14.12)</span></div>
<p>The last term, the Reynolds stress, is new and unknown. Write an equation for it and you get triple products; write one for those and you get quadruple products. This endless chain is the <dfn data-term="closure-problem">closure problem</dfn>, and every <dfn data-term="rans">RANS</dfn> model is a way to cut it off.</p>
<p>The oldest cut is Boussinesq's, presented to the Académie in 1872 and printed in 1877: treat the fluctuations as an extra viscosity acting on the mean flow,</p>
<div class="eq" id="eq-boussinesq">$$\begin{gathered}-\overline{u_i' u_j'} = \nu_T\left(\dfrac{\partial \overline{u}_i}{\partial x_j} + \dfrac{\partial \overline{u}_j}{\partial x_i}\right) - \dfrac{2}{3}k\,\delta_{ij}, \\ k = \tfrac12\overline{u_i'u_i'}.\end{gathered}$$<span class="eq-tag">(14.13)</span></div>
<p>The <dfn data-term="eddy-viscosity">eddy viscosity</dfn> $\nu_T$ belongs to the flow, not to the fluid, and is typically hundreds or thousands of times $\nu$. What remains is to choose $\nu_T$. Prandtl's mixing length (1925) sets $\nu_T = \ell_m^2\,|\mathrm{d}\overline{u}/\mathrm{d}y|$ with a length $\ell_m$ chosen for each flow. The k–ε model, in the standard form of Launder and Spalding (1974), carries transport equations for $k$ and $\varepsilon$ and sets $\nu_T = C_\mu k^2/\varepsilon$ with $C_\mu = 0.09$. The Spalart–Allmaras model (1992) carries one equation for an eddy-viscosity variable, designed for aerodynamic flows. RANS gives you the mean flow, not the eddies, and its cost hardly depends on Re away from walls, which is why it carries most industrial CFD.</p>
<aside class="who" data-person="osborne-reynolds">His averaging paper was read to the Royal Society on 24 May 1894 and published in 1895. The extra stresses in (14.12) carry his name.</aside>
<aside class="who" data-person="joseph-boussinesq">His <i>Essai sur la théorie des eaux courantes</i> tied turbulent stresses to mean velocity gradients, about twenty years before Reynolds's averaging.</aside>
<aside class="who" data-person="g-i-taylor">His 1915 paper on eddy motion in the atmosphere is credited with the first use of the term "eddy viscosity".</aside>
<aside class="who" data-person="ludwig-prandtl">Proposed the mixing-length model in 1925: an eddy viscosity equal to a mixing length squared times the mean shear.</aside>
<aside class="who" data-person="brian-launder">With Jones (1972) and then Spalding (1974), set out the k–ε model, a workhorse of engineering CFD.</aside>
<aside class="who" data-person="brian-spalding">Co-author of the 1974 survey that is the standard citation for k–ε.</aside>
<aside class="who" data-person="spalart-allmaras">Their one-equation model was presented at the AIAA Aerospace Sciences Meeting in January 1992; the 1994 journal version differs in some constants.</aside>
<aside class="pitfall">The Boussinesq hypothesis assumes the Reynolds stress lines up with the mean strain rate. Schmitt (2007) found that in measured flows it rarely does. Eddy-viscosity models still do well in attached boundary layers, and badly with strong swirl, separation or corner flows.</aside>
<p><b>Large-eddy simulation.</b> <dfn data-term="les">LES</dfn> filters the equations at a width $\Delta$ a few grid cells wide, computes everything larger and models the effect of the rest with a subgrid stress. The classic model is an eddy viscosity built from the resolved strain rate $\overline{S}_{ij}$:</p>
<div class="eq" id="eq-smagorinsky">$$\begin{gathered}\nu_T = (C_s\Delta)^2\,\left|\overline{S}\right|, \qquad C_s \approx 0.1\text{–}0.2, \\ \left|\overline{S}\right| = \left(2\,\overline{S}_{ij}\overline{S}_{ij}\right)^{1/2}.\end{gathered}$$<span class="eq-tag">(14.14)</span></div>
<p>Joseph Smagorinsky used this deformation-dependent viscosity in 1963 to keep an atmospheric circulation model stable. James Deardorff used eddy coefficients of the same kind in 1970 to compute turbulent channel flow on 6720 grid intervals, and is usually credited with the first LES. Both labels are given in hindsight.</p>
<aside class="who" data-person="joseph-smagorinsky">His 1963 viscosity was built for a general-circulation model. Its use in engineering LES came later, through Lilly and Deardorff.</aside>
<aside class="who" data-person="james-deardorff">His 1970 channel-flow computation compared its statistics with Laufer's measurements; in his words, the agreement "ranges from good to marginal".</aside>
<p>How much should an LES resolve? Pope suggests resolving at least 80% of the turbulent kinetic energy. His model spectrum, the $-5/3$ law (14.4) with a rise at large scales and an exponential fall at small ones, shows what that implies:</p>
<div class="eq" id="eq-pope">$$\begin{gathered}E(\kappa) = C\,\varepsilon^{2/3}\kappa^{-5/3}\,f_L(\kappa L)\,f_\eta(\kappa\eta), \\ f_\eta = \exp\left\{-\beta\left(\left[(\kappa\eta)^4 + c_\eta^4\right]^{1/4} - c_\eta\right)\right\}.\end{gathered}$$<span class="eq-tag">(14.15)</span></div>
<figure data-widget="turbulence-spectrum" class="wide"><figcaption>Pope's model spectrum (14.15) in units where $k = \varepsilon = 1$, drawn premultiplied, $\kappa E(\kappa)$ and $\kappa D(\kappa)$ against $\log\kappa$, so that area means share. Each curve is scaled to its own peak. The shaded areas left of the LES cutoff are what the LES resolves: energy (solid) and dissipation (dashed). The rest is the subgrid model's job.</figcaption></figure>
<div class="try"><ol>
<li>At $\mathrm{Re}_L = 10^5$ with the cutoff at $\kappa_c L = 10$, the LES holds 54% of the energy and 0.03% of the dissipation.</li>
<li>Press <b>Find the 80 % cutoff</b>. It lands at $\kappa_c L \approx 34$, where the LES still resolves only about 0.2% of the dissipation, on a grid about $7\times10^{-8}$ the size of a DNS grid.</li>
<li>Switch Re between $10^3$ and $10^8$ and find the 80% cutoff each time: $\kappa_c L$ goes from 18.5 to 37.5, almost independent of Re. The DNS cutoff, at $1/\eta$, runs away with Re.</li>
</ol></div>
<p>The energy lives in the large eddies; the dissipation lives in the small ones. So an LES that resolves most of the energy resolves almost none of the dissipation, and its subgrid model has one main job: drain energy from the smallest resolved scales at the rate $\varepsilon$ the cascade delivers. This is also why the cost of LES of free turbulence barely grows with Re. Walls spoil this: near a wall the energetic eddies shrink with Re, and Choi and Moin estimate grid points growing like $\mathrm{Re}^{13/7}$ for wall-resolved LES, unless the wall layer itself is modelled.</p>
<div data-quiz="q6"></div>
<p>If the model's job is to remove energy at the grid scale, a dissipative scheme already does that. Implicit LES, of which the MILES of Boris and co-workers (1992) was an early form, leans on this deliberately: it runs with no explicit model and lets the scheme's own <dfn data-term="numerical-diffusion">numerical diffusion</dfn> act as the subgrid model. Whether that works depends on whether the scheme removes the right amount. Burgers' equation is a clean place to check, because its exact solution loses energy only at shocks, at a rate the jump alone sets (<a href="#/shocks/burgers">chapter 8</a>).</p>
<figure data-widget="turbulence-implicit" class="wide"><figcaption>Burgers' equation from $u_0 = \sin 2\pi x$, after it breaks at $t_b = 1/(2\pi)$. Left: energy against time for the exact entropy solution (dashed), a finite-volume scheme with no viscosity term, and a dealiased spectral run with an explicit viscosity $\nu$. Right: the profiles now. Press Run.</figcaption></figure>
<div class="try"><ol>
<li>Run the default: Godunov's scheme on 128 cells, with no viscosity term at all. After the shock forms its energy stays within about 1% of the exact value (0.0% at $t = 0.5$, +1.0% at 0.8). The scheme's dissipation is doing the shock's job.</li>
<li>Switch the scheme to <b>Lax–Friedrichs</b>. It loses 6.1% of the energy before the shock even exists (<b>lost before t_b</b>), and is about 8% low afterwards. On 64 cells it is 16% low; on 256, 4%. Its "model" changes with the grid.</li>
<li>Set <b>Spectral ν</b> to 0. With nothing to remove energy, the spectral run keeps all of it: at $t = 0.8$ it holds more than five times the exact energy, as grid-scale noise. At $\nu = 0.002$ it holds 29% too much; at 0.005 it is within about 1% after the shock.</li>
</ol></div>
<aside class="pitfall">If your scheme is dissipative and you also add an explicit subgrid model, you have two models, and you only chose one. On a coarse grid the numerical dissipation may dominate, so changing the model changes nothing and the results drift as you refine. Measure your scheme's dissipation on a case with a known answer before you trust its LES, and check the results on more than one grid (<a href="#/trust">chapter 15</a>).</aside>
<details class="deeper"><summary>Go deeper: why RANS and LES disagree about the same flow</summary>
<p>RANS averages over time or over many realisations, so its unknown is the whole Reynolds stress, including the large eddies that depend on the geometry. No universal model fits them all, so RANS models carry constants tuned on particular flows. LES filters only at a small width, so its unknown is the stress of small eddies that are nearly universal; that is why a simple model like (14.14) works. The price is a three-dimensional, time-dependent run long enough to gather statistics: orders of magnitude more than a steady RANS solution. Hybrids such as detached-eddy simulation run RANS near walls and LES away from them.</p>
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
      explain: '$\\varepsilon = 30^3/4.5 = 6000$ W/kg, so $\\eta = (\\nu^3/\\varepsilon)^{1/4} = (3.4\\times10^{-15}/6000)^{1/4} \\approx 2.7\\times10^{-5}$ m, about 27 µm, thinner than a hair. The car is 4.5 m, so $L/\\eta \\approx 1.6\\times10^5$, which is $\\mathrm{Re}^{3/4}$ for Re = $9\\times10^6$. If you got about 7 mm, you used $\\nu$ where (14.2) has $\\nu^3$.',
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
      explain: 'The large eddies set the rate at which energy enters the cascade, $\\varepsilon \\sim U^3/L$, and in a steady state that is the rate at which it must leave. Viscosity does not decide how much is dissipated, only where: lower $\\nu$ and the cascade simply runs to smaller eddies, $\\eta = (\\nu^3/\\varepsilon)^{1/4}$, so $\\eta$ falls by $2^{3/4}$. Assuming $\\varepsilon \\propto \\nu$ is the laminar intuition; it fails for turbulence.',
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
      explain: 'Energy can leave only through viscosity, and at $k \\ll k_\\eta$ viscosity is too weak. So the energy arriving at the last shell backs up, and the backlog raises the spectrum all the way down: the measured slope is about $-1.3$, not $-1.67$. Cutting off the small scales does not remove their job, which is to dissipate. That is the shell-model picture of an under-resolved simulation, and the reason an LES needs a subgrid model.',
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
      explain: 'The grid grows as $\\mathrm{Re}^{9/4}$ ($10^{9/4} \\approx 180$), but the number of time steps also grows as $\\mathrm{Re}^{3/4}$ ($\\approx 5.6$), because the smaller grid spacing forces a smaller step. Together: $\\mathrm{Re}^{3}$, a factor of 1000. Counting only the grid is the usual slip; the time step shrinks too.',
    },
    q5: {
      type: 'num',
      q: 'A pseudo-spectral code on $N = 64$ points, with no dealiasing, multiplies the modes $k = 20$ and $k = 25$. Their product has wavenumber 45, which the grid cannot hold. At what wavenumber magnitude $|k|$ does it show up?',
      answer: 19,
      tol: 0.5,
      explain: 'By (14.9) the grid cannot tell $k$ from $k - N$, so 45 appears as $45 - 64 = -19$: a mode with $|k| = 19$ that the true equation never fed. With the two-thirds rule the code keeps only $|k| \\le 21$, so the mode 25 would not exist, and every alias of a product of kept modes falls into the discarded band.',
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
      explain: 'The energy sits in the large eddies; the dissipation, weighted by $\\kappa^2$, sits near $1/\\eta$, far beyond the cutoff. Pope\'s model spectrum gives 0.23% at the 80% cutoff. So the subgrid model must remove almost all of the energy the cascade delivers. LES still keeps the molecular viscosity, but at the resolved scales it is tiny.',
    },
  },
  glossary: {
    turbulence: {
      term: 'turbulence',
      def: 'Irregular, chaotic, strongly mixing and dissipative flow with eddies over a wide range of sizes, a range that grows with the Reynolds number. A property of the flow, not of the fluid.',
      section: 'what-is-turbulence',
    },
    'energy-cascade': {
      term: 'energy cascade',
      def: 'The transfer of kinetic energy from the large eddies where it is put in, through smaller and smaller eddies, to the Kolmogorov scale where viscosity turns it into heat. In three dimensions the transfer is on average downscale.',
      section: 'cascade',
    },
    'kolmogorov-scale': {
      term: 'Kolmogorov scales',
      def: 'The smallest scales of turbulence, set by the dissipation rate $\\varepsilon$ and viscosity $\\nu$ alone: length $\\eta = (\\nu^3/\\varepsilon)^{1/4}$, time $\\tau_\\eta = (\\nu/\\varepsilon)^{1/2}$, speed $u_\\eta = (\\nu\\varepsilon)^{1/4}$. The largest eddies are about $\\mathrm{Re}^{3/4}$ times larger.',
      section: 'cascade',
    },
    'inertial-range': {
      term: 'inertial range',
      def: 'Scales much smaller than the stirring and much larger than the Kolmogorov length, where energy is passed on without loss and only $\\varepsilon$ matters. There $E(k) = C\\varepsilon^{2/3}k^{-5/3}$.',
      section: 'cascade',
    },
    'shell-model': {
      term: 'shell model',
      def: 'A toy model of the cascade with one complex variable per octave of wavenumber, $k_n = 2^n$, coupled to its neighbours by energy-conserving quadratic terms. Not Navier–Stokes, but it reproduces the $-5/3$ spectrum and intermittency cheaply.',
      section: 'shell-model',
    },
    intermittency: {
      term: 'intermittency',
      def: 'The burstiness of turbulence at small scales: rare intense events make high moments of velocity differences grow faster than Kolmogorov\'s 1941 theory predicts, so the exponents $\\zeta_p$ fall below $p/3$ for $p > 3$.',
      section: 'shell-model',
    },
    dns: {
      term: 'direct numerical simulation (DNS)',
      def: 'Solving the Navier–Stokes equations with no turbulence model, on a grid fine enough for the Kolmogorov scale. The work grows roughly as $\\mathrm{Re}^3$.',
      section: 'dns-cost',
    },
    aliasing: {
      term: 'aliasing',
      def: 'On a grid of $N$ points, wavenumbers $k$ and $k - N$ are indistinguishable, so products of resolved modes that exceed the grid\'s range reappear as spurious low wavenumbers. In nonlinear spectral codes it can create energy and cause blow-up.',
      section: 'aliasing',
    },
    dealiasing: {
      term: 'dealiasing',
      def: 'Removing aliasing errors from the products in a spectral code, by the two-thirds rule, by padding to $3N/2$ points before multiplying, or by phase shifts.',
      section: 'aliasing',
    },
    'two-thirds-rule': {
      term: 'two-thirds rule',
      def: 'Keep only Fourier modes with $|k|$ below $N/3$ and zero the top third after each product. Every alias of a quadratic product of kept modes then lands in the zeroed band. Associated with Orszag (1971); the name came later.',
      section: 'aliasing',
    },
    'inverse-cascade': {
      term: 'inverse cascade',
      def: 'In two-dimensional turbulence, the transfer of energy to larger scales (smaller wavenumbers), forced by the conservation of both energy and enstrophy. Enstrophy cascades the other way.',
      section: 'two-d',
    },
    'closure-problem': {
      term: 'closure problem',
      def: 'Averaging the Navier–Stokes equations produces the unknown Reynolds stress; its own equation brings in higher-order unknowns, and so on without end. A turbulence model closes the chain by assumption.',
      section: 'modelling',
    },
    rans: {
      term: 'RANS',
      def: 'Reynolds-averaged Navier–Stokes: equations for the mean flow, with the effect of all the turbulence carried by a model of the Reynolds stress, such as an eddy viscosity from k–ε or Spalart–Allmaras.',
      section: 'modelling',
    },
    'eddy-viscosity': {
      term: 'eddy viscosity',
      def: 'A viscosity $\\nu_T$ that models turbulent stresses as if they were viscous stresses on the mean or resolved flow (Boussinesq\'s hypothesis). A property of the flow, often hundreds of times the molecular viscosity.',
      section: 'modelling',
    },
    les: {
      term: 'large-eddy simulation (LES)',
      def: 'Resolving the large, energetic eddies and modelling only the effect of the small ones with a subgrid model, such as Smagorinsky\'s $\\nu_T = (C_s\\Delta)^2|\\overline{S}|$. Typically resolves 80% of the energy but almost none of the dissipation.',
      section: 'modelling',
    },
  },
  pathologies: [
    {
      id: 'aliasing-instability',
      name: 'Aliasing instability',
      family: 'stability',
      symptom: 'A spectral or centred-difference simulation of a nonlinear flow runs well, then its total energy starts to rise although only viscosity acts, grid-scale noise appears, and within a short time it blows up. Refining the time step does not help.',
      cause: 'Quadratic products of resolved modes produce wavenumbers beyond the grid, which fold back onto resolved wavenumbers (aliasing). The discrete nonlinear term then no longer conserves energy, and the spurious transfer feeds the shortest waves. Phillips (1959) described it as nonlinear computational instability.',
      diagnose: 'Print the total energy every step: in a viscous unforced run it can only fall. Look for a spectrum that turns upward near $N/2$ before the blow-up. In the figure, Burgers on 128 points with $\\nu = 0.002$ first gains energy at $t \\approx 1.0$ and blows up at $t \\approx 1.37$; with the two-thirds rule the same run is bounded.',
      mitigations: [
        'Dealias: the two-thirds rule, or padding to $3N/2$ points for each product.',
        'Write the advection term in a form whose discrete version conserves energy (skew-symmetric form, Arakawa\'s Jacobian in 2-D).',
        'More resolution or viscosity reduces the aliased energy but only hides the problem; at $\\nu = 0.005$ the energy still rises, it just no longer runs away.',
      ],
      section: 'aliasing',
      demo: { widget: 'turbulence-aliasing', data: { preset: 'aliased' } },
    },
    {
      id: 'spectral-pileup',
      name: 'Spectral pile-up',
      family: 'resolution',
      symptom: 'The energy spectrum flattens, or turns upward, over the last part of the resolved wavenumbers instead of falling off; in physical space, grid-scale wiggles near steep gradients. The inertial range may look too shallow.',
      cause: 'The grid stops before the dissipation scale, so energy arriving at the highest resolved wavenumber has nowhere to go and backs up. Dealiasing does not cure it: it removes aliasing, not under-resolution.',
      diagnose: 'Plot the spectrum on log axes, or compensated by $k^{5/3}$, and look at the top decade. Compare $k_{\\max}\\eta$ with about 1.5. In the pile-up preset (Burgers, $N = 256$, $\\nu = 0.004$, $t = 1.5$), the top mode without the rule holds about 1000 times the resolved value, and the dealiased run 50 times too much at its cutoff.',
      mitigations: [
        'Resolve the dissipation scale ($k_{\\max}\\eta \\gtrsim 1.5$ for a spectral DNS), or raise the viscosity to what the grid can carry.',
        'Add a subgrid model that drains energy at the cutoff (LES).',
        'A spectral filter or hyperviscosity that acts only on the top modes; it changes the physics there, so say so.',
      ],
      section: 'aliasing',
      demo: { widget: 'turbulence-aliasing', data: { preset: 'pileup' } },
    },
    {
      id: 'numerical-dissipation-as-model',
      name: 'Numerical dissipation acting as a model',
      family: 'resolution',
      symptom: 'An under-resolved simulation agrees with experiment on one grid, then drifts when the grid is refined; or adding or changing a subgrid model makes no difference. Energy is lost where the physics loses none.',
      cause: 'The truncation error of a dissipative scheme acts like an eddy viscosity whose size depends on the grid spacing and the scheme, not on the flow. It silently does (or overdoes) the subgrid model\'s job, and it changes when the grid does.',
      diagnose: 'Run the scheme on a case with known energy loss. For Burgers from $u_0 = \\sin 2\\pi x$ the exact energy stays at 0.25 until the shock forms at $t = 1/(2\\pi)$: Lax–Friedrichs on 128 cells has already lost 6.1% by then and is 8% low afterwards, while Godunov is within about 1%. In an LES, compare the model\'s dissipation with the total.',
      mitigations: [
        'Measure the scheme\'s numerical dissipation before choosing a model; with a strongly dissipative scheme an explicit model may be redundant.',
        'Use low-dissipation schemes with an explicit model, or adopt implicit LES deliberately, with a scheme designed for it.',
        'Check results on at least two grids; a result that depends on the grid at fixed model is set by the numerics.',
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
