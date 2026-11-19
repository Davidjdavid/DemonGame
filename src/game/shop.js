// Shop: buy items and armor, sell items at half price. Pure.
import armorList from '../data/armor.json' with { type: 'json' };
import { ITEMS } from '../data/index.js';
import { addItem, takeItem } from './player.js';

export const ARMOR = Object.fromEntries(armorList.map((a) => [a.id, a]));
export const SHOP_ITEMS = ['salve', 'tonic', 'revival_bead', 'cucumber', 'wine', 'honeycake', 'bronze', 'obol', 'sake', 'mead'];

export function armorTiers(player) {
  return { ...(ARMOR[player.armor]?.tiers ?? {}) };
}

export function buyItem(player, id, n = 1, mult = 1) {
  const item = ITEMS[id];
  if (!item) return { ok: false, reason: 'Unknown item.' };
  const cost = Math.round(item.value * mult) * n;
  if (player.gold < cost) return { ok: false, reason: `You need ${cost} gold.` };
  player.gold -= cost;
  addItem(player, id, n);
  return { ok: true, cost };
}

export function sellItem(player, id) {
  const item = ITEMS[id];
  if (item?.kind === 'key') return { ok: false, reason: 'You need that.' };
  if (!item || !takeItem(player, id)) return { ok: false, reason: "You don't have that." };
  const price = Math.floor(item.value / 2);
  player.gold += price;
  return { ok: true, price };
}

export function buyArmor(player, id) {
  const a = ARMOR[id];
  if (!a) return { ok: false, reason: 'Unknown armor.' };
  if (player.armorOwned?.includes(id)) {
    player.armor = id;
    return { ok: true, cost: 0, equipped: true };
  }
  if (player.gold < a.price) return { ok: false, reason: `You need ${a.price} gold.` };
  player.gold -= a.price;
  player.armorOwned = [...(player.armorOwned || []), id];
  player.armor = id;
  return { ok: true, cost: a.price, equipped: true };
}
