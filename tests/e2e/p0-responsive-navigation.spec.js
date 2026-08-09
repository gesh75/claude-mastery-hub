import { expect, test } from '@playwright/test';
import { expectLabRendered } from '../helpers/lab.js';
import AxeBuilder from '@axe-core/playwright';

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 512, height: 384 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 }
];
const runtimeErrorsByPage = new WeakMap();

async function loadApplication(page) {
  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') runtimeErrors.push(message.text());
  });

  await page.goto('/');
  await expectLabRendered(page);
  await expect(page.locator('#exam-host .exam-q')).toHaveCount(20);
  return runtimeErrors;
}

async function expectNoRootOverflow(page, context) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));

  expect(
    dimensions.scrollWidth,
    `${context}: root width ${dimensions.scrollWidth}px exceeds ${dimensions.clientWidth}px`
  ).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

async function expectInsideViewport(page, locator, context) {
  await expect(locator, `${context}: control should be visible`).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();

  expect(box, `${context}: control should have a layout box`).not.toBeNull();
  expect(box.x, `${context}: control starts left of the viewport`).toBeGreaterThanOrEqual(-1);
  expect(
    box.x + box.width,
    `${context}: control extends beyond the viewport`
  ).toBeLessThanOrEqual(viewport.width + 1);
}

async function exerciseResponsiveViews(page, label) {
  const longSection = page.locator('#shortcuts');
  await longSection.scrollIntoViewIfNeeded();
  await expect(longSection).toBeVisible();
  await expectNoRootOverflow(page, `${label} long-content section`);

  const codeBlock = longSection.locator('pre').first();
  await expect(codeBlock).toBeVisible();
  const codeContainment = await codeBlock.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX
  }));
  expect(['auto', 'scroll']).toContain(codeContainment.overflowX);
  expect(codeContainment.clientWidth).toBeLessThanOrEqual(page.viewportSize().width);

  const table = longSection.locator('table').first();
  await table.scrollIntoViewIfNeeded();
  const tableContainment = await table.evaluate(element => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowX: getComputedStyle(element).overflowX
  }));
  if (tableContainment.scrollWidth > tableContainment.clientWidth + 1) {
    expect(['auto', 'scroll']).toContain(tableContainment.overflowX);
  }
  await expectNoRootOverflow(page, `${label} table`);

  const quizOption = page.locator('#models .quiz .opt').first();
  await quizOption.scrollIntoViewIfNeeded();
  await expectInsideViewport(page, quizOption, `${label} quiz`);
  await quizOption.click();
  await expectNoRootOverflow(page, `${label} quiz interaction`);

  const labInput = page.locator('#lab .lab-input').first();
  await labInput.scrollIntoViewIfNeeded();
  await expectInsideViewport(page, labInput, `${label} practice lab`);
  await labInput.fill('/compact');
  const labCard = page.locator('#lab .lab-q').first();
  await labCard.getByRole('button', { name: 'Check' }).click();
  await expect(labCard.locator('.lab-fb')).toContainText('Nailed it');
  await expectNoRootOverflow(page, `${label} lab interaction`);

  const examOption = page.locator('#exam .exam-q .opt').first();
  await examOption.scrollIntoViewIfNeeded();
  await expectInsideViewport(page, examOption, `${label} exam`);
  await examOption.click();
  await expectNoRootOverflow(page, `${label} exam interaction`);
}

async function collectFullTabCycle(page, maxStops = 1200) {
  await page.locator('#menu').focus();
  const sequence = [];
  for (let index = 0; index < maxStops; index += 1) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate(() => {
      const active = document.activeElement;
      return {
        className: String(active?.className || ''),
        href: active?.getAttribute?.('href') || '',
        id: active?.id || '',
        insideSidebar: Boolean(active?.closest?.('#side')),
        sectionId: active?.closest?.('.sec')?.id || '',
        tagName: active?.tagName?.toLowerCase() || ''
      };
    });
    if (stop.id === 'menu') return sequence;
    sequence.push(stop);
  }
  throw new Error(`Keyboard focus did not cycle to the menu trigger within ${maxStops} stops`);
}

test.describe('responsive containment', () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}x${viewport.height} contains long content and learning controls`, async ({ page }) => {
      await page.setViewportSize(viewport);
      const runtimeErrors = await loadApplication(page);
      const label = `${viewport.width}x${viewport.height}`;

      await expectNoRootOverflow(page, `${label} initial render`);
      await exerciseResponsiveViews(page, label);
      expect(runtimeErrors, `${label} runtime errors`).toEqual([]);
    });
  }
});

test.describe('mobile navigation accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    runtimeErrorsByPage.set(page, await loadApplication(page));
  });

  test.afterEach(async ({ page }) => {
    expect(runtimeErrorsByPage.get(page), 'mobile navigation runtime errors').toEqual([]);
  });

  test('closed menu is absent from keyboard order and the accessibility tree', async ({ page }) => {
    test.setTimeout(120_000);
    const trigger = page.locator('#menu');
    const sidebar = page.locator('#side');

    await expect(trigger).toHaveAccessibleName('Open navigation');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-controls', 'side');
    await expect(sidebar).toBeHidden();
    expect(await sidebar.ariaSnapshot()).toBe('');

    const firstSequence = await collectFullTabCycle(page);
    expect(firstSequence.length).toBeGreaterThan(10);
    expect(firstSequence.length).toBeLessThan(1200);
    expect(firstSequence.some(item => item.insideSidebar)).toBe(false);

    await page.reload();
    await expectLabRendered(page);
    const secondSequence = await collectFullTabCycle(page);
    expect(secondSequence).toEqual(firstSequence);
  });

  test('keyboard opens and closes the menu with predictable focus', async ({ page }) => {
    const trigger = page.locator('#menu');
    const sidebar = page.locator('#side');
    const search = page.locator('#search');

    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAccessibleName('Close navigation');
    await expect(sidebar).toBeVisible();
    await expect(search).toBeFocused();
    expect(await sidebar.ariaSnapshot()).toContain('Why Master Claude');

    await page.keyboard.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAccessibleName('Open navigation');
    await expect(sidebar).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(await sidebar.ariaSnapshot()).toBe('');

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest?.('#side')))).toBe(false);
  });

  test('hash navigation only restores trigger focus when closing an open menu', async ({ page }) => {
    const trigger = page.locator('#menu');
    const sidebar = page.locator('#side');
    const closedMenuCta = page.locator('header a[href="#start-here"]');

    await closedMenuCta.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#start-here$/);
    await expect(closedMenuCta).toBeFocused();

    await trigger.focus();
    await page.keyboard.press('Enter');
    const menuLink = sidebar.locator('a[href="#models"]');
    await menuLink.focus();
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/#models$/);
    await expect(sidebar).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('resize and browser history leave mobile menu state consistent', async ({ page }) => {
    const trigger = page.locator('#menu');
    const sidebar = page.locator('#side');
    const search = page.locator('#search');

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(search).toBeFocused();

    await page.setViewportSize({ width: 1024, height: 768 });
    await expect(trigger).toBeHidden();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toHaveAttribute('aria-hidden', 'true');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(trigger).toBeVisible();
    await expect(sidebar).toBeHidden();
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    await expect(trigger).toBeFocused();

    await page.evaluate(() => history.pushState(null, '', '#models'));
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(sidebar).toBeVisible();
    await page.goBack();
    await expect(sidebar).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await page.goForward();
    await expect(sidebar).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('open and closed navigation have no detectable WCAG 2.2 AA violations', async ({ page }) => {
    const trigger = page.locator('#menu');
    const scanNavigation = () => new AxeBuilder({ page })
      .include('#menu')
      .include('#side')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const closedResults = await scanNavigation();
    expect(closedResults.violations).toEqual([]);

    await trigger.focus();
    await page.keyboard.press('Enter');
    const openResults = await scanNavigation();
    expect(openResults.violations).toEqual([]);
  });
});

test('basic navigation and learning-engine smoke test has no JavaScript errors', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  const runtimeErrors = await loadApplication(page);

  const startLink = page.getByRole('link', { name: 'Why Master Claude' });
  await startLink.click();
  await expect(page).toHaveURL(/#start-here$/);
  await expect(page.locator('#start-here')).toBeVisible();

  await expect(page.locator('#models .quiz .opt').first()).toBeVisible();
  await expect(page.locator('#lab .lab-input').first()).toBeVisible();
  await expect(page.locator('#exam .exam-q')).toHaveCount(20);
  expect(runtimeErrors).toEqual([]);
});
