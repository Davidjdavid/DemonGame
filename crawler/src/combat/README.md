# combat/ — press turns, affinities, battle engine, knowledge, policies (pure)

- `units.js` builds **combatants** `{ key, name, side, type, level, stats{st,ma,vi,ag,lu}, hp, maxHp, mp, maxMp, aff{el:tier},
  skills[], attackElement, buffs{atk,def,agi:{stacks,turns}}, atkBonus, defBonus, icons, boss, bossDef, isHero, knows, ref, auto }`
  from the hero (`heroCombatant`), a recruit (`recruitCombatant`) or a monster type (`enemyCombatant(type, level, key, {boss})`).
  `ref` points back at the persistent hero/recruit; `knows` is that member's persistent knowledge object (shared by reference).
- `battle.js`: `createBattle({ party, enemies, rng, inventory, first, canEscape })`, `currentActor`, `act(state, action)`
  with actions `{type:'skill', skill, targets}` | `{type:'item', item, targets}` | `{type:'pass'}` | `{type:'escape'}` |
  `{type:'analyze', target}` | `{type:'talk', target, outcome, endTurn}`. `act` returns an **event**
  `{ actor, side, skill|item|pass|escape|analyze|talk, element, hits:[{target, result, amount, crit, resist, killed, reflectedTo}],
  effects:[{target, heal, mp, revived} | {buff, targets, missed} | {dispel} | {phase, line}], learned:[{type, el, tier}],
  exposed:[{target, el, tier}], result, icons, turnEnded }`. Results: normal | weak | crit | miss | null | reflect | absorb | pass.
- Tiers: weak (×1.5, half icon) · normal · resist (×0.5) · null (0, costs 2 icons) · repel (bounces, ends turn) · absorb (heals, ends turn).
- Knowledge: your side learns `knows[type][el] = tier` for everyone present when a hit lands or on Analyze; the battle shows
  the union (`knownTier`). Enemies keep `state.enemyKnows[unitKey][el]` for that battle only.
- Bosses: `bossDef = { hpMult, icons, dmgMult, phases:[{below, type, icons, line}] }` — below each HP fraction the boss
  becomes another monster type (new affinities/skills/icons).
- `ai.js`: `enemyChoose` (variety, exploit known weaknesses, avoid known nulls), `smartChoose` (auto battle + sims),
  `randomChoose` (sim baseline). `tuning.js`: all balance knobs.
