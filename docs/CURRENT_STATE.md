# Current State

> **Read this file first at the start of every coding session, and update it last.**
> It is the single source of truth for where this project actually is. If it
> disagrees with memory, assumption, or an older document, this file wins.

| Field | Value |
| --- | --- |
| Last updated | 2026-09-05 |
| Repository | [`gesh75/claude-mastery-hub`](https://github.com/gesh75/claude-mastery-hub) |
| Local path | `/Users/georgigaydarov/Projects/claude-mastery-hub` |
| Branch | `cursor/gap-scan-claude-mastery-hub-2b32` |
| Last merged PR | [#43](https://github.com/gesh75/claude-mastery-hub/pull/43) — Buildkite incomplete push payload |
| Open PRs | [#45](https://github.com/gesh75/claude-mastery-hub/pull/45) — gap scan + improvement plan |
| Latest CI on `main` | run [`33035449029`](https://github.com/gesh75/claude-mastery-hub/actions/runs/33035449029) — workflow `CI`, check `Quality gate`, event `push`, **success** |
| Tests | **175** — content-currency 13 · p0-responsive-navigation 16 · roadmap-dashboard 9 · persisted-state 20 · practice-lab-validation 21 · gate-hardening 12 · content-counts 5 · model-registry-rendering 10 · workflow-orchestration 8 · managed-agents 30 · evals 19 · context-engineering 12 |
| Branch protection | **active and verified** on `main` (see below) |
| Deployment | GitHub Pages serving `main`, live page byte-identical to the repo |
| Unresolved Critical/Important | none |

## Reading the current HEAD

This file deliberately does **not** record `main`'s commit SHA. A documentation
commit cannot contain its own squash SHA, so any recorded HEAD is already stale
the moment the PR merges — which happened twice before this was fixed.

A PR **number**, unlike its squash SHA, *is* knowable while the PR is being
written, so the row above names the PR that last touched this file and stays
accurate through its own merge. Read the live HEAD instead of recording it:

```bash
git rev-parse origin/main
```

A regression test enforces this: the header must not pin a 40-hex SHA, must name
the last merged PR, and must advertise a test count equal to the committed
anti-vacuity baseline.

## Branch protection on `main`

Applied and read back 2026-07-30; a direct push was rejected with
`protected branch hook declined`.

- pull request required before merging
- required status check: **`Quality gate`** (strict — branch must be up to date)
- `enforce_admins`: **true** (applies to the sole maintainer too)
- required approving reviews: 0 (sole-maintainer operation)
- force pushes blocked · branch deletion blocked
- conversation resolution required · no push-restriction bypass list

**Consequence:** every change to `main`, including documentation, goes through a
pull request with a green `Quality gate`.

## Quality gate

`.github/workflows/ci.yml` runs on `pull_request` → `main`, `push` → `main`, and
`workflow_dispatch`:

| Step | Enforces |
| --- | --- |
| `npm ci` | lockfile integrity |
| `scripts/check-diff.mjs` | whitespace/conflict errors over an **exact per-event commit range** |
| `npm audit --audit-level=high` | no high/critical advisories |
| `scripts/check-static.mjs` | YAML + JS AST + CSS structural integrity, offline guarantee, workflow self-check |
| `npm test` (`CI=true`) | the Playwright suite; `forbidOnly` active |
| `scripts/check-test-results.mjs` | the suite actually ran what it claims, from a credible report |

Artifacts upload **only on failure** (7-day retention).

## Milestones

| # | Milestone | State |
| --- | --- | --- |
| #13 | P0 responsive containment + mobile nav a11y | merged `8e6f8fb` |
| #14 | Opus 5 currency + content-currency controls | merged `9924a6b` |
| #15 | Copilot custom instructions | merged `11cd194` |
| #16 | Enforced CI quality gate | merged `7f7f24f` |
| #17 | Documentation system + visual roadmap | merged `7be4ce3` |
| #18 | Persisted-state integrity | merged `7049355` |
| #19 | Practice Lab validation | merged `dc20627` |
| #20 | Final programme state + Notion sync | merged `59086b8` |
| #21 | External-audit findings closed | merged `f830158` |
| #22 | Advertised counts reconciled | merged `aae8d25` |
| #23 | CURRENT_STATE stops recording a volatile HEAD | merged `a44b472` |
| #24 | Personal email removed from public docs | merged `36df225` |
| #27 | MIT LICENSE added | merged `70bfd68` |
| #28 | Model registry rendering + citation gate | merged `fe53eb6` |

## Deferred

**Maintainability consolidation.** Keep the app single-file unless extraction
produces a measurable maintenance benefit; never mix that with a behaviour fix.
Carried in `PROJECT_ROADMAP.md`; recorded here too so neither file undercounts.

## Next action

**Re-verify `MODEL_FACTS` against official Anthropic / Claude Code docs and
refresh `MODEL_FACTS_VERIFIED_AT`.** Last verified 2026-07-28 — 39 days stale
on 2026-09-05; policy review-due is 30 days. Ranked leftovers live in
`GAP_ANALYSIS.md`.

Do not inherit a section, diagram, Lab or test count from any document; derive it
at branch time, and exclude the dated `#changelog` block from every count guard
(`DECISION_LOG.md`, 2026-08-09).
