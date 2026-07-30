import { readFile } from 'node:fs/promises';
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
    const m = src.match(/const UNTRUSTED = (\/.*\/);/);
    expect(m, 'UNTRUSTED regex must be present').not.toBeNull();
    // eslint-disable-next-line no-eval
    const re = new RegExp(m[1].slice(1, -1));
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
    const write = html.slice(html.indexOf('function hubWrite'), html.indexOf('function hubResetAt'));
    expect(write, 'hubWrite must bound what it stores').toMatch(/HUB_MAX_RAW/);
  });
});
