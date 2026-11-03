import { test, expect } from '../fixtures';
import AxeBuilder from '@axe-core/playwright';
import { SearchResultsPage } from '../../pages/SearchResultsPage';
import { SEARCH } from '../../test-data/search';

/**
 * WCAG 2.1 AA scan of the search results page with axe-core.
 * Only "serious" and "critical" violations fail the build; everything else
 * is attached to the report so it can be triaged without blocking releases.
 */
test('A11Y-01 search results page has no serious WCAG 2.1 AA violations @a11y', async ({ page }, testInfo) => {
  const results = new SearchResultsPage(page);
  await results.gotoCatalogue();
  await results.search(SEARCH.matching.term);

  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .include('section.courses')
    .analyze();

  await testInfo.attach('axe-results.json', {
    body: JSON.stringify(scan.violations, null, 2),
    contentType: 'application/json',
  });

  const blocking = scan.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`);

  expect(blocking, blocking.join('\n')).toEqual([]);
});
