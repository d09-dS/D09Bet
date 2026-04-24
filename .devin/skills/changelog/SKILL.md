# Changelog Generation

Generate changelog from git commits using Conventional Commits format.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/changelog.md` and execute ALL steps described there.

## Steps Overview

1. **Analyze Commit History** -- Read git log since last tag
2. **Categorize Changes** -- Sort by conventional commit type (feat, fix, docs, style, refactor, perf, test, chore, ci, build)
3. **Generate Changelog Entry** -- Format in Keep a Changelog style
4. **Determine Version Bump** -- Calculate major/minor/patch based on commit types
5. **Generate Release Notes** -- Create GitHub/GitLab formatted release notes
6. **Update Package Version** -- Bump version in package.json or equivalent
7. **Create Git Tag** -- Create annotated tag for the release
8. **CI/CD Automation** -- Provide GitHub Actions or GitLab CI config for automated releases
9. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/changelog/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- `CHANGELOG.md` -- Updated with new version entries
- Release notes (GitHub/GitLab format)
- Updated package version
- Git tag
- Dashboard entry with version metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "changelog",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
