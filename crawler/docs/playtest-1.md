# Playtest 1 — AI playtester, seed 12, new game from the hub

Played through `scripts/harness.mjs` (text view only: I never saw the 3D view, the animations or the battle figures, so
nothing here judges looks, movement feel or the enemy-count display). About 400 harness calls in total.

## What I did

**Run A (real new game, seed 12, about 30 minutes wall-clock):**
- Toured the hub. All six services were easy to find by walking the walls: healer (W wall), weapons, armor, stairs up,
  items and inn (N wall), fusion (E wall). The weapon and armor shops said "Nothing new yet" until I had reached 2F.
- **1F, first pass:** explored nearly the whole 10×10 floor, which took about 160 steps to reach the up stairs. I had
  6 encounters: 3 were won by fighting, 3 were talks. I recruited **Gnawer** (Lv 2) and **Slime** (Lv 1), opened 2
  chests (2× Medicine, 120 g), and opened the **barred-door shortcut** from its far side. Reached hero Lv 3.
- **2F, first fight:** Hound Lv 5 + Stinger Lv 5 ×2 against hero Lv 3, Gnawer Lv 2 (20/38 HP) and Slime Lv 1.
  Both recruits died in round 1–2, and I **wiped in round 3** while trying to escape (47%).
- Clicked "Retry from last save", which put me back at the 2F entrance (the autosave on floor change). I went back
  down; with the shortcut, the 1F stairs-to-stairs walk was **18 steps** with no fights. In the hub I bought the Bronze
  Sword and the Leather Vest (220 g), which matches the sims' 2F gear, and checked the fusion preview (Gnawer + Slime →
  Wisp Lv 2 with Ember). I did not fuse, because it would have left me with two bodies.
- **1F grind:** about 11 more encounters. I recruited **Dustmoth** (Lv 2) on purpose, from what the notebook had taught
  me. Hero went Lv 3 → 5, recruits Lv 1–2 → 5, gold 12 → 300. Once I had 3 recruits, every 1F fight was a single
  Auto press with 0–11 damage taken.
- Back in the hub I wasted my 300 g on the wrong items. That was a tooling problem, not the game (see Tooling below).
- Then the harness process was killed: background jobs in this environment have a 30-minute limit. The browser
  profile, and with it the save, died too, so **run A ended at the 1F→2F stairs.**

**Run B (`--preset=f2`: hero Lv 4, Wisp 4, Imp 4, Bronze Sword, Leather, 300 g):**
- 7 fights on 2F: 1 played by hand (2 rounds), 6 on Auto, all won. Hero Lv 4 → 6, gold 300 → 810.
- Used an Exit Charm to go to the hub, rested at the inn (34 g) and previewed a fusion: Wisp 6 + Imp 6 → **Naga Lv 12**
  (locked until hero Lv 9).
- I never found the 3F stairs. I ran out of call budget after spending a lot of calls on text navigation and on
  harness workarounds.

**Totals:** floors reached 2F; hero max Lv 5 (run A) / Lv 6 (run B); 3 recruits; 0 fusions (2 previews); 1 wipe;
1 restock trip on foot plus 1 by Exit Charm; about 26 fights; about 560 steps.

## Per floor

### 1F Lower Halls (solo, then 1–3 recruits)
Target: solo enemies take 2–4 hits, fights last 2–4 rounds, low risk.

| Fight | Hits to kill / rounds | HP lost |
|---|---|---|
| Husk Lv 2, solo | 4 hits (1 crit), 5 rounds including an Analyze | 18 of 42 (43%) |
| Wisp ×2, solo | 2 hits on the first (1 crit), then Auto | 20 of 42 (48%), 10 of it before I could act |
| Slime Lv 3, with 1 recruit | 3 hero hits plus Gnawer, 4 rounds | small |

- **Hits and rounds are on target. The risk is higher than "low":** each solo fight took about half my HP, and I used
  2 Medicines in my first three fights. A careless solo player who chains two fights will die on 1F.
- **Level gate:** I started at Lv 1 and 1F enemies are Lv 1–3. My first two talks (Slime Lv 2, Imp Lv 3) could never
  have ended in a join, and nothing told me so before I had paid.
- **Talks give no EXP.** About half of my first-pass encounters were talks, so a full first clear of 1F got me only to
  **Lv 3**. The design's target on arriving at 2F is Lv 4 (comment in `src/data/encounters.js`).
- With 3 recruits at Lv 4–5, fights ended in one Auto press. That matches "after a few recruits they die in a turn or
  two".
- **Navigation:** the floor is a ring of many small rooms with dead ends, for example (6,4), (6,5) and the 2×2 room at
  (3..4, 2..3). My first pass took about 100 steps of searching between the stairs.
- **The shortcut works:** the barred door at (4,1)/(4,2) cut the stairs-to-stairs walk to 18 steps. This is exactly the
  "run back up" feeling the design wants.

### 2F Cistern
Target: new types are a real fight the first time (3–5 rounds, real risk).
- **The step from 1F is steep.** Enemy level goes from 1–3 to 3–6 and group size from 1–2 to 2–3. My very first 2F
  group was three Lv 5s, two of them Stingers that resist physical and are weak to fire. My party had no fire. With a
  natural 1F clear (Lv 3 hero, Lv 2 and Lv 1 recruits, one of them half-dead) I wiped in 3 rounds.
- I walked in with a half-dead Gnawer, which was partly my own carelessness. But one full exploration of 1F did not
  produce the Lv 4 + two Lv 4 recruits the sims assume. I had to grind 1F for about 11 more fights, and those were
  trivial and boring once I had 3 recruits.
- **With the preset party, 2F felt right:**
  - The one fight I counted (Shrike Lv 6 + Shrike Lv 4) took 2 rounds. Imp's Spark hit the Shrikes' Electric weakness
    for half-icons, and Wisp's Ember did the same against Stingers and Thornlings.
  - The Stinger pair cost Wisp 22 HP and 19 MP.
  - Over 6 fights the party fell to about 50% HP with Wisp at 0/45 MP, and Auto used a Salve. That is real attrition,
    as intended.
- **Gold:** about 85 g per 2F fight, against about 24 g per 1F fight. After one 2F trip the Iron Sword (360 g, or 300 g
  with trade-in) and Chain Mail (300 g, or 250 g with trade-in) were affordable. That pricing works.
- **Navigation:** I couldn't judge it fairly from the text view (see Tooling). The one-way door at (0,8)→(1,8) was
  clearly described.

### 3F and up
Not reached.

## Negotiation

- **It is learnable, and fast.** The stance hints (▲▲ / ▲ / – / ▼) that appear on later questions, together with the
  Notebook, let me identify personalities from one or two answers:
  - Flatter "–" means timid.
  - Agree ▼ means hothead.
  - Agree ▲ plus refuse ▼ means cheerful.
- On a second meeting I recruited a Dustmoth deliberately: Disagree ▲▲, pay MP, Joke ▲, and it joined. That felt good.
- **Recruiting mattered.** Solo, or with two weak recruits, 2F killed me. With three recruits, 1F became trivial. On 2F
  the recruits' elemental skills, not the hero's sword, won the fights. This meets David's "you need your monsters"
  requirement.
- **What hurt:**
  - The **pay bug** below, which punishes paying and teaches the Notebook the wrong lesson.
  - The **invisible level gate:** you only learn "[you're too weak to lead me]" after a successful talk.
  - **Talks give no EXP,** so talking slows the curve.
  - **2-question talks for Lv 1–3 enemies** leave very little room. One neutral answer means it can't reach mood 4, so
    many early talks are already lost at the first question.
  - Item demands nearly always ask for a shard you hold only one of, which runs into the bug below.

## Bugs and confusing moments

1. **Paying a demand is scored as a refusal (high).**
   - **Cause:** `src/ui/talk.js` deducts the payment first, then calls `respond(talk, pay, ctx())`. `respond()` checks
     `canPay` again against the already-reduced gold, items, HP or MP, and flips `pay` to `false`. You lose what you
     paid **and** take the refusal penalty.
   - **The Notebook records it wrong too:** "Paying: ? · refusing: angers it".
   - **When it happens:**
     - an item demand when you hold exactly one of that item (very common: you start with one of each shard);
     - a gold demand when your gold is less than twice the amount;
     - an MP demand when your MP is less than twice the amount;
     - an HP demand when your HP is at most twice the amount.
   - **Repro 1:** new game, seed 12, 1F. In the first fight (Imp + Slime): Talk → Slime → [Flatter] → "Demand: 34
     gold" while holding 50 g → Pay. Gold goes 50 → 16, the reaction is "[dislikes that] ▼" (gloomy should be +2), and
     the Notebook shows "Gloomy… Paying: ? · refusing: angers it".
   - **Repro 2:** a Slime Lv 1 demands "one Fire Shard" while you hold exactly 1 → Pay. The shard is gone and the
     reaction is "[dislikes that] ▼".
   - **Fix:** don't re-check `canPay` after the UI has paid. For example, compute `canPay` before deducting and pass
     the result in.
2. **The level rule for joining is invisible.** Hero Lv 1 against Lv 2–3 enemies: the talk runs normally, may take your
   gold, and can never end in a join. Show it in the talk header, for example "Lv 3 (you're Lv 1: won't join yet)".
3. **The reaction to the answer just before a demand is wiped when the demand appears.** `react.textContent = ''`
   runs right after a wait of only 450 ms. At normal speed it's easy to miss whether your answer worked.
4. **Talk is greyed out against mindless-only groups with no reason given.** The tooltip says "Negotiate with an
   enemy". It happened against a lone Husk.
5. **The party strip doesn't refresh while a service panel is open.** After "Rest & save" it still showed 38/74 HP
   until I closed the inn. Low priority.
6. **Hero has no skills from Lv 1 to Lv 6.** Skills stays disabled, so the solo phase is just Attack and Analyze. The
   only elemental options are single-use shards, and you start with one each.
7. **Possible curve-breaker in fusion:** Wisp 6 + Imp 6 → Naga Lv 12, the lowest serpent, which is a 5F-table demon. It
   unlocks at hero Lv 9 (`FUSION_REACH` 3), i.e. around 3F. Check it in the sims.
8. **Auto battle spends consumables** (it used a Salve) without asking. This may be intended ("until something goes
   wrong"), but it surprised me. Consider making it a setting.
9. **The healer is never worth it next to the inn:** 1 g per HP and 2 g per MP, against 14–34 g for a full rest. Fine
   if intended, but then the healer is only good for revives.

## Top 10 fixes, most important first

1. **Fix the pay-scored-as-refusal bug** (bug 1). It breaks the negotiation rules and poisons the Notebook, which is
   the one place the player learns from.
2. **Smooth the 1F → 2F step.** A natural single clear of 1F should land at about Lv 4 with two recruits. Options:
   - more 1F EXP;
   - a 1F level range of 1–4;
   - on a floor's first visit, cap groups at 2 and level at the floor's minimum + 1;
   - keep Stinger pairs out of 2F's first encounters.
3. **Show the join level rule in the talk** before you pay, and say "too strong to join" explicitly.
4. **Give some EXP for talk outcomes** (join, gift or leave), so talking isn't a levelling penalty.
5. **Allow 3 questions at Lv 1–3, or start mood at +1,** so one neutral answer doesn't make the talk hopeless.
6. **Keep the stance reaction on screen when a demand appears,** for example as a line above the demand.
7. **Give the hero one starter skill** (or a cheap starter element), so solo fights offer weakness play.
8. **Re-check the fusion jumps where a family's lowest member is far above the parents' average + 1** (Naga 12 from two
   Lv 6 parents).
9. **Explain a disabled Talk** ("Mindless: can't talk"), and refresh the party strip after inn and healer actions.
10. **Add an Auto-battle setting:** "may use items" on/off.

## Tooling (harness) issues, separate from the game

These cost me about 100 of my calls and one whole run.

1. **`click` picks the last visible button containing the text,** so you can't choose between buttons with the same
   label: "+" for stats, "Buy 1" / "Buy 5" in shops, "→ Hero" in Items.
   - "→ Hero" used my Mana Drop instead of the Medicine I wanted.
   - In the item shop I ended up with a Mana Drop, a Holy Shard and a Dusk Shard instead of Fire Shards. That was my
     whole 300 g.
   - Stat points needed a Tab/Space workaround costing 2–7 calls per point.
   - **Fix:** add `{"click":"Buy 1","nth":3}`, or click by element id (`#buy-fire_shard`, `#plus-ST`), or list buttons
     with an index.
2. **The `Buttons:` line doesn't mark disabled buttons.** Skills and Talk looked usable when they weren't.
3. **Only the last battle message is returned.**
   - Lost from view: talk outcomes when other enemies remain ("…It leaves", whether a monster joined), what auto
     allies did, damage numbers, and WEAK / CRIT labels.
   - After Auto battle the round count is empty, so I couldn't measure rounds for Auto fights.
   - **Fix:** return the battle log since the last input, plus the round number at the end of the fight.
4. **In fast mode the reaction to the answer before a demand is never shown** (a 0 ms wait), and mood is shown as the
   bare word "Mood" with no value. Serialize the pip count.
5. **The ASCII map draws only the north and west edges of walked cells.**
   - East and south walls, and exits from frontier cells, are invisible.
   - It ignores `mem.edges`, which the game does record.
   - It marks only walked cells, so rooms look like dotted paths.
   - I navigated by the "looking ahead" text and my own notes, not the map. This doesn't tell you anything about the
     real automap.
6. **"looking ahead" only covers the line you are facing.** In open rooms such as the hub, every cell says "opening
   left, opening right", and counters to the side are invisible until you face them. A "nearby features" line (for
   example "INN counter 3 east, 0 north") would help a lot.
7. **The harness keeps the save in an in-memory browser profile.** When the background job was killed after 30 minutes
   (an environment limit), the whole run was lost. Use a persistent user-data dir, or add `/save` and `/load`
   endpoints, and document that playtest agents must start the harness with a long background timeout.
