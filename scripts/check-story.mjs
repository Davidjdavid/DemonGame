// Validates the story bible, scenes, NPC cards, key items and hand-designed maps against each other.
// Run: node scripts/check-story.mjs   (exit code 1 on errors; warnings are printed but don't fail)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/data');
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);
const readJson = (p) => {
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch (e) { err(`${p}: ${e.message}`); return null; }
};
const jsonFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : []);

// ---------------------------------------------------------------- load
const bible = readJson(join(DATA, 'story/bible.json')) ?? {};
const scenesArr = readJson(join(DATA, 'story/scenes.json')) ?? [];
const storyItems = readJson(join(DATA, 'story/items.json')) ?? [];
const npcCards = Object.fromEntries(jsonFiles(join(DATA, 'story/npcs')).map((f) => [f.replace(/\.json$/, ''), readJson(join(DATA, 'story/npcs', f))]));
const maps = Object.fromEntries(jsonFiles(join(DATA, 'maps')).map((f) => [f.replace(/\.json$/, ''), readJson(join(DATA, 'maps', f))]));
const demonIds = new Set(jsonFiles(join(DATA, 'demons')).map((f) => f.replace(/\.json$/, '')));
const tileNames = new Set(Object.keys(readJson(join(DATA, 'tiles.json'))?.tiles ?? {}));
const itemIds = new Set();
for (const f of ['items.json', 'items-extra-a.json', 'items-extra-b.json']) for (const i of readJson(join(DATA, f)) ?? []) itemIds.add(i.id);
for (const i of storyItems) {
  if (itemIds.has(i.id)) err(`story item ${i.id} clashes with an existing item id`);
  if (i.kind !== 'key') err(`story item ${i.id}: kind should be "key"`);
  for (const k of ['id', 'name', 'desc']) if (!i[k]) err(`story item ${i.id ?? '?'}: missing ${k}`);
  itemIds.add(i.id);
}

const scenes = {};
for (const s of scenesArr) {
  if (!s?.id) { err('scene without id'); continue; }
  if (scenes[s.id]) err(`duplicate scene id ${s.id}`);
  scenes[s.id] = s;
}
const FLAGS = new Set(Object.keys(bible.flags ?? {}));
const METERS = new Set(Object.keys(bible.meters ?? {}));
const FACTS = new Set((bible.facts ?? []).map((f) => f.id));
const FACTIONS = new Set((bible.factions ?? []).map((f) => f.id));
const NPC_IDS = new Set(Object.keys(npcCards));
for (const m of ['talks', 'recruits', 'fled', 'kills', 'mercy', 'lies_caught']) if (!METERS.has(m)) err(`bible.meters missing behavior meter ${m}`);

// Every flag set somewhere, and every flag read somewhere (for unused-flag warnings).
const flagSetters = new Map(); // flag -> [where]
// Flags the engine sets on its own: flirted_<npc or demon id> (a flirt in talk), first_talk_<npc id> (who he sought
// out first), gave_<item>_to_<npc> (a key item handed over in free talk), caught_<npc>_<about> (a lie caught in talk).
const ENGINE_FLAG = /^(flirted_|first_talk_|gave_[a-z0-9_]+_to_|caught_)[a-z0-9_]+$/;
const flagReaders = new Set();
const addSetter = (f, where) => { if (!flagSetters.has(f)) flagSetters.set(f, []); flagSetters.get(f).push(where); };

function checkCond(cond, where) {
  if (cond == null) return;
  if (typeof cond !== 'object') { err(`${where}: condition must be an object`); return; }
  for (const k of Object.keys(cond)) if (!['flags', 'meters', 'seen'].includes(k)) err(`${where}: unknown condition key "${k}"`);
  for (const [f, v] of Object.entries(cond.flags ?? {})) {
    if (!FLAGS.has(f)) err(`${where}: flag "${f}" is not declared in bible.flags`);
    if (typeof v !== 'boolean') err(`${where}: flag "${f}" must be true or false`);
    flagReaders.add(f);
  }
  for (const [m, r] of Object.entries(cond.meters ?? {})) {
    if (!METERS.has(m)) err(`${where}: meter "${m}" is not declared in bible.meters`);
    if (!r || typeof r !== 'object' || (r.min == null && r.max == null)) err(`${where}: meter "${m}" needs min and/or max`);
  }
  for (const s of cond.seen ?? []) if (!scenes[s]) err(`${where}: seen scene "${s}" does not exist`);
}

// ---------------------------------------------------------------- bible
for (const k of ['title', 'premise', 'theme', 'world', 'factions', 'npcs', 'facts', 'fixedEvents', 'meters', 'flags', 'outcomes']) if (bible[k] == null) err(`bible.${k} missing`);
for (const f of bible.factions ?? []) {
  for (const k of ['id', 'name', 'wants', 'cost', 'leader']) if (!f[k]) err(`faction ${f.id ?? '?'}: missing ${k}`);
  if (f.leader && !NPC_IDS.has(f.leader)) err(`faction ${f.id}: leader ${f.leader} has no NPC card`);
}
const factIds = new Set();
for (const f of bible.facts ?? []) {
  if (factIds.has(f.id)) err(`duplicate fact ${f.id}`);
  factIds.add(f.id);
  if (typeof f.true !== 'boolean') err(`fact ${f.id}: "true" must be a boolean`);
  if (!f.text) err(`fact ${f.id}: missing text`);
}
const bibleNpcIds = new Set();
for (const n of bible.npcs ?? []) {
  bibleNpcIds.add(n.id);
  if (!NPC_IDS.has(n.id)) err(`bible npc ${n.id} has no card in story/npcs/`);
  for (const id of n.knows ?? []) if (!FACTS.has(id)) err(`bible npc ${n.id}: knows unknown fact ${id}`);
  if (n.faction !== 'none' && !FACTIONS.has(n.faction)) err(`bible npc ${n.id}: unknown faction ${n.faction}`);
}
for (const id of NPC_IDS) if (!bibleNpcIds.has(id)) err(`NPC card ${id} is not listed in bible.npcs`);
for (const [f, d] of Object.entries(bible.flags ?? {})) if (!d || typeof d !== 'string') err(`flag ${f}: needs a one-line description`);
const outcomeIds = new Set();
let liars = 0;
for (const o of bible.outcomes ?? []) {
  if (outcomeIds.has(o.id)) err(`duplicate outcome ${o.id}`);
  outcomeIds.add(o.id);
  for (const k of ['id', 'title', 'narration', 'fates']) if (!o[k]) err(`outcome ${o.id ?? '?'}: missing ${k}`);
  checkCond(o.requires, `outcome ${o.id}`);
  // The ending screen shows bible.endText once; narrations must not repeat it.
  if (/end of the prologue/i.test(o.narration ?? '')) err(`outcome ${o.id}: narration says "End of the prologue" (the ending screen shows endText once)`);
  for (const fate of o.fates ?? []) {
    if (!fate.who || !fate.text) err(`outcome ${o.id}: fate needs who and text`);
    // who is shown to the player: an NPC id, a demon id, or a display name (capitalised, e.g. "Sump Row"), never a raw id.
    if (fate.who && !NPC_IDS.has(fate.who) && !demonIds.has(fate.who) && !/^[A-Z]/.test(fate.who)) err(`outcome ${o.id}: fate who "${fate.who}" is neither an NPC/demon id nor a display name`);
    checkCond(fate.requires, `outcome ${o.id} fate ${fate.who}`);
  }
}
for (const line of [].concat(bible.coda ?? [])) if (/end of the prologue/i.test(line)) err('bible.coda says "End of the prologue" (the ending screen shows endText once)');
if (bible.endText != null && typeof bible.endText !== 'string') err('bible.endText must be a string');
for (const f of bible.facts ?? []) for (const id of [].concat(f.supersedes ?? [])) if (!factIds.has(id) || id === f.id) err(`fact ${f.id}: supersedes unknown fact ${id}`);
const tooLateIds = new Set();
for (const t of bible.finale?.tooLate ?? []) {
  const w = `finale.tooLate ${t.id ?? '?'}`;
  for (const k of ['id', 'asks', 'text', 'when']) if (!t[k]) err(`${w}: missing ${k}`);
  if (tooLateIds.has(t.id)) err(`${w}: duplicate id`);
  tooLateIds.add(t.id);
  if (!Array.isArray(t.keywords) || !t.keywords.length) err(`${w}: needs keywords (for the mock director)`);
  checkCond(t.when, w);
}
// Objectives (the Journal's "Unfinished" list) are checked after scenes and maps load; see below.
const n = (bible.outcomes ?? []).length;
if (n < 4 || n > 6) err(`bible.outcomes: ${n} outcomes (want 4-6)`);
if (!(bible.outcomes ?? []).some((o) => !o.requires || Object.keys(o.requires).length === 0)) err('no fallback outcome with empty requires (the finale needs one always-possible outcome)');
if (bible.finale?.fallback && !outcomeIds.has(bible.finale.fallback)) err(`bible.finale.fallback ${bible.finale.fallback} is not an outcome`);
if (bible.finale?.scene && !scenes[bible.finale.scene]) err(`bible.finale.scene ${bible.finale.scene} does not exist`);
for (const r of bible.reflections ?? []) checkCond(r.requires, 'reflection');

// ---------------------------------------------------------------- NPC cards
const PORTRAIT = /^(npc_\d+|shopkeeper)$/;
for (const [id, c] of Object.entries(npcCards)) {
  if (!c) continue;
  const w = `npc card ${id}`;
  if (c.id !== id) err(`${w}: id "${c.id}" does not match its file name`);
  for (const k of ['name', 'role', 'faction', 'personality', 'speechStyle', 'goal', 'secret', 'wantsToAsk', 'attitudes', 'portrait']) if (!c[k]) err(`${w}: missing ${k}`);
  for (const k of ['lies', 'knows', 'likes', 'dislikes', 'hates', 'flags', 'meters']) if (!Array.isArray(c[k])) err(`${w}: ${k} must be an array`);
  if (c.faction !== 'none' && !FACTIONS.has(c.faction)) err(`${w}: unknown faction ${c.faction}`);
  if (c.adult !== true) err(`${w}: story NPCs must be adults (adult: true)`);
  if (c.portrait && (!PORTRAIT.test(c.portrait) || (tileNames.size && !tileNames.has(c.portrait)))) err(`${w}: portrait "${c.portrait}" should be an npc_N or shopkeeper tile in tiles.json`);
  for (const f of c.knows ?? []) if (!FACTS.has(f)) err(`${w}: knows unknown fact ${f}`);
  for (const f of c.flags ?? []) { if (!FLAGS.has(f)) err(`${w}: flag ${f} not declared`); addSetter(f, w); }
  for (const m of c.meters ?? []) if (!METERS.has(m)) err(`${w}: meter ${m} not declared`);
  for (const l of c.lies ?? []) {
    liars += 1;
    for (const k of ['about', 'says', 'truth']) if (!l[k]) err(`${w}: lie missing ${k}`);
    if (l.truthFact && !FACTS.has(l.truthFact)) err(`${w}: lie truthFact ${l.truthFact} unknown`);
    const caught = `caught_${id}_${String(l.about).replace(/\W+/g, '_').toLowerCase()}`;
    if (!FLAGS.has(caught)) err(`${w}: lie "${l.about}" sets flag ${caught} when caught; declare it in bible.flags`);
    addSetter(caught, `${w} (caught lie)`);
  }
  for (const list of ['likes', 'dislikes']) for (const x of c[list] ?? []) if (!x.id || !x.text || typeof x.weight !== 'number') err(`${w}: ${list} entry needs id, text, weight`);
}
if (!liars) err('no NPC lies about anything (the story needs at least one lie)');

// ---------------------------------------------------------------- scenes
const sceneRefs = new Map(); // scene id -> [where referenced]
const refScene = (id, where) => {
  if (!scenes[id]) { err(`${where}: scene "${id}" does not exist`); return; }
  if (!sceneRefs.has(id)) sceneRefs.set(id, []);
  sceneRefs.get(id).push(where);
};
for (const s of Object.values(scenes)) {
  const w = `scene ${s.id}`;
  if (!Array.isArray(s.lines) || !s.lines.length) { err(`${w}: needs lines`); continue; }
  const always = s.lines.filter((l) => !l.requires).length;
  if (always < 1) err(`${w}: every line is conditional; at least one must always show`);
  if (s.lines.length > 8) warn(`${w}: ${s.lines.length} lines (aim for 2-7 visible)`);
  if (always > 7) warn(`${w}: ${always} unconditional lines (aim for 2-7)`);
  for (const [i, l] of s.lines.entries()) {
    if (typeof l.speaker !== 'string') err(`${w} line ${i}: speaker must be a string ("" for narration)`);
    if (!l.text) err(`${w} line ${i}: empty text`);
    checkCond(l.requires, `${w} line ${i}`);
  }
  if (s.next) refScene(s.next, `${w} next`);
  const choices = s.choices ?? [];
  if (choices.length && choices.every((c) => c.requires)) err(`${w}: every choice is conditional; one must always be available`);
  for (const [i, c] of choices.entries()) {
    const cw = `${w} choice ${i}`;
    if (!c.text) err(`${cw}: needs text`);
    checkCond(c.requires, cw);
    for (const [f, v] of Object.entries(c.set ?? {})) {
      if (!FLAGS.has(f)) err(`${cw}: sets undeclared flag ${f}`);
      if (typeof v !== 'boolean') err(`${cw}: flag ${f} must be set to true/false`);
      addSetter(f, cw);
    }
    for (const [m, d] of Object.entries(c.meters ?? {})) {
      if (!METERS.has(m)) err(`${cw}: changes undeclared meter ${m}`);
      if (!Number.isInteger(d)) err(`${cw}: meter ${m} delta must be an integer`);
    }
    for (const k of ['give', 'take']) if (c[k] && !itemIds.has(c[k])) err(`${cw}: ${k} unknown item ${c[k]}`);
    for (const f of c.learn ?? []) if (!FACTS.has(f)) err(`${cw}: learn unknown fact ${f}`);
    if (c.next) refScene(c.next, `${cw} next`);
    // Playtest 1: a choice that just closes the box feels like nothing happened. Every choice leads to a reaction.
    else err(`${cw} ("${c.text}"): needs next, a scene with the other speaker's one-line reaction`);
  }
}
for (const id of ['intro', 'finale_intro']) if (!scenes[id]) err(`missing required scene ${id}`);

// ---------------------------------------------------------------- maps
const LEGEND = new Set(['#', '.', '~', ',', '=', '"', 'T', 'H', 'D', ':']);
const WALK = new Set(['.', ',', '=', '"', 'D']);
const TYPES = new Set(['npc', 'chest', 'spring', 'shop', 'save', 'sign', 'door', 'switch', 'stairs', 'trigger', 'boss', 'demon']);
// Bump-to-use entities block their tile; stairs and triggers are walked onto.
const BLOCKING = new Set(['npc', 'chest', 'door', 'switch', 'sign', 'spring', 'shop', 'save', 'boss', 'demon']);
const keyLocations = new Map(); // item id -> [{map, entity}]
const sceneGives = new Set();
for (const s of Object.values(scenes)) for (const c of s.choices ?? []) if (c.give) sceneGives.add(c.give);
for (const [mid, m] of Object.entries(maps)) for (const e of m?.entities ?? []) if (e.type === 'chest' && e.contents?.item) {
  if (!keyLocations.has(e.contents.item)) keyLocations.set(e.contents.item, []);
  keyLocations.get(e.contents.item).push({ map: mid, e });
}
for (const [mid, m] of Object.entries(maps)) for (const e of m?.entities ?? []) {
  if (e.type === 'switch' && e.flag) addSetter(e.flag, `${mid} switch ${e.id}`);
  for (const k of ['flag', 'winFlag', 'talkFlag', 'leftFlag']) if ((e.type === 'boss' || e.type === 'demon') && e[k]) addSetter(e[k], `${mid} ${e.type} ${e.id}`);
}

// Demons with a scripted place in the story (placed `demon` entities, the boss, shop keepers): never random mobs.
const FIXED_DEMONS = new Map();
for (const [mid, m] of Object.entries(maps)) for (const e of m?.entities ?? []) {
  if ((e.type === 'demon' || e.type === 'boss') && e.demon) FIXED_DEMONS.set(e.demon, `${mid} ${e.id}`);
  if (e.type === 'shop' && e.keeper) FIXED_DEMONS.set(e.keeper, `${mid} ${e.id}`);
}
FIXED_DEMONS.set('tanuki', FIXED_DEMONS.get('tanuki') ?? "Bel's kettle");

const required = ['ward', 'tunnels1', 'tunnels2', 'tunnels3', 'source'];
for (const id of required) if (!maps[id]) err(`missing map ${id}`);

function mapChecks(mid, m) {
  const w = `map ${mid}`;
  if (!m) return;
  if (m.id !== mid) err(`${w}: id "${m.id}" does not match its file name`);
  for (const k of ['name', 'tileset', 'width', 'height', 'tiles', 'entities', 'start']) if (m[k] == null) err(`${w}: missing ${k}`);
  if (!['town', 'dungeon'].includes(m.tileset)) err(`${w}: tileset must be town or dungeon`);
  if (!Array.isArray(m.tiles) || m.tiles.length !== m.height) { err(`${w}: tiles has ${m.tiles?.length} rows, height is ${m.height}`); return; }
  m.tiles.forEach((row, y) => {
    if (row.length !== m.width) err(`${w} row ${y}: length ${row.length}, width is ${m.width}`);
    for (const ch of row) if (!LEGEND.has(ch)) err(`${w} row ${y}: unknown tile "${ch}"`);
  });
  for (let x = 0; x < m.width; x++) for (const y of [0, m.height - 1]) if (m.tiles[y][x] !== '#') err(`${w}: edge tile (${x},${y}) is "${m.tiles[y][x]}", want "#"`);
  for (let y = 0; y < m.height; y++) for (const x of [0, m.width - 1]) if (m.tiles[y][x] !== '#') err(`${w}: edge tile (${x},${y}) is "${m.tiles[y][x]}", want "#"`);
  const tile = (x, y) => (y >= 0 && y < m.height && x >= 0 && x < m.width ? m.tiles[y][x] : '#');
  if (!WALK.has(tile(m.start.x, m.start.y))) err(`${w}: start (${m.start.x},${m.start.y}) is not walkable`);

  // encounters
  if (mid === 'ward' && m.encounters !== null) err(`${w}: the ward must have encounters: null`);
  if (m.encounters) {
    const r = m.encounters.rate;
    if (!Array.isArray(r) || r.length !== 2 || r[0] > r[1]) err(`${w}: encounters.rate must be [min,max]`);
    const distinct = new Set();
    const rows = new Map(); // demon id -> number of rows it appears in
    for (const row of m.encounters.table ?? []) {
      for (const id of new Set(row.ids ?? [])) {
        if (!demonIds.has(id)) err(`${w}: encounter demon "${id}" does not exist`);
        if (FIXED_DEMONS.has(id)) err(`${w}: "${id}" is a placed story demon or merchant (${FIXED_DEMONS.get(id)}); keep it out of random encounters`);
        distinct.add(id);
        rows.set(id, (rows.get(id) ?? 0) + 1);
      }
      if (!(row.weight > 0)) err(`${w}: encounter row needs a positive weight`);
      if (!Array.isArray(row.level) || row.level[0] > row.level[1]) err(`${w}: encounter row level must be [min,max]`);
    }
    for (const [id, k] of rows) if (k > 2) err(`${w}: "${id}" is in ${k} encounter rows (at most 2, so floors stay varied)`);
    if (distinct.size < 6 || distinct.size > 9) warn(`${w}: ${distinct.size} different demons in the encounter table (aim for 6-9)`);
    if (mid.startsWith('tunnels') && Array.isArray(r) && r[0] < 18) warn(`${w}: encounters.rate starts at ${r[0]} steps (playtest 1: keep it about one fight per 20-35 steps)`);
  } else if (mid.startsWith('tunnels')) err(`${w}: tunnel floors need an encounter table`);

  // entities
  const ids = new Set();
  const byTile = new Map();
  for (const e of m.entities) {
    const ew = `${w} entity ${e.id ?? '?'}`;
    if (!e.id) err(`${ew}: missing id`);
    if (ids.has(e.id)) err(`${ew}: duplicate id`);
    ids.add(e.id);
    if (!TYPES.has(e.type)) err(`${ew}: unknown type ${e.type}`);
    if (!Number.isInteger(e.x) || !Number.isInteger(e.y)) { err(`${ew}: needs integer x,y`); continue; }
    if (!WALK.has(tile(e.x, e.y))) err(`${ew}: (${e.x},${e.y}) is on "${tile(e.x, e.y)}", not a walkable tile`);
    const key = `${e.x},${e.y}`;
    if (!byTile.has(key)) byTile.set(key, []);
    byTile.get(key).push(e);
    checkCond(e.showIf, `${ew} showIf`);
    checkCond(e.hideIf, `${ew} hideIf`);
    checkCond(e.requires, `${ew} requires`);
    if (e.requires && e.type !== 'trigger') warn(`${ew}: "requires" on a ${e.type}; use showIf for visibility`);
    switch (e.type) {
      case 'npc':
        if (!NPC_IDS.has(e.npcId)) err(`${ew}: unknown npcId ${e.npcId}`);
        if (e.scene) refScene(e.scene, ew);
        for (const s of e.scenes ?? []) { refScene(s.scene, ew); checkCond(s.requires, `${ew} scenes`); }
        break;
      case 'chest':
        if (!e.contents || (e.contents.item == null && e.contents.gold == null)) err(`${ew}: contents needs item or gold`);
        if (e.contents?.item && !itemIds.has(e.contents.item)) err(`${ew}: unknown item ${e.contents.item}`);
        if (e.contents?.gold != null && !(e.contents.gold > 0)) err(`${ew}: gold must be positive`);
        break;
      case 'sign':
        if (!e.text) err(`${ew}: sign needs text`);
        break;
      case 'door':
        if (!e.key && !e.flag) err(`${ew}: door needs key or flag`);
        if (e.key && !itemIds.has(e.key)) err(`${ew}: unknown key item ${e.key}`);
        if (e.key && !keyLocations.has(e.key) && !sceneGives.has(e.key)) err(`${ew}: key ${e.key} is never found or given`);
        if (e.flag) { if (!FLAGS.has(e.flag)) err(`${ew}: flag ${e.flag} undeclared`); flagReaders.add(e.flag); }
        break;
      case 'switch':
        if (!e.flag) err(`${ew}: switch needs a flag`);
        else if (!FLAGS.has(e.flag)) err(`${ew}: flag ${e.flag} undeclared`);
        for (const [x, y] of e.drain ?? []) if (tile(x, y) !== '~') err(`${ew}: drain tile (${x},${y}) is "${tile(x, y)}", not "~"`);
        break;
      case 'stairs': {
        const to = maps[e.to];
        if (!to) { err(`${ew}: stairs to unknown map ${e.to}`); break; }
        const tx = e.toX, ty = e.toY;
        if (!Number.isInteger(tx) || !Number.isInteger(ty)) { err(`${ew}: stairs need toX,toY`); break; }
        const tt = to.tiles?.[ty]?.[tx];
        if (!WALK.has(tt)) err(`${ew}: arrival (${tx},${ty}) on ${e.to} is "${tt}", not walkable`);
        const onArrival = (to.entities ?? []).find((x) => x.x === tx && x.y === ty && BLOCKING.has(x.type));
        if (onArrival) err(`${ew}: arrival (${tx},${ty}) on ${e.to} is occupied by ${onArrival.id}`);
        if (!(to.entities ?? []).some((x) => x.type === 'stairs' && x.to === mid)) err(`${ew}: ${e.to} has no stairs back to ${mid}`);
        break;
      }
      case 'trigger':
        refScene(e.scene, ew);
        break;
      case 'boss':
      case 'demon':
        if (!demonIds.has(e.demon)) err(`${ew}: unknown demon ${e.demon}`);
        if (!Number.isInteger(e.level)) err(`${ew}: needs a level`);
        if (e.scene) refScene(e.scene, ew);
        if (e.after) refScene(e.after, ew);
        for (const k of ['flag', 'winFlag', 'talkFlag', 'leftFlag']) if (e[k] && !FLAGS.has(e[k])) err(`${ew}: ${k} ${e[k]} undeclared`);
        if (e.type === 'boss' && mid !== 'source') err(`${ew}: bosses belong on the source map`);
        if (e.talkMood != null && !Array.isArray(e.talkMood)) err(`${ew}: talkMood must be an array`);
        for (const [i, t] of (e.talkMood ?? []).entries()) {
          checkCond(t.requires, `${ew} talkMood ${i}`);
          if (!t.requires) err(`${ew} talkMood ${i}: needs requires`);
          if (!Number.isInteger(t.mood) || Math.abs(t.mood) > 3) err(`${ew} talkMood ${i}: mood must be an integer from -3 to 3`);
          if (!t.note) err(`${ew} talkMood ${i}: needs a note for the talk context`);
        }
        break;
      case 'shop':
        if (e.keeper && !demonIds.has(e.keeper)) err(`${ew}: unknown keeper demon ${e.keeper}`);
        if (e.scene) refScene(e.scene, ew);
        if (e.stock != null && (!Array.isArray(e.stock) || !e.stock.length)) err(`${ew}: stock must be a non-empty list of item ids`);
        for (const id of e.stock ?? []) if (!itemIds.has(id)) err(`${ew}: stock has unknown item ${id}`);
        if (e.priceMult != null && !(e.priceMult > 0)) err(`${ew}: priceMult must be a positive number`);
        if (mid !== 'ward' && !(e.name && e.keeper && e.scene)) err(`${ew}: a shop below ground needs a name, a keeper and a scene (its personality)`);
        if (e.sprite && tileNames.size && !tileNames.has(e.sprite)) err(`${ew}: sprite ${e.sprite} is not in tiles.json`);
        break;
      default:
    }
  }
  for (const [key, list] of byTile) if (list.length > 1 && list.filter((e) => !e.showIf && !e.hideIf).length > 0) {
    err(`${w}: several entities on (${key}) and not all are conditional: ${list.map((e) => e.id).join(', ')}`);
  }
  if (mid === 'ward' && !m.entities.some((e) => e.type === 'shop')) err(`${w}: the ward needs a shop`);
  if (mid === 'source' && m.entities.some((e) => e.type === 'shop')) err(`${w}: no shop at the source`);
  if (mid === 'source' && !m.entities.some((e) => e.type === 'boss')) err(`${w}: the source needs the boss`);

  // Reachability: progressive BFS from start. Blocking entities are walls; you can use one if you can stand next to
  // it. Doors open once their key has been picked up (a chest reached on this map, or a key found/given elsewhere) or
  // their flag can be set (a switch reached on this map, or any scene, NPC or boss elsewhere). Switches drain their
  // tiles once reached. Fixed demons and the boss stay solid (the boss ends the chapter from its tile).
  const drained = new Set();
  const opened = new Set();
  const used = new Set();
  const flagsHere = new Set();
  const itemsHere = new Set();
  const solidAt = (x, y) => (byTile.get(`${x},${y}`) ?? []).find((e) => BLOCKING.has(e.type) && !(e.type === 'door' && opened.has(e.id)));
  const walk = (x, y) => (tile(x, y) === '~' ? drained.has(`${x},${y}`) : WALK.has(tile(x, y)));
  const flagElsewhere = (f) => (flagSetters.get(f) ?? []).some((where) => !where.startsWith(`${mid} switch`));
  const keyElsewhere = (k) => sceneGives.has(k) || (keyLocations.get(k) ?? []).some((l) => l.map !== mid);
  let seen;
  for (let pass = 0; pass < 50; pass++) {
    seen = new Set([`${m.start.x},${m.start.y}`]);
    const q = [[m.start.x, m.start.y]];
    const touch = (e) => {
      if (used.has(e.id)) return false;
      used.add(e.id);
      if (e.type === 'chest' && e.contents?.item) itemsHere.add(e.contents.item);
      if (e.type === 'switch') { if (e.flag) flagsHere.add(e.flag); for (const [x, y] of e.drain ?? []) drained.add(`${x},${y}`); }
      return true;
    };
    let changed = false;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (seen.has(k)) continue;
        const solid = solidAt(nx, ny);
        if (solid) { if (touch(solid)) changed = true; continue; }
        if (!walk(nx, ny)) continue;
        seen.add(k);
        q.push([nx, ny]);
      }
    }
    for (const e of m.entities) if (e.type === 'door' && !opened.has(e.id)) {
      const adj = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${e.x + dx},${e.y + dy}`));
      const can = (e.key && (itemsHere.has(e.key) || keyElsewhere(e.key))) || (e.flag && (flagsHere.has(e.flag) || flagElsewhere(e.flag)));
      if (can && (adj || (e.flag && !e.key))) { opened.add(e.id); changed = true; }
    }
    if (!changed) break;
  }
  const reachable = (e) => (BLOCKING.has(e.type) && !(e.type === 'door' && opened.has(e.id))
    ? used.has(e.id) || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${e.x + dx},${e.y + dy}`))
    : seen.has(`${e.x},${e.y}`));
  for (const e of m.entities) {
    if (reachable(e)) continue;
    if (e.type === 'stairs' || e.type === 'boss') err(`${w}: ${e.type} ${e.id} at (${e.x},${e.y}) can't be reached from start`);
    else if (e.type === 'door') warn(`${w}: door ${e.id} at (${e.x},${e.y}) never opens`);
    else warn(`${w}: ${e.type} ${e.id} at (${e.x},${e.y}) can't be reached`);
  }
  // Door keys must not be locked behind their own door on this map.
  for (const e of m.entities) if (e.type === 'door' && e.key && !opened.has(e.id) && (keyLocations.get(e.key) ?? []).some((l) => l.map === mid)) {
    err(`${w}: door ${e.id} needs ${e.key}, but the key on this map can't be reached first`);
  }
  return { walkable: seen.size };
}

const stats = {};
for (const [mid, m] of Object.entries(maps)) stats[mid] = mapChecks(mid, m);

// ---------------------------------------------------------------- objectives (the Journal's "Unfinished" list)
const objIds = new Set();
for (const o of bible.objectives ?? []) {
  const w = `objective ${o.id ?? '?'}`;
  if (!o.id || !o.text) err(`${w}: needs id and text`);
  if (objIds.has(o.id)) err(`${w}: duplicate id`);
  objIds.add(o.id);
  if (!o.doneIf || !Object.keys(o.doneIf).length) err(`${w}: needs doneIf (or it never goes away)`);
  checkCond(o.showIf, `${w} showIf`);
  checkCond(o.doneIf, `${w} doneIf`);
  if (o.where && !maps[o.where]) err(`${w}: where "${o.where}" is not a map`);
  if (/[a-z]+_[a-z_]+/.test(o.text ?? '')) warn(`${w}: text looks like it contains a raw id`);
  // A loose end must be tie-up-able: something sets every flag its doneIf wants true.
  for (const [f, v] of Object.entries(o.doneIf?.flags ?? {})) if (v && !flagSetters.has(f)) err(`${w}: doneIf flag ${f} is never set`);
}
if (!Array.isArray(bible.objectives)) warn('bible.objectives missing (the Journal has no Unfinished list)');

// A scene played by several triggers must be guarded by a flag it sets (otherwise it repeats; playtest 1 bug 7).
const sceneSets = (id, seen = new Set()) => {
  if (seen.has(id) || !scenes[id]) return new Set();
  seen.add(id);
  const out = new Set();
  for (const c of scenes[id].choices ?? []) {
    for (const [f, v] of Object.entries(c.set ?? {})) if (v) out.add(f);
    if (c.next) for (const f of sceneSets(c.next, seen)) out.add(f);
  }
  if (scenes[id].next) for (const f of sceneSets(scenes[id].next, seen)) out.add(f);
  return out;
};
const triggersByScene = new Map();
for (const [mid, m] of Object.entries(maps)) for (const e of m?.entities ?? []) if (e.type === 'trigger' && e.scene) {
  if (!triggersByScene.has(e.scene)) triggersByScene.set(e.scene, []);
  triggersByScene.get(e.scene).push({ mid, e });
}
for (const [sid, list] of triggersByScene) if (list.length > 1) {
  const sets = sceneSets(sid);
  for (const { mid, e } of list) {
    const guarded = Object.entries(e.requires?.flags ?? {}).some(([f, v]) => v === false && sets.has(f));
    if (!guarded) err(`${mid} trigger ${e.id}: scene ${sid} is played by ${list.length} triggers; require a flag false that the scene sets, or it repeats`);
  }
}

// ---------------------------------------------------------------- cross-checks
for (const f of FLAGS) {
  if (!flagSetters.has(f) && !ENGINE_FLAG.test(f)) err(`flag ${f} is declared but nothing ever sets it`);
  if (!flagReaders.has(f)) warn(`flag ${f} is set but never read by a condition (record only)`);
}
for (const [mid, m] of Object.entries(maps)) if (m?.onEnter) refScene(m.onEnter, `map ${mid} onEnter`);
for (const id of Object.keys(scenes)) if (!sceneRefs.has(id) && !['intro', bible.finale?.scene].includes(id)) warn(`scene ${id} is never referenced`);
for (const [id] of Object.entries(npcCards)) {
  const placed = Object.values(maps).some((m) => (m?.entities ?? []).some((e) => e.type === 'npc' && e.npcId === id));
  if (!placed) err(`NPC ${id} is not placed on any map`);
}

// ---------------------------------------------------------------- report
const summary = Object.entries(maps).map(([id, m]) => `${id} ${m?.width}x${m?.height} (${stats[id]?.walkable ?? 0} tiles reachable, ${m?.entities?.length ?? 0} entities)`);
console.log(`Story check: ${Object.keys(scenes).length} scenes, ${NPC_IDS.size} NPCs, ${(bible.outcomes ?? []).length} outcomes, ${FLAGS.size} flags, ${METERS.size} meters, ${FACTS.size} facts.`);
console.log(`Maps: ${summary.join('; ')}`);
for (const m of warnings) console.log(`  warning: ${m}`);
for (const m of errors) console.log(`  ERROR: ${m}`);
console.log(errors.length ? `${errors.length} error(s).` : 'OK, no errors.');
process.exit(errors.length ? 1 : 0);
