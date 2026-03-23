package publicapi

import (
	"net/http"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackWorkspaceAllActivities(ctx echo.Context) error {
	workspaceID, since, err := handler.requireDashboardScope(ctx)
	if err != nil {
		return err
	}
	activities, err := handler.tracking.ListWorkspaceDashboardActivities(ctx.Request().Context(), workspaceID, since)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.DashboardAllActivities, 0, len(activities))
	for _, activity := range activities {
		response = append(response, dashboardActivityToAPI(activity))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackWorkspaceTopActivity(ctx echo.Context) error {
	workspaceID, since, err := handler.requireDashboardScope(ctx)
	if err != nil {
		return err
	}
	activities, err := handler.tracking.ListWorkspaceTopActivities(ctx.Request().Context(), workspaceID, since)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.DashboardAllActivities, 0, len(activities))
	for _, activity := range activities {
		response = append(response, dashboardActivityToAPI(activity))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackWorkspaceMostActive(ctx echo.Context) error {
	workspaceID, since, err := handler.requireDashboardScope(ctx)
	if err != nil {
		return err
	}
	users, err := handler.tracking.ListWorkspaceMostActiveUsers(ctx.Request().Context(), workspaceID, since)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ModelsMostActiveUser, 0, len(users))
	for _, user := range users {
		response = append(response, publictrackapi.ModelsMostActiveUser{
			Duration: lo.ToPtr(user.Duration),
			UserId:   lo.ToPtr(int(user.UserID)),
		})
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) requireDashboardScope(ctx echo.Context) (int64, *time.Time, error) {
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return 0, nil, err
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return 0, nil, ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return 0, nil, err
	}

	if sinceValue, ok := queryInt64(ctx, "since"); ok {
		since := time.Unix(sinceValue, 0).UTC()
		return workspaceID, &since, nil
	}
	return workspaceID, nil, nil
}

func dashboardActivityToAPI(activity trackingapplication.DashboardActivityView) publictrackapi.DashboardAllActivities {
	return publictrackapi.DashboardAllActivities{
		Description: lo.ToPtr(activity.Description),
		Duration:    lo.ToPtr(activity.Duration),
		ProjectId:   intPointerFromInt64Pointer(activity.ProjectID),
		Stop:        activity.Stop,
		Tid:         lo.ToPtr(int(activity.ID)),
		UserId:      lo.ToPtr(int(activity.UserID)),
	}
}
