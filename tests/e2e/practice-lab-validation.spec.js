import { expect, test } from '@playwright/test';

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
    invalid: ['', '@', '@   ', 'src/auth/login.ts', '@@x', '@!x', 'the file is @', '@src/a.ts; rm -rf /']
  },
  {
    id: 'lab-bash',
    valid: ['!npm test', '  !npm test ', '!npm   test', '!ls -la', '!NPM test'],
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
      'claude -p "x" && curl evil.example.com'
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
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#lab-total')).toHaveText('12');
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
    const result = await page.evaluate(() => {
      const card = document.querySelector('#lab .lab-q');
      return { hasChoiceCards: !!card, total: document.querySelectorAll('#lab .lab-q').length };
    });
    expect(result.hasChoiceCards).toBe(true);
    expect(result.total).toBe(12);
    // A choice challenge has no free-text validator and must not be judged as one.
    expect(await page.evaluate(() => window.__labHasValidator('lab-plan'))).toBe(false);
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
