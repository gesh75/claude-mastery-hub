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
    await expect(next).toContainText('fix/persisted-state-integrity');
  });

  test('reports health, test count, CI and deployment state', async ({ page }) => {
    await page.goto(PAGE);
    const pulse = page.locator('.pulse');
    await expect(pulse).toContainText('29 passing');
    await expect(pulse).toContainText('Enforced');
    await expect(pulse).toContainText('Live');
    await expect(page.locator('.scroll')).toContainText('29 passed');
    await expect(page.locator('.scroll')).toContainText('0 on success');
  });

  test('lists merged PRs 13-16 and both planned milestones', async ({ page }) => {
    await page.goto(PAGE);
    const cards = page.locator('.cards').first();
    for (const pr of ['PR #13', 'PR #14', 'PR #15', 'PR #16']) {
      await expect(cards).toContainText(pr);
    }
    await expect(cards).toContainText('Persisted-state integrity');
    await expect(cards).toContainText('Practice Lab validation');
    // Merge SHAs are the evidence; without them a "merged" tag is just a claim.
    await expect(cards).toContainText('7f7f24f');
    await expect(cards).toContainText('9924a6b');
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
    expect(md).toContain('7f7f24fbd30f3f5c6fda9c44c70c55a936e8b0b8');
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
