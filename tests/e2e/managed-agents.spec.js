import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);

/**
 * Claude Managed Agents.
 *
 * Every claim is anchored to https://platform.claude.com/docs/en/managed-agents/*,
 * verified 2026-08-09. This is the highest fact risk on the page: every endpoint
 * sits behind a beta header and the docs say "Behaviors may be refined between
 * releases", so the volatile identifiers live in MANAGED_AGENT_FACTS and the
 * section asserts only POSITIVE claims.
 *
 * There is deliberately no assertion that some other value is ABSENT.
 * DECISION_LOG 2026-07-29 rules out "tests that forbid a legitimate value" --
 * a negative assertion on beta surface locks in whichever spelling was current
 * when it was written. The cookbooks use `anthropic_cloud`; the primary docs use
 * `cloud` consistently across curl, CLI, Python, TypeScript, PHP and Ruby, so the
 * page teaches `cloud` and the registry records it.
 */
test.describe('managed agents', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('the section is section 17 and closes the Power Features track', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toHaveCount(1);
    await expect(section).toHaveAttribute('data-id', 'managed-agents');
    await expect(section.locator('.sec-num')).toHaveText('SECTION 17');

    // It is mastery-tracked, so it counts toward the advertised section total.
    await expect(section.locator('input.master-cb[data-id="managed-agents"]')).toHaveCount(1);

    // Nav: last link of the Power Features track, immediately after #api-sdk.
    const link = page.locator('a.nav-link[href="#managed-agents"]');
    await expect(link).toHaveCount(1);
    const placement = await page.evaluate(() => {
      const a = document.querySelector('a.nav-link[href="#managed-agents"]');
      const prev = a?.previousElementSibling;
      const track = a?.closest('.nav-track');
      const links = track ? [...track.querySelectorAll('a.nav-link')] : [];
      return {
        prevId: prev?.getAttribute('data-id') ?? null,
        isLast: links[links.length - 1] === a,
        trackTitle: track?.querySelector('.nav-track-h')?.textContent?.trim() ?? ''
      };
    });
    expect(placement.prevId).toBe('api-sdk');
    expect(placement.isLast).toBe(true);
    expect(placement.trackTitle).toContain('Power Features');
  });

  test('section numbers run consecutively with no gaps and no duplicates', async ({ page }) => {
    const banners = await page.evaluate(() =>
      [...document.querySelectorAll('.sec-num')].map((el) => el.textContent.trim())
    );
    const numbered = banners
      .filter((text) => /^SECTION \d{2}$/.test(text))
      .map((text) => Number(text.slice(8)));

    // The renumber is generated output; this is the only guard on it, because
    // nothing in check-static.mjs validates banner sequencing.
    expect(numbered).toEqual(Array.from({ length: numbered.length }, (_, i) => i + 1));

    // Derived, not pinned. Note the count of ordinals does NOT equal the
    // mastery-tracked count: #lab and #exam are tracked but carry named banners
    // rather than ordinals, and #whats-new is neither tracked nor numbered.
    // Assert that actual shape instead of a number.
    const shape = await page.evaluate(() =>
      [...document.querySelectorAll('section.sec')].map((section) => ({
        id: section.id,
        banner: section.querySelector('.sec-num')?.textContent.trim() ?? null,
        tracked: Boolean(section.querySelector('.master-cb'))
      }))
    );

    // Every ordinal-bearing section is mastery-tracked, so an ordinal can never
    // advertise a section the ring does not count.
    const ordinals = shape.filter((s) => /^SECTION \d{2}$/.test(s.banner ?? ''));
    expect(ordinals.length).toBe(numbered.length);
    expect(ordinals.every((s) => s.tracked), 'every numbered section must be tracked').toBe(true);

    // Exactly three sections are deliberately unnumbered.
    const named = shape
      .filter((s) => s.banner && !/^SECTION \d{2}$/.test(s.banner))
      .map((s) => s.id)
      .sort();
    expect(named).toEqual(['exam', 'lab', 'whats-new']);
  });

  test('the four core concepts are taught as the mental model', async ({ page }) => {
    const section = page.locator('#managed-agents');
    for (const concept of ['Agent', 'Environment', 'Session', 'Events']) {
      await expect(section, `${concept} must be taught`).toContainText(concept);
    }
    // What each one actually is, in the source's terms.
    await expect(section).toContainText('system prompt');
    await expect(section).toContainText('sandbox');
    await expect(section).toContainText('conversation history');

    // The positioning against the Messages API is the reason to reach for it.
    await expect(section).toContainText('Messages API');
    await expect(section).toContainText('agent loop');
  });

  test('both beta headers render from the registry, not from prose', async ({ page }) => {
    const facts = await page.evaluate(() => ({
      verifiedAt: window.MANAGED_AGENT_FACTS_VERIFIED_AT,
      facts: window.MANAGED_AGENT_FACTS
    }));
    expect(facts.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(facts.facts.betaHeader.value).toBe('managed-agents-2026-04-01');
    expect(facts.facts.memoryBetaHeader.value).toBe('agent-memory-2026-07-22');

    for (const key of Object.keys(facts.facts)) {
      expect(facts.facts[key].provenance, `${key} needs provenance`).toBeTruthy();
      expect(facts.facts[key].source, `${key} needs a source key`).toBeTruthy();
    }

    const rendered = page.locator('#managed-agents [data-ma-fact="betaHeader"]');
    await expect(rendered).toHaveCount(1);
    await expect(rendered).toHaveText('managed-agents-2026-04-01');

    // The exception is the whole point: memory endpoints take a different header.
    const memory = page.locator('#managed-agents [data-ma-fact="memoryBetaHeader"]');
    await expect(memory).toHaveText('agent-memory-2026-07-22');
    await expect(page.locator('#managed-agents')).toContainText('memory store');
  });

  test('the environment config type and networking modes are taught positively', async ({
    page
  }) => {
    const section = page.locator('#managed-agents');

    // Positive only. No assertion that another spelling is absent -- see the
    // file header and DECISION_LOG 2026-07-29.
    await expect(section).toContainText('"type": "cloud"');

    await expect(section).toContainText('unrestricted');
    await expect(section).toContainText('limited');
    await expect(section).toContainText('allowed_hosts');
    // Production guidance, in the docs' own recommendation.
    await expect(section).toContainText('least privilege');
  });

  test('the compliance boundary is stated, dated, and hedged the way Anthropic hedges it', async ({
    page
  }) => {
    const section = page.locator('#managed-agents');

    // A reader may act on this, so it carries its reason and its remedy.
    await expect(section).toContainText('Zero Data Retention');
    await expect(section).toContainText('HIPAA');
    await expect(section).toContainText('not currently eligible');
    // Why: stateful by design.
    await expect(section).toContainText('stateful');
    // The remedy the docs give, so the claim is not read as "your data is stuck".
    await expect(section).toContainText('delete');

    // And it is dated, because it is a statement about a moving posture.
    // The stamp appears on both dated callouts; every occurrence must agree.
    const stamps = section.locator('[data-ma-fact="verifiedAt"]');
    expect(await stamps.count()).toBeGreaterThan(0);
    for (let i = 0; i < (await stamps.count()); i += 1) {
      await expect(stamps.nth(i)).toHaveText('August 9, 2026');
    }
  });

  test('beta status is taught as a reason to expect change', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('beta');
    await expect(section).toContainText('refined between releases');
  });

  test('agents are versioned and environments are not', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('versioned');
    await expect(section).toContainText('not versioned');
    // The practical consequence of each.
    await expect(section).toContainText('pin');
  });

  test('the section cites its primary sources and the registry is gated', async ({ page }) => {
    const cites = page.locator('#managed-agents ul.cites[data-model-sources="managedAgents"]');
    await expect(cites).toHaveCount(1);
    await expect(cites.locator('li a')).not.toHaveCount(0);

    const sources = await page.evaluate(() => window.MODEL_SOURCES);
    expect(sources.managedAgentsOverview.url).toBe(
      'https://platform.claude.com/docs/en/managed-agents/overview'
    );

    const checker = await readFile(new URL('scripts/check-citations.mjs', ROOT), 'utf8');
    expect(checker).toContain('MANAGED_AGENT_FACTS');
    const schema = JSON.parse(await readFile(new URL('scripts/registry-schema.json', ROOT), 'utf8'));
    expect(schema.properties.managedAgents).toBeTruthy();
    expect(schema.properties.managedAgents.additionalProperties).toBe(false);
  });
});
