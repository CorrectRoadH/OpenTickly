package publicapi

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"

	"github.com/labstack/echo/v4"
)

func (handler *Handler) PatchWorkspaceProjectUsersIds(ctx echo.Context) error {
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

	projectUserIDs := make([][2]int64, 0)
	rawIDs := strings.TrimSpace(ctx.Param("project_user_ids"))
	if rawIDs == "" {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	// project_user_ids path param is array format, comma-separated
	idParts := strings.Split(rawIDs, ",")
	for _, part := range idParts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		id, err := strconv.ParseInt(part, 10, 64)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		projectID := id / 1000000
		userID := id % 1000000
		if projectID <= 0 || userID <= 0 {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		projectUserIDs = append(projectUserIDs, [2]int64{projectID, userID})
	}
	if len(projectUserIDs) == 0 {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var patches []projectUserPatchInput
	if err := ctx.Bind(&patches); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	commands := make([]catalogapplication.PatchProjectUserCommand, 0, len(projectUserIDs))
	for _, pair := range projectUserIDs {
		commands = append(commands, catalogapplication.PatchProjectUserCommand{
			WorkspaceID: workspaceID,
			ProjectID:   pair[0],
			UserID:      pair[1],
		})
	}

	successIDs, err := handler.catalog.PatchProjectUsers(ctx.Request().Context(), workspaceID, projectUserIDs, commands)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectUserNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	result := make([]int, 0, len(successIDs))
	for _, pair := range successIDs {
		result = append(result, int(pair[0]*1000000+pair[1]))
	}
	return ctx.JSON(http.StatusOK, map[string][]int{"success": result})
}

type projectUserPatchInput struct {
	ProjectID *int64 `json:"project_id,omitempty"`
	UserID    *int64 `json:"user_id,omitempty"`
	Op        string `json:"op"`
	Role      string `json:"role,omitempty"`
}
