---
description: React hooks best practices for Next.js App Router with Server Components, client-side state, and performance optimization patterns
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# React Hooks & Component Patterns for Next.js App Router

This rule enforces React hooks best practices, Server/Client Component boundaries, and performance patterns for a Next.js App Router project using Zustand, TanStack Query, and React Server Components.

## Rule Priorities

| Priority | Category | Impact |
|----------|----------|--------|
| P0 | Server vs Client Component boundaries | Prevents shipping unnecessary JS to the client, because misplaced `use client` balloons bundle size |
| P0 | Avoid async waterfalls | Eliminates sequential fetches that compound latency, otherwise pages load seconds slower |
| P1 | Hook dependency correctness | Prevents stale closures and infinite re-render loops, because missing deps silently break logic |
| P1 | Memoization discipline | Reduces wasted renders in complex trees, to prevent janky UI on interaction-heavy pages |
| P2 | Custom hook extraction | Improves testability and reuse, because inline logic couples view and state |
| P2 | Zustand store design | Keeps global state minimal and subscription-efficient, to prevent full-tree re-renders |

## Server Components vs Client Components

Default to Server Components. Only add `"use client"` when the component genuinely needs browser APIs, event handlers, or hooks like `useState`/`useEffect`. Push `"use client"` as deep as possible into the component tree, because every `"use client"` boundary pulls its entire subtree into the client bundle.

```tsx
// Good: Server Component fetches data, passes to thin Client leaf
// app/dashboard/page.tsx (Server Component - no directive)
import { DashboardMetrics } from "@/components/dashboard-metrics";
import { db } from "@/lib/db";

export default async function DashboardPage() {
  const metrics = await db.metrics.findMany();
  return <DashboardMetrics data={metrics} />;
}

// components/dashboard-metrics.tsx
"use client";
import { useState } from "react";

export function DashboardMetrics({ data }: { data: Metric[] }) {
  const [activeTab, setActiveTab] = useState("overview");
  return (/* interactive UI only */);
}
```

```tsx
// Bad: Entire page is a Client Component just for one toggle
"use client";
import { useState, useEffect } from "react";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState([]);
  const [activeTab, setActiveTab] = useState("overview");
  useEffect(() => {
    fetch("/api/metrics").then(r => r.json()).then(setMetrics);
  }, []);
  return (/* everything client-side */);
}
```

## Async Parallel Fetching (async-parallel)

Use `Promise.all()` for independent data operations, because sequential awaits create waterfalls that compound latency linearly with each fetch.

```tsx
// Good: Parallel fetches finish in max(time_a, time_b)
async function DashboardPage() {
  const [user, stats, notifications] = await Promise.all([
    getUser(),
    getStats(),
    getNotifications(),
  ]);
  return <Dashboard user={user} stats={stats} notifications={notifications} />;
}

// Bad: Waterfall - finishes in time_a + time_b + time_c
async function DashboardPage() {
  const user = await getUser();
  const stats = await getStats();
  const notifications = await getNotifications();
  return <Dashboard user={user} stats={stats} notifications={notifications} />;
}
```

## React.cache() for Per-Request Deduplication (server-cache-react)

Wrap data-fetching functions with `React.cache()` so multiple Server Components in the same request share a single query, to prevent duplicate database hits during a single render pass.

```tsx
// Good: Deduplicated across the component tree within one request
import { cache } from "react";
import { db } from "@/lib/db";

export const getCurrentUser = cache(async () => {
  return db.user.findUnique({ where: { id: getSessionUserId() } });
});
```

## Bundle Optimization (bundle-barrel-imports, bundle-dynamic-imports)

Import directly from module paths instead of barrel files (`index.ts`), because barrel re-exports force bundlers to evaluate every export even when you use one. Use `next/dynamic` for heavy client components to code-split them out of the initial bundle.

```tsx
// Good: Direct import - tree-shakes correctly
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const HeavyChart = dynamic(() => import("@/components/chart"), {
  loading: () => <ChartSkeleton />,
  ssr: false, // because chart uses canvas/WebGL APIs
});

// Bad: Barrel import pulls entire components folder
import { Button, Dialog, Chart } from "@/components/ui";
```

## Suspense Boundaries for Async Components

Wrap async Server Components in `<Suspense>` with meaningful fallbacks, because without boundaries the entire page blocks until the slowest component resolves.

```tsx
// Good: Independent streaming with Suspense
import { Suspense } from "react";
import { UserProfile } from "./user-profile";
import { ActivityFeed } from "./activity-feed";

export default function Page() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Suspense fallback={<ProfileSkeleton />}>
        <UserProfile />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <ActivityFeed />
      </Suspense>
    </div>
  );
}
```

## Re-render Optimization (rerender-memo, rerender-no-inline-components)

Extract expensive subtrees into memoized components. Never define components inside other components, because React creates a new component type every render, destroying state and DOM.

```tsx
// Good: Extracted and memoized - re-renders only when items change
const ExpensiveList = React.memo(function ExpensiveList({ items }: { items: Item[] }) {
  return items.map((item) => <ComplexCard key={item.id} item={item} />);
});

function Dashboard({ items, onToggle }: Props) {
  return (
    <>
      <ToggleButton onClick={onToggle} />
      <ExpensiveList items={items} />
    </>
  );
}

// Bad: Inline component - re-created every render, kills DOM and state
function Dashboard({ items, onToggle }: Props) {
  const List = () => items.map((item) => <ComplexCard key={item.id} item={item} />);
  return (
    <>
      <ToggleButton onClick={onToggle} />
      <List />
    </>
  );
}
```

## Zustand Store Patterns (rerender-derived-state)

Keep Zustand stores small and focused. Subscribe to derived booleans or computed values instead of raw objects, because Zustand triggers re-renders when the selected value changes by reference.

```tsx
// Good: Subscribe to derived boolean - re-renders only on true/false flip
import { create } from "zustand";

interface CartStore {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

// In component - select only what you need
function CartBadge() {
  const hasItems = useCartStore((s) => s.items.length > 0);
  return hasItems ? <Badge /> : null;
}

// Bad: Selecting the entire items array - re-renders on every add/remove
function CartBadge() {
  const items = useCartStore((s) => s.items);
  return items.length > 0 ? <Badge /> : null;
}
```

## Custom Hook Patterns

Always prefix custom hooks with `use`. Extract shared stateful logic into custom hooks for testability, because hooks can be tested independently with `renderHook` from `@testing-library/react`.

```tsx
// Good: Encapsulated, testable, reusable
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```

## useCallback and useMemo

Use `useCallback` for functions passed to memoized children or used in effect dependency arrays. Use `useMemo` only for genuinely expensive computations, because premature memoization adds memory overhead without measurable benefit.

```tsx
// Good: useCallback stabilizes reference for memo'd child
const handleSelect = useCallback((id: string) => {
  setSelected(id);
}, []);

const sortedItems = useMemo(
  () => items.toSorted((a, b) => a.score - b.score),
  [items]
);

// Bad: Memoizing a trivial computation
const label = useMemo(() => `Hello, ${name}`, [name]);
```

## Gotchas

1. **`useEffect` runs twice in dev mode** with React Strict Mode enabled (Next.js default). Design effects to be idempotent with proper cleanup, otherwise you get duplicate API calls and event listeners in development.

2. **Server Components cannot use hooks**. Any `useState`, `useEffect`, `useContext`, or custom hook usage requires `"use client"`. Forgetting the directive produces a cryptic build error rather than a helpful message.

3. **Zustand stores persist across navigations** in Next.js App Router because the client-side React tree is not unmounted on soft navigations. Reset store slices in `useEffect` cleanup or route-change handlers, to prevent stale state from leaking between pages.

4. **`React.cache()` only deduplicates within a single server request**. It does not cache across users or requests. For cross-request caching, use Next.js `unstable_cache` or `fetch` with `revalidate`, because `React.cache` is scoped to the React render pass.

5. **Dynamic imports with `ssr: false` create hydration mismatches** if the fallback doesn't match. Always provide a `loading` component that occupies the same layout space, to prevent layout shift when the dynamic component loads.
