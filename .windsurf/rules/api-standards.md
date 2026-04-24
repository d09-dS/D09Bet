---
description: REST API conventions and best practices
trigger: glob
globs: ["**/*.ts", "**/*.tsx"]
---

# API Standards

## Rule Priorities

| Priority | Category                            | Impact   |
| -------- | ----------------------------------- | -------- |
| 1        | Correct HTTP Methods & Status Codes | CRITICAL |
| 2        | Consistent Response Envelope        | CRITICAL |
| 3        | Input Validation & Error Responses  | HIGH     |
| 4        | Pagination (Cursor-Based)           | HIGH     |
| 5        | URL Structure & Naming              | MEDIUM   |
| 6        | Versioning                          | MEDIUM   |
| 7        | Rate Limiting Headers               | LOW      |
| 8        | Authentication (Bearer Tokens)      | LOW      |

## REST Conventions

### HTTP Methods

| Method | Usage                | Idempotent |
| ------ | -------------------- | ---------- |
| GET    | Retrieve resource(s) | Yes        |
| POST   | Create resource      | No         |
| PUT    | Replace resource     | Yes        |
| PATCH  | Partial update       | Yes        |
| DELETE | Remove resource      | Yes        |

### URL Structure

```
GET    /api/v1/users          # List users
GET    /api/v1/users/:id      # Get user
POST   /api/v1/users          # Create user
PUT    /api/v1/users/:id      # Replace user
PATCH  /api/v1/users/:id      # Update user
DELETE /api/v1/users/:id      # Delete user

GET    /api/v1/users/:id/orders  # Nested resource
```

### Naming

- Use plural nouns: `/users`, `/orders`
- Use kebab-case: `/user-profiles`
- Avoid verbs in URLs: `/users` not `/getUsers`

## Response Format

All API responses use a consistent envelope with `success`, `data`, and `meta`:

### Success Response

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "type": "user",
    "attributes": {
      "email": "user@example.com",
      "name": "John Doe"
    }
  },
  "meta": {
    "timestamp": "2026-04-02T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [{ "field": "email", "message": "Invalid email format" }]
  },
  "meta": {
    "timestamp": "2026-04-02T12:00:00Z",
    "requestId": "req_abc123"
  }
}
```

## Status Codes

| Code | Usage                 |
| ---- | --------------------- |
| 200  | Success               |
| 201  | Created               |
| 204  | No Content (DELETE)   |
| 400  | Bad Request           |
| 401  | Unauthorized          |
| 403  | Forbidden             |
| 404  | Not Found             |
| 409  | Conflict              |
| 422  | Unprocessable Entity  |
| 500  | Internal Server Error |

## Pagination

Prefer **cursor-based pagination** for large datasets (consistent performance at scale). Use offset-based only for small, bounded result sets.

### Cursor-Based (recommended)

```json
{
  "data": [...],
  "pagination": {
    "limit": 20,
    "nextCursor": "eyJpZCI6MTAwfQ==",
    "hasMore": true
  }
}
```

```
GET /api/v1/users?limit=20&cursor=eyJpZCI6MTAwfQ==
```

### Offset-Based (small datasets only)

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  },
  "links": {
    "self": "/api/v1/users?page=1",
    "next": "/api/v1/users?page=2",
    "prev": null
  }
}
```

## Filtering & Sorting

```
GET /api/v1/users?status=active&role=admin
GET /api/v1/users?sort=-createdAt,name
GET /api/v1/users?fields=id,email,name
```

## Versioning

- Use URL versioning: `/api/v1/`, `/api/v2/`
- Maintain backward compatibility
- Deprecate with headers: `Deprecation: true`

## Gotchas

- **Returning 200 for errors** — always use the correct HTTP status code. `200 OK` with `{ "error": "..." }` in the body is incorrect and breaks error handling in clients.
- **DELETE returning 200 instead of 204** — `204 No Content` is correct for successful DELETE with no response body.
- **Using PUT when PATCH is intended** — `PUT` replaces the entire resource; `PATCH` partially updates it. Sending a `PUT` with partial fields silently nulls the missing fields.
- **Exposing sequential integer IDs** — use UUIDs in public API responses to prevent IDOR and enumeration attacks.
- **Including secrets in error responses** — never return stack traces, internal paths, DB errors, or query details in API error messages.

## Rate Limiting

Include headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1617235200
```

## Authentication

- Use Bearer tokens: `Authorization: Bearer <token>`
- Return 401 for invalid/expired tokens
- Return 403 for insufficient permissions

## GraphQL Conventions

When the project uses GraphQL instead of REST:

```graphql
# ✅ Good - query with pagination and error union
type Query {
  users(first: Int!, after: String): UserConnection!
  user(id: ID!): UserResult!
}

union UserResult = User | NotFoundError | ForbiddenError

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

- Use **Relay-style cursor pagination** (`Connection`, `Edge`, `PageInfo`) for list queries
- Return **union types** for error handling instead of throwing -- allows clients to handle errors type-safely
- Use `input` types for mutations: `mutation createUser(input: CreateUserInput!): CreateUserPayload!`
- Never expose internal IDs -- use opaque global IDs (`toGlobalId('User', dbId)`)
- Limit query depth and complexity to prevent abuse (`graphql-depth-limit`, `graphql-query-complexity`)
- Use **DataLoader** for batching to prevent N+1 queries in resolvers

## gRPC Conventions

When the project uses gRPC:

```protobuf
// ✅ Good - versioned package, clear service definition
syntax = "proto3";
package api.v1;

service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc CreateUser(CreateUserRequest) returns (User);
}

message ListUsersRequest {
  int32 page_size = 1;
  string page_token = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  string next_page_token = 2;
}
```

- Use **package versioning** (`api.v1`, `api.v2`) for backward compatibility
- Use `page_size` + `page_token` for pagination (Google AIP-158 pattern)
- Use proper gRPC status codes (`NOT_FOUND`, `PERMISSION_DENIED`, `INVALID_ARGUMENT`)
- Define `.proto` files as the single source of truth -- generate server and client code from them
- Use **server reflection** in development for debugging with tools like `grpcurl`
- Add **deadlines/timeouts** to every RPC call -- never use infinite timeouts

## tRPC Conventions

When the project uses tRPC:

```typescript
// ✅ Good - type-safe router with input validation
import { router, publicProcedure, protectedProcedure } from "./trpc";
import { z } from "zod";

export const userRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return ctx.db.user.findUniqueOrThrow({ where: { id: input.id } });
    }),

  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(2).max(100),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      return ctx.db.user.create({ data: input });
    }),
});
```

- Use **Zod schemas** for input validation on every procedure
- Split routers by domain: `userRouter`, `orderRouter`, `authRouter`
- Use `protectedProcedure` for authenticated routes, `publicProcedure` only for truly public endpoints
- Leverage end-to-end type safety -- never cast or use `any` between client and server

## Zod Schema-First API Validation

> Stack-enhancement by /project-init -- Stack: Zod -- Remove if stack changes

### Next.js API Route Validation
Validate request bodies with Zod in every API route handler, because unvalidated input leads to runtime type errors and potential injection:

```tsx
// Good - Zod validation in Next.js route handler
import { NextResponse } from "next/server";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.coerce.date(),
  odds: z.number().positive(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", details: parsed.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  const event = await prisma.event.create({ data: parsed.data });
  return NextResponse.json(event, { status: 201 });
}
```

### Shared Schemas Between Client and Server
Place schemas in `lib/schemas/` so the same validation runs on both sides:

```tsx
// lib/schemas/event.ts - shared source of truth
export const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.coerce.date(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

// Client: useForm({ resolver: zodResolver(createEventSchema) })
// Server: createEventSchema.safeParse(body)
```
