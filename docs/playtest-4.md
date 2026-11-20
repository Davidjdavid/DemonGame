# Playtest 4: fresh player, first 20 minutes + targeted checks (Nov 20)

**What I did:** I played a new game through the harness (`scripts/playtest/server.mjs`, mock brain, `dist/` as built), like a
first-time player. In the Ward I talked to the kettle first (lost him to his play-dead "fetch a priest?"), then Bel, Ines,
Teo and Dario (flirted back with Dario, caught his radio lie in free talk). At the drain shed I **split the charges**. In
the Culverts: Hester ("not yet"), Kodama, Kappa, Leprechaun (mugged, +585 gold), Puck, key and sluice. Cistern pass 1:
office survey, Troll and Furfur talked down ("too strong to join"), then one Lv 7 Oni wiped the party. I chose **Retry
from the last floor**. Cistern pass 2: key, drain wheel, Valkyrie, Basilisk recruited, **found Pell and sent him home**,
fused Kodama + Basilisk = Hephaestus (Lv 8). Then back to the Ward: Ines/Pell reunion, Dario's charge, "word travels",
the kettle back on Bel's counter, a Bead of Return bought and tested. I ended at Lv 8. I never read `window.__game`. I
read source only to explain two bugs (below). Screenshots: `e2e/screens/playtest-p4-01..25-*.png`.

## Verdict
1. **Close to yes.** The first 20 minutes now have three leaders, one hard choice, a caught lie, and consequences you can hear and see.
2. Best moments: the split charges ("half a bridge"), then the boom underground and later the cracked wall. Pell behind the drained cistern. The Ward calling out my kills, my mercy and my wink. The Troll blushing.
3. **Blocker before David plays:** `dist/` (and published v16) predates commit 0ed8bfb, so its fixes aren't in the build I tested.
4. The biggest quit risk is still combat spikes. One at-level Oni wiped a fresh party, and Retry cost about 10 minutes of Cistern progress.
5. The mock brain is a flat stand-in. Furfur's top/bottom and gift/MP phrasing fall flat. Judge those live.

## Targeted checks
1. **Every demon opens in character: WORKS for random encounters.** Kodama (echoes), Kappa (sumo stomp), Puck, Troll,
   Gargoyle (garbled "you... EVIL?"), Basilisk ("DECREE"), Valkyrie ("you have killed, and you have run"). After a scene,
   "X watches you, waiting" still shows. That is by design, and it reads fine because the scene line just played.
   *Exception:* Talk **in battle** with a placed story demon loses its scene. The returned kettle reopened as "a round
   little monk with a leaf on his head" (bug 4).
2. **Kettle: WORKS as designed, with one bug in this build.** He asked "Will you?" (fetch a priest), I said yes, and he
   left. Bel reacted at once ("Forty I paid for that"), with two reply choices. After Hester's scene he was back on the
   counter ("a duck sat on me... Take me with you this time?"). But the encounter rolled hostile ("They look ready for a
   fight"), so he started at mood -2. I said "Yes, come with me", then paid 60 gold, and he attacked on my second line.
   The source already fixes this (talkNote → never hostile), but `dist/` doesn't have the fix (bug 1). Once lost twice,
   he's gone for good.
3. **Journal: WORKS.** Bel told me about the dead radio before I met Dario, and no "doesn't add up" appeared. It
   appeared right after Dario's claim: *Dario says: "…radio every night."* After I called it, the entry moved to "Lies
   you caught". Ines's Pell claim turned into "doesn't add up" only after I found Pell, quoted with her first name.
   "What you've done" reads as real decisions ("You split the charges at the drain shed: one for Dario, one for you",
   "You sent Pell home to his mother"). *Remaining:* scene claims still have no speaker. "The Undergate gave way because
   it was old iron… Nobody's fault." and the Chapel Well both read as plain facts.
4. **Death: WORKS.** Against a Troll: everyone passed, the protagonist fell at 0 HP, and the fight continued with Puck
   and Hephaestus. A Salve can't target him (right), and the bag stays open to demons. Hephaestus won and he got up at
   **1/149**. Against a Wisp: the protagonist and Puck fell, and Hephaestus used a **Bead of Return** on him ("gets back
   up" at 75/149). Whole-party wipe (Oni): **Retry from the last floor** put me at the top of the Cistern stairs with my
   pre-floor state (HP, gold, party). Keys and the drained cistern were lost. Nits: log says "You gets back up". The
   Bead's shop text says "a fallen demon". The results screen never says he got back up.
5. **Fusion: WORKS.** The screen says "you can command a fused demon up to 3 levels above you." With Kodama 4, Puck 6,
   Basilisk 6 at Lv 7, two pairs were makeable: Bake-danuki (6, a second way to get the kettle!) and Hephaestus (8).
   Puck+Basilisk showed "??? (needs you at Lv 8)". It has a skill-inherit picker, and fusing worked with a *fallen*
   Kodama. Hephaestus's shy greeting is lovely.
6. **Too strong: WORKS.** Troll Lv 7 and Furfur Lv 7 (I was Lv 6). The encounter panel and the talk screen both say
   "Too strong to join you yet". They asked no price. "Furfur is willing, but at level 7 he is too strong for you to
   command." "Furfur is still here. Come back when you're stronger."
7. **Cistern pacing: WORKS.** Pass 1 (~110 steps incl. office): 4 randoms (Troll, Basilisk, Gargoyle, Oni). Pass 2
   (~180 steps, key→door→wheel→Pell→spring): 4 randoms (Wisp, Valkyrie, Basilisk, Troll), plus Furfur after a failed
   escape. That's about 1 per 45 steps, and fine. Levels: every Cistern random was Lv 6–7 against my 6–7. In the
   Culverts: Kappa 3 vs me 6, Gargoyle 5 vs 7, Wisp 6 vs 7. **No randoms 4+ below me.**
8. **First 20 minutes: see pacing below.** A demon talks to you about 40 seconds in (the kettle). The opening hooks.
   Confusing: the drain shed is only reachable from the north bank via the middle bridge (I tried the south side
   first). Flat: the mock's generic fillers ("Hm. Go on.") in the Gargoyle's and kettle's mouths.

## New bugs (exact steps)
1. **Stale build.** `dist/index.html` is from 23:37. Commit 0ed8bfb ("placed story demons never roll hostile", "an
   instant-join trick beats a pending price", …) is from 23:53. `grep 'rng() < 0.25' dist/index.html` shows
   `!boss && game.rng() < 0.25`, while `src/ui/app.js:668` has `!boss && !talkNote && …`. Steps: new game → kettle
   (panel: "They look ready for a fight") → lose him → see Hester → back at Bel's: "ready for a fight" again → "Yes,
   come with me" (▼) → "I give Bel 60 gold for him" → "Bake-danuki attacks!". **Rebuild and republish.**
2. **Join line vs pending price.** Basilisk (Cistern): kneel ("DECREE: a tribute") → "Would Your Majesty honor me by
   joining my court?" → "*settles on your shoulder* DECREE: the King shall ride with this one" + "Basilisk wants 100
   gold first." The same thing happened with the Kappa's bow ("I'm coming with you!" / "wants Cucumber first"); 0ed8bfb
   fixes the instant-join half. In the mock, `ask_join` still replies `L.join` while a demand is pending, and `tryJoin`
   then refuses. (`p4-13`, `p4-18`)
3. **The Kappa's bow line repeats word for word.** The `bowBack` return in `mockBrain.js:129` skips the no-repeat
   filter. Said twice in a row after "Please. I promise a cucumber". David's original kappa complaint.
4. **Talk in battle forgets the scene.** Kettle-back talk → he attacks → battle → Talk → opener is the random "monk with
   a leaf" style instead of the kettle on the counter.
5. **Stale NPC menu.** Pell → "Go home" → "He goes off up the gallery…" → then the game still shows "Pell looks up as you
   come over. [Talk with Pell Haldane]" once (he is gone from the map after). (`p4-19`)
6. **Wrong button label.** Culverts Kodama + Kappa → talk to the Kodama until it leaves → Kappa battle → Talk → Walk
   away: the button says "To the fight", but the result is "You got away."
7. **Demand text mismatch.** Puck: "a bowl of cream… That's my standing fee" while the demand box says "Wants: 10 HP".
8. **Mock brain (offline fallback) gaps:**
   - "I breathe out… giving it 8 MP" and "I give it 8 MP." don't pay an MP demand; only "yes" does.
   - Furfur gets no reaction to "Vers" or "Bottom" (`mock/furfur.json` has no top/bottom keys).
   - "Bel says your radio died… how do you talk to your sister?" gets "Go on."; only the word "lying" catches it.
   - Unprompted gifts (50 gold, a Salve) get "*shrugs*" and no mood change.
9. **Arrival line on the way out.** The Culverts' "Water moves somewhere ahead, louder than it should" fires on the walk
   back up if you skipped that tile coming in.

## First-20-minutes pacing (human-time estimate)
- 0:00–0:40 title, 3 lines of premise, Bel's "Don't touch the kettle" / the kettle's "Do touch the kettle". **Hooks.**
- 0:40–3:00 kettle free talk (7 lines). He plays dead, I said yes, he left. Bel reacts. Funny, but a new player who is
  nice to him loses him in minute 2 and plays with **no demons until ~minute 15**.
- 3:00–9:00 Bel, Ines, Teo, Dario. Each one remembers who you saw ("You smell like her soup"). Dario's flirt with
  "Finish the line." is a highlight. The radio lie is caught by ~minute 9.
- 9:00–11:00 a navigation detour to the shed, then the standoff with 4 options. Split → "half a bridge".
- 11:00–17:00 Culverts: Hester, first random group, first recruit (Kodama, ~minute 15), mug, key, first actual fight
  (~minute 17, because I talked every time).
- 17:00–20:00 sluice, stairs, the Cistern, the **boom** (Dario used his half). Consequence felt within 8 minutes of
  choosing.
- Then the Cistern ran ~15 minutes per pass. Losing pass 1 to the Oni would make a human take 45–60 minutes to the Ward return.

## Top 5 remaining
1. **Rebuild and republish** (dist/v16 lacks 0ed8bfb), then replay the kettle-back. He must not roll hostile, and "Yes,
   come with me" right after "Take me with you this time?" should almost always work. Consider auto-joining him on that
   scene's yes.
2. **Combat spikes at your own level in the Cistern:** a Lv 7 Oni wiped a Lv 6 party of three. A Lv 6 Troll hit for 86
   (weak) and 118 (crit). Lower crit/weak damage for randoms, or cap Cistern randoms at your level. Also keep keys and
   switches across "Retry from the last floor", or autosave at the save point, so a wipe costs minutes, not the floor.
3. **One voice for "join" and "price":** when a demand is pending, the engine should replace a join line with the
   demand ("The King accepts. After the tribute."). Run every canned line (`bowBack` too) through the no-repeat filter.
4. **Carry a placed demon's talkNote into in-battle Talk** (kettle → monk), and give the kettle's encounter panel a
   friendly tagline.
5. **Journal attribution for scene claims** ("Teo: the Undergate gave… old iron", "Ines: the well runs dry"), so Teo's
   lie can surface as "Teo says…" when the winch is seen. Nits: "You gets back up", the Bead says "demon", and the
   results screen doesn't mention the 1-HP get-up.
