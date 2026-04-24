# Workflow Extension Map

Reference data for `/project-init-enhance`. Maps stack selections to workflow enhancements.

## Marking Rule

Every added workflow step must start with this header:

```markdown
## Step Nb: [Description] (Stack: [framework])

> Auto-added by /project-init -- Stack: [framework] -- Remove if stack changes
```

Example:

```markdown
## Step 9b: NestJS Testing Patterns (Stack: NestJS)

> Auto-added by /project-init -- Stack: NestJS -- Remove if stack changes

... NestJS-specific content ...
```

## Extension Mapping

| Stack Selection                | Workflows to Add/Enhance                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| Django + PostgreSQL            | `migration.md` (Django migrations), `api-docs.md` (DRF schema)                     |
| Next.js + React                | `generate-tests.md` (React Testing Library), `refactor-legacy.md` (React patterns) |
| Angular + Karma/Jest           | `generate-tests.md` (TestBed patterns, component harnesses)                        |
| Vue/Nuxt + Vitest              | `generate-tests.md` (Vue Test Utils, mountSuspended, Pinia testing)                |
| NestJS + TypeORM/Prisma        | `migration.md` (TypeORM/Prisma migrations), `api-docs.md` (Swagger decorators)     |
| Go + Docker                    | `docker-setup.md` (multi-stage Go build), `ci-pipeline.md` (golangci-lint step)    |
| Rust + Cargo                   | `ci-pipeline.md` (cargo clippy, cargo test, cargo audit steps)                     |
| .NET + EF Core                 | `migration.md` (EF Core migrations), `api-docs.md` (Swashbuckle/NSwag)             |
| Spring + Gradle/Maven          | `ci-pipeline.md` (Gradle/Maven build steps), `generate-tests.md` (MockMvc)         |
| PHP/Laravel + Sail             | `docker-setup.md` (Laravel Sail config), `migration.md` (Artisan migrations)       |
| Ruby/Rails                     | `migration.md` (Rails migrations), `generate-tests.md` (RSpec patterns)            |
| Any Backend                    | `deep-security-audit.md` (stack-specific security checks)                          |
| i18n=true                      | Add i18n-specific steps to existing workflows                                      |
| Testing framework selected     | Enhance `generate-tests.md` with framework-specific patterns                       |
| backend.caching: redis         | Enhance `performance.md` workflow with cache invalidation strategies               |
| backend.messageQueue: \*       | Enhance `architecture-review.md` with async job patterns and dead-letter queues    |
| backend.realtime: \*           | Enhance `deep-security-audit.md` with WebSocket security (auth, rate limiting)     |
| architecture.apiStyle: graphql | Enhance `api-docs.md` with GraphQL schema documentation generation                 |
| architecture.apiStyle: trpc    | Enhance `generate-tests.md` with tRPC router testing patterns                      |
| backend.validation: zod        | Enhance `api-docs.md` with Zod schema-to-OpenAPI generation                        |
| frontend.dataFetching: \*      | Enhance `generate-tests.md` with query/mutation mocking patterns                   |
| devops.docker: true            | Enhance `docker-setup.md` with project-specific Dockerfile and compose             |
| architecture.monorepo: \*      | Enhance `ci-pipeline.md` with monorepo-aware build/test strategies                 |
