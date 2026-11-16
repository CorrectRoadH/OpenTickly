package bootstrap

import (
	"net/http"
	"net/url"
	"regexp"
	"strings"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	platformconfig "opentoggl/backend/apps/backend/internal/platform/config"

	"github.com/labstack/echo/v4"
)

var publicDSNKey = regexp.MustCompile(`^[a-zA-Z0-9]+$`)
var publicDSNProject = regexp.MustCompile(`^/[0-9]+$`)
var telemetryEnvironment = regexp.MustCompile(`^[a-zA-Z0-9_.-]{1,64}$`)
var frontendRelease = regexp.MustCompile(`^web@[a-f0-9]{40}$`)

// Invalid or incomplete monitoring configuration never prevents app startup.
func publicBrowserTelemetry(cfg platformconfig.BrowserSentryConfig, release string) webapi.BrowserSentryConfig {
	u, err := url.Parse(cfg.DSN)
	if err != nil || len(cfg.DSN) > 2048 || u.Scheme != "https" || u.Hostname() == "" || u.Port() != "" || u.User == nil || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" || u.RawFragment != "" || u.RawPath != "" || strings.ContainsAny(cfg.DSN, "\r\n\t ") {
		return webapi.BrowserSentryConfig{}
	}
	_, privateKey := u.User.Password()
	if privateKey || !publicDSNKey.MatchString(u.User.Username()) || !publicDSNProject.MatchString(u.Path) {
		return webapi.BrowserSentryConfig{}
	}
	if !telemetryEnvironment.MatchString(cfg.Environment) {
		cfg.Environment = "production"
	}
	if !frontendRelease.MatchString(release) {
		release = ""
	}
	return webapi.BrowserSentryConfig{Dsn: cfg.DSN, Environment: cfg.Environment, Release: release}
}

func (server *webOpenAPIServer) GetBrowserTelemetryConfig(ctx echo.Context) error {
	ctx.Response().Header().Set("Cache-Control", "no-store")
	return ctx.JSON(http.StatusOK, webapi.BrowserTelemetryConfig{Sentry: server.handlers.browserSentry})
}
