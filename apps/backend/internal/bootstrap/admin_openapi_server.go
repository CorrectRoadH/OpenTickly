package bootstrap

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	adminapi "opentoggl/backend/apps/backend/internal/http/generated/admin"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	instanceadminapplication "opentoggl/backend/apps/backend/internal/instance-admin/application"
	instanceadminpostgres "opentoggl/backend/apps/backend/internal/instance-admin/infra/postgres"
	instanceadmintransport "opentoggl/backend/apps/backend/internal/instance-admin/transport/http/admin"
	"opentoggl/backend/apps/backend/internal/platform"

	"github.com/labstack/echo/v4"
)

func newAdminRoutes(handlers *routeHandlers) (httpapp.RouteRegistrar, error) {
	store := instanceadminpostgres.NewStore(handlers.pool)
	userCreator := &identityUserCreator{
		identityApp: handlers.identityApp,
		pool:        handlers.pool,
	}
	emailSender := newEmailSenderFromDB(handlers.pool)
	service, err := instanceadminapplication.NewService(instanceadminapplication.Config{
		Bootstrap:          store,
		RegistrationPolicy: store,
		InstanceUsers:      store,
		InstanceConfig:     store,
		OrgLister:          store,
		UserCreator:        userCreator,
		EmailSender:        emailSender,
		Clock:              realClock{},
	})
	if err != nil {
		return nil, err
	}
	var updateFeed instanceadmintransport.UpdateFeed
	if handlers.telemetryPinger != nil {
		updateFeed = handlers.telemetryPinger
	}
	handler := instanceadmintransport.NewHandler(service, &platformHealthChecker{platform: handlers.platformHandles}, updateFeed)

	server := &adminOpenAPIServer{handler: handler}

	middleware := instanceadmintransport.AdminAuthMiddleware(instanceadmintransport.AdminAuthConfig{
		SessionCookieName: "opentoggl_session",
		SessionResolver: &adminSessionResolverAdapter{
			identityApp: handlers.identityApp,
		},
		BootstrapChecker: &bootstrapStateCheckerAdapter{store: store},
	})

	return httpapp.NewGeneratedAdminRouteRegistrarWithMiddleware(server, middleware)
}

type adminOpenAPIServer struct {
	handler *instanceadmintransport.Handler
}

func (s *adminOpenAPIServer) GetBootstrapState(ctx echo.Context) error {
	return s.handler.GetBootstrapState(ctx)
}
func (s *adminOpenAPIServer) BootstrapInstanceAdmin(ctx echo.Context) error {
	return s.handler.BootstrapInstanceAdmin(ctx)
}
func (s *adminOpenAPIServer) GetInstanceFeatureGate(ctx echo.Context, capabilityKey string) error {
	return s.handler.GetInstanceFeatureGate(ctx, capabilityKey)
}
func (s *adminOpenAPIServer) GetInstanceConfig(ctx echo.Context) error {
	return s.handler.GetInstanceConfig(ctx)
}
func (s *adminOpenAPIServer) UpdateInstanceConfig(ctx echo.Context) error {
	return s.handler.UpdateInstanceConfig(ctx)
}
func (s *adminOpenAPIServer) SendTestEmail(ctx echo.Context) error {
	return s.handler.SendTestEmail(ctx)
}
func (s *adminOpenAPIServer) ListOrganizations(ctx echo.Context) error {
	return s.handler.ListOrganizations(ctx)
}
func (s *adminOpenAPIServer) GetInstanceVersion(ctx echo.Context) error {
	return s.handler.GetInstanceVersion(ctx)
}
func (s *adminOpenAPIServer) GetInstanceHealth(ctx echo.Context) error {
	return s.handler.GetInstanceHealth(ctx)
}
func (s *adminOpenAPIServer) GetRegistrationPolicy(ctx echo.Context) error {
	return s.handler.GetRegistrationPolicy(ctx)
}
func (s *adminOpenAPIServer) UpdateRegistrationPolicy(ctx echo.Context) error {
	return s.handler.UpdateRegistrationPolicy(ctx)
}
func (s *adminOpenAPIServer) ListInstanceUsers(ctx echo.Context, params adminapi.ListInstanceUsersParams) error {
	return s.handler.ListInstanceUsers(ctx, params)
}
func (s *adminOpenAPIServer) DisableInstanceUser(ctx echo.Context, userId int64) error {
	return s.handler.DisableInstanceUser(ctx, userId)
}
func (s *adminOpenAPIServer) RestoreInstanceUser(ctx echo.Context, userId int64) error {
	return s.handler.RestoreInstanceUser(ctx, userId)
}

// --- Adapters ---

type realClock struct{}

func (realClock) Now() time.Time { return time.Now() }

type platformHealthChecker struct {
	platform *platform.Handles
}

func (h *platformHealthChecker) PingDatabase() (time.Duration, error) {
	start := time.Now()
	err := h.platform.Database.Pool().Ping(context.Background())
	elapsed := time.Since(start)
	if elapsed == 0 {
		elapsed = time.Microsecond
	}
	return elapsed, err
}

func (h *platformHealthChecker) PingRedis() (time.Duration, error) {
	addr := h.platform.Redis.Address()
	if addr == "" {
		return 0, fmt.Errorf("redis not configured")
	}
	options, err := redis.ParseURL(addr)
	if err != nil {
		return 0, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	client := redis.NewClient(options)
	defer client.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	start := time.Now()
	err = client.Ping(ctx).Err()
	elapsed := time.Since(start)
	if elapsed == 0 {
		elapsed = time.Microsecond
	}
	return elapsed, err
}

type adminSessionResolverAdapter struct {
	identityApp *identityapplication.Service
}

func (a *adminSessionResolverAdapter) IsInstanceAdmin(sessionID string) (bool, error) {
	user, err := a.identityApp.ResolveCurrentUser(context.Background(), sessionID)
	if err != nil {
		return false, err
	}
	return user.IsInstanceAdmin, nil
}

type bootstrapStateCheckerAdapter struct {
	store *instanceadminpostgres.Store
}

func (a *bootstrapStateCheckerAdapter) IsBootstrapped() (bool, error) {
	state, err := a.store.GetBootstrapState(context.Background())
	if err != nil {
		return false, err
	}
	return state.Completed, nil
}
