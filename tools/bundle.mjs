// Bundle an aid into one HTML file: the stylesheet inlined, the ES modules
// wrapped in function scopes in dependency order. The result has no
// <!doctype>/<html>/<head>/<body> tags, so a host that adds its own skeleton
// (a claude.ai Artifact) can serve it as-is, and browsers render it too.
//
//   node tools/bundle.mjs aids/pressure-solver dist/pressure-solver.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const [dir, out] = process.argv.slice(2);
const html = readFileSync(join(dir, 'index.html'), 'utf8');
const entry = /<script type="module" src="([^"]+)"><\/script>/.exec(html)[1];

const order = [];
const seen = new Set();
const id = (file) => relative(dir, file).replace(/\W/g, '_');
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/^import [\s\S]*? from '([^']+)';/gm)) visit(resolve(dirname(file), m[1]));
  order.push(file);
}
visit(resolve(dir, entry));

const modules = order.map((file) => {
  let src = readFileSync(file, 'utf8');
  const exported = [];
  src = src.replace(/^import \* as (\w+) from '([^']+)';/gm, (_, name, path) => `const ${name} = __m.${id(resolve(dirname(file), path))};`);
  src = src.replace(/^import \{([\s\S]*?)\} from '([^']+)';/gm, (_, names, path) => `const {${names.replace(/(\w+)\s+as\s+(\w+)/g, '$1: $2')}} = __m.${id(resolve(dirname(file), path))};`);
  src = src.replace(/^export (const|let|function\*?|class) (\w+)/gm, (_, kw, name) => (exported.push(name), `${kw} ${name}`));
  src = src.replace(/^export (const|let) (\w+)\s*=/gm, (_, kw, name) => (exported.push(name), `${kw} ${name} =`));
  // One name per `export const`: a multi-declarator export would silently drop the rest.
  if (/^export (const|let) [^;]*,\s*$/m.test(src)) throw new Error(`split multi-name export in ${file}`);
  if (/^(import|export) /m.test(src)) throw new Error(`unhandled import/export in ${file}`);
  return `// ---- ${relative(dir, file)}\n__m.${id(file)} = (() => {\n${src}\nreturn { ${exported.join(', ')} };\n})();`;
});

const css = readFileSync(join(dir, 'style.css'), 'utf8');
const head = /<head>([\s\S]*?)<\/head>/.exec(html)[1]
  .replace(/<meta name="viewport"[^>]*>\n?/, '')
  .replace(/<link rel="stylesheet" href="(?!https?:)[^"]*">/, `<style>\n${css}</style>`);
const body = /<body>([\s\S]*?)<\/body>/.exec(html)[1].replace(/<script type="module" src="[^"]+"><\/script>/, `<script type="module">\nconst __m = {};\n${modules.join('\n\n')}\n</script>`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, head.trim() + '\n' + body.trim() + '\n');
console.log(`${out}: ${order.length} modules, ${(Buffer.byteLength(head + body) / 1024).toFixed(0)} KiB`);
