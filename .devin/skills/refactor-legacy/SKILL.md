# Refactor Legacy Code

Systematic code refactoring following Clean Code and SOLID principles.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/refactor-legacy.md` and execute ALL steps described there.
2. Read `.windsurf/rules/code-quality.md` for code quality standards.

## Steps Overview

1. **Identify Target** -- Determine scope (specific file, module, or full codebase scan)
2. **Analyze Code Smells** -- Detect long methods, large classes, duplication, complex conditionals
3. **Prioritize Refactoring** -- Create plan with effort estimates
4. **Apply Refactoring Patterns** -- Extract method, replace conditional, extract class, eliminate magic numbers, introduce parameter objects
5. **Ensure Test Coverage** -- Write characterization tests before refactoring
6. **Apply SOLID Principles** -- Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion
7. **Document Changes** -- Create refactoring summary with before/after metrics
8. **Review Checklist** -- Verify tests pass, functionality preserved, readability improved
9. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/refactor-legacy/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- Refactored code files
- Characterization tests (if missing)
- Refactoring summary document
- Metrics comparison (method length, nesting depth, cyclomatic complexity)
- Dashboard entry with refactoring metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "refactor-legacy",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
