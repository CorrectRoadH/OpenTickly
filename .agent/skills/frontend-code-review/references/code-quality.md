# Rule Catalog — Code Quality

## Tailwind-first styling

IsUrgent: True
Category: Code Quality

### Description

Favor Tailwind CSS utility classes instead of adding new `.module.css` files unless a Tailwind combination cannot achieve the required styling. Keeping styles in Tailwind improves consistency and reduces maintenance overhead.

Update this file when adding, editing, or removing Code Quality rules so the catalog remains accurate.

## Classname ordering for easy overrides

### Description

When writing components, always place the incoming `className` prop after the component’s own class values so that downstream consumers can override or extend the styling. This keeps your component’s defaults but still lets external callers change or remove specific styles.

Example:

```tsx
import { cn } from '@/utils/classnames'

const Button = ({ className }) => {
  return <div className={cn('bg-primary-600', className)}></div>
}
```
