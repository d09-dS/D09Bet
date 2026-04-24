# Dashboard

Open and manage the project health dashboard with SBOM, security, and license compliance data.

## Instructions

The dashboard provides a visual overview of project health across all workflow runs.

## How to Start

```bash
# Start the dashboard server
node .windsurf/tools/config-server.js

# Dashboard is available at http://localhost:3847/dashboard
# Dashboard data API at http://localhost:3847/dashboard-data
```

## Available API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/dashboard` | GET | Serve dashboard HTML |
| `/dashboard-data` | GET | Read aggregated dashboard state |
| `/dashboard-data` | POST | Append a workflow run entry |
| `/generate-sbom` | GET | Generate SBOM JSON from project dependencies |
| `/security-scan` | GET | Run npm audit and generate security report |
| `/license-check` | GET | Evaluate SBOM against license policy |
| `/dashboard-aggregate` | GET | Aggregate all data into dashboard-data.json |
| `/dashboard-full-scan` | GET | Run SBOM + Security + License + Aggregate in sequence |
| `/sbom-data` | GET | Read SBOM JSON for current project |
| `/security-data` | GET | Read security scan results |
| `/license-data` | GET | Read license evaluation results |
| `/architecture-data` | GET | Read architecture diagrams and last review run |

## Full Scan (Recommended)

Run all scans at once:

```bash
curl http://localhost:3847/dashboard-full-scan
```

This executes in sequence: SBOM generation, security scan, license check, and data aggregation.

## Reading Dashboard Data Without Server

All dashboard data is stored as JSON files that can be read directly:

- `.windsurf/dashboard-data.json` -- Aggregated state with all workflow runs
- `.windsurf/dashboard/sbom/<project>.json` -- SBOM data
- `.windsurf/dashboard/security/<project>.json` -- Security scan results
- `.windsurf/dashboard/licenses/<project>.json` -- License evaluations
- `.windsurf/dashboard/a11y/<project>.json` -- Accessibility metrics
- `.windsurf/dashboard/code-quality/<project>.json` -- Code quality metrics
- `.windsurf/dashboard/performance/<project>.json` -- Performance metrics
- `.windsurf/dashboard/seo/<project>.json` -- SEO metrics
- `.windsurf/dashboard/runs/[workflow]/[YYYY-MM-DD]/[timestamp]/` -- Per-run reports

## Data Structure

Each workflow run entry in `dashboard-data.json`:

```json
{
  "workflow": "<workflow-name>",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "highlights": ["positive findings"],
  "issues": ["problems found"],
  "summary": "1-2 sentence overview",
  "reportPath": ".windsurf/dashboard/runs/..."
}
```
