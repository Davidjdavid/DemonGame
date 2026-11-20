# growth/ — leveling and fusion (pure)

- Hero `{ name, level, exp, points, stats, equip{weapon, armor}, skills, knows, hp, mp }`; +3 stat points per level.
- Recruit `{ uid, type, level, exp, stats, skills (≤6), knows, hp, mp, auto }`; learns `MONSTERS[type].learns` by level.
- `expToNext(level)`, `expFor(level, boss)`, `moneyFor(level, boss)` — tuned by `scripts/sim-dungeon.mjs`.
- Fusion: `fusionResult(a, b, heroLevel)` → `{ type, level, family, locked }`; `fuse(game, uidA, uidB, chosenSkills)`;
  registry `game.registry[type] = { level, skills }`, `summon(game, type)`.
