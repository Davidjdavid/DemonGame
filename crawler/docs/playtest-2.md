# Playtest 2 — upper floors (4F-7F) and the boss, with the sim presets

AI playtester, Nov 21 2026. Harness presets `f4`-`f7` (the party, level, gear and gold the balance sims expect on a
first visit), seeds 21, 33 and 44, about 350 harness calls in all.

**Build note:** the code changed while I was testing. Commit b18492d (playtest-1 fixes plus harness changes) landed at
00:22 UTC, and there were uncommitted edits to combat/ai/skills. Everything below ran on build **d2ac4c8** except the
last 6F sample (seed 44, "6F run B"), which ran on the new harness with an in-flux `dist/`. Treat that sample as
indicative only.

## What I did
- **Floors:** 4F (7 fights), 5F (7 fights over two runs, 1 escape), 6F (5 fights over two runs), 7F (4 fights, then
  the boss). 23 random fights plus the boss.
- **Levels:** hero 10→11 on 4F, 13 on 5F, 15 on 6F, 17→18 on 7F (won the boss at 17).
- **Recruits:** 1 (Dire Wolf on 4F, by talking; it went to stock). No fusions and no restock trips (presets).
- **Deaths:** no wipes, but recruit KOs in 9 of 23 fights. Revival beads ran out on 5F and 6F.
- **Navigation:** on 4F I navigated by hand from the text view and map for about 30 calls. After that I used a BFS
  route planner over the floor data to stay within the call budget, so my navigation comments come mostly from 4F.
- **Fight style:** about half the fights manual (hero commands, recruits on AUTO), half with **Auto battle ▶▶**. The
  harness doesn't report round counts for auto fights that run to the end; those are marked "n/a".

## Per floor vs the curve targets
Target for a first visit: 3-5 rounds, real risk. Boss: 8-12 rounds, winnable with clear but not trivial odds.

| Floor | Fights | Avg rounds (measured) | HP lost / fight | MP used / fight | Danger | vs target |
|---|---|---|---|---|---|---|
| 4F (L10, Bog Jelly/Shrike/Thornling, Flame Brand) | 7 | 3.0 (range 2-5) | ~10% net (2 fights went to 1 HP and 20/118 before heals) | ~12 MP (~6% of the pool) | Moderate: 2 near-KOs, 0 KOs | **On target**, slightly easy |
| 5F (L13, Bloom Witch/Harpy/Watcher, Steel Sword) | 7 (+1 escape) | 7.8 (5, 4, **16**, 6; 3 n/a) | 33-45% | 40-96 MP; party MP-dry after 3 fights | **Very high:** recruit KO in 5 of 7, hero alone at 11/142 once | **Far over** |
| 6F (L15, Bloom Witch/Naga/Lich, Frost Edge) | 5 | ~4 for 2v4, **~16** for 4-enemy treant/thunderbird | 7% (Hellions) to ~45% | 39-89 MP | High: 2 fights with 2-3 recruits down | Mixed: 2-enemy groups easy, 4-enemy groups and ambushes far over |
| 7F (L17, Seraph/Thunderbird/Lich, Knight gear) | 4 | ~4 (3-6) | 4-18%, one ambush took the hero to 15/174 | 14-56 MP | Real but fair | **On target** |
| Boss: The Warden L20 | 1 | **7** | ended hero 82/174, Seraph 60/138, TB 76/130, Lich **5/142**; 1 Medicine | Thunderbird 84 of 96 | Moderate, nobody fell | Slightly under 8-12. Winnable, but didn't need buffs or debuffs |

### Why the sims say F5 is 97% / 4.8 rounds and play says otherwise
`scripts/sim.mjs runBattle` resets every party member to full HP/MP before each fight (line 42). A floor crossing is
3-5 fights in a row with no way to heal except items. The game has no field use of Mend / Mend All / Restore, and the
only heal spring is on 7F. I wrote a throwaway chained-fight sim on the d2ac4c8 code, not committed. It uses the same
smart policy, preset party and preset items (Medicine 4, Salve 2, Mana Drop 2, Revival Bead 1) and the real 10%
ambush roll. HP, MP and items carry over between fights; 300 runs × 5 fights per floor:

| Floor | Survive 5 fights | Wipes by fight #1-5 | Avg rounds by fight #1-5 | Avg KOs after fight #1-5 |
|---|---|---|---|---|
| 4F | 91% | 0, 1, 4, 9, 14 | 4.5 4.7 5.0 4.8 5.2 | 0.2 0.5 0.8 1.1 1.3 |
| 5F | **12%** | 0, 24, 63, 98, 80 | 4.8 6.6 7.4 8.4 7.7 | 0.4 1.0 1.8 2.5 3.2 |
| 6F | 44% | 4, 21, 30, 46, 67 | 4.0 4.1 4.7 5.6 5.8 | 0.2 0.6 0.9 1.4 2.1 |
| 7F | 59% | 0, 2, 14, 46, 60 | 2.9 3.2 4.4 6.6 8.7 | 0.1 0.2 0.5 0.9 1.4 |

The 5F first crossing (60 steps, about 3 fights) wipes the smart policy about 29% of the time. On 6F (about 101 steps
with the key, 4-5 fights) it's about 34% by fight 4. My hands-on 5F/6F play matched this. Fight 1 is roughly what the
balance table says; fights 2-3 spiral as Bloom Witch dies, MP runs out and the beads are gone.

### Boss odds at the preset (same throwaway sim, 300 runs, d2ac4c8)
- Preset f7 (L17, preset items): **93% win, 10.0 rounds avg, p10 6 / p90 16**, 56% HP lost, 1.2 KOs at the end.
  Phase changes at rounds 2 and 5 in the first run.
- The PROGRESS boss scenario (L18, more items): 95%, 10.2 rounds, the same spread.

The average is on target but the spread is wide: 6 to 16 rounds. My 7-round win was in the fast tail.

### 4F Gallery (preset f4, seed 21)
- **Fights:** 2× Bloom Witch (3 rounds) · Harpy + Watcher (~3) · 2× Dire Wolf + Mantis (4; Shrike to 1/74) ·
  Mantis + Dire Wolf with a talk (2) · 2× Bloom Witch (auto, ~2) · Mantis + Dire Wolf again (2) ·
  2× Mantis + Shellback (5; hero to 20/118).
- **Weakness play** mattered, but it was always the same button. Bloom Witch, Dire Wolf and Mantis are all fire-weak,
  and the hero's **Flame Brand** made fire every normal attack. The smart policy then has the recruits Pass to the
  hero, so the hero did almost all the damage. Bog Jelly's ice was nulled by Shellback, and nobody had electric for
  Shellback (PhyRe IceNu ElcWe), so that fight was a 5-round grind.
- **Navigation (by hand):**
  - Readable: the text view's ahead/left/right line and the "looking ahead" corridor list (openings, doors, features).
  - Hard: the old harness map draws only north/west walls and only cells you've stood on. I couldn't tell room exits
    apart and walked into the closed NE room (10-13, 1-4) twice.
  - The warp at (14,8) took me to the NE wing without warning, because I wasn't facing it when I stepped on.
  - I can't judge the 3D view through the harness.

### 5F Archive (preset f5, seeds 21 and 33)
- **Run A, manual:**
  - 2× Acid Ooze (PhyRe IceWe): 5 rounds. Only the Watcher has Frost, about 17% per weak hit. Bloom Witch KO'd.
  - 3× Naga, after an ambush: 4 rounds. Bloom Witch KO'd again; enemies healed a Naga from 39% to 55%.
  - 3× Iron Golem (PhyRe FirNu IceNu ElcWe): **16 rounds**. Harpy and Watcher fell by round 7, then the hero alone at
    5-17% per hit, ending on **11/142 HP**.
- **Run B, Auto battle:**
  - 2× Wraith + Acid Ooze: won, 45% HP and 96 MP gone.
  - 2× Naga: 6 rounds, Bloom Witch KO'd.
  - 2× Wraith: won, but the party ended at MP 3/15/16.
  - Iron Golem + Naga: Bloom Witch KO'd and Watcher at 0 MP, so I **escaped**.
- **Bloom Witch** (98 HP, the party's only healer) died in 4 of the 7 fights. The smart policy only heals below 40%
  HP (ai.js:120), and she went from ~45% to 0 in one enemy turn three times.
- **Shortcut:** on the way down from U (1,5) the barred door lifts with "You lift the bar. A shortcut opens!". U→D is
  25 steps against 60 on the first trip, which is clear and worth it. Even that short run cost a fight and an escape
  with a drained party.

### 6F Belfry (preset f6, seeds 21 and 44)
- **Seed 21:**
  - 2× Hellion: easy, 7% HP.
  - 2× Naga + Dread Knight: Bloom Witch KO'd.
  - 4× Hellion (FirAb LgtWe): Bloom Witch (fire-weak) and Lich down by round 2; won around round 4 with hero + Naga.
- **Seed 44 (new build):**
  - 2× Elder Treant: 29% HP, 84 MP.
  - 2× Elder Treant + 2× Thunderbird, an **ambush**: Bloom Witch dead before my first input, all three recruits down
    by round 5, won around **round 16** grinding the last Treant (fire-weak, and nobody in the party has fire).
- The key detour is needed: no route to U without the Brass Key at (2,4). D→key→U is about 101 steps, which is 4-5
  fights at this rate.

### 7F Crown and the boss (preset f7, seed 21)
- **Fights:**
  - 2× Gazer: 18% HP.
  - 2× Hellion: easy.
  - 3× Wraith: hero to 40/174.
  - Wraith + 2× Thunderbird, an **ambush**: hero to **15/174** by round 3. The expected Knight Plate makes the hero
    **electric-weak**, on the floor with Thunderbirds.
  - Lich never spent MP in three 7F fights (Wraiths and Hellions resist or absorb dark).
- **Route:** key (8,13) → revival beads (19,13) → save (18,5) → heal spring (18,4) → warning (18,3) "A heavy presence
  lies beyond" → door → boss. The heal spring fully restores and the save point saves on stepping. Good pacing.
- **Boss:**
  - **Rounds 1-3, manual.** Analyze showed aspect A: PhyRe FirAb IceWe LgtRe. Only Lich has ice (about 4% per weak
    hit); the hero's Attack and Whirlwind Cut are both physical, about 1-2% per hit. Roughly 5% per round.
  - **Rounds 3-7, Auto battle**, from 81% to dead with no further input. Aspect B (elec-weak) melted to Thunderbird's
    Thunderbolt-tier spells and aspect C (light-weak) to Seraph.
  - **Readable?** I couldn't judge the aspect-change lines: the harness only shows the last message, and Auto battle
    never stopped at a change. The affinity chips do reset to `?` (all `?` at round 7), which is the visible signal.
  - **Design problem:** the expected party covers exactly A/B/C (Lich ice, Thunderbird elec, Seraph light) and Auto
    battle handles the swaps. The mechanic doesn't ask the player to read anything, and buffs/debuffs weren't needed.
    The party has no buff skills: Lich's Expose is the only debuff, and the hero has none.
- **Ending screen:** "5 battles, 0 escapes, 0 recruited, 0 fused, about 7 minutes". The counts were right for this
  session.

## Negotiation
- I had one talk, on 4F, with a Dire Wolf L10 (my level).
- **The talk:**
  - The questions were the placeholder lines "[Question 1]", "[Question 9]" and so on.
  - [Agree] got "dislikes that ▼". [Disagree] showed no reaction before the demand (130 gold).
  - Paying got "likes that ▲". From then on the answer buttons showed ▲▲ and ▼ hints, so the hints work after one
    exchange.
  - The header still said "Personality: unknown" while the hints were showing.
  - Two more [Disagree] answers and the wolf left the fight. The harness never showed a "joined" line; it was in
    stock (Esc → Party: "stock 1").
- **Learnable?** Yes. Fast and readable once the hints appear.
- **Did recruiting matter?** The presets hand you the party, so I can't judge recruiting itself. **Party composition
  decided every hard fight:**
  - 5F Golems/Oozes with one ice/elec caster: 16 rounds.
  - 6F Treants with no fire: 16 rounds.
  - 7F and the boss with full coverage: on target.

  So recruiting the right elements matters a lot. Losing a recruit mid-floor (no field revive, few beads) is the main
  way runs fall apart.

## Bugs and confusing moments (game)
1. **Attrition isn't balanced, and the sims hide it.** Each sim fight starts at full HP/MP; real crossings chain 3-5
   fights with no healing except items. Repro: preset f5, walk D→U with Auto battle. By fight 3 the party is MP-dry
   and the healer is dead.
2. **No field casting of healing skills.** Esc → Party lists Mend / Mend All / Restore but has no Use. HP comes back
   only from items, the 7F spring or the hub.
3. **The auto policy lets fragile healers die.** It heals below 40% HP (ai.js:120). Repro: preset f5, fight Nagas or
   Oozes on Auto. Bloom Witch sits at 44-45% for a turn and dies (4 of 7 fights).
4. **Auto allies spend shared items unasked:** Salves, Medicine and a Revival Bead were used by recruits on auto.
   Repro: preset f4, fight 2× Dire Wolf + Mantis with recruits on AUTO; Salve 2→1 without a hero action. b18492d adds
   an auto-items setting, which I haven't tested; check its default.
5. **Ambushes (10%, main.js:51) on 5F-7F groups of 3-4 KO a recruit before the first input** (6F seed 44, second
   fight; 5F Naga fight; 7F Wraith + 2× Thunderbird). In-game there's an "Ambush!" line, but the result is often a
   dead recruit with no counterplay.
6. **The hero's kit is physical-only on upper floors.** Flame Brand has no skill (Skills is disabled on 4F); Steel,
   Frost and Knight blades give one attack skill each. Many upper types resist or null physical: Ooze, Golem, Mantis,
   Shellback, Wraith, Treant, and the boss in aspects A and C. Against the boss the hero's best move is Pass or an
   item.
7. **Knight Plate (expected 7F armor) gives electric weakness on the Thunderbird floor.** Repro: preset f7, meet
   Wraith + 2× Thunderbird; the hero drops 174→15 in 3 rounds.
8. **The boss fight is run by Auto battle.** The default party matches every aspect and auto picks the right element
   after each change. It's 7-16 rounds depending on luck (sim p10 6, p90 16), and buffs/debuffs aren't needed.
9. **No battle-end summary** (EXP, gold, level-up, "joined" / "left"). The last line is a combat message such as
   "Hero attacks on Bloom Witch." (also a grammar slip: "attacks on").
10. **Talk header keeps "Personality: unknown"** after the notebook hints appear on the buttons.
11. **Identical group twice on 4F:** "Mantis L11 + Dire Wolf L10" in fights 4 and 6, one fight apart. Minor; the
    rule may only forbid back-to-back repeats.
12. **Enemy buffs aren't visible in the enemy row.** In the 3× Iron Golem fight the hero's damage fell from ~17% to
    ~5% per hit with no indicator in the harness text; party debuffs (ATK▼, AGI▼) do show. Possibly a harness gap.

Nothing blocked progress. The 6F and 7F locks need their keys, the keys are reachable, and the validator's claim
held.

## Top 10 fixes (game), most important first
1. **Balance attrition, not single fights.** Add a chained-fight sim (HP, MP and items carried across the expected
   number of fights for a first crossing, with the 10% ambush) and put it in the PROGRESS balance table. Target, for
   example, ≥85% survival of a first crossing on every floor. Today it's 5F 12% / 6F 44% / 7F 59% over 5 fights.
2. **Let recruits cast healing and revive skills from Esc → Party** (SMT does). Or give a small MP trickle per step.
   Either removes most of the 5F/6F death spiral without touching enemy stats.
3. **Flatten the 5F spike:**
   - Fewer three-golem groups: Iron Golem's PhyRe + FirNu + IceNu leaves only electric.
   - Lower golem/ooze HP, or cap 5F groups at 2-3 with 3 rare.
   - Alternatively, make sure the expected F5 party has two elemental attackers. Today Watcher is the only
     ice/electric source.
4. **Fix the smart-policy heal threshold:** heal at <50-55%, or when expected incoming damage can kill. Revive the
   healer first. That policy drives both Auto battle and the sims.
5. **Soften ambushes on deep floors:** 5% instead of 10%, no ambush for groups of 4, or enemies get half icons on an
   ambush turn.
6. **Give the hero a role against physical-resistant upper enemies:** an elemental skill per weapon tier (Flame
   Brand → a fire skill), or a few hero support skills (buffs, debuffs, Dispel). That also gives the boss's
   "needs buffs/debuffs" target something to bite on.
7. **Make the boss mechanic matter and narrow its spread:**
   - Aspect A is slow (one ice user) and B/C melt in about 4 rounds.
   - Shift HP toward B/C, or give C a mid-fight buff (Rally) that must be debuffed or Dispelled.
   - Make Auto battle stop once at each aspect change, so the player sees "The Warden turns to ice and wind!" and the
     reset chips.
   - Aim for 8-12 rounds with p90 ≤ 13.
8. **Knight Plate:** drop the electric weakness, or move it to an element 7F doesn't use. 7F has Thunderbirds, and
   the boss's aspect B casts ice and wind.
9. **Don't let auto recruits spend consumables by default** (or only Medicine below 25% HP). Check the new
   auto-items setting's default.
10. **Readability pass:**
    - A battle-end summary (EXP, gold, level-ups, joined / left / escaped).
    - Enemy buff/debuff markers on enemy figures.
    - "Personality: <type>" once learned.
    - "Hero attacks Bloom Witch".
    - On 4F, make one common type not fire-weak, so weakness play isn't just "the hero attacks".

## Harness / tooling problems (separate from the game)
- **Stopping a harness with `pkill -f "port=8772"` (SIGTERM) doesn't stop it.** Playwright closes the browser on
  SIGTERM but the node process keeps serving HTTP and holding `--webport`. The next preset then dies with
  `EADDRINUSE`, and the old port answers "Target page, context or browser has been closed". Use `kill -INT`, which
  the harness handles, or make the harness exit on SIGTERM too.
- **Only the last battle message is shown,** so "Ambush!", "The Warden rises…", the phase lines, "joined" and level-ups
  are lost. b18492d says it adds a battle log; untested here.
- **No round count once a battle has ended,** so auto fights that run to the end can't be measured. Print
  `Round N` and a per-fight summary at the Continue screen.
- **Duplicate button labels can't be targeted.**
  - Field Items repeats "→ Hero / → Shrike …" under every item, and the stat buttons are all "+".
  - `{"click":…}` hits the last match, so I couldn't use Medicine on a chosen ally in the field or place stat
    points. I left them unspent.
  - b18492d adds numbered buttons, seen as "[1] Continue".
- **Disabled buttons aren't marked.** `{"click":"Skills"}` on the disabled Skills button (4F hero) returned the normal
  state instead of "No enabled button".
- **The old ASCII map drew only N/W walls and stepped-on cells,** so room exits were invisible. b18492d says "full map
  walls, side views".
- **The `Party:` strip during battle shows pre-battle HP/MP** (stale).
- **The presets are weaker than the sim scenarios they mirror:**
  - Boss preset is L17 with 1 bead, 2 Salves and 2 Mana Drops; the sim uses L18 with 2 beads, 4 Salves and 3 Mana
    Drops.
  - The notebook and type knowledge start empty.
  - Stat points from level-ups can't be placed through the harness (above).
- **The build changed mid-test** (commit b18492d plus uncommitted edits). If you re-run these presets, re-check 5F
  and 6F on the new build first.
