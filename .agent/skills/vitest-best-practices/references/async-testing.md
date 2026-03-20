# 1.7 Async Testing

Testing asynchronous code requires special handling to ensure tests wait for async operations to complete.

## Basic Async/Await

Always use `async`/`await` for testing async functions.

**✅ Correct: async/await**
```ts
describe('fetchUser', () => {
  it('should return user data', async () => {
    const user = await fetchUser('user-123');

    expect(user).toEqual({
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
    });
  });
});
```

**❌ Incorrect: not awaiting async function**
```ts
it('should return user data', () => {
  const user = fetchUser('user-123'); // Returns Promise, not user!
  expect(user).toEqual({ id: 'user-123' }); // Test passes but wrong!
});
```
*Why?* Without `await`, you're comparing a Promise object, not the actual result.

## Testing Promises

Use `resolves` and `rejects` matchers for clean promise testing.

**✅ Correct: using resolves matcher**
```ts
it('should resolve with user data', async () => {
  await expect(fetchUser('user-123')).resolves.toEqual({
    id: 'user-123',
    name: 'John Doe',
  });
});
```

**✅ Correct: using rejects matcher**
```ts
it('should reject for invalid user', async () => {
  await expect(fetchUser('invalid')).rejects.toThrow('User not found');
});
```

**❌ Incorrect: manual promise handling**
```ts
it('should return user', () => {
  return fetchUser('user-123').then(user => {
    expect(user.id).toBe('user-123');
  });
});
```
*Why?* While this works, `async`/`await` is clearer and more maintainable.

## Testing Multiple Async Operations

**✅ Correct: sequential async operations**
```ts
it('should create and update user', async () => {
  // Arrange
  const userData = { name: 'John', email: 'john@example.com' };

  // Act
  const created = await userService.create(userData);
  const updated = await userService.update(created.id, { name: 'Jane' });

  // Assert
  expect(updated.name).toBe('Jane');
  expect(updated.email).toBe('john@example.com');
});
```

**✅ Correct: parallel async operations**
```ts
it('should fetch multiple users in parallel', async () => {
  const [user1, user2, user3] = await Promise.all([
    fetchUser('user-1'),
    fetchUser('user-2'),
    fetchUser('user-3'),
  ]);

  expect(user1.id).toBe('user-1');
  expect(user2.id).toBe('user-2');
  expect(user3.id).toBe('user-3');
});
```

## Testing Async Callbacks

For functions that use callbacks, promisify them or use done callback.

**✅ Correct: promisify callback-based code**
```ts
function fetchDataCallback(callback: (err: Error | null, data?: Data) => void) {
  // ... async operation
}

function fetchDataPromise(): Promise<Data> {
  return new Promise((resolve, reject) => {
    fetchDataCallback((err, data) => {
      if (err) reject(err);
      else resolve(data!);
    });
  });
}

it('should fetch data', async () => {
  const data = await fetchDataPromise();
  expect(data).toBeDefined();
});
```

**✅ Correct: using done callback (when promisify isn't possible)**
```ts
it('should call callback with data', (done) => {
  fetchDataCallback((err, data) => {
    expect(err).toBeNull();
    expect(data).toBeDefined();
    done();
  });
});
```

## Testing Timeouts and Delays

Use fake timers to speed up tests that involve delays.

**✅ Correct: fake timers for delays**
```ts
describe('retry logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should retry after delay', async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce('Success');

    const promise = retryWithDelay(mockFn, { delay: 1000, maxRetries: 2 });

    // Fast-forward time
    await vi.advanceTimersByTimeAsync(1000);

    const result = await promise;
    expect(result).toBe('Success');
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
```

**❌ Incorrect: actually waiting for delays**
```ts
it('should retry after delay', async () => {
  // Test takes 1+ second to run!
  const result = await retryWithDelay(mockFn, { delay: 1000 });
  expect(result).toBe('Success');
});
```
*Why?* Real delays slow down your test suite. Use fake timers instead.

## Testing Concurrent Operations

Test that async operations work correctly when running concurrently.

**✅ Correct: testing race conditions**
```ts
describe('RateLimiter', () => {
  it('should limit concurrent requests', async () => {
    const limiter = new RateLimiter({ maxConcurrent: 2 });
    const calls: number[] = [];

    const task = async (id: number) => {
      await limiter.acquire();
      calls.push(id);
      await delay(10);
      limiter.release();
    };

    await Promise.all([
      task(1),
      task(2),
      task(3),
      task(4),
    ]);

    expect(calls).toHaveLength(4);
    // Verify no more than 2 concurrent
    expect(limiter.getMaxConcurrent()).toBe(2);
  });
});
```

## Testing Async Iteration

Test async generators and iterables properly.

**✅ Correct: testing async generators**
```ts
async function* generateNumbers() {
  yield 1;
  yield 2;
  yield 3;
}

it('should yield all numbers', async () => {
  const numbers: number[] = [];

  for await (const num of generateNumbers()) {
    numbers.push(num);
  }

  expect(numbers).toEqual([1, 2, 3]);
});
```

## Testing Event Emitters

Wait for async events using promises.

**✅ Correct: testing event emitters**
```ts
it('should emit "complete" event after processing', async () => {
  const processor = new DataProcessor();

  const completePromise = new Promise((resolve) => {
    processor.once('complete', resolve);
  });

  processor.process(data);

  await completePromise;
  expect(processor.isComplete()).toBe(true);
});
```

**✅ Correct: testing multiple events**
```ts
it('should emit progress events', async () => {
  const processor = new DataProcessor();
  const events: string[] = [];

  processor.on('progress', (event) => {
    events.push(event);
  });

  const completePromise = new Promise((resolve) => {
    processor.once('complete', resolve);
  });

  processor.process(data);
  await completePromise;

  expect(events).toEqual(['started', 'processing', 'done']);
});
```

## Testing Async Setup/Teardown

Use async `beforeEach` and `afterEach` for async setup.

**✅ Correct: async setup and teardown**
```ts
describe('DatabaseTests', () => {
  let db: Database;

  beforeEach(async () => {
    db = await createDatabase();
    await db.migrate();
    await db.seed();
  });

  afterEach(async () => {
    await db.clear();
    await db.close();
  });

  it('should query users', async () => {
    const users = await db.query('SELECT * FROM users');
    expect(users).toHaveLength(3);
  });
});
```

## Testing Promise Rejection

Always test both success and failure paths for async operations.

**✅ Correct: testing rejection cases**
```ts
describe('authenticateUser', () => {
  it('should resolve with token for valid credentials', async () => {
    const token = await authenticateUser('user@example.com', 'password123');
    expect(token).toMatch(/^[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+$/);
  });

  it('should reject for invalid credentials', async () => {
    await expect(
      authenticateUser('user@example.com', 'wrongpassword')
    ).rejects.toThrow('Invalid credentials');
  });

  it('should reject for non-existent user', async () => {
    await expect(
      authenticateUser('nonexistent@example.com', 'password')
    ).rejects.toThrow('User not found');
  });
});
```

## Avoiding Unhandled Promise Rejections

Always handle or assert on promises.

**❌ Incorrect: unhandled promise**
```ts
it('should handle error', () => {
  fetchUser('invalid'); // Promise rejection not handled!
});
```

**✅ Correct: handling promise**
```ts
it('should handle error', async () => {
  await expect(fetchUser('invalid')).rejects.toThrow();
});
```

## Testing Async Error Handling

Verify that errors are properly caught and handled.

**✅ Correct: testing try/catch behavior**
```ts
async function processWithRetry(fn: () => Promise<any>) {
  try {
    return await fn();
  } catch (error) {
    // Retry once
    return await fn();
  }
}

it('should retry on failure', async () => {
  const mockFn = vi.fn()
    .mockRejectedValueOnce(new Error('Fail'))
    .mockResolvedValueOnce('Success');

  const result = await processWithRetry(mockFn);

  expect(result).toBe('Success');
  expect(mockFn).toHaveBeenCalledTimes(2);
});
```

## Testing Async Timeout Behavior

Test that operations timeout correctly.

**✅ Correct: testing timeouts**
```ts
describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should timeout after specified duration', async () => {
    const slowFn = () => new Promise(resolve => {
      setTimeout(() => resolve('done'), 5000);
    });

    const promise = fetchWithTimeout(slowFn, 1000);

    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).rejects.toThrow('Timeout');
  });

  it('should resolve before timeout', async () => {
    const fastFn = () => new Promise(resolve => {
      setTimeout(() => resolve('done'), 500);
    });

    const promise = fetchWithTimeout(fastFn, 1000);

    await vi.advanceTimersByTimeAsync(500);

    await expect(promise).resolves.toBe('done');
  });
});
```

## Common Async Testing Anti-Patterns

**❌ Incorrect: forgetting async keyword**
```ts
it('should fetch user', () => {  // Missing async!
  await fetchUser('user-123'); // Syntax error!
});
```

**❌ Incorrect: mixing async/await with done**
```ts
it('should fetch user', async (done) => { // Don't mix these!
  const user = await fetchUser('user-123');
  expect(user).toBeDefined();
  done();
});
```

**❌ Incorrect: not returning or awaiting promise**
```ts
it('should fetch user', () => {
  // Promise not returned or awaited - test finishes before fetch!
  fetchUser('user-123').then(user => {
    expect(user).toBeDefined();
  });
});
```
*Fix:* Either `await` the promise or `return` it.

**✅ Correct: returning promise**
```ts
it('should fetch user', () => {
  return fetchUser('user-123').then(user => {
    expect(user).toBeDefined();
  });
});
```

**✅ Better: using async/await**
```ts
it('should fetch user', async () => {
  const user = await fetchUser('user-123');
  expect(user).toBeDefined();
});
```
