# OpenToggl Docs Entry Point

Read the main line first. Do not start from `challenges/` or `upstream/`.

## Main Line

```text
core/product-definition
          |
          v
    product/*.md
          |
          +----------------------+
          |                      |
          v                      v
  refs: openapi/*.json       refs: figma
          |
          v
  core/domain-model
          |
          v
core/architecture-overview
      /        |        \
     v         v         v
backend-arch frontend-arch testing-strategy
```

How to read:

1. By default, start with `core/product-definition` and the corresponding `product/*.md`
2. The PRD will point to the relevant OpenAPI and Figma references
3. Only go back to OpenAPI / Figma when you need the exact implementation of an API or UI detail
4. `domain-model` defines the settled domain boundaries, object ownership, aggregate roots, and key invariants
5. Only read the backend/frontend architecture and testing docs when the requirement actually affects implementation structure

## Hard Dependencies

```text
Editing product-definition
  -> no upstream implementation dependency

Editing product/*.md
  -> first read core/product-definition

Editing domain-model
  -> first read core/product-definition
  -> then read the relevant product/*.md

Editing architecture-overview
  -> first read core/product-definition
  -> then read the relevant product/*.md
  -> then read core/domain-model

Editing backend-architecture
  -> first read core/product-definition
  -> then read the relevant product/*.md
  -> then read core/domain-model
  -> then read core/architecture-overview

Editing frontend-architecture
  -> first read core/product-definition
  -> then read the relevant product/*.md
  -> read the figma referenced by the PRD as needed
  -> then read core/architecture-overview

Editing testing-strategy
  -> first read core/product-definition
  -> then read the relevant product/*.md
  -> then read core/domain-model
  -> then read core/architecture-overview
  -> then read backend/frontend-architecture
```

Explanation:

- `domain-model` directly determines what boundaries, object ownership, aggregate roots, and invariants the backend should adopt.
- `backend-architecture` can only translate those constraints into code structure; it cannot invent or rewrite domain boundaries in reverse.
- If the change affects the exact definition of an API or UI, drill down further into the OpenAPI or Figma referenced by the corresponding PRD.

## Directory Responsibilities

- `core/`
  The current authoritative main line. Write conclusions, rules, boundaries, architecture, and implementation constraints here.
- `product/`
  PRDs split by feature. Responsible for referencing OpenAPI and Figma and supplementing feature details they do not cover.
- `challenges/`
  Open questions, disputes, and risks. Does not represent the current conclusion.
- `upstream/`
  Upstream material and evidence sources. Does not directly serve as the definition for this project.

## Key Documents

- [product-definition](./core/product-definition.md)
  Defines the product goals and the division of labor among PRD / OpenAPI / Figma.
- [domain-model](./core/domain-model.md)
  Defines the confirmed context partitioning, object ownership, aggregate roots, key invariants, and boundary constraints on implementation.
- [architecture-overview](./core/architecture-overview.md)
  System-level architectural blueprint.
- [backend-architecture](./core/backend-architecture.md)
  Backend modules, layering, transactions, collaboration, and code structure.
- [frontend-architecture](./core/frontend-architecture.md)
  Frontend pages, modules, state, and how APIs are wired up.
- [testing-strategy](./core/testing-strategy.md)
  Test layering, verification methods, and release gates.

## What to Read by Task

- Working on product scope, page semantics, user-visible behavior:
  [product-definition](./core/product-definition.md) -> corresponding `product/*.md`
- Working on domain boundaries, module ownership, object classification, transaction boundaries:
  [domain-model](./core/domain-model.md) -> [architecture-overview](./core/architecture-overview.md) -> [backend-architecture](./core/backend-architecture.md)
- Working on architecture, module boundaries, implementation structure:
  [architecture-overview](./core/architecture-overview.md) -> [codebase-structure](./core/codebase-structure.md) -> [backend-architecture](./core/backend-architecture.md) -> [frontend-architecture](./core/frontend-architecture.md) -> [testing-strategy](./core/testing-strategy.md)

## Rules

- `core/` records authoritative conclusions, not the brainstorming process.
- `product/` records product details, not implementation structure.
- `challenges/` and `upstream/` cannot override the main-line definitions in reverse.
- If a conclusion is already nailed down in a main-line doc, other docs should link to it rather than rewriting it.
