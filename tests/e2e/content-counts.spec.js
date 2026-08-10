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

  test('every diagram claim equals the rendered diagram count', async ({ page }) => {
    await page.goto('/');

    // .diagram, never .anim-x: one anim-x is the #changelog panel, which is not
    // a diagram, so a guard built on it is permanently off by one.
    const diagrams = await page.evaluate(
      () => document.querySelectorAll('.diagram').length
    );
    expect(diagrams).toBeGreaterThan(0);

    // The changelog is DATED HISTORY -- "Jun 2026 - panels on all 24 diagrams"
    // records what shipped then. Binding it to the live count would force
    // rewriting history on every addition (DECISION_LOG 2026-08-09).
    const html = await readFile(new URL('index.html', ROOT), 'utf8');
    const logStart = html.indexOf('<details class="anim-x" id="changelog"');
    expect(logStart, 'the changelog block must be findable to be excluded').toBeGreaterThan(0);
    const logEnd = html.indexOf('</details>', logStart);
    expect(logEnd).toBeGreaterThan(logStart);
    const live = html.slice(0, logStart) + html.slice(logEnd);

    // "animated" is optional: a future live claim may omit it and must still be caught.
    const pattern = /(\d+)\s+(?:animated[^.]{0,40}?)?diagrams?\b/gi;
    const sources = { 'index.html': live, 'README.md': await readFile(new URL('README.md', ROOT), 'utf8') };

    let claims = 0;
    for (const [file, text] of Object.entries(sources)) {
      for (const match of text.matchAll(pattern)) {
        claims += 1;
        expect(
          Number(match[1]),
          `${file} advertises ${match[1]} diagrams, but the page renders ${diagrams}`
        ).toBe(diagrams);
      }
    }
    expect(claims, 'the diagram count must be advertised somewhere').toBeGreaterThan(0);
  });

  test('every section header follows the same structure', async ({ page }) => {
    await page.goto('/');

    // Nothing guarded this before, so #managed-agents shipped in #32 with a bare
    // <div> instead of .sec-icon + .sec-titles and rendered with no icon beside
    // every other section that has one. Structure is invisible to check-static,
    // which only balances tags -- it needs an explicit assertion.
    const broken = await page.evaluate(() =>
      [...document.querySelectorAll('section.sec')]
        .map((section) => ({
          id: section.id,
          icon: Boolean(section.querySelector('.sec-head > .sec-icon')),
          titles: Boolean(section.querySelector('.sec-head > .sec-titles')),
          num: Boolean(section.querySelector('.sec-head .sec-num'))
        }))
        .filter((s) => !s.icon || !s.titles || !s.num)
        .map((s) => s.id)
    );
    expect(broken, 'these sections do not use the .sec-icon/.sec-titles header').toEqual([]);

    // The icon is a decorative emoji. Unhidden, a screen reader announces it
    // before the heading on every section.
    const unlabelled = await page.evaluate(() =>
      [...document.querySelectorAll('.sec-head > .sec-icon')]
        .filter((el) => el.getAttribute('aria-hidden') !== 'true')
        .map((el) => el.closest('section.sec')?.id ?? '(unknown)')
    );
    expect(unlabelled, 'decorative section icons must be hidden from assistive tech').toEqual([]);
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
