---
description: Generate tech-stack-specific skills/rules via UI selection (no project scaffolding)
---

# Skill Generation Workflow

This workflow generates appropriate coding rules based on the tech stack selection. **No project scaffolding** is performed -- only the relevant skills are created.

The workflow is split into 4 phases across separate files for reliable execution:

1. **Phase 1** (this file): Stack Detection + Config
2. **Phase 2** (`project-init-generate.md`): Rule Generation
3. **Phase 3** (`project-init-enhance.md`): Base Rule Enhancement + Workflow Extension
4. **Phase 4** (`project-init-quality.md`): Quality Analysis + Optimization + Summary

Reference data is stored in `.windsurf/workflows/_ref/` and loaded on-demand by each phase.

**Execution mode:** This workflow skips Plan-First Execution (see `global-agent.md` Exceptions). All phases execute directly without generating change plans or waiting for confirmation between steps. The final summary in Phase 4 (Section 4.3) serves as the complete review of all created and modified files.

---

## Progress Tracking

After each phase completes, update the `_progress` field in `.windsurf/project-init-config.json`:

```json
{
  "version": 2,
  "_progress": {
    "phase1_detection": true,
    "phase1_completed_at": "2025-01-15T10:30:00.000Z",
    "phase2_generation": false,
    "phase2_completed_at": null,
    "phase3_enhancement": false,
    "phase3_completed_at": null,
    "phase4_quality": false,
    "phase4_completed_at": null
  },
  "frontend": { "...": "..." }
}
```

**Resume logic:** If the config file already exists with `_progress`, check which phases are incomplete and resume from the first `false` phase. **Before resuming, verify that the expected output files from prior phases actually exist.** If they are missing, re-run the earlier phase instead of skipping it.

- If `phase2_generation` is `false`: read and follow `.windsurf/workflows/project-init-generate.md`
- If `phase3_enhancement` is `false`:
  - **Verify** that `.windsurf/rules/` contains the 8 base rule files (output of Phase 2). If not, re-run Phase 2 first.
  - Read and follow `.windsurf/workflows/project-init-enhance.md`
- If `phase4_quality` is `false`:
  - **Verify** that base rules contain stack-enhancement markers (output of Phase 3). If not, re-run Phase 3 first.
  - Read and follow `.windsurf/workflows/project-init-quality.md`
- If all are `true`: show "All phases already completed. Delete `_progress` to re-run."

---

## Phase 1: Stack Detection

**Step 1:** Check if the config file exists:

```
.windsurf/project-init-config.json
```

**If the file exists:**

1. Automatically read and validate the JSON (see "Config JSON Validation")
2. If valid: Continue to **Phase 2** with the config values
3. Show the user a summary: "Config found: Frontend: [framework], Backend: [framework]..."

**If the file does NOT exist:**

First, check if Node.js is available:

// turbo

```bash
node --version
```

---

### Path A: Node.js Available (UI-Based Setup)

If `node --version` succeeds:

// turbo

1. **Run the setup script as a non-blocking command** (the server shuts down automatically after the user saves):

On Windows:

```bash
.\.windsurf\tools\install.bat
```

On macOS/Linux:

```bash
bash .windsurf/tools/install.sh
```

2. Tell the user:

```
The Tech-Stack UI has been opened in your browser.
A local config server is running on port 3847.

Please fill out the form. You can click "Analyze Project" to auto-detect your stack.
Then click "Save & Generate" -- the config will be saved automatically.
```

3. **Automatically wait for the config file (NO user confirmation needed):**
   - The install.bat process runs the Node.js server which exits after save
   - Use `command_status` to poll the running command (wait 30-60 seconds per check)
   - When the command status is `done`, the config has been saved
   - Immediately read `.windsurf/project-init-config.json` and continue to Phase 2
   - If the file does not exist after the command completes: show "Config file not found. Please run `/project-init` again."
   - **Do NOT ask the user to type 'yes', 'done', or any confirmation -- detect it automatically**

---

### Path B: No Node.js (Agent-Based Project Scan)

If `node --version` fails (Node.js not installed), the agent performs the project analysis directly using its own tools (`read_file`, `find_by_name`, `grep_search`, `list_dir`). No server, no browser, no UI required.

Tell the user:

```
Node.js is not available. Running agent-based project analysis directly.
No server or browser needed -- I will scan the project and build the config.
```

#### Step B1: Read Detection Maps

Read the detection maps from `.windsurf/tools/detection-maps.json` (single source of truth). This is a standard JSON file -- no JavaScript parsing needed.

The JSON file contains these top-level keys, each mapping dependency names to config values:

- `npm` (JS/TS -- frontend & backend fields, priority-based)
- `python` (Python frameworks, ORMs, databases, etc.)
- `java` (Maven/Gradle artifactIds)
- `dotnet` (NuGet package IDs)
- `go` (go.mod module paths)
- `rust` (Cargo.toml crate names)
- `php` (Composer package names)
- `ruby` (Gemfile gem names)
- `dart` (pubspec.yaml package names -- Flutter/Dart)
- `elixir` (mix.exs dep atoms -- Elixir/Phoenix)
- `scala` (build.sbt artifact names -- Scala/Play/http4s)
- `architecture` (i18n, auth, apiStyle detection)

Use `read_file` to read `detection-maps.json`. Each ecosystem key contains field mappings (e.g. `"backend.framework"`) with arrays of `{ "dep": "...", "value": "..." }` entries. For npm entries, a `"priority"` field determines which match wins when multiple deps match the same field.

#### Step B2: Find Dependency Files

Use `find_by_name` to search the project root (max depth 2) for:

| File                                                   | Language/Ecosystem          |
| ------------------------------------------------------ | --------------------------- |
| `package.json`                                         | JavaScript/TypeScript (npm) |
| `requirements.txt`, `requirements-dev.txt`             | Python (pip)                |
| `requirements/base.txt`, `requirements/production.txt` | Python (pip, split)         |
| `pyproject.toml`                                       | Python (Poetry/PEP 621)     |
| `go.mod`                                               | Go                          |
| `Cargo.toml`                                           | Rust                        |
| `*.csproj`, `*.sln`                                    | C#/.NET                     |
| `pom.xml`                                              | Java (Maven)                |
| `build.gradle`, `build.gradle.kts`                     | Java/Kotlin (Gradle)        |
| `composer.json`                                        | PHP                         |
| `Gemfile`                                              | Ruby                        |
| `mix.exs`                                              | Elixir                      |
| `pubspec.yaml`                                         | Dart/Flutter                |
| `build.sbt`                                            | Scala (SBT)                 |
| `deno.json`, `deno.jsonc`                              | Deno (TypeScript)           |
| `go.work`                                              | Go (multi-module workspace) |
| `settings.gradle`, `settings.gradle.kts`               | Java/Kotlin (Gradle multi)  |
| `pnpm-workspace.yaml`                                  | pnpm workspaces             |

Also search **workspace subdirectories** (depth 3): If monorepo indicators are found (`pnpm-workspace.yaml`, `package.json` with `workspaces`, `nx.json`, `turbo.json`), scan workspace package paths for additional dependency files. Similarly scan common fullstack subdirectories: `frontend/`, `backend/`, `client/`, `server/`, `web/`, `api/`, `app/`.

Read each found file with `read_file`.

#### Step B3: Find Config & Meta Files

Use `find_by_name` to search the project root (max depth 2) for:

**Framework config files** (each overrides dependency detection with high confidence):

| File Pattern        | Sets                 | Value      |
| ------------------- | -------------------- | ---------- |
| `angular.json`      | `frontend.framework` | `angular`  |
| `next.config.*`     | `frontend.framework` | `nextjs`   |
| `nuxt.config.*`     | `frontend.framework` | `nuxt`     |
| `svelte.config.*`   | `frontend.framework` | `svelte`   |
| `tailwind.config.*` | `frontend.styling`   | `tailwind` |
| `vite.config.*`     | `frontend.bundler`   | `vite`     |
| `webpack.config.*`  | `frontend.bundler`   | `webpack`  |
| `uno.config.*`      | `frontend.styling`   | `unocss`   |

**TypeScript:** `tsconfig.json` -> sets `architecture.typescript: true`

**Package manager lockfiles:**

| File                      | Sets `devops.packageManager` |
| ------------------------- | ---------------------------- |
| `bun.lockb` or `bun.lock` | `bun`                        |
| `pnpm-lock.yaml`          | `pnpm`                       |
| `yarn.lock`               | `yarn`                       |
| `package-lock.json`       | `npm`                        |

**ORM configs:**

- `prisma/schema.prisma` -> read `provider` field for `backend.database`
- `drizzle.config.*` -> read for database provider hints

**UI detection:**

- `components.json` -> if contains `$schema`, `style`, or `tailwind` key: `frontend.uiLibrary: shadcn`

**CI/CD:**

| Path                      | Sets `devops.cicd` |
| ------------------------- | ------------------ |
| `.github/workflows/`      | `github_actions`   |
| `.gitlab-ci.yml`          | `gitlab_ci`        |
| `azure-pipelines.yml`     | `azure_devops`     |
| `Jenkinsfile`             | `jenkins`          |
| `bitbucket-pipelines.yml` | `bitbucket`        |
| `.circleci/config.yml`    | `circleci`         |

**Docker & Deployment:**

- `Dockerfile` or `docker-compose.*` or `compose.*` -> `devops.docker: true`, `devops.deployment: docker`
- `vercel.json` -> `devops.deployment: vercel`
- `netlify.toml` -> `devops.deployment: netlify`
- `fly.toml` -> `devops.deployment: fly`
- `wrangler.toml` -> `devops.deployment: cloudflare`
- `Procfile` -> `devops.deployment: heroku`
- `app.yaml` -> `devops.deployment: gcp-appengine`
- `amplify.yml` / `amplify.yaml` -> `devops.deployment: aws-amplify`
- `template.yaml` (with `AWS::Serverless`) -> `devops.deployment: aws-sam`
- `cdk.json` -> `devops.deployment: aws-cdk`
- `pulumi.yaml` -> `devops.deployment: pulumi`
- `render.yaml` -> `devops.deployment: render`
- `railway.json` / `railway.toml` -> `devops.deployment: railway`
- `serverless.yml` / `serverless.yaml` -> `devops.deployment: serverless`
- `k8s/` or `kubernetes/` or `charts/` -> `devops.deployment: kubernetes`

**Monorepo:**

| File                  | Sets `architecture.monorepo` |
| --------------------- | ---------------------------- |
| `nx.json`             | `nx`                         |
| `turbo.json`          | `turborepo`                  |
| `lerna.json`          | `lerna`                      |
| `pnpm-workspace.yaml` | `pnpm-workspaces`            |

**i18n directories:** `i18n/`, `locales/`, `lang/`, `translations/`, `messages/`, `src/i18n/`

- If any exist: `architecture.i18n: true`
- Scan files inside for language codes (e.g. `en.json`, `de/`) -> `architecture.languages`

**Quality tools:**

- `biome.json` or `biome.jsonc` -> `devops.quality: biome`
- `.oxlintrc.json` -> `devops.quality: oxlint`

**Environment hints:** Read `.env`, `.env.example`, `.env.local` for:

- `DATABASE_URL=*postgres*` -> `backend.database: postgres` (low confidence fallback)
- `REDIS_URL` or `REDIS_HOST` -> `backend.caching: redis` (low confidence fallback)

#### Step B4: Parse Dependencies & Match Against Maps

For each found dependency file, extract the dependency names:

**package.json:** Read `dependencies` and `devDependencies` keys. Match each dependency name against `DETECTION_MAP` entries. For entries with `priority`, pick the highest-priority match per field. Also check:

- `jest`/`vitest` + `cypress`/`@playwright/test` combos -> `devops.testing`
- `eslint` + `prettier` + `husky` combos -> `devops.quality`
- `@storybook/*` -> `devops.storybook: true`
- `ARCHITECTURE_MAP` entries (i18n, auth, apiStyle)

**requirements.txt / pyproject.toml:** Extract package names (one per line, ignore comments/flags). Match against `PYTHON_MAP`.

**go.mod:** Extract module paths from `require` blocks. Match against `GO_MAP` (use prefix matching: `dep.startsWith(entry) || dep.endsWith(entry)`).

**Cargo.toml:** Extract crate names from `[dependencies]`, `[dev-dependencies]`, `[build-dependencies]`. Match against `RUST_MAP`.

**\*.csproj:** Extract `PackageReference Include="..."` values. Match against `DOTNET_MAP`.

**pom.xml:** Extract `<artifactId>` from `<dependency>` and `<plugin>` blocks. Match against `JAVA_MAP`.

**build.gradle(.kts):** Extract artifact names from `implementation`, `api`, `testImplementation` etc. Match against `JAVA_MAP`.

**composer.json:** Extract keys from `require` and `require-dev`. Match against `PHP_MAP`.

**Gemfile:** Extract gem names from `gem '...'` lines. Match against `RUBY_MAP`.

**mix.exs:** Extract atom names from `defp deps` block (e.g. `{:phoenix, "~> 1.7"}`). Match against `ELIXIR_MAP`. If `phoenix` is found -> `backend.framework: phoenix` (high confidence).

**pubspec.yaml:** Extract package names from `dependencies:` and `dev_dependencies:` sections. Match against `DART_MAP`. If `flutter` is found -> `frontend.framework: flutter`.

**build.sbt:** Extract artifact names from `%%` / `%` dependency declarations (e.g. `"org" %% "artifact" % "version"`). Match against `SCALA_MAP`.

**deno.json / deno.jsonc:** Parse `imports` map. Extract package names from keys and values (jsr:/npm: specifiers). Check for `fresh` (frontend), `oak`/`hono` (backend). Set `architecture.typescript: true`.

**go.work:** Parse `use` directives for module paths. Read `go.mod` in each module directory and match against `GO_MAP`.

**settings.gradle(.kts):** Parse `include` statements for Gradle sub-modules. Read `build.gradle` in each sub-module and match against `JAVA_MAP`.

**pom.xml `<modules>`:** Parse `<module>` entries from parent pom. Read `pom.xml` in each sub-module and match against `JAVA_MAP`.

**Cargo.toml `[workspace]`:** Parse `members` array. Read `Cargo.toml` in each member directory and match against `RUST_MAP`.

**Nuxt modules:** If `nuxt.config.ts/js` found, scan `modules: [...]` array for known module names and apply mappings (e.g. `@nuxtjs/tailwindcss` -> `frontend.styling: tailwind`).

**Django manage.py:** If `manage.py` exists and contains `django` -> `backend.framework: django` (overrides Python dep detection).

**Architecture detection for all ecosystems:** The detection maps for Java, .NET, Go, Rust, PHP, Ruby, Dart, Elixir, and Scala include `architecture.auth` entries. When matching dependencies against these maps, auth results are written directly to `architecture.auth` (not `backend.auth`). The i18n directory scan (Step B3) applies regardless of ecosystem. For `architecture.apiStyle`, check npm `ARCHITECTURE_MAP` entries if `package.json` exists; for non-JS stacks, infer from detected dependencies (e.g. GraphQL libraries -> `graphql`, gRPC libraries -> `grpc`).

#### Step B4b: Detect Programming Languages

Scan the project for file extensions to determine which programming languages are used. Use `find_by_name` with extensions filter (max depth 3, exclude `node_modules`, `.git`, `vendor`, `dist`, `build`, `target`, `bin`, `obj`, `__pycache__`):

| Extension(s)                  | Language   |
| ----------------------------- | ---------- |
| `.ts`, `.tsx`, `.mts`, `.cts` | TypeScript |
| `.js`, `.jsx`, `.mjs`, `.cjs` | JavaScript |
| `.py`                         | Python     |
| `.java`                       | Java       |
| `.kt`, `.kts`                 | Kotlin     |
| `.cs`                         | C#         |
| `.go`                         | Go         |
| `.rs`                         | Rust       |
| `.php`                        | PHP        |
| `.rb`                         | Ruby       |
| `.ex`, `.exs`                 | Elixir     |
| `.scala`, `.sc`               | Scala      |
| `.dart`                       | Dart       |
| `.swift`                      | Swift      |
| `.vue`                        | Vue SFC    |
| `.svelte`                     | Svelte SFC |

Also infer from config files as fallback: `tsconfig.json` -> TypeScript, `go.mod` -> Go, `Cargo.toml` -> Rust, `pubspec.yaml` -> Dart, `mix.exs` -> Elixir, `build.sbt` -> Scala.

Store the sorted list as `meta.programmingLanguages` in the config.

#### Step B5: Build Config JSON

Assemble the config with this structure:

```json
{
  "version": 2,
  "frontend": {
    "framework": "[detected or none]",
    "styling": "[detected or none]",
    "stateManagement": "[detected or none]",
    "uiLibrary": "[detected or none]",
    "bundler": "[detected or none]",
    "formLibrary": "[detected or none]",
    "dataFetching": "[detected or none]"
  },
  "backend": {
    "framework": "[detected or none]",
    "database": "[detected or none]",
    "orm": "[detected or none]",
    "validation": "[detected or none]",
    "caching": "[detected or none]",
    "messageQueue": "[detected or none]",
    "realtime": "[detected or none]"
  },
  "architecture": {
    "i18n": false,
    "languages": [],
    "auth": "[detected or none]",
    "apiStyle": "[detected or none]",
    "multiTenancy": "none",
    "monorepo": "[detected or none]",
    "typescript": false
  },
  "meta": {
    "programmingLanguages": ["[detected languages]"]
  },
  "devops": {
    "deployment": "[detected or unknown]",
    "cicd": "[detected or none]",
    "testing": "[detected or none]",
    "quality": "[detected or none]",
    "packageManager": "[detected or unknown]",
    "docker": false,
    "storybook": false
  }
}
```

#### Step B6: Summary & Confirmation

Present the detection results as a table:

```
+---------------------------+-------------------+------------+
| Field                     | Detected Value    | Confidence |
+---------------------------+-------------------+------------+
| frontend.framework        | nextjs            | high       |
| frontend.styling          | tailwind          | high       |
| backend.framework         | nestjs            | high       |
| backend.database          | postgres          | high       |
| ...                       | ...               | ...        |
+---------------------------+-------------------+------------+
Files scanned: package.json, tsconfig.json, tailwind.config.ts, ...
```

Then ask the user:

```
These values were auto-detected. Would you like to adjust anything before I generate the skills?
If everything looks correct, I will save the config and continue.
```

- If the user confirms: write `.windsurf/project-init-config.json` using the `write_to_file` tool and continue to **Phase 2**
- If the user requests changes: apply modifications, update the table, ask again
- Validate the config before saving (same rules as "Config JSON Validation" section)

---

## Config JSON Validation

The config must be valid JSON and match the following structure:

```json
{
  "version": 2,
  "frontend": {
    "framework": "angular",
    "styling": "tailwind",
    "stateManagement": "ngrx",
    "uiLibrary": "angular-material",
    "bundler": "vite",
    "formLibrary": "angular-forms",
    "dataFetching": "tanstack-query"
  },
  "backend": {
    "framework": "nestjs",
    "database": "postgres",
    "orm": "prisma",
    "validation": "zod",
    "caching": "redis",
    "messageQueue": "bullmq",
    "realtime": "socketio"
  },
  "architecture": {
    "i18n": true,
    "languages": ["EN", "DE"],
    "auth": "jwt",
    "apiStyle": "rest",
    "multiTenancy": "none",
    "monorepo": "none",
    "typescript": true
  },
  "meta": {
    "programmingLanguages": ["TypeScript", "JavaScript"]
  },
  "devops": {
    "deployment": "docker",
    "cicd": "github_actions",
    "testing": "vitest_playwright",
    "quality": "eslint_prettier_husky",
    "packageManager": "pnpm",
    "docker": true,
    "storybook": false
  }
}
```

Validation rules:

- At least `frontend.framework` or `backend.framework` must be set (not both `none`)
- If `architecture.i18n` = `true`, `architecture.languages` must be a non-empty array
- `version` must be `2` (v1 configs are auto-migrated by adding missing fields with `"none"` defaults)

On validation errors:

- List the errors
- Ask the user to fix the JSON

---

## Phase 1 Complete -- Auto-Chain to Phase 2

After the config is saved and validated:

1. Add `_progress` field to config if not present: `{ "phase1_detection": true, "phase1_completed_at": "<ISO timestamp>", "phase2_generation": false, "phase2_completed_at": null, "phase3_enhancement": false, "phase3_completed_at": null, "phase4_quality": false, "phase4_completed_at": null }`
2. Tell the user: "Config saved. Starting rule generation (Phase 2)..."
3. **Immediately** read and follow `.windsurf/workflows/project-init-generate.md`

---

## Agent-Fallback: Direct Dependency Analysis

If Node.js is not available (no server running), the agent can still analyze the project by reading dependency files directly:

### Supported Dependency Files

| File               | Language | Parser Logic                                                                    |
| ------------------ | -------- | ------------------------------------------------------------------------------- |
| `package.json`     | JS/TS    | JSON parse, merge `dependencies` + `devDependencies`                            |
| `requirements.txt` | Python   | Line-based, strip version specifiers                                            |
| `pyproject.toml`   | Python   | TOML section `[project.dependencies]` or `[tool.poetry.dependencies]`           |
| `pom.xml`          | Java     | XML regex for `<artifactId>` in `<dependency>` and `<plugin>` blocks            |
| `build.gradle`     | Java     | Regex for `implementation/api/testImplementation` with `group:artifact:version` |
| `build.gradle.kts` | Kotlin   | Same as `build.gradle` (Kotlin DSL)                                             |
| `*.csproj`         | .NET/C#  | XML regex for `<PackageReference Include="...">`                                |
| `go.mod`           | Go       | Regex for `require` directives (single + block)                                 |
| `Cargo.toml`       | Rust     | TOML section `[dependencies]`, `[dev-dependencies]`                             |
| `composer.json`    | PHP      | JSON parse, merge `require` + `require-dev`                                     |
| `Gemfile`          | Ruby     | Regex for `gem 'name'` lines                                                    |

### Agent Analysis Procedure

1. Check which dependency files exist in the project root
2. Read file content using the Read tool
3. Parse dependencies using the logic described above
4. Match against the detection maps (JAVA_MAP, DOTNET_MAP, GO_MAP, RUST_MAP, PHP_MAP, RUBY_MAP)
5. Build the config JSON structure and save to `.windsurf/project-init-config.json`
6. Continue to "Phase 1 Complete" above
