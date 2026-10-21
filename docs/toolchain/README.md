# JavaScript and TypeScript toolchain

Vite+ is pinned to 1.3.0 in the workspace catalog and build images. The underlying package manager remains pnpm 10.32.1, with one workspace lockfile. CI installs dependencies with `vp install --frozen-lockfile`; it must not regenerate dependency resolution during a build.

Run commands from the repository root:

| Command | Scope |
| --- | --- |
| `vp install --frozen-lockfile` | Install the workspace from its lockfile |
| `vp run check` | Generate framework types and Worker content, then run formatting, lint, type checks and package checks |
| `vp run test:unit` | Generate Worker content and run the root Vitest suite |
| `vp run test` | Unit and package tests, including browser tests that require a running backend |
| `vp run build` | Build workspace packages in dependency order, including React Router/Fumadocs and the website PWA |
| `vp run test:e2e:website` | Browser suite against the configured real application |
| `vp run test:cli` | CLI integration suite against the configured real application |

`vp check`, `vp test` and `vp build` are built-in commands. They do not run the corresponding project scripts. Runner options precede the task name: use `vp run -r build`, not `vp run build -r`. Pass task arguments directly after the task name, e.g. `vp run test:e2e:website e2e/app-shell.spec.ts --workers=1`; an extra `--` is forwarded to Playwright and can prevent its options from being parsed. Package-specific framework commands run through `vp exec`; Node scripts use `vp exec node` so they also work with the project-local CLI.

`generate:checks` makes a clean checkout ready for static analysis. React Router route types and Worker announcement content must exist before type checking. Generated files stay owned by their generators. Vitest v5 uses `@testing-library/jest-dom/vitest` type augmentation. The migrated `clearMocks: false` settings preserve previous mock-history behavior.

Database, browser and CLI acceptance remain uncached. `vp run check` and `vp run test:unit` do not prove that these runtime flows passed. CI runs the same static, unit and build entrypoints as local development, with separate existing jobs for backend, browser and CLI acceptance.

Docker build stages use the pinned Vite+ image and frozen installs. Runtime images keep their existing deployment behavior; the landing runtime installs only its static server, without the development toolchain.
