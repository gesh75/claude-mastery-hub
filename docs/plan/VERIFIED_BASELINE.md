# Verified baseline — 2026-08-09

Measured against `main` at `21798dc` ("Derive the Practice Lab count instead of
pinning it (#29)").

**Do not copy these numbers into a branch.** Re-measure with the commands below at
branch time. Several PRs in this programme change values on this page, so any
figure inherited from a document is wrong the moment it is not the first to merge.
See [COOKBOOK_TRACKS.md](COOKBOOK_TRACKS.md) § "Counts are derived, never merged".

## Measured values

| What | Value | How to re-measure |
| --- | --- | --- |
| `.master-cb` inputs (the section count) | **41** | `grep -o '<input[^>]*master-cb' index.html \| wc -l` |
| `div.diagram` | **24** | `grep -o 'class="diagram"' index.html \| wc -l` |
| `details.anim-x` | **25** | `grep -o '<details class="anim-x"' index.html \| wc -l` |
| `LAB` challenges | **12** | `window.LAB.length` |
| `QUIZ` top-level keys | **36** | depth-aware walk of `var QUIZ={` — see below |
| `expected-tests.json` `totalMinimum` | **96** | `jq .totalMinimum scripts/expected-tests.json` |
| Sum of `perFileMinimum` | **96** | exactly equal — there is no slack |

### `.diagram` ≠ `details.anim-x`

`details.anim-x` is 25 because one of them is `<details class="anim-x" id="changelog">` —
the "Recently updated" panel, which is not a diagram. **Any diagram-count guard must
derive from `.diagram`, never `.anim-x`**, or it is permanently off by one.

### `QUIZ` has 36 keys, not 22

A naive `grep` for bare-identifier keys returns 22 because it drops all 14
double-quoted hyphenated keys (`"plan-think"`, `"api-sdk"`, `"ai-llm"`, `"ai-tokens"`,
`"ai-transformer"`, `"ai-agents"`, `"writing-code"`, `"boris-tips"`, `"ai-what"`,
`"ai-ml"`, `"ai-neural"`, `"ai-training"`, `"ai-inference"`, `"ai-safety"`).
22 + 14 = 36. Measure with a brace-matched, depth-aware walk:

```bash
python3 - <<'PY'
import re
h=open('index.html',encoding='utf8').read()
j=h.index('var QUIZ={')+len('var QUIZ=')
d=0
for k in range(j,len(h)):
    if h[k]=='{': d+=1
    elif h[k]=='}':
        d-=1
        if d==0: end=k; break
blk=h[j:end+1]; keys=[]; d=0; i=0
while i<len(blk):
    c=blk[i]
    if c in '{[': d+=1
    elif c in '}]': d-=1
    elif d==1:
        m=re.match(r'"([A-Za-z0-9_-]+)"\s*:|([A-Za-z_][A-Za-z0-9_]*)\s*:', blk[i:])
        if m: keys.append(m.group(1) or m.group(2)); i+=m.end(); continue
    i+=1
print(len(keys))
PY
```

## The changelog is history, not a claim

`index.html` carries `<details class="anim-x" id="changelog">` — the "Recently
updated" panel. Its entries are **dated statements about what shipped when**:

> **Jul 2026** — New **Practice Lab**: 12 hands-on scenario challenges …
> **Jun 2026** — … "Animation, explained" panels on all 24 diagrams …

**These are not live claims and must be excluded from every count guard.** Binding
them to the current count would force rewriting the changelog on every addition and
would turn a historically accurate sentence into a build failure.

This corrects an earlier version of this document, which listed the changelog
alongside the live claim sites. `tests/e2e/content-currency.spec.js` now strips the
block before matching, and asserts the block is still findable so the exclusion
cannot silently become a no-op.

## Claim sites that must move together

### Section count — SIX sites, all live

| Site | Form |
| --- | --- |
| `index.html:7` | meta description, `41 sections` |
| `index.html:11` | `og:description`, `41 deep-dive sections` |
| `index.html:19` | `twitter:description`, `41 deep-dive sections` |
| `index.html:348` | hero stat, **`<b>41</b><span>deep-dive sections</span>`** |
| `index.html:366` | ring fallback, `<b>0 / 41</b> sections mastered` |
| `README.md:8` | `41 deep‑dive sections` (U+2011 non-breaking hyphen) |

`index.html:348` splits the number from the words across two elements, so a regex
over raw markup **walks straight past it**. `content-counts.spec.js` reads
`body.innerText` for exactly this reason — its own comment records that a stale `37`
survived the first version of that test. Verify with rendered text, never `grep`.

### Diagram count — FOUR live sites, currently unguarded

| Site | Form |
| --- | --- |
| `index.html:7` | `24 animated & explained diagrams` |
| `index.html:11` | `24 animated & explained diagrams` |
| `index.html:19` | `24 animated diagrams` |
| `README.md:9` | `24 animated "Why it matters" architecture diagrams` |

Plus one in the changelog (`24 diagrams`, no "animated") which is **history and must
be excluded**.

Nothing in the suite guards this today. A guard whose regex requires the literal word
`animated` after the number would also miss the changelog line — which is harmless
now that the changelog is excluded by design, but the regex should still be
`/(\d+)\s+(?:animated[^.]{0,40}?)?diagrams?\b/gi` so a future live claim without the
word is caught.

### Lab-challenge count — ONE live site

`README.md:12` (`12 hands‑on scenario challenges`, **U+2011** — preserve it). The
`index.html` occurrence is inside the changelog and is excluded.

**The six pinned `12` assertions are gone.** PR #29 replaced them with a value derived
from `window.LAB.length` via `tests/helpers/lab.js`, and turned the one genuine
content claim into a claim-vs-actual drift guard. `tests/e2e/persisted-state.spec.js`
still contains `toBe(12)` but it is `s.exam.best` — unrelated, do not touch.

### Test-total mirrors — THREE places

Raising `totalMinimum` in `scripts/expected-tests.json` silently obligates:

| File | Form |
| --- | --- |
| `docs/roadmap/index.html` | `96 passing` |
| `docs/roadmap/index.html` | `96 passed` |
| `docs/CURRENT_STATE.md` | the `\| Tests \|` row |

`tests/e2e/roadmap-dashboard.spec.js` reads `expected-tests.json` and asserts the
dashboard text matches. Leaving the dashboard behind fails the gate — it did, once,
during PR #28.

## Runtime shapes that generated briefs got wrong

| Claim | Truth | Evidence |
| --- | --- | --- |
| Lab choice items use `opts` | **`options`** | `item.options.forEach(...)` in the Lab renderer |
| Lab `accept` is case-sensitive | case-**insensitive** | `norm(a).toLowerCase()===v.toLowerCase()` |
| `window.__labValidate` honours `accept` | passes `accept:null` | a `cmd` challenge relying on `accept` alone **needs a `LAB_VALIDATORS` entry** |
| `QUIZ` has 22 keys | **36** | above |
| `.diagram` / `.anim-x` / `role=img` are a clean 1:1:1 at 24 | 24 / **25** / 24 | above |
| `check-static` rejects `a.href = SRC[k].url` | it does **not** | the AST rule fires only on an external **string literal** in the assigned expression |

Shipping `opts` renders no options and breaks the challenge **silently** — nothing in
`check-static.mjs` or the Lab specs asserts the field name.

## Gate rules that cannot be weakened

`scripts/check-static.mjs` exits 1 on: an inline `<script>` that does not parse;
unbalanced `<section> <table> <tr> <td> <div> <ol> <ul> <li> <strong> <code>`;
**any duplicate element id across the whole file**; a `\U0001…` escape artifact; a JS
variable bound to `top`; any external subresource; any workflow action not pinned to a
40-hex SHA; any `continue-on-error` or `|| true`.

`scripts/check-citations.mjs` (added in #28) additionally rejects: a registry that is
not a pure literal, a schema violation, a dangling or orphaned source key, a non-https
/ credentialed / off-allowlist URL, and an invalid or future `MODEL_FACTS_VERIFIED_AT`.

`<a href="https://…">` in prose is fine. An `<img>`, `<iframe>`, `<link>` or `fetch()`
is not.

**Duplicate ids are the sharpest edge in this programme.** The Lab renderer does
`card.id=item.id`, so every `LAB` id becomes a live DOM id at runtime.
`check-static.mjs` reads the HTML source only, so a duplicate `LAB` id **passes the
gate green and lands as a product defect**.

## Stale artefacts (pre-existing, owned by PR 6)

| Artefact | State | Guarded? |
| --- | --- | --- |
| `og.png` | mtime 2026-07-12. `docs/audits/SOL_INDEPENDENT_REVIEW_2026-07-28.md` records "Card says 39 sections while metadata says 40" | no — no test reads binaries |
| `CLAUDE.md` | states the ring is "currently 41" and the Lab has "12 hands-on scenario challenges" | partially |
| `docs/NOTION_SYNC.md` | records "78 tests, `main` `dc206273`" against a real **96** / `21798dc` | no — nothing reads it |
