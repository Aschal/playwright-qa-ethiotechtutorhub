import { test, expect } from '../fixtures';
import { SearchResultsPage } from '../../pages/SearchResultsPage';
import { INJECTION, MESSAGES } from '../../test-data/search';
import { searchCourses as search } from '../support/search-client';

/**
 * Injection checks on course search: reflected XSS and SQL meta-characters.
 *
 * These send hostile payloads to the server. The site does not store search
 * terms (checked in the PHP source on 2026-11-03), but the payloads still
 * reach the server and its access logs, so they run ONLY when
 * ETTH_INJECTION_TESTS=1 is set — and that should be against staging or a
 * local copy, not production. By default they are reported as skipped, so
 * the gap stays visible in the report.
 */

test.describe('Course search injection safety @security', () => {
  test.skip(
    process.env.ETTH_INJECTION_TESTS !== '1',
    'Injection payloads are not sent by default. Set ETTH_INJECTION_TESTS=1 and point BASE_URL at staging or a local copy.',
  );

  test('TC-05 hostile input is rendered as text, never executed', async ({ page }) => {
    const results = new SearchResultsPage(page);
    await results.gotoCatalogue();
    await results.search(INJECTION.xss);

    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    await expect(results.input).toHaveValue(INJECTION.xss);
    await expect(results.emptyMessage).toHaveText(MESSAGES.noResults);
  });

  test('API-03 reflected input is HTML-escaped (no XSS)', async ({ request }) => {
    const { res, html } = await search(request, INJECTION.xss);
    expect(res.status()).toBe(200);
    expect(html).not.toContain(INJECTION.xss);
    expect(html).toContain('&lt;script&gt;');
  });

  test('API-04 SQL meta-characters do not alter the query', async ({ request }) => {
    const { res, html, titles } = await search(request, INJECTION.sqli);
    // A vulnerable query (`LIKE '%' OR '1'='1%'`) would return the whole catalogue
    // or a 500 / SQL error text.
    expect(res.status()).toBe(200);
    expect(titles).toHaveLength(0);
    expect(html).not.toMatch(/SQLSTATE|syntax error|mysqli?_|PDOException|Fatal error/i);
  });
});
