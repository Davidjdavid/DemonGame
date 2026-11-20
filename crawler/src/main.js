// Entry: read URL flags, make a game, run exploration, start random encounters and battles.
import { getFloor } from './data/floors/index.js';
import { newGame, serializeGame, loadGame } from './game/state.js';
import { startExplore } from './ui/explore.js';
import { fight } from './ui/encounter.js';
import { stepEncounter, rollGroup, resetAfterFight } from './world/encounters.js';
import { MONSTERS } from './data/monsters.js';
import { makeRng } from './core/rng.js';

const params = new URLSearchParams(location.search);
const flags = {
  floor: params.get('floor') || 'test',
  seed: Number(params.get('seed') || Date.now() % 100000),
  fast: params.has('fast'),
  test: params.has('test'),
  noenc: params.has('noenc'),
};

const app = document.getElementById('app');
const rng = makeRng(flags.seed);
const minLevel = Object.fromEntries(Object.entries(MONSTERS).map(([id, m]) => [id, m.level]));
let game = newGame({ floor: getFloor(flags.floor), seed: flags.seed, rng });
let lastSave = serializeGame(game);
let screen = null;

async function battle(group, opts = {}) {
  const outcome = await fight(app, game, { group, rng, fast: flags.fast, first: rng() < 0.1 ? 'enemy' : 'player', ...opts });
  const spec = screen.floor().src.encounters;
  resetAfterFight(game.enc, spec, rng);
  if (outcome === 'lose') setTimeout(retry, 0);
  return outcome;
}

async function onStep() {
  if (flags.noenc) return;
  const spec = screen.floor().src.encounters;
  if (!stepEncounter(game.enc, spec, rng)) return;
  await battle(rollGroup(spec, rng, game.enc, minLevel));
}

function retry() {
  game = loadGame(lastSave);
  start();
}

function start() {
  screen?.destroy();
  screen = startExplore(app, game, {
    getFloor,
    fast: flags.fast,
    hooks: {
      onStep,
      onFloor: () => { lastSave = serializeGame(game); },
    },
  });
  if (flags.test) window.__game = { game, screen, getFloor, battle, rng };
}

start();
