// Symbols and their histories, from the fact-checked research dossier. Each record:
//   { id, group, symbol, tex, name, meaning, introduced_by, year, first_work, popularised_by,
//     story, original_form, contested, confidence, chapters, sources }
// group: calculus | vectors | fluid | numbers | numerics.
// Regenerate with: node aids/fluid-course/dev/import-research.mjs <research dir>

export const NOTATION = [
 {
  "id": "turbolenza-leonardo",
  "symbol": "turbolenza",
  "tex": "\\mathrm{turbolenza}",
  "name": "Leonardo's 'turbolenza'",
  "meaning": "Leonardo's word for the disturbed state of water in his notes on eddies. It is often cited as the first naming of turbulence.",
  "introduced_by": "Leonardo da Vinci",
  "year": "c. 1505–1506 (approximate date of the folio, as given by Colagrossi et al. 2021)",
  "first_work": "Codex Atlanticus, f. 201v (formerly 74v)",
  "popularised_by": "Modern histories of turbulence, e.g. Colagrossi et al., Physics of Fluids 33, 115122 (2021)",
  "story": "On a folio of the Codex Atlanticus, Leonardo lists where the 'turbolenza' of water is generated, where it persists and where it settles. As transcribed by Colagrossi et al. (2021, https://pubs.aip.org/aip/pof/article/33/11/115122/1063774/Da-Vinci-s-observation-of-turbulence-A-French), the lines read: \"doue la turbolenza dell'acqua si genera\" / \"doue la turbolenza dell'acqua si mantiene plugho\" / \"doue la turbolenza dell'acqua si posa;\". His drawings of eddies behind obstacles are the usual illustration.",
  "original_form": "",
  "contested": "It is disputed whether 'turbolenza' meant what 'turbulence' means now. Macagno, as quoted in the 2021 paper, argued that it 'is certainly not what we call 'turbulence' nowadays' and read it as turbidity (sediment-laden water). The modern technical sense of 'turbulent' dates from Kelvin (1887).",
  "confidence": "medium",
  "chapters": [
   "turbulence",
   "notation"
  ],
  "sources": [
   "https://pubs.aip.org/aip/pof/article/33/11/115122/1063774/Da-Vinci-s-observation-of-turbulence-A-French",
   "https://comptes-rendus.academie-sciences.fr/mecanique/articles/10.1016/j.crme.2017.06.003/"
  ],
  "group": "fluid"
 },
 {
  "id": "notation-leibniz-d",
  "symbol": "dx, dy, dy/dx",
  "tex": "\\frac{dy}{dx}",
  "name": "Leibniz's differential d",
  "meaning": "dx is the differential (an infinitely small increment) of x, and dy/dx is the derivative. In numerical work the infinitesimal d becomes a finite step Δx, and derivatives are replaced by difference quotients.",
  "introduced_by": "Gottfried Wilhelm Leibniz",
  "year": "1675 (manuscript); 1684 (print)",
  "first_work": "Manuscript of 11 November 1675 (Methodi tangentium inversae exempla), where dx and dy first appear. First printed in 'Nova methodus pro maximis et minimis, itemque tangentibus, quae nec fractas nec irrationales quantitates moratur, et singulare pro illis calculi genus', Acta Eruditorum, October 1684, pp. 467–473.",
  "popularised_by": "The Bernoulli brothers and L'Hospital's textbook Analyse des infiniment petits (1696) on the Continent. Britain adopted it only after the Cambridge Analytical Society campaign (founded 1811; Lacroix translation 1816; Peacock's Tripos papers of 1817 and 1819).",
  "story": "In a manuscript of 29 October 1675 Leibniz first used d as a divisor, writing that just as ∫ raises dimensions, d lowers them: '∫ autem significat summam, d differentiam' ('∫ means sum, d means difference'; Gerhardt's text as quoted in Cajori, https://archive.org/details/AHistoryOfMathematicalNotationVolII). On 11 November 1675 he wrote that dx is the same as x/d, 'the difference between two neighbouring x's', and in the same manuscript asked whether dx dy equals d(xy) and whether the quotient dx/dy equals d(x/y). Cajori notes that he had written the differential of y successively as ω, l and y/d before settling on dy. The d stands for differentia.",
  "original_form": "dx : dy \\quad (\\text{1684 print; earlier } \\tfrac{x}{d})",
  "contested": "Cajori says the 1684 paper prints 'dw ad dx', 'dx ad dy' and 'dx : dy', but not the stacked fraction; the fraction form appears in the 11 November 1675 manuscript (there written dx/dy). An earlier draft of this record said the fraction appears 'only' in the 1675 manuscripts, which overstates what Cajori says. MacTutor's Leibniz biography gives 21 November 1675 as the first manuscript with ∫f(x)dx, while Cajori and Miller (from Gerhardt and the Akademie edition) date the first dx to 11 November 1675; the dates count different things. Cajori argues that Leibniz's sequence of trial symbols tells against Karl Bopp's suggestion that Leibniz took d from Arnauld's d'x (1667). The Analytical Society is often dated 1812 (Babbage's recollection); MacTutor puts its first meeting on 7 May 1811.",
  "confidence": "high",
  "chapters": [
   "notation",
   "discretization"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Leibniz/",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Peacock/"
  ],
  "group": "calculus"
 },
 {
  "id": "notation-leibniz-integral",
  "symbol": "∫",
  "tex": "\\int f\\,dx",
  "name": "Leibniz's integral sign",
  "meaning": "The integral, which Leibniz read as the sum of all the infinitesimal pieces. Control-volume balances are integrals, and the finite volume method mirrors Leibniz's reading: a finite sum over cells.",
  "introduced_by": "Gottfried Wilhelm Leibniz",
  "year": "1675 (manuscript); 1686 (print)",
  "first_work": "Manuscript 'Analyseos tetragonisticae pars secunda', 29 October 1675. First printed in 'De geometria recondita et analysi indivisibilium atque infinitorum', Acta Eruditorum, June 1686, pp. 292–300 (the sign appears on pp. 297 and 299).",
  "popularised_by": "Johann Bernoulli, who had proposed the letter I (and the name calculus integralis), finally adopted ∫ in deference to Leibniz (Cajori, citing their correspondence including Bernoulli's letter of 7 April 1696). It then spread with the Leibnizian calculus.",
  "story": "Leibniz had been writing 'omn.' (omnia, 'all') in front of the lines being summed, following Cavalieri. On 29 October 1675 he wrote: 'Utile erit scribi ∫ pro omnia, ut ∫l = omn. l, id est summa ipsorum l' ('It will be useful to write ∫ for omn., so that ∫l = omn. l, that is, the sum of the l's'; https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/). The sign is a long s for summa. On 11 November 1675 he began writing dx after it, replacing x/d. In the 1686 printing the sign lacked its lower part and looked like the ordinary printed long s, much like an f (Cajori). The tall, slender form came with later printings.",
  "original_form": "\\int l \\;=\\; \\mathrm{omn.}\\, l",
  "contested": "MacTutor's Leibniz biography says Leibniz first used ∫f(x)dx on 21 November 1675. Cajori (working from Gerhardt's facsimile) and Miller (citing the Akademie edition) date the bare ∫ to 29 October 1675 and ∫...dx to 11 November 1675. The dates differ because they count different features. Cajori does not say a typesetter 'cut off' the sign; he says the printed form lacked the lower part, so avoid the typesetter anecdote.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation",
   "discretization"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Leibniz/"
  ],
  "group": "calculus"
 },
 {
  "id": "notation-newton-fluxion-dots",
  "symbol": "ẋ, ẍ",
  "tex": "\\dot{x}",
  "name": "Newton's fluxion dots",
  "meaning": "Newton's fluxion: the rate at which a 'flowing' quantity (a fluent) changes in time. Today ẋ means dx/dt, mostly in mechanics, dynamical systems and control.",
  "introduced_by": "Isaac Newton",
  "year": "1691 (adopted, per Whiteside); 1693 (first print)",
  "first_work": "First printed in John Wallis, De algebra tractatus, in Wallis's Opera mathematica vol. 2 (Oxford, 1693), pp. 390–396. Wallis printed it from material Newton sent him in 1692 (Newton later dated his letter 27 August 1692).",
  "popularised_by": "English writers of the 18th century, who used the dots almost exclusively (Cajori). Cambridge dropped them after the Analytical Society (Babbage, Herschel, Peacock), the 1816 English translation of Lacroix, and Peacock's 1817 and 1819 Tripos papers in Leibniz notation.",
  "story": "Newton developed fluxions in 1665–66 but at first denoted them with other letters or symbols. D. T. Whiteside concluded that 'the standard dot-notation for fluxions was invented by him only in mid-December 1691' (quoted in Kollerstrom, https://arxiv.org/abs/1212.2666). In drafts written during the priority dispute, Newton reported Johann Bernoulli's objection that his early letters and papers contained no 'prickt letters', and answered not by denying it but by arguing that the method did not depend on them (https://www.newtonproject.ox.ac.uk/view/texts/normalized/NATP00371). After a Royal Society committee ruled for Newton (published as Commercium epistolicum near the beginning of 1713), English mathematicians kept Newton's dots while the Continent used Leibniz's d. Babbage recalled suggesting a title for the Analytical Society's volume: 'The Principles of pure D-ism in opposition to the Dot-age of the University' (https://www.gutenberg.org/ebooks/57532). The dots survive for time derivatives; Lagrange himself used them that way in the second edition of the Mécanique analytique (Cajori).",
  "original_form": "\\dot{x},\\; \\ddot{x}",
  "contested": "Cajori (1929), following Rigaud, says Newton first used dots on a leaf dated 20 May 1665, of which no facsimile was ever made. Whiteside's later study of the manuscripts puts the standard dot notation in December 1691. Commonly repeated '1665' dates for the dots therefore rest on the older account. An earlier draft of this record said Newton's own notes 'admit' his early papers lacked dots; in fact the drafts report Bernoulli's objection, which Newton does not deny. The equation previously given as Newton's original form could not be checked against a scan and has been replaced by the bare symbols. The Analytical Society's founding year is disputed: Babbage said 1812, but MacTutor follows historians who put the first meeting on 7 May 1811.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "https://arxiv.org/abs/1212.2666",
   "https://www.newtonproject.ox.ac.uk/view/texts/normalized/NATP00371",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Peacock/"
  ],
  "group": "calculus"
 },
 {
  "id": "notation-euler-parentheses",
  "symbol": "(du/dx)",
  "tex": "\\left(\\frac{du}{dx}\\right)",
  "name": "Euler's bracket notation for partial derivatives",
  "meaning": "The partial derivative of u with respect to x, with the other variables held fixed. It is written with an ordinary d and marked as partial only by the round brackets.",
  "introduced_by": "Leonhard Euler",
  "year": "1755",
  "first_work": "Institutiones calculi differentialis (St Petersburg, 1755), vol. I, p. 195 (Cajori). It is also used throughout 'Principes généraux du mouvement des fluides', written 1755 and printed 1757 in Mémoires de l'Académie des sciences de Berlin 11, pp. 274–315 (E226).",
  "popularised_by": "Cajori lists users including Waring, Laplace, Monge, Legendre (1784) and Lagrange (1759, 1792). John Perry still preferred it in 1902.",
  "story": "In 1728 Euler gave partial derivatives separate letters (P, Q, R). By 1755 he enclosed them in parentheses. The fluid memoir E226 uses this notation for the continuity equation and for the acceleration of a fluid particle: (du/dt) + u(du/dx) + v(du/dy) + w(du/dz), which is today's material derivative. The brackets could be confused with algebraic grouping. Lagrange (Mécanique analitique, 1788) and then Lacroix dropped them and relied on context. In 1841 Jacobi gave the pile-up of brackets as his reason for using ∂.",
  "original_form": "\\left(\\frac{du}{dt}\\right) + u\\left(\\frac{du}{dx}\\right) + v\\left(\\frac{du}{dy}\\right) + w\\left(\\frac{du}{dz}\\right)",
  "contested": "Cajori's earliest citation is the 1755 Institutiones; earlier uses by Euler have not been checked. Darrigol and Frisch (2008) say E226 was presented to the Berlin Academy on 4 September 1755; other sources give different dates. The Euler Archive gives only 'written 1755', printed 1757.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation",
   "viewpoints"
  ],
  "sources": [
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "https://arxiv.org/abs/0802.2383",
   "https://scholarlycommons.pacific.edu/euler-works/226"
  ],
  "group": "calculus"
 },
 {
  "id": "notation-delta-finite-difference",
  "symbol": "Δ (Δy, Δx, Δt)",
  "tex": "\\Delta y = y(x+\\omega) - y(x)",
  "name": "Δ for a finite difference",
  "meaning": "The finite change in y when x is increased by a fixed step. Finite-difference schemes are built from it: Δx and Δt are the grid spacing and time step, and Δ²y is the second difference behind the standard three-point Laplacian.",
  "introduced_by": "Leonhard Euler",
  "year": "1755",
  "first_work": "Institutiones calculi differentialis (St Petersburg, 1755), Part I, ch. 1 (pp. 3–7, 27). The companion sign Σ is introduced in §26, p. 23.",
  "popularised_by": "Lagrange (1772) and Laplace adopted it (Cajori). In Britain it arrived with the Leibnizian calculus in the early 19th century and was used by J. F. W. Herschel, A Collection of Examples of the Applications of the Calculus of Finite Differences (Cambridge, 1820), and later by George Boole, including his Treatise on the Calculus of Finite Differences (1860).",
  "story": "Euler chose the Greek capital counterpart of Leibniz's d: d for infinitely small differences, Δ for finite ones. For values y, y^I, y^II, ... at x, x+ω, x+2ω, ... he wrote y^I − y = Δy and ΔΔy for second differences. In the same chapter he wrote: 'Quemadmodum ad differentiam denotandam vsi sumus signo Δ, ita summam indicabimus signo Σ' ('just as we have used the sign Δ to denote a difference, so we shall indicate a sum by the sign Σ'; https://mathshistory.st-andrews.ac.uk/Miller/mathsym/operation/). Before Euler, Brook Taylor's Methodus incrementorum (1715) marked increments with dots under the letters.",
  "original_form": "y^{I} - y = \\Delta y, \\quad \\Delta\\Delta y = \\Delta y^{I} - \\Delta y",
  "contested": "Johann Bernoulli used a delta in 1706 in a provisional sense, for differential coefficients or 'différences des fonctions'. Cajori prints it as a capital, Miller's page as a lowercase δ. Euler's 1755 usage is the one that stuck. The same Δ was later taken for the Laplacian (Murphy, 1833), and that double meaning survives in numerical analysis. Herschel's 1820 book is sometimes cited as 'Calculus of Finite Differences'; its title is A Collection of Examples of the Applications of the Calculus of Finite Differences.",
  "confidence": "high",
  "chapters": [
   "notation",
   "discretization"
  ],
  "sources": [
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/operation/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/"
  ],
  "group": "numerics"
 },
 {
  "id": "euler-equations-1757",
  "symbol": "P − (1/q)(dp/dx) = (du/dt) + u(du/dx) + v(du/dy) + w(du/dz)",
  "tex": "\\frac{\\partial \\mathbf{u}}{\\partial t} + (\\mathbf{u} \\cdot \\nabla)\\mathbf{u} = -\\frac{1}{\\rho}\\nabla p + \\mathbf{f}",
  "name": "Euler's equations of fluid motion (E226)",
  "meaning": "The equations of motion for an inviscid fluid: conservation of mass plus Newton's second law for a fluid element, with pressure as the only internal force. Compressible and incompressible solvers start from them, and the Navier–Stokes equations add the viscous stress.",
  "introduced_by": "Leonhard Euler",
  "year": "Presented to the Berlin Academy in 1755 (4 September according to Darrigol & Frisch 2008); printed 1757 in the volume dated 1755",
  "first_work": "'Principes généraux du mouvement des fluides', Mémoires de l'Académie des sciences de Berlin 11 (volume for 1755, printed 1757), pp. 274–315; Eneström E226; Opera Omnia ser. 2 vol. 12, pp. 54–91.",
  "popularised_by": "Lagrange's 1781 memoir restated them in his own letters: p, q, r for the velocity components, Δ for density and Π for pressure. The compact vector form used today came much later.",
  "story": "Euler had already worked toward these equations in a Latin memoir, read in Berlin on 31 August 1752 and printed in St Petersburg in 1761 as 'Principia motus fluidorum' (Novi Commentarii 6, for 1756–57, pp. 271–311; E258). In the French memoir he wrote one continuity equation and three momentum equations in component form. He used u, v, w for velocity, p for pressure and q for density. The ∂ symbol was not in use, so a partial derivative was written as d inside round brackets, as in (du/dx). In §26 he treated the case where u dx + v dy + w dz is an exact differential and called the function W, writing dW = u dx + v dy + w dz + Π dt. In modern terms W is a velocity potential.",
  "original_form": "P-\\frac{1}{q}\\left(\\frac{dp}{dx}\\right)=\\left(\\frac{du}{dt}\\right)+u\\left(\\frac{du}{dx}\\right)+v\\left(\\frac{du}{dy}\\right)+w\\left(\\frac{du}{dz}\\right);\\quad \\left(\\frac{dq}{dt}\\right)+\\left(\\frac{d.qu}{dx}\\right)+\\left(\\frac{d.qv}{dy}\\right)+\\left(\\frac{d.qw}{dz}\\right)=0",
  "contested": "The presentation date is disputed. Darrigol and Frisch (2008) give 4 September 1755. The Observatoire de la Côte d'Azur historical note gives 9 September and 2 October 1755 for the French memoirs, and may be dating the group of three rather than this one paper. Because the volume is dated 1755, the paper is often cited as 1755, although it was printed in 1757. Euler's equations look modern but are in his own system of units. According to the footnotes in Frisch's translation, p is a pressure measured as the height of a column of a reference fluid, q = ρ/ρ0 is a dimensionless density, the forces P, Q, R are divided by g, and velocity and time are also rescaled by √g. The formulas here follow Frisch's English translation, which adapts Burton's.",
  "confidence": "high",
  "chapters": [
   "conservation",
   "notation",
   "viewpoints"
  ],
  "sources": [
   "https://arxiv.org/abs/0802.2383",
   "https://scholarlycommons.pacific.edu/euler-works/226/",
   "https://www.oca.eu/etc7/EE250/historical_note.html",
   "https://www.oca.eu/etc7/EE250/texts/darrigol-frisch.pdf"
  ],
  "group": "fluid"
 },
 {
  "id": "delta-t-delta-x",
  "symbol": "Δt, Δx",
  "tex": "\\Delta t,\\ \\Delta x",
  "name": "Time step and grid spacing",
  "meaning": "The increments between neighbouring time levels and between neighbouring grid points (or cell widths). Their ratio, multiplied by a wave speed, is the Courant number.",
  "introduced_by": "Δ for a finite difference, and Δx for the increment of x: Leonhard Euler (1755). In numerical PDEs: Charney, Fjørtoft and von Neumann (Δs, Δt; 1950), then Lax and Richtmyer (Δt, Δx; 1956).",
  "year": "1755 (Euler's Δy and Δx = ω); 1950–1956 (numerical-PDE usage found here)",
  "first_work": "L. Euler, Institutiones calculi differentialis (St Petersburg, 1755), Part I, ch. 1, §4 (Δy) and §8 (Δx = ω)",
  "popularised_by": "Lax and Richtmyer (1956); Richtmyer and Morton (1967)",
  "story": "In Institutiones calculi differentialis (1755), Part I, chapter 1, Euler lets x take the values x, x + ω, x + 2ω, and so on. In §4 he defines the difference Δy = y^I − y, the increment of y when x becomes x + ω. In §8 he takes y = x and notes that Δx = ω. He then says that, by analogy, the symbol Δx will be used in place of ω ('ob analogiam loco litterae ω iste character Δx commode adhibebitur'). Cajori (1929, §640) writes: 'Wide acceptance has been given to the symbolism on finite differences introduced by L. Euler.' Jeff Miller's notes record Johann Bernoulli using a small δ for the difference of functions in 1706. The founding numerical-PDE paper did not use Δ for the steps: Courant, Friedrichs and Lewy (1928) used h for the time step and kh for the space step. Charney, Fjørtoft and von Neumann (1950) wrote Δs and Δt, and Lax and Richtmyer (1956) and Richtmyer and Morton (1967) wrote Δt and Δx.",
  "original_form": "\\Delta y = y^{I} - y,\\ \\ \\Delta x = \\omega",
  "contested": "A common error credits Δx to Simon L'Huilier (1786) and says Euler's step was only ω. In fact Euler wrote Δx = ω and adopted Δx in 1755. Miller's L'Huilier entry concerns the 'lim.' notation (lim. ΔP/Δx), not the first Δx. Cajori adds that Johann Bernoulli had earlier used the capital Δ for a differential coefficient, so Euler's step was to use Δ for finite differences. Two clashes remain for learners. Δ also denotes the Laplacian (Δu = ∇²u). Many numerical-analysis books write h = Δx and k = Δt, which reverses CFL's 1928 use of h for the time step. No numerical-PDE paper using Δx and Δt was traced before 1950.",
  "confidence": "high",
  "chapters": [
   "notation",
   "discretization"
  ],
  "sources": [
   "https://www.17centurymaths.com/contents/euler/diffcal/part1ch1.pdf",
   "https://archive.org/details/historyofmathema027671mbp",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://web.stanford.edu/class/cme324/classics/courant-friedrichs-lewy.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "density-pressure-rho-p",
  "symbol": "ρ, p",
  "tex": "\\rho, p",
  "name": "Density ρ and pressure p",
  "meaning": "Mass per unit volume, and the normal stress in a fluid at rest. In incompressible solvers p has no evolution equation of its own. It acts like a Lagrange multiplier that keeps ∇·u = 0, and the pressure Poisson solve finds it.",
  "introduced_by": "p for pressure: Leonhard Euler (1757). ρ for density in the fluid equations: Navier (1822) is the earliest user found in the sources checked.",
  "year": "1757 (p); 1822 (ρ, read; printed 1827)",
  "first_work": "Euler, 'Principes généraux du mouvement des fluides' (1757); Navier, 'Mémoire sur les lois du mouvement des fluides' (read 1822, printed 1827)",
  "popularised_by": "Stokes (1845), Lamb (1879, 1895) and Prandtl (1904) all use ρ and p.",
  "story": "Euler wrote p for pressure but measured it as the height of a column of a reference fluid, and used q for a dimensionless density. Lagrange in 1781 used Δ for density and Π for pressure, with p, q, r for velocity components. In Navier's 1822 memoir the letters are ρ and p, and Stokes kept them in 1845.",
  "original_form": "",
  "contested": "Who first used ρ for density is not established; Navier is only the earliest user in the fluid-dynamics sources checked here, and earlier uses in other fields were not searched. In Euler's memoir p and q are not the dimensional pressure and density used today.",
  "confidence": "medium",
  "chapters": [
   "notation",
   "conservation",
   "pressure",
   "continuum"
  ],
  "sources": [
   "https://arxiv.org/abs/0802.2383",
   "https://fr.wikisource.org/wiki/Page:Joseph_Louis_de_Lagrange_-_%C5%92uvres,_Tome_4.djvu/723",
   "https://fr.wikisource.org/wiki/Page:M%C3%A9moires_de_l%E2%80%99Acad%C3%A9mie_des_sciences,_Tome_6.djvu/602",
   "https://archive.org/details/mathematicalphys01stokuoft"
  ],
  "group": "fluid"
 },
 {
  "id": "velocity-potential-phi",
  "symbol": "φ",
  "tex": "\\mathbf{u} = \\nabla\\phi",
  "name": "Velocity potential φ",
  "meaning": "In irrotational flow the velocity is the gradient of a scalar φ. If the flow is also incompressible, φ satisfies Laplace's equation. Potential flow underlies panel methods. Pressure projection in incompressible solvers works the same way in reverse: it removes the gradient-of-a-potential part of a velocity field.",
  "introduced_by": "Leonhard Euler (as the function W, 1757); Joseph-Louis Lagrange (as the letter φ, 1781)",
  "year": "1757 (Euler, presented 1755); 1781 (Lagrange)",
  "first_work": "Euler, 'Principes généraux du mouvement des fluides' (1757), §26; Lagrange, 'Mémoire sur la théorie du mouvement des fluides' (Berlin volume for 1781), Oeuvres vol. 4, e.g. p. 721",
  "popularised_by": "Horace Lamb, Hydrodynamics (1895), Art. 18",
  "story": "In §26 of his memoir Euler took the case where u dx + v dy + w dz is an exact differential and called the function W. Lagrange wrote p dx + q dy + r dz = dφ in 1781. Lamb explained the name (Hydrodynamics 1895, Art. 18, https://archive.org/details/hydrodynamics00horarich): \"Such a function is called a 'velocity-potential,' from its analogy with the potential function which occurs in the theories of Attractions, Electrostatics, &c.\" Lamb credits Lagrange with the theorem that a velocity potential, once present, persists, but adds that 'Lagrange's statement and proof were alike imperfect' and gives the first rigorous proof to Cauchy (memoir dated 1815, printed 1827).",
  "original_form": "dW=u\\,dx+v\\,dy+w\\,dz+\\Pi\\,dt;\\quad p\\,dx+q\\,dy+r\\,dz=d\\varphi",
  "contested": "Wikipedia's article says Lagrange introduced the velocity potential in 1788, citing Anderson (1998). Euler's W (1757) and Lagrange's own φ (1781) are earlier. Darrigol and Frisch note that Euler, in his Latin memoir, wrongly believed a velocity potential exists in general. Lamb defined u = −∂φ/∂x, with a minus sign, like a force potential. Most modern texts use u = +∇φ, so signs flip when old results are copied. The claim that Helmholtz coined 'Geschwindigkeitspotential' in 1858 is often repeated but was not verified here.",
  "confidence": "high",
  "chapters": [
   "viewpoints",
   "notation",
   "pressure"
  ],
  "sources": [
   "https://arxiv.org/abs/0802.2383",
   "https://fr.wikisource.org/wiki/Page:Joseph_Louis_de_Lagrange_-_%C5%92uvres,_Tome_4.djvu/723",
   "https://archive.org/details/hydrodynamics00horarich",
   "https://en.wikipedia.org/wiki/Velocity_potential"
  ],
  "group": "fluid"
 },
 {
  "id": "notation-condorcet-curly-d",
  "symbol": "∂z",
  "tex": "\\partial z",
  "name": "Condorcet's early curly d",
  "meaning": "A rounded d used to mark a partial difference (differential), as distinct from an ordinary d. It is an early forerunner of ∂, not yet the ∂u/∂x quotient.",
  "introduced_by": "Nicolas de Condorcet",
  "year": "1770 (memoir for 1770; printed 1773)",
  "first_work": "'Mémoire sur les équations aux différences partielles', Histoire de l'Académie Royale des Sciences, année 1770 (Paris, 1773), pp. 151–178; the notation is defined on p. 152.",
  "popularised_by": "",
  "story": "Condorcet says that throughout the memoir dz and ∂z will either be two partial differences of z (one with respect to x, the other with respect to y), or a total differential and a partial difference. In a 1772 article he changed the meanings again. In 1785 he used ∂ for total derivatives (Cajori). The rounded d was not yet tied to one meaning, which is part of why it did not catch on.",
  "original_form": "dz,\\; \\partial z",
  "contested": "∂ is often credited to Jacobi (1841) or to Legendre (1786). Condorcet used the rounded d earlier, but for differentials and with a meaning that shifted from paper to paper. Whether this counts as 'the partial derivative symbol' depends on the definition.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII"
  ],
  "group": "calculus"
 },
 {
  "id": "stream-function-psi",
  "symbol": "ψ",
  "tex": "u = \\frac{\\partial\\psi}{\\partial y}, v = -\\frac{\\partial\\psi}{\\partial x}",
  "name": "Stream function ψ",
  "meaning": "In 2D incompressible flow, a scalar whose contours are streamlines and whose derivatives give the velocity, so ∇·u = 0 holds automatically. The difference in ψ between two streamlines is the flow rate between them. Stream function–vorticity solvers replace the pressure solve with the Poisson equation ∇²ψ = −ω.",
  "introduced_by": "Joseph-Louis Lagrange introduced the function, using the letter ω. The letter ψ and the name 'stream-function' appear in Lamb (1879); who first used either was not established.",
  "year": "1781 (Lagrange's memoir, in the Berlin volume for 1781); ψ by 1879",
  "first_work": "Lagrange, 'Mémoire sur la théorie du mouvement des fluides', Nouveaux Mémoires de l'Académie royale des sciences et belles-lettres de Berlin, année 1781; Oeuvres vol. 4, p. 720",
  "popularised_by": "Horace Lamb, A Treatise on the Mathematical Theory of the Motion of Fluids (1879), Art. 68",
  "story": "Lagrange noticed that in 2D incompressible flow p dy − q dx is an exact differential (his p and q were velocity components). He wrote it dω, so p = dω/dy and q = −dω/dx. Stokes (1842) and Rankine (1863, printed 1864) used the same idea with the letter U. Lamb's 1879 Treatise writes ψ and says that 'ψ is called the 'stream-function''. His 1895 Hydrodynamics adds a footnote (https://archive.org/details/hydrodynamics00horarich): \"The function ψ was first introduced in this way by Lagrange, Nouv. mém. de l'Acad. de Berlin, 1781; Oeuvres, t. iv., p. 720. The kinematical interpretation is due to Rankine\". Prandtl's 1904 boundary-layer paper also writes ψ = const. for a streamline.",
  "original_form": "pdy-qdx=d\\omega;\\quad p=\\frac{d\\omega}{dy},\\quad q=-\\frac{d\\omega}{dx}",
  "contested": "Lamb's footnote can be read as saying Lagrange used ψ. In fact Lagrange's letter was ω, which now means vorticity, and Stokes and Rankine both used U. So ψ first appeared somewhere between 1864 and 1879; the first user was not found. The printing year of Lagrange's 1781 volume is given as 1783 by a secondary source but was not confirmed. Sign conventions for ψ differ between texts.",
  "confidence": "high",
  "chapters": [
   "viewpoints",
   "notation",
   "pressure"
  ],
  "sources": [
   "https://fr.wikisource.org/wiki/Page:Joseph_Louis_de_Lagrange_-_%C5%92uvres,_Tome_4.djvu/722",
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://archive.org/details/hydrodynamics00horarich",
   "https://archive.org/details/mathematicalphys01stokuoft"
  ],
  "group": "fluid"
 },
 {
  "id": "notation-partial-derivative",
  "symbol": "∂u/∂x",
  "tex": "\\frac{\\partial u}{\\partial x}",
  "name": "Partial derivative ∂ (Legendre 1786, Jacobi 1841)",
  "meaning": "The rate of change of u with respect to x, with the other independent variables held fixed. Every conservation law in fluid dynamics is written with it.",
  "introduced_by": "Adrien-Marie Legendre",
  "year": "1786 (memoir for 1786; printed 1788); revived 1841",
  "first_work": "Legendre, 'Mémoire sur la manière de distinguer les maxima des minima dans le calcul des variations', Histoire de l'Académie Royale des Sciences, année 1786 (Paris, 1788), pp. 7–37, in a footnote on p. 8. Revived in Jacobi, 'De determinantibus functionalibus', Journal für die reine und angewandte Mathematik 22 (1841), pp. 319–352.",
  "popularised_by": "Carl Gustav Jacob Jacobi, 1841. Uptake was slow: Cajori lists Boole, Todhunter, Lord Rayleigh and Thomson and Tait among British authors who still wrote partials with a plain d. Stokes's 1845 fluid paper does the same, writing du/dx for a partial derivative.",
  "story": "Legendre wrote ∂u/∂x for the coefficient of dx in the differential of u, to tell it apart from du/dx, the complete difference divided by dx. The next year he dropped the notation, and it lay unused for decades. Meanwhile the letters d and D were claimed for finite differences and for Arbogast's 'derivation', and some authors used ∂ for total differentials. Jacobi brought it back in 1841: 'Sed quia uncorum accumulatio et legenti et scribenti molestior fieri solet, praetuli characteristica d differentialia vulgaria, differentialia autem partialia characteristica ∂ denotare' ('since a pile-up of brackets tends to be troublesome to read and write, I have preferred to denote ordinary differentials by d and partial differentials by ∂'; https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/).",
  "original_form": "\\frac{\\partial u}{\\partial x}",
  "contested": "The symbol is commonly credited to Jacobi. Cajori says Jacobi knew only Euler's and Lagrange's notations and did not survey earlier ones: 'the mathematical public, uncritical on matters of priority, is crediting Jacobi with devices first proposed by Legendre and Hamilton' (https://archive.org/details/AHistoryOfMathematicalNotationVolII). Condorcet's 1770 curly d is earlier still, though it marked differentials. The sign is a rounded d, not a Greek delta, despite the nickname 'Jacobi's delta'. An earlier draft attributed the Stokes example to Cajori; it comes from Stokes's paper itself.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "https://archive.org/details/transactionsofca08camb"
  ],
  "group": "calculus"
 },
 {
  "id": "notation-lagrange-prime",
  "symbol": "f′(x), y′",
  "tex": "f'(x)",
  "name": "Lagrange's prime notation",
  "meaning": "The derivative of a function of one variable. It is common in ODE notation for time integrators, such as y′ = f(t, y).",
  "introduced_by": "Joseph-Louis Lagrange",
  "year": "1797 (systematic use); earlier uses 1770 and 1772",
  "first_work": "Théorie des fonctions analytiques (Paris, 1797), p. 14. Here Lagrange writes f′x, f″x, f‴x and calls them 'fonctions dérivées' (f′x is the 'fonction prime').",
  "popularised_by": "Lagrange's own Leçons sur le calcul des fonctions (1801, 1806). Cajori writes that 'The notation of Lagrange, on the other hand, was adopted by many and has been found a useful adjunct of other calculus notations' (https://archive.org/details/AHistoryOfMathematicalNotationVolII).",
  "story": "Lagrange wanted to build calculus on algebra (power series) without infinitesimals or limits, so he made the derived function the central object. The English word 'derivative' comes from his 'dérivée', which he was already using in 1772. He had written ψ′ for dψ/dx in a 1770 memoir, and u′ = du/dx in 'Sur une nouvelle espèce de calcul relatif à la différentiation et à l'intégration des quantités variables' (Berlin memoirs for 1772). He was not dogmatic about it: in the second edition of the Mécanique analytique he kept Leibniz's differentials and used Newton's dots for time derivatives.",
  "original_form": "f'x,\\; f''x,\\; f'''x",
  "contested": "It is often said Lagrange invented the prime in 1797, but he used it in 1770 and 1772. Cajori adds that it appears in a 1759 memoir published under François Daviet de Foncenex's name (Miscellanea Taurinensia) and believed to have been written by Lagrange. Lagrange wrote f′x without parentheses. Cajori's example of a silent change is specific: the 1806 Leçons print f′x, but the Oeuvres vol. X, which claims to reprint the 1806 edition, prints f′(x).",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/d/"
  ],
  "group": "calculus"
 },
 {
  "id": "notation-material-derivative-names",
  "symbol": "D/Dt",
  "tex": "\\frac{D}{Dt} = \\frac{\\partial}{\\partial t} + \\mathbf{u}\\cdot\\nabla",
  "name": "Names for D/Dt: substantial, material, convective, Lagrangian derivative",
  "meaning": "All of these names refer to the same operator, ∂/∂t + u·∇. Some authors use 'convective' or 'advective derivative' for the whole operator, while others use it only for the u·∇ part, so check the definition in each text.",
  "introduced_by": "No single coiner documented",
  "year": "19th–20th century",
  "first_work": "Stokes (1845) introduced the symbol but gave it no name. Lamb's Hydrodynamics calls it 'a differentiation following the motion of the fluid'.",
  "popularised_by": "'Substantial derivative' in chemical engineering through Bird, Stewart and Lightfoot, Transport Phenomena (1960, p. 73, as cited in arXiv:1001.1580). 'Material derivative' is standard in continuum mechanics. 'Lagrangian', 'particle', 'advective' and 'Stokes' derivative also appear in modern texts.",
  "story": "Each name reflects a field's way of thinking. 'Substantial' or 'substantive' means following the substance; German texts say 'substantielle Ableitung' (also 'materielle Ableitung'). 'Material' means following a material point. 'Lagrangian' and 'particle' refer to the particle-label description. 'Convective' and 'advective' stress the transport term. 'Stokes derivative' (Polish texts speak of the 'operator Stokesa') honours Stokes, who introduced the symbol. Some books simply call it the total derivative, since it is a total derivative along a particle path.",
  "original_form": "",
  "contested": "Who first used 'substantial derivative', 'material derivative' or 'convective derivative', and when, has not been established. Present these as conventions, not as anyone's invention. Wikipedia's list of names cites only modern textbooks.",
  "confidence": "low",
  "chapters": [
   "notation",
   "viewpoints"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Material_derivative",
   "https://archive.org/details/hydrodynamics00lambuoft",
   "https://arxiv.org/abs/1001.1580",
   "https://de.wikipedia.org/wiki/Substantielle_Ableitung"
  ],
  "group": "fluid"
 },
 {
  "id": "notation-arbogast-d",
  "symbol": "D, Dₓy",
  "tex": "D_x y",
  "name": "Arbogast's D operator",
  "meaning": "A capital D used as an operator symbol ('take the derivative'), written separately from the function it acts on. Modern notation for difference operators in numerics, such as D₊, D₋ and D₀, uses the same idea.",
  "introduced_by": "Louis François Antoine Arbogast",
  "year": "1800",
  "first_work": "Du calcul des dérivations et de ses usages dans la théorie des suites et dans le calcul différentiel (Strasbourg, an VIII = 1800). An outline was presented to the Paris Academy in 1789 but not published then.",
  "popularised_by": "Servois (1814–15), who showed that Δ, D, Σ and ∫ obey commutative and distributive laws, and the British 'calculus of operations' school (Boole, Carmichael), which manipulated D and Δ as algebraic symbols (Cajori).",
  "story": "Arbogast gave D the meaning of 'derivation' at a time when d and D were already claimed for differentials and finite differences. In his preface he argued that the power of analysis lies in the happy choice of signs that are simple and characteristic of what they represent. Treating D (and Euler's Δ) as an operator that can be added, composed and expanded in series led to operator methods. Those methods underlie modern analysis of difference schemes, for example writing a shift as an exponential of D.",
  "original_form": "D_x y",
  "contested": "Johann Bernoulli used a capital D earlier, but not as an operator. The specific form Dₓy is credited to Arbogast on Miller's page via Julio González Cabillón, and Miller notes Cajori's History of Mathematical Notations does not show it. Nothing links Stokes's D/Dt to Arbogast's D, so do not present one as the source of the other.",
  "confidence": "medium",
  "chapters": [
   "notation",
   "discretization"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII"
  ],
  "group": "calculus"
 },
 {
  "id": "poisson-equation",
  "symbol": "∇²φ = f",
  "tex": "\\nabla^2 \\phi = -4\\pi\\rho",
  "name": "Poisson equation",
  "meaning": "The Laplacian of a potential equals a source density. In incompressible CFD the pressure (or a pressure-like scalar) satisfies a Poisson equation that enforces ∇·u = 0. Solving it is usually the most expensive part of each time step, which is why iterative solvers matter.",
  "introduced_by": "Siméon Denis Poisson",
  "year": "1813",
  "first_work": "S. D. Poisson, 'Remarques sur une équation qui se présente dans la théorie des attractions des sphéroïdes', Nouveau Bulletin des Sciences par la Société philomathique de Paris, t. III, no. 75 (December 1813) 388–392",
  "popularised_by": "Gauss, who gave a rigorous proof for variable density in 1839 (per French Wikipedia); later potential theory; in CFD, Chorin's projection method",
  "story": "Laplace had shown that outside attracting matter the gravitational potential satisfies ∂²V/∂x² + ∂²V/∂y² + ∂²V/∂z² = 0. MacTutor: 'In 1813 Poisson studied the potential in the interior of attracting masses'. In a short note in the Bulletin of the Société philomathique he showed that inside matter of density ρ the sum equals −4πρ instead. A rigorous proof for variable density came later, from Gauss in 1839.",
  "original_form": "",
  "contested": "English Wikipedia says Poisson 'published it in 1823', citing his later memoir on magnetism. The December 1813 Bulletin note is earlier. The 1813 citation rests on French Wikipedia and was not checked against a scan of the Bulletin, so the exact typography of the note is unknown. Partial-derivative notation was not yet standard then, and ∇² is much later. In CFD the equation is also called the pressure Poisson equation (PPE).",
  "confidence": "medium",
  "chapters": [
   "pressure",
   "stable-fluids",
   "solvers"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Poisson/",
   "https://fr.wikipedia.org/wiki/%C3%89quation_de_Poisson",
   "https://en.wikipedia.org/wiki/Poisson%27s_equation"
  ],
  "group": "calculus"
 },
 {
  "id": "notation-fourier-integral-limits",
  "symbol": "∫ₐᵇ",
  "tex": "\\int_a^b f(x)\\,dx",
  "name": "Limits on the integral sign",
  "meaning": "The definite integral, with the start and end of the interval written on the integral sign. This is what is written for flux through a cell face or for a balance over a control volume.",
  "introduced_by": "Joseph Fourier",
  "year": "1822 (book); Cajori reports an earlier use in the Academy's Mémoires for 1819–20",
  "first_work": "Théorie analytique de la chaleur (Paris: Firmin Didot, 1822), §231, p. 252.",
  "popularised_by": "Taken up at once by G. A. A. Plana of Turin (Gergonne's Annales vol. 12, 1821–22, p. 148), then by Fresnel and Cauchy (Cajori), and then universal.",
  "story": "Before Fourier, the limits of integration were given in words. Euler, in his Institutiones calculi integralis, put them in brackets with the Latin words 'ab' and 'ad'. Fourier wrote ∫ with a below and b above, for the integral that starts when the variable equals a and is complete when it equals b. In 1823 Sarrus introduced the vertical-bar notation for evaluating an antiderivative between limits.",
  "original_form": "\\int_a^b \\varphi(x)\\,dx",
  "contested": "Cajori says Fourier had already used the notation 'somewhat earlier' in the Academy's Mémoires for 1819–20, in an article whose early part the 1822 book reprints. That volume is labelled by the academic years it covers and is commonly said to have been printed later than the book (1824), which has not been confirmed here. Cajori also dates Plana's use to 'Vol. XII (1819 and 1820)' of Gergonne's Annales, but volume 12 covers 1821–22. So 1822 is the safe date for the first printed book use; the very first use around 1820–22 is uncertain.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation",
   "discretization"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "http://www.numdam.org/issues/AMPA_1821-1822__12_/"
  ],
  "group": "calculus"
 },
 {
  "id": "cauchy-stress-notation",
  "symbol": "A, B, C, D, E, F → σ_ij, τ_ij",
  "tex": "\\sigma_{ij}",
  "name": "Cauchy's stress components (1822–1827) and the modern σ_ij and τ_ij",
  "meaning": "The stress tensor gives the force per unit area across any surface: the traction on a surface with unit normal n is t_i = σ_ij n_j. In fluids σ_ij = −p δ_ij + τ_ij, where τ_ij is the viscous stress.",
  "introduced_by": "Augustin-Louis Cauchy",
  "year": "1822 (presented 30 September 1822); 1823 (summary note); 1827 (full account in print)",
  "first_work": "Presented as a memoir to the Académie des sciences on 30 September 1822 (Cauchy's own statement, 1830). Summary: \"Recherches sur l'équilibre et le mouvement intérieur des corps solides ou fluides, élastiques ou non élastiques\", Bulletin de la Société philomathique (January 1823), pp. 9–13. Full account: \"De la pression ou tension dans un corps solide\", Exercices de mathématiques, seconde année (Paris: de Bure frères, 1827), pp. 42–56, eqs. (19)–(21) on pp. 48–49. Equilibrium equations: \"Sur les relations qui existent, dans l'état d'équilibre d'un corps solide ou fluide, entre les pressions ou tensions et les forces accélératrices\", same volume, from p. 108, eq. (16).",
  "popularised_by": "Stokes (read 1845, printed 1847) wrote P₁, P₂, P₃ for normal and T₁, T₂, T₃ for tangential stresses. The indexed form σ_ij spread with tensor notation in the 20th century.",
  "story": "The 1823 note says the research was prompted by Navier: \"Ces recherches ont été entreprises à l'occasion d'un Mémoire publié par M. Navier, le 14 août 1820\" (source: https://archive.org/details/oeuvresdaugusti202caurich, p. 300). In 1827 Cauchy wrote p′, p″, p‴ for the pressures or tensions on planes perpendicular to the x, y and z axes. He named their projections A, B, C (normal) and D, E, F (shear) and set out the six quantities as the symmetric array A F E / F B D / E D C. The traction on any plane follows from p cos λ = A cos α + F cos β + E cos γ and two similar equations, which is the modern t_i = σ_ij n_j. For equilibrium he found dA/dx + dF/dy + dE/dz + ρX = 0 and two similar equations. For a fluid at rest he set A = B = C = −p and D = E = F = 0. He wrote partial derivatives with an upright d and avoided subscripts by giving each component its own letter.",
  "original_form": "\\frac{dA}{dx} + \\frac{dF}{dy} + \\frac{dE}{dz} + \\rho X = 0",
  "contested": "The 1822 presentation date is often repeated without a source. It is confirmed by Cauchy himself: in an 1830 paper in the Bulletin de Férussac he wrote \"J'ai donné le premier cette théorie\", in a memoir \"présenté à l'Académie des sciences le 30 septembre 1822\", with a note in the Bulletin philomathique of January 1823 (Œuvres, ser. 2, vol. 2, pp. 134–135). The 1822 memoir itself was not printed then; the full account first appeared in the 1827 Exercices. Modern conventions conflict. Some books use σ_ij for total stress and τ_ij for viscous stress, others use τ_ij for total stress, and books also disagree on which index names the face normal. The index order is harmless only because the stress tensor is symmetric.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation"
  ],
  "sources": [
   "https://archive.org/details/bub_gb_o6hCzbAYX7cC",
   "https://archive.org/details/oeuvresdaugusti202caurich",
   "https://archive.org/details/mathematicalphys01stokuoft"
  ],
  "group": "vectors"
 },
 {
  "id": "navier-1822-epsilon",
  "symbol": "ε",
  "tex": "\\varepsilon \\nabla^2 \\mathbf{u}",
  "name": "Navier's viscous equations and his constant ε",
  "meaning": "The first equations of motion for a fluid with internal friction. Navier's ε does the job now done by the dynamic viscosity μ: it multiplies the Laplacian of the velocity.",
  "introduced_by": "Claude-Louis Navier",
  "year": "Read 18 March 1822; printed 1827",
  "first_work": "'Mémoire sur les lois du mouvement des fluides', Mémoires de l'Académie royale des sciences de l'Institut de France 6 (volume for 1823, printed 1827), pp. 389–440. The equations are on p. 414. A shorter companion paper is 'Sur les lois des mouvements des fluides, en ayant égard à l'adhésion des molécules', Annales de chimie et de physique 19 (volume for 1821, printed 1822), pp. 244–260.",
  "popularised_by": "The paper was little noticed at first. Cauchy, Poisson, Saint-Venant and Stokes derived the equations again; Darrigol (2002) calls these the first five 'births' of the equation. Stokes's 1845 derivation with μ is the version that lasted.",
  "story": "Navier worked from Laplace's idea of forces between molecules. He assumed that the force between neighbouring molecules depends on their relative velocity. Summing these forces gave Euler's equations plus one extra term: ε times the Laplacian of each velocity component. Bistafa (2018) renders ε as Navier's 'adherence of the fluid molecules' constant. Navier also wrote a wall condition that allows slip; for a wall normal to z, Bistafa gives it as E·u + ε ∂u/∂z = 0. Navier's letters for density and pressure, ρ and p, are the ones used today.",
  "original_form": "\\mathrm{P}-\\frac{dp}{dx}=\\rho\\left(\\frac{du}{dt}+u\\frac{du}{dx}+v\\frac{du}{dy}+w\\frac{du}{dz}\\right)-\\varepsilon\\left(\\frac{d^2u}{dx^2}+\\frac{d^2u}{dy^2}+\\frac{d^2u}{dz^2}\\right)",
  "contested": "ε is not exactly μ. Bistafa (2018) compares Navier's pipe-flow result with the Hagen–Poiseuille formula and concludes that 'Navier's adherence of molecules constant ϵ is roughly equal to half the dynamic viscosity μ'. The earlier draft of this record also said that Bistafa elsewhere treats ε simply as μ; that could not be confirmed and has been removed. Sources date the work 1822 (reading), 1823 (volume) or 1827 (printing). Navier writes d for partial derivatives. The slip term E·u was later rejected in favour of the no-slip condition.",
  "confidence": "high",
  "chapters": [
   "conservation",
   "notation",
   "continuum"
  ],
  "sources": [
   "https://fr.wikisource.org/wiki/Page:M%C3%A9moires_de_l%E2%80%99Acad%C3%A9mie_des_sciences,_Tome_6.djvu/602",
   "https://www.scielo.br/j/rbef/a/nNpqpRmKN8J3zPhV4WN4vFF/?lang=en",
   "https://arxiv.org/pdf/2401.13669"
  ],
  "group": "fluid"
 },
 {
  "id": "gauss-seidel",
  "symbol": "Gauss–Seidel",
  "tex": "(D+L)\\,x^{(k+1)} = b - U\\,x^{(k)}",
  "name": "Gauss–Seidel iteration",
  "meaning": "Like Jacobi, but each unknown is updated in place and the newest neighbour values are used immediately. For model Poisson problems it converges about twice as fast as Jacobi (its spectral radius is Jacobi's squared). It also smooths high-frequency error well, which makes it the classic multigrid smoother.",
  "introduced_by": "Carl Friedrich Gauss (in a letter, 1823); Philipp Ludwig von Seidel (in print, 1874)",
  "year": "1823 (Gauss's letter to Gerling, 26 December); 1874 (Seidel)",
  "first_work": "Gauss, letter to C. L. Gerling of 26 December 1823 (Werke vol. 9; English translation by G. E. Forsythe, 'Gauss to Gerling on relaxation', MTAC 5 (1951) 255–258); L. Seidel, 'Über ein Verfahren, die Gleichungen, auf welche die Methode der kleinsten Quadrate führt, sowie lineäre Gleichungen überhaupt, durch successive Annäherung aufzulösen', Abh. Bayer. Akad. Wiss., math.-nat. Abt. 11 (1874) 81–108",
  "popularised_by": "H. Liebmann (1918), whose application to discretised Laplace and Poisson equations gave the name 'Liebmann method'; Young (1950)",
  "story": "Gauss described an 'indirect' iterative way of solving least-squares normal equations in a letter to his former student Christian Ludwig Gerling dated 26 December 1823, and Forsythe published an English translation in 1951. Seidel published a successive-approximation method in 1874. Both were hand relaxation schemes that removed the largest residual first, not the fixed cyclic sweeps taught today, and Seidel advised against processing the unknowns in cyclic order. Nekrasov defined the same method in 1884, and Russian literature calls it Nekrasov's method. Applied to discretised Laplace and Poisson equations it became the 'Liebmann method'. Young's 1950 thesis says the Liebmann method 'is actually a special case of the Gauss-Seidel Method'.",
  "original_form": "",
  "contested": "A famous quip sums up the naming problem: 'Forsythe is quoted as having stated that \"the Gauss-Seidel method was not known to Gauss and not recommended by Seidel\"' (Saad and van der Vorst 2000, citing Householder 1964, p. 115). The point is that Gauss's method was not cyclic and Seidel recommended against cyclic order, so the modern cyclic algorithm differs from both originals. The page numbers of the letter in Gauss's Werke (vol. 9) were not checked directly.",
  "confidence": "high",
  "chapters": [
   "solvers",
   "pressure"
  ],
  "sources": [
   "https://www-users.cse.umn.edu/~saad/PDF/umsi-99-152.pdf",
   "https://arxiv.org/abs/1908.01083",
   "https://web.ma.utexas.edu/CNA/DMY/dmy-phd.html"
  ],
  "group": "numerics"
 },
 {
  "id": "froude-number",
  "symbol": "Fr",
  "tex": "\\mathrm{Fr} = \\frac{U}{(g L)^{1/2}}",
  "name": "Froude number",
  "meaning": "Flow speed divided by the speed of gravity waves. It governs ship waves, open-channel flow and hydraulic jumps; Fr = 1 is the free-surface counterpart of Ma = 1.",
  "introduced_by": "William Froude (law of comparison, 1868); earlier, Ferdinand Reech (1852) for ship models and Jean-Baptiste Bélanger (1828) for open channels. Moritz Weber gave it the name (1919).",
  "year": "1828 (Bélanger); 1852 (Reech); 1868 (Froude); 1919 (name)",
  "first_work": "Froude's 1868 'law of comparison' for ship models, under which speed scales with the square root of length",
  "popularised_by": "Moritz Weber (1919), Jahrbuch der Schiffbautechnischen Gesellschaft, per Rouse & Ince as cited by Rott (1990)",
  "story": "Froude tested ship models in towing tanks. He stated that a model and a ship behave alike when speed scales with the square root of length. Reech had proposed a similar rule in 1852, and Froude was apparently unaware of it, so French texts sometimes say 'Reech–Froude number'. Bélanger had used the ratio of flow speed to the square root of g times depth in 1828 to separate slow from torrential channel flow. Rott (1990) reports, following Rouse & Ince, that Weber's 1919 treatise on similarity introduced the name 'Froude number'.",
  "original_form": "",
  "contested": "Froude's own rule was a dimensional speed–length ratio, not a dimensionless number. Some texts define Fr as U²/(gL), the square of the usual form. With Bélanger (1828) and Reech (1852) both earlier, the name honours Froude's model-testing work rather than strict priority. The Bélanger and Reech dates are from Wikipedia and were not checked against the originals.",
  "confidence": "medium",
  "chapters": [
   "similarity"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Froude_number",
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf"
  ],
  "group": "numbers"
 },
 {
  "id": "notation-laplacian-delta-murphy",
  "symbol": "Δ",
  "tex": "\\Delta V = \\frac{\\partial^2 V}{\\partial x^2} + \\frac{\\partial^2 V}{\\partial y^2} + \\frac{\\partial^2 V}{\\partial z^2}",
  "name": "Δ for the Laplacian (Murphy 1833)",
  "meaning": "The sum of the second partial derivatives. It appears in the viscous and diffusion terms, in the heat equation, and in the pressure Poisson equation of incompressible solvers. Mathematicians usually write Δ, while physicists and engineers usually write ∇².",
  "introduced_by": "Robert Murphy",
  "year": "1833",
  "first_work": "Elementary Principles of the Theories of Electricity, Heat, and Molecular Actions, Part I: On Electricity (Cambridge, 1833), pp. 140–141, in the chapter on magnetised substances.",
  "popularised_by": "",
  "story": "Murphy writes out the sum d²V/dx² + d²V/dy² + d²V/dz² = 0. He then says, 'denoting by Δ the operation here performed on V', that Δ.V = 0, and uses Δ.Q = Δ.U in what follows. Kline's history (as cited by Miller) credits Murphy with this symbol. The same capital delta had meant a finite difference since Euler (1755). In numerical analysis the clash is real: Δx is a grid spacing, Δu can mean a difference, and Δu can also mean a Laplacian.",
  "original_form": "\\Delta . V = 0",
  "contested": "Do not credit Murphy with the name 'Laplace's operator'. He introduced the symbol Δ; the earliest documented use of the name found so far is Maxwell (1873). Whether anyone used a single letter for this operator before Murphy has not been checked.",
  "confidence": "high",
  "chapters": [
   "notation",
   "pressure",
   "stiffness"
  ],
  "sources": [
   "https://archive.org/details/b29321098",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/l/"
  ],
  "group": "calculus"
 },
 {
  "id": "grassmann-ausdehnungslehre-1844",
  "symbol": "Ausdehnungslehre",
  "tex": "",
  "name": "Grassmann's Ausdehnungslehre (1844)",
  "meaning": "An algebra of 'extended magnitudes': directed lines, oriented areas and volumes. It is the ancestor of exterior algebra and an independent route to vectors that does not go through quaternions.",
  "introduced_by": "Hermann Grassmann",
  "year": "1844",
  "first_work": "Die lineale Ausdehnungslehre, ein neuer Zweig der Mathematik (Leipzig, 1844); revised as Die Ausdehnungslehre: Vollständig und in strenger Form bearbeitet (1862)",
  "popularised_by": "Defended by Gibbs (Nature, 28 May 1891, 'Quaternions and the Ausdehnungslehre'). Per MacTutor, Peano built on it and it later inspired Élie Cartan.",
  "story": "Grassmann's work was hardly read at first; according to MacTutor, Möbius did not understand its significance and declined to review it. Gibbs's 1891 letter opens: \"The year 1844 is memorable in the annals of mathematics on account of the first appearance on the printed page of Hamilton's Quaternions and Grassmann's Ausdehnungslehre\" (source: https://archive.org/details/scientificpapers02gibbuoft, p. 161). In his Elements of Vector Analysis Gibbs said his own method attaches itself \"in some respects more closely\" to Grassmann's system than to Hamilton's (same source, p. 17). That link is why Tait mocked Gibbs's system as \"compounded of the notations of Hamilton and of Grassmann\" (source: https://archive.org/details/cu31924001571094, preface).",
  "original_form": "",
  "contested": "The 1844 book was not Grassmann's first vector work. MacTutor says his 1840 examination essay on the theory of the tides already introduced vector addition and subtraction, vector differentiation and vector function theory. Hamilton found quaternions in 1843 and first printed them in 1844, so the two systems were roughly simultaneous and independent. Tait's 1890 preface disputed German claims that Grassmann had anticipated Hamilton.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Grassmann/",
   "https://archive.org/details/scientificpapers02gibbuoft",
   "https://archive.org/details/cu31924001571094"
  ],
  "group": "vectors"
 },
 {
  "id": "notation-material-derivative-d",
  "symbol": "D/Dt",
  "tex": "\\frac{D}{Dt} = \\frac{\\partial}{\\partial t} + \\mathbf{u}\\cdot\\nabla",
  "name": "Material derivative symbol D/Dt",
  "meaning": "The rate of change of a quantity following a fluid particle: Df/Dt = ∂f/∂t + u·∇f. The u·∇f (advection) term causes most of the trouble in numerical advection. Semi-Lagrangian schemes discretise along particle paths so that D/Dt becomes a single difference.\n\nThe rate of change following a fluid particle: the change at a fixed point plus the change from being carried somewhere else. It links the Lagrangian (particle) and Eulerian (fixed-point) viewpoints. Semi-Lagrangian advection, used in stable-fluids solvers, works by tracing this derivative backward along the flow.",
  "introduced_by": "George Gabriel Stokes (earliest use found)",
  "year": "1845 (read 14 April 1845); printed 1847",
  "first_work": "'On the theories of the internal friction of fluids in motion, and of the equilibrium and motion of elastic solids', Transactions of the Cambridge Philosophical Society vol. 8, Part III, pp. 287–319. D is defined on pp. 296–297.\n\n'On the Theories of the Internal Friction of Fluids in Motion…', Transactions of the Cambridge Philosophical Society 8, part III (1847); Mathematical and Physical Papers vol. 1 (1880), p. 91.",
  "popularised_by": "Horace Lamb's Hydrodynamics, which credits Stokes explicitly (3rd ed., 1906, Art. 5): 'If, after Stokes, we introduce the symbol D/Dt to denote a differentiation following the motion of the fluid' (https://archive.org/details/hydrodynamics00lambuoft).",
  "story": "The quantity itself is Euler's: his memoir printed in 1757 writes the particle acceleration as the local change plus the convective terms. Stokes wrote ordinary partial derivatives with a plain d, so he needed a different letter for the derivative taken while following a particle. He wrote: 'where D is used, as it will be in the rest of this paper, to denote differentiation in which the independent variables are t and three parameters of the particle considered, (such for instance as its initial co-ordinates,) and not t, x, y, z' (https://archive.org/details/transactionsofca08camb). He then gives Du/Dt = du/dt + u du/dx + v du/dy + w du/dz, and notes that for an incompressible fluid the continuity equation is equivalent to Dρ/Dt = 0.\n\nEuler wrote out the expanded form, u(du/dx) + v(du/dy) + w(du/dz), in 1757 but had no single symbol for it. Stokes used a capital D in 1845 and explained it in one sentence (Mathematical and Physical Papers vol. 1, p. 91, https://archive.org/details/mathematicalphys01stokuoft): \"where D is used, as it will be in the rest of this paper, to denote differentiation in which the independent variables are t and three parameters of the particle considered, (such for instance as its initial co-ordinates,) and not t, x, y, z.\" He then gave Du/Dt as du/dt + u du/dx + v du/dy + w du/dz, where the lower-case d's are partial derivatives at fixed x, y, z.",
  "original_form": "\\rho\\,\\frac{Du}{Dt}\\,\\Delta x\\,\\Delta y\\,\\Delta z, \\qquad \\frac{Du}{Dt} = \\frac{du}{dt} + u\\frac{du}{dx} + v\\frac{du}{dy} + w\\frac{du}{dz}",
  "contested": "The paper is usually cited as 1845, which is the date it was read. The title page of volume 8, Part III is dated 1847 (M.DCCC.XLVII), and the same Part contains a De Morgan paper read on 9 November 1846 with an addition dated 27 February 1847, so the paper was printed in 1847. No use of D/Dt earlier than Stokes has turned up, and Lamb attributes it to him, but an earlier use cannot be ruled out. The operator itself (local plus convective change) goes back to Euler (written 1755, printed 1757).\n\nStokes defines the symbol without claiming it is new, and no earlier use was found here, so 'introduced by Stokes' means 'earliest known use'. The same operator goes by several names: material, substantial, convective, Lagrangian or total derivative. Some texts write d/dt instead of D/Dt. In Stokes's own notation the lower-case d means a partial derivative, so his formulas read differently from modern ones.",
  "confidence": "high",
  "chapters": [
   "notation",
   "viewpoints",
   "conservation",
   "stable-fluids",
   "advection"
  ],
  "sources": [
   "https://archive.org/details/transactionsofca08camb",
   "https://archive.org/details/mathematicalphys01stokuoft",
   "https://archive.org/details/hydrodynamics00lambuoft",
   "https://arxiv.org/abs/0802.2383"
  ],
  "merged_from": [
   "notation-material-derivative-D",
   "stokes-material-derivative"
  ],
  "variants": {
   "name": [
    "Material derivative D/Dt"
   ],
   "year": [
    "Read 14 April 1845; printed 1847"
   ],
   "original_form": [
    "\\frac{Du}{Dt}=\\frac{du}{dt}+u\\frac{du}{dx}+v\\frac{du}{dy}+w\\frac{du}{dz}"
   ]
  },
  "group": "fluid"
 },
 {
  "id": "strain-rate-tensor",
  "symbol": "e_ij, S_ij, D",
  "tex": "e_{ij} = \\frac{1}{2}(\\frac{\\partial u_i}{\\partial x_j} + \\frac{\\partial u_j}{\\partial x_i})",
  "name": "Strain-rate (rate-of-deformation) tensor",
  "meaning": "The symmetric part of the velocity gradient. It measures how fast a fluid element is being stretched and sheared; rotation sits in the antisymmetric part. Its trace is ∇·u, and in a Newtonian fluid the viscous stress is proportional to it.",
  "introduced_by": "G. G. Stokes, for viscous fluids (1845), building on Cauchy's 1827 analysis of deformation in solids. The index notation is 20th century, and the letter used varies.",
  "year": "1845 (read); 1847 (printed)",
  "first_work": "G. G. Stokes, \"On the Theories of the Internal Friction of Fluids in Motion, and of the Equilibrium and Motion of Elastic Solids\", Transactions of the Cambridge Philosophical Society vol. 8, part III (Cambridge, 1847), pp. 287–319; read 14 April 1845. Reprinted in Mathematical and Physical Papers vol. 1 (1880).",
  "popularised_by": "e_ij in Batchelor (1967) (from memory, not re-checked); S_ij is common in turbulence modelling; D, the 'rate of deformation', is common in continuum mechanics",
  "story": "Stokes resolved the motion of a small fluid element into a rotation plus three perpendicular rates of extension e′, e″, e‴. He put e′ + e″ + e‴ = 3δ, where 3δ is the rate of cubical dilatation. He then expressed the stresses as P₁ = p − 2μ(du/dx − δ) and T₁ = −μ(dv/dz + dw/dy), with similar equations for the other components. This is the Newtonian viscous law in component form, with pressures counted positive. Earlier, Cauchy's 'Sur la condensation et la dilatation des corps solides' (Exercices de mathématiques, 1827, p. 60) had worked out the corresponding geometry for the deformation of solids, using displacements ξ, η, ζ.",
  "original_form": "P_1 = p - 2\\mu(\\frac{du}{dx} - \\delta) ; T_1 = -\\mu(\\frac{dv}{dz} + \\frac{dw}{dy})",
  "contested": "No single letter is standard. Batchelor-style texts use e_ij, turbulence and LES papers use S_ij, continuum mechanics uses D, and some sources use E or ε̇. Wikipedia's strain-rate article uses E for the tensor, S for its isotropic part and D for its deviatoric part, which nearly reverses turbulence usage. The engineering shear strain rate γ̇_xy equals 2e_xy, and this factor of 2 is a common source of mistakes. Stokes's paper is usually cited as 1845, its reading date. Part III of Transactions vol. 8, which contains it, was printed in 1847, and the complete volume is dated 1849.",
  "confidence": "medium",
  "chapters": [
   "notation",
   "continuum",
   "conservation"
  ],
  "sources": [
   "https://archive.org/details/mathematicalphys01stokuoft",
   "https://archive.org/details/transactionsofca08camb",
   "https://archive.org/details/bub_gb_o6hCzbAYX7cC",
   "https://en.wikipedia.org/wiki/Strain-rate_tensor"
  ],
  "group": "fluid"
 },
 {
  "id": "stokes-1845-mu",
  "symbol": "μ",
  "tex": "\\rho\\frac{D\\mathbf{u}}{Dt} = -\\nabla p + \\mu\\nabla^2\\mathbf{u} + \\frac{\\mu}{3}\\nabla(\\nabla\\cdot\\mathbf{u}) + \\rho\\mathbf{f}",
  "name": "Stokes's equations of viscous flow, with μ",
  "meaning": "The Navier–Stokes equations in the form still used. Stress depends linearly on the rate of strain through one coefficient, μ, the dynamic viscosity. The μ/3 term comes from Stokes's assumption that a uniform expansion produces no extra viscous stress, which amounts to zero bulk viscosity.",
  "introduced_by": "George Gabriel Stokes",
  "year": "Read 14 April 1845; printed 1847",
  "first_work": "'On the Theories of the Internal Friction of Fluids in Motion, and of the Equilibrium and Motion of Elastic Solids', Transactions of the Cambridge Philosophical Society 8, part III (part printed 1847; the title page of the complete volume is dated 1849), pp. 287–319. Reprinted in Mathematical and Physical Papers vol. 1 (1880), pp. 75–129, with the equations on pp. 92–93.",
  "popularised_by": "Lamb's Treatise (1879) and Hydrodynamics (1895) present the viscous equations. The 1895 edition says they were 'first obtained by Navier and Poisson' and that the molecule-free method 'appears to be due in principle to de Saint-Venant and Stokes'.",
  "story": "Stokes derived the equations from continuum assumptions about internal friction, not from a model of molecules. His equation (12) is the compressible case and includes a separate μ/3 term. Equation (13) is the incompressible case, paired with du/dx + dv/dy + dw/dz = 0. He wrote ρ for density, p for pressure and X, Y, Z for the external force, and used D/Dt in the same paper. In 1850 he combined μ/ρ into one quantity (see kinematic viscosity).",
  "original_form": "\\rho\\left(\\frac{Du}{Dt}-X\\right)+\\frac{dp}{dx}-\\mu\\left(\\frac{d^2u}{dx^2}+\\frac{d^2u}{dy^2}+\\frac{d^2u}{dz^2}\\right)-\\frac{\\mu}{3}\\frac{d}{dx}\\left(\\frac{du}{dx}+\\frac{dv}{dy}+\\frac{dw}{dz}\\right)=0",
  "contested": "The paper is cited as 1845 (reading), 1847 (printing of part III) or 1849 (the date on the complete volume's title page). All three dates appear in the literature, but they refer to the same paper. The zero-bulk-viscosity assumption behind the μ/3 term, now usually called the Stokes hypothesis, is a modelling choice rather than a law. Stokes still wrote d for partial derivatives.",
  "confidence": "high",
  "chapters": [
   "conservation",
   "notation",
   "continuum"
  ],
  "sources": [
   "https://archive.org/details/mathematicalphys01stokuoft",
   "https://archive.org/details/transactionsofca08camb",
   "https://archive.org/details/hydrodynamics00horarich",
   "https://arxiv.org/pdf/2401.13669"
  ],
  "group": "fluid"
 },
 {
  "id": "viscosity-mu-eta",
  "symbol": "μ, η",
  "tex": "\\tau = \\mu\\frac{\\partial u}{\\partial y}",
  "name": "Dynamic viscosity μ (or η)",
  "meaning": "The coefficient that links shear stress to velocity gradient, in Pa·s. Engineers and most fluid dynamicists write μ; chemists, many physicists and IUPAC prefer η. Through ν = μ/ρ it sets the diffusive time-step limit of explicit schemes.",
  "introduced_by": "μ: George Gabriel Stokes (1845) in the fluid equations. η: origin not established.",
  "year": "1845 (μ)",
  "first_work": "Stokes, 'On the Theories of the Internal Friction of Fluids in Motion…', Trans. Camb. Phil. Soc. 8 (read 1845, part printed 1847)",
  "popularised_by": "Lamb's Treatise (1879) uses μ and calls it the 'coefficient of viscosity'; his Hydrodynamics (1895) does the same and defines ν = μ/ρ.",
  "story": "Each founder used his own letter. Navier wrote ε (1822). Stokes wrote μ (1845). Prandtl, in his 1904 boundary-layer paper, wrote k and called it the 'Reibungskonstante' (friction constant), giving the friction force on a unit volume as K = k∇²v. Stokes's μ passed through Lamb into the English-language tradition, while physical chemistry settled on η.",
  "original_form": "\\varepsilon\\ (1822),\\quad \\mu\\ (1845),\\quad k\\ (1904)",
  "contested": "Wikipedia records that both μ and η are in use but gives no history for either symbol. Who first used η for viscosity was not established. Lamb also used η for a component of rotation, which can confuse readers of old texts.",
  "confidence": "medium",
  "chapters": [
   "continuum",
   "notation"
  ],
  "sources": [
   "https://archive.org/details/mathematicalphys01stokuoft",
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf",
   "https://en.wikipedia.org/wiki/Viscosity"
  ],
  "group": "fluid"
 },
 {
  "id": "jacobi-method",
  "symbol": "Jacobi",
  "tex": "x^{(k+1)} = D^{-1}\\,(b - (L+U)\\,x^{(k)})",
  "name": "Jacobi iteration",
  "meaning": "Update every unknown at once from the previous iterate, using its own equation with all neighbours held at their old values. For the pressure Poisson problem it converges slowly (in O(N²) sweeps on an N×N grid), but each sweep is fully parallel. That makes it popular on GPUs and as a smoother inside multigrid.",
  "introduced_by": "Carl Gustav Jacob Jacobi",
  "year": "1845",
  "first_work": "C. G. J. Jacobi, 'Ueber eine neue Auflösungsart der bei der Methode der kleinsten Quadrate vorkommenden lineären Gleichungen', Astronomische Nachrichten 22(20) (1845) 297–306",
  "popularised_by": "Mid-20th-century numerical analysts; David M. Young's 1950 thesis calls the point version the 'Kormes Method'",
  "story": "Jacobi's 1845 paper in Astronomische Nachrichten solved the normal equations of least squares, as used in astronomy and geodesy, by repeated correction of the unknowns. Saad (2019) describes it as a relaxation method in which each new correction is not used immediately. He notes that in the same paper Jacobi first modified the system with what are now called Jacobi rotations, so that 'one can say that Jacobi introduced the first known form of preconditioning'. Saad and van der Vorst (2000) describe Jacobi applying 'plane rotations to the matrix in order to force stronger diagonal dominance'. The plain point iteration taught today has also gone by other names, including the 'Kormes Method' in Young's 1950 thesis.",
  "original_form": "",
  "contested": "Saad and van der Vorst (2000) date this work 1846. Saad (2019) dates the linear-systems paper 1845 and puts the rotation-based eigenvalue method in a separate 1846 paper in Crelle's Journal, and Crossref gives Astron. Nachr. vol. 22 as 1845. Jacobi's own procedure combined rotations with iteration, so the textbook 'Jacobi method' simplifies what he published. The name 'Jacobi method' also refers to his 1846 eigenvalue algorithm.",
  "confidence": "high",
  "chapters": [
   "solvers",
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.1002/asna.18450222002",
   "https://www-users.cse.umn.edu/~saad/PDF/umsi-99-152.pdf",
   "https://arxiv.org/abs/1908.01083",
   "https://web.ma.utexas.edu/CNA/DMY/dmy-phd.html"
  ],
  "group": "numerics"
 },
 {
  "id": "notation-nabla-squared",
  "symbol": "∇²",
  "tex": "\\nabla^2",
  "name": "∇² for the Laplacian (and its sign)",
  "meaning": "The Laplacian written as the 'square' of the del operator. In today's vector notation ∇² = ∇·∇ = ∂²/∂x² + ∂²/∂y² + ∂²/∂z².",
  "introduced_by": "William Rowan Hamilton (as −◁²)",
  "year": "1846 (communicated 20 July 1846; printed in a volume dated 1847)",
  "first_work": "Hamilton, 'On a proof of Pascal's Theorem by means of Quaternions; and on some other connected Subjects', communicated to the Royal Irish Academy on 20 July 1846, Proceedings of the Royal Irish Academy 3 (1847), pp. 273–292, eq. (50). Restated, with the heat equation, in 'On Quaternions; or on a new System of Imaginaries in Algebra', Philosophical Magazine (3rd ser.) 31 (October 1847), art. 49.",
  "popularised_by": "James Clerk Maxwell, A Treatise on Electricity and Magnetism (1873), Art. 26, building on P. G. Tait's quaternion papers.",
  "story": "In quaternions i² = j² = k² = −1, so the square of Hamilton's operator is the negative of the Laplacian. Hamilton wrote (d/dx)² + (d/dy)² + (d/dz)² = −◁² and in 1847 used it to rewrite the heat equation. Maxwell's 1873 Treatise follows the quaternion convention. He calls ∇²q the 'concentration' of q and says the value at a point exceeds or falls short of the mean value nearby 'according as ∇²q is positive or negative' (https://archive.org/details/electricandmagne01maxwrich). That only works if his ∇² is the negative of today's Laplacian.",
  "original_form": "-\\triangleleft^2 = \\left(\\frac{d}{dx}\\right)^2 + \\left(\\frac{d}{dy}\\right)^2 + \\left(\\frac{d}{dz}\\right)^2",
  "contested": "An earlier draft gave the October 1847 Philosophical Magazine as the first work. The identity already appears in the Royal Irish Academy paper communicated in July 1846; Hamilton says that abstract was published before the end of 1846, though the volume is dated 1847. In quaternion-era texts (Hamilton, Tait, Maxwell's Treatise) ∇² can carry the opposite sign to today's Laplacian, so older formulas need care. When the positive vector-analysis convention took over has not been traced.",
  "confidence": "high",
  "chapters": [
   "notation",
   "pressure",
   "stiffness"
  ],
  "sources": [
   "https://www.maths.tcd.ie/pub/HistMath/People/Hamilton/Pascal/",
   "https://www.maths.tcd.ie/pub/HistMath/People/Hamilton/OnQuat/",
   "https://archive.org/details/electricandmagne01maxwrich",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/"
  ],
  "group": "vectors"
 },
 {
  "id": "notation-hamilton-nabla",
  "symbol": "∇ (Hamilton wrote ◁)",
  "tex": "\\nabla = \\mathbf{i}\\frac{\\partial}{\\partial x} + \\mathbf{j}\\frac{\\partial}{\\partial y} + \\mathbf{k}\\frac{\\partial}{\\partial z}",
  "name": "Hamilton's operator ∇",
  "meaning": "The vector differential operator behind gradient (∇p), divergence (∇·u), curl (∇×u) and the Laplacian. It gives the Navier–Stokes equations their compact form.",
  "introduced_by": "William Rowan Hamilton",
  "year": "1846–1847 (as ◁); upright ∇ standard from Tait, 1867",
  "first_work": "'On a proof of Pascal's Theorem by means of Quaternions; and on some other connected Subjects', communicated 20 July 1846, Proceedings of the Royal Irish Academy 3 (1847), pp. 273–292. Also Philosophical Magazine (3rd ser.) 31 (October 1847), art. 49, and Lectures on Quaternions (Dublin, 1853), p. 610.",
  "popularised_by": "Peter Guthrie Tait, An Elementary Treatise on Quaternions (1867, p. 221), who made the upright ∇ standard; Knott says ∇ is little more than mentioned in that first edition and was developed in the second and third editions. Then Maxwell's Treatise (1873).",
  "story": "Hamilton defined ◁ = i d/dx + j d/dy + k d/dz (with ordinary d for partials) and noted its uses in physics, such as heat flux. He had written the operator with an upright ∇ in a paper meant for the British Association meeting at Southampton in September 1846. That paper was forwarded by mistake to Collingwood, Sir John Herschel's home, and arrived too late to be shown at the meeting. In print he turned the symbol on its side, explaining: 'In that paper itself, the characteristic was written ∇; but this more common sign has been so often used with other meanings, that it seems desirable to abstain from appropriating it to the new signification here proposed' (https://www.maths.tcd.ie/pub/HistMath/People/Hamilton/OnQuat/). Tait restored the upright ∇.",
  "original_form": "\\triangleleft = \\frac{i\\,d}{dx} + \\frac{j\\,d}{dy} + \\frac{k\\,d}{dz}",
  "contested": "Each of the dates 1837, 1846, 1847 and 1853 is quoted as when Hamilton introduced ∇. In 1837 Hamilton used an upright ∇ only as a generic function symbol (OED, via Miller), and in 1839 for a permutation operator, not the vector operator. 1846 is the Irish Academy communication and the unsent Southampton paper, 1847 the printed versions, and 1853 the Lectures, which Cajori and the OED cite. Stein and Barcellos claim Hamilton wrote the gradient with a capital Δ in 1846. David Wilkins, who edited Hamilton's papers, says he has never seen this.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation"
  ],
  "sources": [
   "https://www.maths.tcd.ie/pub/HistMath/People/Hamilton/OnQuat/",
   "https://www.maths.tcd.ie/pub/HistMath/People/Hamilton/Pascal/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/lifescientificwo00knotuoft"
  ],
  "group": "vectors"
 },
 {
  "id": "hamilton-scalar-vector",
  "symbol": "S.q, V.q",
  "tex": "q = \\mathrm{S}q + \\mathrm{V}q",
  "name": "Hamilton's scalar and vector parts of a quaternion",
  "meaning": "Today a 'scalar' is a single number and a 'vector' is a quantity with magnitude and direction. Hamilton's operators S and V split a quaternion into those two parts. Applied to the quaternion product of two vectors, they give minus the dot product (S) and the cross product (V). Both modern products therefore started as the two halves of one quaternion product.",
  "introduced_by": "William Rowan Hamilton",
  "year": "1846",
  "first_work": "\"On Quaternions; or on a New System of Imaginaries in Algebra\", London, Edinburgh and Dublin Philosophical Magazine (3rd series) vol. 29, July 1846, pp. 26–31. This is articles 18–21 of a series printed in 18 instalments from 1844 to 1850.",
  "popularised_by": "P. G. Tait, An Elementary Treatise on Quaternions (1867). Maxwell used S and V with ∇ in 1871 and in his 1873 Treatise.",
  "story": "In article 18 Hamilton called the real part of a quaternion its 'scalar', because it can take \"all values contained on the one scale of progression of number from negative to positive infinity\" (source: https://www.maths.tcd.ie/pub/HistMath/People/Hamilton/OnQuat/OnQuat.pdf). He called the imaginary part the 'vector' because it is \"geometrically constructed by a straight line, or radius vector\" (same source). He marked the two parts with the prefixes Scal. and Vect., shortened to S. and V. In article 21 he gave S.αα′ = −(xx′+yy′+zz′), with V.αα′ equal to the familiar cross-product components. The minus sign comes from the quaternion rule that a unit vector squared is −1. Physicists later objected to it; Heaviside called it \"an obtrusive stumbling-block\".",
  "original_form": "Q = \\mathrm{S}.Q + \\mathrm{V}.Q ; \\mathrm{S}.\\alpha\\alpha' = -(xx'+yy'+zz')",
  "contested": "'Vector' was an old astronomy word long before Hamilton, as in 'radius vector'; Miller reports that the OED's earliest example is from J. Harris's Lexicon Technicum (1704). Hamilton gave the word its new meaning. Miller also notes that Hamilton's new 'vector' already appears in his Royal Irish Academy paper presented in November 1844. That paper sits in Proceedings vol. 3, dated 1847, but David Wilkins thinks it was probably printed in the first half of 1845. The July 1846 Philosophical Magazine instalment is the earliest printing I checked directly.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://www.maths.tcd.ie/pub/HistMath/People/Hamilton/OnQuat/OnQuat.pdf",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/v/",
   "https://archive.org/details/electromagnetict01heavuoft"
  ],
  "group": "vectors"
 },
 {
  "id": "tensor-word",
  "symbol": "tensor",
  "tex": "\\mathrm{T}Q",
  "name": "The word 'tensor': Hamilton (1846) and Voigt (1898)",
  "meaning": "For Hamilton, a tensor was the length (modulus) of a quaternion, written TQ. Today a tensor is a multilinear object whose components transform in a fixed way. In fluids, the stress and strain-rate tensors are the main examples.",
  "introduced_by": "William Rowan Hamilton (old meaning); Woldemar Voigt (physical meaning)",
  "year": "1846; 1898",
  "first_work": "Hamilton, \"On Quaternions…\", Philosophical Magazine (3rd series) 29 (July 1846), art. 19, p. 27. Voigt, Die fundamentalen physikalischen Eigenschaften der Krystalle in elementarer Darstellung (Leipzig: Veit & Comp., 1898; preface dated Göttingen, September 1897), preface p. VI.",
  "popularised_by": "Einstein and Grossmann adopted 'tensor' in their 1913 'Entwurf' paper (per Miller). 'Tensor analysis' and 'tensor calculus' appear in English in 1922, in H. L. Brose's translation of Weyl's Space–Time–Matter (per Miller).",
  "story": "Hamilton (from Latin tendere, to stretch) used 'tensor' for what his earlier articles had called the modulus, and wrote Q = TQ.UQ (tensor times versor). Voigt, writing on crystal physics, needed a name for quantities such as a simple tension or extension. These have a size and a 'two-sided' direction whose two ends are equivalent, and they cannot be replaced by components the way vectors can. He wrote that he had proposed \"für jene zweiseitigen gerichteten Grössen den Namen „Tensoren“\" (source: https://archive.org/details/diefundamentale00voiggoog, preface, p. VI). He argued that the clash with the quaternion term was only apparent. Hamilton's sense lingered: in 1893 Heaviside still defined the scalar product of vectors A and B \"whose tensors are A and B\", meaning their magnitudes (Electromagnetic Theory vol. 1).",
  "original_form": "Q = \\mathrm{T}Q . \\mathrm{U}Q",
  "contested": "Voigt's 'Tensor' was a single two-sided directed magnitude, such as a uniaxial stress. For him a general stress or strain state was a 'Tensortripel' of three perpendicular tensors. The modern meaning came from later generalisation. Ricci and Levi-Civita (1900) did not use the word, and Gibbs used 'dyadic' instead. Hamilton's sense is now obsolete.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://www.maths.tcd.ie/pub/HistMath/People/Hamilton/OnQuat/OnQuat.pdf",
   "https://archive.org/details/diefundamentale00voiggoog",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/t/",
   "https://archive.org/details/electromagnetict01heavuoft"
  ],
  "group": "vectors"
 },
 {
  "id": "kinematic-viscosity-nu",
  "symbol": "ν",
  "tex": "\\nu = \\frac{\\mu}{\\rho}",
  "name": "Kinematic viscosity ν",
  "meaning": "Viscosity divided by density, in m²/s: the diffusivity of momentum. It is the coefficient in the incompressible equations and in Re = UL/ν. It also sets the explicit diffusion limit, Δt ≤ Δx²/(2ν) in one dimension.",
  "introduced_by": "The quantity: George Gabriel Stokes (1850), as μ′, the 'index of friction'. The name 'kinematic coefficient of viscosity': credited to Maxwell by Lamb (1879); Maxwell's own first use was not found. The symbol ν: in Lamb (1895), who calls it usual.",
  "year": "1850 (read 9 December 1850; part printed 1851); ν adopted between 1879 and 1895",
  "first_work": "Stokes, 'On the Effect of the Internal Friction of Fluids on the Motion of Pendulums', Transactions of the Cambridge Philosophical Society 9, part II (1851), pp. [8]–[106]",
  "popularised_by": "Horace Lamb, Hydrodynamics (1895), Art. 284",
  "story": "In his pendulum paper Stokes noticed that μ always appears divided by ρ. He wrote (https://archive.org/details/transactionsofca09camb): \"Let μ′ = μ/ρ. The constant μ′ may conveniently be called the index of friction of the fluid\". That name did not survive. Lamb's 1879 Treatise keeps Stokes's letter μ′ and says it 'is called by Maxwell the 'kinematic coefficient of viscosity''. By 1895 Lamb had switched letters (Hydrodynamics, Art. 284, https://archive.org/details/hydrodynamics00horarich): \"it is therefore usual to denote this by a special symbol ν, called by Maxwell the 'kinematic coefficient' of viscosity.\"",
  "original_form": "\\mu' = \\frac{\\mu}{\\rho}",
  "contested": "An earlier draft said the 1879 edition of Lamb has no 'kinematic coefficient'. That is wrong: the 1879 Treatise uses the term, credits it to Maxwell, and writes μ′. What changed by 1895 was the letter, from μ′ to ν. Where Maxwell introduced the term, and who first wrote ν or 'kinematic viscosity', was not found.",
  "confidence": "medium",
  "chapters": [
   "continuum",
   "notation",
   "similarity"
  ],
  "sources": [
   "https://archive.org/details/transactionsofca09camb",
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://archive.org/details/hydrodynamics00horarich"
  ],
  "group": "fluid"
 },
 {
  "id": "kronecker-delta",
  "symbol": "δ_ij",
  "tex": "\\delta_{ij}",
  "name": "Kronecker delta",
  "meaning": "δ_ij = 1 if i = j and 0 otherwise. These are the components of the identity tensor. In fluids the pressure part of the stress is written −p δ_ij.",
  "introduced_by": "Leopold Kronecker",
  "year": "1866 (Berlin Academy, read 15 October 1866); 1868 (reprint in Crelle's Journal)",
  "first_work": "\"Ueber bilineare Formen\", Monatsberichte der Königlich Preussischen Akademie der Wissenschaften zu Berlin 1866, session of 15 October 1866, pp. 597ff., with δ defined on p. 601. Reprinted in Journal für die reine und angewandte Mathematik 68 (1868), 273–285, with δ on p. 276.",
  "popularised_by": "Kronecker's lectures on determinants (published 1903, ed. K. Hensel), per Knuth, who says the symbol 'soon became widespread'",
  "story": "Kronecker was studying how bilinear forms change under substitutions. He wrote that from then on δ_ik would always be taken as 1 or 0 according as the indices i and k are equal or different. In the original: \"wenn, wie von jetzt ab stets geschehen soll, δ_ik = 1 oder δ_ik = 0 genommen wird, je nachdem die Indices i und k einander gleich oder von einander verschieden sind\" (1866 printing, p. 601; https://archive.org/details/monatsberichtede1866knig). This let him write in one short formula the condition that one coefficient system is the inverse of another. The 1868 Crelle reprint has a footnote explaining that it reprints the Academy note because Christoffel's paper in the same volume refers to it. Knuth notes that many of Kronecker's followers wrote δ_j^k.",
  "original_form": "\\delta_{ik}",
  "contested": "Sources disagree between 1866 (Encyclopedia of Mathematics) and 1868 (Knuth, ProofWiki, citing Crelle). Both refer to the same text: 1866 is the Academy note and 1868 the journal reprint. I checked both printings directly, and the δ definition is already in the 1866 Monatsbericht on p. 601, so 1866 is the date of first use.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation"
  ],
  "sources": [
   "https://archive.org/details/monatsberichtede1866knig",
   "https://archive.org/details/sim_journal-fuer-die-reine-und-angewandte-mathematik_1868_68",
   "https://arxiv.org/abs/math/9205211",
   "https://doi.org/10.1515/crll.1868.68.273"
  ],
  "group": "vectors"
 },
 {
  "id": "circulation-gamma",
  "symbol": "Γ",
  "tex": "\\Gamma",
  "name": "Circulation Γ",
  "meaning": "The line integral of velocity around a closed curve, which equals the vorticity flux through the curve. Kelvin's theorem says circulation is conserved in an inviscid, barotropic fluid. The Kutta–Joukowski theorem gives lift per unit span as ρUΓ, so a scheme that loses circulation loses lift and smears vortices.",
  "introduced_by": "William Thomson (Lord Kelvin) introduced the term. Γ appears in Prandtl's wing theory by 1918; the first user of Γ was not established.",
  "year": "Read 1867; printed 1869 (term); 1918 (Γ)",
  "first_work": "W. Thomson, 'On Vortex Motion', Transactions of the Royal Society of Edinburgh 25 (1869), pp. 217–260; read 29 April 1867, §§1–59 recast 28 August–12 November 1868",
  "popularised_by": "Lamb's Treatise (1879), Art. 39. Lanchester, Kutta, Zhukovsky and Prandtl used circulation to explain lift.",
  "story": "Kelvin defined the term in §60 of his paper on vortex motion (Mathematical and Physical Papers vol. 4, https://archive.org/details/mathematicalphys0004sirw): the line integral of tangential velocity 'is called the flow in that line. If the line is endless … the flow is called circulation.' He showed that it is conserved in an ideal fluid. Lamb's 1879 Treatise adopted 'flow' and 'circulation', citing 'Thomson, On Vortex Motion. Edin. Trans. Vol. xxv., 1869', but wrote the circulation as I(ABCA), not Γ. Prandtl's Tragflügeltheorie I (presented 26 July 1918) writes the circulation round a wing as Γ and the lift of a length l as ρVlΓ, which he calls the 'Kutta-Joukowski'sche Formel'.",
  "original_form": "I(ABCA)",
  "contested": "Dates for Kelvin's paper vary: it was read in 1867, partly rewritten in 1868, and printed in volume 25, which Lamb and the reprint date 1869 and Cambridge Core lists as 1868. An earlier draft gave 1919 for Γ; Prandtl's first wing-theory paper of 1918 already uses it. Γ may have been used earlier still, for example by Kutta or Zhukovsky; this was not checked.",
  "confidence": "high",
  "chapters": [
   "notation",
   "viewpoints"
  ],
  "sources": [
   "https://archive.org/details/mathematicalphys0004sirw",
   "https://www.cambridge.org/core/product/identifier/S0080456800028179/type/journal_article",
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf"
  ],
  "group": "fluid"
 },
 {
  "id": "streamline",
  "symbol": "streamline",
  "tex": "\\frac{dx}{u} = \\frac{dy}{v} = \\frac{dz}{w}",
  "name": "Streamline (stream-line, Stromlinie)",
  "meaning": "A curve everywhere tangent to the instantaneous velocity. In steady flow, streamlines, particle paths and streaklines coincide; in unsteady flow they differ. The difference matters when reading visualisations of simulations.",
  "introduced_by": "Not established. Stokes (1842) wrote 'lines of motion'; Rankine used 'stream-line' in 1868; Lamb used it in 1879.",
  "year": "By 1868",
  "first_work": "Earliest use found here: W. J. M. Rankine, 'Elementary demonstrations of principles relating to stream-lines', The Engineer, 16 October 1868; reprinted in his Miscellaneous Scientific Papers (1881), pp. 522–529",
  "popularised_by": "Lamb (1879); the German 'Stromlinie' appears in Prandtl (1904)",
  "story": "In his 1842 paper on steady motion Stokes wrote of 'lines of motion'. Rankine in 1868 (Miscellaneous Scientific Papers, https://archive.org/details/miscellaneoussci00rank) defined a stream-line as 'the line, whether straight or curved, that is traced by a particle in a current of fluid', and noted that in a steady current each stream-line keeps its shape and position. Lamb's 1879 Treatise says that in steady motion the lines of motion coincide with the paths of the particles 'and are in this case called 'stream-lines.'' (https://archive.org/details/maththeorfluid00lambrich). Lamb also connected them to the stream function: the curves ψ = const. are the stream-lines. Stokes, in an appendix to his wave paper in the 1880 reprint, wrote 'line of motion or stream-line'.",
  "original_form": "",
  "contested": "Both Rankine (1868) and Lamb (1879) tie the word to particle paths in steady motion. The modern definition is instantaneous and also applies to unsteady flow, where streamlines and particle paths differ. The first user of the word was not established; Rankine is only the earliest found here.",
  "confidence": "medium",
  "chapters": [
   "viewpoints",
   "notation"
  ],
  "sources": [
   "https://archive.org/details/miscellaneoussci00rank",
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://archive.org/details/mathematicalphys01stokuoft",
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf"
  ],
  "group": "fluid"
 },
 {
  "id": "notation-nabla-name",
  "symbol": "nabla, del",
  "tex": "\\nabla",
  "name": "The names 'nabla' and 'del'",
  "meaning": "The spoken names for ∇. 'Del' is the usual one in English-language engineering and physics, and 'nabla' is common elsewhere.",
  "introduced_by": "William Robertson Smith (suggested 'nabla' to P. G. Tait)",
  "year": "c. 1870",
  "first_work": "Private correspondence. Robertson Smith's letter to Tait on the word's philology was returned by Maxwell on 14 November 1870. The story is told in C. G. Knott, Life and Scientific Work of Peter Guthrie Tait (Cambridge, 1911), pp. 143–145.",
  "popularised_by": "Tait in print, for example in 'On the importance of quaternions in physics' (1890): 'I shall speak of it as Nabla' (https://mathshistory.st-andrews.ac.uk/Miller/mathword/n/). 'Del' comes from E. B. Wilson, Vector Analysis, founded upon the lectures of J. Willard Gibbs (1901).",
  "story": "A nabla is an ancient harp-like instrument. Knott writes: 'From the resemblance of this inverted delta to an Assyrian harp Robertson Smith suggested the name Nabla.' Maxwell joked about it in letters to Tait: 'What do you call this? Atled?' (7 November 1870), and 'Still harping on that Nabla?' (23 January 1871). But he objected that 'a name derived from its shape is hardly the thing' (14 November 1870; https://archive.org/details/lifescientificwo00knotuoft). Maxwell instead named the results of ∇: 'slope' (changed to 'space-variation' in the 1881 second edition of his Treatise), 'convergence' and 'curl'; in a later letter he also floated 'space-variation' as a name for ∇ itself. Heaviside wrote: 'The name Nabla seems, therefore, ludicrously inefficient' (Phil. Trans. A 183, 1892; quoted at https://mathshistory.st-andrews.ac.uk/Miller/mathword/n/). Wilson proposed 'del' because 'the monosyllable del is so short and easy to pronounce' (https://mathshistory.st-andrews.ac.uk/Miller/mathword/d/).",
  "original_form": "",
  "contested": "Maxwell is often said to have coined 'nabla'. He did not: Robertson Smith suggested it to Tait, and Maxwell used it only in joking letters and in the title of a comic ode dedicated 'To the Chief Musician upon Nabla', that is, Tait. 'Atled' (delta spelled backwards) was Maxwell's joke too. Knott says Maxwell's reluctance 'probably' kept Tait from using the word in print earlier, so the exact first printed use is uncertain.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/lifescientificwo00knotuoft",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/n/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/d/"
  ],
  "group": "vectors"
 },
 {
  "id": "maxwell-1871-classification",
  "symbol": "slope, convergence, curl, concentration",
  "tex": "\\nabla P, \\mathrm{S}\\nabla\\sigma, \\mathrm{V}\\nabla\\sigma, \\nabla^2 Q",
  "name": "Maxwell's 'On the Mathematical Classification of Physical Quantities' (1871)",
  "meaning": "Maxwell proposed English names for what Hamilton's ∇ produces. 'Slope' is our gradient with the opposite sign. 'Convergence' is minus our divergence. 'Curl' is the curl. 'Concentration' is minus the Laplacian. Only 'curl' survives.",
  "introduced_by": "James Clerk Maxwell",
  "year": "1871",
  "first_work": "\"Remarks on the Mathematical Classification of Physical Quantities\", Proceedings of the London Mathematical Society vol. 3, pp. 224–232 (the Clerk Maxwell Foundation's transcription gives 224–233). The paper was read at the meeting of 9 March 1871 by the Hon. Secretary, Mr Tucker, not by Maxwell. It was reprinted as \"On the Mathematical Classification of Physical Quantities\" in The Scientific Papers of James Clerk Maxwell vol. 2 (1890), paper XLVI, from p. 257.",
  "popularised_by": "Maxwell's Treatise on Electricity and Magnetism (1873). 'Curl' was then taken up by Gibbs (1881), Heinrich Weber (1900, in German), Heaviside (1893) and Gibbs–Wilson (1901).",
  "story": "Maxwell used the quaternion operator ∇ = i d/dx + j d/dy + k d/dz, so ∇² is minus the Laplacian. He split ∇σ into a scalar part S∇σ and a vector part V∇σ. He called ∇P the 'slope' of P; with the quaternion sign it indicates \"the direction in which P decreases most rapidly\". He named S∇σ the 'Convergence' and V∇σ \"the Curl or Version of the original vector function\". He said he wanted a word that would neither, \"like Rotation, Whirl, or Twirl, connote motion, nor, like Twist, indicate a helical or screw structure\". He asked for suggestions because \"the onomastic power is very faint in me\". All quotes are from the scan at https://davidtong.org/pdfs/teaching/vector-calculus/maxwell.pdf.",
  "original_form": "\\nabla = i\\frac{d}{dx} + j\\frac{d}{dy} + k\\frac{d}{dz} ; \\nabla^2 = -(\\frac{d^2}{dx^2} + \\frac{d^2}{dy^2} + \\frac{d^2}{dz^2})",
  "contested": "Miller's 'divergence' entry cites this paper as Proc. LMS 3 (1871), 257–266. That combines the Proceedings volume with the page numbers of the 1890 Scientific Papers reprint; the Proceedings pages begin at 224. The DSB, as quoted in a Christie's catalogue, calls it a paper 'of 1870' and says Maxwell coined 'gradient'. Both claims are wrong. 1870 is the date of Maxwell's letter to Tait of 7 November 1870, in which he first tried out the names, and his word was 'slope', not 'gradient'. In Miller's transcription of that letter Maxwell also tried 'Twist' and 'Twirl' before writing \"for Cayley's sake I might say Curl (after the fashion of Scroll)\" (source: https://mathshistory.st-andrews.ac.uk/Miller/mathword/c/). I have not seen the original letter. An earlier draft of this record gave the issue as 'no. 34'. I could not confirm that number and have removed it.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://davidtong.org/pdfs/teaching/vector-calculus/maxwell.pdf",
   "https://archive.org/details/scientificpapers02maxwuoft",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/c/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/g/"
  ],
  "group": "vectors"
 },
 {
  "id": "notation-laplace-operator-name",
  "symbol": "Laplace's operator, Laplacian",
  "tex": "\\nabla^2",
  "name": "The names 'Laplace's operator' and 'Laplacian'",
  "meaning": "The usual names for Δ = ∇². The name honours Laplace's work on potential theory, where the equation ∇²V = 0 is central.",
  "introduced_by": "James Clerk Maxwell ('Laplace's Operator')",
  "year": "1873",
  "first_work": "A Treatise on Electricity and Magnetism, vol. 1 (Oxford, 1873), Art. 26, p. 29.",
  "popularised_by": "Not documented. For 'Laplacian' as a noun for the operator, the earliest OED citation reported on Jeff Miller's pages is Pauling and Wilson, Introduction to Quantum Mechanics (1935). That dates a use; it does not show who spread the term.",
  "story": "Maxwell, having squared Hamilton's operator, wrote that it becomes 'an operator occurring in all parts of Physics, which we may refer to as Laplace's Operator' (https://archive.org/details/electricandmagne01maxwrich). Miller's page, citing the OED, gives this as the earliest use found. In a preface dated February 1886 (to a book published in 1889), George Minchin proposed 'Laplacian' for Laplace's coefficients (spherical harmonics), not for the operator. The phrase 'Laplace's equation' is found in English by 1812.",
  "original_form": "",
  "contested": "These are earliest citations found by the OED and by Miller's contributors, not proven first uses, so earlier uses may exist. Crediting Robert Murphy (1833) with the name is a mix-up: Murphy introduced the symbol Δ, not the name.",
  "confidence": "medium",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/l/",
   "https://archive.org/details/electricandmagne01maxwrich"
  ],
  "group": "vectors"
 },
 {
  "id": "maxwell-treatise-1873",
  "symbol": "curl (Treatise, Art. 25)",
  "tex": "\\mathrm{V}\\nabla\\sigma",
  "name": "Maxwell's A Treatise on Electricity and Magnetism (1873)",
  "meaning": "This two-volume treatise introduced many physicists to ∇ and to the names 'slope', 'convergence' and 'curl', all in its Preliminary chapter. It printed vector quantities as German (Fraktur) capital letters.",
  "introduced_by": "James Clerk Maxwell",
  "year": "1873",
  "first_work": "A Treatise on Electricity and Magnetism, 2 vols (Oxford: Clarendon Press, 1873). Vol. 1, Preliminary: Art. 17, p. 15 ('Slope'); Art. 25, p. 28 ('convergence' and 'curl').",
  "popularised_by": "The second edition (Clarendon Press, 1881). W. D. Niven's preface (dated 1 October 1881) says that Maxwell had rewritten the first nine chapters before he died in 1879, and that from the ninth chapter onwards the edition is little more than a reprint. In this edition Art. 17 calls the vector the 'space-variation' instead of the 'Slope' (vol. 1, p. 16), so the change was most likely Maxwell's own.",
  "story": "The Treatise repeated the 1871 proposals in a widely read textbook. In Art. 25 Maxwell wrote: \"I propose (with great diffidence) to call the vector part of ∇σ the curl, or the version of σ at the point P\" (source: https://en.wikisource.org/wiki/Page:A_Treatise_on_Electricity_and_Magnetism_-_Volume_1.djvu/68). In vol. 2, Art. 618, he explained that he denoted vectors by German letters, \"the number of different vectors being so great that Hamilton's favourite symbols would have been exhausted at once\" (source: https://archive.org/details/electricandmagne02maxwrich). Heaviside later wrote that he had \"formerly used ordinary Roman letters to mean the same as Maxwell's corresponding Germans\" before switching to bold Clarendon type (source: https://archive.org/details/electromagnetict01heavuoft, vol. 1, pp. 140–141).",
  "original_form": "",
  "contested": "Learners are often told that 'Maxwell's equations' first appeared as four vector equations. They did not. Volume 2 of the Treatise gives the 'general equations of the electromagnetic field' as sets lettered (A) to (L), mostly in Cartesian components, and Arts. 618–619 restate them in quaternion form with German letters. The compact four-equation div/curl form comes from Heaviside's later rewriting; for example, curl H = J appears as equation (18) in Electromagnetic Theory vol. 1 (1893).",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://en.wikisource.org/wiki/Page:A_Treatise_on_Electricity_and_Magnetism_-_Volume_1.djvu/68",
   "https://archive.org/details/electricityndmag01maxwrich",
   "https://archive.org/details/electricandmagne02maxwrich",
   "https://archive.org/details/electromagnetict01heavuoft"
  ],
  "group": "vectors"
 },
 {
  "id": "clifford-divergence-1878",
  "symbol": "divergence",
  "tex": "\\nabla\\cdot\\mathbf{u}",
  "name": "Clifford's 'divergence' (1878)",
  "meaning": "The divergence ∇·u is the net outflow per unit volume. For a fluid velocity it is the rate at which a fluid element's volume grows, and it is zero for incompressible flow.",
  "introduced_by": "William Kingdon Clifford",
  "year": "1878",
  "first_work": "Elements of Dynamic: An Introduction to the Study of Motion and Rest in Solid and Fluid Bodies, Part I: Kinematic (London: Macmillan, 1878), p. 209",
  "popularised_by": "Gibbs, Elements of Vector Analysis (1881): \"∇.ω is called the divergence of ω and ∇×ω its curl\". Heaviside used the term from 1883 (per Miller). Gibbs–Wilson, Vector Analysis (1901): ∇·V = div V.",
  "story": "Clifford was working out how fast the volume of a moving fluid grows. He called the quantity E = ∂u/∂x + ∂v/∂y + ∂w/∂z the 'expansion'. He then wrote: \"Prof. Clerk Maxwell calls the quantity −E the convergence of σ. We might perhaps therefore call E itself the divergence of σ\" (source: https://archive.org/details/p1elementsofdyna00clifuoft, p. 209). The next sentence (pp. 209–210) states the divergence theorem in words: the surface-integral of any vector equals the volume-integral of its divergence. For the rotation of a fluid element he used 'spin', defined by 2p = ∂w/∂y − ∂v/∂z and two similar equations, so his spin is half the modern curl. On p. 95 he had already distinguished 'a vector product' and 'a scalar product' of two vectors. Gibbs's 1881 pamphlet cites \"Clifford's Kinematic\" as a precedent for doing vector analysis without quaternions.",
  "original_form": "",
  "contested": "'Divergence' is sometimes credited to Gibbs or Heaviside, but Clifford's 1878 use is earlier than both. Cajori (via Miller) credits Clifford with the abbreviations 'div u' or 'dv u'. I found neither in the full text of Part I (1878). They may come from the parts published after his death in 1879, so that attribution is unverified.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation"
  ],
  "sources": [
   "https://archive.org/details/p1elementsofdyna00clifuoft",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/d/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/scientificpapers02gibbuoft"
  ],
  "group": "vectors"
 },
 {
  "id": "strouhal-number",
  "symbol": "St (Sr)",
  "tex": "\\mathrm{St} = \\frac{f L}{U}",
  "name": "Strouhal number",
  "meaning": "The dimensionless frequency of an unsteady flow. For vortex shedding behind a cylinder it stays near 0.2 over a wide range of Reynolds numbers (roughly 10² to 10⁵), which makes it a common validation check for simulation codes.",
  "introduced_by": "Named after Vincenc (Čeněk) Strouhal; who named it was not established",
  "year": "1878 (Strouhal's experiments)",
  "first_work": "Strouhal, 'Ueber eine besondere Art der Tonerregung', Annalen der Physik und Chemie (3rd series) 5 (= vol. 241), no. 10, pp. 216–251 (1878); doi:10.1002/andp.18782411005",
  "popularised_by": "",
  "story": "Strouhal studied the tones made by a wire moving through air (aeolian tones). He found that the frequency depends on the speed divided by the wire diameter. The tones were later linked to the alternating vortices of the von Kármán vortex street.",
  "original_form": "",
  "contested": "Who first called it the Strouhal number, and when, was not established. Both St and Sr are used, and St also denotes the Stanton number.",
  "confidence": "medium",
  "chapters": [
   "similarity",
   "trust"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Strouhal_number",
   "https://doi.org/10.1002/andp.18782411005"
  ],
  "group": "numbers"
 },
 {
  "id": "vorticity-omega-zeta",
  "symbol": "ω, ζ",
  "tex": "\\omega, \\zeta",
  "name": "Vorticity symbols ω and ζ, and the factor of ½",
  "meaning": "The modern ω = ∇×u is the full curl, which is twice the local angular velocity. ζ is used for the vertical component in 2D flows, meteorology and oceanography. In a 2D simulation one scalar, ω or ζ, carries all the vorticity.",
  "introduced_by": "ξ, η, ζ as rotation components: in Lamb from 1879, following Helmholtz and Kelvin. ω for the full curl: not established.",
  "year": "By 1879 (Lamb's ξ, η, ζ); 1904 (Prandtl's w = ½ rot v)",
  "first_work": "Lamb, Treatise (1879) and Hydrodynamics (1895), Art. 31; Prandtl, 'Über Flüssigkeitsbewegung bei sehr kleiner Reibung' (1904, printed 1905)",
  "popularised_by": "",
  "story": "Lamb wrote ξ, η, ζ for the 'component angular velocities' of a fluid element. His 1895 chapter on vortex motion says the subject 'was first investigated by von Helmholtz', with simpler proofs later given by Kelvin. Prandtl in 1904 also defined the vortex as half the curl: 'bezeichnet man mit w = ½ rot v den Wirbel'. Later usage dropped the ½ and took ω to be the full curl. ζ is still used for the vertical component, as in Lamb's ζ for the z-component.",
  "original_form": "w = \\frac{1}{2}\\mathrm{rot}\\, v",
  "contested": "Older 'rotation' or 'Wirbel' quantities, as in Lamb and in Prandtl 1904, are half of modern vorticity. This is a common source of factor-of-2 errors when copying classical results. When ω first meant the full curl was not established. Lamb's η for a rotation component clashes with η for viscosity.",
  "confidence": "medium",
  "chapters": [
   "notation",
   "turbulence",
   "stable-fluids"
  ],
  "sources": [
   "https://archive.org/details/hydrodynamics00horarich",
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf"
  ],
  "group": "fluid"
 },
 {
  "id": "lamb-hydrodynamics",
  "symbol": "Lamb, Hydrodynamics",
  "tex": "u = -\\frac{\\partial\\phi}{\\partial x}",
  "name": "Lamb's Hydrodynamics as the carrier of notation",
  "meaning": "The standard English reference on classical fluid mechanics for about half a century. Many symbols and attributions still in use probably reached later texts through it, including ψ, φ, ν and ξ, η, ζ for rotation components.",
  "introduced_by": "Horace Lamb (1849–1934)",
  "year": "1879 (Treatise); 1895 (Hydrodynamics, effectively the 2nd edition); 6th and last edition 1932",
  "first_work": "A Treatise on the Mathematical Theory of the Motion of Fluids (Cambridge, 1879); Hydrodynamics (Cambridge, 1895)",
  "popularised_by": "",
  "story": "The book grew and changed its vocabulary between editions. The 1879 Treatise already has 'stream-function' (ψ), 'stream-lines', 'circulation', ξ, η, ζ for rotation, and Maxwell's 'kinematic coefficient of viscosity', written there as Stokes's μ′. 'Vorticity' and the letter ν for the kinematic coefficient appear by the 1895 edition. Lamb's footnotes credit Lagrange (the stream function and the persistence of the velocity potential), Rankine, Thomson and Helmholtz, and later authors copied these attributions.",
  "original_form": "",
  "contested": "Lamb's sign convention, u = −∂φ/∂x, is the opposite of most modern texts. His footnotes are sometimes read as claiming more than they do, for example that Lagrange used the letter ψ (he used ω). Truesdell's claim that Lamb coined 'vorticity' is now considered wrong. An earlier draft said 'kinematic coefficient' first appears in the 1895 edition; it is already in the 1879 Treatise, and only the letter ν is new in 1895.",
  "confidence": "high",
  "chapters": [
   "notation",
   "viewpoints"
  ],
  "sources": [
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://archive.org/details/hydrodynamics00horarich",
   "https://en.wikipedia.org/wiki/Horace_Lamb",
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf"
  ],
  "group": "fluid"
 },
 {
  "id": "gibbs-elements-vector-analysis",
  "symbol": "α.β, α×β, ∇.ω, ∇×ω",
  "tex": "\\alpha . \\beta",
  "name": "Gibbs's Elements of Vector Analysis (privately printed 1881–1884)",
  "meaning": "The first systematic vector algebra and calculus without quaternions. It made the dot (direct) product and cross (skew) product the basic operations and wrote ∇. and ∇× for divergence and curl. Part II introduced dyadics for linear vector functions.",
  "introduced_by": "Josiah Willard Gibbs",
  "year": "1881 (Part I); 1884 (Part II)",
  "first_work": "Elements of Vector Analysis, Arranged for the Use of Students in Physics (New Haven: privately printed; pp. 1–36, 1881; pp. 37–83, 1884). Reprinted in The Scientific Papers of J. Willard Gibbs, vol. 2 (1906), pp. 17–90.",
  "popularised_by": "E. B. Wilson, Vector Analysis (1901), based on Gibbs's lectures",
  "story": "The preface explains that \"the object of the writer does not require any use of the conception of the quaternion\". It cites Clifford's Kinematic as a precedent and says the method attaches itself \"in some respects more closely\" to Grassmann's system than to Hamilton's (source: https://archive.org/details/scientificpapers02gibbuoft, p. 17). Gibbs wrote vectors as small Greek letters. He defined the 'direct product' α.β as the product of the lengths times the cosine, with no quaternion minus sign, and the 'skew product' α×β. He called ∇u the 'derivative' of u, and wrote that \"∇.ω is called the divergence of ω and ∇×ω its curl\".",
  "original_form": "\\alpha.\\beta ; \\alpha\\times\\beta ; \\nabla u ; \\nabla.\\omega ; \\nabla\\times\\omega",
  "contested": "The pamphlet is often said to have been 'published' in 1881. It was only printed for private circulation. Gibbs later called it \"never published, but somewhat widely circulated among those who were known to be interested in the subject\" (source: https://archive.org/details/vectoranalysiste00gibbiala, preface). Clifford had already named a 'vector product' and a 'scalar product' in 1878 (Elements of Dynamic, p. 95). Heaviside built a similar system independently at about the same time (Crowe, via Miller).",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/scientificpapers02gibbuoft",
   "https://archive.org/details/vectoranalysiste00gibbiala",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/v/",
   "https://archive.org/details/p1elementsofdyna00clifuoft"
  ],
  "group": "vectors"
 },
 {
  "id": "gibbs-dyadics-1884",
  "symbol": "Φ = αλ + βμ + …",
  "tex": "\\Phi = \\alpha\\lambda + \\beta\\mu + \\gamma\\nu",
  "name": "Gibbs's dyads and dyadics (1884)",
  "meaning": "A dyadic is a sum of vector pairs written side by side; it represents a linear vector function, so it is a second-order tensor in vector notation. Fluid texts written in vector style use it for stress and for products such as ρuu, ∇u and n·τ.",
  "introduced_by": "J. Willard Gibbs",
  "year": "1884",
  "first_work": "Elements of Vector Analysis, Part II (New Haven: privately printed, 1884), ch. III, 'Concerning Linear Vector Functions', arts. 106–107 (p. 53 of the 1906 Scientific Papers reprint)",
  "popularised_by": "Gibbs–Wilson, Vector Analysis (1901), chapter on linear vector functions",
  "story": "Gibbs noted that a linear function of a vector ρ can be written {αλ + βμ + etc.}.ρ, which led to the definition: \"An expression of the form αλ or βμ will be called a dyad. An expression consisting of any number of dyads united by the signs + or − will be called a dyadic binomial, trinomial, etc., as the case may be, or more briefly, a dyadic\" (source: https://archive.org/details/scientificpapers02gibbuoft, p. 53). Because any linear vector function can be written this way, he concluded that the study of such functions \"may be reduced to that of dyadics\". His 'idemfactor' I plays the role that δ_ij plays in index notation.",
  "original_form": "\\{\\alpha\\lambda + \\beta\\mu + \\mathrm{etc.}\\}.\\rho",
  "contested": "Gibbs's dyadic is in effect a second-order tensor, but he did not call it one; the physical meaning of 'tensor' came later, from Voigt (1898). Vector-style transport texts still write products such as uu side by side, which can confuse readers used to index notation.",
  "confidence": "high",
  "chapters": [
   "notation",
   "conservation"
  ],
  "sources": [
   "https://archive.org/details/scientificpapers02gibbuoft",
   "https://archive.org/details/vectoranalysiste00gibbiala",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/d/"
  ],
  "group": "vectors"
 },
 {
  "id": "heaviside-vector-algebra",
  "symbol": "bold vectors; AB (scalar product); VAB (vector product)",
  "tex": "\\mathrm{V}\\mathbf{A}\\mathbf{B}",
  "name": "Heaviside's vector algebra and bold-face (Clarendon) vectors",
  "meaning": "Heaviside's practical vector analysis for physics. Vectors are printed in heavy Clarendon type. The scalar product is written AB, with a positive sign, and the vector product VAB; he also used div and curl. Bold type for vectors is still the standard in print.",
  "introduced_by": "Oliver Heaviside",
  "year": "1886 (Clarendon type, by Heaviside's account); 1893 (book)",
  "first_work": "Electromagnetic Theory, vol. 1 (London: \"The Electrician\" Printing and Publishing Co., 1893), ch. III, \"The Elements of Vectorial Algebra and Analysis\". Heaviside dates his first use of Clarendon type for vectors to the Philosophical Magazine, August 1886.",
  "popularised_by": "Gibbs–Wilson, Vector Analysis (1901), also set vectors in Clarendon (bold) type",
  "story": "Heaviside rejected Maxwell's Fraktur letters (\"German letters must go\") and then wrote: \"Finally, I found salvation in Clarendons, and introduced the use of the kind of type so-called, I believe, for vectors (Phil. Mag., August, 1886), and have found it thoroughly suitable\" (source: https://archive.org/details/electromagnetict01heavuoft, pp. 140–141). In §102, 'Abolition of the Minus Sign of Quaternions', he called the quaternion rule that a unit vector squared is −1 \"an obtrusive stumbling-block\" for physics. He sided with Gibbs against quaternions but added: \"As regards his notation, however, I do not like it. Mine is Tait's, but simplified, and made to harmonise with Cartesians\" (same source, p. 138).",
  "original_form": "\\mathbf{A}\\mathbf{B} = AB\\cos\\theta",
  "contested": "Heaviside's AB for the scalar product and VAB for the vector product did not last; Gibbs's dot and cross did. His bold type did last. The 1886 date for Clarendon type is Heaviside's own recollection, hedged with 'I believe', and I did not check it against the 1886 paper.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/electromagnetict01heavuoft",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/v/"
  ],
  "group": "vectors"
 },
 {
  "id": "turbulent-kelvin-1887",
  "symbol": "turbulent",
  "tex": "\\mathrm{turbulent}",
  "name": "'Turbulent' as a technical term",
  "meaning": "The name for irregular, eddying, three-dimensional flow at high Reynolds number, as opposed to laminar flow.",
  "introduced_by": "William Thomson (Lord Kelvin)",
  "year": "1887",
  "first_work": "W. Thomson, 'On the propagation of laminar motion through a turbulently moving inviscid liquid', British Association Report 1887, pp. 486–495, and Philosophical Magazine (5th series) 24, no. 149 (October 1887), pp. 342–353; doi:10.1080/14786448708628110",
  "popularised_by": "Adopted slowly, per Schmitt (2017): first by relatively unknown authors from 1889 to 1903 (FitzGerald 1889, among others), then more widely around 1906–1908 (Lamb's 1906 edition, Lanchester 1907). Schmitt says the term 'became classical in the 1920s'.",
  "story": "In 1883 Reynolds described the two regimes as 'direct or sinuous' motion. Kelvin's 1887 paper opens by referring to 'turbulent motion of water' and studies an ideal fluid filled with eddies. Schmitt (2017) traces how the noun and the concept spread. Early adopters included FitzGerald (1889, 'Note on the origination of turbulent motion in viscous liquids').",
  "original_form": "",
  "contested": "Reynolds is often credited with the word. Colagrossi et al. (2021), for example, write that 'turbulence' in its modern meaning was defined only in 1883 thanks to Reynolds's experiments. The word 'turbulent' was not found in Reynolds's 1883 or 1895 papers as reprinted in Papers on Mechanical and Physical Subjects vol. 2; he wrote 'sinuous' or 'eddying'. Reynolds supplied the experiments; Kelvin supplied the word. Leonardo's 'turbolenza' is far older, but its meaning is disputed.",
  "confidence": "high",
  "chapters": [
   "turbulence",
   "notation"
  ],
  "sources": [
   "https://comptes-rendus.academie-sciences.fr/mecanique/articles/10.1016/j.crme.2017.06.003/",
   "https://doi.org/10.1080/14786448708628110",
   "https://archive.org/details/mathematicalphys0004sirw",
   "https://archive.org/details/papersonmechanic02reynrich"
  ],
  "group": "fluid"
 },
 {
  "id": "gibbs-tait-quaternion-controversy",
  "symbol": "quaternions vs vectors",
  "tex": "\\mathrm{S}\\alpha\\beta = -\\alpha\\cdot\\beta",
  "name": "The Gibbs–Tait quaternion controversy (1890–1893)",
  "meaning": "A public argument, mostly in Nature, over whether vector analysis should be built on Hamilton's quaternions or on separate dot and cross products. For physics, the system without quaternions won.",
  "introduced_by": "Peter Guthrie Tait; J. Willard Gibbs; Oliver Heaviside",
  "year": "1890–1893",
  "first_work": "Tait, preface to An Elementary Treatise on Quaternions, 3rd ed. (Cambridge University Press, 1890), p. vi. Gibbs, \"On the Rôle of Quaternions in the Algebra of Vectors\", Nature 43 (2 April 1891), 511–513. Tait, reply under the same title, Nature 43 (30 April 1891), 608. Gibbs, \"Quaternions and the Ausdehnungslehre\", Nature 44 (28 May 1891), 79–82. Gibbs, \"Quaternions and the Algebra of Vectors\", Nature 47 (16 March 1893), 463–464, and \"Quaternions and Vector Analysis\", Nature 48 (17 August 1893), 364–367.",
  "popularised_by": "Heaviside's commentary in Electromagnetic Theory vol. 1 (1893), §101 'Tait v. Gibbs and Gibbs v. Tait'",
  "story": "Tait wrote: \"Even Prof Willard Gibbs must be ranked as one of the retarders of Quaternion progress, in virtue of his pamphlet on Vector Analysis; a sort of hermaphrodite monster, compounded of the notations of Hamilton and of Grassmann\" (source: https://archive.org/details/cu31924001571094, preface, p. vi). Gibbs replied in Nature that there was \"a deeper question of notions underlying that of notations\". He added that \"it would have been less accurate to describe my production as a monstrosity, than to characterize its dress as uncouth\" (source: https://archive.org/details/scientificpapers02gibbuoft, p. 155). Heaviside, who owed much to Tait, judged that Gibbs \"has by a long way the best of the argument\" (source: https://archive.org/details/electromagnetict01heavuoft, p. 138).",
  "original_form": "",
  "contested": "'Quaternion war' is a later label. The exchange was a few prefaces and letters. Which textbooks people adopted (Heaviside 1893, Gibbs–Wilson 1901) settled the outcome more than the debate did. The attack appeared in the 1890 third edition; earlier editions predate Gibbs's pamphlet.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/cu31924001571094",
   "https://archive.org/details/scientificpapers02gibbuoft",
   "https://doi.org/10.1038/043608a0",
   "https://archive.org/details/electromagnetict01heavuoft"
  ],
  "group": "vectors"
 },
 {
  "id": "notation-big-o",
  "symbol": "O",
  "tex": "O(h^p)",
  "name": "Big-O notation",
  "meaning": "f = O(g) means |f| ≤ C|g| in the limit being considered. Numerical analysis uses it in two opposite directions. A truncation error O(Δx²) means the error shrinks like Δx² as Δx → 0. A cost of O(N³) or O(N log N) describes how work grows as N → ∞.",
  "introduced_by": "Paul Bachmann",
  "year": "1894",
  "first_work": "Die analytische Zahlentheorie (Zahlentheorie, Part 2; Leipzig: Teubner, 1894), p. 401.",
  "popularised_by": "Edmund Landau, Handbuch der Lehre von der Verteilung der Primzahlen (1909), in number theory. Donald Knuth, 'Big Omicron and big Omega and big Theta', SIGACT News 8(2) (April 1976), pp. 18–24, in computer science.",
  "story": "Bachmann wrote the sum of the divisor-counting function as n log n + O(n). He explained O(n) as a quantity whose order with respect to n does not exceed the order of n, so the O stands for Ordnung (order). Landau adopted it, and in the source notes to his 1909 Handbuch (vol. 2, p. 883) wrote that he had first found the sign O in Bachmann, p. 401.",
  "original_form": "T(n) = n\\log n + O(n)",
  "contested": "O and o are often called 'Landau symbols', but O is Bachmann's; Landau added only o. Knuth's 1976 title reads the letter as a Greek omicron. Bachmann and Landau used a Latin O tied to the German word Ordnung and never called it omicron.",
  "confidence": "high",
  "chapters": [
   "notation",
   "discretization",
   "trust",
   "solvers"
  ],
  "sources": [
   "https://archive.org/details/dieanalytischeza00bachuoft",
   "https://archive.org/details/handbuchderlehre02landuoft",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/nth/",
   "https://en.wikipedia.org/wiki/Big_O_notation"
  ],
  "group": "numerics"
 },
 {
  "id": "reynolds-decomposition",
  "symbol": "u = ū + u′",
  "tex": "u = U + u'",
  "name": "Reynolds decomposition",
  "meaning": "Splitting a turbulent velocity into a mean and a fluctuation. Averaging the Navier–Stokes equations then leaves the Reynolds stress −ρ⟨u′v′⟩, which has to be modelled. This is the basis of RANS turbulence models.",
  "introduced_by": "Osborne Reynolds",
  "year": "Read 24 May 1894; published 1895",
  "first_work": "'On the Dynamical Theory of Incompressible Viscous Fluids and the Determination of the Criterion', Philosophical Transactions of the Royal Society A 186 (1895), pp. 123–164; reprinted in Papers on Mechanical and Physical Subjects vol. 2, pp. 535–577, with the decomposition on p. 553",
  "popularised_by": "",
  "story": "Reynolds wrote (Papers vol. 2, Art. 15, https://archive.org/details/papersonmechanic02reynrich): 'Put u = ū + u′, v = v̄ + v′, w = w̄ + w′', with ū = Σ(ρu)/Σ(ρ), 'the summation extending over the space S₁ of which the centre of gravity is at the point x, y, z.' He called the two parts 'mean-mean-motion' and 'relative-mean-motion', by analogy with the molar motion and heat motion of gas theory. He used the split to estimate the critical value of his number K, by balancing the energy fed to the fluctuations against dissipation.",
  "original_form": "u=\\bar{u}+u',\\quad v=\\bar{v}+v',\\quad w=\\bar{w}+w',\\qquad \\bar{u}=\\frac{\\Sigma(\\rho u)}{\\Sigma(\\rho)}",
  "contested": "Reynolds's mean was a density-weighted average over a small region of space. It was not the time average or ensemble average of modern RANS; the density weighting resembles what is now called Favre averaging. The equation number (12) is that of the reprint.",
  "confidence": "high",
  "chapters": [
   "turbulence",
   "notation"
  ],
  "sources": [
   "https://archive.org/details/papersonmechanic02reynrich",
   "https://doi.org/10.1098/rsta.1895.0004",
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf"
  ],
  "group": "fluid"
 },
 {
  "id": "vorticity-word",
  "symbol": "vorticity",
  "tex": "\\mathrm{vorticity}",
  "name": "The word 'vorticity'",
  "meaning": "The local spin of a fluid: the curl of the velocity. Vorticity transport and stretching, the numerical loss of vorticity, and fixes such as vorticity confinement come up in both turbulence and graphics fluids.",
  "introduced_by": "Not established; in English print by the 1880s according to Wikipedia",
  "year": "By 1895 (Lamb); possibly the 1880s",
  "first_work": "Earliest use found here: Horace Lamb, Hydrodynamics (1895), Art. 312, 'a layer of fluid of uniform vorticity'",
  "popularised_by": "Later editions of Lamb's Hydrodynamics; Truesdell, The Kinematics of Vorticity (1954)",
  "story": "The word was not found in Lamb's 1879 Treatise, which speaks of rotation and vortex motion. It occurs in his 1895 Hydrodynamics, for example in Art. 312 on the instability of laminar motion: 'Suppose that a layer of fluid of uniform vorticity…' (https://archive.org/details/hydrodynamics00horarich). Wikipedia's article on Lamb says the word appears in English as early as the 1880s, for example in the Philosophical Magazine, but gives no specific citation.",
  "original_form": "",
  "contested": "Truesdell (1954) credited Lamb with coining the word. Wikipedia's article on Lamb says this attribution is 'now known to be erroneous'. In any case, a date tied to a later edition of Hydrodynamics (such as the 1916 fourth edition) is too late, since the 1895 edition already uses the word. The actual coiner was not established, and the 1880s uses were not checked directly.",
  "confidence": "medium",
  "chapters": [
   "notation",
   "turbulence",
   "stable-fluids"
  ],
  "sources": [
   "https://archive.org/details/hydrodynamics00horarich",
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://en.wikipedia.org/wiki/Horace_Lamb"
  ],
  "group": "fluid"
 },
 {
  "id": "grad-gradient",
  "symbol": "grad, gradient",
  "tex": "\\mathrm{grad}\\,\\phi = \\nabla\\phi",
  "name": "'grad' and 'gradient' for ∇φ",
  "meaning": "The gradient is the vector of partial derivatives. It points in the direction of steepest increase, and its length is that rate of increase. In fluids, −∇p is the pressure force per unit volume.",
  "introduced_by": "Heinrich Weber, who used the German 'Gradient' and the symbol 'grad' in his 1900 edition of Riemann's lectures on mathematical physics (per Cajori, confirmed in the book). The English word 'gradient' in the vector sense became current only in the early 1900s.",
  "year": "1900",
  "first_work": "H. Weber, Die partiellen Differential-Gleichungen der mathematischen Physik nach Riemann's Vorlesungen, 4th ed., vol. 1 (Braunschweig: Vieweg, 1900; preface dated Strassburg, June 1900), §88 'Der Gradient eines Skalars', pp. 212–214",
  "popularised_by": "E. B. Wilson, Vector Analysis (1901), who mentions 'gradient' and 'slope' but prefers 'derivative'. Per Miller, Wilson's Advanced Calculus (1912) gives the gradient and 'grad' more attention.",
  "story": "The operation had several names before 'gradient' won. Maxwell called ∇P the 'slope' (1871, 1873), and the 1881 edition of his Treatise changed this to 'space-variation'. Gibbs (1881) called ∇u the 'derivative' of u. Maxwell noted that Lamé had called its magnitude the 'first differential parameter'. In §88 of his 1900 volume Weber defined a vector from the steepest fall ('Gefälle') of a scalar S, wrote that this vector \"nennen wir den Gradienten von S\", and denoted it grad S. The preceding section, §87, uses 'Curl' and 'div'. Wilson's 1901 textbook says: \"The terms gradient and slope of V are also used for ∇V\" (source: https://archive.org/details/vectoranalysiste00gibbiala, p. 138). Per Miller, Horace Lamb had used 'gradient' in 1897 for the slope of a curve, and the OED's earliest English quotation for the vector sense is J. G. Coffin, Vector Analysis (1909).",
  "original_form": "\\mathfrak{G} = \\mathrm{grad}\\,S ; \\; G_x = -\\frac{\\partial S}{\\partial x} ; \\; \\mathrm{div}\\,\\mathrm{grad}\\,S = -\\Delta S",
  "contested": "Weber's first 'grad' has the opposite sign from today's. He defined it from the downhill slope, with components G_x = −∂S/∂x, and wrote div grad S = −ΔS (vol. 1, pp. 213–214), so it points the same way as Maxwell's 'slope'. The DSB and some sale catalogues say Maxwell introduced 'gradient' in 1870. Miller rejects this, and Maxwell's own 1871 paper and 1873 Treatise say 'slope'. Stein and Barcellos claim Hamilton wrote the gradient as Δ in 1846, but David Wilkins has never seen this in Hamilton's publications (per Miller). Earlier German uses of 'grad' may exist; 1900 is the earliest known to Cajori. An earlier draft of this record quoted Wilson as writing '∇F'; the scalar in his text is V.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/diepartiellendi03riemgoog",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/g/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/vectoranalysiste00gibbiala"
  ],
  "group": "vectors"
 },
 {
  "id": "ricci-levi-civita-1900",
  "symbol": "X_rs (covariant), X^rs (contravariant)",
  "tex": "X_{rs}, X^{rs}",
  "name": "Ricci-Curbastro and Levi-Civita, 'absolute differential calculus' (1900)",
  "meaning": "Tensor calculus. Its objects are indexed quantities, which the authors called 'systems', that change in a fixed way when coordinates change. Lower indices mark covariant behaviour and upper indices contravariant. The paper also set out sums, products, contraction ('composition') and covariant derivatives.",
  "introduced_by": "Gregorio Ricci-Curbastro and Tullio Levi-Civita",
  "year": "1900",
  "first_work": "\"Méthodes de calcul différentiel absolu et leurs applications\", Mathematische Annalen 54 (issue 1–2, March 1900), 125–201",
  "popularised_by": "Einstein, 'Die Grundlage der allgemeinen Relativitätstheorie' (1916). Levi-Civita's lectures, published in English in 1926 as The Absolute Differential Calculus (Calculus of Tensors) (per Miller).",
  "story": "Ricci had developed the method since the 1880s; a footnote in the memoir cites his 1888 Padua paper 'Delle derivazioni covarianti e controvarianti'. The 1900 memoir, written in French, built on the work of Gauss, Riemann and Christoffel. It set out covariant and contravariant systems and applied them to geometry and physics, including vector analysis in general coordinates. It never uses the word 'tensor'. Einstein adopted their index placement: \"Im Anschluß an Ricci und Levi-Civita wird der kontravariante Charakter durch oberen, der kovariante durch unteren Index bezeichnet\" (source: https://www.nssp.uni-saarland.de/lehre/Vorlesung/Kernphysik_SS19/History/Papers/Einstein_2.pdf, p. 782).",
  "original_form": "",
  "contested": "Some sources date the memoir 1900 and others 1901 (Miller gives 1901), because volume 54 runs into 1901 and the bound volume is dated 1901. Crossref dates the issue that contains the memoir to March 1900. The paper names the first author 'M. M. G. Ricci'; Ricci-Curbastro is his full surname. An earlier draft of this record called the 1888 citation the memoir's 'first footnote'; it is not the first.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/sim_mathematische-annalen_1901_54",
   "https://doi.org/10.1007/BF01454201",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/t/",
   "https://www.nssp.uni-saarland.de/lehre/Vorlesung/Kernphysik_SS19/History/Papers/Einstein_2.pdf"
  ],
  "group": "vectors"
 },
 {
  "id": "levi-civita-symbol",
  "symbol": "ε_ijk",
  "tex": "\\epsilon_{ijk}",
  "name": "Levi-Civita (permutation) symbol",
  "meaning": "ε_ijk is +1 for an even permutation of (1,2,3), −1 for an odd one, and 0 if any index repeats. It writes cross products and curls in index form: (a×b)_i = ε_ijk a_j b_k, and vorticity ω_i = ε_ijk ∂u_k/∂x_j.",
  "introduced_by": "Gregorio Ricci-Curbastro and Tullio Levi-Civita, as their 'système E'",
  "year": "1900",
  "first_work": "\"Méthodes de calcul différentiel absolu et leurs applications\", Mathematische Annalen 54 (1900), ch. I, §3, p. 135",
  "popularised_by": "Later tensor-calculus and continuum-mechanics texts, which attached Levi-Civita's name (I have not checked who first did so, or when)",
  "story": "Ricci and Levi-Civita defined a system of order n whose elements are zero unless all indices differ. Otherwise each element equals +√a or −√a according as the permutation of indices is even or odd relative to (1, 2, …, n), where a is the determinant of the metric. The elements of the reciprocal (contravariant) system are 0 or ±1/√a. They named these the 'système covariant (ou contrevariant) E' and used it to show that the Jacobian is an invariant. The next section, §4, applies the method to vector analysis in general coordinates. In Cartesian coordinates a = 1, and the system reduces to the familiar ±1, 0 symbol.",
  "original_form": "\\epsilon_{r_1 r_2 \\ldots r_n} = \\pm\\sqrt{a}",
  "contested": "Attaching a sign to a permutation is much older; it goes back to the theory of determinants. The new step in 1900 was to treat the array as a covariant system. Strictly, the 1900 object (with √a) is the Levi-Civita tensor, while the pure ±1 'symbol' is a tensor density. I did not trace when the name 'Levi-Civita symbol' became standard.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/sim_mathematische-annalen_1901_54",
   "https://doi.org/10.1007/BF01454201"
  ],
  "group": "vectors"
 },
 {
  "id": "gibbs-wilson-1901",
  "symbol": "A·B, A×B, ∇·V, ∇×V, 'del'",
  "tex": "\\mathbf{A}\\cdot\\mathbf{B}, \\nabla\\cdot\\mathbf{V} = \\mathrm{div}\\,\\mathbf{V}",
  "name": "Gibbs–Wilson Vector Analysis (1901)",
  "meaning": "The textbook that set modern English vector notation: bold vectors, the centred dot and the cross, ∇· and ∇× read 'del dot' and 'del cross', and div and curl.",
  "introduced_by": "Edwin Bidwell Wilson, from J. Willard Gibbs's lectures",
  "year": "1901",
  "first_work": "Vector Analysis: A Text-Book for the Use of Students of Mathematics and Physics, Founded upon the Lectures of J. Willard Gibbs (New York: Charles Scribner's Sons, 1901; Yale Bicentennial Publications; the title page verso reads 'Published, December, 1901')",
  "popularised_by": "Its own reprints (e.g. 1909) and its wide use as a textbook",
  "story": "Gibbs was busy with his Elementary Principles in Statistical Mechanics for the same series. Wilson, who had attended his 1899–1900 course, wrote the book with Gibbs's approval; Gibbs's preface is dated September 1901. Wilson set vectors in Clarendon type and wrote A·B: \"This is read A dot B and therefore may often be called the dot product instead of the direct product.\" Of A×B he wrote: \"read A cross B. For this reason it is often called the cross product.\" He named ∇ 'del', wrote ∇·V = div V and ∇×V = curl V, and credited the name curl to Maxwell. All quotes are from https://archive.org/details/vectoranalysiste00gibbiala, pp. 55, 61, 138, 150 and 155.",
  "original_form": "\\mathbf{A}\\cdot\\mathbf{B} ; \\mathbf{A}\\times\\mathbf{B} ; \\nabla\\cdot\\mathbf{V} = \\mathrm{div}\\,\\mathbf{V} ; \\nabla\\times\\mathbf{V} = \\mathrm{curl}\\,\\mathbf{V}",
  "contested": "Miller's 'cross product' entry dates the term to the 1909 Scribner's printing, but the 1901 first edition already has it on p. 61. Stein and Barcellos (via Miller) call this book the first printed use of 'del'; I did not test that claim. An earlier draft of this record put the 'dot product' sentence on p. 56; it is on p. 55.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://archive.org/details/vectoranalysiste00gibbiala",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/d/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/c/"
  ],
  "group": "vectors"
 },
 {
  "id": "navier-stokes-name",
  "symbol": "Navier–Stokes",
  "tex": "\\mathrm{Navier-Stokes}",
  "name": "The name 'Navier–Stokes equations'",
  "meaning": "The standard name for the viscous equations of motion. It pairs Navier (1822) and Stokes (1845) and leaves out Cauchy, Poisson and Saint-Venant, who also derived the equations.",
  "introduced_by": "Not established",
  "year": "Unknown; apparently after 1904",
  "first_work": "",
  "popularised_by": "",
  "story": "Neither man used the name. Lamb's 1879 Treatise says the viscous equations 'have been obtained by Navier, Cauchy, Poisson, and others', and that the continuum method 'seems due in principle to de Saint-Venant and Stokes'. His 1895 Hydrodynamics credits 'Navier and Poisson' and then 'de Saint-Venant and Stokes'. Neither edition pairs the two names. Prandtl's 1904 boundary-layer paper gives the viscous equation in Gibbs's vector notation and names no one for it. Bistafa (2024) suggests that Stokes became attached to the equation because he compared it carefully with experiments, but this is an interpretation, not a record of who coined the name.",
  "original_form": "",
  "contested": "The name hides a priority story. Navier, Cauchy, Poisson, Saint-Venant and Stokes each derived the equations, which Darrigol (2002) calls the first five 'births' of the equation. Who first used the double name, and when, was not found. An earlier draft cited Google Books Ngram dates (German forms from about 1908–1910); Ngram returns scattered hits even before 1900, which shows its early dates are unreliable, so those dates have been removed.",
  "confidence": "low",
  "chapters": [
   "notation",
   "conservation"
  ],
  "sources": [
   "https://archive.org/details/maththeorfluid00lambrich",
   "https://archive.org/details/hydrodynamics00horarich",
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf",
   "https://arxiv.org/pdf/2401.13669"
  ],
  "group": "fluid"
 },
 {
  "id": "boundary-layer",
  "symbol": "boundary layer (Grenzschicht)",
  "tex": "\\delta",
  "name": "Boundary layer (Grenzschicht, Übergangsschicht)",
  "meaning": "The thin layer next to a wall where viscosity matters even at high Reynolds number. For laminar flow its thickness shrinks like Re^(−1/2). Resolving it forces stretched grids, wall functions and stiff time steps in simulations.",
  "introduced_by": "Ludwig Prandtl",
  "year": "Presented 1904 (Third International Congress of Mathematicians, Heidelberg); published 1905",
  "first_work": "'Über Flüssigkeitsbewegung bei sehr kleiner Reibung', Verhandlungen des III. Internationalen Mathematiker-Kongresses, Heidelberg 1904 (Leipzig: Teubner, 1905), pp. 484–491",
  "popularised_by": "Prandtl and his Göttingen school. Prandtl's Tragflügeltheorie I (1918) puts „Grenzschicht“ in quotation marks as a named concept.",
  "story": "Prandtl split a high-Reynolds-number flow into an almost frictionless outer flow and a thin layer at the wall where friction acts. He explained flow separation as this layer leaving the wall. In the 1904 paper he mostly called it the 'Übergangsschicht' (transition layer), as in 'In der schmalen Übergangsschicht…'. He used 'Grenzschicht' once, for the region where fluid meets solid: 'in der Grenzschicht zwischen Flüssigkeit und festem Körper'. 'Grenzschicht', translated as 'boundary layer', became the standard term. The quotes are from the 1927 facsimile reprint in Vier Abhandlungen zur Hydrodynamik und Aerodynamik (https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf).",
  "original_form": "",
  "contested": "The paper is often said to have introduced 'Grenzschicht' as its key term, but 'Übergangsschicht' is the main word in it. Citations give 1904 (lecture) or 1905 (proceedings). Who first wrote 'boundary layer' in English was not established.",
  "confidence": "high",
  "chapters": [
   "notation",
   "similarity",
   "turbulence"
  ],
  "sources": [
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf",
   "https://germanhistory-intersections.org/en/knowledge-and-education/ghis:document-202"
  ],
  "group": "fluid"
 },
 {
  "id": "reynolds-number-name",
  "symbol": "Reynolds number",
  "tex": "\\mathrm{Re} = \\frac{\\rho U L}{\\mu} = \\frac{U L}{\\nu}",
  "name": "Reynolds number (the name)",
  "meaning": "The ratio of inertial to viscous effects. It decides whether flow is laminar or turbulent, how thin boundary layers are, and how fine a grid must be: a 3D direct simulation needs roughly Re^(9/4) grid points.",
  "introduced_by": "Arnold Sommerfeld named it; Osborne Reynolds identified the parameter.",
  "year": "1908 (Sommerfeld, presented at the 4th International Congress of Mathematicians, Rome); parameter used by Reynolds 1883 and 1895",
  "first_work": "Sommerfeld, 'Ein Beitrag zur hydrodynamischen Erklärung der turbulenten Flüssigkeitsbewegungen', Atti del IV Congresso Internazionale dei Matematici (Rome 1908), vol. 3, pp. 116–124",
  "popularised_by": "Prandtl (1910, 1913) and Blasius (1912, 1913) used the name. Moritz Weber's 1919 treatise began the wider habit of naming dimensionless numbers after people.",
  "story": "Stokes noted the similarity property of his equations in 1850. Reynolds's pipe experiments (read 15 March 1883; Phil. Trans. 174, pp. 935–982) showed that transition depends on a single combination of speed, size and viscosity. In 1895 Reynolds used the number explicitly, called it K, based it on the pipe diameter, and gave a critical value 'between 1900 and 2000'. In his 1908 stability paper, the source of the Orr–Sommerfeld equation, Sommerfeld introduced R as 'eine reine Zahl, die wir die Reynolds'sche Zahl nennen wollen' (quoted by Rott 1990, https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf). In 1913 Prandtl wrote that the number 'wird nach dem Entdecker dieses Ähnlichkeitsgesetzes, Osborne Reynolds, die Reynolds'sche Zahl genannt'.",
  "original_form": "K\\ (1895),\\quad R\\ (1908)",
  "contested": "Sommerfeld's naming was forgotten until von Kármán (1954) pointed it out. Rott himself (1985) wrongly credited Prandtl and corrected this in 1990. Rayleigh (1913) credited Stokes (1850) with the similarity idea before Reynolds. The printing year of the Rome proceedings (probably 1909) was not checked.",
  "confidence": "high",
  "chapters": [
   "similarity",
   "notation",
   "turbulence"
  ],
  "sources": [
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
   "https://archive.org/details/papersonmechanic02reynrich",
   "https://doi.org/10.1098/rstl.1883.0029"
  ],
  "group": "numbers"
 },
 {
  "id": "notation-little-o",
  "symbol": "o",
  "tex": "o(g(x))",
  "name": "Little-o notation",
  "meaning": "f = o(g) means f/g → 0 in the limit. A scheme is consistent if its truncation error is o(1) as the grid is refined, meaning it goes to zero, however slowly.",
  "introduced_by": "Edmund Landau",
  "year": "1909",
  "first_work": "Handbuch der Lehre von der Verteilung der Primzahlen (Leipzig: Teubner, 1909), vol. 1, §12 'Bezeichnungen' (from p. 59); source note in vol. 2, p. 883.",
  "popularised_by": "Landau's Handbuch and his later number-theory books, through which O and o became known together as the Landau symbols.",
  "story": "In his source note Landau says the sign o(g(x)) he adds corresponds to what he had previously written {g(x)} in his papers. He paired it with Bachmann's O, which he had found in Bachmann's 1894 book. Narkiewicz's history of prime number theory (quoted on Miller's page) likewise dates the first o to Landau (1909).",
  "original_form": "o(g(x)) \\quad (\\text{earlier: } \\{g(x)\\})",
  "contested": "The companion symbols came later and have changed meaning. Hardy and Littlewood introduced Ω in 1914, and Knuth redefined Ω and introduced Θ in 1976, so older and newer texts can mean different things by Ω.",
  "confidence": "high",
  "chapters": [
   "notation",
   "discretization",
   "trust"
  ],
  "sources": [
   "https://archive.org/details/handbuchderlehre01landuoft",
   "https://archive.org/details/handbuchderlehre02landuoft",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/nth/",
   "https://en.wikipedia.org/wiki/Big_O_notation"
  ],
  "group": "numerics"
 },
 {
  "id": "knudsen-number",
  "symbol": "Kn",
  "tex": "\\mathrm{Kn} = \\frac{\\lambda}{L}",
  "name": "Knudsen number",
  "meaning": "The mean free path of the molecules divided by a flow length scale. A small Kn justifies the continuum hypothesis behind the Navier–Stokes equations. A large Kn calls for kinetic or particle methods such as the Boltzmann equation or DSMC. Lattice Boltzmann methods borrow the same kinetic picture.",
  "introduced_by": "Named after Martin Knudsen (1871–1949); who named it was not established",
  "year": "Unknown (name); Knudsen's molecular-flow paper 1909",
  "first_work": "Knudsen, 'Die Gesetze der Molekularströmung und der inneren Reibungsströmung der Gase durch Röhren', Annalen der Physik (4th series) 28 (= vol. 333), pp. 75–130 (1909); doi:10.1002/andp.19093330106",
  "popularised_by": "",
  "story": "Knudsen, a Danish physicist, studied gases so rarefied that molecules hit the walls more often than each other, where ordinary viscous-flow theory fails. His 1909 paper treats the laws of this molecular flow, and of ordinary viscous flow, of gases through tubes. The number measures how close a flow is to the molecular regime.",
  "original_form": "",
  "contested": "The year of naming and the person who chose the name were not established. The 1909 paper is confirmed bibliographically but its contents were not read here.",
  "confidence": "medium",
  "chapters": [
   "continuum",
   "similarity",
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1002/andp.19093330106",
   "https://en.wikipedia.org/wiki/Martin_Knudsen",
   "https://en.wikipedia.org/wiki/Knudsen_number"
  ],
  "group": "numbers"
 },
 {
  "id": "prandtl-number",
  "symbol": "Pr",
  "tex": "\\mathrm{Pr} = \\frac{\\nu}{\\alpha}",
  "name": "Prandtl number",
  "meaning": "The ratio of momentum diffusivity to thermal diffusivity: about 0.7 for air and about 7 for water near room temperature. It sets the relative thickness of the velocity and thermal boundary layers, and so how fine a grid a heat-transfer simulation needs.",
  "introduced_by": "Ludwig Prandtl used the parameter (1910); the origin of the name was not established.",
  "year": "1910",
  "first_work": "Prandtl, 'Eine Beziehung zwischen Wärmeaustausch und Strömungswiderstand der Flüssigkeiten', Physikalische Zeitschrift 11 (1910), pp. 1072–1078",
  "popularised_by": "Nusselt (1915) identified it as one of the groups governing convective heat transfer.",
  "story": "In 1910 Prandtl extended Reynolds's analogy between heat transfer and friction. That analogy holds exactly only when momentum and heat diffuse at the same rate, and the ratio of the two diffusivities is the number later named for him. The same paper refers to 'die in der Hydrodynamik bekannte Reynolds'sche Zahl' (quoted by Rott 1990).",
  "original_form": "",
  "contested": "Who named it after Prandtl, and when, was not established. The 1910 paper's bibliographic details are confirmed by Rott (1990), but its treatment of the diffusivity ratio was not read directly.",
  "confidence": "medium",
  "chapters": [
   "similarity"
  ],
  "sources": [
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
   "https://en.wikipedia.org/wiki/Nusselt_number",
   "https://en.wikipedia.org/wiki/Prandtl_number"
  ],
  "group": "numbers"
 },
 {
  "id": "nusselt-number",
  "symbol": "Nu",
  "tex": "\\mathrm{Nu} = \\frac{h L}{k}",
  "name": "Nusselt number",
  "meaning": "A dimensionless heat-transfer coefficient: convective heat flux compared with pure conduction across the same length.",
  "introduced_by": "Wilhelm Nusselt identified the group (1915); the VDI gave it his name (announced 1931).",
  "year": "1915; name 1931",
  "first_work": "Nusselt, 'Das Grundgesetz des Wärmeüberganges', Gesundheits-Ingenieur 38 (1915), nos. 42–43, pp. 477–482, 490–496",
  "popularised_by": "VDI naming, announced by Max Jakob in Z. VDI 75 (1931), pp. 969–971",
  "story": "Nusselt applied dimensional analysis to convective heat transfer in 1915. He identified the groups now called the Nusselt, Grashof, Prandtl and Reynolds numbers. A follow-up paper on forced convection, 'Der Wärmeübergang im Rohr', appeared in Z. VDI 61 (1917), pp. 685–689. The VDI (Association of German Engineers) later formally adopted the name 'Nusselt number'.",
  "original_form": "",
  "contested": "The 1931 VDI naming and the bibliographic details are reported by Wikipedia from Jakob's notice; the notice itself was not read here.",
  "confidence": "medium",
  "chapters": [
   "similarity"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Nusselt_number"
  ],
  "group": "numbers"
 },
 {
  "id": "einstein-summation-1916",
  "symbol": "a_i b_i (Σ implied)",
  "tex": "\\frac{\\partial u_i}{\\partial x_i} = 0",
  "name": "Einstein summation convention",
  "meaning": "An index that appears twice in one term is summed over its range. In fluids, ∂u_i/∂x_i = 0 is the incompressibility condition and u_j ∂u_i/∂x_j is the advection term.",
  "introduced_by": "Albert Einstein",
  "year": "1916",
  "first_work": "\"Die Grundlage der allgemeinen Relativitätstheorie\", Annalen der Physik (4th series) 49 (1916), 769–822 (vol. 354 in the continuous numbering); §5, p. 781; received 20 March 1916",
  "popularised_by": "The general-relativity literature, and later continuum- and fluid-mechanics texts that use index notation",
  "story": "Einstein observed that in his formulas the sums always ran over indices that appeared twice under a summation sign, and only over those. The summation signs could therefore be dropped without loss of clarity. He then stated the rule: \"Tritt ein Index in einem Term eines Ausdruckes zweimal auf, so ist über ihn stets zu summieren, wenn nicht ausdrücklich das Gegenteil bemerkt ist\" (source: https://www.nssp.uni-saarland.de/lehre/Vorlesung/Kernphysik_SS19/History/Papers/Einstein_2.pdf, p. 781). In English: if an index occurs twice in one term of an expression, it is always summed over unless the contrary is expressly stated (our translation). He presented it only as a remark, headed 'Bemerkung zur Vereinfachung der Schreibweise der Ausdrücke' (remark on simplifying the writing of expressions).",
  "original_form": "",
  "contested": "A popular anecdote has Einstein joking to a friend that this was a great discovery in mathematics. It does have a source, but a late and secondhand one: a 1956 recollection by Louis Kollros ('Albert Einstein en Suisse: Souvenirs', Helv. Phys. Acta Suppl. 4), retold by Abraham Pais in Subtle is the Lord (1982, p. 216), as cited by MathWorld. I did not see either text, so the joke should not be quoted as Einstein's own words. An earlier draft of this record said no source existed. I did not check whether other authors used similar shortcuts before 1916.",
  "confidence": "high",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://www.nssp.uni-saarland.de/lehre/Vorlesung/Kernphysik_SS19/History/Papers/Einstein_2.pdf",
   "https://doi.org/10.1002/andp.19163540702",
   "https://mathworld.wolfram.com/EinsteinSummation.html"
  ],
  "group": "vectors"
 },
 {
  "id": "rayleigh-number",
  "symbol": "Ra",
  "tex": "\\mathrm{Ra} = \\frac{g \\beta \\Delta T L^3}{\\nu \\alpha}",
  "name": "Rayleigh number",
  "meaning": "The Grashof number times the Prandtl number: the control parameter for convection in a layer heated from below. Above a critical value (about 1708 between rigid plates) the fluid starts to overturn in cells.",
  "introduced_by": "Lord Rayleigh did the analysis (1916); who named the number was not established.",
  "year": "1916",
  "first_work": "Rayleigh, 'On convection currents in a horizontal layer of fluid, when the higher temperature is on the under side', Philosophical Magazine (6th series) 32, no. 192, pp. 529–546 (December 1916); doi:10.1080/14786441608635602",
  "popularised_by": "Chandrasekhar, Hydrodynamic and Hydromagnetic Stability (1961)",
  "story": "Rayleigh analysed the convection cells that Bénard had seen in thin heated layers in 1900. Using linear stability theory, he showed that convection starts when one combination of gravity, thermal expansion, temperature difference, depth, viscosity and thermal diffusivity passes a critical value. For his idealised free boundaries that value is 27π⁴/4 ≈ 657.5.",
  "original_form": "",
  "contested": "Bénard's cells were later shown to be driven mainly by surface tension (the Marangoni effect), not buoyancy; Pearson (1958, J. Fluid Mech. 4, pp. 489–500) reworked the problem with surface tension. So Rayleigh's theory did not explain the experiment that motivated it. Who named the number was not traced, and Chandrasekhar's role in spreading it was not checked.",
  "confidence": "medium",
  "chapters": [
   "similarity",
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1080/14786441608635602",
   "https://en.wikipedia.org/wiki/Rayleigh%E2%80%93B%C3%A9nard_convection",
   "https://doi.org/10.1017/S0022112058000616",
   "https://en.wikipedia.org/wiki/Rayleigh_number"
  ],
  "group": "numbers"
 },
 {
  "id": "weber-number",
  "symbol": "We",
  "tex": "\\mathrm{We} = \\frac{\\rho U^2 L}{\\sigma}",
  "name": "Weber number",
  "meaning": "The ratio of inertia to surface tension. It governs droplet breakup, splashing and bubble deformation, which are the regimes where free-surface and multiphase solvers hit capillary time-step limits.",
  "introduced_by": "Moritz Weber (1871–1951) introduced the group; it was named after him later.",
  "year": "1919",
  "first_work": "Moritz Weber's treatise on similarity and model testing, Jahrbuch der Schiffbautechnischen Gesellschaft (1919)",
  "popularised_by": "",
  "story": "Weber was Professor of Naval Architecture in Berlin. Rott (1990, https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf) writes: \"As noted by Rouse & Ince, Weber not only put the Reynolds number to use but also introduced the Froude number and a new number involving capillarity, which later was named for him. This was apparently the beginning of a new era in the use of names for nondimensional numbers.\"",
  "original_form": "",
  "contested": "Who first called the capillarity number the 'Weber number' was not established. The full title of Weber's 1919 paper was not checked.",
  "confidence": "medium",
  "chapters": [
   "similarity"
  ],
  "sources": [
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
   "https://en.wikipedia.org/wiki/Weber_number"
  ],
  "group": "numbers"
 },
 {
  "id": "richardson-number",
  "symbol": "Ri",
  "tex": "\\mathrm{Ri} = \\frac{N^2}{(\\partial u/\\partial z)^2}",
  "name": "Richardson number",
  "meaning": "The ratio of stabilising stratification (the buoyancy frequency squared) to destabilising shear. Ri < 1/4 somewhere in the flow is a necessary condition for a stratified shear flow to become unstable; atmosphere and ocean models use Ri to switch turbulent mixing on and off.",
  "introduced_by": "Named after Lewis Fry Richardson (1881–1953); who named it was not established",
  "year": "c. 1920 (Richardson's work on atmospheric eddies)",
  "first_work": "Usually traced to Richardson, 'The supply of energy from and to atmospheric eddies', Proc. R. Soc. Lond. A 97, no. 686, pp. 354–373 (1920); doi:10.1098/rspa.1920.0039 (bibliographic details confirmed; contents not read)",
  "popularised_by": "",
  "story": "Richardson asked when turbulence in a stratified atmosphere can draw enough energy from wind shear to work against buoyancy. He is also remembered for the first numerical weather forecast, computed by hand and published in Weather Prediction by Numerical Process (1922), and for the picture of an energy cascade through ever smaller eddies.",
  "original_form": "",
  "contested": "MacTutor and Wikipedia confirm only that the number is named after him. That the 1920 paper is where the criterion first appears was not confirmed by reading it, and the naming date was not found. The 1/4 criterion (Miles 1961 and Howard 1961, J. Fluid Mech. 10, pp. 496–508 and 509–512) is a necessary condition for instability, not a guarantee of turbulence.",
  "confidence": "low",
  "chapters": [
   "similarity",
   "turbulence"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Richardson/",
   "https://doi.org/10.1098/rspa.1920.0039",
   "https://doi.org/10.1017/S0022112061000305",
   "https://en.wikipedia.org/wiki/Richardson_number"
  ],
  "group": "numbers"
 },
 {
  "id": "grashof-number",
  "symbol": "Gr",
  "tex": "\\mathrm{Gr} = \\frac{g \\beta \\Delta T L^3}{\\nu^2}",
  "name": "Grashof number",
  "meaning": "The ratio of buoyancy to viscous forces in natural convection. It plays the role of Re² for flows driven by temperature differences.",
  "introduced_by": "Heinrich Gröber proposed the name (according to Max Jakob), after Franz Grashof (1826–1893).",
  "year": "About 1921 (name)",
  "first_work": "The group appears in Nusselt's 1915 analysis of heat transfer, before it had this name.",
  "popularised_by": "Max Jakob, Heat Transfer vol. I (1949)",
  "story": "Grashof was a German engineering professor. According to Sander & Holman (1972), as summarised by Wikipedia, the name was an honour that did not reflect research he had done on the topic. Jakob wrote (Heat Transfer I, 1949, p. 486, as quoted on https://en.wikipedia.org/wiki/Franz_Grashof): \"The present author does not know why Groeber suggested the name of Grashof for this dimensionless group.\"",
  "original_form": "",
  "contested": "According to Wikipedia, citing Sander & Holman (1972, Int. J. Heat Mass Transfer 15, pp. 562–563), the name was given around 1921, 28 years after Grashof's death. Why Gröber chose Grashof is unknown. The group itself is older than its name. Jakob's sentence is quoted from Wikipedia and was not checked against his book.",
  "confidence": "medium",
  "chapters": [
   "similarity"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Grashof_number",
   "https://en.wikipedia.org/wiki/Franz_Grashof"
  ],
  "group": "numbers"
 },
 {
  "id": "cfl-condition",
  "symbol": "CFL",
  "tex": "\\frac{|c|\\,\\Delta t}{\\Delta x} \\le 1",
  "name": "Courant–Friedrichs–Lewy (CFL) condition",
  "meaning": "The numerical domain of dependence of a scheme must contain the physical domain of dependence. Otherwise the scheme cannot converge, because it never sees the data that determine the true solution. For explicit schemes for advection or waves this caps Δt at about Δx/|c|; the exact constant depends on the scheme.",
  "introduced_by": "Richard Courant, Kurt Otto Friedrichs and Hans Lewy",
  "year": "1928 (submitted 1 September 1927; Math. Ann. 100); English translation 1967",
  "first_work": "R. Courant, K. Friedrichs, H. Lewy, 'Über die partiellen Differenzengleichungen der mathematischen Physik', Math. Ann. 100 (1928) 32–74. English translation by Phyllis Fox, first issued as AEC Report NYO-7689, then IBM J. Res. Dev. 11 (March 1967) 215–234.",
  "popularised_by": "Charney, Fjørtoft and von Neumann (1950), an early printed use of the name 'Courant-Friedrichs-Lewy condition'; Lax and Richtmyer (1956); Richtmyer and Morton (1967)",
  "story": "In 1928 Courant, Friedrichs and Lewy used finite differences as a tool for proving existence theorems: 'Nowhere do we assume the existence of the solution to the differential equation problem—on the contrary, we obtain a simple existence proof by using the limiting process.' For hyperbolic problems they found that 'convergence is obtained only if the ratio of the mesh widths in different directions satisfies certain inequalities which in turn depend on the position of the characteristics relative to the mesh.' At wartime Los Alamos, Rudolf Peierls found the restriction again by experiment, and Morgan and Archer report that 'By 1945 Los Alamos was referring to it as the Courant condition.' Charney, Fjørtoft and von Neumann (1950) noted that integrating the full (Eulerian) forecast equations would need the 'space and time increments in the finite difference equations' to be 'chosen to satisfy the Courant-Friedrichs-Lewy condition (1928) for the computational stability of the equation governing the motion of long gravity waves'. The time-step limit this imposes was one of their reasons for integrating the filtered barotropic vorticity equation instead.",
  "original_form": "L(u)=\\frac{1}{h^2}(u_1-2u_0+u_3)-\\frac{1}{k^2h^2}(u_2-2u_0+u_4)=0,\\ \\ k \\ge 1",
  "contested": "The condition is often presented as a stability rule invented for computers. The 1928 paper predates electronic computers and concerns convergence in an existence proof. Los Alamos used other names first. Morgan and Archer write that 'Peierls clearly did not know about the Courant stability condition, he re-discovered it empirically', that staff at first called it the 'Peierls' stability condition, and that 'Skyrme terms it the ’L-condition’ in his report.' The condition is necessary, not sufficient. Lax (2013): 'The CFL condition is only a necessary condition for the convergence of difference schemes.' His example, forward time differences with centred space differences for u_t + u_x = 0, diverges however small the time step. It is also wrong to say that Charney et al. chose their increments to satisfy the CFL condition. They cited it as a reason not to integrate the primitive equations. Fully implicit schemes satisfy the condition automatically, because every grid point influences every other within one step.",
  "confidence": "high",
  "chapters": [
   "discretization",
   "advection",
   "trust"
  ],
  "sources": [
   "https://web.stanford.edu/class/cme324/classics/courant-friedrichs-lewy.pdf",
   "https://faculty.eas.ualberta.ca/jdwilson/EAS372_13/Charney_etal50.pdf",
   "https://arxiv.org/abs/2103.06249",
   "https://doi.org/10.1007/978-0-8176-8394-8_1"
  ],
  "group": "numerics"
 },
 {
  "id": "courant-number",
  "symbol": "ν = cΔt/Δx",
  "tex": "\\nu = \\frac{c\\,\\Delta t}{\\Delta x}",
  "name": "Courant number (CFL number)",
  "meaning": "A dimensionless ratio: the number of grid cells a signal moving at speed c crosses in one time step. Explicit schemes typically need |ν| ≤ 1 (or a smaller scheme-specific bound). Implicit schemes may run at ν ≫ 1 and stay stable, though not always accurate.",
  "introduced_by": "Named after Richard Courant (of Courant, Friedrichs and Lewy 1928). The person who coined the term was not identified.",
  "year": "condition 1928; the term 'Courant number' in print by 1967 (earliest found here)",
  "first_work": "Earliest use of the term found here: R. D. Richtmyer and K. W. Morton, Difference Methods for Initial-Value Problems, 2nd ed. (1967), p. 324",
  "popularised_by": "Richtmyer and Morton (1967); van Leer (2006), who calls ν 'the CFL number'",
  "story": "The 1928 paper stated the condition as a mesh ratio and did not name the ratio: the time step was h, the space step kh, and convergence required k ≥ 1. In a shock-hydrodynamics section, Richtmyer and Morton (1967) note that 'L₁ is often called the \"Courant number.\"' The words 'often called' show the name was already in use by then. Van Leer (2006) writes ν for the same quantity: 'here ν is the CFL number.'",
  "original_form": "k \\ge 1\\ \\ (\\mathrm{time\\ step}\\ h,\\ \\mathrm{space\\ step}\\ kh)",
  "contested": "The CFL paper's k is the space step divided by the time step, so with unit wave speed it is the reciprocal of today's number. The number honours only Courant, although the condition has three authors; 'CFL number' is the even-handed variant. Symbols vary: ν, C, Richtmyer–Morton's L₁, or λ times a wave speed. Who first said 'Courant number' was not traced.",
  "confidence": "medium",
  "chapters": [
   "discretization",
   "advection",
   "notation"
  ],
  "sources": [
   "https://web.stanford.edu/class/cme324/classics/courant-friedrichs-lewy.pdf",
   "https://archive.org/details/1967-richtmyer-morton-difference-methods-for-initial-value-problems-book",
   "https://www.global-sci.com/cicp/article/view/5409"
  ],
  "group": "numerics"
 },
 {
  "id": "stencil-computational-molecule",
  "symbol": "stencil",
  "tex": "\\mathrm{stencil}",
  "name": "Stencil / computational molecule",
  "meaning": "The set of grid points, with their weights, that a difference formula combines to update or approximate a value at one point. Examples are the 5-point Laplacian stencil and the 3-point upwind or Lax–Wendroff stencils.",
  "introduced_by": "Not established for either term",
  "year": "unverified; the idea is visible in CFL's 1928 'fundamental rhombus', and both terms were standard by the 1980s",
  "first_work": "Not established. Early pictorial examples include CFL 1928 ('fundamental rhombus', Fig. 8) and W. G. Bickley, 'Finite difference formulae for the square lattice', Q. J. Mech. Appl. Math. 1(1) (1948) 35–42.",
  "popularised_by": "Hirsch (1988), who uses 'computational molecule'; most modern texts, which use 'stencil'",
  "story": "Courant, Friedrichs and Lewy (1928) described the five grid points of their wave-equation scheme as a 'fundamental rhombus' (their Fig. 8), an early picture of what is now called a stencil. Bickley's 1948 abstract speaks of compact sets of nodes on the square lattice and uses neither 'molecule' nor 'stencil'. Wikipedia lists older names such as 'relaxation patterns', 'operating instructions', 'lozenges' and 'point patterns', citing Emmons (1944) and Milne (1953). Hirsch's 1988 textbook labels its diagrams 'computational molecule', for example 'Computational molecule for the leapfrog scheme'. Most current texts say 'stencil'.",
  "original_form": "",
  "contested": "Who coined either term is unknown. Attributing 'computational molecule' to Bickley (1948) is unsupported: his abstract contains neither word, and the full text was not checked. The older names listed on Wikipedia were not checked against Emmons or Milne.",
  "confidence": "low",
  "chapters": [
   "notation",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.1093/qjmam/1.1.35",
   "https://en.wikipedia.org/wiki/Stencil_(numerical_analysis)",
   "https://web.eng.fiu.edu/LEVY/images/EGM6422/von%20Neumann%20method.pdf",
   "https://web.stanford.edu/class/cme324/classics/courant-friedrichs-lewy.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "mach-number",
  "symbol": "Ma (M)",
  "tex": "\\mathrm{Ma} = \\frac{u}{c}",
  "name": "Mach number",
  "meaning": "Flow speed divided by the local speed of sound. Compressibility matters above about 0.3, and shocks form near Ma = 1. At low Ma, compressible solvers become stiff because sound waves are far faster than the flow, which is why preconditioning or incompressible methods are used.",
  "introduced_by": "Jakob Ackeret (1898–1981) named it 'Machzahl', after Ernst Mach (1838–1916).",
  "year": "1929",
  "first_work": "Ackeret, ETH inaugural lecture 'Der Luftwiderstand bei sehr großen Geschwindigkeiten', printed in Schweizerische Bauzeitung 94 (October 1929), pp. 179–183 (citation as given by Wikipedia)",
  "popularised_by": "History in N. Rott, 'Jakob Ackeret and the History of the Mach Number', Annu. Rev. Fluid Mech. 17 (1985)",
  "story": "Ernst Mach studied supersonic projectiles and, with Peter Salcher, published photographs of the shock waves around bullets in 1887. Ackeret named the speed ratio after him in his 1929 inaugural lecture at ETH Zurich. Deutsche Biographie (https://www.deutsche-biographie.de/gnd118646745.html) records that in this lecture he coined the term 'Machzahl' for the ratio of flow speed to the speed of sound: '1929 prägte er bei seiner an der ETH gehaltenen Antrittsvorlesung „Der Luftwiderstand bei sehr großen Geschwindigkeiten“ den Begriff der „Machzahl“'.",
  "original_form": "",
  "contested": "The 1887 date for the Mach–Salcher photographs and the Schweizerische Bauzeitung page numbers come from Wikipedia and were not checked against the originals. Rott (1985) was not read directly. Both M and Ma are in use; Ma follows the two-letter style of other characteristic numbers.",
  "confidence": "medium",
  "chapters": [
   "similarity",
   "shocks",
   "stiffness",
   "notation"
  ],
  "sources": [
   "https://www.deutsche-biographie.de/gnd118646745.html",
   "https://en.wikipedia.org/wiki/Mach_number",
   "https://doi.org/10.1146/annurev.fl.17.010185.000245",
   "https://en.wikipedia.org/wiki/Ernst_Mach"
  ],
  "group": "numbers"
 },
 {
  "id": "krylov-subspace",
  "symbol": "K_m(A, r_0)",
  "tex": "K_m(A, r_0) = \\mathrm{span}(r_0, A r_0, ..., A^{m-1} r_0)",
  "name": "Krylov subspace",
  "meaning": "The space spanned by repeated products of a matrix with the initial residual. CG, MINRES, GMRES and BiCGSTAB all choose their m-th iterate from x_0 + K_m(A, r_0), using only matrix-vector products, so they suit huge sparse systems such as the discrete pressure equation.",
  "introduced_by": "Aleksei Nikolaevich Krylov (1863–1945), as a method for characteristic polynomials; the subspace name came later",
  "year": "1931",
  "first_work": "A. N. Krylov, 'On the numerical solution of the equation by which in technical questions frequencies of small oscillations of material systems are determined', Izvestiya Akademii Nauk SSSR, Otdelenie matematicheskikh i estestvennykh nauk (1931) 491–539",
  "popularised_by": "The iterative-methods literature from the 1970s on; Golub and O'Leary's history of CG and Lanczos (1989); Saad and van der Vorst's review (2000)",
  "story": "Krylov was a Russian naval engineer and applied mathematician. MacTutor: 'In 1931 he found a new method of solving the secular equation determining the frequency of vibrations in mechanical systems which is better than methods due to Lagrange, Laplace, Jacobi and Le Verrier.' His method builds the characteristic ('secular') equation from successive products of a matrix with a vector. The span of such vectors now carries his name, and conjugate gradients, Lanczos and GMRES are all called 'Krylov subspace methods'.",
  "original_form": "",
  "contested": "Krylov did not study linear solvers or subspaces as such; the name was attached later. Who coined 'Krylov subspace' was not established. The page range 491–539 is confirmed by the Dictionary of Scientific Biography entry. The series and issue number (7, no. 4) appear only on Wikipedia and were not checked.",
  "confidence": "medium",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Krylov_Aleksei/",
   "https://mathshistory.st-andrews.ac.uk/DSB/Krylov_Aleksei.pdf",
   "https://en.wikipedia.org/wiki/Krylov_subspace",
   "https://arxiv.org/abs/1908.01083"
  ],
  "group": "numerics"
 },
 {
  "id": "kolmogorov-five-thirds",
  "symbol": "E(k) = C ε^(2/3) k^(−5/3)",
  "tex": "E(k) = C \\varepsilon^{2/3} k^{-5/3}",
  "name": "Kolmogorov–Obukhov five-thirds law",
  "meaning": "In the inertial range of high-Reynolds-number turbulence, the energy spectrum depends only on the dissipation rate ε and the wavenumber k. The law shows how energy piles up at the grid scale when a simulation cannot dissipate it, and it underlies LES subgrid models and checks of DNS spectra.",
  "introduced_by": "Andrey Kolmogorov (structure-function form, 1941); Alexander Obukhov (spectral form, 1941)",
  "year": "1941",
  "first_work": "Kolmogorov, 'The local structure of turbulence in incompressible viscous fluid for very large Reynolds numbers', Doklady Akad. Nauk SSSR 30 (1941), starting p. 301 (English translation in Proc. R. Soc. A 434 (1991), pp. 9–13); Kolmogorov, 'Dissipation of energy in locally isotropic turbulence', Doklady 32 (1941), pp. 16–18 (translation in Proc. R. Soc. A 434 (1991), pp. 15–17); Obukhov, Doklady 32, no. 1 (1941), pp. 22–24",
  "popularised_by": "A widely cited early clear measurement: Grant, Stewart & Moilliet, 'Turbulence spectra from a tidal channel', J. Fluid Mech. 12 (1962), pp. 241–268",
  "story": "Kolmogorov's 1941 notes state the result for velocity differences: the mean square difference over a distance r grows as (εr)^(2/3), the 'two-thirds law'. In the same year Obukhov independently stated the spectral form, E(k) ∝ ε^(2/3) k^(−5/3). The two forms are Fourier-transform partners. The constant C, about 1.5, comes from measurement, not theory.",
  "original_form": "B_{dd}(r) = C\\varepsilon^{2/3}r^{2/3}",
  "contested": "The spectral law is usually credited to Kolmogorov, but Wikipedia's energy-cascade article says Obukhov stated it first, independently, in 1941. Some references, including that Wikipedia article, cite the local-structure paper as Kolmogorov 'Doklady 31: 99–101'. Kolmogorov's own 1941 dissipation note, in its 1991 translation, cites the local-structure paper as Doklady 30, p. 301, and his decay paper as Doklady 31, p. 538, so the '31: 99–101' citation looks wrong. It is probably his paper on particle sizes in fragmentation, but that was not confirmed. The structure-function formula above is in modern notation; the exact typography of the 1941 notes was not checked. The objection that ε fluctuates in space (usually attributed to Landau) led to Kolmogorov's refined theory (J. Fluid Mech. 13, 1962, pp. 82–85).",
  "confidence": "medium",
  "chapters": [
   "turbulence",
   "notation"
  ],
  "sources": [
   "https://doi.org/10.1098/rspa.1991.0075",
   "https://doi.org/10.1098/rspa.1991.0076",
   "https://en.wikipedia.org/wiki/Energy_cascade",
   "https://doi.org/10.1017/S002211206200018X"
  ],
  "group": "fluid"
 },
 {
  "id": "half-index-numerical-flux",
  "symbol": "F_{j+1/2}",
  "tex": "u_j^{n+1} = u_j^n - \\frac{\\Delta t}{\\Delta x}\\left(F_{j+\\frac{1}{2}} - F_{j-\\frac{1}{2}}\\right)",
  "name": "Half-integer indices and the numerical flux",
  "meaning": "j+1/2 labels the interface between cell j and cell j+1. F_{j+1/2} is the numerical flux, an approximation to the physical flux through that face, computed from nearby cell values. Writing the update as a difference of face fluxes makes the scheme conservative: whatever leaves one cell enters its neighbour.",
  "introduced_by": "Staggered half-points: von Neumann's March 1944 hydrodynamics report (per Morgan and Archer). Flux differences at x ± Δx/2: Lax and Richtmyer (1956) and Lax and Wendroff (1958). The subscript j+1/2 with the term 'numerical flux function' was in use by Harten (1983).",
  "year": "1944 (staggered grids); 1956–1960 (flux-difference form); 1983 (f̄_{j+1/2} as 'standard notation')",
  "first_work": "P. D. Lax and B. Wendroff, 'Systems of conservation laws', LA-2285 (written 1958, distributed 1959); Comm. Pure Appl. Math. 13 (1960) 217–237",
  "popularised_by": "Harten (1983) and the finite-volume literature",
  "story": "Morgan and Archer trace the staggered grid, with pressures computed at mid-points between mass points, to von Neumann's March 1944 report. They write such quantities with half-integer subscripts such as p_{i+1/2}, but in a later notation. Lax and Richtmyer (1956) describe 'the scheme usual in fluid dynamical calculations', in which a variable is differenced as w^n(x + Δx/2) − w^n(x − Δx/2). They remark that 'The equations would have a more centered look if we had used the notation φ^{n+½} and φ^{n−½} in place of φ^{n+1} and φ^n'. Lax and Wendroff (1958) wrote the conservative update with the flux difference Δg = g(x+Δx/2) − g(x−Δx/2). By 1983 Harten wrote v_j^{n+1} = v_j^n − λ(f̄_{j+1/2} − f̄_{j−1/2}), where 'f̄ is a numerical flux function', and used what he called 'the standard notation Δ_{j+1/2}u = u_{j+1} − u_j'.",
  "original_form": "\\Delta g = g(x+\\Delta x/2) - g(x-\\Delta x/2)",
  "contested": "Who first wrote a half-integer subscript is not established. Morgan and Archer state that they present the 1944 schemes in the later syntax of Skyrme, Peierls and Richtmyer, which differs from von Neumann's own. Their half-integer subscripts are therefore not evidence of 1944 notation. Some authors write F_{i+1/2} (with i as the cell index) or F_{j+½}, and on staggered (MAC) grids the half index marks where velocities are stored rather than a flux.",
  "confidence": "medium",
  "chapters": [
   "conservation",
   "shocks",
   "notation"
  ],
  "sources": [
   "https://digital.library.unt.edu/ark:/67531/metadc1021636/m2/1/high_res_d/4244712.pdf",
   "https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf",
   "https://pdfs.semanticscholar.org/0561/686ea4e30a23ccd5dd27fb32aacac7dcd13a.pdf",
   "https://arxiv.org/abs/2103.06249"
  ],
  "group": "numerics"
 },
 {
  "id": "von-neumann-analysis",
  "symbol": "u_j^n = G^n e^{ikjΔx}",
  "tex": "u_j^n = G^n e^{i k j \\Delta x}",
  "name": "Von Neumann (Fourier) stability analysis",
  "meaning": "Substitute a single Fourier mode into a linear scheme with constant (or frozen) coefficients, and require that its per-step amplification factor satisfy |G(k)| ≤ 1 + O(Δt) for every wavenumber k. This is the standard practical stability test. In general it is necessary, and it is sufficient only in special cases.",
  "introduced_by": "John von Neumann",
  "year": "developed during World War II (unpublished, classified per Hirsch); in print 1947 (Crank–Nicolson, brief, per Hirsch), 1950 (Charney–Fjørtoft–von Neumann), 1950/51 (O'Brien–Hyman–Kaplan)",
  "first_work": "J. G. Charney, R. Fjørtoft, J. von Neumann, 'Numerical integration of the barotropic vorticity equation', Tellus 2(4) (November 1950) 237–254; G. G. O'Brien, M. A. Hyman, S. Kaplan, 'A study of the numerical solution of partial differential equations', J. Math. Phys. 29 (1950, often cited as 1951) 223–251",
  "popularised_by": "Lax and Richtmyer (1956), whose Section 13 is headed 'The Von Neumann (Necessary) Condition for Stability'; Richtmyer (1957); Richtmyer and Morton (1967)",
  "story": "Hirsch (1988) writes that the method 'was developed in Los Alamos during World War II by Von Neumann and was considered classified until its brief description in' Crank and Nicolson (1947) 'and in a publication in 1950 by Charney et al. (1950).' In the first numerical weather-forecast paper, Charney, Fjørtoft and von Neumann substitute a single Fourier harmonic and note that the disturbance will not grow if |ω| ≤ 1. They call this 'a heuristic procedure which is, however, patterned after the rigorous method of COURANT, FRIEDRICHS, and LEWY (1928).' Richtmyer and Morton (1967) write: 'As observed many years ago by von Neumann (see O'Brien, Hyman, and Kaplan, 1951), the considerations can in this case be put into a particularly simple and useful form by the use of Fourier transformations'. Lax and Wendroff (1958) cite von Neumann's NDRC report AM-551 of 20 March 1944 for his assumption that convergence of a nonlinear scheme hinges on the stability of its first variation. They also report his conjecture that such an operator is stable if and only if all its frozen-coefficient 'localized' operators are stable.",
  "original_form": "|\\omega| \\le 1",
  "contested": "Von Neumann never published a full account himself, so credit for the first public description is split among Crank and Nicolson (1947), Charney et al. (1950) and O'Brien, Hyman and Kaplan. The 1947 Crank–Nicolson paper was not checked for the 'brief description'; that claim rests on Hirsch. The OHK paper is usually cited as 1951, but Crossref dates J. Math. Phys. vol. 29 to April 1950. The test covers linear constant-coefficient problems with periodic boundaries; boundary conditions and nonlinearity need other tools. Hirsch spells the names 'Cranck and Nicholson', and Richtmyer and Morton write 'Crank-Nicholson'. The co-author was Phyllis Nicolson, and 'Nicholson' is a common misspelling.",
  "confidence": "medium",
  "chapters": [
   "discretization",
   "advection",
   "trust"
  ],
  "sources": [
   "https://web.eng.fiu.edu/LEVY/images/EGM6422/von%20Neumann%20method.pdf",
   "https://faculty.eas.ualberta.ca/jdwilson/EAS372_13/Charney_etal50.pdf",
   "https://archive.org/details/1967-richtmyer-morton-difference-methods-for-initial-value-problems-book",
   "https://digital.library.unt.edu/ark:/67531/metadc1021636/m2/1/high_res_d/4244712.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "sor",
  "symbol": "ω",
  "tex": "x^{(k+1)} = (1-\\omega)\\,x^{(k)} + \\omega\\,x_{\\mathrm{GS}}^{(k+1)}",
  "name": "Successive over-relaxation (SOR)",
  "meaning": "Gauss–Seidel with each correction scaled by a relaxation factor 1 < ω < 2. With the optimal ω, the number of iterations for the model Poisson problem grows like N rather than N² on an N×N grid. It was the workhorse pressure solver of early CFD, including MAC-type codes.",
  "introduced_by": "David M. Young Jr. and Stanley P. Frankel (independently)",
  "year": "1950 (Young's thesis dated 1 May 1950; Frankel's paper April 1950); Young's journal version 1954",
  "first_work": "D. M. Young, 'Iterative Methods for Solving Partial Difference Equations of Elliptic Type', PhD thesis, Harvard (1 May 1950), written under Garrett Birkhoff; S. P. Frankel, 'Convergence rates of iterative treatments of partial differential equations', MTAC 4(30) (1950) 65–75",
  "popularised_by": "Young, Trans. Amer. Math. Soc. 76 (1954) 92–111; Varga, Matrix Iterative Analysis (1962)",
  "story": "Young's thesis introduces 'the Successive Overrelaxation Method, where the idea of systematic overrelaxation, first used by L. F. Richardson, [26], is combined with the Liebmann Method', with ω as the 'relaxation factor'. Frankel independently published the same idea in 1950 as the 'extrapolated Liebmann' method, writing the parameter as α. Lax and Richtmyer still used Frankel's name in 1956. Saad and van der Vorst describe SOR as 'introduced simultaneously by Frankel [73] and by Young [193]'. Young's theory of the optimal ω for matrices with 'Property A' turned guesswork into a formula.",
  "original_form": "\\omega\\ (\\mathrm{relaxation\\ factor})",
  "contested": "Over-relaxation itself is older. Young's thesis cites Richardson for systematic over-relaxation and Hartree, Southwell and Emmons for over-relaxation in hand relaxation methods. The 1950 contribution was the systematic cyclic method and its convergence theory. The thesis quotes here come from the retyped edition published on the University of Texas site, which notes minor editorial changes.",
  "confidence": "high",
  "chapters": [
   "solvers",
   "pressure"
  ],
  "sources": [
   "https://web.ma.utexas.edu/CNA/DMY/dmy-phd.html",
   "https://doi.org/10.2307/2002770",
   "https://www-users.cse.umn.edu/~saad/PDF/umsi-99-152.pdf",
   "https://arxiv.org/abs/1908.01083"
  ],
  "group": "numerics"
 },
 {
  "id": "upwind-cir",
  "symbol": "upwind",
  "tex": "u_j^{n+1} = u_j^n - \\nu\\,(u_j^n - u_{j-1}^n),\\ \\ \\nu = \\frac{c\\,\\Delta t}{\\Delta x} > 0",
  "name": "Upwind differencing and the Courant–Isaacson–Rees (CIR) scheme",
  "meaning": "Take one-sided differences from the side the information comes from, the 'upwind' side chosen by the sign of the characteristic speed. The scheme is first-order, monotone, stable for 0 ≤ ν ≤ 1, and strongly diffusive. Godunov-type and flux-splitting schemes extend the idea to nonlinear systems.",
  "introduced_by": "Richard Courant, Eugene Isaacson and Mina Rees",
  "year": "1952",
  "first_work": "R. Courant, E. Isaacson, M. Rees, 'On the solution of nonlinear hyperbolic differential equations by finite differences', Comm. Pure Appl. Math. 5(3) (1952) 243–255",
  "popularised_by": "The Los Alamos and Livermore 'donor cell' codes; van Leer and the upwind-scheme movement of the 1970s–80s",
  "story": "Courant, Isaacson and Rees (1952) solved hyperbolic systems by tracing characteristics back from each new grid point and interpolating between old values. For linear advection with |ν| ≤ 1 this reduces to the one-sided difference taken from the side the wave comes from. Van Leer (2006) writes that 'Upwind differencing ... is almost as old as CFD, starting with the work of Courant, Isaacson and Rees (1952 [12])'. He adds that in their paper 'the choice of an upwind-biased stencil follows rather naturally from the \"backward\" variant of the Method of Characteristics.' The finite-volume version is the donor-cell scheme, and van Leer notes: 'This terminology stems from the Los Alamos and Livermore National Laboratories.' Richtmyer and Morton (1967) discuss the CIR method and treat the idea under the heading 'Forward and Backward Space Differences'.",
  "original_form": "",
  "contested": "A search of the OCR text of Richtmyer and Morton (1967) finds no use of the word 'upwind'. Whether CIR used it, and when 'upwind' became the standard term, was not established. Van Leer's 2006 review is based on a 2003 conference talk, AIAA Paper 2003-3559.",
  "confidence": "high",
  "chapters": [
   "advection",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.1002/cpa.3160050303",
   "https://www.global-sci.com/cicp/article/view/5409",
   "https://archive.org/details/1967-richtmyer-morton-difference-methods-for-initial-value-problems-book"
  ],
  "group": "numerics"
 },
 {
  "id": "conjugate-gradient",
  "symbol": "CG",
  "tex": "x_{k+1} = x_k + \\alpha_k p_k,\\ \\ r_{k+1} = r_k - \\alpha_k A p_k",
  "name": "Conjugate gradient method",
  "meaning": "For symmetric positive-definite systems such as the discrete pressure Poisson equation, CG builds search directions that are mutually A-conjugate. At each step it minimises the energy norm of the error over a growing Krylov subspace. With a preconditioner (incomplete Cholesky, multigrid) it is the default pressure solver in many codes.",
  "introduced_by": "Magnus R. Hestenes and Eduard Stiefel (independently, then jointly); closely related work by Cornelius Lanczos",
  "year": "1952 (independent discoveries recognised in 1951)",
  "first_work": "M. R. Hestenes and E. Stiefel, 'Methods of conjugate gradients for solving linear systems', J. Res. Nat. Bur. Standards 49(6) (December 1952) 409–436",
  "popularised_by": "J. K. Reid (early 1970s), who revived it as an iterative method for large sparse systems; incomplete-Cholesky preconditioning (Meijerink and van der Vorst, 1977), which led to ICCG",
  "story": "Hestenes (UCLA) and Stiefel (ETH Zürich) developed the method independently. According to Saad (2019), citing Saad and van der Vorst (2000), they discovered this at a conference held at UCLA in 1951, and they then wrote the joint 1952 paper. Lanczos's closely related paper appeared within about six months. In exact arithmetic the method ends in at most n steps, so it was first seen as a direct method. Engeli, Ginsburg, Rutishauser and Stiefel (1959) were the first to treat it as an iterative process: for a discretised biharmonic problem of order 64, convergence took a few hundred steps rather than 64. The method then lay largely dormant until John Reid's work in the early 1970s showed its value for large sparse systems.",
  "original_form": "",
  "contested": "CG was first seen as a direct solver competing with elimination. Saad and van der Vorst write that 'it took about 25 years for the conjugate gradient method to become the method of choice for symmetric positive definite matrices'. Credit is sometimes shared with Lanczos, whose 1952 method is closely related. Saad (2019) describes it as mathematically equivalent to what is now called the minimal residual method.",
  "confidence": "high",
  "chapters": [
   "solvers",
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.6028/jres.049.044",
   "https://www-users.cse.umn.edu/~saad/PDF/umsi-99-152.pdf",
   "https://arxiv.org/abs/1908.01083"
  ],
  "group": "numerics"
 },
 {
  "id": "u-j-n-index-notation",
  "symbol": "u_j^n",
  "tex": "u_j^n \\approx u(j\\Delta x,\\ n\\Delta t)",
  "name": "Grid-function index notation u_j^n",
  "meaning": "The computed approximation to u at grid point x_j = jΔx and time level t_n = nΔt. The superscript is a time level, not a power. The subscript is the spatial index; in finite-volume methods it is the cell average over cell j.",
  "introduced_by": "No single inventor identified. Lax and Richtmyer (1956) give the earliest explicit definition of the superscript-n, subscript-ij shorthand found here.",
  "year": "1956 (earliest explicit definition found here)",
  "first_work": "P. D. Lax and R. D. Richtmyer, 'Survey of the stability of linear finite difference equations', Comm. Pure Appl. Math. 9(2) (1956) 267–293, p. 288",
  "popularised_by": "R. D. Richtmyer and K. W. Morton, Difference Methods for Initial-Value Problems, 2nd ed. (1967), which writes grid values as u_j^n. The notation was standard in high-resolution-scheme papers such as Harten (1983).",
  "story": "Courant, Friedrichs and Lewy (1928) wrote grid functions as ordinary functions with difference quotients. They labelled the five points of their wave-equation scheme u_0 to u_4 around a 'fundamental rhombus' and used no index pairs. Lax and Richtmyer (1956) write u^n(x) for the solution at time level n. On p. 288 they 'Introduce the following abbreviations': u^n_{ij} for u^n(x, y), u^n_{i+1 j} for u^n(x + Δx, y), u^n_{i j+1} for u^n(x, y + Δy), etc. Lax and Wendroff's 1958 report writes the values at the lattice points x + kΔx at time t as u_k, but still writes time levels as functions, as in u(x, t+Δt). Richtmyer and Morton (1967) use u_j^n, and Harten (1983) writes 'v_j^n = v(jΔx, nΔt)'. Using j rather than i for the space index avoids a clash with i = √−1 in Fourier (von Neumann) stability analysis.",
  "original_form": "u^{n}_{ij}\\ \\mathrm{for}\\ u^{n}(x,y),\\ u^{n}_{i+1\\,j}\\ \\mathrm{for}\\ u^{n}(x+\\Delta x,y)",
  "contested": "The notation does not come from CFL (1928), which has no indexed notation. Morgan and Archer (2021) show 1944 Los Alamos schemes with a superscript n for the time cycle and a subscript i for mass points. They say, however, that they use the later syntax of Skyrme, Peierls and Richtmyer, 'which deviates from what was used by von Neumann in his paper'. Their equations are therefore not evidence of 1944 usage, and the claim that wartime reports already used this notation is not established. O'Brien, Hyman and Kaplan (1950) and the first edition of Richtmyer's book (1957) were not checked. The 1956 passage is the earliest explicit definition found here, not a proven first use.",
  "confidence": "medium",
  "chapters": [
   "notation",
   "discretization"
  ],
  "sources": [
   "https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf",
   "https://digital.library.unt.edu/ark:/67531/metadc1021636/m2/1/high_res_d/4244712.pdf",
   "https://arxiv.org/abs/2103.06249",
   "https://pdfs.semanticscholar.org/0561/686ea4e30a23ccd5dd27fb32aacac7dcd13a.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "amplification-factor",
  "symbol": "G (also g, ω, ξ)",
  "tex": "G(\\Delta t, k) = \\frac{\\hat{u}^{n+1}(k)}{\\hat{u}^{n}(k)}",
  "name": "Amplification factor / amplification matrix",
  "meaning": "The complex number (or, for systems, the matrix) that multiplies a Fourier mode of wavenumber k in one time step. |G| < 1 means damping, which shows up as numerical dissipation. The phase of G compared with the exact phase measures numerical dispersion. Stability requires |G| ≤ 1 + O(Δt).",
  "introduced_by": "Lax and Richtmyer (1956) define the term 'amplification matrix', the earliest use found here. The underlying growth factor goes back to von Neumann's analysis.",
  "year": "1956 ('amplification matrix'); 'amplification factor' in Richtmyer–Morton (1967), possibly earlier",
  "first_work": "P. D. Lax and R. D. Richtmyer, 'Survey of the stability of linear finite difference equations', Comm. Pure Appl. Math. 9(2) (1956) 267–293, p. 279",
  "popularised_by": "Richtmyer and Morton (1967); Hirsch (1988)",
  "story": "Substituting one Fourier mode into a linear constant-coefficient scheme multiplies it each step by a factor that depends on k, Δt and Δx. Lax and Richtmyer (1956) write G = G(Δt, Δx, k) and state: 'G will be called the amplification matrix'. Lax and Wendroff (1958) use the same term. Richtmyer and Morton (1967) add in a footnote: 'When p = 1 so that the amplification matrix has a single element, we also call G(Δt, k) the amplification factor.' Charney, Fjørtoft and von Neumann (1950) wrote the growth factor as ω, and Hirsch (1988) uses G.",
  "original_form": "G = G(\\Delta t, \\Delta x, k)",
  "contested": "Symbols vary. G is used by Lax and Richtmyer, Richtmyer and Morton, and Hirsch, and ω by Charney et al. Other texts use g or ξ, and some use ξ for the wavenumber instead, so learners should check each book's convention. Whether von Neumann or O'Brien, Hyman and Kaplan used the phrase 'amplification factor' earlier was not checked.",
  "confidence": "medium",
  "chapters": [
   "discretization",
   "advection",
   "notation"
  ],
  "sources": [
   "https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf",
   "https://digital.library.unt.edu/ark:/67531/metadc1021636/m2/1/high_res_d/4244712.pdf",
   "https://archive.org/details/1967-richtmyer-morton-difference-methods-for-initial-value-problems-book",
   "https://web.eng.fiu.edu/LEVY/images/EGM6422/von%20Neumann%20method.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "lax-richtmyer-equivalence",
  "symbol": "consistency + stability ⇔ convergence",
  "tex": "\\mathrm{consistency} + \\mathrm{stability} \\iff \\mathrm{convergence}",
  "name": "Lax–Richtmyer equivalence theorem",
  "meaning": "For a well-posed linear initial-value problem and a consistent difference scheme, the scheme converges if and only if it is stable. This splits 'does it converge?' into two checkable parts: consistency (via truncation error) and stability (via von Neumann analysis or energy estimates).",
  "introduced_by": "Peter D. Lax and Robert D. Richtmyer",
  "year": "1956",
  "first_work": "P. D. Lax and R. D. Richtmyer, 'Survey of the stability of linear finite difference equations', Comm. Pure Appl. Math. 9(2) (1956) 267–293",
  "popularised_by": "Richtmyer (1957) and Richtmyer and Morton (1967). The preface to the first edition, reprinted in 1967, says the theoretical ideas 'are primarily those of John von Neumann and Peter Lax'.",
  "story": "The survey opens: 'Beginning with the discovery by Courant, Friedrichs and Lewy [1] of the conditional stability of certain finite difference approximations to partial differential equations, the subject of stability has been variously discussed in the literature'. It notes that earlier work used a different notion of stability: 'Indeed, O'Brien, Hyman and Kaplan [8] defined stability in terms of the growth of rounding errors.' Lax and Richtmyer instead define stability as the uniform boundedness of a set of operators and prove the equivalence theorem, assuming infinite-precision arithmetic.",
  "original_form": "",
  "contested": "It is often called simply the 'Lax equivalence theorem'. It applies to linear problems. For nonlinear conservation laws, convergence to the correct solution also needs conservation form and an entropy condition (Lax–Wendroff 1960; Harten–Hyman–Lax 1976).",
  "confidence": "high",
  "chapters": [
   "trust",
   "discretization"
  ],
  "sources": [
   "https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf",
   "https://doi.org/10.1002/cpa.3160090206",
   "https://archive.org/details/1967-richtmyer-morton-difference-methods-for-initial-value-problems-book"
  ],
  "group": "numerics"
 },
 {
  "id": "lambda-mesh-ratio",
  "symbol": "λ = Δt/Δx",
  "tex": "\\lambda = \\frac{\\Delta t}{\\Delta x}",
  "name": "Mesh ratio λ (Lax's notation)",
  "meaning": "The ratio of time step to space step, without the wave speed. It appears in the conservative update u_j^{n+1} = u_j^n − λ(F_{j+1/2} − F_{j−1/2}). The Courant number is λ times the largest characteristic speed |f'(u)|.",
  "introduced_by": "Peter D. Lax and Burton Wendroff (earliest use verified here)",
  "year": "1958 (report written November 1958, distributed 19 April 1959); journal 1960",
  "first_work": "P. D. Lax and B. Wendroff, 'Systems of conservation laws', Los Alamos report LA-2285 (written Nov 1958, distributed Apr 1959); Comm. Pure Appl. Math. 13(2) (1960) 217–237",
  "popularised_by": "Harten (1983) and the high-resolution-scheme literature of the 1980s",
  "story": "In Los Alamos report LA-2285, Lax and Wendroff write the scheme as u(x, t+Δt) = u(x,t) + λΔg, with Δg = g(x+Δx/2) − g(x−Δx/2), 'where λ abbreviates the quotient Δt/Δx of the time and space increments.' The work appeared in Communications on Pure and Applied Mathematics in 1960. Harten's 1983 paper uses the same λ in the conservation form v_j^{n+1} = v_j^n − λ[f̄(…) − f̄(…)]. Because λ leaves out the wave speed, a single λ serves for nonlinear systems whose speeds vary.",
  "original_form": "u(x,t+\\Delta t) = u(x,t) + \\lambda\\,\\Delta g,\\ \\ \\Delta g = g(x+\\Delta x/2) - g(x-\\Delta x/2)",
  "contested": "Earlier use by Lax, for example in his 1954 work on weak solutions, was not checked. There is a notation clash: λ is also the usual symbol for eigenvalues and wave speeds, and Lax and Richtmyer (1956, p. 286) use λ for the roots of a characteristic equation. In heat-equation texts the 'mesh ratio' is often Δt/Δx², a different quantity.",
  "confidence": "high",
  "chapters": [
   "notation",
   "shocks",
   "conservation"
  ],
  "sources": [
   "https://digital.library.unt.edu/ark:/67531/metadc1021636/m2/1/high_res_d/4244712.pdf",
   "https://doi.org/10.1002/cpa.3160130205",
   "https://pdfs.semanticscholar.org/0561/686ea4e30a23ccd5dd27fb32aacac7dcd13a.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "truncation-error",
  "symbol": "τ_j^n",
  "tex": "\\tau_j^n",
  "name": "Truncation error / local truncation error",
  "meaning": "The residual left when the exact solution of the PDE is substituted into the difference equations, made up of the Taylor-series terms the scheme truncates. A scheme is consistent if this residual tends to zero as the mesh is refined. Its order of accuracy is the power of Δx or Δt with which it does so.",
  "introduced_by": "Not established. The term is already used in Lax and Wendroff (1958) and defined formally in Richtmyer and Morton (1967).",
  "year": "in use by 1958 (earliest found here)",
  "first_work": "Earliest found here: Lax and Wendroff, LA-2285 (written 1958, distributed 1959), section 2, 'MINIMIZING THE TRUNCATION ERROR'",
  "popularised_by": "Richtmyer and Morton (1967) and later textbooks",
  "story": "Truncation error is the part of the Taylor expansion that a difference formula throws away, measured by substituting the true solution into the scheme. Lax and Wendroff's 1958 report has a section headed 'MINIMIZING THE TRUNCATION ERROR'. Richtmyer and Morton (1967) define it per unit time step and also use 'local truncation error'. They remark: 'Some authors multiply it by Δt and call the result the truncation error, but we prefer to take the above expression as it stands.'",
  "original_form": "",
  "contested": "The two conventions differ by a factor of Δt, so the same first-order scheme can be quoted as having local error O(Δt²) or truncation error O(Δt). Learners should check which one a text uses. The local truncation error is not the global error; stability is what links them (Lax–Richtmyer). The first use of the term was not traced, and 1958 is only the earliest date found in the sources checked here.",
  "confidence": "medium",
  "chapters": [
   "discretization",
   "trust"
  ],
  "sources": [
   "https://digital.library.unt.edu/ark:/67531/metadc1021636/m2/1/high_res_d/4244712.pdf",
   "https://archive.org/details/1967-richtmyer-morton-difference-methods-for-initial-value-problems-book"
  ],
  "group": "numerics"
 },
 {
  "id": "godunov-order-barrier",
  "symbol": "Godunov's theorem",
  "tex": "\\mathrm{linear} + \\mathrm{monotonicity\\ preserving} \\Rightarrow \\mathrm{order} \\le 1",
  "name": "Godunov's order barrier theorem",
  "meaning": "A linear scheme that never creates new oscillations (it maps monotone data to monotone data) can be at most first-order accurate. Getting both sharp, oscillation-free shocks and high accuracy therefore requires nonlinear, solution-dependent schemes such as TVD limiters, ENO and WENO.",
  "introduced_by": "Sergei K. Godunov",
  "year": "1959",
  "first_work": "S. K. Godunov, 'A difference method for numerical calculation of discontinuous solutions of the equations of hydrodynamics', Mat. Sb. (N.S.) 47(89):3 (1959) 271–306",
  "popularised_by": "Van Leer's 'Towards the ultimate conservative difference scheme' series (1973–79); Harten (1983)",
  "story": "Godunov's 1959 paper, which also introduced his Riemann-solver-based method, contains the result that a linear monotonicity-preserving scheme is at most first-order accurate. Van Leer (2006) calls it 'a famous theorem included by Godunov in his 1959 paper' and explains the escape route: 'In the proof of this theorem it is tacitly assumed that the linear advection equation is approximated by a linear discretization; once nonlinear discretizations are admitted the theorem no longer stands and high-resolution schemes become possible.' Harten (1983), citing Godunov, writes: 'any linear monotonicity-preserving scheme, and therefore any TVNI linear scheme, is a monotone scheme and consequently first order accurate.'",
  "original_form": "",
  "contested": "The theorem restricts linear schemes only. It is sometimes misquoted as 'no monotone scheme can be second order', which confuses it with the Harten–Hyman–Lax result for monotone (nonlinear) schemes. The original Russian paper was not read; this record relies on van Leer (2006) and Harten (1983).",
  "confidence": "high",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://www.mathnet.ru/eng/sm4873",
   "https://www.global-sci.com/cicp/article/view/5409",
   "https://pdfs.semanticscholar.org/0561/686ea4e30a23ccd5dd27fb32aacac7dcd13a.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "multigrid",
  "symbol": "multigrid",
  "tex": "u_h \\to u_h + P\\,A_{2h}^{-1} R\\,(f_h - A_h u_h)",
  "name": "Multigrid method",
  "meaning": "Relaxation sweeps (Jacobi or Gauss–Seidel) quickly remove high-frequency error but stall on smooth error. Multigrid moves the smooth residual to a coarser grid, where it looks oscillatory and is cheap to fix, and repeats this recursively. It solves the Poisson equation in work proportional to the number of unknowns.",
  "introduced_by": "R. P. Fedorenko and N. S. Bakhvalov (early theory); Achi Brandt (practical multilevel method); Wolfgang Hackbusch (independent development)",
  "year": "1961–1966 (Fedorenko, Bakhvalov); presented 1972, published 1973 (Brandt); 1976–78 (Hackbusch); 1977 (Brandt's Math. Comp. paper)",
  "first_work": "R. P. Fedorenko, 'A relaxation method of solution of elliptic difference equations', Zh. Vychisl. Mat. Mat. Fiz. 1 (1961) 922–927; A. Brandt, 'Multi-level adaptive technique (MLAT) for fast numerical solution to boundary value problems', Proc. 3rd Int. Conf. Numer. Methods Fluid Mech. (Paris 1972), Lecture Notes in Physics 18 (1973) 82–89",
  "popularised_by": "A. Brandt, 'Multi-level adaptive solutions to boundary-value problems', Math. Comp. 31(138) (1977) 333–390; W. Hackbusch, Multi-Grid Methods and Applications (1985)",
  "story": "Xu and Zikatanov write: 'The main ideas of GMG method were first demonstrated by pioneering works of Fedorenko (Fedorenko 1961, Fedorenko 1964), and Bahvalov (Bahvalov 1966).' They trace similar ideas to Southwell's group relaxation of the 1940s. Brandt presented his multi-level adaptive technique at the July 1972 Paris conference on numerical methods in fluid mechanics, the same meeting at which van Leer presented his first limited scheme. Xu and Zikatanov write that 'The first description of truly multi-grid method is found in the seminal work by Brandt (Brandt 1973).' Hackbusch developed the method independently in Germany, and his 1977 Köln report already has 'multi-grid method' in its title.",
  "original_form": "",
  "contested": "Who coined 'multigrid' was not established. Brandt's early name was MLAT (multi-level adaptive technique), Nicolaides (1975) wrote of 'multiple grid' techniques, and Hackbusch's 1977 report uses 'multi-grid'. The Soviet work of the 1960s was little known in the West until after Brandt's papers.",
  "confidence": "medium",
  "chapters": [
   "solvers",
   "pressure"
  ],
  "sources": [
   "https://arxiv.org/abs/1611.01917"
  ],
  "group": "numerics"
 },
 {
  "id": "batchelor-1967-index-notation",
  "symbol": "u_i, ∂u_i/∂x_i, σ_ij",
  "tex": "\\frac{\\partial u_i}{\\partial t} + u_j\\frac{\\partial u_i}{\\partial x_j} = -\\frac{1}{\\rho}\\frac{\\partial p}{\\partial x_i} + \\nu\\frac{\\partial^2 u_i}{\\partial x_j \\partial x_j}",
  "name": "Index (suffix) notation in modern fluid texts: Batchelor's An Introduction to Fluid Dynamics (1967)",
  "meaning": "Index notation writes vectors and tensors through their components, using subscripts and the summation convention. It is standard in fluid-mechanics research and in deriving CFD schemes. Many engineering texts keep the Gibbs-style ∇· and ∇×.",
  "introduced_by": "G. K. Batchelor (an influential example, not the inventor)",
  "year": "1967",
  "first_work": "An Introduction to Fluid Dynamics (Cambridge University Press, 1967; first paperback edition 1973; Cambridge Mathematical Library reissue 2000)",
  "popularised_by": "",
  "story": "Batchelor's book became a standard graduate text. I recall that it uses Cartesian suffix notation with the summation convention in its kinematics and dynamics chapters, with e_ij for the rate of strain and σ_ij for stress. These details are from memory; I could not re-check them because the scans are access-restricted. The notation comes from Ricci and Levi-Civita (1900) through Einstein (1916) and the elasticity literature. Its appeal for fluids is that the momentum equation, the stress law and the vorticity equation can be manipulated term by term, without remembering vector identities.",
  "original_form": "",
  "contested": "Batchelor did not introduce index notation to fluid mechanics; his book is a representative and widely copied example. I have not identified the first fluid-mechanics textbook to use it. Treat the specific symbols attributed to Batchelor here as medium confidence.",
  "confidence": "medium",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://www.cambridge.org/core/books/an-introduction-to-fluid-dynamics/18AA1576B9C579CE25621E80F9266993",
   "https://archive.org/details/introductiontofl0000batc",
   "https://bemis2.marmot.org/Record/.b27456584"
  ],
  "group": "vectors"
 },
 {
  "id": "modified-equation",
  "symbol": "modified equation",
  "tex": "v_t + a v_x = \\frac{1}{2} a\\,\\Delta x\\,(1-\\nu)\\,v_{xx} + O(\\Delta x^2)",
  "name": "Modified equation (equivalent differential equation)",
  "meaning": "The PDE that a scheme's output satisfies to higher order than the target PDE, found by Taylor-expanding the scheme. Its extra terms reveal numerical diffusion (even derivatives) and numerical dispersion (odd derivatives). For first-order upwind the extra diffusion coefficient is ½aΔx(1 − ν).",
  "introduced_by": "C. W. Hirt (1968, 'heuristic stability'); R. F. Warming and B. J. Hyett (1974, name and systematic method)",
  "year": "1968; 1974",
  "first_work": "R. F. Warming and B. J. Hyett, 'The modified equation approach to the stability and accuracy analysis of finite-difference methods', J. Comput. Phys. 14(2) (1974) 159–179. Precursor: C. W. Hirt, 'Heuristic stability theory for finite-difference equations', J. Comput. Phys. 2(4) (1968) 339–355.",
  "popularised_by": "Warming and Hyett (1974); Hedstrom (1975); most CFD textbooks",
  "story": "The idea is to insert a smooth function into the difference scheme, expand everything in Taylor series, and ask which PDE the scheme actually solves. Hirt (1968) used the extra second-derivative terms to read off stability heuristically. Warming and Hyett (1974) named the 'modified equation approach' and made it systematic, reducing the result to an equation with only space derivatives on the right. For first-order upwind the leading extra term is the second derivative ½aΔx(1 − ν)v_xx, a 'numerical diffusion' that smears fronts. For Lax–Wendroff the leading error is a third derivative, so the error is dispersive and shows up as wiggles near steep gradients. Hedstrom (1975) studied such PDE models of difference schemes for u_t + u_x = 0. Harten (1983) used the idea to explain the accuracy limit of monotone schemes: 'Monotone schemes approximate solutions of the viscous modified equation' to second-order accuracy.",
  "original_form": "",
  "contested": "The modified equation is an asymptotic tool for smooth solutions and can mislead near discontinuities. Uses of the idea before Hirt (1968) were not checked.",
  "confidence": "medium",
  "chapters": [
   "advection",
   "trust",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(74)90011-4",
   "https://doi.org/10.1016/0021-9991(68)90041-7",
   "https://doi.org/10.1090/S0025-5718-1975-0388797-4",
   "https://pdfs.semanticscholar.org/0561/686ea4e30a23ccd5dd27fb32aacac7dcd13a.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "flux-limiter",
  "symbol": "φ(r)",
  "tex": "\\phi(r),\\ \\ r_j = \\frac{u_j - u_{j-1}}{u_{j+1} - u_j}",
  "name": "Flux limiter φ(r) and smoothness ratio r",
  "meaning": "A nonlinear switch that blends a low-order monotone flux with a high-order flux. It uses φ ≈ 1 (high order) where the ratio r of consecutive gradients shows smooth data, and φ → 0 (upwind) near extrema and discontinuities, so that the scheme stays TVD.",
  "introduced_by": "Bram van Leer (limited second-order schemes, presented 1972, published 1973–74); P. K. Sweby (unified φ(r) flux-limiter framework and TVD-region diagram, 1984). Parallel early work: J. P. Boris and D. L. Book (flux-corrected transport, 1971–73) and V. P. Kolgan (1972).",
  "year": "1972–74; 1984",
  "first_work": "P. K. Sweby, 'High resolution schemes using flux limiters for hyperbolic conservation laws', SIAM J. Numer. Anal. 21(5) (1984) 995–1011; B. van Leer, 'Towards the ultimate conservative difference scheme. II. Monotonicity and conservation combined in a second-order scheme', J. Comput. Phys. 14(4) (1974) 361–370",
  "popularised_by": "Sweby (1984), whose (r, φ) diagram is reproduced in many CFD texts",
  "story": "Van Leer presented a non-oscillatory modification of the Lax–Wendroff scheme at the Paris conference of July 1972 (published 1973). Part II of his series (1974) combined monotonicity and conservation in a second-order scheme. The smooth limiter φ(r) = (r + |r|)/(1 + |r|) is commonly attributed to that 1974 paper. Sweby (1984) wrote many such schemes in a common flux-limiter form, with φ a function of the ratio r of consecutive gradients. He drew the region of the (r, φ) plane in which a scheme is both TVD and second order, now called the Sweby diagram. Van Leer's 2006 review counts three independent starts within about a year. They were Boris's SHASTA, the first flux-corrected transport scheme (presented in Trieste in August 1971); van Leer's own work; and V. P. Kolgan's 1972 limited scheme at TsAGI, whose neglect he discusses under the heading 'A historical injustice'. He objects to the usual name: 'Using the expression \"flux limiter\" is therefore inappropriate and reveals ignorance.' He grants that in flux-corrected transport 'the term \"flux limiting\" is appropriate.'",
  "original_form": "",
  "contested": "Crediting limiters to Sweby alone is a common error: Sweby unified and analysed limiters that van Leer, Boris and Book, and Kolgan had already introduced. The ratio's symbol varies (r in Sweby-style presentations, θ in some textbooks), and Sweby's own symbol was not checked. Limiting reconstructed slopes (slope limiters, MUSCL) and limiting fluxes are equivalent only in simple 1D cases, which is the root of van Leer's complaint.",
  "confidence": "medium",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1137/0721062",
   "https://doi.org/10.1016/0021-9991(74)90019-9",
   "https://www.global-sci.com/cicp/article/view/5409",
   "https://en.wikipedia.org/wiki/Flux_limiter"
  ],
  "group": "numerics"
 },
 {
  "id": "monotone-scheme",
  "symbol": "H nondecreasing",
  "tex": "u_j^{n+1} = H(u_{j-k}^n, ..., u_{j+k}^n),\\ \\ \\frac{\\partial H}{\\partial u_{j+i}} \\ge 0",
  "name": "Monotone scheme",
  "meaning": "A scheme whose update is a nondecreasing function of every input value, so raising any old value can never lower any new value. Monotone conservative schemes converge to the physically correct (entropy) solution of scalar conservation laws, but they are at most first-order accurate.",
  "introduced_by": "Amiram Harten, James M. Hyman and Peter D. Lax (with an appendix by Barbara Keyfitz); convergence theory by Michael Crandall and Andrew Majda",
  "year": "1976; 1980",
  "first_work": "A. Harten, J. M. Hyman, P. D. Lax, 'On finite-difference approximations and entropy conditions for shocks', Comm. Pure Appl. Math. 29(3) (1976) 297–322",
  "popularised_by": "M. G. Crandall and A. Majda, 'Monotone difference approximations for scalar conservation laws', Math. Comp. 34(149) (1980) 1–21; Harten (1983)",
  "story": "Harten, Hyman and Lax (1976) studied schemes in which the update H is nondecreasing in each argument and showed that their limits satisfy the entropy condition. Crandall and Majda (1980) proved that monotone conservative schemes converge to the entropy solution. Harten (1983) restated the definition (H is 'a monotone nondecreasing function of each of its 2k + 1 arguments') and the hierarchy in his Theorem 2.1: '(i) A monotone scheme is TVNI. (ii) A TVNI scheme is monotonicity preserving.' The price is accuracy: 'monotone schemes are necessarily first order accurate'.",
  "original_form": "",
  "contested": "'Monotone' (H nondecreasing, a nonlinear notion), 'TVD' and 'monotonicity-preserving' are often used interchangeably. Harten's hierarchy is strict, though, and each class is larger than the one before. Godunov's 1959 barrier concerns linear monotonicity-preserving schemes, which is a different statement from the Harten–Hyman–Lax first-order result.",
  "confidence": "high",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1002/cpa.3160290305",
   "https://doi.org/10.1090/S0025-5718-1980-0551288-3",
   "https://pdfs.semanticscholar.org/0561/686ea4e30a23ccd5dd27fb32aacac7dcd13a.pdf"
  ],
  "group": "numerics"
 },
 {
  "id": "tvd",
  "symbol": "TVD",
  "tex": "TV(u^{n+1}) \\le TV(u^n),\\ \\ TV(u) = \\sum_j |u_{j+1}-u_j|",
  "name": "Total variation diminishing (TVD), printed first as TVNI",
  "meaning": "A scheme is TVD if the total variation of the discrete solution never increases. It therefore cannot create new extrema or spurious oscillations near shocks, yet it can be second-order accurate in smooth regions away from extrema. TVD schemes are built with nonlinear limiters.",
  "introduced_by": "Ami Harten",
  "year": "received 2 February 1982; published March 1983 (as 'TVNI'); the acronym 'TVD' in print March 1983",
  "first_work": "A. Harten, 'High resolution schemes for hyperbolic conservation laws', J. Comput. Phys. 49(3) (1983) 357–393. The acronym TVD appears in H. C. Yee, R. F. Warming, A. Harten, 'Implicit Total Variation Diminishing (TVD) schemes for steady-state calculations', NASA TM-84342 (1 March 1983).",
  "popularised_by": "Yee, Warming and Harten (1983 onward); Harten (1984, SIAM J. Numer. Anal.); Sweby (1984)",
  "story": "Harten's paper defines: 'We say that finite-difference scheme (2.3) is total variation nonincreasing (TVNI) if for all v of bounded total variation TV(L·v) ≤ TV(v)'. It uses the abbreviation TVNI throughout. The acronym TVD appears in the title of Yee, Warming and Harten's NASA technical memorandum of 1 March 1983. Lax (1997) gives the naming story: 'Harten originally called his schemes variation diminishing, abbreviated TVD; when Osher pointed out the usual meaning of these initials, the name was switched to total variation nonincreasing (TVNI), but was eventually settled on the more euphonious TVD.' Lax notes that for systems Harten used 'a notion of total variation that was introduced by Glimm', and van Leer also says Harten was inspired by Glimm's work.",
  "original_form": "TV(L\\cdot v) \\le TV(v)",
  "contested": "The 1983 JCP paper never says 'TVD'. The common story that TVNI was simply renamed TVD later is incomplete: according to Lax, TVD came first, was dropped for TVNI, and then came back. 'Diminishing' is loose wording, because the definition allows the total variation to stay constant. Van Leer objects to loose usage: 'There is no such thing as a \"TVD Riemann solver;\" using such language reveals ignorance.' TVD schemes drop to first order at smooth extrema, which motivated ENO and WENO schemes. In two dimensions Goodman and LeVeque (1985) showed that TVD schemes are severely limited in accuracy.",
  "confidence": "high",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://pdfs.semanticscholar.org/0561/686ea4e30a23ccd5dd27fb32aacac7dcd13a.pdf",
   "https://ntrs.nasa.gov/citations/19830014814",
   "https://doi.org/10.1006/jcph.1997.5725",
   "https://www.global-sci.com/cicp/article/view/5409"
  ],
  "group": "numerics"
 },
 {
  "id": "re-symbol",
  "symbol": "Re",
  "tex": "\\mathrm{Re}",
  "name": "The two-letter symbol Re",
  "meaning": "The standard symbol for the Reynolds number. It is set upright and treated as a single symbol, like Ma, Fr, Pr and Nu.",
  "introduced_by": "Not established",
  "year": "Unknown",
  "first_work": "",
  "popularised_by": "International standards for characteristic numbers (ISO 31-12, now ISO 80000-11), as reported by secondary sources",
  "story": "Reynolds wrote K (1895), and Sommerfeld wrote R (1908). Rott (1990) dates the habit of naming numbers after people to Weber (1919); two-letter abbreviations of those names came later. When Re itself first appeared was not established.",
  "original_form": "",
  "contested": "Re can be misread as R times e, or as 'real part'; some older texts write R or R_e. Who first used 'Re', and when, was not found. The ISO listing is reported from secondary sources and was not checked against the standard.",
  "confidence": "low",
  "chapters": [
   "similarity",
   "notation"
  ],
  "sources": [
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
   "https://en.wikipedia.org/wiki/Reynolds_number"
  ],
  "group": "numbers"
 },
 {
  "id": "peclet-number",
  "symbol": "Pe",
  "tex": "\\mathrm{Pe} = \\frac{U L}{D}",
  "name": "Péclet number",
  "meaning": "The ratio of advection to diffusion for heat or a dissolved substance; for heat, Pe = Re·Pr. On a grid, the cell Péclet number UΔx/D must stay below 2 for central differencing of steady advection–diffusion to avoid wiggles. This is a classic reason for using upwind schemes.",
  "introduced_by": "Named after Jean Claude Eugène Péclet (1793–1857); who named it was not established",
  "year": "Unknown",
  "first_work": "Péclet's Traité de la chaleur, which went through several editions (the 3rd in 1861, the 4th in 1878)",
  "popularised_by": "",
  "story": "Péclet was a French physicist known for his treatise on heat and its applications. The number honours that body of work rather than a particular paper in which he defined it.",
  "original_form": "",
  "contested": "The naming date and the person who chose the name were not established. The date of the Traité's first edition, often given as 1829, was not confirmed.",
  "confidence": "low",
  "chapters": [
   "similarity",
   "advection",
   "discretization"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/P%C3%A9clet_number",
   "https://en.wikipedia.org/wiki/Jean_Claude_Eug%C3%A8ne_P%C3%A9clet"
  ],
  "group": "numbers"
 },
 {
  "id": "rossby-number",
  "symbol": "Ro",
  "tex": "\\mathrm{Ro} = \\frac{U}{f L}",
  "name": "Rossby number",
  "meaning": "The ratio of inertial to Coriolis forces. A small Ro means rotation dominates, as in large-scale weather and ocean currents, which justifies geostrophic and quasi-geostrophic models.",
  "introduced_by": "Named after Carl-Gustaf Rossby (1898–1957); who named it was not established",
  "year": "Unknown",
  "first_work": "",
  "popularised_by": "",
  "story": "Rossby shaped much of modern dynamic meteorology, including the theory of large-scale planetary waves. The number measures how strongly the Earth's rotation controls a flow.",
  "original_form": "",
  "contested": "Wikipedia, citing Boubnov & Golitsyn (1995), says it is also known as the Kibel number, after I. A. Kibel. When and by whom it was named after Rossby was not established.",
  "confidence": "medium",
  "chapters": [
   "similarity",
   "turbulence"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Rossby_number",
   "https://en.wikipedia.org/wiki/Carl-Gustaf_Rossby"
  ],
  "group": "numbers"
 },
 {
  "id": "ensemble-average",
  "symbol": "⟨u⟩",
  "tex": "\\langle u \\rangle",
  "name": "Ensemble average ⟨u⟩",
  "meaning": "The mean over many independent realisations of a flow. Modern turbulence texts write it with angle brackets and define the fluctuation as u′ = u − ⟨u⟩. In simulations it is estimated by averaging over time, over space or over repeated runs, which raises the question of statistical convergence.",
  "introduced_by": "Not established",
  "year": "Unknown",
  "first_work": "",
  "popularised_by": "S. B. Pope's textbook Turbulent Flows (Cambridge University Press, 2000) uses angle brackets for the mean, and Wikipedia's article follows this style.",
  "story": "In 1895 Reynolds used an overbar for a space average. Statistical turbulence theory later treated velocity as a random field and averaged over an ensemble of realisations, marked with angle brackets. For stationary or homogeneous flows, time or space averages are assumed to equal the ensemble average; this is the ergodic assumption.",
  "original_form": "",
  "contested": "Overbars and angle brackets are both in use, sometimes for different averages in the same text. When ⟨·⟩ was first used for turbulence averages was not established.",
  "confidence": "low",
  "chapters": [
   "turbulence",
   "notation",
   "trust"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Reynolds_decomposition",
   "https://archive.org/details/papersonmechanic02reynrich"
  ],
  "group": "fluid"
 }
];

export const GROUPS = {
  calculus: 'Calculus',
  vectors: 'Vectors and tensors',
  fluid: 'Fluid quantities',
  numbers: 'Named numbers',
  numerics: 'Numerical analysis',
};
