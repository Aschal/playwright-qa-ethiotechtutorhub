import { test, expect, type APIRequestContext } from '@playwright/test';
import { SEARCH, MESSAGES } from '../../test-data/search';

/**
 * Course Search — HTTP layer.
 *
 * The site is server-rendered PHP, so the "API" is the form endpoint
 * `POST /search_course.php`. Testing it directly (no browser) is ~10x
 * faster than the UI and pins down the server contract: status, headers,
 * response time, output encoding and injection safety.
 */

const ENDPOINT = '/search_course.php';
const SLA_MS = 3_000;

async function search(request: APIRequestContext, term: string) {
  const started = Date.now();
  const res = await request.post(ENDPOINT, {
    form: { search_course: term, search_course_btn: '' },
  });
  const elapsed = Date.now() - started;
  const html = await res.text();
  const resultsBlock = html.match(/<div class="box-container search-course-results">([\s\S]*?)<\/section>/)?.[1] ?? '';
  const titles = [...resultsBlock.matchAll(/<h3 class="title">([\s\S]*?)<\/h3>/g)].map((m) => m[1].trim());
  return { res, html, resultsBlock, titles, elapsed };
}

test.describe('POST /search_course.php @api', () => {
  test('API-01 returns 200 HTML with matching courses within SLA @smoke', async ({ request }) => {
    const { res, titles, elapsed } = await search(request, SEARCH.matching.term);

    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/text\/html.*utf-8/i);
    expect(elapsed, `response took ${elapsed}ms`).toBeLessThan(SLA_MS);

    expect(titles.length).toBeGreaterThanOrEqual(SEARCH.matching.minResults);
    for (const expected of SEARCH.matching.expectedTitles) {
      expect(titles.some((t) => t.includes(expected)), `missing "${expected}"`).toBe(true);
    }
  });

  test('API-02 no-match and empty query return the right message', async ({ request }) => {
    const none = await search(request, SEARCH.noMatch);
    expect(none.res.status()).toBe(200);
    expect(none.titles).toHaveLength(0);
    expect(none.resultsBlock).toContain(MESSAGES.noResults);

    const empty = await search(request, '');
    expect(empty.res.status()).toBe(200);
    expect(empty.resultsBlock).toContain(MESSAGES.emptyQuery);
  });

  test('API-03 reflected input is HTML-escaped (no XSS)', async ({ request }) => {
    const { res, html } = await search(request, SEARCH.xss);
    expect(res.status()).toBe(200);
    expect(html).not.toContain(SEARCH.xss);
    expect(html).toContain('&lt;script&gt;');
  });

  test('API-04 SQL meta-characters do not alter the query', async ({ request }) => {
    const { res, html, titles } = await search(request, SEARCH.sqli);
    // A vulnerable query (`LIKE '%' OR '1'='1%'`) would return the whole catalogue
    // or a 500 / SQL error text.
    expect(res.status()).toBe(200);
    expect(titles).toHaveLength(0);
    expect(html).not.toMatch(/SQLSTATE|syntax error|mysqli?_|PDOException|Fatal error/i);
  });

  test('API-05 GET without a form body does not error', async ({ request }) => {
    const res = await request.get(ENDPOINT);
    expect(res.status()).toBeLessThan(500);
    expect(await res.text()).not.toMatch(/Fatal error|Warning:|Notice:/);
  });

  test.describe('known defects', () => {
    test('BUG-03 result thumbnails are web-optimised (< 300 KB)', async ({ request }) => {
      const MAX_KB = 300;
      const { res, resultsBlock } = await search(request, SEARCH.matching.term);
      const thumbs = [...resultsBlock.matchAll(/<img src="([^"]+)" class="thumb"/g)].map((m) => m[1]);
      // Preconditions run before test.fail(), so a timeout or a changed page
      // is a real failure, not a false "expected failure".
      expect(res.status()).toBe(200);
      expect(thumbs.length).toBeGreaterThan(0);

      test.fail(true, 'BUG-03: thumbnails are 0.9-1.6 MB; courses.php takes ~40s to fully load');
      const oversized: string[] = [];
      for (const src of thumbs) {
        const head = await request.head(`/${src}`);
        const kb = Number(head.headers()['content-length'] ?? 0) / 1024;
        if (kb > MAX_KB) oversized.push(`${src} = ${kb.toFixed(0)} KB`);
      }
      expect(oversized, oversized.join('\n')).toEqual([]);
    });
  });
});
