# AI playtest brief

You are playtesting **Hollow Spire**, a first-person grid dungeon crawler with SMT-style press-turn combat, made for
David. Play it through the HTTP harness, then write an honest report.

## Run the harness
```
cd crawler && npm run build && node scripts/harness.mjs --port=8765 --seed=<n>
```
- `curl -s localhost:8765/state` — what's on screen and what you can do.
- `curl -s localhost:8765/map` — the automap of the current floor (only what you've walked).
- `curl -s -X POST localhost:8765/act -d '{"do":["fwd","fwd","turnR"]}'` — move (fwd, back, left, right = strafe;
  turnL, turnR). Movement stops early when a battle, shop, prompt or talk opens.
- `-d '{"click":"Attack"}'` then `-d '{"target":1}'` — battle commands and targets; `{"click":"[Agree]"}` in talks;
  `{"click":"Go up"}` on stairs prompts; `{"click":"Continue"}` after battles; shop buttons by their text.
- `-d '{"key":"Escape"}'` opens the menu (Party, Items, Notebook, Settings) and closes panels; `{"key":"KeyM"}` the map.

## What the game should deliver (judge against this)
David's loop from SMT if...: a hub with shops, healer, inn and fusion → climbing floors where first enemies take a few
hits solo → after a few recruits fights end in a turn or two → each floor up is harder → near the top you fuse or go
back down to restock → then you run back up through shortcuts with a filled map and stomp the middle/upper floors.
Recruiting must matter (you need your monsters to survive). He dislikes: navigation by minimap instead of the view,
janky movement, not seeing enemy counts, minimal attack animations.

Curve targets: first combat floor solo: enemies take 2-4 hits, fights 2-4 rounds, low risk. With 2-3 recruits: 1-2
rounds. Each new floor: new types that are a real fight the first time (3-5 rounds), weaknesses to discover. After a
restock: mid/upper floors 1-2 rounds, little damage/MP. Boss: 8-12 rounds, needs weakness play and buffs/debuffs.
Level ~1 → 15-20 by the boss. A first clear should take 45-90 minutes for a person.

## Report (write to `crawler/docs/playtest-N.md`)
- What you did (floors reached, levels, recruits, fusions, deaths, restock trips, rough number of fights).
- Per floor: how the fights felt against the targets above (rounds, danger), how navigation felt (could you tell where
  you were from the text view and the map? did loops/shortcuts help on the way back?).
- Negotiation: was it learnable? Did recruiting matter?
- Bugs and confusing moments (exact steps). Anything that blocked progress.
- Top 10 fixes, most important first. Be specific and honest; don't praise what didn't work.
