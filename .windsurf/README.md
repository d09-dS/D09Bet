# Windsurf Agent Skills Package

A portable AI agent baseline for Windsurf IDE. Drop into any project to instantly get enforced coding standards, security rules, and on-demand workflows -- all automatically adapted to your tech stack.

## Quick Start: 3 Usage Modes

### Mode 1: Instant Drop-In (no setup needed)

1. Copy `.windsurf/` and `AGENTS.md` into your project root
2. Open the project in Windsurf IDE
3. Rules are active immediately -- no configuration required

### Mode 2: With Project Auto-Analysis (requires Node.js)

1. Copy `.windsurf/` and `AGENTS.md` into your project root
2. Run `.windsurf/tools/install.bat` (Windows) or `.windsurf/tools/install.sh` (macOS/Linux)
3. Click **Analyze Project** in the UI to auto-detect your stack
4. Review the pre-filled values and click **Save & Generate**
5. Run `/project-init` in Windsurf to generate stack-specific rules

### Mode 3: Offline (no Node.js)

1. Copy `.windsurf/` and `AGENTS.md` into your project root
2. Open `.windsurf/tools/project-init-ui.html` directly in a browser
3. Drop your `package.json` or `requirements.txt` into the UI for basic auto-detection
4. Click **Save & Generate** to download the config
5. Move the downloaded file to `.windsurf/project-init-config.json`
6. Run `/project-init` in Windsurf

## Structure

```
.windsurf/
├── rules/                    # ALWAYS ACTIVE (auto-applied by file glob)
│   ├── global-agent.md       # Identity, language, communication style
│   ├── plan-first.md         # Structured change plan for multi-file edits
│   ├── code-quality.md       # Clean Code, SOLID principles
│   ├── security.md           # Security best practices (OWASP-aligned)
│   ├── error-handling.md     # Error handling patterns
│   ├── performance.md        # Performance optimization
│   ├── accessibility.md      # A11y requirements
│   ├── api-standards.md      # REST API conventions
│   ├── i18n.md               # Internationalization
│   └── testing.md            # Testing standards
├── workflows/                # MANUAL TRIGGER (on-demand via /command)
│   ├── project-init.md       # Stack selection + rule generation
│   ├── deep-security-audit.md
│   ├── generate-tests.md
│   ├── api-docs.md
│   ├── refactor-legacy.md
│   ├── architecture-review.md
│   ├── migration.md
│   ├── changelog.md
│   ├── docker-setup.md
│   ├── ci-pipeline.md
│   ├── code-review.md
│   ├── validate-rules.md     # Rule quality validation (38 criteria)
│   └── _ref/                 # Reference data for rule generation
└── tools/                    # SETUP UTILITIES
    ├── config-server.js      # Local server with /analyze endpoint
    ├── project-init-ui.html  # Standalone UI (works offline)
    ├── detection-maps.json   # Stack detection maps (12 ecosystems)
    ├── install.bat           # Windows setup script
    └── install.sh            # macOS/Linux setup script
```

## Project Auto-Detection

When you click **Analyze Project**, the config server scans your project root for:

- **package.json** dependencies (React, Angular, Vue, NestJS, Express, Prisma, etc.)
- **Config files** (angular.json, next.config._, tailwind.config._, etc.)
- **Python files** (requirements.txt, pyproject.toml -- Django, FastAPI, pytest, etc.)
- **Non-JS backends** (go.mod, Cargo.toml, \*.csproj, pom.xml, build.gradle)
- **CI/CD** (.github/workflows, .gitlab-ci.yml, azure-pipelines.yml, Jenkinsfile)
- **DevOps** (Dockerfile, docker-compose.\*, biome.json, nx.json, turbo.json)
- **i18n** (i18n/, locales/ directories)

Each detected field has a confidence level (high/medium) shown as colored borders in the UI.

**Offline fallback:** Drop your `package.json`, `requirements.txt`, or `pyproject.toml` into the UI for client-side dependency detection.

## Rules

Files in `rules/` are automatically applied when editing matching file types:

| File                | Trigger   | Scope                                                                      |
| ------------------- | --------- | -------------------------------------------------------------------------- |
| `global-agent.md`   | always_on      | All files                                                                             |
| `plan-first.md`     | model_decision | Multi-file edits (agent decides based on context)                                     |
| `code-quality.md`   | glob           | `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.cs`, `.java`, `.kt`, `.go`, `.rs`, `.php`, `.rb`, `.ex`, `.scala`, `.dart` |
| `security.md`       | glob           | `.ts`, `.tsx`, `.js`, `.py`, `.cs`, `.go`, `.rs`                                      |
| `error-handling.md` | glob           | `.ts`, `.tsx`, `.js`, `.py`, `.cs`, `.go`, `.rs`                                      |
| `performance.md`    | glob           | `.ts`, `.tsx`, `.js`, `.py`, `.cs`, `.go`, `.rs`                                      |
| `accessibility.md`  | glob           | `.tsx`, `.jsx`, `.html`, `.vue`, `.svelte`                                            |
| `api-standards.md`  | glob           | `.ts`, `.py`, `.cs`, `.go`, `.rs`, `.java`, `.kt`, `.php`, `.rb`, `.ex`               |
| `i18n.md`           | glob           | `.tsx`, `.jsx`, `.ts`, `.py`, `.vue`, `.svelte`                                       |
| `testing.md`        | glob           | Test files (`.test.ts`, `.spec.ts`, `test_*.py`, `*_test.go`, `*_test.rs`)            |

## Workflows

| Command                | Description                                  |
| ---------------------- | -------------------------------------------- |
| `/project-init`        | Stack selection UI + rule generation         |
| `/deep-security-audit` | OWASP-aligned full security scan             |
| `/generate-tests`      | Generate unit, integration, and E2E tests    |
| `/api-docs`            | Generate OpenAPI 3.1.0 documentation         |
| `/refactor-legacy`     | Systematic refactoring with SOLID principles |
| `/architecture-review` | C4 diagrams + dependency analysis            |
| `/migration`           | Safe database migration generation           |
| `/changelog`           | Conventional Commits changelog generation    |
| `/docker-setup`        | Dockerfile + docker-compose generation       |
| `/ci-pipeline`         | CI/CD pipeline generation                    |
| `/code-review`         | Structured code review with checklist        |
| `/validate-rules`      | Validate generated rules against quality checklist |

## Customization

### Add Custom Rules

Create `.md` files in `rules/` with appropriate frontmatter:

```markdown
---
description: My custom rule
trigger: glob
globs: ["**/*.ts"]
---

# My Custom Rule

When generating code, ALWAYS:

1. Follow our naming convention
2. Use our logging format
```

### Add Custom Workflows

Create `.md` files in `workflows/`:

```markdown
---
description: My custom workflow
---

# My Workflow

Step 1: ...
Step 2: ...
```

## License

MIT
