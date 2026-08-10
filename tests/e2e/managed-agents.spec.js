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

  // ---- PR 2b: everything Managed Agents adds once a session is more than one agent ----
  // Anchored to platform.claude.com/docs/en/managed-agents/{multiagent-orchestration,
  // skills,budgets,webhooks,vaults,session-operations}, verified 2026-08-09/10.
  // Positive assertions only -- DECISION_LOG 2026-07-29.

  test("the coordinator's roster forms and caps are taught", async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('"type": "coordinator"');
    await expect(section).toContainText('{"type": "self"}');
    await expect(section).toContainText('{"type": "agent", "id": ...}');
    await expect(section).toContainText('{"type": "advisor", "model": ...}');
    await expect(section.locator('[data-ma-fact="multiagentRosterCap"]')).toHaveText('20');
    await expect(section.locator('[data-ma-fact="threadCap"]')).toHaveText('25');
    await expect(section).toContainText('exempt from');
  });

  test('multiagent config is shared where it should be and per-agent where it should be', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('snapshotted');
    await expect(section).toContainText('delegate only');
    await expect(section).toContainText('sandbox, filesystem, and vault credentials');
    await expect(section).toContainText('per-role scoping');
    await expect(section).toContainText('Threads are persistent');
  });

  test('interrupting and archiving a thread cross-posts tool confirmations to the primary', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('session_thread_id');
    await expect(section).toContainText('requires_action');
    await expect(section).toContainText('cross-posted');
  });

  test('the coordinator can be given an advisor, with a reserved name and a capability rule', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('anthropic.advisor');
    await expect(section).toContainText('minimum capability bar');
    await expect(section).toContainText('{"type": "advisor", "model": ...}');
  });

  test('Managed Agents advisor delivery differs from the Messages API advisor tool', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('max_uses');
    await expect(section).toContainText('advisor_tool_result');
    await expect(section).toContainText('thread events');
  });

  test('advisor delivery is redacted or plaintext, with a concrete model pairing', async ({ page }) => {
    // Scoped to the section: Opus 4.8 appears elsewhere on the page for unrelated reasons.
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('redacted or plaintext');
    await expect(section).toContainText('Claude Opus 5 is a redacted-result advisor');
    await expect(section).toContainText('Claude Opus 4.8');
  });

  test('a failed consultation degrades gracefully and the advisor stays out of the roster tools', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('never fails the agent');
    await expect(section).toContainText('list_agents');
    await expect(section).toContainText('send_to_agent');
    await expect(section).toContainText('"multiagent": null');
  });

  test("repository skills are disambiguated from Claude Code's local skills, and cross-linked", async ({ page }) => {
    const section = page.locator('#managed-agents');
    expect(await section.locator('a[href="#skills"]').count()).toBeGreaterThan(0);
    await expect(section).toContainText('different mechanism from the local');
    await expect(section).toContainText('SKILL.md');
  });

  test('repository skill discovery follows one exact path, scanned once at session start', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('.claude/skills/<skill-name>/SKILL.md');
    await expect(section).toContainText('one directory level deep');
    await expect(section).toContainText('scanned once');
    await expect(section).toContainText('not picked up');
  });

  test('repository skills carry a trust-boundary warning and are cloud-only', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('trust boundary');
    await expect(section).toContainText('no review step');
    await expect(section).toContainText('Cloud sandboxes only');
  });

  test('attached skills are capped, and the custom-skill beta header is a different one', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section.locator('[data-ma-fact="skillsCap"]')).toHaveText('500');
    await expect(section.locator('[data-ma-fact="skillsBetaHeader"]')).toHaveText('skills-2025-10-02');
    await expect(section).toContainText('not the general Managed Agents one');
  });

  test('session budgets are a hard dollar cap, attachable only at session creation', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('"amount": "2500"');
    await expect(section.locator('[data-ma-fact="sessionBudgetType"]')).toHaveText('limit');
    await expect(section).toContainText('$10 per 1,000 searches');
    await expect(section).toContainText('$0.08 per hour');
  });

  test('a session that reaches its budget pauses, bounded to one request past the cap', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('between');
    await expect(section).toContainText('bounded to one request per thread');
    await expect(section).toContainText('budget_reached');
    await expect(section).toContainText('not terminated');
  });

  test('the budget-reached event sequence and the resume rules are taught', async ({ page }) => {
    const text = (await page.locator('#managed-agents').innerText()).replace(/\s+/g, ' ');
    const threadIdle = text.indexOf('session.thread_status_idle');
    const usage = text.indexOf('session.usage');
    const statusIdle = text.indexOf('session.status_idle');
    expect(threadIdle, 'session.thread_status_idle must be taught').toBeGreaterThan(-1);
    expect(usage, 'session.usage must be taught').toBeGreaterThan(-1);
    expect(statusIdle, 'session.status_idle must be taught').toBeGreaterThan(-1);
    // The documented order: per-thread idle, then cumulative usage, then session idle.
    expect(usage).toBeGreaterThan(threadIdle);
    expect(statusIdle).toBeGreaterThan(usage);
    await expect(page.locator('#managed-agents')).toContainText('strictly greater');
    await expect(page.locator('#managed-agents')).toContainText('Removal is');
  });

  test('multiagent sessions share one budget, and deployments get a fresh one per run', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('shared across every thread');
    await expect(section).toContainText("advisor model's own rates");
    await expect(section).toContainText('copied onto each session it starts');
  });

  test('webhooks deliver a pointer, not the object, with signatures and no ordering guarantee', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('not the full object');
    await expect(section).toContainText('webhook-signature');
    await expect(section).toContainText('safe to discard');
    await expect(section).toContainText('not guaranteed');
  });

  test('webhook delivery retries with backoff, then drops, and endpoints auto-disable', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section.locator('[data-ma-fact="webhookMaxRetries"]')).toHaveText('3');
    await expect(section).toContainText('between 5 and 120 seconds');
    await expect(section).toContainText('3xx');
  });

  test('vault credentials are workspace-scoped and substituted at egress, not in the sandbox', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('workspace-scoped');
    await expect(section.locator('[data-ma-fact="vaultCredentialTypes"]')).toHaveText(
      'mcp_oauth, static_bearer, environment_variable'
    );
    await expect(section).toContainText('at egress');
    await expect(section).toContainText('without a restart');
  });

  test('session lifecycle: four statuses, config updates are a full replacement, archive vs delete', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section.locator('[data-ma-fact="sessionStatuses"]')).toHaveText(
      'idle, running, rescheduling, terminated'
    );
    await expect(section).toContainText('full replacement');
    await expect(section).toContainText('permanently removes');
    await expect(section).toContainText('independent and unaffected');
  });

  test('eight new managed-agents facts extend the registry with provenance and citations', async ({ page }) => {
    const facts = await page.evaluate(() => window.MANAGED_AGENT_FACTS);
    const expected = {
      multiagentRosterCap: '20',
      threadCap: '25',
      sessionBudgetType: 'limit',
      skillsBetaHeader: 'skills-2025-10-02',
      skillsCap: '500',
      webhookMaxRetries: '3',
      vaultCredentialTypes: 'mcp_oauth, static_bearer, environment_variable',
      sessionStatuses: 'idle, running, rescheduling, terminated'
    };
    for (const [key, value] of Object.entries(expected)) {
      expect(facts[key], `${key} must exist`).toBeTruthy();
      expect(facts[key].value, `${key} value`).toBe(value);
      expect(facts[key].provenance, `${key} provenance`).toBeTruthy();
      expect(facts[key].source, `${key} source`).toBeTruthy();
    }

    const hrefs = await page.evaluate(() =>
      [...document.querySelectorAll('#managed-agents ul.cites[data-model-sources="managedAgents"] li a')].map(
        (a) => a.getAttribute('href')
      )
    );
    for (const path of [
      '/managed-agents/budgets',
      '/managed-agents/multiagent-orchestration',
      '/managed-agents/skills',
      '/managed-agents/webhooks',
      '/managed-agents/vaults',
      '/managed-agents/session-operations'
    ]) {
      expect(hrefs.some((h) => h && h.endsWith(path)), `${path} must be cited`).toBe(true);
    }
  });

  test('three new Practice Lab challenges teach budgets, the advisor, and repository skills', async ({ page }) => {
    const lab = await page.evaluate(() => window.LAB);
    const ids = lab.map((item) => item.id);

    // Defect register #5: a duplicate LAB id ships GREEN through check-static, because
    // the ids are created at runtime, and then breaks solved-state tracking.
    expect(new Set(ids).size, 'every LAB id must be unique').toBe(ids.length);

    for (const id of ['lab-budget', 'lab-madvisor', 'lab-maskills']) {
      const matches = lab.filter((item) => item.id === id);
      expect(matches.length, `${id} must appear exactly once`).toBe(1);
      const item = matches[0];
      expect(item.sec, `${id} section`).toBe('managed-agents');
      expect(item.type, `${id} type`).toBe('choice');
      expect(Array.isArray(item.options) && item.options.length >= 3, `${id} options`).toBe(true);
      expect(Number.isInteger(item.correct), `${id} correct is an integer`).toBe(true);
      expect(item.correct >= 0 && item.correct < item.options.length, `${id} correct in range`).toBe(true);
    }

    // The visible "CHALLENGE N" badge is driven by `n` and has no other coverage, so a
    // collision here would ship silently. Assert the sequence is a gapless 1..N.
    const ns = lab.map((item) => item.n).sort((a, b) => a - b);
    expect(ns).toEqual(Array.from({ length: lab.length }, (_, i) => i + 1));
  });
});
