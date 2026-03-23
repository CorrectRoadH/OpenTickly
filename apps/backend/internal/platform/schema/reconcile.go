package schema

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"os"
	"os/exec"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
)

type ReconcileMode string

const (
	ReconcilePlan  ReconcileMode = "plan"
	ReconcileApply ReconcileMode = "apply"
)

var reconcileEnvironmentKeys = []string{
	"PGHOST",
	"PGPORT",
	"PGDATABASE",
	"PGUSER",
	"PGPASSWORD",
	"PGSSLMODE",
}

type ReconcileOptions struct {
	Binary      string
	Mode        ReconcileMode
	DatabaseURL string
	BaseEnv     []string
	AutoApprove bool
	Stdout      io.Writer
	Stderr      io.Writer
}

type Command struct {
	Binary     string
	Args       []string
	Env        []string
	SchemaPath string
}

/**
 * PrepareReconcileCommand derives the canonical `pgschema plan/apply` command
 * from the repository schema path and startup `DATABASE_URL`.
 */
func PrepareReconcileCommand(options ReconcileOptions) (Command, error) {
	mode, err := normalizeReconcileMode(options.Mode)
	if err != nil {
		return Command{}, err
	}

	environment, err := reconcileEnvironment(options.DatabaseURL, options.BaseEnv)
	if err != nil {
		return Command{}, err
	}

	binary := strings.TrimSpace(options.Binary)
	if binary == "" {
		binary = "pgschema"
	}

	schemaPath := Path()
	args := []string{string(mode), "--file", schemaPath}
	if mode == ReconcileApply && options.AutoApprove {
		args = append(args, "--auto-approve")
	}

	return Command{
		Binary:     binary,
		Args:       args,
		Env:        environment,
		SchemaPath: schemaPath,
	}, nil
}

/**
 * Reconcile executes the prepared `pgschema` command so bootstrap wiring can
 * later reuse the same schema path and datasource projection.
 */
func Reconcile(ctx context.Context, options ReconcileOptions) error {
	command, err := PrepareReconcileCommand(options)
	if err != nil {
		return err
	}

	cmd := exec.CommandContext(ctx, command.Binary, command.Args...)
	cmd.Env = command.Env
	cmd.Stdout = options.Stdout
	cmd.Stderr = options.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("run %s %s: %w", command.Binary, strings.Join(command.Args, " "), err)
	}

	return nil
}

/**
 * normalizeReconcileMode accepts only the canonical `plan` and `apply`
 * pgschema operations used by the backend startup flow.
 */
func normalizeReconcileMode(mode ReconcileMode) (ReconcileMode, error) {
	switch mode {
	case ReconcilePlan, ReconcileApply:
		return mode, nil
	default:
		return "", fmt.Errorf("unsupported schema reconcile mode %q", mode)
	}
}

/**
 * reconcileEnvironment projects the startup `DATABASE_URL` into the `PG*`
 * variables expected by `pgschema`, while preserving unrelated process env.
 */
func reconcileEnvironment(databaseURL string, baseEnv []string) ([]string, error) {
	config, err := pgconn.ParseConfig(strings.TrimSpace(databaseURL))
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL for pgschema: %w", err)
	}

	overrides := map[string]string{
		"PGHOST":     config.Host,
		"PGPORT":     strconv.FormatUint(uint64(config.Port), 10),
		"PGDATABASE": config.Database,
		"PGUSER":     config.User,
		"PGPASSWORD": config.Password,
	}
	if sslMode := extractSSLMode(databaseURL); sslMode != "" {
		overrides["PGSSLMODE"] = sslMode
	}

	if baseEnv == nil {
		baseEnv = os.Environ()
	}

	return mergeEnvironment(baseEnv, overrides), nil
}

/**
 * extractSSLMode keeps an explicit `sslmode` setting aligned between
 * `DATABASE_URL` and the derived `PGSSLMODE` env when present.
 */
func extractSSLMode(databaseURL string) string {
	trimmed := strings.TrimSpace(databaseURL)
	if trimmed == "" {
		return ""
	}

	if strings.HasPrefix(trimmed, "postgres://") || strings.HasPrefix(trimmed, "postgresql://") {
		parsedURL, err := url.Parse(trimmed)
		if err == nil {
			return parsedURL.Query().Get("sslmode")
		}
	}

	for _, field := range strings.Fields(trimmed) {
		key, value, found := strings.Cut(field, "=")
		if found && strings.EqualFold(key, "sslmode") {
			return value
		}
	}

	return ""
}

/**
 * mergeEnvironment applies deterministic `PG*` overrides without discarding the
 * caller's unrelated environment variables.
 */
func mergeEnvironment(baseEnv []string, overrides map[string]string) []string {
	merged := append([]string(nil), baseEnv...)
	indexes := make(map[string]int, len(merged))
	for index, entry := range merged {
		key, _, found := strings.Cut(entry, "=")
		if found && key != "" {
			indexes[key] = index
		}
	}

	for _, key := range reconcileEnvironmentKeys {
		value, ok := overrides[key]
		if !ok {
			continue
		}

		entry := key + "=" + value
		if index, exists := indexes[key]; exists {
			merged[index] = entry
			continue
		}

		indexes[key] = len(merged)
		merged = append(merged, entry)
	}

	return merged
}
