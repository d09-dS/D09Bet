# Docker Setup

Generate Dockerfile and docker-compose configuration for the project.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/docker-setup.md` and execute ALL steps described there.

## Steps Overview

1. **Detect Tech Stack** -- Identify runtime, package manager, framework, database
2. **Generate Dockerfile** -- Multi-stage build for Node.js, Python, .NET, Go, or Rust
3. **Generate .dockerignore** -- Exclude node_modules, .env, .git, build artifacts
4. **Generate docker-compose.yml** -- Production config with app, database, and Redis services
5. **Generate docker-compose.dev.yml** -- Development config with hot-reload and volume mounts
6. **Security Checklist** -- Verify no hardcoded secrets, non-root user, health checks
7. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/docker-setup/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- `Dockerfile` -- Multi-stage, production-ready
- `.dockerignore`
- `docker-compose.yml` -- Production configuration
- `docker-compose.dev.yml` -- Development configuration
- `.env` template (gitignored)
- Dashboard entry with Docker metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "docker-setup",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
