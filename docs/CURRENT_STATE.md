# Current State

> **Read this file first at the start of every coding session, and update it last.**
> It is the single source of truth for where this project actually is. If it
> disagrees with memory, assumption, or an older document, this file wins.

| Field | Value |
| --- | --- |
| Last updated | 2026-07-30 |
| Repository | [`gesh75/claude-mastery-hub`](https://github.com/gesh75/claude-mastery-hub) |
| Local path | `/Users/georgigaydarov/Projects/claude-mastery-hub` |
| Branch | `main` |
| `main` | `f830158ce116dd8030cefaf348734ec6c5f283fa` |
| Active PR | count-drift reconciliation (`fix/count-drift`) |
| Latest CI on `main` | run [`30618478289`](https://github.com/gesh75/claude-mastery-hub/actions/runs/30618478289) — workflow `CI`, check `Quality gate`, event `push`, **success** |
| Tests | **86** — content-currency 13 · p0-responsive-navigation 16 · roadmap-dashboard 9 · persisted-state 20 · practice-lab-validation 20 · gate-hardening 6 · content-counts 2 |
| Branch protection | **active and verified** on `main` (see below) |
| Deployment | GitHub Pages serving `main` |
| Unresolved Critical/Important | none |
| Production | verified on live Pages: live `index.html` sha256 identical to repo; 0 overflow at 320–1440 px; 0 console errors; 0 external requests |

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
| #17 | Documentation system + visual roadmap | merged `7be4ce3` |
| #18 | Persisted-state integrity | merged `7049355` |
| #19 | Practice Lab validation | merged `dc20627` |
| #20 | Final programme state + Notion sync | merged `59086b8` |
| #21 | External-audit findings | merged `f830158` |

## Next action

**None — programme complete.** Remaining deferred item is model-registry rendering, which is a design choice rather than a defect.
