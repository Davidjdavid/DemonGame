# game/ — game state, hub services, saves

`newGame()` → `{ version, seed, pos{floor,x,y,dir}, floors{id:{flags, mem}}, inv, money, hero, party[≤3], stock[≤5],
nextUid, notebook, registry, deepest, stats, enc, steps, settings{minimap, battleSpeed}, playMs, bossDown }`.
`shop.js` (buy/sell, healer, inn), `fieldItems.js` (items + heal skills outside battle), `rewards.js` (after a battle),
`save.js` (pack map memory as bitmaps; `packSave`/`unpackSave`). Storage: `platform/storage.js` (db + localStorage).
