package publicapi

import (
	"errors"
	"net/http"
	"time"

	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

// PostOrganizationGroup creates a group under the organization.
func (handler *Handler) PostOrganizationGroup(ctx echo.Context) error {
	organization, requester, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}

	var payload publictrackapi.GroupPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	group, groupErr := handler.catalog.CreateGroup(ctx.Request().Context(), catalogapplication.CreateGroupCommand{
		OrganizationID: int64(organization.ID),
		CreatedBy:      requester.ID,
		Name:           lo.FromPtr(payload.Name),
	})
	if groupErr != nil {
		if errors.Is(groupErr, catalogapplication.ErrGroupNameTaken) {
			return echo.NewHTTPError(http.StatusConflict, groupErr.Error()).SetInternal(groupErr)
		}
		return echo.NewHTTPError(http.StatusInternalServerError, groupErr.Error()).SetInternal(groupErr)
	}

	// Sync members if provided
	if payload.Users != nil {
		userIDs := intsToInt64s(lo.FromPtr(payload.Users))
		if err := handler.catalog.SyncGroupMembers(ctx.Request().Context(), group.ID, userIDs); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error()).SetInternal(err)
		}
	}

	// Sync workspaces if provided
	if payload.Workspaces != nil {
		wsIDs := intsToInt64s(lo.FromPtr(payload.Workspaces))
		if err := handler.catalog.SyncGroupWorkspaces(ctx.Request().Context(), group.ID, wsIDs); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error()).SetInternal(err)
		}
	}

	return ctx.JSON(http.StatusOK, handler.buildGroupResponse(ctx, group))
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

	if delErr := handler.catalog.DeleteGroup(ctx.Request().Context(), int64(organization.ID), groupID); delErr != nil {
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	}
	return ctx.JSON(http.StatusOK, "OK")
}

// PatchOrganizationGroup updates a group's scalar fields.
func (handler *Handler) PatchOrganizationGroup(ctx echo.Context) error {
	return handler.PutOrganizationGroup(ctx)
}

// PutOrganizationGroup fully replaces a group in the organization.
// Accepts GroupPayload with name, users, and workspaces.
func (handler *Handler) PutOrganizationGroup(ctx echo.Context) error {
	organization, _, err := handler.organizationAggregate(ctx)
	if err != nil {
		return err
	}
	groupID, ok := parsePathID(ctx, "group_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	var payload publictrackapi.GroupPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	// Update name if provided
	name := lo.FromPtr(payload.Name)
	if name == "" {
		// If no name is provided, keep the current name
		current, loadErr := handler.catalog.GetGroup(ctx.Request().Context(), int64(organization.ID), groupID)
		if loadErr != nil {
			return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
		}
		name = current.Name
	}

	group, groupErr := handler.catalog.UpdateGroup(ctx.Request().Context(), int64(organization.ID), groupID, name)
	if groupErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, groupErr.Error()).SetInternal(groupErr)
	}

	// Sync members if provided
	if payload.Users != nil {
		userIDs := intsToInt64s(lo.FromPtr(payload.Users))
		if err := handler.catalog.SyncGroupMembers(ctx.Request().Context(), group.ID, userIDs); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error()).SetInternal(err)
		}
	}

	// Sync workspaces if provided
	if payload.Workspaces != nil {
		wsIDs := intsToInt64s(lo.FromPtr(payload.Workspaces))
		if err := handler.catalog.SyncGroupWorkspaces(ctx.Request().Context(), group.ID, wsIDs); err != nil {
			return echo.NewHTTPError(http.StatusBadRequest, err.Error()).SetInternal(err)
		}
	}

	return ctx.JSON(http.StatusOK, handler.buildGroupResponse(ctx, group))
}

// buildGroupResponse constructs the API response for a group including its members and workspaces.
func (handler *Handler) buildGroupResponse(
	ctx echo.Context,
	group catalogapplication.GroupView,
) publictrackapi.GroupOrganizationGroupResponse {
	permissions := []string{"admin"}
	at := group.CreatedAt.UTC().Format(time.RFC3339)

	members, _ := handler.catalog.ListGroupMembers(ctx.Request().Context(), group.ID)
	workspaces, _ := handler.catalog.ListGroupWorkspaces(ctx.Request().Context(), group.ID)

	users := make([]publictrackapi.GithubComTogglTogglApiInternalModelsOrganizationUserSimple, 0, len(members))
	for _, m := range members {
		users = append(users, publictrackapi.GithubComTogglTogglApiInternalModelsOrganizationUserSimple{
			UserId: lo.ToPtr(int(m.UserID)),
			Name:   lo.ToPtr(m.UserName),
		})
	}

	wsIDs := make([]int, 0, len(workspaces))
	for _, w := range workspaces {
		wsIDs = append(wsIDs, int(w.WorkspaceID))
	}

	return publictrackapi.GroupOrganizationGroupResponse{
		At:          lo.ToPtr(at),
		GroupId:     lo.ToPtr(int(group.ID)),
		Name:        lo.ToPtr(group.Name),
		Permissions: &permissions,
		Users:       &users,
		Workspaces:  &wsIDs,
	}
}

func intsToInt64s(ints []int) []int64 {
	result := make([]int64, len(ints))
	for i, v := range ints {
		result[i] = int64(v)
	}
	return result
}
