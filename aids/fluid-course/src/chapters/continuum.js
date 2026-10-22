// Chapter 1 · continuum: What is a fluid?
// Widgets live in ./continuum/*.js; the physics kernels they run are
// src/sims/molecules.js (MD box, Poisson gas, gas facts) and closed-form
// laws (constitutive laws, hydrostatics, diffusion series).

import { mountShear } from './continuum/shear.js';
import { mountSample } from './continuum/sample.js';
import { mountKnudsen } from './continuum/knudsen.js';
import { mountChannel } from './continuum/channel.js';
import { mountBuoyancy } from './continuum/buoyancy.js';
import { mountParcel } from './continuum/parcel.js';

export const chapter = {
  id: 'continuum',
  title: 'What is a fluid?',
  short: 'What is a fluid?',
  blurb: 'Molecules, averages and the continuum hypothesis, and viscosity as the diffusion of momentum.',
  minutes: 40,
  html: String.raw`
<p class="lead-in">Water is made of molecules, and so is air. A cupful holds about $10^{25}$ of them, each jiggling at hundreds of metres per second. Yet every equation in this course treats water and air as smooth stuff, with a density, a velocity and a pressure at every point. This chapter is about why that works, when it stops working, and the two properties that make a fluid a fluid: it cannot resist being sheared, only resist being sheared <em>quickly</em>, and when it is still it can push only straight on. Along the way you will measure a viscosity from a box of molecules, and meet the trade-off that every simulation in the rest of the course has to make.</p>

<h2 id="deforms">What makes a fluid a fluid</h2>

<p>Put a block of rubber on a table, glue its bottom down, and push its top sideways. It leans over by some amount and stops. Hold the push steady and it stays leaning; let go and it springs back. Now do the same to a layer of honey trapped between two plates. However gently you push the top plate, it keeps moving, and the honey keeps deforming for as long as you push. Let go and the honey stays wherever it was left. Nothing pulls it back.</p>

<p>That difference is the definition. A force spread over an area, acting <em>along</em> the surface rather than into it, is a <dfn data-term="shear-stress">shear stress</dfn> $\tau$, measured in pascals (newtons per square metre). A solid under a shear stress deforms by a fixed amount. A <dfn data-term="fluid">fluid</dfn> is a material that keeps deforming for as long as <em>any</em> shear stress acts on it, however small <a href="#src-batchelor">[1]</a>. Liquids and gases are both fluids. The difference between them, that a gas fills its container and a liquid keeps a free surface, matters far less to the flow than this shared inability to hold a shear stress.</p>

<p>The deformation is measured by how far the layer leans. If the top of a layer of thickness $h$ has moved sideways by $\Delta x$ relative to the bottom, the <em>shear strain</em> is $\gamma = \Delta x / h$, the tangent of the angle the material has leaned through. Its rate of change is the <dfn data-term="strain-rate">strain rate</dfn> $\dot\gamma$. If the top plate moves at speed $U$, then $\dot\gamma = U/h$, and for a layer whose velocity $u$ changes smoothly with height, $\dot\gamma = \mathrm{d}u/\mathrm{d}y$. A solid's stress depends on the strain; for small strains it is proportional to it, with a shear modulus $G$:</p>

<div class="eq" id="eq-hooke">$$\tau = G\,\gamma \qquad \text{(Hookean solid)}$$<span class="eq-tag">(1.1)</span></div>

<p>The simplest fluid's stress depends on the strain <em>rate</em> instead, with a constant of proportionality $\mu$ called the viscosity:</p>

<div class="eq" id="eq-newton">$$\tau = \mu\,\dot\gamma = \mu\,\frac{\mathrm{d}u}{\mathrm{d}y} \qquad \text{(Newtonian fluid)}$$<span class="eq-tag">(1.2)</span></div>

<p>A fluid that obeys (1.2) with a $\mu$ that does not depend on how fast it is sheared is a <dfn data-term="newtonian-fluid">Newtonian fluid</dfn>. Air and water are Newtonian to very high accuracy, and so is almost everything in this course. Because a fluid at rest has $\dot\gamma = 0$, it carries no shear stress at all—a property on which the section on <a href="#/continuum/pressure">pressure</a> rests.</p>

<p>Many everyday fluids are not Newtonian. Paint, ketchup and blood are <em>shear-thinning</em>, meaning that the faster they are sheared, the less they resist—which is why paint spreads easily under a brush without running down the wall. A power law is the usual first model. Toothpaste and mayonnaise have a <em>yield stress</em> $\tau_y$, holding their shape like a soft solid below that threshold and flowing above it. Bingham's 1916 study of "plastic flow" gave the simplest model of that <a href="#src-bingham">[3]</a>:</p>

<div class="eq" id="eq-nonnewtonian">$$\tau = K\,\dot\gamma^{\,n}\ \ (n < 1,\ \text{shear-thinning}), \qquad \begin{cases} \dot\gamma = 0 & |\tau| \le \tau_y \\ \tau = \tau_y + \mu_p\,\dot\gamma & \tau > \tau_y \end{cases}\ \ (\text{Bingham})$$<span class="eq-tag">(1.3)</span></div>

<p>Strictly, a yield-stress material is not a fluid by the definition above, since it can hold a small shear stress for ever. Rheology, the science of how materials flow, is full of such in-between cases <a href="#src-barnes">[2]</a>. The predict question and the figure below put all four behaviours side by side.</p>

<div data-quiz="q1"></div>

<figure data-widget="continuum-shear"><figcaption>Four materials in identical shear cells under the same shear stress τ, in units where $G = \mu = K = \mu_p = 1$ and $\tau_y = 0.5$. The dye lines are material lines that started vertical. The plot shows stress against strain (trails over the last 12 s) or against strain rate (the steady flow curves of (1.1)–(1.3)).</figcaption></figure>

<div class="try"><ol>
<li>Leave τ at 0.3 and watch the strain plot. The solid's dot climbs the Hooke line and stops; the two liquids run off to the right; the paste stays put, because 0.3 is below its yield stress.</li>
<li>Press <b>Let go</b>. The solid snaps back to zero strain, whereas the liquids stop immediately and remain sheared because no elastic restoring force pulls them back to their initial configuration.</li>
<li>Push τ above 0.5 and the paste starts to flow. Bring it back below 0.5 and it stops, still deformed.</li>
<li>Set τ to 0.05 and switch the plot to strain rate. The Newtonian liquid still flows at $\dot\gamma = 0.05$; the shear-thinning one crawls at $\dot\gamma = \tau^2 = 0.0025$, but it never stops. Note how its apparent viscosity $\tau/\dot\gamma$ in the readouts rises as the stress falls.</li>
<li>Drag sideways across the cells to push in the other direction.</li>
</ol></div>

<aside class="note" data-label="It depends on how long you wait">Whether something "flows" depends on the time you allow. Pitch looks solid and shatters under a hammer. In the University of Queensland's pitch-drop experiment, set up by Thomas Parnell in 1927, it drips through a funnel about once a decade; its viscosity was estimated at about $2 \times 10^{8}$ Pa·s, some $10^{11}$ times that of water <a href="#src-pitch">[4]</a>. The opposite story, that old cathedral windows are thicker at the bottom because the glass has flowed, is a myth, since at room temperature window glass would need far longer than recorded history to flow measurably <a href="#src-zanotto">[5]</a>.</aside>

<details class="deeper"><summary>Go deeper: why a strain rate is a velocity gradient</summary>
<p>Take two points in the fluid, one at height $y$ and one at $y + \delta y$ directly above it. In a time $\delta t$ the lower one moves $u(y)\,\delta t$ and the upper one $u(y + \delta y)\,\delta t$. The line joining them, which started vertical, now leans by</p>
<p>$$\delta\gamma = \frac{u(y+\delta y) - u(y)}{\delta y}\,\delta t \quad\Longrightarrow\quad \dot\gamma = \frac{\delta\gamma}{\delta t} \to \frac{\partial u}{\partial y}.$$</p>
<p>So the shear rate at a point is the local velocity gradient. In a general three-dimensional flow there are several such gradients, and the relevant combination is the strain-rate tensor, which <a href="#/viewpoints/deformation">Two ways of watching a flow</a> takes apart. Newton's law (1.2) then generalises to a stress tensor proportional to the strain-rate tensor, which is how the viscous term of the Navier–Stokes equations is built in <a href="#/conservation/navier-stokes">the conservation-laws chapter</a>.</p>
</details>

<h2 id="continuum">Molecules and the continuum hypothesis</h2>

<p>In a real gas or liquid, a mathematical point contains either a molecule or, much more likely, empty space. Defining a continuum density at a point therefore requires averaging the mass $\Delta m$ inside a small volume $\Delta V$ around that point:</p>

<div class="eq" id="eq-density">$$\rho(\mathbf{x}) = \frac{\Delta m}{\Delta V}, \qquad (\text{molecular spacing})^3 \ll \Delta V \ll L^3$$<span class="eq-tag">(1.4)</span></div>

<p>The volume has to be small but not too small. It must be small compared with $L$, the length over which the flow changes, or the average smears the flow out. It must be large compared with the space per molecule, or the count jumps about at random as molecules wander in and out. Batchelor's classic text draws this as a curve of $\Delta m/\Delta V$ against $\Delta V$ that is noisy on the left, flat in the middle, and drifting on the right <a href="#src-batchelor">[1]</a>. The <dfn data-term="continuum-hypothesis">continuum hypothesis</dfn> is the assumption that this plateau exists, meaning that there is a range of volumes holding enough molecules to average away discrete fluctuations while remaining small compared with $L$.</p>

<p>How many is enough? If molecules are scattered at random, the number $N$ in a sample volume fluctuates about its mean $\langle N \rangle$ by roughly its square root, so the relative noise is</p>

<div class="eq" id="eq-noise">$$\frac{\sigma_N}{\langle N\rangle} = \frac{1}{\sqrt{\langle N \rangle}}$$<span class="eq-tag">(1.5)</span></div>

<p>One per cent precision needs $10^4$ molecules; 0.1 per cent needs $10^6$. Air at 0 °C and one atmosphere holds $2.7 \times 10^{25}$ molecules per cubic metre, so a cube $0.07\ \mu\text{m}$ on a side already reaches 1 per cent, and a cube $0.33\ \mu\text{m}$ on a side reaches 0.1 per cent. Liquid water is about a thousand times denser in molecules, and reaches 1 per cent in a cube under 7 nm across. Almost every flow you will ever simulate varies over millimetres or more, so the window between "too small" and "too large" is enormous. That is why the continuum works.</p>

<aside class="who" data-person="daniel-bernoulli">In Hydrodynamica (1738), chapter 10, Bernoulli explained the pressure of air as the effect of impacts by fast-moving particles—an early kinetic theory. It is the first hint that a continuum quantity can be an average over molecules.</aside>

<p>Velocity is an average too, and a much noisier one. Air molecules at room temperature move at about 460 m/s on average, in random directions. A gentle breeze of 1 m/s is a tiny drift on top of that thermal storm. The mean velocity of $N$ molecules has thermal noise of about $\sqrt{k_B T/(m N)}$ in each component, following the same $1/\sqrt{N}$ scaling in units of the thermal speed $\sqrt{k_B T/m}$.</p>

<div data-quiz="q2"></div>

<figure class="wide" data-widget="continuum-sample"><figcaption>Left: 400 soft disks (a two-dimensional molecular dynamics box, the kernel in <code>sims/molecules.js</code>) cut into averaging cells. Arrows show each cell's mean velocity; the tint shows its molecule count above (warm) or below (cool) the average. Right: relative noise against the number of molecules per sample. Blue points are the density noise of an ideal gas (200 random sample boxes per size); orange points are the velocity noise measured in the box, accumulated for each cell size you visit.</figcaption></figure>

<div class="try"><ol>
<li>Slide the averaging cells from 24 × 16 down to 3 × 2. The arrows shrink from random darts (about one molecule per cell) to near zero, and each new orange point lands near the $1/\sqrt{N}$ line. Give each size a few seconds to collect.</li>
<li>Go to 2 × 1. The point dips below the line. The box's total momentum is fixed at zero, so the two halves must cancel each other; the readout's second prediction, $\sqrt{(1 - N/N_{\text{total}})/N}$, allows for that. Over a few seconds the point can sit lower still because the motion of half the box is a large, slow mode, so a short window samples only a few independent values. At 1 × 1 the noise is zero because the single cell averages the entire box.</li>
<li>Switch to <b>Hidden vortices</b>. The molecules carry four counter-rotating vortices of speed 1 on top of their thermal motion. At 24 × 16 cells you cannot see them; at 3 × 2 or 4 × 3 they are obvious; at 2 × 1 they average away again. Resolving the vortices requires cells that are large enough to average out thermal motion yet small enough not to average out the flow itself.</li>
<li>Keep watching: the vortices fade over 10 to 20 time units. Their motion is diffusing away as heat, which is viscosity at work (next section). Watch the dotted "vortex speed" line on the plot sink into the noise.</li>
</ol></div>

<aside class="pitfall">Averages over too few particles are mostly noise. Molecular simulations live with it, and so do the particle methods of <a href="#/lattice-particles/sph">Lattice Boltzmann and particles</a>, where each "particle" is a blob of fluid and every density is a weighted sum over a few dozen neighbours. See <a href="#/pathologies">molecular noise</a> in the gallery.</aside>

<p>The continuum can also fail for a second, deeper reason. In a gas, local averages behave like a continuum only if molecules collide often enough, over the length scale of the flow, to share their momentum and energy. The average distance a molecule travels between collisions is the <dfn data-term="mean-free-path">mean free path</dfn>. Clausius introduced the idea in 1858 and Maxwell added the factor $\sqrt 2$ in 1860, which accounts for the motion of the molecules being hit <a href="#src-clausius">[10]</a><a href="#src-maxwell1860">[11]</a>. For hard spheres of diameter $d$ in a gas at pressure $p$ and temperature $T$,</p>

<div class="eq" id="eq-mfp">$$\lambda = \frac{k_B T}{\sqrt{2}\,\pi d^2 p}$$<span class="eq-tag">(1.6)</span></div>

<p>With an effective diameter of $3.7 \times 10^{-10}$ m, air at 20 °C and one atmosphere gives $\lambda \approx 66$ nm, in line with published values of 65 to 68 nm <a href="#src-bird">[6]</a>. Dividing by the length scale $L$ of the flow gives the <dfn data-term="knudsen-number">Knudsen number</dfn>:</p>

<div class="eq" id="eq-knudsen">$$\mathrm{Kn} = \frac{\lambda}{L}$$<span class="eq-tag">(1.7)</span></div>

<p>It is named after Martin Knudsen, whose 1909 paper on gases flowing through tubes treated "molecular flow", in which molecules hit the walls more often than each other <a href="#src-knudsen">[9]</a>. The usual bands are: below 0.01, the continuum equations with no-slip walls work; from 0.01 to 0.1, they still work in the bulk but the gas slips along walls; from 0.1 to 10 is a transition regime that needs a molecular description; above 10 the flow is free-molecular <a href="#src-karniadakis">[8]</a>. Three places where engineers meet large Knudsen numbers are rarefied gas high in the atmosphere, tiny devices, and the inside of shock waves, which in a gas are only a few mean free paths thick <a href="#src-vincenti">[7]</a>. Liquids have no useful mean free path, since their molecules are always touching; studies of flow in nanometre channels find that, away from the walls, the continuum description of water holds down to a few nanometres <a href="#src-bocquet">[14]</a>.</p>

<figure data-widget="continuum-knudsen"><figcaption>The Knudsen number of air for a scenario you pick or numbers you set, using (1.6) and (1.7). Atmosphere values are from the U.S. Standard Atmosphere 1976 <a href="#src-ussa">[15]</a>. The lower scale puts the mean free path λ and the length L on the same log axis, where their separation gives $\mathrm{Kn}$.</figcaption></figure>

<div class="try"><ol>
<li>Step through the scenarios from the room to the vacuum chamber. Together they span all four regimes—an airliner's wing is as safely in the continuum regime as a room, whereas a re-entering capsule at 100 km altitude, with a mean free path of about 14 cm, lies in the transition regime.</li>
<li>Pick the 1 µm channel, then lower the pressure. Halving the pressure has the same effect on $\mathrm{Kn}$ as halving $L$, because $\lambda$ scales inversely with pressure.</li>
<li>Pick the 10 nm gap and read "molecules in a cube of side L", which is about 25. A density averaged over such a cube is uncertain by 20 per cent, so here both reasons for failure arrive together.</li>
</ol></div>

<div data-quiz="q3"></div>

<details class="deeper"><summary>Go deeper: where $1/\sqrt{N}$ and the mean free path come from</summary>
<p><b>Counting noise.</b> Split the sample volume into many tiny pieces, each holding a molecule with a small probability, independently. The count is then a sum of many independent Bernoulli variables, giving a Poisson distribution whose variance equals its mean, $\sigma_N^2 = \langle N\rangle$. Dividing the standard deviation by the mean yields (1.5). Applying the same argument to velocities gives the noise of the sample mean, since the variance of a sum of $N$ independent velocities is $N k_B T/m$ and the variance of their mean is $k_B T/(mN)$. The orange points still scatter slightly about the theoretical line for three reasons: the molecule count in each cell fluctuates, the box's total momentum is fixed, and the motion of a large cell evolves slowly enough that a few seconds of observation provide only a few independent samples.</p>
<p><b>Mean free path.</b> A molecule of diameter $d$ moving a distance $\ell$ hits every molecule whose centre lies within $d$ of its path, sweeping out a cylinder of volume $\pi d^2 \ell$. With $n$ molecules per unit volume, the expected number of collisions is $n \pi d^2 \ell$, which equals one when $\ell = 1/(\pi d^2 n)$. Accounting for the motion of the target molecules raises the mean relative speed by a factor of $\sqrt 2$ and shortens the free path by the same factor; substituting $n = p/(k_B T)$ for an ideal gas gives (1.6).</p>
</details>

<h2 id="viscosity">Viscosity: the diffusion of momentum</h2>

<p>Return to the honey between plates. The top plate moves, the bottom one does not, and in between the velocity falls from one to the other. Each layer drags the layer below forwards and is held back by it. The internal friction that does this is the <dfn data-term="viscosity">viscosity</dfn> $\mu$ of (1.2), measured in pascal seconds.</p>

<aside class="who" data-person="isaac-newton">In the Principia (1687), Book II, Section IX, Newton stated the hypothesis behind (1.2) in words. In Motte's translation: "The resistance arising from the want of lubricity in the parts of a fluid, is, cæteris paribus, proportional to the velocity with which the parts of the fluid are separated from each other."</aside>

<aside class="history" data-era="1687">The formula $\tau = \mu\,\mathrm{d}u/\mathrm{d}y$, often called "Newton's law of viscosity", is not in the Principia. Newton gave only a proportionality, and he did not fully trust it, writing in a later scholium that "it is in truth probable that the resistance is in a less ratio than that of the velocity". A viscosity constant entered the equations of motion with <a href="#/people/claude-louis-navier">Navier</a> (read 1822, printed 1827), and after Cauchy, Poisson and Saint-Venant, <a href="#/people/george-gabriel-stokes">Stokes</a> (read 1845, printed 1847) gave the continuum account and the letter $\mu$.</aside>

<p>Where does the friction come from? In a gas, molecules fly between layers. A molecule that crosses from a fast layer into a slow one carries extra forward momentum with it; one that crosses the other way carries a deficit. The net effect is a flux of forward momentum from fast layers to slow ones, which manifests as a shear stress. Viscosity in a gas is the transport of momentum by molecular motion, just as heat conduction is the transport of energy. In a liquid, molecules are packed shoulder to shoulder, and momentum passes mainly through their forces on each other as they squeeze past their neighbours.</p>

<p>Two related coefficients appear in the equations of motion. The dynamic viscosity $\mu$ sets the stress for a given shear, but because that stress accelerates fluid of density $\rho$, the rate at which a velocity difference spreads is governed by the <dfn data-term="kinematic-viscosity">kinematic viscosity</dfn></p>

<div class="eq" id="eq-nu">$$\nu = \frac{\mu}{\rho} \qquad [\mathrm{m^2/s}]$$<span class="eq-tag">(1.8)</span></div>

<p>Its units ($\mathrm{m^2/s}$) are those of a diffusivity because it governs the diffusion of momentum. For a layered flow $u(y, t)$, a force balance on a thin slab (see below) gives</p>

<div class="eq" id="eq-momentum-diffusion">$$\frac{\partial u}{\partial t} = \nu\,\frac{\partial^2 u}{\partial y^2}$$<span class="eq-tag">(1.9)</span></div>

<p>the same <dfn data-term="diffusion-equation">diffusion equation</dfn> that governs heat in a rod. A velocity difference spreads a distance $L$ in a time of order $L^2/\nu$. Stokes noticed in 1850 (printed 1851) that the ratio $\mu/\rho$ is what governs the motion and called it the "index of friction"; the name "kinematic viscosity" and the letter $\nu$ came later.</p>

<table>
<caption>Viscosities near 20 °C and 1 atm. The last column is $L^2/\nu$ for $L = 1$ cm.</caption>
<thead><tr><th>Fluid</th><th class="num">$\rho$ (kg/m³)</th><th class="num">$\mu$ (Pa·s)</th><th class="num">$\nu$ (m²/s)</th><th class="num">time to spread 1 cm</th></tr></thead>
<tbody>
<tr><td>Air</td><td class="num">1.20</td><td class="num">$1.81 \times 10^{-5}$</td><td class="num">$1.5 \times 10^{-5}$</td><td class="num">7 s</td></tr>
<tr><td>Water</td><td class="num">998</td><td class="num">$1.00 \times 10^{-3}$</td><td class="num">$1.0 \times 10^{-6}$</td><td class="num">100 s</td></tr>
<tr><td>Olive oil (typical)</td><td class="num">≈ 910</td><td class="num">≈ 0.08</td><td class="num">≈ $9 \times 10^{-5}$</td><td class="num">≈ 1 s</td></tr>
<tr><td>Glycerine (pure)</td><td class="num">1261</td><td class="num">1.41</td><td class="num">$1.1 \times 10^{-3}$</td><td class="num">0.09 s</td></tr>
<tr><td>Honey (typical)</td><td class="num">≈ 1400</td><td class="num">≈ 10</td><td class="num">≈ $7 \times 10^{-3}$</td><td class="num">≈ 0.01 s</td></tr>
</tbody>
</table>

<p>Sources: water from the IAPWS 2008 formulation <a href="#src-iapws">[19]</a>; air from Sutherland's law with the constants tabulated by White <a href="#src-white">[20]</a>; glycerine from Segur and Oberstar <a href="#src-segur">[21]</a>, whose tables show that even a few per cent of water lowers it sharply. Olive oil and honey vary from sample to sample, so their rows list representative values—olive oil's viscosity depends on its fatty-acid composition as well as on temperature <a href="#src-bonnet">[22]</a>, and honey's depends strongly on its water content <a href="#src-honey">[23]</a>.</p>

<div data-quiz="q4"></div>

<p>Temperature affects liquids and gases in opposite directions. Heating water from 20 °C to 80 °C cuts its viscosity by a factor of 2.8, to $0.35 \times 10^{-3}$ Pa·s <a href="#src-iapws">[19]</a>; <a href="#/people/gotthilf-hagen">Hagen</a> already noticed a strong effect of water temperature in his 1839 pipe experiments. Honey is more sensitive still, with activation energies measured by Yanniotis and colleagues corresponding to a viscosity drop of 2.5 to 3.5 times for every 10 °C between 25 and 35 °C <a href="#src-honey">[23]</a>, as warmer molecules squeeze past each other more easily. Air behaves oppositely, its viscosity rising by about 15 per cent (to $2.09 \times 10^{-5}$ Pa·s) from 20 °C to 80 °C because faster molecules transport momentum between layers more rapidly. Moreover, a gas's viscosity is nearly independent of pressure. Maxwell predicted this in 1860 and confirmed it with his own experiments on air, presented in his Bakerian Lecture (read 1866) <a href="#src-maxwell1866">[12]</a>, showing that halving the pressure halves the number of momentum carriers while doubling the mean free path over which each one carries momentum.</p>

<p>The figure below measures a viscosity from molecules. The channel holds the same soft disks as before, now between two walls that re-emit every molecule that hits them with the wall's velocity and temperature. Start the walls sliding, or push the gas along with a steady force, and watch momentum diffuse in from the walls. The dashed curve solves (1.9) with $\nu = 1.1$ in molecular units, the value measured in these boxes.</p>

<figure class="wide" data-widget="continuum-channel"><figcaption>Left: 400 soft disks between thermal walls; arrows show the mean velocity of 12 horizontal slabs. Right: the slab averages (points) beside the continuum solution of (1.9) with no slip at the walls (dashed), both smoothed over 3 time units. Units: molecular diameter σ, time τ = σ√(m/ε). After the flow settles, a long average fits the profile.</figcaption></figure>

<div class="try"><ol>
<li>With <b>Sliding walls</b>, press Play. The molecules next to each wall pick up its speed first, and the momentum diffuses inwards from both sides. The middle stays at rest by symmetry, and the profile straightens within about 10 time units because the gap is shared by two diffusion fronts, giving a decay time of $L^2/(4\pi^2\nu) \approx 8$, a quarter of the single-front value $L^2/(\pi^2\nu)$. The settled profile is the straight line of (1.2).</li>
<li>Switch to <b>Pushed channel</b>. A force pushes every molecule, but the walls hold the edges back, and the profile grows into a parabola over about 30 time units, the viscous time $L^2/(\pi^2\nu)$. Wait for the long average (starting at $t = 100$), which estimates $\nu$ from the curvature. Over eight runs it came out between 1.06 and 1.19 once the average had run to $t = 250$; press Restart for a fresh run with new molecules. The gas also warms up from viscous heating.</li>
<li>Turn the wall grip down to 0. Molecules now bounce off the walls like mirrors and keep their forward momentum. The sliding walls drag nothing, and the pushed gas slides as a plug, speeding up for ever. Intermediate grip values produce partial slip, as shown by the "slip at the walls" readout.</li>
</ol></div>

<aside class="note" data-label="No slip is a molecular fact">Whether a fluid slips along a wall was argued over for decades. Navier's 1822 memoir included a slip condition; <a href="#/people/jean-leonard-marie-poiseuille">Poiseuille</a>'s 1840 measurements in glass capillaries found flow rates that grow with the fourth power of the diameter, which matches no slip. For ordinary flows no slip is right, because molecules hitting a wall leave with the wall's velocity on average. The last item above relaxes that condition artificially, while the Knudsen number indicates when it fails in practice—in the slip regime ($0.01 < \mathrm{Kn} < 0.1$), gases slide measurably along solid walls.</aside>

<details class="deeper"><summary>Go deeper: from Newton's law to the diffusion equation</summary>
<p>Take a thin horizontal slab of fluid, of thickness $\delta y$ and unit area, in a flow $u(y,t)$ along $x$. Its mass is $\rho\,\delta y$. The fluid above pulls it forwards with stress $\tau(y + \delta y)$; the fluid below holds it back with $\tau(y)$. Newton's second law for the slab gives</p>
<p>$$\rho\,\delta y\,\frac{\partial u}{\partial t} = \tau(y+\delta y) - \tau(y) \quad\Longrightarrow\quad \rho\,\frac{\partial u}{\partial t} = \frac{\partial \tau}{\partial y} = \frac{\partial}{\partial y}\!\left(\mu\,\frac{\partial u}{\partial y}\right).$$</p>
<p>For constant $\mu$, dividing by $\rho$ gives (1.9). A body force $g$ per unit mass adds $g$ to the right-hand side; in steady state $\nu\,u'' = -g$, whose solution with $u = 0$ at both walls is the parabola $u = g\,y(L - y)/(2\nu)$. The figure fits a parabola to the measured profile and reads $\nu$ off its curvature. This is the simplest case of the Navier–Stokes momentum equation of <a href="#/conservation/navier-stokes">the conservation-laws chapter</a>, with no pressure gradient and no convection.</p>
<p>For a computer, (1.9) brings a warning. The fastest-decaying pattern on a grid of spacing $\Delta y$ dies on a time scale of order $\Delta y^2/\nu$, and a simple explicit time step must be shorter than about $\Delta y^2/(2\nu)$ or the solution blows up. Halving the grid spacing reduces the maximum stable time step by a factor of four, a constraint examined in <a href="#/stiffness/heat">Diffusion and stiffness</a>.</p>
</details>

<details class="deeper"><summary>Go deeper: a viscosity from kinetic theory</summary>
<p>Molecules crossing a plane in a shear flow come, on average, from about one mean free path away, where the flow speed differs by about $\lambda\,\mathrm{d}u/\mathrm{d}y$. About $n\bar c$ of them cross each unit area per unit time in each direction, up to a numerical factor, each carrying a momentum excess of order $m\lambda\,\mathrm{d}u/\mathrm{d}y$. The momentum flux, which is the shear stress, is therefore of order $\rho\,\bar c\,\lambda\,\mathrm{d}u/\mathrm{d}y$, and the crude kinetic estimate is</p>
<p>$$\mu \approx \tfrac{1}{3}\,\rho\,\bar c\,\lambda.$$</p>
<p>Since $\lambda \propto 1/n$ and $\rho \propto n$, the number density cancels out, yielding Maxwell's pressure independence. With $\rho = 1.20$ kg/m³, $\bar c = 463$ m/s and $\lambda = 66$ nm this gives $1.2 \times 10^{-5}$ Pa·s, two-thirds of the measured $1.81 \times 10^{-5}$. The careful theory of Chapman and Enskog for hard spheres, with the same diameter, gives $1.80 \times 10^{-5}$ Pa·s. That close agreement is partly built in, because effective molecular diameters are themselves inferred from measurements such as viscosity <a href="#src-vincenti">[7]</a>. Both formulas also predict $\mu \propto \sqrt{T}$; real air rises somewhat faster, because real molecules are softer than billiard balls.</p>
</details>

<h2 id="pressure">Pressure and hydrostatics</h2>

<p>A fluid at rest carries no shear stress, so the only force it can exert on a surface is a push straight into it. That push per unit area is the <dfn data-term="pressure">pressure</dfn> $p$. At any point in a fluid at rest it acts equally in all directions (see below), so it is represented by a scalar field. Molecularly, it is the momentum delivered by molecules bouncing off the surface, plus, in a liquid, the forces between neighbouring molecules. In a moving fluid the stress also has viscous parts, and the full bookkeeping is the stress tensor of <a href="#/conservation/momentum">the conservation-laws chapter</a>; but pressure remains its isotropic part.</p>

<aside class="who" data-person="archimedes">On Floating Bodies opens with a postulate about how the parts of a fluid press on each other, the oldest ancestor of the idea of pressure. In Heath's translation: "Let us assume that a fluid has the property that, if its parts lie evenly and are continuous, the part which is less compressed is expelled by that which is more compressed, and each of its parts is compressed by the fluid above it perpendicularly…" Propositions 5 to 7 prove the buoyancy result. The bath and the crown ("Eureka!") are a legend, told by Vitruvius about two centuries later.</aside>

<p>In a liquid at rest under gravity, consider a thin vertical column of cross-section $A$ and height $\delta z$. Its weight $\rho g A\,\delta z$ must be carried by the difference between the pressures on its bottom and its top. So pressure grows with depth $h$ below a free surface where the pressure is $p_0$:</p>

<div class="eq" id="eq-hydrostatic">$$\frac{\mathrm{d}p}{\mathrm{d}z} = -\rho g \quad\Longrightarrow\quad p = p_0 + \rho g h$$<span class="eq-tag">(1.10)</span></div>

<p>With $\rho = 998$ kg/m³ and $g = 9.81$ m/s², each metre of fresh water adds 9.8 kPa, so 10 m down the absolute pressure is $101.3 + 97.9 \approx 199$ kPa, or about two atmospheres. Every 10 m of water adds roughly one atmosphere, which is why divers count depth in tens of metres. Running (1.10) in reverse gives a barometer, since atmospheric pressure $p_0$ supports a liquid column of height $p_0/(\rho g)$—about 0.76 m of mercury (at 0 °C) or 10.35 m of water.</p>

<aside class="who" data-person="evangelista-torricelli">In a letter of 11 June 1644 Torricelli explained the column of mercury in a sealed tube by the weight of the outside air: "We live immersed at the bottom of a sea of elemental air, which by experiment undoubtedly has weight." He estimated air at about one four-hundredth of the weight of water. The tube experiment itself was carried out by his colleague Viviani.</aside>

<p>Equation (1.10) has two direct consequences for vessels of arbitrary shape. First, the pressure at a given depth depends only on that depth, regardless of the shape of the container or the total volume of liquid above. <a href="#/people/simon-stevin">Stevin</a> showed in 1586 that the bottom of any vessel bears the weight of a vertical column with that bottom as base and the liquid's depth as height, even when the vessel narrows to a thin tube—meaning that on a lock gate, a film of water a hair's breadth wide presses as hard as an ocean of the same depth on the other side. Second, an external pressure applied to a confined liquid is transmitted equally throughout the fluid. If two pistons of areas $A_1$ and $A_2$ close a vessel full of water, the pressures balance and the forces scale with the areas:</p>

<div class="eq" id="eq-pascal">$$\frac{F_2}{F_1} = \frac{A_2}{A_1}$$<span class="eq-tag">(1.11)</span></div>

<aside class="who" data-person="blaise-pascal">Pascal's Traité de l'équilibre des liqueurs (written about 1651–1654, published 1663) called a vessel full of water "a new principle of mechanics, and a new machine for multiplying forces" (our translation), describing the hydraulic press. He explained it by a balance of work, since the large piston moves as much less as its force is greater. Earlier, on 19 September 1648, his brother-in-law Florin Périer carried a mercury barometer up the Puy de Dôme at his request and found the column about three inches lower at the top. The piston example had appeared earlier in Benedetti (1585), as noted by Duhem. The story of "Pascal's barrel", burst by a tall thin tube of water, appears nowhere in his works.</aside>

<p>Now put a solid in the liquid. Every face of it is pushed inwards by the local pressure. The pushes on its sides cancel, but its bottom is deeper than its top, so the upward push on the bottom beats the downward push on the top. For a fully submerged block of horizontal area $A$ and height $a$, the force difference is $\rho g a A$, which equals the weight of the displaced liquid. In general the buoyant force on a body that displaces a volume $V_{\text{sub}}$ of liquid is</p>

<div class="eq" id="eq-buoyancy">$$B = \rho_{\text{liquid}}\, g\, V_{\text{sub}}$$<span class="eq-tag">(1.12)</span></div>

<p>which is Archimedes' principle. A body less dense than the liquid floats with the fraction $\rho_{\text{body}}/\rho_{\text{liquid}}$ of its volume submerged.</p>

<div data-quiz="q5"></div>

<figure data-widget="continuum-buoyancy"><figcaption>A 10 cm cube in a tank with atmospheric pressure $p_0$ on the surface. Arrows show the gauge pressure $p - p_0 = \rho g h$ on each face, scaled to the pressure at the floor. Drag the block, or set its depth, then let go. Densities near 20 °C; the solids are typical values.</figcaption></figure>

<div class="try"><ol>
<li>Drag the aluminium block from just under the surface to the floor. The pressures on its faces grow, but their difference, the buoyancy, stays at 9.8 N.</li>
<li>Lift it until it is half out of the water. Only the submerged half displaces water, and the buoyancy halves.</li>
<li>Choose ice in seawater and let go. It settles with 89 per cent of its volume submerged ($917/1025 = 0.895$).</li>
<li>Choose steel in mercury. Steel floats, with 58 per cent under.</li>
</ol></div>

<aside class="pitfall">Gauges usually read pressure relative to the atmosphere ("gauge pressure"), while the gas laws need absolute pressure. A tyre at "2 bar" holds about 3 bar absolute. In an incompressible flow, only differences in pressure push fluid around, so a solver can add any constant to the pressure and nothing changes; <a href="#/pressure/constraint">The pressure puzzle</a> deals with what that means numerically.</aside>

<details class="deeper"><summary>Go deeper: why pressure has no direction</summary>
<p>Cut a tiny triangular prism out of a fluid at rest, with two faces of areas $A_x$ and $A_y$ facing the $x$ and $y$ directions and a slanted face of area $A_n$ whose normal makes angle $\theta$ with the $x$ axis, so that $A_x = A_n\cos\theta$ and $A_y = A_n\sin\theta$. With no shear stress, each face feels only a normal push, $p_x A_x$, $p_y A_y$ and $p_n A_n$. Balancing the forces in $x$ gives</p>
<p>$$p_x A_x - p_n A_n\cos\theta = 0 \quad\Longrightarrow\quad p_x = p_n,$$</p>
<p>and likewise $p_y = p_n$ in $y$, up to the prism's weight. The weight scales with the volume, which shrinks faster than the face areas as the prism shrinks, so in the limit it drops out. The pressure on a surface at a point is therefore the same whatever way the surface faces. When Cauchy generalised this prism argument into the stress tensor in the 1820s, pressure remained the isotropic part of the stress in a moving fluid whose surface tractions otherwise depend on orientation.</p>
</details>

<h2 id="parcels">Fluid parcels</h2>

<p>Under the continuum hypothesis, we can divide a fluid into <dfn data-term="fluid-parcel">fluid parcels</dfn>—small volumes that move with the local continuum velocity, large enough to contain many molecules yet small enough to be treated as points on the scale of the flow. Each parcel carries a well-defined mass, velocity, density, and temperature, allowing Newton's laws of motion in the next chapters to be applied directly to them.</p>

<p>A parcel is a bookkeeping volume that moves with the local continuum velocity while individual molecules continually thermalise across its boundary. From kinetic theory, molecules diffuse with coefficient $D \approx \lambda\bar c/3$ (about $10^{-5}$ m²/s in air), travelling a micrometre in roughly $10^{-7}$ s. A one-micrometre parcel of air therefore exchanges most of its molecules in about a ten-millionth of a second, yet its total mass remains constant because, on average, equal numbers of molecules cross inward and outward. The figure below illustrates this exchange.</p>

<figure data-widget="continuum-parcel"><figcaption>The gas-at-rest box again. The molecules that start inside the dashed circle are tagged in colour. The plot follows the tagged molecules still inside, and all molecules inside, as fractions of the starting count (about 45).</figcaption></figure>

<div class="try"><ol>
<li>Press Play and watch the tagged molecules leak out. Within 10 to 20 time units about half have left.</li>
<li>Watch the dashed curve: the total count inside jitters but does not drift. Its rms jitter in the readouts settles near 7 per cent—about half the $1/\sqrt{45} \approx 15$ per cent that independent, randomly placed molecules would give. These soft disks cover about a third of the area and keep out of each other's way, so a crowded patch tends to empty and a sparse one to fill, and the count wanders less than it would for independent points. The same resistance to crowding is why a liquid is so hard to compress.</li>
<li>Tag a new parcel a few times. The leak rate varies from run to run; the total does not drift in any of them.</li>
</ol></div>

<p>How big should a parcel be? Big enough that the counting noise of (1.5) is small and, in a gas, several mean free paths across, so that its molecules collide with each other often enough to share one velocity and one temperature. Small enough that the flow hardly changes across it. The noise law and the Knudsen number of the earlier sections measure exactly those two limits, and for everyday flows there are many orders of magnitude between them.</p>

<p>There are two ways to describe a flow made of parcels. You can follow each parcel and record where it goes, or you can stand at fixed places and record what passes. The next chapter, <a href="#/viewpoints/lagrangian-eulerian">Two ways of watching a flow</a>, develops both, under the names <dfn data-term="lagrangian">Lagrangian</dfn> and <dfn data-term="eulerian">Eulerian</dfn>.</p>

<p>The same choice comes back the moment you put a fluid in a computer. A continuum has infinitely many parcels and infinitely many points, and a computer can store only finitely many numbers. So every fluid simulation applies the continuum hypothesis a second time, in reverse. Either it follows a finite set of <em>parcels</em>, each now a sizeable blob carrying its own mass and velocity, as particle methods such as smoothed particle hydrodynamics do, or it stores values at a finite set of <em>places</em>, such as cells of a grid, as finite-volume and lattice methods do. Each approach encounters the resolution limits introduced in this chapter, since using too few particles introduces sampling noise while using overly coarse grid cells smears out small-scale flow features. The rest of this course is about making those choices well.</p>

<h2 id="sources">Sources and further reading</h2>

<ol class="refs">
<li id="src-batchelor">G. K. Batchelor (1967). <i>An Introduction to Fluid Dynamics</i>. Cambridge University Press. Ch. 1: the definition of a fluid, the continuum hypothesis and the sampling-volume argument.</li>
<li id="src-barnes">H. A. Barnes, J. F. Hutton and K. Walters (1989). <i>An Introduction to Rheology</i>. Elsevier. Shear-thinning, yield stress and the models of (1.3).</li>
<li id="src-bingham">E. C. Bingham (1916). An investigation of the laws of plastic flow. <i>Bulletin of the Bureau of Standards</i> 13, 309–353.</li>
<li id="src-pitch">R. Edgeworth, B. J. Dalton and T. Parnell (1984). The pitch drop experiment. <i>European Journal of Physics</i> 5, 198–200.</li>
<li id="src-zanotto">E. D. Zanotto (1998). Do cathedral glasses flow? <i>American Journal of Physics</i> 66, 392–395.</li>
<li id="src-bird">G. A. Bird (1994). <i>Molecular Gas Dynamics and the Direct Simulation of Gas Flows</i>. Oxford University Press. Ch. 1: mean free path and molecular models.</li>
<li id="src-vincenti">W. G. Vincenti and C. H. Kruger (1965). <i>Introduction to Physical Gas Dynamics</i>. Wiley. Kinetic theory of transport, and the structure of shock waves.</li>
<li id="src-karniadakis">G. Karniadakis, A. Beskok and N. Aluru (2005). <i>Microflows and Nanoflows: Fundamentals and Simulation</i>. Springer. Ch. 1: Knudsen-number regimes and slip.</li>
<li id="src-knudsen">M. Knudsen (1909). Die Gesetze der Molekularströmung und der inneren Reibungsströmung der Gase durch Röhren. <i>Annalen der Physik</i> 333 (4th series, 28), 75–130.</li>
<li id="src-clausius">R. Clausius (1858). Ueber die mittlere Länge der Wege, welche bei der Molecularbewegung gasförmiger Körper von den einzelnen Molecülen zurückgelegt werden. <i>Annalen der Physik</i> 181 (= 105), 239–258.</li>
<li id="src-maxwell1860">J. C. Maxwell (1860). Illustrations of the dynamical theory of gases. <i>Philosophical Magazine</i> (4th series) 19, 19–32 and 20, 21–37.</li>
<li id="src-maxwell1866">J. C. Maxwell (1866). On the viscosity or internal friction of air and other gases (Bakerian Lecture, read 8 February 1866). <i>Philosophical Transactions of the Royal Society</i> 156, 249–268.</li>
<li id="src-md">M. P. Allen and D. J. Tildesley (2017). <i>Computer Simulation of Liquids</i>, 2nd ed. Oxford University Press; and J. D. Weeks, D. Chandler and H. C. Andersen (1971). Role of repulsive forces in determining the equilibrium structure of simple liquids. <i>Journal of Chemical Physics</i> 54, 5237–5247. The molecular dynamics behind the figures.</li>
<li id="src-bocquet">L. Bocquet and E. Charlaix (2010). Nanofluidics, from bulk to interfaces. <i>Chemical Society Reviews</i> 39, 1073–1095.</li>
<li id="src-ussa">NOAA, NASA and USAF (1976). <i>U.S. Standard Atmosphere, 1976</i>. U.S. Government Printing Office.</li>
<li id="src-newton">I. Newton (1687). <i>Philosophiae Naturalis Principia Mathematica</i>, Book II, Section IX. English translation by A. Motte (1846 American edition), <a href="https://en.wikisource.org/wiki/The_Mathematical_Principles_of_Natural_Philosophy_(1846)/BookII-IX">on Wikisource</a>.</li>
<li id="src-stokes">G. G. Stokes (1847). On the theories of the internal friction of fluids in motion, and of the equilibrium and motion of elastic solids (read 14 April 1845). <i>Transactions of the Cambridge Philosophical Society</i> 8, 287–319; and (1851) On the effect of the internal friction of fluids on the motion of pendulums (read 9 December 1850), <i>ibid.</i> 9, part II, 8–106.</li>
<li id="src-poiseuille">G. H. L. Hagen (1839). Ueber die Bewegung des Wassers in engen cylindrischen Röhren. <i>Annalen der Physik und Chemie</i> 46, 423–442; J. L. M. Poiseuille (1840). Recherches expérimentales sur le mouvement des liquides dans les tubes de très petits diamètres. <i>Comptes rendus</i> 11, 961–967 and 1041–1048.</li>
<li id="src-iapws">M. L. Huber, R. A. Perkins, A. Laesecke, D. G. Friend, J. V. Sengers, M. J. Assael, I. N. Metaxa, E. Vogel, R. Mareš and K. Miyagawa (2009). New international formulation for the viscosity of H₂O. <i>Journal of Physical and Chemical Reference Data</i> 38, 101–125.</li>
<li id="src-white">F. M. White (2006). <i>Viscous Fluid Flow</i>, 3rd ed. McGraw-Hill. Ch. 1: Sutherland's law and its constants for air.</li>
<li id="src-segur">J. B. Segur and H. E. Oberstar (1951). Viscosity of glycerol and its aqueous solutions. <i>Industrial and Engineering Chemistry</i> 43, 2117–2120.</li>
<li id="src-bonnet">J.-P. Bonnet, L. Devesvre, J. Artaud and P. Moulin (2011). Dynamic viscosity of olive oil as a function of composition and temperature: a first approach. <i>European Journal of Lipid Science and Technology</i> 113, 1019–1025.</li>
<li id="src-honey">S. Yanniotis, S. Skaltsi and S. Karaburnioti (2006). Effect of moisture content on the viscosity of honey at different temperatures. <i>Journal of Food Engineering</i> 72, 372–377.</li>
<li id="src-archimedes">T. L. Heath (1920). <i>Archimedes</i>. SPCK, London. Translation of On Floating Bodies I, Postulate 1, <a href="https://gutenberg.org/files/35550/35550-h/35550-h.htm">Project Gutenberg #35550</a>.</li>
<li id="src-torricelli">E. Torricelli, letter to M. Ricci, 11 June 1644. English translation in W. F. Magie (1935), <i>A Source Book in Physics</i>, McGraw-Hill; <a href="https://web.lemoyne.edu/Giunta/torr.html">transcription</a>.</li>
<li id="src-pascal">B. Pascal (1663). <i>Traité de l'équilibre des liqueurs et de la pesanteur de la masse de l'air</i>. Paris. Ch. II in the Brunschvicg–Boutroux edition (1923), <a href="https://fr.wikisource.org/wiki/Trait%C3%A9_de_l%E2%80%99%C3%A9quilibre_des_liqueurs/Chapitre_II">on Wikisource</a>.</li>
<li id="src-stevin">S. Stevin (1586). <i>De Beghinselen des Waterwichts</i>. Leiden.</li>
<li id="src-bernoulli">D. Bernoulli (1738). <i>Hydrodynamica, sive de viribus et motibus fluidorum commentarii</i>. Strasbourg. Ch. 10: the kinetic explanation of air pressure.</li>
</ol>
`,
  widgets: {
    'continuum-shear': mountShear,
    'continuum-sample': mountSample,
    'continuum-knudsen': mountKnudsen,
    'continuum-channel': mountChannel,
    'continuum-buoyancy': mountBuoyancy,
    'continuum-parcel': mountParcel,
  },
  quizzes: {
    q1: {
      type: 'predict',
      q: 'You press sideways with the same small, steady force on the top of a glued-down rubber block and on the top plate over a film of honey. After a few seconds you let go. What happens?',
      choices: [
        'Both deform a little and stop; when you let go, both spring back.',
        'The rubber leans by a fixed amount and springs back when released; the honey keeps deforming as long as you push, and stays where it is when you let go.',
        'Honey is thick, so a small enough force will not move it at all.',
        'Both keep deforming slowly while you push; the rubber is just slower.',
      ],
      answer: 1,
      explain: 'A solid’s stress depends on how far it has deformed, so under a steady stress the rubber reaches $\\gamma = \\tau/G$ and stops. A fluid’s stress depends on its rate of deformation, so honey flows at $\\dot\\gamma = \\tau/\\mu$ for as long as the stress acts, however small. When the stress is removed, the flow stops with no elastic restoring force. Choice 3 describes a yield-stress material such as toothpaste, which the figure includes.',
    },
    q2: {
      type: 'predict',
      q: 'An averaging cell holds 25 molecules, and its mean velocity jitters by about 20% of the thermal speed. You make the cell four times larger, so it holds 100 molecules. The jitter becomes about…',
      choices: ['5%: four times the molecules, a quarter of the noise.', '10%: the noise falls as one over the square root of the number of molecules.', '20%: the temperature has not changed, so neither has the noise.', '0%: with 100 molecules the average is exact.'],
      answer: 1,
      explain: 'Random contributions partly cancel. A sum of $N$ independent velocities grows like $\\sqrt{N}$, so their mean scatters like $\\sqrt{N}/N = 1/\\sqrt{N}$. Four times the molecules halves the noise. To cut it tenfold you need a hundred times as many molecules, which is why particle methods are expensive.',
    },
    q3: {
      type: 'num',
      q: 'Air at 20 °C and 1 atm has a mean free path of about 66 nm. What is the Knudsen number of air flowing through a channel 0.5 µm wide?',
      answer: 0.132,
      tol: 0.05,
      unit: '',
      explain: '$\\mathrm{Kn} = \\lambda/L = 66\\ \\text{nm} / 500\\ \\text{nm} \\approx 0.13$. That lies in the transition regime ($0.1 < \\mathrm{Kn} < 10$), where the Navier–Stokes equations with no-slip walls break down and slip corrections or molecular methods are needed, even though the air itself is at standard room conditions and only the channel width $L$ is small.',
    },
    q4: {
      type: 'mcq',
      q: 'Water’s viscosity $\\mu$ is about 55 times that of air. In which fluid does a velocity difference spread faster by viscous diffusion across a 1 cm gap?',
      choices: ['Water, because its viscosity is higher.', 'Air, because its kinematic viscosity $\\nu = \\mu/\\rho$ is about 15 times larger.', 'Both the same: diffusion depends only on the gap.', 'Neither: viscosity resists motion, it does not spread it.'],
      answer: 1,
      explain: 'Viscosity $\\mu$ sets the stress for a given shear, but that stress has to accelerate mass, and water is 830 times denser than air. The diffusivity of momentum is $\\nu = \\mu/\\rho$, which is about $1.5 \\times 10^{-5}$ m²/s for air and $1.0 \\times 10^{-6}$ m²/s for water, giving diffusion times $L^2/\\nu$ across 1 cm of about 7 s and 100 s. Spreading motion from fast layers to slow ones is what viscosity does.',
    },
    q5: {
      type: 'predict',
      q: 'A fully submerged aluminium block hangs on a string 10 cm below the surface of water. You lower it to 30 cm. The buoyant force…',
      choices: ['grows, because the pressure is higher deeper down.', 'stays the same.', 'shrinks, because there is more water above pushing it down.', 'grows, and keeps growing until the block is crushed.'],
      answer: 1,
      explain: 'Increasing the depth by $\\Delta h$ raises the pressure on the top and bottom faces by the same amount $\\rho g\\,\\Delta h$, leaving their difference unchanged at $B = \\rho g a^3$ (9.8 N for a 10 cm cube in water). The buoyant force changes only when the liquid or the solid is measurably compressed.',
    },
  },
  glossary: {
    fluid: {
      term: 'fluid',
      def: 'A material that keeps deforming for as long as any shear stress acts on it, however small. At rest it can carry pressure but no shear stress. Liquids and gases are both fluids.',
      section: 'deforms',
    },
    'shear-stress': {
      term: 'shear stress',
      def: 'Force per unit area acting along a surface rather than into it, written $\\tau$. It tries to slide one layer of material over the next. Units: pascals (N/m²).',
      section: 'deforms',
    },
    'newtonian-fluid': {
      term: 'Newtonian fluid',
      def: 'A fluid whose shear stress is proportional to its strain rate, $\\tau = \\mu\\,\\mathrm{d}u/\\mathrm{d}y$, with a viscosity that depends on temperature and pressure but not on how fast it is sheared. Air and water are Newtonian; paint, ketchup and toothpaste are not.',
      section: 'deforms',
    },
    'continuum-hypothesis': {
      term: 'continuum hypothesis',
      def: 'The assumption that matter can be treated as smoothly spread out, so that density, velocity and pressure are smooth functions of position and time. It holds when volumes small compared with the flow still contain very many molecules.',
      section: 'continuum',
    },
    'mean-free-path': {
      term: 'mean free path',
      def: 'The average distance a gas molecule travels between collisions, given by $\\lambda = k_B T/(\\sqrt{2}\\,\\pi d^2 p)$ for hard spheres of diameter $d$ (about 66 nm for air at 20 °C and 1 atm).',
      section: 'continuum',
    },
    'knudsen-number': {
      term: 'Knudsen number',
      def: 'Mean free path over the length scale of a flow, $\\mathrm{Kn} = \\lambda/L$. Below about 0.01 the continuum equations with no-slip walls hold; from 0.01 to 0.1 the gas slips at walls; above about 0.1 it needs a molecular description.',
      section: 'continuum',
    },
    viscosity: {
      term: 'viscosity',
      def: 'The coefficient $\\mu$ in $\\tau = \\mu\\,\\mathrm{d}u/\\mathrm{d}y$ (also called dynamic viscosity), which measures a fluid’s internal friction as momentum diffuses from faster layers to slower ones. Measured in Pa·s ($1.0 \\times 10^{-3}$ Pa·s for water at 20 °C).',
      section: 'viscosity',
    },
    'kinematic-viscosity': {
      term: 'kinematic viscosity',
      def: 'Viscosity divided by density, $\\nu = \\mu/\\rho$, in m²/s. It is the diffusivity of momentum, so a velocity difference spreads across a distance $L$ in a time of order $L^2/\\nu$ ($1.5 \\times 10^{-5}$ m²/s for air; $1.0 \\times 10^{-6}$ m²/s for water).',
      section: 'viscosity',
    },
    pressure: {
      term: 'pressure',
      def: 'The normal force per unit area that a fluid exerts on a surface; at a point in a fluid at rest it is the same in every direction. Molecularly, it is the momentum delivered by molecules striking the surface, plus intermolecular forces in a liquid.',
      section: 'pressure',
    },
    'fluid-parcel': {
      term: 'fluid parcel',
      def: 'A small bookkeeping volume of fluid that moves with the local mean velocity, large enough to contain many molecules yet small enough to be treated as a point. Individual molecules continually cross its boundary, while its total mass stays constant.',
      section: 'parcels',
    },
  },
  pathologies: [
    {
      id: 'molecular-noise',
      name: 'Molecular (sampling) noise',
      family: 'resolution',
      symptom: 'What you see: averaged density, velocity or temperature that flickers from cell to cell and from step to step, even in a fluid at rest; a weak flow is lost in the jitter.',
      cause: 'Why: an average over $N$ independent molecules or particles fluctuates by a relative fraction $1/\\sqrt{N}$, and a sample mean velocity by $\\sqrt{k_B T/(mN)}$. With only a few particles per cell, sampling variance dominates the continuum average, and halving the statistical noise requires four times as many particles.',
      diagnose: 'How to tell: run the same set-up at rest and measure the rms of the cell averages; check that it falls as $N^{-1/2}$ as you enlarge the cells or add particles. Compare the signal you care about with that noise level.',
      mitigations: [
        'Average over larger cells or more particles per cell so that the noise falls as $1/\\sqrt{N}$, trading spatial resolution and compute time for lower variance.',
        'Average in time, or over an ensemble of runs, when the flow is steady or repeatable, though this does not help for a single transient run.',
        'Smooth each value over many neighbours with a kernel, as smoothed particle hydrodynamics does with its smoothing length, which reduces noise at the cost of blurrier fields and more neighbours to sum.',
        'Evolve averaged distributions instead of individual molecules, as the lattice Boltzmann method does, eliminating thermal noise on a fixed lattice.',
        'Retain the thermal fluctuations intentionally (fluctuating hydrodynamics) in nanoscale flows where they are part of the physics and solutions are statistical distributions.',
      ],
      section: 'continuum',
      demo: { widget: 'continuum-sample', data: { preset: 'noisy' } },
    },
  ],
  css: `
.chapter[data-chapter="continuum"] table caption { caption-side: top; text-align: left; color: var(--muted); font-size: 0.9rem; padding-bottom: 4px; }
`,
};
