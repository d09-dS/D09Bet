# Reference Sources for Best Practices

Reference data for `/project-init-generate` (Phase 2) and `/project-init-enhance` (Phase 3). Sources to consult when generating and enhancing rules.

## Primary Sources

| Source                    | URL                                                     | Content                                                                                                                                             | When to use                                                             |
| ------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **skills.sh**             | https://skills.sh                                       | Community agent skills (e.g. `vercel-react-best-practices`, `tailwind-design-system`, `api-design-principles`)                                      | Stack-specific rule generation                                          |
| **windsurf.run**          | https://windsurf.run                                    | Framework-specific rules (e.g. Next.js, Vue, NestJS, Django, FastAPI)                                                                               | Stack-specific rule generation                                          |
| **agentskills.io**        | https://agentskills.io/skill-creation/best-practices    | Official specification for high-quality agent skills -- defines structure, frontmatter, progressive disclosure                                      | Quality check for every generated rule file                             |
| **agentskills.io (eval)** | https://agentskills.io/skill-creation/evaluating-skills | Assertion design, reasoning-based instructions, lean skill principles, iterative improvement loops                                                  | Quality validation (Phase 4) + instruction quality checks (B8, B9, B10) |
| **Windsurf Docs**         | https://docs.windsurf.com/windsurf/cascade/memories     | Activation modes (`always_on`, `glob`, `model_decision`, `manual`), context cost, character limits (12K workspace / 6K global), rule best practices | Rule structure validation (A7, A8) + context budget (E11)               |
| **OWASP Cheat Sheets**    | https://cheatsheetseries.owasp.org                      | Concrete, actionable code patterns for every OWASP Top 10 vulnerability (Injection, Auth, XSS, CSRF, etc.)                                          | Security rule generation + `/deep-security-audit`                       |
| **web.dev**               | https://web.dev/learn/performance + /accessibility      | Google's authoritative Core Web Vitals (INP, LCP, CLS), Accessibility (ARIA, WCAG), Image optimization                                              | `performance.md` + `accessibility.md` enhancement                       |

## Procedure

### URL Selection

1. **Read the project config** -- determine the active stack from `frontend.framework`, `backend.framework`, `testing.e2e`, and other config values
2. **Match config values to the verified table below** -- collect all URLs where the Config Value column matches a selected technology
3. **Always include** `agentskills.io/skill-creation/best-practices` (quality standard for every rule)

### Fetch Order

Load URLs in this priority order using `read_url_content`:

1. **Stack-specific sources first** -- skills.sh + windsurf.run URLs matching the detected stack
2. **Quality standards** -- `agentskills.io/skill-creation/best-practices` and `agentskills.io/skill-creation/evaluating-skills`
3. **Official framework docs** -- only if skills.sh/windsurf.run did not provide sufficient patterns for a technology
4. **Cross-cutting sources** -- OWASP, web.dev -- only when generating security, performance, or accessibility rules

### Fetch Execution

1. **Use the `read_url_content` tool** to fetch each relevant URL -- do NOT rely on training knowledge alone
2. **Fetch in parallel** where possible -- independent URLs can be loaded simultaneously
3. **For "Search" entries** (e.g. `Search skills.sh for angular`): use `search_web` with query `site:skills.sh angular` to discover the actual URL, then fetch it with `read_url_content`
4. **Hold fetched content in context** as reference material for all subsequent generation and enhancement steps

### Error Handling

- If a URL returns 404, 403, or times out: apply the **Fallback Strategy** below -- do not abort
- If multiple URLs fail: log which ones failed and proceed with available content + training knowledge
- Never skip rule generation because a reference URL is unreachable

> The verified table below is a **minimum baseline** -- not an exclusive list. If better or more specific references exist, use them.

## Fallback Strategy

If a reference URL returns 404, 403, or is otherwise unreachable:

1. **Primary fallback**: Use the **official framework documentation** (rightmost column in the table below) -- these are the most stable URLs
2. **Secondary fallback**: Use `agentskills.io` as alternative source for skill structure and best practices:
   - `agentskills.io/specification` -- canonical skill file structure
   - `agentskills.io/skill-creation/best-practices` -- writing effective agent instructions
   - `agentskills.io/skill-creation/evaluating-skills` -- testing and validation patterns
3. **Tertiary fallback**: Use your training knowledge combined with the patterns already established in the existing base rules (`.windsurf/rules/`)
4. **Never skip a rule** because a reference is unreachable -- always generate content using available sources

## Verified Reference Mappings (minimum baseline -- direct URLs)

| Config Value            | skills.sh Reference                                              | windsurf.run Reference                                 | Official Docs                                     |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- |
| `react` / `nextjs`      | `skills.sh/vercel-labs/agent-skills/vercel-react-best-practices` | `windsurf.run/nextjs-react-typescript-cursor-rules`    | `nextjs.org/docs`                                 |
| `vue`                   | `skills.sh/hyf0/vue-skills/vue-best-practices`                   | `windsurf.run/vuejs-typescript-best-practices`         | `vuejs.org/guide`                                 |
| `nuxt`                  | `skills.sh/hyf0/vue-skills/vue-best-practices`                   | `windsurf.run/nuxtjs-vue-typescript-development-rules` | `nuxt.com/docs`                                   |
| `nestjs`                | `skills.sh/wshobson/agents/api-design-principles`                | `windsurf.run/nestjs-clean-typescript-cursor-rules`    | `docs.nestjs.com`                                 |
| `django`                | `skills.sh/wshobson/agents/api-design-principles`                | `windsurf.run/django-python-cursor-rules`              | `docs.djangoproject.com`                          |
| `fastapi`               | `skills.sh/wshobson/agents/api-design-principles`                | `windsurf.run/fastapi-python-cursor-rules`             | `fastapi.tiangolo.com`                            |
| `angular`               | Search `skills.sh` for `angular`                                 | Search `windsurf.run` for `angular`                    | `angular.dev/guides`                              |
| `dotnet`                | Search `skills.sh` for `dotnet` or `csharp`                      | Search `windsurf.run` for `dotnet`                     | `learn.microsoft.com/dotnet`                      |
| `spring`                | Search `skills.sh` for `spring` or `java`                        | Search `windsurf.run` for `spring`                     | `docs.spring.io`                                  |
| `go`                    | Search `skills.sh` for `go` or `golang`                          | Search `windsurf.run` for `go`                         | `go.dev/doc/effective_go`                         |
| `rust`                  | Search `skills.sh` for `rust`                                    | Search `windsurf.run` for `rust`                       | `doc.rust-lang.org/book`                          |
| `express/fastify/hono`  | `skills.sh/nodejs-backend-patterns`                              | Search `windsurf.run` for `express` or `node`          | `nodejs.org/en/docs/guides`                       |
| `laravel`               | Search `skills.sh` for `laravel` or `php`                        | Search `windsurf.run` for `laravel`                    | `laravel.com/docs`                                |
| `symfony`               | Search `skills.sh` for `symfony` or `php`                        | Search `windsurf.run` for `symfony`                    | `symfony.com/doc/current`                         |
| `rails`                 | Search `skills.sh` for `rails` or `ruby`                         | Search `windsurf.run` for `rails`                      | `guides.rubyonrails.org`                          |
| `phoenix`               | Search `skills.sh` for `phoenix` or `elixir`                     | Search `windsurf.run` for `phoenix`                    | `hexdocs.pm/phoenix`                              |
| `quarkus`               | Search `skills.sh` for `quarkus`                                 | Search `windsurf.run` for `quarkus`                    | `quarkus.io/guides`                               |
| `micronaut`             | Search `skills.sh` for `micronaut`                               | Search `windsurf.run` for `micronaut`                  | `docs.micronaut.io`                               |
| `flask`                 | Search `skills.sh` for `flask`                                   | Search `windsurf.run` for `flask`                      | `flask.palletsprojects.com`                       |
| `tailwind`              | `skills.sh/wshobson/agents/tailwind-design-system`               | -                                                      | `tailwindcss.com/docs`                            |
| `playwright`            | `skills.sh/playwright-best-practices`                            | Search `windsurf.run` for `playwright`                 | `playwright.dev/docs/intro`                       |
| Any backend API         | `skills.sh/wshobson/agents/api-design-principles`                | -                                                      | -                                                 |
| Security rules          | -                                                                | -                                                      | `cheatsheetseries.owasp.org`                      |
| Performance rules       | -                                                                | -                                                      | `web.dev/learn/performance`                       |
| Accessibility rules     | -                                                                | -                                                      | `web.dev/learn/accessibility`                     |
| Rule format & structure | -                                                                | -                                                      | `docs.windsurf.com/windsurf/cascade/memories`     |
| Skill quality patterns  | -                                                                | -                                                      | `agentskills.io/skill-creation/evaluating-skills` |
