# Base Rule Enhancement Examples

Reference data for `/project-init-enhance`. Shows what to add to each base rule per stack.

## Marking Rule

Every added block must start with this header:

```markdown
> Stack-enhancement by /project-init -- Stack: [framework] -- Remove if stack changes
```

This makes enhancements identifiable and reversible. Example:

```markdown
## NestJS Authentication & Guards

> Stack-enhancement by /project-init -- Stack: NestJS -- Remove if stack changes

... NestJS-specific content ...
```

## Django

If `django-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add Django-specific sections: CSRF protection, Django middleware, `django.contrib.auth`
  - Add Django ORM security (SQL injection prevention with QuerySets)
  - Add Django settings security (`SECRET_KEY`, `DEBUG=False`)

- **Enhance `testing.md`:**
  - Add Django TestCase, APITestCase examples
  - Add pytest-django configuration
  - Add Django fixtures and factory patterns

- **Enhance `performance.md`:**
  - Add Django query optimization (`select_related`, `prefetch_related`)
  - Add Django caching framework
  - Add database connection pooling

## React / Next.js

If `react-hooks.md` is generated:

- **Enhance `performance.md`:**
  - Add React.memo, useMemo, useCallback examples
  - Add code splitting with dynamic imports
  - Add React Server Components optimization

- **Enhance `testing.md`:**
  - Add React Testing Library examples
  - Add Jest configuration for React
  - Add component testing patterns

## Zod Validation

If `backend.validation: zod` is set:

- **Enhance `api-standards.md`:**
  - Add Zod schema-first validation patterns
  - Add request/response validation middleware examples
  - Add Zod-to-TypeScript type inference patterns

- **Enhance `error-handling.md`:**
  - Add ZodError parsing and user-friendly error formatting
  - Add validation error response structure (RFC 7807)

## Redis Caching

If `backend.caching: redis` is set:

- **Enhance `performance.md`:**
  - Add cache-aside, write-through, write-behind patterns
  - Add TTL strategies and cache invalidation patterns
  - Add Redis connection pooling and cluster configuration

- **Enhance `security.md`:**
  - Add Redis AUTH and TLS configuration
  - Add cache poisoning prevention

## Message Queues (BullMQ / Celery)

If `backend.messageQueue: bullmq` or `celery` is set:

- **Enhance `error-handling.md`:**
  - Add dead-letter queue patterns and retry strategies
  - Add idempotent job processing patterns
  - Add job failure monitoring and alerting

- **Enhance `performance.md`:**
  - Add queue concurrency and rate limiting patterns
  - Add batch processing and priority queue strategies

## shadcn/ui

If `frontend.uiLibrary: shadcn` is set:

- **Enhance `accessibility.md`:**
  - Add Radix UI primitive accessibility patterns (focus management, keyboard navigation)
  - Add ARIA attribute patterns for shadcn components

- **Enhance `code-quality.md`:**
  - Add component composition patterns with shadcn + Radix primitives
  - Add theming and variant patterns with class-variance-authority (cva)

## TanStack Query

If `frontend.dataFetching: tanstack-query` is set:

- **Enhance `performance.md`:**
  - Add query prefetching and stale-while-revalidate patterns
  - Add infinite scroll and pagination query patterns
  - Add optimistic update patterns

- **Enhance `testing.md`:**
  - Add QueryClient wrapper for tests
  - Add MSW (Mock Service Worker) integration patterns

## Angular

If `angular-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add Angular `HttpClient` with XSRF/CSRF token handling (`HttpClientXsrfModule`)
  - Add Angular DomSanitizer and safe pipe patterns for XSS prevention
  - Add Content Security Policy header configuration for Angular apps
  - Add Angular route guards (`CanActivate`, `CanMatch`) for auth protection

- **Enhance `testing.md`:**
  - Add `TestBed` configuration and component harness patterns
  - Add `HttpClientTestingModule` with `HttpTestingController` for HTTP mocking
  - Add Angular service testing with dependency injection (`inject()`)
  - Add Spectator or Angular Testing Library as alternatives

- **Enhance `performance.md`:**
  - Add `OnPush` change detection strategy patterns
  - Add lazy loading with `loadChildren` / `loadComponent`
  - Add `@defer` blocks for template-level lazy loading (Angular 17+)
  - Add Angular signals and computed() for reactive state

- **Enhance `code-quality.md`:**
  - Add standalone component patterns (Angular 14+)
  - Add inject() function vs constructor injection patterns
  - Add Angular-specific naming conventions (`.component.ts`, `.service.ts`, `.pipe.ts`)

## Vue / Nuxt

If `vue-composition.md` or `nuxt-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add `v-html` sanitization with DOMPurify -- never use `v-html` with user input
  - Add Nuxt `useRequestHeaders()` for CSRF token forwarding
  - Add server route validation with `getValidatedQuery()` / `readValidatedBody()` (Nuxt 3)

- **Enhance `performance.md`:**
  - Add `useLazyAsyncData()` and `useLazyFetch()` for non-blocking data fetching
  - Add `<Suspense>` with fallback patterns for async components
  - Add Nuxt payload optimization and `getCachedData` for client-side caching
  - Add `shallowRef()` / `shallowReactive()` for large data structures

- **Enhance `testing.md`:**
  - Add Vue Test Utils `mount()` / `shallowMount()` with Vitest
  - Add Nuxt `mountSuspended()` from `@nuxt/test-utils` for composable testing
  - Add Pinia store testing with `createTestingPinia()`

- **Enhance `code-quality.md`:**
  - Add Composition API (`<script setup>`) as default over Options API
  - Add composable extraction patterns (`use*` naming convention)
  - Add `defineProps` / `defineEmits` with TypeScript generics

## NestJS

If `nestjs-modules.md` is generated:

- **Enhance `security.md`:**
  - Add NestJS Guards (`@UseGuards`) for authentication and authorization
  - Add NestJS Pipes (`ValidationPipe`) with class-validator for input validation
  - Add helmet middleware integration and CORS configuration
  - Add rate limiting with `@nestjs/throttler`

- **Enhance `testing.md`:**
  - Add `@nestjs/testing` `Test.createTestingModule()` patterns
  - Add provider overriding with `.overrideProvider()` for mocking
  - Add E2E testing with `supertest` and `INestApplication`
  - Add database testing with Testcontainers

- **Enhance `error-handling.md`:**
  - Add NestJS Exception Filters (`@Catch()`) for centralized error handling
  - Add custom `HttpException` subclasses with RFC 7807 problem details
  - Add global vs controller-scoped exception filter patterns

- **Enhance `api-standards.md`:**
  - Add DTO pattern with class-validator decorators
  - Add Swagger/OpenAPI decoration with `@nestjs/swagger`
  - Add versioning strategies (`URI`, `Header`, `Media Type`)

## Go

If `go-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add `crypto/rand` for secure random generation (never `math/rand`)
  - Add input validation with `go-playground/validator` struct tags
  - Add SQL injection prevention with parameterized queries (`$1`, `?` placeholders)
  - Add secure HTTP headers with middleware patterns

- **Enhance `error-handling.md`:**
  - Add error wrapping with `fmt.Errorf("context: %w", err)` patterns
  - Add custom error types implementing `error` interface
  - Add `errors.Is()` / `errors.As()` for error inspection
  - Add sentinel errors vs typed errors decision patterns

- **Enhance `testing.md`:**
  - Add table-driven tests with `t.Run()` subtests
  - Add `testify/assert` and `testify/require` patterns
  - Add `httptest.NewServer()` for HTTP handler testing
  - Add testcontainers-go for integration testing

- **Enhance `performance.md`:**
  - Add goroutine pool patterns with `errgroup`
  - Add `sync.Pool` for object reuse
  - Add context cancellation and timeout propagation

## Rust

If `rust-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add `sqlx` compile-time checked queries for SQL injection prevention
  - Add input validation with `validator` derive macros
  - Add `argon2` / `bcrypt` for password hashing (never custom crypto)
  - Add `tower` middleware for rate limiting and auth

- **Enhance `error-handling.md`:**
  - Add `thiserror` for library error types and `anyhow` for application error types
  - Add `?` operator with `From` trait implementations for error propagation
  - Add `Result<T, E>` as return type for all fallible functions
  - Add `tracing` for structured error logging

- **Enhance `testing.md`:**
  - Add `#[cfg(test)]` module patterns with `#[test]` and `#[tokio::test]`
  - Add `mockall` for trait mocking
  - Add `wiremock` for HTTP mock servers
  - Add property-based testing with `proptest`

- **Enhance `performance.md`:**
  - Add `tokio` runtime configuration (multi-thread vs current-thread)
  - Add zero-copy patterns with `Bytes` and `&str`
  - Add connection pooling with `deadpool` / `bb8`

## .NET / ASP.NET Core

If `dotnet-conventions.md` is generated:

- **Enhance `security.md`:**
  - Add ASP.NET Core `[ValidateAntiForgeryToken]` for CSRF protection
  - Add Identity framework configuration with password policies
  - Add JWT Bearer authentication with `AddJwtBearer()`
  - Add authorization policies with `[Authorize(Policy = "...")]`

- **Enhance `testing.md`:**
  - Add xUnit with `WebApplicationFactory<T>` for integration testing
  - Add `Moq` / `NSubstitute` for service mocking
  - Add `FluentAssertions` for readable assertions
  - Add `Testcontainers` for database integration tests

- **Enhance `error-handling.md`:**
  - Add global exception handler middleware with `UseExceptionHandler()`
  - Add `ProblemDetails` (RFC 7807) response format
  - Add `Result<T>` pattern for service layer error handling
  - Add `ILogger` structured logging with scopes

- **Enhance `api-standards.md`:**
  - Add Minimal APIs vs Controller pattern comparison
  - Add FluentValidation with `AbstractValidator<T>` patterns
  - Add API versioning with `Asp.Versioning.Http`

## Spring / Spring Boot

If `spring-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add Spring Security `SecurityFilterChain` configuration (SecurityConfig)
  - Add `@PreAuthorize` / `@Secured` method-level authorization
  - Add OAuth2 Resource Server with JWT validation
  - Add CORS configuration with `CorsConfigurationSource`

- **Enhance `testing.md`:**
  - Add `@SpringBootTest` with `@AutoConfigureMockMvc` for integration testing
  - Add `MockMvc` request building and result matching patterns
  - Add `@DataJpaTest` for repository layer testing
  - Add Testcontainers with `@Container` and `@DynamicPropertySource`

- **Enhance `error-handling.md`:**
  - Add `@ControllerAdvice` with `@ExceptionHandler` for centralized error handling
  - Add `ProblemDetail` (RFC 7807) response builder (Spring 6+)
  - Add custom exception hierarchy with HTTP status mapping

- **Enhance `api-standards.md`:**
  - Add Bean Validation with `@Valid` and custom constraint annotations
  - Add `@RestController` vs `@Controller` patterns
  - Add OpenAPI 3.0 documentation with springdoc-openapi

## Laravel

If `laravel-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add Laravel CSRF protection with `@csrf` Blade directive and `VerifyCsrfToken` middleware
  - Add Sanctum/Passport token-based authentication patterns
  - Add Laravel authorization with Gates and Policies
  - Add Eloquent mass assignment protection (`$fillable` / `$guarded`)
  - Add Laravel encryption and hashing facades (`Hash::make()`, `Crypt::encrypt()`)

- **Enhance `testing.md`:**
  - Add Laravel `TestCase` with `RefreshDatabase` trait
  - Add HTTP testing with `$this->getJson()`, `$this->postJson()` and `assertStatus()`
  - Add model factories with `Factory::new()` and `Faker` integration
  - Add Dusk for browser testing patterns
  - Add Pest PHP as alternative test runner

- **Enhance `error-handling.md`:**
  - Add `App\Exceptions\Handler` with `register()` for custom exception rendering
  - Add `abort()` helper and custom HTTP exception classes
  - Add validation exception formatting with `$errors->first()`
  - Add structured logging with Laravel `Log` facade and channels

- **Enhance `performance.md`:**
  - Add Eloquent eager loading (`with()`, `load()`) to prevent N+1 queries
  - Add query caching with `Cache::remember()` patterns
  - Add Laravel Octane for long-running worker performance
  - Add database query optimization with `toSql()` debugging and `DB::listen()`

- **Enhance `api-standards.md`:**
  - Add API Resources (`JsonResource`, `ResourceCollection`) for response transformation
  - Add Form Request validation with `authorize()` and `rules()`
  - Add API versioning with route prefix groups

## Symfony

If `symfony-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add Symfony Security component with `security.yaml` firewall configuration
  - Add Voters for fine-grained authorization (`VoterInterface`)
  - Add CSRF protection with `csrf_token()` in Twig forms
  - Add password hashing with `UserPasswordHasherInterface`

- **Enhance `testing.md`:**
  - Add `WebTestCase` with `KernelBrowser` for functional testing
  - Add `KernelTestCase` for service container integration tests
  - Add Doctrine fixtures with `doctrine/doctrine-fixtures-bundle`
  - Add API testing with `ApiTestCase` from API Platform

- **Enhance `error-handling.md`:**
  - Add custom `EventSubscriber` for `kernel.exception` events
  - Add `HttpException` hierarchy and custom error templates
  - Add Monolog configuration for structured logging with handlers and channels
  - Add `ProblemDetails` response format for API errors

- **Enhance `performance.md`:**
  - Add Doctrine query optimization with DQL, QueryBuilder, and `fetch="EAGER"` / `fetch="LAZY"`
  - Add Symfony Cache component with pool adapters (Redis, APCu, filesystem)
  - Add HTTP cache headers with `#[Cache]` attribute
  - Add Messenger component for async processing

- **Enhance `api-standards.md`:**
  - Add API Platform resource configuration with attributes
  - Add DTO pattern with Symfony Serializer and validation groups
  - Add content negotiation and format listeners

## Rails

If `rails-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add Rails CSRF protection with `protect_from_forgery` and `authenticity_token`
  - Add Strong Parameters with `params.require().permit()` for mass assignment protection
  - Add Devise authentication configuration and customization
  - Add Pundit/CanCanCan for authorization policies
  - Add `has_secure_password` with bcrypt for password hashing

- **Enhance `testing.md`:**
  - Add RSpec with `rails_helper` configuration and `FactoryBot` factories
  - Add request specs with `get`, `post`, `expect(response)` patterns
  - Add model specs with `shoulda-matchers` for association/validation testing
  - Add system tests with Capybara and `driven_by(:selenium_chrome_headless)`
  - Add VCR cassettes for external API mocking

- **Enhance `error-handling.md`:**
  - Add `rescue_from` in `ApplicationController` for centralized error handling
  - Add custom exception classes inheriting from `StandardError`
  - Add `ActiveSupport::ErrorReporter` for error tracking (Rails 7+)
  - Add structured logging with `Rails.logger` and tagged logging

- **Enhance `performance.md`:**
  - Add ActiveRecord eager loading (`includes`, `preload`, `eager_load`) for N+1 prevention
  - Add `bullet` gem for N+1 query detection in development
  - Add fragment caching with `cache` helper and Russian doll caching
  - Add background jobs with Sidekiq/GoodJob for async processing
  - Add database query optimization with `explain` and `to_sql`

- **Enhance `api-standards.md`:**
  - Add `jbuilder` or `ActiveModel::Serializer` for JSON response formatting
  - Add API-only mode with `ActionController::API`
  - Add API versioning with namespace routing

## Phoenix

If `phoenix-best-practices.md` is generated:

- **Enhance `security.md`:**
  - Add Phoenix CSRF protection with `put_csrf_token` plug and form tokens
  - Add `phx.gen.auth` generated authentication with `bcrypt_elixir`
  - Add Guardian JWT authentication and pipeline plugs
  - Add authorization with `Bodyguard` or custom policy modules
  - Add input validation with Ecto changesets (`cast/4`, `validate_required/3`)

- **Enhance `testing.md`:**
  - Add `ConnTest` with `Phoenix.ConnTest` helpers (`get`, `post`, `json_response`)
  - Add `DataCase` with `Ecto.Adapters.SQL.Sandbox` for database isolation
  - Add `ExMachina` factories for test data generation
  - Add LiveView testing with `live()` and `render_*` assertions
  - Add `Mox` for behaviour-based mocking

- **Enhance `error-handling.md`:**
  - Add `ErrorView` and `ErrorJSON` for structured error responses
  - Add `action_fallback` in controllers for centralized error handling
  - Add Ecto changeset error formatting with `traverse_errors/2`
  - Add `Logger` with metadata and structured logging

- **Enhance `performance.md`:**
  - Add Ecto query optimization with `preload`, `join`, and subqueries
  - Add `Repo.stream()` for large dataset processing
  - Add ETS-based caching with `Cachex` or `Nebulex`
  - Add Phoenix PubSub for distributed real-time communication
  - Add LiveView optimizations with `temporary_assigns` and stream
