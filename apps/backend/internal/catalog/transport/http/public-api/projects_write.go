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

func (handler *Handler) PostPublicTrackProjects(ctx echo.Context) error {
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

	var request publictrackapi.ProjectPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	clientID := int64PointerFromTrackIntPointer(request.ClientId)
	if clientID == nil {
		clientID = int64PointerFromTrackIntPointer(request.Cid)
	}
	view, err := handler.catalog.CreateProject(ctx.Request().Context(), catalogapplication.CreateProjectCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		ClientID:    clientID,
		Name:        lo.FromPtr(request.Name),
		Active:      request.Active,
		Template:    request.Template,
		Recurring:   request.Recurring,
		Color:       request.Color,
		IsPrivate:   request.IsPrivate,
		Billable:    request.Billable,
	})
	if err != nil {
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, trackProjectResponse{projectViewToAPI(view)})
}

func (handler *Handler) PutPublicTrackProject(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
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
		Color:       request.Color,
		IsPrivate:   request.IsPrivate,
		Billable:    request.Billable,
	}
	if request.ClientId != nil || request.Cid != nil {
		command.ClientID = int64PointerFromTrackIntPointer(request.ClientId)
		if command.ClientID == nil {
			command.ClientID = int64PointerFromTrackIntPointer(request.Cid)
		}
	}

	updated, err := handler.catalog.UpdateProject(ctx.Request().Context(), command)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, trackProjectResponse{projectViewToAPI(updated)})
}

func (handler *Handler) PostPublicTrackPinnedProject(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.ProjectsPinnedProjectPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	project, err := handler.catalog.SetProjectPinned(ctx.Request().Context(), catalogapplication.SetProjectPinnedCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		Pinned:      lo.FromPtr(request.Pin),
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, trackProjectResponse{projectViewToAPI(project)})
}

func (handler *Handler) DeletePublicTrackProject(
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
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	mode := strings.TrimSpace(lo.FromPtr(params.TeDeletionMode))
	if mode == "" {
		mode = "unassign"
	}
	if mode != "unassign" && mode != "delete" {
		return ctx.JSON(http.StatusBadRequest, "teDeletionMode must be 'unassign' or 'delete'")
	}

	// Parse optional reassign_to from query (extension beyond v9 spec).
	var reassignTo *int64
	if raw := ctx.QueryParam("reassign_to"); raw != "" {
		id, parseOk := parseQueryInt64(raw)
		if !parseOk {
			return ctx.JSON(http.StatusBadRequest, "invalid reassign_to")
		}
		reassignTo = &id
	}

	cmd := catalogapplication.DeleteProjectCommand{
		WorkspaceID:    workspaceID,
		ProjectID:      projectID,
		TEDeletionMode: mode,
		ReassignToID:   reassignTo,
	}
	if err := handler.catalog.DeleteProjectWithOptions(ctx.Request().Context(), cmd); err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, projectID)
}
