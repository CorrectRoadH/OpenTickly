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
		Server: ServerConfig{
			ListenAddress: ":8080",
		},
		Database: DatabaseConfig{
			PrimaryDSN: "postgres://opentoggl@localhost/opentoggl",
		},
		Redis: RedisConfig{
			Address: "redis://127.0.0.1:6379/0",
		},
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
	if cfg.Server.ListenAddress == "" {
		cfg.Server.ListenAddress = defaults.Server.ListenAddress
	}
	if cfg.Database.PrimaryDSN == "" {
		cfg.Database.PrimaryDSN = defaults.Database.PrimaryDSN
	}
	if cfg.Redis.Address == "" {
		cfg.Redis.Address = defaults.Redis.Address
	}
	if cfg.FileStore.Namespace == "" {
		cfg.FileStore.Namespace = defaults.FileStore.Namespace
	}
	if cfg.Jobs.QueueName == "" {
		cfg.Jobs.QueueName = defaults.Jobs.QueueName
	}
	return cfg
}
