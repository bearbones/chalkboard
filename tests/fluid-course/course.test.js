// Course integrity: every chapter's math parses, every figure and quiz is
// wired, internal links land, glossary/person/pathology references resolve,
// the HTML is balanced, and the bundle builds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { course, CHAPTERS } from '../../aids/fluid-course/src/course.js';
import { texInHtml, tex } from '../../aids/fluid-course/src/kit/math.js';
import { PEOPLE, PEOPLE_BY_ID } from '../../aids/fluid-course/src/reference/people-data.js';
import { FAMILIES } from '../../aids/fluid-course/src/reference/pathologies.js';
import { NOTATION, GROUPS } from '../../aids/fluid-course/src/reference/notation-data.js';
import { MILESTONES, KINDS } from '../../aids/fluid-course/src/reference/milestones-data.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
// CHAPTER=advection node --test tests/fluid-course/course.test.js checks one
// chapter (links into chapters that are still stubs are not checked then).
const ONLY = process.env.CHAPTER || '';
const mine = (c) => !ONLY || c.id === ONLY;
const authored = course.all.filter((c) => !c.render && mine(c));
const isStub = (c) => /class="stub"/.test(c.html || '');
const idsIn = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const texErrors = (s) => {
  const errs = [];
  texInHtml(s || '', errs);
  return errs;
};

test('chapters have unique ids and the required fields', () => {
  const ids = course.all.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate chapter id');
  for (const c of course.all) {
    assert.ok(c.title && c.blurb, `${c.id}: title and blurb`);
    assert.ok(typeof c.html === 'string' || typeof c.render === 'function', `${c.id}: html or render`);
  }
  for (const c of CHAPTERS) assert.ok(c.minutes > 0, `${c.id}: minutes`);
});

test('all TeX parses (prose, quizzes, glossary, pathologies)', () => {
  for (const c of course.all.filter(mine)) {
    const where = (part) => `${c.id} ${part}`;
    for (const e of texErrors(c.html)) assert.fail(`${where('html')}: ${e.message} in "${e.src}"`);
    for (const e of texErrors(c.title + ' ' + c.blurb)) assert.fail(`${where('title/blurb')}: ${e.message}`);
    for (const [id, q] of Object.entries(c.quizzes || {})) {
      for (const s of [q.q, q.explain, q.unit, ...(q.choices || [])]) for (const e of texErrors(s)) assert.fail(`${where('quiz ' + id)}: ${e.message} in "${e.src}"`);
    }
    for (const [k, g] of Object.entries(c.glossary || {})) for (const e of texErrors(g.term + ' ' + g.def)) assert.fail(`${where('glossary ' + k)}: ${e.message}`);
    for (const p of c.pathologies || []) {
      for (const s of [p.name, p.symptom, p.cause, p.diagnose, ...(p.mitigations || [])]) for (const e of texErrors(s)) assert.fail(`${where('pathology ' + p.id)}: ${e.message}`);
    }
  }
});

test('every figure has a widget and every quiz placeholder has a spec (and vice versa)', () => {
  for (const c of authored) {
    for (const m of c.html.matchAll(/data-widget="([^"]+)"/g)) {
      assert.ok(c.widgets?.[m[1]] || course.widget(m[1]), `${c.id}: no widget "${m[1]}"`);
    }
    const used = new Set([...c.html.matchAll(/data-quiz="([^"]+)"/g)].map((m) => m[1]));
    for (const id of used) assert.ok(c.quizzes?.[id], `${c.id}: no quiz "${id}"`);
    for (const [id, q] of Object.entries(c.quizzes || {})) {
      assert.ok(used.has(id), `${c.id}: quiz "${id}" is never placed`);
      const type = q.type || 'mcq';
      assert.ok(['mcq', 'predict', 'num'].includes(type), `${c.id}/${id}: type`);
      assert.ok(q.q && q.explain, `${c.id}/${id}: q and explain`);
      if (type === 'num') assert.ok(Number.isFinite(q.answer), `${c.id}/${id}: numeric answer`);
      else {
        assert.ok(Array.isArray(q.choices) && q.choices.length >= 2, `${c.id}/${id}: choices`);
        assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length, `${c.id}/${id}: answer index`);
      }
    }
  }
});

test('sections: every h2 has a unique id', () => {
  for (const c of authored) {
    for (const m of c.html.matchAll(/<h2(\s[^>]*)?>/g)) assert.match(m[1] || '', /\sid="[^"]+"/, `${c.id}: <h2> without id`);
    const all = [...c.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(all).size, all.length, `${c.id}: duplicate element id`);
  }
});

test('internal links land on a chapter and, if given, a section', () => {
  for (const c of authored) {
    for (const m of c.html.matchAll(/href="#\/([^"/]*)(?:\/([^"]*))?"/g)) {
      const [, id, sec] = m;
      if (!id) continue;
      const target = course.byId(id);
      assert.ok(target, `${c.id}: link to unknown chapter #/${id}`);
      if (sec && !target.render && !(ONLY && isStub(target))) assert.ok(idsIn(target.html).has(sec), `${c.id}: link to missing section #/${id}/${sec}`);
      if (sec && id === 'people') assert.ok(PEOPLE_BY_ID[sec], `${c.id}: link to unknown person #/people/${sec}`);
    }
  }
});

test('people, glossary terms and pathologies resolve', () => {
  const gl = course.glossary();
  const seen = new Map();
  for (const c of course.all) {
    for (const k of Object.keys(c.glossary || {})) {
      assert.ok(!seen.has(k), `glossary key "${k}" defined in both ${seen.get(k)} and ${c.id}`);
      seen.set(k, c.id);
      const g = c.glossary[k];
      assert.ok(g.term && g.def, `${c.id}: glossary ${k} needs term and def`);
      if (g.section) assert.ok(idsIn(c.html || '').has(g.section), `${c.id}: glossary ${k} section ${g.section}`);
    }
  }
  // With CHAPTER set, a term may belong to a chapter that is still a stub.
  const stubsLeft = ONLY && CHAPTERS.some(isStub);
  for (const c of authored) {
    for (const m of c.html.matchAll(/data-term="([^"]+)"/g)) if (!stubsLeft) assert.ok(gl[m[1]], `${c.id}: unknown glossary term "${m[1]}"`);
    if (PEOPLE.length) for (const m of c.html.matchAll(/data-person="([^"]+)"/g)) assert.ok(PEOPLE_BY_ID[m[1]], `${c.id}: unknown person "${m[1]}"`);
    for (const p of c.pathologies || []) {
      for (const f of ['id', 'name', 'symptom', 'cause', 'diagnose', 'family']) assert.ok(p[f], `${c.id}: pathology ${p.id} lacks ${f}`);
      assert.ok(FAMILIES[p.family], `${c.id}: pathology ${p.id} family "${p.family}"`);
      assert.ok(Array.isArray(p.mitigations) && p.mitigations.length, `${c.id}: pathology ${p.id} mitigations`);
      if (p.section) assert.ok(idsIn(c.html).has(p.section), `${c.id}: pathology ${p.id} section "${p.section}"`);
      if (p.demo) assert.ok(c.widgets?.[p.demo.widget], `${c.id}: pathology ${p.id} demo widget "${p.demo.widget}"`);
    }
  }
  const pids = course.pathologies().map((p) => p.id);
  assert.equal(new Set(pids).size, pids.length, 'duplicate pathology id');
});

test('reference data: ids unique, fields present, chapters exist, TeX parses', () => {
  const chapterIds = new Set(course.all.map((c) => c.id));
  const ids = new Set();
  const unique = (id, what) => {
    assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `${what} id "${id}" is not kebab-case`);
    assert.ok(!ids.has(id), `${what} id "${id}" is used twice (ids share one namespace on the reference pages)`);
    ids.add(id);
  };
  for (const p of PEOPLE) {
    unique(p.id, 'person');
    assert.ok(p.name && p.summary, `person ${p.id}: name and summary`);
    for (const c of p.contributions || []) assert.ok(c.year && c.what, `person ${p.id}: contribution year and what`);
    for (const ch of p.chapters || []) assert.ok(chapterIds.has(ch), `person ${p.id}: unknown chapter ${ch}`);
  }
  for (const n of NOTATION) {
    unique(n.id, 'symbol');
    assert.ok(GROUPS[n.group], `symbol ${n.id}: group "${n.group}"`);
    assert.ok(n.name && n.meaning, `symbol ${n.id}: name and meaning`);
    if (n.tex) assert.doesNotThrow(() => tex(n.tex), `symbol ${n.id}: tex "${n.tex}"`);
    if (n.original_form) assert.doesNotThrow(() => tex(n.original_form, { display: true }), `symbol ${n.id}: original_form "${n.original_form}"`);
    for (const ch of n.chapters || []) assert.ok(chapterIds.has(ch), `symbol ${n.id}: unknown chapter ${ch}`);
  }
  for (const m of MILESTONES) {
    unique(m.id, 'milestone');
    assert.ok(KINDS[m.kind], `milestone ${m.id}: kind "${m.kind}"`);
    assert.ok(m.year && m.title && m.what, `milestone ${m.id}: year, title, what`);
    for (const ch of m.chapters || []) assert.ok(chapterIds.has(ch), `milestone ${m.id}: unknown chapter ${ch}`);
  }
});

const VOID = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'source', 'wbr', 'col', 'area']);
test('chapter HTML is balanced', () => {
  for (const c of authored) {
    const html = c.html.replace(/\$\$[\s\S]+?\$\$/g, '').replace(/(^|[^\\])\$(?:\\\$|[^$])+?\$/g, '$1').replace(/<!--[\s\S]*?-->/g, '');
    const stack = [];
    for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>/g)) {
      const [, close, tag0, , selfClose] = m;
      const tag = tag0.toLowerCase();
      if (VOID.has(tag) || selfClose) continue;
      if (!close) stack.push(tag);
      else {
        const top = stack.pop();
        assert.equal(top, tag, `${c.id}: </${tag}> closes <${top}> near …${html.slice(Math.max(0, m.index - 80), m.index + 20)}…`);
      }
    }
    assert.deepEqual(stack, [], `${c.id}: unclosed ${stack.join(', ')}`);
  }
});

test('the course bundles into one file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fc-bundle-'));
  try {
    const out = join(dir, 'course.html');
    execFileSync(process.execPath, [join(ROOT, 'tools/bundle.mjs'), join(ROOT, 'aids/fluid-course'), out], { stdio: 'pipe' });
    const html = readFileSync(out, 'utf8');
    assert.match(html, /<title>Fluids by the Numbers<\/title>/);
    assert.ok(!/<script type="module" src=/.test(html), 'module script left unbundled');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
