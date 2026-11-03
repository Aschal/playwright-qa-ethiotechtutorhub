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

  // TC-05 (XSS through the search box) lives in tests/security/ and only
  // runs when ETTH_INJECTION_TESTS=1.

  /**
   * Regression tests for defects fixed on 2026-11-03. They were known-defect
   * tests (BUG-01, BUG-02) marked `test.fail()`; now they guard the fixes.
   */
  test.describe('regressions', () => {
    test('REG-01 searching a teacher name returns their courses (was BUG-01)', async ({ page }) => {
      const results = new SearchResultsPage(page);
      await results.gotoCatalogue();
      await results.search(SEARCH.teacherName);
      await expect(results.cards.first()).toBeVisible();
    });

    test('REG-02 course overview text has no raw HTML entities (was BUG-02)', async ({ page }) => {
      const results = new SearchResultsPage(page);
      await results.gotoCatalogue();
      await results.search(SEARCH.matching.term);
      await expect(results.cards.first()).toBeVisible(); // there are overviews to check

      const overviews = await results.cards.locator('.course-overview').allInnerTexts();
      for (const text of overviews) {
        expect(text).not.toMatch(/&(#\d+|amp|quot|lt|gt);/);
      }
    });
  });
});
