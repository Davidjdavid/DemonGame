// Build the publishable page: bundle src/main.js (with three) into one inline script and inline the CSS.
// Output: dist/index.html, an HTML fragment (the artifact platform wraps it in <!doctype html><head>...<body>).
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

export async function buildPage() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });
  const result = await build({
    entryPoints: [path.join(root, 'src/main.js')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    write: false,
    legalComments: 'none',
  });
  const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const css = await readFile(path.join(root, 'src/ui/style.css'), 'utf8');
  const tpl = await readFile(path.join(root, 'src/index.template.html'), 'utf8');
  const html = tpl
    .replace('/*__CSS__*/', () => css)
    .replace('/*__BUNDLE__*/', () => js)
    .replace('__BUILD__', () => new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC');
  await writeFile(path.join(dist, 'index.html'), html);
  return { bytes: html.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bytes } = await buildPage();
  console.log(`dist/index.html ${(bytes / 1024).toFixed(1)} KB`);
}
