import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES } from '../../test-data/site';

/**
 * A page can be perfectly healthy and still be unreachable, if the link that
 * is supposed to get you there is wrong. These checks cover the route rather
 * than the destination.
 */

/**
 * The site uses relative hrefs ("pricing.php"), not absolute paths
 * ("/pricing.php"). Comparing on the file name matches both, and also
 * matches a fully qualified URL, so the check does not depend on which
 * style the markup happens to use.
 */
function fileNameOf(path: string): string {
  return path.replace(/^\//, '');
}

test.describe('Navigation', () => {
  test('every public page is linked from the homepage', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hrefs = await page.locator('a[href]').evaluateAll((links) =>
      links.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''),
    );

    const missing: string[] = [];

    for (const target of PUBLIC_PAGES) {
      if (target.path === '/') continue;

      const file = fileNameOf(target.path);
      if (!hrefs.some((href) => href.includes(file))) {
        missing.push(`${target.name} (${target.path})`);
      }
    }

    expect(
      missing,
      `pages not linked from the homepage: ${missing.join(', ')}`,
    ).toEqual([]);
  });

  test('clicking through to Courses reaches the Courses page', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Filtering to visible links matters: the same destination often appears
    // in both the desktop nav and a collapsed mobile menu, and only one of
    // them is clickable at any given viewport.
    await page
      .locator('a[href*="courses.php"]')
      .filter({ visible: true })
      .first()
      .click();

    await expect(page).toHaveURL(/courses\.php/);
    await expect(page.locator('body')).toContainText(/course/i);
  });

  test('clicking through to Pricing reaches the Pricing page', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    await page
      .locator('a[href*="pricing.php"]')
      .filter({ visible: true })
      .first()
      .click();

    await expect(page).toHaveURL(/pricing\.php/);
  });

  test('the logo returns to the homepage', async ({ page }) => {
    await page.goto('/courses.php', { waitUntil: 'domcontentloaded' });

    const home = page
      .locator('header a[href="/"], header a[href="index.php"], header a[href="./"]')
      .filter({ visible: true })
      .first();

    const count = await home.count();
    test.skip(count === 0, 'no visible header link to the homepage found');

    await home.click();
    await expect(page).toHaveURL(/\/(index\.php)?$/);
  });

  /**
   * A link whose href is "#" or empty renders as a link, looks clickable,
   * and does nothing. It is a common way for a feature to be half-shipped:
   * the control is visible, so users try it, and nothing happens.
   *
   * If this fails, the failure message names the link text, and the fix is
   * on the site rather than in the test.
   */
  test('no navigation link is a placeholder that goes nowhere', async ({
    page,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const placeholders = await page
      .locator('header a[href], nav a[href]')
      .evaluateAll((links) =>
        links
          .map((el) => {
            const a = el as HTMLAnchorElement;
            const text = (a.innerText || a.getAttribute('aria-label') || '')
              .replace(/\s+/g, ' ')
              .trim();
            return { text, href: a.getAttribute('href') ?? '' };
          })
          .filter(
            (link) =>
              link.href === '#' ||
              link.href === '' ||
              link.href === 'javascript:void(0)',
          ),
      );

    const described = placeholders
      .map((l) => `"${l.text || '(no text)'}" -> ${l.href || '(empty)'}`)
      .join(', ');

    expect(
      placeholders,
      `navigation links that go nowhere: ${described}`,
    ).toEqual([]);
  });
});