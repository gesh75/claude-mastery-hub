# Decision Log

Durable record of decisions that are not recoverable from the code or git history.
Newest first. Each entry states the decision, why, and what it rules out.

---

## 2026-08-09 — The dated changelog is history, not a claim

**Decision.** Every live-count guard excludes `index.html`'s
`<details id="changelog">` block. Its entries are dated statements about what
shipped when — "Jul 2026 — New Practice Lab: 12 hands-on scenario challenges",
"Jun 2026 — panels on all 24 diagrams" — and are never reconciled against the
current count.

**Why.** The first version of the Practice Lab drift guard matched that block. It
would have forced rewriting the changelog on every addition, and turned a
historically accurate sentence into a build failure. A count guard exists to catch
a *stale live claim*; a dated entry is not a live claim.

**Rules out.** Bumping a number inside the changelog to satisfy a test, and
whole-file regex matching for advertised counts. The guard strips the block and
asserts it is still findable and closed, so the exclusion cannot silently become a
no-op if the id changes.

**Corrects.** `docs/plan/` and both adversarial critics listed the changelog among
the claim sites to bump. Live diagram claims are **four**, not five. The Practice
Lab has **one** live claim (`README.md`), not two.

---

## 2026-08-09 — Link-liveness checking stays out of the Quality gate

**Decision.** `scripts/check-citations.mjs` validates citations without fetching
them: schema conformance, two-way referential integrity between `MODEL_FACTS` and
`MODEL_SOURCES`, and that every URL is `https`, credential-free, and on the
primary-source allowlist. No `lychee`, no network call, no new dependency.

**Why.** The `claude-cookbooks` repo's `lychee.toml` was the obvious pattern to
lift, and the citation load added by the content PRs is exactly what it would
protect. But the gate's design rule is no `continue-on-error` and no `|| true`, so
anything placed in it is blocking — and a blocking check that makes network
requests is non-deterministic by construction. A third-party outage would turn
`main` red for a reason unrelated to the change under review.

**Rules out.** Adding link-liveness to the blocking gate. If it is ever wanted it
belongs in a separate scheduled workflow whose failure notifies rather than blocks.

**Also rules out** failing the build on a stale `MODEL_FACTS_VERIFIED_AT`. The
checker asserts only that the date is a valid calendar date that is not in the
future; staleness is surfaced, because failing on it would make an unrelated PR
red for a content-owner problem.

---

## 2026-08-09 — Advertised counts are derived at branch time, never inherited

**Decision.** No branch takes a section, diagram, Lab or test count from a plan
document. Each is recomputed from the DOM at branch time — `.master-cb` for
sections, `.diagram` (never `.anim-x`) for diagrams, `window.LAB.length` for
challenges — and `totalMinimum` is recomputed as the sum of observed
`perFileMinimum` values, never by arithmetic against the previous total.

**Why.** Five independently written PR briefs each computed their deltas against
the same baseline, so at most one could have been right. Three said sections
41→42 when the batch end state is 44; four said diagrams 24→25 when it is 27–28.
`content-counts.spec.js` derives the section count from `.master-cb`, so that one
fails loudly on the second merge and is recoverable — but the diagram and Lab
counts were guarded by nothing and would have shipped silently false, the same
drift class PR #22 existed to end.

**Rules out.** Plan documents that carry count arithmetic for any PR that is not
first to merge, and any diagram guard built on `.anim-x` — that selector is 25,
not 24, because the changelog panel is an `anim-x` that is not a diagram.

---

## 2026-08-09 — The registry renders the page, and a registry defect fails the build

**Decision.** `MODEL_FACTS` / `MODEL_SOURCES` / `BENCHMARK_EVIDENCE` now *drive*
the `#whats-new` DOM through `renderRegistry()`, and `scripts/check-citations.mjs`
runs inside the Quality gate. Closes the "model registry rendering" deferred item.

**Why.** The 2026-07-28 entry below created the registry and recorded a known
gap: several fields were maintained but never consumed by a renderer, so the
registry and the visible prose could disagree with nothing to catch it. Wiring
the fields in reduces a currency pass to a single registry edit, as intended. Writing
the checker uncovered a live instance of the gap it was built to close —
`prompting` and `releaseNotes` were cited in the rendered prose but missing from
`MODEL_FACTS.opus.sources`.

**Rules out.** Hand-typing a volatile value into `#whats-new` markup. The
availability cell, the feature-exception list, the fast-mode row, the
verification stamp, the benchmark tbody, and the primary-source list are all
empty in source; a value typed into them is dead text a test will not see.

**Two deliberate visible changes.** The primary-source list went from 9
hand-written entries to 16 rendered ones — the hand-written list had silently
omitted seven cited sources. The fast-mode row now names all four excluded
platforms; the hand-written cell listed three and dropped "Claude Platform on
AWS".

**No network, no dependency.** The checker is a pure function of the checked-out
tree, and its JSON-Schema subset is hand-rolled rather than pulling in a
validator. See the link-liveness entry below.

**Staleness is surfaced, not failed.** An old `MODEL_FACTS_VERIFIED_AT` prints a
review-due line and exits 0. A future date fails, because a date cannot be
verified before it happens.

---

## 2026-07-30 — `enforce_admins: true` on `main`

**Decision.** Branch protection applies to the sole maintainer as well; no bypass.

**Why.** The point of the gate is that nothing reaches `main` unverified. An
admin bypass makes it advisory, and the maintainer is the only person who could
use it — so the exemption would cover 100 % of traffic.

**Rules out.** Direct pushes to `main`, including one-line documentation fixes.
Every change is now a PR with a green `Quality gate`. Accepted cost.

---

## 2026-07-30 — Structural parsing over regex for security-critical checks

**Decision.** Workflows are parsed with `yaml`; inline scripts with `acorn`.

**Why.** Three independent bypasses were found in regex-based checks, all
formatting-sensitive: `uses : x` (space before colon) evaded action-pin
enforcement, `var helper, top = 1` evaded the `window.top` rule because the
pattern only saw the first declarator, and `style='…'` evaded the CSS scan
because the corpus regex was double-quote-only. Text matching cannot be made
reliable for these; parsing can.

**Rules out.** Adding more regex special cases for workflow or JS semantics.
Two checks remain deliberately textual — `|| true` and `${{ github.event.* }}`
inside **parsed** `run` scalars, and network sinks inside **parsed** script
bodies — and are labelled as heuristic in the PR body.

---

## 2026-07-30 — `yaml` pinned to 2.9.0, not 2.6.1

**Decision.** Use `yaml@2.9.0` even though `--audit-level=high` accepted 2.6.1.

**Why.** 2.6.1 carries GHSA-48c2-rrv3-qjmp, a stack overflow on deeply nested
YAML. It is only *moderate*, so the gate's own threshold would have let it
through — but this parser reads workflow files from fork pull requests. A
vulnerable parser inside the security gate is the wrong trade.

**Rules out.** Treating `--audit-level=high` as the whole dependency policy.
`npm audit` is expected clean at **every** severity.

---

## 2026-07-30 — Anti-vacuity is a first-class gate requirement

**Decision.** CI validates that the suite actually executed what it claims.

**Why.** A green suite is not evidence. Observed failure modes: a report with
`{"status":"expected","results":[]}` (declared pass, nothing ran), a spec path
escaping the repository, a whole spec file silently dropping out while the total
stayed above a naive minimum, and a stray `test.only` narrowing the run to one
test.

**Rules out.** Trusting the exit code alone. Spec identity is the
repository-relative path (never `basename()`), every clean pass must be exactly
one recorded `passed` attempt, and a spec absent from the committed baseline
fails rather than warns.

---

## 2026-07-29 — ARC-AGI-3 shows both the exact and rounded score

**Decision.** Present `30.2 % rounded / 30.16 % exact` as one result.

**Why.** ARC Prize publishes both: `30.16 %` in the verified-score table and
`30.2 %` in the page headline. An earlier pass read only the headline, concluded
`30.16 %` was unreproducible, replaced it, and added a test forbidding the string
— which locked the error in. The conclusion was withdrawn.

**Rules out.** Tests that forbid a legitimate value. Assertions now check the
*relationship* between the two figures. The reusable lesson: trusting a page's
summary over its own detail table.

---

## 2026-07-28 — Volatile model facts live in one registry

**Decision.** `MODEL_FACTS` / `MODEL_SOURCES` / `BENCHMARK_EVIDENCE` hold IDs,
pricing, limits, cutoffs, and sources, with a verification date.

**Why.** The same facts were duplicated across a dozen static tables and drifted
independently. One registry makes a currency pass a single edit.

**Known gap.** Several registry fields are not yet consumed by a renderer.
Tests assert both the registry and the rendered HTML so they cannot drift
silently. Wiring the rest into rendering is deferred.
