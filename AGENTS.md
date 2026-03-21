# Code Quality Standards

Always apply these standards to all code you write.

## Local Development Runtime

Local development must run source processes directly from the repository root.

- Do not use `docker compose` as the default local development workflow.
- Start the frontend from the repository root with `vp run website#dev`.
- Start the backend from the repository root with `air`.
- Local development environment variables must live at the repository root, not under `apps/website`, `apps/backend`, or ad hoc shell wrappers.
- Documented local development env variables belong in root-level env files such as `.env.example` and `.env.local`.
- Root `.env.local` is required for source-based local development. `.env.local.example` is only a template and is not itself a runnable local-development env file.
- The backend local-development path must require explicit datasource configuration from env. If the datasource env is missing, backend startup must fail immediately.
- The default local backend runtime must connect to real dependencies started outside the app process. It must not silently fall back to in-memory stores, placeholder runtime state, or fabricated dependency defaults.
- PostgreSQL schema management must use `pgschema` as the single canonical path. Do not introduce a second long-lived migration/schema toolchain or runtime auto-migrate path.
- Backend hot reload configuration must live at the repository root in `.air.toml`; do not duplicate `air` config under `apps/backend` or ad hoc shell wrappers.
- When local development needs additional entry points, add them to the root toolchain surface such as root `package.json`, `vp`, or a checked-in Go CLI entrypoint.
- Root toolchain entrypoints are for source-based local development workflows. Do not add wrapper CLIs around native deployment/runtime tools when the underlying tool is already the canonical interface; if `air` is the canonical backend dev runtime, do not wrap it behind duplicate shell or Node entrypoints.
- Do not add root-level `scripts/*.sh` files as local development wrappers.
- `docker compose` is reserved for self-hosted packaging, deployment rehearsal, and release-style smoke verification, not day-to-day local source development.
- Self-hosted runtime commands should be documented and executed directly with `docker compose` and other native runtime commands, not wrapped behind `pnpm`, Node, or ad hoc helper CLIs.
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
- Structural cleanup, technical debt reduction, and runtime/developer-entrypoint simplification take priority over adding more product surface on top of a drifting foundation.
- If structure and feature work compete, fix the structure first and only then continue expanding functionality.

## Code Principles

Code in this repository must be one-way.

- One responsibility: a module, function, script, or file should have one clear job. If one unit is doing multiple unrelated jobs, split it.
- One canonical path: for any repeated developer action or runtime behavior, there must be exactly one documented default way to do it.
- One canonical name: inside the codebase, one concept should have one preferred name. Do not keep multiple internal names for the same thing.
- One canonical implementation: do not keep two active implementations, routes, adapters, helpers, or script entrypoints that do the same job.
- Best-practice only: when multiple implementation patterns are possible, keep the strongest one that matches the architecture and remove weaker transitional variants.
- Compat only at boundaries: backward compatibility is allowed only at explicit external boundaries such as public APIs, imported contracts, or migration seams. Compatibility aliases must not leak into domain, application, or normal internal developer workflows.
- No internal aliases: do not add “legacy”, “compat”, “old”, “transition”, or duplicate wrapper names for internal codepaths when a canonical path already exists.
- No parallel entrypoints: if two scripts or commands start, build, test, generate, or verify the same thing, choose one canonical entrypoint and delete the duplicate.
- No placeholder normalization: placeholder, transitional, fake-runtime, or temporary paths must be tracked as debt with an exit condition; they must not become the default implementation.
- Insert structural cleanup: if a task reveals duplicate paths, duplicate names, duplicate implementations, or non-one-way dependencies, structural cleanup becomes the immediate priority before more feature expansion.

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

## TDD Policy

Use TDD for behavior changes.

- TDD is required for new product functionality, bug fixes, and behavior changes where the task changes what the software does.
- TDD must not be used for documentation-only changes, plan-only changes, infra/config/bootstrap/documentation cleanup, mechanical renames, generated-code refreshes, or structural refactors that do not intentionally change behavior.
- Startup wiring, env loading, bootstrap config parsing, dev-runtime entrypoint changes, readiness plumbing, and similar runtime/infrastructure setup work must not be driven by TDD-style config/unit tests when a direct startup check, smoke run, or targeted runtime verification is the stronger proof.
- Schema-management changes must be verified with `pgschema` plan/apply evidence and runtime startup/readiness evidence, not only unit tests.
- Do not force red-green-refactor onto changes whose purpose is clarifying docs, tightening operational rules, or removing drift in configuration and repository structure.
- If an infra or structural change also fixes a real bug or changes runtime behavior, treat the behavior-changing part as a bug/feature change and use TDD for that part.

## Test To Verify Functionality

If you didn't test it, it doesn't work.

Verify written code by:

- Running unit tests
- Running end to end tests
- Checking for type errors
- Checking for lint errors
- Smoke testing and checking for runtime errors with Playwright
- Taking screenshots and verifying the UI is as expected

Non-TDD work still requires verification proportional to the change.

- Not requiring TDD does not mean "no verification".
- Documentation-only changes should be checked for internal consistency and affected reference updates.
- Infra/config/bootstrap/runtime changes should be verified with the relevant commands, startup checks, readiness checks, smoke checks, or other direct runtime evidence needed to prove the change.
- Purely mechanical or structural refactors should run the narrowest checks that prove no behavior regressed.
- Do not add low-signal tests for documentation-only changes just to satisfy a ritual. Add or run tests when they prove behavior, compatibility, or runtime safety.
- Do not add low-signal unit tests that only restate env mapping, default-value wiring, bootstrap field copying, or other configuration trivia when the real question is whether the process starts correctly against the intended dependencies.

## Verification Against Docs

A task is not complete unless both of these are true:

- The implementation passes the required checks and tests.
- The implementation still matches the relevant definitions in `docs/` and `openapi/`.

Passing tests does not justify behavior that differs from the docs.
