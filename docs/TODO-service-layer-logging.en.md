# TODO: Service Layer Logging

The router layer already has complete request logs, but the service/infra/transport layers have almost no logging, so when errors occur the cause cannot be pinpointed.

**Goal**: all three layers of every module (Infra, Application, Transport) must have structured logging.

**Reference implementation**: the `tracking` module's `application/service.go` is the canonical example — copy the pattern directly.

---

## Standard Pattern (implement accordingly)

### Application Layer (Service)

**Before (using catalog as an example)**:

```go
// catalog/application/service.go
type Service struct {
    store  Store
    // no logger
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
        return ClientView{}, err  // silent return, no log
    }
    if err := s.store.SaveClient(ctx, client); err != nil {
        return ClientView{}, err  // silent return, no log
    }
    return toClientView(client), nil
}
```

**After**:

```go
// catalog/application/service.go
type Service struct {
    store  Store
    logger log.Logger  // ① add logger field
}

func NewService(store Store, logger log.Logger) (*Service, error) {
    if store == nil {
        return nil, ErrStoreRequired
    }
    if logger == nil {
        return nil, ErrLoggerRequired  // ② constructor validation
    }
    return &Service{store: store, logger: logger}, nil
}

func (s *Service) CreateClient(ctx context.Context, cmd CreateClientCommand) (ClientView, error) {
    s.logger.InfoContext(ctx, "creating client",  // ③ Info at operation start
        "workspace_id", cmd.WorkspaceID,
        "name", cmd.Name,
    )
    client, err := domain.NewClient(cmd.WorkspaceID, cmd.Name)
    if err != nil {
        s.logger.WarnContext(ctx, "invalid client data",  // ④ Warn for business validation failure
            "workspace_id", cmd.WorkspaceID,
            "error", err.Error(),
        )
        return ClientView{}, err
    }
    if err := s.store.SaveClient(ctx, client); err != nil {
        s.logger.ErrorContext(ctx, "failed to save client",  // ⑤ Error for storage/system errors
            "workspace_id", cmd.WorkspaceID,
            "error", err.Error(),
        )
        return ClientView{}, err
    }
    s.logger.InfoContext(ctx, "client created",  // ⑥ Info on success
        "workspace_id", cmd.WorkspaceID,
        "client_id", client.ID,
    )
    return toClientView(client), nil
}
```

**Field naming conventions**:

| Field | Meaning |
|--------|------|
| `user_id` | Acting user ID |
| `workspace_id` | Workspace ID |
| `organization_id` | Organization ID |
| `client_id` / `project_id` / `entry_id` / ... | Specific resource ID |
| `error` | `err.Error()` string |

**Log level conventions**:

| Level | Scenario |
|------|------|
| `InfoContext` | Operation start, operation success |
| `WarnContext` | Resource not found (404), business validation failure, permission denied (403) |
| `ErrorContext` | Database error, system exception, unexpected error |

---

### Infra Layer (Store)

**Before**:

```go
// catalog/infra/postgres/store.go
type Store struct {
    db *pgxpool.Pool
    // no logger
}

func NewStore(db *pgxpool.Pool) *Store {
    return &Store{db: db}
}

func (s *Store) SaveClient(ctx context.Context, client domain.Client) error {
    _, err := s.db.Exec(ctx, insertClientSQL, client.ID, client.WorkspaceID, client.Name)
    if err != nil {
        return fmt.Errorf("save client: %w", err)  // only wrapped, not logged
    }
    return nil
}
```

**After**:

```go
// catalog/infra/postgres/store.go
type Store struct {
    db     *pgxpool.Pool
    logger log.Logger  // ① add logger
}

func NewStore(db *pgxpool.Pool, logger log.Logger) *Store {
    return &Store{db: db, logger: logger}
}

func (s *Store) SaveClient(ctx context.Context, client domain.Client) error {
    _, err := s.db.Exec(ctx, insertClientSQL, client.ID, client.WorkspaceID, client.Name)
    if err != nil {
        s.logger.ErrorContext(ctx, "store: save client failed",  // ② record database error
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

### Transport Layer (HTTP Handler)

**Before**:

```go
// catalog/transport/http/public-api/clients_write.go
func (h *Handler) PostPublicTrackClient(c echo.Context, workspaceID WorkspaceID) error {
    // ... parse request ...
    view, err := h.catalog.CreateClient(ctx, cmd)
    if err != nil {
        return writeCatalogError(err)  // silent conversion, no log
    }
    return c.JSON(http.StatusCreated, toClientResponse(view))
}
```

**After**:

```go
// catalog/transport/http/public-api/clients_write.go
func (h *Handler) PostPublicTrackClient(c echo.Context, workspaceID WorkspaceID) error {
    // ... parse request ...
    view, err := h.catalog.CreateClient(ctx, cmd)
    if err != nil {
        h.logger.WarnContext(ctx, "create client failed",  // ① record service error
            "workspace_id", workspaceID,
            "error", err.Error(),
        )
        return writeCatalogError(err)
    }
    return c.JSON(http.StatusCreated, toClientResponse(view))
}
```

> Note: the transport layer uses `WarnContext` uniformly for service errors (mostly 4xx business errors); real 5xx errors are captured and recorded as Error by the HTTP error handler.

---

## Per-Module Task List

### catalog

- [ ] `application/service.go`: add `logger log.Logger` field, add `logger` parameter and nil validation to the constructor, add logging to all methods
  - Methods involved: `ListClients`, `ListClientsByIDs`, `CreateClient`, `UpdateClient`, `DeleteClients`, `ArchiveClient`, `RestoreClient`, `ListProjects`, `GetProject`, `CreateProject`, `UpdateProject`, `DeleteProjects`, `ArchiveProject`, `RestoreProject`, `ListTasks`, `CreateTask`, `UpdateTask`, `DeleteTasks`, `ListTags`, `CreateTag`, `UpdateTag`, `DeleteTags`
- [ ] `infra/postgres/store.go`: add `logger` field, add `ErrorContext` to all DB error paths
- [ ] `transport/http/public-api/`: add `logger` field to all handlers, add `WarnContext` on service error paths
- [ ] `bootstrap/route_handlers.go`: pass `appLogger` into `NewService` / `NewStore` call sites

### billing

- [ ] `application/service.go`: add logger, add logging to all methods
  - Methods involved: `WorkspaceQuotaSnapshot`, `OrganizationQuotaSnapshot`, `WorkspaceCapabilitySnapshot`, `CheckWorkspaceCapability`, `CommercialStatusForOrganization`, `CommercialStatusForWorkspace`, `ProvisionDefaultOrganization`
- [ ] `transport/http/public-api/handler.go`: add `WarnContext` on service error paths
- [ ] `bootstrap/route_handlers.go`: pass in `appLogger`

### tenant

- [ ] `application/service.go`: add logger, add logging to all methods
  - Methods involved: `CreateOrganization`, `CreateWorkspace`, `GetOrganization`, `GetWorkspace`, `ListWorkspaces`, `UpdateWorkspace`, `UpdateOrganization`
- [ ] `infra/postgres/store.go`: add logger, add `ErrorContext` on DB errors
- [ ] `transport/http/public-api/handler.go`: add `WarnContext` on service errors
- [ ] `bootstrap/route_handlers.go`: pass in `appLogger`

### identity

- [ ] `application/service.go`: add logger, add logging to all methods
  - Methods involved: `Login`, `Logout`, `Register`, `ResetPassword`, `ChangePassword`, `GetMe`, `UpdateMe` (using the actual method names)
- [ ] `transport/http/public-api/handler.go`: add `WarnContext` on service errors
- [ ] `bootstrap/route_handlers.go`: pass in `appLogger`

### membership

- [ ] `application/service.go`: add logger, add logging to all methods
  - Methods involved: `AddWorkspaceMember`, `RemoveWorkspaceMember`, `UpdateWorkspaceMember`, `ListWorkspaceMembers` (using the actual method names)
- [ ] `infra/postgres/store.go`: add logger, add `ErrorContext` on DB errors
- [ ] `transport/http/public-api/handler.go`: add `WarnContext` on service errors
- [ ] `bootstrap/route_handlers.go`: pass in `appLogger`

### governance

- [ ] `application/service.go`: add logger, add logging to all methods
- [ ] `infra/postgres/store.go`: add logger, add `ErrorContext` on DB errors
- [ ] `transport/http/public-api/handler.go`: fill in missing error logs
- [ ] `bootstrap/route_handlers.go`: pass in `appLogger`

### importing

- [ ] `application/service.go`: add logger, add logging to all methods (import/export operations are important and must record progress and errors)
  - Recommend Info at the start/end of each import step, Warn on parse errors, Error on storage errors
- [ ] `infra/`: add logger, add `ErrorContext` on DB errors
- [ ] `transport/http/`: add `WarnContext` on service errors
- [ ] `bootstrap/route_handlers.go`: pass in `appLogger`

### reports

- [ ] `application/service.go`: add logger, add logging to all methods
- [ ] `transport/http/public-api/handler.go`: add `WarnContext` on service errors
- [ ] `bootstrap/route_handlers.go`: pass in `appLogger`

### tracking (already has service logging; fill in the other layers)

- [ ] `infra/postgres/store.go`: add logger, add `ErrorContext` on DB errors
- [ ] `transport/http/public-api/handler.go`: add `WarnContext` on service error paths
- [ ] `transport/http/web/handler.go`: same as above
- [ ] `bootstrap/route_handlers.go`: pass `appLogger` at the Store construction site

---

## Bootstrap-Wide Changes

In `bootstrap/route_handlers.go` every `NewStore` / `NewService` call needs to also pass `appLogger`:

```go
// before
catalogStore := cataloginfra.NewStore(db)
catalogService, err := catalogapplication.NewService(catalogStore)

// after
catalogStore := cataloginfra.NewStore(db, appLogger)
catalogService, err := catalogapplication.NewService(catalogStore, appLogger)
```

---

## Verification

After updating a module, trigger one of its error paths (e.g. request a resource that doesn't exist). The logs should include:

```
WARN  service: client not found  workspace_id=ws_xxx  client_id=c_xxx
WARN  create client failed  workspace_id=ws_xxx  error=catalog client not found
```

Rather than only the router-layer line:

```
INFO  http request  method=GET  path=/api/v9/workspaces/xxx/clients/yyy  status=404  duration=3ms
```
