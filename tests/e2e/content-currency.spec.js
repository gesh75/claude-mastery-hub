import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);

test.describe('Opus 5 content currency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('central model registry contains the verified current lineup', async ({ page }) => {
    const facts = await page.evaluate(() => ({
      verifiedAt: window.MODEL_FACTS_VERIFIED_AT,
      models: window.MODEL_FACTS,
      sources: window.MODEL_SOURCES
    }));

    expect(facts.verifiedAt).toBe('2026-07-28');
    expect(facts.models.opus).toMatchObject({
      name: 'Claude Opus 5',
      id: 'claude-opus-5',
      context: '1M tokens',
      maxOutput: '128k tokens',
      inputPrice: 5,
      outputPrice: 25,
      reliableKnowledgeCutoff: 'May 2026',
      trainingDataCutoff: 'May 2026'
    });
    expect(facts.models.opus.sources).toContain('opusSystemCard');
    expect(facts.models.fable.positioning).toContain('most capable widely released');
    expect(facts.models.sonnet.positioning).toContain('speed and intelligence');
    expect(facts.models.haiku.positioning).toContain('fastest');
    expect(facts.models.mythos.availability).toContain('Project Glasswing');
    expect(facts.sources.opusLaunch.url).toBe(
      'https://www.anthropic.com/news/claude-opus-5'
    );
    expect(facts.sources.opusSystemCard.url).toBe(
      'https://www.anthropic.com/claude-opus-5-system-card'
    );
  });

  test('visible guidance distinguishes Fable, Opus, Sonnet, Haiku, and Mythos', async ({
    page
  }) => {
    const models = page.locator('#models');
    await expect(models).toContainText(
      "Fable 5 is Anthropic's highest-capability widely released model"
    );
    await expect(models).toContainText(
      'Opus 5 is the latest Opus model for complex agentic coding and enterprise work'
    );
    await expect(models).toContainText('Sonnet 5 balances speed and intelligence');
    await expect(models).toContainText('Haiku 4.5 is the fastest current model');
    await expect(models).toContainText(
      'Mythos 5 is invitation-only for approved Project Glasswing customers'
    );
    await expect(models.locator('[data-model-rows="comparison"] tr')).toHaveCount(5);
    await expect(models).not.toContainText(
      "Opus 5 is Anthropic's most capable model"
    );
  });

  test('Opus 5 lesson covers specifications, behavior, migration, and availability', async ({
    page
  }) => {
    const lesson = page.locator('#whats-new');
    await expect(lesson).toContainText('July 24, 2026');
    await expect(lesson).toContainText('claude-opus-5');
    await expect(lesson).toContainText('1M-token context window');
    await expect(lesson).toContainText('128k maximum output');
    await expect(lesson).toContainText('$5 input / $25 output per MTok');
    await expect(lesson).toContainText('512-token prompt-cache minimum');
    await expect(lesson).toContainText('thinking is on by default');
    await expect(lesson).toContainText('low, medium, high, xhigh, and max');
    await expect(lesson).toContainText(
      'disabling thinking at xhigh or max returns a 400 error'
    );
    await expect(lesson).toContainText('May 2026 knowledge and training cutoff');
    await expect(lesson).toContainText('Fast mode');
    await expect(lesson).toContainText('$10 input / $50 output per MTok');
    await expect(lesson).toContainText('Claude API');
    await expect(lesson).toContainText('Amazon Bedrock');
    await expect(lesson).toContainText('Google Cloud');
    await expect(lesson).toContainText('Microsoft Foundry');
    await expect(lesson).toContainText('Opus 4.8');
    await expect(lesson).toContainText('remove inherited verification instructions');
  });

  test('Opus 5 migration exceptions are taught without overstating them', async ({
    page
  }) => {
    const lesson = page.locator('#whats-new');

    // The two documented feature exceptions must be visible to a learner.
    await expect(lesson).toContainText('Web Fetch');
    await expect(lesson).toContainText('not currently available on Opus 5');
    await expect(lesson).toContainText(
      'Web Search is a separate tool and remains available'
    );
    await expect(lesson).toContainText('Priority Tier does not support Opus 5');

    // Web Fetch must never be conflated with Web Search, and the tier limit
    // must never be presented as a limit on ordinary Opus 5 availability.
    await expect(lesson).not.toContainText('Web Search is not available');
    await expect(lesson).toContainText(
      'does not limit ordinary Opus 5 availability'
    );

    // Normal platform availability stays intact alongside the exceptions.
    const glance = lesson.locator('table').first();
    await expect(glance).toContainText('Amazon Bedrock');
    await expect(glance).toContainText('Google Cloud');
    await expect(glance).toContainText('Microsoft Foundry');
  });

  test('Fast mode scope is distinct from Opus 5 platform availability', async ({
    page
  }) => {
    const lesson = page.locator('#whats-new');
    const cost = page.locator('#cost');

    // Fast mode is API + Claude Code (usage credits), not the cloud platforms.
    await expect(lesson).toContainText('Claude Code via usage credits');
    await expect(cost).toContainText('usage credits');
    await expect(cost).toContainText(
      'Team/Enterprise Owners must enable it first'
    );
    await expect(cost).toContainText(
      'Not available on Amazon Bedrock, Google Cloud, Microsoft Foundry, or Claude Platform on AWS'
    );

    // The restriction must be scoped to fast mode, not to the model.
    await expect(cost).toContainText(
      'that restriction is on fast mode, not on Opus 5 itself'
    );

    // Throughput claim must not read as a latency guarantee.
    await expect(cost).toContainText('higher output tokens per second');
    await expect(cost).toContainText('not a guaranteed latency SLA');
    await expect(cost).not.toContainText('2.5× faster');
    await expect(cost).toContainText('$10 / $50');
  });

  test('extended output is scoped to the Message Batches API', async ({ page }) => {
    const api = page.locator('#api-sdk');
    await expect(api).toContainText('output-300k-2026-03-24');
    await expect(api).toContainText('on the Message Batches API only');
    await expect(api).toContainText('not the synchronous Messages API');
    await expect(api).toContainText('Opus 5 stays at 128k');
  });

  test('registry records the Opus 5 exceptions and fast-mode scope', async ({
    page
  }) => {
    const opus = await page.evaluate(() => window.MODEL_FACTS.opus);

    expect(opus.featureExceptions.join(' | ')).toContain('Web Fetch');
    expect(opus.featureExceptions.join(' | ')).toContain('Priority Tier');
    expect(opus.fastMode.inputPrice).toBe(10);
    expect(opus.fastMode.outputPrice).toBe(50);
    expect(opus.fastMode.unavailableOn).toEqual(
      expect.arrayContaining([
        'Amazon Bedrock',
        'Google Cloud',
        'Microsoft Foundry'
      ])
    );
    // Fast-mode exclusions must not leak into normal model availability.
    expect(opus.availability).toContain('Amazon Bedrock');
    expect(opus.availability).toContain('Google Cloud');
    expect(opus.availability).toContain('Microsoft Foundry');
    expect(opus.sources).toContain('migration');
    expect(opus.sources).toContain('serviceTiers');
    expect(opus.sources).toContain('fastMode');
  });

  test('ARC-AGI-3 exact and rounded scores are shown as one labeled result', async ({
    page
  }) => {
    const benchmarks = page.locator('#opus-5-benchmarks');
    const row = benchmarks.locator('tr', { hasText: 'ARC-AGI-3' });

    // Both representations appear, and neither is left unexplained.
    await expect(row).toContainText('30.2%');
    await expect(row).toContainText('30.16%');
    await expect(row).toContainText('rounded');
    await expect(row).toContainText('exact');

    // They must read as one evaluation, not two competing results.
    await expect(row).toContainText('Same single result, two representations');

    // Effort and provenance stay attached to the number.
    await expect(row).toContainText('High');
    await expect(row).toContainText('ARC Prize-verified');
    await expect(row).toContainText('short testing window');

    // The registry keeps the exact value as the numeric field, and the
    // rounded value must genuinely be the rounding of it.
    const arc = await page.evaluate(() => window.BENCHMARK_EVIDENCE.arcAgi);
    expect(arc.exactScore).toBe(30.16);
    expect(arc.roundedScore).toBe(30.2);
    expect(Number(arc.exactScore.toFixed(1))).toBe(arc.roundedScore);
    expect(arc.effort).toBe('High');
    expect(arc.provenance).toBe('ARC Prize-verified');
    expect(arc.result).toContain('30.16%');
  });

  test('audit record does not claim the exact ARC score was unreproducible', async () => {
    const audit = await readFile(
      new URL('docs/audits/OPUS_5_CONTENT_INVENTORY_2026-07-28.md', ROOT),
      'utf8'
    );

    // The "unreproducible" claim may be quoted as withdrawn history, but must
    // never stand as an assertion. Every occurrence needs a nearby retraction
    // marker - this catches a live claim without banning the historical record.
    const claimPattern = /could not be reproduced|unreproducible|not reproducible/gi;
    const unretracted = [...audit.matchAll(claimPattern)].filter((match) => {
      const context = audit.slice(
        Math.max(0, match.index - 400),
        match.index + 400
      );
      return !/withdrawn|was wrong|revision note/i.test(context);
    });
    expect(
      unretracted.map((m) => m[0]),
      'every "unreproducible" mention must be marked as withdrawn'
    ).toEqual([]);

    // The document must record the corrected, sourced relationship...
    expect(audit).toContain('30.16%');
    expect(audit).toContain('30.2%');
    expect(audit).toMatch(/exact verified/i);
    expect(audit).toMatch(/rounded headline/i);

    // ...and must retain the revision history rather than erase it.
    expect(audit).toMatch(/withdrawn/i);
    expect(audit).toMatch(/Revision note/i);
  });

  test('benchmark claims expose provenance and limitations', async ({ page }) => {
    const benchmarks = page.locator('#opus-5-benchmarks');
    await expect(benchmarks).toContainText('Frontier-Bench v0.1');
    await expect(benchmarks).toContainText('Anthropic-run');
    await expect(benchmarks).toContainText('CursorBench 3.2');
    await expect(benchmarks).toContainText('Cursor-reported');
    await expect(benchmarks).toContainText('ARC-AGI-3');
    await expect(benchmarks).toContainText('ARC Prize-verified');
    await expect(benchmarks).toContainText('30.2%');
    await expect(benchmarks).toContainText('AutomationBench');
    await expect(benchmarks).toContainText('Zapier-reported');
    await expect(benchmarks).toContainText('26.2%');
    await expect(benchmarks).toContainText(
      'These results do not establish superiority for every workload'
    );
  });

  test('assessments teach current selection and Opus 4.8 migration', async ({ page }) => {
    const assessmentFacts = await page.evaluate(() => {
      const quizzes = window.QUIZ.models;
      const exam = window.EXAM;
      return {
        quizQuestions: quizzes.map((item) => item.q),
        quizOptions: quizzes.flatMap((item) => item.o),
        examQuestions: exam.map((item) => item.q),
        examOptions: exam.flatMap((item) => item.o),
        quizCount: quizzes.length,
        examCount: exam.length,
        labCount: window.LAB.length
      };
    });

    expect(assessmentFacts.quizCount).toBe(3);
    expect(assessmentFacts.examCount).toBe(20);
    // The Practice Lab count is asserted against what the project ADVERTISES,
    // not against a literal. Comparing LAB.length to itself would be vacuous;
    // comparing it to the visible claim is the drift this repo keeps hitting
    // (PR #22 existed to clean up exactly that class of stale number).
    const labClaimPattern = /(\d+)\s+hands[-\u2011]on\s+scenario\s+challenges/gi;

    // The "Recently updated" panel is DATED HISTORY, not a live claim: its entry
    // reads "Jul 2026 — New Practice Lab: 12 hands-on scenario challenges", which
    // records what shipped then. Binding it to the current count would force
    // rewriting the changelog every time a challenge is added. Strip it first.
    const indexHtml = await readFile(new URL('index.html', ROOT), 'utf8');
    const logStart = indexHtml.indexOf('<details class="anim-x" id="changelog"');
    expect(logStart, 'the changelog block must still be findable to be excluded').toBeGreaterThan(0);
    const logEnd = indexHtml.indexOf('</details>', logStart);
    expect(logEnd, 'the changelog block must be closed').toBeGreaterThan(logStart);
    const liveIndexHtml = indexHtml.slice(0, logStart) + indexHtml.slice(logEnd);

    const claimSources = {
      'index.html': liveIndexHtml,
      'README.md': await readFile(new URL('README.md', ROOT), 'utf8')
    };
    let labClaims = 0;
    for (const [file, text] of Object.entries(claimSources)) {
      for (const match of text.matchAll(labClaimPattern)) {
        labClaims += 1;
        expect(
          Number(match[1]),
          `${file} advertises ${match[1]} Practice Lab challenges, but LAB holds ${assessmentFacts.labCount}`
        ).toBe(assessmentFacts.labCount);
      }
    }
    expect(labClaims, 'the challenge count must be advertised somewhere').toBeGreaterThan(0);
    expect(assessmentFacts.labCount).toBeGreaterThan(0);
    expect(assessmentFacts.quizOptions).toContain('Opus 5');
    expect(assessmentFacts.examOptions).toContain('Opus 5');
    expect(
      [...assessmentFacts.quizQuestions, ...assessmentFacts.examQuestions].some(
        (question) => question.includes('Opus 4.8') && question.includes('Opus 5')
      )
    ).toBe(true);
  });

  test('currency policy records owner, cadence, triggers, and source rules', async () => {
    const policy = await readFile(
      new URL('docs/CONTENT_CURRENCY_POLICY.md', ROOT),
      'utf8'
    );

    expect(policy).toContain('Content owner');
    expect(policy).toContain('Verification cadence');
    expect(policy).toContain('Release-triggered review');
    expect(policy).toContain('Primary sources');
    expect(policy).toContain('MODEL_FACTS_VERIFIED_AT');
    expect(policy).toContain('Pricing');
    expect(policy).toContain('Benchmark');
  });

  test('runtime remains offline-capable and error-free', async ({ page }) => {
    const externalRequests = [];
    const errors = [];
    page.on('request', (request) => {
      if (!request.url().startsWith('http://127.0.0.1:4173')) {
        externalRequests.push(request.url());
      }
    });
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('requestfailed', (request) =>
      errors.push(`requestfailed: ${request.url()}`)
    );

    // The shared beforeEach already navigated, so a plain reload would only
    // ever observe a warm load with localStorage already populated. Clear the
    // persisted learning-engine state first so this covers a cold first visit,
    // which is where first-run-only errors would surface.
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await expect(page.locator('#models')).toBeVisible();
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
});
