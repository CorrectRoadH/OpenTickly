package bootstrap

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

/**
 * ConfigFromEnvironment returns runtime config from environment variables and
 * repo-root `.env` files, while requiring explicit env for network-boundary
 * settings such as PORT.
 */
func ConfigFromEnvironment(getEnv func(string) string) (Config, error) {
	cfg := DefaultConfig()
	if getEnv == nil {
		getEnv = repositoryEnvironmentGetter(os.Getenv)
	}

	applyStringOverride(&cfg.ServiceName, getEnv("OPENTOGGL_SERVICE_NAME"))
	if err := applyRequiredPortOverride(&cfg.Server.ListenAddress, getEnv("PORT")); err != nil {
		return Config{}, err
	}
	if err := applyRequiredStringOverride(&cfg.Database.PrimaryDSN, "DATABASE_URL", getEnv("DATABASE_URL")); err != nil {
		return Config{}, err
	}
	if err := applyRequiredStringOverride(&cfg.Redis.Address, "REDIS_URL", getEnv("REDIS_URL")); err != nil {
		return Config{}, err
	}
	applyStringOverride(&cfg.FileStore.Namespace, getEnv("OPENTOGGL_FILESTORE_NAMESPACE"))
	applyStringOverride(&cfg.Jobs.QueueName, getEnv("OPENTOGGL_JOBS_QUEUE_NAME"))

	return withDefaults(cfg), nil
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
 * applyRequiredStringOverride requires a non-empty env and applies it without
 * fallback.
 */
func applyRequiredStringOverride(target *string, envName, value string) error {
	value = strings.TrimSpace(value)
	if value == "" {
		return fmt.Errorf("missing required env %s", envName)
	}
	*target = value
	return nil
}

/**
 * applyRequiredPortOverride requires a PORT env and normalizes it into the
 * canonical backend listen address.
 */
func applyRequiredPortOverride(target *string, value string) error {
	value = strings.TrimSpace(value)
	value = strings.TrimPrefix(value, ":")
	if value == "" {
		return fmt.Errorf("missing required env PORT")
	}
	*target = "0.0.0.0:" + value
	return nil
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
