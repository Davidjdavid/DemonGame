// Using items outside battle. Pure.
import { ITEMS } from '../data/items.js';
import { heroDerived, recruitMax } from '../combat/units.js';

export const maxOf = (game, who) => (who === game.hero ? heroDerived(game.hero) : recruitMax(who));

export function partyMembers(game) {
  return [game.hero, ...game.party];
}

export function memberName(game, who) {
  return who === game.hero ? game.hero.name : who.name || who.type;
}

// Use a field item on `who` (a hero/recruit object) or the whole party. Returns { ok, msg }.
export function useFieldItem(game, id, who = null) {
  const it = ITEMS[id];
  if (!it || !(game.inv[id] > 0) || !['field', 'both'].includes(it.use)) return { ok: false, msg: "You can't use that here." };
  const e = it.effect;
  const targets = it.target === 'allies' ? partyMembers(game) : who ? [who] : [];
  if (e.ward) { game.enc.ward = e.ward; return spend(game, id, 'The incense keeps enemies away for a while.'); }
  if (e.exit) return { ok: true, exit: true, msg: 'Use the charm to return to the hub.' };
  if (!targets.length) return { ok: false, msg: 'Choose who to use it on.' };
  let did = false;
  for (const t of targets) {
    const mx = maxOf(game, t);
    if (e.revive && t.hp <= 0) { t.hp = Math.max(1, Math.round((mx.maxHp * e.revive) / 100)); did = true; }
    if (e.hp && t.hp > 0 && t.hp < mx.maxHp) { t.hp = Math.min(mx.maxHp, t.hp + e.hp); did = true; }
    if (e.mp && t.mp < mx.maxMp) { t.mp = Math.min(mx.maxMp, t.mp + e.mp); did = true; }
  }
  if (!did) return { ok: false, msg: 'It would have no effect.' };
  return spend(game, id, `Used ${it.name}.`);
}

function spend(game, id, msg) {
  game.inv[id] -= 1;
  if (game.inv[id] <= 0) delete game.inv[id];
  return { ok: true, msg };
}
