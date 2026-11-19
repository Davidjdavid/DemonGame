// Stats from a demon's profile and level (DESIGN: Stats). Placeholder formulas, tuned by the sim.
export const STAT_KEYS = ['str', 'mag', 'vit', 'agi', 'luck'];

export function statsFor(profile, level) {
  const sumW = STAT_KEYS.reduce((s, k) => s + (profile[k] || 0), 0) || 1;
  const pool = 10 + level * 4;
  const out = {};
  for (const k of STAT_KEYS) out[k] = 2 + Math.round((pool * (profile[k] || 0)) / sumW);
  return out;
}

export function maxHpFor(level, stats, bonus = 0) {
  return Math.round((6 * level + 7 * stats.vit + 30) * (1 + bonus));
}

export function maxMpFor(level, stats, bonus = 0) {
  return Math.round((3 * level + 3 * stats.mag + 10) * (1 + bonus));
}
