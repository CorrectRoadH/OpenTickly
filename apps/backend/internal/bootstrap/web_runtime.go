package bootstrap

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	billingapplication "opentoggl/backend/apps/backend/internal/billing/application"
	billingdomain "opentoggl/backend/apps/backend/internal/billing/domain"
	billingpostgres "opentoggl/backend/apps/backend/internal/billing/infra/postgres"
	httpapp "opentoggl/backend/apps/backend/internal/http"
	identityapplication "opentoggl/backend/apps/backend/internal/identity/application"
	identitypostgres "opentoggl/backend/apps/backend/internal/identity/infra/postgres"
	identityweb "opentoggl/backend/apps/backend/internal/identity/transport/http/web"
	tenantapplication "opentoggl/backend/apps/backend/internal/tenant/application"
	tenantdomain "opentoggl/backend/apps/backend/internal/tenant/domain"
	tenantpostgres "opentoggl/backend/apps/backend/internal/tenant/infra/postgres"
	tenantweb "opentoggl/backend/apps/backend/internal/tenant/transport/http/web"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

const sessionCookieName = "opentoggl_session"

func newWebRoutes(pool *pgxpool.Pool) (httpapp.RouteRegistrar, error) {
	runtime, err := newWebRuntime(pool)
	if err != nil {
		return nil, err
	}

	return httpapp.NewGeneratedWebRouteRegistrar(newBootstrapWebOpenAPIServer(runtime))
}

type webRuntime struct {
	identity   *identityweb.Handler
	tenant     *tenantweb.Handler
	tenantApp  *tenantapplication.Service
	billingApp *billingapplication.Service

	mu                          sync.RWMutex
	onlyAdminsMayCreateTagsByWS map[int64]bool
	workspacePreferencesByWS    map[int64]workspacePreferences
}

func newWebRuntime(pool *pgxpool.Pool) (*webRuntime, error) {
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

	identityService := identityapplication.NewService(identityapplication.Config{
		Users:              identitypostgres.NewUserRepository(pool),
		Sessions:           identitypostgres.NewSessionRepository(pool),
		IDs:                identitypostgres.NewSequence(pool),
		KnownAlphaFeatures: []string{"calendar-redesign"},
	})
	shellProvider := newBillingBackedSessionShell(tenantService, billingService, newPostgresUserHomeRepository(pool))
	identityHandler := identityweb.NewHandlerWithShell(identityService, shellProvider)

	return &webRuntime{
		identity:                    identityHandler,
		tenant:                      tenantHandler,
		tenantApp:                   tenantService,
		billingApp:                  billingService,
		onlyAdminsMayCreateTagsByWS: make(map[int64]bool),
		workspacePreferencesByWS:    make(map[int64]workspacePreferences),
	}, nil
}

func (runtime *webRuntime) register(ctx echo.Context) error {
	var request identityweb.RegisterRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	return writeIdentityResponse(ctx, runtime.identity.Register(ctx.Request().Context(), request))
}

func (runtime *webRuntime) login(ctx echo.Context) error {
	var request identityweb.LoginRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	return writeIdentityResponse(ctx, runtime.identity.Login(ctx.Request().Context(), request))
}

func (runtime *webRuntime) logout(ctx echo.Context) error {
	response := runtime.identity.Logout(ctx.Request().Context(), sessionID(ctx))
	return writeIdentityResponse(ctx, response)
}

func (runtime *webRuntime) session(ctx echo.Context) error {
	response := runtime.identity.GetSession(ctx.Request().Context(), sessionID(ctx))
	return writeIdentityResponse(ctx, response)
}

func (runtime *webRuntime) profile(ctx echo.Context) error {
	response := runtime.identity.GetProfile(ctx.Request().Context(), sessionID(ctx))
	return writeIdentityResponse(ctx, response)
}

func (runtime *webRuntime) updateProfile(ctx echo.Context) error {
	var request identityweb.ProfileRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	response := runtime.identity.UpdateProfile(ctx.Request().Context(), sessionID(ctx), request)
	return writeIdentityResponse(ctx, response)
}

func (runtime *webRuntime) resetAPIToken(ctx echo.Context) error {
	response := runtime.identity.ResetAPIToken(ctx.Request().Context(), sessionID(ctx))
	return writeIdentityResponse(ctx, response)
}

func (runtime *webRuntime) preferences(ctx echo.Context) error {
	response := runtime.identity.GetPreferences(ctx.Request().Context(), sessionID(ctx), "web")
	return writeIdentityResponse(ctx, response)
}

func (runtime *webRuntime) updatePreferences(ctx echo.Context) error {
	var request identityweb.PreferencesRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	response := runtime.identity.UpdatePreferences(ctx.Request().Context(), sessionID(ctx), "web", request)
	return writeIdentityResponse(ctx, response)
}

func (runtime *webRuntime) organizationSettings(ctx echo.Context) error {
	if response, ok := runtime.authorizeSession(ctx); !ok {
		return response
	}
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	response := runtime.tenant.GetOrganizationSettings(ctx.Request().Context(), organizationID)
	return writeTenantResponse(ctx, response)
}

func (runtime *webRuntime) updateOrganizationSettings(ctx echo.Context) error {
	if response, ok := runtime.authorizeSession(ctx); !ok {
		return response
	}
	organizationID, ok := parsePathID(ctx, "organization_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var request tenantweb.OrganizationSettingsRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	response := runtime.tenant.UpdateOrganizationSettings(ctx.Request().Context(), organizationID, request)
	return writeTenantResponse(ctx, response)
}

func (runtime *webRuntime) workspaceSettings(ctx echo.Context) error {
	if response, ok := runtime.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	response := runtime.tenant.GetWorkspaceSettings(ctx.Request().Context(), workspaceID)
	response.Body = runtime.decorateWorkspaceSettingsEnvelope(response.Body, workspaceID)
	return writeTenantResponse(ctx, response)
}

func (runtime *webRuntime) updateWorkspaceSettings(ctx echo.Context) error {
	if response, ok := runtime.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var request workspaceSettingsRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	runtime.setOnlyAdminsMayCreateTags(workspaceID, request.Workspace.OnlyAdminsMayCreateTags)
	if request.Preferences != nil {
		runtime.setWorkspacePreferences(workspaceID, workspacePreferences{
			HideStartEndTimes: request.Preferences.HideStartEndTimes,
			ReportLockedAt:    request.Preferences.ReportLockedAt,
		})
	}
	response := runtime.tenant.UpdateWorkspaceSettings(ctx.Request().Context(), workspaceID, tenantweb.WorkspaceSettingsRequest{
		Workspace: struct {
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
		}{
			Name:                        request.Workspace.Name,
			DefaultCurrency:             request.Workspace.DefaultCurrency,
			DefaultHourlyRate:           request.Workspace.DefaultHourlyRate,
			Rounding:                    request.Workspace.Rounding,
			RoundingMinutes:             request.Workspace.RoundingMinutes,
			ReportsCollapse:             request.Workspace.ReportsCollapse,
			OnlyAdminsMayCreateProjects: request.Workspace.OnlyAdminsMayCreateProjects,
			OnlyAdminsSeeTeamDashboard:  request.Workspace.OnlyAdminsSeeTeamDashboard,
			ProjectsBillableByDefault:   request.Workspace.ProjectsBillableByDefault,
			LimitPublicProjectData:      request.Workspace.LimitPublicProjectData,
		},
	})
	response.Body = runtime.decorateWorkspaceSettingsEnvelope(response.Body, workspaceID)
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
	HideStartEndTimes bool   `json:"hide_start_end_times"`
	ReportLockedAt    string `json:"report_locked_at"`
}

func (runtime *webRuntime) workspacePermissions(ctx echo.Context) error {
	if response, ok := runtime.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	workspace, err := runtime.tenantApp.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"only_admins_may_create_projects": workspace.Settings.OnlyAdminsMayCreateProjects(),
		"only_admins_may_create_tags":     runtime.onlyAdminsMayCreateTags(workspaceID),
		"only_admins_see_team_dashboard":  workspace.Settings.OnlyAdminsSeeTeamDashboard(),
		"limit_public_project_data":       workspace.Settings.PublicProjectAccess() == tenantdomain.WorkspacePublicProjectAccessAdmins,
	})
}

func (runtime *webRuntime) updateWorkspacePermissions(ctx echo.Context) error {
	if response, ok := runtime.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	var request workspacePermissionsRequest
	if err := ctx.Bind(&request); err != nil {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	runtime.setOnlyAdminsMayCreateTags(workspaceID, request.OnlyAdminsMayCreateTags)

	workspace, err := runtime.tenantApp.GetWorkspace(ctx.Request().Context(), tenantdomain.WorkspaceID(workspaceID))
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
		OnlyAdminsSeeTeamDashboard:  request.OnlyAdminsSeeTeamDashboard,
		ProjectsBillableByDefault:   workspace.Settings.ProjectsBillableByDefault(),
		ReportsCollapse:             workspace.Settings.ReportsCollapse(),
		PublicProjectAccess:         workspacePublicProjectAccess(request.LimitPublicProjectData),
	}
	if err := runtime.tenantApp.UpdateWorkspace(ctx.Request().Context(), tenantapplication.UpdateWorkspaceCommand{
		WorkspaceID: tenantdomain.WorkspaceID(workspaceID),
		Name:        workspace.Name,
		Settings:    input,
	}); err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 500, Body: "Internal Server Error"})
	}
	return runtime.workspacePermissions(ctx)
}

func (runtime *webRuntime) workspaceCapabilities(ctx echo.Context) error {
	if response, ok := runtime.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	body, err := runtime.billingApp.WorkspaceCapabilitySnapshot(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}
	return ctx.JSON(http.StatusOK, body)
}

func (runtime *webRuntime) workspaceQuota(ctx echo.Context) error {
	if response, ok := runtime.authorizeSession(ctx); !ok {
		return response
	}
	workspaceID, ok := parsePathID(ctx, "workspace_id")
	if !ok {
		return ctx.JSON(http.StatusBadRequest, "Bad Request")
	}
	body, headers, err := runtime.billingApp.WorkspaceQuotaSnapshot(ctx.Request().Context(), workspaceID)
	if err != nil {
		return writeTenantResponse(ctx, tenantweb.Response{StatusCode: 404, Body: "Not Found"})
	}
	for key, value := range headers {
		ctx.Response().Header().Set(key, value)
	}
	return ctx.JSON(http.StatusOK, body)
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

func (runtime *webRuntime) authorizeSession(ctx echo.Context) (error, bool) {
	response := runtime.identity.GetSession(ctx.Request().Context(), sessionID(ctx))
	if response.StatusCode == http.StatusOK {
		return nil, true
	}
	return writeIdentityResponse(ctx, response), false
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
	})
}

func (runtime *webRuntime) onlyAdminsMayCreateTags(workspaceID int64) bool {
	runtime.mu.RLock()
	defer runtime.mu.RUnlock()
	return runtime.onlyAdminsMayCreateTagsByWS[workspaceID]
}

func (runtime *webRuntime) setOnlyAdminsMayCreateTags(workspaceID int64, value bool) {
	runtime.mu.Lock()
	defer runtime.mu.Unlock()
	runtime.onlyAdminsMayCreateTagsByWS[workspaceID] = value
}

func (runtime *webRuntime) workspacePreferences(workspaceID int64) workspacePreferences {
	runtime.mu.RLock()
	defer runtime.mu.RUnlock()
	return runtime.workspacePreferencesByWS[workspaceID]
}

func (runtime *webRuntime) setWorkspacePreferences(workspaceID int64, value workspacePreferences) {
	runtime.mu.Lock()
	defer runtime.mu.Unlock()
	runtime.workspacePreferencesByWS[workspaceID] = value
}

func (runtime *webRuntime) decorateWorkspaceSettingsEnvelope(body any, workspaceID int64) any {
	envelope, ok := body.(map[string]any)
	if !ok {
		return body
	}
	workspace, ok := envelope["workspace"].(map[string]any)
	if !ok {
		return body
	}
	workspace["only_admins_may_create_tags"] = runtime.onlyAdminsMayCreateTags(workspaceID)
	envelope["preferences"] = runtime.workspacePreferences(workspaceID)
	return envelope
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
	tenant    *tenantapplication.Service
	billing   *billingapplication.Service
	userHomes userHomeRepository

	mu sync.Mutex
}

type sessionHome struct {
	organizationID int64
	workspaceID    int64
}

func newBillingBackedSessionShell(
	tenant *tenantapplication.Service,
	billing *billingapplication.Service,
	userHomes userHomeRepository,
) *billingBackedSessionShell {
	return &billingBackedSessionShell{
		tenant:    tenant,
		billing:   billing,
		userHomes: userHomes,
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

	return identityweb.SessionShellData{
		CurrentOrganizationID:    int64Ptr(home.organizationID),
		CurrentWorkspaceID:       int64Ptr(home.workspaceID),
		OrganizationSubscription: tenantweb.SubscriptionBody(organization.Commercial),
		WorkspaceSubscription:    tenantweb.SubscriptionBody(workspace.Commercial),
		Organizations:            []any{tenantweb.OrganizationBody(organization)},
		Workspaces:               []any{tenantweb.WorkspaceBody(workspace)},
		WorkspaceCapabilities:    capabilities,
		WorkspaceQuota:           quota,
	}, nil
}

func (provider *billingBackedSessionShell) ensureHome(
	ctx context.Context,
	user identityapplication.UserSnapshot,
) (sessionHome, error) {
	if home, ok, err := provider.userHomes.FindByUserID(ctx, user.ID); err != nil {
		return sessionHome{}, err
	} else if ok {
		return home, nil
	}

	provider.mu.Lock()
	defer provider.mu.Unlock()
	if existing, ok, err := provider.userHomes.FindByUserID(ctx, user.ID); err != nil {
		return sessionHome{}, err
	} else if ok {
		return existing, nil
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
	if err := provider.userHomes.Save(ctx, user.ID, home); err != nil {
		return sessionHome{}, err
	}
	return home, nil
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

func int64Ptr(value int64) *int64 {
	return &value
}
