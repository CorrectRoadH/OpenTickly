package publicapi

import (
	"errors"
	"net/http"
	"strings"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"

	"github.com/labstack/echo/v4"
)

func (handler *Handler) PatchWorkspaceProjects(ctx echo.Context) error {
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

	rawIDs := strings.TrimSpace(ctx.Param("project_ids"))
	projectIDs, parseErr := parseCSVInt64s(rawIDs)
	if parseErr != nil || len(projectIDs) == 0 {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var payload []projectPatchInput
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	commands := make([]catalogapplication.PatchProjectCommand, 0, len(projectIDs))
	for _, projectID := range projectIDs {
		commands = append(commands, catalogapplication.PatchProjectCommand{
			WorkspaceID: workspaceID,
			ProjectID:   projectID,
		})
	}

	successIDs, err := handler.catalog.PatchProjects(ctx.Request().Context(), workspaceID, projectIDs, commands)
	if err != nil {
		if errors.Is(err, catalogapplication.ErrProjectNotFound) {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found")
		}
		return writePublicTrackCatalogError(ctx, err)
	}

	result := make([]int, 0, len(successIDs))
	for _, id := range successIDs {
		result = append(result, int(id))
	}
	return ctx.JSON(http.StatusOK, map[string][]int{"success": result})
}

func (handler *Handler) PostWorkspacesWorkspaceIdProjectsBillableAmounts(ctx echo.Context) error {
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

	return ctx.JSON(http.StatusOK, []any{})
}

type projectPatchInput struct {
	ProjectID *int64  `json:"project_id,omitempty"`
	Op        string  `json:"op"`
	Name      *string `json:"name,omitempty"`
	ClientID  *int64  `json:"client_id,omitempty"`
	Active    *bool   `json:"active,omitempty"`
	Template  *bool   `json:"template,omitempty"`
	Recurring *bool   `json:"recurring,omitempty"`
}

// ConvertPatchInputToCommand converts a projectPatchInput to a PatchProjectCommand.
// Note: Op can be "delete", "replace", etc. The command's fields are only applied
// when Op indicates a replace operation.
func ConvertPatchInputToCommand(projectID int64, workspaceID int64, input projectPatchInput) catalogapplication.PatchProjectCommand {
	return catalogapplication.PatchProjectCommand{
		WorkspaceID: workspaceID,
		ProjectID:   projectID,
		Name:        input.Name,
		ClientID:    input.ClientID,
		Active:      input.Active,
		Template:    input.Template,
		Recurring:   input.Recurring,
	}
}
