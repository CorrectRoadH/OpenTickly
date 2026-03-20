package bootstrap

import "os"

/**
 * ConfigFromEnvironment returns the API runtime config with optional overrides
 * from environment variables while preserving DefaultConfig fallbacks.
 */
func ConfigFromEnvironment(getEnv func(string) string) Config {
	cfg := DefaultConfig()
	if getEnv == nil {
		getEnv = os.Getenv
	}

	applyStringOverride(&cfg.ServiceName, getEnv("OPENTOGGL_SERVICE_NAME"))
	applyStringOverride(&cfg.Server.ListenAddress, getEnv("OPENTOGGL_API_LISTEN_ADDRESS"))
	applyStringOverride(&cfg.Database.PrimaryDSN, getEnv("OPENTOGGL_API_DATABASE_DSN"))
	applyStringOverride(&cfg.Redis.Address, getEnv("OPENTOGGL_API_REDIS_ADDRESS"))
	applyStringOverride(&cfg.FileStore.Namespace, getEnv("OPENTOGGL_FILESTORE_NAMESPACE"))
	applyStringOverride(&cfg.Jobs.QueueName, getEnv("OPENTOGGL_JOBS_QUEUE_NAME"))

	return withDefaults(cfg)
}

/**
 * applyStringOverride applies a non-empty environment override.
 */
func applyStringOverride(target *string, value string) {
	if value == "" {
		return
	}
	*target = value
}
