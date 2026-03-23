package publicapi

import (
	"net/http"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

// PostOrganizationGroup creates a group under the organization.
// The group is created in the primary workspace of the organization.
func (handler *Handler) PostOrganizationGroup(ctx echo.Context) error {
	organization, requester, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	var payload publictrackapi.GroupNamePayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	// Create group in the first workspace (primary workspace)
	if len(organization.WorkspaceIDs) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	workspaceID := organization.WorkspaceIDs[0]

	group, groupErr := handler.catalog.CreateGroup(ctx.Request().Context(), catalogapplication.CreateGroupCommand{
		WorkspaceID: int64(workspaceID),
		CreatedBy:   requester.ID,
		Name:        lo.FromPtr(payload.Name),
	})
	if groupErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	permissions := []string{"admin"}
	at := group.CreatedAt.UTC().Format(time.RFC3339)
	return ctx.JSON(http.StatusOK, publictrackapi.GroupOrganizationGroupResponse{
		At:          lo.ToPtr(at),
		GroupId:     lo.ToPtr(int(group.ID)),
		Name:        lo.ToPtr(group.Name),
		Permissions: &permissions,
		Users:       lo.ToPtr([]publictrackapi.GithubComTogglTogglApiInternalModelsOrganizationUserSimple{}),
		Workspaces:  lo.ToPtr([]int{int(workspaceID)}),
	})
}

// DeleteOrganizationGroup removes a group from the organization.
func (handler *Handler) DeleteOrganizationGroup(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	groupID, ok := parsePathID(ctx, "group_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	// Delete group from all workspaces
	for _, workspaceID := range organization.WorkspaceIDs {
		if delErr := handler.catalog.DeleteGroup(ctx.Request().Context(), int64(workspaceID), groupID); delErr != nil {
			// If not found in one workspace, try the next
			continue
		}
		return ctx.JSON(http.StatusOK, "OK")
	}
	return echo.NewHTTPError(http.StatusNotFound, "Not Found")
}

// PatchOrganizationGroup updates a group in the organization.
func (handler *Handler) PatchOrganizationGroup(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	groupID, ok := parsePathID(ctx, "group_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var payload publictrackapi.GroupNamePayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	// Update group in the first workspace (primary workspace)
	if len(organization.WorkspaceIDs) == 0 {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	workspaceID := organization.WorkspaceIDs[0]

	group, groupErr := handler.catalog.UpdateGroup(ctx.Request().Context(), int64(workspaceID), groupID, lo.FromPtr(payload.Name))
	if groupErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	permissions := []string{"admin"}
	at := group.CreatedAt.UTC().Format(time.RFC3339)
	return ctx.JSON(http.StatusOK, publictrackapi.GroupOrganizationGroupResponse{
		At:          lo.ToPtr(at),
		GroupId:     lo.ToPtr(int(group.ID)),
		Name:        lo.ToPtr(group.Name),
		Permissions: &permissions,
		Users:       lo.ToPtr([]publictrackapi.GithubComTogglTogglApiInternalModelsOrganizationUserSimple{}),
		Workspaces:  lo.ToPtr([]int{int(workspaceID)}),
	})
}

// PutOrganizationGroup fully replaces a group in the organization.
func (handler *Handler) PutOrganizationGroup(ctx echo.Context) error {
	return handler.PatchOrganizationGroup(ctx)
}
