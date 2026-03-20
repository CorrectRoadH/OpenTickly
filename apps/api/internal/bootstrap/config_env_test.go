package bootstrap

import "testing"

func TestConfigFromEnvironmentUsesDefaultsWhenVariablesMissing(t *testing.T) {
	cfg := ConfigFromEnvironment(func(string) string { return "" })

	defaults := DefaultConfig()
	if cfg.ServiceName != defaults.ServiceName {
		t.Fatalf("expected default service name %q, got %q", defaults.ServiceName, cfg.ServiceName)
	}
	if cfg.Server.ListenAddress != defaults.Server.ListenAddress {
		t.Fatalf(
			"expected default listen address %q, got %q",
			defaults.Server.ListenAddress,
			cfg.Server.ListenAddress,
		)
	}
	if cfg.Database.PrimaryDSN != defaults.Database.PrimaryDSN {
		t.Fatalf(
			"expected default database dsn %q, got %q",
			defaults.Database.PrimaryDSN,
			cfg.Database.PrimaryDSN,
		)
	}
	if cfg.Redis.Address != defaults.Redis.Address {
		t.Fatalf(
			"expected default redis address %q, got %q",
			defaults.Redis.Address,
			cfg.Redis.Address,
		)
	}
}

func TestConfigFromEnvironmentAppliesRuntimeOverrides(t *testing.T) {
	vars := map[string]string{
		"OPENTOGGL_SERVICE_NAME":        "opentoggl-api-compose",
		"OPENTOGGL_API_LISTEN_ADDRESS":  ":18080",
		"OPENTOGGL_API_DATABASE_DSN":    "postgres://postgres:postgres@postgres:5432/opentoggl?sslmode=disable",
		"OPENTOGGL_API_REDIS_ADDRESS":   "redis://redis:6379/0",
		"OPENTOGGL_FILESTORE_NAMESPACE": "opentoggl-local",
		"OPENTOGGL_JOBS_QUEUE_NAME":     "compose-default",
	}

	cfg := ConfigFromEnvironment(func(key string) string {
		return vars[key]
	})

	if cfg.ServiceName != vars["OPENTOGGL_SERVICE_NAME"] {
		t.Fatalf("expected service name %q, got %q", vars["OPENTOGGL_SERVICE_NAME"], cfg.ServiceName)
	}
	if cfg.Server.ListenAddress != vars["OPENTOGGL_API_LISTEN_ADDRESS"] {
		t.Fatalf("expected listen address %q, got %q", vars["OPENTOGGL_API_LISTEN_ADDRESS"], cfg.Server.ListenAddress)
	}
	if cfg.Database.PrimaryDSN != vars["OPENTOGGL_API_DATABASE_DSN"] {
		t.Fatalf("expected database dsn %q, got %q", vars["OPENTOGGL_API_DATABASE_DSN"], cfg.Database.PrimaryDSN)
	}
	if cfg.Redis.Address != vars["OPENTOGGL_API_REDIS_ADDRESS"] {
		t.Fatalf("expected redis address %q, got %q", vars["OPENTOGGL_API_REDIS_ADDRESS"], cfg.Redis.Address)
	}
	if cfg.FileStore.Namespace != vars["OPENTOGGL_FILESTORE_NAMESPACE"] {
		t.Fatalf(
			"expected filestore namespace %q, got %q",
			vars["OPENTOGGL_FILESTORE_NAMESPACE"],
			cfg.FileStore.Namespace,
		)
	}
	if cfg.Jobs.QueueName != vars["OPENTOGGL_JOBS_QUEUE_NAME"] {
		t.Fatalf("expected queue name %q, got %q", vars["OPENTOGGL_JOBS_QUEUE_NAME"], cfg.Jobs.QueueName)
	}
}
