import { expect, type Locator, type Page } from '@playwright/test';

/**
 * search_course.php — the results page for course search.
 * Also drives the in-page search form on courses.php, which posts to the
 * same endpoint but uses a different class name.
 */
export class SearchResultsPage {
  readonly heading: Locator;
  readonly input: Locator;
  readonly submit: Locator;
  readonly results: Locator;
  readonly cards: Locator;
  readonly emptyMessage: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { name: /search results/i });
    const form = page.locator('form.search-course-form, form.courses-search-form');
    this.input = form.locator('input[name="search_course"]');
    this.submit = form.getByRole('button', { name: /search/i });
    this.results = page.locator('.search-course-results');
    this.cards = this.results.locator('.box');
    this.emptyMessage = this.results.locator('p.empty');
  }

  /** Open the course catalogue, which has its own search form. */
  async gotoCatalogue() {
    await this.page.goto('/courses.php', { waitUntil: 'domcontentloaded' });
    await expect(this.input).toBeVisible();
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL(/search_course\.php/);
    await expect(this.heading).toBeVisible();
  }

  async search(term: string) {
    await this.input.fill(term);
    await this.submit.click();
    await this.expectLoaded();
  }

  titles(): Promise<string[]> {
    return this.cards.locator('.title').allInnerTexts();
  }

  card(title: string | RegExp): Locator {
    return this.cards.filter({ has: this.page.locator('.title', { hasText: title }) });
  }

  async openCourse(title: string | RegExp) {
    await this.card(title).getByRole('link', { name: /overview/i }).click();
  }
}
