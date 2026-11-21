// Protagonist equipment. Weapons add attack (some carry an element for Attack, some teach a skill while equipped);
// armor adds defence and changes the
// hero's affinities. unlock = deepest floor reached before the hub shop stocks it. price in gold (trade-in: half).
export const WEAPONS = {
  shortsword: { name: 'Short Sword', atk: 6, price: 0, unlock: 0 },
  bronze_sword: { name: 'Bronze Sword', atk: 10, skill: 'lunge', price: 120, unlock: 1 },
  iron_sword: { name: 'Iron Sword', atk: 15, skill: 'twin_slash', price: 360, unlock: 2 },
  flame_brand: { name: 'Flame Brand', atk: 17, element: 'fire', price: 480, unlock: 3 },
  steel_sword: { name: 'Steel Sword', atk: 22, skill: 'crush', price: 1000, unlock: 4 },
  frost_edge: { name: 'Frost Edge', atk: 25, element: 'ice', skill: 'rampage', price: 1500, unlock: 5 },
  knight_sword: { name: 'Knight Sword', atk: 31, skill: 'whirl', price: 2200, unlock: 6 },
};
export const ARMORS = {
  cloth: { name: "Traveller's Cloth", def: 2, aff: {}, price: 0, unlock: 0 },
  leather: { name: 'Leather Vest', def: 5, aff: {}, price: 100, unlock: 1 },
  chain: { name: 'Chain Mail', def: 9, aff: { elec: 'weak' }, price: 300, unlock: 2 },
  warded_coat: { name: 'Warded Coat', def: 9, aff: { fire: 'resist', ice: 'resist' }, price: 480, unlock: 3 },
  scale: { name: 'Scale Mail', def: 14, aff: { wind: 'weak' }, price: 850, unlock: 4 },
  mystic_robe: { name: 'Mystic Robe', def: 13, aff: { light: 'resist', dark: 'resist', elec: 'resist' }, price: 1300, unlock: 5 },
  knight_plate: { name: 'Knight Plate', def: 20, aff: { phys: 'resist', ice: 'weak' }, price: 2000, unlock: 6 },
};
