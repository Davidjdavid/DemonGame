# Progress

Artifact (playable): _not yet published_
Publish: `npm run build`, then Artifact publish of `crawler/dist/index.html` (same path keeps the URL).
Branch: `claude/charming-ride-udpk6u` (folder `crawler/` inside the DemonGame repo; see DESIGN A1).

## Current stage
**Stage 1 — Movement and view** (started Nov 20 22:15 UTC).
- [x] Floor format + parser, movement rules (doors, locks, one-way, shortcuts, warps, launchers), map memory
- [x] Validator (state BFS over keys + shortcuts: goal reachable, no softlocks, can always get back down)
- [x] Three.js view: outlined wall panels tinted per area, doors with frames (variants for lock / one-way /
      barred shortcut), stairs, chests, warp, launcher, save, heal, warning, boss, exit, shop counters + signs
- [x] Smooth steps (180 ms) and turns (170 ms), bump animation, door opening, warp flash, launcher slide,
      dark-zone fog
- [x] Automap (M), optional corner minimap (Esc menu, off by default), compass, floor + area name
- [x] Unit tests (9) + e2e `10-explore`
- [ ] Publish Stage 1 checkpoint

## Next steps
Stage 2: combat solo vs a few enemy types (port DemonGame press-turn engine with the 6 affinity tiers), battle
screen with enemy figures in a row + HP bars, press-turn icons, element effects, analyze, escape, encounters.

## Decisions
- Lives in `crawler/` on the session branch (no new repo was available). DESIGN A1.
- Three.js (npm, bundled by esbuild, minified ~530 KB) rather than a raycaster: thin walls, doors and objects are
  simple meshes; flat canvas textures with dark outlines keep edges readable.
- Camera sits 0.8 behind the cell centre (cell = 2 units, walls 2.2 high, FOV 68): you see the walls beside you
  and a wall in front never fills the screen. Turning orbits the cell centre slightly.
- Floors are ASCII maps (thin edges between 1-char cells) + a small legend; rock cells auto-wall themselves.
- Shortcut doors: open from one side only, then a normal two-way door for good (saved in floor flags).
  One-way doors stay one-way. Locks stay unlocked once opened (keys aren't consumed).
- Dark zones: dense black fog (about one cell of view) and the automap doesn't record those cells or show you.
- Arrow keys follow the brief (move/strafe like WASD); Q/E turn.
- Chests open when you step on them.
- The game is single-theme dark on purpose (a game screen), named "Hollow Spire".
