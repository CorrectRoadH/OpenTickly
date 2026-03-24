package bootstrap

import (
	"context"
	"net/http"

	httpapp "opentoggl/backend/apps/backend/internal/http"
	publicreportsapi "opentoggl/backend/apps/backend/internal/http/generated/publicreports"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/labstack/echo/v4"
	echomiddleware "github.com/oapi-codegen/echo-middleware"
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
	validator := echomiddleware.OapiRequestValidatorWithOptions(swagger, &echomiddleware.Options{
		Options: openapi3filter.Options{
			AuthenticationFunc: func(ctx context.Context, input *openapi3filter.AuthenticationInput) error {
				echoContext := echomiddleware.GetEchoContext(ctx)
				if echoContext == nil {
					return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
				}
				_, err := handlers.publicTrackUser(echoContext)
				return err
			},
		},
	})

	return func(server *echo.Echo) {
		group := server.Group("")
		group.Use(validator)
		publicreportsapi.RegisterHandlers(group, newPublicReportsOpenAPIServer(handlers))
	}, nil
}
