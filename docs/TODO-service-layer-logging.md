# TODO: Service Layer Logging

Router 层已有完整的请求日志，但 service/infra/transport 层几乎没有日志，出错时无法定位原因。

**目标**：所有模块的三层（Infra、Application、Transport）都要有结构化日志。

**参考实现**：`tracking` 模块的 `application/service.go` 是标准样例，直接照抄模式。

---

## 标准模式（照此实现）

### Application 层（Service）

**旧的（以 catalog 为例）**：

```go
// catalog/application/service.go
type Service struct {
    store  Store
    // 没有 logger
}

func NewService(store Store) (*Service, error) {
    if store == nil {
        return nil, ErrStoreRequired
    }
    return &Service{store: store}, nil
}

func (s *Service) CreateClient(ctx context.Context, cmd CreateClientCommand) (ClientView, error) {
    client, err := domain.NewClient(cmd.WorkspaceID, cmd.Name)
    if err != nil {
        return ClientView{}, err  // 静默返回，无日志
    }
    if err := s.store.SaveClient(ctx, client); err != nil {
        return ClientView{}, err  // 静默返回，无日志
    }
    return toClientView(client), nil
}
```

**新的**：

```go
// catalog/application/service.go
type Service struct {
    store  Store
    logger log.Logger  // ① 加 logger 字段
}

func NewService(store Store, logger log.Logger) (*Service, error) {
    if store == nil {
        return nil, ErrStoreRequired
    }
    if logger == nil {
        return nil, ErrLoggerRequired  // ② 构造函数校验
    }
    return &Service{store: store, logger: logger}, nil
}

func (s *Service) CreateClient(ctx context.Context, cmd CreateClientCommand) (ClientView, error) {
    s.logger.InfoContext(ctx, "creating client",  // ③ 操作开始时 Info
        "workspace_id", cmd.WorkspaceID,
        "name", cmd.Name,
    )
    client, err := domain.NewClient(cmd.WorkspaceID, cmd.Name)
    if err != nil {
        s.logger.WarnContext(ctx, "invalid client data",  // ④ 业务校验失败用 Warn
            "workspace_id", cmd.WorkspaceID,
            "error", err.Error(),
        )
        return ClientView{}, err
    }
    if err := s.store.SaveClient(ctx, client); err != nil {
        s.logger.ErrorContext(ctx, "failed to save client",  // ⑤ 存储/系统错误用 Error
            "workspace_id", cmd.WorkspaceID,
            "error", err.Error(),
        )
        return ClientView{}, err
    }
    s.logger.InfoContext(ctx, "client created",  // ⑥ 成功时 Info
        "workspace_id", cmd.WorkspaceID,
        "client_id", client.ID,
    )
    return toClientView(client), nil
}
```

**字段命名规范**：

| 字段名 | 含义 |
|--------|------|
| `user_id` | 操作用户 ID |
| `workspace_id` | 工作区 ID |
| `organization_id` | 组织 ID |
| `client_id` / `project_id` / `entry_id` / ... | 具体资源 ID |
| `error` | `err.Error()` 字符串 |

**日志级别规范**：

| 级别 | 场景 |
|------|------|
| `InfoContext` | 操作开始、操作成功 |
| `WarnContext` | 资源不存在（404）、业务校验失败、权限拒绝（403） |
| `ErrorContext` | 数据库错误、系统异常、不可预期的错误 |

---

### Infra 层（Store）

**旧的**：

```go
// catalog/infra/postgres/store.go
type Store struct {
    db *pgxpool.Pool
    // 没有 logger
}

func NewStore(db *pgxpool.Pool) *Store {
    return &Store{db: db}
}

func (s *Store) SaveClient(ctx context.Context, client domain.Client) error {
    _, err := s.db.Exec(ctx, insertClientSQL, client.ID, client.WorkspaceID, client.Name)
    if err != nil {
        return fmt.Errorf("save client: %w", err)  // 只 wrap，不记录
    }
    return nil
}
```

**新的**：

```go
// catalog/infra/postgres/store.go
type Store struct {
    db     *pgxpool.Pool
    logger log.Logger  // ① 加 logger
}

func NewStore(db *pgxpool.Pool, logger log.Logger) *Store {
    return &Store{db: db, logger: logger}
}

func (s *Store) SaveClient(ctx context.Context, client domain.Client) error {
    _, err := s.db.Exec(ctx, insertClientSQL, client.ID, client.WorkspaceID, client.Name)
    if err != nil {
        s.logger.ErrorContext(ctx, "store: save client failed",  // ② 数据库错误记录
            "workspace_id", client.WorkspaceID,
            "client_id", client.ID,
            "error", err.Error(),
        )
        return fmt.Errorf("save client: %w", err)
    }
    return nil
}
```

---

### Transport 层（HTTP Handler）

**旧的**：

```go
// catalog/transport/http/public-api/clients_write.go
func (h *Handler) PostPublicTrackClient(c echo.Context, workspaceID WorkspaceID) error {
    // ... parse request ...
    view, err := h.catalog.CreateClient(ctx, cmd)
    if err != nil {
        return writeCatalogError(err)  // 静默转换，无日志
    }
    return c.JSON(http.StatusCreated, toClientResponse(view))
}
```

**新的**：

```go
// catalog/transport/http/public-api/clients_write.go
func (h *Handler) PostPublicTrackClient(c echo.Context, workspaceID WorkspaceID) error {
    // ... parse request ...
    view, err := h.catalog.CreateClient(ctx, cmd)
    if err != nil {
        h.logger.WarnContext(ctx, "create client failed",  // ① service 错误记录
            "workspace_id", workspaceID,
            "error", err.Error(),
        )
        return writeCatalogError(err)
    }
    return c.JSON(http.StatusCreated, toClientResponse(view))
}
```

> 注：transport 层对 service 错误统一用 `WarnContext`（4xx 业务错误居多），真正的 5xx 会由 HTTP error handler 捕获并记录为 Error。

---

## 各模块任务清单

### catalog

- [ ] `application/service.go`：加 `logger log.Logger` 字段，构造函数加 `logger` 参数和 nil 校验，所有方法加日志
  - 涉及方法：`ListClients`, `ListClientsByIDs`, `CreateClient`, `UpdateClient`, `DeleteClients`, `ArchiveClient`, `RestoreClient`, `ListProjects`, `GetProject`, `CreateProject`, `UpdateProject`, `DeleteProjects`, `ArchiveProject`, `RestoreProject`, `ListTasks`, `CreateTask`, `UpdateTask`, `DeleteTasks`, `ListTags`, `CreateTag`, `UpdateTag`, `DeleteTags`
- [ ] `infra/postgres/store.go`：加 `logger` 字段，所有 DB 错误路径加 `ErrorContext`
- [ ] `transport/http/public-api/`：所有 handler 加 `logger` 字段，service 错误路径加 `WarnContext`
- [ ] `bootstrap/route_handlers.go`：`NewService` / `NewStore` 调用处传入 `appLogger`

### billing

- [ ] `application/service.go`：加 logger，所有方法加日志
  - 涉及方法：`WorkspaceQuotaSnapshot`, `OrganizationQuotaSnapshot`, `WorkspaceCapabilitySnapshot`, `CheckWorkspaceCapability`, `CommercialStatusForOrganization`, `CommercialStatusForWorkspace`, `ProvisionDefaultOrganization`
- [ ] `transport/http/public-api/handler.go`：service 错误路径加 `WarnContext`
- [ ] `bootstrap/route_handlers.go`：传入 `appLogger`

### tenant

- [ ] `application/service.go`：加 logger，所有方法加日志
  - 涉及方法：`CreateOrganization`, `CreateWorkspace`, `GetOrganization`, `GetWorkspace`, `ListWorkspaces`, `UpdateWorkspace`, `UpdateOrganization`
- [ ] `infra/postgres/store.go`：加 logger，DB 错误加 `ErrorContext`
- [ ] `transport/http/public-api/handler.go`：service 错误加 `WarnContext`
- [ ] `bootstrap/route_handlers.go`：传入 `appLogger`

### identity

- [ ] `application/service.go`：加 logger，所有方法加日志
  - 涉及方法：`Login`, `Logout`, `Register`, `ResetPassword`, `ChangePassword`, `GetMe`, `UpdateMe`（按实际方法名）
- [ ] `transport/http/public-api/handler.go`：service 错误加 `WarnContext`
- [ ] `bootstrap/route_handlers.go`：传入 `appLogger`

### membership

- [ ] `application/service.go`：加 logger，所有方法加日志
  - 涉及方法：`AddWorkspaceMember`, `RemoveWorkspaceMember`, `UpdateWorkspaceMember`, `ListWorkspaceMembers`（按实际方法名）
- [ ] `infra/postgres/store.go`：加 logger，DB 错误加 `ErrorContext`
- [ ] `transport/http/public-api/handler.go`：service 错误加 `WarnContext`
- [ ] `bootstrap/route_handlers.go`：传入 `appLogger`

### governance

- [ ] `application/service.go`：加 logger，所有方法加日志
- [ ] `infra/postgres/store.go`：加 logger，DB 错误加 `ErrorContext`
- [ ] `transport/http/public-api/handler.go`：补全缺失的错误日志
- [ ] `bootstrap/route_handlers.go`：传入 `appLogger`

### importing

- [ ] `application/service.go`：加 logger，所有方法加日志（import/export 操作重要，必须记录进度和错误）
  - 建议在每个导入步骤开始/结束时加 Info，解析错误加 Warn，存储错误加 Error
- [ ] `infra/`：加 logger，DB 错误加 `ErrorContext`
- [ ] `transport/http/`：service 错误加 `WarnContext`
- [ ] `bootstrap/route_handlers.go`：传入 `appLogger`

### reports

- [ ] `application/service.go`：加 logger，所有方法加日志
- [ ] `transport/http/public-api/handler.go`：service 错误加 `WarnContext`
- [ ] `bootstrap/route_handlers.go`：传入 `appLogger`

### tracking（已有 service 日志，补齐其他层）

- [ ] `infra/postgres/store.go`：加 logger，DB 错误加 `ErrorContext`
- [ ] `transport/http/public-api/handler.go`：service 错误路径加 `WarnContext`
- [ ] `transport/http/web/handler.go`：同上
- [ ] `bootstrap/route_handlers.go`：Store 构造处传入 `appLogger`

---

## bootstrap 统一修改

`bootstrap/route_handlers.go` 中每个 `NewStore` / `NewService` 调用需补传 `appLogger`：

```go
// 旧的
catalogStore := cataloginfra.NewStore(db)
catalogService, err := catalogapplication.NewService(catalogStore)

// 新的
catalogStore := cataloginfra.NewStore(db, appLogger)
catalogService, err := catalogapplication.NewService(catalogStore, appLogger)
```

---

## 验证方法

改完一个模块后，触发该模块的一个错误路径（比如请求一个不存在的资源），日志应该出现：

```
WARN  service: client not found  workspace_id=ws_xxx  client_id=c_xxx
WARN  create client failed  workspace_id=ws_xxx  error=catalog client not found
```

而不是只有 router 层的：

```
INFO  http request  method=GET  path=/api/v9/workspaces/xxx/clients/yyy  status=404  duration=3ms
```
