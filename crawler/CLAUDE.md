# Crawler — working rules

**Start of every session: read DESIGN.md (David's brief; its Amendments override it) and PROGRESS.md (current
stage, decisions, next steps) first**, plus IDEAS.md for David's parked ideas (add new ideas he sends there, close to
his wording, without building them unless asked). Then read only the folder README for the system you touch.
Sessions run out of context, so these files are the memory, not the chat.

## What this is
A first-person grid dungeon crawler for David (see DESIGN "Who it's for"): SMT-style press-turn combat, a simple
negotiation menu, recruiting, fusion, one hand-curated dungeon (hub + 6 combat floors + boss floor), 45-90 minutes.
No story, no live AI, placeholder visuals drawn in code.

## How to work
- Stages 1-6 (DESIGN "How to work"). Keep going through stages without waiting; at each stage end: tests, publish
  the artifact, checkpoint report in PROGRESS.md, commit, push, continue. Ask only when blocked.
- Make reasonable calls yourself and log them in PROGRESS.md "Decisions". Update PROGRESS.md every work block.
- Commit after each working step; push to `claude/charming-ride-udpk6u` (the only branch this session may push).
- Test before every checkpoint: `npm test` (lint + node:test) and `npm run e2e` (Playwright headless).

## Code rules
- Plain JavaScript ES modules, bundled with esbuild into one inline script (`dist/index.html`). Three.js from npm.
- Game rules live in pure modules (no DOM) with node:test tests in `tests/`. UI code lives in `src/ui/`.
- Targeted edits; don't rewrite big files. Script bulk work in `scripts/`.
- One folder per system; systems talk through small documented data formats (see each folder's README.md).

## Layout
- `src/world/` floor format + parser, movement rules, map memory, encounters (pure) — README has the floor format
- `src/combat/` press turns, affinities, battle engine, knowledge, AI/policies (pure)
- `src/talk/` negotiation (pure)
- `src/growth/` leveling, fusion (pure)
- `src/game/` player/party state, hub services, saves (pure + storage wrapper)
- `src/data/` monsters, skills, items, equipment, floors (`floors/*.js`, frozen)
- `src/gen/` floor generator, metrics, validator (pure; used by scripts and tests)
- `src/ui/` DOM + Three.js screens
- `scripts/` build, serve, sims, floor generation + PNG previews
- `tests/` unit tests; `e2e/` Playwright runs

## Debug URL flags
`?floor=<id>` start on a floor, `?seed=N`, `?fast=1` (instant animations), `?noenc=1` (no random encounters),
`?test=1` exposes `window.__game` for e2e.
