// Items. use: 'battle' | 'field' | 'both' | 'key'. effect: { hp } flat heal, { hpPct }, { mp }, { revive: pct },
// { damage: power, element } (battle, one foe), { ward: steps }, { exit: true }. price = shop price (0 = not sold).
export const ITEMS = {
  medicine: { name: 'Medicine', use: 'both', target: 'ally', effect: { hp: 60 }, price: 40, unlock: 0, desc: 'Restores 60 HP.' },
  salve: { name: 'Salve', use: 'both', target: 'ally', effect: { hp: 160 }, price: 150, unlock: 3, desc: 'Restores 160 HP.' },
  balm: { name: 'Balm', use: 'both', target: 'allies', effect: { hp: 120 }, price: 420, unlock: 4, desc: 'Restores 120 HP to the whole party.' },
  mana_drop: { name: 'Mana Drop', use: 'both', target: 'ally', effect: { mp: 30 }, price: 120, unlock: 1, desc: 'Restores 30 MP.' },
  mana_vial: { name: 'Mana Vial', use: 'both', target: 'ally', effect: { mp: 80 }, price: 380, unlock: 4, desc: 'Restores 80 MP.' },
  revival_bead: { name: 'Revival Bead', use: 'both', target: 'dead_ally', effect: { revive: 50 }, price: 300, unlock: 1, desc: 'Revives a fallen ally with half HP.' },
  fire_shard: { name: 'Fire Shard', use: 'battle', target: 'one', effect: { damage: 46, element: 'fire' }, price: 60, unlock: 0, desc: 'Fire damage to one foe.' },
  ice_shard: { name: 'Ice Shard', use: 'battle', target: 'one', effect: { damage: 46, element: 'ice' }, price: 60, unlock: 0, desc: 'Ice damage to one foe.' },
  bolt_shard: { name: 'Bolt Shard', use: 'battle', target: 'one', effect: { damage: 46, element: 'elec' }, price: 60, unlock: 0, desc: 'Electric damage to one foe.' },
  wind_shard: { name: 'Wind Shard', use: 'battle', target: 'one', effect: { damage: 46, element: 'wind' }, price: 60, unlock: 0, desc: 'Wind damage to one foe.' },
  holy_shard: { name: 'Holy Shard', use: 'battle', target: 'one', effect: { damage: 46, element: 'light' }, price: 90, unlock: 2, desc: 'Light damage to one foe.' },
  dusk_shard: { name: 'Dusk Shard', use: 'battle', target: 'one', effect: { damage: 46, element: 'dark' }, price: 90, unlock: 2, desc: 'Dark damage to one foe.' },
  ward_incense: { name: 'Ward Incense', use: 'field', target: 'none', effect: { ward: 60 }, price: 100, unlock: 1, desc: 'No random encounters for 60 steps.' },
  exit_charm: { name: 'Exit Charm', use: 'field', target: 'none', effect: { exit: true }, price: 80, unlock: 0, desc: 'Returns you to the hub floor.' },
  brass_key: { name: 'Brass Key', use: 'key', desc: 'Opens a brass lock.' },
  iron_key: { name: 'Iron Key', use: 'key', desc: 'Opens an iron lock.' },
  silver_key: { name: 'Silver Key', use: 'key', desc: 'Opens a silver lock.' },
};

export const itemName = (id) => ITEMS[id]?.name || id.replace(/_/g, ' ');
