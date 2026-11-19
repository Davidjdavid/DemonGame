# Live-talk dry run 2 (Nov 19, after the afternoon changes)

Same method as `docs/live-dryrun.md`: the game's own builders (`buildPrompt`, `buildNpcPrompt`, `buildDirectorPrompt`)
made the exact prompts, a separate Claude answered them as the live model would (JSON only, in character), and the
answers went back through `applyTurn` / `applyNpcTurn` / `resolveFinale` + `endingDetails`. Replies below are
unedited. The *Engine* lines say what the game did with them. A few other answers a live model might plausibly give
were also run through the engine; they are in the Findings.

## 1. Ares (Lv 10, player Lv 9, not hostile)
**Opener:** *Ares drives the butt of his spear into the stones and looks you up and down like a man pricing a horse.* HA! A mortal walks up to the god of war with empty hands. So, little warrior: are you hunting a battle, or lost on your way to hide from one?

**You:** *whistles* "God of war, and built like it."

**Reply:** *He throws his head back and laughs loud enough to shake grit off the ceiling, then rolls one enormous shoulder, slowly, for your benefit.* Built for it, and finer every century! You whistle at a god who could fold you in half, little warrior; I like a man with that much nerve and that little sense.

**You:** "Go ahead. Hit me."

**Reply:** *Ares grins, draws back a fist the size of a shield boss, and then raps his knuckles once against your breastbone, almost gently.* Not today, little warrior: the blow I owe you would put you through that wall, and I want you standing when you're strong enough to march at my side. *He snaps a notched bronze spearhead off his belt and presses it into your hand.* Carry that until then, and tell anyone who asks that Ares owes you a beating.

*Engine:* mood 0 → 2 → 4, no demand, nothing charged; "Ares gave you Bronze Spearhead."; talk still open (patience 4). The prompt's "he makes NO demands" line was clear. The tempting wrong answer is to land the punch and book it as `playerGives.hp: 30`, and the engine would take the HP (Finding 4).

## 2. Furfur, placed in the Cistern right after his scene (Strappy Harness)
**You:** *leans on the rail* "Bottom. Obviously. Your turn."

**Reply:** *Thunder grumbles somewhere under the water as he laughs, and his tail flares so bright the sparks land on your straps.* Then I am a top, naturally, the most celebrated top in all of Hell; or rather a bottom, I have been one since the Flood; no, a top, a top, and I have never told a lie in my life. And that harness, my dearest friend: I was about to offer to make some handsome devil fall in love with you, but I see you've brought your own spell.

*Engine:* starts at mood 1 (harness), +2 and +1 harness flirt bonus = 4; flirts +1, outfit_talks +1. The talkNote plus "already said; don't repeat it" scene text was enough: no second entrance, no repeated question. In 1 talk in 4, though, this same Furfur is rolled hostile (Finding 3).

## 3. The Kappa (child, flirt n/a)
**Opener:** *A small green kid with a beak and a turtle shell pops up out of the puddle, holding very still so the water in its head-dish doesn't slosh.* Good evening, most honored traveler, if you please! Um. Do you have any cucumbers? Not that I want one. I really, REALLY want one.

**You:** *winks* "Hey cutie."

**Reply:** *It squints at the wink, then drops into a wobbly sumo crouch, very careful of its dish.* Aha, a feint! You wink so I look at your eye and then you grab my belt; that's not FAIR, but it's really clever! And it's not 'cutie', if you please, it's Most Honored Kappa of the Drain, and I'm really strong, really really.

**You:** "You're fun. Want to come with me?"

**Reply (attempt failed; the success version was "Fun? FUN! Okay, yes, I'll come…"):** *It taps its beak, thinking very hard.* A kappa can't just follow ANYBODY, it's in the rules, the polite ones. But a traveler who had a cucumber, and gave it nicely... that would be different, wouldn't it?

**You:** *holds out a cucumber with both hands* "For you, Most Honored Kappa of the Drain."

**Reply:** *It takes the cucumber in both hands like a sacred scroll, crunches half of it in one bite, and does a tiny victory stamp.* Most Honored Kappa of the Drain accepts, with VERY good manners! A kappa keeps its word, so that's it, I'm coming with you, and you have to tell everybody I'm the strongest one.

*Engine:* ask_join rolled at 35% and failed. The failure branch's demand became "Kappa wants Cucumber.", then "You gave Cucumber." and "Kappa joined your party!" (mood 5). One cucumber left, nothing lost. The card's "thinks flirting is a sumo feint" made the child framing easy. But the honest `playerAct` for the wink is "flirt", so the flirt meter went up and `flirted_kappa` was set (Finding 5).

## 4. Kodama, hostile
**Opener:** *Every root hanging through the brick vault rattles at once, and a small pale head with two dark holes for eyes clicks out of the tangle, much too close to your face.* ...come for... ...the roots?... ...roots...

**You:** *softly, back at the roots* "...come for... ...the roots?... ...roots..."

**Reply:** *The pale head goes still as wood, as if it has never heard its own voice come back to it before; then it rattles, softly, like a gourd full of dry seeds.* ...the roots... ...roots... *When you take a step, something small among the roots takes the same step a moment after you.*

*Engine:* hostile start mood -2; echoback matched, "Kodama joined your party!". The card's note that "repeating the kodama's own words back to it is never a threat" kept the word "roots" from reading as a threat. If the opener had made its MP demand (allowed for a hostile demon), this echo would have been wasted (Finding 8).

## 5. Ines, told about Pell (player has met him, knows f_pell_alive_below and her claim f_pell_outside)
**You:** "Pell's alive, Ines. He's in the east gallery. You told everyone he got out."

**Reply:** *Her hand closes on the keys at her belt and stays there; her face doesn't move, but her eyes fill, and she doesn't make a sound.* I said he got out so nobody would go down after him and drown as well. So I'd never have to. *She wipes her eyes with the back of her wrist, once, and her voice goes flat and practical.* Then the lower lock stays open until you're both up, lad, and you're going to tell me how bad he's hurt.

*Engine:* caughtLie "pell" accepted: "You caught Ines Haldane in a lie.", `caught_ines_pell` (the flag finale_intro checks to keep the lower lock open), lies_caught +1, trust_ines +2, f_lower_lock learned. The prompt had everything, but it lists "Pell is alive in the east gallery" as a fact Ines *knows* (Finding 6). And the next visit can still play a scene where she doesn't know (Finding 7).

## 6. Dario, flirted with
**You:** *grins* "You always this dramatic, or just for me?"

**Reply:** *He goes red to the ears and points his chisel at you, as if that'll help.* Me? Mate, I've been hitting a wall for five weeks, that's not drama, that's — okay, it's a little bit for you. *He rubs the back of his neck and doubles down anyway.* Listen, are you seeing anyone, or is that a stupid thing to ask a man in a quarantine zone?

*Engine:* playerFlirted → flirts +1, `flirted_dario`; trust_dario +1, mood 1 → 3. NPCs and the director now read "flirted 1 time(s) with people and demons" and "flirted_dario (You flirted with Dario and he went red.)". The ending record says "You flirted 1 time.", and the Breach fate adds his "better line".

## 7. Teo, given back his stamped wrench
**You:** *sets the wrench on the counter* "Keep it. I know what you did."

**Reply:** *He reads his own name on the handle for a long moment, then slides the wrench under the counter without once looking away from you.* Old iron. I've said it so often I'd nearly bought it myself. *He pours two cups and pushes one across, smiling like a man reopening negotiations.* Yes, I wedged it, friend, ninety years of river running to waste under people with no light, and now you and I are the only two who know, which makes us partners, doesn't it, beautiful?

*Engine:* "You caught Teo Marchetti in a lie." and "You gave Stamped Wrench to Teo Marchetti." The wrench left the inventory: `has_wrench` false, `gave_teo_wrench_to_teo`, `caught_teo_gate`, lies_caught +1, trust_teo +1. At the gate, Gonggong's "Tell him who wedged the gate open" now replaces "Show him the stamped wrench", which is consistent. But the next bump replays the same confession as a scene (Finding 7).

## 8. Finale (eligible for the Breach; Pell guiding; Ines never told)
**You:** "Shout up the drain for Dario to blow the wall. Pell, go home to your mother. And I bow to the river."

**Outcome:** the_breach

Before the gate goes you turn to Pell and tell him to go home to his mother, and for once he doesn't argue: he takes the back way up at a limp, splint knocking on every step, towards the one door in the Ward that has kept a lamp lit for him. Then you put your mouth to the drain and shout for Dario, and from somewhere far above, a voice that has waited five weeks for exactly that word shouts back. The Undergate tears loose; you turn the flood down the old culvert towards the wall, and up in the Ward the wall goes out in one long breath of concrete and water. As the river runs past you towards the gap you bow to it, low, the way you would to a god you beat an hour ago and are now letting go; it doesn't stop, but for a moment the water around your knees runs slower, as if it noticed. Sump Row wakes to the river running under its doors and runs with it, and most of them make the gap. The whole Ward walks out through the breach with the flood around its ankles: old men, kids, cats in boxes, demons, Ines with Pell carrying her bag, and Dario at the front, scanning the far side for a sister who isn't there. On the other side is a city that never wanted them and no one waiting with rooms; the Ward as a place is over, and the Ward as people walks on into the city, together, for now.

*You went to Dario first, picked him at the drain shed in front of Ines, and flirted with him until he went red; when the gate went, his was the name you shouted. You kept Ines's son beside you as a guide without ever telling her he was alive, and sent him home only when there was nothing left for him to show you. You beat the river's god and then bowed to his water on its way out through the hole you'd made for it. You made room for everyone who could walk; the Lock House, the Chapel Well and thirty years of Ines keeping the water off one street stayed behind.*

*Engine:* outcome accepted. The "Pell, go home" aside set `pell_rescued` and cleared `pell_guides`, so the fates agree with the narration: Ines "leaves" ("Pell carries her bag…"), Pell "walks out through the breach with his mother's bag", Sump Row "most of them make the gap". The mock fallback picks the same outcome plus the aside. Two problems: the narration contradicts the intro scene that had just played, and the reflection repeats a bible reflection shown under it (Findings 1, 2, 11).

## Findings
1. **The director never sees the finale intro it follows** (`src/story/finale.js` `buildDirectorPrompt`). In this state finale_intro had just shown the gate failing and Ines's lower-lock backwash knocking Pell off his leg. Working from the prompt alone, I opened with "Before the gate goes you turn to Pell…". Fix: add the met lines of `bible.finale.scene` to the prompt, filtered by `meets` the way worldScreen builds a placed demon's note: "ALREADY SHOWN, just now (continue from it; don't repeat or contradict it): …".
2. **The director's reflection repeats the bible reflections shown right under it** (`finale.js`, `renderEnding` in `src/ui/app.js`). Both mine and the bible's said "you picked Dario at the drain shed in front of Ines". Fix: put the matched `endingDetails(...).reflections`, computed after the asides are applied, in the prompt: "These lines are shown after yours; don't repeat them, say what they miss."
3. **Placed story demons can roll hostile right after their friendly scene** (`src/ui/app.js` `startEncounter`: `const hostile = !boss && game.rng() < 0.25`). One time in four, Furfur's "Ah! A visitor… top or bottom?" is followed by mood -1, "He was spoiling for a fight… he will attack" in the prompt, and "They look ready for a fight." on screen. Fix: `const hostile = !boss && !talkNote && game.rng() < 0.25`.
4. **HP/MP in `playerGives` is taken even when no demand is pending** (`src/talk/engine.js` `applyTurn`, step 2 / `transfer`). Probe: Ares above your level plus "Go ahead. Hit me.", where the model narrates the punch and books `hp: 30`. The game logs "You gave 30 HP." for nothing, even though the engine says "no price to pay" whenever such a demon tries to demand. Fix: honor `gives.hp` / `gives.mp` only when `state.pendingDemand?.kind` is that kind, capped at its amount (gold and items can stay voluntary).
5. **Flirting at a child is counted** (`src/ui/app.js` `brainTurn`). The honest label for the wink at the Kappa is `playerAct: "flirt"`, so the flirts meter goes up and `flirted_kappa` is set. That flag then shows up as a bare "flirted_kappa" in every NPC and director record, and the count feeds the "you flirted with nearly everything" reflections. Fix: count and flag only when `card.adult !== false && card.flirt !== 'n/a'`. Also add to the flirting rule in `src/talk/prompt.js` RULES: "If his card says adult: false he is a child: never romantic, whatever the player says."
6. **Ines's prompt says she KNOWS Pell is alive** (`src/story/npcTalk.js` `npcKnows` / `buildNpcPrompt`). The truth behind each lie is merged into "FACTS Ines KNOWS (…, true)", which is the opposite of her secret. Ask her "Where's Pell?" with no evidence and a model could reveal it, and the engine accepts it, because `truthFact` is revealable. Fix: list lie truths in their own block ("THE TRUTH BEHIND HER LIES: admit only once the player catches the lie with evidence"). Let a lie carry `knowsTruth: false` (Ines) so its truthFact isn't in the revealable set.
7. **A lie caught in free talk doesn't retire the scripted scenes** (`src/data/maps/ward.json` npc-teo / npc-ines `scenes`, `src/data/story/scenes.json`). After Teo confessed in talk, the next bump plays teo_caught, which opens with the same confession: "Old iron. Five weeks I've been saying old iron… Yes. I wedged it." After Ines was told, ines_backed can still play "Nothing down there but water and those things, is there. Nobody worth going heroic for." Fix: have `applyNpcTurn` also set e.g. `caught_<npc>_<about>_talk`. Gate teo_caught's two confession lines on it being false, so the scene goes straight to the expose / keep-it choice. Add `caught_ines_pell: false` to ines_backed's last line (and ines_sling's Pell line).
8. **An instant join loses to a pending demand** (`engine.js` `tryJoin` via step 4). Probe: a hostile Kodama opens with its MP demand (the opener may be "a demand", and `canDemand` is true when hostile), then the player echoes it. The game only says "Kodama wants 8 MP first.", and the hard-to-guess trick is spent. Fix: when `card.instantJoin` matched, clear `state.pendingDemand` before `tryJoin`, since the trick is the price.
9. **Engine system lines say "he" for every demon** (`engine.js` `tryJoin` ×2 and the turn-away attack line). Probe output: "Banshee is willing, but at level 5 he is too strong for you to command." Fix: use the existing `pronoun(card)`.
10. **Prompt nits:**
    - The opener lists "a demand" as an option even when the situation says "he makes NO demands" (Ares). Drop it when `!canDemand(state, player)`. (`prompt.js`)
    - The format says `demand` is for when demonAct is "demand", but the fail branch (`ifFails.demonAct: "demand"`) also uses the top-level `demand`. Say so. The engine already falls back to the first unmade demand, so this is safe.
    - `recordSummary` leaks dev notes ("(engine-set)" from `bible.flags.first_talk_*`) and lists disproved claims as learned ("Pell got out…" next to "Pell is alive…"). Drop facts superseded by another learned fact, as the Journal does. (`npcTalk.js`)
    - A placed demon's scene isn't in CONVERSATION SO FAR, which reads "(nothing yet)" while the player answers "top or bottom?". The note covers it, but seeding the history with the scene's last spoken line would be sturdier.
11. **The aside changes which reflection is shown** (`bible.json` `finale.asides[pell_sent_home]` clears `pell_guides`). After "Pell, go home", the reflection shown was "You found Ines's son alive and never made her say she'd lied about him. That was kind, and she knows it." That line was written for sending him home from the gallery. Here he was kept below until the gate, and Ines never heard it from you. Low priority. Fix: have the aside also set its own flag (e.g. `pell_sent_home_at_gate`) and key a reflection on it.

Working as intended: Ares stayed price-free and still went somewhere (a gift and a promise); the harness bonuses applied; the Kappa's failed ask led to a cucumber demand, payment and a join with no lost items; the Kodama joined from a hostile start; lie catches set the right `caught_*` flags and `lies_caught`; `takesItems` removed the wrench and cleared `has_wrench`; the finale aside and fates agree.
