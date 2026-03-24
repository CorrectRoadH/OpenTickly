package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *publicTrackOpenAPIServer) GetFavorites(ctx echo.Context) error {
	return server.tracking.GetPublicTrackFavorites(ctx)
}

func (server *publicTrackOpenAPIServer) CreateFavorite(ctx echo.Context, params publictrackapi.CreateFavoriteParams) error {
	_ = params
	return server.tracking.PostPublicTrackFavorite(ctx)
}

func (server *publicTrackOpenAPIServer) UpdateFavorite(ctx echo.Context, params publictrackapi.UpdateFavoriteParams) error {
	_ = params
	return server.tracking.PutPublicTrackFavorite(ctx)
}

func (server *publicTrackOpenAPIServer) PostFavoritesSuggestions(ctx echo.Context) error {
	return server.tracking.PostPublicTrackFavoriteSuggestions(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteFavorite(ctx echo.Context, favoriteId int) error {
	_ = favoriteId
	return server.tracking.DeletePublicTrackFavorite(ctx)
}

func (server *publicTrackOpenAPIServer) GetTimeEntries(ctx echo.Context, params publictrackapi.GetTimeEntriesParams) error {
	_ = params
	return server.tracking.GetPublicTrackTimeEntries(ctx)
}

func (server *publicTrackOpenAPIServer) GetTimeEntriesChecklist(ctx echo.Context) error {
	return server.tracking.GetPublicTrackTimeEntriesChecklist(ctx)
}

func (server *publicTrackOpenAPIServer) GetWebTimer(ctx echo.Context) error {
	return server.tracking.GetPublicTrackWebTimer(ctx)
}

func (server *publicTrackOpenAPIServer) GetCurrentTimeEntry(ctx echo.Context) error {
	return server.tracking.GetPublicTrackCurrentTimeEntry(ctx)
}

func (server *publicTrackOpenAPIServer) GetTimeEntryById(
	ctx echo.Context,
	timeEntryId int,
	params publictrackapi.GetTimeEntryByIdParams,
) error {
	_ = timeEntryId
	_ = params
	return server.tracking.GetPublicTrackTimeEntryByID(ctx)
}

func (server *publicTrackOpenAPIServer) GetMeTrackReminders(ctx echo.Context) error {
	return server.tracking.GetPublicTrackMeTrackReminders(ctx)
}

func (server *publicTrackOpenAPIServer) GetSyncServerMeGoals(
	ctx echo.Context,
	params publictrackapi.GetSyncServerMeGoalsParams,
) error {
	_ = params
	return server.tracking.GetPublicTrackSyncGoals(ctx)
}

func (server *publicTrackOpenAPIServer) GetExpense(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.GetPublicTrackExpenses(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteTimeline(ctx echo.Context) error {
	return server.tracking.DeletePublicTrackTimeline(ctx)
}

func (server *publicTrackOpenAPIServer) GetTimeline(
	ctx echo.Context,
	params publictrackapi.GetTimelineParams,
) error {
	_ = params
	return server.tracking.GetPublicTrackTimeline(ctx)
}

func (server *publicTrackOpenAPIServer) PostTimeline(ctx echo.Context) error {
	return server.tracking.PostPublicTrackTimeline(ctx)
}

func (server *publicTrackOpenAPIServer) PostExpense(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.PostPublicTrackExpense(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceFavorites(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.GetPublicTrackFavorites(ctx)
}

func (server *publicTrackOpenAPIServer) CreateWorkspaceFavorite(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.CreateWorkspaceFavoriteParams,
) error {
	_ = workspaceId
	_ = params
	return server.tracking.PostPublicTrackFavorite(ctx)
}

func (server *publicTrackOpenAPIServer) UpdateWorkspaceFavorite(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.UpdateWorkspaceFavoriteParams,
) error {
	_ = workspaceId
	_ = params
	return server.tracking.PutPublicTrackFavorite(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceFavoritesSuggestions(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.PostPublicTrackFavoriteSuggestions(ctx)
}

func (server *publicTrackOpenAPIServer) WorkspaceDeleteFavorite(
	ctx echo.Context,
	workspaceId int,
	favoriteId int,
) error {
	_ = workspaceId
	_ = favoriteId
	return server.tracking.DeletePublicTrackFavorite(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspacesWorkspaceIdGoals(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspacesWorkspaceIdGoalsParams,
) error {
	_ = workspaceId
	_ = params
	return server.tracking.GetPublicTrackGoals(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspacesWorkspaceIdGoals(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.PostPublicTrackGoal(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspacesWorkspaceIdGoalsGoalId(
	ctx echo.Context,
	workspaceId int,
	goalId int,
) error {
	_ = workspaceId
	_ = goalId
	return server.tracking.DeletePublicTrackGoal(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspacesWorkspaceIdGoalsGoalId(
	ctx echo.Context,
	workspaceId int,
	goalId int,
) error {
	_ = workspaceId
	_ = goalId
	return server.tracking.GetPublicTrackGoal(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspacesWorkspaceIdGoalsGoalId(
	ctx echo.Context,
	workspaceId int,
	goalId int,
) error {
	_ = workspaceId
	_ = goalId
	return server.tracking.PutPublicTrackGoal(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceTimeEntries(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.PostWorkspaceTimeEntriesParams,
) error {
	_ = workspaceId
	_ = params
	return server.tracking.PostPublicTrackTimeEntry(ctx)
}

func (server *publicTrackOpenAPIServer) PatchTimeEntries(
	ctx echo.Context,
	workspaceId int,
	timeEntryIds []int,
	params publictrackapi.PatchTimeEntriesParams,
) error {
	_ = workspaceId
	_ = timeEntryIds
	_ = params
	return server.tracking.PatchPublicTrackTimeEntries(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceTimeEntries(
	ctx echo.Context,
	workspaceId int,
	timeEntryId int,
) error {
	_ = workspaceId
	_ = timeEntryId
	return server.tracking.DeletePublicTrackTimeEntry(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceTimeEntryHandler(
	ctx echo.Context,
	workspaceId int,
	timeEntryId int,
	params publictrackapi.PutWorkspaceTimeEntryHandlerParams,
) error {
	_ = workspaceId
	_ = timeEntryId
	_ = params
	return server.tracking.PutPublicTrackTimeEntry(ctx)
}

func (server *publicTrackOpenAPIServer) PatchWorkspaceStopTimeEntryHandler(
	ctx echo.Context,
	workspaceId int,
	timeEntryId int,
) error {
	_ = workspaceId
	_ = timeEntryId
	return server.tracking.StopPublicTrackTimeEntry(ctx)
}

func (server *publicTrackOpenAPIServer) GetWorkspaceTrackReminders(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.GetPublicTrackTrackReminders(ctx)
}

func (server *publicTrackOpenAPIServer) PostWorkspaceTrackReminders(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.tracking.PostPublicTrackTrackReminder(ctx)
}

func (server *publicTrackOpenAPIServer) DeleteWorkspaceTrackReminder(
	ctx echo.Context,
	workspaceId int,
	reminderId int,
) error {
	_ = workspaceId
	_ = reminderId
	return server.tracking.DeletePublicTrackTrackReminder(ctx)
}

func (server *publicTrackOpenAPIServer) PutWorkspaceTrackReminder(
	ctx echo.Context,
	workspaceId int,
	reminderId int,
) error {
	_ = workspaceId
	_ = reminderId
	return server.tracking.PutPublicTrackTrackReminder(ctx)
}
