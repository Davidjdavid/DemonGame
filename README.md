# DemonGame

A plotless gameplay prototype of an SMT-style RPG: free-form demon negotiation (live Claude), press-turn
combat, fusion and a small three-floor dungeon. Play it in the published claude.ai artifact (link in
PROGRESS.md). There's no story yet on purpose.

- **Design:** DESIGN.md (the Amendments section at the bottom overrides the original text).
- **Status, decisions, known issues:** PROGRESS.md.
- **Working rules for Claude sessions:** CLAUDE.md.

## Run it locally

```
npm install
npm run build        # bundles src/ into dist/index.html, copies assets/
npm run serve        # http://localhost:5173 (demons use scripted replies offline)
npm test             # unit tests (node:test)
npm run e2e          # headless Playwright playthroughs
node scripts/sim.mjs           # combat balance report
node scripts/sim-dungeon.mjs   # demo-dungeon balance report
```

Useful URL flags locally: `?screen=hub` (test rooms), `?brain=mock`, `?seed=7`, `?fast=1`.

## Where things live

- `src/talk/` negotiation engine, live prompt, live and mock brains
- `src/combat/` press turns, tiers, damage, AI, simulator policies
- `src/growth/` leveling, fusion, compendium
- `src/dungeon/` floor generator and exploration
- `src/game/` player, stock, shop, saves
- `src/data/` demon cards (`demons/<id>.json`), battle data (`battle.json`, `battle/<id>.json`), skills, items,
  armor, fusion chart, dungeon floors
- `src/ui/` screens; `src/platform/` claude.ai capability wrappers
- `scripts/` build, sims, generators (skills, dungeon, indexes), image pipeline (`scripts/images/`)
- `assets/` public-domain / CC0 images and `credits.json`
