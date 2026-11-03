import { expect, type Locator, type Page } from '@playwright/test';
import { SearchResultsPage } from './SearchResultsPage';

/** Landing page, including the global header search. */
export class HomePage {
  readonly headerSearchInput: Locator;

  constructor(readonly page: Page) {
    this.headerSearchInput = page.locator('header form.search-form input[name="search_course"]');
  }

  async goto() {
    // Course thumbnails are 1-1.6 MB each (BUG-03) and can delay the `load`
    // event by 15s+. Users can search long before that, so don't wait for it.
    await this.page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveTitle(/EthioTechTutor Hub/);
  }

  /**
   * Search from the header. On narrow viewports the header search is
   * collapsed behind a toggle, so open it first if the input is hidden.
   */
  async search(term: string): Promise<SearchResultsPage> {
    if (!(await this.headerSearchInput.isVisible())) {
      await this.page.locator('#search-btn').click();
    }
    await this.headerSearchInput.fill(term);
    await this.headerSearchInput.press('Enter');
    const results = new SearchResultsPage(this.page);
    await results.expectLoaded();
    return results;
  }
}
