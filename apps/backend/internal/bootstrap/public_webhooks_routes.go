package bootstrap

import (
	httpapp "opentoggl/backend/apps/backend/internal/http"
	publicwebhooksapi "opentoggl/backend/apps/backend/internal/http/generated/publicwebhooks"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/labstack/echo/v5"
)

func newPublicWebhooksRoutes(handlers *routeHandlers) (httpapp.RouteRegistrar, error) {
	swagger, err := publicwebhooksapi.GetSwagger()
	if err != nil {
		return nil, err
	}

	swagger = withAbsoluteTrackPaths(swagger, "/webhooks/api/v1")
	// Remove security requirements so the OAPI validator doesn't reject
	// cookie-based requests. The handlers authenticate through publicTrackUser,
	// which supports both cookies and BasicAuth.
	swagger.Security = openapi3.SecurityRequirements{}
	for _, pathItem := range swagger.Paths.Map() {
		for _, op := range pathItem.Operations() {
			op.Security = &openapi3.SecurityRequirements{}
		}
	}
	validator, err := httpapp.NewOpenAPIValidator(swagger, nil, nil)
	if err != nil {
		return nil, err
	}

	return func(server *echo.Echo) {
		group := server.Group("/webhooks/api/v1")
		group.Use(validator)
		publicwebhooksapi.RegisterHandlers(group, newPublicWebhooksOpenAPIServer(handlers))
	}, nil
}
