---
id: typescript.no-explicit-any
title: Avoid explicit any
language: typescript
level: warn
status: warn
tags: [typescript, typing]
---

# Avoid explicit any

Prefer `unknown`, generics, discriminated unions, or domain types over `any`.

This local override keeps the rule scoped to TypeScript type syntax. The upstream pack's bare-token pattern also matched Go's predeclared `any` alias.

```grit
language js
or {
  `: any`,
  `as any`,
  `<any>`,
  `Array<any>`,
  `Promise<any>`,
  `Record<$key, any>`,
  `$name<any>`
}
```

## Bad

```ts
function serialize(value: any) {
  return JSON.stringify(value);
}
```

## Good

```ts
function serialize(value: UserEvent) {
  return JSON.stringify(value);
}
```
