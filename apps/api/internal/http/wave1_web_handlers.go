package httpapp

import (
	"context"
	"fmt"
	"strings"
	"sync"
)

type Wave1Response struct {
	StatusCode int
	Body       any
	SessionID  string
}

type RegisterRequest struct {
	Email    string `json:"email"`
	FullName string `json:"fullname"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type ProfileRequest struct {
	CurrentPassword    string `json:"current_password"`
	Password           string `json:"password"`
	Email              string `json:"email"`
	FullName           string `json:"fullname"`
	Timezone           string `json:"timezone"`
	BeginningOfWeek    *int   `json:"beginning_of_week"`
	CountryID          *int64 `json:"country_id"`
	DefaultWorkspaceID *int64 `json:"default_workspace_id"`
}

type PreferencesRequest struct {
	DateFormat          *string `json:"date_format"`
	TimeOfDayFormat     *string `json:"timeofday_format"`
	DurationFormat      *string `json:"duration_format"`
	PGTimeZoneName      *string `json:"pg_time_zone_name"`
	BeginningOfWeek     *int    `json:"beginningOfWeek"`
	CollapseTimeEntries *bool   `json:"collapseTimeEntries"`
	LanguageCode        *string `json:"language_code"`
	HideSidebarRight    *bool   `json:"hide_sidebar_right"`
	ReportsCollapse     *bool   `json:"reports_collapse"`
	ManualMode          *bool   `json:"manualMode"`
	ManualEntryMode     *string `json:"manualEntryMode"`
}

type OrganizationSettingsRequest struct {
	Organization struct {
		Name string `json:"name"`
	} `json:"organization"`
}

type WorkspaceSettingsRequest struct {
	Workspace   *workspaceSettingsSnapshot    `json:"workspace"`
	Preferences *workspacePreferencesSnapshot `json:"preferences"`
}

type Wave1WebHandlers struct {
	Tenant *Wave1TenantHandlers
	state  *wave1State
}

type Wave1TenantHandlers struct {
	state *wave1State
}

type wave1State struct {
	mu sync.RWMutex

	nextUserID      int64
	nextSessionID   int64
	nextOrgID       int64
	nextWorkspaceID int64

	users        map[int64]*userRecord
	usersByEmail map[string]int64
	sessions     map[string]int64
	homes        map[int64]*homeRecord
}

type userRecord struct {
	ID                  int64
	Email               string
	Password            string
	FullName            string
	APIToken            string
	Timezone            string
	BeginningOfWeek     int
	CountryID           int64
	DefaultWorkspaceID  int64
	DateFormat          string
	TimeOfDayFormat     string
	DurationFormat      string
	PGTimeZoneName      string
	CollapseTimeEntries bool
	LanguageCode        string
	HideSidebarRight    bool
	ReportsCollapse     bool
	ManualMode          bool
	ManualEntryMode     string
}

type homeRecord struct {
	OrganizationID       int64
	OrganizationName     string
	WorkspaceID          int64
	Settings             workspaceSettingsSnapshot
	WorkspacePreferences workspacePreferencesSnapshot
}

type workspaceSettingsSnapshot struct {
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
}

type workspacePreferencesSnapshot struct {
	HideStartEndTimes bool   `json:"hide_start_end_times"`
	ReportLockedAt    string `json:"report_locked_at"`
}

func NewWave1WebHandlers() *Wave1WebHandlers {
	state := &wave1State{
		nextUserID:      1,
		nextSessionID:   1,
		nextOrgID:       1,
		nextWorkspaceID: 1,
		users:           make(map[int64]*userRecord),
		usersByEmail:    make(map[string]int64),
		sessions:        make(map[string]int64),
		homes:           make(map[int64]*homeRecord),
	}
	return &Wave1WebHandlers{
		Tenant: &Wave1TenantHandlers{state: state},
		state:  state,
	}
}

func (handlers *Wave1WebHandlers) Register(_ context.Context, request RegisterRequest) Wave1Response {
	email := normalizeEmail(request.Email)
	if email == "" || request.Password == "" || !strings.Contains(email, "@") {
		return Wave1Response{StatusCode: 400, Body: "invalid registration payload"}
	}

	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	if _, exists := handlers.state.usersByEmail[email]; exists {
		return Wave1Response{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	userID := handlers.state.nextUserID
	handlers.state.nextUserID++
	apiToken := fmt.Sprintf("api-token-%d", userID)
	fullName := strings.TrimSpace(request.FullName)
	if fullName == "" {
		fullName = email
	}

	user := &userRecord{
		ID:              userID,
		Email:           email,
		Password:        request.Password,
		FullName:        fullName,
		APIToken:        apiToken,
		Timezone:        "UTC",
		BeginningOfWeek: 1,
		DateFormat:      "YYYY-MM-DD",
		TimeOfDayFormat: "h:mm a",
		DurationFormat:  "improved",
		PGTimeZoneName:  "UTC",
		LanguageCode:    "en-US",
		ManualEntryMode: "timer",
	}
	handlers.state.users[userID] = user
	handlers.state.usersByEmail[email] = userID

	home := handlers.ensureHomeLocked(user)
	user.DefaultWorkspaceID = home.WorkspaceID
	sessionID := handlers.newSessionLocked(userID)

	return Wave1Response{
		StatusCode: 201,
		Body:       handlers.sessionBootstrap(user, home),
		SessionID:  sessionID,
	}
}

func (handlers *Wave1WebHandlers) Login(_ context.Context, request LoginRequest) Wave1Response {
	email := normalizeEmail(request.Email)
	if email == "" || request.Password == "" {
		return Wave1Response{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	userID, ok := handlers.state.usersByEmail[email]
	if !ok {
		return Wave1Response{StatusCode: 403, Body: "User does not have access to this resource."}
	}
	user := handlers.state.users[userID]
	if user == nil || user.Password != request.Password {
		return Wave1Response{StatusCode: 403, Body: "User does not have access to this resource."}
	}

	home := handlers.ensureHomeLocked(user)
	if user.DefaultWorkspaceID == 0 {
		user.DefaultWorkspaceID = home.WorkspaceID
	}
	sessionID := handlers.newSessionLocked(user.ID)
	return Wave1Response{
		StatusCode: 200,
		Body:       handlers.sessionBootstrap(user, home),
		SessionID:  sessionID,
	}
}

func (handlers *Wave1WebHandlers) Logout(_ context.Context, sessionID string) Wave1Response {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	if _, ok := handlers.state.sessions[sessionID]; !ok {
		return Wave1Response{StatusCode: 401, Body: "Unauthorized"}
	}
	delete(handlers.state.sessions, sessionID)
	return Wave1Response{StatusCode: 204}
}

func (handlers *Wave1WebHandlers) GetSession(_ context.Context, sessionID string) Wave1Response {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, home, ok := handlers.userAndHomeBySessionLocked(sessionID)
	if !ok {
		return Wave1Response{StatusCode: 401, Body: "Unauthorized"}
	}
	return Wave1Response{
		StatusCode: 200,
		Body:       handlers.sessionBootstrap(user, home),
	}
}

func (handlers *Wave1WebHandlers) GetProfile(_ context.Context, sessionID string) Wave1Response {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return Wave1Response{StatusCode: 401, Body: "Unauthorized"}
	}
	return Wave1Response{
		StatusCode: 200,
		Body:       handlers.profileBody(user),
	}
}

func (handlers *Wave1WebHandlers) UpdateProfile(_ context.Context, sessionID string, request ProfileRequest) Wave1Response {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return Wave1Response{StatusCode: 401, Body: "Unauthorized"}
	}
	if request.Email != "" {
		nextEmail := normalizeEmail(request.Email)
		if nextEmail == "" || !strings.Contains(nextEmail, "@") {
			return Wave1Response{StatusCode: 400, Body: "invalid email"}
		}
		if existingUserID, exists := handlers.state.usersByEmail[nextEmail]; exists && existingUserID != user.ID {
			return Wave1Response{StatusCode: 403, Body: "User does not have access to this resource."}
		}
		delete(handlers.state.usersByEmail, user.Email)
		user.Email = nextEmail
		handlers.state.usersByEmail[nextEmail] = user.ID
	}
	if request.Password != "" {
		user.Password = request.Password
	}
	if request.FullName != "" {
		user.FullName = request.FullName
	}
	if request.Timezone != "" {
		user.Timezone = request.Timezone
		user.PGTimeZoneName = request.Timezone
	}
	if request.BeginningOfWeek != nil {
		user.BeginningOfWeek = *request.BeginningOfWeek
	}
	if request.CountryID != nil {
		user.CountryID = *request.CountryID
	}
	if request.DefaultWorkspaceID != nil {
		user.DefaultWorkspaceID = *request.DefaultWorkspaceID
	}
	return Wave1Response{
		StatusCode: 200,
		Body:       handlers.profileBody(user),
	}
}

func (handlers *Wave1WebHandlers) GetPreferences(_ context.Context, sessionID string) Wave1Response {
	handlers.state.mu.RLock()
	defer handlers.state.mu.RUnlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return Wave1Response{StatusCode: 401, Body: "Unauthorized"}
	}
	return Wave1Response{
		StatusCode: 200,
		Body:       handlers.preferencesBody(user),
	}
}

func (handlers *Wave1WebHandlers) UpdatePreferences(_ context.Context, sessionID string, request PreferencesRequest) Wave1Response {
	handlers.state.mu.Lock()
	defer handlers.state.mu.Unlock()

	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return Wave1Response{StatusCode: 401, Body: "Unauthorized"}
	}
	if request.DateFormat != nil {
		user.DateFormat = *request.DateFormat
	}
	if request.TimeOfDayFormat != nil {
		user.TimeOfDayFormat = *request.TimeOfDayFormat
	}
	if request.DurationFormat != nil {
		user.DurationFormat = *request.DurationFormat
	}
	if request.PGTimeZoneName != nil {
		user.PGTimeZoneName = *request.PGTimeZoneName
		user.Timezone = *request.PGTimeZoneName
	}
	if request.BeginningOfWeek != nil {
		user.BeginningOfWeek = *request.BeginningOfWeek
	}
	if request.CollapseTimeEntries != nil {
		user.CollapseTimeEntries = *request.CollapseTimeEntries
	}
	if request.LanguageCode != nil {
		user.LanguageCode = *request.LanguageCode
	}
	if request.HideSidebarRight != nil {
		user.HideSidebarRight = *request.HideSidebarRight
	}
	if request.ReportsCollapse != nil {
		user.ReportsCollapse = *request.ReportsCollapse
	}
	if request.ManualMode != nil {
		user.ManualMode = *request.ManualMode
	}
	if request.ManualEntryMode != nil {
		user.ManualEntryMode = *request.ManualEntryMode
	}
	return Wave1Response{
		StatusCode: 200,
		Body:       handlers.preferencesBody(user),
	}
}

func (handlers *Wave1WebHandlers) ensureHomeLocked(user *userRecord) homeRecord {
	home := handlers.state.homes[user.ID]
	if home != nil {
		return *home
	}

	organizationID := handlers.state.nextOrgID
	handlers.state.nextOrgID++
	workspaceID := handlers.state.nextWorkspaceID
	handlers.state.nextWorkspaceID++

	baseName := strings.TrimSpace(user.FullName)
	if baseName == "" {
		baseName = "Personal"
	}
	home = &homeRecord{
		OrganizationID:   organizationID,
		OrganizationName: baseName + " Org",
		WorkspaceID:      workspaceID,
		Settings: workspaceSettingsSnapshot{
			Name:                      baseName + " Workspace",
			DefaultCurrency:           "USD",
			ProjectsBillableByDefault: true,
			Rounding:                  0,
			RoundingMinutes:           0,
		},
		WorkspacePreferences: workspacePreferencesSnapshot{
			HideStartEndTimes: false,
			ReportLockedAt:    "",
		},
	}
	handlers.state.homes[user.ID] = home
	return *home
}

func (handlers *Wave1WebHandlers) newSessionLocked(userID int64) string {
	sessionID := fmt.Sprintf("session-%d", handlers.state.nextSessionID)
	handlers.state.nextSessionID++
	handlers.state.sessions[sessionID] = userID
	return sessionID
}

func (handlers *Wave1WebHandlers) userBySessionLocked(sessionID string) (*userRecord, bool) {
	userID, ok := handlers.state.sessions[sessionID]
	if !ok {
		return nil, false
	}
	user := handlers.state.users[userID]
	return user, user != nil
}

func (handlers *Wave1WebHandlers) userAndHomeBySessionLocked(sessionID string) (*userRecord, homeRecord, bool) {
	user, ok := handlers.userBySessionLocked(sessionID)
	if !ok {
		return nil, homeRecord{}, false
	}
	home := handlers.ensureHomeLocked(user)
	return user, home, true
}

func (handlers *Wave1WebHandlers) sessionBootstrap(user *userRecord, home homeRecord) map[string]any {
	subscription := map[string]any{
		"plan_name": "Free",
		"state":     "free",
	}

	return map[string]any{
		"current_organization_id":   home.OrganizationID,
		"current_workspace_id":      home.WorkspaceID,
		"organization_subscription": subscription,
		"workspace_subscription":    subscription,
		"user":                      handlers.profileBody(user),
		"organizations": []any{
			handlers.organizationBody(home),
		},
		"workspaces": []any{
			handlers.workspaceBody(home),
		},
		"workspace_capabilities": handlers.capabilityBody(home),
		"workspace_quota":        handlers.quotaBody(home),
	}
}

func (handlers *Wave1WebHandlers) profileBody(user *userRecord) map[string]any {
	return map[string]any{
		"id":                   user.ID,
		"email":                user.Email,
		"fullname":             user.FullName,
		"api_token":            user.APIToken,
		"timezone":             user.Timezone,
		"default_workspace_id": user.DefaultWorkspaceID,
		"beginning_of_week":    user.BeginningOfWeek,
		"country_id":           user.CountryID,
		"has_password":         true,
		"2fa_enabled":          false,
	}
}

func (handlers *Wave1WebHandlers) preferencesBody(user *userRecord) map[string]any {
	return map[string]any{
		"date_format":         user.DateFormat,
		"timeofday_format":    user.TimeOfDayFormat,
		"duration_format":     user.DurationFormat,
		"pg_time_zone_name":   user.PGTimeZoneName,
		"beginningOfWeek":     user.BeginningOfWeek,
		"collapseTimeEntries": user.CollapseTimeEntries,
		"language_code":       user.LanguageCode,
		"hide_sidebar_right":  user.HideSidebarRight,
		"reports_collapse":    user.ReportsCollapse,
		"manualMode":          user.ManualMode,
		"manualEntryMode":     user.ManualEntryMode,
	}
}

func (handlers *Wave1WebHandlers) capabilityBody(home homeRecord) map[string]any {
	return map[string]any{
		"context": map[string]any{
			"organization_id": home.OrganizationID,
			"workspace_id":    home.WorkspaceID,
			"scope":           "workspace",
		},
		"capabilities": []any{
			map[string]any{
				"key":     "reports.summary",
				"enabled": true,
				"source":  "billing",
			},
		},
	}
}

func (handlers *Wave1WebHandlers) quotaBody(home homeRecord) map[string]any {
	return map[string]any{
		"organization_id": home.OrganizationID,
		"remaining":       20,
		"resets_in_secs":  600,
		"total":           100,
	}
}

func (handlers *Wave1WebHandlers) organizationBody(home homeRecord) map[string]any {
	return map[string]any{
		"id":                         home.OrganizationID,
		"name":                       home.OrganizationName,
		"admin":                      true,
		"max_workspaces":             1,
		"pricing_plan_name":          "Free",
		"is_multi_workspace_enabled": false,
		"user_count":                 1,
	}
}

func (handlers *Wave1WebHandlers) workspaceBody(home homeRecord) map[string]any {
	return map[string]any{
		"id":                              home.WorkspaceID,
		"organization_id":                 home.OrganizationID,
		"name":                            home.Settings.Name,
		"default_currency":                home.Settings.DefaultCurrency,
		"default_hourly_rate":             home.Settings.DefaultHourlyRate,
		"rounding":                        home.Settings.Rounding,
		"rounding_minutes":                home.Settings.RoundingMinutes,
		"reports_collapse":                home.Settings.ReportsCollapse,
		"only_admins_may_create_projects": home.Settings.OnlyAdminsMayCreateProjects,
		"only_admins_may_create_tags":     home.Settings.OnlyAdminsMayCreateTags,
		"only_admins_see_team_dashboard":  home.Settings.OnlyAdminsSeeTeamDashboard,
		"projects_billable_by_default":    home.Settings.ProjectsBillableByDefault,
		"projects_private_by_default":     home.Settings.ProjectsPrivateByDefault,
		"projects_enforce_billable":       home.Settings.ProjectsEnforceBillable,
		"limit_public_project_data":       home.Settings.LimitPublicProjectData,
		"admin":                           true,
		"premium":                         false,
		"role":                            "admin",
	}
}

func normalizeEmail(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}
// ListWorkspaceMembers returns a simple member list envelope for the given workspace.
func (h *Wave1TenantHandlers) ListWorkspaceMembers(ctx context.Context, sessionID string, workspaceID int64) Wave1Response {
	_ = ctx
	_ = sessionID

	members := []map[string]any{
		{
			"id":           int64(1),
			"workspace_id": workspaceID,
			"email":        "member@example.com",
			"name":         "Sample Member",
			"role":         "admin",
		},
	}

	return Wave1Response{
		Body: map[string]any{
			"members": members,
		},
	}
}

// ListProjects returns a simple projects envelope based on the requested workspace.
func (h *Wave1TenantHandlers) ListProjects(ctx context.Context, sessionID string, request ListProjectsRequest) Wave1Response {
	_ = ctx
	_ = sessionID

	workspaceID := int64(1)
	if request.WorkspaceID != nil && *request.WorkspaceID != 0 {
		workspaceID = *request.WorkspaceID
	}

	projects := []map[string]any{
		{
			"id":           int64(1001),
			"name":         "Sample Project",
			"workspace_id": workspaceID,
			"active":       true,
		},
	}

	return Wave1Response{
		Body: map[string]any{
			"projects": projects,
		},
	}
}
