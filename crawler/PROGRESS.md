# Progress

Artifact (playable): https://claude.ai/artifact/F1kjmrZPm3MfQ6ouMfk6Qw
Publish: `npm run build`, then Artifact publish of `crawler/dist/index.html` (same path keeps the URL).
Branch: `claude/charming-ride-udpk6u` (folder `crawler/` inside the DemonGame repo; see DESIGN A1).

## Current stage
**Stage 5 — The full dungeon** (next): generator + metrics + PNG previews (a background agent is building the
tool in a worktree), curated frozen floors 1F-6F + boss floor with gimmicks and shortcuts, roster placement, boss.

**Stage 4 — Hub** (DONE, artifact v4).
- [x] Full roster: 30 enemy types (5-6 per floor band), 5 fusion-only, 13 families (data/monsters.js)
- [x] Hub floor (data/floors/hub.js): weapons, armor, items, healer, inn, fusion counters, save point, stairs up
- [x] Equipment tiers unlocked by deepest floor reached; trade-in at half price; armor changes hero affinities;
      some weapons carry an element or a skill
- [x] Healer (1 g/HP, 2 g/MP, revive by level), inn (rest + save, or save only)
- [x] Fusion (growth/fusion.js): family-pair table, result by average level, cap hero Lv + 3, choose up to 3
      inherited skills, child inherits both parents' knowledge, fusion-only types, registry re-summon for gold
- [x] Saves: db + user capabilities (viewer's private subtree) + localStorage fallback; slots `main` (inn / save
      points) and `auto` (every floor change); compact map-memory packing; title screen Continue / New game;
      wipe → retry from the newest save
- [x] Exit Charm (Esc → Items) returns you to the hub
- [x] Tests 33 unit, e2e 40-hub (shop, fusion, inn save, reload + continue)

**Stage 3 — Party** (DONE, artifact v3).
- [x] talk/negotiation.js: 6 personalities (stance → mood table), 2-4 questions of 3-4 stances, one demand
      (gold / item / HP / MP; pay or refuse; take-and-run chance), outcomes join / gift / leave / fled / angry
- [x] Talk panel in battle (hero only; mindless types can't): mood pips, reactions ▲/▼, notebook hints on
      answer buttons once you know the type's personality
- [x] Recruits: party of hero + 3, stock of 5; Esc → Party: move to stock/party, auto on/off, release
- [x] Notebook tab: per personality what each stance did, paying/refusing, which types have it; known affinities
- [x] Recruits know their own kind; everyone present learns; enemies' battle memory shown on your cards ("seen:")
- [x] Tests 25 unit, e2e 30-talk

**Stage 2 — Combat solo** (DONE, artifact v2).
- [x] Engine (combat/battle.js, adapted from DemonGame): press turns, 6 affinity tiers, crits, buffs/debuffs, heals,
      revive, items incl. elemental shards, analyze, escape odds, multi-icon units (bosses)
- [x] Knowledge: party members' persistent `knows[type][el]` (union shown in battle; recruits know their own
      kind); enemies share what they see of you for that battle only and exploit/avoid it; they try varied elements
- [x] Policies: enemy AI, smart auto policy (revive > heal > weakness > pass to a partner with a weakness),
      random policy; sims `node scripts/sim.mjs --both`
- [x] Battle screen: enemy figures in a row (name, level, HP bar, affinity chips), party cards, press-turn icons,
      command menu with targeting + predicted WEAK/NULL/? tags, per-element effects, damage numbers + labels,
      lunge/flash/shake, auto battle with stop conditions, speed 1/2/4×
- [x] Random encounters (15-30 steps, never < 5, ward, no identical group twice), EXP/gold/level-ups,
      stat points (Esc menu → Party), field items, heal spring, wipe → retry from floor-entry snapshot
- [x] Unit tests 18, e2e 10-explore, 20-battle, 25-wipe

**Stage 1 — Movement and view** (DONE, artifact v1).
- [x] Floor format + parser, movement rules (doors, locks, one-way, shortcuts, warps, launchers), map memory
- [x] Validator (state BFS over keys + shortcuts: goal reachable, no softlocks, can always get back down)
- [x] Three.js view: outlined wall panels tinted per area, doors with frames (variants for lock / one-way /
      barred shortcut), stairs, chests, warp, launcher, save, heal, warning, boss, exit, shop counters + signs
- [x] Smooth steps (180 ms) and turns (170 ms), bump animation, door opening, warp flash, launcher slide,
      dark-zone fog
- [x] Automap (M), optional corner minimap (Esc menu, off by default), compass, floor + area name
- [x] Unit tests (9) + e2e `10-explore`
- [x] Published Stage 1 (artifact v1, Nov 20 ~22:55 UTC)

## Next steps
Stage 5: merge the generator worktree branch; generate candidates for 1F-7F, pick + hand-tune + freeze them in
data/floors/f1..f7.js with encounter tables per the roster bands; shortcuts back toward the stairs; boss with a
mechanic; then a dungeon sim of the whole climb.

## Balance table (smart policy; `node scripts/sim.mjs --both`)
| Scenario | Target | Win | Rounds (p90) | HP lost | Hits/kill |
|---|---|---|---|---|---|
| F1 solo L1 vs 1-2 | 2-4 hits, 2-4 rounds, low risk | 100% | 3.5 (5) | 24% | 2.5 |
| F1 solo L3 vs 1-2 (all 6 types) | 2-4 hits, 2-4 rounds | 96% | 4.4 (7) | 31% | 2.3 |
| F1 L4 + 2 recruits | 1-2 rounds | 100% | 1.9 (3) | 3% | 1.7 |
| (random policy, same rows) | | 99% / 92% / 100% | 3.4 / 4.4 / 2.1 | 25% / 36% / 5% | |
Floor 1 solo groups should be 1-2 enemies; groups of 3 wait for floor 2 / recruits.

## Checkpoint reports
### Stage 4 — Hub (artifact v4)
- Try: a new game starts in the Hub. Walk onto a counter to open it (WEAPONS / ARMOR / ITEMS along the north
  wall, HEALER west, FUSION east, INN north-east). Stairs up lead to the test floor for now (its down stairs
  come back). Shops stock more as you reach deeper floors. Rest at the inn to save; reload the page to see
  Continue on the title screen.
- Known: the test floor stands in for 1F until Stage 5; the deeper roster isn't placed on floors yet, so fusion
  results above floor-1 types are only reachable by fusing.

### Stage 3 — Party (artifact v3)
- Try: in a fight press Talk (4) and pick an enemy. Answer the [Question] placeholders with stances, then pay or
  refuse its demand. Gloomy (Slime) likes [Agree] and [Stay silent]; timid (Gnawer) likes [Stay silent]; cheerful
  (Wisp) likes [Joke]; hot-headed (Dustmoth) likes [Disagree]; greedy (Imp) wants to be paid and may run off with it.
  Husks are mindless. Recruits fight on AUTO by default (toggle on their card or in Esc → Party).
- Known: Fusion, shops and saving come with the hub (Stage 4). Recruits can't be swapped mid-battle.

### Stage 2 — Combat solo (artifact v2)
- Try: walk around the test floor; fights start every 15-30 steps. You start with Medicine and one Fire, Ice
  and Wind Shard: a shard on a weakness leaves a blinking half icon (a free extra action). Analyze fills in an
  enemy's chips for everyone. Escape shows its odds. R = auto battle (stops if someone falls, you drop under 30%
  HP, an attack is blocked or the enemies find a weakness). Speed button top right. Esc → Party to place stat
  points after a level-up (★ on the HUD).
- Sims: see the balance table.
- Known: Talk is greyed out until Stage 3; no recruits yet, so the party-only parts (auto toggles, passing to
  a partner) show in sims/tests only.

### Stage 1 — Movement and view (artifact v1)
- Try: WASD / arrows walk and strafe, Q / E turn, M map, Esc menu (corner minimap toggle). The test floor has a
  door, a one-way door (blue, arrow), a barred shortcut (opens from the north side only), a brass lock (key in the
  chest in the middle room), a warp pair (pink rings), a launcher (cyan arrow pad), a 3x3 dark zone and four
  colour-coded areas.
- Tests: 9 unit tests (parser, edges, one-way, shortcut, lock, warp, launcher, map memory, validator incl. a trap
  case) + e2e 10-explore (real key presses, gimmicks, chest, map, minimap).
- Known: stairs aren't connected (single floor); no encounters yet.

## Decisions
- Lives in `crawler/` on the session branch (no new repo was available). DESIGN A1.
- Three.js (npm, bundled by esbuild, minified ~530 KB) rather than a raycaster: thin walls, doors and objects are
  simple meshes; flat canvas textures with dark outlines keep edges readable.
- Camera sits 0.8 behind the cell centre (cell = 2 units, walls 2.2 high, FOV 68): you see the walls beside you
  and a wall in front never fills the screen. Turning orbits the cell centre slightly.
- Floors are ASCII maps (thin edges between 1-char cells) + a small legend; rock cells auto-wall themselves.
- Shortcut doors: open from one side only, then a normal two-way door for good (saved in floor flags).
  One-way doors stay one-way. Locks stay unlocked once opened (keys aren't consumed).
- Dark zones: dense black fog (about one cell of view) and the automap doesn't record those cells or show you.
- Arrow keys follow the brief (move/strafe like WASD); Q/E turn.
- Chests open when you step on them.
- The game is single-theme dark on purpose (a game screen), named "Hollow Spire".
- Combat numbers: enemies have 0.6× HP and deal 0.55× damage relative to the shared formula (tuning.js); bosses
  set their own multipliers. Elemental shards are fixed-power consumables so a solo hero can still play weaknesses.
- Light and Dark are ordinary damage elements (no instant kills).
- Analyze costs one action (a full icon, or the half icon if that's what's left).
- A failed escape costs one icon (not the whole turn).
- Any party member can use items; only the hero talks.
- Auto battle stops when: an ally falls, the hero < 30% HP, one of your attacks is nulled/repelled/absorbed, or the
  enemies discover a weakness.
- Currency is "gold". Hero is named "Hero".
- Hub stock unlocks by deepest floor reached (so the next armor tier appears when a restock trip can afford it);
  buying gear trades the old piece in at half price.
- Fusion chart is a fixed rotation over the 13 families (never a parent's family); good enough as placeholder data
  and every family (and every fusion-only type) is reachable. Child = lowest family member at ≥ average level + 1.
- Saves go to the viewer's private db subtree (`data/users/<id>/save-main|save-auto`) and localStorage; the newest
  of the two wins on load. The rng isn't saved (a loaded game gets a fresh seed).
- The hero has no magic (SMT I style); weapons can grant one skill while equipped.
- Negotiation is deterministic per personality (a fixed stance → mood table) so it's learnable; randomness is in
  which stances a question offers, the demand, and the take-and-run roll. Mood starts at 0 (+1 if the enemy is
  under half HP, +1 if you're 3+ levels above). Join at mood ≥ 4 and level ≤ yours; stronger enemies give a gift.
- A personality is revealed for a type after your first talk with it; stance results are shared across all types
  of that personality (notebook hints appear on the answer buttons).
- Talking uses the hero's action; an angry enemy ends your turn (its free attack). Recruits join with their
  current HP, at the level they were, and don't enter the current fight.
