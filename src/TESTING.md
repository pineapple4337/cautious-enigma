# Regression tests

Run `node --test src/tests/*.test.cjs` from the project root after installing dependencies. Optionally add `"test": "node --test src/tests/*.test.cjs"` to `package.json` scripts to enable `npm test`.

The tests use fictional course plans and the actual graduation engine, registry and programme data. They check eligibility, compulsory courses, recognised caps, cohort restrictions, planned/completed counts, and maximum constraints.

These are code regression tests, not departmental certification. They do not verify every recognised-course list against NUS sources or every possible cross-programme allocation.

If a test fails, do not change the expected result just to make it pass. Investigate the rule and code first.

## Known gaps

- These 25 tests are a baseline, not exhaustive graduation-rule certification.
- Cross-programme double-counting/triple-counting is not enforced by these tests.
- Complex Chinese Studies caps and substitution combinations need additional cases.
- The registry currently labels a programme supported when it has an audit, even if its definition has a manual/unverified rule. This should be tightened before public support labels are used.
- No real browser/Vite integration test is included.
