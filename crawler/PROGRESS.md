# Progress

Artifact (playable): https://claude.ai/artifact/F1kjmrZPm3MfQ6ouMfk6Qw
Publish: `npm run build`, then Artifact publish of `crawler/dist/index.html` (same path keeps the URL).
Branch: `claude/charming-ride-udpk6u` (folder `crawler/` inside the DemonGame repo; see DESIGN A1).

## Current stage
**Stage 6 — Balance and QoL** (IN PROGRESS, started Nov 20 ~23:45 UTC).
- [x] Playtest 1 (helper agent): new game from the hub, reached 2F → docs/playtest-1.md. Fixed: paying a demand
      scored as a refusal (bug), join rule shown before you pay, half EXP for talked-out enemies, 2F levels 3-5 and
      groups 1-3, gentler early enemy damage, Bronze Sword teaches Lunge, "Talk (mindless)", auto battle uses items
      only if allowed (Settings), HUD refreshes during shop/inn/healer; harness: numbered buttons + disabled marks,
      battle log, all map walls, side views, persistent saves (/save, /load)
- [ ] Playtest 2 (helper agent): presets f4-f7 + boss → docs/playtest-2.md
- [ ] Fix the top findings, re-run sims, republish, final report to David (docs/REPORT.md)

**Stage 5 — The full dungeon** (DONE, artifact v5).
- [x] Generator design tool (src/gen/, built by a helper agent): seeded rooms+maze floors with constraints (size,
      stairs distance, loops, dead ends, gimmick budget, shortcuts), metrics + score, a no-map explorer walk sim,
      top-down PNG renders, `node scripts/gen-floors.mjs` (60 candidates per spec → top 3 to gen-out/)
- [x] Frozen floors f1-f7 (`node scripts/freeze-floor.mjs gen-out/fN-1.js fN`): rank-1 candidates, hand-tuned on
      freeze (loot per depth incl. gold chests, area names, names/links/encounters from meta + encounters.js),
      validated; PNG maps in docs/floors/
- [x] Gimmicks introduced one per floor, then combined: 1F doors · 2F one-way · 3F dark zone · 4F warps ·
      5F launchers · 6F lock + key (all combined) · 7F boss floor (warning → heal → save → boss, lock, warps, dark)
- [x] Shortcuts on every floor (barred doors that open from the far side back toward the down stairs)
- [x] Hub stairs → 1F → … → 7F; boss + ending; e2e 50-climb
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

## Floors (frozen; metrics from gen-out/report.md)
| Floor | Size | Gimmick introduced | D→U first trip | With shortcuts | Loops | Dead ends | Explorer steps | Map |
|---|---|---|---|---|---|---|---|---|
| 1F Lower Halls | 10×10 | doors | 36 | 14 | 4 | 7 | 108 | docs/floors/f1.png |
| 2F Cistern | 12×12 | one-way doors | 48 | 24 | 5 | 10 | 154 | docs/floors/f2.png |
| 3F Foundry | 13×13 | dark zone | 49 | 25 | 5 | 14 | 231 | docs/floors/f3.png |
| 4F Gallery | 15×15 | warps | 69 | 32 | 6 | 14 | 191 | docs/floors/f4.png |
| 5F Archive | 16×16 | launchers | 61 | 26 | 7 | 11 | 216 | docs/floors/f5.png |
| 6F Belfry | 18×18 | lock + key (all combined) | 90 (102 with key) | 38 | 10 | 19 | 294 | docs/floors/f6.png |
| 7F Crown | 20×20 | boss floor | 91 (105 with key) | 52 | 12 | 23 | 279 | docs/floors/f7.png |

## Whole-climb sim (`node scripts/sim-dungeon.mjs --runs=12`; crude player: random recruits, simple play)
| Floor | Lv in | Lv out | Fights (first climb) |
|---|---|---|---|
| 1F | 1.0 | 3.5 | 5 |
| 2F | 3.5 | 6.3 | 8 |
| 3F | 6.3 | 8.9 | 11 |
| 4F | 8.9 | 10.8 | 9 |
| 5F | 10.8 | 12.6 | 10 |
| 6F | 12.6 | 15.3 | 13 |
| 7F | 15.3 | 17.1 | 11 |
Plus ~30-40 fights on restock walks down and back up (shortcut routes); ~100 fights per run in all. Gear tiers are
bought around their unlock floor. The crude sim player wipes often on 5F-7F (random recruits, no buffs); the per-floor
sims with sensible parties don't — the AI playtest decides. Boss 58-80% for this sim player.

## Balance table (smart policy; `node scripts/sim.mjs --both`)
| Scenario | Target | Win | Rounds (p90) | HP lost | MP used |
|---|---|---|---|---|---|
| F1 first, solo L1 | 2-4 hits, 2-4 rds, low risk | 96% | 3.9 (6) | 31% | 0% |
| F1, L3 + 1 recruit | 1-3 rds | 100% | 1.9 (3) | 4% | 8% |
| F2 first, L4 + 2 | 3-5 rds, real risk | 100% (random 98%) | 3.4 (5) | 16% | 16% |
| F2 return, L9 + 3 | 1-2 rds | 100% | 1.1 (2) | 1% | 5% |
| F3 first, L7 + 3 | 3-5 rds, real risk | 99% | 4.5 (7) | 28% | 27% |
| F3 return (restock run) L14 | 1-2 rds | 100% | 1.8 (3) | 4% | 10% |
| F4 first, L10 + 3 | 3-5 rds, real risk | 100% | 4.2 (7) | 25% | 9% |
| F4 return L15 | 1-2 rds | 100% | 1.6 (2) | 6% | 8% |
| F5 first, L13 + 3 | 3-5 rds, real risk | 97% | 4.8 (7) | 37% | 21% |
| F5 return L16 | 1-2 rds | 100% | 2.3 (3) | 8% | 17% |
| F6 first, L15 + 3 | 3-5 rds, real risk | 98% (random 79%) | 3.5 (5) | 24% | 21% |
| F6 return L18 | 1-2 rds | 100% | 1.9 (3) | 10% | 12% |
| Boss, L18 + 3 | 8-12 rds, winnable | 97% (random 18%) | 10.2 (15) | 52% | 58% |
Floor 1 solo groups are 1-2 enemies; groups of 3 start on 2F. Enemy HP/damage multipliers grow with enemy level
(tuning.js) so a full party still has real fights on first visits.

## David's feedback
### Nov 21 ~00:30 UTC (after playing the v5 build)
"I like what I played so far." Asked for, and built the same hour (artifact v6):
- Minimap toggle in the corner of the screen → a **Minimap** button top-right (and the N key); still off by default.
- Analyze as a skill the main character uses, not a menu option → the hero starts with **Analyze** (2 MP) in Skills.
- Don't ask before stairs → walking onto stairs takes them.
- Mouse camera / "full 3D motion" → **drag on the view to look around** (yaw ±180°, pitch ±70°); any move or turn
  eases the view back; double-click resets. Movement stays on the grid (see IDEAS.md for free movement).
- Map shows what you've seen, faded → cells in sight (through open edges, 4 steps, not through doors or into the
  dark) are drawn faded with their walls; objects (stairs, chests, counters) show faded; floor gimmicks (warps,
  launchers, warning tiles) stay hidden until you step there.

### Nov 21 ~00:45 UTC — free movement
David: "I meant I move and look and stuff no longer on a grid" and "No click and dragging. The mouse just moves the
cursor like a normal 3d first person game." Built (artifact v7):
- **Free movement is the default**: WASD walk/strafe, Shift runs, Q/E or ←/→ turn; collisions against thin walls
  and door jambs (world/freeMove.js, unit-tested); doors swing open as you approach from a side that can pass;
  locked / one-way (wrong side) / barred doors block you and say why.
- **Mouse look like an FPS**: click the view once to capture the mouse (pointer lock — browsers require that one
  click), then moving the mouse turns and tilts the view. Esc, battles, menus and shops release it; it re-captures
  after them when the browser allows, otherwise a hint asks for one click. Drag-to-look only as a fallback where
  pointer lock is unavailable (phones).
- Game logic is still per cell: crossing into a cell maps it, counts a step for encounters and triggers its feature
  (stairs, chests, warps, launchers, counters, boss). Compass shows the nearest direction; map arrows rotate freely.
- Classic grid steps remain as Esc → Settings → Movement → Grid steps (and `?grid=1`); test hooks still step by cell.

## Checkpoint reports
### Stage 5 — The full dungeon (artifact v5)
- Try: New game → walk north from the entrance to the stairs → 1F. Each floor's down stairs are where you arrive; the
  up stairs are far across it. Look for barred doors (green on the map) near the up stairs: lift the bar from the far
  side and the floor's shortcut opens for good. Chests hold items and gold; 6F/7F have a key chest for the lock.
  7F: a striped warning tile, a heal spring and a save crystal come just before the boss.
- The floors are rooms-plus-maze drafts from the generator, kept as generated except loot, names and links. They are
  dense and twisty (a turn every ~2 steps); the playtest will say whether that's fun or tiring.

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
- Arrow keys follow the brief (move/strafe like WASD); Q/E turn. (Free movement, the default since v7: ←/→ turn.)
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
- Generator rules added by the helper: key chests are never in a dark zone; dark zones never touch a lock.
- The test floor stays as a dev floor (`?floor=test`), outside the climb.
- Signs hide when you stand on their cell (they'd fill the screen).
- Negotiation is deterministic per personality (a fixed stance → mood table) so it's learnable; randomness is in
  which stances a question offers, the demand, and the take-and-run roll. Mood starts at 0 (+1 if the enemy is
  under half HP, +1 if you're 3+ levels above). Join at mood ≥ 4 and level ≤ yours; stronger enemies give a gift.
- A personality is revealed for a type after your first talk with it; stance results are shared across all types
  of that personality (notebook hints appear on the answer buttons).
- Talking uses the hero's action; an angry enemy ends your turn (its free attack). Recruits join with their
  current HP, at the level they were, and don't enter the current fight.
