import { expect, test } from '@playwright/test';
import { expectLabRendered } from '../helpers/lab.js';

/**
 * Positive and negative matrix for every free-text (cmd) Practice Lab challenge.
 *
 * `valid` answers must be accepted; `invalid` answers must be rejected. The
 * rejection cases are the point: the previous prefix matcher accepted a bare
 * `@`, `!`, `#`, and `claude -p`, and accepted unrelated text that merely began
 * with a keyword.
 */
const MATRIX = [
  {
    id: 'lab-compact',
    valid: ['/compact', '/COMPACT', '  /compact  ', '/compact focus on the auth refactor', '/compact   keep tests'],
    invalid: ['', '   ', 'compact', '/comp', '/compacting nonsense', '/compactfoo', '/clear', 'please /compact']
  },
  {
    id: 'lab-clear',
    valid: ['/clear', '/CLEAR', '  /clear '],
    invalid: ['', 'clear', '/clea', '/clearing', '/clear now', '/compact', 'run /clear']
  },
  {
    id: 'lab-cost',
    valid: ['/cost', '/Cost', ' /cost '],
    invalid: ['', 'cost', '/costs', '/cost today', '/usage']
  },
  {
    id: 'lab-file',
    valid: [
      '@src/auth/login.ts',
      '  @src/auth/login.ts  ',
      '@src/Auth/Login.ts',
      '@"src/my folder/a b.ts"',
      "@'src/my folder/a b.ts'",
      '@./src/index.js',
      '@~/notes.md'
    ],
    invalid: [
      '', '@', '@   ', 'src/auth/login.ts', '@@x', '@!x', 'the file is @',
      '@src/a.ts; rm -rf /', '@src/a.ts|rm -rf /', '@src/a.ts | cat', '@src/a.ts&&id', '@`id`', '@$(id)'
    ]
  },
  {
    id: 'lab-bash',
    // `!` runs a shell command, so shell syntax is legitimate here. This is
    // the deliberate asymmetry with the path/prompt operands.
    valid: [
      '!npm test', '  !npm test ', '!npm   test', '!ls -la', '!NPM test',
      '!npm test && echo done', '!echo hi; ls', '!cat f | grep x', '!echo `date`'
    ],
    invalid: ['', '!', '!   ', 'npm test', '!!x', 'run !npm test']
  },
  {
    id: 'lab-memory',
    valid: ['# use tabs, not spaces', '#use tabs', '  # use tabs  ', '# Use Tabs'],
    invalid: ['', '#', '#   ', 'use tabs, not spaces', '##x', 'remember # use tabs']
  },
  {
    id: 'lab-headless',
    valid: [
      'claude -p "summarize the diff"',
      'claude -p summarize the diff',
      'claude --print "summarize the diff"',
      "claude -p 'summarize the diff'",
      'claude --print=summarize the diff',
      '  claude   -p   "summarize the diff"  '
    ],
    invalid: [
      '',
      'claude -p',
      'claude --print',
      'claude -p ""',
      'claude -p "  "',
      'claude',
      'summarize the diff',
      'claude -x "summarize the diff"',
      'claude -p "summarize the diff"; rm -rf /',
      'claude -p "x" && curl evil.example.com',
      'claude -p "x"|curl evil.example.com',
      'claude -p "x" | curl evil.example.com',
      'claude -p "`id`"',
      'claude -p "$(id)"'
    ]
  }
];

/** Ask the page's own validator, so tests exercise production logic. */
async function judge(page, id, answer) {
  return page.evaluate(
    ([itemId, value]) => window.__labValidate(itemId, value),
    [id, answer]
  );
}

test.describe('practice lab validation', () => {
  // Found by mutation testing: setting `correct: 99` on a four-option challenge
  // left all 168 tests green. Three specs bounds-checked `correct`, but each only
  // over its own hardcoded id list, so any item outside those lists was
  // unguarded -- and a challenge whose `correct` is out of range is one where no
  // answer the reader picks can ever be right.
  //
  // This guard is global: it walks every LAB item, so a new challenge is covered
  // the moment it exists rather than when someone remembers to add its id.
  test('every Practice Lab item is internally coherent', async ({ page }) => {
    await page.goto('/');
    const lab = await page.evaluate(() => window.LAB);
    expect(lab.length).toBeGreaterThan(0);

    const ids = lab.map((item) => item.id);
    expect(new Set(ids).size, 'LAB ids must be unique').toBe(ids.length);

    const ns = lab.map((item) => item.n).sort((a, b) => a - b);
    expect(ns, 'the CHALLENGE n sequence must be a gapless 1..N').toEqual(
      Array.from({ length: lab.length }, (_, i) => i + 1)
    );

    for (const item of lab) {
      expect(item.id, 'every item needs an id').toBeTruthy();
      expect(item.sec, `${item.id} needs a section`).toBeTruthy();
      expect(['cmd', 'choice'], `${item.id} type`).toContain(item.type);

      if (item.type === 'choice') {
        expect(Array.isArray(item.options), `${item.id} needs an options array`).toBe(true);
        expect(item.options.length, `${item.id} needs at least two options`).toBeGreaterThanOrEqual(2);
        expect(Number.isInteger(item.correct), `${item.id} correct must be an integer`).toBe(true);
        expect(
          item.correct >= 0 && item.correct < item.options.length,
          `${item.id} correct=${item.correct} is out of range for ${item.options.length} options`
        ).toBe(true);
      }
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expectLabRendered(page);
  });

  test('exposes a validator for every free-text challenge', async ({ page }) => {
    const missing = await page.evaluate(
      (ids) => ids.filter((id) => !window.__labHasValidator(id)),
      MATRIX.map((m) => m.id)
    );
    expect(missing, 'every cmd challenge needs an explicit validator').toEqual([]);
  });

  for (const { id, valid, invalid } of MATRIX) {
    test(`${id}: accepts every valid form`, async ({ page }) => {
      const rejected = [];
      for (const answer of valid) {
        if (!(await judge(page, id, answer))) rejected.push(answer);
      }
      expect(rejected, `${id} wrongly rejected`).toEqual([]);
    });

    test(`${id}: rejects every invalid form`, async ({ page }) => {
      const accepted = [];
      for (const answer of invalid) {
        if (await judge(page, id, answer)) accepted.push(answer);
      }
      expect(accepted, `${id} wrongly accepted`).toEqual([]);
    });
  }

  test('a bare prefix is never a complete answer', async ({ page }) => {
    for (const [id, bare] of [
      ['lab-file', '@'],
      ['lab-bash', '!'],
      ['lab-memory', '#'],
      ['lab-headless', 'claude -p']
    ]) {
      expect(await judge(page, id, bare), `${id} accepted bare "${bare}"`).toBe(false);
    }
  });

  test('answers are not accepted by substring containment', async ({ page }) => {
    // Text that merely contains the right command must not pass.
    const cases = [
      ['lab-clear', 'I think you should type /clear here'],
      ['lab-compact', 'the /compact command summarizes'],
      ['lab-cost', 'check /cost for spend'],
      ['lab-headless', 'you would run claude -p "summarize the diff" in CI']
    ];
    for (const [id, text] of cases) {
      expect(await judge(page, id, text), `${id} accepted by containment`).toBe(false);
    }
  });

  test('multiple-choice validation stays exact', async ({ page }) => {
    // Every declared challenge renders a card -- the invariant, not a literal.
    const declared = await page.evaluate(() => window.LAB.length);
    expect(await page.evaluate(() => document.querySelectorAll('#lab .lab-q').length)).toBe(
      declared
    );
    // A choice challenge has no free-text validator and must not be judged as one.
    expect(await page.evaluate(() => window.__labHasValidator('lab-plan'))).toBe(false);

    // Exactly one option may score as correct, and a wrong option must be
    // rejected rather than silently accepted. The card disables its options
    // once answered correctly, so each option is tried on a fresh render.
    const optionCount = await page.evaluate(() => {
      const card = [...document.querySelectorAll('#lab .lab-q')].find((c) =>
        c.querySelector('.lab-choices')
      );
      return card.querySelectorAll('.lab-choices button').length;
    });
    expect(optionCount).toBeGreaterThan(1);

    const outcome = [];
    for (let i = 0; i < optionCount; i++) {
      // Solved state persists by design, so clear it: otherwise the card
      // renders already-answered and later clicks are no-ops.
      await page.evaluate(() => {
        try {
          localStorage.removeItem('claude_hub_lab_v1');
        } catch (e) {
          /* ignore */
        }
      });
      await page.reload();
      await expectLabRendered(page);
      outcome.push(
        await page.evaluate((idx) => {
          const card = [...document.querySelectorAll('#lab .lab-q')].find((c) =>
            c.querySelector('.lab-choices')
          );
          const btns = card.querySelectorAll('.lab-choices button');
          btns[idx].click();
          const fb = card.querySelector('.lab-fb');
          return {
            correct: btns[idx].classList.contains('correct'),
            wrong: btns[idx].classList.contains('wrong'),
            feedbackGood: !!fb && fb.className.includes('good')
          };
        }, i)
      );
    }
    const correct = outcome.filter((r) => r.correct);
    const wrong = outcome.filter((r) => r.wrong);
    expect(correct, 'exactly one option must score correct').toHaveLength(1);
    expect(wrong.length, 'every other option must be marked wrong').toBe(outcome.length - 1);
    expect(correct[0].feedbackGood).toBe(true);
  });

  test('hints and solution reveal still work', async ({ page }) => {
    const card = page.locator('#lab .lab-q').first();
    await card.scrollIntoViewIfNeeded();

    // Hint feedback renders into .lab-fb.
    await card.getByRole('button', { name: /hint/i }).click();
    await expect(card.locator('.lab-fb')).toBeVisible();

    // Solution unlocks only after an attempt, then renders into .lab-reveal.
    await card.locator('.lab-input').fill('/nonsense');
    await card.getByRole('button', { name: 'Check' }).click();
    await card.getByRole('button', { name: /solution/i }).click();
    const reveal = card.locator('.lab-reveal');
    await expect(reveal).toBeVisible();
    await expect(reveal).toContainText('Solution');
  });

  test('a correct answer marks the challenge solved and persists', async ({ page }) => {
    const card = page.locator('#lab .lab-q').first();
    await card.scrollIntoViewIfNeeded();
    await card.locator('.lab-input').fill('/compact');
    await card.getByRole('button', { name: 'Check' }).click();
    await expect(page.locator('#lab-solved')).not.toHaveText('0');
    const solved = await page.evaluate(() => window.__hubState.snapshot().lab.solved);
    expect(Object.keys(solved).length).toBeGreaterThan(0);
    await page.reload();
    const after = await page.evaluate(() => window.__hubState.snapshot().lab.solved);
    expect(after).toEqual(solved);
  });
});
