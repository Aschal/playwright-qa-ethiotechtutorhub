import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ACCESSIBILITY_TARGETS } from '../../test-data/site';

/**
 * Automated accessibility scanning against WCAG 2.1 AA.
 *
 * An important limit to state plainly: automated tools find roughly a third
 * of real accessibility problems. A clean scan is not an accessible site. It
 * means the machine-checkable rules pass, which is the floor, not the goal.
 *
 * The threshold is staged on purpose. It fails on "critical" today, because
 * a suite that goes red on day one against an existing site gets ignored
 * rather than fixed. "serious" is reported in the output so the backlog is
 * visible, and the threshold tightens once those are cleared.
 */

const FAIL_ON: string[] = ['critical'];
const REPORT_ONLY: string[] = ['serious', 'moderate', 'minor'];

test.describe('Accessibility (WCAG 2.1 AA)', () => {
  for (const target of ACCESSIBILITY_TARGETS) {
    test(`${target.name} has no critical violations`, async ({ page }, info) => {
      await page.goto(target.path, { waitUntil: 'domcontentloaded' });

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const summarise = (impact: string) =>
        results.violations
          .filter((v) => v.impact === impact)
          .map((v) => `${v.id} (${v.nodes.length} element(s)): ${v.help}`);

      // Everything found is attached to the report, whether it fails or not,
      // so the full picture is available without re-running the scan.
      const all = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.length,
      }));

      await info.attach(`axe-${target.name}.json`, {
        body: JSON.stringify(all, null, 2),
        contentType: 'application/json',
      });

      for (const impact of REPORT_ONLY) {
        const found = summarise(impact);
        if (found.length > 0) {
          console.log(`[${target.name}] ${impact}: ${found.join(' | ')}`);
        }
      }

      const blocking = FAIL_ON.flatMap((impact) => summarise(impact));

      expect(
        blocking,
        `critical accessibility violations on ${target.name}: ${blocking.join(' | ')}`,
      ).toEqual([]);
    });
  }

  test('the homepage has exactly one h1', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const count = await page.locator('h1').count();

    // Screen readers use the h1 to announce what a page is. More than one,
    // or none, makes the page harder to orient in.
    expect(count, `found ${count} h1 elements, expected exactly 1`).toBe(1);
  });

  test('the page declares a language', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Without this, a screen reader may read English content with the wrong
    // pronunciation rules. It is a one-attribute fix with real impact.
    // /.+/ requires a non-empty value, the same as the earlier toBeTruthy().
    await expect(page.locator('html'), 'the html element has no lang attribute').toHaveAttribute('lang', /.+/);
  });

  test('every image has an alt attribute', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const missing = await page.locator('img').evaluateAll((images) =>
      images
        .filter((img) => !(img as HTMLImageElement).hasAttribute('alt'))
        .map((img) => (img as HTMLImageElement).src),
    );

    // An empty alt is correct for decorative images. A missing one is not,
    // because the screen reader then falls back to reading the file name.
    expect(
      missing,
      `images with no alt attribute: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
