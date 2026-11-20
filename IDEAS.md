# IDEAS (from David — parked, not committed to the prototype)

David sends ideas as they come. They don't need to go into the prototype; this file makes sure none are lost.
Mark an idea `[used: where]` when something from it gets built.

## Gameplay

- **Armor that changes talking.** Some armor improves flirting odds or instant recruits, or hurts recruiting
  with specific demons. E.g. a skimpy/crotchless piece with less defense or more weaknesses than other armor
  at that stage, but that some demons love. `[used: Strappy Harness (+flirt, flirty demons warm up, taken ones
  cool, 3 weaknesses) and Silver-Tongue Scarf (+join odds); the live prompt tells demons what you're wearing]`
- **Early recruits can be just bad.** Like SMT V's slime at the start: weak to every element, learns one bad
  move. But a Pixie-type is always an early recruit with simple healing or damage.
- **Balance around single-element all-target moves.** Many demons have only one element move that hits all
  enemies. If your party has a demon weak to ice, it makes sense to bring one strong against ice so enemies
  can't chain extra turns off that move.
- **Dungeon variety.** Don't run into the same 4 demons in an area. `[used: 30-demon encounter tables, no
  same group twice in a row]`

## Story structure (for the story bible, much later — after the prologue/prototype)

- **Chapter-end decision points**, like SMT I where the Chaos Hero, Law Hero and Heroine each have their own
  goals and you help one. David decides what his character tries: e.g. convince the Law Hero to give up his
  goal and join him and the Heroine, the Law Hero gets angry, the Chaos and Heroine quests merge into a
  hybrid main quest that changes the plot. (Don't actually end the plot that way; it's an example of shape.)
- **Characters who represent ideologies or extremes**, but NOT law/chaos or good/evil, and the "true" ending
  is not "be neutral/balanced". Not obvious. Some characters don't represent an extreme at all. There should be
  a central theme, revealed like Catherine's ending: "Did you get the theme?" — grounded traditional life vs a
  chaotic one vs realizing you need to focus on yourself, each telling you something about the protagonist.
- **SMT I-style personality results**: the moral of the story and an ending built around you and your
  choices, good or bad.
- **A few fixed major plot points** that chapters are built around (like the bombs always dropping in SMT I):
  a dream world, post-apocalypse, time skip, etc. What happens before them (who you support, who betrays you,
  how you prepare, who you save) is decided by what David says his character wants to do next chapter, given
  what did or didn't happen. Example: teleported to the future, separated from plot NPCs: "I think X went to
  Y and I want to find them and stop Z" — the bible says they're doomed unless something is prevented; if
  David figures it out the chapter is short; if they live, the plot can go somewhere very different.
- **Open-ended, not doomed.** No unpreventable things that leave you stuck with a bad ending halfway, but
  also not "whatever David says happens". X, then Y, then Z happen without player input (e.g. a ritual on day
  X), but each can happen or not, in combinations, or other events can replace or join them. The bible says
  how the world reacts when a major thing does or doesn't happen, and how people react if they're alive, able,
  or in a certain state of mind. Major NPCs can die unexpectedly; the bible lays out what follows (without
  contrived fixes like evil twins). Lots of moving parts, ideologies that can't coexist, power vacuums, events
  that need X, Y or Z to resolve. It can get messy or stay simple depending on David's choices between sections.
- **Fire Emblem: Three Houses as the model of branching**: pick a side; support a leader at a key moment and
  they trust you more; temper them by being there; others get angry about things you didn't know; or betray,
  attempt peace talks that fail, reach out to other factions who respond based on the bible and past choices
  (including ones you didn't know you made).
- **Choices and hidden meters**: yes/no dialogue choices, gameplay choices, and hidden meters tracking things
  you don't think about: stats you pick, how much you talk to demons, which demons you use, which NPCs you talk
  to first, how often you run away. These affect how NPCs react when you pursue chapter goals (help an NPC you
  befriended and did quests for → that counts). NPCs can lie; missing a lie can hurt you or accidentally help.
  Claude must not just do whatever David says: one part of the system references the game bible (everything in
  the world) and the record of what David has done. `[groundwork: the deeds log in src/game/player.js]`
- **Rehearse with a fake game first**: set up a plot line, acts and branches for a pretend game in a different
  genre, to work out what works and make sure we're on the same page before the real story bible.
- **Central theme: undecided.** Not good vs bad, not chaos vs law, maybe not two opposing things at all;
  maybe multifaceted; maybe based on something real. Claude offers vague theme seeds; David picks the vibes he
  likes. (First batch of seeds: see below.)

### Theme seeds (vague, for David to react to — Nov 19)
1. **Inheritance.** What you owe the dead and what you refuse to carry: debts, grudges, names, gods. Factions
   are heirs to different pasts (keep it, sell it, burn it, rewrite it).
2. **Hunger and appetite.** Every faction is a different appetite (for safety, pleasure, knowledge, being
   remembered). Demons are appetites with faces. Endings ask what you were really hungry for.
3. **The commons.** A shared thing (a river, a city, a network) everyone needs and nobody owns. Who should
   decide how it's used: the strongest, the oldest, everyone, no one? Based on real fights over water and land.
4. **Masks and names.** Demons have true names; people have public faces. Factions split over whether truth
   should be known, hidden, or chosen. The protagonist's own name and history are in play.
5. **Leaving home.** Staying, leaving, returning, or building somewhere new. Each companion is one way of
   growing up (Catherine-adjacent); the dungeon is the move out of a small world.
6. **Care and control.** Every faction wants to protect people, and each version of protection becomes a cage
   for someone. Based on real institutions (family, church, state, crew, algorithm).
7. **Contracts.** Everything is a deal (demon pacts, marriages, treaties, debts). Factions disagree on whether
   promises bind forever, can be broken, or were never fair. Negotiation is already the core mechanic.

### David's reaction to the seeds (Nov 19)
- Masks and true names, leaving home, and care and control are good on vibes, but mostly contrived. (Maybe:
  one character keeps up appearances, one likes to keep it real?) Hunger doesn't have multi-faceted ideologies.
- Law and chaos make sense because they're extremes you can easily apply: law is good but lacks freedom if
  taken too far; chaos is freeing but you lose safety, reliability and control. The extreme of neutral is being
  indecisive: no conviction, middle of the road, helping no one.
- **The theme should be: taken to the extreme, you can't have room for everything.** Like an election: you can't
  be both Democrat and Republican; trying to be neutral is a different thing again; and the Green Party or
  abolishing the two-party system are different again. Several positions that exclude each other, each with a
  real cost when pushed all the way.
- To be figured out later.

## Reported by David after playing (Nov 19)
- "The very simplest version of the idea; needs much more work in every aspect, but that's the general idea."
- Kappa was way too fixated on making him answer its riddle; changing the topic didn't change its replies.
  `[fixed: live prompt now follows topic changes and avoids repeating its own questions; mock replies vary]`
- Ran into far too many Kappa before dying. `[fixed: 30-demon encounter tables, no same group twice in a
  row, floor 1 a little gentler]`

## Reported by David after his first Flood Ward run (Nov 20, live)
- Couldn't open the Journal while talking, needed the river's name. `[fixed v19: Journal button in talk; the
  SALLOW stones record the name]`
- Read High Water's "You kept every door open until the water closed them" as the tunnel doors letting the water
  in faster. `[fixed v20: "all your options open"]`
- "I really thought I would go back at some point after learning what happened and got everyone to agree on a
  solution." Ines wanted to stop demons leaving, Dario wanted out, and he thought: "fuck this council that just
  bricked in a town." He went down to figure out what was going on with the well, "and then every demon was nicer
  than the people. I was for sure ready to help the demons out cause they were all cool and not being stubborn or
  selfish."
  - Gap 1: no beat where you come back up with what you learned and broker a deal between the leaders.
  - Gap 2: no way to turn on the council itself (the frame), though his theme note asks for options that "reject
    the whole frame" (abolish the two-party system).
  - Gap 3: siding with the demons only counts through Hester's trust, not through how he treated the demons.
  - Possible hook already in the bible: "The old survey shows an outfall under the wall, bricked up ninety years
    ago" — the river could go home through the wall, back to the city that buried it.
- Nov 20, after the run: "I never had to fight any demons ... but I didn't really need to recruit anyone. It was
  just basically a walk through flirting with PNGs off Wikipedia." Writing felt off: the stamped wrench pointed at a
  merchant who took the gate off, but in talk "it was hard to remember they were a merchant and not like a greedy
  boss guy." Didn't want to trek back up to catch a lie when he expected to bring it all back at once. "The whole
  thing was messy." Bigger point: can't make meaningful changes on the fly (kill an important NPC and still get a
  satisfying conclusion); endings are AI-authored gates; "AI game with AI text and AI flow." Wants us to work out
  together a game I can actually make, that he'd love, and that couldn't exist before AI — not just more hours.
