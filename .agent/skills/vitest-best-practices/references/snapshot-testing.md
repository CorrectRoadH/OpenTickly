# 1.10 Snapshot Testing

Snapshots capture the output of code and save it for comparison in future test runs. Use them sparingly for appropriate use cases.

## When to Use Snapshots

**✅ Good use cases:**
- Testing complex object structures that rarely change
- Testing error messages and stack traces
- Testing serialized output (JSON, XML, HTML)
- Testing CLI output or formatted text
- Testing generated code or configurations

**❌ Bad use cases:**
- Testing dynamic data (dates, IDs, random values)
- Testing simple values (use explicit assertions instead)
- Testing implementation details
- Replacing proper assertions for laziness

## Basic Snapshot Testing

**✅ Correct: snapshot for complex structure**
```ts
import { describe, it, expect } from 'vitest';
import { generateConfig } from './config-generator';

describe('generateConfig', () => {
  it('should generate correct config structure', () => {
    const config = generateConfig({
      environment: 'production',
      features: ['auth', 'analytics'],
    });

    expect(config).toMatchSnapshot();
  });
});
```

**First run creates snapshot:**
```ts
// __snapshots__/config-generator.test.ts.snap
exports[`generateConfig > should generate correct config structure 1`] = `
{
  "analytics": {
    "enabled": true,
    "provider": "google-analytics",
  },
  "auth": {
    "enabled": true,
    "provider": "oauth2",
    "timeout": 3600,
  },
  "environment": "production",
}
`;
```

## Inline Snapshots

For smaller snapshots, use inline snapshots to keep tests self-contained.

**✅ Correct: inline snapshot**
```ts
it('should format error message', () => {
  const error = formatError({
    code: 'AUTH_FAILED',
    message: 'Invalid credentials',
  });

  expect(error).toMatchInlineSnapshot(`
    {
      "code": "AUTH_FAILED",
      "message": "Invalid credentials",
      "timestamp": Any<Date>,
    }
  `);
});
```

## Property Matchers

Use property matchers for dynamic values like dates and IDs.

**✅ Correct: snapshot with property matchers**
```ts
it('should create user with generated fields', () => {
  const user = createUser({
    name: 'John Doe',
    email: 'john@example.com',
  });

  expect(user).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(Date),
    updatedAt: expect.any(Date),
  });
});
```

**Snapshot saved:**
```ts
exports[`should create user with generated fields 1`] = `
{
  "createdAt": Any<Date>,
  "email": "john@example.com",
  "id": Any<String>,
  "name": "John Doe",
  "updatedAt": Any<Date>,
}
`;
```

## Updating Snapshots

Update snapshots when intentional changes occur.

```bash
# Update all snapshots
vitest run -u

# Update snapshots for specific file
vitest run user-service.test.ts -u

# Interactive update mode
vitest --ui
```

**⚠️ Warning: Review changes carefully**
```bash
# Before updating, review what changed
vitest run

# Check git diff to see snapshot changes
git diff __snapshots__/

# Only update if changes are intentional
vitest run -u
```

## Testing React Components

Snapshots work well for component output (but prefer visual regression tools for styling).

**✅ Correct: component snapshot**
```ts
import { render } from '@testing-library/react';

it('should render user profile', () => {
  const { container } = render(
    <UserProfile
      name="John Doe"
      email="john@example.com"
      role="admin"
    />
  );

  expect(container.firstChild).toMatchSnapshot();
});
```

**✅ Better: snapshot with property testing**
```ts
it('should render user profile with all fields', () => {
  const { getByText, getByRole } = render(
    <UserProfile
      name="John Doe"
      email="john@example.com"
      role="admin"
    />
  );

  // Test specific behaviors
  expect(getByText('John Doe')).toBeInTheDocument();
  expect(getByText('john@example.com')).toBeInTheDocument();
  expect(getByRole('img')).toHaveAttribute('alt', 'John Doe');

  // Snapshot for full output
  expect(container.firstChild).toMatchSnapshot();
});
```

## Testing Error Messages

Snapshots work well for error messages that include context.

**✅ Correct: error snapshot**
```ts
it('should throw detailed validation error', () => {
  const invalidData = {
    email: 'invalid-email',
    age: -5,
    name: '',
  };

  expect(() => validateUser(invalidData)).toThrowErrorMatchingSnapshot();
});
```

**Snapshot:**
```ts
exports[`should throw detailed validation error 1`] = `
[ValidationError: User validation failed:
  - email: Invalid email format
  - age: Age must be between 0 and 150
  - name: Name is required]
`;
```

## Serializers

Custom serializers normalize output for consistent snapshots.

**✅ Correct: custom serializer for dates**
```ts
import { expect } from 'vitest';

expect.addSnapshotSerializer({
  test: (val) => val instanceof Date,
  serialize: (val) => `Date<${val.toISOString()}>`,
});

it('should create order with timestamp', () => {
  const order = createOrder({ items: [] });

  expect(order).toMatchInlineSnapshot(`
    {
      "createdAt": Date<2024-01-15T10:30:00.000Z>,
      "id": "order-123",
      "items": [],
    }
  `);
});
```

## When NOT to Use Snapshots

**❌ Incorrect: snapshot for simple value**
```ts
it('should return user name', () => {
  const name = getUserName(user);
  expect(name).toMatchInlineSnapshot(`"John Doe"`);
});
```

**✅ Correct: explicit assertion**
```ts
it('should return user name', () => {
  const name = getUserName(user);
  expect(name).toBe('John Doe');
});
```

**❌ Incorrect: snapshot with dynamic data**
```ts
it('should generate report', () => {
  const report = generateReport();

  // Snapshot will change every run!
  expect(report).toMatchSnapshot();
});
```

**✅ Correct: snapshot with matchers**
```ts
it('should generate report', () => {
  const report = generateReport();

  expect(report).toMatchSnapshot({
    generatedAt: expect.any(Date),
    id: expect.any(String),
  });
});
```

## Testing CLI Output

Snapshots work well for command-line output.

**✅ Correct: CLI output snapshot**
```ts
it('should display help text', () => {
  const output = cli.getHelpText();

  expect(output).toMatchInlineSnapshot(`
    "Usage: myapp [options] [command]

    Options:
      -v, --version      Output the version number
      -h, --help         Display help for command

    Commands:
      start [options]    Start the application
      stop               Stop the application
      status             Show application status"
  `);
});
```

## Testing JSON/API Responses

**✅ Correct: API response snapshot**
```ts
it('should return user API response', async () => {
  const response = await api.getUser('user-123');

  expect(response).toMatchSnapshot({
    data: {
      id: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    },
    meta: {
      requestId: expect.any(String),
      timestamp: expect.any(Number),
    },
  });
});
```

## Snapshot Best Practices

### 1. Keep Snapshots Small

**❌ Incorrect: massive snapshot**
```ts
it('should render entire page', () => {
  const { container } = render(<App />);
  expect(container).toMatchSnapshot(); // Huge snapshot!
});
```

**✅ Correct: focused snapshot**
```ts
it('should render header', () => {
  const { container } = render(<Header user={mockUser} />);
  expect(container).toMatchSnapshot();
});

it('should render navigation', () => {
  const { container } = render(<Navigation items={mockItems} />);
  expect(container).toMatchSnapshot();
});
```

### 2. Name Snapshots Clearly

**❌ Incorrect: generic name**
```ts
it('test 1', () => {
  expect(result).toMatchSnapshot();
});
```

**✅ Correct: descriptive name**
```ts
it('should format currency with symbol and decimals', () => {
  expect(formatCurrency(1234.56, 'USD')).toMatchInlineSnapshot(`"$1,234.56"`);
});
```

### 3. Review Snapshot Changes

Always review snapshot updates in code review.

```bash
# In CI/CD, ensure snapshots match
vitest run

# Fail if snapshots need updating
# This prevents accidental updates
```

**✅ Correct: intentional update**
```
1. Make code change
2. Run tests - see snapshot diff
3. Review diff carefully
4. Update if intentional: vitest run -u
5. Commit updated snapshots
6. Explain changes in PR description
```

### 4. Combine with Explicit Assertions

**✅ Correct: snapshots + assertions**
```ts
it('should generate invoice', () => {
  const invoice = generateInvoice({
    items: [{ name: 'Widget', price: 10, quantity: 2 }],
    tax: 0.08,
  });

  // Explicit assertions for critical values
  expect(invoice.subtotal).toBe(20);
  expect(invoice.tax).toBe(1.6);
  expect(invoice.total).toBe(21.6);

  // Snapshot for full structure
  expect(invoice).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(Date),
  });
});
```

## Snapshot Anti-Patterns

**❌ Incorrect: using snapshots as a crutch**
```ts
it('should work', () => {
  // Lazy: just snapshot everything instead of thinking about what to test
  expect(doSomething()).toMatchSnapshot();
});
```

**❌ Incorrect: ignoring failing snapshots**
```bash
# Don't blindly update snapshots without understanding why they changed
vitest run -u  # ❌ Without reviewing changes first
```

**❌ Incorrect: snapshots for test doubles**
```ts
it('should call service', () => {
  const mockService = vi.fn();
  callService(mockService);

  // Don't snapshot mock calls!
  expect(mockService.mock.calls).toMatchSnapshot();
});
```

**✅ Correct: explicit assertions for mocks**
```ts
it('should call service with correct params', () => {
  const mockService = vi.fn();
  callService(mockService);

  expect(mockService).toHaveBeenCalledWith({
    id: '123',
    action: 'update',
  });
});
```

## Organizing Snapshots

Snapshots are stored in `__snapshots__/` directories.

```
src/
  components/
    button.tsx
    button.test.tsx
    __snapshots__/
      button.test.tsx.snap
  services/
    user-service.ts
    user-service.test.ts
    __snapshots__/
      user-service.test.ts.snap
```

**✅ Correct: commit snapshots**
```bash
# Always commit snapshot files
git add src/**/__snapshots__
git commit -m "Update snapshots after button styling changes"
```

## When to Prefer Explicit Assertions

Use explicit assertions when:
- Testing simple values
- Testing critical business logic
- Testing behavior, not structure
- You need clear failure messages

Use snapshots when:
- Testing complex structures
- Output format matters
- Regression testing large outputs
- Maintaining consistency across many similar tests
