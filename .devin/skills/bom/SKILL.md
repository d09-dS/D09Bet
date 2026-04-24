# Bill of Materials (BOM)

Generate a Bill of Materials with dependency versions, licenses, and tech stack Mermaid diagrams.

## Instructions

1. Read the workflow definition at `.windsurf/workflows/bom.md` and execute ALL steps described there.

## Steps Overview

1. **Discover Dependency Files** -- Scan for package.json, requirements.txt, pom.xml, build.gradle, *.csproj, go.mod, Cargo.toml, composer.json, Gemfile, pubspec.yaml, mix.exs, build.sbt, deno.json
2. **Extract Versions** -- Read versions from lock files and manifests
3. **Detect Licenses** -- Use metadata, CLI tools, and known license map
4. **Classify License Risk** -- Categorize as permissive, weak copyleft, strong copyleft, or unknown
5. **Categorize Dependencies** -- Split into frontend, backend, testing, quality, build, DevOps, other
6. **Detect Tech Stack** -- Identify full stack for diagram generation
7. **Generate BOM.md** -- Create comprehensive BOM document with collapsible tables
8. **Generate Tech Stack Diagram** -- Mermaid diagram with layer architecture and styling
9. **Generate License Pie Chart** -- Mermaid pie chart showing license distribution
10. **Save to Dashboard** -- Persist results to `.windsurf/dashboard-data.json` and write `findings.json` + `report.md` to `.windsurf/dashboard/runs/bom/[YYYY-MM-DD]/[timestamp]/`

## Output Artifacts

- `.windsurf/docs/BOM.md` -- Comprehensive Bill of Materials
- Mermaid tech stack diagram (layered architecture)
- Mermaid license distribution pie chart
- Dashboard entry with dependency counts and license risk metrics

## Dashboard Integration

Save results using this structure in `dashboard-data.json`:

```json
{
  "workflow": "bom",
  "timestamp": "<ISO timestamp>",
  "score": 0-100,
  "maxScore": 100,
  "verdict": "pass|fail",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "summary": "1-2 sentence overview"
}
```
