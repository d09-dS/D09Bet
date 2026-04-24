# Project Init

Initialize a project with tech stack detection and rule generation. This is a 4-phase workflow that detects the tech stack, generates rules, enhances them, and validates quality.

## Important: Devin-Specific Approach

Unlike Windsurf (which uses a browser UI), Devin performs project initialization via the config-server API or direct filesystem analysis. No browser is needed.

## Instructions

Execute all 4 phases in sequence. Read each phase's workflow definition for detailed steps.

### Phase 1: Stack Detection

**Workflow:** `.windsurf/workflows/project-init.md`

**Option A -- With Node.js (recommended):**

1. Start the config server:
   ```bash
   node .windsurf/tools/config-server.js &
   ```
2. Run project analysis via API:
   ```bash
   curl http://localhost:3847/analyze
   ```
3. Review the detected stack from the JSON response
4. Generate BOM:
   ```bash
   curl http://localhost:3847/generate-bom
   ```
5. Save the configuration:
   ```bash
   curl -X POST http://localhost:3847/save-config \
     -H "Content-Type: application/json" \
     -d '<JSON config from analysis, adjusted if needed>'
   ```
6. The server shuts down automatically after saving

**Option B -- Without Node.js (agent-based scan):**

1. Read detection maps from `.windsurf/tools/detection-maps.json`
2. Scan the project for dependency files (package.json, pom.xml, build.gradle, *.csproj, go.mod, Cargo.toml, composer.json, Gemfile, requirements.txt, pyproject.toml, pubspec.yaml, mix.exs, build.sbt, deno.json)
3. Parse dependencies and match against detection maps
4. Detect programming languages by file extensions
5. Build config JSON and save to `.windsurf/project-init-config.json`

**Output:** `.windsurf/project-init-config.json`

### Phase 2: Rule Generation

**Workflow:** `.windsurf/workflows/project-init-generate.md`

1. Read the config from `.windsurf/project-init-config.json`
2. Generate 8 base rules (code-quality, security, error-handling, performance, accessibility, api-standards, i18n, testing)
3. Generate stack-specific rules based on detected technologies
4. Use reference sources from `.windsurf/workflows/_ref/reference-sources.md`
5. Update AGENTS.md active rules section:
   - If config server is running: `curl http://localhost:3847/update-agents-md-rules`
   - Otherwise: manually update the `<!-- ASP:active-rules:BEGIN -->` block in AGENTS.md
6. The AGENTS.md merge (preserving project-specific content) happens automatically during `/save-config`. Manual trigger: `curl http://localhost:3847/merge-agents-md`

**Output:** Rule files in `.windsurf/rules/`, updated AGENTS.md

### Phase 3: Enhancement + Workflow Extension

**Workflow:** `.windsurf/workflows/project-init-enhance.md`

1. Enhance base rules with stack-specific sections (marked with `> Stack-enhancement by /project-init`)
2. Read enhancement examples from `.windsurf/workflows/_ref/enhancement-examples.md`
3. Extend workflows based on selected stack
4. Read workflow extension map from `.windsurf/workflows/_ref/workflow-extension-map.md`

**Output:** Enhanced rule files, extended workflow files

### Phase 4: Quality Analysis + Optimization

**Workflow:** `.windsurf/workflows/project-init-quality.md`

1. Run validation checklist (38 criteria, A1-E12) from `.windsurf/workflows/_ref/validation-checklist.md`
2. Show pass/fail per criterion
3. If pass rate < 90%, automatically fix failing criteria (max 3 iterations)
4. Generate final summary with detected stack, generated rules, quality metrics
5. Announce stack-aware developer identity

**Output:** Validation report, optimized rules, final summary

## Prerequisites

- Project must have dependency files (package.json, pom.xml, etc.)
- Node.js recommended for Option A (API-based analysis)
- For Option B, no external dependencies needed

## API Endpoints Reference (for Option A)

| Endpoint | Method | Description |
|---|---|---|
| `/analyze` | GET | Scan project and detect tech stack |
| `/generate-bom` | GET | Generate Bill of Materials |
| `/save-config` | POST | Save tech stack configuration |
| `/detection-map` | GET | Get all detection maps |
