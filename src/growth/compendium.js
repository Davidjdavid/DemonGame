// Compendium: every demon you've owned, saved at its latest level and skills, re-summonable for gold.
import { newDemon, addDemon, owns, STOCK_MAX } from '../game/demons.js';

export function register(player, demon) {
  player.compendium[demon.id] = { level: demon.level, exp: demon.exp, skills: [...demon.skills] };
}

export function summonCost(entry) {
  return Math.round(entry.level * entry.level * 8 + 100);
}

// Returns { ok, reason?, demon? }.
export function resummon(player, id) {
  const entry = player.compendium[id];
  if (!entry) return { ok: false, reason: 'Not in your compendium yet.' };
  if (owns(player, id)) return { ok: false, reason: 'You already have this demon.' };
  if (player.stock.length >= STOCK_MAX) return { ok: false, reason: 'Your stock is full.' };
  if (entry.level > player.level) return { ok: false, reason: 'Too strong for you to command.' };
  const cost = summonCost(entry);
  if (player.gold < cost) return { ok: false, reason: `You need ${cost} gold.` };
  player.gold -= cost;
  const demon = addDemon(player, newDemon(id, { level: entry.level, exp: entry.exp, skills: entry.skills }));
  return { ok: true, demon, cost };
}
