package bootstrap

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	billingpostgres "opentoggl/backend/apps/backend/internal/billing/infra/postgres"
	catalogapplication "opentoggl/backend/apps/backend/internal/catalog/application"
	catalogpostgres "opentoggl/backend/apps/backend/internal/catalog/infra/postgres"
	governanceapplication "opentoggl/backend/apps/backend/internal/governance/application"
	governancepostgres "opentoggl/backend/apps/backend/internal/governance/infra/postgres"
	httpapp "opentoggl/backend/apps/backend/internal/http"
	webapi "opentoggl/backend/apps/backend/internal/http/generated/web"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitydomain "opentoggl/backend/apps/backend/internal/identity/domain"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	identitypublicapi "opentoggl/backend/apps/backend/internal/identity/transport/http/public-api"
	identityweb "opentoggl/backend/apps/backend/internal/identity/transport/http/web"
	importingapplication "opentoggl/backend/apps/backend/internal/importing/application"
	importingpostgres "opentoggl/backend/apps/backend/internal/importing/infra/postgres"
	"opentoggl/backend/apps/backend/internal/log"
	membershipapplication "opentoggl/backend/apps/backend/internal/membership/application"
	membershipdomain "opentoggl/backend/apps/backend/internal/membership/domain"
	membershippostgres "opentoggl/backend/apps/backend/internal/membership/infra/postgres"
	platformapplication "opentoggl/backend/apps/backend/internal/platform/application"
	reportsapplication "opentoggl/backend/apps/backend/internal/reports/application"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	tenantweb "opentoggl/backend/apps/backend/internal/tenant/transport/http/web"
	trackingapplication "opentoggl/backend/apps/backend/internal/tracking/application"
	trackingpostgres "opentoggl/backend/apps/backend/internal/tracking/infra/postgres"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/samber/lo"
)

const sessionCookieName = "opentoggl_session"
const currentSessionHomeContextKey = "current_session_home"

func newWebRoutes(handlers *routeHandlers) (httpapp.RouteRegistrar, error) {
	return httpapp.NewGeneratedWebRouteRegistrar(newWebOpenAPIServer(handlers))
}

type routeHandlers struct {
	pool          *pgxpool.Pool
	catalogApp    *catalogapplication.Service
	identity      *identityweb.Handler
	identityApp   *identityapplication.Service
	identityAPI   *identitypublicapi.Handler
	membershipApp *membershipapplication.Service
	importingApp  *importingapplication.Service
	trackingApp   *trackingapplication.Service
	reportsApp    *reportsapplication.Service
	governanceApp *governanceapplication.Service
	userHomes     userHomeRepository
	tenant        *tenantweb.Handler
	tenantApp     *tenantapplication.Service
	billingApp    *billingapplication.Service
	referenceApp  *platformapplication.ReferenceService
}

func newRouteHandlers(pool *pgxpool.Pool, appLogger log.Logger) (*routeHandlers, error) {
	referenceService, err := platformapplication.NewReferenceService()
	if err != nil {
		return nil, err
	}

	billingService, err := billingapplication.NewService(
		billingpostgres.NewAccountRepository(pool),
		billingpostgres.NewWorkspaceOwnershipLookup(pool),
		[]billingdomain.CapabilityRule{
			{Key: "reports.profitability", MinimumPlan: billingdomain.PlanEnterprise},
			{Key: "reports.summary", MinimumPlan: billingdomain.PlanStarter, RequiresQuota: true},
			{Key: "time_tracking", MinimumPlan: billingdomain.PlanFree},
		},
	)
	if err != nil {
		return nil, err
	}

	tenantService, err := tenantapplication.NewService(tenantpostgres.NewStore(pool), billingService)
	if err != nil {
		return nil, err
	}
	tenantHandler := tenantweb.NewHandler(tenantService, billingService)

	catalogService, err := catalogapplication.NewService(catalogpostgres.NewStore(pool))
	if err != nil {
		return nil, err
	}
	trackingService, err := trackingapplication.NewService(trackingpostgres.NewStore(pool), catalogService, appLogger)
	if err != nil {
		return nil, err
	}

	membershipService, err := membershipapplication.NewService(membershippostgres.NewStore(pool))
	if err != nil {
		return nil, err
	}
	reportsService := reportsapplication.NewService(trackingService, membershipService)
	governanceService, err := governanceapplication.NewService(governancepostgres.NewStore(pool))
	if err != nil {
		return nil, err
	}
	importingService, err := importingapplication.NewService(importingpostgres.NewStore(pool))
	if err != nil {
		return nil, err
	}

	identityService := identityapplication.NewService(identityapplication.Config{
		Users:              identitypostgres.NewUserRepository(pool),
		Sessions:           identitypostgres.NewSessionRepository(pool),
		PushServices:       identitypostgres.NewPushServiceRepository(pool),
		JobRecorder:        identitypostgres.NewJobRecorder(pool),
		RunningTimerLookup: trackingpostgres.NewRunningTimerLookup(pool),
		IDs:                identitypostgres.NewSequence(pool),
		KnownAlphaFeatures: []string{"calendar-redesign"},
	})
	shellProvider := newBillingBackedSessionShell(
		tenantService,
		billingService,
		identityService,
		membershipService,
		tenantpostgres.NewUserHomeRepository(pool),
	)
	identityHandler := identityweb.NewHandlerWithShell(identityService, shellProvider)

	return &routeHandlers{
		pool:          pool,
		catalogApp:    catalogService,
		identity:      identityHandler,
		identityApp:   identityService,
		identityAPI:   identitypublicapi.NewHandler(identityService),
		membershipApp: membershipService,
		importingApp:  importingService,
		trackingApp:   trackingService,
		reportsApp:    reportsService,
		governanceApp: governanceService,
		userHomes:     tenantpostgres.NewUserHomeRepository(pool),
		tenant:        tenantHandler,
		tenantApp:     tenantService,
		billingApp:    billingService,
		referenceApp:  referenceService,
	}, nil
}

func (handlers *routeHandlers) register(ctx echo.Context) error {
	var request identityweb.RegisterRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	return writeIdentityResponse(ctx, handlers.identity.Register(ctx.Request().Context(), request))
}

func (handlers *routeHandlers) login(ctx echo.Context) error {
	var request identityweb.LoginRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	return writeIdentityResponse(ctx, handlers.identity.Login(ctx.Request().Context(), request))
}

func (handlers *routeHandlers) logout(ctx echo.Context) error {
	response := handlers.identity.Logout(ctx.Request().Context(), sessionID(ctx))
	return writeIdentityResponse(ctx, response)
}

func (handlers *routeHandlers) session(ctx echo.Context) error {
	response := handlers.identity.GetSession(ctx.Request().Context(), sessionID(ctx))
	return writeIdentityResponse(ctx, response)
}

func (handlers *routeHandlers) updateSession(ctx echo.Context) error {
	var request webapi.UpdateWebSessionRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	if request.WorkspaceId <= 0 {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		switch {
		case errors.Is(err, identityapplication.ErrSessionNotFound),
			errors.Is(err, identitydomain.ErrUserDeactivated),
			errors.Is(err, identitydomain.ErrUserDeleted):
			return echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
		default:
			return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
	}

	workspaces, err := handlers.tenantApp.ListWorkspacesByUserID(ctx.Request().Context(), user.ID)
	if err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	var selectedWorkspace *tenantapplication.WorkspaceView
	for index := range workspaces {
		if int64(workspaces[index].ID) == int64(request.WorkspaceId) {
			selectedWorkspace = &workspaces[index]
			break
		}
	}
	if selectedWorkspace == nil {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").
			SetInternal(errors.New("requested workspace is not accessible to the current user"))
	}

	if err := handlers.userHomes.Save(
		ctx.Request().Context(),
		user.ID,
		int64(selectedWorkspace.OrganizationID),
		int64(selectedWorkspace.ID),
	); err != nil {
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
	}

	response := handlers.identity.GetSession(ctx.Request().Context(), sessionID(ctx))
	return writeIdentityResponse(ctx, response)
}

func (handlers *routeHandlers) workspaceSettings(ctx echo.Context) error {
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
	response := handlers.tenant.GetWorkspaceSettings(ctx.Request().Context(), workspaceID)
	return writeTenantResponse(ctx, response)
}

func (handlers *routeHandlers) updateWorkspaceSettings(ctx echo.Context) error {
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
	var request workspaceSettingsRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	workspace, err := handlers.tenantApp.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}
	preferences := workspacePreferences{
		HideStartEndTimes:       workspace.Settings.HideStartEndTimes(),
		ReportLockedAt:          workspace.Settings.ReportLockedAt(),
		ShowTimesheetView:       workspace.Settings.ShowTimesheetView(),
		RequiredTimeEntryFields: workspace.Settings.RequiredTimeEntryFields(),
	}
	if request.Preferences != nil {
		preferences = *request.Preferences
	}
	response := handlers.tenant.UpdateWorkspaceSettings(ctx.Request().Context(), workspaceID, tenantweb.WorkspaceSettingsRequest{
		Workspace: struct {
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
		}{
			Name:                        request.Workspace.Name,
			DefaultCurrency:             request.Workspace.DefaultCurrency,
			DefaultHourlyRate:           request.Workspace.DefaultHourlyRate,
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
		},
		Preferences: struct {
			HideStartEndTimes       bool     `json:"hide_start_end_times"`
			ReportLockedAt          string   `json:"report_locked_at"`
			ShowTimesheetView       bool     `json:"show_timesheet_view"`
			RequiredTimeEntryFields []string `json:"required_time_entry_fields"`
		}{
			HideStartEndTimes:       preferences.HideStartEndTimes,
			ReportLockedAt:          preferences.ReportLockedAt,
			ShowTimesheetView:       preferences.ShowTimesheetView,
			RequiredTimeEntryFields: preferences.RequiredTimeEntryFields,
		},
	})
	return writeTenantResponse(ctx, response)
}

type workspacePermissionsRequest struct {
	OnlyAdminsMayCreateProjects bool `json:"only_admins_may_create_projects"`
	OnlyAdminsMayCreateTags     bool `json:"only_admins_may_create_tags"`
	OnlyAdminsSeeTeamDashboard  bool `json:"only_admins_see_team_dashboard"`
	LimitPublicProjectData      bool `json:"limit_public_project_data"`
}

type workspaceSettingsRequest struct {
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
	Preferences *workspacePreferences `json:"preferences"`
}

type workspacePreferences struct {
	HideStartEndTimes       bool     `json:"hide_start_end_times"`
	ReportLockedAt          string   `json:"report_locked_at"`
	ShowTimesheetView       bool     `json:"show_timesheet_view"`
	RequiredTimeEntryFields []string `json:"required_time_entry_fields"`
}

func (handlers *routeHandlers) workspacePermissions(ctx echo.Context) error {
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
	workspace, err := handlers.tenantApp.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}

	return ctx.JSON(http.StatusOK, webapi.WorkspacePermissions{
		OnlyAdminsMayCreateProjects: workspace.Settings.OnlyAdminsMayCreateProjects(),
		OnlyAdminsMayCreateTags:     workspace.Settings.OnlyAdminsMayCreateTags(),
		OnlyAdminsSeeTeamDashboard:  workspace.Settings.OnlyAdminsSeeTeamDashboard(),
		LimitPublicProjectData:      workspace.Settings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins,
	})
}

func (handlers *routeHandlers) updateWorkspacePermissions(ctx echo.Context) error {
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
	var request workspacePermissionsRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	workspace, err := handlers.tenantApp.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}

	input := tenantdomain.WorkspaceSettingsInput{
		DefaultCurrency:             workspace.Settings.DefaultCurrency(),
		DefaultHourlyRate:           workspace.Settings.DefaultHourlyRate(),
		Rounding:                    workspace.Settings.Rounding(),
		RoundingMinutes:             workspace.Settings.RoundingMinutes(),
		DisplayPolicy:               workspace.Settings.DisplayPolicy(),
		OnlyAdminsMayCreateProjects: request.OnlyAdminsMayCreateProjects,
		OnlyAdminsMayCreateTags:     request.OnlyAdminsMayCreateTags,
		OnlyAdminsSeeTeamDashboard:  request.OnlyAdminsSeeTeamDashboard,
		ProjectsBillableByDefault:   workspace.Settings.ProjectsBillableByDefault(),
		ProjectsPrivateByDefault:    workspace.Settings.ProjectsPrivateByDefault(),
		ProjectsEnforceBillable:     workspace.Settings.ProjectsEnforceBillable(),
		ReportsCollapse:             workspace.Settings.ReportsCollapse(),
		PublicProjectAccess:         workspacePublicProjectAccess(request.LimitPublicProjectData),
		ReportLockedAt:              workspace.Settings.ReportLockedAt(),
		ShowTimesheetView:           lo.ToPtr(workspace.Settings.ShowTimesheetView()),
		RequiredTimeEntryFields:     workspace.Settings.RequiredTimeEntryFields(),
	}
	if err := handlers.tenantApp.UpdateWorkspace(ctx.Request().Context(), tenantapplication.UpdateWorkspaceCommand{
		WorkspaceID: tenantdomain.WorkspaceID(workspaceID),
		Name:        workspace.Name,
		Settings:    input,
	}); err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 500, Body: "Internal Server Error"})
	}
	return handlers.workspacePermissions(ctx)
}

func (handlers *routeHandlers) workspaceCapabilities(ctx echo.Context) error {
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
	body, err := handlers.billingApp.WorkspaceCapabilitySnapshot(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}
	return ctx.JSON(http.StatusOK, tenantweb.CapabilitySnapshotToWeb(body))
}

func (handlers *routeHandlers) workspaceQuota(ctx echo.Context) error {
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
	body, headers, err := handlers.billingApp.WorkspaceQuotaSnapshot(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}
	for key, value := range headers {
		ctx.Response().Header().Set(key, value)
	}
	return ctx.JSON(http.StatusOK, tenantweb.QuotaWindowToWeb(body))
}

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

func sessionID(ctx echo.Context) string {
	cookie, err := ctx.Cookie(sessionCookieName)
	if err == nil {
		return cookie.Value
	}

	raw := ctx.Request().Header.Get("Cookie")
	if raw == "" {
		return ""
	}
	parts := strings.Split(raw, ";")
	for _, part := range parts {
		token := strings.TrimSpace(part)
		if strings.HasPrefix(token, sessionCookieName+"=") {
			return strings.TrimPrefix(token, sessionCookieName+"=")
		}
	}
	return ""
}

func parsePathID(ctx echo.Context, key string) (int64, bool) {
	value, err := strconv.ParseInt(ctx.Param(key), 10, 64)
	if err != nil {
		return 0, false
	}
	return value, true
}

func writeIdentityResponse(ctx echo.Context, response identityweb.Response) error {
	if response.SessionID != "" && response.StatusCode < http.StatusBadRequest {
		setSessionCookie(ctx, response.SessionID)
	}
	if response.StatusCode == http.StatusNoContent {
		if response.SessionID == "" {
			clearSessionCookie(ctx)
		}
		return ctx.NoContent(http.StatusNoContent)
	}
	return ctx.JSON(response.StatusCode, response.Body)
}

func (handlers *routeHandlers) authorizeSession(ctx echo.Context) (error, bool) {
	response := handlers.identity.GetSession(ctx.Request().Context(), sessionID(ctx))
	if response.StatusCode == http.StatusOK {
		return nil, true
	}
	return identityHTTPError(response), false
}

func writeTenantResponse(ctx echo.Context, response tenantweb.Response) error {
	if response.StatusCode == http.StatusNoContent {
		return ctx.NoContent(http.StatusNoContent)
	}
	return ctx.JSON(response.StatusCode, response.Body)
}

func setSessionCookie(ctx echo.Context, sessionID string) {
	ctx.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    sessionID,
		HttpOnly: true,
		Path:     "/",
		SameSite: http.SameSiteLaxMode,
		Domain:   "localhost",
	})
}

func identityHTTPError(response identityweb.Response) error {
	return echo.NewHTTPError(response.StatusCode, response.Body)
}

func (handlers *routeHandlers) requireCurrentSessionWorkspace(ctx echo.Context, workspaceID int64) error {
	home, err := handlers.currentSessionHome(ctx)
	if err != nil {
		return err
	}
	if home.workspaceID != workspaceID {
		return echo.NewHTTPError(http.StatusForbidden, "Forbidden").
			SetInternal(errors.New("requested workspace does not match the current session workspace"))
	}
	return nil
}

func (handlers *routeHandlers) currentSessionHome(ctx echo.Context) (sessionHome, error) {
	if cached, ok := ctx.Get(currentSessionHomeContextKey).(*sessionHome); ok && cached != nil {
		return *cached, nil
	}

	user, err := handlers.identityApp.ResolveCurrentUser(ctx.Request().Context(), sessionID(ctx))
	if err != nil {
		switch {
		case errors.Is(err, identityapplication.ErrSessionNotFound),
			errors.Is(err, identitydomain.ErrUserDeactivated),
			errors.Is(err, identitydomain.ErrUserDeleted):
			return sessionHome{}, echo.NewHTTPError(http.StatusForbidden, "Forbidden").SetInternal(err)
		default:
			return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(err)
		}
	}

	organizationID, workspaceID, found, lookupErr := handlers.userHomes.FindByUserID(ctx.Request().Context(), user.ID)
	switch {
	case lookupErr != nil:
		return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").SetInternal(lookupErr)
	case !found:
		return sessionHome{}, echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error").
			SetInternal(errors.New("session home was not found for the current user"))
	default:
		home := &sessionHome{
			organizationID: organizationID,
			workspaceID:    workspaceID,
		}
		ctx.Set(currentSessionHomeContextKey, home)
		return *home, nil
	}
}

func clearSessionCookie(ctx echo.Context) {
	ctx.SetCookie(&http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		HttpOnly: true,
		Path:     "/",
		MaxAge:   -1,
		Expires:  time.Unix(0, 0),
	})
}

type billingBackedSessionShell struct {
	tenant     *tenantapplication.Service
	billing    *billingapplication.Service
	identity   *identityapplication.Service
	membership *membershipapplication.Service
	userHomes  userHomeRepository

	mu sync.Mutex
}

type sessionHome struct {
	organizationID int64
	workspaceID    int64
}

func newBillingBackedSessionShell(
	tenant *tenantapplication.Service,
	billing *billingapplication.Service,
	identity *identityapplication.Service,
	membership *membershipapplication.Service,
	userHomes userHomeRepository,
) *billingBackedSessionShell {
	return &billingBackedSessionShell{
		tenant:     tenant,
		billing:    billing,
		identity:   identity,
		membership: membership,
		userHomes:  userHomes,
	}
}

func (provider *billingBackedSessionShell) SessionShell(
	ctx context.Context,
	user identityapplication.UserSnapshot,
) (identityweb.SessionShellData, error) {
	home, err := provider.ensureHome(ctx, user)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}

	organization, err := provider.tenant.GetOrganization(ctx, tenantdomain.OrganizationID(home.organizationID))
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	workspace, err := provider.tenant.GetWorkspace(ctx, tenantdomain.WorkspaceID(home.workspaceID))
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	capabilities, err := provider.billing.WorkspaceCapabilitySnapshot(ctx, home.workspaceID)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	quota, _, err := provider.billing.WorkspaceQuotaSnapshot(ctx, home.workspaceID)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	organizations, err := provider.tenant.ListOrganizationsByUserID(ctx, user.ID)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}
	workspaces, err := provider.tenant.ListWorkspacesByUserID(ctx, user.ID)
	if err != nil {
		return identityweb.SessionShellData{}, err
	}

	return identityweb.SessionShellData{
		CurrentOrganizationID:    lo.ToPtr(int(home.organizationID)),
		CurrentWorkspaceID:       lo.ToPtr(int(home.workspaceID)),
		OrganizationSubscription: tenantweb.SubscriptionBody(organization.Commercial),
		WorkspaceSubscription:    tenantweb.SubscriptionBody(workspace.Commercial),
		Organizations: lo.Map(organizations, func(organization tenantapplication.OrganizationView, _ int) webapi.OrganizationSettings {
			return tenantweb.OrganizationBody(organization)
		}),
		Workspaces: lo.Map(workspaces, func(workspace tenantapplication.WorkspaceView, _ int) webapi.WorkspaceSettings {
			return tenantweb.WorkspaceBody(workspace)
		}),
		WorkspaceCapabilities: tenantweb.CapabilitySnapshotToWeb(capabilities),
		WorkspaceQuota:        tenantweb.QuotaWindowToWeb(quota),
	}, nil
}

func (provider *billingBackedSessionShell) ensureHome(
	ctx context.Context,
	user identityapplication.UserSnapshot,
) (sessionHome, error) {
	if organizationID, workspaceID, ok, err := provider.userHomes.FindByUserID(ctx, user.ID); err != nil {
		return sessionHome{}, err
	} else if ok {
		home := sessionHome{organizationID: organizationID, workspaceID: workspaceID}
		if err := provider.ensureWorkspaceOwner(ctx, user, home); err != nil {
			return sessionHome{}, err
		}
		if err := provider.ensureDefaultWorkspace(ctx, user, home); err != nil {
			return sessionHome{}, err
		}
		return home, nil
	}

	provider.mu.Lock()
	defer provider.mu.Unlock()
	if organizationID, workspaceID, ok, err := provider.userHomes.FindByUserID(ctx, user.ID); err != nil {
		return sessionHome{}, err
	} else if ok {
		home := sessionHome{organizationID: organizationID, workspaceID: workspaceID}
		if err := provider.ensureWorkspaceOwner(ctx, user, home); err != nil {
			return sessionHome{}, err
		}
		if err := provider.ensureDefaultWorkspace(ctx, user, home); err != nil {
			return sessionHome{}, err
		}
		return home, nil
	}

	created, err := provider.tenant.CreateOrganization(ctx, tenantapplication.CreateOrganizationCommand{
		Name:          defaultOrganizationName(user),
		WorkspaceName: defaultWorkspaceName(user),
	})
	if err != nil {
		return sessionHome{}, err
	}

	home := sessionHome{
		organizationID: int64(created.OrganizationID),
		workspaceID:    int64(created.WorkspaceID),
	}
	if err := provider.userHomes.Save(ctx, user.ID, home.organizationID, home.workspaceID); err != nil {
		return sessionHome{}, err
	}
	if err := provider.ensureWorkspaceOwner(ctx, user, home); err != nil {
		return sessionHome{}, err
	}
	if err := provider.ensureDefaultWorkspace(ctx, user, home); err != nil {
		return sessionHome{}, err
	}
	return home, nil
}

func (provider *billingBackedSessionShell) ensureWorkspaceOwner(
	ctx context.Context,
	user identityapplication.UserSnapshot,
	home sessionHome,
) error {
	_, err := provider.membership.EnsureWorkspaceOwner(ctx, membershipapplication.EnsureWorkspaceOwnerCommand{
		WorkspaceID: home.workspaceID,
		UserID:      user.ID,
	})
	return err
}

func (provider *billingBackedSessionShell) ensureDefaultWorkspace(
	ctx context.Context,
	user identityapplication.UserSnapshot,
	home sessionHome,
) error {
	if user.DefaultWorkspaceID > 0 {
		return nil
	}

	_, err := provider.identity.UpdateProfile(ctx, user.ID, identitydomain.ProfileUpdate{
		DefaultWorkspaceID: lo.ToPtr(home.workspaceID),
	})
	return err
}

func membershipBodies(members []membershipapplication.WorkspaceMemberView) []webapi.WorkspaceMember {
	bodies := make([]webapi.WorkspaceMember, 0, len(members))
	for _, member := range members {
		bodies = append(bodies, membershipBody(member))
	}
	return bodies
}

func membershipBody(member membershipapplication.WorkspaceMemberView) webapi.WorkspaceMember {
	return webapi.WorkspaceMember{
		Email:       member.Email,
		HourlyRate:  float32PointerFromFloat64(member.HourlyRate),
		Id:          int(member.ID),
		LaborCost:   float32PointerFromFloat64(member.LaborCost),
		Name:        member.FullName,
		Role:        string(member.Role),
		Status:      string(member.State),
		WorkspaceId: int(member.WorkspaceID),
	}
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
		return echo.NewHTTPError(http.StatusBadRequest, "Bad Request")
	default:
		return echo.NewHTTPError(http.StatusInternalServerError, "Internal Server Error")
	}
}

func defaultOrganizationName(user identityapplication.UserSnapshot) string {
	if strings.TrimSpace(user.FullName) == "" {
		return "My Organization"
	}
	return strings.TrimSpace(user.FullName) + " Organization"
}

func defaultWorkspaceName(user identityapplication.UserSnapshot) string {
	if strings.TrimSpace(user.FullName) == "" {
		return "My Workspace"
	}
	return strings.TrimSpace(user.FullName) + " Workspace"
}

func workspacePublicProjectAccess(limitPublicProjectData bool) tenantdomain.WorkspacePublicProjectAccess {
	if limitPublicProjectData {
		return tenantdomain.WorkspacePublicProjectAccessAdmins
	}
	return tenantdomain.WorkspacePublicProjectAccessMembers
}
