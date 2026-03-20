# 1.2 AAA Pattern

Structure tests as **Arrange**, **Act**, **Assert** for maximum clarity and readability.

## What is AAA?

- **Arrange**: Set up the test data, dependencies, and preconditions
- **Act**: Execute the code under test
- **Assert**: Verify the expected outcome

This pattern makes tests instantly understandable by separating setup, execution, and verification.

## Basic AAA Structure

**❌ Incorrect: mixed arrange/act/assert**
```ts
it('should return the default value for an unknown property', () => {
  const defaultColor: Color = [128, 128, 128, 155];
  const colorLookup = lookup(colorTable, defaultVal(defaultColor));
  const actual = colorLookup('UNKNOWN');
  expect(actual).toEqual(defaultColor);

  // Another test mixed in!
  const result2 = colorLookup('ANOTHER');
  expect(result2).toEqual(defaultColor);
});
```

**✅ Correct: clear AAA structure with comments**
```ts
it('should return the default value for an unknown property', () => {
  // Arrange
  const defaultColor: Color = [128, 128, 128, 155];
  const colorLookup = lookup(colorTable, defaultVal(defaultColor));

  // Act
  const actual = colorLookup('UNKNOWN');

  // Assert
  expect(actual).toEqual(defaultColor);
});
```
*Why?* Without clear separation and with multiple behaviors tested together, it's hard to understand what's being tested and why a test fails.

## Blank Lines for Separation

Use blank lines between AAA sections even without comments for simple tests.

**❌ Incorrect: no visual separation**
```ts
it('should calculate total price with tax', () => {
  const cart = new ShoppingCart();
  cart.addItem({ name: 'Widget', price: 100 });
  const total = cart.calculateTotal(0.08);
  expect(total).toEqual(108);
});
```

**✅ Correct: visual separation with blank lines**
```ts
it('should calculate total price with tax', () => {
  const cart = new ShoppingCart();
  cart.addItem({ name: 'Widget', price: 100 });

  const total = cart.calculateTotal(0.08);

  expect(total).toEqual(108);
});
```
*Why?* Without visual separation, it's harder to quickly identify where setup ends and the actual test logic begins.

## Multiple Assertions for Same Behavior

Multiple assertions are OK when they verify different aspects of the **same behavior**.

**❌ Incorrect: testing multiple unrelated behaviors**
```ts
it('should handle user operations', () => {
  // Testing creation
  const user = createUser({ email: 'test@example.com' });
  expect(user.email).toEqual('test@example.com');

  // Testing update (different behavior!)
  updateUser(user.id, { name: 'Updated' });
  expect(user.name).toEqual('Updated');

  // Testing deletion (different behavior!)
  deleteUser(user.id);
  expect(getUser(user.id)).toBeNull();
});
```

**✅ Correct: multiple assertions for one behavior**
```ts
it('should create user with all required fields', () => {
  // Arrange
  const userData = { email: 'test@example.com', name: 'Test User' };

  // Act
  const user = createUser(userData);

  // Assert
  expect(user.email).toEqual('test@example.com');
  expect(user.name).toEqual('Test User');
  expect(user.id).toBeDefined();
  expect(user.createdAt).toBeInstanceOf(Date);
});
```
*Why?* Each test should verify one behavior. Split this into three separate tests: creation, update, and deletion.

## Avoid Logic in Tests

Keep the AAA sections simple - avoid conditional logic, loops, or complex calculations.

**❌ Incorrect: complex logic in test**
```ts
it('should filter active users', () => {
  const users = generateUsers(100); // Hidden complexity
  const userService = new UserService(users);
  const activeUsers = userService.getActiveUsers();

  // Complex verification logic
  let count = 0;
  for (const user of users) {
    if (user.active) {
      expect(activeUsers).toContain(user);
      count++;
    }
  }
  expect(activeUsers).toHaveLength(count);
});
```

**✅ Correct: straightforward test logic**
```ts
it('should filter active users', () => {
  // Arrange
  const users = [
    { id: 1, name: 'Alice', active: true },
    { id: 2, name: 'Bob', active: false },
    { id: 3, name: 'Charlie', active: true },
  ];
  const userService = new UserService(users);

  // Act
  const activeUsers = userService.getActiveUsers();

  // Assert
  expect(activeUsers).toHaveLength(2);
  expect(activeUsers[0].name).toEqual('Alice');
  expect(activeUsers[1].name).toEqual('Charlie');
});
```
*Why?* If the test has bugs, you won't know if the test or the code is wrong. Keep tests simple and obvious.

## Complex Arrange Sections

For complex setup, extract to helper functions or factories.

**❌ Incorrect: complex setup in test**
```ts
it('should apply discount to orders over $50', () => {
  // Arrange - too much going on!
  const order = new Order();
  const items = [];
  for (let i = 0; i < 10; i++) {
    const item = {
      id: i,
      name: `Item ${i}`,
      price: 10 * i,
      category: i % 2 === 0 ? 'even' : 'odd',
      taxable: i > 5,
    };
    items.push(item);
    order.addItem(item);
  }
  const discountService = new DiscountService();

  // Act
  const discountedTotal = discountService.applyDiscount(order);

  // Assert
  expect(discountedTotal).toBeLessThan(order.total);
});
```

**✅ Correct: extracted setup helper**
```ts
function createTestOrder(items: number = 3): Order {
  const order = new Order();
  for (let i = 0; i < items; i++) {
    order.addItem({ id: i, name: `Item ${i}`, price: 10 * i });
  }
  return order;
}

it('should apply discount to orders over $50', () => {
  // Arrange
  const order = createTestOrder(10);
  const discountService = new DiscountService();

  // Act
  const discountedTotal = discountService.applyDiscount(order);

  // Assert
  expect(discountedTotal).toBeLessThan(order.total);
  expect(discountService.discountApplied).toEqual(0.1);
});
```
*Why?* Complex setup obscures the test's purpose. Extract to helper functions or test-utils.

## Async/Await with AAA

AAA works perfectly with async tests - just add await in the Act section.

**❌ Incorrect: mixing setup with async calls**
```ts
it('should fetch user from API', async () => {
  const userId = 'user-123';
  const apiClient = new ApiClient();
  const user = await apiClient.getUser(userId); // Act hidden in middle
  const profile = await apiClient.getProfile(userId); // More acts!
  expect(user.id).toEqual(userId);
  expect(profile.userId).toEqual(userId);
});
```

**✅ Correct: async AAA pattern**
```ts
it('should fetch user from API', async () => {
  // Arrange
  const userId = 'user-123';
  const apiClient = new ApiClient();

  // Act
  const user = await apiClient.getUser(userId);

  // Assert
  expect(user.id).toEqual(userId);
  expect(user.name).toBeDefined();
});
```
*Why?* Multiple async operations without clear separation make it unclear what's being tested.

## When to Omit AAA Comments

For very simple tests, AAA comments can be omitted if blank lines provide sufficient clarity.

**✅ Correct: simple test without AAA comments**
```ts
it('should add two numbers', () => {
  const calculator = new Calculator();

  const result = calculator.add(2, 3);

  expect(result).toEqual(5);
});
```

However, **when in doubt, include the comments**. They never hurt and help onboarding developers understand your test structure.
