// Prints the `files` map for publishing dist/ as the artifact: every file under dist/assets, plus an optional
// backup bundle. Usage: node scripts/publish-files.mjs [backupPath]
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const files = {};
for (const f of await walk(path.join(root, 'dist', 'assets'))) files[path.relative(path.join(root, 'dist'), f)] = f;
if (process.argv[2]) files['backup/demongame.bundle.b64.txt'] = path.resolve(process.argv[2]);
console.log(JSON.stringify(files));
