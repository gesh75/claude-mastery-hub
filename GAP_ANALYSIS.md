# Gap analysis — Claude Mastery Hub

Verified 2026-09-05 against `origin/main` at `b4f7af6` (PR #43).
This is a docs/site repo: one offline `index.html`, Playwright + structural
gates, no backend. Gaps below are things I could **prove** from the tree,
`gh`, or a local command — not invented product work.

**Live derived counts** (from `index.html`, not inherited):

| Thing | Count | How |
| --- | ---: | --- |
| Mastery-tracked sections (`.master-cb`) | 43 | DOM / source |
| `<section class="sec">` | 44 | `#whats-new` is the one untracked section |
| Nav links / tracks / diagrams | 44 / 6 / 24 | match README + `og.meta.json` |
| Practice Lab / exam / quiz questions | 25 / 20 / 126 | `LAB` / `EXAM` / `QUIZ` |
| Playwright baseline | 175 | `scripts/expected-tests.json` |

**What is fine.** Latest `Quality gate` on `main` is green
([run 33035449029](https://github.com/gesh75/claude-mastery-hub/actions/runs/33035449029),
push of `b4f7af6`). Weekly Mutation harness green
([run 33390484653](https://github.com/gesh75/claude-mastery-hub/actions/runs/33390484653),
2026-08-31). `npm audit --audit-level=high` is clean. No secrets, no
`pull_request_target`, CI checkout already uses `persist-credentials: false`.
Advertised section / diagram / Lab / track counts on the **page, README, and
`og.meta.json`** already match (PR #22 / #39). `check-citations.mjs` is
invoked against the real tree from
`tests/e2e/model-registry-rendering.spec.js` (`runCitations()`), so a registry
defect still fails the Quality gate even though it is not a named CI step.

---

## P0 — session-protocol correctness

No user-facing product failure. These are P0 because this repo's own rule is
that `docs/CURRENT_STATE.md` and `CLAUDE.md` are the source of truth for the
next agent, and both currently **lie**. Each cites a file + evidence.

### P0-1. Leftover `this PR` in merged milestone tables

The same defect class #39 already burned on: *"#28's `this PR` sat stale
through ten merges."*

| File | Evidence |
| --- | --- |
| `docs/CURRENT_STATE.md:87` | `\| #28 \| Model registry rendering + citation gate \| this PR \|` — merge is `fe53eb6` (`git log -1 fe53eb6`) |
| `docs/PROJECT_ROADMAP.md:86` | `\| #39 \| Post-merge reconciliation closeout \| this PR \|` — merge is `8881d8b` |
| `tests/e2e/roadmap-dashboard.spec.js` | The CURRENT_STATE / roadmap tests never forbid a leftover `this PR` in a **completed** milestone row |

`rg 'this PR'` over those two files is the failing check. A future session
that trusts the table will treat #28 or #39 as the open PR.

**Fix in this PR:** replace the two placeholders with the merge SHAs; extend
the existing CURRENT_STATE test so a leftover `this PR` in a completed
milestone table fails the build. No new spec file (count stays 175).

### P0-2. `CLAUDE.md` still tells agents the section count is drifted

| File | Evidence |
| --- | --- |
| `CLAUDE.md:130-132` | `hero says "37", README/og say "39/40"` |
| `index.html` hero + `#ringmeta` | advertise **43** sections |
| `README.md:8` | `43 deep‑dive sections` |
| `og.meta.json` | `"sections": 43` (generated 2026-08-10) |
| `tests/e2e/content-counts.spec.js` | would fail if the hero / README / og claims were still 37 / 39 / 40 — **it does not read `CLAUDE.md`** |

Missing test: nothing asserts `CLAUDE.md` stopped claiming the pre-#22 drift.
An agent following the "Known loose ends" bullet will "reconcile" numbers that
are already reconciled, or worse, rewrite the hero to 37 and turn the gate red.

**Fix in this PR:** delete the stale bullet; assert the existing CLAUDE.md
test rejects `hero says "37"` / `39/40`.

---

## P1 — real, not this PR

### P1-1. Model-facts registry is past review-due

| File | Evidence |
| --- | --- |
| `index.html` (`MODEL_FACTS_VERIFIED_AT='2026-07-28'`) | 39 days old on 2026-09-05 |
| `scripts/check-citations.mjs` | `REVIEW_DUE_DAYS = 30`; prints `stale by N days, review due` and **exits 0** (DECISION_LOG 2026-08-09: staleness is surfaced, never failed) |
| `docs/CONTENT_CURRENCY_POLICY.md` | "Review model IDs, pricing, token limits, and availability every two weeks" |

`WORKFLOW_FACTS_VERIFIED_AT` and `MANAGED_AGENT_FACTS_VERIFIED_AT` are
`2026-08-09` (27 days) — still inside the 30-day window.

Out of scope here: a currency pass needs official-docs re-verification, not a
date bump. That is the next agent job.

### P1-2. Durable records stopped at #38 / #28 / #19

| File | Evidence |
| --- | --- |
| `docs/roadmap/index.html:85` | header still says "Updated 2026-07-31" |
| `docs/roadmap/index.html` cards | last card is PR #38 (`851f4eb`); **#39–#43 are missing** (og regenerate, mutation harness, three CI adapter pins) |
| `tests/e2e/roadmap-dashboard.spec.js:93` | only requires `PR #13`…`#22` — later cards can vanish unnoticed |
| `docs/CURRENT_STATE.md` milestones | table ends at #28; #29–#43 are absent (not just the leftover `this PR`) |
| `docs/CHANGELOG_EXECUTION.md` | newest entry is **2026-07-30 / PR #19**; #20–#43 never landed |

Filling those tables is a dedicated docs PR, not a drive-by.

### P1-3. Playwright `retries: 1` under CI contradicts the anti-vacuity checker

| File | Evidence |
| --- | --- |
| `playwright.config.js:7` | `retries: process.env.CI ? 1 : 0` |
| `scripts/check-test-results.mjs:266-271` | any `flaky` status or `results.length > 1` **fails the gate** ("this suite is deterministic") |

A flake that recovers on retry still fails `check:results`. The retry setting
cannot save the job; it only burns time. Fix is `retries: 0` always. Skipped
here to keep the fix list to three.

### P1-4. Copilot setup checkout keeps the default credential persist

| File | Evidence |
| --- | --- |
| `.github/workflows/copilot-setup-steps.yml:23-24` | `actions/checkout` with **no** `persist-credentials: false` |
| `.github/workflows/ci.yml:10,53` and `mutation.yml:35` | both set `persist-credentials: false` and document why |

Default persist writes `GITHUB_TOKEN` into `.git/config`. This job is
`contents: read` and only runs on that file / `workflow_dispatch`, so it is
not a fork-PR hole — but it is the one checkout that violates the repo's own
security comment.

**Fix in this PR:** add `persist-credentials: false`.

---

## P2 — later, or by design

- **`check-citations` is not a named CI step.** `.github/workflows/ci.yml`
  does not run `npm run check:citations`. `docs/plan/BRIEFS.md:98` said "Do
  not touch the workflow file"; `docs/DECISION_LOG.md:119-120` still says the
  checker "runs inside the Quality gate". Coverage is via Playwright, not a
  first-class step. Adding the step would be belt-and-suspenders, not a hole.
- **`CLAUDE.md` history stops at #15** (checkpoint date 2026-07-12). Session
  protocol is still correct; the history block is memorabilia.
- **Quiz gaps** for `#start-here`, `#whats-new`, `#cheatsheet`, `#lab`,
  `#ai-glossary`, `#exam` (38 quiz keys vs 43 tracked sections). The last five
  are reference / engines, not lessons. `#start-here` is the only plausible
  add.
- **Link liveness** stays out of the gate on purpose (DECISION_LOG 2026-08-09).
- **Single-file maintainability** remains the one deferred architectural item.
- **`docs/plan/`** briefs still carry count arithmetic (`86 → 96`, etc.) that
  DECISION_LOG 2026-08-09 already forbade inheriting. Historical; do not "fix"
  the archive.

---

## Fixes in this PR (3, all small)

1. Replace leftover `this PR` in `docs/CURRENT_STATE.md` (#28 → `fe53eb6`)
   and `docs/PROJECT_ROADMAP.md` (#39 → `8881d8b`); guard completed milestone
   tables in the existing roadmap spec.
2. Delete the stale `CLAUDE.md` 37 / 39 / 40 loose end; guard the existing
   CLAUDE.md spec against those strings.
3. `persist-credentials: false` on `.github/workflows/copilot-setup-steps.yml`.

No `index.html` edits. No dependency upgrades. No new features.

---

## What I proved / skipped

**Proved.** `main` Quality gate and Mutation are green. Audit clean. Live
counts 43 / 25 / 24 / 6. Two leftover `this PR` rows. `CLAUDE.md` still
claims the #22 drift. Model-facts date is 39 days old. Copilot checkout is
the only one that persists credentials. `retries: 1` cannot pass
`check:results`. Roadmap / CURRENT_STATE / CHANGELOG_EXECUTION are behind
#39–#43. No secret matches in tracked files.

**Skipped.** Official-docs re-fetch of the model lineup (Exa MCP rate-limited;
a date bump without verification would violate the currency policy). Filling
roadmap cards and changelog for #39–#43. Setting `retries: 0`. Adding
`check:citations` as a named CI step. Running the full Playwright suite
before this file existed (ran after the three fixes). Single-file extraction.

**Next recommended agent job.** Re-verify `MODEL_FACTS` against official
Anthropic / Claude Code docs and refresh `MODEL_FACTS_VERIFIED_AT` (last
verified 2026-07-28, 39 days stale, policy review-due at 30).
