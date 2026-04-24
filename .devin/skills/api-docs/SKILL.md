# API Documentation

Generate OpenAPI 3.1.0 documentation for API endpoints.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/api-docs.md` and execute ALL steps described there.
2. Read the API standards rule at `.windsurf/rules/api-standards.md` for reference.

## Steps Overview

1. **Scan API Endpoints** -- Find controllers, routes, HTTP methods across the codebase
2. **Generate OpenAPI Spec** -- Create OpenAPI 3.1.0 specification in YAML format
3. **Add Code Annotations** -- Add NestJS decorators, Express JSDoc, or framework-specific annotations
4. **Document DTOs** -- Add examples and validation rules to data transfer objects
5. **Document Authentication** -- Describe Bearer, API Key, OAuth authentication flows
6. **Add Request/Response Examples** -- Realistic examples for each endpoint
7. **Generate Markdown Docs** -- Create API.md with all endpoints
8. **Setup Swagger UI** -- Configure Swagger for the detected framework (NestJS, Express, FastAPI, Django DRF)
9. **Validation Checklist** -- Verify OpenAPI 3.1 compliance
10. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/api-docs/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- `.windsurf/docs/openapi.yaml` -- OpenAPI 3.1.0 specification
- `.windsurf/docs/API.md` -- Markdown API documentation
- Swagger UI endpoint configuration
- Dashboard entry with documentation metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "api-docs",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
