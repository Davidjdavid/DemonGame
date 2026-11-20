# Playtest 5: regression run on v17, the Hester route (Nov 20)

**What I did:** I played New Game to the ending **"The River Comes Home"** in the harness (`scripts/playtest/server.mjs`,
mock brain, `dist/` = v17), on the route earlier playtests barely touched. That took 23 harness minutes (00:14–00:37 UTC).
Then I loaded the pre-boss autosave, lost to Gonggong on purpose and used Retry. A pathfinder helper did every walk, and
an auto-fight helper played all 8 battles. I never read `window.__game`. I read the source and data only to explain
the bugs below. Screenshots: `e2e/screens/playtest-p5-01..19-*.png`.

**Route and choices:**
- **Ward:** recruited the kettle on the first talk ("No. Nice try. You are not dead… come with me"). Asked Ines about
  the well ("I'll think about it"). Told Teo "A god in harness? That never ends well." Flirted with Dario ("Finish the
  line."). **Walked past the drain-shed standoff.**
- **Culverts:** promised Hester "I'll speak for the river" (took the Sallow Stone). Talked down or recruited Brokkr,
  Puck, Kappa and Kodama, and walked away from the Leprechaun, the Wisp and the Gargoyle.
- **Cistern:** read the survey. The Oni took the sake and joined. Flirted with Furfur ("Vers… *wink*") and the Troll
  ("mighty nose… go home, handsome"), and both let me pass. Valkyrie and Basilisk joined. Drained the cistern and
  **kept Pell below with me**.
- **Back up:** told Hester about Sump Row ("Then we get them out first. Then the river."). Warned Sump Row door to door.
  **Called Dario's radio lie with Bel's valves** ("Tell them the truth."). **Never called Ines's lie**, though the
  Journal flagged it.
- **Back down:** fused Brokkr + Oni = Ares (Lv 10 at my Lv 7). Took Teo's wrench, left his intake shut, kept the stone.
- **Undergate:** showed Gonggong the stone, the wrench, Sump Row and the name "Sallow", flirted in free talk and talked
  him down.
- **Finale (typed):** *I step aside from the gate. "Sallow, take your old bed back. Sump Row is empty… leave the rest of
  the Ward standing." Then I turn to Pell: "Pell, go home to your mother. Tell her you're alive before she hears it from
  anyone else."*

**The ending recorded:** spoke with 20, recruited 8, killed 7, ran from 1, let 5 walk away, went to Ines first, built
for toughness, flirted 3 times, Bake-danuki fought most (8 fights), caught 1 lie, Lv 7 with 7 demons. Every number
matches my own count.

## Verdict
1. **Very close to "Yes, I want more."** The Hester route holds together from end to end: the survey, Hester's "I never once walked down that street and counted", the door-to-door warning, Gonggong's "you sent them up their hill before you came down", and "Everyone got out."
2. Walking past the standoff gives the best consequence chain in the build: Ines goes down, then "You stood there and watched", "Sorry doesn't set a bone", Dario's "Is she all right?", and finally "Ines's wrist remembers."
3. **No crashes, softlocks or page errors.** Every Stage 6 fix I touched works: the level cap, prices before joining, Retry, fusion up to +3, Journal attributions, the lower lock, the Pell aside and Bel's radio scene.
4. The ending reads my route and my words, but my side request quietly **erased the lower-lock payoff**, and the climax prints a recruit refusal at Gonggong.
5. The quit risks left: **fallen demons are invisible after a win**, and one Wisp can one-turn a fire-weak demon. If the live `sample` call ever fails, David gets the flat offline brain.

## Regressions / bugs (exact steps)
1. **Capped randoms join above your level.** Cistern, the walkway at x29 y10, me Lv 6: the panel says "Oni · Lv 6"
   (the table has Lv 8, capped to my level). "I hold up the jug of sake" → "I hand him the jug of sake." → "Oni joined
   your party!" The Party screen shows **"Oni Brute · Lv 8"**. `src/talk/engine.js:121` recruits at
   `Math.max(card.level, state.level)`, while the too-strong check (line 104) uses the capped `state.level`. The same
   would happen with Amduscias (base 10, met as Lv 7 at Approach 29,6) and Ares (9–10, met as Lv 7). Meanwhile placed
   Furfur, Lv 7 at my Lv 6, says "too strong for you to command", so the rule is inconsistent.
2. **The boss talk-down reads as a failed recruit.** At Source 12,8, after the stone, wrench, Sump Row and name plus
   praise: *"Gonggong is willing, but at level 12 he is too strong for you to command."* then *"Gonggong lets you pass."*
   (`p5-16`). Every talked-down Gonggong will show this line at the climax.
3. **Fallen demons are invisible after a win.** In the Cistern, between the island chest (20,13) and Pell (36,20), a
   Lv 6 Wisp fight left Bake-danuki, Brokkr and Puck at 0 HP. The results only said "Victory! +32 EXP, +90 gold. You
   reached Lv 7!", and the map status bar shows only You. I walked into a Troll and a Valkyrie alone and found out on the
   Party screen ("FALLEN", `p5-08`).
4. **Wisp spike.** On the Culverts return trip near 28,19, a Lv 6 Wisp did *"The Devil's Coal → Valkyrie WEAK! 118"* and
   then *"WEAK! 125, down!"* in one enemy turn, killing a full-HP Lv 7 demon (135 HP). The weak hit gives the Wisp its
   extra action. Many early demons are fire-weak: Bake-danuki, Kappa, Kodama and Valkyrie.
5. **"Back to the fight" when no one is left.** Culverts Kodama + Kappa: recruit the Kodama, then Talk to the Kappa and
   hand over a cucumber. You get "Kappa lets you pass." with the button **"Back to the fight"**, then "The fight is
   over." This is playtest-4 bug 6 in reverse.
6. **Sticky load message.** After Continue, "Loaded your save (from this browser)." stays on screen through the whole
   Gonggong scene.
7. **Offline brain (the fallback when `sample` is declined or fails):**
   - **The demand text leaks "the player".** Puck: *"asks to play one more trick on the player: pulling the stool out
     from under him"* (`p5-05`). 17 of the 30 cards have a second demand phrased like this (Basilisk, Brokkr, Týr…).
     `mockBrain.js:168` voices it verbatim.
   - **The thanks line describes the first demand.** Puck paid in HP gives *"laps it up Mmm!"* (cream). Valkyrie paid
     20 HP gives *"she drains the horn Mead of the benches."* This is playtest-4 bug 7, still there.
   - **A gift, then a demand for the same gift.** Kappa: "I hand it a cucumber." → "You gave Cucumber." → *"A cucumber,
     if you please!"* + "Kappa wants Cucumber." (`p5-06`). The Gargoyle took my Honey Cake while its 120-gold toll was
     pending and replied only "…blrb?".
   - **Repeats.** The kettle said *"Ehehe, not so fast! Buy me a drink first!"* 3 times in 5 messages. The second
     Puck's opener repeated the first Puck's word for word.
   - **Payments missed.** "I put 150 gold down", "Yes. Here is the 150 gold" and "I am ready" pay nothing. Only the
     exact phrasings work: "I hand him 150 gold" and "go ahead". "Yes."/"Fine" don't pay an HP demand.
   - **The Valkyrie's opener is static.** "You have killed, and you have run, and I counted both." It happened to be
     true for me, but a pacifist hears it too.

## Continuity problems
1. **The ending forgets the lock Ines shut on Pell.** The finale shows *"Ines… shuts the lower lock. The backwash…
   takes Pell off his one good leg. You get a fist in his collar. Only just."* Then my aside "Pell, go home" (the
   `bible.finale.asides` entry `pell_sent_home`) sets `pell_guides:false`. That flag picks the generic Ines fate,
   *"She leaves the Ward with Pell carrying her bag, and doesn't look back."*, instead of the written one: *"Pell came
   up out of the cistern beside you, soaked from the lock she'd shut on him… never asks why you didn't tell her."*
   The lie I left uncalled on purpose never surfaces in the ending. From the data (not played): a route that also
   caught Teo would get the reflection *"…never made her say she'd lied about him. That was kind, and she knows it."*,
   right after watching her shut the lock on her son.
2. **Bel never mentions the kettle** I walked off with from her counter (17,11). It was her opening warning ("Don't let
   it sweet-talk you"), and her card says she sulks and charges extra. Prices are unchanged (Salve 100). There's no
   Journal record of it, and her fate doesn't mention it either. Only the "he ran off" branch has a scene.
3. **Pell, kept below, is silent at the winch.** He's the one who said "Go and look at the winch in the turbine hall",
   yet the turbine-hall reveal plays without him. His first line after joining is at the last spring.
4. **Teo doesn't react to Sump Row.** The warning scene says "Teo stands in his doorway and watches them walk off the
   job." Visiting him right after gives only "Teo looks up as you come over."
5. **Pell has three places in one ending:** "to the one door in the Ward that has kept a lamp lit for him" (narration),
   "from his mother's step on Chapel Hill" (his fate), and "She leaves the Ward with Pell carrying her bag" (Ines's
   fate). It works as a sequence, but it reads like three endings.
6. Nit: the kettle's first panel still says "Bake-danuki appears!" while he's sitting on Bel's counter.

**These hold up:**
- Dario's "That was the only one we had" matches the one charge I let go.
- Charon's "You drained my lake, passenger" matches the drained cistern.
- The Banshee's "Don't hide him behind you" knows Pell is with me.
- The ward gossip matched my meters line for line (kills 5+, talks, recruits, mercy, flirts; no "ran from two").
- Ines's "Pell would have stepped in. Look where that got him" is a nice crack in her lie.

## Ending check
- **It reads my words:** it quoted my text, gave the title The River Comes Home, and played my aside as its own
  paragraph ("And Pell: you tell him to go home, and for once he doesn't argue").
- **Theme:** "You gave the river back its room, and took it from the people who were living there." It's right for
  Hester's side, and the cost is real (Sump Row is gone, the Ward is cut in two).
- **Fates:** 9 rows, one per person, no duplicates. Hester runs the relief kitchen. Sump Row: everyone got out. Teo
  sells candles. Dario's line callback ("The line is still terrible. You let him finish it."). Bel sells boats.
  Gonggong tips his head.
- **Reflections:**
  - Flirting (Dario plus the demons) is right.
  - Teo's uncalled lie is right, but it took the lie slot from Ines's uncalled lie, which actually bit on screen.
  - "Ines's wrist remembers" is right.
- **Not named:** I kept my one promise, to Hester (broken promises are named, kept ones aren't). Nothing about the
  kettle. Mercy shows up only in Gonggong's opener, not in the reflections.
- **Retry:** losing to Gonggong gives "Retry from the last checkpoint". I came back at 12,9 in front of him with my
  items, all 7 demons and the scripted flirt flag kept. The checkpoint was at full HP, so I couldn't check the
  half-HP floor.

## Pacing
| Area | Harness min | Human estimate | Notes |
|---|---|---|---|
| Ward, first visit | 5 | ~10 | the kettle talks at 0:40; 4 leaders + standoff |
| Culverts | 4 | ~9 | 6 encounters (5 talks, 1 fight), Hester, key, sluice |
| Cistern | 5 | ~10 | 6 encounters (4 talks, 2 fights), survey, Furfur, wheel, Pell |
| Back up to the Ward | 3 | ~6 | Hester, Sump Row, the cracked wall, gossip, Ines, Dario, Bel, the radio lie |
| Back down + fusion | 3 | ~5 | 3 encounters, Ares fusion, Basilisk |
| Undergate Approach | 2 | ~5 | 2 encounters, Charon, winch, race, back way, stone socket |
| Undergate + finale | 2 | ~6 | hub, free talk, decision, ending |
| **Total** | **23** | **~50** | 8 battles in total; I reached Lv 7 |

The return trip is the most rewarding 6 minutes in the game. A human still runs ~50 minutes, not 30, mostly from
reading 40+ scenes. The first fight came at ~minute 12. On the merciful route EXP is thin: I finished at Lv 7.

## Top 5
1. **Asides must not erase what already happened.** "Pell, go home" should set `pell_rescued` but keep a
   lock-shut-on-Pell flag. Ines's fate and the lie reflections should read that flag. Give Ines's uncalled lie
   priority over Teo's when the lock actually fired.
2. **Recruit capped randoms at the capped level**, or run the too-strong check on `max(card.level, state.level)`
   (`engine.js:104/121`).
3. **Bosses skip the "willing, but too strong to command" line.** End Gonggong's talk-down on "Gonggong lets you pass"
   or a line of his own.
4. **Make fallen demons visible after a win** (a results line plus a party strip on the map), and soften The Devil's
   Coal against fire weakness (118/125 on a Lv 7).
5. **Continuity lines:** Bel on her kettle (plus a Journal record), Pell at the winch, Teo watching his shift leave. In
   the offline brain, fix the "the player" demand text and the first-demand thanks line, since David meets it if
   `sample` fails.
