# PROGRESS

Artifact (the playable game): https://claude.ai/artifact/Vo3R1RPYKAMAQGD3edcyCv
Publish: `npm run build`, then Artifact publish of `dist/index.html` (same file path keeps the URL; from a new
session pass the URL as `url` and read it first). Declared capabilities: `sample`, `db`, `user` (omit
`capabilities` on redeploys to keep them). Images go up as `files` (`assets/...` paths).

Hourly work check: scheduled task `trig_014UbhsRmL6FZcyks7cxZh4Y` — ENABLED (Stage 6 runs until the final report is
with David; disable it with update_trigger enabled=false only then).

## Current stage
**Stage 6 — Full prototype** (started Nov 19 18:40 UTC). David: "Run for as long as you need. Days even. I want a
prototype that will sell me that this is something you can do. A good story, art found online, good gameplay,
varied monsters that seem fun... make real decisions and affect the plot and get an ending based on what I would do
based around the central theme of the game." Optional: an AI playtester's report.

GitHub: pushes to `main` work. The artifact also carries a git-bundle backup (see Backup below).

### Stage 6 milestones
- M0 DONE: art (9 Kenney CC0 packs → assets/tiles, fx, sfx; src/data/tiles.json 278 names; autotiler in
  src/world/autotile.js), story (src/data/story/: bible, 43 scenes, 6 NPC cards, items; src/data/maps/: ward,
  tunnels1-3, source; validator `node scripts/check-story.mjs`), 30 signature moves (src/data/signatures.json).
- M1-M4 DONE (engine, NPC talk, finale director + ending with verdict/fates/reflections/coda, battle presentation).
- M5 DONE: signature moves (★ in battle), talk-changing armor.
- First playable published: artifact v11 (Nov 19 ~19:40 UTC). Story e2e: e2e/scenarios/90-story-run.cjs.
- M6 playtest 1 DONE (docs/playtest-1.md: "yes, but not yet"; 58 min; grindy middle, Undergate spike, missed
  return-trip payoffs, UI bugs). All top-10 items fixed (engine/UI by lead, story/data by agent) → artifact v12.
- M6 playtest 2 DONE (docs/playtest-2.md: "closer to yes"; Dario route, Breach ending, ~30 min clean but 3 game
  overs). Fixes (engine, commits 2fe911e + 56caa83): autosave on every floor change + "Retry from the last floor" on
  game over; Bead of Return (revive, Charon + shops); Harness down to 2 weaknesses (Phys, Fire) and the shop explains
  weak/resist; EXP x1.6; random encounters capped at your level +1; protagonist learns Glint (7), Cleave (8),
  Restore (10); no talk opener after a scene (skipOpener); demons too strong to join don't make demands, placed ones
  stay on the map; join odds use the mood after this message; Harness bonus on compliments too; a boss can only be
  talked down with a real key (story items/truths); NPCs can take key items (Teo keeps the wrench); Journal shows
  who told you what, "Something doesn't add up" for provable lies, and lies you caught; Journal "What you've done"
  shows readable decision records (choice.record); used keys leave the bag, key items can't be sold; Compendium lists
  demons you fought; camera stops at map edges; status bar refreshes live; flirts/outfit_talks meters +
  flirted_<id> flags; the ending names the demon who fought beside you most; scene choices can heal (soup).
  Story/data fixes (agent, running): records on choices, Ines/Pell after the soup note, lies caught by the player not
  by scenes, stray ending line, Dario fate + flirt/outfit/lie reflections, Gonggong not bought with gold, openers.
- Also since playtest 2: CC0 music (Ward/ending: Ruined City Theme by Cleyton Kauffman; tunnels: Dungeon Ambience by
  yd; battles/boss: Juhani Junkala's Retro Game Music Pack, all OpenGameArt) with a Sound toggle; hidden meters for
  stat build and who you sought out first; Continue loads the newer of save/autosave; talk screens never open empty.
  Published as artifact v13/v14 (Nov 19 ~22:00 UTC). Gonggong's portrait is now the serpent-bodied 人面蛇身 plate from Hu
  Wenhuan's illustrated Shan Hai Jing (PD), re-toned as ink on paper (new `paper` option in the image pipeline,
  which also no longer drops non-portrait credits).
- M6 playtest 3 DONE (docs/playtest-3.md: "very close to yes"; backed Ines + sided with Teo; The Engine and The
  Plug). Engine fixes (commit 3ba0306): fights go on while a demon stands (bag + escape for demons, Bead revives
  the protagonist, he gets up after a win); every demon speaks first unless a scene opened; no walking off on its
  own question + placed demons more patient; Journal "doesn't add up" only after the claim was heard (lie
  claimFact, or anything heard from that person); fates merged per person; first-LEADER meter; no randoms 4+
  levels below you; fusion reach +3; demons above your level name no price; UI nits; mock keyword stems.
  Story/data fixes (agent, running): leaders answer you, missed lies cost in play, Pell home on screen, Bel and the
  kettle, encounter rates -35% in the Cistern/Approach.
- Playtest-3 story fixes landed (commit 4582024) + engine follow-ups (9a12d32: placed demons' leftFlag, mugs meter,
  finale asides like "Pell, go home"). Published artifact v16 (Nov 19 ~23:40 UTC).
- Final checks DONE: playtest 4 (docs/playtest-4.md, "close to yes", all 8 targeted checks pass) and live-prompt
  dry run 2 (docs/live-dryrun-2.md; 11 findings, fixed in 0ed8bfb). Playtest-4 fixes in db5444e: randoms never
  above your level, checkpoint autosaves (scenes/chests/levers/doors) + Retry at half health, prices stated before
  joining, mid-battle talk keeps a story demon's scene, map onEnter scenes, Journal attributes scene claims.
  Published artifact v17 (Nov 20 ~00:15 UTC). docs/REPORT.md is the report for David (final pending playtest 5).
- Playtest 5 RUNNING: full regression run on v17 (walk past / Hester / mercy / talk Gonggong down) →
  docs/playtest-5.md. Then: fix regressions, publish, send David the report, mark Stage 6 DONE, disable the
  hourly task.
- M7 next: land the playtest-3 story fixes, publish, a short final check (playtest 4: a fresh player, first 15
  minutes, live-style talk), then the final report to David (docs/REPORT.md) and disable the hourly task.
- Engine fields from the story agent now supported: objectives[] (showIf/doneIf/where), finale.tooLate,
  facts[].supersedes, merchant shops (name/keeper/scene/stock/priceMult/armor), boss talkMood, demon entities,
  boss winFlag/talkFlag/talkNote, choice give/take/learn.

The story (from the bible): the Ward sits on the bricked-over River Sallow; Teo wedged the Undergate open for his
turbine; Gonggong and his demons came up; the council walled the Ward in. Ines (seal it), Teo (bind the god to the
turbines), Hester (give the river its bed back), Dario (blow the wall), Bel (neutral shopkeeper). Lies: Ines (her
son Pell got out), Teo (the gate failed from age), Dario (his sister waits outside), Furfur (Pell drowned). Early
standoff: Ines vs Dario over the charges. Fixed event: the Undergate fails. Six outcomes; promising 3+ factions
locks you into Everybody's Man / High Water.

North star: docs/DAVID.md. Behavior meters the engine bumps: talks, recruits, mercy (peaceful talk endings),
kills, fled, plus story.usage (which demons fight).

## Stage log
### Stage 0 — Setup (done 2026-11-19)
- DESIGN.md (original verbatim + Amendments), CLAUDE.md, PROGRESS.md.
- Scaffold: `src/**` ES modules, `scripts/build.mjs` (esbuild bundles to one inline script in
  `dist/index.html`), `scripts/serve.mjs` (local server, wraps the page like the platform does),
  `npm test` (node:test), `npm run e2e` (Playwright, `e2e/scenarios/*.cjs`).
- Published the artifact, then declared `sample` + `db` + `user`: accepted (contract 0.2.96).
- Network: created personal environment "DemonGame" allowing commons.wikimedia.org, upload.wikimedia.org,
  collectionapi.metmuseum.org, images.metmuseum.org, api.artic.edu, www.artic.edu, raw.githubusercontent.com.
  All reachable. Commons API answered 429 once without a descriptive User-Agent; use one + backoff.

### Stage 1 — Talking (published 2026-11-19, artifact v3)
Checkpoint report:
- Try: open the artifact, Approach a demon, Talk, and type freely ("quotes" = speech, anything else = action).
  - Ares (proud, into flirting): talk glory, take his blow, or flirt; asking him to join directly backfires; begging = he attacks.
  - Hephaestus (shy, married): ask about his craft; flirting puts him off; mocking his limp ends it; one hidden line recruits him.
  - Kappa (polite trickster): manners, nonsense, cucumbers; it may ask to "pop back to the river" — say yes and it's gone.
  - Tick "Demons are spoiling for a fight" to practice talking your way out of one. Field notes fill in on the hub.
- The first message asks you to allow the page to use Claude. If you decline, demons fall back to scripted replies.
- Combat is a placeholder until Stage 2 ("To the fight" just ends the encounter).
- Code: `src/talk/` (engine.js rules + dice, normalize.js clamps Claude's output, prompt.js live prompt,
  liveBrain.js / mockBrain.js), cards in `src/data/demons/*.json`, UI `src/ui/app.js`.
- Tests: 24 unit tests (`tests/talk.test.js`), 6 Playwright scenarios (`e2e/scenarios/`), all passing.

### Stage 2 — Combat (published 2026-11-19, artifact v4)
Checkpoint report:
- Try: hub → Arena → pick up to 3 demons → "Fight a random group" (2-3 demons, Lv 10) or "Fight the boss"
  (Gonggong Lv 14, 3 actions per turn, party Lv 12). Hit enemies with different elements to reveal their
  affinities (? → Weak/Resist/Null/Absorb/Repel); chain weaknesses and passes for extra actions (◆ full, ◇ half).
- Encounter "Fight", or a talk that ends in a fight, now starts a real battle (you + recruited demons vs him).
- Sim (`node scripts/sim.mjs [fights] [seed]`): normal fight, smart play, unknown affinities: win 95%, median 2
  rounds (mean 2.5); known affinities: 29% end before the enemy acts; random play wins ~71%; boss: median 8 rounds,
  smart win ~56%. A unit test asserts these targets (tests/battle.test.js).
- 75 learnable skills (`scripts/gen-skills.mjs` → src/data/skills.json); battle data per demon in
  src/data/battle.json (profile, tiers, skills); engine src/combat/battle.js; AI src/combat/ai.js.
- 9 battle demons: ares, hephaestus, kappa + willowisp, puck, golem, oni, anubis, gonggong (talk cards for the
  last six are being written; until then they fight but have placeholder names/portraits).

### Stage 3 — Growth (published with 4a, artifact v5)
- Owned demons are instances in `player.stock` (max 8; `inParty` marks the active 3) — src/game/demons.js.
- Leveling (src/growth/leveling.js): EXP to next = 30 + 12·L; demons learn `learns` (src/data/battle.json) up to
  prime = base + 6; past prime ×1.5 per level. Full slots (8) → `pendingLearn`, resolved in the Party screen.
  Protagonist: normal curve, +3 stat points per level (Party screen), HP/MP recomputed; copies one skill from a
  demon that has reached its last learn (once per demon).
- Fusion (src/growth/fusion.js, chart src/data/fusion.json): family pair → family; result = lowest member with
  base ≥ avg(parent levels)+1, else highest; above your level → greyed "???" and not fusable; inheritance auto if
  candidates ≤ free slots, else you pick. Parents go into deeds.fusedAway.
- Compendium (src/growth/compendium.js): auto-registers on recruit/fusion/level-up; re-summon costs 8·L²+100 gold.
- Saves (src/game/save.js + src/platform/storage.js): `db` doc `data/users/<id>/save-1` ({json}) when available,
  always mirrored to localStorage. Format {version, savedAt, player, world:{dungeon}}.

### Stage 4a — Dungeon loop (published 2026-11-19, artifact v5)
Checkpoint report:
- Try: Title → New game. Walk with arrows/WASD or the D-pad. Encounters: Talk (to any one demon), Fight or Escape.
  ¤ treasure, + spring (full heal, revives), $ shop (items + armor that sets your weaknesses), > stairs, ! boss.
  Party / Fusion / Compendium / Save are on the map header. 3 floors; boss Gonggong on floor 3 (talk or fight).
- In battle the protagonist can also use items, Talk to an enemy mid-fight (the talk's outcome comes back into
  the battle: recruited/left demons vanish, an angry one ends your turn) and Escape (not from the boss).
- "Test rooms" on the title keeps the Stage 1-3 hub (every demon, arena, rest).
- Demo balance (`node scripts/sim-dungeon.mjs`): start Lv 6 alone wins ~94% of floor-1 fights; floors 2-3 with
  recruits ~98-100%; boss (Lv 12, ×9 HP, 3 actions, ×0.5 dmg) vs a sensible Lv 10-12 party: 65-93% win, 7-10
  rounds; a party weak to water mostly loses (bring the right demons).
- Floors are generated by `node scripts/gen-dungeon.mjs` into src/data/dungeon/floors.json (hand-editable).

## Decisions
- Publish as a single bundled inline script (esbuild IIFE) rather than many module files: the artifact CSP
  guidance says to inline JS; source stays plain ES modules. Images are separate published files.
- Game look is a single committed dark theme (no light mode) — it's a game screen.
- Live talk uses the default model tier. (Design note: default tier "thinks" first, so replies can take
  5-60 s. If that feels slow, a settings toggle for the quick tier is a one-line change.)

- Talk is free-form text only (no option buttons), per David. Claude returns a JSON proposal (reply, moodDelta,
  matched ids, playerAct, attemptChance, demonAct, demand/gift, playerGives, ifFails). The engine clamps it and
  rolls dice for ask_join / mug / beg / trick / threaten; Claude writes both the success reply and an `ifFails`
  reply so one call covers either roll.
- Mood is -5..+5 (hidden). Offer-to-join honored at mood >= 3; gifts at >= 2; demon-started fights only at <= -1
  or after a hostile act or in a hostile encounter. Asking a proud/shy demon to join always fails and costs mood.
- Joining above your level: he lets you pass instead. Duplicate: he gives a gift instead.
- Kappa is flirt "n/a" (child-sized imp); Hephaestus "taken"; Ares "into it".
- Player starts Lv 10, 2500 gold, 3 Healing Salve, 2 Mana Tonic, 2 Cucumber, Wine, Honey Cake, Bronze Ingot.
- Currency is "gold" (placeholder name).

- Combat numbers (placeholders, tuned by the sim): HP = 6·L + 7·VIT + 30; MP = 3·L + 3·MAG + 10; stats from a
  per-demon profile with pool 10 + 4·L. Damage = power × (STR|MAG + L) / (VIT + L/2 + 20) × own-tier mult ×
  buffs × ±10%. Weak multipliers raised from the design table to -1: ×1.4, -2: ×1.6, -3: ×1.8 (more payoff for
  chaining). Crits only on Strength skills (5% + luck diff). Accuracy 0.9-0.98 ± agility.
- Skills: magic single 60/100/160 power (4/9/16 MP), all-target 46/76/120 (8/16/28 MP); physical paid in % HP.
  Level ~10 demons get mostly rank-1 skills (rank 2 one-shots same-level demons).
- Each side's turn starts with its first member (protagonist leads). Buffs tick down at the end of their owner's
  side turn. Debuffs roll once per cast (Support tier); a failed one is a MISS (2 icons). Failed revive = 1 icon.
- Bosses: hpMult / icons / dmgMult per fight (Gonggong test boss: ×10 HP, 3 icons, ×0.55 damage).
- Talking mid-battle isn't in yet (planned for the Stage 4a loop).

- Peaceful talk outcome in a group encounter: the remaining demons attack (you strike first).
- Losing a battle = game over screen (load / new game). Demon HP/MP persist between fights; the spring restores.
- New game: Lv 6, 800 gold, 3 salves, 1 tonic, 2 cucumbers, 1 honey cake, Traveler's Coat (no tiers).
- `?debug=1` exposes `window.__game` (e2e only); `?screen=hub` opens the test rooms directly.

## Known issues
- Live Claude can't be tested headless; David tests it in the artifact.

## Backup (while GitHub push is blocked)
The artifact carries `backup/demongame.bundle.b64.txt` (base64 of `git bundle --all`). Restore: Artifact read
with `path: "backup/demongame.bundle.b64.txt"`, `base64 -d file > demongame.bundle`, `git clone demongame.bundle`.

### Stage 5 — Polish (published 2026-11-19, artifact v10)
Checkpoint report:
- Battle: damage numbers, WEAK / NULL / MISS / CRITICAL / ABSORB / REPEL popups, hit flashes and shakes, blinking
  half icons, the acting member raised, portraits sized by each demon's display scale, target buttons that say
  "WEAK / NULL / ABSORBS / REPELS" once you know the affinity. All motion is off under reduced-motion settings.
- Menus: map header has Party, Items (use salves/tonics outside battle), Fusion, Compendium, Save, battle Speed;
  How to play on the title screen; field notes shown in the talk screen.
- Bug sweep (independent code review): one-time chests; the boss stays beaten; enemies can't revive demons that
  left through talk; a caster killed by a repelled hit stops hitting; failed rolls never end in a reward;
  null/aborted live replies don't cost a turn; mid-battle talk pays real HP/MP; field max HP includes passives.
  Rules that had crept into UI code moved to pure tested modules (src/dungeon/events.js, src/growth/rewards.js).
  `npm test` now runs ESLint (no-undef) first — it would have caught the one regression from the refactor.
- Final balance (full 30-demon roster): normal fights median 2 rounds (mean 2.6), 31-35% end before the enemy
  acts when you know their weaknesses, random play wins ~72%, boss median 8 rounds; dungeon floors on target.
- Tests: 84 unit (+ lint), 11 Playwright scenarios.

### Stage 4b — Roster to 30 (published 2026-11-19, artifact v8)
Checkpoint report:
- Try: New game; floors now draw from 7-11 demons each (no same group twice in a row). Test rooms list all 30.
  Fusion previews show the eight fusion-only demons (Talos, Oberon, Týr, Ptah, Loki, Hel, Asmodeus, Jörmungandr)
  as ??? until your level allows them. Image credits: title screen → Image credits (all 30).
- Data layout: talk card `src/data/demons/<id>.json`, battle `src/data/battle/<id>.json` (first ten in
  battle.json), mock `src/talk/mock/<id>.json`, extra items `src/data/items-extra-{a,b}.json`;
  `node scripts/gen-index.mjs` after adding files. 10 families × 3, levels 2-20, Fiend = Ars Goetia.
- Images: scripts/images/ (manifest.json, build-images.mjs, candidates.md with alternates). Weak picks worth
  revisiting: Golem (a sketch of a face), Gonggong (shown as a man; the snake-bodied woodcut is unlabelled and
  tiny), Hel (no PD half-corpse image), Basilisk (very wide). Wikimedia's upload host rate-limits hard; the
  pipeline uses commons thumb.php URLs instead.
- Tests: 80 unit, 11 Playwright scenarios; dungeon sim on target (floor 1 solo 99%, boss 7-10 rounds).

## Next
- Waiting on David. Candidates when he asks: armor that changes talking (IDEAS.md), an early "bad" demon and a
  Pixie-like early healer, revisit the weak portraits (Golem, Gonggong, Hel), talk quality from his live playtests.
