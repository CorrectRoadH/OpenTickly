package bootstrap

import (
	httpapp "opentoggl/backend/apps/backend/internal/http"
	"opentoggl/backend/apps/backend/internal/platform"
	"opentoggl/backend/apps/backend/internal/web"

	"github.com/labstack/echo/v4"
)

type App struct {
	Config   Config
	HTTP     *echo.Echo
	Platform *platform.Runtime
	Modules  []ModuleDescriptor
}

func NewAppFromEnvironment(getEnv func(string) string) (*App, error) {
	cfg, err := ConfigFromEnvironment(getEnv)
	if err != nil {
		return nil, err
	}
	if err := verifyStartupDependencies(cfg); err != nil {
		return nil, err
	}
	return NewApp(cfg)
}

func NewApp(cfg Config) (*App, error) {
	cfg = withDefaults(cfg)
	modules := defaultModules()
	platform := newPlatformServices(cfg)
	routeRegistrar, err := newHTTPRouteRegistrar()
	if err != nil {
		return nil, err
	}
	moduleNames := make([]string, 0, len(modules))
	for _, module := range modules {
		moduleNames = append(moduleNames, module.Name)
	}
	health := web.NewHealthSnapshot(cfg.ServiceName, moduleNames)
	readiness := web.NewRuntimeReadinessProbe(web.RuntimeReadinessConfig{
		Service:     cfg.ServiceName,
		DatabaseURL: platform.Database.PrimaryDSN(),
		RedisURL:    platform.Redis.Address(),
	})

	return &App{
		Config:   cfg,
		HTTP: httpapp.NewServerWithOptions(health, routeRegistrar, httpapp.ServerOptions{
			Readiness: readiness,
		}),
		Platform: platform,
		Modules:  modules,
	}, nil
}

func (app *App) Start() error {
	return app.HTTP.Start(app.Config.Server.ListenAddress)
}

func newHTTPRouteRegistrar() (httpapp.RouteRegistrar, error) {
	wave1Routes, err := newWave1WebRoutes()
	if err != nil {
		return nil, err
	}

	return httpapp.ComposeRouteRegistrars(
		wave1Routes,
	), nil
}
