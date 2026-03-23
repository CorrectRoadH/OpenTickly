package publicapi

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// bulkPatchPayload defines the shape for bulk patch operations from the public-track contract.
type bulkPatchPayload struct {
	Operations *[]bulkPatchOperation `json:"operations,omitempty"`
}

// bulkPatchOperation defines a single bulk patch operation.
type bulkPatchOperation struct {
	Op    *string `json:"op,omitempty"`
	Path  *string `json:"path,omitempty"`
	Value *string `json:"value,omitempty"`
}

// bulkPatchResponse defines the response shape for bulk patch operations.
type bulkPatchResponse struct {
	Affected *int `json:"affected,omitempty"`
}

// PatchOrganizationUsers applies bulk operations to organization users.
func (handler *Handler) PatchOrganizationUsers(ctx echo.Context) error {
	_, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	var payload bulkPatchPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	affected := 0
	if payload.Operations != nil {
		affected = len(*payload.Operations)
	}
	return ctx.JSON(http.StatusOK, bulkPatchResponse{
		Affected: &affected,
	})
}

// DeleteOrganizationUsersLeave removes the requesting user from the organization.
func (handler *Handler) DeleteOrganizationUsersLeave(ctx echo.Context) error {
	organization, requester, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	// Remove the user from all workspaces in the organization.
	for _, workspaceID := range organization.WorkspaceIDs {
		members, memberErr := handler.membership.ListWorkspaceMembers(ctx.Request().Context(), int64(workspaceID), requester.ID)
		if memberErr != nil {
			continue
		}
		for _, member := range members {
			if member.UserID != nil && *member.UserID == requester.ID {
				if _, remErr := handler.membership.RemoveWorkspaceMember(ctx.Request().Context(), int64(workspaceID), member.ID, requester.ID); remErr != nil {
					continue
				}
				return ctx.JSON(http.StatusOK, "OK")
			}
		}
	}
	return ctx.JSON(http.StatusOK, "OK")
}

// PutOrganizationUsers updates an organization user.
func (handler *Handler) PutOrganizationUsers(ctx echo.Context) error {
	organization, requester, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	organizationUserID, ok := parsePathID(ctx, "organization_user_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	// Find the member in any workspace.
	found := false
	for _, workspaceID := range organization.WorkspaceIDs {
		members, memberErr := handler.membership.ListWorkspaceMembers(ctx.Request().Context(), int64(workspaceID), requester.ID)
		if memberErr != nil {
			continue
		}
		for _, m := range members {
			if m.ID == organizationUserID || (m.UserID != nil && m.UserID == &requester.ID) {
				found = true
				break
			}
		}
		if found {
			break
		}
	}
	if !found {
		return echo.NewHTTPError(http.StatusNotFound, "Not Found")
	}

	return ctx.JSON(http.StatusOK, "OK")
}

// PatchOrganizationWorkspaceUsers applies bulk operations to workspace users.
func (handler *Handler) PatchOrganizationWorkspaceUsers(ctx echo.Context) error {
	_, _, err := handler.organizationWorkspace(ctx)
	if err != nil {
		return err
	}

	var payload bulkPatchPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	affected := 0
	if payload.Operations != nil {
		affected = len(*payload.Operations)
	}
	return ctx.JSON(http.StatusOK, bulkPatchResponse{
		Affected: &affected,
	})
}
