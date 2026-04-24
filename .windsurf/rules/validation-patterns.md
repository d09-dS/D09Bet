---
description: Zod schema-first validation patterns for type-safe data handling across client and server
trigger: glob
globs: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]
---

# Validation Patterns

This rule defines conventions for Zod schema-first validation across the full stack, because a single source of truth for data shapes prevents type drift between client forms, API handlers, and database operations.

## Rule Priorities

| Priority | Category | Impact |
|----------|-------------------------------|--------|
| P0 | Schema-first types | Prevents type drift between client/server/database |
| P0 | Server-side validation | Prevents accepting malformed or malicious input |
| P1 | Schema composition | Enables DRY validation logic across features |
| P1 | Error formatting | Provides user-friendly validation messages |
| P2 | Transform/preprocess | Handles type coercion from FormData and query strings |
| P2 | Environment validation | Prevents runtime crashes from missing env vars |

## Schema-First Type Inference

Always derive TypeScript types from Zod schemas with `z.infer`, because manually maintaining parallel type definitions leads to silent drift.

```tsx
// Good - single source of truth: schema defines both validation and types
import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().cuid2(),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'editor']),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

export const createUserSchema = userSchema.omit({ id: true, createdAt: true });
export type CreateUserInput = z.infer<typeof createUserSchema>;

// Bad - manual type duplicates the schema and drifts over time
interface User {
  id: string;
  name: string;
  email: string;
  role: string; // lost enum constraint
}
```

## Schema Composition

Use `z.object`, `z.array`, `z.union`, and `z.discriminatedUnion` to build complex schemas from primitives, because composition enables reuse and keeps schemas maintainable.

```tsx
// Good - compose schemas from shared building blocks
const addressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code'),
  country: z.string().length(2),
});

const companySchema = z.object({
  name: z.string().min(1),
  address: addressSchema,
  employees: z.array(userSchema),
});

// Discriminated union for polymorphic types
const notificationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), email: z.string().email(), subject: z.string() }),
  z.object({ type: z.literal('sms'), phone: z.string(), body: z.string() }),
  z.object({ type: z.literal('push'), deviceToken: z.string(), title: z.string() }),
]);
```

## Custom Validation with refine and superRefine

Use `.refine()` for simple cross-field checks and `.superRefine()` for complex multi-field validation with custom error paths, because built-in validators can't express business rules.

```tsx
// Good - refine for password confirmation, superRefine for complex logic
const registrationSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
}).superRefine((data, ctx) => {
  if (data.endDate <= data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date must be after start date',
      path: ['endDate'],
    });
  }
});
```

## Transform and Preprocess Patterns

Use `.transform()` to normalize data and `z.coerce` to handle type coercion from strings (FormData, query params), because raw form values are always strings.

```tsx
// Good - coerce and transform handle real-world input
const productFilterSchema = z.object({
  search: z.string().trim().toLowerCase().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  categories: z.preprocess(
    (val) => (typeof val === 'string' ? val.split(',') : val),
    z.array(z.string())
  ),
  page: z.coerce.number().int().min(1).default(1),
});

// Bad - manual parsing scattered across handler
const minPrice = Number(searchParams.get('minPrice'));
const categories = searchParams.get('categories')?.split(',') ?? [];
```

## Error Formatting for API Responses

Transform `ZodError` into user-friendly messages with `.flatten()`, because raw Zod errors contain internal structure that exposes implementation details.

```tsx
// Good - flatten for form-field-mapped errors
export function formatValidationErrors(error: ZodError) {
  const flat = error.flatten();
  return {
    fieldErrors: flat.fieldErrors,
    formErrors: flat.formErrors,
  };
}

// In API route:
export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { errors: formatValidationErrors(parsed.error) },
      { status: 400 }
    );
  }
  const user = await prisma.user.create({ data: parsed.data });
  return Response.json(user, { status: 201 });
}

// Bad - sending raw ZodError leaks internal paths and codes
if (!parsed.success) {
  return Response.json(parsed.error, { status: 400 });
}
```

## Environment Variable Validation

Validate all environment variables at startup with Zod, because missing env vars cause cryptic runtime errors instead of clear startup failures.

```tsx
// Good - validate env vars at build/startup time
// lib/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);

// Bad - accessing process.env directly with no validation
const dbUrl = process.env.DATABASE_URL!;
```

## Gotchas

1. **z.infer unwraps transforms**: If your schema has `.transform()`, `z.infer` gives you the *output* type. Use `z.input<typeof schema>` when you need the *input* type (e.g., for form defaultValues) -- otherwise your form types won't match the raw input shape.

2. **Zod schemas are immutable**: Methods like `.optional()`, `.extend()`, `.omit()` return new schemas; they don't mutate the original. Forgetting to assign the result means your validation rules silently don't apply.

3. **refine runs after all field validations**: `.refine()` only executes if all individual field validations pass first. If you need cross-field validation even when some fields are invalid, use `.superRefine()`.

4. **coerce.date() accepts invalid dates**: `z.coerce.date()` will accept `new Date('invalid')` which produces an Invalid Date object. Add `.refine((d) => !isNaN(d.getTime()))` to catch this -- otherwise you store NaN timestamps.

5. **Zod bundle size**: Zod adds ~13KB gzipped to client bundles. For validation-only schemas used server-side, keep them in files that are only imported in server components or API routes -- otherwise your client bundle grows unnecessarily.
