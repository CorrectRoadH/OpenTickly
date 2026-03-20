package httpapp

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
)

const sessionCookieName = "opentoggl_session"

func registerWave1WebRoutes(server *echo.Echo, handlers *Wave1WebHandlers) {
	if handlers == nil {
		return
	}

	server.POST("/web/v1/auth/register", func(context echo.Context) error {
		var request RegisterRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Register(context.Request().Context(), request)
		setSessionCookie(context, response.SessionID, response.StatusCode)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/auth/login", func(context echo.Context) error {
		var request LoginRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Login(context.Request().Context(), request)
		setSessionCookie(context, response.SessionID, response.StatusCode)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/auth/logout", func(context echo.Context) error {
		response := handlers.Logout(context.Request().Context(), sessionID(context))
		clearSessionCookie(context)
		return noContentOrJSON(context, response.StatusCode, response.Body)
	})

	server.GET("/web/v1/session", func(context echo.Context) error {
		response := handlers.GetSession(context.Request().Context(), sessionID(context))
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/profile", func(context echo.Context) error {
		response := handlers.GetProfile(context.Request().Context(), sessionID(context))
		return context.JSON(response.StatusCode, response.Body)
	})

	server.PATCH("/web/v1/profile", func(context echo.Context) error {
		var request ProfileRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.UpdateProfile(context.Request().Context(), sessionID(context), request)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/profile/api-token/reset", func(context echo.Context) error {
		response := handlers.ResetAPIToken(context.Request().Context(), sessionID(context))
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/preferences", func(context echo.Context) error {
		response := handlers.GetPreferences(context.Request().Context(), sessionID(context))
		return context.JSON(response.StatusCode, response.Body)
	})

	server.PATCH("/web/v1/preferences", func(context echo.Context) error {
		var request PreferencesRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.UpdatePreferences(context.Request().Context(), sessionID(context), request)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/organizations/:organizationID/settings", func(context echo.Context) error {
		organizationID, ok := parsePathID(context, "organizationID")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.GetOrganizationSettings(
			context.Request().Context(),
			sessionID(context),
			organizationID,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.PATCH("/web/v1/organizations/:organizationID/settings", func(context echo.Context) error {
		var request OrganizationSettingsRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		organizationID, ok := parsePathID(context, "organizationID")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.UpdateOrganizationSettings(
			context.Request().Context(),
			sessionID(context),
			organizationID,
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/workspaces/:workspaceID/settings", func(context echo.Context) error {
		workspaceID, ok := parsePathID(context, "workspaceID")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.GetWorkspaceSettings(
			context.Request().Context(),
			sessionID(context),
			workspaceID,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.PATCH("/web/v1/workspaces/:workspaceID/settings", func(context echo.Context) error {
		var request WorkspaceSettingsRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		workspaceID, ok := parsePathID(context, "workspaceID")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.UpdateWorkspaceSettings(
			context.Request().Context(),
			sessionID(context),
			workspaceID,
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/workspaces/:workspace_id/capabilities", func(context echo.Context) error {
		workspaceID, ok := parsePathID(context, "workspace_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.GetWorkspaceCapabilities(
			context.Request().Context(),
			sessionID(context),
			workspaceID,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/workspaces/:workspace_id/quota", func(context echo.Context) error {
		workspaceID, ok := parsePathID(context, "workspace_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.GetWorkspaceQuota(
			context.Request().Context(),
			sessionID(context),
			workspaceID,
		)
		if response.StatusCode == http.StatusOK {
			setQuotaWindowHeaders(context, response.Body)
		}
		return context.JSON(response.StatusCode, response.Body)
	})

	registerWave2PlaceholderRoutes(server, handlers)
}

// TODO(wave2-runtime): these routes are outside current Wave 1 OpenAPI scope and
// remain as temporary runtime placeholders until Wave 2 contracts are finalized.
func registerWave2PlaceholderRoutes(server *echo.Echo, handlers *Wave1WebHandlers) {
	server.GET("/web/v1/workspaces/:workspace_id/permissions", func(context echo.Context) error {
		workspaceID, ok := parsePathID(context, "workspace_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.GetWorkspacePermissions(
			context.Request().Context(),
			sessionID(context),
			workspaceID,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.PATCH("/web/v1/workspaces/:workspace_id/permissions", func(context echo.Context) error {
		workspaceID, ok := parsePathID(context, "workspace_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}

		var request WorkspacePermissionsRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}

		response := handlers.Tenant.UpdateWorkspacePermissions(
			context.Request().Context(),
			sessionID(context),
			workspaceID,
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/workspaces/:workspace_id/members", func(context echo.Context) error {
		workspaceID, ok := parsePathID(context, "workspace_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.ListWorkspaceMembers(
			context.Request().Context(),
			sessionID(context),
			workspaceID,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/projects/:project_id/members", func(context echo.Context) error {
		projectID, ok := parsePathID(context, "project_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.ListProjectMembers(
			context.Request().Context(),
			sessionID(context),
			projectID,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/projects/:project_id/members", func(context echo.Context) error {
		projectID, ok := parsePathID(context, "project_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}

		var request ProjectMemberGrantRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}

		response := handlers.Tenant.GrantProjectMember(
			context.Request().Context(),
			sessionID(context),
			projectID,
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.DELETE("/web/v1/projects/:project_id/members/:member_id", func(context echo.Context) error {
		projectID, ok := parsePathID(context, "project_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		memberID, ok := parsePathID(context, "member_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}

		response := handlers.Tenant.RevokeProjectMember(
			context.Request().Context(),
			sessionID(context),
			projectID,
			memberID,
		)
		return noContentOrJSON(context, response.StatusCode, response.Body)
	})

	server.POST("/web/v1/workspaces/:workspace_id/members/invitations", func(context echo.Context) error {
		workspaceID, ok := parsePathID(context, "workspace_id")
		if !ok {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}

		var request WorkspaceMemberInvitationRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}

		response := handlers.Tenant.InviteWorkspaceMember(
			context.Request().Context(),
			sessionID(context),
			workspaceID,
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/projects", func(context echo.Context) error {
		var request ListProjectsRequest
		if workspaceIDValue := context.QueryParam("workspace_id"); workspaceIDValue != "" {
			workspaceID, err := strconv.ParseInt(workspaceIDValue, 10, 64)
			if err != nil {
				return context.JSON(http.StatusBadRequest, "Bad Request")
			}
			request.WorkspaceID = &workspaceID
		}
		response := handlers.Tenant.ListProjects(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/projects", func(context echo.Context) error {
		var request ProjectCreateRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.CreateProject(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/clients", func(context echo.Context) error {
		var request ListProjectsRequest
		if workspaceIDValue := context.QueryParam("workspace_id"); workspaceIDValue != "" {
			workspaceID, err := strconv.ParseInt(workspaceIDValue, 10, 64)
			if err != nil {
				return context.JSON(http.StatusBadRequest, "Bad Request")
			}
			request.WorkspaceID = &workspaceID
		}
		response := handlers.Tenant.ListClients(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/clients", func(context echo.Context) error {
		var request ClientCreateRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.CreateClient(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/tasks", func(context echo.Context) error {
		var request ListProjectsRequest
		if workspaceIDValue := context.QueryParam("workspace_id"); workspaceIDValue != "" {
			workspaceID, err := strconv.ParseInt(workspaceIDValue, 10, 64)
			if err != nil {
				return context.JSON(http.StatusBadRequest, "Bad Request")
			}
			request.WorkspaceID = &workspaceID
		}
		response := handlers.Tenant.ListTasks(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/tasks", func(context echo.Context) error {
		var request TaskCreateRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.CreateTask(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/tags", func(context echo.Context) error {
		var request ListProjectsRequest
		if workspaceIDValue := context.QueryParam("workspace_id"); workspaceIDValue != "" {
			workspaceID, err := strconv.ParseInt(workspaceIDValue, 10, 64)
			if err != nil {
				return context.JSON(http.StatusBadRequest, "Bad Request")
			}
			request.WorkspaceID = &workspaceID
		}
		response := handlers.Tenant.ListTags(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/tags", func(context echo.Context) error {
		var request TagCreateRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.CreateTag(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.GET("/web/v1/groups", func(context echo.Context) error {
		var request ListProjectsRequest
		if workspaceIDValue := context.QueryParam("workspace_id"); workspaceIDValue != "" {
			workspaceID, err := strconv.ParseInt(workspaceIDValue, 10, 64)
			if err != nil {
				return context.JSON(http.StatusBadRequest, "Bad Request")
			}
			request.WorkspaceID = &workspaceID
		}
		response := handlers.Tenant.ListGroups(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})

	server.POST("/web/v1/groups", func(context echo.Context) error {
		var request GroupCreateRequest
		if err := context.Bind(&request); err != nil {
			return context.JSON(http.StatusBadRequest, "Bad Request")
		}
		response := handlers.Tenant.CreateGroup(
			context.Request().Context(),
			sessionID(context),
			request,
		)
		return context.JSON(response.StatusCode, response.Body)
	})
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
	WorkspaceID *int64 `json:"workspace_id"`
}
