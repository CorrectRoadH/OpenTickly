# 1.1 Organization

## File Placement and Naming

Place test files next to their implementation for easy discovery and maintenance.

**❌ Incorrect: separate test directory**
```
src/
  components/
    button.tsx
  utils/
    formatters.ts
tests/
  components/
    button.test.tsx
  utils/
    formatters.test.ts
```

**✅ Correct: co-located test files**
```
src/
  components/
    button.tsx
    button.test.tsx
  utils/
    formatters.ts
    formatters.test.ts
  services/
    api.ts
    api.test.ts
```
*Why?* Separate test directories make it harder to find tests, keep them in sync with implementation, and increase cognitive overhead.

## Naming Conventions

Use consistent naming patterns for test files:
- `*.test.ts` or `*.spec.ts` for tests

**❌ Incorrect: vague or inconsistent names**
```
test1.ts
user_tests.ts       // snake_case instead of kebab-case
payment.spec.js     // mixing .js and .ts
authTest.ts         // camelCase instead of kebab-case
```

**✅ Correct: descriptive test file names**
```
user-service.test.ts
payment-processor.test.ts
auth.integration.test.ts
```

## One Test File Per Module

Each module, component, or class should have exactly one corresponding test file.

**❌ Incorrect: multiple test files for one module**
```
user-service.test.ts
user-service.get-user.test.ts
user-service.update-user.test.ts
```

**✅ Correct: one-to-one mapping**
```ts
// user-service.ts
export class UserService {
  getUser(id: string) { /* ... */ }
  updateUser(id: string, data: UserData) { /* ... */ }
}

// user-service.test.ts
describe('UserService', () => {
  describe('getUser', () => { /* ... */ });
  describe('updateUser', () => { /* ... */ });
});
```
*Why?* Multiple test files fragment related tests, making it harder to understand the full behavior of a module.

## Shared Test Utilities

Store reusable test setup, fixtures, and helpers in dedicated directories.

**✅ Correct: organized test utilities**
```
src/
  test-utils/
    setup.ts          // Global test configuration
    factories.ts      // Test data factories
    matchers.ts       // Custom matchers
  fixtures/
    users.json        // Test data
    products.json
  __tests__/
    integration/      // Shared integration test setup
      db-setup.ts
```

**Example test utility:**
```ts
// test-utils/factories.ts
export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  };
}

// user-service.test.ts
import { createMockUser } from '../test-utils/factories';

it('should update user email', () => {
  const user = createMockUser({ email: 'old@example.com' });
  // ...
});
```

## Describe Block Organization

Use flat, focused describe blocks to group related tests.

**❌ Incorrect: deep nesting**
```ts
describe('ShoppingCart', () => {
  describe('when cart is empty', () => {
    describe('addItem', () => {
      describe('with valid item', () => {
        it('should add item', () => { /* ... */ });
      });
      describe('with invalid item', () => {
        it('should throw', () => { /* ... */ });
      });
    });
  });
  describe('when cart has items', () => {
    describe('addItem', () => {
      // deeply nested...
    });
  });
});
```

**✅ Correct: flat structure, grouped by method**
```ts
describe('ShoppingCart', () => {
  describe('addItem', () => {
    it('should add item to empty cart', () => { /* ... */ });
    it('should increment quantity when adding existing item', () => { /* ... */ });
    it('should throw when adding invalid item', () => { /* ... */ });
  });

  describe('removeItem', () => {
    it('should remove item from cart', () => { /* ... */ });
    it('should throw when removing non-existent item', () => { /* ... */ });
  });

  describe('calculateTotal', () => {
    it('should return 0 for empty cart', () => { /* ... */ });
    it('should sum all item prices', () => { /* ... */ });
  });
});
```
*Why?* Deep nesting makes tests harder to read and adds unnecessary indentation. Put context in the test name instead.

## Setup and Teardown

Use `beforeEach` and `afterEach` for common setup, but keep tests independent.

**❌ Incorrect: shared mutable state between tests**
```ts
describe('DatabaseService', () => {
  const db = createTestDatabase(); // Shared across all tests!

  it('should insert record', async () => {
    await db.insert({ name: 'Test' });
    // ...
  });

  it('should update record', async () => {
    // Depends on previous test's data!
    await db.update(1, { name: 'Updated' });
  });
});
```

**✅ Correct: clean setup per test**
```ts
describe('DatabaseService', () => {
  let db: Database;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(async () => {
    await db.close();
  });

  it('should insert record', async () => {
    await db.insert({ name: 'Test' });
    const records = await db.query('SELECT * FROM users');
    expect(records).toHaveLength(1);
  });
});
```
*Why?* Tests that share state are fragile and order-dependent. Each test should be fully independent.
