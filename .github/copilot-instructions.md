# claude-mastery-hub

Interactive single-page guide to mastering Claude - covers the app, Claude Code, the API, MCP, skills, subagents, and hooks. Ships as one self-contained `index.html`, published to GitHub Pages.

**Stack.** Hand-authored HTML + vanilla JS. Playwright for E2E and axe-core for accessibility.

**Layout.** `index.html` is the whole site. `tests/` Playwright specs, `docs/`

## Build and test

```bash
npm ci
npx playwright install --with-deps chromium
npx playwright test
```

Run the tests before proposing a change is done. If you cannot run them, say so explicitly
rather than claiming the change is verified.

## Engineering conventions (non-negotiable)

- **Type hints on every function signature.** No bare `def f(x):`.
- **async/await for all I/O.** Never block the event loop with sync network or disk calls.
- **Immutable data.** Return new objects; do not mutate arguments in place.
- **Tests first.** Write the failing test, watch it fail, then implement. Target 80%+ coverage.
- **Small files.** 200-400 lines typical, 800 hard max. Extract modules rather than growing a file.
- **Small functions.** Under 50 lines. Nesting no deeper than 4 levels - use early returns.
- **Handle every error explicitly.** Never swallow an exception silently. Log context server-side,
  return a friendly message user-side.
- **Validate at boundaries.** Never trust user input, API responses, or file contents.
- **No hardcoded secrets, ever.** Environment variables or a secret manager only. No credentials
  in code, comments, logs, tests, or fixtures.
- **Conventional Commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`.
  Imperative mood, lower case, no trailing period. Do **not** add `Co-authored-by` trailers.

## Before you propose a change

1. Read the surrounding code and match its idiom, naming, and comment density.
2. Prefer a battle-tested library over hand-rolled utility code.
3. If you touch auth, user input, DB queries, file paths, or external calls, re-read the
   security rules above before finishing.

## Single-file site - specific gotchas

- Everything lives in `index.html`. There is no build step; edit it directly and keep it
  self-contained (no external CDN scripts, fonts, or stylesheets).
- **Anchor SVG edits on a unique `aria-label`, never on a shared `viewBox`.** Multiple diagrams
  reuse the same viewBox, so a viewBox-based selector will silently edit the wrong graphic.
- **Never use a gradient fill with a clip-path on text.** It renders as solid black boxes when
  the page is exported to PDF. Use a solid fill.
- Run `npx playwright test` before pushing - the suite includes axe-core accessibility checks,
  so a contrast or ARIA regression fails CI.
- Content sections carry dates ("What's New"). Keep them accurate; do not invent release dates
  or model names - verify against primary sources first.

## Pull requests

- Title in Conventional Commits form.
- Body covers: what changed, why, blast radius, and a test plan as a checklist.
- Summarise the whole commit range, not just the last commit.
