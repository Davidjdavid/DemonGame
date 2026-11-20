// Entry: read URL flags, make or load a game, start the exploration screen.
import { getFloor } from './data/floors/index.js';
import { newGame } from './game/state.js';
import { startExplore } from './ui/explore.js';

const params = new URLSearchParams(location.search);
const flags = {
  floor: params.get('floor') || 'test',
  seed: Number(params.get('seed') || Date.now() % 100000),
  fast: params.has('fast'),
  test: params.has('test'),
};

const app = document.getElementById('app');
const game = newGame({ floor: getFloor(flags.floor), seed: flags.seed });
const screen = startExplore(app, game, { getFloor, fast: flags.fast });

if (flags.test) window.__game = { game, screen, getFloor };
