# Current State

> **Read this file first at the start of every coding session, and update it last.**
> It is the single source of truth for where this project actually is. If it
> disagrees with memory, assumption, or an older document, this file wins.

| Field | Value |
| --- | --- |
| Last updated | 2026-07-30 |
| Repository | [`gesh75/claude-mastery-hub`](https://github.com/gesh75/claude-mastery-hub) |
| Local path | `/Users/georgigaydarov/Projects/claude-mastery-hub` |
| Branch | `docs/project-roadmap` (working) |
| `main` | `7f7f24fbd30f3f5c6fda9c44c70c55a936e8b0b8` |
| Active PR | documentation system (this branch) |
| Latest CI on `main` | run [`30520594773`](https://github.com/gesh75/claude-mastery-hub/actions/runs/30520594773) — workflow `CI`, check `Quality gate`, event `push`, **success** |
| Tests | **29** — `tests/e2e/content-currency.spec.js` 13 · `tests/e2e/p0-responsive-navigation.spec.js` 16 |
| Branch protection | **active and verified** on `main` (see below) |
| Deployment | GitHub Pages serving `main` |
| Unresolved Critical/Important | none |

## Branch protection on `main`

Applied and read back 2026-07-30; a direct push was rejected with
`protected branch hook declined`.

- pull request required before merging
- required status check: **`Quality gate`** (strict — branch must be up to date)
- `enforce_admins`: **true** (applies to the sole maintainer too)
- required approving reviews: 0 (sole-maintainer operation)
- force pushes blocked · branch deletion blocked
- conversation resolution required · no push-restriction bypass list

**Consequence:** every change to `main`, including documentation, now goes
through a pull request with a green `Quality gate`.

## Quality gate

`.github/workflows/ci.yml` runs on `pull_request` → `main`, `push` → `main`, and
`workflow_dispatch`:

| Step | Enforces |
| --- | --- |
| `npm ci` | lockfile integrity |
| `scripts/check-diff.mjs` | whitespace/conflict errors over an **exact per-event commit range** |
| `npm audit --audit-level=high` | no high/critical advisories |
| `scripts/check-static.mjs` | YAML/AST/CSS structural integrity, offline guarantee |
| `npm test` (`CI=true`) | Playwright suite; `forbidOnly` active |
| `scripts/check-test-results.mjs` | the suite actually ran what it claims |

Artifacts upload **only on failure** (7-day retention).

## Milestones

| # | Milestone | State |
| --- | --- | --- |
| PR #13 | P0 responsive containment + mobile nav a11y | merged |
| PR #14 | Opus 5 currency + content-currency controls | merged |
| PR #15 | Copilot custom instructions | merged |
| PR #16 | Enforced CI quality gate | merged `7f7f24f` |
| — | Documentation system + visual roadmap | in progress (this branch) |
| — | Persisted-state integrity | not started |
| — | Practice Lab validation | not started |

## Next action

**Merge the documentation PR, then start `fix/persisted-state-integrity`.**
