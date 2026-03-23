package bootstrap

import (
	"errors"
	"net/http"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
)

func (runtime *webRuntime) postPublicTrackProjectTask(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	projectID, ok := parsePathID(ctx, "project_id")
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

	var request publictrackapi.TaskPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	task, err := runtime.catalogApp.CreateTask(ctx.Request().Context(), catalogapplication.CreateTaskCommand{
		WorkspaceID: workspaceID,
		CreatedBy:   user.ID,
		ProjectID:   &projectID,
		Name:        stringValue(request.Name),
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

func (runtime *webRuntime) putPublicTrackProjectTask(ctx echo.Context) error {
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
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.TaskPayload
	if err := bindPublicTrackJSON(ctx, &request, false); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	task, err := runtime.catalogApp.UpdateTask(ctx.Request().Context(), catalogapplication.UpdateTaskCommand{
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

func (runtime *webRuntime) deletePublicTrackProjectTask(ctx echo.Context) error {
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
	if _, err := runtime.requirePublicTrackUser(ctx); err != nil {
		return err
	}
	if err := runtime.requirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	if err := runtime.catalogApp.DeleteTask(ctx.Request().Context(), workspaceID, projectID, taskID); err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) || errors.Is(err, catalogapplication.ErrTaskNotFound) {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		return writePublicTrackCatalogError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}
