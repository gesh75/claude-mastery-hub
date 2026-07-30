# Execution Changelog

What actually shipped, with the evidence. Newest first.

Every entry records the merge commit, the CI run that verified it, and how
production was confirmed — so a claim here can always be re-checked.

---

## 2026-07-30 — PR #19: Practice Lab validation

**Merge** `dc206273eb92ee8ae9e4b95434357039dbf4b01c`
**PR CI** `30524290477` · **Push CI** `30524608091`

Prefix matching accepted a bare `@`, `!`, `#`, and `claude -p` as complete
answers, and `/compacting nonsense` passed because it merely started with a
keyword. Replaced with explicit per-challenge validators enforcing the required
operand. Case handling follows real semantics: slash commands case-insensitive,
file paths case-sensitive. Shell chaining rejected in path and prompt operands,
deliberately still allowed after `!`.

20 tests, RED-verified first (19 of 20 failed). Both automated reviewers caught a
real bug in the first fix: the chaining guard matched a pipe only when followed
by whitespace, so `@a.ts|rm -rf /` passed. Fixed to reject the character itself.

---

## 2026-07-30 — PR #18: Persisted-state integrity

**Merge** `7049355ba53f354be144ade58d3998c4ded9cb64`
**PR CI** `30522824115` · **Push CI** `30523044535`

Two live defects, both found by a test written before the fix: a stored `null`
parsed successfully and crashed startup at `Object.keys(null)` outside the
try/catch, and mastery counted arbitrary stored keys against a fixed total,
producing over 100%.

Bounded safe parsing, schema version 2 with idempotent migration and a safe
unknown-future-version fallback, validation and clamping, and deterministic
cross-tab merge over the native `storage` event (sets union, scalars max,
explicit reset by newest `resetAt`).

20 tests. Copilot correctly identified that the original duplicate-key test was
vacuous — `JSON.parse` already collapses duplicate keys — so it was rewritten to
test the value filter that actually matters.

---

## 2026-07-30 — Documentation system

**Branch** `docs/project-roadmap`

Adds `PROJECT_ROADMAP.md`, `CURRENT_STATE.md`, `DECISION_LOG.md`,
`CHANGELOG_EXECUTION.md`, and an offline visual dashboard at
`docs/roadmap/index.html`, plus a CLAUDE.md rule that every session reads
`CURRENT_STATE.md` first and updates it last.

No application change: `index.html` untouched.

---

## 2026-07-30 — Branch protection on `main`

Applied and read back; verified by an actual rejected push
(`protected branch hook declined`, "Required status check "Quality gate" is
expected").

PR required · `Quality gate` required and strict · `enforce_admins: true` ·
0 approvals · force pushes and deletions blocked · conversation resolution
required · no bypass list.

---

## 2026-07-30 — PR #16: Enforced CI quality gate

**Merge** `7f7f24fbd30f3f5c6fda9c44c70c55a936e8b0b8`
**PR CI** run `30473825382` (`pull_request`, success)
**Push CI** run `30520594773` (`push`, success) — exact range
`96d69d23…` → `7f7f24fb…`, 9 files, 29 tests, artifacts `0`

Gate: `npm ci` · diff integrity over an exact per-event range · `npm audit` ·
structural static checks · 29 Playwright tests under `CI=true` · test-result
integrity. Artifacts on failure only, 7-day retention.

Verified by **59 executable probes** immediately before merge — 12 diff-range,
16 anti-vacuity, 31 structural — plus the 34 + 37 + 28 probes accumulated across
three review rounds.

Three review rounds closed, each with a reproduced counterexample:
1. push ranges collapsed through `merge-base` and fell back to `HEAD^`
2. the report validator accepted a declared pass with no execution record
3. `uses :`, `var helper, top`, and `style='…'` all bypassed regex checks

---

## 2026-07-29 — PR #14: Opus 5 currency and content-currency controls

**Merge** `9924a6b0f4aa724ff0fbe08699058c1dca269275`
**Deploy** Pages build for `9924a6b0`, `status: built`; live page sha256
matched the repo's `index.html` byte for byte, and pre-merge content ("Opus 4.8",
zero "Opus 5") was provably gone.

Current five-model lineup · `MODEL_FACTS` registry with verification date ·
provenance-labelled benchmarks · two Opus 5 migration exceptions (API Web Fetch
unavailable, Priority Tier unsupported) · Fast mode scoped to the Claude API and
Claude Code usage credits without implying limits on ordinary availability.

Production smoke: zero overflow at 320/390/768/920/921/1024/1280/1440/1920 px,
zero console errors, zero external requests.

---

## 2026-07-28 — PR #15: Copilot custom instructions

**Merge** `11cd1942848ba6a31a0d84dad42f7d548cea9296`

---

## 2026-07-28 — PR #13: P0 responsive containment and mobile-nav a11y

**Merge** `8e6f8fb54cd4c6a054529b491250ad73b59b62e6`

Page-level overflow contained, mobile navigation made keyboard and
screen-reader accessible, durable Playwright + axe regressions added.
