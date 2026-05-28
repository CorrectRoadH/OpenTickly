---
id: local.frontend-dialog-state-locality
title: Keep transient dialog form state local
language: typescript
level: warn
status: draft
tags: [local, react, performance]
---

# Keep transient dialog form state local

Dialog and popover fields that only matter while the overlay is open should live inside that overlay. Do not lift `[name, setName]`, `[email, setEmail]`, selected color, toggle, or step state into pages or shells unless the parent genuinely reacts to mid-edit values.

```grit
// TODO: Add GritQL when a reliable React component shape is identified. The rule needs to distinguish durable parent state from transient overlay fields.
```

## Bad

```tsx
function Page() {
  const [email, setEmail] = useState("");
  return <InviteDialog email={email} onEmailChange={setEmail} />;
}
```

## Good

```tsx
function Page() {
  return <InviteDialog onSubmit={(values) => mutate(values)} />;
}
```
