# Test Plan: Course Search

**Product:** EthioTechTutor Hub (https://ethiotechtutorhub.com)
**Feature:** Course search (header search, catalogue search, results page)
**Author:** Aschalew Tesfaye
**Date:** 2026-11-03
**Status:** Executed. 1 open defect (BUG-03). BUG-01 and BUG-02 were fixed on 2026-11-03 (see section 9).
Whole-site checks (availability, navigation, links, responsive layout, page-level accessibility) are in the same suite, summarised in section 5b.

---

## 1. Feature summary

Learners search the course catalogue by keyword. Search can start from:

- the **global header** search box (on every page, collapsed behind an icon on mobile)
- the **catalogue** search box on `courses.php`
- the **refine** box on the results page

All three submit `POST /search_course.php` with field `search_course` (max length 100).
The server renders matching course cards (thumbnail, lesson count, tutor, title,
overview, "Overview" link to `playlist.php?get_id=…`), or a message:

| Input | Expected message |
|---|---|
| empty | `please search something!` |
| no match | `no courses found!` |

The catalogue is bilingual (English and Amharic). The placeholder says users can search
"courses, skills, teachers…".

## 2. Scope

**In scope**
- Functional search behaviour: matching, empty and no-result states, case, whitespace, Amharic
- Navigating from a result to the course
- Input handling and security: XSS reflection, SQL meta-characters, max length
- Server contract at the HTTP layer: status, content type, response time
- Responsive behaviour: desktop and mobile viewport (header search toggle)
- Accessibility: WCAG 2.1 AA scan of the results page (axe-core)
- Performance: search endpoint latency under load (k6), page weight

**Out of scope (this iteration)**
- Ranking quality and ordering (no spec available)
- Login-gated content inside playlists
- Admin and tutor course creation, which feeds the search index
- Cross-browser beyond Chromium (Firefox and WebKit projects can be enabled in config)

## 3. Risks and priorities

| Risk | Impact | Likelihood | Priority |
|---|---|---|---|
| Search returns wrong or no results, so learners can't find courses | High (core discovery flow) | Med | **P1** |
| Reflected XSS through the search term, which is echoed into `value=""` | High (security) | Med | **P1** |
| SQL injection through the `LIKE` query | High (data) | Low-Med | **P1** |
| Slow results page on mobile data, which is common for the target audience in Ethiopia | High | **High** | **P1** |
| Amharic search broken by encoding or collation | Med | Med | P2 |
| Teacher search promised but missing | Med (trust/UX) | n/a | P2 |
| Accessibility barriers on results | Med | Med | P2 |

## 4. Test approach (the test pyramid for this feature)

| Layer | Tool | What it covers | Why here |
|---|---|---|---|
| HTTP / "API" | Playwright `request` | Contract, encoding, injection, latency, edge inputs | Fast (~1s), no browser, catches server bugs precisely |
| E2E UI | Playwright + TypeScript, Page Object Model | Real user journeys on desktop and mobile | Covers wiring between header, form, results and playlist |
| Accessibility | `@axe-core/playwright` | WCAG 2.1 A/AA rules | Automated baseline; manual screen-reader pass still needed |
| Load | k6 | p95 latency and error rate under concurrency | Search hits the DB on every request |

Most edge-case permutations live at the HTTP layer. The UI layer stays small and tests journeys.

## 5. Test cases

**Legend:** ✅ automated · 🔶 automated as known defect (`test.fail`) · 🔒 automated, runs only with `ETTH_INJECTION_TESTS=1` (not against production) · ⚠️ written but never executed · 📝 manual

| ID | Title | Steps | Expected | Pri | Auto |
|---|---|---|---|---|---|
| **TC-01** | Keyword search returns matching courses and opens course | Home → header search "testing" → Enter → click "Overview" on *Software Testing Fundamentals* | ≥2 results; every title contains "testing"; term kept in box; lands on `playlist.php?get_id=…` showing the course | P1 | ✅ UI |
| **TC-02** | No-match search shows empty state | Home → search `zzqqxx-no-such-course` | 0 cards; message `no courses found!`; term kept in box | P1 | ✅ UI |
| **TC-03** | Case-insensitive, whitespace-tolerant | Catalogue → search `testing`, `TESTING`, `   testing   ` | Identical result lists | P2 | ✅ UI |
| TC-04 | Amharic keyword | Search `ቴስቲንግ` | Returns *API Testing for Beginners* | P2 | ✅ UI |
| TC-05 | XSS input is inert (UI) | Search `<script>window.__xss=1</script>` | Script not executed; shown as text in box | P1 | 🔒 UI |
| **API-01** | Contract and SLA | `POST /search_course.php` `search_course=testing` | 200, `text/html; charset=UTF-8`, < 3s, expected titles present | P1 | ✅ API |
| API-02 | Empty and no-match messages | POST with `""` and nonsense term | Correct message for each, 200 | P1 | ✅ API |
| API-03 | Reflected input is escaped | POST XSS payload | Raw payload absent; `&lt;script&gt;` present | P1 | 🔒 API |
| API-04 | SQL meta-characters are safe | POST `' OR '1'='1` | 0 results, no DB error text, 200 | P1 | 🔒 API |
| API-05 | GET without body | `GET /search_course.php` | No 5xx, no PHP warnings | P3 | ✅ API |
| A11Y-01 | Results page WCAG 2.1 AA | axe scan of `section.courses` | No serious or critical violations | P2 | ✅ a11y |
| PERF-01 | Search latency under load | k6: ramp to 10 VUs for 1 min | p95 < 1500 ms, errors < 1% | P2 | ⚠️ k6 (manual only) |
| REG-01 | Teacher-name search (was BUG-01) | Search "Amanuel" | Tutor's courses returned | P2 | ✅ UI |
| REG-02 | Overview text encoding (was BUG-02) | Search "testing", read overviews | No literal `&#39;`, `&amp;` | P3 | ✅ UI |
| BUG-03 | Thumbnail weight | HEAD each result thumbnail | Each < 300 KB | P1 | 🔶 |
| M-01 | Max length 100 | Paste 150 chars | Input truncates at 100; server handles >100 if the limit is bypassed | P3 | 📝 |
| M-02 | Keyboard-only search | Tab to header search, type, Enter, Tab to result | Fully operable, visible focus | P2 | 📝 |
| M-03 | Language switch (EN/AM/OM) then search | Switch to አማርኛ and search | UI labels translated, results unaffected | P3 | 📝 |
| M-04 | Slow 3G | DevTools throttling, search | Results usable < 10s | P1 | 📝 |

The three cases in **bold** (TC-01, TC-02, TC-03) are the 3 UI cases the exercise asks for.
**API-01** is the single API test. Everything else is extra coverage.

## 5b. Whole-site checks

Read-only checks across the public site, in `tests/site/` and `tests/a11y/site.a11y.spec.ts`.
Page lists and viewports live in `test-data/site.ts`.

| Area | Checks | Tests |
|---|---|---|
| Availability | 9 public pages answer below 400 and render a title and a non-empty body. Login and register render a form (nothing is submitted). An unknown URL doesn't return 5xx. | 12 |
| Navigation | Every public page is linked from the homepage. Courses and Pricing click-throughs work. The logo returns home. No header or nav link is a placeholder (`#`, empty). | 5 |
| Link integrity | Every internal homepage link resolves below 400. Social profiles are not 404. | 2 |
| Responsive | No horizontal overflow on 5 pages at 390, 820 and 1440 px. Navigation is reachable at phone width. | 16 |
| Accessibility (pages) | axe WCAG 2.1 AA on Home, Courses, Pricing and Contact, failing on *critical* only (*serious* and below are logged). Exactly one `h1`, `lang` present, `alt` on every image. | 7 |

## 6. Test data

Defined once in `test-data/search.ts` and shared by every suite. The suite runs against
live content, so if a course is renamed, update that file and nothing else.
Recommendation: a seeded staging environment with fixed courses, so tests don't
depend on production content.

## 7. Environments and execution

- **Target:** production.
  - The tests create no accounts and submit no forms.
  - Visits to tracked pages do add `page_view` rows to `analytics_events` (see README).
  - Injection payloads are off by default.
- **Browsers:** Desktop Chrome, Pixel 7 (mobile Chrome emulation).
- **Where the live suite runs:** locally. GitHub-hosted runners can't reach the site, because the host drops their connections.
- **CI:**
  - `ci.yml` runs on every PR and push. It does type check, lint and test discovery, and makes no requests to the site.
  - `live.yml` is manual only. It fails if the site is unreachable or returns 4xx/5xx.
  - There is no schedule.
- **Flake control:** 1 retry. Any test that passes on retry is marked *flaky* in the report. Traces are recorded on the first retry; video and screenshots are kept on failure. Workers are capped at 2 to avoid load on production.

## 8. Entry and exit criteria

**Entry:** feature deployed to the target environment; test data present.
**Exit (go):** all P1 cases pass; no open P1 defect without an agreed workaround; A11Y-01 (search results) has no serious or critical violations, and the page scans have no critical violations; PERF-01 thresholds met once the k6 script has been verified on staging.
**No-go:** any P1 functional or security failure.

## 9. Results and defects (local runs of 2026-11-03, merged suite)

Two consecutive full runs against production gave the same result:
- **59 passed, 3 skipped, 0 failed, 0 flaky** (62 tests).
- The 3 skipped are the injection tests (flag not set).
- The 59 passed include BUG-03, which fails as expected and for the right reason: its assertion names the oversized files.

| ID | Severity | Status | Summary |
|---|---|---|---|
| **BUG-03** | **High** (perf) | **Open, improved** | Thumbnails were 0.9–1.6 MB each, and `courses.php` took ~41 s to fire `load`. On 2026-11-03 the 3 "testing" thumbnails are 170, **383** and **912** KB, so 2 are still over the 300 KB target. |
| BUG-01 | Medium | **Fixed 2026-11-03** (now REG-01) | The placeholder promised teacher search, but tutor names returned nothing. Search now also matches the tutor name. |
| BUG-02 | Low | **Fixed 2026-11-03** (now REG-02) | Overview text was HTML-encoded twice (a literal `you&#39;ll`). |

**Accessibility backlog** (logged, not failing):
- `color-contrast`: Home 9 elements, Pricing 3
- `label-content-name-mismatch`: 1 element each on Home, Courses, Pricing and Contact

**Security:**
- Earlier runs showed the public search escapes reflected input and handles SQL meta-characters safely.
- The PHP source confirms that `search_course.php` uses a prepared statement and stores no search terms.
- The injection tests now run only on request.

**Recommendation:** **Go.** No P1 functional or security failures. BUG-03 remains the top performance risk for mobile users and should stay prioritised.
