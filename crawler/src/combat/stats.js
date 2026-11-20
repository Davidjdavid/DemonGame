// Stats, HP and MP from level. Pure.
import { TUNING } from './tuning.js';

export const STAT_KEYS = ['st', 'ma', 'vi', 'ag', 'lu'];

// A monster's stats at a level: a pool that grows with level, split by its profile weights.
export function monsterStats(profile, level, T = TUNING) {
  const sumW = STAT_KEYS.reduce((s, k) => s + (profile[k] || 0), 0) || 1;
  const pool = T.statBase + T.statPerLevel * level;
  const out = {};
  for (const k of STAT_KEYS) out[k] = Math.max(1, Math.round((pool * (profile[k] || 0)) / sumW));
  return out;
}

export function maxHpFor(level, vi, T = TUNING) {
  return Math.round(T.hpBase + T.hpLevel * level + T.hpVi * vi);
}

export function maxMpFor(level, ma, T = TUNING) {
  return Math.round(T.mpBase + T.mpLevel * level + T.mpMa * ma);
}
