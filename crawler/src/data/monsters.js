// Monster types. level = base level; profile = stat weights; aff = affinity tiers (missing = normal);
// skills known at base level; learns = [[level, skillId]]; personality drives negotiation ('mindless' never talks);
// shape + color drive the placeholder figure. Floors list which types appear (data/floors).
export const MONSTERS = {
  slime: {
    name: 'Slime', family: 'ooze', level: 1, profile: { st: 3, ma: 1, vi: 4, ag: 1, lu: 2 },
    aff: { fire: 'weak', ice: 'resist' }, skills: ['attack'], learns: [[4, 'weaken'], [7, 'ice1']],
    personality: 'gloomy', shape: 'blob', color: '#7ad05a',
  },
  gnawer: {
    name: 'Gnawer', family: 'beast', level: 1, profile: { st: 3, ma: 1, vi: 2, ag: 4, lu: 2 },
    aff: { wind: 'weak', ice: 'resist' }, skills: ['bite'], learns: [[4, 'claw_flurry'], [7, 'lunge']],
    personality: 'timid', shape: 'beast', color: '#a07850',
  },
  wisp: {
    name: 'Wisp', family: 'spirit', level: 2, profile: { st: 1, ma: 4, vi: 2, ag: 3, lu: 2 },
    aff: { fire: 'null', ice: 'weak', light: 'resist', dark: 'weak' }, skills: ['fire1'], learns: [[4, 'mend'], [6, 'fire1a']],
    personality: 'cheerful', shape: 'wisp', color: '#ff9a40',
  },
  dustmoth: {
    name: 'Dustmoth', family: 'insect', level: 2, profile: { st: 2, ma: 3, vi: 2, ag: 3, lu: 2 },
    aff: { fire: 'weak', wind: 'resist' }, skills: ['wind1', 'attack'], learns: [[4, 'hamper'], [7, 'wind1a']],
    personality: 'hothead', shape: 'moth', color: '#c8b88a',
  },
  husk: {
    name: 'Husk', family: 'undead', level: 2, profile: { st: 4, ma: 1, vi: 4, ag: 1, lu: 1 },
    aff: { light: 'weak', dark: 'null', ice: 'resist' }, skills: ['attack', 'slam'], learns: [],
    personality: 'mindless', shape: 'humanoid', color: '#8a9a7a',
  },
  imp: {
    name: 'Imp', family: 'fiend', level: 3, profile: { st: 2, ma: 4, vi: 2, ag: 3, lu: 3 },
    aff: { elec: 'null', light: 'weak', dark: 'resist' }, skills: ['elec1', 'attack'], learns: [[5, 'dark1'], [8, 'elec2']],
    personality: 'greedy', shape: 'imp', color: '#d0483a',
  },
};

export const PERSONALITIES = ['proud', 'timid', 'cheerful', 'gloomy', 'greedy', 'hothead'];

// Skills a monster of `type` knows at `level` (base skills + learned so far), at most 6.
export function skillsAt(type, level) {
  const m = MONSTERS[type];
  const out = [...m.skills];
  for (const [lv, id] of m.learns || []) if (lv <= level && !out.includes(id)) out.push(id);
  return out.slice(-6);
}
