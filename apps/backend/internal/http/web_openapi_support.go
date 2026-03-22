package httpapp

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/oapi-codegen/echo-middleware"
)

const sessionCookieName = "opentoggl_session"

type ListProjectsRequest struct {
	WorkspaceID *int64  `json:"workspace_id"`
	Status      *string `json:"status"`
}

func NewGeneratedWebRouteRegistrar(handler webapi.ServerInterface) (RouteRegistrar, error) {
	swagger, err := webapi.GetSwagger()
	if err != nil {
		return nil, err
	}

	swagger.Servers = nil
	validator := echomiddleware.OapiRequestValidator(swagger)

	return func(server *echo.Echo) {
		group := server.Group("")
		group.Use(validator)
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

func writeWebResponse(context echo.Context, response WebResponse) error {
	if response.SessionID != "" && response.StatusCode < http.StatusBadRequest {
		setSessionCookie(context, response.SessionID)
	}
	if response.StatusCode == http.StatusNoContent {
		if response.SessionID == "" {
			clearSessionCookie(context)
		}
		return context.NoContent(response.StatusCode)
	}
	return context.JSON(response.StatusCode, response.Body)
}

func setSessionCookie(context echo.Context, value string) {
	context.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    value,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
	})
}

func clearSessionCookie(context echo.Context) {
	context.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		HttpOnly: true,
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

func setQuotaWindowHeaders(context echo.Context, body any) {
	quota, ok := body.(map[string]any)
	if !ok {
		return
	}

	setQuotaHeader(context.Response().Header(), "X-OpenToggl-Quota-Remaining", quota["remaining"])
	setQuotaHeader(context.Response().Header(), "X-OpenToggl-Quota-Reset-In-Secs", quota["resets_in_secs"])
	setQuotaHeader(context.Response().Header(), "X-OpenToggl-Quota-Total", quota["total"])
}

func setQuotaHeader(headers http.Header, name string, value any) {
	switch typed := value.(type) {
	case int:
		headers.Set(name, strconv.Itoa(typed))
	case int64:
		headers.Set(name, strconv.FormatInt(typed, 10))
	case float64:
		headers.Set(name, strconv.FormatInt(int64(typed), 10))
	}
}

func int64PointerFromIntPointer(value *int) *int64 {
	if value == nil {
		return nil
	}

	converted := int64(*value)
	return &converted
}

func float64PointerFromFloat32Pointer(value *float32) *float64 {
	if value == nil {
		return nil
	}

	converted := float64(*value)
	return &converted
}
