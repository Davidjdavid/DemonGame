// Random encounters (pure): a step counter with a rolled gap (15-30 by default, never under 5 after a fight),
// a ward that blocks fights for N steps, and enemy groups drawn from the floor's table with no identical group
// twice in a row.
export function newEncounters(rng, rate = [15, 30]) {
  return { since: 0, next: rollGap(rng, rate), ward: 0, last: null };
}

export function rollGap(rng, [lo, hi] = [15, 30]) {
  return Math.max(5, rng.int(lo, hi));
}

/** Count a step; returns true when a fight starts. `table` = the floor's encounters spec (or null = no fights). */
export function stepEncounter(enc, table, rng) {
  if (!table) return false;
  if (enc.ward > 0) { enc.ward -= 1; return false; }
  enc.since += 1;
  if (enc.since < enc.next) return false;
  enc.since = 0;
  enc.next = rollGap(rng, table.rate);
  return true;
}

// After any fight (won, fled or talked out) the gap restarts.
export function resetAfterFight(enc, table, rng) {
  enc.since = 0;
  enc.next = rollGap(rng, table?.rate);
}

const groupKey = (g) => g.map((e) => `${e.type}:${e.level}`).sort().join(',');

/** Roll an enemy group: [{ type, level }]. spec = { table: [type | [type, weight]], level: [lo, hi], size: [lo, hi] }. */
export function rollGroup(spec, rng, enc = null, minLevel = {}) {
  const entries = spec.table.map((t) => (Array.isArray(t) ? t : [t, 1]));
  const total = entries.reduce((s, [, w]) => s + w, 0);
  const pickType = () => {
    let r = rng() * total;
    for (const [t, w] of entries) if ((r -= w) <= 0) return t;
    return entries[entries.length - 1][0];
  };
  let group;
  for (let tries = 0; tries < 12; tries++) {
    const [slo, shi] = spec.size || [1, 3];
    const n = rng.int(slo, shi);
    // Groups are one or two kinds, like a pack.
    const kinds = [pickType(), pickType()];
    group = [];
    for (let i = 0; i < n; i++) {
      const type = kinds[i === 0 ? 0 : rng() < 0.6 ? 0 : 1];
      const level = Math.max(minLevel[type] || 1, rng.int(spec.level[0], spec.level[1]));
      group.push({ type, level });
    }
    if (!enc?.last || groupKey(group) !== enc.last) break;
  }
  if (enc) enc.last = groupKey(group);
  return group;
}
