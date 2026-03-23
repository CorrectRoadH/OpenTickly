//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/shared/oapi.yaml -o internal/http/generated/shared/shared.gen.go ../../openapi/opentoggl-shared.openapi.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/web/oapi.yaml -o internal/http/generated/web/web.gen.go ../../openapi/opentoggl-web.openapi.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/import/oapi.yaml -o internal/http/generated/import/import.gen.go ../../openapi/opentoggl-import.openapi.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/admin/oapi.yaml -o internal/http/generated/admin/admin.gen.go ../../openapi/opentoggl-admin.openapi.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/publictrack/oapi.yaml -o internal/http/generated/publictrack/track.gen.go ../../openapi/toggl-track-api-v9.swagger.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/publicreports/oapi.yaml -o internal/http/generated/publicreports/reports.gen.go ../../openapi/toggl-reports-v3.swagger.json
//go:generate go run ./internal/http/generated/cmd/oapi-generate -config internal/http/generated/publicwebhooks/oapi.yaml -o internal/http/generated/publicwebhooks/webhooks.gen.go ../../openapi/toggl-webhooks-v1.swagger.json

package main

import (
	"log"

	"opentoggl/backend/apps/backend/internal/bootstrap"
)

func main() {
	app, err := bootstrap.NewAppFromEnvironment(nil)
	if err != nil {
		log.Fatalf("bootstrap api startup: %v", err)
	}

	if err := app.Start(); err != nil {
		log.Fatalf("start api startup: %v", err)
	}
}
