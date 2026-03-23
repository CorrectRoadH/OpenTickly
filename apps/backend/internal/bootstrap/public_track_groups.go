package bootstrap

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) getPublicTrackGroups(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	views, err := runtime.catalogApp.ListGroups(ctx.Request().Context(), workspaceID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	groups := make([]publictrackapi.GithubComTogglTogglApiInternalModelsGroup, 0, len(views))
	for _, view := range views {
		groups = append(groups, groupViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, groups)
}

func (runtime *webRuntime) postPublicTrackGroups(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := runtime.requirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.GroupNamePayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := runtime.catalogApp.CreateGroup(ctx.Request().Context(), catalogapplication.CreateGroupCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		Name:        stringValue(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, groupViewToAPI(view))
}

func (runtime *webRuntime) putPublicTrackGroup(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	groupID, ok := parsePathID(ctx, "group_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.GroupNamePayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := runtime.catalogApp.UpdateGroup(ctx.Request().Context(), workspaceID, groupID, stringValue(request.Name))
	if err != nil {
		if errors.Is(err, catalogapplication.ErrGroupNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, groupViewToAPI(view))
}

func (runtime *webRuntime) deletePublicTrackGroup(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	groupID, ok := parsePathID(ctx, "group_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := runtime.catalogApp.DeleteGroup(ctx.Request().Context(), workspaceID, groupID); err != nil {
		if errors.Is(err, catalogapplication.ErrGroupNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func groupViewToAPI(view catalogapplication.GroupView) publictrackapi.GithubComTogglTogglApiInternalModelsGroup {
	return publictrackapi.GithubComTogglTogglApiInternalModelsGroup{
		At:          timePointer(view.CreatedAt),
		HasUsers:    boolPointer(view.HasUsers),
		Id:          intPointer(view.ID),
		Name:        stringPointer(view.Name),
		WorkspaceId: intPointer(view.WorkspaceID),
	}
}
