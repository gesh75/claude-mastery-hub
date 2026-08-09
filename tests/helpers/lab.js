import { expect } from '@playwright/test';

/**
 * Practice Lab readiness, derived rather than pinned.
 *
 * Five call sites used to hardcode `toHaveText('12')`. Two of them sit inside
 * shared setup -- `loadApplication()` in p0-responsive-navigation and the
 * `beforeEach` in practice-lab-validation -- so growing the LAB array turned
 * roughly 30 tests red at once, in spec files the offending change never
 * touched, with the message `Expected "12" / Received "15"`. That reads like a
 * content bug and sends the reader hunting in index.html.
 *
 * This asserts the real invariant instead: the rendered total equals the
 * declared array length. It stays non-vacuous because `#lab-total` starts at 0
 * in markup and is only written by the Lab IIFE, so a Lab that never
 * initialises still fails here.
 *
 * This file lives outside `testDir`'s spec glob on purpose: Playwright's
 * default testMatch only collects `*.spec.js`, and a helper picked up as a spec
 * would be rejected by scripts/check-test-results.mjs as absent from the
 * committed baseline.
 */
export async function expectLabRendered(page) {
  const total = page.locator('#lab-total');

  // The IIFE has run: the markup ships 0 and the renderer overwrites it.
  await expect(total, 'the Practice Lab never initialised').not.toHaveText('0');

  const declared = await page.evaluate(() =>
    Array.isArray(window.LAB) ? window.LAB.length : -1
  );
  expect(declared, 'window.LAB must be a populated array').toBeGreaterThan(0);
  await expect(total, 'the rendered challenge total must equal LAB.length').toHaveText(
    String(declared)
  );

  return declared;
}
