package bootstrap

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

/**
 * ConfigFromEnvironment returns startup config from environment variables and
 * the canonical repo-root `.env.local` file, while requiring explicit env for
 * network-boundary settings such as PORT.
 */
func ConfigFromEnvironment(getEnv func(string) string) (Config, error) {
	cfg := DefaultConfig()
	if getEnv == nil {
		var err error
		getEnv, err = repositoryEnvironmentGetter(os.Getenv)
		if err != nil {
			return Config{}, err
		}
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
 * repositoryEnvironmentGetter resolves startup config from the process
 * environment first, then falls back to the canonical repo-root `.env.local`
 * file for source-based local development.
 */
func repositoryEnvironmentGetter(getEnv func(string) string) (func(string) string, error) {
	if hasExplicitStartupEnvironment(getEnv) {
		return getEnv, nil
	}

	fileValues, err := loadRepositoryEnvFile()
	if err != nil {
		return nil, err
	}

	return func(key string) string {
		if value := getEnv(key); value != "" {
			return value
		}
		return fileValues[key]
	}, nil
}

/**
 * hasExplicitStartupEnvironment reports whether the process environment already
 * provides the required startup inputs for deployed or otherwise non-local
 * startup paths.
 */
func hasExplicitStartupEnvironment(getEnv func(string) string) bool {
	return strings.TrimSpace(getEnv("PORT")) != "" &&
		strings.TrimSpace(getEnv("DATABASE_URL")) != "" &&
		strings.TrimSpace(getEnv("REDIS_URL")) != ""
}

/**
 * loadRepositoryEnvFile loads the canonical repo-root `.env.local` from the
 * current working directory for root-run local development.
 */
func loadRepositoryEnvFile() (map[string]string, error) {
	values := map[string]string{}
	if err := mergeEnvFile(values, ".env.local", true); err != nil {
		return nil, err
	}
	return values, nil
}

/**
 * mergeEnvFile parses a simple dotenv file and merges it into `target`.
 */
func mergeEnvFile(target map[string]string, filePath string, required bool) error {
	file, err := os.Open(filePath)
	if err != nil {
		if !required && os.IsNotExist(err) {
			return nil
		}
		if required && os.IsNotExist(err) {
			return fmt.Errorf("missing required repo-root %s", filePath)
		}
		return fmt.Errorf("open %s: %w", filePath, err)
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
	if err := scanner.Err(); err != nil {
		return fmt.Errorf("scan %s: %w", filePath, err)
	}
	return nil
}
