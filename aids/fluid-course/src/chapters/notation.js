// Chapter 4: How the equations got their shape. The history of the notation
// the course uses: Leibniz's d and Newton's dots, Euler's brackets and the
// curly ∂, Euler's 1757 equations as he wrote them, Hamilton's ∇ and the
// vector analysis of Gibbs and Heaviside, Cauchy's stress, index notation and
// Einstein's summation rule, the names of things, and the grid notation of
// Part II. Every date and quotation comes from the course's research dossier.
// Kernel: src/sims/ch-notation-index.js (tests in
// tests/fluid-course/ch-notation.test.js); the grid figure runs the shared
// advection kernel.

import { mountFiveWays } from './notation/five-ways.js';
import { mountEinstein } from './notation/einstein.js';
import { mountTimeline } from './notation/timeline.js';
import { mountGrid } from './notation/grid.js';

export const chapter = {
  id: 'notation',
  title: 'How the equations got their shape',
  short: 'Notation',
  blurb: 'Three centuries of notation, from Euler\'s parentheses to ∇ and index notation, and why each change stuck.',
  minutes: 35,
  html: String.raw`
<p class="lead-in">The equations of fluid dynamics are older than the symbols we write them in. Euler wrote down the equations of an ideal fluid in 1755, before the curly $\partial$ had settled into its modern meaning, ninety years before Hamilton's $\nabla$ and 160 years before Einstein's rule for dropping summation signs. Each new notation made the equations shorter. Each one also hid something that the older form said out loud. This chapter follows the momentum equation through those changes, from Euler's three component equations to the one-line index form in current papers.</p>

<p>There is a practical reason to learn all the layers. Papers, textbooks and solver manuals still use every one of them, often on the same page, and a misread sign or index is a bug. And the last notation in the chapter, the one for values on a grid, is the language of the rest of this course.</p>

<h2 id="calculus">Writing a derivative: d, dots, brackets and ∂</h2>

<p>The velocity of a fluid depends on four numbers: three for position and one for time. Ask "how fast is $u$ changing?" and there is no answer until you say what you hold fixed. Step along $x$ with $y$, $z$ and $t$ fixed, and you get one rate. Stand at one point and wait, and you get another. Ride along with the fluid, and you get a third. A notation for fluids has to keep these apart, and it took more than a century to find one that did.</p>

<h3 id="leibniz-newton">Leibniz's d and Newton's dots</h3>

<p>In manuscripts of October and November 1675, Leibniz wrote $\int$ for a sum and $d$ for a difference: "∫ autem significat summam, d differentiam" (∫ means sum, d means difference). His $dx$ was the difference between two neighbouring values of $x$. He first printed $dx$ in 1684 and $\int$ in 1686. The notation carries its own derivation. A derivative looks like a ratio of two small differences because that is how it began:</p>

<div class="eq" id="eq-leibniz">$$\frac{dy}{dx} \;=\; \lim_{\Delta x \to 0} \frac{\Delta y}{\Delta x}, \qquad \Delta y = y(x+\Delta x) - y(x).$$<span class="eq-tag">(4.1)</span></div>

<p>Read (4.1) from right to left and you have the programme of Part II of this course. A computer cannot take the limit. It stops at a small but finite $\Delta x$, and calculus becomes arithmetic. How large an error that leaves, and whether the errors grow, is what chapters 6 to 9 are about.</p>

<aside class="who" data-person="gottfried-wilhelm-leibniz">In the manuscript of 11 November 1675 Leibniz asked himself whether $dx\,dy$ equals $d(xy)$, and concluded that it does not. His $d$ is for <em>differentia</em> and the long s of $\int$ for <em>summa</em>: the two operations a numerical method actually performs.</aside>

<p>Newton wrote a rate of change in time with a dot over the letter: $\dot{x}$, $\ddot{x}$. When he started using the dots is disputed. Older accounts, following a manuscript leaf that was never reproduced, put it in 1665; D. T. Whiteside's later study of the manuscripts concluded that the standard dot notation dates from December 1691. It was first printed in 1693, in a book by John Wallis. After the priority dispute over the calculus, English mathematicians kept Newton's dots while the Continent used Leibniz's $d$. Cambridge changed only after the Analytical Society campaigned for the $d$ notation in the 1810s. Babbage later recalled proposing a title for the Society's volume: "The Principles of pure D-ism in opposition to the Dot-age of the University". The dots survive for time derivatives, as in mechanics.</p>

<h3 id="brackets-curly-d">Euler's brackets and the curly ∂</h3>

<p>For a function of several variables, a plain $du/dx$ is ambiguous. Euler's answer, in his 1755 textbook on the differential calculus, was to put the quotient in round brackets: $\left(\frac{du}{dx}\right)$ meant the rate of change of $u$ with $x$ alone, the other variables held fixed. The same book introduced $\Delta$ for a finite difference and $\Sigma$ for a sum: "just as we have used the sign Δ to denote a difference, so we shall indicate a sum by the sign Σ", in English translation. In §8 he took the step of $x$, which he had called $\omega$, and wrote it $\Delta x$. The grid spacing of every scheme in this course is Euler's symbol.</p>

<p>The curly $\partial$ had a slower start. Condorcet printed a rounded $d$ in a memoir for the academy year 1770 (printed 1773), but its meaning shifted from paper to paper. Legendre, in a memoir for 1786 (printed 1788), wrote $\partial u/\partial x$ in a footnote, expressly to tell a partial derivative from a total one. He dropped it the next year. In 1841 Jacobi brought it back. His reason was practical: the brackets piled up and were tiresome to read and write, so he kept $d$ for ordinary differentials and $\partial$ for partial ones. The modern definition is</p>

<div class="eq" id="eq-partial">$$\frac{\partial u}{\partial x} \;=\; \lim_{h \to 0} \frac{u(x+h,\,y,\,z,\,t) - u(x,\,y,\,z,\,t)}{h},$$<span class="eq-tag">(4.2)</span></div>

<p>with every variable except $x$ held fixed. This is the <dfn data-term="partial-derivative">partial derivative</dfn>. In a flow, $\partial u/\partial t$ is what a probe fixed in space records.</p>

<aside class="who" data-person="adrien-marie-legendre">Legendre's 1786 footnote is the first place $\partial u/\partial x$ is written to separate a partial from a complete derivative. Cajori, the historian of notation, complained that "the mathematical public, uncritical on matters of priority, is crediting Jacobi with devices first proposed by Legendre and Hamilton". The sign is a rounded $d$, not a Greek delta, whatever its nickname.</aside>

<p>Uptake was slow. Stokes's great 1845 paper on viscous fluids still writes $du/dx$ for a partial derivative, and so did many British authors for decades. That is why Stokes needed a new letter for the derivative that follows a fluid particle. He chose a capital $D$, "to denote differentiation in which the independent variables are t and three parameters of the particle considered, (such for instance as its initial co-ordinates,) and not t, x, y, z". In his own letters, with lower-case $d$ for partials:</p>

<div class="eq" id="eq-stokes-D">$$\frac{Du}{Dt} \;=\; \frac{du}{dt} + u\,\frac{du}{dx} + v\,\frac{du}{dy} + w\,\frac{du}{dz}.$$<span class="eq-tag">(4.3)</span></div>

<p>Today the right-hand side is written $\partial u/\partial t + \mathbf{u}\cdot\nabla u$, the <dfn data-term="material-derivative">material derivative</dfn> of <a href="#/viewpoints/material-derivative">chapter 2</a>. The quantity itself is Euler's, as the next section shows; the single symbol for it is Stokes's earliest known use.</p>

<p>One more notation belongs here. Lagrange wrote $f'x$ for the "fonction dérivée" of $f$, earlier in 1770 and 1772 and systematically in 1797. Primes work only for one variable, so they live on in ordinary differential equations, $y' = f(t, y)$, the form in which time integrators are written (<a href="#/stiffness/stiffness">Diffusion and stiffness</a>).</p>

<details class="deeper"><summary>Go deeper: why one d was not enough</summary>
<p>Follow a particle whose position at time $t$ is $(x(t), y(t), z(t))$, with $dx/dt = u$, $dy/dt = v$ and $dz/dt = w$. The value of a field $f(x, y, z, t)$ at the particle changes for two reasons: the field changes in time, and the particle moves to where the field is different. The chain rule gives</p>
$$\frac{d}{dt} f\big(x(t), y(t), z(t), t\big) \;=\; \frac{\partial f}{\partial t} + \frac{\partial f}{\partial x}\frac{dx}{dt} + \frac{\partial f}{\partial y}\frac{dy}{dt} + \frac{\partial f}{\partial z}\frac{dz}{dt} \;=\; \frac{\partial f}{\partial t} + u\frac{\partial f}{\partial x} + v\frac{\partial f}{\partial y} + w\frac{\partial f}{\partial z}.$$
<p>On the left is a total derivative along a path; on the right are four partial derivatives at a fixed point. Written with one letter $d$ for both, as Euler, Navier and Stokes had to, the equation reads $df/dt = df/dt + \ldots$, which is nonsense until you know which $d$ is which. Euler's brackets, Stokes's capital $D$ and Jacobi's $\partial$ are three answers to the same problem.</p>
</details>

<aside class="pitfall">When you read a paper from before about 1900, assume nothing about $d$. In Euler it is partial when bracketed; in Navier and Stokes it is usually partial without brackets; in Condorcet a rounded $\partial$ can even mean a total differential. Work out from context which variables are held fixed before you translate a formula into modern notation, or into code.</aside>

<div data-quiz="q1"></div>

<h2 id="euler-1757">Euler's equations, as he wrote them</h2>

<p>Euler's memoir "Principes généraux du mouvement des fluides" was presented to the Berlin Academy in 1755 (on 4 September, according to Darrigol and Frisch; other sources give other dates) and printed in 1757, in the volume for 1755. That is why it is cited under both years. Euler had already worked towards these equations in a Latin memoir, read in 1752 and printed in 1761. The French memoir gave the general case: one equation of continuity and three equations of motion, for a fluid that may be compressible, in the form we still use.</p>

<p>Here is the $x$ equation of motion as Euler wrote it, in Uriel Frisch's English translation:</p>

<div class="eq" id="eq-euler-1757">$$\class{t5}{P} \;-\; \class{t3}{\frac{1}{q}\left(\frac{dp}{dx}\right)} \;=\; \class{t1}{\left(\frac{du}{dt}\right)} \;+\; \class{t2}{u\left(\frac{du}{dx}\right) + v\left(\frac{du}{dy}\right) + w\left(\frac{du}{dz}\right)}$$<span class="eq-tag">(4.4)</span></div>

<p>and here is his continuity equation:</p>

<div class="eq" id="eq-euler-continuity">$$\left(\frac{dq}{dt}\right) + \left(\frac{d.qu}{dx}\right) + \left(\frac{d.qv}{dy}\right) + \left(\frac{d.qw}{dz}\right) = 0 .$$<span class="eq-tag">(4.5)</span></div>

<p>Read (4.4) term by term, with the colours. The fluid at a point is pushed by an outside force, $\class{t5}{P}$ (gravity, say), and by a difference of pressure on its two sides, $\class{t3}{(1/q)(dp/dx)}$, which pushes it from high pressure towards low. Together they produce an acceleration. The acceleration has two parts: the change of $u$ at the fixed point, $\class{t1}{(du/dt)}$, and the change that comes from being carried to a place where $u$ is different, $\class{t2}{u(du/dx) + v(du/dy) + w(du/dz)}$. That second, <em>convective</em> part is the term that makes the equations nonlinear. It will cause trouble in <a href="#/advection/characteristics">chapter 7</a>, steepen waves into <a href="#/shocks/burgers">shocks</a> in chapter 8 and feed <a href="#/turbulence/what-is-turbulence">turbulence</a> in chapter 14.</p>

<p>The letters are still ours: $u, v, w$ for velocity and $p$ for pressure. The brackets mark partial derivatives, and the dot in $d.qu$ means "$d$ of the product $qu$". Notice that (4.5) is already in <em>conservation form</em>, a derivative of the flux $qu$ rather than $q$ times a derivative of $u$. That choice decides whether a computer keeps mass exactly, as <a href="#/conservation/finite-volume">chapter 3</a> shows.</p>

<aside class="note" data-label="Same look, different units">Euler's equations look modern, but they are in his own system of units. According to the footnotes in Frisch's translation, his $p$ is a pressure measured as the height of a column of a reference fluid, $q = \rho/\rho_0$ is a density with no units, the forces $P$, $Q$, $R$ are divided by $g$, and velocity and time are rescaled by $\sqrt{g}$. Copy a coefficient out of an old paper without checking its units and your answer can be off by $g$ or $\rho_0$.</aside>

<p>In modern notation, with density $\rho$ and body force per unit mass $\mathbf{f}$, the same two equations are</p>

<div class="eq" id="eq-euler-modern">$$\frac{\partial \rho}{\partial t} + \nabla\cdot(\rho\mathbf{u}) = 0, \qquad \rho\left(\class{t1}{\frac{\partial \mathbf{u}}{\partial t}} + \class{t2}{(\mathbf{u}\cdot\nabla)\mathbf{u}}\right) = \class{t3}{-\nabla p} + \class{t5}{\rho\mathbf{f}} .$$<span class="eq-tag">(4.6)</span></div>

<p>What is missing is friction. Euler's fluid slides past itself without resistance, which is why <a href="#/conservation/paradox">d'Alembert's paradox</a> could arise. Navier added a friction term from a model of forces between molecules; his memoir was read to the Academy on 18 March 1822 and printed in 1827. His constant $\varepsilon$ multiplies the sum of second derivatives of each velocity component. It does the job of today's viscosity $\mu$, but it is not quite the same number: comparing Navier's pipe-flow result with the Hagen–Poiseuille law, Bistafa (2018) finds $\varepsilon$ roughly equal to $\mu/2$. Navier wrote $\rho$ and $p$, the letters we keep. Stokes derived the equations again in 1845 (read 14 April 1845, printed 1847) without molecules, from the rate at which a fluid element is deformed, with one coefficient $\mu$ and his new $D/Dt$. <a href="#/conservation/navier-stokes">Chapter 3</a> derives them; here we only watch how they were written.</p>

<aside class="who" data-person="leonhard-euler">The memoir ends (§68) with a remark that still applies: the mechanics was now complete, and what was lacking was analysis, a way to solve the equations. Two and a half centuries later, for most flows, the answer is still not a formula. It is a computation.</aside>

<div data-quiz="q2"></div>

<p>The figure lets you step through six ways of writing the same $x$ equation. The five kinds of term keep their colours throughout: time derivative, convective term, pressure, friction and body force.</p>

<figure data-widget="notation-five-ways" data-preset="euler" class="wide"><figcaption>The $x$ momentum equation as Euler (printed 1757), Navier (read 1822, printed 1827) and Stokes (read 1845, printed 1847) wrote it, transcribed from the original memoirs and Frisch's translation, followed by the vector form, index notation and the compact index form. The colours mark the same physical term at every stage: 1 time derivative, 2 convective, 3 pressure, 4 friction, 5 body force.</figcaption></figure>

<div class="try"><ol>
<li>Step from Euler to Navier. Find the new term in colour 4. Euler's equation has no friction at all.</li>
<li>At Stokes, the time derivative and the convective term have merged into one symbol, $Du/Dt$. Look at what else Stokes carries: a separate $\mu/3$ term that vanishes only when the fluid is incompressible.</li>
<li>Turn off "Colour the terms" and try to find the pressure term in each form. The colours are doing a lot of work.</li>
<li>Switch on "All six at once" and compare the lengths. The modern compact form uses about a third of the ink of Euler's, but you must know three conventions to read it.</li>
</ol></div>

<h2 id="vectors">Vectors: ∇, curl and the quaternion quarrel</h2>

<p>A velocity is one thing with a direction, not three unrelated numbers. Three component equations, as Euler, Navier and Stokes wrote them, tie the physics to one choice of axes. A vector notation says it once. It took about sixty years, two rival systems and a public argument to get the one we use.</p>

<h3 id="hamilton">Hamilton's operator</h3>

<p>William Rowan Hamilton found the quaternions in 1843: numbers of the form $a + bi + cj + dk$ with $i^2 = j^2 = k^2 = -1$ and $ij = k = -ji$. In 1846 he called the real part of a quaternion its "scalar" and the rest its "vector", and he defined a differential operator, which he printed as a triangle on its side:</p>

<div class="eq" id="eq-hamilton">$$\triangleleft \;=\; i\,\frac{d}{dx} + j\,\frac{d}{dy} + k\,\frac{d}{dz}.$$<span class="eq-tag">(4.7)</span></div>

<p>(The $d$ here is still partial.) He had first written it upright, $\nabla$, in a paper meant for the British Association meeting at Southampton in September 1846, but the paper was forwarded by mistake to Sir John Herschel's home and arrived too late to be shown. In print he turned the symbol on its side: "this more common sign has been so often used with other meanings, that it seems desirable to abstain from appropriating it to the new signification here proposed". Peter Guthrie Tait made the upright $\nabla$ standard in his quaternion textbook of 1867.</p>

<aside class="history" data-era="c. 1870">The name "nabla" is often credited to Maxwell. It was suggested to Tait by the scholar William Robertson Smith, because the symbol looks like an ancient harp. Maxwell only joked about it in letters to Tait ("What do you call this? Atled?" and later "Still harping on that Nabla?"), and objected that "a name derived from its shape is hardly the thing". The shorter "del" came from E. B. Wilson in 1901, because "the monosyllable del is so short and easy to pronounce".</aside>

<p>Apply Hamilton's operator to a vector field $\boldsymbol{\sigma} = iX + jY + kZ$ and multiply out with the quaternion rules. Writing $\partial_x$ for $\partial/\partial x$, the result has a scalar part (colour 1) and a vector part (colour 2):</p>

<div class="eq" id="eq-quaternion">$$\nabla\boldsymbol{\sigma} = \class{t1}{-\left(\partial_x X + \partial_y Y + \partial_z Z\right)} + \class{t2}{i\left(\partial_y Z - \partial_z Y\right) + j\left(\partial_z X - \partial_x Z\right) + k\left(\partial_x Y - \partial_y X\right)}$$<span class="eq-tag">(4.8)</span></div>

<p>The scalar part is minus what we now call the divergence. The vector part is what we now call the curl. One quaternion product holds both of the operations that fluid dynamics needs most, and that was the quaternion's great attraction. The minus sign was its great nuisance.</p>

<details class="deeper"><summary>Go deeper: multiplying out ∇σ</summary>
<p>Write $\nabla\boldsymbol{\sigma} = \left(i\partial_x + j\partial_y + k\partial_z\right)\left(iX + jY + kZ\right)$ and expand into nine products. The three "diagonal" ones use $i^2 = j^2 = k^2 = -1$: $i\partial_x(iX) = -\partial_x X$, and similarly for $Y$ and $Z$. They give the scalar part. The six others use $ij = k$, $jk = i$, $ki = j$ and the reversed products with a minus sign. For instance $i\partial_x(jY) = k\,\partial_x Y$ and $j\partial_y(iX) = -k\,\partial_y X$, which together make the $k$ component $\partial_x Y - \partial_y X$. The other two components follow the same way. Apply the operator twice to a scalar $\phi$ and the same rule $i^2 = -1$ gives $\nabla\nabla\phi = -(\partial_x^2 + \partial_y^2 + \partial_z^2)\phi$: Hamilton's $\nabla^2$ is minus the Laplacian.</p>
</details>

<h3 id="maxwell-names">Maxwell's names: slope, convergence, curl</h3>

<p>Maxwell used quaternions in his electromagnetic work and needed names for the parts of $\nabla\boldsymbol{\sigma}$. In a paper read to the London Mathematical Society in March 1871 he called $\nabla P$ the "slope" of $P$, the scalar part of $\nabla\boldsymbol{\sigma}$ its "convergence", and the vector part its "curl", a word that would neither, "like Rotation, Whirl, or Twirl, connote motion, nor, like Twist, indicate a helical or screw structure". He asked for better suggestions because "the onomastic power is very faint in me". His <em>Treatise on Electricity and Magnetism</em> (1873) repeated them: "I propose (with great diffidence) to call the vector part of ∇σ the curl, or the version of σ at the point P". Curl stuck. Convergence did not. In 1878 William Kingdon Clifford, working out how fast a moving fluid expands, wrote: "Prof. Clerk Maxwell calls the quantity −E the convergence of σ. We might perhaps therefore call E itself the divergence of σ".</p>

<h3 id="gibbs-heaviside">Gibbs, Heaviside and the quarrel</h3>

<p>Two physicists, independently and at about the same time, decided that physics needed the parts of the quaternion product but not the quaternion. J. Willard Gibbs privately printed his <em>Elements of Vector Analysis</em> for his students in New Haven (Part I in 1881, Part II in 1884). He kept $\nabla$, defined a "direct product" $\alpha.\beta$ without the quaternion minus sign and a "skew product" $\alpha\times\beta$, and wrote that "∇.ω is called the divergence of ω and ∇×ω its curl". Oliver Heaviside, in England, set vectors in bold type (by his own account from 1886) and called the quaternion rule $i^2 = -1$ "an obtrusive stumbling-block" for physics.</p>

<p>Tait, Hamilton's champion, attacked in the preface to the 1890 edition of his textbook. Gibbs, he wrote, "must be ranked as one of the retarders of Quaternion progress, in virtue of his pamphlet on Vector Analysis; a sort of hermaphrodite monster, compounded of the notations of Hamilton and of Grassmann". Gibbs replied in <em>Nature</em> in 1891 that there was "a deeper question of notions underlying that of notations". Heaviside, who owed much to Tait, judged that Gibbs "has by a long way the best of the argument". The exchange is now called the quaternion war, a later label for a few prefaces and letters. Textbooks settled it more than the argument did: Heaviside's <em>Electromagnetic Theory</em> (1893) and, above all, <em>Vector Analysis</em> (1901), written by Gibbs's student Edwin Bidwell Wilson from his lectures. Wilson's book gave us the dot and cross products, "del", and $\nabla\cdot\mathbf{V} = \operatorname{div}\mathbf{V}$ and $\nabla\times\mathbf{V} = \operatorname{curl}\mathbf{V}$. The German "Gradient" and "grad" appear in Heinrich Weber's 1900 edition of Riemann's lectures.</p>

<p>In the notation that won, with $\nabla = \mathbf{i}\,\partial_x + \mathbf{j}\,\partial_y + \mathbf{k}\,\partial_z$, the operator <dfn data-term="nabla">nabla</dfn> gives</p>

<div class="eq" id="eq-grad-div-curl">$$\nabla\phi = \left(\partial_x\phi,\ \partial_y\phi,\ \partial_z\phi\right), \qquad \nabla\cdot\mathbf{u} = \partial_x u + \partial_y v + \partial_z w,$$ $$\nabla\times\mathbf{u} = \left(\partial_y w - \partial_z v,\ \partial_z u - \partial_x w,\ \partial_x v - \partial_y u\right), \qquad \nabla^2\phi = \nabla\cdot\nabla\phi .$$<span class="eq-tag">(4.9)</span></div>

<p>and the incompressible Navier–Stokes equations, with kinematic viscosity $\nu = \mu/\rho$, fit on one line:</p>

<div class="eq" id="eq-ns-vector">$$\class{t1}{\frac{\partial \mathbf{u}}{\partial t}} + \class{t2}{(\mathbf{u}\cdot\nabla)\mathbf{u}} = \class{t3}{-\frac{1}{\rho}\nabla p} + \class{t4}{\nu\nabla^2\mathbf{u}} + \class{t5}{\mathbf{f}}, \qquad \nabla\cdot\mathbf{u} = 0 .$$<span class="eq-tag">(4.10)</span></div>

<p>Prandtl's boundary-layer paper (given in 1904, printed 1905) already wrote the viscous equation in Gibbs's vector notation. That is the form you will meet in <a href="#/pressure/constraint">chapter 10</a>, where the condition $\nabla\cdot\mathbf{u} = 0$ turns out to be the hardest part to compute.</p>

<aside class="pitfall">Signs changed when the notation did. In the quaternion convention of Hamilton, Tait and Maxwell's <em>Treatise</em>, $\nabla^2$ is minus today's Laplacian. Weber's first "grad" (1900) pointed downhill, the opposite of today's gradient. And $\Delta$ means the Laplacian in many books (a usage that goes back to Robert Murphy in 1833) as well as a finite difference or a grid spacing. Before you copy a formula, check which convention its source used.</aside>

<div data-quiz="q3"></div>

<h2 id="tensors">Tensors and indices: from Cauchy to Einstein</h2>

<p>Pressure pushes equally in every direction, so one number describes it at each point. A viscous fluid also drags sideways, and then the force on a small surface depends on how the surface is tilted. Cauchy showed that the force per unit area $\mathbf{t}$ depends linearly on the surface's unit normal $\mathbf{n}$. A linear rule from vectors to vectors needs nine numbers, and that array of nine numbers is the stress.</p>

<h3 id="cauchy">Cauchy's six letters</h3>

<p>Cauchy announced his theory of stress in 1822, printed a summary in 1823 and set it out in full in his <em>Exercices de mathématiques</em> of 1827. By his own account the work was prompted by a memoir of Navier's from 1820. He avoided subscripts by giving each component its own letter: $A$, $B$, $C$ for the normal stresses on planes perpendicular to the three axes and $D$, $E$, $F$ for the shear stresses, set out as a symmetric array</p>

<div class="eq" id="eq-cauchy-array">$$\begin{matrix} A & F & E \\ F & B & D \\ E & D & C \end{matrix} \qquad\leftrightarrow\qquad \begin{matrix} \sigma_{xx} & \sigma_{xy} & \sigma_{xz} \\ \sigma_{yx} & \sigma_{yy} & \sigma_{yz} \\ \sigma_{zx} & \sigma_{zy} & \sigma_{zz} \end{matrix}$$</div>

<p>For the force on a plane whose normal makes angles $\alpha$, $\beta$, $\gamma$ with the axes he wrote $p\cos\lambda = A\cos\alpha + F\cos\beta + E\cos\gamma$ and two similar equations. For equilibrium he found $dA/dx + dF/dy + dE/dz + \rho X = 0$ and two more. With numbered indices both statements shrink to one line each:</p>

<div class="eq" id="eq-cauchy">$$t_i = \sigma_{ij}\,n_j, \qquad \frac{\partial \sigma_{ij}}{\partial x_j} + \rho f_i = 0 .$$<span class="eq-tag">(4.11)</span></div>

<p>For a fluid at rest Cauchy set $A = B = C = -p$ and $D = E = F = 0$: the stress is pure pressure, the same in every direction.</p>

<aside class="who" data-person="augustin-louis-cauchy">Cauchy turned "pressure" into stress: a force per unit area on any internal surface, not necessarily normal to it. Darrigol counts his 1823 equations as the second of the five "births" of the Navier–Stokes equations.</aside>

<p>The word came later. Hamilton had used "tensor" in 1846 for the size of a quaternion. In 1898 the physicist Woldemar Voigt borrowed it for quantities in crystals, such as a tension, that have a size and a two-sided direction. A <dfn data-term="tensor">tensor</dfn> in today's sense is a quantity like the stress: an array of components that maps directions to vectors and changes in a fixed way when you rotate the axes. Gibbs had called such things "dyadics".</p>

<h3 id="summation">Indices and the summation convention</h3>

<p>Indexed quantities had a long history in algebra; Kronecker defined his delta, $\delta_{ik} = 1$ when $i = k$ and $0$ otherwise, in 1866. The systematic calculus of indices is due to Gregorio Ricci-Curbastro and Tullio Levi-Civita, whose 1900 memoir on "absolute differential calculus" set out how indexed "systems" change between coordinate systems, with upper and lower indices for the two kinds of behaviour. Their "système E" becomes, in Cartesian coordinates, the permutation symbol $\varepsilon_{ijk}$: $+1$ when $(i, j, k)$ is an even permutation of $(1, 2, 3)$, $-1$ for an odd one, and $0$ if an index repeats. The memoir never uses the word "tensor".</p>

<p>Einstein used their calculus for general relativity. In his 1916 paper he noticed that his sums always ran over an index that appeared twice, and only then, so the summation signs could go: "Tritt ein Index in einem Term eines Ausdruckes zweimal auf, so ist über ihn stets zu summieren, wenn nicht ausdrücklich das Gegenteil bemerkt ist". In English: if an index occurs twice in one term, it is summed over, unless the contrary is stated. That remark is the <dfn data-term="einstein-summation">summation convention</dfn>, and with it <dfn data-term="index-notation">index notation</dfn> has three rules:</p>

<ul>
<li>An index that appears <strong>once</strong> in a term is <em>free</em>. The expression stands for one equation per value of it, and every term must have the same free indices.</li>
<li>An index that appears <strong>twice</strong> is <em>summed</em> (a dummy index). Its name does not matter: $u_j\partial_j$ and $u_k\partial_k$ are the same thing.</li>
<li>An index that appears <strong>three or more times</strong> in one term is an error. The convention says nothing about it.</li>
</ul>

<p>Here are the Navier–Stokes equations of (4.10) in index form, with $\partial_j$ short for $\partial/\partial x_j$:</p>

<div class="eq" id="eq-ns-index">$$\class{t1}{\partial_t u_i} + \class{t2}{u_j\,\partial_j u_i} = \class{t3}{-\frac{1}{\rho}\,\partial_i p} + \class{t4}{\nu\,\partial_j\partial_j u_i} + \class{t5}{f_i}, \qquad \partial_i u_i = 0 .$$<span class="eq-tag">(4.12)</span></div>

<p>The free index $i$ says "three equations, one per direction". The repeated $j$ says "add up over $j = 1, 2, 3$". Expanded for $i = 1$, the convective term $u_j\,\partial_j u_1$ is $u\,\partial u/\partial x + v\,\partial u/\partial y + w\,\partial u/\partial z$: Euler's term from (4.4), letter for letter.</p>

<p>The payoff is that you can manipulate the equations term by term, without memorising vector identities. Take a Newtonian fluid, whose stress is $\sigma_{ij} = -p\,\delta_{ij} + \mu\left(\partial_i u_j + \partial_j u_i\right)$ when it is incompressible. Then</p>

$$\partial_j \sigma_{ij} \;=\; -\partial_i p + \mu\,\partial_j\partial_j u_i + \mu\,\partial_i\left(\partial_j u_j\right) \;=\; -\partial_i p + \mu\,\partial_j\partial_j u_i ,$$

<p>because $\delta_{ij}$ picks out $j = i$ and $\partial_j u_j = 0$. Two lines turn Cauchy's (4.11) into the viscous and pressure terms of (4.12).</p>

<details class="deeper"><summary>Go deeper: the convective term as a gradient plus a swirl</summary>
<p>The permutation symbol obeys the identity $\varepsilon_{kij}\,\varepsilon_{klm} = \delta_{il}\delta_{jm} - \delta_{im}\delta_{jl}$ (check it by trying values). With vorticity $\omega_k = \varepsilon_{klm}\,\partial_l u_m$, the $i$ component of $\mathbf{u}\times\boldsymbol{\omega}$ is</p>
$$\varepsilon_{ijk}\,u_j\,\omega_k = \varepsilon_{kij}\varepsilon_{klm}\,u_j\,\partial_l u_m = \left(\delta_{il}\delta_{jm} - \delta_{im}\delta_{jl}\right)u_j\,\partial_l u_m = u_j\,\partial_i u_j - u_j\,\partial_j u_i .$$
<p>So $u_j\,\partial_j u_i = \partial_i\!\left(\tfrac12 u_j u_j\right) - \left(\mathbf{u}\times\boldsymbol{\omega}\right)_i$, the identity $(\mathbf{u}\cdot\nabla)\mathbf{u} = \nabla\left(\tfrac12|\mathbf{u}|^2\right) - \mathbf{u}\times\boldsymbol{\omega}$. In vector notation you would look it up. In index notation it takes three lines. Some numerical schemes discretise this "rotational form" instead of $u_j\,\partial_j u_i$, because the two forms behave differently once they are discretised.</p>
</details>

<p>G. K. Batchelor's <em>An Introduction to Fluid Dynamics</em> (1967) is an influential fluids text written in index notation, though not its inventor. Many engineering books still prefer Gibbs's $\nabla$. You will need both.</p>

<p>The figure writes out what the convention hides.</p>

<figure data-widget="notation-einstein" data-preset="conv" class="wide"><figcaption>Index expressions written out in full by the expander kernel (src/sims/ch-notation-index.js), whose tests check the counts, the signs of $\varepsilon_{ijk}$ and the curl of a linear velocity field. In the convention, an index used once is free (one equation per value) and an index used twice is summed.</figcaption></figure>

<div class="try"><ol>
<li>With $u_j\partial_j u_i$, switch "Write indices as" to $x, y, z$. Row $x$ is Euler's convective term from (4.4).</li>
<li>Pick $\partial_j\sigma_{ij}$ in 3-D with $x, y, z$. Row $x$ is Cauchy's $dA/dx + dF/dy + dE/dz$ in modern dress.</li>
<li>Pick the vorticity $\varepsilon_{ijk}\partial_j u_k$ in 3-D. Only 6 of its 27 terms are non-zero ("Keep the zero terms" shows the rest). In 2-D only the $z$ component survives: $\partial v/\partial x - \partial u/\partial y$.</li>
<li>Pick the ill-formed $u_i\partial_i u_i$. The readouts refuse to expand it: no rule says what an index used three times means.</li>
</ol></div>

<aside class="pitfall">Books disagree on stress conventions. Some write $\sigma_{ij}$ for the total stress and $\tau_{ij}$ for its viscous part; others use $\tau_{ij}$ for the total. They also disagree on which index names the face and which the direction of the force, which is harmless only because the stress tensor is symmetric. And the engineering shear strain rate is twice the tensor component, $\dot\gamma_{xy} = 2e_{xy}$: a classic factor-of-two bug.</aside>

<div data-quiz="q4"></div>

<h2 id="names">How things got their names</h2>

<p>The names in fluid dynamics are a record of who was remembered, which is not the same as who did the work. Here are the ones this course uses most.</p>

<div class="table-wrap"><table>
<thead><tr><th>Name</th><th>The idea</th><th>The name</th><th>The catch</th></tr></thead>
<tbody>
<tr><td>Navier–Stokes equations</td><td>Navier 1822, Cauchy 1823, Poisson 1829, Saint-Venant 1834–43, Stokes 1845</td><td>Not established; apparently after 1904</td><td>Five derivations, two names</td></tr>
<tr><td>Reynolds number</td><td>Reynolds 1883 (experiments), 1895 (as $K$)</td><td>Sommerfeld 1908</td><td>Stokes had the similarity idea in 1850</td></tr>
<tr><td>Mach number</td><td>Mach and Salcher's photographs of shock waves</td><td>Ackeret 1929 ("Machzahl")</td><td>Both $M$ and $\mathrm{Ma}$ are in use</td></tr>
<tr><td>turbulent</td><td>Reynolds 1883 ("sinuous" motion)</td><td>Kelvin 1887</td><td>Leonardo's "turbolenza" may have meant turbid, sediment-laden water</td></tr>
<tr><td>vorticity</td><td>Helmholtz and Kelvin on vortex motion</td><td>Coiner not established; in Lamb 1895</td><td>Older "rotation" is half of it</td></tr>
<tr><td>divergence, curl</td><td>Hamilton's $\nabla$ (1846)</td><td>Clifford 1878; Maxwell 1871</td><td>Maxwell's "convergence" is minus the divergence</td></tr>
<tr><td>Courant number</td><td>Courant, Friedrichs and Lewy 1928</td><td>Not traced; in print by 1967</td><td>Honours one of three authors</td></tr>
</tbody></table></div>

<h3 id="navier-stokes-name">Navier–Stokes</h3>

<p>Neither man used the name. Navier (1822), Cauchy (1823), Poisson (1829), Saint-Venant (1834 to 1843) and Stokes (1845) each derived the viscous equations, on different physical assumptions. The historian Olivier Darrigol calls these the first five "births" of the <dfn data-term="navier-stokes">Navier–Stokes equations</dfn>. Lamb's <em>Hydrodynamics</em> (1895) credits "Navier and Poisson" with the equations and Saint-Venant and Stokes with the method that does without molecules. Prandtl's 1904 paper names no one for them. Who first paired Navier with Stokes, and when, has not been found.</p>

<aside class="who" data-person="adhemar-barre-de-saint-venant">Saint-Venant derived the viscous stresses from one assumption, that the tangential stress on each face points along the direction of sliding, and said he made no assumption about the size of molecular attractions and repulsions. His memoir was presented in 1834, with additions in 1837 and a printed note in 1843. His name is not on the equations.</aside>

<h3 id="reynolds-name">The Reynolds number</h3>

<p>Reynolds's dye experiments of 1883 showed that whether pipe flow stays orderly depends on one combination of speed, diameter and viscosity. (Chapter 5 tells the story of the <a href="#/similarity/reynolds-1883">experiment</a>.) In 1895 he used the number explicitly and called it $K$. The name came from Arnold Sommerfeld in a 1908 talk in Rome on the stability of parallel flows, where he introduced $R$ as "eine reine Zahl, die wir die Reynolds'sche Zahl nennen wollen" (a pure number, which we shall call the Reynolds number). Prandtl and Blasius used the name from 1910, and Moritz Weber's 1919 treatise on similarity began the wider habit of naming dimensionless numbers after people. The <dfn data-term="reynolds-number">Reynolds number</dfn> is now written $\mathrm{Re}$; who first used the two-letter symbol is not known.</p>

<aside class="who" data-person="arnold-sommerfeld">Sommerfeld's naming was forgotten until von Kármán pointed it out in 1954. Nikolaus Rott credited Prandtl in 1985 and corrected himself in a 1990 note on the history of the number. The same talk is the source of the Orr–Sommerfeld equation of stability theory.</aside>

<h3 id="vorticity-turbulence">Vorticity and turbulence</h3>

<p>The word "vorticity" is in Lamb's <em>Hydrodynamics</em> of 1895 ("a layer of fluid of uniform vorticity"). Truesdell credited Lamb with coining it, an attribution later doubted; who did coin it is not established. The symbols carry a trap. Lamb's rotation components $\xi$, $\eta$, $\zeta$, like Prandtl's 1904 "Wirbel" $w = \tfrac12\operatorname{rot} v$, are the angular velocity of a fluid element, which is half of today's <dfn data-term="vorticity">vorticity</dfn> $\boldsymbol{\omega} = \nabla\times\mathbf{u}$. Copy a classical result into modern notation and you can be off by a factor of two.</p>

<p>Reynolds described his two regimes as "direct" and "sinuous". The word <dfn data-term="turbulent">turbulent</dfn> as a technical term is Kelvin's, in an 1887 paper on "turbulently moving" liquid; it spread slowly and, according to Schmitt (2017), became standard only in the 1920s. Leonardo's notebooks, around 1505, describe where the "turbolenza" of water is generated and where it settles, and his eddy drawings are the usual illustration. Whether his word meant what ours means is disputed: one reading takes it as turbidity, water clouded with sediment.</p>

<p>The timeline below puts the symbols of this chapter, and the rest of the course's symbols, on one axis. Each dot opens a short record; each record links to the full entry in the <a href="#/symbols">symbols atlas</a>, with sources and the "myth check" for that symbol.</p>

<figure data-widget="notation-timeline" data-preset="notation-leibniz-d" class="wide"><figcaption>Symbols and names from the course's notation records (src/reference/notation-data.js), one lane per family. Filled dots have a well-supported date; hollow dots mark records whose origin the research could not establish. Symbols with no datable first use are counted in the readouts but not plotted.</figcaption></figure>

<div class="try"><ol>
<li>Step through the calculus lane with "Later ▶". Notice the gap between Legendre's $\partial$ (1786) and the vector lane: half a century of brackets.</li>
<li>Pick the "Vectors and tensors" family. Around 1900 the dots crowd together: Weber's grad, Ricci and Levi-Civita, Gibbs–Wilson. That decade fixed most of the notation used today.</li>
<li>Turn off "Only symbols in this chapter" and look at the numerical-analysis lane. Almost everything in it is from after 1940.</li>
</ol></div>

<div data-quiz="q5"></div>

<h2 id="grid-notation">The notation of the grid</h2>

<p>A computer cannot store a function. It stores a finite list of numbers, and each number needs a name that says where and when it belongs. Put grid points at $x_j = j\,\Delta x$ and time levels at $t_n = n\,\Delta t$. The value the computer holds there is written</p>

<div class="eq" id="eq-ujn">$$u_j^n \;\approx\; u(x_j, t_n) = u(j\,\Delta x,\; n\,\Delta t).$$<span class="eq-tag">(4.13)</span></div>

<p>The subscript is the place and the superscript is the time level. The superscript is not a power: $u_j^2$ is the value at time level 2, and its square is written $(u_j)^2$ or $(u_j^n)^2$. On a 2-D grid the place takes two subscripts, $p_{i,j}$.</p>

<p>Courant, Friedrichs and Lewy's 1928 paper, the founding text of numerical PDEs, wrote grid functions as ordinary functions and labelled the five points of its wave-equation scheme $u_0$ to $u_4$ around a "fundamental rhombus". Charney, Fjørtoft and von Neumann wrote $\Delta s$ and $\Delta t$ in their 1950 weather computation. The earliest explicit definition of the indexed shorthand found by the course's research is in Lax and Richtmyer's 1956 survey of stability, which on p. 288 "introduce the following abbreviations", among them $u^n_{ij}$ for $u^n(x, y)$. No single inventor is known. One detail is deliberate: the space index is usually $j$ rather than $i$, because <a href="#/advection/von-neumann">von Neumann analysis</a> puts $i = \sqrt{-1}$ into every formula.</p>

<p>The ratio of the two steps matters more than either one. For advection at speed $a$, the <dfn data-term="courant-number">Courant number</dfn> $\nu = a\,\Delta t/\Delta x$ counts how many cells a signal crosses in one step. Lax and Wendroff's 1958 report used the bare mesh ratio, "where λ abbreviates the quotient Δt/Δx of the time and space increments", which is convenient when the wave speeds vary.</p>

<h3 id="half-indices">Half indices and fluxes</h3>

<p>Between cells $j$ and $j+1$ lies a face, at $x_{j+1/2} = x_j + \tfrac12\Delta x$. That is where a <a href="#/conservation/finite-volume">finite-volume</a> method measures what flows from one cell to the next. If $F_{j+1/2}$ is the numerical flux through that face during one step, the <a href="#/conservation/finite-volume">finite-volume bookkeeping</a> of chapter 3 reads</p>

<div class="eq" id="eq-flux-form">$$u_j^{n+1} \;=\; u_j^n - \frac{\Delta t}{\Delta x}\left(\class{t2}{F_{j+1/2}} - \class{t1}{F_{j-1/2}}\right).$$<span class="eq-tag">(4.14)</span></div>

<p>What leaves cell $j$ through its right face enters cell $j+1$ through its left one, so the sum over all cells telescopes and the total is kept exactly. Lax and Wendroff wrote the flux difference as $\Delta g = g(x + \Delta x/2) - g(x - \Delta x/2)$; by 1983 Harten could call $\Delta_{j+1/2}u = u_{j+1} - u_j$ "the standard notation". Who first wrote a half-integer subscript is not established. On a staggered grid (<a href="#/pressure/mac">chapter 10</a>) the half index marks where velocities are stored rather than where a flux is computed.</p>

<h3 id="stencils">Stencils and orders</h3>

<p>Every update formula reads a few old values to write one new one. The pattern of points it reads is its <dfn data-term="stencil">stencil</dfn>. The <a href="#/advection/upwind">upwind scheme</a> for $u_t + a u_x = 0$ with $a > 0$ reads two points:</p>

<div class="eq" id="eq-upwind-stencil">$$u_j^{n+1} = u_j^n - \nu\left(u_j^n - u_{j-1}^n\right).$$<span class="eq-tag">(4.15)</span></div>

<p>Who coined "stencil", or the older "computational molecule", is not known; both were standard by the 1980s. The diagrams are older: the 1928 rhombus is one.</p>

<p>The last symbol says how fast the error falls as the grid is refined. Paul Bachmann wrote $O(n)$ in 1894 for a quantity whose order does not exceed that of $n$; the O is for <em>Ordnung</em>. Edmund Landau adopted it and added the little $o$ in 1909, which is why both are often called Landau symbols, though the big O is Bachmann's. Donald Knuth spread them through computer science in 1976. In numerical analysis, <dfn data-term="big-o">big-O</dfn> notation is a promise about small steps:</p>

<div class="eq" id="eq-big-o">$$E(h) = O(h^p) \quad\Longleftrightarrow\quad |E(h)| \le C\,h^p \ \text{ for all small enough } h .$$<span class="eq-tag">(4.16)</span></div>

<p>A scheme whose error is $O(\Delta x^p)$ is called $p$-th order (<a href="#/discretization/taylor">chapter 6</a> derives the orders from Taylor series). Halve the step and the error falls by about $2^p$: twice smaller for a first-order scheme, four times for a second-order one. Hold $\nu$ fixed while you refine and $\Delta t$ shrinks with $\Delta x$, so one $p$ describes both.</p>

<aside class="pitfall">Three clashes catch everyone once. $\Delta$ can be a step ($\Delta x$), a difference ($\Delta u$) or a Laplacian ($\Delta u$ again). Many books write $h = \Delta x$ and $k = \Delta t$, which is the reverse of the 1928 paper, where $h$ was the time step. And $u_j^n$ is never $u_j$ raised to the power $n$. When you read a scheme, first find out what each symbol names.</aside>

<p>The figure is a grid you can read. Choose a scheme and it marks the values the update reads and the one it writes, with the faces where the fluxes live. Underneath, it runs the course's advection kernel on a sine wave at $\nu = 0.8$ on 32, 64, 128 and 256 cells, and reports how much the error falls each time $\Delta x$ is halved.</p>

<figure data-widget="notation-grid" data-preset="lw" class="wide"><figcaption>The stencil of six schemes for $u_t + a u_x = 0$ on the space–time grid: read values in the read colour, the written value in the write colour, faces $j \pm 1/2$ with the flux stencils. The update and flux formulas are the kernel's own (src/sims/advection.js). The measured ratio comes from its convergence study (L1 error after one period, $\nu = 0.8$), beside the $2^p$ that $O(\Delta x^p)$ predicts.</figcaption></figure>

<div class="try"><ol>
<li>Tap any point, then a face. The name under the grid tells you which value it is: $u_{j-1}^n$, $F_{j+1/2}$, and so on.</li>
<li>Compare Lax–Wendroff with upwind. Both read three or fewer values, but halving $\Delta x$ divides Lax–Wendroff's error by 4.00 and upwind's by 1.98: second order against first.</li>
<li>Pick leapfrog. It reads a value two levels back, at $n-1$, and is second order too.</li>
<li>Pick FTCS. Its stencil looks as reasonable as Lax–Wendroff's, but its error explodes on the finer grids. A formula can be correct to first order and still be useless; <a href="#/advection/ftcs">chapter 7</a> explains why.</li>
</ol></div>

<div data-quiz="q6"></div>

<p>From here on the course speaks this notation. The next chapter uses it to ask which combinations of quantities a flow actually depends on. Part II then asks what happens to the equations of this chapter when every $\partial$ becomes a $\Delta$.</p>

<h2 id="sources">Sources and further reading</h2>
<ol class="refs">
<li>F. Cajori, <i>A History of Mathematical Notations</i>, 2 vols. Open Court, Chicago, 1928–1929. Vol. II covers $d$, $\partial$, $\nabla$ and the dot notation.</li>
<li>J. Miller, <i>Earliest Uses of Symbols of Calculus</i> and <i>Earliest Known Uses of Some of the Words of Mathematics</i>, MacTutor History of Mathematics, University of St Andrews.</li>
<li>L. Euler, "Principes généraux du mouvement des fluides", <i>Mémoires de l'Académie des Sciences de Berlin</i> 11 (volume for 1755, printed 1757), 274–315 (E226). English translation by T. E. Burton, adapted by U. Frisch, arXiv:0802.2383 (2008).</li>
<li>O. Darrigol and U. Frisch, "From Newton's mechanics to Euler's equations", <i>Physica D</i> 237 (2008), 1855–1869.</li>
<li>C.-L. Navier, "Mémoire sur les lois du mouvement des fluides", <i>Mémoires de l'Académie Royale des Sciences de l'Institut de France</i> 6 (1827), 389–440.</li>
<li>G. G. Stokes, "On the theories of the internal friction of fluids in motion, and of the equilibrium and motion of elastic solids", <i>Transactions of the Cambridge Philosophical Society</i> 8 (1845, printed 1847), 287–319.</li>
<li>S. R. Bistafa, "On the development of the Navier–Stokes equation by Navier", <i>Revista Brasileira de Ensino de Física</i> 40(2) (2018).</li>
<li>O. Darrigol, "Between hydrodynamics and elasticity theory: the first five births of the Navier–Stokes equation", <i>Archive for History of Exact Sciences</i> 56 (2002), 95–150.</li>
<li>A.-L. Cauchy, "De la pression ou tension dans un corps solide", <i>Exercices de mathématiques</i>, seconde année (1827), 42–56.</li>
<li>W. R. Hamilton, "On quaternions; or on a new system of imaginaries in algebra", <i>Philosophical Magazine</i>, 3rd series, 1844–1850 (in instalments); and the paper communicated on 20 July 1846, <i>Proceedings of the Royal Irish Academy</i> 3 (1847), 273–292, where the operator is printed as ◁.</li>
<li>J. C. Maxwell, "Remarks on the mathematical classification of physical quantities", <i>Proceedings of the London Mathematical Society</i> 3 (1871), 224–232; and <i>A Treatise on Electricity and Magnetism</i>, Clarendon Press, Oxford, 1873.</li>
<li>W. K. Clifford, <i>Elements of Dynamic</i>, Part I: <i>Kinematic</i>. Macmillan, London, 1878.</li>
<li>J. W. Gibbs, <i>Elements of Vector Analysis</i>, privately printed, New Haven, 1881–1884; reprinted in <i>The Scientific Papers of J. Willard Gibbs</i>, vol. 2, 1906.</li>
<li>O. Heaviside, <i>Electromagnetic Theory</i>, vol. 1. The Electrician, London, 1893.</li>
<li>E. B. Wilson, <i>Vector Analysis: A Text-Book for the Use of Students of Mathematics and Physics, Founded upon the Lectures of J. Willard Gibbs</i>. Scribner's, New York, 1901.</li>
<li>C. G. Knott, <i>Life and Scientific Work of Peter Guthrie Tait</i>. Cambridge University Press, 1911.</li>
<li>G. Ricci and T. Levi-Civita, "Méthodes de calcul différentiel absolu et leurs applications", <i>Mathematische Annalen</i> 54 (1900), 125–201.</li>
<li>A. Einstein, "Die Grundlage der allgemeinen Relativitätstheorie", <i>Annalen der Physik</i> 49 (1916), 769–822.</li>
<li>G. K. Batchelor, <i>An Introduction to Fluid Dynamics</i>. Cambridge University Press, 1967.</li>
<li>N. Rott, "Note on the history of the Reynolds number", <i>Annual Review of Fluid Mechanics</i> 22 (1990), 1–12.</li>
<li>F. G. Schmitt, "Turbulence from 1870 to 1920: the birth of a noun and of a concept", <i>Comptes Rendus Mécanique</i> 345 (2017), 620–626.</li>
<li>P. D. Lax and R. D. Richtmyer, "Survey of the stability of linear finite difference equations", <i>Communications on Pure and Applied Mathematics</i> 9 (1956), 267–293.</li>
<li>P. D. Lax and B. Wendroff, "Systems of conservation laws", <i>Communications on Pure and Applied Mathematics</i> 13 (1960), 217–237.</li>
<li>P. Bachmann, <i>Die analytische Zahlentheorie</i>. Teubner, Leipzig, 1894.</li>
<li>D. E. Knuth, "Big Omicron and big Omega and big Theta", <i>SIGACT News</i> 8(2) (1976), 18–24.</li>
</ol>
`,
  widgets: {
    'notation-five-ways': mountFiveWays,
    'notation-einstein': mountEinstein,
    'notation-timeline': mountTimeline,
    'notation-grid': mountGrid,
  },
  quizzes: {
    q1: {
      type: 'mcq',
      q: 'In Stokes\'s 1845 paper on viscous fluids you read $\\frac{du}{dx}$ inside the equation of motion, where $u$ depends on $x$, $y$, $z$ and $t$. What does it mean?',
      choices: [
        'The ordinary derivative of $u$ along $x$, as for a function of one variable',
        'The partial derivative $\\partial u/\\partial x$, with $y$, $z$ and $t$ held fixed',
        'A finite difference $\\Delta u/\\Delta x$ on a small but finite step',
        'The rate of change of $u$ following a fluid particle',
      ],
      answer: 1,
      explain: 'Legendre\'s $\\partial$ (1786) had been abandoned, and Jacobi\'s revival (1841) was slow to reach Britain, so Stokes wrote a plain $d$ for partial derivatives. That is exactly why he needed a capital $D$ for the derivative following a particle: $Du/Dt = du/dt + u\\,du/dx + v\\,du/dy + w\\,du/dz$, with every lower-case $d$ partial.',
    },
    q2: {
      type: 'predict',
      q: 'Before you step through the figure: which of the five kinds of term is missing from Euler\'s 1757 equation (4.4)?',
      choices: [
        'The pressure term: Euler had density but no pressure',
        'The convective term: it arrived with Stokes\'s $D/Dt$ in 1845',
        'The friction term: Euler\'s fluid has no viscosity',
        'The body force: gravity was added by Navier',
      ],
      answer: 2,
      explain: 'Euler\'s fluid is ideal. It has the pressure term (his $p$), the outside force ($P$) and the full convective acceleration $u(du/dx) + v(du/dy) + w(du/dz)$. Stokes gave that acceleration a single symbol; he did not discover it. Friction arrived with Navier in 1822, as $\\varepsilon$ times a sum of second derivatives.',
    },
    q3: {
      type: 'mcq',
      q: 'Maxwell\'s <i>Treatise</i> (1873) says the value of $q$ at a point exceeds the mean of its neighbourhood when $\\nabla^2 q$ is positive. At such a point, what is the sign of today\'s Laplacian $\\partial_x^2 q + \\partial_y^2 q + \\partial_z^2 q$?',
      choices: [
        'Positive: $\\nabla^2$ has always meant the Laplacian',
        'Negative: in quaternions $i^2 = -1$, so Maxwell\'s $\\nabla^2$ is minus today\'s Laplacian',
        'Zero: the mean-value property holds for every smooth function',
        'It cannot be compared, because Maxwell\'s $\\nabla$ is a different operator',
      ],
      answer: 1,
      explain: 'Maxwell used Hamilton\'s $\\nabla = i\\,d/dx + j\\,d/dy + k\\,d/dz$, and $i^2 = j^2 = k^2 = -1$ makes $\\nabla^2 = -(\\partial_x^2 + \\partial_y^2 + \\partial_z^2)$. A point that stands above its surroundings has a negative Laplacian, so Maxwell\'s $\\nabla^2 q$ is positive there. Gibbs and Heaviside dropped the minus sign, and with it the quaternion.',
    },
    q4: {
      type: 'mcq',
      q: 'In three dimensions, how many separate equations does $\\partial_j \\sigma_{ij} + \\rho f_i = 0$ stand for, and how many derivative terms does each one contain?',
      choices: [
        'One equation with 9 derivative terms',
        'Three equations, each with 3 derivative terms',
        'Three equations, each with 9 derivative terms',
        'Nine equations, each with 1 derivative term',
      ],
      answer: 1,
      explain: 'The free index $i$ appears once in each term, so there is one equation per direction. The index $j$ appears twice, so it is summed over three values. Row $x$ is Cauchy\'s $dA/dx + dF/dy + dE/dz + \\rho X = 0$. The 9 numbers belong to $\\sigma_{ij}$ itself, but each equation uses only one row of them.',
    },
    q5: {
      type: 'mcq',
      q: 'Who gave the Reynolds number its name?',
      choices: [
        'Osborne Reynolds, in his 1883 paper on pipe flow',
        'George Stokes, who noticed the similarity of viscous flows in 1850',
        'Arnold Sommerfeld, in a 1908 talk on the stability of parallel flows',
        'Ludwig Prandtl, who used it to compare models with full-scale flows',
      ],
      answer: 2,
      explain: 'Reynolds found the parameter and in 1895 called it $K$, but he did not name it after himself. Stokes had the similarity idea first, and Prandtl named it deliberately in 1913 and made it standard. The earliest documented use of "Reynolds number" is Sommerfeld\'s, in Rome in 1908, as Rott (1990) showed after first crediting Prandtl himself.',
    },
    q6: {
      type: 'num',
      q: 'The course\'s advection kernel runs Lax–Wendroff on a sine wave at $\\nu = 0.8$ for one period. The L1 error is $2.31\\times10^{-3}$ on 64 cells and $5.78\\times10^{-4}$ on 128 cells. If the error is $O(\\Delta x^p)$, what is $p$? (Two decimal places.)',
      answer: 2.0,
      atol: 0.03,
      explain: 'Halving $\\Delta x$ divides the error by $2.31\\times10^{-3}/5.78\\times10^{-4} \\approx 4.0 = 2^p$, so $p = \\log_2 4.0 \\approx 2.00$. A ratio near 2 would mean first order, as upwind gives (1.98 at the same settings). Always quote the ratio from the finest pair of grids: on coarse grids the higher powers of $\\Delta x$ still matter.',
    },
  },
  glossary: {
    'partial-derivative': {
      term: 'partial derivative',
      def: 'The rate of change of a function of several variables with respect to one of them, the others held fixed: $\\partial u/\\partial x$. For a flow field $u(x, y, z, t)$, $\\partial u/\\partial t$ is what a probe fixed in space records. The curly $\\partial$ is Legendre\'s (1786), made standard after Jacobi revived it in 1841.',
      section: 'calculus',
    },
    nabla: {
      term: 'nabla (∇, del)',
      def: 'The vector differential operator $\\nabla = \\mathbf{i}\\,\\partial_x + \\mathbf{j}\\,\\partial_y + \\mathbf{k}\\,\\partial_z$. Applied to a scalar it gives the gradient; dotted or crossed with a vector field it gives the divergence $\\nabla\\cdot\\mathbf{u}$ and the curl $\\nabla\\times\\mathbf{u}$. Introduced by Hamilton (1846) in quaternion form; the modern dot-and-cross use is Gibbs\'s.',
      section: 'vectors',
    },
    'einstein-summation': {
      term: 'summation convention',
      def: 'The rule, stated by Einstein in 1916, that an index repeated in one term is summed over its range and the $\\Sigma$ is left out: $a_i b_i = a_1 b_1 + a_2 b_2 + a_3 b_3$. An index may appear at most twice in a term.',
      section: 'tensors',
    },
    'index-notation': {
      term: 'index notation',
      def: 'Writing vectors and tensors through their components, $u_i$, $\\sigma_{ij}$, usually with the summation convention. An index that appears once in a term is free and means one equation per value; an index that appears twice is summed.',
      section: 'tensors',
    },
    tensor: {
      term: 'tensor',
      def: 'A quantity with components that maps directions to vectors and transforms in a fixed way when the axes rotate. The stress tensor turns the unit normal of a surface into the force per unit area on it: $t_i = \\sigma_{ij} n_j$. The word in this sense is Voigt\'s (1898).',
      section: 'tensors',
    },
    stencil: {
      term: 'stencil',
      def: 'The set of grid points that a discrete formula reads to approximate or update one value. The upwind scheme reads $u_{j-1}^n$ and $u_j^n$ to write $u_j^{n+1}$; the five-point Laplacian reads a point and its four neighbours. Also called a computational molecule.',
      section: 'grid-notation',
    },
    'big-o': {
      term: 'big-O notation',
      def: '$E = O(h^p)$ means $|E| \\le C h^p$ for some constant $C$ as $h \\to 0$. An error of order $p$ falls by about $2^p$ when $h$ is halved. The symbol is Bachmann\'s (1894); Landau added little-o in 1909.',
      section: 'grid-notation',
    },
  },
  pathologies: [],
  css: `
.chapter[data-chapter="notation"] .nt-key { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 0.85rem; color: var(--muted); }
.chapter[data-chapter="notation"] .nt-key-item { display: inline-flex; align-items: center; gap: 6px; }
.chapter[data-chapter="notation"] .nt-sw { display: inline-block; width: 12px; height: 12px; border-radius: 3px; background: var(--muted); }
.chapter[data-chapter="notation"] .nt-sw.t1 { background: var(--s1); }
.chapter[data-chapter="notation"] .nt-sw.t2 { background: var(--s2); }
.chapter[data-chapter="notation"] .nt-sw.t3 { background: var(--s3); }
.chapter[data-chapter="notation"] .nt-sw.t4 { background: var(--s4); }
.chapter[data-chapter="notation"] .nt-sw.t5 { background: var(--s5); }
.chapter[data-chapter="notation"] .nt-card { display: grid; gap: 6px; min-width: 0; background: var(--board); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
.chapter[data-chapter="notation"] .nt-stage-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.chapter[data-chapter="notation"] .nt-step { font-family: var(--font-mono); font-size: 0.8rem; color: var(--muted); }
.chapter[data-chapter="notation"] .nt-when { color: var(--muted); font-size: 0.85rem; }
.chapter[data-chapter="notation"] .nt-eqs { min-width: 0; max-width: 100%; overflow-x: auto; overflow-y: hidden; }
.chapter[data-chapter="notation"] .nt-compact { font-size: 1.15rem; }
.chapter[data-chapter="notation"] .nt-comp-label { margin: 0; font-size: 0.85rem; color: var(--muted); }
.chapter[data-chapter="notation"] .nt-note { margin: 0; font-size: 0.9rem; }
.chapter[data-chapter="notation"] .nt-plain mrow.t1, .chapter[data-chapter="notation"] .nt-plain mrow.t2, .chapter[data-chapter="notation"] .nt-plain mrow.t3, .chapter[data-chapter="notation"] .nt-plain mrow.t4, .chapter[data-chapter="notation"] .nt-plain mrow.t5 { color: inherit; }
.chapter[data-chapter="notation"] .nt-plain .nt-key { visibility: hidden; }
.chapter[data-chapter="notation"] .nt-all { margin: 0; padding-left: 1.4em; display: grid; gap: 6px; min-width: 0; }
.chapter[data-chapter="notation"] .nt-all > li { min-width: 0; padding: 4px 8px; border-radius: 8px; }
.chapter[data-chapter="notation"] .nt-all > li.current { background: var(--board); outline: 1px solid var(--line); }
.chapter[data-chapter="notation"] .nt-all-title { font-size: 0.85rem; color: var(--muted); }
.chapter[data-chapter="notation"] .nt-tl-card { display: flex; gap: 12px; align-items: flex-start; min-width: 0; background: var(--board); border: 1px solid var(--line); border-radius: 10px; padding: 8px 12px; }
.chapter[data-chapter="notation"] .nt-tl-sym { flex: 0 0 auto; font-size: 1.4rem; min-width: 3.2rem; max-width: 45%; overflow-x: auto; overflow-y: hidden; }
.chapter[data-chapter="notation"] .nt-tl-sym.nt-tl-word { font-size: 0.95rem; }
.chapter[data-chapter="notation"] .nt-tl-text { display: grid; gap: 2px; min-width: 0; font-size: 0.9rem; overflow-wrap: anywhere; }
.chapter[data-chapter="notation"] .nt-flag { color: var(--bad); font-size: 0.85rem; }
.chapter[data-chapter="notation"] .nt-tag { min-height: 2.4rem; }
`,
};
