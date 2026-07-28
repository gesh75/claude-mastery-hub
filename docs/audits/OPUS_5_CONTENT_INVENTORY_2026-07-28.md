# Opus 5 Content Inventory — 2026-07-28

Working claim inventory created before the Opus 5 content update. It records the stale surface found on merged `main` and the action taken in this batch.

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
| [What's new in Claude Opus 5](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5) | Default thinking, effort ladder, cache minimum, breaking restriction, migration behavior |
| [Migration guide](https://platform.claude.com/docs/en/about-claude/models/migration-guide) | Model-ID change and compatibility review |
| [Prompting Claude Opus 5](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5) | Narration, verbosity, self-verification, delegation, prompt-tuning advice |
| [Pricing](https://platform.claude.com/docs/en/about-claude/pricing) | Base, cache, batch, Fast mode, and temporary Sonnet pricing |
| [Release notes](https://platform.claude.com/docs/en/release-notes/overview) | July 24 launch record and API behavior |
| [Claude Opus 5 System Card](https://www.anthropic.com/claude-opus-5-system-card) | Cutoff and evaluation methodology |
| [Frontier-Bench](https://www.frontierbench.ai/announcement) | Benchmark purpose and continuous/versioned methodology |
| [CursorBench 3.2](https://cursor.com/evals) | 70.0% Opus 5 Max, 70.5% Fable 5 Max, cost and variance caveat |
| [ARC Prize verified results](https://arcprize.org/results/anthropic-claude-opus-5) | 30.16% ARC-AGI-3 High and short-window caveat |
| [Zapier AutomationBench](https://zapier.com/benchmarks) | Current 26.2% Max result, held-out scoring, variance, and benchmark limitations |

## Deliberately excluded benchmark facts

- Exact Frontier-Bench score: the lesson keeps Anthropic's qualitative launch comparison because a directly comparable benchmark-owner score was not independently verified.
- OSWorld 2.0, GDPval-AA v2, Humanity's Last Exam, DeepSearchQA, and scientific-evaluation chart values: excluded because the exact launch values and materially comparable tool, effort, and budget settings were not independently verified from a current benchmark-owner result page.
- Composite rankings or “wins” counts: excluded because they collapse unlike harnesses and settings into a misleading universal leaderboard.

## Visual verification

- [390 px current-model hierarchy](screenshots/opus-5-models-mobile-390.jpg)
- [1440 px Opus 5 guide and benchmark evidence](screenshots/opus-5-guide-desktop-1440.jpg)

Both viewports retained document-level containment (`scrollWidth === clientWidth`) during the verification run. Wide tables remain locally scrollable.
