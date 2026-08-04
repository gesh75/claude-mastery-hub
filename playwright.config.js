import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

export default defineConfig({
  // Resolve from the tested checkout rather than this file. CI deliberately
  // loads this config from a trusted base-commit checkout while testing the PR.
  testDir: path.resolve(process.cwd(), 'tests/e2e'),
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 2,
  // The JSON report is what scripts/check-test-results.mjs reads to prove the
  // suite actually ran the tests it claims to. Keep it in every environment so
  // the guard is runnable locally, not just in CI.
  reporter: [
    ['line'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
