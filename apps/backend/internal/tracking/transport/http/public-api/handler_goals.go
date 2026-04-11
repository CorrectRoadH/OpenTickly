package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackGoals(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	filter := trackingapplication.ListGoalsFilter{
		UserID:  user.ID,
		Page:    queryInt(ctx, "page", 1),
		PerPage: queryInt(ctx, "per_page", 20),
	}
	if active, ok := queryBool(ctx, "active"); ok {
		filter.Active = &active
	}
	goals, err := handler.tracking.ListGoals(ctx.Request().Context(), workspaceID, filter)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.HandlergoalsAPIResponse, 0, len(goals))
	for _, goal := range goals {
		response = append(response, goalViewToAPI(goal))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	goalID, ok := parsePathID(ctx, "goal_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	goal, err := handler.tracking.GetGoal(ctx.Request().Context(), workspaceID, user.ID, goalID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, goalViewToAPI(goal))
}

func (handler *Handler) PostPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.HandlergoalsCreatePayload
	if err := ctx.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	startDate, err := parseTrackDate(payload.StartDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	endDate, err := parseOptionalTrackDate(payload.EndDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	goal, err := handler.tracking.CreateGoal(ctx.Request().Context(), trackingapplication.CreateGoalCommand{
		WorkspaceID:   workspaceID,
		UserID:        int64ValueOr(user.ID, payload.UserId),
		CreatorUserID: user.ID,
		Name:          lo.FromPtr(payload.Name),
		Billable:      lo.FromPtr(payload.Billable),
		Comparison:    lo.FromPtr(payload.Comparison),
		Recurrence:    lo.FromPtr(payload.Recurrence),
		Icon:          lo.FromPtr(payload.Icon),
		TargetSeconds: intValueOrZero(payload.TargetSeconds),
		StartDate:     startDate,
		EndDate:       endDate,
		ProjectIDs:    int64sFromTrackInts(payload.ProjectIds),
		TaskIDs:       int64sFromTrackInts(payload.TaskIds),
		TagIDs:        int64sFromTrackInts(payload.TagIds),
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, goalViewToAPI(goal))
}

func (handler *Handler) PutPublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	goalID, ok := parsePathID(ctx, "goal_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var payload publictrackapi.HandlergoalsUpdatePayload
	if err := ctx.Bind(&payload); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	endDate, err := parseOptionalTrackDate(payload.EndDate)
	if err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}
	goal, err := handler.tracking.UpdateGoal(ctx.Request().Context(), trackingapplication.UpdateGoalCommand{
		WorkspaceID:   workspaceID,
		GoalID:        goalID,
		UserID:        user.ID,
		Active:        payload.Active,
		Name:          payload.Name,
		Comparison:    payload.Comparison,
		Icon:          payload.Icon,
		TargetSeconds: payload.TargetSeconds,
		EndDate:       endDate,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, goalViewToAPI(goal))
}

func (handler *Handler) DeletePublicTrackGoal(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	goalID, ok := parsePathID(ctx, "goal_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.tracking.DeleteGoal(ctx.Request().Context(), workspaceID, user.ID, goalID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func (handler *Handler) GetPublicTrackSyncGoals(ctx echo.Context) error {
	return handler.GetPublicTrackGoals(ctx)
}

func goalViewToAPI(view trackingapplication.GoalView) publictrackapi.HandlergoalsAPIResponse {
	projectIDs := intsFromInt64s(view.ProjectIDs)
	taskIDs := intsFromInt64s(view.TaskIDs)
	tagIDs := intsFromInt64s(view.TagIDs)
	return publictrackapi.HandlergoalsAPIResponse{
		Active:                          lo.ToPtr(view.Active),
		Billable:                        lo.ToPtr(view.Billable),
		Comparison:                      lo.ToPtr(view.Comparison),
		CreatorUserId:                   lo.ToPtr(int(view.CreatorUserID)),
		CurrentRecurrenceTrackedSeconds: lo.ToPtr(view.CurrentRecurrenceTrackedSeconds),
		EndDate:                         datePointerValue(view.EndDate),
		GoalId:                          lo.ToPtr(int(view.ID)),
		Icon:                            lo.ToPtr(view.Icon),
		Name:                            lo.ToPtr(view.Name),
		ProjectIds:                      &projectIDs,
		Recurrence:                      lo.ToPtr(view.Recurrence),
		StartDate:                       datePointer(view.StartDate),
		TagIds:                          &tagIDs,
		TargetSeconds:                   lo.ToPtr(view.TargetSeconds),
		TaskIds:                         &taskIDs,
		UserId:                          lo.ToPtr(int(view.UserID)),
		WorkspaceId:                     lo.ToPtr(int(view.WorkspaceID)),
	}
}
