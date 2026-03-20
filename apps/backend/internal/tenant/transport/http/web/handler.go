package web

import (
	"context"
	"errors"
	"strings"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
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
		OnlyAdminsSeeTeamDashboard  bool    `json:"only_admins_see_team_dashboard"`
		ProjectsBillableByDefault   bool    `json:"projects_billable_by_default"`
		LimitPublicProjectData      bool    `json:"limit_public_project_data"`
	} `json:"workspace"`
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
		Body: map[string]any{
			"organization": OrganizationBody(view),
			"subscription": SubscriptionBody(view.Commercial),
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

func (handler *Handler) GetWorkspaceSettings(ctx context.Context, workspaceID int64) Response {
	workspace, err := handler.tenant.GetWorkspace(ctx, tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return mapError(err)
	}

	organization, err := handler.tenant.GetOrganization(ctx, workspace.OrganizationID)
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
		Body: map[string]any{
			"organization": OrganizationBody(organization),
			"workspace":    WorkspaceBody(workspace),
			"subscription": SubscriptionBody(workspace.Commercial),
			"capabilities": capabilities,
			"quota":        quota,
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
			OnlyAdminsMayCreateProjects: request.Workspace.OnlyAdminsMayCreateProjects,
			OnlyAdminsSeeTeamDashboard:  request.Workspace.OnlyAdminsSeeTeamDashboard,
			ProjectsBillableByDefault:   request.Workspace.ProjectsBillableByDefault,
			ReportsCollapse:             request.Workspace.ReportsCollapse,
			PublicProjectAccess:         publicProjectAccess(request.Workspace.LimitPublicProjectData),
		},
	})
	if err != nil {
		return mapError(err)
	}

	return handler.GetWorkspaceSettings(ctx, workspaceID)
}

func OrganizationBody(view tenantapplication.OrganizationView) map[string]any {
	return map[string]any{
		"id":                         int64(view.ID),
		"name":                       view.Name,
		"admin":                      true,
		"max_workspaces":             12,
		"pricing_plan_name":          titleCasePlan(view.Commercial.Subscription.Plan),
		"is_multi_workspace_enabled": true,
		"user_count":                 len(view.WorkspaceIDs),
	}
}

func WorkspaceBody(view tenantapplication.WorkspaceView) map[string]any {
	return map[string]any{
		"id":                              int64(view.ID),
		"organization_id":                 int64(view.OrganizationID),
		"name":                            view.Name,
		"logo_url":                        brandingURL(view.Branding.LogoStorageKey),
		"default_currency":                view.Settings.DefaultCurrency(),
		"default_hourly_rate":             view.Settings.DefaultHourlyRate(),
		"rounding":                        int(view.Settings.Rounding()),
		"rounding_minutes":                view.Settings.RoundingMinutes(),
		"reports_collapse":                view.Settings.ReportsCollapse(),
		"only_admins_may_create_projects": view.Settings.OnlyAdminsMayCreateProjects(),
		"only_admins_may_create_tags":     false,
		"only_admins_see_team_dashboard":  view.Settings.OnlyAdminsSeeTeamDashboard(),
		"projects_billable_by_default":    view.Settings.ProjectsBillableByDefault(),
		"projects_private_by_default":     false,
		"projects_enforce_billable":       false,
		"limit_public_project_data":       view.Settings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins,
		"admin":                           true,
		"premium":                         view.Commercial.Subscription.Plan != billingdomain.PlanFree,
		"role":                            "admin",
	}
}

func SubscriptionBody(snapshot tenantapplication.CommercialSnapshot) map[string]any {
	return map[string]any{
		"plan_name": titleCasePlan(snapshot.Subscription.Plan),
		"state":     string(snapshot.Subscription.State),
	}
}

func brandingURL(storageKey string) string {
	if storageKey == "" {
		return ""
	}
	return "https://cdn.example.com/" + storageKey
}

func publicProjectAccess(limitPublicProjectData bool) tenantdomain.WorkspacePublicProjectAccess {
	if limitPublicProjectData {
		return tenantdomain.WorkspacePublicProjectAccessAdmins
	}
	return tenantdomain.WorkspacePublicProjectAccessMembers
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
		return Response{StatusCode: 500, Body: "Internal Server Error"}
	}
}
