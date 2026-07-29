#!/usr/bin/env node
/**
 * Anti-vacuity guard for the Playwright run.
 *
 * A green suite is only meaningful if it actually executed the tests it claims
 * to. This reads the JSON report and fails on every way a run can look
 * successful while having verified nothing:
 *
 *   - the report is missing or unparseable (the run produced no results)
 *   - the baseline is missing, malformed, or internally incoherent
 *   - fewer tests ran than the committed baseline, in total or for any spec
 *   - the report mentions a spec file the baseline does not list (a new spec
 *     must not sit unprotected behind a healthy total)
 *   - any test was skipped (skips are invisible in a green summary)
 *   - any test needed a retry (retries exist to expose flakiness, not hide it;
 *     this app is a static single file with no network, so a flake is a bug)
 *   - any test did not finish in its expected state
 *
 * Spec identity is the repository-relative POSIX path, never the basename, so
 * two specs sharing a filename in different directories cannot mask each
 * other's disappearance.
 *
 * Exit code 1 fails the job. There is deliberately no "warn only" mode.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const REPORT = process.argv[2] ?? 'test-results/results.json';
const BASELINE = process.argv[3] ?? 'scripts/expected-tests.json';

const failures = [];
const note = (m) => console.log(m);
const die = (lines) => {
  console.error(`\nFAIL: anti-vacuity check\n${lines.map((l) => `  - ${l}`).join('\n')}`);
  process.exit(1);
};

/** Repository-relative POSIX path, from a report entry that may be relative to rootDir or absolute. */
function normalizeSpecPath(file, rootDir) {
  if (!file) return 'unknown';
  const abs = path.isAbsolute(file) ? file : path.resolve(rootDir ?? process.cwd(), file);
  return path.relative(process.cwd(), abs).split(path.sep).join('/');
}

/** Playwright nests suites arbitrarily deep; flatten to a list of test records. */
function collect(suites, rootDir, inherited, out = []) {
  for (const suite of suites ?? []) {
    const file = suite.file ?? inherited;
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        out.push({
          file: normalizeSpecPath(spec.file ?? file, rootDir),
          title: spec.title,
          status: t.status,
          resultCount: (t.results ?? []).length
        });
      }
    }
    collect(suite.suites, rootDir, file, out);
  }
  return out;
}

// --- baseline: must exist, parse, and be internally coherent -----------------
let baseline;
try {
  baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
} catch (err) {
  die([
    `anti-vacuity baseline ${BASELINE} is missing or unparseable: ${err.message}`,
    'Without a baseline this check cannot prove the suite did not shrink, so it fails closed.'
  ]);
}

const isPositiveInt = (v) => Number.isInteger(v) && v > 0;
const baseErrors = [];
if (!baseline || typeof baseline !== 'object' || Array.isArray(baseline)) {
  baseErrors.push(`${BASELINE} must contain a JSON object`);
} else {
  if (!isPositiveInt(baseline.totalMinimum)) {
    baseErrors.push(`totalMinimum must be a positive integer, got ${JSON.stringify(baseline.totalMinimum)}`);
  }
  const per = baseline.perFileMinimum;
  if (!per || typeof per !== 'object' || Array.isArray(per) || Object.keys(per).length === 0) {
    baseErrors.push('perFileMinimum must be a non-empty object of "path": count');
  } else {
    const seen = new Map();
    for (const [file, count] of Object.entries(per)) {
      if (!isPositiveInt(count)) {
        baseErrors.push(`perFileMinimum["${file}"] must be a positive integer, got ${JSON.stringify(count)}`);
      }
      const norm = file.split(path.sep).join('/').replace(/^\.\//, '');
      if (seen.has(norm)) baseErrors.push(`duplicate normalized path in perFileMinimum: ${norm}`);
      seen.set(norm, count);
    }
    const sum = Object.values(per).filter(isPositiveInt).reduce((a, b) => a + b, 0);
    if (isPositiveInt(baseline.totalMinimum) && baseline.totalMinimum < sum) {
      baseErrors.push(
        `incoherent baseline: totalMinimum ${baseline.totalMinimum} is below the sum of perFileMinimum (${sum})`
      );
    }
  }
}
if (baseErrors.length) die(baseErrors);

const expected = new Map(
  Object.entries(baseline.perFileMinimum).map(([f, c]) => [f.split(path.sep).join('/').replace(/^\.\//, ''), c])
);

// --- report: must exist, parse, and contain tests ----------------------------
let report;
try {
  report = JSON.parse(await readFile(REPORT, 'utf8'));
} catch (err) {
  die([
    `could not read the Playwright JSON report at ${REPORT}: ${err.message}`,
    'A run that produced no report has verified nothing.'
  ]);
}

const rootDir = report?.config?.rootDir;
const tests = collect(report.suites, rootDir);
if (tests.length === 0) die(['the report contains zero tests']);

// --- totals ------------------------------------------------------------------
note(`tests executed: ${tests.length} (baseline minimum ${baseline.totalMinimum})`);
if (tests.length < baseline.totalMinimum) {
  failures.push(
    `only ${tests.length} tests ran, baseline minimum is ${baseline.totalMinimum} — tests stopped being collected`
  );
}

// --- per-spec counts, keyed by full path ------------------------------------
const observed = new Map();
for (const t of tests) observed.set(t.file, (observed.get(t.file) ?? 0) + 1);

for (const [file, min] of expected) {
  const got = observed.get(file) ?? 0;
  note(`  ${file}: ${got} (minimum ${min})`);
  if (got < min) failures.push(`${file}: ${got} tests ran, expected at least ${min}`);
}

// A spec the baseline does not know about is unprotected: it could be deleted
// later and the total alone might still pass. Reject it until it is listed.
for (const [file, count] of observed) {
  if (!expected.has(file)) {
    failures.push(
      `spec file "${file}" ran ${count} test(s) but is not in ${BASELINE} — ` +
        `add "${file}": ${count} to perFileMinimum and raise totalMinimum, otherwise this spec is unprotected`
    );
  }
}

// --- per-test states ---------------------------------------------------------
const skipped = tests.filter((t) => t.status === 'skipped');
if (skipped.length) {
  failures.push(`${skipped.length} test(s) skipped: ${skipped.map((t) => t.title).join('; ')}`);
}

const flaky = tests.filter((t) => t.status === 'flaky' || t.resultCount > 1);
if (flaky.length) {
  failures.push(
    `${flaky.length} test(s) needed a retry: ${flaky.map((t) => t.title).join('; ')} — ` +
      'this suite is deterministic, so a retry indicates a real defect'
  );
}

const bad = tests.filter((t) => !['expected', 'skipped', 'flaky'].includes(t.status));
if (bad.length) {
  failures.push(`${bad.length} test(s) did not pass: ${bad.map((t) => `${t.title} [${t.status}]`).join('; ')}`);
}

if (failures.length) die(failures);
note('OK: test-result integrity check passed');
