---
id: typescript.no-explicit-any
title: 避免 TypeScript 显式 any
language: typescript
level: warn
status: warn
tags: [typescript, typing]
---

# 避免 TypeScript 显式 any

优先使用 `unknown`、泛型、可辨识联合类型或领域类型，不要直接使用 `any`。

这个本地覆盖规则把检查范围收窄到 TypeScript 类型语法。上游 pack 的裸 token pattern 会同时匹配 Go 的预声明 `any` alias。

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
