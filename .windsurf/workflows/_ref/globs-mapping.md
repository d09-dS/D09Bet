# Globs Mapping

Reference data for `/project-init-generate`. Maps selected stack to file globs for rule frontmatter.

## Stack-to-Globs Table

| Selected Stack       | Globs to Use                                     |
| -------------------- | ------------------------------------------------ |
| Next.js / React      | `["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]` |
| Angular              | `["**/*.ts", "**/*.html"]`                       |
| Vue / Nuxt           | `["**/*.vue", "**/*.ts"]`                        |
| Django / FastAPI     | `["**/*.py"]`                                    |
| NestJS               | `["**/*.ts"]`                                    |
| .NET                 | `["**/*.cs"]`                                    |
| Blazor               | `["**/*.cs", "**/*.razor"]`                      |
| Spring               | `["**/*.java"]`                                  |
| Quarkus / Micronaut  | `["**/*.java"]`                                  |
| Kotlin / Ktor        | `["**/*.kt", "**/*.kts"]`                        |
| Go                   | `["**/*.go"]`                                    |
| Rust                 | `["**/*.rs"]`                                    |
| Laravel / Symfony    | `["**/*.php"]`                                   |
| Rails / Sinatra      | `["**/*.rb", "**/*.erb"]`                        |
| Phoenix / Elixir     | `["**/*.ex", "**/*.exs", "**/*.heex"]`           |
| Scala / Play / http4s| `["**/*.scala", "**/*.sc"]`                      |
| Flutter / Dart       | `["**/*.dart"]`                                  |
| Deno (Fresh/Oak)     | `["**/*.ts", "**/*.tsx"]`                        |
| Express/Fastify/Hono | `["**/*.ts", "**/*.js"]`                         |

Rules are **automatically activated** by Windsurf when the `globs` match the current file being edited.
