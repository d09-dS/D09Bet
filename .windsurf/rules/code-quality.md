---
description: Code quality standards based on Clean Code and SOLID principles
trigger: glob
globs:
  [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
  ]
---

# Code Quality Standards

## Rule Priorities

| Priority | Category                                | Impact   |
| -------- | --------------------------------------- | -------- |
| 1        | Naming Conventions                      | CRITICAL |
| 2        | Single Responsibility / Small Functions | CRITICAL |
| 3        | SOLID Principles                        | HIGH     |
| 4        | Composition Over Inheritance            | HIGH     |
| 5        | Imports & File Structure                | MEDIUM   |
| 6        | RO-RO Pattern                           | MEDIUM   |
| 7        | Enum Usage (Stack-Specific)             | LOW      |

## Clean Code Principles

- Write concise, readable code that is self-documenting
- Use meaningful, descriptive names for variables, functions, and classes
- Keep functions small and focused on a single task
- Avoid deep nesting; prefer early returns
- Don't repeat yourself (DRY)

## SOLID Principles

- **Single Responsibility:** Each class/function does one thing well
- **Open/Closed:** Open for extension, closed for modification
- **Liskov Substitution:** Subtypes must be substitutable for base types
- **Interface Segregation:** Prefer small, specific interfaces
- **Dependency Inversion:** Depend on abstractions, not concretions

## Naming Conventions

| Type        | Convention                    | Example                          |
| ----------- | ----------------------------- | -------------------------------- |
| Variables   | camelCase                     | `userName`, `orderTotal`         |
| Functions   | camelCase                     | `getUserById`, `calculateTotal`  |
| Classes     | PascalCase                    | `UserService`, `OrderRepository` |
| Constants   | SCREAMING_SNAKE_CASE          | `MAX_RETRY_COUNT`                |
| Booleans    | Prefix with is/has/can/should | `isActive`, `hasPermission`      |
| Directories | kebab-case                    | `components/auth-wizard/`        |

- **Start every function with a verb** -- `getUser`, `calculateTotal`, `isValid`, `hasPermission`, `saveOrder`
- **Use complete words** -- avoid abbreviations except standard ones (`API`, `URL`, `err`, `ctx`, `req`, `res`)

## File Structure

```
module/
├── Main exported component/class
├── Subcomponents/helpers (if small)
├── Helper functions
├── Constants
└── Types/interfaces
```

- **One export per file** where possible -- improves tree-shaking and discoverability
- Use lowercase with dashes for **directory names**: `user-profile/`, `auth-wizard/`

## Code Examples

```typescript
// Good - clear, single responsibility
function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// Bad - multiple responsibilities, unclear
function process(data: any) {
  let x = 0;
  for (let i = 0; i < data.length; i++) {
    x += data[i].p * data[i].q;
    sendEmail(data[i]);
    updateDatabase(data[i]);
  }
  return x;
}
```

## Imports

- Group imports: external, internal, relative
- Use absolute imports with path aliases
- Avoid circular dependencies

## Function Guidelines

- Keep functions **under 20 instructions** -- extract helpers if longer
- Use the **`function` keyword for pure functions** (enables hoisting, improves readability)
- Use **arrow functions** only for short callbacks (< 3 instructions) or class methods
- **No blank lines within a function** body -- split into separate functions instead
- Use **default parameter values** instead of null/undefined checks

```typescript
// Good - pure function with function keyword
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

// Bad - arrow function for a named utility
const formatCurrency = (amount: number, currency: string) => { ... };
```

## RO-RO Pattern (Receive Object, Return Object)

For functions with multiple parameters, use objects for input and output:

```typescript
// Good - RO-RO
function createUser({ name, email, role = 'user' }: CreateUserParams): UserResult {
  return { user: { name, email, role }, token: generateToken() };
}

// Bad - positional parameters
function createUser(name: string, email: string, role: string) { ... }
```

## Enum Usage (Stack-Specific)

**TypeScript:** Avoid `enum` -- use `const` objects or string literal unions instead. TS enums compile to verbose JS and are not tree-shakeable:

```typescript
// Good - const object (tree-shakeable, type-safe)
const UserRole = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
} as const;
type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Bad in TypeScript - enum (compiled to verbose JS, not tree-shakeable)
enum UserRole {
  ADMIN = "admin",
  USER = "user",
  GUEST = "guest",
}
```

## Gotchas

- **`any` type disables all TypeScript safety** -- use `unknown` and narrow with type guards instead; treat `any` as a compile error.
- **Circular dependencies cause silent runtime failures** -- if Module A imports B and B imports A, one will receive `undefined` at startup. Use a shared module or dependency inversion.
- **Barrel files (`index.ts`) break tree-shaking** -- importing from `@/components` includes all components in the bundle. Prefer direct imports for large modules.
- **Default exports make refactoring harder** -- named exports are greppable, auto-imported correctly by IDEs, and don't require memorizing export names.

## Composition Over Inheritance

Prefer composing behavior via interfaces and dependency injection over deep inheritance chains. Inject dependencies as constructor parameters -- never extend multiple base classes.

## shadcn/ui Component Composition Patterns

> Stack-enhancement by /project-init -- Stack: shadcn/ui -- Remove if stack changes

### Composition with Radix Primitives
Extend shadcn components via composition, not modification. Wrap the base component and forward props:

```tsx
// Good - compose via wrapping
import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
}

export function LoadingButton({ isLoading, children, disabled, className, ...props }: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} className={cn(className)} {...props}>
      {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
```

### cva Variant Extension
Use `cva` to create variant systems that are type-safe and composable with `cn()`:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const cardVariants = cva("rounded-lg border transition-shadow", {
  variants: {
    elevation: {
      flat: "shadow-none",
      raised: "shadow-md hover:shadow-lg",
      floating: "shadow-lg hover:shadow-xl",
    },
  },
  defaultVariants: { elevation: "flat" },
});
```
