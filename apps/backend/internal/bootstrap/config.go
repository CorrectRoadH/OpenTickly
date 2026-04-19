package bootstrap

import platformconfig "opentoggl/backend/apps/backend/internal/platform/config"

// Config keeps the composition root explicit so later waves cannot hide startup
// dependencies behind globals or a service locator.
type Config = platformconfig.StartupConfig
type ServerConfig = platformconfig.ServerConfig
type DatabaseConfig = platformconfig.DatabaseConfig
type RedisConfig = platformconfig.RedisConfig
type FileStoreConfig = platformconfig.FileStoreConfig
type JobsConfig = platformconfig.JobsConfig
type GovernanceConfig = platformconfig.GovernanceConfig
type TelemetryConfig = platformconfig.TelemetryConfig
type WebhookConfig = platformconfig.WebhookConfig

func DefaultConfig() Config {
	return Config{
		ServiceName: "opentoggl-api",
		Server:      ServerConfig{},
		FileStore: FileStoreConfig{
			Namespace: "opentoggl",
		},
		Jobs: JobsConfig{
			QueueName: "default",
		},
		Governance: GovernanceConfig{
			AuditLogRetentionDays: 90,
		},
		Telemetry: TelemetryConfig{
			Enabled: true,
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
	if cfg.Governance.AuditLogRetentionDays <= 0 {
		cfg.Governance.AuditLogRetentionDays = defaults.Governance.AuditLogRetentionDays
	}
	return cfg
}
