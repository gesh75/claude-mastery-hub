# Opus 5 Content Inventory — 2026-07-28

This working claim inventory was created before the Opus 5 content update. It records the stale surface found on merged `main` and the action taken in this batch.

| Location | Current claim on baseline | Accuracy | Required action | Primary source |
| --- | --- | --- | --- | --- |
| `README.md` | Current lineup named Opus 4.8 and omitted Opus 5/Mythos 5 | Stale | Replace lineup and add verification date | Models overview |
| `CLAUDE.md` | Opus 4.8 described as the current deep-reasoning/default tier | Stale | Update model table and distinguish Fable/Opus/Mythos | Launch; models overview |
| `index.html` Start Here | Four-model price table used Opus 4.8 and June defaults | Stale, time-sensitive | Render from the fact registry; date product-default wording | Launch; pricing |
| `index.html#models` hierarchy | Opus 4.8 presented as current and, in one card, as Anthropic's most capable model | Incorrect | Teach current five-model hierarchy and scoped superlatives | Models overview |
| `index.html#models` specifications | IDs, pricing, limits, thinking, and cutoffs were duplicated in static markup | Incomplete, time-sensitive | Centralize current facts and verification date | Models overview; pricing |
| `index.html#models` routing | Hard work routed to Opus 4.8 | Stale | Route complex agentic/enterprise work to Opus 5 while retaining Fable tradeoff | Choosing a model |
| `index.html#models` examples | CLI example pinned `claude-opus-4-8` | Stale | Use `claude-opus-5` and keep 4.8 only in migration context | Migration guide |
| `index.html#whats-new` | Covered Fable/Mythos/Sonnet but no Opus 5 | Incomplete | Add Opus 5 positioning, specifications, behavior, migration, availability, and sources | Launch; system card; docs |
| `index.html#whats-new` benchmarks | No Opus 5 benchmark coverage | Incomplete | Add source-labeled, limitation-aware evidence | Anthropic; Cursor; ARC Prize; Zapier |
| `index.html#api-sdk` | Current API table led with Opus 4.8/Sonnet 4.6 | Stale | Update current IDs, limits, pricing, cache minimum, and batch support | Models overview; What's new |
| `index.html#api-sdk` TypeScript example | Example request remained pinned to `claude-sonnet-4-6` | Stale | Pin the current example to `claude-sonnet-5` | Models overview |
| `index.html#api-sdk` thinking guidance | Explained only the earlier thinking controls | Incomplete | Lead with Opus 5/Sonnet 5 adaptive thinking and effort; preserve earlier controls as migration context | What's new; migration guide |
| `index.html#cost` | Model-cost and Fast mode advice centered on Opus 4.8 | Stale | Render current costs; add Opus 5 Fast mode and retain 4.8 only as supported legacy | Pricing; Fast mode |
| `index.html#cheatsheet` Model Picker | Production row still named Sonnet 4.6 and omitted Fable/Mythos | Stale, incomplete | Render all five current models from the maintained fact registry | Models overview; pricing |
| `index.html` quizzes | Model questions offered Opus 4.8 and did not test migration behavior | Stale | Replace options and add Opus 4.8-to-5 migration question without changing count | Migration guide |
| `index.html` final exam | Current lineup omitted Opus 5 | Stale | Refresh options and hierarchy wording without changing 20-question count | Models overview |
| Practice Lab | No model-selection item | Current for this batch | Leave count and validator untouched | Scope constraint |
| Audit documents | Historical findings mention Opus 4.8 baseline | Current historical evidence | Preserve as historical audit records | N/A |

## Baseline counts

- `Opus 4.8`: 30 occurrences across `index.html`, `README.md`, and `CLAUDE.md`
- `Opus 5`: 0 occurrences
- `claude-opus-4-8`: 6 occurrences
- `claude-opus-5`: 0 occurrences

Historical Opus 4.8 references remain valid when explicitly discussing migration, fallback behavior, or comparison baselines.

## Source matrix

All sources were checked on 2026-07-28.

| Source | Used for |
| --- | --- |
| [Introducing Claude Opus 5](https://www.anthropic.com/news/claude-opus-5) | Release date, positioning, product availability, qualitative launch comparisons, Fast mode |
| [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) | Model hierarchy, IDs, pricing, limits, thinking, cutoffs, platform availability |
| [What's new in Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5) | Default thinking, effort ladder, cache minimum, breaking restriction, migration behavior, Fast-mode platform exclusions |
| [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide) | Model-ID change, compatibility review, and the two feature exceptions (Web Fetch, Priority Tier) |
| [API service tiers](https://platform.claude.com/docs/en/api/service-tiers) | Priority Tier supported-model list and the fact that new capacity commitments are no longer sold |
| [Fast mode](https://platform.claude.com/docs/en/build-with-claude/fast-mode) | Supported models, Claude API/Managed Agents scope, cloud exclusions, OTPS-not-TTFT framing, $10/$50 |
| [Fast mode in Claude Code](https://code.claude.com/docs/en/fast-mode) | `/fast`, usage-credits billing on subscription plans, Owner enablement, VS Code exclusion |
| [Message Batches](https://platform.claude.com/docs/en/build-with-claude/batch-processing) | 300k extended output as a Batches-only cap, supported models, beta header, platform exclusions |
| [Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5) | Narration, verbosity, self-verification, delegation, prompt-tuning advice |
| [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | Base, cache, batch, Fast mode, and temporary Sonnet pricing |
| [Release notes](https://platform.claude.com/docs/en/release-notes/overview) | July 24 launch record and API behavior |
| [Claude Opus 5 System Card](https://www.anthropic.com/claude-opus-5-system-card) | Cutoff and evaluation methodology |
| [Frontier-Bench](https://www.frontierbench.ai/announcement) | Benchmark purpose and continuous/versioned methodology |
| [CursorBench 3.2](https://cursor.com/evals) | 70.0% Opus 5 Max, 70.5% Fable 5 Max, cost and variance caveat |
| [ARC Prize verified results](https://arcprize.org/results/anthropic-claude-opus-5) | ARC-AGI-3 High: 30.16% exact verified score, presented as 30.2% in the page's rounded headline; short-window caveat |
| [Zapier AutomationBench](https://zapier.com/benchmarks) | Current 26.2% Max result, held-out scoring, variance, and benchmark limitations |

## Follow-up verification pass — 2026-07-28

A second review checked two proposed additions and one benchmark figure against primary sources.

| Claim under review | Verdict | Primary source |
| --- | --- | --- |
| The API Web Fetch tool is not available on Opus 5 | **Confirmed.** Migration guide: "web fetch is not available on Claude Opus 5". Web Search is a distinct tool and is unaffected. | Migration guide |
| Priority Tier does not support Opus 5 | **Confirmed, with scope.** Service tiers: "Priority Tier is supported on all available Claude models except Claude Mythos 5, Claude Mythos Preview, Claude Opus 5, and Claude Sonnet 5." The same page states new capacity commitments are no longer sold, so this affects only organizations with an existing commitment. | API service tiers; migration guide |
| Fast mode is Claude API only | **Confirmed, and refined.** Fast mode docs scope it to the Claude API *including Managed Agents*, and the Claude Code doc adds subscription access billed through usage credits with Team/Enterprise Owner enablement. It is excluded on Amazon Bedrock, Google Cloud, Microsoft Foundry, and Claude Platform on AWS. | Fast mode; Fast mode in Claude Code |
| "2.5×" is a speed guarantee | **Rejected.** Fast mode docs: "Speed benefits are focused on output tokens per second (OTPS), not time to first token (TTFT)." Wording now states throughput and explicitly denies a latency SLA. | Fast mode |
| Fast-mode exclusions limit Opus 5 availability | **Rejected.** Opus 5 itself remains available on the Claude API, Amazon Bedrock, Google Cloud, and Microsoft Foundry. The lesson and the cost section now say so explicitly. | What's new in Claude Opus 5; release notes |
| ARC-AGI-3 score presentation | **Both figures are valid; the page publishes each.** ARC Prize reports an exact verified ARC-AGI-3 score of **30.16%** for Opus 5 High, presented as **30.2%** in the page's rounded headline. The content now shows both and labels which is which. See the revision note below. | ARC Prize verified results |
| 300k output applies to Opus 5 generally | **Corrected.** Extended output "is available on the Message Batches API only, not the synchronous Messages API." The synchronous Opus 5 cap remains 128k. | Message Batches; models overview |

Owner-reported benchmark figures were re-checked against the owners' own pages on 2026-07-28: CursorBench 3.2 (Opus 5 Max 70.0% at $8.23/task; Fable 5 Max 70.5% at $17.32/task; "small differences in scores may not be statistically meaningful"), Zapier AutomationBench (26.2%, held-out private set, "run-to-run variance is typically within 1%"), ARC-AGI-3 (**30.16% exact verified, 30.2% rounded headline**, High effort only due to the short testing window). Frontier-Bench publishes **no** Opus 5 score, so that row remains labeled Anthropic-reported.

### Revision note — ARC-AGI-3 figure

An earlier pass in this batch replaced 30.16% with 30.2% and recorded that the exact figure "could not be reproduced from the primary source." **That conclusion was wrong and has been withdrawn.** The first check read only the ARC Prize page's rounded introductory headline and never reached the verified-score table further down the page. A follow-up check of the same URL confirmed the table entry `High | 30.16%` alongside the headline sentence "Claude Opus 5 (High) is the highest-performing model on ARC-AGI-3, scoring 30.2%".

Both numbers are legitimate representations of one evaluation, so the guide now presents them together and labels which is exact and which is rounded. The exact value is the numeric field in `BENCHMARK_EVIDENCE.arcAgi.exactScore`; `roundedScore` carries 30.2 for display.

The regression test that forbade the string `30.16%` anywhere in the benchmark section was the mechanism that locked the error in place. It has been replaced with assertions on the *relationship* between the two values, plus a static check of this document that allows the withdrawn claim to be quoted as history but fails if it is ever asserted again.

The superlative "the highest result ARC Prize reported" remains out of the guide. ARC Prize does make a scoped claim on this page, but a leaderboard-position statement goes stale faster than a score does, and this batch's benchmark policy avoids ranking claims.

This entry is kept rather than quietly rewritten, because the failure mode — trusting a page's summary over the page's own detail table — is the reusable lesson.

## Known follow-up

`MODEL_FACTS.availability`, `positioning`, `sources`, `featureExceptions`, `fastMode`, `MODEL_SOURCES`, `MODEL_FACTS_VERIFIED_AT`, and `BENCHMARK_EVIDENCE` are maintained as the declared fact registry but are not yet consumed by a renderer — only `modelRows()` reads the registry today. Tests therefore assert the learner-visible HTML as well as the registry, so the two cannot drift silently. Wiring the remaining fields into rendering is a separate change.

## Deliberately excluded benchmark facts

- Exact Frontier-Bench score: the lesson keeps Anthropic's qualitative launch comparison because a directly comparable benchmark-owner score was not independently verified.
- OSWorld 2.0, GDPval-AA v2, Humanity's Last Exam, DeepSearchQA, and scientific-evaluation chart values: excluded because the exact launch values and materially comparable tool, effort, and budget settings were not independently verified from a current benchmark-owner result page.
- Composite rankings or “wins” counts: excluded because they collapse unlike harnesses and settings into a misleading universal leaderboard.

## Visual verification

- [390 px current-model hierarchy](screenshots/opus-5-models-mobile-390.jpg)
- [1440 px Opus 5 guide and benchmark evidence](screenshots/opus-5-guide-desktop-1440.jpg)

Both viewports retained document-level containment (`scrollWidth === clientWidth`) during the verification run. Wide tables remain locally scrollable.
