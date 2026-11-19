// Negotiation tuning numbers and enums. Placeholders; tune by playtesting.

export const MOOD_MIN = -5;
export const MOOD_MAX = 5;
export const JOIN_OFFER_MIN = 3;   // a demon's offer to join is honored at or above this mood
export const GIFT_MIN = 2;         // a spontaneous gift is honored at or above this mood
export const ATTACK_MAX = -1;      // a demon may only start a fight at or below this mood (or after a hostile act)
export const HOSTILE_START_MOOD = -2;

export const PLAYER_ACTS = ['talk', 'compliment', 'flirt', 'insult', 'threaten', 'attack', 'mug', 'beg', 'trick',
  'give', 'ask_join', 'accept', 'refuse', 'leave', 'other'];
export const DEMON_ACTS = ['none', 'offer_join', 'demand', 'give', 'leave', 'flee', 'attack', 'let_pass'];
export const CHANCES = ['none', 'low', 'medium', 'high', 'certain'];

// Player acts whose success is rolled by the game (Claude only rates the odds).
export const ROLLED_ACTS = ['ask_join', 'mug', 'beg', 'trick', 'threaten'];
// Player acts that justify the demon starting a fight even when his mood isn't low.
export const HOSTILE_ACTS = ['insult', 'threaten', 'attack', 'mug'];

// Base success chance for mug / beg / trick / threaten from Claude's rating.
export const CHANCE_P = { none: 0, low: 0.25, medium: 0.5, high: 0.75, certain: 1 };

// Asking a normal-askStyle demon to join: base chance by mood, scaled by Claude's rating.
const ASK_JOIN_BY_MOOD = { '-5': 0, '-4': 0, '-3': 0, '-2': 0.02, '-1': 0.05, '0': 0.1, '1': 0.2, '2': 0.35, '3': 0.55, '4': 0.75, '5': 0.85 };
const ASK_JOIN_SCALE = { none: 0, low: 0.5, medium: 1, high: 1.3, certain: 1.6 };

export function clampMood(m) {
  return Math.max(MOOD_MIN, Math.min(MOOD_MAX, Math.round(m)));
}

export function askJoinChance(mood, rating) {
  const base = ASK_JOIN_BY_MOOD[String(clampMood(mood))] ?? 0;
  return Math.min(0.95, base * (ASK_JOIN_SCALE[rating] ?? 1));
}

export function attemptChance(act, rating) {
  if (act === 'ask_join') throw new Error('use askJoinChance');
  return CHANCE_P[rating] ?? 0.5;
}

export function moodWord(m) {
  if (m <= -3) return 'furious';
  if (m <= -1) return 'irritated';
  if (m === 0) return 'neutral';
  if (m <= 2) return 'warming up';
  if (m <= 4) return 'friendly';
  return 'delighted';
}

// Mood face bucket for the UI (never show numbers).
export function moodFace(m) {
  if (m <= -3) return 'furious';
  if (m <= -1) return 'annoyed';
  if (m === 0) return 'neutral';
  if (m <= 2) return 'pleased';
  return 'delighted';
}
