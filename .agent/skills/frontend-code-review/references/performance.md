# Rule Catalog — Performance

## Complex prop memoization

IsUrgent: True
Category: Performance

### Description

Wrap complex prop values (objects, arrays, maps) in `useMemo` prior to passing them into child components to guarantee stable references and prevent unnecessary renders.

Update this file when adding, editing, or removing Performance rules so the catalog remains accurate.

Wrong:

```tsx
<HeavyComp
    config={{
        provider: ...,
        detail: ...
    }}
/>
```

Right:

```tsx
const config = useMemo(() => ({
    provider: ...,
    detail: ...
}), [provider, detail]);

<HeavyComp
    config={config}
/>
```
