# world/ — floor format, movement, map memory, encounters (pure)

## Coordinates
Cells `(x, y)`: x grows east, y grows south. Directions are numbers: `0=N 1=E 2=S 3=W`
(`DX=[0,1,0,-1]`, `DY=[-1,0,1,0]`). Turning right is `(d+1)%4`.

## Floor source format (`src/data/floors/<id>.js`, default export)
```js
export default {
  id: 'f1', name: '1F Rusted Halls', depth: 1,       // depth 0 = hub
  start: [x, y, dir],                                 // where a new game / ?floor= starts
  map: [ '+-+-+', '|U .|', ... ],                     // (2h+1) lines of (2w+1) chars
  legend: { a: { type: 'chest', item: 'medicine', count: 2 }, W: { type: 'shop', shop: 'weapons' } },
  locks: { L: 'brass_key' },                          // lock edge char -> key item id
  warps: { 1: { oneway: false } },                    // optional; default: the two '1' cells are a two-way pair
  dark: [[x0, y0, x1, y1]],                           // inclusive rects of dark-zone cells
  areas: [{ rect: [x0, y0, x1, y1], color: '#5a6d8a', name: 'Pipe Gallery' }], // later rects win
  color: '#6b6f78',                                    // default area color
  encounters: { table: ['slime', 'wisp'], level: [1, 3], rate: [15, 30] }, // absent = no fights (hub)
}
```
Map characters. Corners (even row, even col) are ignored (`+`). Cells sit at odd row/odd col; edges between them.

| Cell char | Meaning |
|---|---|
| ` ` or `#` | solid rock (no cell; its edges are walls) |
| `.` | floor |
| `U` / `D` | stairs up / down |
| `X` | exit (leave the dungeon / to the floor named in legend `X`) |
| `R` | save point · `H` heal spring · `!` warning tile · `B` boss |
| `1`-`9` | warp tile (same digit = pair) |
| `^ > v <` | launcher: pushes you that way until something stops you |
| other letters | `legend[char]` (chests, keys, shops, signs) |

| Edge char | Meaning |
|---|---|
| ` ` | open |
| `-` `|` | wall |
| `d` | door |
| `> < v ^` | one-way door: passable only travelling the arrow's direction |
| `n e s w` | shortcut door: opens only travelling that direction (N/E/S/W); once opened it is a normal door for good |
| uppercase letter | locked door; `locks[char]` is the key item id; once unlocked it stays a door |

## Parsed floor (`parseFloor(src)` in floor.js)
`{ id, name, depth, w, h, start, cells[], hEdges[], vEdges[], warps{}, src }`
- `cells[y*w+x] = { x, y, solid, feature, dark, area, color }`; `feature` is `null` or `{ type, ... }`
  (`stairs` {dir:'up'|'down'}, `exit`, `save`, `heal`, `warn`, `boss`, `warp` {id, to:[x,y]|null},
  `launch` {dir}, `chest`/`shop`/... from the legend; chests get `id: 'floorId:x,y'`).
- Edges are objects `{ id, type, dir?, key? }` with `type` in `open | wall | door | oneway | shortcut | lock`.
  `edgeAt(floor, x, y, d)` returns the edge on side `d` of cell `(x, y)`.

## Runtime flags (saved with the game)
`flags = { opened: { [edgeId]: true }, unlocked: { [edgeId]: true }, chests: { [chestId]: true } }`.

## Movement (`move.js`)
`tryMove(floor, flags, inv, x, y, travelDir)` -> `{ ok, x, y, edge, opened?, unlocked?, msg? }`.
`arrive(floor, x, y, dir)` resolves warps/launchers into a list of follow-up moves for the UI to animate.

## Map memory (`mapMemory.js`)
Per floor: `{ cells: Set('x,y'), edges: Set(edgeId) }` — visited cells and the edges seen from them.
Dark-zone cells are never recorded.
