package web

import (
	"context"
	"errors"
	"strings"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/samber/lo"
)

type Response struct {
	StatusCode int
	Body       any
}

type OrganizationSettingsRequest struct {
	Organization struct {
		Name string `json:"name"`
	} `json:"organization"`
}

type WorkspaceSettingsRequest struct {
	Workspace struct {
		Name                        string  `json:"name"`
		DefaultCurrency             string  `json:"default_currency"`
		DefaultHourlyRate           float64 `json:"default_hourly_rate"`
		Rounding                    int     `json:"rounding"`
		RoundingMinutes             int     `json:"rounding_minutes"`
		ReportsCollapse             bool    `json:"reports_collapse"`
		OnlyAdminsMayCreateProjects bool    `json:"only_admins_may_create_projects"`
		OnlyAdminsMayCreateTags     bool    `json:"only_admins_may_create_tags"`
		OnlyAdminsSeeTeamDashboard  bool    `json:"only_admins_see_team_dashboard"`
		ProjectsBillableByDefault   bool    `json:"projects_billable_by_default"`
		ProjectsPrivateByDefault    bool    `json:"projects_private_by_default"`
		ProjectsEnforceBillable     bool    `json:"projects_enforce_billable"`
		LimitPublicProjectData      bool    `json:"limit_public_project_data"`
	} `json:"workspace"`
	Preferences struct {
		HideStartEndTimes       bool     `json:"hide_start_end_times"`
		ReportLockedAt          string   `json:"report_locked_at"`
		ShowTimesheetView       bool     `json:"show_timesheet_view"`
		RequiredTimeEntryFields []string `json:"required_time_entry_fields"`
	} `json:"preferences"`
}

type Handler struct {
	tenant  *tenantapplication.Service
	billing *billingapplication.Service
}

func NewHandler(
	tenant *tenantapplication.Service,
	billing *billingapplication.Service,
) *Handler {
	return &Handler{
		tenant:  tenant,
		billing: billing,
	}
}

func (handler *Handler) GetOrganizationSettings(ctx context.Context, organizationID int64) Response {
	view, err := handler.tenant.GetOrganization(ctx, tenantdomain.OrganizationID(organizationID))
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body: webapi.OrganizationSettingsEnvelope{
			Organization: OrganizationBody(view),
			Subscription: SubscriptionBody(view.Commercial),
		},
	}
}

func (handler *Handler) UpdateOrganizationSettings(
	ctx context.Context,
	organizationID int64,
	request OrganizationSettingsRequest,
) Response {
	err := handler.tenant.UpdateOrganization(ctx, tenantapplication.UpdateOrganizationCommand{
		OrganizationID: tenantdomain.OrganizationID(organizationID),
		Name:           request.Organization.Name,
	})
	if err != nil {
		return mapError(err)
	}

	return handler.GetOrganizationSettings(ctx, organizationID)
}

func (handler *Handler) DeleteOrganization(ctx context.Context, organizationID int64) Response {
	err := handler.tenant.DeleteOrganization(ctx, tenantdomain.OrganizationID(organizationID))
	if err != nil {
		return mapError(err)
	}
	return Response{StatusCode: 204}
}

func (handler *Handler) GetWorkspaceSettings(ctx context.Context, workspaceID int64) Response {
	workspace, err := handler.tenant.GetWorkspace(ctx, tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return mapError(err)
	}

	capabilities, err := handler.billing.WorkspaceCapabilitySnapshot(ctx, workspaceID)
	if err != nil {
		return mapError(err)
	}
	quota, _, err := handler.billing.WorkspaceQuotaSnapshot(ctx, workspaceID)
	if err != nil {
		return mapError(err)
	}

	return Response{
		StatusCode: 200,
		Body: webapi.WorkspaceSettingsEnvelope{
			Workspace:    WorkspaceBody(workspace),
			Preferences:  WorkspacePreferencesBody(workspace),
			Subscription: SubscriptionBody(workspace.Commercial),
			Capabilities: CapabilitySnapshotToWeb(capabilities),
			Quota:        QuotaWindowToWeb(quota),
		},
	}
}

func (handler *Handler) UpdateWorkspaceSettings(
	ctx context.Context,
	workspaceID int64,
	request WorkspaceSettingsRequest,
) Response {
	err := handler.tenant.UpdateWorkspace(ctx, tenantapplication.UpdateWorkspaceCommand{
		WorkspaceID: tenantdomain.WorkspaceID(workspaceID),
		Name:        request.Workspace.Name,
		Settings: tenantdomain.WorkspaceSettingsInput{
			DefaultCurrency:             request.Workspace.DefaultCurrency,
			DefaultHourlyRate:           request.Workspace.DefaultHourlyRate,
			Rounding:                    tenantdomain.WorkspaceRoundingMode(request.Workspace.Rounding),
			RoundingMinutes:             request.Workspace.RoundingMinutes,
			DisplayPolicy:               workspaceDisplayPolicy(request.Preferences.HideStartEndTimes),
			OnlyAdminsMayCreateProjects: request.Workspace.OnlyAdminsMayCreateProjects,
			OnlyAdminsMayCreateTags:     request.Workspace.OnlyAdminsMayCreateTags,
			OnlyAdminsSeeTeamDashboard:  request.Workspace.OnlyAdminsSeeTeamDashboard,
			ProjectsBillableByDefault:   request.Workspace.ProjectsBillableByDefault,
			ProjectsPrivateByDefault:    request.Workspace.ProjectsPrivateByDefault,
			ProjectsEnforceBillable:     request.Workspace.ProjectsEnforceBillable,
			ReportsCollapse:             request.Workspace.ReportsCollapse,
			PublicProjectAccess:         publicProjectAccess(request.Workspace.LimitPublicProjectData),
			ReportLockedAt:              request.Preferences.ReportLockedAt,
			ShowTimesheetView:           lo.ToPtr(request.Preferences.ShowTimesheetView),
			RequiredTimeEntryFields:     request.Preferences.RequiredTimeEntryFields,
		},
	})
	if err != nil {
		return mapError(err)
	}

	return handler.GetWorkspaceSettings(ctx, workspaceID)
}

func OrganizationBody(view tenantapplication.OrganizationView) webapi.OrganizationSettings {
	return webapi.OrganizationSettings{
		Admin:                   true,
		Id:                      int(view.ID),
		IsMultiWorkspaceEnabled: true,
		MaxWorkspaces:           12,
		Name:                    view.Name,
		PricingPlanName:         titleCasePlan(view.Commercial.Subscription.Plan),
		UserCount:               len(view.WorkspaceIDs),
	}
}

func WorkspaceBody(view tenantapplication.WorkspaceView) webapi.WorkspaceSettings {
	return webapi.WorkspaceSettings{
		Admin:                       true,
		DefaultCurrency:             view.Settings.DefaultCurrency(),
		DefaultHourlyRate:           float32(view.Settings.DefaultHourlyRate()),
		Id:                          int(view.ID),
		LimitPublicProjectData:      view.Settings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins,
		LogoUrl:                     brandingURL(view.Branding.LogoStorageKey),
		Name:                        view.Name,
		OnlyAdminsMayCreateProjects: view.Settings.OnlyAdminsMayCreateProjects(),
		OnlyAdminsMayCreateTags:     view.Settings.OnlyAdminsMayCreateTags(),
		OnlyAdminsSeeTeamDashboard:  view.Settings.OnlyAdminsSeeTeamDashboard(),
		OrganizationId:              int(view.OrganizationID),
		Premium:                     view.Commercial.Subscription.Plan != billingdomain.PlanFree,
		ProjectsBillableByDefault:   view.Settings.ProjectsBillableByDefault(),
		ProjectsEnforceBillable:     view.Settings.ProjectsEnforceBillable(),
		ProjectsPrivateByDefault:    view.Settings.ProjectsPrivateByDefault(),
		ReportsCollapse:             view.Settings.ReportsCollapse(),
		Role:                        "admin",
		Rounding:                    int(view.Settings.Rounding()),
		RoundingMinutes:             view.Settings.RoundingMinutes(),
	}
}

func WorkspacePreferencesBody(view tenantapplication.WorkspaceView) webapi.WorkspacePreferences {
	return webapi.WorkspacePreferences{
		HideStartEndTimes:       view.Settings.HideStartEndTimes(),
		ReportLockedAt:          view.Settings.ReportLockedAt(),
		RequiredTimeEntryFields: view.Settings.RequiredTimeEntryFields(),
		ShowTimesheetView:       view.Settings.ShowTimesheetView(),
	}
}

func SubscriptionBody(snapshot tenantapplication.CommercialSnapshot) webapi.SubscriptionView {
	return webapi.SubscriptionView{
		Enterprise: lo.ToPtr(snapshot.Subscription.Plan == billingdomain.PlanEnterprise),
		PlanName:   titleCasePlan(snapshot.Subscription.Plan),
		State:      string(snapshot.Subscription.State),
	}
}

func brandingURL(storageKey string) *string {
	if storageKey == "" {
		return lo.ToPtr("")
	}
	return lo.ToPtr("/files/" + storageKey)
}

func publicProjectAccess(limitPublicProjectData bool) tenantdomain.WorkspacePublicProjectAccess {
	if limitPublicProjectData {
		return tenantdomain.WorkspacePublicProjectAccessAdmins
	}
	return tenantdomain.WorkspacePublicProjectAccessMembers
}

func workspaceDisplayPolicy(hideStartEndTimes bool) tenantdomain.WorkspaceDisplayPolicy {
	if hideStartEndTimes {
		return tenantdomain.WorkspaceDisplayPolicyHideStartEndTimes
	}
	return tenantdomain.WorkspaceDisplayPolicyStandard
}

func titleCasePlan(plan billingdomain.Plan) string {
	value := string(plan)
	if value == "" {
		return ""
	}
	return strings.ToUpper(value[:1]) + value[1:]
}

func mapError(err error) Response {
	switch {
	case errors.Is(err, tenantapplication.ErrOrganizationNotFound),
		errors.Is(err, tenantapplication.ErrWorkspaceNotFound):
		return Response{StatusCode: 404, Body: "Not Found"}
	default:
		return Response{StatusCode: 500, Body: err.Error()}
	}
}
