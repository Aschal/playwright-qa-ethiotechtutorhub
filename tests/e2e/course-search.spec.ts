import { test, expect } from '../fixtures';
import { HomePage } from '../../pages/HomePage';
import { SearchResultsPage } from '../../pages/SearchResultsPage';
import { SEARCH, MESSAGES } from '../../test-data/search';

/**
 * Course Search — end-to-end.
 * Test case IDs map to docs/TEST_PLAN.md.
 */
test.describe('Course search @e2e', () => {
  test('TC-01 keyword search returns matching courses and opens the course @smoke', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const results = await home.search(SEARCH.matching.term);

    await test.step('results contain the expected courses', async () => {
      await expect(results.emptyMessage).toHaveCount(0);
      expect(await results.cards.count()).toBeGreaterThanOrEqual(SEARCH.matching.minResults);
      for (const title of SEARCH.matching.expectedTitles) {
        await expect(results.card(title)).toBeVisible();
      }
    });

    await test.step('every result is relevant to the keyword', async () => {
      // Relevance is checked on the title because that is what the user scans.
      for (const title of await results.titles()) {
        expect(title.toLowerCase(), `"${title}" should match "${SEARCH.matching.term}"`).toContain(
          SEARCH.matching.term,
        );
      }
    });

    await test.step('search term is kept in the box for refinement', async () => {
      await expect(results.input).toHaveValue(SEARCH.matching.term);
    });

    await test.step('opening a result lands on that course playlist', async () => {
      const title = SEARCH.matching.expectedTitles[1];
      await results.openCourse(title);
      await expect(page).toHaveURL(/playlist\.php\?get_id=\w+/);
      await expect(page.getByText(title).first()).toBeVisible();
    });
  });

  test('TC-02 search with no matches shows a clear empty state', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();

    const results = await home.search(SEARCH.noMatch);

    await expect(results.cards).toHaveCount(0);
    await expect(results.emptyMessage).toHaveText(MESSAGES.noResults);
    await expect(results.input).toHaveValue(SEARCH.noMatch);
  });

  test('TC-03 search is case-insensitive and ignores surrounding spaces', async ({ page }) => {
    const results = new SearchResultsPage(page);
    await results.gotoCatalogue();

    await results.search(SEARCH.matching.term);
    const baseline = await results.titles();
    expect(baseline.length).toBeGreaterThan(0);

    for (const variant of [SEARCH.matching.term.toUpperCase(), `   ${SEARCH.matching.term}   `]) {
      await test.step(`"${variant}" returns the same courses`, async () => {
        await results.search(variant);
        expect(await results.titles()).toEqual(baseline);
      });
    }
  });

  test('TC-04 Amharic keyword finds bilingual courses', async ({ page }) => {
    const results = new SearchResultsPage(page);
    await results.gotoCatalogue();
    await results.search(SEARCH.amharic);
    await expect(results.cards.first()).toBeVisible();
    await expect(results.card(/API Testing/)).toBeVisible();
  });

  test('TC-05 hostile input is rendered as text, never executed', async ({ page }) => {
    const results = new SearchResultsPage(page);
    await results.gotoCatalogue();
    await results.search(SEARCH.xss);

    expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined();
    await expect(results.input).toHaveValue(SEARCH.xss);
    await expect(results.emptyMessage).toHaveText(MESSAGES.noResults);
  });

  /**
   * Known defects — these document current behaviour. They are marked
   * `test.fail()` so the suite stays green while the bug is open, and will
   * turn RED (unexpected pass) the day it is fixed, prompting removal of
   * the annotation.
   */
  test.describe('known defects', () => {
    test('BUG-01 searching a teacher name returns their courses', async ({ page }) => {
      test.fail(true, 'BUG-01: placeholder says "teachers" are searchable, but tutor names return nothing');
      const results = new SearchResultsPage(page);
      await results.gotoCatalogue();
      await results.search(SEARCH.teacherName);
      await expect(results.cards.first()).toBeVisible({ timeout: 5_000 });
    });

    test('BUG-02 course overview text has no raw HTML entities', async ({ page }) => {
      test.fail(true, 'BUG-02: overview is double-encoded, e.g. "you&#39;ll" shown literally');
      const results = new SearchResultsPage(page);
      await results.gotoCatalogue();
      await results.search(SEARCH.matching.term);
      const overviews = await results.cards.locator('.course-overview').allInnerTexts();
      for (const text of overviews) {
        expect(text).not.toMatch(/&(#\d+|amp|quot|lt|gt);/);
      }
    });
  });
});
