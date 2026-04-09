package publicapi

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) PostPublicTrackProjectUser(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ModelsProjectUser
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := handler.catalog.CreateProjectUser(ctx.Request().Context(), catalogapplication.CreateProjectUserCommand{
		WorkspaceID: workspaceID,
		ProjectID:   int64Value(request.ProjectId),
		UserID:      int64Value(request.UserId),
		Manager:     lo.FromPtr(request.Manager),
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, projectUserViewToAPI(view))
}

func (handler *Handler) PutPublicTrackProjectUser(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectUserID, ok := parsePathID(ctx, "project_user_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, userID, ok := parseProjectUserID(projectUserID)
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ModelsProjectUser
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := handler.catalog.UpdateProjectUser(ctx.Request().Context(), catalogapplication.UpdateProjectUserCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		UserID:      userID,
		Manager:     lo.FromPtr(request.Manager),
	})
	if err != nil {
		switch {
		case errors.Is(err, catalogapplication.ErrProjectNotFound),
			errors.Is(err, catalogapplication.ErrProjectUserNotFound):
			return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
		default:
			return writePublicTrackCatalogError(ctx, err)
		}
	}

	return ctx.JSON(http.StatusOK, projectUserViewToAPI(view))
}

func (handler *Handler) DeletePublicTrackProjectUser(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectUserID, ok := parsePathID(ctx, "project_user_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, userID, ok := parseProjectUserID(projectUserID)
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.catalog.DeleteProjectUser(ctx.Request().Context(), workspaceID, projectID, userID); err != nil {
		switch {
		case errors.Is(err, catalogapplication.ErrProjectNotFound),
			errors.Is(err, catalogapplication.ErrProjectUserNotFound):
			return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
		default:
			return writePublicTrackCatalogError(ctx, err)
		}
	}

	return ctx.JSON(http.StatusOK, int(projectUserID))
}

func parseProjectUserID(value int64) (projectID int64, userID int64, ok bool) {
	return catalogapplication.DecodeProjectUserID(value)
}
