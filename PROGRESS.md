# PROGRESS

Artifact (the playable game): https://claude.ai/artifact/Vo3R1RPYKAMAQGD3edcyCv
Publish: `npm run build`, then Artifact publish of `dist/index.html` (same file path keeps the URL; from a new
session pass the URL as `url` and read it first). Declared capabilities: `sample`, `db`, `user` (omit
`capabilities` on redeploys to keep them). Images go up as `files` (`assets/...` paths).

Hourly work check: scheduled task `trig_014UbhsRmL6FZcyks7cxZh4Y` (fires :48 each hour into this session).
Disable it after David's review (2026-11-20 17:00 America/Chicago).

## Current stage
**Stage 2 — Combat** (in progress). Stage 1 published (artifact version 3); portraits pending from the image pipeline.

GitHub: pushes are refused (403 "Resource not accessible by integration" for git push AND the GitHub API), so the
Claude GitHub App likely isn't installed on Davidjdavid/DemonGame. Commits are local on `main` until David fixes
access; then `git push -u origin main`. Backup: source is also kept with the artifact at checkpoints (see below).

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

### Stage 1 — Talking (published 2026-11-19, artifact v3)
Checkpoint report:
- Try: open the artifact, Approach a demon, Talk, and type freely ("quotes" = speech, anything else = action).
  - Ares (proud, into flirting): talk glory, take his blow, or flirt; asking him to join directly backfires; begging = he attacks.
  - Hephaestus (shy, married): ask about his craft; flirting puts him off; mocking his limp ends it; one hidden line recruits him.
  - Kappa (polite trickster): manners, nonsense, cucumbers; it may ask to "pop back to the river" — say yes and it's gone.
  - Tick "Demons are spoiling for a fight" to practice talking your way out of one. Field notes fill in on the hub.
- The first message asks you to allow the page to use Claude. If you decline, demons fall back to scripted replies.
- Combat is a placeholder until Stage 2 ("To the fight" just ends the encounter).
- Code: `src/talk/` (engine.js rules + dice, normalize.js clamps Claude's output, prompt.js live prompt,
  liveBrain.js / mockBrain.js), cards in `src/data/demons/*.json`, UI `src/ui/app.js`.
- Tests: 24 unit tests (`tests/talk.test.js`), 6 Playwright scenarios (`e2e/scenarios/`), all passing.

## Decisions
- Publish as a single bundled inline script (esbuild IIFE) rather than many module files: the artifact CSP
  guidance says to inline JS; source stays plain ES modules. Images are separate published files.
- Game look is a single committed dark theme (no light mode) — it's a game screen.
- Live talk uses the default model tier. (Design note: default tier "thinks" first, so replies can take
  5-60 s. If that feels slow, a settings toggle for the quick tier is a one-line change.)

- Talk is free-form text only (no option buttons), per David. Claude returns a JSON proposal (reply, moodDelta,
  matched ids, playerAct, attemptChance, demonAct, demand/gift, playerGives, ifFails). The engine clamps it and
  rolls dice for ask_join / mug / beg / trick / threaten; Claude writes both the success reply and an `ifFails`
  reply so one call covers either roll.
- Mood is -5..+5 (hidden). Offer-to-join honored at mood >= 3; gifts at >= 2; demon-started fights only at <= -1
  or after a hostile act or in a hostile encounter. Asking a proud/shy demon to join always fails and costs mood.
- Joining above your level: he lets you pass instead. Duplicate: he gives a gift instead.
- Kappa is flirt "n/a" (child-sized imp); Hephaestus "taken"; Ares "into it".
- Player starts Lv 10, 2500 gold, 3 Healing Salve, 2 Mana Tonic, 2 Cucumber, Wine, Honey Cake, Bronze Ingot.
- Currency is "gold" (placeholder name).

## Known issues
- Live Claude can't be tested headless; David tests it in the artifact.

## Next
- Stage 1: talk system with 3 demons (Ares, Hephaestus, a kappa), free-form input, brain interface (live + mock),
  outcomes, field notes, starting purse/items.
