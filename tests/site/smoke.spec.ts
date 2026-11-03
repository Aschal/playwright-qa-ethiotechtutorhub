import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES, ACCOUNT_PAGES } from '../../test-data/site';

/**
 * The cheapest useful check there is: does every public page still answer,
 * and does it render something rather than an error page?
 *
 * Most outages and bad deployments show up here first. A page that returns
 * 500, or returns 200 with an empty body, fails before any deeper test has
 * to run.
 */

test.describe('Public pages are available @smoke', () => {
  for (const page_ of PUBLIC_PAGES) {
    test(`${page_.name} responds and renders`, async ({ page }) => {
      const response = await page.goto(page_.path, {
        waitUntil: 'domcontentloaded',
      });

      // The status itself. A redirect to a working page is acceptable;
      // a client or server error is not.
      expect(response, `no response for ${page_.path}`).not.toBeNull();
      expect(
        response!.status(),
        `${page_.path} returned ${response!.status()}`,
      ).toBeLessThan(400);

      // A page can return 200 and still be broken, so check it rendered.
      await expect(page).toHaveTitle(/.+/);

      const bodyText = await page.locator('body').innerText();
      expect(
        bodyText.trim().length,
        `${page_.path} rendered an empty body`,
      ).toBeGreaterThan(100);
    });
  }
});

test.describe('Account pages render', () => {
  // These pages are checked for rendering only. Nothing is ever submitted
  // to them -- see README, "Not covered".
  for (const page_ of ACCOUNT_PAGES) {
    test(`${page_.name} page renders a form`, async ({ page }) => {
      const response = await page.goto(page_.path, {
        waitUntil: 'domcontentloaded',
      });

      expect(response!.status()).toBeLessThan(400);
      await expect(page.locator('form').first()).toBeVisible();
    });
  }
});

test.describe('Error handling', () => {
  test('an unknown URL does not return a server error', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-qa-check', {
      waitUntil: 'domcontentloaded',
    });

    // 404 is correct. 200 with a helpful page is acceptable. A 5xx means the
    // server fell over on an unknown path, which is a real defect.
    expect(
      response!.status(),
      'unknown URL produced a server error',
    ).toBeLessThan(500);
  });
});
