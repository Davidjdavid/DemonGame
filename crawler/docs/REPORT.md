# Hollow Spire — report for David

**Play it:** https://claude.ai/artifact/F1kjmrZPm3MfQ6ouMfk6Qw (New game starts in the hub; stairs north of the
entrance lead up.) Free movement: WASD walk, Shift run, click the view once and the mouse looks around (Esc gives the
cursor back), Q/E or ←/→ turn. H heals the party with your allies' skills, N toggles the corner minimap (button
top right), M opens the map, Esc the menu (Party, Items, Notebook, Settings — grid steps are still there under
Movement). In battle, click an enemy to attack it, or pick a command.

## What you get
- **A hub** (shops for weapons, armor and items that stock more as you climb; a healer that charges per HP and per
  revive; an inn to rest and save; a fusion room with a registry) and **seven floors**, 10×10 growing to 20×20,
  each introducing one gimmick and then combining them: doors → one-way doors → a dark zone → warps → launchers →
  a lock and its key → the boss floor. Every floor has a barred shortcut door near its up stairs that you open
  from the far side, so the run back up after a restock is roughly half the first trip.
- **Movement**: free first-person walking with FPS mouse look (your request), sliding along walls, doors that open as
  you reach them; the game's rules still run per cell (encounters, map, traps, stairs). Classic grid steps (180 ms,
  eased) are a setting. The view is meant to be read on its own: outlined wall panels, doors with frames (arrows on one-way doors, a bar on shortcuts, a padlock on locks),
  stairs, chests, signs for services, colour-coded areas, a compass and the floor/area name. The automap (M)
  fills in as you walk and shows what you've seen, faded (room shapes, but not the traps on their floors); dark
  zones don't map.
- **Combat**: press turns (weak/critical half an icon, miss/null two, repel/absorb end the turn, pass halves);
  six affinity tiers over physical, fire, ice, electric, wind, light, dark (+ almighty); enemies stand in a row
  with name, level, HP bar and the affinities your party knows; each element has its own effect on whoever it
  hits (both sides); attackers lunge, targets flash and shake; numbers and WEAK / CRITICAL / MISS / NULL / REPEL /
  ABSORB labels pop. Analyze, escape (odds shown), items, auto per recruit, "auto battle until something goes
  wrong", battle speed.
- **Knowledge, your design**: each recruit and the hero remember affinities they've seen, across battles; the
  battle shows what anyone in the party knows; fused monsters inherit both parents' memory; a recruit knows its own
  kind. Enemies start blind, try varied attacks, and once one sees a weakness (or a null/repel) they all exploit
  or avoid it for that battle only.
- **Negotiation**: a menu, no AI. 2-4 placeholder questions answered with stances ([Agree], [Disagree],
  [Flatter], [Joke], [Stay silent]); six hidden personalities like different stances; a demand (gold, an item, HP
  or MP) you can pay or refuse — greedy and hot-headed types sometimes take it and run. Outcomes: joins (mood high
  and its level ≤ yours), gives an item, leaves, or attacks with a free turn. The notebook records what each
  personality liked and shows hints on the answer buttons once you know a type's personality.
- **Growth**: hero +3 stat points a level (Esc → Party); recruits learn set skills; fusion by family pair and
  average level (capped at hero level + 3), choose inherited skills, five fusion-only monsters; registry
  re-summon for gold.
- **Saves**: at the inn, at save points, and an autosave on every floor change; a wipe retries from the newest.

## Balance (simulated)
Each first visit to a floor is a real fight (3-5 rounds) with weaknesses to find; a full party now survives five
fights in a row on a first crossing 87-98% of the time (5F, the hardest, 89%), and return trips after a restock
end in 1-2 rounds with little damage. The boss takes ~10 rounds and is won 89% of the time with good play (weakness
play, Analyze after each aspect change, Dispel/Weaken on its last aspect) and 6% by random play. A simulated
climb reaches level ~18-19 by the boss in ~110 fights. Full tables: PROGRESS.md.

## Playtests
Two AI playtesters played the real game through a text harness.
- **New game (docs/playtest-1.md)**: reached 2F; found that paying a demand could count as refusing (fixed), that
  the 1F → 2F step was steep (eased; talking now gives half EXP), that the join-level rule was hidden until you paid
  (now shown up front). Negotiation was learnable in 1-2 answers and recruiting clearly mattered.
- **Upper floors + boss (docs/playtest-2.md)**: 4F and 7F on target; 5F/6F were brutal over several fights because
  healing and MP ran out (fixed: field healing with skills, MP back while walking, smarter auto healing, softer 5F,
  gentler ambushes); the hero had nothing to do against physical-resistant foes (he now learns Rally, Expose,
  Brace, Dispel); the boss could be auto-battled without noticing its aspect changes (auto now pauses, and its
  last aspect powers itself up until dispelled).

## Known limits
- Visuals are code-drawn placeholders (as asked): flat panels, simple monster shapes, no audio.
- Floors are generator drafts kept close to as generated (loot, names and links hand-set); they are mazy.
- No story, dialogue or ending text: placeholders like "[Question 3]" and "[Ending placeholder]".
- Lives in `crawler/` inside the DemonGame repo on branch `claude/charming-ride-udpk6u` (no new repo was attached);
  `git subtree split --prefix crawler` makes it its own repo.
