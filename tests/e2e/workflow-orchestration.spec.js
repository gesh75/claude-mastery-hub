import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);

/**
 * The orchestration spine: who holds the plan.
 *
 * Every assertion here is anchored to
 * https://code.claude.com/docs/en/workflows, verified 2026-08-09. Numbers come
 * from WORKFLOW_FACTS rather than prose, so a currency pass is a registry edit
 * and check-citations.mjs enforces the shape.
 *
 * Deliberately absent: the workflow-script primitives (parallel/pipeline
 * barrier-vs-streaming semantics). No public primary source documents them --
 * the workflows page defers to an Agent SDK "Workflow tool" reference that does
 * not exist in the published docs index -- so under CONTENT_CURRENCY_POLICY they
 * are not taught as fact.
 */
test.describe('workflow orchestration spine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('the who-holds-the-plan axis distinguishes all four orchestration modes', async ({
    page
  }) => {
    const table = page.locator('#workflows [data-plan-holder]');
    await expect(table).toHaveCount(1);

    // The four modes the primary source compares.
    for (const mode of ['Subagents', 'Skills', 'Agent teams', 'Workflows']) {
      await expect(table, `${mode} must appear in the comparison`).toContainText(mode);
    }

    // The axis that actually separates them, in the source's own terms.
    await expect(table).toContainText('Who decides what runs next');
    await expect(table).toContainText('Claude, turn by turn');
    await expect(table).toContainText('The lead agent, turn by turn');
    await expect(table).toContainText('The script');

    // The consequence a reader is meant to take away.
    await expect(table).toContainText('Where intermediate results live');
    await expect(table).toContainText("Claude's context window");
    await expect(table).toContainText('Script variables');
  });

  test('workflow runtime limits render from a dated registry, not from prose', async ({
    page
  }) => {
    const facts = await page.evaluate(() => ({
      verifiedAt: window.WORKFLOW_FACTS_VERIFIED_AT,
      facts: window.WORKFLOW_FACTS
    }));

    expect(facts.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(facts.facts.maxConcurrentAgents.value).toBe(16);
    expect(facts.facts.maxAgentsPerRun.value).toBe(1000);
    expect(facts.facts.largeRunAgentThreshold.value).toBe(25);

    // Rendered, not retyped.
    const limits = page.locator('#workflows [data-workflow-fact="maxConcurrentAgents"]');
    await expect(limits).toHaveCount(1);
    await expect(limits).toHaveText(String(facts.facts.maxConcurrentAgents.value));

    const perRun = page.locator('#workflows [data-workflow-fact="maxAgentsPerRun"]');
    await expect(perRun).toHaveText('1,000');

    // Every fact carries provenance and a source key, per CONTENT_CURRENCY_POLICY.
    for (const [key, fact] of Object.entries(facts.facts)) {
      expect(fact.provenance, `${key} needs provenance`).toBeTruthy();
      expect(fact.source, `${key} needs a source key`).toBeTruthy();
    }
  });

  test('the size guideline is taught with its agent counts and its default', async ({
    page
  }) => {
    const guide = page.locator('#workflows [data-size-guideline]');
    await expect(guide).toHaveCount(1);

    // The published values. "small/medium/large" without numbers is the old,
    // less useful version of this claim.
    await expect(guide).toContainText('unrestricted');
    await expect(guide).toContainText('Fewer than 5');
    await expect(guide).toContainText('Fewer than 15');
    await expect(guide).toContainText('Fewer than 50');
    await expect(guide).toContainText('medium');

    // Advice, not a cap -- the distinction that decides whether a reader trusts it.
    await expect(page.locator('#workflows')).toContainText('advice, not a cap');
  });

  test('resume is taught by start order, which is the counter-intuitive part', async ({
    page
  }) => {
    const section = page.locator('#workflows');

    await expect(section).toContainText('Replay follows the order agents started');
    // The consequence: a completed agent still re-runs if it started after the
    // one that did not finish.
    await expect(section).toContainText('started after');
    await expect(section).toContainText('even though');

    // And the design lesson that falls out of it.
    await expect(section).toContainText('many small agents');
  });

  test('availability and the trigger match the primary source, not the older claim', async ({
    page
  }) => {
    const section = page.locator('#workflows');

    // Corrected availability: the previous text listed only Max/Team/Enterprise/API.
    await expect(section).toContainText('all paid plans');
    await expect(section).toContainText('Amazon Bedrock');
    await expect(section).toContainText('Microsoft Foundry');
    await expect(section).toContainText('Pro');

    // Corrected trigger: /effort ultracode, not a /config toggle.
    await expect(section).toContainText('/effort ultracode');

    // The bundled workflow a reader can run today.
    await expect(section).toContainText('/deep-research');
  });

  test('the permission surface of workflow subagents is stated, because it is surprising', async ({
    page
  }) => {
    const section = page.locator('#workflows');

    // Subagents always run acceptEdits regardless of the session's mode.
    await expect(section).toContainText('acceptEdits');
    await expect(section).toContainText('regardless of your session');
    await expect(section).toContainText('allowlist');
  });

  test('the orchestration claims cite their primary source', async ({ page }) => {
    const cites = page.locator('#workflows ul.cites[data-model-sources="workflow"]');
    await expect(cites).toHaveCount(1);

    const sources = await page.evaluate(() => window.MODEL_SOURCES);
    const anchor = cites.locator('a[href="https://code.claude.com/docs/en/workflows"]');
    await expect(anchor).toHaveCount(1);
    expect(sources.workflowsDocs.url).toBe('https://code.claude.com/docs/en/workflows');
  });

  test('check-citations validates WORKFLOW_FACTS the same way it validates MODEL_FACTS', async () => {
    const checker = await readFile(new URL('scripts/check-citations.mjs', ROOT), 'utf8');
    expect(checker).toContain('WORKFLOW_FACTS');

    const schema = JSON.parse(await readFile(new URL('scripts/registry-schema.json', ROOT), 'utf8'));
    expect(schema.properties.workflow, 'the schema must cover the workflow registry').toBeTruthy();
    expect(schema.properties.workflow.additionalProperties).toBe(false);
  });
});
