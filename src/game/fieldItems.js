// Using consumables outside battle (pure).
import { DEMONS } from '../data/index.js';
import { BATTLE } from '../data/battleData.js';
import { ITEM_EFFECTS } from '../combat/items.js';
import { makeCombatant } from '../combat/battle.js';
import { takeItem } from './player.js';

// A demon's current/max HP and MP (null hp = full).
export function demonVitals(d) {
  // Same maxima as in battle (including Life/Mana Bonus passives).
  const u = makeCombatant({ key: d.uid, name: d.id, side: 'player', level: d.level, def: { ...BATTLE[d.id], skills: d.skills } });
  return { maxHp: u.maxHp, maxMp: u.maxMp, hp: d.hp ?? u.maxHp, mp: d.mp ?? u.maxMp };
}

export function useItemOn(player, itemId, target) {
  const e = ITEM_EFFECTS[itemId];
  if (!e || !(player.items[itemId] > 0)) return { ok: false, reason: "You don't have that." };
  if (target === 'you') {
    if (e.hp && player.hp >= player.maxHp && !e.mp) return { ok: false, reason: 'Already at full HP.' };
    takeItem(player, itemId);
    if (e.hp) player.hp = Math.min(player.maxHp, player.hp + e.hp);
    if (e.mp) player.mp = Math.min(player.maxMp, player.mp + e.mp);
    return { ok: true };
  }
  const d = player.stock.find((x) => x.uid === target);
  if (!d) return { ok: false, reason: 'No such demon.' };
  const v = demonVitals(d);
  if (v.hp <= 0) return { ok: false, reason: `${DEMONS[d.id].name} has fallen. Only a spring or a revive skill helps.` };
  takeItem(player, itemId);
  if (e.hp) d.hp = Math.min(v.maxHp, v.hp + e.hp);
  if (e.mp) d.mp = Math.min(v.maxMp, v.mp + e.mp);
  if (d.hp >= v.maxHp) d.hp = null;
  if (d.mp != null && d.mp >= v.maxMp) d.mp = null;
  return { ok: true };
}

