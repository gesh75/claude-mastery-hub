#!/usr/bin/env node
/**
 * Anti-vacuity guard for the Playwright run.
 *
 * A green suite is only meaningful if Playwright actually executed the tests it
 * claims to, inside this repository. Declared metadata is not evidence, so this
 * validates the report's structure, proves each test recorded a real passing
 * attempt, and confines every spec path to the repository.
 *
 * Fails closed on:
 *   - a report or baseline that is missing, unparseable, or structurally wrong
 *   - a spec path that escapes the repository (../outside.spec.js)
 *   - a test declared `expected` with no execution results, more than one
 *     attempt, or a non-passing attempt
 *   - fewer tests than the committed baseline, in total or per spec
 *   - a spec present in the report but absent from the baseline
 *   - skipped, flaky, retried, failed, timed-out, or interrupted tests
 *
 * Spec identity is the repository-relative POSIX path, never the basename.
 *
 * Exit code 1 fails the job. There is deliberately no "warn only" mode.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const REPORT = process.argv[2] ?? 'test-results/results.json';
const BASELINE = process.argv[3] ?? 'scripts/expected-tests.json';

// Playwright's vocabularies. Anything outside them is unrecognised and fails.
const TEST_STATUSES = new Set(['expected', 'unexpected', 'flaky', 'skipped']);
const RESULT_STATUSES = new Set(['passed', 'failed', 'timedOut', 'skipped', 'interrupted']);

const ROOT = process.cwd();
const failures = [];
const note = (m) => console.log(m);

function die(title, lines) {
  console.error(`\nFAIL: ${title}`);
  for (const l of lines) console.error(`  - ${l}`);
  process.exit(1);
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isPositiveInt = (v) => Number.isInteger(v) && v > 0;
const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * Repository-relative POSIX path. Rejects anything that escapes the repository,
 * so a report cannot claim coverage from a spec outside the tree.
 */
function normalizeSpecPath(file, rootDir, where) {
  if (!isNonEmptyString(file)) {
    failures.push(`${where}: spec has no usable file path`);
    return null;
  }
  const abs = path.resolve(path.isAbsolute(file) ? '' : (rootDir ?? ROOT), file);
  const rel = path.relative(ROOT, abs);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    failures.push(
      `${where}: spec path "${file}" resolves outside the repository (${abs}) — ` +
        'coverage may only be claimed from specs inside this repo'
    );
    return null;
  }
  return rel.split(path.sep).join('/');
}

/** Same confinement rule for the committed baseline keys. */
function normalizeBaselineKey(key) {
  const abs = path.resolve(ROOT, key);
  const rel = path.relative(ROOT, abs);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) return null;
  return rel.split(path.sep).join('/');
}

// --- baseline ----------------------------------------------------------------
let baselineRaw;
try {
  baselineRaw = JSON.parse(await readFile(BASELINE, 'utf8'));
} catch (err) {
  die('anti-vacuity baseline unusable', [
    `${BASELINE} is missing or unparseable: ${err.message}`,
    'Without a baseline this check cannot prove the suite did not shrink, so it fails closed.'
  ]);
}

const baseErrors = [];
if (!isObject(baselineRaw)) {
  baseErrors.push(`${BASELINE} must contain a JSON object`);
} else {
  if (!isPositiveInt(baselineRaw.totalMinimum)) {
    baseErrors.push(`totalMinimum must be a positive integer, got ${JSON.stringify(baselineRaw.totalMinimum)}`);
  }
  const per = baselineRaw.perFileMinimum;
  if (!isObject(per) || Object.keys(per).length === 0) {
    baseErrors.push('perFileMinimum must be a non-empty object of "path": count');
  } else {
    const seen = new Set();
    for (const [file, count] of Object.entries(per)) {
      if (!isPositiveInt(count)) {
        baseErrors.push(`perFileMinimum["${file}"] must be a positive integer, got ${JSON.stringify(count)}`);
      }
      const norm = normalizeBaselineKey(file);
      if (norm === null) {
        baseErrors.push(`perFileMinimum["${file}"] resolves outside the repository`);
        continue;
      }
      if (seen.has(norm)) baseErrors.push(`duplicate normalized path in perFileMinimum: ${norm}`);
      seen.add(norm);
    }
    const sum = Object.values(per).filter(isPositiveInt).reduce((a, b) => a + b, 0);
    if (isPositiveInt(baselineRaw.totalMinimum) && baselineRaw.totalMinimum < sum) {
      baseErrors.push(
        `incoherent baseline: totalMinimum ${baselineRaw.totalMinimum} is below the sum of perFileMinimum (${sum})`
      );
    }
  }
}
if (baseErrors.length) die('anti-vacuity baseline invalid', baseErrors);

const expected = new Map();
for (const [file, count] of Object.entries(baselineRaw.perFileMinimum)) {
  expected.set(normalizeBaselineKey(file), count);
}

// --- report ------------------------------------------------------------------
let report;
try {
  report = JSON.parse(await readFile(REPORT, 'utf8'));
} catch (err) {
  die('Playwright report unusable', [
    `could not read ${REPORT}: ${err.message}`,
    'A run that produced no report has verified nothing.'
  ]);
}

const structural = [];
if (!isObject(report)) structural.push('the report root must be an object');
if (!isObject(report?.config)) structural.push('report.config must be an object');
if (!isNonEmptyString(report?.config?.rootDir)) structural.push('report.config.rootDir must be a non-empty path');
if (!Array.isArray(report?.suites)) structural.push('report.suites must be an array');
if (structural.length) die('Playwright report is structurally invalid', structural);

// --- provenance: this must be a real run of THIS suite -----------------------
// Structure alone does not prove origin. A hand-written or stale report can be
// shaped correctly, so cross-check the runner's own summary and configuration
// against what we counted. Any disagreement means the report does not describe
// the run that just happened.
const provenance = [];
const cfg = report.config;
if (!Array.isArray(cfg.projects) || cfg.projects.length !== 1 || cfg.projects[0]?.name !== 'chromium') {
  provenance.push(
    `report.config.projects must be exactly [chromium], got ${JSON.stringify(
      (cfg.projects ?? []).map((p) => p?.name)
    )}`
  );
}
if (process.env.CI && cfg.forbidOnly !== true) {
  provenance.push('report.config.forbidOnly must be true under CI, so a stray test.only fails the run');
}
if (!isObject(report.stats)) {
  provenance.push('report.stats must be an object');
} else {
  const st = report.stats;
  for (const field of ['expected', 'unexpected', 'skipped', 'flaky']) {
    if (!Number.isInteger(st[field]) || st[field] < 0) {
      provenance.push(`report.stats.${field} must be a non-negative integer, got ${JSON.stringify(st[field])}`);
    }
  }
  if (!(typeof st.duration === 'number' && st.duration > 0)) {
    provenance.push(`report.stats.duration must be a positive number, got ${JSON.stringify(st.duration)}`);
  }
  if (!isNonEmptyString(st.startTime) || Number.isNaN(Date.parse(st.startTime))) {
    provenance.push('report.stats.startTime must be a parseable timestamp');
  }
}
if (provenance.length) die('Playwright report provenance is not credible', provenance);

const rootDir = path.resolve(ROOT, report.config.rootDir);

/** Walk the suite tree, validating every node, and flatten to test records. */
function collect(suites, inheritedFile, trail, out = []) {
  if (!Array.isArray(suites)) {
    failures.push(`${trail}: "suites" must be an array`);
    return out;
  }
  suites.forEach((suite, si) => {
    const where = `${trail}.suites[${si}]`;
    if (!isObject(suite)) {
      failures.push(`${where}: suite must be an object`);
      return;
    }
    const file = isNonEmptyString(suite.file) ? suite.file : inheritedFile;

    if (suite.specs !== undefined) {
      if (!Array.isArray(suite.specs)) {
        failures.push(`${where}: "specs" must be an array`);
      } else {
        suite.specs.forEach((spec, pi) => {
          const sw = `${where}.specs[${pi}]`;
          if (!isObject(spec)) {
            failures.push(`${sw}: spec must be an object`);
            return;
          }
          if (!isNonEmptyString(spec.title)) failures.push(`${sw}: spec.title must be a non-empty string`);
          if (!Array.isArray(spec.tests) || spec.tests.length === 0) {
            failures.push(`${sw} ("${spec.title ?? '?'}"): spec.tests must be a non-empty array`);
            return;
          }
          const specFile = normalizeSpecPath(isNonEmptyString(spec.file) ? spec.file : file, rootDir, sw);
          if (specFile === null) return;

          spec.tests.forEach((t, ti) => {
            const tw = `${sw}.tests[${ti}] ("${spec.title ?? '?'}")`;
            if (!isObject(t)) {
              failures.push(`${tw}: test must be an object`);
              return;
            }
            if (!TEST_STATUSES.has(t.status)) {
              failures.push(`${tw}: unrecognised test status ${JSON.stringify(t.status)}`);
              return;
            }
            if (!Array.isArray(t.results) || t.results.length === 0) {
              failures.push(
                `${tw}: status "${t.status}" but no execution results — ` +
                  'a declared pass with no recorded attempt is not evidence that anything ran'
              );
              return;
            }
            for (const [ri, r] of t.results.entries()) {
              if (!isObject(r)) {
                failures.push(`${tw}.results[${ri}]: result must be an object`);
                return;
              }
              if (!RESULT_STATUSES.has(r.status)) {
                failures.push(`${tw}.results[${ri}]: unrecognised result status ${JSON.stringify(r.status)}`);
                return;
              }
            }
            out.push({
              file: specFile,
              title: spec.title,
              status: t.status,
              results: t.results.map((r) => r.status)
            });
          });
        });
      }
    }
    collect(suite.suites ?? [], file, where, out);
  });
  return out;
}

const tests = collect(report.suites, undefined, 'report');
if (failures.length) die('Playwright report is structurally invalid', failures);
if (tests.length === 0) die('anti-vacuity check', ['the report contains zero tests']);

// --- every clean pass must be exactly one recorded passing attempt -----------
for (const t of tests) {
  if (t.status === 'skipped') {
    failures.push(`skipped: "${t.title}" (${t.file}) — a skipped test asserts nothing`);
    continue;
  }
  if (t.status === 'flaky' || t.results.length > 1) {
    failures.push(
      `retried: "${t.title}" (${t.file}) recorded ${t.results.length} attempt(s) [${t.results.join(', ')}] — ` +
        'this suite is deterministic, so a retry indicates a real defect'
    );
    continue;
  }
  if (t.status !== 'expected') {
    failures.push(`did not pass: "${t.title}" (${t.file}) status "${t.status}"`);
    continue;
  }
  if (t.results[0] !== 'passed') {
    failures.push(
      `"${t.title}" (${t.file}) is declared "expected" but its only attempt is "${t.results[0]}" — ` +
        'the declared status disagrees with the recorded execution'
    );
  }
}

// --- the runner's own summary must agree with what we counted ---------------
// If stats and the walked tree disagree, one of them is fabricated.
const st = report.stats;
if (st.expected !== tests.length) {
  failures.push(
    `report.stats.expected is ${st.expected} but the suite tree contains ${tests.length} test(s) — ` +
      'the summary and the tree disagree, so the report does not describe one coherent run'
  );
}
for (const [field, label] of [['unexpected', 'failed'], ['skipped', 'skipped'], ['flaky', 'flaky']]) {
  if (st[field] !== 0) failures.push(`report.stats.${field} is ${st[field]}: ${st[field]} ${label} test(s)`);
}

// --- counts ------------------------------------------------------------------
note(`tests executed: ${tests.length} (baseline minimum ${baselineRaw.totalMinimum})`);
if (tests.length < baselineRaw.totalMinimum) {
  failures.push(
    `only ${tests.length} tests ran, baseline minimum is ${baselineRaw.totalMinimum} — tests stopped being collected`
  );
}

const observed = new Map();
for (const t of tests) observed.set(t.file, (observed.get(t.file) ?? 0) + 1);

for (const [file, min] of expected) {
  const got = observed.get(file) ?? 0;
  note(`  ${file}: ${got} (minimum ${min})`);
  if (got < min) failures.push(`${file}: ${got} tests ran, expected at least ${min}`);
}

for (const [file, count] of observed) {
  if (!expected.has(file)) {
    failures.push(
      `spec file "${file}" ran ${count} test(s) but is not in ${BASELINE} — ` +
        `add "${file}": ${count} to perFileMinimum and raise totalMinimum, otherwise this spec is unprotected`
    );
  }
}

if (failures.length) die('anti-vacuity check', failures);
note('OK: test-result integrity check passed');
