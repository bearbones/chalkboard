// Milestones in computing flows, from the fact-checked research dossier. Each record:
//   { id, year, title, who, work, what, challenge, kind, detail, contested, confidence, chapters, sources }
// kind: the numerical difficulty it exposed or tamed (see KINDS).
// Regenerate with: node aids/fluid-course/dev/import-research.mjs <research dir>

export const MILESTONES = [
 {
  "id": "richardson-1911-finite-differences",
  "year": "1911",
  "title": "Richardson's finite-difference paper: iteration and h² extrapolation",
  "who": "Lewis Fry Richardson (1881–1953)",
  "work": "L. F. Richardson, 'The approximate arithmetical solution by finite differences of physical problems involving differential equations, with an application to the stresses in a masonry dam', Philosophical Transactions of the Royal Society of London, Series A 210 (1911) 307–357, doi:10.1098/rsta.1911.0009. Received (in revised form) 2 November 1909; read 13 January 1910. Abstract printed in Proc. R. Soc. Lond. A 83 (no. 563) (2 March 1910) 335–336, doi:10.1098/rspa.1910.0020.",
  "what": "Richardson replaced the derivatives in partial differential equations by central differences on a grid and solved the resulting large algebraic systems by hand. His worked example was the stress in a masonry dam. The paper contains an iterative scheme in which the current guess is corrected by a multiple of its residual, using a sequence of different multipliers (the ancestor of what is now called Richardson iteration). It also shows how to compute on two or more grid spacings and combine the answers to cancel the leading h² error. He developed the extrapolation idea much further in 1927 as 'the deferred approach to the limit'.",
  "challenge": "truncation error; slow solver convergence",
  "detail": "The 1910 abstract states the approach in one sentence: “In order to deal with irregular boundaries, analysis is replaced by arithmetic, continuous functions are represented by tables of numbers, differentials by central differences.” (https://archive.org/details/philtrans06244458). On extrapolation, the abstract says: “If the integral has been found for two or more sizes of h, more exact values of it can be extrapolated by this formula.” (same source). The full paper says: “Consequently, if the equation be integrated for several different values of h, extrapolation on the supposition that the error is of this form will give numbers very close to the infinitesimal integral.” (https://archive.org/details/philtrans04693161). The paper also includes a short time-stepping example for diffusion in a slab, with a space step of 0.1 and a time step of 0.001.",
  "contested": "Bibliographies give both 1910 and 1911. The paper was read to the Royal Society on 13 January 1910 and its abstract was printed in March 1910. The full paper is in Phil. Trans. A volume 210, which the publisher dates 1911. So 1910 is the presentation year and 1911 the year of the printed paper; record both. MacTutor's biography of John Crank says the simple finite-difference replacement for the heat equation was 'proposed by L F Richardson in 1910' and that Richardson's method was numerically unstable, which was not recognised until long computations by Crank, Nicolson and others. That makes it an early example of an unstable scheme going unnoticed. We did not check which of the 1910–1911 time-stepping formulas MacTutor means. Earlier drafts of this record relied on Wikipedia for the iteration and extrapolation credit. Both are now confirmed from the 1910 abstract and the 1911 text.",
  "confidence": "high",
  "chapters": [
   "discretization",
   "solvers",
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1098/rsta.1911.0009",
   "https://archive.org/details/philtrans04693161",
   "https://archive.org/details/philtrans06244458",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Crank/"
  ],
  "kind": "methods"
 },
 {
  "id": "richardson-1922-weather-prediction",
  "year": "1922",
  "title": "Weather Prediction by Numerical Process and the 145 hPa 'forecast'",
  "who": "Lewis Fry Richardson (1881–1953)",
  "work": "L. F. Richardson, Weather Prediction by Numerical Process. Cambridge University Press, 1922, xii+236 pp. Dover reprint 1965 with a new introduction by Sydney Chapman.",
  "what": "Richardson set out a complete method for forecasting the weather by solving the equations of atmospheric motion with finite differences on a grid of columns, and worked one example by hand. He started from observations at 0700 UTC on 20 May 1910, computed the initial rates of change in two columns over central Europe, and extrapolated them over six hours. The predicted change in surface pressure was 145 hPa (equivalently 145 mb) in six hours at a point in Bavaria, while the real barometer was nearly steady. The book also describes a 'forecast factory' of human computers working in parallel.",
  "challenge": "imbalanced initial data (spurious fast gravity waves); a time step too long for stability",
  "detail": "The pressure point was at 48.6°N, 11°E, about 65 km north-west of Munich. The computed tendency was multiplied by 21,600 s to give the change between 0400 and 1000 UTC, and the whole 'forecast' was twenty numbers (Lynch, Chapter 7). The example was worked out in France in 1916–1918, while Richardson served with the Friends Ambulance Unit, which he joined after resigning from the Met Office in May 1916. During the Battle of Champagne in April 1917 the working copy was sent to the rear and lost, and it was found some months later under a heap of coal (WPNP p. ix, quoted in Lynch Chapter 1). Richardson wrote: “It took me the best part of six weeks to draw up the computing forms and to work out the new distribution in two vertical columns for the first time. My office was a heap of hay in a cold rest billet.” (WPNP p. 219, quoted in Lynch Chapter 1, https://maths.ucd.ie/~plynch/Dream/Book/CHAP01.pdf). From the preface: “Perhaps some day in the dim future it will be possible to advance the computations faster than the weather advances and at a cost less than the saving to mankind due to the information gained. But that is a dream.” (WPNP p. vii, same source). Lynch's computer reconstruction gave 145.4 hPa against Richardson's 145.1 hPa. With the initial data balanced by a digital filter, the six-hour change was −0.9 hPa (Lynch, https://maths.ucd.ie/~plynch/Publications/CMMAP-Pp3-17.pdf).",
  "contested": "(1) The 'six weeks' story is a myth. Richardson's six weeks covered drawing up the forms plus the first calculation. Lynch notes that it is 'generally believed' the forecast took six weeks. He estimates about 960 hours of work, more likely spread over about two years at roughly ten hours a week. (2) This was not a forecast in the modern sense. Richardson computed only initial tendencies at two grid points, twenty numbers in all. (3) The failure is often blamed on a time step that broke the CFL limit. Lynch shows the root cause was imbalance in the initial data: “His extrapolation over six hours exacerbated the problem, but was not the root cause of it.” (https://maths.ucd.ie/~plynch/Publications/CMMAP-Pp3-17.pdf). (4) Richardson estimated 64,000 computers for his forecast factory. MacTutor rounds this to 60,000 people. Lynch (1993) reckoned that about a million would have been needed.",
  "confidence": "high",
  "chapters": [
   "discretization",
   "advection",
   "trust"
  ],
  "sources": [
   "https://maths.ucd.ie/~plynch/Dream/Book/CHAP01.pdf",
   "https://maths.ucd.ie/~plynch/Dream/Book/CHAP07.pdf",
   "https://maths.ucd.ie/~plynch/Publications/CMMAP-Pp3-17.pdf",
   "https://atmos.uw.edu/~dargan/542/Lynch_NWP50.pdf"
  ],
  "kind": "methods"
 },
 {
  "id": "richardson-gaunt-1927-deferred-approach",
  "year": "1927",
  "title": "'The deferred approach to the limit' (Richardson extrapolation)",
  "who": "Lewis Fry Richardson (1881–1953); J. Arthur Gaunt",
  "work": "L. F. Richardson and J. A. Gaunt, 'The deferred approach to the limit', Philosophical Transactions of the Royal Society of London, Series A 226 (1927) 299–361. doi:10.1098/rsta.1927.0008 (Part I, 'Single lattice', by Richardson, pp. 299–349; Part II by Gaunt).",
  "what": "This paper set out systematically what is now called Richardson extrapolation. Compute a quantity on two or more grid spacings h. If the error behaves like k₂h² + k₄h⁴ + …, combine the results to cancel the leading terms ('h² extrapolation', 'h⁴ extrapolation'). As an illustration, Richardson estimated π from regular polygons inscribed in a circle. The same idea underlies the grid-convergence studies and error estimates used to verify CFD codes today.",
  "challenge": "truncation error; estimating discretization error",
  "detail": "Richardson's statement of the idea: “Although the infinitesimal calculus has been a splendid success, yet there remain problems in which it is cumbrous or unworkable. When such difficulties are encountered it may be well to return to the manner in which they did things before the calculus was invented, postponing the passage to the limit until after the problem has been solved for a moderate number of moderately small differences.” (Richardson 1927, quoted in Lynch, https://maths.ucd.ie/~plynch/Publications/2gon.pdf). Lynch shows that combining inscribed 2-, 3-, 4-, 5- and 6-gons gives π ≈ 3.14159264.",
  "contested": "The basic h² extrapolation already appears in Richardson's 1910–1911 dam paper; the 1927 paper is its systematic development. Wikipedia notes that a form of the idea was already known to Christiaan Huygens in the 17th century, in his calculation of π. Bibliographies differ on whether to list the paper under Richardson alone (Part I) or under Richardson and Gaunt.",
  "confidence": "high",
  "chapters": [
   "trust",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.1098/rsta.1927.0008",
   "https://maths.ucd.ie/~plynch/Publications/2gon.pdf",
   "https://en.wikipedia.org/wiki/Richardson_extrapolation"
  ],
  "kind": "trust"
 },
 {
  "id": "cfl-1928",
  "year": "1928",
  "title": "The Courant–Friedrichs–Lewy condition",
  "who": "Richard Courant (1888–1972), Kurt Otto Friedrichs (1901–1982), Hans Lewy (1904–1988)",
  "work": "R. Courant, K. Friedrichs, H. Lewy, 'Über die partiellen Differenzengleichungen der mathematischen Physik', Mathematische Annalen 100 (1928) 32–74. doi:10.1007/BF01448839. English translation by Phyllis Fox: 'On the partial difference equations of mathematical physics', AEC Report NYO-7689 (1956), republished in IBM Journal of Research and Development 11(2) (March 1967) 215–234, doi:10.1147/rd.112.0215.",
  "what": "The paper studied difference equations for elliptic, parabolic and hyperbolic problems. It showed that their solutions converge to solutions of the differential equations as the mesh is refined, and used this convergence to prove that the differential equations have solutions. For hyperbolic initial-value problems, convergence holds only if the ratio of the time and space mesh widths satisfies an inequality set by the characteristics. Put simply, the numerical domain of dependence must contain the true one. This is the CFL condition used today to choose the time step of explicit schemes.",
  "challenge": "instability; the time-step limit for explicit schemes",
  "detail": "From the 1967 translation: “for the case of the initial value problem for hyperbolic equations, convergence is obtained only if the ratio of the mesh widths in different directions satisfies certain inequalities which in turn depend on the position of the characteristics relative to the mesh.” (https://mesonet2.agron.iastate.edu/pickup/CFL.pdf). The paper also has an appendix linking elliptic difference equations to random walks. The IBM editor's note says Phyllis Fox made the translation at the AEC Computing Facility at New York University, with suggestions from Eugene Isaacson.",
  "contested": "The CFL condition is usually taught as a rule for keeping computer simulations stable. That was not its purpose in 1928, before electronic computers existed. The introduction says: “Nowhere do we assume the existence of the solution to the differential equation problem—on the contrary, we obtain a simple existence proof by using the limiting process.” (1967 translation, https://mesonet2.agron.iastate.edu/pickup/CFL.pdf). The condition is necessary for convergence but not sufficient. On credit among the three authors, Peter Lynch writes that Hans Lewy discovered the stability criterion (Lynch NWP50 slides). We found no second source for this, so present it as Lynch's account. The 1956 date of the NYO-7689 report comes from secondary bibliographies; the IBM note names the report but gives no date.",
  "confidence": "high",
  "chapters": [
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1007/BF01448839",
   "https://mesonet2.agron.iastate.edu/pickup/CFL.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Lewy/",
   "https://atmos.uw.edu/~dargan/542/Lynch_NWP50.pdf"
  ],
  "kind": "stability"
 },
 {
  "id": "thom-1933-cylinder",
  "year": "1933",
  "title": "Thom's hand-computed viscous flow past a cylinder",
  "who": "Alexander Thom (1894–1985)",
  "work": "A. Thom, 'The flow past circular cylinders at low speeds', Proceedings of the Royal Society of London, Series A 141 (no. 845) (1 September 1933) 651–669. doi:10.1098/rspa.1933.0146",
  "what": "Thom solved the equations of steady viscous flow past a circular cylinder by hand, using iterative 'arithmetical methods' on a grid, and compared the results with experiments. It is usually cited as the first numerical solution of the Navier–Stokes equations for flow past a bluff body. Later secondary sources say he worked with the stream function and vorticity, at a Reynolds number of about 20, and obtained the drag and pressure distribution.",
  "challenge": "cost of hand computation; slow convergence of iterative solvers",
  "detail": "From the abstract: “This paper deals chiefly with calculations and experiments on the flow past circular cylinders, but the arithmetical methods of solution of the equations of steady viscous flow proposed and used in Section I, are applicable to other equations and may be of interest.” (Semantic Scholar record of the abstract). When Thom was appointed to the Oxford chair of engineering science, a Nature notice (Nature 154 (1944) 111) said that at Glasgow he made “exhaustive studies of the flow of a fluid past a cylinder” and that “In the course of his studies he developed an arithmetical method of solution of the equations of flow for both ideal and viscous fluids.” (https://www.nature.com/articles/154111a0). The work came before Southwell's relaxation books and before electronic computers.",
  "contested": "The Reynolds number is reported differently: arXiv:1901.06752 says Re = 20, and arXiv:1407.1731 says Re = 10–20. Both are secondary, and we did not see the paper's text. The author's identity is confirmed: the 1944 Nature notice ties the cylinder studies and the arithmetical method to Dr Alexander Thom, the Glasgow aeronautics lecturer who later became famous for surveying megalithic sites. Claims that this was the 'first CFD' are loose, since Richardson had computed other PDE problems numerically by 1910.",
  "confidence": "medium",
  "chapters": [
   "discretization",
   "solvers",
   "similarity"
  ],
  "sources": [
   "https://doi.org/10.1098/rspa.1933.0146",
   "https://www.nature.com/articles/154111a0",
   "https://arxiv.org/pdf/1901.06752",
   "https://arxiv.org/pdf/1407.1731"
  ],
  "kind": "methods"
 },
 {
  "id": "southwell-relaxation",
  "year": "1935",
  "title": "Southwell's relaxation methods",
  "who": "Richard Vynne Southwell (1888–1970) and his Oxford group, including Derman Christopherson",
  "work": "R. V. Southwell, 'Stress-calculation in frameworks by the method of \"systematic relaxation of constraints\"—I and II', Proc. R. Soc. Lond. A 151 (no. 872) (August 1935) 56–95, doi:10.1098/rspa.1935.0134; R. V. Southwell, Relaxation Methods in Engineering Science: a treatise on approximate computation (Oxford University Press, 1940); R. V. Southwell, Relaxation Methods in Theoretical Physics (Oxford University Press, 1946).",
  "what": "In the 1930s and 1940s Southwell developed 'relaxation': a systematic hand procedure for solving the large linear systems that come from finite-difference grids. The human computer tracks the residuals, meaning how far each grid equation is from being satisfied, and adjusts grid values to shrink them. The group applied it to frameworks, stress analysis, potential flow and other field problems before electronic computers existed. On electronic computers, the human judgement about where to relax gave way to fixed sweep orders: the older Gauss–Seidel iteration and successive over-relaxation (SOR), analysed by Frankel (1950) and Young (1954).",
  "challenge": "slow solver convergence",
  "detail": "The method started with framed structures in 1935 and was extended to continuous fields in the 1940 and 1946 books. Southwell moved to Oxford as Professor of Engineering Science in 1929 and was Rector of Imperial College from 1942 to 1948 (Wikipedia). Royal Society memoir: D. G. Christopherson, 'Richard Vynne Southwell, 1888–1970', Biogr. Mem. Fellows R. Soc. 18 (1972) 549–565, doi:10.1098/rsbm.1972.0020. SOR references: S. P. Frankel, Math. Tables Aids Comput. 4 (1950) 65–75; D. M. Young, Trans. Amer. Math. Soc. 76 (1954) 92–111 (Crossref).",
  "contested": "An earlier draft called Gauss–Seidel a 'later machine method'. It is not: the iteration dates from the 19th century and is older than relaxation. Only SOR's theory came later. Wikipedia, citing a 1989 NASA technical memorandum (Demuren, TM 102359), says that Southwell used multiple grids in 1935, which would anticipate multigrid. We did not verify this.",
  "confidence": "high",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.1098/rspa.1935.0134",
   "https://doi.org/10.1098/rsbm.1972.0020",
   "https://en.wikipedia.org/wiki/Richard_V._Southwell",
   "https://doi.org/10.1090/S0025-5718-1950-0046149-3"
  ],
  "kind": "solvers"
 },
 {
  "id": "von-neumann-1944-shocks",
  "year": "1944",
  "title": "Von Neumann's 1944 report on computing shocks",
  "who": "John von Neumann (1903–1957)",
  "work": "J. von Neumann, 'Proposal and analysis of a numerical method for the treatment of hydrodynamical shock problems', National Defense Research Committee Report AM-551, March 1944 (as cited by Lax 1954 and by Lax & Wendroff 1960).",
  "what": "A wartime report proposing a way to compute flows containing shock waves numerically. It came out of von Neumann's wartime work on shocks; MacTutor notes that his work from the start of the Second World War concerned hydrodynamics and the theory of shocks, and that he saw numerical work as the most promising way in. Peter Lax's 1954 paper on weak solutions and the 1960 Lax–Wendroff paper both cite it. That places it at the start of the line of work that computes shocks with difference schemes instead of fitting them by hand.",
  "challenge": "oscillations at shocks",
  "detail": "The citations appear in the reference lists of Lax, CPAM 7 (1954) 159–193 ('hydro-dynamic', 'Report AM551 1944') and Lax & Wendroff, CPAM 13 (1960) 217–237 ('hydro-dynamical', 'AM-551 March 1944'), as deposited with Crossref. The two citations spell the title slightly differently.",
  "contested": "We did not see the report itself. Later accounts commonly say it replaced the fluid by a chain of interacting mass points, so that a shock appears without being tracked, with oscillations behind it. Treat that description as unverified. The dissipative 'artificial viscosity' approach came later, in the 1950 von Neumann–Richtmyer paper.",
  "confidence": "medium",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://api.crossref.org/works/10.1002/cpa.3160070112",
   "https://api.crossref.org/works/10.1002/cpa.3160130205",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Von_Neumann/"
  ],
  "kind": "shocks"
 },
 {
  "id": "crank-nicolson-1947",
  "year": "1947",
  "title": "The Crank–Nicolson method",
  "who": "John Crank (1916–2006) and Phyllis Nicolson (1917–1968)",
  "work": "J. Crank and P. Nicolson, 'A practical method for numerical evaluation of solutions of partial differential equations of the heat-conduction type', Proceedings of the Cambridge Philosophical Society 43(1) (January 1947) 50–67. doi:10.1017/S0305004100023197. Reprinted in Advances in Computational Mathematics 6 (1996) 207–226, doi:10.1007/BF02127704.",
  "what": "For the heat equation, Crank and Nicolson averaged the spatial difference between the old and new time levels. The resulting scheme is second-order accurate in time and space and stays stable for any time step, at the cost of solving a simple tridiagonal linear system each step. The work grew out of a wartime request to Douglas Hartree about a very nonlinear heat-conduction problem. Hartree saw how to approach it and suggested Crank and Nicolson to do the detailed work. The paper also gave an early, brief account of what became von Neumann stability analysis.",
  "challenge": "stiffness (explicit diffusion schemes need Δt below about Δx²/2κ)",
  "detail": "MacTutor quotes Charlotte Froese Fischer: the problem was “the fire (burning) problem of great importance in wartime conditions. This was another heat-conduction problem, very non-linear and with a temperature-dependent term. Hartree was asked to look into it.” (https://mathshistory.st-andrews.ac.uk/Biographies/Nicolson/). According to the same account, an explicit method suggested by others gave an oscillating error. The implicit method needed more work per step but removed the oscillations and allowed much larger time steps. Part III of Nicolson's thesis treated heat flow in a medium where heat is released by chemical processes.",
  "contested": "An earlier draft said Hartree 'suggested the problem'. According to Fischer's account, the problem was put to Hartree, and he suggested the people: Crank and Nicolson. Crossref dates the Advances in Computational Mathematics reprint to 1996; MacTutor gives 1997. 'Unconditionally stable' does not mean well-behaved. When κΔt/Δx² is above 1/2, the highest Fourier modes flip sign each step, giving slowly decaying spurious oscillations. That is why the less accurate backward Euler method is often used for very large steps. In time, the method is the trapezoidal rule.",
  "confidence": "high",
  "chapters": [
   "stiffness"
  ],
  "sources": [
   "https://doi.org/10.1017/S0305004100023197",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Nicolson/",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Crank/",
   "https://doi.org/10.1007/BF02127704"
  ],
  "kind": "stiffness"
 },
 {
  "id": "von-neumann-stability-analysis",
  "year": "1947",
  "title": "Von Neumann (Fourier) stability analysis reaches print",
  "who": "John von Neumann (method); first printed accounts by J. Crank and P. Nicolson (1947), J. G. Charney, R. Fjørtoft and J. von Neumann (1950), and G. G. O'Brien, M. A. Hyman and S. Kaplan (1950)",
  "work": "J. Crank and P. Nicolson, Proc. Camb. Phil. Soc. 43 (1947) 50–67, doi:10.1017/S0305004100023197; J. G. Charney, R. Fjørtoft, J. von Neumann, Tellus 2 (1950) 237–254, doi:10.3402/tellusa.v2i4.8607; G. G. O'Brien, M. A. Hyman, S. Kaplan, 'A study of the numerical solution of partial differential equations', Journal of Mathematics and Physics 29 (April 1950) 223–251, doi:10.1002/sapm1950291223.",
  "what": "The method substitutes a single Fourier mode into a linear difference scheme and asks whether its amplitude grows from one step to the next. If no mode grows, the scheme is stable. It is credited to von Neumann's work at Los Alamos, but it entered the literature through other people's papers. It is the standard tool behind statements such as 'FTCS is unstable for advection' and 'explicit diffusion needs κΔt/Δx² ≤ 1/2'.",
  "challenge": "instability",
  "detail": "Wikipedia says the method was briefly described in Crank & Nicolson (1947) and given a more rigorous treatment in the 1950 paper co-authored by von Neumann. That 1950 Tellus paper expands perturbations in a finite Fourier series and calls its procedure heuristic, 'patterned after the rigorous method of Courant, Friedrichs, and Lewy (1928)'. O'Brien, Hyman and Kaplan (1950) is cited by Lax & Richtmyer (1956) and by Hirt (1968), who both date it 1950 (Crossref reference lists).",
  "contested": "Wikipedia says the method was 'developed at Los Alamos'. We did not confirm the commonly repeated date of 1944 or any wartime origin, so the record no longer claims one. Von Neumann analysis is exact only for linear constant-coefficient problems with periodic boundaries. It does not detect nonlinear instabilities like Phillips's. Lax & Richtmyer (1956) treat the von Neumann condition as necessary, and give extra conditions under which it is also sufficient for stability.",
  "confidence": "medium",
  "chapters": [
   "advection",
   "stiffness"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Von_Neumann_stability_analysis",
   "https://doi.org/10.1002/sapm1950291223",
   "https://doi.org/10.3402/tellusa.v2i4.8607",
   "https://api.crossref.org/works/10.1002/cpa.3160090206"
  ],
  "kind": "stability"
 },
 {
  "id": "eniac-1950-forecast",
  "year": "1950",
  "title": "The first computer weather forecasts (ENIAC)",
  "who": "Jule Charney, Ragnar Fjørtoft, John von Neumann; the ENIAC runs were carried out by Charney, Fjørtoft, John Freeman, George Platzman and Joseph Smagorinsky",
  "work": "J. G. Charney, R. Fjørtoft, J. von Neumann, 'Numerical integration of the barotropic vorticity equation', Tellus 2(4) (1950) 237–254. doi:10.3402/tellusa.v2i4.8607",
  "what": "The Princeton Meteorology Project solved the barotropic vorticity equation for the 500 hPa surface on ENIAC at Aberdeen, Maryland. Each time step computed the advection of vorticity and then solved a Poisson equation for the height tendency, using a direct Fourier method devised by von Neumann. Four 24-hour forecasts were made from data for 5 January, 30–31 January and 13 February 1949, on a 19 × 16 grid with 736 km spacing at the North Pole. Charney's filtered, quasi-geostrophic equation removes the fast gravity waves that had spoiled Richardson's attempt, which allowed long time steps.",
  "challenge": "stability and time-step size; gravity-wave noise; computing cost",
  "detail": "The expedition began on 5 March 1950 and went on for 33 days and nights; about 100,000 punch cards were punched (Lynch 2008, BAMS 89(1) 45–56, https://maths.ucd.ie/~plynch/Publications/BAMS-ENIAC.pdf). Time steps of 1, 2 and 3 hours were tried, and on such a coarse grid all were stable. Each 24-hour forecast took about 24 hours, including offline reading, punching and interfiling of cards. From the abstract: “Approximate conditions necessary to insure the mathematical stability of the difference equation are derived.” (https://api.crossref.org/works/10.3402/tellusa.v2i4.8607). The stability analysis, the paper says, is a heuristic procedure “patterned after the rigorous method of Courant, Friedrichs, and Lewy (1928)”. Charney later said: “It mattered little that the twenty-four-hour prediction was twenty-four hours in the making. That was purely a technological problem.” (Charney 1955, quoted in Lynch 2008). Lynch's 2008 MATLAB re-run of the main loop took about 30 ms.",
  "contested": "(1) Per CFvN as reported by Lynch, each 24-hour forecast took about 24 hours, including offline card handling. Guinness World Records instead says the whole process, including all four data sets, took around 24 hours, which conflicts with Lynch. (2) These were retrospective forecasts (hindcasts) from 1949 data, not real-time predictions. (3) Lynch's 2008 verification found that, by root-mean-square error, a no-change (persistence) forecast beat the ENIAC forecast in three of the four cases. By the S1 skill score, however, all four forecasts showed skill and three were substantially better than persistence. An earlier draft cited a Smithsonian count of 12-hour and 24-hour forecasts; we could not confirm it, so it was removed.",
  "confidence": "high",
  "chapters": [
   "advection",
   "solvers",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.3402/tellusa.v2i4.8607",
   "https://maths.ucd.ie/~plynch/Publications/BAMS-ENIAC.pdf",
   "https://maths.ucd.ie/~plynch/Publications/CMMAP-Pp3-17.pdf",
   "https://www.guinnessworldrecords.com/world-records/775520-first-computer-assisted-weather-forecast"
  ],
  "kind": "methods"
 },
 {
  "id": "von-neumann-richtmyer-1950",
  "year": "1950",
  "title": "Von Neumann–Richtmyer artificial viscosity",
  "who": "John von Neumann (1903–1957) and Robert D. Richtmyer (1910–2003)",
  "work": "J. von Neumann and R. D. Richtmyer, 'A method for the numerical calculation of hydrodynamic shocks', Journal of Applied Physics 21(3) (March 1950) 232–237. doi:10.1063/1.1699639",
  "what": "They added an artificial dissipative term to the equations of compressible flow so that a shock is spread smoothly over a few grid cells. Ordinary difference equations can then march through it without tracking the discontinuity. The extra term's influence shrinks as the mesh is refined. They also derived the condition the difference scheme must satisfy to be stable.",
  "challenge": "oscillations at shocks",
  "detail": "From the abstract: “The equations of hydrodynamics are modified by the inclusion of additional terms which greatly simplify the procedures needed for stepwise numerical solution of the equations in problems involving shocks. The quantitative influence of these terms can be made as small as one wishes by choice of a sufficiently fine mesh for the numerical integrations.” (https://api.crossref.org/works/10.1063/1.1699639). Godunov recalled that in autumn 1953 Keldysh and Gelfand asked him to develop a variant of this artificial-viscosity method for the new Soviet computer 'Strela' (https://arxiv.org/abs/0810.0649).",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1063/1.1699639",
   "https://api.crossref.org/works/10.1063/1.1699639",
   "https://en.wikipedia.org/wiki/Robert_D._Richtmyer",
   "https://arxiv.org/abs/0810.0649"
  ],
  "kind": "shocks"
 },
 {
  "id": "courant-isaacson-rees-1952",
  "year": "1952",
  "title": "Courant–Isaacson–Rees upwind scheme",
  "who": "Richard Courant (1888–1972), Eugene Isaacson, Mina Rees (1902–1997)",
  "work": "R. Courant, E. Isaacson, M. Rees, 'On the solution of nonlinear hyperbolic differential equations by finite differences', Communications on Pure and Applied Mathematics 5(3) (August 1952) 243–255. doi:10.1002/cpa.3160050303",
  "what": "For hyperbolic systems, the authors built difference schemes that trace characteristics backward and take information from the side it actually comes from. This paper is the usual origin given for upwind differencing. First-order upwind schemes are stable under a CFL condition, but they smear sharp gradients, an effect called numerical diffusion.",
  "challenge": "numerical diffusion; instability of centred differences for advection",
  "detail": "MacTutor: in 1946 the US Navy invited Mina Rees to head the mathematics branch of the Office of Naval Research, and in 1949 she became Director of its Mathematical Sciences Division. Tracing back along characteristics and interpolating is also the core idea of semi-Lagrangian advection, used in later 'stable fluids' methods. Lax (1954) and Lax & Richtmyer (1956) both cite the paper (Crossref reference lists).",
  "contested": "Some modern CFD texts present the simple first-order upwind scheme without credit, or cite later books such as Patankar (1980). The CIR paper is the earlier source of the idea.",
  "confidence": "high",
  "chapters": [
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1002/cpa.3160050303",
   "https://en.wikipedia.org/wiki/Upwind_scheme",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Rees/"
  ],
  "kind": "stability"
 },
 {
  "id": "hestenes-stiefel-1952",
  "year": "1952",
  "title": "The conjugate gradient method",
  "who": "Magnus R. Hestenes and Eduard Stiefel (1909–1978)",
  "work": "M. R. Hestenes and E. Stiefel, 'Methods of conjugate gradients for solving linear systems', Journal of Research of the National Bureau of Standards 49(6) (December 1952) 409–436, Research Paper 2379. doi:10.6028/jres.049.044",
  "what": "The paper gives an algorithm for solving Ax = k when A is symmetric and positive definite. Each step searches along a direction conjugate to all earlier ones, so in exact arithmetic the method reaches the solution in at most n steps. The authors argued it suits machine computation: the matrix is left unaltered, its zeros are preserved, little storage is needed, and the method is 'especially suited' to systems from difference equations for boundary-value problems.",
  "challenge": "slow solver convergence; storage cost",
  "detail": "From the paper: “The method of conjugate gradients was developed independently by E. Stiefel of the Institute of Applied Mathematics at Zurich and by M. R. Hestenes with the cooperation of J. B. Rosser, G. Forsythe, and L. Paige of the Institute for Numerical Analysis, National Bureau of Standards.” (https://nvlpubs.nist.gov/nistpubs/jres/049/jresv49n6p409_a1b.pdf). Stiefel and Rosser reported on the method at a symposium held by the Institute for Numerical Analysis on the UCLA campus, 23–25 August 1951. The paper is dated Los Angeles, 8 May 1952, and mentions a closely related routine by Lanczos.",
  "contested": "CG is often said to have been introduced purely as a direct method. The paper itself calls it “an iterative method which terminates in at most n steps if no rounding-off errors are encountered.” Among its design aims it lists that a method “should insure rapid convergence if the number of steps required for the solution is infinite.” (same source). Round-off does destroy exact termination. The method's later wide use as a preconditioned iterative solver is standard history, but we did not check it here.",
  "confidence": "high",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.6028/jres.049.044",
   "https://nvlpubs.nist.gov/nistpubs/jres/049/jresv49n6p409_a1b.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Stiefel/"
  ],
  "kind": "solvers"
 },
 {
  "id": "lax-1954-lax-friedrichs",
  "year": "1954",
  "title": "Weak solutions and the Lax–Friedrichs scheme",
  "who": "Peter D. Lax (1926–2025); Kurt O. Friedrichs (1901–1982)",
  "work": "P. D. Lax, 'Weak solutions of nonlinear hyperbolic equations and their numerical computation', Communications on Pure and Applied Mathematics 7(1) (February 1954) 159–193, doi:10.1002/cpa.3160070112. Related: K. O. Friedrichs, 'Symmetric hyperbolic linear differential equations', CPAM 7(2) (May 1954) 345–392, doi:10.1002/cpa.3160070206.",
  "what": "Lax developed weak solutions, which satisfy conservation laws in integral form and so can contain shocks, and showed how to compute them with difference schemes. The scheme now called Lax–Friedrichs takes the forward-time, centred-space scheme, which is unstable for advection, and replaces the centre value by the average of its two neighbours. This adds numerical diffusion and makes the scheme stable under a CFL condition, at the price of first-order accuracy and smeared shocks.",
  "challenge": "instability of centred schemes; numerical diffusion; oscillations at shocks",
  "detail": "The reference list cites von Neumann's 1944 shock report (NDRC AM-551), von Neumann–Richtmyer (1950), Courant–Isaacson–Rees (1952), CFL (1928) and Lax's 1952 Los Alamos report LAMS-1332 (Crossref). MacTutor: Lax was at Los Alamos in 1945–46 and returned to spend 1950 there. Godunov recalled that a scheme by A. I. Zhukov, which Godunov studied in Moscow in autumn 1953, “exactly coincided with the scheme published by P. D. Lax one year later”, and that Zhukov explained the automatic smearing of shocks by analysing the truncation terms as numerical viscosity (https://arxiv.org/abs/0810.0649).",
  "contested": "The scheme carries two names but did not come from a joint paper. It is commonly attributed to Lax's 1954 paper and to Friedrichs's 1954 work on symmetric hyperbolic systems. Wikipedia names it after both without giving a date, and we did not check how Friedrichs used it. Older texts sometimes call it simply 'the Lax method'. Godunov's account suggests the same scheme was found independently in the USSR around the same time.",
  "confidence": "medium",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1002/cpa.3160070112",
   "https://doi.org/10.1002/cpa.3160070206",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Lax_Peter/",
   "https://arxiv.org/abs/0810.0649"
  ],
  "kind": "shocks"
 },
 {
  "id": "harlow-pic-1955",
  "year": "1955",
  "title": "The particle-in-cell (PIC) method",
  "who": "Francis H. Harlow (1928–2016), with M. W. Evans, Los Alamos Group T-3",
  "work": "F. H. Harlow, 'A machine calculation method for hydrodynamic problems', Los Alamos Scientific Laboratory report (1955; often given as LAMS-1956); F. H. Harlow, 'Hydrodynamic problems involving large fluid distortions', Journal of the ACM 4(2) (April 1957) 137–142, doi:10.1145/320868.320871; M. W. Evans and F. H. Harlow, 'The particle-in-cell method for hydrodynamic calculations', Los Alamos Scientific Laboratory report LA-2139 (1957).",
  "what": "PIC represents the fluid by particles that carry mass through a fixed grid. Pressure and velocity changes are computed on the grid, and the particles then move with velocities interpolated from it. This handles very large distortions and interfaces between materials without the tangling that afflicts a mesh that moves with the fluid. Harlow developed it at Los Alamos for compressible flows of several materials.",
  "challenge": "mesh tangling in Lagrangian methods; numerical diffusion of purely grid-based advection",
  "detail": "Wikipedia says PIC methods were in use as early as 1955, before the first Fortran compilers, and cites Harlow's 1955 report. Buneman, Dawson, Hockney, Birdsall and others later popularised PIC for plasma simulation. Harlow's account of his group is 'Fluid dynamics in Group T-3 Los Alamos National Laboratory', J. Comput. Phys. 195 (2004) 414–433, doi:10.1016/j.jcp.2003.09.031. Lax & Wendroff (1960) already cite the 1957 J. ACM paper (Crossref).",
  "contested": "We could not confirm the report number LAMS-1956, which is easily mistaken for a year; Wikipedia's citation gives the 1955 report without a number. Harlow's own 2004 publication list (Crossref deposit) begins the PIC line with the 1957 J. ACM paper and LA-2139. Treat 1955 as the first internal use and 1957 as the first open publication.",
  "confidence": "medium",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Particle-in-cell",
   "https://doi.org/10.1145/320868.320871",
   "https://api.crossref.org/works/10.1016/j.jcp.2003.09.031",
   "https://en.wikipedia.org/wiki/Francis_H._Harlow"
  ],
  "kind": "methods"
 },
 {
  "id": "lax-richtmyer-1956",
  "year": "1956",
  "title": "The Lax–Richtmyer equivalence theorem",
  "who": "Peter D. Lax (1926–2025) and Robert D. Richtmyer (1910–2003)",
  "work": "P. D. Lax and R. D. Richtmyer, 'Survey of the stability of linear finite difference equations', Communications on Pure and Applied Mathematics 9(2) (May 1956) 267–293. doi:10.1002/cpa.3160090206",
  "what": "The paper surveyed stability theory for linear difference schemes and proved the equivalence theorem: a consistent finite-difference approximation to a properly posed linear initial-value problem converges if and only if it is stable. This placed the earlier ideas of CFL and von Neumann inside one general framework. It is the reason numerical analysts prove stability and consistency instead of proving convergence directly.",
  "challenge": "instability; trusting a scheme's convergence",
  "detail": "The theorem as stated in Section 8: “Given a properly posed initial value problem (1), (2) and a finite difference approximation C(Δt) to it that satisfies the consistency condition, stability is a necessary and sufficient condition that C(Δt) be a convergent approximation.” The paper opens: “Beginning with the discovery by Courant, Friedrichs and Lewy [1] of the conditional stability of certain finite difference approximations to partial differential equations, the subject of stability has been variously discussed in the literature” (https://doi.org/10.1002/cpa.3160090206). It also gives conditions under which the von Neumann condition is sufficient as well as necessary. The reference list includes CFL (1928), Courant–Isaacson–Rees (1952), Friedrichs (1954), O'Brien, Hyman and Kaplan (1950), von Neumann–Richtmyer (1950) and Lax's 1955 Berkeley symposium talk (Crossref). Richtmyer's book Difference Methods for Initial-Value Problems (1957; second edition with K. W. Morton, 1967) spread the framework.",
  "contested": "The result is often called the 'Lax equivalence theorem'. MacTutor says Lax's work on it was 'inspired by Richtmyer'. It applies only to linear problems. The paper explicitly sets rounding errors aside, and schemes for nonlinear problems with shocks need further conditions.",
  "confidence": "high",
  "chapters": [
   "advection",
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1002/cpa.3160090206",
   "https://api.crossref.org/works/10.1002/cpa.3160090206",
   "https://en.wikipedia.org/wiki/Lax_equivalence_theorem",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Lax_Peter/"
  ],
  "kind": "stability"
 },
 {
  "id": "phillips-1956-gcm",
  "year": "1956",
  "title": "Phillips's first general circulation model",
  "who": "Norman A. Phillips (1923–2019)",
  "work": "N. A. Phillips, 'The general circulation of the atmosphere: a numerical experiment', Quarterly Journal of the Royal Meteorological Society 82(352) (April 1956) 123–164. doi:10.1002/qj.49708235202",
  "what": "Phillips ran a two-level quasi-geostrophic model at Princeton, starting from an atmosphere in relative rest and adding heating and friction. A realistic jet stream, westerly surface winds in middle latitudes and a growing large-scale disturbance developed on their own. It is regarded as the first successful general circulation (climate) model. After about a month of simulated time the solution blew up.",
  "challenge": "nonlinear instability; aliasing",
  "detail": "From the abstract: “Truncation errors eventually put an end to the forecast by producing a large fictitious increase in energy.” (https://api.crossref.org/works/10.1002/qj.49708235202). Weart's AIP history says the grid covered a cylinder '17 cells high and 16 in circumference', and that the computer held five kilobytes of memory with a ten-kilobyte magnetic drum. According to Wikipedia, the paper won the first Napier Shaw Memorial Prize of the Royal Meteorological Society.",
  "contested": "Weart writes that after about twenty simulated days the flow began to look strange, and by thirty days the numbers had gone off into conditions never seen on Earth. Phillips and colleagues at first suspected round-off error, and smoothing tricks did not cure the blow-up. Phillips's 1959 analysis traced it to nonlinear computational instability caused by aliasing. Wikipedia's article on Phillips gives the page range once as 123–154, a typo; the correct range is 123–164.",
  "confidence": "high",
  "chapters": [
   "turbulence",
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1002/qj.49708235202",
   "https://history.aip.org/climate/GCM.htm",
   "https://history.aip.org/climate/arakawa.htm",
   "https://en.wikipedia.org/wiki/Norman_A._Phillips"
  ],
  "kind": "methods"
 },
 {
  "id": "phillips-1959-nonlinear-instability",
  "year": "1959",
  "title": "Nonlinear computational instability (aliasing)",
  "who": "Norman A. Phillips (1923–2019)",
  "work": "N. A. Phillips, 'An example of non-linear computational instability', in B. Bolin (ed.), The Atmosphere and the Sea in Motion (Rossby Memorial Volume), Rockefeller Institute Press, New York, 1959, pp. 501–504.",
  "what": "Phillips explained why long integrations can blow up even when the linear stability conditions are met. A grid cannot represent waves shorter than about two grid intervals. Products of waves in the nonlinear terms create such short waves, and the grid misreads them as longer ones (aliasing). Energy then piles up spuriously at the smallest resolved scales until the run fails.",
  "challenge": "aliasing; nonlinear instability",
  "detail": "Weart's notes quote the paper (p. 501): “the grid system cannot resolve wave lengths shorter than about 2 grid intervals” and “interprets them incorrectly as long waves.” (https://history.aip.org/climate/arakawa.htm). Three families of remedies followed: periodic smoothing of the shortest waves, finite-difference schemes that conserve energy and enstrophy (Arakawa 1966), and dealiasing in spectral methods (Orszag 1969/1971).",
  "contested": "Only the starting page (501) is confirmed, through Weart's notes. The full page range, publisher and title come from standard bibliographies. Arakawa's 1966 paper (reprinted 1997) cites Phillips (1959) (Crossref). We did not see the paper itself.",
  "confidence": "medium",
  "chapters": [
   "turbulence",
   "advection"
  ],
  "sources": [
   "https://history.aip.org/climate/arakawa.htm",
   "https://api.crossref.org/works/10.1006/jcph.1997.5697"
  ],
  "kind": "turbulence"
 },
 {
  "id": "godunov-1959",
  "year": "1959",
  "title": "Godunov's scheme and Godunov's theorem",
  "who": "Sergei K. Godunov",
  "work": "S. K. Godunov, 'Разностный метод численного расчета разрывных решений уравнений гидродинамики' [A difference method for the numerical computation of discontinuous solutions of the equations of hydrodynamics], Matematicheskii Sbornik 47(89), no. 3 (1959) 271–306. An English translation circulated as US Joint Publications Research Service report JPRS 7226. The scheme was first described in Godunov's PhD thesis, defended 4 November 1954.",
  "what": "Godunov's scheme treats the solution as constant within each cell. At every cell interface it solves the Riemann problem, meaning two constant states meeting, to get the flux, then updates the cell averages in conservation form. The work also contains the result now called Godunov's theorem: a linear scheme that creates no new maxima or minima can be at most first-order accurate. This explains why linear higher-order schemes oscillate at shocks and why later methods (FCT, TVD limiters) had to be nonlinear.",
  "challenge": "oscillations at shocks; numerical diffusion",
  "detail": "In his reminiscences Godunov says that in autumn 1953 Keldysh and Gelfand asked him to develop a variant of the von Neumann–Richtmyer artificial-viscosity method in time for the 'Strela' computer. He writes that he could show “for the linear case that only the first order schemes conserve the monotonicity”. He defended the scheme in his thesis on 4 November 1954, but “this work was published only in 1959”: one journal rejected it as purely mathematical, another as not mathematical enough, and I. G. Petrovskii helped place it in Matematicheskii Sbornik. He adds: “If I had received this paper one year earlier, the \"Godunov's scheme\" would never have been constructed.” This refers to Lax's 1954 paper. All quotations are from the English translation by Feodoritova and Deledicque (https://arxiv.org/abs/0810.0649). A shorter English version is J. Comput. Phys. 153 (1999) 6–25, doi:10.1006/jcph.1999.6271. Lax & Wendroff (1960) already cite the 1959 paper (Crossref).",
  "contested": "Dating: 1954 is the thesis (presentation) year and 1959 the publication year; record both. Godunov's own reference list dates the JPRS 7226 translation to 1969, and we did not see the translation. English translations of the title vary between 'difference scheme' and 'difference method'.",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://arxiv.org/abs/0810.0649",
   "https://doi.org/10.1006/jcph.1999.6271",
   "https://en.wikipedia.org/wiki/Godunov%27s_theorem",
   "https://api.crossref.org/works/10.1002/cpa.3160130205"
  ],
  "kind": "shocks"
 },
 {
  "id": "lax-wendroff-1960",
  "year": "1960",
  "title": "The Lax–Wendroff scheme and theorem",
  "who": "Peter D. Lax and Burton Wendroff",
  "work": "P. D. Lax and B. Wendroff, 'Systems of conservation laws', Communications on Pure and Applied Mathematics 13(2) (May 1960) 217–237. doi:10.1002/cpa.3160130205",
  "what": "The paper introduced a scheme for systems of conservation laws that is second-order accurate in both space and time. It also proved what is now called the Lax–Wendroff theorem: if a conservative scheme converges, its limit is a weak solution, so computed shocks move at the right speed. The scheme is accurate for smooth flow but produces wiggles next to shocks, as Godunov's theorem predicts for any linear second-order scheme.",
  "challenge": "dispersion; oscillations at shocks",
  "detail": "The reference list includes Godunov (1959), Landshoff's January 1955 Los Alamos report LA-1930, Lax's December 1952 report LAMS-1332, Harlow's 1957 J. ACM paper, and von Neumann's March 1944 report AM-551 (Crossref). Richtmyer's two-step version and MacCormack's predictor–corrector method belong to the same family.",
  "contested": "The theorem guarantees convergence to a weak solution, not necessarily the physically correct (entropy-satisfying) one.",
  "confidence": "high",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1002/cpa.3160130205",
   "https://api.crossref.org/works/10.1002/cpa.3160130205",
   "https://en.wikipedia.org/wiki/Lax%E2%80%93Wendroff_method",
   "https://en.wikipedia.org/wiki/Lax%E2%80%93Wendroff_theorem"
  ],
  "kind": "accuracy"
 },
 {
  "id": "fedorenko-1961-multigrid",
  "year": "1961",
  "title": "Fedorenko's two-grid relaxation: the first multigrid method",
  "who": "Radii P. Fedorenko",
  "work": "R. P. Fedorenko, 'Релаксационный метод решения разностных эллиптических уравнений' [A relaxation method for solving elliptic difference equations], Zh. Vychisl. Mat. i Mat. Fiz. 1(5) (1961) 922–927; English translation: USSR Computational Mathematics and Mathematical Physics 1(4) (1962) 1092–1096, doi:10.1016/0041-5553(62)90031-9. Follow-up: 'The speed of convergence of one iterative process', USSR Comput. Math. Math. Phys. 4(3) (1964) 227–235, doi:10.1016/0041-5553(64)90253-8.",
  "what": "Fedorenko combined relaxation sweeps on a fine grid, which remove oscillatory error quickly, with corrections computed on coarser grids, which remove the smooth error that relaxation handles slowly. His 1964 paper analysed the rate of convergence. N. S. Bakhvalov extended the analysis in 1966.",
  "challenge": "slow solver convergence",
  "detail": "Bakhvalov: 'On the convergence of a relaxation method with natural constraints on the elliptic operator', USSR Comput. Math. Math. Phys. 6(5) (1966) 101–135, doi:10.1016/0041-5553(66)90118-2. Russian Wikipedia says Fedorenko developed the method in 1961 while working on a numerical weather-prediction model. It also says that in 2003 he shared a Russian State Prize with Astrakhantsev, Bakhvalov and Shaidurov for founding work on the multigrid method.",
  "contested": "Multigrid is often credited to Achi Brandt. Fedorenko's work came first; Brandt (1973, 1977) showed its practical efficiency and generality. The publisher dates the English translation 1962, but the Russian original appeared in 1961. Statements that Fedorenko's test problem was the Poisson equation on a square are standard but were not checked against the paper.",
  "confidence": "medium",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.1016/0041-5553(62)90031-9",
   "https://doi.org/10.1016/0041-5553(64)90253-8",
   "https://doi.org/10.1016/0041-5553(66)90118-2",
   "https://ru.wikipedia.org/wiki/%D0%A4%D0%B5%D0%B4%D0%BE%D1%80%D0%B5%D0%BD%D0%BA%D0%BE,_%D0%A0%D0%B0%D0%B4%D0%B8%D0%B9_%D0%9F%D0%B5%D1%82%D1%80%D0%BE%D0%B2%D0%B8%D1%87"
  ],
  "kind": "solvers"
 },
 {
  "id": "smagorinsky-1963",
  "year": "1963",
  "title": "Smagorinsky's primitive-equation GCM and nonlinear eddy viscosity",
  "who": "Joseph Smagorinsky (1924–2005)",
  "work": "J. Smagorinsky, 'General circulation experiments with the primitive equations: I. The basic experiment', Monthly Weather Review 91(3) (March 1963) 99–164. doi:10.1175/1520-0493(1963)091<0099:GCEWTP>2.3.CO;2",
  "what": "A general-circulation experiment using the primitive equations, run at the US Weather Bureau's general circulation laboratory. To represent mixing by eddies too small for the grid, it used an eddy viscosity that depends on the grid size and the local rate of deformation of the resolved flow. In the form ν_t = (C_s Δ)² |S|, this became the Smagorinsky subgrid model of large-eddy simulation.",
  "challenge": "unresolved small scales; energy pile-up at the grid scale",
  "detail": "Smagorinsky was one of the five meteorologists on the 1950 ENIAC runs (Lynch 2008). According to Wikipedia, the Weather Bureau set up the General Circulation Research Section under him in 1955. It was renamed the General Circulation Research Laboratory in 1959 and the Geophysical Fluid Dynamics Laboratory (GFDL) in 1963, and moved to Princeton in 1968. His own retrospective is 'Some historical remarks on the use of non-linear viscosities', in Large Eddy Simulation of Complex Engineering and Geophysical Flows (Cambridge University Press, 1993).",
  "contested": "Wikipedia says LES 'was initially proposed in 1963 by Joseph Smagorinsky to simulate atmospheric air currents'. That is a retrospective label: the 1963 paper was a climate model, and the first simulation described as LES is Deardorff's (1970).",
  "confidence": "high",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1175/1520-0493(1963)091%3C0099:GCEWTP%3E2.3.CO;2",
   "https://en.wikipedia.org/wiki/Joseph_Smagorinsky",
   "https://en.wikipedia.org/wiki/Large_eddy_simulation",
   "https://maths.ucd.ie/~plynch/Publications/BAMS-ENIAC.pdf"
  ],
  "kind": "turbulence"
 },
 {
  "id": "fromm-harlow-1963",
  "year": "1963",
  "title": "First computed vortex street (Fromm & Harlow)",
  "who": "Jacob E. Fromm and Francis H. Harlow (1928–2016)",
  "work": "J. E. Fromm and F. H. Harlow, 'Numerical solution of the problem of vortex street development', Physics of Fluids 6(7) (July 1963) 975–982. doi:10.1063/1.1706854",
  "what": "Fromm and Harlow computed time-dependent, two-dimensional, viscous incompressible flow using a vorticity–stream-function method. They showed a vortex street forming behind a plate that is suddenly set moving at constant speed in a channel. They compared their results with experiments on the critical Reynolds number for shedding, the drag, the Strouhal number and the effect of the channel walls.",
  "challenge": "resolution cost; numerical diffusion at high Reynolds number",
  "detail": "From the abstract: “the Reynolds-number range investigated was 15 ≤ R ≤ 6000. Particular attention was given to those features for which comparison could be made with experiments, namely, critical Reynolds number for vortex shedding, drag coefficient, Strouhal number, vortex configuration, and channel-wall effects.” (https://api.crossref.org/works/10.1063/1.1706854)",
  "contested": "The calculation is often remembered as flow past a cylinder. The abstract describes a plate in a channel of finite width.",
  "confidence": "high",
  "chapters": [
   "similarity",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.1063/1.1706854",
   "https://api.crossref.org/works/10.1063/1.1706854"
  ],
  "kind": "methods"
 },
 {
  "id": "harlow-welch-1965-mac",
  "year": "1965",
  "title": "The marker-and-cell (MAC) method",
  "who": "Francis H. Harlow and J. Eddie Welch",
  "work": "F. H. Harlow and J. E. Welch, 'Numerical calculation of time-dependent viscous incompressible flow of fluid with free surface', Physics of Fluids 8(12) (December 1965) 2182–2189. doi:10.1063/1.1761178",
  "what": "The MAC method solves the full Navier–Stokes equations in terms of pressure and velocity, advancing in finite time steps on a fixed grid. Massless marker particles move with the fluid to show where it is, so free surfaces such as breaking waves and splashes can be followed. Pressure comes from a Poisson equation that keeps the velocity field divergence-free. Velocity components are stored on cell faces and pressure at cell centres, the staggered 'MAC grid' that avoids checkerboard pressure modes.",
  "challenge": "checkerboard pressure; enforcing incompressibility; tracking free surfaces",
  "detail": "From the abstract: “The primary dependent variables are the pressure and the velocity components. Also used is a set of marker particles which move with the fluid. The technique is called the marker and cell method.” (https://api.crossref.org/works/10.1063/1.1761178). A longer report followed: F. H. Harlow, J. E. Welch, J. P. Shannon, B. J. Daly, 'The MAC method', Los Alamos report LA-3425 (March 1966), as listed in Harlow's 2004 publication list.",
  "contested": "Today 'MAC grid' means the staggered layout, but the paper's name and emphasis were the marker particles for free surfaces. The staggered-grid description follows standard accounts; we checked only the abstract.",
  "confidence": "high",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.1063/1.1761178",
   "https://api.crossref.org/works/10.1063/1.1761178",
   "https://api.crossref.org/works/10.1016/j.jcp.2003.09.031"
  ],
  "kind": "pressure"
 },
 {
  "id": "arakawa-1966",
  "year": "1966",
  "title": "The Arakawa Jacobian: conserving energy and enstrophy",
  "who": "Akio Arakawa (1927–2021)",
  "work": "A. Arakawa, 'Computational design for long-term numerical integration of the equations of fluid motion: two-dimensional incompressible flow. Part I', Journal of Computational Physics 1(1) (August 1966) 119–143, doi:10.1016/0021-9991(66)90015-5. Reprinted in J. Comput. Phys. 135 (1997) 103–114, doi:10.1006/jcph.1997.5697.",
  "what": "Arakawa designed a finite-difference form of the nonlinear advection term in the two-dimensional vorticity equation that conserves the discrete kinetic energy and enstrophy (mean-square vorticity). With both conserved, energy cannot cascade falsely into the shortest grid waves. That prevents the nonlinear instability that ended Phillips's 1956 run. The scheme became a core part of the UCLA general circulation model and was taken up by others.",
  "challenge": "aliasing; nonlinear instability in long integrations",
  "detail": "The paper appeared in the first issue of the Journal of Computational Physics. Arakawa did the work at UCLA with Yale Mintz and presented the ideas at conferences from 1962 (Weart, AIP). The paper cites Phillips (1956, 1959) and Lilly (1965) (Crossref reference list of the 1997 reprint). UCLA's notice gives his death as 21 March 2021.",
  "contested": "According to Weart, some colleagues objected to forcing the scheme to conserve enstrophy, which nature does not conserve. Arakawa replied that it was only a device to make the calculation behave more realistically. Weart notes that Lorenz (1960) had already offered ideas on conserving a squared quantity.",
  "confidence": "high",
  "chapters": [
   "turbulence",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(66)90015-5",
   "https://history.aip.org/climate/arakawa.htm",
   "https://api.crossref.org/works/10.1006/jcph.1997.5697",
   "https://atmos.ucla.edu/news/dr-akio-arakawa-distinguished-research-professor-emeritus/"
  ],
  "kind": "turbulence"
 },
 {
  "id": "chorin-1967-artificial-compressibility",
  "year": "1967",
  "title": "Chorin's artificial compressibility",
  "who": "Alexandre Joel Chorin (b. 1938)",
  "work": "A. J. Chorin, 'A numerical method for solving incompressible viscous flow problems', Journal of Computational Physics 2(1) (August 1967) 12–26, doi:10.1016/0021-9991(67)90037-X. Reprinted in J. Comput. Phys. 135 (1997) 118–125, doi:10.1006/jcph.1997.5716.",
  "what": "Chorin replaced the incompressibility constraint ∇·u = 0 with an evolution equation for pressure containing an artificial compressibility, equivalent to an artificial sound speed. He then marched in pseudo-time until the solution stopped changing, at which point the divergence vanishes and the artificial term drops out. This avoids solving a Poisson equation for the pressure at every step, and is aimed at steady flows.",
  "challenge": "enforcing incompressibility; pressure–velocity coupling",
  "detail": "From the abstract of the reprint: “The principle of the method lies in the introduction of an artificial compressibility δ into the equations of motion, in such a way that the final results do not depend on δ. An application to thermal convection problems is presented.” (Semantic Scholar record for doi:10.1006/jcph.1997.5716). Chorin received his PhD from New York University in 1966 under Peter Lax, with a thesis on thermal convection in a fluid layer heated from below (Wikipedia). The paper cites Chandrasekhar (1961), Harlow & Welch (1965) and Chorin's own 1966 AEC report NYO-1480-61 (Crossref).",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(67)90037-X",
   "https://doi.org/10.1006/jcph.1997.5716",
   "https://en.wikipedia.org/wiki/Alexandre_Chorin"
  ],
  "kind": "pressure"
 },
 {
  "id": "chorin-1968-projection",
  "year": "1968",
  "title": "Chorin's projection method",
  "who": "Alexandre Joel Chorin (b. 1938)",
  "work": "A. J. Chorin, 'Numerical solution of the Navier–Stokes equations', Mathematics of Computation 22(104) (1968) 745–762, doi:10.1090/S0025-5718-1968-0242392-2. Preceded by a short note: A. J. Chorin, 'The numerical solution of the Navier–Stokes equations for an incompressible fluid', Bulletin of the American Mathematical Society 73(6) (1967) 928–931, doi:10.1090/S0002-9904-1967-11853-6.",
  "what": "The projection method first advances the velocity while ignoring the incompressibility constraint, giving an intermediate field. It then solves a Poisson equation for the pressure and subtracts the pressure gradient, which projects the velocity onto divergence-free fields (the Helmholtz–Hodge decomposition). This separates the velocity and pressure calculations. The method is the basis of many later incompressible solvers, including the 'stable fluids' methods of computer graphics.",
  "challenge": "enforcing incompressibility",
  "detail": "From the abstract: “A finite-difference method for solving the time-dependent Navier-Stokes equations for an incompressible fluid is introduced. This method uses the primitive variables, i.e. the velocities and the pressure, and is equally applicable to problems in two and three space dimensions. Test problems are solved, and an application to a three-dimensional convection problem is presented.” (https://api.crossref.org/works/10.1090/S0025-5718-1968-0242392-2). Peskin's 1972 heart-valve solver cites Chorin (1968, 1969) (Crossref).",
  "contested": "The method is often dated 1968, from the Mathematics of Computation paper, but Chorin's Bulletin note appeared in 1967. Roger Temam independently developed a fractional-step method with convergence analysis (1969), which is why it is often called the Chorin–Temam projection.",
  "confidence": "high",
  "chapters": [
   "pressure",
   "stable-fluids"
  ],
  "sources": [
   "https://doi.org/10.1090/S0025-5718-1968-0242392-2",
   "https://doi.org/10.1090/S0002-9904-1967-11853-6",
   "https://en.wikipedia.org/wiki/Projection_method_(fluid_dynamics)"
  ],
  "kind": "pressure"
 },
 {
  "id": "hirt-1968",
  "year": "1968",
  "title": "Hirt's heuristic stability theory",
  "who": "Cyril W. Hirt",
  "work": "C. W. Hirt, 'Heuristic stability theory for finite-difference equations', Journal of Computational Physics 2(4) (June 1968) 339–355. doi:10.1016/0021-9991(68)90041-7",
  "what": "Hirt expanded finite-difference equations in Taylor series to find the differential equation that a scheme actually approximates, including the extra terms left by truncation. He then judged stability from those terms; a negative effective diffusion, for example, signals instability. He applied this to nonlinear fluid-dynamics schemes of the kind used at Los Alamos.",
  "challenge": "instability; numerical diffusion",
  "detail": "The paper cites Harlow & Welch (1965), O'Brien, Hyman and Kaplan (1950), CFL (1928), von Neumann–Richtmyer (1950) and Richtmyer's 1957 book (Crossref reference list). Warming & Hyett (1974) cite it as the forerunner of their modified-equation method.",
  "contested": "The name 'modified equation' and its systematic form came with Warming & Hyett (1974); Hirt's version was heuristic, as his title says. The idea also appeared independently in the USSR. Godunov recalls that A. I. Zhukov, in work Godunov studied in 1953, explained shock smearing by analysing the truncation terms as numerical viscosity and 'formulated the idea of the first differential approximation' (https://arxiv.org/abs/0810.0649). We did not see Zhukov's report.",
  "confidence": "medium",
  "chapters": [
   "advection",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(68)90041-7",
   "https://api.crossref.org/works/10.1016/0021-9991(68)90041-7",
   "https://api.crossref.org/works/10.1016/0021-9991(74)90011-4",
   "https://arxiv.org/abs/0810.0649"
  ],
  "kind": "stability"
 },
 {
  "id": "orszag-1969-1971-aliasing",
  "year": "1969",
  "title": "Orszag: alias-free spectral methods and filtering",
  "who": "Steven A. Orszag (1943–2011)",
  "work": "S. A. Orszag, 'Numerical methods for the simulation of turbulence', Physics of Fluids 12(12), Suppl. II (1969) II-250–II-257, doi:10.1063/1.1692445; S. A. Orszag, 'On the elimination of aliasing in finite-difference schemes by filtering high-wavenumber components', Journal of the Atmospheric Sciences 28(6) (September 1971) 1074, doi:10.1175/1520-0469(1971)028<1074:OTEOAI>2.0.CO;2.",
  "what": "In 1969 Orszag described using the fast Fourier transform to evaluate the convolution sums of the Fourier-transformed Navier–Stokes equations, giving a scheme free of aliasing. He also described a faster scheme that works in real space (now called pseudo-spectral). His one-page 1971 note showed that aliasing can be removed by filtering out high-wavenumber components. The best-known form is the '2/3 rule', which zeroes the top third of the Fourier modes before computing products.",
  "challenge": "aliasing",
  "detail": "From the 1969 abstract: “This results in an aliasing-free, energetically conservative (when ν = 0) scheme that can be used convincingly as a model on which to test turbulence theories.” (https://api.crossref.org/works/10.1063/1.1692445). The 1971 note occupies a single page, p. 1074.",
  "contested": "The 2/3 rule is widely attributed to the 1971 note. We confirmed the note's title and subject but not its exact wording of the rule. The problem it solves is the one Phillips (1959) and Arakawa (1966) tackled with finite differences.",
  "confidence": "medium",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1063/1.1692445",
   "https://api.crossref.org/works/10.1063/1.1692445",
   "https://doi.org/10.1175/1520-0469(1971)028%3C1074:OTEOAI%3E2.0.CO;2",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Orszag/"
  ],
  "kind": "turbulence"
 },
 {
  "id": "temam-1969-fractional-steps",
  "year": "1969",
  "title": "Temam's fractional-step method",
  "who": "Roger Temam",
  "work": "R. Témam, 'Sur l'approximation de la solution des équations de Navier-Stokes par la méthode des pas fractionnaires (I)', Archive for Rational Mechanics and Analysis 32(2) (1969) 135–153, doi:10.1007/BF00247678; Part (II), ARMA 33(5) (1969) 377–385, doi:10.1007/BF00247696.",
  "what": "Independently of Chorin, Temam studied how to approximate the incompressible Navier–Stokes equations by fractional steps. One step advances the velocity, and a second step enforces incompressibility by projection. He analysed the convergence of the approximation. That is why the method is often called the Chorin–Temam projection method.",
  "challenge": "enforcing incompressibility",
  "detail": "The French title translates as 'On the approximation of the solution of the Navier–Stokes equations by the method of fractional steps'.",
  "contested": "English-language sources often name only Chorin; Temam's 1969 papers are the independent mathematical counterpart. Titles, volumes and pages are confirmed from Crossref. The description of the content follows standard accounts, not a reading of the papers.",
  "confidence": "medium",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.1007/BF00247678",
   "https://doi.org/10.1007/BF00247696",
   "https://en.wikipedia.org/wiki/Projection_method_(fluid_dynamics)"
  ],
  "kind": "pressure"
 },
 {
  "id": "deardorff-1970-les",
  "year": "1970",
  "title": "Deardorff's channel-flow large-eddy simulation",
  "who": "James W. Deardorff",
  "work": "J. W. Deardorff, 'A numerical study of three-dimensional turbulent channel flow at large Reynolds numbers', Journal of Fluid Mechanics 41(2) (1970) 453–480. doi:10.1017/S0022112070000691",
  "what": "Deardorff integrated the three-dimensional equations of motion in time for turbulent plane Poiseuille (channel) flow at very large Reynolds number. He resolved the large eddies on the grid and modelled the effect of smaller ones with an eddy viscosity proportional to the local velocity deformation, Smagorinsky's form. Statistics were compared with Laufer's channel-flow measurements. This is generally described as the first large-eddy simulation (LES).",
  "challenge": "turbulence resolution cost; unresolved small scales",
  "detail": "From the abstract: “A total of 6720 uniform grid intervals were used, with sub-grid scale effects simulated with eddy coefficients proportional to the local velocity deformation. The agreement of calculated statistics against those measured by Laufer ranges from good to marginal.” It ends: “It is concluded that the numerical approach to the problem of turbulence at large Reynolds numbers is already profitable, with increased accuracy to be expected with modest increase of numerical resolution.” (https://api.crossref.org/works/10.1017/S0022112070000691)",
  "contested": "'First LES' is a retrospective label, and the subgrid model comes from Smagorinsky (1963). The grid was tiny by modern standards: 6720 intervals in total.",
  "confidence": "high",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1017/S0022112070000691",
   "https://api.crossref.org/works/10.1017/S0022112070000691",
   "https://en.wikipedia.org/wiki/Large_eddy_simulation"
  ],
  "kind": "turbulence"
 },
 {
  "id": "orszag-patterson-1972-dns",
  "year": "1972",
  "title": "First direct numerical simulation of 3-D isotropic turbulence",
  "who": "Steven A. Orszag (1943–2011) and G. S. Patterson",
  "work": "S. A. Orszag and G. S. Patterson, 'Numerical simulation of three-dimensional homogeneous isotropic turbulence', Physical Review Letters 28(2) (10 January 1972) 76–79. doi:10.1103/PhysRevLett.28.76",
  "what": "Orszag and Patterson solved the full three-dimensional Navier–Stokes equations for homogeneous isotropic turbulence with spectral (Fourier) methods. They used no turbulence model, so every scale of motion had to be resolved. This is regarded as the first direct numerical simulation (DNS) of three-dimensional turbulence. Because all scales are resolved, DNS cost grows steeply with Reynolds number, which limited it to modest Reynolds numbers.",
  "challenge": "resolution cost (DNS work scales roughly as Re³); aliasing",
  "detail": "MacTutor quotes a tribute describing this as “the first calculation of homogeneous isotropic turbulence at laboratory Reynolds numbers with a 32³ pseudospectral discretization” (https://mathshistory.st-andrews.ac.uk/Biographies/Orszag/). The reference list includes Orszag's 1969 Physics of Fluids paper on spectral methods, his 1970 JFM paper on analytical theories of turbulence, Kraichnan (1959) and Cooley & Tukey's FFT paper (1965) (Crossref). Wikipedia traces the term 'direct numerical simulation' to Orszag's 1970 JFM paper.",
  "contested": "The 32³ grid is confirmed only from a secondary source (the tribute quoted by MacTutor), not from the paper.",
  "confidence": "high",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1103/PhysRevLett.28.76",
   "https://api.crossref.org/works/10.1103/PhysRevLett.28.76",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Orszag/",
   "https://en.wikipedia.org/wiki/Direct_numerical_simulation"
  ],
  "kind": "turbulence"
 },
 {
  "id": "patankar-spalding-1972-simple",
  "year": "1972",
  "title": "SIMPLE pressure-correction algorithm",
  "who": "Suhas V. Patankar and D. Brian Spalding (Imperial College London)",
  "work": "S. V. Patankar and D. B. Spalding, 'A calculation procedure for heat, mass and momentum transfer in three-dimensional parabolic flows', International Journal of Heat and Mass Transfer 15(10) (October 1972) 1787–1806, doi:10.1016/0017-9310(72)90054-3. Companion: L. S. Caretto, A. D. Gosman, S. V. Patankar, D. B. Spalding, 'Two calculation procedures for steady, three-dimensional flows with recirculation', Proceedings of the Third International Conference on Numerical Methods in Fluid Mechanics, Lecture Notes in Physics (Springer, 1973) 60–68, doi:10.1007/BFb0112677.",
  "what": "SIMPLE (Semi-Implicit Method for Pressure-Linked Equations) guesses a pressure field and solves the momentum equations on a staggered grid. It then solves a pressure-correction equation derived from continuity, corrects the velocities and pressure, and repeats until the fields converge. It became the standard pressure–velocity coupling method for steady incompressible flow in engineering finite-volume codes.",
  "challenge": "pressure–velocity coupling; checkerboard pressure",
  "detail": "The IJHMT paper cites Harlow & Welch (1965), Amsden & Harlow's SMAC report LA-4370 (1970), Chorin (1968) and Harlow's annotated bibliography LA-4281 (1969) (Crossref reference list). Wikipedia says a revised variant, SIMPLER, was introduced by Patankar in 1979; it is best known from his 1980 book Numerical Heat Transfer and Fluid Flow.",
  "contested": "SIMPLE is usually cited to the 1972 IJHMT paper, which treats parabolic (marching) flows. The version for recirculating flows appeared in Caretto et al. in the proceedings of the third International Conference on Numerical Methods in Fluid Mechanics, published 1973. An earlier draft dated SIMPLER to the 1980 book; Wikipedia gives 1979.",
  "confidence": "medium",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.1016/0017-9310(72)90054-3",
   "https://doi.org/10.1007/BFb0112677",
   "https://en.wikipedia.org/wiki/SIMPLE_algorithm",
   "https://api.crossref.org/works/10.1016/0017-9310(72)90054-3"
  ],
  "kind": "pressure"
 },
 {
  "id": "peskin-1972-immersed-boundary",
  "year": "1972",
  "title": "Peskin's immersed boundary method",
  "who": "Charles S. Peskin",
  "work": "C. S. Peskin, 'Flow patterns around heart valves: a numerical method', Journal of Computational Physics 10(2) (October 1972) 252–271. doi:10.1016/0021-9991(72)90065-4",
  "what": "To simulate blood flowing through heart valves, Peskin computed the fluid on a fixed rectangular grid and represented the flexible valve leaflets as Lagrangian fibres. Forces from the fibres are spread onto the grid through a smoothed delta function, and the fibres move with the fluid velocity interpolated back from the grid. Complex moving boundaries can then be handled without a mesh fitted to the body.",
  "challenge": "moving and deforming boundaries; incompressibility",
  "detail": "The paper's fluid solver builds on Chorin's work; its reference list includes Chorin (1968, 1969) and Viecelli's MAC-based moving-boundary papers (1969, 1971) (Crossref). A fuller follow-up was 'Numerical analysis of blood flow in the heart', J. Comput. Phys. 25(3) (November 1977) 220–252, doi:10.1016/0021-9991(77)90100-0.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(72)90065-4",
   "https://en.wikipedia.org/wiki/Immersed_boundary_method",
   "https://api.crossref.org/works/10.1016/0021-9991(72)90065-4"
  ],
  "kind": "methods"
 },
 {
  "id": "boris-book-1973-fct",
  "year": "1973",
  "title": "Flux-corrected transport (FCT)",
  "who": "Jay P. Boris and David L. Book",
  "work": "J. P. Boris and D. L. Book, 'Flux-corrected transport. I. SHASTA, a fluid transport algorithm that works', Journal of Computational Physics 11(1) (January 1973) 38–69. doi:10.1016/0021-9991(73)90147-2",
  "what": "FCT works in two stages. A transport stage uses a diffusive low-order scheme that creates no oscillations. An 'antidiffusion' stage then removes most of the added diffusion, with the antidiffusive fluxes limited so that no new maxima or minima appear. Because the limiter makes the scheme nonlinear, it escapes Godunov's theorem, giving sharp fronts without wiggles. It was one of the first practical flux-limiting methods.",
  "challenge": "oscillations at shocks; numerical diffusion",
  "detail": "An earlier version, Boris's 'A Fluid Transport Algorithm That Works' (1971), appeared in the Proceedings of the Seminar Course on Computing as a Language of Physics and is cited in the paper (Crossref). Zalesak extended FCT to multiple dimensions: 'Fully multidimensional flux-corrected transport algorithms for fluids', J. Comput. Phys. 31(3) (1979) 335–362, doi:10.1016/0021-9991(79)90051-2.",
  "contested": "FCT ran in parallel with other nonlinear high-resolution methods, such as van Leer's MUSCL (1979) and Harten's TVD schemes (1983). Claims of absolute priority for any one of them should be made with care.",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(73)90147-2",
   "https://api.crossref.org/works/10.1016/0021-9991(73)90147-2",
   "https://en.wikipedia.org/wiki/Flux-corrected_transport",
   "https://doi.org/10.1016/0021-9991(79)90051-2"
  ],
  "kind": "shocks"
 },
 {
  "id": "hpp-1973-lattice-gas",
  "year": "1973",
  "title": "HPP lattice gas",
  "who": "Jean Hardy, Yves Pomeau, Olivier de Pazzis",
  "work": "J. Hardy, Y. Pomeau, O. de Pazzis, 'Time evolution of a two-dimensional model system. I. Invariant states and time correlation functions', Journal of Mathematical Physics 14(12) (December 1973) 1746–1759, doi:10.1063/1.1666248; also 'Time evolution of a two-dimensional classical lattice system', Physical Review Letters 31(5) (30 July 1973) 276–279, doi:10.1103/PhysRevLett.31.276. Follow-up: J. Hardy, O. de Pazzis, Y. Pomeau, 'Molecular dynamics of a classical lattice gas: transport properties and time correlation functions', Phys. Rev. A 13(5) (1976) 1949–1961, doi:10.1103/PhysRevA.13.1949.",
  "what": "The HPP model puts particles on a square lattice, each moving in one of four directions, with at most one particle per direction at each site. Each time step has a collision stage, in which head-on pairs turn through 90°, and a streaming stage, in which every particle hops to the neighbouring site. Mass and momentum are conserved. The authors used it to study statistical mechanics, such as equilibrium states and the long-time tails of time-correlation functions.",
  "challenge": "lack of isotropy on a square lattice",
  "detail": "From the J. Math. Phys. abstract: “This paper is the first one of a series devoted to the study of a particularly simple two-dimensional system of classical particles.” (https://api.crossref.org/works/10.1063/1.1666248). The hexagonal-lattice FHP model fixed the isotropy problem: U. Frisch, B. Hasslacher, Y. Pomeau, 'Lattice-gas automata for the Navier–Stokes equation', Phys. Rev. Lett. 56(14) (1986) 1505–1508, doi:10.1103/PhysRevLett.56.1505.",
  "contested": "HPP is often presented as the first lattice fluid simulator, but the 1973 papers were about the statistical mechanics of a model system. On a square lattice the macroscopic equations lack rotational invariance, so HPP does not reproduce the isotropic Navier–Stokes equations. Wikipedia, citing Succi, notes that its vortices come out square. The working route to Navier–Stokes came only with FHP in 1986.",
  "confidence": "high",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1063/1.1666248",
   "https://doi.org/10.1103/PhysRevLett.31.276",
   "https://en.wikipedia.org/wiki/HPP_model",
   "https://doi.org/10.1103/PhysRevLett.56.1505"
  ],
  "kind": "methods"
 },
 {
  "id": "brandt-1973-1977-multigrid",
  "year": "1973",
  "title": "Brandt's multi-level adaptive technique (multigrid)",
  "who": "Achi Brandt",
  "work": "A. Brandt, 'Multi-level adaptive technique (MLAT) for fast numerical solution to boundary value problems', in Proceedings of the Third International Conference on Numerical Methods in Fluid Mechanics, Lecture Notes in Physics, Springer (1973) 82–89, doi:10.1007/BFb0118663; A. Brandt, 'Multi-level adaptive solutions to boundary-value problems', Mathematics of Computation 31(138) (April 1977) 333–390, doi:10.1090/S0025-5718-1977-0431719-X.",
  "what": "Brandt turned the two-grid idea into a general multilevel method. It applies coarse-grid corrections recursively, handles nonlinear problems, adapts the local mesh to the solution, and uses local Fourier mode analysis to predict convergence. He showed that elliptic problems can be solved in work proportional to the number of unknowns. The 1977 paper made multigrid widely known.",
  "challenge": "slow solver convergence",
  "detail": "From the 1977 abstract: “The boundary-value problem is discretized on several grids (or finite-element spaces) of widely different mesh sizes. Interactions between these levels enable us (i) to solve the possibly nonlinear system of n discrete equations in O(n) operations (40n additions and shifts for Poisson problems)” (https://api.crossref.org/works/10.1090/S0025-5718-1977-0431719-X). The abstract also reports tests on transonic-flow problems. Record both dates: the 1973 conference paper and the 1977 journal paper.",
  "contested": "Fedorenko (1961, 1964) proposed and analysed a two-grid relaxation method first, and Bakhvalov (1966) extended the analysis. Brandt's contribution was generality and showing that the method is efficient in practice.",
  "confidence": "high",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.1007/BFb0118663",
   "https://doi.org/10.1090/S0025-5718-1977-0431719-X",
   "https://api.crossref.org/works/10.1090/S0025-5718-1977-0431719-X"
  ],
  "kind": "solvers"
 },
 {
  "id": "launder-spalding-1974-k-epsilon",
  "year": "1974",
  "title": "The 'standard' k–ε turbulence model",
  "who": "Brian E. Launder and D. Brian Spalding",
  "work": "B. E. Launder and D. B. Spalding, 'The numerical computation of turbulent flows', Computer Methods in Applied Mechanics and Engineering 3(2) (March 1974) 269–289. doi:10.1016/0045-7825(74)90029-2",
  "what": "The paper reviewed turbulence models suited to numerical computation and recommended a two-equation model. It solves transport equations for the turbulent kinetic energy k and its dissipation rate ε, and sets the eddy viscosity to ν_t = C_μ k²/ε. This became the 'standard k–ε model', the workhorse of RANS engineering CFD for decades.",
  "challenge": "modelling unresolved turbulence (RANS closure)",
  "detail": "The commonly quoted constants are C_μ = 0.09, C_1ε = 1.44, C_2ε = 1.92, σ_k = 1.0 and σ_ε = 1.3 (Wikipedia, citing Versteeg & Malalasekera). We did not check which constants appear in the 1974 paper.",
  "contested": "k–ε had earlier roots, and the 1974 paper cites several of them (Crossref reference list): Kolmogorov's 1942 two-equation proposal; Harlow & Nakayama, 'Transport of turbulence energy decay rate', Los Alamos report LA-3854 (1968), doi:10.2172/4556905; and Jones & Launder, 'The prediction of laminarization with a two-equation model of turbulence', Int. J. Heat Mass Transfer 15 (1972) 301–314. An earlier draft said the 1974 paper also cites Harlow & Nakayama's 'Turbulence transport equations', Phys. Fluids 10 (1967) 2323–2332. That paper exists and belongs to the same line of work, but it is not in the 1974 reference list as deposited with Crossref. 'Launder–Spalding 1974' names the standard form, not the first k–ε model.",
  "confidence": "high",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1016/0045-7825(74)90029-2",
   "https://api.crossref.org/works/10.1016/0045-7825(74)90029-2",
   "https://www.osti.gov/biblio/4556905",
   "https://en.wikipedia.org/wiki/K-epsilon_turbulence_model"
  ],
  "kind": "turbulence"
 },
 {
  "id": "warming-hyett-1974-modified-equation",
  "year": "1974",
  "title": "The modified equation (Warming & Hyett)",
  "who": "R. F. Warming and B. J. Hyett",
  "work": "R. F. Warming and B. J. Hyett, 'The modified equation approach to the stability and accuracy analysis of finite-difference methods', Journal of Computational Physics 14(2) (February 1974) 159–179. doi:10.1016/0021-9991(74)90011-4",
  "what": "Warming and Hyett gave a systematic way to derive, by Taylor expansion, the 'modified equation': the partial differential equation that a difference scheme actually solves. They used it to analyse both stability and accuracy. Even-order error terms act as numerical diffusion and odd-order terms as dispersion. This explains why first-order upwind smears fronts and Lax–Wendroff makes wiggles behind them.",
  "challenge": "numerical diffusion and dispersion; instability",
  "detail": "The paper cites Hirt (1968), Richtmyer & Morton (1967), Fromm (1968), Crowley (1967), Roache's 1972 book Computational Fluid Dynamics and Lomax's 1970 AGARDograph (Crossref reference list).",
  "contested": "Hirt (1968) had already used the idea in heuristic form; Warming & Hyett made it systematic and gave it its name. In the USSR a similar idea, the 'first differential approximation', goes back to the early 1950s, according to Godunov's recollection of A. I. Zhukov's work (see the Hirt record).",
  "confidence": "high",
  "chapters": [
   "advection",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(74)90011-4",
   "https://api.crossref.org/works/10.1016/0021-9991(74)90011-4"
  ],
  "kind": "accuracy"
 },
 {
  "id": "lucy-1977-sph",
  "year": "1977",
  "title": "Lucy's particle method: one of the two origins of SPH",
  "who": "Leon B. Lucy",
  "work": "L. B. Lucy, \"A numerical approach to the testing of the fission hypothesis\", The Astronomical Journal 82, 1013–1024 (December 1977). doi:10.1086/112164",
  "what": "Lucy described a \"finite-size particle scheme\" for two- and three-dimensional gas dynamics in astronomy. He used it to test whether a rotating protostar could split (fission) into a multiple star. In the run he reports, a single rotating star evolved into a triple system whose components held 60% of the original mass. This paper and Gingold and Monaghan's paper of the same year are counted together as the origin of smoothed particle hydrodynamics (SPH), a mesh-free Lagrangian method.",
  "challenge": "Gives a mesh-free Lagrangian alternative to grids for irregular 3-D flows. Particle methods bring their own problems: noise, and quantities that must be smoothed with a kernel.",
  "detail": "The abstract (OpenAlex/ADS metadata) calls the method a \"finite-size particle scheme\" and reports the triple system holding 60% of the original mass. The phrase \"smoothed particle hydrodynamics\" does not appear in Lucy's title. Crossref and Price's 2012 review both give AJ 82, 1013–1024, December 1977.",
  "contested": "Priority is shared. Lucy (AJ, December 1977) and Gingold & Monaghan (MNRAS, 1977; received 2 February 1977) are treated as independent co-originators. Lucy should not be credited with the name 'SPH', which comes from Gingold & Monaghan's title.",
  "confidence": "high",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1086/112164",
   "https://api.openalex.org/works/https://doi.org/10.1086/112164",
   "https://arxiv.org/abs/1012.1885"
  ],
  "kind": "methods"
 },
 {
  "id": "gingold-monaghan-1977-sph",
  "year": "1977",
  "title": "Gingold & Monaghan name smoothed particle hydrodynamics",
  "who": "R. A. Gingold and Joseph J. Monaghan (both listed at the Institute of Astronomy, Cambridge; Monaghan's permanent address was Monash University)",
  "work": "R. A. Gingold and J. J. Monaghan, \"Smoothed particle hydrodynamics: theory and application to non-spherical stars\", Monthly Notices of the Royal Astronomical Society 181(3), 375–389 (1977). doi:10.1093/mnras/181.3.375",
  "what": "Gingold and Monaghan introduced a hydrodynamics code that works in any number of dimensions. The fluid is represented by particles that move under Newtonian equations, and field values such as density are recovered by statistical (kernel) estimates from the particle positions. They tested it on polytropic star models and, starting from about 80 particles in three dimensions, reproduced the structure of uniformly rotating and magnetic polytropes to within a few per cent. Their title gave the method its name.",
  "challenge": "Gives a mesh-free Lagrangian alternative to grids for non-spherical 3-D problems.",
  "detail": "Received 2 February 1977; revision received 5 May 1977. The publisher dates the issue 1 December 1977, while Price's 2012 review lists it as November 1977. The year is 1977 in both. The article page lists both authors at the Institute of Astronomy, Madingley Road, Cambridge, with Monaghan's permanent address at the Mathematics Department, Monash University.",
  "contested": "Independent co-origin with Lucy (1977). Sources disagree on the month of the issue (November or December 1977).",
  "confidence": "high",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://academic.oup.com/mnras/article/181/3/375/988212",
   "https://doi.org/10.1093/mnras/181.3.375",
   "https://arxiv.org/abs/1012.1885"
  ],
  "kind": "methods"
 },
 {
  "id": "vanleer-1979-muscl",
  "year": "1979",
  "title": "MUSCL: van Leer's second-order sequel to Godunov",
  "who": "Bram van Leer",
  "work": "B. van Leer, \"Towards the ultimate conservative difference scheme. V. A second-order sequel to Godunov's method\", Journal of Computational Physics 32(1), 101–136 (July 1979). doi:10.1016/0021-9991(79)90145-1",
  "what": "This is the fifth and last paper in van Leer's series 'Towards the ultimate conservative difference scheme' (Parts I–V, 1972/73–1979). It extended Godunov's first-order upwind finite-volume method to second order. Each cell gets a limited (slope-restricted) linear profile, and Riemann problems are then solved at the cell faces. The approach became known as MUSCL (Monotonic Upstream-centered Scheme for Conservation Laws) and is the template for most later 'high-resolution' shock-capturing schemes.",
  "challenge": "Oscillations at shocks versus numerical diffusion. Godunov's first-order scheme is monotone but smears shocks, and linear second-order schemes oscillate. Limiting the reconstructed slope gives a compromise between the two.",
  "detail": "The series (Crossref): Part I 'The quest of monotonicity', in the Proceedings of the Third International Conference on Numerical Methods in Fluid Mechanics (Lecture Notes in Physics), pp. 163–168, printed 1973 from a 1972 conference (Wikipedia dates the series 1972–1979 for this reason); Part II 'Monotonicity and conservation combined in a second-order scheme', JCP 14, 361–370 (March 1974); Parts III and IV, JCP 23, 263–275 and 276–299 (March 1977); Part V, JCP 32 (July 1979). Van Leer (born 1942) earned a PhD in astrophysics at Leiden in 1970 and joined the University of Michigan's aerospace engineering department in 1986 (per Wikipedia).",
  "contested": "Wikipedia's MUSCL article says that in this paper 'he constructed the first high-order, total variation diminishing (TVD) scheme'. That is anachronistic, because the TVD concept was formulated by Harten in 1982–83. Monotonicity-preserving limiting already appears in van Leer's Part II (1974), whose title names it. In 2011 van Leer published 'A historical oversight: Vladimir P. Kolgan and his high-resolution scheme' (J. Comput. Phys. 230, 2378–2383), with an English translation of Kolgan's paper in the same issue (pp. 2384–2390). He acknowledges there that the Soviet researcher V. P. Kolgan had proposed a limited second-order reconstruction earlier. Kolgan's original is cited as Uchenye Zapiski TsAGI 3(6), 68–77 (1972); that citation was seen only in secondary listings. Boris & Book's flux-corrected transport ('Flux-corrected transport. I. SHASTA, a fluid transport algorithm that works', J. Comput. Phys. 11, 38–69, January 1973) is another independent early nonlinear limiter.",
  "confidence": "high",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(79)90145-1",
   "https://doi.org/10.1016/j.jcp.2010.12.032",
   "https://en.wikipedia.org/wiki/Bram_van_Leer",
   "https://doi.org/10.1016/0021-9991(73)90147-2"
  ],
  "kind": "shocks"
 },
 {
  "id": "roe-1981-riemann",
  "year": "1981",
  "title": "Roe's approximate Riemann solver",
  "who": "Philip L. Roe",
  "work": "P. L. Roe, \"Approximate Riemann solvers, parameter vectors, and difference schemes\", Journal of Computational Physics 43(2), 357–372 (October 1981). doi:10.1016/0021-9991(81)90128-5. Reprinted in J. Comput. Phys. 135(2), 250–258 (August 1997).",
  "what": "Godunov's method solves an exact nonlinear Riemann problem at every cell face. Roe replaced it with a linear problem whose constant matrix is built from a special average of the left and right states, obtained through a 'parameter vector'. The interface flux then follows from that matrix's eigenvalues and eigenvectors. This made Godunov-type upwind schemes much cheaper, and the method is still in wide use.",
  "challenge": "The cost of exact Riemann solvers, and the need to capture shocks sharply.",
  "detail": "The NAG library documentation warns that 'Roe's scheme does not satisfy an ‘entropy condition’' and 'it may admit non-physical solutions such as expansion shocks'. The problem arises in transonic rarefactions (at sonic points), so practical codes add an 'entropy fix'. NAG's own routine 'does not detect or correct any entropy violation'.",
  "contested": "Complete Riemann solvers such as Roe's, which resolve shear and entropy waves sharply, are the schemes most prone to the 'carbuncle' instability at strong grid-aligned shocks (see Quirk 1994 and Kemm's review, arXiv:1507.00666).",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(81)90128-5",
   "https://support.nag.com/numeric/cl/nagdoc_cl26/html/d03/d03puc.html",
   "https://doi.org/10.1006/jcph.1997.5705",
   "https://arxiv.org/abs/1507.00666"
  ],
  "kind": "shocks"
 },
 {
  "id": "ghia-1982-cavity",
  "year": "1982",
  "title": "Ghia–Ghia–Shin lid-driven cavity benchmark",
  "who": "U. Ghia, K. N. Ghia and C. T. Shin",
  "work": "U. Ghia, K. N. Ghia and C. T. Shin, \"High-Re solutions for incompressible flow using the Navier-Stokes equations and a multigrid method\", Journal of Computational Physics 48(3), 387–411 (December 1982). doi:10.1016/0021-9991(82)90058-4",
  "what": "The authors used the vorticity–stream-function form of the 2-D incompressible Navier–Stokes equations with a coupled strongly implicit multigrid (CSI-MG) solver, a multigrid version of Rubin & Khosla's coupled strongly implicit method. With it they computed steady flow in a square cavity driven by a moving lid, for Reynolds numbers up to 10,000. Their tables of velocity along the cavity centrelines became widely used reference data for testing incompressible-flow codes.",
  "challenge": "Slow solver convergence at high Reynolds number (addressed with multigrid), and the need for benchmark data to test codes against.",
  "detail": "They used second-order differencing on uniform meshes of up to 257 × 257 points. Erturk, Corke & Gökçöl (2005) describe their results as second order 'with a mesh size of 129×129' in the comparison they make.",
  "contested": "Treat it as a benchmark, not as exact truth. Erturk, Corke & Gökçöl (2005) judged the 129 × 129 second-order results 'somewhat under-resolved', and found that with second-order accuracy 'even a 401 × 401 grid mesh solutions can be considered as under-resolved for Re=1,000'. The literature also disagrees on whether 2-D cavity flow at the highest Re is steady at all. In their words, 'while some studies predict a periodic flow at a high Reynolds number, some others present steady solutions for even a higher Reynolds number' (https://arxiv.org/abs/cs/0411047).",
  "confidence": "high",
  "chapters": [
   "trust",
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(82)90058-4",
   "https://arxiv.org/abs/cs/0411047"
  ],
  "kind": "trust"
 },
 {
  "id": "harten-1983-tvd",
  "year": "1983",
  "title": "Harten's total-variation-diminishing (TVD) schemes",
  "who": "Ami Harten",
  "work": "A. Harten, \"High resolution schemes for hyperbolic conservation laws\", Journal of Computational Physics 49(3), 357–393 (March 1983). doi:10.1016/0021-9991(83)90136-5. Earlier version: Courant Mathematics and Computing Laboratory, New York University, report DOE/ER/03077-175 (March 1982; also NASA CR-169381). Reprinted in J. Comput. Phys. 135(2), 260–278 (August 1997), with an introduction by P. D. Lax (p. 259).",
  "what": "Harten required that a scheme never increase the total variation of the discrete solution (the sum of |u_{i+1} − u_i|), a condition that rules out new spurious oscillations. He proved that monotone schemes satisfy it and that schemes satisfying it preserve monotonicity. He then built nonlinear explicit second-order schemes by applying a non-oscillatory first-order scheme to a modified flux. This gave a precise criterion for 'high-resolution' shock capturing that gets around Godunov's first-order limit, which applies only to linear schemes.",
  "challenge": "Oscillations at shocks, and Godunov's theorem that linear monotone schemes are at most first-order accurate.",
  "detail": "Published March 1983. The 1982 report, with the same title and author, gives the result as Theorem 2.1 ('A monotone scheme is TVNI'; 'A TVNI scheme is monotonicity preserving') and notes that any linear monotonicity-preserving scheme is monotone and therefore first-order accurate.",
  "contested": "Harten is credited with 'TVD', but his 1982 report uses the label 'TVNI' (total variation nonincreasing) throughout (18 times) and never 'TVD'. A March 1983 NASA memorandum co-written by Harten (Yee, Warming & Harten, 'Implicit Total Variation Diminishing (TVD) schemes for steady-state calculations', NASA TM-84342) already uses 'TVD' and gives TVNI as the alternative name. Anecdotes circulate about how the name was chosen. We found none in a checkable source, so they are left out.",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(83)90136-5",
   "https://ntrs.nasa.gov/citations/19830002586",
   "https://ntrs.nasa.gov/citations/19830014814",
   "https://doi.org/10.1006/jcph.1997.5725"
  ],
  "kind": "shocks"
 },
 {
  "id": "rhie-chow-1983",
  "year": "1983",
  "title": "Rhie–Chow momentum interpolation",
  "who": "C. M. Rhie and W. L. Chow",
  "work": "C. M. Rhie and W. L. Chow, \"Numerical study of the turbulent flow past an airfoil with trailing edge separation\", AIAA Journal 21(11), 1525–1532 (November 1983). doi:10.2514/3.8284. Conference version: \"A numerical study of the turbulent flow past an isolated airfoil with trailing edge separation\", AIAA Paper 82-0998, 3rd Joint Thermophysics, Fluids, Plasma and Heat Transfer Conference (June 1982), doi:10.2514/6.1982-998.",
  "what": "Rhie and Chow presented a finite-volume method for the steady 2-D incompressible Navier–Stokes equations in general curvilinear coordinates. They applied it to turbulent flow over airfoils with and without trailing-edge separation and compared the results with experiments. All variables were stored at the same, non-staggered grid points. To stop the pressure field from decoupling into a checkerboard pattern on such a grid, they interpolated face velocities using the momentum equation, which brings in the local pressure gradient. Later authors call this 'momentum interpolation' or the 'pressure-weighted interpolation method'. It made collocated grids practical for pressure-based solvers.",
  "challenge": "Checkerboard pressure on collocated grids.",
  "detail": "Presented June 1982, journal version November 1983. Miller & Schmidt, 'Use of a pressure-weighted interpolation method for the solution of the incompressible Navier-Stokes equations' (Numerical Heat Transfer 14(2), 213–233, 1988), describe it as 'the pressure-weighted interpolation method (PWIM) using a non-staggered grid proposed by Rhie and Chow'.",
  "contested": "The original formulation has known flaws. Miller & Schmidt (1988) reworked its use within SIMPLEC so that converged results no longer depend on the relaxation factor. They also reported that 'in regions of very rapidly varying pressure gradients, PWIM can predict physically unrealistic convective velocities' (https://doi.org/10.1080/10407788808913641). The method is usually cited by its 1983 journal version, although it was presented in 1982.",
  "confidence": "high",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.2514/3.8284",
   "https://doi.org/10.2514/6.1982-998",
   "https://doi.org/10.1080/10407788808913641",
   "https://api.openalex.org/works/https://doi.org/10.1080/10407788808913641"
  ],
  "kind": "pressure"
 },
 {
  "id": "hll-1983",
  "year": "1983",
  "title": "Harten–Lax–van Leer (HLL) and Godunov-type schemes",
  "who": "Ami Harten, Peter D. Lax and Bram van Leer",
  "work": "A. Harten, P. D. Lax and B. van Leer, \"On upstream differencing and Godunov-type schemes for hyperbolic conservation laws\", SIAM Review 25(1), 35–61 (January 1983). doi:10.1137/1025002",
  "what": "A review that put upstream (upwind) difference schemes into a single framework so they could be compared. It paid special attention to Godunov-type schemes built on approximate Riemann solutions. Its two-wave approximate Riemann solver, now called HLL, brackets the solution between the fastest left- and right-moving waves. HLL is simple and robust but smears contact discontinuities.",
  "challenge": "Cost and robustness of Riemann solvers at shocks, at the price of extra diffusion at contacts.",
  "detail": "Abstract: 'For schemes based on flux splitting, the approximate Riemann solution can be interpreted as a solution of the collisionless Boltzmann equation.' Later extensions: Einfeldt's choice of signal speeds (HLLE; 'On Godunov-type methods for gas dynamics', SIAM J. Numer. Anal. 25, 294–318, 1988) and Toro, Spruce & Speares' 'Restoration of the contact surface in the HLL-Riemann solver' (HLLC; Shock Waves 4, 25–34, 1994).",
  "contested": "Usually cited as 'HLL 1983'. It is a SIAM Review survey article ('This paper reviews some of the recent developments in upstream difference schemes'), not a stand-alone methods paper.",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1137/1025002",
   "https://en.wikipedia.org/wiki/Riemann_solver",
   "https://doi.org/10.1007/BF01414629",
   "https://doi.org/10.1137/0725021"
  ],
  "kind": "shocks"
 },
 {
  "id": "monaghan-gingold-1983-av",
  "year": "1983",
  "title": "SPH meets shocks: Monaghan & Gingold's artificial viscosity",
  "who": "Joseph J. Monaghan and R. A. Gingold",
  "work": "J. J. Monaghan and R. A. Gingold, \"Shock simulation by the particle method SPH\", Journal of Computational Physics 52(2), 374–389 (November 1983). doi:10.1016/0021-9991(83)90036-0",
  "what": "Monaghan and Gingold tested SPH on shock problems and introduced an artificial viscosity acting between pairs of particles, so that SPH could capture shocks. The pairwise viscous term is added to the pressure term of the SPH momentum equation. It is the ancestor of the 'standard' SPH artificial viscosity summarised in Monaghan's 1992 review.",
  "challenge": "Capturing shocks in a particle method, and the noise and oscillation behind a shock.",
  "detail": "A later study of SPH artificial viscosity (arXiv:0711.1590) says a more effective viscosity, which may conserve linear and angular momentum, 'was suggested by Monaghan and Gingold (1983)', with a viscous term between two particles 'added to the pressure term of SPH equations'. Price (2012) gives the standard form as Monaghan (1992). The exact form used in the 1983 paper was not checked here.",
  "contested": "Many texts cite only Monaghan (1992) for SPH artificial viscosity; the 1983 paper is the earlier source.",
  "confidence": "high",
  "chapters": [
   "lattice-particles",
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(83)90036-0",
   "https://arxiv.org/abs/0711.1590",
   "https://arxiv.org/abs/1012.1885"
  ],
  "kind": "shocks"
 },
 {
  "id": "sweby-1984-limiters",
  "year": "1984",
  "title": "Sweby's flux-limiter analysis (the TVD region)",
  "who": "P. K. Sweby",
  "work": "P. K. Sweby, \"High resolution schemes using flux limiters for hyperbolic conservation laws\", SIAM Journal on Numerical Analysis 21(5), 995–1011 (October 1984). doi:10.1137/0721062",
  "what": "Sweby studied explicit second-order, oscillation-free (TVD) schemes built by adding a limited anti-diffusive flux to a first-order scheme. He derived the bounds a flux limiter φ(r) must satisfy, where r is the ratio of consecutive solution gradients. This admissible region, now usually drawn as the 'Sweby diagram', lets different limiters be compared on one plot.",
  "challenge": "The trade-off between numerical diffusion and oscillations at discontinuities.",
  "detail": "The abstract says the class of limiters 'includes a very compressive limiter due to Roe' (the limiter commonly called superbee) and that 'various limiters are compared both theoretically and numerically'.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1137/0721062",
   "https://en.wikipedia.org/wiki/Flux_limiter"
  ],
  "kind": "shocks"
 },
 {
  "id": "colella-woodward-1984-ppm",
  "year": "1984",
  "title": "The Piecewise Parabolic Method (PPM)",
  "who": "Phillip Colella and Paul R. Woodward",
  "work": "P. Colella and P. R. Woodward, \"The Piecewise Parabolic Method (PPM) for gas-dynamical simulations\", Journal of Computational Physics 54(1), 174–201 (April 1984). doi:10.1016/0021-9991(84)90143-8",
  "what": "PPM is a higher-order extension of the Godunov/MUSCL approach. The solution in each cell is reconstructed as a parabola instead of a straight line, with constraints that keep the reconstruction monotone near discontinuities. It resolves shocks and contact discontinuities with fewer grid points and became a standard method in astrophysical and compressible-flow codes.",
  "challenge": "Numerical diffusion versus oscillations at shocks and contact discontinuities.",
  "detail": "It appeared in the same journal issue as Woodward & Colella, 'The numerical simulation of two-dimensional fluid flow with strong shocks', J. Comput. Phys. 54(1), 115–173 (April 1984).",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(84)90143-8",
   "https://doi.org/10.1016/0021-9991(84)90142-6"
  ],
  "kind": "shocks"
 },
 {
  "id": "mms-roache-steinberg-1984",
  "year": "1984",
  "title": "Roots of the method of manufactured solutions (Roache & Steinberg)",
  "who": "Patrick J. Roache and Stanly Steinberg",
  "work": "P. J. Roache and S. Steinberg, \"Symbolic manipulation and computational fluid dynamics\", AIAA Journal 22(10), 1390–1394 (October 1984), doi:10.2514/3.8794; conference version AIAA Paper 83-1952, 6th AIAA Computational Fluid Dynamics Conference, Danvers (July 1983), doi:10.2514/6.1983-1952; expanded as S. Steinberg and P. J. Roache, same title, Journal of Computational Physics 57(2), 251–284 (January 1985), doi:10.1016/0021-9991(85)90045-2.",
  "what": "Roache and Steinberg used the computer-algebra system MACSYMA to generate and check the long expressions that arise in CFD, especially three-dimensional body-fitted coordinate transformations. This work is cited as a root of the method of manufactured solutions. In that method you choose an analytic 'solution', substitute it into the PDE symbolically to get the source terms that make it exact, and then check that the code's error shrinks at the theoretical rate as the grid is refined.",
  "challenge": "Code verification: showing that a code really solves its equations to the intended order of accuracy.",
  "detail": "Conference paper July 1983, AIAA Journal October 1984, JCP January 1985. Roache's later paper 'Code verification by the method of manufactured solutions', J. Fluids Eng. 124(1), 4–10 (online November 2001, March 2002 issue), gives the mature form.",
  "contested": "The 1984 abstract covers MACSYMA and body-fitted coordinates and does not use the phrase 'manufactured solutions'. Salari & Knupp (2000) call Shih, 'A procedure to debug computer programs' (Int. J. Numer. Methods Eng. 21, 1027–1037, 1985), 'One of the earliest published references to using manufactured solutions to identify coding mistakes'. They credit the pairing with mesh refinement to Steinberg & Roache (1985) and later Roache papers. They also state: 'The term manufactured solution was first used by Oberkampf, et.al. [4] in the context of code Verification but the procedure was not further developed.' Their reference 4 is Oberkampf, Blottner & Aeschliman, AIAA Paper 95-2226 (June 1995) (https://www.osti.gov/servlets/purl/759450). So 1983–85 is a fair date for the idea, but not for the name.",
  "confidence": "high",
  "chapters": [
   "trust"
  ],
  "sources": [
   "https://doi.org/10.2514/3.8794",
   "https://doi.org/10.1016/0021-9991(85)90045-2",
   "https://www.osti.gov/servlets/purl/759450",
   "https://doi.org/10.1115/1.1436090"
  ],
  "kind": "trust"
 },
 {
  "id": "saad-schultz-1986-gmres",
  "year": "1986",
  "title": "GMRES",
  "who": "Youcef Saad and Martin H. Schultz",
  "work": "Y. Saad and M. H. Schultz, \"GMRES: A generalized minimal residual algorithm for solving nonsymmetric linear systems\", SIAM Journal on Scientific and Statistical Computing 7(3), 856–869 (July 1986). doi:10.1137/0907058",
  "what": "GMRES is an iterative method that, at every step, minimises the norm of the residual over a growing Krylov subspace, using the Arnoldi process to build an orthonormal basis. It generalises Paige and Saunders' MINRES to nonsymmetric matrices. Such matrices appear in CFD whenever convection is discretised (for example by upwinding) or implicit flow equations are linearised, and conjugate gradients does not apply to them.",
  "challenge": "Slow solver convergence for nonsymmetric systems.",
  "detail": "The abstract says it 'is theoretically equivalent to the Generalized Conjugate Residual (GCR) method and to ORTHODIR' and 'presents several advantages over GCR and ORTHODIR'. Storage and work grow with each iteration, so in practice it is usually restarted every m steps (GMRES(m)).",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.1137/0907058"
  ],
  "kind": "solvers"
 },
 {
  "id": "fhp-1986-lattice-gas",
  "year": "1986",
  "title": "FHP lattice-gas automaton",
  "who": "Uriel Frisch, Brosl Hasslacher and Yves Pomeau",
  "work": "U. Frisch, B. Hasslacher and Y. Pomeau, \"Lattice-gas automata for the Navier-Stokes equation\", Physical Review Letters 56(14), 1505–1508 (7 April 1986). doi:10.1103/PhysRevLett.56.1505",
  "what": "FHP showed that a deterministic lattice gas reproduces the Navier–Stokes equation at large scales. In it, Boolean particles hop between neighbouring nodes of a hexagonal lattice and collide by simple rules. The hexagonal lattice has enough symmetry to make the large-scale flow isotropic, which the earlier square-lattice HPP model lacked. The authors noted that such rules could be used to design 'simple, massively parallel computing machines'.",
  "challenge": "Getting isotropy from a discrete lattice. Lattice gases also suffer from statistical noise and lack Galilean invariance.",
  "detail": "HPP model: J. Hardy, Y. Pomeau and O. de Pazzis, 'Time evolution of a two-dimensional classical lattice system', Phys. Rev. Lett. 31, 276–279 (1973). Known lattice-gas defects are statistical noise (heavy averaging is needed), a density-dependent factor in the convective term (non-Galilean invariance) and a velocity-dependent equation of state. Chen, Chen & Matthaeus (1992) list the last two. These defects motivated lattice Boltzmann methods.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1103/PhysRevLett.56.1505",
   "https://en.wikipedia.org/wiki/Lattice_gas_automaton",
   "https://doi.org/10.1103/PhysRevLett.31.276",
   "https://doi.org/10.1103/PhysRevA.45.R5339"
  ],
  "kind": "methods"
 },
 {
  "id": "heoc-1987-eno",
  "year": "1987",
  "title": "ENO (essentially non-oscillatory) schemes",
  "who": "Ami Harten, Björn Engquist, Stanley Osher and Sukumar R. Chakravarthy",
  "work": "A. Harten, B. Engquist, S. Osher and S. R. Chakravarthy, \"Uniformly high order accurate essentially non-oscillatory schemes, III\", Journal of Computational Physics 71(2), 231–303 (August 1987). doi:10.1016/0021-9991(87)90031-3. Preprint: ICASE Report 86-22 / NASA CR-178101 (April 1986). Reprinted in J. Comput. Phys. 131(1), 3–47 (February 1997).",
  "what": "ENO schemes reconstruct the solution from cell averages. At each cell they use the 'smoothest' of several candidate stencils, chosen adaptively by comparing divided differences. This keeps high-order accuracy right up to discontinuities and avoids Gibbs-type oscillations, without the loss of accuracy at smooth extrema that TVD schemes suffer. 'Essentially' non-oscillatory means that small oscillations, of the size of the truncation error, are allowed.",
  "challenge": "Oscillations at shocks, and TVD limiters clipping smooth peaks.",
  "detail": "Part I: Harten & Osher, 'Uniformly high-order accurate nonoscillatory schemes. I', SIAM J. Numer. Anal. 24(2), 279–309 (April 1987). A related paper by the same four authors, 'Some results on uniformly high-order accurate essentially nonoscillatory schemes', Applied Numerical Mathematics 2, 347–377 (October 1986), appeared before both. The ICASE preprint of Part III is dated April 1986. Jiang & Shu (1996) note that ENO's freely adaptive stencil 'could change even by a round-off error perturbation near zeroes of the solution and its derivatives'.",
  "contested": "The previous draft called the 1986 Applied Numerical Mathematics paper 'Part II'. Its title carries no number, and we could not confirm which paper, if any, was published as Part II. Author order also varies: the JCP Part III lists Harten, Engquist, Osher, Chakravarthy; the 1986 paper lists Harten, Osher, Engquist, Chakravarthy; Jiang & Shu use the second order in their text but the first in their reference list.",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(87)90031-3",
   "https://ntrs.nasa.gov/citations/19860016815",
   "https://doi.org/10.1137/0724022",
   "https://doi.org/10.1016/0168-9274(86)90039-5"
  ],
  "kind": "shocks"
 },
 {
  "id": "kim-moin-moser-1987",
  "year": "1987",
  "title": "Kim–Moin–Moser channel-flow DNS",
  "who": "John Kim, Parviz Moin and Robert Moser",
  "work": "J. Kim, P. Moin and R. Moser, \"Turbulence statistics in fully developed channel flow at low Reynolds number\", Journal of Fluid Mechanics 177, 133–166 (April 1987). doi:10.1017/S0022112087000892",
  "what": "A direct numerical simulation of turbulent flow between parallel plates: all essential scales are resolved and no subgrid model is used. The Reynolds number was 3300, based on mean centreline velocity and channel half-width, and the grid had about 4 million points. The statistics were compared with experiments, with particular attention to near-wall behaviour, and included correlations not previously available from experiment. It became a standard reference for testing turbulence models and later simulations.",
  "challenge": "Resolution cost of DNS.",
  "detail": "Grid 192 × 129 × 160 (x, y, z), per the abstract. Later papers describe it as the Re_τ = 180 case, in a 4π × 2π × 2 domain (Mortensen & Valen-Sendstad, arXiv:1602.03643), and describe its method as a Fourier–Chebyshev pseudo-spectral solution of a wall-normal velocity/vorticity formulation.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "turbulence",
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1017/S0022112087000892",
   "https://arxiv.org/abs/1602.03643"
  ],
  "kind": "turbulence"
 },
 {
  "id": "mcnamara-zanetti-1988",
  "year": "1988",
  "title": "From lattice gas to lattice Boltzmann",
  "who": "Guy R. McNamara and Gianluigi Zanetti",
  "work": "G. R. McNamara and G. Zanetti, \"Use of the Boltzmann equation to simulate lattice-gas automata\", Physical Review Letters 61(20), 2332–2335 (14 November 1988). doi:10.1103/PhysRevLett.61.2332",
  "what": "Instead of tracking Boolean particles, they evolved the ensemble-averaged occupation numbers of a lattice gas, which are real numbers, with a lattice Boltzmann equation. In their words, 'This approach completely eliminates the statistical noise that plagues the usual lattice-gas simulations' (https://doi.org/10.1103/PhysRevLett.61.2332). It is generally regarded as the first lattice Boltzmann method.",
  "challenge": "Statistical noise and cost in lattice-gas simulations.",
  "detail": "The abstract estimates the method to be more efficient than lattice-gas automata 'for intermediate to low Reynolds number' (R ≲ 100).",
  "contested": "The 1988 scheme kept the lattice-gas collision rules. Simplifications followed quickly. Higuera & Jiménez ('Boltzmann approach to lattice gas simulations', Europhys. Lett. 9, 663–668, August 1989) expressed the collision operator by its linearised part. Single-relaxation-time (BGK) versions appeared in 1991–92 (see Qian et al. 1992).",
  "confidence": "high",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1103/PhysRevLett.61.2332",
   "https://doi.org/10.1209/0295-5075/9/7/009"
  ],
  "kind": "methods"
 },
 {
  "id": "shu-osher-1988",
  "year": "1988",
  "title": "Shu–Osher: flux-form ENO and TVD Runge–Kutta",
  "who": "Chi-Wang Shu and Stanley Osher",
  "work": "C.-W. Shu and S. Osher, \"Efficient implementation of essentially non-oscillatory shock-capturing schemes\", Journal of Computational Physics 77(2), 439–471 (August 1988). doi:10.1016/0021-9991(88)90177-5. Part II: J. Comput. Phys. 83(1), 32–78 (July 1989), doi:10.1016/0021-9991(89)90222-2.",
  "what": "Shu and Osher rewrote ENO in terms of point values and fluxes (finite-difference form) instead of cell averages. This avoids the costly reconstruction step and makes multidimensional ENO practical. They paired it with explicit Runge–Kutta time-stepping in which each stage is a convex combination of forward-Euler steps, so the non-oscillatory property of the spatial scheme survives time integration. These are the 'TVD Runge–Kutta' methods, now called strong-stability-preserving (SSP).",
  "challenge": "Oscillations at shocks, and keeping non-oscillatory behaviour when moving to high-order time stepping.",
  "detail": "Jiang & Shu (1996) write that 'Shu and Osher [14, 15] developed the flux version of ENO schemes which does not require such a reconstruction procedure.' Shu's 'Total-variation-diminishing time discretizations', SIAM J. Sci. Stat. Comput. 9(6), 1073–1084 (November 1988), develops the time-stepping theory further. Gottlieb, Shu & Tadmor (SIAM Review 43, 89–112, 2001) renamed the methods SSP: 'Previously termed TVD (total variation diminishing) time discretizations' (https://doi.org/10.1137/S003614450036757X).",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "shocks",
   "discretization"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(88)90177-5",
   "https://doi.org/10.1137/0909073",
   "https://doi.org/10.1137/S003614450036757X",
   "https://ntrs.nasa.gov/citations/19960007052"
  ],
  "kind": "shocks"
 },
 {
  "id": "monaghan-1992-sph-review",
  "year": "1992",
  "title": "Monaghan's SPH review and the standard artificial viscosity",
  "who": "Joseph J. Monaghan",
  "work": "J. J. Monaghan, \"Smoothed particle hydrodynamics\", Annual Review of Astronomy and Astrophysics 30, 543–574 (September 1992). doi:10.1146/annurev.aa.30.090192.002551",
  "what": "Monaghan's review presented SPH as kernel interpolation and gave the conservative forms of its equations. It also set out the artificial viscosity that lets SPH capture shocks: a term acting between pairs of particles, with a linear (α) part and a quadratic (β) part. This became the 'standard' SPH artificial viscosity, with α = 1 and β = 2 as typical values.",
  "challenge": "Capturing shocks in a particle method, and the extra dissipation an artificial viscosity adds.",
  "detail": "Price (2012): 'The ‘standard’ formulation of artificial viscosity is given by (Monaghan, 1992)'. He adds: 'This form was chosen because it is Galilean invariant, vanishes for rigid body rotation and conserves total linear and angular momentum (Monaghan, 1992).' (https://arxiv.org/abs/1012.1885)",
  "contested": "The 1992 review is the usual citation, but the pairwise artificial viscosity goes back to Monaghan & Gingold, 'Shock simulation by the particle method SPH' (J. Comput. Phys. 52, 374–389, 1983).",
  "confidence": "high",
  "chapters": [
   "lattice-particles",
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1146/annurev.aa.30.090192.002551",
   "https://arxiv.org/abs/1012.1885"
  ],
  "kind": "methods"
 },
 {
  "id": "qian-dhumieres-lallemand-1992",
  "year": "1992",
  "title": "Lattice BGK models",
  "who": "Y. H. Qian, D. d'Humières and P. Lallemand",
  "work": "Y. H. Qian, D. d'Humières and P. Lallemand, \"Lattice BGK models for Navier-Stokes equation\", Europhysics Letters 17(6), 479–484 (February 1992). doi:10.1209/0295-5075/17/6/001",
  "what": "They replaced the collision operator inherited from lattice gases with a single relaxation toward a chosen equilibrium distribution (the Bhatnagar–Gross–Krook, or BGK, form). With a properly chosen equilibrium, the Navier–Stokes equation is recovered at second order, and the relaxation parameter sets the viscosity. The abstract says: 'Compared to lattice gases, the present model is noise-free, has Galileian invariance and a velocity-independent pressure' (https://doi.org/10.1209/0295-5075/17/6/001).",
  "challenge": "The noise and non-Galilean invariance of lattice gases. The relaxation parameter also 'influences the stability of the new scheme' (abstract).",
  "detail": "The paper's simulations confirmed the predicted speed of sound and shear viscosity.",
  "contested": "Credit is shared. Koelman ('A simple lattice Boltzmann scheme for Navier-Stokes fluid flow', Europhys. Lett. 15, 603–607, July 1991) and Chen, Chen, Martínez & Matthaeus (Phys. Rev. Lett. 67, 3776, December 1991, for magnetohydrodynamics) published lattice Boltzmann schemes earlier. Chen, Chen & Matthaeus (Phys. Rev. A 45, R5339, April 1992) showed a lattice Boltzmann model that removes the non-Galilean invariance and the velocity-dependent equation of state of lattice gases. Qian et al. are the standard citation for 'lattice BGK', but the simplified single-relaxation approach arose in several groups around 1991–92.",
  "confidence": "high",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1209/0295-5075/17/6/001",
   "https://doi.org/10.1209/0295-5075/15/6/007",
   "https://doi.org/10.1103/PhysRevLett.67.3776",
   "https://doi.org/10.1103/PhysRevA.45.R5339"
  ],
  "kind": "methods"
 },
 {
  "id": "vandervorst-1992-bicgstab",
  "year": "1992",
  "title": "Bi-CGSTAB",
  "who": "H. A. van der Vorst",
  "work": "H. A. van der Vorst, \"Bi-CGSTAB: A fast and smoothly converging variant of Bi-CG for the solution of nonsymmetric linear systems\", SIAM Journal on Scientific and Statistical Computing 13(2), 631–644 (March 1992). doi:10.1137/0913035",
  "what": "Van der Vorst proposed Bi-CGSTAB, a variant of the biconjugate gradient method for nonsymmetric systems. It was designed to avoid the irregular convergence of the earlier CG-S (conjugate gradients squared) method, where rounding errors could cause severe cancellation. Its memory use does not grow with the iteration count, unlike GMRES, and it is widely used for implicit and pressure-correction systems in CFD.",
  "challenge": "Slow or erratic solver convergence for nonsymmetric systems.",
  "detail": "The abstract reports that numerical experiments showed Bi-CGSTAB to be 'often much more efficient than CG-S'.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.1137/0913035"
  ],
  "kind": "solvers"
 },
 {
  "id": "spalart-allmaras-1992",
  "year": "1992",
  "title": "Spalart–Allmaras one-equation turbulence model",
  "who": "Philippe R. Spalart and Steven R. Allmaras",
  "work": "P. R. Spalart and S. R. Allmaras, \"A one-equation turbulence model for aerodynamic flows\", AIAA Paper 92-0439, 30th Aerospace Sciences Meeting and Exhibit, Reno, January 1992 (doi:10.2514/6.1992-439); journal version: La Recherche Aérospatiale, no. 1, 1994, pp. 5–21.",
  "what": "A Reynolds-averaged (RANS) turbulence model that solves a single transport equation for a working variable related to the eddy viscosity. It was designed for wall-bounded aerodynamic flows such as wings and airfoils. Being cheap and robust, it became widely used in external aerodynamics.",
  "challenge": "Turbulence closure: modelling unresolved turbulence at affordable cost.",
  "detail": "Conference paper January 1992; journal version 1994. The NASA Turbulence Modeling Resource says there are some differences between the two and 'the journal reference takes precedence' (for example, the constants c_t3 and c_t4 were 1.1 and 2.0 in the conference paper). Its 'standard' SA version leaves out the trip term of the original paper. It describes f_t2 as 'a numerical fix in the original model in order to make zero a stable solution', and calls the version without it (SA-noft2) 'a commonly-used variant'.",
  "contested": "Presented in 1992 but printed in 1994, so cite both years. Codes that claim to use 'SA' may implement slightly different variants (with or without f_t2 or the trip term), so results can differ between them.",
  "confidence": "high",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://tmbwg.github.io/turbmodels/spalart.html",
   "https://doi.org/10.2514/6.1992-439",
   "https://en.wikipedia.org/wiki/Spalart%E2%80%93Allmaras_turbulence_model"
  ],
  "kind": "turbulence"
 },
 {
  "id": "quirk-1994-carbuncle",
  "year": "1994",
  "title": "Quirk's 'great Riemann solver debate' and the carbuncle",
  "who": "James J. Quirk",
  "work": "J. J. Quirk, \"A contribution to the great Riemann solver debate\", International Journal for Numerical Methods in Fluids 18(6), 555–574 (30 March 1994). doi:10.1002/fld.1650180603",
  "what": "Quirk showed that many Godunov-type schemes, including those built on Roe's solver, contain subtle flaws that can produce spurious solutions in multidimensional flows with strong shocks. The best-known example is the 'carbuncle': in strongly supersonic flow against a cylinder, the middle of the computed bow shock degenerates into a carbuncle-shaped bulge. He also offered a simple strategy for working around the failings of individual Riemann solvers. His abstract states the first aim: 'to increase the level of awareness within the shock‐capturing community of the fact that many Godunov‐type methods contain subtle flaws that can cause spurious solutions to be computed' (https://doi.org/10.1002/fld.1650180603).",
  "challenge": "Spurious solutions and instability at strong shocks aligned with the grid. Upwind solvers that are accurate in 1-D can fail in 2-D.",
  "detail": "Kemm (arXiv:1507.00666) calls it 'the seminal paper of Quirk'. He notes that Quirk conjectured a link between the carbuncle and odd-even decoupling at straight grid-aligned shocks, and that Quirk introduced the 'Quirk test' (a shock running down a duct). The remedy is commonly described as switching locally to a more dissipative solver near strong shocks; that description was not checked against the paper's text.",
  "contested": "Quirk did not discover the carbuncle. It is traced to Peery & Imlay, 'Blunt-body flow simulations', AIAA Paper 88-2904 (24th Joint Propulsion Conference, July 1988), whose blunt-body results gave the phenomenon its name. No cure is universally accepted. Roe and co-authors wrote in 2005: 'we do not present a cure, and are careful not to promise one, although we do feel free to criticize others' (AIAA Paper 2005-4872, https://doi.org/10.2514/6.2005-4872).",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1002/fld.1650180603",
   "https://doi.org/10.2514/6.1988-2904",
   "https://arxiv.org/abs/1507.00666",
   "https://doi.org/10.2514/6.2005-4872"
  ],
  "kind": "shocks"
 },
 {
  "id": "liu-osher-chan-1994-weno",
  "year": "1994",
  "title": "WENO (weighted ENO) schemes",
  "who": "Xu-Dong Liu, Stanley Osher and Tony Chan",
  "work": "X.-D. Liu, S. Osher and T. Chan, \"Weighted essentially non-oscillatory schemes\", Journal of Computational Physics 115(1), 200–212 (November 1994). doi:10.1006/jcph.1994.1187",
  "what": "Instead of picking the single 'smoothest' ENO stencil, WENO takes a convex combination of all candidate stencils. Nonlinear weights approach fixed optimal values where the solution is smooth and become nearly zero for stencils that cross a discontinuity. This removes ENO's sensitivity to round-off in the stencil choice and raises the order: Liu et al. showed that WENO built from r-th order ENO is (r+1)-th order accurate.",
  "challenge": "Oscillations at shocks, and the fragility of ENO's discrete stencil choice.",
  "detail": "These properties are as summarised by Jiang & Shu (1996): 'It was shown by Liu et al. that WENO schemes constructed from the rth order (in L1 norm) ENO schemes are (r +1)th order accurate.' They note that the optimal case is order 2r−1, which their new smoothness measure reaches for r = 3 (fifth order). They also note that WENO removes the logical statements of ENO stencil selection and is 'not sensitive to round-off errors'.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1006/jcph.1994.1187",
   "https://ntrs.nasa.gov/citations/19960007052"
  ],
  "kind": "shocks"
 },
 {
  "id": "steinhoff-underhill-1994",
  "year": "1994",
  "title": "Vorticity confinement",
  "who": "John Steinhoff and David Underhill",
  "work": "J. Steinhoff and D. Underhill, \"Modification of the Euler equations for 'vorticity confinement': Application to the computation of interacting vortex rings\", Physics of Fluids 6(8), 2738–2744 (August 1994). doi:10.1063/1.868164",
  "what": "They added a term to the momentum equations that depends only on local variables and is zero outside vortical regions. With it, thin vortices on coarse fixed grids, computed with simple first- or second-order schemes, convect without spreading out through numerical diffusion. The paper applied it to incompressible 3-D flow in which pairs of thin vortex rings interact and, in some cases, merge.",
  "challenge": "Numerical diffusion of thin vortical structures on coarse grids.",
  "detail": "The abstract calls the confined vortical regions 'covons' and says the extra term, together with the diffusive terms, constitutes 'a new type of regularization of the inviscid equations' (https://doi.org/10.1063/1.868164). Fedkiw, Stam & Jensen (2001) brought the method into computer graphics, describing it as developed for computing complex turbulent flow fields around helicopters.",
  "contested": "The term is a numerical regularisation, not a physical force derived from the equations of motion, and its strength is a tunable parameter.",
  "confidence": "high",
  "chapters": [
   "stable-fluids",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1063/1.868164",
   "https://graphics.ucsd.edu/~henrik/papers/smoke/smoke.pdf"
  ],
  "kind": "accuracy"
 },
 {
  "id": "roache-1994-gci",
  "year": "1994",
  "title": "Roache's Grid Convergence Index (GCI)",
  "who": "Patrick J. Roache",
  "work": "P. J. Roache, \"Perspective: A method for uniform reporting of grid refinement studies\", Journal of Fluids Engineering 116(3), 405–413 (September 1994). doi:10.1115/1.2910291",
  "what": "Roache proposed the Grid Convergence Index, which turns the difference between solutions on two or more grids into an uncertainty band for grid convergence. It is based on generalised Richardson extrapolation and is scaled to resemble the result expected from doubling the grid with a second-order method. A safety factor guards against grids that are not yet in the asymptotic range.",
  "challenge": "Quantifying discretization error and checking convergence under grid refinement.",
  "detail": "The abstract recommends it 'whether or not Richardson Extrapolation is actually used to improve the accuracy', and adds: 'The simple formulas may be applied a posteriori by editors and reviewers, even if authors are reluctant to do so.' (https://doi.org/10.1115/1.2910291). NASA's NPARC tutorial recommends a safety factor 'Fs=3.0 for comparisons of two grids' and 'Fs=1.25 for comparisons over three or more grids'.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1115/1.2910291",
   "https://www.grc.nasa.gov/www/wind/valid/tutorial/spatconv.html"
  ],
  "kind": "trust"
 },
 {
  "id": "swegle-1995-tensile",
  "year": "1995",
  "title": "SPH tensile instability (Swegle, Hicks & Attaway)",
  "who": "J. W. Swegle, D. L. Hicks and S. W. Attaway",
  "work": "J. W. Swegle, D. L. Hicks and S. W. Attaway, \"Smoothed particle hydrodynamics stability analysis\", Journal of Computational Physics 116(1), 123–134 (January 1995). doi:10.1006/jcph.1995.1010",
  "what": "Tests of standard SPH with a cubic B-spline kernel showed an instability under tension but not under compression. A von Neumann stability analysis gave the criterion for stability in terms of the stress state and the second derivative of the kernel. The authors traced the instability to an effective stress with a negative modulus, produced by the interaction between the constitutive law and the kernel, not to the time integration. This 'tensile instability', in which particles clump together, became a known obstacle for SPH in solid mechanics and magnetohydrodynamics.",
  "challenge": "Instability: spurious clumping of particles under negative pressure or tension.",
  "detail": "The abstract also notes that kernels can be constructed that are stable in tension but unstable in compression. Price (2012) describes the effect: when the pairwise force reverses sign, 'the particles clump together unphysically'. Monaghan's 'SPH without a tensile instability' (J. Comput. Phys. 159, 290–311, April 2000) proposed a remedy.",
  "contested": "Price (2012) attributes the name 'tensile instability' to Monaghan (2000), while the stability analysis is Swegle et al. (1995). The previous draft's mention of an earlier Swegle memo ('SPH in Tension', 1992) was removed because we could not confirm it.",
  "confidence": "high",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1006/jcph.1995.1010",
   "https://digitalcommons.mtu.edu/michigantech-p/3961",
   "https://doi.org/10.1006/jcph.2000.6439",
   "https://arxiv.org/abs/1012.1885"
  ],
  "kind": "stability"
 },
 {
  "id": "jiang-shu-1996-weno",
  "year": "1996",
  "title": "Jiang–Shu fifth-order WENO",
  "who": "Guang-Shan Jiang and Chi-Wang Shu",
  "work": "G.-S. Jiang and C.-W. Shu, \"Efficient implementation of weighted ENO schemes\", Journal of Computational Physics 126(1), 202–228 (June 1996). doi:10.1006/jcph.1996.0130",
  "what": "Jiang and Shu introduced a new way to measure the smoothness of each candidate stencil. With it, the r = 3 WENO scheme becomes fifth-order accurate instead of fourth. The resulting scheme, often called WENO-JS, became the standard high-order shock-capturing method for finite differences. They also suggested computing the weights for the Euler equations from pressure and entropy, which avoids costly characteristic decompositions in problems without strong shocks or strong reflected waves.",
  "challenge": "Oscillations at shocks, at a reasonable cost per unit of accuracy.",
  "detail": "Abstract: 'We propose a new way of measuring the smoothness of a numerical solution, emulating the idea of minimizing the total variation of the approximation, which results in a 5th order WENO scheme for the case r = 3, instead of the 4th order with the original smoothness measurement by Liu et al.' (https://ntrs.nasa.gov/citations/19960007052). The abstract also reports that both WENO schemes are about twice as fast as fourth-order ENO on vector supercomputers, and as fast on serial and parallel computers.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1006/jcph.1996.0130",
   "https://ntrs.nasa.gov/citations/19960007052"
  ],
  "kind": "shocks"
 },
 {
  "id": "foster-metaxas-1996",
  "year": "1996",
  "title": "Foster & Metaxas: Navier–Stokes liquids in graphics",
  "who": "Nick Foster and Dimitri Metaxas",
  "work": "N. Foster and D. Metaxas, \"Realistic animation of liquids\", Graphical Models and Image Processing 58(5), 471–483 (September 1996). doi:10.1006/gmip.1996.0039",
  "what": "Brought finite-difference solution of the 3-D Navier–Stokes equations into computer-graphics animation of liquids. Velocity and pressure are updated on a grid. The free surface is a height field (or, in 2-D, a set of massless particles), and Lagrangian equations of motion place buoyant objects and track spray and foam. Wave reflection, refraction and diffraction, as well as eddies, vorticity and splashing, emerged from the simulation instead of being animated by hand.",
  "challenge": "Time-step limits of explicit schemes.",
  "detail": "Stam (1999), discussing Foster & Metaxas, says their algorithm 'is based mainly on the work of Harlow and Welch in computational fluid dynamics, which dates back to 1965' and used an explicit time solver. He adds: 'The main problem with explicit solvers is that the numerical scheme can become unstable for large time-steps.' (https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf). A companion paper on gases, 'Modeling the motion of a hot, turbulent gas', appeared at SIGGRAPH 1997 (pp. 181–188).",
  "contested": "Often called the first Navier–Stokes fluid in graphics. Stam (1999) lists earlier 2-D Navier–Stokes-based graphics work (Yaeger & Upson 1986; Gamito et al. 1995; Chen et al.), so 'an early full 3-D Navier–Stokes liquid animation in graphics' is the safer wording. 'Reflection, refraction and diffraction' here are wave effects in the liquid, not optical rendering effects.",
  "confidence": "high",
  "chapters": [
   "stable-fluids"
  ],
  "sources": [
   "https://doi.org/10.1006/gmip.1996.0039",
   "https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf"
  ],
  "kind": "methods"
 },
 {
  "id": "stam-1999-stable-fluids",
  "year": "1999",
  "title": "Stam's 'Stable Fluids'",
  "who": "Jos Stam (Alias|Wavefront)",
  "work": "J. Stam, \"Stable fluids\", Proceedings of SIGGRAPH 99 (26th Annual Conference on Computer Graphics and Interactive Techniques), 121–128 (1999). doi:10.1145/311535.311548",
  "what": "Stam split each time step into four parts: add forces, advect, diffuse, project. Advection traces each grid point backward along the velocity field and interpolates (a semi-Lagrangian step based on the method of characteristics). Diffusion is solved implicitly. Projection makes the velocity divergence-free by a Poisson solve, justified by the Helmholtz–Hodge decomposition, with an FFT version for periodic domains. Because interpolation never creates values larger than the old maximum, any time step is stable, which made interactive real-time fluids possible.",
  "challenge": "Explicit time-step instability ('blow-ups'), traded for heavy numerical dissipation.",
  "detail": "Stam: 'the maximum value of the new field is never larger than the largest value of the previous field'. He also acknowledged the cost: 'Indeed, it suffers from too much “numerical dissipation”, i.e., the flow tends to dampen too rapidly as compared to actual experiments.' (https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf)",
  "contested": "Stam wrote: 'Our method cannot be found in the computational fluids literature, since it is custom made for computer graphics applications.' (same PDF). The combination was new to graphics, but its ingredients were not. Semi-Lagrangian advection was well established in numerical weather prediction (reviewed by Staniforth & Côté, Monthly Weather Review 119, 2206–2223, 1991), and backward-characteristic differencing goes back to Courant, Isaacson & Rees (Comm. Pure Appl. Math. 5, 243–255, 1952). Also, 'unconditionally stable' does not mean accurate.",
  "confidence": "high",
  "chapters": [
   "stable-fluids",
   "advection",
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.1145/311535.311548",
   "https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf",
   "https://doi.org/10.1175/1520-0493(1991)119<2206:SLISFA>2.0.CO;2",
   "https://doi.org/10.1002/cpa.3160050303"
  ],
  "kind": "stability"
 },
 {
  "id": "mms-salari-knupp-2000",
  "year": "2000",
  "title": "Salari & Knupp's MMS code-verification procedure",
  "who": "Kambiz Salari and Patrick Knupp (Sandia National Laboratories)",
  "work": "K. Salari and P. Knupp, \"Code Verification by the Method of Manufactured Solutions\", Sandia National Laboratories report SAND2000-1444 (June 2000). doi:10.2172/759450",
  "what": "A detailed procedure for verifying CFD codes with manufactured solutions, demonstrated on codes for 2-D Burgers, compressible and incompressible Navier–Stokes equations. The pass/fail test is whether the observed order of accuracy under grid refinement matches the theoretical order. A blind-test protocol of twenty-one cases with deliberately introduced coding mistakes, including a 'placebo' case with no mistake, showed which mistakes the method catches and which it cannot.",
  "challenge": "Code verification: catching coding errors that spoil the order of accuracy.",
  "detail": "The abstract says MMS 'can identify any coding mistake that affects the order-of-accuracy of the numerical method'. The report names its main limitation: 'the requirement that the code contain an option for input of distributed source terms and spatially-variable boundary data' (https://www.osti.gov/servlets/purl/759450).",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "trust"
  ],
  "sources": [
   "https://www.osti.gov/biblio/759450",
   "https://www.osti.gov/servlets/purl/759450"
  ],
  "kind": "trust"
 },
 {
  "id": "clay-2000-navier-stokes",
  "year": "2000",
  "title": "The Clay Millennium Prize problem for Navier–Stokes",
  "who": "Clay Mathematics Institute; official problem description by Charles L. Fefferman",
  "work": "Clay Mathematics Institute, Millennium Prize Problems, announced 24 May 2000 at the Collège de France, Paris; C. L. Fefferman, \"Existence and smoothness of the Navier–Stokes equation\" (official problem description, Clay Mathematics Institute).",
  "what": "One of seven Millennium Prize Problems, each worth US$1 million. For the incompressible Navier–Stokes equations in three dimensions, either on all of R³ with decaying data or in a periodic box, one must prove that smooth initial data always give smooth, finite-energy solutions for all time, or exhibit a breakdown. Fefferman's description sets this out as four alternative statements, (A) to (D).",
  "challenge": "Whether the continuum equations themselves can develop singularities, a question that no numerical resolution can settle.",
  "detail": "Fefferman notes that the 2-D analogues have long been known and that in 3-D smoothness holds for small data or short times. Leray (Acta Math. 63, 1934) proved that weak solutions exist. Fefferman: 'Uniqueness of weak solutions of the Navier–Stokes equation is not known.' (https://www.claymath.org/wp-content/uploads/2022/06/navierstokes.pdf)",
  "contested": "Popular accounts say the prize is for 'solving the Navier–Stokes equations' or 'explaining turbulence'. It is neither: it asks whether smooth solutions persist. Simulations cannot settle it, and an apparent blow-up in a computation cannot be told apart from a numerical artefact without a proof.",
  "confidence": "high",
  "chapters": [
   "conservation",
   "turbulence"
  ],
  "sources": [
   "https://www.claymath.org/millennium-problems/",
   "https://www.claymath.org/millennium/navier-stokes-equation/",
   "https://www.claymath.org/wp-content/uploads/2022/06/navierstokes.pdf"
  ],
  "kind": "trust"
 },
 {
  "id": "fedkiw-stam-jensen-2001",
  "year": "2001",
  "title": "Visual simulation of smoke (vorticity confinement in graphics)",
  "who": "Ronald Fedkiw, Jos Stam and Henrik Wann Jensen",
  "work": "R. Fedkiw, J. Stam and H. W. Jensen, \"Visual simulation of smoke\", Proceedings of SIGGRAPH 2001, 15–22 (August 2001). doi:10.1145/383259.383260",
  "what": "They solved the inviscid Euler equations on a staggered (MAC) grid with semi-Lagrangian advection and a pressure projection. They added Steinhoff's vorticity confinement to restore the small-scale rolling motion that numerical dissipation removes on coarse grids. They also replaced linear interpolation with a monotonic cubic interpolant, which reduces dissipation while avoiding overshoots.",
  "challenge": "Numerical dissipation in semi-Lagrangian advection on coarse grids.",
  "detail": "'The basic idea is to inject the energy lost due to numerical dissipation back into the fluid using a forcing term.' The force is scaled with the grid spacing, which 'guarantees that as the mesh is refined the physically correct solution is still obtained'. The paper also says: 'This technique was invented by Steinhoff about 10 years ago'. (https://graphics.ucsd.edu/~henrik/papers/smoke/smoke.pdf)",
  "contested": "The paper calls the confinement term 'physically consistent' because it vanishes as the grid is refined. On any fixed grid it is still an added, tunable force.",
  "confidence": "high",
  "chapters": [
   "stable-fluids",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1145/383259.383260",
   "https://graphics.ucsd.edu/~henrik/papers/smoke/smoke.pdf"
  ],
  "kind": "accuracy"
 },
 {
  "id": "dns-pre-gpu-records",
  "year": "2002",
  "title": "Record DNS before GPUs: Earth Simulator 4096³, Blue Waters 8192³, K computer 12288³",
  "who": "M. Yokokawa, K. Itakura, A. Uno, T. Ishihara, Y. Kaneda; P. K. Yeung, X. M. Zhai, K. R. Sreenivasan; T. Ishihara, K. Morishita, M. Yokokawa, A. Uno, Y. Kaneda",
  "work": "M. Yokokawa et al., \"16.4-Tflops direct numerical simulation of turbulence by a Fourier spectral method on the Earth Simulator\", Proc. SC2002 (Baltimore, 2002), doi:10.1109/SC.2002.10052; Y. Kaneda et al., \"Energy dissipation rate and energy spectrum in high resolution direct numerical simulations of turbulence in a periodic box\", Physics of Fluids 15(2), L21–L24 (February 2003), doi:10.1063/1.1539855; P. K. Yeung, X. M. Zhai and K. R. Sreenivasan, \"Extreme events in computational turbulence\", PNAS 112(41), 12633–12638 (2015), doi:10.1073/pnas.1517368112; T. Ishihara et al., \"Energy spectrum in high-resolution direct numerical simulations of turbulence\", Physical Review Fluids 1, 082403 (22 December 2016), doi:10.1103/PhysRevFluids.1.082403.",
  "what": "Fourier pseudo-spectral DNS of forced isotropic turbulence in a periodic box set successive grid records on CPU and vector supercomputers. Japan's Earth Simulator reached 4096³ (2002–03), sustaining 16.4 Tflops at 2048³. Blue Waters ran 8192³ at a Taylor-scale Reynolds number of about 1300 (2015). The K computer ran 12288³ at a Taylor-scale Reynolds number of about 2300 (2016). The Earth Simulator results suggested that the normalised dissipation rate tends to a constant as viscosity goes to zero, and that the inertial-range spectrum is slightly steeper than k^(−5/3).",
  "challenge": "DNS cost grows steeply with Reynolds number, and 3-D FFTs need global communication.",
  "detail": "Kaneda et al. (2003): the inertial-range exponent is steeper than −5/3 'by about 0.1'. Ishihara et al. (2016) fit a correction exponent m ≈ −0.12. A Japanese grant (KAKEN) summary reports the 12288³ runs on the K computer at 2.2% sustained performance on 37,376 compute nodes (https://kaken.nii.ac.jp/grant/KAKENHI-PROJECT-26390130). The Blue Waters code scaled to 2^18 = 262,144 cores on 'a Cray XE/XK machine rated at more than 10 petaflops in aggregate speed' (PMC4611667). The SC2002 paper predates the Physics of Fluids letter (2003).",
  "contested": "The previous draft gave 24,576 nodes for the K-computer run. We found no source for that figure; the KAKEN summary gives 37,376. PNAS (2015) described its 8192³ runs as 'the largest simulations performed, to date, aimed at improving our understanding of turbulence small-scale structure' (https://pmc.ncbi.nlm.nih.gov/articles/PMC4611667/). Within about a year the K-computer group published 12288³ results. 'Largest DNS' claims are usually qualified by purpose, Reynolds number or resolution, so compare like with like.",
  "confidence": "high",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1109/SC.2002.10052",
   "https://doi.org/10.1063/1.1539855",
   "https://pmc.ncbi.nlm.nih.gov/articles/PMC4611667/",
   "https://nagoya.repo.nii.ac.jp/records/23507"
  ],
  "kind": "turbulence"
 },
 {
  "id": "kim-2005-bfecc",
  "year": "2005",
  "title": "BFECC for fluid advection (FlowFixer)",
  "who": "ByungMoon Kim, Yingjie Liu, Ignacio Llamas and Jarek Rossignac",
  "work": "B. Kim, Y. Liu, I. Llamas and J. Rossignac, \"FlowFixer: Using BFECC for fluid simulation\", Eurographics Workshop on Natural Phenomena 2005, pp. 51–56 (Eurographics Association), doi:10.2312/NPH/NPH05/051-056. Journal version: \"Advections with significantly reduced dissipation and diffusion\", IEEE Transactions on Visualization and Computer Graphics 13(1), 135–144 (January 2007; online November 2006), doi:10.1109/TVCG.2007.3.",
  "what": "They applied Back and Forth Error Compensation and Correction (BFECC) to the advection steps of a fluid solver. The field is advected forward, then backward; the difference from the original estimates the error, which is subtracted before a final forward advection. Built on top of first-order upwind or semi-Lagrangian steps, BFECC gives second-order accuracy in space and time. It greatly reduces dissipation of velocity, smoke density and images, and reduces volume loss in level sets.",
  "challenge": "Numerical diffusion and dissipation in semi-Lagrangian advection.",
  "detail": "Abstract (DataCite/OpenAlex record): BFECC 'can be implemented easily on top of the first order upwinding or semi-Lagrangian integration of advection equations, while providing second order accuracy both in space and time'.",
  "contested": "BFECC was not invented for graphics. The abstract says it 'was recently developed for interface computation by using the level set method', referring to Dupont & Liu (J. Comput. Phys. 190, 311–324, 2003).",
  "confidence": "high",
  "chapters": [
   "stable-fluids",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.2312/NPH/NPH05/051-056",
   "https://api.datacite.org/dois/10.2312/NPH/NPH05/051-056",
   "https://doi.org/10.1109/TVCG.2007.3",
   "https://doi.org/10.1016/S0021-9991(03)00276-6"
  ],
  "kind": "accuracy"
 },
 {
  "id": "selle-2008-maccormack",
  "year": "2008",
  "title": "Unconditionally stable MacCormack advection",
  "who": "Andrew Selle, Ronald Fedkiw, ByungMoon Kim, Yingjie Liu and Jarek Rossignac",
  "work": "A. Selle, R. Fedkiw, B. Kim, Y. Liu and J. Rossignac, \"An unconditionally stable MacCormack method\", Journal of Scientific Computing 35(2–3), 350–371 (June 2008; published online 8 November 2007). doi:10.1007/s10915-007-9166-4",
  "what": "The authors showed that the MacCormack predictor–corrector estimates the advection error exactly as BFECC does (advect forward, then backward), but applies the correction to the forward-advected data. That removes BFECC's third advection step while keeping second-order accuracy in space and time. Building each step from first-order semi-Lagrangian advection makes the method unconditionally stable. Because the correction can create new extrema, they add a limiter. It became a common low-dissipation advection option in graphics fluid solvers.",
  "challenge": "Numerical dissipation, and the stability of higher-order corrections at large time steps.",
  "detail": "Published online in 2007, in a June 2008 print issue. The limiter clamps each final value between the min and max of the grid values used in the first semi-Lagrangian step. An alternative they tested, reverting to the first semi-Lagrangian value when the result would overshoot, gave nearly identical results. They also revert to first order near solid boundaries (author preprint, https://yingjie.math.gatech.edu/publications/SFKLR.pdf). The preprint lists the authors in the order Selle, Fedkiw, Liu, Kim, Rossignac.",
  "contested": "'Unconditionally stable' refers to stability, not accuracy: near steep gradients the limiter pushes the scheme back toward first order. The name refers to MacCormack's 1969 predictor–corrector (cited in the paper as AIAA Paper 69-354); MacCormack himself was not involved.",
  "confidence": "high",
  "chapters": [
   "stable-fluids",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1007/s10915-007-9166-4",
   "https://yingjie.math.gatech.edu/publications/SFKLR.pdf"
  ],
  "kind": "accuracy"
 },
 {
  "id": "bridson-2008-book",
  "year": "2008",
  "title": "Bridson's 'Fluid Simulation for Computer Graphics'",
  "who": "Robert Bridson",
  "work": "R. Bridson, Fluid Simulation for Computer Graphics, A K Peters (2008); 2nd edition, CRC Press / Taylor & Francis (2015).",
  "what": "A textbook that grew out of SIGGRAPH fluid-simulation course notes and expanded them into a full treatment of grid-based fluid simulation for animation. The 2006 course was by Bridson, Ronald Fedkiw and Matthias Müller-Fischer, and the 2007 notes by Bridson and Müller-Fischer. It covers staggered MAC grids, semi-Lagrangian advection, pressure projection with conjugate-gradient solvers, and level sets and particles for liquids. It is a common first reference for graphics fluid solvers.",
  "challenge": "Turning the pressure-projection approach into a practical, robust solver.",
  "detail": "Open Library lists the A K Peters edition as 2008 and the Taylor & Francis edition as 2015. Bridson's course page ('Maintained by Robert Bridson - August 10, 2007') says that 'A large part of this course was extended with a lot of new material into a book', 'available from A K Peters'. The 2006 SIGGRAPH course 'Fluid simulation' (Bridson, Fedkiw, Müller-Fischer) has doi:10.1145/1185657.1185730.",
  "contested": "",
  "confidence": "high",
  "chapters": [
   "stable-fluids",
   "pressure"
  ],
  "sources": [
   "https://www.cs.ubc.ca/~rbridson/fluidsimulation/",
   "https://openlibrary.org/isbn/9781568813264",
   "https://openlibrary.org/isbn/9781482232837",
   "https://doi.org/10.1145/1185657.1185730"
  ],
  "kind": "pressure"
 },
 {
  "id": "dns-gpu-era",
  "year": "2019",
  "title": "GPU-era record DNS grids: Summit 18432³ and Frontier 32768³",
  "who": "Kiran Ravikumar, David Appelhans and P. K. Yeung; P. K. Yeung, K. Ravikumar, S. Nichols and R. Uma-Vaideswaran",
  "work": "K. Ravikumar, D. Appelhans and P. K. Yeung, \"GPU acceleration of extreme scale pseudo-spectral simulations of turbulence using asynchronism\", Proc. SC19, 1–22 (November 2019), doi:10.1145/3295500.3356209; P. K. Yeung and K. Ravikumar, \"Advancing understanding of turbulence through extreme-scale computation: Intermittency and simulations at large problem sizes\", Physical Review Fluids 5, 110517 (24 November 2020), doi:10.1103/PhysRevFluids.5.110517; P. K. Yeung, K. Ravikumar, S. Nichols and R. Uma-Vaideswaran, \"GPU-enabled extreme-scale turbulence simulations: Fourier pseudo-spectral algorithms at the exascale using OpenMP offloading\", SSRN preprint (2024), doi:10.2139/ssrn.4821494; journal version Computer Physics Communications 306, 109364 (January 2025), doi:10.1016/j.cpc.2024.109364.",
  "what": "Pseudo-spectral DNS of isotropic turbulence spends most of its time on 3-D FFTs and all-to-all communication. Ravikumar, Appelhans and Yeung moved this work onto GPUs. They reported favourable performance up to an 18432³ grid on 3072 nodes of Summit (Oak Ridge), with a 4.7× GPU-over-CPU speed-up at 12288³. A 2024 paper by Yeung and co-workers reports a GPU code (GESTS) on the exascale machine Frontier (AMD MI250X GPUs) at grids up to 32768³, about 35 trillion points, on 4096 to 8192 nodes.",
  "challenge": "The cost of DNS and the communication bottleneck of spectral methods (global FFT transposes).",
  "detail": "The SC19 abstract calls 12288³ 'the largest problem size previously published in turbulence literature'. Dates: SC19 paper November 2019; Phys. Rev. Fluids November 2020; Frontier preprint 2024, journal version January 2025.",
  "contested": "Claims of the 'largest DNS' need qualifiers. The 18432³ and 32768³ figures come from performance and scaling demonstrations. The 2020 paper describes a 'multiresolution short-time sampling paradigm' rather than long, statistically steady runs at the top resolution, and the 2024 preprint says new science results are 'expected in the near future'. Before quoting a record, check what was run, for how long, and at what resolution.",
  "confidence": "high",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1145/3295500.3356209",
   "https://doi.org/10.1103/PhysRevFluids.5.110517",
   "https://doi.org/10.2139/ssrn.4821494",
   "https://doi.org/10.1016/j.cpc.2024.109364"
  ],
  "kind": "turbulence"
 },
 {
  "id": "buckmaster-vicol-2019",
  "year": "2019",
  "title": "Non-uniqueness of weak Navier–Stokes solutions",
  "who": "Tristan Buckmaster and Vlad Vicol",
  "work": "T. Buckmaster and V. Vicol, \"Nonuniqueness of weak solutions to the Navier-Stokes equation\", Annals of Mathematics 189(1), 101–144 (2019); received 5 October 2017, revised 9 October 2018, accepted 10 October 2018, published online 11 January 2019. arXiv:1709.10033 (first version 28 September 2017). doi:10.4007/annals.2019.189.1.3",
  "what": "They proved that weak solutions of the 3-D Navier–Stokes equations with finite kinetic energy are not unique. Their solutions can even be built to attain any prescribed smooth energy profile. The construction builds on the convex-integration ideas of De Lellis and Székelyhidi, first developed for the Euler equations and the Onsager conjecture. They also showed that Hölder-continuous dissipative weak solutions of 3-D Euler arise as vanishing-viscosity limits of such Navier–Stokes weak solutions.",
  "challenge": "Whether the equations determine the flow at all once solutions are rough. This sets the theoretical limit of what 'convergence' of a simulation can mean.",
  "detail": "arXiv 2017; published January 2019. From the paper: 'To date, the question of uniqueness of Leray-Hopf weak solutions for the 3D Navier-Stokes equations remains however open.' and 'at the moment we do not prove that they are Leray-Hopf weak solutions' (https://arxiv.org/abs/1709.10033).",
  "contested": "This does not solve the Clay problem, which is about smooth solutions. The solutions constructed are not shown to be Leray–Hopf, so they need not satisfy the energy inequality. Non-uniqueness of Leray–Hopf solutions was later shown with a specially constructed body force by Albritton, Brué & Colombo ('Non-uniqueness of Leray solutions of the forced Navier-Stokes equations', Annals of Math. 196, 415–455, 2022); that result does not cover the unforced case.",
  "confidence": "high",
  "chapters": [
   "conservation",
   "turbulence"
  ],
  "sources": [
   "https://annals.math.princeton.edu/2019/189-1/p03",
   "https://arxiv.org/abs/1709.10033",
   "https://doi.org/10.4007/annals.2022.196.1.3"
  ],
  "kind": "trust"
 }
];

export const KINDS = {
  stability: 'Stability',
  accuracy: 'Diffusion and dispersion',
  shocks: 'Shocks and oscillations',
  pressure: 'Pressure and incompressibility',
  stiffness: 'Stiffness',
  solvers: 'Solvers',
  turbulence: 'Turbulence and resolution',
  methods: 'New methods',
  trust: 'Verification',
};
