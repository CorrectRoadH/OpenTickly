package publicapi

import (
	"net/http"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackFavorites(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	favorites, err := handler.tracking.ListFavorites(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	response := make([]publictrackapi.ModelsFavorite, 0, len(favorites))
	for _, favorite := range favorites {
		response = append(response, favoriteViewToAPI(favorite))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) PostPublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.HandlerfavoritesPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	favorite, err := handler.tracking.UpsertFavorite(ctx.Request().Context(), trackingapplication.UpsertFavoriteCommand{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		ProjectID:   int64PointerFromTrackIntPointer(payload.ProjectId),
		TaskID:      int64PointerFromTrackIntPointer(payload.TaskId),
		Description: payload.Description,
		Billable:    payload.Billable,
		TagIDs:      int64sFromTrackInts(payload.TagIds),
		ReplaceTags: payload.TagIds != nil,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, favoriteViewToAPI(favorite))
}

func (handler *Handler) PutPublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	var payload publictrackapi.FavoritesUpdateFavorite
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	favoriteID := int64PointerFromTrackIntPointer(payload.FavoriteId)
	if favoriteID == nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	favorite, err := handler.tracking.UpsertFavorite(ctx.Request().Context(), trackingapplication.UpsertFavoriteCommand{
		WorkspaceID: workspaceID,
		UserID:      user.ID,
		FavoriteID:  favoriteID,
		ProjectID:   int64PointerFromTrackIntPointer(payload.ProjectId),
		TaskID:      int64PointerFromTrackIntPointer(payload.TaskId),
		Description: payload.Description,
		Billable:    payload.Billable,
		Public:      payload.Public,
		Rank:        payload.Rank,
		TagIDs:      int64sFromTrackInts(payload.TagIds),
		ReplaceTags: payload.TagIds != nil,
	})
	if err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, favoriteViewToAPI(favorite))
}

func (handler *Handler) PostPublicTrackFavoriteSuggestions(ctx echo.Context) error {
	return handler.GetPublicTrackFavorites(ctx)
}

func (handler *Handler) DeletePublicTrackFavorite(ctx echo.Context) error {
	workspaceID, user, err := handler.scope.RequirePublicTrackTrackingScope(ctx)
	if err != nil {
		return err
	}
	favoriteID, ok := parsePathID(ctx, "favorite_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.tracking.DeleteFavorite(ctx.Request().Context(), workspaceID, user.ID, favoriteID); err != nil {
		return writePublicTrackTrackingError(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func favoriteViewToAPI(view trackingapplication.FavoriteView) publictrackapi.ModelsFavorite {
	tagIDs := intsFromInt64s(view.TagIDs)
	return publictrackapi.ModelsFavorite{
		Billable:    lo.ToPtr(view.Billable),
		CreatedAt:   timePointer(view.CreatedAt),
		DeletedAt:   timePointerValue(view.DeletedAt),
		Description: lo.ToPtr(view.Description),
		FavoriteId:  lo.ToPtr(int(view.ID)),
		ProjectId:   intPointerFromInt64Pointer(view.ProjectID),
		Public:      lo.ToPtr(view.Public),
		Rank:        lo.ToPtr(view.Rank),
		TagIds:      &tagIDs,
		TaskId:      intPointerFromInt64Pointer(view.TaskID),
		UserId:      lo.ToPtr(int(view.UserID)),
		WorkspaceId: lo.ToPtr(int(view.WorkspaceID)),
	}
}
