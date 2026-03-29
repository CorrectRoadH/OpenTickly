package httpapp

import (
	"strings"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/oapi-codegen/echo-middleware"
)

const sessionCookieName = "opentoggl_session"

type ListProjectsRequest struct {
	WorkspaceID *int64  `json:"workspace_id"`
	Status      *string `json:"status"`
}

func NewGeneratedWebRouteRegistrar(handler webapi.ServerInterface, middlewares ...echo.MiddlewareFunc) (RouteRegistrar, error) {
	swagger, err := webapi.GetSwagger()
	if err != nil {
		return nil, err
	}

	swagger.Servers = nil
	validator := echomiddleware.OapiRequestValidator(swagger)

	return func(server *echo.Echo) {
		group := server.Group("")
		group.Use(validator)
		for _, mw := range middlewares {
			group.Use(mw)
		}
		webapi.RegisterHandlers(group, handler)
	}, nil
}

func sessionID(context echo.Context) string {
	cookie, err := context.Cookie(sessionCookieName)
	if err == nil {
		return cookie.Value
	}

	raw := context.Request().Header.Get("Cookie")
	if raw == "" {
		return ""
	}
	parts := strings.Split(raw, ";")
	for _, part := range parts {
		p := strings.TrimSpace(part)
		if strings.HasPrefix(p, sessionCookieName+"=") {
			return strings.TrimPrefix(p, sessionCookieName+"=")
		}
	}
	return ""
}
