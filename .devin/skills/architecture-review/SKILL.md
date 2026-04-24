# Architecture Review

Perform a comprehensive architecture review and generate C4 diagrams.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/architecture-review.md` and execute ALL steps described there.

## Steps Overview

1. **Analyze Project Structure** -- Map directories, modules, and dependency relationships
2. **Identify Architecture Pattern** -- Determine if layered, clean, hexagonal, microservices, or other
3. **Generate Dependency Graph** -- Create Mermaid diagram of module dependencies
4. **Analyze Dependencies** -- Detect circular dependencies, direction violations, missing abstractions
5. **Review Component Boundaries** -- Evaluate cohesion, coupling, and encapsulation
6. **Generate Documentation** -- Write ARCHITECTURE.md with findings
7. **Identify Improvements** -- Flag technical debt, scalability risks, maintainability issues
8. **Recommendations** -- Prioritize recommendations (high/medium/low)
9. **Create C4 Diagrams** -- Generate context and container diagrams in Mermaid
10. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/architecture-review/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- `.windsurf/docs/ARCHITECTURE.md` -- Architecture documentation
- Mermaid diagrams (dependency graph, C4 context, C4 container)
- Recommendations report with priority levels
- Dashboard entry with architecture metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "architecture-review",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
