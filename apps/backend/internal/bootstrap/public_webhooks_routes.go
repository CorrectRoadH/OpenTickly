package bootstrap

import (
	"context"
	"net/http"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	publicwebhooksapi "opentoggl/backend/apps/backend/internal/http/generated/publicwebhooks"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/oapi-codegen/echo-middleware"
)

func newPublicWebhooksRoutes(handlers *routeHandlers) (httpapp.RouteRegistrar, error) {
	swagger, err := publicwebhooksapi.GetSwagger()
	if err != nil {
		return nil, err
	}

	swagger = withAbsoluteTrackPaths(swagger, "/webhooks/api/v1")
	// Remove security requirements so the OAPI validator doesn't reject
	// cookie-based requests. Auth is handled by publicTrackUser in the
	// AuthenticationFunc callback, which supports both cookies and BasicAuth.
	swagger.Security = openapi3.SecurityRequirements{}
	for _, pathItem := range swagger.Paths.Map() {
		for _, op := range pathItem.Operations() {
			op.Security = &openapi3.SecurityRequirements{}
		}
	}
	validator := echomiddleware.OapiRequestValidatorWithOptions(swagger, &echomiddleware.Options{
		Options: openapi3filter.Options{
			AuthenticationFunc: func(ctx context.Context, input *openapi3filter.AuthenticationInput) error {
				echoContext := echomiddleware.GetEchoContext(ctx)
				if echoContext == nil {
					return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
				}
				_, err := handlers.publicTrackUser(echoContext)
				return err
			},
		},
	})

	return func(server *echo.Echo) {
		group := server.Group("/webhooks/api/v1")
		group.Use(validator)
		publicwebhooksapi.RegisterHandlers(group, newPublicWebhooksOpenAPIServer(handlers))
	}, nil
}
