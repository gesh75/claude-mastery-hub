# PR briefs

Execution briefs for the programme in [COOKBOOK_TRACKS.md](COOKBOOK_TRACKS.md).
Measured facts: [VERIFIED_BASELINE.md](VERIFIED_BASELINE.md).

Each brief is written for a fresh agent with no prior context. Read
`docs/CURRENT_STATE.md` first and update it last, per working-agreement rule 1.

**PR 5 and PR 3a have shipped** ([#28](https://github.com/gesh75/claude-mastery-hub/pull/28),
[#29](https://github.com/gesh75/claude-mastery-hub/pull/29)); their briefs are retained
as a record, annotated with what actually happened. Briefs for the unshipped PRs
deliberately carry **no count arithmetic** — their numbers depend on what merged
before them, so writing them now would be knowingly writing wrong numbers. Derive at
branch time.

Every brief obeys these, without restating them:

- Branch off fresh main: `git fetch origin main && git checkout -B <branch> origin/main`.
  `main` is protected with `enforce_admins: true`.
- `npm ci && npx playwright install --with-deps chromium`. Single `chromium` project.
- **Write the failing test first**, run it, and paste the failure into the PR body. A
  test that passes on today's `main` is not a regression test and is a defect in the PR.
- A new spec file is **rejected by CI** until it appears in
  `scripts/expected-tests.json` → `perFileMinimum`.
- Raising `totalMinimum` obligates both `docs/roadmap/index.html` mirrors and the
  `CURRENT_STATE.md` Tests row.
- Every live-count guard **excludes** the dated `#changelog` block.
- Verify with `npm run verify` (`check:static` → `check:citations` → playwright → `check:results`).

### Merging is not automatic

Branch protection sets `required_conversation_resolution: true`, and two bots
(Sourcery, Codex) review every PR. `gh pr merge` fails with *"base branch policy
prohibits the merge"* and `mergeStateStatus: BLOCKED` even when all checks pass and
zero reviews are required — the cause is **unresolved bot review threads**. Read them
(6 of 8 were real defects across #28/#29), fix what is right, then resolve each via
GraphQL `resolveReviewThread`. A branch opened before another merges also needs
`gh pr update-branch`, because protection is `strict`.

---

## PR 5 — Model-registry rendering + citation checks

> **SHIPPED** as [#28](https://github.com/gesh75/claude-mastery-hub/pull/28). Spec failed 10/10 first; tests 86 → 96.
> Six bot-review defects were fixed before merge — most importantly a hard-coded
> `"; Opus 4.8 remains available"` in the renderer, now `MODEL_FACTS.opus.availabilityNote`.
> Predicted defect 2 came true: the `docs/roadmap/index.html` mirrors failed the gate.

**Branch:** `feat/model-registry-rendering`
**One concern:** the registry becomes the *rendered* and *mechanically validated* single
source of truth for the Opus 5 launch block. Every edit either makes a registry field
drive the DOM, or makes a registry defect fail the build.
**Closes:** the last item in `PROJECT_ROADMAP.md` § Deferred.

### Why this is first
It adds no section, touches no `sec-num`, no nav line, no `.master-cb`, no `LAB`, no
`QUIZ`, no advertised count. Its edits live in `#whats-new` (`index.html:1849-1920`),
which sits between sections and carries no section number. It changes zero fact
**values** — only how facts reach the DOM. And its schema defines the registry shape that
PRs 2b, 3 and 4 must conform to.

### Tests first — `tests/e2e/model-registry-rendering.spec.js` (10)
1. the glance-table availability cell renders from `MODEL_FACTS`, not hand-typed
2. feature exceptions render from `MODEL_FACTS.opus.featureExceptions`
3. the fast-mode row renders prices and platform exclusions from `MODEL_FACTS.opus.fastMode`
4. the verification date renders from `MODEL_FACTS_VERIFIED_AT` without locale-dependent formatting
5. the benchmark table body renders from `BENCHMARK_EVIDENCE`
6. the ARC-AGI-3 row derives **both** representations from the registry's numeric fields
7. the Primary-sources list renders from `MODEL_SOURCES` and covers every referenced key
8. `scripts/check-citations.mjs` enforces schema conformance and two-way referential integrity
9. `registry-schema.json` closes the object shape and the provenance enum
10. every `MODEL_SOURCES` url is `https`, credential-free, and on the primary-source allowlist

### Steps
1. Write the spec. Run it. Expect **10 failures**; paste the summary into the PR body.
2. Extend `MODEL_FACTS.opus` (declared `:5947`) with the two fields the current prose
   needs and the registry lacks.
3. Add render scaffolding immediately **before** `function modelRows(kind){` at `:6010`:
   an `escHtml` helper, a fact-reader, and a sources-renderer.
4. Replace the bare binder at `:6022-6024` with one named, re-invocable entrypoint.
5. Add `'prompting'` and `'releaseNotes'` to `MODEL_FACTS.opus.sources` (→ 12 keys).
   Both are referenced by prose today but missing from the source list — a gap this PR uncovered.
6. Wire the glance table `:1849-1857` — replace only the volatile cell contents, leaving
   the `<tr><td>Label</td>` first cells untouched.
7. Wire the benchmark table `:1897-1904` — give `<tbody>` a `data-bench-rows` attribute
   and empty it; the renderer emits one `<tr>` per entry.
8. Wire the Primary-sources list `:1910-1920` — replace the 9 `<li>` children with
   `<ul class="cites" data-model-sources="opus"></ul>`. Rendered output is 16 anchors.
9. Add `scripts/registry-schema.json` (draft-07), shape lifted from the cookbook's
   `.github/registry_schema.json`. **`"additionalProperties": false` on every object node** —
   that is the whole point; it is what will reject a malformed sibling registry later.
10. Add `scripts/check-citations.mjs`. **Zero network calls** — a pure function of the
    checked-out tree.
11. Staleness is **surfaced, never failed**: assert `MODEL_FACTS_VERIFIED_AT` is a valid
    ISO date not in the future. Do **not** fail when it is old — that would make an
    unrelated PR red for a content-owner problem.
12. `package.json`: add `"check:citations": "node scripts/check-citations.mjs"` and append
    `&& npm run check:citations` to `verify`. Do not touch the workflow file.
13. `scripts/expected-tests.json`: add `"tests/e2e/model-registry-rendering.spec.js": 10`,
    `totalMinimum` **86 → 96**. Then `docs/roadmap/index.html:91` and `:189`.
14. `PROJECT_ROADMAP.md`: move "Model registry rendering" out of § Deferred.
    `DECISION_LOG.md`: new dated entry. `CURRENT_STATE.md` **last**.

### Risks
- **Two deliberate visible-text changes** a reviewer will notice: the Primary-sources
  list goes from 9 hand-written `<li>` to 16 rendered anchors, and the benchmark tbody
  becomes generated. Pre-justify both in the PR body.
- **The provenance enum is the hardest call.** `BENCHMARK_EVIDENCE` holds four free-text
  display strings today; collapsing them into an enum can silently change meaning. Map
  each explicitly.
- `content-currency.spec.js`'s 13 assertions are the real acceptance criteria and several
  are exact-string matches **inside the cells being rewritten**.
- `check-static.mjs:304-334` fails the build if the sources renderer assigns
  `a.href = MODEL_SOURCES[k].url` — the AST rule flags assignment to `href`. Build the
  anchor differently.
- `check-citations.mjs` extracts via acorn and is coupled to the registries being
  top-level `var` declarations initialised with pure literals. Document that contract in
  the file header.

**Rollback:** revert the merge commit. No content value changed, so nothing downstream depends on it.

---

## PR 3a — Unpin the six hardcoded Lab counts

> **SHIPPED** as [#29](https://github.com/gesh75/claude-mastery-hub/pull/29). 86 → 86; `expected-tests.json` untouched.
> Five sites were readiness gates and are derived via `tests/helpers/lab.js`. The sixth
> (`content-currency`) was a *content claim* — deriving it would have been vacuous, so it
> became a claim-vs-actual drift guard instead.
> Review then caught that the guard bound the **dated changelog** to the live count; it now
> strips that block. See defect 20 in COOKBOOK_TRACKS.md.

**Branch:** `refactor/derive-lab-count`
**One concern:** the specs derive the Lab total from the DOM instead of pinning a literal.
**Adds no tests. Changes no counts. Does not touch `index.html`.**

### Why this exists as its own PR
Bundling it into a content PR is the error working-agreement rule 2 forbids. And it is
the highest-leverage change in the programme: the pinned `12`s were missed entirely by
PR 2 and partially by PR 4, and the failure surfaces as
`Expected string: "12" / Received string: "15"` in a spec file the offending PR never
touched — which reads like a content bug and misdirects debugging.

### Steps
Replace the literal in all six sites (see [VERIFIED_BASELINE.md](VERIFIED_BASELINE.md)
for the full table and blast radius) with a value read from `window.LAB.length`:

| File | Lines |
| --- | --- |
| `tests/e2e/p0-responsive-navigation.spec.js` | 26 (inside `loadApplication`), 169 |
| `tests/e2e/practice-lab-validation.spec.js` | 98 (inside `beforeEach`), 152, 179 |
| `tests/e2e/content-currency.spec.js` | 275 |

**Do not touch `tests/e2e/persisted-state.spec.js:212`** — that `toBe(12)` is
`s.exam.best`, unrelated.

### Verification
- `grep -rn "toHaveText('12')\|toBe(12)" tests/e2e/` returns only the exam site.
- `npm run verify` — **86 tests, unchanged**. The count must not move; if it does, the
  refactor added or removed a test and the PR is wrong.
- `expected-tests.json` is **not** edited.

**Rollback:** revert. Trivially safe.

---

## PR 3 — Workflow orchestration spine

> **NEXT.** Now also owns the changelog exclusion in its diagram drift guard: the live
> diagram claims are **four** (`index.html:7`, `:11`, `:19`, `README.md:9`), not five —
> the `24 diagrams` inside `#changelog` is a Jun 2026 history entry and must be excluded,
> not bumped.

**Branch:** `feat/workflow-orchestration-spine`
**Depends on:** PR 5 (registry shape), PR 3a (Lab count).
**One concern:** *who holds the plan — Claude turn by turn, or a script?* Every edit
answers that one question and its consequences: where intermediate results live, what is
repeatable, what is enforced vs merely instructed, what the runtime limits are.
**Adds no section, forces no renumber.**

### Sources
`patterns/agents/basic_workflows.ipynb`, `orchestrator_workers.ipynb`,
`async_multi_agent_orchestration.ipynb`, `claude_agent_sdk/08_Dynamic_workflows.ipynb`.
The first three are dated 2024-12-19 and carry stale model ids in their shared preamble —
take the pattern vocabulary, discard the ids.
`evaluator_optimizer.ipynb` belongs to **PR 1**; cite it here by name only.

### Tests first — `tests/e2e/workflow-orchestration.spec.js` (6)
1. the section teaches the canonical agent-pattern vocabulary
2. the canonical primary sources are cited and volatile limits carry an inline anchor
3. the who-holds-the-plan axis distinguishes all three orchestration modes
4. the workflow-script primitives are named with their barrier-vs-streaming semantics
5. workflow runtime limits come from a dated registry, not from prose
6. `#api-sdk` names the Workflow-tool trigger and links back

Plus two generated tests in `practice-lab-validation.spec.js` (extend `MATRIX`) and
**one new test in `content-counts.spec.js`** — the diagram drift guard, which this PR
owns exclusively.

### The drift guard — get the regex right
It must derive from `document.querySelectorAll('.diagram').length`, **never `.anim-x`**
(which is 25, because `index.html:412` is the changelog). And the claim regex must be
`/(\d+)\s+(?:animated[^.]{0,40}?)?diagrams?\b/gi` — requiring the literal word
`animated` misses `index.html:412`, which reads `24 diagrams`.

**Honest status:** this guard passes on today's `main` (24 rendered, 24 claimed). It is
not a regression test for a current defect — it is a guard that must exist before PRs
2a/1/4 each add a diagram. State that plainly in the PR body rather than dressing it up.

### Steps
1. **Primary-source verification pass, before writing any number.** Fetch
   `https://code.claude.com/docs/en/workflows` and confirm or discard: the maximum
   concurrent agents, the per-run agent cap, and the availability claim. The concurrent
   limit and per-run cap currently trace to a **single 17-day-old cookbook notebook** —
   if the docs do not confirm them, they do not ship as facts.
2. Tests first (RED).
3. Add `WORKFLOW_FACTS` as a **sibling** registry after the `MODEL_SOURCES` / `MODEL_FACTS`
   block (`:5927-5928`), conforming to PR 5's schema.
4. `#workflows` content (`:2107-2253`) — the who-holds-the-plan ladder, the mechanism
   under the existing `<h3>Dynamic workflows</h3>` at `:2210` (keep the two-ways-to-trigger
   framing), and adversarial verification as a four-step recipe.
5. One new diagram. **Namespace every internal id** — `arr-wfverify`, `wf-max-concurrent`,
   `wf-max-run`, etc.
6. `#api-sdk` (`:2254-2506`) — exactly one `<h4>` at the end of the Agent SDK layer.
   Minimal by design.
7. `QUIZ.workflows` (`:6470`) — append 5 questions in the existing `{q,o,c,e}` shape.
8. `LAB` (`:6767`) — append three entries. **`type:"cmd"` entries need a `LAB_VALIDATORS`
   entry**, because `window.__labValidate` at `:6918` hardcodes `accept:null`.
9. Reconcile counts per the derived-counts rule.
10. `expected-tests.json`, then the two roadmap mirrors, then `CURRENT_STATE.md` last.

### Risks
- **The volatile numbers have exactly one source.** If step 1 does not confirm them
  against `code.claude.com`, drop them or mark `provenance:'unable-to-verify'`.
- **An availability conflict must be resolved, not averaged.** `index.html:~2228` already
  makes an availability claim about dynamic workflows. If the docs disagree, one of them
  is wrong — decide which, and record it in `DECISION_LOG.md`.
- PR size: seven places in `index.html` plus spec files plus docs. Defensible only
  because every edit answers the same question. If it grows past that, split it.

---

## PR 2a — Managed Agents, core

**Branch:** `feat/managed-agents-core`
**New section** at 17, closing the Power Features track. Forces a renumber of everything
after it.

**Scope:** the four resources, both beta headers, the wire protocol, the
`end_turn`-vs-idle event loop, environment config, one ~20-line example, the compliance
stop-sign, a diagram, a quiz. **No Lab challenges** (they belong to 2b).

**Sources:** `CMA_iterate_fix_failing_tests.ipynb` (entry-point tutorial),
`CMA_operate_in_production.ipynb`. All dated 2026-04 → 2026-07 — the most current
material in the cookbook.

### This is the highest fact risk in the batch
Every shape sits behind `anthropic-beta: managed-agents-2026-04-01`, and Anthropic states
behaviours may be refined between releases. Consequences for the brief:

- **Do not ship a test that forbids a value.** The `cloud` vs `anthropic_cloud`
  discrepancy is unresolved upstream: the primary docs say `cloud`; three July-2026
  cookbooks say `anthropic_cloud`. `DECISION_LOG.md` 2026-07-29 records this exact
  failure mode ("a test was added forbidding `30.16%`, which locked the error in") and
  its Rules-out clause reads *"tests that forbid a legitimate value."* Assert the
  positive only — that the section names a config type, and that it matches the registry
  value. Record the discrepancy in `DECISION_LOG.md` as an **open question with its
  verification date**, so a later correction is a one-line registry edit rather than a
  test deletion.
- The registry is a **sibling** (`MANAGED_AGENT_FACTS` / `_SOURCES` / `_VERIFIED_AT`),
  never a key inside `MODEL_FACTS` — `modelRows()` iterates that object by model and a
  product-surface key would land as dead data of a foreign shape. PR 5's schema puts
  `additionalProperties:false` on `MODEL_FACTS` and would reject it anyway.
- The compliance claim ("not currently eligible for Zero Data Retention or a HIPAA BAA")
  has **asymmetric consequences** — a reader may act on it. Date it, hedge it exactly the
  way Anthropic hedges it, and cite the primary page.

### Mechanical obligations
Renumber via the idempotent generated-output pass (rebase discipline rule 2), then assert
`[1..N]` with no gaps or duplicates — **nothing in `check-static.mjs` validates banner
sequencing**. Namespace every SVG id with a `-managedagents` suffix. Derive all counts.
**Do not add a diagram drift guard** — PR 3 owns it.

---

## PR 2b — Managed Agents, advanced

**Branch:** `feat/managed-agents-advanced`
**Depends on:** PR 2a (the section must exist), PR 3a (Lab count).
**Lands on an existing section — no renumber.**

**Scope:** coordinator (multiagent config, per-role tool scoping, `thread_*` events),
advisor entry, repository skills (`.claude/skills` auto-discovery — cross-link `#skills`),
session budgets, the production surface. Three Lab challenges.

**Owns `CMA_cap_session_spend.ipynb` and the Lab id `lab-budget`** by the ruling in
[COOKBOOK_TRACKS.md](COOKBOOK_TRACKS.md). Teach budgets as: enforced, **pausing rather
than failing**, create-only attachment, one-way removal, overshooting by at most one
request.

Same beta-surface discipline as 2a: positive assertions only, sibling registry, dated
provenance.

---

## PR 1 — Evals track

**Branch:** `feat/evals-track`
**Depends on:** PR 3a (Lab count).
**New section.** Forces a renumber of everything after its insertion point.

**The largest curriculum gap.** The page tests the *learner* — 36 `QUIZ` keys and a
20-question `EXAM` — but has no section teaching how to evaluate an agent or prompt *you*
built.

**Sources:** `misc/building_evals`, `misc/generate_test_cases`, `tool_evaluation/`,
`patterns/agents/evaluator_optimizer` (**owned by this PR**), `evals/agentic_search/`,
`CMA_verify_with_outcome_grader`. Several are 2024-vintage: take the durable methodology
— graders, rubrics, test-set construction, LLM-as-judge failure modes, code-based grading
as the preferred method where it applies, eval-driven development — and **reject the
model-specific surface**.

**Lowest fact risk of the four content PRs: it names no model and teaches methodology.**

### Its predecessor brief's preconditions are void — re-derive from scratch
The generated brief asserted, as a VERIFIED correction, that `QUIZ` has 22 keys "not 36"
and instructed the implementer never to write 36. **It has 36.** The extractor dropped all
14 double-quoted hyphenated keys; 22 + 14 = 36, so the error was systematic, not a typo.
One demonstrably false item in a twelve-item trust-me block makes the whole block
unusable. Re-verify every precondition by the stated method before relying on it —
at minimum the four dangling cross-reference line numbers and the `.master-cb` figure.

### Two mechanical traps
- Lab **choice** items use `options` and `correct`, **not `opts`**
  (`index.html:6980` — `item.options.forEach`). Shipping `opts` renders no options and
  breaks the challenge **silently**; nothing asserts the field name. Add an assertion
  that every new choice item has an `options` array of length ≥ 3 and an in-range
  integer `correct`.
- Lab **cmd** items need a `LAB_VALIDATORS` entry — `window.__labValidate` hardcodes
  `accept:null`, and `accept` matching is case-**insensitive**.

---

## PR 4 — Context engineering + spend attribution

**Branch:** `feat/context-engineering`
**Depends on:** PR 3a, and on PR 2b having landed the session-budget teaching.
**New section** plus an Admin-API subsection inside `#cost` and a ~120-word bridge at the
end of `#memory`.

**One concern:** *how many tokens you pay for per turn, and how you prove it.*

**Sources:** `tool_use/context_engineering/context_engineering_tools`,
`automatic-context-compaction`, `memory_cookbook`, `misc/session_memory_compaction`,
`observability/usage_cost_api`, `CMA_plan_big_execute_small` (**owned by this PR** — its
subject is delegation economics, not the Managed Agents API).

### Scope reductions from the original brief
- **Delete the session-budget beat and the `sessionBudget` registry key.** PR 2b owns
  them. This also removes PR 4's only dependency on the unverifiable
  `managed-agents-2026-04-01` header.
- **Replace `lab-budget`** with an Admin-API attribution challenge. Two PRs proposing the
  same Lab id would ship green and break at runtime.

### Fact discipline
Roughly thirty unconfirmed identifiers (`compact_20260112`, `clear_tool_uses_20250919`,
the 50K-min / 150K-default triggers, and the rest). Ship them in the registry with
`provenance:'unable-to-verify'` rather than asserting them — that mitigation is the right
design and should be kept.

Three specific hazards:
- **A stale number must not override a fresher one.** The prompt-caching cookbook
  contradicts `index.html:2388` on minimum cacheable length and predates Opus 5. The
  page wins unless a primary source says otherwise.
- **Benchmark-class ratios are not facts.** `~2.5× cheaper / ~3× faster / 84–98% of input
  tokens at worker rate` are single-run samples. Under the currency policy they ship with
  the evaluator, the harness conditions, the baseline, and the limitations — or they do
  not ship. Teach the rigor-matched-control methodology as the precondition for any cost
  comparison, and never ship a bare speed-up ratio.
- Frame spend attribution as **historical analysis, not a live meter.**

---

## PR 6 — Record reconciliation

**Branch:** `chore/reconcile-records`
**Last.** Nothing else depends on it; it depends on everything.

| Artefact | Action |
| --- | --- |
| `og.png` | regenerate **once** against the final derived counts. It is mtime 2026-07-12 and already lies — `docs/audits/SOL_INDEPENDENT_REVIEW_2026-07-28.md` records "Card says 39 sections while metadata says 40". Referenced from `index.html:13` and `:20` |
| `CLAUDE.md` | ring figure and Lab count. **This is the file every new session reads first** — stale project memory seeds the next session's wrong assumptions, which makes it the highest-leverage documentation defect here |
| `docs/NOTION_SYNC.md` | re-sync Notion and the mirror. Currently records "78 tests, `main` `dc206273`" against a real 86 / `a44b472`, with PRs #20–#23 unrecorded — while the file itself asserts it must agree with `CURRENT_STATE.md` |
| `docs/roadmap/index.html` | add the merged milestone cards. **Only possible post-merge** — `roadmap-dashboard.spec.js:103-104` forbids `.tag.plan` / `.tag.active`, and each card needs a real merge SHA |
| `docs/PROJECT_ROADMAP.md` | move the completed milestones into § Complete |

None of these is test-guarded today: `content-counts.spec.js` does not read binaries,
`roadmap-dashboard.spec.js`'s `CLAUDE.md` test asserts only two protocol strings, and
nothing reads `NOTION_SYNC.md`. That is why they need an owner rather than a convention.
