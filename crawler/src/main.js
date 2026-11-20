// Entry: title screen, new game / continue, exploration, random encounters and battles, hub services, saves.
import { getFloor } from './data/floors/index.js';
import { newGame } from './game/state.js';
import { packSave, unpackSave } from './game/save.js';
import { writeSlot, readSlot } from './platform/storage.js';
import { startExplore } from './ui/explore.js';
import { fight } from './ui/encounter.js';
import { openService } from './ui/services.js';
import { showTitle } from './ui/title.js';
import { stepEncounter, rollGroup, resetAfterFight } from './world/encounters.js';
import { MONSTERS } from './data/monsters.js';
import { makeRng } from './core/rng.js';

const params = new URLSearchParams(location.search);
const flags = {
  floor: params.get('floor') || 'hub',
  seed: Number(params.get('seed') || Date.now() % 100000),
  fast: params.has('fast'),
  test: params.has('test'),
  noenc: params.has('noenc'),
  title: !params.has('test') || params.has('title'),
};

const app = document.getElementById('app');
const rng = makeRng(flags.seed);
const minLevel = Object.fromEntries(Object.entries(MONSTERS).map(([id, m]) => [id, m.level]));
let game = null;
let screen = null;
let lastSave = null; // newest saved data (fallback for retry when storage is unavailable)

function label(kind) {
  const f = getFloor(game.pos.floor);
  return `${kind} · ${f.name} · Lv ${game.hero.level}`;
}

async function save(kind, slot = 'main') {
  const data = packSave(game, getFloor);
  lastSave = { data, at: Date.now(), label: label(kind) };
  return writeSlot(slot, data, lastSave.label);
}

async function newestSave() {
  const [a, b] = await Promise.all([readSlot('main'), readSlot('auto')]);
  const list = [a, b, lastSave].filter(Boolean).sort((x, y) => y.at - x.at);
  return list[0] || null;
}

async function battle(group, opts = {}) {
  game.stats.battles++;
  const outcome = await fight(app, game, { group, rng, fast: flags.fast, first: rng() < 0.1 ? 'enemy' : 'player', ...opts });
  if (outcome === 'escaped') game.stats.fled++;
  resetAfterFight(game.enc, screen.floor().src.encounters, rng);
  if (outcome === 'lose') setTimeout(retry, 0);
  return outcome;
}

async function onStep() {
  if (flags.noenc) return;
  const spec = screen.floor().src.encounters;
  if (!stepEncounter(game.enc, spec, rng)) return;
  await battle(rollGroup(spec, rng, game.enc, minLevel));
}

async function retry() {
  const s = await newestSave();
  if (s) game = unpackSave(s.data, getFloor);
  else game = newGame({ floor: getFloor('hub'), seed: flags.seed, rng });
  start();
}

function start() {
  screen?.destroy();
  screen = startExplore(app, game, {
    getFloor,
    fast: flags.fast,
    hooks: {
      onStep,
      onFloor: (floor) => {
        game.deepest = Math.max(game.deepest, floor.depth || 0);
        save('Autosave', 'auto');
      },
      onService: (feature) => openService(app, game, feature, { save: (kind) => save(kind), onChange: () => screen.refresh() }),
      onSavePoint: async () => {
        const where = await save('Save point');
        screen.say(where ? `Saved at the save point (${where === 'cloud' ? 'your account' : 'this browser'}).` : 'Saving is not available here.');
      },
      onExitCharm: () => {
        if (screen.floor().id === 'hub') { screen.say("You're already in the hub."); return; }
        game.inv.exit_charm -= 1;
        if (game.inv.exit_charm <= 0) delete game.inv.exit_charm;
        screen.enterFloor('hub', 'start');
      },
    },
  });
  if (flags.test) window.__game = { game, screen, getFloor, battle, rng, save, retry };
}

function newStart() {
  game = newGame({ floor: getFloor(flags.floor), seed: flags.seed, rng });
  start();
}

async function boot() {
  if (!flags.title) { newStart(); return; }
  showTitle(app, { saves: [], onNew: newStart, onLoad: () => {} });
  const s = await newestSave();
  if (s && !game) {
    showTitle(app, {
      saves: [s],
      onNew: newStart,
      onLoad: (x) => { game = unpackSave(x.data, getFloor); start(); },
    });
  }
}

boot();
