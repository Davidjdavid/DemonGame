// Press-turn icon accounting (DESIGN: Combat). Pure.
// Icons: `full` and `half`. A side starts its turn with one full icon per living member.

export const RESULT = {
  NORMAL: 'normal',   // includes +1/+2 resists
  WEAK: 'weak',       // weakness hit (any negative tier)
  CRIT: 'crit',       // critical hit
  MISS: 'miss',       // miss / dodge
  NULL: 'null',       // +3/+4
  ABSORB: 'absorb',   // +5
  REFLECT: 'reflect', // Repel passive
  PASS: 'pass',
};

export function newIcons(count) {
  return { full: count, half: 0 };
}

export function iconsLeft(ic) {
  return ic.full + ic.half;
}

function useOne(ic) {
  if (ic.half > 0) ic.half--;
  else if (ic.full > 0) ic.full--;
}

// Mutates and returns the icon state after one action's (already worst-of) result.
export function spend(ic, result) {
  switch (result) {
    case RESULT.WEAK:
    case RESULT.CRIT:
      if (ic.full > 0) { ic.full--; ic.half++; } else useOne(ic);
      break;
    case RESULT.PASS:
      if (ic.half > 0) ic.half--;
      else if (ic.full > 0) { ic.full--; ic.half++; }
      break;
    case RESULT.NORMAL:
      useOne(ic);
      break;
    case RESULT.MISS:
    case RESULT.NULL:
      useOne(ic); useOne(ic);
      break;
    case RESULT.ABSORB:
    case RESULT.REFLECT:
      ic.full = 0; ic.half = 0;
      break;
    default:
      throw new Error(`unknown press-turn result ${result}`);
  }
  return ic;
}

// Multi-target attacks apply only the worst single result:
// absorb/reflect, then miss/null, then weak/critical, then normal.
const RANK = { absorb: 4, reflect: 4, miss: 3, null: 3, weak: 2, crit: 2, normal: 1 };
export function worstResult(results) {
  if (!results.length) return RESULT.NORMAL;
  return results.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}
