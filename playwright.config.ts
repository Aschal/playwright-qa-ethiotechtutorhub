import { defineConfig, devices } from '@playwright/test';

/**
 * This suite runs against the live site, which has real users on it.
 *
 * 1. Nothing here writes data on purpose: no account, no form submission,
 *    no comment. Page views are still recorded by the site's own tracker
 *    (see README, "What the suite still writes").
 * 2. Requests that send injection payloads only run when
 *    ETTH_INJECTION_TESTS=1 is set, and that should never be against
 *    production. See tests/security/.
 * 3. Workers are kept low on purpose. A test suite should not be the
 *    heaviest traffic the site sees.
 */

const BASE_URL = process.env.BASE_URL ?? 'https://ethiotechtutorhub.com';
const isCI = !!process.env.CI;

// Every request is tagged so it can be told apart in the server's access
// logs. NOTE: the site's analytics tracker stores no user agent and no
// headers, so this does NOT keep test traffic out of `analytics_events`.
const QA_HEADER = { 'X-Test-Suite': 'etth-qa' };
const QA_UA_TOKEN = 'ETTH-QA/1.0';

/** A device profile with the QA token appended, so mobile detection still works. */
const tagged = (device: (typeof devices)[string]) => ({
  ...device,
  userAgent: `${device.userAgent} ${QA_UA_TOKEN}`,
});

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry absorbs a genuine network blip on a live site. A test that
  // passes only on retry is still reported as "flaky" and should be looked at.
  retries: 1,
  workers: 2, // be polite to a production server
  timeout: 45_000,
  expect: { timeout: 15_000 },
  reporter: [
    ...(isCI ? [['github'] as const] : []),
    ['list'],
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: QA_HEADER,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      // HTTP-level tests against the search endpoint. No browser.
      name: 'api',
      testDir: './tests/api',
      use: { userAgent: `${QA_UA_TOKEN} (Playwright API)` },
    },
    {
      // Course search journeys, desktop.
      name: 'chromium',
      testDir: './tests/e2e',
      use: tagged(devices['Desktop Chrome']),
    },
    {
      // The same journeys on a phone profile.
      name: 'mobile-chrome',
      testDir: './tests/e2e',
      use: tagged(devices['Pixel 7']),
    },
    {
      // Whole-site checks: availability, navigation, links, responsive layout.
      // Sets its own viewports where it needs them.
      name: 'site',
      testDir: './tests/site',
      use: tagged(devices['Desktop Chrome']),
    },
    {
      name: 'a11y',
      testDir: './tests/a11y',
      use: tagged(devices['Desktop Chrome']),
    },
    {
      // XSS / SQL-injection payloads. Skipped unless ETTH_INJECTION_TESTS=1.
      name: 'security',
      testDir: './tests/security',
      use: tagged(devices['Desktop Chrome']),
    },
  ],
});
