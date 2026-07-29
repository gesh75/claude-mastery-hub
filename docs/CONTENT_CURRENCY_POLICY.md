# Content Currency Policy

This policy governs volatile claims in Claude Mastery Hub: model names and IDs, pricing, token limits, cutoffs, availability, product defaults, migration behavior, and benchmark results.

## Content owner

The repository maintainer owns the model-facts registry and approves currency updates. Section authors remain responsible for the accuracy of the surrounding educational guidance.

## Single source of truth

Volatile model specifications live in `MODEL_FACTS`, source metadata in `MODEL_SOURCES`, and the review date in `MODEL_FACTS_VERIFIED_AT` inside `index.html`.

Update the registry before changing rendered tables or related prose. The application must remain offline-capable: never fetch vendor documentation or benchmark leaderboards at runtime.

## Primary sources

Use sources in this order:

1. Anthropic model launch announcement, model overview, pricing, migration, prompting, release notes, and system card.
2. Original benchmark-owner methodology and result pages.
3. A named partner's own evaluation page for partner-reported results.

Do not use search snippets, social posts, AI summaries, or third-party recap articles as the authority for a claim when a primary source exists.

Every pricing, availability, cutoff, product-default, and benchmark claim must include or inherit an exact verification date. Distinguish:

- Anthropic-reported or Anthropic-run
- External benchmark-owner verified
- Partner-reported internal evaluation
- Unable to verify

Do not infer exact values from chart pixels. If the source provides only a qualitative comparison, preserve that wording.

## Pricing claims

Pricing must state the billing unit, distinguish temporary from standard rates, and carry an exact verification date.

## Benchmark claims

Benchmark evidence must preserve the evaluator, harness or effort conditions, comparison baseline, and important limitations.

## Verification cadence

- Review model IDs, pricing, token limits, and availability every two weeks.
- Run a full curriculum currency audit quarterly.
- Recheck temporary pricing before its published transition date.
- Treat claims older than 30 days as review-due when they use “current,” “latest,” “default,” “best,” “strongest,” or similar time-sensitive language.

## Release-triggered review

Start an immediate release-triggered review when Anthropic:

- launches, retires, deprecates, or renames a model;
- changes pricing, context, output, cache, thinking, or effort behavior;
- changes plan or platform availability;
- revises a benchmark result or methodology;
- updates a migration guide or system card.

Search the entire repository, including lessons, diagrams, examples, quizzes, the final exam, Practice Lab, README, project metadata, and source links.

## Required checks

Before merging a currency update:

1. Update `MODEL_FACTS_VERIFIED_AT` and every affected `MODEL_SOURCES` entry.
2. Record the repository claim inventory and source matrix.
3. Run `npx playwright test tests/e2e/content-currency.spec.js`.
4. Run the complete Playwright suite and dependency/security checks.
5. Confirm no runtime request is made to an external documentation source.
6. Manually inspect desktop and mobile layouts for tables, code blocks, links, and assessment content.

Benchmark sections must say what the evaluation measures, who ran or reported it, the relevant comparison, and at least one limitation. They must also remind readers that benchmark leadership does not establish superiority for every workload.
