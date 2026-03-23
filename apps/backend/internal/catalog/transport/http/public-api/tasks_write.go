package publicapi

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) PostPublicTrackProjectTask(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
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

	var request publictrackapi.TaskPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	task, err := handler.catalog.CreateTask(ctx.Request().Context(), catalogapplication.CreateTaskCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		ProjectID:   &projectID,
		Name:        lo.FromPtr(request.Name),
		Active:      request.Active,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, taskViewToAPI(task))
}

func (handler *Handler) PutPublicTrackProjectTask(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	taskID, ok := parsePathID(ctx, "task_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TaskPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	task, err := handler.catalog.UpdateTask(ctx.Request().Context(), catalogapplication.UpdateTaskCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		TaskID:      taskID,
		Name:        request.Name,
		Active:      request.Active,
	})
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) || errors.Is(err, catalogapplication.ErrTaskNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, taskViewToAPI(task))
}

func (handler *Handler) DeletePublicTrackProjectTask(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	taskID, ok := parsePathID(ctx, "task_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if _, err := handler.scope.RequirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := handler.catalog.DeleteTask(ctx.Request().Context(), workspaceID, projectID, taskID); err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) || errors.Is(err, catalogapplication.ErrTaskNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}
