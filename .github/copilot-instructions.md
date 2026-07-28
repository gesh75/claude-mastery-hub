# claude-mastery-hub

Interactive single-page guide to mastering Claude - the app, Claude Code, the API, MCP, skills,
subagents, and hooks. Ships as one self-contained `index.html`, published to GitHub Pages.

**Stack.** Hand-authored HTML + vanilla JavaScript. **No Python, no build step, no framework.**
Playwright for E2E, `@axe-core/playwright` for accessibility.

**Layout.** `index.html` is the whole site. `tests/e2e/*.spec.js`, `docs/`

## Build and test

```bash
npm ci
npx playwright install --with-deps chromium
npx playwright test
```

## Conventions

- **Small, focused edits.** `index.html` is large; change only the section you are working on.
- Keep the page **self-contained**: no external CDN scripts, stylesheets, fonts, or images.
- Vanilla JS only. Do not introduce a framework, bundler, or build step.
- Handle errors explicitly; never leave a silent failure in interactive code.
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `perf:`, `ci:`.
  Imperative mood, lower case, no trailing period. No `Co-authored-by` trailers.

## Single-file site - specific gotchas

- **Anchor SVG edits on a unique `aria-label`, never on a shared `viewBox`.** Several diagrams
  reuse the same viewBox, so a viewBox-based selector silently edits the wrong graphic.
- **Never combine a gradient fill with a clip-path on text.** It renders as solid black boxes
  when the page is exported to PDF. Use a solid fill.
- Run `npx playwright test` before pushing - the suite includes axe-core checks, so a contrast
  or ARIA regression fails CI.
- Content sections carry dates ("What's New"). Keep them accurate; do not invent release dates
  or model names - verify against primary sources first.

## Pull requests

- Title in Conventional Commits form.
- Body covers: what changed, why, and how you verified it renders correctly.
