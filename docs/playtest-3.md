# Playtest 3: The Flood Ward (AI playtester, headless, scripted mock brain)

Played Nov 19, 22:09–23:07 UTC (58 min wall clock), New Game to **"The Engine"**. Then I reloaded the pre-boss save
and typed a sealing decision instead to get **"The Plug"**. I played as David (docs/DAVID.md) on a third route:
- **Choices:** promised Ines to seal it, took Teo's ledger, challenged Dario ("everything in the tunnels walks out
  with us?"), backed Ines at the drain shed, told Hester "people live in its way", sent Dario up to warn Sump Row,
  kept Pell below to show the back way, took Teo's wrench, opened Teo's intake, held the wrench up to Teo and kept his
  secret ("Between us. You owe me."), told Hester "maybe the river can't come home", and fought Gonggong.
- **Flirting:** the kettle, Teo ("handsome"), Dario ("finish it some other time"), Furfur (answered "top or bottom?"
  in the Harness), the Troll, the Gargoyle, Ares and Gonggong (the scripted "strong and virile, *Wink.*" plus free talk).
- **Other acts:** begged (the Gargoyle paid me 211 gold, then I paid its toll with it), mugged the Leprechaun
  (+504 gold in run 1, failed in run 2 and it attacked), tried a trick (washers in a purse: nothing happened, the mock's
  fault), walked away from Kappa, Ares, Valkyrie, Anubis and the Banshee, and escaped twice.
- **Demons:** recruited 8 (kettle, Kappa, Kodama, Puck, Gargoyle, Furfur, Troll, Hephaestus). Fused Gargoyle + Troll
  into Valkyrie (run 1: Kodama + Gargoyle into Charon).
- **Lies:** caught Dario (free talk) and Teo (wrench). Deliberately never confronted Ines.

The ending recorded: spoke with 20, recruited 8, killed 19, ran from 1, first sought out Bel Saro, built for magic,
flirted 8 times, Kappa fought most (19 fights), caught 2 lies, Lv 12 with 7 demons.

**Caveats.**
- Free-form replies came from the keyword mock. I judge rules and presentation around them, and say when the mock is at fault.
- My test harness hit its 30-minute background limit at 22:40, just after I'd returned to the Ward, and the
  in-memory save was lost. I replayed the same route in 16 minutes, using a pathfinder and an auto-fight helper for
  trivial fights. RNG differed, and the replay produced two of the deaths below: my helper played badly.

## Verdict (5 lines)
1. **Very close to "Yes, I want more", closer than playtest 2.** The Ines/Teo route has its own consequences:
   - Dario follows you underground to beg for the charges.
   - Teo "owes" you, and the ending pays it off in bulbs.
   - The Ward gossips about your kills and your winks.
   - Gonggong answers the ledger, the charges and the wink.
   - Typing "sign the ledger" gave The Engine, and typing "light the fuse" gave The Plug, each with fitting fates.
2. **Catching lies now feels like my catch.** I called Dario a liar using Bel's radio fact, and I chose to hold up
   Teo's wrench. But the Journal flagged Dario's lie *before I had met him*, and ignoring Ines's lie only cost one
   (well-written) ending reflection.
3. **Death is now an annoyance, not a rage-quit.** "Retry from the last floor" cost 1–3.5 minutes each time. But the
   run still ends while 3 demons stand. A failed escape still hands the enemy a full turn that weakness hits extend.
4. **The biggest new problems:**
   - The kettle (the first demon, whose scene begs "get me out of here") can leave forever in minute 2, taking 120 gold.
   - Random encounters often open with the placeholder "X watches you, waiting to see what you do."
   - Ines, the leader I backed, says nothing new after the standoff.
5. **Fix those, plus the finale dropping side instructions ("Pell, go home to your mother"), and David very likely
   says yes.** A human will still need 50–60 minutes, not 30.

## Playtest-2 issues: status

### Fixed
- **Autosave + "Retry from the last floor".** The Cistern death cost 3.5 minutes (Furfur, the Gallery Key and 310 gold
  undone); the Approach deaths about 2 and 1.5; the boss loss about 1. The game-over text still says only "Load your
  last save, or start again".
- **The Harness has 2 weaknesses, and the shop explains weak/resist** ("hits of that element do extra damage to you
  and give the enemy a free extra action").
- **Random encounters are capped at your level + 1.** Ares, the Minotaur and Amduscias were Lv 10 at my Lv 9.
- **Bead of Return:** 400 gold at Bel's, 600 at Charon's. It revives a demon at half HP and shows "REVIVED".
- **Talk openers after scenes no longer contradict the scene.** The kettle, Furfur, the Banshee and Gonggong all open
  with "…watches you, waiting to see what you do."
- **Too-strong demons don't demand.** Ares Lv 10 at my Lv 9 showed no demand box. Furfur waits until you're ready.
- **Recruiting in hostile talks works.** Troll (flirt + toll), Gargoyle (beg, then pay) and Hephaestus (500 gold) all
  joined from random encounters. The Kodama echo trap is gone: echoing leads to a breath (MP) demand, then it joins.
- **Protagonist growth.** Glint at Lv 7, Cleave at 8 and Restore at 10, each announced on the results screen. Glint
  became my main weapon (see Combat).
- **Lies caught by the player.** Dario: my own words, "You caught Dario Venn in a lie." Teo: the turbine-hall scene
  reveals the truth, then my choice "*Hold up the stamped wrench.*" gets his confession. Both feel like mine.
- **Journal "What you've done" is readable** ("You kept Teo's secret, and made him owe you for it."). Used keys leave
  Carrying, Charon won't buy key items, and Teo's superseded "ninety years old" claim disappears once you know better.
- **Bespoke switch text:** the sluice, the drain wheel ("…the knocking stops, then starts again, faster"), Teo's DON'T
  lever and the back way.
- **Personal threads and meters in the ending:** "Dario Venn — He still owes you a better line."; "Gonggong — …held
  your eye the whole time, as if lying there had been his idea. Teo cleared his throat."; flirt count, build, first
  person sought out, most-used demon, lies caught.
- **Gonggong can't be bought:** "We are not for sale, little fish, and neither is the gate."
- **Smaller fixes:** the Compendium lists fought demons (Brokkr, Basilisk, Wisp, Oni, Golem, Amduscias); the camera
  clamps at map edges; gold updates live; Party shows demon HP/MP; fused demons greet you; joined enemies show "Joined
  you"; "X learned Y" appears after battles.

### Partly fixed
- **The Journal records claims, but only claims from free talk.** "Teo Marchetti: The Undergate gave way…" is
  attributed. The scripted scene claims never appear: Ines's "My Pell got out", Dario's "I talk to her on the radio
  every night". So "Something doesn't add up" points at a claim the Journal never shows. The text also leaks topic
  ids: "told you about pell", "lied about sister", "lied about gate".
- **Missing a lie costs something.** Only a reflection line: "You found Ines's son alive and never made her say she'd
  lied… The next time she tells the Ward something is safe, they'll believe her, and so will she." It's good writing,
  but nothing happens during play. The Banshee singing "for a Haldane… the water is coming for him" set up a cost that
  never arrives.
- **Harness lethality.** With 2 weaknesses it's survivable. Still, a Lv 7 Valkyrie who struck first after a sour talk
  did 57 + 56 to me (113 of 142 HP). Then Glint missed and she finished me off: game over with 3 demons standing.
  Swapping armor anywhere still trivializes the trade-off: wear it for the talk, take it off after.
- **Level gate on the talk screen.** The encounter screen says "Too strong to join you yet". The talk screen still
  doesn't. Ares, too strong, still says "Take one blow from me without flinching" twice, and "Go ahead. Hit me."
  does nothing. That's the mock's text, but the player is invited to pay a price the engine refuses.
- **Scene-choice heals.** "Drink, and listen" now heals, but the status bar showed MP 34/70 until the next action.

### Still present
- **The protagonist's death is a game over with demons standing.** It happened 4 times in my runs: 1 Harness Valkyrie,
  2 my auto-fighter in the Approach, and 1 boss attempt where I fell with Puck at 2 HP.
- **A failed escape (61–64% odds shown) gives a full enemy turn, extended by weakness hits.** Gargoyle: Ember WEAK on
  Kodama, then Bash WEAK on me, 101 damage. Hephaestus + Golem (Lv 9 at my Lv 8): 3 actions; Net of Lemnos hit Puck
  WEAK for 168, then Kappa for 103, both down.
- **Gonggong's portrait** is still the man-butting-a-mountain woodcut, not "a man's face on a serpent's body".
- The first arrow press after closing a dialogue or battle was often ignored. Possibly the harness; unverified.

## New issues
- **The kettle is losable in minute 2.** Run 1, 4 messages (a wink, a trick, "gives 120 gold", a bow): he answered
  "…You should go fetch a priest. Will you?" and in the same turn "Bake-danuki has lost interest. Bake-danuki left."
  Gone for good, with my 120 gold. Run 2, same messages plus a drum-song: he joined (patience is random, 4–7). The
  engine asked a question on the last patience tick and gave me no chance to answer. Bel never mentions it (mock).
- **"Something doesn't add up" before you've met the liar.** At 22:12, right after Bel's radio fact and before I had
  met Dario: "What you know contradicts what Dario Venn told you about sister." It's false, and it spoils the lie.
- **Placeholder openers on random encounters.** The Gargoyle once opened "Grrlbl… HALT!" and once "Gargoyle watches
  you, waiting…". The Valkyrie once opened "Unchosen. You have killed, and you have run, and I counted both." (great:
  it reads the meters) and once the placeholder. The Troll, Golem and Hephaestus only got the placeholder. It seems to
  happen when a chest, sign or door message closed a few steps earlier. David asked that "some talk first".
- **Ines is silent after the standoff.** Back in the Ward with her charges, with Pell found alive and kept below, she
  has only "Talk with Ines Haldane". The Three Houses loop ("support a leader and they trust you") is rich on Dario's
  side and empty on the side you chose.
- **Dario is still at the wall after being sent to Sump Row.** He says "You picked her… Mind yourself down there" and
  nothing about Sump Row, after an empty dialogue page (speaker "Dario", no text). The Sump Row sign does show the
  evacuation, which is a nice touch.
- **Teo's return scene doesn't mention the intake I opened for him.** The narration said "every bulb in the Pumphouse
  brightens", and he only talks about the wheel.
- **The finale drops side instructions.** The offline director picks the right ending from your words, but the
  details are lost. Engine: I typed "you hold this gate shut… Pell, go. Tell your mother."; the narration says "The
  Undergate stays open by contract", and Pell "stood beside you while the god signed". Plug: "Pell, up the stairs. Go
  home to your mother." became "You carried him out on your back." Neither ending gives Ines her son back on screen.
- **Duplicate fate rows and a wrong flirt line.** "Dario Venn" and "Gonggong" each appear twice. The flirt reflection
  mentions "one dockhand who went red to the ears"; there is no dockhand (the Troll's nose went red).
- **The "first person you sought out" meter is nearly always Bel**, because the intro leaves you facing her counter.
  Count the first *leader* visited instead.
- **Encounter frequency in the Cistern and the Approach.** Run 1's Cistern had 8 fights. The drained cistern gave 3
  fights between the wheel and Pell, about 40 steps. Lv 6 Wisps still interrupt at Lv 10. Consider no randoms 4+
  levels below you.
- **UI nits:** "Valkyrie attacks! A fight begins, and **he** strikes first."; raw ids in the battle log ("You:
  kappasalve → You +80 HP", "You: revival bead → Puck"); a disabled skill shows as lowercase "cleave"; fusion greetings
  show raw asterisks; in Fusion, clicking a demon already picked in the other column silently does nothing (I nearly
  fused the wrong pair). I fused a Charon ("Somebody else can pole the dead across") while Charon still runs the Landing.
- **The mock brain (also David's offline fallback if he declines consent):** "*winks*", "snatches" and "pretends" don't
  match `\bwink\b` etc., so the most natural wink got Furfur's neutral line. Hephaestus "turns the ingot over lovingly"
  after I paid gold.

## Bugs and softlocks (exact steps)
No softlocks found.
1. **Kettle lost.** New game, walk up into the kettle at the Ward (17,11), Talk. Send:
   `"…cute for a pot." *wink*`, then a pretend-purse line, then `*gives 120 gold* "…Come with me."`, then `*bows deeply*`.
   With patience 4: "Will you?" and "has lost interest… left" in the same turn. The kettle entity is gone and the gold
   is spent.
2. **Premature lie flag.** New game, kettle, then free talk with Bel (18,11) until "The Wall Crew's radio died…". Open
   the Journal before visiting Dario: "Something doesn't add up… Dario Venn told you about sister."
3. **Placeholder opener.** In the Cistern, open the chest at (33,9) and walk on. The next random encounter in a few
   steps often opens with "X watches you, waiting…" (run 2: Troll at about (27,3); Valkyrie after the Gallery door).
4. **Wrong pronoun.** Valkyrie in the Cistern: Talk, say `"I mean to die old, sword in hand…"`. The game says "he
   strikes first".
5. **Raw item ids.** In any battle, use Kappa Ointment or a Bead of Return. The log shows `kappasalve` / `revival bead`.
6. **Empty dialogue page.** Back Ines at the drain shed, send Dario to Sump Row in the Cistern (33,2), then return to
   the Ward and visit Dario (36,20). The first page is "Dario" with no text.
7. **Stale status bar.** Undergate Approach (10,22), "Drink, and listen": MP doesn't update until the next action.
8. **Duplicate fate rows** in both endings (Dario ×2, Gonggong ×2).

## Pacing per area (real time, mine)
| Area | Real time | Fights | Notes |
|---|---|---|---|
| The Ward | 4 min (replay 3) | 0 | Kettle, Bel, Harness, Ines, Teo, Dario, standoff. Fast and charming; the radio-log chalk ("DAY 9 SHE SAYS COME" in a squarer hand) is great evidence. |
| The Culverts | 9 min (replay 3) | ~6 | Kappa, Kodama, Puck and Gargoyle recruited in 6 minutes, mostly by tricks. Leprechaun mug. |
| Cistern Galleries | 6.5 + 3.5 replay after death | 8 | Still the best map. Dario-below, the survey, the drain wheel, Pell. The densest fights. |
| Undergate Approach | 5 min (replay 6, 2 deaths) | 5–6 | Charon, wrench, intake, lever, Hephaestus, keys, Banshee, back way. |
| Return trip to the Ward and back | ~5 min | 4 | Shortcuts make it quick. Hester, the gossip scene, Teo's confession, Dario, Sump Row. |
| Undergate + boss + finale | ~5 min | 1 | Item menu, a 6-round boss fight won at 64 HP alone, typed decision, ending. |

- **Total:** 58 minutes wall clock. That includes the 16-minute replay after the harness crash and about 6 minutes on
  deaths and retries. A clean run took me about 30 minutes.
- **A human** reading everything, finding paths without a pathfinder and fighting by hand will need about 50–60 minutes.
- **Where the time goes:** fight count (about 30 fights in a clean run) and the Cistern's back-and-forth (the Dario
  room is only reachable by walking back to the x16 corridor).

## Story notes
- **Did backing Ines change later scenes? Yes, mostly on Dario's side.** Ines handed over the bag "without a word";
  Dario: "Remember this when the water's at your chin." In the Cistern clerk's office Dario has followed you down: "I'm
  not going to ask nicely twice. ...No, I am." (the best moment of the route). Back at the wall: "You picked her. I
  know. And I'm still talking to you." Ines herself gets nothing until the endings ("Refuses the light" / "Keeps the
  locks. Never thanks you.").
- **Did taking Teo's side matter? Yes, beautifully.** I opened his intake, confronted him with the wrench and chose
  "Between us. You owe me." Engine fate: "sends you a crate of bulbs every month, like a man paying off a debt". Plug
  fate: "owing everyone except you. He made a point of that."
- **Hidden meters, called out in play (DAVID.md #3 delivered).** Ward gossip on return: "Put down a whole pile of
  them…", "Talks to them… Like they're people.", "Winked at one of them… Swear it winked back." Gonggong: "You killed a
  great many of Our river's children… We counted every one." The Valkyrie: "you have run, and I counted both."
- **Gonggong's item menu respects the route.** Ledger: "you will have to put Us on Our back first". Charges: "At least
  you are not a liar. Liars We drown first." Wink: "Not that. Not in ninety years. Say it again when the water is at
  your chin." Gold is refused.
- **Did catching lies feel like MY catch? Yes, for both.** Dario's needed Bel's radio fact and my words. Teo's needed
  me to carry the wrench and choose to show it. Ignoring Ines's lie didn't bite during play (see "Partly fixed").
- **Did the ending read my route? Yes.** The typed verb chose The Engine or The Plug; Sump Row was warned ("came down
  off Chapel Hill to bulbs in every window"); Teo's secret held; the Dario and Gonggong flirt threads paid off; the
  Magic build and flirt count showed. Missing: Pell going home to Ines, my broken promise to Ines (Engine), the
  Harness, the mugging, the walk-aways.

## Combat and fusion notes
- **Glint carries the protagonist.** Light-weak: Basilisk, Gargoyle, Troll, Oni, Amduscias and Gonggong, about half
  the roster, so Light may be too universal. Cleave helped against the Valkyrie. Restore (single target, 9 MP, ~126 HP) is good.
- **Press-turn sweeps are the joy of the game.** Basilisk (Glint, Chill, Gust, dead before it acts). Golem (Torrent
  WEAK 105, pass, Torrent). Gonggong (Fire/Elec/Light weak) gave 8 actions a round with Glint, Spark, Thunder Edge and
  Cinder Rain.
- **The boss is swingy.** It got 6 actions in one round off Hephaestus's Ice weakness (Torrent 85, then two Hails).
  Attempt 1: won alone at 64 HP after both Beads were spent (Puck died again right after reviving). Attempt 2: my
  helper lost. Attempt 3: won at 17 HP. Tense and fair-feeling, but the run ends the moment the protagonist drops.
- **The Bead of Return** is useful, but revived demons have half HP and die again to multi-hit turns. It never helps
  when the protagonist falls.
- **Fusion:** run 1 at Lv 9 offered only 2 makeable fusions (Charon, and a duplicate Furfur); run 2 at Lv 8, with other
  demon levels, offered 6 (Valkyrie, Hephaestus ×2, Charon, Bake-danuki, Furfur). The inherit picker, the greetings
  and Valkyrie's "wants to learn Dazzle, replace…" prompt in Party all work.
- **Growth.** Lv 6 to 10 by the end of the Approach (EXP ×1.6). The boss gives Lv 10 to 12, which is meaningless at
  the end.

## Prioritized top 10 (what stands between this and "Yes, I want more")
1. **Don't end the run while demons stand, or let a Bead revive the protagonist.** Cap the free turn after a failed
   escape at 1 action with no weakness extension. Game overs (2 of mine were fair: the Harness Valkyrie and a boss
   attempt) are still the biggest quit risk.
2. **The kettle must not be losable in minute 2.** Give scripted opening demons a patience floor, never ask a question
   on the last patience tick, or let him reappear on Bel's counter, "for sale again".
3. **Journal lie hygiene.** Never show "Something doesn't add up" before the claim was heard. Record *scene* claims
   with attribution (Ines: "Pell got out"; Dario: "I talk to her on the radio every night"). Use readable topics
   ("about his sister", "about Pell", "about the gate").
4. **Every random demon speaks first in character.** Remove the "watches you, waiting" placeholder outside scripted
   scenes (a skipOpener flag seems to leak from the previous dialogue).
5. **The leader you back must answer you.** Ines needs a return scene (you have her charges, you found Pell, you kept
   him below). Dario's wall scene should reflect the Sump Row errand, and Teo's should mention the intake.
6. **Make a missed lie bite during play,** not only in a reflection. For example, Ines's "nobody's down there" reaches
   someone who acts on it, or the Banshee's song for a Haldane pays off.
7. **Finale fidelity.** Honor side instructions in fate lines (Pell sent home, the gate kept shut, promises broken).
   Merge duplicate fate rows. Make the flirt reflection name whoever actually blushed (no phantom "dockhand"). Count
   the first leader you sought out, not Bel.
8. **Pacing.** Thin out fights in the Cistern and the Approach, skip randoms 4+ levels below you, and let the
   Cistern's north office connect to the east wing. A human needs 50–60 minutes against the 30-minute goal.
9. **UI nits:** the pronoun in "he strikes first", raw item ids in the battle log, the level gate on the talk screen,
   the stale status bar after scene heals, literal asterisks in fusion greetings, Fusion cross-column clicks,
   Gonggong's serpent portrait.
10. **The mock brain as the offline fallback:** match word forms ("winks", "snatches", "pretends"); no demand text from
    too-strong demons (Ares's blow loop); Bel and the kettle should react to each other. Verify that live Claude gets
    the Furfur "top or bottom?" context, since the opener is now skipped.

Screenshots: `/home/user/DemonGame/e2e/screens/playtest-p3-*.png`. Endings: `playtest-p3-33-ending.png` (The Engine)
and `playtest-p3-36-ending-plug.png` (The Plug). Journal: `playtest-p3-04/06/12/22-journal*.png`. Fusion:
`playtest-p3-13/14/19-*.png`. Compendium: `playtest-p3-34-compendium.png`. Boss: `playtest-p3-27..31,35-*.png`.
