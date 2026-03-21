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
	return NewApp(cfg)
}

func NewApp(cfg Config) (*App, error) {
	cfg = withDefaults(cfg)
	modules := defaultModules()
	platform := newPlatformServices(cfg)
	wave1WebHandlers, err := newWave1WebHandlers()
	if err != nil {
		return nil, err
	}
	moduleNames := make([]string, 0, len(modules))
	for _, module := range modules {
		moduleNames = append(moduleNames, module.Name)
	}
	health := web.NewHealthSnapshot(cfg.ServiceName, moduleNames)

	return &App{
		Config:   cfg,
		HTTP:     httpapp.NewServer(health, wave1WebHandlers),
		Platform: platform,
		Modules:  modules,
	}, nil
}

func (app *App) Start() error {
	return app.HTTP.Start(app.Config.Server.ListenAddress)
}
