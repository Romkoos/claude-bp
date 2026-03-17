# Project Rules

## Mandatory: Test Every Change

After **every** code change (feature, bugfix, refactor — no exceptions):

1. **Check unit test coverage** — run `npx vitest run <changed-test-files>` with `--coverage` flag to verify that all added/modified code is covered
2. **If coverage is incomplete** — write missing unit tests (`src/**/*.test.ts` / `src/**/*.test.tsx`), then re-run coverage on those files to confirm
3. **Run affected unit tests** — `npx vitest run <changed-test-files>` must pass with zero failures. This includes new/changed tests AND existing tests related to the modified code (e.g. if you changed a store, run the store's tests too)
4. **Add or update** the relevant E2E test suite in `docs/test-suites/`
5. **Run affected E2E suite(s)** — new/changed suites AND existing suites that cover the modified functionality
6. **For large changes** (major refactors, cross-cutting modifications, changes to shared utilities/stores) — suggest the user to run the full test suite (`npm run test` + all E2E suites) before considering the change complete
7. Only then consider the change complete

### Unit tests

- Framework: **Vitest** (configured in `vite.config.ts`, jsdom environment)
- Test files live next to source files: `src/**/*.test.ts`, `src/**/*.test.tsx`
- Every exported function, hook, store action, and component must have unit tests
- Coverage provider: v8 (text + text-summary reporters)

```bash
# Run all unit tests once
npm run test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### E2E tests

Tests are JSON suites in `docs/test-suites/suite-NNN-<topic>.json`. Each suite:

```json
{
  "id": "SUITE-NNN",
  "name": "Suite Name",
  "tests": [
    {
      "id": "TC-NNN",
      "name": "Descriptive test name",
      "priority": "critical|high|medium|low",
      "url": "/",
      "steps": [
        { "action": "navigate", "target": "/" },
        { "action": "click", "target": "[data-testid='...']" }
      ],
      "assertions": [
        { "type": "visible", "target": "[data-testid='...']", "description": "..." }
      ]
    }
  ]
}
```

```bash
# Run a specific suite
node pw_test_runner.cjs --input docs/test-suites/suite-NNN-name.json --output-dir test-results

# Run headed (to see the browser)
node pw_test_runner.cjs --input docs/test-suites/suite-NNN-name.json --output-dir test-results --headed
```

**Dev server must be running** on `http://localhost:5173` before executing E2E tests (`npm run dev`).

### Rules

- New UI feature = new test cases (create new suite or append to existing) + unit tests for all logic
- Modified behavior = update affected test cases + unit tests
- Bugfix = add regression test case + unit test reproducing the bug
- TC IDs must be globally unique across all suites — check existing suites for the latest ID before assigning new ones
- All E2E assertions must use `data-testid` attributes — add them to components if missing
- **No change is complete until both unit tests AND E2E tests pass**
