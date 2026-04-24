# Validate Rules

Validate generated rules and workflows against the binary quality checklist (38 criteria, A1-E12).

## Instructions

1. Read the workflow definition at `.windsurf/workflows/validate-rules.md` and execute ALL steps described there.
2. Read the validation checklist at `.windsurf/workflows/_ref/validation-checklist.md` for criteria definitions.

## Steps Overview

1. **Load Config and Checklist** -- Read `.windsurf/project-init-config.json` and validation checklist
2. **Validate Each Rule File** -- Run checks A (structure), B (content depth), C (stack alignment)
3. **Validate Extended Workflows** -- Run checks D (workflow quality)
4. **System-Wide Checks** -- Run checks E (config validity, rule count, character limits)
5. **Generate Report** -- Create checklist with pass/fail per criterion
6. **Recommendations** -- If any criteria FAIL, provide specific fix actions
7. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/validate-rules/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- Validation report (checklist format, 38 criteria)
- Pass rate percentage (threshold: 90%)
- List of failing criteria with reasons and fix actions
- Dashboard entry with validation metrics

## Prerequisites

- `.windsurf/project-init-config.json` must exist (run project-init first)
- Rule files must exist in `.windsurf/rules/`

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "validate-rules",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
