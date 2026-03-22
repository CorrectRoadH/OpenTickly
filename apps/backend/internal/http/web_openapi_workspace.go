package httpapp

import (
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"

	"github.com/labstack/echo/v4"
)

func (server *webOpenAPIServer) GetOrganizationSettings(ctx echo.Context, organizationId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.GetOrganizationSettings(ctx.Request().Context(), sessionID(ctx), int64(organizationId)),
	)
}

func (server *webOpenAPIServer) UpdateOrganizationSettings(ctx echo.Context, organizationId int) error {
	var request webapi.OrganizationSettingsUpdate
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.UpdateOrganizationSettings(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(organizationId),
			OrganizationSettingsRequest{
				Organization: struct {
					Name string `json:"name"`
				}{
					Name: request.Organization.Name,
				},
			},
		),
	)
}

func (server *webOpenAPIServer) GetWorkspaceSettings(ctx echo.Context, workspaceId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.GetWorkspaceSettings(ctx.Request().Context(), sessionID(ctx), int64(workspaceId)),
	)
}

func (server *webOpenAPIServer) UpdateWorkspaceSettings(ctx echo.Context, workspaceId int) error {
	var request webapi.WorkspaceSettingsUpdate
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	workspaceRequest := WorkspaceSettingsRequest{}
	if request.Workspace != nil {
		workspaceRequest.Workspace = &workspaceSettingsSnapshot{
			Name:                        request.Workspace.Name,
			DefaultCurrency:             request.Workspace.DefaultCurrency,
			DefaultHourlyRate:           float64(request.Workspace.DefaultHourlyRate),
			Rounding:                    request.Workspace.Rounding,
			RoundingMinutes:             request.Workspace.RoundingMinutes,
			ReportsCollapse:             request.Workspace.ReportsCollapse,
			OnlyAdminsMayCreateProjects: request.Workspace.OnlyAdminsMayCreateProjects,
			OnlyAdminsMayCreateTags:     request.Workspace.OnlyAdminsMayCreateTags,
			OnlyAdminsSeeTeamDashboard:  request.Workspace.OnlyAdminsSeeTeamDashboard,
			ProjectsBillableByDefault:   request.Workspace.ProjectsBillableByDefault,
			ProjectsPrivateByDefault:    request.Workspace.ProjectsPrivateByDefault,
			ProjectsEnforceBillable:     request.Workspace.ProjectsEnforceBillable,
			LimitPublicProjectData:      request.Workspace.LimitPublicProjectData,
		}
	}
	if request.Preferences != nil {
		workspaceRequest.Preferences = &workspacePreferencesSnapshot{
			HideStartEndTimes: request.Preferences.HideStartEndTimes,
			ReportLockedAt:    request.Preferences.ReportLockedAt,
		}
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.UpdateWorkspaceSettings(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(workspaceId),
			workspaceRequest,
		),
	)
}

func (server *webOpenAPIServer) GetWorkspacePermissions(ctx echo.Context, workspaceId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.GetWorkspacePermissions(ctx.Request().Context(), sessionID(ctx), int64(workspaceId)),
	)
}

func (server *webOpenAPIServer) UpdateWorkspacePermissions(ctx echo.Context, workspaceId int) error {
	var request webapi.UpdateWorkspacePermissionsRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.UpdateWorkspacePermissions(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(workspaceId),
			WorkspacePermissionsRequest{
				OnlyAdminsMayCreateProjects: request.OnlyAdminsMayCreateProjects,
				OnlyAdminsMayCreateTags:     request.OnlyAdminsMayCreateTags,
				OnlyAdminsSeeTeamDashboard:  request.OnlyAdminsSeeTeamDashboard,
				LimitPublicProjectData:      request.LimitPublicProjectData,
			},
		),
	)
}

func (server *webOpenAPIServer) GetWorkspaceCapabilities(ctx echo.Context, workspaceId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.GetWorkspaceCapabilities(ctx.Request().Context(), sessionID(ctx), int64(workspaceId)),
	)
}

func (server *webOpenAPIServer) GetWorkspaceQuota(ctx echo.Context, workspaceId int) error {
	response := server.handlers.Tenant.GetWorkspaceQuota(ctx.Request().Context(), sessionID(ctx), int64(workspaceId))
	setQuotaWindowHeaders(ctx, response.Body)
	return writeWebResponse(ctx, response)
}

func (server *webOpenAPIServer) ListWorkspaceMembers(ctx echo.Context, workspaceId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.ListWorkspaceMembers(ctx.Request().Context(), sessionID(ctx), int64(workspaceId)),
	)
}

func (server *webOpenAPIServer) InviteWorkspaceMember(ctx echo.Context, workspaceId int) error {
	var request webapi.WorkspaceMemberInvitationRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.InviteWorkspaceMember(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(workspaceId),
			WorkspaceMemberInvitationRequest{
				Email: string(request.Email),
				Role:  request.Role,
			},
		),
	)
}

func (server *webOpenAPIServer) RemoveWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.RemoveWorkspaceMember(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(workspaceId),
			int64(memberId),
		),
	)
}

func (server *webOpenAPIServer) DisableWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.DisableWorkspaceMember(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(workspaceId),
			int64(memberId),
		),
	)
}

func (server *webOpenAPIServer) UpdateWorkspaceMemberRateCost(
	ctx echo.Context,
	workspaceId int,
	memberId int,
) error {
	var request webapi.UpdateWorkspaceMemberRateCostRequest
	if err := ctx.Bind(&request); err != nil {
		return err
	}

	return writeWebResponse(
		ctx,
		server.handlers.Tenant.UpdateWorkspaceMemberRateCost(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(workspaceId),
			int64(memberId),
			WorkspaceMemberRateCostUpdateRequest{
				HourlyRate: float64PointerFromFloat32Pointer(request.HourlyRate),
				LaborCost:  float64PointerFromFloat32Pointer(request.LaborCost),
			},
		),
	)
}

func (server *webOpenAPIServer) RestoreWorkspaceMember(ctx echo.Context, workspaceId int, memberId int) error {
	return writeWebResponse(
		ctx,
		server.handlers.Tenant.RestoreWorkspaceMember(
			ctx.Request().Context(),
			sessionID(ctx),
			int64(workspaceId),
			int64(memberId),
		),
	)
}
