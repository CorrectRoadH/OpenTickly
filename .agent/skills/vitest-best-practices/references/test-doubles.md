# 1.6 Test Doubles

Test doubles replace real dependencies in tests. Use them sparingly and prefer real implementations when practical.

## Hierarchy of Test Doubles

Prefer in this order (best to worst):

1. **Real Implementation**: Use the actual code whenever possible
2. **Fakes**: Lightweight working implementations (e.g., in-memory database)
3. **Stubs**: Return pre-configured responses without behavior
4. **Spies**: Record calls while allowing real implementation to run
5. **Mocks**: Replace behavior AND verify interactions (last resort)

## When to Use Test Doubles

**✅ DO mock these:**
- External services (APIs, databases, file systems)
- Third-party libraries you don't control
- Non-deterministic functions (Date.now(), Math.random())
- Slow operations (network calls, large file I/O)

**❌ DON'T mock these:**
- Pure functions (deterministic, no side effects)
- Your own application code
- Simple utilities (array helpers, formatters)
- Code you're actively testing

## 1. Real Implementation (Preferred)

Use real code whenever possible - it provides the most confidence.

**✅ Correct: using real implementation**
```ts
describe('OrderService', () => {
  it('should calculate order total correctly', () => {
    const priceCalculator = new PriceCalculator(); // Real implementation
    const orderService = new OrderService(priceCalculator);

    const order = orderService.createOrder([
      { id: 1, price: 10, quantity: 2 },
      { id: 2, price: 5, quantity: 3 },
    ]);

    expect(order.total).toEqual(35);
  });
});
```

## 2. Fakes

Fakes are lightweight implementations with real behavior.

**✅ Correct: in-memory fake for database**
```ts
class FakeUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  clear() {
    this.users.clear();
  }
}

describe('UserService', () => {
  let userRepo: FakeUserRepository;
  let userService: UserService;

  beforeEach(() => {
    userRepo = new FakeUserRepository();
    userService = new UserService(userRepo);
  });

  it('should create and retrieve user', async () => {
    const user = await userService.createUser({
      name: 'John',
      email: 'john@example.com',
    });

    const retrieved = await userService.getUser(user.id);

    expect(retrieved).toEqual(user);
  });

  it('should list all users', async () => {
    await userService.createUser({ name: 'Alice', email: 'alice@example.com' });
    await userService.createUser({ name: 'Bob', email: 'bob@example.com' });

    const users = await userService.getAllUsers();

    expect(users).toHaveLength(2);
  });
});
```

**✅ Correct: fake for external API**
```ts
class FakePaymentGateway implements PaymentGateway {
  private payments: Payment[] = [];

  async charge(amount: number, token: string): Promise<PaymentResult> {
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      amount,
      token,
      status: 'succeeded',
      createdAt: new Date(),
    };

    this.payments.push(payment);

    return { success: true, paymentId: payment.id };
  }

  getPayments(): Payment[] {
    return [...this.payments];
  }
}
```

## 3. Stubs

Stubs return pre-configured responses without implementing real behavior.

**✅ Correct: stubbing external API call**
```ts
describe('WeatherService', () => {
  it('should return temperature for city', async () => {
    const apiClient = {
      fetch: vi.fn().mockResolvedValue({
        temperature: 72,
        conditions: 'sunny',
        city: 'San Francisco',
      }),
    };

    const weatherService = new WeatherService(apiClient);
    const weather = await weatherService.getWeather('San Francisco');

    expect(weather.temperature).toEqual(72);
    expect(apiClient.fetch).toHaveBeenCalledWith('/weather?city=San+Francisco');
  });

  it('should handle API errors', async () => {
    const apiClient = {
      fetch: vi.fn().mockRejectedValue(new Error('API unavailable')),
    };

    const weatherService = new WeatherService(apiClient);

    await expect(weatherService.getWeather('Invalid'))
      .rejects.toThrow('API unavailable');
  });
});
```

**✅ Correct: stubbing multiple scenarios**
```ts
describe('DataService', () => {
  it('should retry on failure then succeed', async () => {
    const apiClient = {
      fetch: vi.fn()
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce({ data: 'success' }),
    };

    const service = new DataService(apiClient);
    const result = await service.fetchWithRetry('/api/data');

    expect(result).toEqual({ data: 'success' });
    expect(apiClient.fetch).toHaveBeenCalledTimes(3);
  });
});
```

## 4. Spies

Spies record function calls while preserving original behavior.

**✅ Correct: spying on method calls**
```ts
describe('Logger', () => {
  it('should log errors to console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const logger = new Logger();
    logger.error('Something went wrong');

    expect(consoleSpy).toHaveBeenCalledWith('[ERROR]', 'Something went wrong');

    consoleSpy.mockRestore();
  });
});
```

**✅ Correct: spying to verify side effects**
```ts
describe('Analytics', () => {
  it('should track page views', () => {
    const trackingSpy = vi.fn();
    const analytics = new Analytics({ track: trackingSpy });

    analytics.pageView('/home', { userId: '123' });

    expect(trackingSpy).toHaveBeenCalledWith('pageview', {
      path: '/home',
      userId: '123',
    });
  });
});
```

## 5. Mocks (Use Sparingly)

Mocks replace behavior AND verify interactions. Use only when necessary.

**✅ Correct: mocking external service**
```ts
describe('EmailService', () => {
  it('should send welcome email to new users', async () => {
    const emailProvider = {
      send: vi.fn().mockResolvedValue({ messageId: 'msg-123' }),
    };

    const emailService = new EmailService(emailProvider);
    await emailService.sendWelcomeEmail('user@example.com');

    expect(emailProvider.send).toHaveBeenCalledWith({
      to: 'user@example.com',
      subject: 'Welcome!',
      body: expect.stringContaining('Welcome'),
    });
  });
});
```

**❌ Incorrect: over-mocking internal code**
```ts
describe('OrderProcessor', () => {
  it('should process order', () => {
    const calculateTaxMock = vi.fn().mockReturnValue(5);
    const calculateShippingMock = vi.fn().mockReturnValue(10);
    const formatPriceMock = vi.fn().mockReturnValue('$50.00');

    // Too many mocks! Just use real implementations
    const processor = new OrderProcessor({
      calculateTax: calculateTaxMock,
      calculateShipping: calculateShippingMock,
      formatPrice: formatPriceMock,
    });

    // ...test logic
  });
});
```
*Why?* Mocking your own simple functions makes tests brittle and less valuable. Use real implementations.

## vi.fn() - Manual Mocks

Create mock functions when you need fine control.

**✅ Correct: creating mock with specific behavior**
```ts
describe('DataFetcher', () => {
  it('should handle pagination', async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce({ items: [1, 2, 3], hasMore: true })
      .mockResolvedValueOnce({ items: [4, 5, 6], hasMore: true })
      .mockResolvedValueOnce({ items: [7, 8], hasMore: false });

    const fetcher = new DataFetcher(fetchFn);
    const allItems = await fetcher.fetchAll();

    expect(allItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
```

## vi.mock() - Module Mocking

Mock entire modules when you need to replace external dependencies.

**✅ Correct: mocking external module**
```ts
import { v4 as uuidv4 } from 'uuid';

vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

describe('UserService', () => {
  it('should generate unique user IDs', () => {
    vi.mocked(uuidv4)
      .mockReturnValueOnce('id-1')
      .mockReturnValueOnce('id-2');

    const service = new UserService();
    const user1 = service.createUser({ name: 'Alice' });
    const user2 = service.createUser({ name: 'Bob' });

    expect(user1.id).toBe('id-1');
    expect(user2.id).toBe('id-2');
  });
});
```

**✅ Correct: partial module mock**
```ts
vi.mock('../utils', async () => {
  const actual = await vi.importActual('../utils');
  return {
    ...actual,
    fetchData: vi.fn(), // Only mock fetchData, keep other utils real
  };
});
```

## Mocking Timers

Use fake timers for testing time-dependent code.

**✅ Correct: testing debounce with fake timers**
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
    debounced();
    debounced();

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });
});
```

**✅ Correct: testing intervals**
```ts
it('should poll every 5 seconds', () => {
  vi.useFakeTimers();

  const pollFn = vi.fn();
  const poller = new Poller(pollFn, 5000);

  poller.start();

  expect(pollFn).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(5000);
  expect(pollFn).toHaveBeenCalledTimes(2);

  vi.advanceTimersByTime(5000);
  expect(pollFn).toHaveBeenCalledTimes(3);

  poller.stop();
  vi.useRealTimers();
});
```

## Testing with Dates

Mock dates for consistent test results.

**✅ Correct: mocking current date**
```ts
describe('isExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for expired items', () => {
    const expiredItem = { expiryDate: new Date('2023-12-31') };
    expect(isExpired(expiredItem)).toBe(true);
  });

  it('should return false for valid items', () => {
    const validItem = { expiryDate: new Date('2024-12-31') };
    expect(isExpired(validItem)).toBe(false);
  });
});
```

## Clearing and Restoring Mocks

Always clean up mocks between tests.

**✅ Correct: clearing mocks**
```ts
describe('UserService', () => {
  const mockApi = {
    fetchUser: vi.fn(),
  };

  beforeEach(() => {
    mockApi.fetchUser.mockClear(); // Clear call history
  });

  it('test 1', async () => {
    mockApi.fetchUser.mockResolvedValue({ id: '1', name: 'Alice' });
    // ... test logic
  });

  it('test 2', async () => {
    mockApi.fetchUser.mockResolvedValue({ id: '2', name: 'Bob' });
    // ... test logic
  });
});
```

**✅ Correct: restoring spies**
```ts
describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks(); // Restore all spies
  });

  it('should log to console', () => {
    const spy = vi.spyOn(console, 'log');
    // ... test logic
  });
});
```

## Anti-Patterns

**❌ Incorrect: mocking everything**
```ts
it('should create user', () => {
  const mockValidate = vi.fn().mockReturnValue(true);
  const mockHash = vi.fn().mockReturnValue('hashed');
  const mockGenId = vi.fn().mockReturnValue('id-123');
  const mockSave = vi.fn();

  // Way too many mocks - just use real code!
  const service = new UserService({
    validate: mockValidate,
    hash: mockHash,
    generateId: mockGenId,
    save: mockSave,
  });
});
```

**❌ Incorrect: testing mocks instead of behavior**
```ts
it('should call formatUser', () => {
  const mockFormat = vi.fn();
  service.formatUser = mockFormat;

  service.getUser('123');

  expect(mockFormat).toHaveBeenCalled(); // Who cares if it was called?
});
```
*Why?* Test the actual behavior (what the user gets), not internal implementation (which functions were called).

**❌ Incorrect: brittle interaction testing**
```ts
it('should process user', () => {
  service.processUser(user);

  expect(logger.log).toHaveBeenCalledTimes(3); // Fragile!
  expect(logger.log).toHaveBeenNthCalledWith(1, 'start');
  expect(logger.log).toHaveBeenNthCalledWith(2, 'processing');
  expect(logger.log).toHaveBeenNthCalledWith(3, 'done');
});
```
*Why?* This test breaks if you change logging details, even though the actual functionality works fine.
