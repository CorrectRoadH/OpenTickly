# 1.9 Vitest-Specific Features

Vitest provides powerful features beyond basic testing. Use them to write better, more maintainable tests.

## Test Filtering

Use `.only`, `.skip`, and `.todo` to control test execution during development.

**✅ Correct: focusing on specific tests**
```ts
describe('UserService', () => {
  it.only('should create user', () => {
    // Only this test runs
    const user = createUser({ name: 'John' });
    expect(user.name).toBe('John');
  });

  it('should update user', () => {
    // Skipped while .only is active
  });

  it.skip('should delete user', () => {
    // Temporarily disabled
  });

  it.todo('should restore deleted user');
  // Placeholder for future test
});
```

**⚠️ Warning: Remove `.only` before committing**
```ts
// DON'T commit this!
it.only('should work', () => {
  // Other tests won't run in CI
});
```

## Conditional Tests

Run tests conditionally based on environment.

**✅ Correct: platform-specific tests**
```ts
describe('FileSystem', () => {
  it.runIf(process.platform === 'win32')('should handle Windows paths', () => {
    expect(normalizePath('C:\\Users\\test')).toBe('C:/Users/test');
  });

  it.skipIf(process.platform === 'win32')('should handle Unix paths', () => {
    expect(normalizePath('/home/test')).toBe('/home/test');
  });
});
```

## Concurrent Tests

Run independent tests in parallel for faster execution.

**✅ Correct: concurrent test execution**
```ts
describe.concurrent('API endpoints', () => {
  it('should fetch users', async () => {
    const users = await api.getUsers();
    expect(users).toHaveLength(10);
  });

  it('should fetch products', async () => {
    const products = await api.getProducts();
    expect(products).toHaveLength(20);
  });

  it('should fetch orders', async () => {
    const orders = await api.getOrders();
    expect(orders).toHaveLength(5);
  });
});
// All three tests run in parallel
```

**⚠️ Caution: Only use for isolated tests**
```ts
describe.concurrent('Database tests', () => {
  // ❌ BAD: These tests share state and will interfere!
  it('should create user', async () => {
    await db.insert({ id: 1, name: 'Alice' });
  });

  it('should count users', async () => {
    const count = await db.count();
    expect(count).toBe(1); // Flaky! Depends on other test
  });
});
```

## Test Context

Use `test.extend` to create custom test fixtures.

**✅ Correct: reusable test fixtures**
```ts
import { test as base, expect } from 'vitest';

interface TestContext {
  userService: UserService;
  db: Database;
}

const test = base.extend<TestContext>({
  userService: async ({}, use) => {
    const service = new UserService();
    await use(service);
    await service.cleanup();
  },

  db: async ({}, use) => {
    const db = await createTestDatabase();
    await use(db);
    await db.close();
  },
});

test('should create user', async ({ userService, db }) => {
  const user = await userService.create({ name: 'John' });
  const saved = await db.findById(user.id);
  expect(saved).toEqual(user);
});
```

## Mocking Modules

Use `vi.mock()` to mock entire modules.

**✅ Correct: mocking external dependency**
```ts
import { sendEmail } from './email-service';

vi.mock('./email-service', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

it('should send welcome email', async () => {
  await onUserSignup({ email: 'user@example.com' });

  expect(sendEmail).toHaveBeenCalledWith({
    to: 'user@example.com',
    template: 'welcome',
  });
});
```

**✅ Correct: partial module mock**
```ts
vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchData: vi.fn(), // Mock only fetchData
  };
});
```

## Spy On Methods

Use `vi.spyOn()` to spy on object methods.

**✅ Correct: spying on console methods**
```ts
it('should log error message', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation();

  logger.error('Something went wrong');

  expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Something went wrong');

  consoleSpy.mockRestore();
});
```

## Fake Timers

Control time in tests using fake timers.

**✅ Correct: testing debounce**
```ts
describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should delay function execution', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 1000);

    debounced();
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should reset timer on subsequent calls', () => {
    const callback = vi.fn();
    const debounced = debounce(callback, 1000);

    debounced();
    vi.advanceTimersByTime(500);
    debounced(); // Resets timer
    vi.advanceTimersByTime(500);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

**✅ Correct: testing intervals**
```ts
it('should poll every second', () => {
  vi.useFakeTimers();

  const callback = vi.fn();
  const poller = new Poller(callback, 1000);

  poller.start();
  expect(callback).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(3000);
  expect(callback).toHaveBeenCalledTimes(4); // Initial + 3 intervals

  poller.stop();
  vi.useRealTimers();
});
```

## Test Each

Use `test.each()` for parameterized tests.

**✅ Correct: testing multiple inputs**
```ts
test.each([
  { input: 2, expected: 4 },
  { input: 3, expected: 9 },
  { input: 4, expected: 16 },
])('square($input) should equal $expected', ({ input, expected }) => {
  expect(square(input)).toBe(expected);
});
```

**✅ Correct: array syntax**
```ts
test.each([
  [1, 1],
  [2, 4],
  [3, 9],
])('square(%i) = %i', (input, expected) => {
  expect(square(input)).toBe(expected);
});
```

## Coverage

Generate code coverage reports to identify untested code.

**vitest.config.ts:**
```ts
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'test/',
        '**/*.test.ts',
        '**/*.config.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
};
```

**Run coverage:**
```bash
vitest --coverage
```

**✅ Correct: focus on meaningful coverage**
```ts
// Don't chase 100% coverage blindly
// Focus on testing critical business logic

describe('PaymentProcessor', () => {
  it('should process valid payment', () => {
    // Critical path - must be tested
  });

  it('should reject invalid payment', () => {
    // Error path - must be tested
  });

  it('should handle network timeout', () => {
    // Edge case - important to test
  });
});
```

## Watch Mode

Use watch mode for rapid test-driven development.

```bash
# Watch mode with UI
vitest --ui

# Watch mode in terminal
vitest --watch

# Watch specific files
vitest watch src/services
```

## Benchmarking

Use `bench()` to measure performance.

**✅ Correct: comparing implementations**
```ts
import { bench, describe } from 'vitest';

describe('Array operations', () => {
  bench('for loop', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += arr[i];
    }
    return sum;
  });

  bench('forEach', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    let sum = 0;
    arr.forEach(n => sum += n);
    return sum;
  });

  bench('reduce', () => {
    const arr = Array.from({ length: 1000 }, (_, i) => i);
    return arr.reduce((sum, n) => sum + n, 0);
  });
});
```

## In-Source Testing

Define tests alongside implementation code.

**example.ts:**
```ts
export function add(a: number, b: number): number {
  return a + b;
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it('should add two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('should handle negative numbers', () => {
    expect(add(-2, 3)).toBe(1);
  });
}
```

**vitest.config.ts:**
```ts
export default {
  test: {
    includeSource: ['src/**/*.ts'],
  },
  define: {
    'import.meta.vitest': 'undefined',
  },
};
```

## Type Testing

Test TypeScript types using `expectTypeOf`.

**✅ Correct: type assertions**
```ts
import { expectTypeOf } from 'vitest';

it('should have correct return type', () => {
  const result = fetchUser('123');

  expectTypeOf(result).toEqualTypeOf<Promise<User>>();
});

it('should accept correct parameter types', () => {
  expectTypeOf(createUser).parameter(0).toMatchTypeOf<UserInput>();
});

it('should infer correct generic type', () => {
  const users = [{ id: 1, name: 'Alice' }];

  expectTypeOf(users).toEqualTypeOf<Array<{ id: number; name: string }>>();
});
```

## Setup Files

Configure global test setup and teardown.

**vitest.config.ts:**
```ts
export default {
  test: {
    setupFiles: ['./test/setup.ts'],
    globalSetup: ['./test/global-setup.ts'],
  },
};
```

**test/setup.ts (runs before each test file):**
```ts
import { beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  // Runs before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Runs after each test
  vi.restoreAllMocks();
});
```

**test/global-setup.ts (runs once before all tests):**
```ts
export async function setup() {
  // Start test database, etc.
  console.log('Starting test environment...');
}

export async function teardown() {
  // Clean up global resources
  console.log('Cleaning up test environment...');
}
```

## Environment

Specify different test environments for different tests.

**✅ Correct: browser environment for DOM tests**
```ts
/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';

it('should render component', () => {
  const { getByText } = render(<Button>Click me</Button>);
  expect(getByText('Click me')).toBeInTheDocument();
});
```

**✅ Correct: node environment for API tests**
```ts
/**
 * @vitest-environment node
 */

it('should read file', async () => {
  const content = await fs.readFile('./test.txt', 'utf-8');
  expect(content).toContain('test data');
});
```

## Retry Flaky Tests

Retry flaky tests automatically.

**✅ Correct: retry configuration**
```ts
// vitest.config.ts
export default {
  test: {
    retry: 2, // Retry failed tests up to 2 times
  },
};
```

**✅ Correct: per-test retry**
```ts
it('flaky network test', { retry: 3 }, async () => {
  const data = await fetchFromUnreliableAPI();
  expect(data).toBeDefined();
});
```

**⚠️ Better: Fix the flakiness instead of retrying**
```ts
// Instead of retrying, mock the unreliable dependency
it('network test', async () => {
  const mockFetch = vi.fn().mockResolvedValue({ data: 'test' });
  const data = await fetchData(mockFetch);
  expect(data).toBeDefined();
});
```
