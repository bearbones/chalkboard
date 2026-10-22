// The course outline: parts, chapters in order, reference pages, and the
// cross-chapter indexes (glossary, pathologies, widgets) built from them.

import { chapter as continuum } from './chapters/continuum.js';
import { chapter as viewpoints } from './chapters/viewpoints.js';
import { chapter as conservation } from './chapters/conservation.js';
import { chapter as notation } from './chapters/notation.js';
import { chapter as similarity } from './chapters/similarity.js';
import { chapter as discretization } from './chapters/discretization.js';
import { chapter as advection } from './chapters/advection.js';
import { chapter as shocks } from './chapters/shocks.js';
import { chapter as stiffness } from './chapters/stiffness.js';
import { chapter as pressure } from './chapters/pressure.js';
import { chapter as solvers } from './chapters/solvers.js';
import { chapter as stableFluids } from './chapters/stable-fluids.js';
import { chapter as latticeParticles } from './chapters/lattice-particles.js';
import { chapter as turbulence } from './chapters/turbulence.js';
import { chapter as trust } from './chapters/trust.js';
import { chapter as people } from './reference/people.js';
import { chapter as milestones } from './reference/milestones.js';
import { chapter as symbols } from './reference/symbols.js';
import { chapter as pathologies } from './reference/pathologies.js';
import { chapter as glossary } from './reference/glossary.js';

export const PARTS = [
  {
    id: 'physics',
    numeral: 'I',
    title: 'Part I · The physics',
    name: 'The physics, and how it was written down',
    blurb: 'What a fluid is, the two ways of describing its motion, the conservation laws, and the notation they are written in.',
    chapters: [continuum, viewpoints, conservation, notation, similarity],
  },
  {
    id: 'numbers',
    numeral: 'II',
    title: 'Part II · From equations to numbers',
    name: 'From equations to numbers',
    blurb: 'Replacing derivatives with differences, and the ways that goes wrong: instability, smearing, wiggles, wrong shocks and stiffness.',
    chapters: [discretization, advection, shocks, stiffness],
  },
  {
    id: 'incompressible',
    numeral: 'III',
    title: 'Part III · Incompressible flow',
    name: 'Incompressible flow and the pressure problem',
    blurb: 'Pressure as the constraint that keeps the flow divergence-free, the solvers that compute it, and a fluid you can stir.',
    chapters: [pressure, solvers, stableFluids],
  },
  {
    id: 'beyond',
    numeral: 'IV',
    title: 'Part IV · Other roads, and trust',
    name: 'Other roads, and trust',
    blurb: 'Lattice and particle methods, turbulence across scales, and how to tell whether a simulation is right.',
    chapters: [latticeParticles, turbulence, trust],
  },
];

export const REFERENCE = [people, milestones, symbols, pathologies, glossary];

export const CHAPTERS = PARTS.flatMap((p) => p.chapters);
CHAPTERS.forEach((c, k) => (c.n = k + 1));
const ALL = [...CHAPTERS, ...REFERENCE];
const BY_ID = Object.fromEntries(ALL.map((c) => [c.id, c]));
const PART_OF = Object.fromEntries(PARTS.flatMap((p) => p.chapters.map((c) => [c.id, p])));

let glossaryCache = null;
let pathologyCache = null;

export const course = {
  parts: PARTS,
  chapters: CHAPTERS,
  reference: REFERENCE,
  all: ALL,
  byId: (id) => BY_ID[id] || null,
  partOf: (id) => PART_OF[id] || null,
  neighbours(id) {
    const list = BY_ID[id] && PART_OF[id] ? CHAPTERS : REFERENCE;
    const k = list.findIndex((c) => c.id === id);
    return { prev: list[k - 1] || null, next: list[k + 1] || null };
  },
  // A widget by name from any chapter (the home page and the gallery borrow them).
  widget(name) {
    for (const c of ALL) if (c.widgets?.[name]) return c.widgets[name];
    return null;
  },
  // key → { term, def, section, chapter, chapterTitle }; the first chapter to define a key wins.
  glossary() {
    if (glossaryCache) return glossaryCache;
    glossaryCache = {};
    for (const c of ALL) {
      for (const [key, g] of Object.entries(c.glossary || {})) {
        if (!glossaryCache[key]) glossaryCache[key] = { ...g, chapter: c.id, chapterTitle: c.short || c.title };
      }
    }
    return glossaryCache;
  },
  pathologies() {
    if (pathologyCache) return pathologyCache;
    pathologyCache = CHAPTERS.flatMap((c) => (c.pathologies || []).map((p) => ({ ...p, chapter: c.id, chapterTitle: c.short || c.title })));
    return pathologyCache;
  },
};
