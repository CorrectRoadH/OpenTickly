package bootstrap

import (
	"net/http"

	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"

	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) requirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error) {
	return runtime.publicTrackUser(ctx)
}

func (runtime *webRuntime) requirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error {
	home, err := runtime.requirePublicTrackHome(ctx)
	if err != nil {
		return err
	}
	if home.workspaceID != workspaceID {
		return echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	return nil
}

func (runtime *webRuntime) requirePublicTrackOrganization(ctx echo.Context, organizationID int64) error {
	home, err := runtime.requirePublicTrackHome(ctx)
	if err != nil {
		return err
	}
	if home.organizationID != organizationID {
		return echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	}
	return nil
}

func (runtime *webRuntime) requirePublicTrackHome(ctx echo.Context) (sessionHome, error) {
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return sessionHome{}, err
	}

	organizationID, workspaceID, found, lookupErr := runtime.userHomes.FindByUserID(ctx.Request().Context(), user.ID)
	switch {
	case lookupErr != nil:
		return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	case !found:
		return sessionHome{}, echo.NewHTTPError(http.StatusForbidden, "User does not have access to this resource.")
	default:
		return sessionHome{organizationID: organizationID, workspaceID: workspaceID}, nil
	}
}
