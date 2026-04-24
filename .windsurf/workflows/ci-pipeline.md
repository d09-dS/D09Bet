---
description: Generate CI/CD pipeline configuration for the project
---

# CI/CD Pipeline Workflow

This workflow generates CI/CD pipeline configuration based on the detected tech stack and target platform.

## Step 1: Detect Pipeline Target

Read `.windsurf/project-init-config.json` or ask the user:

- **CI/CD platform:** GitHub Actions, GitLab CI, Azure DevOps, Jenkins
- **Runtime:** Node.js, Python, .NET, Java
- **Testing:** Jest, Vitest, pytest, xUnit
- **Deployment target:** Docker, Kubernetes, Vercel, AWS, Azure

## Step 2: Generate Pipeline Configuration

### GitHub Actions

```yaml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: "22"
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    name: Test
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: "npm"
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3

  build:
    name: Build & Push Image
    runs-on: ubuntu-latest
    needs: [test, e2e, security]
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### GitLab CI

```yaml
stages:
  - lint
  - test
  - security
  - build
  - deploy

variables:
  NODE_VERSION: "22"

.node-cache:
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
    policy: pull

lint:
  stage: lint
  image: node:${NODE_VERSION}-alpine
  extends: .node-cache
  cache:
    policy: pull-push
  script:
    - npm ci
    - npm run lint
    - npm run typecheck

test:unit:
  stage: test
  image: node:${NODE_VERSION}-alpine
  extends: .node-cache
  services:
    - postgres:16-alpine
  variables:
    POSTGRES_USER: test
    POSTGRES_PASSWORD: test
    POSTGRES_DB: testdb
    DATABASE_URL: postgresql://test:test@postgres:5432/testdb
  script:
    - npm ci
    - npm test -- --coverage
  coverage: '/All files\s+\|\s+[\d.]+/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    when: always

test:e2e:
  stage: test
  image: mcr.microsoft.com/playwright:v1.48.0-noble
  extends: .node-cache
  script:
    - npm ci
    - npm run test:e2e
  artifacts:
    paths:
      - playwright-report/
    when: on_failure

security:
  stage: security
  script:
    - npm audit --audit-level=high

include:
  - template: Security/SAST.gitlab-ci.yml
  - template: Security/Secret-Detection.gitlab-ci.yml
  - template: Security/Dependency-Scanning.gitlab-ci.yml

build:
  stage: build
  image: docker:27
  services:
    - docker:27-dind
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -t $CI_REGISTRY_IMAGE:latest .
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
```

### Python (pytest) Variant

Replace the test job with:

```yaml
test:
  name: Test
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v5
      with:
        python-version: "3.12"
        cache: "pip"
    - run: pip install -r requirements.txt -r requirements-dev.txt
    - run: pytest --cov --cov-report=xml
    - uses: actions/upload-artifact@v4
      with:
        name: coverage-report
        path: coverage.xml
```

### .NET Variant

Replace the test job with:

```yaml
test:
  name: Test
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-dotnet@v4
      with:
        dotnet-version: "9.0.x"
    - run: dotnet restore
    - run: dotnet build --no-restore
    - run: dotnet test --no-build --collect:"XPlat Code Coverage"
```

## Step 3: Generate Branch Protection Rules

Recommend the following branch protection for `main`:

- Require pull request reviews (minimum 1 reviewer)
- Require status checks to pass: `lint`, `test`, `security`
- Require branches to be up to date before merging
- No force pushes
- No deletions

## Step 4: Pipeline Checklist

Before committing the pipeline:

- [ ] All secrets are stored in CI/CD variables (never in YAML)
- [ ] Dependency caching is configured (npm, pip, nuget)
- [ ] Concurrency control prevents duplicate runs on same branch
- [ ] Artifact uploads configured for test reports and coverage
- [ ] Security scanning included (SAST, dependency audit, secret detection)
- [ ] Docker image tags include commit SHA (not just `latest`)
- [ ] E2E test artifacts preserved on failure for debugging
- [ ] Pipeline runs on both push to main AND pull requests

## Gotchas

- **Missing `concurrency` in GitHub Actions** -- without it, multiple pushes to the same branch trigger parallel runs that waste resources and may conflict.
- **`npm install` instead of `npm ci`** -- `npm ci` is faster, deterministic, and matches `package-lock.json` exactly. Never use `npm install` in CI.
- **Docker layer caching not configured** -- without `cache-from: type=gha`, every build starts from scratch. Build times increase dramatically.
- **Secrets in pipeline logs** -- `echo $SECRET` or verbose mode can leak secrets. Use masking (`::add-mask::`) and avoid debug logging in production pipelines.
- **`latest` tag only on Docker images** -- deployments become non-reproducible. Always tag with commit SHA or version number.

## References

- `docs.github.com/en/actions` -- GitHub Actions documentation
- `docs.gitlab.com/ee/ci/` -- GitLab CI/CD documentation
- `learn.microsoft.com/en-us/azure/devops/pipelines/` -- Azure Pipelines

## Step 5: Output Summary

```
CI/CD Pipeline Generated

Files created:
- .github/workflows/ci.yml (or .gitlab-ci.yml)

Pipeline stages:
1. Lint & Type Check
2. Unit & Integration Tests (with coverage)
3. E2E Tests (Playwright)
4. Security Scan (SAST + dependency audit)
5. Build & Push Docker Image (main branch only)

Next steps:
1. Add required secrets to CI/CD settings
2. Configure branch protection rules
3. Push to trigger first pipeline run
```

## Step 6: Save to Dashboard

Persist the CI pipeline results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/ci-pipeline/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "ci-pipeline",
  "timestamp": "[ISO timestamp]",
  "score": 100,
  "maxScore": 100,
  "verdict": "Pipeline generated",
  "findings": { "critical": 0, "high": 0, "medium": 0, "low": 0 },
  "highlights": ["[pipeline stages created]"],
  "issues": [],
  "summary": "CI/CD pipeline generated with [N] stages",
  "reportPath": ".windsurf/dashboard/runs/ci-pipeline/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk
