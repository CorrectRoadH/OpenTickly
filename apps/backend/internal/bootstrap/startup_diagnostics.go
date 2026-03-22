package bootstrap

import (
	"log/slog"
	"net"
	"net/url"
	"time"
)

func logStartupSuccess(cfg Config, modules []string) {
	fields := startupLogFields(cfg, modules)
	fields = append(
		fields,
		"phase", "startup_success",
		"healthz_path", "/healthz",
		"readyz_path", "/readyz",
	)

	slog.Default().Info(
		"backend startup succeeded",
		fields...,
	)
}

func logStartupDependencyFailure(cfg Config, err error) {
	fields := startupFailureLogFields(cfg, err)
	fields = append(
		fields,
		"phase", "startup_dependency_failure",
		"dependency_probe_timeout", startupDependencyProbeTimeout.String(),
	)

	slog.Default().Error(
		"backend startup dependency check failed",
		fields...,
	)
}

func logStartupAssemblyFailure(cfg Config, err error) {
	fields := startupFailureLogFields(cfg, err)
	fields = append(fields, "phase", "startup_assembly_failure")

	slog.Default().Error(
		"backend startup assembly failed",
		fields...,
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
		"timestamp_unix", time.Now().Unix(),
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
