// Generate candidate floors per spec, score them, keep the best few and write them out for a human to pick and
// hand-tune:  gen-out/<id>-<rank>.js (floor source module), gen-out/<id>-<rank>.png (top-down map), gen-out/report.md.
//
//   node scripts/gen-floors.mjs [--n=60] [--only=3F[,5F]] [--keep=3] [--seed=1] [--out=gen-out]
//
// Seeds are reproducible: candidate i of a spec uses seed (--seed) * 100000 + depth * 1000 + i, so a kept candidate
// can be regenerated with generateFloor(spec, seed). The kept files are drafts: copy one to src/data/floors/,
// hand-tune it, and re-check with `node scripts/render-floor.mjs <file>` and the validator tests.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FLOOR_SPECS } from '../src/gen/specs.js';
import { generateFloor, sourceToModule } from '../src/gen/generator.js';
import { floorMetrics, scoreFloor } from '../src/gen/metrics.js';
import { renderFloorPng } from './render-floor.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const N = Number(args.n ?? 60);
const KEEP = Number(args.keep ?? 3);
const BASE = Number(args.seed ?? 1);
const OUT = path.resolve(ROOT, args.out ?? 'gen-out');
const only = args.only ? String(args.only).split(',').map((s) => s.trim().toLowerCase()) : null;
const specs = FLOOR_SPECS.filter((s) => !only || only.includes(s.key.toLowerCase()) || only.includes(s.id));
if (!specs.length) {
  console.error(`no spec matches --only=${args.only} (have ${FLOOR_SPECS.map((s) => s.key).join(', ')})`);
  process.exit(1);
}
fs.mkdirSync(OUT, { recursive: true });

const fmt = (v) => (typeof v === 'number' && !Number.isFinite(v) ? '-' : v);
const t0 = Date.now();
for (const spec of specs) {
  const t = Date.now();
  const cands = [];
  let failed = 0;
  const seen = new Set();
  for (let i = 0; i < N; i++) {
    const seed = BASE * 100000 + spec.depth * 1000 + i;
    let src;
    try { src = generateFloor(spec, seed); } catch { failed++; continue; }
    const key = src.map.join('\n');
    if (seen.has(key)) continue;
    seen.add(key);
    const m = floorMetrics(src);
    cands.push({ seed, src, m, score: scoreFloor(m, spec) });
  }
  cands.sort((a, b) => b.score - a.score);
  const kept = cands.slice(0, KEEP);
  for (const f of fs.readdirSync(OUT)) if (f.startsWith(`${spec.id}-`)) fs.rmSync(path.join(OUT, f));
  const rows = [];
  kept.forEach((c, k) => {
    const rank = k + 1;
    const base = `${spec.id}-${rank}`;
    const note = [
      `Generated draft ${spec.key} rank ${rank}/${cands.length} (seed ${c.seed}, score ${c.score}) by scripts/gen-floors.mjs.`,
      `Gimmicks: ${spec.gimmicks.join(', ')}. Path ${fmt(c.m.pathLength)}, with shortcuts ${fmt(c.m.pathWithShortcuts)}, loops ${c.m.loops}, dead ends ${c.m.deadEnds}.`,
      'Hand-tune before freezing; the gen block below is provenance only (the parser ignores it).',
    ].join('\n');
    fs.writeFileSync(path.join(OUT, `${base}.js`), sourceToModule(c.src, note));
    renderFloorPng(c.src, path.join(OUT, `${base}.png`), { metrics: c.m, score: c.score });
    rows.push({ rank, file: base, seed: c.seed, score: c.score, ...c.m });
  });
  const summary = {
    spec: { ...spec, encounters: undefined },
    generated: cands.length,
    failed,
    ms: Date.now() - t,
    scores: cands.map((c) => c.score),
    rows,
  };
  fs.writeFileSync(path.join(OUT, `${spec.id}-summary.json`), JSON.stringify(summary, null, 1));
  const best = rows[0];
  console.log(`${spec.key}: ${cands.length} candidates (${failed} failed) in ${summary.ms} ms; best score ${best?.score} `
    + `(path ${best?.pathLength}, shortcuts ${best?.pathWithShortcuts}, loops ${best?.loops}) -> ${OUT}/${spec.id}-1.png`);
}
writeReport();
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${path.relative(ROOT, path.join(OUT, 'report.md'))}`);

// report.md from every <id>-summary.json in the output folder (so --only runs keep the other specs' tables).
function writeReport() {
  const sums = fs.readdirSync(OUT).filter((f) => f.endsWith('-summary.json')).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(OUT, f), 'utf8')));
  const cols = [
    ['rank', 'rank'], ['file', 'file'], ['seed', 'seed'], ['score', 'score'], ['pathLength', 'D→U'],
    ['pathWithShortcuts', 'w/ shortcuts'], ['firstTrip', 'w/ keys'], ['stairsManhattan', 'manh.'], ['loops', 'loops'],
    ['deadEnds', 'dead ends'], ['chestsInDeadEnds', 'chests tucked'], ['chests', 'chests'],
    ['longestStraightRun', 'longest run'], ['turnsOnMainPath', 'turns'], ['coverageOfMainPath', 'coverage'],
    ['walkSteps', 'explore steps'], ['shortcutsOpenedByWalk', 'sc opened'], ['returnSteps', 'run back up'],
    ['descentSteps', 'run down'], ['cells', 'cells'],
  ];
  const out = [
    '# Generated floor candidates',
    '',
    `Written by \`node scripts/gen-floors.mjs\` (${new Date().toISOString().slice(0, 16)} UTC). Drafts to pick from and hand-tune; not game data.`,
    '',
    'Columns: D→U = shortest first-trip path to the up stairs, or to the boss tile on a boss floor (locks passable,',
    'shortcuts still barred); chests = all chests incl. key chests; w/ shortcuts = same with every',
    'shortcut lifted; w/ keys = first trip fetching each key before its lock; loops = cyclomatic number minus 2x2 room',
    'blocks; chests tucked = chests off the D–U spine (dead ends / side rooms behind a single edge); explore steps =',
    'no-map explorer from D until it stands on the goal; run back up / down = full knowledge with the shortcuts it opened.',
    '',
  ];
  for (const s of sums) {
    out.push(`## ${s.spec.key} — ${s.spec.w}x${s.spec.h}, ${s.spec.gimmicks.join(', ')}${s.spec.boss ? ', boss' : ''}`);
    out.push('');
    out.push(`Spec: shortcuts ${s.spec.shortcuts}, chests ${s.spec.chests}, loops ≥ ${s.spec.loops}, dead ends ≥ ${s.spec.deadEnds}. `
      + `${s.generated} candidates (${s.failed} failed), ${s.ms} ms. Score range ${Math.min(...s.scores)} – ${Math.max(...s.scores)}.`);
    out.push('');
    out.push(`| ${cols.map((c) => c[1]).join(' | ')} |`);
    out.push(`|${cols.map(() => '---').join('|')}|`);
    for (const r of s.rows) {
      out.push(`| ${cols.map(([k]) => (k === 'file' ? `[${r.file}](${r.file}.png)` : fmt(r[k]))).join(' | ')} |`);
    }
    out.push('');
  }
  fs.writeFileSync(path.join(OUT, 'report.md'), `${out.join('\n')}\n`);
}
