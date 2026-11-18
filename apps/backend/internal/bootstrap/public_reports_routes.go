package bootstrap

import (
	httpapp "opentoggl/backend/apps/backend/internal/http"
	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/labstack/echo/v5"
)

func newPublicReportsRoutes(handlers *routeHandlers) (httpapp.RouteRegistrar, error) {
	swagger, err := publicreportsapi.GetSwagger()
	if err != nil {
		return nil, err
	}

	swagger.Servers = nil
	if swagger.Components.SecuritySchemes == nil {
		swagger.Components.SecuritySchemes = openapi3.SecuritySchemes{}
	}
	swagger.Components.SecuritySchemes["BasicAuth"] = &openapi3.SecuritySchemeRef{
		Value: openapi3.NewSecurityScheme().WithType("http").WithScheme("basic"),
	}
	// The upstream export operations reference this undeclared scheme. Both
	// names use the existing public Track authentication below.
	swagger.Components.SecuritySchemes["APIKeyAuth"] = &openapi3.SecuritySchemeRef{
		Value: openapi3.NewSecurityScheme().WithType("http").WithScheme("basic"),
	}
	validator, err := httpapp.NewOpenAPIValidator(swagger, nil, handlers.authenticatePublicTrack)
	if err != nil {
		return nil, err
	}

	return func(server *echo.Echo) {
		group := server.Group("")
		group.Use(validator)
		publicreportsapi.RegisterHandlers(group, newPublicReportsOpenAPIServer(handlers))
	}, nil
}
