import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'https://ethiotechtutorhub.com';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // Retries are a flake *signal*, not a fix: a test that passes on retry is
  // reported as "flaky" in the HTML report and should be investigated.
  retries: isCI ? 2 : 0,
  workers: 2, // be polite to a production server (locally too)
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'chromium',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      testDir: './tests/e2e',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'a11y',
      testDir: './tests/a11y',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
