# Test Plan: Course Search

**Product:** EthioTechTutor Hub (https://ethiotechtutorhub.com)
**Feature:** Course search (header search, catalogue search, results page)
**Author:** Aschalew Tesfaye
**Date:** 2026-11-03
**Status:** Executed. 3 open defects (see section 9)

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

**Legend:** ✅ automated · 🔶 automated as known defect (`test.fail`) · 📝 manual

| ID | Title | Steps | Expected | Pri | Auto |
|---|---|---|---|---|---|
| **TC-01** | Keyword search returns matching courses and opens course | Home → header search "testing" → Enter → click "Overview" on *Software Testing Fundamentals* | ≥2 results; every title contains "testing"; term kept in box; lands on `playlist.php?get_id=…` showing the course | P1 | ✅ UI |
| **TC-02** | No-match search shows empty state | Home → search `zzqqxx-no-such-course` | 0 cards; message `no courses found!`; term kept in box | P1 | ✅ UI |
| **TC-03** | Case-insensitive, whitespace-tolerant | Catalogue → search `testing`, `TESTING`, `   testing   ` | Identical result lists | P2 | ✅ UI |
| TC-04 | Amharic keyword | Search `ቴስቲንግ` | Returns *API Testing for Beginners* | P2 | ✅ UI |
| TC-05 | XSS input is inert (UI) | Search `<script>window.__xss=1</script>` | Script not executed; shown as text in box | P1 | ✅ UI |
| **API-01** | Contract and SLA | `POST /search_course.php` `search_course=testing` | 200, `text/html; charset=UTF-8`, < 3s, expected titles present | P1 | ✅ API |
| API-02 | Empty and no-match messages | POST with `""` and nonsense term | Correct message for each, 200 | P1 | ✅ API |
| API-03 | Reflected input is escaped | POST XSS payload | Raw payload absent; `&lt;script&gt;` present | P1 | ✅ API |
| API-04 | SQL meta-characters are safe | POST `' OR '1'='1` | 0 results, no DB error text, 200 | P1 | ✅ API |
| API-05 | GET without body | `GET /search_course.php` | No 5xx, no PHP warnings | P3 | ✅ API |
| A11Y-01 | Results page WCAG 2.1 AA | axe scan of `section.courses` | No serious or critical violations | P2 | ✅ a11y |
| PERF-01 | Search latency under load | k6: ramp to 10 VUs for 1 min | p95 < 1500 ms, errors < 1% | P2 | ✅ k6 |
| BUG-01 | Teacher-name search | Search "Amanuel" | Tutor's courses returned | P2 | 🔶 |
| BUG-02 | Overview text encoding | Search "testing", read overviews | No literal `&#39;`, `&amp;` | P3 | 🔶 |
| BUG-03 | Thumbnail weight | HEAD each result thumbnail | Each < 300 KB | P1 | 🔶 |
| M-01 | Max length 100 | Paste 150 chars | Input truncates at 100; server handles >100 if the limit is bypassed | P3 | 📝 |
| M-02 | Keyboard-only search | Tab to header search, type, Enter, Tab to result | Fully operable, visible focus | P2 | 📝 |
| M-03 | Language switch (EN/AM/OM) then search | Switch to አማርኛ and search | UI labels translated, results unaffected | P3 | 📝 |
| M-04 | Slow 3G | DevTools throttling, search | Results usable < 10s | P1 | 📝 |

The three cases in **bold** (TC-01, TC-02, TC-03) are the 3 UI cases the exercise asks for.
**API-01** is the single API test. Everything else is extra coverage.

## 6. Test data

Defined once in `test-data/search.ts` and shared by every suite. The suite runs against
live content, so if a course is renamed, update that file and nothing else.
Recommendation: a seeded staging environment with fixed courses, so tests don't
depend on production content.

## 7. Environments and execution

- **Target:** production (read-only tests only; no account creation or writes)
- **Browsers:** Desktop Chrome, Pixel 7 (mobile Chrome emulation)
- **CI:** GitHub Actions on every PR and push to `main`, plus a nightly run. HTML report, traces and JUnit are uploaded as artifacts.
- **Flake control:** 2 retries in CI only. Any test that passes on retry is marked *flaky* in the report and tracked. Traces and video are kept on failure. Workers are capped at 2 to avoid load on production.

## 8. Entry and exit criteria

**Entry:** feature deployed to the target environment; test data present.
**Exit (go):** all P1 cases pass; no open P1 defect without an agreed workaround; a11y has no serious or critical violations; PERF-01 thresholds met.
**No-go:** any P1 functional or security failure.

## 9. Results and defects (run of 2026-11-03)

21/21 automated checks behave as expected: 16 pass, and the 3 known defects fail as
expected (BUG-01 and BUG-02 run on both desktop and mobile, BUG-03 runs once at the
HTTP layer, so 5 expected-fail runs in total).

| ID | Severity | Summary | Repro | Expected vs actual |
|---|---|---|---|---|
| **BUG-03** | **High** (perf) | Course thumbnails are unoptimised (0.9–1.6 MB each); `courses.php` takes ~41s to fire `load`, home ~18s | Open `courses.php` with DevTools Network | < 300 KB per thumbnail (WebP, resized to display size) vs 1.6 MB PNGs. On mobile data this is the biggest UX risk on the site. |
| **BUG-01** | Medium | Placeholder promises teacher search, but tutor names return nothing | Search "Amanuel" (tutor of 3 courses) | Tutor's courses vs `no courses found!`. Fix: also search the tutor name, or change the placeholder. |
| **BUG-02** | Low | Overview text is HTML-encoded twice | Search "testing" and read the *API Testing for Beginners* overview | `you'll` vs literal `you&#39;ll` (source has `&amp;#39;`). Likely `htmlspecialchars` applied on save **and** on output. |

**Positive security findings:** search input is HTML-escaped on output (no reflected XSS),
and SQL meta-characters are handled safely (prepared statements likely).

**Recommendation:** **Go**, with BUG-03 prioritised for the next sprint. No P1 functional or
security failures were found. Performance is a P1 risk for the target audience but it is
not a regression.
