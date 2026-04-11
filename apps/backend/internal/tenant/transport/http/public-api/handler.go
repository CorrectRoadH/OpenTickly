package publicapi

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	publictrackapi "opentoggl/backend/apps/backend/internal/http/generated/publictrack"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	"opentoggl/backend/apps/backend/internal/platform/filestore"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"

	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

type ScopeAuthorizer interface {
	RequirePublicTrackUser(ctx echo.Context) (*identityapplication.UserSnapshot, error)
	RequirePublicTrackHome(ctx echo.Context) (organizationID int64, workspaceID int64, err error)
	RequirePublicTrackOrganization(ctx echo.Context, organizationID int64) error
	RequirePublicTrackWorkspace(ctx echo.Context, workspaceID int64) error
}

type HomeRepository interface {
	Save(context.Context, int64, int64, int64) error
}

// workspaceSubscriptionResponse is the JSON shape for workspace subscription info.
type workspaceSubscriptionResponse struct {
	PlanName string `json:"plan_name"`
	State    string `json:"state"`
}

// organizationResponse is the JSON shape for a single organization returned by
// the public track API, replacing an untyped map[string]any.
type organizationResponse struct {
	ID                      int64  `json:"id"`
	Name                    string `json:"name"`
	Admin                   bool   `json:"admin"`
	MaxWorkspaces           int    `json:"max_workspaces"`
	PricingPlanName         string `json:"pricing_plan_name"`
	IsMultiWorkspaceEnabled bool   `json:"is_multi_workspace_enabled"`
	UserCount               int    `json:"user_count"`
}

type Handler struct {
	tenant     *tenantapplication.Service
	billing    *billingapplication.Service
	catalog    *catalogapplication.Service
	membership *membershipapplication.Service
	homes      HomeRepository
	scope      ScopeAuthorizer
	files      *filestore.Store
}

func NewHandler(
	tenant *tenantapplication.Service,
	billing *billingapplication.Service,
	catalog *catalogapplication.Service,
	membership *membershipapplication.Service,
	homes HomeRepository,
	scope ScopeAuthorizer,
	files *filestore.Store,
) *Handler {
	return &Handler{
		tenant:     tenant,
		billing:    billing,
		catalog:    catalog,
		membership: membership,
		homes:      homes,
		scope:      scope,
		files:      files,
	}
}

func (handler *Handler) GetPublicTrackOrganizations(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	organizations, err := handler.tenant.ListOrganizationsByUserID(ctx.Request().Context(), user.ID)
	if err != nil {
		return mapError(err)
	}

	return ctx.JSON(http.StatusOK, lo.Map(organizations, func(view tenantapplication.OrganizationView, _ int) publictrackapi.ModelsMeOrganization {
		return meOrganizationBody(view)
	}))
}

func (handler *Handler) GetPublicTrackQuota(ctx echo.Context) error {
	organizationID, workspaceID, err := handler.scope.RequirePublicTrackHome(ctx)
	if err != nil {
		return err
	}

	quota, _, err := handler.billing.WorkspaceQuotaSnapshot(ctx.Request().Context(), workspaceID)
	if err != nil {
		return mapError(err)
	}
	return ctx.JSON(http.StatusOK, []publictrackapi.MeGetQuotaResult{{
		OrganizationId: intPointer(organizationID),
		Remaining:      intPointer(int64(quota.Remaining)),
		ResetsInSecs:   intPointer(int64(quota.ResetsInSeconds)),
		Total:          intPointer(int64(quota.Total)),
	}})
}

func (handler *Handler) PostPublicTrackOrganization(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	var request publictrackapi.ModelsPostPayload
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	result, err := handler.tenant.CreateOrganization(ctx.Request().Context(), tenantapplication.CreateOrganizationCommand{
		Name:          lo.FromPtr(request.Name),
		WorkspaceName: lo.FromPtr(request.WorkspaceName),
	})
	if err != nil {
		return mapError(err)
	}
	if err := handler.homes.Save(ctx.Request().Context(), user.ID, int64(result.OrganizationID), int64(result.WorkspaceID)); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	if _, err := handler.membership.EnsureWorkspaceOwner(ctx.Request().Context(), membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: int64(result.WorkspaceID),
		UserID:      user.ID,
	}); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	permissions := []string{"admin"}
	return ctx.JSON(http.StatusOK, publictrackapi.OrganizationPostOrganizationReply{
		Id:            intPointer(int64(result.OrganizationID)),
		Name:          request.Name,
		Permissions:   &permissions,
		WorkspaceId:   intPointer(int64(result.WorkspaceID)),
		WorkspaceName: request.WorkspaceName,
	})
}

func (handler *Handler) GetPublicTrackOrganization(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	view, err := handler.tenant.GetOrganization(ctx.Request().Context(), tenantdomain.OrganizationID(organizationID))
	if err != nil {
		return mapError(err)
	}
	return ctx.JSON(http.StatusOK, organizationBody(view))
}

func (handler *Handler) PutPublicTrackOrganization(ctx echo.Context) error {
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackOrganization(ctx, organizationID); err != nil {
		return err
	}

	var request publictrackapi.ModelsPutPayload
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	if err := handler.tenant.UpdateOrganization(ctx.Request().Context(), tenantapplication.UpdateOrganizationCommand{
		OrganizationID: tenantdomain.OrganizationID(organizationID),
		Name:           lo.FromPtr(request.Name),
	}); err != nil {
		return mapError(err)
	}
	return handler.GetPublicTrackOrganization(ctx)
}

func (handler *Handler) GetPublicTrackWorkspace(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	view, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return mapError(err)
	}
	return ctx.JSON(http.StatusOK, workspaceBody(view))
}

func (handler *Handler) PutPublicTrackWorkspace(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	var request publictrackapi.WorkspacePayload
	if err := ctx.Bind(&request); err != nil {
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request").SetInternal(err)
	}

	current, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return mapError(err)
	}

	settings := current.Settings
	if err := handler.tenant.UpdateWorkspace(ctx.Request().Context(), tenantapplication.UpdateWorkspaceCommand{
		WorkspaceID: tenantdomain.WorkspaceID(workspaceID),
		Name:        lo.FromPtrOr(request.Name, current.Name),
		Settings: tenantdomain.WorkspaceSettingsInput{
			DefaultCurrency:             lo.FromPtrOr(request.DefaultCurrency, settings.DefaultCurrency()),
			DefaultHourlyRate:           float32ValueFallback(request.DefaultHourlyRate, settings.DefaultHourlyRate()),
			Rounding:                    tenantdomain.WorkspaceRoundingMode(lo.FromPtrOr(request.Rounding, int(settings.Rounding()))),
			RoundingMinutes:             lo.FromPtrOr(request.RoundingMinutes, settings.RoundingMinutes()),
			DisplayPolicy:               settings.DisplayPolicy(),
			OnlyAdminsMayCreateProjects: lo.FromPtrOr(request.OnlyAdminsMayCreateProjects, settings.OnlyAdminsMayCreateProjects()),
			OnlyAdminsMayCreateTags:     lo.FromPtrOr(request.OnlyAdminsMayCreateTags, settings.OnlyAdminsMayCreateTags()),
			OnlyAdminsSeeTeamDashboard:  lo.FromPtrOr(request.OnlyAdminsSeeTeamDashboard, settings.OnlyAdminsSeeTeamDashboard()),
			ProjectsBillableByDefault:   lo.FromPtrOr(request.ProjectsBillableByDefault, settings.ProjectsBillableByDefault()),
			ProjectsPrivateByDefault:    lo.FromPtrOr(request.ProjectsPrivateByDefault, settings.ProjectsPrivateByDefault()),
			ProjectsEnforceBillable:     lo.FromPtrOr(request.ProjectsEnforceBillable, settings.ProjectsEnforceBillable()),
			ReportsCollapse:             lo.FromPtrOr(request.ReportsCollapse, settings.ReportsCollapse()),
			PublicProjectAccess:         publicProjectAccess(lo.FromPtrOr(request.LimitPublicProjectData, settings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins)),
			ReportLockedAt:              settings.ReportLockedAt(),
			ShowTimesheetView:           lo.ToPtr(settings.ShowTimesheetView()),
			RequiredTimeEntryFields:     settings.RequiredTimeEntryFields(),
		},
	}); err != nil {
		return mapError(err)
	}
	return handler.GetPublicTrackWorkspace(ctx)
}

func (handler *Handler) GetPublicTrackWorkspaces(ctx echo.Context) error {
	user, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}

	workspaces, err := handler.tenant.ListWorkspacesByUserID(ctx.Request().Context(), user.ID)
	if err != nil {
		return mapError(err)
	}

	response := make([]publictrackapi.WorkspaceWithActiveProjectCount, 0, len(workspaces))
	for _, view := range workspaces {
		projects, projectErr := handler.catalog.ListProjects(
			ctx.Request().Context(),
			int64(view.ID),
			catalogapplication.ListProjectsFilter{
				Active:  lo.ToPtr(true),
				Page:    1,
				PerPage: 200,
			},
		)
		if projectErr != nil {
			return echo.NewHTTPError(http.StatusInternalServerError, projectErr.Error()).SetInternal(projectErr)
		}

		response = append(response, publictrackapi.WorkspaceWithActiveProjectCount{
			ActiveProjectCount: lo.ToPtr(len(projects)),
			Admin:              lo.ToPtr(true),
			BusinessWs:         lo.ToPtr(view.Commercial.Subscription.Plan == billingdomain.PlanEnterprise),
			DefaultCurrency:    lo.ToPtr(view.Settings.DefaultCurrency()),
			DefaultHourlyRate:  float32Ptr(view.Settings.DefaultHourlyRate()),
			HideStartEndTimes:  lo.ToPtr(view.Settings.HideStartEndTimes()),
			Id:                 intPointer(int64(view.ID)),
			LimitPublicProjectData: lo.ToPtr(
				view.Settings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins,
			),
			LogoUrl:                     lo.ToPtr(brandingURL(view.Branding.LogoStorageKey)),
			Name:                        lo.ToPtr(view.Name),
			OnlyAdminsMayCreateProjects: lo.ToPtr(view.Settings.OnlyAdminsMayCreateProjects()),
			OnlyAdminsMayCreateTags:     lo.ToPtr(view.Settings.OnlyAdminsMayCreateTags()),
			OnlyAdminsSeeTeamDashboard:  lo.ToPtr(view.Settings.OnlyAdminsSeeTeamDashboard()),
			OrganizationId:              intPointer(int64(view.OrganizationID)),
			Premium:                     lo.ToPtr(view.Commercial.Subscription.Plan != billingdomain.PlanFree),
			ProjectsBillableByDefault:   lo.ToPtr(view.Settings.ProjectsBillableByDefault()),
			ProjectsEnforceBillable:     lo.ToPtr(view.Settings.ProjectsEnforceBillable()),
			ProjectsPrivateByDefault:    lo.ToPtr(view.Settings.ProjectsPrivateByDefault()),
			ReportsCollapse:             lo.ToPtr(view.Settings.ReportsCollapse()),
			Role:                        lo.ToPtr("admin"),
			Rounding:                    lo.ToPtr(int(view.Settings.Rounding())),
			RoundingMinutes:             lo.ToPtr(view.Settings.RoundingMinutes()),
		})
	}

	return ctx.JSON(http.StatusOK, response)
}

func (handler *Handler) GetPublicTrackWorkspaceSubscription(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	view, err := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return mapError(err)
	}
	return ctx.JSON(http.StatusOK, workspaceSubscriptionResponse{
		PlanName: titleCasePlan(view.Commercial.Subscription.Plan),
		State:    string(view.Commercial.Subscription.State),
	})
}

func (handler *Handler) GetPublicTrackWorkspaceStatistics(ctx echo.Context) error {
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	requester, err := handler.scope.RequirePublicTrackUser(ctx)
	if err != nil {
		return err
	}
	if err := handler.scope.RequirePublicTrackWorkspace(ctx, workspaceID); err != nil {
		return err
	}

	members, err := handler.membership.ListWorkspaceMembers(ctx.Request().Context(), workspaceID, requester.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}
	workspace, wsErr := handler.tenant.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if wsErr != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, wsErr.Error()).SetInternal(wsErr)
	}
	groups, err := handler.catalog.ListGroups(ctx.Request().Context(), int64(workspace.OrganizationID))
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	admins := make([]publictrackapi.ModelsUserData, 0)
	memberCount := 0
	for _, member := range members {
		if member.State == membershipdomain.WorkspaceMemberStateRemoved {
			continue
		}
		memberCount++
		if member.Role == membershipdomain.WorkspaceRoleAdmin {
			admins = append(admins, publictrackapi.ModelsUserData{
				Name:   lo.ToPtr(member.FullName),
				UserId: intPointer(memberUserID(member)),
			})
		}
	}

	return ctx.JSON(http.StatusOK, publictrackapi.ModelsStatistics{
		Admins:       &admins,
		GroupsCount:  lo.ToPtr(len(groups)),
		MembersCount: lo.ToPtr(memberCount),
	})
}

func meOrganizationBody(view tenantapplication.OrganizationView) publictrackapi.ModelsMeOrganization {
	permissions := []string{"admin"}
	return publictrackapi.ModelsMeOrganization{
		Admin:                   lo.ToPtr(true),
		Id:                      intPointer(int64(view.ID)),
		IsMultiWorkspaceEnabled: lo.ToPtr(true),
		MaxWorkspaces:           intPointer(12),
		Name:                    lo.ToPtr(view.Name),
		Owner:                   lo.ToPtr(true),
		Permissions:             &permissions,
		PricingPlanEnterprise:   lo.ToPtr(view.Commercial.Subscription.Plan == billingdomain.PlanEnterprise),
		PricingPlanName:         lo.ToPtr(titleCasePlan(view.Commercial.Subscription.Plan)),
		UserCount:               intPointer(int64(len(view.WorkspaceIDs))),
	}
}

func organizationBody(view tenantapplication.OrganizationView) organizationResponse {
	return organizationResponse{
		ID:                       int64(view.ID),
		Name:                     view.Name,
		Admin:                    true,
		MaxWorkspaces:            12,
		PricingPlanName:          titleCasePlan(view.Commercial.Subscription.Plan),
		IsMultiWorkspaceEnabled:  true,
		UserCount:                len(view.WorkspaceIDs),
	}
}

func workspaceBody(view tenantapplication.WorkspaceView) publictrackapi.GithubComTogglTogglApiInternalModelsWorkspace {
	return publictrackapi.GithubComTogglTogglApiInternalModelsWorkspace{
		Admin:                       lo.ToPtr(true),
		BusinessWs:                  lo.ToPtr(view.Commercial.Subscription.Plan == billingdomain.PlanEnterprise),
		DefaultCurrency:             lo.ToPtr(view.Settings.DefaultCurrency()),
		DefaultHourlyRate:           float32Ptr(view.Settings.DefaultHourlyRate()),
		DisableTimesheetView:        lo.ToPtr(!view.Settings.ShowTimesheetView()),
		HideStartEndTimes:           lo.ToPtr(view.Settings.HideStartEndTimes()),
		Id:                          intPointer(int64(view.ID)),
		LimitPublicProjectData:      lo.ToPtr(view.Settings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins),
		LogoUrl:                     lo.ToPtr(brandingURL(view.Branding.LogoStorageKey)),
		Name:                        lo.ToPtr(view.Name),
		OnlyAdminsMayCreateProjects: lo.ToPtr(view.Settings.OnlyAdminsMayCreateProjects()),
		OnlyAdminsMayCreateTags:     lo.ToPtr(view.Settings.OnlyAdminsMayCreateTags()),
		OnlyAdminsSeeTeamDashboard:  lo.ToPtr(view.Settings.OnlyAdminsSeeTeamDashboard()),
		OrganizationId:              intPointer(int64(view.OrganizationID)),
		Premium:                     lo.ToPtr(view.Commercial.Subscription.Plan != billingdomain.PlanFree),
		ProjectsBillableByDefault:   lo.ToPtr(view.Settings.ProjectsBillableByDefault()),
		ProjectsEnforceBillable:     lo.ToPtr(view.Settings.ProjectsEnforceBillable()),
		ProjectsPrivateByDefault:    lo.ToPtr(view.Settings.ProjectsPrivateByDefault()),
		ReportsCollapse:             lo.ToPtr(view.Settings.ReportsCollapse()),
		Role:                        lo.ToPtr("admin"),
		Rounding:                    lo.ToPtr(int(view.Settings.Rounding())),
		RoundingMinutes:             lo.ToPtr(view.Settings.RoundingMinutes()),
	}
}

func brandingURL(storageKey string) string {
	if storageKey == "" {
		return ""
	}
	return "/files/" + storageKey
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

func mapError(err error) error {
	switch {
	case errors.Is(err, tenantapplication.ErrOrganizationNotFound),
		errors.Is(err, tenantapplication.ErrWorkspaceNotFound),
		errors.Is(err, billingapplication.ErrCommercialAccountNotFound):
		return echo.NewHTTPError(http.StatusNotFound, "Not Found").SetInternal(err)
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, err.Error()).SetInternal(err)
	}
}

func parsePathID(ctx echo.Context, key string) (int64, bool) {
	value := strings.TrimSpace(ctx.Param(key))
	if value == "" {
		return 0, false
	}
	parsed, err := strconv.ParseInt(value, 10, 64)
	if err != nil {
		return 0, false
	}
	return parsed, true
}

func float32ValueFallback(value *float32, fallback float64) float64 {
	if value == nil {
		return fallback
	}
	return float64(*value)
}

func intPointer(value int64) *int {
	converted := int(value)
	return &converted
}

func float32Ptr(value float64) *float32 {
	converted := float32(value)
	return &converted
}

func memberUserID(member membershipapplication.WorkspaceMemberView) int64 {
	if member.UserID == nil {
		return 0
	}
	return *member.UserID
}
