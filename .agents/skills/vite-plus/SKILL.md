---
name: vite-plus
description: Use when working in this repository and needing package management, development, build, lint, test, formatting, or JS tool execution through the Vite+ toolchain.
---

# Vite Plus

Use `vp` as the unified JS/TS toolchain for this repo.

## Command Rules

- Do not run `pnpm`, `npm`, `yarn`, `vite`, `vitest`, or `playwright` directly from the agent shell. Use `vp` wrappers instead.
- Do not run wrapped tools directly. Use `vp test`, `vp lint`, `vp fmt`, `vp check`, `vp build`, `vp exec`, and related `vp` commands.
- If a `package.json` script name collides with a built-in `vp` command, run it with `vp run <script>`.
- Use `vp dlx` for one-off binaries and `vp exec` for local `node_modules/.bin` binaries.
- Do not install `vitest`, `oxlint`, `oxfmt`, or `tsdown` directly; Vite+ provides them.
- Prefer `vite-plus` config APIs for Vite+ managed package configs. Keep framework-owned config imports when the framework requires them, such as React Router's Vite plugin or Playwright's config API.

## Common Commands

- `vp install`
- `vp install --lockfile-only`
- `vp dev`
- `vp check`
- `vp lint`
- `vp fmt`
- `vp test`
- `vp build`
- `vp preview`
- `vp add <pkg>`
- `vp remove <pkg>`
- `vp update`
- `vp outdated -r --long`
- `vp run website#build`
- `vp run update-worker#test`

Run `vp --help` or `vp <command> --help` for details. Use `vp --version` when you need the wrapped toolchain version.

## Review Checklist

- Run `vp install` after pulling remote changes or changing lock-sensitive dependency state.
- Run `vp check` before finishing JS/TS changes.
- Run targeted tests for changed packages, such as `vp run update-worker#test`.
- Run `vp run website#build` after dependency, OpenAPI client, React Compiler, PWA, or chunking changes.
