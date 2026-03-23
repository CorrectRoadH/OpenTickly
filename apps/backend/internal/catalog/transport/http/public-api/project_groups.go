package publicapi

import (
	"errors"
	"net/http"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackProjectGroups(ctx echo.Context) error {
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

	rawProjectIDs := strings.TrimSpace(ctx.QueryParam("project_ids"))
	if rawProjectIDs == "" {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectIDs, err := parseCSVInt64s(rawProjectIDs)
	if err != nil || len(projectIDs) == 0 {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	projectGroups, err := handler.catalog.ListProjectGroups(ctx.Request().Context(), workspaceID, projectIDs)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	response := make([]publictrackapi.ModelsProjectGroup, 0, len(projectGroups))
	for _, projectGroup := range projectGroups {
		response = append(response, projectGroupViewToAPI(projectGroup))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) PostPublicTrackProjectGroup(ctx echo.Context) error {
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

	var request publictrackapi.GroupProjectGroupPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	_, err := handler.catalog.CreateProjectGroup(ctx.Request().Context(), catalogapplication.CreateProjectGroupCommand{
		WorkspaceID: workspaceID,
		ProjectID:   int64Value(request.ProjectId),
		GroupID:     int64Value(request.GroupId),
	})
	if err != nil {
		switch {
		case errors.Is(err, catalogapplication.ErrProjectNotFound),
			errors.Is(err, catalogapplication.ErrGroupNotFound):
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		default:
			return writePublicTrackCatalogError(ctx, err)
		}
	}

	return ctx.JSON(http.StatusOK, "Successful operation.")
}

func (handler *Handler) DeletePublicTrackProjectGroup(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectGroupID, ok := parsePathID(ctx, "project_group_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.catalog.DeleteProjectGroup(ctx.Request().Context(), workspaceID, projectGroupID); err != nil {
		if errors.Is(err, catalogapplication.ErrProjectGroupNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, "Successful operation.")
}

func projectGroupViewToAPI(view catalogapplication.ProjectGroupView) publictrackapi.ModelsProjectGroup {
	return publictrackapi.ModelsProjectGroup{
		GroupId: lo.ToPtr(int(view.GroupID)),
		Id:      lo.ToPtr(int(view.ID)),
		Pid:     lo.ToPtr(int(view.ProjectID)),
		Wid:     lo.ToPtr(int(view.WorkspaceID)),
	}
}
