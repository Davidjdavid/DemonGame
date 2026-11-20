// Balance knobs in one place (the sims override these through `tuning`).
export const TUNING = {
  statBase: 12,      // monster stat total at level 0
  statPerLevel: 3,   // ... plus this per level
  hpBase: 18, hpLevel: 4, hpVi: 4,
  mpBase: 8, mpLevel: 2, mpMa: 3,
  dmgK: 0.5,         // global damage scale
  defBase: 8,        // flat defence added to every target
  atkBuff: 0.25, defBuff: 0.2, agiBuff: 0.12, // per buff stack
  critBase: 0.06, critMult: 1.5,
  healK: 0.9,
  // Normal enemies: HP and damage multipliers grow with their level (solo floor 1 is gentle; full parties on deeper
  // floors still face real fights). Bosses set their own hpMult / dmgMult.
  enemyHpBase: 0.6, enemyHpPerLevel: 0.03, enemyHpMax: 0.95,
  enemyDmgBase: 0.55, enemyDmgPerLevel: 0.035, enemyDmgMax: 1.05,
};

export const enemyHpMult = (level, T = TUNING) => Math.min(T.enemyHpMax, T.enemyHpBase + T.enemyHpPerLevel * (level - 1));
export const enemyDmgMult = (level, T = TUNING) => Math.min(T.enemyDmgMax, T.enemyDmgBase + T.enemyDmgPerLevel * (level - 1));
