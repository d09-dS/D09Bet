# Code Review

Perform a structured code review with priority-based checklist and actionable feedback.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/code-review.md` and execute ALL steps described there.
2. Cross-reference findings with `.windsurf/rules/security.md`, `.windsurf/rules/code-quality.md`, and `.windsurf/rules/api-standards.md`.

## Steps Overview

1. **Identify Review Scope** -- Determine target (single file, multiple files, git diff, module)
2. **Read and Analyze Code** -- Identify language, framework, and purpose of the code
3. **Apply Review Checklist** -- Check against CRITICAL, HIGH, MEDIUM, LOW priority items
4. **Generate Review Report** -- Structured findings sorted by severity
5. **Fix Suggestions** -- Provide concrete code fixes for CRITICAL and HIGH findings
6. **Cross-Reference Rules** -- Validate against active project rules
7. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/code-review/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- Code review report (Markdown)
- Findings by severity (CRITICAL, HIGH, MEDIUM, LOW)
- Fix suggestions with code examples
- Dashboard entry with review metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "code-review",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
