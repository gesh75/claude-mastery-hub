---
applyTo: "tests/**"
---

# Tests

This repo's tests are **Playwright specs in JavaScript** (`tests/e2e/*.spec.js` using
`@playwright/test`). There is no Python here - do not suggest pytest, fixtures, or
`unittest.mock`.

- Run with `npx playwright test`. A single spec: `npx playwright test tests/e2e/<name>.spec.js`.
- Use `test.describe()` / `test()` blocks and web-first assertions (`await expect(locator)`),
  never bare `assert`.
- Prefer role- and text-based locators (`getByRole`, `getByText`) over CSS or XPath - they
  survive markup changes and assert accessibility at the same time.
- Never use fixed `waitForTimeout` sleeps. Rely on auto-waiting locators and
  `expect(...).toBeVisible()`.
- Accessibility is enforced via `@axe-core/playwright`. A contrast or ARIA regression fails
  CI, so check any markup change against the existing axe assertions.
- The site is a single self-contained `index.html`; tests load it directly. Keep specs
  independent - each must pass when run alone.
