---
id: python.no-broad-object-type
title: 避免 Python 宽泛 object 类型
language: python
level: warn
status: warn
tags: [python, typing]
---

# 避免 Python 宽泛 object 类型

优先使用具体模型、显式联合类型、协议或类型化边界对象。只有真正不透明的互操作边界才使用 `object`。

这个本地覆盖规则把检查范围收窄到 Python annotation 语法。上游 pack 的裸 token pattern 会同时匹配 TypeScript 的 `object` 类型。

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
