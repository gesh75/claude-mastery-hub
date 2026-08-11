#!/usr/bin/env node
/**
 * Mutation harness — proves the gate can tell a broken product from a correct one.
 *
 * `docs/CURRENT_STATE.md` named this the last open risk, in its own words:
 *
 *   "Nothing in the gate detects a test that executes but asserts nothing. The
 *    anti-vacuity checks prove the suite *ran*; they cannot prove it *verified*."
 *
 * check-test-results.mjs proves the suite ran what it claims. check-static.mjs and
 * check-citations.mjs prove structural and citation integrity. None of them can tell
 * an asserting test from an empty one: `expect(x).toBe(x)` passes every gate we have.
 *
 * So this inverts the question. Break the product on purpose, run the check that
 * claims to guard it, and require that check to FAIL. A mutation nothing kills is a
 * coverage hole with a name and a line number.
 *
 * That is not hypothetical here. Writing this found a real one: `correct: 99` on a
 * four-option Practice Lab challenge left all 168 tests green, because three specs
 * bounds-checked `correct` but each only over its own hardcoded id list. A reader
 * would have met a question where no answer they picked could ever be right.
 *
 * DESIGN NOTES
 *
 * - **No `knownSurvives` exception list.** Every mutation must be killed. A harness
 *   carrying a list of failures it forgives drifts into forgiving everything; if a
 *   mutant survives, either fix the gap or delete the mutation and say why.
 * - **Restore never uses `git checkout`.** It restores from an in-memory snapshot in
 *   a `finally`, plus exit/signal handlers. `git checkout <file>` discards *uncommitted*
 *   work, which cost this repo real content twice during the cookbook-tracks programme.
 * - **Anchors are verified before anything is written.** Each op declares how many
 *   times its `find` string must occur; a mismatch aborts as a stale mutation rather
 *   than editing the wrong occurrence. A 715KB single file makes that failure easy.
 * - **Targeted, not exhaustive.** Each mutation names the check expected to kill it, so
 *   only that check runs. Running the full suite per mutation would be minutes each.
 *
 * Usage:
 *   node scripts/mutation.mjs              # whole catalogue
 *   node scripts/mutation.mjs --only M-03  # one mutation
 *   node scripts/mutation.mjs --list       # print the catalogue, mutate nothing
 *
 * Exit 0 only when every mutation was killed.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const file = (p) => `${ROOT}${p}`;

/*
 * Deliberately NOT in the catalogue: quietly lowering a perFileMinimum in
 * scripts/expected-tests.json. It survives, but by design -- the baseline file is
 * a committed artifact and lowering a value is a visible diff whose justification
 * the PR body is required to carry. That is a human review gate, not a machine
 * one, so a "surviving mutant" there would be noise. Per the no-exception-list
 * rule above: deleted with a reason rather than forgiven by a flag.
 */

/**
 * killer kinds:
 *   'script'    — spawn a gate script; killed when it exits non-zero
 *   'playwright'— run one spec file; killed when it fails
 */
const CATALOGUE = [
  {
    id: 'M-01',
    what: 'A visible section count drifts from the mastery-tracked reality',
    ops: [{ path: 'index.html', find: '<b>43</b><span>deep-dive sections</span>', replace: '<b>41</b><span>deep-dive sections</span>', count: 1 }],
    killer: { kind: 'playwright', spec: 'tests/e2e/content-counts.spec.js' }
  },
  {
    id: 'M-02',
    what: 'A duplicate element id is introduced',
    ops: [{ path: 'index.html', find: '<div class="ring-meta" id="ringmeta">', replace: '<div class="ring-meta" id="ringmeta"></div><div class="ring-meta" id="ringmeta">', count: 1 }],
    killer: { kind: 'script', cmd: ['node', 'scripts/check-static.mjs'] }
  },
  {
    id: 'M-03',
    what: 'A registry fact cites a source key that does not exist',
    ops: [{ path: 'index.html', find: "source:'managedAgentsEnvironments'", replace: "source:'ghostDocs'", count: 1 }],
    killer: { kind: 'script', cmd: ['node', 'scripts/check-citations.mjs'] }
  },
  {
    id: 'M-04',
    what: 'A verification date is an impossible calendar date',
    ops: [{ path: 'index.html', find: "var WORKFLOW_FACTS_VERIFIED_AT='2026-08-09'", replace: "var WORKFLOW_FACTS_VERIFIED_AT='2026-02-31'", count: 1 }],
    killer: { kind: 'script', cmd: ['node', 'scripts/check-citations.mjs'] }
  },
  {
    id: 'M-05',
    what: 'A real network call is injected into the offline page',
    ops: [{ path: 'index.html', find: '</body>', replace: '<script>fetch("https://example.com/x");</script></body>', count: 1 }],
    killer: { kind: 'script', cmd: ['node', 'scripts/check-static.mjs'] }
  },
  {
    id: 'M-06',
    what: 'A Practice Lab choice item points at an option that does not exist',
    ops: [{ path: 'index.html', find: 'correct:0,sol:"Context editing"', replace: 'correct:99,sol:"Context editing"', count: 1 }],
    killer: { kind: 'playwright', spec: 'tests/e2e/practice-lab-validation.spec.js' }
  },
  {
    id: 'M-07',
    what: 'Two Practice Lab items share an id — invisible to check-static, breaks solved state at runtime',
    ops: [{ path: 'index.html', find: 'id:"lab-madvisor"', replace: 'id:"lab-budget"', count: 1 }],
    killer: { kind: 'playwright', spec: 'tests/e2e/practice-lab-validation.spec.js' }
  },
  {
    id: 'M-08',
    what: 'The SECTION ordinal sequence gains a duplicate',
    ops: [{ path: 'index.html', find: '<div class="sec-num">SECTION 18</div>', replace: '<div class="sec-num">SECTION 17</div>', count: 1 }],
    killer: { kind: 'playwright', spec: 'tests/e2e/managed-agents.spec.js' }
  },
  {
    id: 'M-09',
    what: 'A decorative section icon is exposed to assistive technology',
    ops: [{ path: 'index.html', find: '<div class="sec-icon" aria-hidden="true">\u{1F4CA}</div>', replace: '<div class="sec-icon">\u{1F4CA}</div>', count: 1 }],
    killer: { kind: 'playwright', spec: 'tests/e2e/content-counts.spec.js' }
  },
  {
    id: 'M-10',
    what: 'The social card advertises a stale section count',
    ops: [{ path: 'og.meta.json', find: '"sections": 43', replace: '"sections": 39', count: 1 }],
    killer: { kind: 'playwright', spec: 'tests/e2e/content-counts.spec.js' }
  },
  {
    id: 'M-11',
    what: 'A model fact loses the registry rendering that feeds the DOM',
    ops: [{ path: 'index.html', find: "availabilityNote:'Opus 4.8 remains available',", replace: '', count: 1 }],
    killer: { kind: 'playwright', spec: 'tests/e2e/model-registry-rendering.spec.js' }
  }
];

// --- argv --------------------------------------------------------------------
const argv = process.argv.slice(2);
const only = argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : null;
if (argv.includes('--list')) {
  for (const m of CATALOGUE) console.log(`${m.id}  ${m.what}`);
  process.exit(0);
}
const selected = only ? CATALOGUE.filter((m) => m.id === only) : CATALOGUE;
if (only && !selected.length) {
  console.error(`no mutation with id ${only}`);
  process.exit(2);
}

// --- safe apply / restore ----------------------------------------------------
// Never `git checkout`: it discards uncommitted work. Snapshot in memory, restore
// in a finally, and also on abnormal exit so a Ctrl-C cannot leave the tree dirty.
let live = null;
const restore = () => {
  if (!live) return;
  for (const [path, original] of live) writeFileSync(file(path), original);
  live = null;
};
process.on('exit', restore);
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    restore();
    process.exit(130);
  });
}

function apply(ops) {
  const snapshot = new Map();
  for (const op of ops) snapshot.set(op.path, readFileSync(file(op.path), 'utf8'));
  live = snapshot;

  for (const op of ops) {
    const before = readFileSync(file(op.path), 'utf8');
    const found = before.split(op.find).length - 1;
    if (found !== op.count) {
      throw new Error(
        `stale mutation: expected ${op.count} occurrence(s) of the anchor in ${op.path}, found ${found}`
      );
    }
    const after = before.replace(op.find, op.replace);
    if (after === before) throw new Error(`mutation changed nothing in ${op.path}`);
    writeFileSync(file(op.path), after);
  }
}

function runKiller(killer) {
  const cmd =
    killer.kind === 'script'
      ? killer.cmd
      : ['npx', 'playwright', 'test', killer.spec, '--retries=0', '--reporter=line'];
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd: ROOT, encoding: 'utf8' });
  return res.status ?? 1;
}

// --- run ---------------------------------------------------------------------
console.log(`mutation harness: ${selected.length} mutation(s)\n`);
const survivors = [];
let killed = 0;

for (const m of selected) {
  process.stdout.write(`${m.id}  ${m.what}\n`);
  let status;
  try {
    apply(m.ops);
    // The harness's own anti-vacuity guard: prove the file really changed before
    // trusting any verdict from the check below.
    for (const op of m.ops) {
      const now = readFileSync(file(op.path), 'utf8');
      if (now.includes(op.find) && op.replace !== '' && !op.replace.includes(op.find)) {
        throw new Error(`self-check: ${op.path} still contains the original anchor after apply`);
      }
    }
    status = runKiller(m.killer);
  } finally {
    restore();
  }

  const target = m.killer.kind === 'script' ? m.killer.cmd.join(' ') : m.killer.spec;
  if (status !== 0) {
    killed += 1;
    console.log(`      KILLED by ${target}\n`);
  } else {
    survivors.push({ ...m, target });
    console.log(`      SURVIVED — ${target} passed on a broken product\n`);
  }
}

console.log(`${killed}/${selected.length} killed`);
if (survivors.length) {
  console.error('\nSURVIVING MUTANTS — each is a coverage hole:');
  for (const s of survivors) console.error(`  ${s.id}  ${s.what}\n        ${s.target} did not fail`);
  process.exit(1);
}
console.log('OK: every mutation was killed');
