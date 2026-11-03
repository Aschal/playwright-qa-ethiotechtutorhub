import { test, expect } from '@playwright/test';

/**
 * Broken links are the most common defect on a content site and the easiest
 * to miss, because nothing on the page looks wrong until someone clicks.
 *
 * These checks use request() rather than navigating, so each link costs one
 * HTTP call instead of a full page render.
 */

test.describe('Link integrity', () => {
  test('no internal link on the homepage is broken', async ({
    page,
    request,
  }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hrefs = await page.locator('a[href]').evaluateAll((links) =>
      links
        .map((a) => (a as HTMLAnchorElement).href)
        .filter((href) => href.startsWith('http')),
    );

    const base = new URL(page.url()).origin;

    // Unique internal links only. Fragments point at the current page, so
    // they are stripped rather than requested separately.
    const internal = [...new Set(hrefs)]
      .filter((href) => href.startsWith(base))
      .map((href) => href.split('#')[0])
      .filter((href) => href.length > 0);

    const unique = [...new Set(internal)];
    const broken: string[] = [];

    for (const href of unique) {
      const res = await request.get(href, { failOnStatusCode: false });
      if (res.status() >= 400) {
        broken.push(`${href} -> ${res.status()}`);
      }
    }

    expect(broken, `broken internal links: ${broken.join(', ')}`).toEqual([]);
  });

  test('the social links in the footer resolve', async ({ page, request }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const social = await page
      .locator(
        'a[href*="facebook.com"], a[href*="linkedin.com"], ' +
          'a[href*="tiktok.com"], a[href*="instagram.com"]',
      )
      .evaluateAll((links) =>
        links.map((a) => (a as HTMLAnchorElement).href),
      );

    test.skip(social.length === 0, 'no social links found on the page');

    const unreachable: string[] = [];

    for (const href of [...new Set(social)]) {
      const res = await request.get(href, { failOnStatusCode: false });

      // Social platforms commonly answer automated requests with 403 or 429.
      // That says nothing about whether the profile exists, so only a 404 is
      // treated as a real broken link here.
      if (res.status() === 404) {
        unreachable.push(`${href} -> 404`);
      }
    }

    expect(
      unreachable,
      `social profiles not found: ${unreachable.join(', ')}`,
    ).toEqual([]);
  });
});
