package bootstrap

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	platformschema "opentoggl/backend/apps/backend/internal/platform/schema"
)

/**
 * ApplySchemaFromEnvironment runs the canonical `pgschema apply` command using
 * the startup `DATABASE_URL` boundary so deployment entrypoints can reconcile
 * schema before binding the HTTP server.
 */
func ApplySchemaFromEnvironment(stdout, stderr io.Writer, getEnv func(string) string) error {
	if getEnv == nil {
		var err error
		getEnv, err = repositoryEnvironmentGetter(os.Getenv)
		if err != nil {
			return err
		}
	}

	databaseURL := strings.TrimSpace(getEnv("DATABASE_URL"))
	if databaseURL == "" {
		return fmt.Errorf("missing required env DATABASE_URL")
	}

	return platformschema.Reconcile(context.Background(), platformschema.ReconcileOptions{
		Mode:        platformschema.ReconcileApply,
		DatabaseURL: databaseURL,
		BaseEnv:     os.Environ(),
		AutoApprove: true,
		Stdout:      stdout,
		Stderr:      stderr,
	})
}
