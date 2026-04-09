package publicapi

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackOrganization(ctx echo.Context, organizationID int64) error
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type OrganizationLookup interface {
	GetOrganization(context.Context, tenantdomain.OrganizationID) (tenantapplication.OrganizationView, error)
}

type Handler struct {
	membership    *membershipapplication.Service
	scope         ScopeAuthorizer
	organizations OrganizationLookup
}

func NewHandler(
	membership *membershipapplication.Service,
	scope ScopeAuthorizer,
	organizations OrganizationLookup,
) *Handler {
	return &Handler{
		membership:    membership,
		scope:         scope,
		organizations: organizations,
	}
}

func (handler *Handler) GetPublicTrackWorkspaceUsers(ctx echo.Context) error {
	_, _, members, err := handler.workspaceMembers(ctx)
	if err != nil {
		return err
	}

	excludeDeleted := true
	if value := strings.TrimSpace(ctx.QueryParam("exclude_deleted")); value != "" {
		parsed, parseErr := strconv.ParseBool(value)
		if parseErr != nil {
			return ctx.JSON(http.StatusBadRequest, "Bad Request")
		}
		excludeDeleted = parsed
	}

	response := make([]publictrackapi.ModelsSimpleWorkspaceUser, 0, len(members))
	for _, member := range members {
		if excludeDeleted && member.State == membershipdomain.WorkspaceMemberStateRemoved {
			continue
		}
		response = append(response, simpleWorkspaceUserBody(member))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) PostPublicTrackWorkspaceUsersData(ctx echo.Context) error {
	_, _, members, err := handler.workspaceMembers(ctx)
	if err != nil {
		return err
	}

	var userIDs []int64
	if err := ctx.Bind(&userIDs); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	memberByUserID := make(map[int64]membershipapplication.WorkspaceMemberView, len(members))
	for _, member := range members {
		if member.UserID != nil {
			memberByUserID[*member.UserID] = member
		}
	}

	response := make([]publictrackapi.ModelsSimpleWorkspaceUser, 0, len(userIDs))
	for _, userID := range userIDs {
		member, ok := memberByUserID[userID]
		if !ok {
			continue
		}
		response = append(response, simpleWorkspaceUserBody(member))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackWorkspaceWorkspaceUsers(ctx echo.Context) error {
	if _, parseErr := strconv.ParseBool(ctx.QueryParam("includeIndirect")); parseErr != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	_, _, members, err := handler.workspaceMembers(ctx)
	if err != nil {
		return err
	}

	response := make([]publictrackapi.GithubComTogglTogglApiInternalModelsWorkspaceUser, 0, len(members))
	for _, member := range members {
		response = append(response, workspaceUserBody(member))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) DeletePublicTrackWorkspaceUser(ctx echo.Context) error {
	workspaceID, requester, _, err := handler.workspaceMembers(ctx)
	if err != nil {
		return err
	}
	memberID, ok := parsePathID(ctx, "workspace_user_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if _, err := handler.membership.RemoveWorkspaceMember(
		ctx.Request().Context(),
		workspaceID,
		memberID,
		requester.ID,
	); err != nil {
		return writeMembershipError(err)
	}
	return ctx.NoContent(http.StatusOK)
}

func (handler *Handler) PutPublicTrackWorkspaceWorkspaceUser(ctx echo.Context) error {
	workspaceID, requester, _, err := handler.workspaceMembers(ctx)
	if err != nil {
		return err
	}
	memberID, ok := parsePathID(ctx, "workspace_user_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	return handler.updateWorkspaceMember(ctx, workspaceID, memberID, requester.ID)
}

func (handler *Handler) PutPublicTrackWorkspaceUser(ctx echo.Context) error {
	workspaceID, requester, members, err := handler.workspaceMembers(ctx)
	if err != nil {
		return err
	}
	userID, ok := parsePathID(ctx, "user_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	member, found := findWorkspaceMemberByUserID(members, userID)
	if !found {
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	}
	return handler.updateWorkspaceMember(ctx, workspaceID, member.ID, requester.ID)
}

func (handler *Handler) workspaceMembers(
	ctx echo.Context,
) (int64, *identityapplication.UserSnapshot, []membershipapplication.WorkspaceMemberView, error) {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return 0, nil, nil, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return 0, nil, nil, err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return 0, nil, nil, err
	}
	members, err := handler.membership.ListWorkspaceMembers(ctx.Request().Context(), workspaceID, requester.ID)
	if err != nil {
		return 0, nil, nil, writeMembershipError(err)
	}
	return workspaceID, requester, members, nil
}

func (handler *Handler) updateWorkspaceMember(
	ctx echo.Context,
	workspaceID int64,
	memberID int64,
	requestedBy int64,
) error {
	var payload publictrackapi.GithubComTogglTogglApiInternalServicesWorkspaceUserPayload
	if err := ctx.Bind(&payload); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	if payload.Role != nil || payload.Rate != nil || payload.LaborCost != nil {
		command := membershipapplication.UpdateWorkspaceMemberCommand{
			WorkspaceID: workspaceID,
			MemberID:    memberID,
			RequestedBy: requestedBy,
			HourlyRate:  float64Pointer(payload.Rate),
			LaborCost:   float64Pointer(payload.LaborCost),
		}
		if payload.Role != nil {
			role, err := publicTrackWorkspaceRole(*payload.Role)
			if err != nil {
				return ctx.JSON(http.StatusBadRequest, "Bad Request")
			}
			command.Role = &role
		}
		if _, err := handler.membership.UpdateWorkspaceMember(ctx.Request().Context(), command); err != nil {
			return writeMembershipError(err)
		}
	}

	if payload.Inactive != nil {
		var err error
		if *payload.Inactive {
			_, err = handler.membership.DisableWorkspaceMember(ctx.Request().Context(), workspaceID, memberID, requestedBy)
		} else {
			_, err = handler.membership.RestoreWorkspaceMember(ctx.Request().Context(), workspaceID, memberID, requestedBy)
		}
		if err != nil {
			return writeMembershipError(err)
		}
	}

	return ctx.JSON(http.StatusOK, "OK")
}

func simpleWorkspaceUserBody(member membershipapplication.WorkspaceMemberView) publictrackapi.ModelsSimpleWorkspaceUser {
	return publictrackapi.ModelsSimpleWorkspaceUser{
		Email:    lo.ToPtr(member.Email),
		Fullname: lo.ToPtr(member.FullName),
		Id:       lo.ToPtr(int(memberUserID(member))),
		Inactive: lo.ToPtr(member.State == membershipdomain.WorkspaceMemberStateDisabled || member.State == membershipdomain.WorkspaceMemberStateRemoved),
		IsActive: lo.ToPtr(member.State == membershipdomain.WorkspaceMemberStateJoined || member.State == membershipdomain.WorkspaceMemberStateRestored),
		IsAdmin:  lo.ToPtr(member.Role == membershipdomain.WorkspaceRoleAdmin),
		Role:     lo.ToPtr(string(member.Role)),
	}
}

func workspaceUserBody(member membershipapplication.WorkspaceMemberView) publictrackapi.GithubComTogglTogglApiInternalModelsWorkspaceUser {
	return publictrackapi.GithubComTogglTogglApiInternalModelsWorkspaceUser{
		Active:            lo.ToPtr(member.State == membershipdomain.WorkspaceMemberStateJoined || member.State == membershipdomain.WorkspaceMemberStateRestored),
		Admin:             lo.ToPtr(member.Role == membershipdomain.WorkspaceRoleAdmin),
		Email:             lo.ToPtr(member.Email),
		Id:                lo.ToPtr(int(member.ID)),
		Inactive:          lo.ToPtr(member.State == membershipdomain.WorkspaceMemberStateDisabled || member.State == membershipdomain.WorkspaceMemberStateRemoved),
		IsDirect:          lo.ToPtr(true),
		LaborCost:         float32Pointer(member.LaborCost),
		Name:              lo.ToPtr(member.FullName),
		OrganizationAdmin: lo.ToPtr(false),
		Rate:              float32Pointer(member.HourlyRate),
		Role:              lo.ToPtr(string(member.Role)),
		Uid:               lo.ToPtr(int(memberUserID(member))),
		UserId:            lo.ToPtr(int(memberUserID(member))),
		Wid:               lo.ToPtr(int(member.WorkspaceID)),
		WorkspaceAdmin:    lo.ToPtr(member.Role == membershipdomain.WorkspaceRoleAdmin),
		WorkspaceId:       lo.ToPtr(int(member.WorkspaceID)),
	}
}

func findWorkspaceMemberByUserID(
	members []membershipapplication.WorkspaceMemberView,
	userID int64,
) (membershipapplication.WorkspaceMemberView, bool) {
	for _, member := range members {
		if member.UserID != nil && *member.UserID == userID {
			return member, true
		}
	}
	return membershipapplication.WorkspaceMemberView{}, false
}

func publicTrackWorkspaceRole(value string) (membershipdomain.WorkspaceRole, error) {
	switch strings.TrimSpace(strings.ToLower(value)) {
	case "owner", "admin":
		return membershipdomain.WorkspaceRoleAdmin, nil
	case "user", "member":
		return membershipdomain.WorkspaceRoleMember, nil
	case "projectlead":
		return membershipdomain.WorkspaceRoleProjectLead, nil
	case "teamlead":
		return membershipdomain.WorkspaceRoleTeamLead, nil
	default:
		return "", membershipdomain.ErrInvalidWorkspaceRole
	}
}

func writeMembershipError(err error) error {
	switch {
	case errors.Is(err, membershipapplication.ErrWorkspaceManagerRequired):
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
	case errors.Is(err, membershipapplication.ErrWorkspaceMemberNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	case errors.Is(err, membershipapplication.ErrWorkspaceMemberExists),
		errors.Is(err, membershipapplication.ErrWorkspaceMemberEmailBlank),
		errors.Is(err, membershipdomain.ErrInvalidWorkspaceRole),
		errors.Is(err, membershipdomain.ErrInvalidWorkspaceMemberState),
		errors.Is(err, membershipdomain.ErrNegativeWorkspaceMemberHourlyRate),
		errors.Is(err, membershipdomain.ErrNegativeWorkspaceMemberLaborCost),
		errors.Is(err, membershipdomain.ErrWorkspaceMemberNotInvited),
		errors.Is(err, membershipdomain.ErrWorkspaceMemberCannotDisableFromState),
		errors.Is(err, membershipdomain.ErrWorkspaceMemberAlreadyDisabled),
		errors.Is(err, membershipdomain.ErrWorkspaceMemberNotDisabled),
		errors.Is(err, membershipdomain.ErrWorkspaceMemberRemoved),
		errors.Is(err, membershipdomain.ErrWorkspaceMemberAlreadyRemoved):
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error()).SetInternal(err)
	}
}

func parsePathID(ctx echo.Context, key string) (int64, bool) {
	value, err := strconv.ParseInt(ctx.Param(key), 10, 64)
	if err != nil {
		return 0, false
	}
	return value, true
}

func memberUserID(member membershipapplication.WorkspaceMemberView) int64 {
	if member.UserID == nil {
		return 0
	}
	return *member.UserID
}

func float64Pointer(value *float32) *float64 {
	if value == nil {
		return nil
	}
	return lo.ToPtr(float64(*value))
}

func float32Pointer(value *float64) *float32 {
	if value == nil {
		return nil
	}
	return lo.ToPtr(float32(*value))
}
