# Decision Log

Durable record of decisions that are not recoverable from the code or git history.
Newest first. Each entry states the decision, why, and what it rules out.

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
