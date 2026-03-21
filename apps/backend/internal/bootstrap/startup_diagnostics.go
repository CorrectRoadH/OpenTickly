package bootstrap

import (
	"log/slog"
	"net"
	"net/url"
)

func logStartupSuccess(cfg Config, modules []string) {
	slog.Default().Info(
		"backend startup succeeded",
		startupLogFields(cfg, modules)...,
	)
}

func logStartupDependencyFailure(cfg Config, err error) {
	slog.Default().Error(
		"backend startup dependency check failed",
		startupFailureLogFields(cfg, err)...,
	)
}

func logStartupAssemblyFailure(cfg Config, err error) {
	slog.Default().Error(
		"backend startup assembly failed",
		startupFailureLogFields(cfg, err)...,
	)
}

func startupFailureLogFields(cfg Config, err error) []any {
	fields := startupLogFields(cfg, nil)
	return append(fields, "error", err.Error())
}

func startupLogFields(cfg Config, modules []string) []any {
	fields := []any{
		"service", cfg.ServiceName,
		"listen_address", cfg.Server.ListenAddress,
		"postgres_target", diagnosticTarget(cfg.Database.PrimaryDSN, "5432"),
		"redis_target", diagnosticTarget(cfg.Redis.Address, "6379"),
	}
	if len(modules) > 0 {
		fields = append(fields, "modules", modules)
	}
	return fields
}

func diagnosticTarget(rawURL string, defaultPort string) string {
	if rawURL == "" {
		return ""
	}

	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}

	host := parsedURL.Hostname()
	if host == "" {
		return ""
	}

	port := parsedURL.Port()
	if port == "" {
		port = defaultPort
	}

	return net.JoinHostPort(host, port)
}
