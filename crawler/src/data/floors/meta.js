// Floor names, order and links (placeholder theme only). Frozen floor files take their name/depth/links from here.
export const FLOOR_ORDER = ['hub', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7'];
export const FLOOR_META = {
  f1: { name: '1F Lower Halls', depth: 1 },
  f2: { name: '2F Cistern', depth: 2 },
  f3: { name: '3F Foundry', depth: 3 },
  f4: { name: '4F Gallery', depth: 4 },
  f5: { name: '5F Archive', depth: 5 },
  f6: { name: '6F Belfry', depth: 6 },
  f7: { name: '7F Crown', depth: 7 },
};
export function linksFor(id) {
  const i = FLOOR_ORDER.indexOf(id);
  const links = {};
  if (i > 0) links.down = FLOOR_ORDER[i - 1];
  if (i >= 0 && i < FLOOR_ORDER.length - 1) links.up = FLOOR_ORDER[i + 1];
  return links;
}
