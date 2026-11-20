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
  enemyHpMult: 0.6, // normal enemies have less HP than their level suggests (fights stay short)
  enemyDmg: 0.55,    // normal enemies hit softer than their stats suggest (bosses use their own dmgMult)
};
