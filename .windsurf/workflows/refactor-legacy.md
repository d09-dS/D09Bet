---
description: Refactor legacy code following Clean Code principles
---

# Refactor Legacy Code Workflow

This workflow guides systematic refactoring of legacy code.

## Step 1: Identify Target

Ask the user:

```
What would you like to refactor?
a) Specific file or function
b) Entire module/feature
c) Full codebase scan for code smells
```

## Step 2: Analyze Code Smells

Scan for common issues:

### Long Methods

- Functions > 30 lines
- Multiple levels of nesting
- Too many parameters (> 3)

### Large Classes

- Classes with too many responsibilities
- God objects
- Feature envy

### Duplicated Code

- Copy-paste patterns
- Similar logic in multiple places

### Complex Conditionals

- Nested if-else chains
- Complex boolean expressions
- Switch statements that should be polymorphism

### Poor Naming

- Single letter variables (except loops)
- Unclear abbreviations
- Names that don't reveal intent

## Step 3: Prioritize Refactoring

Create a refactoring plan:

| Priority | Issue                 | Location       | Effort |
| -------- | --------------------- | -------------- | ------ |
| High     | God class             | UserService.ts | Large  |
| High     | Duplicated validation | Multiple files | Medium |
| Medium   | Long method           | processOrder() | Small  |
| Low      | Poor naming           | Various        | Small  |

## Step 4: Apply Refactoring Patterns

### Extract Method

```typescript
// Before
function processOrder(order) {
  // Validate order
  if (!order.items || order.items.length === 0) {
    throw new Error("No items");
  }
  if (!order.customer) {
    throw new Error("No customer");
  }
  // Calculate total
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }
  // Apply discount
  if (order.customer.isPremium) {
    total *= 0.9;
  }
  // ... more code
}

// After
function processOrder(order) {
  validateOrder(order);
  const total = calculateTotal(order);
  const finalTotal = applyDiscount(total, order.customer);
  // ... more code
}

function validateOrder(order) {
  if (!order.items?.length) throw new Error("No items");
  if (!order.customer) throw new Error("No customer");
}

function calculateTotal(order) {
  return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function applyDiscount(total, customer) {
  return customer.isPremium ? total * 0.9 : total;
}
```

### Replace Conditional with Polymorphism

```typescript
// Before
function calculateShipping(order) {
  switch (order.shippingType) {
    case "standard":
      return order.weight * 0.5;
    case "express":
      return order.weight * 1.5 + 10;
    case "overnight":
      return order.weight * 3 + 25;
  }
}

// After
interface ShippingStrategy {
  calculate(weight: number): number;
}

class StandardShipping implements ShippingStrategy {
  calculate(weight: number) {
    return weight * 0.5;
  }
}

class ExpressShipping implements ShippingStrategy {
  calculate(weight: number) {
    return weight * 1.5 + 10;
  }
}

class OvernightShipping implements ShippingStrategy {
  calculate(weight: number) {
    return weight * 3 + 25;
  }
}

function calculateShipping(order, strategy: ShippingStrategy) {
  return strategy.calculate(order.weight);
}
```

### Extract Class

```typescript
// Before: User class doing too much
class User {
  name: string;
  email: string;
  street: string;
  city: string;
  zipCode: string;

  getFullAddress() {
    return `${this.street}, ${this.city} ${this.zipCode}`;
  }

  validateAddress() {
    /* ... */
  }
}

// After: Separate Address class
class Address {
  constructor(
    public street: string,
    public city: string,
    public zipCode: string,
  ) {}

  getFullAddress() {
    return `${this.street}, ${this.city} ${this.zipCode}`;
  }

  validate() {
    /* ... */
  }
}

class User {
  name: string;
  email: string;
  address: Address;
}
```

### Replace Magic Numbers

```typescript
// Before
if (user.age >= 18) {
  /* ... */
}
if (order.total > 100) {
  /* ... */
}
setTimeout(callback, 86400000);

// After
const LEGAL_AGE = 18;
const FREE_SHIPPING_THRESHOLD = 100;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

if (user.age >= LEGAL_AGE) {
  /* ... */
}
if (order.total > FREE_SHIPPING_THRESHOLD) {
  /* ... */
}
setTimeout(callback, ONE_DAY_MS);
```

### Introduce Parameter Object

```typescript
// Before
function createUser(name, email, age, street, city, zipCode, country) {
  // ...
}

// After
interface CreateUserParams {
  name: string;
  email: string;
  age: number;
  address: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
}

function createUser(params: CreateUserParams) {
  // ...
}
```

## Step 5: Ensure Test Coverage

Before refactoring:

1. Write tests for existing behavior
2. Verify tests pass
3. Refactor in small steps
4. Run tests after each change

```typescript
// Characterization test - captures current behavior
describe("processOrder (legacy)", () => {
  it("should calculate total correctly", () => {
    const order = createTestOrder();
    const result = processOrder(order);
    expect(result.total).toBe(150); // Current behavior
  });
});
```

## Step 6: Apply SOLID Principles

### Single Responsibility

- Each class/function has one reason to change
- Split large classes into focused ones

### Open/Closed

- Open for extension, closed for modification
- Use interfaces and dependency injection

### Liskov Substitution

- Subtypes must be substitutable
- Don't violate base class contracts

### Interface Segregation

- Small, focused interfaces
- Clients shouldn't depend on unused methods

### Dependency Inversion

- Depend on abstractions
- Inject dependencies

## Step 7: Document Changes

Create refactoring summary:

```markdown
# Refactoring Summary

## Changes Made

### UserService.ts

- Extracted `validateUser()` method
- Extracted `AddressService` class
- Replaced switch with strategy pattern

### OrderProcessor.ts

- Split into `OrderValidator`, `OrderCalculator`, `OrderPersistence`
- Introduced `DiscountStrategy` interface

## Metrics

| Metric                | Before   | After    |
| --------------------- | -------- | -------- |
| Avg. method length    | 45 lines | 12 lines |
| Max nesting depth     | 5        | 2        |
| Cyclomatic complexity | 15       | 4        |
| Test coverage         | 30%      | 85%      |

## Breaking Changes

None - all public APIs preserved

## Next Steps

- [ ] Add more unit tests
- [ ] Review performance impact
- [ ] Update documentation
```

## Step 8: Review Checklist

Before completing:

- [ ] All tests pass
- [ ] No functionality changed
- [ ] Code is more readable
- [ ] Duplication reduced
- [ ] SOLID principles followed
- [ ] No new warnings/errors
- [ ] Performance not degraded

## Gotchas

- **Refactoring without tests is gambling** -- never refactor code that has no test coverage. Write characterization tests first to capture the current behavior, then refactor.
- **Big-bang refactors break everything** -- prefer small, incremental changes that each pass all tests. If you change 15 files at once, a single regression is nearly impossible to isolate.
- **Renaming across module boundaries** -- IDE rename refactors miss dynamic references (`config['myOldName']`, string-based DI containers, database column mappings). Always search for string occurrences of the old name.
- **Extracting a method changes stack traces** -- logging and error monitoring tools that match on stack frames may stop alerting after a method extraction. Update alert rules if you restructure hot paths.
- **Performance-sensitive code resists clean patterns** -- replacing a tight loop with LINQ/streams or polymorphism can introduce measurable overhead in hot paths. Benchmark before and after for any code in the critical path.

## References

- `martinfowler.com/articles` — Authoritative refactoring patterns catalog (Extract Method, Replace Conditional with Polymorphism, Introduce Parameter Object, etc.)
- `martinfowler.com/books/refactoring.html` — Refactoring: Improving the Design of Existing Code

## Step 9: Save to Dashboard

Persist the refactoring results for the dashboard:

1. Read `.windsurf/dashboard-data.json` (create with `{"projects":[],"runs":[],"globalStats":{}}` if missing)
2. Build a timestamp string: current ISO time with colons replaced by hyphens
3. Build a date string from the timestamp: `YYYY-MM-DD` (e.g. `2026-04-10`)
4. Create directory `.windsurf/dashboard/runs/refactor-legacy/[date]/[timestamp]/`
5. Write `findings.json` + `report.md` into that directory
6. Append a new entry to `runs[]` in `dashboard-data.json`:

```json
{
  "workflow": "refactor-legacy",
  "timestamp": "[ISO timestamp]",
  "score": "[code quality improvement percentage, 0-100]",
  "maxScore": 100,
  "verdict": "[Significant improvement / Moderate improvement / Minor cleanup]",
  "findings": {
    "critical": 0,
    "high": "[SOLID violations remaining]",
    "medium": "[code smells addressed]",
    "low": "[minor improvements]"
  },
  "highlights": ["[SOLID principles applied, patterns used]"],
  "issues": ["[remaining technical debt items]"],
  "summary": "Refactored [N] files, applied [patterns], reduced complexity by [X]%",
  "reportPath": ".windsurf/dashboard/runs/refactor-legacy/[date]/[timestamp]/"
}
```

6. Write updated `dashboard-data.json` back to disk
