# Stack-Adaptive Code Examples Mapping

Reference data for `/project-init-generate`. Defines which code style to use in base rules per stack.

**IMPORTANT:** All base rules must use code examples that match the selected tech stack.

## Stack-to-Code-Style Table

| Selected Stack       | Code Examples Should Use                                    |
| -------------------- | ----------------------------------------------------------- |
| Next.js / React      | TypeScript, TSX, React hooks, RSC (React Server Components) |
| Angular              | TypeScript, Angular decorators, RxJS                        |
| Vue                  | TypeScript, Vue Composition API (`<script setup>`), Pinia   |
| Nuxt                 | TypeScript, `<script setup>`, useFetch/useAsyncData, Pinia  |
| Django               | Python, Django ORM, DRF (Django REST Framework)             |
| FastAPI              | Python, Pydantic v2, async def, lifespan context managers   |
| Flask                | Python, Flask blueprints, SQLAlchemy, WTForms               |
| NestJS               | TypeScript, NestJS decorators, MikroORM/TypeORM, DTOs       |
| .NET                 | C#, Entity Framework Core, minimal APIs, MediatR            |
| Blazor               | C#, Razor components, SignalR                               |
| Spring               | Java, Spring annotations, JPA, Bean Validation              |
| Quarkus              | Java, CDI annotations, Panache, SmallRye                    |
| Micronaut            | Java, Micronaut annotations, Data JPA                       |
| Go                   | Go, standard library, Gin/Echo/Fiber                        |
| Rust                 | Rust, Actix-web/Axum, serde, tokio                          |
| Laravel              | PHP, Eloquent ORM, Blade templates, Artisan commands        |
| Symfony              | PHP, Doctrine ORM, Twig templates, Symfony Console          |
| Rails                | Ruby, ActiveRecord, ERB/Haml, RSpec, Action Cable           |
| Sinatra              | Ruby, Sequel/ActiveRecord, Rack middleware                  |
| Phoenix              | Elixir, Ecto, LiveView, Phoenix Channels                    |
| Scala / Play         | Scala, Play Framework, Slick/Doobie, Akka                   |
| Scala / http4s       | Scala, Cats Effect, http4s, Circe, fs2                       |
| Flutter              | Dart, Flutter widgets, BLoC/Riverpod, Material Design        |
| Deno / Fresh         | TypeScript, Preact, Islands architecture, Deno APIs          |
| Deno / Oak           | TypeScript, Oak middleware, Deno standard library             |
| Express/Fastify/Hono | TypeScript/JavaScript, Node.js APIs, middleware patterns    |

## Examples

**If config has `backend.framework: django`:**

- `code-quality.md` -> Python examples with PEP 8
- `security.md` -> Django security middleware, CSRF
- `error-handling.md` -> Python try/except, Django exceptions
- `testing.md` -> pytest, Django TestCase

**If config has `frontend.framework: nextjs`:**

- `code-quality.md` -> TypeScript examples
- `error-handling.md` -> React Error Boundaries, try/catch
- `testing.md` -> Jest, React Testing Library
