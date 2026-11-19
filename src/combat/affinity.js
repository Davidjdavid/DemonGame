// Element tiers -5..+5 (DESIGN: Elements and tiers + Amendments). Placeholder numbers, tuned by the sim.
export const DAMAGE_ELEMENTS = ['phys', 'fire', 'ice', 'elec', 'wind', 'light', 'dark'];
export const CAST_ELEMENTS = ['support', 'healing']; // casting aptitude only
export const ALL_TIER_KEYS = [...DAMAGE_ELEMENTS, ...CAST_ELEMENTS];
export const ELEMENT_NAMES = {
  phys: 'Physical', fire: 'Fire', ice: 'Ice/Water', elec: 'Electric', wind: 'Wind', light: 'Light', dark: 'Dark',
  almighty: 'Almighty', support: 'Support', healing: 'Healing',
};

// Damage multiplier a target takes at each tier (+5 absorbs: negative = heals).
const TAKEN = { '-5': 2.25, '-4': 2.0, '-3': 1.8, '-2': 1.6, '-1': 1.4, '0': 1, '1': 0.75, '2': 0.5, '3': 0, '4': 0, '5': -1 };
// Multiplier on a demon's own skills of that element (also heal amount for Healing).
const OWN = { '-5': 0.5, '-4': 0.75, '-3': 0.75, '-2': 0.9, '-1': 0.9, '0': 1, '1': 1.1, '2': 1.25, '3': 1.25, '4': 1.5, '5': 1.5 };

const t = (tier) => String(Math.max(-5, Math.min(5, Math.round(tier || 0))));

export function damageTakenMult(tier) { return TAKEN[t(tier)]; }
export function ownSkillMult(tier) { return OWN[t(tier)]; }

// Press-turn class of a hit on this tier: 'weak' | 'normal' | 'null' | 'absorb'.
export function hitClass(tier) {
  const n = Number(t(tier));
  if (n < 0) return 'weak';
  if (n <= 2) return 'normal';
  if (n <= 4) return 'null';
  return 'absorb';
}

// Support tier -> buff/debuff duration in turns, and debuff hit chance.
export function supportDuration(tier) {
  const n = Number(t(tier));
  if (n <= -3) return 2;
  if (n <= 2) return 3;
  if (n <= 4) return 4;
  return 5;
}
export function debuffHitChance(tier) {
  return Math.max(0.6, Math.min(1, 0.85 + 0.03 * Number(t(tier))));
}
// Healing tier -> success chance of a chance-based heal (e.g. a 50% revive).
export function healChance(base, tier) {
  return Math.max(0.1, Math.min(1, base + 0.08 * Number(t(tier))));
}

// Tier budget: sum of all tiers (damage + casting). Early demons should be within -2..+2.
export function tierSum(tiers) {
  return ALL_TIER_KEYS.reduce((s, k) => s + (tiers[k] || 0), 0);
}
