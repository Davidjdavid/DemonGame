# Hollow Spire (crawler)

A first-person grid dungeon crawler with SMT-style press-turn combat, a negotiation menu, recruiting and fusion.
Built for David; see DESIGN.md (brief + amendments), PROGRESS.md (status), CLAUDE.md (working rules).

```
npm install
npm run build     # dist/index.html (one inline bundle)
npm run serve     # http://localhost:5173
npm test          # lint + unit tests
npm run e2e       # headless Playwright runs
```

URL flags: `?floor=<id>`, `?seed=N`, `?fast=1`, `?noenc=1`, `?test=1`.
