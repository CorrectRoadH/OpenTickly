# 1.3 Parameterized Tests

Use `it.each` to test the same behavior with different inputs. This eliminates code duplication while keeping tests focused and readable.

## Basic Parameterized Tests

Test one behavior with multiple input/output combinations using `it.each`.

**✅ Correct: it.each for variations of same behavior**
```ts
describe('factorial', () => {
  it.each([
    { input: 0, expected: 1 },
    { input: 1, expected: 1 },
    { input: 5, expected: 120 },
    { input: 7, expected: 5040 },
  ])('should return $expected when given $input', ({ input, expected }) => {
    expect(factorial(input)).toEqual(expected);
  });

  it('should throw when the input is negative', () => {
    expect(() => factorial(-1)).toThrow('Number must not be negative');
  });
});
```

**❌ Incorrect: duplicate tests**
```ts
describe('factorial', () => {
  it('should return 1 when given 0', () => {
    expect(factorial(0)).toEqual(1);
  });

  it('should return 1 when given 1', () => {
    expect(factorial(1)).toEqual(1);
  });

  it('should return 120 when given 5', () => {
    expect(factorial(5)).toEqual(120);
  });

  it('should return 5040 when given 7', () => {
    expect(factorial(7)).toEqual(5040);
  });
});
```
*Why?* Duplicated test code is harder to maintain. If the assertion logic changes, you need to update multiple tests.

## Template Strings in Test Names

Use `$variable` syntax in test descriptions to show which inputs are being tested.

**✅ Correct: descriptive test names with variables**
```ts
it.each([
  { email: 'test@example.com', valid: true },
  { email: 'invalid-email', valid: false },
  { email: 'test@', valid: false },
  { email: '@example.com', valid: false },
])('should return $valid for email "$email"', ({ email, valid }) => {
  expect(isValidEmail(email)).toEqual(valid);
});
```

**❌ Incorrect: generic test name**
```ts
it.each([
  { email: 'test@example.com', valid: true },
  { email: 'invalid-email', valid: false },
])('should validate email', ({ email, valid }) => {
  expect(isValidEmail(email)).toEqual(valid);
});
```
*Why?* When a test fails, you won't know which input caused the failure without checking test output details.

## Array Syntax

You can also use array syntax instead of objects for simpler cases.

**✅ Correct: array syntax for simple cases**
```ts
it.each([
  [0, 1],
  [1, 1],
  [5, 120],
  [7, 5040],
])('factorial(%i) should equal %i', (input, expected) => {
  expect(factorial(input)).toEqual(expected);
});
```

**Object syntax is preferred** when you have many parameters or want clearer naming:

**✅ Better: object syntax for clarity**
```ts
it.each([
  { n: 0, expected: 1 },
  { n: 1, expected: 1 },
  { n: 5, expected: 120 },
  { n: 7, expected: 5040 },
])('factorial($n) should equal $expected', ({ n, expected }) => {
  expect(factorial(n)).toEqual(expected);
});
```

## Testing Multiple Related Behaviors

Don't mix different behaviors in one parameterized test. Split them into separate tests.

**✅ Correct: separate tests for different behaviors**
```ts
describe('calculateDiscount', () => {
  it.each([
    { price: 100, discount: 0.1, expected: 90 },
    { price: 50, discount: 0.2, expected: 40 },
    { price: 200, discount: 0.15, expected: 170 },
  ])('should return $expected when price is $price and discount is $discount',
    ({ price, discount, expected }) => {
      expect(calculateDiscount(price, discount)).toEqual(expected);
    }
  );

  it.each([
    { price: -10, discount: 0.1 },
    { price: 100, discount: -0.1 },
    { price: 100, discount: 1.5 },
  ])('should throw for invalid inputs: price=$price, discount=$discount',
    ({ price, discount }) => {
      expect(() => calculateDiscount(price, discount)).toThrow();
    }
  );
});
```

**❌ Incorrect: mixing valid and error cases**
```ts
it.each([
  { price: 100, discount: 0.1, expected: 90, shouldThrow: false },
  { price: 50, discount: 0.2, expected: 40, shouldThrow: false },
  { price: -10, discount: 0.1, expected: null, shouldThrow: true },
  { price: 100, discount: -0.1, expected: null, shouldThrow: true },
])('should handle price=$price and discount=$discount',
  ({ price, discount, expected, shouldThrow }) => {
    if (shouldThrow) {
      expect(() => calculateDiscount(price, discount)).toThrow();
    } else {
      expect(calculateDiscount(price, discount)).toEqual(expected);
    }
  }
);
```
*Why?* Conditional logic in tests makes them harder to understand and maintain. Each test should have one clear purpose.

## Complex Test Data

For complex test cases, extract data to a separate constant.

**✅ Correct: extracted test data**
```ts
const USER_VALIDATION_CASES = [
  {
    user: { email: 'valid@example.com', age: 25, name: 'John' },
    expected: true,
    description: 'valid user',
  },
  {
    user: { email: 'invalid-email', age: 25, name: 'John' },
    expected: false,
    description: 'invalid email',
  },
  {
    user: { email: 'valid@example.com', age: 15, name: 'John' },
    expected: false,
    description: 'underage user',
  },
  {
    user: { email: 'valid@example.com', age: 25, name: '' },
    expected: false,
    description: 'empty name',
  },
];

describe('validateUser', () => {
  it.each(USER_VALIDATION_CASES)(
    'should return $expected for $description',
    ({ user, expected }) => {
      expect(validateUser(user)).toEqual(expected);
    }
  );
});
```

**❌ Incorrect: inline complex data obscures test structure**
```ts
it.each([
  { user: { email: 'valid@example.com', age: 25, name: 'John', address: { street: '123 Main', city: 'NYC', zip: '10001' }, preferences: { newsletter: true, notifications: false } }, expected: true },
  { user: { email: 'invalid', age: 25, name: 'John', address: { street: '123 Main', city: 'NYC', zip: '10001' }, preferences: { newsletter: true, notifications: false } }, expected: false },
  // ... more complex objects
])('should validate user', ({ user, expected }) => {
  expect(validateUser(user)).toEqual(expected);
});
```

## Edge Cases and Boundaries

Use parameterized tests to comprehensively cover edge cases and boundary conditions.

**✅ Correct: comprehensive edge case coverage**
```ts
describe('clamp', () => {
  it.each([
    { value: 5, min: 0, max: 10, expected: 5, case: 'value within range' },
    { value: -5, min: 0, max: 10, expected: 0, case: 'value below min' },
    { value: 15, min: 0, max: 10, expected: 10, case: 'value above max' },
    { value: 0, min: 0, max: 10, expected: 0, case: 'value equals min' },
    { value: 10, min: 0, max: 10, expected: 10, case: 'value equals max' },
    { value: 5, min: 5, max: 5, expected: 5, case: 'min equals max' },
  ])('should return $expected when $case', ({ value, min, max, expected }) => {
    expect(clamp(value, min, max)).toEqual(expected);
  });
});
```

## Using describe.each for Test Groups

For testing multiple related scenarios, use `describe.each` to create test suites.

**✅ Correct: describe.each for different user roles**
```ts
describe.each([
  { role: 'admin', canEdit: true, canDelete: true, canView: true },
  { role: 'editor', canEdit: true, canDelete: false, canView: true },
  { role: 'viewer', canEdit: false, canDelete: false, canView: true },
])('User with $role role', ({ role, canEdit, canDelete, canView }) => {
  let user: User;

  beforeEach(() => {
    user = createUser({ role });
  });

  it(`should ${canEdit ? '' : 'not '}be able to edit`, () => {
    expect(user.canEdit()).toEqual(canEdit);
  });

  it(`should ${canDelete ? '' : 'not '}be able to delete`, () => {
    expect(user.canDelete()).toEqual(canDelete);
  });

  it(`should ${canView ? '' : 'not '}be able to view`, () => {
    expect(user.canView()).toEqual(canView);
  });
});
```

## When NOT to Use Parameterized Tests

Don't use `it.each` when test cases have different setup or assertion logic.

**❌ Incorrect: forcing parameterization**
```ts
it.each([
  { type: 'email', input: 'test@example.com', setupFn: setupEmail },
  { type: 'phone', input: '123-456-7890', setupFn: setupPhone },
])('should validate $type', ({ type, input, setupFn }) => {
  setupFn(); // Different setup for each type

  if (type === 'email') {
    expect(validateEmail(input)).toEqual(true);
  } else {
    expect(validatePhone(input)).toEqual(true);
  }
});
```

**✅ Correct: separate tests with different logic**
```ts
describe('validateEmail', () => {
  it.each([
    'test@example.com',
    'user.name@example.co.uk',
    'user+tag@example.com',
  ])('should return true for valid email: %s', (email) => {
    expect(validateEmail(email)).toEqual(true);
  });
});

describe('validatePhone', () => {
  it.each([
    '123-456-7890',
    '(123) 456-7890',
    '+1-123-456-7890',
  ])('should return true for valid phone: %s', (phone) => {
    expect(validatePhone(phone)).toEqual(true);
  });
});
```
*Why?* When setup or assertions differ significantly, separate tests are clearer than conditional logic within a parameterized test.
