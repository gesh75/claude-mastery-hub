# CLAUDE.md — Project memory for Claude Mastery Hub

> **Checkpoint: OMEGA** · last updated 2026-07-12
> Read this first. It's the durable brief so any new session starts grounded.

## Session protocol (read this first)

**Every coding session must read `docs/CURRENT_STATE.md` first and update it last.**
It is the single source of truth for branch, HEAD, active PR, CI run, test count,
branch protection, and the one current next action. If it disagrees with memory or
an older document, it wins. Supporting documents:
`docs/PROJECT_ROADMAP.md` (plan and invariants) ·
`docs/DECISION_LOG.md` (why, and what it rules out) ·
`docs/CHANGELOG_EXECUTION.md` (what shipped, with evidence) ·
`docs/roadmap/index.html` (offline visual dashboard).

**`main` is protected** (`enforce_admins: true`). Every change — including a
one-line documentation fix — goes through a PR with a green `Quality gate`.
Direct pushes are rejected server-side.

## What this is
An interactive, **single-file** educational guide to mastering Claude (the app,
Claude Code, the API & Agent SDK, MCP, skills, subagents, hooks, plugins,
multi-agent workflows) plus an "AI Foundations 101" track.

- **Live page:** https://gesh75.github.io/claude-mastery-hub/ (GitHub Pages)
- **Repo:** `gesh75/claude-mastery-hub` (owner: `@gesh75`)
- **Everything ships in `index.html`** — inline CSS + JS, **zero dependencies,
  fully offline**. No build step. `open index.html` just works.
- Other tracked files: `README.md`, `og.png` (1200×630 @2× social card), this file.

## Architecture (all inside `index.html`)
- **Layout:** CSS grid `.layout{grid-template-columns:288px 1fr}`; collapsible
  sidebar via `html.nav-hidden`; mobile breakpoint `@media(max-width:920px)`.
- **Sections:** `<section class="sec" id="..." data-id="...">`. Six nav tracks:
  Foundations · Claude Code Core · Power Features · Mastery · **Practice** ·
  AI Foundations. Reveal-on-scroll via IntersectionObserver (`.sec`→`.sec.in`).
- **Data-driven learning engines** (near end of file):
  - `QUIZ` — per-section quizzes keyed by section id.
  - `EXAM` — the 20-question final exam (`#exam`), ranked tiers.
  - `LAB` — the **Practice Lab** (`#lab`): 25 hands-on scenario challenges,
    two types (`type:"cmd"` typed answer with `accept`/`startsWith` matching,
    or `type:"choice"`); each has `hint`, `sol`/`solText`, and a `why` note.
    "Show solution" unlocks only after an attempt.
- **localStorage keys:** `claude_hub_quiz_v1`, `claude_hub_exam_v1`,
  `claude_hub_mastery_v1`, `claude_hub_nav_v1`, `claude_hub_lab_v1`.
  Spaced-repetition intervals: `[1,3,7,21,45]` days.
- **Mastery ring** counts `.master-cb` checkboxes (currently **43**); adding a
  section with a `master-cb` auto-increments the `/N` total — update the
  hardcoded `ringmeta` fallback text to match.

## Conventions & hard-won gotchas
- **NEVER name a JS variable `top`.** It collides with the read-only
  `window.top` global; the assignment silently no-ops and `top.onclick=...`
  installs a window-wide handler (this caused the "every click jumps to the
  top" bug, fixed in #6). Use `topBtn`, etc.
- **Building JS via a Python script? Don't put emoji in a Python *raw* string.**
  `\U0001f4a1` passes through literally and JS mis-parses `\U`. Use literal
  emoji characters, or `💡` surrogate pairs. (Bit us in #7.)
- **Prefer atomic Python edit-scripts** that read the file fresh and
  `assert s.count(old)==1` before replacing — the Edit tool intermittently
  trips on "file modified since read" from an external toucher.
- **Verify every change in headless Chromium** before shipping:
  `executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`,
  `playwright-core` lives in the scratchpad. Check: renders, no console errors,
  no leaked `U0001…` escape artifacts, scroll preserved on plain clicks.
- **Facts must be verified before writing.** For anything about current Claude
  Code / models, check the official docs/changelog (code.claude.com) — don't
  write from memory. Models are fast-moving.

## Current model lineup (verified 2026-07-28 — re-verify before editing)
| Model | ID | Role |
|---|---|---|
| Fable 5 | `claude-fable-5` | Highest-capability widely released model ($10/$50) |
| Opus 5 | `claude-opus-5` | Complex agentic coding and enterprise work; Claude Max default ($5/$25) |
| Sonnet 5 | `claude-sonnet-5` | Speed/intelligence balance; introductory $2/$10 through Aug 31, then $3/$15 |
| Haiku 4.5 | `claude-haiku-4-5` | Fastest/cheapest ($1/$5) |
| Mythos 5 | `claude-mythos-5` | Invitation-only Project Glasswing model; not general-purpose routing |

**Two Opus 5 migration exceptions** (verified 2026-07-28): the API **Web Fetch**
tool is not available on Opus 5 (Web Search is a *different* tool and is fine),
and **Priority Tier** does not support Opus 5 (nor Sonnet 5) — and new Priority
Tier commitments are no longer sold, so only existing commitments are affected.
Neither limits ordinary Opus 5 availability on the API, Bedrock, Google Cloud, or
Foundry. **Fast mode** is Claude API (incl. Managed Agents) + Claude Code via
usage credits only — never Bedrock/Google Cloud/Foundry/Claude Platform on AWS —
and its "up to 2.5×" is *output tokens per second*, not TTFT and not an SLA.
**300k output** is a Message Batches-only cap; synchronous Opus 5 stays at 128k.

`/model default` is **plan-dependent**. Subagents run in the background by
default and nest up to 5 levels. Agent teams are experimental
(`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`).

## Ship flow (what has worked every time)
1. Branch `claude/product-gaps-improvements-h5gdn4` (restart from `origin/main`
   after each merge: `git fetch origin main && git checkout -B <branch> origin/main`).
2. Edit → verify in headless Chromium.
3. Commit → push (`--force-with-lease` if the branch still carries a
   just-merged pre-squash commit).
4. Open a **draft PR**, then squash-merge on the user's OK.
5. Confirm the deploy. Fastest check (verified 2026-07-29): `gh api
   /repos/gesh75/claude-mastery-hub/pages/builds/latest` returns `status: built`
   plus the deployed `commit` SHA directly — compare it to the squash commit.
   The `actions_list`/`gh api .../actions/runs?event=dynamic` route still works
   as a cross-check ("pages build and deployment", matching `head_sha`,
   `conclusion=success`); parse large run JSON with `jq`/Python, not raw output.
6. **Direct `github.io` fetch works** (corrected 2026-07-29 — the older "blocked
   by the proxy" note was wrong). `curl` the live URL and diff its sha256 against
   the repo's `index.html`; identical hashes prove the deploy served this commit.
   First fetch can take ~25s. Playwright can also drive the live URL directly via
   `test.use({baseURL})`, which is how production smoke tests are run.

## History (merged PRs)
#1 Sonnet 5 + How-To/CLI Hacks + animation explainers · #2 mid-2026 currency ·
#3 learning engine (quizzes/exam/spaced-rep) · #4 full quiz coverage + search +
anchors + print · #5 collapsible sidebar · #6 fix global click-to-top bug ·
#7 **Practice Lab** (12 challenges) · #8 currency pass (Chrome, agent teams,
Sonnet-5 default) · #9 og.png featuring the Practice Lab · #10 this CLAUDE.md
(Omega memory) · #11 Fable 5 added to the "Pick the right model" quick table ·
#12 CLAUDE.md checkpoint (PRs #10–#11) · #13 P0 responsive containment + mobile
nav a11y · #15 Copilot custom instructions · #14 **Opus 5 currency**: current
lineup, `MODEL_FACTS` registry, provenance-labeled benchmarks (ARC-AGI-3 as
30.16% exact / 30.2% rounded), migration exceptions (Web Fetch, Priority Tier),
Fast-mode scoping, content-currency policy, and Playwright currency regressions.

**Merged branches are normally retained** here (`fix/p0-responsive-navigation`,
`claude/product-gaps-improvements-h5gdn4`, `content/opus-5-currency` all still
exist); only #15's branch was deleted. Don't delete one without being asked.

## Known loose ends / ideas
- **Section-count drift:** hero says "37", README/og say "39/40". Reconcile to
  one honest number if touched.
- Periodic currency upkeep as Claude Code ships.
- More Practice Lab challenges; harder "apply/analyze" exam questions.
