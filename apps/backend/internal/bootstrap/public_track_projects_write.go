package bootstrap

import (
	"errors"
	"net/http"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) postPublicTrackProjects(ctx echo.Context) error {
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

	var request publictrackapi.ProjectPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID := int64PointerFromTrackIntPointer(request.ClientId)
	if clientID == nil {
		clientID = int64PointerFromTrackIntPointer(request.Cid)
	}
	view, err := runtime.catalogApp.CreateProject(ctx.Request().Context(), catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		ClientID:    clientID,
		Name:        stringValue(request.Name),
		Active:      request.Active,
		Template:    request.Template,
		Recurring:   request.Recurring,
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, projectViewToAPI(view))
}

func (runtime *webRuntime) putPublicTrackProject(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ProjectPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	command := catalogapplication.UpdateProjectCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		Name:        request.Name,
		Active:      request.Active,
		Template:    request.Template,
		Recurring:   request.Recurring,
	}
	if request.ClientId != nil || request.Cid != nil {
		command.ClientID = int64PointerFromTrackIntPointer(request.ClientId)
		if command.ClientID == nil {
			command.ClientID = int64PointerFromTrackIntPointer(request.Cid)
		}
	}

	updated, err := runtime.catalogApp.UpdateProject(ctx.Request().Context(), command)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, projectViewToAPI(updated))
}

func (runtime *webRuntime) postPublicTrackPinnedProject(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ProjectsPinnedProjectPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	project, err := runtime.catalogApp.SetProjectPinned(ctx.Request().Context(), catalogapplication.SetProjectPinnedCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		Pinned:      boolValue(request.Pin),
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, projectViewToAPI(project))
}

func (runtime *webRuntime) deletePublicTrackProject(
	ctx echo.Context,
	params publictrackapi.DeleteWorkspaceProjectParams,
) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if mode := strings.TrimSpace(stringValue(params.TeDeletionMode)); mode != "" {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if err := runtime.catalogApp.DeleteProject(ctx.Request().Context(), workspaceID, projectID); err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, projectID)
}
