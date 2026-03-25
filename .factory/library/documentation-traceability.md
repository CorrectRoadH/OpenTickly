# Documentation Traceability

Canonical rules for the inline source-doc status blocks required by this mission.

**What belongs here:** status-block schema, direct-doc rules, and consistency checks.
**What does NOT belong here:** feature-by-feature progress logs or ad hoc commentary.

---

- The direct source-doc set is closed and lives in mission `AGENTS.md`.
- A worker must not rely on a source doc outside that list unless the orchestrator expands the list first.
- Every listed source doc must contain exactly one active mission status block in the source file itself.
- Use this exact field schema:

```md
> Mission status
> Agent: <worker-name>
> Status: not-started | in-progress | partial | complete
> Current code differences: <doc-specific delta against current code>
> Todo: <remaining work or `none`>
> Fully implemented: yes | no
```

- `Todo: none` is valid only when there is no remaining mission work for that doc.
- `Fully implemented: yes` is valid only when the block no longer lists unresolved differences or todo items.
- Feature workers should update the blocks for the source docs they actively rely on; the final doc-audit feature verifies consistency across the entire closed set.
