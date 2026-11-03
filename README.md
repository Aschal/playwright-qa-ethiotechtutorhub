# EthioTechTutor Hub: QA Automation

Playwright + TypeScript tests for the live platform at
[ethiotechtutorhub.com](https://ethiotechtutorhub.com). The suite covers:

- course search: UI journeys on desktop and mobile, plus the HTTP endpoint
- whole-site checks: availability, navigation, link integrity, responsive layout
- accessibility against WCAG 2.1 AA (axe-core)
- injection safety (behind a flag)
- a k6 load script (manual only, unverified)

The site has **real users on it**. That fact shaped most of the decisions below.

Test plan, risks and defect history: [docs/TEST_PLAN.md](docs/TEST_PLAN.md)

---

## What CI does, and what it doesn't

**GitHub's runners can't reach the site.** The host's firewall drops their
connections. Every CI attempt to test the live site has ended in
`Connection timeout`, while the same tests pass from a local machine. This is a
constraint of the hosting, not a bug in the tests.

So CI is split in two, and neither part pretends to have tested something it
didn't:

| Workflow | When | What it verifies | What green means |
|---|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | Every push and PR | Type check, lint, and test discovery (`playwright test --list`). No request to the site. | "The code compiles, lints, and every spec loads." **Not** "the site works." |
| [`live.yml`](.github/workflows/live.yml) | Manual only (`workflow_dispatch`) | The full live suite, and optionally k6 | Every selected test passed against the site |

`live.yml` starts with a reachability step that **fails the run** if the site
can't be tested:
- no response
- any 5xx from the site
- any 4xx

It never skips quietly, and nothing in it reports "could not test" as success.
On GitHub-hosted runners it is **red today**, and that red is accurate.

To get a real green from `live.yml`, run it somewhere that can reach the site:
- a self-hosted runner (set the repo variable `RUNNER=self-hosted`), or
- a staging copy (pass its URL as `base_url`).

Until then, **the live suite runs locally** (see [Running it](#running-it)).

There is **no schedule**. Nothing runs against production unless someone starts it.

## What the suite writes to production

**No account is registered, no form is submitted, no comment is posted.**
Login, register and contact pages are checked for rendering only.

**It does still create page-view rows.** The site's own analytics tracker
(`components/analytics_tracker.php`) inserts a `page_view` row into
`analytics_events` for every visit to:
- the homepage
- `courses.php`
- `login.php` and `register.php`
- `playlist.php`, `watch_video.php` and `read_lesson.php`

Each browser test starts without cookies, so every such visit counts as a
**new visitor**. A full run adds roughly 50 rows.

**Tagging does NOT keep test traffic out of `analytics_events`.** Every request
carries an `X-Test-Suite: etth-qa` header and a User-Agent ending in
`ETTH-QA/1.0`. The tracker stores no user agent, no headers and no IP, only a
coarse "Chrome / desktop" label. So test rows can't be told apart from real
visitors in that table. The tag only helps in the **web server's access logs**.
Keeping tests out of analytics would need a change to the tracker, such as
skipping requests that carry the header. That is a site change, not a test change.

Search terms are **not** stored anywhere. This was checked in the PHP source on
2026-11-03: `search_course.php` runs a prepared `SELECT` only, and is not tracked.

## Injection tests are off by default

`tests/security/` sends XSS and SQL-injection payloads to the search endpoint:
TC-05, API-03 and API-04. They run only when `ETTH_INJECTION_TESTS=1` is set,
which should be against staging or a local copy, never production. Otherwise
they are **reported as skipped**, with that reason, so the gap stays visible.

```bash
# bash
ETTH_INJECTION_TESTS=1 BASE_URL=http://localhost/<your-local-copy> npx playwright test --project=security
```
```powershell
# PowerShell
$env:ETTH_INJECTION_TESTS='1'; $env:BASE_URL='http://localhost/<your-local-copy>'; npx playwright test --project=security
```

## What is covered

62 tests in 6 Playwright projects:

| Project | Tests | What it checks |
|---|---|---|
| `api` | 4 | `POST /search_course.php`: status, content type, a 3 s response budget, results and messages. Also a GET without a body, and **BUG-03** (thumbnail size, a known defect). |
| `chromium` | 6 | Course search journeys: keyword search through to the course page, the no-results state, case and whitespace handling, Amharic, plus regressions **REG-01** (teacher search) and **REG-02** (no raw HTML entities) |
| `mobile-chrome` | 6 | The same journeys on a Pixel 7 profile |
| `site` | 35 | Every public page answers below 400 and renders. Account pages render a form. An unknown URL doesn't return 5xx. Navigation links and click-throughs work, with no placeholder links. No broken internal links on the homepage, and no 404 social profiles. No horizontal overflow at phone, tablet and desktop widths. |
| `a11y` | 8 | **A11Y-01**: the search results section has no *serious* or *critical* WCAG 2.1 AA violations. axe scans of 4 pages fail on *critical* only. Exactly one `h1`, a `lang` attribute, and `alt` on every image. |
| `security` | 3 | Injection safety. **Skipped unless `ETTH_INJECTION_TESTS=1`.** |

### Known defect

**BUG-03:** some course thumbnails are still over 300 KB. As of 2026-11-03, 2 of
the 3 "testing" results are over: 383 KB and 912 KB. The test is marked
`test.fail()`, but only *after* its preconditions pass (HTTP 200, thumbnails
found). So a network failure is reported as a real failure, not mistaken for
the known bug. When the images are fixed, the test will report "expected to
fail, but passed". That is the signal to remove the marker.

BUG-01 and BUG-02 were fixed on 2026-11-03 and are now the normal regression
tests REG-01 and REG-02.

## Running it

```bash
npm ci
npx playwright install --with-deps chromium
npm test
```

| Command | What it does |
|---|---|
| `npm test` | Everything. The security tests are skipped unless the flag is set. |
| `npm run test:smoke` | `@smoke`-tagged tests: page availability, the main search journey and the API contract |
| `npm run test:api` / `test:e2e` / `test:site` / `test:a11y` | One area |
| `npm run test:ui` | Playwright UI mode, for stepping through a failure |
| `npm run typecheck` / `npm run lint` / `npm run list` | The static checks CI runs |
| `npm run report` | Open the HTML report from the last run |

To point the suite at another environment: `BASE_URL=https://staging.example.com npm test`

### Load test (k6)

`perf/search.k6.js` ramps to 10 virtual users for about 90 s, searching with
1–3 s pauses. That's roughly 3–4 requests per second, all to the search endpoint.

**Unverified:** the script has never been executed. Do a 1-VU dry run against
staging before trusting its thresholds.

It runs only from `live.yml`, only when **run_load_test** is ticked, and against
production only if you also type `load production` into
**confirm_production_load**. It never runs on a schedule.

## Structure

```
pages/                 Page objects (HomePage, SearchResultsPage)
test-data/search.ts    Search terms, expected messages, injection payloads
test-data/site.ts      Map of public pages, a11y scan targets, viewports
tests/fixtures.ts      Blocks heavy thumbnails in course-search browser tests
tests/support/         Shared HTTP client for the search endpoint
tests/api/             HTTP-level tests
tests/e2e/             Course search journeys (desktop + mobile)
tests/site/            Whole-site checks
tests/a11y/            Accessibility
tests/security/        Injection tests (flag-gated)
perf/                  k6 script (manual, unverified)
.github/workflows/     ci.yml (static checks), live.yml (manual live run)
```

## Choices worth explaining

- **Two workers.** The target is a production server. A test suite should not
  be the heaviest traffic the site sees.
- **One retry.** A live network occasionally drops a request, and that isn't a
  defect in the site. A test that passes only on retry is still reported as
  **flaky** in the HTML report.
- **Two accessibility thresholds, on purpose.**
  - A11Y-01 fails on *serious* and above, because the search results section
    already meets that level.
  - The whole-page scans fail on *critical* only for now. On 2026-11-03 they
    logged two *serious* findings, which are attached to the report:
    - `color-contrast`: Home 9 elements, Pricing 3. This is a design job.
    - `label-content-name-mismatch`: 1 element on each scanned page.
  - The page scans will tighten once that backlog clears.
  - Automated tools find only part of real accessibility problems. A clean
    scan is the floor, not the goal.
- **Course-search tests block thumbnails; site checks don't.**
  - The course-search fixture aborts thumbnail downloads. Downloading ~15 MB per
    page across parallel workers once caused a teardown timeout.
  - The site checks load images normally, because a blocked image can hide a
    real layout overflow.
- **API before UI.** Edge cases run at the HTTP layer in milliseconds. The UI
  tests stay focused on user journeys.
- **Links are checked with `request()`, not by navigating.** One HTTP call per
  link instead of a full page render.
- **Social links fail only on 404.** Social platforms often answer automated
  requests with 403 or 429. That doesn't mean the profile is missing.
- **`minimatch` is overridden to 11.x in `package.json`.**
  - ESLint 10.14 and typescript-eslint 8.72 still depend on minimatch 10.x,
    which has a denial-of-service advisory
    ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)).
  - The override forces the fixed version. Lint output was checked to be
    identical with and without it.
  - Remove the override once both tools depend on minimatch 11 themselves.

## Not covered

| Not tested | Why |
|---|---|
| Registering an account, logging in, submitting the contact form | Creates real records, sends real email, or can trip rate limiting |
| Anything behind a login, payments | Needs a staging environment or a dedicated test account |
| Visual regression, performance budgets | Not built yet |
| Keyboard-only and screen-reader use | Needs a manual pass |

## Use of AI

AI (Claude) was used to explore the site, draft test cases, scaffold the
framework, and merge the two original suites. Every test was reviewed and run
locally against the live site. Each defect was confirmed by hand before it was
reported.

---

Aschalew Tesfaye — QA Engineer, Addis Ababa ·
[aschalewtesfaye.com.et](https://www.aschalewtesfaye.com.et/) ·
[LinkedIn](https://www.linkedin.com/in/aschalew-tesfaye-ayane-0755bb133/)
