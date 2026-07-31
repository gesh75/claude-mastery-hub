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

    // Only the PLURAL "sections" counts as a claim. "36 section quizzes passed"
    // uses the singular as an adjective and is a quiz count, not a section count.
    //
    // Claims are read from RENDERED TEXT, not raw HTML. The hero splits the
    // number from the words -- <b>41</b><span>deep-dive sections</span> -- so a
    // regex over markup walks straight past it, which is exactly how the stale
    // "37" survived the first version of this test.
    const visible = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const visibleClaims = [...visible.matchAll(/(\d+)\s+(?:deep-dive\s+)?sections\b/gi)].map((m) =>
      Number(m[1])
    );
    expect(visibleClaims.length, 'the page should advertise a section count').toBeGreaterThan(0);
    for (const claimed of visibleClaims) {
      expect(claimed, `a visible claim of ${claimed} disagrees with ${actual.tracked} tracked sections`).toBe(
        actual.tracked
      );
    }

    // Meta tags are not in innerText, so check their attribute values too.
    const html = await readFile(new URL('index.html', ROOT), 'utf8');
    const metaClaims = [...html.matchAll(/<meta[^>]+content="([^"]*)"/gi)]
      .flatMap((m) => [...m[1].matchAll(/(\d+)\s+(?:deep-dive\s+)?sections\b/gi)])
      .map((m) => Number(m[1]));
    expect(metaClaims.length, 'meta tags should advertise a section count').toBeGreaterThan(0);
    for (const claimed of metaClaims) {
      expect(claimed, `a meta claim of ${claimed} disagrees with ${actual.tracked}`).toBe(actual.tracked);
    }

    const readme = await readFile(new URL('README.md', ROOT), 'utf8');
    const rClaims = [...readme.matchAll(/(\d+)\s+deep.dive\s+sections?/gi)].map((m) => Number(m[1]));
    // Require the claim to exist: an empty list would make this loop vacuous
    // and let the README quietly drop the number instead of correcting it.
    expect(rClaims.length, 'README must advertise a section count').toBeGreaterThan(0);
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
    expect(m, 'README must state a track count').not.toBeNull();
    expect(Number(m[1]), `README claims ${m?.[1]} tracks, nav has ${tracks}`).toBe(tracks);

    // The hero advertises it too, again with the number split from the words.
    const visible = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
    const heroTracks = [...visible.matchAll(/(\d+)\s+learning\s+tracks?/gi)].map((x) => Number(x[1]));
    expect(heroTracks.length, 'the hero should advertise a track count').toBeGreaterThan(0);
    for (const claimed of heroTracks) {
      expect(claimed, `hero claims ${claimed} tracks, nav has ${tracks}`).toBe(tracks);
    }
  });
});
