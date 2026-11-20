// Hub services (pure): equipment and item shops, healer, inn. Prices in gold.
import { WEAPONS, ARMORS } from '../data/equipment.js';
import { ITEMS } from '../data/items.js';
import { heroDerived, recruitMax } from '../combat/units.js';

export const SELL_RATE = 0.5;

export function stock(kind, deepest) {
  const table = kind === 'weapons' ? WEAPONS : kind === 'armor' ? ARMORS : ITEMS;
  return Object.entries(table).filter(([, it]) => it.price > 0 && (it.unlock ?? 0) <= deepest).map(([id]) => id);
}

/** Buy a weapon or armor; the old one is traded in for half its price. */
export function buyGear(game, kind, id) {
  const table = kind === 'weapons' ? WEAPONS : ARMORS;
  const slot = kind === 'weapons' ? 'weapon' : 'armor';
  const it = table[id];
  if (!it) return { ok: false, msg: 'Unknown item.' };
  if (game.hero.equip[slot] === id) return { ok: false, msg: 'Already equipped.' };
  const tradeIn = Math.floor((table[game.hero.equip[slot]]?.price || 0) * SELL_RATE);
  const cost = it.price - tradeIn;
  if (game.money < cost) return { ok: false, msg: `You need ${cost} gold.` };
  const before = heroDerived(game.hero);
  game.money -= cost;
  game.hero.equip[slot] = id;
  const after = heroDerived(game.hero);
  game.hero.hp = Math.min(after.maxHp, game.hero.hp + Math.max(0, after.maxHp - before.maxHp));
  return { ok: true, msg: `Equipped the ${it.name}${tradeIn ? ` (trade-in ${tradeIn} gold)` : ''}.`, cost };
}

export const gearCost = (game, kind, id) => {
  const table = kind === 'weapons' ? WEAPONS : ARMORS;
  const slot = kind === 'weapons' ? 'weapon' : 'armor';
  return table[id].price - Math.floor((table[game.hero.equip[slot]]?.price || 0) * SELL_RATE);
};

export function buyItem(game, id, n = 1) {
  const it = ITEMS[id];
  const cost = it.price * n;
  if (game.money < cost) return { ok: false, msg: `You need ${cost} gold.` };
  game.money -= cost;
  game.inv[id] = (game.inv[id] || 0) + n;
  return { ok: true, msg: `Bought ${n} × ${it.name}.` };
}

export function sellItem(game, id, n = 1) {
  const it = ITEMS[id];
  if (!it || it.use === 'key' || (game.inv[id] || 0) < n) return { ok: false, msg: "You can't sell that." };
  const gain = Math.floor(it.price * SELL_RATE) * n;
  game.inv[id] -= n;
  if (game.inv[id] <= 0) delete game.inv[id];
  game.money += gain;
  return { ok: true, msg: `Sold for ${gain} gold.` };
}

const members = (game) => [game.hero, ...game.party, ...game.stock];
const maxOf = (game, m) => (m === game.hero ? heroDerived(game.hero) : recruitMax(m));

// Healer: 1 gold per HP, 2 per MP, and a revive fee per fallen member (by level).
export function healerQuote(game) {
  let hp = 0; let mp = 0; let revives = 0; let reviveCost = 0;
  for (const m of members(game)) {
    const mx = maxOf(game, m);
    if (m.hp <= 0) { revives++; reviveCost += 20 + m.level * 10; hp += mx.maxHp; } else hp += mx.maxHp - m.hp;
    mp += mx.maxMp - m.mp;
  }
  return { hp, mp, revives, cost: hp + mp * 2 + reviveCost };
}

export function restoreAll(game) {
  for (const m of members(game)) {
    const mx = maxOf(game, m);
    m.hp = mx.maxHp;
    m.mp = mx.maxMp;
  }
}

export function heal(game) {
  const q = healerQuote(game);
  if (!q.cost) return { ok: false, msg: 'Everyone is already in full health.' };
  if (game.money < q.cost) return { ok: false, msg: `You need ${q.cost} gold.` };
  game.money -= q.cost;
  restoreAll(game);
  return { ok: true, msg: `Your party is restored (${q.cost} gold).` };
}

export const innCost = (game) => 10 + game.hero.level * 4;

export function rest(game) {
  const c = innCost(game);
  if (game.money < c) return { ok: false, msg: `A room costs ${c} gold.` };
  game.money -= c;
  restoreAll(game);
  return { ok: true, msg: `You rest (${c} gold). Everyone is fully restored.` };
}
