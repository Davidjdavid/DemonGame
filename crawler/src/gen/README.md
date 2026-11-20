# gen/ — floor generator, metrics, walk sim, validator (pure)

A design tool: it drafts candidate floors in the floor source format (`world/README.md`); the chosen ones are
hand-tuned and frozen in `data/floors/`. Nothing here runs in the game.

- `generator.js` — `generateFloor(spec, seed)` -> floor source (always passes `validateFloor(parseFloor(src))`; a
  failed attempt retries with the next sub-seed). `sourceToModule(src, comment)` -> `export default {...}` text.
- `metrics.js` — `floorMetrics(floor | src, { walk = true })`, `scoreFloor(metrics, spec)` (higher = better).
- `walk.js` — `exploreWalk(floor)` (no-map explorer from D to the goal), `returnTrip(floor, flags, inv)`.
- `graph.js` — step graph from the real movement rules, BFS, undirected structure, bridges.
- `validate.js` — `validateFloor` (solvable, no softlocks/traps), `shortestPath`.
- `specs.js` — the 7 example specs used by `scripts/gen-floors.mjs` and the tests.

## Spec
```js
{ id: 'f3', name: '3F Draft', depth: 3, w: 13, h: 13,        // 10..20 each
  gimmicks: ['door', 'oneway', 'dark', 'warp', 'launch', 'lock'],
  shortcuts: 1, chests: 4, loops: 2, deadEnds: 4,           // counts / minimums (chests exclude key chests)
  oneways: 2, warpPairs: 1, lanes: 1,                       // optional gimmick budgets (defaults 2 / 1 / 1)
  keys: ['brass_key'], boss: false, encounters: {...} }     // boss: no U; B room + ! H R antechamber is the goal
```
Hard rules per floor: D->goal path >= 1.5 * (w + h) / 2, stairs Manhattan >= (w + h) / 2, loops >= spec.loops,
dead ends >= spec.deadEnds, exactly `shortcuts` shortcut doors, every walkable cell reachable, validator clean.

## How gimmicks are placed
- Rooms (2-5 cells a side) + a growing-tree maze over the rest, thin walls on edges; some dead ends pruned to rock.
- **lock / warp**: a bridge on the D->goal route is cut. A lock edge becomes `L` (key chest in an earlier section,
  off the route); a warp cut becomes a wall and warp pair `1` links a dead end in D's section to one past the cut.
  Extra warp pairs link two far dead ends in one section. Loops are only added inside a section.
- **oneway**: on loop edges (never bridges), about half pointing back toward D; kept only if nothing gets trapped.
- **dark**: one rect over the middle of the route, covering junctions; never over stairs, warps, lanes or a lock.
- **launch**: a walled straight lane (4-7 cells) with the launcher on its first cell and a door at its end.
- **shortcuts**: a wall between cell `a` on (or within 4 steps of) the first-trip route and a cell `b` nearer D
  becomes a barred door opening `a -> b`, greedily by how much it cuts the route; never into an earlier-locked section.

## Metrics (floorMetrics)
`pathLength` first trip (locks passable, bars closed) · `pathWithShortcuts` all bars lifted · `shortcutSaving` ·
`firstTrip` fetching keys · `stairsManhattan` · `loops` (E - N + C minus open 2x2 room blocks) · `cyclomatic` ·
`deadEnds` (one-way-in cells, not stairs/warps) · `chests`, `chestsInDeadEnds` (off the D-goal bridge-tree spine) ·
`longestStraightRun`, `turnsOnMainPath` · `cells` · `coverageOfMainPath` · gimmick counts · walk:
`walkFound`, `walkSteps`, `walkVisited`, `walkDarkForays`, `shortcutsOpenedByWalk`, `returnSteps`, `descentSteps`.

## Scripts
`node scripts/gen-floors.mjs [--n=60] [--only=3F] [--keep=3] [--seed=1]` -> `gen-out/<id>-<rank>.{js,png}` +
`report.md` (gitignored). `node scripts/render-floor.mjs <floor.js> [out.png]` re-renders a hand-tuned file.
