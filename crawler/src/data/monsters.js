// Monster types. level = base level; profile = stat weights (st, ma, vi, ag, lu); aff = affinity tiers (missing =
// normal); skills known at base level; learns = [[level, skillId]]; personality drives negotiation ('mindless'
// never talks); family drives fusion; fusionOnly types never appear as enemies; shape + color drive the figure.
// Floors list which types appear (data/floors/*.js `encounters.table`).
const M = {};
const def = (id, d) => { M[id] = { learns: [], ...d }; };

// ---- 1F (L1-3) ----
def('slime', { name: 'Slime', family: 'ooze', level: 1, profile: { st: 3, ma: 1, vi: 4, ag: 1, lu: 2 },
  aff: { fire: 'weak', ice: 'resist' }, skills: [], learns: [[4, 'weaken'], [7, 'ice1']],
  personality: 'gloomy', shape: 'blob', color: '#7ad05a' });
def('gnawer', { name: 'Gnawer', family: 'beast', level: 1, profile: { st: 3, ma: 1, vi: 2, ag: 4, lu: 2 },
  aff: { wind: 'weak', ice: 'resist' }, skills: ['bite'], learns: [[3, 'claw_flurry'], [6, 'lunge']],
  personality: 'timid', shape: 'beast', color: '#a07850' });
def('wisp', { name: 'Wisp', family: 'spirit', level: 2, profile: { st: 1, ma: 4, vi: 2, ag: 3, lu: 2 },
  aff: { fire: 'null', ice: 'weak', dark: 'weak', light: 'resist' }, skills: ['fire1'], learns: [[3, 'mend'], [6, 'fire1a'], [9, 'fire2']],
  personality: 'cheerful', shape: 'wisp', color: '#ff9a40' });
def('dustmoth', { name: 'Dustmoth', family: 'insect', level: 2, profile: { st: 2, ma: 3, vi: 2, ag: 3, lu: 2 },
  aff: { fire: 'weak', wind: 'resist' }, skills: ['wind1'], learns: [[4, 'hamper'], [6, 'wind1a'], [9, 'wind2']],
  personality: 'hothead', shape: 'moth', color: '#c8b88a' });
def('husk', { name: 'Husk', family: 'undead', level: 2, profile: { st: 4, ma: 1, vi: 4, ag: 1, lu: 1 },
  aff: { light: 'weak', dark: 'null', ice: 'resist' }, skills: ['slam'],
  personality: 'mindless', shape: 'humanoid', color: '#8a9a7a' });
def('imp', { name: 'Imp', family: 'fiend', level: 3, profile: { st: 2, ma: 4, vi: 2, ag: 3, lu: 3 },
  aff: { elec: 'null', light: 'weak', dark: 'resist' }, skills: ['elec1'], learns: [[5, 'dark1'], [7, 'elec1a'], [10, 'elec2']],
  personality: 'greedy', shape: 'imp', color: '#d0483a' });

// ---- 2F (L3-6) ----
def('thornling', { name: 'Thornling', family: 'plant', level: 3, profile: { st: 2, ma: 3, vi: 3, ag: 2, lu: 3 },
  aff: { fire: 'weak', elec: 'resist', dark: 'resist' }, skills: ['mend'], learns: [[5, 'light1'], [7, 'brace'], [9, 'mend_all']],
  personality: 'timid', shape: 'plant', color: '#e070a0' });
def('hound', { name: 'Hound', family: 'beast', level: 4, profile: { st: 4, ma: 2, vi: 3, ag: 4, lu: 2 },
  aff: { fire: 'null', ice: 'weak' }, skills: ['bite', 'fire1'], learns: [[6, 'lunge'], [8, 'fire1a']],
  personality: 'hothead', shape: 'beast', color: '#a83a2a' });
def('shrike', { name: 'Shrike', family: 'bird', level: 4, profile: { st: 3, ma: 2, vi: 2, ag: 5, lu: 3 },
  aff: { elec: 'weak', wind: 'resist' }, skills: ['wind1'], learns: [[5, 'twin_slash'], [7, 'quicken']],
  personality: 'cheerful', shape: 'bird', color: '#7f9ab8' });
def('stinger', { name: 'Stinger', family: 'insect', level: 5, profile: { st: 4, ma: 1, vi: 3, ag: 4, lu: 2 },
  aff: { fire: 'weak', phys: 'resist', ice: 'null' }, skills: ['lunge'], learns: [[7, 'rampage'], [9, 'expose']],
  personality: 'proud', shape: 'moth', color: '#d8c030' });
def('viper', { name: 'Viper', family: 'serpent', level: 5, profile: { st: 3, ma: 3, vi: 3, ag: 4, lu: 2 },
  aff: { ice: 'weak', dark: 'resist' }, skills: ['bite', 'dark1'], learns: [[7, 'weaken'], [9, 'dark1a']],
  personality: 'greedy', shape: 'serpent', color: '#5a9a4a' });

// ---- 3F (L6-9) ----
def('bogjelly', { name: 'Bog Jelly', family: 'ooze', level: 6, profile: { st: 2, ma: 4, vi: 5, ag: 1, lu: 2 },
  aff: { elec: 'weak', fire: 'resist', ice: 'null' }, skills: ['ice1', 'weaken'], learns: [[8, 'ice1a'], [10, 'mend_all']],
  personality: 'gloomy', shape: 'blob', color: '#3a9a9a' });
def('claydoll', { name: 'Clay Doll', family: 'golem', level: 6, profile: { st: 5, ma: 1, vi: 5, ag: 1, lu: 1 },
  aff: { wind: 'weak', phys: 'resist' }, skills: ['slam'], learns: [[9, 'crush']],
  personality: 'mindless', shape: 'golem', color: '#c09060' });
def('bonewalker', { name: 'Bonewalker', family: 'undead', level: 7, profile: { st: 5, ma: 2, vi: 4, ag: 2, lu: 1 },
  aff: { light: 'weak', dark: 'repel', fire: 'resist' }, skills: ['twin_slash'],
  personality: 'mindless', shape: 'humanoid', color: '#d8d0b8' });
def('shellback', { name: 'Shellback', family: 'crab', level: 7, profile: { st: 4, ma: 2, vi: 6, ag: 1, lu: 2 },
  aff: { elec: 'weak', ice: 'null', phys: 'resist' }, skills: ['claw_flurry', 'brace'], learns: [[9, 'ice1'], [11, 'crush']],
  personality: 'proud', shape: 'crab', color: '#c06a3a' });

// ---- 4F (L9-12) ----
def('harpy', { name: 'Harpy', family: 'bird', level: 9, profile: { st: 4, ma: 4, vi: 3, ag: 5, lu: 3 },
  aff: { elec: 'weak', wind: 'null' }, skills: ['wind2', 'claw_flurry'], learns: [[11, 'wind1a'], [13, 'quicken']],
  personality: 'hothead', shape: 'bird', color: '#d090c0' });
def('watcher', { name: 'Watcher', family: 'eye', level: 9, profile: { st: 1, ma: 6, vi: 3, ag: 3, lu: 3 },
  aff: { wind: 'weak', light: 'resist', dark: 'null' }, skills: ['elec1', 'ice1', 'fire1'], learns: [[11, 'elec2'], [13, 'dispel']],
  personality: 'gloomy', shape: 'eye', color: '#8a5ac0' });
def('bloomwitch', { name: 'Bloom Witch', family: 'plant', level: 10, profile: { st: 2, ma: 6, vi: 3, ag: 3, lu: 3 },
  aff: { fire: 'weak', elec: 'resist', wind: 'resist' }, skills: ['mend_all', 'wind1a', 'hamper'], learns: [[12, 'light2'], [13, 'restore'], [15, 'revive']],
  personality: 'cheerful', shape: 'plant', color: '#ff9ad0' });
def('direwolf', { name: 'Dire Wolf', family: 'beast', level: 10, profile: { st: 6, ma: 1, vi: 4, ag: 5, lu: 2 },
  aff: { fire: 'weak', ice: 'resist' }, skills: ['lunge', 'claw_flurry', 'rally'], learns: [[12, 'twin_slash'], [14, 'whirl']],
  personality: 'hothead', shape: 'beast', color: '#6a6a7a' });
def('mantis', { name: 'Mantis', family: 'insect', level: 11, profile: { st: 6, ma: 2, vi: 3, ag: 6, lu: 3 },
  aff: { fire: 'weak', wind: 'resist', phys: 'resist' }, skills: ['twin_slash', 'wind1'], learns: [[13, 'whirl'], [15, 'devastate']],
  personality: 'proud', shape: 'moth', color: '#5ac05a' });

// ---- 5F (L12-15) ----
def('wraith', { name: 'Wraith', family: 'spirit', level: 12, profile: { st: 1, ma: 7, vi: 3, ag: 4, lu: 3 },
  aff: { phys: 'null', light: 'weak', dark: 'absorb' }, skills: ['dark2', 'weaken', 'hamper'], learns: [[14, 'dark1a'], [16, 'dark3']],
  personality: 'gloomy', shape: 'wisp', color: '#6a6aa0' });
def('naga', { name: 'Naga', family: 'serpent', level: 12, profile: { st: 4, ma: 6, vi: 4, ag: 4, lu: 3 },
  aff: { elec: 'weak', ice: 'null', fire: 'resist' }, skills: ['ice2', 'mend', 'bite'], learns: [[14, 'ice1a'], [16, 'ice3']],
  personality: 'greedy', shape: 'serpent', color: '#3aa0a0' });
def('acidooze', { name: 'Acid Ooze', family: 'ooze', level: 13, profile: { st: 5, ma: 4, vi: 6, ag: 2, lu: 2 },
  aff: { ice: 'weak', dark: 'resist' }, skills: ['slam', 'expose'], learns: [[15, 'dark2'], [17, 'crush']],
  personality: 'timid', shape: 'blob', color: '#c0d030' });
def('irongolem', { name: 'Iron Golem', family: 'golem', level: 13, hpMult: 0.75, profile: { st: 7, ma: 1, vi: 7, ag: 1, lu: 1 },
  aff: { elec: 'weak', phys: 'resist', fire: 'null', ice: 'null' }, skills: ['crush', 'brace'],
  personality: 'mindless', shape: 'golem', color: '#8a8a9a' });
def('ironclaw', { name: 'Ironclaw', family: 'crab', level: 14, profile: { st: 7, ma: 2, vi: 7, ag: 2, lu: 2 },
  aff: { elec: 'weak', ice: 'absorb' }, skills: ['claw_flurry', 'brace', 'ice1'], learns: [[16, 'crush'], [18, 'whirl']],
  personality: 'proud', shape: 'crab', color: '#5a6a9a' });

// ---- 6F (L15-18) ----
def('thunderbird', { name: 'Thunderbird', family: 'bird', level: 15, profile: { st: 4, ma: 7, vi: 4, ag: 6, lu: 3 },
  aff: { elec: 'absorb', ice: 'weak', wind: 'resist' }, skills: ['elec2', 'elec1a', 'wind2'], learns: [[17, 'elec3'], [19, 'elec2a']],
  personality: 'hothead', shape: 'bird', color: '#e8d040' });
def('gazer', { name: 'Gazer', family: 'eye', level: 15, profile: { st: 2, ma: 8, vi: 4, ag: 3, lu: 4 },
  aff: { phys: 'weak', light: 'null', dark: 'null' }, skills: ['blast', 'light2', 'dark2', 'dispel'], learns: [[17, 'light1a'], [19, 'dark2a']],
  personality: 'proud', shape: 'eye', color: '#c04a8a' });
def('hellion', { name: 'Hellion', family: 'fiend', level: 16, profile: { st: 5, ma: 7, vi: 4, ag: 5, lu: 4 },
  aff: { light: 'weak', fire: 'absorb', dark: 'resist' }, skills: ['fire2', 'fire1a', 'rally'], learns: [[18, 'fire3'], [20, 'fire2a']],
  personality: 'greedy', shape: 'imp', color: '#ff5a2a' });
def('dreadknight', { name: 'Dread Knight', family: 'knight', level: 16, profile: { st: 8, ma: 3, vi: 6, ag: 4, lu: 3 },
  aff: { dark: 'weak', light: 'resist', phys: 'resist' }, skills: ['devastate', 'whirl', 'brace'], learns: [[18, 'rally']],
  personality: 'proud', shape: 'knight', color: '#4a4a5a' });
def('treant', { name: 'Elder Treant', family: 'plant', level: 17, profile: { st: 6, ma: 5, vi: 8, ag: 1, lu: 3 },
  aff: { fire: 'weak', elec: 'null', ice: 'resist', phys: 'resist' }, skills: ['crush', 'mend_all', 'weaken'], learns: [[19, 'restore_all']],
  personality: 'timid', shape: 'plant', color: '#7a9a3a' });

// ---- Fusion only ----
def('chimera', { name: 'Chimera', family: 'beast', level: 17, fusionOnly: true, profile: { st: 8, ma: 5, vi: 6, ag: 6, lu: 3 },
  aff: { fire: 'repel', ice: 'weak' }, skills: ['fire2a', 'lunge', 'devastate'], personality: 'hothead', shape: 'beast', color: '#d07a2a' });
def('lich', { name: 'Lich', family: 'undead', level: 16, fusionOnly: true, profile: { st: 2, ma: 9, vi: 5, ag: 3, lu: 4 },
  aff: { dark: 'absorb', light: 'weak', ice: 'null' }, skills: ['dark3', 'dark2a', 'ice2', 'expose'], personality: 'gloomy', shape: 'humanoid', color: '#7a5ab0' });
def('seraph', { name: 'Seraph', family: 'spirit', level: 18, fusionOnly: true, profile: { st: 3, ma: 9, vi: 5, ag: 5, lu: 5 },
  aff: { light: 'absorb', dark: 'weak', phys: 'resist' }, skills: ['light3', 'light2a', 'restore_all', 'revive'], personality: 'proud', shape: 'wisp', color: '#fff0a0' });
def('wyrm', { name: 'Wyrm', family: 'serpent', level: 18, fusionOnly: true, profile: { st: 8, ma: 7, vi: 8, ag: 4, lu: 3 },
  aff: { fire: 'resist', ice: 'resist', elec: 'weak', wind: 'null' }, skills: ['whirl', 'fire2a', 'ice2a', 'rally'], personality: 'proud', shape: 'serpent', color: '#3a7ad0' });
def('prismooze', { name: 'Prism Ooze', family: 'ooze', level: 19, fusionOnly: true, profile: { st: 4, ma: 8, vi: 6, ag: 3, lu: 4 },
  aff: { fire: 'null', ice: 'null', elec: 'null', wind: 'null', light: 'weak' }, skills: ['fire2', 'ice2', 'elec2', 'wind2', 'mend_all'], personality: 'cheerful', shape: 'blob', color: '#c0a0ff' });

export const MONSTERS = M;

export const PERSONALITIES = ['proud', 'timid', 'cheerful', 'gloomy', 'greedy', 'hothead'];

// Skills a monster of `type` knows at `level` (base skills + learned so far), at most 6 (oldest dropped).
export function skillsAt(type, level) {
  const m = M[type];
  const out = [...m.skills];
  for (const [lv, id] of m.learns || []) if (lv <= level && !out.includes(id)) out.push(id);
  return out.slice(-6);
}

export const FAMILIES = [...new Set(Object.values(M).filter((m) => !m.boss).map((m) => m.family))];

// ---- Boss: the Warden changes aspect (type, affinities, skills, icons) at 66% and 33% HP. Not fusable. ----
def('warden_a', { name: 'The Warden', family: 'boss', boss: true, level: 20, profile: { st: 7, ma: 6, vi: 7, ag: 4, lu: 4 },
  aff: { ice: 'weak', fire: 'absorb', phys: 'resist', light: 'resist' }, skills: ['fire2', 'fire1a', 'crush', 'rally'],
  personality: 'mindless', shape: 'knight', color: '#b8402a', size: 1.6 });
def('warden_b', { name: 'The Warden', family: 'boss', boss: true, level: 20, profile: { st: 5, ma: 8, vi: 7, ag: 5, lu: 4 },
  aff: { elec: 'weak', ice: 'repel', wind: 'null', dark: 'resist' }, skills: ['ice2', 'ice1a', 'wind2', 'weaken', 'dispel'],
  personality: 'mindless', shape: 'knight', color: '#3a7ad0', size: 1.6 });
def('warden_c', { name: 'The Warden', family: 'boss', boss: true, level: 20, profile: { st: 7, ma: 8, vi: 7, ag: 5, lu: 5 },
  aff: { light: 'weak', dark: 'absorb', elec: 'resist', phys: 'resist' }, skills: ['dark2', 'dark1a', 'megablast', 'devastate', 'expose'],
  personality: 'mindless', shape: 'knight', color: '#5a2a7a', size: 1.6 });

export const BOSS = {
  type: 'warden_a', level: 20, hpMult: 8, icons: 3, dmgMult: 0.86,
  phases: [
    { below: 0.72, type: 'warden_b', icons: 3, line: 'The Warden turns to ice and wind!' },
    { below: 0.38, type: 'warden_c', icons: 4, buff: { atk: 2 }, line: 'The Warden turns dark, faster and stronger! (Attack ▲▲ until dispelled or weakened)' },
  ],
};
