---
name: vite-plus
description: Use when working in this repository and needing package management, development, build, lint, test, formatting, or JS tool execution through the Vite+ toolchain.
---

# Vite Plus

Use `vp` as the unified toolchain for this repo.

## Rules

- Do not use `pnpm`, `npm`, or `yarn` directly. Use `vp` wrappers instead.
- Do not run wrapped tools directly. Use `vp test`, `vp lint`, `vp fmt`, `vp check`, `vp build`, and related `vp` commands.
- If a `package.json` script name collides with a built-in `vp` command, run it with `vp run <script>`.
- Use `vp dlx` for one-off binaries and `vp exec` for local `node_modules/.bin` binaries.
- Do not install `vitest`, `oxlint`, `oxfmt`, or `tsdown` directly; Vite+ provides them.
- Import tooling APIs from `vite-plus`, not `vite` or `vitest`.

## Common Commands

- `vp install`
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

Run `vp help` or `vp <command> --help` for details. Use `vp --version` when you need the wrapped toolchain version.

## Review Checklist

- Run `vp install` after pulling remote changes and before getting started.
- Run `vp check` and `vp test` to validate changes.
