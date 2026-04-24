---
description: Performance optimization best practices
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# Performance Optimization

## Rule Priorities

| Priority | Category                     | Impact   |
| -------- | ---------------------------- | -------- |
| 1        | N+1 Query Prevention         | CRITICAL |
| 2        | Connection Pooling           | CRITICAL |
| 3        | Code Splitting & Bundle Size | HIGH     |
| 4        | Caching Patterns             | HIGH     |
| 5        | Image Optimization           | MEDIUM   |
| 6        | Memoization (React)          | MEDIUM   |
| 7        | Async I/O                    | MEDIUM   |
| 8        | Web Vitals (LCP, INP, CLS)   | LOW      |

## Frontend Performance

### Code Splitting

```typescript
// Good - dynamic import for code splitting
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
});
```

### Memoization

```typescript
// Good - memoize expensive components
const ExpensiveList = memo(function ExpensiveList({ items }: Props) {
  return <ul>{items.map(renderItem)}</ul>;
});

// Good - memoize expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);

// Good - stable function references
const handleClick = useCallback((id: string) => {
  dispatch(selectItem(id));
}, [dispatch]);
```

### Image Optimization

- **AVIF first, WebP fallback, JPEG baseline** -- AVIF is 30-50% smaller than WebP at equivalent quality
- Always specify `width` and `height` to prevent layout shift (CLS)
- Lazy-load images below the fold; `priority`/`eager` load only above-the-fold images
- Use `srcset` + `sizes` for responsive images

```tsx
// Good - Next.js Image (handles AVIF/WebP automatically)
import Image from "next/image";

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority
  placeholder="blur"
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 1200px"
/>;

// Good - standard HTML with AVIF + WebP + srcset
<picture>
  <source
    srcSet="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1200.avif 1200w"
    type="image/avif"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
  <source
    srcSet="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
    type="image/webp"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
  <img src="/hero-800.jpg" alt="Hero" width={1200} height={600} loading="lazy" decoding="async" />
</picture>;
```

### React Server Components (RSC)

Minimize client-side JavaScript -- push rendering to the server:

```tsx
// Bad - unnecessary client component
"use client";
export function UserList({ users }: Props) {
  return (
    <ul>{users.map((u) => (<li key={u.id}>{u.name}</li>))}</ul>
  );
}

// Good - server component (no 'use client', no bundle cost)
export function UserList({ users }: Props) {
  return (
    <ul>{users.map((u) => (<li key={u.id}>{u.name}</li>))}</ul>
  );
}
```

- Use `'use client'` **only** for Web API access (window, localStorage) or interactivity
- Wrap async/client-only components in `<Suspense fallback={<Skeleton />}>`
- Use dynamic loading for non-critical components (`next/dynamic`, `React.lazy`)

### Bundle Size

- Analyze bundle with `next build --analyze` or `vite-bundle-visualizer`
- Use tree-shaking friendly imports
- Avoid importing entire libraries

```typescript
// Bad - imports entire library
import _ from "lodash";

// Good - tree-shakeable import
import debounce from "lodash/debounce";
```

## Backend Performance

### Database Queries

```typescript
// Good - Prisma: select only needed fields + eager loading
const users = await prisma.user.findMany({
  select: { id: true, email: true, name: true, profile: true },
});

// Bad - fetches all columns and causes N+1
const users = await prisma.user.findMany();
for (const user of users) {
  const profile = await prisma.profile.findUnique({ where: { userId: user.id } });
}
```

### Caching

```typescript
// Good - cache expensive operations
const cachedData = await cache.get(cacheKey);
if (cachedData) return cachedData;

const data = await expensiveOperation();
await cache.set(cacheKey, data, { ttl: 3600 });
return data;
```

### Connection Pooling

Always use connection pools for database and external service connections:

```typescript
// Good - connection pool (Node.js / pg)
import { Pool } from "pg";

const pool = new Pool({
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Bad - new connection per request
app.get("/users", async (req, res) => {
  const client = new Client(); // creates a new TCP connection every time
  await client.connect();
});
```

### Caching Patterns

```typescript
// Good - cache-aside pattern with Redis
async function getUser(id: string): Promise<User> {
  const cacheKey = `user:${id}`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const user = await db.user.findUnique({ where: { id } });
  if (user) {
    await redis.setex(cacheKey, 3600, JSON.stringify(user));
  }
  return user;
}

// Good - cache invalidation on write
async function updateUser(id: string, data: UpdateUserDto): Promise<User> {
  const user = await db.user.update({ where: { id }, data });
  await redis.del(`user:${id}`);
  return user;
}
```

## Gotchas

- **`useMemo` and `useCallback` have a cost** -- only memoize if the computation is measurably expensive or the reference stability is required (e.g. passed to `memo`-wrapped child). Premature memoization adds complexity without benefit.
- **N+1 in GraphQL resolvers** -- each field resolver can trigger a separate DB query per parent item. Use DataLoader (batch + cache) to solve.
- **`cache.set` without TTL creates memory leaks** -- always set a TTL; unbounded cache growth will crash the process.
- **Offset pagination degrades at scale** -- `OFFSET 10000` causes the DB to scan and discard 10,000 rows on every query. Switch to cursor-based pagination early.
- **`next/image` `priority` on every image** -- `priority` disables lazy loading and preloads the image. Only use it for the single LCP image above the fold.

## Web Vitals

- **LCP** (Largest Contentful Paint): < 2.5s
- **INP** (Interaction to Next Paint): < 200ms (replaces deprecated FID since March 2024)
- **CLS** (Cumulative Layout Shift): < 0.1

```typescript
// Good - prevent layout shift
<div style={{ aspectRatio: '16/9' }}>
  <Image src={src} fill alt={alt} />
</div>
```

## Next.js React Server Components Optimization

> Stack-enhancement by /project-init -- Stack: Next.js -- Remove if stack changes

### Streaming with Suspense Boundaries
Use `<Suspense>` boundaries to stream content progressively, because blocking on a single slow component delays the entire page:

```tsx
// Good - each section streams independently
import { Suspense } from "react";

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={<MetricsSkeleton />}>
        <DashboardMetrics />
      </Suspense>
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </>
  );
}
```

### TanStack Query Prefetching
Prefetch in server components to eliminate client-side loading states:

```tsx
// Good - prefetch in RSC, hydrate on client
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";

export default async function UsersPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ["users", "list"],
    queryFn: getUsers,
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />
    </HydrationBoundary>
  );
}
```
