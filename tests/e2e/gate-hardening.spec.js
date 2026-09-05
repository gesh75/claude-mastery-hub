import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);

/**
 * Regressions for the findings from the external adversarial audit.
 *
 * These assert the *shape of the guards* in the gate scripts, because the
 * mutation probes that prove the guards fire live outside the Playwright suite
 * (they mutate tracked files). Pinning the guard shape here means a future edit
 * that quietly reverts one of these fixes fails the build.
 */
test.describe('gate hardening (external audit findings)', () => {
  test('the test entrypoint is pinned so it cannot be swapped', async () => {
    const pkg = JSON.parse(await readFile(new URL('package.json', ROOT), 'utf8'));
    expect(pkg.scripts.test).toBe('playwright test');
    const stat = await readFile(new URL('scripts/check-static.mjs', ROOT), 'utf8');
    expect(stat, 'check-static must pin scripts.test').toContain('scripts?.test');
    expect(stat).toContain("'playwright test'");
  });

  test('report provenance is validated, not just structure', async () => {
    const src = await readFile(new URL('scripts/check-test-results.mjs', ROOT), 'utf8');
    // The runner's own summary must be cross-checked against the walked tree.
    expect(src).toContain('report.stats');
    expect(src).toMatch(/\bst\.expected !== tests\.length\b/);
    expect(src).toMatch(/forbidOnly/);
    expect(src).toMatch(/projects/);
    expect(src).toMatch(/duration/);
  });

  test('network APIs are banned by identifier, not by literal URL', async () => {
    const src = await readFile(new URL('scripts/check-static.mjs', ROOT), 'utf8');
    expect(src).toContain('BANNED_SINKS');
    for (const sink of [
      'fetch',
      'XMLHttpRequest',
      'importScripts',
      'sendBeacon',
      'Worker',
      'SharedWorker',
      'EventSource',
      'WebSocket',
      'Request'
    ]) {
      expect(src, `${sink} must be banned`).toContain(`'${sink}'`);
    }
    // navigator itself stays legal: navigator.clipboard powers the copy buttons.
    expect(src).toMatch(/navigator.{0,80}clipboard/s);

    // Pin the enforcement too: the list is inert without the AST walk that
    // consumes it, so assert the walk, both node kinds, and the failure call.
    const enforcement = src.slice(src.indexOf('BANNED_SINKS'), src.indexOf('BANNED_ASSIGN'));
    expect(enforcement).toMatch(/walkAst\(/);
    expect(enforcement).toMatch(/'Identifier'/);
    expect(enforcement).toMatch(/'MemberExpression'/);
    expect(enforcement).toMatch(/node\.computed/); // computed access is covered
    expect(enforcement).toMatch(/bad\(/);
    expect(enforcement).toMatch(/jsHits\+\+/);
  });

  test('URL assignment is checked structurally, including concatenation', async () => {
    const src = await readFile(new URL('scripts/check-static.mjs', ROOT), 'utf8');
    expect(src).toContain('BANNED_ASSIGN');
    expect(src).toContain('URL_ASSIGN');
    expect(src).toMatch(/AssignmentExpression/);
    expect(src).toMatch(/TemplateElement/); // template literals are walked too
  });

  test('untrusted interpolation is matched anywhere inside an expression', async () => {
    const src = await readFile(new URL('scripts/check-static.mjs', ROOT), 'utf8');
    // Extract pattern and flags separately and fail loudly if the declaration
    // shape changes, rather than silently testing a different regex.
    const m = src.match(/const UNTRUSTED = \/((?:[^/\\\n]|\\.)+)\/([gimsuy]*);/);
    expect(m, 'UNTRUSTED must be a single-line regex literal this test can read').not.toBeNull();
    const re = new RegExp(m[1], m[2].replace('g', ''));
    // A bare interpolation, a comparison, a function wrapper, and head_ref must
    // all match. The original regex only matched the bare form.
    for (const expr of [
      '${{ github.event.pull_request.title }}',
      "${{ github.event.pull_request.title != 'x' }}",
      "${{ format('%s', github.event.pull_request.body) }}",
      '${{ github.head_ref }}'
    ]) {
      expect(re.test(expr), `must flag ${expr}`).toBe(true);
    }
    // A trusted context must not be flagged.
    for (const expr of ['${{ github.run_id }}', '${{ github.workflow }}', '${{ !cancelled() }}']) {
      expect(re.test(expr), `must not flag ${expr}`).toBe(false);
    }
    // `with:` and `if:` are inspected, `env:` is deliberately allowed.
    expect(src).toMatch(/key === 'with' \|\| key === 'if'/);
    // env: must be documented as deliberately allowed, not silently unchecked.
    expect(src).toMatch(/`env:` is deliberately NOT flagged/);
  });

  test('persisted-state write path enforces the same caps as the read path', async () => {
    const html = await readFile(new URL('index.html', ROOT), 'utf8');
    // Match the function's own body rather than slicing between two names,
    // which would drift if either is moved, split, or duplicated.
    const m = html.match(/function hubWrite\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
    expect(m, 'hubWrite must be locatable as a single function body').not.toBeNull();
    expect(m[1], 'hubWrite must bound what it stores').toMatch(/HUB_MAX_RAW/);
    expect(m[1], 'hubWrite must refuse rather than store an oversized value').toMatch(/return false/);
  });

  // --- the mutation harness -------------------------------------------------
  // A harness that reports "all mutants killed" without applying anything is the
  // same disease it exists to cure. These run in the BLOCKING gate on purpose:
  // they take about a second and touch no browser. The catalogue itself runs
  // out-of-band -- see .github/workflows/mutation.yml.

  test('every mutation anchor is unique in its target file', async () => {
    const src = await readFile(new URL('scripts/mutation.mjs', ROOT), 'utf8');
    const ops = [...src.matchAll(/\{ path: '([^']+)', find: (.+?), replace: (?:.+?), count: (\d+) \}/g)];
    expect(ops.length, 'the catalogue must have entries').toBeGreaterThan(5);

    for (const [, path, findLiteral, declared] of ops) {
      // eslint-disable-next-line no-eval -- a string literal from our own source
      const needle = eval(findLiteral);
      const content = await readFile(new URL(path, ROOT), 'utf8');
      const actual = content.split(needle).length - 1;
      expect(
        actual,
        `${path}: anchor ${JSON.stringify(needle.slice(0, 40))} occurs ${actual}x, catalogue declares ${declared}`
      ).toBe(Number(declared));
    }
  });

  test('the harness restores what it mutates, and never with git checkout', async () => {
    const src = await readFile(new URL('scripts/mutation.mjs', ROOT), 'utf8');
    // git checkout <file> discards uncommitted work. It cost this repo real
    // content twice; the harness must restore from its own snapshot instead.
    //
    // Match on CODE, not prose: the harness documents the ban in its own comments,
    // and a naive scan flags that explanation as the violation it warns against.
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(code, 'the harness must never restore with git checkout').not.toMatch(/git\s+checkout/);
    expect(code).not.toMatch(/['"]checkout['"]/);
    expect(src, 'restore must run in a finally').toMatch(/finally\s*\{\s*restore\(\)/);
    expect(src, 'restore must also run on abnormal exit').toContain("process.on('exit', restore)");
    expect(src, 'a stale anchor must abort before writing').toContain('stale mutation');
  });

  test('a mutation really is applied, killed, and rolled back', async () => {
    // End to end on the cheapest entry: a registry mutation killed by a Node
    // script, so no browser is involved and the whole thing is about a second.
    const run = spawnSync(process.execPath, ['scripts/mutation.mjs', '--only', 'M-03'], {
      cwd: fileURLToPath(ROOT),
      encoding: 'utf8'
    });
    expect(run.stdout, 'M-03 must be killed').toContain('KILLED');
    expect(run.status, 'a killed mutant means exit 0').toBe(0);

    const dirty = spawnSync('git', ['status', '--porcelain', 'index.html'], {
      cwd: fileURLToPath(ROOT),
      encoding: 'utf8'
    });
    expect(dirty.stdout.trim(), 'index.html must be byte-identical afterwards').toBe('');
  });

  // --- Buildkite GHA adapter (hosted native runner) -------------------------
  // The adapter sets GITHUB_EVENT_NAME=push from the GitHub webhook but does
  // not populate github.event.before/after, and it strips BUILDKITE from the
  // runner-user environment (Buildkite #11). GitHub-hosted push still has
  // event.before and must keep the exact before..after range. Incomplete
  // payloads use first-parent of GITHUB_SHA. github.run_id is not in the
  // adapter's runtime github context (compatibility.md).

  test('push with event.before still uses the exact before..after range', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cmh-diff-'));
    const eventPath = join(dir, 'event.json');
    const cwd = fileURLToPath(ROOT);
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).stdout.trim();
    const parent = spawnSync('git', ['rev-parse', `${head}^`], { cwd, encoding: 'utf8' }).stdout.trim();
    writeFileSync(eventPath, JSON.stringify({ before: parent, after: head, ref: 'refs/heads/main' }));
    const env = { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_PATH: eventPath, GITHUB_SHA: head };
    delete env.BUILDKITE;
    const run = spawnSync(process.execPath, ['scripts/check-diff.mjs'], {
      cwd,
      encoding: 'utf8',
      env
    });
    rmSync(dir, { recursive: true, force: true });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toMatch(/event\.before \.\. event\.after/);
    expect(run.stdout).toContain(`from: ${parent}`);
    expect(run.stdout).toContain(`to:   ${head}`);
  });

  test('push without event.before uses first-parent even when BUILDKITE is stripped', () => {
    const dir = mkdtempSync(join(tmpdir(), 'cmh-diff-'));
    const eventPath = join(dir, 'event.json');
    writeFileSync(eventPath, JSON.stringify({ ref: 'refs/heads/main' }));
    const cwd = fileURLToPath(ROOT);
    const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf8' }).stdout.trim();
    const parent = spawnSync('git', ['rev-parse', `${head}^`], { cwd, encoding: 'utf8' }).stdout.trim();
    const env = {
      ...process.env,
      GITHUB_EVENT_NAME: 'push',
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_SHA: head
    };
    delete env.BUILDKITE;
    delete env.BUILDKITE_BUILD_ID;
    const run = spawnSync(process.execPath, ['scripts/check-diff.mjs'], {
      cwd,
      encoding: 'utf8',
      env
    });
    rmSync(dir, { recursive: true, force: true });
    expect(run.status, `${run.stdout}\n${run.stderr}`).toBe(0);
    expect(run.stdout).toMatch(/incomplete payload/);
    expect(run.stdout).toContain(`from: ${parent}`);
    expect(run.stdout).toContain(`to:   ${head}`);
    expect(run.stdout).toMatch(/OK: diff integrity check passed/);
  });

  test('Playwright diagnostics artifact name uses github.sha, not github.run_id', async () => {
    const src = await readFile(new URL('.github/workflows/ci.yml', ROOT), 'utf8');
    expect(src, 'github.run_id is unsupported on Buildkite GHA runtime').not.toMatch(/github\.run_id/);
    expect(src, 'github.run_attempt is unsupported on Buildkite GHA runtime').not.toMatch(/github\.run_attempt/);
    expect(src).toMatch(/name:\s*playwright-diagnostics-\$\{\{\s*github\.sha\s*\}\}/);
  });

  test('CI retries stay at 0, citations run as a named step, and every checkout drops credentials', async () => {
    const pw = await readFile(new URL('playwright.config.js', ROOT), 'utf8');
    // check-test-results.mjs fails any test with results.length > 1, so a CI
    // retry can never recover a run — it can only turn a flake into an
    // integrity failure after wasting a browser cycle.
    expect(pw, 'retries must be unconditionally 0').toMatch(/retries:\s*0/);
    expect(pw, 'retries must not be CI-conditional').not.toMatch(/retries:\s*process\.env\.CI/);

    const ci = await readFile(new URL('.github/workflows/ci.yml', ROOT), 'utf8');
    expect(ci, 'Quality gate must invoke check-citations as its own step').toMatch(
      /npm run check:citations/
    );

    for (const name of ['ci.yml', 'mutation.yml', 'copilot-setup-steps.yml']) {
      const wf = await readFile(new URL(`.github/workflows/${name}`, ROOT), 'utf8');
      const checkouts = (wf.match(/uses:\s*actions\/checkout@/g) ?? []).length;
      const persist = (wf.match(/persist-credentials:\s*false/g) ?? []).length;
      expect(checkouts, `${name} must check out the repo`).toBeGreaterThan(0);
      expect(
        persist,
        `${name}: every checkout must set persist-credentials: false`
      ).toBe(checkouts);
    }
  });
});
