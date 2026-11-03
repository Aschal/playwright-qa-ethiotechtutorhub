# EthioTechTutor Hub: QA Automation

Playwright + TypeScript test suite for the **course search** feature of
[ethiotechtutorhub.com](https://ethiotechtutorhub.com). It covers UI end-to-end,
the HTTP layer, accessibility (axe-core) and load (k6), and runs in GitHub Actions.

Test plan, risks, results and defects: [docs/TEST_PLAN.md](docs/TEST_PLAN.md)

## Quick start

```bash
npm ci
npx playwright install chromium
npm test                 # everything
npm run test:api         # HTTP layer only (~5s)
npm run test:e2e         # desktop + mobile UI
npm run test:a11y        # WCAG 2.1 AA scan
npm run test:smoke       # @smoke tagged only
npm run report           # open the HTML report
BASE_URL=https://staging.example.com npm test   # another environment
```

Load test (needs [k6](https://k6.io)): `k6 run perf/search.k6.js`

## Structure

```
pages/              Page Objects (HomePage, SearchResultsPage)
test-data/          Shared test data and expected messages
tests/fixtures.ts   Shared fixture: blocks heavy thumbnails in browser tests
tests/e2e/          UI journeys: TC-01..05, plus known defects BUG-01/02
tests/api/          HTTP layer: API-01..05, plus known defect BUG-03
tests/a11y/         axe-core WCAG 2.1 AA scan
perf/               k6 load script
.github/workflows/  CI: typecheck → api → e2e matrix (+ nightly k6)
docs/TEST_PLAN.md   Test plan, results, defect reports, go/no-go
```

## Design decisions

- **Page Object Model.** Selectors live in one place. Specs read like test cases.
- **Accessible locators first** (`getByRole`) and stable CSS classes as a fallback. No XPath and no text-index selectors.
- **API before UI.** Edge cases (XSS, SQLi, empty input) run at the HTTP layer in milliseconds. The UI tests stay focused on user journeys. In CI the browser jobs only start after the API job passes.
- **Known defects use `test.fail()`.** The suite stays green while a bug is open. When the bug is fixed the test passes unexpectedly and turns red, which reminds us to remove the annotation. Bugs stay visible instead of being skipped.
- **`waitUntil: 'domcontentloaded'`.** Thumbnails delay the `load` event by up to 40s (BUG-03). Waiting for `load` would make the suite slow and flaky, and users don't wait for it either.
- **Heavy images blocked in UI tests.** A shared fixture (`tests/fixtures.ts`) aborts thumbnail downloads, because about 15 MB per page caused a teardown timeout across parallel workers. The UI tests check behaviour, not images, and BUG-03 still checks image size on purpose.
- **Flake control.** Retries run in CI only and are reported as *flaky*, not hidden. Traces, screenshots and video are kept on failure. Workers are capped to avoid load on production.
- **Production-safe.** Read-only checks only: no sign-ups and no form submissions that write data.

## Use of AI

AI (Claude) was used to explore the site, draft test cases and scaffold the
framework. Every generated test was reviewed and run. Each defect was confirmed by
hand, with network timings and response bodies, before it was reported.
