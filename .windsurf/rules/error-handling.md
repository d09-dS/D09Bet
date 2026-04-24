---
description: Error handling patterns for robust applications
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# Error Handling Best Practices

## Rule Priorities

| Priority | Category                      | Impact   |
| -------- | ----------------------------- | -------- |
| 1        | Never Swallow Errors Silently | CRITICAL |
| 2        | Guard Clauses & Early Returns | HIGH     |
| 3        | Custom Error Classes          | HIGH     |
| 4        | Global Error Middleware       | HIGH     |
| 5        | Async Error Handling          | MEDIUM   |
| 6        | React Error Boundaries        | MEDIUM   |
| 7        | Retry & Circuit Breaker       | LOW      |

## General Principles

- Handle errors at the appropriate level
- Provide meaningful error messages
- Log errors with context for debugging
- Never swallow errors silently
- Fail fast, recover gracefully

## Guard Clauses & Happy Path Last

Validate early and keep the happy path at the bottom -- avoids deep nesting:

```typescript
// Good - guard clauses first, happy path last
async function processOrder(orderId: string, userId: string): Promise<Order> {
  const order = await orderRepository.findById(orderId);
  if (!order) throw new NotFoundError("Order");

  if (order.userId !== userId) throw new ForbiddenError("Access denied");

  if (order.status !== "pending") {
    throw new ValidationError("Order is not in a processable state", {});
  }

  return orderRepository.markAsProcessed(order);
}

// Bad - nested conditions, happy path buried
async function processOrder(orderId: string, userId: string) {
  const order = await orderRepository.findById(orderId);
  if (order) {
    if (order.userId === userId) {
      if (order.status === "pending") {
        return orderRepository.markAsProcessed(order);
      }
    }
  }
}
```

## Custom Error Classes

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

class ValidationError extends AppError {
  constructor(
    message: string,
    public fields: Record<string, string>,
  ) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, "NOT_FOUND", 404);
  }
}
```

## Try-Catch Patterns

```typescript
// Good - specific error handling
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new ApiError(`Failed to fetch user: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error("API Error:", { error, userId: id });
      throw error;
    }
    logger.error("Network Error:", { error, userId: id });
    throw new NetworkError("Unable to connect to server");
  }
}
```

## React Error Boundaries

```tsx
"use client";

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("React Error:", {
      error,
      componentStack: info.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

## Async Error Handling

```typescript
// Good - proper loading and error states
function UserProfile({ userId }: Props) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });

  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data) return <NotFound />;

  return <Profile user={data} />;
}
```

## Logging

- Include context (user ID, request ID, timestamp)
- Use appropriate log levels (error, warn, info, debug)
- Never log sensitive data (passwords, tokens)

## Global Error Middleware

```typescript
// Next.js API route error handler pattern
import { NextResponse } from "next/server";

export function withErrorHandler(
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          { error: { code: error.code, message: error.message } },
          { status: error.statusCode }
        );
      }
      logger.error("Unhandled exception", { error });
      return NextResponse.json(
        { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
        { status: 500 }
      );
    }
  };
}
```

## Gotchas

- **`forEach` silently swallows async errors** -- use `Promise.all(items.map(...))` or a `for...of` loop instead.
- **Never retry non-idempotent operations** (POST, payment charges) without idempotency keys -- retrying creates duplicate records.
- **Stack traces in API responses** -- catch all unhandled errors in a global handler; never send `error.stack` to the client in production.
- **`catch (e) {}` empty catch** -- always either rethrow, log, or handle. Silently swallowing errors makes debugging impossible.
- **React `useEffect` cleanup** -- if a fetch is started in `useEffect`, cancel it on cleanup to avoid setting state on unmounted components.

## Retry & Circuit Breaker

```typescript
// Good - exponential backoff retry
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 200,
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, baseDelayMs * 2 ** (attempt - 1)),
      );
    }
  }
  throw new Error("Max retries exceeded");
}

// Usage
const data = await withRetry(() => fetchUser(userId));
```

## Zod Error Formatting

> Stack-enhancement by /project-init -- Stack: Zod -- Remove if stack changes

### User-Friendly ZodError Formatting
Transform ZodError into structured API responses with field-level errors:

```tsx
// Good - flatten Zod errors for API responses
import { ZodError } from "zod";

export function formatZodError(error: ZodError) {
  return {
    code: "VALIDATION_ERROR",
    message: "Invalid input",
    details: error.flatten().fieldErrors,
  };
}

// Usage in API route
if (!parsed.success) {
  return NextResponse.json(
    { error: formatZodError(parsed.error) },
    { status: 400 }
  );
}
```

### React Hook Form + Zod Error Display
ZodResolver automatically maps Zod errors to form fields. Use shadcn `<FormMessage>` for display, because it reads the error from the form context:

```tsx
// Good - FormMessage auto-displays Zod validation errors
<FormField
  control={form.control}
  name="email"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input type="email" {...field} />
      </FormControl>
      <FormMessage /> {/* Automatically shows Zod error for this field */}
    </FormItem>
  )}
/>
```
