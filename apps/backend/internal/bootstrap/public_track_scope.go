package bootstrap

import (
	"net/http"
	"strconv"
	"strings"

	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/labstack/echo/v4"
)

func (handlers *routeHandlers) RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error) {
	return handlers.publicTrackUser(ctx)
}

func (handlers *routeHandlers) requirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error) {
	return handlers.RequirePublicTrackUser(ctx)
}

func (handlers *routeHandlers) RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error {
	home, err := handlers.requirePublicTrackHome(ctx)
	if err != nil {
		return err
	}
	if home.workspaceID != workspaceID {
		return echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	return nil
}

func (handlers *routeHandlers) requirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error {
	return handlers.RequirePublicTrackWorkspace(ctx, workspaceID)
}

func (handlers *routeHandlers) RequirePublicTrackHome(
	ctx echo.Context,
) (organizationID int64, workspaceID int64, err error) {
	home, err := handlers.requirePublicTrackHome(ctx)
	if err != nil {
		return 0, 0, err
	}
	return home.organizationID, home.workspaceID, nil
}

func (handlers *routeHandlers) RequirePublicTrackOrganization(ctx echo.Context, organizationID int64) error {
	home, err := handlers.requirePublicTrackHome(ctx)
	if err != nil {
		return err
	}
	if home.organizationID != organizationID {
		return echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	return nil
}

func (handlers *routeHandlers) requirePublicTrackOrganization(ctx echo.Context, organizationID int64) error {
	return handlers.RequirePublicTrackOrganization(ctx, organizationID)
}

func (handlers *routeHandlers) requirePublicTrackHome(ctx echo.Context) (sessionHome, error) {
	user, err := handlers.requirePublicTrackUser(ctx)
	if err != nil {
		return sessionHome{}, err
	}

	organizationID, workspaceID, found, lookupErr := handlers.userHomes.FindByUserID(ctx.Request().Context(), user.ID)
	switch {
	case lookupErr != nil:
		return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	case !found:
		return sessionHome{}, echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	default:
		return sessionHome{organizationID: organizationID, workspaceID: workspaceID}, nil
	}
}

func (handlers *routeHandlers) RequirePublicTrackTrackingScope(
	ctx echo.Context,
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

func parseOptionalPathID(ctx echo.Context, key string) (int64, bool) {
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
