---
description: Testing standards and best practices
trigger: glob
globs: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"]
---

# Testing Standards

## Rule Priorities

| Priority | Category                                   | Impact   |
| -------- | ------------------------------------------ | -------- |
| 1        | Test Isolation & No Shared State           | CRITICAL |
| 2        | AAA Pattern & Naming Conventions           | HIGH     |
| 3        | Unit Tests for Business Logic              | HIGH     |
| 4        | Integration Tests with Real Infrastructure | HIGH     |
| 5        | Component Tests (UI)                       | MEDIUM   |
| 6        | E2E Tests for Critical Flows               | MEDIUM   |
| 7        | Test Coverage (80%+ critical paths)        | LOW      |

## Test Pyramid

- **Unit Tests** (70%): Fast, isolated, test single units
- **Integration Tests** (20%): Test component interactions
- **E2E Tests** (10%): Test complete user flows

## Naming Conventions

```typescript
// ✅ Good - descriptive test names
describe("UserService", () => {
  describe("createUser", () => {
    it("should create a user with valid data", () => {});
    it("should throw ValidationError for invalid email", () => {});
    it("should hash password before saving", () => {});
  });
});
```

## AAA Pattern

```typescript
it("should calculate order total correctly", () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 },
  ];

  // Act
  const total = calculateTotal(items);

  // Assert
  expect(total).toBe(35);
});
```

## Unit Tests

```typescript
// ✅ Good - isolated, focused
describe("formatCurrency", () => {
  it("should format USD correctly", () => {
    expect(formatCurrency(1234.56, "en-US", "USD")).toBe("$1,234.56");
  });

  it("should format EUR correctly", () => {
    expect(formatCurrency(1234.56, "de-DE", "EUR")).toBe("1.234,56 €");
  });
});
```

## Component Tests

```tsx
import { render, screen, fireEvent } from "@testing-library/react";

describe("LoginForm", () => {
  it("should show error for invalid email", async () => {
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "invalid" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email");
  });
});
```

## Mocking

```typescript
// ✅ Good - Jest: mock external dependencies
jest.mock("@/services/api", () => ({
  fetchUser: jest.fn(),
}));

beforeEach(() => {
  (fetchUser as jest.Mock).mockResolvedValue({ id: "1", name: "John" });
});

afterEach(() => {
  jest.clearAllMocks();
});

// ✅ Good - Vitest: mock external dependencies
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("@/services/api", () => ({
  fetchUser: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(fetchUser).mockResolvedValue({ id: "1", name: "John" });
});

afterEach(() => {
  vi.clearAllMocks();
});
```

## E2E Tests (Playwright/Cypress)

```typescript
// ✅ Good - test user flows
test("user can complete checkout", async ({ page }) => {
  await page.goto("/products");
  await page.click('[data-testid="add-to-cart"]');
  await page.click('[data-testid="checkout"]');
  await page.fill('[name="email"]', "test@example.com");
  await page.click('[data-testid="submit-order"]');

  await expect(page.locator(".order-confirmation")).toBeVisible();
});
```

## Integration Tests with Test Isolation

Use **Testcontainers** for integration tests that need real infrastructure (database, Redis, message queue):

```typescript
// ✅ Good - Testcontainers for real DB in integration tests
import { PostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer().start();
  process.env.DATABASE_URL = container.getConnectionUri();
}, 60_000);

afterAll(async () => {
  await container.stop();
});
```

## Test Coverage

- Aim for 80%+ coverage on critical paths
- Don't chase 100% - focus on meaningful tests
- Cover edge cases and error paths

## What to Test

- ✅ Business logic
- ✅ Edge cases
- ✅ Error handling
- ✅ User interactions
- ❌ Implementation details
- ❌ Third-party libraries
- ❌ Trivial getters/setters

## Gotchas

- **Test pollution via shared state** — always reset mocks and database state in `beforeEach`, not `beforeAll`, unless the setup is truly read-only.
- **Testing implementation details** — assert on observable behavior (output, side-effects, UI state), not on internal method calls or private state.
- **`Date.now()` and `Math.random()` in tests** — mock time (`jest.useFakeTimers()`) and random values for deterministic results.
- **`async/await` without `await` in test** — forgetting `await` on async assertions makes tests pass vacuously (the Promise resolves after the assertion).
- **Snapshot tests break on unrelated UI changes** — use snapshot tests sparingly; prefer explicit `expect(el).toHaveTextContent(...)` assertions.
- **Integration tests without isolation** — sharing a real database between tests causes flaky failures. Use Testcontainers or an in-memory database with per-test transactions that roll back.

## Test Variable Naming

Use clear, role-based names — not generic `data` or `result`:

```typescript
// ✅ Good - intent is immediately clear
const inputUser = { name: "John", email: "john@example.com" };
const mockRepository = createMockUserRepository();
const actualUser = await userService.createUser(inputUser);
const expectedUser = { id: expect.any(String), ...inputUser };

expect(actualUser).toMatchObject(expectedUser);
```

## Acceptance Tests (Given-When-Then)

Write acceptance tests per module using Given-When-Then:

```typescript
describe("UserModule — create user flow", () => {
  it("should create and persist a user given valid registration data", async () => {
    // Given
    const registrationData = {
      name: "John",
      email: "john@example.com",
      password: "Secure123!",
    };

    // When
    const result = await userService.register(registrationData);

    // Then
    expect(result.user.email).toBe(registrationData.email);
    expect(
      await userRepository.findByEmail(registrationData.email),
    ).toBeDefined();
  });
});
```

## Test-Driven Development (TDD)

Follow the **Red-Green-Refactor** cycle:

1. **Red** -- Write a failing test that describes the expected behavior
2. **Green** -- Write the minimal code to make the test pass
3. **Refactor** -- Clean up while keeping all tests green

- Write **one test at a time** -- do not batch multiple failing tests
- Each test should fail for **exactly one reason**
- Keep the Green step as simple as possible -- avoid premature optimization
- Refactor only when tests are green -- never refactor and add features simultaneously

## React Testing Library Patterns

> Stack-enhancement by /project-init -- Stack: Next.js + React -- Remove if stack changes

### Component Testing with React Testing Library
Test components by their behavior, not implementation:

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

describe("SearchForm", () => {
  it("should submit search query", async () => {
    const onSearch = vi.fn();
    render(<SearchForm onSearch={onSearch} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "test" } });
    fireEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() => {
      expect(onSearch).toHaveBeenCalledWith("test");
    });
  });
});
```

### TanStack Query Test Wrapper
Wrap components that use `useQuery` in a QueryClientProvider for tests:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}
```

### Playwright E2E Patterns

> Stack-enhancement by /project-init -- Stack: Playwright -- Remove if stack changes

```typescript
import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should redirect unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*login/);
  });

  test("should log in with valid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL("/dashboard");
  });
});
```
