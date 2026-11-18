package bootstrap

import (
	"net/http"
	"strconv"
	"strings"

	"opentoggl/backend/apps/backend/internal/http/httperror"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"

	"github.com/labstack/echo/v5"
	"github.com/samber/lo"
)

func (handlers *routeHandlers) RequirePublicTrackUser(ctx *echo.Context) (*identityapplication.UserSnapshot, error) {
	return handlers.publicTrackUser(ctx)
}

func (handlers *routeHandlers) requirePublicTrackUser(ctx *echo.Context) (*identityapplication.UserSnapshot, error) {
	return handlers.RequirePublicTrackUser(ctx)
}

func (handlers *routeHandlers) RequirePublicTrackWorkspace(ctx *echo.Context, workspaceID int64) error {
	user, err := handlers.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	workspaces, err := handlers.tenantApp.ListWorkspacesByUserID(ctx.Request().Context(), user.ID)
	if err != nil {
		return httperror.New(http.StatusInternalServerError, "Internal Server Error").WithCause(err)
	}

	_, found := lo.Find(workspaces, func(workspace tenantapplication.WorkspaceView) bool {
		return int64(workspace.ID) == workspaceID
	})
	if found {
		return nil
	}

	return httperror.New(http.StatusForbidden, "User does not have access to this resource.").WithCause(err)
}

func (handlers *routeHandlers) requirePublicTrackWorkspace(ctx *echo.Context, workspaceID int64) error {
	return handlers.RequirePublicTrackWorkspace(ctx, workspaceID)
}

func (handlers *routeHandlers) WorkspaceOrganizationID(ctx *echo.Context, workspaceID int64) (int64, error) {
	user, err := handlers.requirePublicTrackUser(ctx)
	if err != nil {
		return 0, err
	}

	workspaces, err := handlers.tenantApp.ListWorkspacesByUserID(ctx.Request().Context(), user.ID)
	if err != nil {
		return 0, httperror.New(http.StatusInternalServerError, "Internal Server Error").WithCause(err)
	}

	ws, found := lo.Find(workspaces, func(workspace tenantapplication.WorkspaceView) bool {
		return int64(workspace.ID) == workspaceID
	})
	if !found {
		return 0, httperror.New(http.StatusForbidden, "User does not have access to this resource.").WithCause(err)
	}
	return int64(ws.OrganizationID), nil
}

func (handlers *routeHandlers) ListPublicTrackUserWorkspaces(ctx *echo.Context) ([]int64, error) {
	user, err := handlers.requirePublicTrackUser(ctx)
	if err != nil {
		return nil, err
	}
	workspaces, err := handlers.tenantApp.ListWorkspacesByUserID(ctx.Request().Context(), user.ID)
	if err != nil {
		return nil, httperror.New(http.StatusInternalServerError, "Internal Server Error").WithCause(err)
	}
	ids := make([]int64, 0, len(workspaces))
	for _, workspace := range workspaces {
		ids = append(ids, int64(workspace.ID))
	}
	return ids, nil
}

func (handlers *routeHandlers) RequirePublicTrackHome(
	ctx *echo.Context,
) (organizationID int64, workspaceID int64, err error) {
	home, err := handlers.requirePublicTrackHome(ctx)
	if err != nil {
		return 0, 0, err
	}
	return home.organizationID, home.workspaceID, nil
}

func (handlers *routeHandlers) RequirePublicTrackOrganization(ctx *echo.Context, organizationID int64) error {
	user, err := handlers.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	organizations, err := handlers.tenantApp.ListOrganizationsByUserID(ctx.Request().Context(), user.ID)
	if err != nil {
		return httperror.New(http.StatusInternalServerError, "Internal Server Error").WithCause(err)
	}

	_, found := lo.Find(organizations, func(organization tenantapplication.OrganizationView) bool {
		return int64(organization.ID) == organizationID
	})
	if found {
		return nil
	}

	return httperror.New(http.StatusForbidden, "User does not have access to this resource.").WithCause(err)
}

func (handlers *routeHandlers) requirePublicTrackOrganization(ctx *echo.Context, organizationID int64) error {
	return handlers.RequirePublicTrackOrganization(ctx, organizationID)
}

func (handlers *routeHandlers) requirePublicTrackHome(ctx *echo.Context) (sessionHome, error) {
	user, err := handlers.requirePublicTrackUser(ctx)
	if err != nil {
		return sessionHome{}, err
	}

	organizationID, workspaceID, found, lookupErr := handlers.userHomes.FindByUserID(ctx.Request().Context(), user.ID)
	switch {
	case lookupErr != nil:
		return sessionHome{}, httperror.New(http.StatusInternalServerError, "Internal Server Error").WithCause(err)
	case !found:
		return sessionHome{}, httperror.New(http.StatusForbidden, "User does not have access to this resource.").WithCause(err)
	default:
		return sessionHome{organizationID: organizationID, workspaceID: workspaceID}, nil
	}
}

func (handlers *routeHandlers) RequirePublicTrackTrackingScope(
	ctx *echo.Context,
) (int64, *identityapplication.UserSnapshot, error) {
	user, err := handlers.RequirePublicTrackUser(ctx)
	if err != nil {
		return 0, nil, err
	}
	workspaceID, ok := parseOptionalPathID(ctx, "workspace_id")
	if ok {
		if err := handlers.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
			return 0, nil, err
		}
		return workspaceID, user, nil
	}
	home, err := handlers.requirePublicTrackHome(ctx)
	if err != nil {
		return 0, nil, err
	}
	return home.workspaceID, user, nil
}

func parseOptionalPathID(ctx *echo.Context, key string) (int64, bool) {
	value := strings.TrimSpace(ctx.Param(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}
