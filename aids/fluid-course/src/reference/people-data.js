// People in the course, from the fact-checked research dossier. Each record:
//   { id, name, born, died, places, tags, summary, contributions: [{year, what, work, confidence}],
//     notation, anecdote, quote, quote_source, contested, chapters, sources }
// Chapters cite people with <aside data-person="id">; the timeline page lists them all.
// Regenerate with: node aids/fluid-course/dev/import-research.mjs <research dir>

export const PEOPLE = [
 {
  "id": "archimedes",
  "name": "Archimedes of Syracuse",
  "born": "c. 287 BC",
  "died": "212 BC",
  "places": "Syracuse (Sicily); probably studied at Alexandria (Heath: 'He spent some time at Alexandria studying with the successors of Euclid')",
  "tags": [
   "theory",
   "mathematics"
  ],
  "summary": "On Floating Bodies is the earliest surviving mathematical treatment of fluids. It opens with a postulate about how the parts of a fluid press on one another, the oldest ancestor of the continuum idea of pressure, and it proves the buoyancy result now called Archimedes' principle.",
  "contributions": [
   {
    "year": "3rd century BC (exact date unknown)",
    "what": "Book I, Postulate 1 defines a fluid by how its parts push on each other: the less-compressed part is expelled by the more-compressed part, and each part is pressed perpendicularly by the fluid above it. Proposition 2 proves that the surface of any fluid at rest is a sphere whose centre is the centre of the Earth.",
    "work": "On Floating Bodies, Book I",
    "confidence": "high"
   },
   {
    "year": "3rd century BC",
    "what": "Props. 5–6: a solid lighter than the fluid sinks only until it displaces its own weight of fluid, and if forced under it is pushed up by the difference between the two weights. Prop. 7: a solid heavier than the fluid sinks, and when weighed in the fluid it is lighter than its true weight by the weight of fluid displaced. This is the result now called Archimedes' principle.",
    "work": "On Floating Bodies, Book I, Props. 5–7",
    "confidence": "high"
   },
   {
    "year": "3rd century BC",
    "what": "Works out when floating segments of a sphere (end of Book I) and right paraboloids of revolution (Book II) float stably. This is an early stability analysis of an equilibrium.",
    "work": "On Floating Bodies, Books I–II",
    "confidence": "high"
   },
   {
    "year": "1269; 1906",
    "what": "The treatise reached the Latin West through William of Moerbeke's Latin translation, made in 1269 after he settled at the papal court in Viterbo (autograph: Vatican, Ottob. lat. 1850). On Floating Bodies was present only in one of his two Greek source manuscripts (Codex B), which is now lost. J. L. Heiberg identified the Greek text in the Archimedes Palimpsest in 1906; the palimpsest is the only known Greek copy.",
    "work": "Moerbeke translation; Archimedes Palimpsest",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "The only Greek copy of On Floating Bodies survives as the scraped-off lower text of a parchment manuscript. The Archimedes text was copied in the 10th century and overwritten with a prayer book in the 13th. Heiberg examined it in Constantinople in 1906 but could not read all of it. The manuscript was sold at Christie's in New York in October 1998, and its buyer deposited it at the Walters Art Museum in Baltimore for conservation and imaging.",
  "quote": "Let us assume that a fluid has the property that, if its parts lie evenly and are continuous, the part which is less compressed is expelled by that which is more compressed, and each of its parts is compressed by the fluid above it perpendicularly, unless the fluid is shut up in something and compressed by something else.",
  "quote_source": "On Floating Bodies I, Postulate 1, English translation in T. L. Heath, Archimedes (London: SPCK, 1920), Project Gutenberg #35550: https://gutenberg.org/files/35550/35550-h/35550-h.htm",
  "contested": "The 'Eureka' story of the bath and Hiero's crown does not come from Archimedes. It is told by Vitruvius (De architectura, Book IX, introduction), writing in the 1st century BC, about two centuries later, and Archimedes' surviving works never mention the crown. In La Bilancetta (1586) Galileo called the water-overflow method 'a crude thing, far from scientific precision' and argued that Archimedes more likely used a balance. Heath (1920), by contrast, judged that 'on the whole it seems more likely' the discovery used the more elementary volume method Vitruvius describes. Proposition 7 of On Floating Bodies is the documented buoyancy result. The birth year is an inference: the 12th-century Byzantine writer Tzetzes says Archimedes was 75 when he died, and his death is placed at the sack of Syracuse in 212 BC (some sources give 211 BC).",
  "chapters": [
   "continuum",
   "conservation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Archimedes/",
   "https://gutenberg.org/files/35550/35550-h/35550-h.htm",
   "https://exhibits.museogalileo.it/archimedes/object/ArchimedesOperaLatinTranslationByMoerbekeCodexO.html",
   "https://math.nyu.edu/Archimedes/Crown/Vitruvius.html"
  ]
 },
 {
  "id": "leonardo-da-vinci",
  "name": "Leonardo da Vinci",
  "born": "1452 (15 April)",
  "died": "1519 (2 May)",
  "places": "Vinci, Florence, Milan, Rome; died at Cloux, Amboise (France)",
  "tags": [
   "experiment",
   "turbulence",
   "engineering"
  ],
  "summary": "Leonardo's notebooks hold the most detailed early drawings and descriptions of eddies, jets and river flow, and fluid dynamicists cite the Codex Atlanticus for the first use of the Italian word for turbulence. The notebooks stayed unpublished for centuries, so this careful observation did not feed into the science that followed.",
  "contributions": [
   {
    "year": "c. 1500–1519 (notebook pages are mostly undated)",
    "what": "Drew and described the wakes behind objects and the eddying motion on the surfaces of pools and rivers, and worried about how eddies erode river beds. Jiménez notes that he had several theories of how eddies arise and what they do, mostly incorrect.",
    "work": "Notebooks (Codex Atlanticus, Codex Leicester, Windsor drawings); summarised in J. Jiménez, 'Computers and turbulence', Eur. J. Mech. B/Fluids 79 (arXiv:1902.08471)",
    "confidence": "high"
   },
   {
    "year": "early 16th century",
    "what": "Used the Italian noun 'turbolenza' for water motion in a note in the Codex Atlanticus. Colagrossi et al. (2021) write that the word was used for the first time by Leonardo in the Codex Atlanticus.",
    "work": "Codex Atlanticus (Biblioteca Ambrosiana, Milan)",
    "confidence": "medium"
   },
   {
    "year": "early 16th century (drawing); 2021 (simulation study)",
    "what": "His drawing of a water jet falling into a pool (Royal Collection, Windsor, RCIN 912660) is often used by fluid dynamicists as the first important document on turbulent flow. A French-Italian group reproduced the flow it shows with smoothed particle hydrodynamics (SPH) simulations, to test the descriptions Leonardo wrote beside it.",
    "work": "A. Colagrossi, S. Marrone, P. Colagrossi and D. Le Touzé, 'Da Vinci's observation of turbulence: A French-Italian study aiming at numerically reproducing the physics behind one of his drawings, 500 years later', Physics of Fluids 33, 115122 (2021), doi:10.1063/5.0070984",
    "confidence": "high"
   },
   {
    "year": "2021 (review)",
    "what": "A review of his fluid-mechanics notes finds thinking suggestive of the no-slip condition, the hydraulic jump, cardiovascular vortices, conservation of volume, and the zigzag or spiral path of rising bubbles (now called Leonardo's paradox). It finds his successes strongest in water management and his failures most visible in his pursuit of human flight, and it stresses that 'turbulence' has multiple, ambiguous meanings in his writing.",
    "work": "I. Marusic and S. Broomhall, 'Leonardo da Vinci and Fluid Mechanics', Annual Review of Fluid Mechanics 53 (2021) 1–25",
    "confidence": "high"
   },
   {
    "year": "early 16th century",
    "what": "Marusic and Broomhall list 'conservation of volume' among the modern ideas his notes anticipate, usually illustrated by a river carrying the same quantity of water through every cross-section, so the water runs faster where the channel is narrower.",
    "work": "Notebooks; see Marusic and Broomhall (2021)",
    "confidence": "medium"
   }
  ],
  "notation": [
   "'turbolenza' (Italian noun) used for disordered water motion in a Codex Atlanticus note (early 16th century)"
  ],
  "anecdote": "Leonardo's hydraulics had little influence on the 17th-century founders of the field. Some writers claimed that Castelli drew on Leonardo for his 1628 book, but the Dictionary of Scientific Biography points out that Leonardo's manuscripts reached the Biblioteca Ambrosiana only in 1637 and that Arconati's compilation of Leonardo's writings on water is dated 1643.",
  "quote": "",
  "quote_source": "",
  "contested": "'Leonardo coined the word turbulence' needs care. Latin already had the adjective turbulentus and the verb turbare, and medieval and 16th-century writers used related words for weather and character; English 'turbulent' appears in 1538 (Jiménez, 'Computers and turbulence', arXiv:1902.08471). The defensible claim is narrower: his note is described as the first use of the Italian noun for a fluid-flow phenomenon. He did not have the modern idea of turbulence as a separate flow regime; Jiménez dates the recognition of two flow regimes to around the middle of the 19th century, from measurements of pipe friction. 'Father of fluid mechanics' claims overstate his influence, because the notebooks stayed unpublished.",
  "chapters": [
   "turbulence",
   "conservation",
   "lattice-particles"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Leonardo/",
   "https://doi.org/10.1146/annurev-fluid-022620-122816",
   "https://doi.org/10.1063/5.0070984",
   "https://arxiv.org/abs/1902.08471"
  ]
 },
 {
  "id": "simon-stevin",
  "name": "Simon Stevin",
  "born": "1548",
  "died": "1620 (February)",
  "places": "Bruges, Leiden, The Hague",
  "tags": [
   "theory",
   "mathematics",
   "engineering",
   "notation"
  ],
  "summary": "Stevin's 1586 hydrostatics showed that the pressure a liquid exerts on a surface depends on the liquid's height and the surface's area, not on the amount of liquid. This 'hydrostatic paradox' predates Pascal. He also popularised decimal fractions in Europe, the positional idea behind the finite-precision number formats used in computing (which apply it in base 2).",
  "contributions": [
   {
    "year": "1586",
    "what": "A treatise on hydrostatics that improved on Archimedes. It shows that the pressure a liquid exerts on a given surface depends on the height of the liquid and the area of the surface; the bottom of a vessel bears the weight of a column of water with that bottom as base and the water's height as height, whatever the vessel's shape.",
    "work": "De Beghinselen des Waterwichts (1586); French translation by Albert Girard (Leiden, 1634)",
    "confidence": "high"
   },
   {
    "year": "1585",
    "what": "A 29-page booklet giving an elementary and thorough account of decimal fractions. He did not invent decimals, but he introduced their use in mathematics in Europe.",
    "work": "De Thiende (1585)",
    "confidence": "high"
   }
  ],
  "notation": [
   "Decimal fractions, popularised in Europe by De Thiende (1585)"
  ],
  "anecdote": "Stevin drew a practical moral for lock gates: water only a hair's breadth wide on one side presses as hard as the ocean on the other, provided both stand at the same height.",
  "quote": "l’eau d’un costé n’ayant qu’un brin de largeur pressera autant à l’encontre que le grand Ocean de l’autre costé",
  "quote_source": "Stevin, Practique de l'Hydrostatique, in Albert Girard's French translation (Leiden, 1634), p. 500, as quoted in a footnote to Pascal's Traité de l'équilibre des liqueurs, ch. I (Brunschvicg–Boutroux edition, 1923): https://fr.wikisource.org/wiki/Trait%C3%A9_de_l%E2%80%99%C3%A9quilibre_des_liqueurs/Chapitre_I",
  "contested": "The result that liquid pressure depends on height alone is often credited to Pascal, but Stevin had it in 1586, and the 1923 editors of Pascal note that Mersenne's 1644 hydrostatic propositions were borrowed from Stevin. Duhem (in a footnote to the same edition) traces Pascal's piston example to Benedetti (1585). The decimal-fraction claim should not be read as 'invented decimals': MacTutor notes they had long been used by Arab and Chinese mathematicians. MacTutor gives The Hague as the place of death.",
  "chapters": [
   "conservation",
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Stevin/",
   "https://fr.wikisource.org/wiki/Trait%C3%A9_de_l%E2%80%99%C3%A9quilibre_des_liqueurs/Chapitre_I",
   "https://fr.wikisource.org/wiki/Trait%C3%A9_de_l%E2%80%99%C3%A9quilibre_des_liqueurs/Chapitre_II"
  ]
 },
 {
  "id": "galileo-galilei",
  "name": "Galileo Galilei",
  "born": "1564 (15 February)",
  "died": "1642 (8 January)",
  "places": "Pisa, Padua, Florence, Arcetri",
  "tags": [
   "experiment",
   "theory"
  ],
  "summary": "Galileo links Archimedes to the first hydraulicians, having taught Castelli and hosted Torricelli in his last months. His early essay La Bilancetta is a good example of asking whether a measurement method is precise enough for the claim it is meant to support.",
  "contributions": [
   {
    "year": "written 1586; printed posthumously (1644)",
    "what": "Rejects the water-overflow method for Hiero's crown as too imprecise. In its place he describes a hydrostatic balance, based on Archimedes' law of the lever and law of buoyancy, for finding the proportions of two metals in an alloy.",
    "work": "La Bilancetta ('The Little Balance')",
    "confidence": "medium"
   },
   {
    "year": "1612",
    "what": "Published a discourse on bodies that float in or move through water, part of his 1612 dispute with philosophers over floating.",
    "work": "Discorso intorno alle cose che stanno in su l'acqua o che in quella si muovono (1612)",
    "confidence": "high"
   },
   {
    "year": "before 1604; 1641–1642",
    "what": "Taught Benedetto Castelli at Padua. Torricelli arrived at Galileo's house in Arcetri on 10 October 1641 and, after Galileo's death, succeeded him as court mathematician to Grand Duke Ferdinando II.",
    "work": "Teaching and patronage",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Galileo wrote La Bilancetta in 1586, at 22. It argues that the famous story makes Archimedes use a method too crude for him, and proposes a balance instead. The essay circulated in manuscript and was printed only after Galileo's death.",
  "quote": "But this seems, so to say, a crude thing, far from scientific precision",
  "quote_source": "Galileo, La Bilancetta (1586), translated by Laura Fermi and Gilberto Bernardini, https://math.nyu.edu/Archimedes/Crown/bilancetta.html",
  "contested": "Galileo's claim that Archimedes probably used a balance is his own conjecture; there is no documentary evidence for it, and Heath (1920) thought the simpler volume method described by Vitruvius more likely. La Bilancetta was printed only after Galileo's death in January 1642 (Italian Wikisource dates the first edition to 1644: https://it.wikisource.org/wiki/La_bilancetta).",
  "chapters": [
   "conservation",
   "trust"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Galileo/",
   "https://math.nyu.edu/Archimedes/Crown/bilancetta.html",
   "https://mathshistory.st-andrews.ac.uk/DSB/castelli.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Torricelli/"
  ]
 },
 {
  "id": "benedetto-castelli",
  "name": "Benedetto Castelli",
  "born": "1578 (possibly 1577)",
  "died": "April 1643 (9 April per MacTutor; the DSB gives 19[?] April)",
  "places": "Brescia, Padua, Florence, Pisa, Rome",
  "tags": [
   "experiment",
   "engineering",
   "theory"
  ],
  "summary": "Castelli's Della misura dell'acque correnti (1628) is usually taken as the start of modern hydraulics. Its central propositions relate a river's cross-sectional areas to the volume of water passing in a given time, the idea now written Q = A·v and generalised as the continuity equation.",
  "contributions": [
   {
    "year": "1628",
    "what": "The fundamental propositions relate the cross-sectional areas of a river to the volumes of water passing in a given time. This is the continuity principle for channel flow, and it rests on treating water as incompressible.",
    "work": "Della misura dell'acque correnti (Rome, 1628); its second part is Demonstrazioni geometriche della misura dell'acque correnti",
    "confidence": "high"
   },
   {
    "year": "1628",
    "what": "Discussed the relation between head and velocity for flow through an orifice. The 1911 Britannica says he took the velocity to be proportional to the depth of the orifice, a view Torricelli replaced with a square-root law in 1644.",
    "work": "Della misura dell'acque correnti",
    "confidence": "medium"
   },
   {
    "year": "1639; 1660; 1661",
    "what": "The second edition (Rome, 1639) added two appendices and a letter to Galileo on hydrology. The third edition (Bologna, 1660) added further hydrological treatises. Thomas Salusbury published an English translation, based on the third edition, in Mathematical Collections and Translations (London, 1661).",
    "work": "Later editions and translations",
    "confidence": "high"
   },
   {
    "year": "c. 1626 onward",
    "what": "Pope Urban VIII called him to Rome as papal consultant on hydraulics and professor of mathematics (MacTutor dates his readership at La Sapienza to 1627). In Rome he taught Evangelista Torricelli and Giovanni Alfonso Borelli. Earlier, at Pisa, he taught Bonaventura Cavalieri mathematics and introduced him to Galileo.",
    "work": "Career (DSB; MacTutor)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "His correspondence shows that his hydraulics was mainly experimental. He got from Galileo the length of an approximate seconds pendulum to time his experiments, and he devised a cylindrical rain gauge.",
  "quote": "",
  "quote_source": "",
  "contested": "The 1911 Britannica says Castelli 'committed a great paralogism in supposing the velocity of the water proportional to the depth of the orifice'. The DSB adds that a posthumous edition contained a defective 'proof' that the speed of flow over a dam is proportional to the depth of the water; Castelli was dissatisfied with it and it was deleted from most copies. The record is mixed: in 1644 Torricelli presents his square-root rule for discharges as following from Castelli's doctrine, yet Poleni (1823) reports Torricelli as saying Castelli had taught that discharges go in direct proportion to the heights (Bistafa 2014, note 9). Claims that Castelli took his hydraulics from Leonardo's manuscripts are rejected by the DSB on dating grounds. His dates vary: the 1911 Britannica gives 1577–1644; MacTutor gives 1577 or 1578 to 9 April 1643, and the DSB 1578 to 19[?] April 1643.",
  "chapters": [
   "conservation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/DSB/castelli.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Castelli/",
   "https://gutenberg.org/cache/epub/40370/pg40370-images.html",
   "https://rbhciencia.emnuvens.com.br/revista/article/download/234/186"
  ]
 },
 {
  "id": "evangelista-torricelli",
  "name": "Evangelista Torricelli",
  "born": "1608 (15 October)",
  "died": "1647 (25 October)",
  "places": "Faenza, Rome, Florence (Arcetri)",
  "tags": [
   "theory",
   "experiment",
   "mathematics"
  ],
  "summary": "Torricelli's efflux law says that water leaves a small orifice with the speed a drop would gain falling from the free surface. It is the first quantitative link between pressure head and flow speed, and a special case of what Bernoulli's equation later generalised. His mercury-tube work explained the supposed 'resistance of the vacuum' as the weight of the atmosphere.",
  "contributions": [
   {
    "year": "1644 (often dated 1643)",
    "what": "States as a supposition ('we suppose') that water bursting from a small hole has the same impetus that a heavy body, or a single drop of the water, would have after falling from the free surface down to the hole. Because free-fall speed goes as the square root of the height fallen, efflux speed goes as √h. A corollary is that, through equal holes, the discharges are in the subduplicate ratio (the square root) of the heights.",
    "work": "De motu aquarum, pp. 191–203 of De motu proiectorum (Liber secundus), in Opera geometrica (Florence, 1644)",
    "confidence": "high"
   },
   {
    "year": "1644",
    "what": "Supports the supposition with experiment: a jet pointed upward from a well-rounded hole rises almost to the reservoir level. He blames the shortfall partly on air resistance and partly on falling water hindering the rising jet, and suggests mercury for a cleaner test. He credits Raffaello Magiotti as the first to check the discharge corollary by experiment.",
    "work": "De motu aquarum (Opera geometrica, 1644), as translated by Bistafa (2014)",
    "confidence": "high"
   },
   {
    "year": "1643 (experiment proposed); 11 June 1644 (letter)",
    "what": "Proposed the inverted mercury-tube experiment, which MacTutor says was later performed by his colleague Vincenzo Viviani. In a letter to Michelangelo Ricci he explained the height of the column by the weight of the external air rather than by any force of the vacuum. He also reported that he could not use the tube to track changes in the air's weight, because the level was sensitive to cold and heat.",
    "work": "Letter to Michelangelo Ricci, Florence, 11 June 1644",
    "confidence": "high"
   }
  ],
  "notation": [
   "Stated the efflux law in words, as a ratio. The formula v = √(2gh) with an explicit 2g is later notation",
   "torr: pressure unit named in his honour, defined as 1/760 of a standard atmosphere and approximately equal to 1 mmHg"
  ],
  "anecdote": "In the 1644 letter Torricelli estimated that the densest air near the ground weighs about one four-hundredth as much as water. He said the mercury in the bowl carries 'the weight of a height of fifty miles of air', and predicted that water in a much longer tube would rise to about 18 cubits, higher than mercury in proportion as mercury is heavier than water.",
  "quote": "We live immersed at the bottom of a sea of elemental air, which by experiment undoubtedly has weight",
  "quote_source": "Torricelli to M. Ricci, 11 June 1644, English translation from W. F. Magie, A Source Book in Physics (1935), transcribed at https://web.lemoyne.edu/Giunta/torr.html",
  "contested": "The law is often dated 1643; the 1911 Britannica says it 'was published in 1643, at the end of his treatise De motu gravium projectorum'. The printed source is Opera geometrica (Florence, 1644). MacTutor says he 'proved' the law, but in the text he states it as a supposition backed by experiments on jet height, not as a derivation. The 1911 Britannica dates Magiotti's confirming experiments to 1648, but Torricelli's 1644 text already credits Magiotti with the first experimental check, so 1648 cannot be the first one. Writing the law as v = √(2gh) is a modern reformulation. The barometer is often credited to Torricelli alone; the tube experiment was carried out by Viviani.",
  "chapters": [
   "conservation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Torricelli/",
   "https://rbhciencia.emnuvens.com.br/revista/article/download/234/186",
   "https://web.lemoyne.edu/Giunta/torr.html",
   "https://gutenberg.org/cache/epub/40370/pg40370-images.html"
  ]
 },
 {
  "id": "edme-mariotte",
  "name": "Edme Mariotte",
  "born": "c. 1620 (date unknown)",
  "died": "1684 (12 May)",
  "places": "Burgundy (birthplace uncertain; Dijon, Chazeuil and Til-Châtel are all proposed); Paris (Académie royale des sciences)",
  "tags": [
   "experiment",
   "engineering"
  ],
  "summary": "Mariotte's posthumous Traité du mouvement des eaux (1686) is a large early experimental study of jets, fountains and pipe flow, and among the first works to blame the gap between ideal theory and measured flow on friction. Earlier, in 1673, he had printed the rule that a stream's push on a body grows with the square of its speed.",
  "contributions": [
   {
    "year": "read to the Académie 1671; published 1673",
    "what": "Argues that efflux speed from a tank varies as the square root of the height of the water, and concludes that the force of a moving stream on a body at rest varies as the stream's cross-sectional area and the square of its speed.",
    "work": "Traité de la percussion ou choc des corps (Paris, 1673), part II",
    "confidence": "high"
   },
   {
    "year": "grew from a long 1678 report to the Académie; unfinished at his death in 1684; published 1686",
    "what": "A five-part treatise. Five 'rules of jets of water' relate the speed and force of the flow to the height of the reservoir and the area of the opening, and are applied to mill paddles. It also covers fountain experiments at Chantilly (1678), friction in conduit pipes (start of Part V) and the strength of water pipes.",
    "work": "Traité du mouvement des eaux et des autres corps fluides, published by Philippe de La Hire (Paris, 1686; 2nd ed. 1690; English translation by J. T. Desaguliers, 1718)",
    "confidence": "high"
   },
   {
    "year": "1686",
    "what": "According to the 1911 Britannica, he was the first to attribute the shortfall between theory and measured flow to friction: water filaments next to the pipe wall lose speed and slow their neighbours in turn, an early qualitative picture of shear in pipe flow. He saw the same retardation in glass pipes.",
    "work": "Traité du mouvement des eaux (as summarised in the 1911 Britannica)",
    "confidence": "medium"
   },
   {
    "year": "1679",
    "what": "In his essay De la nature de l'air he stated that air is condensed in proportion to the weight pressing on it, the inverse pressure–volume law still called 'loi de Mariotte' in France. According to the DSB he treated the law as an already known property and relied heavily on Boyle without naming him.",
    "work": "Essais de physique, second essay: De la nature de l'air (Paris, 1679)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'loi de Mariotte', the French name for the pressure–volume law of a gas"
  ],
  "anecdote": "Mariotte was still working on his treatise on water when he died. Philippe de La Hire saw it through the press two years later, in 1686.",
  "quote": "",
  "quote_source": "",
  "contested": "The DSB says his date of birth is 'entirely unknown' and that there is no documentation for the usual 'around 1620 in Dijon', so c. 1620 is a convention; it favours Chazeuil as birthplace, while the History of Hydrology wiki gives Til-Châtel. On the gas law, Boyle published first, and the DSB reads Mariotte as presenting the law as already known, so 'Mariotte's law' is not a separate discovery. The essay's year is given as 1679 by the DSB (some sources say 1676). On the v² rule, credit is shared: Huygens measured it in 1669 but published only in 1690, Mariotte printed it in 1673, and Newton's Principia (1687) gave a theory. The 1911 Britannica presents Mariotte's glass-pipe observations as refuting Domenico Guglielmini's explanation of slow river flow by transverse motions, but Guglielmini (1655–1710) took up hydraulics around 1686, after Mariotte's death, so this is a later comparison, not a debate between them. The 1911 Britannica also notes that Mariotte did not allow for the contraction of the jet at a thin-plate orifice.",
  "chapters": [
   "similarity",
   "continuum",
   "conservation"
  ],
  "sources": [
   "https://www.encyclopedia.com/people/science-and-technology/physics-biographies/edme-mariotte",
   "https://www.history-of-hydrology.net/mediawiki/index.php/Mariotte,_Edme",
   "https://gutenberg.org/cache/epub/40370/pg40370-images.html",
   "https://en.wikipedia.org/wiki/Domenico_Guglielmini"
  ]
 },
 {
  "id": "blaise-pascal",
  "name": "Blaise Pascal",
  "born": "1623 (19 June)",
  "died": "1662 (19 August)",
  "places": "Clermont (now Clermont-Ferrand), Rouen, Paris",
  "tags": [
   "theory",
   "experiment"
  ],
  "summary": "Pascal's treatise is a systematic hydrostatics. Pressure in a confined liquid acts equally on every equal area of the container, so a vessel of water works as a force multiplier, which is the principle of the hydraulic press. For simulation, his point that a push on one piston is felt at once throughout the liquid is the physical root of why pressure in incompressible solvers is a global (elliptic) unknown.",
  "contributions": [
   {
    "year": "written c. 1651–1654; published 1663 (posthumously)",
    "what": "Shows that the force needed to stop water flowing out of an opening is proportional to the height of the water, not to its width, and equals the weight of a column of water with the height of the water and the size of the opening. In a closed vessel full of water with two pistons, the forces balance in proportion to the piston areas. Each part of the wall bears a push in proportion to its size, which he attributes to 'la continuité et la fluidité de l'eau'.",
    "work": "Traité de l'équilibre des liqueurs, chs. I–II, printed with Traité de la pesanteur de la masse de l'air (Paris, 1663)",
    "confidence": "high"
   },
   {
    "year": "written c. 1651–1654; published 1663",
    "what": "Explains the hydraulic 'machine' by a work balance: if one opening is a hundred times the other, pushing the small piston in by an inch moves the large one only a hundredth of an inch, so 'le chemin est au chemin, comme la force à la force'.",
    "work": "Traité de l'équilibre des liqueurs, ch. II",
    "confidence": "high"
   },
   {
    "year": "1648 (experiment on 19 September; account published 1648)",
    "what": "Designed the Puy de Dôme test, carried out by his brother-in-law Florin Périer. The mercury column stood about 3 inches (French measure) lower at the summit than at Clermont, which supported the view that the weight of the air holds the column up.",
    "work": "Récit de la grande expérience de l'équilibre des liqueurs (1648)",
    "confidence": "high"
   }
  ],
  "notation": [
   "pascal (Pa): special name for the SI unit newton per square metre, adopted by a declaration ('Pascal and siemens') of the 14th General Conference on Weights and Measures in 1971 (https://www.doi.org/10.59161/CGPM1971DECLE)"
  ],
  "anecdote": "To show that the liquid itself multiplies force, Pascal imagines freezing parts of his apparatus. If the water in the thin tube froze while the water in the wide vessel below stayed liquid, it would still take a hundred pounds to hold up the weight of that ice. If instead the water at the bottom froze, an ounce would be enough to counterbalance it.",
  "quote": "D’où il paroist qu’un Vaisseau plein d’eau est un nouveau principe de Mechanique, et une machine nouvelle pour multiplier les forces à tel degré qu’on voudra",
  "quote_source": "Traité de l'équilibre des liqueurs, ch. II (Brunschvicg–Boutroux edition, 1923), https://fr.wikisource.org/wiki/Trait%C3%A9_de_l%E2%80%99%C3%A9quilibre_des_liqueurs/Chapitre_II",
  "contested": "'Pascal's barrel' (a tall thin tube bursting a cask, supposedly in 1646) is mentioned nowhere in his surviving works and may be apocryphal; it seems to have been attributed to him by French authors of the 1860s. His treatise argues with pistons, balances and tubes instead. On priority: Stevin (1586) had already shown that liquid pressure on a surface depends on height and area, and a footnote by Duhem in the 1923 edition traces Pascal's piston example to Benedetti (1585). Several of the treatise's experiments may never have been done as described: Robert Boyle, in Hydrostatical Paradoxes (1666), remarked that the exactness they require, 'though easily supposed by a Mathematician, will scarce be found obtainable from a Tradesman' (quoted in a footnote to ch. I of the 1923 edition). Dates for the treatise's composition vary between 1651 and 1654; MacTutor says he worked on it from May 1653. The SI unit was named by a 1971 CGPM declaration, not a numbered resolution.",
  "chapters": [
   "conservation",
   "pressure",
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Pascal/",
   "https://fr.wikisource.org/wiki/Trait%C3%A9_de_l%E2%80%99%C3%A9quilibre_des_liqueurs/Chapitre_II",
   "https://www.lindahall.org/about/news/scientist-of-the-day/florin-perier",
   "https://en.wikipedia.org/wiki/Pascal%27s_barrel"
  ]
 },
 {
  "id": "christiaan-huygens",
  "name": "Christiaan Huygens",
  "born": "1629 (14 April)",
  "died": "1695 (8 July)",
  "places": "The Hague; Paris (member of the Académie royale des sciences, where he reported these experiments in 1669)",
  "tags": [
   "experiment",
   "theory"
  ],
  "summary": "In 1669 Huygens measured the force of moving water and air on flat surfaces for the Paris Académie and found that it grows as the square of the speed. He then worked out rising and falling motion under v² resistance, including a limiting (terminal) speed. He published only in 1690, after Newton's Principia.",
  "contributions": [
   {
    "year": "1668 (manuscript)",
    "what": "Theory of a heavy point moving in a medium whose resistance is proportional to the velocity.",
    "work": "'Théorie de 1668 du mouvement d'un point pesant dans un milieu dont la résistance est proportionnelle à la vitesse du mobile', Œuvres complètes XIX (1937)",
    "confidence": "high"
   },
   {
    "year": "February–July 1669 (notes from 13 February; reported to the Académie on 3 April, 8 May and 24 July 1669, among other dates)",
    "what": "Water experiments: a block towed along a wooden canal by a falling weight and timed with a half-second pendulum (four times the weight gave twice the speed); balance measurements of the force of water escaping from a hole; and a rougher test in the Seine. Air experiments: air forced through an orifice, and a paper-covered frame drawn on a small sled. He concluded that the impressions of water on a given surface are as the squares of the speeds, and stated the same for air. Couplet built apparatus and assisted with the experiments.",
    "work": "'Expériences de 1669 sur la force de l'eau ou de l'air en mouvement et sur les résistances éprouvées par des corps traversant ces milieux', Œuvres complètes XIX (1937)",
    "confidence": "high"
   },
   {
    "year": "1669 (manuscript)",
    "what": "Theory of rising and falling motion in a medium with resistance proportional to the square of the velocity, including the limiting speed of a falling body.",
    "work": "'Théorie de 1669 du mouvement ascendant ou descendant d'un point pesant dans un milieu dont la résistance est proportionnelle au carré de la vitesse du mobile', Œuvres complètes XIX",
    "confidence": "high"
   },
   {
    "year": "1690 (publication)",
    "what": "Published his treatment of motion with v² resistance in the Addition to the Discours de la cause de la pesanteur, which the editors of the Œuvres say he wrote after reading Newton's Principia (1687).",
    "work": "Discours de la cause de la pesanteur, Addition (Leiden, 1690)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'raison double / doublée' (duplicate ratio) meaning proportional to the square, and 'raison sous-doublée' meaning proportional to the square root. These were the words for v² and √h before algebraic formulas"
  ],
  "anecdote": "From his measurements Huygens reckoned that air moving at 10 feet per second presses about 9 ounces on a one-foot square. He proposed a wind gauge made from a cross-shaped balance carrying a square of cardboard. He used the same number to argue that a 9-ounce body with a one-foot-square base can never fall faster than 10 feet per second through air, an early terminal-velocity calculation, and that a 125-pound man drawing a square sail 16 feet on a side would land no harder than after a one-foot jump.",
  "quote": "les impressions de l'eau contre une mesme surface sont comme les quarrez des vitesses, ou en raison double des vitesses.",
  "quote_source": "Huygens, 1669 experiments, § 4, in Œuvres complètes XIX (1937), https://www.dbnl.org/tekst/huyg003oeuv19_01/huyg003oeuv19_01_0019.php",
  "contested": "The v² resistance law is usually credited to Newton (Principia, 1687) or to Mariotte, who printed it in 1673. Huygens had the measurements in 1669 but did not publish until 1690. The square law is an approximation valid over a range of conditions, not a universal rule. The editors of the Œuvres point out slips in his notes (for example, weights of 2 ounces and ½ ounce apparently swapped), and his Seine test agreed with the square law only roughly because the current was uneven.",
  "chapters": [
   "similarity"
  ],
  "sources": [
   "https://www.dbnl.org/tekst/huyg003oeuv19_01/huyg003oeuv19_01_0019.php",
   "https://www.dbnl.org/tekst/huyg003oeuv19_01/huyg003oeuv19_01_0020.php",
   "https://www.dbnl.org/tekst/huyg003oeuv19_01/huyg003oeuv19_01_0018.php",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Huygens/"
  ]
 },
 {
  "id": "isaac-newton",
  "name": "Isaac Newton",
  "born": "4 January 1643 (25 December 1642 in the Julian calendar then used in England)",
  "died": "31 March 1727 (20 March 1726/27 Julian)",
  "places": "Woolsthorpe (Lincolnshire), Cambridge, London",
  "tags": [
   "theory",
   "mathematics",
   "notation"
  ],
  "summary": "Book II of the Principia is the first attempt at a mathematical theory of motion through resisting fluids. It contains two ancestors of modern fluid dynamics: the hypothesis that internal friction is proportional to the speed at which fluid layers separate (the root of the viscous term in Navier–Stokes), and a similarity argument giving resistance ∝ ρ v² d². His dotted letters for rates of change survive as ẋ.",
  "contributions": [
   {
    "year": "1687",
    "what": "Book II, Sections I–III: motion of bodies resisted in the ratio of the velocity, in the duplicate ratio (square) of the velocity, and partly in each.",
    "work": "Philosophiae Naturalis Principia Mathematica, Book II (London, 1687)",
    "confidence": "high"
   },
   {
    "year": "1687",
    "what": "Book II, Section VII. Prop. XXXII: two similar systems of particles, with proportional sizes and densities and started with like motions, keep moving alike in proportional times, an early dynamical-similarity argument. Prop. XXXIII: the resistance of the larger parts is then compounded of the square of their velocities, the square of their diameters and the density.",
    "work": "Principia, Book II, Props. XXXII–XXXIII (numbering and wording as in the 3rd edition, 1726, via Motte's translation)",
    "confidence": "high"
   },
   {
    "year": "1687",
    "what": "Book II, Section IX, Hypothesis: 'Resistentiam, quæ oritur ex defectu lubricitatis partium Fluidi, cæteris paribus, proportionalem esse velocitati, qua partes Fluidi separantur ab invicem.' In words, the resistance arising from lack of slipperiness between the parts of a fluid is proportional to the speed at which they are separated. He used it in Props. LI–LII on fluid set turning by a rotating cylinder or sphere.",
    "work": "Principia, Book II, Section IX (Latin text as on Latin Wikisource's 1687 text)",
    "confidence": "high"
   },
   {
    "year": "1687",
    "what": "Prop. XXXIV: in a rare medium of equal particles freely spaced at equal distances, a globe meets half the resistance of a cylinder of the same diameter moving along its axis. The following Scholium finds the frustum of a cone of least resistance and goes on to the solid of least resistance.",
    "work": "Principia, Book II, Prop. XXXIV and Scholium",
    "confidence": "high"
   },
   {
    "year": "first printed 1693; manuscript origin disputed (1665 or December 1691)",
    "what": "Dotted ('pricked') letters for fluxions, i.e. rates of change. They first appeared in print in the Latin edition of Wallis's Algebra (De algebra tractatus, Opera vol. II, Oxford, 1693) and were explained again in Tractatus de quadratura curvarum, published with the Opticks (London, 1704).",
    "work": "Wallis, Opera II (1693); Newton, Quadratura curvarum (1704)",
    "confidence": "high"
   }
  ],
  "notation": [
   "ẋ, ẍ (dotted letters for fluxions): first printed 1693 in Wallis's Opera vol. II. Cajori, following Rigaud (1838), dates the earliest manuscript use to a leaf of 20 May 1665; Whiteside (1970) says the standard dot notation was invented only in mid-December 1691",
   "Fluents (integrals): in Quadratura curvarum (1704) a short stroke over the letter; a rectangle drawn around a term is explained in De Analysi. Cajori says Newton's integration signs were 'never popular, not even in England'",
   "'Duplicate ratio' meaning proportional to the square: the proportion language of Book II, used before algebraic formulas"
  ],
  "anecdote": "Newton's Prop. LI says the periodic times of fluid particles around a rotating cylinder are proportional to their distance from the axis, which makes the velocity constant. In his paper on the internal friction of fluids (read to the Cambridge Philosophical Society on 14 April 1845), Stokes showed this was wrong. Newton had required the forces turning each fluid ring one way and the other to be equal, when the true condition is that their moments (torques) balance. With that fixed, the velocity falls off inversely with distance, and Stokes noted that the same error vitiates Prop. LII.",
  "quote": "The resistance arising from the want of lubricity in the parts of a fluid, is, cæteris paribus, proportional to the velocity with which the parts of the fluid are separated from each other.",
  "quote_source": "Principia, Book II, Section IX, Hypothesis, Andrew Motte's translation (1846 American edition), https://en.wikisource.org/wiki/The_Mathematical_Principles_of_Natural_Philosophy_(1846)/BookII-IX",
  "contested": "1) 'Newton's law of viscosity, τ = μ du/dy' is not in the Principia. Newton gives a verbal proportionality hypothesis, and the viscosity coefficient and stress formula came in the 19th century. He did not fully trust it either: in the Scholium to Prop. LII he says that although he proposed the hypothesis 'for the sake of demonstration', 'it is in truth probable that the resistance is in a less ratio than that of the velocity' (Motte translation). 2) His vortex results (Props. LI–LII) are wrong because he balanced forces instead of torques (Stokes, Trans. Camb. Phil. Soc. 8, p. 287, read 1845; Mathematical and Physical Papers vol. 1, p. 103). 3) The date of the dot notation is disputed: Cajori (relying on Rigaud 1838) gives 20 May 1665, while Whiteside (1970) says it was 'invented by him only in mid-December 1691' (quoted in Kollerstrom, arXiv:1212.2666). The Principia itself is written in geometric style, not in dotted fluxions. 4) The rectangle notation for integrals is explained in De Analysi rather than Quadratura curvarum (Cajori §622). 5) The 'Newton sine-squared law' of lift on a flat plate was not derived by Newton himself; his particle-impact method was applied to an inclined plate by later authors.",
  "chapters": [
   "continuum",
   "conservation",
   "similarity",
   "notation"
  ],
  "sources": [
   "https://en.wikisource.org/wiki/The_Mathematical_Principles_of_Natural_Philosophy_(1846)/BookII-IX",
   "https://la.wikisource.org/wiki/Philosophiae_Naturalis_Principia_Mathematica/Liber_II/Sect._IX._De_motu_Circulari_Fluidorum.",
   "https://archive.org/details/cu31924004181313",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII"
  ]
 },
 {
  "id": "gottfried-wilhelm-leibniz",
  "name": "Gottfried Wilhelm Leibniz",
  "born": "1646 (1 July)",
  "died": "1716 (14 November)",
  "places": "Leipzig, Paris, Hanover",
  "tags": [
   "mathematics",
   "notation"
  ],
  "summary": "The equations of fluid dynamics are written in Leibniz's d and ∫. He built them as 'difference' and 'sum', which is also the bridge to numerical methods: a finite difference is a d not yet taken to the limit, and a quadrature rule is a ∫ carried out as an actual sum.",
  "contributions": [
   {
    "year": "29 October 1675 (manuscript)",
    "what": "Replaced the notation 'omn.' (omnia, 'all'), taken from Cavalieri, with ∫, a long s for summa. In the same manuscript he introduced d for differentia, first written as a fraction with d in the denominator (x/d) to show that it lowers the dimension.",
    "work": "Analyseos tetragonisticae pars secunda (manuscript, 29 Oct 1675; Akademie edition, series VII, vol. 5, no. 40)",
    "confidence": "high"
   },
   {
    "year": "11 November 1675 (manuscript)",
    "what": "Replaced x/d with dx. In the same manuscript he asked whether dx·dy is the same as d(xy), and whether dx/dy is the same as d(x/y), and concluded that neither is.",
    "work": "Methodi tangentium inversae exempla (manuscript, 11 Nov 1675; Akademie edition VII.5, no. 46)",
    "confidence": "high"
   },
   {
    "year": "October 1684 (print)",
    "what": "First printed use of dx. Ratios appear as 'dx ad dy' or 'dx : dy', not as a fraction.",
    "work": "Nova Methodus pro Maximis et Minimis, Acta Eruditorum 3 (Oct. 1684) 467–473",
    "confidence": "high"
   },
   {
    "year": "June 1686 (print)",
    "what": "First printed use of the integral sign, which appears eight times in the article.",
    "work": "De geometria recondita et analysi indivisibilium atque infinitorum, Acta Eruditorum (June 1686)",
    "confidence": "high"
   }
  ],
  "notation": [
   "∫ (integral sign): manuscript 29 October 1675; first printed June 1686 (Acta Eruditorum)",
   "d, dx, dy (differentials): d on 29 October 1675 (first written as x/d), dx on 11 November 1675; first printed October 1684 (Nova Methodus)",
   "dx/dy written as a fraction: in the 11 November 1675 manuscript (Cajori), but not in the 1684 printed paper, which writes 'dx ad dy' and 'dx : dy'"
  ],
  "anecdote": "When ∫ first appeared in print in 1686, it did not match his manuscript. Cajori notes that the lower part of the long s was cut off, so the sign was simply the small letter s as printed at the time and resembled a modern 'f'. Gerhardt's 1858 reprint did not reproduce this exactly and printed the slender ∫ used today.",
  "quote": "Utile erit scribi ∫ pro omn. ut ∫l pro omn. l. id est summa ipsorum l.",
  "quote_source": "Leibniz, Analyseos tetragonisticae pars secunda, 29 October 1675, in Sämtliche Schriften und Briefe VII.5 (Akademie Verlag, 2008), no. 40: https://web.archive.org/web/20211009052830/https://www.gwlb.de/Leibniz/Leibnizarchiv/Veroeffentlichungen/VII5A.pdf",
  "contested": "Priority dispute with Newton: the Royal Society committee's report was written by Newton himself and published as Commercium epistolicum near the beginning of 1713, and Leibniz was not asked for his side; MacTutor calls the committee 'totally biased'. Dates differ by source: MacTutor gives 21 November 1675 for his first ∫ f(x) dx, while the Akademie edition and Cajori date ∫ to 29 October and dx to 11 November 1675. The Latin of the ∫ sentence also varies in secondary sources: Jeff Miller's page has 'pro omnia, ut ∫l = omn. l', Cajori has 'pro omn. ut ∫l pro omn. l, id est', and the Akademie edition reads 'pro omn. ut ∫l pro omn. l. id est'.",
  "chapters": [
   "notation",
   "discretization"
  ],
  "sources": [
   "https://web.archive.org/web/20211009052830/https://www.gwlb.de/Leibniz/Leibnizarchiv/Veroeffentlichungen/VII5A.pdf",
   "https://archive.org/details/AHistoryOfMathematicalNotationVolII",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Leibniz/"
  ]
 },
 {
  "id": "johann-bernoulli",
  "name": "Johann Bernoulli",
  "born": "1667",
  "died": "1748",
  "places": "Basel, Groningen (1695-1705), Basel",
  "tags": [
   "theory",
   "mathematics"
  ],
  "summary": "Johann Bernoulli's Hydraulica was printed in 1742, although its title page is dated 1732. Darrigol and Frisch treat it as the first work to describe an internal pressure acting between neighbouring parts of a moving fluid. It also singled out the convective part of the acceleration (v dv/dz), the term that becomes advection in every fluid solver. The false 1732 date is generally read as a claim to priority over his son Daniel's Hydrodynamica (1738).",
  "contributions": [
   {
    "year": "1742 (printed; the title page says 'Anno 1732')",
    "what": "Treated outflow from vessels by parallel slices, applying Newton's second law directly. He split the acceleration of a slice into a local part and a part caused by the narrowing of the vessel. He called the second part the 'gurges' (gorge); it is the convective acceleration v dv/dz. With this he extended Bernoulli's law to unsteady flow. He also described the pressure of a moving fluid on its container as the 'vis immaterialis' that neighbouring fluid parts exert on one another. This is a genuine concept of internal pressure, although he did not use it to derive his equation of motion.",
    "work": "Hydraulica nunc primum detecta ac demonstrata directe ex fundamentis pure mechanicis, in Opera Omnia vol. 4 (Lausanne and Geneva: Bousquet, 1742), pp. 387-493",
    "confidence": "high"
   },
   {
    "year": "1739",
    "what": "Sent Euler the first section of Hydraulica, which covered only steady flow in a suddenly enlarged tube. Euler's enthusiastic reply of 5 May 1739 treated accelerated outflow from a vessel of arbitrary shape 'with the same method' (Darrigol and Frisch). Johann then wrote a second part, which added the determination of the internal pressure to Euler's treatment.",
    "work": "Correspondence with Euler (Euler, Opera Omnia ser. 4A vol. 2, 1998, pp. 287-295, as cited by Darrigol and Frisch 2008)",
    "confidence": "high"
   },
   {
    "year": "1740 (letter); 1742 (printed)",
    "what": "A letter from Euler dated 18 October 1740 praising the work was printed at the front of Hydraulica, at Opera Omnia vol. 4, p. 389.",
    "work": "Euler, letter to Johann Bernoulli (Euler Archive E64)",
    "confidence": "high"
   }
  ],
  "notation": [
   "π for the internal ('immaterial') pressure, Hydraulica 1742, p. 444 (per Darrigol and Frisch, note 21)",
   "'gurges' (gorge; Truesdell translates it as 'eddy') for the convective part of the acceleration, Hydraulica 1742, pp. 432-437"
  ],
  "anecdote": "In 1734 Johann and his son Daniel shared the Paris Academy prize. MacTutor's biography of Daniel (not the one of Johann) reports that Johann responded by banning Daniel from his house. In 1742 Johann printed Hydraulica with 'Anno 1732' in its title. That made it look older than Daniel's Hydrodynamica (1738), although its first part only reached Euler in 1739. Euler corresponded with both men and still welcomed the work warmly. His letter of 18 October 1740 was printed at the front of the book.",
  "quote": "The force that acts on the side of the channel through which the liquid flows. . . is nothing but the force that originates in the force of compression through which contiguous parts of the fluid act on one another.",
  "quote_source": "Johann Bernoulli, Hydraulica (1742), p. 442, in the English translation given by O. Darrigol and U. Frisch, 'From Newton's mechanics to Euler's equations', Physica D 237 (2008): https://www.oca.eu/etc7/EE250/texts/darrigol-frisch.pdf",
  "contested": "Popular sources disagree about the date of Hydraulica. The title page says 1732. Darrigol and Frisch and the Euler Archive place its writing around 1739-40 and its printing in 1742, in Opera Omnia vol. 4. Other dates in circulation:\n- Britannica and MacTutor's Johann Bernoulli page: about 1738.\n- MacTutor's Daniel Bernoulli page: 'probably 1739'. That page calls the backdating 'a disgraceful attempt'.\n- English Wikipedia: 1743.\nThe backdating is usually read as a bid for priority over Daniel's Hydrodynamica, and Britannica calls it 'this attempt by Johann to obtain priority'. The house-ban story is told on MacTutor's Daniel Bernoulli page, not the Johann page. Despite the priority dispute, Hydraulica introduced genuine advances. Darrigol and Frisch stress that, unlike Hydrodynamica, it relied directly on Newton's laws. That forced the new idea of a convective derivative and gave Bernoulli's law for unsteady flow. Like his son's method, however, it was limited to flow by parallel slices.",
  "chapters": [
   "conservation",
   "advection",
   "pressure",
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Bernoulli_Johann/",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Bernoulli_Daniel/",
   "https://www.oca.eu/etc7/EE250/texts/darrigol-frisch.pdf",
   "https://scholarlycommons.pacific.edu/euler-works/64"
  ]
 },
 {
  "id": "henri-pitot",
  "name": "Henri Pitot",
  "born": "1695 (the day is given as 3, 29 or 31 May in different sources)",
  "died": "1771 (27 December)",
  "places": "Aramon (Languedoc), Paris, Nîmes and Montpellier (Languedoc)",
  "tags": [
   "experiment",
   "engineering"
  ],
  "summary": "Pitot's 1732 'machine' was a tube facing the current, in which water rises by a height that grows with the square of the flow speed. It is the ancestor of the pitot tubes on aircraft. With it he found that river speed usually falls toward the bed, early evidence for what is now called the boundary layer and an example of measurement overturning hydraulic belief.",
  "contributions": [
   {
    "year": "1732 (memoir in the Académie's volume for the year 1732)",
    "what": "Describes an instrument for measuring the speed of running water and the speed of ships through the water ('le sillage des vaisseaux'). Water rises in a tube facing the current.",
    "work": "'Description d'une machine pour mesurer la vitesse des eaux courantes et le sillage des vaisseaux', Histoire de l'Académie royale des sciences, année 1732, Mémoires, pp. 363–376",
    "confidence": "high"
   },
   {
    "year": "1732",
    "what": "Explained the reading with Torricelli-style reasoning: the water climbs the tube to the height from which it would have had to fall to acquire the stream's speed, so the rise grows with the square of the speed.",
    "work": "Same memoir (as quoted by French Wikipedia)",
    "confidence": "medium"
   },
   {
    "year": "1732",
    "what": "Measured the Seine at different depths from Paris bridges (the Pont au Change and the Pont Notre-Dame among them) and found the speed almost always decreased toward the bottom. This contradicted a then-current view, based on the experience of some Italian engineers, that speed increases with depth.",
    "work": "Same memoir (as quoted by French Wikipedia, citing R. W. Johnson, Handbook of Fluid Dynamics)",
    "confidence": "medium"
   },
   {
    "year": "1858",
    "what": "Henry Darcy modified the tube into a more practical instrument.",
    "work": "H. Darcy, 'Note relative à quelques modifications à introduire dans le tube de Pitot', Annales des Ponts et Chaussées (1858), pp. 351–359",
    "confidence": "medium"
   }
  ],
  "notation": [
   "'pitot tube' and 'pitot pressure' (stagnation pressure), named after him"
  ],
  "anecdote": "Pitot had no Bernoulli equation to lean on, because Daniel Bernoulli's Hydrodynamica appeared only in 1738. He justified his tube the way Torricelli had justified jets: the water rises to the height from which it would have fallen to reach the stream's speed.",
  "quote": "",
  "quote_source": "",
  "contested": "The modern account of the instrument, deriving dynamic pressure from Bernoulli's equation, came much later (early 20th century, with treatments by Blasius in 1909 and John Airey in 1913). The pitot-static form in use today owes much to later engineers, starting with Darcy (1858). His birth date is variously given as 3 May, 29 May, or 31 May 1695 (Humbert 1953).",
  "chapters": [
   "trust",
   "continuum",
   "conservation"
  ],
  "sources": [
   "https://fr.wikipedia.org/wiki/Tube_de_Pitot",
   "https://fr.wikipedia.org/wiki/Henri_Pitot",
   "https://en.wikipedia.org/wiki/Pitot_tube",
   "https://www.persee.fr/doc/rhs_0048-7996_1953_num_6_4_3084"
  ]
 },
 {
  "id": "daniel-bernoulli",
  "name": "Daniel Bernoulli",
  "born": "1700",
  "died": "1782",
  "places": "Groningen (born), St Petersburg (1725-33), Basel",
  "tags": [
   "theory",
   "experiment",
   "mathematics"
  ],
  "summary": "Daniel Bernoulli's Hydrodynamica (1738) gave the subject its name and supplied the energy argument behind what is now called Bernoulli's equation. He derived the pressure on the walls of a pipe for flow treated as parallel slices, rather than the modern pointwise law p + ½ρv² + ρgz = constant along a streamline.",
  "contributions": [
   {
    "year": "1738",
    "what": "Applied the conservation of 'live forces' (vis viva) to outflow from vessels and to flow through pipes treated as parallel slices. He phrased this as the equality of 'actual descent' and 'potential ascent'. The book's title gave us the word 'hydrodynamics'.",
    "work": "Hydrodynamica, sive de viribus et motibus fluidorum commentarii (Strasbourg, 1738)",
    "confidence": "high"
   },
   {
    "year": "1738",
    "what": "Defined the 'hydraulico-static' pressure that moving water exerts on the walls of a pipe. He imagined the pipe suddenly broken at that point and took the pressure to be proportional to the acceleration the water would then acquire. Combined with live forces, this is equivalent in modern terms to a wall pressure proportional to gh - v²/2, where h is the head. He expressed this relation through ratios of cross-sections rather than velocities.",
    "work": "Hydrodynamica (1738), pp. 258-260",
    "confidence": "high"
   },
   {
    "year": "1738",
    "what": "Explained the pressure of air as the effect of impacts by rapidly moving particles, an early kinetic theory of gases.",
    "work": "Hydrodynamica (1738), chapter 10",
    "confidence": "high"
   },
   {
    "year": "1738",
    "what": "Related this particle model to Boyle's law, including a correction for the volume taken up by the particles.",
    "work": "Hydrodynamica (1738), chapter 10",
    "confidence": "medium"
   },
   {
    "year": "1738",
    "what": "Discussed the reaction force exerted by a jet of fluid leaving a vessel and its use for propelling ships.",
    "work": "Hydrodynamica (1738), chapter 13",
    "confidence": "high"
   }
  ],
  "notation": [
   "the word 'hydrodynamics', from the title Hydrodynamica (1738)"
  ],
  "anecdote": "To find the pressure that flowing water exerts on a pipe wall, Bernoulli imagined the wall suddenly breaking at that point. He then asked how fast the water would accelerate as it spurted into the air, and argued that the pressure is proportional to that would-be acceleration. It is a thought experiment rather than a force balance. That is why his result gives the pressure on the walls but not inside the fluid.",
  "quote": "Thus it is plain that the pressure [pressio] on the walls is proportional to the acceleration. . . that would be taken on by the water if every obstacle to its motion should instantaneously vanish, so that it were ejected directly into the air.",
  "quote_source": "Daniel Bernoulli, Hydrodynamica (1738), pp. 258-259, in C. Truesdell's English translation as quoted by O. Darrigol and U. Frisch, Physica D 237 (2008): https://www.oca.eu/etc7/EE250/texts/darrigol-frisch.pdf",
  "contested": "'Bernoulli's equation' as taught today does not appear in Hydrodynamica. Daniel reasoned with live forces, not with forces and pressure gradients. His result covered only the wall pressure in quasi-one-dimensional (parallel-slice) flow. Darrigol and Frisch note that he did not quite write P = gh - v²/2 and used ratios of cross-sections instead. He was also aware that eddies waste live force at abrupt changes of section. Internal pressure entered with Johann Bernoulli's Hydraulica (printed 1742). The pointwise law along a streamline is Euler's. It appears in his river memoir (written about 1750-51, printed 1767) and in the general memoirs of 1755 (printed 1757). Britannica dates Hydraulica to about 1738 and calls it 'this attempt by Johann to obtain priority'. A separate myth concerns aircraft lift. The popular 'equal transit time' explanation is often presented as an application of Bernoulli's principle, and it is wrong. NASA Glenn Research Center calls it 'one of the most widely circulated, incorrect explanations' and says the lift it predicts is much less than the observed lift.",
  "chapters": [
   "continuum",
   "conservation",
   "pressure"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Bernoulli_Daniel/",
   "https://www.oca.eu/etc7/EE250/texts/darrigol-frisch.pdf",
   "https://www.britannica.com/biography/Daniel-Bernoulli",
   "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/foilw1"
  ]
 },
 {
  "id": "leonhard-euler",
  "name": "Leonhard Euler",
  "born": "1707",
  "died": "1783",
  "places": "Basel, St Petersburg (1727-41 and 1766-83), Berlin (1741-66)",
  "tags": [
   "theory",
   "mathematics",
   "notation"
  ],
  "summary": "Euler wrote down the field equations of an ideal fluid. He did it first for incompressible flow (read 1752, printed 1761), then in general with the continuity equation (presented 1755, printed 1757). Every grid-based solver discretises these equations. 'Eulerian' now names the fixed-grid viewpoint, but Euler also used the particle-following (Lagrangian) description.",
  "contributions": [
   {
    "year": "academy volume for 1752, printed 1754 (the Euler Archive dates the writing to 1749; Darrigol and Frisch group it with his hydraulic works of 1750-51)",
    "what": "Treated unsteady flow in pipes by balancing the acceleration of fluid elements against the pressure gradient and gravity (dv/dt = g - dP/dz). This gave Bernoulli's law for non-steady pipe flow. He applied it to the pressure surge in the pipes that were to feed the fountains of Sanssouci.",
    "work": "'Sur le mouvement de l'eau par des tuyaux de conduite', E206, Mémoires de l'Académie des Sciences de Berlin 8 (printed 1754), pp. 111-148",
    "confidence": "high"
   },
   {
    "year": "written about 1750-51; academy volume for 1760, printed 1767",
    "what": "His first attempt to go beyond parallel slices was a memoir on rivers. He analysed steady two-dimensional flow divided into filets. He described the motion through the coordinates of a fluid particle as functions of time and of a label for each filet, a partial anticipation of the Lagrangian picture. He also obtained, for the first time, Bernoulli's law along the streamlines of an arbitrary steady incompressible flow (Darrigol and Frisch). He judged it a dead end because he could not solve realistic river problems this way.",
    "work": "'Recherches sur le mouvement des rivières', E332, Mémoires de l'Académie des Sciences de Berlin 16 (printed 1767), pp. 101-118",
    "confidence": "high"
   },
   {
    "year": "1752 (read in Berlin on 31 August 1752 as 'De motu fluidorum in genere'); printed 1761",
    "what": "Derived the incompressibility (continuity) condition, in modern form ∂u/∂x + ∂v/∂y + ∂w/∂z = 0, by following the deformation of a small triangle and a small pyramid of fluid. Gave the equations of motion of an incompressible fluid in terms of internal pressure and Cartesian velocity components. Introduced what was later called the velocity potential, with Laplace's equation for it, but wrongly believed that such a potential always exists.",
    "work": "'Principia motus fluidorum', E258, Novi Commentarii Academiae Scientiarum Petropolitanae 6 (for 1756-57, printed 1761), pp. 271-311",
    "confidence": "high"
   },
   {
    "year": "1755 (academy-year volume; printed 1757; the Euler Archive dates the writing to 1753)",
    "what": "Set out the general conditions for the equilibrium of a fluid, compressible or not, under arbitrary forces. The basis was an isotropic normal pressure, so equilibrium requires f = ∇P. This hydrostatic memoir is the companion of the next two.",
    "work": "'Principes généraux de l'état d'équilibre des fluides', E225, Mémoires de l'Académie des Sciences de Berlin 11 (printed 1757), pp. 217-273",
    "confidence": "high"
   },
   {
    "year": "1755 (presented 4 September 1755; printed 1757)",
    "what": "Gave the general equations of motion of a compressible or incompressible ideal fluid, together with the continuity equation, in essentially their modern form. Recognised that the flow need not be irrotational and gave an explicit example of an incompressible vortex flow. Discussed boundary conditions. Ended (§68) by saying that what was lacking was analysis, not mechanics.",
    "work": "'Principes généraux du mouvement des fluides', E226, Mémoires de l'Académie des Sciences de Berlin 11 (printed 1757), pp. 274-315",
    "confidence": "high"
   },
   {
    "year": "1755 (academy-year volume; printed 1757)",
    "what": "Showed that Bernoulli's law still holds along each streamline of a steady incompressible flow even when the flow has vorticity. The reason is that integrating the convective term along a streamline removes the rotational part.",
    "work": "'Continuation des recherches sur la théorie du mouvement des fluides', E227, Mémoires de l'Académie des Sciences de Berlin 11 (printed 1757), pp. 316-361",
    "confidence": "high"
   },
   {
    "year": "1755 (academy-year volume; printed 1757)",
    "what": "The Euler Archive says that this memoir contains the first appearance of the complex potential for a source, a sink and a vortex.",
    "work": "E227 (as above), per the Euler Archive",
    "confidence": "medium"
   },
   {
    "year": "1760 (letter); 1762 (printed)",
    "what": "Described fluid motion by following each particle from its initial position, the 'material' or 'Lagrangian' description. Truesdell and the Euler Archive cite this letter as evidence that Euler had priority for that description.",
    "work": "'Lettre de M. Euler à M. de la Grange', E268, Mélanges de philosophie et de mathématique de la Société royale de Turin 2 (for 1760-61, printed 1762), pp. 1-10",
    "confidence": "high"
   }
  ],
  "notation": [
   "partial derivatives written with the ordinary d inside round brackets, e.g. (du/dx), in the 1755 memoirs; in the 1752 Latin memoir he more often used letters for the coefficients of differential forms (Darrigol and Frisch; Frisch's E226 translation, note 17)",
   "u, v, w for the velocity components (E226, 1755), still the standard letters",
   "velocity potential: a function whose differential is u dx + v dy + w dz (1752, printed 1761); the name came later"
  ],
  "anecdote": "Euler opened his third 1755 memoir with a remark about earlier work. However sublime the researches on fluids by the Bernoullis, Clairaut and d'Alembert, he wrote, 'they derive so naturally from my two general formulas' that one can only admire the agreement (E227, p. 316, in Darrigol and Frisch's translation). Darrigol and Frisch read this as a somewhat reluctant acknowledgement of d'Alembert's role. His confidence was justified: his equations are still the ones we solve.",
  "quote": "it is not the laws of Mechanics that we lack in order to pursue this research but only the Analysis, which has not yet been sufficiently developed for this purpose.",
  "quote_source": "Euler, 'Principes généraux du mouvement des fluides' (E226), §68, in T. E. Burton's English translation adapted by U. Frisch, arXiv:0802.2383: https://arxiv.org/abs/0802.2383",
  "contested": "Dates.\n- 'Euler 1752' usually means E258. It was read on 31 August 1752 but printed only in 1761, in the St Petersburg volume for 1756-57. Darrigol and Frisch say it was written in 1752; the Euler Archive says 1753.\n- The pipe memoir E206 sits in the Berlin volume for 1752, printed 1754. The Euler Archive dates its writing to 1749, while Darrigol and Frisch place it among works of 1750-51.\n- E225, E226 and E227 are cited either as 1755 or as 1757. 1755 is the academy year, and also the year E226 was presented (4 September 1755, according to Darrigol and Frisch). 1757 is the printing year.\n- MacTutor quotes the opening of E227 but introduces it with 'In 1752 he wrote'. That date is too early.\nNames. 'Eulerian' and 'Lagrangian' are later labels. Euler used the material description in the river memoir and in his 1760 letter to Lagrange. Riemann, as reported by his student Hankel, credited Euler with originating both descriptions.\nMyths. The story that Euler was incompetent at practical hydraulics rests on the failed Sanssouci fountains project and an ambiguous letter from Frederick II to Voltaire. Darrigol and Frisch, citing Eckert, call it a myth. Laplace's 'Lisez Euler, lisez Euler, c'est notre maître à tous' is known only second-hand, from Libri (1846, p. 51).",
  "chapters": [
   "viewpoints",
   "conservation",
   "advection",
   "pressure",
   "notation"
  ],
  "sources": [
   "https://www.oca.eu/etc7/EE250/texts/darrigol-frisch.pdf",
   "https://scholarlycommons.pacific.edu/euler-works/226/",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Euler/",
   "https://arxiv.org/abs/1707.01882"
  ]
 },
 {
  "id": "jean-le-rond-dalembert",
  "name": "Jean le Rond d'Alembert",
  "born": "1717",
  "died": "1783",
  "places": "Paris",
  "tags": [
   "theory",
   "mathematics"
  ],
  "summary": "d'Alembert printed the first wave equation (academy year 1747, printed 1749). His 1752 essay on fluid resistance stated the incompressibility condition and the relations now called Cauchy-Riemann. In 1768 he posed the paradox that an ideal fluid exerts no drag on a body moving steadily through it. It is the classic warning that a model can be solved exactly and still be wrong.",
  "contributions": [
   {
    "year": "1743",
    "what": "Stated the dynamical principle now named after him, which reduces problems of motion to problems of equilibrium.",
    "work": "Traité de dynamique (Paris, 1743)",
    "confidence": "high"
   },
   {
    "year": "1744",
    "what": "Applied his principle to fluids in flow by parallel slices. Noticed that for a body symmetric front to back in a channel the Bernoulli pressure gives no resistance. He avoided the difficulty by appealing to stagnant fluid behind the body.",
    "work": "Traité de l'équilibre et du mouvement des fluides (Paris, 1744), pp. 205-206",
    "confidence": "high"
   },
   {
    "year": "1747",
    "what": "Wrote a prize-winning essay on the winds for the Berlin Academy (MacTutor). In it he gave, for the first time, complete equations of motion of an incompressible fluid in a genuinely two-dimensional case, with a velocity field and partial derivatives in two spatial coordinates (Darrigol and Frisch).",
    "work": "Réflexions sur la cause générale des vents (Paris, 1747)",
    "confidence": "high"
   },
   {
    "year": "1747 (academy year; volume printed 1749)",
    "what": "Wrote the equation of the vibrating string and gave its general solution as a sum of two waves travelling in opposite directions. MacTutor calls this the first appearance of the wave equation in print.",
    "work": "'Recherches sur la courbe que forme une corde tendue mise en vibration', Histoire de l'Académie royale des sciences et belles-lettres de Berlin, année 1747 (printed 1749), pp. 214-219, with a sequel at pp. 220-249",
    "confidence": "high"
   },
   {
    "year": "1749 (Latin prize manuscript); 1752 (book)",
    "what": "For the Berlin prize on fluid resistance he derived the incompressibility condition and the condition of irrotational flow. He noted that u dx + v dy and v dx - u dy must both be exact differentials (1752 Essai, pp. 60-62). That is the pair of relations now called the Cauchy-Riemann equations, with the stream function implicit in the second. He could not solve the resulting problem around a body. His entry did not win, and he published an expanded French version.",
    "work": "Essai d'une nouvelle théorie de la résistance des fluides (Paris, 1752)",
    "confidence": "high"
   },
   {
    "year": "1761",
    "what": "Wrote the complex potential φ + iψ with (u - iv)(dx + i dy) = d(φ + iψ), whose imaginary part is constant along streamlines.",
    "work": "'Remarques sur les lois du mouvement des fluides', Opuscules mathématiques vol. 1 (Paris, 1761), pp. 137-168, at p. 139",
    "confidence": "high"
   },
   {
    "year": "1768",
    "what": "Showed that for a body symmetric front to back the theory, developed rigorously, gives zero resistance, and left this 'singular paradox' to future geometers. He returned to it in 1780.",
    "work": "'Paradoxe proposé aux géomètres sur la résistance des fluides', Opuscules mathématiques vol. 5 (Paris, 1768), Memoir XXXIV, §I, pp. 132-138; then 'Sur la résistance des fluides', vol. 8 (1780), Memoir LVII, §13, pp. 210-230",
    "confidence": "high"
   }
  ],
  "notation": [
   "partial derivatives written as letter coefficients, e.g. df = A dx + B dy (1747), rather than Fontaine's df/dx (Darrigol and Frisch)"
  ],
  "anecdote": "As a newborn he was left on the steps of the Paris church of Saint-Jean-le-Rond and was baptised Jean le Rond after it (MacTutor). His 1749 Latin entry on fluid resistance did not win the Berlin prize. The Academy judged that none of the competitors had compared their theoretical results with experiments. d'Alembert replied that the equations could not be solved in the near future and that his methods deserved credit anyway. The same tension between exact theory and measurement returns in his 1768 paradox.",
  "quote": "Thus I do not see, I admit, how one can satisfactorily explain by theory the resistance of fluids. On the contrary, it seems to me that the theory, developed in all possible rigor, gives, at least in several cases, a strictly vanishing resistance; a singular paradox which I leave to future Geometers to elucidate.",
  "quote_source": "d'Alembert, Opuscules mathématiques vol. 5 (1768), p. 138, English translation in G. Grimberg, W. Pauls and U. Frisch, 'Genesis of d'Alembert's paradox and analytical elaboration of the drag problem', Physica D 237 (2008): https://arxiv.org/abs/0801.3014",
  "contested": "The paradox is often dated to the 1752 Essai, but the Essai does not state it. d'Alembert first announced it in 1768, for bodies symmetric front to back, and revisited it in 1780. It is also sometimes said that Euler had already found zero drag in 1745, in his German commentary on Robins's New Principles of Gunnery (E77). Grimberg, Pauls and Frisch say only that Euler 'came close, technically, to proving the vanishing of the drag'. He did not state that result, and he lacked a correct picture of the flow around the body. Borda (1766) did derive zero drag, from the principle of live forces, and concluded that the principle could not apply. The general statement, and its attribution to neglecting viscosity, came from Saint-Venant (notes 1846, memoir 1847). The 'Cauchy-Riemann equations' were written first by d'Alembert, for fluid flow, in 1749-52. Darrigol and Frisch suggest calling the incompressibility condition 'd'Alembert's condition'. Priority for the complex potential is less clear than it looks: the Euler Archive credits Euler's E227 (printed 1757) with complex potentials for a source, a sink and a vortex. The vibrating-string memoir is dated 1747 (academy year) or 1749 (printing year) in different sources.",
  "chapters": [
   "advection",
   "conservation",
   "pressure",
   "trust"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/DAlembert/",
   "https://arxiv.org/abs/0801.3014",
   "https://www.oca.eu/etc7/EE250/texts/darrigol-frisch.pdf",
   "https://archive.org/details/berlin-histoire-1747-pub1749_images"
  ]
 },
 {
  "id": "antoine-de-chezy",
  "name": "Antoine de Chézy",
  "born": "1718",
  "died": "1798",
  "places": "Châlons-sur-Marne (now Châlons-en-Champagne), Paris (École des Ponts et Chaussées)",
  "tags": [
   "engineering",
   "experiment"
  ],
  "summary": "Chézy's formula V = C√(RS) for steady uniform flow in a channel is the ancestor of the friction laws used in river and shallow-water models. It is also an early similarity argument, since a coefficient measured on one channel predicts the flow in another.",
  "contributions": [
   {
    "year": "1768 or 1775 (sources differ)",
    "what": "While studying a scheme to bring water from the Yvette river to Paris, he proposed that the mean velocity of uniform channel flow is V = C√(RS). R is the hydraulic radius (flow area divided by wetted perimeter), S the slope and C a coefficient fixed by measurement. The work stayed little known until his former student Gaspard de Prony drew attention to it.",
    "work": "Report on the Yvette water-supply project (manuscript)",
    "confidence": "medium"
   },
   {
    "year": "1752-1764 (sources differ)",
    "what": "Worked on the studies for the difficult Canal de Bourgogne, which joined the Seine and Rhône basins. Britannica dates his studies to 1764; French Wikipedia puts his first levellings for the canal in 1752.",
    "work": "Canal de Bourgogne studies",
    "confidence": "medium"
   },
   {
    "year": "1791",
    "what": "Completed the Pont de la Concorde in Paris for Jean-Rodolphe Perronet, whose right-hand man he was.",
    "work": "Pont de la Concorde (per Britannica)",
    "confidence": "high"
   },
   {
    "year": "1797-1798",
    "what": "Became director of the École des Ponts et Chaussées in the last year of his life, after Prony's efforts on his behalf.",
    "work": "École des Ponts et Chaussées",
    "confidence": "high"
   }
  ],
  "notation": [
   "C, now called the Chézy coefficient, in V = C√(RS) (1768 or 1775); the name was given later"
  ],
  "anecdote": "Britannica describes Chézy as exceptionally modest, even timid, a man whose genius was recognised late. French Wikipedia says he retired in 1790 in extreme poverty. His former student Prony rescued his work from obscurity. Through Prony's efforts Chézy became the third director of the École des Ponts et Chaussées in 1797, and he died in office on 5 October 1798.",
  "quote": "",
  "quote_source": "",
  "contested": "The date of the formula is uncertain. English Wikipedia says it was developed in 1768. French Wikipedia, drawing on Mouret's 1921 study in the Annales des ponts et chaussées, gives 1775, in connection with the Yvette water-supply study. The Yvette scheme was already under discussion at the Académie in 1766 (Histoire for 1766, p. 131), so both dates are plausible. Both sources agree the formula was not widely known in his lifetime and was revived by Prony. The Canal de Bourgogne work is likewise dated 1764 by Britannica and 1752 (first levellings) by French Wikipedia. French Wikipedia gives his birth date as 1 September 1718 and calls him Antoine Chézy, without the 'de'. Robert Manning's later formula modified Chézy's so that the coefficient could be estimated from the channel itself rather than measured. It was presented in 1889 and printed in 1891.",
  "chapters": [
   "similarity",
   "trust"
  ],
  "sources": [
   "https://www.britannica.com/biography/Antoine-de-Chezy",
   "https://fr.wikipedia.org/wiki/Antoine_Ch%C3%A9zy",
   "https://en.wikipedia.org/wiki/Ch%C3%A9zy_formula",
   "https://archive.org/details/histoiredelacad66hist"
  ]
 },
 {
  "id": "jean-charles-de-borda",
  "name": "Jean-Charles de Borda",
  "born": "1733",
  "died": "1799",
  "places": "Dax (born), Paris, French Navy",
  "tags": [
   "experiment",
   "theory",
   "engineering"
  ],
  "summary": "In 1766 Borda showed that kinetic energy ('live force') is lost wherever a flow changes section abruptly, while momentum still balances. This is the Borda-Carnot loss, loosely analogous to the jump conditions at a shock. He also derived the half-area contraction of a jet from a tube that projects into the vessel (the Borda mouthpiece). And he found that a live-force argument gives zero drag.",
  "contributions": [
   {
    "year": "1762",
    "what": "Showed that a spherical projectile experiences only about half the air resistance of a cylinder of the same diameter, and that resistance is roughly proportional to the square of the velocity, contrary to Newton's theory (per MacTutor).",
    "work": "Experiments on the resistance of air",
    "confidence": "medium"
   },
   {
    "year": "1766 (academy year; printed 1769)",
    "what": "Considered a jet leaving a vessel through an infinitely thin tube that projects into it. Using a momentum argument, he showed that the jet contracts to half the tube's area (§7); this is the Borda mouthpiece. He also repeated Newton's experiment on jet contraction on a larger scale, with a tub about 3 feet across and a hole of 15 lignes (§8).",
    "work": "'Mémoire sur l'écoulement des fluides par les orifices des vases', Histoire de l'Académie royale des sciences, année 1766 (Paris, 1769), Mémoires pp. 579-607; summary 'Sur l'écoulement des fluides par les ouvertures des vases' in the Histoire, beginning p. 143",
    "confidence": "high"
   },
   {
    "year": "1766 (academy year; printed 1769)",
    "what": "Argued that live force is not conserved where the flow changes abruptly: at diaphragms, at sudden enlargements and where a stream enters below a free surface. This is the basis of the head-loss law now called the Borda-Carnot equation.",
    "work": "'Mémoire sur l'écoulement des fluides par les orifices des vases' (1766)",
    "confidence": "high"
   },
   {
    "year": "1766 (academy year; printed 1769)",
    "what": "Showed that assuming conservation of live force for a body in a stream gives zero resistance, and concluded that the principle does not apply there. Grimberg, Pauls and Frisch call this the first derivation of d'Alembert's paradox using an energy argument.",
    "work": "'Mémoire sur l'écoulement des fluides par les orifices des vases' (1766), pp. 604-605",
    "confidence": "high"
   },
   {
    "year": "1787",
    "what": "Described the repeating circle, a surveying and navigation instrument that cancels reading errors by measuring an angle repeatedly. MacTutor says he proposed it around 1785.",
    "work": "Description et usage du cercle de réflexion (1787)",
    "confidence": "high"
   },
   {
    "year": "1790-1791",
    "what": "Chaired the Commission of Weights and Measures, whose members included Condorcet, Lavoisier, Laplace and Legendre. On 19 March 1791 he reported its decision to define the metre as one ten-millionth of the distance from the North Pole to the equator.",
    "work": "Commission of Weights and Measures report (19 March 1791)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Borda mouthpiece' for the re-entrant tube, named after his 1766 analysis",
   "'Borda-Carnot' loss for a sudden expansion (a later name)"
  ],
  "anecdote": "Borda was a serving naval officer as well as a theorist. At the Battle of the Saints in 1782 he commanded six ships from la Solitaire and was taken prisoner by the British (MacTutor). In fluid theory he took the more unusual course. The principle of live forces predicted that a body in a stream would feel no resistance. Rather than accept the result, he concluded that the principle must fail there. That was two years before d'Alembert called the same result a paradox.",
  "quote": "As the weight P measures the resistance of the fluid, the supposition of the principle [of live forces] necessarily leads to a vanishing resistance.",
  "quote_source": "Borda, 'Mémoire sur l'écoulement des fluides par les orifices des vases', Mémoires de l'Académie royale des sciences 1766 (printed 1769), pp. 604-605, English translation in G. Grimberg, W. Pauls and U. Frisch, Physica D 237 (2008): https://arxiv.org/abs/0801.3014",
  "contested": "The law for the head loss at a sudden expansion carries the names of Borda and Lazare Carnot. Borda's 1766 memoir established that live force is lost at such changes, and Carnot later generalised the treatment of losses in impacts. Borda's zero-drag result (1766) predates d'Alembert's 1768 paradox. The 1766 memoir is cited both as 1766 (academy year) and as 1769 (printing year). The Histoire summary of the memoir runs from p. 143 to p. 150.",
  "chapters": [
   "conservation",
   "shocks",
   "trust"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Borda/",
   "https://archive.org/details/histoiredelacad66hist",
   "https://arxiv.org/abs/0801.3014"
  ]
 },
 {
  "id": "joseph-louis-lagrange",
  "name": "Joseph-Louis Lagrange",
  "born": "1736",
  "died": "1813",
  "places": "Turin, Berlin (1766-87), Paris",
  "tags": [
   "theory",
   "mathematics",
   "notation"
  ],
  "summary": "Lagrange's 1781 memoir introduced the stream function and developed the velocity potential and the theory of shallow-water waves. His Méchanique analitique (1788) recast all of mechanics, fluids included, as algebraic analysis. His name now labels the particle-following description used by SPH and other particle methods. Euler used that description first, and Lagrange himself advised against it for fluids.",
  "contributions": [
   {
    "year": "1781 (academy year; printed 1783)",
    "what": "Opened by crediting d'Alembert with first reducing the laws of fluid motion to analytical equations. Gave the kinematic condition at a moving boundary (§10). Wrote the velocities as derivatives of a potential φ, with p = dφ/dx and so on (§15), and with Laplace's equation for φ when the fluid is incompressible. Argued that a flow which starts with a velocity potential keeps one (§§19-20). For two-dimensional incompressible flow he wrote p dy - q dx = dω, so that p = dω/dy and q = -dω/dx (§21). This ω is the stream function, and he showed that it satisfies d²ω/dx² + d²ω/dy² = a function of ω.",
    "work": "'Mémoire sur la théorie du mouvement des fluides', Nouveaux Mémoires de l'Académie royale des Sciences et Belles-Lettres de Berlin, année 1781; Œuvres vol. 4, pp. 695-748",
    "confidence": "high"
   },
   {
    "year": "1781 (academy year)",
    "what": "Derived the wave equation gα(d²φ/dx² + d²φ/dy²) = d²φ/dt² for long waves in a basin of depth α. The wave speed therefore varies as the square root of the depth: 5.495 pieds per second for a depth of 1 pied. He then used La Hire's measured wave speed of 1.412 pieds per second to infer that the water is disturbed only to a depth of about 66/1000 of a pied (about 10 lignes).",
    "work": "'Mémoire sur la théorie du mouvement des fluides', §§48-50",
    "confidence": "high"
   },
   {
    "year": "1788",
    "what": "Built mechanics, including hydrostatics and hydrodynamics, on virtual velocities and pure analysis. He gave the equations of fluid motion in both the spatial and the material descriptions and told readers to prefer the spatial ones (p. 453). Legendre acted as editor and saw the book through the press.",
    "work": "Méchanique analitique (Paris: Veuve Desaint, 1788)",
    "confidence": "high"
   }
  ],
  "notation": [
   "ω for the stream function, with p = dω/dy and q = -dω/dx (1781); ψ is now usual",
   "φ for the velocity potential, with p = dφ/dx (1781); the potential itself is Euler's (read 1752, printed 1761)",
   "prime notation for derivatives: ψ' for dψ/dx in 'Nouvelle méthode pour résoudre les équations littérales par le moyen des séries' (1770), and u' = du/dx in a 1772 Berlin memoir; f'x in Théorie des fonctions analytiques (1797) (per Miller's Earliest Uses of Symbols of Calculus, citing Cajori)"
  ],
  "anecdote": "The preface of the Méchanique analitique announces: 'On ne trouvera point de Figures dans cet Ouvrage. Les méthodes que j'y expose ne demandent ni constructions, ni raisonnemens géométriques ou méchaniques, mais seulement des opérations algébriques, assujetties à une marche régulière & uniforme'. In English: 'You will find no figures in this work. The methods I set out require neither constructions nor geometric or mechanical reasoning, only algebraic operations subject to a regular and uniform procedure'. It is a whole treatise on mechanics without one diagram.",
  "quote": "The [Eulerian] equations are much simpler than the [Lagrangian] ones; thus, in the theory of fluids, one should prefer the former over the latter.",
  "quote_source": "Lagrange, Méchanique analitique (1788), p. 453, English translation in U. Frisch, G. Grimberg and B. Villone, 'A contemporary look at Hermann Hankel's 1861 pioneering work on Lagrangian fluid dynamics', arXiv:1707.01882: https://arxiv.org/abs/1707.01882",
  "contested": "Wikipedia credits Lagrange with the stream function (1781) and the velocity potential (1788). The 1781 memoir does define the stream function explicitly (§21), and Chanson (La Houille Blanche, 2007) credits it with that. But d'Alembert had already required v dx - u dy to be exact (1749-52). He also noted in 1761 that the imaginary part of his complex potential is constant on streamlines. The velocity potential is Euler's (read 1752, printed 1761) and is already used in the 1781 memoir, so 1788 is too late for it. The 'Lagrangian description' is also misnamed. Euler used material coordinates first: in his river memoir (about 1750-51) and in his 1760 letter to Lagrange (printed 1762), as Riemann, Hankel and Truesdell noted. Lagrange himself used them in his 1760-61 Turin memoir 'Application de la méthode exposée dans le mémoire précédent...' (§XLIV, p. 276), printed in the same Turin volume as Euler's letter. In 1788 (p. 453) he recommended the other description for fluids, a warning Frisch and colleagues call 'Lagrange's curse'. Prime notation is often dated to his 1797 Théorie des fonctions analytiques, but Miller records ψ' in 1770 and u' in 1772.",
  "chapters": [
   "viewpoints",
   "lattice-particles",
   "pressure",
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Lagrange/",
   "https://fr.wikisource.org/wiki/M%C3%A9moires_extraits_des_recueils_de_l%E2%80%99Acad%C3%A9mie_royale_de_Berlin/M%C3%A9moire_sur_la_Th%C3%A9orie_du_mouvement_des_fluides",
   "https://archive.org/details/bub_gb_057Lfb_fsQMC",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/"
  ]
 },
 {
  "id": "marquis-de-condorcet",
  "name": "Nicolas de Condorcet (Marquis de Condorcet)",
  "born": "1743",
  "died": "1794",
  "places": "Ribemont (born), Paris, Bourg-la-Reine (died)",
  "tags": [
   "notation",
   "mathematics"
  ],
  "summary": "Condorcet printed the curly ∂ for a partial difference in a memoir on partial differential equations. It appeared in the Académie's volume for 1770 (printed 1773), well before Legendre. The usual story that Legendre invented ∂ therefore needs a footnote.",
  "contributions": [
   {
    "year": "1770 (academy year; printed 1773)",
    "what": "Used dz and ∂z side by side, with two possible meanings. Either they stand for the two partial differences of z with respect to x and y, or dz is a total differential and ∂z a partial difference.",
    "work": "'Mémoire sur les équations aux différences partielles', Histoire de l'Académie royale des sciences, année 1770 (Paris, 1773), Mémoires pp. 151-178",
    "confidence": "high"
   },
   {
    "year": "1790",
    "what": "Served on the Commission of Weights and Measures chaired by Borda, alongside Lavoisier, Laplace and Legendre.",
    "work": "Commission of Weights and Measures (per MacTutor's Borda biography)",
    "confidence": "high"
   }
  ],
  "notation": [
   "∂ alongside d for partial differences, 1770 (printed 1773)"
  ],
  "anecdote": "Condorcet went into hiding during the Terror. There he wrote his Esquisse d'un tableau historique des progrès de l'esprit humain. He was arrested on 27 March 1794 and died at Bourg-la-Reine two days later. The Esquisse was published in 1795 (MacTutor).",
  "quote": "Dans toute la suite de ce Mémoire, dz & ∂z désigneront ou deux différences partielles de z, dont une par rapport à x, l'autre par rapport à y, ou bien dz sera une différentielle totale, & ∂z une différence partielle.",
  "quote_source": "Condorcet, 'Mémoire sur les équations aux différences partielles', Histoire de l'Académie royale des sciences, année 1770 (Paris, 1773), Mémoires p. 152; scan at https://archive.org/details/histoiredelacad70hist; transcription in J. Miller, Earliest Uses of Symbols of Calculus: https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
  "contested": "Miller's page labels the volume 'Annee M. DCCLXXIII (1773)'. The memoir is in fact in the volume for the academy year 1770, printed in 1773. Condorcet's ∂ was not yet the modern partial derivative. His dz and ∂z stood for differences, not quotients, and their meaning could switch between two conventions. Legendre (1786, printed 1788) was the first to write ∂u/∂x expressly to distinguish partial from total derivatives.",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Condorcet/",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/",
   "https://archive.org/details/histoiredelacad70hist",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Borda/"
  ]
 },
 {
  "id": "giovanni-battista-venturi",
  "name": "Giovanni Battista Venturi",
  "born": "1746",
  "died": "1822",
  "places": "Bibbiano (born), Modena, Paris (1796-97), Bern (diplomatic posting, 1801-13), Reggio Emilia",
  "tags": [
   "experiment"
  ],
  "summary": "In 1797 Venturi experimented on flow through tubes with conical sections. He found that the pressure of the liquid is higher where its velocity is lower, and lower where it is higher. This is the effect behind the Venturi flowmeter, and it is a standard test of how a solver couples pressure and velocity.",
  "contributions": [
   {
    "year": "1797 (presented to the science class of the Institut de France on 28 August 1797)",
    "what": "Studied the lateral communication of motion in fluids, that is, entrainment by jets. He also studied flow through a pipe made of two joined truncated cones. He found that the pressure of the liquid is greater where its velocity is smaller, and the reverse (Treccani).",
    "work": "Recherches expérimentales sur le principe de la communication latérale du mouvement dans les fluides, appliqué à l'explication de différens phénomènes hydrauliques (Paris, 1797)",
    "confidence": "high"
   },
   {
    "year": "1797 (reported to the Institut on 25 April 1797)",
    "what": "Published a study of the scientific and technical content of Leonardo da Vinci's manuscripts, which the French had taken from Milan.",
    "work": "Essai sur les ouvrages physico-mathématiques de Léonard de Vinci (Paris, 1797)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Venturi tube': the term appears in Clemens Herschel's 1888 patent ('a diverging ajutage or Venturi tube'), where it is used as an already familiar name; Herschel named the flowmeter after Venturi"
  ],
  "anecdote": "Venturi went to Paris in June 1796 as secretary of a Modenese legation. The French occupied Modena that October and the mission collapsed. He stayed on at his own expense, attending lectures and studying the Leonardo codices, which had arrived from Milan on 25 November 1796. Both of his 1797 works came out of this unplanned stay, which ended in October 1797 (Treccani).",
  "quote": "",
  "quote_source": "",
  "contested": "Venturi did not build a flowmeter. Clemens Herschel built one and named it after him. Treccani dates the instrument to 1882. Herschel's US patent was filed on 12 December 1887 and granted on 17 April 1888. The patent speaks of 'a diverging ajutage or Venturi tube' as something already known, so it is an overstatement to say that Herschel coined the name 'Venturi tube' itself. The 'Venturi effect' is now usually explained with Bernoulli's equation. Venturi, however, framed his work as 'lateral communication of motion' (entrainment), and Bernoulli's 1738 result concerned wall pressure in parallel-slice flow. Treccani also notes that Venturi wrongly presented Leonardo as a 'precursor' of Galileo and later scientists.",
  "chapters": [
   "conservation",
   "trust"
  ],
  "sources": [
   "https://www.treccani.it/enciclopedia/giovanni-battista-venturi_(Dizionario-Biografico)/",
   "https://en.wikipedia.org/wiki/Giovanni_Battista_Venturi",
   "https://www.britannica.com/biography/Giovanni-Battista-Venturi",
   "https://patents.google.com/patent/US381373A/en"
  ]
 },
 {
  "id": "pierre-simon-laplace",
  "name": "Pierre-Simon Laplace",
  "born": "1749",
  "died": "1827",
  "places": "Beaumont-en-Auge (born), Paris",
  "tags": [
   "theory",
   "mathematics"
  ],
  "summary": "Every incompressible solver meets Laplace's equation as the pressure Poisson problem. The name comes from his work on gravitational attraction (1782), and he wrote the equation in rectangular coordinates in 1787. Euler and Lagrange had already written it for the velocity potential. He also corrected Newton's speed of sound by recognising that the compressions in a sound wave heat the air (1816).",
  "contributions": [
   {
    "year": "1782 (academy year; printed 1785)",
    "what": "Developed the theory of the attraction of spheroids. He later said this theory rested on the equation now named after him, written in coordinates other than rectangular ones.",
    "work": "'Théorie des attractions des sphéroïdes et de la figure des planètes', Histoire de l'Académie royale des sciences, année 1782 (Paris, 1785), Mémoires p. 113 ff.",
    "confidence": "high"
   },
   {
    "year": "1787 (academy year; printed 1789)",
    "what": "Wrote the equation in rectangular coordinates and stated that 'Cette équation rapportée à d'autres coordonnées, est la base de la théorie que j'ai présentée dans nos Mémoires de 1782'.",
    "work": "'Mémoire sur la théorie de l'anneau de Saturne', Histoire de l'Académie royale des sciences, année 1787 (Paris, 1789), Mémoires p. 249 ff.",
    "confidence": "high"
   },
   {
    "year": "1816 (read 23 December 1816; printed 1816)",
    "what": "Showed that the true speed of sound equals Newton's value multiplied by the square root of the ratio of the specific heats at constant pressure and at constant volume. Newton's formula gives 282.42 m per second at 6°C. La Roche and Bérard's measurements give a ratio of 1.5, and the corrected value is then 345.35 m. The French academicians had observed 337.18 m in 1738, which implies a ratio of about 1.4254. In the same note he corrected his own earlier figures for sound in water, which he had based on Canton's compression experiments. Dividing them by √3 gave 1525.8 m per second in rain water and 1620.9 m per second in sea water, so sound is 'quatre fois et demie' faster in fresh water than in air.",
    "work": "'Sur la vitesse du son dans l'air et dans l'eau', Annales de chimie et de physique 3 (1816), pp. 238-241",
    "confidence": "high"
   },
   {
    "year": "1806-1807",
    "what": "Wrote supplements to the Mécanique céleste on capillary action. They give the theory of the pressure jump across a curved liquid surface, now the Young-Laplace equation.",
    "work": "Traité de mécanique céleste, supplements to vol. 4",
    "confidence": "medium"
   }
  ],
  "notation": [
   "the operator d²/dx² + d²/dy² + d²/dz² written out in rectangular coordinates (1787, printed 1789), now called the Laplacian; the symbol Δ is Robert Murphy's (1833), not Laplace's"
  ],
  "anecdote": "Laplace's 1816 note runs a model backwards and corrects its author. The best available ratio of specific heats (1.5) overshot the measured speed of sound. He turned the calculation around and used the measured speed to infer the ratio, about 1.4254, close to the modern value of 1.4 for air. He suggested this might be the most precise way to obtain it. A few lines later he admitted that his recent figures for sound in water were too large by a factor of √3. He had counted only the linear shrinkage of a compressed sample, not the total change in its volume.",
  "quote": "La vitesse réelle du son est égale au produit de la vitesse que donne la formule newtonienne, par la racine carrée du rapport de la chaleur spécifique de l'air soumis à la pression constante de l'atmosphère et à diverses températures, à sa chaleur spécifique lorsque son volume reste constant.",
  "quote_source": "Laplace, 'Sur la vitesse du son dans l'air et dans l'eau', Annales de chimie et de physique 3 (1816), p. 239: https://archive.org/details/s3id13207680",
  "contested": "(1) Euler (read 1752, printed 1761) and Lagrange (1781) had both written 'Laplace's equation' for the velocity potential before Laplace's 1782 memoir. The name reflects his systematic use of it in potential theory. Miller, citing Smith (1906) and Britannica, credits the term 'potential function' to Green (1828) and the name 'Potential' to Gauss (1840). He also notes a claim, via Kline, that Daniel Bernoulli used 'potential function' in 1738. (2) The Δ symbol is Murphy's (1833). (3) The heating idea predates the 1816 note. Laplace writes there that the phenomenon 'm'a paru être la vraie cause' of the discrepancy and that most physicist-geometers had since adopted it. (4) The remark 'Lisez Euler, lisez Euler, c'est notre maître à tous' is known only second-hand (Libri, 1846). (5) The water speeds printed in an earlier 1816 note were too high by a factor of √3, which he corrected in his December 1816 paper.",
  "chapters": [
   "pressure",
   "stiffness",
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Laplace/",
   "https://archive.org/details/histoiredelacad82hist",
   "https://archive.org/details/histoiredelacad87hist",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathword/p/"
  ]
 },
 {
  "id": "adrien-marie-legendre",
  "name": "Adrien-Marie Legendre",
  "born": "1752",
  "died": "1833",
  "places": "Paris (born there, though Toulouse is sometimes given)",
  "tags": [
   "notation",
   "mathematics"
  ],
  "summary": "Legendre's 1786 memoir on the calculus of variations is the first place the curly ∂ is written as ∂u/∂x specifically to separate partial from total derivatives. That is the notation every fluid equation now uses. He soon dropped it, and it only became standard after Jacobi revived it in 1841.",
  "contributions": [
   {
    "year": "1786 (academy year; printed 1788)",
    "what": "In a footnote ('Pour éviter toute ambiguité...'), introduced ∂u/∂x for the partial derivative, alongside du/dx for the complete derivative. The memoir itself gives the second-variation test now called Legendre's condition.",
    "work": "'Mémoire sur la manière de distinguer les maxima des minima dans le calcul des variations', Histoire de l'Académie royale des sciences, année 1786 (Paris, 1788), Mémoires pp. 7-37 (footnote on p. 8)",
    "confidence": "high"
   },
   {
    "year": "1788",
    "what": "Acted as editor of Lagrange's Méchanique analitique and saw it through the press in Paris (MacTutor).",
    "work": "Lagrange, Méchanique analitique (Paris, 1788)",
    "confidence": "high"
   },
   {
    "year": "1790-1791",
    "what": "Took part in the Académie's work on weights and measures that led to the metre. MacTutor's Legendre biography says he joined the committee on 13 May 1791. Its Borda biography lists him as a member of the 1790 commission chaired by Borda.",
    "work": "Commission of Weights and Measures (per MacTutor's Legendre and Borda biographies)",
    "confidence": "medium"
   },
   {
    "year": "1805 (MacTutor gives 1806)",
    "what": "Published the method of least squares for fitting orbits to observations, in an appendix to a book on comet orbits.",
    "work": "Nouvelles méthodes pour la détermination des orbites des comètes (Paris), appendix",
    "confidence": "medium"
   }
  ],
  "notation": [
   "∂ for partial derivatives, written as ∂u/∂x, 1786 (printed 1788); Legendre later abandoned it, and Jacobi revived it in 1841"
  ],
  "anecdote": "For over a century, books printed a portrait of the politician Louis Legendre (about 1755-1797) as the mathematician. Two students at Strasbourg spotted the mistake in 2005. Duren calls the real portrait 'the only image of Adrien-Marie Legendre known to exist'. It is a watercolour caricature by Julien-Léopold Boilly in an 1820 album, found in 2008 at the Institut de France (Duren, Notices of the AMS, December 2009).",
  "quote": "",
  "quote_source": "",
  "contested": "(1) Who introduced ∂. Condorcet had already printed ∂ for a partial difference, side by side with d, in a memoir in the Académie's volume for 1770 (printed 1773). Legendre's 1786 footnote is the first use of ∂u/∂x as a quotient expressly to distinguish partial from total derivatives. He then abandoned it. Euler and Lagrange had written partial derivatives with the ordinary d, Euler often inside parentheses. The symbol became standard only after Jacobi's 'De determinantibus functionalibus' (Crelle's Journal 22, 1841, pp. 319-352). (2) Dates. The memoir is cited both as 1786 (academy year) and as 1788 (printing year). (3) The portrait error described in the anecdote is sometimes said to have lasted two centuries. Duren says 'for over a century'. (4) The least-squares book is usually dated 1805, but MacTutor gives 1806. (5) The Laplacian symbol Δ was introduced by Robert Murphy in 1833, not by Legendre or Laplace.",
  "chapters": [
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Legendre/",
   "https://archive.org/details/histoiredelacad86hist",
   "https://www.ams.org/notices/200911/rtx091101440p.pdf",
   "https://mathshistory.st-andrews.ac.uk/Miller/mathsym/calculus/"
  ]
 },
 {
  "id": "simeon-denis-poisson",
  "name": "Siméon Denis Poisson",
  "born": "1781",
  "died": "1840",
  "places": "Pithiviers, Paris (died at Sceaux)",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "Poisson's 1813 equation sets the Laplacian of a potential equal to a source term. In incompressible flow solvers it becomes the pressure Poisson equation, solved at every time step. His 1829 viscous memoir kept two independent viscosity constants, which is where the question of bulk viscosity starts.",
  "contributions": [
   {
    "year": "1813",
    "what": "Showed that inside an attracting mass the potential satisfies ∇²V = -4πρ (in his sign convention). Laplace's equation, which had been treated as holding everywhere, holds only outside the mass.",
    "work": "Remarques sur une équation qui se présente dans la théorie des attractions des sphéroïdes, Nouveau bulletin des sciences par la Société philomathique de Paris, vol. 3, no. 75 (December 1813), pp. 388-392",
    "confidence": "medium"
   },
   {
    "year": "1829 (read 12 October 1829); printed 1831",
    "what": "Derived equations of motion for elastic solids and viscous fluids from molecular forces. For fluids he kept two independent constants, which Stokes later reduced to one. In 1845 Stokes reported that Poisson's wall conditions did not fit pipe data either.",
    "work": "Mémoire sur les équations générales de l'équilibre et du mouvement des corps solides élastiques et des fluides, Journal de l'École polytechnique, cahier 20 (1831)",
    "confidence": "high"
   }
  ],
  "notation": [
   "Poisson's equation (1813), written with the three second derivatives spelled out. The ∇² shorthand came later."
  ],
  "anecdote": "Laplace's equation had been used as if it held everywhere in a body. Poisson noticed in 1812-13 that inside matter it must carry a source term proportional to the density. In a projection-method fluid solver the 'source' is the divergence of the provisional velocity, which is why much of the solver's time goes into a Poisson solve.",
  "quote": "",
  "quote_source": "",
  "contested": "Stokes (1845) cut Poisson's two fluid constants to one by assuming that a uniform expansion produces no viscous stress beyond the pressure. This 'Stokes hypothesis' (zero bulk viscosity) is a modelling choice, not a law of nature; it suits dilute monatomic gases but not fluids in general. Poisson's equation is sometimes credited to Laplace; Laplace's equation is only the source-free special case. Gauss gave the first rigorous proof for variable density in 1839.",
  "chapters": [
   "pressure",
   "solvers",
   "conservation",
   "stable-fluids"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Poisson/",
   "https://fr.wikipedia.org/wiki/%C3%89quation_de_Poisson",
   "https://archive.org/details/mathematicalphys01stokuoft",
   "https://archive.org/details/comptesrendusheb17acad"
  ]
 },
 {
  "id": "claude-louis-navier",
  "name": "Claude-Louis Navier",
  "born": "1785",
  "died": "1836",
  "places": "Dijon, Paris",
  "tags": [
   "theory",
   "engineering",
   "mathematics"
  ],
  "summary": "Navier was the first to write the viscous equations of fluid motion. His memoir was read to the Academy on 18 March 1822. He reached the equations from a model of forces between molecules. His constant ε does the job of today's viscosity μ, and his wall condition let the fluid slip along a solid.",
  "contributions": [
   {
    "year": "1822 (read 18 March 1822); printed 1827",
    "what": "Added internal-friction terms to Euler's equations of motion. He derived them from molecular forces that depend on the relative velocity of neighbouring molecules. The result has the modern viscous form with a single constant ε. He also gave a wall condition, Eu + ε du/dz = 0, that allows slip at a solid wall, and applied it to flow in pipes of rectangular and circular section.",
    "work": "Mémoire sur les lois du mouvement des fluides, Mémoires de l'Académie royale des sciences de l'Institut de France, vol. 6 (volume for 1823, printed 1827), pp. 389-440",
    "confidence": "high"
   },
   {
    "year": "1822 (read 18 March 1822; printed in the volume for 1821)",
    "what": "A shorter account of the same theory, read on the same day as the longer memoir.",
    "work": "Sur les lois des mouvements des fluides, en ayant égard à l'adhésion des molécules, Annales de chimie et de physique, vol. 19, pp. 244-260 (as cited by Bistafa 2024)",
    "confidence": "medium"
   },
   {
    "year": "1820; 1821 (read), 1827 (printed)",
    "what": "A paper on elastic plates (14 August 1820) and a memoir on the equilibrium and vibration of elastic solids (read 1821, printed 1827), both using the molecular-force method. Cauchy wrote in 1822 that the 1820 plate paper had suggested his own stress theory.",
    "work": "Memoir on elastic plates (14 August 1820); memoir on elastic solids (read 1821, printed 1827)",
    "confidence": "high"
   }
  ],
  "notation": [
   "ε: Navier's constant for the resistance of fluid layers sliding over each other (1822). It plays the role now given to the dynamic viscosity μ.",
   "E: the wall slip coefficient in his boundary condition Eu + ε du/dz = 0 (1822)",
   "Partial derivatives written with a plain d, as was usual at the time"
  ],
  "anecdote": "Navier's pipe formula used his slip condition and made the velocity proportional to the first power of the tube diameter. In December 1840 Poiseuille reported capillary-tube measurements in which the velocity grew as the square of the diameter, which is what the no-slip solution gives. Poiseuille quoted Navier's formula in the Comptes rendus and pointed out the wrong power.",
  "quote": "la constante ε représente en unités de poids la résistance provenant du glissement de deux couches quelconques l'une sur l'autre, pour une étendue égale à l'unité superficielle",
  "quote_source": "Navier, Mémoire sur les lois du mouvement des fluides (read 18 March 1822), Mém. Acad. Sci. vol. 6, printed p. 416, as transcribed on French Wikisource (djvu page 604; the transcription has the typo 'représenté'). The case described is two layers one unit apart whose velocities differ by one unit.",
  "contested": "MacTutor dates Navier's Navier-Stokes equations to 1821. The fluid memoir was read on 18 March 1822 (date on the memoir itself and confirmed by Saint-Venant in 1843) and printed in 1827. The label 'Navier-Stokes' covers five separate derivations on different physical assumptions, which Darrigol calls the 'five births': Navier 1822, Cauchy 1823, Poisson 1829, Saint-Venant (1834-1843) and Stokes 1845. Navier's molecular model was later abandoned but the form of his equations survived. His slip condition did not survive for ordinary liquids.",
  "chapters": [
   "conservation",
   "notation",
   "continuum"
  ],
  "sources": [
   "https://fr.wikisource.org/wiki/Page:M%C3%A9moires_de_l%E2%80%99Acad%C3%A9mie_des_sciences,_Tome_6.djvu/604",
   "https://arxiv.org/pdf/2401.13669",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Navier/",
   "https://archive.org/details/comptesrendusheb11acad"
  ]
 },
 {
  "id": "augustin-louis-cauchy",
  "name": "Augustin-Louis Cauchy",
  "born": "1789",
  "died": "1857",
  "places": "Paris, Turin, Prague",
  "tags": [
   "theory",
   "mathematics",
   "notation"
  ],
  "summary": "Cauchy generalised pressure into stress, a force per unit area acting on any internal surface and not necessarily normal to it. The stress on any plane follows from the stresses on three perpendicular planes. Every continuum model, and every momentum flux in a finite-volume code, rests on this idea.",
  "contributions": [
   {
    "year": "1822 (announced, autumn); printed 1823",
    "what": "Announced the stress concept together with strain, the symmetry of stress, and principal axes. The note led to equations of internal motion for elastic and non-elastic bodies, including fluids, whose form matches Navier's but without Navier's molecular model.",
    "work": "Recherches sur l'équilibre et le mouvement intérieur des corps solides ou fluides, élastiques ou non élastiques, Bulletin des sciences par la Société philomathique, 1823, pp. 9-13 (Oeuvres, 2nd series, vol. 2, pp. 300-304)",
    "confidence": "medium"
   },
   {
    "year": "1827",
    "what": "Proved by the tetrahedron argument that the stress on any plane through a point is fixed by the stresses on three perpendicular planes through that point.",
    "work": "De la pression ou tension dans un corps solide, Exercices de mathématiques, vol. 2 (1827), pp. 42-56",
    "confidence": "high"
   },
   {
    "year": "1827",
    "what": "Related the stress components to the applied ('accelerating') forces on a solid or fluid in equilibrium. With inertia added as a force, these become the equations now called the Cauchy momentum equation.",
    "work": "Sur les relations qui existent, dans l'état d'équilibre d'un corps solide ou fluide, entre les pressions ou tensions et les forces accélératrices, Exercices de mathématiques, vol. 2 (1827), from p. 108",
    "confidence": "medium"
   },
   {
    "year": "1828",
    "what": "Gave the stresses in elastic bodies and in a non-elastic 'soft body' (corps mou) as linear functions of the deformation, and the resulting equations of motion. Saint-Venant noted in 1843 that these are the same formulas Poisson gave for fluids and that they lead to Navier's equations.",
    "work": "Sur les équations qui expriment les conditions d'équilibre ou les lois du mouvement intérieur d'un corps solide, élastique ou non élastique, Exercices de mathématiques, vol. 3 (1828), pp. 160-187",
    "confidence": "medium"
   }
  ],
  "notation": [
   "Stress ('pression ou tension') as a force per unit area on any plane, not necessarily perpendicular to it (announced 1822, full treatment 1827). The double-subscript form p_xy common today was used later, for example by Saint-Venant in 1843."
  ],
  "anecdote": "Cauchy wrote that the idea came from Navier's paper on elastic plates of 14 August 1820, in which Navier had treated two kinds of force and taken both as perpendicular to the faces they act on. Cauchy saw that both could be treated as one oblique 'pressure'. While he was working this out, Fresnel told him that he had found a similar theorem in his work on light.",
  "quote": "It came into my mind that these two kinds could be reduced to one, still called tension or pressure, of the same nature as the hydrodynamic pressure exerted by a fluid against the surface of a solid. Yet the new pressure should not be perpendicular upon the faces which undergo it, nor be the same in all directions at a given point.",
  "quote_source": "Cauchy, written in autumn 1822 (Oeuvres, 2nd series, vol. 2, pp. 300-304). English translation by Hans Freudenthal in the Dictionary of Scientific Biography article on Cauchy: https://mathshistory.st-andrews.ac.uk/DSB/Cauchy.pdf",
  "contested": "His death date is 22 May 1857 in the DSB and 23 May 1857 in MacTutor. The stress concept is dated 1822 (announcement, 30 September 1822 per Foce 1995), 1823 (printed summary) or 1827 (full treatment). The stress form of the equilibrium equations appears in vol. 2 of the Exercices (1827, p. 108), while the 1828 vol. 3 paper supplies the stress-deformation relations. Darrigol counts Cauchy's 1823 fluid equations as the second 'birth' of the Navier-Stokes equations.",
  "chapters": [
   "conservation",
   "notation",
   "continuum"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/DSB/Cauchy.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Cauchy/",
   "https://archive.org/details/comptesrendusheb17acad",
   "https://arxiv.org/pdf/2401.13669"
  ]
 },
 {
  "id": "adhemar-barre-de-saint-venant",
  "name": "Adhémar Jean Claude Barré de Saint-Venant",
  "born": "1797",
  "died": "1886",
  "places": "Paris (Service des Ponts et Chaussées)",
  "tags": [
   "theory",
   "engineering",
   "notation"
  ],
  "summary": "Saint-Venant derived the viscous stress law without any assumption about molecular forces (memoir 1834, additions 1837, printed note 1843). His 1843 note writes stresses with the double subscripts p_xx, p_xy that are still used. In 1871 he gave the shallow-water equations that river, flood and tide models still solve.",
  "contributions": [
   {
    "year": "1834 (memoir presented 14 April 1834); 1837 (additions); 1843 (printed note)",
    "what": "Obtained the viscous stresses in a fluid from the assumption that on each face the tangential stress points along the direction of sliding. He said he made no assumption about the size of molecular attractions and repulsions. He identified the tangential stress components with internal friction, and noted that his formulas agree with Cauchy's (1828) and Poisson's and lead to Navier's equations.",
    "work": "Note à joindre au Mémoire sur la dynamique des fluides, présenté le 14 avril 1834, Comptes rendus 17 (1843), pp. 1240-1243",
    "confidence": "high"
   },
   {
    "year": "1871",
    "what": "Equations for unsteady flow in open channels, the shallow-water or Saint-Venant equations, applied to river floods and to tides moving up rivers. A memoir on river tides by the Ponts et Chaussées engineer Partiot prompted the work.",
    "work": "Théorie du mouvement non permanent des eaux, avec application aux crues des rivières et à l'introduction des marées dans leur lit, Comptes rendus 73 (1871), pp. 147-154 (session of 17 July) and pp. 237-240 (24 July)",
    "confidence": "high"
   }
  ],
  "notation": [
   "Double-subscript stress components p_xx, p_xy, ... (Comptes rendus 1843). The first subscript names the face by the coordinate perpendicular to it and the second gives the direction of the component."
  ],
  "anecdote": "The examiners first named for the 1834 memoir were Ampère, Navier and Savary, and all three were dead by 1843. Cauchy, Poncelet and Lamé replaced them, and Saint-Venant wrote the 1843 note to make the 1834 memoir and its 1837 additions easier to examine. A footnote says that where the motion is partly irregular, the stresses must be taken over faces 'd'une certaine étendue' (of a certain extent) to get averages that vary smoothly. It can be read as an early hint at averaging irregular flow, but it is only a remark.",
  "quote": "Ce sont ces composantes tangentielles pxz, pzx, pxy qui constituent ce qu'on appelle le frottement intérieur ou la communication latérale du mouvement dans les fluides.",
  "quote_source": "Saint-Venant, Note à joindre au Mémoire sur la dynamique des fluides, Comptes rendus 17 (1843), p. 1240 (archive.org scan of vol. 17; subscripts printed inline in the scan): https://archive.org/details/comptesrendusheb17acad",
  "contested": "MacTutor says the 1843 paper was the first to properly identify the coefficient of viscosity. That depends on what counts: Navier had already described ε as the resistance of layers sliding over each other in 1822, and Stokes gave the standard continuum account in 1845. The derivation can be dated 1834 (memoir), 1837 (additions) or 1843 (printed note); Darrigol counts it among the five 'births' of the Navier-Stokes equations.",
  "chapters": [
   "conservation",
   "notation",
   "shocks"
  ],
  "sources": [
   "https://archive.org/details/comptesrendusheb17acad",
   "https://archive.org/download/comptes-rendus-hebdomadaires-academie-des-sciences_1871-07-17_73_3/comptes-rendus-hebdomadaires-academie-des-sciences_1871-07-17_73_3_djvu.txt",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Saint-Venant/",
   "https://archive.org/details/mathematicalphys01stokuoft"
  ]
 },
 {
  "id": "gotthilf-hagen",
  "name": "Gotthilf Heinrich Ludwig Hagen",
  "born": "1797",
  "died": "1884",
  "places": "Königsberg, Berlin",
  "tags": [
   "experiment",
   "engineering"
  ],
  "summary": "A Prussian hydraulic engineer whose 1839 experiments on narrow brass tubes found that, for slow flow, the pressure loss grows as the inverse fourth power of the radius. This is half of the Hagen-Poiseuille law, now a standard exact solution for checking viscous solvers.",
  "contributions": [
   {
    "year": "1839",
    "what": "Measured water flow through three narrow brass tubes drawn over steel wires. With the resistance taken as proportional to tube length, a least-squares fit gave the resistance as the radius to the power -4.12; because the probable error was not small, he adopted -4. He also found a strong effect of water temperature.",
    "work": "Ueber die Bewegung des Wassers in engen cylindrischen Röhren, Annalen der Physik und Chemie 46 (1839), pp. 423-442 (Wiley series vol. 122, issue 3)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Hagen studied mathematics and astronomy under Bessel at Königsberg before turning to civil engineering. In the same 1839 paper he noted that his laws held only below a certain speed. Above it, a jet that had looked like a solid glass rod near the tube began to waver and came out in spurts. It is one of the earliest descriptions of the change from laminar to turbulent flow, more than forty years before Reynolds.",
  "quote": "",
  "quote_source": "",
  "contested": "The law is often called simply 'Poiseuille's law', overlooking Hagen's earlier publication; engineering texts use 'Hagen-Poiseuille'. Neither man gave a full theoretical derivation of the parabolic profile; Hagen offered only a qualitative argument for the fourth power. Stokes had the no-slip pipe solution in 1845 but rejected it against turbulent large-pipe data. Theoretical derivations were later given by Wiedemann (1856) and by Neumann and Hagenbach (about 1858-1860, per Sutera and Skalak 1993).",
  "chapters": [
   "continuum",
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1002/andp.18391220304",
   "https://archive.org/details/annalenderphysi102unkngoog",
   "https://en.wikipedia.org/wiki/Gotthilf_Hagen",
   "https://en.wikipedia.org/wiki/Hagen%E2%80%93Poiseuille_equation"
  ]
 },
 {
  "id": "jean-leonard-marie-poiseuille",
  "name": "Jean Léonard Marie Poiseuille",
  "born": "1797",
  "died": "1869",
  "places": "Paris",
  "tags": [
   "experiment"
  ],
  "summary": "A physician who measured water flowing through glass capillaries to understand blood flow in the smallest vessels. In 1840-41 he found the discharge proportional to pressure and to the fourth power of diameter, and inversely proportional to length. Together with Hagen's result it gives the exact pipe solution used to verify viscous solvers.",
  "contributions": [
   {
    "year": "1840 (read 14 and 28 December 1840)",
    "what": "For tubes of very small diameter he found Q = k·P·D⁴/L, with k constant at a given temperature (mean 2495.224 at 10 °C with the pressure measured as a head of mercury). Velocity was therefore proportional to the square of the diameter. He noted that Navier's formula gave the first power instead.",
    "work": "Recherches expérimentales sur le mouvement des liquides dans les tubes de très petits diamètres, Comptes rendus 11 (1840), pp. 961-967 (14 December) and 1041-1048 (28 December)",
    "confidence": "high"
   },
   {
    "year": "1841",
    "what": "Third part of the same study.",
    "work": "Recherches expérimentales sur le mouvement des liquides dans les tubes de très petits diamètres, 3e partie, Comptes rendus 12 (1841)",
    "confidence": "high"
   },
   {
    "year": "1842 (commission report); 1846 (memoir printed)",
    "what": "An Academy commission (Arago, Babinet, Piobert, Regnault) reviewed the full memoir, with Regnault reporting on 26 December 1842. The memoir was later printed among the memoirs of outside scientists.",
    "work": "Mémoires présentés par divers savants à l'Académie royale des sciences, vol. 9 (1846)",
    "confidence": "medium"
   },
   {
    "year": "1828",
    "what": "Doctoral thesis (defended 8 August 1828) in which he measured arterial blood pressure with a mercury manometer connected to an artery.",
    "work": "Recherches sur la force du cœur aortique (Paris, 1828)",
    "confidence": "medium"
   }
  ],
  "notation": [
   "The poise (P), the CGS unit of dynamic viscosity, was named after him later. He did not introduce it."
  ],
  "anecdote": "His stated goal was physiological. He concluded that the capillary vessels of the body are small enough for the laws he had found in glass tubes to apply to them fully. The same note quotes Navier's formula, derived from guesses about molecules, and points out that it has the wrong power of the diameter.",
  "quote": "La formule de M. Navier, déduite par l'analyse, d'hypothèses faites à priori sur l'état des molécules fluides en mouvement, [...] diffère de la précédente en ce qu'elle contient la première puissance du diamètre du tube, au lieu de la seconde.",
  "quote_source": "Poiseuille, Comptes rendus 11 (1840), second part, session of 28 December 1840, p. 1047 (archive.org scan of vol. 11: https://archive.org/details/comptesrendusheb11acad). The formula itself is left out where marked.",
  "contested": "The law is often presented as a theoretical result, though Poiseuille found it empirically. Stokes had the no-slip solution in 1845 but rejected it. Theoretical derivations were later given by Wiedemann (1856) and by Neumann and Hagenbach (about 1858-1860), and Hagenbach was the first to call it 'Poiseuille's law'. Hagen published similar results in 1839.",
  "chapters": [
   "continuum",
   "trust"
  ],
  "sources": [
   "https://archive.org/details/comptesrendusheb11acad",
   "https://archive.org/details/comptesrendusheb12acad",
   "https://fr.wikipedia.org/wiki/Jean-Louis-Marie_Poiseuille",
   "https://en.wikipedia.org/wiki/Hagen%E2%80%93Poiseuille_equation"
  ]
 },
 {
  "id": "henry-darcy",
  "name": "Henry Darcy",
  "born": "1803",
  "died": "1858",
  "places": "Dijon, Paris",
  "tags": [
   "engineering",
   "experiment"
  ],
  "summary": "An engineer of the Ponts et Chaussées who built Dijon's gravity-fed public water supply. His 1855-56 sand-column experiments gave Darcy's law, stating that discharge through a porous bed is proportional to the cross-section and to the head difference divided by the bed's thickness. It is the starting point for groundwater, filtration and porous-media models, including lattice Boltzmann permeability studies.",
  "contributions": [
   {
    "year": "1856 (experiments 1855-56)",
    "what": "Measured water flow through columns of sand. The discharge was proportional to area and to the head loss across the column divided by its thickness, with a coefficient set by the sand (Darcy's law).",
    "work": "Les Fontaines publiques de la ville de Dijon (Paris: Victor Dalmont, 1856), appendix (Note) D on the laws of flow of water through sand",
    "confidence": "high"
   },
   {
    "year": "1857",
    "what": "A large series of pipe-flow experiments showing that friction losses depend on the condition of the pipe wall and on diameter. His work modified the Prony formula; Weisbach's form of the loss formula (1845) and Darcy's data are now joined in the Darcy-Weisbach equation.",
    "work": "Recherches expérimentales relatives au mouvement de l'eau dans les tuyaux (Paris: Imprimerie impériale, 1857)",
    "confidence": "medium"
   }
  ],
  "notation": [
   "Darcy's law, written today as Q = K A Δh / L (1856)",
   "The darcy, a unit of permeability, named after him later"
  ],
  "anecdote": "Darcy's law appears in an appendix to a book about Dijon's public fountains and water supply. Dijon's system, which he had built, carried water about 12.7 km from the Rosoir spring and used sand as a filter.",
  "quote": "",
  "quote_source": "",
  "contested": "His death is given as 2 January 1858 (French Wikipedia) and 3 January 1858 (Simmons 2008). The form of the Darcy-Weisbach equation is Weisbach's; Darcy supplied experimental data on how friction depends on the wall. Darcy's law describes slow seepage only and fails at high pore-scale Reynolds numbers.",
  "chapters": [
   "continuum",
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1029/2001WR000727",
   "https://en.wikipedia.org/wiki/Henry_Darcy",
   "https://fr.wikipedia.org/wiki/Henry_Darcy",
   "https://fr.wikipedia.org/wiki/Loi_de_Darcy"
  ]
 },
 {
  "id": "william-froude",
  "name": "William Froude",
  "born": "1810",
  "died": "1879",
  "places": "Dartington, Torquay (Chelston Cross), died at Simon's Town",
  "tags": [
   "experiment",
   "engineering"
  ],
  "summary": "A naval engineer who built an Admiralty ship-model towing tank at Torquay and showed how to scale model results to full size. He split resistance into skin friction and a wave-making part that scales when speed is in proportion to the square root of length, which is the Froude number.",
  "contributions": [
   {
    "year": "1868",
    "what": "Proposed his 'law of comparison': wave-making resistance of a model and a ship correspond when their speeds are in the ratio of the square roots of their lengths, with resistance then scaling as the cube of length. Skin friction must be scaled separately.",
    "work": "Proposals to the Admiralty on determining ship resistance by model experiment",
    "confidence": "medium"
   },
   {
    "year": "1870-1872",
    "what": "The Admiralty accepted his offer in 1870, and he built and ran a covered experiment tank beside his house at Chelston Cross, Torquay, to tow ship models.",
    "work": "Admiralty Experiment Works, Torquay",
    "confidence": "medium"
   },
   {
    "year": "1874",
    "what": "Measured the frictional resistance of smooth thin boards (one 19 inches broad and 50 feet long) towed at steady speeds. He found that the resistance per unit area falls with distance from the leading edge.",
    "work": "Report to the Lords Commissioners of the Admiralty on Experiments for the Determination of the Frictional Resistance of Water on a Surface under various conditions, performed at Chelston Cross (Torquay) (London: Taylor and Francis, 1874)",
    "confidence": "high"
   }
  ],
  "notation": [
   "Froude number U/√(gL), named after him later. According to Rouse and Ince, as cited by Rott (1990), Moritz Weber introduced the name in 1919."
  ],
  "anecdote": "In 1887 Kelvin used Froude's board experiments in the Torquay tank as evidence that water sheared suddenly becomes turbulent, in one of the two papers where Kelvin first used 'turbulence' as a noun.",
  "quote": "",
  "quote_source": "",
  "contested": "The same speed scaling was used earlier by Ferdinand Reech (1852), and Bélanger (1828) used a related ratio for open channels; in France the number is sometimes called the Reech-Froude number. The tank's size is given as 278 feet long by Kelvin (1887), while Froude's obituary gives 250 feet long, 33 feet wide and 10 feet deep.",
  "chapters": [
   "similarity",
   "trust"
  ],
  "sources": [
   "https://www.gracesguide.co.uk/William_Froude",
   "https://archive.org/details/in.ernet.dli.2015.212310",
   "https://doi.org/10.1146/annurev.fl.22.010190.000245",
   "https://en.wikipedia.org/wiki/Froude_number"
  ]
 },
 {
  "id": "george-gabriel-stokes",
  "name": "George Gabriel Stokes",
  "born": "1819",
  "died": "1903",
  "places": "Skreen (County Sligo), Cambridge",
  "tags": [
   "theory",
   "mathematics",
   "notation"
  ],
  "summary": "Stokes's 1845 continuum derivation fixed the form of the viscous equations, introduced the D/Dt notation and put the no-slip condition on the table. His 1850 pendulum paper gave the drag of a slowly moving sphere, 6πμaU, still used for small particles and droplets. In 1848 he proposed a jump in a sound wave and later withdrew it.",
  "contributions": [
   {
    "year": "1845 (read 14 April 1845); printed 1847 or later",
    "what": "Derived the viscous equations from the rate of deformation of a fluid element rather than from molecular forces. He reduced Poisson's two constants to one by an explicitly stated assumption, compared his result with Navier, Poisson and Cauchy, introduced D/Dt, and tested the no-slip condition against pipe data. The paper is in Part III of vol. 8, which also contains a paper dated 27 February 1847; the volume was completed in 1849.",
    "work": "On the Theories of the Internal Friction of Fluids in Motion, and of the Equilibrium and Motion of Elastic Solids, Transactions of the Cambridge Philosophical Society 8, pp. 287-319",
    "confidence": "high"
   },
   {
    "year": "1848 (November)",
    "what": "Took up Challis's objection to the exact solution for finite plane sound waves. Showed that the wave steepens until its slope becomes infinite, and proposed that the motion continues with a surface of discontinuity, a view he later withdrew in 1883.",
    "work": "On a difficulty in the theory of sound, Philosophical Magazine (3) 33, p. 349",
    "confidence": "high"
   },
   {
    "year": "1849 (read 26 November 1849)",
    "what": "Split an arbitrary vector field into a part that is an exact differential (the gradient of a potential) and a part with zero divergence. This is the decomposition later named after Helmholtz.",
    "work": "On the Dynamical Theory of Diffraction, Transactions of the Cambridge Philosophical Society 9, p. 1",
    "confidence": "high"
   },
   {
    "year": "1850 (read 9 December 1850); printed 1851",
    "what": "Solved slow viscous flow around an oscillating sphere and cylinder. The steady limit gives the drag on a slowly moving sphere, which he wrote as 6πμ'ρaV, where μ' = μ/ρ. He used it to find the terminal speed of cloud droplets, and found that the one-constant theory agreed with Baily's pendulum experiments.",
    "work": "On the Effect of the Internal Friction of Fluids on the Motion of Pendulums, Transactions of the Cambridge Philosophical Society 9, part II, pp. 8-106",
    "confidence": "high"
   }
  ],
  "notation": [
   "D/Dt for the rate of change following a fluid particle (1845)",
   "Dρ/Dt = 0 as the condition for an incompressible fluid (1845)",
   "μ' = μ/ρ, which he called the 'index of friction' (1850); now the kinematic viscosity ν"
  ],
  "anecdote": "In 1845 Stokes worked out the discharge of long pipes and canals with the fluid stuck to the walls. He compared it with the large-pipe experiments of Bossut and Dubuat and found no agreement, and Poisson's slip conditions did no better. The data showed wall friction growing roughly as the square of the speed, a sign of turbulence that nobody could recognise yet. Citing Dubuat's observation that water at the wall is at rest when the mean speed is below about an inch per second, he kept no-slip as possibly correct for very small velocities. Poiseuille's capillary data and his own pendulum work later supported it.",
  "quote": "But having calculated, according to the conditions which I have mentioned, the discharge of long straight circular pipes and rectangular canals, and compared the resulting formulae with some of the experiments of Bossut and Dubuat, I found that the formulae did not at all agree with experiment.",
  "quote_source": "Stokes, On the Theories of the Internal Friction of Fluids in Motion (read 14 April 1845), reprinted in Mathematical and Physical Papers vol. 1 (Cambridge, 1880), p. 103: https://archive.org/details/mathematicalphys01stokuoft",
  "contested": "The name 'Navier-Stokes' compresses five independent derivations (Navier, Cauchy, Poisson, Saint-Venant and Stokes). The 'Stokes hypothesis' of zero bulk viscosity is a stated assumption rather than a derived result. Stokes had the 'Helmholtz decomposition' in 1849, nine years before Helmholtz. The drag law 6πμaU holds only when inertia is negligible, at Reynolds numbers well below 1. His 1848 discontinuous solution was correct in spirit, though he withdrew it in 1883 after an energy objection from Rayleigh and Kelvin.",
  "chapters": [
   "conservation",
   "notation",
   "viewpoints",
   "similarity",
   "shocks",
   "stable-fluids"
  ],
  "sources": [
   "https://archive.org/details/mathematicalphys01stokuoft",
   "https://archive.org/details/mathphyspapers02stokrich",
   "https://archive.org/details/MathematicalAndPhysicalPapersIii",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Stokes/"
  ]
 },
 {
  "id": "william-john-macquorn-rankine",
  "name": "William John Macquorn Rankine",
  "born": "1820",
  "died": "1872",
  "places": "Edinburgh, Glasgow",
  "tags": [
   "theory",
   "engineering"
  ],
  "summary": "An engineer and physicist who in 1869-70 wrote the conservation conditions across a steady wave of 'sudden disturbance' (a shock) in a gas, taking heat into account. This is the first half of the Rankine-Hugoniot jump conditions, which shock-capturing schemes must reproduce.",
  "contributions": [
   {
    "year": "1869 (read 16 December 1869); printed 1870",
    "what": "For a wave that keeps its shape, the mass flux through it (his 'mass-velocity') is constant. Combined with the momentum balance this gives p₂ - p₁ = m²(S₁ - S₂), a straight line in the pressure-volume plane. He argued that such a wave needs heat conduction inside it, so it cannot be adiabatic throughout, and treated 'waves of sudden disturbance' as a limiting case.",
    "work": "On the Thermodynamic Theory of Waves of Finite Longitudinal Disturbance, Philosophical Transactions of the Royal Society 160 (1870), pp. 277-288",
    "confidence": "high"
   },
   {
    "year": "1870 (note dated 1 August 1870)",
    "what": "Added a note, crediting Thomson, that a sudden rarefaction wave is unstable, so the only physically possible sudden wave is a compression.",
    "work": "Same paper, added note",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Mass-velocity' m: the mass passing through unit area of the wave per unit time (1870)"
  ],
  "anecdote": "Rankine's section on previous investigations cites Poisson, Stokes (1848), Airy (1849) and Earnshaw (1860), but not Riemann's 1860 Göttingen paper. The British and German lines of shock theory developed without each other.",
  "quote": "Sir William Thomson has pointed out to the author, that a wave of sudden rarefaction, though mathematically possible, is an unstable condition of motion; any deviation from absolute suddenness tending to make the disturbance become more and more gradual. Hence the only wave of sudden disturbance whose permanency of type is physically possible, is one of sudden compression",
  "quote_source": "Rankine, note added 1 August 1870 to 'On the Thermodynamic Theory of Waves of Finite Longitudinal Disturbance', reprinted in Miscellaneous Scientific Papers (1881): https://archive.org/details/miscellaneoussci00rank",
  "contested": "Textbooks often present 'Rankine-Hugoniot' as one joint result. The two men worked independently, seventeen years apart, and argued differently: Rankine relied on heat conduction inside the wave. The ruling-out of rarefaction shocks came before any entropy argument; it was put as an instability argument credited to Thomson.",
  "chapters": [
   "shocks",
   "conservation"
  ],
  "sources": [
   "https://archive.org/details/miscellaneoussci00rank",
   "https://doi.org/10.1098/rstl.1870.0015",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Rankine/"
  ]
 },
 {
  "id": "hermann-von-helmholtz",
  "name": "Hermann von Helmholtz",
  "born": "1821",
  "died": "1894",
  "places": "Potsdam, Königsberg, Bonn, Heidelberg, Berlin",
  "tags": [
   "theory",
   "mathematics"
  ],
  "summary": "Helmholtz's 1858 vortex paper showed that in an ideal fluid vortex lines move with the fluid and cannot begin or end inside it. This is the basis of vortex methods and of thinking about flow through vorticity. His 1868 paper on discontinuous motions brought in free shear layers, whose instability now carries his name together with Kelvin's.",
  "contributions": [
   {
    "year": "1858",
    "what": "Split the local motion of a fluid element into translation, rotation and deformation. Proved that in an ideal fluid under conservative forces vortex lines and tubes move with the fluid, keep their strength, and either close on themselves or end at a boundary. Tait translated the paper into English in 1867 (Philosophical Magazine 33, supplement).",
    "work": "Über Integrale der hydrodynamischen Gleichungen, welche den Wirbelbewegungen entsprechen, Journal für die reine und angewandte Mathematik 55 (1858), pp. 25-55",
    "confidence": "high"
   },
   {
    "year": "1860",
    "what": "With Gustav von Piotrowski, oscillation experiments with a liquid-filled sphere to measure the friction of liquids, including whether the liquid slips at the wall.",
    "work": "Ueber Reibung tropfbarer Flüssigkeiten, Sitzungsberichte der Akademie der Wissenschaften Wien 40 (1860), pp. 607-658",
    "confidence": "medium"
   },
   {
    "year": "1868",
    "what": "Argued that flow leaving a sharp edge forms a jet bounded by a surface across which the velocity jumps (a vortex sheet), rather than following smooth potential flow, and that such surfaces are unstable. An English translation appeared in the Philosophical Magazine the same year.",
    "work": "Über discontinuirliche Flüssigkeitsbewegungen, Monatsberichte der Königlich Preussischen Akademie der Wissenschaften zu Berlin, 1868, pp. 215-228",
    "confidence": "high"
   },
   {
    "year": "1873 (printed 1874)",
    "what": "A similarity theorem for geometrically similar flows that include friction, applied to the problem of steering balloons (airships). It is an early statement of the scaling rules behind model testing.",
    "work": "Über ein Theorem, geometrisch ähnliche Bewegungen flüssiger Körper betreffend, nebst Anwendung auf das Problem, Luftballons zu lenken, Monatsberichte Berlin 1873 (printed 1874), pp. 501-514",
    "confidence": "high"
   }
  ],
  "notation": [
   "Vortex lines, vortex filaments and vortex tubes as tools for describing vorticity (1858)",
   "'Helmholtz decomposition' of a vector field into gradient and divergence-free parts. The name came later, and Stokes had it in 1849."
  ],
  "anecdote": "Tait translated the 1858 paper in 1867 and demonstrated its results with smoke rings fired from boxes. Kelvin saw the display in Tait's Edinburgh lecture room, and in February 1867 he proposed that atoms are vortex rings in a perfect fluid.",
  "quote": "",
  "quote_source": "",
  "contested": "Stokes had the gradient plus divergence-free decomposition in 1849. Helmholtz's vortex theorems assume an inviscid fluid; with viscosity, vortex lines diffuse and reconnect, which is why vortex-particle methods need an extra diffusion step. The name 'Kelvin-Helmholtz instability' joins Helmholtz's 1868 remark that discontinuity surfaces are unstable with Kelvin's 1871 calculation for wind over water.",
  "chapters": [
   "viewpoints",
   "pressure",
   "stable-fluids",
   "turbulence",
   "similarity"
  ],
  "sources": [
   "https://doi.org/10.1515/crll.1858.55.25",
   "https://de.wikisource.org/wiki/Hermann_von_Helmholtz",
   "https://archive.org/details/in.ernet.dli.2015.212310",
   "https://archive.org/details/mathphyspapers02stokrich"
  ]
 },
 {
  "id": "william-thomson-kelvin",
  "name": "William Thomson, Lord Kelvin",
  "born": "1824",
  "died": "1907",
  "places": "Belfast, Glasgow",
  "tags": [
   "theory",
   "turbulence",
   "mathematics"
  ],
  "summary": "Kelvin gave the circulation theorem (read 1867, printed 1868-69) that underlies vortex methods and circulation-preserving schemes. He computed the instability of wind over water (1871), now called Kelvin-Helmholtz. According to Schmitt (2017), he introduced 'turbulence' as a fluid-mechanics noun in 1887.",
  "contributions": [
   {
    "year": "1867 (read 29 April 1867); recast 28 August-12 November 1868; printed 1868/1869",
    "what": "Defined the 'flow' along a line as the line integral of the tangential velocity, and the 'circulation' as the flow around a closed line. Proved that in an ideal fluid the circulation around a closed line moving with the fluid stays constant.",
    "work": "On Vortex Motion, Transactions of the Royal Society of Edinburgh 25, pp. 217-260 (Cambridge University Press dates the issue 1868; Kelvin's collected papers give 1869)",
    "confidence": "high"
   },
   {
    "year": "1867 (read 18 February 1867)",
    "what": "Proposed that atoms are vortex rings in a perfect fluid filling space, inspired by Helmholtz's theorems and Tait's smoke-ring demonstrations.",
    "work": "On Vortex Atoms, Proceedings of the Royal Society of Edinburgh 6, pp. 94-105; reprinted in Philosophical Magazine 34 (1867), pp. 15-24",
    "confidence": "high"
   },
   {
    "year": "1871 (letter to Tait, 16 August 1871; printed November 1871)",
    "what": "Showed that a flat water surface under wind becomes unstable once the wind speed passes a threshold. This is the Kelvin-Helmholtz instability.",
    "work": "Hydrokinetic solutions and observations, Part III, 'The influence of wind on waves in water supposed frictionless', Philosophical Magazine 42 (1871), pp. 362-377",
    "confidence": "high"
   },
   {
    "year": "1887",
    "what": "Used 'turbulent' and 'turbulence' for irregular eddying flow. He cited Froude's towed-board experiments in the Torquay tank as evidence that water sheared suddenly between planes becomes turbulent at first. In the October paper he tried to build, from vortex motion in an inviscid fluid, a medium that would transmit waves of laminar (shearing) motion, as the ether was thought to transmit light.",
    "work": "Broad river flowing down an inclined plane bed, Phil. Mag. 24 (September 1887), pp. 272-278; On the propagation of laminar motion through a turbulently moving inviscid liquid, Phil. Mag. 24 (October 1887), pp. 342-353",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Circulation' and 'flow' along a line (On Vortex Motion, read 1867, printed 1868-69)",
   "'Turbulence' as a fluid-mechanics noun (Phil. Mag., September and October 1887)"
  ],
  "anecdote": "Kelvin wrote that a display of smoke rings in Tait's Edinburgh lecture room had 'diminished by one' the assumptions needed to explain matter as vortex atoms. He saw pairs of rings bounce obliquely off each other, 'shaking violently from the effects of the shock.' The atom theory was abandoned, but the circulation theorem he proved for it is the base of every vortex method.",
  "quote": "The circulation in any closed line moving with the fluid, remains constant through all time.",
  "quote_source": "Kelvin (William Thomson), On Vortex Motion, Trans. Roy. Soc. Edinburgh 25 (read 29 April 1867), as reprinted in Mathematical and Physical Papers vol. 4 (1910): https://archive.org/details/in.ernet.dli.2015.212310",
  "contested": "The circulation theorem is dated 1867, 1868 or 1869 depending on whether you count the reading, the revision or the printing. Much of its content is equivalent to Helmholtz's 1858 vortex theorems. Schmitt (2017) says Thomson introduced the noun 'turbulence' in 1887, that the main researchers of the time did not take it up, and that the shift came around 1906-1908 (Lamb's 1906 Hydrodynamics, Lanchester), with the term standard by the 1920s. Reynolds in 1883 spoke of 'sinuous' motion.",
  "chapters": [
   "viewpoints",
   "turbulence",
   "conservation"
  ],
  "sources": [
   "https://archive.org/details/in.ernet.dli.2015.212310",
   "https://doi.org/10.1017/S0080456800028179",
   "https://doi.org/10.1016/j.crme.2017.06.003",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Thomson/"
  ]
 },
 {
  "id": "bernhard-riemann",
  "name": "Bernhard Riemann",
  "born": "1826",
  "died": "1866",
  "places": "Göttingen",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "Riemann's 1859-60 paper on finite-amplitude sound waves introduced the quantities now called Riemann invariants, which stay constant along characteristic curves. He also worked out what happens from an arbitrary initial jump in the state of the gas. That initial-jump problem, the Riemann problem, is what Godunov-type finite-volume schemes solve at every cell face.",
  "contributions": [
   {
    "year": "1859 (notice); 1860 (paper)",
    "what": "Taking the pressure as a function of density alone, defined two quantities, f(ρ) ± u, that stay constant along the curves dx = (u ± √φ'(ρ)) dt. He showed that compressive parts of a wave steepen into a jump, which he called a 'Verdichtungsstoss' (compression shock), and gave jump relations from mass and momentum. Section 6 treats an arbitrary initial discontinuity, from which two shocks, one forward or backward shock, or none can emerge.",
    "work": "Ueber die Fortpflanzung ebener Luftwellen von endlicher Schwingungsweite, Abhandlungen der Königlichen Gesellschaft der Wissenschaften zu Göttingen 8 (1860); notice in Göttinger Nachrichten 1859, Nr. 19",
    "confidence": "high"
   }
  ],
  "notation": [
   "Riemann invariants r and s, with f(ρ) + u = 2r and f(ρ) - u = 2s (1860)",
   "'Verdichtungsstoss' (compression shock) for the jump (1860)"
  ],
  "anecdote": "Riemann presented the work as mathematics: a contribution to the theory of nonlinear partial differential equations, not a source of results for experimenters. His notice also says the work should settle the questions argued over by Challis, Airy and Stokes in the Philosophical Magazine, as far as Stokes had not already done so.",
  "quote": "Diese Untersuchung macht nicht darauf Anspruch, der experimentellen Forschung nützliche Ergebnisse zu liefern; der Verfasser wünscht sie nur als einen Beitrag zur Theorie der nicht linearen partiellen Differentialgleichungen betrachtet zu sehen.",
  "quote_source": "Riemann, notice (Anzeige) of 'Ueber die Fortpflanzung ebener Luftwellen von endlicher Schwingungsweite', Göttinger Nachrichten 1859, Nr. 19 (Trinity College Dublin transcription by D. R. Wilkins): https://www.maths.tcd.ie/pub/HistMath/People/Riemann/Welle/",
  "contested": "Riemann argued that heat exchange could be neglected and took the pressure to depend only on density. His jump conditions therefore conserve mass and momentum but not energy, and give the wrong shock for a real gas. The energy-conserving conditions came from Rankine (1870) and Hugoniot (1887-89). The name 'Riemann problem' for the initial-jump problem is a later label tied to its role in numerical schemes.",
  "chapters": [
   "shocks",
   "advection",
   "discretization"
  ],
  "sources": [
   "https://www.maths.tcd.ie/pub/HistMath/People/Riemann/Welle/",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Riemann/"
  ]
 },
 {
  "id": "ernst-mach",
  "name": "Ernst Mach (with Peter Salcher)",
  "born": "1838",
  "died": "1916",
  "places": "Graz, Prague, Vienna; experiments with Salcher at the Naval Academy in Fiume (Rijeka)",
  "tags": [
   "experiment"
  ],
  "summary": "Mach and Peter Salcher (1848-1928) published the first photographs of the shock waves around a supersonic bullet (experiments 1886, paper 1887). They showed a conical head wave whose angle depends on the bullet's speed relative to the speed of sound. That speed ratio is now called the Mach number.",
  "contributions": [
   {
    "year": "1886 (experiments); 1887 (published)",
    "what": "Spark-lit photographs of bullets in flight that made the head wave and wake visible and confirmed the conical shock expected for speeds above the speed of sound.",
    "work": "E. Mach and P. Salcher, Photographische Fixirung der durch Projectile in der Luft eingeleiteten Vorgänge, Sitzungsberichte der Kaiserlichen Akademie der Wissenschaften Wien, Math.-Naturwiss. Classe 95, Abt. II (1887), pp. 764-780",
    "confidence": "high"
   }
  ],
  "notation": [
   "Mach number U/c. Jakob Ackeret proposed the name in 1929 (Schweizerische Bauzeitung 94); Mach did not use it.",
   "Mach angle, the half-angle of the shock cone, with sin α = c/U"
  ],
  "anecdote": "Salcher, professor of physics and mechanics at the Austro-Hungarian Naval Academy in Fiume since 1875, ran the shooting experiments in 1886 at Mach's request, with his assistant Riegler. Mach and Salcher published the results jointly.",
  "quote": "",
  "quote_source": "",
  "contested": "Popular accounts often credit the photographs to Mach alone, although Salcher did much of the experimental work in Fiume. Mach did not name the Mach number; Ackeret proposed it in 1929 (see Rott 1985). Mach's birthplace is given as Chrlice (now part of Brno), with some sources giving Tuřany.",
  "chapters": [
   "shocks",
   "similarity"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Ernst_Mach",
   "https://en.wikipedia.org/wiki/Peter_Salcher",
   "https://en.wikipedia.org/wiki/Mach_number",
   "https://doi.org/10.1146/annurev.fl.17.010185.000245"
  ]
 },
 {
  "id": "clemens-herschel",
  "name": "Clemens Herschel",
  "born": "1842",
  "died": "1930",
  "places": "Vienna (born), Davenport (Iowa), Holyoke (Massachusetts), New Jersey, New York; died Glen Ridge, New Jersey",
  "tags": [
   "engineering",
   "experiment"
  ],
  "summary": "Herschel developed the Venturi flowmeter and named it after Venturi. It turned Venturi's 1797 observation, that pressure drops where a tube narrows, into a standard measuring instrument. It is also a clean benchmark for a solver's pressure-velocity coupling.",
  "contributions": [
   {
    "year": "1887 (filed 12 December 1887); 1888 (granted 17 April 1888)",
    "what": "Patented a meter that finds the flow rate in a pipe from the pressure difference between the full pipe and the narrowest section of a converging-diverging tube. The patent states a discharge coefficient 'nearly equal to one'.",
    "work": "US Patent 381,373, 'Apparatus for measuring the quantity of water flowing through a pipe'",
    "confidence": "high"
   },
   {
    "year": "1880s (Treccani: 1882; English Wikipedia: first tested 1886)",
    "what": "Developed the meter while working for the Holyoke Water Power Company (about 1880-1889). There he designed the Holyoke Testing Flume, a turbine-testing facility. English Wikipedia describes him as its director.",
    "work": "Holyoke Testing Flume",
    "confidence": "medium"
   },
   {
    "year": "1897",
    "what": "Published measurements of friction losses in large riveted metal pipes.",
    "work": "115 Experiments on the Carrying Capacity of Large, Riveted, Metal Conduits (New York: Wiley, 1897)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Venturi meter' for the instrument; his 1888 patent speaks of 'a diverging ajutage or Venturi tube', using 'Venturi tube' as an already familiar term"
  ],
  "anecdote": "In a letter dated 5 June 1888 to Dr Unwin, Herschel described testing a one-inch meter under a head of 210 feet. He wrote from the hydraulic engineer's office of the Holyoke Water Power Company. He declared himself convinced that it embodied a new principle for gauging fluids, including gases and steam. He also suggested making the meter trumpet-shaped in both directions, so that it could measure flow either way. The letter was reproduced in Nature in 1935 (vol. 136, p. 254).",
  "quote": "My invention is based upon the well-known property of liquids when flowing through a diverging ajutage or Venturi tube to exercise a sucking action through an aperture in the pipe or tube located at the point of the smallest cross-section of the latter",
  "quote_source": "C. Herschel, US Patent 381,373 (filed 12 December 1887, granted 17 April 1888): https://patents.google.com/patent/US381373A/en",
  "contested": "Dates for the Venturi meter differ, and they refer to different stages of the work:\n- Treccani says Herschel built it in 1882.\n- English Wikipedia says he first tested the concept in 1886.\n- The patent was filed in December 1887 and granted in April 1888.\nThe name honours Venturi's 1797 experiments; Venturi himself built no meter. The patent treats 'Venturi tube' as a known term, so Herschel named the meter rather than coining the tube's name. He was born in Vienna and came to the United States as a child in 1850, settling in Davenport, Iowa.",
  "chapters": [
   "conservation",
   "trust"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Clemens_Herschel",
   "https://patents.google.com/patent/US381373A/en",
   "https://www.treccani.it/enciclopedia/giovanni-battista-venturi_(Dizionario-Biografico)/"
  ]
 },
 {
  "id": "osborne-reynolds",
  "name": "Osborne Reynolds",
  "born": "1842",
  "died": "1912",
  "places": "Born Belfast (23 Aug 1842); professor of engineering at Owens College, Manchester, 1868–1905 (the first engineering chair in Manchester); died Watchet, Somerset (21 Feb 1912)",
  "tags": [
   "experiment",
   "theory",
   "turbulence",
   "engineering"
  ],
  "summary": "His 1883 dye-streak experiments showed that whether pipe flow stays orderly or breaks into eddies depends on one combination of speed, diameter and viscosity, which we now call the Reynolds number. In 1895 he split the velocity into a mean part and a fluctuating part. That gave the averaged equations and the 'Reynolds stresses' that every RANS turbulence model still has to close.",
  "contributions": [
   {
    "year": "1883",
    "what": "Colour-band (dye) experiments in glass tubes of nearly 1, 1/2 and 1/4 inch bore, about 4 ft 6 in long with trumpet mouthpieces, begun early in 1880. He found that the critical velocity varies inversely with diameter and falls as the temperature rises (that is, as viscosity falls). He identified an upper critical value, where steady flow breaks down in a very still tank, and a lower one, where eddies die out. Below the lower value the pressure drop goes as the velocity; above it, as the 1.723 power of the velocity (p. 975). Received and read 15 March 1883; printed in the 1883 volume.",
    "work": "An experimental investigation of the circumstances which determine whether the motion of water shall be direct or sinuous, and of the law of resistance in parallel channels, Phil. Trans. R. Soc. 174, 935–982 (1883)",
    "confidence": "high"
   },
   {
    "year": "1883",
    "what": "Reynolds gave his thresholds as constants in a velocity formula (for example B = 43.79 in metre-second units for the upper critical velocity), not as one dimensionless number. Converted to modern terms (Rott 1990), the upper value is about 12,830 (Van Dyke rounds it to 13,000) and the lower about 2,020.",
    "work": "Phil. Trans. R. Soc. 174 (1883); conversion in N. Rott, Note on the history of the Reynolds number, Annu. Rev. Fluid Mech. 22, 1–12 (1990)",
    "confidence": "high"
   },
   {
    "year": "1895",
    "what": "Split the velocity into mean and fluctuating parts (first with a mass-weighted average, then the usual volume average, since water has constant density). Derived the averaged momentum equations with extra stress terms, now called the Reynolds stresses, and an energy budget for the fluctuations. He wrote the flow parameter explicitly as K, based on pipe diameter, and quoted a critical value for pipes 'between 1900 and 2000'. His energy argument gave a lower bound of 517 for flow between parallel plates. Read to the Royal Society 24 May 1894; printed 1895.",
    "work": "On the dynamical theory of incompressible viscous fluids and the determination of the criterion, Phil. Trans. R. Soc. A 186, 123–164 (1895)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Direct' and 'sinuous' motion (1883) for what are now called laminar and turbulent flow. The word 'turbulence' does not appear in his 1883 paper, and neither he (1895) nor Boussinesq (1877) used it; it entered fluid mechanics through two papers by William Thomson (Kelvin) in 1887 (Schmitt 2023)",
   "K for the flow parameter, later called the Reynolds number, in his 1895 paper (Rott 1990)",
   "Reynolds averaging and Reynolds stresses: later names for his 1895 decomposition"
  ],
  "anecdote": "Lord Rayleigh and G. G. Stokes refereed the 1883 paper favourably, and their reports survive in the Royal Society archive. The 1894 paper had a harder time. Stokes found it very obscure, and Horace Lamb backed publication on the grounds that it contained the views of its author (Launder 2015). Reynolds' original apparatus was still in existence at the University of Manchester when Rott wrote in 1990. Van Dyke's Album of Fluid Motion notes that modern traffic in the streets of Manchester has made the critical Reynolds number lower than the 13,000 Reynolds found.",
  "quote": "the colour band would all at once mix up with the surrounding water, and fill the rest of the tube with a mass of coloured water",
  "quote_source": "O. Reynolds, Phil. Trans. R. Soc. 174 (1883), p. 942, https://royalsocietypublishing.org/doi/10.1098/rstl.1883.0029",
  "contested": "(1) Reynolds did not name the number. Sommerfeld called it the 'Reynolds number' in 1908 (Rott 1990). (2) He was not the first to notice the similarity: Rayleigh (1913) credited Stokes, who noted the similarity properties of the viscous equations in 1850 (Rott 1990). G. Hagen had described transition in pipes in 1854, using sawdust to make the flow visible. (3) The textbook 'critical Re = 2300' comes from later pipe measurements; Reynolds gave about 2,000 (lower) and about 12,830 (upper), and stressed that the upper value depends on how disturbed the inflow is. V. W. Ekman later used Reynolds' own apparatus with a smoothed inlet and kept the flow laminar up to about 44,000 (Ekman 1910, cited by Rott). (4) The turbulent-resistance exponent is sometimes printed as 1.722, though the original paper (p. 975) and Rott both give 1.723.",
  "chapters": [
   "similarity",
   "turbulence",
   "notation"
  ],
  "sources": [
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
   "https://pmc.ncbi.nlm.nih.gov/articles/PMC4360085",
   "https://www.damtp.cam.ac.uk/user/tong/fluids/Reynolds.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Reynolds/"
  ]
 },
 {
  "id": "joseph-boussinesq",
  "name": "Joseph Boussinesq",
  "born": "1842",
  "died": "1929",
  "places": "Born Saint-André-de-Sangonis, Hérault (13 Mar 1842); Lille (professor of differential and integral calculus from 1873); Paris (Académie des Sciences 1886; Faculty of Science, retired 1918); died Paris (19 Feb 1929)",
  "tags": [
   "theory",
   "turbulence",
   "mathematics"
  ],
  "summary": "He proposed that turbulent agitation acts on the mean flow like an extra, flow-dependent viscosity. This 'eddy viscosity' idea, presented in 1872 and printed in 1877, is behind most RANS turbulence models. His name is also attached to the buoyancy approximation used in nearly every incompressible convection solver.",
  "contributions": [
   {
    "year": "1877",
    "what": "Introduced a turbulent (eddy) viscosity coefficient linking the turbulent stresses to mean velocity gradients, and used local averaging about twenty years before Reynolds (Schmitt 2007). Schmitt, who consulted the original, reports that the memoir was presented on 28 October 1872 and printed in 1877.",
    "work": "Essai sur la théorie des eaux courantes, Mémoires présentés par divers savants à l'Académie des Sciences, vol. 23 (1877)",
    "confidence": "high"
   },
   {
    "year": "1872",
    "what": "Date the 'Essai' memoir was presented to the Académie (28 October 1872), as reported from the original by F. G. Schmitt.",
    "work": "F. G. Schmitt, slides 'Boussinesq, Reynolds, Kelvin et la turbulence' (SFP 2023)",
    "confidence": "high"
   },
   {
    "year": "1903",
    "what": "Set out when density variations in heat-driven flows of heavy fluids can be neglected except where they multiply gravity g. This is the Boussinesq approximation.",
    "work": "Théorie analytique de la chaleur, vol. II (Gauthier-Villars, Paris, 1903)",
    "confidence": "high"
   }
  ],
  "notation": [
   "A turbulent 'viscosity' coefficient (1877). He described the motion as 'mouvements tumultueux' and 'agitation tourbillonnaire', not 'turbulence' (Schmitt 2023)",
   "'Boussinesq approximation': an eponym. Rayleigh (1916) based his convection analysis on 'equations given by Boussinesq'"
  ],
  "anecdote": "The eddy-viscosity memoir waited about five years to be printed (presented 1872, published 1877). Rayleigh's 1916 convection paper openly built on Boussinesq's equations.",
  "quote": "The calculations which follow are based upon equations given by Boussinesq, who has applied them to one or two particular problems.",
  "quote_source": "Lord Rayleigh, On convection currents in a horizontal layer of fluid, when the higher temperature is on the under side, Phil. Mag. (6) 32, 529–546 (1916), https://zenodo.org/records/1508106",
  "contested": "(1) Priority for the buoyancy approximation: A. Oberbeck treated convection in 1879 (Ann. Phys. Chem. N.F. 7, 271–292), so the name 'Oberbeck–Boussinesq' is also used, though the two formulations differ. (2) Zeytounian (2003) writes that Rayleigh named it the 'Boussinesq approximation' in 1916. Rayleigh's 1916 text credits 'equations given by Boussinesq' and describes the neglect of density variations 'except in so far as they modify the action of gravity', but does not use the phrase 'Boussinesq approximation'. (3) Validity: the hypothesis assumes the Reynolds stress lines up with the mean strain rate. Schmitt (2007) tested this directly on several data sets and found it is almost never satisfied, even though it is the basis of most RANS models.",
  "chapters": [
   "turbulence",
   "conservation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Boussinesq/",
   "https://comptes-rendus.academie-sciences.fr/mecanique/articles/10.1016/j.crme.2007.08.004/",
   "https://comptes-rendus.academie-sciences.fr/mecanique/articles/10.1016/S1631-0721(03)00120-7",
   "https://indico.ijclab.in2p3.fr/event/8021/contributions/29829/attachments/21241/29865/Schmitt-SFP-2023.pdf"
  ]
 },
 {
  "id": "lord-rayleigh",
  "name": "John William Strutt, 3rd Baron Rayleigh",
  "born": "1842",
  "died": "1919",
  "places": "Born Langford Grove, near Maldon, Essex (12 Nov 1842); Cambridge (Cavendish Professor 1879–84); Royal Institution (professor of natural philosophy from 1887); worked mostly at his home laboratory at Terling Place, Essex, where he died (30 Jun 1919)",
  "tags": [
   "theory",
   "mathematics",
   "experiment"
  ],
  "summary": "Rayleigh laid much of the groundwork of hydrodynamic stability: jets, inviscid shear flows, layers of variable density and convection. He also argued hard for dimensional reasoning, which he called 'similitude'. His 1916 convection analysis gave the critical value now written Ra = 27π⁴/4 ≈ 657.5 for a layer with free boundaries.",
  "contributions": [
   {
    "year": "1878",
    "what": "Capillary instability of liquid jets. The issue of vol. 10 is dated November 1878; Rayleigh's own Scientific Papers date the paper 1879.",
    "work": "On the instability of jets, Proc. London Math. Soc. 10, 4–13",
    "confidence": "high"
   },
   {
    "year": "1880",
    "what": "Inflection-point theorem: an inviscid parallel shear flow can be unstable only if its velocity profile has an inflection point. Printed in vol. 11 (first issue dated November 1879); usually cited as 1880. The journal gives pp. 57–72; the Scientific Papers reprint gives 57–70.",
    "work": "On the stability, or instability, of certain fluid motions, Proc. London Math. Soc. 11, 57–72",
    "confidence": "high"
   },
   {
    "year": "1883",
    "what": "Equilibrium of a heavy fluid of variable density. This is the problem later extended by G. I. Taylor (1950) and now called Rayleigh–Taylor instability. Printed in vol. 14 (1882–83); usually cited as 1883.",
    "work": "Investigation of the character of the equilibrium of an incompressible heavy fluid of variable density, Proc. London Math. Soc. 14, 170–177",
    "confidence": "high"
   },
   {
    "year": "1915",
    "what": "Short polemic urging physicists and engineers to use dimensional reasoning (similitude). It drew replies in Nature from Riabouchinsky and Buckingham, among others.",
    "work": "The principle of similitude, Nature 95, 66–68 (March 1915)",
    "confidence": "high"
   },
   {
    "year": "1916",
    "what": "Linear stability of a fluid layer heated from below, written to explain Bénard's experiments and using Boussinesq's equations. With free boundaries there is no instability unless (ρ2−ρ1)/ρ1 > 27π⁴κν/(4gh³), h being the layer depth (Rayleigh writes ζ).",
    "work": "On convection currents in a horizontal layer of fluid, when the higher temperature is on the under side, Phil. Mag. (6) 32, 529–546 (Dec 1916)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Rayleigh number': the name came later. Jeffreys used the parameter in 1926 and 1928, and Wesfreid (2017) cites O. G. Sutton (Proc. R. Soc. A 204, 1950) for the name 'Rayleigh number'",
   "'Principle of similitude' (his term for dimensional analysis), Nature 1915"
  ],
  "anecdote": "Rayleigh refereed Reynolds' 1883 pipe-flow paper, and his favourable report (dated 30 March 1883) survives in the Royal Society archive. His 1916 convection paper came out in the middle of the war. Bénard later wrote that it escaped him at first and that he read it only after Rayleigh's death, in 1920 (Wesfreid 2017).",
  "quote": "I have often been impressed by the scanty attention paid even by original workers in physics to the great principle of similitude.",
  "quote_source": "Lord Rayleigh, The principle of similitude, Nature 95, 66–68 (March 1915), reprinted in Scientific Papers vol. 6, art. 392, p. 300, https://archive.org/details/scientificpapers06rayliala",
  "contested": "'Rayleigh–Bénard convection' pairs a theory with experiments that were mostly measuring something else. Bénard used thin layers (about 1 mm) with a free surface, and there the cells are driven mainly by surface-tension gradients (Block, Nature 178, 650, 1956; Pearson, J. Fluid Mech. 4, 489, 1958). Rayleigh's buoyancy theory applies to deeper layers. Rayleigh's free–free boundaries were also an idealisation: Jeffreys (1926, 1928) found higher critical values with a rigid lower boundary. Rayleigh received the 1904 Nobel Prize in Physics for the discovery of argon, not for fluid dynamics. Date note: the jets paper is cited as both 1878 (journal issue) and 1879 (Rayleigh's collected papers).",
  "chapters": [
   "similarity",
   "turbulence",
   "notation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Rayleigh/",
   "https://archive.org/details/scientificpapers06rayliala",
   "https://zenodo.org/records/1508106",
   "https://arxiv.org/abs/1712.07039"
  ]
 },
 {
  "id": "nikolai-zhukovsky",
  "name": "Nikolai Egorovich Zhukovsky (Joukowski)",
  "born": "1847",
  "died": "1921",
  "places": "Born Orekhovo, Vladimir province (17 Jan 1847 New Style; 5 Jan Old Style); Moscow Technical School (taught from 1872); Moscow University (doctorate 1882; head of the department of mechanics from 1886); experiments at the Aerodynamics Institute at Kuchino near Moscow; first head of the Central Aerohydrodynamic Institute (TsAGI, 1918); died Moscow (17 Mar 1921)",
  "tags": [
   "theory",
   "experiment",
   "engineering"
  ],
  "summary": "In 1906 he stated the general theorem that the lift per unit span on a body in steady two-dimensional flow equals density × free-stream speed × circulation, acting at right angles to the stream. His conformal-map 'Joukowski aerofoils' became the classic exact test shapes for panel and potential-flow codes.",
  "contributions": [
   {
    "year": "1906",
    "what": "Introduced the bound-vortex theory of lift, showing that a lifting body can be replaced by a bound vortex with lift equal to density × circulation × speed (DSB). MacTutor notes two 1906 papers on lift.",
    "work": "On annexed (bound) vortices [О присоединённых вихрях] (1906, in Russian)",
    "confidence": "medium"
   },
   {
    "year": "1906",
    "what": "Confirmed the theorem with experiments on rotating oblong disks at the Aerodynamics Institute at Kuchino, near Moscow (1905–06).",
    "work": "Dictionary of Scientific Biography, 'Zhukovsky'",
    "confidence": "high"
   },
   {
    "year": "1910",
    "what": "The Zhukovsky–Chaplygin postulate fixes the circulation around a wing by the trailing-edge condition, which made it possible to compute lift and design wing profiles. His conformal mapping (the Joukowski transformation) generates the Joukowski aerofoils.",
    "work": "Dictionary of Scientific Biography, 'Zhukovsky'; MacTutor",
    "confidence": "medium"
   },
   {
    "year": "1918",
    "what": "Organised the Central Aerohydrodynamic Institute (TsAGI) and became its first head.",
    "work": "MacTutor biography; DSB",
    "confidence": "high"
   }
  ],
  "notation": [
   "Joukowski transform / Joukowski aerofoil",
   "'bound vortex' (присоединённый вихрь), 1906"
  ],
  "anecdote": "Known as 'the father of Russian aviation', he considered as early as 1890 that lift might come from vortical motions caused by viscosity, and he experimented with disks rotating in an air current in 1890–91, more than a decade before his theorem (DSB). His school included S. A. Chaplygin and A. N. Tupolev.",
  "quote": "",
  "quote_source": "",
  "contested": "Zhukovsky, Joukowski, Joukowsky and Zhukovskii are transliterations of the same name. Russian literature usually calls the trailing-edge condition the Zhukovsky–Chaplygin postulate, not the Kutta condition. For the joint credit with Kutta, see the Kutta record.",
  "chapters": [
   "conservation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Zhukovsky/",
   "https://mathshistory.st-andrews.ac.uk/DSB/Zhukovsky.pdf"
  ]
 },
 {
  "id": "vincenc-strouhal",
  "name": "Vincenc (Čeněk) Strouhal",
  "born": "1850",
  "died": "1922",
  "places": "Seč, Würzburg, Prague",
  "tags": [
   "experiment"
  ],
  "summary": "A Czech physicist whose 1878 study of the tones made by wires and rods moved through air found that the pitch is proportional to the speed divided by the diameter. That dimensionless shedding frequency, the Strouhal number, is a standard check on unsteady wake simulations.",
  "contributions": [
   {
    "year": "1878 (presented 16 February 1878)",
    "what": "Moved wires and rods through air on a rotating apparatus and measured the pitch of the 'friction tones' (Reibungstöne). He found that the pitch does not depend on the wire's tension, length or material, and that a cylinder moved across its axis gives a tone whose pitch is directly proportional to the speed and inversely proportional to the diameter. He applied the result to the Aeolian harp.",
    "work": "Ueber eine besondere Art der Tonerregung, Annalen der Physik und Chemie, Neue Folge 5 (1878), pp. 216-251 (Wiley vol. 241, issue 10)",
    "confidence": "high"
   }
  ],
  "notation": [
   "Strouhal number St = f d / U, named after him later"
  ],
  "anecdote": "The work was done in the physics laboratory at Würzburg, and the paper thanks Friedrich Kohlrausch for suggesting it. Czech Wikipedia says Strouhal had been Kohlrausch's assistant since late October 1875 and habilitated with this paper. He measured sound, not flow. The vortex street that produces the tone was described by Bénard (1908) and Kármán (1911), and Rayleigh connected the two in 'Aeolian tones' (1915).",
  "quote": "",
  "quote_source": "",
  "contested": "His death is given as 26 January 1922 (English Wikipedia) and 23 January 1922 (Czech Wikipedia). The modern value St ≈ 0.2 for cylinders, and its explanation by vortex shedding, came later.",
  "chapters": [
   "similarity",
   "trust",
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1002/andp.18782411005",
   "https://archive.org/details/bub_gb_maiZAAAAIAAJ",
   "https://cs.wikipedia.org/wiki/Vincenc_Strouhal",
   "https://en.wikipedia.org/wiki/Vincenc_Strouhal"
  ]
 },
 {
  "id": "pierre-henri-hugoniot",
  "name": "Pierre Henri Hugoniot",
  "born": "1851",
  "died": "1887",
  "places": "Allenjoie (Doubs), Lorient, Paris",
  "tags": [
   "theory",
   "engineering"
  ],
  "summary": "A French naval artillery officer and teacher of mechanics who, independently of Rankine, derived the jump conditions across a shock from conservation of mass, momentum and energy. That gives the 'Hugoniot curve' of states a gas can reach through a shock, which shock-capturing schemes and equation-of-state work still use.",
  "contributions": [
   {
    "year": "1887; 1889 (second part, after his death)",
    "what": "Theory of how motion propagates in bodies and especially in perfect gases, with jump conditions across discontinuities based on energy conservation, and the curve of end states reachable through a shock.",
    "work": "Sur la propagation du mouvement dans les corps et spécialement dans les gaz parfaits, Journal de l'École polytechnique, cahier 57 (1887), pp. 3-97, and cahier 58 (1889), pp. 1-125 (page ranges differ by one between sources)",
    "confidence": "medium"
   },
   {
    "year": "1887-1888",
    "what": "A related memoir on wave propagation in an unbounded fluid.",
    "work": "Mémoire sur la propagation du mouvement dans un fluide indéfini, Journal de mathématiques pures et appliquées (4) 3 (1887), pp. 477-492, and 4 (1888), pp. 153-168",
    "confidence": "medium"
   }
  ],
  "notation": [
   "Hugoniot curve (shock adiabat): the pressure-volume states reachable through a shock from a given initial state, named after him"
  ],
  "anecdote": "Hugoniot left the École polytechnique in 1872 for the naval artillery. He taught mechanics and ballistics at the artillery school in Lorient from 1879 to 1882, was deputy director of the navy's central artillery laboratory from 1882 to 1884, and became an assistant professor of mechanics at the École polytechnique in 1884. He died in February 1887, aged 35, and the second part of his memoir was printed two years later.",
  "quote": "",
  "quote_source": "",
  "contested": "He entered the École polytechnique in 1870 and graduated in 1872, and died at Nantes in February 1887. The joint name 'Rankine-Hugoniot' covers two independent arguments made seventeen years apart.",
  "chapters": [
   "shocks",
   "conservation"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Pierre_Henri_Hugoniot",
   "https://fr.wikipedia.org/wiki/Pierre-Henri_Hugoniot",
   "https://en.wikipedia.org/wiki/Rankine%E2%80%93Hugoniot_conditions"
  ]
 },
 {
  "id": "william-mcfadden-orr",
  "name": "William McFadden Orr",
  "born": "1866",
  "died": "1934",
  "places": "Born Ballystockhart, Comber, Co. Down (2 May 1866); Royal College of Science for Ireland, Dublin (professor of applied mathematics from 1891); University College Dublin (1926–33); died Douglas, Isle of Man (14 Aug 1934)",
  "tags": [
   "theory",
   "mathematics"
  ],
  "summary": "In 1907 Orr wrote down the linear stability equation for viscous parallel flows, independently of Sommerfeld, and used energy arguments on stability. These are still the standard tools for explaining why pipe and plane Couette flow become turbulent even though linear theory finds them stable.",
  "contributions": [
   {
    "year": "1907",
    "what": "Two-part memoir on the stability of steady flows. Part I (perfect liquid) was read 12 Nov 1906 and published 29 Mar 1907. Part II (viscous liquid) was read 24 June 1907 and published 28 Oct 1907. It contains the viscous disturbance equation now called the Orr–Sommerfeld equation.",
    "work": "The stability or instability of the steady motions of a perfect liquid and of a viscous liquid, Proc. R. Irish Acad. A 27, 9–68 (Part I) and Part II in the same volume (1907)",
    "confidence": "high"
   },
   {
    "year": "1907",
    "what": "Used the disturbance energy equation (now called the Reynolds–Orr equation) to find Reynolds numbers below which every disturbance must decay.",
    "work": "Proc. R. Irish Acad. A 27 (1907)",
    "confidence": "medium"
   },
   {
    "year": "1907",
    "what": "Found that suitable disturbances can grow considerably for a while before decaying. The underlying mechanism, in which a shear flow tilts disturbances, was later called the 'Orr mechanism' and matters in theories of subcritical transition.",
    "work": "Proc. R. Irish Acad. A 27 (1907)",
    "confidence": "low"
   }
  ],
  "notation": [
   "Orr–Sommerfeld equation (eponym; written independently by Orr in 1907 and by Sommerfeld in 1908)"
  ],
  "anecdote": "In the 1916 (fourth) edition of 'Hydrodynamics', Lamb acknowledged that Orr had given the stability equation for plane Couette flow and that Sommerfeld arrived at it independently afterwards (MacTutor). Orr's Part I is also among the earliest English uses of 'turbulent' in this sense, speaking of a limit 'beyond which instability sets in and the motion becomes turbulent' (as quoted by Schmitt 2023).",
  "quote": "",
  "quote_source": "",
  "contested": "Orr's equation was in print in 1907, before Sommerfeld's Rome talk of 1908 (proceedings sometimes dated 1909). The joint name reflects independent discovery. MacTutor's Orr page dates Sommerfeld's work inconsistently (1908 and an editorial '[In 1909]').",
  "chapters": [
   "turbulence",
   "similarity"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Orr/",
   "https://mathshistory.st-andrews.ac.uk/Extras/Orr_Stability/",
   "https://indico.ijclab.in2p3.fr/event/8021/contributions/29829/attachments/21241/29865/Schmitt-SFP-2023.pdf"
  ]
 },
 {
  "id": "martin-wilhelm-kutta",
  "name": "Martin Wilhelm Kutta",
  "born": "1867",
  "died": "1944",
  "places": "Born Pitschen, Upper Silesia, now Byczyna, Poland (3 Nov 1867); TH Munich (assistant from 1894, extraordinary professor 1907); Jena (1909); TH Aachen (1910); TH Stuttgart (1911–35); died Fürstenfeldbruck (25 Dec 1944)",
  "tags": [
   "mathematics",
   "computation",
   "theory",
   "engineering"
  ],
  "summary": "Kutta matters to CFD learners twice over. His 1900 thesis, printed in 1901, extended Runge's idea into the Runge–Kutta family of time-stepping methods. His 1902 work on lift introduced the rule that the circulation round a wing is set by requiring smooth flow off its sharp trailing edge, now called the Kutta condition.",
  "contributions": [
   {
    "year": "1901",
    "what": "Systematic derivation of multistage one-step methods for ODEs, including the classical fourth-order scheme. Doctoral thesis of 1900, published 1901 in Zeitschrift für Mathematik und Physik vol. 46.",
    "work": "Beiträge zur näherungsweisen Integration totaler Differentialgleichungen (thesis 1900; printed 1901)",
    "confidence": "medium"
   },
   {
    "year": "1902",
    "what": "Habilitation at TH Munich on lift forces in flowing fluids. It gave a function-theory criterion for smooth outflow of a circulating flow past a circular-arc profile, which fixes the circulation and hence the lift.",
    "work": "Auftriebskräfte in strömenden Flüssigkeiten (habilitation, TH Munich, 1902)",
    "confidence": "medium"
   },
   {
    "year": "1910",
    "what": "Two papers for the Bavarian Academy of Sciences (1910 and 1911), including a fuller treatment of plane circulatory flows by conformal mapping, with applications to flight.",
    "work": "Über ebene Zirkulationsströmungen nebst flugtechnischen Anwendungen, Sitzungsberichte der Bayerischen Akademie der Wissenschaften (1910–11)",
    "confidence": "medium"
   }
  ],
  "notation": [
   "Kutta condition ('Kuttasche Abflussbedingung'), 1902",
   "Runge–Kutta methods (eponym), 1901"
  ],
  "anecdote": "From about 1912, after taking the Stuttgart chair, he published nothing more and devoted himself to teaching. His Stuttgart colleague F. Pfeiffer praised his lectures for working out the mathematical idea in full clarity while keeping a lively connection to applications (HU Berlin note, 1994).",
  "quote": "",
  "quote_source": "",
  "contested": "The 'Kutta–Joukowski' lift theorem is usually dated 'Kutta 1902, Joukowski 1906'. Kutta's 1902 work dealt with a particular profile. Zhukovsky published the general lift formula, lift per unit span = ρVΓ, independently in 1906. The joint name stuck because Kutta pointed out that the formula was already contained in his 1902 work (MacTutor). F. W. Lanchester had developed related qualitative circulation ideas, published in his 'Aerodynamics' (1907). Prandtl later acknowledged them but noted that they lacked quantitative development. The Kutta condition models a viscous effect inside inviscid theory; it does not follow from inviscid theory itself.",
  "chapters": [
   "discretization",
   "conservation"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Kutta/",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Zhukovsky/",
   "https://edoc.hu-berlin.de/bitstreams/632a40a1-70d1-477c-be38-5c46849563c2/download",
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf"
  ]
 },
 {
  "id": "arnold-sommerfeld",
  "name": "Arnold Sommerfeld",
  "born": "1868",
  "died": "1951",
  "places": "Born Königsberg (5 Dec 1868); Göttingen (Klein's assistant from 1894); Clausthal (from 1897); Aachen (professor of mechanics, c. 1900); Munich (professor of theoretical physics from 1906); died Munich (26 Apr 1951), two months after being struck by a truck",
  "tags": [
   "theory",
   "mathematics",
   "notation"
  ],
  "summary": "He made the earliest documented use of the name 'Reynolds number', at the 1908 International Congress of Mathematicians in Rome. Independently of Orr, he wrote down the linear stability equation for viscous parallel flows, the Orr–Sommerfeld equation, which later underpinned predictions of where flows become turbulent.",
  "contributions": [
   {
    "year": "1904",
    "what": "Hydrodynamic theory of lubrication. Inertia is neglected, so no Reynolds number is needed. Rott notes that von Kármán (1956) mistakenly cited this paper as the naming source.",
    "work": "Zur hydrodynamischen Theorie der Schmiermittelreibung, Z. Math. Phys. 50, 97–155 (1904)",
    "confidence": "high"
   },
   {
    "year": "1908",
    "what": "Viscous stability equation for parallel flow, with the dimensionless parameter R introduced as 'eine reine Zahl, die wir die Reynolds'sche Zahl nennen wollen'. Talk given in Rome in 1908; the printed proceedings are sometimes dated 1909.",
    "work": "Ein Beitrag zur hydrodynamischen Erklärung der turbulenten Flüssigkeitsbewegung, Atti del IV Congresso Internazionale dei Matematici (Roma 1908), vol. 3, 116–124",
    "confidence": "high"
   },
   {
    "year": "1923",
    "what": "Supervised Werner Heisenberg's doctoral thesis (1923), which applied this stability theory to channel flow.",
    "work": "W. Heisenberg, Über Stabilität und Turbulenz von Flüssigkeitsströmen, Ann. Phys. 74 (= 379), 577–627 (1924)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Reynolds'sche Zahl' (Reynolds number) and the symbol R, 1908"
  ],
  "anecdote": "His naming was largely forgotten until von Kármán pointed it out in his 1954 book 'Aerodynamics'. Even then von Kármán's 1956 reference gave the wrong (1904) paper. N. Rott had written in 1985, relying on Ackeret's memory, that Prandtl coined the term. In 1990 he published a correction tracing it to Sommerfeld's Rome paper.",
  "quote": "eine reine Zahl, die wir die Reynolds'sche Zahl nennen wollen",
  "quote_source": "A. Sommerfeld, Rome ICM 1908, as quoted in N. Rott, Note on the history of the Reynolds number, Annu. Rev. Fluid Mech. 22, 1–12 (1990), p. 1, https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
  "contested": "Rott notes that many people would guess Blasius coined 'Reynolds number', and Rott himself once credited Prandtl. Prandtl used 'die in der Hydrodynamik bekannte Reynolds'sche Zahl' in 1910 and named it deliberately in 1913. Blasius used the term in 1912 and 1913. Sommerfeld's 1908 use is the earliest documented by Rott. The term became standard through Göttingen work, especially Prandtl's 1914 sphere-drag paper. The year is cited as both 1908 (talk) and 1909 (printed proceedings).",
  "chapters": [
   "notation",
   "similarity",
   "turbulence"
  ],
  "sources": [
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Sommerfeld/",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Orr/",
   "https://doi.org/10.1002/andp.19243791502"
  ]
 },
 {
  "id": "henri-benard",
  "name": "Henri Bénard",
  "born": "1874",
  "died": "1939",
  "places": "Born Lieurey, Eure, Normandy (25 Oct 1874); Paris (École Normale Supérieure from 1894; préparateur at the Collège de France with Mascart and Brillouin from 1897); Lyon (from April 1902); Bordeaux (professor of general physics from April 1910); Paris, Sorbonne (from November 1922; head of the experimental fluid mechanics laboratory of the Institut de Mécanique des Fluides from 1929); died Neuilly-sur-Seine (29 Mar 1939)",
  "tags": [
   "experiment"
  ],
  "summary": "In 1900 he made the first careful, quantitative experiments on cellular convection in a liquid layer heated from below. In 1908 he filmed the alternating vortices shed behind a moving obstacle. Both flows, convection cells and the vortex street, are now standard test cases for flow solvers.",
  "contributions": [
   {
    "year": "1900",
    "what": "Thin liquid layers heated from below with a free upper surface form near-regular hexagonal cells, which he called 'tourbillons cellulaires' (cellular vortices). He studied them with optical methods, paying special attention to the deformation of the free surface.",
    "work": "Les tourbillons cellulaires dans une nappe liquide, Revue générale des sciences pures et appliquées 11, 1261–1271 and 1309–1328 (Dec 1900)",
    "confidence": "high"
   },
   {
    "year": "1901",
    "what": "Doctoral thesis on the same cells, defended 15 March 1901. Also printed in Annales de Chimie et de Physique (7) 23, 62–144 (1901), per Wikipedia.",
    "work": "Les tourbillons cellulaires dans une nappe liquide propageant de la chaleur par convection, en régime permanent (Gauthier-Villars, Paris, 1901)",
    "confidence": "high"
   },
   {
    "year": "1908",
    "what": "Two notes on the periodic shedding of alternating vortices behind a moving obstacle, the second a cinematographic study.",
    "work": "Formation périodique de centres de giration à l'arrière d'un obstacle en mouvement, C. R. Acad. Sci. 147, 839–842 (9 Nov 1908); Étude cinématographique des remous et des rides produits par la translation d'un obstacle, C. R. Acad. Sci. 147, 970–972 (23 Nov 1908)",
    "confidence": "high"
   },
   {
    "year": "1926",
    "what": "Argued that Kármán's ideal-vortex laws for the stability of the alternating street do not hold accurately in real liquids.",
    "work": "Sur l'inexactitude, pour les liquides réels, des lois théoriques de Karman relatives à la stabilité des tourbillons alternés, C. R. Acad. Sci. 182, 1523–1525 (21 June 1926)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'tourbillons cellulaires' (cellular vortices), 1900"
  ],
  "anecdote": "Bénard objected to the name 'Kármán vortex street'. In his memoir von Kármán recalls that when Bénard protested at an international congress (he dates it 1930), he answered that London could call it the Kármán Vortex Street, Berlin the 'Karmansche Wirbelstrasse', and Paris the 'Boulevard d'Henri Bénard'. Kármán added that they became good friends, but Wesfreid found no letters between them in Kármán's archive, only a memorial card sent when Bénard died.",
  "quote": "",
  "quote_source": "",
  "contested": "(1) For about four decades after 1916 his cells were explained by Rayleigh's buoyancy theory, until Block (1956) and Pearson (1958) showed that in such thin free-surface layers surface-tension (Marangoni) forces dominate. Bénard himself reported in 1934 that his onset values were 300 to 1000 times smaller than Jeffreys' buoyancy prediction for his boundary conditions, a gap he called 'the Rayleigh deficiency' (Wesfreid 2017). (2) Bénard's 1908 observations of the vortex street came before Kármán's 1911–12 stability theory; French usage keeps 'Bénard–Kármán street'.",
  "chapters": [
   "similarity"
  ],
  "sources": [
   "https://arxiv.org/abs/1712.07039",
   "https://comptes-rendus.academie-sciences.fr/mecanique/articles/10.1016/j.crme.2017.06.006/",
   "https://doi.org/10.1038/178650a0",
   "https://doi.org/10.1017/S0022112058000616"
  ]
 },
 {
  "id": "ludwig-prandtl",
  "name": "Ludwig Prandtl",
  "born": "1875",
  "died": "1953",
  "places": "Born Freising (4 Feb 1875); Technische Hochschule Hannover (professor 1901–04); Göttingen (from 1904; Kaiser-Wilhelm-Institut für Strömungsforschung, in full operation from 1925); died Göttingen (15 Aug 1953)",
  "tags": [
   "theory",
   "experiment",
   "engineering",
   "turbulence"
  ],
  "summary": "His short 1904 congress paper argued that when viscosity is small, the fluid sticks to the wall but friction matters only in a thin layer; outside it the flow is almost inviscid. That explained flow separation and drag, founded boundary-layer theory (later formalised as matched asymptotics), and tells a mesh designer where resolution is needed. His 1925 mixing-length closure became one of the first widely used turbulence models.",
  "contributions": [
   {
    "year": "1904",
    "what": "Thin-layer (boundary-layer) analysis of flow at very small viscosity, with flow-visualisation photographs of separation. Presented at the Third International Congress of Mathematicians, Heidelberg, in August 1904 (accounts give 8 or 12 August). Printed 1905; eight pages.",
    "work": "Über Flüssigkeitsbewegung bei sehr kleiner Reibung, Verhandlungen des III. Internationalen Mathematiker-Kongresses, Heidelberg 1904 (Teubner, Leipzig, 1905), pp. 484–491",
    "confidence": "high"
   },
   {
    "year": "1914",
    "what": "Explained the sudden drop in sphere drag by the boundary layer turning turbulent at a critical Reynolds number, settling a dispute with Eiffel.",
    "work": "Der Luftwiderstand von Kugeln, Nachr. Ges. Wiss. Göttingen, 177–190 (1914), as cited by Rott 1990",
    "confidence": "high"
   },
   {
    "year": "1925",
    "what": "Introduced the mixing-length model, with an eddy viscosity equal to the square of a mixing length times the magnitude of the mean velocity gradient.",
    "work": "Bericht über Untersuchungen zur ausgebildeten Turbulenz, ZAMM 5, 136–139 (1925)",
    "confidence": "high"
   },
   {
    "year": "1925",
    "what": "The Kaiser-Wilhelm-Institut für Strömungsforschung in Göttingen went into full operation (NAE tribute to Ackeret; NDB). Prandtl's own 1927 list names the first three Göttingen boundary-layer dissertations: Blasius (1907), Boltze (1908) and Hiemenz (1911). Ackeret worked with him from 1921 and helped plan the institute.",
    "work": "Prandtl, Vier Abhandlungen zur Hydrodynamik und Aerodynamik (Göttingen, 1927), appendix; NAE Memorial Tributes vol. 8 (Ackeret)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Grenzschicht' (boundary layer) appears only once in the 1904 paper; his working term there is 'Übergangsschicht' (transition layer)",
   "Mixing length ('Mischungsweg'), 1925"
  ],
  "anecdote": "The paper that founded boundary-layer theory fills just eight printed pages. Sydney Goldstein later recalled asking Prandtl why it was so short. Prandtl said he had been given ten minutes at the congress and, being young, thought he could publish only what he had time to say (Goldstein 1969, as retold by O'Malley 2010).",
  "quote": "In der schmalen Übergangsschicht ergeben dann die schroffen Geschwindigkeitsunterschiede trotz der kleinen Reibungskonstanten merkliche Wirkungen.",
  "quote_source": "L. Prandtl 1904/1905, p. 1 of the 1905 offprint as reprinted in Vier Abhandlungen zur Hydrodynamik und Aerodynamik (1927), https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf. Plain translation: 'In the narrow transition layer the abrupt differences in velocity then produce noticeable effects, despite the small friction constant.'",
  "contested": "(1) In the 1904 paper 'Grenzschicht' (boundary layer) appears only once, while 'Übergangsschicht' (transition layer) carries the argument. (2) Accounts give the presentation date as either 8 or 12 August 1904. (3) Eddy-transfer reasoning predated 1925; G. I. Taylor's 1915 'Eddy motion in the atmosphere' had already introduced the term 'eddy viscosity'. (4) N. Rott wrote in 1985, from Jakob Ackeret's recollection, that Prandtl coined 'Reynolds number', and retracted this in 1990; Sommerfeld used it first. (5) His institutes grew under the Nazi-era Air Ministry, and historians still debate how to judge his conduct.",
  "chapters": [
   "conservation",
   "turbulence",
   "similarity"
  ],
  "sources": [
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Prandtl/",
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
   "https://doi.org/10.1002/zamm.19250050212"
  ]
 },
 {
  "id": "theodore-von-karman",
  "name": "Theodore von Kármán",
  "born": "1881",
  "died": "1963",
  "places": "Born Budapest (11 May 1881); Göttingen (doctorate 1908); Aachen (director of the Aeronautical Institute from 1913); Caltech (full-time director of the Aeronautical Laboratory from 1930 to 1949; director of JPL from its founding in Nov 1944); died Aachen (May 1963)",
  "tags": [
   "theory",
   "turbulence",
   "engineering"
  ],
  "summary": "In 1911–12 he explained why the two rows of vortices behind a bluff body settle into a staggered pattern with a definite spacing, and linked that pattern to drag. He later shaped the statistical theory of turbulence (Kármán–Howarth equation, 1938) and the scaling of wall turbulence. Vortex shedding behind a cylinder is now a standard test for unsteady solvers.",
  "contributions": [
   {
    "year": "1911",
    "what": "Analysed the stability of two rows of point vortices, showing that only the staggered arrangement at a specific ratio of row spacing to vortex spacing (about 0.28) can be stable. A second note followed in 1912.",
    "work": "Über den Mechanismus des Widerstandes, den ein bewegter Körper in einer Flüssigkeit erfährt, Nachrichten der K. Gesellschaft der Wissenschaften zu Göttingen, Math.-phys. Klasse (1911; continued 1912)",
    "confidence": "high"
   },
   {
    "year": "1912",
    "what": "With H. Rubach: relates body drag to the vortex street, with Göttingen experiments by Rubach.",
    "work": "Über den Mechanismus des Flüssigkeits- und Luftwiderstandes, Physikalische Zeitschrift 13, 49–59 (1912)",
    "confidence": "high"
   },
   {
    "year": "1930",
    "what": "Similarity hypothesis for wall turbulence, leading to the logarithmic velocity law and the von Kármán constant.",
    "work": "Mechanische Ähnlichkeit und Turbulenz, Nachr. Ges. Wiss. Göttingen (1930)",
    "confidence": "medium"
   },
   {
    "year": "1938",
    "what": "With L. Howarth: exact equation for the evolution of the two-point velocity correlation in isotropic turbulence. Published 21 January 1938.",
    "work": "On the statistical theory of isotropic turbulence, Proc. R. Soc. A 164, 192–215 (1938)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Kármán vortex street' (eponym, disputed by Bénard)",
   "von Kármán constant κ in the log law of the wall"
  ],
  "anecdote": "Bénard, who had filmed the alternating vortices in 1908, protested the name at an international congress, which von Kármán dates to 1930. Von Kármán answered with a joke about street names, which he later told in his memoir (quoted below).",
  "quote": "All right, I do not object if in London this is called Kármán Vortex Street. In Berlin, let us call it Karmansche Wirbelstrasse, and in Paris, Boulevard d'Henri Bénard.",
  "quote_source": "T. von Kármán and L. Edson, The Wind and Beyond (Little, Brown, 1967), pp. 61–65, as quoted in J. E. Wesfreid, Henri Bénard: Thermal convection and vortex shedding, C. R. Mécanique 345, 446–466 (2017), https://arxiv.org/abs/1712.07039",
  "contested": "Bénard's experiments (1908) came before Kármán's theory. Kármán's analysis is for ideal point vortices, and Bénard argued in 1926 that its laws do not hold accurately in real liquids. Kármán's memoir says the two became good friends, though Wesfreid's archival study found no correspondence between them. His death date is given as 7 May 1963 by MacTutor and 6 May in some other references.",
  "chapters": [
   "similarity",
   "turbulence"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Karman/",
   "https://arxiv.org/abs/1712.07039",
   "https://doi.org/10.1098/rspa.1938.0013"
  ]
 },
 {
  "id": "lewis-fry-richardson",
  "name": "Lewis Fry Richardson",
  "born": "1881",
  "died": "1953",
  "places": "Born Newcastle upon Tyne (11 Oct 1881); National Physical Laboratory (1903–04, 1907–09); Sunbeam Lamp Co. (1909–12); Meteorological Office (1913–16; superintendent of Eskdalemuir Observatory); Friends' Ambulance Unit in France (1916–19); Westminster Training College (1920–29); Paisley (Principal 1929–40); died Kilmun, Argyll (30 Sep 1953)",
  "tags": [
   "computation",
   "meteorology",
   "turbulence",
   "mathematics"
  ],
  "summary": "Richardson was a pioneer of solving PDEs numerically. In 1910 he used finite differences, iterative relaxation and extrapolation of the h² error (now Richardson extrapolation) to compute stresses in a masonry dam. In 1922 he published the first attempt at numerical weather prediction, done by hand. The same book contains his 'big whirls' description of the energy cascade.",
  "contributions": [
   {
    "year": "1910",
    "what": "Finite-difference solution of Laplace-type and biharmonic problems on irregular domains, including by successive approximation. He showed that the error of central differences has the form h²f₂ + h⁴f₄ + …, and extrapolated results from several mesh sizes to h → 0. Received in revised form 2 Nov 1909 and read 13 Jan 1910. The volume is dated 1911, though Richardson cited it as 1910.",
    "work": "The approximate arithmetical solution by finite differences of physical problems involving differential equations, with an application to the stresses in a masonry dam, Phil. Trans. R. Soc. A 210, 307–357",
    "confidence": "high"
   },
   {
    "year": "1920",
    "what": "Energy criterion for whether stable stratification suppresses atmospheric eddies; the quantity is now called the Richardson number.",
    "work": "The supply of energy from and to atmospheric eddies, Proc. R. Soc. A 97, 354–373 (1920)",
    "confidence": "high"
   },
   {
    "year": "1922",
    "what": "Hand-computed forecast starting from observations over central Europe at 07 GMT on 20 May 1910. It gave a surface pressure rise of 145 millibars in 6 hours, while the barometer was nearly steady; Richardson traced the error to the representation of the initial winds. The book also proposes a 'forecast-factory' of 64,000 human computers.",
    "work": "Weather Prediction by Numerical Process (Cambridge University Press, 1922)",
    "confidence": "high"
   },
   {
    "year": "1926",
    "what": "Relative dispersion of particle pairs in the atmosphere (the basis of 'Richardson's 4/3 law').",
    "work": "Atmospheric diffusion shown on a distance-neighbour graph, Proc. R. Soc. A 110, 709–737 (1926)",
    "confidence": "high"
   },
   {
    "year": "1927",
    "what": "With J. A. Gaunt: a systematic account of extrapolating to zero mesh size.",
    "work": "The deferred approach to the limit, Phil. Trans. R. Soc. A 226, 299–361 (1927)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'deferred approach to the limit' (1927): his name for what is now called Richardson extrapolation",
   "Richardson number (eponym for his 1920 criterion)",
   "'forecast-factory' (1922)"
  ],
  "anecdote": "He worked out the forecast in France between 1916 and 1918, in the intervals of transporting wounded, writing that his office was 'a heap of hay in a cold rest billet'. During the battle of Champagne in April 1917 the working copy was sent to the rear and lost. It was found some months later under a heap of coal. For the 1910 dam paper he paid computers piece rates; one of the quickest boys averaged 2,000 operations a week on three-digit numbers.",
  "quote": "big whirls have little whirls that feed on their velocity, and little whirls have lesser whirls and so on to viscosity—in the molecular sense.",
  "quote_source": "L. F. Richardson, Weather Prediction by Numerical Process (1922), p. 66, https://archive.org/details/weatherpredictio00richrich",
  "contested": "(1) The 'rhyme' is printed as prose inside a sentence. It is usually reset as a four-line verse with 'in the molecular sense' dropped. It is widely read as a parody of the 'great fleas have little fleas' rhyme. (2) The book says 64,000 computers; MacTutor gives about 60,000. (3) Richardson himself blamed the initial winds for the failed forecast, and Peter Lynch's modern reconstruction (Lynch 2006) showed that filtering out the initial gravity-wave imbalance gives a realistic result. Because only a single step was computed, the error came from unbalanced initial data rather than the step-by-step growth of a CFL instability.",
  "chapters": [
   "discretization",
   "trust",
   "solvers",
   "turbulence"
  ],
  "sources": [
   "https://archive.org/details/weatherpredictio00richrich",
   "https://archive.org/details/philtrans04693161",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Richardson/",
   "https://doi.org/10.1098/rsta.1927.0008"
  ]
 },
 {
  "id": "harry-bateman",
  "name": "Harry Bateman",
  "born": "1882",
  "died": "1946",
  "places": "Born Manchester (29 May 1882); Cambridge (Trinity fellow from 1905); Liverpool (from 1906); Manchester (reader in mathematical physics from 1907); Bryn Mawr (1910–12); Johns Hopkins (1912–17); Throop College / Caltech (from 1917); died on a train near Milford, Utah (21 Jan 1946)",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "In a 1915 survey for the Monthly Weather Review, Bateman wrote down the viscous equation now called Burgers' equation, 24 years before Burgers. He is a standard example of an equation being named after the person who made it a research topic rather than the first to write it.",
  "contributions": [
   {
    "year": "1915",
    "what": "Survey of recent fluid-motion research that includes the one-dimensional equation u_t + u u_x = ν u_xx (Wikipedia). J. D. Cole cited this paper in his 1951 solution of the equation.",
    "work": "Some recent researches on the motion of fluids, Monthly Weather Review 43(4), 163–170 (April 1915)",
    "confidence": "medium"
   }
  ],
  "notation": [
   "'Bateman–Burgers equation' (alternative name used by some authors)"
  ],
  "anecdote": "He died of a coronary thrombosis on a train near Milford, Utah, while travelling to New York to receive an award from the Institute of the Aeronautical Sciences. After his death Caltech and the US Office of Naval Research continued his planned work on special functions as the Bateman Manuscript Project, directed by Arthur Erdélyi.",
  "quote": "",
  "quote_source": "",
  "contested": "Bateman introduced the equation in his 1915 paper, while Burgers' papers of 1939–48 made it a standard model. MacTutor's header gives Pasadena as the place of death, though its text notes that he died on the train near Milford, Utah.",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Bateman/",
   "https://en.wikipedia.org/wiki/Burgers%27_equation",
   "https://doi.org/10.1175/1520-0493(1915)43%3C163:SRROTM%3E2.0.CO;2",
   "https://doi.org/10.1090/qam/42889"
  ]
 },
 {
  "id": "heinrich-blasius",
  "name": "Paul Richard Heinrich Blasius",
  "born": "1883",
  "died": "1970",
  "places": "Born Berlin (9 Aug 1883); Göttingen (doctoral student of Prandtl, dissertation 1907); Hamburg (Ingenieurschule, teaching from 1912); died Hamburg (24 Apr 1970)",
  "tags": [
   "theory",
   "mathematics",
   "engineering"
  ],
  "summary": "His Göttingen dissertation (1907; printed 1908) reduced Prandtl's boundary-layer equations for a flat plate to a single ordinary differential equation, a similarity solution. The resulting Blasius profile is still a standard verification case for viscous solvers. In 1912–13 he showed that smooth-pipe friction data collapse onto one curve against the Reynolds number, giving λ = 0.3164 Re^−1/4.",
  "contributions": [
   {
    "year": "1908",
    "what": "Similarity solution of the laminar boundary layer on a flat plate, plus the flow round a symmetric obstacle, both steady and starting from rest. Göttingen dissertation of 1907; Prandtl lists it as the first of three Göttingen dissertations following up his 1904 paper.",
    "work": "Grenzschichten in Flüssigkeiten mit kleiner Reibung, Z. Math. Phys. 56, 1–37 (1908)",
    "confidence": "high"
   },
   {
    "year": "1912",
    "what": "Short paper applying Reynolds similarity to friction, using the expression 'Reynolds number' twice (pp. 640, 642).",
    "work": "Das Ähnlichkeitsgesetz bei Reibungsvorgängen, Z. VDI 56, 639–643 (1912)",
    "confidence": "high"
   },
   {
    "year": "1913",
    "what": "Extended report: collected pipe-friction data, including his own experiments, and gave the turbulent smooth-pipe law λ = 0.3164 Re^−1/4.",
    "work": "Das Ähnlichkeitsgesetz bei Reibungsvorgängen in Flüssigkeiten, Mitteilungen über Forschungsarbeiten auf dem Gebiete des Ingenieurwesens, Heft 131 (VDI, 1913), 39 pp.",
    "confidence": "high"
   }
  ],
  "notation": [
   "Used the term 'Reynolds number' in 1912 and 1913 (Rott 1990), which is why he is often wrongly thought to have coined it",
   "Blasius friction law, Blasius boundary-layer profile (eponyms)"
  ],
  "anecdote": "After about six years of research he moved to teaching at a Hamburg engineering school and stayed for the rest of his career; he celebrated fifty years of teaching on 1 April 1962 (Wikipedia, citing Hager 2003). In 1913 he complained that the Reynolds similarity law had still not reached engineering practice.",
  "quote": "ist in die einschlägigen Gebiete der Ingenieurwissenschaften bis heute noch nicht eingedrungen",
  "quote_source": "H. Blasius 1913 (VDI Forschungsheft 131, p. 5), on the Reynolds similarity law, as quoted in N. Rott, Annu. Rev. Fluid Mech. 22 (1990), p. 10, https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
  "contested": "He did not coin 'Reynolds number'; Sommerfeld used it in 1908. The VDI Forschungsheft number is given as 131 by Rott and as 134 by Wikipedia; this record uses 131. Wikipedia calls him Prandtl's first doctoral student. Prandtl's own 1927 list confirms only that his was the first of the Göttingen boundary-layer dissertations.",
  "chapters": [
   "similarity",
   "trust"
  ],
  "sources": [
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf",
   "https://www.dbc.wroc.pl//Content/326/PDF/000264.pdf",
   "https://en.wikipedia.org/wiki/Paul_Richard_Heinrich_Blasius",
   "https://doi.org/10.1007/s00348-002-0582-9"
  ]
 },
 {
  "id": "g-i-taylor",
  "name": "Geoffrey Ingram Taylor",
  "born": "1886",
  "died": "1975",
  "places": "Born St John's Wood, London (7 Mar 1886); Cambridge (Trinity College; Royal Society Yarrow Research Professor from 1923); meteorologist on the ice-patrol ship Scotia (1913); Los Alamos with the British delegation to the Manhattan Project (1944–45); died Cambridge (27 Jun 1975)",
  "tags": [
   "theory",
   "experiment",
   "turbulence",
   "meteorology"
  ],
  "summary": "Taylor joined theory to experiment. His rotating-cylinder study (1923) is widely regarded as the first close quantitative match between linear stability theory and experiment. In 1935 he founded the statistical theory of turbulence. In 1950 he showed by dimensional reasoning that a blast wave's radius grows as (E t²/ρ)^1/5, a classic test case for shock-capturing codes.",
  "contributions": [
   {
    "year": "1915",
    "what": "Turbulent transfer in the atmosphere using eddy-diffusion arguments. Schmitt (2023) credits it with the first use of the term 'eddy viscosity' (the paper does not use the word 'turbulence').",
    "work": "Eddy motion in the atmosphere, Phil. Trans. R. Soc. A 215, 1–26 (1915)",
    "confidence": "high"
   },
   {
    "year": "1921",
    "what": "Turbulent dispersion expressed through the Lagrangian velocity correlation. Usually dated 1921; the volume was printed in 1922.",
    "work": "Diffusion by continuous movements, Proc. London Math. Soc. (2) 20, 196–212",
    "confidence": "high"
   },
   {
    "year": "1923",
    "what": "Theory and experiment for flow between rotating cylinders, showing that the onset of toroidal (Taylor) vortices agreed closely with linear stability theory.",
    "work": "Stability of a viscous liquid contained between two rotating cylinders, Phil. Trans. R. Soc. A 223, 289–343 (1923)",
    "confidence": "medium"
   },
   {
    "year": "1935",
    "what": "Statistical theory of turbulence in four parts, covering isotropic turbulence, correlation functions, the dissipation length scale now called the Taylor microscale, and (IV) diffusion in a turbulent air stream.",
    "work": "Statistical theory of turbulence I–IV, Proc. R. Soc. A 151, 421–478 (1935)",
    "confidence": "high"
   },
   {
    "year": "1938",
    "what": "Turbulence spectra; uses the 'frozen turbulence' assumption to turn time records into spatial spectra.",
    "work": "The spectrum of turbulence, Proc. R. Soc. A 164, 476–490 (1938)",
    "confidence": "medium"
   },
   {
    "year": "1950",
    "what": "Similarity solution for a point-source blast wave, plus an estimate of the energy of the first atomic explosion from photographs. The theory was presented to the British government on 27 June 1941 (per Wikipedia); both papers were published 22 March 1950.",
    "work": "The formation of a blast wave by a very intense explosion, I. Theoretical discussion; II. The atomic explosion of 1945, Proc. R. Soc. A 201, 159–174 and 175–186 (1950)",
    "confidence": "high"
   },
   {
    "year": "1950",
    "what": "Instability of an interface accelerated toward the lighter fluid, extending Rayleigh's 1883 analysis; now called Rayleigh–Taylor instability.",
    "work": "The instability of liquid surfaces when accelerated in a direction perpendicular to their planes. I, Proc. R. Soc. A 201, 192–196 (1950)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'eddy viscosity' (English term, 1915, per Schmitt 2023)",
   "Taylor microscale (1935)",
   "Taylor vortices / Taylor–Couette flow (eponyms)"
  ],
  "anecdote": "His 1950 estimate of the first atomic bomb's yield was worked out from unclassified photographs while the yield itself was still secret. His biographer G. K. Batchelor wrote that the estimate 'caused quite a stir' and that Taylor was mildly admonished by the US Army (as quoted on Wikipedia).",
  "quote": "",
  "quote_source": "",
  "contested": "Popular accounts often say Taylor worked from photographs in Life magazine, whereas the declassified fireball photographs with length scales and time stamps were published by J. E. Mack in 1947. The same blast-wave similarity solution was found independently by John von Neumann (presented 30 June 1941) and L. I. Sedov (complete solution published 1946).",
  "chapters": [
   "turbulence",
   "similarity",
   "shocks"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Taylor_Geoffrey/",
   "https://en.wikipedia.org/wiki/Taylor%E2%80%93von_Neumann%E2%80%93Sedov_blast_wave",
   "https://doi.org/10.1098/rspa.1950.0049",
   "https://doi.org/10.1098/rsta.1923.0008"
  ]
 },
 {
  "id": "richard-courant",
  "name": "Richard Courant",
  "born": "1888",
  "died": "1972",
  "places": "Göttingen; New York University (New York)",
  "tags": [
   "mathematics",
   "theory",
   "computation"
  ],
  "summary": "Lead author of the 1928 Courant–Friedrichs–Lewy paper. Its mesh-ratio condition for hyperbolic equations is the CFL condition that limits the time step of every explicit fluid solver. His 1943 paper on piecewise-linear trial functions is an early mathematical ancestor of the finite element method.",
  "contributions": [
   {
    "year": "1928",
    "what": "With Friedrichs and Lewy, replaced derivatives by difference quotients on a mesh and asked whether the difference solutions converge as the mesh is refined. For hyperbolic initial-value problems they showed that convergence requires the mesh ratio to satisfy inequalities set by the characteristics, so that the numerical domain of dependence contains the true one.",
    "work": "Über die partiellen Differenzengleichungen der mathematischen Physik, Mathematische Annalen 100, 32–74 (issue dated December 1928)",
    "confidence": "high"
   },
   {
    "year": "1943",
    "what": "Published a variational method using piecewise-linear functions on triangles. MacTutor says the first application of the finite element idea as a numerical method was Courant's 1943 solution of a torsion problem.",
    "work": "Variational methods for the solution of problems of equilibrium and vibrations, Bull. Amer. Math. Soc. 49(1), 1–23",
    "confidence": "high"
   },
   {
    "year": "1948",
    "what": "Wrote, with Friedrichs, the standard monograph on compressible flow and shocks.",
    "work": "Supersonic Flow and Shock Waves (Interscience, 1948; Springer reprint 1976), with K. O. Friedrichs",
    "confidence": "high"
   },
   {
    "year": "1952",
    "what": "With Eugene Isaacson and Mina Rees, published a finite-difference method for nonlinear hyperbolic equations that takes differences on the side the information comes from. It is usually cited as the origin of the first-order upwind ('CIR') scheme.",
    "work": "On the solution of nonlinear hyperbolic differential equations by finite differences, Comm. Pure Appl. Math. 5(3), 243–255",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "A footnote in the 1928 paper says the work depends on Courant's 1925 Göttingen note on partial difference equations. It adds that earlier papers on difference methods for the Dirichlet problem (J. le Roux 1914, R. G. D. Richardson 1917, H. B. Phillips and N. Wiener 1925) were not known to him when he wrote that note. Most English-language readers know the paper through Phyllis Fox's translation, made at the AEC Computing Facility at New York University and issued as AEC report NYO-7689. The IBM Journal of Research and Development reprinted it in March 1967 (vol. 11, no. 2, pp. 215–234).",
  "quote": "Nowhere do we assume the existence of the solution to the differential equation problem—on the contrary, we obtain a simple existence proof by using the limiting process.",
  "quote_source": "Courant, Friedrichs & Lewy (1928), introduction, English translation 'On the Partial Difference Equations of Mathematical Physics', IBM J. Res. Dev. 11 (1967), p. 215: https://mesonet2.agron.iastate.edu/pickup/CFL.pdf",
  "contested": "The 1928 CFL paper appeared before electronic computers existed. Its stated aim was to use difference equations to prove existence and convergence for elliptic, parabolic and hyperbolic problems, so the mesh-ratio condition appears as a requirement for convergence rather than a rule for machine calculation. Reading it as a stability rule came after 1945, when Charney, Fjørtoft and von Neumann (1950) called their own stability analysis 'a heuristic procedure' patterned on CFL. The condition is necessary but not sufficient. On finite elements, Courant's 1943 paper is an early mathematical precursor, while the engineering method grew up largely independently in 1950s structural analysis and the name 'finite element' was introduced by R. W. Clough in 1960.",
  "chapters": [
   "advection",
   "discretization",
   "shocks"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Courant/",
   "https://mesonet2.agron.iastate.edu/pickup/CFL.pdf",
   "https://doi.org/10.1007/BF01448839",
   "https://doi.org/10.1090/S0002-9904-1943-07818-4"
  ]
 },
 {
  "id": "jan-burgers",
  "name": "Johannes Martinus (Jan) Burgers",
  "born": "1895",
  "died": "1981",
  "places": "Born Arnhem (13 Jan 1895); Delft University of Technology (professor of aerodynamics and hydrodynamics, Sept 1918 – Oct 1955); University of Maryland, College Park (1955–65); died Washington, DC (7 Jun 1981)",
  "tags": [
   "theory",
   "turbulence",
   "mathematics"
  ],
  "summary": "Burgers studied the one-dimensional equation u_t + u u_x = ν u_xx as a 'mathematical model' of turbulence (from 1939; fuller account 1948). It turned out to be a poor model of turbulence. It became instead the standard test problem for shock formation, numerical viscosity, conservative versus non-conservative discretisation and entropy conditions.",
  "contributions": [
   {
    "year": "1939",
    "what": "First papers using the model equation to illustrate relations in turbulence theory.",
    "work": "Mathematical examples illustrating relations occurring in the theory of turbulent fluid motion, Verhandelingen Kon. Ned. Akad. Wetensch. Amsterdam, Afd. Natuurkunde (1939)",
    "confidence": "medium"
   },
   {
    "year": "1948",
    "what": "Systematic account of the model equation, including steady shock-like solutions. It also contains the stretched vortex now called the Burgers vortex.",
    "work": "A mathematical model illustrating the theory of turbulence, Advances in Applied Mechanics 1, 171–199 (1948)",
    "confidence": "high"
   },
   {
    "year": "1939",
    "what": "Characterised crystal dislocations by a lattice vector (the Burgers vector).",
    "work": "Papers on dislocations in Proc. Kon. Ned. Akad. Wetensch. (1939)",
    "confidence": "medium"
   }
  ],
  "notation": [
   "'Burgers equation' (eponym; also 'Bateman–Burgers equation')",
   "Burgers vortex; Burgers vector"
  ],
  "anecdote": "He became Delft's professor of aerodynamics and hydrodynamics in September 1918 at the age of 23 and held the chair for 37 years before moving to Maryland.",
  "quote": "",
  "quote_source": "",
  "contested": "(1) Burgers was not the first to write the equation: Harry Bateman gave it in 1915 (Monthly Weather Review 43, 163–170), and J. D. Cole's 1951 paper already cited Bateman. (2) As a turbulence model it fails because it can be solved exactly. E. Hopf (Comm. Pure Appl. Math. 3, 1950) and J. D. Cole (Q. Appl. Math. 9, 1951) independently showed that u = −2ν (ln φ)_x turns it into the heat equation, so it has no chaotic dynamics. (3) Spelling: his name is Burgers, so 'Burgers' equation' or 'the Burgers equation'; 'Burger's equation' is a common misspelling.",
  "chapters": [
   "shocks",
   "turbulence"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Jan_Burgers",
   "https://en.wikipedia.org/wiki/Burgers%27_equation",
   "https://doi.org/10.1016/S0065-2156(08)70100-5",
   "https://doi.org/10.1002/cpa.3160030302"
  ]
 },
 {
  "id": "jakob-ackeret",
  "name": "Jakob Ackeret",
  "born": "1898",
  "died": "1981",
  "places": "Born Zürich (17 Mar 1898); ETH Zürich (diploma 1920; assistant to Stodola 1920–21); Göttingen with Prandtl (1921–26 per NDB, 1921–27 per NAE); Escher Wyss, Zürich (1927–31 per NDB, 1928–32 per NAE); ETH Zürich (extraordinary professor 1931, full professor of aerodynamics and institute director 1934 per NDB; retired 1967); died 26 Mar 1981 at Gossau ZH (NDB) or 1 Apr 1981 at Küsnacht (NAE)",
  "tags": [
   "notation",
   "theory",
   "experiment",
   "engineering"
  ],
  "summary": "Ackeret coined the term 'Mach number' in 1929. He also worked out linearised supersonic thin-aerofoil theory (1925) and built an early closed-circuit supersonic wind tunnel at ETH. His work links Göttingen aerodynamics to high-speed compressible flow.",
  "contributions": [
   {
    "year": "1925",
    "what": "Small-perturbation (linearised) theory of supersonic flow of a perfect gas over a thin aerofoil: the 'Ackeret theory', 'Ackeret lift' and 'Ackeret pressure'.",
    "work": "1925 paper, described in the NAE Memorial Tribute (Flax, with N. Rott)",
    "confidence": "high"
   },
   {
    "year": "1929",
    "what": "Introduced the term 'Mach number' ('Machzahl') for flow speed divided by the speed of sound, in his ETH inaugural lecture.",
    "work": "Der Luftwiderstand bei sehr großen Geschwindigkeiten (ETH inaugural lecture, 1929; printed in Schweizerische Bauzeitung 94, 1929)",
    "confidence": "high"
   },
   {
    "year": "1935",
    "what": "Closed-circuit supersonic wind tunnel at ETH, driven by a multistage compressor, which allowed Mach and Reynolds numbers to be varied independently. NDB calls it the world's first of its kind.",
    "work": "Neue Deutsche Biographie (M. Eckert, NDB-online 2023); NAE Memorial Tribute",
    "confidence": "medium"
   }
  ],
  "notation": [
   "'Machzahl' / Mach number, 1929"
  ],
  "anecdote": "Ackeret helped plan Prandtl's Kaiser-Wilhelm-Institut in Göttingen. N. Rott, who wrote the 1985 history of the Mach number, also relied on Ackeret's memory when he wrote that Prandtl had coined 'Reynolds number'. Rott later called this a remark that 'should never have been made' and corrected it in 1990.",
  "quote": "",
  "quote_source": "",
  "contested": "Ernst Mach (died 1916) never used the term 'Mach number'; Ackeret named the ratio after him in 1929. Biographical sources differ slightly on Ackeret's dates: the Neue Deutsche Biographie gives his death as 26 March 1981 at Gossau ZH and his Göttingen stay as 1921–26, whereas the NAE Memorial Tribute gives 1 April 1981 at Küsnacht and 1921–27.",
  "chapters": [
   "notation",
   "similarity",
   "shocks"
  ],
  "sources": [
   "https://www.nae.edu/File.aspx?id=188324",
   "https://www.deutsche-biographie.de/gnd118646745.html",
   "https://doi.org/10.1146/annurev.fl.17.010185.000245",
   "https://homepage.ntu.edu.tw/~wttsai/Adv_Fluid/Rott_Reynolds_1990.pdf"
  ]
 },
 {
  "id": "kurt-friedrichs",
  "name": "Kurt Otto Friedrichs",
  "born": "1901",
  "died": "1982",
  "places": "Göttingen; Aachen (1929); Braunschweig (from 1931); New York University (from 1937)",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "Co-author of the 1928 CFL paper and, with Courant, of 'Supersonic Flow and Shock Waves' (1948). His 1954 theory of symmetric hyperbolic systems supplies a sufficient stability condition for difference schemes (positive operators) that underlies energy-method stability proofs, and his name is on the Lax–Friedrichs scheme.",
  "contributions": [
   {
    "year": "1928",
    "what": "Co-author of the paper showing that difference schemes for hyperbolic equations converge only under a mesh-ratio (domain-of-dependence) condition.",
    "work": "Über die partiellen Differenzengleichungen der mathematischen Physik, Math. Ann. 100, 32–74 (with Courant and Lewy)",
    "confidence": "high"
   },
   {
    "year": "1948",
    "what": "Co-wrote the standard text on gas dynamics and shock waves.",
    "work": "Supersonic Flow and Shock Waves (with R. Courant)",
    "confidence": "high"
   },
   {
    "year": "1954",
    "what": "Developed the theory of symmetric hyperbolic linear systems. In Section 20 of their 1956 survey, Lax and Richtmyer present 'a sufficient condition, due to Friedrichs', for the stability of difference schemes built from positive operators, citing this paper.",
    "work": "Symmetric hyperbolic linear differential equations, Comm. Pure Appl. Math. 7(2), 345–392",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "When the CFL paper was written, Friedrichs was Courant's assistant at Göttingen. In 1929 he went to Aachen as assistant to Theodore von Kármán, a post Courant arranged, and from 1931 he held a professorship at Braunschweig. He left Germany and arrived in New York on 4 March 1937. There he worked with Courant again and became a co-founder of what is now the Courant Institute.",
  "quote": "for the case of the initial value problem for hyperbolic equations, convergence is obtained only if the ratio of the mesh widths in different directions satisfies certain inequalities which in turn depend on the position of the characteristics relative to the mesh.",
  "quote_source": "Courant, Friedrichs & Lewy (1928), introduction, English translation in IBM J. Res. Dev. 11 (1967), p. 215: https://mesonet2.agron.iastate.edu/pickup/CFL.pdf",
  "contested": "Lax published the Lax–Friedrichs scheme for nonlinear conservation laws in 1954, and Friedrichs's name is attached through his 1954 work on symmetric hyperbolic systems and positive difference operators. Godunov later recalled that A. I. Zhukov in Moscow had a method that 'exactly coincided' with the scheme Lax published 'one year later'.",
  "chapters": [
   "advection",
   "shocks"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Friedrichs/",
   "https://doi.org/10.1002/cpa.3160070206",
   "https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf",
   "https://arxiv.org/abs/0810.0649"
  ]
 },
 {
  "id": "andrey-kolmogorov",
  "name": "Andrey Nikolaevich Kolmogorov",
  "born": "1903",
  "died": "1987",
  "places": "Born Tambov (25 Apr 1903); Moscow State University (professor from 1931); Steklov Mathematical Institute (head of its probability and statistics department from 1938–39); died Moscow (20 Oct 1987)",
  "tags": [
   "turbulence",
   "theory",
   "mathematics"
  ],
  "summary": "In three short notes in 1941, Kolmogorov proposed that at high Reynolds number the small scales of turbulence are statistically universal, set only by the energy dissipation rate ε and the viscosity ν. This gives the dissipation length η = (ν³/ε)^1/4, the 2/3 law for velocity structure functions, and the exact 4/5 law. It also underlies the usual estimate that DNS grid counts grow roughly as Re^9/4.",
  "contributions": [
   {
    "year": "1941",
    "what": "Hypotheses of local isotropy and similarity, the inner (dissipation) length scale, and the 2/3 law for the second-order structure function.",
    "work": "The local structure of turbulence in incompressible viscous fluid for very large Reynolds numbers, Doklady Akad. Nauk SSSR 30 (1941); English translation in Proc. R. Soc. A 434, 9–13 (1991)",
    "confidence": "high"
   },
   {
    "year": "1941",
    "what": "Decay of isotropic turbulence.",
    "work": "Note on the decay (degeneration) of isotropic turbulence, Doklady Akad. Nauk SSSR 31 (1941)",
    "confidence": "medium"
   },
   {
    "year": "1941",
    "what": "Four-fifths law: the third-order longitudinal structure function equals −(4/5) ε r in the inertial range, derived from the Navier–Stokes equations with only mild assumptions.",
    "work": "Dissipation of energy in the locally isotropic turbulence, Doklady Akad. Nauk SSSR 32 (1941); English translation in Proc. R. Soc. A 434, 15–17 (1991)",
    "confidence": "high"
   },
   {
    "year": "1962",
    "what": "Refined similarity hypotheses that allow for fluctuations of the dissipation rate (intermittency), known as K62.",
    "work": "A refinement of previous hypotheses concerning the local structure of turbulence in a viscous incompressible fluid at high Reynolds number, J. Fluid Mech. 13, 82–85 (1962)",
    "confidence": "high"
   }
  ],
  "notation": [
   "Kolmogorov length scale η = (ν³/ε)^1/4 (eponym)",
   "'K41' and 'K62': later labels for the 1941 and 1962 theories"
  ],
  "anecdote": "The 1941 notes appeared in the Soviet Academy's Doklady during the war. Many Western researchers learned of them through G. K. Batchelor's 1947 review, 'Kolmogoroff's theory of locally isotropic turbulence' (Proc. Camb. Phil. Soc. 43, 533–559).",
  "quote": "",
  "quote_source": "",
  "contested": "(1) The famous E(k) ∝ ε^2/3 k^−5/3 spectrum does not appear in Kolmogorov's 1941 notes, which work with structure functions. His student A. M. Obukhov gave the spectral form in 1941. Onsager reached it independently (1945), as did Heisenberg and von Weizsäcker later. (2) Landau objected that the dissipation rate fluctuates in space. That objection led to the 1962 refinement, and K41 is now seen as an excellent first approximation with intermittency corrections. (3) Eyink and Sreenivasan (2006) give first pages 9, 538 and 16 for the three 1941 notes in volumes 30, 31 and 32.",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Kolmogorov/",
   "https://doi.org/10.1098/rspa.1991.0075",
   "https://doi.org/10.1098/rspa.1991.0076",
   "https://doi.org/10.1017/S0022112062000518"
  ]
 },
 {
  "id": "lars-onsager",
  "name": "Lars Onsager",
  "born": "1903",
  "died": "1976",
  "places": "Born Kristiania (Oslo) (27 Nov 1903); ETH Zürich (Debye's assistant, to 1928); Johns Hopkins (1928); Brown (to 1933); Yale (from 1933; J. Willard Gibbs Professor of Theoretical Chemistry from 1945; retired 1972); University of Miami; died Coral Gables, Florida (5 Oct 1976)",
  "tags": [
   "theory",
   "turbulence",
   "mathematics"
  ],
  "summary": "In 1945–49 Onsager independently derived the k^−5/3 spectrum. He argued that turbulence can keep dissipating energy as viscosity goes to zero only if the velocity field is rough, with a Hölder exponent no greater than 1/3. This 'Onsager conjecture' was settled in 2018. It ties turbulence theory to the non-smooth weak solutions that numerical schemes have to cope with.",
  "contributions": [
   {
    "year": "1945",
    "what": "Conference abstract deriving the inertial-range energy spectrum independently of Kolmogorov and Obukhov.",
    "work": "The distribution of energy in turbulence, abstract in the minutes of the American Physical Society meeting at Columbia University, 9–10 Nov 1945, Phys. Rev. 68, 281–288 (1945)",
    "confidence": "medium"
   },
   {
    "year": "1949",
    "what": "Statistical mechanics of 2-D point vortices, including negative-temperature states. Also the claim that ideal (inviscid) flow can dissipate energy only if the velocity's Hölder exponent is at most 1/3, with energy conserved above 1/3. He asserted this with almost no proof.",
    "work": "Statistical hydrodynamics, Il Nuovo Cimento 6 (Supplement 2), 279–287 (1949)",
    "confidence": "high"
   },
   {
    "year": "1968",
    "what": "Nobel Prize in Chemistry, for the reciprocal relations of irreversible thermodynamics (not for turbulence).",
    "work": "Nobel Prize in Chemistry 1968",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Onsager's conjecture' (later name for the 1/3 threshold)"
  ],
  "anecdote": "The threshold took nearly 70 years to settle. Eyink (1994) proved a slightly weaker form of the energy-conserving half, and Constantin, E and Titi (1994) proved it in a short argument. Philip Isett (Annals of Mathematics 188, 2018) proved the other half. For every Hölder exponent below 1/3 he constructed weak Euler solutions that fail to conserve energy, building on the convex-integration programme of De Lellis and Székelyhidi.",
  "quote": "",
  "quote_source": "",
  "contested": "Onsager stated the result with almost no proof; Isett writes that he 'asserted' the energy-conserving half, so 'conjecture' is a later label. Isett's 2018 solutions have compact support in time, so they fail to conserve energy, but they do not strictly dissipate it. Solutions that strictly dissipate energy were constructed by Buckmaster, De Lellis, Székelyhidi and Vicol (Comm. Pure Appl. Math. 72, 2019). His turbulence work was little known for decades; Eyink and Sreenivasan's 2006 review in Reviews of Modern Physics brought it back into view.",
  "chapters": [
   "turbulence",
   "shocks"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Lars_Onsager",
   "https://arxiv.org/abs/1608.08301",
   "https://doi.org/10.1007/BF02780991",
   "https://doi.org/10.1103/RevModPhys.78.87"
  ]
 },
 {
  "id": "john-von-neumann",
  "name": "John von Neumann",
  "born": "1903",
  "died": "1957",
  "places": "Budapest; Berlin; Princeton (Institute for Advanced Study); Los Alamos (consultant from 1943); Aberdeen Proving Ground",
  "tags": [
   "mathematics",
   "computation",
   "meteorology"
  ],
  "summary": "Pushed numerical shock computation at Los Alamos from 1944. He gave his name to the Fourier stability test, co-authored the 1950 artificial-viscosity paper, and organised the 1950 ENIAC weather forecasts.",
  "contributions": [
   {
    "year": "1944 (March)",
    "what": "Wrote what Morgan and Archer (2021) call the first 1D Lagrangian hydrodynamic method, a staggered-grid finite-difference scheme. He tested it on an outward-moving blast wave with IBM punched-card machines at the Army's Ballistic Research Laboratory, Aberdeen, in early 1944. The computed solutions oscillated at the shock front.",
    "work": "Proposal and analysis of a new numerical method for the treatment of hydrodynamical shock problems, OSRD report AMP 108.1R (Applied Mathematics Panel)",
    "confidence": "high"
   },
   {
    "year": "1940s; in print 1950",
    "what": "Fourier-mode ('von Neumann') stability analysis, inserting a single Fourier mode into the linearised difference equation and requiring that its amplification factor not grow. He never published a standalone account. A derivation appears in the 1950 Tellus paper he co-authored, and in 1956 Lax and Richtmyer call the necessary condition 'the Von Neumann condition'.",
    "work": "Charney, Fjørtoft & von Neumann, Tellus 2 (1950), Section V; Lax & Richtmyer, Comm. Pure Appl. Math. 9 (1956)",
    "confidence": "medium"
   },
   {
    "year": "1950 (March)",
    "what": "With Richtmyer, added an artificial dissipative term to the Lagrangian hydrodynamic equations so that shocks are captured automatically as narrow smooth fronts, and derived the stability condition for the resulting scheme.",
    "work": "A method for the numerical calculation of hydrodynamic shocks, J. Appl. Phys. 21(3), 232–237",
    "confidence": "high"
   },
   {
    "year": "1950 (computed March–April; paper received 1 Nov 1950)",
    "what": "Organised the first weather forecasts made on an electronic computer: four 24-hour barotropic vorticity forecasts on ENIAC.",
    "work": "Numerical integration of the barotropic vorticity equation (with J. G. Charney and R. Fjørtoft), Tellus 2(4), 237–254",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Von Neumann condition' (necessary condition for stability): the name is used in Lax & Richtmyer (1956)"
  ],
  "anecdote": "ENIAC's internal memory was too small for the forecast. Norman Phillips's memoir of Charney says von Neumann worked out a way to integrate the nonlinear vorticity equation using Fourier sums, cycling intermediate results out to punched cards and back in.",
  "quote": "We shall employ a heuristic procedure which is, however, patterned after the rigorous method of Courant, Friedrichs, and Lewy (1928).",
  "quote_source": "Charney, Fjørtoft & von Neumann, Tellus 2 (1950), Section V on computational stability: https://tellusjournal.org/articles/10.3402/tellusa.v2i4.8607",
  "contested": "The name 'von Neumann–Richtmyer artificial viscosity' compresses a longer history. Rudolf Peierls suggested an artificially large viscosity to von Neumann in a letter of 28 March 1944. Richtmyer worked the idea out in Los Alamos report LA-671 (March 1948), writing that von Neumann had pointed out the need for a dissipative mechanism. The joint paper appeared in 1950. The scheme von Neumann actually ran in 1944 had no artificial viscosity (Morgan & Archer, 2021). On stability analysis, the earliest printed derivation co-authored by von Neumann is in the 1950 Tellus paper, and O'Brien, Hyman and Kaplan (J. Math. Phys. 29 (1951), 223–251) gave an early systematic account.",
  "chapters": [
   "advection",
   "shocks",
   "discretization"
  ],
  "sources": [
   "https://arxiv.org/abs/2103.06249",
   "https://tellusjournal.org/articles/10.3402/tellusa.v2i4.8607",
   "https://doi.org/10.1063/1.1699639",
   "https://www.nasonline.org/wp-content/uploads/2024/06/charney-jule-g.pdf"
  ]
 },
 {
  "id": "hans-lewy",
  "name": "Hans Lewy",
  "born": "1904",
  "died": "1988",
  "places": "Göttingen; Rome and Paris (1929–31); Brown University (1933–35); University of California, Berkeley (from 1935); Aberdeen Proving Ground (WWII)",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "Third author of the 1928 CFL paper. Its central argument is that a difference scheme whose domain of dependence misses part of the true one cannot converge. He returned to convergence of difference equations in 1948 and is also known for a 1957 example of a smooth linear PDE with no solution.",
  "contributions": [
   {
    "year": "1926",
    "what": "Göttingen doctoral thesis on a numerical (difference) approach to boundary-value problems, according to MacTutor.",
    "work": "Doctoral thesis, Göttingen",
    "confidence": "medium"
   },
   {
    "year": "1928",
    "what": "Co-author of the CFL paper. For the wave equation on a rectangular mesh, the paper shows that the difference solution cannot in general converge when the mesh ratio puts the true domain of dependence outside the numerical one.",
    "work": "Über die partiellen Differenzengleichungen der mathematischen Physik, Math. Ann. 100, 32–74",
    "confidence": "high"
   },
   {
    "year": "1948",
    "what": "Further work on convergence of solutions of difference equations, cited in Lax and Richtmyer's 1956 survey.",
    "work": "On the convergence of solutions of difference equations, in Studies and Essays (Courant Anniversary Volume), Interscience, pp. 211–214",
    "confidence": "high"
   },
   {
    "year": "1957",
    "what": "Gave a smooth linear partial differential equation that has no solutions.",
    "work": "An example of a smooth linear partial differential equation without solution, Annals of Mathematics 66(1), 155–158",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "The argument for the condition is geometric. Changing the initial data near the ends of the wave equation's domain of dependence changes the true solution at a point. If those initial points lie outside the difference scheme's domain of dependence, the computed value at that point cannot respond, so refining the mesh at a fixed ratio cannot make it converge.",
  "quote": "From this follows a remarkable fact: if for the case k < 1 one lets h → 0, then the solution to the difference equation in general cannot converge to the solution of the differential equation.",
  "quote_source": "Courant, Friedrichs & Lewy (1928), Section 2, English translation in IBM J. Res. Dev. 11 (1967). Here h is the time step and kh the space step for u_tt − u_xx = 0: https://mesonet2.agron.iastate.edu/pickup/CFL.pdf",
  "contested": "Some informal accounts credit Lewy personally with the key domain-of-dependence insight; the published paper presents the condition as the joint work of all three authors. MacTutor describes the paper as giving criteria for 'the stability of numerical solutions', which reflects later usage; the paper itself speaks of convergence. MacTutor also gives the title with 'Differentialgleichungen'; the correct word is 'Differenzengleichungen' (difference equations).",
  "chapters": [
   "advection"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Lewy/",
   "https://mesonet2.agron.iastate.edu/pickup/CFL.pdf",
   "https://doi.org/10.2307/1970121"
  ]
 },
 {
  "id": "jean-leray",
  "name": "Jean Leray",
  "born": "1906",
  "died": "1998",
  "places": "Born Chantenay, near Nantes (7 Nov 1906); Nancy (professor from 1936); prisoner-of-war camp in Austria (Oflag XVIIA, 1940–45); Collège de France (from 1947); died La Baule (10 Nov 1998)",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "In 1934 Leray proved that the 3-D Navier–Stokes equations have weak solutions for all time, which he called 'turbulent solutions'. He built them by smoothing (mollifying) the advecting velocity and passing to a limit. Whether these solutions are smooth and unique is still open; it is a Millennium Prize problem. His name survives in the 'Leray projection' onto divergence-free fields and in 'Leray regularisation', the basis of some LES models.",
  "contributions": [
   {
    "year": "1934",
    "what": "Local existence of strong ('regular') solutions, with lower bounds on how norms must grow if a singularity forms. Global existence of weak solutions as limits of a regularised system in which the advecting velocity is mollified. Weak-strong uniqueness. The set of possible singular times is very small (of measure zero; Ożański and Pooley 2018 give an upper box-counting dimension of at most 1/2).",
    "work": "Sur le mouvement d'un liquide visqueux emplissant l'espace, Acta Mathematica 63, 193–248 (1934)",
    "confidence": "high"
   },
   {
    "year": "1934",
    "what": "With J. Schauder: topological degree methods for nonlinear equations (Leray–Schauder degree).",
    "work": "Topologie et équations fonctionnelles, Annales scientifiques de l'École Normale Supérieure (3) 51, 45–78 (1934)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'solutions turbulentes' (turbulent solutions), 1934: now called Leray or Leray–Hopf weak solutions",
   "'quasi-dérivées' (quasi-derivatives) for what are now weak derivatives",
   "'Leray projection' and 'Leray regularisation': later names honouring the 1934 paper"
  ],
  "anecdote": "Captured in 1940, he spent the war in a prisoner-of-war camp in Austria, where he helped organise a 'university in captivity' and became its rector. He feared he would be forced into war work if the Germans knew he was an expert in fluid mechanics, so he presented himself as a topologist. He worked only on topology there, which led to sheaves and spectral sequences.",
  "quote": "",
  "quote_source": "",
  "contested": "The term 'Leray projection' honours the paper. The decomposition of a vector field into divergence-free and gradient parts is much older (Helmholtz). Leray's 'turbulent solutions' are a mathematical idea; whether they have anything to do with physical turbulence is still debated. E. Hopf (1951) studied weak solutions on bounded domains, hence 'Leray–Hopf'.",
  "chapters": [
   "conservation",
   "pressure",
   "turbulence"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Leray/",
   "https://arxiv.org/abs/1708.09787",
   "https://doi.org/10.1007/BF02547354"
  ]
 },
 {
  "id": "magnus-hestenes",
  "name": "Magnus Rudolph Hestenes",
  "born": "1906",
  "died": "1991",
  "places": "Chicago; UCLA (1947–73); Institute for Numerical Analysis, National Bureau of Standards (at UCLA)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Co-inventor of the conjugate gradient method (1952). CG is the standard Krylov solver for symmetric positive-definite systems, such as the pressure Poisson equation in incompressible flow.",
  "contributions": [
   {
    "year": "1951",
    "what": "Early report on the method, written at the Institute for Numerical Analysis.",
    "work": "Iterative methods for solving linear equations, NAML Report 52-9, National Bureau of Standards (1951)",
    "confidence": "high"
   },
   {
    "year": "1952 (December)",
    "what": "With Stiefel, gave the method of conjugate gradients for symmetric and nonsymmetric systems. Without rounding error it gives the exact solution in n steps, it improves the estimate at every step, and it leaves the matrix unaltered, so it suits sparse systems from difference equations.",
    "work": "Methods of conjugate gradients for solving linear systems, J. Res. Nat. Bur. Standards 49(6), 409–436 (Research Paper 2379)",
    "confidence": "high"
   }
  ],
  "notation": [
   "'method of conjugate gradients' (1952); vectors x, y called 'conjugate' (A-orthogonal) when (x, Ay) = 0"
  ],
  "anecdote": "Stiefel and J. B. Rosser reported on the method at a Symposium on Simultaneous Linear Equations and the Determination of Eigenvalues, held by the Institute for Numerical Analysis on the UCLA campus on 23–25 August 1951. The joint paper was written while Stiefel was visiting the Bureau of Standards.",
  "quote": "The method of conjugate gradients was developed independently by E. Stiefel of the Institute of Applied Mathematics at Zurich and by M. R. Hestenes with the cooperation of J. B. Rosser, G. Forsythe, and L. Paige of the Institute for Numerical Analysis, National Bureau of Standards.",
  "quote_source": "Hestenes & Stiefel (1952), Introduction, J. Res. NBS 49(6), p. 409: https://nvlpubs.nist.gov/nistpubs/jres/049/jresv49n6p409_A1b.pdf",
  "contested": "CG is now taught as an iterative method, but the 1952 paper stressed that it finishes in n steps in exact arithmetic; the same paper also notes that each step improves the estimate and that the method suits sparse difference-equation systems. The paper says C. Lanczos had recently developed a closely related routine (NAML Report 52-13, 1951).",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://nvlpubs.nist.gov/nistpubs/jres/049/jresv49n6p409_A1b.pdf",
   "https://en.wikipedia.org/wiki/Magnus_Hestenes",
   "https://doi.org/10.6028/jres.049.044"
  ]
 },
 {
  "id": "rudolf-peierls",
  "name": "Rudolf Peierls",
  "born": "1907",
  "died": "1995",
  "places": "Zürich; Birmingham; New York, then Los Alamos (from June 1944 to the end of the war); Oxford",
  "tags": [
   "theory",
   "computation"
  ],
  "summary": "Included because he is the missing name in the artificial-viscosity story. In a letter of 28 March 1944 he suggested to von Neumann that shocks be smeared out by an artificially large viscosity. With Tony Skyrme he also built early shock-fitting Lagrangian schemes at Los Alamos.",
  "contributions": [
   {
    "year": "1944 (28 March)",
    "what": "Proposed, in a letter to von Neumann, replacing shock discontinuities with fronts of finite width by assuming a viscosity much larger than the real one.",
    "work": "Letter to J. von Neumann, reproduced in Morgan & Archer, arXiv:2103.06249 (2021), Appendix A",
    "confidence": "high"
   },
   {
    "year": "1944",
    "what": "Visited Los Alamos in February 1944 and moved there in June 1944, replacing Teller as T-1 group leader. He and Skyrme developed shock-fitting Lagrangian blast-wave schemes.",
    "work": "Los Alamos T-Division work (later reports by Skyrme, e.g. LAMS-562)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "But artificially, assuming a viscosity very much larger than the actual, you can obtain instead of the discontinuity a front of a finite width, and as long as this width is small compared to the scale of the phenomenon, this should otherwise give no trouble.",
  "quote_source": "R. Peierls, letter to J. von Neumann, 28 March 1944, as quoted in N. R. Morgan & B. J. Archer, 'On the origins of Lagrangian hydrodynamic methods' (2021): https://arxiv.org/abs/2103.06249",
  "contested": "Artificial viscosity is almost always attributed to von Neumann and Richtmyer (1950). Declassified Los Alamos documents show that Peierls proposed the idea in 1944 and that Richtmyer implemented it in 1948. Morgan and Archer say they write in part 'to correct historical omissions', including the contributions of Peierls and Skyrme.",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Peierls/",
   "https://arxiv.org/abs/2103.06249"
  ]
 },
 {
  "id": "eduard-stiefel",
  "name": "Eduard Stiefel",
  "born": "1909",
  "died": "1978",
  "places": "ETH Zürich (Institute for Applied Mathematics, founded 1948); National Bureau of Standards / UCLA (visiting, 1951–52)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "ETH Zürich mathematician who discovered the conjugate gradient method independently of Hestenes. He founded ETH's Institute for Applied Mathematics and brought Konrad Zuse's Z4 computer to Zürich.",
  "contributions": [
   {
    "year": "1948",
    "what": "Founded the Institute for Applied Mathematics at ETH to study the mathematical implications of computers.",
    "work": "ETH Institute for Applied Mathematics",
    "confidence": "high"
   },
   {
    "year": "1949–1950",
    "what": "Arranged for ETH to rent Zuse's Z4 (contract by July 1949; running in Zürich by August 1950).",
    "work": "Z4 at ETH",
    "confidence": "high"
   },
   {
    "year": "1951–1952",
    "what": "Reported on relaxation methods at the August 1951 INA symposium and published the conjugate gradient method with Hestenes.",
    "work": "Über einige Methoden der Relaxationsrechnung, Z. angew. Math. Phys. 3 (1952); Methods of conjugate gradients for solving linear systems, J. Res. NBS 49(6), 409–436 (1952)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "In our opinion, the conjugate gradient method is superior to the elimination method as a machine method.",
  "quote_source": "Hestenes & Stiefel (1952), Introduction, J. Res. NBS 49(6), p. 409: https://nvlpubs.nist.gov/nistpubs/jres/049/jresv49n6p409_A1b.pdf",
  "contested": "",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Stiefel/",
   "https://nvlpubs.nist.gov/nistpubs/jres/049/jresv49n6p409_A1b.pdf",
   "https://doi.org/10.6028/jres.049.044"
  ]
 },
 {
  "id": "robert-richtmyer",
  "name": "Robert Davis Richtmyer",
  "born": "1910",
  "died": "2003",
  "places": "Stanford; Washington, D.C. (Navy, WWII); Los Alamos; New York University (Courant Institute, 1953–64); University of Colorado Boulder (from 1964)",
  "tags": [
   "theory",
   "computation",
   "mathematics"
  ],
  "summary": "Physicist and mathematician who turned Los Alamos shock-computation practice into the artificial-viscosity method (1948 report; 1950 paper with von Neumann), co-proved the Lax equivalence theorem, and wrote the standard early textbook on difference methods.",
  "contributions": [
   {
    "year": "1948 (March)",
    "what": "Proposed smearing shocks over a few cells with a real or fictitious dissipation term instead of fitting them, and showed that the Rankine–Hugoniot jump conditions are still satisfied.",
    "work": "Proposed numerical method for calculation of shocks, Los Alamos report LA-671",
    "confidence": "high"
   },
   {
    "year": "1950",
    "what": "Published the artificial-viscosity method with von Neumann.",
    "work": "A method for the numerical calculation of hydrodynamic shocks, J. Appl. Phys. 21(3), 232–237",
    "confidence": "high"
   },
   {
    "year": "1956",
    "what": "Co-author of the equivalence theorem (for linear problems, a consistent scheme converges if and only if it is stable).",
    "work": "Survey of the stability of linear finite difference equations, Comm. Pure Appl. Math. 9(2), 267–293 (with P. D. Lax)",
    "confidence": "high"
   },
   {
    "year": "1957; 2nd ed. 1967 (with K. W. Morton)",
    "what": "Wrote the standard early text on difference methods; his Colorado obituary says it was written at Los Alamos. The 1990 AMS Steele Prize for expository writing went to Richtmyer for this book.",
    "work": "Difference Methods for Initial-Value Problems",
    "confidence": "medium"
   },
   {
    "year": "1960",
    "what": "Predicted the instability of an interface struck by a shock, now called the Richtmyer–Meshkov instability.",
    "work": "Taylor instability in shock acceleration of compressible fluids, Comm. Pure Appl. Math. 13(2), 297–319",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Richtmyer's 1948 report describes the practice it was replacing: for strong shocks it had been customary to interrupt the normal calculating routine at the discontinuity and do a special shock-fitting calculation based on Rankine–Hugoniot theory.",
  "quote": "It was pointed out by von Neumann that what is clearly needed is to take into account in the equations the dissipative mechanisms that operate in a physical shock to convert mechanical energy irreversibly into heat.",
  "quote_source": "R. D. Richtmyer, Los Alamos report LA-671 (March 1948), as quoted in N. R. Morgan & B. J. Archer, 'On the origins of Lagrangian hydrodynamic methods', arXiv:2103.06249 (2021): https://arxiv.org/abs/2103.06249",
  "contested": "The usual name shares credit for artificial viscosity unevenly. Peierls proposed an artificially large viscosity in a March 1944 letter to von Neumann. Richtmyer worked out the scheme in 1948 and credited von Neumann with the insight about dissipation. The 1950 paper carries the names of von Neumann and Richtmyer. On the textbook prize: the Steele Prize was awarded to Richtmyer alone, although the prize-winning second edition was co-written with Morton.",
  "chapters": [
   "shocks",
   "advection",
   "trust"
  ],
  "sources": [
   "https://www.colorado.edu/math/robert-davis-richtmyer",
   "https://arxiv.org/abs/2103.06249",
   "https://doi.org/10.1063/1.1699639",
   "https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf"
  ]
 },
 {
  "id": "klara-dan-von-neumann",
  "name": "Klára Dán von Neumann",
  "born": "1911",
  "died": "1963",
  "places": "Budapest; Princeton; Los Alamos; Aberdeen Proving Ground (ENIAC)",
  "tags": [
   "computation"
  ],
  "summary": "One of the first people to write programs in the modern stored-program style. She coded the 1948 ENIAC Monte Carlo neutron simulations for Los Alamos, and the 1950 weather-forecast team thanked her for teaching them ENIAC coding and checking their final code.",
  "contributions": [
   {
    "year": "1948",
    "what": "Turned John von Neumann's flow diagrams for a Monte Carlo neutron-chain-reaction calculation into ENIAC code. With Nicholas Metropolis she reconfigured ENIAC to run it, and she helped debug and run the tests. Haigh, Priestley and Rope date the first set of runs to April–May 1948 and a second set to autumn 1948.",
    "work": "ENIAC Monte Carlo simulations for Los Alamos; reconstructed in Haigh, Priestley & Rope, 'Los Alamos Bets on ENIAC: Nuclear Monte Carlo Simulations, 1947–1948', IEEE Annals of the History of Computing 36(3), 42–63 (2014)",
    "confidence": "high"
   },
   {
    "year": "1950",
    "what": "Taught the meteorologists of the 1950 ENIAC forecast how to code for ENIAC and checked their final code.",
    "work": "Acknowledgments of Charney, Fjørtoft & von Neumann, Tellus 2(4), 237–254",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "The 1950 forecasts were run at Aberdeen by five meteorologists (Charney, Fjørtoft, Freeman, Platzman and Smagorinsky) over 33 days and nights. Her contribution came earlier and is recorded in the paper's acknowledgments. Historian Thomas Haigh calls her a 'super-programmer' for the 1948 Monte Carlo work.",
  "quote": "The writers wish to thank Mrs K. von Neumann for instruction in the technique of coding for the Eniac and for checking the final code",
  "quote_source": "Charney, Fjørtoft & von Neumann (1950), Acknowledgments, Tellus 2(4): https://tellusjournal.org/articles/10.3402/tellusa.v2i4.8607",
  "contested": "Popular accounts, including Wikipedia, say she produced 'the first successful meteorological forecast on a computer'. The primary source supports a narrower role: coding instruction and checking the final code. The claim that she wrote 'the first modern computer code ever executed' refers to the 1948 Monte Carlo program. Haigh, Priestley and Rope argue for it, and it depends on their definition of the modern code paradigm.",
  "chapters": [
   "advection",
   "discretization"
  ],
  "sources": [
   "https://tellusjournal.org/articles/10.3402/tellusa.v2i4.8607",
   "https://computerhistory.org/blog/there-at-the-creation/",
   "https://doi.org/10.1109/MAHC.2014.40",
   "https://maths.ucd.ie/~plynch/Publications/BAMS-ENIAC.pdf"
  ]
 },
 {
  "id": "ragnar-fjortoft",
  "name": "Ragnar Fjørtoft",
  "born": "1913",
  "died": "1998",
  "places": "Oslo; Bergen (1939–46); Princeton (IAS, 1949–51 and 1953–54); Copenhagen (professor, 1952–55); Oslo (director, Norwegian Meteorological Institute, 1955–78)",
  "tags": [
   "meteorology",
   "theory",
   "turbulence"
  ],
  "summary": "Norwegian meteorologist on the 1950 ENIAC forecast team. His 1953 paper showed that conserving both energy and enstrophy constrains how energy moves between scales in 2D flow, a starting point for the 2D inverse-cascade picture that Kraichnan later developed.",
  "contributions": [
   {
    "year": "1950",
    "what": "Co-author of the first computer weather forecasts and one of the five meteorologists who ran the computations at Aberdeen.",
    "work": "Numerical integration of the barotropic vorticity equation, Tellus 2(4), 237–254 (with Charney and von Neumann)",
    "confidence": "high"
   },
   {
    "year": "after 1951 (exact year not given by the source)",
    "what": "Doctorate (dr.philos.) at the University of Oslo, taken after his return from the USA in 1951, on the stability of atmospheric currents. Norsk biografisk leksikon says it was called a masterpiece at the defence.",
    "work": "Doctoral thesis, University of Oslo",
    "confidence": "medium"
   },
   {
    "year": "1953",
    "what": "Analysed energy transfer among interacting wavenumber triads in 2D nondivergent flow and showed that it follows different laws from 3D flow.",
    "work": "On the changes in the spectral distribution of kinetic energy for two-dimensional, nondivergent flow, Tellus 5(3), 225–230",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "For the four ENIAC forecasts the team produced about 100,000 punched cards and performed about a million multiplications and divisions. Much of the time went on reading, printing, sorting and interfiling cards rather than on computing.",
  "quote": "the computation time for a 24-hour forecast was about 24 hours, that is, we were just able to keep pace with the weather.",
  "quote_source": "Charney, Fjørtoft & von Neumann (1950), Tellus 2, p. 245: https://tellusjournal.org/articles/10.3402/tellusa.v2i4.8607",
  "contested": "Fjørtoft's 1953 argument is often summarised as proving that 2D turbulence cannot send energy to small scales. Gkioulekas and Tung (Discrete Contin. Dyn. Syst. B 7, 2007) call this 'the widely accepted misconception that the argument by Fjørtøft forbids a downscale energy flux in two-dimensional turbulence altogether'. The argument constrains the net transfer; it does not rule out a small downscale energy flux. Dates: his Copenhagen professorship began in 1952, after his first Princeton stay (1949–51), and he returned to Princeton for a year in 1953.",
  "chapters": [
   "turbulence",
   "advection"
  ],
  "sources": [
   "https://nbl.snl.no/Ragnar_Fjørtoft",
   "https://doi.org/10.3402/tellusa.v5i3.8647",
   "https://tellusjournal.org/articles/10.3402/tellusa.v2i4.8607",
   "https://arxiv.org/abs/nlin/0507042"
  ]
 },
 {
  "id": "john-crank",
  "name": "John Crank",
  "born": "1916",
  "died": "2006",
  "places": "Manchester; Courtaulds Fundamental Research Laboratory (1945–57); Brunel (1957–81)",
  "tags": [
   "mathematics",
   "computation",
   "engineering"
  ],
  "summary": "Co-author of the 1947 Crank–Nicolson method, the implicit scheme for diffusion that averages the spatial operator between the old and new time levels (trapezoidal in time). It is second-order in time and stable for any time step, which is why it is used wherever explicit diffusion becomes too costly.",
  "contributions": [
   {
    "year": "1947 (January issue)",
    "what": "With Phyllis Nicolson, gave a practical implicit method for heat-conduction-type equations, including a nonlinear case with internal heat generation from a temperature-dependent chemical reaction.",
    "work": "A practical method for numerical evaluation of solutions of partial differential equations of the heat-conduction type, Proc. Cambridge Phil. Soc. 43(1), 50–67 (reprinted in Adv. Comput. Math. 6(1), 207–226, 1996)",
    "confidence": "high"
   },
   {
    "year": "1956",
    "what": "Wrote the standard reference on diffusion problems.",
    "work": "The Mathematics of Diffusion (Oxford, 1956)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "In the 1940s these calculations were done on mechanical desk calculators. MacTutor quotes Crank as saying that to 'burn a piece of wood' numerically could then take a week.",
  "quote": "",
  "quote_source": "",
  "contested": "MacTutor notes that the instability of L. F. Richardson's 1910 scheme for the heat equation 'was not recognised until lengthy numerical computations were carried out by Crank, Nicolson and others'. Textbooks often add that the 1947 paper was the first published description of von Neumann's stability analysis; that could not be confirmed here. 'Unconditionally stable' does not mean free of oscillations: with large time steps and sharp initial data, Crank–Nicolson produces decaying spurious oscillations, which is why backward Euler is sometimes preferred.",
  "chapters": [
   "stiffness"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Crank/",
   "https://doi.org/10.1017/S0305004100023197",
   "https://doi.org/10.1007/BF02127704"
  ]
 },
 {
  "id": "jule-charney",
  "name": "Jule Gregory Charney",
  "born": "1917",
  "died": "1981",
  "places": "Los Angeles (UCLA); Chicago; Oslo; Princeton (IAS meteorology group, 1948–56); MIT (from 1956)",
  "tags": [
   "meteorology",
   "theory",
   "computation"
  ],
  "summary": "Theoretical meteorologist whose scale analysis justified the quasi-geostrophic equations. Those equations filter out fast sound and gravity waves, so early computers could take practical time steps. He led the IAS meteorology group and the 1950 ENIAC forecasts.",
  "contributions": [
   {
    "year": "1947 (October)",
    "what": "Explained the growth of mid-latitude storms as an instability of the westerly flow (baroclinic instability).",
    "work": "The dynamics of long waves in a baroclinic westerly current, J. Meteorology 4(5), 136–162",
    "confidence": "high"
   },
   {
    "year": "1948",
    "what": "Used scale analysis to show that the quasi-geostrophic system is a consistent approximation for large-scale atmospheric motion.",
    "work": "On the scale of atmospheric motions, Geofysiske Publikasjoner 17(2)",
    "confidence": "high"
   },
   {
    "year": "1948",
    "what": "Invited by von Neumann in early 1948 to head the meteorology group of the IAS Electronic Computer Project.",
    "work": "IAS Meteorology Project",
    "confidence": "high"
   },
   {
    "year": "1950",
    "what": "Lead author of the first computer weather forecasts (ENIAC, March–April 1950).",
    "work": "Numerical integration of the barotropic vorticity equation, Tellus 2(4), 237–254",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Charney sent the ENIAC forecasts to Lewis Fry Richardson, whose 1922 hand forecast had failed badly. Richardson had his wife judge whether the initial or the forecast maps looked more like the verifying maps. He replied that the forecast 'has it on average, but only slightly', and called the result 'an enormous scientific advance on the single, and quite wrong, result in which Richardson (1922) ended.'",
  "quote": "It mattered little that the twenty-four-hour prediction was twenty-four hours in the making. That was purely a technological problem. Two years later we were able to make the same prediction on our own machine [von Neumann's IAS computer] in five minutes",
  "quote_source": "Charney (1955), address to the National Academy of Sciences, as quoted in P. Lynch, 'The ENIAC Forecasts: A Recreation', BAMS (January 2008); the bracketed words are Lynch's: https://maths.ucd.ie/~plynch/Publications/BAMS-ENIAC.pdf",
  "contested": "Charney is often credited alone with quasi-geostrophic theory. His memoirist Norman Phillips notes that in 1947 other meteorologists were close to formulating the same system, and that A. Eliassen in Oslo had already done so. Charney's distinctive step was showing by scale analysis that the system was consistent.",
  "chapters": [
   "advection",
   "discretization"
  ],
  "sources": [
   "https://www.nasonline.org/wp-content/uploads/2024/06/charney-jule-g.pdf",
   "https://maths.ucd.ie/~plynch/Publications/BAMS-ENIAC.pdf",
   "https://tellusjournal.org/articles/10.3402/tellusa.v2i4.8607",
   "https://doi.org/10.1175/1520-0469(1947)004<0136:TDOLWI>2.0.CO;2"
  ]
 },
 {
  "id": "phyllis-nicolson",
  "name": "Phyllis Nicolson (née Lockett)",
  "born": "1917",
  "died": "1968",
  "places": "Manchester (Hartree's wartime Ministry of Supply group, 1940–45); Girton College, Cambridge (research fellow, 1946–49); Leeds (from 1950)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Mathematical physicist from Douglas Hartree's Manchester group and co-author of the 1947 Crank–Nicolson scheme, still the default second-order implicit method for diffusion terms.",
  "contributions": [
   {
    "year": "1946",
    "what": "Manchester PhD in three parts. One part treats heat flow in a medium where heat is released internally by chemical processes, the problem behind the Crank–Nicolson paper.",
    "work": "Thesis: Three Problems in Theoretical Physics (University of Manchester)",
    "confidence": "high"
   },
   {
    "year": "1947",
    "what": "With John Crank, developed an implicit time-stepping method for nonlinear heat conduction with internal heat generation. It removed the oscillations of an earlier explicit approach and allowed larger time steps.",
    "work": "A practical method for numerical evaluation of solutions of partial differential equations of the heat-conduction type, Proc. Cambridge Phil. Soc. 43(1), 50–67",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Hartree was asked to examine a wartime nonlinear heat-conduction problem in which the heat source depended on temperature. According to Charlotte Froese Fischer's biography of Hartree, quoted by MacTutor, he chose Crank and Nicolson to work on it.",
  "quote": "",
  "quote_source": "",
  "contested": "The method is very often misspelled 'Crank–Nicholson'. The original paper is signed P. Nicolson.",
  "chapters": [
   "stiffness"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Nicolson/",
   "https://doi.org/10.1017/S0305004100023197"
  ]
 },
 {
  "id": "edward-lorenz",
  "name": "Edward Norton Lorenz",
  "born": "1917",
  "died": "2008",
  "places": "MIT (Cambridge, Massachusetts)",
  "tags": [
   "meteorology",
   "theory",
   "computation"
  ],
  "summary": "In 1961 he found that restarting a 12-variable weather model from rounded printout values produced a completely different solution. In 1963 he reduced this to a 3-variable convection model that is deterministic, non-periodic and sensitive to initial conditions. The result limits what any simulation can predict, however accurate its numerics.",
  "contributions": [
   {
    "year": "1961",
    "what": "Restarted a 12-equation model on a Royal McBee LGP-30 using numbers typed in from a printout. The printout showed three decimal places while the machine held six, and the restarted run diverged completely.",
    "work": "Numerical experiment described in K. Emanuel, NAS Biographical Memoir (2011)",
    "confidence": "high"
   },
   {
    "year": "1963 (March)",
    "what": "Three-variable model obtained by truncating a convection model, with nonperiodic solutions that are unstable to small changes in the initial state. Its solutions trace what was later called a 'strange attractor'.",
    "work": "Deterministic nonperiodic flow, J. Atmos. Sci. 20(2), 130–141",
    "confidence": "high"
   },
   {
    "year": "1963",
    "what": "Discussed the limits of predictability, using a sea-gull metaphor.",
    "work": "The predictability of hydrodynamic flow, Trans. New York Acad. Sci. 25(4), 409–432",
    "confidence": "high"
   },
   {
    "year": "1972",
    "what": "Gave an AAAS talk whose title spread the image of a butterfly changing the weather.",
    "work": "Predictability: Does the Flap of a Butterfly's Wings in Brazil Set off a Tornado in Texas?",
    "confidence": "medium"
   }
  ],
  "notation": [
   "'butterfly effect': popularised through the title of his 1972 AAAS talk and Gleick's 1987 book; Emanuel says the butterfly term was probably introduced by Smagorinsky (1969)"
  ],
  "anecdote": "After restarting the run, Lorenz stepped out for a cup of coffee. When he returned about an hour later, the new solution matched the old one for the first few time steps, then gradually diverged until the two differed as much as any two randomly chosen states of the system.",
  "quote": "One meteorologist remarked that if the theory were correct, one flap of a sea gull's wings would be enough to alter the course of the weather forever. The controversy has not yet been settled, but the most recent evidence seems to favor the gulls.",
  "quote_source": "E. N. Lorenz (1963), 'The predictability of hydrodynamic flow', Trans. N.Y. Acad. Sci. 25, as quoted in K. Emanuel, 'Edward Norton Lorenz 1917–2008', NAS Biographical Memoir (2011), note 6: https://www.nasonline.org/wp-content/uploads/2024/06/lorenz-edward.pdf",
  "contested": "Lorenz's first metaphor was a sea gull, not a butterfly. Emanuel writes that the butterfly term 'was probably introduced by Joseph Smagorinsky (1969)'. The idea is older: W. S. Franklin (1898) wrote that 'the flight of a grasshopper in Montana may turn a storm aside from Philadelphia to New York'. The 3-variable model came from a seven-variable convection model that Barry Saltzman showed him; in one solution four of the seven variables went to zero. Nonperiodic behaviour in low-order systems had been noted before, by Poincaré and by Allan (1962) for the Rikitake dynamo equations. The phrase 'strange attractor' is later terminology, not Lorenz's 1963 wording. The exact title of the 1972 talk is the widely quoted one but was not checked against a primary record. The popular figures '0.506127 versus 0.506' come from Gleick's retelling and were not checked.",
  "chapters": [
   "turbulence",
   "discretization",
   "trust"
  ],
  "sources": [
   "https://www.nasonline.org/wp-content/uploads/2024/06/lorenz-edward.pdf",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Lorenz_Edward/",
   "https://doi.org/10.1175/1520-0469(1963)020<0130:DNF>2.0.CO;2",
   "https://doi.org/10.1111/j.2164-0947.1963.tb01464.x"
  ]
 },
 {
  "id": "alexander-obukhov",
  "name": "Alexander Mikhailovich Obukhov",
  "born": "1918",
  "died": "1989",
  "places": "Born Saratov (5 May 1918); Moscow State University (doctorate under Kolmogorov); Moscow; died Moscow (3 Dec 1989)",
  "tags": [
   "turbulence",
   "meteorology",
   "theory"
  ],
  "summary": "A student of Kolmogorov, Obukhov gave in 1941 the spectral form of the inertial range, E(k) ∝ ε^2/3 k^−5/3. This is the version of K41 most learners meet and the one checked against DNS and LES spectra. His 1946 length scale for stratified surface layers became the basis of Monin–Obukhov similarity theory, used in atmospheric models.",
  "contributions": [
   {
    "year": "1941",
    "what": "Inertial-range energy spectrum k^−5/3, equivalent to the Fourier transform of Kolmogorov's 2/3 law. A longer paper followed in Izv. Akad. Nauk SSSR, Ser. Geogr. Geofiz. 5, 453 (1941).",
    "work": "Note on the spectral energy distribution in a turbulent flow, Doklady Akad. Nauk SSSR 32, 22–24 (1941); volume and first page as cited by Eyink and Sreenivasan (2006)",
    "confidence": "high"
   },
   {
    "year": "1946",
    "what": "Universal length scale for exchange processes in the atmospheric surface layer (the Obukhov length).",
    "work": "Turbulence in an atmosphere with a non-uniform temperature, Trudy Inst. Teor. Geofiz. AN SSSR 1, 95–115 (1946); English translation in Boundary-Layer Meteorol. 2, 7–29 (1971)",
    "confidence": "high"
   },
   {
    "year": "1954",
    "what": "With A. S. Monin: similarity laws for turbulent mixing in the surface layer.",
    "work": "Basic laws of turbulent mixing in the surface layer of the atmosphere, Tr. Geofiz. Inst. Akad. Nauk SSSR 24(151), 163–187 (1954)",
    "confidence": "high"
   }
  ],
  "notation": [
   "Obukhov length L (1946)",
   "Monin–Obukhov similarity (1954)"
  ],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "The −5/3 law is usually called 'Kolmogorov's spectrum', although it was Obukhov who wrote it in spectral form in 1941. Onsager (1945) also reached it independently. The exact English title of the 1941 Doklady note varies between translations.",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Alexander_Obukhov",
   "https://doi.org/10.1007/s10546-006-9048-6",
   "https://doi.org/10.1007/bf00122458",
   "https://doi.org/10.1103/RevModPhys.78.87"
  ]
 },
 {
  "id": "stanley-frankel",
  "name": "Stanley Phillips Frankel",
  "born": "1919",
  "died": "1978",
  "places": "Los Alamos (T Division, from 1943); Moore School, Philadelphia (ENIAC, 1945); Caltech",
  "tags": [
   "computation",
   "mathematics"
  ],
  "summary": "Included as the independent co-discoverer of over-relaxation (1950) and co-author of the DuFort–Frankel scheme (1953). He also designed the LGP-30, the desk computer on which Lorenz found sensitive dependence on initial conditions.",
  "contributions": [
   {
    "year": "1950",
    "what": "Analysed convergence rates of iterative methods for elliptic difference equations and introduced over-relaxation, at the same time as David Young.",
    "work": "Convergence rates of iterative treatments of partial differential equations, Math. Tables Aids Comput. 4(30), 65–75",
    "confidence": "high"
   },
   {
    "year": "1953",
    "what": "With E. C. DuFort, gave a three-level explicit scheme for parabolic equations without the usual explicit time-step limit for stability.",
    "work": "Stability conditions in the numerical treatment of parabolic differential equations, Math. Tables Aids Comput. 7, 135–152 (with E. C. DuFort)",
    "confidence": "high"
   },
   {
    "year": "1956",
    "what": "Designed the LGP-30 single-user desk computer, licensed from his Caltech MINAC design.",
    "work": "LGP-30 (Librascope/Royal McBee)",
    "confidence": "medium"
   }
  ],
  "notation": [],
  "anecdote": "According to Wikipedia (not checked against a primary source), in August 1945 Frankel and Nicholas Metropolis went to the Moore School to learn to program ENIAC, and that autumn helped set up one of its first large calculations for Los Alamos.",
  "quote": "",
  "quote_source": "",
  "contested": "SOR is often credited to Young alone, but Frankel's 1950 paper is an independent, simultaneous discovery. The DuFort–Frankel scheme is often described as 'unconditionally stable' as if that settled the matter. Lax and Richtmyer (1956) showed that it is always stable but that 'the time increment must be limited on account of the consistency condition': it approximates the heat equation only if Δt/Δx goes to zero as the mesh is refined.",
  "chapters": [
   "solvers",
   "stiffness"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Stan_Frankel",
   "https://doi.org/10.1090/S0025-5718-1950-0046149-3",
   "https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf"
  ]
 },
 {
  "id": "olga-ladyzhenskaya",
  "name": "Olga Alexandrovna Ladyzhenskaya",
  "born": "1922",
  "died": "2004",
  "places": "Kologriv; Leningrad / St Petersburg (Leningrad State University; Steklov Institute, head of the Laboratory of Mathematical Physics 1961–91)",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "Proved global existence and uniqueness for the 2D Navier–Stokes equations in bounded domains (1958–59) and wrote the standard mathematical monograph on viscous incompressible flow (1961). Her name is on the inf-sup (LBB) condition, which tells you which velocity–pressure discretisations avoid spurious pressure modes such as the checkerboard.",
  "contributions": [
   {
    "year": "1949",
    "what": "Doctoral dissertation (comparable to a habilitation) developing finite-difference methods for linear and quasilinear hyperbolic systems, used to prove that boundary-value problems are solvable.",
    "work": "Doctoral dissertation, Leningrad",
    "confidence": "high"
   },
   {
    "year": "1953",
    "what": "First book, which used the finite-difference method to prove solvability of initial-boundary-value problems for general second-order hyperbolic equations.",
    "work": "Mixed Problems for a Hyperbolic Equation",
    "confidence": "high"
   },
   {
    "year": "1958",
    "what": "Announced a solution 'in the large' of the boundary-value problem for the Navier–Stokes equations in two space variables.",
    "work": "Doklady Akademii Nauk SSSR 123(3), 427–429",
    "confidence": "medium"
   },
   {
    "year": "1959 (August)",
    "what": "Global (in time) existence and uniqueness for the nonstationary 2D Navier–Stokes boundary-value problem.",
    "work": "Solution 'in the large' of the nonstationary boundary value problem for the Navier-Stokes system with two space variables, Comm. Pure Appl. Math. 12(3), 427–433",
    "confidence": "high"
   },
   {
    "year": "1961 (Russian); 1963 (English)",
    "what": "Monograph on the mathematical theory of viscous incompressible flow; second English edition 1969.",
    "work": "The Mathematical Theory of Viscous Incompressible Flow (Gordon and Breach)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Like Courant, Friedrichs and Lewy in 1928, she used difference schemes as a proof technique: her 1949 dissertation and 1953 book build existence theory for hyperbolic problems on finite-difference approximations.",
  "quote": "",
  "quote_source": "",
  "contested": "The name 'Ladyzhenskaya–Babuška–Brezzi (LBB) condition' joins her continuous estimate to the discrete inf-sup theory that Babuška and Brezzi developed in the early 1970s (medium). Her 2D result does not settle the 3D problem: global regularity of the 3D Navier–Stokes equations is still open and is one of the Clay Millennium Problems. The 1958 Doklady citation was not checked against the original (medium).",
  "chapters": [
   "conservation",
   "pressure"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Ladyzhenskaya/",
   "https://doi.org/10.1002/cpa.3160120303",
   "https://en.wikipedia.org/wiki/Olga_Ladyzhenskaya"
  ]
 },
 {
  "id": "norman-phillips",
  "name": "Norman A. Phillips",
  "born": "1923",
  "died": "2019",
  "places": "Princeton (IAS Electronic Computer Project); MIT (1956–74); US National Meteorological Center (from 1974)",
  "tags": [
   "meteorology",
   "computation",
   "turbulence"
  ],
  "summary": "Ran the first general circulation model of the atmosphere on the IAS computer (1955; published 1956), and the run was ended by numerical error. His 1959 analysis of nonlinear computational instability showed that aliasing in the nonlinear terms can wreck a long run even when the linear stability test is satisfied.",
  "contributions": [
   {
    "year": "1955 (computed and presented); April 1956 (published)",
    "what": "Two-level quasi-geostrophic model of a beta-plane channel on a 16 × 17 grid, run for about a month of simulated time. The abstract says the run started 'with an atmosphere in relative rest', with heating and friction included. A jet, surface westerlies and a large disturbance developed (Lynch reports a wave of about 6000 km), with energetics in qualitative agreement with observations. The abstract also states: 'Truncation errors eventually put an end to the forecast by producing a large fictitious increase in energy.'",
    "work": "The general circulation of the atmosphere: a numerical experiment, Q. J. R. Meteorol. Soc. 82(352), 123–164",
    "confidence": "high"
   },
   {
    "year": "1959",
    "what": "Showed how short waves produced by nonlinear products alias onto resolved waves and can grow without bound (nonlinear computational instability).",
    "work": "An example of non-linear computational instability, in The Atmosphere and the Sea in Motion (Rossby Memorial Volume), Rockefeller Institute Press, pp. 501–504",
    "confidence": "medium"
   },
   {
    "year": "1995",
    "what": "Wrote the National Academy of Sciences biographical memoir of Jule Charney.",
    "work": "Biographical Memoirs of the NAS, vol. 66",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Von Neumann was so impressed by the experiment that he organised a conference at Princeton in October 1955, 'Application of Numerical Integration Techniques to the Problem of the General Circulation'. The paper won the Royal Meteorological Society's first Napier Shaw Memorial Prize.",
  "quote": "",
  "quote_source": "",
  "contested": "Correction to the earlier draft: the 1956 abstract itself confirms that the run broke down numerically, through truncation errors that produced 'a large fictitious increase in energy'. This breakdown is usually said to have motivated the 1959 aliasing paper. Lynch (2008) says the run started 'from a zonal flow with small random perturbations', but the abstract says it started from rest. The zonal flow built up under the imposed heating before the disturbance grew, so Lynch is describing a later stage. Lynch also calls the IAS computer 'MANIAC I'. The IAS machine and the Los Alamos MANIAC were separate computers of similar design, so 'IAS computer' is the safer name.",
  "chapters": [
   "turbulence",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1002/qj.49708235202",
   "https://maths.ucd.ie/~plynch/Publications/JCP.pdf",
   "https://en.wikipedia.org/wiki/Norman_A._Phillips"
  ]
 },
 {
  "id": "david-m-young",
  "name": "David M. Young Jr.",
  "born": "1923",
  "died": "2008",
  "places": "Harvard; University of Maryland; aerospace industry (Los Angeles); University of Texas at Austin (from 1958)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "His 1950 Harvard thesis gave the theory of successive over-relaxation (SOR). For the model Poisson problem, the optimal over-relaxation factor cuts the iteration count of Gauss–Seidel from order 1/h² to order 1/h. SOR was the workhorse pressure solver for decades.",
  "contributions": [
   {
    "year": "1950 (thesis dated 1 May 1950)",
    "what": "Harvard PhD under Garrett Birkhoff: theory of SOR for matrices with 'property A', including the optimal relaxation factor.",
    "work": "Iterative methods for solving partial difference equations of elliptic type (PhD thesis)",
    "confidence": "high"
   },
   {
    "year": "1954",
    "what": "Journal publication of the thesis results.",
    "work": "Iterative methods for solving partial difference equations of elliptic type, Trans. Amer. Math. Soc. 76(1), 92–111",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "SOR was found at the same time by Stanley Frankel at Caltech, whose paper 'Convergence rates of iterative treatments of partial differential equations' appeared in Math. Tables Aids Comput. 4 (1950), 65–75, so credit is usually shared. Over-relaxation as a practice is older: the hand relaxation methods of L. F. Richardson and of R. V. Southwell's school already over-corrected by rule of thumb. What Young and Frankel added was the theory and the optimal factor for machine iteration.",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/David_M._Young_Jr.",
   "https://doi.org/10.1090/S0002-9947-1954-0059635-7",
   "https://doi.org/10.1090/S0025-5718-1950-0046149-3"
  ]
 },
 {
  "id": "brian-spalding",
  "name": "Dudley Brian Spalding",
  "born": "1923",
  "died": "2016",
  "places": "Oxford (BA 1944); Cambridge (PhD 1952); Imperial College London (from 1954); CHAM Ltd (London, founded 1969); Purdue (late 1970s–early 1980s)",
  "tags": [
   "engineering",
   "computation",
   "turbulence"
  ],
  "summary": "Led the Imperial College group where much engineering CFD began. With Patankar he produced SIMPLE (1972); with Launder he wrote 'Mathematical Models of Turbulence' (1972) and the 1974 paper that became the standard citation for the k–ε model. His company CHAM released PHOENICS (1981), an early general-purpose commercial CFD code.",
  "contributions": [
   {
    "year": "1969",
    "what": "Founded Combustion Heat and Momentum Ltd (CHAM), renamed Concentration Heat and Momentum in 1974.",
    "work": "CHAM",
    "confidence": "high"
   },
   {
    "year": "1972",
    "what": "Pressure-correction procedure with Patankar (the basis of SIMPLE).",
    "work": "A calculation procedure for heat, mass and momentum transfer in three-dimensional parabolic flows, Int. J. Heat Mass Transfer 15(10), 1787–1806",
    "confidence": "high"
   },
   {
    "year": "1972",
    "what": "Book on turbulence closures, with B. E. Launder.",
    "work": "Mathematical Models of Turbulence (Academic Press)",
    "confidence": "high"
   },
   {
    "year": "1974 (March)",
    "what": "With Launder, set out the k–ε two-equation model with the constants that became standard, alongside other turbulence models for engineering flow computation.",
    "work": "The numerical computation of turbulent flows, Comput. Methods Appl. Mech. Eng. 3(2), 269–289 (with B. E. Launder)",
    "confidence": "high"
   },
   {
    "year": "1978 (conceived); 1981 (released)",
    "what": "General-purpose CFD code PHOENICS.",
    "work": "PHOENICS",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "The 'standard k–ε model' has two usual citations, both confirmed here: Jones and Launder, 'The prediction of laminarization with a two-equation model of turbulence', Int. J. Heat Mass Transfer 15(2), 301–314 (1972), and Launder and Spalding, Comput. Methods Appl. Mech. Eng. 3(2), 269–289 (1974). Two-equation models existed earlier, for example Harlow and Nakayama's 1968 work at Los Alamos, so k–ε was a refinement, not the first model of its type.",
  "chapters": [
   "pressure",
   "turbulence"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Brian_Spalding",
   "https://doi.org/10.1016/0017-9310(72)90054-3",
   "https://doi.org/10.1016/0045-7825(74)90029-2",
   "https://doi.org/10.1016/0017-9310(72)90076-2"
  ]
 },
 {
  "id": "joseph-smagorinsky",
  "name": "Joseph Smagorinsky",
  "born": "1924",
  "died": "2005",
  "places": "US Weather Bureau; Aberdeen (ENIAC, 1950); General Circulation Research Section, later GFDL (director 1955–1983); Princeton",
  "tags": [
   "meteorology",
   "computation",
   "turbulence"
  ],
  "summary": "Founding director of what became NOAA's Geophysical Fluid Dynamics Laboratory. In his 1963 primitive-equation circulation experiments he used a horizontal eddy viscosity that scales with the square of the grid spacing times the local deformation rate. That formula became the standard subgrid model in large-eddy simulation.",
  "contributions": [
   {
    "year": "1950",
    "what": "One of the five meteorologists who ran the first ENIAC forecasts at Aberdeen.",
    "work": "Acknowledged in Charney, Fjørtoft & von Neumann, Tellus 2 (1950)",
    "confidence": "high"
   },
   {
    "year": "1963 (March)",
    "what": "General circulation experiments with the primitive equations, using a nonlinear, deformation-dependent lateral eddy viscosity to represent unresolved mixing and control small-scale noise.",
    "work": "General circulation experiments with the primitive equations: I. The basic experiment, Monthly Weather Review 91(3), 99–164",
    "confidence": "medium"
   },
   {
    "year": "1955–1983",
    "what": "Directed the group that became the General Circulation Research Laboratory (1959) and then GFDL (1963), which moved to Princeton in 1968.",
    "work": "GFDL",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "The 'Smagorinsky model' was built for an atmospheric general circulation model, not for engineering turbulence. Its use as a subgrid-scale model for LES came through Douglas Lilly and James Deardorff; Deardorff's 1970 channel-flow LES used eddy coefficients proportional to the local velocity deformation. The usual statement that Lilly fixed the model constant from Kolmogorov theory in 1966–67 was not checked here (medium). Kerry Emanuel's NAS memoir of Lorenz says the term 'butterfly' (as in butterfly effect) 'was probably introduced by Joseph Smagorinsky (1969)', not by Lorenz.",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Joseph_Smagorinsky",
   "https://doi.org/10.1175/1520-0493(1963)091<0099:GCEWTP>2.3.CO;2",
   "https://www.nasonline.org/wp-content/uploads/2024/06/lorenz-edward.pdf",
   "https://maths.ucd.ie/~plynch/Publications/BAMS-ENIAC.pdf"
  ]
 },
 {
  "id": "peter-lax",
  "name": "Peter David Lax",
  "born": "1926",
  "died": "2025",
  "places": "Budapest; Los Alamos (Manhattan Project 1945–46; staff member 1950; later consultant); New York University (Courant Institute)",
  "tags": [
   "mathematics",
   "theory",
   "computation"
  ],
  "summary": "Set the mathematical rules for computing shocks: weak solutions and conservative difference schemes (Lax–Friedrichs 1954, Lax–Wendroff 1960), and, with Richtmyer, the equivalence theorem that for a consistent linear scheme stability is equivalent to convergence.",
  "contributions": [
   {
    "year": "1954 (February)",
    "what": "Treated discontinuous (weak) solutions of nonlinear conservation laws and how to compute them with a conservative difference scheme, now known as the Lax–Friedrichs scheme.",
    "work": "Weak solutions of nonlinear hyperbolic equations and their numerical computation, Comm. Pure Appl. Math. 7(1), 159–193",
    "confidence": "high"
   },
   {
    "year": "1954 (seminar); 1956 (print; received October 1955)",
    "what": "With Richtmyer, proved that for a properly posed linear initial-value problem and a consistent difference approximation, stability is necessary and sufficient for convergence. A footnote says the general considerations were 'originally presented in that generality' at a Lax seminar at New York University in January 1954.",
    "work": "Survey of the stability of linear finite difference equations, Comm. Pure Appl. Math. 9(2), 267–293",
    "confidence": "high"
   },
   {
    "year": "1959 (report); 1960 (journal)",
    "what": "With Burton Wendroff, introduced second-order conservative schemes and proved that a convergent conservative scheme converges to a weak solution (the Lax–Wendroff theorem).",
    "work": "Systems of conservation laws, Los Alamos report LA-2285 (19 April 1959; catalogued under Lax alone); Comm. Pure Appl. Math. 13(2), 217–237 (with B. Wendroff)",
    "confidence": "high"
   },
   {
    "year": "2005",
    "what": "Abel Prize. The citation mentions, among other work, the Lax–Friedrichs and Lax–Wendroff schemes and the Lax equivalence theorem.",
    "work": "Abel Prize citation",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Godunov recalled reading Lax's 1954 paper only after defending his own thesis in November 1954. He said that if he had received it a year earlier, 'Godunov's scheme' would never have been constructed.",
  "quote": "unless, of course, the initial data are chosen with diabolical care so as to be exactly free of those components that would be unduly amplified if they were present.",
  "quote_source": "Lax & Richtmyer (1956), Comm. Pure Appl. Math. 9, p. 268, explaining why stability matters even with no rounding error: https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf",
  "contested": "The 'Lax equivalence theorem' was published jointly with Richtmyer and is also called the Lax–Richtmyer theorem; the Abel committee says Lax established it 'inspired by Richtmyer'. It is a linear theorem. For nonlinear shock problems, a convergent conservative scheme gives a weak solution (Lax–Wendroff), and an entropy condition is still needed to pick out the physical one. Dates: Lax was at Los Alamos in 1945–46 and again in 1950; the earlier draft's '1950–51' could not be confirmed.",
  "chapters": [
   "advection",
   "shocks",
   "trust"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Lax_Peter/",
   "https://www.maths.tcd.ie/EMIS/mirror/IMU/medals/Abel/2005/lax_2005_EN.pdf",
   "https://data.coaps.fsu.edu/eric_pub/OCP5930/Papers/StabSurveyLinearFDA.pdf",
   "https://doi.org/10.1002/cpa.3160070112"
  ]
 },
 {
  "id": "akio-arakawa",
  "name": "Akio Arakawa",
  "born": "1927",
  "died": "2021",
  "places": "Tokyo (Japan Meteorological Agency, from 1950); UCLA (from the 1960s)",
  "tags": [
   "meteorology",
   "computation",
   "turbulence"
  ],
  "summary": "Showed in 1966 how to discretise the advection (Jacobian) term so that the discrete 2D equations conserve both energy and enstrophy, which blocks the nonlinear instability Phillips had met. He also classified staggered grid arrangements; the 'Arakawa A–E grids' are standard vocabulary in pressure and grid design.",
  "contributions": [
   {
    "year": "1966 (August)",
    "what": "Constructed a finite-difference Jacobian for 2D incompressible flow that conserves the discrete analogues of kinetic energy and mean-square vorticity, which prevents a spurious pile-up of energy at the grid scale.",
    "work": "Computational design for long-term numerical integration of the equations of fluid motion: two-dimensional incompressible flow. Part I, J. Comput. Phys. 1(1), 119–143",
    "confidence": "medium"
   },
   {
    "year": "1977",
    "what": "With V. R. Lamb, compared ways of staggering velocity and mass variables on a grid, labelled A through E.",
    "work": "Computational design of the basic dynamical processes of the UCLA general circulation model, Methods in Computational Physics 17 (with V. R. Lamb)",
    "confidence": "medium"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "Correction to the earlier draft: his death on 21 March 2021 is confirmed by UCLA's Department of Atmospheric and Oceanic Sciences, which also says he took a B.S. in physics at the University of Tokyo in 1950 before joining the Japan Meteorological Agency. The birth date (20 July 1927) comes from Wikipedia. The description of the 1966 paper is standard but was not checked against the paper itself (medium).",
  "chapters": [
   "turbulence",
   "advection",
   "pressure"
  ],
  "sources": [
   "https://atmos.ucla.edu/about/news/2021-03/dr-akio-arakawa-distinguished-research-professor-emeritus",
   "https://doi.org/10.1016/0021-9991(66)90015-5",
   "https://en.wikipedia.org/wiki/Akio_Arakawa"
  ]
 },
 {
  "id": "francis-harlow",
  "name": "Francis Harvey Harlow",
  "born": "1928",
  "died": "2016",
  "places": "Los Alamos Scientific Laboratory (Group T-3, fluid dynamics)",
  "tags": [
   "computation",
   "engineering",
   "graphics"
  ],
  "summary": "Los Alamos physicist whose group created the particle-in-cell (PIC) method in the mid-1950s and, with J. Eddie Welch, the marker-and-cell (MAC) method in 1965. MAC's staggered grid, pressure Poisson solve and marker particles are the direct ancestors of the grid-based fluid solvers used in graphics.",
  "contributions": [
   {
    "year": "1955",
    "what": "Early Los Alamos report on the particle-in-cell approach. DTIC records that LA-2139 supersedes LAMS-1956 and LAMS-2082; the title and 1955 date given here come from Wikipedia.",
    "work": "A machine calculation method for hydrodynamic problems, Los Alamos report LAMS-1956",
    "confidence": "medium"
   },
   {
    "year": "1957 (8 Nov)",
    "what": "Full description of PIC for multidimensional hydrodynamics with large distortions: Lagrangian particles carry mass through a fixed Eulerian grid.",
    "work": "The particle-in-cell method for hydrodynamic calculations, Los Alamos report LA-2139 (M. W. Evans and F. H. Harlow; DTIC also lists E. Bromberg)",
    "confidence": "high"
   },
   {
    "year": "1965 (received 16 Apr; published Dec)",
    "what": "Introduced the marker-and-cell (MAC) method for time-dependent viscous incompressible flow with a free surface. It solves the full Navier–Stokes equations for pressure and velocity on a grid and tracks the fluid with marker particles.",
    "work": "Numerical calculation of time-dependent viscous incompressible flow of fluid with free surface, Phys. Fluids 8(12), 2182–2189 (with J. E. Welch)",
    "confidence": "high"
   },
   {
    "year": "2004",
    "what": "Wrote a first-hand history of his group's methods.",
    "work": "Fluid dynamics in Group T-3 Los Alamos National Laboratory, J. Comput. Phys. 195(2), 414–433",
    "confidence": "high"
   }
  ],
  "notation": [
   "'particle-in-cell' (PIC): title of Los Alamos report LA-2139 (1957)",
   "'marker and cell' (MAC) method: named in Harlow & Welch (1965)"
  ],
  "anecdote": "Outside physics, Harlow was an authority on Pueblo pottery. His memoir is titled 'Adventures in Physics and Pueblo Pottery: Memoirs of a Los Alamos Scientist'.",
  "quote": "",
  "quote_source": "",
  "contested": "PIC is often credited to Harlow alone. The main 1957 report is by Martha W. Evans and Harlow, and the DTIC record also lists Eleazer Bromberg. Harlow's role as T-3 group leader and its dates were not confirmed from a primary source here (medium).",
  "chapters": [
   "pressure",
   "lattice-particles",
   "stable-fluids"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Francis_H._Harlow",
   "https://sgp.fas.org/othergov/doe/lanl/dtic/ADA384618.html",
   "https://doi.org/10.1063/1.1761178",
   "https://doi.org/10.1016/j.jcp.2003.09.031"
  ]
 },
 {
  "id": "robert-kraichnan",
  "name": "Robert Harry Kraichnan",
  "born": "1928",
  "died": "2008",
  "places": "Princeton (Institute for Advanced Study, 1949–50); Columbia; New York University; independent consultant (Los Alamos and others, from 1962); Johns Hopkins (2003); Santa Fe",
  "tags": [
   "theory",
   "turbulence"
  ],
  "summary": "Showed in 1967 that because 2D flow conserves both energy and enstrophy, energy cascades to larger scales (a k^-5/3 range) while enstrophy cascades to smaller scales (a k^-3 range). This is why 2D simulations, and the large scales of the atmosphere, behave so differently from 3D turbulence.",
  "contributions": [
   {
    "year": "1959 (May)",
    "what": "Gave a full account of the direct-interaction approximation (DIA), a statistical closure for turbulence.",
    "work": "The structure of isotropic turbulence at very high Reynolds numbers, J. Fluid Mech. 5(4), 497–543",
    "confidence": "high"
   },
   {
    "year": "1967 (July)",
    "what": "Predicted two inertial ranges in 2D turbulence: E(k) ~ ε^{2/3} k^{-5/3} with energy flowing to lower wavenumbers, and E(k) ~ η^{2/3} k^{-3} with vorticity flowing to higher wavenumbers.",
    "work": "Inertial ranges in two-dimensional turbulence, Phys. Fluids 10(7), 1417–1423",
    "confidence": "high"
   }
  ],
  "notation": [
   "'backward energy cascade' and the 2D spectra E(k) ~ ε^{2/3} k^{-5/3} and E(k) ~ η^{2/3} k^{-3} (1967)"
  ],
  "anecdote": "Kraichnan was one of the last assistants to Albert Einstein at the Institute for Advanced Study (1949–50). From 1962 he worked mostly as an independent researcher funded by grants and consulting.",
  "quote": "The −5/3 range is found to entail backward energy cascade, from higher to lower wavenumbers k, together with zero-vorticity flow.",
  "quote_source": "R. H. Kraichnan (1967), abstract, Phys. Fluids 10, 1417: https://doi.org/10.1063/1.1762301",
  "contested": "The 2D dual-cascade theory is usually called Kraichnan–Leith–Batchelor (KLB) theory. Leith (Phys. Fluids 11, 1968) and Batchelor (Phys. Fluids 12, Suppl. II, 1969) reached related results independently. Earlier, Fjørtoft (Tellus, 1953) had derived the triad constraints on 2D energy transfer.",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Robert_Kraichnan",
   "https://doi.org/10.1063/1.1762301",
   "https://doi.org/10.1017/S0022112059000362",
   "https://doi.org/10.1063/1.1691968"
  ]
 },
 {
  "id": "sergei-godunov",
  "name": "Sergei Konstantinovich Godunov",
  "born": "1929",
  "died": "2023",
  "places": "Moscow (Steklov Institute; Keldysh Institute of Applied Mathematics); Novosibirsk (Sobolev Institute of Mathematics)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Built the first scheme that advances gas dynamics by solving a Riemann problem at every cell interface. He also showed that a linear scheme that never creates new extrema can be at most first-order accurate. Nonlinear TVD limiters were designed to get around that order barrier.",
  "contributions": [
   {
    "year": "1953–54 (devised); 4 Nov 1954 (PhD defence); 1959 (published)",
    "what": "Devised a conservative scheme that uses exact solutions of the Riemann problem between neighbouring cells. The final form dates from March 1954, and experimental and applied calculations began on 5 May 1954.",
    "work": "A difference method for numerical calculation of discontinuous solutions of the equations of hydrodynamics, Mat. Sbornik 47(89):3, 271–306 (1959)",
    "confidence": "high"
   },
   {
    "year": "1954; in print 1959",
    "what": "Showed for the linear case that only first-order schemes preserve monotonicity (Godunov's order-barrier theorem).",
    "work": "1959 Mat. Sbornik paper; described in his 'Reminiscences about numerical schemes'",
    "confidence": "high"
   },
   {
    "year": "1997 (talk); English translation 2008",
    "what": "Gave a first-hand account of how the scheme was developed and of later modifications.",
    "work": "Reminiscences about numerical schemes (talk at 'Godunov's Method in Gas Dynamics', Michigan, May 1997; INRIA report RR-6666, arXiv:0810.0649)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "The scheme was hard to publish. Godunov recalled that the journal 'Applied Mathematics and Mechanics' rejected it as purely mathematical with no relation to mechanics, and a mathematics journal rejected it for the opposite reason. I. G. Petrovskii then helped get it into Matematicheskii Sbornik in 1959.",
  "quote": "If I had received this paper one year earlier, the \"Godunov's scheme\" would never have been constructed.",
  "quote_source": "S. K. Godunov, 'Reminiscences about numerical schemes', English translation (2008), on reading Lax's 1954 paper only after his thesis defence: https://arxiv.org/abs/0810.0649",
  "contested": "Dating: the scheme is usually dated 1959, its publication year, but it was devised in 1953–54 and defended as a thesis in November 1954. Scope: the order barrier applies to linear schemes; flux limiters avoid it by being nonlinear. Godunov himself disclaimed the 'second-order Godunov schemes' that bear his name ('I claim I cannot be considered as the author of them'). Origin: the work began in autumn 1953, when Keldysh and Gelfand asked him to develop a variant of the von Neumann–Richtmyer artificial-viscosity method in time for the 'Strela' computer due at the institute.",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://arxiv.org/abs/0810.0649",
   "https://www.mathnet.ru/eng/sm4873",
   "https://bigenc.ru/c/godunov-sergei-konstantinovich-16e09e"
  ]
 },
 {
  "id": "burton-wendroff",
  "name": "Burton Wendroff",
  "born": "1930",
  "died": "",
  "places": "New York University; Los Alamos; University of Denver (1966–73); University of New Mexico",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Co-author with Lax of the Lax–Wendroff scheme (1960), the classic second-order conservative scheme for hyperbolic conservation laws, and of the Lax–Wendroff theorem on what convergent conservative schemes converge to.",
  "contributions": [
   {
    "year": "1958",
    "what": "PhD at New York University under Peter Lax, on finite-difference approximations to PDEs.",
    "work": "Finite Difference Approximations to the Solutions of Partial Differential Equations (thesis)",
    "confidence": "medium"
   },
   {
    "year": "1960",
    "what": "With Lax, introduced the second-order Lax–Wendroff scheme and proved that a convergent conservative scheme converges to a weak solution.",
    "work": "Systems of conservation laws, Comm. Pure Appl. Math. 13(2), 217–237",
    "confidence": "high"
   },
   {
    "year": "1964",
    "what": "With Lax, constructed higher-order difference schemes for hyperbolic equations.",
    "work": "Difference schemes for hyperbolic equations with high order of accuracy, Comm. Pure Appl. Math. 17(3), 381–398",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "DTIC catalogues the precursor Los Alamos report 'Systems of Conservation Laws' (LA-2285, 19 April 1959) under Lax alone; the 1960 journal paper carries both names. Its abstract says the added terms that keep shocks sharp resemble, but are not identical to, von Neumann–Richtmyer artificial viscosity. The scheme is linear and second-order, so by Godunov's theorem it cannot be monotone: it produces oscillations next to discontinuities. TVD limiters were later designed to fix that. His birth year (1930; Wikipedia gives 10 March 1930) was not confirmed in a second source.",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Burton_Wendroff",
   "https://doi.org/10.1002/cpa.3160130205",
   "https://sgp.fas.org/othergov/doe/lanl/dtic/ADA385056.html"
  ]
 },
 {
  "id": "radii-fedorenko",
  "name": "Radii Petrovich Fedorenko",
  "born": "1930",
  "died": "2009",
  "places": "Voronezh (born); Rostov (Rostov University, graduated 1953); Moscow (Keldysh Institute of Applied Mathematics, from 1953)",
  "tags": [
   "mathematics",
   "computation",
   "meteorology"
  ],
  "summary": "Invented the multigrid idea in 1961 while trying to speed up the repeated Poisson solves in a weather-forecasting code. In 1964 he proved for the Poisson problem on a rectangle that the convergence rate does not degrade as the mesh is refined, the property that makes multigrid optimal. In 1962 he also proposed hybrid schemes that switch order according to local smoothness, an early response to Godunov's order barrier.",
  "contributions": [
   {
    "year": "1961 (Russian); 1962 (English translation)",
    "what": "First description of a multigrid relaxation method for elliptic difference equations.",
    "work": "A relaxation method for solving elliptic difference equations, Zh. Vychisl. Mat. Mat. Fiz. 1(5), 922–927; English: USSR Comput. Math. Math. Phys. 1(4), 1092–1096",
    "confidence": "high"
   },
   {
    "year": "1962",
    "what": "Proposed hybrid difference schemes for hyperbolic equations: at each node a simple test of local smoothness selects a first-order or a higher-order scheme. The Keldysh memorial presents this as a response to Godunov's result that linear monotone schemes cannot be of high order.",
    "work": "Application of high-accuracy difference schemes to the numerical solution of hyperbolic equations, Zh. Vychisl. Mat. Mat. Fiz. 2(6), 1122–1128",
    "confidence": "high"
   },
   {
    "year": "1964",
    "what": "Proved mesh-independent convergence speed for the Poisson equation on a rectangle.",
    "work": "The speed of convergence of one iterative process, Zh. Vychisl. Mat. Mat. Fiz. 4(3); English: USSR Comput. Math. Math. Phys. 4(3), 227–235",
    "confidence": "high"
   },
   {
    "year": "2003",
    "what": "State Prize of the Russian Federation for the multigrid method, shared with N. S. Bakhvalov, G. P. Astrakhantsev and V. V. Shaidurov.",
    "work": "State Prize of the Russian Federation",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "According to the Keldysh Institute memorial, the method arose while solving 2D gas-dynamics equations on a sphere for weather prediction. Most of the machine time went into repeatedly solving a Poisson equation, and standard methods slowed down sharply as the grid was refined.",
  "quote": "",
  "quote_source": "",
  "contested": "Multigrid is sometimes credited to Achi Brandt. The method was Fedorenko's (1961, 1964); Bakhvalov and Astrakhantsev extended the convergence theory to much more general problems. The Keldysh memorial says intensive study and wide use began after Brandt applied it successfully in the 1970s. Death year: the Keldysh Institute memorial gives 1930–2009. An obituary reportedly titled '(1930–2010)' is cited on Russian Wikipedia but was not checked; 2009 is used here.",
  "chapters": [
   "solvers",
   "shocks"
  ],
  "sources": [
   "https://keldysh.ru/memory/fedorenko/",
   "https://doi.org/10.1016/0041-5553(62)90031-9",
   "https://doi.org/10.1016/0041-5553(64)90253-8"
  ]
 },
 {
  "id": "alexandre-chorin",
  "name": "Alexandre Joel Chorin",
  "born": "1938",
  "died": "",
  "places": "Lausanne (EPFL, diploma 1961); New York University (Courant Institute, PhD 1966, then research and faculty posts); University of California, Berkeley; Lawrence Berkeley National Laboratory",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Introduced the projection method (1967–68): advance the velocity ignoring incompressibility, then project it onto divergence-free fields by solving a pressure Poisson equation. This is the core step of most incompressible solvers, including 'stable fluids' in graphics. He also introduced artificial compressibility (1967).",
  "contributions": [
   {
    "year": "1967 (August)",
    "what": "Artificial-compressibility method: add a pseudo-time pressure equation so that steady incompressible flows can be computed by marching.",
    "work": "A numerical method for solving incompressible viscous flow problems, J. Comput. Phys. 2(1), 12–26",
    "confidence": "high"
   },
   {
    "year": "1967",
    "what": "Short announcement of his time-dependent incompressible Navier–Stokes method, cited as the origin of the projection method.",
    "work": "The numerical solution of the Navier-Stokes equations for an incompressible fluid, Bull. Amer. Math. Soc. 73(6), 928–931",
    "confidence": "high"
   },
   {
    "year": "1968",
    "what": "Full account of the projection (fractional-step) method for the incompressible Navier–Stokes equations.",
    "work": "Numerical solution of the Navier-Stokes equations, Math. Comp. 22(104), 745–762",
    "confidence": "high"
   },
   {
    "year": "1973 (March)",
    "what": "Random vortex method for slightly viscous flow.",
    "work": "Numerical study of slightly viscous flow, J. Fluid Mech. 57(4), 785–796",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Chorin was a student of Peter Lax at NYU (PhD 1966, thesis on a numerical study of thermal convection), so the projection method came out of the same Courant Institute group as the Lax–Friedrichs and Lax–Wendroff schemes.",
  "quote": "",
  "quote_source": "",
  "contested": "'Chorin's projection method' is also called the Chorin–Temam method, because Roger Temam independently published a fractional-step method with convergence analysis in 1969. The idea also has a prehistory: Harlow and Welch's MAC method (1965) already solved a Poisson equation for pressure on a staggered grid at every step. The theoretical basis, splitting a vector field into divergence-free and gradient parts, is usually called the Helmholtz–Hodge decomposition; Wikipedia attributes the relevant form to Ladyzhenskaya. Career: the earlier draft said he was at NYU 'to 1969'; Wikipedia says he was promoted to assistant professor there in 1969, so that date marks a promotion, not a departure.",
  "chapters": [
   "pressure",
   "stable-fluids"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Alexandre_Chorin",
   "https://www.mathgenealogy.org/id.php?id=30630",
   "https://doi.org/10.1090/S0025-5718-1968-0242392-2",
   "https://doi.org/10.1016/0021-9991(67)90037-X"
  ]
 },
 {
  "id": "achi-brandt",
  "name": "Achi Brandt",
  "born": "1938",
  "died": "",
  "places": "Weizmann Institute of Science (Rehovot); visiting at Courant Institute and Stanford",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Turned multigrid into a general, practical methodology in the 1970s (MLAT, 1972–73; Math. Comp. 1977) and argued that elliptic problems can be solved in work proportional to the number of unknowns. His 1977 paper is the usual entry point to the multigrid literature.",
  "contributions": [
   {
    "year": "1972 (conference); 1973 (print)",
    "what": "Introduced the multi-level adaptive technique (MLAT) for fast solution of boundary-value problems.",
    "work": "Multi-level adaptive technique (MLAT) for fast numerical solution to boundary value problems, Proc. 3rd Int. Conf. on Numerical Methods in Fluid Mechanics, Lecture Notes in Physics 18, 82–89 (Springer, 1973)",
    "confidence": "high"
   },
   {
    "year": "1977 (April)",
    "what": "Comprehensive account of multigrid: smoothing, coarse-grid correction, full multigrid and adaptivity.",
    "work": "Multi-level adaptive solutions to boundary-value problems, Math. Comp. 31(138), 333–390",
    "confidence": "high"
   },
   {
    "year": "2005",
    "what": "SIAM/ACM Prize in Computational Science and Engineering, for 'pioneering modern multilevel methods'.",
    "work": "SIAM/ACM Prize",
    "confidence": "high"
   }
  ],
  "notation": [
   "MLAT, 'multi-level adaptive technique' (1973)"
  ],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "Brandt did not invent multigrid; Fedorenko (1961, 1964) and Bakhvalov (1966) came first. Brandt showed that the approach is general, practical and optimally efficient, which is what made it widely used.",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Achi_Brandt",
   "https://doi.org/10.1090/S0025-5718-1977-0431719-X",
   "https://doi.org/10.1007/BFb0118663",
   "https://keldysh.ru/memory/fedorenko/"
  ]
 },
 {
  "id": "leon-lucy",
  "name": "Leon B. Lucy",
  "born": "1938",
  "died": "2018",
  "places": "University of Manchester (PhD, early 1960s); University of Cambridge and Columbia University, New York (affiliations on the 1977 paper); European Southern Observatory; Imperial College London (visiting professor from 1998)",
  "tags": [
   "computation",
   "theory"
  ],
  "summary": "An astrophysicist whose 1977 paper introduced a mesh-free 'finite-size particle scheme' for gas dynamics. Gingold and Monaghan published the same idea independently in the same month, and together the two papers founded smoothed particle hydrodynamics (SPH). Lucy built his method to test whether rapidly rotating protostars split apart (the fission hypothesis).",
  "contributions": [
   {
    "year": "1977",
    "what": "Represented a self-gravitating gas by a finite set of particles, estimating density and pressure forces by smoothing over neighbouring particles, and applied the scheme in 2D and 3D to the fission of rotating protostars. In the paper's calculation a rotating protostar evolved into a triple system whose components held 60% of the original mass. Published December 1977.",
    "work": "\"A numerical approach to the testing of the fission hypothesis\", The Astronomical Journal 82, 1013",
    "confidence": "high"
   },
   {
    "year": "1974",
    "what": "Published an iterative image-restoration method derived from Bayes' theorem, now called Richardson–Lucy deconvolution. It was later used on blurred Hubble Space Telescope images before the telescope's optics were corrected. Published June 1974.",
    "work": "\"An iterative technique for the rectification of observed distributions\", The Astronomical Journal 79, 745",
    "confidence": "high"
   },
   {
    "year": "2000",
    "what": "Awarded the Gold Medal of the Royal Astronomical Society.",
    "work": "RAS Gold Medal",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Lucy is better known in image processing than in fluids. Tod Lauer, of the Hubble WFPC1 team, recalled using Lucy's method in the 1980s. After the flawed telescope was launched in 1990, he used it for the 'first demonstrations' that deconvolution could recover science from the blurred WFPC1 images. He met Lucy once, a few years after launch, and thanked him.",
  "quote": "He was very modest and I always wondered if he knew how important his contribution to image processing had been.",
  "quote_source": "Tod R. Lauer (Hubble WFPC1 team), comment of 20 May 2018 on Andrew Jaffe, 'Leon Lucy, R.I.P.', https://andrewjaffe.net/blog/2018/05/leon_lucy_rip/",
  "contested": "Some accounts credit SPH to Lucy alone, others to Gingold and Monaghan alone. The two papers were independent, and both appeared in December 1977 issues (AJ and MNRAS). The name 'smoothed particle hydrodynamics' comes from Gingold and Monaghan's title; Lucy's title does not use it. The deconvolution method is properly called 'Richardson–Lucy', because W. H. Richardson published the same iteration independently in 1972 (JOSA 62, 55). An earlier version of this record said Lauer got the 'first science' out of Hubble with the method; Lauer's own words are 'first demonstrations'. Sources do not agree on the month of Lucy's death in 2018, so only the year is given.",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1086/112164",
   "https://andrewjaffe.net/blog/2018/05/leon_lucy_rip/",
   "https://en.wikipedia.org/wiki/Leon_Lucy",
   "https://doi.org/10.1364/JOSA.62.000055"
  ]
 },
 {
  "id": "philip-roe",
  "name": "Philip L. Roe",
  "born": "1938",
  "died": "2026",
  "places": "Derby, England (born 4 May 1938); Christ's College, Cambridge (engineering); Royal Aircraft Establishment (1962–1984; RAE Bedford on the 1981 paper); Cranfield Institute of Technology (1984–1990); University of Michigan, Ann Arbor (1990–2022); William Penney Visiting Professor, Cambridge (2008–2016)",
  "tags": [
   "computation",
   "engineering"
  ],
  "summary": "A British aerodynamicist whose 1981 approximate Riemann solver made Godunov-type upwind schemes cheap enough for routine use. It replaces the exact nonlinear Riemann problem at each cell face with a linear one, built from a specially averaged 'Roe state' so that conservation and shock speeds are kept exactly. The Roe flux is still a standard choice in compressible CFD. He died on 26 April 2026.",
  "contributions": [
   {
    "year": "1981",
    "what": "Introduced the Roe approximate Riemann solver. A parameter-vector construction yields a constant matrix, evaluated at a Roe-averaged state, that exactly reproduces flux jumps, giving an upwind numerical flux at each interface. Published October 1981; reprinted in JCP 135(2), 250–258 (1997).",
    "work": "\"Approximate Riemann solvers, parameter vectors, and difference schemes\", Journal of Computational Physics 43(2), 357–372",
    "confidence": "high"
   },
   {
    "year": "1984",
    "what": "Source of the very compressive limiter later called 'superbee'. Sweby's 1984 abstract presents it as 'a very compressive limiter due to Roe'; the name 'superbee' is not in that abstract.",
    "work": "Cited in P. K. Sweby, SIAM J. Numer. Anal. 21(5), 995–1011",
    "confidence": "medium"
   },
   {
    "year": "1986",
    "what": "Review of upwind, characteristic-based methods for the Euler equations.",
    "work": "\"Characteristic-Based Schemes for the Euler Equations\", Annual Review of Fluid Mechanics 18, 337–365",
    "confidence": "high"
   },
   {
    "year": "1998",
    "what": "Essay on the role of simplicity in CFD algorithm design, the source of his best-known remark.",
    "work": "\"Compounded of Many Simples\", in Barriers and Challenges in Computational Fluid Dynamics (ICASE/LaRC Interdisciplinary Series, Springer), 241–258",
    "confidence": "medium"
   },
   {
    "year": "2015",
    "what": "AIAA Fluid Dynamics Award.",
    "work": "AIAA Fluid Dynamics Award",
    "confidence": "medium"
   }
  ],
  "notation": [
   "Roe matrix / Roe-averaged state (1981)",
   "'superbee' limiter (attributed to Roe; appears, unnamed, in Sweby 1984)"
  ],
  "anecdote": "Roe was a serious chess player. His son Gerard recalled the 1962 Cambridge–Oxford match: 'Characteristically, Dad let his opponent have the satisfaction of delivering the mate', something he always did for a clever combination. His first years at the Royal Aircraft Establishment were spent on hypersonic aerodynamics, before he turned to computation.",
  "quote": "I believe we must build upon simplicity; the human mind has no other option.",
  "quote_source": "Phil Roe, 'Compounded of Many Simples' (1998), as quoted on the University of Michigan CASLab memorial page 'Homage to Phil Roe', https://caslab.engin.umich.edu/homage-to-phil-roe",
  "contested": "The basic Roe solver does not enforce an entropy condition. It can produce non-physical expansion shocks at sonic points, so practical codes add an 'entropy fix'. Roe-type solvers are also prone to the carbuncle instability at strong grid-aligned shocks (see Quirk 1994). An earlier version of this record said obituaries disagree on whether he retired from Michigan in 2021 or 2022; the Ann Arbor Observer obituary says he remained on the faculty until 2022. The name 'superbee' is often cited to Sweby's paper, but Sweby's abstract only says 'a very compressive limiter due to Roe'.",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(81)90128-5",
   "https://en.wikipedia.org/wiki/Philip_L._Roe",
   "https://annarborobserver.com/philip-lawrence-roe/",
   "https://caslab.engin.umich.edu/homage-to-phil-roe"
  ]
 },
 {
  "id": "brian-launder",
  "name": "Brian E. Launder",
  "born": "1939",
  "died": "",
  "places": "Imperial College London (BSc; lecturer from 1964, later Reader); Massachusetts Institute of Technology (master's and ScD); University of California, Davis (1976–1980); UMIST, Manchester (from 1980, head of the Thermo-Fluids Division)",
  "tags": [
   "turbulence",
   "engineering"
  ],
  "summary": "With W. P. Jones (1972) and D. B. Spalding (1974), Launder set out the k–ε model. It uses transport equations for turbulent kinetic energy k and its dissipation rate ε, which give an eddy viscosity proportional to k²/ε. For decades it was the workhorse turbulence model of industrial CFD.",
  "contributions": [
   {
    "year": "1972",
    "what": "With W. P. Jones (both at Imperial College): a two-equation (k and ε) turbulence model, including low-Reynolds-number terms, applied to laminarization. Published February 1972.",
    "work": "\"The prediction of laminarization with a two-equation model of turbulence\", International Journal of Heat and Mass Transfer 15(2), 301–314",
    "confidence": "high"
   },
   {
    "year": "1972",
    "what": "Book with Spalding surveying turbulence models.",
    "work": "Lectures in Mathematical Models of Turbulence (Academic Press)",
    "confidence": "high"
   },
   {
    "year": "1974",
    "what": "With Spalding: survey of turbulence models for numerical computation. This is the standard citation for the 'standard' high-Reynolds-number k–ε model. Published March 1974.",
    "work": "\"The numerical computation of turbulent flows\", Computer Methods in Applied Mechanics and Engineering 3(2), 269–289",
    "confidence": "high"
   },
   {
    "year": "1994",
    "what": "Elected Fellow of the Royal Society.",
    "work": "FRS",
    "confidence": "medium"
   }
  ],
  "notation": [
   "k–ε model, with k the turbulent kinetic energy and ε its dissipation rate (1972/1974)",
   "eddy viscosity ν_t = C_μ k²/ε"
  ],
  "anecdote": "Launder's 1974 co-author, Brian Spalding (1923–2016), also co-developed the SIMPLE pressure-correction algorithm with Suhas Patankar. He founded the company CHAM in 1969 and created PHOENICS (1978, released commercially in 1981), which Wikipedia calls the world's first general-purpose CFD code. The k–ε model spread into industry partly through such codes.",
  "quote": "",
  "quote_source": "",
  "contested": "'k–ε (Launder & Spalding, 1974)' is the usual citation, but the two-equation k–ε formulation appeared two years earlier in Jones & Launder (1972), in a low-Reynolds-number form. The 1974 paper reviewed models and standardized the high-Reynolds version. Other k–ε-type proposals before 1972 are sometimes mentioned in histories but were not verified. An earlier version of this record gave the 1972 book's title as 'Mathematical Models of Turbulence'; the published title is 'Lectures in Mathematical Models of Turbulence'.",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Brian_Launder",
   "https://doi.org/10.1016/0045-7825(74)90029-2",
   "https://doi.org/10.1016/0017-9310(72)90076-2",
   "https://en.wikipedia.org/wiki/Brian_Spalding"
  ]
 },
 {
  "id": "roger-temam",
  "name": "Roger Temam",
  "born": "1940",
  "died": "",
  "places": "Tunis; Paris (Université Paris-Sud, Orsay, from 1968); Indiana University (from 1986)",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "Independently of Chorin, gave a fractional-step (projection) method for the incompressible Navier–Stokes equations, with convergence analysis, in 1969. He also wrote a standard text on Navier–Stokes theory and numerical analysis (1977).",
  "contributions": [
   {
    "year": "1969",
    "what": "Fractional-step approximation of the Navier–Stokes equations: each step is split into a viscous/advective step and a projection that enforces incompressibility, with convergence analysis.",
    "work": "Sur l'approximation de la solution des équations de Navier-Stokes par la méthode des pas fractionnaires (I), Arch. Rational Mech. Anal. 32(2), 135–153; (II), 33(5), 377–385",
    "confidence": "high"
   },
   {
    "year": "1977",
    "what": "Monograph on Navier–Stokes theory and numerical analysis (3rd edition 1984).",
    "work": "Navier–Stokes Equations: Theory and Numerical Analysis (North-Holland)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "He completed his Thèse d'État in 1967 under Jacques-Louis Lions.",
  "quote": "",
  "quote_source": "",
  "contested": "English-language teaching usually calls the method 'Chorin's projection method'. Temam's 1969 papers are an independent development with convergence proofs, hence the name Chorin–Temam projection. The claim that his thesis was specifically on fractional steps was not confirmed here.",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Roger_Temam",
   "https://doi.org/10.1007/BF00247678",
   "https://doi.org/10.1007/BF00247696"
  ]
 },
 {
  "id": "suhas-patankar",
  "name": "Suhas V. Patankar",
  "born": "1941",
  "died": "",
  "places": "Pune (College of Engineering, 1962); IIT Bombay (M.Tech.); Imperial College London (PhD 1967); University of Minnesota",
  "tags": [
   "engineering",
   "computation"
  ],
  "summary": "With Brian Spalding, created SIMPLE, the pressure-correction algorithm behind most finite-volume CFD codes. His 1980 book made the finite-volume method on staggered grids the standard engineering approach.",
  "contributions": [
   {
    "year": "1972 (October)",
    "what": "With Spalding, published the pressure-correction procedure for 3D parabolic flows that underlies SIMPLE.",
    "work": "A calculation procedure for heat, mass and momentum transfer in three-dimensional parabolic flows, Int. J. Heat Mass Transfer 15(10), 1787–1806",
    "confidence": "high"
   },
   {
    "year": "1979–80",
    "what": "Revised pressure-correction variant SIMPLER ('SIMPLE Revised'). Wikipedia, citing Tannehill, Anderson and Pletcher, dates it to 1979; it is presented in his 1980 book.",
    "work": "SIMPLER; Numerical Heat Transfer and Fluid Flow (1980)",
    "confidence": "medium"
   },
   {
    "year": "1980",
    "what": "Textbook built on control volumes, staggered grids and SIMPLE-type pressure correction.",
    "work": "Numerical Heat Transfer and Fluid Flow (book)",
    "confidence": "high"
   }
  ],
  "notation": [
   "SIMPLE: 'Semi-Implicit Method for Pressure-Linked Equations'"
  ],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "Citations for SIMPLE vary. The 1972 Int. J. Heat Mass Transfer paper treats 3D parabolic (marching) flows. The version for recirculating (elliptic) flows is usually cited to Caretto, Gosman, Patankar and Spalding's paper at the 1972 Paris numerical-methods conference; that citation was not checked here (medium).",
  "chapters": [
   "pressure",
   "discretization"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Suhas_V._Patankar",
   "https://en.wikipedia.org/wiki/SIMPLE_algorithm",
   "https://doi.org/10.1016/0017-9310(72)90054-3"
  ]
 },
 {
  "id": "bram-van-leer",
  "name": "Bram van Leer",
  "born": "1942",
  "died": "",
  "places": "Leiden Observatory, Netherlands (PhD Leiden 1970; there 1966–1982); UC Berkeley (Miller Fellow, 1970–72); ICASE, NASA Langley (1979–81); Delft University of Technology (1982–86); University of Michigan, Ann Arbor (1986–2012, then emeritus)",
  "tags": [
   "computation",
   "theory"
  ],
  "summary": "A Leiden-trained astrophysicist whose five-part series 'Towards the ultimate conservative difference scheme' (1973–1979) showed how to get second-order accuracy without spurious oscillations at shocks. He did it by limiting reconstructed slopes and by extending Godunov's method to second order (MUSCL). Limiters and MUSCL reconstruction are still at the core of most shock-capturing codes.",
  "contributions": [
   {
    "year": "1973",
    "what": "Part I, 'The quest of monotonicity'. Published in the proceedings of the Third International Conference on Numerical Methods in Fluid Mechanics, not in JCP.",
    "work": "\"Towards the ultimate conservative difference scheme I. The quest of monotonicity\", Lecture Notes in Physics 18 (Springer), 163–168",
    "confidence": "high"
   },
   {
    "year": "1974",
    "what": "Part II. Combined monotonicity and conservation in a second-order scheme using a nonlinear limiter. The 'van Leer limiter' is usually cited to this paper. Published March 1974.",
    "work": "\"Towards the ultimate conservative difference scheme. II. Monotonicity and conservation combined in a second-order scheme\", Journal of Computational Physics 14(4), 361–370",
    "confidence": "high"
   },
   {
    "year": "1977",
    "what": "Parts III and IV, back to back in the March 1977 issue. III covers upstream-centred schemes for ideal compressible flow (the monotonized-central 'MC' limiter is usually cited here). IV, 'A new approach to numerical convection', treats advection with higher-order sub-cell reconstructions.",
    "work": "Journal of Computational Physics 23(3), 263–275 (III) and 276–299 (IV)",
    "confidence": "high"
   },
   {
    "year": "1979",
    "what": "Part V. A second-order extension of Godunov's method: a limited, piecewise-linear reconstruction in each cell, followed by a Riemann-problem flux. This became known as MUSCL. Published July 1979; reprinted in JCP 135(2), 229–248 (1997) for the journal's anniversary.",
    "work": "\"Towards the ultimate conservative difference scheme. V. A second-order sequel to Godunov's method\", Journal of Computational Physics 32(1), 101–136",
    "confidence": "high"
   },
   {
    "year": "1983",
    "what": "Co-author, with Harten and Lax, of the HLL approximate Riemann solver paper, also issued as ICASE Report 82-5 (March 1982). His affiliation on the paper is Leiden.",
    "work": "\"On upstream differencing and Godunov-type schemes for hyperbolic conservation laws\", SIAM Review 25(1), 35–61",
    "confidence": "high"
   }
  ],
  "notation": [
   "MUSCL, 'Monotonic Upstream-centered Scheme for Conservation Laws' (1979)",
   "van Leer limiter (1974)",
   "MC (monotonized central) limiter (1977)"
  ],
  "anecdote": "Van Leer did this work as an astronomer. His 1970 Leiden PhD thesis, supervised by H. C. van de Hulst, was titled 'A Choice of Difference Schemes for Ideal Compressible Flow', and the journal papers in the series give his address as the University Observatory, Leiden. He moved into aerospace engineering only later, at Delft and then Michigan.",
  "quote": "",
  "quote_source": "",
  "contested": "Part I is often listed as a JCP paper. It actually appeared in Springer's Lecture Notes in Physics (1973). The series is variously dated 1972–1979 (as on Wikipedia) or 1973–1979, depending on whether one counts the conference or the printed proceedings; the conference date was not verified here. Some secondary sources call MUSCL 'the first TVD scheme'. That label is retrospective, because the TVD concept and name came from Harten and co-workers in 1983. One citation seen gives Part V as pp. 101–156, but the publisher's metadata gives 101–136.",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Bram_van_Leer",
   "https://doi.org/10.1016/0021-9991(79)90145-1",
   "https://doi.org/10.1016/0021-9991(74)90019-9",
   "https://doi.org/10.1007/BFb0118673"
  ]
 },
 {
  "id": "stanley-osher",
  "name": "Stanley Osher",
  "born": "1942",
  "died": "",
  "places": "Brooklyn, New York (born 24 April 1942); Brooklyn College (BA 1962); New York University (MS 1964, PhD 1966, advisor Jacob Schwartz); Brookhaven National Laboratory; UC Berkeley (1968); SUNY Stony Brook (1970); UCLA (from 1977)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Osher co-created many standard numerical tools for fluids. These include upwind fluxes (Engquist–Osher, Osher–Solomon), ENO and WENO reconstruction, and TVD Runge–Kutta time stepping with Shu. With Sethian (1988) he created the level set method, which became the standard way to track moving interfaces such as liquid surfaces, in CFD and in film effects.",
  "contributions": [
   {
    "year": "1980",
    "what": "With Engquist: stable, entropy-satisfying upwind approximations for transonic flow (the Engquist–Osher flux).",
    "work": "\"Stable and entropy satisfying approximations for transonic flow calculations\", Mathematics of Computation 34(149), 45–75",
    "confidence": "high"
   },
   {
    "year": "1982",
    "what": "With Solomon: upwind schemes for systems of conservation laws (the Osher–Solomon flux).",
    "work": "\"Upwind difference schemes for hyperbolic systems of conservation laws\", Mathematics of Computation 38(158), 339–374",
    "confidence": "high"
   },
   {
    "year": "1987",
    "what": "Co-author of the ENO paper with Harten, Engquist and Chakravarthy.",
    "work": "\"Uniformly high order accurate essentially non-oscillatory schemes, III\", Journal of Computational Physics 71(2), 231–303",
    "confidence": "high"
   },
   {
    "year": "1988",
    "what": "With Sethian (UCLA and UC Berkeley): the level set method. A front is the zero contour of a function evolved by a Hamilton–Jacobi equation, solved with shock-capturing-style schemes. Published November 1988.",
    "work": "\"Fronts propagating with curvature-dependent speed: Algorithms based on Hamilton-Jacobi formulations\", Journal of Computational Physics 79(1), 12–49",
    "confidence": "high"
   },
   {
    "year": "1988",
    "what": "With Shu: flux-based ENO with TVD Runge–Kutta time stepping (see the Chi-Wang Shu record).",
    "work": "Shu & Osher, \"Efficient implementation of essentially non-oscillatory shock-capturing schemes\", Journal of Computational Physics 77(2), 439–471",
    "confidence": "high"
   },
   {
    "year": "1994",
    "what": "With Liu and Chan: the first WENO schemes.",
    "work": "\"Weighted Essentially Non-oscillatory Schemes\", Journal of Computational Physics 115(1), 200–212",
    "confidence": "high"
   },
   {
    "year": "2003",
    "what": "With Fedkiw: textbook on level sets, widely used in graphics fluid simulation.",
    "work": "Level Set Methods and Dynamic Implicit Surfaces (Springer, Applied Mathematical Sciences)",
    "confidence": "high"
   },
   {
    "year": "2014",
    "what": "Carl Friedrich Gauss Prize.",
    "work": "Gauss Prize (International Mathematical Union)",
    "confidence": "medium"
   }
  ],
  "notation": [
   "level set method (with Sethian, 1988)",
   "ENO (1986–87, with Harten et al.)",
   "WENO (1994, with Liu and Chan)"
  ],
  "anecdote": "Osher recalled visiting Ami Harten in Tel Aviv in spring 1982: 'A typical work day with Ami would consist of the two of us shrieking insults at one another about some obscure mathematical topic. We would end our argument by planning a huge dinner and the next day's activities.'",
  "quote": "A typical work day with Ami would consist of the two of us shrieking insults at one another about some obscure mathematical topic.",
  "quote_source": "Stanley Osher, memorial note on Ami Harten, July 1995, https://www.math.umd.edu/~tadmor/Editorial/Stan%20on%20Ami%201995.pdf",
  "contested": "The 1988 paper usually cited as 'the level set method' does not use the words 'level set' in its title, which is 'Fronts propagating with curvature-dependent speed'. Biographical dates and positions come from Wikipedia.",
  "chapters": [
   "shocks",
   "advection",
   "stable-fluids"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Stanley_Osher",
   "https://doi.org/10.1016/0021-9991(88)90002-2",
   "https://doi.org/10.1090/S0025-5718-1980-0551290-1",
   "https://doi.org/10.1006/jcph.1994.1187"
  ]
 },
 {
  "id": "steven-orszag",
  "name": "Steven Alan Orszag",
  "born": "1943",
  "died": "2011",
  "places": "Princeton (PhD 1966); MIT (from 1967); Princeton (from 1984); Yale (from 1998)",
  "tags": [
   "computation",
   "turbulence",
   "mathematics"
  ],
  "summary": "Made spectral and pseudospectral methods practical for turbulence. His 1971 note gave the dealiasing rule for quadratic products now called the 'two-thirds rule'. In 1972, with G. S. Patterson, he ran the first direct numerical simulation of 3D homogeneous isotropic turbulence on a 32³ pseudospectral grid.",
  "contributions": [
   {
    "year": "1971 (September)",
    "what": "Short note showing that aliasing errors in quadratic terms can be removed by filtering out the highest wavenumbers; discarding the top third of the spectrum is the basis of the 'two-thirds rule'.",
    "work": "On the elimination of aliasing in finite-difference schemes by filtering high-wavenumber components, J. Atmos. Sci. 28(6), 1074",
    "confidence": "medium"
   },
   {
    "year": "1971 (November)",
    "what": "With Patterson, gave efficient ways to remove aliasing interactions in spectral turbulence calculations.",
    "work": "Spectral calculations of isotropic turbulence: efficient removal of aliasing interactions, Phys. Fluids 14(11), 2538–2541 (with G. S. Patterson)",
    "confidence": "high"
   },
   {
    "year": "1972 (10 January)",
    "what": "First simulation of homogeneous isotropic turbulence at laboratory Reynolds numbers, using a 32³ pseudospectral discretisation.",
    "work": "Numerical simulation of three-dimensional homogeneous isotropic turbulence, Phys. Rev. Lett. 28(2), 76–79 (with G. S. Patterson)",
    "confidence": "high"
   },
   {
    "year": "1977",
    "what": "First unified account of the numerical analysis of spectral methods.",
    "work": "Numerical Analysis of Spectral Methods: Theory and Applications (SIAM monograph, with D. Gottlieb)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "MacTutor notes that his early-1970s papers showed pseudospectral methods could simulate incompressible turbulence with N³ Fourier modes at O(N³ log N) operations per time step, with no numerical dispersion or dissipation.",
  "quote": "",
  "quote_source": "",
  "contested": "The 1971 note's title speaks of 'finite-difference schemes', although the two-thirds rule is now taught mainly for pseudospectral methods. The name 'two-thirds rule' came later. The text of the note was not read here (medium).",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://mathshistory.st-andrews.ac.uk/Biographies/Orszag/",
   "https://doi.org/10.1175/1520-0469(1971)028<1074:OTEOAI>2.0.CO;2",
   "https://doi.org/10.1063/1.1693365",
   "https://doi.org/10.1103/PhysRevLett.28.76"
  ]
 },
 {
  "id": "henk-van-der-vorst",
  "name": "Henk A. van der Vorst",
  "born": "1944",
  "died": "",
  "places": "Reactor Centrum Petten (from 1969); Academic Computer Centre Utrecht (from 1971; PhD Utrecht 1982, promotor A. van der Sluis); Delft University of Technology (professor from 1984); Utrecht University (from 1990; farewell lecture 2007, then emeritus)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "With Meijerink he co-invented incomplete-Cholesky preconditioned conjugate gradients (ICCG, 1977), and in 1992 he published Bi-CGSTAB. Bi-CGSTAB is a Krylov solver for nonsymmetric systems, such as those from convection-dominated or pressure–velocity-coupled CFD discretizations, and is a standard option in solver libraries.",
  "contributions": [
   {
    "year": "1977",
    "what": "With J. A. Meijerink: incomplete Cholesky factorization as a preconditioner for conjugate gradients (ICCG). A first report dates from 1972.",
    "work": "\"An iterative solution method for linear systems of which the coefficient matrix is a symmetric M-matrix\", Mathematics of Computation 31(137), 148–162",
    "confidence": "high"
   },
   {
    "year": "1992",
    "what": "Bi-CGSTAB: a variant of Bi-CG that avoids the irregular convergence of Sonneveld's CG-S (CGS) and is often much more efficient. In his farewell lecture he described it as 'in feite een goedkope, maar zeer effectieve, combinatie van BiCG en GMRES' (in fact a cheap but very effective combination of BiCG and GMRES), rather than applying BiCG twice as CGS does. Published March 1992.",
    "work": "\"Bi-CGSTAB: A Fast and Smoothly Converging Variant of Bi-CG for the Solution of Nonsymmetric Linear Systems\", SIAM J. Sci. Stat. Comput. 13(2), 631–644",
    "confidence": "high"
   }
  ],
  "notation": [
   "Bi-CGSTAB (1992)",
   "ICCG (1977)"
  ],
  "anecdote": "ICCG nearly did not get published. In his 2007 farewell lecture (in Dutch) van der Vorst recalled that the first report appeared in 1972 and that journals turned it down. Gene Golub, passing through Utrecht in 1975, was sceptical, then invited him to Stanford that summer and was convinced. The paper appeared in 1977, and the method took off after the physicist David Kershaw used it and published enthusiastic results in 1978. Bi-CGSTAB came after he finally understood the thinking behind Peter Sonneveld's CGS method (published 1989).",
  "quote": "",
  "quote_source": "",
  "contested": "The often-repeated 'most cited paper of the 1990s' needs its qualifier. In 2000 the ISI named Bi-CGSTAB the most cited mathematics article published in the 1990s, with 379 citations at that point (Sonneveld's CGS paper had 338; Wiles's 1995 Fermat paper had fewer than 100). Van der Vorst used this as a caution: most of the citations came about ten years after publication, outside the windows used in research evaluations. He also noted that ICCG took about ten years to break through and conjugate gradients (1952) about 25. His birth date and place (5 May 1944, Venlo) come from Wikipedia only.",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://www.nieuwarchief.nl/serie5/pdf/naw5-2007-08-4-252.pdf",
   "https://doi.org/10.1137/0913035",
   "https://doi.org/10.1090/S0025-5718-1977-0438681-4",
   "https://en.wikipedia.org/wiki/Henk_van_der_Vorst"
  ]
 },
 {
  "id": "ami-harten",
  "name": "Ami (Amiram) Harten",
  "born": "1946",
  "died": "1994",
  "places": "Born in Italy (1946), arrived in Israel 1947; Tel Aviv University (BSc 1969, MSc 1971; senior lecturer 1977, professor 1985); Courant Institute, New York University (PhD 1974 under Peter Lax; research positions 1971–77); ICASE, NASA Langley (visitor 1978–79); UCLA (visiting professor 1984–85); consultant to Los Alamos from 1981",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Harten introduced the two ideas that organise modern high-resolution shock capturing. Total-variation-diminishing (TVD) schemes (1983) cannot create new oscillations. Essentially non-oscillatory (ENO) reconstruction (1986–87, with Engquist, Osher and Chakravarthy) reaches high order by choosing the smoothest stencil. He died near Tel Aviv of sudden heart failure on 5 August 1994.",
  "contributions": [
   {
    "year": "1983",
    "what": "Defined schemes whose discrete total variation does not increase in time (the paper calls them TVNI, 'total variation nonincreasing') and built second-order 'high resolution' schemes with this property. Received 2 February 1982 (also an NYU report of March 1982), published March 1983; reprinted in JCP 135 (1997).",
    "work": "\"High resolution schemes for hyperbolic conservation laws\", Journal of Computational Physics 49(3), 357–393",
    "confidence": "high"
   },
   {
    "year": "1983",
    "what": "With Yee and Warming: implicit TVD schemes for steady-state calculations. The NASA Technical Memorandum of March 1983 already uses 'TVD' in its title; journal version in JCP 57(3), 327–360 (1985).",
    "work": "Yee, Warming & Harten, \"Implicit Total Variation Diminishing (TVD) Schemes for Steady-State Calculations\", NASA TM 84342",
    "confidence": "high"
   },
   {
    "year": "1983",
    "what": "With Lax and van Leer: the HLL approximate Riemann solver and a framework for Godunov-type schemes.",
    "work": "\"On upstream differencing and Godunov-type schemes for hyperbolic conservation laws\", SIAM Review 25(1), 35–61",
    "confidence": "high"
   },
   {
    "year": "1984",
    "what": "Further analysis of total-variation-stable high-resolution schemes, with an appendix by Peter Lax (NYU report version October 1982).",
    "work": "\"On a class of high resolution total-variation-stable finite-difference schemes\", SIAM J. Numer. Anal. 21(1), 1–23",
    "confidence": "high"
   },
   {
    "year": "1986",
    "what": "First published ENO papers: Chakravarthy, Harten & Osher, AIAA Paper 86-0339 (January 1986), and Harten, Osher, Engquist & Chakravarthy in Applied Numerical Mathematics 2(3–5), 347–377 (October 1986). A Harten–Osher report on uniformly high-order non-oscillatory schemes dates from May 1985 (SIAM J. Numer. Anal. 24, 1987).",
    "work": "\"Some results on uniformly high-order accurate essentially nonoscillatory schemes\", Applied Numerical Mathematics 2, 347–377",
    "confidence": "high"
   },
   {
    "year": "1987",
    "what": "With Engquist, Osher and Chakravarthy: ENO schemes of arbitrary order. A piecewise polynomial is reconstructed from cell averages using the stencil with the smallest divided differences, avoiding Gibbs-type oscillations at discontinuities. ICASE report version April 1986; reprinted in JCP 131(1), 3–47 (1997) with a preface by Shu.",
    "work": "\"Uniformly high order accurate essentially non-oscillatory schemes, III\", Journal of Computational Physics 71(2), 231–303",
    "confidence": "high"
   }
  ],
  "notation": [
   "TVD, total variation diminishing (in a title by March 1983; Harten's own 1983 JCP paper uses TVNI, 'total variation nonincreasing')",
   "ENO, essentially non-oscillatory (1986)"
  ],
  "anecdote": "Stanley Osher described Harten at other people's lectures: 'At one point, we, at UCLA, seriously considered installing seat belts in lecture halls to keep him from advancing to the blackboard and grabbing the chalk out of the speaker's hand.' He added that Harten was 'invariably kind to young people'. In the same note Osher quotes Peter Lax: 'Ami was larger than life--and louder too.'",
  "quote": "Ami Harten was truly an original. Whenever he needed something new in Mathematics, he would simply invent it. And if it already existed, he would re-invent it.",
  "quote_source": "Stanley Osher, memorial note, Los Angeles, July 1995, https://www.math.umd.edu/~tadmor/Editorial/Stan%20on%20Ami%201995.pdf",
  "contested": "The naming history is often told backwards. Harten's 1983 JCP paper uses 'TVNI', but 'TVD' was already in the title of a NASA Technical Memorandum he co-authored in March 1983 (Yee, Warming & Harten). An earlier version of this record said that memo used 'TVNI'; that was wrong. A story attributed to Lax's 1997 introduction, about the TVD initials being avoided for a time, could not be verified and has been removed. ENO is usually dated 1987 (JCP), but it appeared in 1986 conference and journal papers and in a 1985 report. Wikipedia gives the 1983 paper as issue 2; the publisher's metadata gives issue 3 (March 1983).",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://math.umd.edu/~tadmor/Editorial/AmiHarten.htm",
   "https://www.math.umd.edu/~tadmor/Editorial/Stan%20on%20Ami%201995.pdf",
   "https://doi.org/10.1016/0021-9991(83)90136-5",
   "https://doi.org/10.1016/0021-9991(87)90031-3"
  ]
 },
 {
  "id": "charles-peskin",
  "name": "Charles S. Peskin",
  "born": "1946",
  "died": "",
  "places": "New York City (born 15 April 1946); Harvard (AB 1968); Albert Einstein College of Medicine of Yeshiva University (PhD 1972); Courant Institute, New York University",
  "tags": [
   "computation",
   "mathematics"
  ],
  "summary": "Peskin invented what is now called the immersed boundary method while modelling blood flow through heart valves. Elastic structures are represented by moving Lagrangian points that spread their forces onto a fixed Eulerian fluid grid through a smoothed delta function, and that move with the interpolated fluid velocity. Complex moving boundaries therefore never need a body-fitted mesh.",
  "contributions": [
   {
    "year": "1972",
    "what": "PhD thesis (July 1972) on computing flow around heart valves; advisor Alexandre Chorin.",
    "work": "\"Flow Patterns Around Heart Valves: A Digital Computer Method for Solving the Equations of Motion\", Albert Einstein College of Medicine of Yeshiva University",
    "confidence": "high"
   },
   {
    "year": "1972",
    "what": "Journal version of the heart-valve method, with Peskin at the Albert Einstein College of Medicine. Published October 1972.",
    "work": "\"Flow patterns around heart valves: A numerical method\", Journal of Computational Physics 10(2), 252–271",
    "confidence": "high"
   },
   {
    "year": "1977",
    "what": "Extended numerical analysis of blood flow in the heart, by then at the Courant Institute. Published November 1977.",
    "work": "\"Numerical analysis of blood flow in the heart\", Journal of Computational Physics 25(3), 220–252",
    "confidence": "high"
   },
   {
    "year": "2002",
    "what": "Definitive review of the method.",
    "work": "\"The immersed boundary method\", Acta Numerica 11, 479–517",
    "confidence": "high"
   }
  ],
  "notation": [
   "immersed boundary (IB) method",
   "regularized (smoothed) discrete delta function coupling Lagrangian and Eulerian grids"
  ],
  "anecdote": "One of the most widely used CFD techniques for moving boundaries came out of a PhD at a medical school. Peskin was a MacArthur Fellow from 1983 and later a member of the US National Academy of Sciences (1995) and the Institute of Medicine (2000).",
  "quote": "",
  "quote_source": "",
  "contested": "'Peskin's 1972 immersed boundary method' is a retrospective label. The 1972 and 1977 papers are titled as heart-valve and blood-flow studies, and later titles speak of 'immersed elastic fibers' (1989, JCP 81) and 'immersed elastic boundaries' (1993). The phrase 'immersed boundary method' is in a title by 1997 (McQueen & Peskin, J. Supercomputing 11(3), 213–236). An earlier version of this record named Arthurs et al. (1998) as the first such title; the 1997 paper is earlier. Mittal & Seo's 2023 review (Phys. Rev. Fluids 8, 100501) says the thesis introduced the method 'that would later become known as' the immersed boundary method.",
  "chapters": [
   "pressure",
   "discretization"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Charles_S._Peskin",
   "https://math.nyu.edu/~peskin/publications/index.html",
   "https://doi.org/10.1016/0021-9991(72)90065-4",
   "https://doi.org/10.1103/PhysRevFluids.8.100501"
  ]
 },
 {
  "id": "chi-wang-shu",
  "name": "Chi-Wang Shu",
  "born": "1957",
  "died": "",
  "places": "University of Science and Technology of China, Hefei (BS 1982); UCLA (PhD 1986, advisor Stanley Osher); Institute for Mathematics and its Applications, University of Minnesota (address on the 1988 JCP paper); Brown University (from 1987)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Shu made high-order shock capturing practical. In 1988 he introduced TVD time discretizations, now called strong-stability-preserving (SSP), and with Osher a flux-based ENO implementation using TVD Runge–Kutta time stepping. With G.-S. Jiang (1996) he developed the fifth-order WENO scheme (WENO-JS) that most codes mean by 'WENO'.",
  "contributions": [
   {
    "year": "1988",
    "what": "Sole-author paper on time discretizations that keep the TVD property of a method-of-lines spatial scheme. It presents a class of m-step Runge–Kutta-type TVD discretizations with CFL number m, aimed at steady-state calculations, and a class of multilevel high-order TVD discretizations for time-dependent problems. Published November 1988.",
    "work": "\"Total-Variation-Diminishing Time Discretizations\", SIAM J. Sci. Stat. Comput. 9(6), 1073–1084",
    "confidence": "high"
   },
   {
    "year": "1988",
    "what": "With Osher: a simpler ENO construction based on numerical fluxes rather than cell averages, combined with TVD Runge–Kutta methods written as convex combinations of forward-Euler steps. Shu's own lecture notes cite this paper as where TVD Runge–Kutta methods were developed, and as a source of the optimal third-order TVD Runge–Kutta scheme (the 'Shu–Osher' scheme).",
    "work": "\"Efficient implementation of essentially non-oscillatory shock-capturing schemes\", Journal of Computational Physics 77(2), 439–471",
    "confidence": "high"
   },
   {
    "year": "1989",
    "what": "Second Shu–Osher ENO paper. It is commonly cited as the source of the shock / entropy-wave interaction test called the 'Shu–Osher problem'. Published July 1989.",
    "work": "\"Efficient implementation of essentially non-oscillatory shock-capturing schemes, II\", Journal of Computational Physics 83(1), 32–78",
    "confidence": "medium"
   },
   {
    "year": "1996",
    "what": "With Jiang: a new measure of smoothness that gives fifth-order WENO from third-order (r = 3) stencils, instead of the fourth order of the earlier version. Also suggested computing weights from pressure and entropy for the Euler equations, and included a 2D shock / entropy-wave test. Published June 1996.",
    "work": "\"Efficient Implementation of Weighted ENO Schemes\", Journal of Computational Physics 126(1), 202–228",
    "confidence": "high"
   },
   {
    "year": "2001",
    "what": "With Gottlieb and Tadmor: renamed TVD time discretizations 'strong stability preserving' (SSP) and developed the theory of optimal SSP methods.",
    "work": "\"Strong Stability-Preserving High-Order Time Discretization Methods\", SIAM Review 43(1), 89–112",
    "confidence": "high"
   }
  ],
  "notation": [
   "TVD Runge–Kutta (1988), renamed SSP, 'strong stability preserving', in 2001",
   "WENO-JS smoothness indicators (1996)"
  ],
  "anecdote": "The key idea of the 1988 time steppers is simple enough to teach in one line. Write each Runge–Kutta stage as an average of forward-Euler steps. Whatever forward Euler preserves, such as not creating new oscillations, the high-order method preserves too, within a modified time-step limit.",
  "quote": "",
  "quote_source": "",
  "contested": "An earlier version of this record called 'TVD Runge–Kutta with Osher (1988)' a conflation. That was wrong. Shu's own 1997 lecture notes (ICASE Report 97-65) say the TVD Runge–Kutta methods were 'developed in' Shu & Osher (JCP 77, 1988) and further in Gottlieb & Shu. The sole-author SIAM paper of the same year is a separate treatment of TVD time discretizations. The name 'SSP' dates from 2001 (Gottlieb, Shu and Tadmor). WENO itself is often credited to Jiang and Shu. The first WENO paper is Liu, Osher and Chan (1994); Jiang and Shu introduced the smoothness indicators that made fifth order standard. Shu's birth date and place (1 January 1957, Nanchang) come from Wikipedia only.",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1137/0909073",
   "https://doi.org/10.1006/jcph.1996.0130",
   "https://ntrs.nasa.gov/citations/19980007543",
   "https://en.wikipedia.org/wiki/Chi-Wang_Shu"
  ]
 },
 {
  "id": "j-eddie-welch",
  "name": "J. Eddie Welch",
  "born": "",
  "died": "",
  "places": "Los Alamos Scientific Laboratory",
  "tags": [
   "computation"
  ],
  "summary": "Co-author with Francis Harlow of the 1965 marker-and-cell (MAC) paper, which introduced the staggered-grid pressure–velocity approach to incompressible free-surface flow.",
  "contributions": [
   {
    "year": "1965",
    "what": "Co-developed the MAC method for viscous incompressible flow with a free surface.",
    "work": "Numerical calculation of time-dependent viscous incompressible flow of fluid with free surface, Phys. Fluids 8(12), 2182–2189 (with F. H. Harlow)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "No reliable biographical details (dates, career) were found. Do not fill these in without a source.",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://pubs.aip.org/pfl/article/8/12/2182/951500/Numerical-Calculation-of-Time-Dependent-Viscous",
   "https://doi.org/10.1063/1.1761178"
  ]
 },
 {
  "id": "ronald-fedkiw",
  "name": "Ronald Fedkiw",
  "born": "1968",
  "died": "",
  "places": "Buffalo, New York (born 27 February 1968); UCLA (PhD 1996, advisor Stanley Osher; then postdoc); Caltech (postdoc); Stanford University (from 2000); Industrial Light & Magic (consultant from 2000)",
  "tags": [
   "graphics",
   "computation"
  ],
  "summary": "Fedkiw carried shock-capturing and level-set numerics from applied mathematics into film effects. His work includes vorticity confinement for smoke (2001, with Stam and Jensen), the particle level set method (2002), an unconditionally stable MacCormack-type advection scheme (2008), and Industrial Light & Magic simulation systems that received Academy Scientific and Technical awards in 2008 and 2015.",
  "contributions": [
   {
    "year": "2001",
    "what": "Smoke with the inviscid Euler equations on coarse grids, plus a vorticity confinement term to restore small-scale swirling lost to numerical dissipation.",
    "work": "Fedkiw, Stam & Jensen, \"Visual simulation of smoke\", SIGGRAPH 2001 Proceedings, 15–22",
    "confidence": "high"
   },
   {
    "year": "2001",
    "what": "Liquids combining level sets with particles.",
    "work": "Foster & Fedkiw, \"Practical animation of liquids\", SIGGRAPH 2001 Proceedings, 23–30",
    "confidence": "high"
   },
   {
    "year": "2002",
    "what": "The particle level set method: marker particles on both sides of the interface correct the mass loss of level-set advection. Published November 2002.",
    "work": "Enright, Fedkiw, Ferziger & Mitchell, \"A Hybrid Particle Level Set Method for Improved Interface Capturing\", Journal of Computational Physics 183(1), 83–116",
    "confidence": "high"
   },
   {
    "year": "2002",
    "what": "Particle level sets applied to animating and rendering water surfaces.",
    "work": "Enright, Marschner & Fedkiw, \"Animation and rendering of complex water surfaces\", ACM Transactions on Graphics 21(3), 736–744",
    "confidence": "high"
   },
   {
    "year": "2003",
    "what": "Textbook with Osher.",
    "work": "Level Set Methods and Dynamic Implicit Surfaces (Springer)",
    "confidence": "high"
   },
   {
    "year": "2008",
    "what": "With Selle, Kim, Liu and Rossignac: a semi-Lagrangian MacCormack scheme that keeps unconditional stability while reducing dissipation (online November 2007, issue June 2008).",
    "work": "\"An Unconditionally Stable MacCormack Method\", Journal of Scientific Computing 35(2–3), 350–371",
    "confidence": "high"
   },
   {
    "year": "2008",
    "what": "Academy Scientific and Engineering Award (Academy Plaque), with Nick Rasmussen and Frank Losasso Petterson, for the ILM fluid simulation system; the citation describes large-scale water effects within ILM's Zeno framework, including particle level sets.",
    "work": "Scientific and Technical Academy Awards, 2008",
    "confidence": "high"
   },
   {
    "year": "2015",
    "what": "Academy Technical Achievement Award (Academy Certificate), with Brice Criswell, for the ILM PhysBAM Destruction System.",
    "work": "Scientific and Technical Academy Awards, 2015",
    "confidence": "high"
   }
  ],
  "notation": [
   "particle level set (2002)",
   "vorticity confinement brought into graphics (2001)"
  ],
  "anecdote": "Fedkiw trained in applied mathematics under Osher, joined Stanford computer science in 2000 and began consulting for Industrial Light & Magic the same year. The Academy's 2008 citation for ILM's fluid system mentions particle level sets, a method he had published in the Journal of Computational Physics six years earlier.",
  "quote": "",
  "quote_source": "",
  "contested": "The 2001 smoke paper calls its vorticity confinement term 'physically consistent'. It injects energy and is a numerical fix rather than physics. Wikipedia dates the Osher–Fedkiw book to 2002, but the publisher's metadata gives 2003. Wikipedia also calls the 2008 award a Technical Achievement Award, but the Academy's list classes it as a Scientific and Engineering Award (Academy Plaque). An earlier version of this record linked his work to a specific film series without a source; that has been replaced by the Academy citations.",
  "chapters": [
   "stable-fluids"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Ronald_Fedkiw",
   "https://www.oscars.org/sci-tech/ceremonies/2008",
   "https://doi.org/10.1006/jcph.2002.7166",
   "https://doi.org/10.1007/s10915-007-9166-4"
  ]
 },
 {
  "id": "james-deardorff",
  "name": "James W. Deardorff",
  "born": "",
  "died": "",
  "places": "National Center for Atmospheric Research (Boulder, Colorado)",
  "tags": [
   "meteorology",
   "computation",
   "turbulence"
  ],
  "summary": "NCAR meteorologist whose 1970 simulation of turbulent channel flow is generally regarded as the first large-eddy simulation: resolve the large eddies on the grid and model the rest with an eddy viscosity based on the local deformation.",
  "contributions": [
   {
    "year": "1970 (13 April)",
    "what": "Integrated the 3D primitive equations for plane Poiseuille (channel) flow at very large Reynolds number on 6720 uniform grid intervals. Subgrid effects were modelled by eddy coefficients proportional to the local velocity deformation. The statistics agreed with Laufer's measurements to a degree ranging from good to marginal.",
    "work": "A numerical study of three-dimensional turbulent channel flow at large Reynolds numbers, J. Fluid Mech. 41(2), 453–480",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "Deardorff (1970) is usually given credit for the first LES, but the subgrid closure came from Smagorinsky's 1963 atmospheric eddy viscosity and Lilly's 1960s analysis of it, so LES has a meteorological origin. His birth and death dates were not verified and are left blank.",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1017/S0022112070000691",
   "https://www.cambridge.org/core/product/identifier/S0022112070000691/type/journal_article"
  ]
 },
 {
  "id": "g-s-patterson",
  "name": "G. S. Patterson Jr.",
  "born": "",
  "died": "",
  "places": "National Center for Atmospheric Research, Boulder (affiliation at the time of the 1971–72 papers)",
  "tags": [
   "computation",
   "turbulence"
  ],
  "summary": "Co-author with Steven Orszag of the 1971 dealiasing paper and the 1972 direct numerical simulation of 3D homogeneous isotropic turbulence, the start of DNS as a research tool.",
  "contributions": [
   {
    "year": "1971",
    "what": "Co-developed efficient removal of aliasing interactions in spectral turbulence calculations.",
    "work": "Spectral calculations of isotropic turbulence: efficient removal of aliasing interactions, Phys. Fluids 14(11), 2538–2541 (with S. A. Orszag)",
    "confidence": "high"
   },
   {
    "year": "1972",
    "what": "Co-performed the first DNS of homogeneous isotropic turbulence at laboratory Reynolds numbers (32³ pseudospectral).",
    "work": "Numerical simulation of three-dimensional homogeneous isotropic turbulence, Phys. Rev. Lett. 28(2), 76–79 (with S. A. Orszag)",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "",
  "quote": "",
  "quote_source": "",
  "contested": "His full first name and life dates were not found. Do not fill these in without a source.",
  "chapters": [
   "turbulence"
  ],
  "sources": [
   "https://doi.org/10.1103/PhysRevLett.28.76",
   "https://doi.org/10.1063/1.1693365",
   "https://mathshistory.st-andrews.ac.uk/Biographies/Orszag/"
  ]
 },
 {
  "id": "patrick-roache",
  "name": "Patrick J. Roache",
  "born": "",
  "died": "",
  "places": "Ecodynamics Research Associates, Albuquerque, New Mexico (1985 and 1994 papers); independent consultant, Los Lunas, New Mexico (2001 paper)",
  "tags": [
   "computation",
   "engineering"
  ],
  "summary": "Roache wrote one of the first CFD textbooks (1972) and later pressed the field to separate code verification ('are we solving the equations right?') from validation ('are we solving the right equations?'). He developed manufactured solutions with Steinberg (1985) and proposed the Grid Convergence Index (1994), now a standard way to report discretization uncertainty from grid-refinement studies.",
  "contributions": [
   {
    "year": "1972",
    "what": "Early textbook on computational fluid dynamics.",
    "work": "Computational Fluid Dynamics (Hermosa Publishers, Albuquerque)",
    "confidence": "high"
   },
   {
    "year": "1985",
    "what": "With Stanly Steinberg (University of New Mexico): symbolic manipulation in CFD code development and testing. This is the work usually cited as the origin of the method of manufactured solutions: choose an analytic solution, compute the source term it requires, and check that the code converges to it at the expected order. Published January 1985.",
    "work": "Steinberg & Roache, \"Symbolic manipulation and computational fluid dynamics\", Journal of Computational Physics 57(2), 251–284",
    "confidence": "high"
   },
   {
    "year": "1994",
    "what": "Proposed the Grid Convergence Index for uniform reporting of grid-refinement studies. It relates any grid-refinement result to what a grid doubling with a second-order method would give, using an error estimator from generalized Richardson extrapolation. Published September 1994.",
    "work": "\"Perspective: A Method for Uniform Reporting of Grid Refinement Studies\", Journal of Fluids Engineering 116(3), 405–413",
    "confidence": "high"
   },
   {
    "year": "1998",
    "what": "Monograph on verification and validation.",
    "work": "Verification and Validation in Computational Science and Engineering (Hermosa Publishers)",
    "confidence": "high"
   },
   {
    "year": "2002",
    "what": "Review and advocacy of the method of manufactured solutions for code verification, distinguishing verification of codes (error evaluation against known solutions) from verification of calculations (error estimation). Online November 2001, March 2002 issue.",
    "work": "\"Code Verification by the Method of Manufactured Solutions\", Journal of Fluids Engineering 124(1), 4–10",
    "confidence": "high"
   }
  ],
  "notation": [
   "GCI, Grid Convergence Index (1994)",
   "MMS, method of manufactured solutions (term popularised by Roache in the late 1990s and 2000s)"
  ],
  "anecdote": "Manufactured solutions began with computer algebra. The 1985 paper is about symbolic manipulation, and the 2001 paper still notes that for complex codes MMS 'utilizes Symbolic Manipulation'. The 1994 GCI paper ends its abstract with a pointed remark: the simple formulas 'may be applied a posteriori by editors and reviewers, even if authors are reluctant to do so'.",
  "quote": "",
  "quote_source": "",
  "contested": "The origin of MMS is dated inconsistently. Some papers say 1984, citing a Roache & Steinberg AIAA Journal article not checked here, and others cite the 1985 JCP paper. The 2002 JFE paper is sometimes dated 2001 because it appeared online in November 2001. An earlier version of this record named the computer algebra system used (Macsyma) and a 1976 revised printing of the textbook; neither was verified, and both have been removed. Roache's birth date and biography were not verified and are left blank.",
  "chapters": [
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1115/1.2910291",
   "https://doi.org/10.1016/0021-9991(85)90045-2",
   "https://doi.org/10.1115/1.1436090",
   "https://openlibrary.org/isbn/0913478024"
  ]
 },
 {
  "id": "boris-book-fct",
  "name": "Jay P. Boris & David L. Book",
  "born": "",
  "died": "",
  "places": "US Naval Research Laboratory, Washington DC (Plasma Physics Division on the 1975 paper)",
  "tags": [
   "computation"
  ],
  "summary": "They introduced flux-corrected transport (FCT) in 1973. First take a diffusive, monotone low-order step, then add back as much 'antidiffusive' flux as possible without creating new maxima or minima. It was the first widely used nonlinear way to avoid both ripples and smearing at sharp fronts, and it anticipated the limiter ideas behind later TVD schemes.",
  "contributions": [
   {
    "year": "1973",
    "what": "Introduced FCT and the SHASTA algorithm: a transport step followed by a limited antidiffusion step that corrects the transport step's numerical diffusion while keeping the solution free of new extrema. Published January 1973.",
    "work": "\"Flux-corrected transport. I. SHASTA, a fluid transport algorithm that works\", Journal of Computational Physics 11(1), 38–69",
    "confidence": "high"
   },
   {
    "year": "1975",
    "what": "Generalized FCT beyond the original SHASTA form (with K. Hain). Published July 1975.",
    "work": "Book, Boris & Hain, \"Flux-corrected transport II: Generalizations of the method\", Journal of Computational Physics 18(3), 248–283",
    "confidence": "high"
   },
   {
    "year": "1979",
    "what": "Not by Boris & Book, but the standard follow-on: S. T. Zalesak's fully multidimensional FCT limiter. Published June 1979.",
    "work": "Zalesak, \"Fully multidimensional flux-corrected transport algorithms for fluids\", Journal of Computational Physics 31(3), 335–362",
    "confidence": "high"
   },
   {
    "year": "1997",
    "what": "The 1973 paper was reprinted in JCP's anniversary issue alongside other landmark papers (van Leer, Roe, Harten).",
    "work": "Boris & Book, \"Flux-Corrected Transport\", Journal of Computational Physics 135(2), 172–186",
    "confidence": "high"
   }
  ],
  "notation": [
   "flux-corrected transport (FCT), 1973",
   "SHASTA, 1973",
   "antidiffusion / antidiffusive flux"
  ],
  "anecdote": "The 1973 paper's subtitle is unusually blunt: 'a fluid transport algorithm that works'. At the time, linear schemes either smeared fronts (first order) or produced ripples around them (higher order).",
  "quote": "",
  "quote_source": "",
  "contested": "Secondary sources often spell out SHASTA as an acronym. That expansion was not verified against the paper, so it is omitted. FCT predates the TVD framework (Harten, 1983) and is sometimes loosely grouped with TVD schemes, but it was developed independently and its limiter is defined differently.",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(73)90147-2",
   "https://doi.org/10.1016/0021-9991(75)90002-9",
   "https://doi.org/10.1016/0021-9991(79)90051-2",
   "https://doi.org/10.1006/jcph.1997.5700"
  ]
 },
 {
  "id": "hardy-pomeau-de-pazzis-hpp",
  "name": "J. Hardy, Y. Pomeau & O. de Pazzis (HPP lattice gas)",
  "born": "",
  "died": "",
  "places": "Laboratoire de Physique des Plasmas, Faculté des Sciences, Orsay, France (1973 letter); de Pazzis also listed at CNRS, Marseille",
  "tags": [
   "theory",
   "computation"
  ],
  "summary": "In 1973 they defined the first lattice gas. Particles sit on a square lattice and move with unit speed in four directions, and head-on pairs scatter at right angles. It conserves mass and momentum, but the square lattice gives anisotropic, non-Navier–Stokes behaviour and extra spurious conserved quantities. FHP fixed this in 1986 by switching to a hexagonal lattice.",
  "contributions": [
   {
    "year": "1973",
    "what": "Letter introducing the two-dimensional classical lattice system. The abstract reports a sound speed of 1/√2 (in lattice units) and a Kubo-type expression for the viscosity. Published 30 July 1973.",
    "work": "\"Time Evolution of a Two-Dimensional Classical Lattice System\", Physical Review Letters 31(5), 276–279",
    "confidence": "high"
   },
   {
    "year": "1973",
    "what": "Full paper on invariant states and time-correlation functions of the model. Published December 1973.",
    "work": "\"Time evolution of a two-dimensional model system. I. Invariant states and time correlation functions\", Journal of Mathematical Physics 14(12), 1746–1759",
    "confidence": "high"
   },
   {
    "year": "1976",
    "what": "Transport properties and time-correlation functions of the lattice gas (author order: Hardy, de Pazzis, Pomeau). Published May 1976.",
    "work": "\"Molecular dynamics of a classical lattice gas: Transport properties and time correlation functions\", Physical Review A 13(5), 1949–1961",
    "confidence": "high"
   }
  ],
  "notation": [
   "HPP model (from the authors' initials, in the order of the 1973 papers)"
  ],
  "anecdote": "HPP was built as a toy model for statistical mechanics, not as a flow solver. The paper titles are about invariant states, time-correlation functions and transport coefficients. It took 13 years and a change of lattice before a lattice gas was shown to give Navier–Stokes flow.",
  "quote": "The idea of making both velocities and locations discrete by using a von Neumann cellular automaton (now called Lattice Gas Automaton = LGA) is due to Hardy, de Pazzis and Pomeau (1973).",
  "quote_source": "Uriel Frisch, 'Lattice Boltzmann: a short history', November 2009, https://www.imo.universite-paris-saclay.fr/~fdubois/organisation/19janv2010/communications/Frisch-lba.pdf",
  "contested": "Pomeau's Wikipedia entry describes HPP as 'the first lattice Boltzmann model'. It is a Boolean lattice-gas automaton; lattice Boltzmann, which evolves real-valued averaged populations, came in 1988 (McNamara and Zanetti). Frisch's Wikipedia entry notes HPP's 'unwanted and unphysical conservation laws'. The papers give the first authors only as initials; an earlier version of this record used the first names Jean (Hardy) and Olivier (de Pazzis), which could not be confirmed and have been replaced by initials.",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1103/PhysRevLett.31.276",
   "https://doi.org/10.1063/1.1666248",
   "https://doi.org/10.1103/PhysRevA.13.1949",
   "https://www.imo.universite-paris-saclay.fr/~fdubois/organisation/19janv2010/communications/Frisch-lba.pdf"
  ]
 },
 {
  "id": "gingold-monaghan",
  "name": "Robert A. Gingold & Joseph J. Monaghan",
  "born": "",
  "died": "",
  "places": "Institute of Astronomy, University of Cambridge (both authors, 1977 paper); Monash University, Melbourne (Monaghan, later emeritus professor)",
  "tags": [
   "computation",
   "theory"
  ],
  "summary": "Their 1977 MNRAS paper gave smoothed particle hydrodynamics its name. Fluid quantities are estimated by kernel smoothing over particles, a technique taken from statistical density estimation, and the paper applied it to non-spherical stars. Monaghan spent the following decades developing SPH into a general-purpose method, now used in astrophysics, free-surface flow and graphics.",
  "contributions": [
   {
    "year": "1977",
    "what": "Introduced 'smoothed particle hydrodynamics': fluid quantities are kernel-weighted sums over particles, and the particle equations of motion follow from these estimates. In 3D tests with about 80 particles, a non-axisymmetric particle distribution reproduced uniformly rotating and magnetic polytropes to within a few per cent. Published 1 December 1977, independently of Lucy's paper.",
    "work": "\"Smoothed particle hydrodynamics: theory and application to non-spherical stars\", Monthly Notices of the Royal Astronomical Society 181(3), 375–389",
    "confidence": "high"
   },
   {
    "year": "1992",
    "what": "Monaghan's widely cited review of SPH.",
    "work": "\"Smoothed Particle Hydrodynamics\", Annual Review of Astronomy and Astrophysics 30, 543–574",
    "confidence": "high"
   },
   {
    "year": "2005",
    "what": "Monaghan's second major review, covering SPH 'since its inception in 1977' and its extension to a wider range of physics.",
    "work": "\"Smoothed particle hydrodynamics\", Reports on Progress in Physics 68(8), 1703–1759",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Smoothed particle hydrodynamics' (SPH): the name first appears in the title of Gingold & Monaghan's 1977 paper"
  ],
  "anecdote": "SPH was not invented for water. Both 1977 papers were astrophysical. Lucy was testing whether rotating protostars split apart, while Gingold and Monaghan tested their method on rotating and magnetic stellar models (polytropes), using only about 80 particles in three dimensions.",
  "quote": "",
  "quote_source": "",
  "contested": "The method was invented twice in 1977, and both papers deserve credit; reviews such as Rasio (astro-ph/9911360) cite 'Lucy and Gingold & Monaghan' together. Only Gingold and Monaghan's title uses the phrase 'smoothed particle hydrodynamics'. An earlier version of this record said both 1977 papers studied fission; only Lucy's did. It also paraphrased Monaghan's 2005 review from a search snippet; that paraphrase has been removed because it could not be checked. Gingold's biography could not be verified, so no dates are given.",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1093/mnras/181.3.375",
   "https://en.wikipedia.org/wiki/Joseph_J._Monaghan",
   "https://doi.org/10.1088/0034-4885/68/8/R01",
   "https://arxiv.org/pdf/astro-ph/9911360"
  ]
 },
 {
  "id": "ghia-ghia-shin",
  "name": "Urmila Ghia, K. N. Ghia & C. T. Shin",
  "born": "",
  "died": "",
  "places": "University of Cincinnati",
  "tags": [
   "computation"
  ],
  "summary": "Their 1982 JCP paper computed the two-dimensional lid-driven square cavity at high Reynolds numbers with a multigrid Navier–Stokes solver. Their tabulated velocity profiles along the cavity centrelines became the most widely used first check for incompressible flow codes.",
  "contributions": [
   {
    "year": "1982",
    "what": "High-Reynolds-number driven-cavity solutions of the incompressible Navier–Stokes equations computed with a multigrid method, with tabulated centreline velocities that later work uses as reference data. Published December 1982.",
    "work": "\"High-Re solutions for incompressible flow using the Navier-Stokes equations and a multigrid method\", Journal of Computational Physics 48(3), 387–411",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "The most-cited cavity benchmark does not mention the cavity in its title, which promises only 'High-Re solutions for incompressible flow'. Generations of students know it simply as 'Ghia et al.'.",
  "quote": "",
  "quote_source": "",
  "contested": "Matching 'Ghia et al.' is often treated as proof that a code is right. Their numbers are a discrete, finite-difference solution, not exact values, so agreement shows consistency with another approximation. More accurate reference data came later: Botella & Peyret (1998, spectral; Computers & Fluids 27(4), 421–433) and Erturk, Corke & Gökçöl (2005, IJNMF 48(7), 747–774, on a 601 × 601 grid up to Re = 21,000 with residuals below 1e-10). Commonly repeated details of the 1982 paper (Re up to 10,000, grids up to 257 × 257, a coupled strongly implicit multigrid solver) were not checked against the paper. An earlier version of this record quoted a CPU time 'from the abstract'; no abstract could be retrieved, so that anecdote was removed.",
  "chapters": [
   "trust",
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(82)90058-4",
   "https://doi.org/10.1016/S0045-7930(98)00002-4",
   "https://doi.org/10.1002/fld.953"
  ]
 },
 {
  "id": "rhie-chow",
  "name": "C. M. Rhie & W. L. Chow",
  "born": "",
  "died": "",
  "places": "Detroit Diesel Allison, Indianapolis (Rhie); University of Illinois at Urbana-Champaign (Chow); affiliations as indexed for the 1983 paper",
  "tags": [
   "computation",
   "engineering"
  ],
  "summary": "Their 1983 airfoil paper introduced the momentum-based interpolation of cell-face velocities now called Rhie–Chow interpolation. It lets pressure and velocity be stored at the same (collocated) points without the checkerboard pressure mode that plain central differencing allows. This made collocated finite-volume codes a practical alternative to the staggered MAC grid, and variants of it are standard in collocated-grid codes.",
  "contributions": [
   {
    "year": "1983",
    "what": "Computed turbulent flow past an airfoil with trailing-edge separation on a collocated grid. Face velocities were interpolated using the discretized momentum equation, so the pressure difference across each face couples adjacent cells and suppresses odd–even (checkerboard) pressure decoupling. Published November 1983.",
    "work": "\"Numerical study of the turbulent flow past an airfoil with trailing edge separation\", AIAA Journal 21(11), 1525–1532",
    "confidence": "high"
   },
   {
    "year": "1988",
    "what": "Not by Rhie & Chow: S. Majumdar examined how the under-relaxation factor enters momentum interpolation on non-staggered grids, the starting point for later corrections to the original form.",
    "work": "Majumdar, \"Role of underrelaxation in momentum interpolation for calculation of flow with nonstaggered grids\", Numerical Heat Transfer 13(1), 125–132",
    "confidence": "medium"
   }
  ],
  "notation": [
   "Rhie–Chow interpolation / momentum interpolation (eponym used in later literature)"
  ],
  "anecdote": "The paper that made their names famous says nothing about interpolation in its title. It is about separated airfoil flow, and the interpolation was the means of getting a collocated solver to work.",
  "quote": "",
  "quote_source": "",
  "contested": "The original 1983 form has a known flaw: its converged solution can depend on the under-relaxation factor (Majumdar 1988) and, in transient use, on the time step. Later variants correct for this. An earlier version of this record also said 'some studies' show the original form can still allow checkerboarding; that claim was not traced to a specific source and has been removed, along with two unrelated citations. The affiliations come from bibliographic indexing and were not checked against the paper's title page.",
  "chapters": [
   "pressure"
  ],
  "sources": [
   "https://doi.org/10.2514/3.8284",
   "https://doi.org/10.1080/10407788808913607"
  ]
 },
 {
  "id": "saad-schultz-gmres",
  "name": "Youcef Saad & Martin H. Schultz",
  "born": "",
  "died": "",
  "places": "Yale University, Department of Computer Science; later University of Illinois (1986–88) and University of Minnesota (from 1990) (Saad)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "GMRES (1986) builds an orthonormal Krylov basis with the Arnoldi process and, at each step, picks the iterate in that subspace with the smallest residual norm. It works for any nonsymmetric matrix, but memory and work grow with each iteration, so it is normally restarted every m steps, which is GMRES(m). It is one of the two standard Krylov solvers for nonsymmetric CFD systems, alongside Bi-CGSTAB.",
  "contributions": [
   {
    "year": "1986",
    "what": "Introduced the generalized minimal residual algorithm (GMRES) for nonsymmetric linear systems, including its restarted form. The abstract describes it as based on the Arnoldi process, a generalization of MINRES, and theoretically equivalent to GCR and ORTHODIR. Published July 1986.",
    "work": "\"GMRES: A Generalized Minimal Residual Algorithm for Solving Nonsymmetric Linear Systems\", SIAM J. Sci. Stat. Comput. 7(3), 856–869",
    "confidence": "high"
   },
   {
    "year": "1983",
    "what": "The algorithm is reported to have first circulated as a Yale technical report before journal publication.",
    "work": "Yale technical report (number and date not verified)",
    "confidence": "low"
   },
   {
    "year": "2003",
    "what": "Saad's textbook on iterative methods (second edition), a standard reference for Krylov solvers and preconditioning.",
    "work": "Iterative Methods for Sparse Linear Systems, 2nd ed., SIAM",
    "confidence": "high"
   }
  ],
  "notation": [
   "GMRES and restarted GMRES(m) (1986)"
  ],
  "anecdote": "Henk van der Vorst remarked in his 2007 farewell lecture that GMRES, proposed in 1986, took about ten years to become the method of choice, as his own ICCG had. Conjugate gradients had taken about 25.",
  "quote": "",
  "quote_source": "",
  "contested": "Saad's first name is spelled 'Youcef' on the 1986 paper and 'Yousef' in many later sources, which matters when searching citations. An earlier version of this record implied that conjugate gradients also took about ten years to catch on; van der Vorst's figure for CG is about 25 years. The 1983 report version is commonly cited but was not verified. Saad was born in 1950 in Algiers (Wikipedia). Schultz's biographical details were not verified.",
  "chapters": [
   "solvers"
  ],
  "sources": [
   "https://doi.org/10.1137/0907058",
   "https://en.wikipedia.org/wiki/Yousef_Saad",
   "https://en.wikipedia.org/wiki/Generalized_minimal_residual_method",
   "https://www.nieuwarchief.nl/serie5/pdf/naw5-2007-08-4-252.pdf"
  ]
 },
 {
  "id": "peter-sweby",
  "name": "Peter K. Sweby",
  "born": "",
  "died": "",
  "places": "",
  "tags": [
   "computation",
   "mathematics"
  ],
  "summary": "Sweby's 1984 paper turned flux limiters into a single framework. A second-order scheme is built by adding a limited antidiffusive flux to a first-order one. The limiter is a function of the ratio of successive solution gradients, and he derived bounds it must satisfy for the scheme to be TVD. The plot of admissible limiter curves, now called the 'Sweby diagram', is where the classic limiters are compared.",
  "contributions": [
   {
    "year": "1984",
    "what": "Explored high-resolution, second-order, oscillation-free (TVD) explicit scalar schemes made by adding a limited antidiffusive flux to a first-order scheme. Derived bounds for such limiters and presented a class of limiters that 'includes a very compressive limiter due to Roe' (later called superbee), comparing limiters theoretically and numerically. Published October 1984.",
    "work": "\"High Resolution Schemes Using Flux Limiters for Hyperbolic Conservation Laws\", SIAM Journal on Numerical Analysis 21(5), 995–1011",
    "confidence": "high"
   }
  ],
  "notation": [
   "limiter function φ(r) of the gradient ratio r, plotted in what is now called the 'Sweby diagram' of admissible second-order TVD limiters (1984; the name came later)"
  ],
  "anecdote": "The diagram makes the trade-off between limiters visible. Minmod lies along the lower edge of the admissible second-order region (most diffusive) and superbee along the upper edge (most compressive). Van Leer's and other smooth limiters lie in between.",
  "quote": "",
  "quote_source": "",
  "contested": "The diagram is often presented as showing 'the TVD region' in general. Strictly, it shows sufficient bounds derived for Sweby's class of flux-limited schemes, plus a second-order sub-region. Neither the name 'superbee' nor 'Sweby diagram' appears in the paper's abstract; both are later usage. Sweby's affiliation and biographical details could not be verified and are left blank.",
  "chapters": [
   "shocks",
   "advection"
  ],
  "sources": [
   "https://doi.org/10.1137/0721062",
   "https://api.openalex.org/works/doi:10.1137/0721062",
   "https://en.wikipedia.org/wiki/Flux_limiter"
  ]
 },
 {
  "id": "colella-woodward",
  "name": "Phillip Colella & Paul R. Woodward",
  "born": "",
  "died": "",
  "places": "Lawrence Berkeley Laboratory (Colella) and Lawrence Livermore National Laboratory (Woodward), per the 1984 papers; Colella was at Lawrence Livermore by 1989",
  "tags": [
   "computation"
  ],
  "summary": "Their 1984 Piecewise Parabolic Method (PPM) extended Godunov's method with limited parabolic reconstructions in each cell, keeping contact discontinuities much sharper. A companion paper in the same issue compared methods on demanding 2D test problems, including the double Mach reflection, which are still used to judge shock-capturing codes.",
  "contributions": [
   {
    "year": "1984",
    "what": "PPM: a higher-order extension of Godunov's method using limited piecewise-parabolic interpolation, sharper treatment of contact discontinuities, a more robust wave-interaction (Riemann) step and carefully added dissipation. Published April 1984.",
    "work": "\"The Piecewise Parabolic Method (PPM) for gas-dynamical simulations\", Journal of Computational Physics 54(1), 174–201",
    "confidence": "high"
   },
   {
    "year": "1984",
    "what": "Extensive comparison of numerical methods on strong-shock problems. Section IV(c) is the source of the double Mach reflection test: a Mach 10 shock in air meeting a reflecting wall at 60 degrees. Codes such as Athena++ cite this section for their setup.",
    "work": "Woodward & Colella, \"The numerical simulation of two-dimensional fluid flow with strong shocks\", Journal of Computational Physics 54(1), 115–173",
    "confidence": "high"
   },
   {
    "year": "1989",
    "what": "Colella with Marsha Berger: block-structured adaptive mesh refinement for shock hydrodynamics. Published May 1989.",
    "work": "Berger & Colella, \"Local adaptive mesh refinement for shock hydrodynamics\", Journal of Computational Physics 82(1), 64–84",
    "confidence": "high"
   }
  ],
  "notation": [
   "PPM, Piecewise Parabolic Method (1984)",
   "double Mach reflection (DMR) test (1984)"
  ],
  "anecdote": "The method paper and the test-problem paper were published back to back in the same issue of JCP (vol. 54, no. 1, April 1984). The tests became a de facto exam that later shock-capturing schemes are expected to pass.",
  "quote": "",
  "quote_source": "",
  "contested": "An earlier version of this record listed the University of Minnesota as Woodward's affiliation. That later affiliation is widely reported but was not verified, so it has been removed from places; on the 1984 papers he is at Lawrence Livermore. Colella's birth date (28 June 1952) and Berkeley PhD (1979, under Chorin) come from Wikipedia only and are not used above.",
  "chapters": [
   "shocks",
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1016/0021-9991(84)90143-8",
   "https://doi.org/10.1016/0021-9991(84)90142-6",
   "https://en.wikipedia.org/wiki/Phillip_Colella",
   "https://github.com/PrincetonUniversity/athena/blob/master/src/pgen/dmr.cpp"
  ]
 },
 {
  "id": "frisch-hasslacher-pomeau-fhp",
  "name": "Uriel Frisch, Brosl Hasslacher & Yves Pomeau (FHP lattice gas)",
  "born": "",
  "died": "",
  "places": "CNRS, Observatoire de Nice (all three, 1986 paper); Los Alamos National Laboratory, Theoretical Division and Center for Nonlinear Studies (Hasslacher); École Normale Supérieure, Paris (Pomeau)",
  "tags": [
   "computation",
   "theory"
  ],
  "summary": "Their 1986 paper showed that Boolean particles hopping on a hexagonal lattice, with collision rules that conserve mass and momentum, reproduce the Navier–Stokes equations at large scales. The hexagonal lattice has just enough symmetry to make the large-scale behaviour isotropic, which the earlier square-lattice HPP model lacked. It launched lattice-gas and then lattice Boltzmann methods.",
  "contributions": [
   {
    "year": "1986",
    "what": "Introduced the FHP lattice-gas automaton (six velocities on a triangular lattice). The abstract states that a class of 'deterministic lattice gases with discrete Boolean elements simulates the Navier-Stokes equation, and can be used to design simple, massively parallel computing machines'. Published 7 April 1986.",
    "work": "\"Lattice-Gas Automata for the Navier-Stokes Equation\", Physical Review Letters 56(14), 1505–1508",
    "confidence": "high"
   },
   {
    "year": "1987",
    "what": "Long review by Frisch, d'Humières, Hasslacher, Lallemand, Pomeau and Rivet, including a Boltzmann approximation for lattice gases and an appendix on the H-theorem.",
    "work": "Complex Systems 1, 649–707",
    "confidence": "high"
   }
  ],
  "notation": [
   "FHP model (from the authors' initials)",
   "lattice-gas automata (LGA)"
  ],
  "anecdote": "The three came from different worlds. Frisch was a turbulence theorist at CNRS. Pomeau, a statistical physicist, had co-invented the first lattice gas (HPP) in 1973. Hasslacher was a Los Alamos theoretical physicist with a particle-physics background. Life dates (Wikipedia): Frisch born 10 December 1940 (Agen); Hasslacher 13 May 1941 – 11 November 2005; Pomeau born 1942.",
  "quote": "The first LGA with proven Navier-Stokes dynamics is due to Frisch, Hasslacher and Pomeau (1986)",
  "quote_source": "Uriel Frisch, 'Lattice Boltzmann: a short history', November 2009, https://www.imo.universite-paris-saclay.fr/~fdubois/organisation/19janv2010/communications/Frisch-lba.pdf",
  "contested": "Priority with Stephen Wolfram is disputed. Wolfram published 'Cellular automaton fluids 1: Basic theory' (J. Stat. Phys. 45(3–4), 471–526, November 1986), after the FHP letter appeared. Frisch's 2009 note states that Wolfram 'did not contribute anything original to LGA'. That is Frisch's view, and learners should read both papers. Lattice gases also had practical drawbacks: statistical noise, lack of Galilean invariance and limited Reynolds numbers. These drove the move to lattice Boltzmann. An earlier version of this record gave a received date for the 1986 letter that could not be confirmed; it has been removed.",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1103/PhysRevLett.56.1505",
   "https://www.imo.universite-paris-saclay.fr/~fdubois/organisation/19janv2010/communications/Frisch-lba.pdf",
   "https://en.wikipedia.org/wiki/Uriel_Frisch",
   "https://doi.org/10.1007/BF01021083"
  ]
 },
 {
  "id": "kim-moin-moser",
  "name": "John Kim, Parviz Moin & Robert Moser",
  "born": "",
  "died": "",
  "places": "NASA Ames Research Center (all three, 1987); for the 1999 paper, Moser at the University of Illinois at Urbana-Champaign, Kim at UCLA and Mansour at NASA Ames",
  "tags": [
   "turbulence",
   "computation"
  ],
  "summary": "Their 1987 direct numerical simulation of turbulent channel flow resolved all scales with no subgrid model, on about 4 million grid points. Its statistics, especially near the wall, became reference data for testing turbulence models. Moser, Kim and Mansour extended it in 1999 to higher Reynolds numbers.",
  "contributions": [
   {
    "year": "1987",
    "what": "DNS of fully developed turbulent channel flow at Reynolds number 3300 (based on centreline velocity and channel half-width) on about 4 × 10^6 grid points (192 × 129 × 160), with no subgrid model, comparing many turbulence statistics against experiments. Published April 1987.",
    "work": "\"Turbulence statistics in fully developed channel flow at low Reynolds number\", Journal of Fluid Mechanics 177, 133–166",
    "confidence": "high"
   },
   {
    "year": "1999",
    "what": "Moser, Kim & Mansour: channel DNS at three friction Reynolds numbers up to Re_tau = 590. The abstract notes fewer low-Reynolds-number effects than in previous simulations at Re_tau = 180.",
    "work": "\"Direct numerical simulation of turbulent channel flow up to Re_tau=590\", Physics of Fluids 11(4), 943–945",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "The 1987 case is commonly called 'Re_tau = 180', but that number is not in the paper's abstract, which states Re = 3300 based on centreline velocity. The friction-velocity value is how later work, including the 1999 follow-up, refers to it.",
  "quote": "",
  "quote_source": "",
  "contested": "Mixing up Reynolds number definitions (bulk, centreline, friction) is a common source of error when comparing against this data set. The 1987 and 1999 data sets are often cited interchangeably, but they are different simulations.",
  "chapters": [
   "turbulence",
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1017/S0022112087000892",
   "https://doi.org/10.1063/1.869966"
  ]
 },
 {
  "id": "mcnamara-zanetti",
  "name": "Guy R. McNamara & Gianluigi Zanetti",
  "born": "",
  "died": "",
  "places": "The Research Institutes, University of Chicago (both authors, 1988)",
  "tags": [
   "computation"
  ],
  "summary": "Their 1988 letter replaced the Boolean particles of a lattice gas with their real-valued ensemble averages, and evolved these with a lattice Boltzmann equation. This removed the statistical noise that forced lattice-gas results to be heavily averaged, and is generally regarded as the start of the lattice Boltzmann method as a simulation tool.",
  "contributions": [
   {
    "year": "1988",
    "what": "Used a lattice Boltzmann equation to simulate lattice-gas automata, eliminating statistical noise. The abstract estimates the method to be more efficient than lattice-gas automata for intermediate to low Reynolds numbers (R ≲ 100). Published 14 November 1988.",
    "work": "\"Use of the Boltzmann Equation to Simulate Lattice-Gas Automata\", Physical Review Letters 61(20), 2332–2335",
    "confidence": "high"
   }
  ],
  "notation": [
   "lattice Boltzmann equation used as the simulation itself, not only as a theoretical approximation (1988)"
  ],
  "anecdote": "Floating point was first seen as a disadvantage. Frisch recalled that for a while the Boltzmann approach 'looked quite academic', because many thought the purely Boolean character of lattice gases would be an advantage over a method requiring floating-point arithmetic.",
  "quote": "Then McNamara and Zanetti [1988 Phys. Rev. Lett. 20, 2332] showed that LBA had an advantage by being free of Monte-Carlo noise.",
  "quote_source": "Uriel Frisch, 'Lattice Boltzmann: a short history', November 2009 (in the bracketed citation, '20' is the issue number; the volume is 61), https://www.imo.universite-paris-saclay.fr/~fdubois/organisation/19janv2010/communications/Frisch-lba.pdf",
  "contested": "The Boltzmann approximation of lattice gases already existed as a theoretical tool (e.g. the 1987 Complex Systems review). McNamara and Zanetti's step was to use it as the simulation itself. Their collision operator was still the complicated one inherited from the lattice gas. Simplifications followed in 1989: Higuera, Succi & Benzi, 'Lattice Gas Dynamics with Enhanced Collisions' (EPL 9(4), 345–349, 15 June 1989), and Higuera & Jiménez (EPL 9(7), 663–668, 1 August 1989); BGK single-relaxation models followed in 1991–92. Frisch's note gives 'EPL 9, 345' for both 1989 papers, which is a citation slip. An earlier version of this record listed the Higuera–Jiménez paper first; the enhanced-collision paper appeared about six weeks earlier. A received date given earlier for the 1988 letter could not be confirmed and has been removed.",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1103/PhysRevLett.61.2332",
   "https://www.imo.universite-paris-saclay.fr/~fdubois/organisation/19janv2010/communications/Frisch-lba.pdf",
   "https://doi.org/10.1209/0295-5075/9/4/008",
   "https://doi.org/10.1209/0295-5075/9/7/009"
  ]
 },
 {
  "id": "qian-dhumieres-lallemand",
  "name": "Y. H. Qian, D. d'Humières & P. Lallemand (lattice BGK)",
  "born": "",
  "died": "",
  "places": "Laboratoire de Physique Statistique, École Normale Supérieure, Paris",
  "tags": [
   "computation"
  ],
  "summary": "Their 1992 paper replaced the lattice Boltzmann collision operator with a single-relaxation-time BGK term. Each population relaxes toward a local polynomial equilibrium at rate 1/τ, and τ sets the viscosity. This lattice BGK (LBGK) scheme is the form of lattice Boltzmann most learners meet first.",
  "contributions": [
   {
    "year": "1992",
    "what": "Lattice BGK models for the Navier–Stokes equation: a single relaxation time toward a designed polynomial equilibrium on discrete velocity lattices. The abstract stresses that the models are free of noise, Galilean invariant and have a velocity-independent pressure, and that the relaxation parameter affects stability. Published 1 February 1992.",
    "work": "\"Lattice BGK Models for Navier-Stokes Equation\", Europhysics Letters 17(6), 479–484",
    "confidence": "high"
   }
  ],
  "notation": [
   "LBGK / lattice BGK (1992)",
   "'DnQm' velocity-set labels such as D2Q9 and D3Q19 are commonly credited to this paper (not checked against the text)"
  ],
  "anecdote": "The 'BGK' collision model itself came from kinetic theory almost 40 years earlier: Bhatnagar, Gross & Krook, Physical Review 94(3), 511–525 (May 1954), a model for collision processes in gases.",
  "quote": "",
  "quote_source": "",
  "contested": "Credit for lattice BGK is shared. Chen, Chen, Martinez & Matthaeus published a BGK-type lattice Boltzmann model for magnetohydrodynamics (PRL 67, 3776, 30 December 1991). Chen, Chen & Matthaeus then published 'Recovery of the Navier-Stokes equations using a lattice-gas Boltzmann method' (PRA 45, R5339, 1 April 1992). Later literature usually cites both groups together.",
  "chapters": [
   "lattice-particles"
  ],
  "sources": [
   "https://doi.org/10.1209/0295-5075/17/6/001",
   "https://doi.org/10.1103/PhysRevLett.67.3776",
   "https://doi.org/10.1103/PhysRevA.45.R5339",
   "https://doi.org/10.1103/PhysRev.94.511"
  ]
 },
 {
  "id": "james-quirk",
  "name": "James J. Quirk",
  "born": "",
  "died": "",
  "places": "ICASE, NASA Langley Research Center, Hampton, Virginia",
  "tags": [
   "computation"
  ],
  "summary": "Quirk's 1994 paper catalogued subtle failures of popular Godunov-type schemes, most famously the 'carbuncle' and odd–even decoupling at strong grid-aligned shocks in Roe-type solvers. He proposed cheap hybrid fixes that switch to a more dissipative HLL-type flux near strong shocks, and his shock-in-a-duct test is still used to check new schemes.",
  "contributions": [
   {
    "year": "1994",
    "what": "Showed that many Godunov-type methods have subtle flaws. Identified a mechanism (pressure–density perturbations at grid-aligned shocks) that blocks very high-resolution simulations, conjectured its link to the carbuncle, and proposed hybrid HLL/Roe fixes triggered by a shock detector. Published 30 March 1994.",
    "work": "\"A contribution to the great Riemann solver debate\", International Journal for Numerical Methods in Fluids 18(6), 555–574",
    "confidence": "high"
   },
   {
    "year": "1992",
    "what": "Report version of the same study, issued before the journal paper.",
    "work": "ICASE Report 92-64 (November 1992)",
    "confidence": "medium"
   }
  ],
  "notation": [
   "'Quirk test': a planar shock running down a duct with a perturbed centreline (1994)",
   "odd–even decoupling (popularised by this paper)"
  ],
  "anecdote": "The carbuncle is named for its shape. In strongly supersonic flow past a blunt body on a structured, body-fitted mesh, the middle of the computed bow shock bulges into a carbuncle-shaped structure. Nothing like it appears in experiments.",
  "quote": "",
  "quote_source": "",
  "contested": "Quirk did not discover the carbuncle. It had already been seen in blunt-body calculations, and the usual citation for the first report is Peery & Imlay, 'Blunt-body flow simulations' (AIAA Paper 88-2904, 24th Joint Propulsion Conference, July 1988). Kemm's review cites Peery & Imlay and Quirk together for the observations and says the phenomenon 'was christened carbuncle phenomenon' because of its form, but does not say who coined the name. An earlier version of this record said reviews credit Peery & Imlay with naming it; that was not confirmed. Kemm calls Quirk's paper 'seminal'. The failure affects 'complete' Riemann solvers that resolve contact and shear waves, such as Godunov, Roe, Osher, HLLC and HLLEM, which are exactly the solvers preferred for boundary layers.",
  "chapters": [
   "shocks",
   "trust"
  ],
  "sources": [
   "https://doi.org/10.1002/fld.1650180603",
   "https://arxiv.org/pdf/1507.00666",
   "https://doi.org/10.2514/6.1988-2904"
  ]
 },
 {
  "id": "john-steinhoff",
  "name": "John Steinhoff",
  "born": "",
  "died": "",
  "places": "University of Tennessee Space Institute, Tullahoma",
  "tags": [
   "computation",
   "engineering"
  ],
  "summary": "Steinhoff's vorticity confinement adds a small nonlinear term to the momentum equation that pushes vorticity back toward vortex centres. On coarse grids this counteracts the numerical diffusion that otherwise smears thin vortices, such as those shed from wings and rotor blades, across many cells. Fedkiw, Stam and Jensen brought it into computer graphics in 2001.",
  "contributions": [
   {
    "year": "1992",
    "what": "Early conference paper on the approach, applied to helicopter rotor flows, presented at the 30th AIAA Aerospace Sciences Meeting, January 1992.",
    "work": "Steinhoff, Wenren, Mersch & Senge, \"Computational vorticity capturing – Application to helicopter rotor flows\", AIAA Paper 92-0056",
    "confidence": "high"
   },
   {
    "year": "1992",
    "what": "Two-dimensional incompressible version, cited in later Steinhoff papers.",
    "work": "Steinhoff, Thomas & Wenren, \"Computational Vorticity Confinement: Two Dimensional Incompressible Flow\", SECTAM XVI Conference",
    "confidence": "medium"
   },
   {
    "year": "1994",
    "what": "With Underhill: added a term to the momentum equations that depends only on local variables and is zero outside vortical regions. Solutions contain confined vortical regions ('covons') that convect without spreading even on coarse Eulerian grids with low-order schemes; applied to merging thin vortex rings. Published August 1994.",
    "work": "\"Modification of the Euler equations for 'vorticity confinement': application to the computation of interacting vortex rings\", Physics of Fluids 6(8), 2738–2744",
    "confidence": "high"
   },
   {
    "year": "1994",
    "what": "Book-chapter account of the technique.",
    "work": "\"Vorticity Confinement: A New Technique for Computing Vortex Dominated Flows\", in Frontiers of Computational Fluid Dynamics (Wiley)",
    "confidence": "medium"
   },
   {
    "year": "1997",
    "what": "With Wang (Flow Analysis Inc.) and Stremel (NASA Ames): vorticity confinement for rotorcraft aerodynamics, at the 15th AIAA Applied Aerodynamics Conference, June 1997.",
    "work": "Wang, Steinhoff & Stremel, \"A new numerical approach for rotorcraft aerodynamics using vorticity confinement\", AIAA Paper 97-2328",
    "confidence": "high"
   }
  ],
  "notation": [
   "vorticity confinement (early 1990s)",
   "covons, 'confined vortical regions' (1994)"
  ],
  "anecdote": "The method was designed for rotorcraft and wing-wake problems, where tip vortices have to travel long distances across a grid without diffusing away. Its first conference paper (1992) was about helicopter rotors, and a 1997 paper with a NASA Ames co-author applied it to rotorcraft aerodynamics.",
  "quote": "",
  "quote_source": "",
  "contested": "The '1994' journal paper is the standard reference, but the approach was presented by January 1992 (AIAA Paper 92-0056, under the name 'vorticity capturing'), and Wikipedia says Steinhoff invented it in the late 1980s. An earlier version of this record cited a 1992 UTSI preprint with Wang and Underhill that could not be verified; it has been replaced by the 1992 AIAA paper. The method is a numerical correction, not a physical model: it adds energy at small scales, even though Fedkiw, Stam and Jensen (2001) describe their version as 'physically consistent'.",
  "chapters": [
   "stable-fluids",
   "advection"
  ],
  "sources": [
   "https://en.wikipedia.org/wiki/Vorticity_confinement",
   "https://doi.org/10.1063/1.868164",
   "https://doi.org/10.2514/6.1992-56",
   "https://rotorcraft.arc.nasa.gov/Publications/files/AIAA-1997-2328-961.pdf"
  ]
 },
 {
  "id": "spalart-allmaras",
  "name": "Philippe R. Spalart & Steven R. Allmaras",
  "born": "",
  "died": "",
  "places": "",
  "tags": [
   "turbulence",
   "engineering"
  ],
  "summary": "Their one-equation RANS model transports a single working variable ν̃ (nu-tilde) related to the eddy viscosity. It was calibrated for attached and mildly separated aerodynamic boundary layers. It is cheap and robust, became a default model in external-aerodynamics codes, and later supplied the RANS part of detached-eddy simulation (DES).",
  "contributions": [
   {
    "year": "1992",
    "what": "Conference presentation of the model at the 30th Aerospace Sciences Meeting, Reno, January 1992.",
    "work": "\"A One-Equation Turbulence Model for Aerodynamic Flows\", AIAA Paper 92-0439",
    "confidence": "high"
   },
   {
    "year": "1994",
    "what": "Journal version. NASA's Turbulence Modeling Resource states that this reference takes precedence over the conference paper; some constants differ.",
    "work": "\"A One-Equation Turbulence Model for Aerodynamic Flows\", La Recherche Aérospatiale (1994), 5–21",
    "confidence": "high"
   }
  ],
  "notation": [
   "ν̃ (nu-tilde), the SA working variable (1992)",
   "variant labels SA-noft2, SA-neg, SA-Ia (later naming used by NASA's Turbulence Modeling Resource)"
  ],
  "anecdote": "NASA's Turbulence Modeling Resource describes the f_t2 term in the original model as 'a numerical fix', there to make zero a stable solution of the equation. Many codes drop it (the 'SA-noft2' variant), and NASA notes that doing so probably makes very little difference at reasonably high Reynolds numbers.",
  "quote": "",
  "quote_source": "",
  "contested": "'SA (1992)' is not one model. The 1992 conference paper used c_t3 = 1.1 and c_t4 = 2.0, the 1994 journal version takes precedence, and the journal appendix has a typo in c_w1 (the square on κ is missing). The original also included a trip term, kept in the SA-Ia variant and rarely used. Two codes that both claim to run 'Spalart–Allmaras' may therefore be solving different equations, which is a practical verification hazard. The issue number of the 1994 journal paper was not verified and has been dropped.",
  "chapters": [
   "turbulence",
   "trust"
  ],
  "sources": [
   "https://tmbwg.github.io/turbmodels/spalart.html",
   "https://doi.org/10.2514/6.1992-439",
   "https://en.wikipedia.org/wiki/Spalart%E2%80%93Allmaras_turbulence_model"
  ]
 },
 {
  "id": "liu-osher-chan-weno",
  "name": "Xu-Dong Liu, Stanley Osher & Tony Chan",
  "born": "",
  "died": "",
  "places": "Department of Mathematics, UCLA (all three authors, 1994 paper)",
  "tags": [
   "mathematics",
   "computation"
  ],
  "summary": "Their 1994 paper introduced weighted ENO (WENO). ENO picks the single smoothest stencil. WENO instead takes a convex combination of all candidate stencils, with nonlinear weights that switch off stencils crossing a discontinuity. In smooth regions the combination is more accurate than any one stencil, and near shocks it behaves like ENO.",
  "contributions": [
   {
    "year": "1994",
    "what": "Introduced WENO schemes built on the cell-average form of ENO. Weighting r-th order ENO stencils gives (r+1)-th order accuracy in smooth regions while staying essentially non-oscillatory at discontinuities. Published November 1994.",
    "work": "\"Weighted Essentially Non-oscillatory Schemes\", Journal of Computational Physics 115(1), 200–212",
    "confidence": "high"
   }
  ],
  "notation": [
   "WENO, weighted essentially non-oscillatory (1994)"
  ],
  "anecdote": "The original weights gave one order more than ENO. Two years later Jiang and Shu showed that a different smoothness measure gives fifth order from r = 3 stencils, instead of fourth, and they built on the flux form of ENO rather than the cell-average form used here. Their version, not the 1994 original, became the default.",
  "quote": "",
  "quote_source": "",
  "contested": "WENO is frequently attributed to Jiang and Shu (1996). The concept and the name come from this 1994 paper, as Jiang and Shu's own abstract acknowledges when it describes the (r+1)-th order accuracy of the earlier construction. Liu's biographical details could not be verified.",
  "chapters": [
   "shocks"
  ],
  "sources": [
   "https://doi.org/10.1006/jcph.1994.1187",
   "https://en.wikipedia.org/wiki/WENO_methods",
   "https://ntrs.nasa.gov/citations/19960007052"
  ]
 },
 {
  "id": "foster-metaxas",
  "name": "Nick Foster & Dimitris Metaxas",
  "born": "",
  "died": "",
  "places": "Center for Human Modeling and Simulation, University of Pennsylvania, Philadelphia",
  "tags": [
   "graphics",
   "computation"
  ],
  "summary": "Their 1996 liquids paper and 1997 SIGGRAPH smoke paper brought full three-dimensional Navier–Stokes solvers into computer graphics. They used an explicit finite-difference scheme in the Harlow–Welch marker-and-cell tradition, with marker particles or height fields to track liquid surfaces. They also exposed the time-step limits of explicit solvers, which Stam's 'Stable Fluids' (1999) removed.",
  "contributions": [
   {
    "year": "1996",
    "what": "Animated liquids by solving a finite-difference approximation of the Navier–Stokes equations on a coarse voxel grid, then using the velocity field to drive a height field or massless marker particles for a sharper free surface. Also simulated buoyant objects. Published September 1996.",
    "work": "\"Realistic Animation of Liquids\", Graphical Models and Image Processing 58(5), 471–483",
    "confidence": "high"
   },
   {
    "year": "1996",
    "what": "Conference version of the liquids paper, with the same title and authors.",
    "work": "\"Realistic Animation of Liquids\", Graphics Interface '96 (pp. 204–212)",
    "confidence": "medium"
   },
   {
    "year": "1997",
    "what": "Applied the approach to hot, turbulent gases: steam, smoke and wind interacting with objects.",
    "work": "\"Modeling the motion of a hot, turbulent gas\", SIGGRAPH 97 Proceedings, 181–188",
    "confidence": "high"
   },
   {
    "year": "2001",
    "what": "Foster with Fedkiw: liquids combining level sets and particles.",
    "work": "\"Practical animation of liquids\", SIGGRAPH 2001 Proceedings, 23–30",
    "confidence": "high"
   }
  ],
  "notation": [],
  "anecdote": "Graphics fluids inherited a 1960s Los Alamos method. Stam's 1999 paper notes that Foster and Metaxas's algorithm is based mainly on the work of Harlow and Welch, whose marker-and-cell paper appeared in Physics of Fluids 8(12), 2182–2189, in December 1965.",
  "quote": "Their algorithm is based mainly on the work of Harlow and Welch in computational fluid dynamics, which dates back to 1965.",
  "quote_source": "Jos Stam, 'Stable Fluids', SIGGRAPH 99, https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf",
  "contested": "They are often called the first to use Navier–Stokes in graphics. Earlier graphics work used other fluid models or reduced equations: Yaeger, Upson & Myers (SIGGRAPH 86, the planet Jupiter for the film '2010'), Kass & Miller (SIGGRAPH 90, shallow water), Chen & da Vitoria Lobo (GMIP 57(2), 1995, a simplified 2D Navier–Stokes solver that Foster and Metaxas cite) and Gamito, Lopes & Gomes (1995, vortex particles). What Foster and Metaxas brought was the full 3D equations. An earlier version of this record cited 'Chen et al. 1997' as a precedent; that paper postdates the 1996 work, and the relevant precedent is Chen & da Vitoria Lobo (1995). Metaxas's first name appears as 'Dimitri' on the 1996 paper and 'Dimitris' on the 1997 paper.",
  "chapters": [
   "stable-fluids",
   "pressure"
  ],
  "sources": [
   "https://graphicsinterface.org/wp-content/uploads/gi1996-24.pdf",
   "https://doi.org/10.1006/gmip.1996.0039",
   "https://doi.org/10.1145/258734.258838",
   "https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf"
  ]
 },
 {
  "id": "jos-stam",
  "name": "Jos Stam",
  "born": "",
  "died": "",
  "places": "University of Geneva (BSc computer science 1988, mathematics 1989); University of Toronto (MSc, PhD, Dynamic Graphics Project); postdoctoral posts at INRIA (Paris) and VTT (Helsinki); Alias|wavefront, Seattle (1999 paper) and Toronto (2003 paper); Autodesk, Toronto (2006–2018)",
  "tags": [
   "graphics",
   "computation"
  ],
  "summary": "Stam's 'Stable Fluids' (SIGGRAPH 1999) combined semi-Lagrangian advection, implicit viscosity and a pressure projection based on the Helmholtz–Hodge decomposition into a solver that does not blow up, whatever the time step. The price is heavy numerical dissipation, which Stam stated openly. It became the template for interactive and film smoke, and the basis of countless real-time fluid demos.",
  "contributions": [
   {
    "year": "1999",
    "what": "Proposed an unconditionally stable solver for the full Navier–Stokes equations for graphics. It traces characteristics backward for advection, solves viscosity implicitly and projects onto divergence-free fields, allowing large time steps and interactive 2D/3D fluids.",
    "work": "\"Stable Fluids\", SIGGRAPH 99 Proceedings, 121–128",
    "confidence": "high"
   },
   {
    "year": "2001",
    "what": "Co-author with Fedkiw and Jensen of the smoke paper that added vorticity confinement to counter the dissipation of the 1999 solver.",
    "work": "\"Visual simulation of smoke\", SIGGRAPH 2001 Proceedings, 15–22",
    "confidence": "high"
   },
   {
    "year": "2001",
    "what": "US Patent 6,266,071 B1 (with Duncan Brinsmead), filed 20 November 1998 and granted 24 July 2001, originally assigned to Silicon Graphics; now expired. It covers producing fluid-like animations with a rapid, stable Navier–Stokes solver.",
    "work": "US Patent 6,266,071",
    "confidence": "high"
   },
   {
    "year": "2003",
    "what": "A short paper with complete C code for a stable 2D solver, written for game developers, which made the method widely known. The year and venue (Game Developers Conference) are as usually cited; the paper's text does not state them.",
    "work": "\"Real-Time Fluid Dynamics for Games\"",
    "confidence": "medium"
   },
   {
    "year": "2008",
    "what": "Academy Technical Achievement Award (Academy Certificate), shared with Duncan Brinsmead, Julia Pakalns and Martin Werner, for the design and implementation of the Maya Fluid Effects system, whose citation mentions its stable semi-Lagrangian solver.",
    "work": "Scientific and Technical Academy Awards, 2008",
    "confidence": "high"
   }
  ],
  "notation": [
   "'Stable Fluids': semi-Lagrangian advection plus projection, unconditionally stable (1999)"
  ],
  "anecdote": "The method was patented, yet Stam gave it away as code. His 'Real-Time Fluid Dynamics for Games' paper prints a complete C solver and also notes that parts of the work are protected under US Patent 6,266,071 B1. The same paper concedes that the backward-tracing idea 'apparently goes back to the work by Courant et al.'.",
  "quote": "The model would not be accurate enough for most engineering applications. Indeed, it suffers from too much “numerical dissipation”, i.e., the flow tends to dampen too rapidly as compared to actual experiments.",
  "quote_source": "Jos Stam, 'Stable Fluids', SIGGRAPH 99, https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf",
  "contested": "In 1999 Stam wrote that 'Our method cannot be found in the computational fluids literature, since it is custom made for computer graphics applications.' Its main ingredients were not new. Semi-Lagrangian advection was well established in numerical weather prediction (Staniforth & Côté, Monthly Weather Review 119(9), 2206–2223, 1991), and characteristic-based differencing goes back to Courant, Isaacson & Rees (CPAM 5(3), 243–255, 1952), which Stam himself acknowledged in his games paper. The new part was the combination for graphics, accepting dissipation in exchange for stability. Kass & Miller (SIGGRAPH 1990) had already given stable shallow-water simulation. Unconditional stability does not mean accuracy. An earlier version of this record listed NVIDIA among his employers, which no source checked supports, and placed the patent note in slides rather than in the paper; both have been corrected. Wikipedia gives a birth date of 28 December 1965 but is inconsistent about his birthplace, so neither is used.",
  "chapters": [
   "stable-fluids",
   "pressure",
   "advection"
  ],
  "sources": [
   "https://www.dgp.toronto.edu/public_user/stam/reality/Research/pdf/ns.pdf",
   "https://doi.org/10.1145/311535.311548",
   "https://patents.google.com/patent/US6266071",
   "https://www.oscars.org/sci-tech/ceremonies/2008"
  ]
 },
 {
  "id": "robert-bridson",
  "name": "Robert Bridson",
  "born": "",
  "died": "",
  "places": "University of Waterloo (BMath 1998, MMath 1999); Stanford University (PhD 2003, supervised by Ronald Fedkiw); University of British Columbia (faculty, full-time until August 2013, then adjunct); Exotic Matter AB (co-founder); Autodesk (Senior Principal Research Scientist)",
  "tags": [
   "graphics",
   "computation"
  ],
  "summary": "Bridson's 'Fluid Simulation for Computer Graphics' (A K Peters, 2008; second edition 2015) became the standard practical guide to grid-based fluids for graphics. It covers MAC grids, semi-Lagrangian advection, pressure projection with preconditioned conjugate gradients, level sets and particle–grid hybrids. With Yongning Zhu (2005) he brought the PIC/FLIP particle–grid approach from plasma and fluid physics into graphics.",
  "contributions": [
   {
    "year": "2005",
    "what": "Treated sand as a continuum and turned a water simulator into a sand simulator with a few friction additions, using a particle–grid (PIC/FLIP) hybrid. FLIP is Brackbill & Ruppel's method (JCP 65(2), 314–343, 1986), cited in the paper.",
    "work": "Zhu & Bridson, \"Animating sand as a fluid\", ACM Transactions on Graphics 24(3), 965–972 (SIGGRAPH 2005)",
    "confidence": "high"
   },
   {
    "year": "2007",
    "what": "Curl-noise: procedural turbulent velocity fields that are exactly divergence-free by construction (curl of a potential) and respect solid boundaries.",
    "work": "Bridson, Hourihan & Nordenstam, \"Curl-noise for procedural fluid flow\", ACM Transactions on Graphics 26(3), article 46",
    "confidence": "high"
   },
   {
    "year": "2008",
    "what": "Textbook on fluid simulation for graphics (A K Peters, June 2008). The second edition (CRC Press, 2015) expanded the coverage.",
    "work": "Fluid Simulation for Computer Graphics",
    "confidence": "high"
   },
   {
    "year": "2015",
    "what": "Academy Technical Achievement Award (Academy Certificate) 'for early conceptualization of sparse-tiled voxel data structures and their application to modeling and simulation'.",
    "work": "Scientific and Technical Academy Awards, February 2015",
    "confidence": "high"
   }
  ],
  "notation": [
   "curl-noise (2007)"
  ],
  "anecdote": "Much of the textbook's material was tested in production. Bridson co-founded Exotic Matter, whose Naiad fluid simulator was acquired by Autodesk in 2012, co-wrote the 'Squirt' fluid simulator at Double Negative, spent ten months at Weta, and worked on PhysBAM cloth at ILM for Star Wars Episode II.",
  "quote": "",
  "quote_source": "",
  "contested": "An earlier version of this record gave a birth year of 1976 and said the publisher dates the second edition 2016; neither was confirmed. The publisher's metadata puts the second edition online in September 2015, so 2015 is used. The Academy's citation spells 'modeling'; UBC's news item spells it 'modelling'.",
  "chapters": [
   "stable-fluids",
   "pressure",
   "lattice-particles"
  ],
  "sources": [
   "https://www.cs.ubc.ca/~rbridson/",
   "https://www.oscars.org/sci-tech/ceremonies/2015",
   "https://doi.org/10.1145/1073204.1073298",
   "https://doi.org/10.1145/1276377.1276435"
  ]
 },
 {
  "id": "buckmaster-vicol",
  "name": "Tristan Buckmaster & Vlad Vicol",
  "born": "",
  "died": "",
  "places": "Department of Mathematics, Princeton University (both authors, arXiv version of 2017)",
  "tags": [
   "mathematics",
   "theory"
  ],
  "summary": "They proved that weak solutions of the 3D Navier–Stokes equations with finite kinetic energy need not be unique. They built pathological solutions by convex integration, using building blocks they called intermittent Beltrami flows. It is a major result on what 'solution' means for the equations, but it does not settle the Clay Millennium problem, which is about smooth solutions.",
  "contributions": [
   {
    "year": "2019",
    "what": "Proved non-uniqueness of weak solutions of 3D Navier–Stokes in the class of finite-kinetic-energy weak solutions. Also showed that Hölder-continuous dissipative weak solutions of the 3D Euler equations arise as strong vanishing-viscosity limits of such Navier–Stokes weak solutions. Posted on arXiv 28 September 2017 (last revised 11 October 2018), published 2019.",
    "work": "\"Nonuniqueness of weak solutions to the Navier-Stokes equation\", Annals of Mathematics 189(1), 101–144",
    "confidence": "high"
   }
  ],
  "notation": [
   "intermittent Beltrami flows / waves (2017)"
  ],
  "anecdote": "Their abstract starts from Leray's 1934 theorem that for any finite-energy initial data at least one global weak solution exists. Eighty-three years later they showed that, in this broad class, 'at least one' cannot be upgraded to 'exactly one'.",
  "quote": "To date, the question of uniqueness of Leray-Hopf weak solutions for the 3D Navier-Stokes equations remains however open.",
  "quote_source": "T. Buckmaster & V. Vicol, arXiv:1709.10033 (introduction), https://arxiv.org/abs/1709.10033",
  "contested": "Popular accounts sometimes present this as progress on, or a solution of, the Millennium Prize problem. It is neither. The authors state that 'at the moment we do not prove that they are Leray-Hopf weak solutions', since the solutions do not obey the energy inequality, so the uniqueness of Leray–Hopf solutions remains open. The Clay problem concerns the existence and smoothness of classical solutions. The work is often dated 2019 (journal) but was public in 2017 (arXiv).",
  "chapters": [
   "conservation",
   "turbulence"
  ],
  "sources": [
   "https://arxiv.org/abs/1709.10033",
   "https://annals.math.princeton.edu/2019/189-1/p03",
   "https://doi.org/10.4007/annals.2019.189.1.3"
  ]
 }
];

export const PEOPLE_BY_ID = Object.fromEntries(PEOPLE.map((p) => [p.id, p]));

export function lifespan(p) {
  if (!p.born && !p.died) return '';
  return `(${p.born ? yearLabel(p.born) : '?'}–${p.died ? yearLabel(p.died) : ''})`;
}

export function initials(name) {
  const words = name.replace(/\(.*?\)/g, '').split(/[\s-]+/).filter((w) => /^[A-ZÀ-Ž]/.test(w));
  if (!words.length) return name.slice(0, 2);
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase();
}

// "1707", "c. 1452", "287 BC", "4 January 1643 (…)", "1822 (read) / 1827" → the
// first three- or four-digit year as a number (negative for BC), or null.
const YEAR = /(c\.\s*)?\b(\d{3,4})\b(\s*(?:BCE?|B\.C\.))?/;
export function parseYear(s) {
  const m = YEAR.exec(String(s ?? ''));
  if (!m) return null;
  return m[3] ? -Number(m[2]) : Number(m[2]);
}

// The short form of a date for labels: "1646 (1 July)" → "1646", "c. 287 BC" stays.
export function yearLabel(s) {
  const m = YEAR.exec(String(s ?? ''));
  return m ? `${m[1] ? 'c. ' : ''}${m[2]}${m[3] ? ' BC' : ''}` : String(s ?? '');
}

// A person's place on the timeline: birth year, else their first contribution.
export function startYear(p) {
  return parseYear(p.born) ?? Math.min(...(p.contributions || []).map((c) => parseYear(c.year) ?? Infinity));
}
