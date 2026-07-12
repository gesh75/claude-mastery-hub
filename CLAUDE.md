# CLAUDE.md — Project memory for Claude Mastery Hub

> **Checkpoint: OMEGA** · last updated 2026-07-12
> Read this first. It's the durable brief so any new session starts grounded.

## What this is
An interactive, **single-file** educational guide to mastering Claude (the app,
Claude Code, the API & Agent SDK, MCP, skills, subagents, hooks, plugins,
multi-agent workflows) plus an "AI Foundations 101" track.

- **Live page:** https://gesh75.github.io/claude-mastery-hub/ (GitHub Pages)
- **Repo:** `gesh75/claude-mastery-hub` (owner: georgy75@gmail.com)
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
  - `LAB` — the **Practice Lab** (`#lab`): 12 hands-on scenario challenges,
    two types (`type:"cmd"` typed answer with `accept`/`startsWith` matching,
    or `type:"choice"`); each has `hint`, `sol`/`solText`, and a `why` note.
    "Show solution" unlocks only after an attempt.
- **localStorage keys:** `claude_hub_quiz_v1`, `claude_hub_exam_v1`,
  `claude_hub_mastery_v1`, `claude_hub_nav_v1`, `claude_hub_lab_v1`.
  Spaced-repetition intervals: `[1,3,7,21,45]` days.
- **Mastery ring** counts `.master-cb` checkboxes (currently **41**); adding a
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

## Current model lineup (mid-2026 — re-verify before editing)
| Model | ID | Role |
|---|---|---|
| Fable 5 | `claude-fable-5` | Most capable, premium ($10/$50) |
| Opus 4.8 | `claude-opus-4-8` | Deep reasoning; default on Max/Team Premium, Bedrock/Vertex |
| Sonnet 5 | `claude-sonnet-5` | Everyday default on Pro/Team Standard/Enterprise |
| Haiku 4.5 | `claude-haiku-4-5` | Fastest/cheapest ($1/$5) |

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
5. Confirm the deploy: `mcp__github__actions_list` (event=`dynamic`), find the
   "pages build and deployment" run whose `head_sha` matches the merge commit
   and `conclusion=success`. Direct `github.io` fetch is blocked by the proxy —
   use actions_list, and parse the saved file with `jq` (output overflows tokens).

## History (merged PRs)
#1 Sonnet 5 + How-To/CLI Hacks + animation explainers · #2 mid-2026 currency ·
#3 learning engine (quizzes/exam/spaced-rep) · #4 full quiz coverage + search +
anchors + print · #5 collapsible sidebar · #6 fix global click-to-top bug ·
#7 **Practice Lab** (12 challenges) · #8 currency pass (Chrome, agent teams,
Sonnet-5 default) · #9 og.png featuring the Practice Lab.

## Known loose ends / ideas
- **Section-count drift:** hero says "37", README/og say "39/40". Reconcile to
  one honest number if touched.
- Periodic currency upkeep as Claude Code ships.
- More Practice Lab challenges; harder "apply/analyze" exam questions.
