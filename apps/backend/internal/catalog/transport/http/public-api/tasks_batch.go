package publicapi

import (
	"errors"
	"net/http"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"

	"github.com/labstack/echo/v4"
)

func (handler *Handler) PatchWorkspaceProjectTasks(ctx echo.Context) error {
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

	rawIDs := strings.TrimSpace(ctx.Param("task_ids"))
	taskIDs, parseErr := parseCSVInt64s(rawIDs)
	if parseErr != nil || len(taskIDs) == 0 {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var patches []taskPatchInput
	if err := ctx.Bind(&patches); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	commands := make([]catalogapplication.PatchTaskCommand, 0, len(taskIDs))
	for _, taskID := range taskIDs {
		commands = append(commands, catalogapplication.PatchTaskCommand{
			WorkspaceID: workspaceID,
			ProjectID:   projectID,
			TaskID:      taskID,
		})
	}

	success, err := handler.catalog.PatchTasks(ctx.Request().Context(), workspaceID, projectID, taskIDs, commands)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrTaskNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	successInts := make([]int, 0, len(success))
	for _, id := range success {
		successInts = append(successInts, int(id))
	}
	return ctx.JSON(http.StatusOK, batchSuccessResponse{Success: successInts})
}

type taskPatchInput struct {
	TaskID *int64  `json:"task_id,omitempty"`
	Op     string  `json:"op"`
	Name   *string `json:"name,omitempty"`
	Active *bool   `json:"active,omitempty"`
}
