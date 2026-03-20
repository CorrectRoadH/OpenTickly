# Implementation Task Generation

Transform the completed PRD into simple, concise, actionable and verifiable implementation tasks in JSON format. This creates a comprehensive task list for developers (human or AI) to build and verify the product.

## When to Use

After completing PRD creation, ask the user:
"Your PRD is complete. Would you like me to generate implementation tasks? I'll create a comprehensive JSON task list that breaks down all features into verifiable development work."

Only proceed after user confirmation.

## Task Generation Workflow

You should read the PRD markdown file located in `PROJECT_ROOT/.agent/prd/PRD.md`.
Each task in the PRD will have a unique ID, formatted as `TASK-${ID}`.
You should use this ID to generate the task list.

Copy and track progress:

```
Task Generation Progress:
- [ ] Analyze the complete PRD
- [ ] Generate task index in `PROJECT_ROOT/.agent/tasks.json`
- [ ] Generate detailed spec for each task in `PROJECT_ROOT/.agent/tasks/TASK-${ID}.json`
- [ ] Present complete task list to user for review
```

## Root task list format

Each task must follow this exact structure:

```json:PROJECT_ROOT/.agent/tasks.json
{
  "id": "TASK-${ID}",
  "title": "Clear, concise title of the task",
  "category": "category-name",
  "specFilePath": ".agent/tasks/TASK-${ID}.json",
  "passes": false
}
```

**Field Requirements:**

- `id`: Unique identifier for the task, formatted as `TASK-${ID}`
- `title`: A title that gives a high level overview of the task
- `category`: Classification of task type (see categories below)
- `title`: A title that gives a high level overview of the task.
- `specFilePath`: Path to the individual task specification file, formatted as `PROJECT_ROOT/.agent/tasks/TASK-${ID}.json`
- `passes`: Always initialize to `false` - only developers update this after completion

## Individual JSON Task Format

Each task specification file provides comprehensive details for implementation. This is where the real detail lives - the root `tasks.json` is just an index.

```json:PROJECT_ROOT/.agent/tasks/TASK-${ID}.json
{
  "id": "TASK-${ID}",
  "title": "Clear, concise title of the task",
  "category": "category-name",
  "description": "In-depth specification including expected behavior, user flow, and output",
  "acceptanceCriteria": [
    "List of specific, verifiable conditions that must be true when task is complete",
  ],
  "steps": [
    // List of complete steps to complete the task
    {
      "step": 1,
      "description": "Short description of what to do",
      "details": "Detailed explanation of HOW to do it, including specific code, commands, or techniques",
      "pass": false
    },
    // ... continue until you cover all steps in the task
  ],
  "dependencies": ["TASK-${ID1}", "TASK-${ID2}", ...], // List of task IDs that must be completed before this task
  "estimatedComplexity": "medium", // One of: "low", "medium", "high", "very high"
  "technicalNotes": [
    "List of technical notes, implementation hints, or technical constraints developers should know",
  ]
}
```

### Required Fields

| Field                | Type                  | Description                                                                     |
| -------------------- | --------------------- | ------------------------------------------------------------------------------- |
| `id`                 | string                | Unique identifier, formatted as `TASK-${ID}`                                    |
| `title`              | string                | High-level overview of the task (same as in tasks.json)                         |
| `category`           | string                | Classification of task type (see categories below)                              |
| `description`        | string                | In-depth specification including expected behavior, user flow, and output       |
| `acceptanceCriteria` | array of strings      | List of specific, verifiable conditions that must be true when task is complete |
| `steps`              | array of step objects | Sequential implementation steps (see step format below)                         |

### Optional Fields

| Field                 | Type             | Description                                                                      |
| --------------------- | ---------------- | -------------------------------------------------------------------------------- |
| `dependencies`        | array of strings | Task IDs that must be completed before this task (e.g., `["TASK-5", "TASK-12"]`) |
| `estimatedComplexity` | string           | One of: `"low"`, `"medium"`, `"high"`, `"very high"` - helps with planning       |
| `technicalNotes`      | array of strings | Implementation hints, gotchas, or technical constraints developers should know   |

### Step Object Format

Each step in the `steps` array must be an object with these fields:

```json
{
  "step": 1,
  "description": "Short description of what to do",
  "details": "Detailed explanation of HOW to do it, including specific code, commands, or techniques",
  "pass": false
}
```

| Field         | Type    | Description                                                                          |
| ------------- | ------- | ------------------------------------------------------------------------------------ |
| `step`        | number  | Sequential step number (1, 2, 3...)                                                  |
| `description` | string  | Brief summary of the step (what to do)                                               |
| `details`     | string  | Comprehensive implementation guidance (how to do it)                                 |
| `pass`        | boolean | Always initialize to `false` - only update to `true` after step is verified complete |

### Writing Good Acceptance Criteria

Acceptance criteria define WHAT must be true when the task is done. They should be:

- **Specific**: "Button shows loading spinner while API call is in progress"
- **Verifiable**: Can be checked with a clear yes/no answer
- **Independent**: Each criterion stands alone
- **Complete**: Together they fully define "done"

**Good acceptance criteria:**
```json
"acceptanceCriteria": [
  "Login form validates email format before submission",
  "Invalid email shows error message 'Please enter a valid email'",
  "Submit button is disabled while form is invalid",
  "Successful login redirects to /dashboard",
  "Failed login shows error message from API response"
]
```

**Bad acceptance criteria:**
```json
"acceptanceCriteria": [
  "Login works correctly",
  "Form validation is good",
  "Handles errors properly"
]
```

### Writing Good Steps

Steps define HOW to implement the task. They should be:

- **Sequential**: Each step builds on the previous
- **Detailed**: Include specific code patterns, function names, file paths
- **Atomic**: Each step is a single, focused piece of work
- **Trackable**: The `pass` field lets developers mark progress

**Good steps:**
```json
"steps": [
  {
    "step": 1,
    "description": "Create the LoginForm component file",
    "details": "Create src/components/LoginForm.tsx with a functional component that accepts onSubmit and onError props. Use React Hook Form for form state management.",
    "pass": false
  },
  {
    "step": 2,
    "description": "Add email validation",
    "details": "Use zod schema to validate email format. Schema should check for: non-empty, valid email regex, max 255 characters. Display validation error below input field.",
    "pass": false
  }
]
```

**Bad steps:**
```json
"steps": [
  {
    "step": 1,
    "description": "Build the form",
    "details": "Create the login form",
    "pass": false
  }
]
```

### Using Dependencies

The `dependencies` field helps establish task order and prevents starting work before prerequisites are complete.

```json
"dependencies": ["TASK-5", "TASK-12"]
```

Use dependencies when:
- A task requires functionality from another task
- A task builds on data structures defined elsewhere
- A task needs UI components created in another task

### Using Technical Notes

Technical notes capture implementation knowledge that isn't obvious from the description or steps.

```json
"technicalNotes": [
  "Bash associative arrays require declare -A and Bash 4.0+",
  "Use $(date +%s) for timestamp tracking",
  "This function is called from a subshell, so it cannot modify parent variables directly"
]
```

Include notes about:
- Language/framework version requirements
- Non-obvious gotchas or edge cases
- Performance considerations
- Security implications
- Links to relevant documentation

## Task Categories

Organize tasks into these categories. All examples use the full task spec format with step objects.

> **IMPORTANT**: Examples below show 2 steps for brevity. Real tasks should include ALL steps needed to complete the task - typically 3-10 steps depending on complexity. Never truncate steps to fit a pattern.

**1. functional** - Core feature implementation and behavior

```json
{
  "id": "TASK-1",
  "title": "User can create an account with email and password",
  "category": "functional",
  "description": "Implement user registration flow allowing new users to create accounts using email and password credentials.",
  "acceptanceCriteria": [
    "Registration form accepts email and password",
    "Email validation prevents invalid formats",
    "Password must be at least 8 characters",
    "Success message displayed after registration",
    "User can log in with new credentials immediately"
  ],
  "steps": [
    {
      "step": 1,
      "description": "Create registration API endpoint",
      "details": "Create POST /api/auth/register endpoint that accepts email and password in request body. Validate inputs, hash password with bcrypt, store in users table, return success response.",
      "pass": false
    },
    {
      "step": 2,
      "description": "Build registration form component",
      "details": "Create RegistrationForm component with email and password fields. Use React Hook Form for validation. Show inline errors for invalid inputs.",
      "pass": false
    }
  ],
  "dependencies": [],
  "estimatedComplexity": "medium"
}
```

**2. ui-ux** - User interface and experience requirements

```json
{
  "id": "TASK-2",
  "title": "Dashboard displays user's recent activity in a card layout",
  "category": "ui-ux",
  "description": "Show user's recent activity on the dashboard using a responsive card layout that works on desktop and mobile.",
  "acceptanceCriteria": [
    "Activity cards display on dashboard after login",
    "Cards show activity type, timestamp, and status",
    "Layout is responsive - stacks on mobile, grid on desktop",
    "Empty state shown when no activity exists"
  ],
  "steps": [
    {
      "step": 1,
      "description": "Create ActivityCard component",
      "details": "Create src/components/ActivityCard.tsx that accepts activity object as prop. Display type icon, formatted timestamp (use date-fns), and status badge with appropriate color.",
      "pass": false
    },
    {
      "step": 2,
      "description": "Implement responsive grid layout",
      "details": "Use CSS Grid with grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)) for responsive behavior. Add gap of 1rem between cards.",
      "pass": false
    }
  ],
  "estimatedComplexity": "low"
}
```

**3. data-model** - Database schema, data structures, and relationships

```json
{
  "id": "TASK-3",
  "title": "User profile table with required fields and relationships",
  "category": "data-model",
  "description": "Create users table with proper schema, constraints, and relationships to support authentication and profile features.",
  "acceptanceCriteria": [
    "Users table exists with: id, email, name, avatar_url, created_at",
    "Email field has unique constraint",
    "Foreign key relationship to auth table exists",
    "Indexes exist on email and created_at fields"
  ],
  "steps": [
    {
      "step": 1,
      "description": "Create users table migration",
      "details": "Create migration file with CREATE TABLE users statement. Include columns: id (UUID primary key), email (VARCHAR 255 UNIQUE NOT NULL), name (VARCHAR 255), avatar_url (TEXT), created_at (TIMESTAMP DEFAULT NOW()).",
      "pass": false
    },
    {
      "step": 2,
      "description": "Add indexes for query performance",
      "details": "Add CREATE INDEX statements for email (for login lookups) and created_at (for sorting). Use btree index type.",
      "pass": false
    }
  ],
  "technicalNotes": [
    "Use UUID v4 for primary keys to avoid sequential ID enumeration"
  ],
  "estimatedComplexity": "low"
}
```

**4. api-endpoint** - Backend API endpoints and responses

```json
{
  "id": "TASK-4",
  "title": "POST /api/auth/login endpoint authenticates users",
  "category": "api-endpoint",
  "description": "Implement login endpoint that validates credentials and returns JWT token for authenticated sessions.",
  "acceptanceCriteria": [
    "Endpoint accepts POST with email and password",
    "Valid credentials return 200 with JWT token",
    "Token contains user ID and email claims",
    "Invalid credentials return 401 with error message"
  ],
  "steps": [
    {
      "step": 1,
      "description": "Create login route handler",
      "details": "Create POST /api/auth/login handler. Extract email and password from request body. Query users table for matching email. Compare password hash using bcrypt.compare().",
      "pass": false
    },
    {
      "step": 2,
      "description": "Implement JWT token generation",
      "details": "Use jsonwebtoken library to sign token with user ID and email as payload. Set expiration to 24h. Use RS256 algorithm with private key from environment variable.",
      "pass": false
    }
  ],
  "dependencies": ["TASK-3"],
  "technicalNotes": [
    "Never log passwords, even in error cases",
    "Use constant-time comparison for password to prevent timing attacks"
  ],
  "estimatedComplexity": "medium"
}
```

**5. integration** - Third-party service integrations and external dependencies

```json
{
  "id": "TASK-5",
  "title": "Stripe payment processing integration works end-to-end",
  "category": "integration",
  "description": "Integrate Stripe for payment processing including checkout flow, webhook handling, and order status updates.",
  "acceptanceCriteria": [
    "Checkout creates Stripe PaymentIntent",
    "User can complete payment with test card",
    "Webhook receives payment.succeeded event",
    "Order status updates to 'paid' on success"
  ],
  "steps": [
    {
      "step": 1,
      "description": "Set up Stripe SDK and API keys",
      "details": "Install @stripe/stripe-js and stripe packages. Add STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY to environment. Create stripe client instance in lib/stripe.ts.",
      "pass": false
    },
    {
      "step": 2,
      "description": "Implement webhook handler",
      "details": "Create POST /api/webhooks/stripe endpoint. Verify webhook signature using stripe.webhooks.constructEvent(). Handle payment_intent.succeeded event to update order status.",
      "pass": false
    }
  ],
  "dependencies": ["TASK-3", "TASK-4"],
  "technicalNotes": [
    "Always verify webhook signatures to prevent spoofed events",
    "Test with Stripe CLI: stripe listen --forward-to localhost:3000/api/webhooks/stripe"
  ],
  "estimatedComplexity": "high"
}
```

**6. security** - Security features, authentication, authorization

```json
{
  "id": "TASK-6",
  "title": "API endpoints enforce role-based access control",
  "category": "security",
  "description": "Implement middleware that enforces role-based access control on protected API endpoints.",
  "acceptanceCriteria": [
    "Admin endpoints return 403 for regular users",
    "Endpoints without auth token return 401",
    "JWT signature is validated on every request",
    "Expired tokens are rejected with 401"
  ],
  "steps": [
    {
      "step": 1,
      "description": "Create auth middleware",
      "details": "Create middleware/auth.ts that extracts Bearer token from Authorization header, verifies JWT signature, attaches decoded user to request object. Return 401 if token missing or invalid.",
      "pass": false
    },
    {
      "step": 2,
      "description": "Create role-checking middleware",
      "details": "Create middleware/requireRole.ts that accepts required role as parameter. Check req.user.role against required role, return 403 if insufficient permissions.",
      "pass": false
    }
  ],
  "dependencies": ["TASK-4"],
  "technicalNotes": [
    "Log failed auth attempts for security monitoring",
    "Consider rate limiting on auth endpoints to prevent brute force"
  ],
  "estimatedComplexity": "medium"
}
```

**7. documentation** - Technical documentation, API docs, user guides

```json
{
  "id": "TASK-7",
  "title": "API documentation covers all endpoints with examples",
  "category": "documentation",
  "description": "Create comprehensive API documentation using OpenAPI/Swagger that covers all endpoints with request/response examples.",
  "acceptanceCriteria": [
    "All endpoints documented in OpenAPI spec",
    "Each endpoint has description, parameters, and responses",
    "Interactive docs accessible at /api/docs",
    "Authentication flow clearly documented"
  ],
  "steps": [
    {
      "step": 1,
      "description": "Set up OpenAPI documentation",
      "details": "Install swagger-jsdoc and swagger-ui-express. Create openapi.config.ts with API info, servers, and security schemes. Add JSDoc comments to route handlers.",
      "pass": false
    },
    {
      "step": 2,
      "description": "Document authentication endpoints",
      "details": "Add OpenAPI annotations to /api/auth/register and /api/auth/login. Include request body schemas, response schemas for success and error cases, and example values.",
      "pass": false
    }
  ],
  "estimatedComplexity": "low"
}
```

## Task Generation Guidelines

### Be Comprehensive

Generate tasks that cover the entire PRD. Break down every feature into small, manageable tasks.
Keep the main task list JSON concise and go into detail in the individual task files.

**Example**: For "User Authentication" feature, generate tasks for:
- User table schema
- Registration endpoint
- Login endpoint
- Password reset endpoint
- JWT token generation
- Session management
- Registration UI
- Login UI
- Password reset UI
- Security testing (password hashing, rate limiting)
- Unit tests for all auth functions
- End to end tests for auth flow

### Make Steps Verifiable

Each step must be:
- **Specific**: "Verify email field has unique constraint" not "Check database"
- **Actionable**: Can be executed by a developer
- **Measurable**: Has clear pass/fail criteria
- **Sequential**: Steps build on each other

**Good steps:**
```json
"steps": [
  {
    "step": 1,
    "description": "Create user via API",
    "details": "Send POST request to /api/users with valid data: { email: 'test@example.com', password: 'secure123', name: 'Test User' }",
    "pass": false
  },
  {
    "step": 2,
    "description": "Verify API response",
    "details": "Check response status is 201 and body contains user object with id, email, name (password should NOT be in response)",
    "pass": false
  },
  {
    "step": 3,
    "description": "Confirm database record",
    "details": "Query users table and verify record exists with matching email. Confirm password field contains bcrypt hash (starts with $2b$), not plaintext.",
    "pass": false
  }
]
```

**Bad steps:**
```json
"steps": [
  {
    "step": 1,
    "description": "Test the endpoint",
    "details": "Test it",
    "pass": false
  },
  {
    "step": 2,
    "description": "Make sure it works",
    "details": "Check everything is correct",
    "pass": false
  }
]
```

**Important:**

Acceptance criteria must be verifiable, not vague. "Works correctly" is bad. "Button shows confirmation dialog before deleting" is good.

For any story with UI changes: Always include "Verify in browser using playwright" as acceptance criteria. This ensures visual verification of frontend work.

**Important:**
End to end tests or unit tests are individual steps (verification criteria) in a task, but *CANNOT* be tasks themselves.

### Initialize All Tasks to `"passes": false`

**CRITICAL**: Never mark tasks as complete during generation. The `passes` field should ALWAYS be `false` initially.

> It is unacceptable to remove or edit items in the task list because this could lead to missing or buggy functionality

Only developers should update `passes: true` after verifying all steps are complete.

## Output Format

Save the complete task list as `PROJECT_ROOT/.agent/tasks.json`:

```json
[
  {
    "id": "TASK-${ID}",
    "title": "User table with authentication fields",
    "category": "data-model",
    "specFilePath": ".agent/tasks/TASK-${ID}.json",
    "passes": false
  },
  {
    "id": "TASK-${ID}",
    "title": "POST /api/auth/register creates new user account",
    "category": "api-endpoint",
    "specFilePath": ".agent/tasks/TASK-${ID}.json",
    "passes": false
  }
  // ... continue until you cover all features in the PRD
]
```

**Important:**
When outputting tasks, create them, sequentially. Output them one by one so the user can review each.
*DO NOT* output in parallel.
*DO NOT* use background agents.
*DO NOT* use subagents.

## After Generation

Present the tasks to the user:

"I've generated [NUMBER] implementation tasks based on your PRD, organized into [NUMBER] categories. These tasks provide a complete checklist for building and verifying every feature.

The tasks are saved in `PROJECT_ROOT/.agent/tasks.json`. Developers should:
1. Work through tasks in order (data-model → api-endpoint → ui-ux, etc.)
2. Complete all verification steps for each task
3. Only mark `passes: true` after all steps verified
4. Never remove or skip tasks

Would you like me to adjust the task breakdown or add more detail? Otherwise, I can save the tasks and move on to writing the overall description of the project and finalizing the process."

## Example: Complete Task Generation

For a simple "Todo List App" PRD with features: user auth, create/read/update/delete todos, mark complete, the task list should include approximately 40-60 tasks covering:

- User table schema (1 task)
- Todo table schema (1 task)
- Auth endpoints: register, login, logout (3 tasks)
- Todo CRUD endpoints (4 tasks)
- Auth UI: registration, login pages (2 tasks)
- Todo UI: list view, create form, edit form (3 tasks)
- User can only access their own todos (1 security task)
- OAuth integration with Google (2 integration tasks)
- API documentation (1 documentation task)

Note: Unit tests and E2E tests are verification steps within feature tasks, not separate tasks.

Generate similar comprehensive breakdowns for any PRD.
