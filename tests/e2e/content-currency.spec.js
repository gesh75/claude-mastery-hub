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

  test('benchmark claims expose provenance and limitations', async ({ page }) => {
    const benchmarks = page.locator('#opus-5-benchmarks');
    await expect(benchmarks).toContainText('Frontier-Bench v0.1');
    await expect(benchmarks).toContainText('Anthropic-run');
    await expect(benchmarks).toContainText('CursorBench 3.2');
    await expect(benchmarks).toContainText('Cursor-reported');
    await expect(benchmarks).toContainText('ARC-AGI-3');
    await expect(benchmarks).toContainText('ARC Prize-verified');
    await expect(benchmarks).toContainText('30.16%');
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
    expect(assessmentFacts.labCount).toBe(12);
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

    await page.reload();
    await expect(page.locator('#models')).toBeVisible();
    expect(externalRequests).toEqual([]);
    expect(errors).toEqual([]);
  });
});
