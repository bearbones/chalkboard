// Turn the fact-checked research files (people.json, notation.json,
// milestones.json) into the course's data modules. Records keep their fields;
// notation gets a `group` and milestones a `kind` (by keyword, overridable).
//
//   node aids/fluid-course/dev/import-research.mjs <research dir> [overrides.json]
//
// overrides.json: { "group": { "<notation id>": "vectors" }, "kind": { "<milestone id>": "solvers" },
//                   "drop": ["<id>", …] }
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tex } from '../src/kit/math.js';

const [dir, overridesPath] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../src/reference');
const read = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));
const ov = overridesPath && existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, 'utf8')) : {};
const drop = new Set(ov.drop || []);

const GROUP_RULES = [
  ['numbers', /\bnumber\b|\bRe\b|\bMa\b|\bFr\b|\bSt\b|\bPr\b|\bPe\b|\bKn\b|\bWe\b|\bRa\b|\bNu\b|\bRo\b|\bRi\b/],
  ['numerics', /stencil|courant|cfl|amplification|truncation|upwind|modified equation|tvd|limiter|monotone|jacobi|seidel|sor\b|conjugate|multigrid|krylov|grid function|u_j\^n|\\Delta t|half-integer|flux|big-o|landau|von neumann/i],
  ['vectors', /vector|tensor|nabla|\\nabla|curl|div|grad|einstein|kronecker|levi-civita|quaternion|dot product|cross product|stress|strain/i],
  ['calculus', /derivative|leibniz|fluxion|partial|integral|laplacian|\\partial|\\int|prime|operator/i],
  ['fluid', /./],
];
const KIND_RULES = [
  ['trust', /verif|manufactured|richardson extrap|grid convergence|validation|benchmark/i],
  ['pressure', /pressure|projection|incompressib|checkerboard|staggered|mac\b|marker-and-cell|rhie|simple\b/i],
  ['solvers', /solver|iterat|multigrid|conjugate|relaxation|sor\b|gmres|bicg|krylov/i],
  ['shocks', /shock|riemann|tvd|limiter|oscillat|godunov|eno|weno|carbuncle|flux-corrected|artificial viscosity|ppm|muscl/i],
  ['stiffness', /stiff|implicit|crank|diffusion equation|heat equation/i],
  ['turbulence', /turbulen|les\b|large-eddy|dns|eddy viscosity|aliasing|spectral|resolution|closure|rans/i],
  ['stability', /stabil|cfl|courant|blow|unstable/i],
  ['accuracy', /numerical diffusion|dispersion|smear|accuracy|order/i],
  ['methods', /./],
];
const classify = (rules, text) => rules.find(([, re]) => re.test(text))[0];
// Ids share one namespace on the reference pages and must be kebab-case.
const slug = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const people = read('people.json')
  .filter((p) => !drop.has(p.id))
  .map((p) => ({ ...p, id: slug(p.id) }));
const notation = read('notation.json')
  .filter((n) => !drop.has(n.id))
  .map((n) => ({ ...n, id: slug(n.id), group: ov.group?.[n.id] || classify(GROUP_RULES, `${n.name} ${n.symbol} ${n.tex} ${n.meaning}`) }));
const milestones = read('milestones.json')
  .filter((m) => !drop.has(m.id))
  .map((m) => ({ ...m, id: slug(m.id), kind: ov.kind?.[m.id] || classify(KIND_RULES, `${m.challenge} ${m.title} ${m.what}`) }));

// Report what the course test would reject, all at once.
const seen = new Map();
for (const [what, list] of [['person', people], ['symbol', notation], ['milestone', milestones]]) {
  for (const r of list) {
    if (seen.has(r.id)) console.warn(`duplicate id ${r.id} (${seen.get(r.id)} and ${what})`);
    seen.set(r.id, what);
    for (const k of ['tex', 'original_form']) {
      if (!r[k]) continue;
      try {
        tex(r[k], { display: k === 'original_form' });
      } catch (e) {
        console.warn(`${what} ${r.id} ${k}: ${e.message} in ${JSON.stringify(r[k])}`);
      }
    }
  }
}

const json = (v) => JSON.stringify(v, null, 1);
function writeData(file, name, records) {
  const path = join(out, file);
  const src = readFileSync(path, 'utf8');
  const re = new RegExp(`^export const ${name} = [\\s\\S]*?^\\];?$|^export const ${name} = \\[\\];$`, 'm');
  if (!re.test(src)) throw new Error(`no "export const ${name} = [...]" block in ${file}`);
  writeFileSync(path, src.replace(re, `export const ${name} = ${json(records)};`));
  console.log(`${file}: ${records.length} ${name.toLowerCase()}`);
}
writeData('people-data.js', 'PEOPLE', people);
writeData('notation-data.js', 'NOTATION', notation);
writeData('milestones-data.js', 'MILESTONES', milestones);
const count = (xs, k) => Object.entries(xs.reduce((a, x) => ((a[x[k]] = (a[x[k]] || 0) + 1), a), {}));
console.log('groups', count(notation, 'group'), '\nkinds', count(milestones, 'kind'));
