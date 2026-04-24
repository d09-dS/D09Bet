# Generate Tests

Generate comprehensive test suites for the codebase.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/generate-tests.md` and execute ALL steps described there.
2. Read the testing rule at `.windsurf/rules/testing.md` for reference standards.

## Steps Overview

1. **Analyze Target** -- Identify specific file, module, API endpoints, or full scan scope
2. **Identify Test Types** -- Determine which types are needed (unit, integration, E2E, component, snapshot)
3. **Generate Unit Tests** -- Cover happy path, edge cases, error cases, boundary conditions
4. **Generate Integration Tests** -- With real dependencies, use Testcontainers where applicable
5. **Generate API Tests** -- REST endpoint tests with status code verification
6. **Generate E2E Tests** -- Playwright tests for critical user flows
7. **Test Infrastructure** -- Set up Testcontainers if needed
8. **Test Data Factories** -- Create faker-based test data generators
9. **Mock Generation** -- Create repository and service mocks
10. **Coverage Report** -- Generate coverage report (Jest, Vitest, pytest, .NET)
11. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/generate-tests/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- Test files (unit, integration, E2E) following project conventions
- Test factories and mock files
- Coverage report
- Dashboard entry with test metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "generate-tests",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
