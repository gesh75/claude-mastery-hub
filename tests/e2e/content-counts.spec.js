import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);

/**
 * Marketing counts must match the DOM, not a number someone typed once.
 *
 * The hero, meta tags, and README had drifted to three different values (37 /
 * 39 / 40) against a real 41. These derive the truth from the page and assert
 * every claim against it, so the next content change cannot silently re-drift.
 */
test.describe('advertised counts match reality', () => {
  test('every section claim equals the mastery-tracked section count', async ({ page }) => {
    await page.goto('/');
    const actual = await page.evaluate(() => ({
      // The ring shows n / N over .master-cb, so that is the number a reader
      // can verify for themselves.
      tracked: document.querySelectorAll('.master-cb').length,
      sections: document.querySelectorAll('section.sec').length
    }));
    expect(actual.tracked).toBeGreaterThan(0);

    const html = await readFile(new URL('index.html', ROOT), 'utf8');
    const claims = [...html.matchAll(/(\d+)\s+(?:deep-dive\s+)?sections?\b/gi)].map((m) => Number(m[1]));
    expect(claims.length, 'index.html should advertise a section count').toBeGreaterThan(0);
    for (const claimed of claims) {
      expect(claimed, `a section claim of ${claimed} disagrees with ${actual.tracked} tracked sections`).toBe(
        actual.tracked
      );
    }

    const readme = await readFile(new URL('README.md', ROOT), 'utf8');
    const rClaims = [...readme.matchAll(/(\d+)\s+deep.dive\s+sections?/gi)].map((m) => Number(m[1]));
    for (const claimed of rClaims) {
      expect(claimed, `README claims ${claimed} sections, page has ${actual.tracked}`).toBe(actual.tracked);
    }

    // Only `whats-new` is untracked; if that changes, the gap is worth noticing.
    expect(actual.sections - actual.tracked).toBeLessThanOrEqual(1);
  });

  test('the advertised track count equals the nav tracks', async ({ page }) => {
    await page.goto('/');
    const tracks = await page.evaluate(() => document.querySelectorAll('.nav-track').length);
    expect(tracks).toBeGreaterThan(0);

    const readme = await readFile(new URL('README.md', ROOT), 'utf8');
    const m = readme.match(/across\s+(\d+)\s+tracks/i);
    expect(m, 'README should state a track count').not.toBeNull();
    expect(Number(m[1]), `README claims ${m?.[1]} tracks, nav has ${tracks}`).toBe(tracks);
  });
});
