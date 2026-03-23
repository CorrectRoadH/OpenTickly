package bootstrap

import (
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (server *bootstrapPublicTrackOpenAPIServer) GetFavorites(ctx echo.Context) error {
	return server.runtime.getPublicTrackFavorites(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) CreateFavorite(ctx echo.Context, params publictrackapi.CreateFavoriteParams) error {
	_ = params
	return server.runtime.postPublicTrackFavorite(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) UpdateFavorite(ctx echo.Context, params publictrackapi.UpdateFavoriteParams) error {
	_ = params
	return server.runtime.putPublicTrackFavorite(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostFavoritesSuggestions(ctx echo.Context) error {
	return server.runtime.postPublicTrackFavoriteSuggestions(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteFavorite(ctx echo.Context, favoriteId int) error {
	_ = favoriteId
	return server.runtime.deletePublicTrackFavorite(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetTimeEntries(ctx echo.Context, params publictrackapi.GetTimeEntriesParams) error {
	_ = params
	return server.runtime.getPublicTrackTimeEntries(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetTimeEntriesChecklist(ctx echo.Context) error {
	return server.runtime.getPublicTrackTimeEntriesChecklist(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetCurrentTimeEntry(ctx echo.Context) error {
	return server.runtime.getPublicTrackCurrentTimeEntry(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetTimeEntryById(
	ctx echo.Context,
	timeEntryId int,
	params publictrackapi.GetTimeEntryByIdParams,
) error {
	_ = timeEntryId
	_ = params
	return server.runtime.getPublicTrackTimeEntryByID(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetMeTrackReminders(ctx echo.Context) error {
	return server.runtime.getPublicTrackMeTrackReminders(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetSyncServerMeGoals(
	ctx echo.Context,
	params publictrackapi.GetSyncServerMeGoalsParams,
) error {
	_ = params
	return server.runtime.getPublicTrackSyncGoals(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetExpense(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.getPublicTrackExpenses(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostExpense(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackExpense(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceFavorites(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.getPublicTrackFavorites(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) CreateWorkspaceFavorite(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.CreateWorkspaceFavoriteParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.postPublicTrackFavorite(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) UpdateWorkspaceFavorite(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.UpdateWorkspaceFavoriteParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.putPublicTrackFavorite(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceFavoritesSuggestions(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackFavoriteSuggestions(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) WorkspaceDeleteFavorite(
	ctx echo.Context,
	workspaceId int,
	favoriteId int,
) error {
	_ = workspaceId
	_ = favoriteId
	return server.runtime.deletePublicTrackFavorite(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspacesWorkspaceIdGoals(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.GetWorkspacesWorkspaceIdGoalsParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.getPublicTrackGoals(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspacesWorkspaceIdGoals(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackGoal(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspacesWorkspaceIdGoalsGoalId(
	ctx echo.Context,
	workspaceId int,
	goalId int,
) error {
	_ = workspaceId
	_ = goalId
	return server.runtime.deletePublicTrackGoal(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspacesWorkspaceIdGoalsGoalId(
	ctx echo.Context,
	workspaceId int,
	goalId int,
) error {
	_ = workspaceId
	_ = goalId
	return server.runtime.getPublicTrackGoal(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspacesWorkspaceIdGoalsGoalId(
	ctx echo.Context,
	workspaceId int,
	goalId int,
) error {
	_ = workspaceId
	_ = goalId
	return server.runtime.putPublicTrackGoal(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceTimeEntries(
	ctx echo.Context,
	workspaceId int,
	params publictrackapi.PostWorkspaceTimeEntriesParams,
) error {
	_ = workspaceId
	_ = params
	return server.runtime.postPublicTrackTimeEntry(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PatchTimeEntries(
	ctx echo.Context,
	workspaceId int,
	timeEntryIds string,
	params publictrackapi.PatchTimeEntriesParams,
) error {
	_ = workspaceId
	_ = timeEntryIds
	_ = params
	return server.runtime.patchPublicTrackTimeEntries(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspaceTimeEntries(
	ctx echo.Context,
	workspaceId int,
	timeEntryId int,
) error {
	_ = workspaceId
	_ = timeEntryId
	return server.runtime.deletePublicTrackTimeEntry(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspaceTimeEntryHandler(
	ctx echo.Context,
	workspaceId int,
	timeEntryId int,
	params publictrackapi.PutWorkspaceTimeEntryHandlerParams,
) error {
	_ = workspaceId
	_ = timeEntryId
	_ = params
	return server.runtime.putPublicTrackTimeEntry(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PatchWorkspaceStopTimeEntryHandler(
	ctx echo.Context,
	workspaceId int,
	timeEntryId int,
) error {
	_ = workspaceId
	_ = timeEntryId
	return server.runtime.stopPublicTrackTimeEntry(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) GetWorkspaceTrackReminders(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.getPublicTrackTrackReminders(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PostWorkspaceTrackReminders(ctx echo.Context, workspaceId int) error {
	_ = workspaceId
	return server.runtime.postPublicTrackTrackReminder(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) DeleteWorkspaceTrackReminder(
	ctx echo.Context,
	workspaceId int,
	reminderId int,
) error {
	_ = workspaceId
	_ = reminderId
	return server.runtime.deletePublicTrackTrackReminder(ctx)
}

func (server *bootstrapPublicTrackOpenAPIServer) PutWorkspaceTrackReminder(
	ctx echo.Context,
	workspaceId int,
	reminderId int,
) error {
	_ = workspaceId
	_ = reminderId
	return server.runtime.putPublicTrackTrackReminder(ctx)
}
