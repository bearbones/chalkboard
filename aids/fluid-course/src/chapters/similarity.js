// Chapter 5 · similarity: Reynolds and the art of similarity
// Widgets live in ./similarity/*.js. They run the shared kernel
// src/sims/similarity.js (Pi groups, friction factor, sphere drag, Strouhal
// fits, ship scaling), the chapter kernel src/sims/ch-similarity-scales.js
// (water properties, Reynolds's thresholds, scenarios, erfc collapse,
// lattice plan) and src/sims/diffusion.js (Crank-Nicolson heat step).

import { mountSimilarityReynolds } from './similarity/reynolds.js';
import { mountSimilarityPi } from './similarity/pi.js';
import { mountSimilarityRegimes } from './similarity/regimes.js';
import { mountSimilarityShip } from './similarity/ship.js';
import { mountSimilarityMoody } from './similarity/moody.js';
import { mountSimilarityDrag } from './similarity/drag.js';
import { mountSimilarityStrouhal } from './similarity/strouhal.js';
import { mountSimilarityCollapse } from './similarity/collapse.js';
import { mountSimilarityLattice } from './similarity/lattice.js';

export const chapter = {
  id: 'similarity',
  title: 'Reynolds and the art of similarity',
  short: 'Similarity',
  blurb: 'Dimensionless numbers, scaling laws, and the vortex street behind a cylinder.',
  minutes: 45,
  html: String.raw`
<p class="lead-in">A tadpole and a submarine both move through water and obey the same equations of motion, yet viscous drag dominates the flow around the tadpole while inertia and eddies dominate the flow around the submarine. Which regime a flow falls into depends on a dimensionless combination of size, speed and fluid properties rather than on any one of those quantities alone. In this chapter you will repeat Osborne Reynolds's dye experiment, derive dimensionless groups from units alone, scale a ship model in a towing tank, read engineering correlations as compressed experimental data, and see how the Reynolds number sets the grid resolution a simulation requires.</p>

<h2 id="reynolds-1883">Reynolds's dye experiment (1883)</h2>

<p>When water flows slowly through a glass tube and a thin filament of dye is fed into the entrance, the filament runs straight down the tube in a steady line. As the valve is opened further, the filament suddenly breaks up at a critical speed; in Reynolds's words, "the colour band would all at once mix up with the surrounding water, and fill the rest of the tube with a mass of coloured water" <a href="#src-reynolds1883">[1]</a>. He called the two kinds of motion <em>direct</em> and <em>sinuous</em>. Today they are called <dfn data-term="laminar">laminar</dfn> flow, in which neighbouring layers slide past each other in order, and <dfn data-term="turbulent">turbulent</dfn> flow, in which the motion is irregular, three-dimensional and rapidly mixing.</p>

<p>Reynolds ran the experiment with three glass tubes of nearly 1, ½ and ¼ inch bore, fed from a tank through a trumpet-shaped mouth. He found that the breakdown speed was inversely proportional to the tube diameter—halving the bore doubled the critical speed—and decreased as the water warmed and its viscosity fell. Rather than acting independently, speed, diameter and viscosity entered together through a single combination, now called the <dfn data-term="reynolds-number">Reynolds number</dfn>:</p>

<div class="eq" id="eq-re">$$\mathrm{Re} = \frac{\rho U D}{\mu} = \frac{U D}{\nu}$$<span class="eq-tag">(5.1)</span></div>

<p>Here $U$ is the mean speed, $D$ the tube's diameter, $\rho$ the density, $\mu$ the viscosity and $\nu = \mu/\rho$ the <dfn data-term="kinematic-viscosity">kinematic viscosity</dfn> from <a href="#/continuum/viscosity">chapter 1</a>. Every unit cancels, so $\mathrm{Re}$ is a pure number. A 1 inch tube of water at 15 °C reaches $\mathrm{Re} = 2{,}020$ at 9 cm/s, and so does a ¼ inch tube at 36 cm/s.</p>

<p>This combination compares the two forces acting on a disturbed parcel of fluid: inertia, which carries a disturbance downstream and lets it grow, and viscosity, which smears out velocity differences and damps it. Per unit volume, the inertial term (mass times convective acceleration) scales as $\rho U^2/D$ when speeds of order $U$ vary over a distance $D$, while the viscous force (the gradient of a shear stress $\mu U/D$) scales as $\mu U/D^2$. Their ratio is the Reynolds number:</p>

<div class="eq" id="eq-re-ratio">$$\frac{\text{inertia}}{\text{viscous force}} \sim \frac{\rho U^2/D}{\mu U/D^2} = \frac{\rho U D}{\mu} = \mathrm{Re}$$<span class="eq-tag">(5.2)</span></div>

<p>At small $\mathrm{Re}$, viscous damping dominates and disturbances decay; at large $\mathrm{Re}$, inertia dominates and a small disturbance can amplify by drawing energy from the mean flow. Because the scaling symbol "$\sim$" ("of the order of") omits numerical factors such as $2$ or $\pi$ and geometric ratios between pipe radius and shear-layer thickness, the transition in a pipe occurs near $\mathrm{Re} \approx 2{,}000$ rather than near $1$.</p>

<p>Reynolds identified two distinct thresholds and emphasised that the upper one depends on how quiet the incoming flow is. When the water in his supply tank was left to settle until it was very still, the flow stayed direct up to $\mathrm{Re} \approx 12{,}830$; he also found a lower threshold, $\mathrm{Re} \approx 2{,}020$, below which eddies died out regardless of how strongly the inlet was disturbed <a href="#src-rott">[3]</a>. Reynolds expressed these thresholds through dimensional constants in a critical-velocity formula (converted to modern $\mathrm{Re}$ values by Rott), before writing the dimensionless parameter explicitly as $K$ in 1895 and placing the critical value for pipes "between 1900 and 2000" <a href="#src-reynolds1895">[2]</a>.</p>

<table>
<caption>Critical Reynolds numbers for pipe flow, and where they come from</caption>
<thead><tr><th>Value</th><th class="num">Re</th><th>What it means</th></tr></thead>
<tbody>
<tr><td>Reynolds's lower value</td><td class="num">≈ 2,020</td><td>Below it, disturbances die out, whatever the inlet.</td></tr>
<tr><td>Reynolds's upper value</td><td class="num">≈ 12,830</td><td>How far his very still tank kept the flow direct.</td></tr>
<tr><td>Ekman (1910), smoothed inlet</td><td class="num">≈ 44,000</td><td>The same apparatus with more care at the entrance (via Rott).</td></tr>
<tr><td>Textbook convention</td><td class="num">2,300</td><td>A standard engineering rule of thumb for commercial pipes.</td></tr>
</tbody>
</table>

<aside class="pitfall">Between $\mathrm{Re} \approx 2{,}000$ and the upper threshold, laminar pipe flow is linearly stable to infinitesimal perturbations yet triggered into turbulence by finite inlet disturbances, so the observed transition point depends on the amplitude of disturbances entering the pipe. A numerical simulation started from smooth initial data with no perturbations can therefore remain laminar far above $\mathrm{Re} = 2{,}300$, reflecting the quietness of its initial and boundary conditions.</aside>

<p>Reynolds also measured the pressure needed to push water through. Below the lower critical value it grew in proportion to the speed. Above it, it grew as the 1.723 power of the speed <a href="#src-reynolds1883">[1]</a>. The friction law changes with the regime, a point the <a href="#/similarity/correlations">correlations</a> section takes up.</p>

<aside class="who" data-person="osborne-reynolds">Reynolds began the dye experiments early in 1880 at Owens College, Manchester. Rayleigh and Stokes refereed the 1883 paper favourably. In 1895 he split the velocity into a mean and a fluctuating part, the start of the averaged turbulence models of <a href="#/turbulence/modelling">chapter 14</a>.</aside>

<aside class="history" data-era="1883">Both the transition in pipes and the similarity of the equations had earlier precursors: Gotthilf Hagen described the breakdown of laminar pipe flow in 1854 using sawdust as a tracer, and Rayleigh later credited Stokes (1850) with observing dynamical similarity in the viscous equations <a href="#src-rott">[3]</a>. The name "Reynolds'sche Zahl" was introduced by Arnold Sommerfeld at the 1908 International Congress of Mathematicians in Rome (proceedings printed 1909) <a href="#src-sommerfeld">[4]</a>, as traced in <a href="#/notation/names">chapter 4</a>.</aside>

<p>The figure lets you repeat the experiment. The schematic shows the dye in the chosen tube; the plot shows, for each tube, the speed at which its flow would reach the inlet's limit as the water temperature changes. The viscosity comes from the IAPWS formulation for water <a href="#src-huber">[31]</a>.</p>

<figure data-widget="similarity-reynolds" data-preset="direct" class="wide"><figcaption>Reynolds's three tubes. The dye stays a thread until the Reynolds number passes the limit of the chosen inlet; the plot gives the critical speed of each tube against temperature, or, switched to Reynolds number, shows the three tubes on one line.</figcaption></figure>

<div class="try"><ol>
<li>In the ½ inch tube at 15 °C, raise the mean speed from 0.1 m/s. With Reynolds's still tank the dye holds until about 1.15 m/s ($\mathrm{Re} \approx 12{,}830$), then mixes.</li>
<li>Switch the inlet to <b>Disturbed inlet</b> at 0.4 m/s ($\mathrm{Re} \approx 4{,}460$). The same flow is now sinuous. Lower the speed until it is direct again: that happens near 0.18 m/s, the lower value of 2,020.</li>
<li>Change the tube from ½ to ¼ inch and watch the critical speeds double. Now warm the water from 5 °C to 40 °C. The kinematic viscosity falls by a factor of 2.3, and so do the critical speeds.</li>
<li>Switch the plot to <b>Reynolds number</b>. Three tubes and every temperature collapse onto the same horizontal lines. That collapse is what the rest of the chapter is about.</li>
</ol></div>

<div data-quiz="q1"></div>

<h2 id="dimensional-analysis">Dimensional analysis</h2>

<p>Even before an experiment is run, the requirement that a physical law be independent of the system of units constrains how the variables can combine. This method, <dfn data-term="dimensional-analysis">dimensional analysis</dfn>, determines the dimensionless groups through which the variables must enter, reducing a function of many dimensional quantities to a relation among a few dimensionless parameters.</p>

<p>Consider a simple pendulum whose period $t$ could depend on its length $L$, gravitational acceleration $g$ ($\text{m}/\text{s}^2$) and bob mass $m$. Because kilograms appear only in $m$, no other variable can cancel its mass unit, so the period cannot depend on $m$. Cancelling seconds and metres between $t$, $g$ and $L$ leaves a single dimensionless combination, $t\sqrt{g/L}$, which must be constant across all geometrically similar pendulums, giving $t = C\sqrt{L/g}$ up to a numerical factor $C$ ($2\pi$ for small oscillations).</p>

<p>A <dfn data-term="dimensionless-number">dimensionless number</dfn> is a combination like $t\sqrt{g/L}$ or $\mathrm{Re}$ whose units cancel, so it has the same value in every system of units. The general rule is the <dfn data-term="buckingham-pi">Buckingham Π theorem</dfn> <a href="#src-buckingham">[7]</a>. Suppose a problem involves $n$ variables, and their units are built from $r$ independent base dimensions (mass, length, time, and so on). Then any law relating them can be rewritten as a relation between $n - r$ dimensionless groups:</p>

<div class="eq" id="eq-pi">$$\Pi_1 = \phi(\Pi_2, \ldots, \Pi_{n-r})$$<span class="eq-tag">(5.3)</span></div>

<p>To build the groups you pick $r$ "repeating" variables that between them carry every base dimension, and combine each remaining variable with powers of them until its units cancel. Different choices give different but equivalent groups, each a product of powers of the others.</p>

<h3 id="sphere-drag">Worked example: the drag on a sphere</h3>

<p>A smooth sphere of diameter $D$ moves at speed $U$ through a fluid of density $\rho$ and viscosity $\mu$. The force $F$ on it could depend on all four, so a brute-force study would vary four things. Here $n = 5$ and the units use mass, length and time, so $r = 3$ and there are two groups. One is the Reynolds number again. The other measures the force against the dynamic pressure $\tfrac12\rho U^2$ acting on the frontal area, the <dfn data-term="drag-coefficient">drag coefficient</dfn>:</p>

<div class="eq" id="eq-cd">$$C_D = \frac{F}{\tfrac12 \rho U^2 \cdot \tfrac{\pi}{4} D^2} = \Phi(\mathrm{Re})$$<span class="eq-tag">(5.4)</span></div>

<p>Instead of a four-variable table over $(D, U, \rho, \mu)$, a single curve $C_D(\mathrm{Re})$ covers both a ball bearing falling in oil and a weather balloon rising in wind. While the function $\Phi(\mathrm{Re})$ over intermediate Reynolds numbers comes from experiment or full flow solutions, dimensional analysis fixes its asymptotic form at both extremes. When $\mathrm{Re} \ll 1$, fluid inertia is negligible and the density $\rho$ drops out of the problem, leaving four variables and a single dimensionless group $F/(\mu U D)$ that must be constant. Stokes solved the creeping-flow equations in 1850 to find the constant <a href="#src-stokes1851">[5]</a>:</p>

<div class="eq" id="eq-stokes">$$F = 3\pi\mu U D \quad\Longrightarrow\quad C_D = \frac{24}{\mathrm{Re}}$$<span class="eq-tag">(5.5)</span></div>

<p>At high Reynolds numbers where viscous forces are small compared with pressure forces in the wake, $\mu$ drops out instead and $F/(\rho U^2 D^2)$ is approximately constant, so the drag grows as $U^2$ and $C_D$ is nearly flat. Huygens measured this quadratic law for water and air in 1669—"les impressions de l'eau contre une mesme surface sont comme les quarrez des vitesses" (the impressions of water against the same surface are as the squares of the speeds) <a href="#src-huygens">[6]</a>. The <a href="#/similarity/correlations">correlations</a> section examines the range over which this plateau holds and why it ends abruptly at the drag crisis.</p>

<aside class="who" data-person="george-gabriel-stokes">Stokes's sphere drag came out of a paper on pendulums, read in December 1850 and printed in 1851. He wrote it as $6\pi\mu' \rho a V$ with $a$ the radius and $\mu' = \mu/\rho$, and used it to find how fast cloud droplets fall. It holds only at Reynolds numbers well below 1.</aside>

<details class="deeper"><summary>Go deeper: finding the groups by linear algebra</summary>
<p>Write each variable's units as a column of exponents of the base dimensions M, L, T. For the sphere, $F$ is $(1, 1, -2)$, $\rho$ is $(1, -3, 0)$, $U$ is $(0, 1, -1)$, $D$ is $(0, 1, 0)$ and $\mu$ is $(1, -1, -1)$. A product $F^{a}\rho^{b}U^{c}D^{d}\mu^{e}$ is dimensionless exactly when the exponents $(a, b, c, d, e)$ make the weighted sum of columns zero, that is, when they lie in the null space of the $3 \times 5$ matrix. Its rank is $r = 3$, so the null space has dimension $n - r = 2$. Any two independent null vectors give a complete set of groups: $(1, -1, -2, -2, 0)$ is $F/(\rho U^2 D^2)$ and $(0, 1, 1, 1, -1)$ is $\rho U D/\mu$. The figure's kernel finds this null space in exact fractions, so it never has to decide whether a tiny floating-point number "is" zero.</p>
<p>If you choose repeating variables that are not independent, for instance $\rho$ and $U$ together with something else that adds no new dimension, the elimination fails because those variables cannot cancel every base dimension. The figure's <b>bad-repeating</b> case shows the message.</p>
</details>

<figure data-widget="similarity-pi" data-preset="sphere-drag"><figcaption>A Buckingham Π builder. Tap variables in or out and choose the repeating set; the dimension matrix, its rank and the groups update. Groups the course knows by name are labelled.</figcaption></figure>

<div class="try"><ol>
<li>With the sphere problem, tap $\rho$ out of the list. One group is left, $F/(\mu U D)$: a constant, which is Stokes's law up to the factor $3\pi$.</li>
<li>Put $\rho$ back and add the roughness $\epsilon$, the speed of sound $c$ and gravity $g$. Five groups appear: the force group, $\mathrm{Re}$, $\epsilon/D$, a Mach number and a Froude number. Each one is a question you would have to answer before trusting a model test.</li>
<li>Choose <b>Period of a pendulum</b>. The mass appears in no group, as argued above.</li>
<li>Choose <b>Radius of a blast wave</b>: one group, so $R \propto (E t^2/\rho)^{1/5}$, the radius grows as the two-fifths power of time.</li>
</ol></div>

<aside class="history" data-era="1915">"I have often been impressed by the scanty attention paid even by original workers in physics to the great principle of similitude," Rayleigh wrote in <i>Nature</i> in 1915 <a href="#src-rayleigh1915">[8]</a>, prompting correspondence that brought Buckingham's 1914 paper to wider notice alongside earlier formulations such as Vaschy's (1892). In 1941 G. I. Taylor applied dimensional and similarity analysis to a point-source explosion—deriving the $R \propto (E t^2/\rho)^{1/5}$ blast-wave law in a report published on 22 March 1950 <a href="#src-taylor1950">[9]</a>—a solution also found independently by von Neumann and by Sedov.</aside>

<aside class="pitfall">Dimensional analysis depends entirely on the initial list of physical variables. Omitting a relevant parameter—such as pipe wall roughness or channel depth—produces a consistent set of dimensionless groups that omits an active physical effect, whereas including an irrelevant variable merely adds an extra group on which the data show no dependence.</aside>

<div data-quiz="q2"></div>

<h2 id="numbers">The named numbers</h2>

<p>Each named dimensionless number is the ratio of two competing physical effects, indicating at a glance which terms in the governing equations dominate and which can be neglected. A large Reynolds number means inertia outweighs viscosity; a small Mach number means density changes are tiny; a small Froude number means gravity outweighs inertia at a free surface. The table below collects the dimensionless numbers used in this course, together with representative values computed from rounded reference scales.</p>

<table>
<caption>Named dimensionless numbers: $L$ a length, $U$ a speed, $c$ the speed of sound, $g$ gravity, $\sigma$ surface tension, $\alpha$ thermal diffusivity, $\lambda$ the mean free path, $f_s$ a frequency, $N$ the buoyancy frequency of a stratified fluid, $\beta$ the thermal expansion coefficient, $h$ a layer depth</caption>
<thead><tr><th>Number</th><th>Definition</th><th>Ratio of</th><th>Typical values</th></tr></thead>
<tbody>
<tr><td>Reynolds</td><td>$\mathrm{Re} = UL/\nu$</td><td>inertia : viscous force</td><td>swimming bacterium $6\times10^{-5}$; car $9\times10^{6}$; weather system $7\times10^{11}$</td></tr>
<tr><td>Mach</td><td>$\mathrm{Ma} = U/c$</td><td>flow speed : sound speed</td><td>car 0.09; airliner at cruise 0.85</td></tr>
<tr><td>Froude</td><td>$\mathrm{Fr} = U/\sqrt{gL}$</td><td>flow speed : surface-wave speed</td><td>cargo ship 0.26; swimmer 0.34</td></tr>
<tr><td>Strouhal</td><td>$\mathrm{St} = f_s L/U$</td><td>flow time : period of the unsteadiness</td><td>vortex shedding from a cylinder, about 0.2</td></tr>
<tr><td>Weber</td><td>$\mathrm{We} = \rho U^2 L/\sigma$</td><td>inertia : surface tension</td><td>2 mm raindrop falling at 6.5 m/s <a href="#src-gunn">[32]</a>, about 1.4</td></tr>
<tr><td>Capillary</td><td>$\mathrm{Ca} = \mu U/\sigma$</td><td>viscous force : surface tension</td><td>water creeping at 1 mm/s, $1.4\times10^{-5}$</td></tr>
<tr><td>Prandtl</td><td>$\mathrm{Pr} = \nu/\alpha$</td><td>momentum diffusion : heat diffusion</td><td>air 0.71; water about 7 at 20 °C</td></tr>
<tr><td>Péclet</td><td>$\mathrm{Pe} = UL/\alpha = \mathrm{Re}\,\mathrm{Pr}$</td><td>carrying by the flow : diffusion</td><td>water at 1 cm/s over 1 cm, about 700</td></tr>
<tr><td>Knudsen</td><td>$\mathrm{Kn} = \lambda/L$</td><td>mean free path : body size</td><td>air on a 1 µm particle, 0.07</td></tr>
<tr><td>Richardson</td><td>$\mathrm{Ri} = N^2/(\mathrm{d}U/\mathrm{d}z)^2$</td><td>buoyancy : shear</td><td>a stratified shear flow is linearly stable if $\mathrm{Ri} > \tfrac14$ everywhere <a href="#src-miles">[33]</a></td></tr>
<tr><td>Rayleigh</td><td>$\mathrm{Ra} = g\beta\,\Delta T\,h^3/(\nu\alpha)$</td><td>buoyancy : diffusion of heat and momentum</td><td>convection starts near 1,708 between rigid plates <a href="#src-chandrasekhar">[34]</a></td></tr>
</tbody>
</table>

<p>The <dfn data-term="mach-number">Mach number</dfn> measures compressibility, since in steady flow the fractional density change scales as $\mathrm{Ma}^2/2$; below $\mathrm{Ma} \approx 0.3$ that change is under 5% (less than 0.4% for a car on the motorway), so the flow can be treated as <a href="#/conservation/mass">incompressible</a>. The <dfn data-term="froude-number">Froude number</dfn> compares the flow speed with the speed of long surface gravity waves, $\sqrt{gh}$. For $\mathrm{Fr} > 1$ the flow outruns its own waves, and where it decelerates back below $\mathrm{Fr} = 1$ it transitions abruptly through a hydraulic jump; for a surface ship, a gravity wave travelling at speed $U$ has wavelength $2\pi U^2/g$, which matches the hull length when $\mathrm{Fr} = 1/\sqrt{2\pi} \approx 0.4$, where wave-making resistance rises sharply. The <dfn data-term="strouhal-number">Strouhal number</dfn> compares an oscillation period with the convective time $L/U$, as in the cylinder wakes of the <a href="#/similarity/correlations">correlations</a> section. The Péclet number compares advection with thermal or mass diffusion (<a href="#/stiffness/peclet">chapter 9</a>), and the Knudsen number tests whether the continuum approximation holds (<a href="#/continuum/continuum">chapter 1</a>).</p>

<p>A dimensionless group governs a flow only when both of its physical mechanisms are active: a deeply submerged submarine has a speed $U$ and length $L$, so one can evaluate $U/\sqrt{gL}$, but far from any free surface there are no gravity waves for the Froude number to control. Moreover, the values in the table span many orders of magnitude—sixteen powers of ten for the Reynolds number alone—which is why different regimes require different approximations and numerical methods.</p>

<aside class="who" data-person="jakob-ackeret">Ackeret coined "Machzahl" in his inaugural lecture at ETH Zürich in 1929 <a href="#src-ackeret">[13]</a>, naming the ratio after Ernst Mach, who never used the term. Mach and Peter Salcher had photographed the shock waves round a supersonic bullet in 1886, published in 1887 <a href="#src-mach">[14]</a>.</aside>

<figure data-widget="similarity-regimes" data-preset="car" class="wide"><figcaption>Where real flows sit. Each scenario states its length, speed and fluid; the figure places its Reynolds, Mach and Froude numbers on logarithmic strips and says what each implies. The speed multiplier lets you push one flow across a threshold.</figcaption></figure>

<div class="try"><ol>
<li>Start with the car at 30 m/s. Its $\mathrm{Re}$ is about $9\times10^{6}$ and its $\mathrm{Ma}$ 0.09: inertia-dominated and effectively incompressible. Raise the speed multiplier until $\mathrm{Ma}$ passes 0.3, at about 3.4 times motorway speed.</li>
<li>Pick the swimming bacterium. Its $\mathrm{Re}$ is about $6\times10^{-5}$. For it, water is far more viscous, relative to its own inertia, than honey is for you.</li>
<li>Pick the cargo ship and raise the speed until $\mathrm{Fr}$ passes 0.4. That is where its own bow wave becomes as long as the hull.</li>
<li>Pick the airliner. Its wing sits at $\mathrm{Ma} \approx 0.85$ and $\mathrm{Re} \approx 3\times10^{7}$, so both compressibility and inertia matter at once.</li>
</ol></div>

<h2 id="models">Model testing</h2>

<p>Two flows are dynamically <dfn data-term="similarity">similar</dfn> when their boundaries are geometrically scaled copies of one another and every relevant dimensionless group takes the same value in both. Their dimensionless outputs—such as drag or lift coefficients—are then identical, so measuring the drag coefficient on a scale model determines it for the full-size prototype. The same principle underlies towing tanks, wind tunnels, and the <a href="#/similarity/nondimensional">nondimensional simulations</a> at the end of this chapter.</p>

<p>The difficulty is in "every relevant group". A ship makes waves, so gravity matters and the Froude number must match. It also drags water along its hull, so viscosity matters and the Reynolds number must match. With the model a fraction $s = L_m/L_s$ of the ship's length, matching the Froude number fixes the model's speed:</p>

<div class="eq" id="eq-froude">$$\mathrm{Fr} = \frac{U}{\sqrt{gL}}, \qquad \frac{U_m}{U_s} = \sqrt{\frac{L_m}{L_s}} = \sqrt{s}$$<span class="eq-tag">(5.6)</span></div>

<p>Matching the Reynolds number in the same water requires $U_m/U_s = 1/s$, meaning the smaller model would have to travel faster than the ship, so $\mathrm{Fr}$ and $\mathrm{Re}$ cannot be matched simultaneously in water for $s \ne 1$. For a 100 m cargo ship at 8 m/s and a 1/25 scale model, Froude scaling sets the towing speed to 1.6 m/s, giving $\mathrm{Re}_m = 6.4\times10^{6}$ compared with the ship's $\mathrm{Re}_s = 8\times10^{8}$—smaller by a factor of $s^{-3/2} = 125$. Matching both groups would require towing the model at 200 m/s or filling the tank with a fluid of kinematic viscosity $8\times10^{-9}\text{ m}^2/\text{s}$, 125 times lower than water's.</p>

<p>William Froude's way out, proposed to the Admiralty in 1868, was to split the resistance into two parts and scale each by its own law <a href="#src-froude1874">[11]</a>. The wave-making part depends on the Froude number, so the model is towed at the Froude-scaled speed. The frictional part he estimated from separate measurements on long, thin planks towed through the water. Today the friction part is taken from a standard line fitted to plate data, the ITTC 1957 correlation line <a href="#src-ittc">[12]</a>:</p>

<div class="eq" id="eq-ittc">$$C_F = \frac{0.075}{(\log_{10}\mathrm{Re} - 2)^2}$$<span class="eq-tag">(5.7)</span></div>

<p>Because the skin-friction coefficient decreases with increasing Reynolds number, the model at its lower $\mathrm{Re}$ has a disproportionately large friction coefficient—about 2.1 times the ship's value in the cargo example. Towing-tank analysis therefore subtracts the model's estimated skin friction (5.7) from the measured total resistance coefficient, scales the remaining wave-making resistance by Froude similarity, and adds back the ship's skin friction evaluated at $\mathrm{Re}_s$. This procedure is an example of <em>partial similarity</em>, in which the dominant dimensionless group is matched directly and the mismatch in the secondary group is corrected by an empirical model.</p>

<aside class="who" data-person="william-froude">The Admiralty accepted Froude's proposal in 1870, and he built a covered tank beside his house at Chelston Cross, Torquay, where he towed ship models and his friction planks. The same speed scaling had been used earlier, by Ferdinand Reech for ship models (1852) and by Bélanger for open channels (1828). The name "Froude number" came later, from Moritz Weber in 1919 <a href="#src-rott">[3]</a>.</aside>

<figure data-widget="similarity-ship" data-preset="cargo-1-25" class="wide"><figcaption>Towing-tank arithmetic. Left: the ITTC 1957 friction line with the ship and its Froude-scaled model; the dashed step is the friction correction. Right: the model speed needed for Froude similarity ($\sqrt{s}$) and for Reynolds similarity ($1/s$), against scale.</figcaption></figure>

<div class="try"><ol>
<li>With the cargo ship at 1/25, read the friction ratio: about 2.06. Make the model bigger, towards 1/4. The gap in Reynolds number shrinks and so does the correction, but the tank and the model get expensive.</li>
<li>Pick the 300 m tanker at 1/50. The model runs at about 1.06 m/s, and its friction coefficient is about 2.3 times the ship's.</li>
<li>Pick the 12 m yacht at 1/10 and read the speed for Reynolds similarity: 40 m/s, in a tank built for 1 or 2 m/s.</li>
</ol></div>

<p>Wind tunnels face the same choice with different numbers. For an aircraft the Mach number and the Reynolds number both matter. A small model in air at the right Mach number has too small a Reynolds number. Since $\mathrm{Re} = \rho U L/\mu$, one fix is to raise the density by compressing the gas, another to cool it, which raises the density and lowers the viscosity. Ackeret's closed-circuit supersonic tunnel at ETH Zürich (1935), driven by a compressor, allowed the Mach and Reynolds numbers to be varied independently. The general lesson carries over to simulation: a computation that matches the geometry but not the dimensionless groups is a model of a different flow.</p>

<div data-quiz="q3"></div>

<h2 id="correlations">Correlations: compressed experiments</h2>

<p>Dimensional analysis says the drag coefficient is some function of the Reynolds number. Experiment supplies the function. Engineers then fit formulas to the measurements, and those formulas, the <em>correlations</em>, are among the most used results in fluid mechanics. Treat each one as a compressed experiment: a few constants standing in for thousands of measurements, valid over the range those measurements covered and no further. This section looks at three: friction in pipes, drag on spheres, and vortex shedding from cylinders. Each also gives a numerical lesson.</p>

<h3 id="pipe-friction">Pipe friction and the Moody chart</h3>

<p>The pressure drop $\Delta p$ along a length $L$ of pipe is written with the Darcy <dfn data-term="friction-factor">friction factor</dfn> $f$, which compares it with the dynamic pressure: $\Delta p = f\,(L/D)\,\tfrac12\rho U^2$. Dimensional analysis says $f$ depends on $\mathrm{Re}$ and on the relative roughness $\epsilon/D$ of the wall. In laminar flow the answer is exact, $f = 64/\mathrm{Re}$, from the parabolic Hagen–Poiseuille profile. For smooth pipes in turbulent flow Blasius fitted $f = 0.3164\,\mathrm{Re}^{-1/4}$ in 1913 <a href="#src-blasius">[15]</a>, which makes the pressure drop grow as $U^{1.75}$, close to Reynolds's 1.723. For rough pipes the standard formula is Colebrook's of 1939 <a href="#src-colebrook">[16]</a>:</p>

<div class="eq" id="eq-colebrook">$$\frac{1}{\sqrt{f}} = -2\log_{10}\left(\frac{\epsilon/D}{3.7} + \frac{2.51}{\mathrm{Re}\sqrt{f}}\right)$$<span class="eq-tag">(5.8)</span></div>

<p>Moody plotted (5.8) in 1944 as the chart that bears his name <a href="#src-moody">[17]</a>. Because $f$ appears on both sides, Colebrook's relation is <em>implicit</em> and must be solved numerically for $x = 1/\sqrt{f}$. Fixed-point iteration substitutes a current estimate $x_k$ into the right-hand side to obtain $x_{k+1}$, whereas Newton's method uses the derivative of the residual $R(x) = x + 2\log_{10}(\epsilon/3.7D + 2.51x/\mathrm{Re})$ to step towards $R(x) = 0$. For a smooth pipe at $\mathrm{Re} = 10^5$ starting from $f_0 = 0.02$, Newton's method reaches $f = 0.017990$ to machine precision in 3 iterations, compared with 14 for fixed-point iteration; Haaland's explicit approximation of 1983 <a href="#src-haaland">[18]</a> gives $f$ to within 1% in a single evaluation.</p>

<details class="deeper"><summary>Go deeper: how fast the two iterations converge</summary>
<p>The fixed-point map is $g(x) = -2\log_{10}(a + bx)$ with $a = (\epsilon/D)/3.7$ and $b = 2.51/\mathrm{Re}$. Near the answer each step multiplies the error by $|g'(x)| = (2/\ln 10)\,b/(a + bx)$, which is below $0.87/x$. For realistic friction factors, $f < 0.15$, $x$ exceeds 2.5 and the factor is below 0.35, so the iteration always contracts near the root; for the smooth pipe at $\mathrm{Re} = 10^5$ it is about 0.12, which is why 14 steps take the error from $10^{-2}$ to round-off. Newton's error is roughly squared at each step instead, so once it is close its number of correct digits doubles each time.</p>
<p>Neither statement says anything about a guess far from the root. There, both maps can throw the iterate out of the region where they are defined. With $f_0 = 10^{-10}$, $x_0 = 10^5$ and $bx_0 \approx 25$, so the first fixed-point step gives $x_1 = -2\log_{10} 25 \approx -2.8$, and Newton's gives $x_1 \approx -1.9$. A negative $x = 1/\sqrt{f}$ is meaningless, and the next step takes the logarithm of a negative number, returning NaN. The kernel guards against this by halving $x$ whenever a step would make it zero or negative.</p>
</details>

<figure data-widget="similarity-moody" data-preset="smooth" class="wide"><figcaption>Left: the Moody chart, with the exact laminar line, Blasius's law and Colebrook's formula for the chosen roughness; the transition band from 2,300 to 4,000 is shaded. Right: the residual of the Colebrook iteration at the probe point, for Newton and for fixed point, on a log scale. Steps the safeguard had to rescue are marked ⊗.</figcaption></figure>

<div class="try"><ol>
<li>At the smooth-pipe default, compare the slopes on the right: Newton's residual plunges in 3 steps, fixed point's falls by a steady factor of about 0.12 per step.</li>
<li>Choose the roughest wall and move the probe to $\mathrm{Re} = 10^6$. Fixed point now needs only 5 steps: on the rough part of the chart $f$ hardly depends on $\mathrm{Re}$, and $|g'|$ is small.</li>
<li>Move the probe into the shaded band, to about 3,000. The chart still prints a number, but the flow there may be laminar or turbulent; no correlation is reliable in that band.</li>
<li>Back at a smooth pipe and $\mathrm{Re} = 10^4$, drag the starting guess $f_0$ down to $10^{-10}$. Safeguarded steps appear: 4 for Newton and 5 for fixed point. Without the safeguard both methods return NaN.</li>
</ol></div>

<aside class="pitfall">An iterative solver is guaranteed to converge only from a guess close enough to the answer. Started far away, it can leave the region where its formula is defined and return NaN, or converge to a meaningless root. Start from an explicit approximation such as Haaland's, and check the residual of what comes back. The <a href="#/pathologies">pathology gallery</a> lists this as fixed-point divergence.</aside>

<h3 id="sphere-crisis">Sphere drag and the drag crisis</h3>

<p>For the sphere, the correlations are fits to the curve $C_D(\mathrm{Re})$ of <a href="#eq-cd">(5.4)</a>. Stokes's $24/\mathrm{Re}$ is exact only in the limit of tiny $\mathrm{Re}$. Oseen's correction (1910) adds the first effect of inertia. Schiller and Naumann's formula of 1933, $C_D = (24/\mathrm{Re})(1 + 0.15\,\mathrm{Re}^{0.687})$, covers Reynolds numbers up to about 800 <a href="#src-schiller">[19]</a>, and Morrison's fit runs through the whole curve to $10^6$ <a href="#src-morrison">[20]</a>. Each formula comes with a range, and outside it each can be badly wrong. At $\mathrm{Re} = 10$, Stokes's law gives $C_D = 2.4$, whereas Schiller–Naumann gives 4.15 and Morrison's fit 3.97, so Stokes's formula underpredicts the drag by about 40%.</p>

<p>Between $\mathrm{Re} \approx 10^3$ and $10^5$ the drag coefficient stays nearly flat around 0.4 to 0.5, consistent with Huygens's quadratic law. Just above $\mathrm{Re} \approx 1.6\times10^5$, however, $C_D$ drops by a factor of nearly five—from 0.44 at $\mathrm{Re} \approx 1.6\times10^{5}$ to 0.09 at $4.4\times10^{5}$ in Morrison's fit. In this <em>drag crisis</em>, the coefficient falls so steeply that the dimensional drag force $F$ decreases even as the flow speed increases: for a smooth 22 cm sphere in air (the size of a football), the drag drops from about 2.0 N at 16 m/s to 1.5 N at 24 m/s. As Prandtl demonstrated in 1914 <a href="#src-prandtl1914">[21]</a>, the drop occurs because the thin <dfn data-term="boundary-layer">boundary layer</dfn> on the front of the sphere transitions to turbulence before separating, entraining high-momentum fluid that keeps the flow attached further around the rear and leaves a narrower wake.</p>

<aside class="who" data-person="ludwig-prandtl">Prandtl's 1914 paper on the air resistance of spheres settled a dispute with Gustave Eiffel, whose laboratory in Paris had measured the sudden drop in sphere drag. Prandtl showed the drop was real, and caused by the boundary layer turning turbulent. Prandtl had used the name "Reynolds number" deliberately since 1913, although Sommerfeld's 1908 use is earlier.</aside>

<figure data-widget="similarity-drag" data-preset="intermediate" class="wide"><figcaption>Left: the sphere drag coefficient against Reynolds number, with Stokes, Oseen, Schiller–Naumann and Morrison's wide-range fit, each drawn over its range; the drag-crisis band is shaded. Right: the force on a smooth 22 cm sphere in air against speed.</figcaption></figure>

<div class="try"><ol>
<li>Lower $\mathrm{Re}$ to 0.1. Every fit agrees with Stokes: in creeping flow the drag is proportional to speed.</li>
<li>Set $\mathrm{Re} = 10$ and turn on <b>Draw each fit beyond its range</b>. Stokes's line runs well below the data fit; Oseen's runs above it.</li>
<li>Move into the crisis near $3\times10^{5}$ and watch the right-hand plot: the force on the ball dips while the speed grows.</li>
</ol></div>

<h3 id="shedding">Vortex shedding and the Strouhal number</h3>

<p>Wind in telegraph wires sings. In 1878 Vincenc Strouhal whirled wires through the air and measured the pitch of the tone. He found that it did not depend on the wire's tension, length or material, and that it was directly proportional to the speed and inversely proportional to the diameter <a href="#src-strouhal">[22]</a>. In other words, the dimensionless group</p>

<div class="eq" id="eq-strouhal">$$\mathrm{St} = \frac{f_s D}{U}$$<span class="eq-tag">(5.9)</span></div>

<p>is roughly constant over his experimental range. Although Strouhal measured only the acoustic pitch, the sound is driven by the wake: above $\mathrm{Re} \approx 47$ <a href="#src-williamson">[24]</a>, the symmetric recirculation bubble behind a circular cylinder becomes unstable and sheds vortices alternately from its two sides in a <a href="#/lattice-particles/vortex-street">vortex street</a>, exerting an oscillating cross-stream force on the wire. Roshko's 1954 measurements give $\mathrm{St} = 0.212(1 - 21.2/\mathrm{Re})$ for the regular laminar street, $50 < \mathrm{Re} < 150$, and $0.212(1 - 12.7/\mathrm{Re})$ from 300 to 2,000, separated by a transition range where the wake turns three-dimensional <a href="#src-roshko">[23]</a>. At higher Reynolds numbers $\mathrm{St}$ stays close to 0.2 until the drag crisis.</p>

<aside class="history" data-era="1908">Henri Bénard photographed and filmed the alternating vortices behind a moving obstacle in 1908 <a href="#src-benard">[25]</a>, <a href="#src-wesfreid">[27]</a>. Theodore von Kármán analysed two rows of point vortices in 1911–12 and showed that only a staggered arrangement, with the rows about 0.28 vortex spacings apart, can be stable <a href="#src-karman">[26]</a>. In 1915 Rayleigh connected Strouhal's tones to these wakes <a href="#src-aeolian">[28]</a>. The rest of the story, including Kármán's compromise over the street's name, is told with the <a href="#/lattice-particles/vortex-street">lattice Boltzmann wake</a>.</aside>

<figure data-widget="similarity-strouhal" data-preset="wire" class="wide"><figcaption>Strouhal's tones. Roshko's fits for $\mathrm{St}(\mathrm{Re})$ and the steady range below $\mathrm{Re} \approx 47$; the readouts give the Reynolds number, the Strouhal number and the shedding frequency for a wire in air. The button plays the predicted tone for one second.</figcaption></figure>

<div class="try"><ol>
<li>A 1 mm wire in a 10 m/s wind sits at $\mathrm{Re} \approx 670$, $\mathrm{St} \approx 0.21$: it sheds about 2,100 vortex pairs a second. Play the tone.</li>
<li>Double the wind speed. The pitch doubles too, an octave up, because $\mathrm{St}$ hardly changes.</li>
<li>Shrink the wire to 0.2 mm and slow the wind to 2 m/s. At $\mathrm{Re} \approx 27$ the wake is steady and the wire is silent.</li>
<li>Set 1 mm and 3 m/s ($\mathrm{Re} \approx 200$): Roshko's transition range, where the figure gives no single value.</li>
</ol></div>

<p>The vortex street is also a standard test for flow solvers. The <a href="#/lattice-particles/vortex-street">lattice Boltzmann wake</a> of chapter 13 measures $\mathrm{St} = 0.188$ at $\mathrm{Re} = 100$, where Roshko's fit gives 0.167. That run's cylinder is only 12 cells across, and its box is periodic top and bottom and 6 diameters high, so it really models a row of cylinders 6 diameters apart. That spacing ratio is another dimensionless group, and it differs from Roshko's experiments. Matching $\mathrm{Re}$ alone does not make two flows similar.</p>

<div data-quiz="q4"></div>

<h2 id="nondimensional">Numerical consequences</h2>

<p>Dimensional scaling applies directly to numerical simulation. Rescaling the incompressible <a href="#/conservation/navier-stokes">Navier–Stokes equations</a> by measuring lengths in units of $L$, velocities in units of $U$, time in units of $L/U$ and pressure in units of $\rho U^2$ absorbs every dimensional parameter into a single group:</p>

<div class="eq" id="eq-ns-star">$$\frac{\partial \mathbf{u}^*}{\partial t^*} + (\mathbf{u}^*\cdot\nabla^*)\,\mathbf{u}^* = -\nabla^* p^* + \frac{1}{\mathrm{Re}}\,\nabla^{*2}\mathbf{u}^*, \qquad \nabla^*\cdot\mathbf{u}^* = 0$$<span class="eq-tag">(5.10)</span></div>

<p>Here the stars mark dimensionless variables. For a fixed boundary geometry, the solution of (5.10) depends only on $\mathrm{Re}$, which is why a single dimensionless simulation represents every physical flow sharing that geometry and Reynolds number. Equation (5.10) also shows why high-Reynolds-number flows are difficult to compute: at large $\mathrm{Re}$ the viscous term is multiplied by the small coefficient $1/\mathrm{Re}$, yet it contains the highest spatial derivatives needed to enforce the no-slip boundary condition at solid walls. Dropping the viscous term leads to <a href="#/conservation/paradox">d'Alembert's paradox</a>, whereas keeping it confines viscous effects to thin boundary and shear layers where velocity gradients are steep enough for $\nabla^{*2}\mathbf{u}^*$ to be of order $\mathrm{Re}$.</p>

<details class="deeper"><summary>Go deeper: the scaling step by step</summary>
<p>Substituting $\mathbf{x} = L\mathbf{x}^*$, $\mathbf{u} = U\mathbf{u}^*$, $t = (L/U)t^*$ and $p = \rho U^2 p^*$ into $\partial_t \mathbf{u} + (\mathbf{u}\cdot\nabla)\mathbf{u} = -\nabla p/\rho + \nu\nabla^2\mathbf{u}$ brings a factor $1/L$ for each spatial derivative and $U/L$ for the time derivative. The left-hand side becomes $(U^2/L)(\partial_{t^*}\mathbf{u}^* + (\mathbf{u}^*\cdot\nabla^*)\mathbf{u}^*)$, the pressure term becomes $(U^2/L)\nabla^* p^*$, and the viscous term becomes $(\nu U/L^2)\nabla^{*2}\mathbf{u}^*$. Dividing through by $U^2/L$ leaves the dimensionless factor $\nu/(UL) = 1/\mathrm{Re}$ in front of the viscous term. Scaling pressure by $\rho U^2$ suits inertia-dominated flows; for creeping flow one scales pressure by $\mu U/L$ instead, placing the factor $\mathrm{Re}$ on the inertial terms so that they vanish as $\mathrm{Re} \to 0$ (Stokes flow).</p>
</details>

<h3 id="layer-thickness">How thick is a viscous layer?</h3>

<p>In the simplest viscous shear layer, two parallel streams—the lower at speed $1$ and the upper at rest—are initially separated by a sharp step at $y = 0$. Viscosity smooths the step according to the one-dimensional diffusion equation $\partial_t u = \nu\,\partial_y^2 u$. Because an infinite domain has no imposed length scale, the only length that can be formed from the diffusivity $\nu$ and elapsed time $t$ is $\sqrt{\nu t}$, so the velocity profile can depend on $y$ and $t$ only through the similarity variable $\eta = y/\sqrt{4\nu t}$. The exact solution, $u = \tfrac12\operatorname{erfc}\eta$, is <em>self-similar</em>, meaning that profiles at different times collapse onto a single curve when plotted against $\eta$, while the physical thickness of the layer grows as $\sqrt{\nu t}$.</p>

<p>Now let fluid pass a body of length $L$ at speed $U$. Fluid near the surface has a time of about $L/U$ to feel the body, so the layer of slowed fluid grows to</p>

<div class="eq" id="eq-delta">$$\delta \sim \sqrt{\frac{\nu L}{U}} = L\,\mathrm{Re}^{-1/2}$$<span class="eq-tag">(5.11)</span></div>

<p>This is Prandtl's boundary-layer estimate. In his Göttingen dissertation (1907, printed 1908) Blasius reduced the flat-plate version to a single ordinary differential equation, a similarity solution. In a numerical simulation, resolving a boundary layer of thickness $L\,\mathrm{Re}^{-1/2}$ requires placing several grid points across $\delta$, so the number of grid intervals per body length $L$ must grow at least as $\mathrm{Re}^{1/2}$. The figure measures what "several" means for the diffusing step. It runs the Crank–Nicolson solver of <a href="#/stiffness/crank-nicolson">chapter 9</a> on the same equation, written there as the heat equation with diffusivity $\kappa$ in place of $\nu$, and compares it with $\tfrac12\operatorname{erfc}\eta$.</p>

<figure data-widget="similarity-collapse" data-preset="default" class="wide"><figcaption>A self-similar solution and its limits. Left: the computed profile against $x$ or against $\eta$, beside $\tfrac12\operatorname{erfc}\eta$. Right: the largest gap between them as the layer's width $s = \sqrt{4\nu t}$ grows, with the gap the walls alone would cause and a $(\Delta x/s)^2$ guide. The grid spacing and the walls are two lengths the problem did not have.</figcaption></figure>

<div class="try"><ol>
<li>With 100 grid intervals, move the width $s$ up from its smallest value. With the layer 1.4 cells wide the gap is $1.3\times10^{-2}$; at 3.2 cells it is $2.3\times10^{-3}$; at 6.3 cells, $6.5\times10^{-4}$; at 12.5 cells, $1.7\times10^{-4}$. Once the layer spans a few cells, each doubling cuts the gap about fourfold: the solver is second order.</li>
<li>Set $s$ near 0.1 and change the grid instead. With 20 intervals the gap is $4.6\times10^{-3}$, with 100 it is $2.7\times10^{-4}$, with 400 it is $1.3\times10^{-5}$.</li>
<li>Push $s$ towards 0.5. Now the layer reaches the ends of the domain and the gap rises to about $7.5\times10^{-2}$ on every grid. That error is the boundary's, and no refinement removes it.</li>
<li>Press Play and watch the profiles collapse onto one curve against $\eta$ while the layer is wider than a few cells and narrower than the domain.</li>
</ol></div>

<p>The lesson generalises. A self-similar solution holds between two lengths: above the scale of whatever smooths the small end (here the grid) and below the scale of whatever bounds the large end (here the walls) <a href="#src-barenblatt">[10]</a>. A simulation is trustworthy in the same window. At high Reynolds numbers the boundary layer shrinks like $\mathrm{Re}^{-1/2}$ and the window closes from below. Turbulence makes it far worse, because the smallest eddies shrink faster still; <a href="#/turbulence/dns-cost">chapter 14</a> counts the cost.</p>

<h3 id="lattice-units">Reynolds numbers in lattice units</h3>

<p>A solver's internal grid units obey the same scaling relations. In the lattice Boltzmann method of <a href="#/lattice-particles">chapter 13</a>, lengths are measured in grid cells ($\Delta x = 1$) and time in steps ($\Delta t = 1$), the kinematic viscosity is controlled by the dimensionless relaxation time $\tau$, and the lattice speed of sound is fixed at $c_s = 1/\sqrt{3}$ cells per step:</p>

<div class="eq" id="eq-lattice">$$\nu = \frac{\tau - \tfrac12}{3}, \qquad \mathrm{Re} = \frac{U D}{\nu} = \frac{3 U D}{\tau - \tfrac12}, \qquad \mathrm{Ma} = \sqrt{3}\,U$$<span class="eq-tag">(5.12)</span></div>

<p>Here $U$ is measured in cells per step and $D$ in cells, leaving three ways to increase $\mathrm{Re}$, each with a numerical constraint. Lowering $\tau$ towards $\tfrac12$ reduces the viscosity but drives the scheme towards instability on under-resolved grids (<a href="#/lattice-particles/lbm-limits">chapter 13</a>). Raising $U$ increases the lattice Mach number $\mathrm{Ma} = \sqrt{3}\,U$, introducing compressibility errors of order $\mathrm{Ma}^2$. Holding $\tau$ and $U$ fixed requires increasing the cylinder diameter $D$ in proportion to $\mathrm{Re}$: in the <a href="#/lattice-particles/vortex-street">cylinder wake</a> of chapter 13 ($\mathrm{Re} = 150$, $D = 12$ cells, $U = 0.08$, $\tau = 0.519$), multiplying $\mathrm{Re}$ by ten at fixed $\tau$ and $U$ multiplies the two-dimensional cell count by $D^2 = 100$ and the number of steps per flow-through time by $D = 10$, increasing the total work as $\mathrm{Re}^3$—a factor of $1{,}000$.</p>

<figure data-widget="similarity-lattice" data-preset="hero" class="wide"><figcaption>What a Reynolds number costs on a lattice. The plane of Reynolds number and cylinder size in cells, with lines of constant $\tau$ for the current inflow speed and the line where $D/\sqrt{\mathrm{Re}}$, the boundary-layer scale in cells, equals one. Readouts give $\tau$, the inflow Mach number, the grid and the cost of one crossing of a box 20 by 6 diameters.</figcaption></figure>

<div class="try"><ol>
<li>The default is chapter 13's wake: $\tau = 0.519$, inflow $\mathrm{Ma} = 0.14$, a 240 × 72 grid and 3,000 steps per crossing.</li>
<li>Raise $\mathrm{Re}$ to 1,500 without touching anything else. $\tau$ drops to 0.502, into the range where <a href="#/lattice-particles/lbm-limits">chapter 13's coarse runs</a> blow up, and the boundary-layer scale is a third of a cell.</li>
<li>Try to rescue it with speed: set $U = 0.3$. $\tau$ rises to 0.507, but the inflow Mach number is 0.52, and the layer is still a third of a cell.</li>
<li>Rescue it with cells instead: set $U$ back to 0.08 and $D$ to 120. Every warning clears, at a thousand times the hero run's cost per crossing.</li>
</ol></div>

<aside class="history" data-era="1933">The first numerical solutions for flow past a cylinder were done by hand. In 1933 Alexander Thom solved the steady viscous equations round a cylinder by iterative "arithmetical methods" on a grid at $\mathrm{Re} = 10$ and $20$ <a href="#src-thom">[29]</a>. Thirty years later Jacob Fromm and Francis Harlow computed a vortex street forming, for Reynolds numbers from 15 to 6,000 <a href="#src-fromm">[30]</a>. Theirs is often remembered as a cylinder wake, but the paper's obstacle was a plate set moving in a channel.</aside>

<div data-quiz="q5"></div>
<div data-quiz="q6"></div>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li id="src-reynolds1883">O. Reynolds (1883). An experimental investigation of the circumstances which determine whether the motion of water shall be direct or sinuous, and of the law of resistance in parallel channels. <i>Philosophical Transactions of the Royal Society</i> 174, 935–982. Read 15 March 1883.</li>
<li id="src-reynolds1895">O. Reynolds (1895). On the dynamical theory of incompressible viscous fluids and the determination of the criterion. <i>Philosophical Transactions of the Royal Society A</i> 186, 123–164. Read 24 May 1894.</li>
<li id="src-rott">N. Rott (1990). Note on the history of the Reynolds number. <i>Annual Review of Fluid Mechanics</i> 22, 1–12.</li>
<li id="src-sommerfeld">A. Sommerfeld (1909). Ein Beitrag zur hydrodynamischen Erklärung der turbulenten Flüssigkeitsbewegung. <i>Atti del IV Congresso Internazionale dei Matematici</i> (Roma 1908), vol. 3, 116–124.</li>
<li id="src-stokes1851">G. G. Stokes (1851). On the effect of the internal friction of fluids on the motion of pendulums. <i>Transactions of the Cambridge Philosophical Society</i> 9, part II, 8–106. Read 9 December 1850.</li>
<li id="src-huygens">C. Huygens. Expériences de 1669 sur la force de l'eau ou de l'air en mouvement. In <i>Œuvres complètes</i>, vol. XIX (Société hollandaise des sciences, 1937).</li>
<li id="src-buckingham">E. Buckingham (1914). On physically similar systems; illustrations of the use of dimensional equations. <i>Physical Review</i> 4, 345–376.</li>
<li id="src-rayleigh1915">Lord Rayleigh (1915). The principle of similitude. <i>Nature</i> 95, 66–68.</li>
<li id="src-taylor1950">G. I. Taylor (1950). The formation of a blast wave by a very intense explosion. I. Theoretical discussion. <i>Proceedings of the Royal Society A</i> 201, 159–174.</li>
<li id="src-barenblatt">G. I. Barenblatt (1996). <i>Scaling, Self-similarity, and Intermediate Asymptotics</i>. Cambridge University Press.</li>
<li id="src-froude1874">W. Froude (1874). Report to the Lords Commissioners of the Admiralty on experiments for the determination of the frictional resistance of water on a surface, under various conditions, performed at Chelston Cross.</li>
<li id="src-ittc">International Towing Tank Conference (1957). Model–ship correlation line, adopted at the 8th ITTC, Madrid. Current use: ITTC Recommended Procedures and Guidelines 7.5-02-02-02.</li>
<li id="src-ackeret">J. Ackeret (1929). Der Luftwiderstand bei sehr großen Geschwindigkeiten. Inaugural lecture, ETH Zürich; printed in <i>Schweizerische Bauzeitung</i> 94.</li>
<li id="src-mach">E. Mach and P. Salcher (1887). Photographische Fixirung der durch Projectile in der Luft eingeleiteten Vorgänge. <i>Sitzungsberichte der Kaiserlichen Akademie der Wissenschaften Wien, Math.-Naturwiss. Classe</i> 95.</li>
<li id="src-blasius">H. Blasius (1913). Das Ähnlichkeitsgesetz bei Reibungsvorgängen in Flüssigkeiten. <i>Mitteilungen über Forschungsarbeiten auf dem Gebiete des Ingenieurwesens</i>, Heft 131. VDI, Berlin.</li>
<li id="src-colebrook">C. F. Colebrook (1939). Turbulent flow in pipes, with particular reference to the transition region between the smooth and rough pipe laws. <i>Journal of the Institution of Civil Engineers</i> 11, 133–156.</li>
<li id="src-moody">L. F. Moody (1944). Friction factors for pipe flow. <i>Transactions of the ASME</i> 66, 671–684.</li>
<li id="src-haaland">S. E. Haaland (1983). Simple and explicit formulas for the friction factor in turbulent pipe flow. <i>Journal of Fluids Engineering</i> 105, 89–90.</li>
<li id="src-schiller">L. Schiller and A. Naumann (1933). Über die grundlegenden Berechnungen bei der Schwerkraftaufbereitung. <i>Zeitschrift des Vereines Deutscher Ingenieure</i> 77, 318–320. Range as tabulated by R. Clift, J. R. Grace and M. E. Weber, <i>Bubbles, Drops, and Particles</i> (Academic Press, 1978).</li>
<li id="src-morrison">F. A. Morrison (2013). <i>An Introduction to Fluid Mechanics</i>. Cambridge University Press. The sphere-drag correlation is Fig. 8.13 and the accompanying note "Data correlation for drag coefficient for sphere".</li>
<li id="src-prandtl1914">L. Prandtl (1914). Der Luftwiderstand von Kugeln. <i>Nachrichten der Gesellschaft der Wissenschaften zu Göttingen, Math.-Phys. Klasse</i>, 177–190.</li>
<li id="src-strouhal">V. Strouhal (1878). Ueber eine besondere Art der Tonerregung. <i>Annalen der Physik und Chemie</i>, Neue Folge 5, 216–251. Presented 16 February 1878.</li>
<li id="src-roshko">A. Roshko (1954). On the development of turbulent wakes from vortex streets. NACA Report 1191.</li>
<li id="src-williamson">C. H. K. Williamson (1996). Vortex dynamics in the cylinder wake. <i>Annual Review of Fluid Mechanics</i> 28, 477–539. (The onset of shedding near $\mathrm{Re} = 47$.)</li>
<li id="src-benard">H. Bénard (1908). Formation périodique de centres de giration à l'arrière d'un obstacle en mouvement. <i>Comptes Rendus de l'Académie des Sciences</i> 147, 839–842.</li>
<li id="src-karman">T. von Kármán (1911, 1912). Über den Mechanismus des Widerstandes, den ein bewegter Körper in einer Flüssigkeit erfährt. <i>Nachrichten der Gesellschaft der Wissenschaften zu Göttingen, Math.-Phys. Klasse</i>.</li>
<li id="src-wesfreid">J. E. Wesfreid (2017). Henri Bénard: thermal convection and vortex shedding. <i>Comptes Rendus Mécanique</i> 345, 446–466. Quoting T. von Kármán and L. Edson, <i>The Wind and Beyond</i> (Little, Brown, 1967).</li>
<li id="src-aeolian">Lord Rayleigh (1915). Æolian tones. <i>Philosophical Magazine</i>, 6th series, 29, 433–444.</li>
<li id="src-thom">A. Thom (1933). The flow past circular cylinders at low speeds. <i>Proceedings of the Royal Society A</i> 141, 651–669.</li>
<li id="src-fromm">J. E. Fromm and F. H. Harlow (1963). Numerical solution of the problem of vortex street development. <i>Physics of Fluids</i> 6, 975–982.</li>
<li id="src-huber">M. L. Huber, R. A. Perkins, A. Laesecke, D. G. Friend, J. V. Sengers, M. J. Assael, I. N. Metaxa, E. Vogel, R. Mareš and K. Miyagawa (2009). New international formulation for the viscosity of H₂O. <i>Journal of Physical and Chemical Reference Data</i> 38, 101–125.</li>
<li id="src-gunn">R. Gunn and G. D. Kinzer (1949). The terminal velocity of fall for water droplets in stagnant air. <i>Journal of Meteorology</i> 6, 243–248. (The raindrop speed in the table.)</li>
<li id="src-miles">J. W. Miles (1961). On the stability of heterogeneous shear flows. <i>Journal of Fluid Mechanics</i> 10, 496–508; and L. N. Howard (1961). Note on a paper of John W. Miles. <i>Journal of Fluid Mechanics</i> 10, 509–512. (The Richardson criterion.)</li>
<li id="src-chandrasekhar">S. Chandrasekhar (1961). <i>Hydrodynamic and Hydromagnetic Stability</i>. Oxford University Press. (The onset of convection between rigid plates.)</li>
</ol>
`,
  widgets: {
    'similarity-reynolds': mountSimilarityReynolds,
    'similarity-pi': mountSimilarityPi,
    'similarity-regimes': mountSimilarityRegimes,
    'similarity-ship': mountSimilarityShip,
    'similarity-moody': mountSimilarityMoody,
    'similarity-drag': mountSimilarityDrag,
    'similarity-strouhal': mountSimilarityStrouhal,
    'similarity-collapse': mountSimilarityCollapse,
    'similarity-lattice': mountSimilarityLattice,
  },
  quizzes: {
    q1: {
      type: 'predict',
      q: 'Reynolds’s 1 inch tube at 15 °C loses its laminar flow, with a disturbed inlet, at about 9 cm/s. You swap it for the ½ inch tube, same water, same inlet. At what speed does the dye now break up?',
      choices: [
        'About 4.5 cm/s: a narrower tube is less stable.',
        'About 9 cm/s: the threshold is a speed, and the water has not changed.',
        'About 18 cm/s: the threshold is a Reynolds number, and halving $D$ doubles the speed needed to reach it.',
        'About 36 cm/s: the flow area is a quarter, so the speed must be four times higher.',
      ],
      answer: 2,
      explain: 'Reynolds found that the critical speed varies inversely with the diameter. Breakdown happens at a fixed $\\mathrm{Re} = UD/\\nu \\approx 2{,}020$, so with $\\nu$ unchanged, halving $D$ doubles $U$: about 18 cm/s. The area argument confuses the speed with the flow rate; at the critical point the ½ inch tube actually carries half the flow rate of the 1 inch tube.',
    },
    q2: {
      type: 'mcq',
      q: 'The pressure drop $\\Delta p$ per unit length of a long pipe depends on the mean speed $U$, the diameter $D$, the density $\\rho$, the viscosity $\\mu$ and the wall roughness $\\epsilon$. How many dimensionless groups does the Buckingham Π theorem give?',
      choices: [
        'Two: a pressure-drop group and the Reynolds number.',
        'Three: a pressure-drop group, $\\mathrm{Re}$ and $\\epsilon/D$.',
        'Five: one for each variable that $\\Delta p$ depends on.',
        'Six: one for each variable in the list.',
      ],
      answer: 1,
      explain: 'There are $n = 6$ variables ($\\Delta p$ per length, $U$, $D$, $\\rho$, $\\mu$, $\\epsilon$) and their units use $r = 3$ base dimensions (M, L, T), so there are $n - r = 3$ groups: $f = (\\Delta p/L)\\,D/(\\tfrac12\\rho U^2)$, $\\mathrm{Re}$ and $\\epsilon/D$. That is why the Moody chart is a family of curves, one per roughness, and not a single curve. Choice 1 forgets the roughness; choices 3 and 4 forget that the units must cancel.',
    },
    q3: {
      type: 'num',
      q: 'A 1/25 scale model of a cargo ship that sails at 8 m/s is towed so that its Froude number matches the ship’s. How fast must the model go, in m/s?',
      answer: 1.6,
      tol: 0.03,
      unit: 'm/s',
      explain: 'Equal $\\mathrm{Fr} = U/\\sqrt{gL}$ means $U_m = U_s\\sqrt{L_m/L_s} = 8\\sqrt{1/25} = 8/5 = 1.6$ m/s. The model then makes the ship’s wave pattern, but its Reynolds number is $(1/25)^{3/2} = 1/125$ of the ship’s, so its friction must be corrected separately.',
    },
    q4: {
      type: 'num',
      q: 'A wire 1 mm across stands in a 10 m/s wind. Take the Strouhal number as 0.2. At what frequency, in hertz, does it shed vortices from each side?',
      answer: 2000,
      tol: 0.08,
      unit: 'Hz',
      explain: '$f_s = \\mathrm{St}\\,U/D = 0.2 \\times 10 / 0.001 = 2000$ Hz. The figure, using Roshko’s fit at $\\mathrm{Re} \\approx 670$ ($\\mathrm{St} \\approx 0.208$), gives about 2,080 Hz. Strouhal heard this as the pitch of the tone, and found it proportional to speed over diameter long before anyone connected it with vortices.',
    },
    q5: {
      type: 'predict',
      q: 'You simulate flow past a body at $\\mathrm{Re} = 10^4$, with a grid that puts about 6 points across its boundary layer. You now want $\\mathrm{Re} = 4 \\times 10^4$, same body and same speed. Roughly how thick is the new boundary layer, compared with the old one?',
      choices: [
        'A quarter as thick: it scales as $1/\\mathrm{Re}$.',
        'Half as thick: it scales as $\\mathrm{Re}^{-1/2}$.',
        'The same: the body has not changed size.',
        'Twice as thick: higher Reynolds number means stronger eddies.',
      ],
      answer: 1,
      explain: 'Viscosity spreads the slowed fluid over a distance $\\sqrt{\\nu t}$ in the time $L/U$ that the fluid spends near the body, so $\\delta \\sim L\\,\\mathrm{Re}^{-1/2}$. Four times the Reynolds number halves the layer, and the same grid now puts only about 3 points across it. To keep 6 you must halve the spacing near the wall. The collapse figure shows how the error grows when too few grid cells span the layer.',
    },
    q6: {
      type: 'mcq',
      q: 'A lattice Boltzmann cylinder run has $D = 12$ cells, inflow $U = 0.08$ cells per step and $\\tau = 0.519$, giving $\\mathrm{Re} = 150$. You want $\\mathrm{Re} = 1500$ while keeping $\\tau = 0.519$. Which change does it?',
      choices: [
        'Raise $U$ to 0.8 cells per step.',
        'Make the cylinder 120 cells across, with $U$ unchanged.',
        'Lower $\\tau$ to 0.0519.',
        'Nothing: $\\mathrm{Re}$ is a property of the fluid, so it cannot change at fixed $\\tau$.',
      ],
      answer: 1,
      explain: 'In lattice units $\\mathrm{Re} = 3UD/(\\tau - \\tfrac12)$. At fixed $\\tau$ you can raise $U$ or $D$. Choice 1 gives $\\mathrm{Ma} = \\sqrt3 \\times 0.8 \\approx 1.4$, supersonic, where the method breaks down entirely. Choice 2 works and requires a hundred times the cells and ten times the steps per crossing of the box—a thousand times the total work. Because $\\tau$ must stay above $\\tfrac12$, choice 3 is unphysical, and choice 4 overlooks that $\\mathrm{Re}$ depends on length and speed as well as viscosity.',
    },
  },
  glossary: {
    'reynolds-number': {
      term: 'Reynolds number',
      def: 'The dimensionless ratio $\\mathrm{Re} = UL/\\nu$ of inertia to viscous forces in a flow of speed $U$ past or through something of size $L$. At small $\\mathrm{Re}$ viscosity dominates and disturbances decay; at large $\\mathrm{Re}$ inertia dominates and viscous effects are confined to thin layers.',
      section: 'reynolds-1883',
    },
    laminar: {
      term: 'laminar flow',
      def: 'Orderly flow in which neighbouring layers slide past each other without mixing; Reynolds’s “direct” motion. In a pipe it persists below a Reynolds number of about 2,000, and above that only while disturbances stay small.',
      section: 'reynolds-1883',
    },
    turbulent: {
      term: 'turbulent flow',
      def: 'Irregular, three-dimensional, strongly mixing flow with eddies over a wide range of sizes; Reynolds’s “sinuous” motion. It appears at high Reynolds numbers.',
      section: 'reynolds-1883',
    },
    'dimensional-analysis': {
      term: 'dimensional analysis',
      def: 'Using the requirement that a physical law cannot depend on the choice of units to find the form of the law, in terms of dimensionless groups, before any experiment or solution.',
      section: 'dimensional-analysis',
    },
    'buckingham-pi': {
      term: 'Buckingham Π theorem',
      def: 'A law among $n$ variables whose units involve $r$ independent base dimensions can be written as a relation among $n - r$ dimensionless groups, $\\Pi_1 = \\phi(\\Pi_2, \\ldots, \\Pi_{n-r})$ (Buckingham 1914).',
      section: 'dimensional-analysis',
    },
    'dimensionless-number': {
      term: 'dimensionless number',
      def: 'A combination of physical quantities whose units cancel, so it has the same value in every system of units. Named ones, such as $\\mathrm{Re}$, $\\mathrm{Ma}$ and $\\mathrm{Fr}$, each compare two effects.',
      section: 'dimensional-analysis',
    },
    'drag-coefficient': {
      term: 'drag coefficient',
      def: 'The drag force divided by the dynamic pressure $\\tfrac12\\rho U^2$ times a reference area: $C_D = F/(\\tfrac12\\rho U^2 A)$. For a sphere it depends only on the Reynolds number (and roughness).',
      section: 'dimensional-analysis',
    },
    'mach-number': {
      term: 'Mach number',
      def: 'The ratio $\\mathrm{Ma} = U/c$ of flow speed to the speed of sound. Density changes are of order $\\mathrm{Ma}^2/2$, so flows below about 0.3 can be treated as incompressible. Named by Ackeret in 1929.',
      section: 'numbers',
    },
    'froude-number': {
      term: 'Froude number',
      def: 'The ratio $\\mathrm{Fr} = U/\\sqrt{gL}$ of flow speed to the speed of surface gravity waves. It governs flows with a free surface, such as ships and rivers.',
      section: 'numbers',
    },
    'strouhal-number': {
      term: 'Strouhal number',
      def: 'The dimensionless frequency $\\mathrm{St} = f_s L/U$ of an unsteady flow. For vortex shedding behind a cylinder it is about 0.2 over a wide range of Reynolds numbers.',
      section: 'numbers',
    },
    similarity: {
      term: 'similarity',
      def: 'Two flows are similar when they have the same shape at different sizes and the same values of every relevant dimensionless group. Their dimensionless results, such as drag coefficients, are then equal.',
      section: 'models',
    },
    'friction-factor': {
      term: 'friction factor',
      def: 'The Darcy friction factor $f$ in $\\Delta p = f\\,(L/D)\\,\\tfrac12\\rho U^2$ for the pressure drop along a pipe. It depends on the Reynolds number and the relative roughness: $64/\\mathrm{Re}$ in laminar flow, Colebrook’s implicit formula in turbulent flow.',
      section: 'correlations',
    },
  },
  pathologies: [
    {
      id: 'fixed-point-divergence',
      name: 'Iteration thrown out of its domain',
      family: 'solver',
      symptom: 'An iterative solve for an implicit formula (Colebrook’s friction factor, an equation of state, or a nonlinear implicit time step) returns NaN or a non-physical value for certain starting guesses or inputs, while succeeding on neighbouring calls.',
      cause: 'Convergence theorems for fixed-point and Newton iteration are local: fixed-point iteration contracts when $|g\'(x)| < 1$ near the root, and Newton’s method converges quadratically once the guess is close enough. Far from the root a single step can land where the formula is undefined. For Colebrook with $f_0 = 10^{-10}$ at $\\mathrm{Re} = 10^4$, $x = 1/\\sqrt{f}$ starts at $10^5$, the first step lands near $x = -2$, and the next evaluation takes the logarithm of a negative number.',
      diagnose: 'Log the iterates and the residual at each step. Divergence from a poor initial guess shows up as an iterate leaving the physical range (here $x \\le 0$) in the first step or two, whereas rerunning from a closer starting guess converges normally.',
      mitigations: [
        'Start from an explicit approximation (such as Haaland’s formula for Colebrook), which is inexpensive and usually within a few per cent of the root, where both methods contract.',
        'Safeguard each step by shortening any update that leaves the domain (the figure halves $x$) or falling back to bisection on a bracket.',
        'Check the residual of the returned value before accepting it, catching both non-convergence and convergence to a spurious root.',
        'Estimate the contraction factor $|g\'|$ near the root, and switch from fixed-point iteration to Newton’s method when $|g\'|$ is close to 1.',
      ],
      section: 'correlations',
      demo: { widget: 'similarity-moody', data: { preset: 'bad-start' } },
    },
  ],
  css: `
.chapter[data-chapter="similarity"] table caption { caption-side: top; text-align: left; color: var(--muted); font-size: 0.9rem; padding-bottom: 4px; }
`,
};
