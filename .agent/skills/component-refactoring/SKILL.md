---
name: component-refactoring
description: Refactor high-complexity React components in frontend. Use when the user asks for code splitting, hook extraction, or complexity reduction, or when you come across a component that is too complex to understand and refactor it.
---

# Component Refactoring Skill

Refactor high-complexity React components with the patterns and workflow below.

## Core Refactoring Patterns

### Pattern 1: Extract Custom Hooks

**When**: Component has complex state management, multiple `useState`/`useEffect`, or business logic mixed with UI.

**Dify Convention**: Place hooks in a `hooks/` subdirectory or alongside the component as `use-<feature>.ts`.

```typescript
// ❌ Before: Complex state logic in component
const Configuration: FC = () => {
  const [modelConfig, setModelConfig] = useState<ModelConfig>(...)
  const [datasetConfigs, setDatasetConfigs] = useState<DatasetConfigs>(...)
  const [completionParams, setCompletionParams] = useState<FormValue>({})

  // 50+ lines of state management logic...

  return <div>...</div>
}

// ✅ After: Extract to custom hook
// hooks/use-model-config.ts
export const useModelConfig = (appId: string) => {
  const [modelConfig, setModelConfig] = useState<ModelConfig>(...)
  const [completionParams, setCompletionParams] = useState<FormValue>({})

  // Related state management logic here

  return { modelConfig, setModelConfig, completionParams, setCompletionParams }
}

// Component becomes cleaner
const Configuration: FC = () => {
  const { modelConfig, setModelConfig } = useModelConfig(appId)
  return <div>...</div>
}
```

### Pattern 2: Extract Sub-Components

**When**: Single component has multiple UI sections, conditional rendering blocks, or repeated patterns.

```typescript
// ❌ Before: Monolithic JSX with multiple sections
const AppInfo = () => {
  return (
    <div>
      {/* 100 lines of header UI */}
      {/* 100 lines of operations UI */}
      {/* 100 lines of modals */}
    </div>
  )
}

// ✅ After: Split into focused components
// app-info/
//   ├── index.tsx           (orchestration only)
//   ├── app-header.tsx      (header UI)
//   ├── app-operations.tsx  (operations UI)
//   └── app-modals.tsx      (modal management)

const AppInfo = () => {
  const { showModal, setShowModal } = useAppInfoModals()

  return (
    <div>
      <AppHeader appDetail={appDetail} />
      <AppOperations onAction={handleAction} />
      <AppModals show={showModal} onClose={() => setShowModal(null)} />
    </div>
  )
}
```

### Pattern 3: Simplify Conditional Logic

**When**: Deep nesting (> 3 levels), complex ternaries, or multiple `if/else` chains.

```typescript
// ❌ Before: Deeply nested conditionals
const Template = useMemo(() => {
  if (appDetail?.mode === AppModeEnum.CHAT) {
    switch (locale) {
      case LanguagesSupported[1]:
        return <TemplateChatZh />
      case LanguagesSupported[7]:
        return <TemplateChatJa />
      default:
        return <TemplateChatEn />
    }
  }
  if (appDetail?.mode === AppModeEnum.ADVANCED_CHAT) {
    // Another 15 lines...
  }
  // More conditions...
}, [appDetail, locale])

// ✅ After: Use lookup tables + early returns
const TEMPLATE_MAP = {
  [AppModeEnum.CHAT]: {
    [LanguagesSupported[1]]: TemplateChatZh,
    [LanguagesSupported[7]]: TemplateChatJa,
    default: TemplateChatEn,
  },
  [AppModeEnum.ADVANCED_CHAT]: {
    [LanguagesSupported[1]]: TemplateAdvancedChatZh,
    // ...
  },
}

const Template = useMemo(() => {
  const modeTemplates = TEMPLATE_MAP[appDetail?.mode]
  if (!modeTemplates) return null

  const TemplateComponent = modeTemplates[locale] || modeTemplates.default
  return <TemplateComponent appDetail={appDetail} />
}, [appDetail, locale])
```

### Pattern 4: Extract API/Data Logic

**When**: Component directly handles API calls, data transformation, or complex async operations.

```typescript
// ❌ Before: API logic in component
const MCPServiceCard = () => {
  const [basicAppConfig, setBasicAppConfig] = useState({})

  useEffect(() => {
    if (isBasicApp && appId) {
      (async () => {
        const res = await fetchAppDetail({ url: '/apps', id: appId })
        setBasicAppConfig(res?.model_config || {})
      })()
    }
  }, [appId, isBasicApp])

  // More API-related logic...
}

// ✅ After: Extract to data hook using React Query
// use-app-config.ts
import { useQuery } from '@tanstack/react-query'
import { get } from '@/service/base'

const NAME_SPACE = 'appConfig'

export const useAppConfig = (appId: string, isBasicApp: boolean) => {
  return useQuery({
    enabled: isBasicApp && !!appId,
    queryKey: [NAME_SPACE, 'detail', appId],
    queryFn: () => get<AppDetailResponse>(`/apps/${appId}`),
    select: data => data?.model_config || {},
  })
}

// Component becomes cleaner
const MCPServiceCard = () => {
  const { data: config, isLoading } = useAppConfig(appId, isBasicApp)
  // UI only
}
```

**React Query Best Practices**:
- Define `NAME_SPACE` for query key organization
- Use `enabled` option for conditional fetching
- Use `select` for data transformation
- Export invalidation hooks: `useInvalidXxx`

### Pattern 5: Extract Modal/Dialog Management

**When**: Component manages multiple modals with complex open/close states.

```typescript
// ❌ Before: Multiple modal states in component
const AppInfo = () => {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [showSwitchModal, setShowSwitchModal] = useState(false)
  const [showImportDSLModal, setShowImportDSLModal] = useState(false)
  // 5+ more modal states...
}

// ✅ After: Extract to modal management hook
type ModalType = 'edit' | 'duplicate' | 'delete' | 'switch' | 'import' | null

const useAppInfoModals = () => {
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const openModal = useCallback((type: ModalType) => setActiveModal(type), [])
  const closeModal = useCallback(() => setActiveModal(null), [])

  return {
    activeModal,
    openModal,
    closeModal,
    isOpen: (type: ModalType) => activeModal === type,
  }
}
```

## Common Mistakes to Avoid

### ❌ Over-Engineering

```typescript
// ❌ Too many tiny hooks
const useButtonText = () => useState('Click')
const useButtonDisabled = () => useState(false)
const useButtonLoading = () => useState(false)

// ✅ Cohesive hook with related state
const useButtonState = () => {
  const [text, setText] = useState('Click')
  const [disabled, setDisabled] = useState(false)
  const [loading, setLoading] = useState(false)
  return { text, setText, disabled, setDisabled, loading, setLoading }
}
```

### ❌ Breaking Existing Patterns

- Follow existing directory structures
- Maintain naming conventions
- Preserve export patterns for compatibility

### ❌ Premature Abstraction

- Only extract when there's clear complexity benefit
- Don't create abstractions for single-use code
- Keep refactored code in the same domain area

## References

### Related Skills

- `frontend-testing` - For testing refactored components
