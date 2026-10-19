import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tex, texInHtml, TexError } from '../../aids/fluid-course/src/kit/math.js';

const inner = (s) => tex(s).replace(/^<math><semantics><mrow>|<\/mrow><annotation[\s\S]*$/g, '');

test('scripts, fractions and greek', () => {
  assert.equal(inner('x^2'), '<msup><mi>x</mi><mn>2</mn></msup>');
  assert.equal(inner('u_j^{n+1}'), '<msubsup><mi>u</mi><mi>j</mi><mrow><mi>n</mi><mo>+</mo><mn>1</mn></mrow></msubsup>');
  assert.equal(inner('\\frac{a}{b}'), '<mfrac><mi>a</mi><mi>b</mi></mfrac>');
  assert.equal(inner('\\nu'), '<mi>ν</mi>');
  assert.equal(inner('\\Delta'), '<mi class="up">Δ</mi>');
});

test('TeX takes one digit for an unbraced script', () => {
  assert.equal(inner('x^23'), '<msup><mi>x</mi><mn>2</mn></msup><mn>3</mn>');
});

test('minus is a real minus sign; primes attach as superscripts', () => {
  assert.match(inner('a-b'), /<mo>−<\/mo>/);
  assert.equal(inner("u'"), '<msup><mi>u</mi><mo>′</mo></msup>');
  assert.equal(inner("u'_j"), '<msubsup><mi>u</mi><mi>j</mi><mo>′</mo></msubsup>');
});

test('bold vectors and upright words', () => {
  assert.equal(inner('\\mathbf{u}'), '<mi class="b">u</mi>');
  assert.equal(inner('\\mathrm{Re}'), '<mi class="up">Re</mi>');
  assert.match(inner('\\text{for all } x'), /<mtext>for all <\/mtext>/);
});

test('limits go under big operators only in display style', () => {
  assert.match(tex('\\sum_{k=0}^N a_k', { display: true }), /<munderover><mo[^>]*>∑<\/mo>/);
  assert.match(tex('\\sum_{k=0}^N a_k'), /<msubsup><mo[^>]*>∑<\/mo>/);
  assert.match(tex('\\int_0^1 f', { display: true }), /<msubsup><mo[^>]*>∫<\/mo>/);
});

test('environments', () => {
  const m = inner('\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}');
  assert.equal((m.match(/<mtr>/g) || []).length, 2);
  assert.equal((m.match(/<mtd/g) || []).length, 4);
  assert.match(inner('\\begin{pmatrix} 1 & 2 \\\\ 3 & 4 \\end{pmatrix}'), /^<mrow><mo stretchy="true" fence="true">\(<\/mo><mtable>/);
  assert.match(inner('\\begin{cases} 1 & x>0 \\\\ 0 & x \\le 0 \\end{cases}'), /fence="true">\{<\/mo>/);
});

test('fences, accents, braces and classes', () => {
  assert.match(inner('\\left( x \\right)'), /<mo stretchy="true" fence="true">\(<\/mo><mi>x<\/mi><mo stretchy="true" fence="true">\)<\/mo>/);
  assert.match(inner('\\hat{u}'), /<mover accent="true"><mi>u<\/mi><mo stretchy="false">\^<\/mo><\/mover>/);
  assert.match(inner('\\underbrace{a+b}_{\\text{sum}}'), /<munder><munder>/);
  assert.equal(inner('\\class{t-adv}{x}'), '<mrow class="t-adv"><mi>x</mi></mrow>');
});

test('errors are TexErrors', () => {
  for (const bad of ['\\nosuchcommand', '{a', 'a}', '\\frac{a}', '\\left( a', 'a & b', '\\begin{aligned} a \\end{gathered}', '\\color{red}{x}']) {
    assert.throws(() => tex(bad), TexError, bad);
  }
});

test('texInHtml: inline, display, escapes, code untouched, errors collected', () => {
  const errs = [];
  const out = texInHtml('cost \\$5, $x<y$ and <code>$keep$</code> $$E=mc^2$$ $\\bogus$', errs);
  assert.match(out, /cost \$5/);
  assert.match(out, /<math><semantics><mrow><mi>x<\/mi><mo>&lt;<\/mo><mi>y<\/mi>/);
  assert.match(out, /<code>\$keep\$<\/code>/);
  assert.match(out, /<math display="block">/);
  assert.equal(errs.length, 1);
  assert.match(out, /class="tex-error"/);
});
