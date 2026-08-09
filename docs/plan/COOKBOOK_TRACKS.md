# Cookbook tracks — programme plan

Adds four curriculum units and one infrastructure change to Claude Mastery Hub,
sourced from [`anthropics/claude-cookbooks`](https://github.com/anthropics/claude-cookbooks).

**Baseline:** `main` at `21798dc`. **Measured facts:**
[VERIFIED_BASELINE.md](VERIFIED_BASELINE.md) — the single source for every number.
**Briefs:** [BRIEFS.md](BRIEFS.md).

| # | PR | State |
| --- | --- | --- |
| 5 | Model-registry rendering + citation gate | ✅ merged [#28](https://github.com/gesh75/claude-mastery-hub/pull/28) |
| 3a | Derive the Practice Lab count | ✅ merged [#29](https://github.com/gesh75/claude-mastery-hub/pull/29) |
| 3 | Workflow orchestration spine | ← next |
| 2a | Managed Agents — core | planned |
| 2b | Managed Agents — advanced | planned |
| 1 | Evals track | planned |
| 4 | Context engineering + spend attribution | planned |
| 6 | Record reconciliation | planned, last |

## What the source is

92 notebooks indexed in the cookbook's `registry.yaml`. Category spread: Tools 24,
Agent Patterns 22, RAG 19, Managed Agents 16, Integrations 16, Responses 13, Agent SDK 9,
Multimodal 8, Evals 7, Skills 5, Observability 4, Cybersecurity 2, Thinking 2, Fine-Tuning 1.

Two constraints on using it:

1. **The cookbook README is stale.** It links to old `anthropic-cookbook` paths and
   lists ~20 of the 92 recipes. `registry.yaml` is the only accurate index.
2. **Currency is bimodal.** 29 recipes are dated 2026; **44 are 2024-or-earlier**
   (Claude 2/3 era). The old tail may be cited as history but must not be imported as
   current guidance. Extract durable *methodology*, discard *model-specific surface*.

**Nothing from the cookbook can be embedded.** It is Python notebooks needing an API
key; this page is zero-dependency offline HTML. Its value is strictly: fact source,
citation target, section outline, and Practice Lab scenario material.

## Merge order

```
PR 5 ✅ → PR 3a ✅ → PR 3 → PR 2a → PR 2b → PR 1 → PR 4 → PR 6
```

**Why PR 5 went first** (this reversed the initial suggestion, and it held up):
it added no section, touched no `sec-num`, no nav line, no `.master-cb`, no `LAB`, no
`QUIZ` and no advertised count, so its footprint was disjoint from the renumber war.
It changed zero fact **values** — only how facts reach the DOM. And its
`registry-schema.json` defines the shape PRs 2b, 3 and 4 must conform to; landing it
last would have forced widening the schema around whatever already shipped. Its
`additionalProperties:false` on `MODEL_FACTS` would have broken outright if PR 2 had
landed a `managedAgents` key there first.

**Why PR 3a was split out** of PR 3: bundling a test refactor into a content PR is the
mixing working-agreement rule 2 forbids, and it was the highest-leverage change in the
programme — the six pinned `12`s were missed entirely by the generated PR 2 brief and
partially by PR 4's.

**Why the three section-adders go earliest-insertion-point first:** conflict cost
between them is symmetric regardless of order, so the ordering minimises **rework**.
Earliest-first means each PR only renumbers the tail it already planned to renumber.
The reverse order forces an earlier-inserting PR to renumber through sections that did
not exist when its brief was written — which is how a duplicate `SECTION` number ships.

## The changelog is history, not a claim

`index.html`'s `<details id="changelog">` panel carries **dated** entries:

> **Jul 2026** — New **Practice Lab**: 12 hands-on scenario challenges …
> **Jun 2026** — … "Animation, explained" panels on all 24 diagrams …

**Every live-count guard must exclude that block.** Binding a dated entry to the
current count forces rewriting history on each addition and turns a historically
accurate sentence into a build failure.

This corrects an earlier version of this plan **and both adversarial critics**, all
three of which listed the changelog among the claim sites to bump. It surfaced in
review on [#29](https://github.com/gesh75/claude-mastery-hub/pull/29) and is now
enforced: `content-currency.spec.js` strips the block and asserts it is still findable,
so the exclusion cannot silently become a no-op.

**Consequence for PR 3:** the diagram drift guard must exclude `#changelog` rather
than bump the `24 diagrams` inside it. Live diagram claims are four, not five.

## Cross-PR rulings

| Disputed | Owner | Ruling |
| --- | --- | --- |
| `patterns/agents/evaluator_optimizer.ipynb` | **PR 1** | it is an eval pattern first; PR 3 cites it by name without teaching the loop |
| `managed_agents/CMA_cap_session_spend.ipynb` | **PR 2b** | a budget is attached at session creation, enforced by the hosted runtime, reported by a `session.budget_reached` webhook. Meaningless outside that product |
| `managed_agents/CMA_plan_big_execute_small.ipynb` | **PR 4** | its subject is delegation *economics* — the cost lesson — not the Managed Agents API |
| Lab id `lab-budget` | **PR 2b** | PR 4 drops it and ships an Admin-API attribution challenge instead |
| Diagram drift guard | **PR 3** | it lands earliest and is first to add a diagram. PR 2 drops its duplicate |

The `lab-budget` collision deserves emphasis: two briefs independently proposed a
challenge with that id. The Lab renderer does `card.id=item.id` and keys solved state
by id, so two entries would produce duplicate DOM ids, cross-contaminate solved state,
and over-report `stats()`. **`check-static.mjs` cannot see it** — the ids are created
at runtime — so it ships green through the gate.

## Counts are derived, never merged

Every generated brief computed its count deltas independently against the same
baseline, so **at most one could have been right**. Sections: three said 41→42; the
end state is 44. Diagrams: four said 24→25; the end state is 27–28. Lab challenges:
12→16, 12→15, 12→15, 12→15; the end state is 25.

**Rule: no branch inherits a count from a document.** On every rebase, recompute from
the DOM and write the result into the live claim sites:

| Count | Derive from | Write into |
| --- | --- | --- |
| Sections | `document.querySelectorAll('.master-cb').length` | the six sites in [VERIFIED_BASELINE.md](VERIFIED_BASELINE.md) |
| Diagrams | `document.querySelectorAll('.diagram').length` — **never `.anim-x`** | the four **live** sites; never the changelog |
| Lab challenges | `window.LAB.length` | `README.md:12` only (preserve U+2011) |
| Test total | `playwright test <spec> --list`, summed | `expected-tests.json`, both `docs/roadmap/index.html` mirrors, `CURRENT_STATE.md` |

Recompute `totalMinimum` as the **sum of `perFileMinimum` from observed counts**, never
by arithmetic against the previous total. The sum equals the total exactly — there is
no slack, so `check-test-results.mjs` fails on an incoherent baseline.

## Rebase discipline

1. **Never `git rebase` these branches — regenerate them.** Serialize so only one
   section-adder is open at a time. When its predecessor merges:
   `git fetch origin main && git checkout -B <branch> origin/main`, then re-apply the
   content. Every conflict would otherwise land in a 1537-character nav line, a 655KB
   single file, or 23 renumber sites.
2. **Treat `sec-num` as generated output.** One idempotent pass walks
   `<section class="sec">` in document order and rewrites every banner to its ordinal,
   leaving `WHAT'S NEW`, `PRACTICE LAB` and `FINAL EXAM` alone. Then assert the
   sequence is `[1..N]` with no gaps and no duplicates. **Nothing in `check-static.mjs`
   validates banner sequencing** — that assertion is the only guard.
3. **Insert nav links by string-anchoring on the preceding `data-id`**, never by line
   number or index.
4. **Namespace every id inside a new `<svg>`** — markers, gradients, and any
   `<path id>` referenced by `<mpath>` — with a per-section suffix. The templates in
   this file carry highly collidable generic ids (`p-top`, `p-mid`, `p-bot`, `m1`–`m4`,
   `arr-apisdk`, `wf-r1`–`wf-r3`). One copy-paste reproduces an id and the build fails.
5. **Land PR 3a before any `LAB` addition.** ✅ done.

## Defect register

19 blocking defects were raised by two independent adversarial critics against the
generated briefs, plus 9 more by bot reviewers on the shipped PRs. Every claim was
re-verified by hand before being written here.

| # | PR | Defect | Disposition |
| --- | --- | --- | --- |
| 1 | 1 | Asserted `QUIZ` has 22 keys "not 36" as a VERIFIED precondition. It has **36** | precondition deleted; that brief's whole trust-me block is void |
| 2 | 1 | Raises `totalMinimum` without updating `docs/roadmap/index.html` | coupled-file rule; **confirmed live** — it failed exactly this way during #28 |
| 3 | 1 | Uses `opts` for Lab choice items; the renderer reads `item.options` | corrected in the brief |
| 4 | 2 | No SVG id-namespacing rule while mandating copied templates full of generic ids | rebase discipline rule 4 |
| 5 | 2, 4 | Both add a Lab challenge id `lab-budget` — ships **green**, breaks at runtime | ruling: PR 2b owns it |
| 6 | 2 | Misses all six pinned `12` assertions | ✅ removed by #29 |
| 7 | 2 | Misses the Lab-count claim sites | derived-counts rule |
| 8 | 2 | Ships a test forbidding `anthropic_cloud` while conceding the value may be correct | **dropped.** `DECISION_LOG` 2026-07-29 rules out "tests that forbid a legitimate value" |
| 9 | 2 | Nests `managedAgents` inside `MODEL_FACTS`, which `modelRows()` iterates by model | sibling registry; #28's schema now defines the shape |
| 10 | 2 | Twelve-beat lesson plus a 23-banner renumber — too large to review | split into 2a and 2b |
| 11 | 3 | Claims `.diagram` / `.anim-x` / `role=img` are 1:1:1 at 24. Measured **24 / 25 / 24** | corrected; guard derives from `.diagram` |
| 12 | 3 | Bundles a test refactor into a content PR | ✅ split out and shipped as #29 |
| 13 | 4 | Misses `p0-responsive-navigation.spec.js:26` (shared helper, ~9 tests) and `:169` | ✅ removed by #29 |
| 14 | 4 | Duplicates PR 2's session-budget teaching | ruling: PR 2b owns it |
| 15 | 1–4 | All four miss the fifth diagram claim at the changelog | **superseded** — see defect 20 |
| 16 | 2, 3 | Both add the same diagram drift guard, each raising `perFileMinimum` to 3 | ruling: PR 3 owns it |
| 17 | 1–4 | Every count delta computed independently against the same baseline | derived-counts rule |
| 18 | all | `og.png`, `CLAUDE.md`, `NOTION_SYNC.md` stale and unowned | PR 6 |
| 19 | 5 | *(audit brief anticipated a lychee network check)* — none was proposed | no action |
| **20** | **plan** | **The plan and both critics treated the dated `#changelog` as a live claim site to bump.** Bumping it falsifies history | **corrected.** Guards strip the block; live diagram claims are 4, not 5 |
| 21 | 5 | The renderer hard-coded `"; Opus 4.8 remains available"` — the exact hand-typed volatile claim the PR removes | ✅ fixed in #28 → `availabilityNote` |
| 22 | 5 | Schema accepted a benchmark with neither `result` nor `resultTemplate` → empty cell | ✅ fixed in #28 (`anyOf`) |
| 23 | 5 | Date check accepted impossible calendar dates (JS normalises `2026-02-31`) | ✅ fixed in #28 (ISO round-trip) |
| 24 | 5 | `literalValue` threw a bare TypeError on an acorn array hole | ✅ fixed in #28 |
| 25 | 5 | `!Number.isNaN` accepts `Infinity` (`1e999`) | ✅ fixed in #28 (`Number.isFinite`) |
| 26 | 5 | Spec derived the referenced-source set from `opus` alone while the checker walks every model | ✅ fixed in #28 |

**Link-liveness checking is not adopted** — see `DECISION_LOG.md` 2026-08-09.

## Per-PR scope

Detailed briefs: [BRIEFS.md](BRIEFS.md). Briefs for shipped PRs are retained as a
record. Briefs for unshipped PRs deliberately carry **no count arithmetic**.

### PR 3 — Workflow orchestration spine *(next)*
One concern: *who holds the plan — Claude turn by turn, or a script?* Deepens
`#workflows` and `#api-sdk` in place; adds no section, forces no renumber. Sources:
`patterns/agents/{basic_workflows, orchestrator_workers, async_multi_agent_orchestration}`,
`claude_agent_sdk/08_Dynamic_workflows`. Adds `WORKFLOW_FACTS` (a sibling registry
conforming to #28's schema), one diagram, the diagram drift guard, Lab challenges.

### PR 2a / 2b — Managed Agents
16 cookbook recipes, all dated 2026-04 → 2026-07 — the most current material in the
repo, and zero coverage on the page. **Highest fact risk in the batch**: every shape
sits behind `managed-agents-2026-04-01`, whose own docs say behaviours may be refined
between releases.

### PR 1 — Evals track
The largest curriculum gap: the page tests the *learner* (36 `QUIZ` keys, a 20-question
`EXAM`) but never teaches evaluating *your own* agent. **Lowest fact risk of the content
PRs — it names no model.**

### PR 4 — Context engineering + spend attribution
One concern: *how many tokens you pay for per turn, and how you prove it.* Roughly
thirty unconfirmed identifiers — ship them with `provenance:'unable-to-verify'`.

### PR 6 — Record reconciliation
Regenerate `og.png` once against the final counts; update `CLAUDE.md`; re-sync Notion;
add merged milestone cards to `docs/roadmap/index.html` (only possible post-merge —
the dashboard spec forbids `.tag.plan`/`.tag.active` and each card needs a real SHA).

One regeneration at the end beats four, which is why this replaced the "PR 0" first
proposed for the Notion resync.

## End state

44 sections · 6 tracks · 27–28 diagrams · 25 Lab challenges · `QUIZ` at 40 keys.
