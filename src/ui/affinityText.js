// Short affinity summaries for menus: only what the player knows.
import { DAMAGE_ELEMENTS, hitClass } from '../combat/affinity.js';

const SHORT = { phys: 'Phys', fire: 'Fire', ice: 'Ice', elec: 'Elec', wind: 'Wind', light: 'Light', dark: 'Dark' };
const WORD = { weak: 'weak', null: 'null', absorb: 'absorbs' };

// tiers: { element: n }; known: iterable of elements (or 'all'). Returns e.g. "Weak: Fire, Elec · Resist: Ice · Null: Dark".
export function affinitySummary(tiers, known = 'all', repel = []) {
  const els = DAMAGE_ELEMENTS.filter((el) => known === 'all' || [...known].includes(el));
  if (!els.length) return 'Affinities unknown';
  const groups = { Weak: [], Resist: [], Null: [], Absorb: [], Repel: [] };
  for (const el of els) {
    if (repel.includes?.(el)) { groups.Repel.push(SHORT[el]); continue; }
    const t = tiers[el] || 0;
    if (!t) continue;
    const c = hitClass(t);
    if (c === 'weak') groups.Weak.push(SHORT[el]);
    else if (c === 'normal') groups.Resist.push(SHORT[el]);
    else if (c === 'null') groups.Null.push(SHORT[el]);
    else groups.Absorb.push(SHORT[el]);
  }
  const parts = Object.entries(groups).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.join(', ')}`);
  const unknown = DAMAGE_ELEMENTS.length - els.length;
  return (parts.join(' · ') || 'No weaknesses or resistances') + (known !== 'all' && unknown ? ` · ${unknown} unknown` : '');
}
export { WORD };
