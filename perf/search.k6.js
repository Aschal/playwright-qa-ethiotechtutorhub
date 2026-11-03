// PERF-01 — load test for POST /search_course.php
// Run:  k6 run perf/search.k6.js
//       k6 run -e BASE_URL=https://staging.example.com perf/search.k6.js
//
// UNVERIFIED: this script has never been executed. Do a 1-VU dry run against
// staging before trusting its thresholds.
// Kept deliberately small (10 VUs). Never schedule it against production;
// live.yml requires a typed confirmation for that.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://ethiotechtutorhub.com';
const TERMS = ['testing', 'web', 'computer', 'freelancing', 'zzqqxx-no-such-course'];

export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const term = TERMS[Math.floor(Math.random() * TERMS.length)];
  const res = http.post(
    `${BASE_URL}/search_course.php`,
    { search_course: term, search_course_btn: '' },
    {
      tags: { name: 'search' },
      // Same tagging as the Playwright suite. The site's analytics tracker
      // records no headers, but search_course.php is not tracked anyway.
      headers: { 'User-Agent': 'ETTH-QA/1.0 (k6)', 'X-Test-Suite': 'etth-qa' },
    },
  );
  check(res, {
    'status is 200': (r) => r.status === 200,
    'results block rendered': (r) => r.body.includes('search-course-results'),
    'no PHP errors': (r) => !/Fatal error|SQLSTATE/.test(r.body),
  });
  sleep(1 + Math.random() * 2); // think time
}
