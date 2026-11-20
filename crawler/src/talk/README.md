# talk/ — negotiation (pure)

`startTalk(enemyCombatant, ctx)` → talk; loop `prompt(talk, ctx)` → `{kind:'question', text, options}` |
`{kind:'demand', demand:{kind:'money'|'item'|'hp'|'mp', amount|item}, canPay}` | `{kind:'end', outcome}`;
answer with `answer(talk, stance, ctx)` / `respond(talk, pay, ctx)`. Outcome kinds: join | gift (item) | leave | fled | angry.
`ctx = { rng, heroLevel, money, inv, heroHp, heroMaxHp, heroMp, heroMaxMp, enemyHpPct }`.
Personality → stance mood table in `PREFS`; demand reactions in `DEMAND_REACT`. Notebook: `{ types:{type:personality},
stances:{personality:{stance:delta}}, demands:{personality:{pay, refuse, ran}} }` via `recordTalk`.
