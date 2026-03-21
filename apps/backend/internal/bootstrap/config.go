package bootstrap

import platformconfig "opentoggl/backend/apps/backend/internal/platform/config"

// Config keeps the composition root explicit so later waves cannot hide runtime
// dependencies behind globals or a service locator.
type Config = platformconfig.RuntimeConfig
type ServerConfig = platformconfig.ServerConfig
type DatabaseConfig = platformconfig.DatabaseConfig
type RedisConfig = platformconfig.RedisConfig
type FileStoreConfig = platformconfig.FileStoreConfig
type JobsConfig = platformconfig.JobsConfig

func DefaultConfig() Config {
	return Config{
		ServiceName: "opentoggl-api",
		FileStore: FileStoreConfig{
			Namespace: "opentoggl",
		},
		Jobs: JobsConfig{
			QueueName: "default",
		},
	}
}

func withDefaults(cfg Config) Config {
	defaults := DefaultConfig()
	if cfg.ServiceName == "" {
		cfg.ServiceName = defaults.ServiceName
	}
	if cfg.FileStore.Namespace == "" {
		cfg.FileStore.Namespace = defaults.FileStore.Namespace
	}
	if cfg.Jobs.QueueName == "" {
		cfg.Jobs.QueueName = defaults.Jobs.QueueName
	}
	return cfg
}
