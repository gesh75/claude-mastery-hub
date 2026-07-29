#!/usr/bin/env node
/**
 * Diff integrity gate.
 *
 * `git diff --check` against a clean working tree compares the index to the
 * worktree, finds nothing, and exits 0 — it verifies nothing at all. This
 * resolves an explicit commit range for the event being built and checks that
 * range, so the result is meaningful.
 *
 * Range selection:
 *   pull_request     base.sha .. tested head (GITHUB_SHA, the merge commit)
 *   push             event.before .. event.after
 *   workflow_dispatch / anything else, and local runs
 *                    first parent of HEAD .. HEAD, or the empty tree for a
 *                    root commit
 *
 * Degenerate history is handled explicitly: an all-zero `before` (branch
 * creation), a root commit with no parent, and a `before` that is not present
 * locally all fall back to git's empty-tree object so the range stays valid.
 *
 * Event data is read from the GITHUB_EVENT_PATH JSON and passed to git as
 * argv entries with shell: false. No branch name, PR title, or other
 * attacker-controlled string is ever interpolated into a shell command.
 *
 * Override locally with --from <rev> --to <rev>.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const ZERO = /^0{40,}$/;

/** Run git with argv (never a shell string). */
function git(args, { allowFail = false } = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', shell: false });
  if (r.error) {
    console.error(`FAIL: could not run git: ${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0 && !allowFail) {
    console.error(`FAIL: git ${args.join(' ')} exited ${r.status}\n${(r.stderr || '').trim()}`);
    process.exit(1);
  }
  return { status: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

const exists = (rev) => !!rev && !ZERO.test(rev) && git(['cat-file', '-e', `${rev}^{commit}`], { allowFail: true }).status === 0;

function readEvent() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    console.error(`WARN: could not read GITHUB_EVENT_PATH (${err.message}); falling back to HEAD range`);
    return {};
  }
}

/** first parent of HEAD, or the empty tree for a root commit */
function parentOfHead() {
  const r = git(['rev-parse', '--verify', '--quiet', 'HEAD^'], { allowFail: true });
  return r.status === 0 && r.out ? r.out : EMPTY_TREE;
}

// --- resolve the range -------------------------------------------------------
const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};

const eventName = process.env.GITHUB_EVENT_NAME ?? 'local';
const event = readEvent();

let from = argOf('--from');
let to = argOf('--to');
let source = 'explicit --from/--to';
let requireChanges = false;

if (!from || !to) {
  if (eventName === 'pull_request' || eventName === 'pull_request_review') {
    from = event?.pull_request?.base?.sha;
    to = process.env.GITHUB_SHA || event?.pull_request?.head?.sha;
    source = 'pull_request: base.sha .. tested head';
    requireChanges = true; // a PR with an empty range means range resolution broke
  } else if (eventName === 'push') {
    from = event?.before;
    to = event?.after || process.env.GITHUB_SHA;
    source = 'push: event.before .. event.after';
  } else {
    to = process.env.GITHUB_SHA || 'HEAD';
    from = null;
    source = `${eventName}: parent of HEAD .. HEAD`;
  }
}

if (!to || !exists(to)) {
  const head = git(['rev-parse', 'HEAD']).out;
  console.log(`note: head "${to ?? '(unset)'}" unavailable locally, using HEAD ${head.slice(0, 12)}`);
  to = head;
}

if (!from || ZERO.test(from) || !exists(from)) {
  const why = !from ? 'not provided' : ZERO.test(from) ? 'all-zero (branch creation)' : 'not present locally';
  const fallback = eventName === 'push' || eventName === 'local' || !from ? parentOfHead() : EMPTY_TREE;
  // For a root commit parentOfHead() already returns the empty tree.
  from = fallback;
  console.log(`note: base ${why}; falling back to ${from === EMPTY_TREE ? 'the empty tree' : from.slice(0, 12)}`);
}

// A merge-base keeps the range to "what this branch added" even when the base
// branch has moved on. Fall back to the raw base when there is no common
// ancestor (unrelated histories, empty tree).
if (from !== EMPTY_TREE) {
  const mb = git(['merge-base', from, to], { allowFail: true });
  if (mb.status === 0 && mb.out) from = mb.out;
}

console.log(`diff range (${source})`);
console.log(`  from: ${from === EMPTY_TREE ? 'empty tree' : from}`);
console.log(`  to:   ${to}`);

// --- the range must actually contain something ------------------------------
const names = git(['diff', '--name-only', from, to], { allowFail: true });
const changed = names.out ? names.out.split('\n').filter(Boolean) : [];
console.log(`  files changed: ${changed.length}`);

if (changed.length === 0) {
  if (requireChanges) {
    console.error(
      '\nFAIL: the resolved pull-request range contains no changed files.\n' +
        '  A pull request always changes something, so an empty range means the range was\n' +
        '  resolved incorrectly and this check would pass without inspecting anything.\n' +
        '  Confirm the workflow checks out with fetch-depth: 0.'
    );
    process.exit(1);
  }
  console.log('note: empty range; nothing to check for this event');
  console.log('\nOK: diff integrity check passed');
  process.exit(0);
}

// --- whitespace / conflict-marker errors in that range ----------------------
const check = git(['diff', '--check', from, to], { allowFail: true });
if (check.status !== 0 || check.out) {
  console.error('\nFAIL: whitespace or conflict-marker errors in the changed range:');
  console.error(check.out || check.err);
  process.exit(1);
}

console.log(`\nOK: diff integrity check passed (${changed.length} file(s) inspected)`);
