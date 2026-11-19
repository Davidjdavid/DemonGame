// Save format (pure). Version it; leave room for world state (chapters) later.
export const SAVE_VERSION = 1;

export function serialize(player, { world = {} } = {}) {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    player: JSON.parse(JSON.stringify(player)),
    world, // reserved: chapters / story flags / dungeon progress later
  };
}

export function deserialize(data) {
  if (!data || typeof data !== 'object' || !data.player) throw new Error('not a save');
  if (data.version > SAVE_VERSION) throw new Error('save is from a newer version');
  const p = data.player;
  // Migrations go here as the format grows.
  p.stock ||= [];
  p.skills ||= [];
  p.compendium ||= {};
  p.fieldNotes ||= {};
  p.statPoints ||= 0;
  p.exp ||= 0;
  p.armor ||= 'traveler_coat';
  p.armorOwned ||= ['traveler_coat'];
  for (const d of p.stock) {
    d.pendingLearn ||= [];
    d.taught ||= false;
  }
  return { player: p, world: data.world || {} };
}
