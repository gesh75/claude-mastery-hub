import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);

/**
 * Context engineering + spend attribution.
 *
 * Every claim is anchored to a primary doc, verified 2026-08-10:
 * https://platform.claude.com/docs/en/build-with-claude/context-editing,
 * https://platform.claude.com/docs/en/build-with-claude/compaction,
 * https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool,
 * https://platform.claude.com/docs/en/manage-claude/usage-cost-api,
 * https://platform.claude.com/docs/en/build-with-claude/claude-code-analytics-api,
 * https://code.claude.com/docs/en/costs,
 * https://code.claude.com/docs/en/agent-sdk/cost-tracking,
 * https://platform.claude.com/docs/en/managed-agents/multi-agent.
 *
 * Positive assertions only (DECISION_LOG 2026-07-29) -- no test forbids a
 * legitimate value.
 */
test.describe('context engineering + spend attribution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('context editing is taught with its beta header, both edit types, and the ordering rule', async ({ page }) => {
    const api = page.locator('#api-sdk');
    await expect(api).toContainText('context-management-2025-06-27');
    await expect(api).toContainText('clear_tool_uses_20250919');
    await expect(api).toContainText('clear_thinking_20251015');
    await expect(api).toContainText('100,000');
    await expect(api).toContainText('must come first');
  });

  test('server-side compaction is taught as the primary strategy, distinct from Claude Code CLI\'s own /compact', async ({ page }) => {
    const api = page.locator('#api-sdk');
    await expect(api).toContainText('compact-2026-01-12');
    await expect(api).toContainText('compact_20260112');
    await expect(api).toContainText('150,000');
    await expect(api).toContainText('50,000');
    await expect(api).toContainText('primary strategy');
    await expect(api).toContainText('compaction_control');
    await expect(api).toContainText('deprecated');
    await expect(api).toContainText('CLI\'s local auto-compaction');
  });

  test('the memory tool is taught as GA, client-side, and paired with compaction', async ({ page }) => {
    const api = page.locator('#api-sdk');
    await expect(api).toContainText('memory_20250818');
    await expect(api).toContainText('GA on the Messages API');
    await expect(api).toContainText('no beta header required');
    await expect(api).toContainText('all Claude 4-and-later models');
    await expect(api).toContainText('/memories');
    await expect(api).toContainText('Use compaction and memory together');
  });

  test('CLAUDE.md memory bridges to the API-level memory tool', async ({ page }) => {
    const memory = page.locator('#memory');
    await expect(memory).toContainText('memory_20250818');
    const link = memory.locator('a[href="#api-sdk"]');
    await expect(link).toHaveCount(1);
  });

  test('the Admin API usage and cost endpoints are taught with auth and scope', async ({ page }) => {
    const cost = page.locator('#cost');
    await expect(cost).toContainText('/v1/organizations/usage_report/messages');
    await expect(cost).toContainText('/v1/organizations/cost_report');
    await expect(cost).toContainText('sk-ant-admin');
    await expect(cost).toContainText('daily granularity only');
    await expect(cost).toContainText('Priority Tier spend is excluded');
  });

  test('the Claude Code Analytics API is taught as the per-developer surface, with its coverage limit', async ({ page }) => {
    const cost = page.locator('#cost');
    await expect(cost).toContainText('/v1/organizations/usage_report/claude_code');
    await expect(cost).toContainText('one record per user per day');
    await expect(cost).toContainText('model_breakdown');
    await expect(cost).toContainText('OpenTelemetry export');
  });

  test('Anthropic\'s enterprise cost framing is taught as reported, not as a universal benchmark', async ({ page }) => {
    const cost = page.locator('#cost');
    await expect(cost).toContainText('$13 per developer per active day');
    await expect(cost).toContainText('$150');
    await expect(cost).toContainText('$250');
    await expect(cost).toContainText('under $30');
    await expect(cost).toContainText('Anthropic\'s own framing');
    await expect(cost).toContainText('not a benchmark for any specific team');
  });

  test('Agent SDK cost fields are taught as client-side estimates, with the subagent and dedupe rules', async ({ page }) => {
    const cost = page.locator('#cost');
    await expect(cost).toContainText('total_cost_usd');
    await expect(cost).toContainText('costUSD');
    await expect(cost).toContainText('does');
    await expect(cost).toContainText('include subagent activity');
    await expect(cost).toContainText('dedupe by message');
    await expect(cost).toContainText('never for billing');
  });

  test('delegation economics render the parent-thread field from the registry, not from prose', async ({ page }) => {
    const facts = await page.evaluate(() => ({
      fact: window.MANAGED_AGENT_FACTS.parentThreadField,
      // Cites the key PR 2b already added. The brief proposed minting
      // managedAgentsMultiAgent -> /multi-agent, which differs from
      // managedAgentsMultiagent -> /multiagent-orchestration by ONE capital
      // letter and resolves to the same page. check-citations cannot flag a
      // near-duplicate, so the collision had to be avoided rather than detected.
      sourceUrl: window.MODEL_SOURCES.managedAgentsMultiagent
        ? window.MODEL_SOURCES.managedAgentsMultiagent.url
        : null,
      noNearDuplicate: window.MODEL_SOURCES.managedAgentsMultiAgent === undefined
    }));
    expect(facts.fact.value).toBe('parent_thread_id');
    expect(facts.fact.provenance).toBeTruthy();
    expect(facts.fact.source).toBe('managedAgentsMultiagent');
    expect(facts.noNearDuplicate, 'no near-duplicate source key may be minted').toBe(true);
    expect(facts.sourceUrl).toBe('https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration');

    const rendered = page.locator('#managed-agents [data-ma-fact="parentThreadField"]');
    await expect(rendered).toHaveCount(1);
    await expect(rendered).toHaveText('parent_thread_id');

    // The citation list is derived from the registry -- the new source must
    // appear without any HTML change to the <ul class="cites"> itself.
    const cites = page.locator('#managed-agents ul.cites[data-model-sources="managedAgents"]');
    await expect(
      cites.locator('a[href="https://platform.claude.com/docs/en/managed-agents/multiagent-orchestration"]')
    ).toHaveCount(1);
  });

  test('delegation has a taught floor cost and a rigor-matched-control methodology, not a bare ratio', async ({ page }) => {
    const section = page.locator('#managed-agents');
    await expect(section).toContainText('floor cost');
    await expect(section).toContainText('fixed setup overhead');
    await expect(section).toContainText('same');
    await expect(section).toContainText('verification rigor');
    await expect(section).toContainText('rigor-matched control');
    // The brief's "Anthropic's own worked example found delegation cheaper and
    // faster" was unattributed -- it traced only to a cookbook, which is not a
    // citable primary source. The durable methodology stays; the implied
    // citation does not.
    await expect(section).toContainText('not numbers to plan against');
    await expect(section).not.toContainText("Anthropic's own worked example");
  });

  test('four new Lab challenges exist, use type "choice", and do not collide with any reserved id', async ({ page }) => {
    const items = await page.evaluate(() =>
      window.LAB.filter((it) =>
        ['lab-contextedit', 'lab-compaction', 'lab-memtool', 'lab-costapi'].includes(it.id)
      )
    );
    expect(items).toHaveLength(4);
    for (const it of items) {
      expect(it.type, `${it.id} must be type "choice"`).toBe('choice');
      expect(Array.isArray(it.options), `${it.id} must use options, not opts`).toBe(true);
      expect(typeof it.correct).toBe('number');
    }
    const reserved = [
      'lab-compact', 'lab-clear', 'lab-file', 'lab-bash', 'lab-memory', 'lab-headless',
      'lab-cost', 'lab-plan', 'lab-subagent', 'lab-mcp', 'lab-hook', 'lab-claudemd',
      'lab-planholder', 'lab-wfresume', 'lab-wfperms'
    ];
    const ids = await page.evaluate(() => window.LAB.map((it) => it.id));
    const seen = new Set();
    for (const id of ids) {
      expect(seen.has(id), `duplicate Lab id: ${id}`).toBe(false);
      seen.add(id);
    }
    expect(reserved.every((r) => !['lab-contextedit', 'lab-compaction', 'lab-memtool', 'lab-costapi'].includes(r))).toBe(true);
  });

  test('QUIZ counts and the Lab/README challenge count reconcile', async ({ page }) => {
    const facts = await page.evaluate(() => ({
      apiSdk: window.QUIZ['api-sdk'].length,
      cost: window.QUIZ.cost.length,
      managedAgents: window.QUIZ['managed-agents'].length,
      labCount: window.LAB.length
    }));
    expect(facts.apiSdk).toBe(5);
    expect(facts.cost).toBe(4);
    expect(facts.managedAgents).toBe(6);
    // Derived, never inherited: PR 2b and PR 1 both landed after this brief was written,
    // so any hardcoded total is wrong by construction (DECISION_LOG 2026-08-09).
    const labLength = await page.evaluate(() => window.LAB.length);
    expect(facts.labCount).toBe(labLength);

    const readme = await readFile(new URL('README.md', ROOT), 'utf8');
    expect(readme).toContain(labLength + ' hands‑on scenario challenges');
  });
});
