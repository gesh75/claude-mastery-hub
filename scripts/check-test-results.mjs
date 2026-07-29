#!/usr/bin/env node
/**
 * Anti-vacuity guard for the Playwright run.
 *
 * A green suite is only meaningful if it actually executed the tests it claims
 * to. This script reads the JSON report and fails the build on every way a run
 * can look successful while having verified nothing:
 *
 *   - the report is missing or unparseable (the run never produced results)
 *   - fewer tests ran than the committed baseline (a spec file or describe
 *     block silently stopped being collected)
 *   - any test was skipped (skips are invisible in a green summary)
 *   - any test needed a retry (retries exist to expose flakiness, not hide it;
 *     this app is a static single file with no network, so a flake is a bug)
 *   - any test did not finish in its expected state
 *
 * Exit code 1 fails the job. There is deliberately no "warn only" mode.
 */
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const REPORT = process.argv[2] ?? 'test-results/results.json';
const BASELINE = 'scripts/expected-tests.json';

const fail = [];
const note = (m) => console.log(m);

/** Playwright nests suites arbitrarily deep; flatten to a list of test records. */
function collect(suites, file, out = []) {
  for (const suite of suites ?? []) {
    const f = suite.file ?? file;
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        out.push({
          file: basename(f ?? 'unknown'),
          title: spec.title,
          status: t.status,
          results: t.results ?? []
        });
      }
    }
    collect(suite.suites, f, out);
  }
  return out;
}

let report;
try {
  report = JSON.parse(await readFile(REPORT, 'utf8'));
} catch (err) {
  console.error(`FAIL: could not read the Playwright JSON report at ${REPORT}`);
  console.error(`      ${err.message}`);
  console.error('      A run that produced no report has verified nothing.');
  process.exit(1);
}

const baseline = JSON.parse(await readFile(BASELINE, 'utf8'));
const tests = collect(report.suites);

// --- did anything run at all? ---
if (tests.length === 0) {
  console.error('FAIL: the report contains zero tests.');
  process.exit(1);
}

// --- total count vs committed baseline ---
note(`tests executed: ${tests.length} (baseline minimum ${baseline.totalMinimum})`);
if (tests.length < baseline.totalMinimum) {
  fail.push(
    `only ${tests.length} tests ran, baseline minimum is ${baseline.totalMinimum} — ` +
      'tests appear to have stopped being collected'
  );
}

// --- per-file counts, so losing one whole spec file cannot hide behind another ---
const perFile = new Map();
for (const t of tests) perFile.set(t.file, (perFile.get(t.file) ?? 0) + 1);
for (const [file, min] of Object.entries(baseline.perFileMinimum)) {
  const got = perFile.get(file) ?? 0;
  note(`  ${file}: ${got} (minimum ${min})`);
  if (got < min) fail.push(`${file}: ${got} tests ran, expected at least ${min}`);
}
for (const file of perFile.keys()) {
  if (!(file in baseline.perFileMinimum)) {
    note(`  ${file}: ${perFile.get(file)} (not in baseline — add it to ${BASELINE})`);
  }
}

// --- skipped tests never assert anything ---
const skipped = tests.filter((t) => t.status === 'skipped');
if (skipped.length) {
  fail.push(`${skipped.length} test(s) skipped: ${skipped.map((t) => t.title).join('; ')}`);
}

// --- retries mean flakiness; surface it instead of letting a retry mask it ---
const flaky = tests.filter((t) => t.status === 'flaky' || (t.results?.length ?? 0) > 1);
if (flaky.length) {
  fail.push(
    `${flaky.length} test(s) needed a retry: ${flaky.map((t) => t.title).join('; ')} — ` +
      'this suite is deterministic, so a retry indicates a real defect'
  );
}

// --- anything not cleanly expected ---
const bad = tests.filter((t) => !['expected', 'skipped', 'flaky'].includes(t.status));
if (bad.length) {
  fail.push(`${bad.length} test(s) did not pass: ${bad.map((t) => `${t.title} [${t.status}]`).join('; ')}`);
}

if (fail.length) {
  console.error('\nFAIL: test-result integrity check');
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}

note('OK: test-result integrity check passed');
