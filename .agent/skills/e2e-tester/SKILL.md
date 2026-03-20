---
name: e2e-tester
description: >
  Playwright E2E testing patterns.
  Trigger: When writing Playwright E2E tests (Page Object Model, selectors, MCP exploration workflow).
metadata:
  scope: [root, ui]
  auto_invoke: "Writing Playwright E2E tests"
allowed-tools: Read, Edit, Write, Glob, Grep, Bash, WebFetch, WebSearch, Task
---

Before you start:
- check if any existing tests cover the functionality you are testing
- check if a unit tests can cover the feature better
- analyze if a end to end test brings any value over a unit test

If the answer is yes to any of the above, proceed with the end to end test creation.

## MCP Workflow (MANDATORY If Available)

**⚠️ If you have Playwright MCP tools, ALWAYS use them BEFORE creating any test:**

1. **Navigate** to target page
2. **Take snapshot** to see page structure and elements
3. **Interact** with forms/elements to verify exact user flow
4. **Take screenshots** to document expected states
5. **Verify page transitions** through complete flow (loading, success, error)
6. **Document actual selectors** from snapshots (use real refs and labels)
7. **Only after exploring** create test code with verified selectors

**If MCP NOT available:** Proceed with test creation based on docs and code analysis.

**Why This Matters:**
- ✅ Precise tests - exact steps needed, no assumptions
- ✅ Accurate selectors - real DOM structure, not imagined
- ✅ Real flow validation - verify journey actually works
- ✅ Avoid over-engineering - minimal tests for what exists
- ✅ Prevent flaky tests - real exploration = stable tests
- ❌ Never assume how UI "should" work

## Waiting Strategies (CRITICAL)

```typescript
// ❌ NEVER use fixed waits
await page.waitForTimeout(2000);

// ✅ Wait for specific conditions
await expect(element).toBeVisible();
await page.waitForResponse(resp => resp.url().includes('/api/data'));
await page.waitForURL('**/dashboard');
await expect(page.getByText('Success')).toBeVisible({ timeout: 10000 });

// ✅ For SPAs, prefer explicit waits over networkidle
await page.goto('/app', { waitUntil: 'domcontentloaded' });
await expect(page.getByRole('main')).toBeVisible();
```

## File Structure

```
tests/
├── base-page.ts              # Parent class for ALL pages
├── helpers.ts                # Shared utilities
└── {page-name}/
    ├── {page-name}-page.ts   # Page Object Model
    ├── {page-name}.spec.ts   # ALL tests here (NO separate files!)
    └── {page-name}.md        # Test documentation
```

**File Naming:**
- ✅ `sign-up.spec.ts` (all sign-up tests)
- ✅ `sign-up-page.ts` (page object)
- ✅ `sign-up.md` (documentation)
- ❌ `sign-up-critical-path.spec.ts` (WRONG - no separate files)
- ❌ `sign-up-validation.spec.ts` (WRONG)

## Selector Priority (REQUIRED)

```typescript
// 1. BEST - getByRole for interactive elements
this.submitButton = page.getByRole("button", { name: "Submit" });
this.navLink = page.getByRole("link", { name: "Dashboard" });

// 2. BEST - getByLabel for form controls
this.emailInput = page.getByLabel("Email");
this.passwordInput = page.getByLabel("Password");

// 3. SPARINGLY - getByText for static content only
this.errorMessage = page.getByText("Invalid credentials");
this.pageTitle = page.getByText("Welcome");

// 4. LAST RESORT - getByTestId when above fail
this.customWidget = page.getByTestId("date-picker");

// ❌ AVOID fragile selectors
this.button = page.locator(".btn-primary");  // NO
this.input = page.locator("#email");         // NO
```

## Scope Detection (ASK IF AMBIGUOUS)

| User Says                                                          | Action                             |
| ------------------------------------------------------------------ | ---------------------------------- |
| "a test", "one test", "new test", "add test"                       | Create ONE test() in existing spec |
| "comprehensive tests", "all tests", "test suite", "generate tests" | Create full suite                  |

**Examples:**
- "Create a test for user sign-up" → ONE test only
- "Generate E2E tests for login page" → Full suite
- "Add a test to verify form validation" → ONE test to existing spec

## Page Object Pattern

```typescript
import { Page, Locator, expect } from "@playwright/test";

// BasePage - ALL pages extend this
export class BasePage {
  constructor(protected page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }

  // Common methods go here (see Refactoring Guidelines)
  async waitForNotification(): Promise<void> {
    await this.page.waitForSelector('[role="status"]');
  }

  async verifyNotificationMessage(message: string): Promise<void> {
    const notification = this.page.locator('[role="status"]');
    await expect(notification).toContainText(message);
  }
}

// Page-specific implementation
export interface LoginData {
  email: string;
  password: string;
}

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.submitButton = page.getByRole("button", { name: "Sign in" });
  }

  async goto(): Promise<void> {
    await super.goto("/login");
  }

  async login(data: LoginData): Promise<void> {
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    await this.submitButton.click();
  }

  async verifyCriticalOutcome(): Promise<void> {
    await expect(this.page).toHaveURL("/dashboard");
  }
}
```

## Page Object Reuse (CRITICAL)

**Always check existing page objects before creating new ones!**

```typescript
// ✅ GOOD: Reuse existing page objects
import { SignInPage } from "../sign-in/sign-in-page";
import { HomePage } from "../home/home-page";

test("User can sign up and login", async ({ page }) => {
  const signUpPage = new SignUpPage(page);
  const signInPage = new SignInPage(page);  // REUSE
  const homePage = new HomePage(page);      // REUSE

  await signUpPage.signUp(userData);
  await homePage.verifyPageLoaded();  // REUSE method
  await homePage.signOut();           // REUSE method
  await signInPage.login(credentials); // REUSE method
});

// ❌ BAD: Recreating existing functionality
export class SignUpPage extends BasePage {
  async logout() { /* ... */ }  // ❌ HomePage already has this
  async login() { /* ... */ }   // ❌ SignInPage already has this
}
```

**Guidelines:**
- Check `tests/` for existing page objects first
- Import and reuse existing pages
- Create page objects only when page doesn't exist
- If test requires multiple pages, ensure all page objects exist (create if needed)

## Refactoring Guidelines

### Move to `BasePage` when:
- ✅ Navigation helpers used by multiple pages (`waitForPageLoad()`, `getCurrentUrl()`)
- ✅ Common UI interactions (notifications, modals, theme toggles)
- ✅ Verification patterns repeated across pages (`isVisible()`, `waitForVisible()`)
- ✅ Error handling that applies to all pages
- ✅ Screenshot utilities for debugging

### Move to `helpers.ts` when:
- ✅ Test data generation (`generateUniqueEmail()`, `generateTestUser()`)
- ✅ Setup/teardown utilities (`createTestUser()`, `cleanupTestData()`)
- ✅ Custom assertions (`expectNotificationToContain()`)
- ✅ API helpers for test setup (`seedDatabase()`, `resetState()`)
- ✅ Time utilities (`waitForCondition()`, `retryAction()`)

**Before (BAD):**
```typescript
// Repeated in multiple page objects
export class SignUpPage extends BasePage {
  async waitForNotification(): Promise<void> {
    await this.page.waitForSelector('[role="status"]');
  }
}
export class SignInPage extends BasePage {
  async waitForNotification(): Promise<void> {
    await this.page.waitForSelector('[role="status"]');  // DUPLICATED!
  }
}
```

**After (GOOD):**
```typescript
// BasePage - shared across all pages
export class BasePage {
  async waitForNotification(): Promise<void> {
    await this.page.waitForSelector('[role="status"]');
  }
}

// helpers.ts - data generation
export function generateUniqueEmail(): string {
  return `test.${Date.now()}@example.com`;
}

export function generateTestUser() {
  return {
    name: "Test User",
    email: generateUniqueEmail(),
    password: "TestPassword123!",
  };
}
```

## Test Pattern with Tags

```typescript
import { test, expect } from "@playwright/test";
import { LoginPage } from "./login-page";

test.describe("Login", () => {
  test("User can login successfully",
    { tag: ["@critical", "@e2e", "@login", "@LOGIN-E2E-001"] },
    async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login({ email: "user@test.com", password: "pass123" });

      await expect(page).toHaveURL("/dashboard");
    }
  );
});
```

**Tag Categories:**
- Priority: `@critical`, `@high`, `@medium`, `@low`
- Type: `@e2e`
- Feature: `@signup`, `@signin`, `@dashboard`
- Test ID: `@SIGNUP-E2E-001`, `@LOGIN-E2E-002`

## Test Documentation Format ({page-name}.md)

```markdown
### E2E Tests: {Feature Name}

**Suite ID:** `{SUITE-ID}`
**Feature:** {Feature description}

---

## Test Case: `{TEST-ID}` - {Test case title}

**Priority:** `{critical|high|medium|low}`

**Tags:**
- type → @e2e
- feature → @{feature-name}

**Description/Objective:** {Brief description}

**Preconditions:**
- {Prerequisites for test to run}
- {Required data or state}

### Flow Steps:
1. {Step 1}
2. {Step 2}
3. {Step 3}

### Expected Result:
- {Expected outcome 1}
- {Expected outcome 2}

### Key verification points:
- {Assertion 1}
- {Assertion 2}

### Notes:
- {Additional considerations}
```

**Documentation Rules:**
- ❌ NO general test running instructions
- ❌ NO file structure explanations
- ❌ NO code examples or tutorials
- ❌ NO troubleshooting sections
- ✅ Focus ONLY on specific test case
- ✅ Keep under 60 lines when possible

## Authentication State Reuse

```typescript
// auth.setup.ts - Run once, reuse across tests
import { test as setup } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("user@test.com");
  await page.getByLabel("Password").fill("password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/dashboard");
  await page.context().storageState({ path: ".auth/user.json" });
});

// playwright.config.ts
projects: [
  { name: "auth", testMatch: /auth\.setup\.ts/ },
  { name: "logged-in", dependencies: ["auth"], use: { storageState: ".auth/user.json" } },
  { name: "logged-out", use: { storageState: { cookies: [], origins: [] } } }
]
```

## API Mocking

```typescript
// Mock API responses for isolated tests
await page.route("**/api/users", route =>
  route.fulfill({ json: { users: [{ id: 1, name: "Test" }] } })
);

// Mock error states
await page.route("**/api/submit", route =>
  route.fulfill({ status: 500, json: { error: "Server error" } })
);

// Abort requests (e.g., block analytics)
await page.route("**/analytics/**", route => route.abort());
```

## Test Fixtures

```typescript
// fixtures.ts - Custom fixtures for setup/teardown
import { test as base } from "@playwright/test";
import { AdminPage } from "./admin/admin-page";

export const test = base.extend<{ adminPage: AdminPage }>({
  adminPage: async ({ page }, use) => {
    const admin = new AdminPage(page);
    await admin.goto();
    await use(admin);
    // Teardown runs after test
  },
});

// Usage in tests
test("admin can manage users", async ({ adminPage }) => {
  await adminPage.deleteUser("test@example.com");
});
```

## Parallel Execution

```typescript
// Tests run in parallel by default. Use serial when tests share state:
test.describe.configure({ mode: "serial" });

// Isolate test data to prevent conflicts
test("create user", async ({ page }) => {
  const uniqueEmail = `user-${Date.now()}@test.com`; // ✅ Unique per run
});
```

## Assertions

```typescript
// Soft assertions - collect multiple failures
await expect.soft(page.getByText("Title")).toBeVisible();
await expect.soft(page.getByText("Subtitle")).toBeVisible();
// Test continues, reports all failures at end

// Polling assertions - retry until condition met
await expect(async () => {
  const count = await page.getByRole("listitem").count();
  expect(count).toBeGreaterThan(5);
}).toPass({ timeout: 10000 });

// Visual regression
await expect(page).toHaveScreenshot("dashboard.png");
await expect(page.getByRole("dialog")).toHaveScreenshot();
```

## Common Pitfalls

```typescript
// ❌ Element detached after navigation
const button = page.getByRole("button", { name: "Submit" });
await button.click();
await button.click(); // May fail if page navigated

// ✅ Re-query after navigation
await page.getByRole("button", { name: "Submit" }).click();
await page.getByRole("button", { name: "Confirm" }).click();

// ❌ Race condition with animations
await element.click();

// ✅ Wait for animation to complete
await element.click();
await expect(modal).toBeVisible();

// Iframes
const frame = page.frameLocator("#iframe-id");
await frame.getByRole("button").click();

// Shadow DOM - Playwright pierces by default, but for closed shadow:
await page.locator("custom-element").locator("internal:shadow=button").click();
```

## Mobile & Viewport Testing

```typescript
// In test file
test.use({ viewport: { width: 375, height: 667 } });

// Device emulation
import { devices } from "@playwright/test";
test.use({ ...devices["iPhone 13"] });

// Or in playwright.config.ts projects
projects: [
  { name: "desktop", use: { viewport: { width: 1280, height: 720 } } },
  { name: "mobile", use: { ...devices["iPhone 13"] } },
]
```

## Debugging & Traces

```bash
# Enable traces on failure (recommended for CI)
npx playwright test --trace on-first-retry

# View trace file
npx playwright show-trace trace.zip

# Debug mode - step through test
npx playwright test --debug

# Headed mode to see browser
npx playwright test --headed
```

```typescript
// In playwright.config.ts
use: {
  trace: "on-first-retry",      // Capture trace on retry
  screenshot: "only-on-failure", // Screenshot on failure
  video: "retain-on-failure",    // Video on failure
}
```

## CI/CD Configuration

```typescript
// playwright.config.ts for CI
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html"], ["github"], ["junit", { outputFile: "results.xml" }]]
    : [["html"]],
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
```

```yaml
# GitHub Actions example
- name: Run Playwright tests
  run: npx playwright test
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

## Running Tests (PREFER PARTIAL RUNS)

**Always prefer running specific tests over the entire suite** for faster feedback:

```bash
# Run ALL tests
npx playwright test

# ✅ PREFERRED: Run specific file
npx playwright test tests/login/login.spec.ts

# ✅ PREFERRED: Run specific folder
npx playwright test tests/login/

# ✅ PREFERRED: Run by test name (grep)
npx playwright test --grep "login"
npx playwright test --grep "user can sign up"

# ✅ PREFERRED: Run by tag
npx playwright test --grep "@critical"
npx playwright test --grep "@LOGIN-E2E-001"

# ✅ Run single test by line number
npx playwright test tests/login/login.spec.ts:42

# ✅ Run tests matching multiple patterns
npx playwright test --grep "login|signup"

# ✅ Exclude tests by pattern
npx playwright test --grep-invert "slow"
```

### Other Commands

```bash
npx playwright test --debug            # Debug mode (step through)
npx playwright test --headed           # See browser
npx playwright test --trace on         # Enable tracing
npx playwright test --project=mobile   # Run specific project
npx playwright codegen                 # Record tests
```

## Partial String Matching (CRITICAL for Robustness)

**Always use partial/pattern matching instead of exact strings** to reduce maintenance:

```typescript
// ❌ FRAGILE: Exact string matches break easily
await expect(page.getByText("Welcome to Our Application!")).toBeVisible();
await expect(page.getByRole("button", { name: "Submit Form" })).toBeVisible();
await expect(notification).toHaveText("Your account has been created successfully.");

// ✅ ROBUST: Partial matches survive copy changes
await expect(page.getByText(/welcome/i)).toBeVisible();
await expect(page.getByRole("button", { name: /submit/i })).toBeVisible();
await expect(notification).toContainText("account");
await expect(notification).toContainText(/created/i);

// ✅ ROBUST: Use toContainText over toHaveText
await expect(page.locator(".message")).toContainText("success");

// ✅ ROBUST: Pattern matching for dynamic content
await expect(page.getByText(/order #\d+/i)).toBeVisible();
await expect(page.getByText(/\d+ items? in cart/i)).toBeVisible();
```

**Why Partial Matching:**
- ✅ Survives minor copy/text changes
- ✅ Works across locales (case-insensitive)
- ✅ Less brittle to whitespace changes
- ✅ Easier to maintain long-term
- ❌ Exact matches break on punctuation, capitalization, or wording tweaks
