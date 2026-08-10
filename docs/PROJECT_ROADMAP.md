# Project Roadmap

Durable plan for **Claude Mastery Hub** — an interactive, single-file guide to
mastering Claude, shipped as one dependency-free `index.html`.

- **Live:** https://gesh75.github.io/claude-mastery-hub/
- **Live state:** [CURRENT_STATE.md](CURRENT_STATE.md) — always read first
- **Decisions:** [DECISION_LOG.md](DECISION_LOG.md)
- **Execution history:** [CHANGELOG_EXECUTION.md](CHANGELOG_EXECUTION.md)
- **Visual dashboard:** [roadmap/index.html](roadmap/index.html)

## Product invariants

These are not negotiable. A change that breaks one is a defect, not a tradeoff.

1. **One file, zero dependencies.** Everything ships in `index.html` — inline
   CSS and JS. `open index.html` works with no build step and no network.
2. **Fully offline.** The page fetches nothing at load. External documentation
   links are allowed; external subresources are not.
3. **Progress is the user's.** Learning state lives in `localStorage` only.
   There is no backend and no telemetry.
4. **Contained layout.** No document-level horizontal overflow at any width from
   320 px up. Wide tables scroll inside their own container.
5. **Keyboard accessible.** Mobile navigation opens and closes from the keyboard,
   and a closed menu exposes no focusable controls.
6. **Facts are verified, not remembered.** Model and pricing claims are checked
   against official docs and carry a verification date.

## Architecture

| Layer | Where | Notes |
| --- | --- | --- |
| Content | `index.html` — `<section class="sec" id="…">` | Six nav tracks; reveal-on-scroll via IntersectionObserver |
| Learning engines | `QUIZ`, `EXAM`, `LAB` objects | Data-driven; rendered into their sections |
| Model facts | `MODEL_FACTS`, `MODEL_SOURCES`, `BENCHMARK_EVIDENCE` | Single registry for volatile facts + verification date |
| Persistence | `localStorage` keys `claude_hub_*_v1` | quiz · exam · mastery · nav · lab |
| Quality gate | `.github/workflows/ci.yml` + `scripts/check-*.mjs` | Structural, not textual — see below |
| Tests | `tests/e2e/*.spec.js` | Playwright + axe |

### Quality gate design

The gate is built so that a green run cannot be vacuous:

- **`check-diff.mjs`** resolves an **exact commit range per event** and refuses to
  substitute a different one. A bare `git diff --check` on a clean tree inspects
  nothing, so the range is the whole point.
- **`check-static.mjs`** parses workflows with `yaml` and inline scripts with
  `acorn`, so formatting cannot bypass action SHA pinning or the read-only
  `window.top` binding rule. Offline integrity covers markup subresources, CSS
  `url()`/`@import`/`image-set()`, style attributes in every quoting form, and
  runtime network sinks in inline JS.
- **`check-test-results.mjs`** validates the Playwright report structurally and
  requires every clean pass to be exactly one recorded `passed` attempt, so
  declared metadata is never accepted as evidence of execution.

## Milestones

### Complete

| PR | Milestone | Merge |
| --- | --- | --- |
| [#13](https://github.com/gesh75/claude-mastery-hub/pull/13) | P0 responsive containment + mobile-nav accessibility | `8e6f8fb` |
| [#14](https://github.com/gesh75/claude-mastery-hub/pull/14) | Opus 5 currency, centralized model facts, benchmark provenance | `9924a6b` |
| [#15](https://github.com/gesh75/claude-mastery-hub/pull/15) | Copilot custom instructions | `11cd194` |
| [#16](https://github.com/gesh75/claude-mastery-hub/pull/16) | Enforced CI quality gate + branch protection | `7f7f24f` |
| [#17](https://github.com/gesh75/claude-mastery-hub/pull/17) | Durable documentation + offline roadmap dashboard | `7be4ce3` |
| [#18](https://github.com/gesh75/claude-mastery-hub/pull/18) | Persisted-state integrity | `7049355` |
| [#19](https://github.com/gesh75/claude-mastery-hub/pull/19) | Practice Lab validation | `dc20627` |
| [#20](https://github.com/gesh75/claude-mastery-hub/pull/20) | Final programme state + Notion sync | `59086b8` |
| [#21](https://github.com/gesh75/claude-mastery-hub/pull/21) | External-audit findings closed | `f830158` |
| [#22](https://github.com/gesh75/claude-mastery-hub/pull/22) | Advertised counts reconciled and pinned | `aae8d25` |
| [#23](https://github.com/gesh75/claude-mastery-hub/pull/23) | CURRENT_STATE stops recording a volatile HEAD | `a44b472` |
| [#24](https://github.com/gesh75/claude-mastery-hub/pull/24) | Personal email removed from public docs | `36df225` |
| [#27](https://github.com/gesh75/claude-mastery-hub/pull/27) | MIT LICENSE added | `70bfd68` |
| [#28](https://github.com/gesh75/claude-mastery-hub/pull/28) | Model registry rendering + citation gate | `fe53eb6` |
| [#29](https://github.com/gesh75/claude-mastery-hub/pull/29) | Derive the Practice Lab count | `21798dc` |
| [#30](https://github.com/gesh75/claude-mastery-hub/pull/30) | Cookbook-tracks programme recorded | `c2c1bde` |
| [#31](https://github.com/gesh75/claude-mastery-hub/pull/31) | Workflow orchestration spine | `873df14` |
| [#32](https://github.com/gesh75/claude-mastery-hub/pull/32) | Managed Agents (core) | `645551f` |
| [#33](https://github.com/gesh75/claude-mastery-hub/pull/33) | Managed Agents (advanced) | `be7756d` |
| [#34](https://github.com/gesh75/claude-mastery-hub/pull/34) | Section-header structure + a11y guard | `2ac1de2` |
| [#35](https://github.com/gesh75/claude-mastery-hub/pull/35) | Evals track | `929b9d2` |
| [#36](https://github.com/gesh75/claude-mastery-hub/pull/36) | Context engineering + spend attribution | `e3ac3bf` |
| [#37](https://github.com/gesh75/claude-mastery-hub/pull/37) | Nav-icon a11y | `9b72fda` |
| [#38](https://github.com/gesh75/claude-mastery-hub/pull/38) | Record reconciliation | `851f4eb` |
| #39 | Post-merge reconciliation closeout | this PR |

### In progress

Nothing. All planned milestones are merged and production-verified.

### Deferred

**Maintainability consolidation.** Keep the app single-file unless extraction
produces a measurable maintenance benefit; never mix that with a behaviour fix.

## Working agreement

1. Read [CURRENT_STATE.md](CURRENT_STATE.md) first; update it last.
2. One concern per pull request. Never mix an application fix into a docs PR.
3. Write the regression test before the production change.
4. `main` is protected. Every change goes through a PR with a green `Quality gate`.
5. Verify facts against primary sources and record the verification date.
6. On a defect: reproduce → fix → add a regression test → run the full gate.
