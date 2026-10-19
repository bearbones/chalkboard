// A small TeX → MathML converter, so equations render natively (MathML Core)
// with no runtime dependency. It covers the subset the course writes:
//
//   scripts ^ _, primes, \frac \dfrac \tfrac \sqrt[n]{}, greek, \mathbf
//   \boldsymbol \mathrm \mathit \mathcal \mathbb \mathfrak \text \operatorname, accents
//   (\hat \bar \overline \tilde \widetilde \dot \ddot \vec \underline),
//   \left…\right and \big…, \underbrace{}_{} \overbrace{}^{}, \overset
//   \underset \stackrel, \sum \int \lim with limits, named functions,
//   environments aligned/gathered/cases/matrix/pmatrix/bmatrix/vmatrix/array,
//   \class{name}{…} (a styled, hoverable term), \boxed, \phantom, spacing.
//
// tex(src, {display}) returns a MathML string; unknown commands throw a
// TexError (tests run every equation in the course through it).

export class TexError extends Error {}

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε', zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ',
  iota: 'ι', kappa: 'κ', lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', varpi: 'ϖ', rho: 'ρ', varrho: 'ϱ',
  sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'ϕ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
};
const GREEK_UP = {
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π', Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};
// Ordinary symbols (identifiers).
const ORD = {
  infty: '∞', partial: '∂', nabla: '∇', hbar: 'ℏ', ell: 'ℓ', emptyset: '∅', aleph: 'ℵ', Re: 'ℜ', Im: 'ℑ', prime: '′',
  degree: '°', angle: '∠', triangle: '△', square: '□', Box: '□', checkmark: '✓', dagger: '†', star: '⋆', bullet: '•',
  triangleleft: '◁', triangleright: '▷', triangledown: '▽', bigtriangleup: '△', bigtriangledown: '▽', diamond: '⋄', lozenge: '◊',
  S: '§', P: '¶', wp: '℘', top: '⊤', bot: '⊥', flat: '♭', sharp: '♯', natural: '♮', imath: 'ı', jmath: 'ȷ', mho: '℧',
  varnothing: '∅', complement: '∁', surd: '√', blacksquare: '■', varkappa: 'ϰ', digamma: 'ϝ', eth: 'ð',
};
const UPRIGHT_ORD = new Set(['nabla', 'partial', 'infty', 'Box', 'square', 'triangle', 'degree', 'angle', 'checkmark', 'dagger', 'triangleleft', 'triangleright', 'triangledown', 'bigtriangleup', 'bigtriangledown', 'diamond', 'lozenge', 'S', 'P', 'top', 'bot', 'surd', 'blacksquare', 'varnothing']);
// Operators and relations.
const OPS = {
  cdot: '·', times: '×', div: '÷', pm: '±', mp: '∓', ast: '∗', circ: '∘', bullet: '∙', oplus: '⊕', otimes: '⊗', odot: '⊙', wedge: '∧', vee: '∨',
  le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠', approx: '≈', sim: '∼', simeq: '≃', cong: '≅', equiv: '≡', propto: '∝',
  ll: '≪', gg: '≫', lesssim: '≲', gtrsim: '≳', prec: '≺', succ: '≻', in: '∈', notin: '∉', ni: '∋', subset: '⊂', subseteq: '⊆', supset: '⊃',
  cup: '∪', cap: '∩', setminus: '∖', perp: '⊥', parallel: '∥', mid: '∣', colon: ':', vert: '|', Vert: '‖', lvert: '|', rvert: '|',
  lVert: '‖', rVert: '‖', to: '→', rightarrow: '→', leftarrow: '←', gets: '←', leftrightarrow: '↔', Rightarrow: '⇒', Leftarrow: '⇐',
  Leftrightarrow: '⇔', implies: '⟹', iff: '⟺', mapsto: '↦', longrightarrow: '⟶', uparrow: '↑', downarrow: '↓', forall: '∀', exists: '∃',
  neg: '¬', lnot: '¬', land: '∧', lor: '∨', cdots: '⋯', ldots: '…', dots: '…', vdots: '⋮', ddots: '⋱', langle: '⟨', rangle: '⟩',
  lfloor: '⌊', rfloor: '⌋', lceil: '⌈', rceil: '⌉', lbrace: '{', rbrace: '}', backslash: '∖', dagger: '†', triangleq: '≜',
  coloneqq: '≔', doteq: '≐', bigoplus: '⨁', ldotp: '.', shortmid: '∣',
  therefore: '∴', because: '∵', asymp: '≍', models: '⊨', vdash: '⊢', dashv: '⊣', nless: '≮', ngtr: '≯', nleq: '≰', ngeq: '≱',
  lessgtr: '≶', leqslant: '⩽', geqslant: '⩾', preceq: '⪯', succeq: '⪰', supseteq: '⊇', sqsubset: '⊏', sqsupset: '⊐',
  longleftarrow: '⟵', longleftrightarrow: '⟷', Longrightarrow: '⟹', Longleftarrow: '⟸', Longleftrightarrow: '⟺', hookrightarrow: '↪',
  nearrow: '↗', searrow: '↘', swarrow: '↙', nwarrow: '↖', rightleftharpoons: '⇌', leadsto: '⇝', updownarrow: '↕', Uparrow: '⇑', Downarrow: '⇓',
  wr: '≀', amalg: '⨿', uplus: '⊎', sqcup: '⊔', sqcap: '⊓', ominus: '⊖', oslash: '⊘', bigodot: '⨀', bigotimes: '⨂',
  cdotp: '·', centerdot: '·', smallsetminus: '∖', divideontimes: '⋇', ltimes: '⋉', rtimes: '⋊', bigstar: '★',
  approxeq: '≊', thicksim: '∼', backsim: '∽', eqsim: '≂', ncong: '≇', nsim: '≁', nparallel: '∦', nmid: '∤',
};
const FENCE_OPEN = new Set(['(', '[', '{', '⟨', '|', '‖', '⌊', '⌈']);
const BIG_OPS = { sum: '∑', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭', oint: '∮', bigcup: '⋃', bigcap: '⋂' };
const LIMIT_OPS = new Set(['sum', 'prod', 'coprod', 'bigcup', 'bigcap', 'lim', 'liminf', 'limsup', 'max', 'min', 'sup', 'inf', 'argmin', 'argmax', 'det']);
const FUNCS = [
  'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh', 'coth', 'arcsin', 'arccos', 'arctan', 'exp', 'log', 'ln', 'lg',
  'max', 'min', 'sup', 'inf', 'lim', 'liminf', 'limsup', 'det', 'arg', 'deg', 'dim', 'ker', 'gcd', 'Pr', 'sgn', 'argmin', 'argmax',
];
const FUNC_TEXT = { liminf: 'lim inf', limsup: 'lim sup', argmin: 'arg min', argmax: 'arg max' };
const ACCENTS = {
  hat: ['^', false], widehat: ['^', true], bar: ['‾', false], overline: ['‾', true], tilde: ['~', false], widetilde: ['~', true],
  dot: ['˙', false], ddot: ['¨', false], vec: ['→', false], overrightarrow: ['→', true], check: ['ˇ', false], breve: ['˘', false], acute: ['´', false], grave: ['`', false],
};
const SPACES = { ',': '0.1667em', ':': '0.2222em', '>': '0.2222em', ';': '0.2778em', ' ': '0.25em', quad: '1em', qquad: '2em', enspace: '0.5em', thinspace: '0.1667em', medspace: '0.2222em', thickspace: '0.2778em' };
const BIG = { big: '1.2em', Big: '1.623em', bigg: '2.047em', Bigg: '2.470em', bigl: '1.2em', bigr: '1.2em', Bigl: '1.623em', Bigr: '1.623em', biggl: '2.047em', biggr: '2.047em', Biggl: '2.470em', Biggr: '2.470em' };
const MATRIX_FENCES = { matrix: ['', ''], pmatrix: ['(', ')'], bmatrix: ['[', ']'], Bmatrix: ['{', '}'], vmatrix: ['|', '|'], Vmatrix: ['‖', '‖'], cases: ['{', ''], smallmatrix: ['', ''] };

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const OP_MAP = { '-': '−', '*': '∗', "'": '′' };

// ---- tokenizer ---------------------------------------------------------------
function tokenize(src) {
  const toks = [];
  let i = 0;
  const push = (tok, len) => {
    tok.pos = i;
    tok.end = i + len;
    toks.push(tok);
    i += len;
  };
  while (i < src.length) {
    const c = src[i];
    if (c === '\\') {
      const m = /^\\([a-zA-Z]+)\s*/.exec(src.slice(i));
      if (m) {
        push({ t: 'cmd', v: m[1] }, m[0].length);
      } else {
        const ch = src[i + 1];
        if (ch === undefined) throw new TexError('trailing backslash');
        push(ch === '\\' ? { t: 'newline' } : { t: 'cmd', v: ch }, 2);
      }
    } else if (/\s/.test(c)) {
      i++;
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^[0-9]*\.?[0-9]+|^[0-9]+/.exec(src.slice(i));
      push({ t: 'num', v: m[0] }, m[0].length);
    } else if (/[a-zA-Z]/.test(c)) {
      push({ t: 'letter', v: c }, 1);
    } else if (c === '{' || c === '}' || c === '^' || c === '_' || c === '&') {
      push({ t: c }, 1);
    } else {
      push({ t: 'char', v: c }, 1);
    }
  }
  return toks;
}

// ---- parser --------------------------------------------------------------------
// Nodes are MathML strings plus a little metadata: {m, kind}, where kind is
// 'op' for big operators that take limits and 'fence' for stretchy delimiters.
class Parser {
  constructor(src, display) {
    this.src = src;
    this.toks = tokenize(src);
    this.i = 0;
    this.display = display;
  }
  peek() {
    return this.toks[this.i];
  }
  next() {
    return this.toks[this.i++];
  }
  expect(t) {
    const tok = this.next();
    if (!tok || tok.t !== t) throw new TexError(`expected ${t}`);
    return tok;
  }
  // A whole sequence until a closing token: '}' / \right / \end / & / newline.
  // Returns an array of MathML strings.
  seq(stop) {
    const out = [];
    for (;;) {
      const tok = this.peek();
      if (!tok) {
        if (stop && stop !== 'eof') throw new TexError(`missing ${stop}`);
        return out;
      }
      if (tok.t === '}' && stop === '}') return out;
      if (stop === 'right' && tok.t === 'cmd' && tok.v === 'right') return out;
      if (stop === 'cell' && (tok.t === '&' || tok.t === 'newline' || (tok.t === 'cmd' && tok.v === 'end'))) return out;
      if (tok.t === '}') throw new TexError('unbalanced }');
      if (tok.t === '&') throw new TexError('& outside an environment');
      if (tok.t === 'cmd' && tok.v === 'right') throw new TexError('\\right without \\left');
      if (tok.t === 'cmd' && tok.v === 'displaystyle') {
        this.next();
        const rest = this.seq(stop);
        out.push(`<mstyle displaystyle="true">${rest.join('')}</mstyle>`);
        return out;
      }
      if (tok.t === 'newline') {
        if (stop === 'eof') return this.gather(out);
        throw new TexError('\\\\ outside an environment');
      }
      out.push(this.scripted());
    }
  }
  // Top-level \\ : stack the lines centred (like gathered).
  gather(first) {
    const rows = [first];
    while (this.peek()) {
      if (this.peek().t === 'newline') {
        this.next();
        rows.push([]);
        continue;
      }
      const cell = this.seq('cell');
      rows[rows.length - 1].push(...cell);
      if (this.peek()?.t === '&') throw new TexError('& outside an environment');
    }
    return [`<mtable>${rows.map((r) => `<mtr><mtd><mrow>${r.join('')}</mrow></mtd></mtr>`).join('')}</mtable>`];
  }
  group() {
    // A required argument: {…} or a single token.
    const tok = this.peek();
    if (!tok) throw new TexError('missing argument');
    if (tok.t === '{') {
      this.next();
      const inner = this.seq('}');
      this.expect('}');
      return row(inner);
    }
    // As in TeX, an unbraced number argument is one digit: \frac12 is ½.
    if (tok.t === 'num' && tok.v.length > 1 && tok.v[0] !== '.') {
      const d = tok.v[0];
      tok.v = tok.v.slice(1);
      tok.pos += 1;
      return `<mn>${d}</mn>`;
    }
    return this.atom().m;
  }
  rawGroup() {
    // The literal source text of a {…} argument (for \text and \class).
    const open = this.next();
    if (!open || open.t !== '{') throw new TexError('expected {');
    let depth = 1;
    for (;;) {
      const t = this.next();
      if (!t) throw new TexError('missing }');
      if (t.t === '{') depth++;
      if (t.t === '}' && --depth === 0) return this.src.slice(open.end, t.pos);
    }
  }
  optional() {
    const tok = this.peek();
    if (tok && tok.t === 'char' && tok.v === '[') {
      this.next();
      const out = [];
      while (this.peek() && !(this.peek().t === 'char' && this.peek().v === ']')) out.push(this.scripted());
      if (!this.peek()) throw new TexError('missing ]');
      this.next();
      return row(out);
    }
    return null;
  }
  scripted() {
    const base = this.atom();
    let sup = null,
      sub = null;
    let primes = '';
    for (;;) {
      const tok = this.peek();
      if (!tok) break;
      if (tok.t === 'char' && tok.v === "'") {
        this.next();
        primes += '′';
        continue;
      }
      if (tok.t === '^' && sup === null) {
        this.next();
        sup = this.scriptArg();
        continue;
      }
      if (tok.t === '_' && sub === null) {
        this.next();
        sub = this.scriptArg();
        continue;
      }
      if (tok.t === '^' || tok.t === '_') throw new TexError('double script');
      break;
    }
    if (primes) sup = sup ? `<mrow><mo>${primes}</mo>${sup}</mrow>` : `<mo>${primes}</mo>`;
    if (sup === null && sub === null) return base.m;
    const under = base.kind === 'op' && base.limits && (this.display || base.forceLimits);
    if (under) {
      if (sup !== null && sub !== null) return `<munderover>${base.m}${sub}${sup}</munderover>`;
      if (sub !== null) return `<munder>${base.m}${sub}</munder>`;
      return `<mover>${base.m}${sup}</mover>`;
    }
    if (base.kind === 'brace') {
      return base.over ? `<mover>${base.m}${sup ?? sub}</mover>` : `<munder>${base.m}${sub ?? sup}</munder>`;
    }
    if (sup !== null && sub !== null) return `<msubsup>${base.m}${sub}${sup}</msubsup>`;
    if (sub !== null) return `<msub>${base.m}${sub}</msub>`;
    return `<msup>${base.m}${sup}</msup>`;
  }
  scriptArg() {
    const tok = this.peek();
    if (!tok) throw new TexError('missing script');
    if (tok.t === 'num' && tok.v.length > 1) {
      // x^23 is x^2 followed by 3, as in TeX: take one digit, leave the rest.
      const d = tok.v[0];
      tok.v = tok.v.slice(1);
      return `<mn>${d}</mn>`;
    }
    return this.group();
  }
  atom() {
    const tok = this.next();
    if (!tok) throw new TexError('unexpected end');
    switch (tok.t) {
      case '{': {
        const inner = this.seq('}');
        this.expect('}');
        return { m: row(inner) };
      }
      case 'num':
        return { m: `<mn>${tok.v}</mn>` };
      case 'letter':
        return { m: `<mi>${tok.v}</mi>` };
      case 'char':
        return this.char(tok.v);
      case 'cmd':
        return this.command(tok.v);
      case '^':
      case '_':
        // A script with no base, e.g. {}^{n}: attach to an empty row.
        this.i--;
        return { m: '<mrow></mrow>' };
      default:
        throw new TexError(`unexpected ${tok.t}`);
    }
  }
  char(c) {
    if (c === '~') return { m: '<mspace width="0.25em"></mspace>' };
    // TeX treats | as an ordinary symbol; MathML would space it as an infix operator mid-row.
    if (c === '|') return { m: '<mo stretchy="false" lspace="0" rspace="0">|</mo>' };
    if (/[()[\]]/.test(c)) return { m: `<mo stretchy="false">${esc(c)}</mo>` };
    if (c === ',' || c === ';') return { m: `<mo separator="true">${c}</mo>` };
    if (c === '!' || c === '?' || c === '.') return { m: `<mo lspace="0" rspace="0">${c}</mo>` };
    return { m: `<mo>${esc(OP_MAP[c] || c)}</mo>` };
  }
  command(name) {
    if (name in GREEK) return { m: `<mi>${GREEK[name]}</mi>` };
    if (name in GREEK_UP) return { m: `<mi class="up">${GREEK_UP[name]}</mi>` };
    if (name in SPACES) return { m: `<mspace width="${SPACES[name]}"></mspace>` };
    if (name === '!') return { m: '<mspace width="-0.1667em"></mspace>' };
    if (name in BIG_OPS) {
      const intg = name.endsWith('int');
      return { m: `<mo largeop="true" movablelimits="${intg ? 'false' : 'true'}">${BIG_OPS[name]}</mo>`, kind: 'op', limits: LIMIT_OPS.has(name) };
    }
    if (FUNCS.includes(name)) {
      return { m: `<mi class="up">${FUNC_TEXT[name] || name}</mi>`, kind: LIMIT_OPS.has(name) ? 'op' : 'fn', limits: LIMIT_OPS.has(name) };
    }
    if (name in ORD) return { m: `<mi${UPRIGHT_ORD.has(name) ? ' class="up"' : ''}>${ORD[name]}</mi>` };
    if (name in OPS) {
      const v = OPS[name];
      if (v === '|' || v === '‖') return { m: `<mo stretchy="false" lspace="0" rspace="0">${v}</mo>` };
      if (FENCE_OPEN.has(v) || v === '⟩' || v === '⌋' || v === '⌉' || v === '}') return { m: `<mo stretchy="false">${esc(v)}</mo>` };
      return { m: `<mo>${esc(v)}</mo>` };
    }
    if (name === '{' || name === '}') return { m: `<mo stretchy="false">${name}</mo>` };
    if (name === '|') return { m: '<mo stretchy="false" lspace="0" rspace="0">‖</mo>' };
    if (name === '$' || name === '%' || name === '#' || name === '&' || name === '_') return { m: `<mi class="up">${esc(name)}</mi>` };
    if (name in ACCENTS) {
      const [ch, stretch] = ACCENTS[name];
      return { m: `<mover accent="true">${this.group()}<mo stretchy="${stretch}">${esc(ch)}</mo></mover>` };
    }
    if (name in BIG) {
      const d = this.delimiter();
      return { m: `<mo minsize="${BIG[name]}" maxsize="${BIG[name]}" stretchy="true">${esc(d)}</mo>` };
    }
    switch (name) {
      case 'frac':
      case 'dfrac':
      case 'tfrac': {
        const a = this.group(),
          b = this.group();
        const f = `<mfrac>${a}${b}</mfrac>`;
        if (name === 'dfrac') return { m: `<mstyle displaystyle="true">${f}</mstyle>` };
        if (name === 'tfrac') return { m: `<mstyle displaystyle="false">${f}</mstyle>` };
        return { m: f };
      }
      case 'sqrt': {
        const n = this.optional();
        const x = this.group();
        return { m: n ? `<mroot>${x}${n}</mroot>` : `<msqrt>${x}</msqrt>` };
      }
      case 'mathbf':
        return { m: this.styled('b') };
      case 'boldsymbol':
      case 'bm':
        return { m: this.styled('bi') };
      case 'mathrm':
      case 'mathup':
        return { m: this.styled('up') };
      case 'mathit':
        return { m: this.styled('it') };
      case 'mathsf':
        return { m: this.styled('sf') };
      case 'mathtt':
        return { m: this.styled('tt') };
      case 'mathcal':
      case 'mathscr':
        return { m: mapped(this.rawText(), SCRIPT) };
      case 'mathbb':
        return { m: mapped(this.rawText(), DOUBLE) };
      case 'mathfrak':
        return { m: mapped(this.rawText(), FRAKTUR) };
      case 'text':
      case 'textrm':
      case 'mbox':
      case 'textit':
      case 'textbf': {
        const t = this.rawText();
        const cls = name === 'textit' ? ' class="it"' : name === 'textbf' ? ' class="b"' : '';
        return { m: `<mtext${cls}>${esc(t).replace(/^ | $/g, ' ')}</mtext>` };
      }
      case 'operatorname': {
        const t = this.rawText();
        return { m: `<mi class="up">${esc(t)}</mi>`, kind: 'fn' };
      }
      case 'left':
        return this.leftRight();
      case 'underbrace':
      case 'overbrace': {
        const x = this.group();
        const over = name === 'overbrace';
        const brace = over ? '⏞' : '⏟';
        return { m: over ? `<mover>${x}<mo stretchy="true">${brace}</mo></mover>` : `<munder>${x}<mo stretchy="true">${brace}</mo></munder>`, kind: 'brace', over };
      }
      case 'underline':
        return { m: `<munder accentunder="true">${this.group()}<mo stretchy="true">‾</mo></munder>` };
      case 'overset':
      case 'stackrel': {
        const top = this.group(),
          base = this.group();
        return { m: `<mover>${base}${top}</mover>` };
      }
      case 'underset': {
        const bottom = this.group(),
          base = this.group();
        return { m: `<munder>${base}${bottom}</munder>` };
      }
      case 'limits': {
        return { m: '<mrow></mrow>' };
      }
      case 'class':
      case 'cssclass': {
        const cls = this.rawText().trim();
        if (!/^[\w -]+$/.test(cls)) throw new TexError(`bad class name ${cls}`);
        return { m: `<mrow class="${cls}">${this.group()}</mrow>` };
      }
      case 'boxed':
        return { m: `<mrow class="boxed">${this.group()}</mrow>` };
      case 'phantom':
        return { m: `<mphantom>${this.group()}</mphantom>` };
      case 'begin':
        return this.environment();
      case 'end':
        throw new TexError('\\end without \\begin');
      case 'not': {
        const nxt = this.atom().m;
        const m = /^<mo[^>]*>(.*)<\/mo>$/.exec(nxt);
        const NEG = { '=': '≠', '∈': '∉', '≡': '≢', '<': '≮', '>': '≯', '∼': '≁', '≤': '≰', '≥': '≱', '⊂': '⊄' };
        if (m && NEG[m[1]]) return { m: `<mo>${NEG[m[1]]}</mo>` };
        return { m: `<mrow class="not">${nxt}</mrow>` };
      }
      case 'tag': {
        const t = this.rawText();
        return { m: `<mspace width="2em"></mspace><mtext>(${esc(t)})</mtext>` };
      }
      case 'color':
        throw new TexError('use \\class{…}{…} with a CSS token, not \\color');
      default:
        throw new TexError(`unknown command \\${name}`);
    }
  }
  rawText() {
    return this.rawGroup()
      .replace(/\\([$%&_#{} ,;:!])/g, (_, c) => ({ ',': '\u2009', ';': '\u2005', ':': '\u2005', '!': '' })[c] ?? c)
      .replace(/\s+/g, ' ');
  }
  // \mathbf{…} etc. A plain word becomes one identifier; anything else is
  // parsed and every mi/mn inside is tagged with the class.
  styled(cls) {
    const tok = this.peek();
    if (tok && tok.t === '{') {
      const save = this.i;
      const raw = this.rawGroup();
      if (/^[A-Za-z0-9]+$/.test(raw)) return /^[0-9]+$/.test(raw) ? `<mn class="${cls}">${raw}</mn>` : `<mi class="${cls}">${raw}</mi>`;
      this.i = save;
    }
    const inner = this.group();
    return inner.replace(/<(mi|mn)( class="[^"]*")?>/g, (_, tag) => `<${tag} class="${cls}">`);
  }
  delimiter() {
    const tok = this.next();
    if (!tok) throw new TexError('missing delimiter');
    if (tok.t === 'char') return tok.v === '.' ? '' : tok.v;
    if (tok.t === 'cmd') {
      if (tok.v === '{' || tok.v === '}') return tok.v;
      if (tok.v === '|') return '‖';
      if (tok.v in OPS) return OPS[tok.v];
    }
    throw new TexError('bad delimiter');
  }
  leftRight() {
    const open = this.delimiter();
    const inner = this.seq('right');
    this.expect('cmd'); // \right
    const close = this.delimiter();
    const fence = (d) => (d ? `<mo stretchy="true" fence="true">${esc(d)}</mo>` : '');
    return { m: `<mrow>${fence(open)}${inner.join('')}${fence(close)}</mrow>` };
  }
  environment() {
    const name = this.rawText().trim();
    let align = null;
    if (name === 'array') align = this.rawText().replace(/[^lcr]/g, '');
    const rows = [[]];
    for (;;) {
      const tok = this.peek();
      if (!tok) throw new TexError(`missing \\end{${name}}`);
      if (tok.t === 'cmd' && tok.v === 'end') {
        this.next();
        const closing = this.rawText().trim();
        if (closing !== name) throw new TexError(`\\begin{${name}} closed by \\end{${closing}}`);
        break;
      }
      if (tok.t === '&') {
        this.next();
        rows[rows.length - 1].push(null);
        continue;
      }
      if (tok.t === 'newline') {
        this.next();
        rows.push([]);
        continue;
      }
      const r = rows[rows.length - 1];
      const cell = this.seq('cell');
      if (r.length && r[r.length - 1] === null) r[r.length - 1] = cell;
      else r.push(cell);
    }
    // Cells: a null marks an empty cell after &.
    const clean = rows.filter((r, k) => r.length || k < rows.length - 1).map((r) => r.map((c) => c || []));
    const colAlign = (k) => {
      if (name === 'aligned' || name === 'align' || name === 'alignedat' || name === 'split') return k % 2 === 0 ? 'right' : 'left';
      if (name === 'cases') return 'left';
      if (align) return { l: 'left', c: 'center', r: 'right' }[align[k]] || 'center';
      return 'center';
    };
    const isAligned = /^(aligned|align|split|alignedat)$/.test(name);
    const body = clean
      .map(
        (r) =>
          `<mtr>${r
            .map((c, k) => {
              // In aligned, the relation after & keeps its left spacing.
              const lead = isAligned && k % 2 === 1 ? '<mi></mi>' : '';
              return `<mtd style="text-align:${colAlign(k)}">${lead}${c.join('')}</mtd>`;
            })
            .join('')}</mtr>`,
      )
      .join('');
    const cls = isAligned || name === 'gathered' || name === 'gather' ? ' class="aligned"' : name === 'cases' ? ' class="cases"' : '';
    const table = `<mtable${cls}${isAligned || name === 'cases' ? ' displaystyle="true"' : ''}>${body}</mtable>`;
    const f = MATRIX_FENCES[name];
    if (!f && !isAligned && !/^(gathered|gather|array)$/.test(name)) throw new TexError(`unknown environment ${name}`);
    if (f && (f[0] || f[1])) {
      const fence = (d) => (d ? `<mo stretchy="true" fence="true">${esc(d)}</mo>` : '');
      return { m: `<mrow>${fence(f[0])}${table}${fence(f[1])}</mrow>` };
    }
    return { m: table };
  }
}

function row(items) {
  return items.length === 1 ? items[0] : `<mrow>${items.join('')}</mrow>`;
}

const SCRIPT = { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ', base: [0x1d49c, 0x1d4b6] };
const FRAKTUR = { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ', base: [0x1d504, 0x1d51e] };
const DOUBLE = { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ', base: [0x1d538, 0x1d552] };
function mapped(text, table) {
  const out = [...text.replace(/\s/g, '')]
    .map((c) => {
      if (table[c]) return table[c];
      if (/[A-Z]/.test(c)) return String.fromCodePoint(table.base[0] + c.charCodeAt(0) - 65);
      if (/[a-z]/.test(c)) return String.fromCodePoint(table.base[1] + c.charCodeAt(0) - 97);
      return c;
    })
    .join('');
  return `<mi class="up">${out}</mi>`;
}

export function tex(src, { display = false } = {}) {
  const p = new Parser(src, display);
  const body = p.seq('eof');
  if (p.peek()) throw new TexError(`unexpected ${p.peek().t}`);
  const attr = display ? ' display="block"' : '';
  return `<math${attr}><semantics><mrow>${body.join('')}</mrow><annotation encoding="application/x-tex">${esc(src.trim())}</annotation></semantics></math>`;
}

// Replace $…$ (inline) and $$…$$ (display) in an HTML string. \$ is a literal
// dollar. Text inside <code>, <pre>, <script> and <style> is left alone.
// Errors are rendered visibly (and collected) rather than thrown, so one bad
// equation never blanks a chapter.
export function texInHtml(html, errors = []) {
  return html
    .split(/(<(?:code|pre|script|style)\b[\s\S]*?<\/(?:code|pre|script|style)>)/i)
    .map((part, k) => {
      if (k % 2 === 1) return part;
      return part
        .replace(/\$\$([\s\S]+?)\$\$/g, (_, src) => render(src, true, errors))
        .replace(/(^|[^\\])\$((?:\\\$|[^$])+?)\$/g, (_, pre, src) => pre + render(src, false, errors))
        .replace(/\\\$/g, '$');
    })
    .join('');
}

function render(src, display, errors) {
  try {
    return tex(decodeEntities(src), { display });
  } catch (err) {
    errors.push({ src, message: err.message });
    return `<code class="tex-error" title="${esc(err.message)}">${esc(src)}</code>`;
  }
}

// Authors may write &lt; inside math in HTML; TeX wants the character.
function decodeEntities(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
