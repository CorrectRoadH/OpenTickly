# 1.8 Performance

Keep tests fast by avoiding expensive operations and optimizing setup/teardown. Fast tests encourage developers to run them frequently.

## Keep Tests Fast

Tests should run in milliseconds, not seconds.

**✅ Correct: fast, focused test**
```ts
it('should calculate total price', () => {
  const order = { items: [{ price: 10 }, { price: 20 }] };
  expect(calculateTotal(order)).toBe(30);
});
// Runs in <1ms
```

**❌ Incorrect: unnecessarily slow test**
```ts
it('should calculate total price', async () => {
  await delay(1000); // Why?
  const order = await fetchOrderFromAPI(); // Use test data instead!
  expect(calculateTotal(order)).toBeGreaterThan(0);
});
// Runs in >1 second
```

## Avoid Real Network Calls

Never make actual HTTP requests in unit tests.

**❌ Incorrect: real network calls**
```ts
it('should fetch user data', async () => {
  const response = await fetch('https://api.example.com/users/123');
  const user = await response.json();
  expect(user.id).toBe('123');
});
// Slow, flaky, requires network
```

**✅ Correct: mocked network calls**
```ts
it('should fetch user data', async () => {
  const mockFetch = vi.fn().mockResolvedValue({
    json: async () => ({ id: '123', name: 'John' }),
  });

  const user = await fetchUser('123', mockFetch);
  expect(user.id).toBe('123');
});
// Fast, reliable, no network needed
```

## Minimize Setup and Teardown

Only set up what you need for each test.

**❌ Incorrect: expensive shared setup**
```ts
describe('UserService', () => {
  let database: Database;
  let cache: Cache;
  let emailService: EmailService;
  let analyticsService: AnalyticsService;

  beforeEach(async () => {
    // Setting up everything for every test!
    database = await createRealDatabase();
    await database.migrate();
    cache = await createRedisCache();
    emailService = new EmailService(await createSMTPConnection());
    analyticsService = new AnalyticsService(await createKafkaProducer());
  });

  it('should validate email format', () => {
    // Only needs email validation, but set up entire system!
    expect(UserService.isValidEmail('test@example.com')).toBe(true);
  });
});
```

**✅ Correct: minimal setup per test**
```ts
describe('UserService', () => {
  it('should validate email format', () => {
    // No setup needed for pure function
    expect(UserService.isValidEmail('test@example.com')).toBe(true);
  });

  it('should save user to database', async () => {
    // Only set up what's needed
    const db = new InMemoryDatabase();
    const service = new UserService(db);

    await service.saveUser({ name: 'John', email: 'john@example.com' });

    const users = await db.findAll();
    expect(users).toHaveLength(1);
  });
});
```

## Use In-Memory Implementations

Prefer in-memory fakes over real external services.

**✅ Correct: in-memory database**
```ts
class InMemoryUserRepository {
  private users = new Map<string, User>();

  async save(user: User) {
    this.users.set(user.id, user);
  }

  async findById(id: string) {
    return this.users.get(id) || null;
  }
}

describe('UserService', () => {
  it('should create and retrieve user', async () => {
    const repo = new InMemoryUserRepository();
    const service = new UserService(repo);

    const created = await service.createUser({ name: 'John' });
    const retrieved = await service.getUser(created.id);

    expect(retrieved).toEqual(created);
  });
});
// Fast: no database connection, no I/O
```

## Avoid File System I/O

Mock file system operations in unit tests.

**❌ Incorrect: real file operations**
```ts
it('should save config to file', async () => {
  const config = { theme: 'dark', language: 'en' };
  await saveConfig('./test-config.json', config);

  const loaded = await loadConfig('./test-config.json');
  expect(loaded).toEqual(config);

  // Clean up
  await fs.unlink('./test-config.json');
});
```

**✅ Correct: mocked file system**
```ts
it('should save config to file', async () => {
  const mockFs = {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('{"theme":"dark","language":"en"}'),
  };

  const config = { theme: 'dark', language: 'en' };
  await saveConfig('./test-config.json', config, mockFs);

  expect(mockFs.writeFile).toHaveBeenCalledWith(
    './test-config.json',
    JSON.stringify(config)
  );
});
```

## Optimize Fake Timers

Use fake timers instead of real delays.

**❌ Incorrect: real delays**
```ts
it('should throttle function calls', async () => {
  const fn = vi.fn();
  const throttled = throttle(fn, 1000);

  throttled();
  await delay(500);
  throttled(); // Ignored
  await delay(600);
  throttled(); // Called

  expect(fn).toHaveBeenCalledTimes(2);
});
// Takes 1.1+ seconds
```

**✅ Correct: fake timers**
```ts
it('should throttle function calls', () => {
  vi.useFakeTimers();

  const fn = vi.fn();
  const throttled = throttle(fn, 1000);

  throttled();
  vi.advanceTimersByTime(500);
  throttled(); // Ignored
  vi.advanceTimersByTime(600);
  throttled(); // Called

  expect(fn).toHaveBeenCalledTimes(2);

  vi.useRealTimers();
});
// Runs in milliseconds
```

## Avoid Unnecessary Async

Don't make tests async if they don't need to be.

**❌ Incorrect: unnecessary async**
```ts
it('should add two numbers', async () => {
  const result = add(2, 3);
  expect(result).toBe(5);
});
```

**✅ Correct: synchronous test**
```ts
it('should add two numbers', () => {
  const result = add(2, 3);
  expect(result).toBe(5);
});
```

## Batch Similar Tests

Use `it.each` to reduce setup duplication.

**❌ Incorrect: repeated setup**
```ts
describe('isValidEmail', () => {
  it('should return true for test@example.com', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
  });

  it('should return true for user.name@example.co.uk', () => {
    expect(isValidEmail('user.name@example.co.uk')).toBe(true);
  });

  it('should return false for invalid', () => {
    expect(isValidEmail('invalid')).toBe(false);
  });

  it('should return false for @example.com', () => {
    expect(isValidEmail('@example.com')).toBe(false);
  });
});
```

**✅ Correct: parameterized tests**
```ts
describe('isValidEmail', () => {
  it.each([
    { email: 'test@example.com', expected: true },
    { email: 'user.name@example.co.uk', expected: true },
    { email: 'invalid', expected: false },
    { email: '@example.com', expected: false },
  ])('should return $expected for "$email"', ({ email, expected }) => {
    expect(isValidEmail(email)).toBe(expected);
  });
});
// Less overhead, faster execution
```

## Lazy Initialization

Only create expensive objects when needed.

**❌ Incorrect: eager initialization**
```ts
describe('OrderService', () => {
  const emailService = new EmailService(); // Created even if not used
  const paymentGateway = new PaymentGateway(); // Created even if not used

  it('should calculate order total', () => {
    const order = { items: [{ price: 10 }] };
    expect(OrderService.calculateTotal(order)).toBe(10);
    // Didn't need emailService or paymentGateway!
  });
});
```

**✅ Correct: lazy initialization**
```ts
describe('OrderService', () => {
  function createEmailService() {
    return new EmailService();
  }

  function createPaymentGateway() {
    return new PaymentGateway();
  }

  it('should calculate order total', () => {
    // No services created
    const order = { items: [{ price: 10 }] };
    expect(OrderService.calculateTotal(order)).toBe(10);
  });

  it('should send confirmation email', async () => {
    // Only create what's needed
    const emailService = createEmailService();
    const orderService = new OrderService(emailService);

    await orderService.confirmOrder(order);
    expect(emailService.getSentEmails()).toHaveLength(1);
  });
});
```

## Cleanup Between Tests

Always clean up to prevent memory leaks and test pollution.

**✅ Correct: proper cleanup**
```ts
describe('EventEmitter', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  afterEach(() => {
    emitter.removeAllListeners(); // Clean up listeners
    vi.clearAllMocks(); // Clear mock call history
  });

  it('should emit event', () => {
    const listener = vi.fn();
    emitter.on('test', listener);
    emitter.emit('test');
    expect(listener).toHaveBeenCalled();
  });
});
```

## Use Test-Specific Data

Create minimal test data instead of large fixtures.

**❌ Incorrect: large, realistic data**
```ts
it('should validate user name', () => {
  const user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-123-4567',
    address: {
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
      country: 'USA',
    },
    preferences: {
      theme: 'dark',
      language: 'en',
      timezone: 'America/Chicago',
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  expect(validateUserName(user.name)).toBe(true);
  // Only needed name!
});
```

**✅ Correct: minimal test data**
```ts
it('should validate user name', () => {
  expect(validateUserName('John Doe')).toBe(true);
});

it('should validate full user object', () => {
  const user = {
    name: 'John Doe',
    email: 'john@example.com',
  };
  expect(validateUser(user)).toBe(true);
});
```

## Avoid Deep Object Comparisons

Use specific assertions instead of comparing entire objects.

**❌ Incorrect: deep comparison**
```ts
it('should update user name', async () => {
  const user = await userService.updateName('user-123', 'Jane Doe');

  expect(user).toEqual({
    id: 'user-123',
    name: 'Jane Doe',
    email: 'user@example.com',
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
    preferences: { /* large nested object */ },
    // ... many more fields
  });
});
```

**✅ Correct: specific assertions**
```ts
it('should update user name', async () => {
  const user = await userService.updateName('user-123', 'Jane Doe');

  expect(user.name).toBe('Jane Doe');
  expect(user.id).toBe('user-123');
});
```

## Run Tests in Parallel

Vitest runs tests in parallel by default. Don't disable it unless necessary.

**✅ Correct: parallel execution (default)**
```ts
// vitest.config.ts
export default {
  test: {
    // No need to configure - parallel by default
  },
};
```

**❌ Incorrect: forcing sequential execution**
```ts
// vitest.config.ts
export default {
  test: {
    pool: 'forks',
    poolOptions: {
      threads: {
        singleThread: true, // Slow!
      },
    },
  },
};
```

## Isolate Test Files

Avoid shared global state between test files.

**❌ Incorrect: shared mutable state**
```ts
// global-state.ts
export const cache = new Map();

// test1.test.ts
import { cache } from './global-state';

it('should add item to cache', () => {
  cache.set('key', 'value');
  expect(cache.get('key')).toBe('value');
});

// test2.test.ts
import { cache } from './global-state';

it('should have empty cache', () => {
  expect(cache.size).toBe(0); // Fails if test1 runs first!
});
```

**✅ Correct: isolated state**
```ts
// test1.test.ts
it('should add item to cache', () => {
  const cache = new Map();
  cache.set('key', 'value');
  expect(cache.get('key')).toBe('value');
});

// test2.test.ts
it('should have empty cache', () => {
  const cache = new Map();
  expect(cache.size).toBe(0);
});
```

## Monitor Test Performance

Identify and fix slow tests using Vitest's reporter.

```bash
# Run tests with timing information
vitest --reporter=verbose

# Find slow tests
vitest --reporter=default --slow-test-threshold=1000
```

**✅ Correct: refactor slow tests**
```ts
// Before: 5 seconds
it('should process large dataset', async () => {
  const data = await fetchLargeDataset(); // Slow API call
  const result = processData(data);
  expect(result.length).toBeGreaterThan(0);
});

// After: <10ms
it('should process large dataset', () => {
  const data = createMockDataset(1000); // Fast mock data
  const result = processData(data);
  expect(result.length).toBe(1000);
});
```
