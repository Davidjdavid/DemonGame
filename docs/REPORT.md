# The Flood Ward: report for David

**Play it:** https://claude.ai/artifact/Vo3R1RPYKAMAQGD3edcyCv (New game; about 30–45 minutes to an ending).

- Talking runs on live Claude. The first time you send a message, claude.ai asks you to allow it. The chip in the
  top right says "Live Claude" when it's on, and "Scripted replies" if it falls back to the offline stand-in.
- The game saves to your claude.ai account. It also autosaves every time you change floors. Continue loads
  whichever save is newer, and a game over offers "Retry from the last floor".
- Sound on/off is in the top right. The music is all CC0.

## What it is, in a minute

The Ward was built ninety years ago on the bed of a buried river, the Sallow. Five weeks ago the water, its god
and its demons came back up through the old tunnels, and the city sealed the Ward in behind a quarantine wall.
Down at the source, the river god Gonggong wants his riverbed back. Up top, everyone has a plan, and every plan
needs you, the one man the demons will talk to:

- **Ines** (the retired lock-keeper who keeps the charges): bury it.
- **Teo** (who runs the Pumphouse and sells light): harness it.
- **Hester** (the schoolteacher who knows the buried river's history): give the river back.
- **Dario** (the dockhand who leads the Wall Crew): blow the wall and walk away.
- **Bel** (the shopkeeper): sells to everyone and sides with no one. The game treats that as a position too: she'll
  be fine, and nothing she cares about gets saved.

Three of them lie to you. In the first few minutes you're forced to pick between Ines and Dario over the
explosive charges. That choice and everything after it (who you believed, who you caught lying, what you carried
down, who you flirted with, how you treated demons) decide which of six endings are open to you. At the bottom
you type, in your own words, what you do. The game picks the ending your words and your record allow, then tells
you what your choices say about you. It's the SMT I / Catherine move, built on your theme: taken to the extreme,
you can't make room for everything.

## Things to try (your asks, and where they are)

| You asked for | Where to find it |
|---|---|
| Free-form talk, no menus | Every demon and every person. Text in "quotes" is speech; anything else is an action. Flatter, flirt, bribe, beg, trick, mug, walk away. Claude judges the reaction from the demon's card, its mood and your record; the game rolls dice and enforces the rules. |
| Top or bottom | Furfur, the lying stag-duke, lounging on the Cistern walkway. |
| "You look strong and virile" *wink* | Gonggong, at the Source. It's an option in his gate menu, and he remembers it in the ending. |
| A demon with a ruse to leave | The Kappa asks to pop back to the river "just for a minute". Say yes and it's gone. Puck, Furfur, the Leprechaun and the Wisp each have their own trick. |
| A demon that talks like a child | The Kappa (Culverts): an eager little kid doing its best grown-up manners. Never a flirt target. |
| A garbled mess | The Gargoyle ("Grrlbl... HALT... glorrg..."). The Kodama can only echo you, and echoing it back wins it over. |
| Demons that talk first, or bring up your past | Many open the talk themselves. Charon greets you with your own kill count; Gonggong has counted your kills and your mercies. |
| Gay protagonist, homoerotic vibe | Every adult man in the game is gay if it comes up: Dario, Furfur, Brokkr, Ares, Gonggong. Flirting shows up in the ending (Dario's "better line"). Never explicit. |
| Armor that changes talking | The Strappy Harness at Bel's shop: flirty demons warm to you, it boosts flirt and compliment odds, and live Claude is told what you're wearing. In exchange you're weak to Phys and Fire. |
| NPCs who lie, and missing it costs you | Ines (her son), Teo (the gate), Dario (his sister). The Journal logs who told you what and flags when two things don't add up. Then you have to say it to their face. A lie you miss shows up in the fates and reflections. |
| An early choice between people you like | The drain-shed standoff (Ines vs Dario over the charges). Later scenes, a note that reaches you underground, and the ending all follow from it. |
| Hidden meters, and NPCs who notice them | Talks, recruits, kills, mercy, running away, lies caught, flirts, talking in the Harness, your stat build, who you sought out first, and the demon who fought beside you most. NPCs and the ending react to them. |
| Fixed event, open outcome | The Undergate fails whatever you do. Who's where when it does, and what you did beforehand, changes the outcome. |
| Press-turn combat | Hit a weakness or land a crit and you get an extra half turn; null or repel and you lose turns. Weaknesses you've found are remembered. Each demon has a ★ signature move. |
| Varied demons | 30 demons, each with its own voice, likes, hates, demands and gifts. Every floor draws from its own set, with no repeats in a row. Fusion: 8 demons can only be made by fusing. Your protagonist levels, spends stat points, learns a few skills, and can copy one skill from a fully grown demon. |

## What's in it

- **Story:** 108 scenes, 81 choices (70 of them recorded as decisions in your Journal), 6 NPCs with talk cards
  (secrets, lies, attitudes), 21 facts, 6 endings with fates for each person, and 24 reflections.
- **Maps:** 5 hand-designed maps: the Ward, the Culverts, the Cistern, the Undergate Approach, the Source.
- **Demons:** 30, with portraits from museum public-domain art (Art Institute of Chicago, the Met, Wikimedia
  Commons).
- **Art and sound:** maps and sprites from Kenney's CC0 pixel packs; music from OpenGameArt (CC0: Cleyton Kauffman,
  yd, Juhani Junkala). Everything is credited on the Credits screen. Nothing was drawn or generated by AI.
- **Battle effects:** banners, lunges, hit bursts tinted by element, damage and WEAK/NULL popups, sound.

## How it was tested

- 105 unit tests plus a lint check, and 11 scripted headless playthroughs. One of them runs the full story: intro,
  NPC talk, Journal, the Source, Gonggong, the finale and the ending.
- Three full AI playtests, each on a different route, played as you (from docs/DAVID.md):
  1. **River Home route:** "yes, but not yet". Grindy middle, a difficulty spike, and trips back to the surface
     that felt invisible. All of its top 10 were fixed.
  2. **Dario / Breach route:** "closer to yes". The story landed. Deaths, talk openers that contradicted the scene
     just shown, and lie-catching were the problems. All fixed: autosave and retry, a revive item, an easier
     Harness, a level cap on random fights, protagonist skills, and lies you catch yourself.
  3. **Ines / Teo route:** PLAYTEST3_RESULT

## Honest limits

- The AI playtests used the scripted stand-in, not live Claude, so they judged the rules, story and pacing, not
  the wording of free talk. You're the first person to play the live version of this build.
- Live talk runs through claude.ai's `sample` feature. If it's busy or refuses, the game falls back to scripted
  replies and says so in the top-right chip.
- Gonggong's portrait is still a Ming woodcut of him as a man. The scenes describe him as serpent-bodied, and
  Wikimedia rate-limited my search for a better one.
- This is one chapter: a prologue's worth of story. The NPC endings are written, but there's no chapter 2.

## What "more" would look like

The pieces this prototype proves (a story bible as the world's truth, Claude voicing people and demons inside it,
the game keeping score, and an ending that reads your record back to you) scale to a long game:

- **Chapters with fixed events.** The bombs-drop moment of SMT I: each chapter's big event happens no matter what,
  and who's alive and where depends on you.
- **The cast carries over.** Ines, Teo, Hester, Dario and Bel remember this chapter. Whoever you crossed or caught
  lying holds it against you, and whoever you saved owes you.
- **More demons, deeper fusion.** More demons as the world opens up, each with a voice as specific as these 30.
- **A bible that grows with you.** The story bible gets new facts as you play, so Claude's people stay consistent
  over months.
