# PROGRESS

Artifact (the playable game): https://claude.ai/artifact/Vo3R1RPYKAMAQGD3edcyCv
Publish: `npm run build`, then Artifact publish of `dist/index.html` (same file path keeps the URL; from a new
session pass the URL as `url` and read it first). Declared capabilities: `sample`, `db`, `user` (omit
`capabilities` on redeploys to keep them). Images go up as `files` (`assets/...` paths).

Hourly work check: scheduled task `trig_014UbhsRmL6FZcyks7cxZh4Y` (fires :48 each hour into this session).
Disable it after David's review (2026-11-20 17:00 America/Chicago).

## Current stage
**Stage 1 — Talking** (next).

## Stage log
### Stage 0 — Setup (done 2026-11-19)
- DESIGN.md (original verbatim + Amendments), CLAUDE.md, PROGRESS.md.
- Scaffold: `src/**` ES modules, `scripts/build.mjs` (esbuild bundles to one inline script in
  `dist/index.html`), `scripts/serve.mjs` (local server, wraps the page like the platform does),
  `npm test` (node:test), `npm run e2e` (Playwright, `e2e/scenarios/*.cjs`).
- Published the artifact, then declared `sample` + `db` + `user`: accepted (contract 0.2.96).
- Network: created personal environment "DemonGame" allowing commons.wikimedia.org, upload.wikimedia.org,
  collectionapi.metmuseum.org, images.metmuseum.org, api.artic.edu, www.artic.edu, raw.githubusercontent.com.
  All reachable. Commons API answered 429 once without a descriptive User-Agent; use one + backoff.

## Decisions
- Publish as a single bundled inline script (esbuild IIFE) rather than many module files: the artifact CSP
  guidance says to inline JS; source stays plain ES modules. Images are separate published files.
- Game look is a single committed dark theme (no light mode) — it's a game screen.
- Live talk uses the default model tier. (Design note: default tier "thinks" first, so replies can take
  5-60 s. If that feels slow, a settings toggle for the quick tier is a one-line change.)

## Known issues
- Live Claude can't be tested headless; David tests it in the artifact.

## Next
- Stage 1: talk system with 3 demons (Ares, Hephaestus, a kappa), free-form input, brain interface (live + mock),
  outcomes, field notes, starting purse/items.
