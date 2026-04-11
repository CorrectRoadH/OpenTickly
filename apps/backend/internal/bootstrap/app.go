package bootstrap

import (
	"context"
	"fmt"
	"log/slog"
	"strings"

	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	httpapp "opentoggl/backend/apps/backend/internal/http"
	"opentoggl/backend/apps/backend/internal/log"
	"opentoggl/backend/apps/backend/internal/platform"
	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v4"
)

type App struct {
	Config        Config
	HTTP          *echo.Echo
	Platform      *platform.Handles
	Modules       []ModuleDescriptor
	governanceApp *governanceapplication.Service
}

func NewAppFromEnvironment(getEnv func(string) string) (*App, error) {
	cfg, err := ConfigFromEnvironment(getEnv)
	if err != nil {
		return nil, err
	}
	if err := verifyStartupDependencies(cfg); err != nil {
		logStartupDependencyFailure(cfg, err)
		return nil, err
	}
	return NewApp(cfg)
}

func NewApp(cfg Config) (*App, error) {
	cfg = withDefaults(cfg)
	if err := validateRequiredStartupConfig(cfg); err != nil {
		logStartupAssemblyFailure(cfg, err)
		return nil, err
	}
	modules := defaultModules()
	platform := newPlatformServices(cfg)
	routeRegistrar, governanceService, err := newHTTPRouteRegistrar(platform)
	if err != nil {
		logStartupAssemblyFailure(cfg, err)
		return nil, err
	}
	moduleNames := make([]string, 0, len(modules))
	for _, module := range modules {
		moduleNames = append(moduleNames, module.Name)
	}
	health := web.NewHealthSnapshot(cfg.ServiceName, moduleNames)
	readiness := web.NewStartupReadinessProbe(web.StartupReadinessConfig{
		Service:     cfg.ServiceName,
		DatabaseURL: platform.Database.PrimaryDSN(),
		RedisURL:    platform.Redis.Address(),
	})

	app := &App{
		Config: cfg,
		HTTP: httpapp.NewServerWithOptions(health, routeRegistrar, httpapp.ServerOptions{
			Readiness: readiness,
		}),
		Platform:      platform,
		Modules:       modules,
		governanceApp: governanceService,
	}
	logStartupSuccess(cfg, moduleNames)
	return app, nil
}

func (app *App) Start() error {
	if days := app.Config.Governance.AuditLogRetentionDays; days > 0 && app.governanceApp != nil {
		governanceapplication.StartAuditLogCleanupWorker(context.Background(), app.governanceApp, days)
	}
	return app.HTTP.Start(app.Config.Server.ListenAddress)
}

/**
 * validateRequiredStartupConfig enforces explicit startup boundary config in the
 * bootstrap composition root so non-production defaults are never accepted as a
 * normal startup path.
 */
func validateRequiredStartupConfig(cfg Config) error {
	if strings.TrimSpace(cfg.Server.ListenAddress) == "" {
		return fmt.Errorf("missing required startup config server.listen_address")
	}
	if strings.TrimSpace(cfg.Database.PrimaryDSN) == "" {
		return fmt.Errorf("missing required startup config database.primary_dsn")
	}
	if strings.TrimSpace(cfg.Redis.Address) == "" {
		return fmt.Errorf("missing required startup config redis.address")
	}
	return nil
}

func newHTTPRouteRegistrar(platform *platform.Handles) (httpapp.RouteRegistrar, *governanceapplication.Service, error) {
	appLogger := log.NewZapLogger(slog.Default())
	assembledHandlers, err := newRouteHandlers(platform.Database.Pool(), platform, appLogger)
	if err != nil {
		return nil, nil, err
	}
	webRoutes, err := newWebRoutes(assembledHandlers)
	if err != nil {
		return nil, nil, err
	}
	publicTrackRoutes, err := newPublicTrackRoutes(assembledHandlers)
	if err != nil {
		return nil, nil, err
	}
	publicReportsRoutes, err := newPublicReportsRoutes(assembledHandlers)
	if err != nil {
		return nil, nil, err
	}
	publicWebhooksRoutes, err := newPublicWebhooksRoutes(assembledHandlers)
	if err != nil {
		return nil, nil, err
	}
	importRoutes, err := newImportRoutes(assembledHandlers)
	if err != nil {
		return nil, nil, err
	}
	adminRoutes, err := newAdminRoutes(assembledHandlers)
	if err != nil {
		return nil, nil, err
	}

	return httpapp.ComposeRouteRegistrars(
		webRoutes,
		publicTrackRoutes,
		publicReportsRoutes,
		publicWebhooksRoutes,
		importRoutes,
		adminRoutes,
		newFileRoutes(assembledHandlers),
	), assembledHandlers.governanceApp, nil
}
