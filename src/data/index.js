// Data registry. Cards are one JSON file per demon (src/data/demons/<id>.json, indexed by
// scripts/gen-index.mjs). JSON is imported with attributes so Node tests and esbuild share the files.
import { CARDS } from './demons/index.js';
import items from './items.json' with { type: 'json' };
import { EXTRA_ITEMS } from './items-extra.js';
import families from './families.json' with { type: 'json' };

export const DEMONS = CARDS;
export const ITEMS = Object.fromEntries([...items, ...EXTRA_ITEMS].map((i) => [i.id, i]));
export const FAMILIES = families;

export function demonCard(id) {
  const c = DEMONS[id];
  if (!c) throw new Error(`unknown demon ${id}`);
  return c;
}
