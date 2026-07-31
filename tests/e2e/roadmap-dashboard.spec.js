import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);
const PAGE = '/docs/roadmap/index.html';
const WIDTHS = [320, 390, 768, 1024, 1440];

test.describe('project roadmap dashboard', () => {
  test('loads offline with no console or page errors', async ({ page }) => {
    const errors = [];
    const external = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()}`));
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1:4173')) external.push(r.url());
    });

    await page.goto(PAGE);
    await expect(page.locator('h1')).toHaveText('Claude Mastery Hub');

    // The dashboard must fetch nothing: external links are hrefs, never loads.
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('stays contained from 320px to desktop', async ({ page }) => {
    await page.goto(PAGE);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(80);
      const metrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const wrappers = [...document.querySelectorAll('.scroll')];
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          // A wide table is allowed to be wider than the viewport, but only
          // inside its own scroll container. The container is what must stay
          // within the viewport.
          escapingWrappers: wrappers.filter(
            (w) => w.getBoundingClientRect().right > doc.clientWidth + 1
          ).length,
          // Every table must live inside such a container, or it would push
          // the document instead of scrolling itself.
          unwrappedTables: [...document.querySelectorAll('table')].filter(
            (t) => !t.closest('.scroll')
          ).length,
          // At narrow widths the wide table must genuinely scroll locally.
          locallyScrollable: wrappers.filter((w) => w.scrollWidth > w.clientWidth + 1).length
        };
      });
      expect(metrics.scrollWidth, `document overflow at ${width}px`).toBeLessThanOrEqual(
        metrics.clientWidth + 1
      );
      expect(metrics.escapingWrappers, `scroll container escaping viewport at ${width}px`).toBe(0);
      expect(metrics.unwrappedTables, `table outside a scroll container at ${width}px`).toBe(0);
      if (width <= 420) {
        expect(
          metrics.locallyScrollable,
          `wide table is not locally scrollable at ${width}px`
        ).toBeGreaterThan(0);
      }
    }
  });

  test('shows exactly one current next action', async ({ page }) => {
    await page.goto(PAGE);
    const next = page.locator('.next');
    await expect(next).toHaveCount(1);
    await expect(next).toContainText('exactly one');
    await expect(next).toContainText('complete');
  });

  test('reports health, test count, CI and deployment state', async ({ page }) => {
    await page.goto(PAGE);
    // Derive the expected count from the committed baseline so the dashboard
    // cannot advertise a stale number, and this test cannot pin one either.
    const baseline = JSON.parse(await readFile(new URL('scripts/expected-tests.json', ROOT), 'utf8'));
    const pulse = page.locator('.pulse');
    await expect(pulse).toContainText(`${baseline.totalMinimum} passing`);
    await expect(pulse).toContainText('Enforced');
    await expect(pulse).toContainText('Live');
    await expect(page.locator('.scroll')).toContainText(`${baseline.totalMinimum} passed`);
    await expect(page.locator('.scroll')).toContainText('0 on success');
  });

  test('lists merged PRs 13-16 and both planned milestones', async ({ page }) => {
    await page.goto(PAGE);
    const cards = page.locator('.cards').first();
    for (const pr of ['PR #13', 'PR #14', 'PR #15', 'PR #16', 'PR #17', 'PR #18', 'PR #19', 'PR #21', 'PR #22']) {
      await expect(cards).toContainText(pr);
    }
    await expect(cards).toContainText('Persisted-state integrity');
    await expect(cards).toContainText('Practice Lab validation');
    // Merge SHAs are the evidence; without them a "merged" tag is just a claim.
    for (const sha of ['7f7f24f', '9924a6b', '7be4ce3', '7049355', 'dc20627', 'f830158', 'aae8d25']) {
      await expect(cards).toContainText(sha);
    }
    // Nothing may still be advertised as planned or in progress.
    await expect(page.locator('.tag.plan')).toHaveCount(0);
    await expect(page.locator('.tag.active')).toHaveCount(0);
  });

  test('links to the repository, PRs and source documents', async ({ page }) => {
    await page.goto(PAGE);
    await expect(
      page.locator('a[href="https://github.com/gesh75/claude-mastery-hub"]')
    ).toHaveCount(1);
    await expect(
      page.locator('a[href="https://github.com/gesh75/claude-mastery-hub/pull/16"]')
    ).toHaveCount(1);
    for (const doc of ['../CURRENT_STATE.md', '../PROJECT_ROADMAP.md', '../DECISION_LOG.md']) {
      await expect(page.locator(`a[href="${doc}"]`)).toHaveCount(1);
    }
  });

  test('is keyboard accessible', async ({ page }) => {
    await page.goto(PAGE);
    // Tab reaches a real interactive element rather than trapping on body.
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY');
    expect(['A', 'SUMMARY', 'DETAILS']).toContain(tag);

    // Decision-history disclosures open from the keyboard.
    const summary = page.locator('details summary').first();
    await summary.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('details').first()).toHaveAttribute('open', '');
  });

  test('CURRENT_STATE.md records state, protection and one next action', async () => {
    const md = await readFile(new URL('docs/CURRENT_STATE.md', ROOT), 'utf8');
    expect(md).toMatch(/read this file first/i);
    expect(md).toMatch(/update it last/i);
    // The header table must NOT pin the current HEAD. A docs commit can never
    // contain its own squash SHA, so any recorded HEAD is stale the moment the
    // PR merges -- which happened twice. An earlier version of this test
    // *required* that SHA, which is why the drift kept coming back. The stable
    // facts are the last merged PR number and a command to read HEAD live.
    const header = md.slice(0, md.indexOf('## Branch protection'));
    expect(header, 'the header must not pin a volatile HEAD SHA').not.toMatch(/`[0-9a-f]{40}`/i);
    expect(header, 'the header must name the last merged PR').toMatch(/Last merged PR\s*\|\s*\[?#\d+/);
    expect(header, 'the header must say how to read HEAD live').toMatch(/git rev-parse origin\/main/);
    expect(md).toMatch(/run \[`\d+`\]/); // a real CI run id, linked

    // The advertised test count must equal the committed anti-vacuity baseline,
    // so the two cannot disagree about how much coverage exists.
    const baseline = JSON.parse(await readFile(new URL('scripts/expected-tests.json', ROOT), 'utf8'));
    const claimed = md.match(/\|\s*Tests\s*\|\s*\*\*(\d+)\*\*/);
    expect(claimed, 'CURRENT_STATE must advertise a test count').not.toBeNull();
    expect(Number(claimed[1]), 'test count disagrees with the baseline').toBe(baseline.totalMinimum);
    expect(md).toContain('enforce_admins');
    expect(md).toMatch(/## Next action/);
    // Exactly one next-action heading, so the file cannot accumulate several.
    expect(md.match(/## Next action/g)).toHaveLength(1);
  });

  test('CLAUDE.md mandates the session protocol', async () => {
    const md = await readFile(new URL('CLAUDE.md', ROOT), 'utf8');
    expect(md).toMatch(/must read `docs\/CURRENT_STATE\.md` first and update it last/i);
    expect(md).toContain('enforce_admins');
  });
});
