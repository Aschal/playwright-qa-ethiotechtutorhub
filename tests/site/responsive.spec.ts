import { test, expect } from '@playwright/test';
import { PUBLIC_PAGES, VIEWPORTS } from '../../test-data/site';

/**
 * Most of this audience is on a phone, so a layout that only works on a
 * desktop is a layout that mostly does not work.
 *
 * The check is horizontal overflow: content wider than the screen, which
 * forces the reader to scroll sideways to finish a sentence. It is the most
 * common responsive defect and the easiest to miss on a large monitor.
 */

const OVERFLOW_TOLERANCE_PX = 2; // sub-pixel rounding, not a real overflow

test.describe('Responsive layout', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`${viewport.name} (${viewport.width}px)`, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } });

      for (const target of PUBLIC_PAGES.slice(0, 5)) {
        test(`${target.name} does not scroll sideways`, async ({ page }) => {
          await page.goto(target.path, { waitUntil: 'domcontentloaded' });

          const overflow = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );

          expect(
            overflow,
            `${target.name} overflows by ${overflow}px at ${viewport.width}px wide`,
          ).toBeLessThanOrEqual(OVERFLOW_TOLERANCE_PX);
        });
      }
    });
  }

  test.describe('phone navigation', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the homepage still offers a way to reach other pages', async ({
      page,
    }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Either the links are visible, or there is a control that reveals
      // them. Both are fine; neither is not.
      const visibleLinks = await page
        .locator('header a[href], nav a[href]')
        .filter({ visible: true })
        .count();

      const toggle = await page
        .locator(
          'button[aria-label*="menu" i], button[class*="menu" i], ' +
            '[class*="hamburger" i], [class*="navbar-toggle" i]',
        )
        .count();

      expect(
        visibleLinks > 0 || toggle > 0,
        'no visible navigation and no menu control on a phone-width screen',
      ).toBe(true);
    });
  });
});
