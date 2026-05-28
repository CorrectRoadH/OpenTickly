---
id: python.no-broad-object-type
title: Avoid broad object types
language: python
level: warn
status: warn
tags: [python, typing]
---

# Avoid broad object types

Prefer concrete models, explicit unions, protocols, or typed boundary objects. Use `object` only for true opaque interop boundaries.

This local override keeps the rule scoped to Python annotation syntax. The upstream pack's bare-token pattern also matched TypeScript's `object` type.

```grit
language python
or {
  `$name: object`,
  `-> object`,
  `list[object]`,
  `dict[$key, object]`
}
```

## Bad

```python
def serialize(value: object) -> dict[str, object]:
    return {"value": value}
```

## Good

```python
def serialize(value: UserEvent) -> SerializedEvent:
    return SerializedEvent(value=value.name)
```
