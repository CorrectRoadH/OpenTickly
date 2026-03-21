package httpapp

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

const sessionCookieName = "opentoggl_session"

func registerWebRoutes(server *echo.Echo, handlers *WebHandlers) {
	if handlers == nil {
		return
	}

	registerGeneratedWebAuthSessionRoutes(server, newGeneratedWebAuthSessionAdapter(handlers))
	registerGeneratedWebProfilePreferencesRoutes(server, newGeneratedWebProfilePreferencesAdapter(handlers))
	registerGeneratedWebOrganizationSettingsRoutes(server, newGeneratedWebOrganizationSettingsAdapter(handlers))
	registerGeneratedWebWorkspaceSettingsRoutes(server, newGeneratedWebWorkspaceSettingsAdapter(handlers))
	registerGeneratedWebWorkspacePermissionsRoutes(server, newGeneratedWebWorkspacePermissionsAdapter(handlers))
	registerGeneratedWebCapabilitiesQuotaRoutes(server, newGeneratedWebCapabilitiesQuotaAdapter(handlers))
	registerGeneratedWebWorkspaceMembersRoutes(server, newGeneratedWebWorkspaceMembersAdapter(handlers))
	registerGeneratedWebProjectsRoutes(server, newGeneratedWebProjectsAdapter(handlers))
	registerGeneratedWebProjectMembersRoutes(server, newGeneratedWebProjectMembersAdapter(handlers))
	registerGeneratedWebClientsRoutes(server, newGeneratedWebClientsAdapter(handlers))
	registerGeneratedWebCatalogMiscRoutes(server, newGeneratedWebCatalogMiscAdapter(handlers))
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

func setSessionCookie(context echo.Context, sessionID string, statusCode int) {
	if sessionID == "" || statusCode >= http.StatusBadRequest {
		return
	}
	context.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
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

func parsePathID(context echo.Context, key string) (int64, bool) {
	value, err := strconv.ParseInt(context.Param(key), 10, 64)
	if err != nil {
		return 0, false
	}
	return value, true
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

func noContentOrJSON(context echo.Context, statusCode int, body any) error {
	if statusCode == http.StatusNoContent {
		return context.NoContent(statusCode)
	}
	return context.JSON(statusCode, body)
}

type ListProjectsRequest struct {
	WorkspaceID *int64  `json:"workspace_id"`
	Status      *string `json:"status"`
}
