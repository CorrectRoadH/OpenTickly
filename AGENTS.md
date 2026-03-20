# Code Quality Standards

Always apply these standards to all code you write.

## Local Development Runtime

Local development must run source processes directly from the repository root.

- Do not use `docker compose` as the default local development workflow.
- Start the frontend from the repository root with `vp run website#dev`.
- Start the backend from the repository root with `go run ./apps/api/cmd/api`.
- Local development environment variables must live at the repository root, not under `apps/website`, `apps/api`, or ad hoc shell wrappers.
- Documented local development env variables belong in root-level env files such as `.env.example` and `.env.local`.
- When local development needs additional entry points, add them to the root toolchain surface such as root `package.json`, `vp`, or a checked-in Go CLI entrypoint.
- Do not add root-level `scripts/*.sh` files as local development wrappers.
- `docker compose` is reserved for self-hosted packaging, deployment rehearsal, and release-style smoke verification, not day-to-day local source development.
- If a change affects how developers boot the app locally, update this file with root-run commands and root-level env expectations in the same change.

## Documentation Is The Source Of Truth

This repository is implemented from `docs/` and `openapi/`.

- Product behavior, API shape, page semantics, architecture boundaries, and testing expectations must match the definitions in `docs/` and `openapi/`.
- The goal is not "reasonable behavior" or "close enough". The goal is implementation that matches the documented definition.
- Before making changes, read the relevant files under `docs/core/`, `docs/product/`, and `openapi/`, then implement against those definitions.
- If documentation already defines the behavior, do not invent a local interpretation, simplify it, or replace it with a "better" implementation.

## Documentation Change Rules

Documentation is not allowed to drift to fit the current implementation.

- If implementation and docs differ, fix the implementation to match the docs by default.
- If you discover the docs are incomplete, ambiguous, or missing implementation context, add clarification at the corresponding documentation location.
- Clarifications must be additive. Do not rewrite, weaken, or silently change the original documented requirement just to make the current implementation pass.
- If a documented rule needs to change, treat that as an explicit documentation change request, not an implementation convenience.
- Never use doc edits to hide code drift, architecture drift, or low-quality implementation decisions.

## Drift Handling

When reviewing or implementing code:

- If code does not match documented behavior, change the code.
- If code quality does not match documented structure expectations, change the code.
- If dependencies are not one-way as documented, change the code.
- If module boundaries, file ownership, or layer responsibilities drift from the docs, change the code.
- If naming, shape, or API contracts differ from the docs or OpenAPI, change the code.

## Reuse Before Creating

Before writing new code, analyze existing utilities, components, hooks, helpers and tests:

1. **Search first** — grep/glob for similar functionality before implementing
2. **Extend if close** — if something exists that's 80% of what you need, extend it
3. **Extract if duplicating** — if you're about to copy-paste, extract to shared module instead

## File Size & Organization

Keep files between **200-300 lines max**. If a file exceeds this:

1. **Split by responsibility** — one module = one concern
2. **Extract sub-components** — UI pieces that can stand alone should
3. **Separate logic from presentation** — hooks/utils in their own files
4. **Group by feature** — co-locate related files, not by type

Signs a file needs splitting:
- Multiple unrelated exports
- Scrolling to find what you need
- "Utils" file becoming a junk drawer
- Component doing data fetching + transformation + rendering

## Code Style

1. Prefer writing clear code and use inline comments sparingly
2. Document methods with block comments at the top of the method
3. Use Conventional Commit format

## Test To Verify Functionality

If you didn't test it, it doesn't work.

Verify written code by:
- Running unit tests
- Running end to end tests
- Checking for type errors
- Checking for lint errors
- Smoke testing and checking for runtime errors with Playwright
- Taking screenshots and verifying the UI is as expected

## Verification Against Docs

A task is not complete unless both of these are true:

- The implementation passes the required checks and tests.
- The implementation still matches the relevant definitions in `docs/` and `openapi/`.

Passing tests does not justify behavior that differs from the docs.
