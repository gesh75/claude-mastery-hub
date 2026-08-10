import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const ROOT = new URL('../../', import.meta.url);

/**
 * Evaluating your own agent: the largest curriculum gap this page had.
 *
 * Every claim here is durable methodology from
 * https://platform.claude.com/docs/en/test-and-evaluate/develop-tests, plus one
 * cross-reference to https://platform.claude.com/docs/en/managed-agents/define-outcomes
 * as a real shipped instance of the same pattern. This is deliberately the lowest
 * fact-risk content PR in the programme: it names no model and carries no beta
 * header, so there is no MODEL_SOURCES/registry addition and no dated provenance
 * to maintain.
 */
test.describe('evaluating your own agent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('the section exists, is tracked, and sits between Cost and Security', async ({
    page
  }) => {
    const section = page.locator('#evals');
    await expect(section).toHaveCount(1);
    await expect(section).toHaveAttribute('data-id', 'evals');
    await expect(section.locator('.sec-num')).toHaveText(/^SECTION \d{2}$/);
    await expect(section.locator('input.master-cb[data-id="evals"]')).toHaveCount(1);

    const link = page.locator('a.nav-link[href="#evals"]');
    await expect(link).toHaveCount(1);
    const placement = await page.evaluate(() => {
      const a = document.querySelector('a.nav-link[href="#evals"]');
      const track = a?.closest('.nav-track');
      return {
        prevId: a?.previousElementSibling?.getAttribute('data-id') ?? null,
        nextId: a?.nextElementSibling?.getAttribute('data-id') ?? null,
        trackTitle: track?.querySelector('.nav-track-h')?.textContent?.trim() ?? ''
      };
    });
    expect(placement.prevId).toBe('cost');
    expect(placement.nextId).toBe('security');
    expect(placement.trackTitle).toContain('Mastery');

    const ordinals = await page.evaluate(() => {
      const bannerFor = (id) => {
        const el = document.querySelector(`section.sec#${id} .sec-num`);
        const m = el?.textContent.trim().match(/^SECTION (\d+)$/);
        return m ? Number(m[1]) : null;
      };
      return { cost: bannerFor('cost'), evals: bannerFor('evals'), security: bannerFor('security') };
    });
    expect(ordinals.evals).toBe(ordinals.cost + 1);
    expect(ordinals.security).toBe(ordinals.evals + 1);
  });

  // GUARD, not a regression test — it also passes on today's clean main (the
  // existing sequence is already 1..40 with no gaps). Its job is to catch a
  // FUTURE section-adding PR (PR 4, per COOKBOOK_TRACKS.md) from shipping a
  // duplicate or a gap after this PR's renumber. Mirrors the identical
  // assertion already shipped in managed-agents.spec.js for the same reason,
  // and content-counts.spec.js's diagram-drift guard, which carries the same
  // "Honest status" disclosure — state it the same way in the PR body.
  test('section numbers still run consecutively with no gaps or duplicates', async ({
    page
  }) => {
    const banners = await page.evaluate(() =>
      [...document.querySelectorAll('.sec-num')].map((el) => el.textContent.trim())
    );
    const numbered = banners
      .filter((t) => /^SECTION \d{2}$/.test(t))
      .map((t) => Number(t.slice(8)));
    expect(numbered).toEqual(Array.from({ length: numbered.length }, (_, i) => i + 1));
  });

  test('the grader example is defensive: final verdict, untrusted input, bounded loop', async ({
    page
  }) => {
    const section = page.locator('#evals');
    // Parse the LAST verdict, not any occurrence -- a grader that quotes the
    // positive tag as an example and then rules against it must not score a pass.
    await expect(section).toContainText('matches[-1]');
    await expect(section).toContainText('no verdict');
    // The candidate answer is untrusted: it can close the delimiter and address
    // the grader directly. Running the grader elsewhere does not prevent that.
    await expect(section).toContainText('UNTRUSTED');
    await expect(section).toContainText('never instructions to follow');
    await expect(section).toContainText('[/answer]');
    // The retry loop is bounded, so a rubric the task cannot satisfy escalates
    // instead of spending forever.
    await expect(section).toContainText('MAX_ROUNDS');
    await expect(section).toContainText('escalate');
  });

  test('the grading table order matches the ranking the heading claims', async ({ page }) => {
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('#evals table')]
        .map((t) => [...t.querySelectorAll('tbody tr td:first-child')].map((td) => td.textContent.trim()))
        .find((rows) => rows.some((r) => r.includes('Code-based')))
    );
    // Ranked by speed, reliability and scale: code-based, then LLM-based, then
    // human as the last resort the prose tells you to avoid.
    expect(order).toEqual(['Code-based', 'LLM-based', 'Human']);
  });

  test('the four parts of an eval are taught, golden-answer-first', async ({ page }) => {
    const section = page.locator('#evals');
    for (const part of ['Input prompt', 'Output', 'Golden answer', 'Score']) {
      await expect(section, `${part} must appear`).toContainText(part);
    }
    await expect(section).toContainText('before you look at what the model produced');
  });

  test('the three grading methods are ranked, with code-based preferred', async ({
    page
  }) => {
    const section = page.locator('#evals');
    await expect(section).toContainText('Code-based');
    await expect(section).toContainText('Human');
    await expect(section).toContainText('LLM-based');
    await expect(section).toContainText('output == golden_answer');
    await expect(section).toContainText('Avoid if possible');
    await expect(section).toContainText("it's the first choice");
  });

  test('LLM-based grading tips are taught with a model-free reusable template', async ({
    page
  }) => {
    const section = page.locator('#evals');
    await expect(section).toContainText('Detailed, unambiguous rubrics');
    await expect(section).toContainText('Force a narrow output format');
    await expect(section).toContainText('Reason, then discard the reasoning');
    await expect(section).toContainText('build_grader_prompt');
    await expect(section).toContainText('parse_grade');
  });

  test('self-grading bias is taught, with the Managed Agents Outcomes grader as a real instance', async ({
    page
  }) => {
    const section = page.locator('#evals');
    await expect(section).toContainText('default failure mode is a grader that approves everything');
    await expect(section).toContainText('separate context');
    const link = section.locator('a[href="#managed-agents"]');
    await expect(link).toHaveCount(1);
    await expect(section).toContainText('Outcomes');
  });

  test('eval design principles are taught, including volume over quality', async ({
    page
  }) => {
    const section = page.locator('#evals');
    await expect(section).toContainText('Be task-specific');
    await expect(section).toContainText('Automate when possible');
    await expect(section).toContainText('Prioritize volume over quality');
    await expect(section).toContainText('counter-intuitive');
  });

  test('synthetic test-case generation is taught for building a test set', async ({
    page
  }) => {
    await expect(page.locator('#evals')).toContainText('synthetic variable values');
  });

  test('the evaluator-optimizer loop is taught and contrasted with the workflows Find, fix, test pattern', async ({
    page
  }) => {
    const section = page.locator('#evals');
    await expect(section).toContainText('generate(task');
    // The loop's shape, not its keyword: it grades, folds feedback back in, and
    // retries. Pinning `while` broke the moment the example was bounded.
    await expect(section).toContainText('verdict, feedback = grade(');
    await expect(section).toContainText('context.append(');
    await expect(section).toContainText('Find → fix → test loop');
    await expect(section).toContainText('binary, code-based');
    await expect(section).toContainText('graded, judgment-bearing');
    const link = section.locator('a[href="#workflows"]');
    await expect(link).toHaveCount(1);
  });

  test('the two grading hygiene rules are taught', async ({ page }) => {
    const section = page.locator('#evals');
    await expect(section).toContainText('Grade the final answer, not the whole transcript');
    await expect(section).toContainText('Hold the grader fixed');
  });

  test('tool-quality introspection is taught as a distinct technique', async ({ page }) => {
    await expect(page.locator('#evals')).toContainText('grading the tools, not the answer');
  });

  test('primary sources are cited as plain links, with no registry block introduced', async ({
    page
  }) => {
    const section = page.locator('#evals');
    await expect(
      section.locator('a[href="https://platform.claude.com/docs/en/test-and-evaluate/develop-tests"]')
    ).toHaveCount(1);
    // Cited twice on purpose: inline where the Outcomes grader is described, and
    // again in the section's Primary sources line. The inline one exists because
    // the sentence used to point readers at #managed-agents for Outcomes, and
    // "outcome" has zero hits in that section -- so the link now goes to the doc
    // that actually documents it. Assert it is cited, not how many times.
    expect(
      await section
        .locator('a[href="https://platform.claude.com/docs/en/managed-agents/define-outcomes"]')
        .count(),
      'the Outcomes grader must be cited where it is claimed'
    ).toBeGreaterThanOrEqual(1);
    // Negative assertion on THIS PR's own choice, not on beta surface — DECISION_LOG
    // 2026-07-29 rules out forbidding a legitimate value; this forbids a pattern this
    // brief deliberately did not use, which is a design assertion, not a beta-spelling
    // lock-in.
    await expect(section.locator('ul.cites[data-model-sources]')).toHaveCount(0);
  });

  test('no model is named anywhere in the section', async ({ page }) => {
    const text = await page.locator('#evals').innerText();
    expect(text).not.toMatch(/claude-(opus|sonnet|haiku|fable|mythos)-\d/i);
    expect(text).not.toMatch(/\bOpus\s?\d|\bSonnet\s?\d|\bHaiku\s?\d/i);
  });

  test('all four dangling "evals" mentions elsewhere on the page now link here', async ({
    page
  }) => {
    const whatsNew = page.locator('#whats-new');
    await expect(whatsNew.locator('a[href="#evals"]')).toHaveCount(3);
    const apiSdk = page.locator('#api-sdk');
    await expect(apiSdk.locator('a[href="#evals"]')).toHaveCount(1);
  });

  test('the footer master citation list gains both new sources', async ({ page }) => {
    const footer = page.locator('footer ul.cites');
    await expect(
      footer.locator('a[href="https://platform.claude.com/docs/en/test-and-evaluate/develop-tests"]')
    ).toHaveCount(1);
    await expect(
      footer.locator('a[href="https://platform.claude.com/docs/en/managed-agents/define-outcomes"]')
    ).toHaveCount(1);
  });

  test('the quiz gains five well-formed Evals questions', async ({ page }) => {
    const quiz = await page.evaluate(() => window.QUIZ.evals);
    expect(Array.isArray(quiz)).toBe(true);
    expect(quiz.length).toBeGreaterThanOrEqual(5);
    for (const item of quiz) {
      expect(Array.isArray(item.o) && item.o.length >= 3, item.q).toBe(true);
      expect(Number.isInteger(item.c) && item.c >= 0 && item.c < item.o.length, item.q).toBe(true);
      expect(typeof item.e === 'string' && item.e.length > 0, item.q).toBe(true);
    }
  });

  test('the three new Lab challenges are well-formed choice items with collision-free ids', async ({
    page
  }) => {
    const ids = ['lab-eval-method', 'lab-eval-bias', 'lab-eval-tag'];
    const all = await page.evaluate(() => window.LAB);
    const seen = {};
    for (const item of all) {
      expect(seen[item.id], `duplicate LAB id ${item.id}`).toBeFalsy();
      seen[item.id] = true;
    }
    for (const id of ids) {
      const item = all.find((it) => it.id === id);
      expect(item, `${id} must exist`).toBeTruthy();
      expect(item.type).toBe('choice');
      expect(item.sec).toBe('evals');
      expect(item.options.length).toBeGreaterThanOrEqual(3);
      expect(Number.isInteger(item.correct)).toBe(true);
      expect(item.correct).toBeGreaterThanOrEqual(0);
      expect(item.correct).toBeLessThan(item.options.length);
    }
  });
});
