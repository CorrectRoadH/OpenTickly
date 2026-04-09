package bootstrap

import (
	"context"
	"errors"
	"net/http"

	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"

	"github.com/labstack/echo/v4"
)

func (handlers *routeHandlers) listWorkspaceMembers(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}
	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden")
	}

	members, err := handlers.membershipApp.ListWorkspaceMembers(ctx.Request().Context(), workspaceID, user.ID)
	if err != nil {
		return writeMembershipError(err)
	}
	return ctx.JSON(http.StatusOK, webapi.WorkspaceMembersEnvelope{Members: membershipBodies(members)})
}

func (handlers *routeHandlers) inviteWorkspaceMember(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request struct {
		Email string  `json:"email"`
		Role  *string `json:"role"`
	}
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden")
	}

	command := membershipapplication.InviteWorkspaceMemberCommand{
		WorkspaceID: workspaceID,
		RequestedBy: user.ID,
		Email:       request.Email,
	}
	if request.Role != nil {
		role := membershipdomain.WorkspaceRole(*request.Role)
		command.Role = &role
	}
	if _, err := handlers.membershipApp.InviteWorkspaceMember(ctx.Request().Context(), command); err != nil {
		return writeMembershipError(err)
	}
	return ctx.JSON(http.StatusCreated, struct{}{})
}

func (handlers *routeHandlers) disableWorkspaceMember(ctx echo.Context) error {
	return handlers.transitionWorkspaceMember(ctx, func(requestCtx context.Context, workspaceID int64, memberID int64, userID int64) (membershipapplication.WorkspaceMemberView, error) {
		return handlers.membershipApp.DisableWorkspaceMember(requestCtx, workspaceID, memberID, userID)
	})
}

func (handlers *routeHandlers) restoreWorkspaceMember(ctx echo.Context) error {
	return handlers.transitionWorkspaceMember(ctx, func(requestCtx context.Context, workspaceID int64, memberID int64, userID int64) (membershipapplication.WorkspaceMemberView, error) {
		return handlers.membershipApp.RestoreWorkspaceMember(requestCtx, workspaceID, memberID, userID)
	})
}

func (handlers *routeHandlers) removeWorkspaceMember(ctx echo.Context) error {
	return handlers.transitionWorkspaceMember(ctx, func(requestCtx context.Context, workspaceID int64, memberID int64, userID int64) (membershipapplication.WorkspaceMemberView, error) {
		return handlers.membershipApp.RemoveWorkspaceMember(requestCtx, workspaceID, memberID, userID)
	})
}

func (handlers *routeHandlers) updateWorkspaceMemberRateCost(ctx echo.Context) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, memberID, user, err := handlers.workspaceMemberMutationContext(ctx)
	if err != nil {
		return err
	}

	var request struct {
		HourlyRate *float64 `json:"hourly_rate"`
		LaborCost  *float64 `json:"labor_cost"`
	}
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	member, err := handlers.membershipApp.UpdateWorkspaceMemberRateCost(ctx.Request().Context(), membershipapplication.UpdateWorkspaceMemberRateCostCommand{
		WorkspaceID: workspaceID,
		MemberID:    memberID,
		RequestedBy: user.ID,
		HourlyRate:  request.HourlyRate,
		LaborCost:   request.LaborCost,
	})
	if err != nil {
		return writeMembershipError(err)
	}
	return ctx.JSON(http.StatusOK, membershipBody(member))
}

func (handlers *routeHandlers) transitionWorkspaceMember(
	ctx echo.Context,
	operation func(context.Context, int64, int64, int64) (membershipapplication.WorkspaceMemberView, error),
) error {
	if response, ok := handlers.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, memberID, user, err := handlers.workspaceMemberMutationContext(ctx)
	if err != nil {
		return err
	}

	member, err := operation(ctx.Request().Context(), workspaceID, memberID, user.ID)
	if err != nil {
		return writeMembershipError(err)
	}
	return ctx.JSON(http.StatusOK, membershipBody(member))
}

func (handlers *routeHandlers) workspaceMemberMutationContext(
	ctx echo.Context,
) (workspaceID int64, memberID int64, user identityapplication.UserSnapshot, err error) {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return 0, 0, identityapplication.UserSnapshot{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	memberID, ok = parsePathID(ctx, "member_id")
	if !ok {
		return 0, 0, identityapplication.UserSnapshot{}, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	if err := handlers.requireCurrentSessionWorkspace(ctx, workspaceID); err != nil {
		return 0, 0, identityapplication.UserSnapshot{}, err
	}
	user, resolveErr := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if resolveErr != nil {
		return 0, 0, identityapplication.UserSnapshot{}, echo.NewHTTPError(http.StatusForbidden, "Forbidden").
			SetInternal(resolveErr)
	}
	return workspaceID, memberID, user, nil
}

func membershipBodies(members []membershipapplication.WorkspaceMemberView) []webapi.WorkspaceMember {
	bodies := make([]webapi.WorkspaceMember, 0, len(members))
	for _, member := range members {
		bodies = append(bodies, membershipBody(member))
	}
	return bodies
}

func membershipBody(member membershipapplication.WorkspaceMemberView) webapi.WorkspaceMember {
	body := webapi.WorkspaceMember{
		Email:       member.Email,
		HourlyRate:  float32PointerFromFloat64(member.HourlyRate),
		Id:          int(member.ID),
		LaborCost:   float32PointerFromFloat64(member.LaborCost),
		Name:        member.FullName,
		Role:        string(member.Role),
		Status:      string(member.State),
		WorkspaceId: int(member.WorkspaceID),
	}
	if member.UserID != nil {
		uid := int(*member.UserID)
		body.UserId = &uid
	}
	return body
}

func float32PointerFromFloat64(value *float64) *float32 {
	if value == nil {
		return nil
	}
	converted := float32(*value)
	return &converted
}

func writeMembershipError(err error) error {
	switch {
	case errors.Is(err, membershipapplication.ErrSMTPNotConfigured):
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	case errors.Is(err, membershipapplication.ErrWorkspaceManagerRequired):
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden")
	case errors.Is(err, membershipapplication.ErrWorkspaceMemberNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found")
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
		return echo.NewHTTPError(http.StatusBadRequest, err.Error())
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
}
