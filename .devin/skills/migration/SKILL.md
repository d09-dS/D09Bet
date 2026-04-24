# Database Migration

Review and generate database migrations safely.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/migration.md` and execute ALL steps described there.

## Steps Overview

1. **Analyze Schema Changes** -- Identify what changed (add table, modify columns, add indexes, data migration)
2. **Generate Migration** -- Create SQL migration files (up and down)
3. **Safety Checklist** -- Pre-migration checks and risk assessment
4. **Generate ORM Migration** -- Create migration using Prisma, TypeORM, Entity Framework, Django, or Alembic
5. **Data Migration** -- Batched updates for large tables to avoid locks
6. **Review Existing Migrations** -- Check migration status and checksums
7. **Rollback Plan** -- Generate rollback scripts for each migration step
8. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/migration/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- Migration SQL files (up and down scripts)
- ORM-specific migration files
- Rollback scripts
- Migration risk assessment
- Dashboard entry with migration metrics (type, risk level, estimated time)

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "migration",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
