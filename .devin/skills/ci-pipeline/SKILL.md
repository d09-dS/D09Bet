# CI/CD Pipeline

Generate CI/CD pipeline configuration for the project.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/ci-pipeline.md` and execute ALL steps described there.

## Steps Overview

1. **Detect Pipeline Target** -- Determine CI platform (GitHub Actions, GitLab CI, Azure DevOps, Jenkins)
2. **Generate Pipeline Config** -- Create pipeline YAML with lint, test, build, deploy stages
3. **Branch Protection Rules** -- Configure PR reviews, status checks, merge requirements
4. **Pipeline Checklist** -- Verify secrets management, caching, concurrency, artifacts, security scanning
5. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/ci-pipeline/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- `.github/workflows/ci.yml` or `.gitlab-ci.yml` -- Pipeline configuration
- `.dockerignore` (if Docker stage included)
- Branch protection rules documentation
- Dashboard entry with pipeline metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "ci-pipeline",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
