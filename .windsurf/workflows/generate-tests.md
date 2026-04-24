---
description: Generate comprehensive test suites for the codebase
---

# Generate Tests Workflow

This workflow analyzes code and generates appropriate test cases.

## Step 1: Analyze Target

Ask the user:

```
What would you like to test?
a) Specific file or function
b) Entire module/feature
c) API endpoints
d) Full test coverage scan
```

## Step 2: Identify Test Types Needed

Based on the code, determine which tests to generate:

| Code Type               | Test Types                       |
| ----------------------- | -------------------------------- |
| Utility functions       | Unit tests                       |
| Services/Business logic | Unit tests + Integration tests   |
| API Controllers         | Integration tests + E2E tests    |
| UI Components           | Component tests + Snapshot tests |
| Database operations     | Integration tests                |

## Step 3: Generate Unit Tests

For each function/method:

### 3.1 Identify Test Cases

- **Happy path**: Normal expected behavior
- **Edge cases**: Empty inputs, null values, boundaries
- **Error cases**: Invalid inputs, exceptions
- **Boundary conditions**: Min/max values, limits

### 3.2 Test Template

```typescript
describe('[FunctionName]', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, initialize test data
  });

  describe('when [scenario]', () => {
    it('should [expected behavior]', () => {
      // Arrange
      const input = /* test data */;

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toEqual(/* expected */);
    });
  });

  describe('error handling', () => {
    it('should throw [ErrorType] when [condition]', () => {
      expect(() => functionName(invalidInput)).toThrow(ErrorType);
    });
  });
});
```

## Step 4: Generate Integration Tests

For services and APIs:

```typescript
describe("[ServiceName] Integration", () => {
  let service: ServiceName;
  let testDb: TestDatabase;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    service = new ServiceName(testDb);
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.reset();
  });

  it("should [complete workflow]", async () => {
    // Test full workflow with real dependencies
  });
});
```

## Step 5: Generate API Tests

For REST endpoints:

```typescript
describe("POST /api/users", () => {
  it("should create user with valid data", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ name: "John", email: "john@example.com" })
      .expect(201);

    expect(response.body.data).toMatchObject({
      name: "John",
      email: "john@example.com",
    });
  });

  it("should return 400 for invalid email", async () => {
    const response = await request(app)
      .post("/api/users")
      .send({ name: "John", email: "invalid" })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("should return 401 without authentication", async () => {
    await request(app)
      .post("/api/users")
      .send({ name: "John", email: "john@example.com" })
      .expect(401);
  });
});
```

## Step 6: Generate E2E Tests

For critical user flows:

```typescript
// Playwright
test.describe("User Registration Flow", () => {
  test("should complete registration successfully", async ({ page }) => {
    await page.goto("/register");

    await page.fill('[data-testid="name"]', "John Doe");
    await page.fill('[data-testid="email"]', "john@example.com");
    await page.fill('[data-testid="password"]', "SecurePass123!");
    await page.click('[data-testid="submit"]');

    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator('[data-testid="welcome"]')).toContainText("John");
  });

  test("should show validation errors", async ({ page }) => {
    await page.goto("/register");
    await page.click('[data-testid="submit"]');

    await expect(page.locator('[data-testid="error-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-email"]')).toBeVisible();
  });
});
```

## Step 6b: Integration Test Infrastructure (Testcontainers)

For integration tests that need real database or service infrastructure, use **Testcontainers** to spin up disposable containers:

```typescript
// tests/setup/testcontainers.ts
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

let pgContainer: StartedPostgreSqlContainer;

export async function setupTestDb(): Promise<string> {
  pgContainer = await new PostgreSqlContainer("postgres:16")
    .withDatabase("test_db")
    .start();
  return pgContainer.getConnectionUri();
}

export async function teardownTestDb(): Promise<void> {
  await pgContainer.stop();
}
```

```python
# conftest.py - pytest with testcontainers
import pytest
from testcontainers.postgres import PostgresContainer

@pytest.fixture(scope="session")
def database_url():
    with PostgresContainer("postgres:16") as pg:
        yield pg.get_connection_url()

@pytest.fixture(autouse=True)
def reset_db(db_session):
    yield
    db_session.rollback()
```

- Use `scope="session"` for the container fixture (start once, reuse across tests)
- Use per-test transaction rollback for isolation
- Set a generous timeout for container startup (60s) in CI environments

## Step 7: Generate Test Data Factories

```typescript
// factories/user.factory.ts
import { faker } from "@faker-js/faker";

export const createUserData = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  createdAt: faker.date.past(),
  ...overrides,
});

export const createManyUsers = (count: number, overrides = {}) =>
  Array.from({ length: count }, () => createUserData(overrides));
```

## Step 8: Generate Mocks

```typescript
// mocks/user.repository.mock.ts
export const createMockUserRepository = () => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

// Usage in tests
const mockRepo = createMockUserRepository();
mockRepo.findById.mockResolvedValue(createUserData({ id: "123" }));
```

## Step 8b: .NET / xUnit Test Generation

For .NET projects using xUnit:

```csharp
// ✅ Good - xUnit with FluentAssertions
public class UserServiceTests
{
    private readonly Mock<IUserRepository> _mockRepo;
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _mockRepo = new Mock<IUserRepository>();
        _sut = new UserService(_mockRepo.Object);
    }

    [Fact]
    public async Task CreateUser_WithValidData_ReturnsCreatedUser()
    {
        // Arrange
        var input = new CreateUserDto { Name = "John", Email = "john@example.com" };
        _mockRepo.Setup(r => r.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync(new User { Id = Guid.NewGuid(), Name = "John" });

        // Act
        var result = await _sut.CreateUserAsync(input);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("John");
        _mockRepo.Verify(r => r.CreateAsync(It.IsAny<User>()), Times.Once);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    [InlineData("invalid-email")]
    public async Task CreateUser_WithInvalidEmail_ThrowsValidationException(string? email)
    {
        // Arrange
        var input = new CreateUserDto { Name = "John", Email = email };

        // Act & Assert
        await _sut.Invoking(s => s.CreateUserAsync(input))
            .Should().ThrowAsync<ValidationException>();
    }
}
```

```csharp
// ✅ Good - integration test with WebApplicationFactory
public class UsersApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public UsersApiTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetUsers_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/v1/users");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

## Step 8c: Django / DRF Test Generation

For Django projects using Django REST Framework:

```python
# ✅ Good - Django TestCase for model logic
from django.test import TestCase
from myapp.models import User

class UserModelTests(TestCase):
    def test_create_user_with_valid_data(self):
        user = User.objects.create_user(
            email="john@example.com",
            name="John Doe",
            password="SecurePass123!",
        )
        self.assertEqual(user.email, "john@example.com")
        self.assertTrue(user.check_password("SecurePass123!"))

    def test_create_user_without_email_raises(self):
        with self.assertRaises(ValueError):
            User.objects.create_user(email="", name="John", password="pass")
```

```python
# ✅ Good - DRF APITestCase for endpoint testing
from rest_framework.test import APITestCase
from rest_framework import status

class UserAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="admin@example.com", name="Admin", password="AdminPass123!"
        )
        self.client.force_authenticate(user=self.user)

    def test_list_users_returns_200(self):
        response = self.client.get("/api/v1/users/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

    def test_create_user_with_valid_data(self):
        data = {"email": "new@example.com", "name": "New User", "password": "NewPass123!"}
        response = self.client.post("/api/v1/users/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["email"], "new@example.com")

    def test_create_user_with_invalid_email_returns_400(self):
        data = {"email": "invalid", "name": "Test", "password": "pass"}
        response = self.client.post("/api/v1/users/", data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"]["code"], "VALIDATION_ERROR")

    def test_unauthenticated_request_returns_401(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/users/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
```

```python
# ✅ Good - pytest-django with fixtures and factories
import pytest
from model_bakery import baker

@pytest.fixture
def authenticated_client(client, django_user_model):
    user = django_user_model.objects.create_user(
        email="test@example.com", password="TestPass123!"
    )
    client.force_login(user)
    return client

@pytest.mark.django_db
def test_list_users(authenticated_client):
    baker.make("myapp.User", _quantity=3)
    response = authenticated_client.get("/api/v1/users/")
    assert response.status_code == 200
    assert len(response.json()["data"]) == 4  # 3 + authenticated user
```

- Use `APITestCase` for DRF endpoint tests -- includes `self.client` with JSON defaults
- Use `force_authenticate` to test auth-protected endpoints without token setup
- Use `model_bakery` or `factory_boy` for test data generation
- Use `@pytest.mark.django_db` for any test that touches the database

## Gotchas

- **Testcontainers requires Docker running** -- CI environments without Docker (e.g. some GitHub Actions runners) will fail silently. Add a Docker health check step before running integration tests.
- **`faker` generates non-deterministic data** -- tests that assert on generated values may flake. Use `faker` with a fixed seed for reproducible test data: `faker.seed(42)`.
- **Mocking too much hides integration bugs** -- if every dependency is mocked, the test only validates the mock setup, not real behavior. Use mocks for external services; use real implementations for internal logic.
- **`jest.mock()` hoisting surprises** -- Jest hoists `jest.mock()` calls to the top of the file, which means variables declared above the mock are `undefined` inside the factory. Use `jest.fn()` inside the factory or `jest.spyOn()`.
- **Snapshot tests create merge conflicts** -- large snapshot files change frequently and produce unreadable diffs. Prefer explicit assertions (`toHaveTextContent`, `toHaveAttribute`) over snapshots for UI tests.

## Step 9: Coverage Report

After generating tests, suggest running:

```bash
# Jest
npm test -- --coverage

# Vitest
npx vitest --coverage

# .NET
dotnet test --collect:"XPlat Code Coverage"
```

Target coverage:

- Statements: 80%+
- Branches: 75%+
- Functions: 80%+
- Lines: 80%+

## Step 10: Output Summary

Provide summary of generated tests:

```
Tests Generated

Unit Tests: 15 files, 45 test cases
- services/user.service.spec.ts (12 tests)
- utils/validation.spec.ts (8 tests)
- ...

Integration Tests: 5 files, 20 test cases
- api/users.test.ts (10 tests)
- ...

E2E Tests: 3 files, 12 test cases
- auth.spec.ts (5 tests)
- ...

Test Utilities:
- factories/user.factory.ts
- mocks/repositories.mock.ts

Run: npm test
```

## Step 10: Save to Dashboard

Persist the test generation results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/generate-tests/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "generate-tests",
  "timestamp": "[ISO timestamp]",
  "score": "[estimated coverage percentage, 0-100]",
  "maxScore": 100,
  "verdict": "[Good coverage / Partial coverage / Minimal coverage]",
  "findings": {
    "critical": 0,
    "high": 0,
    "medium": "[untested critical paths]",
    "low": "[untested edge cases]"
  },
  "highlights": ["[test types generated, e.g. unit, integration, E2E]"],
  "issues": ["[areas still lacking coverage]"],
  "summary": "[N] test files with [M] test cases generated",
  "reportPath": ".windsurf/dashboard/runs/generate-tests/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk

## Step 10a: React Testing Library Patterns (Stack: Next.js)

> Auto-added by /project-init -- Stack: Next.js -- Remove if stack changes

When generating tests for React components in this project:

1. Use `@testing-library/react` with `vitest` or `jest` as the test runner
2. Query by role, label, or text -- never by test ID unless no semantic alternative exists
3. For components using TanStack Query, wrap in a test QueryClientProvider:
   ```bash
   # Create test utility
   # test/utils.tsx with createTestQueryClient() and renderWithQuery()
   ```
4. For components using React Hook Form, provide form context in tests
5. Use `screen.getByRole()` for buttons, inputs, headings -- matches accessibility tree
6. Use `waitFor()` for async state changes, never `sleep()` or arbitrary timeouts
7. Mock API calls with MSW (Mock Service Worker) for integration tests:
   ```bash
   npm install --save-dev msw
   ```

If the test fails: check that the component is wrapped in required providers (QueryClientProvider, FormProvider, etc.).

## Step 10b: Playwright E2E Patterns (Stack: Playwright)

> Auto-added by /project-init -- Stack: Playwright -- Remove if stack changes

When generating E2E tests:

1. Use Playwright's built-in test runner (`@playwright/test`)
2. Use `page.getByRole()`, `page.getByLabel()`, `page.getByText()` -- matches the accessibility locator strategy
3. Use `test.describe()` to group related flows
4. Set up authentication state with `storageState` for logged-in tests:
   ```bash
   npx playwright codegen http://localhost:3000
   ```
5. Run tests with: `npx playwright test`
6. Generate report: `npx playwright show-report`

If tests are flaky: add `await page.waitForLoadState('networkidle')` before assertions, or use `expect(locator).toBeVisible({ timeout: 10000 })`.
