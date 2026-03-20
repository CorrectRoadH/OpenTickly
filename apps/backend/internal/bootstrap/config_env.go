package bootstrap

import (
	"bufio"
	"os"
	"strings"
)

/**
 * ConfigFromEnvironment returns the API runtime config with optional overrides
 * from environment variables and repo-root `.env` files while preserving
 * DefaultConfig fallbacks.
 */
func ConfigFromEnvironment(getEnv func(string) string) Config {
	cfg := DefaultConfig()
	if getEnv == nil {
		getEnv = repositoryEnvironmentGetter(os.Getenv)
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

/**
 * repositoryEnvironmentGetter resolves runtime config from the process
 * environment first, then falls back to repo-root `.env` files for
 * source-based local development.
 */
func repositoryEnvironmentGetter(getEnv func(string) string) func(string) string {
	fileValues := loadRepositoryEnvFiles()

	return func(key string) string {
		if value := getEnv(key); value != "" {
			return value
		}
		return fileValues[key]
	}
}

/**
 * loadRepositoryEnvFiles loads `.env` followed by `.env.local` from the current
 * working directory so root-run local development can share one env surface.
 */
func loadRepositoryEnvFiles() map[string]string {
	values := map[string]string{}
	for _, filePath := range []string{".env", ".env.local"} {
		mergeEnvFile(values, filePath)
	}
	return values
}

/**
 * mergeEnvFile parses a simple dotenv file and merges it into `target`.
 */
func mergeEnvFile(target map[string]string, filePath string) {
	file, err := os.Open(filePath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		line = strings.TrimPrefix(line, "export ")
		key, value, found := strings.Cut(line, "=")
		if !found {
			continue
		}

		key = strings.TrimSpace(key)
		if key == "" {
			continue
		}

		value = strings.TrimSpace(value)
		value = strings.Trim(value, `"'`)
		target[key] = value
	}
}
