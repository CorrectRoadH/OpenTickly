package config

// StartupConfig keeps the composition root explicit while the platform layer is
// still lightweight, so later slices can swap adapters without adding globals.
type StartupConfig struct {
	ServiceName string
	Server      ServerConfig
	Database    DatabaseConfig
	Redis       RedisConfig
	FileStore   FileStoreConfig
	Jobs        JobsConfig
}

type ServerConfig struct {
	ListenAddress string
}

type DatabaseConfig struct {
	PrimaryDSN string
}

type RedisConfig struct {
	Address string
}

type FileStoreConfig struct {
	Namespace string
}

type JobsConfig struct {
	QueueName string
}
