import { test, expect } from '@playwright/test';
import { SEARCH, MESSAGES } from '../../test-data/search';
import { SEARCH_ENDPOINT, searchCourses as search } from '../support/search-client';

/**
 * Course Search — HTTP layer.
 *
 * Testing the form endpoint directly (no browser) is ~10x faster than the UI
 * and pins down the server contract: status, headers, response time and
 * messages. Injection payloads live in tests/security/ and do not run by
 * default.
 */

const SLA_MS = 3_000;

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

  test('API-05 GET without a form body does not error', async ({ request }) => {
    const res = await request.get(SEARCH_ENDPOINT);
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

      test.fail(true, 'BUG-03: 2 of 3 "testing" thumbnails are still over 300 KB (383 KB, 912 KB) as of 2026-11-03');
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
