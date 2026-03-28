//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/shared/oapi.yaml -o internal/http/generated/shared/shared.gen.go ../../openapi/opentoggl-shared.openapi.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/web/oapi.yaml -o internal/http/generated/web/web.gen.go ../../openapi/opentoggl-web.openapi.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/import/oapi.yaml -o internal/http/generated/import/import.gen.go ../../openapi/opentoggl-import.openapi.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/admin/oapi.yaml -o internal/http/generated/admin/admin.gen.go ../../openapi/opentoggl-admin.openapi.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/publictrack/oapi.yaml -o internal/http/generated/publictrack/track.gen.go ../../openapi/toggl-track-api-v9.swagger.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/publicreports/oapi.yaml -o internal/http/generated/publicreports/reports.gen.go ../../openapi/toggl-reports-v3.swagger.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/publicwebhooks/oapi.yaml -o internal/http/generated/publicwebhooks/webhooks.gen.go ../../openapi/toggl-webhooks-v1.swagger.json

package main

import (
	"fmt"
	"log/slog"
	"os"

	"opentoggl/backend/apps/backend/internal/bootstrap"
	instanceadmintransport "opentoggl/backend/apps/backend/internal/instance-admin/transport/http/admin"
)

// version is injected at build time via:
//
//	go build -ldflags "-X main.version=$(git describe --tags --always)"
//
// Falls back to "dev" for local development.
var version = "dev"

func main() {
	instanceadmintransport.CurrentVersion = version

	if err := run(os.Args[1:]); err != nil {
		slog.Error("command failed", "error", err)
		os.Exit(1)
	}
}

func run(args []string) error {
	switch commandName(args) {
	case "serve":
		app, err := bootstrap.NewAppFromEnvironment(nil)
		if err != nil {
			return fmt.Errorf("bootstrap api startup: %w", err)
		}

		if err := app.Start(); err != nil {
			return fmt.Errorf("start api startup: %w", err)
		}
		return nil
	case "schema-apply":
		if err := bootstrap.ApplySchemaFromEnvironment(os.Stdout, os.Stderr, nil); err != nil {
			return fmt.Errorf("apply database schema: %w", err)
		}
		return nil
	default:
		return fmt.Errorf("unknown command %q", commandName(args))
	}
}

func commandName(args []string) string {
	if len(args) == 0 {
		return "serve"
	}
	return args[0]
}
