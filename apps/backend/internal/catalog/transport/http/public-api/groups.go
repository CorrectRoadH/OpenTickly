package publicapi

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) GetPublicTrackGroups(ctx echo.Context) error {
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

	organizationID, err := handler.scope.WorkspaceOrganizationID(ctx, workspaceID)
	if err != nil {
		return err
	}

	views, err := handler.catalog.ListGroups(ctx.Request().Context(), organizationID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	groups := make([]publictrackapi.GithubComTogglTogglApiInternalModelsGroup, 0, len(views))
	for _, view := range views {
		groups = append(groups, groupViewToAPI(view))
	}
	return ctx.JSON(http.StatusOK, groups)
}

func (handler *Handler) PostPublicTrackGroups(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	organizationID, err := handler.scope.WorkspaceOrganizationID(ctx, workspaceID)
	if err != nil {
		return err
	}

	var request publictrackapi.GroupNamePayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	view, err := handler.catalog.CreateGroup(ctx.Request().Context(), catalogapplication.CreateGroupCommand{
		OrganizationID: organizationID,
		CreatedBy:      user.ID,
		Name:           lo.FromPtr(request.Name),
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, groupViewToAPI(view))
}

func (handler *Handler) PutPublicTrackGroup(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	groupID, ok := parsePathID(ctx, "group_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	organizationID, err := handler.scope.WorkspaceOrganizationID(ctx, workspaceID)
	if err != nil {
		return err
	}

	var request publictrackapi.GroupNamePayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	view, err := handler.catalog.UpdateGroup(ctx.Request().Context(), organizationID, groupID, lo.FromPtr(request.Name))
	if err != nil {
		if errors.Is(err, catalogapplication.ErrGroupNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, groupViewToAPI(view))
}

func (handler *Handler) DeletePublicTrackGroup(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	groupID, ok := parsePathID(ctx, "group_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	organizationID, err := handler.scope.WorkspaceOrganizationID(ctx, workspaceID)
	if err != nil {
		return err
	}

	if err := handler.catalog.DeleteGroup(ctx.Request().Context(), organizationID, groupID); err != nil {
		if errors.Is(err, catalogapplication.ErrGroupNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

func groupViewToAPI(view catalogapplication.GroupView) publictrackapi.GithubComTogglTogglApiInternalModelsGroup {
	return publictrackapi.GithubComTogglTogglApiInternalModelsGroup{
		At:   timePointer(view.CreatedAt),
		Id:   lo.ToPtr(int(view.ID)),
		Name: lo.ToPtr(view.Name),
	}
}
