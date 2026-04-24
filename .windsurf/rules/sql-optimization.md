---
description: Prisma ORM and PostgreSQL optimization patterns for performant database operations
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# SQL Optimization

This rule defines conventions for Prisma ORM usage with PostgreSQL, because unoptimized queries cause N+1 problems, connection exhaustion, and slow page loads that compound as data grows.

## Rule Priorities

| Priority | Category | Impact |
|----------|-------------------------------|--------|
| P0 | N+1 query prevention | Prevents exponential query growth with data size |
| P0 | Connection pooling | Prevents connection exhaustion in serverless |
| P1 | Select optimization | Reduces data transfer and memory usage |
| P1 | Transaction patterns | Prevents data inconsistency and partial writes |
| P2 | Index strategies | Speeds up common query patterns |
| P2 | Cursor-based pagination | Enables consistent pagination at scale |

## N+1 Query Prevention with include/select

Use `include` or `select` with relations to load related data in a single query, because fetching relations in a loop generates N+1 queries that scale linearly with data size.

```tsx
// Good - include loads relations in a single SQL JOIN
const postsWithAuthors = await prisma.post.findMany({
  where: { published: true },
  include: {
    author: { select: { id: true, name: true, avatarUrl: true } },
    _count: { select: { comments: true } },
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
});

// Good - select only needed fields to reduce data transfer
const userEmails = await prisma.user.findMany({
  select: { id: true, email: true },
  where: { role: 'admin' },
});

// Bad - N+1: one query per post to fetch the author
const posts = await prisma.post.findMany({ where: { published: true } });
const postsWithAuthors = await Promise.all(
  posts.map(async (post) => ({
    ...post,
    author: await prisma.user.findUnique({ where: { id: post.authorId } }),
  }))
);
```

## Transaction Patterns

Use interactive transactions for operations that need atomicity with conditional logic, and `$transaction` with an array for simple batch operations -- because partial writes without transactions corrupt data.

```tsx
// Good - interactive transaction with rollback on failure
async function transferCredits(fromId: string, toId: string, amount: number) {
  return prisma.$transaction(async (tx) => {
    const sender = await tx.user.update({
      where: { id: fromId },
      data: { credits: { decrement: amount } },
    });
    if (sender.credits < 0) {
      throw new Error('Insufficient credits');
    }
    await tx.user.update({
      where: { id: toId },
      data: { credits: { increment: amount } },
    });
    return { success: true };
  });
}

// Bad - non-atomic operations leave partial state on failure
await prisma.user.update({ where: { id: fromId }, data: { credits: { decrement: amount } } });
await prisma.user.update({ where: { id: toId }, data: { credits: { increment: amount } } });
```

## Connection Pooling Configuration

Configure connection pooling for serverless environments, because each serverless function invocation can open a new connection, exhausting PostgreSQL's connection limit.

```tsx
// Good - singleton pattern prevents connection leaks in development
// lib/prisma.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Bad - creating new PrismaClient per request leaks connections
export async function GET() {
  const prisma = new PrismaClient();
  const users = await prisma.user.findMany();
  return Response.json(users);
}
```

## Raw Queries for Complex Operations

Use `$queryRaw` for queries that Prisma's query builder can't express efficiently, because forcing complex logic through the ORM generates suboptimal SQL.

```tsx
// Good - raw query for complex aggregation
const analytics = await prisma.$queryRaw<AnalyticsRow[]>`
  SELECT
    DATE_TRUNC('day', "createdAt") AS day,
    COUNT(*) AS total_orders,
    SUM(amount) AS revenue
  FROM "Order"
  WHERE "createdAt" >= ${startDate}
    AND "createdAt" < ${endDate}
    AND "status" = 'completed'
  GROUP BY DATE_TRUNC('day', "createdAt")
  ORDER BY day DESC
`;

// Bad - fetching all rows and aggregating in JavaScript
const orders = await prisma.order.findMany({
  where: { createdAt: { gte: startDate, lt: endDate }, status: 'completed' },
});
const byDay = orders.reduce((acc, o) => { /* manual aggregation */ }, {});
```

## Index Strategies for Common Patterns

Create indexes for columns used in WHERE, ORDER BY, and JOIN clauses, because unindexed queries perform full table scans that degrade linearly with data volume.

```prisma
// Good - targeted indexes in schema.prisma
model Post {
  id        String   @id @default(cuid())
  title     String
  slug      String   @unique
  published Boolean  @default(false)
  authorId  String
  createdAt DateTime @default(now())
  author    User     @relation(fields: [authorId], references: [id])

  @@index([authorId])
  @@index([published, createdAt(sort: Desc)])
}
```

## Cursor-Based Pagination

Use cursor-based pagination with Prisma's `cursor`/`take`/`skip` API, because offset pagination becomes slow on large tables and skips/duplicates rows when data changes.

```tsx
// Good - cursor-based pagination with Prisma
async function getPaginatedPosts(cursor?: string, limit = 20) {
  const posts = await prisma.post.findMany({
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true, createdAt: true },
  });

  const hasNextPage = posts.length > limit;
  const items = hasNextPage ? posts.slice(0, -1) : posts;

  return {
    items,
    nextCursor: hasNextPage ? items[items.length - 1].id : undefined,
  };
}

// Bad - offset pagination degrades with large offsets
const posts = await prisma.post.findMany({ skip: page * 20, take: 20 });
```

## Soft Delete Pattern

Implement soft deletes with a `deletedAt` column and Prisma middleware, because hard deletes lose audit trails and break referential integrity.

```tsx
// Good - soft delete with middleware
prisma.$use(async (params, next) => {
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }
  if (params.action === 'findMany' || params.action === 'findFirst') {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
  }
  return next(params);
});
```

## Migration Best Practices

Always review generated migrations before applying, because Prisma may generate destructive operations (DROP COLUMN) that cause data loss.

```bash
# Good - generate migration, review SQL, then apply
npx prisma migrate dev --name add-user-avatar --create-only
# Review the generated SQL in prisma/migrations/
npx prisma migrate dev

# Bad - blindly applying migrations
npx prisma migrate dev --name changes
```

## Gotchas

1. **Prisma Client singleton in Next.js**: In development, Next.js hot-reloads modules, creating new `PrismaClient` instances each time. Always use the global singleton pattern -- otherwise you exhaust PostgreSQL's connection limit and see "too many clients" errors.

2. **include vs select precedence**: You cannot use `include` and `select` on the same level. Use `select` with nested `select` for relations when you need to limit fields -- otherwise Prisma throws a validation error at runtime.

3. **Interactive transaction timeout**: Prisma interactive transactions default to a 5-second timeout. For long-running transactions, set `timeout` and `maxWait` explicitly: `prisma.$transaction(fn, { maxWait: 10000, timeout: 15000 })` -- otherwise transactions silently roll back under load.

4. **Raw query SQL injection**: Only use tagged template literals with `$queryRaw`. Never use string concatenation or `$queryRawUnsafe` with user input -- otherwise you create SQL injection vulnerabilities.

5. **Migration squashing**: Prisma doesn't support migration squashing natively. For long-lived projects, periodically baseline your migrations with `prisma migrate resolve` -- otherwise the migrations folder grows unbounded and slows down CI.
