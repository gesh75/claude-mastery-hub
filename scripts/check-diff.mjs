#!/usr/bin/env node
/**
 * Diff integrity gate.
 *
 * `git diff --check` against a clean working tree compares the index to the
 * worktree, finds nothing, and exits 0 — it verifies nothing. This resolves an
 * explicit commit range for the event being built and checks that range.
 *
 * The range is never silently rewritten. Each event has one correct range, and
 * if it cannot be resolved the gate fails closed rather than checking some
 * other, more convenient range:
 *
 *   pull_request  merge-base(base.sha, tested) .. tested
 *                 Both endpoints must be 40-hex and present locally. An
 *                 unresolvable base is a hard failure, never the empty tree.
 *                 The range must be non-empty.
 *
 *   push          event.before .. event.after, exactly. No merge-base — a force
 *                 push or rewind must still compare the old tree to the new
 *                 one, and a merge-base would collapse that to nothing. An
 *                 all-zero `before` (branch creation) uses the empty tree; a
 *                 nonzero `before` that is missing locally is a hard failure,
 *                 never HEAD^. GITHUB_SHA, when set, must equal event.after.
 *
 *   dispatch/local  first parent of the tested commit .. tested. The empty tree
 *                 is used only for a true root commit.
 *
 * Two different commits with identical trees legitimately report zero changed
 * files; that passes with an explicit note. It is reported only because the
 * exact range was checked, never because the range was replaced.
 *
 * Event data is read from GITHUB_EVENT_PATH as JSON. Revisions are passed to
 * git as argv entries with shell:false, after `--end-of-options`, and diffs use
 * `--` to separate revisions from paths, so no value can become a git option
 * and no branch name or PR title ever reaches a shell.
 *
 * Override locally with --from <rev> --to <rev>.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const SHA40 = /^[0-9a-fA-F]{40}$/;
const ZERO40 = /^0{40}$/;

function die(title, lines = []) {
  console.error(`\nFAIL: ${title}`);
  for (const l of lines) console.error(`  ${l}`);
  process.exit(1);
}

/** Run git with argv (never a shell string). */
function git(args, { allowFail = false } = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', shell: false });
  if (r.error) die(`could not run git: ${r.error.message}`);
  if (r.status !== 0 && !allowFail) {
    die(`git ${args.join(' ')} exited ${r.status}`, [(r.stderr || '').trim()]);
  }
  return { status: r.status, out: (r.stdout ?? '').trim(), err: (r.stderr ?? '').trim() };
}

const commitExists = (sha) =>
  SHA40.test(sha) &&
  !ZERO40.test(sha) &&
  git(['cat-file', '-e', `${sha}^{commit}`], { allowFail: true }).status === 0;

/** Validate a SHA that came from the event payload. */
function requireSha(value, label, { allowZero = false } = {}) {
  if (typeof value !== 'string' || value.length === 0) {
    die(`${label} is missing from the event payload`, [
      'The range cannot be resolved, so the check fails closed rather than inspecting a different range.'
    ]);
  }
  if (!SHA40.test(value)) {
    die(`${label} is not an exact 40-character hexadecimal commit id`, [`got: ${JSON.stringify(value.slice(0, 80))}`]);
  }
  if (ZERO40.test(value) && !allowZero) {
    die(`${label} is the all-zero SHA, which is not valid here`);
  }
  return value.toLowerCase();
}

/** Resolve a user-supplied revision safely to a full commit SHA. */
function resolveUserRev(input, label) {
  if (typeof input !== 'string' || input.length === 0) die(`${label} is empty`);
  // Defence in depth: --end-of-options already prevents option interpretation,
  // but refuse the shape outright so intent is unambiguous.
  if (input.startsWith('-')) {
    die(`${label} may not begin with "-"`, [
      `got: ${JSON.stringify(input)}`,
      'A revision starting with "-" would be an attempt to smuggle a git option.'
    ]);
  }
  const r = git(['rev-parse', '--verify', '--quiet', '--end-of-options', `${input}^{commit}`], { allowFail: true });
  if (r.status !== 0 || !SHA40.test(r.out)) {
    die(`${label} could not be resolved to a commit`, [`got: ${JSON.stringify(input)}`]);
  }
  return r.out.toLowerCase();
}

function readEvent() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    die(`GITHUB_EVENT_PATH could not be read or parsed: ${err.message}`, [
      'Refusing to guess a range from an unreadable event payload.'
    ]);
  }
}

// --- resolve the range -------------------------------------------------------
const argv = process.argv.slice(2);
const argOf = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] !== undefined ? argv[i + 1] : null;
};

const eventName = process.env.GITHUB_EVENT_NAME ?? 'local';
const rawFrom = argOf('--from');
const rawTo = argOf('--to');

let from;
let to;
let mode;
let requireChanges = false;
let emptyRangeNote = 'nothing to check for this event';

if (rawFrom !== null || rawTo !== null) {
  if (rawFrom === null || rawTo === null) {
    die('--from and --to must be supplied together');
  }
  from = resolveUserRev(rawFrom, '--from');
  to = resolveUserRev(rawTo, '--to');
  mode = 'explicit --from/--to (exact range, no merge-base)';
} else if (eventName === 'pull_request' || eventName === 'pull_request_target') {
  const event = readEvent();
  const base = requireSha(event?.pull_request?.base?.sha, 'pull_request.base.sha');
  const tested = requireSha(process.env.GITHUB_SHA || event?.pull_request?.head?.sha, 'tested commit (GITHUB_SHA)');

  if (!commitExists(base)) {
    die('the pull-request base commit is not present locally', [
      `base: ${base}`,
      'Checkout must use fetch-depth: 0 so the base is available.',
      'Refusing to substitute the empty tree, which would silently change what is inspected.'
    ]);
  }
  if (!commitExists(tested)) {
    die('the tested commit is not present locally', [`tested: ${tested}`]);
  }

  // merge-base applies to the pull-request path only: it keeps the range to
  // what this branch introduced when the base branch has moved on.
  const mb = git(['merge-base', '--end-of-options', base, tested], { allowFail: true });
  if (mb.status !== 0 || !SHA40.test(mb.out)) {
    die('no merge base between the pull-request base and the tested commit', [
      `base: ${base}`,
      `tested: ${tested}`,
      'Unrelated histories cannot produce a meaningful branch-introduced range.'
    ]);
  }
  from = mb.out.toLowerCase();
  to = tested;
  mode = 'pull_request: merge-base(base.sha, tested) .. tested';
  requireChanges = true;
} else if (eventName === 'push') {
  const event = readEvent();
  const before = requireSha(event?.before, 'push event.before', { allowZero: true });
  const after = requireSha(event?.after, 'push event.after');

  const ghSha = process.env.GITHUB_SHA;
  if (ghSha && ghSha.toLowerCase() !== after) {
    die('GITHUB_SHA does not match push event.after', [
      `GITHUB_SHA:   ${ghSha}`,
      `event.after:  ${after}`,
      'These must agree; a mismatch means the checked-out tree is not the pushed tree.'
    ]);
  }
  if (!commitExists(after)) {
    die('the pushed commit (event.after) is not present locally', [`after: ${after}`]);
  }

  if (ZERO40.test(before)) {
    from = EMPTY_TREE;
    mode = 'push: branch creation, empty tree .. event.after (exact)';
    emptyRangeNote = 'branch creation introduced no content';
  } else {
    if (!commitExists(before)) {
      die('the previous pushed commit (event.before) is not present locally', [
        `before: ${before}`,
        'Checkout must use fetch-depth: 0.',
        'Refusing to fall back to HEAD^ or any other commit: that would check a different range',
        'and could hide everything a force push replaced.'
      ]);
    }
    from = before;
    // Deliberately no merge-base here. On a force push or rewind the merge-base
    // of before/after is an ancestor of both, which would drop exactly the
    // content the rewrite replaced.
    mode = 'push: event.before .. event.after (exact, no merge-base)';
    emptyRangeNote = 'the two commits have identical trees';
  }
  to = after;
} else {
  const tested = process.env.GITHUB_SHA
    ? requireSha(process.env.GITHUB_SHA, 'GITHUB_SHA')
    : resolveUserRev('HEAD', 'HEAD');
  if (!commitExists(tested)) die('the tested commit is not present locally', [`tested: ${tested}`]);
  to = tested;

  const parent = git(['rev-parse', '--verify', '--quiet', '--end-of-options', `${tested}^`], { allowFail: true });
  if (parent.status === 0 && SHA40.test(parent.out)) {
    from = parent.out.toLowerCase();
    mode = `${eventName}: first parent of the tested commit .. tested`;
  } else {
    from = EMPTY_TREE;
    mode = `${eventName}: root commit, empty tree .. tested`;
  }
}

const show = (rev) => (rev === EMPTY_TREE ? `empty tree (${EMPTY_TREE.slice(0, 12)}…)` : rev);
console.log(`diff range (${mode})`);
console.log(`  from: ${show(from)}`);
console.log(`  to:   ${to}`);

// --- inspect the range -------------------------------------------------------
const names = git(['diff', '--name-only', '--end-of-options', from, to, '--'], { allowFail: true });
if (names.status !== 0) {
  die('could not diff the resolved range', [names.err || `git exited ${names.status}`]);
}
const changed = names.out ? names.out.split('\n').filter(Boolean) : [];
console.log(`  files changed: ${changed.length}`);

if (changed.length === 0) {
  if (requireChanges) {
    die('the resolved pull-request range contains no changed files', [
      'A pull request always changes something, so an empty range means the range was resolved',
      'incorrectly and this check would pass without inspecting anything.',
      'Confirm the workflow checks out with fetch-depth: 0.'
    ]);
  }
  console.log(`note: exact range is empty — ${emptyRangeNote}`);
  console.log('\nOK: diff integrity check passed (exact range verified, no content to inspect)');
  process.exit(0);
}

const check = git(['diff', '--check', '--end-of-options', from, to, '--'], { allowFail: true });
if (check.status !== 0 || check.out) {
  console.error('\nFAIL: whitespace or conflict-marker errors in the changed range:');
  console.error(check.out || check.err);
  process.exit(1);
}

console.log(`\nOK: diff integrity check passed (${changed.length} file(s) inspected)`);
