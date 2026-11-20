// Protagonist equipment. Weapons add attack (some carry an element for Attack, some teach a skill while equipped);
// armor adds defence and changes the
// hero's affinities. unlock = deepest floor reached before the hub shop stocks it. price in gold (trade-in: half).
export const WEAPONS = {
  shortsword: { name: 'Short Sword', atk: 6, price: 0, unlock: 0 },
  bronze_sword: { name: 'Bronze Sword', atk: 10, price: 160, unlock: 1 },
  iron_sword: { name: 'Iron Sword', atk: 15, skill: 'lunge', price: 480, unlock: 2 },
  flame_brand: { name: 'Flame Brand', atk: 17, element: 'fire', price: 850, unlock: 3 },
  steel_sword: { name: 'Steel Sword', atk: 22, skill: 'twin_slash', price: 1400, unlock: 4 },
  frost_edge: { name: 'Frost Edge', atk: 25, element: 'ice', skill: 'crush', price: 2100, unlock: 5 },
  knight_sword: { name: 'Knight Sword', atk: 31, skill: 'whirl', price: 3200, unlock: 6 },
};
export const ARMORS = {
  cloth: { name: "Traveller's Cloth", def: 2, aff: {}, price: 0, unlock: 0 },
  leather: { name: 'Leather Vest', def: 5, aff: {}, price: 140, unlock: 1 },
  chain: { name: 'Chain Mail', def: 9, aff: { elec: 'weak' }, price: 400, unlock: 2 },
  warded_coat: { name: 'Warded Coat', def: 9, aff: { fire: 'resist', ice: 'resist' }, price: 650, unlock: 3 },
  scale: { name: 'Scale Mail', def: 14, aff: { wind: 'weak' }, price: 1200, unlock: 4 },
  mystic_robe: { name: 'Mystic Robe', def: 13, aff: { light: 'resist', dark: 'resist', elec: 'resist' }, price: 1900, unlock: 5 },
  knight_plate: { name: 'Knight Plate', def: 20, aff: { phys: 'resist', elec: 'weak' }, price: 3100, unlock: 6 },
};
