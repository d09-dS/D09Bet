# Stack-to-Rule Mapping

Reference data for `/project-init-generate`. Maps config values to rule files and reference sources.

## Frontend Frameworks

| Config Value                              | Rule File to Create            | Reference Source                                       |
| ----------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| `frontend.framework: angular`             | `angular-best-practices.md`    | Search windsurf.run + skills.sh for `angular`          |
| `frontend.framework: react` or `nextjs`   | `react-hooks.md`               | `windsurf.run/nextjs-react-typescript-cursor-rules`    |
| `frontend.framework: vue`                 | `vue-composition.md`           | `windsurf.run/vuejs-typescript-best-practices`         |
| `frontend.framework: nuxt`                | `nuxt-best-practices.md`       | `windsurf.run/nuxtjs-vue-typescript-development-rules` |
| `frontend.framework: svelte`              | `svelte-best-practices.md`     | Search windsurf.run + skills.sh for `svelte`           |
| `frontend.framework: flutter`             | `flutter-best-practices.md`    | Flutter docs + Dart style guide + Riverpod/Bloc patterns |

## Frontend Styling

| Config Value                        | Rule File to Create       | Reference Source            |
| ----------------------------------- | ------------------------- | --------------------------- |
| `frontend.styling: tailwind`        | `tailwind-standards.md`   | `skills.sh/wshobson/agents/tailwind-design-system` |
| `frontend.styling: chakra`          | enhance `code-quality.md` | Chakra UI docs              |
| `frontend.styling: emotion/cssinjs` | enhance `code-quality.md` | CSS-in-JS best practices    |
| `frontend.styling: unocss`          | `unocss-standards.md`     | UnoCSS docs                 |

## Frontend UI Libraries

| Config Value                             | Rule File to Create       | Reference Source                    |
| ---------------------------------------- | ------------------------- | ----------------------------------- |
| `frontend.uiLibrary: shadcn`            | `shadcn-patterns.md`      | shadcn/ui docs + Radix UI primitives |
| `frontend.uiLibrary: radix`             | enhance `accessibility.md`| Radix UI docs                       |
| `frontend.uiLibrary: primeng/primereact` | enhance `code-quality.md` | PrimeNG/PrimeReact docs             |
| `frontend.uiLibrary: vuetify`           | enhance `code-quality.md` | Vuetify docs                        |
| `frontend.uiLibrary: angular-material`  | enhance `code-quality.md` | Angular Material docs               |

## Frontend Data & Forms

| Config Value                            | Rule File to Create        | Reference Source                  |
| --------------------------------------- | -------------------------- | --------------------------------- |
| `frontend.dataFetching: tanstack-query` | `data-fetching-patterns.md`| TanStack Query docs               |
| `frontend.dataFetching: swr`           | enhance `performance.md`   | SWR docs                          |
| `frontend.formLibrary: react-hook-form` | `form-patterns.md`         | React Hook Form + Zod integration |
| `frontend.formLibrary: vee-validate`    | enhance `code-quality.md`  | VeeValidate docs                  |

## Backend Frameworks

| Config Value                              | Rule File to Create            | Reference Source                                       |
| ----------------------------------------- | ------------------------------ | ------------------------------------------------------ |
| `backend.framework: nestjs`               | `nestjs-modules.md`            | `windsurf.run/nestjs-clean-typescript-cursor-rules`    |
| `backend.framework: dotnet`               | `dotnet-conventions.md`        | Search windsurf.run + skills.sh for `dotnet`           |
| `backend.framework: django`               | `django-best-practices.md`     | `windsurf.run/django-python-cursor-rules`              |
| `backend.framework: fastapi`              | `fastapi-best-practices.md`    | `windsurf.run/fastapi-python-cursor-rules`             |
| `backend.framework: spring`               | `spring-best-practices.md`     | Search windsurf.run + skills.sh for `spring`           |
| `backend.framework: go`                   | `go-best-practices.md`         | Search skills.sh for `go` + official Go docs           |
| `backend.framework: rust`                 | `rust-best-practices.md`       | Search skills.sh for `rust` + official Rust docs       |
| `backend.framework: express/fastify/hono` | `nodejs-best-practices.md`     | `skills.sh/nodejs-backend-patterns`                    |
| `backend.framework: flask`                | `flask-best-practices.md`      | Flask docs + community best practices                  |
| `backend.framework: quarkus`              | `quarkus-best-practices.md`    | Quarkus guides + CDI patterns                          |
| `backend.framework: micronaut`            | `micronaut-best-practices.md`  | Micronaut docs + DI patterns                           |
| `backend.framework: laravel`              | `laravel-best-practices.md`    | Laravel docs + Eloquent, Blade, Artisan                |
| `backend.framework: symfony`              | `symfony-best-practices.md`    | Symfony best practices + Doctrine, Twig                |
| `backend.framework: rails`                | `rails-best-practices.md`      | Rails guides + ActiveRecord, RSpec                     |
| `backend.framework: sinatra`              | `sinatra-best-practices.md`    | Sinatra docs + Rack middleware                         |
| `backend.framework: phoenix`              | `phoenix-best-practices.md`    | Phoenix docs + Ecto, LiveView, Channels                |
| `backend.framework: gin/echo/fiber/chi`   | `go-best-practices.md`         | Go effective patterns + framework-specific middleware  |
| `backend.framework: actix/axum/rocket`    | `rust-best-practices.md`       | Rust patterns + framework-specific extractors          |

## Backend Validation

| Config Value                          | Rule File to Create           | Reference Source                         |
| ------------------------------------- | ----------------------------- | ---------------------------------------- |
| `backend.validation: zod`             | `validation-patterns.md`      | Zod docs + schema-first validation       |
| `backend.validation: class-validator`  | enhance `nestjs-modules.md`   | class-validator + class-transformer docs |
| `backend.validation: pydantic`         | enhance Python framework rule | Pydantic v2 docs                         |

## Backend Database & Caching

| Config Value                            | Rule File to Create    | Reference Source                                   |
| --------------------------------------- | ---------------------- | -------------------------------------------------- |
| `backend.database: postgres` or `mysql` | `sql-optimization.md`  | -                                                  |
| `backend.caching: redis`               | `caching-patterns.md`  | Redis best practices + cache invalidation strategies |
| `backend.caching: cache-manager`        | enhance `performance.md` | cache-manager docs                               |

## Backend Queues & Realtime

| Config Value                       | Rule File to Create       | Reference Source                            |
| ---------------------------------- | ------------------------- | ------------------------------------------- |
| `backend.messageQueue: bullmq`     | `queue-patterns.md`       | BullMQ docs + job processing patterns       |
| `backend.messageQueue: celery`     | `celery-patterns.md`      | Celery docs + task design patterns          |
| `backend.messageQueue: kafka`      | `event-streaming.md`      | Kafka patterns + event-driven architecture  |
| `backend.messageQueue: rabbitmq`   | `queue-patterns.md`       | RabbitMQ patterns + AMQP best practices     |
| `backend.realtime: socketio`       | `realtime-patterns.md`    | Socket.io docs + room/namespace patterns    |
| `backend.realtime: websocket`      | enhance `api-standards.md`| WebSocket protocol best practices           |

## Architecture

| Config Value                        | Rule File to Create              | Reference Source                          |
| ----------------------------------- | -------------------------------- | ----------------------------------------- |
| `architecture.multiTenancy: multi_*`| `tenant-isolation.md`            | -                                         |
| `architecture.typescript: true`     | enhance all base rules with TS   | TypeScript strict mode, utility types     |
| `architecture.apiStyle: graphql`    | `graphql-patterns.md`            | GraphQL best practices + N+1 prevention   |
| `architecture.apiStyle: trpc`       | `trpc-patterns.md`               | tRPC docs + end-to-end type safety        |
| `architecture.apiStyle: grpc`       | `grpc-patterns.md`               | gRPC + Protobuf best practices            |
