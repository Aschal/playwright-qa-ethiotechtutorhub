/**
 * Search test data. Kept separate from specs so the same data drives
 * the UI suite, the HTTP suite and the k6 load script.
 *
 * NOTE: these depend on live catalogue content. If a course is renamed,
 * update `expectedTitles` here, not in the specs.
 */
export const SEARCH = {
  /** Keyword that matches several published courses. */
  matching: {
    term: 'testing',
    minResults: 2,
    expectedTitles: ['API Testing for Beginners', 'Software Testing Fundamentals'],
  },
  /** Keyword guaranteed to match nothing. */
  noMatch: 'zzqqxx-no-such-course',
  /** Amharic keyword — the catalogue is bilingual. */
  amharic: 'ቴስቲንግ',
  /** A tutor's name; search matches tutor names since 2026-11-03 (was BUG-01). */
  teacherName: 'Amanuel',
} as const;

/**
 * Hostile inputs that must be treated as plain text. Only used by
 * tests/security/, which is skipped unless ETTH_INJECTION_TESTS=1.
 */
export const INJECTION = {
  xss: '<script>window.__xss=1</script>',
  sqli: "' OR '1'='1",
} as const;

export const MESSAGES = {
  noResults: 'no courses found!',
  emptyQuery: 'please search something!',
} as const;
