import type { APIRequestContext } from '@playwright/test';

/**
 * HTTP client for the search endpoint, shared by the API and security suites.
 *
 * The site is server-rendered PHP, so the "API" is the form endpoint
 * `POST /search_course.php`. It returns HTML, which is parsed here so the
 * specs can assert on titles and messages.
 */

export const SEARCH_ENDPOINT = '/search_course.php';

export async function searchCourses(request: APIRequestContext, term: string) {
  const started = Date.now();
  const res = await request.post(SEARCH_ENDPOINT, {
    form: { search_course: term, search_course_btn: '' },
  });
  const elapsed = Date.now() - started;
  const html = await res.text();
  const resultsBlock = html.match(/<div class="box-container search-course-results">([\s\S]*?)<\/section>/)?.[1] ?? '';
  const titles = [...resultsBlock.matchAll(/<h3 class="title">([\s\S]*?)<\/h3>/g)].map((m) => m[1].trim());
  return { res, html, resultsBlock, titles, elapsed };
}
