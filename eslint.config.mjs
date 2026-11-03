// Lint for the TypeScript test code. Errors fail CI; warnings are reported.
// eslint-plugin-playwright catches missing awaits, committed test.only,
// fixed sleeps and similar test-specific mistakes.
import tseslint from 'typescript-eslint';
import playwright from 'eslint-plugin-playwright';

export default tseslint.config(
  // perf/ is a k6 script (k6's own JS runtime and globals), not Node/TS code.
  { ignores: ['node_modules/', 'playwright-report/', 'test-results/', 'perf/'] },
  ...tseslint.configs.recommended,
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Conditional skips (`test.skip(condition, reason)`) are deliberate
      // here, e.g. the injection-test gate. An unconditional skip is still flagged.
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
    },
  },
);
