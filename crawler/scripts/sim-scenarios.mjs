// Balance scenarios: the curve targets from DESIGN ("The difficulty curve to aim for"). Kept in sync with the table
// in PROGRESS.md.
const F1 = { table: ['slime', 'gnawer', 'wisp', 'dustmoth', 'husk', 'imp'], level: [1, 3], size: [1, 3] };

export const SCENARIOS = {
  'F1 solo L1': { heroLevel: 1, enc: { ...F1, level: [1, 2], size: [1, 2], table: ['slime', 'gnawer', 'wisp', 'dustmoth'] }, target: '2-4 hits, 2-4 rounds, low risk' },
  'F1 solo L3': { heroLevel: 3, enc: F1, target: '2-4 hits, 2-4 rounds' },
  'F1 L4 + 2 recruits': { heroLevel: 4, recruits: [['wisp', 3], ['dustmoth', 3]], enc: F1, target: '1-2 rounds' },
};
