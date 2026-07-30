import { expect, test } from '@playwright/test';

const K = {
  mastery: 'claude_hub_mastery_v1',
  quiz: 'claude_hub_quiz_v1',
  exam: 'claude_hub_exam_v1',
  lab: 'claude_hub_lab_v1',
  nav: 'claude_hub_nav_v1'
};

/** Seed localStorage before any page script runs, then load. */
async function loadWith(page, entries) {
  // addInitScript re-runs on every navigation, so guard with a sessionStorage
  // sentinel: seed once, then let reloads exercise the real persisted value.
  await page.addInitScript((seed) => {
    try {
      if (sessionStorage.getItem('__seeded') === '1') return;
      localStorage.clear();
      for (const [k, v] of Object.entries(seed)) localStorage.setItem(k, v);
      sessionStorage.setItem('__seeded', '1');
    } catch (e) {
      /* storage unavailable */
    }
  }, entries);
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto('/');
  await expect(page.locator('#models')).toBeVisible();
  return errors;
}

const masteryPct = (page) =>
  page.evaluate(() => {
    const b = document.querySelector('#ring b');
    return b ? Number(String(b.textContent).replace('%', '')) : null;
  });

test.describe('persisted state integrity', () => {
  test('malformed JSON in every key still boots cleanly', async ({ page }) => {
    const errors = await loadWith(page, {
      [K.mastery]: '{not json',
      [K.quiz]: '}{',
      [K.exam]: '[[[',
      [K.lab]: 'undefined',
      [K.nav]: '{'
    });
    expect(errors).toEqual([]);
    expect(await masteryPct(page)).toBe(0);
  });

  test('wrong primitive types do not crash startup', async ({ page }) => {
    const errors = await loadWith(page, {
      [K.mastery]: '"a string"',
      [K.quiz]: '42',
      [K.exam]: 'true',
      [K.lab]: '3.14'
    });
    expect(errors).toEqual([]);
    expect(await masteryPct(page)).toBe(0);
  });

  test('null values fall back to defaults', async ({ page }) => {
    const errors = await loadWith(page, {
      [K.mastery]: 'null',
      [K.quiz]: 'null',
      [K.exam]: 'null',
      [K.lab]: 'null'
    });
    expect(errors).toEqual([]);
    expect(await masteryPct(page)).toBe(0);
  });

  test('arrays where objects are expected are rejected', async ({ page }) => {
    const errors = await loadWith(page, {
      [K.mastery]: '[1,2,3]',
      [K.quiz]: '[]',
      [K.exam]: '[{"best":9}]',
      [K.lab]: '["solved"]'
    });
    expect(errors).toEqual([]);
    expect(await masteryPct(page)).toBe(0);
  });

  test('oversized stored values fail safely', async ({ page }) => {
    const huge = JSON.stringify({ v: 2, done: Object.fromEntries(
      Array.from({ length: 20000 }, (_, i) => [`k${i}`, true])
    ) });
    const errors = await loadWith(page, { [K.mastery]: huge });
    expect(errors).toEqual([]);
    const pct = await masteryPct(page);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  test('negative and non-finite numbers are clamped', async ({ page }) => {
    const errors = await loadWith(page, {
      [K.exam]: JSON.stringify({ v: 2, best: -50, total: 20 }),
      [K.quiz]: JSON.stringify({ v: 2, sections: { models: { best: -3, total: 3, reps: -9 } } }),
      [K.lab]: JSON.stringify({ v: 2, solved: {}, best: -7, streak: -4 })
    });
    expect(errors).toEqual([]);
    const s = await page.evaluate(() => window.__hubState.snapshot());
    expect(s.exam.best).toBeGreaterThanOrEqual(0);
    expect(s.lab.best).toBeGreaterThanOrEqual(0);
    expect(s.lab.streak).toBeGreaterThanOrEqual(0);
    for (const rec of Object.values(s.quiz.sections)) {
      expect(rec.best).toBeGreaterThanOrEqual(0);
      expect(rec.reps).toBeGreaterThanOrEqual(0);
    }
  });

  test('NaN and Infinity are rejected', async ({ page }) => {
    const errors = await loadWith(page, {
      [K.exam]: '{"v":2,"best":1e999,"total":20}',
      [K.lab]: '{"v":2,"solved":{},"best":null,"streak":1e999}'
    });
    expect(errors).toEqual([]);
    const s = await page.evaluate(() => window.__hubState.snapshot());
    expect(Number.isFinite(s.exam.best)).toBe(true);
    expect(Number.isFinite(s.lab.streak)).toBe(true);
  });

  test('unknown solved and mastery IDs never push mastery over 100%', async ({ page }) => {
    const bogus = Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`ghost-${i}`, true]));
    const errors = await loadWith(page, {
      [K.mastery]: JSON.stringify({ v: 2, done: bogus })
    });
    expect(errors).toEqual([]);
    const pct = await masteryPct(page);
    expect(pct).toBeLessThanOrEqual(100);
    expect(pct).toBe(0); // none of the ghost ids is a real section
  });

  test('a 110% mastery input is clamped to 100%', async ({ page }) => {
    const real = await (async () => {
      await page.goto('/');
      return page.evaluate(() =>
        [...document.querySelectorAll('.master-cb')].map((c) => c.getAttribute('data-id'))
      );
    })();
    const done = Object.fromEntries(real.map((id) => [id, true]));
    for (let i = 0; i < 20; i++) done[`extra-${i}`] = true; // would be >100% if counted
    const errors = await loadWith(page, { [K.mastery]: JSON.stringify({ v: 2, done }) });
    expect(errors).toEqual([]);
    expect(await masteryPct(page)).toBe(100);
  });

  test('solved is a set of only truthy flags, whatever the input shape', async ({ page }) => {
    // JSON.parse already collapses duplicate object keys (last wins), so
    // asserting key uniqueness would be vacuous. What matters is the value
    // filter: only true/1 becomes solved, and every other shape is dropped.
    const errors = await loadWith(page, {
      [K.lab]:
        '{"v":2,"solved":{"lab1":true,"lab2":1,"lab3":false,"lab4":0,"lab5":null,' +
        '"lab6":"true","lab7":[],"lab8":{}},"best":0}'
    });
    expect(errors).toEqual([]);
    const solved = await page.evaluate(() => window.__hubState.snapshot().lab.solved);
    expect(solved).toEqual({ lab1: true, lab2: true });
    // Every retained value is exactly boolean true, never a coerced truthy.
    for (const v of Object.values(solved)) expect(v).toBe(true);
  });

  test('an excessive key count is bounded independently of value length', async ({ page }) => {
    // Distinct from the oversized-value test: this payload is short enough to
    // pass the length guard but wide enough to exercise the key-count cap.
    const wide = { v: 2, solved: {} };
    for (let i = 0; i < 6000; i++) wide.solved[`s${i}`] = true;
    const raw = JSON.stringify(wide);
    const errors = await loadWith(page, { [K.lab]: raw });
    expect(errors).toEqual([]);
    const solved = await page.evaluate(() => window.__hubState.snapshot().lab.solved);
    const kept = Object.keys(solved).length;
    expect(kept).toBeGreaterThan(0);
    expect(kept, 'key count must be capped').toBeLessThanOrEqual(2000);
  });

  test('prototype-pollution keys are stripped', async ({ page }) => {
    const errors = await loadWith(page, {
      [K.mastery]: '{"v":2,"done":{"__proto__":{"polluted":true},"constructor":true}}',
      [K.lab]: '{"v":2,"solved":{"__proto__":{"x":1}},"best":0}'
    });
    expect(errors).toEqual([]);
    const clean = await page.evaluate(() => ({
      objPolluted: {}.polluted === undefined,
      snapKeys: Object.keys(window.__hubState.snapshot().mastery.done)
    }));
    expect(clean.objPolluted).toBe(true);
    expect(clean.snapKeys).not.toContain('__proto__');
    expect(clean.snapKeys).not.toContain('constructor');
  });

  test('legacy unversioned state migrates without losing progress', async ({ page }) => {
    await page.goto('/');
    const real = await page.evaluate(() =>
      [...document.querySelectorAll('.master-cb')].map((c) => c.getAttribute('data-id'))
    );
    const legacy = { [real[0]]: true, [real[1]]: true };
    const errors = await loadWith(page, {
      [K.mastery]: JSON.stringify(legacy),
      [K.exam]: JSON.stringify({ best: 12, total: 20, ts: 1 }),
      [K.lab]: JSON.stringify({ solved: { lab1: true }, best: 1 })
    });
    expect(errors).toEqual([]);
    const s = await page.evaluate(() => window.__hubState.snapshot());
    expect(s.mastery.v).toBe(2);
    expect(s.mastery.done[real[0]]).toBe(true);
    expect(s.mastery.done[real[1]]).toBe(true);
    expect(s.exam.best).toBe(12);
    expect(s.lab.solved.lab1).toBe(true);
  });

  test('migration is idempotent', async ({ page }) => {
    await page.goto('/');
    const real = await page.evaluate(() =>
      [...document.querySelectorAll('.master-cb')].map((c) => c.getAttribute('data-id'))
    );
    await loadWith(page, { [K.mastery]: JSON.stringify({ [real[0]]: true }) });
    const first = await page.evaluate(() => localStorage.getItem('claude_hub_mastery_v1'));
    await page.reload();
    await page.reload();
    const after = await page.evaluate(() => localStorage.getItem('claude_hub_mastery_v1'));
    expect(JSON.parse(after)).toEqual(JSON.parse(first));
  });

  test('an unknown future version falls back safely and keeps usable progress', async ({ page }) => {
    await page.goto('/');
    const real = await page.evaluate(() =>
      [...document.querySelectorAll('.master-cb')].map((c) => c.getAttribute('data-id'))
    );
    const errors = await loadWith(page, {
      [K.mastery]: JSON.stringify({ v: 9999, done: { [real[0]]: true }, futureField: 'x' })
    });
    expect(errors).toEqual([]);
    const pct = await masteryPct(page);
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
    const s = await page.evaluate(() => window.__hubState.snapshot());
    expect(s.mastery.done[real[0]]).toBe(true);
  });

  test('progress survives reload', async ({ page }) => {
    await loadWith(page, {});
    const id = await page.evaluate(() => {
      const cb = document.querySelector('.master-cb');
      cb.checked = true;
      cb.dispatchEvent(new Event('change'));
      return cb.getAttribute('data-id');
    });
    await page.reload();
    await expect(page.locator('#models')).toBeVisible();
    const s = await page.evaluate(() => window.__hubState.snapshot());
    expect(s.mastery.done[id]).toBe(true);
  });

  test('two tabs merge solved items instead of overwriting', async ({ page }) => {
    await page.goto('/');
    const real = await page.evaluate(() =>
      [...document.querySelectorAll('.master-cb')].map((c) => c.getAttribute('data-id'))
    );
    await loadWith(page, { [K.mastery]: JSON.stringify({ v: 2, done: { [real[0]]: true } }) });

    // Simulate another tab writing a DIFFERENT section, then notifying us.
    const merged = await page.evaluate(
      ([key, other]) => {
        const incoming = { v: 2, done: { [other]: true }, resetAt: 0 };
        localStorage.setItem(key, JSON.stringify(incoming));
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(incoming),
            storageArea: localStorage
          })
        );
        return window.__hubState.snapshot().mastery.done;
      },
      [K.mastery, real[1]]
    );
    // Neither tab's work is lost.
    expect(merged[real[0]]).toBe(true);
    expect(merged[real[1]]).toBe(true);
  });

  test('a stale tab cannot lower any max-merged field', async ({ page }) => {
    await loadWith(page, {
      [K.exam]: JSON.stringify({ v: 2, best: 18, total: 20, ts: 500 }),
      [K.lab]: JSON.stringify({ v: 2, solved: { lab1: true }, best: 9, streak: 7 }),
      [K.quiz]: JSON.stringify({ v: 2, sections: { models: { best: 3, total: 3, reps: 5, ts: 900 } } })
    });
    const after = await page.evaluate(
      ([examKey, labKey, quizKey]) => {
        const push = (key, value) => {
          const raw = JSON.stringify(value);
          localStorage.setItem(key, raw);
          window.dispatchEvent(
            new StorageEvent('storage', { key, newValue: raw, storageArea: localStorage })
          );
        };
        push(examKey, { v: 2, best: 3, total: 5, ts: 1 });
        push(labKey, { v: 2, solved: {}, best: 1, streak: 0 });
        push(quizKey, { v: 2, sections: { models: { best: 1, total: 3, reps: 0, ts: 2 } } });
        return window.__hubState.snapshot();
      },
      [K.exam, K.lab, K.quiz]
    );
    // Every max-merged field holds its higher value.
    expect(after.exam.best).toBe(18);
    expect(after.exam.total).toBe(20);
    expect(after.exam.ts).toBe(500);
    expect(after.lab.best).toBe(9);
    expect(after.lab.streak).toBe(7);
    expect(after.quiz.sections.models.best).toBe(3);
    expect(after.quiz.sections.models.reps).toBe(5);
    expect(after.quiz.sections.models.ts).toBe(900);
    // And a union field is not lost by the stale write either.
    expect(after.lab.solved.lab1).toBe(true);
  });

  test('an explicit reset propagates across tabs', async ({ page }) => {
    await page.goto('/');
    const real = await page.evaluate(() =>
      [...document.querySelectorAll('.master-cb')].map((c) => c.getAttribute('data-id'))
    );
    await loadWith(page, {
      [K.mastery]: JSON.stringify({ v: 2, done: { [real[0]]: true }, resetAt: 0 })
    });
    const after = await page.evaluate(
      ([key]) => {
        const reset = { v: 2, done: {}, resetAt: Date.now() + 1000 };
        localStorage.setItem(key, JSON.stringify(reset));
        window.dispatchEvent(
          new StorageEvent('storage', { key, newValue: JSON.stringify(reset), storageArea: localStorage })
        );
        return window.__hubState.snapshot().mastery.done;
      },
      [K.mastery]
    );
    expect(Object.keys(after)).toEqual([]);
  });

  test('state handling stays offline and error-free', async ({ page }) => {
    const external = [];
    page.on('request', (r) => {
      if (!r.url().startsWith('http://127.0.0.1:4173')) external.push(r.url());
    });
    const errors = await loadWith(page, {
      [K.mastery]: '{"v":2,"done":{"__proto__":1}}',
      [K.quiz]: 'garbage',
      [K.lab]: '[]'
    });
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
});
