// Data registry. JSON is imported with attributes so Node tests and esbuild share the files.
import ares from './demons/ares.json' with { type: 'json' };
import hephaestus from './demons/hephaestus.json' with { type: 'json' };
import kappa from './demons/kappa.json' with { type: 'json' };
import items from './items.json' with { type: 'json' };
import families from './families.json' with { type: 'json' };

export const DEMONS = { ares, hephaestus, kappa };
export const ITEMS = Object.fromEntries(items.map((i) => [i.id, i]));
export const FAMILIES = families;

export function demonCard(id) {
  const c = DEMONS[id];
  if (!c) throw new Error(`unknown demon ${id}`);
  return c;
}
