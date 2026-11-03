import { test as base } from '@playwright/test';

/**
 * Shared fixtures for browser tests.
 *
 * Course thumbnails are 1-1.6 MB each (BUG-03). The functional tests don't
 * need them, and downloading ~15 MB per page across parallel workers made
 * pages slow to load and contexts slow to close, which caused timeouts.
 * We block them here; image weight is still checked on purpose by BUG-03
 * in tests/api/search.api.spec.ts.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route(/\/uploaded_files\/.+\.(png|jpe?g|webp|gif)$/i, (route) => route.abort());
    await use(page);
  },
});

export { expect } from '@playwright/test';
