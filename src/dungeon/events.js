// What dungeon features do (pure). The explore state `run.ex` is the single source of truth for what's
// opened and whether the boss is beaten; `run.opened[floorId]` mirrors it for the renderer.
import { ITEMS } from '../data/index.js';
import { addItem } from '../game/player.js';

export const ESCAPE_CHANCE = 0.6;

export function openTreasure(run, floor, feature, player) {
  if (run.ex.opened.includes(feature.id)) return null;
  run.ex.opened.push(feature.id);
  (run.opened[floor.id] ||= []).push(feature.id);
  const c = feature.contents;
  if (c.item) { addItem(player, c.item); return `You found ${ITEMS[c.item].name}.`; }
  player.gold += c.gold;
  return `You found ${c.gold} gold.`;
}

export function useSpring(player) {
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  for (const d of player.stock) { d.hp = null; d.mp = null; }
  return 'A cold spring. You drink, and everyone is restored (fallen demons too).';
}

export function clearBoss(run) {
  run.bossDefeated = true;
  run.ex.bossDefeated = true;
  run.complete = true;
}

export function tryEscape(rng) {
  return rng() < ESCAPE_CHANCE;
}
