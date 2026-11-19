// What consumable items do in battle (and in the field). Kept apart from items.json so data stays descriptive.
export const ITEM_EFFECTS = {
  salve: { hp: 50 },
  kappasalve: { hp: 80 },
  tonic: { mp: 30 },
  revival_bead: { revive: 0.5 },
};

export function usableItems(inventory) {
  return Object.keys(inventory || {}).filter((id) => ITEM_EFFECTS[id] && inventory[id] > 0);
}

export function applyItem(target, id) {
  const e = ITEM_EFFECTS[id];
  const out = {};
  if (e.revive) {
    if (target.hp > 0) return out;
    target.hp = Math.max(1, Math.round(target.maxHp * e.revive));
    out.revived = true;
    return out;
  }
  if (e.hp) { const before = target.hp; target.hp = Math.min(target.maxHp, target.hp + e.hp); out.heal = target.hp - before; }
  if (e.mp) { const before = target.mp; target.mp = Math.min(target.maxMp, target.mp + e.mp); out.mp = target.mp - before; }
  return out;
}
