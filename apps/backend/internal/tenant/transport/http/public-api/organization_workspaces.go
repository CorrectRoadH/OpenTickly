package publicapi

import (
	"net/http"
	"time"

	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

func (handler *Handler) PostPublicTrackOrganizationWorkspace(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	var request publictrackapi.WorkspacePayload
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	defaultSettings := tenantdomain.DefaultWorkspaceSettings()
	result, err := handler.tenant.CreateWorkspace(ctx.Request().Context(), tenantapplication.CreateWorkspaceCommand{
		OrganizationID: tenantdomain.OrganizationID(organizationID),
		Name:           lo.FromPtr(request.Name),
		Settings: tenantdomain.WorkspaceSettingsInput{
			DefaultCurrency:             lo.FromPtrOr(request.DefaultCurrency, defaultSettings.DefaultCurrency()),
			DefaultHourlyRate:           float32ValueFallback(request.DefaultHourlyRate, defaultSettings.DefaultHourlyRate()),
			Rounding:                    tenantdomain.WorkspaceRoundingMode(lo.FromPtrOr(request.Rounding, int(defaultSettings.Rounding()))),
			RoundingMinutes:             lo.FromPtrOr(request.RoundingMinutes, defaultSettings.RoundingMinutes()),
			DisplayPolicy:               defaultSettings.DisplayPolicy(),
			OnlyAdminsMayCreateProjects: lo.FromPtrOr(request.OnlyAdminsMayCreateProjects, defaultSettings.OnlyAdminsMayCreateProjects()),
			OnlyAdminsMayCreateTags:     lo.FromPtrOr(request.OnlyAdminsMayCreateTags, defaultSettings.OnlyAdminsMayCreateTags()),
			OnlyAdminsSeeTeamDashboard:  lo.FromPtrOr(request.OnlyAdminsSeeTeamDashboard, defaultSettings.OnlyAdminsSeeTeamDashboard()),
			ProjectsBillableByDefault:   lo.FromPtrOr(request.ProjectsBillableByDefault, defaultSettings.ProjectsBillableByDefault()),
			ProjectsPrivateByDefault:    lo.FromPtrOr(request.ProjectsPrivateByDefault, defaultSettings.ProjectsPrivateByDefault()),
			ProjectsEnforceBillable:     lo.FromPtrOr(request.ProjectsEnforceBillable, defaultSettings.ProjectsEnforceBillable()),
			ReportsCollapse:             lo.FromPtrOr(request.ReportsCollapse, defaultSettings.ReportsCollapse()),
			PublicProjectAccess: publicProjectAccess(
				lo.FromPtrOr(
					request.LimitPublicProjectData,
					defaultSettings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins,
				),
			),
			ReportLockedAt:          defaultSettings.ReportLockedAt(),
			ShowTimesheetView:       lo.ToPtr(defaultSettings.ShowTimesheetView()),
			RequiredTimeEntryFields: defaultSettings.RequiredTimeEntryFields(),
		},
	})
	if err != nil {
		return mapError(err)
	}

	if _, err := handler.membership.EnsureWorkspaceOwner(ctx.Request().Context(), membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: int64(result.WorkspaceID),
		UserID:      requester.ID,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	view, err := handler.tenant.GetWorkspace(ctx.Request().Context(), result.WorkspaceID)
	if err != nil {
		return mapError(err)
	}
	return ctx.JSON(http.StatusOK, workspaceBody(view))
}

func (handler *Handler) GetPublicTrackOrganizationWorkspaceGroups(ctx echo.Context) error {
	workspace, requester, err := handler.organizationWorkspace(ctx)
	if err != nil {
		return err
	}

	groups, err := handler.catalog.ListGroups(ctx.Request().Context(), int64(workspace.ID))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	response := make([]publictrackapi.GroupOrganizationGroupResponse, 0, len(groups))
	for _, group := range groups {
		permissions := []string{"view"}
		at := group.CreatedAt.UTC().Format(time.RFC3339)
		response = append(response, publictrackapi.GroupOrganizationGroupResponse{
			At:          lo.ToPtr(at),
			GroupId:     lo.ToPtr(int(group.ID)),
			Name:        lo.ToPtr(group.Name),
			Permissions: &permissions,
			Users:       lo.ToPtr([]publictrackapi.GithubComTogglTogglApiInternalModelsOrganizationUserSimple{}),
			Workspaces:  lo.ToPtr([]int{int(workspace.ID)}),
		})
	}
	_ = requester
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackOrganizationWorkspaceUsers(ctx echo.Context) error {
	workspace, requester, err := handler.organizationWorkspace(ctx)
	if err != nil {
		return err
	}

	members, err := handler.membership.ListWorkspaceMembers(ctx.Request().Context(), int64(workspace.ID), requester.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}

	response := make([]publictrackapi.GithubComTogglTogglApiInternalModelsWorkspaceUser, 0, len(members))
	for _, member := range members {
		response = append(response, organizationWorkspaceUserBody(member))
	}
	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) organizationWorkspace(
	ctx echo.Context,
) (tenantapplication.WorkspaceView, *identityapplication.UserSnapshot, error) {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return tenantapplication.WorkspaceView{}, nil, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return tenantapplication.WorkspaceView{}, nil, echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	}
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return tenantapplication.WorkspaceView{}, nil, err
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return tenantapplication.WorkspaceView{}, nil, err
	}

	workspace, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return tenantapplication.WorkspaceView{}, nil, mapError(err)
	}
	if int64(workspace.OrganizationID) != organizationID {
		return tenantapplication.WorkspaceView{}, nil, echo.NewHTTPError(http.StatusNotFound, "Not Found")
	}
	return workspace, requester, nil
}

func organizationWorkspaceUserBody(
	member membershipapplication.WorkspaceMemberView,
) publictrackapi.GithubComTogglTogglApiInternalModelsWorkspaceUser {
	return publictrackapi.GithubComTogglTogglApiInternalModelsWorkspaceUser{
		Active:            lo.ToPtr(member.State == membershipdomain.WorkspaceMemberStateJoined || member.State == membershipdomain.WorkspaceMemberStateRestored),
		Admin:             lo.ToPtr(member.Role == membershipdomain.WorkspaceRoleOwner || member.Role == membershipdomain.WorkspaceRoleAdmin),
		Email:             lo.ToPtr(member.Email),
		Id:                lo.ToPtr(int(member.ID)),
		Inactive:          lo.ToPtr(member.State == membershipdomain.WorkspaceMemberStateDisabled || member.State == membershipdomain.WorkspaceMemberStateRemoved),
		IsDirect:          lo.ToPtr(true),
		LaborCost:         float32PointerFromFloat64(member.LaborCost),
		Name:              lo.ToPtr(member.FullName),
		OrganizationAdmin: lo.ToPtr(false),
		Rate:              float32PointerFromFloat64(member.HourlyRate),
		Role:              lo.ToPtr(string(member.Role)),
		Uid:               lo.ToPtr(int(memberUserID(member))),
		UserId:            lo.ToPtr(int(memberUserID(member))),
		Wid:               lo.ToPtr(int(member.WorkspaceID)),
		WorkspaceAdmin:    lo.ToPtr(member.Role == membershipdomain.WorkspaceRoleOwner || member.Role == membershipdomain.WorkspaceRoleAdmin),
		WorkspaceId:       lo.ToPtr(int(member.WorkspaceID)),
	}
}

func float32PointerFromFloat64(value *float64) *float32 {
	if value == nil {
		return nil
	}
	return lo.ToPtr(float32(*value))
}
