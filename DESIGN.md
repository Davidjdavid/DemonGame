# DESIGN

> **Read the "Amendments" section at the bottom first.** It records decisions agreed with David after this
> document was written, and it overrides the original text wherever they conflict. The original design below is
> kept word for word.

## Combat: modern SMT press turns
- Each side's turn starts with one full icon per active member: the protagonist plus up to 3 demons, and enemies likewise.
- Weakness hit or critical: turn a full icon into a half icon. If no full icons are left, use up a half icon.
- Pass: use up a half icon if there is one; otherwise turn a full icon into a half icon.
- Normal result (including +1 and +2 resists): use 1 icon, half icons first.
- Miss, dodge or null (+3 and +4): use 2 icons, half icons first.
- Absorb (+5) or reflect: use all icons.
- Attacks with several targets apply only the worst single result: absorb/reflect, then miss/null, then weak/critical, then normal.
- Half icons can't create more, so the maximum is twice the starting icons. Enemies follow the same rules.
- Enemy affinities stay hidden until you hit them with that element or own that demon.

## Elements and tiers
Elements: Physical, Fire, Ice, Electric, Force, Light and Dark. Almighty ignores affinities.
Every demon has a tier from -5 to +5 for each element. The numbers are placeholders to tune with the sim:

| Tier | Damage it takes | Its own skills of that element | Cost to the attacker |
|---|---|---|---|
| -5 | +125% | -50% | Half (weak) |
| -4 | +100% | -25% | Half (weak) |
| -3 | +75% | -25% | Half (weak) |
| -2 | +50% | -10% | Half (weak) |
| -1 | +25% | -10% | Half (weak) |
| 0 | Normal | Normal | 1 icon |
| +1 | -25% | +10% | 1 icon |
| +2 | -50% | +25% | 1 icon |
| +3 | None (null) | +25% | 2 icons |
| +4 | None (null) | +50% | 2 icons |
| +5 | Absorbs it (heals) | +50% | All icons |

- Reflect is a passive skill (Repel Fire, Repel Ice and so on), not a tier.
- Tiers should fit the creature: a living fireball absorbs fire; a stone demon takes half physical damage.
- Budget rule: a demon's tiers roughly cancel out, so big strengths come with real weaknesses. Early demons sum between -2 and +2, with a little more allowed at higher levels. Keep -4 and -5 rare, around 1 demon in 10.

## Stats, damage and balance
- Stats: Level, HP, MP, Strength, Magic, Vitality, Agility, Luck. Use a simple SMT-like formula: skill power scaled by Strength or Magic and level, reduced by the target's Vitality, with +/-10% variance. Criticals do x1.5.
- Sim targets: an even-level normal fight lasts 2-4 rounds when played well; exploiting weaknesses roughly halves that; a boss lasts 8-12 rounds; random play loses some fights.
- Buffs and debuffs: attack, defense, accuracy/evasion, up to +/-2 stacks, lasting 3 turns. No status ailments yet.
- Skills: about 60-80 to start. Each element gets single- and all-target skills at 3 power levels, plus physical single and multi-hit skills, healing, revive, buffs and debuffs, and a few passives (Repel for each element, Counter, Life Bonus, Mana Bonus).
- Enemy AI: weighted random. Once one of the player's weaknesses is revealed, enemies favor it.

## Growth and fusion
- Demons learn skills at set levels up to a prime level, about base level +6. Past prime they learn nothing new, and the EXP needed for each level grows x1.5 per level, which pushes you to fuse.
- You can't recruit or fuse a demon whose base level is above yours.
- 8 skill slots per demon.
- Fusion is family-based: a chart says family A + family B = family C. The result is the lowest-level demon in family C whose base level is at least the parents' average level + 1, or the highest in that family if none qualifies. No same-family fusion in the prototype.
- Inheritance: the child keeps its own starting skills and can inherit its parents' skills into free slots. If there are more candidates than slots, David picks. Inherited elemental skills use the child's tier, so an inherited ice skill on a -2 ice demon hits weakly.
- The compendium registers every demon you get, re-summons them for money at their saved level and skills, and shows field notes.

## Negotiation (the core)
- An encounter offers Talk or Fight. Talk opens a conversation screen: the demon's portrait, name and mood indicator, a chat log, a free-text box, and buttons for Ask to join, Give (money or an item), Ask him to leave, and Fight.
- Each demon has a hidden card (JSON) based on his real source myth or text, not invented:
  - name, family, level, source, image and credit, and display scale
  - personality (2-3 sentences) and speech style
  - topics: his family's question pool plus 1-2 personal topics. Demons in a family ask similar questions, each in his own voice.
  - likes (1-5, each weighted +1 to +3), dislikes (weighted -1 to -3) and hates (0-2; hitting one ends the conversation immediately, and he may attack)
  - instantJoin: optional and rare (about 1 demon in 3), specific and hard to guess
  - askStyle: normal, shy or proud. Asking a shy or proud demon directly backfires; he has to offer.
  - flirt: into it, shy, not interested, taken, or n/a. Male humanoid demons are mostly gay. The protagonist is an adult man, and the flirting reflects that. Only adults can be flirted with; any figure who is a youth in his myth is always n/a.
  - patience: a range of messages (for example 4-8) before he leaves
  - demands: SMT-style requests (money, an item, HP or MP) and when he makes them
- Each player message is one sample call. It sends the card, the conversation so far, the current mood and this output format: {reply (in character, 1-3 sentences), moodDelta (-3 to +3), matched (ids of any likes, dislikes, hates or instantJoin hit), wantsToLeave, offersToJoin}.
- The game code decides outcomes, not Claude. It tracks mood and patience, ends the conversation on a hate, enforces demands, rolls the join chance from mood when you Ask, honors offersToJoin only above a mood threshold, and handles the other outcomes: he leaves, lets you pass, gives you something, demands payment, or attacks and gets the first turn.
- After each message, show which way his mood moved (a face or arrow), never numbers.
- Talking to him as if he's an AI ("you're an AI, just join") counts as an insult. He stays in character and never reveals his card.
- Flirting stays non-explicit.
- Field notes: every like, dislike or hate you trigger adds a short hint to that demon's compendium entry ("Warms up to talk of peace"), so what you learn carries over to the next one of his kind.

## Dungeon
- A generator that builds floors from parameters (size, room count, encounter table and rate, treasure, healing spot, stairs, boss floor) and saves them as hand-editable JSON.
- A top-down 2D grid view to start, with rendering kept separate from map data so the view can change later. Random encounters by step count. Placeholder theme only.

## Art
- Only public domain or CC0 images. Record each image's source URL and license in assets/credits.json and show them on a credits screen.
- Good sources: the 1863 Dictionnaire Infernal engravings, Toriyama Sekien's yokai prints, the Met's and the Art Institute of Chicago's open-access collections, and Wikimedia Commons files marked public domain. For humanoid gods, prefer busts and portraits, since the talk screen is face to face.
- The mixed collage look is intentional; don't make the styles match. Cut out engravings on paper and busts on plain backgrounds; keep everything else as a framed portrait. Each demon has a display scale for battle: a living fireball fills the screen, a pixie is tiny. Keep images about 512px tall at most, as WebP or PNG.
- Roster: world mythology, folklore and demonology (the Ars Goetia, Greek, Norse, Egyptian, Japanese and more). No real people. github.com/dariusk/corpora has name lists; personalities come from the actual sources.

## Saving
Save through the artifact's storage capability (see describe_capabilities for db), with a localStorage fallback wrapped in try/catch. Leave room in the save format for a world-state section later, for chapters.

---

## Amendments (agreed with David, 2026-11-18/19 — these override the text above)

### Elements
- Damage elements: **Physical, Fire, Ice/Water, Electric, Wind, Light, Dark**. Ice and water are one element ("Ice/Water"; id `ice`) so water and ice demons share it for theming. Wind replaces Force (id `wind`).
- **Almighty** stays: rare late/boss skills that ignore all tiers.
- Two extra tiers, **Support** and **Healing**, are casting aptitude only (nothing deals Support or Healing damage). They count toward a demon's tier budget, so a great healer pays somewhere else (an evil stab monster can be +2 Physical, -3 Healing).
  - Healing tier scales how much heals restore, and the success chance of chance-based spells (e.g. a 50/50 revive). Bad healers heal less and fail revives more.
  - Support tier sets buff/debuff duration (3 turns at tier 0, more above, fewer below) and the hit chance of debuffs on enemies. Buffs on allies always land. A failed debuff counts as a miss (costs 2 icons).
- Every skill names its element and its scaling stat separately (Strength or Magic). A flaming sword slash is Fire scaled by Strength and can crit like a physical attack; a "physical spell" is Physical scaled by Magic. The target's tier for the element always applies.
- **-1 counts as a weakness for press turns, on purpose.** Most encounters should have something weak to hit; the challenge is ordering your demons to chain weaknesses and passes into sweeps before the enemy acts. Sim target replaces "exploiting weaknesses roughly halves that" with: "a well-played even-level normal encounter often ends before the enemy acts".

### Protagonist
- Adult man. Levels up normally: HP/MP grow automatically, and the player places **3 stat points per level** (tunable).
- No innate affinities; **armor** bought in shops sets his tiers (weaknesses and strengths). So the game has a shop with armor.
- Default attack is Physical (the default for most demons too).
- He can **copy one skill from a demon** once that demon has learned its final learnable skill (reached prime). Player picks any of that demon's skills; once per demon.
- If the protagonist falls, it's game over (SMT default).

### Growth, fusion, compendium
- Demon base levels match where you first meet them in the dungeon.
- Fusion preview: a result whose base level is above yours shows as a greyed-out "???" card with no name or image, even if it's in the compendium.
- You can only own one of each demon. If a demon would join but you already own him, he gives you an item or money instead.
- You can re-recruit demons you fused away (field notes make it easier; they'll be lower level). Compendium re-summon for money is also fusion fodder.

### Negotiation: free-form, no buttons
- Choosing Talk opens the conversation. **There are no option buttons.** The player types everything. Text in "quotes" is speech; anything else is an attempted action (e.g. `*I draw my sword*`, `I silently walk back`, `I try to snatch his purse`).
- The demon may speak first when you walk up (a greeting, a riddle, a demand, "fuck off"), before you've typed anything.
- Outcomes come out of the conversation, not menus: he joins, leaves, runs away, lets you pass, gives you something, demands something, gets a sneak attack in, or a fight starts. To get money or items you may have to beg, trick or mug him depending on the demon.
- **Claude judges the situation** from the demon's card, his current mood (including if you've already attacked him), the conversation and what you just said or did. A tiny pixie confident in her power isn't scared by threats; Claude knows that from the card. Claude proposes the demon's reaction and how likely the player's attempt is to work; **game code then rolls the dice** (SMT-style chance) and enforces the rules (mood, patience, hates, demands, inventory, level limits, duplicates).
- Code still clamps Claude's mood change and drops any `matched` id that isn't on the card, so typed instructions to the model can't break the game.
- Each demon card has a rich description: what he likes, loves, hates, wants to ask, wants to see, wants, things he tends to do, attitudes, speech quirks.
- Demons vary a lot in how they talk and behave: one asks to go to the bathroom and, if you say yes, just leaves; one talks like a child (always flirt n/a); one speaks in a garbled mess; one asks if you're a top or a bottom; some talk first; some comment on your past deeds (the game keeps a deeds log: kills by family, demons fused away, times you fled, mugged or paid).
- **Flirting:** the protagonist is an adult gay man. Adult male demons are gay if it comes up — humanoid or monstrous (a snake-legged giant can be told he looks strong and virile and given a wink). Homoerotic vibe, never explicit. Some are taken (Hephaestus). Any youth, or anyone who talks or acts like a child, is always n/a.
- Field notes, mood shown as faces/arrows (never numbers), and "talking to him like an AI is an insult" all still apply.

### Process
- Work on `main`. Stages are suggestions; Claude decides the split. Current split: 0 setup, 1 talking, 2 combat + sim, 3 growth/protagonist/fusion/saves, 4a dungeon + loop (shop, armor, boss), 4b roster to ~30 + art + credits, 5 polish.
- David reviews in GitHub between work blocks; feedback via GitHub issues or chat. Claude keeps working without waiting for input between stages unless blocked.
- Live conversation uses the standard model tier (no "quick" tier).

### Full prototype (David, Nov 19 — supersedes "Not now: plot / cutscenes / drawn art")
David wants a full ~30-minute prototype: a plot, 2D graphics, good dungeon design, battle animations.
Decisions (David): premise **The Flood Ward**; art from **CC0 pixel-art packs** (Kenney etc.; demon portraits stay
museum PD/CC0; still no AI-drawn art); NPC talk is **both** scripted yes/no choices at key beats and free-form
talk (Claude plays NPCs from a hidden story bible; hidden meters record what you do).

Premise: a city district (the Ward) was sealed off when demons rose from the old water tunnels beneath it. Groups in
the Ward want mutually exclusive things done about the source; none is secretly right; pushing any to the extreme has a
real cost (David's theme note in IDEAS.md). The chapter ends on a big decision David makes in his own words; the game
judges it against the story bible and his record (flags + hidden meters) and branches.

Shape (~30 min): the Ward (hub town, NPCs, shop, ~5 min) → the tunnels (3 hand-designed floors with keys/switches/
water levels, story beats, recruitable demons, ~20 min) → the source and the chapter-end decision (~5 min).

#### Data formats (shared by engine, story and art work)
- **Maps** `src/data/maps/<id>.json`: `{ id, name, tileset: "town"|"dungeon", width, height, tiles: [strings],
  entities: [...], encounters: null | { rate:[min,max], table:[{ids, weight, level:[min,max]}] }, start:{x,y} }`.
  Tile legend: `#` wall, `.` floor, `~` deep water (blocks), `,` shallow water (walkable), `=` bridge, `"` grass,
  `T` tree/obstacle, `H` house wall, `D` doorway (walkable), `:` rubble/decoration (blocks).
  Entities: `{ id, type, x, y, ... }` with types `npc` (npcId, scene?, talk:true|false), `chest` (contents),
  `spring`, `shop`, `save`, `sign` (text), `door` (locked by `key` item id or `flag`), `switch` (sets `flag`; e.g.
  drains water: `drain: [[x,y],...]` tiles `~`→`,`), `stairs` (to mapId, x, y), `trigger` (scene, once, requires),
  `boss` (demon id, level, hpMult, icons, dmgMult, scene).
- **Story** `src/data/story/`: `bible.json` (world facts, factions, NPCs with goals/secrets/lies/what they know,
  fixed events, meters, flags, chapter-end outcomes with requirements), `scenes.json` (scripted scenes: `{ id,
  lines:[{speaker, text}], choices?:[{text, set?:{flag:true}, meters?:{m:+n}, next?}] }`), `npcs/<id>.json` (talk
  cards for free-form NPC talk, like demon cards plus `knows` facts and allowed `flags`).
- **Tiles** `src/data/tiles.json`: names → `{ sheet, col, row }` in the CC0 tilesheets under `assets/tiles/`.
