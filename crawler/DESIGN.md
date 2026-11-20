# Crawler — design

This is David's brief, verbatim (from ../docs/next-game-prompt.md). The **Amendments** section at the bottom overrides it.

## Goal

Build a fun, complete first-person dungeon crawler RPG that plays in a web browser with mouse and keyboard. The
focus is entirely on gameplay: exploring a well-designed dungeon and fighting with an SMT-style press-turn combat
system, recruiting monsters through a simple negotiation menu, and fusing them. A first clear should take 45–90
minutes. Don't spend time on story, dialogue or looks. Visuals are placeholders, good enough to read and play
instantly and no better.

Work autonomously and make reasonable calls yourself. Log decisions in PROGRESS.md and ask only when blocked.

## Who it's for: David

- He loves Shin Megami Tensei I, II and if... (SNES). He loves first-person exploration, random encounters, demon
  negotiation, press-turn style combat, recruiting, fusion, and a party that grows from weak and solo to strong.
- What he finds too retro in those games:
  - The minimap is easier to navigate by than the actual view.
  - Movement feels janky and snaps.
  - In battle you can't see how many enemies there are without reading a number.
  - Attack and spell animations are minimal.
- The loop he loves, from the first dungeon of SMT if...:
  1. A small hub floor with shops, a healer, an inn and fusion.
  2. Going up, the first enemies take a few hits to kill while you're solo.
  3. After a few recruits they die in a turn or two.
  4. Each floor up brings harder monsters.
  5. Near the top you've fused a few monsters, or gone back down to restock, buy new armor and rest.
  6. Then you run all the way back up with a filled-in map and stomp the middle and upper floors without taking
     much damage or spending much MP.

  The game must deliver this loop.
- In a previous AI-driven prototype of his, talking let you skip everything, so recruiting never mattered. Here,
  recruiting must matter: you need your monsters to survive.

## Not in scope (for now)

- No story, lore, dialogue writing or cutscenes. Use placeholder text such as "[Question 3]" or
  "[answer they like]" wherever writing would go.
- No live AI calls in the game. All game logic is plain code.
- No time on art or audio. Draw placeholder visuals in code from simple shapes and flat colors. Spend no effort
  making them pretty, only on making them readable.
- Monsters don't have to be demons. Simple placeholder names are fine (e.g. "Slime", "Wisp", "Brute").
- Don't copy any existing game's content: no names, text, art, or 1:1 map layouts. Genre mechanics are fine: press
  turns, negotiation, fusion, first-person grid movement. The attached SMT map is a reference for structure only.

## The dungeon: one full, hand-curated campaign dungeon

- **Structure:** one campaign, one fixed dungeon:
  - Entrance.
  - Hub floor: shops, healer, inn/save and fusion room. No encounters here.
  - Five or six combat floors going up.
  - Boss floor at the top, with a warning tile, a heal and save point just before the boss room, and the boss.
- **Grid:** a cell grid with thin walls on cell edges, Wizardry/SMT style, and doors on edges. Floors start around
  10×10 cells and grow toward about 20×20 at the top.
- **What makes a floor good** (study the attached map):
  - Up and down stairs are far apart, so each floor has to be crossed.
  - At least one loop per floor, so you're not always backtracking.
  - Dead ends and side rooms hold the treasure.
  - Gimmicks are introduced one per floor and then combined:
    - doors
    - one-way doors
    - dark zones (no map, no view beyond one cell)
    - warp tiles
    - a launcher/geyser that moves you
    - a locked door whose key is elsewhere on the floor
  - **Shortcuts that open on the way up**, such as one-way doors back toward the stairs. The run back up after a
    restock trip should be fast and satisfying with a filled map.
- **The generator is a design tool, not the final product.** Write a seeded floor generator with constraints for
  size, stairs distance, loops, dead ends and gimmick budget. Then:
  1. Score candidates with metrics: shortest path length, loop count, dead-end count, treasure placement, how often
     a straight run is broken up.
  2. Render each candidate as a top-down PNG like the reference map, so you and David can look at it.
  3. Simulate walking it.
  4. Keep the best candidates, hand-tune them, and **freeze them as data files**.
  5. Keep iterating on floors until they're fun to play, judged by playtests, not just metrics.
  6. A validator proves every frozen floor is solvable: stairs reachable, keys before their doors, no softlocks
     from one-way doors.

## Exploration

- **Movement:** grid steps with smooth animation (about 150–200 ms per step and per 90° turn). WASD or arrow keys
  move and strafe, Q and E turn. The mouse handles menus and targets.
- **The first-person view must be readable on its own:** clear wall edges, doors visibly different from walls, and
  distinct objects for stairs, chests, the healer and other features. Color-code areas a little so places are
  recognizable.
- **Map:**
  - An automap fills in as you explore and opens full-screen on M.
  - A small corner minimap is off by default (option to turn it on), so the view stays the main way to navigate.
  - Show a compass and floor name.
- **Random encounters:**
  - About every 15–30 steps, with variance.
  - Never within 4 steps of the last fight.
  - An item that wards off encounters for a while.
  - Enemy groups are drawn per floor from 4–6 types, with no identical group twice in a row.

## Combat: SMT-style press turns, made readable

- **Party:** the protagonist plus up to 3 recruited monsters fight. More recruits wait in stock.
- **Press-turn icons:** one per living party member each turn.
  - A weakness hit or a critical hit costs only half an icon.
  - A miss or a nulled hit costs 2.
  - A repel or absorb ends the turn.
  - Passing converts a full icon into a half icon.
  - Enemies follow the same rules.
- **Elements:**
  - physical, fire, ice, electric, wind, light, dark, almighty
  - support buffs and debuffs, and healing including revive
- **Affinity tiers:** weak, normal, resist, null, repel, absorb.
- **Everything visible:**
  - Each enemy is its own figure in a row with its name, level and HP bar. You count them by looking.
  - The party panel shows HP and MP bars.
  - Press-turn icons are on screen.
  - Damage and heal numbers pop up.
  - WEAK, CRITICAL, MISS, NULL, REPEL and ABSORB labels appear.
- **Animations on both sides:** each element gets a distinct placeholder effect on the target, whether enemy or
  party member, so you can tell them apart without reading:
  - fire: flickering orange burst
  - ice: cyan shards
  - electric: yellow zigzag
  - wind: green swirl
  - light: white rays
  - dark: purple blot
  - physical: white slash and shake
  - almighty: magenta ring

  Attackers lunge, and the target flashes and shakes.
- **Knowledge rules (David's design):**
  - **Your side:**
    - Each recruited monster remembers enemy weaknesses and affinities it has seen, across battles.
    - The protagonist has his own memory too.
    - In battle, the UI shows the affinities known by anyone in the current party.
    - A fused monster inherits both parents' knowledge.
  - **Enemies:**
    - They start each battle not knowing your weaknesses, and guess a bit with varied attacks.
    - Once any enemy has seen one of your weaknesses (or a null or repel), all enemies in that battle exploit it
      (or avoid it) for the rest of that battle only. They forget everything afterwards.
- **Auto battle:**
  - Each recruit has an auto toggle. In auto it chooses its own actions with a smart policy: press known
    weaknesses, heal when needed, avoid known nulls and repels.
  - There's also an "auto everything until the fight ends or something goes wrong" button.
  - Battle speed setting.
- **Other commands:**
  - attack and skills
  - items
  - pass
  - talk (negotiation, protagonist only)
  - escape (odds shown, a failure costs an icon)
  - analyze (reveals one enemy's affinities, costs a turn)
- **Defeat:** if the protagonist falls but a recruit stands, the fight goes on and recruits can revive him. A wipe
  sends you to game over with "retry from last save".

## Negotiation: a simple menu with real rules

- **Starting a talk:** the protagonist can choose Talk on his turn. Some enemy types never talk (mindless).
- **Personality types:** each enemy type has a hidden personality from about 6 types (e.g. proud, timid, cheerful,
  gloomy, greedy, hot-headed).
- **A talk:** 2–4 questions. Each question offers 3–4 answer stances as placeholder labels, e.g. "[Agree]",
  "[Disagree]", "[Flatter]", "[Joke]", "[Stay silent]".
  - The personality decides which stances raise or lower its mood.
  - The player learns these over time.
  - The game records what worked for each personality in a notebook.
- **Demands:** money, an item, HP or MP. You can pay or refuse. Paying helps, but some personalities sometimes take
  it and run. That risk is part of the fun.
- **Outcomes:**
  - The monster joins (mood high enough, and its level at or below yours).
  - It gives an item and leaves.
  - It leaves.
  - It attacks with a free turn.
- **Speed:** a whole negotiation takes under about 30 seconds of menu clicks.

## Fusion, growth and the hub

- **Fusion** (fusion room on the hub floor):
  - Combine two recruits into one.
  - The result comes from a family-pair table and the parents' average level.
  - You can't fuse a result more than a few levels above the protagonist.
  - You choose which of the parents' skills to inherit.
  - A preview shows the result.
  - Include a few monsters you can only get by fusion.
  - Optional QoL: a registry so you can re-summon fused monsters for money.
- **Growth:**
  - The protagonist and recruits level up from EXP.
  - Recruits learn set skills as they level.
  - The protagonist gets stat points to place each level.
- **Equipment:** the protagonist's weapon and armor come from shops and change his stats, and armor changes his
  affinities. Price the next armor tier so a mid-dungeon restock trip can afford it.
- **Hub services:**
  - weapons, armor and item shops: heal HP, heal MP, revive, return-to-hub item, encounter ward
  - a healer that charges per HP and per revive
  - an inn to rest and save
  - the fusion room
- **Saving:** at the inn and at save points on some floors, plus an autosave on floor change.
- **Returning to the hub:** a return-to-hub item exists, but there's no warp back up. The run back up through
  shortcuts is part of the loop.

## The difficulty curve to aim for (verify with simulations)

- **First combat floor, solo:** enemies take 2–4 hits and fights last 2–4 rounds. Not dangerous unless careless.
- **With 2–3 recruits:** typical fights end in 1–2 rounds, and a group can often be wiped before it acts if you
  know its weaknesses.
- **Each new floor:** new monster types that are a real fight the first time (3–5 rounds, real risk), with
  weaknesses to discover.
- **After a restock trip,** with knowledge, new gear and a fusion or two: mid and upper floors drop to 1–2 rounds
  with little damage taken or MP spent.
- **Boss:** 8–12 rounds, needs weakness play and buffs or debuffs, and has a mechanic, such as changing affinities
  or extra press-turn icons. Winnable at the expected level and party with clear but not trivial odds.
- **Level range:** roughly 1 to 15–20 by the boss.
- **Enemy roster:** about 24–30 types plus the boss, 4–6 new per floor, with a mix of affinities so every element
  matters somewhere.
- **Simulations:** write balance sims (smart policy vs random policy, per floor, at the expected levels and party)
  and keep these targets in a table in PROGRESS.md.

## Tech and testing

- **Stack:**
  - Plain JavaScript ES modules, bundled with esbuild.
  - Three.js (via npm) or a canvas raycaster for the 3D view.
  - Game rules in pure modules with no DOM, unit-tested with node:test.
  - UI in its own folder.
- **Delivery:** if the session can publish a claude.ai artifact, publish each checkpoint there so David can play in
  his browser. Otherwise use a static build he can open.
- **Tests:**
  - Unit tests for rules (combat, knowledge, negotiation, fusion, generator and validator).
  - Playwright headless runs for e2e.
  - Balance sims.
  - At later stages, an AI playtester driving the game through a small HTTP harness, writing an honest report
    against the curve above and David's taste.

## Reuse

The DemonGame repo has a tested SMT-style press-turn engine. Copy and adapt rather than rewrite if it fits:
- `src/combat/`: battle, affinity tiers, damage, enemy AI, items, revive, buffs
- its tests
- balance sims: `scripts/sim.mjs`, `scripts/sim-dungeon.mjs`
- `src/growth/` for leveling and fusion

Its first-person and dungeon parts don't exist; its dungeon generator (`src/dungeon/`) is a weak starting point.

## How to work

- **Files:**
  - **CLAUDE.md:** working rules.
  - **DESIGN.md:** this prompt, plus amendments.
  - **PROGRESS.md:** current stage, decisions, balance table, checkpoint reports. Update it at the end of every work
    block.
  - **IDEAS.md:** David's parked ideas.
- **Git:** commit and push after every working step.
- **Stages,** each ending in a playable checkpoint, a short report in PROGRESS.md, and then keep going without
  waiting:
  1. Movement and view on one hand-made test floor: smooth steps, readable view, automap.
  2. Combat, solo against a few enemy types: press turns, animations, numbers, analyze, escape.
  3. Party: negotiation and recruiting, auto mode, knowledge memory on both sides.
  4. Hub: shops, healer, inn and save, equipment, fusion.
  5. The full dungeon: generator, metrics and PNG previews, curated and frozen floors with gimmicks and shortcuts,
     enemy roster and curve, boss.
  6. Balance and QoL: sims against the targets, an AI playtest report, fixes, then a final report to David.
- **Keep working:** set an hourly scheduled check-in so work continues while David is away, and never sit idle with
  work left. Stop and ask only when genuinely blocked.

---

# Amendments

## A1. Where this lives (Nov 20)
No separate repo existed for this session, so the crawler is a self-contained folder `crawler/` inside the DemonGame
repo, on branch `claude/charming-ride-udpk6u` (the branch this session may push to). It has its own package.json,
docs and tests and shares no code at runtime with DemonGame; the combat engine was copied and adapted. It can be split
into its own repo with `git subtree split --prefix crawler`.

## A2. Placeholder art
Everything is drawn in code: Three.js meshes with canvas-generated flat textures (wall panels with dark borders,
doors with frames, signs with text). No image files.

## A3. Saves
Per-viewer saves via the artifact `db` + `user` capabilities (the viewer's private subtree), falling back to
localStorage. Three slots: inn/save point, autosave on floor change.
