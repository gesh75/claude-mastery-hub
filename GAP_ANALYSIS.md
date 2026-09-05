# Gap analysis — Claude Mastery Hub

Scanned `main` at `b4f7af6` (PR #43) on 2026-09-05. This is a docs/site repo:
one offline `index.html`, Playwright + Node gate scripts, no backend.

**Method.** Read `docs/CURRENT_STATE.md`, the Quality gate, and the gate
scripts. Ran structural counts against `index.html`. Grepped workflows for
citation checks, retries, and `persist-credentials`. Compared
`docs/DECISION_LOG.md` and `package.json` `verify` to `.github/workflows/ci.yml`.
Did **not** re-verify model facts against primary sources, crawl external
links, or run a currency rewrite.

---

## P0

### P0-1 — CI retries cannot recover a run

**Files.** `playwright.config.js:7` · `scripts/check-test-results.mjs:266-270`

**Evidence.** Config sets `retries: process.env.CI ? 1 : 0`. The anti-vacuity
script fails any test whose `results.length > 1` (`retried: … this suite is
deterministic`). Under `CI=true` a flake that *passes on retry* still fails
the Quality gate at `npm run check:results`. The retry path cannot succeed; it
can only waste a browser cycle and then fail closed.

**Fix in this PR.** `retries: 0`, pinned.

### P0-2 — Copilot setup checkout keeps the default token in `.git/config`

**File.** `.github/workflows/copilot-setup-steps.yml:23-24`

**Evidence.** `actions/checkout` is used with no `persist-credentials: false`.
`ci.yml:10` documents that flag as the repo's security posture (keeps the
checkout token out of `.git/config`). `ci.yml` and `mutation.yml` both set it.
This workflow does not. Default checkout writes `GITHUB_TOKEN` into git config
for the rest of the job.

**Fix in this PR.** Same `persist-credentials: false` as the other workflows.

---

## P1

### P1-1 — Citation checker is not a named Quality-gate step

**Files.** `.github/workflows/ci.yml` (no `check:citations`) ·
`package.json:13` (`verify` runs it) · `docs/DECISION_LOG.md:116-120`
(claims `check-citations.mjs` “runs inside the Quality gate”) ·
`docs/plan/BRIEFS.md:97-98` (PR #28 said “Do not touch the workflow file”)

**Evidence.** `rg check-citations .github/workflows/ci.yml` is empty. The
script is zero-network and is what kills mutation catalogue entries M-03 and
M-04. A Playwright test in `tests/e2e/model-registry-rendering.spec.js`
already execs it against the live tree, so a dangling source *would* fail
`npm test`. The named step is still missing: a citation defect waits for
browser install, and the documented gate table in `docs/CURRENT_STATE.md:59-66`
omits it.

**Fix in this PR.** Add `npm run check:citations` after static checks.

### P1-2 — Model-facts registry is past review-due

**File.** `index.html` (`MODEL_FACTS_VERIFIED_AT='2026-07-28'`)

**Evidence.** `scripts/check-citations.mjs` treats >30 days as review-due
(surfaced, not failed). On 2026-09-05 that date is **39 days** old.
`docs/CONTENT_CURRENCY_POLICY.md` asks for a two-week ID/pricing review.
`WORKFLOW_FACTS_VERIFIED_AT` and `MANAGED_AGENT_FACTS_VERIFIED_AT` are
`2026-08-09` (27 days — not yet due).

**Not fixed here.** A currency pass needs primary-source re-verification.
Out of scope for this scan.

### P1-3 — Session-of-record docs still say “this PR” for merged work

**Files.** `docs/CURRENT_STATE.md:87` (`#28` … `this PR`) ·
`docs/PROJECT_ROADMAP.md:86` (`#39` … `this PR`)

**Evidence.** Header of `CURRENT_STATE.md` correctly names last merged PR
**#43**. The milestones table still labels #28 as the in-flight PR.
`PROJECT_ROADMAP.md` never recorded #40–#43 and still calls #39 “this PR”.
Agents that trust those tables inherit a finished programme as current work.

**Not fixed here** beyond the required `CURRENT_STATE.md` session update
(test count, open PR, next action, Quality-gate row). Full roadmap backfill
is a docs-only follow-up.

### P1-4 — `CLAUDE.md` agent brief is a year of PRs behind

**File.** `CLAUDE.md`

**Evidence.** Checkpoint date `2026-07-12`. History stops at #15. “Known
loose ends” still claims hero/README/og section-count drift (`37` / `39/40`).
`tests/e2e/content-counts.spec.js` already derives those counts from the DOM
and would fail if the live page drifted. The loose end is stale instruction,
not a live product bug. Ship-flow still names branch
`claude/product-gaps-improvements-h5gdn4`.

**Not fixed here.** Rewriting the Omega brief is a dedicated docs job.

---

## P2

| ID | Gap | Evidence | Why not now |
| --- | --- | --- | --- |
| P2-1 | Roadmap dashboard header still says “Updated 2026-07-31” | `docs/roadmap/index.html:85` | Cosmetic; test count is derived from `expected-tests.json` |
| P2-2 | `docs/NOTION_SYNC.md` and `docs/plan/VERIFIED_BASELINE.md` freeze old counts (78/167 tests, 12 Lab items, 41 sections) | Those files say they are historical / “do not copy” | Deleting them loses the audit trail; leave as dated snapshots |
| P2-3 | README has no `npm test` / `npm run verify` instructions | `README.md` “Use it” is open-the-file only | DX only; Copilot instructions already document the commands |
| P2-4 | Six sections have no `QUIZ` key | `start-here`, `whats-new`, `lab`, `exam`, `cheatsheet`, `ai-glossary` (38 quiz keys / 44 sections; 126 questions) | Looks intentional (intro, news, the lab/exam themselves, reference pages) |
| P2-5 | No Dependabot / Renovate | `.github/` has no dependabot workflow | Dev-toolchain only; `npm audit --audit-level=high` already blocks the gate |
| P2-6 | Maintainability consolidation (split `index.html`) | Already deferred in `docs/PROJECT_ROADMAP.md` | Explicitly out of scope |
| P2-7 | External link liveness | `docs/DECISION_LOG.md` 2026-08-09 ruled it out of the Quality gate | Network in CI is non-deterministic by policy |

**Dead code.** No unused scripts or orphaned specs. `tests/helpers/lab.js` is
outside `*.spec.js` on purpose. `@axe-core/playwright` is used in
`tests/e2e/p0-responsive-navigation.spec.js`. `scripts/make-og.mjs` is
on-demand; `og.meta.json` is asserted live.

**Secrets.** No live credentials. The only secret-shaped string in product
markup is the educational placeholder `ghp_xxx` in an MCP example
(`index.html` MCP section).

---

## Fixes in this PR (3, all CI/security)

1. `playwright.config.js` — `retries: 0` so the anti-vacuity gate and the
   runner agree.
2. `.github/workflows/copilot-setup-steps.yml` — `persist-credentials: false`.
3. `.github/workflows/ci.yml` — named `npm run check:citations` step.

One gate-hardening test pins all three so they cannot silently revert.

---

## What this scan skipped

Primary-source model/pricing re-verification; live GitHub Pages byte-compare;
external URL crawl; Notion re-sync; splitting `index.html`; dependency
upgrades; new Lab/exam items; rewriting `CLAUDE.md` history.

## Next recommended agent job

Re-verify `MODEL_FACTS` / `MODEL_SOURCES` / `BENCHMARK_EVIDENCE` against
primary sources and bump `MODEL_FACTS_VERIFIED_AT` (39 days past the 30-day
review-due threshold).
