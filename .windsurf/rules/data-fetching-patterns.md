---
description: TanStack Query and Next.js data fetching patterns for client and server components
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# Data Fetching Patterns

This rule defines conventions for data fetching using TanStack Query (React Query v5) and Next.js App Router server components, because consistent patterns prevent cache bugs, waterfalls, and stale data issues.

## Rule Priorities

| Priority | Category | Impact |
|----------|-------------------------|--------|
| P0 | Query key conventions | Prevents cache collisions and stale data bugs |
| P0 | SSR hydration setup | Prevents hydration mismatch errors and double-fetching |
| P1 | Optimistic updates | Ensures responsive UI during mutations |
| P1 | Error/loading handling | Prevents blank screens and unhandled promise rejections |
| P2 | Pagination patterns | Enables scalable list rendering |
| P2 | Stale-while-revalidate | Balances freshness vs performance |

## Query Key Conventions

Organize query keys as tuples with increasing specificity, because TanStack Query uses structural sharing and prefix matching for invalidation.

```tsx
// Good - hierarchical query keys enable granular invalidation
export const queryKeys = {
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: UserFilters) => [...queryKeys.users.lists(), filters] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
  },
} as const;

// Usage: invalidate all user queries at once
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

// Bad - flat string keys cause accidental collisions
const { data } = useQuery({ queryKey: ['get-users'], queryFn: fetchUsers });
```

## SSR Hydration with HydrationBoundary

Prefetch data in server components and pass it to client components via `dehydrate`/`HydrationBoundary`, because this prevents double-fetching and provides instant page loads.

```tsx
// Good - prefetch in server component, hydrate in client boundary
// app/users/page.tsx (Server Component)
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

export default async function UsersPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: queryKeys.users.lists(),
    queryFn: () => getUsers(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserList />
    </HydrationBoundary>
  );
}

// Bad - fetching only on client causes loading spinners and layout shift
'use client';
export default function UsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: fetchUsers });
  if (isLoading) return <Spinner />;
  return <UserList users={data} />;
}
```

## Optimistic Updates for Mutations

Use optimistic updates with `onMutate`/`onError`/`onSettled` callbacks, because they provide instant feedback and automatically rollback on failure.

```tsx
// Good - optimistic update with rollback
const updateUser = useMutation({
  mutationFn: (updatedUser: UpdateUserInput) => api.users.update(updatedUser),
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: queryKeys.users.detail(newData.id) });
    const previous = queryClient.getQueryData(queryKeys.users.detail(newData.id));
    queryClient.setQueryData(queryKeys.users.detail(newData.id), (old: User) => ({
      ...old, ...newData,
    }));
    return { previous };
  },
  onError: (_err, newData, context) => {
    queryClient.setQueryData(queryKeys.users.detail(newData.id), context?.previous);
  },
  onSettled: (_data, _err, variables) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(variables.id) });
  },
});
```

## Infinite Scroll / Pagination

Use `useInfiniteQuery` for infinite scroll and cursor-based pagination, because offset-based pagination causes duplicate or missing items when data changes between pages.

```tsx
// Good - cursor-based infinite query
const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
  queryKey: queryKeys.posts.all,
  queryFn: ({ pageParam }) => fetchPosts({ cursor: pageParam, limit: 20 }),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
});

const allPosts = data?.pages.flatMap((page) => page.items) ?? [];
```

## Parallel and Dependent Queries

Use `useQueries` for parallel data fetching and the `enabled` option for dependent queries, to prevent waterfall requests.

```tsx
// Good - dependent query waits for the first to resolve
const { data: user } = useQuery({
  queryKey: queryKeys.users.detail(userId),
  queryFn: () => fetchUser(userId),
});
const { data: projects } = useQuery({
  queryKey: ['posts', 'byUser', user?.id ?? ''],
  queryFn: () => fetchPostsByUser(user!.id),
  enabled: !!user?.id,
});

// Bad - chained useEffects cause waterfalls and race conditions
useEffect(() => { fetchUser(userId).then(setUser); }, [userId]);
useEffect(() => { if (user) fetchPosts(user.id).then(setPosts); }, [user]);
```

## Stale-While-Revalidate Configuration

Configure `staleTime` and `gcTime` per query based on data volatility, because defaults (staleTime: 0) cause refetches on every mount.

```tsx
// Good - configure staleTime based on data characteristics
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

## Error and Loading State Handling

Always handle error and loading states explicitly, because unhandled states cause white screens.

```tsx
// Good - explicit state handling
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <UserProfileSkeleton />;
  if (isError) return <ErrorAlert message={error.message} />;
  return <div>{user.name}</div>;
}

// Bad - only checking data, ignoring error/loading
function UserProfile({ userId }: { userId: string }) {
  const { data } = useQuery({ queryKey: ['user', userId], queryFn: () => fetchUser(userId) });
  return <div>{data?.name}</div>;
}
```

## Gotchas

1. **Query key serialization**: Objects in query keys are compared by value, not reference. `{ page: 1 }` and `{ page: 1 }` are the same key, but `{ page: 1, filter: undefined }` differs from `{ page: 1 }` -- otherwise you get phantom cache misses.

2. **Server component QueryClient**: Always create a `new QueryClient()` inside server components, never import a singleton -- because server components may run concurrently for different requests and sharing state causes data leaks between users.

3. **Invalidation after mutation**: Always invalidate in `onSettled` (not `onSuccess`), because `onSuccess` doesn't fire on network errors, leaving stale data in the cache.

4. **Structural sharing breaks with non-serializable data**: TanStack Query uses structural sharing by default. If your query returns `Date` objects, `Map`, or `Set`, set `structuralSharing: false` -- otherwise dates become strings.

5. **Prefetch timing**: Call `prefetchQuery` before rendering the component tree. If you call it inside a `useEffect`, the prefetch runs after the initial render, defeating its purpose.
