# SOL Independent Review

> **Pre-remediation baseline:** This audit records the application state before P0 Batch 1 implementation began. Its findings are preserved as originally reported.

Audit date: 2026-07-28  
Repository: `/Users/georgigaydarov/Projects/claude-mastery-hub`  
Default branch: `main`  
Live application: `https://gesh75.github.io/claude-mastery-hub/`

This was a read-only audit. No project files, branches, pull requests, or deployment state were changed. Evidence came from the local and remote Git state, GitHub PR and Pages history, static source analysis, the deployed artifact, scripted Chromium interaction at desktop and mobile viewports, two-tab and malformed-storage tests, direct offline-file execution, external-link checks, accessibility-tree inspection, and secret scanning.

## 1. Executive assessment

**Overall score: 64/100.**

**Maturity:** polished late prototype / early beta. The product has unusually strong content breadth and visual finish for a static learning guide, but it does not yet have the correctness, responsive behavior, state resilience, accessibility, or automated quality gates expected of a dependable production learning application.

**Safe to continue extending:** conditionally. The code is safe to maintain and contains no urgent security problem, but new content and feature work should pause until the P0 reliability defects and a small regression suite are addressed. Continuing to add sections in the present structure will increase count drift, duplicated currency facts, state risk, and DOM/test burden.

**Biggest strength:** a self-contained educational experience that combines a substantial reference guide, 108 quiz questions, an exam, 12 practice challenges, 24 explanatory diagrams, and offline operation without third-party runtime dependencies.

**Biggest weakness:** the project has no executable quality system. Manual headless-browser checks did not catch a live layout failure at every tested viewport, cross-tab progress loss, malformed-state crashes, hidden keyboard focus, or false-positive lab grading.

**Single most important next action:** ship a narrowly scoped reliability PR that fixes responsive containment and mobile navigation accessibility, backed by Playwright tests at the exact viewports that currently fail. Follow immediately with a state-integrity PR before adding product features.

## 2. Verification of previous handoff

The requested `AGENT_HANDOFF.md` is not present in the local checkout, remote `main`, the remaining remote feature branch, or repository history. The claims below were therefore reconstructed from the supplied request, `CLAUDE.md`, Git history, PRs #6–#12, source code, and deployment. The absence of the stated primary handoff artifact is itself an incorrect handoff claim.

| Claim | Verified status | Evidence | Notes |
| ----- | --------------- | -------- | ----- |
| `AGENT_HANDOFF.md` exists | Incorrect | File search, `git log --all -- AGENT_HANDOFF.md`, remote `main` tree, and feature-branch tree returned no file or history | The session-specific handoff cannot be reviewed directly |
| Repository is clean and current | Partially verified | Tracked worktree is clean at local SHA `4df893f`; ignored `.ruff_cache/` remains; remote `main` is `3da7864` | Local `origin/main` is stale, so normal status output misleadingly appears current |
| Single-file, offline-oriented architecture | Verified | Application is a 625,745-byte `index.html`; local file works with networking disabled; no runtime scripts, fonts, styles, or APIs are fetched | “Offline” applies to a downloaded/local copy; the live URL is not a service-worker-backed PWA |
| Approximately 6,556 lines | Verified | `index.html` is exactly 6,556 lines in the audited source and deployment | Byte-for-byte deployed hash also matched |
| 42 content sections | Verified | 42 `.sec` elements, 42 unique section IDs, and 42 matching navigation links | These are 39 numbered lessons plus What's New, Practice Lab, and Final Exam |
| Mastery ring count is 41 | Verified | 41 `.master-cb` controls and UI denominator of 41 | It excludes What's New, but the interface does not explain that distinction |
| 12 Practice Lab challenges | Verified | `LAB` contains 12 entries and all render | Seven command/text tasks and five multiple-choice tasks; five choices all use the first option as correct |
| `QUIZ`, `EXAM`, and `LAB` engines exist | Verified | Source data and rendering/state handlers are present and executable | 108 quiz questions, 20 exam questions, and 12 labs |
| Five localStorage keys | Verified | Source and browser storage show mastery, quiz, exam, lab, and sidebar-state keys | They are unversioned and lack schema migration |
| Seven PRs #6–#12 were merged | Verified | GitHub history shows merged SHAs `532ddb2`, `1c9e6fe`, `f79136a`, `67abede`, `780ce13`, `4df893f`, and `3da7864` | The local checkout lacks the final documentation-only merge |
| Headless Chromium verified every recent PR | Partially verified | Each PR body reports manual headless Chromium verification; Sourcery review completed | No scripts, durable test artifacts, CI browser checks, or reproducible assertions are committed |
| Live version is deployed from default branch | Verified | Latest Pages deployment succeeded for remote `main` SHA `3da7864`; live `index.html` is byte-identical to repository `index.html` | The final commit changed only `CLAUDE.md`, so the live application matches despite the local stale checkout |
| `CLAUDE.md` is a durable project brief | Verified | Present and updated through PR #12 on remote `main` | Local copy is one docs commit behind |
| Global `top` collision/scroll bug was fixed | Verified | PR #6 renamed the application variable; clicking quiz controls no longer jumps to page top in regression testing | Top-level global scope remains broadly used, so the wider collision class remains possible |
| Data-driven Practice Lab was added | Verified | PR #7 and live source contain one central `LAB` array and renderer | Validators are too permissive and coverage is narrow |
| Currency/model content was updated against official documentation | Partially verified | PR #8 updated mid-2026 model/pricing facts and sources | The July 24 Opus 5 release now makes core “current model” guidance stale |
| Open Graph card was added | Verified | PR #9 added `og.png` and matching OG/Twitter metadata | Card says 39 sections while metadata says 40 and the application routes to 42 |
| Table-rendering issue was fixed | Partially verified | Current tables render in Chromium and PR #11 records a Fable comparison-table correction | The missing handoff prevents verification of the original defect and exact claimed scope |
| Noisy diffs were reworked through rebasing | Unable to verify | Current PR histories and tree state do not prove the described intermediate workflow | Unable to verify with the currently available repository, environment, or deployment access. |
| All recent changes are on the default branch | Verified | Remote `main` contains PRs #6–#12 | A remote feature branch remains but has an identical tree and divergent history |
| No dead branches or temporary artifacts remain | Partially verified | One redundant remote feature branch remains; local ignored `.ruff_cache/` is unrelated Python cache data | Neither affects runtime, but both should be cleaned deliberately |
| Application is mobile-friendly | Incorrect | At widths 390, 768, 920, 921, 1024, 1280, 1366, and 1440 px, document width exceeds viewport and content is clipped | This is the most serious deployed UX defect |

Additional repository observations:

- There are no tags, package manifest, tests, test scripts, GitHub quality workflows, or committed verification utilities.
- The only automated PR signal on the seven recent PRs was Sourcery review; Pages deployment confirms publishing, not behavior.
- The live page returned HTTP 200 with HSTS. It did not provide CSP, `X-Content-Type-Options`, frame restrictions, or a referrer policy.
- Of 76 unique external links, 74 returned success. Two returned final 404 responses: the old Anthropic Artifacts announcement and an old Claude Styles support article.
- A gitleaks scan of 22 commits and approximately 776 KB found no leaked credentials.

## 3. Critical findings

### 3.1 Responsive content is clipped at every tested viewport

**Severity:** P0 — release blocker / major user failure.

**Evidence:** At a 390 px viewport, the document measured 1,276 px wide and `main` measured 1,254 px. At 920 px the document was still 1,276 px. At 1,440 px the document measured 1,686 px and `main` measured 1,282 px. The body uses `overflow-x: clip`, so users cannot scroll horizontally to recover the hidden content. The deployed site reproduces the same behavior.

**Reproduction steps:**

1. Open the deployed application.
2. Set the viewport to 390×844, 768×1024, 920×900, or 1,440×900.
3. Navigate below the hero to a section containing a table or code sample.
4. Compare `document.documentElement.scrollWidth` with `window.innerWidth` and inspect the right side of the content.
5. Observe that content extends beyond the viewport and is clipped.

**Root cause:** the grid child `main` keeps its default `min-width: auto`; large intrinsic content such as tables and preformatted code establishes a minimum width larger than the grid track. The outer body then hides the overflow instead of containing it. The breakpoint changes the grid but does not reset the grid item's minimum width.

**Recommended fix:** add `min-width: 0` to `main` and relevant grid/flex descendants; explicitly constrain tables, diagrams, and code containers; permit local scrolling where needed; test both sides of the 920/921 px breakpoint. Do not treat `overflow-x: clip` as the fix.

**Acceptance criteria:**

- At 320, 390, 768, 920, 921, 1,024, 1,280, 1,440, and 1,920 px, `scrollWidth <= innerWidth + 1`.
- Section cards remain fully reachable and readable.
- Wide code/tables scroll only inside their own bounded container.
- Navigation, diagrams, quizzes, the exam, and labs remain usable at every viewport.
- The checks run in CI.

### 3.2 Multiple tabs can silently erase valid progress

**Severity:** P0 — data loss.

**Evidence:** Two same-origin tabs loaded with empty mastery state. Tab A checked Start Here and wrote `{"start-here":true}`. Tab B, still holding its initial in-memory snapshot, checked Models and wrote `{"models":true}`, deleting Start Here. Reloading Tab A confirmed the loss. Tab B also did not update its UI when Tab A wrote storage.

**Reproduction steps:**

1. Clear the application's storage and open it in two tabs.
2. In tab A, mark Start Here complete.
3. In tab B, mark Models complete.
4. Reload tab A.
5. Observe that Start Here is no longer complete and only Models remains.

**Root cause:** each engine reads a whole JSON object once, mutates that stale in-memory object, and overwrites the whole storage key. There is no `storage` event listener, compare/merge step, or per-record conflict strategy. The same pattern affects quiz/lab state; stale exam state can overwrite a newer best score.

**Recommended fix:** introduce a small versioned state repository. Before every mutation, reread and validate the latest stored value, merge only the changed record, and use monotonic logic for best scores. Reconcile visible UI on the `storage` event. Keep per-engine schemas explicit.

**Acceptance criteria:**

- Disjoint changes from two tabs survive in either order.
- Visible progress updates in the second tab without a reload or is deterministically reconciled before its next write.
- An older exam snapshot cannot reduce a newer best score.
- Automated two-page tests cover mastery, quiz, lab, and exam state.

### 3.3 Closed mobile navigation traps keyboard users in invisible controls

**Severity:** P0 — significant accessibility failure.

**Evidence:** At 390 px with the sidebar visually closed, keyboard order reaches the visible menu button and hero actions, then focuses the off-screen search input and approximately 42 off-screen navigation links. Focus is effectively lost for more than 40 Tab presses. The menu button's accessible name is only “☰”; it exposes no expanded state or controlled element.

**Reproduction steps:**

1. Open the application at 390 px without opening the menu.
2. Press Tab from the address/page start.
3. After the visible hero controls, continue pressing Tab.
4. Observe focus moving through elements whose bounding boxes are off-screen.
5. Inspect the menu accessibility node and observe the missing label/state relationship.

**Root cause:** the sidebar is moved off-canvas using a transform but remains interactive and present in the accessibility tree. Menu behavior only toggles a CSS class; it does not set `inert`, manage focus, expose `aria-expanded`, support Escape, or return focus.

**Recommended fix:** make the closed sidebar inert and hidden from assistive technology; provide `aria-label`, `aria-expanded`, and `aria-controls`; move focus into the menu on open; close on Escape and link activation; restore focus to the trigger.

**Acceptance criteria:**

- No closed-sidebar descendant can receive keyboard or screen-reader focus.
- The button is announced as “Open navigation”/“Close navigation” with the correct expanded state.
- Opening moves focus predictably; Escape closes and returns focus.
- Focus remains visible and never leaves the viewport during the flow.
- Automated keyboard and accessibility assertions run at mobile width.

### 3.4 Valid but malformed persisted data can crash learning engines or create impossible scores

**Severity:** P0 — correctness and resilience.

**Evidence:** Invalid JSON is caught, but valid JSON of the wrong type is not. Storing JSON `null` for mastery aborts initialization while reading `start-here`; `null` for quiz, exam, or lab prevents later engines from rendering. Forty-five unknown mastery IDs display `45 / 41` and 110%. A quiz record with `total: 0` can count as passed because division produces an unbounded result.

**Reproduction steps:**

1. Put the JSON value `null` into each application state key, one at a time.
2. Reload and observe console exceptions and missing quiz, exam, or lab content.
3. Store a mastery object with 45 unknown truthy keys and reload.
4. Observe 110% mastery.
5. Store a quiz record with a positive best score and `total: 0`; reload.
6. Observe that invalid data can be treated as passed.

**Root cause:** `loadJSON` validates parseability, not type or schema. Calculations trust arbitrary stored keys and numeric fields. State keys have no schema version or migration, and startup has no independent per-engine error boundary.

**Recommended fix:** validate every persisted document against a versioned schema; filter mastery to current eligible IDs; constrain numeric ranges and denominators; quarantine/reset only the invalid engine state; add migrations and explicit fallback behavior.

**Acceptance criteria:**

- Null, arrays, strings, unknown keys, missing fields, negative values, zero totals, future versions, and oversized values never throw.
- Mastery always remains within 0–41 and 0–100%.
- Invalid quiz/exam/lab data cannot create completion or a passing score.
- Failure in one engine does not prevent other engines from rendering.
- Migration/corruption cases are unit- and browser-tested.

### 3.5 Practice Lab accepts incomplete non-answers as correct

**Severity:** P0 — educational correctness.

**Evidence:** Entering only `@` passes the file-reference task, `!` passes the Bash task, `#` passes the memory task, and `claude -p` without a prompt passes the headless-command task. All receive “✅ Nailed it.” All five multiple-choice labs place the correct response first, making position-only guessing reliable.

**Reproduction steps:**

1. Open Practice Lab.
2. Select the file-reference challenge and submit `@`.
3. Select the Bash challenge and submit `!`.
4. Select the memory challenge and submit `#`.
5. Select the headless challenge and submit `claude -p`.
6. Observe each challenge being marked solved.

**Root cause:** command validation uses prefix matching and accepts a value whose length equals the required prefix. It checks syntax markers rather than the task's semantic requirements. Choice answers are not shuffled or position-balanced.

**Recommended fix:** define task-specific validators with meaningful minimum structure, token requirements, and normalized parsing. For choice labs, shuffle while preserving answer identity or rebalance positions. Add validator tests for minimal prefixes, near misses, whitespace/casing, valid alternatives, and adversarial inputs.

**Acceptance criteria:**

- `@`, `!`, `#`, and bare `claude -p` are rejected with useful feedback.
- Every documented valid form passes.
- Each validator has positive, negative, boundary, and normalization tests.
- Correct choice position is not predictable across the lab set.

### 3.6 Core “current model” guidance is already stale

**Severity:** P0 — product-content correctness.

**Evidence:** The live guide repeatedly presents Opus 4.8 as the current deepest model and omits Opus 5 from model tables, diagrams, routing advice, and questions. Official documentation now lists Fable 5, Opus 5, Sonnet 5, and Haiku 4.5; official release notes date Opus 5 to 2026-07-24. The site was last deployed on July 13. Pricing and current-model strings are duplicated across the single file rather than sourced from one fact record. See the [official model overview](https://platform.claude.com/docs/en/about-claude/models/overview), [Opus 5 notes](https://platform.claude.com/docs/en/about-claude/models/whats-new-opus-5), [release notes](https://platform.claude.com/docs/en/release-notes/overview), and [pricing](https://platform.claude.com/docs/en/about-claude/pricing).

**Reproduction steps:**

1. Search `index.html` for `Opus 4.8`, `Opus 5`, model IDs, and price strings.
2. Compare the displayed lineup and recommendations with official model overview and release notes.
3. Observe 30 Opus 4.8 references and no integrated Opus 5 curriculum update.

**Root cause:** time-sensitive facts are embedded throughout prose, tables, diagrams, examples, questions, and metadata. There is no owner, “verified as of” field, fact registry, expiry check, or update workflow.

**Recommended fix:** update the curriculum using current official sources, then centralize volatile facts and attach source URL plus `verifiedAt` metadata. Prefer timeless capability-selection guidance where exact product names or prices add little learning value.

**Acceptance criteria:**

- Current model lineup, identifiers, relative guidance, migration notes, prices, quizzes, and diagrams agree.
- Every volatile fact has an official source and verification date.
- A repository check flags expired or contradictory facts.
- Generic money examples consistently use USD.

## 4. High-value improvements

1. **Replace self-attested completion with evidence-aware progress.** The 41-item ring currently measures checkbox clicks, not mastery, and remains independent of quiz, exam, and lab results. Rename it “completion” immediately, then introduce a separate mastery measure based on successful delayed recall.

2. **Correct the spaced-review state machine.** A failed due review retains the historical best score, refreshes the timestamp, hides the due chip, and postpones review. Repeated same-session passes increase repetition count and can jump the interval to seven or more days without delayed recall. Store `bestScore`, `lastScore`, `lastAttemptAt`, `reviewStage`, and `nextDueAt` separately. Only a successful due review should advance the stage; a failed review should shorten/reset it.

3. **Centralize product counts and vocabulary.** The hero says 37 sections, OG/README say 39, metadata says 40, navigation has 42 destinations, and the ring has 41 eligible items. Generate all counts from one curriculum manifest and label them precisely: 39 lessons, Practice Lab, Final Exam, and What's New; 41 trackable learning activities if that number must be exposed.

4. **Add a reset/export/import surface.** There is no global reset and no normal way to recover from unwanted or corrupt state. Provide a settings panel that previews what will be removed, confirms reset, exports a versioned JSON document, and validates imports before applying them.

5. **Make feedback perceivable and actionable.** Quiz/lab correctness appears visually but is not exposed through an `aria-live` status. Convert question groups to fieldset/radio or properly described button groups, associate lab inputs with visible labels, announce results, and move focus to actionable recovery when appropriate.

6. **Fix two broken official links and add scheduled link checking.** Replace the obsolete Artifacts and Styles URLs with current official destinations. Internal anchors should block merges; external failures should initially warn because remote servers are transient.

7. **Contain global JavaScript.** The fixed `top` collision was one instance of a broad pattern: numerous mutable values and functions live on `window`, and element IDs can create named globals. Wrap current behavior in a strict module/IIFE now; the later build should use ES modules. Avoid inline handlers and assert that application state is not exported to `window`.

8. **Provide graceful feature fallback.** When `IntersectionObserver` is unavailable, script startup throws while all 42 sections remain opacity-zero and learning engines do not render. Enhanced reveal behavior should be opt-in: content must default visible, then animate only when support exists. Clipboard failures should be caught with fallback copy instructions and visible status.

9. **Reduce eager DOM cost as content grows.** The current page creates about 10,936 elements, 731 buttons, 167 code/copy controls, 24 SVG diagrams, and 49 animated elements up front. Current load is still acceptable, but quizzes, exam, and labs should render on demand before content expands substantially.

10. **Use navigation history intentionally.** Section navigation calls `replaceState`, so Back does not return to the previously visited lesson. Prefer `pushState` for explicit user navigation, reserve `replaceState` for initial normalization, and handle `popstate`.

11. **Expand labs by learning objective, not raw count.** Twelve labs cover only nine numbered curriculum sections and are concentrated around slash commands, shortcuts, and memory. The next lab set should prioritize scenario application in API use, security, workflows, prompting, tool choice, and AI foundations.

12. **Preserve active work where it matters.** Completed quiz/mastery/lab state persists, but an in-progress quiz, exam selection set, and unlocked lab attempt do not survive reload. Autosave exam and quiz drafts; transient hints may remain session-only if that behavior is explicitly explained.

Security classification:

- **Realistic low-level risks:** malformed/tampered local state breaks reliability; stale official links can redirect users incorrectly; missing defensive headers reduce defense in depth.
- **Theoretical future risks:** 16 `innerHTML` assignments currently render author-controlled static data. They become DOM-XSS sinks if content ever becomes URL-, import-, cloud-, or user-controlled. Replace with DOM/text construction during modularization or sanitize at the trust boundary.
- **Non-issues today:** no secrets, dynamic evaluation, user-controlled HTML, dependency supply chain, external runtime script, authentication, sensitive backend, or reverse-tabnabbing was found. All `target="_blank"` links use `rel="noopener"`.

## 5. Architecture recommendation

**Recommendation:** retain a generated single-file distribution for the offline product promise, but stop authoring the whole application as one hand-maintained file. Add a lightweight build process that composes modular source data, state logic, rendering logic, CSS, and templates into `index.html`. A component framework is not justified now.

| Option | Benefits | Costs | Migration risk | Maintainability effect | Timing |
| --- | --- | --- | --- | --- | --- |
| 1. Keep one file and improve internals | Fastest P0 fixes; no tooling or distribution change | Content, state, rendering, styles, and facts remain coupled; tests require browser-heavy setup | Low | Small short-term improvement, continuing long-term decline | Appropriate only for the immediate P0 patch |
| 2. Split into static HTML/CSS/JS/data files | Native browser model; clearer ownership; easier linting and tests | A folder rather than one downloadable file; `file://` module/CORS behavior can weaken the offline promise | Low–medium | Meaningful improvement | Viable, but less aligned with the single-file differentiator |
| 3. Lightweight build producing one bundled HTML file | Modular authoring plus the same portable artifact; schemas/count generation and minification become possible | Adds Node tooling and artifact-generation discipline | Medium | Best balance; materially improves testability and currency maintenance | Recommended after P0 fixes |
| 4. Component framework | Strong component model and ecosystem | Build/runtime complexity, migration effort, larger conceptual surface, and no demonstrated need for server state or complex routing | High | Could improve UI composition but adds disproportionate cost | Not appropriate now; reconsider only for profiles, cloud sync, or authoring tools |

Staged migration:

- **Stage 0 — stabilize in place:** fix responsive containment, mobile navigation semantics, state validation/merging, and lab validators in the current file. Establish regression tests before moving code.
- **Stage 1 — extract pure behavior:** create typed or JSDoc-described modules for storage schemas, scoring/review scheduling, navigation, and lab validation. Move CSS and content data to source files. A deterministic build emits the portable `index.html`.
- **Stage 2 — make content data-driven:** define a curriculum manifest containing section ID, sequence, track, mastery eligibility, source facts, quiz pool, and related labs. Generate navigation, counters, metadata, and validation reports.
- **Stage 3 — scale only on evidence:** lazy-render learning engines, add question pools/review queue, and consider optional PWA packaging. Do not adopt a framework unless actual feature complexity makes the build-generated static design insufficient.

The existing file is already past the comfortable hand-maintained threshold: a one-line state or layout assumption has page-wide consequences, facts and counts have drifted, manual diffs are noisy, and isolated tests are impractical. This is evidence for modular source authoring, not evidence for a rewrite.

## 6. Testing strategy

The minimum suite should use Playwright for browser behavior, a small pure-JavaScript test runner such as Vitest for state/scoring/validation, axe-core for accessibility, html-validate and ESLint for static checks, and a link checker such as Lychee. Chromium, Firefox, and WebKit should run for the short critical path; broad visual matrices can remain Chromium-first.

| Test area | Risk covered | Suggested tool | Complexity | Merge blocking? | Example |
| --- | --- | --- | --- | --- | --- |
| Responsive containment | Current live clipping release blocker | Playwright | S | Yes | Assert document width at 320, 390, 768, 920, 921, 1024, 1440 |
| Navigation/scroll | Broken anchors and recurrence of `top` collision | Playwright | S | Yes | Click all 42 links; assert hash/target; answer quiz at depth and assert no top jump |
| Storage schema/migration | Crashes, impossible scores, future drift | Vitest + Playwright | M | Yes | Null, arrays, unknown IDs, zero totals, old/future versions |
| Cross-tab state | Silent progress loss | Playwright two pages | M | Yes | Concurrent mastery changes merge; best exam score never decreases |
| Learning engines | Incorrect transitions and false lab passes | Vitest + Playwright | M | Yes | Correct/wrong/retry; due-review failure; same-day repeat; prefix-only lab answers |
| Curriculum schema/counts | 37/39/40/41/42 drift and bad markup | Vitest/build validator | S | Yes | Unique IDs, continuous lesson numbers, eligible count, valid correct indexes |
| Accessibility critical path | Hidden focus, missing names/status | Playwright + axe-core | M | Yes for serious/critical violations | Mobile menu focus, Escape, live result announcement, visible focus |
| Offline behavior | Contradiction of core product claim | Playwright | S | Yes | Load built file with network disabled; assert no failed required resources |
| HTML/JavaScript quality | Invalid generated markup/global collisions | html-validate + ESLint | S | Yes | No duplicate IDs, inline global leakage, parser errors |
| Deployment identity | Published artifact differs from `main` | Pages smoke script | S | Yes for release | Compare embedded build SHA/version and exercise initial load |
| Cross-browser critical flow | Unsupported API and engine differences | Playwright projects | M | Yes for short smoke | Load, navigate, answer one quiz/lab, persist/reload |
| External links | Content decay | Lychee/scheduled workflow | XS | Internal: yes; external: warn initially | Check anchors per PR; official links weekly |
| Visual regression | Layout/diagram/table changes | Playwright snapshots | M | Later, targeted only | Hero, mobile lesson, wide table, diagram, Practice Lab |
| Encoding/content generation | Emoji corruption and edit-script damage | UTF-8/schema checks | S | Yes when scripts exist | Parse output as UTF-8 and snapshot sentinel emoji/code blocks |

Tests that should block merges now:

- Responsive width and core mobile navigation.
- All internal navigation and direct hashes.
- State validation/migration and two-tab merge behavior.
- Quiz/exam/lab correctness, including known false-positive inputs.
- Mastery bounds and count invariants.
- Critical accessibility flow and no serious axe violations in representative views.
- Offline local-file smoke.
- HTML/JS parsing/linting and generated curriculum schema.
- A compact Chromium/Firefox/WebKit smoke.

Tests that can wait:

- Full-page visual snapshots for all 42 sections.
- Exhaustive screen-reader/vendor combinations.
- Performance budgets beyond a basic DOM/load threshold.
- Blocking on all external links.
- Large randomized/adaptive-learning simulations before those features exist.

High-value example assertions:

```text
expect(document.scrollWidth).toBeLessThanOrEqual(window.innerWidth + 1)
expect(progress.completed).toBeLessThanOrEqual(progress.eligible)
expect(validateLab("@")).toEqual({ passed: false, reason: ... })
expect(merge(tabA, tabB)).toContainBoth("start-here", "models")
expect(reviewAfterFailedDueAttempt.nextDueAt).toBeSoonerThan(previousSchedule)
expect(closedSidebarSearch).not.toBeFocusable()
expect(allRuntimeRequests).toEqual([documentRequest])
```

The prior headless checks usefully proved that a specific happy-path interaction rendered in Chromium after each PR. They did not establish responsive layout, cross-browser behavior, keyboard accessibility, state concurrency, schema resilience, semantic answer validity, deployment identity over time, or regression durability. Those gaps directly explain the defects found here.

## 7. Learning-system improvements

1. **Separate completion from mastery.** Keep manual checkboxes as a “studied/completed” signal. Compute mastery separately from evidence: quiz performance plus at least one successful delayed review, with labs/exam contributing only where mapped to explicit learning objectives.

2. **Use a practical review scheduler.** A section begins at stage 0. Passing its quiz schedules a one-day review but does not yet establish mastery. Passing a due review advances intervals such as 1, 3, 7, 21, and 45 days. Failing resets or shortens the interval and marks the section weak. Same-session retries can improve the current score but cannot advance the review stage.

3. **Track attempts without overbuilding analytics.** Persist bounded attempt records containing timestamp, score, total, mode, and whether the attempt was due. Keep the latest 10 per section or aggregate older attempts. This is sufficient for weak-area selection and debugging without a backend.

4. **Fix question-position bias.** Quiz correct answers are concentrated in position 2 (87/108, 80.6%); exam answers are position 2 for 14/20 (70%); all five choice labs use position 1. Shuffle choices per attempt while storing a stable answer ID, or rebalance positions at authoring validation time.

5. **Improve distractors and feedback.** Replace obviously wrong distractors with plausible misconceptions. After an answer, explain why the selected answer is right or wrong and link to the exact lesson. Do not reveal only correctness.

6. **Create small question pools.** Start with five questions for the highest-value/most error-prone sections, drawing three per attempt. Avoid pooling all 39 lessons at once. Authoring validation should prevent duplicate prompts, empty explanations, invalid answer IDs, and heavily skewed positions.

7. **Make the exam more independent.** No exact quiz-question text duplication was detected, which is good. Preserve that rule, use more scenario and tool-selection questions, and draw from a pool so memorized positions do not dominate repeated attempts.

8. **Make labs test application.** Replace token-prefix validation with objective-specific rubrics. Add short scenarios that require choosing a workflow, identifying a security risk, assembling a complete command, or correcting a flawed prompt. Offer partial diagnostic feedback, but only complete a lab when all required elements are present.

9. **Expand representative coverage deliberately.** Current labs touch nine of 39 numbered lessons (about 23%), with repeated coverage of slash commands, shortcuts, and memory. The next six should cover API/tool use, security/permissions, hooks/workflows, prompting/evaluation, model/cost choice, and AI foundations before adding more shortcut drills.

10. **Add a review queue before adaptive complexity.** A “Review now” view should rank overdue, failed, and low-confidence sections. Fixed deterministic selection is preferable initially; weighted/adaptive randomization becomes useful only after trustworthy attempt history exists.

A defensible initial mastery calculation:

```text
section mastered =
  quiz score >= 80%
  AND at least one successful review >= 24 hours after initial pass

overall mastery =
  mastered eligible sections / eligible sections
```

Labs and the exam should be displayed as additional evidence and milestones, not used to inflate every unrelated section. Confidence input, prerequisites, partial credit, and advanced adaptive difficulty are optional later refinements; they should not delay correctness of the basic schedule.

## 8. UX and accessibility improvements

Ranked by user impact:

1. **P0 — responsive containment.** Current: the app clips content at mobile and desktop widths. User problem: core lessons, tables, and controls are unreadable/unreachable. Proposed: constrain grid children and localize wide overflow. Acceptance: no page-level horizontal overflow across the required viewport matrix.

2. **P0 — off-canvas focus.** Current: closed mobile navigation remains keyboard-accessible off-screen. User problem: keyboard and screen-reader users lose position for dozens of controls. Proposed: inert/hidden closed state plus complete dialog-like focus behavior. Acceptance: the closed menu contributes no tab stops and open/close state is announced.

3. **P1 — progress meaning.** Current: a “mastery” ring counts manual checkboxes while quizzes/labs have separate state. User problem: the product implies learning evidence that it does not measure. Proposed: label it “course completion” now and later show distinct Completion, Mastery, and Review Due values. Acceptance: labels and help text accurately describe each calculation.

4. **P1 — result semantics.** Current: visual color/text indicates quiz and lab results without a live status region or semantic question group. User problem: assistive technology may not announce results, and context is unclear. Proposed: fieldset/legend or radiogroup semantics, associated labels, and polite/assertive result status as appropriate. Acceptance: a screen reader announces question, options, selection, result, explanation, and next action.

5. **P1 — recovery/settings.** Current: no global reset, import, or export exists. User problem: unwanted or damaged progress requires developer tools. Proposed: a compact data settings panel with export, validated import, and confirmed per-engine/all reset. Acceptance: users can recover without console access; cancellation never changes data.

6. **P1 — count clarity.** Current: 37, 39, 40, 41, and 42 appear without consistent semantics. User problem: course size and progress denominator look erroneous. Proposed: one generated manifest and explicit wording. Acceptance: every surfaced count has one meaning and matches the rendered curriculum.

7. **P1 — touch and focus targets.** Current: representative copy buttons are about 22 px high, mastery rows about 37 px, and quiz options about 38 px; focus treatment on some heading anchors suppresses the normal outline. User problem: targets are difficult on touch and focus can be subtle. Proposed: minimum 44×44 interactive targets where practical and a consistent high-contrast `:focus-visible` ring. Acceptance: critical mobile controls meet target size and every interactive control has a visible focus indicator.

8. **P2 — browser history.** Current: section navigation replaces history. User problem: Back can leave the application instead of returning to the previous lesson. Proposed: push explicit navigations and restore section state on popstate. Acceptance: Back/Forward traverses the user's section sequence without scroll jumps.

9. **P2 — active-attempt continuity.** Current: partial quiz/exam selections disappear on reload, while completed state persists. User problem: accidental reload loses work without warning. Proposed: autosave quiz/exam drafts and clearly distinguish saved completion from transient lab hints. Acceptance: a reload restores the current attempt or explicitly warns before discarding it.

10. **P2 — graceful enhancement.** Current: missing IntersectionObserver prevents content and learning engines from appearing; clipboard rejection creates an unhandled error. Proposed: default-visible content with optional animation, supported fallback paths, and error status. Acceptance: unsupported optional APIs never block reading or core learning.

What already works well:

- One H1, 42 H2s, and sensible main/nav/aside/header/footer landmarks provide a strong structural baseline.
- Reduced-motion preference disables animation successfully.
- Navigation hierarchy and track grouping are visually clear on a sufficiently wide canvas.
- Direct hashes, 42 internal navigation targets, print styles, dark-theme consistency, empty search handling, and correct/wrong visual feedback are present.
- The diagrams and compact examples often clarify concepts rather than serving as decoration.

The mascot, confetti, “infinity” power stat, and 49 animated elements are pleasant polish but lower-value than reliability, review workflows, and accurate learning signals. A light theme is optional; dark mode itself is not a defect.

## 9. Content-maintenance strategy

Create a single volatile-facts registry in modular source, for example:

```json
{
  "opus-current": {
    "value": "Opus 5",
    "source": "https://platform.claude.com/docs/en/about-claude/models/overview",
    "verifiedAt": "2026-07-28",
    "reviewAfterDays": 14,
    "owner": "content-maintainer"
  }
}
```

Classify changing content:

| Fact type | Treatment |
| --- | --- |
| Current model lineup, IDs, prices, limits, plan names | Centralized data; official source; “verified as of” date; short review interval |
| Relative capability guidance | Prefer timeless decision criteria; reference current examples from central data |
| Generic money examples | Use USD consistently; keep timeless unless a real product price is required |
| Product policies and external-service behavior | Link to official policy; summarize minimally; date verification |
| Software commands/versions | Test executable examples where possible; date version-specific claims |
| Screenshots/UI directions | Prefer conceptual wording; review after product UI releases |
| Historical model context | Keep only when educationally useful and label as historical |
| High-cost facts with little learning value | Remove rather than maintain |

Operating strategy:

- **Owner:** one named content maintainer for model/pricing facts; section authors remain responsible for their learning content.
- **Sources:** official Anthropic platform documentation and release notes first; official Claude Help Center for consumer-plan behavior. Do not use secondary summaries for current claims.
- **Cadence:** automated weekly official-link/release-note check; biweekly review of model/pricing/limit facts; quarterly full curriculum currency audit; immediate audit after a major model launch or retirement.
- **Search method:** registry-driven report plus repository search for model names, IDs, `$` amounts, “current/latest,” dates, plan names, limits, and official URLs. CI should reject unregistered volatile literals in designated content fields.
- **Acceptance criteria:** sources reachable; verification dates current; registry and every rendered occurrence agree; quizzes, diagrams, metadata, README, and OG assets are included in the same change; all generic amounts are USD; retired guidance is removed or explicitly historical.
- **Staleness detection:** the build emits warnings when `verifiedAt + reviewAfterDays` has passed and fails CI after a defined grace period. A scheduled workflow opens an issue with the expired fact IDs and relevant official links.

Immediate content update:

- Integrate Opus 5 across the lineup, selection guidance, model IDs, pricing references, retirement/migration notes, diagrams, quizzes, README, and metadata.
- Recheck the temporary Sonnet 5 introductory pricing deadline shown in the official pricing documentation before the August 31 transition.
- Replace the two broken official links.
- Resolve count wording and regenerate OG/meta copy from the curriculum manifest. The OG image can still advertise “39 lessons” if that phrase is explicit and correct.

## 10. Prioritized backlog

| Priority | Improvement | Evidence/problem | Proposed solution | Effort | Risk | Expected value | Dependencies |
| -------- | ----------- | ---------------- | ----------------- | ------ | ---- | -------------- | ------------ |
| P0 | Fix responsive containment | Page is 1,276 px wide at 390 px and clipped at every tested width | `min-width: 0`, bounded local overflow, breakpoint regression tests | S | Medium: CSS can affect diagrams/tables | Restores mobile and narrow-desktop usability | Playwright setup |
| P0 | Make mobile navigation accessible | Closed sidebar exposes ~43 invisible tab stops; menu lacks name/state | Inert/ARIA state, Escape, focus entry/return, link-close behavior | S | Low | Removes severe keyboard/screen-reader failure | Responsive fix/test |
| P0 | Introduce versioned, validated state repository | Null/wrong-shaped storage crashes engines; 110% mastery possible | Per-engine schemas, sanitization, migrations, bounded calculations | M | Medium: existing-user migration | Prevents crashes and invalid progress | Unit-test harness |
| P0 | Make writes cross-tab safe | Stale tab overwrites newer mastery/progress | Reread/merge before mutation, monotonic best scores, storage listener | M | Medium: concurrency semantics | Prevents silent data loss | State repository |
| P0 | Correct lab validators and answer-position bias | Prefix characters pass four labs; all choice labs answer A | Semantic validators, stable answer IDs, shuffle/rebalance, tests | S | Low | Restores educational validity | Unit-test harness |
| P0 | Update current model guidance | Opus 5 launched July 24; site still teaches Opus 4.8 as current | One source-backed content update across prose, diagrams, questions, metadata | M | Medium: broad content diff | Restores core curriculum accuracy | Content checklist |
| P1 | Add minimum CI quality gate | No test/package/workflow exists; manual checks missed P0 defects | Playwright, Vitest, axe, lint/schema, offline/deploy smoke | M | Low | Prevents regression recurrence | Initial test scaffolding |
| P1 | Correct review scheduling | Failure hides due review; same-session passes inflate interval | Separate last/best score and due stage; advance only on delayed success | M | Medium | Makes retention mechanism defensible | State schema |
| P1 | Centralize curriculum manifest/counts | 37/39/40/41/42 drift | Generate navigation, eligibility, metadata, and validations | M | Medium: content extraction | Eliminates repeated count defects | Lightweight build |
| P1 | Rename/redefine mastery | Ring measures self-attested completion | Immediate label fix; later evidence-based mastery metric | S | Low | Removes major user confusion | Learning-model decision |
| P1 | Add progress reset/export/import | No user-accessible recovery path | Versioned export/import and confirmed scoped reset | M | Medium: import validation | User control, portability, recovery | State repository |
| P1 | Improve accessible question/result semantics | Feedback not live; lab input relies on placeholder | Semantic groups/labels, result status, focus recovery | M | Low | Better screen-reader and keyboard learning flow | A11y tests |
| P1 | Centralize volatile facts | Prices/model strings repeated throughout source | Fact registry with source, owner, verified date, expiry check | M | Medium: build/content changes | Sustainable correctness | Lightweight build |
| P1 | Repair and monitor external links | 2 of 76 external URLs return 404 | Replace URLs; scheduled external link check | XS | Low | Prevents dead learning paths | None |
| P1 | Modular source with single-file build output | 6,556-line file couples content/UI/state and blocks isolated tests | Lightweight deterministic bundling; modular data/logic/CSS | L | Medium | Largest maintainability gain without changing product format | Regression baseline |
| P2 | Expand scenario labs and review queue | 12 labs cover 9/39 lessons; weak areas not prioritized | Six objective-led labs; overdue/failed/weak queue | L | Low | High educational value | Correct learning state |
| P2 | Add question pools and balanced distractors | 80.6% quiz answers are option 2 | Stable answer IDs, small pools for priority lessons, authoring validation | L | Medium: content work | Reduces gaming and improves retest value | Curriculum schema |
| P2 | Restore active attempts | Partial quiz/exam work disappears on reload | Draft state with expiry and resume/discard controls | M | Low | Prevents accidental work loss | State repository |
| P2 | Graceful browser fallbacks | Missing IntersectionObserver hides all content; clipboard rejection unhandled | Default-visible enhancement and copy fallback/status | S | Low | Improves resilience | Browser smoke tests |
| P2 | Intentional browser history | `replaceState` prevents section Back behavior | `pushState` for user actions and `popstate` restoration | S | Low | More conventional navigation | Navigation tests |
| P2 | Reduce eager rendering | ~10,936 elements and 731 buttons load immediately | Render quiz/exam/lab panels on activation; set a DOM budget | M | Medium | Maintains performance as content grows | Modular rendering |
| P3 | PWA installation/offline cache | Local file is offline, but live URL is not installable/cached | Evaluate manifest/service worker only after update-staleness design | L | Medium: stale cache risk | Convenience, not current core need | Build/version strategy |
| P3 | Cloud sync/profiles/instructor mode | No validated demand; would introduce identity/backend/security scope | Defer pending user evidence | XL | High | Uncertain | Product validation and backend architecture |

## 11. Recommended next implementation batch

Use a two-PR “viewport and state integrity” batch. The sequence is tightly related through regression infrastructure but remains small enough to review safely.

### PR A — responsive and mobile-navigation hardening

**Exact scope:**

- Constrain `main`, section content, tables, diagrams, and code blocks so the document never exceeds the viewport.
- Correct the mobile sidebar's hidden/visible semantics and keyboard focus lifecycle.
- Add menu accessible name, expanded/control state, Escape handling, focus return, and close-on-navigation.
- Add Playwright scaffolding and targeted responsive/keyboard regressions.

**Files likely affected:**

- `index.html`
- `package.json` and lockfile
- `playwright.config.*`
- `tests/e2e/responsive-navigation.spec.*`
- `.github/workflows/quality.yml`

**Required tests:**

- Width assertions at 320, 390, 768, 920, 921, 1,024, 1,280, 1,440, and 1,920 px.
- Representative wide table, code, diagram, quiz, and lab visibility.
- Closed sidebar has no focusable descendants.
- Open, Tab, select link, Escape, and focus-return flows.
- All 42 section links and the deep-page no-scroll-to-top regression.
- Chromium plus compact Firefox/WebKit smoke.

**Acceptance criteria:**

- No page-level horizontal clipping at the viewport matrix.
- Local overflow is usable by touch and keyboard.
- Mobile menu behavior meets the criteria in findings 3.1 and 3.3.
- Tests are deterministic and required on PRs.
- The deployed artifact passes the same smoke after Pages completes.

**Risks:** CSS containment can subtly change table/diagram sizing; focus timing can interact with sidebar transitions. Snapshot a representative wide table and diagram and avoid timeout-based focus tests.

### PR B — persisted-state and lab-correctness hardening

**Exact scope:**

- Add versioned schemas and safe loaders for all five keys.
- Filter/count only current curriculum IDs and clamp numeric state.
- Merge current storage before writes, reconcile storage events, and protect best scores.
- Correct the four permissive command validators and remove deterministic choice position.
- Add a user-visible “Reset learning data” action; export/import can follow if necessary to preserve PR size.

**Files likely affected:**

- `index.html`
- `src/state.*`, `src/lab-validation.*`, and build configuration if lightweight extraction begins here; otherwise keep the first implementation local and pure
- `tests/unit/state.spec.*`
- `tests/unit/lab-validation.spec.*`
- `tests/e2e/progress.spec.*`

**Required tests:**

- Invalid JSON and every valid-wrong-shape class.
- Unknown IDs, zero totals, negative/oversized values, and old/future versions.
- Two-tab merge behavior for mastery/quiz/lab and monotonic exam best score.
- Reload persistence and scoped reset.
- Positive, negative, boundary, and whitespace/case lab validator cases.

**Acceptance criteria:**

- No stored value can crash startup, exceed progress bounds, or manufacture a pass.
- Two-tab actions never erase disjoint progress.
- Minimal prefixes fail and documented full answers pass.
- Existing valid user progress migrates without loss.

**Risks:** migration mistakes can lose existing state; lab normalization can reject legitimate alternatives. Preserve a pre-migration backup for one version and document accepted answer variants.

**Explicitly excluded from this batch:**

- Framework adoption or broad visual redesign.
- Full modular-source migration.
- New lessons, labs, question pools, adaptive learning, analytics, cloud sync, PWA, profiles, or instructor mode.
- Comprehensive content rewrite. The Opus 5 correction should be a separate focused content PR in parallel only after its facts are verified.
- Performance/lazy-render refactoring beyond fixes required for responsive behavior.

If only one PR can be done next, do PR A first: the current deployed product is not reliably usable at any tested mobile or common desktop width.

## 12. Final verdict

1. **Was the previous session's work high quality?**  
   The individual changes were generally purposeful and competently implemented, but the session's overall quality assurance was not high enough. A polished happy path and successful deployment masked multiple reproducible P0 failures.

2. **Which parts were strongest?**  
   The `top` collision regression is genuinely fixed; the Practice Lab is centrally data-driven; the live artifact matches the default-branch application; the site remains dependency-free and locally offline-capable; OG metadata exists; internal anchors are complete; and the educational/visual breadth is strong.

3. **What was missed?**  
   Responsive containment across all tested widths, mobile hidden-focus behavior, cross-tab data loss, wrong-shaped localStorage crashes, impossible progress values, prefix-only lab answers, answer-position bias, broken review scheduling, count semantics, missing reset/recovery, unsupported-API fallback, two dead external links, absence of automated tests, and the July 24 Opus 5 currency change.

4. **Is the handoff trustworthy?**  
   Not as a source of record. Many supplied claims were directionally accurate, but `AGENT_HANDOFF.md` does not exist in any accessible repository state, the local checkout is one commit behind a stale tracking ref, and manual test claims have no durable implementation or artifacts. Every important claim should continue to be independently verified.

5. **What should the next agent do first?**  
   Reproduce the responsive overflow at 390 and 1,440 px, write failing Playwright assertions, then fix grid/content containment and the mobile menu focus model in one reviewable PR. Do not add content or architecture until that regression gate is green.

The project is worth continuing. Its product concept and content execution are stronger than its 64/100 score might suggest; the score is constrained by deployed correctness and quality-system gaps, not by a lack of value. A short stabilization phase can convert it from an impressive static prototype into a credible, maintainable learning product without sacrificing the single-file offline experience or resorting to a framework rewrite.
