---
name: harness-lint
description: Use when working in this repository after receiving recurring coding feedback, adding or reviewing durable lint guardrails from AGENTS.md, updating Rules/*.md, or finishing changes that should be checked by harness-lint.
---

# Harness Lint

Use harness-lint to turn recurring repository feedback into executable or reviewable rules.

## Workflow

1. Run commands from the repository root.
2. Use `harness-lint` if it is on `PATH`; otherwise use `/Users/ctrdh/Code/harness-lint/target/debug/harness-lint` on this machine.
3. When the user gives a recurring coding preference, create or update a rule under `Rules/` instead of only changing the current code.
4. Rules must use GritQL for executable checks. If the preference needs cross-file state, changed-file path ownership, human review, or richer semantics than a stable GritQL pattern can provide, keep it as `status: draft`.
5. Do not delete, disable, or weaken rules to make a task pass unless the user explicitly asks for that.
6. Before finishing code changes, run `harness-lint check --changed` and report any diagnostics.
7. Use `harness-lint rule list` after changing rule configuration.

## Project Sources

- `AGENTS.md` is the source for durable repository workflow and coding constraints.
- `harness.toml` configures local rules and external packs.
- `harness.lock` records installed pack revisions.
- `.harness/` is generated cache and must stay uncommitted.
