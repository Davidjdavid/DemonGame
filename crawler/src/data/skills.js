// Skill table. kind: attack | heal | revive | buff | debuff. target: one | all | random | ally | allies | self |
// dead_ally. power: attack power, or % of max HP for heals/revives. cost: { mp } or { hpPct }. stat: 'st' | 'ma'.
const S = {};
const add = (id, def) => { S[id] = { id, accuracy: 0.95, hits: [1, 1], ...def }; };

add('attack', { name: 'Attack', element: 'phys', kind: 'attack', target: 'one', power: 20, stat: 'st' });

// Physical (cost HP).
add('lunge', { name: 'Lunge', element: 'phys', kind: 'attack', target: 'one', power: 34, stat: 'st', cost: { hpPct: 6 } });
add('twin_slash', { name: 'Twin Slash', element: 'phys', kind: 'attack', target: 'one', power: 24, hits: [2, 2], stat: 'st', cost: { hpPct: 9 }, accuracy: 0.9 });
add('rampage', { name: 'Rampage', element: 'phys', kind: 'attack', target: 'random', power: 22, hits: [2, 4], stat: 'st', cost: { hpPct: 13 }, accuracy: 0.88 });
add('crush', { name: 'Crushing Blow', element: 'phys', kind: 'attack', target: 'one', power: 62, stat: 'st', cost: { hpPct: 12 }, accuracy: 0.9 });
add('whirl', { name: 'Whirlwind Cut', element: 'phys', kind: 'attack', target: 'all', power: 36, stat: 'st', cost: { hpPct: 16 } });
add('devastate', { name: 'Devastate', element: 'phys', kind: 'attack', target: 'one', power: 100, stat: 'st', cost: { hpPct: 15 }, accuracy: 0.9 });

// Magic: rank 1 single / all, rank 2 single / all, rank 3 single.
const MAGIC = {
  fire: ['Ember', 'Flame Wave', 'Firebolt', 'Firestorm', 'Inferno'],
  ice: ['Frost', 'Frost Wave', 'Ice Lance', 'Blizzard', 'Glacier'],
  elec: ['Spark', 'Spark Wave', 'Thunderbolt', 'Thunderstorm', 'Skyfall'],
  wind: ['Gust', 'Gale Wave', 'Cyclone', 'Tempest', 'Maelstrom'],
  light: ['Glint', 'Holy Wave', 'Sunburst', 'Dawnfall', 'Judgment'],
  dark: ['Hex', 'Shadow Wave', 'Night Spear', 'Eclipse', 'Abyss'],
};
const RANKS = [
  { suffix: '1', target: 'one', power: 24, mp: 3 },
  { suffix: '1a', target: 'all', power: 17, mp: 7 },
  { suffix: '2', target: 'one', power: 44, mp: 8 },
  { suffix: '2a', target: 'all', power: 32, mp: 15 },
  { suffix: '3', target: 'one', power: 72, mp: 14 },
];
for (const [el, names] of Object.entries(MAGIC)) {
  RANKS.forEach((r, i) => add(`${el}${r.suffix}`, { name: names[i], element: el, kind: 'attack', target: r.target, power: r.power, stat: 'ma', cost: { mp: r.mp }, accuracy: 0.98 }));
}
add('blast', { name: 'Blast', element: 'almighty', kind: 'attack', target: 'one', power: 38, stat: 'ma', cost: { mp: 10 }, accuracy: 1 });
add('megablast', { name: 'Megablast', element: 'almighty', kind: 'attack', target: 'all', power: 46, stat: 'ma', cost: { mp: 24 }, accuracy: 1 });

// Healing (power = % of the target's max HP, scaled a little by magic).
add('mend', { name: 'Mend', element: 'heal', kind: 'heal', target: 'ally', power: 40, cost: { mp: 4 } });
add('mend_all', { name: 'Mend All', element: 'heal', kind: 'heal', target: 'allies', power: 30, cost: { mp: 10 } });
add('restore', { name: 'Restore', element: 'heal', kind: 'heal', target: 'ally', power: 85, cost: { mp: 10 } });
add('restore_all', { name: 'Restore All', element: 'heal', kind: 'heal', target: 'allies', power: 60, cost: { mp: 22 } });
add('revive', { name: 'Revive', element: 'heal', kind: 'revive', target: 'dead_ally', power: 50, cost: { mp: 14 } });
add('full_revive', { name: 'Full Revive', element: 'heal', kind: 'revive', target: 'dead_ally', power: 100, cost: { mp: 28 } });

// Support: party buffs and enemy debuffs (stacks -2..+2, last 3 turns).
add('rally', { name: 'Rally', element: 'support', kind: 'buff', target: 'allies', buff: { stat: 'atk', stacks: 1 }, cost: { mp: 8 } });
add('brace', { name: 'Brace', element: 'support', kind: 'buff', target: 'allies', buff: { stat: 'def', stacks: 1 }, cost: { mp: 8 } });
add('quicken', { name: 'Quicken', element: 'support', kind: 'buff', target: 'allies', buff: { stat: 'agi', stacks: 1 }, cost: { mp: 8 } });
add('weaken', { name: 'Weaken', element: 'support', kind: 'debuff', target: 'all', buff: { stat: 'atk', stacks: -1 }, cost: { mp: 8 } });
add('expose', { name: 'Expose', element: 'support', kind: 'debuff', target: 'all', buff: { stat: 'def', stacks: -1 }, cost: { mp: 8 } });
add('hamper', { name: 'Hamper', element: 'support', kind: 'debuff', target: 'all', buff: { stat: 'agi', stacks: -1 }, cost: { mp: 8 } });
add('dispel', { name: 'Dispel', element: 'support', kind: 'dispel', target: 'all', cost: { mp: 10 }, accuracy: 1 });
// The hero's starting skill: reveal one foe's affinities to the whole party.
add('analyze', { name: 'Analyze', element: 'support', kind: 'analyze', target: 'one', cost: { mp: 2 }, accuracy: 1 });

// Monster-only flavour attacks (free).
add('bite', { name: 'Bite', element: 'phys', kind: 'attack', target: 'one', power: 26, stat: 'st' });
add('claw_flurry', { name: 'Claw Flurry', element: 'phys', kind: 'attack', target: 'one', power: 16, hits: [2, 3], stat: 'st', accuracy: 0.9 });
add('slam', { name: 'Slam', element: 'phys', kind: 'attack', target: 'one', power: 34, stat: 'st', accuracy: 0.85 });

for (const s of Object.values(S)) {
  if (s.element === 'support' || s.kind === 'heal' || s.kind === 'revive' || s.kind === 'analyze') s.accuracy = s.kind === 'debuff' ? 0.9 : 1;
}

export const SKILLS = S;

export function skillDesc(s) {
  const tgt = { one: 'one foe', all: 'all foes', random: 'random foes', ally: 'one ally', allies: 'all allies', self: 'self', dead_ally: 'a fallen ally' }[s.target];
  const cost = s.cost?.mp ? `${s.cost.mp} MP` : s.cost?.hpPct ? `${s.cost.hpPct}% HP` : 'free';
  if (s.kind === 'attack') {
    const hits = s.hits[1] > 1 ? ` ×${s.hits[0]}${s.hits[1] > s.hits[0] ? `-${s.hits[1]}` : ''}` : '';
    return `${s.element === 'phys' ? 'Physical' : s.element[0].toUpperCase() + s.element.slice(1)} damage to ${tgt}${hits} · power ${s.power} · ${cost}`;
  }
  if (s.kind === 'heal') return `Heal ${tgt} (~${s.power}% HP) · ${cost}`;
  if (s.kind === 'revive') return `Revive ${tgt} with ${s.power}% HP · ${cost}`;
  if (s.kind === 'buff' || s.kind === 'debuff') return `${s.buff.stacks > 0 ? 'Raise' : 'Lower'} ${s.buff.stat === 'atk' ? 'attack' : s.buff.stat === 'def' ? 'defence' : 'agility'} of ${tgt} · ${cost}`;
  if (s.kind === 'dispel') return `Cancel the buffs of ${tgt} · ${cost}`;
  if (s.kind === 'analyze') return `Reveal ${tgt}'s affinities to your party · ${cost}`;
  return cost;
}
